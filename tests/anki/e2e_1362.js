// 1.36.2 trong Anki thật — sửa lỗi nhánh audit/release-review-1.36.1-2026-11-24 (ngày Anki + giờ máy giả qua kb.LE_TEST, ghi
// THẬT vào collection).
//   A. #02 Esc Esc thật nhanh (phím thật qua CDP, GardenDialog._on_esc thật): xưởng thiệp (bỏ chọn → đóng), tủ lịch có thẻ kết quả,
//      cảnh đêm 24 (Bỏ qua → Đóng), hộp hỏi "Xoá thiệp?" — cửa sổ vườn còn, 3 lần mỗi kiểu;
//   B. #05 gõ lời chúc rồi đóng cửa sổ vườn ngay (< 0,8 giây) → collection có chữ vừa gõ; #06 mũi tên dời sticker không đổi cảnh,
//      N / R trong xưởng thiệp / cảnh đêm không mở bảng khác; #08 thông báo nổi trên xưởng thiệp;
//   C. #04 Anki đang đồng bộ (_sync_running): sửa thiệp 1 → sang thiệp 2 → đồng bộ xong (refresh) → thiệp 1 lưu đúng chữ; "Nhờ Gemini
//      sửa" không kẹt; mở ngăn → báo một câu, ngăn vẫn "ready", bấm lại được sau đồng bộ;
//   D. #01 thiệp nhận: giữ → xoá → giữ lại bằng cùng mã qua cầu nối → mở lại vườn vẫn có;
//   E. #07 Trang trí thử dán tường Noel → sổ nhớ mẫu cũ (1/1 trả lại đúng); #17f mẫu cũ đã xoá → sổ ghi "theo kiểu nhà";
//      #17a 1/1 chỉ có quà mở mùa → không bật bảng cất đồ trống (sổ vẫn ghi đã cất);
//   F. #11 vườn mở lúc 17:59 ngày 24 → qua 18:00 (_check_day) → cảnh ông già Noel tự chạy, thiệp đang treo khoá;
//   G. #12 từ 1/1 chỉ có thiệp nhận → vẫn có Kỷ niệm; #14 xem thử + nhập .colpkg (collection_did_load) → hết xem thử;
//   H. #10a bảng ⚙ đang mở → mở tủ lịch lần đầu (bảng tạo muộn) → ⚙ đóng; không lỗi JS / nhật ký lỗi.
// Chạy: KB_SCRIPTS=e2e_1362.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1362';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLeCard !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = `import sys, os, json, time, datetime, random
kb = sys.modules["kotoba_batake"]
st = kb.STATE
le = kb.le_core
`;
const DAYS = (n) => Array.from({ length: n }, (_, i) => '2026-12-' + String(i + 1).padStart(2, '0'));
const TEST = (today, now, days, reviews) => `kb.LE_TEST = {"today": "${today}", "now": "${now}", "days": ${JSON.stringify(days || [])}, "reviews": ${reviews || 0}}\n`;
async function reopen(before) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  // đếm số lần Anki báo Esc tới Python (pycmd("close") → GardenDialog._on_esc)
  await py(KB + (before || '') + '\nkb.open_garden()\nd = kb._dialog\nkb._esc_n = 0\n_o = d._on_esc\ndef _c():\n    kb._esc_n += 1\n    _o()\nd.web.onEsc = _c\nresult = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data() && Garden._data().le !== undefined', 8000);
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  await sleep(700);
}
const alive = () => py(KB + 'result = bool(kb._dialog) and kb._dialog.isVisible()');
const RESET = (house) => `mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
d = st.load(); d["coins"] = 5000; d["home"]["house"] = ${house}; d["home"]["style"] = "classic"; d["home"]["zones"] = []; d["home"]["owned"] = {}
d["home"]["rooms"] = []
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
d["more"]["decor"] = {"own": [], "use": {"room": {}, "kitchen": {}, "bedroom": {}}, "mine": {"items": {}, "next": 1}}
st.save(d)
kb.save_config(season_event=True)
kb._le_preview.update(day=None, ev=None, now=None, pack=False)
kb._sync_running = False
`;
const OPENED = (n) => `ev = kb.LE.load()
give = {}
for dd in range(1, ${n} + 1):
    ev["open"][str(dd)] = {"d": "2026-12-%02d" % dd, "b": 0}
    for k, c in (le.DOORS[dd].get("item") or {}).items():
        if le.DOORS[dd]["kind"] != "qua":
            give[k] = give.get(k, 0) + c
