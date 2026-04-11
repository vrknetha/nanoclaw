#!/usr/bin/env python3
"""
Post tweets and replies to X via API.

Usage:
  python3 post.py --text "Hello world!"
  python3 post.py --text "Great point!" --reply-to 1234567890
  python3 post.py --text "Check this out" --quote 1234567890
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
import base64
from pathlib import Path

ENV_FILE = Path.home() / ".openclaw" / ".env"

def load_env():
    """Load environment variables from .env file."""
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    os.environ.setdefault(key, value)

def refresh_access_token():
    """Refresh the access token using refresh token."""
    client_id = os.environ.get("X_CLIENT_ID")
    client_secret = os.environ.get("X_CLIENT_SECRET")
    refresh_token = os.environ.get("X_REFRESH_TOKEN")
    
    if not all([client_id, client_secret, refresh_token]):
        return None
    
    credentials = f"{client_id}:{client_secret}"
    basic_auth = base64.b64encode(credentials.encode()).decode()
    
    data = urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id
    }).encode()
    
    req = urllib.request.Request(
        "https://api.x.com/2/oauth2/token",
        data=data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {basic_auth}"
        }
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            tokens = json.loads(response.read().decode())
            
            # Update env file
            update_env_token(tokens["access_token"], tokens.get("refresh_token"))
            os.environ["X_ACCESS_TOKEN"] = tokens["access_token"]
            if tokens.get("refresh_token"):
                os.environ["X_REFRESH_TOKEN"] = tokens["refresh_token"]
            
            return tokens["access_token"]
    except Exception as e:
        print(f"Token refresh failed: {e}", file=sys.stderr)
        return None

def update_env_token(access_token, refresh_token=None):
    """Update tokens in .env file."""
    lines = []
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            lines = f.readlines()
    
    new_lines = []
    found_access = False
    found_refresh = False
    
    for line in lines:
        if line.startswith("X_ACCESS_TOKEN="):
            new_lines.append(f"X_ACCESS_TOKEN={access_token}\n")
            found_access = True
        elif line.startswith("X_REFRESH_TOKEN=") and refresh_token:
            new_lines.append(f"X_REFRESH_TOKEN={refresh_token}\n")
            found_refresh = True
        else:
            new_lines.append(line)
    
    if not found_access:
        new_lines.append(f"X_ACCESS_TOKEN={access_token}\n")
    if refresh_token and not found_refresh:
        new_lines.append(f"X_REFRESH_TOKEN={refresh_token}\n")
    
    with open(ENV_FILE, "w") as f:
        f.writelines(new_lines)

def post_tweet(text, reply_to=None, quote_tweet_id=None):
    """Post a tweet or reply."""
    access_token = os.environ.get("X_ACCESS_TOKEN")
    
    if not access_token:
        print("Error: X_ACCESS_TOKEN not found. Run oauth_setup.py first.", file=sys.stderr)
        return None
    
    # Build request body
    body = {"text": text}
    
    if reply_to:
        body["reply"] = {"in_reply_to_tweet_id": str(reply_to)}
    
    if quote_tweet_id:
        body["quote_tweet_id"] = str(quote_tweet_id)
    
    def make_request(token):
        req = urllib.request.Request(
            "https://api.x.com/2/tweets",
            data=json.dumps(body).encode(),
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            },
            method="POST"
        )
        return req
    
    try:
        req = make_request(access_token)
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result
    except urllib.error.HTTPError as e:
        if e.code == 401:
            # Try refreshing token
            print("Token expired, refreshing...", file=sys.stderr)
            new_token = refresh_access_token()
            if new_token:
                try:
                    req = make_request(new_token)
                    with urllib.request.urlopen(req) as response:
                        result = json.loads(response.read().decode())
                        return result
                except urllib.error.HTTPError as e2:
                    error_body = e2.read().decode() if e2.fp else ""
                    print(f"Error after refresh: {e2.code} - {error_body}", file=sys.stderr)
                    return None
            else:
                print("Token refresh failed. Run oauth_setup.py again.", file=sys.stderr)
                return None
        else:
            error_body = e.read().decode() if e.fp else ""
            print(f"Error: {e.code} - {error_body}", file=sys.stderr)
            return None
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return None

def extract_tweet_id(url_or_id):
    """Extract tweet ID from URL or return as-is if already an ID."""
    if url_or_id.startswith("http"):
        # Extract from URL like https://x.com/user/status/1234567890
        parts = url_or_id.rstrip("/").split("/")
        for i, part in enumerate(parts):
            if part == "status" and i + 1 < len(parts):
                return parts[i + 1].split("?")[0]
    return url_or_id

def main():
    parser = argparse.ArgumentParser(description="Post to X via API")
    parser.add_argument("--text", "-t", required=True, help="Tweet text")
    parser.add_argument("--reply-to", "-r", help="Tweet ID or URL to reply to")
    parser.add_argument("--quote", "-q", help="Tweet ID or URL to quote")
    args = parser.parse_args()
    
    load_env()
    
    reply_to = extract_tweet_id(args.reply_to) if args.reply_to else None
    quote_id = extract_tweet_id(args.quote) if args.quote else None
    
    result = post_tweet(args.text, reply_to=reply_to, quote_tweet_id=quote_id)
    
    if result:
        tweet_id = result.get("data", {}).get("id")
        print(json.dumps(result, indent=2))
        if tweet_id:
            # Try to get username from env or default
            print(f"\n✅ Posted: https://x.com/i/status/{tweet_id}")
        return 0
    else:
        return 1

if __name__ == "__main__":
    import urllib.parse
    exit(main())
