// 1.36.1 trong Anki thật — thiệp Giáng sinh + điều ước, ông già Noel (đêm 24, thư sáng 25), cất đồ 1/1, Kỷ niệm ở Album.
// Ngày Anki giả + giờ máy giả qua kb.LE_TEST (ghi THẬT vào collection như người dùng ở ngày đó). Gemini giả (không gọi mạng).
//   A. 10/12 20:00: tủ lịch → "Làm thiệp điều ước ▸" → Làm thiệp mới; gõ lời chúc bằng bàn phím, đổi khung, thêm sticker tủ lịch,
//      kéo sticker bằng chuột thật, câu chúc tiếng Nhật; mặt sau: điều ước tiếng Nhật, "Nhờ Gemini sửa" (giả) → "Dùng bản sửa";
//      tự lưu (khoá kotoba_batake_le); treo lên cây; Lưu ảnh PNG (480 × 320); Chép mã (bộ nhớ tạm của Qt); thiệp 2, xoá thiệp 3
//      (hộp hỏi); Esc từng lớp (rời ô nhập → bỏ chọn sticker → đóng bảng, cửa sổ vườn vẫn mở); lệnh giả bị từ chối;
//   B. Album → Kỷ niệm: dán mã thiệp của bạn → xem trước → Giữ vào Album; mã sai → báo; chép lại mã;
//   C. 24/12 17:00 nhắc treo thiệp (Hôm nay); 18:30 mở vườn → cảnh đêm tự chạy (trời đêm tạm thời), Bỏ qua → khung cuối, "le:seen";
//      mở lại không chạy lại; thiệp đã treo khoá; bánh quy còn vụn;
//   D. 25/12 9:00 mở vườn → thư tự mở (trích điều ước), đọc rồi không mở lại; "Xem lại đêm qua"; hộp quà mở được;
//   E. 1/1/2027: cất đồ (tuần lộc đèn, bánh → Kho; tường Noel → mẫu cũ đã nhớ) một lần; tắt Sự kiện mùa thì chưa cất, bật lại mới cất;
//   F. admin xem thử 24/12 tối / 25/12 / 1/1: cảnh, thư, cất đồ — collection không đổi; không lỗi JS / nhật ký lỗi.
// Chạy: KB_SCRIPTS=e2e_1361.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1361';
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
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data() && Garden._data().le !== undefined', 8000);
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  await sleep(700);
}
const RESET = (house) => `mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
d = st.load(); d["coins"] = 5000; d["home"]["house"] = ${house}; d["home"]["style"] = "classic"; d["home"]["zones"] = []; d["home"]["owned"] = {}
d["home"]["rooms"] = []
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
d["more"]["decor"] = {"own": [], "use": {"room": {}, "kitchen": {}, "bedroom": {}}, "mine": {"items": {}, "next": 1}}
st.save(d)
kb.save_config(season_event=True)
kb._le_preview.update(day=None, ev=None, now=None, pack=False)
`;
// mở sẵn ngăn 1..n (như người dùng đã mở) + quà tương ứng bày ra
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
const leKey = () => py(KB + 'result = mw.col.get_config("kotoba_batake_le", None)');
const ev26 = async () => ((await leKey()) || {}).noel2026 || {};
const wallet = () => py(KB + 'd = st.load(); result = {"owned": d["home"]["owned"], "yard": d["home"]["yard"], "room": d["home"]["room"], "decor": d["more"]["decor"]}');
const lev = () => js('return Garden._data().le;');
async function sendLe(cmd) {
  await js('window.__lastLe = null; const f = Garden.le; Garden.le = function (r) { window.__lastLe = r; f(r); Garden.le = f; }; return 1;');
  await js('pycmd(' + JSON.stringify(cmd) + '); return 1;');
  await waitFor('!!window.__lastLe', 5000);
  return js('return window.__lastLe;');
}
async function mouse(x, y, type) { await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); }
async function selectAllType(sel, text) {
  await page.click(sel); await sleep(100);
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'a', code: 'KeyA', modifiers: 2, windowsVirtualKeyCode: 65 });
  await page.type(text); await sleep(100);
}
const FAKE_GEMINI = KB + `
def fake(client, models, goc, lang, level, hints):
    kb._fake_calls.append({"lang": lang, "goc": goc})
    return {"raw": {"sua": goc.replace("なりたい", "なりたいです").rstrip("。") + "。", "loi": [{"goc": "なりたい", "sua": "なりたいです", "loai": "ngữ pháp", "quy_tac": "thể lịch sự", "giai_thich": "Viết cho người lớn tuổi thì dùng thể lịch sự です."}],
            "con_lai": "", "tu_nhien": "", "nhan_xet": "Điều ước dễ thương, dùng đúng 上手."}, "model": "gemini-flash-lite-latest"}
kb._fake_calls = []
kb.journal.run_fix = fake
kb.ai.Gemini.models = lambda self: [{"name": "models/gemini-flash-lite-latest", "supportedGenerationMethods": ["generateContent"]}]
kb.save_config(gemini_key="AIzaSyTEST_" + "x" * 28)
result = 1`;

