# UiPath Maestro Flow — SENTINEL Orchestration
> UiPath AgentHack 2026 · Track 3: Test Cloud

---

## OVERVIEW

This document describes the Maestro orchestration flow that connects all SENTINEL components:
Test Cloud → Summarizer Agent → SENTINEL Validator → Action Center → Coverage Report

---

## FLOW DIAGRAM

```
┌──────────────────────────────────────────────────────────────────────┐
│                         MAESTRO ORCHESTRATION                         │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 1: TEST CLOUD INITIALIZATION                                     │
│ ─────────────────────────────────                                     │
│ • Load test set: SENTINEL-TC-v1                                       │
│ • Retrieve test scenarios: TC-001 through TC-006                      │
│ • Initialize results collector                                        │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 2: FOR EACH TEST SCENARIO                                        │
│ ─────────────────────────────────                                     │
│ Loop through scenarios TC-001 to TC-006:                              │
│                                                                       │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │ 2a. EXTRACT TEST DATA                                           │ │
│   │     • clinical_note = scenario.clinical_note.content            │ │
│   │     • expected_verdict = scenario.expected_verdict              │ │
│   │     • test_case_id = scenario.test_case_id                      │ │
│   └────────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│                              ▼                                        │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │ 2b. INVOKE MEDICAL RECORDS SUMMARIZER                          │ │
│   │     Agent: MedicalRecordsSummarizer                            │ │
│   │     Input: clinical_note                                        │ │
│   │     Output: summarizer_output (JSON)                            │ │
│   │     Timeout: 30 seconds                                         │ │
│   └────────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│                              ▼                                        │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │ 2c. INVOKE SENTINEL VALIDATOR                                   │ │
│   │     Agent: SentinelValidator                                    │ │
│   │     Inputs:                                                     │ │
│   │       • original_note = clinical_note                           │ │
│   │       • summary_output = summarizer_output                      │ │
│   │     Output: sentinel_verdict (JSON)                             │ │
│   │     Timeout: 60 seconds (4 layer calls)                         │ │
│   └────────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│                              ▼                                        │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │ 2d. CONDITIONAL: CHECK ESCALATION                               │ │
│   │                                                                 │ │
│   │     IF sentinel_verdict.escalate_to_human == true:              │ │
│   │       → INVOKE ACTION CENTER TASK                               │ │
│   │       → Wait for human decision (async)                         │ │
│   │       → Record human_verdict                                    │ │
│   │     ELSE:                                                       │ │
│   │       → Proceed directly to results                             │ │
│   └────────────────────────────────────────────────────────────────┘ │
│                              │                                        │
│                              ▼                                        │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │ 2e. RECORD TEST RESULT                                          │ │
│   │     • test_case_id                                              │ │
│   │     • actual_verdict = sentinel_verdict.verdict                 │ │
│   │     • expected_verdict                                          │ │
│   │     • pass_fail = (actual == expected) ? PASS : FAIL            │ │
│   │     • flagged_claims                                            │ │
│   │     • human_verdict (if escalated)                              │ │
│   └────────────────────────────────────────────────────────────────┘ │
│                                                                       │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 3: GENERATE COVERAGE REPORT                                      │
│ ────────────────────────────────                                      │
│ • Total scenarios: 6                                                  │
│ • Passed: count(pass_fail == PASS)                                    │
│ • Failed: count(pass_fail == FAIL)                                    │
│ • Escalated to human: count(escalate_to_human == true)                │
│ • Coverage score: passed / total                                      │
│ • Generate summary report for Test Cloud dashboard                    │
└──────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌──────────────────────────────────────────────────────────────────────┐
│ STEP 4: END                                                           │
│ ─────────                                                             │
│ • Publish results to Test Cloud                                       │
│ • Notify stakeholders if critical failures detected                   │
│ • Archive run data for audit                                          │
└──────────────────────────────────────────────────────────────────────┘
```

---

## VARIABLE DEFINITIONS

### Input Variables (from Test Cloud)

