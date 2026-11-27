// 1.36.5 — kiểm tra ngoài bộ test có sẵn (lần 2): Anki thật với ĐỒNG HỒ MÁY GIẢ (libfaketime, chạy bằng run_dongho.sh với
// KB_DONGHO_SCRIPT=e2e_giodoingay.js), múi giờ Việt Nam, người dùng đặt **"Next day starts at" khác 4 giờ** (Preferences của Anki,
// 0–23 giờ). Bộ 1.36.4 (e2e_dongho.js) chỉ thử 4:00 (mặc định).
//   KB_ROLLOVER=0  — ngày Anki = ngày lịch: 00:00 ngày 1/12 vườn đang mở tự tặng tủ lịch, ôn 00:10 mở ngăn 1; 18:00 ngày 24 ông
//                    già Noel; 00:00 ngày 25 thư tự mở; 00:00 ngày 1/1 cất đồ; rồi ngày rất xa: Giáng sinh 2027, năm 2030,
//                    đồng hồ lùi về 2025.
//   KB_ROLLOVER=23 — ngày Anki đổi lúc 23:00: trưa 1/12 vẫn là ngày Anki 30/11 (chưa tặng), 23:00 tặng; 18:00 ngày 24 giờ máy là
//                    ngày Anki 23 → ông vẫn ghé (audit 24/11 #17e), ngăn 24 mở sau 23:00 vẫn được; thư từ 23:00 ngày 25;
//                    **không mở vườn từ 20/12 tới 1/3/2027** → lần mở đầu tiên StackChan cất đồ một lần; rồi ngày rất xa.
// Mỗi bước: không lỗi JS, nhật ký lỗi trống, ví / sổ không mất gì.
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_giodoingay';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const FT = process.env.KB_FT_FILE || '/tmp/kb_dongho_time.txt';
const R = Number(process.env.KB_ROLLOVER || 0);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLe !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(150); }
  return false;
}
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
le = kb.le_core
`;
async function setTime(s) {
  for (let k = 0; k < 8; k++) {
    fs.writeFileSync(FT + '.tmp', '@' + s + '\n'); fs.renameSync(FT + '.tmp', FT);
    await sleep(1300);
    const now = await py(KB + 'result = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")');
    if (now === s.slice(0, 16)) { return; }
  }
  throw new Error('đồng hồ giả chưa đổi: ' + s);
}
// lấy mẫu ngăn xếp luồng chính của Anki mỗi giây trong 60 giây (luồng nền) — trang "đứng" khi luồng chính bận (DevTools của
// QtWebEngine chạy trên luồng chính) thì in ra hàm đang chạy
const STACK = '/tmp/kb_stack_' + CTRL + '.txt';
const SAMPLER = `import threading, sys, traceback, time
mid = threading.main_thread().ident
def _samp(path=${JSON.stringify(STACK)}):
    # chỉ để chẩn đoán: không bao giờ ném lỗi (libfaketime làm time.sleep báo EINVAL → đợi bằng Event.wait, lỗi thì thôi)
    out = []
    try:
        ev = threading.Event()
        t0 = time.monotonic()
        while time.monotonic() - t0 < 60:
            f = sys._current_frames().get(mid)
            if f is not None:
                out.append("%.1f s\\n%s" % (time.monotonic() - t0, "".join(traceback.format_stack(f)[-14:])))
            ev.wait(1.0)
    except Exception:
        pass
    try:
        with open(path, "w") as fh:
            fh.write("\\n-----\\n".join(out))
    except Exception:
        pass
threading.Thread(target=_samp, daemon=True).start()
result = 1`;
async function reopen() {
  try { fs.unlinkSync(STACK); } catch (e) { }
  await py(SAMPLER);
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  await py(KB + 'kb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data() && Garden._data().le !== undefined', 8000);
  await sleep(500);
}
async function closeGarden() {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } page = null; }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
}
const REV = (n) => `col = mw.col
n = 0
for _ in range(${n}):
    q = col.sched.get_queued_cards(fetch_limit=1)
    if not q.cards:
        break
    top = q.cards[0]
    card = col.get_card(top.card.id); card.start_timer()
    col.sched.answer_card(col.sched.build_answer(card=card, states=top.states, rating=1))
    n += 1
