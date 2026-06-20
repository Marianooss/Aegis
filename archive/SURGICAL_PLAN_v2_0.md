# PLAN QUIRÚRGICO — SENTINEL v2.0 · DE BRONCE A ORO
> Basado en auditoría completa del repo + REGLAS REALES de UiPath AgentHack 2026 (devpost.com)
> Fecha: 2026-06-20 · No edites este archivo sin leerlo completo primero

---

## PARTE 0: REGLAS REALES DEL HACKATHON (no inventadas)

### Qué se debe construir (verbatim de Devpost)

> *"Build a new working agentic solution on the UiPath Platform that addresses a real business problem. Your solution must fall under one of the three challenge tracks: 1) UiPath Maestro Case, 2) UiPath Maestro BPMN, or 3) UiPath Test Cloud."*
> *"All solutions must run on the UiPath Automation Cloud. You can include Agent Builder, Maestro, API Workflows, coding agents, and RPA where needed. You're welcome to bring in agents built on external frameworks and LLMs, in fact, we encourage it. The point is that UiPath is the orchestration and governance layer that ties everything together."*
> *"Strong submissions will show a working prototype, an end-to-end flow, handle real-world complexity, and be documented clearly enough that another developer could understand and build on your work."*

### Qué se debe entregar (6 items, todos obligatorios)

| # | Entregable | Qué dice la regla exactamente | Estado de SENTINEL |
|---|-----------|--------------------------------|-------------------|
| 1 | **Devpost project page** | "A project page on Devpost with your project title, track selection, a written description of what your solution does, the business problem it solves, how it works, and screenshots or images showing it in action." | ❌ No creado |
| 2 | **Demo video ≤5 min** | "A demo video of 5 minutes maximum, uploaded to YouTube, Vimeo, or Youku. The video must show the solution running, not just slides, walk through the architecture, explain which agents are involved and how they're orchestrated, and show where humans fit in." | ❌ No grabado |
| 3 | **GitHub repo público** | "A public GitHub repository containing all project files needed to understand and run your solution. Your README must include what the project does, which UiPath components it uses, setup instructions, prerequisites, and a clear indication of whether your solution uses coding agents, low-code agents from Agent Builder, or a combination. License your project under MIT or Apache 2.0." | ⚠️ Existe pero con bloat |
| 4 | **Solution en UiPath Automation Cloud** | "A solution built on UiPath Automation Cloud. Orchestration and agent logic must run through the UiPath Platform. External services, APIs, and LLMs are welcome as part of the solution. Your GitHub README must list all UiPath components used and your demo video must show the solution running on the platform." | ❌ Pipeline real corre en Node.js local |
| 5 | **Presentation deck** | "A completed presentation deck (template linked). You can upload your presentation deck to your own preferred storage and simply share the link with us in the submission form." | ❌ No creado |
| 6 | **Feedback form** (optional) | "Optional: You can also fill in a short form related to your feedback about the UiPath products you used." | — |

### Criterios de juzgamiento reales (Phase 1)

| Criterio | Peso | Qué evalúa | Por qué SENTINEL perdió puntos |
|----------|------|-----------|-------------------------------|
| **Business Impact & Adoption Potential** | 1–5 | Real-world relevance, production viability, clarity of business case, scalability | ❌ Vendió nicho médico sin mostrar escalabilidad horizontal |
| **Platform Usage** | 1–5 | **"Depth and deliberateness of UiPath platform usage as demonstrated in the live presentation, including the use of Agent Builder, Maestro, API Workflows, coded agents, and external frameworks."** | ❌ **FATAL:** UiPath era passthrough, no orchestration layer. Agents en Agent Builder existen pero no están orquestados por Maestro. |
| **Technical Execution, Feasibility & Versatility** | 1–5 | Architectural soundness, code quality, production-readiness, handling of exceptions/failures/edge cases | ❌ `aggregator.js` no se ejecuta. 4 layers son teatro. Correction agent enterrado. |
| **Completeness of Delivery** | 1–5 | Functional end-to-end prototype, public GitHub repo with README and setup instructions, demo video ≤5 min | ❌ Faltaban video, Devpost, deck. El E2E no era funcional en UiPath Cloud. |
| **Creativity & Innovation** | 1–5 | Originality of approach, novel design decisions, unexpected orchestration patterns | ⚠️ La idea era buena pero no se demostró. Auto-correction loop = innovador, pero oculto. |
| **Presentation** | 1–5 | Clarity, structure, logical flow, confidence, accessibility of technical communication | ❌ No hubo presentación porque no hubo video. |
| **BONUS: Coding Agents** | +points | "Submissions that demonstrate the use of coding agents through UiPath for Coding Agents will receive additional points. Show in your submission video how you're using coding agents to build any part of your solution." | ⚠️ Tenía Claude Code log pero no se mostró en video. |

