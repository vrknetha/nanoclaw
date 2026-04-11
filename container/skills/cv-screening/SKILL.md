---
name: cv-screening
description: Screen AI Engineer CVs from Google Drive folders. Run nightly at 2 AM to evaluate candidates and update tracking sheet with shortlist decisions, interview questions, and expected answers. Use when processing fresher/intern CVs for AI engineering roles.
---

# CV Screening Skill

Screen AI Engineer (fresher/intern) CVs. Focus: problem-solving ability, real-world validation, not keywords.

## Infrastructure

| Resource | ID | Account |
|----------|-----|---------|
| CV Folder | `1R42eFB6FIkdgv3LPGszkvobrDIWNeHDI` | ravi@caw.tech |
| Tracking Sheet | `1XI0fyT8LhiIOx36PbR8B6xm0krvmBH1gwY-9nhxayXM` | ravi@caw.tech |

## Role Definition

**AI Engineer ≠ ML Researcher**

✅ Looking for:
- Software developers who build scalable AI-powered systems
- Strong software engineering fundamentals
- System design & scalability thinking
- AI integration skills (APIs, models, orchestration)
- Problem-solving approach (journey, trade-offs)
- **Projects with REAL users** — not just datasets

❌ NOT looking for:
- Pure ML/DL theory specialists
- Fine-tuning experts with no software skills
- Tutorial project collectors

## Workflow

### 1. Scan Drive Folder

`gog drive ls` is paginated; default is 20. You MUST paginate or you will only get first-page CVs.

Get current sheet state (file tracker in column B):
```bash
gog sheets get "1XI0fyT8LhiIOx36PbR8B6xm0krvmBH1gwY-9nhxayXM" "Sheet1!B:B" --json --account ravi@caw.tech
```

Build a file-level matcher from sheet `B` values (`fileId_FileName` format).
Drive file IDs may contain `_`, so do not split by underscore.

```bash
done_refs=$(gog sheets get "1XI0fyT8LhiIOx36PbR8B6xm0krvmBH1gwY-9nhxayXM" "Sheet1!B:B" --json --account ravi@caw.tech | jq -r '.values[1:][]? | .[0] // empty')

is_processed() {
  local fid="$1"
  printf '%s\n' "$done_refs" | grep -Fxq "$fid" || \
    printf '%s\n' "$done_refs" | grep -Fqx "${fid}_"
}
```

Then list date folders under parent with pagination and output only unscreened files (ID not in tracker), even if date already exists in column C:
```bash
parent_page=""
while :; do
  if [ -z "$parent_page" ]; then
    folders=$(gog drive ls --parent 1R42eFB6FIkdgv3LPGszkvobrDIWNeHDI --account ravi@caw.tech --json --max 100)
  else
    folders=$(gog drive ls --parent 1R42eFB6FIkdgv3LPGszkvobrDIWNeHDI --account ravi@caw.tech --json --max 100 --page "$parent_page")
  fi

  echo "$folders" | jq -r '.files[] | select(.name|test("^\d{4}-\d{2}-\d{2}$")) | .name + "\t" + .id' | while IFS=$'\t' read -r folder_name folder_id; do
    page_token=""
    while :; do
      if [ -z "$page_token" ]; then
        page=$(gog drive ls --parent "$folder_id" --account ravi@caw.tech --json --max 100)
      else
        page=$(gog drive ls --parent "$folder_id" --account ravi@caw.tech --json --max 100 --page "$page_token")
      fi

      echo "$page" | jq -r '.files[] | select((.mimeType|startswith("application/vnd.google-apps.folder")|not) and (.name|test("(?i)\.(pdf|docx|txt)$"))) | .id + "\t" + .name' | while IFS=$'\t' read -r fid fname; do
        if is_processed "$fid"; then
          continue
        fi
        echo "$folder_name\t$fid\t$fname"
      done

      page_token=$(echo "$page" | jq -r '.nextPageToken // empty')
      [ -z "$page_token" ] && break
    done
  done

  parent_page=$(echo "$folders" | jq -r '.nextPageToken // empty')
  [ -z "$parent_page" ] && break
done
```

This gives file-level incremental behavior while still covering partial folders.

### 2. Download & Extract CVs (BATCHED)

For each date folder, list files in pages of 100 and keep only IDs not already `is_processed` (file ID-level lookup, not filename).

```bash
page_token=""
while :; do
  if [ -z "$page_token" ]; then
    response=$(gog drive ls --parent <NEW_FOLDER_ID> --account ravi@caw.tech --json --max 100)
  else
    response=$(gog drive ls --parent <NEW_FOLDER_ID> --account ravi@caw.tech --json --max 100 --page "$page_token")
  fi

  echo "$response" | jq -r '.files[] | select((.mimeType|startswith("application/vnd.google-apps.folder")|not) and (.name|test("(?i)\.(pdf|docx|txt)$"))) | .name + "\t" + .id'
  page_token=$(echo "$response" | jq -r '.nextPageToken // empty')
  [ -z "$page_token" ] && break
done
```

Process the filtered list in batches of 25. After each batch is complete and appended to sheet, persist and continue.

```bash
for fileId in <next_batch_file_ids>; do
  gog drive download "$fileId" --account ravi@caw.tech --no-input
  # evaluate and append current batch before next one
done
```

Files download to `~/Library/Application Support/gogcli/drive-downloads/`

