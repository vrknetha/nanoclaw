import { describe, expect, it } from 'vitest';

import {
  createEmbeddingProvider,
  EmbeddingProvider,
  OpenAIEmbeddingClient,
  registerEmbeddingProvider,
} from './memory-embeddings.js';

describe('memory embedding providers', () => {
  it('creates openai provider from factory', () => {
    const provider = createEmbeddingProvider('openai');
    expect(provider).toBeInstanceOf(OpenAIEmbeddingClient);
  });

  it('throws for unknown provider name', () => {
    expect(() => createEmbeddingProvider('does-not-exist')).toThrow(
      /Unknown memory embedding provider/,
    );
  });

  it('supports registering additional providers', async () => {
    const providerName = `test-provider-${Date.now()}`;
    registerEmbeddingProvider(
      providerName,
      () =>
        ({
          isEnabled: () => true,
          validateConfiguration: () => undefined,
          embedMany: async (texts: string[]) =>
            texts.map(() => [0.1, 0.2, 0.3, 0.4]),
          embedOne: async () => [0.1, 0.2, 0.3, 0.4],
        }) satisfies EmbeddingProvider,
    );

    const provider = createEmbeddingProvider(providerName);
    expect(await provider.embedOne('hello')).toEqual([0.1, 0.2, 0.3, 0.4]);
  });
});
