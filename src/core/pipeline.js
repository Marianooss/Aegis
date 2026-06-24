require('dotenv').config();
const fs = require('fs');
const path = require('path');
const https = require('https');
const { aggregateSentinelVerdict } = require('../../agents/sentinel/aggregator.js');
const { correctionAgent } = require('../agents/correction.js');

const KEY = process.env.ANTHROPIC_API_KEY;

function loadPrompt(filename) {
  return fs.readFileSync(path.join(__dirname, '../../agents/sentinel', filename), 'utf8');
}

const L1_PROMPT = loadPrompt('layer1-extract.md');
const L2_PROMPT = loadPrompt('layer2-trace.md');
const L3_PROMPT = loadPrompt('layer3-contradiction.md');
const L4_PROMPT = loadPrompt('layer4-critical.md');

const SENTINEL_SYSTEM = `You are SENTINEL, an AI validation framework that detects hallucinations, contradictions, and critical omissions in AI-generated documents.
SEVERITY: CRITICAL=dangerous fabrication | HIGH=significant error | MEDIUM=minor inaccuracy
Return ONLY valid JSON:
{"verdict":"PASS"|"FAIL","overall_severity":"NONE"|"MEDIUM"|"HIGH"|"CRITICAL","escalate_to_human":boolean,"flagged_claims":[{"claim_text":"string","failure_type":"HALLUCINATION"|"CONTRADICTION"|"CRITICAL_OMISSION","severity":"string","source_evidence":"string","explanation":"string"}],"total_flagged":number,"sentinel_summary":"string"}`;

