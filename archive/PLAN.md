# PLAN.md — SENTINEL
> Compatible con: AGENTS.md v4.1 · AGENTS-SENTINEL.md v0.1.0

---

## 1. Project & Task Understanding

**Project:** SENTINEL is an agentic validation system built on UiPath Automation Cloud to test medical record summarization agents for hallucinations, omissions, and contradictions before clinical use.

**Phase 1 — COMPLETED (2026-06-16):** AGENTS.md v4.1 alignment. Audited all documents against AGENTS_v4_0.md, created missing framework and project documents, aligned existing documents.

**Phase 2 — NEXT:** UiPath Cloud configuration and E2E testing of TC-001 and TC-002.

---

## 2. Files Status

| File | Status | Notes |
|------|--------|-------|
| `AGENTS_v4_0.md` | ✅ Exists | Framework reference, do not modify |
| `AGENTS-SENTINEL.md` | ✅ Exists | Project-specific AGENTS adaptation |
| `README.md` | ✅ Exists | Complete with setup instructions |
| `BIBLE.md` | ✅ Aligned | Populated with real project data |
| `ARCHITECTURE.md` | ✅ Created | Project root identity anchor |
| `SESSION_STATE.md` | ✅ Created | Current session state |
| `ERROR_LOG.md` | ✅ Created | Clean (no errors) |
| `DECISION_LOG.md` | ✅ Created | 6 ADRs documented |
| `IDEAS.md` | ✅ Created | Ideas captured and prioritized |
| `RESCUE.md` | ✅ Created | Rescue protocol active |
| `AUDIT.md` | ✅ Exists | F17 scan clean |
| `PLAN.md` | ✅ Updated | This file |
| `LICENSE` | ✅ Exists | MIT |
| `.env.example` | ✅ Created | ANTHROPIC_API_KEY template |
| `.gitignore` | ✅ Updated | Allows .env.example |
| `agents/summarizer/prompt.md` | ✅ Exists | Complete |
| `agents/summarizer/output-schema.json` | ✅ Exists | Valid JSON schema |
| `agents/sentinel/layer1-extract.md` | ✅ Exists | Complete |
| `agents/sentinel/layer2-trace.md` | ✅ Exists | Complete |
| `agents/sentinel/layer3-contradict.md` | ✅ Exists | Complete |
| `agents/sentinel/layer4-critical.md` | ✅ Exists | Complete |
| `agents/sentinel/aggregator.js` | ✅ Exists | Complete with examples |
| `scripts/test-layer.js` | ✅ Exists | Local testing harness |
| `test-scenarios/TC-001..006.json` | ✅ Exists | All 6 scenarios present |
| `docs/architecture.md` | ✅ Exists | Technical architecture |
| `docs/claude-code-log.md` | ✅ Created | Evidence for bonus points |
| `uipath/maestro-flow.md` | ✅ Exists | Orchestration docs |
| `uipath/action-center-config.md` | ✅ Exists | Action Center config |

---

## 3. Next Steps (Phase 2)

### Week 0 — Immediate
- [ ] Obtain UiPath Labs access (form already submitted per AGENTS-SENTINEL.md)
- [ ] Configure Claude API connector in UiPath Integration Service
- [ ] Import Medical Records Summarizer agent with prompt.md + output-schema.json

### Week 1 — Core E2E
- [ ] Import SENTINEL Validator agent with 4 layer prompts
- [ ] Configure Action Center task template
- [ ] Load test scenarios in Test Cloud
- [ ] **CRITICAL:** TC-001 runs E2E and produces PASS
- [ ] **CRITICAL:** TC-002 runs E2E, produces FAIL, Action Center fires

### Week 2 — Demo Layer
- [ ] All 6 test scenarios running in Test Cloud
- [ ] Coverage report visible
- [ ] Update docs/claude-code-log.md with screenshots
- [ ] README final validation

### Week 3 — Deliverables
- [ ] Record video ≤5 min showing UiPath Cloud running
- [ ] Complete Devpost submission
- [ ] Submit feedback form (optional, potential +$1500)

---

## 4. Active Risks

- **Risk 1:** `ANTHROPIC_API_KEY` required for local testing. Mitigation: `.env.example` created, user must copy and fill.
- **Risk 2:** Next.js boilerplate (`app/`, `components/`, etc.) present from initial workspace. Mitigation: Documented in BIBLE.md and IDEAS.md; requires HUMAN_APPROVAL to remove.
- **Risk 3:** UiPath Labs access may be delayed. Mitigation: Form submitted; escalation path to andreea.tomescu@uipath.com if not received in 4 business days.
- **Risk 4:** Claude API JSON reliability across all 4 layers. Mitigation: Each prompt has explicit "Return ONLY valid JSON" instruction + output schema.

---

## 5. Complexity

**Phase 1 (Document Alignment):** 2 / 5 → COMPLETED
**Phase 2 (UiPath Cloud E2E):** 4 / 5 → Pending Labs access

---
*Status: ALIGN MODE complete. Ready for BUILDER MODE — Stage 0.*
