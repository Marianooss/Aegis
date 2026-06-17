# IDEAS.md — SENTINEL
> Auto-populated by agent via Brake. Reviewed by user each session start.
> Status flow: CAPTURED → IN PROGRESS → SHIPPED | REJECTED
> Compatible with AGENTS.md v4.1 · Module 12

---

## 🔥 HIGH PRIORITY

### IDEA-001 — 2026-05-31
**Captured during:** ARCHITECT MODE — scaffold design
**Description:** Add a "confidence score" per claim in Layer 2 output, not just FOUND/NOT_FOUND.
**Value:** Enables graduated alerting — low-confidence claims get reviewer attention without full escalation.
**Effort estimate:** S
**Status:** CAPTURED
**Notes:** Would require prompt update in layer2-trace.md. Backward compatible with current schema.

### IDEA-002 — 2026-06-01
**Captured during:** AUDITOR MODE — F17 Vaporware Scan
**Description:** Build a local test harness (scripts/test-layer.js) that runs each layer against test scenarios without UiPath.
**Value:** Faster iteration on prompt engineering before importing to Agent Builder.
**Effort estimate:** M
**Status:** IN PROGRESS
**Notes:** Requires ANTHROPIC_API_KEY. Created .env.example template.

---

## 🟡 MEDIUM PRIORITY

### IDEA-003 — 2026-06-01
**Captured during:** BUILDER MODE — Stage 0
**Description:** Extend SENTINEL to validate non-medical AI outputs (legal contracts, financial reports).
**Value:** Domain-agnostic engine. Expands addressable market.
**Effort estimate:** L
**Status:** PARKED
**Notes:** Post-hackathon. Core 4-layer engine is domain-agnostic but prompts need adaptation.

### IDEA-004 — 2026-06-01
**Captured during:** BUILDER MODE — Stage 0
**Description:** Add a "diff view" JSON format for Action Center — structured before/after per claim.
**Value:** Makes human review faster and more precise.
**Effort estimate:** S
**Status:** CAPTURED
**Notes:** Could be part of aggregator.js output. Not required for hackathon MVP.

---

## 🧊 PARKED / LOW PRIORITY

### IDEA-005 — 2026-05-31
**Captured during:** VALIDATE MODE
**Description:** Fine-tune a smaller model (e.g., Claude Haiku) for Layer 1 (Extract) to reduce latency and cost.
**Value:** Layer 1 is the simplest task. Cheaper model could handle it.
**Effort estimate:** M
**Status:** PARKED
**Notes:** Requires benchmarking accuracy vs claude-sonnet-4-6. Not for hackathon timeline.

### IDEA-006 — 2026-06-01
**Captured during:** ALIGN MODE — doc audit
**Description:** Clean up Next.js boilerplate files (app/, components/, hooks/, lib/, styles/) that exist from initial workspace creation.
**Value:** Reduces repo bloat. Clarifies that this is a UiPath project, not a Next.js project.
**Effort estimate:** S
**Status:** CAPTURED
**Notes:** Per R-G5: don't delete without explicit user instruction. Needs HUMAN_APPROVAL.

---

## ✅ SHIPPED

### IDEA-007 — shipped 2026-05-31 in Stage 0
**Description:** Define 6 synthetic clinical test scenarios covering happy path + 5 failure modes.
**Shipped in:** /test-scenarios/TC-001 through TC-006.json

### IDEA-008 — shipped 2026-06-01 in ALIGN MODE
**Description:** Create complete AGENTS.md v4.1 document ecosystem for project.
**Shipped in:** SESSION_STATE.md, ERROR_LOG.md, DECISION_LOG.md, IDEAS.md, RESCUE.md, ARCHITECTURE.md

---

## ❌ REJECTED

None.

---

*IDEAS.md v0.1.0 — SENTINEL · UiPath AgentHack 2026*
