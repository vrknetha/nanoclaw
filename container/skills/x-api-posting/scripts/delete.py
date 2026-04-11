#!/usr/bin/env python3
"""
Delete a tweet via X API.

Usage:
  python3 delete.py --tweet-id 1234567890
  python3 delete.py --tweet-id https://x.com/user/status/1234567890
"""

import argparse
import json
import os
import sys
import urllib.request
import urllib.error
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

def extract_tweet_id(url_or_id):
    """Extract tweet ID from URL or return as-is if already an ID."""
    if url_or_id.startswith("http"):
        parts = url_or_id.rstrip("/").split("/")
        for i, part in enumerate(parts):
            if part == "status" and i + 1 < len(parts):
                return parts[i + 1].split("?")[0]
    return url_or_id

def delete_tweet(tweet_id):
    """Delete a tweet."""
    access_token = os.environ.get("X_ACCESS_TOKEN")
    
    if not access_token:
        print("Error: X_ACCESS_TOKEN not found. Run oauth_setup.py first.", file=sys.stderr)
        return False
    
    req = urllib.request.Request(
        f"https://api.x.com/2/tweets/{tweet_id}",
        headers={"Authorization": f"Bearer {access_token}"},
        method="DELETE"
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            return result.get("data", {}).get("deleted", False)
    except urllib.error.HTTPError as e:
        error_body = e.read().decode() if e.fp else ""
        print(f"Error: {e.code} - {error_body}", file=sys.stderr)
        return False

def main():
    parser = argparse.ArgumentParser(description="Delete a tweet via API")
    parser.add_argument("--tweet-id", "-i", required=True, help="Tweet ID or URL to delete")
    args = parser.parse_args()
    
    load_env()
    
    tweet_id = extract_tweet_id(args.tweet_id)
    
    if delete_tweet(tweet_id):
        print(f"✅ Deleted tweet {tweet_id}")
        return 0
    else:
        print(f"❌ Failed to delete tweet {tweet_id}")
        return 1

if __name__ == "__main__":
    exit(main())