ev["gift"] = {"tulich": "2026-12-01", "tree": "2026-12-01"}
give["le_tulich"] = 1; give["xmastree"] = 1
tiles = le.expected_tiles(ev)
st.le_apply(give, ["le_tulich", "xmastree"] + le.auto_list(give), tiles, extra=[kb.LE.write(ev)])
`;
const CARD = { f: 'den', st: [{ s: 'xmastree', x: 6, y: 22 }, { s: 'presents', x: 30, y: 50 }], t1: 'Giáng sinh an lành!', t2: '', c: 'ja', w: 'サンタさん、ありがとう', wl: 'ja' };
const CARDS = (n, hang) => `ev = kb.LE.load()
for i in range(${n}):
    le.save_card(ev, i, dict(${JSON.stringify(CARD)}, t1="Thiệp %d" % (i + 1)), datetime.date(2026, 12, 10), datetime.datetime(2026, 12, 10, 9, i))
${hang !== undefined ? `le.hang_card(ev, ${hang}, datetime.date(2026, 12, 10), datetime.datetime(2026, 12, 10, 9, 30))` : ''}
kb.LE.save(ev)
`;
const leKey = () => py(KB + 'result = mw.col.get_config("kotoba_batake_le", None)');
const ev26 = async () => ((await leKey()) || {}).noel2026 || {};
async function sendLe(cmd) {
  await js('window.__lastLe = null; const f = Garden.le; Garden.le = function (r) { window.__lastLe = r; f(r); Garden.le = f; }; return 1;');
  await js('pycmd(' + JSON.stringify(cmd) + '); return 1;');
  await waitFor('!!window.__lastLe', 5000);
  return js('return window.__lastLe;');
}
async function selectAllType(sel, text) {
  await page.click(sel); await sleep(100);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await page.type(text); await sleep(50);
}
const ESC = () => page.key('Escape', 'Escape', 27);
// KB_FROM=C: chạy từ phần C (đối chứng trên bản cũ — phần trước làm hỏng trang của bản cũ)
const FROM = process.env.KB_FROM || 'A';
const ONLY = process.env.KB_ONLY || '';
const part = (k) => (ONLY ? k === ONLY : k >= FROM);
let e = null, code = '';
// hai lần Esc gửi liền một mạch (không chờ lần đầu xử lý xong) — như bấm thật nhanh: Python hỏi trang sau cả hai
const ESC2 = () => Promise.all(['keyDown', 'keyUp', 'keyDown', 'keyUp'].map((type) => page.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 })));

(async () => {
  await py(KB + `kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet":"off","trans":"off"})
