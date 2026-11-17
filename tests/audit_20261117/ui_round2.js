// Vòng 2: mua hàng khi sổ phiên lỗi, retry đồng bộ, collection 10.000 note.
'use strict';
const fs=require('fs'),path=require('path');
const {pages,Page,sleep}=require('../anki/cdp');
const OUT=process.argv[2],CDP=Number(process.env.KB_CDP_PORT||12501),CTRL=Number(process.env.KB_CTRL_PORT||12502);
const KB='import sys,os,json,time,copy,datetime\nkb=sys.modules["kotoba_batake"]\nst=kb.STATE\n';
const results=[],metrics=[];
let page;
fs.mkdirSync(OUT,{recursive:true});
function check(id,actual,expected,detail){const r={case:id,passed:JSON.stringify(actual)===JSON.stringify(expected),actual,expected};if(detail!==undefined)r.detail=detail;results.push(r);console.log((r.passed?'PASS ':'FAIL ')+JSON.stringify(r));}
async function py(code){const r=await fetch(`http://127.0.0.1:${CTRL}`,{method:'POST',body:KB+code});const d=await r.json();if(d.err)throw Error(d.err);return d.r;}
async function wait(expr,ms=10000){const start=Date.now();while(Date.now()-start<ms){if(await page.eval(expr).catch(()=>false))return;await sleep(60);}throw Error('Không đạt trạng thái: '+expr);}
async function connect(){for(let i=0;i<60;i++){for(const t of await pages(CDP)){if(['main webview','top toolbar','bottom toolbar'].includes(t.title))continue;const p=await Page.open(t.webSocketDebuggerUrl);if(await p.eval('typeof Garden!=="undefined"&&!!Garden._data()').catch(()=>false))return p;p.close();}await sleep(100);}throw Error('Không thấy vườn');}
async function closePanels(){await page.eval('GardenCraft.close();GardenHome.close();GardenPaper.close();GardenCal.close();GardenGames.close();GardenUI.close();GardenFinds.closePed();GardenFinds.closeCard()');await sleep(80);}
async function shot(name){await page.eval('window.scrollTo(0,0)');await sleep(100);await page.shot(path.join(OUT,name+'.png'));}

async function merchantFault(){
  await closePanels();
  const stock=await py(`kb._r2_cal_today=kb.cal_today
d=st.load();d["coins"]=50000;d["home"]["house"]=7;d["home"]["zones"]=list(kb.core.ZONE_IDS);st.save(d)
day=datetime.date(2026,11,18)
ev=kb.finds.clean(None)
for i in range(16):
    candidate=day+datetime.timedelta(days=7*i)
    goods=kb._ped_goods(st.load(),ev,candidate)
    selected=next((g for g in goods if g["kind"]=="item" and not g["lock"] and kb.core.CATALOG[g["id"]].get("max",99)>1),None)
    if selected:
        break
assert selected
kb._r2_market_day=candidate
kb.cal_today=lambda:kb._r2_market_day
kb._r2_good=selected
kb.EVENTS.save(ev)
kb._dialog.refresh()
kb.ASK_TEST_OFF=False
kb._r2_messages=[]
kb._r2_js_original=kb._dialog._js
def capture(fn,arg):
    if fn=="finds":kb._r2_messages.append({k:arg.get(k) for k in ("ok","msg","act","paid","id")})
    return kb._r2_js_original(fn,arg)
kb._dialog._js=capture
result={"slot":selected["slot"],"id":selected["id"],"price":selected["now"],"date":candidate.isoformat()}`);
  await page.eval('GardenFinds.openPed()');await wait('!!document.querySelector("#kb-ped-pop .kb-ped-buy")');
  await py(`kb._r2_set_original=type(mw.col).set_config
kb._r2_hits=[]
def one_failure(self,key,value,*a,**kw):
    if self is mw.col and key==kb.finds.EVENT_KEY and not kb._r2_hits:
        kb._r2_hits.append(key)
        raise OSError("AUDIT: lỗi lưu sổ phiên sau khi đã trả xu")
    return kb._r2_set_original(self,key,value,*a,**kw)
type(mw.col).set_config=one_failure
result=True`);
  try{
    await page.click(`#kb-ped-pop [data-slot="${stock.slot}"] .kb-ped-buy`);
    await wait('!!document.querySelector(".kb-ask-yes")');await sleep(500);await page.click('.kb-ask-yes');await sleep(250);
  }finally{await py('type(mw.col).set_config=kb._r2_set_original\nresult=True');}
  const first=await py(`g=kb._r2_good
result={"coins":st.load()["coins"],"owned":st.load()["home"]["owned"].get(g["id"],0),
    "bought":g["slot"] in kb.EVENTS.load()["ped"].get(kb.cal_today().isoformat(),[]),"hits":len(kb._r2_hits),"messages":kb._r2_messages}`);
  const shown=await page.eval('Garden._data().wallet.coins');
  check('merchant/control-event-write-fault-reached',first.hits,1,stock);
  check('merchant/failed-purchase-is-atomic',[first.coins,first.owned,first.bought],[50000,0,false],first);
  check('merchant/UI-balance-agrees-with-storage',shown,first.coins,first);
  await shot('merchant_after_first_failure');
  await page.click(`#kb-ped-pop [data-slot="${stock.slot}"] .kb-ped-buy`);
  await wait('!!document.querySelector(".kb-ask-yes")');await sleep(500);await page.click('.kb-ask-yes');await sleep(300);
  const retry=await py('g=kb._r2_good\nresult={"coins":st.load()["coins"],"owned":st.load()["home"]["owned"].get(g["id"],0),"messages":kb._r2_messages}');
  check('merchant/retry-pays-for-one-purchase',[retry.coins,retry.owned],[50000-stock.price,1],{first,retry,stock});
  await shot('merchant_after_retry_double_purchase');
  await py('kb._dialog._dispatch("ped:buy:"+kb._r2_good["slot"]+":"+kb.cal_today().isoformat())\nresult=True');
  check('merchant/control-later-duplicate-is-blocked',await py('result=st.load()["coins"]'),retry.coins);
  await py('kb.cal_today=kb._r2_cal_today\nkb._dialog._js=kb._r2_js_original\nkb._dialog.refresh()\nresult=True');
}

