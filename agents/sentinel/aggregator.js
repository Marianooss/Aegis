/**
 * SENTINEL Aggregator — Final Verdict Generator
 * 
 * Combines outputs from Layer 2 (Trace), Layer 3 (Contradiction), 
 * and Layer 4 (Critical Completeness) into a final SENTINEL verdict.
 * 
 * @param {Object} layer2 - Output from Layer 2 (Trace)
 * @param {Object} layer3 - Output from Layer 3 (Contradiction)
 * @param {Object} layer4 - Output from Layer 4 (Critical Completeness)
 * @returns {Object} Final SENTINEL verdict for Action Center
 */
function aggregateSentinelVerdict(layer2, layer3, layer4, layer1 = null) {
  // SENTINEL: optional layer1 param enables claim_type lookup for severity matrix
  const flaggedClaims = [];

  // ============================================================
  // LAYER 2: Hallucinated claims (no supporting evidence)
  // ============================================================
  if (layer2?.trace_results) {
    layer2.trace_results
      .filter(r => r.sentinel_flag === true)
      .forEach(r => {
        // SENTINEL: join Layer1→Layer2 by claim_id to get claim_type for severity matrix
        const layer1Claim = layer1?.claims?.find(c => c.claim_id === r.claim_id);
        const claimType = layer1Claim?.claim_type || "OTHER";

        flaggedClaims.push({
          claim_id: r.claim_id,
          claim_text: r.claim_text,
          failure_type: "HALLUCINATION",
          failure_subtype: r.status, // NOT_FOUND or PARTIAL
          layer: "LAYER_2_TRACE",
          severity: determineSeverityForHallucination(r, claimType),
          evidence: r.evidence_quote || "No supporting evidence found in source note",
          confidence: r.confidence
        });
      });
  }

  // ============================================================
  // LAYER 3: Contradicted claims
  // ============================================================
  if (layer3?.contradiction_results) {
    layer3.contradiction_results
      .filter(r => r.sentinel_flag === true)
      .forEach(r => {
        // Avoid duplicates: if same claim_id already flagged, upgrade severity if needed
        const existingIndex = flaggedClaims.findIndex(f => f.claim_id === r.claim_id);
        
        if (existingIndex >= 0) {
          // Contradiction is worse than hallucination — upgrade
          // SENTINEL: >= instead of > because CONTRADICTION always wins at same severity rank
          const existing = flaggedClaims[existingIndex];
          if (severityRank(r.severity) >= severityRank(existing.severity)) {
            flaggedClaims[existingIndex] = {
              ...existing,
              failure_type: "CONTRADICTION",
              failure_subtype: r.contradiction_type,
              layer: "LAYER_3_CONTRADICTION",
              severity: r.severity,
              evidence: r.contradicting_quote,
              explanation: r.explanation
            };
          }
        } else {
          flaggedClaims.push({
            claim_id: r.claim_id,
            claim_text: r.claim_text,
            failure_type: "CONTRADICTION",
            failure_subtype: r.contradiction_type,
            layer: "LAYER_3_CONTRADICTION",
            severity: r.severity,
            evidence: r.contradicting_quote,
            explanation: r.explanation
          });
        }
      });
  }

  // ============================================================
  // LAYER 4: Critical omissions
  // ============================================================
  if (layer4?.critical_scan?.critical_items_found) {
    layer4.critical_scan.critical_items_found
      .filter(item => item.sentinel_flag === true)
      .forEach(item => {
        flaggedClaims.push({
          claim_id: item.item_id,
          claim_text: item.description,
          failure_type: "CRITICAL_OMISSION",
          failure_subtype: item.in_summary ? "INADEQUATELY_FLAGGED" : "MISSING",
          layer: "LAYER_4_CRITICAL",
          severity: item.severity,
          evidence: item.source_quote,
          summary_representation: item.summary_representation
        });
      });
  }

  // ============================================================
  // DETERMINE FINAL VERDICT
  // ============================================================
  const hasCritical = flaggedClaims.some(f => f.severity === "CRITICAL");
  const hasHigh = flaggedClaims.some(f => f.severity === "HIGH");
  const hasMedium = flaggedClaims.some(f => f.severity === "MEDIUM");

  const overallSeverity = hasCritical ? "CRITICAL" 
                        : hasHigh ? "HIGH" 
                        : hasMedium ? "MEDIUM" 
                        : "NONE";

  const verdict = flaggedClaims.length === 0 ? "PASS" : "FAIL";
  const escalateToHuman = hasCritical || hasHigh;

  // ============================================================
  // BUILD FINAL REPORT
  // ============================================================
  return {
    verdict: verdict,
    overall_severity: overallSeverity,
    escalate_to_human: escalateToHuman,
    flagged_claims: flaggedClaims,
    total_flagged: flaggedClaims.length,
    breakdown: {
      hallucinations: flaggedClaims.filter(f => f.failure_type === "HALLUCINATION").length,
      contradictions: flaggedClaims.filter(f => f.failure_type === "CONTRADICTION").length,
      critical_omissions: flaggedClaims.filter(f => f.failure_type === "CRITICAL_OMISSION").length
    },
    layer_summaries: {
      layer2_trace: {
        total_checked: layer2?.trace_results?.length || 0,
        flagged: layer2?.trace_results?.filter(r => r.sentinel_flag).length || 0
      },
      layer3_contradiction: {
        total_checked: layer3?.contradiction_results?.length || 0,
        flagged: layer3?.contradiction_results?.filter(r => r.sentinel_flag).length || 0
      },
      layer4_critical: {
        total_critical_items: layer4?.critical_scan?.total_critical_items || 0,
        omitted: layer4?.critical_scan?.total_omitted || 0,
        inadequately_flagged: layer4?.critical_scan?.total_inadequately_flagged || 0
      }
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Determine severity for hallucination based on claim type
 * SENTINEL: severity matrix derived from ADR-005 + clinical risk logic
 *
 * NOT_FOUND  = fabricated information (higher severity)
 * PARTIAL    = weak support (one level below NOT_FOUND for same type)
 *
 * Matrix:
 *   ALLERGY      + NOT_FOUND → CRITICAL  | + PARTIAL → HIGH
 *   MEDICATION   + NOT_FOUND → CRITICAL  | + PARTIAL → HIGH
 *   DIAGNOSIS    + NOT_FOUND → HIGH      | + PARTIAL → MEDIUM
 *   LAB_VALUE    + NOT_FOUND → HIGH      | + PARTIAL → MEDIUM
 *   VITAL_SIGN   + NOT_FOUND → MEDIUM    | + PARTIAL → LOW
 *   CLINICAL_PLAN+ NOT_FOUND → MEDIUM    | + PARTIAL → LOW
 *   OTHER        + NOT_FOUND → LOW       | + PARTIAL → LOW
 */
function determineSeverityForHallucination(traceResult, claimType = "OTHER") {
  const status = traceResult.status; // NOT_FOUND or PARTIAL

  // Base severity for NOT_FOUND by claim type
  const notFoundSeverity = {
    ALLERGY:      "CRITICAL",
    MEDICATION:   "CRITICAL",
    DIAGNOSIS:    "HIGH",
    LAB_VALUE:    "HIGH",
    VITAL_SIGN:   "MEDIUM",
    CLINICAL_PLAN:"MEDIUM",
    OTHER:        "LOW"
  };

  const base = notFoundSeverity[claimType] || "HIGH";

  if (status === "NOT_FOUND") {
    return base;
  }

  // PARTIAL: one severity level below NOT_FOUND for this type
  // SENTINEL: use severityRank to compute downgrade without hardcoding every pair
  const baseRank = severityRank(base);
  const partialRank = Math.max(1, baseRank - 1); // min LOW(1), never NONE(0)

  const rankToLabel = { 4: "CRITICAL", 3: "HIGH", 2: "MEDIUM", 1: "LOW", 0: "NONE" };
  return rankToLabel[partialRank];
}

/**
 * Rank severity for comparison
 */
function severityRank(severity) {
  const ranks = {
    "CRITICAL": 4,
    "HIGH": 3,
    "MEDIUM": 2,
    "LOW": 1,
    "NONE": 0
  };
  return ranks[severity] || 0;
}

// ============================================================
// EXAMPLE USAGE (for UiPath Agent Builder testing)
// ============================================================

// SENTINEL: Example Layer 1 output (needed for claim_type join)
const exampleLayer1 = {
  claims: [
    {
      claim_id: "C001",
      claim_text: "Patient has a documented allergy to penicillin",
      claim_type: "ALLERGY",
      source_quote: "Paciente con alergia documentada a penicilina"
    }
  ],
  total_claims: 1
};

// Example Layer 2 output
const exampleLayer2 = {
  trace_results: [
    {
      claim_id: "C001",
      claim_text: "Patient has a documented allergy to penicillin",
      status: "NOT_FOUND",
      evidence_quote: null,
      confidence: "HIGH",
      sentinel_flag: true
    }
  ]
};

// Example Layer 3 output
const exampleLayer3 = {
  contradiction_results: [
    {
      claim_id: "C001",
      claim_text: "Patient has a documented allergy to penicillin",
      contradiction_type: "DIRECT",
      contradicting_quote: "Sin alergias conocidas (NKDA)",
      severity: "CRITICAL",
      sentinel_flag: true,
      explanation: "Source note explicitly states NKDA; summary claims documented penicillin allergy."
    }
  ]
};

// Example Layer 4 output
const exampleLayer4 = {
  critical_scan: {
    critical_items_found: [],
    total_critical_items: 0,
    total_omitted: 0,
    total_inadequately_flagged: 0
  }
};

// Generate verdict (with Layer 1 for claim_type join)
const verdict = aggregateSentinelVerdict(exampleLayer2, exampleLayer3, exampleLayer4, exampleLayer1);

// Output for testing
console.log(JSON.stringify(verdict, null, 2));

/*
Expected output for TC-002 (Allergy Hallucination):
{
  "verdict": "FAIL",
  "overall_severity": "CRITICAL",
  "escalate_to_human": true,
  "flagged_claims": [
    {
      "claim_id": "C001",
      "claim_text": "Patient has a documented allergy to penicillin",
      "failure_type": "CONTRADICTION",
      "failure_subtype": "DIRECT",
      "layer": "LAYER_3_CONTRADICTION",
      "severity": "CRITICAL",
      "evidence": "Sin alergias conocidas (NKDA)",
      "explanation": "Source note explicitly states NKDA; summary claims documented penicillin allergy."
    }
  ],
  "total_flagged": 1,
  "breakdown": {
    "hallucinations": 0,
    "contradictions": 1,
    "critical_omissions": 0
  },
  "layer_summaries": { ... },
  "timestamp": "2026-06-15T14:23:11.000Z"
}
*/

// SENTINEL: Inline severity matrix tests (run with node aggregator.js)
// Uncomment below to validate the refinement:
/*
function testDetermineSeverity() {
  const t = { status: "NOT_FOUND" };
  const p = { status: "PARTIAL" };

  const tests = [
    { claimType: "ALLERGY",      status: "NOT_FOUND", expected: "CRITICAL" },
    { claimType: "ALLERGY",      status: "PARTIAL",   expected: "HIGH"     },
    { claimType: "MEDICATION",   status: "NOT_FOUND", expected: "CRITICAL" },
    { claimType: "MEDICATION",   status: "PARTIAL",   expected: "HIGH"     },
    { claimType: "DIAGNOSIS",    status: "NOT_FOUND", expected: "HIGH"     },
    { claimType: "DIAGNOSIS",    status: "PARTIAL",   expected: "MEDIUM"   },
    { claimType: "LAB_VALUE",    status: "NOT_FOUND", expected: "HIGH"     },
    { claimType: "LAB_VALUE",    status: "PARTIAL",   expected: "MEDIUM"   },
    { claimType: "VITAL_SIGN",   status: "NOT_FOUND", expected: "MEDIUM"   },
    { claimType: "VITAL_SIGN",   status: "PARTIAL",   expected: "LOW"      },
    { claimType: "CLINICAL_PLAN",status: "NOT_FOUND", expected: "MEDIUM"   },
    { claimType: "CLINICAL_PLAN",status: "PARTIAL",   expected: "LOW"      },
    { claimType: "OTHER",        status: "NOT_FOUND", expected: "LOW"      },
    { claimType: "OTHER",        status: "PARTIAL",   expected: "LOW"      }
  ];

  let pass = 0;
  let fail = 0;
  tests.forEach(tc => {
    const result = determineSeverityForHallucination(
      { status: tc.status },
      tc.claimType
    );
    if (result === tc.expected) {
      pass++;
      console.log(`✅ ${tc.claimType} + ${tc.status} → ${result}`);
    } else {
      fail++;
      console.log(`❌ ${tc.claimType} + ${tc.status} → ${result} (expected ${tc.expected})`);
    }
  });
  console.log(`\nResults: ${pass} passed, ${fail} failed out of ${tests.length}`);
}

testDetermineSeverity();
*/

// Export for use in UiPath or Node.js testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { aggregateSentinelVerdict, determineSeverityForHallucination, severityRank };
}
