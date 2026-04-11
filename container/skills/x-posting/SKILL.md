---
name: x-posting
description: Post content to X/Twitter using browser automation with 1Password credentials
homepage: https://x.com
---

# X/Twitter Posting Skill

Post content to X/Twitter using browser automation. Credentials stored in 1Password.

> ⚠️ **Always use browser automation** — never use bird CLI for posting/replying. Bird CLI gets rate-limited with "automated activity" detection. Browser is slower but reliable.

## Tweet Formatting Guidelines

### Single Tweet (≤280 chars)
- Hook in first line
- Use line breaks for readability
- Hashtags at end (2-3 max)
- Include link if relevant

### Thread Format (>280 chars)
When content exceeds 280 characters, split into a thread:

```
🧵 [1/N] Hook - the most compelling part

[2/N] Supporting detail or context

[3/N] Key insight or data point

[N/N] Call to action + hashtags
```

**Thread Rules:**
- First tweet must hook (standalone value)
- Each tweet ≤280 chars
- Number tweets [1/N] format
- Last tweet has hashtags + CTA
- Use 🧵 emoji to signal thread

## Requirements

- **Python 3** - Required to run the helper script
- **1Password CLI (op)** - For fetching credentials
- **OpenClaw Browser** - Default browser target uses the OpenClaw-managed browser profile for stable automation

## Credentials

Stored in 1Password vault `Clawdbot`:
- **Item:** `Twitter`
- **Username:** 007ravirocks@gmail.com  
- **Account:** @ravikiran_16

1Password service-account bootstrap token lives in `~/persona/.openclaw/.env` as `OP_SERVICE_ACCOUNT_TOKEN`.

## Usage

### Fetch Credentials
```bash
python3 /Users/ravikiranvemula/persona/openclaw/skills/x-posting/post.py credentials
```

### Validate Tweet Length
```bash
python3 /Users/ravikiranvemula/persona/openclaw/skills/x-posting/post.py validate --content "Your tweet here"
```

### Post a Thread (Multiple Tweets)

For content >280 chars, post as a thread:

1. **Start browser and open compose**
2. **Post first tweet** (with 🧵 and [1/N])
3. **Click "Add another post"** button in the compose area
4. **Type next tweet** [2/N]
5. **Repeat** until all tweets added
6. **Click "Post all"**

### Post via Browser (Required)

1. **Start browser:**
   ```
   browser action=start
   ```

2. **Open compose:**
   ```
   browser action=open targetUrl="https://x.com/compose/post"
   ```

3. **Take snapshot** to find the textbox ref

4. **Type content:**
   ```
   browser action=act request={"kind": "type", "ref": "<textbox_ref>", "text": "Your tweet"}
   ```

5. **Click Post button**

6. **Verify success** — look for "Your post was sent" alert with URL

### Reply to a Tweet via Browser

1. **Start browser** (if not running):
   ```
   browser action=start
   ```

2. **Navigate to the tweet:**
   ```
   browser action=open targetUrl="https://x.com/username/status/123456789"
   ```

3. **Take snapshot** — find the reply textbox (usually "Post text" textbox)

4. **Click textbox**, then **type reply**:
   ```
   browser action=act request={"kind": "click", "ref": "<textbox_ref>"}
   browser action=act request={"kind": "type", "ref": "<textbox_ref>", "text": "Your reply"}
   ```

5. **Take snapshot** — find Reply button (should now be enabled)

6. **Click Reply button**

7. **Verify success** — snapshot shows "Your post was sent" alert with URL

## If Login Required

If the browser session expired:

1. Fetch credentials:
   ```bash
   python3 /Users/ravikiranvemula/persona/openclaw/skills/x-posting/post.py credentials --json
   ```

2. Navigate to login page
3. Enter username, click Next
4. Enter password, click Login
5. Proceed with posting

## Output

Credentials command:
```
✅ Credentials fetched successfully
Username: 007ravirocks@gmail.com
Password: ********
```

Validate command:
```
✅ Valid tweet (142/280 characters)
```

## Integration with Cron Jobs

Example cron job for daily X posts:

```json
{
  "name": "X Post - Daily",
  "schedule": {"kind": "cron", "expr": "0 10 * * *", "tz": "Asia/Kolkata"},
  "sessionTarget": "main",
  "payload": {
    "kind": "agentTurn",
    "message": "🐦 X POST (10:00 AM IST)\n\nPost to X using the x-posting skill: skills/x-posting/SKILL.md\n\nPost content:\n[Your tweet content here]\n\nDo:\n1) Read the skill doc\n2) Start the OpenClaw-managed browser profile\n3) Post the tweet\n4) Capture result URL\n5) Notify Ravi on WhatsApp\n\nOutput:\n- Success: \"✅ X POST PUBLISHED - [time IST]\" + URL\n- Failure: \"❌ X POST FAILED - [time IST]\" + error",
    "deliver": true,
    "provider": "whatsapp",
    "to": "+919550205474"
  }
}
```

## Post File Format

Posts stored in `/Users/ravikiranvemula/persona/openclaw/posts/YYYY-MM-DD-x.md`:

```markdown
# X Post — January 11, 2026

**Status:** 📝 READY
**Platform:** X/Twitter
**Account:** @ravikiran_16

---

## Tweet Content

The pattern that let Codex work 7+ hours autonomously: PLANS.md

📖 Full guide: cookbook.openai.com/articles/codex_exec_plans

#AICoding #Codex
```

After posting:
```markdown
**Status:** ✅ PUBLISHED
**URL:** https://x.com/ravikiran_16/status/XXXXXXXXX
**Posted:** 2026-01-11 10:00 IST
```

## Troubleshooting

- **"Not logged in"**: Browser session expired. Use credentials from 1Password to re-login.
- **"Rate limited"**: Wait before posting again (15 min)
- **"1Password error"**: Check `OP_SERVICE_ACCOUNT_TOKEN` in `~/persona/.openclaw/.env`
- **"Tweet too long"**: Use validate command to check character count

## Ravi's Setup (For Replies)

When discussing setup in replies:
- **Correct:** MacBook Pro M1
- **Wrong:** Mac Mini (he doesn't have one)
- **Access:** Via Tailscale, never public internet
- **Running since:** November 2025

## Notes

- X doesn't have a free API for posting (requires $100/month API access)
- We use browser automation with the default OpenClaw-managed browser profile
- The browser maintains persistent login across sessions
- Max 280 characters for regular accounts (25,000 for X Premium)