### Bonus adicionales reales

| Premio | Monto | Qué se necesita |
|--------|-------|----------------|
| **Most Creative Solution** | $3,000 | Originalidad demostrada en presentación |
| **Best Demo / Presentation** | $3,000 | Video y presentación en vivo |
| **People's Choice** | $500 | Votación pública |
| **Best Cross-Platform Integration** | $1,500 | Integración de múltiples plataformas |
| **Best First-Time Builder** | $1,500 | Primera vez en hackathon de UiPath |
| **Best Product Feedback** | $1,500 | Formulario de feedback detallado |

---

## PARTE 0B: DIAGNÓSTICO SIN ANESTESIA (actualizado con reglas reales)

### Por qué perdiste (verificado contra el repo + reglas reales)

| # | Problema | Evidencia en repo | Impacto en jurado (según criterios reales) |
|---|----------|-------------------|-------------------------------------------|
| 1 | **Documentaste una Rolls-Royce y entregaste un scooter** | `README.md` dice "4-layer engine con parallel execution". `SESSION_STATE.md` línea 48 admite: "Corre todo en un prompt secuencial". Los scripts (`full-pipeline.js`, `test-all-scenarios.js`) usan prompts inline de 3 líneas, NO los prompts de los 4 layers documentados en `agents/sentinel/`. | **Technical Execution:** 1/5. Bait-and-switch en arquitectura. |
| 2 | **Track 3 = Test Cloud, pero Test Cloud era decoración** | 6 JSON files en `/test-scenarios/`. Zero evidencia de test sets creados en UiPath Test Cloud. Zero evaluators configurados. Zero screenshots de coverage reports. | **Platform Usage:** 1/5. Track 3 exige Test Cloud como motor. Vos tenés JSONs sueltos. |
| 3 | **Maestro BPMN no publicado** | `Process.bpmn` existe y está validado. `SESSION_STATE.md` línea 104: "publish bloqueado por bug de plataforma". El README justifica esto con un link a forum. | **Platform Usage:** 1/5. Regla: "Orchestration and agent logic must run through the UiPath Platform." Un BPMN en archivo no corre = no existe. |
| 4 | **Todo el pipeline real corre en Node.js local** | `dashboard-server.js`, `full-pipeline.js`, `run-full-suite.js` — todos llaman a Claude API directamente. UiPath Cloud es un passthrough, no el orchestration layer. | **Platform Usage:** 1/5. **FATAL.** Las reglas dicen explícitamente: *"The point is that UiPath is the orchestration and governance layer that ties everything together."* Vos tenés el inverso. |
| 5 | **Repo con bloat metadocumental** | 15+ archivos .md de framework (`AGENTS-SENTINEL.md`, `BIBLE.md`, `DECISION_LOG.md`, `SESSION_STATE.md`, etc.) en root. Next.js boilerplate sin limpiar. `package.json` dice "my-project" con 40 dependencias irrelevantes. | **Completeness of Delivery:** 2/5. README no explica setup. Repo desorganizado. |
| 6 | **Sin entregables obligatorios** | `SESSION_STATE.md` Delivery Gate: "Demo video recorded — PENDING", "Devpost submission completed — PENDING". También faltaba presentation deck. | **Completeness of Delivery:** 1/5. Sin 3 de 6 entregables obligatorios = descalificación silenciosa. |
| 7 | **aggregator.js = referencia muerta** | Documentado como "referencia canónica". Ningún script lo importa. Ningún join Layer1→Layer2 ocurre en el pipeline real. | **Technical Execution:** 2/5. Código muerto en repo. |
| 8 | **Correction Agent = feature escondida** | Existe (`correction-agent.js`) y se usa en `full-pipeline.js`, pero NO aparece en el README principal ni en la arquitectura de alto nivel. | **Creativity & Innovation:** 2/5. El diferenciador real estaba enterrado. |
| 9 | **Video no existente** | Las reglas exigen: *"The video must show the solution running, not just slides, walk through the architecture, explain which agents are involved and how they're orchestrated, and show where humans fit in."* | **Presentation:** 0/5. Sin video no hay evaluación de presentación. |
| 10 | **Coding Agents bonus no reclamado** | Tenías `docs/claude-code-log.md` pero no se mostró en el video ni se destacó en la submission. | **Bonus points:** Perdidos. Regla: *"Show us in your submission video how you're using UiPath for Coding Agents to build any part of your solution, and you will receive additional points."* |

### Score estimado por criterio (si hubieran evaluado lo que tenías)

