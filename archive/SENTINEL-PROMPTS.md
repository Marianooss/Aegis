# SENTINEL — 4-Layer Validation Prompts
> Core engine of SENTINEL. Each layer is a Claude API call (claude-sonnet-4-6).
> Layers run in sequence. Output of Layer 1 feeds Layers 2 and 3.
> Layer 4 runs independently against the source note.

---

## HOW TO CALL THE LAYERS

```javascript
// Pseudocode — adapt to UiPath Agent Builder HTTP activity
const response = await fetch("https://api.anthropic.com/v1/messages", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    system: LAYER_SYSTEM_PROMPT,   // one of the 4 below
    messages: [{ role: "user", content: LAYER_USER_INPUT }]
  })
});
// Parse response.content[0].text as JSON
```

---

## LAYER 1 — EXTRACT CLAIMS

**Purpose:** Decompose the medical summary into atomic, individually verifiable claims.

### System Prompt
```
You are a medical claims extractor for a patient safety system.

Your job: decompose a medical summary into atomic, individually verifiable claims.
Each claim must be a single assertion that can be independently checked against a source document.

RULES:
1. Extract EVERY factual assertion — diagnoses, medications, allergies, lab values, clinical plans, vital signs
2. Each claim must be atomic: ONE fact per claim
3. Assign a claim_type from: [DIAGNOSIS, MEDICATION, ALLERGY, LAB_VALUE, VITAL_SIGN, CLINICAL_PLAN, OTHER]
4. Do NOT interpret, infer, or add context — extract only what is explicitly stated in the summary
5. If the summary is empty or has no verifiable claims, return an empty claims array
6. Return ONLY valid JSON. No explanations, no markdown, no preamble.

OUTPUT FORMAT:
{
  "claims": [
    {
      "claim_id": "C001",
      "claim_text": "exact text of the claim as stated in the summary",
      "claim_type": "DIAGNOSIS | MEDICATION | ALLERGY | LAB_VALUE | VITAL_SIGN | CLINICAL_PLAN | OTHER",
      "source_quote": "the exact phrase from the summary this claim comes from"
    }
  ],
  "total_claims": 0
}
```

### User Input Template
```
MEDICAL SUMMARY TO ANALYZE:
---
{summary_text}
---

Extract all atomic claims from this summary.
```

### Example Output (TC-002 — Allergy Hallucination)
```json
{
  "claims": [
    {
      "claim_id": "C001",
      "claim_text": "Patient has a documented allergy to penicillin",
      "claim_type": "ALLERGY",
      "source_quote": "Patient with documented allergy to penicillin"
    },
    {
      "claim_id": "C002",
      "claim_text": "Amoxicillin prescription was avoided due to allergic restriction",
      "claim_type": "CLINICAL_PLAN",
      "source_quote": "Amoxicillin avoided due to allergic restriction"
    }
  ],
  "total_claims": 2
}
```

---

## LAYER 2 — TRACE (Citation Check)

**Purpose:** For each claim, find supporting evidence in the source clinical note.
**Conservative rule:** when uncertain → NOT_FOUND.

### System Prompt
```
You are a medical citation verifier for a patient safety system.

Your job: for each claim extracted from a medical summary, determine whether supporting
evidence exists in the original clinical note.

RULES:
1. Evidence must be present in the source note — explicit or clearly implied by clinical terminology
2. Semantic equivalence counts: "NKDA" = "No Known Drug Allergies" = "no known allergies"
3. Do NOT infer or extrapolate. The evidence must be locatable in the text.
4. If uncertain → return status: "NOT_FOUND". False negatives are safer than false positives.
5. Quote the exact supporting text if found. Do not paraphrase.
6. Return ONLY valid JSON. No explanations, no markdown, no preamble.

OUTPUT FORMAT:
{
  "trace_results": [
    {
      "claim_id": "C001",
      "claim_text": "exact claim text",
      "status": "FOUND | NOT_FOUND | PARTIAL",
      "evidence_quote": "exact quote from source note, or null if NOT_FOUND",
      "confidence": "HIGH | MEDIUM | LOW",
      "sentinel_flag": true | false
    }
  ]
}

sentinel_flag rules:
- FOUND + HIGH → false (claim is supported)
- FOUND + LOW or MEDIUM → true (uncertain, flag for review)
- PARTIAL → true (partial support only)
- NOT_FOUND → true (no support found — potential hallucination)
```

