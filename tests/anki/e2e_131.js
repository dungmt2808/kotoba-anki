// 1.31 trong Anki thật — làm theo yêu cầu người dùng 14/11:
//   1. "chỉ vào cửa hàng, nhà khi bấm vào mục 'Nhà & Cửa hàng' thôi": bấm cỏ / nhà / đồ trên cảnh (sân, Trong nhà, vùng) không
//      mở bảng Nhà; nút "Nhà & Cửa hàng ▸" (góc cảnh) mở đúng cảnh đang xem; nút Nhà / phím N vẫn mở; bấm thú / khách → thẻ
//      nhỏ (tên, đang làm gì, nút vào tab Thú nuôi / Album), Esc / bấm ra ngoài đóng thẻ mà không đóng cửa sổ vườn;
//      hòm thư vẫn mở Báo, StackChan vẫn mở thẻ sinh hoạt.
//   2. "kiểm tra lại chuỗi khi người dùng cài add-on … khi mới cài add-on thì chuỗi sẽ là 0": collection có 40 ngày ôn liền
//      trước khi cài → mở hồ sơ lần đầu: chuỗi 0 (Hôm nay, Lịch hoa tháng + năm, Tin làng), lượt ôn hôm nay vẫn đếm; ôn một
//      lượt sau khi cài → 1 ngày; người đã dùng bản cũ (có sổ bù xu điện thoại) giữ chuỗi từ lúc lập sổ; mốc không đổi khi
//      mở lại hồ sơ; Giao diện mùa đổi bằng ngày ôn liền dùng chuỗi mới.
//   3. "thêm phần thiết kế đồ cho stack-chan … stack-chan thật đang sinh hoạt có được đổi đồ luôn không": Tủ đồ → Tự vẽ (Mũ /
//      Mặt / Cổ / Vỏ) → Xưởng: lưới đúng chỗ trên thân, hình mờ của StackChan dưới ô trống, xem trước hai StackChan, vẽ bằng
//      chuột thật, hỏi trước khi trả 200 xu, mặc luôn; linh vật góc trái và StackChan sinh hoạt trên cảnh cùng mặc; sửa tên
//      miễn phí, vẽ lại 50 xu; mua đồ có sẵn cùng chỗ thì thay; vỏ hai màu 150 xu; xoá; đồ có sẵn (Mũ rơm…) cũng hiện trên
//      StackChan sinh hoạt; lệnh cầu nối sai dạng không làm Anki bật hộp lỗi.
// Chạy: KB_SCRIPTS=e2e_131.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_131';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenUI !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
core = kb.core
`;
const coins = () => py(KB + 'result = st.load()["coins"]');
async function reopen(before, w, h) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await py(KB + `kb._dialog.resize(${w || 1366}, ${h || 860}); result = 1`);
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data()', 8000);
  await sleep(700);
}
async function click(x, y, count) {
  for (const c of count === 2 ? [1, 2] : [1]) {
    for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: c }); }
  }
}
async function move(x, y) { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); }
async function center(sel) {
  return js(`const e = ${sel}; if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];`);
}
async function press(sel) { const at = await center(sel); if (!at) { return false; } await click(at[0], at[1]); return true; }
// điểm màn hình của toạ độ cảnh (ax, ay) trên dải cảnh màn chính
const yardPoint = (ax, ay) => js(`const cv = document.getElementById("kb-yard"), r = cv.getBoundingClientRect(), v = GardenHome._mainView();
  return [r.left + (${ax} + v.ox) * v.S, r.top + (${ay} + (v.oy || 0)) * v.S];`);
const homeOpen = () => js('return GardenHome.isOpen() && !document.getElementById("kb-home").hidden;');
const cardOpen = () => js('const c = document.getElementById("kb-scene-card"); return !!(c && !c.hidden);');
async function shot(name) { await page.shot(SHOTS + '/131_' + name + '.png'); }
// đếm điểm ảnh màu hex trong một vùng canvas (toạ độ điểm ảnh của canvas)
const countColor = (canvasExpr, hex, rect) => js(`const cv = ${canvasExpr}; if (!cv) return -1; const g = cv.getContext("2d");
  const R = ${JSON.stringify(rect || null)} || [0, 0, cv.width, cv.height];
  const x0 = Math.max(0, Math.floor(R[0])), y0 = Math.max(0, Math.floor(R[1])), w = Math.min(cv.width - x0, Math.ceil(R[2])), h = Math.min(cv.height - y0, Math.ceil(R[3]));
  if (w <= 0 || h <= 0) return 0;
  const d = g.getImageData(x0, y0, w, h).data, t = ${JSON.stringify(hex)}, rr = parseInt(t.slice(1, 3), 16), gg = parseInt(t.slice(3, 5), 16), bb = parseInt(t.slice(5, 7), 16);
  let n = 0; for (let i = 0; i < d.length; i += 4) { if (Math.abs(d[i] - rr) < 6 && Math.abs(d[i + 1] - gg) < 6 && Math.abs(d[i + 2] - bb) < 6 && d[i + 3] > 200) { n++; } } return n;`);
// vùng (điểm ảnh canvas) quanh StackChan sinh hoạt trên dải cảnh màn chính, kể cả phần mũ nhô lên
const lifeRect = () => js(`const b = GardenLife._box(), v = GardenHome._mainView(), cv = document.getElementById("kb-yard"); if (!b || !v) return null;
  const k = cv.width / cv.getBoundingClientRect().width, gx = (v.house && b.scene !== "house" && ["kitchen", "room", "bedroom"].indexOf(b.scene) >= 0) ? ({ kitchen: 0, room: 148, bedroom: 312 })[b.scene] : 0;
  return [(v.ox + gx + b.x - 2) * v.S * k, ((v.oy || 0) + b.y - 8) * v.S * k, (b.w + 4) * v.S * k, (b.h + 9) * v.S * k];`);

(async () => {
  // nhà đủ bước, mở rộng, một thú nuôi ngoài sân, nhiều xu; StackChan sinh hoạt bật lại (add-on test tắt cho kịch bản cũ)
  await py(KB + `kb.ASK_TEST_OFF = False
