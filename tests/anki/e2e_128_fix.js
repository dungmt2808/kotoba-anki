// 1.28 — kiểm tra hồi quy mở rộng cho 9 lỗi của nhánh audit/release-review-2026-11-12 (ngoài các ca của bộ audit):
//   F09: việc viết báo của A hoàn tất lúc KHÔNG có hồ sơ nào mở → không lỗi, ghi chờ cho A, mở lại A mới tính gói (−100 xu,
//        gia hạn), file chờ trống; A → B → A rồi mới xong → tính ngay cho A, B không đổi; bài luyện viết của A xong khi đang
//        ở B → nhật ký B không đổi; lệnh mua gánh hàng của phiên đã qua bị từ chối.
//   F01: kết quả sửa bài về khi đang gõ dở bằng bộ gõ (composition) → ô nhật ký vẫn là đúng phần tử cũ (không dựng lại),
//        chữ + vị trí con trỏ còn nguyên; Python gửi lại khung ngày (Đổi gợi ý) khi nhật ký chưa tự lưu → chữ còn, lưu được.
//   F08: mở Hướng dẫn từ bảng Nhà rồi đóng Nhà → hiện; Esc tắt hướng dẫn, cửa sổ vẫn mở.
//   F05: Tin làng mở, đổi cỡ 1366×860 → 1024×700 → 720×520 → 1366×768: luôn nằm trong cửa sổ, nút đóng thấy được, cuộn trong bảng.
//   F04: Cố định 00:00 / 23:59 / 04:00 → câu chào đúng buổi.
// Chạy (cần hồ sơ tạm, có đổi hồ sơ): bash tests/audit_20261112/run_ui_audit.sh kotoba_batake OUT "$PWD/tests/anki/e2e_128_fix.js"
'use strict';
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_128_fix';
const CDP = Number(process.env.KB_CDP_PORT || 9933), CTRL = Number(process.env.KB_CTRL_PORT || 9944);
let page, pass = 0, total = 0;
const errors = [];
fs.mkdirSync(OUT, { recursive: true });
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function py(code) {
  const r = await fetch(`http://127.0.0.1:${CTRL}`, { method: 'POST', body: 'import sys,os,json,time,datetime,copy\nkb=sys.modules["kotoba_batake"]\nst=kb.STATE\n' + code });
  const j = await r.json(); if (j.err) throw Error(j.err); return j.r;
}
async function connect() {
  for (let i = 0; i < 80; i++) {
    for (const t of (await pages(CDP)).filter((x) => !['main webview', 'top toolbar', 'bottom toolbar'].includes(x.title))) {
      const p = await Page.open(t.webSocketDebuggerUrl);
      if (await p.eval('typeof GardenTour!=="undefined" && !!Garden._data()').catch(() => false)) return p;
      p.close();
    }
    await sleep(100);
  }
  throw Error('Không thấy trang vườn');
}
async function openGarden() {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); page.close(); page = null; }
  await py('kb.open_garden()\nkb._dialog.resize(1366,860)\nresult=True'); page = await connect();
}
async function waitFor(expr, ms = 6000) {
  const t = Date.now();
  while (Date.now() - t < ms) { if (await page.eval(expr).catch(() => false)) return true; await sleep(60); }
  return false;
}
async function switchProfile(name, create = false) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); page.close(); page = null; }
  await py('mw.unloadProfileAndShowProfileManager()\nresult=True');
  for (let i = 0; i < 50; i++) { if (await py('result=mw.col is None')) break; await sleep(100); }
  if (name === null) { return; }
  await py((create ? `mw.pm.create(${JSON.stringify(name)})\n` : '') + `mw.pm.load(${JSON.stringify(name)})\nmw.onOpenProfile()\nresult=True`);
  for (let i = 0; i < 80; i++) { if (await py('result=bool(mw.col)')) return; await sleep(100); }
  throw Error('Không mở được hồ sơ ' + name);
}
// gói báo hết hạn hôm qua + Tự gia hạn; việc nền giữ lại (không gọi Gemini)
const BILL_SETUP = (coins) => `
kb.save_config(bao_source="gemini",gemini_langs=["ja"],gemini_auto=False,gemini_audio="tat",gemini_key="AIzaRegressLocalOnlyKey00000000000000000000",show_tooltips=False)
day=kb.ai_today()
yday=(datetime.date.fromisoformat(day)-datetime.timedelta(days=1)).isoformat()
kb._t_day=day
kb._t_sub={"until":yday,"plan":"tuan","auto":True,"trial":"2026-10-01","paid":"2026-10-01"}
d=st.load();d["coins"]=${coins};d["more"]["paper_sub"]=dict(kb._t_sub);st.save(d)
import shutil
shutil.rmtree(os.path.dirname(kb.ai.issue_path(kb.AI_DIR,day)),ignore_errors=True)
try: os.remove(kb.SUB_PENDING)
except OSError: pass
kb._t_bg=kb._bg
kb._t_pending=[]
kb._bg=lambda task,done: kb._t_pending.append((task,done))
kb._ai.update(running=False,testing=False)
result=kb.ai_start("manual",None,"ja")
`;
const COMPLETE = `
from concurrent.futures import Future
fixture=os.path.join(kb.AI_DIR,"bao","2026-11-03","bao.json")
raw=json.load(open(fixture,encoding="utf-8"));raw["ngay"]=kb._t_day
kb.ai._write_json(kb.ai.issue_path(kb.AI_DIR,kb._t_day),raw)
f=Future();f.set_result({"ok":True,"so":99})
kb._t_pending[0][1](f)
kb._bg=kb._t_bg
result=True
`;
const wallet = () => py('d=st.load();result={"profile":mw.pm.name,"coins":d["coins"],"until":d["more"]["paper_sub"].get("until")}');
const pendingFile = () => py('result=json.load(open(kb.SUB_PENDING)) if os.path.exists(kb.SUB_PENDING) else {}');

