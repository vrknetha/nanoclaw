---
name: upsk-promo
description: Create promotional content for upsk.to (AI-adaptive bootcamp). Use when drafting LinkedIn/X posts about upsk.to, creating Remotion videos with the terminal theme, writing college outreach, generating student-facing content, or any marketing task for upsk.to. Triggers for "upsk post", "promote upsk", "upsk video", "upsk content", "upsk LinkedIn", or any content creation about the upsk.to platform.
---

# upsk.to Promotion

Create on-brand promotional content for upsk.to — the AI-adaptive bootcamp.

## Before Creating Any Content

1. Read `references/brand.md` — design tokens, voice, value props, audiences
2. Read `references/content-pillars.md` — 6 pillars, hooks, content ideas, formats

## Brand Essentials (Quick Reference)

- **Theme:** Terminal/CLI aesthetic. Black bg (#000), white text (#fff), JetBrains Mono only
- **Tagline:** "The bootcamp that adapts to you"
- **One-liner:** "Paste one line in your AI editor. It becomes your instructor."
- **Tone:** Technical, direct, no marketing fluff. Show don't tell.
- **Never say:** revolutionary, cutting-edge, game-changing, unlock your potential
- **Always include:** upsk.to URL, the "one prompt" simplicity angle

## Content Types

### 1. LinkedIn Text Posts
- Follow 360Brew algorithm rules (see `bank/linkedin-post-guidelines.md`)
- Zero hashtags, natural keywords
- 900-1500 chars
- Use content pillars for topic selection
- Always tie back to a specific value prop

### 2. Remotion Videos (Terminal Theme)

Template: `videos/templates/upsk-terminal/`

The template includes 5 scene components that match the upsk.to landing page exactly:

| Scene | Duration | Use For |
|-------|----------|---------|
| `SceneBoot` | 5s | Opening — boot sequence, brand reveal |
| `ScenePrompt` | 5s | Show the one-prompt onboarding |
| `SceneTeaching` | 8s | AI/student conversation replay |
| `SceneScoring` | 7s | Dimension scores with evidence |
| `SceneCTA` | 5s | Closing with upsk.to branding |

**To create a video:**
1. Copy template to a working directory
2. Customize scene content (teaching lines, scores, evidence text)
3. Compose scenes in desired order (not all scenes required)
4. Add TTS voiceover with Pocket-TTS if needed
5. Render: `npx remotion render src/index.ts Reel out/video.mp4`

**Scene customization examples:**

```tsx
// Custom teaching conversation
<SceneTeaching lines={[
  { role: "ai", text: "What happens when your database can't handle the load?" },
  { role: "student", text: "Add a cache layer?" },
  { role: "ai", text: "Good instinct. But which cache invalidation strategy?" },
  { role: "student", text: "TTL-based for reads, write-through for consistency..." },
  { role: "ai", text: "Now you're thinking in tradeoffs." },
]} />

// Custom scores
<SceneScoring
  scores={[
    { label: "System Design", score: "4.8 / 5" },
    { label: "Tradeoff Reasoning", score: "4.6 / 5" },
  ]}
  evidence='"Proposed cache invalidation strategy with clear consistency tradeoff analysis."'
/>

// Custom CTA
<SceneCTA
  headline="Evidence, not grades."
  subline="upsk.to scores how you think. Every score backed by what you actually did."
/>
```

### 3. X/Twitter Posts
- Shorter, punchier than LinkedIn
- Thread format for architecture deep-dives
- Can embed short clips from Remotion renders
- More casual tone allowed

### 4. College Outreach
- Formal but still direct
- Lead with evidence-based analytics angle
- Emphasize: "one day setup", "no infrastructure needed", "placement-ready reports"

## Content Calendar

When scheduling content, rotate through pillars:

| Day | Pillar | Primary Format |
|-----|--------|----------------|
| Mon | The AI Instructor | Remotion video or text |
| Tue | Evidence Over Grades | Text post |
| Wed | One Prompt / Simplicity | Remotion video |
| Thu | Built Different / Architecture | Text post |
| Fri | Student Stories / For Colleges | Carousel or text |

## Hooks Library (Ready to Use)

**Product Demo:**
- "I pasted one line and my AI became my instructor"
- "Watch an AI teach system design to a complete beginner"

**Philosophy:**
- "Your GPA says nothing about how you think under pressure"
- "We don't give grades. We record evidence."

**Simplicity:**
- "One prompt. That's the entire onboarding."
- "Zero signup forms. Zero credit cards. One line of text."

**Architecture:**
- "I built an EdTech platform with zero lines written by me"
- "How we shipped 47 modules with Codex and Claude Code"

**Social Proof:**
- "Debugging score: 2.1 → 4.6 in 8 sessions"
- "This student explained stateless auth in 3 minutes"

## Quality Checklist

Before publishing any upsk.to content:
- [ ] Matches terminal aesthetic (no marketing-speak)
- [ ] Includes upsk.to URL
- [ ] Ties to a specific value prop (not generic "AI is cool")
- [ ] Shows, doesn't tell (uses transcripts, scores, or demos)
- [ ] Follows 360Brew rules for LinkedIn
- [ ] No banned AI phrases
- [ ] No hashtags
