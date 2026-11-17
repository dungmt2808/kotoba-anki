// Audit độc lập 17/11 trên Anki/QtWebEngine thật, hồ sơ dùng một lần.
// Ngoài test có sẵn: thay báo qua trạng thái không chọn báo; lỗi ghi GIỮA các
// kho tiến độ/phần thưởng; zoom giao diện; tên deck dài. Không gọi Gemini thật.
'use strict';
const fs = require('fs'), path = require('path');
const {pages, Page, sleep} = require('../anki/cdp');
const OUT = process.argv[2];
const CTRL = Number(process.env.KB_CTRL_PORT || 11942), CDP = Number(process.env.KB_CDP_PORT || 11941);
const rows = [];
let page;
const KB = 'import sys, os, json, copy, datetime, time\nkb=sys.modules["kotoba_batake"]\nst=kb.STATE\n';
fs.mkdirSync(OUT, {recursive:true});
function check(id, actual, expected, detail) {
  const r = {case:id, passed:JSON.stringify(actual)===JSON.stringify(expected), actual, expected};
  if (detail !== undefined) r.detail=detail;
  rows.push(r); console.log((r.passed?'PASS ':'FAIL ')+JSON.stringify(r));
}
async function py(code) {
  const r=await fetch(`http://127.0.0.1:${CTRL}`,{method:'POST',body:KB+code});
  const d=await r.json(); if(d.err) throw Error(d.err); return d.r;
}
async function wait(expr, ms=6000) {
  const t=Date.now(); while(Date.now()-t<ms) {
    if(await page.eval(expr).catch(()=>false)) return;
    await sleep(60);
  }
  throw Error('Không đạt trạng thái: '+expr);
}
async function connect() {
  for(let i=0;i<60;i++) {
    for(const info of await pages(CDP)) {
      if(['main webview','top toolbar','bottom toolbar'].includes(info.title)) continue;
      const p=await Page.open(info.webSocketDebuggerUrl);
      if(await p.eval('typeof Garden!=="undefined"&&!!Garden._data()').catch(()=>false)) return p;
      p.close();
    }
    await sleep(100);
  }
  throw Error('Vườn chưa mở');
}
async function shot(name) {
  await page.eval('window.scrollTo(0,0)'); await sleep(60);
  await page.shot(path.join(OUT,name+'.png'));
}
async function closePanels() {
  await page.eval('GardenCraft.close();GardenHome.close();GardenCal.close();GardenPaper.close();GardenGames.close();GardenUI.close();document.getElementById("kb-sound-pop").hidden=true');
  await sleep(80);
}
async function openSource() {
  await closePanels(); await page.eval('GardenPaper.open("src")');
  await wait('!!document.querySelector(".kb-ai-want")');
}
async function tick(label) {
  await page.eval(`(() => {const e=[...document.querySelectorAll('.kb-ai-want label')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!e)throw Error('Không có ô');e.querySelector('input').id='audit-tick';})()`);
  await page.click('#audit-tick'); await sleep(250);
}
async function selection() {
  return py('result={"on":kb.wanted_langs(),"later":kb.ai_later(),"waiting":kb.ai_waiting()}');
}
async function resetSource() {
  await py(`kb.save_config(gemini_langs=["ja"],gemini_langs_chosen=True,gemini_auto=False,gemini_audio="tat",dict_voice="tat",
    gemini_wait_start=False,gemini_wait_langs=[],gemini_later={},bao_source="gemini",
    paper_confirmed={"ja":"gemini","en":"","zh":"","ko":"","vi":""})
kb._ai.update(running=False,queue=[])
kb._dialog.refresh()
result=True`);
  await openSource();
}
async function tomorrowTransitions() {
  await py(`raw=copy.deepcopy(kb._library("ja").issue("2026-11-03"))
raw["ngay"]=kb.ai_today()
kb.ai._write_json(kb.ai.issue_path(kb.AI_DIR,kb.ai_today()),raw)
kb._libraries.clear()
result=True`);
  const tomorrow=await py('result=(datetime.date.fromisoformat(kb.ai_today())+datetime.timedelta(days=1)).isoformat()');
  await resetSource(); await tick('Tiếng Anh');
  const direct=await selection();
  check('tomorrow/control-keep-written-Japanese',direct.later.en,tomorrow,direct);
  await shot('tomorrow_control_deferred');

  await resetSource();
  await tick('Tiếng Nhật');
  check('tomorrow/control-empty-choice-is-possible',(await selection()).on,[]);
  await tick('Tiếng Anh');
  const replaced=await selection();
  check('tomorrow/uncheck-written-then-add-English',replaced.later.en||'',tomorrow,replaced);
  await shot('tomorrow_lost_after_unchecking');
  // Chỉ giữ lại callback nền để xác định add-on có bắt đầu viết hay không;
  // tiền kiểm, chọn deck/trình độ và tạo job đều là mã sản phẩm.
  const started=await py(`kb._audit_bg_original=kb._bg
kb._audit_jobs=[]
kb._bg=lambda task,done: kb._audit_jobs.append((task,done))
try:
    kb._dialog._on_ai('start')
    result={"running":kb._ai["running"],"jobs":len(kb._audit_jobs),"reason":kb._ai.get("why")}
finally:
    kb._bg=kb._audit_bg_original
    kb._ai.update(running=False,queue=[])
`);
  check('tomorrow/replacement-cannot-start-extra-paper-today',started.jobs,0,started);

  await resetSource(); await tick('Chỉ tiếng Việt');
  check('tomorrow/control-switch-directly-to-Vietnamese',(await selection()).later.vi,tomorrow);
  await tick('Tiếng Trung');
  const viaVi=await selection();
  check('tomorrow/Vietnamese-then-Chinese',viaVi.later.zh||'',tomorrow,viaVi);

  await resetSource(); await tick('Tiếng Anh'); await tick('Tiếng Nhật');
  check('tomorrow/control-remaining-English-still-deferred',(await selection()).later.en,tomorrow);
  await tick('Tiếng Anh'); await tick('Tiếng Anh');
  const retick=await selection();
  check('tomorrow/retick-deferred-language',retick.later.en||'',tomorrow,retick);
}

