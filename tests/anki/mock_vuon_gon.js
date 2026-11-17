// Ảnh phác "vườn đỡ rối mắt" (17/11, người dùng: "nếu vườn cây có nhiều cây quá thì có vẻ nhìn hơi rối mắt … còn cách nào
// khác không" → "vẽ thử được không"). Chưa phải mã thật: dựng lại ruộng bằng chính Garden.render của add-on với thứ tự cây
// khác, rồi vẽ đè lối đi / nhãn / lớp mờ. Vườn mẫu 300 cây: demo_nhieu_cay.py.
// Chạy (ANKI_PY = venv aqt):
//   B=/tmp/kb_vuon; ./setup_demo.sh $B ../../kotoba_batake && $ANKI_PY demo_nhieu_cay.py $B/Test/collection.anki2
//   (./run_anki.sh $B 9333 $B.log &) ; (mở vườn ở deck "Lớn::300 từ", cửa sổ 1366×1200) ; node mock_vuon_gon.js OUT
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_vuon';
fs.mkdirSync(OUT, { recursive: true });

const LIB = `
var MV = window.MV || (function () {
  const $ = (id) => document.getElementById(id);
  const S = { base: null, grass: null };
  const css = '.mv-x{position:fixed;z-index:50;pointer-events:none}' +
    '.mv-path{background:repeating-linear-gradient(90deg,#c9a46a 0 10px,#bf9a60 10px 20px);border-top:2px solid #a07a48;border-bottom:2px solid #a07a48}' +
    '.mv-tag{background:var(--kb-paper,#fffaf0);border:2px solid var(--kb-ink,#4a3426);border-radius:4px;padding:1px 8px;font:bold 13px sans-serif;color:var(--kb-ink,#4a3426);white-space:nowrap}' +
    '.mv-tag.is-drop{background:#e3f1ff}' +
    '.mv-sign{background:#c98f55;border:2px solid #6b4226;color:#fff7e6;border-radius:3px;padding:0 7px;font:bold 12px sans-serif;white-space:nowrap;box-shadow:0 2px 0 #6b4226}' +
    '.mv-sign.is-drop{background:#7fb6e6;color:#16324a;border-color:#2c5f8a;box-shadow:0 2px 0 #2c5f8a}' +
    '.mv-post{background:#6b4226;width:4px}' +
    '.mv-dim{background:rgba(94,211,94,.72)}' +
    '.mv-hl{outline:3px solid #e0544e !important;outline-offset:2px;border-radius:4px}' +
    '.mv-orch{position:relative;display:flex;align-items:center;gap:10px;padding:6px 10px;margin:0 0 6px;background:#fff7e0;border:2px solid var(--kb-ink,#4a3426);border-radius:6px;font:13px sans-serif;color:var(--kb-ink,#4a3426)}' +
    '.mv-orch b{font-size:14px}';
  function ensure() { if (!$("mv-css")) { const s = document.createElement("style"); s.id = "mv-css"; s.textContent = css; document.head.appendChild(s); } }
  function geo() { const L = Garden._layout(), cv = $("kb-canvas").getBoundingClientRect(); return { cw: 18 * L.scale, ch: 20 * L.scale, cols: L.cols, x: cv.left, y: cv.top, w: cv.width }; }
  function clear() { document.querySelectorAll(".mv-x").forEach((e) => e.remove()); document.querySelectorAll(".mv-hl").forEach((e) => e.classList.remove("mv-hl")); }
  function init() {
    ensure();
    if (!S.base) {
      S.base = Garden._data();
      S.orig = S.base.plants.slice();
      const g = geo(), cv = $("kb-canvas");
      const last = Math.floor(cv.height / g.ch) * g.cols - 1;          // ô cỏ trống cuối ruộng
      const c = document.createElement("canvas"); c.width = g.cw; c.height = g.ch;
      c.getContext("2d").drawImage(cv, (last % g.cols) * g.cw, Math.floor(last / g.cols) * g.ch, g.cw, g.ch, 0, 0, g.cw, g.ch);
      S.grass = c;
    }
  }
  // vẽ ruộng với danh sách cây arr (mục {ph:true} = ô cỏ trống); trả vị trí từng ô
  function draw(arr) {
    clear();
    const d = Object.assign({}, S.base, { plants: arr });
    Garden.render(d);
    const cv = $("kb-canvas"), ctx = cv.getContext("2d"), g = geo();
    arr.forEach((p, i) => { if (p.ph) { ctx.drawImage(S.grass, (i % g.cols) * g.cw, Math.floor(i / g.cols) * g.ch); } });
    return g;
  }
  const PH = () => ({ ph: true, nid: 1, stage: 0, word: "" });
  function pad(arr, cols) { while (arr.length % cols) { arr.push(PH()); } }
  // luống: [[nhãn, cây…], …] → mỗi luống bắt đầu hàng mới, lối đi + nhãn ở mép trên luống
  // kiểu ngăn luống: path (dải đất — người dùng thấy không đẹp), sign (chỉ biển gỗ), stones (đá lát cách quãng), flowers (viền hoa)
  let STYLE = "path";
  function sepCanvas(g, rowsY, style) {
    const cv = document.createElement("canvas"), f = $("kb-canvas").getBoundingClientRect(), s = Garden._layout().scale;
    cv.className = "mv-x"; cv.width = Math.round(f.width); cv.height = Math.round(f.height);
    Object.assign(cv.style, { left: f.left + "px", top: f.top + "px", width: f.width + "px", height: f.height + "px" });
    const x = cv.getContext("2d");
    const px = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w * s, h * s); };
    rowsY.forEach((yy) => {
      const y = yy - f.top;
      if (style === "stones") {
        for (let a = 130 + 20, k = 0; a < f.width - 20; a += 64 + (k % 3) * 10, k++) {
          const w = 6 + (k % 2), yo = y + (k % 2) * s;
          px("#7d776f", a, yo + s, w, 2); px("#a8a29a", a + s, yo, w - 2, 2); px("#c9c3ba", a + 2 * s, yo, 2, 1);
        }
      } else if (style === "flowers") {
        const cols = ["#ff8fb0", "#ffd84a", "#ffffff", "#c9a0ff"];
        for (let a = 130 + 10, k = 0; a < f.width - 16; a += 30 + (k % 4) * 6, k++) {
          const c = cols[k % cols.length], yo = y + 2 * s + ((k * 7) % 3 - 1) * s;
          px("#3b9c3b", a + s, yo + 2 * s, 1, 1);
          px(c, a + s, yo - s, 1, 1); px(c, a, yo, 1, 1); px(c, a + 2 * s, yo, 1, 1); px(c, a + s, yo + s, 1, 1); px("#ffb300", a + s, yo, 1, 1);
        }
      }
    });
    document.body.appendChild(cv);
  }
  function beds(groups, opts) {
    opts = opts || {};
    init();
    const cols = geo().cols, arr = [], starts = [];
    for (let i = 0; i < (opts.lead || 0) * cols; i++) { arr.push(PH()); }        // hàng chừa trống ở đầu ruộng
    groups.forEach(([label, list, cls]) => { if (!list.length) { return; } starts.push([arr.length / cols, label, cls]); list.forEach((p) => arr.push(p)); pad(arr, cols); });
    const g = draw(arr);
    const style = opts.style || STYLE;
    if (style === "stones" || style === "flowers") { sepCanvas(g, starts.slice(1).map(([row]) => g.y + row * g.ch), style); }
    starts.forEach(([row, label, cls], k) => {
      const y = g.y + row * g.ch;
      if (style === "path") {
        if (k > 0) { const p = document.createElement("div"); p.className = "mv-x mv-path"; Object.assign(p.style, { left: g.x + "px", top: (y - 5) + "px", width: g.w + "px", height: "10px" }); document.body.appendChild(p); }
        const t = document.createElement("div"); t.className = "mv-x mv-tag" + (cls ? " " + cls : ""); t.textContent = label;
        Object.assign(t.style, { left: (g.x + 8) + "px", top: (y - 11) + "px" }); document.body.appendChild(t);
        return;
      }
      // biển gỗ nhỏ cắm ở đầu luống (cột gỗ + tấm biển), không có dải đất
      const post = document.createElement("div"); post.className = "mv-x mv-post"; Object.assign(post.style, { left: (g.x + 26) + "px", top: (y + 2) + "px", height: "12px" });
      document.body.appendChild(post);
      const t = document.createElement("div"); t.className = "mv-x mv-sign" + (cls ? " " + cls : ""); t.textContent = label;
      Object.assign(t.style, { left: (g.x + 8) + "px", top: (y - 10) + "px" }); document.body.appendChild(t);
    });
    return arr.length;
  }
  const byStage = (list) => [4, 3, 2, 1, 0].map((s) => list.filter((p) => p.stage === s));
  return {
    setStyle: function (s) { STYLE = s; },
    init: init, clear: clear, draw: draw, beds: beds, geo: geo, S: S,
    current: function () { init(); document.querySelectorAll(".mv-orch").forEach((e) => e.remove()); draw(S.orig.slice()); },
    stageBeds: function (thirstyFirst, noDrops) {
      init(); document.querySelectorAll(".mv-orch").forEach((e) => e.remove());
      const names = S.base.stage_names;
      let list = S.orig.map((p) => Object.assign({}, p));
      const groups = [];
      if (thirstyFirst) {
        const th = list.filter((p) => p.thirsty);
        groups.push(["💧 Cần tưới hôm nay · " + th.length, th, "is-drop"]);
        list = list.filter((p) => !p.thirsty);
        if (noDrops) { list.forEach((p) => { p.thirsty = false; }); }
      }
      byStage(list).forEach((l, i) => { const s = 4 - i; groups.push([names[s] + " · " + l.length, l]); });
      return beds(groups);
    },
    filter: function (stage) {
      init(); document.querySelectorAll(".mv-orch").forEach((e) => e.remove());
      const g = draw(S.orig.slice());
      S.orig.forEach((p, i) => {
        if (p.stage === stage) { return; }
        const d = document.createElement("div"); d.className = "mv-x mv-dim";
        Object.assign(d.style, { left: (g.x + (i % g.cols) * g.cw) + "px", top: (g.y + Math.floor(i / g.cols) * g.ch) + "px", width: g.cw + "px", height: g.ch + "px" });
        document.body.appendChild(d);
      });
      const items = document.querySelectorAll("#kb-legend .kb-legend-item");
      if (items[stage]) { items[stage].classList.add("mv-hl"); }
    },
    orchard: function () {
      init();
      const names = S.base.stage_names;
      const fruit = S.orig.filter((p) => p.stage === 4 && !p.thirsty), rest = S.orig.filter((p) => !(p.stage === 4 && !p.thirsty));
      const groups = byStage(rest).map((l, i) => [names[4 - i] + " · " + l.length, l]).filter((x) => x[1].length);
      document.querySelectorAll(".mv-orch").forEach((e) => e.remove());
      // hình một cây Ra quả (phần cây, bỏ đất) chép từ ruộng hiện tại rồi phóng to
      const before = draw(S.orig.slice()), cv = document.getElementById("kb-canvas");
      const fi = S.orig.findIndex((p) => p.stage === 4);
      const tmp = document.createElement("canvas"); tmp.width = before.cw; tmp.height = Math.round(before.ch * 0.8);
      tmp.getContext("2d").drawImage(cv, (fi % before.cols) * before.cw, Math.floor(fi / before.cols) * before.ch, before.cw, tmp.height, 0, 0, before.cw, tmp.height);
      const n = beds(groups, { lead: 2 });
      const g = geo();
      const box = document.createElement("div"); box.className = "mv-orch mv-x";
      Object.assign(box.style, { position: "fixed", left: (g.x + 6) + "px", top: (g.y + 6) + "px", width: (g.w - 12) + "px", height: (2 * g.ch - 16) + "px", margin: 0, boxSizing: "border-box" });
      for (let i = 0; i < 6; i++) { const c = document.createElement("canvas"); c.width = tmp.width * 1.3; c.height = tmp.height * 1.3; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(tmp, 0, 0, c.width, c.height); box.appendChild(c); }
      const t = document.createElement("div");
      t.innerHTML = "<b>Vườn quả · " + fruit.length + " cây đã thuộc lâu</b><br>Ra quả, chưa tới hạn ôn · tới hạn thì cây tự về ruộng chính · bấm để xem đủ ▸";
      box.appendChild(t);
      document.body.appendChild(box);      return n;
    }
  };
})();
window.MV = MV; 1;`;