result = 1`);
  const BASE10 = RESET(7) + TEST('2026-12-10', '2026-12-10T20:00', DAYS(10), 3) + OPENED(9) + CARDS(2);
  if (part('A')) {
    // ======================================================================================================
    console.log('== A. Esc Esc thật nhanh (audit #02 — đếm số lần Anki báo Esc tới Python)');
    await reopen(BASE10);
    const kinds = [
      ['xưởng thiệp: bỏ chọn sticker → đóng xưởng', async () => { await js('GardenLeCard.open(0); GardenLeCard._sel(0); document.getElementById("kb-le-cardcv").focus(); return 1;'); await sleep(200); },
        'GardenLeCard.isOpen()'],
      ['tủ lịch có thẻ kết quả: đóng thẻ → đóng tủ', async () => { await js('GardenLe.open(); return 1;'); await sleep(200); await sendLe('le:open:10'); await sleep(300); },
        'GardenLe.isOpen()'],
      ['hộp hỏi "Xoá thiệp?": Huỷ → đóng xưởng', async () => {
        await js('Garden._data().ask_off = false; GardenLeCard.open(1); return 1;'); await sleep(200);
        await page.click('#kb-le-cdel'); await waitFor('GardenUI.asking && GardenUI.asking()', 2000);
      }, 'GardenLeCard.isOpen() || (GardenUI.asking && GardenUI.asking())']
    ];
    for (const [name, setup, still] of kinds) {
      let n = 0, closed = 0;
      const escN = [];
      for (let i = 0; i < 3; i++) {
        await setup();
        if (process.env.KB_DIAG) { console.log('    trước Esc: ' + JSON.stringify(await js('const c = document.getElementById("kb-le-card"); return [GardenLe.isOpen(), !!(c && !c.hidden), (window.__lastLe || {}).ok, (window.__lastLe || {}).msg || "", document.activeElement && document.activeElement.id];'))); }
        await py(KB + 'kb._esc_n = 0\nresult = 1');
        await ESC2();
        await sleep(1500);
        escN.push(await py(KB + 'result = getattr(kb, "_esc_n", -1)'));
        if (await alive()) { n++; } else { await reopen(''); continue; }
        if (!(await js('return ' + still + ';'))) { closed++; }
        // ngăn 10 vừa mở: gỡ thẳng trong collection (LE.save gộp theo hợp — ngăn đã mở không gỡ được bằng đường thường)
        await py(KB + 'raw = mw.col.get_config("kotoba_batake_le")\nraw["noel2026"]["open"].pop("10", None)\nkb.backup_core.put_config(mw.col, "kotoba_batake_le", raw)\nresult = 1');
      }
      ok(n === 3 && closed === 3 && escN.every((x) => x === 0), name + ': cửa sổ vườn còn ' + n + '/3, hai lớp đã đóng ' + closed + '/3, Esc tới Python mỗi lần: ' + escN.join(', '));
    }
    await reopen(RESET(7) + TEST('2026-12-24', '2026-12-24T19:00', DAYS(24), 3) + OPENED(24) + CARDS(1, 0) +
      'ev = kb.LE.load(); ev["santa"] = {"seen": "2026-12-24T18:30:00", "facts": "star"}; kb.LE.save(ev)\n');
    let nShow = 0, shut = 0;
    for (let i = 0; i < 3; i++) {
      await js('GardenLeNoel.play("replay"); return 1;'); await sleep(400);
      const on = await js('return GardenLeNoel.isShowing();');
      await py(KB + 'kb._esc_n = 0\nresult = 1');
      await ESC2(); await sleep(1500);
      if ((await py(KB + 'result = kb._esc_n')) !== 0) { shut = -9; }
      if (await alive()) { nShow++; } else { await reopen(''); continue; }
      if (on && !(await js('return GardenLeNoel.isShowing();'))) { shut++; }
    }
    ok(nShow === 3 && shut === 3, 'cảnh đêm 24: Bỏ qua → Đóng: cửa sổ vườn còn ' + nShow + '/3, cảnh đã đóng ' + shut + '/3, Esc không tới Python');
    // #06: phím trong cảnh đêm không tới màn chính
    await js('GardenLeNoel.play("replay"); return 1;'); await sleep(400);
    await page.key('r', 'KeyR', 82); await page.key('n', 'KeyN', 78); await sleep(800);
    ok(await js('return document.getElementById("kb-panel").hidden && !GardenHome.isOpen() && GardenLeNoel.isShowing();'),
      'R / N trong cảnh đêm 24: không mở bảng ôn / Nhà sau lưng cảnh (audit #06)');
    await js('GardenLeNoel.closeShow(); return 1;'); await sleep(300);
    // sau đó một Esc ở màn chính vẫn đóng cửa sổ vườn như thiết kế (không có lượt "đã dùng" thừa giữ cửa sổ lại)
    await py(KB + 'kb._esc_n = 0\nresult = 1');
    await Promise.race([ESC().catch(() => {}), sleep(1500)]); await sleep(1200);
    ok(!(await alive()) && (await py(KB + 'result = kb._esc_n')) === 1, 'rồi Esc ở màn chính: tới Python một lần → đóng cửa sổ vườn như thiết kế');
    page = null;
  }
  if (part('B')) {
    // ======================================================================================================
    console.log('== B. đóng cửa sổ ngay sau khi gõ, phím tắt, thông báo (audit #05, #06, #08)');
    await reopen(BASE10);
    await js('GardenLeCard.open(0); return 1;'); await sleep(300);
    await selectAllType('#kb-le-t1', 'Gõ xong đóng ngay');
    await py(KB + 'kb._dialog.close(); result = 1');
    await sleep(800);
    e = await ev26();
    ok(e.cards && e.cards[0] && e.cards[0].t1 === 'Gõ xong đóng ngay', 'gõ lời chúc rồi đóng cửa sổ vườn ngay (< 0,8 giây): đã lưu "' + (e.cards && e.cards[0] && e.cards[0].t1) + '" (1.36.1: có thể mất)');
    await reopen('');
    ok(await js('return Garden._data().le.cards[0].t1 === "Gõ xong đóng ngay";'), 'mở lại vườn: thiệp có chữ vừa gõ');
    // mũi tên dời sticker không đổi cảnh phía sau
    const yn0 = await js('return (document.getElementById("kb-yard-name") || {}).textContent || "";');
    await js('GardenLeCard.open(0); GardenLeCard._sel(0); document.getElementById("kb-le-cardcv").focus(); return 1;'); await sleep(200);
    const x0 = await js('return GardenLeCard._draft().st[0].x;');
    for (let i = 0; i < 3; i++) { await page.key('ArrowRight', 'ArrowRight', 39); await sleep(80); }
    const yn1 = await js('return (document.getElementById("kb-yard-name") || {}).textContent || "";');
    const x1 = await js('return GardenLeCard._draft().st[0].x;');
    ok(x1 === x0 + 3 && yn1 === yn0, 'mũi tên → dời sticker ' + x0 + ' → ' + x1 + ', cảnh phía sau không đổi ("' + yn0 + '" → "' + yn1 + '")');
    await page.key('n', 'KeyN', 78); await sleep(500);
    ok(await js('return GardenLeCard.isOpen() && !GardenHome.isOpen();'), 'N trong xưởng thiệp: không đóng xưởng để mở Nhà');
    await js('if (GardenHome.isOpen()) { GardenHome.close(); } if (!GardenLeCard.isOpen()) { GardenLeCard.open(0); } return 1;'); await sleep(300);
    await py(KB + 'kb._dialog.resize(1024, 680); result = 1'); await sleep(700);      // cửa sổ thấp: xưởng thiệp kéo sát đáy
    await js('Garden.toast("Đã lưu ảnh thiệp: thiep.png", null, 5000); return 1;'); await sleep(400);
    const top = await js(`const t = document.getElementById("kb-toast"), r = t.getBoundingClientRect(), p = document.getElementById("kb-le-cardpop").getBoundingClientRect();
    const a = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return [!t.hidden && (a === t || t.contains(a)), r.top < p.bottom && r.bottom > p.top];`);
    ok(top[0] && top[1], 'cửa sổ 1024 × 680: thông báo nổi chồng lên xưởng thiệp (' + top[1] + ') và nằm trên (1.36.1: bị che)');
    await page.shot(SHOTS + '/1362_01_toast_tren_xuong.png');
    await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(500);
    await ESC(); await sleep(200); await ESC(); await sleep(400);
  }
  if (part('C')) {
    // ======================================================================================================
    console.log('== C. Anki đang đồng bộ (audit #04)');
    await reopen(BASE10);
    await js('GardenLeCard.open(0); return 1;'); await sleep(300);
    await py(KB + 'kb._sync_running = True; result = 1');
    await selectAllType('#kb-le-t1', 'Sửa lúc đồng bộ');
    await page.click('[data-slot="1"]'); await sleep(600);
    ok(await js('return GardenLeCard._slot() === 1 && typeof GardenLeCard._pend === "function" && Object.keys(GardenLeCard._pend()).indexOf("0") >= 0;'), 'lưu thiệp 1 bị bỏ (đang đồng bộ) → sang thiệp 2: bản thiệp 1 còn chờ');
    e = await ev26();
    ok(e.cards[0].t1 === 'Thiệp 1', 'đang đồng bộ: collection chưa ghi (' + e.cards[0].t1 + ')');
    // Gemini: lệnh bị bỏ → nút không kẹt
    await page.click('[data-side="back"]'); await sleep(200);
    await js('document.getElementById("kb-le-fix").disabled = false; document.getElementById("kb-le-fix").click(); return 1;'); await sleep(800);
    ok(await js('return document.getElementById("kb-le-fix").textContent === "Nhờ Gemini sửa";'), '"Nhờ Gemini sửa" lúc đồng bộ → nút không kẹt "Gemini đang sửa…"');
    await page.click('[data-side="front"]'); await sleep(100);
    await js('GardenLeCard.close(); GardenLe.open(); return 1;'); await sleep(300);
    const r10 = await sendLe('le:open:10');
    ok(r10 && !r10.ok && r10.sync && /đồng bộ/.test(await js('return document.getElementById("kb-le-note").textContent;')),
      'mở ngăn 10 lúc đồng bộ → trả lời "chưa làm", bảng báo một câu');
    await sleep(600);
    ok(await js('return Garden._data().le.doors[9].state === "ready";'), 'ngăn 10 vẫn "ready" (không vẽ như đã mở)');
    await py(KB + 'kb._sync_running = False\nkb._dialog.refresh()\nresult = 1');
    await sleep(1500);
    e = await ev26();
    ok(e.cards[0].t1 === 'Sửa lúc đồng bộ' && e.cards[1].t1 === 'Thiệp 2', 'đồng bộ xong → thiệp 1 tự lưu đúng chữ đã sửa, thiệp 2 không đổi (1.36.1: mất)');
    const r10b = await sendLe('le:open:10');
    ok(r10b && r10b.ok, 'đồng bộ xong: mở ngăn 10 được ngay');
    // gõ rồi đóng cửa sổ vườn ngay giữa lúc đồng bộ → đồng bộ xong mới lưu nốt (đúng hồ sơ)
    await js('GardenLe.close(); GardenLeCard.open(1); return 1;'); await sleep(300);
    await py(KB + 'kb._sync_running = True; result = 1');
    await selectAllType('#kb-le-t1', 'Đóng lúc đồng bộ');
    await py(KB + 'kb._dialog.close(); result = 1'); await sleep(600);
    e = await ev26();
    ok(e.cards[1].t1 === 'Thiệp 2', 'đóng cửa sổ giữa lúc đồng bộ: chưa ghi gì vào collection (đợi so xong)');
    await py(KB + 'kb._sync_running = False\nkb._sync_flush()\nresult = 1'); await sleep(500);
    e = await ev26();
    ok(e.cards[1].t1 === 'Đóng lúc đồng bộ', 'đồng bộ xong → lưu nốt thiệp 2 vừa gõ: "' + e.cards[1].t1 + '"');
  }
  if (part('D')) {
    // ======================================================================================================
    console.log('== D. thiệp nhận: giữ → xoá → giữ lại (audit #01)');
    await reopen(RESET(7) + TEST('2026-12-26', '2026-12-26T10:00', DAYS(24), 3) + OPENED(24));
    code = await py(KB + `result = le.card_code(${JSON.stringify(CARD)})`);
    let r = await sendLe('le:recv:' + code);
    ok(r && r.ok, 'giữ thiệp của bạn vào Album');
    r = await sendLe('le:rdel:' + code);
    ok(r && r.ok && !(await js('return Garden._data().le.recv.length;')), 'xoá');
    r = await sendLe('le:recv:' + code);
    ok(r && r.ok && (await js('return Garden._data().le.recv.length;')) === 1, 'dán lại đúng mã → Giữ vào Album: có thiệp');
    await reopen('');
    ok((await js('return Garden._data().le.recv.length;')) === 1, 'mở lại vườn (đọc từ collection): thiệp vẫn còn (1.36.1: mất ngay lúc lưu)');
  }
  if (part('E')) {
    // ======================================================================================================
    console.log('== E. Trang trí thử + tường Noel, cất đồ (audit #07, #17f, #17a)');
    await reopen(RESET(7) + TEST('2026-12-10', '2026-12-10T20:00', DAYS(10), 3) + OPENED(9) + `d = st.load()
