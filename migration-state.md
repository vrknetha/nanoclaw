# Migration State

## Progress
- [x] Phase 0: Discovery
- [x] Phase 1: Groups and Architecture
- [x] Phase 2: Settings from Config
- [x] Phase 3: Identity and Memory
- [x] Phase 4: Channel Credentials
- [x] Phase 5: Scheduled Tasks (deferred — need working container)
- [x] Phase 6: Webhooks, MCP, Other Config
- [x] Phase 7: Summary

## Discovery
- STATE_DIR: /Users/ravikiranvemula/persona/openclaw
- CONFIG: config/openclaw.json
- IDENTITY_NAME: Kai -> NanoKai
- Channels: whatsapp, telegram (coder bot), slack, discord (disabled)
- Agents: 2 (main=Kai, sobthi=Sobthi)
- Cron jobs: 9

## Decisions
- assistant_name: NanoKai
- group_model: just main group for now
- main_group: telegram_kai-dev, jid=tg_-1003687469956
- New Telegram bot token (separate from OpenClaw's coder bot)

## Registered Groups
| folder | jid | channel | is_main |
|--------|-----|---------|---------|
| telegram_kai-dev | tg_-1003687469956 | telegram | yes |

## Settings Migrated
- TZ=Asia/Kolkata in .env
- ASSISTANT_NAME=NanoKai in .env
- TELEGRAM_BOT_TOKEN in .env (new bot, not OpenClaw's)
- Sender allowlist: ~/.config/nanoclaw/sender-allowlist.json (5759865942 for tg group)

## Identity & Memory
- groups/global/CLAUDE.md — updated with NanoKai personality
- groups/telegram_kai-dev/CLAUDE.md — updated with file references
- groups/telegram_kai-dev/soul.md — from SOUL.md
- groups/telegram_kai-dev/user-context.md — from USER.md
- groups/telegram_kai-dev/memories.md — durable facts from memory.md
- groups/telegram_kai-dev/daily-memories/ — 95 files copied

## Channel Credentials
| channel | status | env_var |
|---------|--------|---------|
| telegram | new bot token saved | TELEGRAM_BOT_TOKEN |
| whatsapp | skipped (OpenClaw still running) | — |
| slack | skipped (not in plan) | — |

## Scheduled Tasks
All 9 deferred — need working container first:
- Sync Persona to GitHub (every 12h)
- CV Screening (2 AM)
- Nightly Memory Reflection (11 PM)
- Interesting Things - Daily Research Post (8:30 AM)
- Lead Maintenance Controller
- Knowledge Maintenance Controller
- X Draft Controller
- X Engagement Controller
- LinkedIn Engagement Controller

## Deferred / Not Applicable
- Sobthi agent: separate workspace, not migrated
- WhatsApp channel: OpenClaw still running it
- Slack channel: not in plan
- Discord: was disabled
- Plugins (lossless-claw, lobster, llm-task): OpenClaw-specific
- Hooks (mission-control, git-sync, session-memory, auto-corrections): OpenClaw-specific
- Exec approvals, human delay, TTS, compaction, context pruning: handled differently in NanoClaw
- OpenClaw skills (38): not copied — most are content/social automation, will revisit when needed
