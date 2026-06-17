# BIBLE_SENTINEL.md — Registro de Entregables Inmutables
> Versión: v0.1.0 · SENTINEL · UiPath AgentHack 2026
> Compatible con: AGENTS.md v4.1 · AGENTS-SENTINEL.md v0.1.0 · RESCUE.md v0.1.0

---

## ⚠️ REGLA MAESTRA

**La BIBLE siempre gana.**
Si un entregable nuevo contradice una BIBLE sin razón documentada,
el entregable está mal — no la BIBLE.

El agente puede PROPONER cambios. No puede ejecutarlos sin HUMAN_APPROVAL.
Nunca modifica tokens, stack, ni flujos críticos por iniciativa propia.
RESCUE.md se activa solo cuando el humano lo declara.

---

## 1. IDENTIDAD DEL PROYECTO

```
NOMBRE:          SENTINEL
MARCA:           SENTINEL
TAGLINE:         "¿Quién valida a la IA que controla la salud del paciente?"
DOMINIO:         N/A — UiPath Automation Cloud (hackathon project)
OWNER:           Mariano Adrian Oss · DevelopOss
ESTADO:          EN DESARROLLO
FECHA INICIO:    2026-05
REPO:            github.com/Marianooss/sentinel-uipath
DEPLOY URL:      UiPath Automation Cloud (no public URL)
```

---

## 2. PROBLEMA QUE RESUELVE

```
PAIN REAL:
  Los agentes de IA en healthcare pueden alucinar con alta confianza:
  inventar alergias que no existen, confirmar diagnósticos pendientes,
  omitir valores críticos de laboratorio. Los resúmenes médicos generados
  por IA se usan para decisiones clínicas sin validación semántica.
  El testing empresarial actual valida UI/API, no la CORRECCIÓN SEMÁNTICA
  de lo que la IA afirma vs lo que la fuente dice.

USUARIO OBJETIVO:
  Equipos de RPA/IT en organizaciones de salud que despliegan
  agentes de IA en UiPath Automation Cloud.

POR QUÉ AHORA:
  UiPath lanzó Medical Records Summarization en ViVE 2026.
  AgentHack 2026 Track 3 (Test Cloud) es la ventana perfecta para
  demostrar una capa de validación agentica.

MOAT (ventaja defensible):
  El motor de 4 capas (Extract → Trace → Contradiction → Critical)
  es domain-agnostic. Healthcare es el vertical demo. El know-how
  está en los prompts y la lógica de agregación, no en el modelo base.
```

---

## 3. ENTREGABLE CANÓNICO

```
TIPO:            Agente (UiPath Agent Builder × 2)
CANAL:           UiPath Automation Cloud / API HTTP
ACCESO:          UiPath Cloud (requiere cuenta con Agent Builder, Test Cloud, Action Center)
BACKEND:         NO — todo corre en UiPath Automation Cloud
BASE DE DATOS:   Sin backend persistente (test scenarios en JSON, resultados en Test Cloud)
DEPLOY:          UiPath Automation Cloud (publish agents + test sets)
MODO DEMO:       SÍ — datos 100% sintéticos, explícitamente marcados como ficticios
```

---

## 4. STACK CANÓNICO

> El agente no puede cambiar tecnologías sin HUMAN_APPROVAL explícito.

```yaml
plataforma:
  primary:       UiPath Automation Cloud
  components:
    - UiPath Agent Builder (2 agents)
    - UiPath Test Cloud
    - UiPath Action Center
    - UiPath Maestro

llm_backend:
  provider:      Anthropic Claude API
  model:         claude-sonnet-4-6
  integration:   HTTP connector via UiPath Integration Service

coding_agent:
  tool:          Claude Code (UiPath for Coding Agents)
  evidence:      docs/claude-code-log.md

local_testing:
  runtime:       Node.js 18+
  scripts:       scripts/test-layer.js
  env_file:      .env.example → .env
```

---

## 5. DESIGN SYSTEM — N/A

> Este proyecto no tiene UI frontend. Es un pipeline de validación agentica
> que corre enteramente en UiPath Automation Cloud.
> No hay pantallas, componentes visuales, ni tokens de diseño.
> La única interfaz humana es Action Center (configurado en UiPath Cloud).
>
> Si en el futuro se agrega un dashboard de resultados, esta sección
> se activa con HUMAN_APPROVAL y se declara una BIBLE visual.

---

## 6. BIBLIAS DECLARADAS

> Este proyecto no tiene entregables visuales. Es un pipeline backend.
> Las BIBLIAS se aplican a los agentes/prompts cuando se declaren inmutables.

### BIBLE-SENTINEL-SUMMARIZER-PROMPT

