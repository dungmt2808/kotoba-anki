// 1.36.3 trong Anki thật — vẽ tay cho Giáng sinh (ngày Anki + giờ máy giả qua kb.LE_TEST, ghi THẬT vào collection; chuột thật qua CDP).
//   A. xưởng thiệp → thẻ ✎ Vẽ: chọn màu, kéo chuột một nét → nét liền trên thiệp, tự lưu vào collection ("d"), đồng hồ "Mã thiệp";
//      cỡ bút 3, tẩy, Hoàn tác (nút + Ctrl+Z), Xoá hình vẽ (hỏi trước); sang thẻ sticker vẫn kéo sticker được (không vẽ nhầm);
//   B. vẽ xong đóng cửa sổ vườn ngay (< 0,5 giây) → collection có nét vừa vẽ;
//   C. Chép mã thiệp → mã có hình vẽ (add-on đọc lại đúng), bạn nhận mã → Album có hình; hình nhiễu kín thiệp → đồng hồ đỏ, chép mã báo
//      "lưu ảnh PNG", Lưu ảnh PNG vẫn được;
//   D. quả châu: tủ lịch → Vẽ quả châu ▸, kéo chuột trên lưới 8 × 8 → tự treo + lưu; cây ngoài sân vẽ quả châu; bỏ treo; quả 2;
//      Esc chỉ đóng bảng; đóng cửa sổ ngay sau khi vẽ → đã lưu; Anki đang đồng bộ → chờ, đồng bộ xong tự lưu; Lưu ảnh PNG;
//   E. tối 24: ông già Noel thấy quả châu (facts "orn") → thư sáng 25 nhắc tới;
//   F. 1/1: Album → Kỷ niệm có quả châu (xem, không vẽ được), cây hết treo; 30/11: chưa có nút Vẽ quả châu;
//   G. không lỗi JS / nhật ký lỗi.
// Chạy: KB_SCRIPTS=e2e_1363.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1363';
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
const CARDS = (n) => `ev = kb.LE.load()
for i in range(${n}):
    le.save_card(ev, i, dict(${JSON.stringify(CARD)}, t1="Thiệp %d" % (i + 1)), datetime.date(2026, 12, 10), datetime.datetime(2026, 12, 10, 9, i))
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
const ESC = () => page.key('Escape', 'Escape', 27);
// chuột thật: nhấn ở a, kéo qua `steps` điểm tới b, thả
async function drag(a, b, steps = 12) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: a[0], y: a[1] });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a[0], y: a[1], button: 'left', buttons: 1, clickCount: 1 });
  for (let k = 1; k <= steps; k++) {
    const x = a[0] + (b[0] - a[0]) * k / steps, y = a[1] + (b[1] - a[1]) * k / steps;
    await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', buttons: 1 });
  }
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: b[0], y: b[1], button: 'left', buttons: 0, clickCount: 1 });
}
// toạ độ màn hình của ô (cx, cy) trên một canvas có W × H ô
async function cellPt(id, W, H, cx, cy) {
  return js(`const r = document.getElementById(${JSON.stringify(id)}).getBoundingClientRect(); return [r.left + (${cx} + 0.5) * r.width / ${W}, r.top + (${cy} + 0.5) * r.height / ${H}];`);
}
const flat = () => js('const d = GardenLeCard._draft(); return d && d.d ? GardenLeCard._px.decode(d.d, 9600) : ".".repeat(9600);');
const row = (f, y, x0, x1) => f.slice(y * 120 + x0, y * 120 + x1 + 1);
const decodePy = (d) => py(KB + `result = le._px_decode(${JSON.stringify(d)}, 9600)`);

(async () => {
  await py(KB + `kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet":"off","trans":"off"})
