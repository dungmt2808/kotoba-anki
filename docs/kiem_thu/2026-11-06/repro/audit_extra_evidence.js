const fs=require('fs');
const {pages,Page,sleep}=require('/workspace/kotoba-anki/tests/anki/cdp');
const OUT=process.argv[2];
const CTRL=Number(process.env.KB_CTRL_PORT), CDP=Number(process.env.KB_CDP_PORT);
const KB='import sys, datetime, json\nkb=sys.modules["kotoba_batake"]\n';
const results=[];
async function py(code){const r=await fetch('http://127.0.0.1:'+CTRL,{method:'POST',body:KB+code});const j=await r.json();if(j.err)throw Error(j.err);return j.r;}
async function wait(test,ms=10000){const t=Date.now();while(Date.now()-t<ms){try{if(await test())return;}catch{}await sleep(100);}throw Error('wait timed out');}
let page;
async function open(){await py('kb.open_garden();kb._dialog.resize(1366,800);result=1');await sleep(1500);for(const info of await pages(CDP)){if(['top toolbar','bottom toolbar','main webview'].includes(info.title))continue;const p=await Page.open(info.webSocketDebuggerUrl);if(await p.eval('typeof Garden!=="undefined"')){page=p;await py('kb._dialog.showNormal();kb._dialog.resize(1366,800);result=1');await sleep(300);return;}p.close();}throw Error('garden not found');}
async function calendar(){await page.eval('GardenCal.open({tab:"month"})');await wait(()=>page.eval('!!document.querySelector(".kb-cal-note")'));}
async function shot(name){await page.eval('window.scrollTo(0,0)');await page.shot(OUT+'/'+name+'.png');}
async function closeReopen(){await py('kb._dialog.close();result=1');page.close();await sleep(400);await open();await calendar();}
function record(name,data){results.push({name,...data});fs.writeFileSync(OUT+'/findings.json',JSON.stringify(results,null,2));console.log(name,JSON.stringify(data));}
(async()=>{
 await py('kb.save_config(gemini_key="",gemini_auto=False,dict_voice="tat");result=1');
 await open();
 for(const [name,selector,baseline,value,delay] of [
  ['diary-close-fast','.kb-cal-note','NHẬT KÝ ĐÃ LƯU',' DÒNG VỪA VIẾT',100],
  ['diary-close-after-autosave','.kb-cal-note','NHẬT KÝ ĐÃ LƯU',' DÒNG VỪA VIẾT',2000],
  ['draft-close-fast','.kb-cal-ta','今日は','いい天気です。',100],
 ]){
  await py('d=kb.cal_today();kb.JOURNAL.update(d,{"t":'+JSON.stringify(baseline)+',"w":None});result=1');
  await page.eval('GardenCal.close()');await calendar();
  if(selector.includes('-ta'))await page.eval('document.querySelector(".kb-cal-ta").focus()');
  else await page.eval('document.querySelector(".kb-cal-note").focus()');
  // Move to the end with a real keyboard operation, then type via CDP.
  await page.key('End','End',35);await page.type(value);await sleep(delay);
  const typed=await page.eval('document.querySelector('+JSON.stringify(selector)+').value');
  await shot(name+'-before');
  await closeReopen();
  const visible=await page.eval('document.querySelector('+JSON.stringify(selector)+').value');
  const saved=await py('result=kb.JOURNAL.entry(kb.cal_today())');
  await shot(name+'-after');record(name,{typed,visible,saved,retained:typed===visible,delay_ms:delay});
 }
 // Explicit panel close is the positive control for the same draft input.
 await page.eval('document.querySelector(".kb-cal-ta").focus()');await page.type('テスト');
 const panelTyped=await page.eval('document.querySelector(".kb-cal-ta").value');
 await page.eval('GardenCal.close()');await sleep(400);await calendar();
 record('draft-panel-close',{typed:panelTyped,visible:await page.eval('document.querySelector(".kb-cal-ta").value')});
 await page.eval('GardenCal.close()');
 await py('kb._dialog.deck_id=mw.col.decks.id_for_name("A::Có câu ví dụ + audio");kb._dialog.refresh();result=1');await sleep(700);
 const state=()=>py('result={"coins":kb.STATE.load()["coins"],"waters":kb.STATE.load()["waters"],"revlog":mw.col.db.scalar("select count() from revlog"),"undo":str(mw.col.undo_status())}');
 const before=await state();
 await page.click('#kb-review');await wait(()=>page.eval('!document.getElementById("kb-show").hidden'));
 await page.click('#kb-show');await sleep(300);await page.key('3','Digit3',51);
 await wait(async()=>((await state()).revlog>before.revlog));await sleep(700);
 const answered=await state();await shot('undo-answer-before');
 await py('kb._dialog._stop_review();mw.undo();result=1');
 await wait(async()=>((await state()).revlog===before.revlog));await sleep(600);
 await py('kb._dialog.refresh();result=1');await sleep(700);await shot('undo-answer-after');
 record('review-undo',{before,answered,undone:await state()});
 // Repeat Answer/Undo to check whether the same card can pay repeatedly.
 const loops=[];
 for(let i=0;i<2;i++){
  await page.eval('document.getElementById("kb-stop").click()');await sleep(250);
  const start=await state();
  await page.click('#kb-review');await wait(()=>page.eval('!document.getElementById("kb-show").hidden'));
  await page.click('#kb-show');await sleep(200);await page.key('3','Digit3',51);
  await wait(async()=>((await state()).revlog>start.revlog));await sleep(400);
  const paid=await state();
  await py('kb._dialog._stop_review();mw.undo();result=1');
  await wait(async()=>((await state()).revlog===start.revlog));await sleep(400);
  loops.push({start,paid,undone:await state()});
 }
 await py('kb._dialog.refresh();result=1');await sleep(500);
 await page.click('#kb-stop');await sleep(350);await shot('undo-three-cycles');record('review-undo-three-cycles',{initial:before,loops,final:await state()});
 // A new profile must not inherit another profile's progress.
 await py('d=kb.STATE.load();d["coins"]=12345;d["home"]["house"]=7;kb.STATE.save(d);kb._dialog.refresh();result=1');await sleep(600);
 await shot('profile-a-progress');
 const profileA=await py('result={"profile":mw.pm.name,"coins":kb.STATE.load()["coins"],"house":kb.STATE.load()["home"]["house"],"notes":mw.col.note_count()}');
 page.close();
 await py('mw.pm.create("Audit_New_Profile");mw.unloadProfileAndShowProfileManager();result=1');await sleep(3000);
 await py('mw.pm.load("Audit_New_Profile");mw.onOpenProfile();result=1');await wait(()=>py('result=mw.col is not None'));await sleep(2000);
 await py('d=mw.col.decks.current();d["name"]="Hồ sơ B mới — chưa học thẻ nào";mw.col.decks.save(d);result=1');
 await open();await sleep(500);await shot('profile-b-inherited');
 const profileB=await py('result={"profile":mw.pm.name,"coins":kb.STATE.load()["coins"],"house":kb.STATE.load()["home"]["house"],"notes":mw.col.note_count()}');
 record('new-profile-progress',{profileA,profileB});
 record('end-errors',{errors:await py('result=kb.ERRORS.entries()'),js_errors:page.errors});
 page.close();console.log('EXPLORATION COMPLETED');
})().catch(e=>{console.error(e.stack);process.exit(2);});