result = n`;
const rev = (n) => py(KB + REV(n));
const lev = () => js('return Garden._data().le;');
const leKey = () => py(KB + 'result = (mw.col.get_config("kotoba_batake_le", None) or {}).get("noel2026")');
const wallet = () => py(KB + 'd = st.load(); result = {"owned": d["home"]["owned"], "yard": d["home"]["yard"], "room": d["home"]["room"], "coins": d["coins"]}');
const leToday = () => py(KB + 'result = kb.le_today().isoformat()');
async function sendLe(cmd) {
  await js('window.__lastLe = null; const f = Garden.le; Garden.le = function (r) { window.__lastLe = r; f(r); Garden.le = f; }; return 1;');
  await js('pycmd(' + JSON.stringify(cmd) + '); return 1;');
  await waitFor('!!window.__lastLe', 6000);
  return js('return window.__lastLe;');
}
async function waitTimer(expr, label) {         // đồng hồ 60 giây của vườn tự dựng lại (không gọi tay)
  const t0 = Date.now();
  const got = await waitFor(expr, 200000);
  ok(got, label + (got ? ' (sau ' + Math.round((Date.now() - t0) / 1000) + ' giây)' : ' — quá 200 giây'));
  return got;
}
// hộp thoại Qt đang mở (ngoài cửa sổ chính + vườn) — một hộp thông báo bật lên giữa chừng là lỗi (đã gặp lúc chạy lần đầu)
const dialogs = () => py(KB + `from aqt.qt import QApplication
out = []
for w in QApplication.topLevelWidgets():
    if w.isVisible() and w is not mw and w is not kb._dialog:
        t = w.text() if hasattr(w, "text") and callable(w.text) else ""
        i = w.informativeText() if hasattr(w, "informativeText") else ""
        out.append([type(w).__name__, w.windowTitle(), str(t)[:300], str(i)[:300]])
