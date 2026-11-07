// 1.25 — nhà 3 gian làm lại trong Anki thật:
//   chưa mở rộng: hai gian bên tối như nhau, vườn hai bên, nhà giữa dải · một thẻ "Mở rộng nhà" (bấm đúp chỉ trừ 2.000 xu, mở cả
//   hai gian) · sau khi mở hai gian cùng sáng · 4 kiểu nhà × 3 gian đổi theo kiểu (màn chính + bảng Nhà + ảnh nhỏ ở tab Xây nhà) ·
//   hình nền 1920 × 1080 nguyên nhà (vườn kín khung) · ⚙ → Màn chính → "Dây trang trí: Ẩn" (dải trên cùng, dây trong nhà,
//   lưu cấu hình, mở lại vẫn ẩn) · ban đêm · cửa sổ 1366 / 1024 / 720 × 520.
// Chạy: KB_SCRIPTS=e2e_125.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_125';
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
const PHOTO = '/tmp/kb_photo_125_' + CTRL + '.png';
async function click(x, y) {
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}
const home = () => py(KB + 'h = st.load()["home"]; result = {"rooms": h.get("rooms"), "style": h.get("style"), "coins": st.load()["coins"]}');
// màu tại điểm (ax, ay) toạ độ nghệ thuật của nhà trên dải cảnh màn chính; ax < 0 / > 456: phần vườn
const STRIP_PX = `const cv = document.getElementById("kb-yard"), c = cv.getContext("2d"), v = GardenHome._mainView(), d = cv.width / cv.getBoundingClientRect().width;
  const at = (ax, ay) => { const p = c.getImageData(Math.round((v.ox + ax + 0.5) * v.S * d), Math.round((v.oy + ay + 0.5) * v.S * d), 1, 1).data; return [p[0], p[1], p[2]]; };
  const lum = (p) => Math.round(0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]);
  const avg = (ax, ay, w, h) => { let s = 0, n = 0; for (let x = ax; x < ax + w; x += 2) { for (let y = ay; y < ay + h; y += 2) { s += lum(at(x, y)); n++; } } return Math.round(s / n); };`;
const strip = (body) => js(STRIP_PX + body);
const sig = () => strip('return [[20, 32], [72, 60], [200, 30], [150 + 30, 60], [330, 32], [384, 60]].map(([x, y]) => at(x, y).join(",")).join(" ");');