kb.LIFE_TEST_OFF = False
d = st.load(); d["coins"] = 100000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        pass
st.open_rooms()
try:
    st.pet_buy("shiba")
except Exception as e:
    print(e)
d = st.load(); d["coins"] = 5000; st.save(d)
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
kb._rate131 = kb.guests.rate
kb.guests.rate = lambda fruit: 0.0
result = 1`);
  await reopen('', 1366, 860);

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 1. chỉ nút "Nhà & Cửa hàng" mở bảng Nhà');
  await js('GardenHome.showMain("yard"); return 1;'); await sleep(500);
  const hint = await js('const b = document.getElementById("kb-yard-home"); const cs = b && getComputedStyle(b); return b ? [b.tagName, cs.pointerEvents, b.textContent, b.title] : null;');
  ok(hint && hint[0] === 'BUTTON' && hint[1] !== 'none' && /Nhà & Cửa hàng/.test(hint[2]) && /phím N/.test(hint[3]), 'nhãn "Nhà & Cửa hàng ▸" là nút bấm được: ' + JSON.stringify(hint));
  ok(!(await js('return document.getElementById("kb-yard-wrap").title;')), 'khung cảnh không còn chú thích "Bấm để vào Nhà & Cửa hàng"');
  // bấm cỏ trống (phải sân), bấm ngôi nhà, bấm đồ đặt ở sân → không mở
  for (const [ax, ay, what] of [[220, 64, 'cỏ trống bên phải'], [30, 50, 'ngôi nhà'], [130, 70, 'giữa sân'], [250, 20, 'trời']]) {
    const p = await yardPoint(ax, ay);
    await click(p[0], p[1]); await sleep(350);
    ok(!(await homeOpen()), 'bấm ' + what + ' trên sân: không mở bảng Nhà');
    if (await cardOpen()) { await js('GardenHome.closeSceneCard(); return 1;'); }
    if (await js('return GardenLife.isOpen();')) { await js('GardenLife.closeCard(); return 1;'); }
  }
  const cur = await js('const p = document.getElementById("kb-yard").getBoundingClientRect(); return [p.left + 200, p.top + 60];');
  await move(cur[0], cur[1]); await sleep(300);
  ok(await js('return getComputedStyle(document.getElementById("kb-yard-home")).opacity === "1";'), 'rê chuột lên cảnh: nút hiện rõ');
  ok(await js('const c = document.getElementById("kb-yard"); return c.style.cursor !== "pointer";'), 'con trỏ trên cỏ trống không phải bàn tay');
  await shot('01_nut_nha_cua_hang');
  await press('document.getElementById("kb-yard-home")'); await sleep(700);
  ok(await homeOpen() && (await js('return GardenHome._state().scene;')) === 'yard', 'bấm nút → bảng Nhà mở đúng cảnh Sân vườn');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  ok(!(await homeOpen()), 'Esc đóng bảng Nhà');
  // Trong nhà: bấm gian không mở, nút mở phòng chính
  await js('GardenHome.showMain("house"); return 1;'); await sleep(700);
  for (const [ax, what] of [[60, 'Bếp'], [220, 'phòng chính'], [380, 'Phòng ngủ']]) {
    const p = await yardPoint(ax, 70);
    await click(p[0], p[1]); await sleep(350);
    ok(!(await homeOpen()), 'Trong nhà: bấm ' + what + ' không mở bảng Nhà');
    if (await js('return GardenLife.isOpen();')) { await js('GardenLife.closeCard(); return 1;'); }
  }
  ok(!/bấm để bày đồ/.test(await js('return document.getElementById("kb-yard").title || "";')), 'Trong nhà: không còn chú thích "bấm để bày đồ"');
  await press('document.getElementById("kb-yard-home")'); await sleep(700);
  ok(await homeOpen() && (await js('return GardenHome._state().scene;')) === 'room', 'Trong nhà: nút mở bảng Nhà ở phòng chính');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  await page.key('n', 'KeyN', 78); await sleep(600);
  ok(await homeOpen(), 'phím N vẫn mở bảng Nhà');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  await press('document.getElementById("kb-house")'); await sleep(600);
  ok(await homeOpen(), 'nút Nhà ở thanh trên vẫn mở bảng Nhà');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  // vùng: bấm cảnh không mở
  await py(KB + 'd = st.load(); d["home"]["zones"] = ["beach"]; st.save(d); result = 1');
  await reopen('', 1366, 860);
  await js('GardenHome.showMain("beach"); return 1;'); await sleep(700);
  { const p = await yardPoint(150, 60); await click(p[0], p[1]); await sleep(350); }
  ok(!(await homeOpen()), 'Bãi biển: bấm cát không mở bảng Nhà');
  if (await js('return GardenLife.isOpen();')) { await js('GardenLife.closeCard(); return 1;'); }

  console.log('== 1b. bấm thú nuôi / khách → thẻ nhỏ');
  await js('GardenHome.showMain("yard"); return 1;'); await sleep(1500);
  const petPt = await js(`const w = GardenPets.where("yard"); if (!w.length) return null;
    const cv = document.getElementById("kb-yard"), r = cv.getBoundingClientRect(), v = GardenHome._mainView(), p = w[0];
    for (let dy = 1; dy < 14; dy++) { for (let dx = -6; dx <= 6; dx++) { if (GardenPets.at("yard", p.x + dx, p.y - dy) === p.id) { return [r.left + (p.x + dx + v.ox) * v.S, r.top + (p.y - dy + (v.oy || 0)) * v.S, p.id]; } } }
    return null;`);
  ok(!!petPt, 'thấy Shiba ngoài sân ' + JSON.stringify(petPt));
  if (petPt) {
    await js('GardenPets._freeze && GardenPets._freeze(true); return 1;');
    await click(petPt[0], petPt[1]); await sleep(400);
    const card = await js('const c = document.getElementById("kb-scene-card"); return c && !c.hidden ? [c.getAttribute("data-kind"), c.getAttribute("data-id"), c.textContent] : null;');
    ok(card && card[0] === 'pet' && card[1] === petPt[2] && !(await homeOpen()), 'bấm thú: thẻ nhỏ hiện, bảng Nhà không mở — ' + (card ? card[2].slice(0, 60) : ''));
    ok(card && /(Thú nuôi|Cho ăn) ▸/.test(card[2]), 'thẻ có nút vào tab Thú nuôi');
    await shot('02_the_thu_nuoi');
    await page.key('Escape', 'Escape', 27); await sleep(300);
    ok(!(await cardOpen()) && await js('return !!Garden._data();'), 'Esc đóng thẻ, cửa sổ vườn vẫn mở');
    await click(petPt[0], petPt[1]); await sleep(400);
    const off = await yardPoint(230, 20); await click(off[0], off[1]); await sleep(300);
    ok(!(await cardOpen()) && !(await homeOpen()), 'bấm ra chỗ khác: thẻ đóng, không mở bảng Nhà');
    await click(petPt[0], petPt[1]); await sleep(400);
    await press('document.querySelector("#kb-scene-card .kb-btn")'); await sleep(800);
    ok(await homeOpen() && (await js('return GardenHome._state().tab;')) === 'pet' && !(await cardOpen()), 'nút trong thẻ → bảng Nhà ở tab Thú nuôi');
    await page.key('Escape', 'Escape', 27); await sleep(400);
  }
  await js('GardenLife._force("", "bedroom"); GardenGuests._force("yard", "sagi"); return 1;');      // StackChan vào nhà (chỗ đứng mặc định ở sân trùng mép ao)
  ok(await waitFor('(() => { const a = GardenGuests._vis("yard"); return !!(a && a.act === "stay" && a.box); })()', 9000), 'khách Cò trắng ghé ao');
  const gb = await js('const a = GardenGuests._vis("yard"); return a && a.box;');
  if (gb) {
    const p = await yardPoint(gb.x + gb.w / 2, gb.y + gb.h / 2);
    await move(p[0], p[1]); await sleep(250);
    ok(/Cò trắng ghé vườn/.test(await js('return document.getElementById("kb-yard").title;')), 'rê chuột lên khách: chú thích tên');
    await click(p[0], p[1]); await sleep(400);
    const gc = await js('const c = document.getElementById("kb-scene-card"); return c && !c.hidden ? [c.getAttribute("data-kind"), c.textContent] : null;');
    ok(gc && gc[0] === 'guest' && /Cò trắng/.test(gc[1]) && /Album khách ▸/.test(gc[1]) && !(await homeOpen()), 'bấm khách: thẻ nhỏ (tên, Album khách ▸), bảng Nhà không mở');
    await press('document.querySelector("#kb-scene-card .kb-btn")'); await sleep(800);
    ok(await homeOpen() && await js('const c = document.querySelector(".kb-h-guestcard.kb-h-focus"); return !!c && c.getAttribute("data-guest") === "sagi";'), 'nút trong thẻ → Album, tô thẻ Cò trắng');
    await page.key('Escape', 'Escape', 27); await sleep(400);
  }
  await js('GardenLife._force(null); return 1;');
  // hòm thư vẫn mở Báo
  const mb = await js(`const v = GardenHome._mainView(); const d = Garden._data(); const it = ((d.wallet.home || {}).yard || []).find((e) => e.id === "mailbox"); return it ? [it.x, it.y] : null;`);
  ok(true, 'hòm thư: ' + (mb ? 'đã đặt' : 'chưa đặt (bỏ qua)'));

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 2. chuỗi ngày khi mới cài');
  // 40 ngày ôn liền trước khi "cài" (hôm qua → 40 ngày trước) + 5 lượt sáng nay; xoá mốc + sổ bù xu = máy chưa từng chạy ことば畑
  const hist = await py(KB + `col = mw.col
