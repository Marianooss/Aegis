/**
 * Local testing script for SENTINEL layers
 * Usage: node scripts/test-layer.js --layer 2 --scenario TC-002
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
try { require('dotenv').config(); } catch(e) {}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const API_URL = 'https://api.anthropic.com/v1/messages';

if (!ANTHROPIC_API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY not set in .env file');
  process.exit(1);
}

// Parse command line arguments
const args = process.argv.slice(2);
const layerIndex = args.indexOf('--layer');
const scenarioIndex = args.indexOf('--scenario');

if (layerIndex === -1 || scenarioIndex === -1) {
  console.log('Usage: node scripts/test-layer.js --layer <1|2|3|4> --scenario <TC-XXX>');
  console.log('Example: node scripts/test-layer.js --layer 2 --scenario TC-002');
  process.exit(1);
}

const layer = parseInt(args[layerIndex + 1], 10);
const rawScenarioId = args[scenarioIndex + 1];
const scenarioId = rawScenarioId ? rawScenarioId.replace(/[^a-zA-Z0-9_-]/g, '') : '';

// Load test scenario
const testScenariosDir = path.normalize(path.join(__dirname, '..', 'test-scenarios'));
const scenarioFiles = fs.readdirSync(testScenariosDir)
  .filter(f => f.startsWith(scenarioId));

if (scenarioFiles.length === 0) {
  console.error(`Error: No scenario found matching ${scenarioId}`);
  process.exit(1);
}

const scenarioFileFullPath = path.normalize(path.join(testScenariosDir, path.basename(scenarioFiles[0])));
if (!scenarioFileFullPath.startsWith(testScenariosDir)) {
  console.error("Error: Path traversal attempt detected.");
  process.exit(1);
}

const scenario = JSON.parse(
  fs.readFileSync(scenarioFileFullPath, 'utf8')
);

console.log(`\n=== Testing Layer ${layer} with ${scenarioId} ===\n`);
console.log(`Scenario: ${scenario.name}`);
console.log(`Type: ${scenario.type}`);
console.log(`Expected Verdict: ${scenario.expected_verdict}\n`);

// Load layer prompt
const layerPrompts = {
  1: 'layer1-extract.md',
  2: 'layer2-trace.md',
  3: 'layer3-contradict.md',
  4: 'layer4-critical.md'
};

const agentsDir = path.normalize(path.join(__dirname, '..', 'agents', 'sentinel'));
const promptFile = layerPrompts[layer];
const promptFullPath = path.normalize(path.join(agentsDir, promptFile || ''));
if (!promptFile || !promptFullPath.startsWith(agentsDir)) {
  console.error("Error: Path traversal attempt detected or invalid layer.");
  process.exit(1);
}
const promptContent = fs.readFileSync(promptFullPath, 'utf8');

// Extract system prompt from markdown
const systemPromptMatch = promptContent.match(/```\n([\s\S]*?)\n```/);
if (!systemPromptMatch) {
  console.error('Error: Could not extract system prompt from layer file');
  process.exit(1);
}

// Build user input based on layer
function buildUserInput(layer, scenario) {
  const clinicalNote = scenario.clinical_note.content;
  const summaryText = scenario.hallucinated_summary?.summary_text || 
                      scenario.incomplete_summary?.summary_text ||
                      scenario.expected_summary?.summary_text ||
                      'No summary available';

  switch (layer) {
    case 1:
      return `MEDICAL SUMMARY TO ANALYZE:\n---\n${summaryText}\n---\n\nExtract all atomic claims from this summary.`;
    
    case 2:
      // For layer 2, we need Layer 1 output - using mock data for testing
      const mockClaims = {
        claims: [
          {
            claim_id: "C001",
            claim_text: "Patient has a documented allergy to penicillin",
            claim_type: "ALLERGY",
            source_quote: "Paciente con alergia documentada a penicilina"
          }
        ],
        total_claims: 1
      };
      return `SOURCE CLINICAL NOTE:\n---\n${clinicalNote}\n---\n\nCLAIMS TO VERIFY (from Layer 1):\n---\n${JSON.stringify(mockClaims, null, 2)}\n---\n\nFor each claim, determine if supporting evidence exists in the source note.`;
    
    case 3:
      const mockClaimsL3 = {
        claims: [
          {
            claim_id: "C001",
            claim_text: "Patient has a documented allergy to penicillin",
            claim_type: "ALLERGY",
            source_quote: "Paciente con alergia documentada a penicilina"
          }
        ],
        total_claims: 1
      };
      return `SOURCE CLINICAL NOTE:\n---\n${clinicalNote}\n---\n\nCLAIMS TO CHECK FOR CONTRADICTIONS (from Layer 1):\n---\n${JSON.stringify(mockClaimsL3, null, 2)}\n---\n\nFor each claim, determine if the source note contains contradicting information.`;
    
    case 4:
      return `SOURCE CLINICAL NOTE:\n---\n${clinicalNote}\n---\n\nMEDICAL SUMMARY TO AUDIT:\n---\n${summaryText}\n---\n\nIdentify all critical clinical items in the source note and verify they appear appropriately in the summary.`;
    
    default:
      throw new Error(`Invalid layer: ${layer}`);
  }
}

async function callClaudeAPI(systemPrompt, userInput) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userInput }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${response.status} - ${error}`);
  }

  return response.json();
}

async function main() {
  try {
    // Extract just the prompt text (simplified extraction)
    const systemPrompt = promptContent
      .split('### System Prompt')[1]
      ?.split('```')[1]
      ?.trim() || 'You are a medical validation assistant.';

    const userInput = buildUserInput(layer, scenario);

    console.log('--- User Input ---');
    console.log(userInput.substring(0, 500) + '...\n');

    console.log('Calling Claude API...\n');

    const result = await callClaudeAPI(systemPrompt, userInput);
    
    console.log('--- Response ---');
    const content = result.content[0].text;
    
    try {
      const parsed = JSON.parse(content);
      console.log(JSON.stringify(parsed, null, 2));
      
      // Check for sentinel flags
      let flagged = false;
      if (parsed.trace_results) {
        flagged = parsed.trace_results.some(r => r.sentinel_flag);
      } else if (parsed.contradiction_results) {
        flagged = parsed.contradiction_results.some(r => r.sentinel_flag);
      } else if (parsed.critical_scan?.critical_items_found) {
        flagged = parsed.critical_scan.critical_items_found.some(i => i.sentinel_flag);
      }
      
      console.log(`\n--- Result ---`);
      console.log(`Sentinel Flag: ${flagged ? 'TRUE (issue detected)' : 'FALSE (no issues)'}`);
      
    } catch (e) {
      console.log('Raw response (not JSON):');
      console.log(content);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
