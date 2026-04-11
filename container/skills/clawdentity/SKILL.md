---
name: clawdentity
description: This skill should be used when the user asks to "work on Clawdentity", "manage Clawdentity repo", "implement Clawdentity feature", "run Codex on Clawdentity", "build Rust CLI", "add platform support", "create webhook channel", "fork and PR", "run integration tests", "test cross-platform", "test Clawdentity", or needs to orchestrate Codex agents for Clawdentity development tasks.
---

# Clawdentity Development Skill

Orchestrate development of the Clawdentity agent identity protocol — a Rust CLI providing agent-to-agent identity, messaging, pairing, and verification across all agent platforms.

## MANDATORY: GitHub Issue Tracking

**Before ANY work begins**, update or create a GitHub issue on `vrknetha/clawdentity`:

1. **Check existing issues** — `gh issue list` in the repo
2. **If issue exists for this work** — update it with current status, plan changes, new subtasks
3. **If no issue exists** — create one with scope, plan, and acceptance criteria
4. **After completing work** — update the issue with what was done, link PRs, close if finished

**Master tracking issue:** [#179](https://github.com/vrknetha/clawdentity/issues/179) — covers overall Rust CLI + platform integration.
**Rust CLI PR:** [#180](https://github.com/vrknetha/clawdentity/pull/180) — feat/rust-cli branch.

This is non-negotiable. No cowboy commits without issue tracking.

## Project Layout

| Path | Purpose |
|------|---------|
| `/Users/ravikiranvemula/Workdir/clawdentity` | Main repo (branch: `feat/rust-cli`) |
| `crates/clawdentity-core/` | Rust business logic (26 modules) |
| `crates/clawdentity-cli/` | Thin clap CLI layer |
| `packages/connector/` | TypeScript connector runtime (reference) |
| `packages/protocol/` | Protocol types (DID, AIT, CRL) |
| `packages/sdk/` | TypeScript SDK |
| `apps/openclaw-skill/` | OpenClaw integration skill (reference pattern) |
| `crates/IMPLEMENTATION_PLAN.md` | TS-parity corrected implementation plan |
| `crates/REVIEW.md` | Codex self-review of Rust CLI |
| `crates/PLATFORM_RESEARCH.md` | Agent platform integration research |
| `crates/PLATFORM_INBOUND_FORMATS.md` | HTTP inbound format per platform |
| `crates/WEBHOOK_PR_PLAN.md` | Webhook channel PR plan for 4 platforms |

## Architecture

```
Registry (clawdentity.com)     Proxy (CF Workers)
        │                            │
        │ register/auth              │ relay messages
        │                            │ (WebSocket + HTTP)
        ▼                            ▼
   ┌─────────────────────────────────────┐
   │         clawdentity CLI             │
   │  (single binary, zero runtime deps) │
   ├─────────────────────────────────────┤
   │  identity │ agent  │ pairing │ verify│
   │  db       │ relay  │ service │ QR    │
   └─────────────────────────────────────┘
        │                            │
        │ exec() / webhook           │ SKILL.md
        ▼                            ▼
   [Any Agent Platform: OpenClaw, NanoBot, PicoClaw, NanoClaw]
```

## ⛔ NEVER CODE DIRECTLY — CODEX ONLY ⛔

**ALL CODE CHANGES GO THROUGH CODEX IN TMUX. KAI NEVER WRITES CODE.**
**No "skeleton files." No "small fixes." No "just the Cargo.toml."**
**If Codex is stuck, nudge Codex. If Codex fails, restart Codex.**
**Only exception: Ravi explicitly says "you write it."**

## Codex Development Workflow

**MANDATORY: Read `references/codex-workflow.md` before ANY development task.**

The workflow is: DECIDE → IMPLEMENT (Codex) → VERIFY → REVIEW (Codex + Kai) → FIX → SHIP

### Key Rules
- **Codex does ALL coding** — never code directly, always delegate to Codex in tmux
- **Kai monitors every 60s** and sends Ravi progress updates via WhatsApp
- **Ravi steers mid-flight** — Kai relays changes to Codex via tmux send-keys
- **Ravi only sees the PR** — no tmux output, no cargo logs, no diffs (unless asked)
- **Let Codex think** — planning for 5-10 min is normal. Only nudge after 10+ min of zero edits
- **New tmux session per phase** — `codex-impl`, `codex-review`, `codex-fix`

### Prerequisites
- Codex CLI: `npx @openai/codex` (homebrew binary is broken)
- Auth: ChatGPT CLI subscription (not API key)
- Model: `gpt-5.3-codex` with `-c model_reasoning_effort=xhigh`
- Always `--full-auto` mode
- Git: `--no-verify` (pnpm version mismatch in husky hooks)
- Cargo: prefix with `source $HOME/.cargo/env`
- Prompts via tmux: always use `send-keys -l` (literal flag)

## Platform Integration

### Supported Platforms

| Platform | Repo | Language | Inbound | Fork |
|----------|------|----------|---------|------|
| OpenClaw | openclaw/openclaw | TypeScript | Webhook POST to hook | N/A (native) |
| NanoBot | HKUDS/nanobot | Python | WebSocket bridge (no HTTP yet) | vrknetha/nanobot |
| PicoClaw | sipeed/picoclaw | Go | HTTP webhook (LINE pattern) | vrknetha/picoclaw |
| NanoClaw (qwibitai) | qwibitai/nanoclaw | Claude Code | Baileys → SQLite poll | vrknetha/nanoclaw |

### Bidirectional Webhook Contract (all platforms)

Same HTTP server, same port, two routes. Follows OpenClaw's existing pattern — no exec/shell calls for sending.

**Inbound** (relay → platform):
```
POST /webhook
Headers: x-clawdentity-agent-did, x-clawdentity-to-agent-did, x-clawdentity-verified, x-request-id
Body: { "content": "...", ...relay payload }
```

**Outbound** (platform → relay):
```
POST /send
Body: { "to": "<did>", "content": "<message>", "peer": "<alias>" }
Response: 202 Accepted → forwards to connector at localhost:18791/outbound
```

### Install Flow

`clawdentity install` detects platform and configures messaging:

| Platform | Detection | Skills dir | Config |
|----------|-----------|-----------|--------|
| OpenClaw | `~/persona/.openclaw/` | `~/persona/.openclaw/skills/` | `openclaw.json` |
| NanoBot | `~/.nanobot/` | `~/.nanobot/skills/` | `~/.nanobot/config.json` |
| PicoClaw | `picoclaw` in PATH | workspace `skills/` | `~/.picoclaw/config.json` |
| NanoClaw (qwibitai) | `.claude/` | `.claude/skills/` | `.env` + `src/config.ts` |

## Rust CLI Phases (All Complete)

| Phase | Module | Status |
|-------|--------|--------|
| 1 | Workspace scaffold + config routing | ✅ |
| 2 | Identity, DID (`did:claw:{kind}:{ulid}`), signing, registry, agent | ✅ |
| 3 | SQLite persistence (5 tables) | ✅ |
| 4 | Connector runtime (WebSocket relay, HTTP server) | ✅ |
| 5 | Pairing + Trust + QR | ✅ |
| 6 | Verify + CRL cache | ✅ |
| 7 | API keys, invites, admin | ✅ |
| 8 | Service management (launchd/systemd) | ✅ |
| 9 | OpenClaw diagnostics (doctor, setup, relay test) | ✅ |
| 10 | CLI commands + hardening | ✅ |
| 11 | `connector start` subcommand (TS parity) | 🔨 In progress |

### TS Parity Gaps

| TS Command | Rust Status | Notes |
|------------|-------------|-------|
| `connector start <agent>` | 🔨 Building | Long-running: WebSocket relay + HTTP outbound server + graceful shutdown |
| `skill install` | ❌ Not needed | SKILL.md-on-URL replaces this |

## Key Decisions

- **DID format:** `did:claw:{kind}:{ulid}` (aligned to TS implementation)
- **Config root:** `~/.clawdentity` (matches TS CLI)
- **License:** MIT (open protocol, monetize hosted service)
- **Single binary:** no MCP server mode — CLI + SKILL.md is the integration pattern
- **Bidirectional webhook:** inbound POST /webhook + outbound POST /send on same server
- **No exec for messaging:** follows OpenClaw's pattern — full HTTP API both directions
- **Proxy is essential:** all messaging goes through relay proxy (NAT traversal, no public endpoints needed)
- **Delivery modes:** WebSocket (default), HTTP polling (simple fallback)
- **Local testing:** no containers needed — just different `CLAWDENTITY_HOME` dirs
- **`clawdentity listen`:** persistent proxy connection; **`clawdentity send`:** one-shot HTTP POST

## Integration Testing

Two tiers: local (protocol-level) and Docker (platform integration).

### Tier 1: Local E2E Tests (protocol-only)

Already built in `tests/local/`. Tests the CLI against mock services — no Docker needed.

| Component | Location | Purpose |
|-----------|----------|---------|
| mock-registry | `tests/local/mock-registry/` | Rust/axum, 7 modules, all registry endpoints |
| mock-proxy | `tests/local/mock-proxy/` | Rust/axum, WebSocket relay + pairing |
| run.sh | `tests/local/run.sh` | 8 scenarios: init, register, config, agent, pairing, doctor, api-keys, invites |

```bash
cd crates && cargo build -p mock-registry -p mock-proxy -p clawdentity-cli
bash tests/local/run.sh
```

### Tier 2: Docker Platform Integration Tests

Tests the FULL pipeline: platform runtime → connector → proxy relay → connector → platform webhook delivery. This is where provider PR bugs surface.

**5 containers (3 providers at a time, rotatable):**

| Container | Runtime | Purpose |
|-----------|---------|---------|
| mock-registry | Rust (axum) | Identity/auth (port 13370) |
| mock-proxy | Rust (axum) | WebSocket relay (port 13371) |
| Platform A | Real runtime | e.g. OpenClaw (Node 22) |
| Platform B | Real runtime | e.g. PicoClaw (Go 1.22) |
| Platform C | Real runtime | e.g. NanoBot (Python 3.12) |

Each platform container runs: real platform app + `clawdentity connector start` + own DID identity.

**3 agents = enough for mesh testing** (A→B, B→C, A→C + round trips). Rotate which 3 providers per run to test all combinations without running all simultaneously.

**Why platform integration (not just protocol):**
- Catches webhook format mismatches between connector and platform
- Validates each platform's inbound handler (PRs #626, #985, #377)
- Tests auth header parsing per platform
- Proves the SKILL.md install flow works end-to-end

**Resource budget (M1 16GB):** ~1GB images, ~600MB RAM for containers, ~3GB Docker Desktop = ~9GB total. Leaves 7GB headroom.

### Key Files

| File | Purpose |
|------|---------|
| `tests/local/` | Local protocol tests (already built) |
| `tests/integration/` | Docker Compose + platform scenarios (to be built) |
| `crates/INTEGRATION_TEST_PLAN.md` | Full test plan reference (gitignored, local only) |

## Distribution Strategy

**Primary: SKILL.md on a URL.** Any agent platform curls it, follows the steps, done.
- `https://raw.githubusercontent.com/vrknetha/clawdentity/main/SKILL.md`
- Contains: binary install (curl), init, register, connector start, send/receive
- Works for any platform that can read a skill file (OpenClaw, Claude Code, Codex, etc.)
- The SKILL.md IS the installer — no per-platform packaging needed

**Secondary:**
1. **curl installer + GitHub Releases** — `curl -fsSL https://clawdentity.com/install.sh | sh`
2. **cargo install** — Rust-based frameworks
3. **npm wrapper** (`@clawdentity/cli`) — like esbuild/turbo pattern
4. **Homebrew tap** — macOS devs

## Code Quality Standards

**These rules apply to ALL code in the Clawdentity project — Rust, shell scripts, test infrastructure, everything.**

### File Size Limits
- **Hard limit: 800 lines per file.** No exceptions.
- If a file exceeds 800 lines, split it into modules with clear responsibility boundaries.
- Prefer many small, focused files over fewer large ones.

### Naming Conventions
- **Functions:** Descriptive verb-noun names that explain what they do. `create_agent_challenge_response` > `handle_challenge`. `parse_bearer_token` > `get_token`.
- **Modules:** Named after the domain concept they own. `identity.rs`, `pairing.rs`, `api_keys.rs` — not `handlers.rs`, `utils.rs`, `helpers.rs`.
- **Structs:** Named after the thing they represent. `AgentRecord`, `PairingTicket`, `SigningMaterial`.
- **Constants:** SCREAMING_SNAKE_CASE with descriptive names. `DEFAULT_WEBHOOK_PORT` > `PORT`.
- **Test functions:** `test_<what_it_verifies>` — `test_register_agent_with_valid_ait` > `test_register`.

### Module Structure
When splitting a file, each module should:
1. Own a single domain concept (identity, pairing, crypto, etc.)
2. Have a clear public API (minimize `pub` surface)
3. Re-export what parent needs via `mod.rs` or inline `pub use`
4. Be independently understandable — a reviewer reading just that file should get the full picture

### Code Readability (for human reviewers)
- **No clever one-liners** — prefer clarity over brevity
- **Group related functions together** — don't scatter helpers across files
- **Document non-obvious logic** — a brief comment on WHY, not WHAT
- **Error messages must be actionable** — "Failed to connect to registry at {url}: {err}" > "connection failed"
- **Consistent patterns** — if one handler uses `State(state)` extraction, all handlers should

### Codex Prompt Rule
When sending tasks to Codex, ALWAYS include:
> "Hard limit: 800 lines per file. If any file exceeds 800 lines, split into focused modules. Use clear, descriptive naming for all functions, structs, and modules."

## Git Conventions

- Branch: `feat/rust-cli` (main development branch)
- `--no-verify` only for Clawdentity main repo (pnpm version mismatch in husky hooks)
- **Do NOT use `--no-verify` on forked repos** — follow their commit conventions
- PR base: `develop` branch
- Cargo commands may need: `source $HOME/.cargo/env`
- Master tracking issue: **#179** on `vrknetha/clawdentity`

## Bundled Resources

| File | Purpose |
|------|---------|
| `references/codex-workflow.md` | **PRIMARY** — Foolproof Codex dev workflow (DECIDE→IMPLEMENT→VERIFY→REVIEW→FIX→SHIP) |
| `references/codex-patterns.md` | Codex orchestration patterns and troubleshooting |
| `references/platform-adapters.md` | Per-platform adapter details and code paths |
| `references/integration-testing.md` | Cross-platform Docker test strategy summary |
| `scripts/launch-codex.sh` | Quick-launch Codex in tmux with right config |

**Directive:** Read `references/codex-workflow.md` before ANY development task. Read `references/codex-patterns.md` for troubleshooting. Read `references/platform-adapters.md` before platform integration work. Read `references/integration-testing.md` before working on integration tests.
