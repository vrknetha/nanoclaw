# PR-Ready Package (ENG-123)

## Approved Plan Summary
- Plan: SQLite-first self-improving memory agent with staged memory retrieval, confidence feedback, consolidation, and periodic dreaming maintenance.
- Current staged additions completed in this cycle:
1. D1 rich recall signal tracking
2. D2 embedding cache
3. D3 promotion scoring
4. D4 scheduled dreaming sweep system job

## Implemented Scope
1. Memory schema v3 migration in `memory_items`:
- `total_score`
- `max_score`
- `query_hashes_json`
- `recall_days_json`
2. New retrieval signal method:
- `recordRetrievalSignal(itemId, score, queryHash)` in store/provider/service path
3. Embedding cache table + wrapper:
- `embedding_cache` table
- `CachedEmbeddingProvider` used by `MemoryService`
4. Dreaming module:
- promotion/decay scoring formula
- retire-on-low-confidence behavior
- `dreaming_completed` event
5. System scheduler integration:
- cron-backed `system:dreaming:<group>` jobs
- `__system:memory_dream` bypasses container execution and runs host memory sweep directly
6. IPC contract extension:
- `memory_dream` action on host + agent-runner contract parity
7. Test coverage additions:
- embedding cache tests
- dreaming tests
- scheduler system-job tests
- store signal/cache tests

## Deterministic Verification Results
- `npm run build` -> pass
- `npm test` -> pass (37 files, 413 tests)
- `python3 .codex/scripts/verify.py` -> pass
- `python3 .codex/scripts/validate_work.py` -> pass
- `python3 .codex/scripts/validate_artifacts.py --allow-missing-run` -> pass
- `python3 .codex/scripts/pr_ready.py` -> `PR_READY`

## Quality / Performance / Security Scores
- Quality: 8.5 (`.factory/reviews/quality.json`)
- Performance: 8.1 (`.factory/reviews/performance.json`)
- Security: 8.3 (`.factory/reviews/security.json`)
- Functional score: 8.6 (`.factory/tests.json`)

## Known Risks and Follow-Ups
1. Reflection extraction remains heuristic and may need precision tuning in noisy chats.
2. Vector/retrieval scaling may need stronger ANN indexing and tighter pruning under very large archives.
3. Memory event payloads still rely on general filtering; additional redaction policy is a follow-up.
4. PM2 daemon is present in environment (`data/sessions/.../.pm2`) even though active NanoClaw runtime is now single-instance via launchd.

## Manual Validation Evidence
1. Confirmed no duplicate `node dist/index.js` runtime after cleanup; active process is launchd-managed (`com.nanoclaw`).
2. Confirmed historical Telegram `409 getUpdates` conflict entries are from old PID (`3707`) before restart; no new conflict lines after relaunch.
3. Verified scheduler system job path with tests: `__system:memory_dream` runs without container spawn.
4. Verified IPC contract sync test passes for host/runner memory action set.
5. Verified factory validation report indicates all gates green and PR-ready state.
