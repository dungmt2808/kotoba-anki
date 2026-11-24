// 1.36 trong Anki thật — sự kiện Giáng sinh 2026 (tủ lịch 24 ngăn). Ngày Anki giả + ngày có ôn giả qua kb.LE_TEST (ghi THẬT
// vào collection, như người dùng ở ngày đó). Các kiểu người dùng:
//   A. trước 1/12 (25/11): không chip / không tặng, Tin làng "Sắp tới: Lịch chờ Giáng sinh mở";
//   B. nhà đủ 7 bước, chưa có cây thông, chưa mở giao diện Giáng sinh: 1/12 mở vườn → tặng tủ lịch (treo tường phòng khách) + cây
//      thông (đặt ra sân), thông báo; chip "Tủ lịch 0/24"; chưa ôn → dòng Hôm nay "ôn 1 thẻ là mở ngăn 1/12"; mở lại → không tặng lại;
//   C. ôn 1 thẻ → ngăn 1 sáng → bấm chuột thật vào ngăn trên bảng → thẻ kết quả, khoá kotoba_batake_le ghi ngăn 1, cây / nhà đổi;
//   D. 5/12 (ôn 1, 3, 5; 20 lượt hôm nay): mở 3 + 5 (tất Noel vào Kho → "Đặt ▸" mở Nhà ở chế độ đặt), mở bù ngăn 2 (15 lượt),
//      ngăn 4 → "ôn thêm 10 lượt"; lệnh giả (ngăn 9 / ngăn mở rồi) bị từ chối;
//   E. 17/12: người tuyết tự ra sân; 25/12: hộp quà mở được (quả cầu tuyết vào Kho);
//   F. ⚙ Sự kiện mùa: Tắt → không chip, cây như cũ (đủ đồ), không vẽ áo nhà; Bật lại → đủ như trước;
//   G. người mới (nhà 0 bước, chưa có gì) cài giữa tháng (10/12, ôn 1–9 ở điện thoại): tủ lịch nằm Kho đồ (gợi ý), cây ra sân,
//      9 ngăn chờ mở; kiểu nhà minka / nhà trà / lâu đài ban đêm vẽ không lỗi; sân hết chỗ → cây vào Kho + gợi ý "Đặt cây thông";
//   H. 1/1/2027: hết mùa — không mở ngăn, chip "Tủ lịch 24/24" xem lại được, cây về đủ đồ; Esc đóng bảng (cửa sổ vẫn mở);
//   I. admin "Xem thử sự kiện" 12/12: mở ngăn không ghi vào collection; không lỗi JS / nhật ký lỗi.
// Chạy: KB_SCRIPTS=e2e_136.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_136';
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
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(100); }
  return false;
}
const KB = `import sys, os, json, time, datetime, random
kb = sys.modules["kotoba_batake"]
st = kb.STATE
le = kb.le_core
`;
const TEST = (today, days, reviews) => `kb.LE_TEST = {"today": "${today}", "days": ${JSON.stringify(days || [])}, "reviews": ${reviews || 0}}\n`;
async function reopen(before) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data() && Garden._data().le !== undefined', 8000);
  await sleep(500);
}
async function refresh(before) {
  await py(KB + (before || '') + '\nkb._dialog.refresh(); result = 1');
  await sleep(600);
}
const RESET = (house, style) => `mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
d = st.load(); d["coins"] = 5000; d["home"]["house"] = ${house}; d["home"]["style"] = "${style || 'classic'}"; d["home"]["zones"] = []; d["home"]["owned"] = {}
d["home"]["rooms"] = []
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
d["more"]["decor"] = {"own": [], "use": {"room": {}, "kitchen": {}, "bedroom": {}}, "mine": {"items": {}, "next": 1}}
st.save(d)
kb.save_config(season_event=True)
kb._le_preview.update(day=None, ev=None)
`;
const leKey = () => py(KB + 'result = mw.col.get_config("kotoba_batake_le", None)');
const wallet = () => py(KB + 'd = st.load(); result = {"owned": d["home"]["owned"], "yard": d["home"]["yard"], "room": d["home"]["room"], "decor": d["more"]["decor"]}');
const lev = () => js('return Garden._data().le;');
async function clickDoor(d) {        // bấm chuột thật vào giữa ngăn d trên bảng tủ lịch
  const pt = await js(`const cv = document.getElementById("kb-le-cab"); if (!cv || document.getElementById("kb-le-pop").hidden) return null;
    const c = GardenLe._cell(${d}), S = GardenLe._S(), r = cv.getBoundingClientRect();
    return [r.left + (c.x + c.w / 2) * S, r.top + (c.y + c.h / 2) * S];`);
  if (!pt) { return false; }
  for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x: pt[0], y: pt[1], button: 'left', clickCount: 1 });
  return true;
}
async function sendLe(cmd) {
  await js('window.__lastLe = null; const f = Garden.le; Garden.le = function (r) { window.__lastLe = r; f(r); Garden.le = f; }; return 1;');
  await js('pycmd(' + JSON.stringify(cmd) + '); return 1;');
  await waitFor('!!window.__lastLe', 5000);
  return js('return window.__lastLe;');
}
async function openPanel() {
  await page.click('#kb-le-chip');
  return waitFor('!document.getElementById("kb-le-pop").hidden', 3000);
}

