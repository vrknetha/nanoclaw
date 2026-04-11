# upsk.to Ghost Agent — Fully Autonomous

## Architecture

The ghost agent runs independently with ZERO human intervention. It:
1. Generates content based on pillar rotation
2. Applies all quality rules (360Brew, brand, banned phrases)
3. Posts directly to LinkedIn via API
4. Posts to X via API
5. Logs everything for Ravi to review whenever he wants
6. Self-corrects based on the corrections memory

## Schedule

| Job | Time (IST) | What It Does |
|-----|------------|--------------|
| Content Gen + Post | Mon-Fri 8:30 AM | Generate + publish one post to LinkedIn |
| X Cross-Post | Mon-Fri 9:00 AM | Adapt the LinkedIn post for X and post |
| Video Gen + Post | Wednesday 8:00 AM | Also render and post a Remotion video |
| Weekly Report | Sunday 10 AM | Summary of what was posted, which pillars used |

## Content Generation Rules

1. MUST read brand.md, content-pillars.md, linkedin-post-guidelines.md EVERY time
2. MUST check corrections memory before drafting
3. MUST check posts/upsk/ log to avoid repeating hooks or topics within 2 weeks
4. MUST follow 360Brew checklist (zero hashtags, 900-1500 chars, save-worthy)
5. MUST include upsk.to URL naturally in every post
6. MUST vary the hook style — never use the same hook pattern twice in a row
7. For X: shorten to <280 chars or thread format, more casual tone

## Post Logging

Every post is logged to `posts/upsk/YYYY-MM-DD-linkedin.md` with:
- Status (PUBLISHED)
- Pillar used
- Hook used
- Full content
- LinkedIn URL
- Timestamp

This log prevents repeats and enables weekly reporting.

## Weekly Report (Sunday 10 AM)

The agent generates a summary:
- Posts published this week (count + pillars covered)
- Which hooks were used
- Any posting failures
- Suggested pillar rotation for next week
- Sent to Ravi via WhatsApp (brief, 5 lines max)

## Ravi's Role

- NONE required. Agent runs on autopilot.
- Ravi can occasionally post directly from LinkedIn (his own ideas)
- Ravi can review the posts/upsk/ log anytime
- Ravi can add to corrections memory if a post needs adjustment
- Agent will pick up corrections on next run

## Failsafes

- If LinkedIn API returns error → log failure, notify Ravi, skip (don't retry blindly)
- If content generation fails → post nothing, log error
- Never post more than 1 LinkedIn post per day
- Never post the same hook within 14 days