| Criterio | Score estimado | Por qué |
|----------|---------------|---------|
| Business Impact | 2/5 | Idea real pero nicho mal presentado. |
| Platform Usage | **1/5** | **FATAL.** UiPath no es el orchestration layer. |
| Technical Execution | 2/5 | Prompts buenos pero arquitectura no ejecutada. |
| Completeness of Delivery | **1/5** | Faltaban video, Devpost, deck, y solution funcional en Cloud. |
| Creativity & Innovation | 3/5 | Auto-correction loop era innovador pero no demostrado. |
| Presentation | **0/5** | Sin video. |
| **TOTAL** | **~9/30** | **No llega a finalista.** |

### Lo que SÍ tenías (y desperdiciaste)

- **Auto-correction loop:** Summarizer → SENTINEL → Correction → Re-validation. Esto es RARO. La mayoría de los proyectos validadores solo detectan.
- **Audit trail estructurado:** `AuditLogger` con métricas de safe rate. Ningún otro proyecto de hackathon tiene esto.
- **Dashboard con UI real:** `dashboard-server.js` tiene una interfaz visual funcional con pipeline animation, diff view, y métricas.
- **Domain expertise clínica real:** Los 6 escenarios son médicamente coherentes. TC-005 (hiperkalemia) es clínicamente sofisticado.
- **BPMN construido:** Aunque no publicado, el `Process.bpmn` tiene el gateway logic y Action Center integration correctos.
- **Claude Code evidence:** `docs/claude-code-log.md` documenta 4 sesiones con contribuciones verificables.

---

## PARTE 1: EL PIVOTE QUE GANA

### El error de posicionamiento original

Vendiste SENTINEL como: *"Validador de resúmenes médicos"* — un producto vertical de nicho.

Eso es **muerte en un hackathon**. Es demasiado específico, no demuestra la plataforma, y suena a proyecto de portfolio, no a hackathon.

### El posicionamiento ganador (Track 3)

**"Aegis — CI/CD for Regulated AI"**

Frame SENTINEL como un **framework de testing agentic** que:
1. **Genera** test scenarios desde requisitos de dominio (Test Design)
2. **Ejecuta** tests contra AI agents usando UiPath Test Cloud (Test Execution)
3. **Evalúa** con un Custom Evaluator de dominio que mide semantic correctness, no string match (Test Automation)
4. **Auto-corrige** fallas y re-valida antes de escalation (Test Management)
5. **Reporta** coverage, drift, y safe rate en un dashboard vivo

**Healthcare es el demo vertical. El framework es horizontal.**

Esto cumple TODAS las subcategorías de Track 3:
- ✅ Test Design (scenario generation)
- ✅ Test Automation (custom evaluator + auto-correction)
- ✅ Test Execution (Test Cloud runs + Maestro orchestration)
- ✅ Test Management (audit trail + coverage metrics + anomaly detection)

### Por qué esto es único

Nadie en el hackathon hizo un **loop cerrado de testing agentic**:
```
Requisitos → Generar TC → Ejecutar en Test Cloud → Evaluar semanticamente →
Auto-corregir → Re-validar → Escalar a humano si persiste → Reportar métricas
```

La mayoría hizo: *"Agente que genera tests"* o *"Agente que evalúa tests"*. Vos tenés los 4 pasos en un pipeline. Eso es oro si se presenta bien.

---

## PARTE 2: CIRUGÍA DE SUPERVIVENCIA (Días 1–5)

> Objetivo: Cumplir las reglas reales del hackathon. UiPath debe ser el orchestration layer. Los 6 entregables obligatorios deben existir. Nada de teatro.

### Día 1 — LIMPIEZA DEL REPO + REESTRUCTURACIÓN

**Eliminar sin piedad:**
- Todo el boilerplate Next.js (`app/`, `components/`, `hooks/`, `lib/`, `styles/` si existen)
- `AGENTS-SENTINEL.md`, `AGENTS_v4_2.md`, `BIBLE.md`, `DECISION_LOG.md`, `ERROR_LOG.md`, `IDEAS.md`, `PLAN.md`, `PREMORTEM.md`, `RESCUE.md`, `SESSION_STATE.md`, `AUDIT.md`, `ARCHITECTURE.md` del root → mover a `archive/` (no eliminar, pero sacar del root)
- `SENTINEL-README.md` (duplicado del README principal)
- Dependencias Next.js de `package.json`. El proyecto no usa Next.js.

