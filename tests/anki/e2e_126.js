// 1.26 — màn chào khi mở vườn + hiệu ứng chuyển cảnh + Bảng tin làng, trong Anki thật:
//   lần mở đầu ngày: thú thân nhất chào (theo giờ trong vườn), tin hôm nay, tự vào vườn sau ~4 s, rê chuột thì dừng đếm,
//   bấm / phím để vào ngay (phím đó không mở bảng / không đóng cửa sổ), lần mở sau cùng ngày không chào; chưa nuôi thú →
//   StackChan; thú đi chơi; vừa dùng vé giữ chuỗi; ngày lễ; ⚙ Chào khi mở vườn / Chuyển cảnh; chuyển cảnh ◂ ▸ (dải lá),
//   Trong nhà (rèm), bật nhẹ khi mở bảng, Dịu mắt chỉ mờ dần; Tin làng (dòng + bảng); cửa sổ 720 × 520; không lỗi JS.
// Chạy: KB_SCRIPTS=e2e_126.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_126';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenGreet !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
const errors = [];
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(100); }
  return false;
}
const KB = 'import sys, os, json, time, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const SKY8 = JSON.stringify(JSON.stringify({ mode: 'fixed', fixedHour: 8, dayMinutes: 24, weather: 'sunny' }));
// mở lại vườn từ đầu (trang mới); before: đoạn Python chạy trước khi mở
async function reopen(before) {
  if (page) {
    (page.errors || []).forEach((e) => errors.push(e));
    // trong một phiên Anki trang còn giữ localStorage (GardenPrefs đọc trước) → xoá cùng với config khi muốn chào lại
    if (before && before.indexOf('kb-greet-day') >= 0) { await js('try { localStorage.removeItem("kb-greet-day"); localStorage.removeItem("kb-sky"); } catch (e) {} return 1;').catch(() => 0); }
    try { page.close(); } catch (e) { }
  }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(700);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data()', 8000);
}
const RESET = `cfg = kb.config(); pr = dict(cfg.get("prefs") or {}); pr.pop("kb-greet-day", None); pr["kb-sky"] = ${SKY8}; kb.save_config(prefs=pr)`;
const greetState = () => js('return GardenGreet._state();');

