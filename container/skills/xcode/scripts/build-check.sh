#!/bin/bash
# Quick build verification for Xcode projects
# Usage: build-check.sh [project-dir] [scheme] [destination]
#
# Defaults:
#   project-dir: current directory
#   scheme: auto-detected from -list
#   destination: 'platform=iOS Simulator,name=iPhone 16 Pro'

set -euo pipefail

PROJECT_DIR="${1:-.}"
SCHEME="${2:-}"
DESTINATION="${3:-platform=iOS Simulator,name=iPhone 16 Pro}"

cd "$PROJECT_DIR"

# Detect project or workspace
if ls *.xcworkspace 1>/dev/null 2>&1; then
    PROJECT_FLAG="-workspace $(ls *.xcworkspace | head -1)"
elif ls *.xcodeproj 1>/dev/null 2>&1; then
    PROJECT_FLAG="-project $(ls *.xcodeproj | head -1)"
else
    echo "ERROR: No .xcodeproj or .xcworkspace found in $PROJECT_DIR"
    exit 1
fi

# Auto-detect scheme if not provided
if [ -z "$SCHEME" ]; then
    SCHEME=$(xcodebuild $PROJECT_FLAG -list 2>/dev/null | awk '/Schemes:/{found=1; next} found && /^[[:space:]]+/{print; next} found{exit}' | head -1 | xargs)
    if [ -z "$SCHEME" ]; then
        echo "ERROR: Could not auto-detect scheme"
        exit 1
    fi
    echo "Auto-detected scheme: $SCHEME"
fi

echo "Building: $PROJECT_FLAG -scheme $SCHEME"
echo "Destination: $DESTINATION"
echo "---"

xcodebuild build \
    $PROJECT_FLAG \
    -scheme "$SCHEME" \
    -destination "$DESTINATION" \
    -configuration Debug \
    CODE_SIGNING_ALLOWED=NO \
    2>&1 | tail -30

BUILD_RESULT=${PIPESTATUS[0]}

if [ $BUILD_RESULT -eq 0 ]; then
    echo ""
    echo "✅ BUILD SUCCEEDED"
else
    echo ""
    echo "❌ BUILD FAILED (exit code: $BUILD_RESULT)"
fi

exit $BUILD_RESULT