**Nueva estructura (máx 25 archivos en root):**
```
Aegis/
├── README.md                 (honesto, ≤150 líneas, sin mentiras)
├── LICENSE                   (MIT)
├── package.json              (solo deps de Node.js real: dotenv, etc.)
├── .env.example
├── .gitignore
├── src/
│   ├── core/
│   │   ├── pipeline.js       (pipeline local para desarrollo)
│   │   ├── aggregator.js     (desde agents/sentinel/)
│   │   ├── evaluator.js      (scoring para Test Cloud)
│   │   ├── audit-logger.js   (desde agents/audit/)
│   │   └── scenario-generator.js
│   ├── agents/
│   │   ├── summarizer.js     (wrapper del agent en Agent Builder)
│   │   ├── sentinel.js       (4 layers REALES en código)
│   │   └── correction.js     (wrapper del correction agent)
│   ├── prompts/
│   │   ├── summarizer.md
│   │   ├── layer1-extract.md
│   │   ├── layer2-trace.md
│   │   ├── layer3-contradict.md
│   │   ├── layer4-critical.md
│   │   └── scenario-generator.md
│   ├── scenarios/
│   │   └── tc-001..006.json
│   └── dashboard/
│       ├── server.js
│       └── public/
├── uipath/
│   ├── maestro/
│   │   └── Process.bpmn
│   ├── test-cloud/
│   │   ├── test-set-config.md
│   │   └── evaluator-config.md
│   ├── action-center/
│   │   └── task-template.md
│   └── agent-builder/
│       ├── summarizer-agent-config.md
│       └── sentinel-agent-config.md
├── docs/
│   ├── claude-code-log.md    (evidence for bonus points)
│   └── architecture.md       (1 diagrama + 1 párrafo, nada más)
└── archive/                  (todos los .md viejos)
    └── (...)
```

**Regla:** Si el root tiene más de 25 archivos, seguís perdiendo. Los ganadores tienen repos que un jurado puede escanear en 30 segundos.

### Día 2 — HACER LOS 4 LAYERS REALES EN CÓDIGO

**Problema actual:** `full-pipeline.js` línea 11 usa un prompt monolítico de 3 líneas para SENTINEL. Los prompts de `agents/sentinel/*.md` existen pero nadie los usa.

**Fix:** Reescribir `src/core/pipeline.js` para que:
1. Lea los prompts de `src/prompts/*.md`
2. Ejecute **4 llamadas secuenciales** a Claude:
   - Layer 1: Extract claims → output `claims[]`
   - Layer 2: Trace (toma `claims[]` + note) → output `trace_results[]`
   - Layer 3: Contradiction (toma `claims[]` + note) → output `contradiction_results[]`
   - Layer 4: Critical (toma note + summary) → output `critical_scan{}`
3. Pase los 4 outputs a `aggregator.js` con el join real Layer1→Layer2 (por `claim_id`)
4. Si `verdict === 'FAIL'`, ejecutar Correction Agent
5. Re-validate con SENTINEL contra el corrected summary
6. Loguear todo en `AuditLogger`

**Regla crítica:** El pipeline local (`src/core/pipeline.js`) debe producir EXACTAMENTE la misma estructura de output que el agente desplegado en UiPath Agent Builder. Zero discrepancias. Si el agente en UiPath usa un prompt secuencial (como admite `SESSION_STATE.md`), entonces el código local también debe usar ese prompt secuencial. **No podés documentar 4 layers si el agente deployed no los ejecuta.**

### Día 3 — CONECTAR TEST CLOUD REAL (Track 3 Requirement)

**Las reglas exigen:** *"Your solution must fall under one of the three challenge tracks... UiPath Test Cloud."* y *"All solutions must run on the UiPath Automation Cloud."*

**Lo que falta y es OBLIGATORIO:**

1. **Crear Test Set en Test Cloud:**
   - Nombre: `Aegis-Clinical-v1`
   - Importar los 6 escenarios como test cases con inputs y expected outputs
   - Cada TC debe tener: `clinical_note` + `summary_to_validate` + expected `verdict` + `severity` + `flagged_claims`

2. **Configurar Custom Evaluator:**
   - Usar UiPath SDK (`uipath-python`) para crear evaluator custom
   - El evaluator mide semantic correctness (no string match):
     - `verdict_accuracy`: 1 si coincide, 0 si no
     - `severity_adequacy`: 1 si severity ≥ expected, proporcional si no
     - `flag_recall`: % de flags esperados detectados
     - `flag_precision`: % de flags detectados que son correctos
     - `evidence_citation`: 1 si evidence cita exactamente la fuente
   - Score final = weighted average (0–1)
   - Documentar en `uipath/test-cloud/evaluator-config.md`

3. **Invocar el pipeline DESDE UiPath Test Cloud:**
   - El test set debe ejecutar el pipeline E2E (Summarizer → SENTINEL → Correction → Re-validation)
   - Los resultados deben quedar registrados en Test Cloud
   - El dashboard debe leer estos resultados (API o export)