async function billingNoProfile() {
  console.log('== F09: hoàn tất khi không có hồ sơ nào mở');
  const started = await py(BILL_SETUP(250));
  ok(started === true, 'A bắt đầu viết (chưa trừ xu)');
  const ownerA = await py('result=kb._owner_now()');
  await py('kb.save_config(gemini_key="")\nresult=True');
  await switchProfile(null);
  const res = await py(COMPLETE.replace('result=True', 'result=mw.col is None'));
  ok(res === true, 'việc nền xong lúc không có hồ sơ → không lỗi');
  const pf = await pendingFile();
  ok(pf[ownerA] && pf[ownerA].length === 1, 'ghi chờ gói báo cho đúng hồ sơ A (' + JSON.stringify(pf) + ')');
  await py('mw.pm.load("Test")\nmw.onOpenProfile()\nresult=True');
  for (let i = 0; i < 80; i++) { if (await py('result=bool(mw.col)')) break; await sleep(100); }
  await sleep(500);
  const a = await wallet();
  ok(a.coins === 150 && a.until > (await py('result=kb._t_sub["until"]')), 'mở lại A: −100 xu, gia hạn (' + JSON.stringify(a) + ')');
  ok(Object.keys(await pendingFile()).length === 0, 'file chờ trống sau khi tính');
}

async function billingBackToA() {
  console.log('== F09: A → B → A rồi mới xong');
  await py(BILL_SETUP(400));
  await py('kb.save_config(gemini_key="")\nresult=True');
  await switchProfile('RegressSecond', true);
  await py('d=st.load();d["coins"]=900;st.save(d)\nresult=True');
  await switchProfile('Test');
  await py(COMPLETE);
  const a = await wallet();
  ok(a.coins === 300 && a.profile === 'Test', 'xong khi A đang mở → tính ngay cho A (' + JSON.stringify(a) + ')');
  ok(Object.keys(await pendingFile()).length === 0, 'không ghi chờ');
  await switchProfile('RegressSecond');
  const b = await wallet();
  ok(b.coins === 900, 'B không đổi (' + b.coins + ')');
  await switchProfile('Test');
}

