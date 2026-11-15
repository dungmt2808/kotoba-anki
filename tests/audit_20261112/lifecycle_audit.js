// Extra checks for 1.26.1: native Escape, help opened from active panels,
// and deferred Gemini billing across a real Anki profile switch. No API calls.
'use strict';
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('../anki/cdp');
const OUT = process.argv[2];
const CDP = Number(process.env.KB_CDP_PORT || 9933), CTRL = Number(process.env.KB_CTRL_PORT || 9944);
const RESULTS = [];
let page;
fs.mkdirSync(OUT, {recursive:true});
async function py(code) {
  const r = await fetch(`http://127.0.0.1:${CTRL}`, {method:'POST',body:'import sys,os,json,time,datetime,copy\nkb=sys.modules["kotoba_batake"]\nst=kb.STATE\n'+code});
  const j = await r.json(); if (j.err) throw Error(j.err); return j.r;
}
function check(id, actual, expected, finding) {
  const row = {case:id,pass:JSON.stringify(actual)===JSON.stringify(expected),actual,expected};
  if (finding) row.finding=finding;
  RESULTS.push(row); console.log((row.pass?'PASS ':'FAIL ')+JSON.stringify(row));
}
async function connect() {
  for (let i=0;i<60;i++) {
    for (const t of (await pages(CDP)).filter(x=>!['main webview','top toolbar','bottom toolbar'].includes(x.title))) {
      const p = await Page.open(t.webSocketDebuggerUrl);
      if (await p.eval('typeof GardenTour!=="undefined" && !!Garden._data()').catch(()=>false)) return p;
      p.close();
    }
    await sleep(100);
  }
  throw Error('No garden/tour webview');
}
async function openGarden() { await py('kb.open_garden()\nkb._dialog.resize(1366,860)\nresult=True'); page=await connect(); }
async function wait(expr) {
  for(let i=0;i<75;i++){if(await page.eval(expr).catch(()=>false))return;await sleep(40);}
  throw Error('Timed out: '+expr);
}
async function shot(name) { await page.shot(path.join(OUT,name+'.png')); }
async function switchProfile(name, create=false) {
  if(page){page.close();page=null;}
  await py('mw.unloadProfileAndShowProfileManager()\nresult=True');
  for(let i=0;i<50;i++){if(await py('result=mw.col is None'))break;await sleep(100);}
  await py((create?`mw.pm.create(${JSON.stringify(name)})\n`:'')+`mw.pm.load(${JSON.stringify(name)})\nmw.onOpenProfile()\nresult=True`);
  for(let i=0;i<80;i++){if(await py('result=bool(mw.col)'))return;await sleep(100);}
  throw Error('Profile did not open: '+name);
}

async function helpFromPanels() {
  for(const [name,open,close] of [
    ['games','GardenGames.open()','GardenGames.close()'],
    ['calendar','GardenCal.open()','GardenCal.close()'],
    ['home','GardenHome.open()','GardenHome.close()'],
    ['paper','GardenPaper.open()','GardenPaper.close()'],
  ]) {
    await page.eval('GardenTour.close();'+open);
    await sleep(450);
    await page.click('#kb-sound');
    await page.click('#kb-tour-open');
    await sleep(600);
    // Deferring until the current panel closes is also acceptable.
    await page.eval(close);
    await sleep(800);
    const state=await page.eval('GardenTour._state()');
    check('tour/help-from-'+name+'/visible-after-panel-closes', [state.step,state.shown], [0,true], 'F08');
    if(name==='games')await shot('F08_help_disappeared');
    await page.eval('GardenTour.close()');
  }
}

async function nativeEscape() {
  await page.eval('GardenTour.open()');
  await wait('GardenTour._state().shown');
  await shot('control_before_escape');
  await page.key('Escape','Escape',27); // Real Chromium key -> Anki's Escape bridge.
  await sleep(250);
  check('tour/native-escape-keeps-garden-open', await py('result=bool(kb._dialog and kb._dialog.isVisible())'), true);
  if(await py('result=bool(kb._dialog)')) check('tour/native-escape-dismisses-help',await page.eval('GardenTour._state().step'),-1);
  if(page){page.close();page=null;}
}

