// Independent release audit, using real QtWebEngine and disposable Anki data.
// No production modules are replaced for the layout, drawing or input checks.
'use strict';
const fs = require('fs');
const path = require('path');
const {pages, Page, sleep} = require('../anki/cdp');
const OUT = process.argv[2];
const CDP = Number(process.env.KB_CDP_PORT || 9933);
const CTRL = Number(process.env.KB_CTRL_PORT || 9944);
const results = [], snapshots = [], exceptions = [];
let page;
const KB = 'import sys, json, datetime, time\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
fs.mkdirSync(OUT, {recursive: true});
function check(id, actual, expected, detail) {
  const row = {case:id, pass:JSON.stringify(actual) === JSON.stringify(expected), actual, expected};
  if (detail !== undefined) row.detail = detail;
  results.push(row);
  console.log((row.pass?'PASS ':'FAIL ') + JSON.stringify(row));
}
async function py(code) {
  const response = await fetch(`http://127.0.0.1:${CTRL}`, {method:'POST', body:KB+code});
  const data = await response.json();
  if (data.err) throw Error(data.err);
  return data.r;
}
async function connect() {
  for(let i=0;i<50;i++) {
    for(const info of await pages(CDP)) {
      if(['main webview','top toolbar','bottom toolbar'].includes(info.title)) continue;
      const p = await Page.open(info.webSocketDebuggerUrl).catch(()=>null);
      if (!p) continue;
      if(await p.eval('typeof Garden !== "undefined" && !!Garden._data()').catch(()=>false)) return p;
      p.close();
    }
    await sleep(100);
  }
  throw Error('Garden did not become ready');
}
async function waitFor(expression, ms=5000) {
  const start=Date.now();
  while(Date.now()-start<ms) {
    if(await page.eval(expression).catch(()=>false)) return true;
    await sleep(50);
  }
  throw Error('Timed out: '+expression);
}
async function shot(name) {
  await page.shot(path.join(OUT,name+'.png'));
  snapshots.push(name+'.png');
}
async function resize(w,h) {
  await py(`kb._dialog.resize(${w},${h})\nresult=True`);
  await sleep(180);
}
async function closePanels() {
  await page.eval(`GardenCraft.close(); GardenHome.close(); GardenCal.close(); GardenPaper.close(); GardenGames.close(); GardenUI.close(); GardenHome.closeSceneCard();`);
  await sleep(40);
}
async function viewportMatrix() {
  const tabs=await page.eval('Array.from(document.querySelectorAll("#kb-home .kb-h-tab")).map(e=>e.dataset.tab)');
  for(const [w,h] of [[720,520],[1024,768],[1366,768],[1920,1080]]) {
    await resize(w,h);
    await closePanels();
    await page.eval('GardenHome.open("room")');
    for(const tab of tabs) {
      await page.eval(`GardenHome.setTab(${JSON.stringify(tab)})`);
      await sleep(40);
      const m=await page.eval(`(() => {
        const root=document.getElementById('kb-home'),r=root.getBoundingClientRect();
        const visible=e=>{const s=getComputedStyle(e),b=e.getBoundingClientRect();return s.visibility!=='hidden'&&s.display!=='none'&&b.width>0&&b.height>0;};
        const clipped=Array.from(root.querySelectorAll('button,input,select,textarea')).filter(visible).filter(e=>{
          const b=e.getBoundingClientRect();
          // Scene selectors deliberately scroll horizontally in a short window.
          if(e.closest('.kb-h-scenes'))return false;
          return b.left<r.left-2||b.right>r.right+2;
        }).map(e=>({text:e.textContent.trim().slice(0,65),id:e.id,rect:[e.getBoundingClientRect().left,e.getBoundingClientRect().right]}));
        return {viewport:[innerWidth,innerHeight],rect:[r.left,r.top,r.right,r.bottom],
          // At the minimum height the panel may use the document scrollbar.
          fits:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1,clipped};
      })()`);
      check(`layout/home/${w}x${h}/${tab}/bounds`,m.fits,true,m);
      check(`layout/home/${w}x${h}/${tab}/controls`,m.clipped,[]);
      if(!m.fits||m.clipped.length) await shot(`layout_home_${w}_${tab}`);
    }
    for(const mode of ['head','face','neck','shell','wall','floor','item','seed','zone']) {
      await page.eval(`GardenCraft.close(); ${['head','face','neck','shell'].includes(mode)?`GardenCraft.openWear(null,${JSON.stringify(mode)})`:
        ['wall','floor'].includes(mode)?`GardenCraft.openTile(null,${JSON.stringify(mode)})`:
        mode==='seed'?'GardenCraft.openSeed(null)':mode==='zone'?'GardenCraft.openZone(null)':'GardenCraft.open(null)'};`);
      await sleep(70);
      const m=await page.eval(`(() => {
        const root=document.getElementById('kb-craft'),r=root.getBoundingClientRect();
        const controls=['kb-cf-name','kb-cf-cancel','kb-cf-save','kb-cf-grid'];
        return {viewport:[innerWidth,innerHeight],rect:[r.left,r.top,r.right,r.bottom],
          fits:r.left>=-1&&r.right<=innerWidth+1&&r.top>=-1,
          controls:controls.map(id=>{const e=document.getElementById(id),b=e.getBoundingClientRect();return {id,
            within:b.left>=-1&&b.right<=innerWidth+1&&b.top>=-1&&b.bottom<=innerHeight+1,rect:[b.left,b.top,b.right,b.bottom]};}),state:GardenCraft._state()};
      })()`);
      check(`layout/craft/${w}x${h}/${mode}/bounds`,m.fits,true,m);
      check(`layout/craft/${w}x${h}/${mode}/essential-controls`,m.controls.filter(x=>!x.within),[]);
      if(!m.fits||m.controls.some(x=>!x.within)) await shot(`layout_craft_${w}_${mode}`);
    }
    await closePanels();
  }
}
async function confirmationKeyboard() {
  await resize(1024,768);
  await closePanels();
  await page.eval('GardenHome.open("room"); GardenCraft.openWear(null,"shell")');
  const before=await py('result=st.load()["coins"]');
  await page.click('#kb-cf-save');
  await waitFor('!!document.getElementById("kb-ask") && !document.getElementById("kb-ask").hidden');
  await sleep(500);
  const focus=[];
  for(let i=0;i<6;i++) {
    await page.key('Tab','Tab',9);
    focus.push(await page.eval(`({id:document.activeElement.id,cls:document.activeElement.className,inside:!!document.activeElement.closest('#kb-ask'),text:document.activeElement.textContent.slice(0,50)})`));
  }
  check('confirmation/tab-remains-in-modal',focus.every(x=>x.inside),true,focus);
  await shot('confirmation_keyboard_focus');
  await page.key('Escape','Escape',27);
  await sleep(100);
  check('confirmation/cancel-keeps-wallet',await py('result=st.load()["coins"]'),before);
  check('confirmation/escape-keeps-workshop',await page.eval('GardenCraft.isOpen()'),true);
  check('confirmation/cancel-restores-trigger-focus',await page.eval('document.activeElement.id'),'kb-cf-save');
  await page.click('#kb-cf-save');
  await sleep(500);
  await page.eval(`document.getElementById('kb-cf-name').focus();document.getElementById('kb-cf-name').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',keyCode:229,isComposing:true,bubbles:true,cancelable:true}));`);
  check('confirmation/IME-escape-keeps-modal',await page.eval('!document.getElementById("kb-ask").hidden'),true);
  await page.key('Escape','Escape',27);
  await closePanels();
  // An actual Enter with focus on the dimmed background must not authorize a
  // different purchase. The missing focus trap makes this reachable with Tab.
  await page.eval('GardenHome.open("room"); GardenCraft.openWear(null,"shell")');
  const funds=await py('result=st.load()["coins"]');
  await page.click('#kb-cf-save');await sleep(500);
  for(let i=0;i<6;i++)await page.key('Tab','Tab',9);
  const target=await page.eval('({id:document.activeElement.id,inside:!!document.activeElement.closest("#kb-ask")})');
  await shot('confirmation_enter_target_outside');
  await page.key('Enter','Enter',13);await sleep(250);
  check('confirmation/enter-outside-does-not-spend',await py('result=st.load()["coins"]'),funds,target);
  await shot('confirmation_after_enter_outside');
  await closePanels();
}
async function bridgeMalformed() {
  const commands=[
    'craft:wear:'+JSON.stringify({slot:'head',px:'²r'}),
    'craft:wear:'+JSON.stringify({slot:[],px:'160r'}),
    'craft:tile:'+JSON.stringify({kind:[],px:'256r'}),
    'craft:save:'+JSON.stringify({kind:[],size:16,px:'256r'}),
    'cal:mood:'+JSON.stringify({d:'2026-11-14',m:[]}),
    'home:seed:rule:'+JSON.stringify({where:'tag',key:'audit',value:[]})
  ];
  for(const [i,command] of commands.entries()) {
    const res=await py(`before=st.load()["coins"]\ntry:\n    kb._dialog._on_bridge(${JSON.stringify(command)})\n    err=""\nexcept Exception as e:\n    err=type(e).__name__+": "+str(e)\nresult={"error":err,"same_coins":st.load()["coins"]==before}`);
    check('bridge/nested-json/'+i,res,{error:'',same_coins:true},{command});
  }
  await py('kb.ERRORS.clear()\nresult=True');
}
async function cancelDraft() {
  await resize(1024,768); await closePanels();
  await page.eval('GardenHome.open("room"); GardenCraft.openWear(null,"head")');
  const r=await page.eval(`(()=>{const r=document.getElementById('kb-cf-grid').getBoundingClientRect();return [r.left+7,r.top+7]})()`);
  for(const type of ['mousePressed','mouseReleased']) await page.send('Input.dispatchMouseEvent',{type,x:r[0],y:r[1],button:'left',clickCount:1});
  check('workshop/real-pointer-edits',await page.eval('/[^.]/.test(GardenCraft._state().px)'),true);
  await shot('workshop_before_cancel_unsaved');
  await page.click('#kb-cf-cancel');
  // Explicit Cancel currently discards; record it as a UX decision, not a bug.
  check('workshop/explicit-cancel-closes',await page.eval('GardenCraft.isOpen()'),false);
  await shot('workshop_cancel_unsaved');
  await closePanels();
}
async function delayedSave() {
  await resize(1024,768); await closePanels();
  await py(`kb._audit_js_original=kb.GardenDialog._js
kb._audit_responses=[]
def hold_response(self,fn,payload=None):
    if fn=="home" and isinstance(payload,dict) and payload.get("action")=="mywear" and payload.get("sub")=="save":
        kb._audit_responses.append((self,fn,payload))
    else:
        kb._audit_js_original(self,fn,payload)
kb.GardenDialog._js=hold_response
result=True`);
  try {
    await page.eval('GardenHome.open("room"); GardenCraft.openWear(null,"shell")');
    await page.click('#kb-cf-save'); await sleep(500);
    await page.click('.kb-ask-yes');
    const held=await py('result=len(kb._audit_responses)');
    check('save-race/first-command-committed-and-response-held',held,1);
    await page.click('#kb-cf-cancel');
    await page.eval('GardenCraft.openWear(null,"head")');
    const at=await page.eval(`(()=>{const r=document.getElementById('kb-cf-grid').getBoundingClientRect();return [r.left+7,r.top+7]})()`);
    for(const type of ['mousePressed','mouseReleased'])await page.send('Input.dispatchMouseEvent',{type,x:at[0],y:at[1],button:'left',clickCount:1});
    const before=await page.eval('GardenCraft._state().px');
    check('save-race/new-draft-has-ink',/[^.]/.test(before),true);
    await shot('save_race_before_old_response');
    await py(`kb.GardenDialog._js=kb._audit_js_original
for self,fn,payload in kb._audit_responses:
    kb._audit_js_original(self,fn,payload)
result=True`);
    await sleep(250);
    check('save-race/old-response-keeps-new-editor',await page.eval('GardenCraft.isOpen()'),true);
    check('save-race/old-response-keeps-new-draft',await page.eval('GardenCraft._state().px'),before);
    await shot('save_race_after_old_response');
    if(!await page.eval('GardenCraft.isOpen()')) {
      await page.eval('GardenCraft.openWear(null,"head")');
      check('save-race/reopening-recovers-unsaved-draft',await page.eval('GardenCraft._state().px'),before);
      await shot('save_race_reopened_empty');
    }
  } finally {
    await py('kb.GardenDialog._js=kb._audit_js_original\nresult=True');
    await closePanels();
  }
}
async function escapeEmptyWear() {
  await resize(1024,768);await closePanels();
  for(const slot of ['head','face','neck','shell']) {
    await page.eval(`GardenHome.open("room");GardenCraft.openWear(null,${JSON.stringify(slot)})`);
    const at=await page.eval(`(()=>{const r=document.getElementById('kb-cf-grid').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]})()`);
    await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:at[0],y:at[1]});
    const n=page.errors.length;
    await page.key('Escape','Escape',27);
    await page.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:5,y:5});
    await sleep(100);
    check('workshop/empty-'+slot+'/escape-closes',await page.eval('GardenCraft.isOpen()'),false);
    check('workshop/empty-'+slot+'/escape-no-js-exception',page.errors.slice(n),[]);
    if(page.errors.length>n)await shot('empty_'+slot+'_escape_js_error');
  }
  await closePanels();
}
(async()=>{
  if(process.env.KB_AUDIT_DISPOSABLE!=='1')throw Error('Use the disposable runner');
  const metadata=await py(`assert "/tmp/kotoba-audit-ui-" in mw.col.path
kb.ASK_TEST_OFF=False
kb.LIFE_TEST_OFF=False
kb.STREAK_TEST_ALL=False
kb.GREET_TEST_OFF=False
kb.TOUR_TEST_OFF=False
kb.save_config(gemini_key="",gemini_auto=False,show_tooltips=False,mobile_coins=False,sound=False,music=False,ui={"trans":"off","greet":"off"})
d=st.load();d["coins"]=100000;d["home"]["house"]=7;d["home"]["rooms"]=["kitchen","bedroom"];st.save(d)
for z in kb.core.ZONE_IDS:
    try:st.unlock_zone(z)
    except kb.core.HomeError:pass
for slot,px in (("head","160r"),("face","180g"),("neck","100y")):
    st.mywear_save({"name":"Audit "+slot,"slot":slot,"px":px})
st.mywear_save({"name":"Audit shell","slot":"shell","c":["r","k"]})
kb.open_garden();kb._dialog.resize(1366,768)
result={"anki":getattr(sys.modules.get("aqt"),"appVersion",""),"version":kb.VERSION,"production_flags":True}
`);
  page=await connect();
  for(const [name,fn] of [['viewport',viewportMatrix],['confirmation',confirmationKeyboard],['cancel',cancelDraft],['delayed-save',delayedSave],['empty-escape',escapeEmptyWear],['bridge',bridgeMalformed]]) {
    try{await fn();}catch(e){check('harness/'+name,e.stack,'completed');await closePanels().catch(()=>{});}
  }
  exceptions.push(...page.errors);
  check('diagnostics/no-js-exceptions',exceptions,[]);
  const data={metadata,cases:results.length,passed:results.filter(x=>x.pass).length,failed:results.filter(x=>!x.pass).length,results,snapshots};
  fs.writeFileSync(path.join(OUT,'ui-audit.json'),JSON.stringify(data,null,2)+'\n');
  console.log(`UI AUDIT ${data.passed}/${data.cases}; ${data.failed} failed`);
  page.close();process.exit(data.failed?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
