// rare_dump.js RARE_ART_JS HOME_JS OUT.json — dựng hình 12 món hiếm (1.16) bằng chính rare_art.js, ghi các hàng điểm ảnh ra JSON để rare_render.py vẽ thành ảnh xem trước
const fs = require('fs');
const src = fs.readFileSync(process.argv[2], 'utf8');
const homeSrc = fs.readFileSync(process.argv[3], 'utf8');
const P = { k: "#1b1b2f", w: "#ffffff", y: "#ffd23f", o: "#ff9f1c", r: "#ff4f6d", R: "#c21f3a", p: "#ff7fa0",
    P: "#ffc4d6", g: "#3ccb5e", G: "#2e8b3a", b: "#a0603a", B: "#6b3b1f", t: "#e2a46a", s: "#d4d4e0",
    S: "#8a8fa8", d: "#3d8bff", l: "#8fd3ff", c: "#fff2b3", m: "#9aa0b5", n: "#2b2b44", v: "#c77dff", h: "#f5b971",
    i: "#e9b949", e: "#ffd7b5", E: "#d99a6c", z: "#7b2cbf", u: "#2f5fb0", U: "#1e3a8a", a: "#2ec4b6", A: "#1a7f78",
    f: "#b8e05a", j: "#1f5f2a", W: "#d6e6f5", O: "#c96a10", Y: "#fff6a8" };
function grid(w, h) { const g = []; for (let j = 0; j < h; j++) { g.push(new Array(w).fill(".")); } return g; }
function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) { for (let i = x; i < x + w; i++) { if (g[j] && i >= 0 && i < g[0].length) { g[j][i] = c; } } } }
function disc(g, cx, cy, r, c) { for (let j = 0; j < g.length; j++) { for (let i = 0; i < g[0].length; i++) { if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r + r * 0.6) { g[j][i] = c; } } } }
function dot(g, x, y, c) { if (g[y] && x >= 0 && x < g[0].length) { g[y][x] = c; } }
function outline(g) { const h = g.length, w = g[0].length, out = g.map((r) => r.slice());
  for (let j = 0; j < h; j++) { for (let i = 0; i < w; i++) { if (g[j][i] !== ".") { continue; }
    const n = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => g[j + dy] && g[j + dy][i + dx] && g[j + dy][i + dx] !== ".");
    if (n) { out[j][i] = "k"; } } } return out; }
const rows = (g) => g.map((r) => r.join(""));
function gline(g, x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let t = 0; t <= n; t++) { dot(g, Math.round(x0 + (x1 - x0) * t / n), Math.round(y0 + (y1 - y0) * t / n), c); } }
function ellipseFill(g, cx, cy, rx, ry, c) { for (let j = 0; j < g.length; j++) { for (let i = 0; i < g[0].length; i++) { const dx = (i - cx) / rx, dy = (j - cy) / ry; if (dx * dx + dy * dy <= 1.05) { g[j][i] = c; } } } }
eval(src);
const SPR = {}, GLOW = {}, EXTRA = {};
const R = GardenRareArt.install({ grid, rect, disc, dot, outline, rows, gline, ellipseFill, SPR, GLOW, EXTRA, P, box: () => 0 });
const out = { P, items: {} };
for (const id of R.ids) {
  out.items[id] = [SPR[id]];
  for (const t of [7700, 8000, 50, 0]) { const f = R.frameOf({ id, x: 0 }, t); if (f && out.items[id].indexOf(f) < 0) out.items[id].push(f); }
}
// một vài món cũ để so cỡ
for (const id of ['tanuki', 'daruma', 'furin']) {
  const m = homeSrc.match(new RegExp('SPR\\.' + id + ' = \\(function \\(\\) \\{([\\s\\S]*?)\\}\\)\\(\\);'));
  if (m) { out.items['(cũ) ' + id] = [eval('(function(){' + m[1] + '})()')]; }
}
fs.writeFileSync(process.argv[4], JSON.stringify(out));
console.log(Object.keys(out.items).map(k => k + ':' + out.items[k][0][0].length + 'x' + out.items[k][0].length + (out.items[k].length > 1 ? '+' + (out.items[k].length - 1) : '')).join(' '));
