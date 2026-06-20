require('dotenv').config();
const fs = require('fs');
const path = require('path');
const AuditLogger = require('./agents/audit/audit-logger');

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

const CORRECTION_SYSTEM = `You are a medical summary correction specialist. Fix ONLY the flagged errors in the summary.
- HALLUCINATION: remove the fabricated claim
- CONTRADICTION: replace with accurate info from source note
- CRITICAL_OMISSION: add the missing critical information
Never introduce new information. Return ONLY valid JSON with a "summary_text" field containing the corrected summary.`;

async function callClaude(system, userMsg, maxTokens = 2048) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
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
    return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch { return null; }
}

function getSummaryToValidate(scenario) {
  return scenario.hallucinated_summary?.summary_text
    || scenario.incomplete_summary?.summary_text
    || scenario.expected_summary?.summary_text
    || null;
}

async function runScenario(scenario, logger) {
  const id = scenario.test_case_id;
  const note = scenario.clinical_note.content;
  const expectedVerdict = scenario.expected_verdict;
  const summaryToValidate = getSummaryToValidate(scenario);

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`▶  ${id} — ${scenario.name}`);

  try {
    // Step 1: Summarizer
    const summarizerRaw = await callClaude(SUMMARIZER_SYSTEM, `Summarize this clinical note:\n\n${note}`);
    const summarizerOut = parseJSON(summarizerRaw);
    console.log(`   [1] Summarizer: OK | allergies=${JSON.stringify(summarizerOut?.allergies)}`);

    // Step 2: SENTINEL validates
    const targetSummary = expectedVerdict === 'PASS'
      ? (summarizerOut?.summary_text || '')
      : (summaryToValidate || summarizerOut?.summary_text || '');

    const sentinelRaw = await callClaude(
      SENTINEL_SYSTEM,
      `SOURCE NOTE:\n${note}\n\nSUMMARY TO VALIDATE:\n${targetSummary}\n\nReturn JSON verdict.`
    );
    const sentinelOut = parseJSON(sentinelRaw);
    console.log(`   [2] SENTINEL: ${sentinelOut?.verdict} | severity=${sentinelOut?.overall_severity} | flagged=${sentinelOut?.total_flagged}`);

    if (sentinelOut?.verdict === 'PASS') {
      console.log(`   [3] No errors — AUTO-APPROVED ✅`);
      logger.log(id, 'AUTO_APPROVED', {
        initial_severity: sentinelOut.overall_severity,
        flags_detected: 0,
        flags_fixed: 0,
        revalidation_verdict: 'PASS'
      });
      return;
    }

    // Step 3: Correction Agent
    const flagList = sentinelOut.flagged_claims.map((f, i) =>
      `${i+1}. [${f.failure_type}] "${f.claim_text}"\n   Evidence: "${f.source_evidence}"\n   Fix: ${f.explanation}`
    ).join('\n\n');

    const correctionRaw = await callClaude(
      CORRECTION_SYSTEM,
      `CLINICAL NOTE:\n${note}\n\nFLAWED SUMMARY:\n${targetSummary}\n\nFLAGS:\n${flagList}\n\nReturn corrected summary as JSON with "summary_text" field.`
    );
    const correctionOut = parseJSON(correctionRaw);
    const correctedText = correctionOut?.summary_text || correctionOut?.summary || '';
    console.log(`   [3] Correction: OK | fixed ${sentinelOut.total_flagged} flags`);

    // Step 4: Re-validate
    const revalidateRaw = await callClaude(
      SENTINEL_SYSTEM,
      `SOURCE NOTE:\n${note}\n\nSUMMARY TO VALIDATE:\n${correctedText}\n\nReturn JSON verdict.`
    );
    const revalidateOut = parseJSON(revalidateRaw);
    console.log(`   [4] Re-validate: ${revalidateOut?.verdict} | severity=${revalidateOut?.overall_severity}`);

    const finalResult = revalidateOut?.verdict === 'PASS' ? 'AUTO_CORRECTED' : 'ESCALATED';
    const icon = finalResult === 'AUTO_CORRECTED' ? '🔧 AUTO-CORRECTED' : '🔴 ESCALATED TO HUMAN';
    console.log(`   → ${icon}`);

    logger.log(id, finalResult, {
      initial_severity: sentinelOut.overall_severity,
      flags_detected: sentinelOut.total_flagged,
      flags_fixed: revalidateOut?.verdict === 'PASS' ? sentinelOut.total_flagged : 0,
      revalidation_verdict: revalidateOut?.verdict
    });

  } catch (e) {
    console.log(`   ❌ ERROR: ${e.message}`);
    logger.log(id, 'ERROR');
  }
}

async function main() {
  if (!KEY) { console.error('ANTHROPIC_API_KEY no está en .env'); process.exit(1); }

  const logger = new AuditLogger();

  const scenarios = fs.readdirSync(path.join(__dirname, 'test-scenarios'))
    .filter(f => f.endsWith('.json'))
    .sort()
    .map(f => JSON.parse(fs.readFileSync(path.join(__dirname, 'test-scenarios', f), 'utf8')));

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  SENTINEL — Full Pipeline Suite (${scenarios.length} scenarios)`);
  console.log(`${'═'.repeat(60)}`);

  for (const scenario of scenarios) {
    await runScenario(scenario, logger);
  }

  logger.print();
}

main();