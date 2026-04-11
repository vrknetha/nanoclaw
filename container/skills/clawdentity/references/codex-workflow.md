# Codex Development Workflow — Foolproof Protocol

This is the MANDATORY workflow for all Clawdentity development tasks. No exceptions.

## ⛔ ABSOLUTE RULE: NEVER CODE DIRECTLY ⛔

**KAI MUST NEVER WRITE, EDIT, OR GENERATE CODE FOR CLAWDENTITY.**
**ALL CODING IS DELEGATED TO CODEX VIA TMUX. NO EXCEPTIONS.**

If Codex is stuck, nudge Codex. If Codex fails, restart Codex.
Do NOT "help" by writing code yourself. Do NOT write "skeleton" files.
Do NOT write "just the Cargo.toml" or "just a small fix."

The ONLY code Kai touches directly:
- Memory files, skill files, plan docs (non-code)
- Git operations (push, PR, gitignore)
- Shell one-liners for checking status (find, wc, grep)

**If Ravi explicitly says "you write it" — ONLY then.**

## The Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. DECIDE — Ravi + Kai agree on the task                   │
│     └─ GitHub issue created/updated BEFORE any code         │
├─────────────────────────────────────────────────────────────┤
│  2. IMPLEMENT — Codex does the work in tmux                 │
│     └─ Kai monitors every 60s, sends Ravi updates           │
│     └─ Ravi can steer mid-flight (Kai relays via tmux)      │
├─────────────────────────────────────────────────────────────┤
│  3. VERIFY — Kai reviews the output                         │
│     └─ cargo check/clippy/test must all pass                │
│     └─ Kai reads key changed files manually                 │
├─────────────────────────────────────────────────────────────┤
│  4. REVIEW — Codex reviews in NEW session                   │
│     └─ /review --base main OR custom review prompt          │
│     └─ Kai does parallel manual review                      │
│     └─ Findings consolidated into REVIEW.md                 │
├─────────────────────────────────────────────────────────────┤
│  5. FIX — If issues found, new Codex session to fix         │
│     └─ All findings listed in single prompt                 │
│     └─ Verify again (cargo check/clippy/test)               │
│     └─ Repeat until clean                                   │
├─────────────────────────────────────────────────────────────┤
│  6. SHIP — Push + PR                                        │
│     └─ git push, update PR description if needed            │
│     └─ Update GitHub issue with completion status            │
│     └─ Ravi only sees the PR link                           │
└─────────────────────────────────────────────────────────────┘
```

## Phase Details

### 1. DECIDE

Before touching code:
```
- Agree on task scope with Ravi
- Check/create GitHub issue: gh issue list / gh issue create
- Update master tracking issue #179 if relevant
- Define acceptance criteria (what "done" looks like)
```

### 2. IMPLEMENT (Codex in tmux)

**Launch:**
```bash
# Kill any existing session
tmux kill-session -t codex-impl 2>/dev/null

# Create fresh session in the repo
tmux new-session -d -s codex-impl -c /Users/ravikiranvemula/Workdir/clawdentity/crates

# Start Codex with full-auto + xhigh reasoning
tmux send-keys -t codex-impl "source \$HOME/.cargo/env && npx @openai/codex -c model_reasoning_effort=xhigh --full-auto" Enter

# Wait for ready, then send task
sleep 10
tmux send-keys -t codex-impl -l "<task prompt>"
tmux send-keys -t codex-impl Enter
```

**Monitor (every 60 seconds):**
```bash
tmux capture-pane -t codex-impl -p | tail -25
```

**Send Ravi updates** via WhatsApp with:
- What Codex is currently doing
- Files being modified
- Any issues or stuck points
- ETA if estimable

**Steering mid-flight** (when Ravi requests changes):
```bash
# Interrupt current work
tmux send-keys -t codex-impl Escape

# Wait for prompt, send correction
sleep 3
tmux send-keys -t codex-impl -l "<Ravi's correction or new direction>"
tmux send-keys -t codex-impl Enter
```

**CRITICAL: Use `-l` flag** for send-keys with prompt text (literal mode). Without it, special characters break.

**MANDATORY in every Codex prompt:** Include these code quality rules:
> "Hard limit: 800 lines per file. Split into focused modules if exceeded. Use clear, descriptive function/struct/module names. Each module owns one domain concept. Code must be easy for human reviewers to understand — no clever tricks, no god files, no utils.rs dumping grounds."

**Patience with Codex:** Codex often spends 5-10+ minutes reading files and planning before editing. This is NORMAL and produces better output. Do NOT interrupt unless:
- It's been >10 minutes with zero file edits AND the pane shows the exact same text
- It's clearly looping (same "Planning..." message cycling)
- It explicitly errored out
- Sub-agents stuck in "pending init" for >5 min (this is a real bug — cancel and tell Codex to work directly)

**Context compaction:** Codex will auto-compact and continue when context fills up. Do NOT kill the session when context is near limit — let it handle it.

When you DO need to nudge (rare):
```bash
tmux send-keys -t codex-impl Escape
sleep 3
tmux send-keys -t codex-impl -l "Start editing files now."
tmux send-keys -t codex-impl Enter
```

### 3. VERIFY (Kai checks the work)

After Codex finishes implementation:
```bash
cd /Users/ravikiranvemula/Workdir/clawdentity/crates
source $HOME/.cargo/env