d["more"]["decor"]["own"] = sorted(set(d["more"]["decor"]["own"]) | {"w_sakura"})
d["more"]["decor"]["use"]["room"] = {"wall": "w_sakura"}
st.save(d)
`);
    await js('pycmd("home:draft:use:" + JSON.stringify({ scene: "room", slot: 0, draft: { items: [], decor: { wall: "w_noeltuyet" } } })); return 1;');
    await sleep(1500);
    e = await ev26();
    const use = await py(KB + 'result = st.load()["more"]["decor"]["use"]["room"]');
    ok(use.wall === 'w_noeltuyet' && (e.prev || {})['room:wall'] === 'w_sakura', 'Trang trí thử dán tường Noel → sổ nhớ mẫu cũ: ' + JSON.stringify(e.prev) + ' (1.36.1: không nhớ)');
    await reopen(TEST('2027-01-01', '2027-01-01T10:00', DAYS(24), 3));
    await sleep(1500);
    const use2 = await py(KB + 'result = st.load()["more"]["decor"]["use"]["room"]');
    ok(use2.wall === 'w_sakura', '1/1 cất đồ: tường về đúng mẫu cũ (Cánh anh đào): ' + JSON.stringify(use2));
    // mẫu cũ là mẫu tự vẽ đã xoá
    await reopen(RESET(7) + TEST('2026-12-10', '2026-12-10T20:00', DAYS(10), 3) + OPENED(9) + `d = st.load()
