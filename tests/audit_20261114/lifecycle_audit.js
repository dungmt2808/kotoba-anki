// Real Anki profile switches, no network calls or existing user profiles.
'use strict';
const fs=require('fs'),path=require('path');
const {pages,Page,sleep}=require('../anki/cdp');
const OUT=process.argv[2],CTRL=Number(process.env.KB_CTRL_PORT||9944),CDP=Number(process.env.KB_CDP_PORT||9933);
const results=[]; let page;
const KB='import sys,os,json,time,datetime,copy\nkb=sys.modules["kotoba_batake"]\nst=kb.STATE\n';
fs.mkdirSync(OUT,{recursive:true});
async function py(code){const r=await fetch(`http://127.0.0.1:${CTRL}`,{method:'POST',body:KB+code});const d=await r.json();if(d.err)throw Error(d.err);return d.r;}
function check(id,actual,expected,detail){const r={case:id,pass:JSON.stringify(actual)===JSON.stringify(expected),actual,expected};if(detail)r.detail=detail;results.push(r);console.log((r.pass?'PASS ':'FAIL ')+JSON.stringify(r));}
async function connect(){for(let i=0;i<60;i++){for(const t of await pages(CDP)){if(['main webview','top toolbar','bottom toolbar'].includes(t.title))continue;let p=await Page.open(t.webSocketDebuggerUrl).catch(()=>null);if(!p)continue;if(await p.eval('typeof Garden!=="undefined"&&!!Garden._data()').catch(()=>false))return p;p.close();}await sleep(100);}throw Error('No garden');}
async function open(){await py('kb.open_garden()\nkb._dialog.resize(1024,768)\nresult=True');page=await connect();}
async function switchTo(name,create=false){if(page){page.close();page=null;}await py('mw.unloadProfileAndShowProfileManager()\nresult=True');for(let i=0;i<80;i++){if(await py('result=mw.col is None'))break;await sleep(80);}await py((create?`mw.pm.create(${JSON.stringify(name)})\n`:'')+`mw.pm.load(${JSON.stringify(name)})\nmw.onOpenProfile()\nresult=True`);for(let i=0;i<80;i++){if(await py('result=bool(mw.col)'))return;await sleep(100);}throw Error('Profile did not open');}
async function journals(){
  const a=await py(`kb._audit_date=kb.cal_today()
kb.JOURNAL.update(kb._audit_date,{"t":"Synthetic private diary in profile A"})
kb._audit_backup_a=kb.JOURNAL._backup_path(kb._audit_date.year,kb._audit_date.month)
result={"diary":kb.JOURNAL.entry(kb._audit_date).get("t"),"backup":json.load(open(kb._audit_backup_a)).get(kb._audit_date.isoformat(),{}).get("t")}
`);
  check('diary/profile-A-backup',a,{diary:'Synthetic private diary in profile A',backup:'Synthetic private diary in profile A'});
  await switchTo('AuditProfileB',true);
  check('diary/profile-B-starts-empty',await py('result=kb.JOURNAL.entry(kb._audit_date).get("t","")'),'');
  const b=await py(`kb.JOURNAL.update(kb._audit_date,{"t":"Synthetic private diary in profile B"})
result={"same_file":kb.JOURNAL._backup_path(kb._audit_date.year,kb._audit_date.month)==kb._audit_backup_a,
"backup_A_exists":json.load(open(kb._audit_backup_a)).get(kb._audit_date.isoformat(),{}).get("t")=="Synthetic private diary in profile A"}`);
  check('diary/profile-B-does-not-overwrite-A-backup',b,{same_file:false,backup_A_exists:true});
  await switchTo('Test');
  check('diary/profile-A-collection-still-correct',await py('result=kb.JOURNAL.entry(kb._audit_date).get("t","")'),'Synthetic private diary in profile A');
}
async function newspapers(){
  const a=await py(`kb.save_config(gemini_key="AIzaAuditLocalOnlyKey000000000000000000000",bao_source="gemini",gemini_langs=["ja"],gemini_audio="tat",gemini_auto=False)
lib=kb._library("ja")
dates=lib.issues()
raw=copy.deepcopy(lib.issue(dates[-1]))
raw["ngay"]=kb.ai_today();raw["so"]=99;raw["bai"][0]["tieu_de"]="SYNTHETIC PROFILE A ONLY"
kb.ai._write_json(kb.ai.issue_path(kb.AI_DIR,kb.ai_today()),raw)
kb._libraries.clear()
kb._audit_newspaper_base=kb._library("ja").base
result={"title":kb._library("ja").issue(kb.ai_today())["bai"][0]["tieu_de"],"notes":mw.col.note_count()}
`);
  check('paper/profile-A-fixture',a.title,'SYNTHETIC PROFILE A ONLY');
  await switchTo('AuditProfileB');
  const b=await py(`lib=kb._library("ja")
kb._audit_bg_original=kb._bg
kb._audit_tasks=[]
kb._bg=lambda task,done: kb._audit_tasks.append((task,done))
started=kb.ai_start("manual",None,"ja")
kb._bg=kb._audit_bg_original
result={"notes":mw.col.note_count(),"same_library":lib.base==kb._audit_newspaper_base,
"title":lib.issue(kb.ai_today())["bai"][0]["tieu_de"],"started_for_B":started,"tasks":len(kb._audit_tasks)}
`);
  // Observe the current machine-wide newspaper design separately. Product docs
  // do not explicitly promise per-profile newspaper files, so this is a risk
  // requiring a scope decision, not an invented release-blocking assertion.
  check('paper/observed-machine-wide-library',[b.same_library,b.title,b.started_for_B],[true,'SYNTHETIC PROFILE A ONLY',false],b);
  await open();
  await page.eval('GardenPaper.open("shelf")');await sleep(400);
  await page.shot(path.join(OUT,'profile_B_reads_A_newspaper.png'));
  // Explicitly distinguish collection isolation from shared local artifacts.
  check('paper/profile-B-has-no-profile-A-notes',b.notes,0);
  await py('kb.save_config(gemini_key="")\nresult=True');
  await switchTo('Test');await open();
}
(async()=>{
  if(process.env.KB_AUDIT_DISPOSABLE!=='1')throw Error('Use disposable runner');
  const metadata=await py('assert "/tmp/kotoba-audit-ui-" in mw.col.path\nkb.save_config(gemini_key="",gemini_auto=False,mobile_coins=False,show_tooltips=False,sound=False,music=False)\nresult={"anki":getattr(sys.modules.get("aqt"),"appVersion",""),"version":kb.VERSION}');
  for(const [name,fn] of [['journals',journals],['newspapers',newspapers]]){try{await fn();}catch(e){check('harness/'+name,e.stack,'completed');}}
  const data={metadata,cases:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
  fs.writeFileSync(path.join(OUT,'lifecycle-audit.json'),JSON.stringify(data,null,2)+'\n');
  console.log(`LIFECYCLE AUDIT ${data.passed}/${data.cases}; ${data.failed} failed`);if(page)page.close();process.exit(data.failed?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
