// 1.36.4 — kiểm tra ngoài bộ test có sẵn: Anki thật với ĐỒNG HỒ MÁY GIẢ (libfaketime, chạy bằng run_dongho.sh), múi giờ Việt Nam,
// KHÔNG dùng kb.LE_TEST — ngày Anki (giờ đổi ngày 4:00), revlog, giờ máy Python + JS đều là đồng hồ thật của Anki. Đi hết mùa:
//   A. 30/11 21:00: chưa mùa, không tặng; JS + Python cùng thấy giờ giả;
//   B. 1/12 00:30 (ngày Anki vẫn 30/11): không tặng; ôn 1 thẻ lúc 01:00 → tính cho 30/11, không mở ngăn 1;
//   C. 1/12 04:00 — để vườn mở qua giờ đổi ngày: đồng hồ 60 giây của vườn tự dựng lại → tặng tủ lịch + cây thông, ngăn 1 chờ ôn;
//   D. 1/12 09:00 ôn trong bảng ôn của vườn → ngăn 1 mở được → bấm chuột thật vào ngăn;
//   E. bỏ 2/12; 3/12 02:30 (ngày Anki 2/12, "cú đêm") ôn 1 thẻ → ngăn 2 mở được bình thường (không phải mở bù);
//   F. 6/12: lỡ 3–5, ôn 30 lượt → ngăn 6 + mở bù 2 ngăn; ngăn thứ 3 bị từ chối; 7/12 03:00 (ngày Anki 6/12) vẫn từ chối;
//      7/12 04:10 ôn 15 lượt → mở bù được;
//   G. 20/12 làm thiệp + treo; 24/12 17:59 vườn đang mở → qua 18:00 vườn tự dựng lại → cảnh ông già Noel, thiệp khoá;
//   H. 25/12 00:40 (ngày Anki 24): hộp quà chưa mở được, chưa có thư; 25/12 04:05 vườn tự dựng lại → thư tự mở, mở hộp quà;
//   I. 1/1 01:00 (ngày Anki 31/12): chưa cất đồ; 1/1 04:02 vườn tự dựng lại → StackChan cất đồ Noel một lần;
//   J. đồng hồ máy lùi về 20/12 (người dùng chỉnh sai giờ): không lỗi, sổ không mất gì;
//   không lỗi JS, nhật ký lỗi không có lỗi của sự kiện.
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_dongho';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const FT = process.env.KB_FT_FILE || '/tmp/kb_dongho_time.txt';
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
async function setTime(s) {          // "2026-12-01 04:00:30" (giờ Việt Nam) — ghi file rồi đổi tên (libfaketime không đọc nửa file)
  for (let k = 0; k < 8; k++) {
    fs.writeFileSync(FT + '.tmp', '@' + s + '\n'); fs.renameSync(FT + '.tmp', FT);
    await sleep(1300);
    const now = await py(KB + 'result = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")');
    if (now === s.slice(0, 16)) { return; }
  }
  throw new Error('đồng hồ giả chưa đổi: ' + s);
}
async function reopen() {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  await py(KB + 'kb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data() && Garden._data().le !== undefined', 8000);
  await sleep(500);
}
const REV = (n, rating) => `col = mw.col
n = 0
for _ in range(${n}):
    q = col.sched.get_queued_cards(fetch_limit=1)
    if not q.cards:
        break
    top = q.cards[0]
    card = col.get_card(top.card.id); card.start_timer()
    col.sched.answer_card(col.sched.build_answer(card=card, states=top.states, rating=${rating || 1}))
    n += 1
result = n`;
const rev = (n, rating) => py(KB + REV(n, rating));
const lev = () => js('return Garden._data().le;');
const leKey = () => py(KB + 'result = (mw.col.get_config("kotoba_batake_le", None) or {}).get("noel2026")');
const wallet = () => py(KB + 'd = st.load(); result = {"owned": d["home"]["owned"], "yard": d["home"]["yard"], "room": d["home"]["room"]}');
async function sendLe(cmd) {
  await js('window.__lastLe = null; const f = Garden.le; Garden.le = function (r) { window.__lastLe = r; f(r); Garden.le = f; }; return 1;');
  await js('pycmd(' + JSON.stringify(cmd) + '); return 1;');
  await waitFor('!!window.__lastLe', 6000);
  return js('return window.__lastLe;');
}
async function clickDoor(d) {
  const pt = await js(`const cv = document.getElementById("kb-le-cab"); if (!cv || document.getElementById("kb-le-pop").hidden) return null;
    const c = GardenLe._cell(${d}), S = GardenLe._S(), r = cv.getBoundingClientRect();
    return [r.left + (c.x + c.w / 2) * S, r.top + (c.y + c.h / 2) * S];`);
  if (!pt) { return false; }
  for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x: pt[0], y: pt[1], button: 'left', clickCount: 1 });
  return true;
}
// chờ đồng hồ 60 giây của vườn (GardenDialog._day_timer) tự dựng lại — không gọi tay
async function waitTimer(expr, label) {
  const t0 = Date.now();
  const got = await waitFor(expr, 80000);
  ok(got, label + (got ? ' (sau ' + Math.round((Date.now() - t0) / 1000) + ' giây)' : ' — quá 80 giây'));
  return got;
}
const stateOf = async (d) => (await lev()).doors[d - 1].state;

