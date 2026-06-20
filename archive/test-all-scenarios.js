require('dotenv').config();

const fs = require('fs');
const path = require('path');

const API_URL = 'https://api.anthropic.com/v1/messages';
const KEY = process.env.ANTHROPIC_API_KEY;

const SUMMARIZER_SYSTEM = `You are a clinical medical records summarizer. Extract a structured JSON summary from clinical notes.
RULES: Only include what is explicitly stated. Never infer. Return ONLY valid JSON.
If the note states NKDA or no known allergies, return "allergies": [].
Schema: {"patient":{"age":number,"sex":"string"},"diagnoses":[{"diagnosis":"string","status":"string"}],"medications":[{"name":"string","dose":"string","frequency":"string"}],"allergies":[{"allergen":"string"}],"critical_findings":["string"],"summary_text":"string"}`;

const SENTINEL_SYSTEM = `You are SENTINEL, an AI safety validator for medical summaries. Detect hallucinations, contradictions, and critical omissions.
SEVERITY: CRITICAL=allergy/diagnosis error | HIGH=fabricated clinical fact | MEDIUM=minor inaccuracy
Return ONLY valid JSON:
{"verdict":"PASS"|"FAIL","overall_severity":"NONE"|"MEDIUM"|"HIGH"|"CRITICAL","escalate_to_human":boolean,"flagged_claims":[{"claim_text":"string","failure_type":"HALLUCINATION"|"CONTRADICTION"|"CRITICAL_OMISSION","severity":"string","source_evidence":"string","explanation":"string"}],"total_flagged":number,"sentinel_summary":"string"}`;

async function callClaude(system, userMsg) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system,
      messages: [{ role: 'user', content: userMsg }]
    })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`API error: ${JSON.stringify(data)}`);
  return data.content[0].text;
}

function parseJSON(raw) {
  try {
    const clean = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function getSummaryToValidate(scenario) {
  return scenario.hallucinated_summary?.summary_text
    || scenario.incomplete_summary?.summary_text
    || scenario.expected_summary?.summary_text
    || null;
}

async function runScenario(scenarioFile) {
  const raw = fs.readFileSync(
    path.join(__dirname, 'test-scenarios', scenarioFile), 'utf8'
  );
  const scenario = JSON.parse(raw);
  const note = scenario.clinical_note.content;
  const expectedVerdict = scenario.expected_verdict;

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  ${scenario.test_case_id} — ${scenario.name}`);
  console.log(`   Expected: ${expectedVerdict}`);

  // Step 1: Summarizer reads the note
  let summaryText;
  try {
    const summarizerOut = await callClaude(
      SUMMARIZER_SYSTEM,
      `Summarize this clinical note:\n\n${note}`
    );
    const parsed = parseJSON(summarizerOut);
    summaryText = parsed?.summary_text || summarizerOut;
    console.log(`   Summarizer: OK`);
  } catch (e) {
    console.log(`   Summarizer: ERROR — ${e.message}`);
    return { id: scenario.test_case_id, error: 'summarizer_failed' };
  }

  // Step 2: SENTINEL validates
  // For failure scenarios use the pre-defined hallucinated summary
  // For happy path use the real summarizer output
  const summaryForValidation = expectedVerdict === 'PASS'
    ? summaryText
    : (getSummaryToValidate(scenario) || summaryText);

  let sentinelOut;
  try {
    const rawDebug = await callClaude(
      SENTINEL_SYSTEM,
      `SOURCE NOTE (ground truth):\n${note}\n\nSUMMARY TO VALIDATE:\n${summaryForValidation}\n\nReturn your JSON verdict.`
    );
    if (process.env.DEBUG_TC === scenario.test_case_id) {
      console.log('\n--- RAW SENTINEL OUTPUT ---');
      console.log(rawDebug);
      console.log('--- END RAW ---\n');
    }
    const raw = rawDebug;
    sentinelOut = parseJSON(raw);
    if (!sentinelOut) throw new Error('invalid JSON');
  } catch (e) {
    console.log(`   SENTINEL:   ERROR — ${e.message}`);
    return { id: scenario.test_case_id, error: 'sentinel_failed' };
  }

  const actualVerdict = sentinelOut.verdict;
  const pass = actualVerdict === expectedVerdict;

  console.log(`   SENTINEL:   ${actualVerdict} (severity: ${sentinelOut.overall_severity}, flagged: ${sentinelOut.total_flagged})`);
  console.log(`   Result:     ${pass ? '✅ CORRECT' : '❌ MISMATCH'}`);

  if (!pass) {
    console.log(`   ⚠ Expected ${expectedVerdict}, got ${actualVerdict}`);
  }

  return {
    id: scenario.test_case_id,
    expected: expectedVerdict,
    actual: actualVerdict,
    severity: sentinelOut.overall_severity,
    flagged: sentinelOut.total_flagged,
    escalate: sentinelOut.escalate_to_human,
    correct: pass
  };
}

async function main() {
  if (!KEY) { console.error('ANTHROPIC_API_KEY no está en .env'); process.exit(1); }

  const scenarios = fs.readdirSync(path.join(__dirname, 'test-scenarios'))
    .filter(f => f.endsWith('.json'))
    .sort();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`SENTINEL — Full Test Suite (${scenarios.length} scenarios)`);
  console.log(`${'='.repeat(60)}`);

  const results = [];
  for (const file of scenarios) {
    const result = await runScenario(file);
    results.push(result);
  }

  // Summary table
  console.log(`\n${'='.repeat(60)}`);
  console.log('FINAL RESULTS');
  console.log(`${'='.repeat(60)}`);

  const correct = results.filter(r => r.correct).length;
  const total = results.filter(r => !r.error).length;

  results.forEach(r => {
    if (r.error) {
      console.log(`  ${r.id}: ERROR (${r.error})`);
    } else {
      const icon = r.correct ? '✅' : '❌';
      console.log(`  ${icon} ${r.id}: expected=${r.expected} actual=${r.actual} severity=${r.severity}`);
    }
  });

  console.log(`\n  Score: ${correct}/${total} correct`);
  console.log(correct === total ? '\n  ✅ Full suite PASS' : '\n  ⚠ Some scenarios need tuning');
}

main();