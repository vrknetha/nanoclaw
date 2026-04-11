# Narration Rules

Write voiceover scripts that sound natural when spoken and create emotional resonance.

## Core Principles

### 1. Third Person Perspective

✅ "Most developers spend their time fixing what the AI got wrong."
❌ "I used to spend my time fixing what the AI got wrong."

Why: Third person is more shareable, less self-centered, and positions insights as universal truths.

### 2. Story Structure

Every video follows this arc:

```
HOOK (5-10s)
↓
PROBLEM (10-15s)
↓
FLIP (3-5s)
↓
SOLUTION (15-20s)
↓
RESULT (5-10s)
↓
PUNCHLINE (5-10s)
```

**Hook**: Grab attention with a contrarian statement or surprising fact.
**Problem**: Make the pain relatable. The viewer should nod along.
**Flip**: The moment of change. "Then something changes." / "But what if..."
**Solution**: The new approach, concrete steps.
**Result**: The payoff, specific outcome.
**Punchline**: Memorable, shareable insight. The "tweet" version.

### 3. Sentence Structure

- **Short sentences.** Punchy. Direct.
- One idea per sentence.
- Use periods for pauses, not commas.
- Read aloud to test rhythm.

✅ "Write code. Review it. Find bugs. Tell it to fix. Do it again."
❌ "Write code, review it, find bugs, tell it to fix, then do it again."

### 4. Concrete Over Abstract

✅ "Three months of downstream cleanup."
❌ "A significant amount of remediation effort."

✅ "Two weeks."
❌ "A short period of time."

### 5. Emotional Beats

Map emotions to sections:

| Section | Emotion | Tone |
|---------|---------|------|
| Hook | Curiosity/Surprise | Bold, confident |
| Problem | Frustration/Recognition | Empathetic, relatable |
| Flip | Hope/Anticipation | Shift in energy |
| Solution | Clarity/Relief | Measured, clear |
| Result | Satisfaction | Concrete, specific |
| Punchline | Insight | Memorable, quotable |

## Pacing Guidelines

| Section | Duration | Word Count (~) |
|---------|----------|----------------|
| Hook | 5-10s | 15-30 words |
| Problem | 10-15s | 30-45 words |
| Flip | 3-5s | 8-15 words |
| Solution | 15-20s | 45-60 words |
| Result | 5-10s | 15-30 words |
| Punchline | 5-10s | 15-30 words |
| **Total** | **45-70s** | **130-210 words** |

**Speaking rate**: ~150 words per minute for natural pace.

## Example Script

```markdown
# Video: Fix the Input

## Hook
Most developers spend their time fixing what the AI got wrong.

## Problem
Write code. Review it. Find bugs. Tell it to fix. Do it again.
Four times. Sometimes more.
Three months of downstream cleanup.

## Flip
Then something changes.

## Solution
Instead of fixing output, fix the input.
Make the agent ask questions first.
Answer once. Let it write. Then verify.

## Result
Two weeks. That's all it takes to save three months.

## Punchline
The agent isn't wrong. The prompt was.
Fix the input. The output fixes itself.
```

Word count: ~100 words → ~40 seconds of narration.

## TTS Optimization

When writing for Pocket-TTS specifically:

1. **Avoid abbreviations**: Write "versus" not "vs", "three months" not "3 mo"
2. **Spell out numbers under 10**: "four times" not "4 times"
3. **Use em dashes sparingly**: TTS handles them awkwardly
4. **Avoid parentheticals**: They break flow
5. **Test pronunciation**: Some technical terms need phonetic hints

## Segment Boundaries

Split narration into segments at natural pause points:

- End of a section (Hook, Problem, etc.)
- After a dramatic pause
- At topic transitions

Each segment = one Manim scene or transition.

## Anti-patterns

See `banned-phrases.md` for specific phrases to avoid.

General anti-patterns:
- Starting with "So..." or "Well..."
- Asking rhetorical questions ("Ever wondered why...?")
- Meta-commentary ("In this video, I'll show you...")
- Filler words ("basically", "actually", "literally")
- Hedge words ("kind of", "sort of", "maybe")
