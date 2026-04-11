#!/bin/bash
#
# Validation script for Manim + Remotion video projects
# Run from the video project directory
#
# Usage: bash validate.sh [script.md]

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🎬 Manim + Remotion Video Validation"
echo "====================================="
echo ""

ERRORS=0
WARNINGS=0

check_pass() { echo -e "${GREEN}✓${NC} $1"; }
check_fail() { echo -e "${RED}✗${NC} $1"; ERRORS=$((ERRORS + 1)); }
check_warn() { echo -e "${YELLOW}⚠${NC} $1"; WARNINGS=$((WARNINGS + 1)); }

# 1. Check project structure
echo "📁 Project Structure"
echo "--------------------"

if [ -d "manim" ]; then check_pass "manim/ directory exists"; else check_fail "manim/ directory missing"; fi
if [ -d "remotion" ]; then check_pass "remotion/ directory exists"; else check_fail "remotion/ directory missing"; fi
if [ -f "manim/scenes.py" ]; then check_pass "manim/scenes.py exists"; else check_warn "manim/scenes.py missing"; fi
if [ -d "remotion/public" ]; then check_pass "remotion/public/ exists"; else check_fail "remotion/public/ missing"; fi
if [ -f "remotion/package.json" ]; then check_pass "remotion/package.json exists"; else check_fail "remotion/package.json missing"; fi

echo ""

# 2. Check for Manim videos
echo "🎥 Manim Videos"
echo "---------------"

MANIM_VIDEOS=$(find manim -name "*.mp4" 2>/dev/null | grep -v partial | wc -l | tr -d ' ')
if [ "$MANIM_VIDEOS" -gt 0 ]; then
    check_pass "Found $MANIM_VIDEOS Manim video(s)"
    for f in $(find manim -name "*.mp4" 2>/dev/null | grep -v partial); do
        duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null || echo "?")
        echo "       - $(basename "$f"): ${duration}s"
    done
else
    check_warn "No Manim videos found (render with: manim -qh -r 1080,1920 manim/scenes.py SceneName)"
fi

echo ""

# 3. Check for audio segments
echo "🔊 Audio Segments"
echo "-----------------"

AUDIO_FILES=$(find remotion/public -name "segment-*.mp3" 2>/dev/null | wc -l | tr -d ' ')
if [ "$AUDIO_FILES" -gt 0 ]; then
    check_pass "Found $AUDIO_FILES audio segment(s)"
    for f in $(find remotion/public -name "segment-*.mp3" 2>/dev/null); do
        duration=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f" 2>/dev/null || echo "?")
        echo "       - $(basename "$f"): ${duration}s"
    done
else
    check_warn "No audio segments found (generate with pocket-tts)"
fi

echo ""

# 4. Check script for banned phrases
echo "📝 Script Validation"
echo "--------------------"

SCRIPT_FILE="${1:-script.md}"
if [ -f "$SCRIPT_FILE" ]; then
    check_pass "Script file found: $SCRIPT_FILE"
    
    # Check for banned phrases
    FOUND_BANNED=0
    for phrase in "Here's the thing" "Let me explain" "In this video" "Game-changer" "Deep dive" "I used to"; do
        if grep -qi "$phrase" "$SCRIPT_FILE" 2>/dev/null; then
            check_warn "Banned phrase found: \"$phrase\""
            FOUND_BANNED=$((FOUND_BANNED + 1))
        fi
    done
    
    if [ $FOUND_BANNED -eq 0 ]; then
        check_pass "No banned phrases detected"
    fi
    
    # Word count
    WORD_COUNT=$(wc -w < "$SCRIPT_FILE" | tr -d ' ')
    if [ "$WORD_COUNT" -lt 100 ]; then
        check_warn "Script is short ($WORD_COUNT words) - aim for 130-210 for 45-70s video"
    elif [ "$WORD_COUNT" -gt 250 ]; then
        check_warn "Script is long ($WORD_COUNT words) - may exceed 60s"
    else
        check_pass "Word count looks good: $WORD_COUNT words"
    fi
else
    check_warn "Script file not found: $SCRIPT_FILE"
fi

echo ""

# 5. Check color consistency
echo "🎨 Color Consistency"
echo "--------------------"

if [ -f "manim/scenes.py" ]; then
    if grep -q 'DARK_BG = "#0a0a0a"' manim/scenes.py 2>/dev/null; then
        check_pass "Manim uses standard color palette"
    else
        check_warn "Manim may not use standard color palette"
    fi
fi

echo ""

# 6. Summary
echo "📊 Summary"
echo "----------"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}$WARNINGS warning(s), but no critical errors${NC}"
else
    echo -e "${RED}$ERRORS error(s) and $WARNINGS warning(s) found${NC}"
fi

echo ""
echo "Next steps:"
if [ ! -f "manim/scenes.py" ]; then echo "  1. Create manim/scenes.py from template"; fi
if [ "$MANIM_VIDEOS" = "0" ]; then echo "  2. Render Manim scenes: manim -qh -r 1080,1920 manim/scenes.py"; fi
if [ "$AUDIO_FILES" = "0" ]; then echo "  3. Generate TTS segments with pocket-tts"; fi
echo "  4. Update Remotion composition with timings"
echo "  5. Preview: cd remotion && npm run dev"
echo "  6. Render: npx remotion render CompositionName"

exit 0
