# Cron Integration

Executive outreach runs as a follow-up step after job search, not as a standalone cron.

## Trigger

After job search cron completes with 75%+ matches:

```
Job Search Cron (11:30 AM, 3:30 PM, 7:30 PM)
    ↓
For each job with 75%+ match:
    ↓
Executive Outreach Workflow
    ↓
Nudge: "X executive emails ready for review"
```

## Job Search Integration

Add to job search cron prompt:

```
After finding jobs with 75%+ match:

1. For each high-match job, run executive outreach:
   - Find decision makers (CEO/CTO/VP/Dir) on LinkedIn
   - Research company (why hiring, recent news)
   - Find email (website, patterns)
   - Draft personalized email using executive-outreach skill
   - Log to Executive Outreach Tracker sheet
   - Create Gmail draft (vrknetha@gmail.com)

2. After all drafts created, notify:
   "📧 X executive emails ready for review"
```

## Sheet Details

| Field | Value |
|-------|-------|
| Sheet ID | 1-UsbohlkTifCOgQms13qLURdw8kyVNg1_yqSlfk6sj0 |
| Account | vrknetha@gmail.com |
| Tab | Sheet1 |

## Columns

```
A: Timestamp
B: Company
C: Role
D: Job URL
E: Decision Maker
F: Title
G: LinkedIn
H: Email
I: Why Hiring
J: Draft ID
K: Status
L: Sent At
```

## Status Flow

```
Draft Ready → [Review] → Approved → Sent
                      ↘ Skipped
```

## Review Nudge

Include in review nudge (2 PM, 7 PM, 10 PM):

```
📧 Executive Outreach:
- X drafts pending review
- Companies: [List]

🔗 Review: https://docs.google.com/spreadsheets/d/1-UsbohlkTifCOgQms13qLURdw8kyVNg1_yqSlfk6sj0
```

## Manual Trigger

To run executive outreach manually:

```
"Run executive outreach for [Company] [Role]"
"Draft email to [Company] leadership"
"Find CTO at [Company] and draft outreach"
```