result = out`);
async function noDialog(label) {
  const d = await dialogs();
  ok(!d.length, label + ': không có hộp thoại nào bật lên' + (d.length ? ' — ' + JSON.stringify(d) : ''));
}
const stateOf = async (d) => (await lev()).doors[d - 1].state;
const showOn = () => js('const s = document.getElementById("kb-le-show"); return !!s && !s.hidden;');
const letterOn = () => js('const l = document.getElementById("kb-le-letter"); return !!l && !l.hidden;');
const packOn = () => js('const p = document.getElementById("kb-le-packpop"); return !!p && !p.hidden;');

async function farFuture(k0, w0) {
  // ---- ngày rất xa sau sự kiện + đồng hồ lùi trước sự kiện (sự kiện gắn năm 2026) ----
  await noDialog('trước mục');
  console.log('== X1. 24/12/2027 19:00 — Giáng sinh năm sau (sự kiện 2026 đã xong)');
  await setTime('2027-12-24 19:00:00');
  await reopen();
  let v = await lev();
  ok(v && v.phase === 'done' && !v.active, 'data.le "done" (không có tủ lịch mới): ' + (v && v.phase));
  ok(!(await showOn()), 'không chạy lại cảnh ông già Noel');
  ok(!(await letterOn()) && !(await packOn()), 'không thư, không cất đồ lần nữa');
  let r = await sendLe('le:open:24');
  ok(r && !r.ok, 'mở ngăn 24 năm sau → từ chối: "' + (r && r.msg) + '"');
  r = await sendLe('le:card:' + JSON.stringify({ i: 1, rid: 9, card: { f: 'den', st: [], t1: 'x', t2: 'y', c: 'vi', w: '', wl: 'vi' } }));
  ok(r && !r.ok, 'làm thiệp năm sau → từ chối: "' + (r && r.msg) + '"');
  let k = await leKey(), w = await wallet();
  ok(JSON.stringify(k.open) === JSON.stringify(k0.open) && JSON.stringify(k.santa) === JSON.stringify(k0.santa), 'sổ 2026 không đổi');
  ok(JSON.stringify(w.owned) === JSON.stringify(w0.owned), 'kho đồ không đổi (không tặng lại)');
  ok(w.room.some((e) => e.id === 'le_tulich') || w.owned.le_tulich >= 1, 'tủ lịch 2026 vẫn còn (kỷ niệm)');
  await page.shot(SHOTS + '/gio' + R + '_x1_2027.png');
  ok(await js("return !!Garden._data().news;"), "Tin làng dựng được");

  await noDialog('trước mục');

  console.log('== X2. 1/6/2030');
  await setTime('2030-06-01 10:00:00');
  await reopen();
  v = await lev();
  ok(v === null || (v && v.phase === 'done'), 'vườn mở được, data.le ' + (v && v.phase));
  ok(await js('return Array.isArray(Garden._data().plants);'), 'ruộng dựng được');

  await noDialog('trước mục');

  console.log('== X3. đồng hồ lùi về 24/12/2025 19:00 (trước cả mùa 2026)');
  await setTime('2025-12-24 19:00:00');
  await reopen();
  v = await lev();
  // Anki không cho ngày Anki lùi lại khi đồng hồ máy lùi (giữ ngày đã tính tới khi đồng hồ vượt lại mốc — như 1.36.4 K1)
  const lt = await leToday();
  ok(v === null || (v.phase === 'done' && lt >= '2027-01-01'), 'không có sự kiện mới: ngày Anki ' + lt + ', data.le ' + JSON.stringify(v && v.phase));
  ok(!(await showOn()) && !(await letterOn()), 'không cảnh đêm, không thư');
  ok(await js('const c = document.getElementById("kb-le-chip"); return !c || c.hidden;'), 'không có chip Tủ lịch');
  k = await leKey(); w = await wallet();
  ok(JSON.stringify(k.open) === JSON.stringify(k0.open) && JSON.stringify(k.pack) === JSON.stringify(k0.pack), 'sổ không đổi');
  ok(JSON.stringify(w.owned) === JSON.stringify(w0.owned) && w.coins === w0.coins, 'kho đồ + xu không đổi');
  await page.shot(SHOTS + '/gio' + R + '_x3_2025.png');
  await setTime('2027-01-05 10:00:00');
  await reopen();
  ok(!!(await lev()), 'chỉnh lại giờ đúng: vườn + Kỷ niệm như cũ');
}

(async () => {
  const START = process.env.KB_DONGHO_START || '2026-11-30 21:00:00';
  await setTime(START);
  const did = await py(KB + `col = mw.col
p = col.get_preferences(); p.scheduling.rollover = ${R}; col.set_preferences(p)
did = col.decks.id("Giờ đổi ngày")
m = col.models.by_name("Basic") or col.models.current()
for i in range(400):
    n = col.new_note(m); n.fields[0] = "gd %d" % i; n.fields[1] = "nghĩa %d" % i; col.add_note(n, did)
