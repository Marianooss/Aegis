# Aegis Architecture
> Technical documentation for the Aegis validation system

---

## System Overview

Aegis is a two-agent pipeline designed to validate AI-generated medical summaries
before they reach clinical use. It addresses the core risk of AI-infused healthcare
automation: models can be wrong in ways that look fluent, complete, and plausible.

---

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        UIPATH AUTOMATION CLOUD                                │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────┐                                                              │
│  │  TEST CLOUD │                                                              │
│  │  ──────────  │                                                              │
│  │  7 synthetic │                                                              │
│  │  test cases  │  (incl. TC-007 from generator)                                                              │
│  └──────┬──────┘                                                              │
│         │ clinical_note                                                       │
│         ▼                                                                     │
│  ┌─────────────────────────────────────┐                                      │
│  │  AGENT 1: MEDICAL RECORDS SUMMARIZER │                                      │
│  │  ─────────────────────────────────── │                                      │
│  │  Platform: UiPath Agent Builder      │                                      │
│  │  LLM: Claude claude-sonnet-4-6 (via HTTP)    │                                      │
│  │                                       │                                      │
│  │  Input: Raw clinical note             │                                      │
│  │  Output: Structured JSON summary      │                                      │
│  │    - diagnoses[]                      │                                      │
│  │    - medications[]                    │                                      │
│  │    - allergies[]                      │                                      │
│  │    - critical_findings[]              │                                      │
│  │    - summary_text                     │                                      │
│  └──────────────┬──────────────────────┘                                      │
│                 │ summarizer_output                                           │
│                 ▼                                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │  AGENT 2: SENTINEL VALIDATOR                                             │  │
│  │  ───────────────────────────                                             │  │
│  │  Platform: UiPath Agent Builder                                          │  │
│  │  LLM: Claude claude-sonnet-4-6 (via HTTP × 4 layers)                             │  │
│  │                                                                           │  │
│  │  ┌────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                    4-LAYER VALIDATION ENGINE                        │  │  │
│  │  │                                                                      │  │  │
│  │  │  ┌──────────────┐                                                   │  │  │
│  │  │  │   LAYER 1    │  Extract atomic claims from summary               │  │  │
│  │  │  │   EXTRACT    │  Output: claims[] with IDs and types              │  │  │
│  │  │  └──────┬───────┘                                                   │  │  │
│  │  │         │                                                            │  │  │
│  │  │         ├────────────────────────┬─────────────────────────────┐    │  │  │
│  │  │         │                        │                             │    │  │  │
│  │  │         ▼                        ▼                             │    │  │  │
│  │  │  ┌──────────────┐        ┌──────────────┐                      │    │  │  │
│  │  │  │   LAYER 2    │        │   LAYER 3    │   ← PARALLEL         │    │  │  │
│  │  │  │    TRACE     │        │ CONTRADICTION│                      │    │  │  │
│  │  │  │              │        │              │                      │    │  │  │
│  │  │  │ Find evidence│        │ Find text    │                      │    │  │  │
│  │  │  │ in source    │        │ that opposes │                      │    │  │  │
│  │  │  │              │        │ claims       │                      │    │  │  │
│  │  │  │ NOT_FOUND →  │        │ DIRECT →     │                      │    │  │  │
│  │  │  │ HALLUCINATION│        │ CONTRADICTION│                      │    │  │  │
│  │  │  └──────┬───────┘        └──────┬───────┘                      │    │  │  │
│  │  │         │                        │                             │    │  │  │
│  │  │         └────────────┬───────────┘                             │    │  │  │
│  │  │                      │                                         │    │  │  │
│  │  │  ┌──────────────┐    │                                         │    │  │  │
│  │  │  │   LAYER 4    │    │   ← INDEPENDENT (runs in parallel)     │    │  │  │
│  │  │  │   CRITICAL   │◄───┼───────────────────────────────────────┘    │  │  │
│  │  │  │              │    │                                             │  │  │
│  │  │  │ Scan source  │    │                                             │  │  │
│  │  │  │ for critical │    │                                             │  │  │
│  │  │  │ values       │    │                                             │  │  │
│  │  │  │              │    │                                             │  │  │
│  │  │  │ Missing →    │    │                                             │  │  │
│  │  │  │ OMISSION     │    │                                             │  │  │
│  │  │  └──────┬───────┘    │                                             │  │  │
│  │  │         │            │                                             │  │  │
│  │  │         └────────────┼─────────────────────────────────────────┐  │  │  │
│  │  │                      │                                         │  │  │  │
│  │  │                      ▼                                         │  │  │  │
│  │  │              ┌───────────────┐                                 │  │  │  │
│  │  │              │  AGGREGATOR   │                                 │  │  │  │
│  │  │              │  ───────────  │                                 │  │  │  │
│  │  │              │  Combine L2+  │                                 │  │  │  │
│  │  │              │  L3+L4 flags  │                                 │  │  │  │
│  │  │              │               │                                 │  │  │  │
│  │  │              │  Output:      │                                 │  │  │  │
│  │  │              │  - verdict    │  (FAIL → Correction + Re-validate)│  │  │  │
│  │  │              │  - severity   │                                 │  │  │  │
│  │  │              │  - escalate?  │                                 │  │  │  │
│  │  │              └───────┬───────┘                                 │  │  │  │
│  │  │                      │                                         │  │  │  │
│  │  └──────────────────────┼─────────────────────────────────────────┘  │  │
│  │                         │ sentinel_verdict                           │  │
│  └─────────────────────────┼───────────────────────────────────────────┘  │
│                            │                                              │
│                            ▼                                              │
│                 ┌──────────────────────┐                                  │
│                 │  DECISION GATE       │                                  │
│                 │  ──────────────      │                                  │
│                 │  escalate_to_human?  │                                  │
│                 └──────────┬───────────┘                                  │
│                            │                                              │
│              ┌─────────────┴─────────────┐                                │
│              │                           │                                │
│         escalate=true              escalate=false                         │
│              │                           │                                │
│              ▼                           ▼                                │
│  ┌──────────────────────┐    ┌──────────────────────┐                     │
│  │    ACTION CENTER     │    │      TEST CLOUD      │                     │
│  │    ─────────────     │    │      ──────────      │                     │
│  │                      │    │                      │                     │
│  │  Human reviews:      │    │  Record result:      │                     │
│  │  - Source note       │    │  - PASS / FAIL       │                     │
│  │  - Summary           │    │  - No human needed   │                     │
│  │  - Flagged claims    │    │                      │                     │
│  │                      │    │                      │                     │
│  │  Decision:           │    │                      │                     │
│  │  - CONFIRMED         │────┼─────────────────────▶│                     │
│  │  - ACCEPTABLE        │    │                      │                     │
│  │  - FALSE_POSITIVE    │    │                      │                     │
│  └──────────────────────┘    └──────────────────────┘                     │
│                                        │                                  │
│                                        ▼                                  │
│                              ┌──────────────────────┐                     │
│                              │   COVERAGE REPORT    │                     │
│                              │   ───────────────    │                     │
│                              │   7/7 scenarios run  │                     │
│                              │   Pass rate: X%      │                     │
│                              │   Escalated: Y       │                     │
│                              └──────────────────────┘                     │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Layer Details