async function syncRetry(){
  await closePanels();
  await py(`kb.save_config(mobile_coins=False,gemini_key="",gemini_auto=False)
d=st.load();d["coins"]=1000;d["more"]["pets"]={};st.save(d)
kb.JOURNAL.update(kb.cal_today(),{"t":"Nhật ký trước khi mua mèo"})
for gid in kb.guests.ORDER:
    kb.GUESTS.met(gid,"yard",kb.cal_today())
kb._dialog.refresh()
kb._r2_old_sync=copy.deepcopy(kb.sync_core.state_of(mw.col))
d=st.load();d["coins"]=5000;st.save(d)
st.pet_buy("neko")
d=st.load();d["coins"]=2000;st.save(d)
kb.JOURNAL.update(kb.cal_today(),{"t":"Nhật ký mới phải còn sau retry"})
kb._dialog.refresh()
result=True`);
  await page.eval('GardenHome.open("yard");GardenHome.setTab("pet")');await sleep(150);await shot('sync_retry_before_failure');
  const failed=await py(`kb._on_sync_start()
for key,value in kb._r2_old_sync["keys"].items():
    mw.col.set_config(key,value)
kb._r2_set_original=type(mw.col).set_config
kb._r2_hits=[]
def one_failure(self,key,value,*a,**kw):
    if self is mw.col and key==kb.core.CONFIG_KEY and not kb._r2_hits:
        kb._r2_hits.append(key)
        raise OSError("AUDIT: lỗi khôi phục ví một lần")
    return kb._r2_set_original(self,key,value,*a,**kw)
type(mw.col).set_config=one_failure
try:
    kb._on_sync_finished()
finally:
    type(mw.col).set_config=kb._r2_set_original
rec=kb.sync_core.read_record(kb.USER_DIR,mw.col)
result={"hits":len(kb._r2_hits),"coins":st.load()["coins"],"checkpoint_coins":rec["keys"][kb.core.CONFIG_KEY]["coins"]}`);
  check('sync-retry/control-restore-fault-reached',failed.hits,1,failed);
  check('sync-retry/control-checkpoint-still-good-after-failure',failed.checkpoint_coins,2000,failed);
  const retry=await py(`kb._on_sync_start()
kb._on_sync_finished()
kb.sync_core.on_open(mw.col,kb.USER_DIR)
result={"coins":st.load()["coins"],"pets":list(st.load()["more"]["pets"]),"diary":kb.JOURNAL.entry(kb.cal_today()).get("t"),
    "checkpoint_coins":kb.sync_core.read_record(kb.USER_DIR,mw.col)["keys"][kb.core.CONFIG_KEY]["coins"]}`);
  check('sync-retry/new-data-survives-retry',[retry.coins,retry.pets,retry.diary],[2000,['neko'],'Nhật ký mới phải còn sau retry'],retry);
  await shot('sync_retry_after_checkpoint_lost');
}