conf = col.decks.config_dict_for_deck_id(did); conf["new"]["perDay"] = 9999; conf["rev"]["perDay"] = 9999; col.decks.save(conf)
col.decks.select(did)
d = st.load(); d["coins"] = 5000; d["home"]["house"] = 7; d["home"]["owned"] = {}
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
st.save(d)
kb.save_config(show_tooltips=False, sound=False, music=False, season_event=True, ui={"greet": "off", "trans": "off"})
result = did`);
  ok((await py(KB + 'result = mw.col.get_preferences().scheduling.rollover')) === R, 'Preferences → Next day starts at = ' + R + ' giờ');
  await reopen();
  await py(KB + `kb._dialog._dispatch("deck:${did}"); kb._dialog.resize(1280, 820); result = 1`); await sleep(800);
  let v, w, k, r;

  if (R === 0) {
    await noDialog('trước mục');
    console.log('== A0. 30/11 23:50 — ngày Anki = ngày lịch');
    await setTime('2026-11-30 23:50:00');
    await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(600);
    ok((await leToday()) === '2026-11-30', 'le_today 30/11');
    ok(!(await wallet()).owned.le_tulich, 'chưa tặng tủ lịch');
    ok((await rev(1)) === 1, '23:55 ôn 1 thẻ (thuộc ngày 30/11)');
    await noDialog('trước mục');
    console.log('== B0. 1/12 00:00 — để vườn mở qua nửa đêm');
    await setTime('2026-12-01 00:00:20');
    await waitTimer('(() => { const v = Garden._data().le; return v && v.active === true; })()', 'vườn tự dựng lại lúc 00:00 → mùa Giáng sinh');
    w = await wallet();
    ok(w.owned.le_tulich === 1 && w.owned.xmastree === 1, 'tặng tủ lịch + cây thông lúc 00:00');
    ok(await stateOf(1) === 'wait', 'lượt ôn 23:55 thuộc 30/11 → ngăn 1 chờ ôn');
    await noDialog('00:00');
    await setTime('2026-12-01 00:10:00');
    await noDialog('00:10');
    await rev(1);
    await noDialog('00:10 sau khi ôn');
    await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(600);
    await noDialog('00:10 sau khi dựng lại vườn');
    ok(await stateOf(1) === 'ready', '00:10 ôn → ngăn 1 mở được');
    r = await sendLe('le:open:1'); ok(r && r.ok, 'mở ngăn 1');
    k = await leKey(); ok(k.open['1'] && k.open['1'].d === '2026-12-01', 'sổ: ngăn 1 ngày 1/12');

    await noDialog('trước mục');

    console.log('== C0. 20/12 mở bù ngăn 6 (hộp quà 1) + thiệp; 24/12 17:59 → 18:00');
    await setTime('2026-12-20 10:00:00');
    await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(600);
    await rev(15);
    await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(600);
    r = await sendLe('le:open:6'); ok(r && r.ok && r.door && r.door.makeup, 'ôn 15 lượt → mở bù ngăn 6 (hộp quà 1)');
    r = await sendLe('le:card:' + JSON.stringify({ i: 0, rid: 1, card: { f: 'tuyet', st: [{ s: 'xmastree', x: 40, y: 20 }], t1: 'Gửi ông', t2: 'Noel', c: 'vi', w: 'Con muốn đọc báo tiếng Nhật', wl: 'vi' } }));
    ok(r && r.ok, 'lưu thiệp');
    r = await sendLe('le:hang:0'); ok(r && r.ok, 'treo thiệp');
    await setTime('2026-12-24 17:59:15');
    await reopen();
    ok(!(await showOn()), '17:59 chưa có cảnh đêm');
    await waitTimer('(() => { const s = document.getElementById("kb-le-show"); return !!s && !s.hidden; })()', '18:00 → cảnh ông già Noel tự chạy');
    await page.click('#kb-le-show-skip'); await sleep(300);
    ok(await waitFor('!!Garden._data().le.santa.seen', 8000), 'Bỏ qua → khung cuối, sổ ghi "đã xem" (' + ((await leKey()).santa || {}).seen + ')');
    await page.click('#kb-le-show-close'); await sleep(400);
    ok(!(await showOn()), 'bấm Đóng → cảnh đóng');
    await noDialog('trước mục');
    console.log('== D0. 25/12 00:00 — thư lúc nửa đêm');
    await setTime('2026-12-24 23:58:00');
    await reopen();
    ok(!(await letterOn()), '23:58 ngày 24: chưa có thư');
    await setTime('2026-12-25 00:00:20');
    await waitTimer('(() => { const l = document.getElementById("kb-le-letter"); return !!l && !l.hidden; })()', '00:00 ngày 25 → thư tự mở');
    ok(/đọc báo tiếng Nhật/.test(await js('return document.getElementById("kb-le-letter").textContent;')), 'thư nhắc điều ước');
    await page.key('Escape', 'Escape', 27); await sleep(300);
    r = await sendLe('le:box:1'); ok(r && r.ok, '00:01 ngày 25 mở hộp quà 1');
    await noDialog('trước mục');
    console.log('== E0. 1/1 00:00 — cất đồ lúc nửa đêm');
    await rev(1);
    await setTime('2026-12-31 23:58:00');
    await reopen();
    ok(!(await lev()).pack, '23:58 ngày 31/12: chưa cất đồ');
    await setTime('2027-01-01 00:00:20');
    await waitTimer('(() => { const v = Garden._data().le; return !!v && !!v.pack && v.pack.at === "2027-01-01"; })()', '00:00 ngày 1/1 → cất đồ (ghi sổ)');
    await page.key('Escape', 'Escape', 27); await sleep(300);
  } else {
    await noDialog('trước mục');
    console.log('== A23. 1/12 12:00 — giờ đổi ngày 23:00: ngày Anki vẫn là 30/11');
    await setTime('2026-12-01 12:00:00');
    await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(600);
    ok((await leToday()) === '2026-11-30', 'le_today 30/11 (ngày Anki 1/12 bắt đầu lúc 23:00)');
    v = await lev();
    ok(v && v.phase === 'pre' && !(await wallet()).owned.le_tulich, 'chưa mùa, chưa tặng');
    await rev(1);
    await noDialog('trước mục');
    console.log('== B23. 1/12 23:00 — vườn đang mở');
    await setTime('2026-12-01 23:00:20');
    await waitTimer('(() => { const v = Garden._data().le; return v && v.active === true; })()', 'vườn tự dựng lại lúc 23:00 → mùa Giáng sinh');
    w = await wallet();
    ok(w.owned.le_tulich === 1 && w.owned.xmastree === 1, 'tặng tủ lịch + cây thông');
    ok(await stateOf(1) === 'wait', 'lượt ôn trưa 1/12 thuộc ngày Anki 30/11 → ngăn 1 chờ ôn');
    await setTime('2026-12-01 23:10:00');
    await rev(1);
    await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(600);
    r = await sendLe('le:open:1'); ok(r && r.ok, '23:10 ôn → mở ngăn 1');
    await noDialog('trước mục');
    console.log('== C23. 20/12 mở bù ngăn 6 + thiệp; 24/12 18:00 giờ máy = ngày Anki 23');
    await setTime('2026-12-20 10:00:00');
    await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(600);
    ok((await leToday()) === '2026-12-19', '20/12 10:00 = ngày Anki 19/12');
    await rev(15);
    await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(600);
    r = await sendLe('le:open:6'); ok(r && r.ok && r.door && r.door.makeup, 'ôn 15 lượt → mở bù ngăn 6 (hộp quà 1)');
    r = await sendLe('le:card:' + JSON.stringify({ i: 0, rid: 1, card: { f: 'thong', st: [], t1: 'Ông ơi', t2: '', c: 'vi', w: 'Con muốn nói tiếng Nhật', wl: 'vi' } }));
    ok(r && r.ok, 'lưu thiệp');
    r = await sendLe('le:hang:0'); ok(r && r.ok, 'treo thiệp');
    await setTime('2026-12-24 17:59:15');
    await reopen();
    ok((await leToday()) === '2026-12-23', '24/12 17:59 = ngày Anki 23/12');
    await waitTimer('(() => { const s = document.getElementById("kb-le-show"); return !!s && !s.hidden; })()', '18:00 giờ máy (ngày Anki 23) → ông già Noel vẫn ghé');
    await page.click('#kb-le-show-skip'); await sleep(300);
    ok(await waitFor('!!Garden._data().le.santa.seen', 8000), 'Bỏ qua → khung cuối, sổ ghi "đã xem" (' + ((await leKey()).santa || {}).seen + ')');
    await page.click('#kb-le-show-close'); await sleep(400);
    ok(!(await showOn()), 'bấm Đóng → cảnh đóng');
    v = await lev();
    ok(v.santa.came && v.taken === 0 && (await stateOf(24)) !== 'open', 'thiệp được mang đi; ngăn 24 chưa tới ngày (' + (await stateOf(24)) + ')');
    await setTime('2026-12-24 23:05:00');
    await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(900);
    ok((await leToday()) === '2026-12-24', '23:05 = ngày Anki 24');
    ok(!(await showOn()), 'sang ngày Anki 24: cảnh đêm đã xem → không chạy lại');
    await rev(1);
    await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(600);
    r = await sendLe('le:open:24'); ok(r && r.ok, 'ngăn 24 mở được sau khi ông đã ghé (' + (r && (r.msg || 'ok')) + ')');
    await noDialog('trước mục');
    console.log('== D23. 25/12 10:00 (ngày Anki 24) → 23:00');
    await setTime('2026-12-25 10:00:00');
    await reopen();
    ok(!(await letterOn()), '10:00 ngày 25 = ngày Anki 24: chưa có thư');
    r = await sendLe('le:box:1'); ok(r && !r.ok && /25\/12/.test(r.msg || ''), 'hộp quà chưa mở được (chưa tới ngày Anki 25): "' + (r && r.msg) + '"');
    await setTime('2026-12-25 23:00:20');
    await waitTimer('(() => { const l = document.getElementById("kb-le-letter"); return !!l && !l.hidden; })()', '23:00 ngày 25 → thư tự mở');
    ok(/Đêm qua ông ghé/.test(await js('return document.getElementById("kb-le-letter").textContent;')), 'thư "Đêm qua ông ghé…"');
    await page.key('Escape', 'Escape', 27); await sleep(300);
    r = await sendLe('le:box:1'); ok(r && r.ok, '23:01 ngày 25 mở hộp quà 1');
    // đặt tuần lộc ra sân để lần cất đồ có món phải cất
    await py(KB + `d = st.load()
