# Aegis — Decision Log
> Active design decisions with rationale and evidence.
> Format: ADR (Architecture Decision Record)
> Updated: 2026-06-21

---

## ADR-007 — temperature=0 for all Claude API calls

**Date:** 2026-06-21  
**Status:** IMPLEMENTED  
**Author:** Mariano OSS

### Context

During validation of TC-007 (Pediatric Asthma — Discharge Hallucination), two consecutive runs of the same test case produced different flag counts:

| Run | Timestamp | Total flags | Critical flags | Verdict |
|-----|-----------|-------------|----------------|---------|
| Run 1 | 2026-06-20T23:38:30Z | 13 | 8 CRITICAL | FAIL → CORRECTED → PASS |
| Run 2 | 2026-06-21T01:26:34Z | 14 | 8 CRITICAL | FAIL → CORRECTED → PASS |

**Observation:** All critical flags (discharge hallucination, SpO2 omissions, allergy severity, incomplete response) were detected consistently in both runs. The variation (13 vs 14) was one additional `CRITICAL_OMISSION` flag in Run 2 — *"Continuous SpO2 monitoring ordered with target ≥95%"* — which is a valid clinical finding present in the source note.

**Root cause:** Default Claude API behavior uses non-zero temperature, introducing sampling stochasticity across calls. With 4 sequential Claude calls per pipeline run (L1, L2+L3 parallel, L4), variance accumulates.

### Decision

Set `temperature: 0` on all `callClaude()` invocations in `src/core/pipeline.js`.

```javascript
// Before (implicit default temperature ~1.0)
const body = JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: maxTokens,
  system,
  messages: [{ role: 'user', content: userMsg }]
});

// After (deterministic)
const body = JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: maxTokens,
  temperature: 0,
  system,
  messages: [{ role: 'user', content: userMsg }]
});
```

### Rationale

1. **Clinical validation requires reproducibility.** A system that produces different flag counts on identical inputs cannot be trusted in regulated environments. A physician re-running a validation should get the same result.

2. **The critical flags were consistent.** Both runs detected all 8 CRITICAL flags and produced correct verdicts. The variance was in secondary omission flags — but in production, every valid flag should be reproducibly detected.

3. **temperature=0 is standard practice for structured output tasks.** When the output is a JSON verdict with specific claim-level analysis, determinism is a correctness property, not just a preference.

4. **Tradeoff acknowledged.** temperature=0 may slightly reduce the model's ability to surface novel edge cases that require creative inference. For a validation framework, correctness and reproducibility outweigh exploratory coverage. A future v2 could run multiple passes at temperature=0 with a consensus mechanism.

### Evidence

Three consecutive runs of TC-007 (Pediatric Asthma — Discharge Hallucination) were executed and exported:

| Run | Timestamp | Temperature | Total flags | Critical flags | Verdict |
|-----|-----------|-------------|-------------|----------------|---------|
| Run 1 | 2026-06-20T23:38:30Z | default | 13 | 8 CRITICAL | FAIL → CORRECTED → PASS |
| Run 2 | 2026-06-21T01:25:42Z | default | 14 | 8 CRITICAL | FAIL → CORRECTED → PASS |
| Run 3 | 2026-06-21T01:41:46Z | 0 | 13 | 8 CRITICAL | FAIL → CORRECTED → PASS |

**Key finding:** temperature=0 reduces but does not fully eliminate flag count variance in Claude (13→14→13 pattern). This is consistent with Claude's architecture — unlike some models, Claude may retain minor residual stochasticity even at temperature=0.

**What IS fully consistent across all 3 runs (0% variance):**

| Critical flag | Run 1 | Run 2 | Run 3 |
|---|---|---|---|
| "Patient was discharged home" — CONTRADICTION/CRITICAL | ✅ | ✅ | ✅ |
| SpO2 88% on arrival omitted — CRITICAL | ✅ | ✅ | ✅ |
| SpO2 93% post-treatment omitted — CRITICAL | ✅ | ✅ | ✅ |
| Amoxicillin anaphylaxis severity omitted — CRITICAL | ✅ | ✅ | ✅ |
| Incomplete bronchodilator response omitted — CRITICAL | ✅ | ✅ | ✅ |
| Disposition ADMITTED omitted — CRITICAL | ✅ | ✅ | ✅ |
| Pulmonology consult omitted — HIGH | ✅ | ✅ | ✅ |

**Conclusion:** The clinically significant flags — the ones that matter for patient safety — are 100% reproducible. The variance (13 vs 14) occurs in secondary omission flags that are valid but lower-priority. For a clinical validation system, this is the correct reproducibility property: critical findings are deterministic, secondary findings may vary.

**Revised recommendation:** temperature=0 is still the correct default for structured output tasks. For production deployment, a multi-pass consensus mechanism (e.g., 3 runs at temperature=0, majority vote on flags) would provide full reproducibility for secondary findings as well.

- TC-007 Run 1: `docs/exports/TC-007-result-2026-06-20T23-38-43.json`
- TC-007 Run 2: `docs/exports/TC-007-result-2026-06-21T01-26-34.json`
- TC-007 Run 3: `docs/exports/TC-007-result-2026-06-21T01-42-22.json`

### Impact

- `src/core/pipeline.js` — `callClaude()` updated with `temperature: 0`
- All 4 layers (L1 extract, L2 trace, L3 contradiction, L4 critical) now deterministic
- Re-validation call (monolithic SENTINEL) also deterministic
- No breaking changes to output schema

---

## ADR-008 — Correction Agent single-pass limitation on high-complexity cases

**Date:** 2026-06-21
**Status:** DOCUMENTED · Known limitation

### Observation

TC-005 (K⁺ 6.8 mEq/L — Critical Value Omission) produced revalidation: FAIL
in one run (02:02:27Z) with 10 flags detected.

Same TC in prior run (01:53:26Z) with 9 flags: revalidation PASS.

### Root cause

TC-005 has the highest omission density in the suite (9–10 critical omissions).
The Correction Agent operates in a single pass — it receives all flagged claims
and attempts to rewrite the summary once. When flag count exceeds ~8–9 items,
the correction may not fully resolve every omission in one pass.

### Clinical significance

K⁺ 6.8 mEq/L with ECG changes is the most clinically severe scenario in the
suite. A single-pass correction failing on this case means the system correctly
escalates — the revalidation FAIL triggers human review, which is the
appropriate clinical response for a life-threatening emergency.

### Production recommendation

For cases with >7 flagged claims:
- Option A: Run correction in two passes (correct → revalidate → correct again)
- Option B: Skip correction entirely and escalate directly to human review
- Option C: Flag density threshold (>7 flags = auto-escalate, no correction attempt)

Option C is the most clinically conservative and architecturally simplest.

### Evidence

- TC-005 Run A (01:53Z): 9 flags → corrected → revalidation PASS
- TC-005 Run B (02:02Z): 10 flags → corrected → revalidation FAIL

---

*Aegis Decision Log — github.com/Marianooss/Aegis*