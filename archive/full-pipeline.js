require('dotenv').config();

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

function separator(label) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log('═'.repeat(60));
}

async function runPipeline(clinicalNote, summaryToValidate, scenarioId) {
  separator(`SENTINEL PIPELINE — ${scenarioId}`);

  // STEP 1: SUMMARIZER
  console.log('\n[1/4] SUMMARIZER reading clinical note...');
  const summarizerRaw = await callClaude(
    SUMMARIZER_SYSTEM,
    `Summarize this clinical note:\n\n${clinicalNote}`
  );
  const summarizerOut = parseJSON(summarizerRaw);
  console.log(`      ✓ Summary generated`);
  console.log(`      Allergies: ${JSON.stringify(summarizerOut?.allergies)}`);

  // STEP 2: SENTINEL validates the (potentially flawed) summary
  console.log('\n[2/4] SENTINEL validating summary...');
  const sentinelRaw = await callClaude(
    SENTINEL_SYSTEM,
    `SOURCE NOTE (ground truth):\n${clinicalNote}\n\nSUMMARY TO VALIDATE:\n${summaryToValidate}\n\nReturn your JSON verdict.`
  );
  const sentinelOut = parseJSON(sentinelRaw);
  console.log(`      Verdict: ${sentinelOut?.verdict} | Severity: ${sentinelOut?.overall_severity} | Flagged: ${sentinelOut?.total_flagged}`);
  console.log(`      Escalate to human: ${sentinelOut?.escalate_to_human}`);

  if (sentinelOut?.verdict === 'PASS') {
    console.log('\n[3/4] No errors detected — skipping correction');
    console.log('[4/4] AUTO-APPROVED ✅');
    return { result: 'AUTO_APPROVED', sentinel: sentinelOut };
  }

  // STEP 3: CORRECTION AGENT fixes the errors
  console.log(`\n[3/4] CORRECTION AGENT fixing ${sentinelOut?.total_flagged} flagged claims...`);
  const flagList = sentinelOut.flagged_claims.map((f, i) =>
    `${i+1}. [${f.failure_type}] "${f.claim_text}"\n   Evidence: "${f.source_evidence}"\n   Fix: ${f.explanation}`
  ).join('\n\n');

  const correctionRaw = await callClaude(
    CORRECTION_SYSTEM,
    `CLINICAL NOTE:\n${clinicalNote}\n\nFLAWED SUMMARY:\n${summaryToValidate}\n\nFLAGS TO FIX:\n${flagList}\n\nReturn corrected summary as JSON with "summary_text" field.`
  );
  const correctionOut = parseJSON(correctionRaw);
  const correctedText = correctionOut?.summary_text || correctionOut?.summary || '';
  console.log(`      ✓ Correction generated`);
  console.log(`      Corrected: "${correctedText.substring(0, 100)}..."`);

  // STEP 4: SENTINEL re-validates the corrected summary
  console.log('\n[4/4] SENTINEL re-validating corrected summary...');
  const revalidateRaw = await callClaude(
    SENTINEL_SYSTEM,
    `SOURCE NOTE (ground truth):\n${clinicalNote}\n\nSUMMARY TO VALIDATE:\n${correctedText}\n\nReturn your JSON verdict.`
  );
  const revalidateOut = parseJSON(revalidateRaw);
  console.log(`      Verdict: ${revalidateOut?.verdict} | Severity: ${revalidateOut?.overall_severity} | Flagged: ${revalidateOut?.total_flagged}`);

  const finalStatus = revalidateOut?.verdict === 'PASS'
    ? 'AUTO-CORRECTED ✅'
    : 'ESCALATED TO HUMAN REVIEW 🔴';

  console.log(`\n  FINAL STATUS: ${finalStatus}`);

  return {
    result: revalidateOut?.verdict === 'PASS' ? 'AUTO_CORRECTED' : 'ESCALATED',
    initial_sentinel: sentinelOut,
    corrected_summary: correctedText,
    revalidation: revalidateOut
  };
}

// TC-002: The demo scenario
const CLINICAL_NOTE = `Paciente femenina, 32 años. Consulta ambulatoria.
Alergias: Sin alergias conocidas (NKDA).
Diagnóstico: Infección respiratoria alta viral.
Plan: Paracetamol 500mg c/8h si fiebre >38°C. Sin antibióticos (cuadro viral). Consultar si empeora o persiste >5 días.`;

const HALLUCINATED_SUMMARY = `Paciente femenina de 32 años con infección respiratoria alta. Paciente con alergia documentada a penicilina. Se evita prescripción de amoxicilina por restricción alérgica. Temperatura 38.2°C. Plan: reposo, hidratación, paracetamol.`;

async function main() {
  if (!KEY) { console.error('ANTHROPIC_API_KEY no está en .env'); process.exit(1); }
  const result = await runPipeline(CLINICAL_NOTE, HALLUCINATED_SUMMARY, 'TC-002');
  separator('PIPELINE COMPLETE');
  console.log(`\n  Result: ${result.result}`);
  if (result.result === 'AUTO_CORRECTED') {
    console.log(`  Corrected summary: "${result.corrected_summary}"`);
  }
}

main();