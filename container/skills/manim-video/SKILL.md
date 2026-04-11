---
name: manim-video
description: Create animated LinkedIn videos using Manim for visualizations and Remotion for stitching with TTS voiceover. Use for technical explainer videos, concept animations, and educational content.
  tags: manim, remotion, video, animation, linkedin, tts, visualization
---

## When to Use

Use this skill when creating animated videos that need:
- Technical concept visualizations (flowcharts, diagrams, data flows)
- Educational explainer content
- LinkedIn/social media videos with professional animations
- Videos combining animated diagrams with voiceover narration

## Two Approaches

### 1. Manim + Remotion (Complex Visualizations)
Use when you need animated diagrams, flowcharts, or technical visualizations.
```
Script → Manim Scenes → TTS Audio → Remotion Stitch → Final Video
```

### 2. Remotion-Only (Typography + Icons)
Use for concept videos, quote-based content, or when bold typography carries the message.
```
Script → TTS Audio → Remotion (Icons + Text) → Final Video
```

**When to skip Manim:**
- No diagrams or flowcharts needed
- Message is primarily text/quotes
- Icons can represent concepts (tools, ideas, emotions)
- Faster iteration needed

## Workflow Overview (Manim + Remotion)

```
Script → Manim Scenes → TTS Audio → Remotion Stitch → Final Video
```

1. **Script**: Write narration following voice guidelines
2. **Manim**: Create animated scenes for key concepts
3. **TTS**: Generate audio segments with Pocket-TTS
4. **Remotion**: Sequence Manim videos + audio + text overlays
5. **Render**: Export final video in target format

## Project Structure

```
video-project/
├── manim/
│   ├── scenes.py           # Manim scene definitions
│   └── media/              # Rendered Manim clips (auto-generated)
├── remotion/
│   ├── public/
│   │   ├── *.mp4           # Manim clips (copied from manim/media)
│   │   └── segment-*.mp3   # TTS audio segments
│   ├── src/
│   │   └── VideoComposition.tsx
│   └── package.json
├── script.md               # Video script/narration
└── plan.md                 # Scene breakdown and timing
```

## Step 1: Write the Script

Follow these narration rules (see `references/narration-rules.md`):

**DO:**
- Third person: "Most developers spend their time..."
- Story structure: problem → flip → solution → insight
- Short, punchy sentences
- Natural pauses (periods, not run-on sentences)

**DON'T:**
- First person: ~~"I used to..."~~
- Clichés: ~~"Here's the truth nobody talks about"~~
- Accusatory "you": ~~"Your prompt was wrong"~~ → "The prompt was wrong"
- Robotic lists

**Script Template:**
```markdown
# Video: [Title]

## Hook (5-10s)
[Attention-grabbing statement about the problem]

## Problem (10-15s)
[Describe the pain point, make it relatable]

## Flip (3-5s)
[The moment of change - "Then something changes"]

## Solution (15-20s)
[New approach, step by step]

## Result (5-10s)
[The payoff, concrete outcome]

## Punchline (5-10s)
[Memorable takeaway, shareable insight]
```

## Step 2: Plan Manim Scenes

Match Manim animations to script segments:

| Script Section | Manim Scene Type | Template |
|----------------|------------------|----------|
| Problem/Loop | `CycleFlow` | Shows repeating cycle |
| Comparison | `SideBySide` | Old vs New approach |
| Process | `Pipeline` | Linear flow with gates |
| Transform | `InputOutput` | Before → After |
| Hierarchy | `TreeDiagram` | Nested relationships |

See `templates/manim_scenes.py` for all scene templates.

### ⚠️ CRITICAL: Portrait Layout Rules

**LinkedIn videos are PORTRAIT (1080x1920, 9:16 aspect ratio).** Manim's default coordinate system is landscape-oriented. You MUST adjust for portrait:

**Default Manim coordinates (landscape 16:9):**
- X axis: -7 to 7 (wide)
- Y axis: -4 to 4 (short)

**Portrait 9:16 effective coordinates:**
- X axis: -4 to 4 (narrow)
- Y axis: -7 to 7 (tall)

**Portrait Layout Guidelines:**

1. **Stack vertically, not horizontally** — Use UP/DOWN positioning instead of LEFT/RIGHT for comparisons
2. **Reduce horizontal spread** — Keep elements within x = -3 to 3
3. **Use full vertical space** — Spread content from y = -6 to 6
4. **Smaller font sizes** — Use 20-42pt instead of 24-48pt
5. **Horizontal dividers** — Use horizontal lines instead of vertical for separating sections
6. **Test at target resolution** — Always preview with `-r 1080,1920`

**Example Portrait Positioning:**
```python
# Header at top
header.move_to(UP * 5.5)

# First section
section1_title.move_to(UP * 3.5)
section1_content.move_to(UP * 1.5)

# Divider
divider = DashedLine(LEFT * 3, RIGHT * 3, ...)  # Horizontal!
divider.move_to(DOWN * 0.5)

# Second section  
section2_title.move_to(DOWN * 1.5)
section2_content.move_to(DOWN * 3.5)

# Footer at bottom
footer.move_to(DOWN * 6)
```