(async () => {
  await py(KB + `d = st.load(); d["coins"] = 10000; d["home"]["house"] = 7; d["home"]["room"] = []
d["home"]["styles"] = ["minka", "teahouse", "castle"]; d["home"]["style"] = "classic"
d["home"]["owned"].update({"plant": 1, "kotatsu": 1})
st.save(d)
os.environ["KB_TEST_PHOTO"] = "${PHOTO}"
kb.save_config(ui={})
kb.open_garden(); result = 1`);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1920, 1080); kb._dialog.refresh(); result = 1'); await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); localStorage.setItem("kb-main-scene", "house"); GardenSeason.preview("momiji"); return 1;');
  await sleep(1500);

  console.log('== chưa mở rộng (1920 × 1080): nhà giữa dải, vườn hai bên, hai gian bên tối như nhau');
  ok(/Trong nhà/.test(await js('return document.getElementById("kb-yard-name").textContent;')), 'màn chính đang ở "Trong nhà"');
  const geo = await js('const v = GardenHome._mainView(), cv = document.getElementById("kb-yard"), w = cv.getBoundingClientRect().width / v.S; return [v.S, v.ox, Math.round(w - v.ox - 456), v.oy, v.house];');
  ok(geo[4] && geo[0] === 3 && Math.abs(geo[1] - geo[2]) <= 1, 'cả nhà ×3 nằm giữa dải: lề trái ' + geo[1] + ' / lề phải ' + geo[2] + ' điểm ảnh, phía trên ' + geo[3]);
  const garden = await strip('const L = [at(-40, 15), at(-40, 70)], R = [at(470, 15), at(470, 70)]; return [L, R];');
  const sky = (p) => p[2] > p[0] && p[2] > 150, grass = (p) => p[1] > p[0] && p[1] > p[2] && p[1] > 120;
  ok(sky(garden[0][0]) && sky(garden[1][0]) && grass(garden[0][1]) && grass(garden[1][1]),
     'hai bên là vườn (trời trên / cỏ dưới), không còn nền gỗ tối: ' + JSON.stringify(garden));
  let L3 = await strip('return [avg(20, 72, 100, 14), avg(190, 72, 80, 14), avg(332, 72, 100, 14)];');     // dưới biển giá
  ok(L3[0] < 90 && L3[2] < 90 && Math.abs(L3[0] - L3[2]) < 20 && L3[1] > 110, 'Bếp / Phòng ngủ tối như nhau, phòng chính sáng (sàn ' + L3.join(' / ') + ')');
  await page.shot(SHOTS + '/125_01_chua_mo_rong.png');

  console.log('== tab Xây nhà: một thẻ "Mở rộng nhà", bấm đúp chỉ trừ 2.000 xu');
  const kx = await strip('const r = cv.getBoundingClientRect(); return [r.left + (v.ox + 60) * v.S, r.top + (v.oy + 60) * v.S];');
  await click(kx[0], kx[1]); await sleep(900);
  ok(await js('return !document.getElementById("kb-home").hidden && document.querySelector("#kb-home .kb-h-tab.is-on").getAttribute("data-tab") === "build";'), 'bấm Bếp chưa mở → Nhà & Cửa hàng ở tab Xây nhà');
  const card = await js('const c = document.querySelectorAll(".kb-h-nha"); return [c.length, document.querySelectorAll(".kb-h-room").length, c[0] ? c[0].textContent : "", c[0] ? c[0].querySelectorAll("canvas.kb-h-house3").length : 0];');
  ok(card[0] === 1 && card[1] === 1 && /Bếp \+ Phòng ngủ/.test(card[2]) && /2000 xu/.test(card[2]) && card[3] === 1, 'một thẻ "Mở rộng nhà: Bếp + Phòng ngủ · 2000 xu" có ảnh nhỏ cả nhà');
  ok(await js('return /một lần mở cả Bếp lẫn Phòng ngủ/.test(document.getElementById("kb-h-list").textContent);'), 'tiêu đề nhóm: "một lần mở cả Bếp lẫn Phòng ngủ"');
  await js('const l = document.getElementById("kb-h-list"), c = document.querySelector(".kb-h-nha"); l.scrollTop = c.offsetTop - l.offsetTop - 8; window.scrollTo(0, 0); return 1;'); await sleep(300);
  await page.shot(SHOTS + '/125_02_the_mo_rong.png');
  await js('const b = document.querySelector(".kb-h-nha .kb-h-buy"); b.click(); b.click(); return 1;'); await sleep(1500);
  let h = await home();
  ok(h.coins === 8000 && JSON.stringify(h.rooms) === '["kitchen","bedroom"]', 'bấm đúp "Mở rộng": mở cả hai gian, chỉ trừ 2.000 xu (còn ' + h.coins + ')');
  const btns = await js('return [...document.querySelectorAll(".kb-h-nha .kb-h-buy")].map(b => b.textContent);');
  ok(btns.length === 2 && /Bếp/.test(btns[0]) && /Phòng ngủ/.test(btns[1]) && /Đã mở/.test(await js('return document.querySelector(".kb-h-nha").textContent;')),
     'thẻ đổi thành "Đã mở" + nút ' + btns.join(' / '));
  const scenes = await js('return [...document.querySelectorAll(".kb-h-scene")].map(b => b.textContent);');
  ok(scenes.indexOf('Bếp') >= 0 && scenes.indexOf('Phòng ngủ') >= 0, 'nút cảnh có cả Bếp và Phòng ngủ: ' + scenes.join(' · '));
  ok(await js('return document.querySelectorAll("#kb-h-list canvas.kb-h-house3").length;') === 5, 'tab Xây nhà: 5 ảnh nhỏ nhà 3 gian (thẻ Mở rộng + 4 kiểu nhà)');
  const prev = await js(`return [...document.querySelectorAll("#kb-h-list .kb-h-card canvas.kb-h-house3")].slice(1).map((cv) => { const p = cv.getContext("2d").getImageData(20, 30, 1, 1).data; return p.slice(0, 3).join(","); });`);
  ok(prev.length === 4 && new Set(prev).size === 4, 'ảnh nhỏ của 4 kiểu nhà khác nhau (tường Bếp): ' + prev.join(' | '));

  console.log('== sau khi mở: hai gian cùng sáng; 4 kiểu nhà × 3 gian đổi theo kiểu');
  await js('GardenHome.close(); return 1;'); await sleep(1200);
  L3 = await strip('return [avg(30, 60, 80, 20), avg(190, 60, 80, 20), avg(340, 60, 80, 20)];');
  ok(L3[0] > 110 && L3[2] > 110, 'Bếp, Phòng ngủ đã sáng như phòng chính (sàn ' + L3.join(' / ') + ')');
  const sigs = {};
  for (const s of ['classic', 'minka', 'teahouse', 'castle']) {
    await py(KB + `st.use_style("${s}"); kb._dialog.refresh(); result = 1`); await sleep(1800);
    await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSeason.preview("momiji"); return 1;'); await sleep(500);
    sigs[s] = (await sig()).split(' ');
    await page.shot(SHOTS + '/125_03_kieu_' + s + '.png');
  }
  const per = [0, 1, 2, 3, 4, 5].map((i) => new Set(Object.values(sigs).map((a) => a[i])).size);
  ok(per.every((n) => n === 4), 'mỗi điểm đo (tường / sàn của Bếp, phòng chính, Phòng ngủ) đổi theo cả 4 kiểu nhà: ' + per.join(' '));
  h = await home();
  ok(JSON.stringify(h.rooms) === '["kitchen","bedroom"]' && h.coins === 8000, 'đổi kiểu nhà không mất gian, không trừ thêm xu');
  await js('GardenHome.open("kitchen"); return 1;'); await sleep(1000);
  const panelA = await js('const cv = document.getElementById("kb-home-canvas"), p = cv.getContext("2d").getImageData(Math.round(cv.width * 0.5), Math.round(cv.height * 0.2), 1, 1).data; return [cv.width / cv.height, p.slice(0, 3).join(",")];');
  await py(KB + 'st.use_style("minka"); kb._dialog.refresh(); result = 1'); await sleep(1800);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenHome.open("kitchen"); return 1;'); await sleep(1000);
  const panelB = await js('const cv = document.getElementById("kb-home-canvas"), p = cv.getContext("2d").getImageData(Math.round(cv.width * 0.5), Math.round(cv.height * 0.2), 1, 1).data; return [cv.width / cv.height, p.slice(0, 3).join(",")];');
  ok(Math.abs(panelA[0] - 144 / 88) < 0.02 && panelA[1] !== panelB[1], 'bảng Nhà ở Bếp (144 × 88) đổi nền theo kiểu nhà: ' + panelA[1] + ' → ' + panelB[1]);
  await page.shot(SHOTS + '/125_04_bang_bep_minka.png');
  await js('GardenHome.close(); return 1;'); await sleep(600);
  await py(KB + 'st.use_style("classic"); kb._dialog.refresh(); result = 1'); await sleep(1800);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSeason.preview("momiji"); return 1;'); await sleep(500);

  console.log('== hình nền nguyên nhà (1920 × 1080)');
  await py(KB + `p = "${PHOTO}"
if os.path.exists(p): os.remove(p)
result = 1`);
  await js('document.getElementById("kb-yard-snap").click(); return 1;'); await sleep(400);
  await js('document.querySelector("#kb-snap-pop [data-snap=wall]").click(); return 1;'); await sleep(2500);
  const wall = await py(KB + `from aqt.qt import QImage
p = "${PHOTO}"
if os.path.exists(p):
    im = QImage(p)
    def c(x, y):
        v = im.pixelColor(x, y); return [v.red(), v.green(), v.blue()]
    result = {"size": [im.width(), im.height()], "tl": c(5, 5), "bl": c(5, 1070), "tr": c(1914, 5), "mid": c(960, 640)}
else:
    result = None`);
  ok(wall && wall.size[0] === 1920 && wall.size[1] === 1080 && sky(wall.tl) && sky(wall.tr) && grass(wall.bl),
     'hình nền 1920 × 1080: trời ở hai góc trên, cỏ ở góc dưới (không còn gỗ tối): ' + JSON.stringify(wall));

  console.log('== ⚙ → Màn chính → Dây trang trí');
  const garl0 = await strip('let s = 0; for (let x = 4; x < 452; x += 3) { s += lum(at(x, 7)); } return s;');
  await js('GardenUI.open(); return 1;'); await sleep(800);
  const row = await js('const r = [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio")].find((x) => /Dây trang trí/.test(x.textContent)); if (!r) return null; const ins = r.querySelectorAll("input"); return [ins.length, ins[0].checked, r.textContent];');
  ok(row && row[0] === 2 && row[1] && /Hiện/.test(row[2]) && /Ẩn \(dải trên cùng, sân, trong nhà\)/.test(row[2]), 'có dòng "Dây trang trí: Hiện / Ẩn", mặc định Hiện');
  await js('const r = [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio")].find((x) => /Dây trang trí/.test(x.textContent)); r.scrollIntoView({ block: "center" }); return 1;'); await sleep(200);
  await page.shot(SHOTS + '/125_05_nut_day_trang_tri.png');
  await js('const r = [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio")].find((x) => /Dây trang trí/.test(x.textContent)); r.querySelectorAll("input")[1].click(); return 1;'); await sleep(800);
  ok(await py(KB + 'result = kb.config().get("ui", {}).get("deco")') === 'off', 'lưu cấu hình ui.deco = "off"');
  await js('document.getElementById("kb-ui-exit").click(); return 1;'); await sleep(1200);
  let dc = await js('const a = document.getElementById("kb-app"); return [document.getElementById("kb-theme-band").hidden, a.classList.contains("kb-ui-deco-off"), getComputedStyle(a).paddingTop, a.classList.contains("kb-themed")];');
  ok(dc[0] && dc[1] && dc[2] === '14px' && dc[3], 'Ẩn: dải trên cùng ẩn, không chừa chỗ (padding ' + dc[2] + '), giao diện mùa vẫn bật');
  const garl1 = await strip('let s = 0; for (let x = 4; x < 452; x += 3) { s += lum(at(x, 7)); } return s;');
  ok(garl0 !== garl1, 'dây trang trí trong nhà biến mất (dòng điểm ảnh dưới xà đổi: ' + garl0 + ' → ' + garl1 + ')');
  await page.shot(SHOTS + '/125_06_an_day_trang_tri.png');
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(2000);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSeason.preview("momiji"); return 1;'); await sleep(800);
  dc = await js('return [document.getElementById("kb-theme-band").hidden, document.getElementById("kb-app").classList.contains("kb-ui-deco-off")];');
  ok(dc[0] && dc[1], 'mở lại vườn: vẫn ẩn');
  await js('GardenUI.open(); return 1;'); await sleep(600);
  await js('const r = [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio")].find((x) => /Dây trang trí/.test(x.textContent)); r.querySelectorAll("input")[0].click(); return 1;'); await sleep(600);
  await js('document.getElementById("kb-ui-exit").click(); return 1;'); await sleep(1200);
  dc = await js('return [document.getElementById("kb-theme-band").hidden, document.getElementById("kb-app").classList.contains("kb-ui-deco-off")];');
  const garl2 = await strip('let s = 0; for (let x = 4; x < 452; x += 3) { s += lum(at(x, 7)); } return s;');
  ok(!dc[0] && !dc[1] && garl2 === garl0 && await py(KB + 'result = kb.config().get("ui", {}).get("deco")') === 'on', 'bật lại Hiện: dải trên cùng + dây trong nhà trở lại, cấu hình "on"');

  console.log('== ban đêm');
  const dayG = await strip('return [lum(at(-40, 70)), avg(190, 60, 80, 20)];');
  await js('GardenSky.set("fixedHour", 22); return 1;'); await sleep(1500);
  const nightG = await strip('return [lum(at(-40, 70)), avg(190, 60, 80, 20)];');
  ok(nightG[0] < dayG[0] - 30 && nightG[1] > nightG[0], 'đêm: vườn tối hẳn (' + dayG[0] + ' → ' + nightG[0] + '), trong nhà vẫn sáng hơn vườn (' + nightG[1] + ')');
  await page.shot(SHOTS + '/125_07_dem.png');
  await js('GardenSky.set("fixedHour", 10); return 1;'); await sleep(800);

  console.log('== cửa sổ 1366 / 1024 / 720 × 520');
  for (const [w, hh, S] of [[1366, 768, 2], [1024, 700, 2], [720, 520, 1]]) {
    await py(KB + `kb._dialog.resize(${w}, ${hh}); result = 1`); await sleep(1600);
    const g = await js('const v = GardenHome._mainView(), cv = document.getElementById("kb-yard"), r = cv.getBoundingClientRect(), w = r.width / v.S; return [v.S, v.ox, Math.round(w - v.ox - 456), document.documentElement.scrollWidth - window.innerWidth];');
    const side = await strip('return [at(-9, 62), at(465, 62)];');      // ngoài tường ngoài (cột 4 điểm ảnh)
    const green = (p) => p[1] > p[0] && p[1] > p[2];
    ok(g[0] === S && Math.abs(g[1] - g[2]) <= 1 && g[3] <= 1 && (g[1] < 4 || (green(side[0]) && green(side[1]))),
       w + ' px: ×' + g[0] + ', nhà giữa (lề ' + g[1] + ' / ' + g[2] + '), không tràn ngang, hai bên là cỏ ' + JSON.stringify(side));
    await page.shot(SHOTS + '/125_08_' + w + '.png');
  }
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(800);

  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total + (pass === total ? ' đạt' : ' CÓ LỖI'));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
