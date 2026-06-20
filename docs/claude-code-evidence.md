# Claude Code — AI-Assisted Development Evidence
> Aegis · UiPath AgentHack 2026 · Bonus Points Documentation

## Tool Used
**Claude Code** (Anthropic) — listed as a qualifying coding agent under UiPath for Coding Agents bonus criteria.

---

## How Claude Code Contributed to Aegis

### 1. 4-Layer Validation Engine (`src/core/pipeline.js`)
Claude Code scaffolded the full 4-layer sequential architecture:
- **Layer 1 — Claim Extraction:** Prompt design and claim array structure
- **Layer 2 — Trace Verification:** claim_id join logic between L1 and L2 outputs
- **Layer 3 — Contradiction Detection:** parallel execution pattern with Promise.all
- **Layer 4 — Critical Completeness Scan:** independent analysis + aggregator input

Claude Code generated the initial prompt files in `src/prompts/` and iterated on them based on test case outputs across 4 sessions.

### 2. Test Scenario Design (`src/scenarios/`)
Claude Code generated all 6 clinical test cases (TC-001 through TC-006) including:
- Clinically coherent medical notes with embedded failure modes
- Expected verdict + severity + flagged_claims for each scenario
- TC-005 (hyperkalemia + insulin overdose) — the most clinically sophisticated case, designed to trigger the `escalate_to_human` path

### 3. Dashboard Server (`src/dashboard/server.js`)
Claude Code built the Node.js Express dashboard including:
- Pipeline animation with real-time step tracking
- Diff view (original summary vs corrected summary)
- Audit metrics panel (safe rate, escalation count, correction rate)
- 6 TC runner with pass/fail indicators

### 4. Aggregator Logic (`agents/sentinel/aggregator.js`)
Claude Code designed the join logic that merges Layer 1 claim extraction with Layer 2 trace results using `claim_id` as the primary key — the core deduplication mechanism that enables structured verdict generation.

### 5. Correction Agent Loop (`agents/correction/correction-agent.js`)
Claude Code implemented the auto-correction loop:
- Receives SENTINEL verdict with flagged claims
- Generates corrected summary with explicit fixes
- Triggers re-validation against original note
- Escalates to Action Center if severity remains CRITICAL after correction

---

## Evidence of Integration

The Claude Code output is **not a reference** — it is the working codebase. Every file listed above is directly executable and tested across 6 scenarios.

### Verifiable Evidence
- `docs/claude-code-log.md` — session log documenting 4 Claude Code sessions with specific contributions per session
- `src/core/pipeline.js` — live 4-layer pipeline with L1→L4 sequential execution
- `src/scenarios/tc-001.json` through `tc-006.json` — generated and validated scenarios
- `src/dashboard/server.js` — running dashboard at localhost:3000
- Git commit history — see commits tagged `feat:` for Claude Code-generated features

### Test Evidence
All 6 test cases verified end-to-end:
- TC-001: PASS (clean summary)
- TC-002: FAIL → CORRECTED (hallucinated allergy)
- TC-003: FAIL → CORRECTED (omitted diagnosis)
- TC-004: FAIL → ESCALATED (critical omission, correction insufficient)
- TC-005: FAIL → ESCALATED (insulin overdose — human review required)
- TC-006: PASS after correction (minor severity)

---

## Coding Agent Role Summary

| Component | Claude Code Role | Integration Status |
|-----------|-----------------|-------------------|
| 4-layer pipeline | Scaffolded + iterated | ✅ Live in production |
| Prompt engineering | Designed all 6 layer prompts | ✅ Live in src/prompts/ |
| Test scenarios (TC-001–006) | Generated + validated | ✅ Live in src/scenarios/ |
| Dashboard UI | Built from scratch | ✅ Running at localhost:3000 |
| Aggregator join logic | Designed claim_id schema | ✅ Live in aggregator.js |
| Correction loop | Designed retry + escalation | ✅ Live in correction-agent.js |
| Audit logger | Designed metrics schema | ✅ Live in agents/audit/ |

---

*Claude Code was used throughout the development lifecycle — not as a code generator for isolated snippets, but as the primary development partner for architecture decisions, prompt engineering, and implementation across the full pipeline.*
