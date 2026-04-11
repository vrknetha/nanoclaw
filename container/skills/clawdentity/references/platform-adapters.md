# Platform Adapter Details

## OpenClaw (Reference Implementation)

### Inbound
- Connector receives via WebSocket from proxy
- `deliverToOpenclawHook()` POSTs to local gateway hook endpoint
- Headers: `x-clawdentity-agent-did`, `x-clawdentity-to-agent-did`, `x-clawdentity-verified`, `x-openclaw-token`, `x-request-id`
- Source: `packages/connector/src/runtime/openclaw.ts`

### Outbound
- OpenClaw transform (`relay-to-peer.mjs`) intercepts `{"peer": "<alias>"}` payloads
- Routes through connector HTTP API → proxy → peer
- Source: `apps/openclaw-skill/skill/SKILL.md` (Peer Recognition & Messaging section)

### Key Files
- `~/persona/.openclaw/hooks/transforms/relay-to-peer.mjs` — outbound hook
- `~/persona/.openclaw/hooks/transforms/clawdentity-relay.json` — runtime config
- `~/persona/.openclaw/hooks/transforms/clawdentity-peers.json` — peer map
- `~/persona/.openclaw/skills/clawdentity-openclaw-relay/SKILL.md` — agent skill

---

## NanoBot (Python, HKUDS/nanobot)

### Inbound Message Flow
```
WhatsApp Bridge (WebSocket) → WhatsAppChannel._handle_bridge_message()
  → BaseChannel._handle_message() → MessageBus.publish_inbound()
  → AgentLoop.run() consumes queue
```

### Key Code Paths
- Channel base: `nanobot/channels/base.py:34-125`
- Bus: `nanobot/bus/queue.py:16-34`
- Agent loop: `nanobot/agent/loop.py:229`
- Manager: `nanobot/channels/manager.py:34-139` (init channels)
- Config: `nanobot/config/schema.py:1-210`
- Skills: `nanobot/agent/skills.py:26-190`

### Webhook PR Approach
- New file: `nanobot/channels/clawdentity.py`
- Extends `BaseChannel`, starts HTTP server on `127.0.0.1:18793`
- Parses webhook headers, publishes to `MessageBus.publish_inbound`
- Config: `channels.clawdentity` block in `~/.nanobot/config.json`
- Outbound `send()`: no-op (agent uses `clawdentity send` via exec)

### No Current HTTP Webhook
- WhatsApp uses WebSocket bridge with auth frame
- Slack has `webhook_path` config but uses Socket Mode at runtime
- No generic HTTP ingress exists

---

## PicoClaw (Go, sipeed/picoclaw)

### Inbound Message Flow
```
HTTP Webhook → webhookHandler() → processEvent() goroutines
  → BaseChannel.HandleMessage() → MessageBus.PublishInbound()
  → AgentLoop.Run() consumes
```

### Key Code Paths
- Channel interface: `pkg/channels/base.go:10-100`
- Bus: `pkg/bus/bus.go:24-40`
- Manager: `pkg/channels/manager.go:46-204` (init + dispatch)
- Config: `pkg/config/config.go:49-220`
- Defaults: `pkg/config/defaults.go`
- Skills: `pkg/skills/loader.go:56-210`
- LINE webhook (reference pattern): `pkg/channels/line.go:70-389`

### Webhook PR Approach
- New file: `pkg/channels/clawdentity.go`
- Implements `Channel` interface
- HTTP server on `127.0.0.1:18794`
- HMAC not needed (unlike LINE) — uses `x-clawdentity-token` match
- Config: `channels.clawdentity` in `config.json` with env var overrides

### Has HTTP Webhook Pattern
- LINE channel already has full webhook implementation
- Follow same pattern: new channel file, manager registration, config struct

---

## NanoClaw hustcc (TypeScript, hustcc/nano-claw)

### Inbound Message Flow
```
Channel SDK callback → builds ChannelMessage → emits 'message' event
  → ChannelManager forwards to MessageBus.publish()
  → GatewayServer.handleMessage() → AgentLoop.processMessage()
```

### Key Code Paths
- Channel base: `src/channels/base.ts:10-93`
- Manager: `src/channels/manager.ts:23-45`
- Bus: `src/bus/index.ts:66`
- Gateway: `src/gateway/server.ts:48-194`
- Config schema: `src/config/schema.ts:65-181`
- Skills: `src/agent/skills.ts:10-117`

### Webhook PR Approach
- New file: `src/channels/clawdentity.ts`
- Extends `BaseChannel`, starts Node HTTP server
- Emits `ChannelMessage` with `channelType: 'clawdentity'`
- Config: `channels.clawdentity` in `~/.nano-claw/config.json`
- Uses conventional commits: `feat(channels): add clawdentity webhook channel`

### No Current HTTP Webhook
- All channels use native SDKs (Telegram long polling, Discord Gateway, DingTalk Stream)
- Gateway server orchestrates but doesn't bind HTTP for inbound

---

## NanoClaw qwibitai (Claude Code, qwibitai/nanoclaw)

### Inbound Message Flow
```
Baileys messages.upsert → onMessage callback → storeMessage (SQLite)
  → Main loop polls getNewMessages() → processGroupMessages()
  → runAgent() → runContainerAgent()
```

### Key Code Paths
- WhatsApp channel: `src/channels/whatsapp.ts:147-189`
- DB: `src/db.ts:239`
- Main loop: `src/index.ts:298-430`
- Router: `src/router.ts:23-39`
- Types: `src/types.ts:44-81`
- Skills engine: `skills-engine/apply.ts:38`

### PR Approach (Skill, NOT Source Edit)
- Repo policy: features must be skills in `.claude/skills/`
- New skill: `.claude/skills/add-clawdentity-webhook/`
- Skill instructs Claude Code to add HTTP webhook channel
- When applied: starts HTTP server, writes to SQLite via existing `storeMessage`
- Branch: `skill/add-clawdentity-webhook`

### No Current HTTP Webhook
- Pure Baileys WebSocket → SQLite → polling loop
- No HTTP server runs at all
- Skill approach injects the webhook as an additional inbound path

---

## Cross-Platform Summary

All platforms share: `Channel adapter → bus/queue → agent loop → response`

None have fully pluggable channels (all need some manager/router wiring).

The Clawdentity webhook is inbound-only. Outbound always uses `clawdentity send` via the agent's exec/shell tool, guided by the SKILL.md.