### Día 4 — ORQUESTACIÓN EN UIPATH CLOUD (REGLA CRÍTICA)

**Las reglas dicen explícitamente:** *"Orchestration and agent logic must run through the UiPath Platform. The point is that UiPath is the orchestration and governance layer that ties everything together."*

**Esto es donde SENTINEL falló fatalmente.** El pipeline real corría en Node.js local. Eso es descalificación silenciosa en "Platform Usage".

**Fix obligatorio:**

**Opción A (preferida):** Publicar Maestro BPMN.
- Resolver el bug de publicación (`feedId workspace personal vs Shared feed`)
- Workarounds conocidos:
  1. Publicar los Agent Builder projects al **Shared feed** antes de publicar Maestro
  2. Usar **workspace-level feed** en lugar de personal feed
  3. Contactar a UiPath Support: `andreea.tomescu@uipath.com` (hackathon manager)
- Si el BPMN publica: demostrar ejecución E2E con TC-002

**Opción B (fallback aceptable):** API Workflows.
- Crear un API Workflow en UiPath que chainee:
  1. HTTP call a Summarizer agent (Agent Builder)
  2. HTTP call a SENTINEL agent (Agent Builder)
  3. Conditional: si `escalate_to_human`, HTTP call a Action Center
  4. Log result to Test Cloud
- Documentar honestamente: "Maestro BPMN construido y validado. Publicación bloqueada por bug conocido de plataforma (forum link). Fallback: API Workflows orquestan el pipeline E2E mientras se resuelve."
- **Esto demuestra adaptación, no excusa.**

**Opción C (mínimo viable):** Si Ni A ni B funcionan, usar **Agent Builder como orquestador**.
- Crear un tercer agente en Agent Builder: `AegisOrchestrator`
- Este agente tiene 3 pasos: invocar Summarizer → invocar SENTINEL → (conditional) invocar Action Center
- No es ideal, pero cumple la regla: "Orchestration and agent logic must run through the UiPath Platform"

**Regla de oro:** El jurado de "Platform Usage" evalúa *"depth and deliberateness of UiPath platform usage as demonstrated in the live presentation"*. Si tu demo muestra una terminal de Node.js, sacás 1/5. Si mostrás UiPath Cloud con agents ejecutándose, sacás 4–5/5.

### Día 5 — ACTION CENTER + PRESENTATION DECK + CODING AGENTS EVIDENCE

**Action Center (Platform Usage):**
- Task template `AegisReviewTask` creado en Action Center
- Campos: `original_note`, `summary_output`, `flagged_claims` (JSON), `severity`
- Acciones: `CONFIRMED` / `ACCEPTABLE` / `FALSE_POSITIVE`
- Que el workflow (Maestro/API/Agent) pase las variables correctamente
- **Screenshot obligatorio:** El task corriendo con datos reales de TC-002 o TC-005
- **Demo obligatorio:** El video debe mostrar el task en Action Center con un humano interactuando

**Presentation Deck (OBLIGATORIO, no opcional):**
- Las reglas exigen: *"A completed presentation deck (template linked)."*
- Template: `https://bit.ly/3R0MsHU`
- 10 slides máximo:
  1. Problem (1 slide)
  2. Solution overview con arquitectura (1 slide)
  3. UiPath Platform usage map (1 slide)
  4. Demo screenshot — Test Cloud runs (1 slide)
  5. Demo screenshot — Agent Builder agents (1 slide)
  6. Demo screenshot — Maestro/API Workflow (1 slide)
  7. Demo screenshot — Action Center HITL (1 slide)
  8. Metrics and results (1 slide)
  9. Innovation highlight — auto-correction loop (1 slide)
  10. Roadmap / CTA (1 slide)
- Subir a Google Drive con link público

**Coding Agents Evidence (BONUS POINTS):**
- Las reglas: *"Show us in your submission video how you're using UiPath for Coding Agents to build any part of your solution, and you will receive additional points."*
- **El video DEBE incluir:** 20–30 segundos mostrando Claude Code generando código del proyecto
- Screenshots de Claude Code en acción (ya tenés `docs/claude-code-log.md`)
- Narrar: *"We used Claude Code via UiPath for Coding Agents to scaffold the 4-layer validation engine, generate the test scenarios, and build the dashboard. Here's the evidence."*
- Esto es dinero gratis. Lo tenías y no lo reclamaste.

---

## PARTE 3: LA DIFERENCIACIÓN REAL (Días 6–11)

> Esto es lo que ningún otro proyecto del hackathon tiene. Sin esto, seguís siendo "otro validador médico".

### Día 6 — SCENARIO GENERATOR AGENT (Test Design)

**Feature:** Un agente que toma requisitos clínicos en lenguaje natural y genera test scenarios completos.

