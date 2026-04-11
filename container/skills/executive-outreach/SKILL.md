---
name: executive-outreach
description: This skill should be used when the user asks to "draft executive emails", "find decision makers", "outreach to CTO/CEO", "create job outreach", or when processing job search results to contact company leadership instead of applying through HR channels.
  - executive outreach
  - cold email
  - decision maker
  - CTO email
  - CEO outreach
  - job search follow-up
  - personalized outreach
patterns:
  - (draft|create|write).*?(executive|outreach|cold).*?email
  - (find|contact|reach).*?(cto|ceo|vp|director)
  - outreach.*?(leadership|decision maker)
---

# Executive Outreach

Automated outreach to decision makers (CEO, CTO, VP, Director) after job search identifies high-match opportunities. Creates personalized Gmail drafts for review before sending.

## Core Workflow

```
Job Match (75%+) → Find Leadership → Research → Draft Email → Track → Review → Send
```

### 1. Find Decision Makers

Search LinkedIn for company leadership:
- Target: CEO, CTO, VP Engineering, Director of Engineering
- Avoid: HR, Recruiters, Talent Acquisition
- Prefer: 1st/2nd degree connections
- Use the default browser target (OpenClaw-managed browser profile)

```
LinkedIn search: "[Title] [Company]"
Example: "CTO Foodsmart"
```

### 2. Research Company

Gather context for personalization:

| Research Point | Source |
|----------------|--------|
| Why hiring | Press releases, funding news, LinkedIn posts |
| Recent news | Google News, company blog |
| Leadership changes | LinkedIn (new CTO = building team) |
| Tech focus | Job descriptions, engineering blog |

### 3. Find Email

Check sources in order:
1. Company website (team/about/contact pages)
2. Press release contacts
3. Pattern matching: `firstname@`, `firstname.lastname@`, `f.lastname@`

Note email confidence in tracker. Verify before sending.

### 4. Draft Email

Create Gmail draft with personalized content. Follow writing rules strictly.

```bash
gog gmail drafts create \
  --to "email@company.com" \
  --subject "Subject line" \
  --account vrknetha@gmail.com \
  --body-file /tmp/email.txt
```

### 5. Track in Sheet

Log to Executive Outreach Tracker:

| Field | Content |
|-------|---------|
| Sheet ID | 1-UsbohlkTifCOgQms13qLURdw8kyVNg1_yqSlfk6sj0 |
| Account | vrknetha@gmail.com |

Columns: Timestamp, Company, Role, Job URL, Decision Maker, Title, LinkedIn, Email, Subject, Draft ID, Status, Result

### 6. Review Session

When reviewing pending outreach:

1. Pull drafts with Status = "Draft Ready"
2. Show: Company, Role, Decision Maker, Subject, Full email preview
3. Ravi approves / edits / skips
4. Send approved: `gog gmail send --to X --subject Y --body-file Z --account vrknetha@gmail.com`
5. Update tracker: Status = "Sent"

## Writing Rules (CRITICAL)

### Language
- **No abbreviations:** Write "engineering" not "eng", "organisation" not "org"
- **Conversational tone:** No bullet points with marketing speak
- **No pipes:** Avoid LinkedIn-style formatting like "Role | Company | Location"
- **Accurate claims:** "Contributed to" not "maintains" unless actively maintaining

### Structure
- Short paragraphs (2-3 sentences max)
- No bullet points in email body — use flowing prose
- Under 150 words total

### Links
- **LinkedIn:** https://www.linkedin.com/in/ravicaw (always use this URL)

### Avoid
- "Ships agentic systems that actually work in production" — too boastful
- Generic marketing phrases
- Overpromising or exaggerating

## Email Template

```
Hi [First Name],

I'm Kai, an AI agent that works for Ravi Kiran.

[PERSONALIZED HOOK - 1-2 sentences about why this role caught attention, referencing research]

Ravi's been doing similar work at KnackLabs — production AI agents, GraphRAG, voice systems. He's also a LangChain Ambassador and has contributed to open source MCP tooling (Firecrawl, LangChain adapters).

If [SPECIFIC GOAL from research] is a priority, he'd be worth a conversation.

LinkedIn: https://www.linkedin.com/in/ravicaw

— Kai
Ravi's AI Agent
```

## Subject Line Patterns (Ranked)

| Rank | Pattern | Example |
|------|---------|---------|
| 1 | Personal + Direct | `[Name] — quick note on your engineering search` |
| 2 | Pattern Interrupt | `Re: [Role] — not from HR` |
| 3 | Novel/Meta | `My AI agent flagged your role` |
| 4 | Research Signal | `For the team you're building` |
| 5 | Challenge-based | `Scaling AI at [Company]? Quick intro` |

### Avoid
- `Found a match — Ravi for [Role]` — too templated
- Any abbreviations in subject: use "engineering" not "eng"
- Salesy subjects: "Perfect candidate!", "Exciting opportunity"

## Status Values

| Status | Meaning |
|--------|---------|
| Draft Ready | Awaiting review |
| Sent | Email sent |
| Replied | Got response |
| Meeting | Call scheduled |
| No Response | 7+ days, no reply |
| Skipped | Ravi passed |

## Bundled Resources

| File | Purpose |
|------|---------|
| `references/email-templates.md` | Complete templates and variations |
| `references/subject-lines.md` | Subject line patterns with examples |
| `references/cron-integration.md` | How this integrates with job search |
| `scripts/draft-email.sh` | Create Gmail draft helper |

## Performance Tracking

Track results in: `bank/outreach/subject-line-performance.md`

Update after each reply to learn what works.
