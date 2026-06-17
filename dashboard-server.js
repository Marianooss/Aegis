require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const KEY = process.env.ANTHROPIC_API_KEY;

const SUMMARIZER_SYSTEM = `You are a clinical medical records summarizer. Extract a structured JSON summary from clinical notes.
RULES: Only include what is explicitly stated. Never infer. Return ONLY valid JSON.
If the note states NKDA or no known allergies, return "allergies": [].
Schema: {"patient":{"age":number,"sex":"string"},"diagnoses":[{"diagnosis":"string","status":"string"}],"medications":[{"name":"string","dose":"string","frequency":"string"}],"allergies":[{"allergen":"string"}],"critical_findings":["string"],"summary_text":"string"}`;

const SENTINEL_SYSTEM = `You are SENTINEL, an AI validation framework that detects hallucinations, contradictions, and critical omissions in AI-generated documents.
SEVERITY: CRITICAL=dangerous fabrication | HIGH=significant error | MEDIUM=minor inaccuracy
Return ONLY valid JSON:
{"verdict":"PASS"|"FAIL","overall_severity":"NONE"|"MEDIUM"|"HIGH"|"CRITICAL","escalate_to_human":boolean,"flagged_claims":[{"claim_text":"string","failure_type":"HALLUCINATION"|"CONTRADICTION"|"CRITICAL_OMISSION","severity":"string","source_evidence":"string","explanation":"string"}],"total_flagged":number,"sentinel_summary":"string"}`;

const CORRECTION_SYSTEM = `You are a document correction specialist. Fix ONLY the flagged errors.
- HALLUCINATION: remove the fabricated claim
- CONTRADICTION: replace with accurate info from source
- CRITICAL_OMISSION: add the missing critical information
Never introduce new information. Return ONLY valid JSON with a "summary_text" field.`;

function callClaude(system, userMsg, maxTokens = 2048) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userMsg }]
    });
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': KEY,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data).content[0].text); }
        catch (e) { reject(new Error('Parse error: ' + data.substring(0, 200))); }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function parseJSON(raw) {
  try { return JSON.parse(raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()); }
  catch { return null; }
}

