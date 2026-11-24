/* ことば畑 – 1.36: hình pixel của sự kiện Giáng sinh 2026 (tủ lịch 24 ngăn — le_core.py).
   - install(L): home.js gọi sau khi dựng sprite của mình (như finds_art.js) → thêm 11 món của sự kiện vào SPR, đồ phát sáng
     (GLOW), phần vẽ động (EXTRA: ngăn tủ lịch đã mở, đèn tuần lộc…).
   - tree(parts): cây thông Noel (xmastree của giao diện mùa) dựng lại ĐÚNG như season_art.js nhưng chỉ có những món đã treo
     (quả châu đỏ / vàng / xanh / tím, dây kim tuyến, ngôi sao) + 2 kẹo gậy (ngăn 22). tree(ALL) = SPR.xmastree.
   - icon(door): hình nhỏ trong ngăn tủ lịch; cabinet(): khung tủ gỗ; digit(): số 3×5.
   - houseDecor(): áo Noel của nhà theo kiểu nhà (nhà gốc / minka / nhà trà / lâu đài) — vòng hoa, dây lá thông + nơ, đèn viền
     mái, đèn rủ dưới mái, nến cửa sổ, ngôi sao trên mái; bulbs(): đèn sân (quấn cây thông + món cao, đèn lối đi, dây võng).
   Hình dựng bằng hình cơ bản (grid / rect / disc / ellipseFill / gline + tự viền) như finds_art.js. Không dùng emoji. */