**Ejemplo de input:**
```
"Paciente adulto con diabetes tipo 2, hipertensión, en tratamiento con metformina y enalapril. 
Sin alergias conocidas. Control de laboratorio."
```

**Output esperado:**
```json
{
  "test_case_id": "TC-007",
  "clinical_note": "...nota generada sintética...",
  "expected_failure_modes": [
    "HALLUCINATION: inventar alergia a penicilina",
    "OMISSION: no reportar creatinina elevada"
  ],
  "expected_verdict": "FAIL",
  "expected_severity": "HIGH"
}
```

**Por qué gana puntos:**
- Cubre la subcategoría "Test Design — Scenario discovery agents" de Track 3
- Demuestra que el framework escala más allá de 6 TCs hardcodeados
- Es el "one-liner" del pitch: *"Aegis doesn't just test AI. It generates the tests itself."*

**Implementación:**
- Prompt nuevo: `src/prompts/scenario-generator.md`
- Script: `src/core/scenario-generator.js`
- Demo: generar TC-007 en vivo durante el video

### Día 7–8 — CUSTOM EVALUATOR CON SEMANTIC SCORING (Test Automation)

**Problema:** Los evaluadores default de Test Cloud usan LLM-as-judge o string similarity. Eso no mide si SENTINEL detectó la alucinación CORRECTA con la severity CORRECTA y la evidence CORRECTA.

