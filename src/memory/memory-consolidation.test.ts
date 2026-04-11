import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import { MEMORY_VECTOR_DIMENSIONS } from '../core/config.js';
import { EmbeddingProvider } from './memory-embeddings.js';
import { consolidateMemoryItems } from './memory-consolidation.js';
import { MemoryStore } from './memory-store.js';

const tempRoots: string[] = [];

afterEach(() => {
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeStore(): MemoryStore {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'nanoclaw-consolidation-'),
  );
  tempRoots.push(root);
  return new MemoryStore(path.join(root, 'memory.db'));
}

function vector(seed: number): number[] {
  const out = new Array<number>(MEMORY_VECTOR_DIMENSIONS).fill(0);
  out[seed % MEMORY_VECTOR_DIMENSIONS] = 1;
  return out;
}

describe('consolidateMemoryItems', () => {
  it('merges a similar cluster and retires sources in heuristic mode', async () => {
    const store = makeStore();

    store.saveItem({
      scope: 'group',
      group_folder: 'team',
      user_id: null,
      kind: 'preference',
      key: 'preference:concise',
      value: 'Ravi prefers concise responses',
      source: 'test',
      confidence: 0.85,
    });
    store.saveItem({
      scope: 'group',
      group_folder: 'team',
      user_id: null,
      kind: 'preference',
      key: 'preference:brief',
      value: 'Ravi likes brief answers',
      source: 'test',
      confidence: 0.84,
    });
    store.saveItem({
      scope: 'group',
      group_folder: 'team',
      user_id: null,
      kind: 'fact',
      key: 'tool:build',
      value: 'Use npm run build before deploy',
      source: 'test',
      confidence: 0.7,
    });

    const embeddings = {
      isEnabled: () => true,
      validateConfiguration: () => undefined,
      embedMany: async (texts: string[]) =>
        texts.map((text) =>
          /concise|brief/i.test(text) ? vector(1) : vector(2),
        ),
      embedOne: async (text: string) =>
        /concise|brief/i.test(text) ? vector(1) : vector(2),
    } satisfies EmbeddingProvider;

    const result = await consolidateMemoryItems({
      groupFolder: 'team',
      store,
      embeddings,
      minItems: 2,
      clusterThreshold: 0.8,
      maxClusters: 5,
    });

    expect(result.mergedItems).toBe(1);
    expect(result.retiredItems).toBe(2);

    const active = store.listActiveItems('team', 20);
    expect(active).toHaveLength(2);
    expect(active.some((item) => item.key.startsWith('consolidated:'))).toBe(
      true,
    );
  });
});
