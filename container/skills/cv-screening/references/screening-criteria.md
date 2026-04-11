# CV Screening Criteria for AI Engineers

## The Core Question

**Did they build something REAL that REAL people use?**

Dataset + Model ≠ Real Project. We need evidence of:
- Actual users (not just "tested with friends")
- Real feedback that changed the product
- Deployment beyond localhost
- Problems solved for someone who cared

## Evaluation Tiers

### Tier 1: Shortlist = Yes

**Real-World Validation (MOST IMPORTANT)**
- Project has actual users with specific numbers
- Talked to real stakeholders (farmers, doctors, lawyers, etc.)
- Shows iteration based on real feedback
- Deployed in production environment
- Metrics tied to real business impact

**Project Depth**
- Built end-to-end, not just the ML part
- Can explain architecture decisions and trade-offs
- Mentions scale, performance, or production issues
- Has working demos, deployed apps, or documented repos

**Problem-Solving Evidence**
- Describes specific challenges and how they solved them
- Mentions failures, debugging, iteration
- Shows learning from mistakes
- Can explain what they'd do differently

**Good GitHub Signals**
- Original repos (not forked)
- Well-documented READMEs
- Repos over time (not all created last month)
- Some stars/forks = others found it useful
- Solo contributor on claimed projects

### Tier 2: moved into No

If real-user proof/ownership is unclear, mark as **No** and explain the blockers clearly in the verdict summary.

### Tier 3: Shortlist = No

**Tutorial Projects (Instant Reject)**
- Titanic survival prediction
- MNIST digit classifier
- Iris classification
- Boston housing price prediction
- Bangalore/NYC real estate prediction
- Generic "chatbot" with no specific domain
- To-do app, weather app, calculator

**No Real-World Validation (Instant Reject)**
- "Crop disease detection" — never talked to farmers
- "Healthcare diagnosis" — never validated with doctors
- "Fraud detection" — only used Kaggle dataset
- "Sentiment analysis" — just Twitter API + pretrained model
- Any project that starts with "I used X dataset from Kaggle"

**GitHub Red Flags (Instant Reject)**
- All repos are forks
- "Bangalore-Real-Estate-Prediction" repo exists
- All repos created within 2 months of job search
- Zero stars, zero forks on everything
- No READMEs, just dumped Jupyter notebooks
- Multiple contributors but candidate claims solo work

**CV Red Flags**
- Lists 20+ technologies ("AI, ML, DL, NLP, CV, LLM, RAG, Agents...")
- No GitHub or portfolio link
- Generic descriptions ("worked on AI project")
- Claims 2+ years as fresher
- Dates don't add up
- Template CV identical to others

---

## Interview Questions for Non-Technical Recruiters

### Purpose
Recruiters can't evaluate technical depth, but CAN evaluate:
- Communication ability (can they simplify?)
- Honesty (do they admit failures?)
- Ownership (their work vs team work?)
- Real impact (did anyone actually use it?)

### The 5 Must-Ask Questions

#### 1. "Who actually uses this? Give me a number."
**Good:** "50 lawyers at XYZ firm use it daily" / "We had 200 farmers in Telangana pilot it"
**Bad:** "Many users" / "My friends tested it" / "It's deployed" (but no users mentioned)

#### 2. "What was the biggest mistake you made building it?"
**Good:** Specific failure + what they learned + how they fixed it
**Bad:** "Nothing major" / gets defensive / blames others / too perfect

#### 3. "Explain this to someone who doesn't know what AI is."
**Good:** Clear analogy ("It's like a smart search that understands what you mean")
**Bad:** Uses jargon / can't simplify / talks around the question

#### 4. "You mention X% improvement — how did you measure that?"
**Good:** "Compared 100 queries before/after" / "User survey showed..." / "Response time logs"
**Bad:** "The system showed it" / "It felt faster" / can't explain methodology

#### 5. "Did you build this alone? What was YOUR specific part?"
**Good:** "I built the backend API, my teammate did the frontend, we both did testing"
**Bad:** Always says "we" / can't specify individual contribution / vague

### Additional Questions by Situation

#### If GitHub has multiple contributors:
- "I see 3 contributors. Which features did YOU write?"
- "Walk me through a pull request you made."

#### If project claims impressive metrics:
- "92% accuracy sounds great — what happens in the 8% failure cases?"
- "28% efficiency improvement — was this measured in simulation or real traffic?"

#### If medical/healthcare project:
- "Did any doctors or nurses actually use this?"
- "What happens if it wrongly tells someone they're healthy?"
- "Where did you get the medical data from?"
- **No doctor validation = reject regardless of technical quality**

#### If all projects are recent:
- "I notice all your projects are from the last 3 months. What were you building before?"
- "Walk me through your learning journey — what did you build first?"

### Red Flag Answer Patterns

| Pattern | What It Signals |
|---------|-----------------|
| "Many users" without numbers | No real users |
| "Nothing went wrong" | Either lying or didn't push boundaries |
| Can't explain simply | Doesn't deeply understand it |
| Always says "we" | May not have done the work |
| Gets defensive | Insecure about their contribution |
| Recites textbook definitions | Memorized, didn't internalize |
| Can't answer follow-ups | Surface-level knowledge |

### Green Flag Answer Patterns

| Pattern | What It Signals |
|---------|-----------------|
| Specific numbers | Actually measured, actually deployed |
| Admits failure + lesson | Honest, growth mindset |
| Clear simple explanation | Deep understanding |
| "I did X, teammate did Y" | Clear ownership, teamwork |
| Mentions edge cases | Thought about real-world use |
| Says "I don't know" appropriately | Honest about limits |

---

## GitHub Analysis Checklist

### Step 1: Find Their Profile
```bash
curl -s "https://api.github.com/search/users?q=<name>" | jq '.items[:3] | .[].login'
```

### Step 2: List Repos
```bash
curl -s "https://api.github.com/users/<username>/repos?sort=updated&per_page=10" | jq '.[] | {name, fork, forks_count, stargazers_count, created_at}'
```

### Step 3: Check Contributors (if claimed solo)
```bash
curl -s "https://api.github.com/repos/<username>/<repo>/contributors" | jq '.[].login'
```

### Step 4: Read README
```bash
# Use web_fetch on the repo URL to see README content
```

### What to Look For

| Check | Good | Bad |
|-------|------|-----|
| Fork status | `fork: false` | `fork: true` on main projects |
| Stars | Some stars (even 1-2) | 0 stars on everything |
| Creation dates | Spread over months/years | All within last 2 months |
| Contributors | Matches CV claim | Multiple when claims solo |
| README | Exists, explains project | No README or empty |
| Repo names | Descriptive, original | "Titanic-Survival", "MNIST-Classifier" |

### Instant Reject GitHub Patterns
- Has repo named "Bangalore-Real-Estate-Prediction"
- Has repo named "Titanic-Survival-Prediction"  
- All repos forked from course/tutorial repos
- Account created last month with 10 repos
- Same project appears on multiple candidates (template)
