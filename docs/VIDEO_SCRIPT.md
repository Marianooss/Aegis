# AEGIS — Demo Video Script
> UiPath AgentHack 2026 · Track 3: Test Cloud
> Target: 4:40 min · Hard limit: 5:00 · Language: English · Your voice, no TTS

---

## PRE-RECORDING CHECKLIST

- [ ] Dashboard running: `node src/dashboard/server.js` → localhost:3000
- [ ] Browser open at localhost:3000 (Chrome, full screen, zoom 110%)
- [ ] UiPath Agent Builder open in second tab — Solution 6 + Solution 7 visible
- [ ] UiPath Orchestrator open in third tab — Shared folder, Deployments overview (3 green Active badges)
- [ ] VSCode terminal ready (PowerShell, clean, no sensitive data visible)
- [ ] `.env` confirmed working — ANTHROPIC_API_KEY set
- [ ] TC-007 visible in dashboard sidebar
- [ ] Export button tested on TC-002
- [ ] OBS / Loom recording at 1920x1080, 30fps
- [ ] Microphone tested, no background noise
- [ ] Phone on silent

---

## SCENE 1 — THE PROBLEM (0:00–0:20)

**Screen:** Dashboard — TC-002 selected, clinical note visible
**Highlight:** The word "NKDA" in the note

**Script:**
> "Hospitals are deploying AI to summarize patient records at scale.
> But what happens when the AI gets it wrong?
> This note says: No Known Drug Allergies.
> The AI summary says: documented penicillin allergy.
> That's a hallucination. And in a clinical setting, it can kill a patient.
> The question is — who's testing the AI before it reaches the doctor?"

**Duration:** 20 seconds

---

## SCENE 2 — THE SOLUTION (0:20–0:45)

**Screen:** Dashboard overview — pipeline diagram visible (4 stages: SUMMARIZER → SENTINEL → CORRECTION → RE-VALIDATE)

**Script:**
> "Aegis is a Test Cloud-native validation framework built on UiPath.
> It generates test scenarios from clinical requirements,
> executes them through a 4-layer AI validation pipeline,
> auto-corrects failures, and escalates critical cases to human review.
> Think of it as CI/CD — but for AI agents in regulated industries."

**Show while talking:** Point to each stage in the pipeline UI

**Duration:** 25 seconds

---

## SCENE 3 — UIPATH PLATFORM (0:45–1:15)

**Screen:** UiPath Agent Builder — switch between Solution 6 and Solution 7

**Script:**
> "The orchestration runs on UiPath Automation Cloud.
> Agent Builder hosts two agents:
> MedicalRecordsSummarizer — receives a clinical note and generates a structured summary.
> SENTINEL Validator — receives the summary and the original note and runs 4-layer validation."

**Action:**
- Click Solution 6 (SENTINEL Validator v1.0.2) — show agent config
- Click Solution 7 (MedicalRecordsSummarizer v1.0.0) — show agent config

**Script continues:**
> "Both agents are deployed and active on UiPath Automation Cloud."

**Show:** Orchestrator → Shared folder → Deployments overview — 3 green Active badges

**Duration:** 30 seconds

---

## SCENE 4 — LIVE PIPELINE DEMO — TC-002 (1:15–2:30)

**Screen:** Dashboard at localhost:3000 — TC-002 selected

**Script:**
> "Let me show you the pipeline running live.
> TC-002: A 32-year-old female with an upper respiratory infection.
> The source note says NKDA — No Known Drug Allergies.
> Watch what the AI summary produced."

**Action:** Click RUN PIPELINE

**Show while pipeline runs:**
- Stage 1 SUMMARIZER → COMPLETE
- Stage 2 SENTINEL → FAIL · CRITICAL · flags firing
- Stage 3 CORRECTION → FIXED

**Script:**
> "Layer 3 detects a direct contradiction:
> source says NKDA, summary invents a penicillin allergy.
> Verdict: FAIL. Severity: CRITICAL."

**Show:** Flagged claims list — highlight the allergy contradiction

**Script:**
> "The Correction Agent rewrites the summary, removing the fabricated allergy.
> SENTINEL re-validates. The corrected version passes."

**Show:** Stage 4 RE-VALIDATE → PASS. Auto-corrected banner. Diff view before/after.

**Duration:** 75 seconds

---

