require('dotenv').config();
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { runPipeline } = require('../core/pipeline.js');

const PORT = 3000;
const KEY = process.env.ANTHROPIC_API_KEY;

const SUMMARIZER_SYSTEM = `You are a clinical medical records summarizer. Extract a structured JSON summary from clinical notes.
RULES: Only include what is explicitly stated. Never infer. Return ONLY valid JSON.
If the note states NKDA or no known allergies, return "allergies": [].
Schema: {"patient":{"age":number,"sex":"string"},"diagnoses":[{"diagnosis":"string","status":"string"}],"medications":[{"name":"string","dose":"string","frequency":"string"}],"allergies":[{"allergen":"string"}],"critical_findings":["string"],"summary_text":"string"}`;

function callClaude(system, userMsg, maxTokens = 2048) {
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
<title>AEGIS — CI/CD for Regulated AI</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;600;700&family=Syne:wght@400;700;800&display=swap" rel="stylesheet">
<style>
:root{--bg:#060A14;--bg2:#0C1220;--bg3:#111928;--teal:#00E5CC;--red:#FF3B47;--amber:#FFB020;--blue:#4D9EFF;--white:#F0F4FF;--dim:#4A5568;--dim2:#1A2535;}
*{margin:0;padding:0;box-sizing:border-box;}
body{background:var(--bg);color:var(--white);font-family:'JetBrains Mono',monospace;min-height:100vh;overflow-x:hidden;}
body::before{content:'';position:fixed;inset:0;background-image:linear-gradient(rgba(0,229,204,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,204,.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}
header{position:relative;z-index:10;display:flex;align-items:center;justify-content:space-between;padding:14px 28px;border-bottom:1px solid rgba(0,229,204,.15);background:rgba(6,10,20,.95);}
.logo{display:flex;align-items:center;gap:14px;}
.logo-mark{width:48px;height:48px;border-radius:6px;display:flex;align-items:center;justify-content:center;overflow:hidden;border:1px solid rgba(0,229,204,.3);background:rgba(0,229,204,.06);box-shadow:0 0 14px rgba(0,229,204,.18);}
.logo-name{font-family:'Cambria',Georgia,serif;font-weight:700;font-size:22px;letter-spacing:4px;color:var(--teal);}
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
.exp-btns{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.exp-btn{width:100%;padding:10px;background:transparent;color:var(--teal);border:1px solid rgba(0,229,204,.35);border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:3px;cursor:pointer;transition:all .2s;}
.exp-btn:hover{background:rgba(0,229,204,.07);border-color:var(--teal);}
.exp-btn.pdf{color:var(--amber);border-color:rgba(255,176,32,.35);}
.exp-btn.pdf:hover{background:rgba(255,176,32,.07);border-color:var(--amber);}
.src-box{padding:14px;border:1px solid rgba(0,229,204,.12);border-radius:4px;background:var(--bg2);}
.src-desc{font-size:10px;color:var(--teal);line-height:1.6;margin-bottom:12px;font-style:italic;}
.src-note{font-size:9px;color:#9AACCC;line-height:1.75;white-space:pre-wrap;max-height:180px;overflow-y:auto;}
::-webkit-scrollbar{width:3px;}
::-webkit-scrollbar-track{background:var(--bg);}
::-webkit-scrollbar-thumb{background:var(--dim2);border-radius:2px;}
#splash{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:var(--bg);transition:opacity .8s ease;}
#splash.fade{opacity:0;pointer-events:none;}
#splash img{width:90vw;height:auto;max-width:none;max-height:90vh;object-fit:contain;filter:drop-shadow(0 0 32px rgba(0,229,204,.3));}
</style>
</head>
<body>
<div id="splash"><img src="/Aegis.png" alt="Aegis"></div>
<header>
  <div class="logo">
    <div class="logo-mark"><img src="/aegis-shield.png" style="width:48px;height:48px;object-fit:cover;border-radius:4px;" alt="Aegis"></div>
    <div>
      <div class="logo-name">AEGIS</div>
      <div class="logo-sub">CI/CD FOR REGULATED AI · UiPath AgentHack 2026</div>
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
    <div id="src-sec">
      <div class="plabel">CASE DESCRIPTION</div>
      <div class="src-box">
        <div class="src-desc" id="src-desc">Select a scenario to view its description.</div>
        <div class="stitle">SOURCE NOTE</div>
        <div class="src-note" id="src-note">—</div>
      </div>
    </div>

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

    <div class="rsec" id="exsec">
      <div class="exp-btns">
        <button class="exp-btn" onclick="exportJSON()">↓ EXPORT JSON</button>
        <button class="exp-btn pdf" onclick="exportPDF()">↓ EXPORT PDF</button>
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
  {id:'TC-007',name:'Pediatric Asthma — Discharge Hallucination',cls:'tc',tag:'CRITICAL'},
];
let SCENARIO_DATA={};
let sel='TC-002',running=false;
let S={tot:0,app:0,fix:0,esc:0};
let lastResult=null;

function renderList(){
  document.getElementById('sc-list').innerHTML=SCENARIOS.map(s=>\`
    <div class="sc-item \${s.id===sel?'active':''}" onclick="pick('\${s.id}')">
      <div class="sc-id">\${s.id}</div>
      <div class="sc-name">\${s.name}</div>
      <span class="sc-tag \${s.cls}">\${s.tag}</span>
    </div>
  \`).join('');
}

function showSourceNote(id){
  const d=SCENARIO_DATA[id];
  if(!d)return;
  document.getElementById('src-desc').textContent=d.description||'—';
  document.getElementById('src-note').textContent=d.note||'—';
}

function pick(id){sel=id;renderList();reset();showSourceNote(id);}

function reset(){
  [1,2,3,4].forEach(i=>{
    document.getElementById('ps'+i).className='ps';
    document.getElementById('st'+i).textContent='STANDBY';
  });
  [1,2,3].forEach(i=>document.getElementById('ar'+i).className='parr');
  document.getElementById('vbanner').style.display='none';
  document.getElementById('fsec').style.display='none';
  document.getElementById('dsec').style.display='none';
  document.getElementById('exsec').style.display='none';
  document.getElementById('flist').innerHTML='';
  lastResult=null;
}

function buildPayload(){
  if(!lastResult)return null;
  const sc=SCENARIO_DATA[lastResult.scenario_id]||{};
  return{aegis_export:{
    scenario_id:lastResult.scenario_id,
    scenario_name:lastResult.scenario_name,
    exported_at:lastResult.exported_at,
    case_description:sc.description||null,
    clinical_note:sc.note||null,
    verdict:lastResult.pipeline_result.sentinel?.verdict||'—',
    overall_severity:lastResult.pipeline_result.sentinel?.overall_severity||'—',
    escalated:lastResult.pipeline_result.sentinel?.escalate_to_human||false,
    total_flagged:lastResult.pipeline_result.sentinel?.total_flagged||0,
    flagged_claims:lastResult.pipeline_result.sentinel?.flagged_claims||[],
    flawed_summary:lastResult.pipeline_result.flawedSummary||null,
    corrected_summary:lastResult.pipeline_result.correction||null,
    revalidation:lastResult.pipeline_result.revalidation||null
  }};
}

function exportJSON(){
  const payload=buildPayload();
  if(!payload)return;
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=lastResult.scenario_id+'-result-'+new Date().toISOString().slice(0,19).replace(/:/g,'-')+'.json';
  a.click();
  URL.revokeObjectURL(url);
}

function exportPDF(){
  const payload=buildPayload();
  if(!payload)return;
  const p=payload.aegis_export;
  const sevColor=p.overall_severity==='CRITICAL'?'#FF3B47':p.overall_severity==='HIGH'?'#FFB020':'#00E5CC';
  const verdictColor=p.verdict==='PASS'?'#00E5CC':'#FF3B47';
  const esc=s=>s?s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):'';
  const flagsHtml=(p.flagged_claims||[]).map(f=>{
    const c=f.severity==='CRITICAL'?'#FF3B47':f.severity==='HIGH'?'#FFB020':'#4D9EFF';
    return '<div style="border:1px solid '+c+';border-left:3px solid '+c+';border-radius:4px;padding:12px;margin-bottom:10px;">'
      +'<div style="font-size:10px;color:'+c+';letter-spacing:2px;margin-bottom:5px">['+esc(f.failure_type||f.issue_type)+'] &middot; '+esc(f.severity)+'</div>'
      +'<div style="font-size:12px;font-style:italic;margin-bottom:5px">&ldquo;'+esc(f.claim_text||f.claim)+'&rdquo;</div>'
      +'<div style="font-size:10px;color:#9AACCC">Source: '+esc(f.source_evidence||f.evidence)+'</div>'
      +'</div>';
  }).join('');
  const corrHtml=p.corrected_summary
    ?'<h3 style="color:#00E5CC;font-size:11px;letter-spacing:3px;margin:20px 0 10px">CORRECTION APPLIED</h3>'
      +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'
      +'<div style="background:rgba(255,59,71,.06);border:1px solid rgba(255,59,71,.25);border-radius:4px;padding:12px">'
      +'<div style="font-size:9px;color:#FF3B47;letter-spacing:2px;margin-bottom:8px">BEFORE (FLAWED)</div>'
      +'<div style="font-size:10px;color:#FF9999;line-height:1.6">'+esc(p.flawed_summary||'')+'</div></div>'
      +'<div style="background:rgba(0,229,204,.06);border:1px solid rgba(0,229,204,.25);border-radius:4px;padding:12px">'
      +'<div style="font-size:9px;color:#00E5CC;letter-spacing:2px;margin-bottom:8px">AFTER (CORRECTED)</div>'
      +'<div style="font-size:10px;color:#99FFE5;line-height:1.6">'+esc(p.corrected_summary)+'</div></div></div>'
    :'';
  const html='<!DOCTYPE html><html><head><meta charset="UTF-8">'
    +'<title>AEGIS · '+esc(p.scenario_id)+' · '+esc(p.scenario_name)+'</title>'
    +'<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">'
    +'<style>*{margin:0;padding:0;box-sizing:border-box;}'
    +'body{background:#060A14;color:#F0F4FF;font-family:"JetBrains Mono",monospace;padding:32px;font-size:12px;}'
    +'@media print{body{background:#fff!important;color:#111!important;-webkit-print-color-adjust:exact;print-color-adjust:exact;}.noprint{display:none!important}}'
    +'</style></head><body>'
    +'<div style="display:flex;align-items:center;gap:16px;margin-bottom:24px;border-bottom:1px solid rgba(0,229,204,.2);padding-bottom:16px">'
    +'<div style="font-family:Georgia,serif;font-size:22px;font-weight:700;letter-spacing:4px;color:#00E5CC">AEGIS</div>'
    +'<div style="font-size:9px;color:#4A5568;letter-spacing:2px">CI/CD FOR REGULATED AI · VALIDATION REPORT</div>'
    +'<div style="margin-left:auto;font-size:9px;color:#4A5568">'+esc(p.exported_at)+'</div></div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">'
    +'<div style="border:1px solid rgba(0,229,204,.15);border-radius:4px;padding:12px;background:rgba(12,18,32,.8)">'
    +'<div style="font-size:9px;letter-spacing:2px;color:#4A5568;margin-bottom:4px">SCENARIO</div>'
    +'<div style="font-size:13px;font-weight:700">'+esc(p.scenario_id)+' · '+esc(p.scenario_name)+'</div></div>'
    +'<div style="border:1px solid rgba(0,229,204,.15);border-radius:4px;padding:12px;background:rgba(12,18,32,.8)">'
    +'<div style="font-size:9px;letter-spacing:2px;color:#4A5568;margin-bottom:4px">VERDICT</div>'
    +'<div style="font-size:18px;font-weight:700;color:'+verdictColor+'">'+esc(p.verdict)+'<span style="font-size:12px;color:'+sevColor+';margin-left:10px">'+esc(p.overall_severity)+'</span></div></div></div>'
    +(p.case_description
      ?'<div style="border:1px solid rgba(0,229,204,.12);border-radius:4px;padding:14px;margin-bottom:20px;background:rgba(12,18,32,.8)">'
        +'<div style="font-size:9px;letter-spacing:2px;color:#4A5568;margin-bottom:8px">CASE DESCRIPTION</div>'
        +'<div style="font-size:10px;color:#00E5CC;line-height:1.6;font-style:italic">'+esc(p.case_description)+'</div></div>'
      :'')
    +'<div style="border:1px solid rgba(0,229,204,.12);border-radius:4px;padding:14px;margin-bottom:20px;background:rgba(12,18,32,.8)">'
    +'<div style="font-size:9px;letter-spacing:2px;color:#4A5568;margin-bottom:8px">SOURCE NOTE</div>'
    +'<div style="font-size:9px;color:#9AACCC;line-height:1.75;white-space:pre-wrap">'+esc(p.clinical_note||'—')+'</div></div>'
    +(flagsHtml?'<h3 style="color:#FF3B47;font-size:11px;letter-spacing:3px;margin-bottom:10px">FLAGGED CLAIMS ('+p.total_flagged+')</h3>'+flagsHtml:'')
    +corrHtml
    +'<div class="noprint" style="margin-top:28px;text-align:center">'
    +'<button onclick="window.print()" style="padding:10px 30px;background:#00E5CC;color:#000;border:none;border-radius:4px;font-family:monospace;font-size:12px;font-weight:700;cursor:pointer;letter-spacing:2px">PRINT / SAVE AS PDF</button></div>'
    +'</body></html>';
  const w=window.open('','_blank');
  w.document.write(html);
  w.document.close();
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
        if(rv.verdict==='PASS' && !sv.escalate_to_human){
          b.className='vbanner vb-ok';
          b.textContent='🔧 AUTO-CORRECTED — '+sv.total_flagged+' errors fixed, re-validation PASS';
          S.fix++;addLog(sel,'AUTO_CORRECTED',sv.overall_severity);
        } else {
          b.className='vbanner vb-esc';
          b.textContent='⚠ CORRECTED · ESCALATED TO HUMAN — Proposed correction requires medical approval';
          S.esc++;addLog(sel,'ESCALATED',sv.overall_severity);
        }
        b.style.display='block';
      }
    }
    S.tot++;metrics();
    lastResult={
      scenario_id:sel,
      scenario_name:SCENARIOS.find(s=>s.id===sel)?.name||sel,
      exported_at:new Date().toISOString(),
      pipeline_result:data
    };
    document.getElementById('exsec').style.display='block';
  }catch(e){
    alert('Error: '+e.message);
  }
  running=false;btn.disabled=false;btn.textContent='▶ RUN PIPELINE';
}

renderList();
fetch('/api/scenarios').then(r=>r.json()).then(data=>{
  SCENARIO_DATA=data;
  showSourceNote(sel);
}).catch(()=>{});
setTimeout(()=>{document.getElementById('splash').classList.add('fade');},2800);
setTimeout(()=>{document.getElementById('splash').style.display='none';},3600);
</script>
</body>
</html>`;

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/aegis-shield.png') {
    try {
      const imgPath = path.join(__dirname, 'aegis-shield.png');
      const img = fs.readFileSync(imgPath);
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(img);
    } catch(e) {
      res.writeHead(404); res.end();
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/Aegis.png') {
    try {
      const imgPath = path.join(__dirname, 'Aegis.png');
      const img = fs.readFileSync(imgPath);
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(img);
    } catch(e) {
      res.writeHead(404); res.end();
    }
    return;
  }

  if (req.method === 'GET' && req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(HTML);
    return;
  }

  if (req.method === 'GET' && req.url === '/api/scenarios') {
    try {
      const scenariosDir = path.join(__dirname, '../../test-scenarios');
      const files = fs.readdirSync(scenariosDir).filter(f => f.endsWith('.json')).sort();
      const result = {};
      for (const file of files) {
        try {
          const sc = JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8'));
          const id = sc.test_case_id;
          if (id) result[id] = {
            description: sc.description || '',
            note: sc.clinical_note?.content || sc.clinical_note || ''
          };
        } catch {}
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (e) {
      res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === 'POST' && req.url === '/api/run') {
    try {
      let body = '';
      for await (const chunk of req) body += chunk;

      const { scenarioId } = JSON.parse(body);
      const scenariosDir = path.join(__dirname, '../../test-scenarios');
      const files = fs.readdirSync(scenariosDir);
      const file = files.find(f => f.startsWith(scenarioId));
      if (!file) throw new Error('Scenario not found: ' + scenarioId);

      const scenario = JSON.parse(fs.readFileSync(path.join(scenariosDir, file), 'utf8'));
      const note = scenario.clinical_note?.content || scenario.clinical_note;
      const expectedVerdict = scenario.expected_verdict;
      const flawedSummary = getSummaryText(scenario);
      const threshold = scenario.escalation_threshold || 'MEDIUM';

      // Step 1: Summarizer (inline for UI display)
      const sumRaw = await callClaude(SUMMARIZER_SYSTEM, `Summarize this clinical note:\n\n${note}`);
      const sumOut = parseJSON(sumRaw);

      // Determine target summary to validate
      const target = expectedVerdict === 'PASS'
        ? (sumOut?.summary_text || '')
        : (flawedSummary || sumOut?.summary_text || '');

      // Steps 2-4: SENTINEL validation via 4-layer pipeline + correction + re-validation
      const pipelineResult = await runPipeline(note, target, threshold);

      // Map pipeline output to frontend-compatible format
      const sentinelOut = {
        verdict: pipelineResult.verdict,
        overall_severity: pipelineResult.overall_severity,
        escalate_to_human: pipelineResult.escalate_to_human,
        total_flagged: pipelineResult.flagged_claims.length,
        flagged_claims: pipelineResult.flagged_claims.map(f => ({
          claim_text: f.claim,
          failure_type: f.issue_type,
          severity: f.severity,
          source_evidence: f.evidence,
          explanation: f.recommendation
        }))
      };

      const revalOut = pipelineResult.revalidation_verdict
        ? {
            verdict: pipelineResult.revalidation_verdict,
            overall_severity: pipelineResult.revalidation_verdict === 'PASS' ? 'NONE' : pipelineResult.overall_severity
          }
        : null;

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        sentinel: sentinelOut,
        correction: pipelineResult.corrected_summary,
        flawedSummary: target,
        revalidation: revalOut
      }));

    } catch (e) {
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: e.message }));
      }
    }
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
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