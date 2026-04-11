#!/usr/bin/env python3
"""
LinkedIn Post Script
Posts content to LinkedIn using API credentials from the OpenClaw state-dir .env.
Supports text-only and image posts.
"""

import os
import sys
import argparse
import requests
import mimetypes
from urllib.parse import quote

# Load credentials from the OpenClaw state dir.
env_file = os.path.join(
    os.path.expanduser(os.environ.get("OPENCLAW_STATE_DIR", "~/persona/.openclaw")),
    ".env",
)

def load_env():
    """Load environment variables from .env file"""
    env_vars = {}
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    env_vars[key.strip()] = value.strip()
    return env_vars

def get_headers(access_token, content_type='application/json'):
    """Get standard headers for LinkedIn API requests"""
    return {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': content_type,
        'X-Restli-Protocol-Version': '2.0.0',
        'LinkedIn-Version': '202603'
    }

def initialize_image_upload(access_token, author_urn):
    """
    Initialize image upload to get upload URL.

    Returns:
        dict with 'upload_url' and 'image_urn' on success, or 'error' on failure
    """
    url = "https://api.linkedin.com/rest/images?action=initializeUpload"

    headers = get_headers(access_token)

    payload = {
        "initializeUploadRequest": {
            "owner": author_urn
        }
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code in [200, 201]:
        data = response.json()
        value = data.get('value', {})
        return {
            'upload_url': value.get('uploadUrl'),
            'image_urn': value.get('image')
        }
    else:
        return {
            'error': f'Failed to initialize upload: {response.status_code}',
            'details': response.text
        }

def upload_image(upload_url, image_path, access_token):
    """Upload image binary to LinkedIn's upload URL"""
    mime_type, _ = mimetypes.guess_type(image_path)
    if not mime_type:
        mime_type = 'application/octet-stream'

    with open(image_path, 'rb') as f:
        response = requests.put(
            upload_url,
            data=f,
            headers={'Authorization': f'Bearer {access_token}', 'Content-Type': mime_type}
        )

    if response.status_code in [200, 201]:
        return {'success': True}
    else:
        return {
            'error': f'Failed to upload image: {response.status_code}',
            'details': response.text
        }

def create_text_post(access_token, author_urn, text):
    """Create a text-only LinkedIn post"""
    url = "https://api.linkedin.com/rest/posts"

    headers = get_headers(access_token)

    payload = {
        "author": author_urn,
        "commentary": text,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code in [200, 201]:
        return {'success': True, 'post_urn': response.headers.get('x-restli-id', 'unknown')}
    else:
        return {
            'error': f'Failed to create post: {response.status_code}',
            'details': response.text
        }

def create_image_post(access_token, author_urn, text, image_urn):
    """Create a LinkedIn post with image"""
    url = "https://api.linkedin.com/rest/posts"

    headers = get_headers(access_token)

    payload = {
        "author": author_urn,
        "commentary": text,
        "visibility": "PUBLIC",
        "distribution": {
            "feedDistribution": "MAIN_FEED",
            "targetEntities": [],
            "thirdPartyDistributionChannels": []
        },
        "content": {
            "media": {
                "title": "",
                "id": image_urn
            }
        },
        "lifecycleState": "PUBLISHED",
        "isReshareDisabledByAuthor": False
    }

    response = requests.post(url, json=payload, headers=headers)

    if response.status_code in [200, 201]:
        return {'success': True, 'post_urn': response.headers.get('x-restli-id', 'unknown')}
    else:
        return {
            'error': f'Failed to create post: {response.status_code}',
            'details': response.text
        }

def get_user_info(access_token):
    """Get LinkedIn user info to determine author URN"""
    url = "https://api.linkedin.com/v2/userinfo"
    headers = {'Authorization': f'Bearer {access_token}'}

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        return {
            'error': f'Failed to get user info: {response.status_code}',
            'details': response.text
        }

def main():
    parser = argparse.ArgumentParser(description='Post content to LinkedIn')
    parser.add_argument('content', nargs='?', help='Text content for the post')
    parser.add_argument('--file', '-f', help='Read content from file', default=None)
    parser.add_argument('--image', help='Path to image file', default=None)
    parser.add_argument('--json', action='store_true', help='Output as JSON')

    args = parser.parse_args()

    # Resolve content: --file > positional arg > stdin
    if args.file:
        with open(args.file, 'r') as f:
            args.content = f.read().strip()
    elif not args.content and not sys.stdin.isatty():
        args.content = sys.stdin.read().strip()

    if not args.content:
        parser.error("No content provided. Use positional arg, --file, or pipe to stdin.")

    env_vars = load_env()
    access_token = env_vars.get('LINKEDIN_ACCESS_TOKEN')

    if not access_token:
        result = {'error': f'LINKEDIN_ACCESS_TOKEN not found in {env_file}'}
        if args.json:
            import json
            print(json.dumps(result))
        else:
            print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)

    user_info = get_user_info(access_token)
    if 'error' in user_info:
        result = user_info
        if args.json:
            import json
            print(json.dumps(result))
        else:
            print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)

    author_urn = f"urn:li:person:{user_info.get('sub')}"

    if args.image:
        upload_info = initialize_image_upload(access_token, author_urn)
        if 'error' in upload_info:
            result = upload_info
            if args.json:
                import json
                print(json.dumps(result))
            else:
                print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)

        upload_result = upload_image(upload_info['upload_url'], args.image, access_token)
        if 'error' in upload_result:
            result = upload_result
            if args.json:
                import json
                print(json.dumps(result))
            else:
                print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)

        result = create_image_post(access_token, author_urn, args.content, upload_info['image_urn'])
    else:
        result = create_text_post(access_token, author_urn, args.content)

    if args.json:
        import json
        print(json.dumps(result))
    else:
        if result.get('success'):
            print(f"Successfully created LinkedIn post: {result.get('post_urn', 'unknown')}")
        else:
            print(f"Error: {result.get('error', 'Unknown error')}", file=sys.stderr)
            if 'details' in result:
                print(f"Details: {result['details']}", file=sys.stderr)
            sys.exit(1)

if __name__ == '__main__':
    main()