```
Entregable  : agents/summarizer/prompt.md
Tipo        : prompt
Declarada   : 2026-05-31
Origen      : Claude Code generó el prompt estructurado con JSON schema
Inmutable   : SÍ — requiere HUMAN_APPROVAL para modificar
Aplica a    : Medical Records Summarizer agent en UiPath Agent Builder
```

### BIBLE-SENTINEL-LAYER-PROMPTS

```
Entregable  : agents/sentinel/layer1-extract.md, layer2-trace.md, layer3-contradict.md, layer4-critical.md
Tipo        : prompt
Declarada   : 2026-05-31
Origen      : Claude Code generó los 4 prompts del motor de validación
Inmutable   : SÍ — requiere HUMAN_APPROVAL para modificar
Aplica a    : SENTINEL Validator agent en UiPath Agent Builder
```

---

## 7. ARQUITECTURA

```
┌─────────────────────────────────────────────────────────┐
│                   UiPath Automation Cloud                │
│                                                         │
│  ┌──────────────┐     ┌──────────────────────────────┐ │
│  │  TEST CLOUD  │────▶│  MEDICAL RECORDS SUMMARIZER  │ │
│  │  6 scenarios │     │  (Agent Builder + Claude API) │ │
│  └──────────────┘     └───────────────┬──────────────┘ │
│                                       │ output JSON      │
│                               ┌───────▼──────────────┐  │
│                               │  SENTINEL VALIDATOR  │  │
│                               │  (Agent Builder)     │  │
│                               │  · Layer 1: Extract  │  │
│                               │  · Layer 2: Trace    │  │
│                               │  · Layer 3: Contradict│ │
│                               │  · Layer 4: Critical │  │
│                               └───────┬──────────────┘  │
│                                       │                  │
│                          ┌────────────┴─────────────┐   │
│                          │                          │   │
│                     PASS ▼                   FAIL  ▼   │
│              ┌───────────────┐    ┌──────────────────┐ │
│              │  Test Cloud   │    │  ACTION CENTER   │ │
│              │  ✅ PASS      │    │  Human review    │ │
│              │  Coverage+    │    │  Diff visual     │ │
│              └───────────────┘    └──────────────────┘ │
│                                                         │
│                    Orchestrado por MAESTRO              │
└─────────────────────────────────────────────────────────┘

Servicios externos:
  ├── Claude API ( Anthropic ) — LLM brain de ambos agentes
  └── UiPath Integration Service — HTTP connector config
```

---

## 8. VISTAS / PANTALLAS CANÓNICAS

> N/A — Este proyecto no tiene frontend. Action Center es configurado
> en UiPath Automation Cloud (no es un entregable de código).

---

## 9. RBAC / ROLES (si aplica)

```
ROL 1: CLINICAL_REVIEWER — Revisa casos escalados en Action Center.
  Permisos: Ver nota original, ver summary, ver claims flagged,
            decidir: CONFIRMED / ACCEPTABLE / FALSE_POSITIVE

ROL 2: ADMIN — Configura agents en Agent Builder, test sets en Test Cloud.
  Permisos: Crear/modificar agents, importar prompts, publicar agents

ROL 3: OBSERVER — Ve coverage reports y resultados de Test Cloud.
  Permisos: Solo lectura de reportes y métricas
```

---

## 10. FLUJOS CRÍTICOS

> Los flujos que NO pueden romperse. Verificar antes de cada "done".

```
FLUJO-01 — TC-001 Happy Path (debe PASAR):
  1. Test Cloud envía TC-001 (nota normal, NKDA) al Summarizer
  2. Summarizer devuelve summary con allergies=[]
  3. SENTINEL valida: no hallazgos, no contradicciones, no omisiones críticas
  4. Verdict: PASS → Test Cloud registra PASS
  → Resultado esperado: SENTINEL no da falsos positivos en casos normales

FLUJO-02 — TC-002 Demo Moment (debe FALLAR + Action Center):
  1. Test Cloud envía TC-002 (nota dice NKDA) al Summarizer
  2. Summarizer alucina: "alergia documentada a penicilina"
  3. SENTINEL Layer 3 detecta CONTRADICTION (NKDA vs alergia)
  4. Severity: CRITICAL → escalate_to_human = true
  5. Action Center dispara con diff view
  6. Verdict: FAIL → Test Cloud registra FAIL
  → Resultado esperado: Action Center activo, humano ve la contradicción

FLUJO-03 — TC-005 Critical Omission (debe FALLAR):
  1. Test Cloud envía TC-005 (K+ 6.8 mEq/L marcado CRITICAL)
  2. Summarizer omite el valor crítico en el summary
  3. SENTINEL Layer 4 detecta OMISSION
  4. Severity: CRITICAL → escalate_to_human = true
  → Resultado esperado: FAIL, hiperkalemia no puede pasar desapercibida
```

