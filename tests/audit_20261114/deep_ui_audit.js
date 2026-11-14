// Final-pass state recovery checks in actual Anki/QtWebEngine. Local fake keys
// and controlled API/config failures only; never sends a Gemini request.
'use strict';
const fs=require('fs'),path=require('path');
const {pages,Page,sleep}=require('../anki/cdp');
const OUT=process.argv[2],CTRL=Number(process.env.KB_CTRL_PORT||11402),CDP=Number(process.env.KB_CDP_PORT||11401);
const results=[];let page;
const KB='import sys,os,json,time,datetime,copy\nkb=sys.modules["kotoba_batake"]\nst=kb.STATE\n';
fs.mkdirSync(OUT,{recursive:true});
function check(id,actual,expected,detail){const r={case:id,pass:JSON.stringify(actual)===JSON.stringify(expected),actual,expected};if(detail!==undefined)r.detail=detail;results.push(r);console.log((r.pass?'PASS ':'FAIL ')+JSON.stringify(r));}
async function py(code){const response=await fetch(`http://127.0.0.1:${CTRL}`,{method:'POST',body:KB+code});const d=await response.json();if(d.err)throw Error(d.err);return d.r;}
async function connect(){for(let i=0;i<60;i++){for(const t of await pages(CDP)){if(['main webview','top toolbar','bottom toolbar'].includes(t.title))continue;const p=await Page.open(t.webSocketDebuggerUrl).catch(()=>null);if(!p)continue;if(await p.eval('typeof Garden!=="undefined"&&!!Garden._data()').catch(()=>false))return p;p.close();}await sleep(80);}throw Error('No Garden');}
async function wait(expr,ms=6000){const start=Date.now();while(Date.now()-start<ms){if(await page.eval(expr).catch(()=>false))return;await sleep(50);}throw Error('Timeout: '+expr);}
async function shot(name){await page.shot(path.join(OUT,name+'.png'));}
async function closePanels(){await page.eval('GardenCraft.close();GardenHome.close();GardenCal.close();GardenPaper.close();GardenGames.close();GardenUI.close()');await sleep(60);}
async function keyForgetRace(){
  await closePanels();
  await py(`kb.save_config(gemini_key="AIzaAuditOldSyntheticKey000000000000000000",gemini_auto=False,gemini_audio="tat",dict_voice="tat",bao_source="gemini")
kb._wav_checked=True
result=True`);
  await page.eval('GardenPaper.open("src")');
  await wait('!!document.querySelector(".kb-ai-forget")');
  // Start the same backend path as the key-test button, holding only the
  // network result. All UI deletion and result application are product code.
  await py(`kb._deep_bg_original=kb._bg
kb._deep_key_pending=[]
kb._bg=lambda task,done: kb._deep_key_pending.append(done)
kb.ai_test_key("AIzaAuditNewSyntheticKey000000000000000000")
kb._bg=kb._deep_bg_original
result=True`);
  check('key-race/validation-is-pending',await py('result=[kb._ai["testing"],len(kb._deep_key_pending)]'),[true,1]);
  await wait('!!document.querySelector(".kb-ai-forget")');
  await page.click('.kb-ai-forget');await page.click('.kb-ai-forget');
  await wait('!!document.querySelector(".kb-ai-flash")&&document.querySelector(".kb-ai-flash").textContent.includes("Đã xoá khoá")');
  check('key-race/delete-actually-clears-config',await py('result=bool(kb.ai.clean_key(kb.config().get("gemini_key")))'),false);
  await shot('key_deleted_while_validation_pending');
  await py(`from concurrent.futures import Future
f=Future();f.set_result({"model":"audit-local-model","models":["audit-local-model"],"tts":False})
kb._deep_key_pending[0](f)
result=True`);
  await sleep(180);
  check('key-race/late-success-does-not-restore-deleted-key',await py('result=bool(kb.ai.clean_key(kb.config().get("gemini_key")))'),false);
  await shot('key_restored_by_stale_success');
  await py('kb.save_config(gemini_key="",gemini_auto=False)\nresult=True');
  await closePanels();
}
async function saveFailureUI(){
  await closePanels();
  await py(`d=st.load();d["coins"]=1000;d["more"]["mywear"]=kb.wear_core.empty();st.save(d)
kb._dialog.refresh()
kb._deep_set_config_original=type(mw.col).set_config
kb._deep_write_faults=[]
def bad_set_config(self,key,value,*a,**kw):
    if self is mw.col and key==kb.core.MORE_KEY and not kb._deep_write_faults:
        kb._deep_write_faults.append(key)
        raise OSError(28,"Synthetic disk full while saving MORE_KEY")
    return kb._deep_set_config_original(self,key,value,*a,**kw)
type(mw.col).set_config=bad_set_config
result=True`);
  try{
    await page.eval('GardenHome.open("room");GardenCraft.openWear(null,"shell")');
    await page.eval('document.getElementById("kb-cf-name").value="Fault shell"');
    await page.click('#kb-cf-save');await sleep(500);await page.click('.kb-ask-yes');
    await wait('!GardenCraft.isOpen()');
    const advertised=await page.eval('({coins:Garden._data().wallet.coins,ids:Object.keys(Garden._data().wallet.more.mywear.items)})');
    const stored=await py('result={"coins":st.load()["coins"],"ids":list(st.load()["more"]["mywear"]["items"]),"faults":len(kb._deep_write_faults)}');
    check('save-failure/one-storage-error-injected',stored.faults,1);
    check('save-failure/UI-success-agrees-with-collection',[advertised.coins,advertised.ids],[stored.coins,stored.ids],{advertised,stored});
    await shot('purchase_claimed_saved_after_disk_error');
    await py('type(mw.col).set_config=kb._deep_set_config_original\nkb._dialog.refresh()\nresult=True');
    await sleep(180);
    const refreshed=await page.eval('({coins:Garden._data().wallet.coins,ids:Object.keys(Garden._data().wallet.more.mywear.items)})');
    check('save-failure/purchase-is-durable-after-refresh',refreshed,advertised);
    await shot('purchase_gone_but_coins_debited_after_refresh');
  }finally{
    await py('type(mw.col).set_config=kb._deep_set_config_original\nresult=True');
    await closePanels();
  }
}
async function reviewFailure(){
  await closePanels();
  const before=await py(`kb.save_config(gemini_key="",mobile_coins=False,show_tooltips=False)
kb._dialog.deck_id=mw.col.decks.id_for_name("A::Có câu ví dụ + audio")
kb._dialog.refresh()
kb._deep_answer_original=kb.answer_card
kb._deep_warning_original=kb.showWarning
kb._deep_warnings=[]
kb.showWarning=lambda message,**kw: kb._deep_warnings.append(message)
kb._deep_attempts=[]
def one_failure(**kw):
    kb._deep_attempts.append("operation-created")
    op=kb._deep_answer_original(**kw)
    def fail_op(col):
        kb._deep_attempts.append("operation-failed")
        raise RuntimeError("Synthetic transient scheduler storage failure")
    op._op=fail_op
    kb.answer_card=kb._deep_answer_original
    return op
kb.answer_card=one_failure
result={"revlog":mw.col.db.scalar("select count() from revlog"),"coins":st.load()["coins"]}
`);
  try{
    await page.click('#kb-review');await wait('!document.getElementById("kb-show").hidden');
    await page.click('#kb-show');await wait('!document.getElementById("kb-ratings").hidden');
    await page.click('.kb-rate-3');
    for(let i=0;i<80;i++){if(await py('result=bool(kb._deep_warnings)'))break;await sleep(50);}
    const state=await py('result={"revlog":mw.col.db.scalar("select count() from revlog"),"coins":st.load()["coins"],"busy":kb._dialog._busy,"has_card":kb._dialog._card is not None,"warnings":len(kb._deep_warnings)}');
    check('review-failure/no-review-or-money-recorded',[state.revlog,state.coins],[before.revlog,before.coins]);
    check('review-failure/backend-unblocked-and-warning',[state.busy,state.warnings],[false,1]);
    await shot('review_after_transient_failure');
    await page.click('.kb-rate-3');await sleep(300);
    const retried=await py('result=mw.col.db.scalar("select count() from revlog")');
    check('review-failure/clicking-rating-can-retry',retried,before.revlog+1,{has_card:state.has_card});
    await page.click('#kb-stop');await sleep(100);
    await page.click('#kb-review');await wait('!document.getElementById("kb-show").hidden');
    await page.click('#kb-show');await wait('!document.getElementById("kb-ratings").hidden');
    await page.click('.kb-rate-3');
    for(let i=0;i<80;i++){if(await py('result=mw.col.db.scalar("select count() from revlog")')>before.revlog)break;await sleep(50);}
    check('review-failure/stop-start-is-a-working-recovery',await py('result=mw.col.db.scalar("select count() from revlog")'),before.revlog+1);
    await page.click('#kb-stop');
  }finally{
    await py('kb.answer_card=kb._deep_answer_original\nkb.showWarning=kb._deep_warning_original\nresult=True');
  }
}
async function writingResultAfterEdit(){
  await closePanels();
  await py(`kb.save_config(gemini_key="AIzaAuditLocalOnlyKey000000000000000000000",gemini_auto=False)
today=kb.cal_today()
kb.JOURNAL.update(today,{"w":{"lang":"ja","goc":"今日はいい天気です。","st":""}})
kb._deep_bg_original=kb._bg
kb._deep_fix_pending=[]
kb._bg=lambda task,done: kb._deep_fix_pending.append(done)
error=kb.fix_start(today.isoformat())
kb._bg=kb._deep_bg_original
result=error`);
  const r=await py(`from concurrent.futures import Future
today=kb.cal_today()
kb.JOURNAL.update(today,{"w":{"lang":"ja","goc":"今日は雨です。","st":""}})
before=copy.deepcopy(kb.JOURNAL.entry(today))
f=Future();f.set_result({"model":"audit-local","raw":{"sua":"今日はいい天気です。","loi":[],"nhan_xet":"Đúng rồi.","tu_nhien":""}})
kb._deep_fix_pending[0](f)
result={"unchanged":before==kb.JOURNAL.entry(today),"text":kb.JOURNAL.entry(today).get("w",{}).get("goc")}
`);
  check('writing/late-result-does-not-overwrite-new-draft',r,{unchanged:true,text:'今日は雨です。'});
  await py('kb.save_config(gemini_key="")\nresult=True');
}
async function undoRedoGoalAndQuest(){
  await closePanels();
  await py(`col=mw.col
kb._ledger.clear()
col.db.execute("delete from revlog")
start=kb.core.ngay.days_of(col).rel_start(0)*1000
cid=col.db.scalar("select id from cards limit 1")
for i in range(9):
    col.db.execute("insert into revlog values(?,?,?,?,?,?,?,?,?)",start+1000+i,cid,0,3,1,1,2500,1000,1)
day=kb._today()
d=st.load();d["coins"]=1000;d["waters"]=0;d["harvests"]=0;d.pop("goal_day",None)
d["quest"]={"day":day,"list":[
{"id":"deep-new","kind":"new","target":10,"reward":20,"text":"Audit ten new cards"},
{"id":"deep-due","kind":"due","target":999,"reward":20,"text":"Audit future task"},
{"id":"deep-games","kind":"games","target":999,"reward":20,"text":"Audit future games"}],
"progress":{"new":9},"done":[],"chest":False,"chest_item":None}
st.save(d)
kb.save_config(gemini_key="",mobile_coins=False,daily_goal=10,daily_bonus=15)
kb._dialog.deck_id=col.decks.id_for_name("A::Có câu ví dụ + audio")
kb._dialog.refresh()
result=True`);
  const snapshot=()=>py(`d=st.load()
result={"coins":d["coins"],"waters":d["waters"],"goal":d.get("goal_day"),
"progress":{k:v for k,v in d["quest"]["progress"].items() if v!=0},"done":d["quest"]["done"],"reviews":mw.col.db.scalar("select count() from revlog")}`);
  const before=await snapshot();
  await page.click('#kb-review');await wait('!document.getElementById("kb-show").hidden');
  await page.click('#kb-show');await wait('!document.getElementById("kb-ratings").hidden');
  await page.click('.kb-rate-3');
  for(let i=0;i<100;i++){if(await py('result=len(kb._ledger)')>0)break;await sleep(40);}
  await page.click('#kb-stop');
  const awarded=await snapshot();
  check('undo-redo/last-review-awards-goal-and-quest',[awarded.reviews,awarded.done.includes('deep-new'),awarded.goal!==null,awarded.coins>1035],[10,true,true,true],awarded);
  await py('from aqt.operations.collection import undo\nundo(parent=mw)\nresult=True');
  for(let i=0;i<80;i++){if(await py('result=mw.col.db.scalar("select count() from revlog")')===9)break;await sleep(40);}
  await sleep(100);
  const undone=await snapshot();
  check('undo-redo/undo-reverses-entire-reward',undone,before);
  check('undo-redo/redo-remains-available',await py('result=bool(mw.col.undo_status().redo)'),true);
  await py('from aqt.operations.collection import redo\nredo(parent=mw)\nresult=True');
  for(let i=0;i<80;i++){if(await py('result=mw.col.db.scalar("select count() from revlog")')===10)break;await sleep(40);}
  await py('kb.check_undo()\nresult=True');
  check('undo-redo/redo-restores-entire-reward',await snapshot(),awarded);
}
(async()=>{
  if(process.env.KB_AUDIT_DISPOSABLE!=='1')throw Error('Use disposable runner');
  const metadata=await py(`assert "/tmp/kotoba-audit-ui-" in mw.col.path
kb.ASK_TEST_OFF=False;kb.LIFE_TEST_OFF=False;kb.STREAK_TEST_ALL=False
kb.save_config(gemini_key="",gemini_auto=False,show_tooltips=False,mobile_coins=False,sound=False,music=False,ui={"trans":"off","greet":"off"})
d=st.load();d["coins"]=1000;d["home"].update(house=7,rooms=["kitchen","bedroom"]);st.save(d)
kb.open_garden();kb._dialog.resize(1024,768)
result={"anki":getattr(sys.modules.get("aqt"),"appVersion",""),"version":kb.VERSION}
`);
  page=await connect();
  for(const [name,fn] of [['key-forget',keyForgetRace],['storage',saveFailureUI],['review-failure',reviewFailure],['stale-writing',writingResultAfterEdit],['undo-redo',undoRedoGoalAndQuest]]){
    try{await fn();}catch(e){check('harness/'+name,e.stack,'completed');await closePanels().catch(()=>{});}
  }
  check('diagnostics/no-js-exceptions',page.errors,[]);
  const data={metadata,cases:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results};
  fs.writeFileSync(path.join(OUT,'deep-ui.json'),JSON.stringify(data,null,2)+'\n');
  console.log(`DEEP UI ${data.passed}/${data.cases}; ${data.failed} failed`);page.close();process.exit(data.failed?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
