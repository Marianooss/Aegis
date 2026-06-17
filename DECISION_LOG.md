# DECISION_LOG.md — SENTINEL
> Auto-maintained by agent. ADR Protocol — System 12.
> Every significant decision recorded. Same debate never happens twice.
> Compatible with AGENTS.md v4.1

---

## ADR-001 — 2026-05-31
**Decision:** Use UiPath Automation Cloud as the sole execution platform for all agents and orchestration.
**Context:** UiPath AgentHack 2026 Track 3 requires all components to run on UiPath Test Cloud / Agent Builder / Action Center / Maestro.
**Options:**
- A: Hybrid (local Node.js + UiPath cloud) — More flexible but violates hackathon platform requirement
- B: UiPath-only — All execution on UiPath Automation Cloud, local scripts only for prompt testing
**Chosen:** B — Platform-first rule (System 4 / INV-2). Local scripts are optional testing helpers only.
**Consequences:** Enables full demo on UiPath Cloud. Limits local development iteration speed.
**Status:** ACTIVE

---

## ADR-002 — 2026-05-31
**Decision:** Use Claude API (claude-sonnet-4-6) as the LLM backend for both agents.
**Context:** Need a capable LLM for medical text understanding, structured JSON output, and semantic comparison.
**Options:**
- A: Claude API — Strong at structured output, long context, medical reasoning
- B: GPT-4 — Comparable capability, different pricing
- C: Local model — Privacy but insufficient capability for hackathon demo
**Chosen:** A — Claude via HTTP from UiPath Agent Builder. Best structured JSON reliability for layer outputs.
**Consequences:** Requires Anthropic API key. HTTP connector setup in UiPath Integration Service.
**Status:** ACTIVE

---

## ADR-003 — 2026-05-31
**Decision:** Implement 4-layer Citation Enforcement engine for SENTINEL validation.
**Context:** Need to detect hallucinations, contradictions, and omissions in medical summaries with explainable results.
**Options:**
- A: Single prompt validation — Simpler but harder to debug and explain
- B: 4 sequential layers (Extract → Trace/Contradiction → Critical) — Modular, debuggable, clear evidence chain
- C: Fine-tuned classifier — Requires training data, out of scope for hackathon
**Chosen:** B — Each layer has a clear responsibility and produces structured JSON. Enables precise flagging with evidence quotes.
**Consequences:** 4 Claude API calls per validation. ~25-40s latency. Requires careful prompt engineering per layer.
**Status:** ACTIVE

---

## ADR-004 — 2026-05-31
**Decision:** Use 100% synthetic clinical data for all 6 test scenarios.
**Context:** INV-4 requires no real patient data. Need clinically plausible scenarios that demonstrate each failure mode.
**Options:**
- A: Real anonymized data — Would require IRB/ethics review, not feasible
- B: Synthetic but realistic — Clinically plausible vitals, medications, diagnoses
- C: Generic placeholders — Violates anti-vaporware rules (System 35)
**Chosen:** B — Every value is clinically plausible (e.g., K+ 6.8 mEq/L is a real critical threshold). No generic "Tipo A/B" patterns.
**Consequences:** Scenarios must be reviewed by someone with clinical knowledge for plausibility.
**Status:** ACTIVE

---

## ADR-005 — 2026-06-01
**Decision:** Action Center triggers only on CRITICAL or HIGH severity findings.
**Context:** Need human-in-the-loop gate that doesn't overwhelm reviewers with false positives.
**Options:**
- A: All FAIL → Action Center — Too many reviews, desensitizes users
- B: CRITICAL only → Action Center — Might miss important HIGH findings
- C: CRITICAL + HIGH → Action Center — Balanced approach per SENTINEL design
**Chosen:** C — `escalate_to_human = hasCritical || hasHigh`. MEDIUM severity logged but not escalated.
**Consequences:** Layer 2 (Trace) flags default to HIGH severity. Layer 3 (Contradiction) severity depends on clinical impact.
**Status:** ACTIVE

---

## ADR-006 — 2026-06-16
**Decision:** Apply AGENTS.md v4.1 framework to SENTINEL project.
**Context:** Project was scaffolded with AGENTS-SENTINEL.md v0.1.0 but missing core framework documents.
**Options:**
- A: Keep minimal doc set — Faster but loses framework discipline
- B: Full AGENTS v4.1 alignment — Complete document ecosystem, audit-ready
**Chosen:** B — Created SESSION_STATE, ERROR_LOG, DECISION_LOG, IDEAS.md, RESCUE.md, ARCHITECTURE.md, and all missing agent prompts.
**Consequences:** Larger document footprint. Stronger audit trail and session continuity.
**Status:** ACTIVE

---

*DECISION_LOG.md v0.1.0 — SENTINEL · UiPath AgentHack 2026*
