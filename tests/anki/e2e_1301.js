// 1.30.1 trong Anki thật — các việc người dùng nêu 14/11 sau khi xem 1.30 trên máy thật:
//   1. Hỏi trước khi trả xu (tự bật lại hộp hỏi: kb.ASK_TEST_OFF = False): bấm đúp bằng chuột thật vào "Mua" chỉ mở hộp,
//      không trừ xu; lần bấm thứ hai trong 0,45 giây không mua / không đóng hộp; Thôi; Esc chỉ đóng hộp (bảng Nhà vẫn mở);
//      Enter / nút Mua → trừ đúng giá + vào chế độ đặt; bấm nền mờ = Thôi; ⚙ tắt → mua ngay; Tường & sàn, vé giữ chuỗi
//      (Lịch hoa), gánh hàng rong, Xưởng chế tác cũng hỏi (đổi tên miễn phí thì không).
//   2. Tường & sàn: ở Bếp, ô "Theo kiểu nhà" vẽ sàn Bếp (khác phòng chính), có "Sàn phòng chính" miễn phí → bấm Dùng cho Bếp:
//      không trừ xu, sàn Bếp thành sàn gỗ (đo điểm ảnh ở màn chính); phòng chính có "Sàn Bếp"; Phòng ngủ không có ô trùng.
//   3. Thu gọn bảng Hôm nay: nút ở hàng nút góc dải cảnh, bảng ẩn, nút ghi số lượt, lưu ui.today, mở lại vườn vẫn thu gọn,
//      nút "–" trên bảng; ở cảnh Trong nhà 1366 px: mở thì bảng che Phòng ngủ, thu gọn thì không che gì.
//   4. Liên hệ: ⚙ có email + nút Góp ý qua email (không mở được chương trình thư → chép địa chỉ); cửa sổ Báo lỗi có email +
//      nút Gửi email….
//   5. Khách đi bộ ở dải cảnh rộng vào từ mép phải, không đi ngang qua nhà.
// Chạy: KB_SCRIPTS=e2e_1301.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1301';
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
  await sleep(600);
}
async function mouse(x, y, count) {
  for (const c of count === 2 ? [1, 2] : [1]) {
    for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: c }); }
  }
}
async function center(sel) {
  return js(`const e = ${sel}; if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];`);
}
const askOpen = () => js('const a = document.getElementById("kb-ask"); return !!(a && !a.hidden);');
const askText = () => js('const a = document.getElementById("kb-ask"); return a ? a.textContent : "";');
async function shot(name) { await page.shot(SHOTS + '/1301_' + name + '.png'); }
// nút Mua của thẻ đồ đầu tiên còn mua được trong danh sách Nhà (theo chữ trên nút)
const BUY = (label) => `[...document.querySelectorAll("#kb-h-list .kb-h-buy")].find((b) => b.textContent === ${JSON.stringify(label || 'Mua')} && !b.disabled)`;