(async () => {
  console.log('== A. 30/11 21:00 (giờ Việt Nam), chưa mùa');
  await setTime('2026-11-30 21:00:00');
  const did = await py(KB + `col = mw.col
did = col.decks.id("Đồng hồ thật")
m = col.models.by_name("Basic") or col.models.current()
for i in range(400):
    n = col.new_note(m); n.fields[0] = "dh %d" % i; n.fields[1] = "nghĩa %d" % i; col.add_note(n, did)
conf = col.decks.config_dict_for_deck_id(did); conf["new"]["perDay"] = 9999; conf["rev"]["perDay"] = 9999; col.decks.save(conf)
col.decks.select(did)
d = st.load(); d["coins"] = 5000; d["home"]["house"] = 7; d["home"]["owned"] = {}
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
st.save(d)
kb.save_config(show_tooltips=False, sound=False, music=False, season_event=True, ui={"greet": "off", "trans": "off"})
result = did`);
  await reopen();
  await py(KB + `kb._dialog._dispatch("deck:${did}"); kb._dialog.resize(1280, 820); result = 1`); await sleep(800);
  const t = await js('const d = new Date(); return [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours()];');
  ok(t.join() === '2026,11,30,21', 'trang (JS Date) cũng thấy giờ giả: ' + t.join('-'));
  const info = await py(KB + 'result = [kb.le_today().isoformat(), int(mw.col.sched.today), mw.col.get_config("rollover", None)]');
  ok(info[0] === '2026-11-30', 'ngày Anki 30/11 (giờ đổi ngày: ' + info[2] + ')');
  let v = await lev();
  ok(v && v.phase === 'pre', 'data.le pre: ' + (v && v.phase));
  ok(!(await wallet()).owned.le_tulich && (await leKey()) == null, 'chưa tặng, chưa ghi sổ');

  console.log('== B. 1/12 00:30 — ngày Anki vẫn là 30/11');
  await setTime('2026-12-01 00:30:00');
  await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(800);
  ok((await py(KB + 'result = kb.le_today().isoformat()')) === '2026-11-30', 'le_today = 30/11 (trước 4:00)');
  ok(!(await wallet()).owned.le_tulich, '00:30 không tặng tủ lịch');
  await setTime('2026-12-01 01:00:00');
  ok((await rev(1)) === 1, '01:00 ôn 1 thẻ (lượt ôn thuộc ngày Anki 30/11)');

  console.log('== C. 1/12 04:00 — để vườn mở qua giờ đổi ngày');
  await setTime('2026-12-01 04:00:20');
  await waitTimer('(() => { const v = Garden._data().le; return v && v.active === true; })()', 'vườn tự dựng lại khi sang ngày Anki 1/12');
  let w = await wallet();
  ok(w.owned.le_tulich === 1 && w.room.some((e) => e.id === 'le_tulich'), 'tặng tủ lịch, treo tường phòng khách (không cần đóng / mở vườn)');
  ok(w.owned.xmastree === 1 && w.yard.some((e) => e.id === 'xmastree'), 'tặng cây thông ra sân');
  ok(await stateOf(1) === 'wait', 'lượt ôn 01:00 thuộc ngày 30/11 → ngăn 1 chờ ôn (' + await stateOf(1) + ')');
  await page.shot(SHOTS + '/dongho_01_ngay1_0400.png');

  console.log('== D. 1/12 09:00 — ôn trong bảng ôn của vườn, bấm ngăn 1');
  await setTime('2026-12-01 09:00:00');
  const r0 = await py(KB + 'result = mw.col.db.scalar("select count() from revlog")');
  await py(KB + 'd = kb._dialog\nd._dispatch("rv:start")\nresult = 1'); await sleep(800);
  await py(KB + 'kb._dialog._dispatch("rv:show:")\nresult = 1'); await sleep(500);
  await py(KB + 'kb._dialog._dispatch("rv:ans:3")\nresult = 1');
  let r1 = 0;      // chấm thẻ chạy nền (CollectionOp) — chờ revlog
  for (let i = 0; i < 40 && r1 < 1; i++) { await sleep(250); r1 = (await py(KB + 'result = mw.col.db.scalar("select count() from revlog")')) - r0; }
  await py(KB + 'kb._dialog._dispatch("rv:stop")\nresult = 1'); await sleep(500);
  ok(r1 === 1, 'ôn 1 thẻ trong bảng ôn (revlog +' + r1 + ')');
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(800);
  ok(await stateOf(1) === 'ready', 'ngăn 1 mở được');
  await page.click('#kb-le-chip');
  ok(await waitFor('!document.getElementById("kb-le-pop").hidden', 3000), 'bấm chip → bảng tủ lịch');
  ok(await clickDoor(1), 'bấm chuột vào ngăn 1');
  await waitFor('Garden._data().le.opened === 1', 5000);
  let k = await leKey();
  ok(k && k.open && k.open['1'] && k.open['1'].d === '2026-12-01' && k.open['1'].b === 0, 'sổ: ngăn 1 mở ngày 1/12 ' + JSON.stringify(k && k.open));
  await page.key('Escape', 'Escape', 27); await sleep(300);

  console.log('== E. bỏ 2/12; 3/12 02:30 (ngày Anki 2/12) ôn 1 thẻ');
  await setTime('2026-12-03 02:30:00');
  await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(800);
  ok((await py(KB + 'result = kb.le_today().isoformat()')) === '2026-12-02', '02:30 ngày 3/12 = ngày Anki 2/12');
  ok(await stateOf(2) === 'wait', 'chưa ôn: ngăn 2 chờ ôn');
  await rev(1);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(600);
  ok(await stateOf(2) === 'ready', 'ôn lúc 02:30 → ngăn 2 mở được (không phải mở bù)');
  let r = await sendLe('le:open:2');
  ok(r && r.ok && r.door && !r.door.makeup, 'mở ngăn 2 (không tính mở bù)');
  await setTime('2026-12-03 10:00:00');
  await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(800);
  ok(await stateOf(3) === 'wait' && await stateOf(2) === 'open', '3/12 10:00: ngăn 3 chờ ôn, ngăn 2 đã mở');

  console.log('== F. lỡ 3–5/12; 6/12 ôn 30 lượt → mở bù 2 ngăn');
  await setTime('2026-12-06 10:00:00');
  await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(800);
  v = await lev();
  ok([3, 4, 5].every((d) => v.doors[d - 1].state === 'miss') && v.doors[5].state === 'wait', 'ngăn 3–5 lỡ, ngăn 6 chờ ôn');
  await rev(10);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(600);
  v = await lev();
  ok(v.makeup.left === 0 && v.makeup.next === 5 && v.makeup.reviews === 10, '10 lượt: chưa mở bù, còn 5 lượt (' + JSON.stringify(v.makeup) + ')');
  r = await sendLe('le:open:3');
  ok(r && !r.ok && /ôn thêm 5 lượt/.test(r.msg || ''), 'mở bù sớm → "' + (r && r.msg) + '"');
  await rev(20);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(600);
  v = await lev();
  ok(v.makeup.left === 2 && v.makeup.reviews === 30, '30 lượt: mở bù được 2 ngăn');
  r = await sendLe('le:open:6'); ok(r && r.ok, 'mở ngăn 6 (hôm nay)');
  r = await sendLe('le:open:3'); ok(r && r.ok && r.door.makeup, 'mở bù ngăn 3');
  r = await sendLe('le:open:4'); ok(r && r.ok && r.door.makeup, 'mở bù ngăn 4');
  r = await sendLe('le:open:5'); ok(r && !r.ok && /đủ 2 ngăn/.test(r.msg || ''), 'ngăn bù thứ 3 → "' + (r && r.msg) + '"');
  await setTime('2026-12-07 03:00:00');
  await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(600);
  await rev(15);
  r = await sendLe('le:open:5');
  ok(r && !r.ok, '7/12 03:00 (ngày Anki 6/12) vẫn từ chối: "' + (r && r.msg) + '"');
  await setTime('2026-12-07 04:10:00');
  await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(800);
  await rev(15);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(600);
  r = await sendLe('le:open:5'); ok(r && r.ok && r.door.makeup, '7/12 04:10 ôn 15 lượt → mở bù ngăn 5');
  k = await leKey();
  ok(k.bu && k.bu['2026-12-06'] === 2 && k.bu['2026-12-07'] === 1, 'sổ mở bù theo ngày Anki: ' + JSON.stringify(k.bu));

  console.log('== G. 20/12 làm thiệp + treo; 24/12 17:59 → 18:00 vườn đang mở');
  await setTime('2026-12-20 10:00:00');
  await py(KB + 'kb._dialog._check_day(); result = 1'); await sleep(800);
  r = await sendLe('le:card:' + JSON.stringify({ i: 0, rid: 1, card: { f: 'tuyet', st: [{ s: 'xmastree', x: 40, y: 20 }], t1: 'Gửi ông', t2: 'Noel', c: 'vi', w: 'Con muốn học giỏi tiếng Nhật', wl: 'vi' } }));
  ok(r && r.ok, 'lưu thiệp 1');
  r = await sendLe('le:hang:0'); ok(r && r.ok, 'treo thiệp 1 lên cây');
  await setTime('2026-12-24 17:59:15');
  await reopen();
  v = await lev();
  ok(!v.santa.came && v.hang_edit, '17:59: ông chưa ghé, còn đổi thiệp được');
  ok(await js('const s = document.getElementById("kb-le-show"); return !s || s.hidden;'), '17:59: chưa có cảnh đêm');
  await waitTimer('(() => { const s = document.getElementById("kb-le-show"); return !!s && !s.hidden; })()', 'qua 18:00 → vườn tự dựng lại, cảnh ông già Noel tự chạy');
  v = await lev();
  ok(v.santa.came && v.taken === 0 && !v.hang_edit, 'thiệp đang treo được mang đi, khoá');
  await page.shot(SHOTS + '/dongho_02_2400.png');
  await page.click('#kb-le-show-skip'); await sleep(300);
  await waitFor('!!Garden._data().le.santa.seen', 5000);
  r = await sendLe('le:hang:-1');
  ok(r && !r.ok && /ghé rồi/.test(r.msg || ''), '18:01 gỡ thiệp → "' + (r && r.msg) + '"');
  k = await leKey();
  ok(k.santa && /^2026-12-24T18:0/.test(k.santa.seen || ''), 'sổ: ông ghé ' + (k.santa && k.santa.seen));
  await page.key('Escape', 'Escape', 27); await sleep(300);

  console.log('== H. 25/12 00:40 (ngày Anki 24) → 04:05');
  await setTime('2026-12-25 00:40:00');
  await reopen();
  v = await lev();
  ok(v.today === '2026-12-24' && !v.letter, '00:40: ngày Anki 24, chưa có thư');
  ok(await js('const s = document.getElementById("kb-le-show"); return !s || s.hidden;'), 'cảnh đêm đã xem rồi → không tự chạy lại');
  r = await sendLe('le:box:1');
  ok(r && !r.ok && /25\/12/.test(r.msg || ''), 'hộp quà 1 chưa mở được: "' + (r && r.msg) + '"');
  await setTime('2026-12-25 04:05:00');
  await waitTimer('(() => { const l = document.getElementById("kb-le-letter"); return !!l && !l.hidden; })()', '04:05 → vườn tự dựng lại, thư của ông già Noel tự mở');
  const lt = await js('return document.getElementById("kb-le-letter").textContent;');
  ok(/Con muốn học giỏi tiếng Nhật/.test(lt), 'thư nhắc điều ước trên thiệp đã treo');
  await page.shot(SHOTS + '/dongho_03_2504.png');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  r = await sendLe('le:box:1'); ok(r && r.ok, '25/12 04:05 mở hộp quà 1');
  w = await wallet();
  ok(w.owned.le_cautuyet === 1, 'quả cầu tuyết vào Kho đồ');

  console.log('== I. 1/1 01:00 (ngày Anki 31/12) → 04:02 cất đồ');
  await rev(1);
  await setTime('2027-01-01 01:00:00');
  await reopen();
  v = await lev();
  ok(v.today === '2026-12-31' && v.active && !v.pack, '01:00: ngày Anki 31/12, chưa cất đồ');
  const before = await leKey();
  await setTime('2027-01-01 04:02:00');
  // (người này chưa có món phải cất — tuần lộc / bánh — nên không có bảng cất đồ: 1.36.2 không bật bảng trống; sổ vẫn ghi đã cất)
  await waitTimer('(() => { const v = Garden._data().le; return !!v && !!v.pack && v.pack.at === "2027-01-01"; })()', '04:02 → vườn tự dựng lại, StackChan cất đồ Noel (ghi sổ)');
  k = await leKey();
  ok(k.pack && k.pack.at === '2027-01-01', 'sổ: đã cất ngày 1/1');
  ok(await js('const p = document.getElementById("kb-le-packpop"); return !p || p.hidden;'), 'không có món phải cất → không bật bảng cất đồ trống');
  ok(Object.keys(before.open).every((d) => k.open[d] && k.open[d].d === before.open[d].d), 'ngăn đã mở còn nguyên (' + Object.keys(k.open).length + ')');
  await page.shot(SHOTS + '/dongho_04_0101.png');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  await setTime('2027-01-01 10:00:00');
  await reopen();
  ok(await js('const p = document.getElementById("kb-le-packpop"); return !p || p.hidden;'), 'mở lại: không cất lần nữa');

  console.log('== J. đồng hồ máy lùi về 20/12 (chỉnh sai giờ)');
  const k1 = await leKey(), w1 = await wallet();
  await setTime('2026-12-20 10:00:00');
  await reopen();
  v = await lev();
  ok(!!v, 'vườn mở được (data.le ' + (v && v.phase) + ')');
  const k2 = await leKey(), w2 = await wallet();
  ok(JSON.stringify(k2.open) === JSON.stringify(k1.open) && JSON.stringify(k2.pack) === JSON.stringify(k1.pack) && JSON.stringify(k2.santa) === JSON.stringify(k1.santa),
    'sổ không đổi (ngăn, cất đồ, ông già Noel)');
  ok(JSON.stringify(w2.owned) === JSON.stringify(w1.owned), 'kho đồ không đổi (không tặng lại / không cất lại)');
  await setTime('2027-01-02 10:00:00');
  await reopen();
  ok(!!(await lev()), 'chỉnh lại giờ đúng (2/1): vườn mở bình thường');

  (page.errors || []).forEach((x) => errors.push(x));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  ok(!(elog || []).length, 'nhật ký lỗi trống' + ((elog || []).length ? ': ' + JSON.stringify(elog[0]).slice(0, 400) : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
