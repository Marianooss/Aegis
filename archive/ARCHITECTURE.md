# ARCHITECTURE.md — SENTINEL
> Project Identity Anchor · System 29 verification target
> Single source of truth for stack, features, and project state.
> Compatible with AGENTS.md v4.1 · AGENTS-SENTINEL.md v0.1.0

---

## PROJECT_ID

```
PROJECT:        SENTINEL
VERSION:        0.1.0
TRACK:          UiPath AgentHack 2026 — Track 3: UiPath Test Cloud
DEADLINE:       Jun 29, 2026 · 23:45 PDT
PLATFORM:       UiPath Automation Cloud (MANDATORY)
DOMAIN:         Healthcare · Medical Records Summarization
REPO:           github.com/[tu-usuario]/sentinel-uipath
LICENSE:        MIT
OWNER:          Mariano Adrian Oss · DevelopOss
```

---

## Stack Declaration

| Layer | Choice |
|---|---|
| Platform | UiPath Automation Cloud |
| Agent Builder | UiPath Agent Builder × 2 agents |
| Test Engine | UiPath Test Cloud |
| Human Gate | UiPath Action Center |
| Orchestration | UiPath Maestro |
| LLM Backend | Claude API (claude-sonnet-4-6) via HTTP |
| Coding Agent | Claude Code (UiPath for Coding Agents) |
| Local Testing | Node.js 18+ (optional, scripts only) |

**If stack differs from default:**
- This is a UiPath-class project, not a Next.js web app.
- No `npm run build` delivery gate. Delivery gate = all test scenarios pass + Action Center fires correctly.
- No Playwright/Supertest. Testing = Test Cloud execution against 6 synthetic scenarios.
- No deployment to Vercel. "Deploy" = agents published in UiPath Agent Builder + Test Cloud test set active.

---

## Core Analysis

**PRODUCT**
- Name: SENTINEL
- What it does: Agentic quality-control system that tests AI medical record summarizers for hallucinations, contradictions, and omissions before clinical use.
- Who it's for: Healthcare organizations deploying AI-infused UiPath workflows
- Irreplaceable value: Catches semantic errors (what the AI claims vs what the source says) that UI/API tests miss
- Revenue model: N/A (hackathon project)
- GTM motion: Open-source validation layer for UiPath Document Understanding / AI agents

**DATA**
- Critical entities: Clinical note (source), Summary (agent output), Claim (atomic assertion), Flag (detected error)
- Critical relationships: Note → Summary → Claims → Evidence → Verdict

**FLOWS**
- Flow #1: Test Cloud executes scenario → Summarizer processes note → SENTINEL validates → Test Cloud records result
- Flow #2: FAIL + CRITICAL severity → Action Center human review → human decision → result logged
- Flow #3: Coverage report generation after all 6 scenarios

**RISKS**
- Riskiest technical assumption: Claude API prompt reliability for structured JSON across all 4 layers
- Riskiest business assumption: Healthcare orgs will add a validation layer rather than trust the AI vendor
- Biggest user drop-off: If SENTINEL produces false positives on normal notes (TC-001)

**MVP SCOPE**
- Must prove: SENTINEL detects TC-002 allergy hallucination reliably + Action Center fires
- Must NOT include: Real EHR integration, multi-language support, model fine-tuning
- Definition of done: TC-001 PASS + TC-002 FAIL with Action Center escalation + video recorded

---

## GTM Context

```
━━━ GTM CONTEXT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Product:       SENTINEL
Stage:         pre-revenue
Target user:   Healthcare IT directors / UiPath RPA teams deploying AI agents
Value prop:    "Who validates the AI agent inside your UiPath workflow?"
Revenue model: N/A — open source validation pattern for hackathon
GTM motion:    Community / content — publish pattern, blog posts, UiPath Forum
Competition:   Manual human review (status quo), vendor-provided accuracy stats (insufficient)
Key metric:    False negative rate on hallucinations (must be near-zero)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Technical Debt

| ID | Type | Description | Registered | Status |
|---|---|---|---|---|
| TD-001 | STRUCTURAL | Next.js boilerplate files present from initial workspace | 2026-06-01 | OPEN — needs HUMAN_APPROVAL |
| TD-002 | COSMETIC | BIBLE.md has template placeholders not filled | 2026-06-16 | OPEN — needs HUMAN_APPROVAL |

---

## Last Session State

See `SESSION_STATE.md` for current session status.

---

*ARCHITECTURE.md v0.1.0 — SENTINEL · UiPath AgentHack 2026*
*Full technical architecture diagram in: `docs/architecture.md`*