col.db.execute("delete from revlog")
cids = list(col.db.list("select id from cards limit 60"))
D = core.ngay.days_of(col)
rows = []
for b in range(1, 41):
    t0 = D.rel_start(-b) * 1000 + 3600 * 1000 * 5
    rows += [(t0 + i * 1000, cids[i % len(cids)], -1, 3, 5, 2, 2500, 4000, 1) for i in range(6)]
t0 = D.rel_start(0) * 1000 + 60 * 1000
rows += [(min(t0 + i * 1000, int(time.time() * 1000) - 120000 + i), cids[i], -1, 3, 5, 2, 2500, 4000, 1) for i in range(5)]
col.db.executemany("insert or ignore into revlog (id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", rows)
col.remove_config(core.START_KEY) if col.get_config(core.START_KEY, None) is not None else None
col.remove_config(core.MOBILE_KEY) if col.get_config(core.MOBILE_KEY, None) is not None else None
kb.STREAK_TEST_ALL = True
old = kb._daily_stats()
kb.STREAK_TEST_ALL = False
kb._on_profile_open()          # như lần mở hồ sơ đầu tiên sau khi cài
new = kb._daily_stats()
result = {"old": old, "new": new, "start": col.get_config(core.START_KEY, None), "mobile": (col.get_config(core.MOBILE_KEY, None) or {}).get("start"), "now": int(time.time() * 1000)}`);
  ok(hist.old.streak === 41, 'trước 1.31 (đếm cả lịch sử Anki): chuỗi ' + hist.old.streak + ' ngày');
  ok(hist.new.streak === 0, 'mới cài: chuỗi 0 ngày (lịch sử ôn trước khi cài không tính)');
  ok(hist.new.reviews === 5, 'lượt ôn hôm nay vẫn đếm đủ (' + hist.new.reviews + ' lượt, cho mục tiêu ngày)');
  ok(hist.start && Math.abs(hist.start.ms - hist.now) < 60000 && hist.mobile && Math.abs(hist.mobile - hist.start.ms) < 60000, 'mốc = lúc mở hồ sơ (trước khi lập sổ bù xu)');
  // ảnh "trước": cách tính của ≤ 1.30.3 (cả lịch sử Anki) trên cùng collection
  await py(KB + 'kb.STREAK_TEST_ALL = True; result = 1');
  await reopen('', 1366, 860);
  ok(await js('return /41 ngày liền/.test(document.getElementById("kb-today-text").textContent);'), '(cách tính cũ) thẻ Hôm nay ghi "41 ngày liền" ngay khi vừa cài');
  await page.shot(SHOTS + '/131_00_truoc_chuoi_41_ngay.png');
  await py(KB + 'kb.STREAK_TEST_ALL = False; result = 1');
  await reopen('', 1366, 860);
  ok(await js('const t = document.getElementById("kb-today-text"); return !!t && !/ngày liền/.test(t.textContent) && Garden._data().today.streak === 0;'), 'thẻ Hôm nay: không ghi "N ngày liền"');
  await page.shot(SHOTS + '/131_00_sau_chuoi_0.png');
  // ôn một lượt sau khi cài
  const after = await py(KB + `col = mw.col