var GardenLeArt = (function () {
  "use strict";

  // ---- công cụ dựng lưới (bản riêng — chạy được cả khi home.js chưa nạp: bảng tủ lịch, test) ----
  function grid(w, h) { const g = []; for (let j = 0; j < h; j++) { g.push(new Array(w).fill(".")); } return g; }
  function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) { for (let i = x; i < x + w; i++) { if (g[j] && i >= 0 && i < g[0].length) { g[j][i] = c; } } } }
  function dot(g, x, y, c) { if (g[y] && x >= 0 && x < g[0].length) { g[y][x] = c; } }
  function disc(g, cx, cy, r, c) {
    for (let j = 0; j < g.length; j++) { for (let i = 0; i < g[0].length; i++) { if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r + r * 0.6) { g[j][i] = c; } } }
  }
  function ellipseFill(g, cx, cy, rx, ry, c) {
    for (let j = 0; j < g.length; j++) { for (let i = 0; i < g[0].length; i++) { const dx = (i - cx) / rx, dy = (j - cy) / ry; if (dx * dx + dy * dy <= 1.02) { g[j][i] = c; } } }
  }
  function gline(g, x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let k = 0; k <= n; k++) { dot(g, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c); }
  }
  function outline(g) {
    const h = g.length, w = g[0].length, out = g.map((r) => r.slice());
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (g[j][i] !== ".") { continue; }
        if ([[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => g[j + dy] && g[j + dy][i + dx] && g[j + dy][i + dx] !== ".")) { out[j][i] = "k"; }
      }
    }
    return out;
  }
  const rows = (g) => g.map((r) => r.join(""));
  const ol = (g) => rows(outline(g));
  function star(g, cx, cy, R, r, c, shade) {      // ngôi sao 5 cánh (y hệt season_art.js)
    const pts = [];
    for (let k = 0; k < 10; k++) {
      const a = -Math.PI / 2 + k * Math.PI / 5, rad = k % 2 ? r : R;
      pts.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]);
    }
    for (let j = 0; j < g.length; j++) {
      for (let i = 0; i < g[0].length; i++) {
        let inside = false;
        for (let a = 0, b = pts.length - 1; a < pts.length; b = a++) {
          const [xa, ya] = pts[a], [xb, yb] = pts[b];
          if ((ya > j + 0.5) !== (yb > j + 0.5) && i + 0.5 < (xb - xa) * (j + 0.5 - ya) / (yb - ya) + xa) { inside = !inside; }
        }
        if (inside) { g[j][i] = shade && i + 0.5 > cx ? shade : c; }
      }
    }
  }

  // bảng màu (như P của home.js + màu riêng của 1.36)
  const PAL = {
    k: "#1b1b2f", w: "#ffffff", y: "#ffd23f", o: "#ff9f1c", r: "#ff4f6d", R: "#c21f3a", p: "#ff7fa0", P: "#ffc4d6",
    g: "#3ccb5e", G: "#2e8b3a", b: "#a0603a", B: "#6b3b1f", t: "#e2a46a", s: "#d4d4e0", S: "#8a8fa8", d: "#3d8bff",
    l: "#8fd3ff", c: "#fff2b3", m: "#9aa0b5", n: "#2b2b44", v: "#c77dff", h: "#f5b971", i: "#e9b949", e: "#ffd7b5",
    E: "#d99a6c", z: "#7b2cbf", u: "#2f5fb0", U: "#1e3a8a", a: "#2ec4b6", A: "#1a7f78", f: "#b8e05a", j: "#1f5f2a",
    W: "#d6e6f5", O: "#c96a10", Y: "#fff6a8",
    // 1.36
    Q: "#8b2d2d", q: "#d9584f", X: "#3a2418", x: "#5a3a26", H: "#7a4a2a"
  };

  // =====================================================================================================
  // Cây thông Noel theo ngăn đã mở (dựng y như SPR.xmastree của season_art.js)
  // =====================================================================================================
  // quả châu của cây gốc (season_art.js) chia cho các ngăn: đỏ (2), vàng (4), xanh (9), tím (12), thêm đỏ (19)
  const BALLS = [[14, 9, "r", "red"], [11, 16, "d", "blue"], [20, 17, "r", "red"], [8, 23, "y", "yellow"], [17, 24, "v", "purple"],
    [24, 24, "d", "blue"], [12, 29, "r", "red2"], [21, 31, "y", "yellow"], [6, 31, "v", "purple"], [26, 32, "r", "red2"]];
  const CANES = [[19, 19], [8, 26]];       // ngăn 22: hai kẹo gậy nhỏ (chỗ không trùng quả châu / bóng đèn)
  const CANE = [[1, 0, "r"], [2, 0, "w"], [0, 1, "r"], [2, 1, "r"], [0, 2, "w"], [2, 2, "w"], [2, 3, "r"], [2, 4, "w"]];
  const TREE_LIGHTS = [[12, 11], [19, 13], [9, 18], [16, 19], [23, 20], [6, 26], [13, 26], [20, 27], [26, 28], [10, 31], [17, 32]];
  const TREE_ALL = ["red", "yellow", "blue", "lights", "purple", "tinsel", "red2", "candy", "star"];
  const treeCache = {};
  function tree(parts) {
    const has = {};
    (parts || []).forEach((p) => { has[p] = true; });
    const key = TREE_ALL.filter((p) => has[p] && p !== "lights").join(",");
    if (treeCache[key]) { return treeCache[key]; }
    const g = grid(32, 44);
    [[5, 14, 6.5], [10, 23, 10.5], [17, 33, 14]].forEach(([y0, y1, hw]) => {
      for (let j = y0; j <= y1; j++) {
        const half = Math.round(hw * (j - y0 + 2) / (y1 - y0 + 2));
        for (let i = 16 - half; i <= 15 + half; i++) { dot(g, i, j, i < 14 ? "g" : i > 18 ? "j" : "G"); }
      }
      for (let i = 16 - Math.round(hw); i <= 15 + Math.round(hw); i += 3) { dot(g, i, y1 + 1, "G"); }
    });
    if (has.tinsel) { for (let k = 0; k < 9; k++) { dot(g, 10 + k * 1.6, 14 + k, "i"); dot(g, 23 - k * 1.7, 22 + k * 1.1, "y"); } }
    BALLS.forEach(([x, y, c, part]) => { if (has[part]) { rect(g, x, y, 2, 2, c); dot(g, x, y, "w"); } });
    if (has.candy) { CANES.forEach(([x0, y0]) => CANE.forEach(([dx, dy, c]) => dot(g, x0 + dx, y0 + dy, c))); }
    if (has.star) { star(g, 15.5, 3.2, 3.4, 1.5, "y", "i"); }
    rect(g, 14, 34, 4, 3, "B");
    rect(g, 9, 37, 14, 7, "r"); rect(g, 8, 37, 16, 1, "R"); rect(g, 9, 39, 14, 1, "i");
    treeCache[key] = ol(g);
    return treeCache[key];
  }

  // =====================================================================================================
  // 11 món của sự kiện (garden_core.LE_ITEMS)
  // =====================================================================================================
  const ITEMS = {};
  // tủ lịch gỗ 24 ngăn (treo tường, 16 × 16): mái nhỏ + nơ đỏ, 6 × 4 ngăn
  ITEMS.le_tulich = (function () {
    const g = grid(16, 16);
    rect(g, 1, 3, 14, 13, "B");
    rect(g, 0, 2, 16, 2, "x"); rect(g, 2, 1, 12, 1, "x");
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 6; c++) {
        const x = 2 + c * 2, y = 5 + r * 3;
        rect(g, x, y, 2, 2, (r + c) % 2 ? "t" : "h");
        dot(g, x + (c % 2), y + 1, (r + c) % 2 ? "b" : "t");
      }
    }
    dot(g, 7, 0, "r"); dot(g, 8, 0, "r"); dot(g, 6, 1, "r"); dot(g, 9, 1, "r"); dot(g, 7, 1, "R"); dot(g, 8, 1, "R");
    return ol(g);
  })();
  // cây thông nhỏ để bàn (12 × 14)
  ITEMS.le_caynho = (function () {
    const g = grid(12, 14);
    [[1, 4, 2.5], [3, 7, 3.6], [5, 10, 4.8]].forEach(([y0, y1, hw]) => {
      for (let j = y0; j <= y1; j++) { const h = Math.round(hw * (j - y0 + 1) / (y1 - y0 + 1)); for (let i = 6 - h; i < 6 + h; i++) { dot(g, i, j, i < 5 ? "g" : "G"); } }
    });
    dot(g, 5, 0, "y"); dot(g, 6, 0, "y");
    dot(g, 4, 6, "r"); dot(g, 7, 8, "y"); dot(g, 3, 9, "l");
    rect(g, 3, 11, 6, 3, "c"); rect(g, 3, 12, 6, 1, "R"); rect(g, 4, 13, 4, 1, "c");
    return ol(g);
  })();
  // tất Noel (treo tường, 10 × 15): cổ trắng, thân đỏ, gót / mũi trắng, quai treo
  ITEMS.le_tat = (function () {
    const g = grid(11, 15);
    dot(g, 7, 0, "i"); dot(g, 7, 1, "i");
    rect(g, 3, 2, 6, 3, "w"); dot(g, 4, 3, "s"); dot(g, 7, 2, "s");
    rect(g, 4, 5, 5, 6, "r"); rect(g, 7, 5, 1, 6, "R");
    rect(g, 1, 10, 8, 3, "r"); rect(g, 2, 13, 6, 1, "r");
    rect(g, 1, 11, 2, 2, "w"); dot(g, 2, 13, "w"); rect(g, 7, 10, 2, 3, "w");
    dot(g, 5, 7, "y"); dot(g, 6, 8, "y"); dot(g, 5, 8, "w");
    return ol(g);
  })();
  // quả cầu tuyết (12 × 14): cầu kính, cây thông + tuyết bên trong, chân gỗ
  ITEMS.le_cautuyet = (function () {
    const g = grid(12, 14);
    disc(g, 6, 5.5, 5, "l");
    rect(g, 5, 4, 2, 1, "G"); rect(g, 4, 5, 4, 1, "g"); rect(g, 4, 6, 4, 1, "G"); rect(g, 3, 7, 6, 1, "g"); dot(g, 6, 3, "y");
    rect(g, 2, 8, 8, 2, "w");
    [[3, 2], [8, 3], [2, 5], [9, 6], [7, 1]].forEach(([x, y]) => dot(g, x, y, "w"));
    dot(g, 3, 3, "w"); dot(g, 4, 2, "W");
    rect(g, 2, 11, 8, 2, "b"); rect(g, 1, 13, 10, 1, "B"); rect(g, 2, 11, 8, 1, "i");
    return ol(g);
  })();
  // bánh kem dâu kiểu Nhật (14 × 12): kem trắng, lớp dâu ở giữa, dâu trên mặt, đĩa
  ITEMS.le_banhkem = (function () {
    const g = grid(14, 12);
    ellipseFill(g, 7, 3.5, 5.6, 1.8, "w");
    rect(g, 2, 4, 11, 5, "w"); rect(g, 2, 6, 11, 1, "p"); rect(g, 2, 5, 11, 1, "c");
    [[3, 2], [6, 1], [9, 2], [11, 3], [5, 3]].forEach(([x, y]) => { dot(g, x, y, "r"); dot(g, x, y - 1, "g"); });
    rect(g, 3, 8, 9, 1, "W");
    rect(g, 0, 9, 14, 2, "s"); rect(g, 1, 11, 12, 1, "S");
    return ol(g);
  })();
  // gấu bông Noel (13 × 15): gấu nâu ngồi, mũ Noel đỏ
  ITEMS.le_gaubong = (function () {
    const g = grid(14, 15);
    rect(g, 4, 0, 4, 2, "r"); rect(g, 8, 1, 2, 1, "r"); dot(g, 10, 1, "w"); dot(g, 11, 2, "w");
    rect(g, 3, 2, 8, 1, "w");
    disc(g, 2.5, 3.5, 1.4, "t"); disc(g, 10.5, 3.5, 1.4, "t");
    ellipseFill(g, 6.5, 5.5, 4, 3, "t");
    rect(g, 3, 2, 8, 1, "w");
    ellipseFill(g, 6.5, 6.8, 1.8, 1.2, "c"); dot(g, 6, 6, "k"); dot(g, 7, 6, "k");
    dot(g, 5, 5, "k"); dot(g, 8, 5, "k");
    ellipseFill(g, 6.5, 11, 4.6, 3.3, "t"); ellipseFill(g, 6.5, 11.4, 2.4, 2, "h");
    rect(g, 4, 8, 6, 1, "r");
    disc(g, 2.3, 13.4, 1.4, "t"); disc(g, 10.7, 13.4, 1.4, "t");
    return ol(g);
  })();
  // người tuyết (16 × 24): hai quả cầu tuyết, mũ đen viền đỏ, khăn đỏ, mũi cà rốt, tay que
  ITEMS.le_nguoituyet = (function () {
    const g = grid(16, 24);
    disc(g, 8, 17.5, 5.6, "w"); disc(g, 8, 9, 4.2, "w");
    for (let j = 12; j < 24; j++) { for (let i = 11; i < 16; i++) { if (g[j][i] === "w" && (i - 8) * (i - 8) + (j - 17.5) * (j - 17.5) > 16) { g[j][i] = "W"; } } }
    rect(g, 5, 2, 6, 4, "k"); rect(g, 4, 5, 8, 1, "k"); rect(g, 5, 4, 6, 1, "r");
    dot(g, 6, 8, "k"); dot(g, 9, 8, "k");
    dot(g, 8, 10, "o"); dot(g, 9, 10, "o"); dot(g, 10, 10, "O");
    rect(g, 4, 12, 8, 2, "r"); rect(g, 9, 13, 2, 4, "r"); dot(g, 10, 16, "R"); rect(g, 4, 13, 8, 1, "R");
    dot(g, 8, 16, "k"); dot(g, 8, 19, "k");
    gline(g, 3, 15, 0, 12, "B"); dot(g, 1, 11, "B");
    gline(g, 13, 15, 15, 11, "B"); dot(g, 15, 10, "B");
    return ol(g);
  })();
  // đèn ngủ ngôi sao (12 × 14): ngôi sao vàng trên chân đèn
  ITEMS.le_denngu = (function () {
    const g = grid(12, 14);
    star(g, 6, 5, 5.4, 2.4, "y", "i");
    dot(g, 5, 4, "Y"); dot(g, 6, 5, "Y");
    rect(g, 5, 10, 2, 2, "s"); rect(g, 3, 12, 6, 2, "c"); rect(g, 3, 13, 6, 1, "h");
    return ol(g);
  })();
  // đèn lồng ngôi sao (treo tường, 14 × 16): dây treo + ngôi sao giấy
  ITEMS.le_longden = (function () {
    const g = grid(14, 16);
    dot(g, 7, 0, "B"); dot(g, 7, 1, "B"); dot(g, 7, 2, "B");
    star(g, 7, 9, 6.4, 2.8, "o", "O");
    star(g, 7, 9, 3.6, 1.6, "y");
    dot(g, 7, 9, "Y");
    dot(g, 6, 15, "r"); dot(g, 8, 15, "r");
    return ol(g);
  })();
  // tuần lộc đèn (16 × 17): khung dây bạc (ban đêm có bóng đèn sáng dọc khung — EXTRA)
  const DEER = (function () {
    const g = grid(16, 17);
    // sừng
    gline(g, 11, 4, 9, 0, "S"); gline(g, 11, 4, 13, 0, "S"); dot(g, 8, 1, "S"); dot(g, 14, 1, "S"); dot(g, 10, 2, "S"); dot(g, 12, 2, "S");
    // đầu + cổ
    rect(g, 11, 4, 3, 3, "S"); dot(g, 14, 5, "S"); dot(g, 15, 6, "r");
    gline(g, 11, 6, 9, 8, "S"); gline(g, 12, 7, 10, 9, "S");
    // thân
    rect(g, 3, 8, 8, 1, "S"); rect(g, 3, 12, 8, 1, "S"); gline(g, 2, 9, 2, 11, "S"); gline(g, 11, 9, 11, 11, "S"); dot(g, 1, 8, "S");
    // chân
    [[3, 13], [5, 13], [8, 13], [10, 13]].forEach(([x, y]) => gline(g, x, y, x, 16, "S"));
    return g;
  })();
  const DEER_BULBS = [];
  DEER.forEach((r, j) => r.forEach((c, i) => { if (c === "S" && (i + j) % 2 === 0) { DEER_BULBS.push([i, j]); } }));
  DEER.forEach((r, j) => r.forEach((c, i) => { if (c === "S" && (i + j) % 2 === 0) { r[i] = "s"; } }));
  ITEMS.le_tuanloc = rows(DEER);
  // bàn nhỏ bánh quy + sữa (16 × 13): bàn gỗ thấp, khay bánh quy, cốc sữa
  ITEMS.le_banhquy = (function () {
    const g = grid(16, 13);
    rect(g, 0, 7, 16, 2, "b"); rect(g, 0, 7, 16, 1, "t"); rect(g, 1, 9, 2, 4, "B"); rect(g, 13, 9, 2, 4, "B");
    rect(g, 1, 5, 9, 2, "s"); rect(g, 2, 6, 7, 1, "m");
    [[2, 3], [5, 3], [3, 4], [6, 4], [8, 4]].forEach(([x, y]) => { rect(g, x, y, 2, 2, "h"); dot(g, x, y, "B"); });
    rect(g, 11, 1, 3, 6, "w"); rect(g, 11, 1, 3, 1, "s"); dot(g, 14, 3, "s"); dot(g, 14, 4, "s"); rect(g, 12, 2, 1, 4, "W");
    return ol(g);
  })();

  // 1.36.1: bánh quy đã ăn (từ tối 24 — ông già Noel ghé): khay còn vụn, cốc sữa cạn, tờ giấy cảm ơn
  const EATEN = (function () {
    const g = grid(16, 13);
    rect(g, 0, 7, 16, 2, "b"); rect(g, 0, 7, 16, 1, "t"); rect(g, 1, 9, 2, 4, "B"); rect(g, 13, 9, 2, 4, "B");
    rect(g, 1, 5, 9, 2, "s"); rect(g, 2, 6, 7, 1, "m");
    [[2, 4], [6, 4], [8, 4]].forEach(([x, y]) => dot(g, x, y, "h")); dot(g, 4, 4, "B");
    rect(g, 3, 1, 5, 3, "w"); rect(g, 4, 2, 3, 1, "S");
    rect(g, 11, 1, 3, 6, "W"); rect(g, 11, 1, 3, 1, "s"); dot(g, 14, 3, "s"); dot(g, 14, 4, "s"); rect(g, 11, 6, 3, 1, "w");
    return ol(g);
  })();

  // =====================================================================================================
  // 1.36.1: ông già Noel (16 × 21, quay sang phải) — đứng / đi (2 khung) / vẫy tay / cầm thiệp; ngồi trên xe (nửa trên)
  // =====================================================================================================
  function santaGrid(pose) {
    const g = grid(16, 21);
    // mũ + quả bông
    rect(g, 7, 1, 5, 1, "r"); rect(g, 5, 2, 7, 1, "r"); rect(g, 4, 3, 7, 1, "r"); dot(g, 4, 3, "R"); dot(g, 5, 2, "R");
    rect(g, 12, 0, 2, 2, "w"); dot(g, 12, 2, "r");
    rect(g, 3, 4, 9, 1, "w");
    // mặt, râu
    rect(g, 5, 5, 6, 2, "e"); dot(g, 9, 5, "k"); dot(g, 10, 6, "p"); dot(g, 11, 6, "E"); dot(g, 5, 5, "E");
    ellipseFill(g, 7.5, 9, 4.2, 2.6, "w"); rect(g, 7, 7, 4, 1, "w"); dot(g, 4, 9, "s"); dot(g, 5, 10, "s"); dot(g, 10, 11, "s");
    // áo
    rect(g, 3, 11, 10, 4, "r"); dot(g, 3, 11, "R"); rect(g, 3, 12, 1, 3, "R"); rect(g, 8, 11, 1, 4, "w");
    rect(g, 3, 13, 10, 1, "k"); rect(g, 8, 13, 2, 1, "y");
    rect(g, 3, 15, 10, 1, "w");
    // tay sau
    rect(g, 2, 11, 1, 3, "R"); dot(g, 2, 14, "k");
    // tay trước
    if (pose === "wave") { rect(g, 12, 8, 2, 4, "r"); rect(g, 13, 6, 2, 2, "r"); rect(g, 13, 4, 2, 2, "w"); }
    else if (pose === "hold") { rect(g, 12, 11, 3, 2, "r"); dot(g, 15, 11, "k"); dot(g, 15, 12, "k"); }
    else { rect(g, 12, 11, 2, 3, "r"); dot(g, 13, 14, "k"); }
    // chân + ủng
    if (pose === "walk2") {
      rect(g, 5, 16, 3, 3, "R"); rect(g, 8, 16, 3, 2, "r"); rect(g, 4, 19, 4, 2, "k"); rect(g, 8, 18, 4, 2, "k");
    } else {
      rect(g, 4, 16, 3, 3, "R"); rect(g, 9, 16, 3, 3, "r"); rect(g, 3, 19, 4, 2, "k"); rect(g, 9, 19, 4, 2, "k");
      if (pose === "walk1") { rect(g, 9, 19, 4, 2, "."); rect(g, 10, 18, 4, 2, "k"); }
    }
    return g;
  }
  const SANTA = {};
  ["stand", "walk1", "walk2", "wave", "hold"].forEach((k) => { SANTA[k] = ol(santaGrid(k)); });
  SANTA.sit = ol(santaGrid("stand").slice(0, 13));
  // thiệp nhỏ treo trên cây thông (7 × 7: dây vàng + thiệp)
  const CARD_MINI = (function () {
    const g = grid(7, 7);
    dot(g, 3, 0, "y"); dot(g, 3, 1, "y");
    rect(g, 0, 2, 7, 5, "c"); rect(g, 0, 2, 7, 1, "r"); dot(g, 2, 4, "g"); dot(g, 4, 5, "r"); dot(g, 5, 4, "y");
    return rows(g);
  })();
  // thư của ông già Noel (16 × 12: phong bì + dấu sáp đỏ)
  const LETTER = (function () {
    const g = grid(16, 12);
    rect(g, 0, 0, 16, 12, "c"); gline(g, 0, 0, 7, 6, "E"); gline(g, 15, 0, 8, 6, "E");
    disc(g, 7.5, 6.5, 1.8, "R"); dot(g, 7, 6, "r");
    return ol(g);
  })();
  // hộp cất đồ Noel (24 × 18): thùng các-tông, dải ruy băng đỏ, nhãn vòng hoa
  const PACKBOX = (function () {
    const g = grid(24, 18);
    rect(g, 1, 6, 22, 12, "t"); rect(g, 1, 6, 22, 1, "h"); rect(g, 1, 7, 1, 11, "E");
    rect(g, 0, 3, 11, 3, "h"); rect(g, 13, 3, 11, 3, "h"); rect(g, 0, 5, 11, 1, "E"); rect(g, 13, 5, 11, 1, "E");
    rect(g, 11, 6, 2, 12, "r"); rect(g, 1, 11, 22, 2, "r");
    rect(g, 9, 1, 2, 3, "R"); rect(g, 13, 1, 2, 3, "R"); rect(g, 11, 2, 2, 2, "r");
    for (let a = 0; a < 14; a++) { const t = a / 14 * Math.PI * 2; dot(g, Math.round(5 + Math.cos(t) * 2.6), Math.round(14.5 + Math.sin(t) * 2), a % 3 ? "G" : "g"); }
    dot(g, 5, 16, "r");
    // ló ra: ngôi sao + quả châu
    star(g, 18, 2, 2.4, 1.1, "y"); dot(g, 6, 2, "r"); dot(g, 7, 2, "R");
    return ol(g);
  })();

  // =====================================================================================================
  // Bảng tủ lịch: số 3×5, biểu tượng trong ngăn
  // =====================================================================================================
  const DIG = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
    "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
  function digit(ctx, S, x, y, n, col) {
    const s = String(n);
    ctx.fillStyle = col;
    for (let k = 0; k < s.length; k++) {
      const p = DIG[+s[k]] || DIG[0];
      for (let i = 0; i < 15; i++) { if (p[i] === "1") { ctx.fillRect(Math.round((x + k * 4 + (i % 3)) * S), Math.round((y + Math.floor(i / 3)) * S), S, S); } }
    }
  }
  // biểu tượng 12 × 12 của phần trên cây / nhà / sân (món đồ dùng chính hình của món)
  const ICON = {};
  function ballIcon(c, c2) {
    const g = grid(12, 12);
    dot(g, 5, 0, "i"); dot(g, 6, 0, "i"); rect(g, 5, 1, 2, 1, "i");
    disc(g, 5.5, 6, 4, c); disc(g, 7, 7.5, 2.2, c2); dot(g, 4, 4, "w"); dot(g, 3, 5, "w");
    return ol(g);
  }
  ICON.red = ballIcon("r", "R"); ICON.red2 = ballIcon("r", "R"); ICON.yellow = ballIcon("y", "i");
  ICON.blue = ballIcon("d", "u"); ICON.purple = ballIcon("v", "z");
  ICON.lights = (function () {
    const g = grid(12, 12);
    for (let i = 0; i < 12; i++) { dot(g, i, 3 + Math.round(Math.sin(i / 2.2) * 2), "j"); }
    [[1, 5, "r"], [4, 6, "y"], [7, 2, "l"], [10, 4, "p"]].forEach(([x, y, c]) => { rect(g, x, y, 2, 3, c); dot(g, x, y, "w"); });
    return ol(g);
  })();
  ICON.tinsel = (function () {
    const g = grid(12, 12);
    for (let i = 0; i < 12; i++) { dot(g, i, 3 + Math.round(Math.sin(i / 1.6) * 2), "i"); dot(g, i, 8 + Math.round(Math.sin(i / 1.6 + 1) * 2), "y"); }
    return ol(g);
  })();
  ICON.candy = (function () {
    const g = grid(12, 12);
    [[5, 1], [6, 1], [7, 1], [4, 2], [8, 2], [8, 3]].forEach(([x, y], i) => { rect(g, x, y, 1, 1, i % 2 ? "w" : "r"); });
    for (let y = 2; y < 12; y++) { rect(g, 8, y, 2, 1, y % 3 ? "r" : "w"); }
    rect(g, 3, 2, 2, 2, "r"); dot(g, 4, 4, "w");
    return ol(g);
  })();
  ICON.star = (function () { const g = grid(12, 12); star(g, 6, 6.4, 5.6, 2.4, "y", "i"); dot(g, 5, 5, "Y"); return ol(g); })();
  ICON.wreath = (function () {
    const g = grid(12, 12);
    disc(g, 6, 5.5, 4.6, "G"); disc(g, 6, 5.5, 2.2, ".");
    [[3, 3], [8, 2], [9, 7], [3, 8]].forEach(([x, y]) => dot(g, x, y, "r"));
    rect(g, 4, 9, 4, 2, "r"); dot(g, 3, 11, "r"); dot(g, 8, 11, "r"); dot(g, 5, 9, "R");
    return ol(g);
  })();
  ICON.garland = (function () {
    const g = grid(12, 12);
    rect(g, 0, 1, 12, 2, "R");
    for (let i = 0; i < 12; i++) { const y = 4 + Math.round(Math.abs(Math.sin(i * Math.PI / 6)) * 3); rect(g, i, y, 1, 2, i % 2 ? "G" : "g"); }
    rect(g, 5, 4, 2, 2, "r"); dot(g, 4, 6, "r"); dot(g, 7, 6, "r");
    [[1, 10, "y"], [4, 10, "Y"], [8, 10, "l"], [11, 10, "y"]].forEach(([x, y, c]) => { dot(g, x, y - 1, "S"); dot(g, x, y, c); });
    return ol(g);
  })();
  ICON.path = (function () {
    const g = grid(12, 12);
    [[1, "y"], [6, "Y"], [10, "y"]].forEach(([x, c]) => { rect(g, x, 7, 1, 5, "S"); rect(g, x - 1, 5, 3, 2, c); });
    rect(g, 4, 2, 2, 4, "w"); dot(g, 4, 1, "o"); dot(g, 5, 0, "y");
    return ol(g);
  })();
  ICON.swag = (function () {
    const g = grid(12, 12);
    for (let i = 0; i < 12; i++) { dot(g, i, 3 + Math.round(Math.sin(i * Math.PI / 11) * 4), "S"); }
    [[1, 4, "Y"], [4, 6, "y"], [7, 7, "l"], [10, 5, "Y"]].forEach(([x, y, c]) => dot(g, x, y + 1, c));
    star(g, 9, 2.4, 2.4, 1, "y");
    return ol(g);
  })();
  ICON.box = (function () {
    const g = grid(12, 12);
    rect(g, 1, 4, 10, 8, "r"); rect(g, 0, 3, 12, 2, "R"); rect(g, 5, 3, 2, 9, "y");
    dot(g, 3, 1, "y"); dot(g, 4, 2, "y"); dot(g, 8, 1, "y"); dot(g, 7, 2, "y"); dot(g, 5, 2, "i"); dot(g, 6, 2, "i");
    return ol(g);
  })();
  const BOX_COL = { 1: ["r", "R", "y"], 2: ["g", "G", "w"], 3: ["d", "u", "i"] };
  function boxIcon(n, open) {
    const [a, b, c] = BOX_COL[n] || BOX_COL[1];
    const g = grid(14, 14);
    rect(g, 1, 5, 12, 9, a); rect(g, 6, 5, 2, 9, c);
    if (open) { rect(g, 0, 0, 14, 3, b); rect(g, 6, 0, 2, 3, c); }
    else { rect(g, 0, 3, 14, 3, b); rect(g, 6, 3, 2, 3, c); dot(g, 4, 1, c); dot(g, 5, 2, c); dot(g, 9, 1, c); dot(g, 8, 2, c); }
    return ol(g);
  }

  // =====================================================================================================
  // Vẽ lưới lên canvas
  // =====================================================================================================
  function paint(ctx, rowsArr, x, y, S, pal, alpha) {
    pal = pal || PAL;
    if (alpha !== undefined) { ctx.globalAlpha = alpha; }
    for (let j = 0; j < rowsArr.length; j++) {
      const r = rowsArr[j];
      for (let i = 0; i < r.length; i++) {
        const c = r.charAt(i);
        if (c === ".") { continue; }
        ctx.fillStyle = pal[c] || c;
        ctx.fillRect(Math.round((x + i) * S), Math.round((y + j) * S), Math.ceil(S), Math.ceil(S));
      }
    }
    if (alpha !== undefined) { ctx.globalAlpha = 1; }
  }
  // bóng (silhouette): mọi điểm ảnh một màu
  function shadowRows(rowsArr) { return rowsArr.map((r) => r.replace(/[^.]/g, "n")); }

  // =====================================================================================================
  // Áo Noel của nhà — điểm neo theo kiểu nhà (toạ độ trong khung 64 × 76 của nhà, như home.js)
  // =====================================================================================================
  // eave: mép dưới mái [x0, x1, y] · slope: hai cạnh mái (danh sách điểm) · apex: đỉnh mái · door: {x, y, w, h} ·
  // wins: cửa sổ (nến) · top: chỗ móc dây võng (ống khói / nóc)
  function classicSlope() {
    const L = [], R = [];
    for (let y = 13; y <= 33; y += 2) { const half = Math.min(30, Math.round((y - 13) * 1.45) + 3); L.push([32 - half - 1, y]); R.push([32 + half, y]); }
    return L.reverse().concat([[32, 11]], R);
  }
  function bandSlope(y0, y1, h0, h1) {
    const L = [], R = [];
    for (let y = y0; y <= y1; y += 2) { const half = Math.round(h0 + (h1 - h0) * (y - y0) / Math.max(1, y1 - y0)); L.push([32 - half - 1, y]); R.push([32 + half, y]); }
    return L.reverse().concat(R);
  }
  const HOUSE = {
    classic: function (level) {
      if (level < 4) { return null; }
      return { eave: [[2, 61, 36]], slope: classicSlope(), apex: [32, 9],
        door: level >= 3 ? { x: 27, y: 45, w: 10, h: 18 } : null, wins: level >= 5 ? [{ x: 13, y: 41, w: 9, h: 9 }, { x: 42, y: 41, w: 9, h: 9 }] : [],
        lanterns: level >= 7 ? [[22, 48], [39, 48]] : [], top: level >= 6 ? [52, 11] : [62, 34] };
    },
    minka: function () {
      const L = [], R = [];
      for (let y = 7; y <= 35; y += 2) { const half = Math.min(30, Math.round((y - 6) * 1.05) + 5); L.push([32 - half - 1, y]); R.push([32 + half, y]); }
      return { eave: [[1, 63, 38]], slope: L.reverse().concat(R), apex: [32, 2], door: { x: 23, y: 44, w: 18, h: 20 },
        wins: [{ x: 11, y: 41, w: 8, h: 8 }, { x: 45, y: 41, w: 8, h: 8 }], lanterns: [], top: [43, 5] };
    },
    teahouse: function () {
      return { eave: [[3, 61, 42]], slope: bandSlope(24, 40, 6, 29), apex: [32, 21], door: { x: 36, y: 55, w: 11, h: 12 },
        wins: [{ x: 18, y: 48, w: 11, h: 11, round: true }], lanterns: [], top: [40, 23] };
    },
    castle: function () {
      return { eave: [[17, 47, 17], [11, 53, 29], [2, 62, 44]], slope: bandSlope(9, 16, 5, 15).concat(bandSlope(22, 28, 10, 20), bandSlope(36, 43, 15, 29)),
        apex: [32, 7], door: { x: 28, y: 66, w: 8, h: 9 },
        wins: [{ x: 17, y: 47, w: 4, h: 4 }, { x: 26, y: 47, w: 4, h: 4 }, { x: 35, y: 47, w: 4, h: 4 }, { x: 43, y: 47, w: 4, h: 4 }], lanterns: [], top: [46, 8] };
    }
  };
  function houseGeo(level, style) {
    if (level >= 7 && style && style !== "classic" && HOUSE[style]) { return HOUSE[style](level); }
    return HOUSE.classic(level);
  }
  const WARM = ["#fff1c2", "#ffd23f", "#bfe8ff"];        // trắng ấm · vàng · xanh băng

  // các bóng đèn của áo nhà (đèn viền mái, đèn rủ dưới mái) + dây lá thông — tính một lần theo kiểu nhà / cấp / phần đã mở
  function houseLights(level, style, parts) {
    const geo = houseGeo(level, style), has = {};
    (parts || []).forEach((p) => { has[p] = true; });
    const out = { bulbs: [], wires: [], green: [], bows: [], icicles: [] };
    if (!geo) { return out; }
    if (has.garland) {           // đèn viền mái: trong khung nhà (mái minka / nhà gốc rộng sát mép 64 điểm ảnh)
      geo.slope.forEach(([x, y], k) => { out.bulbs.push({ x: Math.max(1, Math.min(62, x)), y: y - 1, c: WARM[k % 3], k: k }); });
      geo.eave.forEach(([x0, x1, y]) => {
        for (let x = x0; x <= x1; x++) {
          const sag = Math.round(Math.abs(Math.sin((x - x0) * Math.PI / 8)) * 2);
          out.green.push([x, y + sag]);
          if ((x - x0) % 16 === 8) { out.bows.push([x, y + sag]); }
        }
        for (let x = x0 + 2; x <= x1 - 1; x += 4) {          // đèn rủ dưới mái (dài ngắn xen kẽ)
          const len = 2 + ((x >> 2) % 3);
          out.icicles.push({ x: x, y: y + 2, len: len });
          out.bulbs.push({ x: x, y: y + 2 + len, c: WARM[(x >> 2) % 3 === 0 ? 2 : 0], k: x });
        }
      });
    }
    if (has.swag) { out.star = geo.apex; }
    return out;
  }

  return {
    PAL: PAL, ITEMS: ITEMS, ICON: ICON, BALLS: BALLS, CANES: CANES, CANE: CANE, TREE_LIGHTS: TREE_LIGHTS, TREE_ALL: TREE_ALL,
    tree: tree, paint: paint, shadowRows: shadowRows, digit: digit, boxIcon: boxIcon, houseGeo: houseGeo, houseLights: houseLights,
    WARM: WARM, DEER_BULBS: DEER_BULBS, grid: grid, rect: rect, dot: dot, disc: disc, ol: ol, rows: rows, star: star,
    EATEN: EATEN, SANTA: SANTA, CARD_MINI: CARD_MINI, LETTER: LETTER, PACKBOX: PACKBOX,       // 1.36.1
    install: function (L) {
      const { SPR, GLOW, EXTRA, P } = L;
      ["Q", "q", "X", "x", "H", "W", "O", "Y"].forEach((k) => { if (!P[k]) { P[k] = PAL[k]; } });
      Object.keys(ITEMS).forEach((id) => { SPR[id] = ITEMS[id]; });
      GLOW.le_denngu = [5, 13];
      GLOW.le_longden = [9, 14];
      if (EXTRA) {
        // tủ lịch trên tường: ngăn đã mở ánh đỏ / vàng (theo sổ của sự kiện)
        EXTRA.le_tulich = function (ctx, S, X, Y) {
          const L2 = typeof GardenLe !== "undefined" ? GardenLe : null, op = L2 && L2.openedSet ? L2.openedSet() : null;
          if (!op) { return; }
          for (let d = 1; d <= 24; d++) {
            if (!op[d]) { continue; }
            const r = Math.floor((d - 1) / 6), c = (d - 1) % 6;
            ctx.fillStyle = d % 2 ? "#ff4f6d" : "#ffd23f";
            ctx.fillRect(Math.round((X + 2 + c * 2) * S), Math.round((Y + 5 + r * 3) * S), Math.ceil(S), Math.ceil(S));
          }
        };
        EXTRA.le_denngu = function (ctx, S, X, Y, e, now, tod) {
          if (tod === "day") { return; }
          ctx.globalAlpha = 0.25; ctx.fillStyle = "#fff6a8";
          ctx.fillRect(Math.round((X + 2) * S), Math.round((Y + 1) * S), Math.ceil(8 * S), Math.ceil(8 * S)); ctx.globalAlpha = 1;
        };
      }
      return { ids: Object.keys(ITEMS) };
    }
  };
})();