**Solución:** Implementar un Custom Evaluator (Python o C#) que:
1. Tome el output del SENTINEL agent
2. Lo compare contra el `expected_flags` del scenario
3. Calcule:
   - `verdict_accuracy`: 1 si verdict coincide, 0 si no
   - `severity_accuracy`: 1 si severity ≥ expected, proporcional si no
   - `flag_recall`: % de flags esperados que fueron detectados
   - `flag_precision`: % de flags detectados que son correctos
   - `evidence_quality`: 1 si la evidence cita exactamente el texto fuente
4. Score final = weighted average

**Esto es TÉCNICAMENTE IMPRESIONANTE.** Un evaluator que entiende el dominio clínico.

**Implementación:**
- Usar UiPath Python SDK (`uipath-python`) para el evaluator
- `src/evaluator/custom-evaluator.py`
- Documentar en `uipath/test-cloud/evaluator-config.md`

### Día 9 — DASHBOARD CONECTADO A TEST CLOUD API (Test Management)

**Problema actual:** `dashboard-server.js` muestra datos de runs locales. Es un mock con estilo.

**Solución:** Conectar el dashboard a la API real de Test Cloud:
- Mostrar runs de test sets reales
- Mostrar scores del Custom Evaluator por run
- Mostrar tendencias: safe rate over time, flag precision/recall, false positive rate
- Mostrar "coverage" por tipo de failure mode

**API endpoints a usar:**
- `GET /test-sets/{id}/runs`
- `GET /runs/{id}/results`
- `GET /evaluations/{id}/scores`

**Si la API de Test Cloud no permite acceso externo:**
- Exportar los resultados a JSON periódicamente
- El dashboard lee esos JSONs
- Documentar: "Dashboard connected to Test Cloud via scheduled export"

**El dashboard debe verse a:**
- Panel izquierdo: lista de test scenarios con estado (PASS/FAIL/ESCALATED)
- Panel central: pipeline visualization (Summarizer → SENTINEL → Correction → Re-validation)
- Panel derecho: métricas (Safe Rate, Coverage, Precision, Recall)
- Seleccionar un escenario → ver diff (original vs summary vs corrected)

### Día 10 — MULTI-DOMAIN DEMO (ISO 15189)

**Feature:** Mostrar que Aegis no es solo médico. Crear UN escenario de ISO 15189 audit:

**Input:** Un informe de auditoría de laboratorio + un resumen de AI que omite no-conformidades críticas.

**Test:** SENTINEL detecta que el resumen omitió "non-conformity 4.2.3 — document control".

**Por qué:** El dashboard ya tiene tabs para "ISO 15189 Audit" y "Financial Docs". Demostrar que una funciona es la diferencia entre "demo preparado" y "mock".

**Implementación:**
- Crear `src/scenarios/iso-001.json`
- Adaptar los prompts para que funcionen con documentos regulatorios (cambiar vocabulary clínico por vocabulary ISO)
- No necesitás 10 escenarios. UNO que funcione end-to-end es suficiente.

### Día 11 — INTEGRACIÓN Y ESTABILIZACIÓN

- Correr el full suite (TC-001 a TC-006 + TC-007 generado + ISO-001) 3 veces
- Verificar consistencia de outputs
- Documentar cualquier flakiness y cómo se mitiga
- Asegurar que el pipeline E2E en UiPath Cloud funcione de principio a fin

---

## PARTE 4: ENTREGABLES GANADORES (Días 12–14)

### Día 12 — DEMO VIDEO (máx 5 min) — REGLAS REALES DEL HACKATHON

**Las reglas exigen explícitamente:** *"The video must show the solution running, not just slides, walk through the architecture, explain which agents are involved and how they're orchestrated, and show where humans fit in."*

**El video también DEBE incluir (para bonus points):** *"Show us in your submission video how you're using UiPath for Coding Agents to build any part of your solution."*

**Guion quirúrgico (cada segundo cuenta):**

| Tiempo | Contenido | Qué se ve en pantalla | Cumple regla |
|--------|-----------|----------------------|--------------|
| 0:00–0:15 | Hook + problem statement: *"Hospitals use AI to summarize patient records. One hallucinated allergy can kill a patient. Who tests the AI before it reaches the doctor?"* | TC-002 en pantalla: nota dice NKDA, resumen dice "penicillin allergy" | Business Impact |
| 0:15–0:45 | **Architecture walkthrough.** *"Aegis is a Test Cloud-native framework with 4 agents orchestrated by UiPath Maestro."* | Diagrama de arquitectura EN MOVIMIENTO: flechas animadas mostrando flujo de datos entre componentes UiPath | Walk through architecture ✅ |
| 0:45–1:10 | **Which agents are involved.** *"Agent 1: MedicalRecordsSummarizer, built in UiPath Agent Builder. Agent 2: SENTINEL Validator, also in Agent Builder. Agent 3: Correction Agent. And the orchestrator: UiPath Maestro."* | Screenshots de Agent Builder mostrando los 3 agentes con sus prompts | Explain which agents ✅ |
| 1:10–1:45 | **How they're orchestrated.** *"Maestro triggers Test Cloud to run a scenario. The Summarizer processes the note. SENTINEL validates in 4 layers. If it fails, Correction Agent fixes it. Then re-validation. If still critical: Action Center."* | UiPath Maestro BPMN ejecutándose paso a paso (o API Workflow si es fallback). Test Cloud dashboard mostrando run en progreso. | How they're orchestrated ✅ |
| 1:45–2:20 | **Where humans fit in.** *"When SENTINEL detects a critical error it can't auto-fix, it escalates to a physician via Action Center. The doctor reviews the diff and decides."* | Action Center task real con TC-005. Mouse clickeando "CONFIRMED". | Show where humans fit in ✅ |
| 2:20–2:50 | **The auto-correction loop.** SENTINEL detecta 3 flags. Correction Agent genera fixed summary. Re-validation = PASS. Dashboard safe rate sube. | Dashboard animación: pipeline steps con colores, diff view before/after | Technical Execution + Innovation |
| 2:50–3:20 | **Scenario Generator.** Typear requisitos clínicos → TC-007 generado en 10 segundos. | Scenario Generator UI con input/output | Creativity |
| 3:20–3:45 | **Coding Agents bonus evidence.** *"We built this using Claude Code via UiPath for Coding Agents. Here it is generating our 4-layer prompts and dashboard code."* | Screen recording de Claude Code generando `layer3-contradict.md` o `dashboard-server.js` | Coding Agents bonus ✅ |
| 3:45–4:15 | **Metrics from Test Cloud.** coverage, precision, recall, safe rate. Custom Evaluator scores. | Test Cloud results page + dashboard métricas | Platform Usage |
| 4:15–4:45 | **Multi-domain tab:** ISO 15189 audit. Mismo motor, diferente dominio. | Dashboard tab switch | Versatility |
| 4:45–5:00 | CTA: *"Aegis. CI/CD for Regulated AI. Built on UiPath."* | Logo + GitHub + Devpost link | — |

**Reglas del video (basadas en reglas reales del hackathon):**
- **MUST:** Show solution running on UiPath platform. Terminal de Node.js = descalificación visual.
- **MUST:** Walk through architecture. No asumas que el jurado entiende el diagrama.
- **MUST:** Explain which agents are involved and how they're orchestrated. Nombralos explícitamente.
- **MUST:** Show where humans fit in. Action Center debe ser visible con interacción real.
- **MUST:** Include 20–30 segundos de coding agents evidence (Claude Code en acción).
- **MUST NOT:** Slides estáticos como sustituto de demo en vivo.
- **MUST NOT:** "Coming soon". Todo lo que se muestra debe funcionar hoy.
- **MUST NOT:** Voz robótica. Tu voz, con energía, en inglés (las reglas exigen materials in English).

### Día 13 — DEVPOST SUBMISSION

**Campos a completar:**
- **Title:** Aegis — CI/CD for Regulated AI (no "SENTINEL", suena a antivirus)
- **Tagline:** *Generate, execute, evaluate, and auto-correct tests for AI-generated clinical documents — powered by UiPath Test Cloud*
- **Description:** 3 párrafos: Problema → Solución → Impacto. Enfocar en "Test Cloud as CI/CD for AI", no en "validador médico".
- **Screenshots:**
  1. Dashboard overview
  2. Test Cloud run results
  3. Agent Builder agent config
  4. Maestro BPMN flow
  5. Action Center task
  6. Scenario Generator
- **Video:** Link a YouTube/Vimeo privado (o público si confiás)
- **GitHub:** Link al repo limpio
- **Presentation deck:** 10 slides máximo. Problem → Architecture → Demo → Metrics → Roadmap.

### Día 14 — README PROFESIONAL Y POLISH

**README estructura (máx 150 líneas):**
```markdown
# Aegis — Agentic Validation Framework for Regulated AI

> UiPath AgentHack 2026 · Track 3: Test Cloud

## The Problem (3 líneas)

## The Solution (1 diagrama + 2 líneas)

## Live Demo (GIF del dashboard)

## Architecture (diagrama real, no aspiracional)
- Test Cloud = Test execution engine
- Agent Builder = Summarizer + SENTINEL + Correction agents
- Maestro = Orchestration
- Action Center = Human escalation
- Dashboard = Metrics + Audit trail

## What Makes It Unique (3 bullets)
- Auto-correction loop: detect → fix → re-validate
- Domain-aware Custom Evaluator: semantic correctness, not string match
- Scenario Generator: requirements → test cases in seconds

## Test Results (tabla real de los últimos 3 runs)

## Setup (solo si alguien más puede replicarlo)

## Tech Stack (tabla honesta)

## License
```

**NO incluir:**
- "Built with Claude Code" section (el usuario la eliminó intencionalmente)
- Documentación de frameworks internos (AGENTS.md, etc.)
- Excusas sobre bugs de plataforma (solo workaround documentado)
- Promesas de "próximas features"

---

## PARTE 5: RIESGOS Y PLAN B

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Maestro sigue sin publicar | Media | Fallback a API Workflows. Documentar como adaptación, no excusa. |
| Test Cloud API no permite acceso externo para dashboard | Media | Scheduled JSON export. Dashboard lee archivos locales. |
| Scenario Generator produce TCs inconsistentes | Media | Seed prompts con los 6 TCs existentes como few-shot. Temperature 0.1. |
| Custom Evaluator es demasiado complejo para 2 días | Alta | Simplificar: verificar solo verdict + severity. Flag-level scoring como v2. |
| Claude API no responde consistentemente en 4 layers | Media | Retry logic con exponential backoff. Fallback a prompt monolítico si 3 fallos. |
| No hay tiempo para multi-domain demo | Alta | **Cortar.** ISO 15189 puede ser un simple prompt adaptation demo, no E2E. |

**Regla de corte:**
Si falta tiempo, sacrificar en este orden:
1. Multi-domain demo (ISO 15189) — último en prioridad
2. Dashboard conectado a Test Cloud API — usar export manual
3. Scenario Generator — puede ser un script Node.js simple, no agente en Agent Builder

**NUNCA cortar:**
- TC-002 E2E funcionando en UiPath Cloud
- Test Cloud con evaluators configurados
- Video de 5 min mostrando plataforma real
- Devpost submission completo

---

## PARTE 6: MÉTRICAS DE ÉXITO

El proyecto es "oro" cuando:

- [ ] Repo tiene < 30 archivos en root, README < 150 líneas
- [ ] `src/core/pipeline.js` ejecuta 4 layers secuenciales usando los prompts de `src/prompts/`
- [ ] `aggregator.js` recibe los 4 outputs y produce verdict con join Layer1→Layer2
- [ ] Test Cloud tiene un test set con ≥ 6 escenarios y un evaluator custom
- [ ] Maestro o API Workflow ejecuta: Start → Summarizer → SENTINEL → (Conditional) Action Center → End
- [ ] Action Center muestra un task real con datos de TC-002 o TC-005
- [ ] Dashboard corre en local y muestra métricas de runs reales
- [ ] Video ≤ 5 min muestra la plataforma corriendo, sin slides
- [ ] Devpost submission está completo con todos los campos
- [ ] El proyecto puede narrarse en 1 frase: *"Aegis is a Test Cloud-native framework that generates, executes, evaluates, and auto-corrects tests for AI agents in regulated industries."*

---

*Plan quirúrgico v2.0 — 2026-06-20*
*No edites este archivo sin leerlo completo. Cada fase depende de la anterior.*
