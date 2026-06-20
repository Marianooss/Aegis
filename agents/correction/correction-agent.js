require('dotenv').config();

const API_URL = 'https://api.anthropic.com/v1/messages';
const KEY = process.env.ANTHROPIC_API_KEY;

const CORRECTION_SYSTEM = `You are a medical summary correction specialist. You receive:
1. An original clinical note (ground truth)
2. A flawed AI-generated summary with specific errors identified by SENTINEL
3. A list of flagged claims with explanations

Your job: generate a corrected summary that fixes ONLY the flagged errors while preserving all accurate content.

RULES:
- Fix each flagged claim precisely — do not rewrite the entire summary
- Never introduce new information not present in the source note
- For HALLUCINATION: remove the fabricated claim entirely
- For CONTRADICTION: replace with the accurate information from the source note
- For CRITICAL_OMISSION: add the missing critical information
- Return ONLY valid JSON matching the original summary schema`;

async function callClaude(system, userMsg, maxTokens = 1024) {
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
  } catch {
    return null;
  }
}

async function correctionAgent(clinicalNote, flawedSummary, sentinelFlags) {
  const flagList = sentinelFlags.map((f, i) =>
    `${i+1}. [${f.failure_type}] "${f.claim_text}"\n   Evidence: "${f.source_evidence}"\n   Fix: ${f.explanation}`
  ).join('\n\n');

  const userMsg = `ORIGINAL CLINICAL NOTE (ground truth):
${clinicalNote}

FLAWED SUMMARY TO CORRECT:
${flawedSummary}

SENTINEL FLAGS TO FIX:
${flagList}

Generate the corrected summary as JSON. Fix every flagged claim. Preserve all accurate content.`;

  const raw = await callClaude(CORRECTION_SYSTEM, userMsg, 1024);
  return parseJSON(raw);
}

// --- TEST: run correction on TC-002 ---
const CLINICAL_NOTE = `Paciente femenina, 32 años. Consulta ambulatoria.
Motivo de consulta: Infección respiratoria alta de 3 días de evolución.
Síntomas: Odinofagia, rinorrea, tos seca.
Alergias: Sin alergias conocidas (NKDA).
Examen físico: Temperatura 38.2°C, faringe eritematosa sin exudado, ganglios cervicales levemente aumentados.
Diagnóstico: Infección respiratoria alta viral.
Plan: Reposo relativo, hidratación abundante, Paracetamol 500mg c/8h si fiebre >38°C. Sin antibióticos (cuadro viral). Consultar si empeora o persiste >5 días.`;

const FLAWED_SUMMARY = `Paciente femenina de 32 años con infección respiratoria alta. Paciente con alergia documentada a penicilina. Se evita prescripción de amoxicilina por restricción alérgica. Temperatura 38.2°C. Plan: reposo, hidratación, paracetamol.`;

const SENTINEL_FLAGS = [
  {
    claim_text: "Paciente con alergia documentada a penicilina",
    failure_type: "HALLUCINATION",
    severity: "CRITICAL",
    source_evidence: "Alergias: Sin alergias conocidas (NKDA).",
    explanation: "Remove fabricated penicillin allergy. Source states NKDA explicitly."
  },
  {
    claim_text: "Se evita prescripción de amoxicilina por restricción alérgica",
    failure_type: "HALLUCINATION",
    severity: "CRITICAL",
    source_evidence: "Sin antibióticos (cuadro viral).",
    explanation: "Remove fabricated justification. Antibiotics avoided due to viral etiology, not allergy."
  },
  {
    claim_text: "Omisión de instrucción de seguimiento",
    failure_type: "CRITICAL_OMISSION",
    severity: "MEDIUM",
    source_evidence: "Consultar si empeora o persiste >5 días.",
    explanation: "Add missing follow-up instruction."
  }
];

async function main() {
  if (!KEY) { console.error('ANTHROPIC_API_KEY no está en .env'); process.exit(1); }

  console.log('\n========================================');
  console.log('CORRECTION AGENT — TC-002 Demo');
  console.log('========================================');
  console.log('\nFLAWED SUMMARY:');
  console.log(FLAWED_SUMMARY);
  console.log('\nRunning correction...\n');

  const corrected = await correctionAgent(CLINICAL_NOTE, FLAWED_SUMMARY, SENTINEL_FLAGS);

  console.log('CORRECTED SUMMARY:');
  console.log(JSON.stringify(corrected, null, 2));
  console.log('\n✅ Correction Agent working');
}

main();