# UiPath Action Center Configuration — SENTINEL Review Task
> UiPath AgentHack 2026 · Track 3: Test Cloud

---

## OVERVIEW

Action Center provides the human-in-the-loop gate for SENTINEL.
When a CRITICAL or HIGH severity issue is detected, a task is created
for physician review with a visual diff of the source note vs. summary.

---

## TASK TEMPLATE: SentinelReviewTask

### Basic Configuration

```yaml
Template Name: SentinelReviewTask
Template ID: sentinel-review-v1
Category: Clinical Validation
Priority Default: HIGH
SLA: 24 hours
Assignee Group: clinical-reviewers
Allow Reassignment: true
Require Comment on Decision: true
```

### Task Fields

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| test_case_id | String | Yes | Test scenario ID (e.g., "TC-002") |
| original_note | Long Text | Yes | The original clinical note |
| summary_output | JSON | Yes | The summarizer's output |
| summary_text | Long Text | Yes | Human-readable summary text |
| flagged_claims | JSON Array | Yes | Claims flagged by SENTINEL |
| overall_severity | Enum | Yes | CRITICAL \| HIGH \| MEDIUM |
| failure_breakdown | JSON | No | Count by failure type |
| timestamp | DateTime | Yes | When SENTINEL detected the issue |

### Field Schema (JSON)

```json
{
  "fields": [
    {
      "name": "test_case_id",
      "type": "string",
      "label": "Test Case ID",
      "required": true,
      "readonly": true
    },
    {
      "name": "original_note",
      "type": "text",
      "label": "Original Clinical Note",
      "required": true,
      "readonly": true,
      "display": "left_panel"
    },
    {
      "name": "summary_text",
      "type": "text",
      "label": "Generated Summary",
      "required": true,
      "readonly": true,
      "display": "right_panel"
    },
    {
      "name": "flagged_claims",
      "type": "json",
      "label": "Flagged Claims",
      "required": true,
      "readonly": true,
      "display": "highlight_in_summary"
    },
    {
      "name": "overall_severity",
      "type": "enum",
      "label": "Severity",
      "options": ["CRITICAL", "HIGH", "MEDIUM"],
      "required": true,
      "readonly": true,
      "display": "badge"
    }
  ]
}
```

---

## DECISION OPTIONS

The reviewer must select one of the following actions:

### Option 1: Confirmed Hallucination/Error
```yaml
Action ID: CONFIRMED
Label: "Confirmed - SENTINEL Correctly Identified Error"
Description: "The flagged issue is a real error in the summary. The summary should not be used."
Result: 
  - Mark summary as REJECTED
  - Log as TRUE_POSITIVE for SENTINEL
  - Include in quality metrics
Required Fields:
  - comment (explain what was wrong)
```

### Option 2: Acceptable Despite Flag
```yaml
Action ID: ACCEPTABLE
Label: "Acceptable - Summary is Clinically Safe"
Description: "Although SENTINEL flagged this, the summary is clinically acceptable and safe to use."
Result:
  - Mark summary as APPROVED_WITH_FLAG
  - Log as FALSE_POSITIVE for SENTINEL
  - Flag for SENTINEL tuning
Required Fields:
  - comment (explain why acceptable)
  - clinical_justification (free text)
```

### Option 3: False Positive
```yaml
Action ID: FALSE_POSITIVE
Label: "False Positive - SENTINEL Error"
Description: "SENTINEL's flag was incorrect. The summary accurately reflects the source note."
Result:
  - Mark summary as APPROVED
  - Log as FALSE_POSITIVE for SENTINEL
  - Priority flag for SENTINEL debugging
Required Fields:
  - comment (explain the false positive)
  - affected_layer (which SENTINEL layer failed)
```

### Option 4: Needs More Information
```yaml
Action ID: NEEDS_INFO
Label: "Needs More Information"
Description: "Cannot make a decision without additional context."
Result:
  - Escalate to supervisor
  - Request additional documentation
Required Fields:
  - comment (what information is needed)
```

---

## UI LAYOUT