(async () => {
  await py(KB + `kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet":"off","trans":"off"})
result = 1`);
  // ======================================================================================================
  console.log('== A. 10/12 — xưởng thiệp');
  await reopen(RESET(7) + TEST('2026-12-10', '2026-12-10T20:00', DAYS(10), 3) + OPENED(10) + 'st.place("room", "le_banhkem", 2, 2) if False else None\n');
  let v = await lev();
  ok(v && v.cards && v.cards.every((c) => c === null) && v.card_edit && v.hang_edit && v.hang === -1, 'data.le có phần thiệp: 3 ô trống, sửa / treo được');
  await page.click('#kb-le-chip'); await waitFor('!document.getElementById("kb-le-pop").hidden', 3000);
  ok(await waitFor('!!document.getElementById("kb-le-to-card")', 2000) && /Làm thiệp điều ước/.test(await js('return document.getElementById("kb-le-to-card").textContent;')),
    'bảng tủ lịch có nút "Làm thiệp điều ước ▸"');
  await page.click('#kb-le-to-card');
  ok(await waitFor('!document.getElementById("kb-le-cardpop").hidden && document.getElementById("kb-le-pop").hidden', 3000), 'mở xưởng thiệp (đóng bảng tủ lịch)');
  ok(await js('return !document.getElementById("kb-le-cempty").hidden;'), 'ô 1 trống → "Ô này chưa có thiệp"');
  await page.click('#kb-le-cnew');
  ok(await waitFor('!!GardenLeCard._draft() && document.getElementById("kb-le-cempty").hidden', 2000), 'Làm thiệp mới → thiệp có sẵn cây thông, quà, StackChan');
  await sleep(1500);
  let e = await ev26();
  ok(e.cards && e.cards[0] && e.cards[0].f === 'den' && e.cards[0].st.length === 3, 'tự lưu: khoá kotoba_batake_le có thiệp 1 (' + JSON.stringify(e.cards && e.cards[0] && e.cards[0].st.map((s) => s.s)) + ')');
  await selectAllType('#kb-le-t1', 'Chúc mừng Giáng sinh!');
  await selectAllType('#kb-le-t2', '— Lan gửi Hoa');
  await page.click('[data-frame="qua"]');
  if (!(await js('return GardenLeCard._draft().c === "ja";'))) { await page.click('[data-chuc="ja"]'); }
  await page.click('[data-tab="le"]'); await sleep(200);
  const stk = await js('return Array.from(document.querySelectorAll("#kb-le-stk [data-stk]")).map((b) => b.getAttribute("data-stk"));');
  ok(stk.indexOf('le_tat') >= 0 && stk.indexOf('le_caynho') >= 0 && stk.indexOf('le_nguoituyet') < 0, 'sticker tủ lịch = món đã mở (tất, cây nhỏ; chưa có người tuyết): ' + stk.join(','));
  await page.click('[data-stk="le_tat"]'); await sleep(200);
  let dr = await js('return GardenLeCard._draft();');
  const k = dr.st.length - 1, s0 = dr.st[k];
  ok(s0.s === 'le_tat' && dr.f === 'qua' && dr.c === 'ja' && dr.t1 === 'Chúc mừng Giáng sinh!', 'gõ lời chúc, đổi khung Giấy quà, câu chúc tiếng Nhật, thêm sticker tất');
  // kéo sticker bằng chuột thật
  const pt = await js(`const cv = document.getElementById("kb-le-cardcv"), r = cv.getBoundingClientRect(), s = GardenLeCard._draft().st[${k}], sz = GardenLeCard._stickerSize(s);
    const k2 = r.width / 120; return [r.left + (s.x + sz[0] / 2) * k2, r.top + (s.y + sz[1] / 2) * k2, k2];`);
  await mouse(pt[0], pt[1], 'mousePressed');
  for (let i = 1; i <= 6; i++) { await mouse(pt[0] - i * 6 * pt[2], pt[1] - i * 3 * pt[2], 'mouseMoved'); await sleep(30); }
  await mouse(pt[0] - 36 * pt[2], pt[1] - 18 * pt[2], 'mouseReleased'); await sleep(200);
  dr = await js('return GardenLeCard._draft();');
  ok(Math.abs(dr.st[k].x - (s0.x - 36)) <= 1 && Math.abs(dr.st[k].y - (s0.y - 18)) <= 1, 'kéo sticker bằng chuột: (' + s0.x + ',' + s0.y + ') → (' + dr.st[k].x + ',' + dr.st[k].y + ')');
  ok(await js('return !document.getElementById("kb-le-selbar").hidden;'), 'sticker đang chọn → thanh Lật / To – nhỏ / Bỏ');
  await page.click('[data-sel="flip"]'); await sleep(100);
  ok((await js('return GardenLeCard._draft();')).st[k].m === 1, 'Lật sticker');
  await page.shot(SHOTS + '/1361_01_xuong_thiep.png');
  // Esc từng lớp: đang chọn sticker → bỏ chọn
  await page.key('Escape', 'Escape', 27); await sleep(200);
  ok(await js('return document.getElementById("kb-le-selbar").hidden && !document.getElementById("kb-le-cardpop").hidden;'), 'Esc lần 1: bỏ chọn sticker, bảng vẫn mở');
  // mặt sau: điều ước + Gemini sửa (giả)
  await py(FAKE_GEMINI);
  await page.click('[data-side="back"]');
  await js('const s = document.getElementById("kb-le-wl"); s.value = "ja"; s.dispatchEvent(new Event("change")); return 1;');
  await selectAllType('#kb-le-wish', 'サンタさん、来年は日本語が上手になりたい');
  ok(await js('return !document.getElementById("kb-le-fix").hidden && !document.getElementById("kb-le-fix").disabled;'), 'điều ước tiếng Nhật → nút "Nhờ Gemini sửa"');
  await page.key('Escape', 'Escape', 27); await sleep(200);
  ok(await js('return document.activeElement.id !== "kb-le-wish" && !document.getElementById("kb-le-cardpop").hidden;'), 'Esc trong ô điều ước: rời ô, bảng vẫn mở');
  await page.click('#kb-le-fix');
  ok(await waitFor('!!document.querySelector("#kb-le-fixres .kb-le-fixsua")', 8000), 'Gemini (giả) sửa xong → hiện bản sửa + lỗi' + (await js('return " [" + document.getElementById("kb-le-cnote").textContent + "]";')));
  const fx = await js('return document.getElementById("kb-le-fixres").textContent;');
  ok(/なりたいです。/.test(fx) && /lịch sự/.test(fx), 'bản sửa: ' + fx.slice(0, 80));
  ok((await py(KB + 'result = len(kb._fake_calls)')) === 1, 'gọi Gemini đúng 1 lần');
  await page.shot(SHOTS + '/1361_02_dieu_uoc.png');
  await js('Array.from(document.querySelectorAll("#kb-le-fixres button")).find((b) => /Dùng bản sửa/.test(b.textContent)).click(); return 1;');
  await sleep(1500);
  e = await ev26();
  const c0 = e.cards[0];
  ok(c0.w === 'サンタさん、来年は日本語が上手になりたいです。' && c0.wl === 'ja' && c0.t1 === 'Chúc mừng Giáng sinh!' && c0.f === 'qua' && c0.st.some((s) => s.s === 'le_tat' && s.m === 1),
    'tự lưu: điều ước đã sửa, chữ, khung, sticker (đã lật) — ' + c0.w);
  ok(!c0.fx || c0.fx.for !== c0.w, 'dùng bản sửa → điều ước mới, bản sửa cũ không còn khớp');
  // treo lên cây
  await page.click('[data-side="front"]');
  await page.click('#kb-le-hang');
  ok(await waitFor('Garden._data().le.hang === 0', 4000), 'Treo lên cây → data.le.hang = 0');
  e = await ev26();
  ok(e.hang && e.hang.i === 0, 'khoá ghi thiệp 1 đang treo');
  ok(/Gỡ khỏi cây/.test(await js('return document.getElementById("kb-le-hang").textContent;')), 'nút đổi thành "Gỡ khỏi cây"');
  // PNG + mã
  const png = '/tmp/kb_1361_thiep.png';
  await py(KB + `os.environ["KB_TEST_PHOTO"] = ${JSON.stringify(png)}\ntry:\n    os.remove(${JSON.stringify(png)})\nexcept OSError:\n    pass\nresult = 1`);
  await page.click('#kb-le-png'); await sleep(1200);
  const pinfo = await py(KB + `import struct\nb = open(${JSON.stringify(png)}, "rb").read() if os.path.exists(${JSON.stringify(png)}) else b""\nresult = [len(b), b[:8] == b"\\x89PNG\\r\\n\\x1a\\n", struct.unpack(">II", b[16:24]) if len(b) > 24 else None]`);
  ok(pinfo[0] > 1000 && pinfo[1] && pinfo[2][0] === 480 && pinfo[2][1] === 320, 'Lưu ảnh PNG: ' + JSON.stringify(pinfo));
  await page.click('#kb-le-code');
  ok(await waitFor('!document.getElementById("kb-le-codebox").hidden && /^KBC1:/.test(document.getElementById("kb-le-codebox").value)', 4000), 'Chép mã → hiện mã KBC1:');
  const code = await js('return document.getElementById("kb-le-codebox").value;');
  const clip = await py(KB + 'from aqt import qt as _qt\nresult = _qt.QApplication.clipboard().text()');
  ok(clip === code, 'mã nằm trong bộ nhớ tạm');
  ok(code.indexOf('サンタ') < 0 && !(await py(KB + `result = "w" in (le.decode_card(${JSON.stringify(code)}) or {"w": 1})`)), 'mã thiệp không có điều ước');
  // thiệp 2, 3 + xoá thiệp 3 (hộp hỏi)
  await page.click('[data-slot="1"]'); await page.click('#kb-le-cnew'); await sleep(1200);
  await page.click('[data-slot="2"]'); await page.click('#kb-le-cnew'); await sleep(1200);
  e = await ev26();
  ok(e.cards[1] && e.cards[1].f && e.cards[2] && e.cards[2].f, 'làm thêm thiệp 2, 3');
  await js('Garden._data().ask_off = false; return 1;');      // add-on test tắt hộp hỏi (ASK_TEST_OFF) — bật lại cho bước này
  await page.click('#kb-le-cdel');
  ok(await waitFor('typeof GardenUI !== "undefined" && GardenUI.asking && GardenUI.asking()', 2000), 'Xoá thiệp → hỏi trước');
  await sleep(500);
  await page.click('.kb-ask-yes'); await sleep(1200);
  e = await ev26();
  ok(e.cards[2] && !e.cards[2].f && e.cards[2].at, 'xoá thiệp 3 → ô trống có dấu thời gian');
  ok(/trống/.test(await js('return document.querySelector("[data-slot=\\"2\\"]").textContent;')), 'ô 3 ghi "trống"');
  // lệnh giả
  let r = await sendLe('le:card:' + JSON.stringify({ i: 5, card: { f: 'den' } }));
  ok(!r.ok, 'lưu ô 5 → từ chối: ' + r.msg);
  r = await sendLe('le:hang:2');
  ok(!r.ok && /chưa có thiệp/.test(r.msg), 'treo ô trống → ' + r.msg);
  r = await sendLe('le:fix:1');
  ok(!r.ok, 'nhờ sửa thiệp chưa có điều ước → ' + r.msg);
  await page.click('[data-slot="0"]'); await sleep(200);
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(await js('return document.getElementById("kb-le-cardpop").hidden;'), 'Esc: đóng xưởng thiệp');
  ok(await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())'), 'cửa sổ vườn vẫn mở');
  // thiệp trên cây (sân)
  ok(await js('const v = Garden._data().le; return v.hang === 0 && !v.santa.came;'), 'thiệp treo trên cây thông ở sân (vẽ tới tối 24)');
  await page.shot(SHOTS + '/1361_03_thiep_tren_cay.png');

  // ======================================================================================================
  console.log('== B. Album → Kỷ niệm: nhận thiệp');
  const friend = await py(KB + 'result = le.card_code({"f": "thong", "st": [{"s": "xmastree", "x": 40, "y": 20}], "t1": "Merry Christmas!", "t2": "— Minh", "c": "en"})');
  await js('GardenHome.openMemories(); return 1;');
  ok(await waitFor('!!document.querySelector(".kb-le-mem")', 4000), 'Nhà → Album → chip "Kỷ niệm" → Giáng sinh 2026');
  ok(await js('return !!document.querySelector("[data-album=\\"le\\"].is-on");'), 'chip Kỷ niệm đang chọn');
  await page.click('#kb-le-recv-in'); await page.type('KBC1:hong'); await page.click('#kb-le-recv-peek');
  ok(await waitFor('/không đúng/.test(document.getElementById("kb-le-recv-msg").textContent)', 4000), 'mã sai → "Mã thiệp không đúng"');
  await selectAllType('#kb-le-recv-in', friend.slice(0, 30) + '\n' + friend.slice(30));
  await page.click('#kb-le-recv-peek');
  ok(await waitFor('!!document.getElementById("kb-le-recv-keep")', 4000), 'dán mã của bạn (có xuống dòng) → xem trước thiệp');
  await page.shot(SHOTS + '/1361_04_nhan_thiep.png');
  await page.click('#kb-le-recv-keep');
  ok(await waitFor('Garden._data().le.recv.length === 1', 4000), 'Giữ vào Album → 1 thiệp nhận');
  e = await ev26();
  ok(e.recv && e.recv.length === 1 && e.recv[0].at === '2026-12-10', 'khoá ghi thiệp nhận');
  await page.key('Escape', 'Escape', 27); await sleep(400);

  // ======================================================================================================
  console.log('== C. 24/12 — ông già Noel');
  await reopen(TEST('2026-12-24', '2026-12-24T17:00', DAYS(24), 3) + 'ev = kb.LE.load()\nev["hang"] = {"i": -1, "at": "2026-12-20T10:00:00"}\nfor dd in range(11, 24):\n    ev["open"][str(dd)] = {"d": "2026-12-%02d" % dd, "b": 0}\nkb.LE.save(ev)\nst.place("room", "le_banhquy", 2, 2) if st.load()["home"]["owned"].get("le_banhquy") else None\n');
  v = await lev();
  ok(v.news && v.news.id === 'le_eve_card', '24/12 17:00, gỡ thiệp xuống → Hôm nay nhắc "treo thiệp trước 18:00": ' + (v.news && v.news.text));
  r = await sendLe('le:hang:0'); ok(r.ok, '17:00 treo lại được');
  await py(KB + TEST('2026-12-24', '2026-12-24T18:00', DAYS(24), 3) + 'result = 1');
  r = await sendLe('le:hang:1'); ok(!r.ok && /ghé rồi/.test(r.msg), '18:00 đổi thiệp trên cây → ' + r.msg);
  await py(KB + 'ev = kb.LE.load()\nev["open"]["23"] = {"d": "2026-12-23", "b": 0}\nkb.LE.save(ev)\nd = st.load()\nif not any(e["id"] == "le_banhquy" for e in d["home"]["room"]):\n    st.place("room", "le_banhquy", 2, 2)\nresult = 1');
  await reopen(TEST('2026-12-24', '2026-12-24T18:30', DAYS(24), 3));
  ok(await waitFor('!document.getElementById("kb-le-show") ? false : !document.getElementById("kb-le-show").hidden', 6000), '18:30 mở vườn → cảnh đêm 24 tự chạy');
  ok(await js('return GardenSky.holding() && GardenSky.state().light < 0.45;'), 'trời đêm tạm thời trong lúc chiếu');
  ok(await js('return !!GardenLeNoel._plan().tree && !!GardenLeNoel._plan().hung;'), 'cảnh có cây thông + thiệp đang treo');
  for (const ms of [2600, 6000, 8400]) {
    await js('GardenLeNoel._seek(' + ms + '); return 1;'); await sleep(250);
    await page.shot(SHOTS + '/1361_05_dem_24_' + ms + '.png');
  }
  await page.click('#kb-le-show-skip'); await sleep(300);
  ok(await js('return !document.getElementById("kb-le-show-again").hidden && !document.getElementById("kb-le-show-close").hidden;'), 'Bỏ qua → khung cuối + Xem lại / Đóng');
  ok(await waitFor('!!Garden._data().le.santa.seen', 4000), 'ghi "đã xem" (le:seen)');
  e = await ev26();
  ok(e.santa && e.santa.seen && /cookie/.test(e.santa.facts) && /tree/.test(e.santa.facts) && /swag/.test(e.santa.facts), 'khoá: santa.seen + thứ ông thấy (' + (e.santa && e.santa.facts) + ')');
  await page.click('#kb-le-show-close'); await sleep(300);
  ok(await js('return document.getElementById("kb-le-show").hidden && !GardenSky.holding();'), 'Đóng → trời thật trở lại');
  ok(await js('return GardenLe.eaten() && GardenLe.crumbs() !== null;'), 'bánh quy còn vụn (ông đã ăn)');
  await reopen(TEST('2026-12-24', '2026-12-24T19:00', DAYS(24), 3));
  await sleep(2500);
  ok(await js('const s = document.getElementById("kb-le-show"); return !s || s.hidden;'), 'mở lại tối 24 → không chiếu lại');
  v = await lev();
  ok(v.taken === 0 && !v.hang_edit, 'thiệp 1: ông đã nhận (khoá)');
  r = await sendLe('le:card:' + JSON.stringify({ i: 0, card: { f: 'den', st: [] }, rid: 1 }));
  ok(!r.ok && /mang thiệp/.test(r.msg), 'sửa thiệp ông đã mang đi → ' + r.msg);
  await js('GardenLeCard.open(0); return 1;'); await sleep(300);
  ok(await js('return document.getElementById("kb-le-hang").hidden && document.getElementById("kb-le-cdel").hidden && /mang thiệp này đi/.test(document.getElementById("kb-le-cnote").textContent);'),
    'xưởng thiệp: thiệp 1 chỉ xem (không treo / xoá), ghi lý do');
  await page.key('Escape', 'Escape', 27); await sleep(200);

  // ======================================================================================================
  console.log('== D. 25/12 — thư của ông già Noel');
  await reopen(TEST('2026-12-25', '2026-12-25T09:00', DAYS(24), 3));
  ok(await waitFor('!!document.getElementById("kb-le-letter") && !document.getElementById("kb-le-letter").hidden', 6000), 'sáng 25 mở vườn → thư tự mở');
  const lt = await js('return document.getElementById("kb-le-letter").textContent;');
  ok(/日本語が上手になりたいです/.test(lt) && /tiếng Nhật/.test(lt) && /bánh quy/.test(lt), 'thư trích điều ước, khen tiếng Nhật, cảm ơn bánh quy');
  await page.shot(SHOTS + '/1361_06_thu.png');
  ok(await waitFor('!!Garden._data().le.santa.read', 4000), 'ghi "đã đọc"');
  await page.click('#kb-le-replay');
  ok(await waitFor('!document.getElementById("kb-le-show").hidden', 3000), '"Xem lại đêm qua ▸" → chiếu cảnh');
  await page.key('Escape', 'Escape', 27); await sleep(200);
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(await js('return document.getElementById("kb-le-show").hidden;') && await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())'), 'Esc hai lần: bỏ qua → đóng cảnh, cửa sổ vườn vẫn mở');
  await reopen(TEST('2026-12-26', '2026-12-26T09:00', DAYS(24), 3));
  await sleep(2500);
  ok(await js('const l = document.getElementById("kb-le-letter"); return !l || l.hidden;'), 'đọc rồi → hôm sau không tự mở');
  r = await sendLe('le:box:1'); ok(r.ok, 'hộp quà 1 mở được');

  // ======================================================================================================
  console.log('== E. 1/1/2027 — cất đồ Noel');
  await py(KB + `d = st.load()
d["home"]["owned"]["le_tuanloc"] = 2
d["home"]["yard"] = [e for e in d["home"]["yard"] if e["id"] != "le_tuanloc"] + [{"id": "le_tuanloc", "x": 15, "y": 2}, {"id": "le_tuanloc", "x": 14, "y": 2}]
st.save(d)
result = 1`);
  await js('pycmd("home:decor:use:room:wall:w_noeltuyet"); return 1;'); await sleep(1200);
  e = await ev26();
  ok(e.prev && e.prev['room:wall'] === '', 'dùng tường Noel → sổ nhớ mẫu cũ (theo kiểu nhà)');
  await py(KB + 'kb.save_config(season_event=False)\nresult = 1');
  await reopen(TEST('2027-01-01', '2027-01-01T09:00', [], 3));
  e = await ev26();
  ok(!e.pack, 'Sự kiện mùa đang Tắt → chưa cất');
  await py(KB + 'kb.save_config(season_event=True)\nresult = 1');
  await reopen(TEST('2027-01-01', '2027-01-01T09:00', [], 3));
  ok(await waitFor('!!document.getElementById("kb-le-packpop") && !document.getElementById("kb-le-packpop").hidden', 6000), 'bật lại → lần đầu mở vườn từ 1/1: StackChan cất đồ Noel');
  await page.shot(SHOTS + '/1361_07_cat_do.png');
  let w = await wallet();
  ok(!w.yard.some((x) => x.id === 'le_tuanloc') && !w.room.some((x) => x.id === 'le_banhquy') && w.owned.le_tuanloc === 2 && w.owned.le_banhquy === 1,
    'tuần lộc đèn + bánh quy → Kho đồ (vẫn sở hữu)');
  ok(!w.decor.use.room.wall && w.decor.own.indexOf('w_noeltuyet') >= 0, 'phòng chính về tường theo kiểu nhà, mẫu Noel vẫn có');
  ok(w.room.some((x) => x.id === 'le_tulich'), 'tủ lịch vẫn treo (kỷ niệm)');
  e = await ev26();
  ok(e.pack && e.pack.at === '2027-01-01' && e.pack.items.le_tuanloc === 2, 'khoá ghi đã cất');
  await reopen(TEST('2027-01-02', '2027-01-02T09:00', [], 3));
  await sleep(2500);
  ok(await js('const p = document.getElementById("kb-le-packpop"); return !p || p.hidden;'), 'cất một lần (hôm sau không hiện lại)');
  await js('GardenHome.openMemories(); return 1;');
  ok(await waitFor('!!document.getElementById("kb-le-mem-letter")', 4000), 'Album → Kỷ niệm: thư của ông, thiệp, tủ lịch');
  await page.shot(SHOTS + '/1361_08_ky_niem.png');
  ok(await js('return document.querySelectorAll(".kb-le-mem-cards .kb-le-cthumb").length === 3;'), 'Kỷ niệm: 2 thiệp của bạn + 1 thiệp nhận');
  await page.key('Escape', 'Escape', 27); await sleep(300);

  // ======================================================================================================
  console.log('== F. admin xem thử (không ghi)');
  await py(KB + 'open(kb.ADMIN_FILE, "w").write("1")\nresult = 1');
  await reopen(RESET(7) + 'kb.LE_TEST = None\n');
  const before = JSON.stringify(await leKey());
  await js('pycmd("le:preview:2026-12-24T19:00"); return 1;');
  ok(await waitFor('!!document.getElementById("kb-le-show") && !document.getElementById("kb-le-show").hidden', 6000), 'xem thử 24/12 tối → cảnh ông già Noel');
  ok(await js('return document.getElementById("kb-le-pv-day").value === "2026-12-24T19:00";'), 'ô Xem thử giữ đúng lựa chọn');
  await page.click('#kb-le-show-skip'); await sleep(300); await page.click('#kb-le-show-close'); await sleep(300);
  await js('pycmd("le:preview:2026-12-25"); return 1;');
  ok(await waitFor('!!document.getElementById("kb-le-letter") && !document.getElementById("kb-le-letter").hidden', 6000), 'xem thử 25/12 → thư');
  await page.key('Escape', 'Escape', 27); await sleep(200);
  await js('pycmd("le:preview:2027-01-01"); return 1;');
  ok(await waitFor('!!document.getElementById("kb-le-packpop") && !document.getElementById("kb-le-packpop").hidden && /Xem thử/.test(document.getElementById("kb-le-packpop").textContent)', 6000), 'xem thử 1/1 → cất đồ (ghi "Xem thử — không cất thật")');
  ok(JSON.stringify(await leKey()) === before, 'collection không đổi');
  await js('pycmd("le:preview:off"); return 1;'); await sleep(700);
  await py(KB + 'os.remove(kb.ADMIN_FILE)\nkb.LE_TEST = None\nresult = 1');

  (page.errors || []).forEach((x) => errors.push(x));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  const bad = (elog || []).filter((x) => /le|sự kiện|Giáng|thiệp/.test(JSON.stringify(x)));
  ok(!bad.length, 'nhật ký lỗi không có lỗi của sự kiện' + (bad.length ? ': ' + JSON.stringify(bad[0]).slice(0, 300) : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