cid = col.db.scalar("select id from cards limit 1")
col.db.execute("insert into revlog (id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", int(time.time() * 1000), cid, -1, 3, 5, 2, 2500, 4000, 1)
result = kb._daily_stats()`);
  ok(after.streak === 1 && after.reviews === 6, 'ôn một lượt sau khi cài: chuỗi 1 ngày (' + JSON.stringify(after) + ')');
  await reopen('', 1366, 860);
  ok(await js('return /1 ngày liền/.test(document.getElementById("kb-today-text").textContent);'), 'thẻ Hôm nay: "1 ngày liền"');
  const cal = await py(KB + `m = kb.cal_month(""); y = kb.cal_year("")
result = {"m": m["streak"], "y": y["streak"], "best": y["sum"]["best"], "days": y["sum"]["days"]}`);
  ok(cal.m === 1 && cal.y === 1 && cal.best === 1, 'Lịch hoa: Ôn liền 1 ngày, Liền lâu nhất 1 ngày (' + JSON.stringify(cal) + ')');
  ok(cal.days >= 30, 'Lịch hoa vẫn có hoa của các ngày ôn trước khi cài (' + cal.days + ' ngày trong năm nay)');
  await js('if (typeof GardenCal !== "undefined") { GardenCal.open(); } return 1;'); await sleep(1200);
  const hud = await js('return [...document.querySelectorAll("#kb-cal .kb-g-chip, #kb-cal .kb-g-hud")].map((e) => e.textContent).join(" | ");');
  ok(/Ôn liền\s*1 ngày/.test(hud), 'Lịch hoa hiện "Ôn liền 1 ngày": ' + hud.slice(0, 90));
  await shot('03_lich_hoa_chuoi_moi');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  const again = await py(KB + `a = mw.col.get_config(core.START_KEY)
kb._on_profile_open()
result = [a, mw.col.get_config(core.START_KEY), kb._daily_stats()["streak"]]`);
  ok(JSON.stringify(again[0]) === JSON.stringify(again[1]) && again[2] === 1, 'mở hồ sơ lần nữa: mốc giữ nguyên, chuỗi vẫn 1');
  // người đã dùng bản cũ: có sổ bù xu điện thoại từ 10 ngày trước → chuỗi tính từ lúc lập sổ
  const oldUser = await py(KB + `col = mw.col
D = core.ngay.days_of(col)
col.remove_config(core.START_KEY)
m = col.get_config(core.MOBILE_KEY)
m["start"] = D.rel_start(-10) * 1000 + 3600 * 1000
col.set_config(core.MOBILE_KEY, m)
ms = kb._streak_start()
result = {"ms": ms, "want": m["start"], "streak": kb._daily_stats()["streak"]}`);
  ok(oldUser.ms === oldUser.want && oldUser.streak === 11, 'đã dùng bản cũ (sổ bù xu lập 10 ngày trước): chuỗi ' + oldUser.streak + ' ngày (10 ngày trước + hôm nay)');
  // Giao diện mùa "Đổi 7 ngày ôn liền" theo chuỗi mới
  const theme = await py(KB + `col = mw.col
