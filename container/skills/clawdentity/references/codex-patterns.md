# Codex Orchestration Patterns for Clawdentity

## Setup

### Config (~/.codex/config.toml)
```toml
model = "gpt-5.3-codex"
model_reasoning_effort = "high"
sandbox_mode = "danger-full-access"
tool_output_token_limit = 25000
exec_timeout_ms = 900000
```

### Known Issues
- **Homebrew Codex (v0.104.0):** Broken/zombie process (0 RSS, hangs). Always use `npx -y @openai/codex@latest`
- **ChatGPT auth:** Does not support `codex-5.3` model name. Config must use `gpt-5.3-codex`
- **`--reasoning-effort` flag:** Does not exist. Use `-c model_reasoning_effort=xhigh`
- **`--reasoning` flag:** Does not exist. Use config override
- **Git in sandbox:** `.git/index.lock` Operation not permitted. Codex must run in non-sandboxed mode or use `--full-auto`

## Task Templates

### 1. Research Task (read-only investigation)
```bash
npx -y @openai/codex@latest -c model_reasoning_effort=xhigh --full-auto \
  "Research: [description]. Repos at /path/to/repos.
   For each find: [specific questions].
   Write findings to /path/to/OUTPUT.md"
```
- Codex spawns sub-agents (one per repo) automatically
- Sub-agents read code, main agent synthesizes
- Output: single comparison document

### 2. Planning Task (plan before implement)
```bash
npx -y @openai/codex@latest -c model_reasoning_effort=xhigh --full-auto \
  "PHASE 1: Read [contributing guides, existing code].
   PHASE 2: Write plan to /path/PLAN.md covering [specifics].
   STOP after writing plan. Do NOT implement."
```
- Critical: include "STOP" and "Do NOT implement" in prompt
- Review plan before approving implementation
- Plan should include: branch names, commit messages, PR titles/bodies, tests

### 3. Implementation Task (after plan approval)
```bash
# In same Codex session (resume or send follow-up):
"Plan approved. Implement all items in order: [X -> Y -> Z].
 For each: create branch, implement, commit --no-verify, push, gh pr create.
 Go."
```
- Codex may ask for approval on shell commands
- Respond `y` (approve once) or `p` (approve + don't ask again for pattern)
- Use `p` liberally for: git, gofmt, cargo, go test, npm test, pytest

### 4. Multi-Repo Fork+PR Task
```bash
# Pre-fork from OpenClaw side:
gh repo fork OWNER/REPO --clone=false

# Update existing clones:
cd /path/to/clone
git remote set-url origin https://github.com/vrknetha/REPO.git
git remote add upstream https://github.com/OWNER/REPO.git

# Then launch Codex:
npx -y @openai/codex@latest -c model_reasoning_effort=xhigh --full-auto \
  "Implement [feature] across repos at /path/to/*.
   For each: checkout branch, implement, test, commit --no-verify,
   push to origin (vrknetha fork), gh pr create to upstream."
```

## Monitoring Codex

### Check Status
```bash
tmux capture-pane -t clagram -p | tail -20
```

### Key Indicators
- `Working (Xs)` — thinking/planning
- `Spawning agents` — parallel sub-agent work
- `Waiting for agents` — sub-agents running
- `X% context left` — context window usage
- `Would you like to run...` — needs approval

### Killing a Stuck Session
```bash
tmux send-keys -t clagram C-c C-c
# Wait 3 seconds
tmux send-keys -t clagram Escape
# Wait 2 seconds
tmux send-keys -t clagram C-c
```

### Resuming a Session
```bash
npx -y @openai/codex@latest resume <session-id>
# Or resume last:
npx -y @openai/codex@latest resume --last
```

## Context Management

- Codex starts fresh each launch (no persistent memory across sessions)
- Reference files (`crates/*.md`) serve as persistent context
- Always point Codex to existing research/plans: "Research already done at crates/PLATFORM_RESEARCH.md"
- Keep plans small and focused — one plan per task, not monolithic

## Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `model not supported when using ChatGPT` | Wrong model name | Use `gpt-5.3-codex` not `codex-5.3` |
| `unexpected argument --reasoning-effort` | Flag doesn't exist | Use `-c model_reasoning_effort=xhigh` |
| Codex hangs at prompt | Interactive mode, not processing | Press Enter to submit, or check if waiting for approval |
| `Operation not permitted` on .git | Sandbox restriction | Use `--full-auto` or non-sandboxed mode |
| Tests fail with pnpm errors | Husky hooks + pnpm mismatch | Use `--no-verify` ONLY in Clawdentity main repo, NOT in forks |
| Sub-agents timeout | Complex research | Check individual agent status, may need retry |