### Desktop View (Recommended for Review)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ SENTINEL Review Task                                    [TC-002] CRITICAL│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────┐  ┌─────────────────────────────┐       │
│  │    ORIGINAL CLINICAL NOTE   │  │    GENERATED SUMMARY        │       │
│  │                             │  │                             │       │
│  │  Paciente femenina, 32 años │  │  Paciente femenina de 32    │       │
│  │  Consulta por infección     │  │  años con infección         │       │
│  │  respiratoria alta.         │  │  respiratoria alta.         │       │
│  │                             │  │                             │       │
│  │  ┌─────────────────────┐    │  │  ┌─────────────────────┐    │       │
│  │  │ Sin alergias        │    │  │  │ Paciente con alergia│    │       │
│  │  │ conocidas (NKDA)    │    │  │  │ documentada a       │    │       │
│  │  │ ← HIGHLIGHTED       │    │  │  │ penicilina          │    │       │
│  │  └─────────────────────┘    │  │  │ ← FLAGGED RED       │    │       │
│  │                             │  │  └─────────────────────┘    │       │
│  │  Temperatura 38.2°C         │  │                             │       │
│  │  Plan: reposo, hidratación  │  │  Se evita prescripción de   │       │
│  │                             │  │  amoxicilina por restricción│       │
│  │                             │  │  alérgica. ← FLAGGED        │       │
│  └─────────────────────────────┘  └─────────────────────────────┘       │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ FLAGGED CLAIMS                                                           │
│ ────────────────                                                         │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ ⚠️ CRITICAL: Claim contradicts source                              │   │
│ │ Claim: "Paciente con alergia documentada a penicilina"            │   │
│ │ Evidence: "Sin alergias conocidas (NKDA)"                         │   │
│ │ Layer: LAYER_3_CONTRADICTION                                       │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│ YOUR DECISION                                                            │
│ ─────────────                                                            │
│                                                                          │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐            │
│ │ ✓ Confirmed     │ │   Acceptable    │ │ False Positive  │            │
│ │   Error         │ │   Despite Flag  │ │                 │            │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘            │
│                                                                          │
│ Comment (required):                                                      │
│ ┌───────────────────────────────────────────────────────────────────┐   │
│ │ The summary claims a penicillin allergy that does not exist in    │   │
│ │ the source note. Source explicitly states NKDA. This is a         │   │
│ │ dangerous hallucination that could affect treatment decisions.    │   │
│ └───────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│                                              [Cancel]  [Submit Decision] │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## VISUAL HIGHLIGHTING RULES

### Source Note Highlighting
- **Green highlight**: Text that supports a claim in the summary
- **Yellow highlight**: Text that SENTINEL flagged as contradicting a claim
- **No highlight**: Text not referenced in claims

### Summary Highlighting
- **Red text + border**: Claims flagged as CONTRADICTION or HALLUCINATION
- **Orange text + border**: Claims flagged as PARTIAL or uncertain
- **Normal text**: Claims that passed validation

### Severity Badge Colors
- **CRITICAL**: Red badge, pulsing animation
- **HIGH**: Orange badge
- **MEDIUM**: Yellow badge

---

## NOTIFICATIONS

### On Task Creation
```
To: clinical-reviewers group
Subject: [SENTINEL] CRITICAL Review Required - {test_case_id}
Body: A medical summary has been flagged for potential hallucination.
      Severity: {overall_severity}
      Flagged claims: {flagged_claims.length}
      Please review within {SLA}.
```

### On SLA Warning (80% of SLA elapsed)
```
To: task assignee + supervisor
Subject: [SENTINEL] Review SLA Warning - {test_case_id}
Body: This task is approaching its SLA deadline.
      Time remaining: {time_remaining}
```

### On SLA Breach
```
To: supervisor + admin
Subject: [SENTINEL] Review SLA BREACHED - {test_case_id}
Body: This task has exceeded its SLA.
      Auto-escalating to supervisor.
```

---

## AUDIT TRAIL

All actions are logged with:
- Timestamp
- User who performed action
- Decision selected
- Comment provided
- Time spent on review
- Any attachments or additional context

This data feeds into:
1. SENTINEL accuracy metrics (true positive rate, false positive rate)
2. Reviewer performance metrics
3. Compliance audit logs
4. Quality improvement initiatives

---

## INTEGRATION WITH TEST CLOUD

After human decision:

```javascript
// Pseudocode for updating Test Cloud with human verdict
async function recordHumanVerdict(taskResult) {
  const verdict = {
    test_case_id: taskResult.test_case_id,
    human_decision: taskResult.decision, // CONFIRMED | ACCEPTABLE | FALSE_POSITIVE
    human_comment: taskResult.comment,
    reviewer: taskResult.completed_by,
    review_time_seconds: taskResult.time_spent,
    timestamp: taskResult.completed_at
  };
  
  // Update Test Cloud result
  await testCloud.updateResult(verdict.test_case_id, {
    human_verdict: verdict.human_decision,
    sentinel_accuracy: verdict.human_decision === "CONFIRMED" ? "TRUE_POSITIVE" 
                     : verdict.human_decision === "ACCEPTABLE" ? "MARGINAL"
                     : "FALSE_POSITIVE"
  });
  
  // Log for SENTINEL tuning
  if (verdict.human_decision !== "CONFIRMED") {
    await sentinelTuning.logFalsePositive(taskResult);
  }
}
```

---

*Action Center Config v0.1.0 — SENTINEL*
*UiPath AgentHack 2026*
