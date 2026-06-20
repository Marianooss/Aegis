require('dotenv').config();

const API_URL = 'https://api.anthropic.com/v1/messages';
const KEY = process.env.ANTHROPIC_API_KEY;

const PREMORTEM_SYSTEM = `You are a brutally honest hackathon judge and senior AI architect. 
You have seen hundreds of hackathon projects fail. You do not soften feedback.
When asked to do a premortem, you imagine the project already lost and work backwards to find every real reason why.
You are not encouraging. You are accurate.`;

const PREMORTEM_PROMPT = `It is June 27, 2026. UiPath AgentHack 2026 just ended. 
SENTINEL — Agentic AI Validator for Medical Summaries — did not place.

Here is what the project had at submission:
- 4-agent pipeline: Summarizer → SENTINEL Validator → Correction Agent → Audit Logger
- Loop: detect hallucinations → auto-correct → re-validate
- 6 test scenarios, 83.3% safe rate, TC-005 correctly escalated to human review
- Node.js implementation calling Claude API directly
- UiPath Agent Builder configured with system prompts (no Maestro workflow, no Action Center tasks running)
- Demo video showing node full-pipeline.js running in terminal
- Devpost submission complete with deck and GitHub repo
- Solo developer, Buenos Aires, Argentina, self-taught AI builder

Why did SENTINEL lose? 

List every real reason, ranked by impact. Be specific. No encouragement. 
Then for each reason, say whether it was fixable before the deadline and how.`;

async function main() {
  if (!KEY) { console.error('ANTHROPIC_API_KEY no está en .env'); process.exit(1); }

  console.log('\n════════════════════════════════════════════════════════════');
  console.log('  SENTINEL PREMORTEM — June 27, 2026');
  console.log('  "We lost. Why?"');
  console.log('════════════════════════════════════════════════════════════\n');

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
      system: PREMORTEM_SYSTEM,
      messages: [{ role: 'user', content: PREMORTEM_PROMPT }]
    })
  });

  const data = await res.json();
  if (!res.ok) { console.error('API error:', data); process.exit(1); }

  console.log(data.content[0].text);
  console.log('\n════════════════════════════════════════════════════════════');
}

main();