import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

import { CronExpressionParser } from 'cron-parser';

import { DATA_DIR, IPC_POLL_INTERVAL, TIMEZONE } from '../core/config.js';
import { AvailableGroup } from './agent-spawn.js';
import {
  deleteJob,
  getJobById,
  listDeadLetterRuns,
  listJobRuns,
  upsertJob,
  updateJob,
} from '../storage/db.js';
import { isValidGroupFolder } from '../platform/group-folder.js';
import { logger } from '../core/logger.js';
import {
  processMemoryRequest,
  writeMemoryResponse,
} from '../memory/memory-ipc.js';
import {
  MEMORY_IPC_ACTIONS,
  MemoryIpcAction,
} from '../memory/memory-ipc-contract.js';
import { RegisteredGroup } from '../core/types.js';

export interface IpcDeps {
  sendMessage: (jid: string, text: string) => Promise<void>;
  registeredGroups: () => Record<string, RegisteredGroup>;
  registerGroup: (jid: string, group: RegisteredGroup) => void;
  syncGroups: (force: boolean) => Promise<void>;
  getAvailableGroups: () => AvailableGroup[];
  writeGroupsSnapshot: (
    groupFolder: string,
    isMain: boolean,
    availableGroups: AvailableGroup[],
    registeredJids: Set<string>,
  ) => void;
  onSchedulerChanged: () => void;
}

let ipcWatcherRunning = false;

function jobBelongsToSourceGroup(
  job: { group_scope: string; linked_sessions: string[] },
  sourceGroup: string,
  registeredGroups: Record<string, RegisteredGroup>,
): boolean {
  if (job.group_scope !== sourceGroup) return false;
  return job.linked_sessions.every((jid) => {
    const group = registeredGroups[jid];
    return !!group && group.folder === sourceGroup;
  });
}

function generateJobId(params: {
  name: string;
  prompt: string;
  scheduleType: string;
  scheduleValue: string;
  groupScope: string;
}): string {
  const base = JSON.stringify({
    name: params.name,
    prompt: params.prompt,
    scheduleType: params.scheduleType,
    scheduleValue: params.scheduleValue,
    groupScope: params.groupScope,
  });
  const hash = createHash('sha256').update(base).digest('hex').slice(0, 12);
  const slug = params.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `job-${slug || 'scheduled'}-${hash}`;
}

