# Integration Testing Reference

## Quick Start

```bash
# 1. Cross-compile for Linux
source $HOME/.cargo/env
CARGO_TARGET_X86_64_UNKNOWN_LINUX_MUSL_LINKER=x86_64-linux-musl-gcc \
  cargo build --release --target x86_64-unknown-linux-musl \
  --manifest-path crates/Cargo.toml -p clawdentity-cli

# 2. Run tests
cd tests/integration && docker compose up --build --abort-on-container-exit
```

## Container Map

| Service | Image Base | What Runs | Webhook Port |
|---------|-----------|-----------|-------------|
| `mock-registry` | rust (axum) | Fake registry API — register, lookup, CRL, keys | :3000 |
| `mock-proxy` | rust (axum + tungstenite) | WebSocket/SSE/poll relay between agents | :8080 |
| `openclaw` | node:22-alpine | OpenClaw gateway + clawdentity connector | :3001 |
| `picoclaw` | golang:1.22-alpine | PicoClaw server + clawdentity connector | :18794 |
| `nanobot` | python:3.12-slim | NanoBot app + clawdentity connector | :18795 |
| `nanoclaw-h` | node:22-alpine | NanoClaw hustcc + clawdentity connector | :18796 |
| `nanoclaw-q` | node:22-alpine | NanoClaw qwibitai + clawdentity connector | :18797 |
| `test-runner` | alpine | Shell scripts that exec into platform containers | — |

## Test Phases

### Phase 1: Identity (Scenarios 1-2)
- Init + register + doctor on all 5 platforms
- Full mesh pairing (10 pairs, every platform ↔ every other)

### Phase 2: Cross-Platform Messaging (Scenarios 3-6)
- Directed sends between specific platform pairs (OpenClaw→PicoClaw, NanoBot→OpenClaw, etc.)
- Round-trip verification (ping/pong)
- Full mesh: 20 messages (5×4), verify all arrive

### Phase 3: Webhook Contract (Scenarios 7-8)
- Verify all required headers parsed correctly by each platform
- Token auth rejection when misconfigured

### Phase 4: Resilience (Scenarios 9-12)
- Offline connector → outbox queue → reconnect → deliver
- 50-message burst ordering
- Trust verification + CRL revocation across platforms
- Key rotation mid-conversation

### Phase 5: Platform-Specific (Scenarios 13-16)
- OpenClaw: message routes into agent session transcript
- PicoClaw: Go channel adapter processes via internal bus
- NanoBot: Python async handler integration
- systemd service install in Ubuntu container

## Scenario Helper Pattern

```bash
#!/bin/sh
. /scenarios/lib/assert.sh
. /scenarios/lib/helpers.sh

# exec_in <container> <command...> — runs command in container via docker compose exec
# assert_eq <actual> <expected> <msg> — fail test if not equal
# assert_ge <actual> <min> <msg> — fail if actual < min
# wait_for <container> <port> [timeout] — wait for service to be ready
```

## Debugging

```bash
# Shell into a platform container
docker compose exec openclaw sh

# Watch proxy relay traffic
docker compose logs -f mock-proxy

# Check a platform's webhook log
docker compose exec picoclaw cat /var/log/clawdentity-webhook.log

# Run single scenario
docker compose exec test-runner sh /scenarios/03-messaging-ws.sh
```

## Implementation Checklist

1. [ ] Mock registry (axum, ~200 lines)
2. [ ] Mock proxy (axum + tungstenite, ~300 lines)
3. [ ] 5 platform Dockerfiles + entrypoints
4. [ ] docker-compose.yml with health checks
5. [ ] Test helper library (assert.sh, helpers.sh)
6. [ ] 16 scenario scripts
7. [ ] GitHub Actions workflow (`.github/workflows/integration.yml`)
8. [ ] Cross-compile setup (musl target + linker)

## Full Plan
See `crates/INTEGRATION_TEST_PLAN.md` in the Clawdentity repo for complete details including docker-compose.yml, Dockerfiles, CI workflow, and all scenario scripts.