### Layer 1: Extract

**Purpose**: Decompose summary into atomic, verifiable claims.

**Input**: Summary text from Summarizer agent
**Output**: Array of claims with IDs and types

**Claim Types**:
- DIAGNOSIS
- MEDICATION
- ALLERGY
- LAB_VALUE
- VITAL_SIGN
- CLINICAL_PLAN
- OTHER

**Example**:
```
Input: "Patient with documented allergy to penicillin. Amoxicillin avoided."

Output:
[
  { id: "C001", text: "Patient has allergy to penicillin", type: "ALLERGY" },
  { id: "C002", text: "Amoxicillin was avoided", type: "CLINICAL_PLAN" }
]
```

---

### Layer 2: Trace (Citation Check)

**Purpose**: For each claim, find supporting evidence in source.

**Input**: Source note + Layer 1 claims
**Output**: Trace results with status per claim

**Statuses**:
- FOUND: Clear evidence in source
- NOT_FOUND: No evidence (hallucination)
- PARTIAL: Weak or incomplete evidence

**Flag Rule**: `sentinel_flag = true` if NOT_FOUND or PARTIAL

---

### Layer 3: Contradiction

**Purpose**: For each claim, find text that directly opposes it.

**Input**: Source note + Layer 1 claims
**Output**: Contradiction results with type and severity

**Types**:
- DIRECT: Source explicitly states opposite
- PARTIAL: Source creates ambiguity
- NONE: No contradiction

**Severity**:
- CRITICAL: Direct contradiction on clinical data (allergy, medication, diagnosis)
- HIGH: Direct contradiction on clinical plan or non-clinical data
- MEDIUM: Partial contradiction

---

### Layer 4: Critical Completeness

**Purpose**: Independent scan for critical values that MUST appear in summary.

**Input**: Source note + Summary (independent of Layer 1)
**Output**: Critical items found and their representation status

**Critical Value Thresholds**:
- K+ > 6.0 or < 2.5 mEq/L
- Na+ > 155 or < 125 mEq/L
- Glucose > 500 or < 40 mg/dL
- Hemoglobin < 7 g/dL
- Any value marked CRITICAL, URGENT, STAT

**Flag Rule**: `sentinel_flag = true` if critical item is missing or inadequately flagged

---

## Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA STRUCTURES                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  TEST SCENARIO (input)                                                   │
│  {                                                                       │
│    test_case_id: "TC-002",                                               │
│    clinical_note: "Paciente femenina...",                                │
│    expected_verdict: "FAIL",                                             │
│    expected_severity: "CRITICAL"                                         │
│  }                                                                       │
│                                                                          │
│       │                                                                  │
│       ▼                                                                  │
│                                                                          │
│  SUMMARIZER OUTPUT                                                       │
│  {                                                                       │
│    diagnoses: [...],                                                     │
│    medications: [...],                                                   │
│    allergies: [{ allergen: "Penicilina", ... }],  ← HALLUCINATED        │
│    summary_text: "Paciente con alergia documentada..."                   │
│  }                                                                       │
│                                                                          │
│       │                                                                  │
│       ▼                                                                  │
│                                                                          │
│  LAYER 1 OUTPUT                                                          │
│  {                                                                       │
│    claims: [                                                             │
│      { claim_id: "C001", claim_text: "Allergy to penicillin", ... },     │
│      { claim_id: "C002", claim_text: "Amoxicillin avoided", ... }        │
│    ],                                                                    │
│    total_claims: 2                                                       │
│  }                                                                       │
│                                                                          │
│       │                                                                  │
│       ├──────────────────────────┬───────────────────────────┐          │
│       ▼                          ▼                           ▼          │
│                                                                          │
│  LAYER 2 OUTPUT          LAYER 3 OUTPUT           LAYER 4 OUTPUT        │
│  {                       {                        {                      │
│    trace_results: [        contradiction_results:   critical_scan: {     │
│      {                       [                        critical_items: [], │
│        claim_id: "C001",       {                      total_critical: 0  │
│        status: "NOT_FOUND",      claim_id: "C001",   }                   │
│        sentinel_flag: true       contradiction:    }                     │
│      }                             "DIRECT",                             │
│    ]                             severity:                               │
│  }                                 "CRITICAL",                           │
│                                  sentinel_flag:                          │
│                                    true                                  │
│       │                        }                                         │
│       │                      ]                                           │
│       │                    }                           │                 │
│       │                      │                         │                 │
│       └──────────────────────┼─────────────────────────┘                 │
│                              ▼                                           │
│                                                                          │
│  AGGREGATED VERDICT                                                      │
│  {                                                                       │
│    verdict: "FAIL",                                                      │
│    overall_severity: "CRITICAL",                                         │
│    escalate_to_human: true,                                              │
│    flagged_claims: [                                                     │
│      {                                                                   │
│        claim_id: "C001",                                                 │
│        claim_text: "Allergy to penicillin",                              │
│        failure_type: "CONTRADICTION",                                    │
│        severity: "CRITICAL",                                             │
│        evidence: "Sin alergias conocidas (NKDA)"                         │
│      }                                                                   │
│    ],                                                                    │
│    total_flagged: 1                                                      │
│  }                                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Pipeline Extensions

### Scenario Generator

**Purpose:** Generate new clinically-plausible test cases from a plain-English requirement string.

**Location:** `src/core/scenario-generator.js`

**How it works:**
- Reads existing TC-001..TC-006 as few-shot examples
- Calls Claude with the examples + new requirement (e.g. "Pediatric patient, 8 years old, asthma emergency")
- Claude returns a complete JSON test scenario with:
  - `clinical_note` (source text)
  - `flawed_summary` or `expected_summary`
  - `expected_verdict`, `expected_severity`, `expected_flags`
  - `failure_modes[]` with layer, severity, and explanation

**First generated case:** TC-007 — Pediatric Asthma Attack (5 flags, CRITICAL)

---

### Correction Loop

**Purpose:** If the Aggregator returns `verdict: FAIL`, automatically fix the summary and re-validate.

**Flow:**
```
AGGREGATOR ──▶ verdict: FAIL?
                    │
                    ▼ YES
           ┌──────────────┐
           │ CORRECTION   │  Claude fixes only flagged claims
           │   AGENT      │  No new information introduced
           └──────┬───────┘
                  │ corrected_summary
                  ▼
           ┌──────────────┐
           │ RE-VALIDATE  │  Run monolithic SENTINEL prompt
           │   (fast)     │  on corrected text
           └──────┬───────┘
                  │ revalidation_verdict
                  ▼
           PASS ──▶ Auto-approve (TC-001..006)
           FAIL ──▶ Escalate to human (TC-005)
```

**Location:** `src/agents/correction.js` + inline re-validation in `src/core/pipeline.js`

---

## Security Considerations

1. **No real patient data**: All test scenarios use 100% synthetic clinical notes
2. **API key security**: Claude API key stored in UiPath Integration Service
3. **Audit trail**: All decisions logged with timestamp and user
4. **Access control**: Action Center tasks assigned to authorized clinical reviewers only

---

## Performance Characteristics

| Component | Latency | Bottleneck |
|-----------|---------|------------|
| Layer 1 (Extract) | ~5s | Claude API |
| Layer 2 (Trace) | ~5-10s | Claude API |
| Layer 3 (Contradiction) | ~5-10s | Claude API |
| Layer 4 (Critical) | ~5s | Claude API |
| Aggregation | <100ms | Local compute |
| **Total (without human)** | ~25-40s | - |

Layers 2, 3, and 4 can run in parallel to reduce total latency to ~15-20s.

---

*Architecture v0.3.0 — AEGIS*
*UiPath AgentHack 2026*
