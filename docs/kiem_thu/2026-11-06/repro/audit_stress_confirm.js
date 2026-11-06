const fs=require('fs');
const {pages,Page,sleep}=require('/workspace/kotoba-anki/tests/anki/cdp');
const OUT=process.argv[2];
const CTRL=Number(process.env.KB_CTRL_PORT), CDP=Number(process.env.KB_CDP_PORT);
const KB='import sys, datetime, json\nkb=sys.modules["kotoba_batake"]\n';
const results=[];
async function py(code){const r=await fetch('http://127.0.0.1:'+CTRL,{method:'POST',body:KB+code});const j=await r.json();if(j.err)throw Error(j.err);return j.r;}
async function wait(test,ms=10000){const t=Date.now();while(Date.now()-t<ms){try{if(await test())return;}catch{}await sleep(100);}throw Error('wait timed out');}
let page;
async function open(){await py('kb.open_garden();kb._dialog.resize(1366,800);result=1');await sleep(1500);for(const info of await pages(CDP)){if(['top toolbar','bottom toolbar','main webview'].includes(info.title))continue;const p=await Page.open(info.webSocketDebuggerUrl);if(await p.eval('typeof Garden!=="undefined"')){page=p;return;}p.close();}throw Error('garden not found');}
async function calendar(){await page.eval('GardenCal.open({tab:"month"})');await wait(()=>page.eval('!!document.querySelector(".kb-cal-note")'));}
async function shot(name){await page.shot(OUT+'/'+name+'.png');}
async function closeReopen(){await py('kb._dialog.close();result=1');page.close();await sleep(400);await open();await calendar();}
function record(name,data){results.push({name,...data});fs.writeFileSync(OUT+'/findings.json',JSON.stringify(results,null,2));console.log(name,JSON.stringify(data));}
(async()=>{
 await py('kb.save_config(gemini_key="",gemini_auto=False,dict_voice="tat");result=1');
 await open();
 const added=await py(`from anki.collection import AddNoteRequest
col=mw.col
model=col.models.new("Audit Typed Answer")
for name in ["Expression","Answer"]: col.models.add_field(model,col.models.new_field(name))
tpl=col.models.new_template("Card 1")
tpl["qfmt"]="{{Expression}}<br>{{type:Answer}}"
tpl["afmt"]="{{FrontSide}}<hr id=answer>{{type:Answer}}"
col.models.add_template(model,tpl);col.models.add(model)
did=col.decks.id("Stress::5000")
notes=[]
for i in range(5000):
 n=col.new_note(model);n["Expression"]="試験%05d"%i;n["Answer"]="nghĩa %d"%i
 notes.append(AddNoteRequest(note=n,deck_id=did))
col.add_notes(notes)
kb._dialog.deck_id=did
result={"deck_id":did,"notes":len(col.find_notes("deck:Stress::5000"))}`);
 for(const cap of [400,5000]){
  const build=await py(`import time
kb.save_config(max_plants=${cap})
t0=time.perf_counter();data=kb.core.build_garden(mw.col,kb._dialog.deck_id,kb.config());ms=(time.perf_counter()-t0)*1000
kb._dialog.refresh();result={"elapsed_ms":round(ms,1),"plants":len(data["plants"]),"total":data.get("total_notes")}`);
  await sleep(1500);
  const dom=await page.eval('({plants:Garden._data().plants.length,overflow:document.documentElement.scrollWidth>innerWidth+2,canvas:document.querySelector("canvas").width,bodyText:document.body.innerText.slice(-150)})');
  await shot('stress-'+cap);record('stress-'+cap,{...added,...build,...dom});
 }
 await py('kb.save_config(max_plants=400);result=1');
 for(const [label,expected,input] of [['correct','café & crème','café & crème'],['wrong','café & crème','cafe cream']]){
  const item=await py(`col=mw.col;did=col.decks.id("Audit Type::${label}");model=col.models.by_name("Audit Typed Answer");n=col.new_note(model);n["Expression"]="Gõ đáp án thử ${label}";n["Answer"]=${JSON.stringify(expected)};col.add_note(n,did);kb._dialog.deck_id=did;kb._dialog.refresh();result=n.id`);
  await sleep(600);await page.click('#kb-review');
  await wait(()=>page.eval('!!document.getElementById("kb-card").contentDocument.getElementById("typeans")'));
  await page.eval('document.getElementById("kb-card").contentDocument.getElementById("typeans").focus()');
  await page.eval('(()=>{const d=document.getElementById("kb-card").contentDocument;window.auditKeys=[];for(const k of ["keydown","keypress","keyup"])d.addEventListener(k,e=>window.auditKeys.push({type:e.type,key:e.key,keyCode:e.keyCode,which:e.which,focus:d.activeElement.id}));})()');
  await page.type(input);await page.key('Enter','Enter',13);await sleep(800);
  const first=await page.eval('({shown:!document.getElementById("kb-ratings").hidden,keys:window.auditKeys,value:document.getElementById("kb-card").contentDocument.getElementById("typeans").value})');
  if(!first.shown){
   await shot('type-'+label+'-enter-without-text');
   await page.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
   await page.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
   await sleep(800);
  }
  const second=await page.eval('({shown:!document.getElementById("kb-ratings").hidden,keys:window.auditKeys})');
  record('enter-events-'+label,{first,second});
  if(!second.shown){await page.click('#kb-show');await sleep(600);}
  await wait(()=>page.eval('!document.getElementById("kb-ratings").hidden'));
  const feedback=await page.eval('(()=>{const d=document.getElementById("kb-card").contentDocument;return {good:d.querySelectorAll(".typeGood").length,bad:d.querySelectorAll(".typeBad,.typeMissed").length,text:d.body.innerText}})()');
  await shot('type-'+label);record('typed-answer-'+label,{expected,input,...feedback});
  await page.click('#kb-stop');await sleep(300);
 }
 record('end-errors',{errors:await py('result=kb.ERRORS.entries()'),js_errors:page.errors});
 page.close();console.log('EXPLORATION COMPLETED');
})().catch(e=>{console.error(e.stack);process.exit(2);});