## Step 3: Render Manim Scenes

```bash
cd video-project/manim

# Preview (low quality, fast)
manim -ql scenes.py SceneName

# LinkedIn Portrait (1080x1920)
manim -qh -r 1080,1920 --fps 30 scenes.py SceneName

# LinkedIn Square (1080x1080)
manim -qh -r 1080,1080 --fps 30 scenes.py SceneName
```

**Output locations:**
- Low quality: `media/videos/scenes/480p15/`
- High quality: `media/videos/scenes/1920p30/` (portrait) or `1080p30/` (square)

## Step 4: Generate TTS Audio

Split script into segments matching scenes, then generate:

```bash
cd video-project/remotion/public

# Generate each segment
uvx pocket-tts generate \
  --voice marius \
  --text "Script segment text here..." \
  --temperature 0.8 \
  --output-path segment-1-hook.wav

# Convert to MP3
ffmpeg -y -i segment-1-hook.wav -codec:a libmp3lame -qscale:a 2 segment-1-hook.mp3
```

**Voice options:**
- Male (recommended): `marius`, `javert`, `jean`
- Female: `eponine`, `alba`, `fantine`, `cosette`

## Step 5: Create Remotion Composition

See `templates/VideoComposition.tsx` for the full template.

Key structure:
```tsx
// Calculate timing from Manim video durations
const SCENE_1_DURATION = Math.ceil(manimDuration1 * FPS);
const SCENE_2_START = SCENE_1_DURATION;
// ... etc

// Sequence scenes
<Sequence from={0} durationInFrames={SCENE_1_DURATION}>
  <Video src={staticFile('ManimScene1.mp4')} />
  <Audio src={staticFile('segment-1.mp3')} />
</Sequence>
```

## Remotion-Only Workflow (No Manim)

For videos that don't need animated diagrams — use bold typography, icons, and smooth animations.

### Layout Rules

**ALWAYS center content vertically and horizontally:**
```tsx
<AbsoluteFill
  style={{
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",  // ← ALWAYS center, never flex-start
    alignItems: "center",
    padding: 60,
  }}
>
```

**Never use `flex-start` or `paddingTop` to push content to top.** Center-aligned content looks more professional on mobile.

### Icon System

Use Phosphor icons (duotone style) via `@iconify/react`:
```tsx
import { Icon } from "@iconify/react";

// Examples
<Icon icon="ph:robot-duotone" width={80} color="#0a84ff" />
<Icon icon="ph:code-duotone" width={80} color="#86868b" />
<Icon icon="ph:heart-duotone" width={48} color="#ff453a" />
<Icon icon="ph:check-circle-duotone" width={32} color="#30d158" />
<Icon icon="ph:x-circle-duotone" width={32} color="#ff453a" />
```

Browse icons: https://icon-sets.iconify.design/ph/

### Animation Patterns

**FadeInUp (recommended for text):**
```tsx
const FadeInUp = ({ children, delay = 0, style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 200, stiffness: 100 },
  });

  const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(progress, [0, 1], [60, 0], { extrapolateRight: "clamp" });
  const blur = interpolate(progress, [0, 1], [10, 0], { extrapolateRight: "clamp" });

  return (
    <div style={{ opacity, transform: `translateY(${y}px)`, filter: `blur(${blur}px)`, ...style }}>
      {children}
    </div>
  );
};
```

**ScaleIn (for icons):**
```tsx
const ScaleIn = ({ children, delay = 0, style = {} }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 15, stiffness: 100 },
  });

  const scale = interpolate(progress, [0, 1], [0.5, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(progress, [0, 1], [0, 1], { extrapolateRight: "clamp" });

  return (
    <div style={{ transform: `scale(${scale})`, opacity, ...style }}>
      {children}
    </div>
  );
};
```

### Scene Templates

**Quote Scene:**
```tsx
const QuoteScene = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
    <FadeInUp delay={0}>
      <div style={{ fontSize: 200, color: "#48484a", lineHeight: 0.5, marginBottom: -40 }}>"</div>
    </FadeInUp>
    <FadeInUp delay={10} style={{ textAlign: "center" }}>
      <div style={{ fontSize: 64, fontWeight: 700, color: "#fff", maxWidth: 900 }}>
        Quote text here
      </div>
    </FadeInUp>
  </AbsoluteFill>
);
```

**Two Options Scene:**
```tsx
const OptionsScene = () => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: 60 }}>
    <FadeInUp delay={0} style={{ width: "100%", marginBottom: 40 }}>
      <div style={{
        padding: 50,
        background: "linear-gradient(135deg, rgba(255,214,10,0.1), rgba(255,214,10,0.02))",
        borderRadius: 32,
        border: "2px solid #ffd60a",
      }}>
        <div style={{ fontSize: 72, fontWeight: 800, color: "#ffd60a" }}>Option A</div>
        <div style={{ fontSize: 28, color: "#86868b" }}>Description</div>
      </div>
    </FadeInUp>
    
    <FadeInUp delay={30}>
      <div style={{ fontSize: 36, color: "#48484a", margin: "20px 0" }}>or</div>
    </FadeInUp>
    
    <FadeInUp delay={60} style={{ width: "100%" }}>
      <div style={{
        padding: 50,
        background: "linear-gradient(135deg, rgba(48,209,88,0.1), rgba(48,209,88,0.02))",
        borderRadius: 32,
        border: "2px solid #30d158",
      }}>
        <div style={{ fontSize: 72, fontWeight: 800, color: "#30d158" }}>Option B</div>
        <div style={{ fontSize: 28, color: "#86868b" }}>Description</div>
      </div>
    </FadeInUp>
  </AbsoluteFill>
);
```