# Must all pass:
cargo check 2>&1 | tail -5          # 0 errors
cargo clippy --all-targets 2>&1      # 0 warnings
cargo test 2>&1 | tail -10           # 0 failures
cargo build 2>&1 | tail -3           # success

# Check what changed:
git diff --stat
```

If any failures: back to step 2 with fix prompt (don't fix manually — delegate to Codex).

**File size check (mandatory):**
```bash
find . -name '*.rs' -o -name '*.sh' | xargs wc -l | sort -rn | head -20
# Flag anything over 800 lines → send split task to Codex
```

### 4. REVIEW (Codex + Kai in parallel)

**Launch Codex review in NEW tmux session:**
```bash
tmux kill-session -t codex-review 2>/dev/null
tmux new-session -d -s codex-review -c /Users/ravikiranvemula/Workdir/clawdentity/crates
tmux send-keys -t codex-review "source \$HOME/.cargo/env && npx @openai/codex -c model_reasoning_effort=xhigh --full-auto" Enter
sleep 10

# Focused review prompt (adjust scope as needed):
tmux send-keys -t codex-review -l "Review all Rust code in clawdentity-core/src/ and clawdentity-cli/src/. Focus on: 1) Safety issues (unwrap, panic, unchecked indexing) 2) Error handling gaps 3) API design issues 4) Dead code or unused imports 5) Missing test coverage for critical paths 6) Any logic bugs. Read each .rs file, analyze it, then write a comprehensive REVIEW.md with findings categorized by severity (critical/high/medium/low)."
tmux send-keys -t codex-review Enter
```

**Kai does parallel manual review:**
- Read key changed files with `Read` tool
- Run `grep -rn "unwrap\|panic\|unsafe\|todo\|unimplemented" src/*.rs`
- Check for blocking-in-async, missing timeouts, hardcoded values
- Write findings to `KAI_REVIEW.md`

**Consolidate:** Merge both reviews, deduplicate, prioritize by severity.

### 5. FIX (if needed)

**Launch fix session:**
```bash
tmux kill-session -t codex-fix 2>/dev/null
tmux new-session -d -s codex-fix -c /Users/ravikiranvemula/Workdir/clawdentity/crates
tmux send-keys -t codex-fix "source \$HOME/.cargo/env && npx @openai/codex -c model_reasoning_effort=xhigh --full-auto" Enter
sleep 10

# Write full fix list to a temp file, then send via -l flag
cat > /tmp/codex-fix-prompt.txt << 'PROMPT'
Fix ALL review findings: [paste consolidated findings here]
After all fixes: cargo clippy (0 warnings), cargo test (0 failures), cargo build (success).
Commit with: "fix: address review findings"
PROMPT

tmux send-keys -t codex-fix -l "$(cat /tmp/codex-fix-prompt.txt)"
tmux send-keys -t codex-fix Enter
```

**After fix completes:** Re-run verify (step 3). If clean, proceed to ship.

### 6. SHIP

```bash
cd /Users/ravikiranvemula/Workdir/clawdentity

# Push
git push origin feat/rust-cli --no-verify

# Update PR if needed
gh pr edit 180 --body "$(cat updated-description.md)"

# Update issue
gh issue comment 179 --body "Completed: [task description]. PR #180 updated."

# Tell Ravi
# → "PR updated: github.com/vrknetha/clawdentity/pull/180"
```

## Ravi's Interface

Ravi should only see:
1. **Task confirmation** — "Got it, starting [task]. I'll update you every minute."
2. **Progress updates** — "Codex is editing provider.rs... 5 files changed so far"
3. **Steering acknowledgment** — "Got your change, redirecting Codex now"
4. **Completion** — "All done. 0 clippy warnings, 70 tests pass. PR: [link]"

Ravi does NOT need to see:
- tmux commands
- cargo output
- Codex planning text
- File diffs (unless asked)

## Common Pitfalls

| Problem | Solution |
|---------|----------|
| Codex planning for a long time | Normal — wait 10+ min before nudging. Only interrupt if truly stuck/looping |
| Codex near context limit | Do NOT kill — it will auto-compact and continue. Let it work. |
| Sub-agents stuck "pending init" | Cancel, tell Codex to work directly without sub-agents |
| Codex trying to typecheck TS | cd into `crates/` before launching |
| Compile errors after patches | Don't fix manually — new Codex prompt with errors |
| Codex running out of context | Kill session, start fresh with focused scope |
| `send-keys` breaking on special chars | Always use `-l` flag for literal text |
| Codex asking for approvals | Should be in `--full-auto` mode |
| pnpm/husky errors on commit | Always use `--no-verify` |
| Missing cargo env | Prefix with `source $HOME/.cargo/env` |

## Session Naming Convention

| Phase | tmux session name |
|-------|-------------------|
| Implementation | `codex-impl` |
| Review | `codex-review` |
| Fix | `codex-fix` |
| Parallel reviews | `review-pico`, `review-nano`, `review-nclaw` |
