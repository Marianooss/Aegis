# AEGIS — Demo Video Script
> UiPath AgentHack 2026 · Track 3: Test Cloud
> Total audio: ~3:38 · Hard limit: 5:00 · Language: English · Narración: ElevenLabs Adam

---

## PRE-RECORDING CHECKLIST

- [ ] `node src/dashboard/server.js` → localhost:3000 corriendo
- [ ] 9 MP3s en `audio/` generados (`node aegis_video.js --generate-audio`)
- [ ] Carpeta `video/` creada
- [ ] Chrome abierto — fullscreen F11 listo
- [ ] UiPath Agent Builder — Solutions 6 y 7 visibles
- [ ] UiPath Orchestrator — Shared → Deployments (3 badges verdes)
- [ ] UiPath Studio Web — Solution 8 → Maestro BPMN abierto
- [ ] VSCode terminal limpia
- [ ] Herramienta de recorte Windows 11 testeada (Win+Shift+R)
- [ ] TC-007 visible en dashboard sidebar
- [ ] Export button testeado en TC-002

---

## ESCENA 00 — INTRO (0:00–0:05) · audio: 5s

**Grabás:** `src/dashboard/scene_00_intro.html` fullscreen
**Audio:** `audio/scene_00.mp3`
**Guardás:** `video/scene_00.mp4`

> *"Aegis. CI/CD for Regulated AI. One AI should always watch another — before errors reach humans."*

---

## ESCENA 01 — THE PROBLEM (0:05–0:30) · audio: 24.8s

**Grabás:** `src/dashboard/scene_01_problem.html` fullscreen
**Audio:** `audio/scene_01.mp3`
**Guardás:** `video/scene_01.mp4`

> *"Hospitals are deploying AI to summarize patient records at scale. But what happens when the AI gets it wrong? This note says: No Known Drug Allergies. The AI summary says: documented penicillin allergy. That's a hallucination. And in a clinical setting, it can kill a patient. The question is — who's testing the AI before it reaches the doctor?"*

---

## ESCENA 02 — THE SOLUTION (0:30–0:53) · audio: 22.9s

**Grabás:** `src/dashboard/scene_02_solution.html` fullscreen
**Audio:** `audio/scene_02.mp3`
**Guardás:** `video/scene_02.mp4`

> *"Aegis is a Test Cloud-native validation framework built on UiPath. It generates test scenarios from clinical requirements, executes them through a 4-layer AI validation pipeline, auto-corrects failures, and escalates critical cases to human review. Think of it as CI/CD — but for AI agents in regulated industries."*

---

## ESCENA 03 — UIPATH PLATFORM (0:53–1:40) · audio: 46.6s

**Grabás:** Arrancás con `src/dashboard/scene_03_architecture.html` fullscreen (~15s), después switcheás a:
- Agent Builder → Solution 7 → Solution 6
- Orchestrator → Deployments (3 badges verdes)
- Studio Web → Maestro BPMN → Process.bpmn

**Audio:** `audio/scene_03.mp3`
**Guardás:** `video/scene_03.mp4`

> *"The orchestration runs on UiPath Automation Cloud. Agent Builder hosts two agents: MedicalRecordsSummarizer and SENTINEL Validator. Both deployed and active. The full pipeline is orchestrated by UiPath Maestro. The BPMN is built and validated with zero issues. Publish is blocked by a known UiPath staging bug — documented in the community forum — but the individual agents are fully deployed and running."*

---

## ESCENA 04 — LIVE PIPELINE TC-002 (1:40–2:16) · audio: 36.4s

**Grabás:** Dashboard localhost:3000 — TC-002 seleccionado → click RUN PIPELINE → dejás correr
**Audio:** `audio/scene_04.mp3`
**Guardás:** `video/scene_04.mp4`

**Timing clicks:**
- 0s — TC-002 seleccionado visible
- 5s — click RUN PIPELINE
- 10s — SUMMARIZER COMPLETE visible
- 15s — SENTINEL FAIL · CRITICAL · flags
- 25s — CORRECTION FIXED
- 30s — RE-VALIDATE PASS · diff view visible

> *"Let me show you the pipeline running live. TC-002: A 32-year-old female. Source note: NKDA. AI summary invents a penicillin allergy. Layer 3 detects the contradiction. Verdict: FAIL. CRITICAL. The Correction Agent rewrites the summary. SENTINEL re-validates. The corrected version passes."*

