# RESCUE.md — SENTINEL
> Rescue protocol for AI-complacent deliverables.
> Activate when: agent shipped placeholder data, skipped validation, or delivered incomplete work.
> Compatible with AGENTS.md v4.1 · System 35 Anti-Vaporware Protocol

---

## Activation Criteria

Activate RESCUE.md when ANY of the following are detected:

- [ ] Placeholder data visible in production ("Tipo A/B/C", "Cliente 1", round numbers without source)
- [ ] Demo data without visible DEMO badge
- [ ] Charts with fake distributions or missing axis labels
- [ ] Skipped Delivery Gate checks declared as "done"
- [ ] Missing documentation for a shipped feature
- [ ] Broken cross-reference between AGENTS.md and project files

---

## Rescue Protocol Steps

### Phase 1 — Stop and Assess

1. **HALT all new feature work.** No additions until rescue complete.
2. **Run F17 VAPORWARE SCAN** on entire project.
3. **Run F5 AUDITOR MODE** on all files touched since last verified state.
4. **Document findings** in ERROR_LOG.md with category 6 (System 16).

### Phase 2 — Triage Findings

```
CRITICAL — Blocks submission or deployment
  → Fix immediately. No exceptions.

HIGH — Affects credibility or functionality
  → Fix before next session.

MEDIUM — Documentation gaps, minor inconsistencies
  → Fix in next IMPROVER session.
```

### Phase 3 — Surgical Fix

1. **One issue at a time.** No bulk replacements.
2. **Replace placeholders with real data sources** or explicit DEMO badges.
3. **Verify each fix** with `npm run build` or equivalent + human review.
4. **Update affected documents:** ARCHITECTURE.md, BIBLE.md if visual tokens changed.

### Phase 4 — Verification Gate

Before declaring rescue complete:

- [ ] F17 scan re-run → clean
- [ ] F5 audit re-run → no new gaps
- [ ] ERROR_LOG.md updated with resolution
- [ ] SESSION_STATE.md updated with rescue summary
- [ ] User confirms rescue is complete

---

## Rescue Log

| Date | Trigger | Findings | Resolution |
|------|---------|----------|------------|
| 2026-06-01 | F17 Vaporware Scan | Next.js boilerplate present; no placeholder data in scenarios | Documented in AUDIT.md; boilerplate flagged for user decision |

---

*RESCUE.md v0.1.0 — SENTINEL · UiPath AgentHack 2026*
