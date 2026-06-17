# UiPath Integration Service — Claude API Connector Config
> SENTINEL · UiPath AgentHack 2026 · Track 3
> Compatible with AGENTS-SENTINEL.md ADR-002 · INV-5

---

## Step 1 — Create HTTP Connector

Navigate to **UiPath Automation Cloud → Integration Service → Connectors → Add new**.

| Field | Value |
|-------|-------|
| Connector name | `Anthropic Claude API` |
| Base URL | `https://api.anthropic.com` |
| Authentication type | `API Key` |
| Header name | `x-api-key` |
| Header value | `[ANTHROPIC_API_KEY]` — from environment variable [VERIFY IN CLOUD] |

**Fixed headers** (add in connector settings):
```
anthropic-version: 2023-06-01
content-type: application/json
```

---

## Step 2 — Configure Action: `CallClaude`

In the connector, add an Action named `CallClaude`.

| Field | Value |
|-------|-------|
| Method | `POST` |
| Endpoint | `/v1/messages` |

**Input parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `system_prompt` | string | yes | System prompt for the validation layer |
| `user_input` | string | yes | Clinical data input formatted for the layer |

> Note: Use sentence case for all Description fields in UiPath Integration Service (capitalize first word only, proper nouns excepted).

**Request body:**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 2000,
  "system": "{{system_prompt}}",
  "messages": [
    { "role": "user", "content": "{{user_input}}" }
  ]
}
```

**Response mapping:**
| Source path | Output name | Type |
|-------------|-------------|------|
| `content[0].text` | `claude_response` | string |

> Parse `claude_response` as JSON in the agent. Claude returns ONLY valid JSON per layer prompts.

---

## Step 3 — Use in UiPath Agent Builder

For each layer agent:

1. **Receive input** — JSON from previous layer (or trigger for Layer 1)
2. **Build `system_prompt`** — Paste the system prompt from the corresponding `layer[N]-*.md` file
3. **Build `user_input`** — Inject clinical data into the user input template
4. **Call Action** — Invoke `CallClaude` from the Anthropic connector
5. **Parse response** — `JSON.parse(claude_response)`
6. **Pass forward** — Send parsed JSON to next layer (or aggregator for Layer 4)

> **Important:** Do NOT modify the system prompts inside Agent Builder. Copy-paste exactly from `agents/sentinel/layer1-extract.md` through `layer4-critical.md`. These are BIBLE-declared immutable prompts.

---

## Step 4 — Environment Variables

| Variable | Source | Where to configure |
|----------|--------|---------------------|
| `ANTHROPIC_API_KEY` | Anthropic Console → API Keys | UiPath Cloud → Settings → Integration Service → Credentials [VERIFY IN CLOUD] |

> Never commit the API key to the repository. Use `.env.example` as local reference only.

---

## Step 5 — Connection Test

**Test endpoint:** `POST /v1/messages`

**Minimal payload:**
```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 10,
  "messages": [{"role": "user", "content": "ping"}]
}
```

**Expected response:** HTTP 200 with `content[0].text` containing text.

---

## Performance Notes

| Metric | Value |
|--------|-------|
| Latency per layer | ~6–10s |
| Full validation (4 layers) | ~25–40s total |
| `max_tokens` default | 2000 (sufficient for all layers) |
| `max_tokens` Layer 4 | May need up to 1500 for notes with many critical items |

---

## Layer I/O Reference

| Layer | Primary Input | Output JSON Root | Source File |
|-------|---------------|------------------|-------------|
| 1 — Extract Claims | `summary_text` | `claims[]` | `agents/sentinel/layer1-extract.md` |
| 2 — Trace | `original_note` + `layer1_claims_json` | `trace_results[]` | `agents/sentinel/layer2-trace.md` |
| 3 — Contradiction | `original_note` + `layer1_claims_json` | `contradiction_results[]` | `agents/sentinel/layer3-contradict.md` |
| 4 — Critical | `original_note` + `summary_text` | `critical_scan{}` | `agents/sentinel/layer4-critical.md` |
| Aggregator | All layer outputs | `verdict` + `escalate_to_human` | `agents/sentinel/aggregator.js` |

---

*UiPath Integration Service Config v0.1.0 — SENTINEL*
