require('dotenv').config();
const https = require('https');

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

function callClaude(system, userMsg, maxTokens = 1024) {
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
  if (!raw) return null;
  try {
    // Try direct parse first
    return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
  } catch {
    // Fallback: extract first {...} block
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { }
    }
    // Last resort: if raw text looks like a summary, wrap it
    const trimmed = raw.trim();
    if (trimmed.length > 20 && !trimmed.startsWith('{')) {
      return { summary_text: trimmed };
    }
    return null;
  }
}

async function correctionAgent(clinicalNote, flawedSummary, sentinelFlags) {
  const flagList = sentinelFlags.map((f, i) =>
    `${i+1}. [${f.failure_type}] "${f.claim_text}"\n   Evidence: "${f.source_evidence}"\n   Fix: ${f.explanation}`
  ).join('\n\n');

  const userMsg = `ORIGINAL CLINICAL NOTE (ground truth):\n${clinicalNote}\n\nFLAWED SUMMARY TO CORRECT:\n${flawedSummary}\n\nSENTINEL FLAGS TO FIX:\n${flagList}\n\nGenerate the corrected summary as JSON. Fix every flagged claim. Preserve all accurate content.`;

  const call = callClaude;
  const raw = await call(CORRECTION_SYSTEM, userMsg, 1024);
  console.log('=== CORRECTION RAW RESPONSE ===');
  console.log(raw);
  console.log('=== END RAW ===');
  return parseJSON(raw);
}

module.exports = { correctionAgent, CORRECTION_SYSTEM };