async function fixJobOtherProfile() {
  console.log('== F09: bài luyện viết của A xong khi đang ở B');
  await py(`kb.save_config(gemini_key="AIzaRegressLocalOnlyKey00000000000000000000",show_tooltips=False)
today=kb.cal_today()
w={"goc":"きょうは天気がいいです。","lang":"ja","st":"","goi_y":[]}
kb.JOURNAL.update(today,{"w":w})
kb._t_bg=kb._bg
kb._t_pending=[]
kb._bg=lambda task,done: kb._t_pending.append((task,done))
kb._fix.update(running=False)
result=kb.fix_start(today.isoformat())`);
  await switchProfile('RegressSecond');
  const before = await py('result=kb.JOURNAL.entry(kb.cal_today())');
  await py(`from concurrent.futures import Future
f=Future();f.set_result({"raw":{"sua":"きょうは天気がいいです。","loi":[],"nhan_xet":"Tốt."},"model":"x"})
kb._t_pending[0][1](f)
kb._bg=kb._t_bg
result=True`);
  const after = await py('result=kb.JOURNAL.entry(kb.cal_today())');
  ok(JSON.stringify(before) === JSON.stringify(after), 'nhật ký của B không đổi');
  const elog = await py('result=[(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-5:]');
  ok(!elog.some((e) => /sửa bài|calFix/.test(e[0])), 'không lỗi sửa bài (' + JSON.stringify(elog) + ')');
  await switchProfile('Test');
}

async function diaryComposition() {
  console.log('== F01: bộ gõ đang soạn chữ khi bài sửa về');
  await openGarden();
  await py('kb.save_config(gemini_key="",ui={"greet":"off","trans":"off"})\nresult=True');
  await page.eval('GardenCal.open({})'); await waitFor('!!document.querySelector(".kb-cal-note")');
  await page.eval('(()=>{const t=document.querySelector(".kb-cal-note"); t.focus(); t.value="Sáng nay "; t.dispatchEvent(new Event("input")); t.setSelectionRange(5,5); window.__ta=t; document.dispatchEvent(new CompositionEvent("compositionstart"));})()');
  await page.eval(`(()=>{const d=GardenCal._state().sel; const v=JSON.parse(JSON.stringify(GardenCal._state().day)); v.w=Object.assign({},v.w||{}, {st:"done",fix:{segs:[["きょう","c"]],loi:[],nhan_xet:"Tốt"},goc:"きょう",locked:true,today:true,lang:"ja",langs:["ja"],hints:[],used:[],max:60,unit:"ký tự",count:3});
    Garden.calFix({d:d, ok:true, n:0, msg:"", view:v});})()`);
  await sleep(200);
  const st = await page.eval('(()=>{const t=document.querySelector(".kb-cal-note"); return {same: t===window.__ta, v:t.value, s:t.selectionStart, focus: document.activeElement===t, fix: !!document.querySelector(".kb-cal-fix")};})()');
  ok(st.same && st.v === 'Sáng nay ' && st.s === 5 && st.focus && st.fix, 'ô nhật ký giữ nguyên phần tử, chữ, con trỏ, focus; bài sửa hiện (' + JSON.stringify(st) + ')');
  await page.eval('document.dispatchEvent(new CompositionEvent("compositionend"))');
  console.log('== F01: Python gửi lại khung ngày khi nhật ký chưa tự lưu');
  await page.eval('(()=>{const t=document.querySelector(".kb-cal-note"); t.focus(); t.value="Chiều mưa to"; t.dispatchEvent(new Event("input")); t.setSelectionRange(6,6);})()');
  await page.eval('pycmd("cal:day:" + GardenCal._state().sel)');
  await sleep(500);
  const st2 = await page.eval('(()=>{const t=document.querySelector(".kb-cal-note"); return {v:t.value, s:t.selectionStart, focus: document.activeElement===t};})()');
  ok(st2.v === 'Chiều mưa to' && st2.s === 6 && st2.focus, 'khung ngày dựng lại: chữ + con trỏ + focus còn (' + JSON.stringify(st2) + ')');
  await sleep(1800);
  const saved = await py('result=kb.JOURNAL.entry(kb.cal_today()).get("t")');
  ok(saved === 'Chiều mưa to', 'chữ đó đã lưu vào collection ("' + saved + '")');
  await page.eval('GardenCal.close()');
}

async function tourFromHome() {
  console.log('== F08: Hướng dẫn mở từ bảng Nhà');
  await page.eval('GardenTour.close(); GardenHome.open()'); await sleep(400);
  await page.click('#kb-sound'); await page.click('#kb-tour-open'); await sleep(500);
  ok((await page.eval('GardenTour._state()')).shown === false, 'đang mở Nhà: hướng dẫn chờ');
  await page.eval('GardenHome.close()'); await sleep(900);
  const s = await page.eval('GardenTour._state()');
  ok(s.step === 0 && s.shown, 'đóng Nhà → hướng dẫn hiện bước 1');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok((await page.eval('GardenTour._state()')).step === -1 && await py('result=bool(kb._dialog and kb._dialog.isVisible())'), 'Esc tắt hướng dẫn, cửa sổ vẫn mở');
}