(async () => {
  await py(KB + `kb.ASK_TEST_OFF = False
d = st.load(); d["coins"] = 100000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        pass
st.open_rooms()
d = st.load(); d["coins"] = 5000; st.save(d)
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
result = 1`);
  await reopen('', 1366, 860);

  console.log('== 1. hỏi trước khi trả xu');
  ok(await js('return !Garden._data().ask_off && GardenUI.glob("buyask") === "on";'), 'mặc định bật (kịch bản này tắt ASK_TEST_OFF)');
  await js('GardenHome.open("room"); GardenHome.setTab("room"); return 1;'); await sleep(700);
  let c0 = await coins();
  let at = await center(BUY());
  const item = await js(`const b = ${BUY()}; return b.closest(".kb-h-card").querySelector(".kb-h-name").firstChild.textContent;`);
  await mouse(at[0], at[1], 2); await sleep(250);
  ok(await askOpen() && (await coins()) === c0, 'bấm đúp chuột thật vào Mua (' + item + '): chỉ mở hộp hỏi, chưa trừ xu');
  ok(new RegExp('Mua ' + item + '\\?').test(await askText()) && /Giá \d+ xu · còn lại/.test(await askText()), 'hộp ghi tên món, giá và số xu còn lại: ' + (await askText()).slice(0, 80));
  await shot('01_hoi_mua');
  await sleep(400);
  const no = await center('document.querySelector("#kb-ask .kb-ask-no")');
  await mouse(no[0], no[1]); await sleep(300);
  ok(!(await askOpen()) && (await coins()) === c0, 'Thôi → đóng hộp, không trừ xu');
  // bấm Mua rồi bấm ngay nút đồng ý (< 0,45 giây) → chưa mua, hộp vẫn mở
  at = await center(BUY());
  await mouse(at[0], at[1]);
  const yes = await center('document.querySelector("#kb-ask .kb-ask-yes")');
  await mouse(yes[0], yes[1]); await sleep(120);
  ok(await askOpen() && (await coins()) === c0, 'bấm đồng ý ngay sau khi hộp hiện (< 0,45 giây): bỏ qua, hộp vẫn mở');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(!(await askOpen()) && await js('return GardenHome.isOpen();') && (await coins()) === c0, 'Esc: chỉ đóng hộp, bảng Nhà vẫn mở');
  // nền mờ: bấm sau 0,45 giây = Thôi
  at = await center(BUY()); await mouse(at[0], at[1]); await sleep(600);
  await mouse(8, 8); await sleep(300);
  ok(!(await askOpen()) && (await coins()) === c0, 'bấm ra nền mờ = Thôi');
  // Enter → mua, trừ đúng giá, vào chế độ đặt
  const price = await js(`const b = ${BUY()}; return Number((b.closest(".kb-h-card").querySelector(".kb-h-price").textContent.match(/(\\d+) xu/) || [])[1]);`);
  at = await center(BUY()); await mouse(at[0], at[1]); await sleep(600);
  await page.key('Enter', 'Enter', 13); await sleep(1200);
  ok((await coins()) === c0 - price && !(await askOpen()), 'Enter → mua, trừ đúng ' + price + ' xu');
  ok(await waitFor('!!GardenHome._state().placing', 3000), 'mua xong vào chế độ đặt như trước');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  // nút Mua trong hộp
  c0 = await coins();
  at = await center(BUY()); await mouse(at[0], at[1]); await sleep(600);
  const y2 = await center('document.querySelector("#kb-ask .kb-ask-yes")'); await mouse(y2[0], y2[1]); await sleep(1200);
  ok((await coins()) < c0, 'bấm nút Mua trong hộp (sau 0,45 giây) → mua');
  if (await js('return !!GardenHome._state().placing;')) { await page.key('Escape', 'Escape', 27); await sleep(300); }
  // ⚙ tắt → mua ngay
  await js('GardenUI.setGlob("buyask", "off"); return 1;'); await sleep(500);
  ok((await py(KB + 'result = (kb._cfg() if hasattr(kb, "_cfg") else kb.mw.addonManager.getConfig("kotoba_batake")).get("ui", {}).get("buyask")')) === 'off', 'tắt ở ⚙ → config ui.buyask = off');
  c0 = await coins();
  at = await center(BUY()); await mouse(at[0], at[1]); await sleep(1200);
  ok(!(await askOpen()) && (await coins()) < c0, 'đang tắt: bấm Mua là mua ngay (như bản cũ)');
  if (await js('return !!GardenHome._state().placing;')) { await page.key('Escape', 'Escape', 27); await sleep(300); }
  await js('GardenUI.setGlob("buyask", "on"); return 1;'); await sleep(400);

  console.log('== 2. tường & sàn theo kiểu nhà');
  await js('GardenHome.close(); return 1;'); await sleep(300);
  await js('GardenHome.open("kitchen"); GardenHome.setTab("room"); return 1;'); await sleep(600);
  await js('document.querySelector(\'[data-roomview="decor"]\').click(); return 1;'); await sleep(700);
  const names = await js('return [...document.querySelectorAll("[data-decor^=\\"floor:\\"] .kb-h-name")].map((n) => n.firstChild.textContent);');
  ok(names[0] === 'Theo kiểu nhà' && names[1] === 'Sàn Phòng chính' && names.indexOf('Sàn Bếp') < 0, 'Bếp: Theo kiểu nhà + "Sàn Phòng chính" (không có Sàn Bếp trùng): ' + names.slice(0, 3).join(' · '));
  const swK = await js('return document.querySelector(\'[data-decor="floor:"] canvas\').toDataURL();');
  const swR = await js('return document.querySelector(\'[data-decor="floor:f_hroom"] canvas\').toDataURL();');
  ok(swK !== swR, 'ô "Theo kiểu nhà" ở Bếp vẽ sàn Bếp (khác sàn phòng chính) — trước 1.30.1 luôn vẽ sàn phòng chính');
  await shot('02_bep_san');
  c0 = await coins();
  await page.click('[data-decor="floor:f_hroom"] .kb-h-buy'); await sleep(900);
  ok(!(await askOpen()) && (await coins()) === c0 && (await py(KB + 'result = st.load()["more"]["decor"]["use"]["kitchen"]')).floor === 'f_hroom',
    'Dùng cho Bếp: không hỏi, không trừ xu, Bếp lát sàn phòng chính');
  ok(await js('return /Đang dùng/.test(document.querySelector(\'[data-decor="floor:f_hroom"]\').textContent);'), 'thẻ "Sàn Phòng chính" ghi Đang dùng');
  await js('GardenHome.setScene ? GardenHome.setScene("room") : 0; return 1;'); await sleep(500);
  if (!(await js('return GardenHome._state().scene === "room";'))) { await js('GardenHome.close(); GardenHome.open("room"); GardenHome.setTab("room"); return 1;'); await sleep(500); await js('document.querySelector(\'[data-roomview="decor"]\').click(); return 1;'); await sleep(500); }
  ok(await js('return !!document.querySelector(\'[data-decor="floor:f_hkitchen"]\') && !document.querySelector(\'[data-decor="floor:f_hroom"]\');'), 'Phòng chính: có "Sàn Bếp", không có ô trùng');
  // mua giấy dán tường cũng hỏi
  c0 = await coins();
  const wp = await js('const b = [...document.querySelectorAll("[data-decor^=\\"wall:w_\\"] .kb-h-buy")].find((x) => x.textContent === "Mua" && !x.disabled); b.id = "kb-t-wall"; return Number(b.closest(".kb-h-card").querySelector(".kb-h-price").textContent.match(/(\\d+)/)[1]);');
  await page.click('#kb-t-wall'); await sleep(250);
  ok(await askOpen() && /giấy dán tường/.test(await askText()) && (await coins()) === c0, 'mua giấy dán tường: hỏi trước');
  await sleep(400); await page.key('Enter', 'Enter', 13); await sleep(1200);
  ok((await coins()) === c0 - wp && !!(await py(KB + 'result = st.load()["more"]["decor"]["use"]["room"].get("wall")')), 'đồng ý → −' + wp + ' xu, dán luôn cho phòng chính');
  await js('GardenHome.close(); return 1;'); await sleep(300);
  // đo điểm ảnh: sàn Bếp ở màn chính giờ cùng màu với sàn phòng chính
  await js('GardenHome.showMain("house"); return 1;'); await sleep(1500);
  const px = await js(`const v = GardenHome._mainView(), cv = document.getElementById("kb-yard"), g = cv.getContext("2d"), dpr = window.devicePixelRatio || 1;
    const at = (x, y) => Array.from(g.getImageData(Math.round((v.ox + x) * v.S * dpr), Math.round((v.oy + y) * v.S * dpr), 1, 1).data).slice(0, 3).join(",");
    return [at(70, 84), at(228, 84)];`);
  ok(px[0] && px[1] && px[0].split(',')[0] > 150, 'màn chính: sàn Bếp là gỗ sáng (điểm ảnh ' + px[0] + ' · phòng chính ' + px[1] + ')');
  await shot('03_nha_tron_san');

  console.log('== 3. thu gọn bảng Hôm nay');
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(900);
  const overlap = () => js(`const t = document.getElementById("kb-today"), v = GardenHome._mainView(), cv = document.getElementById("kb-yard");
    if (!t || !t.offsetParent) return 0; const a = t.getBoundingClientRect(), c = cv.getBoundingClientRect();
    const hx0 = c.left + v.ox * v.S, hx1 = c.left + (v.ox + 456) * v.S;
    return Math.max(0, Math.min(a.right, hx1) - Math.max(a.left, hx0));`);
  const ov1 = await overlap();
  ok(ov1 > 50, 'Trong nhà 1366 × 768, bảng mở: che ngôi nhà ' + Math.round(ov1) + ' px (đúng điều người dùng thấy)');
  ok(await js('const b = document.getElementById("kb-today-tog"), s = document.getElementById("kb-yard-snap"); return !!b && b.offsetParent && Math.abs(b.getBoundingClientRect().top - s.getBoundingClientRect().top) < 3;'),
    'nút thu gọn nằm cùng hàng với nút chụp ảnh (góc dưới bên trái dải cảnh)');
  await page.click('#kb-today-tog'); await sleep(600);
  ok(!(await js('return !!document.getElementById("kb-today").offsetParent;')) && (await overlap()) === 0, 'bấm → bảng thu gọn, không che nhà');
  const lab = await js('return document.querySelector("#kb-today-tog .kb-today-tog-t").textContent;');
  ok(/^\d+\/\d+$/.test(lab), 'nút ghi số lượt hôm nay: "' + lab + '"');
  ok((await py(KB + 'result = kb.mw.addonManager.getConfig("kotoba_batake").get("ui", {}).get("today")')) === 'mini', 'lưu ui.today = mini (theo máy)');
  await shot('04_thu_gon');
  await reopen('', 1366, 768);
  ok(!(await js('return !!document.getElementById("kb-today").offsetParent;')), 'đóng / mở lại vườn: vẫn thu gọn');
  await page.click('#kb-today-tog'); await sleep(600);
  ok(await js('return !!document.getElementById("kb-today").offsetParent;'), 'bấm lần nữa → bảng hiện lại');
  await page.click('#kb-today-hide'); await sleep(600);
  ok(!(await js('return !!document.getElementById("kb-today").offsetParent;')), 'nút "–" trên bảng → thu gọn');
  await page.click('#kb-today-tog'); await sleep(500);

  console.log('== 4. liên hệ');
  await page.click('#kb-sound');
  await sleep(300);
  ok(await js('return /maitrongdung10@gmail\\.com/.test(document.getElementById("kb-sound-pop").textContent) && !!document.getElementById("kb-mail");'), '⚙: dòng góp ý / báo lỗi có email + nút Góp ý qua email');
  await py(KB + 'os.environ["KB_TEST_NO_MAIL"] = "1"\nfrom aqt.qt import QApplication\nQApplication.clipboard().setText("")\nresult = 1');
  await js('document.getElementById("kb-mail").click(); return 1;'); await sleep(800);
  ok((await py(KB + 'from aqt.qt import QApplication\nresult = QApplication.clipboard().text()')) === 'maitrongdung10@gmail.com', 'không mở được chương trình thư → chép sẵn địa chỉ email');
  await js('document.getElementById("kb-sound-pop").hidden = true; return 1;');
  const rep = await py(KB + `dlg = kb.show_report(kb._dialog, {})
from aqt.qt import QLabel, QPushButton
labs = [l.text() for l in dlg.findChildren(QLabel)]
btns = [b.text() for b in dlg.findChildren(QPushButton)]
dlg.close()
result = {"labs": labs, "btns": btns}`);
  ok(rep.labs.some((t) => /maitrongdung10@gmail\.com/.test(t)) && rep.btns.indexOf('Gửi email…') >= 0, 'cửa sổ Báo lỗi: email + nút Gửi email… (' + rep.btns.join(' · ') + ')');
  await py(KB + 'os.environ.pop("KB_TEST_NO_MAIL", None)\nresult = 1');

  console.log('== 5. Lịch hoa, gánh hàng rong, Xưởng cũng hỏi');
  c0 = await coins();
  await js('GardenCal.open({}); return 1;'); await waitFor('document.querySelector(".kb-cal-freeze-buy:not([disabled])")', 6000);
  await page.click('.kb-cal-freeze-buy'); await sleep(250);
  ok(await askOpen() && /vé giữ chuỗi/.test(await askText()), 'Lịch hoa → Mua vé giữ chuỗi: hỏi trước');
  await sleep(400); await page.key('Enter', 'Enter', 13); await sleep(1200);
  ok((await coins()) === c0 - 150, 'đồng ý → −150 xu');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  await reopen('kb.cal_today = (lambda: datetime.date.fromisoformat("2026-11-18"))', 1366, 860);       // thứ Tư: có gánh hàng
  c0 = await coins();
  await js('GardenFinds.openPed(); return 1;'); await sleep(500);
  const pb = await js('const b = [...document.querySelectorAll(".kb-ped-buy")].find((x) => !x.disabled && / xu$/.test(x.textContent)); if (!b) return null; b.id = "kb-t-ped"; return Number(b.textContent.match(/(\\d+)/)[1]);');
  if (pb) {
    await page.click('#kb-t-ped'); await sleep(250);
    ok(await askOpen() && /gánh hàng/.test(await askText()) && (await coins()) === c0, 'gánh hàng rong: hỏi trước');
    await sleep(400); await page.key('Enter', 'Enter', 13); await sleep(1200);
    ok((await coins()) === c0 - pb, 'đồng ý → −' + pb + ' xu');
  } else { ok(false, 'không thấy món nào mua được ở gánh hàng'); }
  await js('if (GardenFinds.closePed) GardenFinds.closePed(); return 1;'); await sleep(300);      // (Esc khi không còn bảng nào = đóng cửa sổ vườn)
  if (await js('return !!GardenHome._state().placing;')) { await page.key('Escape', 'Escape', 27); await sleep(300); }
  await js('GardenHome.close(); return 1;'); await sleep(300);
  // Xưởng: chế tác món mới
  await js('GardenHome.open("yard"); GardenHome.setTab("craft"); return 1;'); await sleep(600);
  await js('const b = [...document.querySelectorAll("#kb-h-list .kb-h-buy")].find((x) => x.textContent === "Mở xưởng" && !x.disabled); b.click(); return 1;'); await sleep(700);
  const g = await js('const r = document.getElementById("kb-cf-grid").getBoundingClientRect(); return [r.left, r.top, r.width / 16];');
  for (let i = 0; i < 6; i++) { await mouse(g[0] + g[2] * (5 + i + 0.5), g[1] + g[2] * 8.5); }
  c0 = await coins();
  await page.click('#kb-cf-save'); await sleep(250);
  ok(await askOpen() && /Chế tác món mới/.test(await askText()), 'Xưởng → Chế tác: hỏi trước (sau khi đã kiểm hình)');
  await sleep(400); await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(!(await askOpen()) && await js('return !document.getElementById("kb-craft").hidden;') && (await coins()) === c0, 'Esc: chỉ đóng hộp, Xưởng vẫn mở, chưa trừ xu');
  await page.click('#kb-cf-save'); await sleep(600); await page.key('Enter', 'Enter', 13); await sleep(1500);
  ok((await coins()) < c0, 'đồng ý → món mới được làm, trừ xu');
  await js('if (typeof GardenCraft !== "undefined" && GardenCraft.isOpen && GardenCraft.isOpen()) GardenCraft.close(); GardenHome.close(); return 1;'); await sleep(400);

  console.log('== 6. khách đi bộ không đi ngang qua nhà');
  await py(KB + 'kb._dialog.resize(1920, 1080); result = 1'); await sleep(900);
  await js('GardenHome.showMain("yard"); GardenGuests._clear("yard"); GardenGuests._force("yard", "neko"); return 1;');
  const xs = [];
  for (let k = 0; k < 40; k++) { await sleep(250); const v = await js('const a = GardenGuests._vis("yard"); return a ? a.x : null;'); if (v !== null) { xs.push(v); } }
  const vis = await js('const v = GardenHome._mainView(), cw = document.getElementById("kb-yard").clientWidth; return cw / v.S - v.ox;');
  ok(xs.length > 10 && xs[0] > 256 && xs.every((x) => x > 66), 'mèo hoang vào từ mép phải (x đầu ' + Math.round(xs[0]) + ', mép thấy ' + Math.round(vis) + '), không lúc nào đè lên nhà (x nhỏ nhất ' + Math.round(Math.min(...xs)) + ')');
  await shot('05_khach');

  console.log('== 7. lỗi');
  (page.errors || []).forEach((e) => errors.push(e));
  ok(errors.length === 0, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const log = await py(KB + 'result = [(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-8:]');
  ok(!log.length, 'nhật ký lỗi add-on trống' + (log.length ? ': ' + JSON.stringify(log) : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total);
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); try { page && page.close(); } catch (x) { } process.exit(2); });