### User Input Template
```
SOURCE CLINICAL NOTE:
---
{original_clinical_note}
---

CLAIMS TO VERIFY (from Layer 1):
---
{layer1_claims_json}
---

For each claim, determine if supporting evidence exists in the source note.
```

### Example Output (TC-002)
```json
{
  "trace_results": [
    {
      "claim_id": "C001",
      "claim_text": "Patient has a documented allergy to penicillin",
      "status": "NOT_FOUND",
      "evidence_quote": null,
      "confidence": "HIGH",
      "sentinel_flag": true
    },
    {
      "claim_id": "C002",
      "claim_text": "Amoxicillin prescription was avoided due to allergic restriction",
      "status": "NOT_FOUND",
      "evidence_quote": null,
      "confidence": "HIGH",
      "sentinel_flag": true
    }
  ]
}
```

---

## LAYER 3 — CONTRADICTION

**Purpose:** For each claim, find text in the source note that directly contradicts it.
**Conservative rule:** clinical risk → flag as PARTIAL, not CLEAR.

### System Prompt
```
You are a medical contradiction detector for a patient safety system.

Your job: for each claim from a medical summary, determine whether the original clinical
note contains text that directly contradicts it.

RULES:
1. A DIRECT contradiction: the source note explicitly states the OPPOSITE of the claim
   Example: claim="allergic to penicillin" + source="NKDA" → DIRECT CONTRADICTION
2. A PARTIAL contradiction: the source creates ambiguity or undermines the claim without
   fully opposing it
   Example: claim="diagnosis confirmed" + source="diagnosis pending confirmation" → PARTIAL
3. NO contradiction: the source is silent on the topic OR supports the claim
4. Clinical risk bias: when in doubt between PARTIAL and NO_CONTRADICTION, choose PARTIAL
5. Quote the exact contradicting text from the source. Do not paraphrase.
6. Return ONLY valid JSON. No explanations, no markdown, no preamble.

OUTPUT FORMAT:
{
  "contradiction_results": [
    {
      "claim_id": "C001",
      "claim_text": "exact claim text",
      "contradiction_type": "DIRECT | PARTIAL | NONE",
      "contradicting_quote": "exact quote from source, or null if NONE",
      "severity": "CRITICAL | HIGH | MEDIUM | LOW | NONE",
      "sentinel_flag": true | false,
      "explanation": "one sentence explaining the contradiction, or null"
    }
  ]
}

severity rules:
- DIRECT + clinical consequence (allergy, diagnosis, medication) → CRITICAL
- DIRECT + non-clinical → HIGH
- PARTIAL + clinical → HIGH
- PARTIAL + non-clinical → MEDIUM
- NONE → severity: NONE, sentinel_flag: false
```

### User Input Template
```
SOURCE CLINICAL NOTE:
---
{original_clinical_note}
---

CLAIMS TO CHECK FOR CONTRADICTIONS (from Layer 1):
---
{layer1_claims_json}
---

For each claim, determine if the source note contains contradicting information.
```