result = 1`);
  const BASE10 = RESET(7) + TEST('2026-12-10', '2026-12-10T20:00', DAYS(10), 3) + OPENED(9) + CARDS(2);
  let e, f;
  // ======================================================================================================
  console.log('== A. xưởng thiệp → ✎ Vẽ bằng chuột thật');
  await reopen(BASE10);
  await js('GardenLeCard.open(0); return 1;'); await sleep(300);
  ok(await js('return !!document.querySelector("#kb-le-stk-tabs [data-tab=\\"draw\\"]");'), 'xưởng thiệp có thẻ "✎ Vẽ"');
  await page.click('#kb-le-stk-tabs [data-tab="draw"]'); await sleep(200);
  ok(await js('return !document.getElementById("kb-le-drawbox").hidden && document.getElementById("kb-le-stk").hidden && document.getElementById("kb-le-drawpal").childNodes.length === 32;'),
    'thẻ Vẽ: bút / tẩy / cỡ / 32 màu của Xưởng (ô sticker ẩn)');
  await page.click('#kb-le-drawpal [data-ink="y"]'); await sleep(100);
  await drag(await cellPt('kb-le-cardcv', 120, 80, 10, 12), await cellPt('kb-le-cardcv', 120, 80, 100, 12), 6);    // kéo nhanh: 6 điểm cho 90 ô
  await sleep(200);
  f = await flat();
  ok(row(f, 12, 10, 100) === 'y'.repeat(91), 'kéo chuột nhanh một nét ngang → nét liền 91 ô (không đứt quãng)');
  ok(await js('return GardenLeCard._draft().st.length === 2 && GardenLeCard._draft().st[0].x === 6;'), 'vẽ không kéo nhầm sticker');
  await page.shot(SHOTS + '/1363_01_ve_thiep.png');
  ok(await waitFor('/Mã thiệp: [\\d.]+ \\/ 6\\.000 ký tự/.test(document.getElementById("kb-le-dmeter").textContent)', 5000),
    'tự lưu → đồng hồ "' + (await js('return document.getElementById("kb-le-dmeter").textContent;')) + '"');
  e = await ev26();
  ok(e.cards && e.cards[0].d && (await decodePy(e.cards[0].d)) === f && e.cards[1].d === undefined, 'collection: thiệp 1 có hình vẽ đúng từng ô, thiệp 2 không đổi');
  // cỡ 3 + màu khác, rồi tẩy
  await page.click('#kb-le-drawbox [data-pen="3"]'); await page.click('#kb-le-drawpal [data-ink="r"]'); await sleep(100);
  await drag(await cellPt('kb-le-cardcv', 120, 80, 60, 30), await cellPt('kb-le-cardcv', 120, 80, 60, 60), 10); await sleep(150);
  f = await flat();
  ok([59, 60, 61].every((x) => f[45 * 120 + x] === 'r') && f[45 * 120 + 58] === '.' && f[45 * 120 + 62] === '.', 'bút cỡ 3: nét dọc rộng đúng 3 ô');
  await page.click('#kb-le-drawbox [data-tool="eraser"]'); await page.click('#kb-le-drawbox [data-pen="1"]'); await sleep(100);
  await drag(await cellPt('kb-le-cardcv', 120, 80, 40, 12), await cellPt('kb-le-cardcv', 120, 80, 50, 12), 4); await sleep(150);
  f = await flat();
  ok(row(f, 12, 40, 50) === '.'.repeat(11) && row(f, 12, 10, 39) === 'y'.repeat(30), 'tẩy: xoá đúng đoạn 40–50, phần còn lại giữ');
  ok((await js('return GardenLeCard._undoN();')) === 3, 'mỗi nét một bước Hoàn tác (3)');
  await page.click('#kb-le-dundo'); await sleep(150);
  f = await flat();
  ok(row(f, 12, 40, 50) === 'y'.repeat(11), 'Hoàn tác (nút) → đoạn vừa tẩy trở lại');
  await js('document.getElementById("kb-le-cardcv").focus(); return 1;');
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'z', code: 'KeyZ', modifiers: 2, windowsVirtualKeyCode: 90 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'z', code: 'KeyZ', modifiers: 2, windowsVirtualKeyCode: 90 }); await sleep(150);
  f = await flat();
  ok(f[45 * 120 + 60] === '.' && row(f, 12, 10, 100) === 'y'.repeat(91), 'Ctrl+Z trên thiệp → bỏ nét đỏ, nét vàng còn');
  ok(await js('return GardenHome.isOpen() === false && document.getElementById("kb-panel").hidden;'), 'Ctrl+Z / phím trong xưởng không tới màn chính');
  await js('Garden._data().ask_off = false; return 1;');
  await page.click('#kb-le-dclear'); await sleep(200);
  ok(await waitFor('GardenUI.asking && GardenUI.asking()', 2000), 'Xoá hình vẽ → hỏi trước');
  await ESC(); await sleep(200);
  ok(await js('return !!GardenLeCard._draft().d;') && (await alive()), 'Esc ở hộp hỏi: không xoá, cửa sổ vườn còn');
  await page.click('#kb-le-stk-tabs [data-tab="le"]'); await sleep(200);
  const p0 = await cellPt('kb-le-cardcv', 120, 80, 10, 26);
  await drag(p0, [p0[0] + 40, p0[1]], 5); await sleep(150);
  ok(await js('return GardenLeCard._draft().st[0].x > 6;') && (await flat())[26 * 120 + 12] === '.', 'thẻ sticker: kéo chuột dời sticker (không vẽ)');
  await sleep(1500);
  e = await ev26();
  ok((await decodePy(e.cards[0].d)) === (await flat()), 'collection khớp bản trên màn hình');

  // ======================================================================================================
  console.log('== B. vẽ xong đóng cửa sổ vườn ngay');
  await reopen('');
  await js('GardenLeCard.open(1); return 1;'); await sleep(300);
  await page.click('#kb-le-stk-tabs [data-tab="draw"]'); await page.click('#kb-le-drawpal [data-ink="G"]'); await sleep(80);
  await drag(await cellPt('kb-le-cardcv', 120, 80, 5, 70), await cellPt('kb-le-cardcv', 120, 80, 115, 70), 8);
  const fb = await flat();
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(800);
  e = await ev26();
  ok(e.cards[1].d && (await decodePy(e.cards[1].d)) === fb, 'vẽ rồi đóng cửa sổ vườn ngay (< 0,5 giây): thiệp 2 đã lưu nét vừa vẽ');

  // ======================================================================================================
  console.log('== C. mã thiệp có hình vẽ');
  await reopen('');
  await js('GardenLeCard.open(0); return 1;'); await sleep(300);
  await page.click('#kb-le-code'); await sleep(900);
  const code = await js('return document.getElementById("kb-le-codebox").value;');
  const dec = await py(KB + `result = le.decode_card(${JSON.stringify(code)})`);
  e = await ev26();
  ok(code.startsWith('KBC1:') && dec && dec.d === e.cards[0].d && !dec.w, 'Chép mã thiệp: mã ' + code.length + ' ký tự mang đúng hình vẽ (không mang điều ước)');
  await js('GardenLeCard.close(); return 1;');
  await reopen(TEST('2026-12-26', '2026-12-26T10:00', DAYS(24), 3));
  const r1 = await sendLe('le:recv:' + code);
  ok(r1 && r1.ok && (await js('return Garden._data().le.recv.length === 1;')), 'bạn nhận mã (26/12) → giữ vào Album');
  await reopen(TEST('2026-12-10', '2026-12-10T20:00', DAYS(10), 3) + `ev = kb.LE.load()
