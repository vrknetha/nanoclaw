#!/bin/bash
# draft-email.sh - Create Gmail draft for executive outreach
# Usage: ./draft-email.sh <to_email> <subject> <body_file>
#
# Example:
#   ./draft-email.sh alan.gao@foodsmart.com "Found a match — Ravi Kiran for Director of Engineering" /tmp/email.txt

set -e

TO_EMAIL="$1"
SUBJECT="$2"
BODY_FILE="$3"
ACCOUNT="vrknetha@gmail.com"

if [ -z "$TO_EMAIL" ] || [ -z "$SUBJECT" ] || [ -z "$BODY_FILE" ]; then
    echo "Usage: $0 <to_email> <subject> <body_file>"
    exit 1
fi

if [ ! -f "$BODY_FILE" ]; then
    echo "Error: Body file not found: $BODY_FILE"
    exit 1
fi

echo "Creating draft..."
echo "  To: $TO_EMAIL"
echo "  Subject: $SUBJECT"
echo "  Body: $BODY_FILE"
echo ""

RESULT=$(gog gmail drafts create \
    --to "$TO_EMAIL" \
    --subject "$SUBJECT" \
    --account "$ACCOUNT" \
    --json \
    --body-file "$BODY_FILE")

DRAFT_ID=$(echo "$RESULT" | jq -r '.draftId')

if [ "$DRAFT_ID" != "null" ] && [ -n "$DRAFT_ID" ]; then
    echo "✓ Draft created: $DRAFT_ID"
    echo "$DRAFT_ID"
else
    echo "Error creating draft:"
    echo "$RESULT"
    exit 1
fi
