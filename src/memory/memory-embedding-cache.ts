import crypto from 'crypto';

import { MEMORY_EMBED_MODEL } from '../core/config.js';
import type { MemoryProvider } from './memory-provider.js';
import type { EmbeddingProvider } from './memory-embeddings.js';

export class CachedEmbeddingProvider implements EmbeddingProvider {
  constructor(
    private readonly inner: EmbeddingProvider,
    private readonly store: Pick<
      MemoryProvider,
      'getCachedEmbedding' | 'putCachedEmbedding'
    >,
    private readonly model: string = MEMORY_EMBED_MODEL,
  ) {}

  isEnabled(): boolean {
    return this.inner.isEnabled();
  }

  validateConfiguration(): void {
    this.inner.validateConfiguration();
  }

  async embedOne(text: string): Promise<number[]> {
    const hash = hashText(text);
    const cached = this.store.getCachedEmbedding(hash, this.model);
    if (cached) return cached;

    const embedding = await this.inner.embedOne(text);
    this.store.putCachedEmbedding(hash, this.model, embedding);
    return embedding;
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: Array<number[] | null> = new Array(texts.length).fill(null);
    const misses = new Map<string, { text: string; indexes: number[] }>();

    texts.forEach((text, index) => {
      const hash = hashText(text);
      const cached = this.store.getCachedEmbedding(hash, this.model);
      if (cached) {
        results[index] = cached;
        return;
      }

      const existing = misses.get(hash);
      if (existing) {
        existing.indexes.push(index);
        return;
      }

      misses.set(hash, { text, indexes: [index] });
    });

    if (misses.size > 0) {
      const missEntries = [...misses.entries()];
      const missingTexts = missEntries.map(([, value]) => value.text);
      const embeddings = await this.inner.embedMany(missingTexts);

      if (embeddings.length !== missEntries.length) {
        throw new Error(
          `embedding provider returned ${embeddings.length} vectors for ${missEntries.length} uncached texts`,
        );
      }

      missEntries.forEach(([hash, value], index) => {
        const embedding = embeddings[index];
        if (!embedding) return;
        this.store.putCachedEmbedding(hash, this.model, embedding);
        for (const resultIndex of value.indexes) {
          results[resultIndex] = embedding;
        }
      });
    }

    return results.map((embedding, index) => {
      if (!embedding) {
        throw new Error(`missing embedding at index ${index}`);
      }
      return embedding;
    });
  }
}

export function hashText(text: string): string {
  return crypto.createHash('sha256').update(text).digest('hex');
}