## SCENE 5 — TC-005 ESCALATION (2:30–3:00)

**Screen:** Dashboard — click TC-005

**Script:**
> "Not every failure can be auto-corrected.
> TC-005: A 72-year-old patient. Potassium at 6.8 milliequivalents per liter.
> That's a medical emergency. The AI summary said: follow up in 15 days."

**Action:** Click RUN PIPELINE — let it run

**Show:** ESCALATED TO HUMAN REVIEW banner (red). escalate_to_human: true.

**Script:**
> "SENTINEL flags critical omissions that cannot be auto-fixed.
> The system escalates to physician review."

**Duration:** 30 seconds

---

## SCENE 6 — SCENARIO GENERATOR (3:00–3:30)

**Screen:** VSCode terminal — clear it first

**Script:**
> "Aegis doesn't just run predefined tests — it generates new ones."

**Action:** Type and run live:
```
node src/core/scenario-generator.js --requirements "Elderly patient, 78yo, on warfarin. INR 5.2 — supratherapeutic. AI summary omits bleeding risk and dose hold instruction."
```

**Show:** Terminal output — TC generating, summary printed with flags and severity

**Script:**
> "In seconds, Aegis created a new test case — clinically coherent,
> with expected failure modes, layer assignments, and severity classifications.
> This is Test Design as an agentic capability."

**Duration:** 30 seconds

---

## SCENE 7 — CODING AGENTS BONUS (3:30–3:50)

**Screen:** VSCode — open `docs/claude-code-evidence.md`

**Script:**
> "Aegis was built with Claude Code — one of UiPath's supported coding agents.
> Claude Code scaffolded the 4-layer pipeline architecture,
> generated the clinical test scenarios,
> and built the dashboard from scratch.
> Full evidence is documented in the repository."

**Show:** Component table in claude-code-evidence.md — briefly scan it

**Duration:** 20 seconds

---

## SCENE 8 — EXPORT + METRICS (3:50–4:20)

**Screen:** Dashboard — run TC-007, then click EXPORT FULL RESULT

**Script:**
> "Every run produces a structured, exportable audit record.
> Scenario ID, verdict, all flagged claims with source evidence,
> the flawed summary, the corrected summary, the revalidation result.
> Full traceability — claim by claim, layer by layer."

**Show:** Downloaded JSON file opens briefly

**Script:**
> "After 7 test cases, here's what the session metrics show."

**Show:** Dashboard right panel — Safe Rate, Processed, Auto-Fixed, Escalated

**Duration:** 30 seconds

---

## SCENE 9 — CLOSE (4:20–4:40)

**Screen:** Dashboard overview OR clean title view

**Script:**
> "Aegis. CI/CD for Regulated AI.
> Generate tests. Execute them. Evaluate with domain intelligence.
> Auto-correct. Escalate when it matters.
> Built on UiPath. Open source."

**Show:** GitHub URL: github.com/Marianooss/Aegis

**Duration:** 20 seconds

---

## TOTAL: ~4:40 — 20 seconds buffer before the 5:00 hard limit

---

## RECORDING NOTES

**DO:**
- Use your natural voice — energy matters more than perfection
- Pause 1 second between scenes — easier to edit
- If you make a mistake mid-scene, pause 2 seconds and redo that line only
- Record scenes out of order if needed — edit in post

**DON'T:**
- Show your .env file or API keys
- Show personal email or account details in UiPath UI
- Use background music (copyright issues on YouTube)
- Read the script word for word — know the beats, not the exact words

**UPLOAD:**
- YouTube (unlisted is fine, link must work publicly)
- Title: "Aegis — CI/CD for Regulated AI | UiPath AgentHack 2026"
- Description: "Track 3: Test Cloud submission. UiPath AgentHack 2026. github.com/Marianooss/Aegis"

---

## BACKUP PLAN — if dashboard has issues during recording

Record in this order instead:

1. Scene 1 — text editor only, show TC-002 note with NKDA highlighted
2. Scene 3 — UiPath Agent Builder always works, no local deps
3. Scene 7 — VSCode only, claude-code-evidence.md
4. Scene 6 — terminal only, scenario-generator running
5. Scene 4+5 condensed — terminal output of `node src/core/pipeline.js --test` instead of dashboard UI

The video must show the solution running. Terminal output of verified TCs counts as "running" per the hackathon rules.