async function gardenPage() {
  for (const info of await pages(Number(process.env.KB_CDP_PORT || 9333))) {
    if (['top toolbar', 'bottom toolbar', 'main webview'].includes(info.title)) { continue; }
    const p = await Page.open(info.webSocketDebuggerUrl);
    if (await p.eval('typeof Garden !== "undefined"').catch(() => false)) { return p; }
    p.close();
  }
  return null;
}
(async () => {
  const page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  const js = (e) => page.eval('(() => { ' + e + ' })()');
  await js('const g = document.getElementById("kb-greet"); if (g) g.click(); GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); const s = document.getElementById("kb-say"); if (s) s.hidden = true; return 1;');
  await sleep(1200);
  await page.eval('window.MV = null; document.querySelectorAll(".mv-x, .mv-orch").forEach((e) => e.remove()); 1');
  await page.eval(LIB);
  const shot = async (name) => {
    await sleep(500);
    const r = await page.eval('(() => { const e = document.querySelector(".kb-legend-row") || document.getElementById("kb-legend"); const b = e.getBoundingClientRect(); return Math.max(0, Math.round(b.top - 8)); })()');
    const res = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: r, width: 1366, height: 1200 - r, scale: 1 } });
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(res.data, 'base64'));
    console.log('  ảnh', name);
  };
  if (process.argv[3] === 'kieu') {          // 17/11: người dùng thấy dải đất dài không đẹp → thử kiểu ngăn luống khác
    for (const [st, name] of [['sign', 'vg_01b_bien_go'], ['stones', 'vg_01c_da_lat'], ['flowers', 'vg_01d_vien_hoa']]) {
      await js('MV.setStyle(' + JSON.stringify(st) + '); MV.stageBeds(false); return 1;'); await shot(name);
    }
    await js('MV.setStyle("sign"); MV.clear(); MV.current(); return 1;');
    process.exit(0);
  }
  await js('MV.current(); return 1;'); await shot('vg_00_hien_tai');
  await js('MV.stageBeds(false); return 1;'); await shot('vg_01_luong_giai_doan');
  await js('MV.stageBeds(true, true); return 1;'); await shot('vg_02_can_tuoi_len_dau');
  await js('MV.filter(3); return 1;'); await shot('vg_03_loc_ra_hoa');
  await js('MV.orchard(); return 1;'); await shot('vg_04_vuon_qua');
  await js('MV.clear(); MV.current(); return 1;');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
