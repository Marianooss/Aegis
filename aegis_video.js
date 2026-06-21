/**
 * Aegis Video Generator — Node.js
 * ================================
 * Genera audio TTS por escena con ElevenLabs API
 * Combina videos grabados + audio + subtítulos SRT con ffmpeg
 *
 * REQUISITOS:
 *   - Node.js (ya instalado)
 *   - ffmpeg instalado en PATH (winget install ffmpeg)
 *   - ELEVENLABS_API_KEY en .env
 *
 * USO:
 *   node aegis_video.js --generate-audio   → genera audio/scene_XX.mp3
 *   node aegis_video.js --guide            → muestra guía de grabación
 *   node aegis_video.js --combine          → combina video + audio + srt
 */

require('dotenv').config();
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, exec } = require('child_process');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || 'sk_8dc2a87464fc40af7563aef5880ae15d9ba10adc6f3617cb';
const VOICE_ID = 'pNInz6obpgDQGcFmaJgB'; // Adam — free tier
const MODEL_ID = 'eleven_multilingual_v2';

const AUDIO_DIR = path.join(__dirname, 'audio');
const VIDEO_DIR = path.join(__dirname, 'video');
const OUTPUT_DIR = path.join(__dirname, 'output');

// ─── ESCENAS ──────────────────────────────────────────────────────────────────