(async () => {
  await py(KB + `kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet":"off","trans":"off"})
result = 1`);
  console.log('== A. trước 1/12');
  await reopen(RESET(7) + TEST('2026-11-25', [], 0));
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  let v = await lev();
  ok(v && v.phase === 'pre' && !v.doors, '25/11: data.le pre (không tủ lịch): ' + JSON.stringify(v && v.phase));
  ok(await js('const c = document.getElementById("kb-le-chip"); return !c || c.hidden;'), 'không có chip Tủ lịch');
  const soon = await js('return (Garden._data().news.soon || []).map((x) => x.text);');
  ok(soon.some((t) => /Lịch chờ Giáng sinh mở/.test(t)), 'Tin làng → Sắp tới: ' + soon.join(' | '));
  ok((await leKey()) === null && !(await wallet()).owned.le_tulich, 'không ghi gì, không tặng gì');

  console.log('== B. 1/12 — tặng tủ lịch + cây thông');
  await reopen(TEST('2026-12-01', [], 0));
  let w = await wallet();
  ok(w.owned.le_tulich === 1 && w.room.some((e) => e.id === 'le_tulich' && e.y === 0), 'tủ lịch treo ở tường phòng khách: ' + JSON.stringify(w.room));
  ok(w.owned.xmastree === 1 && w.yard.some((e) => e.id === 'xmastree'), 'cây thông (chưa mở giao diện Giáng sinh) đặt ra sân: ' + JSON.stringify(w.yard));
  let key = await leKey();
  ok(key && key.noel2026 && key.noel2026.gift && key.noel2026.gift.tulich === '2026-12-01', 'khoá kotoba_batake_le ghi đã tặng');
  v = await lev();
  ok(v && v.active && v.doors.length === 24 && v.doors[0].state === 'wait', 'chưa ôn: ngăn 1 chờ ôn (' + (v && v.doors[0].state) + ')');
  ok(await waitFor('!document.getElementById("kb-le-chip").hidden && /0\\/24/.test(document.getElementById("kb-le-chip").textContent)', 3000), 'chip "Tủ lịch 0/24"');
  const tb = await js('const b = document.getElementById("kb-le-btn"); return b && !b.hidden ? b.textContent : "";');
  ok(/ôn 1 thẻ là mở ngăn 1\/12/.test(tb), 'thẻ Hôm nay: "' + tb + '"');
  ok(await js('return !!GardenLe.treeSprite() && GardenLe.treeSprite() !== GardenHome._sprites.xmastree;'), 'cây thông trơn (chưa treo gì)');
  await page.shot(SHOTS + '/136_01_ngay_1.png');
  await reopen(TEST('2026-12-01', [], 0));
  w = await wallet();
  ok(w.owned.le_tulich === 1 && w.owned.xmastree === 1 && w.room.filter((e) => e.id === 'le_tulich').length === 1, 'mở lại vườn: không tặng lại');

  console.log('== C. ôn 1 thẻ → mở ngăn 1 bằng chuột');
  await refresh(TEST('2026-12-01', ['2026-12-01'], 1));
  v = await lev();
  ok(v.ready.join() === '1', 'ngăn 1 chờ mở');
  ok(await openPanel(), 'bấm chip → bảng tủ lịch');
  await page.shot(SHOTS + '/136_02_bang.png');
  const inWin = await js('const r = document.getElementById("kb-le-pop").getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;');
  ok(inWin, 'bảng nằm gọn trong cửa sổ 1366 × 860');
  ok(await clickDoor(1), 'bấm ngăn 1');
  ok(await waitFor('Garden._data().le.opened === 1', 5000), 'Python mở ngăn 1');
  ok(await waitFor('!document.getElementById("kb-le-card").hidden && /Vòng hoa cửa/.test(document.getElementById("kb-le-card").textContent)', 3000), 'thẻ kết quả: Vòng hoa cửa');
  key = await leKey();
  ok(key.noel2026.open['1'] && key.noel2026.open['1'].d === '2026-12-01', 'khoá kotoba_batake_le: ngăn 1 mở 1/12');
  ok(await js('return GardenLe.has("wreath");'), 'nhà có vòng hoa cửa');
  await page.shot(SHOTS + '/136_03_mo_ngan_1.png');
  ok(await clickDoor(1) && await waitFor('/Vòng hoa cửa/.test(document.getElementById("kb-le-card").textContent)', 2000), 'bấm ngăn đã mở → xem lại');

  console.log('== D. 5/12 — mở nhiều ngăn, mở bù');
  await reopen(TEST('2026-12-05', ['2026-12-01', '2026-12-03', '2026-12-05'], 20));
  v = await lev();
  ok(v.ready.join() === '3,5' && v.miss.join() === '2,4' && v.makeup.left === 1, 'ngăn 3, 5 chờ mở; 2, 4 lỡ; mở bù được 1 (' + JSON.stringify(v.makeup) + ')');
  ok(await openPanel(), 'mở bảng');
  await clickDoor(3); await waitFor('Garden._data().le.opened === 2', 5000);
  await clickDoor(5); await waitFor('Garden._data().le.opened === 3', 5000);
  w = await wallet();
  ok(w.owned.le_caynho === 1 && w.owned.le_tat === 1, 'ngăn 3 + 5: cây thông nhỏ + tất Noel vào Kho đồ');
  ok(await waitFor('/Đặt ▸/.test(document.getElementById("kb-le-card").textContent)', 2000), 'thẻ có "Đặt ▸"');
  await clickDoor(2);
  ok(await waitFor('Garden._data().le.opened === 4', 5000), 'mở bù ngăn 2 (20 lượt)');
  key = await leKey();
  ok(key.noel2026.open['2'].b === 1 && key.noel2026.bu['2026-12-05'] === 1, 'sổ ghi mở bù');
  await clickDoor(4); await sleep(800);
  const note = await js('return document.getElementById("kb-le-note").textContent;');
  ok(/ôn thêm 10 lượt/.test(note) && (await lev()).opened === 4, 'ngăn 4 → "' + note + '"');
  let r = await sendLe('le:open:9');
  ok(!r.ok && /mở từ 9\/12/.test(r.msg), 'lệnh giả ngăn 9 → ' + r.msg);
  r = await sendLe('le:open:1');
  ok(!r.ok && /mở rồi/.test(r.msg), 'mở lại ngăn 1 → ' + r.msg);
  r = await sendLe('le:open:abc');
  ok(!r.ok, 'ngăn "abc" → từ chối');
  await page.shot(SHOTS + '/136_04_ngay_5.png');
  // "Đặt ▸" tất Noel → Nhà mở ở chế độ đặt
  await js('GardenLe._clickDoor(5); return 1;');
  await sleep(300);
  await page.click('#kb-le-card .kb-btn');
  ok(await waitFor('!document.getElementById("kb-home").hidden && GardenHome._state().placing && GardenHome._state().placing.id === "le_tat"', 4000),
    '"Đặt ▸" → bảng Nhà, đang đặt Tất Noel');
  await page.shot(SHOTS + '/136_04b_dat_tat.png');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(await waitFor('document.getElementById("kb-home").hidden', 3000), 'Esc, Esc → bỏ đặt, đóng bảng Nhà');

  console.log('== E. 17/12 người tuyết, 25/12 hộp quà');
  const days17 = []; for (let d = 1; d <= 17; d++) { days17.push('2026-12-' + String(d).padStart(2, '0')); }
  await reopen(TEST('2026-12-17', days17, 3));
  r = await sendLe('le:open:6'); ok(r.ok && r.door.box === 1, 'ngăn 6 → hộp quà số 1 dưới gốc cây');
  r = await sendLe('le:open:17'); ok(r.ok && (r.placed || []).some((p) => p.id === 'le_nguoituyet' && p.scene === 'yard'), 'ngăn 17 → người tuyết tự ra sân ' + JSON.stringify(r.placed));
  r = await sendLe('le:box:1'); ok(!r.ok && /25\/12/.test(r.msg), 'hộp quà trước 25/12 → ' + r.msg);
  for (const d of [7, 8, 10, 14]) { await sendLe('le:open:' + d); }
  w = await wallet();
  ok(['w_noeltuyet', 'w_noelkeo', 'w_noeldo'].every((t) => w.decor.own.indexOf(t) >= 0), 'ngăn 8: 3 mẫu tường Noel');
  await py(KB + 'st.decor_use("room", "wall", "w_noelkeo"); kb._dialog.refresh(); result = 1'); await sleep(500);
  await py(KB + 'from aqt.qt import QTimer\nresult = 1');
  await js('GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 22); return 1;'); await sleep(800);
  await page.shot(SHOTS + '/136_05_dem_17.png');
  ok(await js('return GardenLe.has("garland") && GardenLe.has("path") && GardenLe.has("lights");'), 'ngăn 7 / 10 / 14: dây lá thông, dây đèn, đèn lối đi');
  await js('GardenHome.showMain("house"); return 1;'); await sleep(900);
  await page.shot(SHOTS + '/136_06_trong_nha.png');
  await js('GardenHome.showMain("yard"); GardenSky.set("mode", "real"); return 1;');
  await reopen(TEST('2026-12-25', days17, 0));
  r = await sendLe('le:box:1');
  ok(r.ok && (await wallet()).owned.le_cautuyet === 1, '25/12: mở hộp quà 1 → quả cầu tuyết vào Kho');

  console.log('== F. ⚙ Sự kiện mùa Tắt / Bật');
  await js('pycmd("le:cfg:off"); return 1;'); await sleep(900);
  ok(await waitFor('Garden._data().le === null && document.getElementById("kb-le-chip").hidden', 4000), 'Tắt: không data.le, không chip');
  ok(await js('return !GardenLe.active() && GardenLe.treeSprite() === null;'), 'Tắt: cây thông vẽ như cũ (đủ đồ)');
  ok((await leKey()).noel2026.open['17'], 'Tắt: dữ liệu giữ nguyên');
  await js('pycmd("le:cfg:on"); return 1;'); await sleep(900);
  ok(await waitFor('Garden._data().le && Garden._data().le.opened >= 10', 4000), 'Bật lại: thấy đủ (' + ((await lev()) || {}).opened + ' ngăn)');

  console.log('== G. người mới, cài giữa tháng, kiểu nhà khác, sân hết chỗ');
  const days9 = []; for (let d = 1; d <= 10; d++) { days9.push('2026-12-' + String(d).padStart(2, '0')); }
  await reopen(RESET(0) + TEST('2026-12-10', days9, 2));
  w = await wallet();
  ok(w.owned.le_tulich === 1 && !w.room.some((e) => e.id === 'le_tulich'), 'nhà chưa có phòng: tủ lịch ở Kho đồ');
  ok(w.yard.some((e) => e.id === 'xmastree'), 'cây thông ra sân');
  v = await lev();
  ok(v.ready.length === 10, 'cài 10/12, ôn 1–10 (điện thoại) → 10 ngăn chờ mở (' + v.ready.length + ')');
  await openPanel();
  const hint = await js('return document.getElementById("kb-le-hints").textContent;');
  ok(/Tủ lịch nằm trong Kho đồ/.test(hint), 'gợi ý: ' + hint);
  await page.shot(SHOTS + '/136_07_nguoi_moi.png');
  for (const style of ['minka', 'teahouse', 'castle']) {
    await reopen(RESET(7, style) + TEST('2026-12-24', days17.concat(['2026-12-18', '2026-12-19', '2026-12-20', '2026-12-21', '2026-12-22', '2026-12-23', '2026-12-24']), 2) +
      'ev = kb.LE.load()\nfor dd in range(1, 25):\n    ev["open"][str(dd)] = {"d": "2026-12-%02d" % dd, "b": 0}\nkb.LE.save(ev)\n');
    await js('GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 22); return 1;'); await sleep(900);
    await page.shot(SHOTS + '/136_08_' + style + '.png');
    ok((page.errors || []).length === 0 && await js('return GardenLe.parts().length === 13;'), style + ' ban đêm, đủ 24 ngăn: vẽ không lỗi');
    await js('GardenSky.set("mode", "real"); return 1;');
  }
  await reopen(RESET(7) + 'd = st.load()\nfor y in range(3):\n    for x in range(4, 16):\n        d["home"]["yard"].append({"id": "fence", "x": x, "y": y})\nd["home"]["owned"]["fence"] = 36\nst.save(d)\n' + TEST('2026-12-02', [], 0));
  w = await wallet();
  ok(w.owned.xmastree === 1 && !w.yard.some((e) => e.id === 'xmastree'), 'sân hết chỗ → cây thông ở Kho đồ');
  await openPanel();
  ok(/Đặt cây thông/.test(await js('return document.getElementById("kb-le-hints").textContent;')), 'gợi ý "Đặt cây thông ▸"');

  console.log('== H. hết mùa 1/1/2027 + Esc');
  await reopen(RESET(7) + TEST('2026-12-24', days17, 1) + 'ev = kb.LE.load()\nfor dd in range(1, 25):\n    ev["open"][str(dd)] = {"d": "2026-12-%02d" % dd, "b": 0}\nev["gift"] = {"tulich": "2026-12-01", "tree": "2026-12-01"}\nkb.LE.save(ev)\n');
  await reopen(TEST('2027-01-01', [], 3));
  v = await lev();
  ok(v && v.phase === 'done' && !v.active && v.opened === 24, '1/1: hết mùa, tủ lịch kỷ niệm 24/24');
  ok(await js('return GardenLe.treeSprite() === null;'), 'cây thông về đủ đồ (không theo ngăn)');
  r = await sendLe('le:open:3'); ok(!r.ok && /đã qua/.test(r.msg), 'mở ngăn sau mùa → ' + r.msg);
  ok(await openPanel(), 'chip → bảng xem lại');
  ok(/đã qua/.test(await js('return document.getElementById("kb-le-note").textContent;')), 'ghi "Mùa Giáng sinh 2026 đã qua"');
  await page.key('Escape', 'Escape', 27); await sleep(500);
  ok(await js('return document.getElementById("kb-le-pop").hidden;'), 'Esc đóng bảng tủ lịch');
  ok(await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())'), 'cửa sổ vườn vẫn mở');

  console.log('== I. admin xem thử (không ghi)');
  await py(KB + 'open(kb.ADMIN_FILE, "w").write("1")\nresult = 1');
  await reopen(RESET(7) + 'kb.LE_TEST = None\n');
  const before = await leKey();
  await js('pycmd("le:preview:2026-12-12"); return 1;'); await sleep(900);
  v = await lev();
  ok(v && v.preview && v.today === '2026-12-12' && v.ready.join() === '12', 'xem thử 12/12: ngăn 12 chờ mở');
  r = await sendLe('le:open:12');
  ok(r.ok && r.preview, 'mở ngăn 12 (xem thử)');
  ok(JSON.stringify(await leKey()) === JSON.stringify(before), 'collection không đổi');
  await js('pycmd("le:preview:off"); return 1;'); await sleep(700);
  await py(KB + 'os.remove(kb.ADMIN_FILE)\nkb.LE_TEST = None\nresult = 1');

  (page.errors || []).forEach((e) => errors.push(e));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  const bad = (elog || []).filter((x) => /le|sự kiện|Giáng/.test(JSON.stringify(x)));
  ok(!bad.length, 'nhật ký lỗi không có lỗi của sự kiện' + (bad.length ? ': ' + JSON.stringify(bad[0]).slice(0, 300) : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