export function startIpcWatcher(deps: IpcDeps): void {
  if (ipcWatcherRunning) {
    logger.debug('IPC watcher already running, skipping duplicate start');
    return;
  }
  ipcWatcherRunning = true;

  const ipcBaseDir = path.join(DATA_DIR, 'ipc');
  fs.mkdirSync(ipcBaseDir, { recursive: true });

  const processIpcFiles = async () => {
    // Scan all group IPC directories (identity determined by directory)
    let groupFolders: string[];
    try {
      groupFolders = fs.readdirSync(ipcBaseDir).filter((f) => {
        const stat = fs.statSync(path.join(ipcBaseDir, f));
        return stat.isDirectory() && f !== 'errors';
      });
    } catch (err) {
      logger.error({ err }, 'Error reading IPC base directory');
      setTimeout(processIpcFiles, IPC_POLL_INTERVAL);
      return;
    }

    const registeredGroups = deps.registeredGroups();

    // Build folder→isMain lookup from registered groups
    const folderIsMain = new Map<string, boolean>();
    for (const group of Object.values(registeredGroups)) {
      if (group.isMain) folderIsMain.set(group.folder, true);
    }

    for (const sourceGroup of groupFolders) {
      const isMain = folderIsMain.get(sourceGroup) === true;
      const messagesDir = path.join(ipcBaseDir, sourceGroup, 'messages');
      const tasksDir = path.join(ipcBaseDir, sourceGroup, 'tasks');
      const memoryRequestsDir = path.join(
        ipcBaseDir,
        sourceGroup,
        'memory-requests',
      );

      // Process messages from this group's IPC directory
      try {
        if (fs.existsSync(messagesDir)) {
          const messageFiles = fs
            .readdirSync(messagesDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of messageFiles) {
            const filePath = path.join(messagesDir, file);
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              if (data.type === 'message' && data.chatJid && data.text) {
                // Authorization: verify this group can send to this chatJid
                const targetGroup = registeredGroups[data.chatJid];
                if (
                  isMain ||
                  (targetGroup && targetGroup.folder === sourceGroup)
                ) {
                  await deps.sendMessage(data.chatJid, data.text);
                  logger.info(
                    { chatJid: data.chatJid, sourceGroup },
                    'IPC message sent',
                  );
                } else {
                  logger.warn(
                    { chatJid: data.chatJid, sourceGroup },
                    'Unauthorized IPC message attempt blocked',
                  );
                }
              }
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC message',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error(
          { err, sourceGroup },
          'Error reading IPC messages directory',
        );
      }

      // Process tasks from this group's IPC directory
      try {
        if (fs.existsSync(tasksDir)) {
          const taskFiles = fs
            .readdirSync(tasksDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of taskFiles) {
            const filePath = path.join(tasksDir, file);
            try {
              const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
              // Pass source group identity to processTaskIpc for authorization
              await processTaskIpc(data, sourceGroup, isMain, deps);
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing IPC task',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error({ err, sourceGroup }, 'Error reading IPC tasks directory');
      }

      // Process memory request/response IPC for this group
      try {
        if (fs.existsSync(memoryRequestsDir)) {
          const memoryFiles = fs
            .readdirSync(memoryRequestsDir)
            .filter((f) => f.endsWith('.json'));
          for (const file of memoryFiles) {
            const filePath = path.join(memoryRequestsDir, file);
            try {
              const request = JSON.parse(
                fs.readFileSync(filePath, 'utf-8'),
              ) as {
                requestId: string;
                action: string;
                payload: Record<string, unknown>;
              };
              if (
                !MEMORY_IPC_ACTIONS.includes(request.action as MemoryIpcAction)
              ) {
                throw new Error(
                  `Unsupported memory IPC action: ${request.action}`,
                );
              }

              const response = await processMemoryRequest(
                {
                  requestId: request.requestId,
                  action: request.action as MemoryIpcAction,
                  payload: request.payload || {},
                },
                sourceGroup,
                isMain,
              );
              writeMemoryResponse(sourceGroup, request.requestId, response);
              fs.unlinkSync(filePath);
            } catch (err) {
              logger.error(
                { file, sourceGroup, err },
                'Error processing memory IPC request',
              );
              const errorDir = path.join(ipcBaseDir, 'errors');
              fs.mkdirSync(errorDir, { recursive: true });
              fs.renameSync(
                filePath,
                path.join(errorDir, `${sourceGroup}-${file}`),
              );
            }
          }
        }
      } catch (err) {
        logger.error(
          { err, sourceGroup },
          'Error reading memory IPC requests directory',
        );
      }
    }

    setTimeout(processIpcFiles, IPC_POLL_INTERVAL);
  };

  processIpcFiles();
  logger.info('IPC watcher started (per-group namespaces)');
}

export async function processTaskIpc(
  data: {
    type: string;
    taskId?: string;
    prompt?: string;
    schedule_type?: string;
    schedule_value?: string;
    context_mode?: string;
    script?: string;
    jobId?: string;
    scheduleType?: string;
    scheduleValue?: string;
    linkedSessions?: string[];
    groupScope?: string;
    createdBy?: 'agent' | 'human';
    timeoutMs?: number;
    maxRetries?: number;
    retryBackoffMs?: number;
    maxConsecutiveFailures?: number;
    statuses?: string[];
    limit?: number;
    groupFolder?: string;
    chatJid?: string;
    targetJid?: string;
    // For register_group
    jid?: string;
    name?: string;
    folder?: string;
    trigger?: string;
    requiresTrigger?: boolean;
    agentConfig?: RegisteredGroup['agentConfig'];
  },
  sourceGroup: string, // Verified identity from IPC directory
  isMain: boolean, // Verified from directory path
  deps: IpcDeps,
): Promise<void> {
  const registeredGroups = deps.registeredGroups();
  const sourceGroupJids = Object.entries(registeredGroups)
    .filter(([, group]) => group.folder === sourceGroup)
    .map(([jid]) => jid);

  switch (data.type) {
    case 'scheduler_upsert_job': {
      const scheduleType = (data.schedule_type || data.scheduleType) as
        | 'cron'
        | 'interval'
        | 'once'
        | 'manual';
      const scheduleValue = (data.schedule_value || data.scheduleValue || '')
        .toString()
        .trim();
      const name = (data.name || '').trim();
      const prompt = (data.prompt || '').trim();
      if (!name || !prompt || !scheduleType) break;

      const groupScope = (data.groupScope || sourceGroup).trim();
      if (!isMain && groupScope !== sourceGroup) {
        logger.warn(
          { sourceGroup, groupScope },
          'Unauthorized scheduler_upsert_job attempt blocked',
        );
        break;
      }

      let linkedSessions = Array.isArray(data.linkedSessions)
        ? data.linkedSessions
            .map((item) => String(item))
            .filter((item) => item.length > 0)
        : sourceGroupJids;
      if (linkedSessions.length === 0) linkedSessions = sourceGroupJids;
      if (linkedSessions.length === 0) {
        logger.warn(
          { sourceGroup, name },
          'scheduler_upsert_job requires at least one linked session',
        );
        break;
      }

      if (!isMain) {
        const unauthorized = linkedSessions.some((jid) => {
          const group = registeredGroups[jid];
          return !group || group.folder !== sourceGroup;
        });
        if (unauthorized) {
          logger.warn(
            { sourceGroup, linkedSessions },
            'Unauthorized linked sessions in scheduler_upsert_job',
          );
          break;
        }
      }

      let nextRun: string | null = null;
      if (scheduleType === 'cron') {
        try {
          const interval = CronExpressionParser.parse(scheduleValue, {
            tz: TIMEZONE,
          });
          nextRun = interval.next().toISOString();
        } catch {
          logger.warn({ scheduleValue }, 'Invalid cron expression for job');
          break;
        }
      } else if (scheduleType === 'interval') {
        const ms = parseInt(scheduleValue, 10);
        if (isNaN(ms) || ms <= 0) {
          logger.warn({ scheduleValue }, 'Invalid interval for job');
          break;
        }
        nextRun = new Date(Date.now() + ms).toISOString();
      } else if (scheduleType === 'once') {
        const date = new Date(scheduleValue);
        if (isNaN(date.getTime())) {
          logger.warn({ scheduleValue }, 'Invalid once timestamp for job');
          break;
        }
        nextRun = date.toISOString();
      } else if (scheduleType === 'manual') {
        nextRun = null;
      } else {
        break;
      }

      const id =
        (data.jobId && String(data.jobId)) ||
        generateJobId({
          name,
          prompt,
          scheduleType,
          scheduleValue,
          groupScope,
        });
      const upsertResult = upsertJob({
        id,
        name,
        prompt,
        script: data.script || null,
        schedule_type: scheduleType,
        schedule_value: scheduleValue,
        linked_sessions: linkedSessions,
        group_scope: groupScope,
        created_by: data.createdBy || 'agent',
        status: 'active',
        next_run: nextRun,
        timeout_ms:
          typeof data.timeoutMs === 'number' ? data.timeoutMs : undefined,
        max_retries:
          typeof data.maxRetries === 'number' ? data.maxRetries : undefined,
        retry_backoff_ms:
          typeof data.retryBackoffMs === 'number'
            ? data.retryBackoffMs
            : undefined,
        max_consecutive_failures:
          typeof data.maxConsecutiveFailures === 'number'
            ? data.maxConsecutiveFailures
            : undefined,
      });

      logger.info(
        { id, created: upsertResult.created, sourceGroup, groupScope },
        'Job upserted via IPC',
      );
      deps.onSchedulerChanged();
      break;
    }

    case 'scheduler_update_job': {
      const jobId = (data.jobId || data.taskId || '').toString();
      if (!jobId) break;
      const job = getJobById(jobId);
      if (!job) break;
      if (
        !isMain &&
        !jobBelongsToSourceGroup(job, sourceGroup, registeredGroups)
      ) {
        logger.warn(
          {
            sourceGroup,
            groupScope: job.group_scope,
            linkedSessions: job.linked_sessions,
            jobId,
          },
          'Unauthorized scheduler_update_job attempt blocked',
        );
        break;
      }

      const updates: Parameters<typeof updateJob>[1] = {};
      if (data.name !== undefined) updates.name = data.name;
      if (data.prompt !== undefined) updates.prompt = data.prompt;
      if (data.script !== undefined) updates.script = data.script || null;
      if (data.schedule_type !== undefined)
        updates.schedule_type = data.schedule_type as
          | 'cron'
          | 'interval'
          | 'once'
          | 'manual';
      if (data.schedule_value !== undefined)
        updates.schedule_value = data.schedule_value;
      if (data.groupScope !== undefined) {
        if (!isMain && data.groupScope !== sourceGroup) {
          logger.warn(
            { sourceGroup, requestedGroupScope: data.groupScope, jobId },
            'Unauthorized group scope mutation in scheduler_update_job',
          );
          break;
        }
        updates.group_scope = data.groupScope;
      }
      if (typeof data.timeoutMs === 'number')
        updates.timeout_ms = data.timeoutMs;
      if (typeof data.maxRetries === 'number')
        updates.max_retries = data.maxRetries;
      if (typeof data.retryBackoffMs === 'number')
        updates.retry_backoff_ms = data.retryBackoffMs;
      if (typeof data.maxConsecutiveFailures === 'number')
        updates.max_consecutive_failures = data.maxConsecutiveFailures;
      if (Array.isArray(data.linkedSessions)) {
        const linked = data.linkedSessions.map((item) => String(item));
        if (!isMain) {
          const unauthorized = linked.some((jid) => {
            const group = registeredGroups[jid];
            return !group || group.folder !== sourceGroup;
          });
          if (unauthorized) {
            logger.warn(
              { sourceGroup, linked },
              'Unauthorized linked sessions in scheduler_update_job',
            );
            break;
          }
        }
        updates.linked_sessions = linked;
      }

      const merged = { ...job, ...updates };
      if (
        updates.schedule_type !== undefined ||
        updates.schedule_value !== undefined
      ) {
        if (merged.schedule_type === 'cron') {
          try {
            const interval = CronExpressionParser.parse(merged.schedule_value, {
              tz: TIMEZONE,
            });
            updates.next_run = interval.next().toISOString();
          } catch {
            logger.warn(
              { jobId, value: merged.schedule_value },
              'Invalid cron in scheduler_update_job',
            );
            break;
          }
        } else if (merged.schedule_type === 'interval') {
          const ms = parseInt(merged.schedule_value, 10);
          if (isNaN(ms) || ms <= 0) {
            logger.warn(
              { jobId, value: merged.schedule_value },
              'Invalid interval in scheduler_update_job',
            );
            break;
          }
          updates.next_run = new Date(Date.now() + ms).toISOString();
        } else if (merged.schedule_type === 'once') {
          const date = new Date(merged.schedule_value);
          if (isNaN(date.getTime())) {
            logger.warn(
              { jobId, value: merged.schedule_value },
              'Invalid once timestamp in scheduler_update_job',
            );
            break;
          }
          updates.next_run = date.toISOString();
        } else {
          updates.next_run = null;
        }
      }

      updateJob(jobId, updates);
      deps.onSchedulerChanged();
      break;
    }

    case 'scheduler_delete_job': {
      const jobId = (data.jobId || data.taskId || '').toString();
      if (!jobId) break;
      const job = getJobById(jobId);
      if (!job) break;
      if (
        !isMain &&
        !jobBelongsToSourceGroup(job, sourceGroup, registeredGroups)
      ) {
        logger.warn(
          {
            sourceGroup,
            groupScope: job.group_scope,
            linkedSessions: job.linked_sessions,
            jobId,
          },
          'Unauthorized scheduler_delete_job attempt blocked',
        );
        break;
      }
      deleteJob(jobId);
      deps.onSchedulerChanged();
      break;
    }

    case 'scheduler_pause_job': {
      const jobId = (data.jobId || data.taskId || '').toString();
      if (!jobId) break;
      const job = getJobById(jobId);
      if (!job) break;
      if (
        !isMain &&
        !jobBelongsToSourceGroup(job, sourceGroup, registeredGroups)
      ) {
        logger.warn(
          {
            sourceGroup,
            groupScope: job.group_scope,
            linkedSessions: job.linked_sessions,
            jobId,
          },
          'Unauthorized scheduler_pause_job attempt blocked',
        );
        break;
      }
      updateJob(jobId, {
        status: 'paused',
        pause_reason: 'Paused by user',
      });
      deps.onSchedulerChanged();
      break;
    }

    case 'scheduler_resume_job': {
      const jobId = (data.jobId || data.taskId || '').toString();
      if (!jobId) break;
      const job = getJobById(jobId);
      if (!job) break;
      if (
        !isMain &&
        !jobBelongsToSourceGroup(job, sourceGroup, registeredGroups)
      ) {
        logger.warn(
          {
            sourceGroup,
            groupScope: job.group_scope,
            linkedSessions: job.linked_sessions,
            jobId,
          },
          'Unauthorized scheduler_resume_job attempt blocked',
        );
        break;
      }
      updateJob(jobId, {
        status: 'active',
        pause_reason: null,
        next_run: job.next_run || new Date().toISOString(),
      });
      deps.onSchedulerChanged();
      break;
    }

    case 'scheduler_trigger_job': {
      const jobId = (data.jobId || data.taskId || '').toString();
      if (!jobId) break;
      const job = getJobById(jobId);
      if (!job) break;
      if (
        !isMain &&
        !jobBelongsToSourceGroup(job, sourceGroup, registeredGroups)
      ) {
        logger.warn(
          {
            sourceGroup,
            groupScope: job.group_scope,
            linkedSessions: job.linked_sessions,
            jobId,
          },
          'Unauthorized scheduler_trigger_job attempt blocked',
        );
        break;
      }
      updateJob(jobId, {
        status: 'active',
        next_run: new Date().toISOString(),
        pause_reason: null,
      });
      deps.onSchedulerChanged();
      break;
    }

    case 'scheduler_list_runs': {
      // Read-only path backed by current_job_runs snapshot in the container.
      // This no-op path exists for audit logs and future host-side query routing.
      listJobRuns(undefined, typeof data.limit === 'number' ? data.limit : 50);
      break;
    }

    case 'scheduler_get_dead_letter': {
      listDeadLetterRuns(typeof data.limit === 'number' ? data.limit : 50);
      break;
    }

    case 'refresh_groups':
      // Only main group can request a refresh
      if (isMain) {
        logger.info(
          { sourceGroup },
          'Group metadata refresh requested via IPC',
        );
        await deps.syncGroups(true);
        // Write updated snapshot immediately
        const availableGroups = deps.getAvailableGroups();
        deps.writeGroupsSnapshot(
          sourceGroup,
          true,
          availableGroups,
          new Set(Object.keys(registeredGroups)),
        );
      } else {
        logger.warn(
          { sourceGroup },
          'Unauthorized refresh_groups attempt blocked',
        );
      }
      break;

    case 'register_group':
      // Only main group can register new groups
      if (!isMain) {
        logger.warn(
          { sourceGroup },
          'Unauthorized register_group attempt blocked',
        );
        break;
      }
      if (data.jid && data.name && data.folder && data.trigger) {
        if (!isValidGroupFolder(data.folder)) {
          logger.warn(
            { sourceGroup, folder: data.folder },
            'Invalid register_group request - unsafe folder name',
          );
          break;
        }
        // Defense in depth: agent cannot set isMain via IPC.
        // Preserve isMain from the existing registration so IPC config
        // updates (e.g. adding additionalMounts) don't strip the flag.
        const existingGroup = registeredGroups[data.jid];
        deps.registerGroup(data.jid, {
          name: data.name,
          folder: data.folder,
          trigger: data.trigger,
          added_at: new Date().toISOString(),
          agentConfig: data.agentConfig,
          requiresTrigger: data.requiresTrigger,
          isMain: existingGroup?.isMain,
        });
      } else {
        logger.warn(
          { data },
          'Invalid register_group request - missing required fields',
        );
      }
      break;

    default:
      logger.warn({ type: data.type }, 'Unknown IPC task type');
  }
}