col.set_config(core.START_KEY, {"v": 1, "ms": core.ngay.days_of(col).rel_start(0) * 1000})
s = kb._daily_stats()
try:
    th = [t["id"] for t in core.season.THEMES if t["kind"] == "season"][0]
    st.unlock_theme(th, "streak", s["streak"], s["day"])
    r = "mở"
except core.HomeError as e:
    r = str(e)
result = [s["streak"], r]`);
  ok(theme[0] === 1 && /đang có 1 ngày/.test(theme[1]), 'Giao diện mùa đổi bằng ngày ôn liền dùng chuỗi mới (1 ngày → chưa đổi được: ' + theme[1] + ')');

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 3. tự vẽ đồ cho StackChan');
  await py(KB + 'd = st.load(); d["coins"] = 3000; d["wear"]["on"] = {}; st.save(d); result = 1');
  await reopen('', 1366, 860);
  await js('GardenHome.open("room"); GardenHome.setTab("craft"); return 1;'); await sleep(800);
  ok(/Tự vẽ đồ cho StackChan/.test(await js('const c = document.querySelector("[data-craft-wear]"); return c ? c.textContent : "";')), 'tab Xưởng có lối vào "Tự vẽ đồ cho StackChan"');
  await press('document.querySelector("[data-craft-wear] .kb-btn")'); await sleep(700);
  ok((await js('return GardenHome._state().tab;')) === 'wear', 'nút "Tủ đồ ▸" chuyển sang tab Tủ đồ');
  const wearTab = await js('return [[...document.querySelectorAll("[data-wear-new]")].map((b) => b.textContent + (b.disabled ? "(khoá)" : "")), !!document.querySelector(".kb-h-wear-top .kb-h-life-mini"), document.querySelector(".kb-h-wear-top").textContent];');
  ok(wearTab[0].join(',') === 'Mũ,Mặt,Cổ,Vỏ', 'Tủ đồ có phần Tự vẽ: ' + wearTab[0].join(' · '));
  ok(wearTab[1] && /StackChan sinh hoạt/.test(wearTab[2]), 'thẻ đầu Tủ đồ có cả StackChan sinh hoạt (mặc cùng bộ)');
  await shot('04_tu_do_tu_ve');
  await press('document.querySelector("[data-wear-new=head]")'); await sleep(800);
  const cs = await js('const s = GardenCraft._state(); return [GardenCraft.isOpen(), s.wear, s.gw, s.gh, document.querySelector("#kb-craft .kb-g-title").textContent, document.getElementById("kb-cf-save").textContent];');
  ok(cs[0] && cs[1] === 'head' && cs[2] === 20 && cs[3] === 8, 'Xưởng mở chế độ Mũ, lưới 20 × 8 (' + JSON.stringify(cs.slice(1, 4)) + ')');
  ok(/Mũ cho StackChan/.test(cs[4]) && /Tạo · 200 xu/.test(cs[5]), 'tiêu đề "' + cs[4] + '", nút "' + cs[5] + '"');
  // hình mờ của StackChan ở 3 hàng dưới lưới (đỉnh hộp ở hàng 5 của lưới)
  const guide = await js(`const cv = document.getElementById("kb-cf-grid"), g = cv.getContext("2d"), s = GardenCraft._state(), k = cv.width / s.gw;
    const a = g.getImageData(Math.floor(10 * k), Math.floor(5.5 * k), 1, 1).data, b = g.getImageData(Math.floor(10 * k), Math.floor(0.5 * k), 1, 1).data;
    return [Array.from(a), Array.from(b)];`);
  ok(guide[0][0] + guide[0][1] + guide[0][2] < guide[1][0] + guide[1][1] + guide[1][2] - 60, 'ô trống ở đỉnh hộp có hình mờ của StackChan (tối hơn ô phía trên): ' + JSON.stringify(guide));
  // vẽ vành mũ đỏ bằng chuột thật: hàng 3 (cột 2 → 17) + chóp hàng 1–2 (cột 7 → 12)
  await press('document.querySelector("#kb-cf-pal [data-c=r]")'); await sleep(150);
  const gridAt = (cx, cy) => js(`const cv = document.getElementById("kb-cf-grid"), r = cv.getBoundingClientRect(), s = GardenCraft._state(); return [r.left + (${cx} + 0.5) * s.cell, r.top + (${cy} + 0.5) * s.cell];`);
  async function stroke(y, x0, x1) {
    const a = await gridAt(x0, y); await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: a[0], y: a[1], button: 'left', clickCount: 1 });
    for (let x = x0 + 1; x <= x1; x++) { const b = await gridAt(x, y); await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: b[0], y: b[1], button: 'left', buttons: 1 }); }
    const e = await gridAt(x1, y); await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: e[0], y: e[1], button: 'left', clickCount: 1 });
  }
  await stroke(4, 1, 18); await stroke(3, 6, 13); await stroke(2, 7, 12); await stroke(1, 8, 11);
  await sleep(300);
  const drawn = await js('return GardenCraft._state().px.split("").filter((c) => c === "r").length;');
  ok(drawn >= 30, 'vẽ bằng chuột thật: ' + drawn + ' ô đỏ');
  const prev = await countColor('document.getElementById("kb-cf-prev")', '#ff4f6d');
  ok(prev > 100, 'khung xem trước có mũ đỏ trên cả hai StackChan (' + prev + ' điểm ảnh)');
  const prevMini = await countColor('document.getElementById("kb-cf-prev")', '#ff4f6d', [26 * 3, 0, 24 * 3, 26 * 3]);
  ok(prevMini > 20, 'StackChan sinh hoạt (bên phải khung xem trước) đội mũ tự thu nhỏ (' + prevMini + ' điểm ảnh)');
  await js('document.getElementById("kb-cf-name").value = "Mũ đỏ của tớ"; return 1;');
  await shot('05_xuong_ve_mu');
  let c0 = await coins();
  await press('document.getElementById("kb-cf-save")'); await sleep(600);
  ok(/Tạo mũ mới cho StackChan\?/.test(await js('const a = document.getElementById("kb-ask"); return a && !a.hidden ? a.textContent : "";')), 'hỏi trước khi trả xu: "Tạo mũ mới cho StackChan?"');
  await press('document.querySelector("#kb-ask .kb-ask-yes")'); await sleep(1500);
  const w1 = await py(KB + 'd = st.load(); result = [d["coins"], d["more"]["mywear"], d["wear"]["on"], sorted(k for k in st.load_px() if k.startswith("w"))]');
  ok(w1[0] === c0 - 200, 'trừ 200 xu (' + c0 + ' → ' + w1[0] + ')');
  ok(w1[1].items.w1 && w1[1].items.w1.name === 'Mũ đỏ của tớ' && w1[1].items.w1.slot === 'head' && w1[1].on.head === 'w1' && !w1[2].head && w1[3].join() === 'w1',
    'lưu món w1 (tên, chỗ Mũ), mặc luôn, điểm ảnh ở PX_KEY: ' + JSON.stringify(w1[1]));
  ok(await waitFor('!GardenCraft.isOpen()', 3000), 'lưu xong Xưởng đóng');
  await sleep(500);
  const mascotRed = await countColor('document.getElementById("kb-mascot")', '#ff4f6d', [0, 0, 60, 30]);
  ok(mascotRed > 40, 'linh vật góc trái đội mũ đỏ (' + mascotRed + ' điểm ảnh đỏ phần trên)');
  ok(await js('return !!document.querySelector("[data-mywear=w1].kb-h-using") && /đang mặc/.test(document.querySelector("[data-mywear=w1]").textContent);'), 'thẻ món tự vẽ ghi "đang mặc"');
  await shot('06_tu_do_mu_tu_ve');
  await js('GardenHome.close(); return 1;'); await sleep(300);
  // StackChan sinh hoạt trên cảnh mặc mũ: đứng ở sân (việc không cần đồ), rồi ở trong nhà
  async function lifeHas(scene, hex) {
    await js(`GardenHome.showMain(${JSON.stringify(scene === 'room' ? 'house' : scene)}); GardenLife._force("", ${JSON.stringify(scene)}); return 1;`); await sleep(900);
    await js('GardenLife._snap(); return 1;'); await sleep(900);
    const R = await lifeRect();
    return R ? countColor('document.getElementById("kb-yard")', hex, R) : -1;
  }
  const yardRed = await lifeHas('yard', '#ff4f6d');
  ok(yardRed > 10, 'StackChan sinh hoạt ngoài sân đội mũ tự vẽ (' + yardRed + ' điểm ảnh đỏ)');
  await shot('07_stackchan_san_mu');
  const roomRed = await lifeHas('room', '#ff4f6d');
  ok(roomRed > 10, 'StackChan sinh hoạt trong nhà đội mũ tự vẽ (' + roomRed + ' điểm ảnh đỏ)');
  await shot('08_stackchan_trong_nha_mu');
  // sửa: đổi tên miễn phí, vẽ lại 50 xu
  await js('GardenHome.open("room"); GardenHome.setTab("wear"); return 1;'); await sleep(700);
  await press('[...document.querySelectorAll("[data-mywear=w1] .kb-btn")].find((b) => b.textContent === "Sửa")'); await sleep(700);
  ok(/Lưu · miễn phí/.test(await js('return document.getElementById("kb-cf-save").textContent;')), 'mở lại món: chưa sửa → "Lưu · miễn phí"');
  await js('document.getElementById("kb-cf-name").value = "Mũ đỏ"; return 1;');
  c0 = await coins();
  await press('document.getElementById("kb-cf-save")'); await sleep(1500);
  const ren = await py(KB + 'd = st.load(); result = [d["coins"], d["more"]["mywear"]["items"]["w1"]["name"]]');
  ok(ren[0] === c0 && ren[1] === 'Mũ đỏ' && !(await js('const a = document.getElementById("kb-ask"); return !!(a && !a.hidden);')), 'đổi tên: không hỏi, không trừ xu');
  await press('[...document.querySelectorAll("[data-mywear=w1] .kb-btn")].find((b) => b.textContent === "Sửa")'); await sleep(700);
  await press('document.querySelector("#kb-cf-pal [data-c=y]")'); await sleep(100);
  await stroke(2, 9, 10); await sleep(200);
  ok(/Lưu · 50 xu/.test(await js('return document.getElementById("kb-cf-save").textContent;')), 'vẽ thêm → "Lưu · 50 xu"');
  await press('document.getElementById("kb-cf-save")'); await sleep(600);
  await press('document.querySelector("#kb-ask .kb-ask-yes")'); await sleep(1500);
  ok((await coins()) === c0 - 50, 'vẽ lại: trừ 50 xu');
  ok((await countColor('document.getElementById("kb-mascot")', '#ffd23f', [0, 0, 60, 30])) > 4, 'linh vật đổi hình ngay (có điểm vàng mới)');
  // mua đồ có sẵn cùng chỗ → thay món tự vẽ; StackChan sinh hoạt đội Mũ rơm
  c0 = await coins();
  await press('[...document.querySelectorAll("#kb-h-list .kb-h-card")].find((c) => /Mũ rơm/.test(c.textContent)).querySelector(".kb-h-buy")'); await sleep(600);
  await press('document.querySelector("#kb-ask .kb-ask-yes")'); await sleep(1500);
  const straw = await py(KB + 'd = st.load(); result = [d["coins"], d["wear"]["on"].get("head"), d["more"]["mywear"]["on"].get("head")]');
  ok(straw[0] === c0 - 120 && straw[1] === 'straw' && !straw[2], 'mua Mũ rơm: mặc Mũ rơm, bỏ mũ tự vẽ (' + JSON.stringify(straw) + ')');
  await js('GardenHome.close(); return 1;'); await sleep(300);
  const strawPx = await lifeHas('room', '#f5b971');
  ok(strawPx > 10, 'StackChan sinh hoạt đội Mũ rơm (đồ có sẵn, bản vẽ nhỏ) — ' + strawPx + ' điểm ảnh');
  await shot('09_stackchan_mu_rom');
  // mặc lại món tự vẽ từ Tủ đồ
  await js('GardenHome.open("room"); GardenHome.setTab("wear"); return 1;'); await sleep(700);
  await press('[...document.querySelectorAll("[data-mywear=w1] .kb-btn")].find((b) => b.textContent === "Mặc")'); await sleep(1200);
  const back = await py(KB + 'd = st.load(); result = [d["wear"]["on"].get("head"), d["more"]["mywear"]["on"].get("head")]');
  ok(!back[0] && back[1] === 'w1', 'bấm Mặc ở món tự vẽ: thay Mũ rơm (' + JSON.stringify(back) + ')');
  // vỏ hai màu
  await press('document.querySelector("[data-wear-new=shell]")'); await sleep(800);
  ok(await js('const s = GardenCraft._state(); return s.wear === "shell" && document.getElementById("kb-craft").classList.contains("kb-cf-shellmode") && !document.getElementById("kb-cf-wear").hidden;'), 'Vỏ: chế độ chọn màu (Thân / Viền dưới), ẩn công cụ vẽ');
  await press('document.querySelector("[data-shell=\\"0\\"]")'); await press('document.querySelector("#kb-cf-pal [data-c=g]")'); await sleep(100);
  await press('document.querySelector("[data-shell=\\"1\\"]")'); await press('document.querySelector("#kb-cf-pal [data-c=G]")'); await sleep(200);
  ok(/Tạo · 150 xu/.test(await js('return document.getElementById("kb-cf-save").textContent;')) && (await js('return GardenCraft._state().shell.join("");')) === 'gG', 'chọn thân xanh lá, viền xanh đậm → "Tạo · 150 xu"');
  await shot('10_xuong_vo');
  c0 = await coins();
  await press('document.getElementById("kb-cf-save")'); await sleep(600);
  await press('document.querySelector("#kb-ask .kb-ask-yes")'); await sleep(1500);
  const sh = await py(KB + 'd = st.load(); result = [d["coins"], d["more"]["mywear"]["on"].get("shell"), d["more"]["mywear"]["items"]]');
  ok(sh[0] === c0 - 150 && sh[1] === 'w2' && JSON.stringify(sh[2].w2.c) === '["g","G"]', 'vỏ w2: trừ 150 xu, mặc luôn (' + JSON.stringify(sh[2].w2) + ')');
  ok((await countColor('document.getElementById("kb-mascot")', '#3ccb5e')) > 100, 'linh vật góc trái vỏ xanh lá');
  await js('GardenHome.close(); return 1;'); await sleep(300);
  const greenLife = await lifeHas('room', '#3ccb5e');
  ok(greenLife > 15, 'StackChan sinh hoạt vỏ xanh lá (' + greenLife + ' điểm ảnh)');
  await shot('11_stackchan_vo_xanh');
  // xoá món đang mặc → cởi ra, điểm ảnh xoá khỏi PX_KEY
  await js('GardenHome.open("room"); GardenHome.setTab("wear"); return 1;'); await sleep(700);
  const delSel = '[...document.querySelectorAll("[data-mywear=w1] .kb-btn")].find((b) => /Xoá|xoá/.test(b.textContent))';
  await press(delSel); await sleep(300);
  ok(/Bấm lần nữa để xoá/.test(await js('const b = ' + delSel + '; return b ? b.textContent : "";')), 'Xoá: bấm lần đầu chỉ hỏi lại');
  await press(delSel); await sleep(1200);
  const del = await py(KB + 'd = st.load(); result = [list(d["more"]["mywear"]["items"]), d["more"]["mywear"]["on"], "w1" in st.load_px()]');
  ok(del[0].join() === 'w2' && !del[1].head && del[2] === false, 'xoá w1: chỉ còn vỏ w2, cởi mũ, điểm ảnh xoá (' + JSON.stringify(del) + ')');
  // lệnh cầu nối sai dạng
  const before = await py(KB + 'result = st.load()["coins"]');
  await js(`["craft:wear:null", "craft:wear:[1]", "craft:wear:{\\"slot\\":\\"head\\",\\"px\\":\\"zz\\"}", "craft:wear:{\\"slot\\":\\"hat\\"}", "craft:wear:{\\"slot\\":\\"shell\\",\\"c\\":[\\"#\\",\\"x\\"]}",
    "craft:wear:{\\"slot\\":\\"head\\",\\"px\\":\\"160.\\",\\"id\\":\\"w99\\"}", "home:mywear:del:w999", "home:mywear:del:", "home:wear:on:w999", "home:wear:on:../x", "home:wear:off:hat"].forEach((c) => { try { pycmd(c); } catch (e) { } }); return 1;`);
  await sleep(1500);
  ok((await py(KB + 'result = st.load()["coins"]')) === before && await js('return !!Garden._data();'), '11 lệnh sai dạng (JSON null / mảng, hình hỏng, chỗ lạ, màu lạ, id lạ): không trừ xu, vườn vẫn chạy');
  const errs = await py(KB + 'import aqt\nresult = [str(w) for w in aqt.mw.app.topLevelWidgets() if w.isVisible() and w.__class__.__name__ in ("ErrorHandler", "QMessageBox")]');
  ok(!errs.length, 'Anki không bật hộp lỗi');

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 4. cài mới hoàn toàn trên collection đã ôn Anki lâu (đúng tình huống người dùng hỏi)');
  // xoá mọi dữ liệu ことば畑 trong collection + file sao lưu ở user_files (giữ báo mẫu) → như máy chưa từng cài; lịch sử ôn
  // còn nguyên (40 ngày liền + sáng nay của phần 2)
  const fresh = await py(KB + `col = mw.col