Extract text using `uv run` with pdfplumber:
```python
import pdfplumber
with pdfplumber.open(path) as pdf:
    text = '\n\n'.join(p.extract_text() or '' for p in pdf.pages)
```

### 3. Check GitHub (REQUIRED)

If GitHub link in CV, analyze repos:

```bash
# Get user repos
curl -s "https://api.github.com/users/<username>/repos?sort=updated&per_page=10" | jq '.[] | {name, fork, forks_count, stargazers_count, created_at}'

# Check contributors on specific repo
curl -s "https://api.github.com/repos/<username>/<repo>/contributors" | jq '.[].login'
```

**Check for:**
1. **Forked vs Original** — `fork: true` = not their code
2. **Contributors** — Multiple? Ask what THEY specifically did
3. **Stars/Forks** — 0 on everything = no one uses it
4. **Creation dates** — All repos Sept-Dec before job search = padding
5. **README quality** — Dumped Jupyter notebooks vs documented projects

**Instant red flags:**
- "Bangalore-Real-Estate-Prediction" repo
- "Titanic-Survival" repo  
- "MNIST-Classification" as main project
- All repos forked from tutorials

### 4. Evaluate Each CV

Use criteria from `references/screening-criteria.md`.

**Output columns:**
| Column | Description |
|--------|-------------|
| Candidate Name | From CV |
| CV File | Filename |
| Folder Date | YYYY-MM-DD |
| Shortlist | Yes / No / Skip |
| Verdict Summary | 2-3 sentences on decision |
| Key Projects | Notable projects with substance |
| Trade-offs Mentioned | Decision rationale they articulated |
| Interview Questions | 3-5 questions FOR NON-TECHNICAL RECRUITERS |
| Expected Answers | What good/bad answers look like |
| GitHub Analysis | Findings from repo analysis |
| Screened At | Timestamp |

### 5. Update Tracking Sheet

Append rows in batches so partial progress is persisted for large folders.

```bash
gog sheets append "1XI0fyT8LhiIOx36PbR8B6xm0krvmBH1gwY-9nhxayXM" "Sheet1!A:K" --values-json '[["Name", "file.pdf", "2026-02-03", "Yes", "Summary...", "Projects...", "Trade-offs...", "Questions...", "Expected...", "GitHub analysis...", "2026-02-04 02:00"]]'   --input USER_ENTERED --account ravi@caw.tech
```

Run this repeatedly per batch, and append completed rows before moving to the next batch.

## Interview Questions (FOR NON-TECHNICAL RECRUITERS)

**Goal:** Help recruiters judge depth without technical knowledge.

### Must-Ask Questions

1. **Real users:** "Who actually uses this? Give me a number."
2. **Failures:** "What was the biggest mistake you made building it?"
3. **Simplify:** "Explain this to someone who doesn't know what AI is."
4. **Measurement:** "You say X% improvement - how did you measure that?"
5. **Ownership:** "Did you build this alone? What was YOUR specific part?"

### If Multiple GitHub Contributors

- "I see this project has X contributors. What did YOU build?"
- "Who wrote the main feature - you or a teammate?"

### If Medical/Healthcare Project

⚠️ CRITICAL — Must ask:
1. "Did any doctors or nurses actually use this?"
2. "What happens if it wrongly says someone is healthy?"
3. "Where did you get the medical data?"

**No doctor validation = major red flag**

### What Good vs Bad Answers Look Like

| Question | 🚩 Bad Answer | ✅ Good Answer |
|----------|--------------|----------------|
| "Who uses this?" | "Many users" (vague) | "50 lawyers at X firm" |
| "What went wrong?" | "Nothing really" | Specific failure + lesson |
| "Explain simply" | Uses jargon | "It's like a smart search for documents" |
| "How did you measure?" | "The system showed it" | "Compared before/after with 100 queries" |
| "Your part vs team?" | Always says "we" | "I built the API, teammate did frontend" |

## Red Flags (Auto-Reject)

### Project Red Flags
- Titanic, MNIST, generic chatbot = tutorial projects
- "Crop disease detection" with no farmer contact
- "Healthcare AI" with no doctor feedback
- Any ML project with only Kaggle data, no real users
- Built for marks, not for solving real problems

### GitHub Red Flags
- All repos forked, nothing original
- "Bangalore-Real-Estate-Prediction" repo
- All repos created 1-2 months before job search
- 0 stars, 0 forks on everything
- No README, just dumped notebooks

### CV Red Flags
- Lists 20+ technologies without depth
- No GitHub/portfolio links at all
- Generic "worked on AI project" descriptions
- Claims 2+ years as a fresher
- Identical to other candidates (template CV)

## Shortlist Decision

| Projects | Real Users | Trade-offs | GitHub | Decision |
|----------|------------|------------|--------|----------|
| Strong | Yes | Yes | Clean | **Yes** |
| Strong | Yes | Some | Clean | **Yes** |
| Strong | No | Yes | Clean | **No** |
| Moderate | Some | Yes | Mixed | **No** |
| Any | No | No | Forked | **No** |
| Tutorial-level | Any | Any | Any | **No** |

## After Screening

Send summary to Ravi on WhatsApp:
- Total CVs screened
- Shortlist count (Yes/No)
- Top 3 candidates with one-line reason
- Any red flags worth noting