async function newsResize() {
  console.log('== F05: Tin làng theo cửa sổ');
  await py(`d=st.load();d["coins"]=50000;d["home"]["house"]=7
today=int(mw.col.sched.today)
d["more"]["pets"]={pid:{"name":p["name"],"scene":"yard","fed":today-5,"got":today-20,"love":10} for pid,p in kb.more_core.PETS.items()}
d["more"]["freeze"]={"n":2,"days":[],"since":kb.cal_today().isoformat()}
st.save(d)
kb._dialog.resize(1366,860); kb._dialog.refresh()
result=True`);
  await sleep(600);
  await page.click('#kb-news-btn'); await sleep(300);
  for (const [w, h] of [[1366, 860], [1024, 700], [720, 520], [1366, 768]]) {
    await py(`kb._dialog.resize(${w},${h})\nresult=True`); await sleep(450);
    const m = await page.eval(`(()=>{const p=document.getElementById("kb-news-pop"), r=p.getBoundingClientRect(), x=document.getElementById("kb-news-x").getBoundingClientRect();
      return {open:!p.hidden, in:r.left>=0&&r.top>=0&&r.right<=innerWidth+1&&r.bottom<=innerHeight+1, x:x.top>=0&&x.bottom<=innerHeight&&x.right<=innerWidth, oy:getComputedStyle(p).overflowY, vw:innerWidth, vh:innerHeight};})()`);
    ok(m.open && m.in && m.x && m.oy === 'auto', w + '×' + h + ': bảng trong cửa sổ, nút đóng thấy được, cuộn trong bảng (' + m.vw + '×' + m.vh + ')');
  }
  await page.key('Escape', 'Escape', 27);
}

async function greetHours() {
  console.log('== F04: câu chào theo giờ cố định');
  for (const [hr, want] of [[0, 'こんばんは！'], [23.98, 'こんばんは！'], [4, 'おはよう！'], [12, 'こんにちは！']]) {
    const hi = await page.eval(`(()=>{ const real = GardenSky.state; GardenSky.state = () => Object.assign({}, real(), {hour:${hr}}); try { GardenGreet._show({who:"stack",name:"StackChan",away:"",day:1,news:[],reviews:0}); return GardenGreet._state().hi; } finally { GardenSky.state = real; GardenGreet.leave && GardenGreet.leave(); } })()`).catch((e) => 'ERR ' + e.message);
    ok(hi === want, hr + ' giờ → ' + hi);
  }
}

async function peddlerStale() {
  console.log('== gánh hàng: lệnh của phiên đã qua');
  await openGarden();
  await py('kb.cal_today=(lambda: datetime.date(2026,11,18))\nkb._dialog.refresh()\nresult=True'); await sleep(500);
  const r = await page.eval(`new Promise((ok)=>{ const f=Garden.finds; Garden.finds=(x)=>{Garden.finds=f; f(x); ok(x);}; pycmd("ped:buy:x1:2026-11-15"); setTimeout(()=>ok(null),4000); })`);
  ok(r && !r.ok && /đã qua/.test(r.msg), 'mua theo bảng của CN 15/11 khi đã là T4 18/11 → từ chối (' + (r && r.msg) + ')');
}

(async () => {
  if (process.env.KB_AUDIT_DISPOSABLE !== '1') throw Error('Chạy bằng run_ui_audit.sh (hồ sơ tạm)');
  await py('assert "/tmp/kotoba-audit-ui-" in mw.col.path\nkb.save_config(gemini_key="",gemini_auto=False,show_tooltips=False,ui={"trans":"off","greet":"off"})\nresult=True');
  for (const fn of [billingNoProfile, billingBackToA, fixJobOtherProfile, diaryComposition, tourFromHome, newsResize, greetHours, peddlerStale]) {
    try { await fn(); } catch (e) { ok(false, fn.name + ': ' + e.message); }
  }
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); }
  ok(errors.length === 0, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total);
  if (page) page.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); if (page) page.close(); process.exit(2); });