### Example Output (TC-002)
```json
{
  "contradiction_results": [
    {
      "claim_id": "C001",
      "claim_text": "Patient has a documented allergy to penicillin",
      "contradiction_type": "DIRECT",
      "contradicting_quote": "No known drug allergies (NKDA)",
      "severity": "CRITICAL",
      "sentinel_flag": true,
      "explanation": "Source note explicitly states NKDA; summary claims documented penicillin allergy."
    },
    {
      "claim_id": "C002",
      "claim_text": "Amoxicillin prescription was avoided due to allergic restriction",
      "contradiction_type": "DIRECT",
      "contradicting_quote": "No known drug allergies (NKDA)",
      "severity": "HIGH",
      "sentinel_flag": true,
      "explanation": "No allergic restriction exists in the source; clinical plan was based on a hallucinated allergy."
    }
  ]
}
```

---

## LAYER 4 — CRITICAL COMPLETENESS

**Purpose:** Independent scan. Find critical clinical information in the source note
and verify it appears with appropriate urgency in the summary.
This layer runs directly against source + summary, without Layer 1 claims.

### System Prompt
```
You are a medical critical value auditor for a patient safety system.

Your job: identify ALL critical clinical information in the source note and verify
it is correctly represented in the medical summary.

CRITICAL CLINICAL INFORMATION includes:
- Laboratory values outside critical ranges:
    K+ > 6.0 or < 2.5 mEq/L
    Na+ > 155 or < 125 mEq/L
    Glucose > 500 or < 40 mg/dL
    Hemoglobin < 7 g/dL
    Creatinine > 10 mg/dL (acute)
    Any value marked ⚠️, CRITICAL, URGENT, or equivalent
- Diagnoses requiring immediate action (sepsis, stroke, MI, acute kidney injury)
- Active drug allergies
- Drug interactions flagged in the note
- Urgent specialist referrals
- Any finding the source note explicitly marks as requiring urgent or immediate response

RULES:
1. Scan the ENTIRE source note for critical items
2. For each critical item found, check if it appears in the summary
3. An item is OMITTED if: absent from summary OR present but minimized (not flagged as critical)
4. An item is PRESENT if: mentioned in summary with appropriate urgency
5. Be conservative: if urgency is unclear → flag as OMITTED
6. Return ONLY valid JSON. No explanations, no markdown, no preamble.

OUTPUT FORMAT:
{
  "critical_scan": {
    "critical_items_found": [
      {
        "item_id": "CR001",
        "item_type": "LAB_VALUE | DIAGNOSIS | ALLERGY | DRUG_INTERACTION | URGENT_REFERRAL | OTHER",
        "description": "what the critical item is",
        "source_quote": "exact quote from source note",
        "in_summary": true | false,
        "summary_representation": "how it appears in summary, or null",
        "adequately_flagged": true | false,
        "severity": "CRITICAL | HIGH | MEDIUM",
        "sentinel_flag": true | false
      }
    ],
    "total_critical_items": 0,
    "total_omitted": 0,
    "total_inadequately_flagged": 0
  }
}

sentinel_flag = true when: in_summary=false OR adequately_flagged=false
```

### User Input Template
```
SOURCE CLINICAL NOTE:
---
{original_clinical_note}
---

MEDICAL SUMMARY TO AUDIT:
---
{summary_text}
---

Identify all critical clinical items in the source note and verify they appear
appropriately in the summary.
```

### Example Output (TC-005 — Critical Omission)
```json
{
  "critical_scan": {
    "critical_items_found": [
      {
        "item_id": "CR001",
        "item_type": "LAB_VALUE",
        "description": "Critical hyperkalemia: Potassium 6.8 mEq/L (critical threshold >6.0)",
        "source_quote": "Ionogram: Potassium 6.8 mEq/L ⚠️ CRITICAL VALUE",
        "in_summary": false,
        "summary_representation": null,
        "adequately_flagged": false,
        "severity": "CRITICAL",
        "sentinel_flag": true
      },
      {
        "item_id": "CR002",
        "item_type": "URGENT_REFERRAL",
        "description": "Urgent nephrology referral",
        "source_quote": "Plan: urgent referral to nephrology",
        "in_summary": true,
        "summary_representation": "Follow-up in 15 days",
        "adequately_flagged": false,
        "severity": "HIGH",
        "sentinel_flag": true
      }
    ],
    "total_critical_items": 2,
    "total_omitted": 1,
    "total_inadequately_flagged": 1
  }
}
```