async function offlineArchive() {
  await py(`fix=json.load(open(${JSON.stringify(path.resolve(__dirname,'../fixtures/bao_133.json'))},encoding="utf-8"))
for lg in ("zh","ko","vi"):
    raw=copy.deepcopy(fix[lg]["issue"] if lg in fix else kb._library("en").issue("2026-11-03"))
    raw.update(lang=lg,ngay="2026-11-03")
    kb.ai._write_json(kb.ai.issue_path(kb.AI_DIRS[lg],"2026-11-03"),raw)
kb._libraries.clear()
kb.save_config(gemini_langs=["en"],gemini_langs_chosen=True,gemini_later={},gemini_wait_langs=[])
result=True`);
  for(const lang of ['ja','en','zh','ko','vi']) {
    const n=await py(`kb.save_config(gemini_key="AIzaAuditLocalOnlyKey000000000000000000000",gemini_langs=[${JSON.stringify(lang)}],bao_source="gemini")
kb._dialog.refresh()
result=len(kb._dialog._paper_index(${JSON.stringify(lang)})["issues"])`);
    check('archive/'+lang+'/fixture-has-readable-issues',n>0,true);
    await openSource();
    await page.eval('document.querySelector(".kb-ai-opts-box").open=true');
    await page.click('.kb-ai-forget'); await sleep(100);
    await page.click('.kb-ai-forget'); await sleep(200);
    check('archive/'+lang+'/key-actually-cleared',await py('result=bool(kb.ai.clean_key(kb.config().get("gemini_key")))'),false);
    const after=await py(`view=kb._dialog._paper_index(${JSON.stringify(lang)})
result={"enabled":view["enabled"],"issues":len(view["issues"]),"files":len(kb.paper.Library(kb.AI_DIRS[${JSON.stringify(lang)}],${JSON.stringify(lang)}).issues())}`);
    check('archive/'+lang+'/readable-after-removing-key',after.issues,n,after);
    if(lang==='en') {
      await page.eval('GardenPaper.close();GardenPaper.open("shelf")');
      await sleep(200); await shot('archive_English_blocked_after_key_removed');
    }
  }
  await py('kb.save_config(gemini_key="AIzaAuditLocalOnlyKey000000000000000000000",gemini_langs=["en"])\nresult=True');
}

