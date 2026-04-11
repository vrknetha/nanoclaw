import { afterEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

afterEach(async () => {
  for (const key of Object.keys(process.env)) {
    if (!(key in ORIGINAL_ENV)) {
      delete process.env[key];
    }
  }
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    process.env[key] = value;
  }

  vi.resetModules();
  const { MemoryService } = await import('./memory-service.js');
  MemoryService.closeInstance();
});

describe('memory IPC provider integration', () => {
  it('routes memory IPC requests through the configured provider', async () => {
    process.env.MEMORY_PROVIDER = 'ipc-test-provider';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.MEMORY_SEMANTIC_DEDUP_ENABLED = 'false';

    vi.resetModules();
    const { registerMemoryProvider } = await import('./memory-provider.js');
    let saveCalls = 0;
    let eventCalls = 0;

    registerMemoryProvider('ipc-test-provider', () => ({
      providerName: 'ipc-test-provider',
      close: () => undefined,
      saveItem: (input) => {
        saveCalls += 1;
        const now = new Date().toISOString();
        return {
          id: 'mem-1',
          scope: input.scope,
          group_folder: input.group_folder,
          user_id: input.user_id,
          kind: input.kind,
          key: input.key,
          value: input.value,
          source: input.source,
          confidence: input.confidence,
          is_pinned: Boolean(input.is_pinned),
          version: 1,
          last_used_at: null,
          last_retrieved_at: null,
          retrieval_count: 0,
          total_score: 0,
          max_score: 0,
          query_hashes_json: '[]',
          recall_days_json: '[]',
          embedding_json: null,
          created_at: now,
          updated_at: now,
        };
      },
      getItemById: () => null,
      findItemByKey: () => null,
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
      recordEvent: () => {
        eventCalls += 1;
      },
    }));

    const { MemoryService } = await import('./memory-service.js');
    MemoryService.closeInstance();
    const { processMemoryRequest } = await import('./memory-ipc.js');

    const response = await processMemoryRequest(
      {
        requestId: 'req-1',
        action: 'memory_save',
        payload: {
          key: 'style',
          value: 'concise',
        },
      },
      'team',
      false,
    );

    expect(response.ok).toBe(true);
    expect(response.provider).toBe('ipc-test-provider');
    expect(saveCalls).toBe(1);
    expect(eventCalls).toBe(1);
  });

  it('returns IPC error responses when memory service init fails', async () => {
    vi.resetModules();
    vi.doMock('./memory-service.js', () => ({
      MemoryService: {
        getInstance: () => {
          throw new Error('memory init failed');
        },
        closeInstance: () => undefined,
      },
    }));

    const { processMemoryRequest } = await import('./memory-ipc.js');
    const response = await processMemoryRequest(
      {
        requestId: 'req-init-fail',
        action: 'memory_search',
        payload: { query: 'test' },
      },
      'team',
      false,
    );

    expect(response.ok).toBe(false);
    expect(response.provider).toBe('uninitialized');
    expect(response.error).toContain('memory init failed');

    vi.doUnmock('./memory-service.js');
  });
});
