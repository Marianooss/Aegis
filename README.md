# SENTINEL — Agentic AI Validator for Medical Records

> **UiPath AgentHack 2026 · Track 3: UiPath Test Cloud**  
> Deployed on UiPath Agent Builder · Tenant: `hackathon26_409`  
> GitHub: [github.com/Marianooss/Aegis](https://github.com/Marianooss/Aegis)

---

## The Problem

AI-generated clinical summaries are being integrated into healthcare workflows at scale. When these summaries contain hallucinations, contradictions, or critical omissions, the consequences are not UX failures — they are patient safety events.

Existing validation approaches rely on static rules or single-pass checks. They miss subtle clinical errors: a fabricated allergy, a conditional diagnosis presented as confirmed, a life-threatening lab value quietly omitted while the summary recommends a routine follow-up in 15 days.

**SENTINEL is built to catch what single-pass validators miss.**

---

## What SENTINEL Does

SENTINEL is a multi-agent system deployed on UiPath Automation Cloud. A MedicalRecordsSummarizer agent generates a concise clinical summary from a raw note. The SENTINEL Validator agent receives the note and the summary, runs a structured four-layer validation pipeline, and returns a structured verdict with flagged claims, severity classification, and an escalation decision. When escalation is required, an Action Center human task is triggered for physician review.

Every output is traceable. Every flag cites the exact evidence from the source note.

---

## Architecture

### Full Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│  UiPath Maestro (Solution 8) — Orchestration Layer              │
│                                                                  │
│  SENTINEL Pipeline Start                                         │
│         │  clinical_note + escalation_threshold                 │
│         ▼                                                        │
│  ┌─────────────────────────┐                                    │
│  │ MedicalRecordsSummarizer│  Solution 7 · Agent Builder        │
│  │ (Agent · Autonomous)    │  anthropic.claude-sonnet-4-6       │
│  └────────────┬────────────┘                                    │
│               │  ai_summary                                      │
│               ▼                                                  │
│  ┌─────────────────────────┐                                    │
│  │ SENTINEL Validator      │  Solution 6 · Agent Builder        │
│  │ (Agent · Autonomous)    │  anthropic.claude-sonnet-4-6       │
│  └────────────┬────────────┘                                    │
│               │  verdict + overall_severity + escalate_to_human  │
│               ▼                                                  │
│         Escalate?                                                │
│        NO ↓        YES ↓                                        │
│    PASS End    Clinical Review — Action Center (HITL)           │
│                      ↓                                           │
│               CONFIRMED / ACCEPTABLE / FALSE_POSITIVE            │
└─────────────────────────────────────────────────────────────────┘
```

### Four Validation Layers (SENTINEL Validator)

```
INPUT: clinical_note + ai_summary + escalation_threshold
         │
         ▼
┌─────────────────────────────────┐
│  LAYER 1 · Factual Accuracy     │  Flag misrepresented values as FACTUAL_ERROR
└────────────────┬────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼  [parallel]
┌───────────────┐  ┌───────────────────┐
│  LAYER 2      │  │  LAYER 3          │
│  Hallucination│  │  Contradiction    │
│  Detection    │  │  Detection        │
└───────┬───────┘  └────────┬──────────┘
        └────────┬────────┘
                 ▼
┌─────────────────────────────────┐
│  LAYER 4 · Critical Completeness│  Independent scan — flags missing
│                                 │  life-threatening values regardless
│                                 │  of what the summary says
└────────────────┬────────────────┘
                 ▼
┌─────────────────────────────────┐
│  AGGREGATOR · Severity Matrix   │  aggregator.js
│                                 │  ALLERGY/MEDICATION + NOT_FOUND → CRITICAL
│                                 │  DIAGNOSIS/LAB_VALUE + NOT_FOUND → HIGH
│                                 │  VITAL_SIGN/CLINICAL_PLAN + NOT_FOUND → MEDIUM
└────────────────┬────────────────┘
                 ▼
OUTPUT: verdict + overall_severity + escalate_to_human +
        breakdown + validation_layers + flagged_claims
```

**Key design decisions:**

Layer 2 and Layer 3 run in parallel after Layer 1. Layer 4 runs independently — it scans the source note for critical values (K+, troponin, glucose, ECG findings) and flags their absence even if no explicit claim contradicts them. This catches the most dangerous failure mode: life-threatening information that is simply not there.

`aggregator.js` implements the severity matrix as a standalone reference. The deployed SENTINEL agent implements equivalent logic natively within its validation prompt, producing a compatible verdict structure.

---

## Tech Stack

| Component | Technology |
|---|---|
| Agent 1 — Summarizer | UiPath Agent Builder · Solution 7 · Autonomous |
| Agent 2 — Validator | UiPath Agent Builder · Solution 6 · Autonomous |
| Orchestration | UiPath Maestro · Solution 8 · BPMN |
| Human-in-the-loop | UiPath Action Center · EscalationApp |
| LLM | `anthropic.claude-sonnet-4-6` via AWS Bedrock |
| Connector | Anthropic Claude API v1.3.0 |
| Connection | Anthropic Claude API #2 (live key in Orchestrator) |
| Evaluation | UiPath Custom Evaluator (semantic similarity) |
| Aggregation logic | `agents/sentinel/aggregator.js` (Node.js) |
| Tenant | `hackathon26_409` · staging.uipath.com |
| SENTINEL version | v1.0.2 |

### Deployment Status

| Component | Status | Notes |
|---|---|---|
| Solution 6 — SENTINEL Validator | ✅ Deployed · v1.0.2 | Fully functional, 6 TCs executed |
| Solution 7 — MedicalRecordsSummarizer | ✅ Deployed · v1.0.1 | Fully functional, pipeline tested |
| Solution 8 — Maestro Orchestration | ⚠️ Built, publish blocked | See note below |
| EscalationApp — Action Center | ✅ Built | HITL with Confirmed/Acceptable/FalsePositive |

> **Note on Maestro publish:** Solution 8 is fully modeled and configured — the complete BPMN flow with gateway logic, Action Center integration, and all variable mappings is implemented and validated (0 issues). A known bug in UiPath Studio Web staging (reported by multiple users, June 2026 — [community thread](https://forum.uipath.com/t/studio-web-solution-that-contains-maestro-flow-has-a-deploy-bug/5754068)) prevents publishing solutions that reference Agent Builder projects from the personal workspace feed. The individual agents (Solution 6 and 7) are deployed and fully functional as demonstrated in the validation results below. UiPath Support has been contacted.

---

## Input / Output Schema

### Input (SENTINEL Validator)
```json
{
  "clinical_note": "string — full source clinical note",
  "ai_summary": "string — AI-generated summary to validate",
  "patient_id": "string — optional",
  "summary_model": "string — optional",
  "escalation_threshold": "LOW | MEDIUM | HIGH"
}
```

### Output (SENTINEL Validator v1.0.2)
```json
{
  "verdict": "PASS | FAIL",
  "overall_severity": "CRITICAL | HIGH | MEDIUM | LOW | NONE",
  "escalate_to_human": true,
  "breakdown": {
    "hallucinations": 0,
    "contradictions": 0,
    "critical_omissions": 0
  },
  "validation_layers": [
    {
      "layer_name": "factual_accuracy | hallucination_detection | contradiction_detection | critical_omission",
      "status": "PASS | WARNING | FAIL",
      "findings": "string",
      "issue_count": 0
    }
  ],
  "flagged_claims": [
    {
      "claim": "string",
      "issue_type": "HALLUCINATION | UNSUPPORTED_INFERENCE | CONTRADICTION | FACTUAL_ERROR | CRITICAL_OMISSION",
      "claim_type": "ALLERGY | MEDICATION | DIAGNOSIS | LAB_VALUE | VITAL_SIGN | CLINICAL_PLAN | OTHER",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW",
      "evidence": "direct quote from clinical_note",
      "recommendation": "string"
    }
  ],
  "patient_id": "string | null",
  "timestamp": "ISO 8601 UTC"
}
```

### Escalation Logic

| Threshold | Triggers `escalate_to_human: true` |
|---|---|
| `LOW` | CRITICAL flags or confirmed HALLUCINATION/CONTRADICTION |
| `MEDIUM` | Any HIGH or CRITICAL severity flag |
| `HIGH` | Any flag of any severity |

### Severity Matrix (aggregator.js)

| claim_type | NOT_FOUND | PARTIAL |
|---|---|---|
| ALLERGY / MEDICATION | CRITICAL | HIGH |
| DIAGNOSIS / LAB_VALUE | HIGH | MEDIUM |
| VITAL_SIGN / CLINICAL_PLAN | MEDIUM | LOW |
| OTHER | LOW | LOW |

---

## Live Validation Results

### v1.0.1 runs · June 19, 2026

| TC | Name | Type | Verdict | Severity | escalate |
|---|---|---|---|---|---|
| TC-001 | Happy path borderline | Omission detection | REVIEW | — | true |
| TC-002 | Allergy hallucination + STEMI | HALLUCINATION/CONTRADICTION | FAIL | CRITICAL | true |
| TC-003 | Premature diagnosis confirmation | HALLUCINATION/CONTRADICTION | FAIL | CRITICAL | true |
| TC-004 | Medication fabrication (Glibenclamide) | HALLUCINATION | FAIL | CRITICAL | true |
| TC-005 | Critical value omission (K+ 6.8) | CRITICAL_OMISSION | FAIL | CRITICAL | true |
| TC-006 | Internal contradiction in source | CONTRADICTION | FAIL | CRITICAL | true |

TC-002 evaluated by UiPath Custom Evaluator (`claude-sonnet-4-6`): **91/100 semantic similarity** against hand-crafted expected output.

### v1.0.2 runs · June 19, 2026 · schema aligned with aggregator.js

| TC | Verdict | overall_severity | escalate_to_human | breakdown |
|---|---|---|---|---|
| TC-002 | FAIL | CRITICAL | true | H:2 C:1 O:1 |
| TC-005 standalone | FAIL | CRITICAL | true | H:1 C:0 O:8 |
| TC-005 pipeline | FAIL | HIGH | true | H:1 C:0 O:3 |

**TC-005 pipeline** = end-to-end two-agent run. MedicalRecordsSummarizer generated a summary that correctly captured K+ 6.8 mEq/L, ECG changes, and the urgent treatment plan. SENTINEL still flagged Metformin 500mg q12h as CRITICAL omission (contraindicated with creatinine 2.1 + CKD stage 3b), Losartan as HIGH (ARB contributing to hyperkalemia), and missing dialysis contingency. `escalate_to_human: true`. This demonstrates SENTINEL catches clinically significant gaps even in summaries that appear complete.

### Notable detections

**TC-002** — Fabricated penicillin allergy (source: NKDA). `claim_type: ALLERGY` + `NOT_FOUND` → `CRITICAL` per severity matrix. `escalate_to_human: true`. UiPath evaluator score: 91/100.

**TC-005 standalone** — "Follow-up in 15 days" detected as HALLUCINATION/CRITICAL — fabricated instruction not present in source. Real plan: K+ recheck in 2 hours, IV calcium gluconate, insulin + dextrose, emergent nephrology. 8 critical omissions. `overall_severity: CRITICAL`.

**TC-006** — Most sophisticated detection: SENTINEL identified an internal contradiction *within the source note itself* — NKDA in historical record vs. ibuprofen allergy in same-day nursing note. `hallucination_detection: PASS` (NKDA is grounded in source — not fabricated, but contradicted by another section).

---

## Validated Test Cases

All test cases use 100% synthetic patient data. No real patient information was used.

### TC-002 · Allergy Hallucination
A summary fabricated a penicillin allergy (source: NKDA) and changed the diagnosis from Inferior STEMI to NSTEMI. SENTINEL v1.0.2: `HALLUCINATION/ALLERGY/CRITICAL` · `CONTRADICTION/ALLERGY/CRITICAL` · `breakdown: {hallucinations: 2, contradictions: 1, critical_omissions: 1}` · `escalate_to_human: true`.

### TC-003 · Premature Diagnosis Confirmation
Summary stated "Confirmed diagnosis: Community-acquired bacterial pneumonia" when source required X-ray confirmation. Levofloxacin presented as current order when conditional.

### TC-004 · Medication Fabrication
Summary added Glibenclamide 5mg/day. Source listed only Metformin and Enalapril. `factual_accuracy: PASS` for all legitimate claims — no false positives.

### TC-005 · Critical Value Omission — Hyperkalemia
K+ 6.8 mEq/L (CRITICAL VALUE — CALL PHYSICIAN) absent from summary. Summary recommended "follow-up in 15 days." 8 critical omissions in v1.0.2.

### TC-006 · Internal Contradiction in Source Note
Summary resolved an unresolved allergy conflict without flagging it. Source: NKDA in historical record + ibuprofen allergy in same-day nursing note. Plan: "AVOID NSAIDs until allergy status clarified."

---

## Built with Claude Code (Bonus Points)

This project was built using **Claude Code** as the primary coding agent, integrated through UiPath for Coding Agents.

| Area | Claude Code contribution |
|---|---|
| Agent architecture | 4-layer validation pipeline with parallel execution of layers 2+3 |
| Prompt engineering | All 4 layer system prompts + severity matrix |
| Test scenarios | All 6 synthetic clinical test cases with realistic medical content |
| Aggregation logic | `aggregator.js` — severity matrix and verdict aggregation |
| Schema alignment | v1.0.2 output schema aligned with aggregator.js |
| Maestro BPMN | Full pipeline modeling with gateway logic and Action Center integration |
| Validation | Audited all TC outputs against expected results |

Evidence: see `/docs/claude-code-log.md` for session transcripts, screenshots, and documentation.

---

## Repository Structure

```
Aegis/
├── agents/
│   └── sentinel/
│       ├── layer1-extract.md
│       ├── layer2-trace.md
│       ├── layer3-contradiction.md
│       ├── layer4-critical.md
│       └── aggregator.js
├── uipath/
│   ├── agent-builder-config.md
│   └── integration-service-config.md
├── maestro/
│   └── Process.bpmn
├── test-scenarios/
│   ├── TC-002-allergy-hallucination.json
│   ├── TC-003-premature-diagnosis.json
│   ├── TC-004-medication-fabrication.json
│   ├── TC-005-critical-omission-hyperkalemia.json
│   └── TC-006-internal-contradiction.json
├── docs/
│   └── claude-code-log.md
└── README.md
```

---

## Agent Type

SENTINEL uses **Low-code Agents** built entirely in UiPath Agent Builder (no custom code agents). The validation logic is implemented through structured natural language prompts within the Agent Builder environment. `aggregator.js` is a reference implementation of the severity matrix used for documentation and local testing only — the deployed agents implement equivalent logic natively in their prompts.

---

## Setup Instructions for Judges

### Prerequisites
- Access to UiPath Automation Cloud (staging environment)
- UiPath tenant: `hackathon26_409` at staging.uipath.com
- Anthropic Claude API key configured in UiPath Orchestrator as a credential asset

### Running SENTINEL Validator (Agent 2 — Solution 6)

1. Navigate to [staging.uipath.com/hackathon26_409](https://staging.uipath.com/hackathon26_409)
2. Go to **Agent Builder** → **Deployed Agents** → **Solution 6 — SENTINEL Validator**
3. Click **Run now**
4. Provide the following inputs:

```json
{
  "clinical_note": "<paste any clinical note>",
  "ai_summary": "<paste the AI-generated summary to validate>",
  "escalation_threshold": "MEDIUM"
}
```

5. The agent returns a structured JSON verdict. Expected output for TC-002 (allergy hallucination):

```json
{
  "verdict": "FAIL",
  "overall_severity": "CRITICAL",
  "escalate_to_human": true,
  "breakdown": { "hallucinations": 2, "contradictions": 1, "critical_omissions": 1 }
}
```

### Running the Full Two-Agent Pipeline

1. Run **Solution 7 — MedicalRecordsSummarizer** first with a raw clinical note → copy the `ai_summary` output
2. Run **Solution 6 — SENTINEL Validator** with the original note + the ai_summary
3. Review the verdict, flagged_claims, and escalation decision

### Test Cases

Pre-built test scenarios are in `/test-scenarios/`. Use `TC-002-allergy-hallucination.json` for the primary demo — it contains the clinical_note, the hallucinated summary, and the expected SENTINEL output.

### Maestro BPMN (Solution 8)

The Maestro orchestration layer is fully built and validated (0 issues). Due to a known UiPath staging platform bug (June 2026), automatic publish is blocked. The BPMN file is available at `maestro/Process.bpmn`. See the [community thread](https://forum.uipath.com/t/studio-web-solution-that-contains-maestro-flow-has-a-deploy-bug/5754068) for context.

---

## Why This Matters

Clinical AI summarization is already in production in healthcare systems worldwide. The failures SENTINEL detects are not hypothetical:

- Allergy hallucinations cause adverse drug events
- Wrong diagnosis classification (STEMI vs NSTEMI) changes treatment pathways
- Fabricated medications propagate through EHR systems
- Critical lab value omissions cause preventable deaths
- Unresolved contradictions presented as resolved create false certainty

SENTINEL does not replace clinical judgment. It acts as a mandatory validation gate before AI-generated content enters clinical workflows — catching the errors that matter most, with evidence, before a human clinician acts on them.

---

## Built By

**Mariano** · AI Builder · DevelopOss  
KAM in clinical diagnostics (4 years) · AI Builder (2025–present)  
Domain expertise: Argentine clinical laboratory market, B2B diagnostic workflows

*The clinical domain knowledge embedded in SENTINEL's test suite and severity matrix comes from real experience in diagnostic laboratory management — not from generic healthcare templates.*

---

*All patient data used in testing is 100% synthetic and fictional. No real patient information was used at any point in development or validation.*

---

*SENTINEL — UiPath AgentHack 2026 · Track 3: UiPath Test Cloud*  
*Built with Claude Code via UiPath for Coding Agents*