(async () => {
  await py(KB + `kb.GREET_TEST_OFF = False
kb.save_config(show_tooltips=False, sound=False, music=False)
d = st.load(); d["coins"] = 5000; d["home"]["house"] = 7; st.save(d)
try:
    st.pet_buy("neko")
except Exception:
    pass
d = st.load(); d["more"]["pets"]["neko"]["name"] = "Mít"; d["more"]["pets"]["neko"]["love"] = 9; st.save(d)
result = 1`);
  await reopen(RESET + '\nkb.save_config(ui={})');
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');

  console.log('== 1. lần mở đầu ngày: thú chào');
  ok(await waitFor('GardenGreet.isGreeting()', 4000), 'màn chào hiện khi mở vườn lần đầu trong ngày');
  await sleep(1200);
  const s1 = await greetState();
  ok(s1 && s1.who === 'neko' && s1.hi === 'おはよう！' && s1.vi === 'Mít · Chào buổi sáng!', 'mèo Mít chào: ' + JSON.stringify(s1 && [s1.who, s1.hi, s1.vi]));
  ok(s1 && s1.news.length >= 1 && s1.news.length <= 3, 'tin hôm nay trên màn chào: ' + JSON.stringify(s1 && s1.news));
  const day = await py(KB + 'result = int(mw.col.sched.today)');
  ok(await py(KB + 'result = (kb.config().get("prefs") or {}).get("kb-greet-day")') === String(day), 'ghi "đã chào hôm nay" (kb-greet-day = ngày Anki ' + day + ')');
  const lay = await js('const b = document.querySelector(".kb-greet-bubble").getBoundingClientRect(); return [b.left >= 0, b.right <= innerWidth, b.top >= 0];');
  ok(lay.every(Boolean), 'bong bóng nằm gọn trong cửa sổ 1366 × 860');
  await page.shot(SHOTS + '/126_01_man_chao.png');
  ok(await waitFor('!GardenGreet.isGreeting()', 5000), 'tự vào vườn sau ~4 giây');
  ok(await waitFor('!document.getElementById("kb-greet")', 2000), 'màn chào gỡ khỏi trang sau vòng tròn');
  await sleep(700);
  ok(await js('const c = document.getElementById("kb-trans"); return !c || c.hidden;'), 'lớp vòng tròn tắt sau khi mở xong');

  console.log('== 2. lần mở sau cùng ngày: không chào, chỉ vòng tròn mở');
  await reopen('');
  const iris = await waitFor('(() => { const c = document.getElementById("kb-trans"); return !!c && !c.hidden; })()', 1500);
  await sleep(300);
  ok(!(await js('return GardenGreet.isGreeting();')), 'không chào lần thứ hai trong ngày');
  ok(iris && await waitFor('(() => { const c = document.getElementById("kb-trans"); return !c || c.hidden; })()', 2000), 'vòng tròn mở ~0,4 giây rồi tắt');
  ok(await js('return getComputedStyle(document.getElementById("kb-trans")).pointerEvents === "none";'), 'lớp hiệu ứng không nhận chuột (không chặn bấm)');

  console.log('== 3. rê chuột dừng đếm, bấm / phím để vào');
  await reopen(RESET);
  await waitFor('GardenGreet.isGreeting()', 4000);
  await js('document.getElementById("kb-greet").dispatchEvent(new MouseEvent("mouseenter")); return 1;');
  await sleep(5000);
  ok(await js('return GardenGreet.isGreeting();'), 'rê chuột lên màn chào: không tự vào sau 5 giây');
  await js('document.getElementById("kb-greet").dispatchEvent(new MouseEvent("mouseleave")); return 1;');
  ok(await waitFor('!GardenGreet.isGreeting()', 6000), 'rời chuột: đếm tiếp rồi vào vườn');
  await reopen(RESET);
  await waitFor('GardenGreet.isGreeting()', 4000); await sleep(400);
  await js('document.getElementById("kb-greet").click(); return 1;');
  ok(await waitFor('!GardenGreet.isGreeting()', 800), 'bấm vào màn chào → vào vườn ngay');
  await reopen(RESET);
  await waitFor('GardenGreet.isGreeting()', 4000); await sleep(400);
  await page.key('n', 'KeyN', 78); await sleep(700);
  ok(!(await js('return GardenGreet.isGreeting();')) && !(await js('return GardenHome.isOpen();')), 'phím N: chỉ vào vườn, không mở bảng Nhà');
  await reopen(RESET);
  await waitFor('GardenGreet.isGreeting()', 4000); await sleep(400);
  await page.key('Escape', 'Escape', 27); await sleep(800);
  ok(!(await js('return GardenGreet.isGreeting();')) && await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())'), 'Esc: vào vườn, cửa sổ vườn không đóng');

  console.log('== 4. ai chào');
  await reopen(RESET + `
d = st.load(); d["more"]["pets"]["neko"]["fed"] = int(mw.col.sched.today) - 3; st.save(d)`);
  await waitFor('GardenGreet.isGreeting()', 4000); await sleep(1000);
  const s4 = await greetState();
  ok(s4 && s4.who === 'stack' && /Mít đi chơi rồi — cho ăn là về nhé\./.test(s4.vi) && s4.news.some((x) => /Cho ăn/.test(x)), 'thú đi chơi → StackChan báo nhẹ: ' + (s4 && s4.vi));
  await page.shot(SHOTS + '/126_02_thu_di_choi.png');
  await js('GardenGreet.leave(); return 1;'); await sleep(900);
  await reopen(RESET + `
d = st.load(); d["more"]["pets"] = {}; st.save(d)`);
  await waitFor('GardenGreet.isGreeting()', 4000); await sleep(800);
  const s5 = await greetState();
  ok(s5 && s5.who === 'stack' && s5.hi === 'おはよう！' && /^Chào buổi sáng!/.test(s5.vi), 'chưa nuôi thú → StackChan: ' + (s5 && s5.vi));
  await js('GardenGreet.leave(); return 1;'); await sleep(900);
  // giờ trong vườn buổi tối → こんばんは
  const SKY20 = JSON.stringify(JSON.stringify({ mode: 'fixed', fixedHour: 20, dayMinutes: 24, weather: 'sunny' }));
  await reopen(RESET + `\npr = dict(kb.config().get("prefs") or {}); pr["kb-sky"] = ${SKY20}; kb.save_config(prefs=pr)`);
  await waitFor('GardenGreet.isGreeting()', 4000); await sleep(800);
  const s6 = await greetState();
  ok(s6 && s6.hi === 'こんばんは！' && /Chào buổi tối!/.test(s6.vi), 'buổi tối: ' + (s6 && s6.hi));
  await page.shot(SHOTS + '/126_03_stackchan_toi.png');
  await js('GardenGreet.leave(); return 1;'); await sleep(900);

  console.log('== 5. vé giữ chuỗi, ngày lễ');
  await reopen(RESET + `
try:
    st.pet_buy("neko")
except Exception:
    pass
d = st.load(); d["more"]["pets"]["neko"]["name"] = "Mít"
col = mw.col
col.db.execute("delete from revlog")
cut = int(col.sched.day_cutoff)
cid = col.db.scalar("select id from cards limit 1")
for k in (2, 3, 4):
    col.db.execute("insert into revlog(id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", (cut - (k + 1) * 86400 + 3600) * 1000, cid, -1, 3, 10, 5, 2500, 1000, 1)
today = kb.cal_today()
d["more"]["freeze"] = {"n": 1, "days": [], "since": (today - datetime.timedelta(days=5)).isoformat()}
st.save(d)`);
  await waitFor('GardenGreet.isGreeting()', 4000); await sleep(1200);
  const s7 = await greetState();
  ok(s7 && s7.who === 'neko' && /Hôm qua bận hả\? Chuỗi vẫn còn nè!/.test(s7.vi) && /Đã dùng 1 vé giữ chuỗi · chuỗi 3 ngày/.test(s7.news[0] || ''),
    'vừa dùng vé giữ chuỗi: ' + (s7 && s7.vi) + ' / ' + (s7 && s7.news[0]));
  await page.shot(SHOTS + '/126_04_ve_giu_chuoi.png');
  await js('GardenGreet.leave(); return 1;'); await sleep(900);
  await reopen(RESET + `
kb._fest0 = kb.event_core.festival
kb.event_core.festival = lambda d: {"hi": "メリークリスマス！", "vi": "Giáng sinh vui vẻ!", "theme": "noel"}`);
  await waitFor('GardenGreet.isGreeting()', 4000); await sleep(800);
  const s8 = await greetState();
  await py(KB + 'kb.event_core.festival = kb._fest0\nresult = 1');
  ok(s8 && s8.hi === 'メリークリスマス！' && s8.vi === 'Mít · Giáng sinh vui vẻ!', 'ngày lễ: ' + (s8 && s8.hi + ' / ' + s8.vi));
  await js('GardenGreet.leave(); return 1;'); await sleep(900);

  console.log('== 6. Tin làng');
  const nb = await js('const b = document.getElementById("kb-news-btn"); return { shown: !b.hidden, text: b.textContent };');
  ok(nb.shown && /^Tin làng: .+ ▸$/.test(nb.text.trim()), 'dòng trong thẻ Hôm nay: "' + nb.text.trim() + '"');
  await js('document.getElementById("kb-news-btn").click(); return 1;'); await sleep(300);
  const np = await js(`const p = document.getElementById("kb-news-pop"); return { shown: !p.hidden, head: document.getElementById("kb-news-date").textContent,
    today: [...document.querySelectorAll("#kb-news-today li")].map((x) => x.textContent), soon: [...document.querySelectorAll("#kb-news-soon li")].map((x) => x.textContent) };`);
  ok(np.shown && /^Tin làng · Thứ .+ \d+\/\d+$/.test(np.head) && np.today.length >= 2, 'bảng Tin làng: ' + np.head + ' · ' + np.today.length + ' tin hôm nay, ' + np.soon.length + ' sắp tới');
  ok(np.today.some((t) => /vé giữ chuỗi/.test(t)), 'có tin vé giữ chuỗi: ' + JSON.stringify(np.today));
  await page.shot(SHOTS + '/126_05_tin_lang.png');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(await js('return document.getElementById("kb-news-pop").hidden;') && await py(KB + 'result = bool(kb._dialog.isVisible())'), 'Esc đóng bảng Tin làng (cửa sổ vẫn mở)');
  await js('document.getElementById("kb-news-btn").click(); return 1;'); await sleep(200);
  await js('document.getElementById("kb-quest").click(); return 1;'); await sleep(200);
  ok(await js('return document.getElementById("kb-news-pop").hidden && !document.getElementById("kb-quest-pop").hidden;'), 'mở Nhiệm vụ thì bảng Tin làng đóng');
  await js('document.body.click(); return 1;'); await sleep(200);

  console.log('== 7. chuyển cảnh');
  await js(`window.__strip = []; const o = GardenGreet.strip; GardenGreet.strip = function (ctx, w, h, t, snap, kind, dir) { window.__strip.push(kind); return o.apply(this, arguments); }; return 1;`);
  // Sân vườn → (▸) Trong nhà: rèm · Sân vườn → (◂) Bãi biển: dải lá
  await py(KB + 'd = st.load(); d["home"]["zones"] = ["beach"]; st.save(d); kb._dialog.refresh(); result = 1'); await sleep(900);
  await js('GardenPrefs.set("kb-main-scene", "yard"); return 1;');
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(900);
  const names = await js('return [...document.querySelectorAll("#kb-yard-nav button")].map((b) => b.textContent);');
  await js('const b = [...document.querySelectorAll("#kb-yard-nav button")].pop(); b.click(); return 1;'); await sleep(500);
  const k1 = await js('return [...new Set(window.__strip)];');
  const sc1 = await js('return GardenPrefs.get("kb-main-scene");');
  ok(k1.length === 1 && k1[0] === (sc1 === 'house' ? 'curtain' : 'sweep'), '▸ (' + sc1 + '): ' + JSON.stringify(k1) + ' · nút ' + JSON.stringify(names));
  await js('window.__strip = []; GardenPrefs.set("kb-main-scene", "yard"); return 1;'); await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(700);
  await js('window.__strip = []; const b = [...document.querySelectorAll("#kb-yard-nav button")].shift(); b.click(); return 1;'); await sleep(500);
  const k2 = await js('return [...new Set(window.__strip)];'), sc2 = await js('return GardenPrefs.get("kb-main-scene");');
  ok(k2.length === 1 && k2[0] === (sc2 === 'house' ? 'curtain' : 'sweep'), '◂ (' + sc2 + '): ' + JSON.stringify(k2));
  // về Trong nhà (cả nhà) → rèm
  const list = await js('return Garden._data() && (GardenHome._outdoorList ? GardenHome._outdoorList() : null);');
  await js('window.__strip = []; GardenPrefs.set("kb-main-scene", "yard"); return 1;'); await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(700);
  let sawCurtain = false;
  for (let i = 0; i < 9 && !sawCurtain; i++) {
    await js('window.__strip = []; [...document.querySelectorAll("#kb-yard-nav button")].pop().click(); return 1;'); await sleep(450);
    const k = await js('return [...new Set(window.__strip)];'), sc = await js('return GardenPrefs.get("kb-main-scene");');
    if (sc === 'house' || k.indexOf('curtain') >= 0) { sawCurtain = k.indexOf('curtain') >= 0 && (sc === 'house' || true); }
  }
  ok(sawCurtain, 'vào / ra Trong nhà: rèm');
  await js('GardenHome.open(); return 1;'); await sleep(40);
  ok(await js('return document.getElementById("kb-home").classList.contains("kb-pop");'), 'mở bảng Nhà: bật nhẹ (lớp kb-pop)');
  await sleep(400);
  ok(!(await js('return document.getElementById("kb-home").classList.contains("kb-pop");')), 'hết hiệu ứng thì gỡ lớp kb-pop');
  await js('GardenHome.close(); return 1;'); await sleep(300);

  console.log('== 8. ⚙ Chào khi mở vườn / Chuyển cảnh, Dịu mắt');
  await js('GardenUI.open(); return 1;'); await sleep(600);
  const rows = await js('return [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio .kb-ui-l")].map((x) => x.textContent);');
  ok(rows.indexOf('Chào khi mở vườn') >= 0 && rows.indexOf('Chuyển cảnh') >= 0, '⚙ có 2 dòng mới: ' + JSON.stringify(rows));
  await page.shot(SHOTS + '/126_06_cai_dat.png');
  await js('document.querySelector(\'input[name="kb-ui-greet"][value="off"]\').click(); document.querySelector(\'input[name="kb-ui-trans"][value="off"]\').click(); return 1;'); await sleep(600);
  const u = await py(KB + 'u = kb.config().get("ui", {}); result = [u.get("greet"), u.get("trans")]');
  ok(u[0] === 'off' && u[1] === 'off', 'lưu ui.greet / ui.trans = off');
  await js('document.getElementById("kb-ui-exit").click(); return 1;'); await sleep(300);
  await reopen(RESET);
  await sleep(1200);
  ok(!(await js('return GardenGreet.isGreeting();')) && await js('const c = document.getElementById("kb-trans"); return !c || c.hidden;') && await js('return GardenGreet.mode();') === 'none',
    'tắt cả hai: không chào, không vòng tròn');
  await js('window.__strip = []; const o = GardenGreet.strip; GardenGreet.strip = function () { window.__strip.push(1); return o.apply(this, arguments); }; [...document.querySelectorAll("#kb-yard-nav button")].pop().click(); return 1;'); await sleep(500);
  ok((await js('return window.__strip.length;')) === 0, 'tắt chuyển cảnh: đổi cảnh ◂ ▸ không có dải lá');
  await py(KB + 'kb.save_config(ui={"greet": "on", "trans": "on"}); result = 1');
  await js('GardenUI.open(); return 1;'); await sleep(500);
  await js('[...document.querySelectorAll("#kb-ui-stage .kb-ui-preset")].find((b) => /Dịu mắt/.test(b.textContent)).click(); return 1;'); await sleep(600);
  const keep = await py(KB + 'u = kb.config().get("ui", {}); result = [u.get("greet"), u.get("trans")]');
  ok(keep[0] === 'on' && keep[1] === 'on' && await js('return GardenGreet.mode();') === 'fade', 'Dịu mắt: giữ Chào / Chuyển cảnh, chuyển cảnh chỉ mờ dần (' + JSON.stringify(keep) + ')');
  await js('document.getElementById("kb-ui-exit").click(); return 1;'); await sleep(300);
  await py(KB + 'kb.save_config(ui={}); result = 1');

  console.log('== 9. cửa sổ nhỏ 720 × 520');
  await reopen(RESET);
  await py(KB + 'kb._dialog.resize(720, 520); result = 1'); await sleep(900);
  await waitFor('GardenGreet.isGreeting()', 3000);
  const small = await js('const b = document.querySelector(".kb-greet-bubble").getBoundingClientRect(); return [Math.round(b.left), Math.round(b.top), Math.round(b.right), Math.round(b.bottom), innerWidth, innerHeight];');
  ok(small[0] >= 0 && small[1] >= 0 && small[2] <= small[4] && small[3] <= small[5], 'bong bóng vừa cửa sổ 720 × 520: ' + JSON.stringify(small));
  await page.shot(SHOTS + '/126_07_720.png');
  await js('GardenGreet.leave(); return 1;'); await sleep(900);
  await py(KB + 'kb._dialog.resize(1366, 860); kb.GREET_TEST_OFF = True; result = 1');

  (page.errors || []).forEach((e) => errors.push(e));
  const errs = errors.filter((e) => !/favicon/.test(e));
  ok(errs.length === 0, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'result = [str(x) for x in kb.ERRORS.entries()]');
  ok(elog.length === 0, 'nhật ký lỗi add-on trống' + (elog.length ? ': ' + elog.slice(0, 2).join(' | ') : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