### Apple-Inspired Color Palette

```tsx
const colors = {
  bg: "#000000",
  text: "#ffffff",
  accent: "#0a84ff",    // Blue
  success: "#30d158",   // Green
  error: "#ff453a",     // Red
  warning: "#ffd60a",   // Yellow
  dim: "#86868b",       // Gray text
  dimmer: "#48484a",    // Darker gray
};
```

### Dependencies

```json
{
  "dependencies": {
    "@iconify/react": "^5.2.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/google-fonts": "^4.0.0",
    "react": "^18.0.0",
    "remotion": "^4.0.0"
  }
}
```

## Step 6: Preview and Render

```bash
cd video-project/remotion

# Start preview server
npm run dev

# Render still frame for validation
npx remotion still CompositionName --frame=100 --output=preview.png

# Render final video
npx remotion render CompositionName --output=final-video.mp4
```

## Validation Checklist

Before final render, verify:

### Script
- [ ] Third person perspective
- [ ] No banned phrases (see `references/banned-phrases.md`)
- [ ] Story structure: hook → problem → flip → solution → punchline
- [ ] Total length: 30-60 seconds for LinkedIn

### Manim
- [ ] Consistent color palette (see `references/colors.md`)
- [ ] Animation timing feels natural (not too fast/slow)
- [ ] Text is readable at target resolution
- [ ] No visual clutter
- [ ] **PORTRAIT CHECK**: Elements stacked vertically, not side-by-side
- [ ] **PORTRAIT CHECK**: Content within x = -3 to 3, y = -6 to 6
- [ ] **PORTRAIT CHECK**: Rendered with `-r 1080,1920`

### Audio
- [ ] Clear pronunciation, natural pacing
- [ ] Segments match scene durations reasonably
- [ ] No awkward cuts between segments

### Remotion
- [ ] Audio syncs with visuals
- [ ] Transitions are smooth
- [ ] Text overlays readable
- [ ] Correct aspect ratio (1080x1920 portrait or 1080x1080 square)

### Final
- [ ] Total duration within platform limits (LinkedIn: 10min max, recommend <60s)
- [ ] File size reasonable (<100MB for LinkedIn)
- [ ] Preview looks good on mobile

## Color Palette

Consistent across Manim and Remotion:

| Name | Hex | Use |
|------|-----|-----|
| Background | `#0a0a0a` | Dark background |
| Blue Accent | `#3b82f6` | Primary actions, positive |
| Green Accent | `#22c55e` | Success, solution |
| Red Accent | `#ef4444` | Problems, errors |
| Yellow Accent | `#eab308` | Warnings, attention |
| Gray Text | `#9ca3af` | Secondary text |
| White | `#ffffff` | Primary text |

## Quick Start

### Remotion-Only Video (No Manim)

```bash
# 1. Create project
mkdir -p my-video/remotion/{src,public}
cd my-video/remotion

# 2. Initialize
npm init -y
npm install remotion @remotion/cli @remotion/google-fonts @iconify/react react

# 3. Copy template
cp /path/to/skill/templates/RemotionOnlyComposition.tsx src/VideoComposition.tsx

# 4. Create Root.tsx and index.ts (see template)

# 5. Generate TTS audio segments
uvx pocket-tts generate --voice marius --text "..." --output-path public/segment-1.wav
ffmpeg -i public/segment-1.wav -codec:a libmp3lame -qscale:a 2 public/segment-1.mp3

# 6. Combine audio
ffmpeg -f concat -safe 0 -i concat.txt -c copy public/narration.mp3

# 7. Update TIMING in VideoComposition.tsx
# 8. Preview: npm run dev
# 9. Render: npx remotion render VideoComposition out/video.mp4
```

### Manim + Remotion Video

```bash
# 1. Create project structure
mkdir -p my-video/{manim,remotion}
cd my-video

# 2. Copy templates
cp /path/to/skill/templates/manim_scenes.py manim/scenes.py
cp -r /path/to/skill/templates/remotion-template/* remotion/

# 3. Edit script in script.md
# 4. Customize Manim scenes
# 5. Generate TTS
# 6. Update Remotion timing
# 7. Preview and render
```

## References

- `references/colors.md` - Full color system
- `references/narration-rules.md` - Script writing guidelines
- `references/banned-phrases.md` - Phrases to avoid
- `templates/manim_scenes.py` - Reusable Manim scene templates
- `templates/VideoComposition.tsx` - Remotion + Manim composition template
- `templates/RemotionOnlyComposition.tsx` - **Remotion-only template (typography + icons, center-aligned)**
