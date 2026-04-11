---
name: linkedin-comment-replies
description: Draft human-sounding replies to LinkedIn/X comments. Use when replying to comments on posts, drafting comment responses, or reviewing reply drafts for AI patterns.
author: Ravi Kiran
---

# LinkedIn Comment Replies

Draft replies that sound like a real person wrote them — not AI.

## Core Rules

1. **Brevity wins.** 1-3 sentences max. Longer only if making a real point.
2. **Cut slop.** No throat-clearing, no emphasis crutches. See `references/banned-phrases.md`.
3. **Match energy.** Short comment → short reply. Substantive → can go longer.
4. **Skip templates.** No "[Thanks] + [Validate] + [Expand]" formula.
5. **Simple words only.** "Smart" not "ingenious". "Helps" not "facilitates".
6. **One thought per reply.** Don't stack multiple points.
7. **Have an opinion.** Don't blindly agree. Push back with practical common sense when something feels off.
8. **Sound practical.** Real-world experience > theory. If you've seen it fail, say so.

## Quick Checks

Before sending any reply:

- Starts with "Great point!" or "Absolutely!"? → Rewrite
- More than 3 sentences for a simple comment? → Cut
- Would you type this to a colleague on Slack? → If no, rewrite
- Contains words from banned list? → Replace with simpler word
- Sounds like a press release? → More casual
- Contains * or _ for emphasis? → Remove them (LinkedIn shows literal characters)

## Reply by Comment Type

| Type | Do | Don't |
|------|-----|-------|
| Simple praise ("Great post!") | "Thanks!" / "Glad it landed" | "Thank you so much for your kind words!" |
| Agreement + elaboration | "Yep. [one line]" / "Exactly." | "I completely agree! This is exactly what I've been thinking!" |
| Question | Just answer directly | "Great question! So the thing is..." |
| Product plug | Ask genuine question or skip | "Wow, looks interesting! Will check it out!" |
| Disagreement | "Fair point." + short counter | "I see where you're coming from, however..." |
| Just tagging someone | Usually ignore | Reply just to be polite |

## When Commenting on Others' Posts

| Situation | Do | Don't |
|-----------|-----|-------|
| You agree fully | Add your angle, not just "great post" | Blindly validate |
| You partially agree | Say what works, push back on what doesn't | Pretend to agree 100% |
| You disagree | State your view with practical reasoning | Stay silent or fake agreement |
| Sounds good but impractical | Call it out — "sounds good, but in practice..." | Nod along |
| Missing nuance | Add the nuance — "depends on..." / "works until..." | Let it slide |

**Key principle:** Raise your opinion. Comments are for adding value, not just validating. If something feels off based on your experience, say it.

## Fact Validation

Before commenting, validate claims if needed:

1. **When to validate:**
   - Commenting on product/tool announcements (verify features exist)
   - Referencing specific people/roles (verify titles, affiliations)
   - Making claims about stats, benchmarks, or capabilities
   - Promoting someone's work (verify relationship context)

2. **How to validate:**
   ```bash
   # Search for context
   mcporter call firecrawl.firecrawl_search query="[person/product] [claim to verify]"
   
   # Or scrape specific page
   mcporter call firecrawl.firecrawl_scrape_url url="[url]"
   ```

3. **Key relationships to remember:**
   - Harrison Chase = LangChain CEO (Ravi is LangChain Ambassador → promote)
   - Check `bank/entities/` for known people context

4. **Never:**
   - Fabricate features or capabilities
   - Assume titles or roles without checking
   - Promote competitors without context

## Voice

- **Direct.** State it, don't announce it.
- **Simple English.** Indian tech professional voice. No fancy vocabulary.
- **Casual.** LinkedIn comments, not formal email.
- **Arrows/dashes OK.** →, —, ... are fine.
- **NO MARKDOWN.** LinkedIn doesn't render *asterisks*, _underscores_, or **bold**. They show as literal characters. Never use them for emphasis.
- **Natural phrasing > grammatically perfect.**

## Scoring

Before sending, rate 1-5:

| Check | Question |
|-------|----------|
| Brevity | Could this be shorter? |
| Natural | Would a human type this? |
| Simple | Any word a 10th grader wouldn't use? |
| Direct | Am I stating or announcing? |

Below 15/20: revise.

## Bundled Resources

| File | Purpose |
|------|---------|
| `references/banned-phrases.md` | Words and phrases to never use |
| `references/examples.md` | Before/after transformations |

Read `references/banned-phrases.md` before drafting any reply.

## Strategic Targeting

**Business context:** Ravi runs AI engineering staffing and consulting at KnackLabs. Comments should position him as the expert to attract leads.

### Target Audience (Potential Clients)
1. **Startup founders/CTOs** — building AI products, need consulting or staffing help
2. **Venture builders** — Deep Tech, Health Tech, Enterprise AI (referral sources)
3. **Series A-D companies** — opening India offices, building AI teams
4. **Indian tech leaders** — in Hyderabad/India, potential clients or partners

### Priority Posts (Comment Here)
1. **Production AI challenges** — posts about real implementation struggles
2. **Startup founders discussing AI adoption** — your ideal clients
3. **AI ecosystem leaders** — Harrison Chase (LangChain), Jerry Liu (LlamaIndex) — for visibility
4. **Venture builders/investors** — potential referral sources

### SKIP These (Not Your Customers)
- **Big Tech employees** — Google, Microsoft, Amazon, Meta, Apple, IBM, Oracle, SAP (not your clients)
- **Large enterprise folks** — TCS, Infosys, Wipro, HCL (not your market)
- Junior devs sharing resource compilations
- Generic AI hype/news roundups
- Motivational/career advice posts
- Product plugs from competitors
- Course creators/educators (unless they're also founders)

### Comment Intent
Don't just engage — **demonstrate expertise**. Every comment should subtly show:
- You've built production AI systems
- You understand real-world challenges
- You're the person to call when they need help

### AI-Detection Check
Before finalizing ANY comment, check for these AI tells:
- Words like: arbitrage, defensibility, unlock, leverage, paradigm
- Phrases like: "the real test", "where X lives", "the key insight"
- Replace with simpler words a 10th grader would use

## Approval Workflow (Manual Engagement)

**NEVER auto-post comments.** Always get Ravi's approval first.

Workflow:
1. Find strategic post (matches targeting above)
2. **Query memory first** — run `memory_search` for relevant topics (agents, models, production AI, etc.) to find Ravi's established perspectives
3. Draft 2-3 comment options **using Ravi's known perspectives** from memory
4. Send to Ravi for approval (via WhatsApp)
5. Wait for his pick (A/B/C) or edit request
6. Only then post the comment
7. Update action counter
8. **Log to tracking sheet** — add row to LinkedIn Comment Tracker with date, author, topic, comment, URL

---

## Action Tracking

**Daily limit: 100 actions** (comments, likes, connection requests combined)

Before any LinkedIn action:
1. Read `linkedin-actions.json` in workspace root
2. Check if `date` matches today — if not, reset counter to 0
3. Check if `actions` < `limit` — if at limit, stop and notify user
4. After action, increment counter and log the action

**Counter file:** `/Users/ravikiranvemula/persona/openclaw/linkedin-actions.json`

```json
{
  "date": "YYYY-MM-DD",
  "actions": 0,
  "limit": 100,
  "log": [{ "time": "ISO", "type": "comment|like|connect", "post": "description" }]
}
```

If limit reached, tell user: "Daily LinkedIn limit (100) reached. Resume tomorrow."