const setFault = `kb._audit_set_original=type(mw.col).set_config
kb._audit_faults=[]
def fail_once(self,key,value,*a,**kw):
    if self is mw.col and key==kb._audit_fault_key and not kb._audit_faults:
        kb._audit_faults.append(key)
        raise OSError(28,"AUDIT: lỗi ghi tổng hợp giữa hai kho")
    return kb._audit_set_original(self,key,value,*a,**kw)
type(mw.col).set_config=fail_once
`;
const clearFault='type(mw.col).set_config=kb._audit_set_original\n';

async function rewardTransactions() {
  await closePanels();
  // Trả lời đúng câu hỏi báo: tiến độ và tiền phải cùng được ghi / cùng thử lại.
  const before=await py(`kb._dialog._paper_lang="en"
kb.save_config(gemini_langs=["en"],gemini_wait_langs=[],gemini_later={})
kb.PAPER_EN.save(kb.paper.empty_state())
d=st.load();d["coins"]=1000;st.save(d)
kb._audit_issue="2026-11-03"
kb._audit_question=kb._library("en").issue(kb._audit_issue)["cau_hoi"][0]
kb._audit_qcmd='paper:q:'+json.dumps({"d":kb._audit_issue,"i":0,"c":kb._audit_question["dung"]})
kb._audit_fault_key=kb.core.CONFIG_KEY
result=st.load()["coins"]`);
  await page.eval('GardenPaper.open("issue")'); await sleep(180);
  await py(setFault+'kb._dialog._on_paper(kb._audit_qcmd)\nresult=True');
  const failed=await py(clearFault+`result={"coins":st.load()["coins"],"progress":kb.PAPER_EN.load()["read"].get(kb._audit_issue),"faults":len(kb._audit_faults)}`);
  check('rewards/paper/write-fault-reached',failed.faults,1);
  check('rewards/paper/no-wallet-debit',failed.coins,before);
  await shot('paper_progress_after_reward_write_failure');
  const retry=await py(`kb._dialog._on_paper(kb._audit_qcmd)
result={"coins":st.load()["coins"],"progress":kb.PAPER_EN.load()["read"].get(kb._audit_issue)}`);
  const qCoins=await py('result=kb.paper.Q_COINS');
  check('rewards/paper/retry-eventually-pays-correct-answer',retry.coins,before+qCoins,{failed,retry});

  // Món cuối của bộ sưu tầm: sổ ghi đủ bộ trước, ví ghi quà sau.
  await closePanels();
  await py(`kb.save_config(gemini_key="",gemini_auto=False)
d=st.load();d["home"]["house"]=7;d["home"]["zones"]=[];d["home"]["owned"].pop("tukinh",None);st.save(d)
ev=kb.finds.clean(None)
today=kb.cal_today();ds=today.isoformat()
for fid in kb.finds.BY_SCENE["yard"][:-1]:
    ev["found"][fid]={"d":ds,"n":1}
kb.finds.ensure_day(ev,[],today)
kb.EVENTS.save(ev)
col=mw.col
cids=col.db.list("select id from cards order by id limit 60")
start=kb.core.ngay.days_of(col).rel_start(0)*1000
now=int(time.time()*1000)
for i in range(30):
    col.db.execute("insert into revlog(id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)",max(start+1000+i*37,now-600000+i*37),cids[i%len(cids)],-7,3,10,5,2500,1000,1)
kb._audit_fault_key=kb.core.NHA_KEY
kb._dialog.refresh()
result=True`);
  await py(setFault+'kb._dialog._on_find("find:pick:1:yard")\nresult=True');
  const lost=await py(clearFault+`result={"set_done":"yard" in kb.EVENTS.load()["sets"],"found":len(kb.EVENTS.load()["found"]),
    "gift":st.load()["home"]["owned"].get("tukinh",0),"faults":len(kb._audit_faults)}`);
  check('rewards/collection/write-fault-reached',lost.faults,1);
  check('control/collection/progress-survives-gift-write-error',lost.found,6,lost);
  await py('kb._dialog._on_find("find:pick:1:yard")\nkb._dialog.refresh()\nresult=True');
  const afterRetry=await py('result={"done":"yard" in kb.EVENTS.load()["sets"],"gift":st.load()["home"]["owned"].get("tukinh",0)}');
  check('rewards/collection/retry-does-not-permanently-lose-gift',afterRetry.gift,1,afterRetry);
  await page.eval('GardenHome.open("album")'); await sleep(200);
  await shot('collection_gift_recovered_on_refresh');

  // Đối chứng ngược: quà đủ bộ tự cấp lại được; xu nhặt trùng cũng phải nhận được sau khi hết lỗi.
  const coins0=await py('kb._audit_fault_key=kb.core.CONFIG_KEY\nresult=st.load()["coins"]');
  await closePanels();
  await py(setFault+'kb._dialog._on_find("find:pick:2:yard")\nresult=True');
  const duplicate=await py(clearFault+'result={"coins":st.load()["coins"],"faults":len(kb._audit_faults),"picked":kb.EVENTS.load()["days"][kb.cal_today().isoformat()]["picked"]}');
  check('rewards/duplicate/write-fault-reached',duplicate.faults,1);
  await py('kb._dialog._on_find("find:pick:2:yard")\nkb._dialog.refresh()\nresult=True');
  const duplicateRetry=await py('result=st.load()["coins"]');
  const duplicateCoins=await py('result=kb.finds.DUP_COINS');
  check('rewards/duplicate/retry-eventually-pays',duplicateRetry,coins0+duplicateCoins,duplicate);
}

