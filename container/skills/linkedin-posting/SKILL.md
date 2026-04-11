---
name: linkedin-posting
description: Post content to LinkedIn using API credentials stored in `~/persona/.openclaw/.env` (the active OpenClaw state-dir env file). Use when scheduling or publishing LinkedIn posts, posting from draft files, posting with images, or when a cron job needs to publish content. Triggers for "post to LinkedIn", "publish on LinkedIn", "schedule LinkedIn post", or any task that needs to programmatically publish text or image content to LinkedIn via the API.
homepage: https://www.linkedin.com
---

# LinkedIn Posting Skill

Post content to LinkedIn using API credentials stored in `~/persona/.openclaw/.env` (same as `$OPENCLAW_STATE_DIR/.env` on this machine).

## Requirements

- **Python 3** - Required to run the post script
- **requests** - Python HTTP library (`pip install requests`)
- **LinkedIn API credentials** - Stored in `~/persona/.openclaw/.env`

## Credentials (already configured)

OpenClaw runtime/channel/model secrets are in 1Password, but this skill still reads LinkedIn OAuth values from the state-dir `.env` file.


The following credentials must be present in `~/persona/.openclaw/.env`:

```bash
LINKEDIN_ACCESS_TOKEN=your_access_token
LINKEDIN_AUTHOR_URN=urn:li:person:XXXXXXXXX
LINKEDIN_CLIENT_ID=your_client_id
LINKEDIN_CLIENT_SECRET=your_client_secret
```

These credentials are already configured in Ravi's environment.

## Usage

### Post from File (Recommended for long/formatted posts)
```bash
python3 /Users/ravikiranvemula/persona/openclaw/skills/linkedin-posting/post.py --file /path/to/post.txt
```

### Basic Post (Short content only)
```bash
python3 /Users/ravikiranvemula/persona/openclaw/skills/linkedin-posting/post.py "Your post content here"
```

### Post with Image
```bash
python3 /Users/ravikiranvemula/persona/openclaw/skills/linkedin-posting/post.py --file /path/to/post.txt --image /path/to/image.jpg
```

### Post from Stdin
```bash
cat post.txt | python3 /Users/ravikiranvemula/persona/openclaw/skills/linkedin-posting/post.py
```

### Options
- `--file`, `-f`: Read content from file (recommended for formatted posts with bullets, arrows, etc.)
- `--image`, `-i`: Path to image file (jpg, png, gif supported)
- `--visibility`, `-v`: PUBLIC (default) or CONNECTIONS

**Note:** For posts with special characters (→, bullets, newlines), always use `--file` instead of command line arguments to avoid truncation.

## Output

On success, the script outputs:
```
✅ Post published successfully!
URN: urn:li:share:XXXXXXXXX
URL: https://www.linkedin.com/feed/update/urn:li:share:XXXXXXXXX/
ID: XXXXXXXXX
JSON:{'success': True, 'urn': 'urn:li:share:XXXXXXXXX', 'url': 'https://...', 'id': 'XXXXXXXXX'}
```

On error, it outputs:
```
❌ Error: Missing required credential: LINKEDIN_ACCESS_TOKEN
```

## Integration with Cron Jobs

The cron job should execute the script and capture the output:

```json
{
  "action": "cron-add",
  "job": {
    "name": "LinkedIn Post",
    "schedule": {"expr": "0 30 9 * * *"},
    "sessionTarget": "isolated",
    "payload": {
      "kind": "bash",
      "command": "python3 /Users/ravikiranvemula/persona/openclaw/skills/linkedin-posting/post.py \"First 20 hours with Claude Code...\"",
      "captureOutput": true
    }
  }
}
```

## Workflow

When a LinkedIn post is scheduled:

1. Read post content from the post markdown file
2. Execute the `post.py` script with the content
3. Parse the output to extract URN and URL
4. Update the post markdown file with URN and URL
5. Notify Ravi via WhatsApp with the result

## Post File Format

Posts are stored in `/Users/ravikiranvemula/persona/openclaw/posts/YYYY-MM-DD-linkedin.md`:

```markdown
# LinkedIn Post — January 10, 2026

**Status:** 📝 READY
**Published:** YYYY-MM-DD HH:MM IST
**Platform:** LinkedIn

---

## Post Content

First 20 hours with Claude Code taught me 3 lessons...

#AICoding #ClaudeCode #LessonsLearned
```

After posting, update:
```markdown
**Status:** ✅ PUBLISHED
**URN:** urn:li:share:XXXXXXXXX
**URL:** https://www.linkedin.com/feed/update/urn:li:share:XXXXXXXXX/
```

## Troubleshooting

- **"Missing required credential"**: Check `~/persona/.openclaw/.env` for LinkedIn credentials
- **"API Error: 401"**: Access token expired - need to refresh via OAuth flow
- **"API Error: 403"**: Invalid URN or permissions issue
- **"API Error: 429"**: Rate limited - wait before posting again

## Refreshing Credentials

If the access token expires (typically 60 days), use the OAuth flow:

1. Get new client_id and client_secret from LinkedIn Developer Portal
2. Run OAuth flow to get new access_token and author_urn
3. Update `~/persona/.openclaw/.env` with new values
