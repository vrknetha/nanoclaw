import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { runDreamingSweep } from './memory-dreaming.js';
import { MemoryStore } from './memory-store.js';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeStore(): MemoryStore {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nanoclaw-dream-'));
  tempRoots.push(root);
  return new MemoryStore(path.join(root, 'memory.db'));
}

describe('memory dreaming sweep', () => {
  it('promotes high-signal items and decays low-signal items', async () => {
    const store = makeStore();

    const promoted = store.saveItem({
      scope: 'group',
      group_folder: 'team',
      user_id: null,
      kind: 'fact',
      key: 'deployment_workflow',
      value: 'build, test, deploy',
      source: 'test',
      confidence: 0.5,
    });
    const decayed = store.saveItem({
      scope: 'group',
      group_folder: 'team',
      user_id: null,
      kind: 'fact',
      key: 'obsolete_hint',
      value: 'old docs',
      source: 'test',
      confidence: 0.05,
    });

    for (const [index, queryHash] of [
      'q-a',
      'q-b',
      'q-c',
      'q-d',
      'q-e',
      'q-f',
      'q-g',
      'q-h',
    ].entries()) {
      store.recordRetrievalSignal(promoted.id, 0.9 - index * 0.02, queryHash);
    }

    store.recordRetrievalSignal(decayed.id, 0, 'q-x');

    const result = await runDreamingSweep({
      groupFolder: 'team',
      store,
      enabled: true,
      consolidationEnabled: false,
      consolidateGroupMemory: async () => {
        throw new Error('not expected');
      },
      retentionPinThreshold: 0.95,
      promotionThreshold: 0.6,
      decayThreshold: 0.4,
      minRecalls: 1,
      minUniqueQueries: 1,
      confidenceBoost: 0.05,
      confidenceDecay: 0.1,
    });

    expect(result.promotedCount).toBe(1);
    expect(result.decayedCount).toBe(1);
    expect(result.retiredCount).toBe(1);

    const promotedAfter = store.getItemById(promoted.id)!;
    const decayedAfter = store.getItemById(decayed.id);
    expect(promotedAfter.confidence).toBeGreaterThan(0.5);
    expect(decayedAfter).toBeNull();
  });

  it('returns immediately when dreaming is disabled', async () => {
    const store = makeStore();
    const result = await runDreamingSweep({
      groupFolder: 'team',
      store,
      enabled: false,
      consolidationEnabled: true,
      consolidateGroupMemory: async () => {
        throw new Error('not expected');
      },
      retentionPinThreshold: 0.9,
      promotionThreshold: 0.5,
      decayThreshold: 0.2,
      minRecalls: 1,
      minUniqueQueries: 1,
      confidenceBoost: 0.05,
      confidenceDecay: 0.03,
    });

    expect(result.scoredItems).toBe(0);
    expect(result.promotedCount).toBe(0);
    expect(result.decayedCount).toBe(0);
    expect(result.consolidation).toBeNull();
  });
});