---

## 11. REGLAS DE NEGOCIO INAMOVIBLES

```
RN-01: Todo claim del summary debe trazarse a texto fuente o estar FLAGGED.
       No hay término medio. (INV-1 / Citation Integrity)

RN-02: Toda falla con severity=CRITICAL dispara Action Center sin excepción.
       (INV-3 / Action Center Active Always)

RN-03: Ningún dato real de paciente en ningún repo, demo, ni video.
       Todos los casos clínicos son 100% sintéticos y ficticios.
       (INV-4 / 100% Synthetic Data)

RN-04: El demo usa UiPath Automation Cloud real.
       Prohibido: screenshots estáticos, mocks, slides sin la plataforma corriendo.
       (INV-2 / Demo Runs Live)

RN-05: Un escenario completo > cinco incompletos.
       Si el tiempo falla: sacrificar escenarios 3-6, nunca TC-001 + TC-002.
       (INV-9 / One Complete Scenario)
```

---

## 12. CONTRATOS DE DATOS

### 12.1 Fuentes de datos

```
FUENTE 1: Notas clínicas sintéticas — /test-scenarios/TC-*.json
  · Ubicación: repo local → importado a UiPath Test Cloud
  · Formato: JSON con clinical_note, expected_verdict, expected_severity
  · Frecuencia: estático (6 escenarios fijos para hackathon)

FUENTE 2: Claude API — https://api.anthropic.com/v1/messages
  · Ubicación: Anthropic cloud
  · Formato: HTTP JSON (system prompt + user input → structured JSON output)
  · Frecuencia: on-demand (4 llamadas por validación)
```

### 12.2 Regla de oro — R04

```
NUNCA inventar números, campos, ni APIs.
Todo dato visible al usuario debe ser trazable a fuente real.
Demo data siempre con badge DEMO visible.
```

### 12.3 Formato numérico canónico

> N/A — Este proyecto no maneja moneda ni valores numéricos de negocio.
> Los valores clínicos se preservan exactamente como aparecen en la fuente.

---

## 13. INTEGRACIONES EXTERNAS

| Servicio | Uso | Auth method | Env var | Estado |
|----------|-----|-------------|---------|--------|
| Claude API (Anthropic) | LLM brain de ambos agentes | API Key | `ANTHROPIC_API_KEY` | PENDIENTE — requiere config en UiPath Integration Service |
| UiPath Automation Cloud | Plataforma de ejecución | OAuth / API Key | N/A — plataforma host | PENDIENTE — requiere Labs access |

---

## 14. DELIVERY GATE

> Un entregable NO está "done" hasta pasar todos estos checks.
> Adaptado a proyecto UiPath (no web app).

```
[ ] Los 6 test scenarios JSON son válidos y tienen expected_verdict definido
[ ] TC-001 produce PASS (no falsos positivos en happy path)
[ ] TC-002 produce FAIL + escalate_to_human=true (Action Center dispara)
[ ] TC-005 produce FAIL + CRITICAL omission detectado
[ ] Ningún dato inventado en scenarios (F17 Vaporware Scan: PASS)
[ ] Todos los prompts importan correctamente a UiPath Agent Builder
[ ] Aggregator.js validado contra estructura de salida esperada
[ ] README completo: componentes UiPath, agent type, setup instructions
[ ] docs/claude-code-log.md tiene evidencia de uso de Claude Code
[ ] Video ≤5 min grabado mostrando UiPath Cloud corriendo
[ ] Repo público con MIT license accesible
```

---

## 15. PROHIBICIONES ABSOLUTAS

```
PRO-01: Cambiar el modelo LLM (claude-sonnet-4-6) sin revalidar los 6 escenarios
PRO-02: Agregar escenarios sin mantener TC-001 y TC-002 E2E funcionando
PRO-03: Cambiar stack a no-UiPath sin HUMAN_APPROVAL (viola reglas del hackathon)
PRO-04: Inventar datos — R04 siempre. Todo dato clínico es sintético documentado.
PRO-05: Declarar "done" sin pasar Delivery Gate completo
PRO-06: Demo data sin badge DEMO o sin indicar "sintético/ficticio"
PRO-07: Modificar una BIBLE declarada (prompts) sin HUMAN_APPROVAL
PRO-08: Publicar código con API keys hardcodeadas
PRO-09: Omitir evidencia de Claude Code en docs/claude-code-log.md
PRO-10: Declarar que corre en UiPath Cloud si solo corre localmente
```