d["more"]["decor"]["use"]["room"] = {"wall": "w_noeltuyet"}
st.save(d)
ev = kb.LE.load(); ev["prev"] = {"room:wall": "w9"}; kb.LE.save(ev)
`);
    await reopen(TEST('2027-01-01', '2027-01-01T10:00', DAYS(24), 3));
    await sleep(1200);
    e = await ev26();
    const t0 = ((e.pack || {}).tiles || [])[0];
    ok(t0 && t0[2] === 'w_noeltuyet' && t0[3] === '', 'mẫu cũ (tự vẽ) đã xoá → sổ cất đồ ghi "theo kiểu nhà": ' + JSON.stringify(t0));
    ok(!/mẫu dùng trước đó/.test(await js('const p = document.getElementById("kb-le-packpop"); return p ? p.textContent : "";')), 'bảng cất đồ không ghi "về mẫu dùng trước đó"');
    await js('const p = document.getElementById("kb-le-packpop"); if (p) { p.hidden = true; } return 1;');
    // 1/1 chỉ có quà mở mùa
    await reopen(RESET(7) + `ev = kb.LE.load(); ev["gift"] = {"tulich": "2026-12-01"}; kb.LE.save(ev)
d = st.load(); d["home"]["owned"]["le_tulich"] = 1; st.save(d)
` + TEST('2027-01-01', '2027-01-01T10:00', [], 3));
    await sleep(3000);
    e = await ev26();
    ok(e.pack && e.pack.at === '2027-01-01' && !(await js('const p = document.getElementById("kb-le-packpop"); return !!(p && !p.hidden);')),
      '1/1 chỉ có quà mở mùa: sổ ghi đã cất, không bật bảng danh sách trống');
  }
  if (part('F')) {
    // ======================================================================================================
    console.log('== F. vườn để mở qua 18:00 ngày 24 (audit #11)');
    await reopen(RESET(7) + TEST('2026-12-24', '2026-12-24T17:59', DAYS(24), 3) + OPENED(23) + CARDS(1, 0));
    ok(await js('return Garden._data().le.hang === 0 && Garden._data().le.taken === -1 && !GardenLeNoel.isShowing();'), '17:59: thiệp đang treo, chưa có cảnh');
    await py(KB + TEST('2026-12-24', '2026-12-24T18:01', DAYS(24), 3) + 'kb._dialog._check_day()\nresult = 1');
    ok(await waitFor('GardenLeNoel.isShowing()', 6000), 'qua 18:00 (vườn vẫn mở) → cảnh ông già Noel tự chạy (1.36.1: phải đóng / mở lại vườn)');
    ok(await js('return Garden._data().le.taken === 0 && Garden._data().le.eaten === true;'), 'thiệp đang treo đã được mang đi (khoá), bánh quy còn vụn');
    await page.shot(SHOTS + '/1362_02_qua_18h.png');
    await js('GardenLeNoel.closeShow(); return 1;');
    await py(KB + 'kb._dialog._check_day()\nresult = 1'); await sleep(1500);
    ok(!(await js('return GardenLeNoel.isShowing();')), 'lần kiểm tra sau không chạy lại');
  }
  if (part('G')) {
    // ======================================================================================================
    console.log('== G. Kỷ niệm từ 1/1, xem thử khi nhập collection (audit #12, #14)');
    await reopen(RESET(7) + `ev = kb.LE.load(); le.recv_add(ev, ${JSON.stringify(code)}, datetime.date(2026, 12, 20), datetime.datetime(2026, 12, 20, 9)); kb.LE.save(ev)
