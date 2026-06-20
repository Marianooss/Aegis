# SENTINEL — Agentic AI-Workflow Validator

> **UiPath AgentHack 2026 · Track 3: UiPath Test Cloud**

SENTINEL is an agentic quality-control system that tests AI agents embedded in
enterprise workflows before their errors reach production.

It targets the core risk of AI-infused automation: a model can be wrong in ways
that look fluent, complete, and plausible. In healthcare, that means a medical
records summarizer can fabricate an allergy that doesn't exist, or omit a
critical lab value that requires immediate attention. SENTINEL catches those
failures automatically, generates structured test scenarios from clinical
requirements, and escalates only real failures to a human reviewer.

**The problem in one line:** Who validates the AI agent inside your UiPath workflow?

---

## What SENTINEL Does

SENTINEL orchestrates a two-agent pipeline on UiPath Automation Cloud:

**Agent 1 — Medical Records Summarizer**
Reads raw clinical notes and produces structured summaries (diagnoses,
medications, allergies, critical values) that clinicians use for decisions.
This is the agent under test.

**Agent 2 — SENTINEL Validator**
Receives the original note and the summarizer's output. Applies a 4-layer
Citation Enforcement engine to detect hallucinations, contradictions, and
critical omissions before the summary reaches the care team.

```
Test Cloud (6 scenarios)
  → Medical Records Summarizer (Agent Builder + Claude API)
  → SENTINEL Validator (Agent Builder + 4-layer engine)
  → IF failure detected → Action Center (human review)
  → Test Cloud records verdict → Coverage Report
```

### The 4-Layer Engine

| Layer | Name | What it detects |
|-------|------|-----------------|
| 1 | Extract | Decomposes summary into atomic, verifiable claims |
| 2 | Trace | Checks each claim has supporting evidence in the source note |
| 3 | Contradiction | Finds source text that directly contradicts a claim |
| 4 | Critical Completeness | Verifies critical lab values and urgent findings appear in summary |

### Demo Scenario (TC-002)
A clinical note states **"NKDA — No Known Drug Allergies."**
The summarizer hallucinates: *"Patient with documented allergy to penicillin."*
SENTINEL flags this as a **CRITICAL contradiction** in Layer 3.
Action Center surfaces the diff to the physician before the summary is used.

---

## UiPath Components Used

| Component | Role |
|-----------|------|
| **UiPath Test Cloud** | Stores and executes 6 synthetic clinical test scenarios against the Summarizer agent; collects pass/fail results and generates coverage report |
| **UiPath Agent Builder** | Hosts both agents: Medical Records Summarizer and SENTINEL Validator |
| **UiPath Action Center** | Human-in-the-loop gate — surfaces flagged cases with diff view (source note vs. summary) for physician review |
| **UiPath Maestro** | Orchestrates the end-to-end flow: Test Cloud → Summarizer → SENTINEL → Action Center (conditional) → results |
| **Claude API (claude-sonnet-4-6)** | LLM backend for both agents, called via HTTP from Agent Builder |

---

## Agent Type

**Both agents: Coded Agents** — built with UiPath Agent Builder using HTTP
activities to call the Claude API with structured prompts.

The 4-layer validation engine is implemented as sequential Claude API calls
with structured JSON outputs that feed into each other. See `/agents/sentinel/`
for all prompts.

---

## Built with Claude Code

This project was built using **Claude Code** as the primary coding agent,
integrated through UiPath for Coding Agents.

### How Claude Code contributed

| Area | Claude Code contribution |
|------|--------------------------|
| Agent architecture | Designed the 4-layer validation pipeline and data flow between layers |
| Prompt engineering | Wrote and iterated all 4 layer system prompts (Extract, Trace, Contradiction, Critical) |
| Test scenarios | Generated all 6 synthetic clinical test cases with realistic medical content |
| Aggregation logic | Wrote the verdict aggregation function that combines Layer 2/3/4 outputs |
| README | Drafted this document |

### Evidence of Claude Code usage
See `/docs/claude-code-log.md` for:
- Session transcripts and prompt logs
- Screenshots of Claude Code generating specific components
- Description of which outputs were integrated and how

> **UiPath for Coding Agents** was used throughout development.
> This qualifies for the coding agents bonus points per the AgentHack 2026 rules.

---

## The 6 Test Scenarios

| ID | Name | Type | Expected Verdict |
|----|------|------|-----------------|
| TC-001 | Normal note | Happy path | PASS |
| TC-002 | Allergy hallucination | CONTRADICTION (Critical) | FAIL |
| TC-003 | Diagnosis invention | HALLUCINATION (Critical) | FAIL |
| TC-004 | Medication fabrication | HALLUCINATION (High) | FAIL |
| TC-005 | Critical value omission | OMISSION (Critical) | FAIL |
| TC-006 | Contradictory source | Edge case | FAIL if resolved without flag |

All clinical data is 100% synthetic. No real patient records were used.
See `/test-scenarios/` for full JSON definitions.

---

## Setup Instructions

### Prerequisites

- UiPath Automation Cloud account with access to:
  - Agent Builder
  - Test Cloud
  - Action Center
  - Maestro