---

## 16. CÓMO MODIFICAR ESTA BIBLE

```
1. El humano escribe: "HUMAN_APPROVAL: modificar BIBLE-[X]"
2. El agente propone el cambio exacto — no lo ejecuta
3. El humano confirma con "SÍ" explícito
4. El agente ejecuta el cambio y registra en sección 18
5. La versión anterior va a sección 19 (BIBLE HISTORY)
```

---

## 17. IDEAS PARKEADAS

> Ideas fuera del roadmap actual. Se registran acá, no se ejecutan.
> El agente archiva automáticamente ideas off-roadmap a IDEAS.md.
> Ver detalles completos en `IDEAS.md`.

```
IDEA-001 [2026-05-31]: Add confidence score per claim in Layer 2
  — Motivo del parking: Nice-to-have, no bloquea hackathon MVP

IDEA-003 [2026-06-01]: Extender SENTINEL a validación de contratos legales / reportes financieros
  — Motivo del parking: Post-hackathon, domain-agnostic engine ya existe

IDEA-005 [2026-05-31]: Fine-tune smaller model (Claude Haiku) for Layer 1
  — Motivo del parking: Requiere benchmarking, no aporta al demo

IDEA-006 [2026-06-16]: Clean up Next.js boilerplate files del workspace inicial
  — Motivo del parking: Necesita HUMAN_APPROVAL (R-G5)
```

---

## 18. HISTORIAL DE DECISIONES

> Decisiones arquitectónicas o de producto ya tomadas. No se revierten sin HUMAN_APPROVAL.
> Ver detalles completos en `DECISION_LOG.md`.

```
DEC-01 [2026-05-31]: UiPath Automation Cloud como única plataforma de ejecución
  — Motivo: Requerido por reglas del hackathon Track 3

DEC-02 [2026-05-31]: Claude API (claude-sonnet-4-6) como LLM backend
  — Motivo: Mejor structured JSON reliability para layer outputs

DEC-03 [2026-05-31]: Motor de 4 capas (Extract → Trace → Contradiction → Critical)
  — Motivo: Modular, debuggable, evidence chain clara

DEC-04 [2026-05-31]: 100% synthetic clinical data para los 6 escenarios
  — Motivo: INV-4 / R04 / ética / viabilidad

DEC-05 [2026-06-01]: Action Center dispara solo en CRITICAL + HIGH severity
  — Motivo: Balance entre cobertura y reviewer fatigue

DEC-06 [2026-06-16]: Aplicar AGENTS.md v4.1 framework completo al proyecto
  — Motivo: Auditar y alinear todo el ecosistema documental
```

---

## 19. BIBLE HISTORY

> Versiones anteriores de BIBLIAs modificadas.

```
[Vacío — ninguna BIBLE ha sido modificada todavía]
```

---

## 20. SESSION_STATE — ÚLTIMA SESIÓN

> Actualizar al cerrar cada sesión de desarrollo.
> Ver estado completo en `SESSION_STATE.md`.

```
FECHA:            2026-06-16
MODO OPERATIVO:   🔎 ALIGN MODE
BRANCH/COMMIT:    main · AGENTS v4.1 alignment

COMPLETADO HOY:
  ✅ Creados SESSION_STATE.md, ERROR_LOG.md, DECISION_LOG.md, IDEAS.md, RESCUE.md
  ✅ Creado ARCHITECTURE.md en project root con PROJECT_ID
  ✅ Actualizado BIBLE.md con datos reales del proyecto SENTINEL
  ✅ Creado docs/claude-code-log.md con evidencia de uso de Claude Code
  ✅ Creado .env.example para local testing
  ✅ Actualizado .gitignore para permitir .env.example
  ✅ Verificado que agents/, scripts/, test-scenarios/ existen y están completos

PENDIENTE PRÓXIMA SESIÓN:
  → Limpiar Next.js boilerplate si HUMAN_APPROVAL lo confirma
  → Obtener acceso a UiPath Labs y configurar Integration Service
  → Importar prompts a Agent Builder y probar TC-001/TC-002 E2E

BUGS CONOCIDOS:
  � Next.js boilerplate presente (app/, components/, etc.) — no crítico

PRÓXIMA SESIÓN ARRANCAR CON:
  "BUILDER MODE — Stage 0: Configure Claude API connector in UiPath Integration Service"
```

---

*BIBLE_SENTINEL.md v0.1.0 · SENTINEL · UiPath AgentHack 2026*
*Compatible con AGENTS.md v4.1 · AGENTS-SENTINEL.md v0.1.0 · RESCUE.md v0.1.0*