R = random.Random(1)
cells = "".join(R.choice(le.DRAW_CHARS) for _ in range(9600))
le.save_card(ev, 2, dict(${JSON.stringify(CARD)}, t1="Thiệp nhiễu", d=le._px_encode(cells)), datetime.date(2026, 12, 10), datetime.datetime(2026, 12, 10, 10))
kb.LE.save(ev)
`);
  await js('GardenLeCard.open(2); return 1;'); await sleep(300);
  await page.click('#kb-le-stk-tabs [data-tab="draw"]'); await page.click('#kb-le-drawpal [data-ink="k"]'); await sleep(80);
  await drag(await cellPt('kb-le-cardcv', 120, 80, 2, 2), await cellPt('kb-le-cardcv', 120, 80, 3, 2), 1);
  ok(await waitFor('document.getElementById("kb-le-dmeter").classList.contains("is-bad")', 5000), 'hình nhiễu kín thiệp: đồng hồ mã đỏ "' + (await js('return document.getElementById("kb-le-dmeter").textContent;')) + '"');
  await page.click('#kb-le-code'); await sleep(900);
  const nt = await js('return document.getElementById("kb-le-cnote").textContent;');
  ok(/PNG/.test(nt) && (await js('return document.getElementById("kb-le-codebox").hidden || !document.getElementById("kb-le-codebox").value.startsWith("KBC1:");')),
    'Chép mã thiệp → báo "' + nt + '" (không đưa mã hỏng)');
  const png = '/tmp/kb_1363_thiep.png';
  await py(KB + `os.environ["KB_TEST_PHOTO"] = ${JSON.stringify(png)}\ntry:\n    os.remove(${JSON.stringify(png)})\nexcept OSError:\n    pass\nresult = 1`);
  await page.click('#kb-le-png'); await sleep(1200);
  const pinfo = await py(KB + `import struct\nb = open(${JSON.stringify(png)}, "rb").read() if os.path.exists(${JSON.stringify(png)}) else b""\nresult = [len(b), struct.unpack(">II", b[16:24]) if len(b) > 24 else None]`);
  ok(pinfo[0] > 1000 && pinfo[1][0] === 480 && pinfo[1][1] === 320, 'thiệp đó vẫn Lưu ảnh PNG được (480 × 320, ' + pinfo[0] + ' byte)');
  await js('GardenLeCard.close(); return 1;');

  // ======================================================================================================
  console.log('== D. quả châu tự vẽ');
  await reopen(BASE10);
  await js('GardenLe.open(); return 1;'); await sleep(400);
  ok(await js('return !!document.getElementById("kb-le-to-orn");'), 'tủ lịch có nút "Vẽ quả châu ▸"');
  await page.click('#kb-le-to-orn'); await sleep(400);
  ok(await js('return GardenLeOrn.isOpen() && !GardenLe.isOpen() && GardenLeOrn._slot() === 0 && document.getElementById("kb-le-orn-pal").childNodes.length === 32;'),
    'bảng quả châu mở (tủ lịch đóng), quả 1, 32 màu');
  await page.click('#kb-le-orn-pal [data-ink="r"]');
  await drag(await cellPt('kb-le-orn-grid', 8, 8, 0, 3), await cellPt('kb-le-orn-grid', 8, 8, 7, 3), 2);      // kéo nhanh: nhảy cóc ô
  await drag(await cellPt('kb-le-orn-grid', 8, 8, 3, 0), await cellPt('kb-le-orn-grid', 8, 8, 3, 7), 3);
  const cur = await js('return GardenLeOrn._cur();');
  ok(cur && cur.p.slice(24, 32) === 'rrrrrrrr' && [0, 1, 2, 4, 5, 6, 7].every((j) => cur.p[j * 8 + 3] === 'r') && cur.on === 1,
    'kéo chuột nhanh: hàng 4 + cột 4 liền nét; quả mới vẽ tự treo lên cây');
  await sleep(1500);
  e = await ev26();
  ok(e.orn && e.orn[0] && e.orn[0].p === cur.p && e.orn[0].on === 1, 'collection: quả châu 1 đã lưu, đang treo');
  await page.shot(SHOTS + '/1363_02_qua_chau.png');
  // cây ngoài sân vẽ quả châu
  await js('GardenLeOrn.close(); window.__ornN = 0; const f0 = GardenLeOrn.paintOrn; GardenLeOrn.paintOrn = function () { window.__ornN++; return f0.apply(this, arguments); }; window.__ornF = f0; return 1;');
  await js('if (Garden.redraw) { Garden.redraw(); } return 1;'); await sleep(1500);
  const nOrn = await js('return window.__ornN;');
  await js('GardenLeOrn.paintOrn = window.__ornF; return 1;');
  ok(nOrn > 0, 'cây thông ngoài sân vẽ quả châu đang treo (' + nOrn + ' lần trong 1,5 giây)');
  await page.shot(SHOTS + '/1363_03_cay_ngoai_san.png');
  // bỏ treo, quả 2
  await js('GardenLeOrn.open(0); return 1;'); await sleep(300);
  await page.click('#kb-le-orn-hang'); await sleep(1500);
  e = await ev26();
  ok(e.orn[0].on === 0 && (await js('return GardenLeOrn.hung().length === 0;')), 'bỏ treo → collection on = 0, cây không còn quả');
  await page.click('#kb-le-orn-slots [data-orn="1"]'); await sleep(200);
  await page.click('#kb-le-orn-pal [data-ink="U"]');
  await drag(await cellPt('kb-le-orn-grid', 8, 8, 1, 1), await cellPt('kb-le-orn-grid', 8, 8, 6, 6), 5);
  const cur2 = await js('return GardenLeOrn._cur();');
  // Esc: chỉ đóng bảng (cửa sổ vườn còn, Esc không tới Python) — đóng thì lưu ngay
  await py(KB + 'kb._esc_n = 0\nresult = 1');
  await ESC(); await sleep(900);
  ok(!(await js('return GardenLeOrn.isOpen();')) && (await alive()) && (await py(KB + 'result = kb._esc_n')) === 0, 'Esc → đóng bảng quả châu, cửa sổ vườn còn');
  e = await ev26();
  ok(e.orn[1] && e.orn[1].p === cur2.p && e.orn[1].on === 1 && e.orn[0].on === 0, 'quả 2 đường chéo đã lưu + treo; quả 1 vẫn không treo');
  // đóng cửa sổ ngay sau khi vẽ
  await js('GardenLeOrn.open(2); return 1;'); await sleep(300);
  await page.click('#kb-le-orn-pal [data-ink="G"]');
  await drag(await cellPt('kb-le-orn-grid', 8, 8, 0, 7), await cellPt('kb-le-orn-grid', 8, 8, 7, 7), 3);
  const cur3 = await js('return GardenLeOrn._cur();');
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(800);
  e = await ev26();
  ok(e.orn[2] && e.orn[2].p === cur3.p, 'vẽ quả 3 rồi đóng cửa sổ vườn ngay: đã lưu');
  // Anki đang đồng bộ
  await reopen('');
  await js('GardenLeOrn.open(2); return 1;'); await sleep(300);
  await py(KB + 'kb._sync_running = True; result = 1');
  await page.click('#kb-le-orn-pal [data-ink="k"]');
  await drag(await cellPt('kb-le-orn-grid', 8, 8, 0, 0), await cellPt('kb-le-orn-grid', 8, 8, 7, 0), 3);
  const cur4 = await js('return GardenLeOrn._cur();');
  await sleep(1500);
  e = await ev26();
  ok(e.orn[2].p === cur3.p && Object.keys(await js('return GardenLeOrn._pend();')).indexOf('2') >= 0 && /đồng bộ/.test(await js('return document.getElementById("kb-le-orn-note").textContent;')),
    'Anki đang đồng bộ: chưa ghi, bảng báo một câu, bản vẽ còn chờ');
  await py(KB + 'kb._sync_running = False\nkb._dialog.refresh()\nresult = 1'); await sleep(1800);
  e = await ev26();
  ok(e.orn[2].p === cur4.p && !Object.keys(await js('return GardenLeOrn._pend();')).length, 'đồng bộ xong → tự lưu nét vừa vẽ');
  const png2 = '/tmp/kb_1363_orn.png';
  await py(KB + `os.environ["KB_TEST_PHOTO"] = ${JSON.stringify(png2)}\ntry:\n    os.remove(${JSON.stringify(png2)})\nexcept OSError:\n    pass\nresult = 1`);
  await page.click('#kb-le-orn-png'); await sleep(1200);
  const pinfo2 = await py(KB + `b = open(${JSON.stringify(png2)}, "rb").read() if os.path.exists(${JSON.stringify(png2)}) else b""\nresult = [len(b), b[:4] == b"\\x89PNG"]`);
  ok(pinfo2[0] > 200 && pinfo2[1], 'Lưu ảnh PNG quả châu (' + pinfo2[0] + ' byte)');
  await js('GardenLeOrn.close(); return 1;');

  // ======================================================================================================
  console.log('== E. ông già Noel thấy quả châu');
  await reopen(TEST('2026-12-24', '2026-12-24T19:00', DAYS(24), 3) + OPENED(24) + `ev = kb.LE.load()
