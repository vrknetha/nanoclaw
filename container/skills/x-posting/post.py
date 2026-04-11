#!/usr/bin/env python3
"""
X/Twitter Post Script
Fetches credentials from 1Password and outputs them for browser automation.
The actual posting is done by the OpenClaw agent using the browser tool.
"""

import os
import sys
import json
import subprocess
import argparse

ENV_FILE = os.path.join(
    os.path.expanduser(os.environ.get("OPENCLAW_STATE_DIR", "~/persona/.openclaw")),
    ".env",
)


def load_env():
    """Load bootstrap env from the OpenClaw state dir."""
    if not os.path.exists(ENV_FILE):
        return
    with open(ENV_FILE, "r") as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, value = line.split("=", 1)
                os.environ.setdefault(key, value)


def get_op_credentials():
    """Fetch X credentials from 1Password"""
    try:
        token = os.environ.get("OP_SERVICE_ACCOUNT_TOKEN")
        if not token:
            return {'error': f'OP_SERVICE_ACCOUNT_TOKEN is missing; check {ENV_FILE}'}

        env = os.environ.copy()
        env['OP_SERVICE_ACCOUNT_TOKEN'] = token

        # Get username
        result = subprocess.run(
            ['op', 'item', 'get', 'Twitter', '--vault', 'OpenClaw', '--fields', 'username'],
            capture_output=True, text=True, env=env, timeout=30
        )
        if result.returncode != 0:
            return {'error': f'Failed to get username: {result.stderr}'}
        username = result.stdout.strip()

        # Get password
        result = subprocess.run(
            ['op', 'item', 'get', 'Twitter', '--vault', 'OpenClaw', '--fields', 'password', '--reveal'],
            capture_output=True, text=True, env=env, timeout=30
        )
        if result.returncode != 0:
            return {'error': f'Failed to get password: {result.stderr}'}
        password = result.stdout.strip()

        return {
            'success': True,
            'username': username,
            'password': password
        }
    except subprocess.TimeoutExpired:
        return {'error': '1Password command timed out'}
    except Exception as e:
        return {'error': str(e)}


def split_into_thread(content, max_chars=270):
    """
    Split long content into thread-friendly chunks.
    Reserves ~10 chars for [X/N] numbering.
    """
    if len(content) <= 280:
        return [content]

    # Split by paragraphs first
    paragraphs = content.split('\n\n')
    tweets = []
    current_tweet = ""

    for para in paragraphs:
        # If paragraph fits in current tweet
        if len(current_tweet) + len(para) + 2 <= max_chars:
            if current_tweet:
                current_tweet += "\n\n" + para
            else:
                current_tweet = para
        else:
            # Save current tweet if not empty
            if current_tweet:
                tweets.append(current_tweet.strip())

            # If paragraph itself is too long, split by sentences
            if len(para) > max_chars:
                sentences = para.replace('. ', '.|').split('|')
                current_tweet = ""
                for sentence in sentences:
                    if len(current_tweet) + len(sentence) + 1 <= max_chars:
                        current_tweet += (" " if current_tweet else "") + sentence
                    else:
                        if current_tweet:
                            tweets.append(current_tweet.strip())
                        current_tweet = sentence
            else:
                current_tweet = para

    if current_tweet:
        tweets.append(current_tweet.strip())

    # Add thread numbering
    total = len(tweets)
    if total > 1:
        tweets[0] = f"🧵 [1/{total}] {tweets[0]}"
        for i in range(1, total):
            tweets[i] = f"[{i+1}/{total}] {tweets[i]}"

    return tweets


def main():
    load_env()

    parser = argparse.ArgumentParser(description='X/Twitter credentials and posting helper')
    parser.add_argument('action', choices=['credentials', 'validate', 'thread'], 
                        help='Action: credentials (fetch from 1Password), validate (check content), thread (split into thread)')
    parser.add_argument('--content', help='Tweet content to validate/split', default=None)
    parser.add_argument('--json', action='store_true', help='Output as JSON')

    args = parser.parse_args()

    if args.action == 'credentials':
        result = get_op_credentials()

        if args.json:
            print(json.dumps(result))
        elif 'error' in result:
            print(f"❌ Error: {result['error']}", file=sys.stderr)
            sys.exit(1)
        else:
            print(f"✅ Credentials fetched successfully")
            print(f"Username: {result['username']}")
            print(f"Password: {'*' * len(result['password'])}")
            # Output for use in shell
            print("\n# Export for use:")
            print(f"export X_USERNAME='{result['username']}'")
            print(f"export X_PASSWORD='{result['password']}'")

    elif args.action == 'validate':
        if not args.content:
            print("❌ Error: --content required for validate action", file=sys.stderr)
            sys.exit(1)

        content = args.content
        char_count = len(content)
        needs_thread = char_count > 280

        result = {
            'valid': True,  # Always valid, might need thread
            'char_count': char_count,
            'max_chars': 280,
            'needs_thread': needs_thread,
            'thread_count': len(split_into_thread(content)) if needs_thread else 1
        }

        if args.json:
            print(json.dumps(result))
        else:
            if not needs_thread:
                print(f"✅ Valid single tweet ({char_count}/280 characters)")
            else:
                thread = split_into_thread(content)
                print(f"🧵 Needs thread: {len(thread)} tweets ({char_count} total chars)")
                print(f"\nUse 'thread' action to see the split.")

    elif args.action == 'thread':
        if not args.content:
            print("❌ Error: --content required for thread action", file=sys.stderr)
            sys.exit(1)

        tweets = split_into_thread(args.content)

        result = {
            'thread_count': len(tweets),
            'tweets': tweets
        }

        if args.json:
            print(json.dumps(result))
        else:
            print(f"🧵 Thread ({len(tweets)} tweets):\n")
            for i, tweet in enumerate(tweets):
                print(f"--- Tweet {i+1} ({len(tweet)} chars) ---")
                print(tweet)
                print()

if __name__ == "__main__":
    main()
