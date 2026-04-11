#!/usr/bin/env python3
"""X API v2 posting script using OAuth 1.0a"""
import os
import sys
import json
from requests_oauthlib import OAuth1Session


def load_env():
    state_dir = os.path.expanduser(os.environ.get("OPENCLAW_STATE_DIR", "~/persona/.openclaw"))
    env_file = os.path.join(state_dir, ".env")
    if os.path.exists(env_file):
        with open(env_file) as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    os.environ[key] = value


def get_oauth():
    return OAuth1Session(
        os.environ["X_API_KEY"],
        client_secret=os.environ["X_API_KEY_SECRET"],
        resource_owner_key=os.environ["X_ACCESS_TOKEN"],
        resource_owner_secret=os.environ["X_ACCESS_TOKEN_SECRET"],
    )


def post_tweet(text, reply_to=None):
    oauth = get_oauth()
    payload = {"text": text}
    if reply_to:
        payload["reply"] = {"in_reply_to_tweet_id": reply_to}

    response = oauth.post("https://api.twitter.com/2/tweets", json=payload)

    if response.status_code == 201:
        data = response.json()
        return {"ok": True, "id": data["data"]["id"], "text": data["data"]["text"]}
    else:
        return {"ok": False, "error": response.text, "status": response.status_code}


def get_me():
    oauth = get_oauth()
    response = oauth.get("https://api.twitter.com/2/users/me")
    if response.status_code == 200:
        return response.json()
    return {"error": response.text}


if __name__ == "__main__":
    load_env()

    if len(sys.argv) < 2:
        print("Usage: x-api.py <command> [args]")
        print("Commands: me, tweet <text>, reply <tweet_id> <text>")
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "me":
        print(json.dumps(get_me(), indent=2))
    elif cmd == "tweet":
        text = sys.argv[2]
        print(json.dumps(post_tweet(text), indent=2))
    elif cmd == "reply":
        tweet_id = sys.argv[2]
        text = sys.argv[3]
        print(json.dumps(post_tweet(text, tweet_id), indent=2))
    else:
        print(f"Unknown command: {cmd}")
