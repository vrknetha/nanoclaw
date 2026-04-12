import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  _initTestDatabase,
  getJobById,
  listJobRuns,
  upsertJob,
} from '../storage/db.js';
import {
  _resetSchedulerLoopForTests,
  computeNextJobRun,
  startSchedulerLoop,
} from './task-scheduler.js';
import { spawnAgent } from './agent-spawn.js';

const reflectAfterTurnMock = vi.fn(async () => {});
const runDreamingSweepMock = vi.fn(async () => ({
  groupFolder: 'main',
  totalItems: 0,
  scoredItems: 0,
  promotedCount: 0,
  decayedCount: 0,
  retiredCount: 0,
  consolidation: null,
  topPromoted: [],
  durationMs: 1,
}));

vi.mock('./agent-spawn.js', () => ({
  spawnAgent: vi.fn(async () => ({
    status: 'success',
    result: 'Job run completed',
    newSessionId: 'session-1',
  })),
}));

vi.mock('../memory/memory-ipc.js', () => ({
  writeMemoryContextSnapshot: vi.fn(async () => ({ retrievedItemIds: [] })),
}));

vi.mock('../memory/memory-service.js', () => ({
  MemoryService: {
    getInstance: () => ({
      reflectAfterTurn: reflectAfterTurnMock,
      runDreamingSweep: runDreamingSweepMock,
    }),
  },
}));

describe('job scheduler', () => {
  beforeEach(() => {
    _initTestDatabase();
    _resetSchedulerLoopForTests();
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('computeNextJobRun anchors interval schedules to scheduled time', () => {
    const scheduledFor = new Date(Date.now() - 2_000).toISOString();
    const next = computeNextJobRun(
      { schedule_type: 'interval', schedule_value: '60000' },
      scheduledFor,
    );
    expect(next).not.toBeNull();
    expect(new Date(next!).getTime()).toBe(
      new Date(scheduledFor).getTime() + 60000,
    );
  });

  it('computeNextJobRun returns null for once/manual schedules', () => {
    expect(
      computeNextJobRun(
        { schedule_type: 'once', schedule_value: '2026-01-01T00:00:00.000Z' },
        new Date().toISOString(),
      ),
    ).toBeNull();
    expect(
      computeNextJobRun(
        { schedule_type: 'manual', schedule_value: '' },
        new Date().toISOString(),
      ),
    ).toBeNull();
  });

  it('runs due jobs and records run history with status notifications', async () => {
    upsertJob({
      id: 'job-1',
      name: 'daily-summary',
      prompt: 'Send a summary',
      schedule_type: 'once',
      schedule_value: new Date(Date.now() - 60_000).toISOString(),
      linked_sessions: ['group@g.us'],
      group_scope: 'main',
      created_by: 'agent',
      next_run: new Date(Date.now() - 60_000).toISOString(),
      status: 'active',
    });

    const enqueueTask = vi.fn(
      (_groupJid: string, _taskId: string, fn: () => Promise<void>) => {
        void fn();
      },
    );
    const sendMessage = vi.fn(async () => {});

    startSchedulerLoop({
      registeredGroups: () => ({
        'group@g.us': {
          name: 'Main',
          folder: 'main',
          trigger: '@Andy',
          added_at: '2026-01-01T00:00:00.000Z',
          isMain: true,
        },
      }),
      getSessions: () => ({}),
      queue: {
        enqueueTask,
        closeStdin: vi.fn(),
        notifyIdle: vi.fn(),
      } as any,
      onProcess: () => {},
      sendMessage,
    });

    await vi.advanceTimersByTimeAsync(20);
    await Promise.resolve();
    await Promise.resolve();

    const job = getJobById('job-1');
    expect(job?.status).toBe('completed');
    const runs = listJobRuns('job-1', 10);
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe('completed');
    expect(sendMessage).toHaveBeenCalled();
  });

  it('sends failed/dead-letter status updates to linked sessions', async () => {
    vi.mocked(spawnAgent).mockResolvedValueOnce({
      status: 'error',
      error: 'synthetic failure',
      result: null,
      newSessionId: 'session-1',
    });

    upsertJob({
      id: 'job-fail',
      name: 'failure-job',
      prompt: 'fail this run',
      schedule_type: 'once',
      schedule_value: new Date(Date.now() - 60_000).toISOString(),
      linked_sessions: ['group@g.us'],
      group_scope: 'main',
      created_by: 'agent',
      next_run: new Date(Date.now() - 60_000).toISOString(),
      status: 'active',
      max_retries: 0,
      max_consecutive_failures: 1,
    });

    const sendMessage = vi.fn(async () => {});
    startSchedulerLoop({
      registeredGroups: () => ({
        'group@g.us': {
          name: 'Main',
          folder: 'main',
          trigger: '@Andy',
          added_at: '2026-01-01T00:00:00.000Z',
          isMain: true,
        },
      }),
      getSessions: () => ({}),
      queue: {
        enqueueTask: vi.fn(
          (_groupJid: string, _taskId: string, fn: () => Promise<void>) => {
            void fn();
          },
        ),
        closeStdin: vi.fn(),
        notifyIdle: vi.fn(),
      } as any,
      onProcess: () => {},
      sendMessage,
    });

    await vi.advanceTimersByTimeAsync(20);
    await Promise.resolve();
    await Promise.resolve();

    const runs = listJobRuns('job-fail', 10);
    expect(runs.length).toBe(1);
    expect(runs[0].status).toBe('dead_lettered');
    expect(sendMessage).toHaveBeenCalledWith(
      'group@g.us',
      expect.stringContaining('status: dead_lettered'),
    );
  });

  it('runs __system jobs without container execution', async () => {
    upsertJob({
      id: 'system:dreaming:main',
      name: 'Memory Dreaming (main)',
      prompt: '__system:memory_dream',
      schedule_type: 'once',
      schedule_value: new Date(Date.now() - 60_000).toISOString(),
      linked_sessions: ['group@g.us'],
      group_scope: 'main',
      created_by: 'agent',
      next_run: new Date(Date.now() - 60_000).toISOString(),
      status: 'active',
    });

    startSchedulerLoop({
      registeredGroups: () => ({
        'group@g.us': {
          name: 'Main',
          folder: 'main',
          trigger: '@Andy',
          added_at: '2026-01-01T00:00:00.000Z',
          isMain: true,
        },
      }),
      getSessions: () => ({}),
      queue: {
        enqueueTask: vi.fn(
          (_groupJid: string, _taskId: string, fn: () => Promise<void>) => {
            void fn();
          },
        ),
        closeStdin: vi.fn(),
        notifyIdle: vi.fn(),
      } as any,
      onProcess: () => {},
      sendMessage: vi.fn(async () => {}),
    });

    await vi.advanceTimersByTimeAsync(20);
    await Promise.resolve();
    await Promise.resolve();

    expect(runDreamingSweepMock).toHaveBeenCalledTimes(1);
    expect(spawnAgent).not.toHaveBeenCalled();
    expect(reflectAfterTurnMock).not.toHaveBeenCalled();
  });
});