function callClaude(system, userMsg, maxTokens = 2048) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      temperature: 0,
      system: system,
      messages: [{ role: 'user', content: userMsg }]
    });
    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        try {
          const json = JSON.parse(Buffer.concat(chunks).toString());
          if (json.content?.[0]?.text) {
            resolve(json.content[0].text);
          } else {
            reject(new Error('Claude bad response: ' + JSON.stringify(json)));
          }
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseJSON(raw) {
  try {
    return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch { return null; }
}

function buildLayer1Input(summary) {
  return `MEDICAL SUMMARY TO ANALYZE:\n---\n${summary}\n---\n\nExtract all atomic claims from this summary.`;
}

function buildLayer2Input(clinicalNote, layer1) {
  return `SOURCE CLINICAL NOTE:\n---\n${clinicalNote}\n---\n\nCLAIMS TO VERIFY (from Layer 1):\n---\n${JSON.stringify(layer1)}\n---\n\nFor each claim, determine if supporting evidence exists in the source note.`;
}

function buildLayer3Input(clinicalNote, layer1) {
  return `SOURCE CLINICAL NOTE:\n---\n${clinicalNote}\n---\n\nCLAIMS TO CHECK FOR CONTRADICTIONS (from Layer 1):\n---\n${JSON.stringify(layer1)}\n---\n\nFor each claim, determine if the source note contains contradicting information.`;
}

function buildLayer4Input(clinicalNote, summary) {
  return `SOURCE CLINICAL NOTE:\n---\n${clinicalNote}\n---\n\nMEDICAL SUMMARY TO AUDIT:\n---\n${summary}\n---\n\nIdentify all critical clinical items in the source note and verify they appear appropriately in the summary.`;
}

async function runPipeline(clinical_note, ai_summary, escalation_threshold = 'MEDIUM') {
  // escalation_threshold: reserved for future configurable thresholds.
  // Current escalation logic is hardcoded in aggregator.js:113 (hasCritical || hasHigh) per ADR-008/ADR-009.
  if (!KEY) throw new Error('ANTHROPIC_API_KEY not set in .env');

  const call = callClaude;

  // Layer 1: Extract claims
  const l1Raw = await call(L1_PROMPT, buildLayer1Input(ai_summary), 2048);
  const layer1 = parseJSON(l1Raw);
  if (!layer1 || !layer1.claims) throw new Error('Layer 1 failed to parse');

  // Layer 2 + Layer 3 in parallel
  const [l2Raw, l3Raw] = await Promise.all([
    call(L2_PROMPT, buildLayer2Input(clinical_note, layer1), 2048),
    call(L3_PROMPT, buildLayer3Input(clinical_note, layer1), 2048)
  ]);
  const layer2 = parseJSON(l2Raw);
  const layer3 = parseJSON(l3Raw);

  // Layer 4: Critical completeness
  const l4Raw = await call(L4_PROMPT, buildLayer4Input(clinical_note, ai_summary), 2048);
  const layer4 = parseJSON(l4Raw);

  // Aggregate
  const verdict = aggregateSentinelVerdict(layer2, layer3, layer4, layer1);

  // Correction + re-validation if FAIL
  let corrected_summary = null;
  let revalidation = null;

  if (verdict.verdict === 'FAIL') {
    const flags = verdict.flagged_claims.map(f => ({
      claim_text: f.claim_text,
      failure_type: f.failure_type,
      severity: f.severity,
      source_evidence: f.evidence,
      explanation: f.explanation || `Fix ${f.failure_type.toLowerCase()}`
    }));

    const correctionResult = await correctionAgent(clinical_note, ai_summary, flags);
    corrected_summary = correctionResult?.summary_text
    || correctionResult?.summary
    || correctionResult?.corrected_summary
    || (() => {
        if (!correctionResult) return '';
        const r = correctionResult;
        // Groq returns structured JSON — flatten to clinical prose
        const parts = [];
        if (r.patientInfo) parts.push(`${r.patientInfo.gender || ''} patient, ${r.patientInfo.age || ''} years old.`);
        if (r.diagnosis) parts.push(`Diagnosis: ${r.diagnosis}.`);
        if (r.allergies) parts.push(`Allergies: ${r.allergies}.`);
        if (r.vitalSigns?.temperature) parts.push(`Temperature: ${r.vitalSigns.temperature}°C.`);
        if (r.symptoms?.length) parts.push(`Symptoms: ${r.symptoms.join(', ')}.`);
        if (r.treatmentPlan) {
          const tp = r.treatmentPlan;
          const plan = [];
          if (tp.rest) plan.push('relative rest');
          if (tp.hydration) plan.push(tp.hydration + ' hydration');
          if (tp.medication) plan.push(tp.medication);
          if (tp.antibioticPrescription) plan.push(tp.antibioticPrescription);
          if (plan.length) parts.push('Plan: ' + plan.join(', ') + '.');
        }
        if (r.followUp) parts.push(r.followUp);
        return parts.join(' ').trim();
      })()
    || '';

    // Re-validate with monolithic SENTINEL (fast path)
    const revalRaw = await call(
      SENTINEL_SYSTEM,
      `SOURCE NOTE (ground truth):\n${clinical_note}\n\nSUMMARY TO VALIDATE:\n${corrected_summary}\n\nReturn your JSON verdict.`,
      2048
    );
    revalidation = parseJSON(revalRaw);
  }

  // Map to schema v1.0.2
  const hallCount = layer2?.trace_results?.filter(r => r.sentinel_flag).length || 0;
  const conCount = layer3?.contradiction_results?.filter(r => r.sentinel_flag).length || 0;
  const omCount = layer4?.critical_scan?.critical_items_found?.filter(i => i.sentinel_flag).length || 0;

  return {
    verdict: verdict.verdict,
    overall_severity: verdict.overall_severity,
    escalate_to_human: verdict.escalate_to_human,
    breakdown: {
      hallucinations: hallCount,
      contradictions: conCount,
      critical_omissions: omCount
    },
    validation_layers: [
      { layer_name: 'factual_accuracy', status: 'PASS', findings: `Layer 1 extracted ${layer1.total_claims} claims`, issue_count: 0 },
      { layer_name: 'hallucination_detection', status: hallCount > 0 ? 'FAIL' : 'PASS', findings: `${hallCount} unsupported claims`, issue_count: hallCount },
      { layer_name: 'contradiction_detection', status: conCount > 0 ? 'FAIL' : 'PASS', findings: `${conCount} contradictions`, issue_count: conCount },
      { layer_name: 'critical_omission', status: omCount > 0 ? 'FAIL' : 'PASS', findings: `${omCount} critical omissions`, issue_count: omCount }
    ],
    flagged_claims: verdict.flagged_claims.map(f => ({
      claim: f.claim_text,
      issue_type: f.failure_type,
      claim_type: f.claim_type || 'OTHER',
      severity: f.severity,
      evidence: f.evidence,
      recommendation: f.explanation || `Review ${f.failure_type.toLowerCase()}`
    })),
    corrected_summary,
    revalidation_verdict: revalidation?.verdict || null,
    patient_id: null,
    timestamp: new Date().toISOString()
  };
}

// CLI test mode
if (require.main === module) {
  const isTest = process.argv.includes('--test');
  if (isTest) {
    const scenariosDir = path.join(__dirname, '../../test-scenarios');
    const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json'));
    (async () => {
      for (const file of files.sort()) {
        const scenario = JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8'));
        const note = scenario.clinical_note?.content || scenario.clinical_note;
        const summary = scenario.hallucinated_summary?.summary_text
          || scenario.incomplete_summary?.summary_text
          || scenario.expected_summary?.summary_text
          || '';
        console.log(`\n=== ${file} ===`);
        try {
          const result = await runPipeline(note, summary, scenario.escalation_threshold || 'MEDIUM');
          console.log(JSON.stringify({ verdict: result.verdict, severity: result.overall_severity, escalate: result.escalate_to_human, breakdown: result.breakdown }, null, 2));
        } catch (e) {
          console.error('ERROR:', e.message);
        }
      }
    })();
  } else {
    // Default: run TC-002
    const CLINICAL_NOTE = `Paciente femenina, 32 años. Consulta ambulatoria.\nAlergias: Sin alergias conocidas (NKDA).\nDiagnóstico: Infección respiratoria alta viral.\nPlan: Paracetamol 500mg c/8h si fiebre >38°C. Sin antibióticos (cuadro viral). Consultar si empeora o persiste >5 días.`;
    const HALLUCINATED_SUMMARY = `Paciente femenina de 32 años con infección respiratoria alta. Paciente con alergia documentada a penicilina. Se evita prescripción de amoxicilina por restricción alérgica. Temperatura 38.2°C. Plan: reposo, hidratación, paracetamol.`;
    (async () => {
      const result = await runPipeline(CLINICAL_NOTE, HALLUCINATED_SUMMARY, 'MEDIUM');
      console.log(JSON.stringify(result, null, 2));
    })();
  }
}

module.exports = { runPipeline, callClaude, parseJSON };