| Variable | Type | Description |
|----------|------|-------------|
| `test_set_id` | String | "SENTINEL-TC-v1" |
| `scenarios` | Array<Object> | Loaded from /test-scenarios/*.json |

### Process Variables

| Variable | Type | Description |
|----------|------|-------------|
| `current_scenario` | Object | Current test case being processed |
| `clinical_note` | String | Raw clinical note text |
| `summarizer_output` | Object | JSON output from Summarizer agent |
| `sentinel_verdict` | Object | JSON output from SENTINEL Validator |
| `human_verdict` | String | "CONFIRMED" \| "ACCEPTABLE" \| "FALSE_POSITIVE" (if escalated) |

### Output Variables (to Test Cloud)

| Variable | Type | Description |
|----------|------|-------------|
| `results` | Array<Object> | Per-scenario results |
| `coverage_report` | Object | Aggregate statistics |

---

## AGENT INVOCATION DETAILS

### Medical Records Summarizer

```
Agent Name: MedicalRecordsSummarizer
Connector: anthropic-claude
Model: claude-sonnet-4-6
Max Tokens: 2000
Temperature: 0.1 (low for consistency)

Input:
{
  "role": "user",
  "content": "CLINICAL NOTE:\n---\n{clinical_note}\n---\n\nGenerate a structured summary following the output schema."
}

Output: JSON matching /agents/summarizer/output-schema.json
```

### SENTINEL Validator

```
Agent Name: SentinelValidator
Connector: anthropic-claude
Model: claude-sonnet-4-6

LAYER 1 - Extract:
  Input: summarizer_output.summary_text
  Output: layer1_claims

LAYER 2 - Trace (parallel with Layer 3):
  Input: clinical_note + layer1_claims
  Output: layer2_trace

LAYER 3 - Contradiction (parallel with Layer 2):
  Input: clinical_note + layer1_claims
  Output: layer3_contradiction

LAYER 4 - Critical (independent):
  Input: clinical_note + summarizer_output.summary_text
  Output: layer4_critical

AGGREGATOR:
  Input: layer2_trace + layer3_contradiction + layer4_critical
  Output: sentinel_verdict
```

---

## CONDITIONAL LOGIC

### Escalation Decision

```javascript
// Pseudocode for escalation decision
if (sentinel_verdict.escalate_to_human === true) {
  // Create Action Center task
  const task = await createActionCenterTask({
    template: "SentinelReviewTask",
    data: {
      test_case_id: current_scenario.test_case_id,
      original_note: clinical_note,
      summary_output: summarizer_output,
      flagged_claims: sentinel_verdict.flagged_claims,
      severity: sentinel_verdict.overall_severity
    },
    assignee_group: "clinical-reviewers",
    priority: sentinel_verdict.overall_severity === "CRITICAL" ? "HIGH" : "MEDIUM"
  });
  
  // Wait for human decision (with timeout)
  human_verdict = await waitForTaskCompletion(task.id, { timeout: "24h" });
}
```

### Test Pass/Fail Logic

```javascript
// Determine if SENTINEL's verdict matches expected verdict
function evaluateTestResult(actual_verdict, expected_verdict, expected_severity) {
  // For CONDITIONAL cases (TC-006), use special logic
  if (expected_verdict === "CONDITIONAL") {
    return evaluateConditionalCase(actual_verdict);
  }
  
  // Standard cases: verdict must match
  const verdict_match = actual_verdict.verdict === expected_verdict;
  
  // For FAIL cases, severity should be at least as high as expected
  if (expected_verdict === "FAIL") {
    const severity_adequate = severityRank(actual_verdict.overall_severity) >= 
                              severityRank(expected_severity);
    return verdict_match && severity_adequate;
  }
  
  return verdict_match;
}
```

---

## ERROR HANDLING

### Agent Timeout
```
IF Summarizer times out (>30s):
  → Log error
  → Mark test as INCONCLUSIVE
  → Continue to next scenario

IF SENTINEL times out (>60s):
  → Log error
  → Mark test as INCONCLUSIVE
  → Continue to next scenario
```

### Invalid JSON Response
```
IF agent returns non-JSON:
  → Attempt JSON extraction from response
  → If fails: Mark as INCONCLUSIVE
  → Log raw response for debugging
```

### Action Center Timeout
```
IF human review not completed in 24h:
  → Auto-escalate to supervisor
  → Mark test as PENDING_REVIEW
  → Continue execution (don't block)
```

---

## EXPECTED DEMO FLOW (TC-002)

1. **Test Cloud loads TC-002** (Allergy Hallucination)
2. **Summarizer processes clinical note**
   - Note says: "NKDA"
   - Summarizer (intentionally misconfigured for demo) outputs: "Alergia a penicilina"
3. **SENTINEL Layer 3 detects contradiction**
   - DIRECT contradiction: "NKDA" vs "alergia a penicilina"
   - Severity: CRITICAL
4. **Escalation triggered**
   - escalate_to_human = true
   - Action Center task created
5. **Physician reviews in Action Center**
   - Left panel: Original note (NKDA highlighted)
   - Right panel: Summary (penicillin allergy in red)
   - Physician clicks: "Confirmed Hallucination"
6. **Result recorded**
   - Verdict: FAIL (correct detection)
   - Human confirmation: CONFIRMED
   - Test: PASS (SENTINEL correctly identified the error)

---

## TIMING ESTIMATES

| Step | Duration | Notes |
|------|----------|-------|
| Test Cloud init | ~2s | Load scenarios |
| Summarizer call | ~5-15s | Depends on note length |
| SENTINEL Layer 1 | ~5s | Extract claims |
| SENTINEL Layers 2+3 | ~10s | Parallel execution |
| SENTINEL Layer 4 | ~5s | Critical scan |
| Aggregation | <1s | Local computation |
| Action Center (if triggered) | Variable | Human-dependent |
| **Total per scenario** | ~30-40s | Without human review |
| **Full suite (6 scenarios)** | ~3-4 min | Without human review |

---

*Maestro Flow v0.1.0 — SENTINEL*
*UiPath AgentHack 2026*
