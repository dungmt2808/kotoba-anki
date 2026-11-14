// 1.24 — nhà 3 gian trong Anki thật: Trong nhà ở ◂ ▸ màn chính (cả nhà, gian chưa mở tối + biển giá), bấm gian chưa mở →
// tab Xây nhà, Mở rộng (bấm đúp chỉ trừ một lần), bảng Nhà chuyển gian, Nội thất nhóm Bếp / Phòng ngủ, mua + đặt tủ lạnh
// trong Bếp, đặt đồ từ Kho vào Bếp, ảnh chụp nguyên nhà, ban đêm, cửa sổ nhỏ.
// 1.25: mở rộng nhà một lần được cả hai gian → phần "Mở rộng" đổi theo (một thẻ, mở cả Bếp lẫn Phòng ngủ); chi tiết ở e2e_125.js.
// Chạy: KB_SCRIPTS=e2e_124.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_124';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
const KB = 'import sys, os, time, json, shutil\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const PHOTO = '/tmp/kb_photo_124_' + CTRL + '.png';
const keyJS = (k) => js(`document.dispatchEvent(new KeyboardEvent("keydown", {key: ${JSON.stringify(k)}, bubbles: true, cancelable: true})); return 1;`);
async function click(x, y) {
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
// tâm ô (x, y) của cảnh trong nhà đang xem ở bảng Nhà (y = 0: tường, 1–3: sàn)
const roomCell = (x, y) => js(`window.scrollTo(0, 0); const cv = document.getElementById("kb-home-canvas"), r = cv.getBoundingClientRect();
  const sc = document.querySelector(".kb-h-scene.is-on").getAttribute("data-scene"), art = r.width / (sc === "room" ? 160 : 144);
  const ay = ${y} === 0 ? 20 : 40 + (${y} - 1) * 16 + 8; return [r.left + (${x} * 16 + 8) * art, r.top + ay * art];`);
const home = () => py(KB + 'h = st.load()["home"]; result = {"rooms": h.get("rooms"), "kitchen": h.get("kitchen"), "bedroom": h.get("bedroom"), "room": h["room"], "coins": st.load()["coins"]}');

(async () => {
  await py(KB + `d = st.load(); d["coins"] = 10000; d["home"]["house"] = 7
d["home"]["owned"].update({"plant": 2, "tea": 1, "clock": 1})
d["home"]["room"] = []
st.save(d)
os.environ["KB_TEST_PHOTO"] = "${PHOTO}"
kb.open_garden(); result = 1`);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  const errs0 = [];
  await py(KB + 'kb._dialog.resize(1366, 768); kb._dialog.refresh(); result = 1'); await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); localStorage.setItem("kb-main-scene", "yard"); return 1;');
  await sleep(600);

  console.log('== màn chính: Trong nhà (cả nhà 3 gian) ở ◂ ▸');
  await keyJS('ArrowRight'); await sleep(900);
  ok(await js('return localStorage.getItem("kb-main-scene");') === 'house', 'phím → từ Sân vườn sang Trong nhà (cả nhà)');
  ok(/Trong nhà/.test(await js('return document.getElementById("kb-yard-name").textContent;')), 'tên cảnh: Trong nhà');
  await page.shot(SHOTS + '/124_01_man_chinh_trong_nha.png');
  const dark = await js(`const cv = document.getElementById("kb-yard"), c = cv.getContext("2d"), d = window.devicePixelRatio || 1;
    const px = (fx) => { const p = c.getImageData(Math.round(cv.width * fx), Math.round(cv.height * 0.85), 1, 1).data; return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]; };
    return [Math.round(px(0.2)), Math.round(px(0.5)), Math.round(px(0.8))];`);
  ok(dark[0] < 90 && dark[2] < 90 && dark[1] > 110, 'Bếp, Phòng ngủ chưa mở thì tối; phòng chính sáng (độ sáng sàn ' + dark.join(' / ') + ')');

  console.log('== bấm gian chưa mở: không mở bảng (1.31), chú thích chỉ tab Xây nhà; nút → tab Xây nhà, Mở rộng nhà');
  const kx = await js('const r = document.getElementById("kb-yard").getBoundingClientRect(); return [r.left + r.width * 0.2, r.top + r.height * 0.6];');
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: kx[0], y: kx[1] }); await sleep(300);
  ok(/mở rộng nhà ở tab Xây nhà/.test(await js('return document.getElementById("kb-yard").title;')), 'rê chuột lên gian chưa mở: "mở rộng nhà ở tab Xây nhà"');
  await click(kx[0], kx[1]); await sleep(900);
  ok(await js('return document.getElementById("kb-home").hidden;'), 'bấm gian chưa mở: không mở bảng Nhà (1.31)');
  await js('document.getElementById("kb-yard-home").click(); return 1;'); await sleep(900);
  await js('GardenHome.setTab("build"); return 1;'); await sleep(500);
  ok(await js('return !document.getElementById("kb-home").hidden && document.querySelector("#kb-home .kb-h-tab.is-on").getAttribute("data-tab") === "build";'), 'nút “Nhà & Cửa hàng ▸” → tab Xây nhà');
  ok(await js('return document.querySelectorAll(".kb-h-room").length === 1 && /Bếp \\+ Phòng ngủ/.test(document.querySelector(".kb-h-nha").textContent);'), '1.25: một thẻ "Mở rộng nhà · Bếp + Phòng ngủ"');
  await js('const l = document.getElementById("kb-h-list"), c = document.querySelector(".kb-h-nha"); l.scrollTop = c.offsetTop - l.offsetTop - 8; window.scrollTo(0, 0); return 1;'); await sleep(300);
  await page.shot(SHOTS + '/124_02_xay_nha_mo_rong.png');
  await js('const b = document.querySelector(".kb-h-nha .kb-h-buy"); b.click(); b.click(); return 1;'); await sleep(1500);
  let h = await home();
  ok(h.coins === 8000 && JSON.stringify(h.rooms) === '["kitchen","bedroom"]', 'bấm đúp "Mở rộng": mở cả Bếp lẫn Phòng ngủ, chỉ trừ 2.000 xu (còn ' + h.coins + ')');
  ok(await js('return [...document.querySelectorAll(".kb-h-scene")].some(b => b.textContent === "Bếp") && [...document.querySelectorAll(".kb-h-scene")].some(b => b.textContent === "Phòng ngủ") && ![...document.querySelectorAll(".kb-h-scene")].some(b => /Mở rộng/.test(b.textContent));'),
     'nút cảnh: có "Bếp" và "Phòng ngủ"');

  console.log('== Bếp: mua + đặt tủ lạnh, đặt chậu cây từ Kho');
  await js('[...document.querySelectorAll(".kb-h-scene")].find(b => b.textContent === "Bếp").click(); return 1;'); await sleep(600);
  ok(await js('return document.querySelector(".kb-h-scene.is-on").getAttribute("data-scene");') === 'kitchen', 'chuyển sang gian Bếp');
  const cw = await js('const cv = document.getElementById("kb-home-canvas"); return [cv.width, cv.height];');
  ok(Math.abs(cw[0] / cw[1] - 144 / 88) < 0.02, 'khung Bếp 9 ô (144 × 88): ' + cw.join(' × '));
  await js('document.querySelector("#kb-home .kb-h-tab[data-tab=room]").click(); return 1;'); await sleep(500);
  const secs = await js('return [...document.querySelectorAll("#kb-h-list .kb-h-sec")].map(x => x.textContent);');
  ok(secs.some(t => /^Phòng chính/.test(t)) && secs.some(t => /^Bếp/.test(t)) && secs.some(t => /^Phòng ngủ/.test(t)), 'tab Nội thất chia nhóm: ' + secs.join(' | '));
  await js('const c = [...document.querySelectorAll("#kb-h-list .kb-h-card")].find(x => x.querySelector(".kb-h-name").textContent.startsWith("Tủ lạnh")); c.querySelector(".kb-h-buy").click(); return 1;');
  await sleep(1500);
  ok(await py(KB + 'result = st.load()["home"]["owned"].get("reizouko")') === 1, 'mua tủ lạnh');
  let pt = await roomCell(0, 1);
  await click(pt[0], pt[1]); await sleep(1200);
  h = await home();
  ok((h.kitchen || []).some(e => e.id === 'reizouko' && e.x === 0 && e.y === 1), 'mua xong bấm ô (0, 1) của Bếp → đặt tủ lạnh trong Bếp');
  await js('document.querySelector("#kb-home .kb-h-tab[data-tab=inv]").click(); return 1;'); await sleep(500);
  await js('const c = [...document.querySelectorAll("#kb-h-list .kb-h-card")].find(x => x.querySelector(".kb-h-name").textContent === "Chậu cây"); c.querySelector(".kb-h-place").click(); return 1;'); await sleep(300);
  pt = await roomCell(4, 2);
  await click(pt[0], pt[1]); await sleep(1200);
  h = await home();
  ok((h.kitchen || []).some(e => e.id === 'plant' && e.x === 4 && e.y === 2), 'Kho đồ → Đặt chậu cây khi đang xem Bếp → đặt vào Bếp');
  pt = await roomCell(1, 0);
  await js('const c = [...document.querySelectorAll("#kb-h-list .kb-h-card")].find(x => x.querySelector(".kb-h-name").textContent === "Đồng hồ"); c.querySelector(".kb-h-place").click(); return 1;'); await sleep(300);
  await click(pt[0], pt[1]); await sleep(1200);
  h = await home();
  ok((h.kitchen || []).some(e => e.id === 'clock' && e.y === 0), 'đồ treo tường cũ (đồng hồ) treo trên tường Bếp');
  await page.shot(SHOTS + '/124_03_bep.png');

  console.log('== Phòng ngủ + đồ mới, thú nuôi đi khắp nhà');
  await py(KB + `for k in ("beddo", "nightlamp", "hoshizora", "tansu", "nagashi", "shokutaku", "suihanki", "shokkidana"):
    st.buy(k)
st.place("bedroom", "beddo", 0, 3); st.place("bedroom", "nightlamp", 2, 2); st.place("bedroom", "hoshizora", 3, 0); st.place("bedroom", "tansu", 7, 1)
st.place("kitchen", "nagashi", 2, 1); st.place("kitchen", "shokutaku", 5, 3); st.place("kitchen", "suihanki", 6, 1); st.place("kitchen", "shokkidana", 5, 0)
d = st.load(); d["coins"] += 5000; st.save(d)
try:
    st.pet_buy("neko")
except Exception:
    pass
try:
    st.pet_move("neko", "room")
except Exception:
    pass
kb._dialog.refresh(); result = 1`); await sleep(1500);
  h = await home();
  ok(JSON.stringify(h.rooms) === '["kitchen","bedroom"]' && h.bedroom.length === 4, 'mở Phòng ngủ, bày giường / đèn ngủ / dây đèn sao / tủ áo');
  await js('[...document.querySelectorAll(".kb-h-scene")].find(b => b.textContent === "Phòng ngủ").click(); return 1;'); await sleep(800);
  await page.shot(SHOTS + '/124_04_phong_ngu.png');
  await js('GardenHome.close(); return 1;'); await sleep(800);
  await js('localStorage.setItem("kb-main-scene", "house"); return 1;'); await sleep(1200);
  await page.shot(SHOTS + '/124_05_ca_nha_ngay.png');
  ok(await js('return /Trong nhà/.test(document.getElementById("kb-yard-name").textContent);'), 'màn chính: cả nhà 3 gian');
  await js('GardenSky.set("fixedHour", 22); return 1;'); await sleep(1500);
  await page.shot(SHOTS + '/124_06_ca_nha_dem.png');
  await js('GardenSky.set("fixedHour", 10); return 1;'); await sleep(600);

  console.log('== ảnh chụp nguyên nhà');
  await py(KB + `p = "${PHOTO}"
if os.path.exists(p): os.remove(p)
result = 1`);
  await js('document.getElementById("kb-yard-snap").click(); return 1;'); await sleep(400);
  ok(/Trong nhà/.test(await js('return document.getElementById("kb-snap-scene").textContent;')), 'hộp chụp ảnh: cảnh "Trong nhà"');
  await js('document.querySelector("#kb-snap-pop [data-snap=s]").click(); return 1;'); await sleep(1500);
  const ph = await py(KB + `import struct
p = "${PHOTO}"
if os.path.exists(p):
    b = open(p, "rb").read(32); result = list(struct.unpack(">II", b[16:24]))
else:
    result = None`);
  ok(ph && ph[0] > 900 && ph[0] / ph[1] > 4, 'ảnh cỡ thường của cả nhà: ' + (ph ? ph.join(' × ') : 'không có file'));

  console.log('== bấm gian đã mở trên màn chính: không mở bảng (1.31); nút mở bảng Nhà, chọn Phòng ngủ ở hàng cảnh');
  const bx = await js('const r = document.getElementById("kb-yard").getBoundingClientRect(); return [r.left + r.width * 0.68, r.top + r.height * 0.6];');
  await click(bx[0], bx[1]); await sleep(900);
  ok(await js('return document.getElementById("kb-home").hidden;'), 'bấm Phòng ngủ trên màn chính: không mở bảng Nhà (1.31)');
  await js('document.getElementById("kb-yard-home").click(); return 1;'); await sleep(900);
  await js('const b = [...document.querySelectorAll(".kb-h-scene")].find((x) => x.getAttribute("data-scene") === "bedroom"); if (b) { b.click(); } return 1;'); await sleep(600);
  ok(await js('return !document.getElementById("kb-home").hidden && document.querySelector(".kb-h-scene.is-on").getAttribute("data-scene");') === 'bedroom', 'nút → bảng Nhà, chọn Phòng ngủ');

  console.log('== thanh trên của Nhà ở 1024 px (đủ Trong nhà · Bếp · Phòng ngủ)');
  await py(KB + 'kb._dialog.resize(1024, 700); result = 1'); await sleep(1200);
  await page.shot(SHOTS + '/124_08_thanh_tren_1024.png');
  const top1024 = await js('const t = document.querySelector("#kb-home .kb-game-top"); const b = document.getElementById("kb-h-snap").getBoundingClientRect(), x = document.getElementById("kb-h-exit").getBoundingClientRect(); return [t.scrollWidth, t.clientWidth, b.right <= x.left + 1 || b.top >= x.bottom - 1, [b.left, b.top, b.right, b.bottom].map(Math.round), [x.left, x.top, x.right, x.bottom].map(Math.round)];');
  console.log('   ' + JSON.stringify(top1024));
  ok(top1024[0] <= top1024[1] + 1 && top1024[2], 'thanh trên không tràn, "Chụp ảnh" không đè "Thoát" (' + top1024.slice(0, 2).join(' / ') + ')');

  console.log('== cửa sổ nhỏ (720 × 520)');
  await py(KB + 'kb._dialog.resize(720, 520); result = 1'); await sleep(1500);
  await page.shot(SHOTS + '/124_07_cua_so_nho.png');
  const fit = await js(`const cv = document.getElementById("kb-home-canvas").getBoundingClientRect(), list = document.getElementById("kb-h-list").getBoundingClientRect();
    return { over: document.documentElement.scrollWidth - window.innerWidth, cvIn: cv.right <= window.innerWidth + 1 && cv.width > 100, list: Math.round(list.height) };`);
  ok(fit.over <= 1 && fit.cvIn && fit.list >= 100, 'không tràn ngang, khung Phòng ngủ vừa, danh sách còn ' + fit.list + ' px');
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(800);

  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total + (pass === total ? ' đạt' : ' CÓ LỖI'));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
