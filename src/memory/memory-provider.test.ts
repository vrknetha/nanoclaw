import fs from 'fs';
import os from 'os';
import path from 'path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createMemoryProvider,
  MemoryProvider,
  registerMemoryProvider,
} from './memory-provider.js';
import { AgentMemoryRootService } from './agent-memory-root.js';

const tempRoots: string[] = [];

afterEach(() => {
  AgentMemoryRootService.resetForTests();
  delete process.env.AGENT_MEMORY_ROOT;
  for (const root of tempRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function makeFakeProvider(name: string): MemoryProvider {
  return {
    providerName: name,
    close: () => undefined,
    saveItem: () => {
      throw new Error('not implemented');
    },
    findItemByKey: () => null,
    getItemById: () => null,
    patchItem: () => {
      throw new Error('not implemented');
    },
    pinItem: () => undefined,
    saveItemEmbedding: () => undefined,
    getCachedEmbedding: () => null,
    putCachedEmbedding: () => undefined,
    findSimilarItems: () => [],
    listActiveItems: () => [],
    softDeleteItem: () => undefined,
    incrementRetrievalCount: () => undefined,
    recordRetrievalSignal: () => undefined,
    bumpConfidence: () => undefined,
    adjustConfidence: () => undefined,
    decayUnusedConfidence: () => 0,
    countReflectionsSinceLastUsageDecay: () => 0,
    recordUsageDecayRun: () => undefined,
    listTopItems: () => [],
    chunkExists: () => false,
    touchItem: () => undefined,
    saveProcedure: () => {
      throw new Error('not implemented');
    },
    getProcedureById: () => null,
    patchProcedure: () => {
      throw new Error('not implemented');
    },
    listTopProcedures: () => [],
    saveChunks: () => 0,
    lexicalSearch: () => [],
    vectorSearch: () => [],
    searchProceduresByText: () => [],
    listSourceChunks: () => [],
    applyRetentionPolicies: () => undefined,
    recordEvent: () => undefined,
  };
}

describe('memory provider registry', () => {
  it('throws for unknown providers', () => {
    expect(() => createMemoryProvider('missing-provider')).toThrow(
      /Unknown memory provider/,
    );
  });

  it('supports custom provider registration', () => {
    registerMemoryProvider('custom-test', () =>
      makeFakeProvider('custom-test'),
    );
    const provider = createMemoryProvider('custom-test');
    expect(provider.providerName).toBe('custom-test');
  });

  it('writes qmd durable markdown and cache under AGENT_MEMORY_ROOT', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nanoclaw-qmd-'));
    tempRoots.push(root);
    process.env.AGENT_MEMORY_ROOT = root;

    const provider = createMemoryProvider('qmd');
    const item = provider.saveItem({
      scope: 'group',
      group_folder: 'team',
      user_id: null,
      kind: 'fact',
      key: 'workflow',
      value: 'always run tests first',
      source: 'agent',
      confidence: 0.8,
    });
    provider.close();

    expect(fs.existsSync(path.join(root, '.cache', 'memory.db'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'profile', `${item.id}.md`))).toBe(
      true,
    );
  });
});
