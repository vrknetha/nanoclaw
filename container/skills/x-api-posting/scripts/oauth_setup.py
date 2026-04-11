#!/usr/bin/env python3
"""
X API OAuth 2.0 Setup Script
Run this once to get access tokens for posting.
"""

import http.server
import urllib.parse
import webbrowser
import base64
import secrets
import hashlib
import json
import os
from pathlib import Path

# Configuration
REDIRECT_URI = "http://localhost:3000/callback"
SCOPES = "tweet.read tweet.write users.read offline.access"
ENV_FILE = Path.home() / ".openclaw" / ".env"

def get_client_credentials():
    """Get client ID and secret from user or env."""
    client_id = os.environ.get("X_CLIENT_ID")
    client_secret = os.environ.get("X_CLIENT_SECRET")
    
    if not client_id:
        print("\n📱 X API Setup")
        print("=" * 40)
        print("Get these from: https://developer.x.com/en/portal/dashboard")
        print("Go to your App → Keys and Tokens\n")
        client_id = input("Client ID: ").strip()
    
    if not client_secret:
        client_secret = input("Client Secret: ").strip()
    
    return client_id, client_secret

def generate_pkce():
    """Generate PKCE code verifier and challenge."""
    code_verifier = secrets.token_urlsafe(32)
    code_challenge = base64.urlsafe_b64encode(
        hashlib.sha256(code_verifier.encode()).digest()
    ).decode().rstrip("=")
    return code_verifier, code_challenge

def build_auth_url(client_id, code_challenge, state):
    """Build the authorization URL."""
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "scope": SCOPES,
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256"
    }
    return f"https://x.com/i/oauth2/authorize?{urllib.parse.urlencode(params)}"

def exchange_code_for_token(code, client_id, client_secret, code_verifier):
    """Exchange authorization code for access token."""
    import urllib.request
    
    # Build basic auth header
    credentials = f"{client_id}:{client_secret}"
    basic_auth = base64.b64encode(credentials.encode()).decode()
    
    data = urllib.parse.urlencode({
        "code": code,
        "grant_type": "authorization_code",
        "client_id": client_id,
        "redirect_uri": REDIRECT_URI,
        "code_verifier": code_verifier
    }).encode()
    
    req = urllib.request.Request(
        "https://api.x.com/2/oauth2/token",
        data=data,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": f"Basic {basic_auth}"
        }
    )
    
    with urllib.request.urlopen(req) as response:
        return json.loads(response.read().decode())

def save_to_env(client_id, client_secret, tokens):
    """Save credentials to .env file."""
    env_vars = {
        "X_CLIENT_ID": client_id,
        "X_CLIENT_SECRET": client_secret,
        "X_ACCESS_TOKEN": tokens["access_token"],
        "X_REFRESH_TOKEN": tokens.get("refresh_token", "")
    }
    
    # Read existing env file
    existing = {}
    if ENV_FILE.exists():
        with open(ENV_FILE) as f:
            for line in f:
                line = line.strip()
                if "=" in line and not line.startswith("#"):
                    key, value = line.split("=", 1)
                    existing[key] = value
    
    # Update with new values
    existing.update(env_vars)
    
    # Write back
    ENV_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(ENV_FILE, "w") as f:
        for key, value in existing.items():
            f.write(f"{key}={value}\n")
    
    print(f"\n✅ Credentials saved to {ENV_FILE}")

class CallbackHandler(http.server.BaseHTTPRequestHandler):
    """Handle OAuth callback."""
    
    code = None
    state = None
    
    def do_GET(self):
        query = urllib.parse.urlparse(self.path).query
        params = urllib.parse.parse_qs(query)
        
        CallbackHandler.code = params.get("code", [None])[0]
        CallbackHandler.state = params.get("state", [None])[0]
        
        self.send_response(200)
        self.send_header("Content-type", "text/html")
        self.end_headers()
        
        if CallbackHandler.code:
            self.wfile.write(b"<h1>Authorization successful!</h1><p>You can close this window.</p>")
        else:
            error = params.get("error", ["Unknown"])[0]
            self.wfile.write(f"<h1>Authorization failed</h1><p>Error: {error}</p>".encode())
    
    def log_message(self, format, *args):
        pass  # Suppress logging

def main():
    client_id, client_secret = get_client_credentials()
    
    # Generate PKCE
    code_verifier, code_challenge = generate_pkce()
    state = secrets.token_urlsafe(16)
    
    # Build auth URL
    auth_url = build_auth_url(client_id, code_challenge, state)
    
    print(f"\n🌐 Opening browser for authorization...")
    print(f"If it doesn't open, visit:\n{auth_url}\n")
    webbrowser.open(auth_url)
    
    # Start local server to catch callback
    print("⏳ Waiting for authorization...")
    server = http.server.HTTPServer(("localhost", 3000), CallbackHandler)
    server.handle_request()
    
    if not CallbackHandler.code:
        print("❌ Authorization failed or was cancelled")
        return 1
    
    if CallbackHandler.state != state:
        print("❌ State mismatch - possible CSRF attack")
        return 1
    
    print("🔄 Exchanging code for tokens...")
    
    try:
        tokens = exchange_code_for_token(
            CallbackHandler.code,
            client_id,
            client_secret,
            code_verifier
        )
    except Exception as e:
        print(f"❌ Token exchange failed: {e}")
        return 1
    
    save_to_env(client_id, client_secret, tokens)
    
    print("\n🎉 Setup complete! You can now post to X via API.")
    print("\nTest it:")
    print('  python3 scripts/post.py --text "Hello from API!"')
    
    return 0

if __name__ == "__main__":
    exit(main())
