// Bản mẫu 1.20: 4 loài hoa mới cho Lịch hoa (16×16, cùng bảng màu PAL của seeds.js, viền đen tự kẻ)
// mai vàng (Tết) · cẩm tú cầu (mùa mưa) · trạng nguyên (Giáng sinh) · cúc (mùa thu). Giai đoạn 1–4: mầm, cây non, ra nụ, nở rộ.
var KB_FLOWERS = (function () {
  "use strict";
  function grid() { const g = []; for (let y = 0; y < 16; y++) { g.push(new Array(16).fill(".")); } return g; }
  function set(g, x, y, c) { if (x >= 1 && x <= 14 && y >= 0 && y <= 15) { g[y][x] = c; } }
  function line(g, x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) { set(g, Math.round(x0 + (x1 - x0) * i / (n || 1)), Math.round(y0 + (y1 - y0) * i / (n || 1)), c); }
  }
  function disc(g, cx, cy, r, f) {
    for (let y = -r; y <= r; y++) { for (let x = -r; x <= r; x++) { if (x * x + y * y <= r * r + r * 0.6) { set(g, cx + x, cy + y, f(x, y)); } } }
  }
  function blossom(g, x, y, petal, center) { set(g, x, y, center); set(g, x - 1, y, petal); set(g, x + 1, y, petal); set(g, x, y - 1, petal); set(g, x, y + 1, petal); }
  function outline(g) {
    const out = g.map((r) => r.slice());
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (g[y][x] !== ".") { continue; }
        const n = [[1, 0], [-1, 0], [0, 1], [0, -1]].some((d) => { const yy = y + d[1], xx = x + d[0]; return yy >= 0 && yy < 16 && xx >= 0 && xx < 16 && g[yy][xx] !== "."; });
        if (n) { out[y][x] = "k"; }
      }
    }
    return out.map((r) => r.join(""));
  }
  function sprout(g, stem) {
    line(g, 8, 15, 8, 12, stem);
    set(g, 6, 11, "g"); set(g, 7, 11, "g"); set(g, 7, 12, "G");
    set(g, 9, 10, "g"); set(g, 10, 10, "g"); set(g, 9, 11, "G");
  }
  function leaves(g, cx, cy) {   // bụi lá hai tầng màu
    disc(g, cx, cy, 3, (x, y) => (x + y > 1 ? "G" : (x - y) % 3 === 0 ? "f" : "g"));
  }
  const S = {};
  // ---- mai vàng: cành nâu, hoa 5 cánh vàng nhuỵ cam
  S.mai = [];
  { const g = grid(); line(g, 8, 15, 8, 11, "b"); set(g, 9, 11, "g"); set(g, 10, 10, "g"); set(g, 7, 12, "g"); S.mai.push(outline(g)); }
  { const g = grid(); line(g, 8, 15, 8, 7, "b"); line(g, 8, 11, 11, 8, "b"); line(g, 8, 10, 5, 7, "b");
    [[12, 7], [4, 6], [9, 6], [7, 6]].forEach((p) => set(g, p[0], p[1], "g")); set(g, 12, 8, "g"); S.mai.push(outline(g)); }
  { const g = grid(); line(g, 8, 15, 8, 6, "b"); line(g, 8, 11, 12, 7, "b"); line(g, 8, 9, 4, 5, "b");
    [[12, 6], [4, 4], [8, 5], [10, 8]].forEach((p) => set(g, p[0], p[1], "y")); [[5, 6], [11, 7], [7, 7]].forEach((p) => set(g, p[0], p[1], "g")); S.mai.push(outline(g)); }
  { const g = grid(); line(g, 8, 15, 8, 7, "b"); line(g, 8, 12, 12, 8, "b"); line(g, 8, 10, 4, 6, "b"); line(g, 8, 8, 10, 4, "b");
    blossom(g, 12, 7, "y", "o"); blossom(g, 4, 5, "y", "o"); blossom(g, 10, 3, "y", "o"); blossom(g, 7, 6, "y", "O"); set(g, 13, 10, "Y"); set(g, 3, 8, "Y"); set(g, 6, 3, "Y");
    S.mai.push(outline(g)); }
  // ---- cẩm tú cầu: bụi lá + chùm hoa tròn xanh / tím
  S.ajisai = [];
  { const g = grid(); sprout(g, "G"); S.ajisai.push(outline(g)); }
  { const g = grid(); leaves(g, 8, 12); line(g, 8, 15, 8, 14, "G"); S.ajisai.push(outline(g)); }
  { const g = grid(); leaves(g, 8, 12); disc(g, 8, 7, 2, (x, y) => ((x + y) % 2 ? "l" : "u")); S.ajisai.push(outline(g)); }
  { const g = grid(); leaves(g, 8, 12); disc(g, 5, 6, 3, (x, y) => ((x + 2 * y) % 3 === 0 ? "l" : (x + y) % 2 ? "u" : "l")); disc(g, 11, 7, 2, (x, y) => ((x + y) % 2 ? "v" : "P"));
    S.ajisai.push(outline(g)); }
  // ---- trạng nguyên: lá xanh, lá bắc đỏ hình sao, nhuỵ vàng, chậu
  S.poinsettia = [];
  { const g = grid(); sprout(g, "G"); S.poinsettia.push(outline(g)); }
  { const g = grid(); line(g, 8, 15, 8, 9, "G"); [[6, 10], [5, 10], [10, 9], [11, 9], [7, 8], [9, 7], [6, 12], [10, 12]].forEach((p) => set(g, p[0], p[1], "g")); set(g, 5, 11, "G"); set(g, 11, 10, "G");
    S.poinsettia.push(outline(g)); }
  { const g = grid(); line(g, 8, 15, 8, 8, "G"); [[5, 11], [6, 11], [10, 11], [11, 11], [6, 13], [10, 13]].forEach((p) => set(g, p[0], p[1], "g"));
    blossom(g, 8, 6, "r", "y"); set(g, 6, 7, "R"); set(g, 10, 7, "R"); S.poinsettia.push(outline(g)); }
  { const g = grid();
    for (let x = 4; x <= 12; x++) { set(g, x, 13, "R"); } for (let x = 5; x <= 11; x++) { set(g, x, 14, "R"); set(g, x, 15, "R"); } for (let x = 5; x <= 11; x += 2) { set(g, x, 14, "r"); }
    [[4, 11], [5, 11], [11, 11], [12, 11], [5, 12], [11, 12], [6, 10], [10, 10]].forEach((p) => set(g, p[0], p[1], "g")); set(g, 4, 12, "G"); set(g, 12, 12, "G");
    const bract = [[8, 2], [8, 3], [7, 3], [9, 3], [3, 5], [4, 5], [4, 6], [5, 6], [13, 5], [12, 5], [12, 6], [11, 6], [5, 9], [6, 9], [6, 8], [11, 9], [10, 9], [10, 8], [8, 4], [6, 5], [10, 5], [7, 8], [9, 8], [6, 7], [10, 7]];
    bract.forEach((p) => set(g, p[0], p[1], "r")); [[7, 5], [9, 5], [8, 8], [5, 7], [11, 7], [7, 4], [9, 4]].forEach((p) => set(g, p[0], p[1], "R"));
    set(g, 7, 6, "y"); set(g, 8, 6, "Y"); set(g, 9, 6, "y"); set(g, 8, 7, "y"); set(g, 8, 5, "y");
    S.poinsettia.push(outline(g)); }
  // ---- cúc: thân xanh, hoa tròn cam nhiều cánh
  S.kiku = [];
  { const g = grid(); sprout(g, "G"); S.kiku.push(outline(g)); }
  { const g = grid(); line(g, 8, 15, 8, 8, "G"); [[6, 11], [7, 11], [10, 10], [9, 10], [6, 13], [10, 13], [7, 8], [9, 8]].forEach((p) => set(g, p[0], p[1], "g")); S.kiku.push(outline(g)); }
  { const g = grid(); line(g, 8, 15, 8, 8, "G"); [[6, 12], [7, 12], [10, 11], [9, 11], [6, 14]].forEach((p) => set(g, p[0], p[1], "g"));
    disc(g, 8, 6, 2, (x, y) => (x === 0 && y === 0 ? "y" : (x + y) % 2 ? "o" : "O")); S.kiku.push(outline(g)); }
  { const g = grid(); line(g, 8, 15, 8, 10, "G"); [[5, 12], [6, 12], [6, 13], [10, 12], [11, 12], [10, 13], [7, 14], [9, 11]].forEach((p) => set(g, p[0], p[1], "g")); set(g, 5, 13, "G"); set(g, 11, 13, "G");
    disc(g, 8, 6, 4, (x, y) => { const d = x * x + y * y; return d <= 1 ? "y" : d <= 4 ? "Y" : (x + y + 8) % 2 ? "o" : "O"; });
    S.kiku.push(outline(g)); }
  return S;
})();
