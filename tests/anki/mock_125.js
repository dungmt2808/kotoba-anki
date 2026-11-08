// Ảnh phác 1.25 (chưa phải mã thật): nhà 3 gian cùng phong cách theo kiểu nhà, dải "Trong nhà" kín bề ngang, ba gian
// đặt tránh thẻ Hôm nay, chưa mở rộng (một biển giá chung), ẩn dây trang trí mùa, thẻ "Mở rộng nhà" một lần, nút trong ⚙.
// Vẽ bằng hàm vẽ thật của add-on (GardenHome._lib) + tests/anki/mock_125_lib.js, phủ lên dải cảnh ở màn chính thật.
// Chạy: KB_SCRIPTS=mock_125.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_mock_125';
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
// phủ ảnh phác lên dải cảnh (thẻ Hôm nay, nút ◂ ▸ vẫn nằm trên)
async function mock(opts) {
  return js(`let cv = document.getElementById("kb-mock125");
    const y = document.getElementById("kb-yard");
    if (!cv) { cv = document.createElement("canvas"); cv.id = "kb-mock125"; cv.style.position = "absolute"; cv.style.imageRendering = "pixelated"; y.parentNode.insertBefore(cv, y.nextSibling); }
    const yr = y.getBoundingClientRect(), wr = y.parentNode.getBoundingClientRect(), side = document.querySelector(".kb-yard-side").getBoundingClientRect();
    cv.style.left = (yr.left - wr.left - 4) + "px"; cv.style.top = (yr.top - wr.top - 4) + "px";
    const S0 = Math.round(yr.height / 76);
    const o = Object.assign({ cw: Math.round(yr.width), ch: Math.round(yr.height), avail: Math.round(side.left - yr.left - 8), maxS: S0 }, ${JSON.stringify(opts)});
    const r = Mock125.strip(cv, o);
    return Object.assign(r, { cw: o.cw, ch: o.ch, avail: o.avail });`);
}

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
  const info = {};
  const top = async () => js('const r = document.getElementById("kb-yard").getBoundingClientRect(); return [Math.max(0, r.top - 110), r.bottom + 40];');

  // 1920 × 1080: 4 kiểu nhà, ban ngày, dây trang trí mùa đang hiện
  for (const s of ['classic', 'minka', 'teahouse', 'castle']) {
    info[s] = await mock({ style: s, deco: true });
    await sleep(400);
    const [y0, y1] = await top();
    await clipShot('125_a_' + s + '_ngay', 0, y0, 1920, y1 - y0);
  }
  // ban đêm (21 giờ): gỗ mái đỏ, minka
  await js('GardenSky.set("fixedHour", 21); return 1;'); await sleep(1200);
  for (const s of ['classic', 'minka']) {
    await mock({ style: s, deco: true }); await sleep(400);
    const [y0, y1] = await top();
    await clipShot('125_b_' + s + '_dem', 0, y0, 1920, y1 - y0);
  }
  await js('GardenSky.set("fixedHour", 10); return 1;'); await sleep(800);
  // ẩn dây trang trí mùa: dải trên cùng cửa sổ + dây trong nhà
  await js('const b = document.getElementById("kb-theme-band"); if (b) b.style.visibility = "hidden"; return 1;');
  await mock({ style: 'classic', deco: false }); await sleep(400);
  { const [y0, y1] = await top(); await clipShot('125_c_an_day_trang_tri', 0, 0, 1920, y1); }
  await js('const b = document.getElementById("kb-theme-band"); if (b) b.style.visibility = ""; return 1;');
  // chưa mở rộng: hai gian bên cùng tối, một biển giá chung
  await mock({ style: 'classic', deco: true, locked: true }); await sleep(400);
  { const [y0, y1] = await top(); await clipShot('125_d_chua_mo_rong', 0, y0, 1920, y1 - y0); }
  await mock({ style: 'minka', deco: true, locked: true }); await sleep(400);
  { const [y0, y1] = await top(); await clipShot('125_d_chua_mo_rong_minka', 0, y0, 1920, y1 - y0); }

  // 1366 × 768
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1500);
  info.w1366 = await mock({ style: 'classic', deco: true }); await sleep(400);
  { const [y0, y1] = await top(); await clipShot('125_e_1366_go_mai_do', 0, y0, 1366, y1 - y0); }
  info.w1366_teahouse = await mock({ style: 'teahouse', deco: true }); await sleep(400);
  { const [y0, y1] = await top(); await clipShot('125_e_1366_nha_tra', 0, y0, 1366, y1 - y0); }
  await mock({ style: 'classic', deco: true, locked: true }); await sleep(400);
  { const [y0, y1] = await top(); await clipShot('125_e_1366_chua_mo_rong', 0, y0, 1366, y1 - y0); }

  // tab Xây nhà: một thẻ "Mở rộng nhà: Bếp + Phòng ngủ" (ảnh nhỏ cả nhà theo kiểu nhà)
  await js('const c = document.getElementById("kb-mock125"); if (c) c.remove(); GardenHome.open("room"); document.querySelector("#kb-home .kb-h-tab[data-tab=build]").click(); return 1;'); await sleep(800);
  await js(`const cards = [...document.querySelectorAll(".kb-h-room")]; if (!cards.length) return 0;
    const c = cards[0]; cards.slice(1).forEach((x) => x.remove());
    const pv = document.createElement("canvas"); pv.width = 456; pv.height = 88; pv.className = "kb-h-house"; pv.style.width = "228px"; pv.style.imageRendering = "pixelated";
    const ctx = pv.getContext("2d"); ctx.imageSmoothingEnabled = false; Mock125.house(ctx, 1, 0, 0, { style: "classic", deco: false });
    c.replaceChild(pv, c.querySelector("canvas"));
    c.querySelector(".kb-h-name").textContent = "Mở rộng nhà: Bếp + Phòng ngủ";
    c.querySelector(".kb-h-desc").textContent = "Mở cả hai gian hai bên phòng chính. Ba gian cùng kiểu với nhà đang dùng; đổi kiểu nhà thì đổi cả ba gian.";
    c.querySelector(".kb-h-price").textContent = "2000 xu";
    const hd = c.parentNode.previousElementSibling; if (hd && /Mở rộng nhà/.test(hd.textContent)) { hd.textContent = "Mở rộng nhà · một lần mở cả Bếp lẫn Phòng ngủ"; }
    [...document.querySelectorAll("#kb-h-list *")].filter((e) => e.children.length === 0 && /mở gian nào trước/.test(e.textContent)).forEach((e) => { e.textContent = "Mở rộng nhà · một lần mở cả Bếp lẫn Phòng ngủ"; });
    const l = document.getElementById("kb-h-list"); l.scrollTop = c.offsetTop - l.offsetTop - 30; window.scrollTo(0, 0); return 1;`);
  await sleep(500);
  { const r = await js('const l = document.getElementById("kb-h-list").getBoundingClientRect(); return [l.left, l.top, l.width, Math.min(330, l.height)];'); await clipShot('125_f_the_mo_rong_nha', r[0], r[1], r[2], r[3]); }
  // ⚙ → Giao diện → Màn chính: "Dây trang trí mùa: Hiện / Ẩn"
  await js('GardenHome.close(); GardenUI.open(); return 1;'); await sleep(800);
  await js(`const rows = [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio")]; const r0 = rows.find((r) => /Cảnh hiện/.test(r.textContent));
    if (!r0) return 0; const n = r0.cloneNode(true); n.querySelector(".kb-ui-l").textContent = "Dây trang trí";
    const ops = n.querySelectorAll(".kb-ui-opt"); ops[0].lastChild.textContent = " Hiện"; ops[1].lastChild.textContent = " Ẩn (dải trên cùng, sân, trong nhà)";
    ops[0].classList.add("is-on"); ops[1].classList.remove("is-on"); n.style.outline = "3px dashed #ff4f6d"; r0.parentNode.insertBefore(n, r0.nextSibling); n.scrollIntoView({ block: "center" }); return 1;`);
  await sleep(500);
  { const r = await js('const e = document.getElementById("kb-ui-stage").getBoundingClientRect(); return [e.left, e.top, e.width, Math.min(e.height, 560)];'); await clipShot('125_g_nut_an_day_trang_tri', r[0], r[1], r[2], r[3]); }
  fs.writeFileSync(SHOTS + '/info.json', JSON.stringify(info, null, 1));
  console.log(JSON.stringify(info));
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
