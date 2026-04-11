---
name: x-api-posting
description: Post tweets and replies to X (Twitter) using the official API. Use when publishing tweets, replying to tweets, quote tweeting, or deleting tweets via API. Prefer this over browser automation for posting. Triggers for "tweet this", "post to X", "reply on X", "post to Twitter", or any programmatic X/Twitter posting task.
---

# X API Posting Skill

Post tweets and replies to X (Twitter) using the official API. Use this for posting content; use browser automation for search.

## When to Use
- Posting original tweets
- Replying to tweets (need tweet ID)
- Quote tweeting
- Deleting tweets

## Setup Required

### 1. Create X Developer App
1. Go to https://developer.x.com/en/portal/dashboard
2. Create a new Project and App
3. Enable OAuth 2.0 (User authentication settings)
4. Set callback URL: `http://localhost:3000/callback`
5. Request scopes: `tweet.read`, `tweet.write`, `users.read`, `offline.access`

### 2. Get Credentials
From App's "Keys and Tokens" page:
- Client ID
- Client Secret

### 3. Run OAuth Flow
```bash
# First time setup - get access token
python3 /Users/ravikiranvemula/persona/openclaw/skills/x-api-posting/scripts/oauth_setup.py
```

This opens a browser, you authorize, and it saves tokens to env.

### 4. Store Credentials
Env vars stored in `~/persona/.openclaw/.env` (same as `$OPENCLAW_STATE_DIR/.env` here):
```
X_CLIENT_ID=your_client_id
X_CLIENT_SECRET=your_client_secret
X_ACCESS_TOKEN=your_access_token
X_REFRESH_TOKEN=your_refresh_token
```

## Usage

### Post a Tweet
```bash
python3 /Users/ravikiranvemula/persona/openclaw/skills/x-api-posting/scripts/post.py --text "Hello from API!"
```

### Reply to a Tweet
```bash
python3 /Users/ravikiranvemula/persona/openclaw/skills/x-api-posting/scripts/post.py --text "Great point!" --reply-to 1234567890
```

### Quote Tweet
```bash
python3 /Users/ravikiranvemula/persona/openclaw/skills/x-api-posting/scripts/post.py --text "This is interesting" --quote 1234567890
```

### Delete a Tweet
```bash
python3 /Users/ravikiranvemula/persona/openclaw/skills/x-api-posting/scripts/delete.py --tweet-id 1234567890
```

## API Limits (Free Tier)
- 500 posts per month
- 100 reads per month (don't use for search)

## Extracting Tweet ID from URL
Tweet URL format: `https://x.com/username/status/TWEET_ID`
Example: `https://x.com/MarioNawfal/status/2017462852878274842` → ID is `2017462852878274842`

## Workflow: Browser Search + API Post

1. **Search via browser** (finds opportunities):
```
browser action=navigate targetUrl="https://x.com/search?q=AI%20agents"
browser action=snapshot
```

2. **Extract tweet ID** from URL in snapshot

3. **Post reply via API**:
```bash
python3 /path/to/post.py --text "Your reply here" --reply-to TWEET_ID
```

## Content Rules
- Before posting or replying, check banned phrases in `skills/linkedin-comment-replies/references/banned-phrases.md`
- All rules apply equally to X: no AI slop, no abstraction soup, no fake sage tone
- X is even less tolerant of AI-sounding replies than LinkedIn. Keep it tight and human.

## Error Handling
- Token expired → Script auto-refreshes using refresh token
- Rate limited → Wait and retry, check monthly quota
- 403 error → Check scopes, may need to reauthorize

## Files
- `scripts/oauth_setup.py` — One-time OAuth flow
- `scripts/post.py` — Post/reply/quote tweets
- `scripts/delete.py` — Delete tweets
- `scripts/refresh_token.py` — Manually refresh access token
