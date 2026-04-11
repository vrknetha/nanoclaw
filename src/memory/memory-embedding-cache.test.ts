import { describe, expect, it } from 'vitest';

import { CachedEmbeddingProvider } from './memory-embedding-cache.js';
import { EmbeddingProvider } from './memory-embeddings.js';

describe('CachedEmbeddingProvider', () => {
  it('caches single text embeddings', async () => {
    let calls = 0;
    const inner = {
      isEnabled: () => true,
      validateConfiguration: () => undefined,
      embedMany: async (texts: string[]) => {
        calls += 1;
        return texts.map((text) => [text.length]);
      },
      embedOne: async (text: string) => {
        calls += 1;
        return [text.length];
      },
    } satisfies EmbeddingProvider;

    const cache = new Map<string, number[]>();
    const store = {
      getCachedEmbedding: (textHash: string, model: string) =>
        cache.get(`${model}:${textHash}`) || null,
      putCachedEmbedding: (
        textHash: string,
        model: string,
        embedding: number[],
      ) => {
        cache.set(`${model}:${textHash}`, embedding);
      },
    };

    const provider = new CachedEmbeddingProvider(inner, store, 'test-model');

    const first = await provider.embedOne('hello');
    const second = await provider.embedOne('hello');

    expect(first).toEqual([5]);
    expect(second).toEqual([5]);
    expect(calls).toBe(1);
  });

  it('batches only cache misses and preserves order', async () => {
    let embedManyCalls = 0;
    const inner = {
      isEnabled: () => true,
      validateConfiguration: () => undefined,
      embedMany: async (texts: string[]) => {
        embedManyCalls += 1;
        return texts.map((text) => [text.length]);
      },
      embedOne: async (text: string) => [text.length],
    } satisfies EmbeddingProvider;

    const cache = new Map<string, number[]>();
    const store = {
      getCachedEmbedding: (textHash: string, model: string) =>
        cache.get(`${model}:${textHash}`) || null,
      putCachedEmbedding: (
        textHash: string,
        model: string,
        embedding: number[],
      ) => {
        cache.set(`${model}:${textHash}`, embedding);
      },
    };

    const provider = new CachedEmbeddingProvider(inner, store, 'test-model');

    const firstPass = await provider.embedMany(['alpha', 'beta', 'alpha']);
    expect(firstPass).toEqual([[5], [4], [5]]);
    expect(embedManyCalls).toBe(1);

    const secondPass = await provider.embedMany(['alpha', 'beta']);
    expect(secondPass).toEqual([[5], [4]]);
    expect(embedManyCalls).toBe(1);
  });
});