function getSummaryText(scenario) {
  return scenario.hallucinated_summary?.summary_text
    || scenario.incomplete_summary?.summary_text
    || scenario.expected_summary?.summary_text
    || null;
}

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>SENTINEL — AI Validation Framework</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#060A14;--bg2:#0C1220;--bg3:#111928;--teal:#00E5CC;--red:#FF3B47;--amber:#FFB020;--blue:#4D9EFF;--white:#F0F4FF;--dim:#4A5568;--dim2:#1A2535;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--white);font-family:'JetBrains Mono',monospace;min-height:100vh;overflow-x:hidden;}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,229,204,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,204,.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}
header{position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:14px 28px;border-bottom:1px solid rgba(0,229,204,.15);background:rgba(6,10,20,.95);}
.logo{display:flex;align-items:center;gap:14px;}
.logo-mark{width:34px;height:34px;border:2px solid var(--teal);border-radius:4px;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:800;font-size:13px;color:var(--teal);}
.logo-name{font-family:'Syne',sans-serif;font-weight:800;font-size:18px;letter-spacing:4px;}
.logo-sub{font-size:9px;color:var(--dim);letter-spacing:2px;margin-top:2px;}
.hdr-right{display:flex;align-items:center;gap:20px;}
.dot{width:7px;height:7px;border-radius:50%;background:var(--teal);box-shadow:0 0 8px var(--teal);animation:pulse 2s infinite;}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
.dot-label{font-size:10px;color:var(--teal);letter-spacing:2px;}
.domain-bar{position:relative;z-index:10;display:flex;padding:0 28px;border-bottom:1px solid rgba(0,229,204,.1);background:rgba(6,10,20,.8);}
.dtab{padding:10px 20px;font-size:10px;letter-spacing:2px;color:var(--dim);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;}
.dtab:hover{color:var(--white);}
.dtab.active{color:var(--teal);border-bottom-color:var(--teal);}
.dbadge{margin-left:8px;padding:1px 7px;background:rgba(0,229,204,.1);border:1px solid rgba(0,229,204,.25);border-radius:20px;font-size:8px;color:var(--teal);}
.main{position:relative;z-index:10;display:grid;grid-template-columns:270px 1fr 320px;height:calc(100vh - 94px);}
.lp{border-right:1px solid rgba(0,229,204,.1);padding:20px;display:flex;flex-direction:column;gap:20px;overflow-y:auto;}
.plabel{font-size:9px;letter-spacing:3px;color:var(--dim);margin-bottom:10px;}
.sc-item{padding:11px 13px;border:1px solid var(--dim2);border-radius:4px;cursor:pointer;transition:all .2s;margin-bottom:7px;}
.sc-item:hover{border-color:rgba(0,229,204,.35);background:rgba(0,229,204,.04);}
.sc-item.active{border-color:var(--teal);background:rgba(0,229,204,.07);}
.sc-id{font-size:9px;color:var(--teal);letter-spacing:2px;margin-bottom:4px;}
.sc-name{font-size:11px;color:var(--white);line-height:1.4;}
.sc-tag{margin-top:5px;font-size:8px;padding:2px 8px;border-radius:20px;display:inline-block;}
.tc{background:rgba(255,59,71,.12);color:var(--red);}
.th{background:rgba(255,176,32,.12);color:var(--amber);}
.tp{background:rgba(0,229,204,.12);color:var(--teal);}
.run-btn{width:100%;padding:13px;background:var(--teal);color:#000;border:none;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:700;letter-spacing:3px;cursor:pointer;transition:all .2s;margin-top:auto;}
.run-btn:hover{background:#00FFE5;transform:translateY(-1px);}
.run-btn:disabled{background:var(--dim2);color:var(--dim);cursor:not-allowed;transform:none;}
.cp{padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:20px;}
.pipeline{display:flex;align-items:center;}
.ps{flex:1;padding:14px 10px;border:1px solid var(--dim2);border-radius:4px;text-align:center;transition:all .3s;}
.ps.active{border-color:var(--teal);background:rgba(0,229,204,.07);box-shadow:0 0 20px rgba(0,229,204,.08);}
.ps.done{border-color:rgba(0,229,204,.35);background:rgba(0,229,204,.03);}
.ps.err{border-color:var(--red);background:rgba(255,59,71,.07);}
.pnum{font-size:8px;color:var(--dim);letter-spacing:2px;margin-bottom:5px;}
.pname{font-size:10px;font-weight:700;color:var(--white);margin-bottom:3px;letter-spacing:1px;}
.pstat{font-size:9px;color:var(--dim);min-height:12px;}
.parr{width:20px;text-align:center;color:var(--dim);font-size:12px;flex-shrink:0;}
.parr.active{color:var(--teal);}
.vbanner{display:none;padding:14px 18px;border-radius:4px;border:1px solid;font-size:12px;font-weight:700;letter-spacing:1px;}
.vb-ok{border-color:var(--teal);background:rgba(0,229,204,.07);color:var(--teal);}
.vb-esc{border-color:var(--red);background:rgba(255,59,71,.07);color:var(--red);}
.rsec{display:none;}
.stitle{font-size:9px;letter-spacing:3px;color:var(--dim);margin-bottom:14px;padding-bottom:7px;border-bottom:1px solid var(--dim2);}
.fcard{padding:13px;border:1px solid var(--dim2);border-radius:4px;margin-bottom:9px;border-left:3px solid var(--red);}
.fcard.h{border-left-color:var(--amber);}
.fcard.m{border-left-color:var(--blue);}
.ftype{font-size:8px;letter-spacing:2px;color:var(--red);margin-bottom:5px;}
.fcard.h .ftype{color:var(--amber);}
.fcard.m .ftype{color:#4D9EFF;}
.fclaim{font-size:11px;color:var(--white);margin-bottom:5px;font-style:italic;}
.fevid{font-size:9px;color:var(--dim);line-height:1.5;}
.diff{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:6px;}
.db{padding:11px;border-radius:4px;font-size:10px;line-height:1.6;}
.dbefore{background:rgba(255,59,71,.05);border:1px solid rgba(255,59,71,.18);color:#FF9999;}
.dafter{background:rgba(0,229,204,.05);border:1px solid rgba(0,229,204,.18);color:#99FFE5;}
.dlabel{font-size:8px;letter-spacing:2px;margin-bottom:7px;opacity:.55;}
.rp{border-left:1px solid rgba(0,229,204,.1);padding:20px;overflow-y:auto;display:flex;flex-direction:column;gap:20px;}
.fw-box{padding:14px;border:1px solid rgba(77,158,255,.2);border-radius:4px;background:rgba(77,158,255,.03);}
.fw-title{font-size:8px;letter-spacing:3px;color:var(--blue);margin-bottom:10px;}
.dpill{display:inline-block;padding:3px 10px;border-radius:20px;font-size:9px;margin:2px;}
.dm{background:rgba(255,59,71,.1);border:1px solid rgba(255,59,71,.25);color:#FF9999;}
.di{background:rgba(77,158,255,.1);border:1px solid rgba(77,158,255,.25);color:var(--blue);}
.df{background:rgba(255,176,32,.1);border:1px solid rgba(255,176,32,.25);color:var(--amber);}
.fw-desc{font-size:9px;color:var(--dim);line-height:1.6;margin-top:9px;}
.mc{padding:13px;border:1px solid var(--dim2);border-radius:4px;background:var(--bg2);margin-bottom:9px;}
.mlabel{font-size:8px;letter-spacing:3px;color:var(--dim);margin-bottom:7px;}
.mval{font-family:'Syne',sans-serif;font-size:28px;font-weight:700;color:var(--teal);}
.msub{font-size:9px;color:var(--dim);margin-top:3px;}
.mgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.mgrid .mc{padding:10px;margin-bottom:0;}
.mgrid .mval{font-size:22px;}
.log-item{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--dim2);font-size:9px;}
.log-ic{font-size:12px;}
.log-id{color:var(--teal);width:55px;}
.log-res{color:var(--white);flex:1;}
.log-sev{padding:1px 7px;border-radius:20px;font-size:8px;}
.spinner{display:inline-block;width:9px;height:9px;border:1px solid var(--dim2);border-top-color:var(--teal);border-radius:50%;animation:spin .7s linear infinite;vertical-align:middle;margin-right:4px;}
@keyframes spin{to{transform:rotate(360deg)}}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:var(--bg);}
::-webkit-scrollbar-thumb{background:var(--dim2);border-radius:2px;}
</style>
</head>
<body>
<header>
  <div class="logo">
    <div class="logo-mark">S</div>
    <div>
      <div class="logo-name">SENTINEL</div>
      <div class="logo-sub">AI VALIDATION FRAMEWORK · UiPath AgentHack 2026</div>
    </div>
  </div>
  <div class="hdr-right">
    <div class="dot"></div>
    <div class="dot-label">SYSTEM ONLINE</div>
  </div>
</header>

<div class="domain-bar">
  <div class="dtab active">MEDICAL RECORDS <span class="dbadge">LIVE</span></div>
  <div class="dtab">ISO 15189 AUDIT <span class="dbadge">COMING</span></div>
  <div class="dtab">FINANCIAL DOCS <span class="dbadge">COMING</span></div>
</div>

<div class="main">
  <div class="lp">
    <div>
      <div class="plabel">TEST SCENARIOS</div>
      <div id="sc-list"></div>
    </div>
    <button class="run-btn" id="run-btn" onclick="run()">▶ RUN PIPELINE</button>
  </div>

  <div class="cp">
    <div>
      <div class="plabel">PIPELINE EXECUTION</div>
      <div class="pipeline">
        <div class="ps" id="ps1"><div class="pnum">01</div><div class="pname">SUMMARIZER</div><div class="pstat" id="st1">STANDBY</div></div>
        <div class="parr" id="ar1">→</div>
        <div class="ps" id="ps2"><div class="pnum">02</div><div class="pname">SENTINEL</div><div class="pstat" id="st2">STANDBY</div></div>
        <div class="parr" id="ar2">→</div>
        <div class="ps" id="ps3"><div class="pnum">03</div><div class="pname">CORRECTION</div><div class="pstat" id="st3">STANDBY</div></div>
        <div class="parr" id="ar3">→</div>
        <div class="ps" id="ps4"><div class="pnum">04</div><div class="pname">RE-VALIDATE</div><div class="pstat" id="st4">STANDBY</div></div>
      </div>
    </div>

    <div id="vbanner" class="vbanner"></div>

    <div class="rsec" id="fsec">
      <div class="stitle">FLAGGED CLAIMS</div>
      <div id="flist"></div>
    </div>

    <div class="rsec" id="dsec">
      <div class="stitle">CORRECTION APPLIED</div>
      <div class="diff">
        <div class="db dbefore"><div class="dlabel">BEFORE (FLAWED)</div><div id="dbefore"></div></div>
        <div class="db dafter"><div class="dlabel">AFTER (CORRECTED)</div><div id="dafter"></div></div>
      </div>
    </div>
  </div>

  <div class="rp">
    <div class="fw-box">
      <div class="fw-title">MULTI-DOMAIN FRAMEWORK</div>
      <span class="dpill dm">Medical Records</span>
      <span class="dpill di">ISO 15189 Audit</span>
      <span class="dpill df">Financial Docs</span>
      <div class="fw-desc">Same 4-layer validation engine across any regulated domain. One AI watching another — before errors reach humans.</div>
    </div>

    <div>
      <div class="plabel">SESSION METRICS</div>
      <div class="mc">
        <div class="mlabel">SAFE RATE</div>
        <div class="mval" id="m-safe">—</div>
        <div class="msub">cases reach clinicians safely</div>
      </div>
      <div class="mgrid">
        <div class="mc"><div class="mlabel">PROCESSED</div><div class="mval" id="m-tot">0</div></div>
        <div class="mc"><div class="mlabel">AUTO-FIXED</div><div class="mval" id="m-fix" style="color:var(--teal)">0</div></div>
        <div class="mc"><div class="mlabel">APPROVED</div><div class="mval" id="m-app" style="color:var(--teal)">0</div></div>
        <div class="mc"><div class="mlabel">ESCALATED</div><div class="mval" id="m-esc" style="color:var(--red)">0</div></div>
      </div>
    </div>

    <div>
      <div class="plabel">SESSION LOG</div>
      <div id="slog"></div>
    </div>
  </div>
</div>

<script>
const SCENARIOS=[
  {id:'TC-001',name:'Normal Clinical Note',cls:'tp',tag:'PASS'},
  {id:'TC-002',name:'Allergy Hallucination',cls:'tc',tag:'CRITICAL'},
  {id:'TC-003',name:'Diagnosis Invention',cls:'tc',tag:'CRITICAL'},
  {id:'TC-004',name:'Medication Fabrication',cls:'th',tag:'HIGH'},
  {id:'TC-005',name:'Critical Value Omission K⁺6.8',cls:'tc',tag:'CRITICAL'},
  {id:'TC-006',name:'Contradictory Source Note',cls:'th',tag:'HIGH'},
];
let sel='TC-002',running=false;
let S={tot:0,app:0,fix:0,esc:0};

function renderList(){
  document.getElementById('sc-list').innerHTML=SCENARIOS.map(s=>\`
    <div class="sc-item \${s.id===sel?'active':''}" onclick="pick('\${s.id}')">
      <div class="sc-id">\${s.id}</div>
      <div class="sc-name">\${s.name}</div>
      <span class="sc-tag \${s.cls}">\${s.tag}</span>
    </div>
  \`).join('');
}

function pick(id){sel=id;renderList();reset();}

function reset(){
  [1,2,3,4].forEach(i=>{
    document.getElementById('ps'+i).className='ps';
    document.getElementById('st'+i).textContent='STANDBY';
  });
  [1,2,3].forEach(i=>document.getElementById('ar'+i).className='parr');
  document.getElementById('vbanner').style.display='none';
  document.getElementById('fsec').style.display='none';
  document.getElementById('dsec').style.display='none';
  document.getElementById('flist').innerHTML='';
}

function step(n,state,txt){
  document.getElementById('ps'+n).className='ps '+(state==='active'?'active':state==='err'?'err':'done');
  document.getElementById('st'+n).innerHTML=state==='active'?'<span class="spinner"></span>'+txt:txt;
  if(n<4)document.getElementById('ar'+n).className='parr'+(state!==''?' active':'');
}

function metrics(){
  const tot=S.tot,safe=S.app+S.fix;
  document.getElementById('m-safe').textContent=tot>0?Math.round(safe/tot*100)+'%':'—';
  document.getElementById('m-tot').textContent=tot;
  document.getElementById('m-fix').textContent=S.fix;
  document.getElementById('m-app').textContent=S.app;
  document.getElementById('m-esc').textContent=S.esc;
}

function addLog(id,res,sev){
  const icons={AUTO_APPROVED:'✅',AUTO_CORRECTED:'🔧',ESCALATED:'🔴',ERROR:'❌'};
  const sc=sev==='CRITICAL'?'var(--red)':sev==='HIGH'?'var(--amber)':'var(--teal)';
  const d=document.createElement('div');
  d.className='log-item';
  d.innerHTML=\`<span class="log-ic">\${icons[res]||'•'}</span><span class="log-id">\${id}</span><span class="log-res">\${res.replace('_',' ')}</span><span class="log-sev" style="border:1px solid \${sc};color:\${sc}">\${sev||'NONE'}</span>\`;
  const log=document.getElementById('slog');
  log.insertBefore(d,log.firstChild);
}

async function run(){
  if(running)return;
  running=true;
  const btn=document.getElementById('run-btn');
  btn.disabled=true;btn.textContent='⟳ RUNNING...';
  reset();

  try{
    step(1,'active','PROCESSING NOTE...');
    const r=await fetch('/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({scenarioId:sel})});
    const data=await r.json();
    if(data.error)throw new Error(data.error);

    step(1,'done','COMPLETE');

    const sv=data.sentinel;
    if(sv.verdict==='PASS'){
      step(2,'done','PASS · NONE · 0 FLAGS');
      step(3,'done','SKIPPED');
      step(4,'done','AUTO-APPROVED');
      const b=document.getElementById('vbanner');
      b.className='vbanner vb-ok';b.textContent='✓ AUTO-APPROVED — No errors detected';b.style.display='block';
      S.app++;addLog(sel,'AUTO_APPROVED','NONE');
    } else {
      step(2,'err','FAIL · '+sv.overall_severity+' · '+sv.total_flagged+' FLAGS');
      document.getElementById('flist').innerHTML=sv.flagged_claims.map(f=>\`
        <div class="fcard \${f.severity==='HIGH'?'h':f.severity==='MEDIUM'?'m':''}">
          <div class="ftype">[\${f.failure_type}] · \${f.severity}</div>
          <div class="fclaim">"\${f.claim_text}"</div>
          <div class="fevid">Source: \${f.source_evidence}</div>
        </div>
      \`).join('');
      document.getElementById('fsec').style.display='block';

      step(3,'done',data.correction?'FIXED '+sv.total_flagged+' FLAGS':'SKIPPED');

      if(data.revalidation){
        const rv=data.revalidation;
        step(4,rv.verdict==='PASS'?'done':'err',rv.verdict+' · '+rv.overall_severity);
        if(data.correction){
          document.getElementById('dbefore').textContent=data.flawedSummary;
          document.getElementById('dafter').textContent=data.correction;
          document.getElementById('dsec').style.display='block';
        }
        const b=document.getElementById('vbanner');
        if(rv.verdict==='PASS'){
          b.className='vbanner vb-ok';
          b.textContent='🔧 AUTO-CORRECTED — '+sv.total_flagged+' errors fixed, re-validation PASS';
          S.fix++;addLog(sel,'AUTO_CORRECTED',sv.overall_severity);
        } else {
          b.className='vbanner vb-esc';
          b.textContent='🔴 ESCALATED TO HUMAN REVIEW — Patient safety requires physician verification';
          S.esc++;addLog(sel,'ESCALATED',sv.overall_severity);
        }
        b.style.display='block';
      }
    }
    S.tot++;metrics();
  }catch(e){
    alert('Error: '+e.message);
  }
  running=false;btn.disabled=false;btn.textContent='▶ RUN PIPELINE';
}

renderList();
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (req.method === 'POST' && req.url === '/api/run') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const { scenarioId } = JSON.parse(body);
        const scenariosDir = path.join(__dirname, 'test-scenarios');
        const files = fs.readdirSync(scenariosDir);
        const file = files.find(f => f.startsWith(scenarioId));
        if (!file) throw new Error('Scenario not found: ' + scenarioId);

        const scenario = JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8'));
        const note = scenario.clinical_note.content;
        const expectedVerdict = scenario.expected_verdict;
        const flawedSummary = getSummaryText(scenario);

        // Step 1: Summarizer
        const sumRaw = await callClaude(SUMMARIZER_SYSTEM, `Summarize this clinical note:\n\n${note}`);
        const sumOut = parseJSON(sumRaw);

        // Step 2: SENTINEL
        const target = expectedVerdict === 'PASS'
          ? (sumOut?.summary_text || '')
          : (flawedSummary || sumOut?.summary_text || '');

        const sentRaw = await callClaude(SENTINEL_SYSTEM, `SOURCE NOTE:\n${note}\n\nSUMMARY TO VALIDATE:\n${target}\n\nReturn JSON verdict.`);
        const sentOut = parseJSON(sentRaw);

        if (sentOut?.verdict === 'PASS') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sentinel: sentOut }));
          return;
        }

        // Step 3: Correction
        const flagList = sentOut.flagged_claims.map((f, i) =>
          `${i+1}. [${f.failure_type}] "${f.claim_text}"\n   Evidence: "${f.source_evidence}"\n   Fix: ${f.explanation}`
        ).join('\n\n');

        const corrRaw = await callClaude(CORRECTION_SYSTEM,
          `CLINICAL NOTE:\n${note}\n\nFLAWED SUMMARY:\n${target}\n\nFLAGS:\n${flagList}\n\nReturn corrected summary as JSON with "summary_text" field.`
        );
        const corrOut = parseJSON(corrRaw);
        const corrected = corrOut?.summary_text || corrOut?.summary || '';

        // Step 4: Re-validate
        const revalRaw = await callClaude(SENTINEL_SYSTEM,
          `SOURCE NOTE:\n${note}\n\nSUMMARY TO VALIDATE:\n${corrected}\n\nReturn JSON verdict.`
        );
        const revalOut = parseJSON(revalRaw);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          sentinel: sentOut,
          correction: corrected,
          flawedSummary: target,
          revalidation: revalOut
        }));

      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

if (!KEY) { console.error('ANTHROPIC_API_KEY not found in .env'); process.exit(1); }

server.listen(PORT, () => {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  SENTINEL Dashboard                    ║');
  console.log('║  http://localhost:3000                 ║');
  console.log('╚════════════════════════════════════════╝\n');
  console.log('  Open browser at http://localhost:3000');
  console.log('  Select a scenario and click RUN PIPELINE\n');
});