async function crossProfileBilling() {
  await py(`
if kb._dialog: kb._dialog.close()
kb.save_config(bao_source="gemini",gemini_langs=["ja"],gemini_auto=False,gemini_audio="tat",gemini_key="AIzaAuditLocalOnlyKey000000000000000000000",show_tooltips=False)
day=kb.ai_today()
yday=(datetime.date.fromisoformat(day)-datetime.timedelta(days=1)).isoformat()
kb._audit_day=day
kb._audit_sub={"until":yday,"plan":"tuan","auto":True,"trial":"2026-10-01","paid":"2026-10-01"}
d=st.load();d["coins"]=250;d["more"]["paper_sub"]=dict(kb._audit_sub);st.save(d)
import shutil
shutil.rmtree(os.path.dirname(kb.ai.issue_path(kb.AI_DIR,day)),ignore_errors=True)
kb._audit_bg_original=kb._bg
kb._audit_pending=[]
kb._bg=lambda task,done: kb._audit_pending.append((task,done))
kb._ai.update(running=False,testing=False)
result=True
`);
  const started=await py('result=kb.ai_start("manual",None,"ja")');
  check('billing/start-on-A', started,true);
  check('billing/deferred-before-result',await py('result=[st.load()["coins"],bool(kb._ai["running"]),len(kb._audit_pending)]'),[250,true,1]);
  // A real profile close/open: collection, hooks, and STATE's getter all change.
  await py('kb.save_config(gemini_key="")\nresult=True');
  await switchProfile('AuditSecond',true);
  const before=await py(`
d=st.load();d["coins"]=600;d["more"]["paper_sub"]=dict(kb._audit_sub);st.save(d)
result={"profile":mw.pm.name,"coins":st.load()["coins"]}
`);
  check('billing/B-initial',before,{profile:'AuditSecond',coins:600});
  const after=await py(`
from concurrent.futures import Future
fixture=os.path.join(kb.AI_DIR,"bao","2026-11-03","bao.json")
raw=json.load(open(fixture,encoding="utf-8"));raw["ngay"]=kb._audit_day
kb.ai._write_json(kb.ai.issue_path(kb.AI_DIR,kb._audit_day),raw)
f=Future();f.set_result({"ok":True,"so":99})
kb._audit_pending[0][1](f)
kb._bg=kb._audit_bg_original
result={"profile":mw.pm.name,"coins":st.load()["coins"],"until":st.load()["more"]["paper_sub"]["until"]}
`);
  check('billing/A-completion-must-not-charge-B',after.coins,600,'F09');
  RESULTS[RESULTS.length-1].detail=after;
  await openGarden();
  await shot('F09_B_charged_for_A_job');
  await switchProfile('Test');
  const a=await py('result={"profile":mw.pm.name,"coins":st.load()["coins"],"until":st.load()["more"]["paper_sub"]["until"]}');
  // A future fix may cancel or defer the old job rather than charging A now.
  // Preserve A's state as evidence without requiring one specific fix strategy.
  RESULTS[RESULTS.length-1].detail={completionInB:after,originAfterReopen:a};
}

(async()=>{
  if(process.env.KB_AUDIT_DISPOSABLE!=='1')throw Error('Use run_ui_audit.sh');
  await py('assert "/tmp/kotoba-audit-ui-" in mw.col.path\nassert hasattr(kb,"TOUR_TEST_OFF")\nkb.save_config(gemini_key="",gemini_auto=False,show_tooltips=False,ui={"trans":"off","greet":"off"})\nresult=True');
  await openGarden();
  for(const [name,fn] of [['help-panels',helpFromPanels],['native-escape',nativeEscape],['cross-profile-billing',crossProfileBilling]]){
    try{await fn();}catch(e){check('harness/'+name,e.message,'completed');}
  }
  const result={cases:RESULTS.length,passed:RESULTS.filter(x=>x.pass).length,failed:RESULTS.filter(x=>!x.pass).length,results:RESULTS};
  fs.writeFileSync(path.join(OUT,'lifecycle-audit.json'),JSON.stringify(result,null,2)+'\n');
  console.log(`LIFECYCLE AUDIT: ${result.passed}/${result.cases} passed; ${result.failed} failed`);
  if(page)page.close();process.exit(result.failed?1:0);
})().catch(e=>{console.error(e);if(page)page.close();process.exit(2);});
