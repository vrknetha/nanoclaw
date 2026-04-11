import fs from 'fs';
import path from 'path';

import { OneCLI } from '@onecli-sh/sdk';

import {
  AGENT_MEMORY_ROOT,
  CONTAINER_IMAGE,
  DATA_DIR,
  GROUPS_DIR,
  ONECLI_URL,
  TIMEZONE,
} from '../core/config.js';
import { logger } from '../core/logger.js';
import { RegisteredGroup } from '../core/types.js';
import {
  resolveGroupFolderPath,
  resolveGroupIpcPath,
} from '../platform/group-folder.js';
import { validateAdditionalMounts } from '../platform/mount-security.js';
import { hostGatewayArgs, readonlyMountArgs } from './container-runtime.js';
import {
  ensureGroupIpcLayout,
  ensureGroupSessionSettings,
  syncGroupAgentRunnerSource,
  syncGroupSkills,
} from './container-runner-layout.js';
import { VolumeMount } from './container-runner-types.js';

const onecli = new OneCLI({ url: ONECLI_URL });
const CONTAINER_AGENT_MEMORY_ROOT = '/workspace/agent-memory';

export function buildVolumeMounts(
  group: RegisteredGroup,
  isMain: boolean,
): VolumeMount[] {
  const mounts: VolumeMount[] = [];
  const projectRoot = process.cwd();
  const groupDir = resolveGroupFolderPath(group.folder);

  if (isMain) {
    mounts.push({
      hostPath: projectRoot,
      containerPath: '/workspace/project',
      readonly: true,
    });

    const envFile = path.join(projectRoot, '.env');
    if (fs.existsSync(envFile)) {
      mounts.push({
        hostPath: '/dev/null',
        containerPath: '/workspace/project/.env',
        readonly: true,
      });
    }

    mounts.push({
      hostPath: path.join(projectRoot, 'store'),
      containerPath: '/workspace/project/store',
      readonly: false,
    });

    mounts.push({
      hostPath: groupDir,
      containerPath: '/workspace/group',
      readonly: false,
    });

    const globalDir = path.join(GROUPS_DIR, 'global');
    if (fs.existsSync(globalDir)) {
      mounts.push({
        hostPath: globalDir,
        containerPath: '/workspace/global',
        readonly: false,
      });
    }
  } else {
    mounts.push({
      hostPath: groupDir,
      containerPath: '/workspace/group',
      readonly: false,
    });

    const globalDir = path.join(GROUPS_DIR, 'global');
    if (fs.existsSync(globalDir)) {
      mounts.push({
        hostPath: globalDir,
        containerPath: '/workspace/global',
        readonly: true,
      });
    }
  }

  const groupSessionsDir = path.join(
    DATA_DIR,
    'sessions',
    group.folder,
    '.claude',
  );
  ensureGroupSessionSettings(groupSessionsDir);
  syncGroupSkills(groupSessionsDir);
  mounts.push({
    hostPath: groupSessionsDir,
    containerPath: '/home/node/.claude',
    readonly: false,
  });

  const groupIpcDir = resolveGroupIpcPath(group.folder);
  ensureGroupIpcLayout(groupIpcDir);
  mounts.push({
    hostPath: groupIpcDir,
    containerPath: '/workspace/ipc',
    readonly: false,
  });

  const groupAgentRunnerDir = syncGroupAgentRunnerSource(group.folder);
  mounts.push({
    hostPath: groupAgentRunnerDir,
    containerPath: '/app/src',
    readonly: false,
  });

  const configuredMemoryRoot = (AGENT_MEMORY_ROOT || '').trim();
  if (configuredMemoryRoot) {
    fs.mkdirSync(configuredMemoryRoot, { recursive: true });
    mounts.push({
      hostPath: configuredMemoryRoot,
      containerPath: CONTAINER_AGENT_MEMORY_ROOT,
      readonly: false,
    });
  }

  if (group.containerConfig?.additionalMounts) {
    const validatedMounts = validateAdditionalMounts(
      group.containerConfig.additionalMounts,
      group.name,
      isMain,
    );
    mounts.push(...validatedMounts);
  }

  return mounts;
}

export async function buildContainerArgs(
  mounts: VolumeMount[],
  containerName: string,
  effectiveModel: string | undefined,
  agentIdentifier?: string,
): Promise<string[]> {
  const args: string[] = ['run', '-i', '--rm', '--name', containerName];

  args.push('-e', `TZ=${TIMEZONE}`);

  if (effectiveModel) {
    args.push('-e', `ANTHROPIC_MODEL=${effectiveModel}`);
    args.push('-e', `CLAUDE_MODEL=${effectiveModel}`);
  }

  const hasAgentMemoryMount = mounts.some(
    (mount) =>
      mount.containerPath === CONTAINER_AGENT_MEMORY_ROOT && !mount.readonly,
  );
  if (hasAgentMemoryMount) {
    args.push('-e', `AGENT_MEMORY_ROOT=${CONTAINER_AGENT_MEMORY_ROOT}`);
  }

  const onecliApplied = await onecli.applyContainerConfig(args, {
    addHostMapping: false,
    agent: agentIdentifier,
  });
  if (onecliApplied) {
    logger.info({ containerName }, 'OneCLI gateway config applied');
  } else {
    logger.warn(
      { containerName },
      'OneCLI gateway not reachable — container will have no credentials',
    );
  }

  args.push(...hostGatewayArgs());

  const hostUid = process.getuid?.();
  const hostGid = process.getgid?.();
  if (hostUid != null && hostUid !== 0 && hostUid !== 1000) {
    args.push('--user', `${hostUid}:${hostGid}`);
    args.push('-e', 'HOME=/home/node');
  }

  for (const mount of mounts) {
    if (mount.readonly) {
      args.push(...readonlyMountArgs(mount.hostPath, mount.containerPath));
    } else {
      args.push('-v', `${mount.hostPath}:${mount.containerPath}`);
    }
  }

  args.push(CONTAINER_IMAGE);
  return args;
}