- Claude API key (Anthropic) — for the LLM backend of both agents
- Node.js 18+ (for local testing only, optional)

### Step 1 — Clone the repository

```bash
git clone https://github.com/[your-username]/sentinel-uipath
cd sentinel-uipath
```

### Step 2 — Configure Claude API in UiPath

1. In UiPath Automation Cloud, go to **Integration Service**
2. Create a new HTTP connector for `https://api.anthropic.com`
3. Add header: `x-api-key: YOUR_ANTHROPIC_API_KEY`
4. Add header: `anthropic-version: 2023-06-01`
5. Save the connector as `anthropic-claude`

### Step 3 — Import the Summarizer Agent

1. Open **Agent Builder** in UiPath Automation Cloud
2. Create a new agent: `MedicalRecordsSummarizer`
3. Add an HTTP Request activity pointing to `anthropic-claude`
4. Load the system prompt from `/agents/summarizer/prompt.md`
5. Set the output schema from `/agents/summarizer/output-schema.json`
6. Publish the agent

### Step 4 — Import SENTINEL Validator Agent

1. Create a new agent in Agent Builder: `SentinelValidator`
2. Add 4 sequential HTTP Request activities (one per layer)
3. Load prompts from:
   - `/agents/sentinel/layer1-extract.md`
   - `/agents/sentinel/layer2-trace.md`
   - `/agents/sentinel/layer3-contradict.md`
   - `/agents/sentinel/layer4-critical.md`
4. Add the aggregation logic (see `/agents/sentinel/aggregator.js`)
5. Connect output to Action Center task when `escalate_to_human = true`
6. Publish the agent

### Step 5 — Configure Action Center task

1. In Action Center, create a task template: `SentinelReviewTask`
2. Fields:
   - `original_note` (text)
   - `summary_output` (text)
   - `flagged_claims` (JSON)
   - `severity` (text)
3. Assign to reviewer group: `clinical-reviewers`

### Step 6 — Load test scenarios in Test Cloud

1. Open **Test Cloud** in UiPath Automation Cloud
2. Create a test set: `SENTINEL-TC-v1`
3. Import all 6 test cases from `/test-scenarios/`
4. Map each test case input to the Summarizer agent input
5. Map each test case expected verdict to the SENTINEL output

### Step 7 — Configure Maestro orchestration

1. Open **Maestro** in UiPath Automation Cloud
2. Import the process definition from `/uipath/maestro-flow.md`
3. Connect:
   - Test Cloud → Summarizer agent
   - Summarizer output → SENTINEL agent
   - SENTINEL verdict → Action Center (conditional on `escalate_to_human`)
   - All results → Test Cloud coverage report

### Step 8 — Run the demo

```
Test Cloud → Execute SENTINEL-TC-v1
  → Observe TC-001 (PASS)
  → Observe TC-002 (FAIL: CRITICAL allergy hallucination → Action Center fires)
  → Review coverage report
```

### Local testing (optional)

To test the Claude API prompts locally before importing to UiPath:

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

node scripts/test-layer.js --layer 2 --scenario TC-002
# Expected output: sentinel_flag: true, contradiction_type: DIRECT
```

---

## Repository Structure

```
sentinel-uipath/
├── README.md
├── LICENSE                          (MIT)
├── .env.example
├── agents/
│   ├── summarizer/
│   │   ├── prompt.md
│   │   └── output-schema.json
│   └── sentinel/
│       ├── layer1-extract.md
│       ├── layer2-trace.md
│       ├── layer3-contradict.md
│       ├── layer4-critical.md
│       └── aggregator.js
├── test-scenarios/
│   ├── TC-001-Normal.json
│   ├── TC-002-AllergyHallucination.json
│   ├── TC-003-DiagnosisInvention.json
│   ├── TC-004-MedicationFabrication.json
│   ├── TC-005-CriticalOmission.json
│   └── TC-006-ContradictoryNote.json
├── scripts/
│   └── test-layer.js                (local prompt testing only)
├── uipath/
│   ├── maestro-flow.md
│   └── action-center-config.md
└── docs/
    ├── architecture.md
    └── claude-code-log.md           (evidence for bonus points)
```

---

## Business Impact

**The problem is real and growing:**
Medical records summarization is an active UiPath product (launched ViVE 2026).
Healthcare organizations are deploying AI agents at scale with insufficient
validation. A misclassified allergy or missed critical lab value can cause
direct patient harm.

**The gap SENTINEL fills:**
Enterprise AI testing today focuses on UI/API validation.
SENTINEL shifts the target to *semantic correctness* of AI outputs —
what the agent *claims* versus what the source *says*.

**Production path:**
Any UiPath customer deploying Document Understanding or AI-infused agents
can adopt SENTINEL as a validation layer. The 4-layer engine is domain-agnostic;
healthcare is the demonstration vertical.

---

## License

MIT — see `LICENSE`

All clinical data in test scenarios is 100% synthetic and fictional.
No real patient information was used at any stage of development.

---

*SENTINEL — UiPath AgentHack 2026 · Track 3: UiPath Test Cloud*
*Built with Claude Code via UiPath for Coding Agents*