---

## ESCENA 05 — TC-005 ESCALATION (2:16–2:39) · audio: 22.7s

**Grabás:** Dashboard — click TC-005 → click RUN PIPELINE → ESCALATED banner rojo
**Audio:** `audio/scene_05.mp3`
**Guardás:** `video/scene_05.mp4`

> *"Not every failure can be auto-corrected. TC-005: A 72-year-old patient. Potassium at 6.8. Medical emergency. The AI summary said: follow up in 15 days. SENTINEL flags critical omissions. The system escalates to physician review."*

---

## ESCENA 06 — SCENARIO GENERATOR (2:39–3:00) · audio: 20.6s

**Grabás:** VSCode terminal limpia → corrés el comando
**Audio:** `audio/scene_06.mp3`
**Guardás:** `video/scene_06.mp4`

**Comando a correr:**
```
node src/core/scenario-generator.js --requirements "Elderly patient, 78yo, on warfarin. INR 5.2 supratherapeutic. AI summary omits bleeding risk and dose hold instruction."
```

> *"Aegis doesn't just run predefined tests — it generates new ones. From natural language requirements, the Scenario Generator creates a complete test case in seconds — clinically coherent, with expected failure modes and severity classifications. This is Test Design as an agentic capability."*

---

## ESCENA 07 — CODING AGENTS BONUS (3:00–3:17) · audio: 17.3s

**Grabás:** VSCode → abrís `docs/claude-code-evidence.md` → scrolleás la tabla de componentes
**Audio:** `audio/scene_07.mp3`
**Guardás:** `video/scene_07.mp4`

> *"Aegis was built with Claude Code — one of UiPath's supported coding agents. Claude Code scaffolded the 4-layer pipeline, generated the clinical test scenarios, and built the dashboard from scratch. Full evidence is documented in the repository."*

---

## ESCENA 08 — EXPORT + METRICS (3:17–3:39) · audio: 21.5s

**Grabás:** Dashboard → TC-007 → RUN PIPELINE → click EXPORT → JSON se descarga → mostrás métricas derecha
**Audio:** `audio/scene_08.mp3`
**Guardás:** `video/scene_08.mp4`

> *"Every run produces a structured, exportable audit record. Scenario ID, verdict, all flagged claims with source evidence, the flawed summary, the corrected summary, the revalidation result. Full traceability — claim by claim, layer by layer. After 7 test cases, here's what the session metrics show."*

---

## ESCENA 09 — CLOSE (3:39–3:59) · audio: 20.2s

**Grabás:** Dashboard overview → scrolleás para mostrar todo → al final mostrás el GitHub URL en el browser
**Audio:** `audio/scene_09.mp3`
**Guardás:** `video/scene_09.mp4`

> *"Aegis. CI/CD for Regulated AI. Generate tests. Execute them. Evaluate with domain intelligence. Auto-correct. Escalate when it matters. Built on UiPath. Open source. github.com/Marianooss/Aegis"*

---

## TOTAL: ~3:59 · 1:01 de margen antes del límite de 5:00

---

## ORDEN DE GRABACIÓN RECOMENDADO

Grabá en este orden para minimizar switches:

1. **Escenas HTML primero** (no dependen del dashboard):
   - scene_00 → scene_01 → scene_02 → scene_03 (parte HTML)

2. **UiPath Cloud** (tenés que tener las tabs abiertas):
   - scene_03 (parte Agent Builder + Orchestrator + Maestro)

3. **Dashboard** (node server.js corriendo):
   - scene_04 → scene_05 → scene_08 → scene_09

4. **VSCode terminal**:
   - scene_06 → scene_07

---

## DESPUÉS DE GRABAR TODAS LAS ESCENAS

```powershell
node aegis_video.js --combine
```

→ genera `output/aegis_final.mp4` + `output/aegis_subtitles.srt`

**YouTube upload:**
- Título: "Aegis — CI/CD for Regulated AI | UiPath AgentHack 2026"
- Descripción: "Track 3: Test Cloud submission. UiPath AgentHack 2026. github.com/Marianooss/Aegis"
- Subtítulos: subí `aegis_subtitles.srt` en YouTube Studio → Subtítulos
- Visibilidad: Unlisted (el link funciona públicamente)

**Devpost:**
- Pegá el link de YouTube
- Publicá el submission