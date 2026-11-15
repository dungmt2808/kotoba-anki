// Ảnh phác 1.25 lượt 3 — nội thất v2 của 4 kiểu nhà trên bố cục A (người dùng chọn A, 07/11: "thiết kế lại giao diện bên trong
// từng ngôi nhà đẹp hơn"). Ảnh: dải cảnh 1920 px (có đồ / chưa bày đồ, ngày / đêm) + ảnh phóng ×4 cả nhà.
// Chạy: KB_SCRIPTS=mock_125_noi_that.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_mock_125_noi_that';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const LIB = fs.readFileSync(path.join(__dirname, 'mock_125_lib.js'), 'utf8');
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const KB = 'import sys, os, time, json, shutil\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
async function clipShot(name, x, y, w, h) {
  const s = await page.send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: h, scale: 1 } });
  fs.writeFileSync(SHOTS + '/' + name + '.png', Buffer.from(s.data, 'base64'));
}
async function mock(fn, opts) {
  return js(`let cv = document.getElementById("kb-mock125");
    const y = document.getElementById("kb-yard");
    if (!cv) { cv = document.createElement("canvas"); cv.id = "kb-mock125"; cv.style.position = "absolute"; cv.style.imageRendering = "pixelated"; y.parentNode.insertBefore(cv, y.nextSibling); }
    const yr = y.getBoundingClientRect(), wr = y.parentNode.getBoundingClientRect(), side = document.querySelector(".kb-yard-side").getBoundingClientRect();
    cv.style.left = (yr.left - wr.left - 4) + "px"; cv.style.top = (yr.top - wr.top - 4) + "px";
    const o = Object.assign({ cw: Math.round(yr.width), ch: Math.round(yr.height), avail: Math.round(side.left - yr.left - 8), maxS: Math.round(yr.height / 76) }, ${JSON.stringify(opts)});
    const r = Mock125.${fn}(cv, o);
    return Object.assign(r, { cw: o.cw, ch: o.ch, side: [Math.round(side.left - yr.left), Math.round(side.width), Math.round(side.height)] });`);
}
// thẻ Hôm nay thu gọn: một dòng + thanh tiến độ, rộng 176 px (nằm gọn trong phần vườn bên phải)
const chip = (on) => js(`const t = document.getElementById("kb-today"), l = t.querySelector(".kb-today-list"), tx = document.getElementById("kb-today-text"), w = document.getElementById("kb-weather");
  if (${on}) { if (!tx.dataset.full) { tx.dataset.full = tx.textContent; } l.style.display = "none"; w.style.display = "none"; t.style.minWidth = "0"; t.style.width = "176px";
    tx.textContent = "Hôm nay 0/30 · 3 việc ▾"; }
  else { if (tx.dataset.full) { tx.textContent = tx.dataset.full; } l.style.display = ""; w.style.display = ""; t.style.minWidth = ""; t.style.width = ""; }
  return 1;`);

(async () => {
  await py(KB + `d = st.load(); d["coins"] = 50000; d["home"]["house"] = 7; st.save(d)
kb.open_garden(); result = 1`);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1920, 1080); kb._dialog.refresh(); result = 1'); await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); localStorage.setItem("kb-main-scene", "house"); GardenSeason.preview("momiji"); return 1;');
  await sleep(1500);
  await page.eval(LIB + '; 1');
  const band = async () => js('const r = document.getElementById("kb-yard").getBoundingClientRect(); return [Math.max(0, r.top - 110), r.bottom + 40];');
  const shot = async (name, w) => { const [y0, y1] = await band(); await clipShot(name, 0, y0, w, y1 - y0); };
  const zoom = async (name, opts) => {
    const data = await js(`const cv = document.createElement("canvas"); cv.width = 476 * 4; cv.height = 88 * 4;
      const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
      Mock125.house(ctx, 4, 10, 0, Object.assign({ v2: true, sideWin: false, deco: false }, ${JSON.stringify(opts)}));
      Mock125.posts(ctx, 4, 10, 0, ${JSON.stringify(opts.style)});
      return cv.toDataURL("image/png");`);
    fs.writeFileSync(SHOTS + '/' + name + '.png', Buffer.from(data.split(',')[1], 'base64'));
  };
  const STY = ['classic', 'minka', 'teahouse', 'castle'];
  for (const s of STY) { await mock('stripA', { style: s, deco: true, v2: true }); await sleep(300); await shot('N_' + s + '_ngay', 1920); }
  for (const s of STY) { await mock('stripA', { style: s, deco: false, v2: true, items: false }); await sleep(300); await shot('N_' + s + '_trong', 1920); }
  for (const s of STY) { await zoom('Z_' + s + '_x4', { style: s }); await zoom('Z_' + s + '_x4_trong', { style: s, items: false }); }
  await js('GardenSky.set("fixedHour", 21); return 1;'); await sleep(1500);
  for (const s of STY) { await mock('stripA', { style: s, deco: true, v2: true }); await sleep(300); await shot('N_' + s + '_dem', 1920); }
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