async function readFailureVisible() {
  await closePanels();
  const before=await py(`d=st.load();d["coins"]=5000;d["home"]["house"]=7;st.save(d)
if not st.load()["more"]["pets"].get("neko"):
    st.pet_buy("neko")
kb._dialog.refresh()
result={"pets":list(st.load()["more"]["pets"]),"coins":st.load()["coins"]}`);
  await page.eval('GardenHome.open("yard");GardenHome.setTab("pet")'); await sleep(180);
  await shot('read_failure_before_pet_owned');
  const after=await py(`kb._audit_get_original=type(mw.col).get_config
kb._audit_read_hits=[]
def read_once(self,key,*a,**kw):
    if self is mw.col and key==kb.core.MORE_KEY and not kb._audit_read_hits:
        kb._audit_read_hits.append(key)
        raise OSError("AUDIT: lỗi đọc một lần")
    return kb._audit_get_original(self,key,*a,**kw)
type(mw.col).get_config=read_once
try:
    kb._dialog._dispatch("home:buy:bench")
finally:
    type(mw.col).get_config=kb._audit_get_original
result={"pets":list(st.load()["more"]["pets"]),"coins":st.load()["coins"],"hits":len(kb._audit_read_hits)}`);
  check('read-failure/UI/buy-hits-single-read-error',after.hits,1);
  check('read-failure/UI/buy-must-retain-unrelated-pet',after.pets,before.pets,{before,after});
  await sleep(180); await shot('read_failure_after_pet_lost');
}