d["home"]["owned"]["le_tuanloc"] = 1
d["home"]["yard"].append({"id": "le_tuanloc", "x": 30, "y": 60})
st.save(d)
result = 1`);
    await noDialog('trước mục');
    console.log('== E23. không mở vườn từ 26/12 tới 1/3/2027');
    await closeGarden();
    await setTime('2027-03-01 10:00:00');
    await reopen();
    v = await lev();
    ok(v && v.phase === 'done', 'data.le "done"');
    k = await leKey();
    ok(k.pack && k.pack.at === '2027-02-28', 'lần mở đầu tiên (1/3 10:00 = ngày Anki 28/2): StackChan cất đồ — sổ ' + JSON.stringify(k.pack && k.pack.at));
    ok(await waitFor('(() => { const p = document.getElementById("kb-le-packpop"); return !!p && !p.hidden; })()', 5000), 'bảng "Cất đồ Noel" hiện một lần');
    w = await wallet();
    ok(!w.yard.some((e) => e.id === 'le_tuanloc') && w.owned.le_tuanloc === 1, 'tuần lộc cất vào kho (vẫn sở hữu)');
    await page.shot(SHOTS + '/gio23_e_0301.png');
    await page.key('Escape', 'Escape', 27); await sleep(300);
    await reopen();
    ok(!(await packOn()), 'mở lại: không cất lần nữa');
  }
  const k0 = await leKey(), w0 = await wallet();
  await farFuture(k0, w0);

  (page.errors || []).forEach((x) => errors.push(x));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  ok(!(elog || []).length, 'nhật ký lỗi trống' + ((elog || []).length ? ': ' + JSON.stringify(elog[0]).slice(0, 400) : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch(async (e) => {
  console.error(e);
  for (let i = 0; i < 70 && !fs.existsSync(STACK); i++) { await sleep(1000); }
  try {
    const st = fs.readFileSync(STACK, 'utf8').split('\n-----\n');
    const busy = st.filter((x) => /kotoba_batake|aqt|anki/.test(x.split('\n').slice(-4).join(' ')));
    console.error('NGĂN XẾP LUỒNG CHÍNH (' + st.length + ' mẫu, ' + busy.length + ' mẫu đang trong Anki / add-on); 3 mẫu cuối đang bận:');
    busy.slice(-3).forEach((x) => console.error(x));
  } catch (err) { console.error('không có mẫu ngăn xếp: ' + err.message); }
  process.exit(2);
});