async function largeCollection(){
  await closePanels();
  const setup=await py(`from anki.collection import AddNoteRequest
col=mw.col
kb._r2_original_deck=kb._dialog.deck_id
m=col.models.new("English audit 10000")
for key in ("Word","Meaning"):
    col.models.add_field(m,col.models.new_field(key))
t=col.models.new_template("T1");t["qfmt"]="{{Word}}";t["afmt"]="{{FrontSide}}<hr>{{Meaning}}"
col.models.add_template(m,t);col.models.add(m);m=col.models.by_name("English audit 10000")
did=col.decks.id("Audit::10000 notes")
requests=[]
for i in range(10000):
    note=col.new_note(m);note["Word"]="word %05d"%i;note["Meaning"]="Nghĩa kiểm thử %05d"%i
    requests.append(AddNoteRequest(note=note,deck_id=did))
start=time.perf_counter();col.add_notes(requests)
kb._dialog.deck_id=did
result={"added":len(requests),"insert_ms":round((time.perf_counter()-start)*1000),"reviews":col.db.scalar("select count() from revlog")}`);
  check('large-collection/control-created-10000-notes',setup.added,10000,setup);
  for(const [w,h,z,limit] of [[1366,768,1,400],[720,520,1,5000],[720,520,1.5,5000],[1920,1080,1,5000]]){
    await py(`kb._dialog.resize(${w},${h});kb._dialog.web.setZoomFactor(${z})\nresult=True`);
    await wait(`Math.abs(innerWidth-${w/z})<2`,15000);
    const startPaint=Date.now();
    const backendMs=await py(`kb.save_config(max_plants=${limit})
start=time.perf_counter();kb._dialog.refresh()
result=round((time.perf_counter()-start)*1000)`);
    await wait(`Garden._data().plants.length===${limit} && (()=>{const c=document.getElementById('kb-canvas'),f=document.getElementById('kb-field');return c.width<=f.clientWidth&&c.width>f.clientWidth-90;})()`,30000);
    await sleep(150);
    const measure=await page.eval(`(() => {const d=Garden._data(),c=document.getElementById('kb-canvas');let alpha=null,png=false,error='';
      try{alpha=c.getContext('2d').getImageData(1,c.height-1,1,1).data[3];png=c.toDataURL('image/png').startsWith('data:image/png;base64,');}catch(e){error=String(e);}
      return {notes:d.stats.total_notes,plants:d.plants.length,canvas:[c.width,c.height],alpha,png,error,viewport:[innerWidth,innerHeight]};})()`);
    const id=`large-collection/${w}x${h}/zoom-${z}/limit-${limit}`;
    check(id+'/all-notes-counted',measure.notes,10000,measure);
    check(id+'/canvas-renders-entire-height',[measure.alpha,measure.png,measure.error],[255,true,''],measure);
    metrics.push({id,backend_ms:backendMs,refresh_to_assertion_ms:Date.now()-startPaint,...measure});
    if(!measure.png||measure.alpha!==255)await shot(`large_canvas_${w}_${z}`);
  }
  check('large-collection/viewing-keeps-revlog',await py('result=mw.col.db.scalar("select count() from revlog")'),setup.reviews);
  await py('kb.save_config(max_plants=400)\nkb._dialog.web.setZoomFactor(1)\nkb._dialog.deck_id=kb._r2_original_deck\nkb._dialog.refresh()\nresult=True');
}

(async()=>{
  if(process.env.KB_AUDIT_DISPOSABLE!=='1')throw Error('Chỉ chạy trên hồ sơ dùng một lần');
  await py(`kb.ASK_TEST_OFF=False
kb.save_config(gemini_key="",gemini_auto=False,mobile_coins=False,show_tooltips=False)
kb._r2_network=[]
def no_network(self,*a,**kw):
    kb._r2_network.append("unexpected-request");raise RuntimeError("Audit không gọi mạng")
kb.ai.Gemini._request=no_network
kb.open_garden();kb._dialog.showNormal();kb._dialog.resize(1100,860)
result=True`);
  page=await connect();
  for(const [name,fn] of [['merchant',merchantFault],['sync-retry',syncRetry],['large-collection',largeCollection]]){
    try{await fn();}catch(e){check('harness/'+name,e.stack,'completed');}
  }
  check('control/no-provider-network',await py('result=kb._r2_network'),[]);
  check('control/no-js-exceptions',page.errors,[]);
  const data={tested_commit:'9ef5272f6af34c78168d2b8851259add29bf2561',cases:results.length,passed:results.filter(r=>r.passed).length,results,metrics};
  fs.writeFileSync(path.join(OUT,'ui-round2.json'),JSON.stringify(data,null,2)+'\n');
  console.log(`UI ROUND2 ${data.passed}/${data.cases}`);page.close();process.exit(results.some(r=>r.case.startsWith('harness/'))?2:data.passed===data.cases?0:1);
})().catch(e=>{console.error(e);process.exit(2);});