async function firstKeyControl() {
  const observed=await py(`from concurrent.futures import Future
kb.save_config(gemini_key="",gemini_langs=["ja","en"],gemini_langs_chosen=True,gemini_auto=True,
    gemini_wait_start=False,gemini_wait_langs=[],gemini_later={})
kb._ai.update(running=False,testing=False,queue=[])
kb._audit_control_bg=kb._bg
kb._audit_control_jobs=[]
kb._bg=lambda task,done:kb._audit_control_jobs.append((task,done))
try:
    without_key=kb.ai_start_all("auto")
    no_key_jobs=len(kb._audit_control_jobs)
    kb.ai_test_key("AIzaAuditLocalOnlyKey000000000000000000000")
    assert len(kb._audit_control_jobs)==1
    callback=kb._audit_control_jobs.pop()[1]
    f=Future();f.set_result({"model":"audit-model","models":["audit-model"],"tts":False})
    callback(f)
    result={"no_key_jobs":no_key_jobs,"without_key":without_key,"after_validation_jobs":len(kb._audit_control_jobs),
        "waiting":kb.ai_waiting()}
finally:
    kb._bg=kb._audit_control_bg
    kb.save_config(gemini_auto=False)
`);
  check('control/real-ai-start-does-not-run-without-key',[observed.no_key_jobs,observed.without_key],[0,false],observed);
  check('control/real-first-key-keeps-both-papers-waiting',[observed.after_validation_jobs,observed.waiting],[0,['ja','en']],observed);
}
async function layoutMatrix() {
  await py('kb._dialog.web.setZoomFactor(1.0)\nkb._dialog.resize(1024,768)\nresult=True');
  await closePanels();
  const states=[['source','GardenPaper.open("src")','#kb-paper'],['settings','document.getElementById("kb-sound").click()','#kb-sound-pop'],
                ['home','GardenHome.open("room")','#kb-home'],['games','GardenGames.open()','#kb-game'],
                ['calendar','GardenCal.open()','#kb-cal']];
  for(const [w,h,z] of [[1024,768,1],[1024,768,1.25],[1366,768,1.5]]) {
    await py(`kb._dialog.resize(${w},${h})\nkb._dialog.web.setZoomFactor(${z})\nresult=True`);
    await sleep(200);
    for(const [name,expr,selector] of states) {
      await closePanels();
      await page.eval(expr); await sleep(180);
      const m=await page.eval(`(() => {
        const e=document.querySelector(${JSON.stringify(selector)});if(!e||e.hidden||!e.getBoundingClientRect().width)return {missing:true};
        const r=e.getBoundingClientRect();
        const scrollRoot=document.scrollingElement;
        return {missing:false,viewport:[innerWidth,innerHeight],rect:[r.left,r.top,r.right,r.bottom],
          horizontalOverflow:Math.max(0,scrollRoot.scrollWidth-scrollRoot.clientWidth),
          reachable:r.left>=-2&&r.right<=innerWidth+2&&r.top>=-2};
      })()`);
      check(`layout/${w}x${h}/zoom-${z}/${name}`,!m.missing&&m.reachable&&m.horizontalOverflow<=2,true,m);
      if(m.missing||!m.reachable||m.horizontalOverflow>2) await shot(`layout_${w}_${z}_${name}`);
    }
  }
  await py('kb._dialog.web.setZoomFactor(1)\nkb._dialog.resize(1024,768)\nresult=True');
  await closePanels();
  const longName='Deck tên dài · 日本語 · 中文 · 한국어 · '.repeat(6);
  await py(`did=mw.col.decks.id(${JSON.stringify(longName)})
kb._dialog.deck_id=did
kb._dialog.refresh()
result=True`);
  await sleep(200);
  check('layout/long-deck-title/no-horizontal-scroll',await page.eval('document.scrollingElement.scrollWidth-document.scrollingElement.clientWidth'),0);
}

(async()=>{
  if(process.env.KB_AUDIT_DISPOSABLE!=='1') throw Error('Chỉ chạy qua runner hồ sơ dùng một lần');
  await py(`kb.save_config(gemini_key="AIzaAuditLocalOnlyKey000000000000000000000",gemini_auto=False,gemini_audio="tat",dict_voice="tat",mobile_coins=False,show_tooltips=False)
kb._audit_network=[]
def no_net(self,*a,**kw):
    kb._audit_network.append("unexpected-request")
    raise RuntimeError("AUDIT không cho gọi mạng")
kb.ai.Gemini._request=no_net
kb._wav_checked=True
kb.open_garden()
kb._dialog.showNormal();kb._dialog.resize(1100,860)
result=True`);
  page=await connect();
  for(const [name,fn] of [['tomorrow',tomorrowTransitions],['archive',offlineArchive],['rewards',rewardTransactions],['read-failure',readFailureVisible],['layout',layoutMatrix],['first-key-control',firstKeyControl]]) {
    try {await fn();} catch(e) {check('harness/'+name,e.stack,'completed');}
  }
  check('control/no-provider-network',await py('result=kb._audit_network'),[]);
  check('control/no-js-exceptions',page.errors,[]);
  const data={tested_commit:'9ef5272f6af34c78168d2b8851259add29bf2561',cases:rows.length,passed:rows.filter(r=>r.passed).length,failed:rows.filter(r=>!r.passed).length,results:rows};
  fs.writeFileSync(path.join(OUT,'ui-audit.json'),JSON.stringify(data,null,2)+'\n');
  console.log(`NEW UI AUDIT ${data.passed}/${data.cases}; ${data.failed} failed`);
  page.close();process.exit(rows.some(r=>r.case.startsWith('harness/'))?2:data.failed?1:0);
})().catch(e=>{console.error(e);process.exit(2);});
