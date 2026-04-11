# LLM Council

Run any question, idea, or decision through a council of 5 AI advisors who independently analyze it, peer-review each other anonymously, and synthesize a final verdict.

Based on Karpathy's LLM Council methodology.

## Triggers
**Mandatory:** "council this", "run the council", "war room this", "pressure-test this", "stress-test this", "debate this"

**Strong (when combined with real tradeoffs):** "should I X or Y", "which option", "what would you do", "is this the right move", "validate this", "get multiple perspectives", "I can't decide", "I'm torn between"

**Do NOT trigger** on simple yes/no questions, factual lookups, or casual "should I" without meaningful tradeoffs.

## The Five Advisors

| # | Advisor | Thinking Style |
|---|---------|---------------|
| 1 | **The Contrarian** | Finds what's wrong, what's missing, what will fail. Assumes a fatal flaw exists. |
| 2 | **The First Principles Thinker** | Strips assumptions, rebuilds from ground up. "You're asking the wrong question." |
| 3 | **The Expansionist** | Finds upside everyone misses. What could be bigger? What's undervalued? |
| 4 | **The Outsider** | Zero context. Catches curse of knowledge and blind spots experts develop. |
| 5 | **The Executor** | Only cares: can this be done, and what's the fastest path? "What do you do Monday morning?" |

**Natural tensions:** Contrarian vs Expansionist (downside vs upside). First Principles vs Executor (rethink vs just do it). Outsider keeps everyone honest.

## Process (4 steps, all sub-agents)

### Step 1: Frame the Question
Before framing, scan workspace for context:
- `memory/` folder, today's and recent daily files
- `bank/entities/` for people context
- Any files the user referenced
- Previous council transcripts

Reframe as a clear, neutral prompt with:
1. Core decision
2. Key context from user
3. Key context from workspace (business stage, constraints, past results)
4. What's at stake

If too vague, ask ONE clarifying question then proceed.

### Step 2: Convene the Council (5 sub-agents in parallel)
Spawn all 5 advisors simultaneously. Each gets:
- Their advisor identity and thinking style
- The framed question
- Instruction: respond independently, don't hedge, lean fully into your angle, 150-300 words, no preamble

**Sub-agent prompt:**
```
You are [Advisor Name] on an LLM Council.
Your thinking style: [description]

A user has brought this question to the council:
---
[framed question]
---

Respond from your perspective. Be direct and specific. Don't hedge or try to be balanced. Lean fully into your assigned angle. The other advisors will cover the angles you're not covering.
Keep your response between 150-300 words. No preamble. Go straight into your analysis.
```

**Model:** Use `anthropic/claude-sonnet-4-6` for all 5 advisors.

### Step 3: Peer Review (5 sub-agents in parallel)
Collect all 5 responses. Anonymize as Response A-E (randomize mapping).

Spawn 5 reviewers, each sees all 5 anonymized responses and answers:
1. Which response is strongest and why? (pick one)
2. Which has the biggest blind spot?
3. What did ALL responses miss?

**Reviewer prompt:**
```
You are reviewing the outputs of an LLM Council. Five advisors independently answered this question:
---
[framed question]
---

[Response A through E]

Answer these three questions. Be specific. Reference responses by letter.
1. Which response is the strongest? Why?
2. Which response has the biggest blind spot? What is it missing?
3. What did ALL five responses miss that the council should consider?

Keep your review under 200 words. Be direct.
```

**Model:** Use `anthropic/claude-sonnet-4-6` for all 5 reviewers.

### Step 4: Chairman Synthesis
One agent gets everything: original question, all 5 responses (de-anonymized), all 5 peer reviews.

**Output structure:**
1. **Where the Council Agrees** — points multiple advisors converged on (high-confidence)
2. **Where the Council Clashes** — genuine disagreements, both sides, why they disagree
3. **Blind Spots the Council Caught** — things only peer review surfaced
4. **The Recommendation** — clear, actionable. Not "it depends." A real answer.
5. **The One Thing to Do First** — single concrete next step

**Model:** Use `anthropic/claude-opus-4-6` for the chairman.

The chairman CAN disagree with the majority if the dissenter's reasoning is strongest.

## Output Files

Every council session produces two files in workspace root:

```
council-report-[timestamp].html    # visual report (present via canvas)
council-transcript-[timestamp].md  # full transcript for reference
```

### HTML Report
Self-contained HTML with inline CSS. Contains:
1. The question at top
2. Chairman's verdict (prominent)
3. Agreement/disagreement visual (grid or spectrum)
4. Collapsible sections for each advisor's response (collapsed by default)
5. Collapsible section for peer review highlights
6. Footer with timestamp

Style: white background, subtle borders, system sans-serif, soft accent colors per advisor. Professional briefing document aesthetic.

### Transcript
Full markdown with: original question → framed question → all 5 advisor responses → all 5 peer reviews (with anonymization mapping) → chairman synthesis.

## Implementation Notes
- **Always parallel spawn.** Sequential lets earlier responses contaminate later ones.
- **Always anonymize for peer review.** Prevents deference to certain thinking styles.
- **Don't council trivial questions.** One right answer = just answer it.
- **Present the HTML report via canvas** after generation so user sees it immediately.