le.save_orn(ev, 0, "..kkkk.." * 2 + ".kUUUUk." * 4 + "..kkkk.." * 2, 1, datetime.date(2026, 12, 24), datetime.datetime(2026, 12, 24, 17))
kb.LE.save(ev)
`);
  const placedTree = await py(KB + 'result = kb._le_placed(st.load()).get("xmastree", 0)');
  ok(await waitFor('GardenLeNoel.isShowing()', 6000), 'tối 24 mở vườn → cảnh ông già Noel tự chạy');
  ok(await js('const p = GardenLeNoel._plan ? GardenLeNoel._plan() : null; return !p || p.tree !== undefined;'), 'cảnh có cây thông');
  await page.click('#kb-le-show-skip'); await sleep(800);
  await page.shot(SHOTS + '/1363_04_dem_24.png');
  await js('GardenLeNoel.closeShow(); return 1;'); await sleep(600);
  e = await ev26();
  const fx = ((e.santa || {}).facts || '');
  ok(e.santa && e.santa.seen && (placedTree === 0 ? fx.indexOf('orn') < 0 : fx.split(',').indexOf('orn') >= 0),
    'tối 24: ông ghé, sổ chụp những gì ông thấy: "' + fx + '" (cây trên sân: ' + placedTree + ')');
  await reopen(TEST('2026-12-25', '2026-12-25T08:00', DAYS(24), 3));
  await sleep(1500);
  const lt = await js('const v = Garden._data().le; return v && v.letter ? JSON.stringify(v.letter) : "";');
  ok(fx.split(',').indexOf('orn') < 0 ? !/Quả châu cháu tự vẽ/.test(lt) : /Quả châu cháu tự vẽ/.test(lt), 'thư sáng 25 ' + (/Quả châu/.test(lt) ? 'nhắc quả châu tự vẽ' : 'không nhắc (ông không thấy)'));

  // ======================================================================================================
  console.log('== F. sau mùa / trước mùa');
  await reopen(TEST('2027-01-02', '2027-01-02T10:00', DAYS(24), 3));
  await sleep(1500);
  await js('const p = document.getElementById("kb-le-packpop"); if (p) { p.hidden = true; } return 1;');
  ok(await js('return GardenLeNoel.hasAlbum() && GardenLeOrn.hung().length >= 0;'), 'từ 1/1 còn Album → Kỷ niệm');
  const mem = await js('const box = document.createElement("div"); document.body.appendChild(box); GardenLeNoel.album(box); const n = box.querySelectorAll(".kb-le-mem-orn").length; box.remove(); return n;');
  const v1 = await js('const v = Garden._data().le; return [v.orn_edit, (v.orn || []).filter(Boolean).length];');
  ok(!v1[0] && v1[1] >= 2, '1/1: quả châu giữ trong sổ (' + v1[1] + ' quả), không vẽ được nữa' + (mem ? ', Kỷ niệm có ' + mem + ' ô quả châu' : ''));
  await reopen(RESET(7) + TEST('2026-11-30', '2026-11-30T20:00', [], 3));
  await js('if (GardenLe.open) { GardenLe.open(); } return 1;'); await sleep(300);
  ok(!(await js('return !!document.getElementById("kb-le-to-orn") && !document.getElementById("kb-le-to-orn").hidden;')), '30/11: chưa có nút Vẽ quả châu');
  await js('if (GardenLe.close) { GardenLe.close(); } return 1;');

  // ======================================================================================================
  (page.errors || []).forEach((x) => errors.push(x));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  const bad = (elog || []).filter((x) => /le|sự kiện|Giáng|thiệp|quả châu/.test(JSON.stringify(x)));
  ok(!bad.length, 'nhật ký lỗi không có lỗi của sự kiện' + (bad.length ? ': ' + JSON.stringify(bad[0]).slice(0, 300) : ''));
  await py(KB + 'kb.LE_TEST = None\nkb._sync_running = False\nresult = 1');
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
