# Color System

Consistent palette for Manim and Remotion. Never deviate.

## Core Colors

| Name | Hex | RGB | Manim Constant | Tailwind Class |
|------|-----|-----|----------------|----------------|
| Background | `#0a0a0a` | `10, 10, 10` | `DARK_BG` | `bg-[#0a0a0a]` |
| Blue Accent | `#3b82f6` | `59, 130, 246` | `BLUE_ACCENT` | `text-blue-500` |
| Green Accent | `#22c55e` | `34, 197, 94` | `GREEN_ACCENT` | `text-green-500` |
| Red Accent | `#ef4444` | `239, 68, 68` | `RED_ACCENT` | `text-red-500` |
| Yellow Accent | `#eab308` | `234, 179, 8` | `YELLOW_ACCENT` | `text-yellow-500` |
| Gray Text | `#9ca3af` | `156, 163, 175` | `GRAY_TEXT` | `text-gray-400` |
| White | `#ffffff` | `255, 255, 255` | `WHITE` | `text-white` |

## Usage Guidelines

### Manim Setup
```python
# At top of scenes.py
DARK_BG = "#0a0a0a"
BLUE_ACCENT = "#3b82f6"
RED_ACCENT = "#ef4444"
GREEN_ACCENT = "#22c55e"
YELLOW_ACCENT = "#eab308"
GRAY_TEXT = "#9ca3af"

class MyScene(Scene):
    def construct(self):
        self.camera.background_color = DARK_BG
```

### Remotion Setup
```tsx
// Tailwind or inline styles
<AbsoluteFill style={{ backgroundColor: '#0a0a0a' }}>
  <div className="text-blue-500">Blue accent</div>
  <div className="text-red-500">Red accent</div>
  <div className="text-green-500">Green accent</div>
</AbsoluteFill>
```

## Semantic Meaning

| Color | Meaning | Example Uses |
|-------|---------|--------------|
| Blue | Primary, neutral positive, action | Current step, input, agent |
| Green | Success, solution, completion | "Done", correct path, gates |
| Red | Problem, error, bad path | Bugs, old way, failures |
| Yellow | Warning, attention, repeat | Cycles, "x4", caution |
| Gray | Secondary, supporting | Arrows, labels, muted text |
| White | Primary text, emphasis | Headlines, key words |

## Gradients (Remotion only)

```tsx
// Subtle blue gradient overlay
<div style={{
  background: 'radial-gradient(ellipse at 50% 30%, rgba(59,130,246,0.06) 0%, transparent 60%)'
}} />

// Grid background
<div style={{
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px)
  `,
  backgroundSize: '50px 50px'
}} />
```

## Opacity Guidelines

| Element | Opacity |
|---------|---------|
| Filled shapes | `0.15 - 0.2` |
| Stroke/borders | `1.0` |
| Background overlays | `0.01 - 0.06` |
| Dimmed text | `0.6 - 0.7` |

## Anti-patterns

❌ Don't use pure black (`#000000`) for text - use white  
❌ Don't use bright/saturated colors for large areas  
❌ Don't mix color meanings (green for errors, red for success)  
❌ Don't use colors outside this palette  
