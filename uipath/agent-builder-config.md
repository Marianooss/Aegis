# UiPath Agent Builder — SENTINEL Agent Configuration
> SENTINEL · UiPath AgentHack 2026 · Track 3
> Compatible with AGENTS-SENTINEL.md ADR-001 · ADR-002 · INV-5

---

## Agent 1 — Medical Records Summarizer

| Field | Value |
|-------|-------|
| Name | `Medical Records Summarizer` |
| Purpose | Receive clinical note → produce structured JSON summary |
| Input | `original_clinical_note` (string) |
| Connector | `Anthropic Claude API` → Action `CallClaude` |
| System prompt source | `agents/summarizer/prompt.md` [VERIFY IN CLOUD] |
| Output JSON | `{ "summary_text": "...", "key_findings": [...] }` |
| Trigger | UiPath Test Cloud (via Maestro) |

**Configuration steps:**
1. Create agent in Agent Builder [VERIFY IN CLOUD]
2. Paste system prompt from `agents/summarizer/prompt.md` into agent instructions
3. Add `CallClaude` action from Anthropic connector
4. Map `original_clinical_note` to `user_input` parameter
5. Parse `claude_response` as JSON before passing to Maestro

---

## Agent 2 — SENTINEL Validator

| Field | Value |
|-------|-------|
| Name | `SENTINEL Validator` |
| Purpose | Receive note + summary → execute 4 validation layers → return verdict |
| Input | `original_clinical_note` (string), `summary_text` (string) |
| Connector | `Anthropic Claude API` → Action `CallClaude` (4 calls per validation) |
| Output | Aggregator verdict JSON (see Step 5) |
| Trigger | Output from Medical Records Summarizer (via Maestro) |

> **Note:** The aggregator is NOT a separate agent. It is orchestration logic implemented as Custom Code in Maestro or Coded Automation in UiPath Studio Web [VERIFY IN CLOUD].

---

## SENTINEL Validator — Internal Steps

### Step 1 — Layer 1: Extract Claims

| Parameter | Value |
|-----------|-------|
| System prompt | Content of `agents/sentinel/layer1-extract.md` |
| User input | `Analyze this medical summary:\n{{summary_text}}` |
| Action | `CallClaude` |
| Output | `layer1_json` — parsed JSON with `claims[]` |

### Step 2 — Layer 2: Trace

| Parameter | Value |
|-----------|-------|
| System prompt | Content of `agents/sentinel/layer2-trace.md` |
| User input | `Original note:\n{{original_clinical_note}}\n\nClaims to verify:\n{{layer1_json}}` |
| Action | `CallClaude` |
| Output | `layer2_json` — parsed JSON with `trace_results[]` |

### Step 3 — Layer 3: Contradiction

| Parameter | Value |
|-----------|-------|
| System prompt | Content of `agents/sentinel/layer3-contradict.md` |
| User input | `Original note:\n{{original_clinical_note}}\n\nClaims to check:\n{{layer1_json}}` |
| Action | `CallClaude` |
| Output | `layer3_json` — parsed JSON with `contradiction_results[]` |

### Step 4 — Layer 4: Critical Completeness

| Parameter | Value |
|-----------|-------|
| System prompt | Content of `agents/sentinel/layer4-critical.md` |
| User input | `Original note:\n{{original_clinical_note}}\n\nSummary:\n{{summary_text}}` |
| Action | `CallClaude` |
| Output | `layer4_json` — parsed JSON with `critical_scan{}` |

### Step 5 — Aggregator (Custom Code)

| Parameter | Value |
|-----------|-------|
| Implementation | Custom Code activity in Maestro workflow, or Coded Automation in Studio Web [VERIFY IN CLOUD] |
| Input | `layer1_json`, `layer2_json`, `layer3_json`, `layer4_json` |
| Logic | Port `aggregateSentinelVerdict()` from `agents/sentinel/aggregator.js` |
| Output | Final verdict JSON: `{ verdict, overall_severity, escalate_to_human, flagged_claims[], breakdown{}, layer_summaries{}, timestamp }` |

---

## Maestro Orchestration & Action Center

| Condition | Maestro Action |
|-----------|---------------|
| `escalate_to_human === true` | Trigger Action Center task with diff view |
| `escalate_to_human === false` | Log result, close case, update Test Cloud |

**Action Center task template** [VERIFY IN CLOUD]:
- Show: original note, summary, flagged claims with evidence
- Options: `CONFIRMED` / `ACCEPTABLE` / `FALSE_POSITIVE`

---

*UiPath Agent Builder Config v0.1.0 — SENTINEL*