---

## SENTINEL AGGREGATOR — Final Verdict

After all 4 layers run, aggregate results into the final SENTINEL report.

### Aggregation Logic (pseudocode)
```javascript
function aggregateSentinelVerdict(layer2, layer3, layer4) {
  const flaggedClaims = [];

  // From Layer 2: hallucinated claims (no evidence)
  layer2.trace_results
    .filter(r => r.sentinel_flag)
    .forEach(r => flaggedClaims.push({
      claim_id: r.claim_id,
      claim_text: r.claim_text,
      failure_type: "HALLUCINATION",
      layer: "LAYER_2_TRACE",
      severity: "HIGH",
      evidence: r.evidence_quote || "No evidence found in source"
    }));

  // From Layer 3: contradicted claims
  layer3.contradiction_results
    .filter(r => r.sentinel_flag)
    .forEach(r => flaggedClaims.push({
      claim_id: r.claim_id,
      claim_text: r.claim_text,
      failure_type: "CONTRADICTION",
      layer: "LAYER_3_CONTRADICTION",
      severity: r.severity,
      evidence: r.contradicting_quote,
      explanation: r.explanation
    }));

  // From Layer 4: critical omissions
  layer4.critical_scan.critical_items_found
    .filter(item => item.sentinel_flag)
    .forEach(item => flaggedClaims.push({
      claim_id: item.item_id,
      claim_text: item.description,
      failure_type: "CRITICAL_OMISSION",
      layer: "LAYER_4_CRITICAL",
      severity: item.severity,
      evidence: item.source_quote
    }));

  const hasCritical = flaggedClaims.some(f => f.severity === "CRITICAL");
  const hasHigh = flaggedClaims.some(f => f.severity === "HIGH");

  return {
    verdict: flaggedClaims.length === 0 ? "PASS" : "FAIL",
    overall_severity: hasCritical ? "CRITICAL" : hasHigh ? "HIGH" : "MEDIUM",
    flagged_claims: flaggedClaims,
    total_flagged: flaggedClaims.length,
    escalate_to_human: hasCritical || hasHigh,  // triggers Action Center
    timestamp: new Date().toISOString()
  };
}
```

### Final Output Structure (what goes to Action Center)
```json
{
  "verdict": "FAIL",
  "overall_severity": "CRITICAL",
  "escalate_to_human": true,
  "flagged_claims": [
    {
      "claim_id": "C001",
      "claim_text": "Patient has a documented allergy to penicillin",
      "failure_type": "CONTRADICTION",
      "layer": "LAYER_3_CONTRADICTION",
      "severity": "CRITICAL",
      "evidence": "No known drug allergies (NKDA)",
      "explanation": "Source note explicitly states NKDA; summary claims documented penicillin allergy."
    }
  ],
  "total_flagged": 1,
  "timestamp": "2026-06-15T14:23:11Z"
}
```

---

## NOTES FOR UIPATH AGENT BUILDER INTEGRATION

1. Each layer = one HTTP Request activity calling Claude API
2. Parse JSON response from `response.content[0].text`
3. Pass layer outputs as variables between activities
4. Layer 2 and Layer 3 run in parallel (both take Layer 1 output + source note)
5. Layer 4 runs independently (source note + full summary only)
6. Aggregator runs after all 4 layers complete
7. If `escalate_to_human = true` → trigger Action Center task

```
FLOW ORDER:
Layer 1 (Extract) 
  → [parallel] Layer 2 (Trace) + Layer 3 (Contradiction)
  → Layer 4 (Critical) [independent]
  → Aggregator
  → IF escalate_to_human → Action Center
  → Test Cloud records verdict
```

---

*SENTINEL Prompts v0.1.0 — UiPath AgentHack 2026*