` + TEST('2027-01-02', '2027-01-02T10:00', [], 3));
    ok(await js('return !!Garden._data().le && Garden._data().le.recv.length === 1 && GardenLeNoel.hasAlbum();'), '1/1: chỉ có thiệp nhận (chưa mở ngăn nào) → vẫn có Album → Kỷ niệm (1.36.1: ẩn)');
    await py(KB + 'open(kb.ADMIN_FILE, "w").write("1")\nkb.LE_TEST = None\nresult = 1');
    await js('pycmd("le:preview:2026-12-25"); return 1;'); await sleep(1200);
    ok(await py(KB + 'result = kb._le_preview.get("day") is not None'), 'admin bật xem thử 25/12');
    await py(KB + 'kb._on_collection_load()\nresult = 1'); await sleep(1500);
    ok(await py(KB + 'result = kb._le_preview.get("day") is None'), 'File → Import .colpkg (collection_did_load) → hết xem thử (không mang thiệp của collection cũ)');
    await py(KB + 'os.remove(kb.ADMIN_FILE)\nresult = 1');
  }
  if (part('H')) {
    // ======================================================================================================
    console.log('== H. bảng tạo muộn mở lần đầu đóng bảng ⚙ (audit #10a)');
    await reopen(RESET(7) + TEST('2026-12-10', '2026-12-10T20:00', DAYS(10), 3) + OPENED(9));
    await page.click('#kb-sound'); await sleep(400);
    const sOpen = await js('return !document.getElementById("kb-sound-pop").hidden;');
    ok(sOpen && !(await js('return !!document.getElementById("kb-le-pop");')), 'bảng ⚙ đang mở, tủ lịch chưa từng mở (chưa có bảng)');
    await js('GardenLe.open(); return 1;'); await sleep(500);
    ok(await js('return GardenLe.isOpen() && document.getElementById("kb-sound-pop").hidden;'), 'mở tủ lịch lần đầu → bảng ⚙ đóng (1.36.1: hai bảng chồng nhau)');
    await js('GardenLe.close(); return 1;');
  }
  (page.errors || []).forEach((x) => errors.push(x));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  const bad = (elog || []).filter((x) => /le|sự kiện|Giáng|thiệp/.test(JSON.stringify(x)));
  ok(!bad.length, 'nhật ký lỗi không có lỗi của sự kiện' + (bad.length ? ': ' + JSON.stringify(bad[0]).slice(0, 300) : ''));
  await py(KB + 'kb.LE_TEST = None\nkb._sync_running = False\nresult = 1');
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
