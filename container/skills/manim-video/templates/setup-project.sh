#!/bin/bash
#
# Quick setup for a new Manim + Remotion video project
#
# Usage: bash setup-project.sh my-video-name

set -e

if [ -z "$1" ]; then
    echo "Usage: bash setup-project.sh <project-name>"
    exit 1
fi

PROJECT_NAME="$1"
SKILL_DIR="$(dirname "$0")/.."

echo "🎬 Creating video project: $PROJECT_NAME"
echo ""

# Create directories
mkdir -p "$PROJECT_NAME"/{manim,remotion/public,remotion/src}

# Copy Manim template
cp "$SKILL_DIR/templates/manim_scenes.py" "$PROJECT_NAME/manim/scenes.py"
echo "✓ Created manim/scenes.py"

# Copy Remotion template
cp "$SKILL_DIR/templates/VideoComposition.tsx" "$PROJECT_NAME/remotion/src/"
echo "✓ Created remotion/src/VideoComposition.tsx"

# Create script template
cat > "$PROJECT_NAME/script.md" << 'EOF'
# Video: [Your Title Here]

## Hook (5-10s)
[Attention-grabbing statement about the problem]

## Problem (10-15s)
[Describe the pain point, make it relatable]

## Flip (3-5s)
Then something changes.

## Solution (15-20s)
[New approach, step by step]

## Result (5-10s)
[The payoff, concrete outcome]

## Punchline (5-10s)
[Memorable takeaway, shareable insight]
EOF
echo "✓ Created script.md template"

# Create scene plan
cat > "$PROJECT_NAME/plan.md" << 'EOF'
# Scene Plan

| Section | Duration | Manim Scene | Notes |
|---------|----------|-------------|-------|
| Hook | ~10s | CycleFlow | |
| Problem | ~4s | (text only) | |
| Solution | ~10s | SideBySide | |
| Result | ~18s | Pipeline | |
| Punchline | ~13s | InputOutput | |

## Manim Customizations

```python
# Hook scene
class MyHookScene(CycleFlow):
    steps = ["Step1", "Step2", "Step3", "Step4"]
    colors = [BLUE_ACCENT, GRAY_TEXT, RED_ACCENT, YELLOW_ACCENT]
    title = "My Title"
```

## TTS Segments

1. segment-1-hook.mp3 - "..."
2. segment-2-problem.mp3 - "..."
3. segment-3-solution.mp3 - "..."
4. segment-4-result.mp3 - "..."
5. segment-5-punchline.mp3 - "..."
EOF
echo "✓ Created plan.md"

# Create basic Remotion package.json
cat > "$PROJECT_NAME/remotion/package.json" << 'EOF'
{
  "name": "video-project",
  "version": "1.0.0",
  "scripts": {
    "dev": "remotion studio",
    "build": "remotion render VideoComposition"
  },
  "dependencies": {
    "@remotion/bundler": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/google-fonts": "^4.0.0",
    "@remotion/media": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "remotion": "^4.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "typescript": "^5.0.0"
  }
}
EOF
echo "✓ Created remotion/package.json"

# Create Root.tsx
cat > "$PROJECT_NAME/remotion/src/Root.tsx" << 'EOF'
import { Composition } from 'remotion';
import { VideoComposition, VIDEO_COMPOSITION_CONFIG } from './VideoComposition';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={VIDEO_COMPOSITION_CONFIG.id}
        component={VIDEO_COMPOSITION_CONFIG.component}
        durationInFrames={VIDEO_COMPOSITION_CONFIG.durationInFrames}
        fps={VIDEO_COMPOSITION_CONFIG.fps}
        width={VIDEO_COMPOSITION_CONFIG.width}
        height={VIDEO_COMPOSITION_CONFIG.height}
      />
    </>
  );
};
EOF
echo "✓ Created remotion/src/Root.tsx"

# Copy validation script
cp "$SKILL_DIR/validate.sh" "$PROJECT_NAME/"
echo "✓ Copied validate.sh"

echo ""
echo "✅ Project created: $PROJECT_NAME/"
echo ""
echo "Next steps:"
echo "  1. Edit script.md with your narration"
echo "  2. Customize manim/scenes.py for your content"
echo "  3. Render Manim: cd $PROJECT_NAME/manim && manim -qh -r 1080,1920 scenes.py SceneName"
echo "  4. Generate TTS: uvx pocket-tts generate --voice marius --text '...' --output-path remotion/public/segment-1.wav"
echo "  5. Copy Manim videos to remotion/public/"
echo "  6. Update timings in remotion/src/VideoComposition.tsx"
echo "  7. Install deps: cd $PROJECT_NAME/remotion && npm install"
echo "  8. Preview: npm run dev"
echo "  9. Render: npm run build"
