import { describe, expect, it } from 'vitest';

import { fuseSearchResults } from './memory-retrieval.js';

const RECENT_AT = new Date().toISOString();

describe('fuseSearchResults', () => {
  it('fuses lexical and vector ranks and keeps shared results first', () => {
    const lexical = [
      {
        id: 'a',
        source_type: 'conversation',
        source_path: 'c1',
        text: 'alpha',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.8,
        vector_score: 0,
        fused_score: 0,
      },
      {
        id: 'b',
        source_type: 'conversation',
        source_path: 'c2',
        text: 'beta',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.7,
        vector_score: 0,
        fused_score: 0,
      },
    ];

    const vector = [
      {
        id: 'b',
        source_type: 'conversation',
        source_path: 'c2',
        text: 'beta',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0,
        vector_score: 0.9,
        fused_score: 0,
      },
      {
        id: 'c',
        source_type: 'conversation',
        source_path: 'c3',
        text: 'gamma',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0,
        vector_score: 0.88,
        fused_score: 0,
      },
    ];

    const fused = fuseSearchResults(lexical, vector, 3);
    expect(fused).toHaveLength(3);
    expect(fused[0]?.id).toBe('b');
    expect(fused.map((x) => x.id)).toEqual(['b', 'a', 'c']);
  });

  it('supports tuning lexical/vector channel weights', () => {
    const lexical = [
      {
        id: 'a',
        source_type: 'conversation',
        source_path: 'c1',
        text: 'alpha',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.8,
        vector_score: 0,
        fused_score: 0,
      },
    ];
    const vector = [
      {
        id: 'b',
        source_type: 'conversation',
        source_path: 'c2',
        text: 'beta',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0,
        vector_score: 0.9,
        fused_score: 0,
      },
    ];

    const lexicalOnly = fuseSearchResults(lexical, vector, 2, {
      lexicalWeight: 1,
      vectorWeight: 0,
    });
    expect(lexicalOnly.map((x) => x.id)).toEqual(['a', 'b']);

    const vectorOnly = fuseSearchResults(lexical, vector, 2, {
      lexicalWeight: 0,
      vectorWeight: 1,
    });
    expect(vectorOnly.map((x) => x.id)).toEqual(['b', 'a']);
  });

  it('filters low fused scores using minScore cutoff', () => {
    const lexical = [
      {
        id: 'a',
        source_type: 'conversation',
        source_path: 'c1',
        text: 'alpha',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.8,
        vector_score: 0,
        fused_score: 0,
      },
      {
        id: 'b',
        source_type: 'conversation',
        source_path: 'c2',
        text: 'beta',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.7,
        vector_score: 0,
        fused_score: 0,
      },
    ];
    const vector = [
      {
        id: 'a',
        source_type: 'conversation',
        source_path: 'c1',
        text: 'alpha',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0,
        vector_score: 0.9,
        fused_score: 0,
      },
    ];

    const fused = fuseSearchResults(lexical, vector, 3, { minScore: 0.02 });
    expect(fused.map((x) => x.id)).toEqual(['a']);
  });

  it('applies source-type boosts after fusion', () => {
    const lexical = [
      {
        id: 'conversation-result',
        source_type: 'conversation',
        source_path: 'c1',
        text: 'chat log',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.8,
        vector_score: 0,
        fused_score: 0,
      },
      {
        id: 'claude-result',
        source_type: 'claude_md',
        source_path: 'CLAUDE.md',
        text: 'assistant profile',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.7,
        vector_score: 0,
        fused_score: 0,
      },
    ];

    const fused = fuseSearchResults(lexical, [], 2);
    expect(fused.map((x) => x.id)).toEqual([
      'claude-result',
      'conversation-result',
    ]);
  });

  it('applies temporal decay using created_at and halfLifeDays', () => {
    const oldAt = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const freshAt = new Date().toISOString();

    const lexical = [
      {
        id: 'older',
        source_type: 'conversation',
        source_path: 'c-old',
        text: 'older item',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: oldAt,
        lexical_score: 0.9,
        vector_score: 0,
        fused_score: 0,
      },
      {
        id: 'fresh',
        source_type: 'conversation',
        source_path: 'c-new',
        text: 'fresh item',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: freshAt,
        lexical_score: 0.8,
        vector_score: 0,
        fused_score: 0,
      },
    ];

    const fused = fuseSearchResults(lexical, [], 2, { halfLifeDays: 45 });
    expect(fused.map((x) => x.id)).toEqual(['fresh', 'older']);
  });

  it('applies MMR reranking to reduce near-duplicate snippets', () => {
    const lexical = [
      {
        id: 'dup-1',
        source_type: 'conversation',
        source_path: 'c1',
        text: 'deploy checklist release canary health check',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.9,
        vector_score: 0,
        fused_score: 0,
      },
      {
        id: 'dup-2',
        source_type: 'conversation',
        source_path: 'c2',
        text: 'deploy checklist release canary health checks',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.89,
        vector_score: 0,
        fused_score: 0,
      },
      {
        id: 'diverse',
        source_type: 'conversation',
        source_path: 'c3',
        text: 'weekend hiking plan and weather prep list',
        scope: 'group' as const,
        group_folder: 'g1',
        created_at: RECENT_AT,
        lexical_score: 0.88,
        vector_score: 0,
        fused_score: 0,
      },
    ];

    const fused = fuseSearchResults(lexical, [], 3, { mmrLambda: 0.7 });
    expect(fused.map((x) => x.id)).toEqual(['dup-1', 'diverse', 'dup-2']);
  });
});
