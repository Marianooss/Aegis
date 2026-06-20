require('dotenv').config();
const https = require('https');

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

function callClaude(system, userMsg, maxTokens = 1024) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }]
    });
    const req = https.request('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode < 200 || res.statusCode >= 300) {
            reject(new Error(`API error ${res.statusCode}: ${data.substring(0, 200)}`));
          } else {
            resolve(parsed.content[0].text);
          }
        } catch (e) {
          reject(new Error(`Parse error: ${data.substring(0, 200)}`));
        }
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
  } catch {
    return null;
  }
}

async function correctionAgent(clinicalNote, flawedSummary, sentinelFlags) {
  const flagList = sentinelFlags.map((f, i) =>
    `${i+1}. [${f.failure_type}] "${f.claim_text}"\n   Evidence: "${f.source_evidence}"\n   Fix: ${f.explanation}`
  ).join('\n\n');

  const userMsg = `ORIGINAL CLINICAL NOTE (ground truth):\n${clinicalNote}\n\nFLAWED SUMMARY TO CORRECT:\n${flawedSummary}\n\nSENTINEL FLAGS TO FIX:\n${flagList}\n\nGenerate the corrected summary as JSON. Fix every flagged claim. Preserve all accurate content.`;

  const raw = await callClaude(CORRECTION_SYSTEM, userMsg, 1024);
  return parseJSON(raw);
}

module.exports = { correctionAgent, CORRECTION_SYSTEM };