kb._dialog.close() if kb._dialog else None
keys = [k for k in col.all_config().keys() if k.startswith("kotoba_batake")]
for k in keys:
    col.remove_config(k)
ud = os.path.join(kb.ADDON_DIR, "user_files")
gone = [f for f in os.listdir(ud) if f.endswith(".json") and os.path.isfile(os.path.join(ud, f))]
for f in gone:
    os.remove(os.path.join(ud, f))
kb.STREAK_TEST_ALL = False
kb.TOUR_TEST_OFF = False
paid = []
kb.tooltip_real = kb.tooltip
kb.tooltip = lambda msg, *a, **k: paid.append(str(msg))
kb.save_config(show_tooltips=True)
kb._on_profile_open()
kb.tooltip = kb.tooltip_real
kb._paid131 = paid
result = {"keys": len(keys), "files": len(gone), "paid": paid, "stats": kb._daily_stats(), "coins": st.load()["coins"],
          "start": col.get_config(core.START_KEY), "history": col.db.scalar("select count(distinct date(id/1000,'unixepoch','localtime')) from revlog")}`);
  ok(fresh.keys >= 5 && fresh.coins === 0 && fresh.history >= 40, 'collection sạch dữ liệu ことば畑 (' + fresh.keys + ' khoá, ' + fresh.files + ' file), lịch sử ôn còn ' + fresh.history + ' ngày, xu 0');
  ok(fresh.stats.streak === 0 && !!fresh.start, 'mở hồ sơ lần đầu sau khi cài: chuỗi 0, đặt mốc');
  ok(!fresh.paid.length, 'không "bù xu điện thoại" cho lượt ôn trước khi cài' + (fresh.paid.length ? ': ' + fresh.paid.join(' | ') : ''));
  await py(KB + 'kb.save_config(show_tooltips=False); result = 1');
  await reopen(`kb._dialog = None`, 1366, 860);
  await py(KB + 'kb._dialog.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); kb._dialog.refresh(); result = 1'); await sleep(1500);
  const first = await js('const d = Garden._data(); return { tour: d.tour, streak: d.today.streak, reviews: d.today.reviews, coins: d.wallet.coins, txt: document.getElementById("kb-today-text").textContent, news: (d.news && d.news.today || []).map((x) => x.text) };');
  ok(first.tour === true, 'người mới: có hướng dẫn 3 bước');
  ok(first.streak === 0 && !/ngày liền/.test(first.txt) && first.coins === 0, 'thẻ Hôm nay: "' + first.txt + '" — không có chuỗi, 0 xu');
  ok(!first.news.some((t) => /ngày liền/.test(t)), 'Tin làng không nhắc chuỗi cũ: ' + first.news.join(' | ').slice(0, 120));
  await shot('12_cai_moi');
  // ôn một thẻ thật trong vườn (phím R → Space → 3)
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) { GardenTour.close(); } return 1;');
  const key = async (k) => { await page.eval(`(() => { const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document; t.dispatchEvent(new KeyboardEvent("keydown", {key: ${JSON.stringify(k)}, code: ${JSON.stringify(k === ' ' ? 'Space' : 'Key' + k.toUpperCase())}, bubbles: true, cancelable: true})); })()`); await sleep(900); };
  const rv0 = await py('result = mw.col.db.scalar("select count() from revlog")');
  await key('r'); await sleep(1500); await key(' '); await sleep(600); await key('3'); await sleep(1800);
  const rv1 = await py('result = mw.col.db.scalar("select count() from revlog")');
  const afterReview = await py(KB + 'result = [kb._daily_stats(), st.load()["coins"]]');
  ok(rv1 === rv0 + 1 && afterReview[0].streak === 1 && afterReview[1] > 0, 'ôn thẻ đầu tiên trong vườn: chuỗi 1 ngày, có xu (' + afterReview[1] + ')');
  await page.key('Escape', 'Escape', 27); await sleep(500);
  ok(await waitFor('/1 ngày liền/.test(document.getElementById("kb-today-text").textContent)', 5000), 'thẻ Hôm nay ghi "1 ngày liền"');
  await shot('13_cai_moi_on_the_dau');
  await py(KB + 'kb.TOUR_TEST_OFF = True; result = 1');

  // ------------------------------------------------------------------------------------------------------------------
  (page.errors || []).forEach((e) => errors.push(e));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await py(KB + 'kb.guests.rate = kb._rate131; kb.STREAK_TEST_ALL = True; result = 1');
  console.log(`KẾT QUẢ: ${pass}/${total}` + (pass === total ? ' — TẤT CẢ OK' : ''));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); console.log(`KẾT QUẢ: ${pass}/${total} (dừng giữa chừng)`); process.exit(1); });