const SCENES = [
  {
    id: '00',
    name: 'Intro',
    durationHint: 5,
    screen: 'scene_00_intro.html — imagen Aegis.png fullscreen',
    script: `Aegis. CI/CD for Regulated AI. One AI should always watch another — before errors reach humans.`
  },
  {
    id: '01',
    name: 'The Problem',
    durationHint: 20,
    screen: 'Dashboard — TC-002 selected, NKDA visible in note',
    script: `Hospitals are deploying AI to summarize patient records at scale.
But what happens when the AI gets it wrong?
This note says: No Known Drug Allergies.
The AI summary says: documented penicillin allergy.
That's a hallucination. And in a clinical setting, it can kill a patient.
The question is — who's testing the AI before it reaches the doctor?`
  },
  {
    id: '02',
    name: 'The Solution',
    durationHint: 25,
    screen: 'Dashboard overview — 4-stage pipeline visible',
    script: `Aegis is a Test Cloud-native validation framework built on UiPath.
It generates test scenarios from clinical requirements,
executes them through a 4-layer AI validation pipeline,
auto-corrects failures, and escalates critical cases to human review.
Think of it as CI/CD — but for AI agents in regulated industries.`
  },
  {
    id: '03',
    name: 'UiPath Platform',
    durationHint: 35,
    screen: 'Agent Builder → Solutions 6+7 → Orchestrator → Maestro BPMN',
    script: `The orchestration runs on UiPath Automation Cloud.
Agent Builder hosts two agents:
MedicalRecordsSummarizer — receives a clinical note and generates a structured summary.
SENTINEL Validator — receives the summary and the original note and runs 4-layer validation.
Both agents are deployed and active on UiPath Automation Cloud.
The full pipeline is orchestrated by UiPath Maestro.
The BPMN models the complete flow — Summarizer to SENTINEL to Action Center gateway.
The process is built and validated with zero issues.
Publish is blocked by a known UiPath staging platform bug, documented in the community forum —
but the individual agents are fully deployed and running.`
  },
  {
    id: '04',
    name: 'Live Pipeline — TC-002',
    durationHint: 75,
    screen: 'Dashboard — TC-002 running live',
    script: `Let me show you the pipeline running live.
TC-002: A 32-year-old female with an upper respiratory infection.
The source note says NKDA — No Known Drug Allergies.
Watch what the AI summary produced.
Layer 3 detects a direct contradiction:
source says NKDA, summary invents a penicillin allergy.
Verdict: FAIL. Severity: CRITICAL.
The Correction Agent rewrites the summary, removing the fabricated allergy.
SENTINEL re-validates. The corrected version passes.`
  },
  {
    id: '05',
    name: 'TC-005 Escalation',
    durationHint: 30,
    screen: 'Dashboard — TC-005 running, ESCALATED banner',
    script: `Not every failure can be auto-corrected.
TC-005: A 72-year-old patient. Potassium at 6.8 milliequivalents per liter.
That's a medical emergency. The AI summary said: follow up in 15 days.
SENTINEL flags critical omissions that cannot be auto-fixed.
The system escalates to physician review.`
  },
  {
    id: '06',
    name: 'Scenario Generator',
    durationHint: 30,
    screen: 'VSCode terminal — scenario-generator running',
    script: `Aegis doesn't just run predefined tests — it generates new ones.
From natural language clinical requirements,
the Scenario Generator creates a complete test case in seconds —
clinically coherent, with expected failure modes, layer assignments, and severity classifications.
This is Test Design as an agentic capability.`
  },
  {
    id: '07',
    name: 'Coding Agents Bonus',
    durationHint: 20,
    screen: 'VSCode — docs/claude-code-evidence.md',
    script: `Aegis was built with Claude Code — one of UiPath's supported coding agents.
Claude Code scaffolded the 4-layer pipeline architecture,
generated the clinical test scenarios,
and built the dashboard from scratch.
Full evidence is documented in the repository.`
  },
  {
    id: '08',
    name: 'Export and Metrics',
    durationHint: 30,
    screen: 'Dashboard — TC-007 export + session metrics panel',
    script: `Every run produces a structured, exportable audit record.
Scenario ID, verdict, all flagged claims with source evidence,
the flawed summary, the corrected summary, the revalidation result.
Full traceability — claim by claim, layer by layer.
After 7 test cases, here's what the session metrics show.`
  },
  {
    id: '09',
    name: 'Close',
    durationHint: 20,
    screen: 'Dashboard overview — GitHub URL visible',
    script: `Aegis. CI/CD for Regulated AI.
Generate tests. Execute them. Evaluate with domain intelligence.
Auto-correct. Escalate when it matters.
Built on UiPath. Open source.
github dot com slash Marianooss slash Aegis`
  },
];

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function mkdir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function checkFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function getAudioDuration(filePath) {
  try {
    const out = execSync(
      `ffprobe -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8' }
    );
    return parseFloat(out.trim());
  } catch {
    return null;
  }
}

function formatSrtTime(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(ms).padStart(3,'0')}`;
}

// ─── ELEVENLABS TTS ───────────────────────────────────────────────────────────

function generateTTS(text, outputPath) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: MODEL_ID,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    });

    const options = {
      hostname: 'api.elevenlabs.io',
      path: `/v1/text-to-speech/${VOICE_ID}`,
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode !== 200) {
        let errData = '';
        res.on('data', chunk => errData += chunk);
        res.on('end', () => reject(new Error(`ElevenLabs error ${res.statusCode}: ${errData.substring(0, 200)}`)));
        return;
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        fs.writeFileSync(outputPath, Buffer.concat(chunks));
        resolve();
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ─── PASO 1: GENERAR AUDIO ────────────────────────────────────────────────────

async function generateAudio() {
  mkdir(AUDIO_DIR);
  mkdir(VIDEO_DIR);

  console.log('\n🎙️  AEGIS — Generando audio TTS con ElevenLabs');
  console.log('='.repeat(55));

  for (const scene of SCENES) {
    const outputPath = path.join(AUDIO_DIR, `scene_${scene.id}.mp3`);

    if (fs.existsSync(outputPath)) {
      const dur = getAudioDuration(outputPath);
      console.log(`  ⏭️  Scene ${scene.id} — ya existe (${dur?.toFixed(1)}s), saltando`);
      continue;
    }

    process.stdout.write(`\n  🔊 Scene ${scene.id}: ${scene.name}... `);

    try {
      await generateTTS(scene.script, outputPath);
      const dur = getAudioDuration(outputPath);
      const kb = (fs.statSync(outputPath).size / 1024).toFixed(1);
      console.log(`✅ ${dur?.toFixed(1)}s · ${kb}KB`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }

    await sleep(500);
  }

  console.log('\n');
  printRecordingGuide();
}

// ─── GUÍA DE GRABACIÓN ────────────────────────────────────────────────────────

function printRecordingGuide() {
  console.log('='.repeat(60));
  console.log('📋 GUÍA DE GRABACIÓN');
  console.log('='.repeat(60));
  console.log('\nGrabá cada escena en OBS/Loom → guardá en /video/\n');

  for (const scene of SCENES) {
    const audioPath = path.join(AUDIO_DIR, `scene_${scene.id}.mp3`);
    let durStr = `~${scene.durationHint}s`;
    if (fs.existsSync(audioPath)) {
      const dur = getAudioDuration(audioPath);
      if (dur) durStr = `${dur.toFixed(1)}s`;
    }

    console.log(`  video/scene_${scene.id}.mp4  (${durStr})`);
    console.log(`  → ${scene.name}`);
    console.log(`  → Pantalla: ${scene.screen}`);
    console.log();
  }

  console.log('TIPS:');
  console.log('  1. Escuchá el audio de la escena ANTES de grabar');
  console.log('  2. Arrancá OBS/Loom, reproducís el MP3, hacés los clicks en sync');
  console.log('  3. Grabá 1s de buffer al inicio y al final');
  console.log('  4. Resolución: 1920x1080 · FPS: 30');
  console.log('\nCuando terminés todas las escenas:');
  console.log('  node aegis_video.js --combine\n');
}

// ─── PASO 2: COMBINAR ─────────────────────────────────────────────────────────

async function combineVideos() {
  if (!checkFfmpeg()) {
    console.error('❌ ffmpeg no encontrado. Instalá con: winget install ffmpeg');
    process.exit(1);
  }

  mkdir(OUTPUT_DIR);

  console.log('\n🎬 AEGIS — Combinando video final');
  console.log('='.repeat(55));

  const clips = [];
  const missing = [];
  let totalDuration = 0;
  const srtEntries = [];
  let srtIndex = 1;

  for (const scene of SCENES) {
    const videoPath = path.join(VIDEO_DIR, `scene_${scene.id}.mp4`);
    const audioPath = path.join(AUDIO_DIR, `scene_${scene.id}.mp3`);

    if (!fs.existsSync(videoPath)) { missing.push(`video/scene_${scene.id}.mp4`); continue; }
    if (!fs.existsSync(audioPath)) { missing.push(`audio/scene_${scene.id}.mp3`); continue; }

    const audioDur = getAudioDuration(audioPath);
    if (!audioDur) { console.log(`  ❌ Scene ${scene.id}: no se pudo leer duración del audio`); continue; }

    // Crear clip con audio reemplazado usando ffmpeg
    const mergedPath = path.join(OUTPUT_DIR, `merged_${scene.id}.mp4`);
    console.log(`\n  🎞️  Scene ${scene.id}: ${scene.name} (${audioDur.toFixed(1)}s)`);

    try {
      // Recortar video a duración del audio y reemplazar audio
      execSync(
        `ffmpeg -y -i "${videoPath}" -i "${audioPath}" -t ${audioDur} -map 0:v:0 -map 1:a:0 -c:v libx264 -c:a aac -shortest "${mergedPath}"`,
        { stdio: 'ignore' }
      );
      clips.push(mergedPath);

      // Generar subtítulos para esta escena
      const lines = scene.script.split('\n').map(l => l.trim()).filter(Boolean);
      const timePerLine = audioDur / lines.length;
      lines.forEach((line, i) => {
        const start = totalDuration + i * timePerLine;
        const end = totalDuration + (i + 1) * timePerLine;
        srtEntries.push(`${srtIndex}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${line}`);
        srtIndex++;
      });

      totalDuration += audioDur;
      console.log(`     ✅ OK`);
    } catch (e) {
      console.log(`     ❌ Error: ${e.message}`);
    }
  }

  if (missing.length > 0) {
    console.log('\n⚠️  Archivos faltantes:');
    missing.forEach(m => console.log(`    ${m}`));
  }

  if (clips.length === 0) {
    console.log('\n❌ No hay clips para combinar.');
    return;
  }

  // Crear lista de clips para ffmpeg concat
  const listPath = path.join(OUTPUT_DIR, 'clips_list.txt');
  fs.writeFileSync(listPath, clips.map(c => `file '${c}'`).join('\n'));

  const finalPath = path.join(OUTPUT_DIR, 'aegis_final.mp4');
  console.log(`\n🔗 Concatenando ${clips.length} escenas...`);

  try {
    execSync(
      `ffmpeg -y -f concat -safe 0 -i "${listPath}" -c copy "${finalPath}"`,
      { stdio: 'inherit' }
    );
  } catch (e) {
    console.error('❌ Error en concatenación:', e.message);
    return;
  }

  // Guardar SRT
  const srtPath = path.join(OUTPUT_DIR, 'aegis_subtitles.srt');
  fs.writeFileSync(srtPath, srtEntries.join('\n\n'), 'utf8');

  // Limpiar clips intermedios
  clips.forEach(c => { try { fs.unlinkSync(c); } catch {} });
  try { fs.unlinkSync(listPath); } catch {}

  console.log('\n' + '='.repeat(55));
  console.log('✅ COMPLETADO');
  console.log(`📹 Video final:  output/aegis_final.mp4`);
  console.log(`📝 Subtítulos:   output/aegis_subtitles.srt`);
  console.log(`⏱️  Duración:     ${totalDuration.toFixed(1)}s (${(totalDuration/60).toFixed(1)} min)`);

  if (totalDuration > 300) {
    console.log(`⚠️  SUPERA 5 MINUTOS — recortá algunas escenas`);
  } else {
    console.log(`✅ Dentro del límite de 5 minutos`);
  }

  console.log('\nPRÓXIMOS PASOS:');
  console.log('  1. Revisá output/aegis_final.mp4');
  console.log('  2. Subí a YouTube (unlisted)');
  console.log('  3. Subí aegis_subtitles.srt como subtítulos en YouTube');
  console.log('  4. Pegá el link en Devpost');
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.includes('--generate-audio')) {
  generateAudio().catch(e => { console.error('Error:', e.message); process.exit(1); });
} else if (args.includes('--combine')) {
  combineVideos().catch(e => { console.error('Error:', e.message); process.exit(1); });
} else if (args.includes('--guide')) {
  printRecordingGuide();
} else {
  console.log('\n🎬 Aegis Video Generator\n');
  console.log('Uso:');
  console.log('  node aegis_video.js --generate-audio   Genera audio TTS por escena');
  console.log('  node aegis_video.js --guide            Muestra guía de grabación');
  console.log('  node aegis_video.js --combine          Combina video + audio + subtítulos');
  console.log('\nFlujo:');
  console.log('  1. node aegis_video.js --generate-audio');
  console.log('  2. Grabá las escenas → video/scene_01.mp4 ... scene_09.mp4');
  console.log('  3. node aegis_video.js --combine');
}
