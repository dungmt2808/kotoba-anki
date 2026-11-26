// Ảnh phác chỗ tiêu xu (25/11, chưa làm) — mã chạy TRONG trang vườn (Anki thật hoặc Chromium + web/body.html).
// Người dùng: "làm ảnh phác đi, tớ chưa hình dung được. làm sao mà ấn tượng và thú vị" (sau "tham khảo thêm Stardew Valley").
// Vẽ bằng hình có sẵn của vườn (GardenHome._lib().SPR, khách GardenGuests, StackChan GardenLife, món sưu tầm GardenFinds)
// + các công trình mới vẽ bằng mã (nhà văn hoá, tháp đồng hồ, thư viện, nhà kính, guồng nước, cầu đá, bến thuyền).
// window.__tx.show(n) dựng ảnh n (1…8) phủ lên trang; window.__tx.clear() gỡ.
window.__tx = (function () {
  "use strict";
  const L = GardenHome._lib(), SPR = L.SPR;
  const X = Object.assign({}, L.P, {
    roof: "#56607a", roofD: "#3c4459", roofH: "#7b87a6", wall: "#f4e8cc", wallD: "#d8c49c", wood: "#6b3b1f", wood2: "#8a5530",
    wood3: "#b07a4a", stone: "#bdb5a3", stoneD: "#8e8676", stoneH: "#dcd5c6", brick: "#b5553c", brickD: "#8d3f2b", cream: "#f6efe0",
    glass: "#bfe7ff", glassD: "#86bde3", water: "#5aa9e6", waterD: "#3f86c8", waterH: "#b5e3ff", murk: "#6f8f78", murkD: "#55715e",
    grass: "#5ed35e", grassD: "#49b84f", grassL: "#86e27a", ruinG: "#93b25e", ruinD: "#78944a", dirt: "#d8b888", dirtD: "#bf9d6b",
    weed: "#3f7d34", dead: "#8a7444", straw: "#e0bb62", strawD: "#b38c3c", plaza: "#e8dcc2", plazaD: "#cdbd9c", gold: "#ffcf3f",
    goldD: "#c9931c", goldH: "#fff0a0", hole: "#2a2230", navy: "#2f4f8f", red: "#c8323c", night: "#0f1838"
  });
  const W = 320, H = 96, HOR = 34;
  function canvas(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const g = c.getContext("2d"); g.imageSmoothingEnabled = false; return [c, g]; }
  function R(g, x, y, w, h, c) { g.fillStyle = X[c] || c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
  function px(g, x, y, c) { R(g, x, y, 1, 1, c); }
  function rows(g, rs, x, y, pal) { pal = pal || X; for (let j = 0; j < rs.length; j++) { for (let i = 0; i < rs[j].length; i++) { const c = rs[j][i]; if (c !== ".") { px(g, x + i, y + j, pal[c] || c); } } } }
  function line(g, x0, y0, x1, y1, c) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) { px(g, Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c); } }
  function disc(g, cx, cy, r, c) { for (let y = -r; y <= r; y++) { for (let x = -r; x <= r; x++) { if (x * x + y * y <= r * r + r * 0.6) { px(g, cx + x, cy + y, c); } } } }
  function ring(g, cx, cy, r, c) { for (let a = 0; a < 360; a += 2) { px(g, Math.round(cx + r * Math.cos(a * Math.PI / 180)), Math.round(cy + r * Math.sin(a * Math.PI / 180)), c); } }
  // quầng sáng mềm (đèn ban đêm)
  function glow(g, x, y, r, col, a) {
    const gr = g.createRadialGradient(x + 0.5, y + 0.5, 0, x + 0.5, y + 0.5, r);
    gr.addColorStop(0, "rgba(" + col + "," + a + ")"); gr.addColorStop(1, "rgba(" + col + ",0)");
    const op = g.globalCompositeOperation; g.globalCompositeOperation = "lighter"; g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2 + 1, r * 2 + 1); g.globalCompositeOperation = op;
  }
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function item(g, id, cx, by, pal) { const s = SPR[id]; if (!s) { return; } L.sprite(g, s, Math.round(cx - s[0].length / 2), by - s.length, 1, pal || L.P); }
  function guest(g, id, x, by, flip) { const r = GardenGuests.sprite(id); if (r) { GardenGuests.paint(g, r, x, by - r.length, 1, !!flip); } }
  function chan(g, x, by, pose, on) { const r = GardenLife._build(pose || "stand", 0, ""); GardenLife.preview(g, 1, x, by - r.length, on || {}, pose || "stand"); }
  function up(src, S) { const [c, g] = canvas(Math.round(src.width * S), Math.round(src.height * S)); g.drawImage(src, 0, 0, c.width, c.height); c.style.imageRendering = "pixelated"; return c; }
  // vàng hoá một hình (tượng): theo độ sáng từng điểm ảnh
  function goldify(src) {
    const [c, g] = canvas(src.width, src.height); g.drawImage(src, 0, 0);
    const d = g.getImageData(0, 0, c.width, c.height), a = d.data;
    const T = [[94, 62, 12], [201, 147, 28], [255, 207, 63], [255, 240, 160]];
    for (let i = 0; i < a.length; i += 4) {
      if (!a[i + 3]) { continue; }
      const l = (a[i] * 0.3 + a[i + 1] * 0.59 + a[i + 2] * 0.11) / 255, t = T[Math.min(3, Math.floor(l * 4))];
      a[i] = t[0]; a[i + 1] = t[1]; a[i + 2] = t[2];
    }
    g.putImageData(d, 0, 0); return c;
  }

  // ---------------------------------------------------------------- nền
  function sky(g, night) {
    for (let y = 0; y < HOR + 2; y++) {
      const t = y / (HOR + 2);
      const a = night ? [15, 24, 56] : [110, 196, 245], b = night ? [52, 62, 112] : [214, 241, 255];
      R(g, 0, y, W, 1, "rgb(" + a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(",") + ")");
    }
    if (night) {
      for (let i = 0; i < 70; i++) { px(g, Math.floor(hash(i) * W), Math.floor(hash(i + 99) * 28), hash(i + 7) > 0.8 ? "#ffffff" : "#9fb2e8"); }
      disc(g, 286, 9, 4, "#fff3c4"); disc(g, 288, 8, 3, "rgb(30,40,80)");
    } else {
      [[30, 8, 18], [120, 5, 24], [210, 10, 16], [280, 4, 20]].forEach(([x, y, w]) => { R(g, x, y + 1, w, 3, "#ffffff"); R(g, x + 3, y, w - 7, 1, "#ffffff"); R(g, x + 2, y + 4, w - 4, 1, "#e8f4ff"); });
    }
    for (let x = 0; x < W; x++) {
      const h1 = 9 + Math.round(5 * Math.sin(x / 31) + 3 * Math.sin(x / 13 + 1));
      R(g, x, HOR - h1, 1, h1, night ? "#2b3d5e" : "#a3d0b0");
      const h2 = 4 + Math.round(3 * Math.sin(x / 19 + 2) + 2 * Math.sin(x / 7));
      R(g, x, HOR - h2, 1, h2, night ? "#25405a" : "#7cc08a");
    }
  }
  function ground(g, ok, night) {
    const base = ok ? X.grass : X.ruinG, dk = ok ? X.grassD : X.ruinD;
    R(g, 0, HOR, W, H - HOR, base);
    for (let i = 0; i < 420; i++) { const x = Math.floor(hash(i * 3) * W), y = HOR + 2 + Math.floor(hash(i * 5 + 1) * (H - HOR - 2)); px(g, x, y, dk); if (hash(i) > 0.7) { px(g, x, y - 1, dk); } }
    if (ok) { for (let i = 0; i < 60; i++) { const x = Math.floor(hash(i * 11) * W), y = HOR + 6 + Math.floor(hash(i * 13) * 56); px(g, x, y, ["#ffffff", "#ffd23f", "#ff9fc0"][i % 3]); } }
    else { for (let i = 0; i < 26; i++) { const x = Math.floor(hash(i * 17) * W), y = HOR + 8 + Math.floor(hash(i * 19) * 54); R(g, x, y, 4 + (i % 4), 2, X.dirtD); } }
    R(g, 0, HOR, W, 1, ok ? (night ? "#2f6b3a" : "#4cbd52") : X.ruinD);
  }
  // suối từ chân núi chảy xuống ao (bờ trái)
  function streamX(y) { return 112 - (y - HOR) * 0.9; }
  function water(g, ok) {
    const c = ok ? X.water : X.murk, d = ok ? X.waterD : X.murkD;
    for (let y = HOR; y < 88; y++) { const cx = streamX(y), w = ok ? 4 + (y - HOR) * 0.12 : 2 + (y - HOR) * 0.06; R(g, cx - w / 2, y, w, 1, c); if (y % 5 === 0) { px(g, cx - 1, y, ok ? X.waterH : d); } }
    // ao
    for (let y = 76; y < H; y++) { const k = (y - 87) / 11, half = 38 * Math.sqrt(Math.max(0, 1 - k * k)); R(g, 32 - half, y, half * 2, 1, y < 78 ? d : c); }
    for (let i = 0; i < 14; i++) { const x = 6 + Math.floor(hash(i * 7) * 50), y = 80 + Math.floor(hash(i * 9) * 14); R(g, x, y, 3, 1, ok ? X.waterH : d); }
    if (!ok) {     // lau sậy
      [[2, 80], [8, 78], [62, 82], [66, 86], [56, 78], [20, 77]].forEach(([x, y], k) => { for (let i = 0; i < 3; i++) { line(g, x + i * 2, y, x + i * 2 + (i - 1), y - 6 - (k % 3), X.weed); px(g, x + i * 2 + (i - 1), y - 7 - (k % 3), X.dead); } });
    }
  }
  function path(g, ok) {
    if (!ok) { return; }
    for (let x = 92; x < W; x++) { const y = 64 + (x - 92) * 0.085; R(g, x, y, 1, 6, X.dirt); if (x % 7 === 0) { px(g, x, y + 2, X.dirtD); } }
    // quảng trường
    for (let y = 74; y < H; y++) { const k = (y - 86) / 12, half = 52 * Math.sqrt(Math.max(0, 1 - k * k)); R(g, 238 - half, y, half * 2, 1, X.plaza); }
    for (let y = 76; y < H; y += 4) { for (let x = 190; x < 290; x += 8) { px(g, x + (y % 8 ? 4 : 0), y, X.plazaD); } }
  }
  function weeds(g, x, y, n) { for (let i = 0; i < n; i++) { const xx = x + i * 3 + Math.floor(hash(x + i) * 2); line(g, xx, y, xx - 1, y - 3 - (i % 3), X.weed); line(g, xx + 1, y, xx + 2, y - 2 - ((i + 1) % 3), X.weed); } }
  function vine(g, x, y0, y1) { for (let y = y0; y < y1; y++) { px(g, x + ((y >> 1) % 2), y, X.weed); if (y % 4 === 0) { px(g, x + 2, y, X.grassD); } } }

  // ---------------------------------------------------------------- công trình
  function kominkan(g, x0, by, ok, night) {        // nhà văn hoá 公民館, 64 × 44
    R(g, x0 - 2, by - 4, 68, 4, X.stone); R(g, x0 - 2, by - 1, 68, 1, X.stoneD); R(g, x0 + 26, by - 2, 12, 2, X.stoneH);
    R(g, x0 + 2, by - 24, 60, 20, ok ? X.wall : X.wallD);
    R(g, x0 + 1, by - 26, 62, 2, X.wood); R(g, x0 + 2, by - 9, 60, 5, X.wood2);
    [2, 13, 24, 39, 50, 60].forEach((p) => R(g, x0 + p, by - 24, 2, 20, X.wood));
    [5, 16, 42, 53].forEach((wx, k) => {
      R(g, x0 + wx, by - 20, 7, 7, ok ? (night ? "#ffd87a" : X.glass) : X.hole);
      if (ok) { R(g, x0 + wx + 3, by - 20, 1, 7, X.wood); R(g, x0 + wx, by - 17, 7, 1, X.wood); if (!night) { px(g, x0 + wx + 1, by - 19, "#ffffff"); } }
      else { line(g, x0 + wx - 1, by - 21, x0 + wx + 7, by - 13, X.wood3); line(g, x0 + wx + 7, by - 21, x0 + wx - 1, by - 13, X.wood3); }
    });
    // cửa trượt + rèm noren
    R(g, x0 + 27, by - 20, 10, 16, ok ? X.wood2 : X.hole);
    if (ok) { R(g, x0 + 31, by - 20, 1, 16, X.wood); R(g, x0 + 26, by - 21, 12, 6, X.navy); R(g, x0 + 31, by - 21, 1, 6, X.night); px(g, x0 + 29, by - 19, "#ffffff"); px(g, x0 + 34, by - 19, "#ffffff"); }
    else { line(g, x0 + 27, by - 20, x0 + 34, by - 6, X.wood3); }
    // biển tên
    R(g, x0 + 22, by - 31, 20, 5, X.wood);
    if (ok) { [24, 30, 36].forEach((t) => { R(g, x0 + t, by - 30, 4, 3, X.cream); px(g, x0 + t + 1, by - 29, X.wood); px(g, x0 + t + 2, by - 30, X.wood); }); }
    // mái ngói
    for (let k = 0; k <= 13; k++) {
      const y = by - 40 + k, w = 34 + k * 3, x = x0 + 32 - w / 2;
      for (let i = 0; i < w; i++) { px(g, x + i, y, k >= 12 ? X.roofD : (i % 3 === 0 ? X.roofD : X.roof)); }
      if (k === 0) { R(g, x - 1, y - 1, w + 2, 1, X.roofD); }
    }
    R(g, x0 + 14, by - 43, 36, 2, X.roofD); R(g, x0 + 15, by - 44, 34, 1, X.roofH);
    rows(g, ["g.", "gg", ".g"], x0 + 12, by - 46, { g: ok ? X.gold : X.stoneD }); rows(g, [".g", "gg", "g."], x0 + 50, by - 46, { g: ok ? X.gold : X.stoneD });
    // đầu hồi
    for (let k = 0; k < 5; k++) { R(g, x0 + 30 - k, by - 39 + k, 4 + k * 2, 1, ok ? X.cream : X.wallD); }
    if (!ok) {
      R(g, x0 + 18, by - 36, 8, 3, X.hole); R(g, x0 + 19, by - 37, 5, 1, X.hole); R(g, x0 + 42, by - 31, 6, 3, X.hole);
      for (let i = 0; i < 14; i++) { px(g, x0 + 4 + Math.floor(hash(i + 40) * 56), by - 39 + Math.floor(hash(i + 50) * 12), X.roofH); }
      R(g, x0 + 30, by - 44, 18, 2, X.hole);                      // sống mái gãy
      vine(g, x0 + 3, by - 24, by - 4); vine(g, x0 + 58, by - 22, by - 4);
      [[x0 + 8, by - 14, 6], [x0 + 44, by - 12, 5]].forEach(([x, y, w]) => R(g, x, y, w, 3, "#bfa983"));
      line(g, x0 + 40, by + 1, x0 + 56, by - 3, X.wood); R(g, x0 + 42, by - 3, 10, 3, X.wood);       // biển tên rơi
      weeds(g, x0 - 2, by, 7); weeds(g, x0 + 44, by, 7);
    }
  }
  function tower(g, x0, by, ok, scaffold) {        // tháp đồng hồ, 16 × 60
    R(g, x0 - 2, by - 6, 20, 6, X.stoneD); R(g, x0 - 1, by - 6, 18, 1, X.stone);
    R(g, x0, by - 46, 16, 40, X.stone);
    for (let r = 0; r < 10; r++) { R(g, x0, by - 46 + r * 4, 16, 1, X.stoneD); R(g, x0 + (r % 2 ? 5 : 10), by - 45 + r * 4, 1, 3, X.stoneD); }
    R(g, x0 + 5, by - 14, 6, 8, X.wood); px(g, x0 + 5, by - 14, X.stone); px(g, x0 + 10, by - 14, X.stone);
    R(g, x0 + 7, by - 26, 2, 5, X.hole);
    R(g, x0 - 1, by - 47, 18, 2, X.stoneH);
    R(g, x0 + 1, by - 54, 14, 7, X.stone); R(g, x0 + 4, by - 53, 8, 5, X.hole);
    if (ok) { disc(g, x0 + 8, by - 50, 2, X.gold); px(g, x0 + 8, by - 47, X.goldD); }
    // mặt đồng hồ
    const cx = x0 + 8, cy = by - 37;
    if (ok) {
      disc(g, cx, cy, 5, "#ffffff"); ring(g, cx, cy, 5, X.gold); ring(g, cx, cy, 6, X.goldD);
      [[0, -4], [4, 0], [0, 4], [-4, 0]].forEach(([dx, dy]) => px(g, cx + dx, cy + dy, X.k));
      line(g, cx, cy, cx, cy - 3, X.k); line(g, cx, cy, cx + 2, cy + 1, X.k);
    } else {
      disc(g, cx, cy, 5, X.hole); [[-5, 0], [-4, -3], [3, -4], [5, 1]].forEach(([dx, dy]) => px(g, cx + dx, cy + dy, X.goldD));
      line(g, x0 + 3, by - 30, x0 + 6, by - 20, X.stoneD); line(g, x0 + 12, by - 44, x0 + 10, by - 34, X.stoneD);
    }
    // mái chóp
    for (let k = 0; k <= 9; k++) {
      const w = 2 + k * 2, x = x0 + 8 - w / 2, y = by - 64 + k;
      for (let i = 0; i < w; i++) { if (!ok && i < w / 2 && k > 2) { continue; } px(g, x + i, y, i % 3 === 0 ? X.R : X.r); }
    }
    if (ok) { px(g, x0 + 8, by - 65, X.gold); px(g, x0 + 8, by - 66, X.gold); px(g, x0 + 9, by - 66, X.gold); }
    else { [[x0 + 3, by - 57], [x0 + 5, by - 59], [x0 + 6, by - 61]].forEach(([x, y]) => px(g, x, y, X.R)); vine(g, x0 + 1, by - 30, by - 6); }
    if (scaffold) { scaff(g, x0 - 5, by, 26, 62); }
  }
  function scaff(g, x0, by, w, h) {               // giàn giáo tre
    for (let x = x0; x <= x0 + w; x += 6) { R(g, x, by - h, 1, h, "#c9a15a"); }
    for (let y = by - 4; y > by - h; y -= 8) { R(g, x0, y, w + 1, 1, "#a77d35"); for (let x = x0; x < x0 + w; x += 6) { line(g, x, y, x + 6, y - 8, "#d9b46a"); } }
    for (let y = by - 4; y > by - h; y -= 16) { R(g, x0 - 1, y - 1, w + 3, 2, X.wood3); }
  }
  function library(g, x0, by, ok, night) {        // thư viện 図書館, 40 × 38
    R(g, x0, by - 26, 40, 26, ok ? X.brick : X.brickD);
    for (let r = 0; r < 9; r++) { R(g, x0, by - 26 + r * 3, 40, 1, X.brickD); for (let c = 0; c < 10; c++) { px(g, x0 + c * 4 + (r % 2 ? 2 : 0), by - 25 + r * 3, X.brickD); } }
    R(g, x0, by - 27, 40, 2, X.cream); R(g, x0, by - 26, 2, 26, X.cream); R(g, x0 + 38, by - 26, 2, 26, X.cream);
    for (let k = 0; k <= 9; k++) { const w = 8 + k * 4.4, x = x0 + 20 - w / 2; for (let i = 0; i < w; i++) { px(g, x + i, by - 37 + k, k === 9 ? X.B : (i % 2 ? X.b : X.B)); } }
    disc(g, x0 + 20, by - 31, 2, ok ? (night ? "#ffd87a" : X.glass) : X.hole);
    // cửa sổ vòm lớn + kệ sách
    const wx = x0 + 13, wy = by - 21;
    R(g, wx, wy, 14, 15, ok ? (night ? "#ffe3a0" : "#fff6dc") : X.hole); R(g, wx + 1, wy - 1, 12, 1, ok ? (night ? "#ffe3a0" : "#fff6dc") : X.hole); R(g, wx + 3, wy - 2, 8, 1, X.cream);
    if (ok) {
      [wy + 2, wy + 8].forEach((sy) => { for (let i = 0; i < 12; i++) { const h = 4 + Math.floor(hash(i + sy) * 2); R(g, wx + 1 + i, sy + 5 - h, 1, h, ["r", "u", "g", "y", "v", "o", "B", "R"][Math.floor(hash(i * 3 + sy) * 8)]); } R(g, wx + 1, sy + 5, 12, 1, X.wood); });
      R(g, wx + 7, wy - 1, 1, 16, X.cream); R(g, wx, wy + 7, 14, 1, X.cream);
    } else {
      [[wx + 2, wy + 1], [wx + 9, wy + 3], [wx + 4, wy + 10], [wx + 11, wy + 12]].forEach(([x, y]) => { line(g, x, y, x + 2, y + 3, X.glassD); });
      [[x0 + 2, by + 1, "r"], [x0 + 8, by + 2, "u"], [x0 + 26, by + 1, "y"], [x0 + 33, by + 3, "g"], [x0 + 15, by + 3, "v"]].forEach(([x, y, c]) => { R(g, x, y, 4, 2, c); px(g, x, y, X.cream); });
    }
    R(g, x0 + 30, by - 13, 6, 13, ok ? X.wood2 : X.wood); R(g, x0 + 29, by - 1, 8, 1, X.stoneH);
    if (!ok) { line(g, x0 + 29, by - 12, x0 + 37, by - 2, X.wood3); line(g, x0 + 37, by - 12, x0 + 29, by - 2, X.wood3); weeds(g, x0 - 1, by, 5); R(g, x0 + 6, by - 20, 3, 2, X.hole); R(g, x0 + 33, by - 22, 3, 3, X.hole); }
    R(g, x0 + 4, by - 17, 6, 7, ok ? (night ? "#ffd87a" : X.glass) : X.hole);
    R(g, x0 + 12, by - 25, 16, 3, X.wood); if (ok) { [14, 19, 24].forEach((t) => R(g, x0 + t, by - 24, 3, 1, X.cream)); }
  }
  function greenhouse(g, x0, by, ok) {             // nhà kính, 40 × 28
    R(g, x0, by - 3, 40, 3, X.stone);
    R(g, x0 + 1, by - 18, 38, 15, ok ? X.glass : "#5f6f5a");
    for (let k = 0; k <= 9; k++) { const half = 19 * Math.sqrt(1 - (k / 10) * (k / 10)); R(g, x0 + 20 - half, by - 19 - k, half * 2, 1, ok ? X.glass : "#5f6f5a"); }
    // cây trong nhà kính
    for (let i = 0; i < 12; i++) {
      const x = x0 + 3 + i * 3, h = 4 + Math.floor(hash(i + 3) * 5);
      R(g, x, by - 4 - h, 1, h, ok ? X.G : X.dead);
      if (ok) { px(g, x, by - 5 - h, ["r", "p", "y", "v", "o", "P"][i % 6]); px(g, x + 1, by - 4 - h, ["r", "p", "y", "v", "o", "P"][i % 6]); px(g, x - 1, by - 3 - h, X.g); }
    }
    R(g, x0 + 2, by - 5, 36, 2, X.wood3);
    if (ok) { [[x0 + 8, by - 24, "r"], [x0 + 30, by - 23, "o"], [x0 + 20, by - 26, "y"]].forEach(([x, y, c]) => { line(g, x, y - 3, x, y, X.G); px(g, x, y + 1, c); px(g, x + 1, y + 1, c); }); }
    // khung
    for (let x = x0 + 1; x <= x0 + 39; x += 6) { R(g, x, by - 18, 1, 15, X.w); }
    R(g, x0 + 1, by - 11, 38, 1, X.w); R(g, x0 + 1, by - 18, 38, 1, X.w);
    for (let k = 0; k < 3; k++) { const r = 19 - k * 7; for (let a = 0; a <= 180; a += 3) { px(g, Math.round(x0 + 20 + r * Math.cos(a * Math.PI / 180)), Math.round(by - 18 - Math.min(10, (r ? 10 * r / 19 : 0)) * Math.sin(a * Math.PI / 180)), X.w); } }
    R(g, x0 + 17, by - 13, 6, 10, ok ? X.glassD : X.hole);
    if (ok) { line(g, x0 + 4, by - 16, x0 + 8, by - 12, "#ffffff"); line(g, x0 + 26, by - 25, x0 + 30, by - 21, "#ffffff"); }
    else {
      [[x0 + 2, by - 17, 5, 5], [x0 + 26, by - 17, 5, 6], [x0 + 12, by - 24, 6, 4], [x0 + 32, by - 10, 5, 6]].forEach(([x, y, w, h]) => R(g, x, y, w, h, X.ruinD));
      [[x0 + 4, by + 1], [x0 + 28, by + 2], [x0 + 15, by + 1]].forEach(([x, y]) => line(g, x, y, x + 2, y - 1, "#d0f0ff"));
      weeds(g, x0 - 1, by, 4); weeds(g, x0 + 30, by, 4);
    }
  }
  function mill(g, x0, by, ok) {                   // guồng nước: chòi 22 × 22 + bánh xe r 10 trên suối
    R(g, x0, by - 13, 22, 13, X.wood2);
    for (let x = x0 + 2; x < x0 + 22; x += 3) { R(g, x, by - 13, 1, 13, X.wood); }
    R(g, x0 + 4, by - 9, 5, 9, ok ? X.wood : X.hole); R(g, x0 + 13, by - 10, 5, 4, ok ? X.glass : X.hole);
    for (let k = 0; k <= 9; k++) { const w = 6 + k * 2.6, x = x0 + 11 - w / 2; for (let i = 0; i < w; i++) { px(g, x + i, by - 23 + k, (i + k) % 3 === 0 ? X.strawD : X.straw); } }
    if (!ok) { R(g, x0 + 6, by - 19, 5, 2, X.hole); R(g, x0 + 14, by - 17, 4, 2, X.hole); }
    const cx = x0 + 28, cy = by - 9, r = 10;
    R(g, x0 + 21, by - 10, cx - x0 - 21, 2, X.wood);
    if (ok) {
      ring(g, cx, cy, r, X.wood2); ring(g, cx, cy, r - 1, X.wood); ring(g, cx, cy, r - 3, X.wood2);
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.2; line(g, cx, cy, Math.round(cx + (r - 1) * Math.cos(a)), Math.round(cy + (r - 1) * Math.sin(a)), X.wood3); R(g, Math.round(cx + r * Math.cos(a)) - 1, Math.round(cy + r * Math.sin(a)) - 1, 2, 2, X.wood); }
      disc(g, cx, cy, 1, X.wood);
      [[cx - 3, cy + r + 1], [cx + 2, cy + r], [cx + 5, cy + r - 2], [cx - 6, cy + r - 1]].forEach(([x, y]) => { px(g, x, y, "#ffffff"); px(g, x + 1, y - 1, X.waterH); });
    } else {
      for (let a = 200; a <= 340; a += 2) { px(g, Math.round(cx + r * Math.cos(a * Math.PI / 180)), Math.round(cy + r * Math.sin(a * Math.PI / 180)), X.wood2); }
      line(g, cx, cy, cx - 7, cy - 6, X.wood3); line(g, cx, cy, cx + 6, cy - 7, X.wood3); line(g, cx + 2, cy + 3, cx + 9, cy + 9, X.wood);
      vine(g, x0 + 1, by - 12, by);
    }
  }
  function bridge(g, x0, y, ok) {                  // cầu đá vòm qua suối, 26 × 10
    for (let x = 0; x < 26; x++) {
      const top = y - Math.round(2 * Math.sin(Math.PI * x / 25));
      const gap = !ok && x >= 10 && x <= 15;
      if (gap) { continue; }
      R(g, x0 + x, top, 1, 3, X.stoneH);
      const hole = x >= 6 && x <= 19 ? Math.round(5 * Math.sqrt(Math.max(0, 1 - ((x - 12.5) / 7) * ((x - 12.5) / 7)))) : 0;
      R(g, x0 + x, top + 3, 1, 7 - hole, X.stone);
      if (x % 4 === 0) { R(g, x0 + x, top - 3, 1, 3, X.stoneD); }
      px(g, x0 + x, top - 3, X.stoneD);
    }
    if (!ok) { [[x0 + 11, y + 8], [x0 + 14, y + 10], [x0 + 12, y + 13]].forEach(([x, yy]) => R(g, x, yy, 2, 2, X.stoneD)); line(g, x0 + 8, y - 4, x0 + 18, y + 2, X.wood3); }
  }
  function dock(g, x0, y, ok) {                    // bến gỗ ra ao
    for (let x = 0; x < 24; x++) { if (!ok && (x > 9 && x < 14 || x > 19)) { continue; } R(g, x0 + x, y + (ok ? 0 : (x > 14 ? 1 : 0)), 1, 3, x % 4 === 3 ? X.wood : X.wood3); }
    [0, 8, 16, 23].forEach((p) => { if (!ok && p > 9) { return; } R(g, x0 + p, y + 3, 1, 5, X.wood); });
  }
  function boat(g, x0, y, ok) {
    if (ok) { rows(g, ["......w.........", ".....ww.........", "....www.........", "...wwww.........", "......k.........", "bbbbbbbbbbbbbbbb", ".RRRRRRRRRRRRRR.", "..wwwwwwwwwwww..", "...RRRRRRRRRR..."], x0, y - 5); }
    else { rows(g, ["...bb", "..bRR", ".bRR."], x0 + 9, y + 1); [[x0 + 4, y + 2], [x0 + 16, y + 3]].forEach(([x, yy]) => { px(g, x, yy, X.waterH); px(g, x + 1, yy - 1, X.waterH); }); }
  }
  function deadTree(g, x, by) { R(g, x, by - 20, 2, 20, X.B); line(g, x, by - 14, x - 6, by - 20, X.B); line(g, x + 1, by - 17, x + 7, by - 24, X.B); line(g, x, by - 20, x - 3, by - 26, X.B); line(g, x + 4, by - 21, x + 5, by - 26, X.B); }

  // cảnh làng 320 × 96: opts {ok, night, scaffold, statue, chans}
  function village(o) {
    o = o || {};
    const [c, g] = canvas(W, H), ok = !!o.ok, night = !!o.night;
    sky(g, night); ground(g, ok, night);
    if (ok) { item(g, "cedar", 146, 50); item(g, "cedar", 312, 54); item(g, "cedar", 8, 58); item(g, "momiji", 262, 60); item(g, "sakura", 40, 66); }
    else { deadTree(g, 148, 46); deadTree(g, 308, 52); }
    water(g, ok); path(g, ok);
    const B = Object.assign({ mill: ok, tower: ok, kominkan: ok, library: ok, greenhouse: ok, bridge: ok, dock: ok }, o.b || {});
    mill(g, 80, 52, B.mill);
    tower(g, 126, 62, B.tower || o.scaffold, o.scaffold);
    kominkan(g, 152, 66, B.kominkan, night);
    library(g, 224, 62, B.library, night);
    greenhouse(g, 272, 64, B.greenhouse);
    bridge(g, 78, 61, B.bridge);
    dock(g, 42, 80, B.dock); boat(g, 10, 89, B.dock);
    if (ok) {
      item(g, "lantern", 76, 62); item(g, "lantern", 106, 62);
      item(g, "bench", 196, 90); item(g, "bench", 286, 92);
      if (o.statue) { statue(g, 238, 92); } else { item(g, "fountain", 238, 92); }
      if (!o.quiet) { item(g, "jizo", 120, 92); }
      item(g, "flowers", 174, 94); item(g, "flowers", 302, 94);
      // dây đèn lồng ngang quảng trường
      for (let x = 186; x <= 292; x++) { const y = 58 + Math.round(6 * Math.sin(Math.PI * (x - 186) / 106)); px(g, x, y, X.wood); if (x % 9 === 0) { R(g, x - 1, y + 1, 3, 3, night ? "#ffd23f" : ["r", "y", "o"][(x / 9) % 3]); } }
      if (!o.quiet) { guest(g, "tanuki", 166, 90); guest(g, "shika", 128, 88, true); }
      guest(g, "kitsune", 300, 82, true); guest(g, "suzume", 254, 52);
      chan(g, 52, 81, "sit");
      line(g, 70, 70, 80, 64, X.wood); line(g, 80, 64, 82, 84, "#ffffff"); px(g, 82, 85, X.r); px(g, 82, 84, X.r);
      if (o.chans) { chan(g, 196, 86, "wave"); }
    } else {
      [[60, 70], [190, 80], [276, 88], [118, 84]].forEach(([x, y]) => { R(g, x, y, 5, 3, X.stoneD); R(g, x + 1, y - 1, 3, 1, X.stone); });
      weeds(g, 160, 90, 9); weeds(g, 230, 86, 8); weeds(g, 100, 76, 6); weeds(g, 280, 94, 7);
      guest(g, "kamome", 200, 20); guest(g, "fukuro", 142, 18);
      chan(g, 186, 90, "stand");
    }
    if (night) {
      g.fillStyle = "rgba(10,18,50,0.30)"; g.fillRect(0, 0, W, HOR); g.fillStyle = "rgba(10,18,50,0.42)"; g.fillRect(0, HOR, W, H - HOR);
      disc(g, 286, 9, 4, "#fff3c4"); disc(g, 288, 8, 3, "rgb(22,30,66)");
      [[160, 49], [171, 49], [197, 49], [208, 49], [243, 48], [232, 49], [244, 31], [95, 47], [76, 52], [106, 52]].forEach(([x, y]) => glow(g, x, y, 9, "255,200,90", 0.38));
      for (let x = 186; x <= 292; x += 9) { const y = 58 + Math.round(6 * Math.sin(Math.PI * (x - 186) / 106)); glow(g, x, y + 2, 6, "255,200,90", 0.45); R(g, x - 1, y + 1, 3, 3, "#ffe680"); }
      if (o.statue) { glow(g, 238, 78, 22, "255,210,80", 0.55); statue(g, 238, 92); }
    }
    return c;
  }
  function statue(g, cx, by) {                    // tượng StackChan vàng trên bệ đá
    R(g, cx - 13, by - 9, 26, 9, X.stone); R(g, cx - 14, by - 10, 28, 2, X.stoneH); R(g, cx - 13, by - 1, 26, 1, X.stoneD);
    R(g, cx - 6, by - 7, 12, 4, X.goldD); R(g, cx - 5, by - 6, 10, 2, X.gold);
    const [s, sg] = canvas(24, 16); GardenLife.preview(sg, 1, 0, 0, {}, "wave");
    g.drawImage(goldify(s), cx - 12, by - 26);
    [[cx - 15, by - 24], [cx + 14, by - 20], [cx - 9, by - 30], [cx + 9, by - 29]].forEach(([x, y]) => { px(g, x, y, X.goldH); px(g, x - 1, y, X.gold); px(g, x + 1, y, X.gold); px(g, x, y - 1, X.gold); px(g, x, y + 1, X.gold); });
  }

  // ---------------------------------------------------------------- khung phủ trang
  let ov = null;
  function clear() { if (ov) { ov.remove(); ov = null; } }
  function overlay(title, sub) {
    clear();
    ov = document.createElement("div"); ov.id = "tx-ov";
    ov.style.cssText = "position:fixed;left:0;right:0;bottom:0;top:72px;z-index:400;background:var(--kb-bg,#efe4d0);overflow:hidden;padding:10px 16px;box-sizing:border-box;font-family:inherit;color:var(--kb-ink,#3a2a22)";
    const h = el("div", "", "display:flex;align-items:baseline;gap:12px;margin-bottom:8px");
    h.appendChild(el("b", "", "font-size:19px", title));
    if (sub) { h.appendChild(el("span", "kb-le-hintt", "font-size:13px", sub)); }
    h.appendChild(el("span", "", "margin-left:auto;font-size:12px;padding:2px 8px;border:2px dashed var(--kb-ink,#3a2a22);border-radius:6px;background:#fff6c8", "Ảnh phác · chưa làm"));
    ov.appendChild(h);
    document.body.appendChild(ov);
    return ov;
  }
  function el(tag, cls, css, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (css) { e.style.cssText = css; } if (text !== undefined) { e.textContent = text; } return e; }
  function card(css) { return el("div", "kb-h-card", "display:flex;flex-direction:column;gap:6px;align-items:stretch;background:var(--kb-paper,#fffaf0);border:3px solid var(--kb-ink,#3a2a22);box-shadow:4px 4px 0 rgba(58,42,34,.25);padding:10px 12px;box-sizing:border-box;margin:0;" + (css || "")); }
  function framed(c, css) { c.style.cssText = "display:block;border:3px solid var(--kb-ink,#3a2a22);image-rendering:pixelated;" + (css || ""); return c; }
  function tag(text, bg) { return el("span", "", "display:inline-block;font-size:12px;padding:1px 7px;border:2px solid var(--kb-ink,#3a2a22);border-radius:10px;background:" + (bg || "#fff") + ";margin:0 4px 0 0", text); }
  function btn(text, hot) { const b = el("button", "kb-btn kb-btn-small", hot ? "background:#bdf0c8" : "", text); b.type = "button"; return b; }

  const SHOW = {};
  // 1. Làng trước / sau
  SHOW[1] = function () {
    const o = overlay("Làng ことば — vùng mới «Làng» trong ◂ cảnh ▸", "góp đủ 6 phòng ở Nhà văn hoá thì làng sống lại, từng công trình một");
    const S = 3.3;
    [[false, "Lúc mới mở: làng bỏ hoang — nhà văn hoá dột mái, tháp đồng hồ hỏng, cầu gãy, thuyền chìm, nhà kính vỡ kính"],
     [true, "Sau khi góp đủ: đèn lồng, thuyền trên ao, StackChan câu cá, guồng nước quay, nhà kính đầy hoa, khách ghé chơi"]].forEach(([ok, cap], k) => {
      const box = el("div", "", "margin-bottom:6px");
      const lab = el("div", "", "display:flex;align-items:center;gap:8px;margin:0 0 4px;font-size:14px");
      lab.appendChild(tag(ok ? "SAU" : "TRƯỚC", ok ? "#bdf0c8" : "#f4c7c3")); lab.appendChild(el("span", "", "", cap));
      box.appendChild(lab);
      box.appendChild(framed(up(village({ ok: ok }), S), "margin:0 auto"));
      o.appendChild(box);
    });
  };
  // ---------------------------------------------------------------- hình nhỏ (12–16 điểm)
  const ICON = {
    gao: ["....kkkk....", "...kwwwwk...", "...kkkkkk...", "..kwwwwwwk..", ".kwwwwwwwwk.", ".kwwRRRRwwk.", ".kwwRwwRwwk.", ".kwwRRRRwwk.", ".kwwwRRwwwk.", ".kwwwwwwwwk.", "..kwwwwwwk..", "...kkkkkk..."],
    daikon: ["..G.g.G.....", "...gGg......", "....g.......", "...kwk......", "...kwwk.....", "...kwwk.....", "...kwwk.....", "...kwwk.....", "....kwk.....", "....kwk.....", ".....k......"],
    kabocha: [".....B......", "....kBk.....", "..kkGGGkk...", ".kGGgGGgGk..", "kGGgGGgGGGk.", "kGgGGgGGgGk.", "kGGgGGgGGGk.", ".kGGgGGgGk..", "..kkkkkkk..."],
    sakuranbo: ["......G.....", ".....GG.....", "....G..G....", "...G....G...", "..kk....kk..", ".kRrk..kRrk.", ".kRRk..kRRk.", "..kk....kk.."],
    coin: ["..kkkk..", ".kyyyyk.", "kyhyyyyk", "kyhyiyyk", "kyyyiyyk", "kyyyyyyk", ".kyyyyk.", "..kkkk.."],
    can: ["...........kk..", "..kkkkkk..kc.k.", ".kccccccck.c..k", "kcchhcccck.c...", "kchcccccckcc...", "kcccccccccc....", "kcccccccck.....", ".kcccccck......", "..kkkkkk......."],
    heart: [".pp.pp.", "ppppppp", "ppppppp", ".ppppp.", "..ppp..", "...p..."],
    heartE: [".kk.kk.", "k..k..k", "k.....k", ".k...k.", "..k.k..", "...k..."],
    hat: [".yyyyy.", "yyyyyyy", "yyyyyyyy"],
    hammer: ["kkkk", "kkkk", ".b..", ".b..", ".b..", ".b.."]
  };
  const DISH = {
    onigiri: ["......kk......", ".....kwwk.....", "....kwwwwk....", "...kwwwwwwk...", "..kwwwwwwwwk..", ".kwwwwwwwwwwk.", ".kwwnnnnnnwwk.", "kwwwnnnnnnwwwk", "kwwwnnnnnnwwwk", ".kkkkkkkkkkkk."],
    miso: ["....w....w....", ".....w..w.....", "..kkkkkkkkkk..", ".kttttGttGttk.", "kRtttwwtttttRk", "kRRttttttttRRk", ".kRRRRRRRRRRk.", "..kRRRRRRRRk..", "....kkkkkk...."],
    tamago: ["..............", "..kkkkkkkkkk..", ".kyyhykyyhyyk.", ".kyhyykyhyyyk.", ".kyyyykyyyyyk.", "..kkkkkkkkkk..", "swwwwwwwwwwwws", ".ssssssssssss."],
    takoyaki: ["......G.......", "..kkk..kkk....", ".kBbBk.kBbBk..", ".kbhbk.kbhbk..", "..kkkkkkkkk...", ".kBbBkGkBbBk..", ".kbhbk.kbhbk..", "..kkk..kkk....", "bbbbbbbbbbbbbb", ".BBBBBBBBBBBB."],
    ramen: ["...k..k.......", "...k..k.......", "..kkkkkkkkkkk.", ".kyyywwpwyyyGk", "kyyyywpwwyyyyk", "kRyyyyyyyyyyRk", ".kRRRRRRRRRRk.", "..kRRRRRRRRk..", "....kkkkkk...."],
    dango: [".....kkk.....", "....kPPPk....", "....kPPPk....", ".....kkk.....", "....kwwwk....", "....kwwwk....", ".....kkk.....", "....kGGGk....", "....kGGGk....", ".....kkk.....", "......t......", "......t......"],
    curry: ["..............", "..kkkkkkkkkk..", ".kwwwwwbbbbbk.", "kwwwwwbbobbbbk", "kwwwwbbbbbobbk", ".kwwwwbbbbbbk.", "..kkkkkkkkkk.."],
    sushi: ["..............", "..kkkkkkkkkk..", ".koooooooooook", ".kowowowowowok", "..kkkkkkkkkk..", "..kwwwwwwwwk..", "..kwwwwwwwwk..", "...kkkkkkkk..."],
    mochi: ["..............", "....kkkkkk....", "..kkwwwwwwkk..", ".kwwwwwwwwwwk.", ".kwwwwwwwwwwk.", "..kkkkkkkkkk..", ".ssssssssssss."],
    nimono: ["..............", "..kkkkkkkkkk..", ".kooGookoooGok", "kRooohoooGoooRk", "kRRoooooooooRRk", ".kRRRRRRRRRRRk.", "..kRRRRRRRRRk..", "....kkkkkkk...."],
    oden: [".......k......", "......kwk.....", "......kwk.....", ".....kttk.....", "....kttttk....", ".....kkkk.....", "....kwwwwk....", "....kwyywk....", ".....kkkk.....", "......t.......", "......t......."],
    takegohan: ["..............", "..kkkkkkkkkk..", ".kwbwwbwwwbwk.", "kwwwbwwbwwwbwk", "kuwwwwwwwwwwuk", ".kuuuuuuuuuuk.", "..kuuuuuuuuk..", "....kkkkkk...."]
  };
  const FLOWER = {
    sakura: [".......PP.......", "......PPPP......", "......PPPP......", ".PPP...PP...PPP.", "PPPPP..pp..PPPPP", ".PPPPPpyypPPPPP.", "...PPPpyypPPP...", "......pyyp......", "....PPpppPPP....", "...PPPP..PPPP...", "..PPPP....PPPP..", "..PPP......PPP.."],
    momiji: [".......r........", "......rrr.......", "..r...rrr...r...", "..rr..rrr..rr...", "...rr.rrr.rr....", "r...rrrrrrr...r.", ".rrrrrrrrrrrrr..", "...rrrrrrrrr....", "..rr..rrr..rr...", ".r.....R.....r..", ".......R........", ".......R........"],
    ajisai: ["....vvd.vv......", "..dvvdvvdvvd....", ".vdvvdvvdvvdv...", ".dvvdvvdvvdvvd..", "..vdvvdvvdvvd...", "...dvvdvvdvv....", ".....vdvvd......", "......GG........", ".....G..G.......", "....G....G......"],
    himawari: ["....y.y.y.......", "..y.yyyyy.y.....", "...yyBBByy......", ".yyyBbbbByyy....", "..yyBbbbByy.....", ".yyyBbbbByyy....", "...yyBBByy......", "..y.yyyyy.y.....", "....y.y.y.......", "......G.........", ".....GG.........", "......G........."],
    asagao: ["...dddddd.......", "..dlllllld......", ".dllwwwwlld.....", ".dlwwyywwld.....", ".dllwwwwlld.....", "..dlllllld......", "...ddddddG......", "......GG.G......", ".....G...G......"],
    tanpopo: ["...y.y.y........", "..yyyyyyy.......", ".yyyiiiyyy......", "..yyiiiyy.......", ".yyyiiiyyy......", "..yyyyyyy.......", "...y.y.y........", ".....G..........", ".....G..........", "....GG..........", ".....G.........."]
  };
  function iconCv(rs, S, bg) {
    const w = Math.max(...rs.map((r) => r.length)), h = rs.length;
    const [c, g] = canvas((w + 2) * S, (h + 2) * S);
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height); }
    g.save(); g.scale(S, S); rows(g, rs, 1, 1); g.restore(); c.style.imageRendering = "pixelated"; c.style.verticalAlign = "middle"; return c;
  }
  function recolor(rs, map) { return rs.map((r) => r.split("").map((ch) => map[ch] || ch).join("")); }
  function find(id, S, found) { const c = GardenFinds.icon(id, S || 3, found !== false); c.style.verticalAlign = "middle"; return c; }
  function hearts(n, of) { const w = el("span", "", "display:inline-flex;gap:3px;vertical-align:middle"); for (let i = 0; i < of; i++) { w.appendChild(iconCv(i < n ? ICON.heart : ICON.heartE, 2)); } return w; }
  function bar(v, of, col) {
    const b = el("div", "", "position:relative;height:12px;border:2px solid var(--kb-ink,#3a2a22);background:#fff;border-radius:3px;overflow:hidden;min-width:90px;flex:1");
    b.appendChild(el("div", "", "position:absolute;left:0;top:0;bottom:0;width:" + Math.round(100 * Math.min(1, v / of)) + "%;background:" + (col || "#7ad37a")));
    return b;
  }
  function slot(content, done, label) {
    const s = el("div", "", "display:flex;flex-direction:column;align-items:center;gap:2px;width:62px;font-size:11px;text-align:center");
    const b = el("div", "", "width:50px;height:50px;border:3px solid var(--kb-ink,#3a2a22);border-radius:6px;display:flex;align-items:center;justify-content:center;position:relative;background:" + (done ? "#d9f5cf" : "#f3ecdf"));
    b.appendChild(content);
    if (done) { b.appendChild(el("span", "", "position:absolute;right:-6px;bottom:-6px;background:#3ccb5e;color:#fff;border:2px solid var(--kb-ink,#3a2a22);border-radius:10px;font-size:11px;line-height:14px;padding:0 3px", "✓")); }
    s.appendChild(b); if (label) { s.appendChild(el("span", "", "line-height:1.15", label)); }
    return s;
  }
  function bigText(text, css) { return el("div", "", "font-size:26px;font-weight:bold;line-height:1.2;" + (css || ""), text); }

  // 2. Nhà văn hoá — gói góp
  SHOW[2] = function () {
    const o = overlay("Nhà văn hoá làng — góp gói để sửa làng", "kiểu «Trung tâm cộng đồng» của Stardew: mỗi phòng xong thì một công trình sống lại");
    const row = el("div", "", "display:flex;gap:14px;align-items:stretch;height:calc(100% - 40px)");
    o.appendChild(row);
    // cột trái: 6 phòng
    const left = card("width:300px;display:flex;flex-direction:column;gap:6px");
    const [kc, kg] = canvas(76, 52);
    for (let y = 0; y < 30; y++) { R(kg, 0, y, 76, 1, "rgb(" + [Math.round(130 + 84 * y / 30), Math.round(205 + 36 * y / 30), 250].join(",") + ")"); }
    R(kg, 0, 30, 76, 22, X.grass); for (let i = 0; i < 40; i++) { px(kg, Math.floor(hash(i + 9) * 76), 31 + Math.floor(hash(i + 19) * 20), X.grassD); }
    kominkan(kg, 6, 48, true, false); scaff(kg, 50, 48, 22, 30); item(kg, "flowers", 8, 52); item(kg, "flowers", 68, 52);
    left.appendChild(framed(up(kc, 3.6), "margin:0 auto"));
    left.appendChild(el("b", "", "font-size:15px", "6 phòng · 3/6 xong"));
    const ROOMS = [
      ["Phòng Ruộng vườn", "Guồng nước", 4, 4, "kabocha"], ["Phòng Đá", "Cầu đá", 3, 3, "coin"], ["Phòng Sách", "Thư viện", 4, 4, "gao"],
      ["Phòng Bến nước", "Bến thuyền", 2, 4, "sakuranbo"], ["Phòng Hoa", "Nhà kính", 1, 4, "daikon"], ["Kho bạc", "Tháp đồng hồ", 2, 4, "coin"]
    ];
    ROOMS.forEach(([n, rw, d, of], k) => {
      const it = el("div", "", "display:flex;align-items:center;gap:8px;padding:5px 6px;border:2px solid var(--kb-ink,#3a2a22);border-radius:6px;background:" + (k === 3 ? "#fff3b0" : d === of ? "#e3f6dc" : "#fff"));
      const t = el("div", "", "flex:1;font-size:13px;line-height:1.25");
      t.appendChild(el("b", "", "", n)); t.appendChild(el("div", "", "font-size:11px;opacity:.8", "→ sửa " + rw));
      it.appendChild(t);
      it.appendChild(el("span", "", "font-size:12px;white-space:nowrap", d === of ? "✓ xong" : d + "/" + of + " gói"));
      left.appendChild(it);
    });
    const mini = framed(up(village({ ok: true, b: { dock: false, greenhouse: false, tower: false } }), 0.86), "margin-top:auto");
    left.appendChild(el("div", "", "font-size:11px;margin-top:6px", "Làng lúc này (3/6 phòng):")); left.appendChild(mini);
    row.appendChild(left);
    // giữa: phòng đang chọn
    const mid = card("flex:1;display:flex;flex-direction:column;gap:10px");
    mid.appendChild(el("b", "", "font-size:17px", "Phòng Bến nước · 2/4 gói"));
    const grid = el("div", "", "display:grid;grid-template-columns:1fr 1fr;gap:10px");
    mid.appendChild(grid);
    function bundle(title, sub, items, done) {
      const b = el("div", "", "border:3px solid var(--kb-ink,#3a2a22);border-radius:8px;padding:8px;background:" + (done ? "#e3f6dc" : "#fffaf0"));
      const h = el("div", "", "display:flex;align-items:center;gap:6px;margin-bottom:6px"); h.appendChild(el("b", "", "font-size:14px", title)); if (done) { h.appendChild(tag("✓ đã góp", "#bdf0c8")); } b.appendChild(h);
      if (sub) { b.appendChild(el("div", "", "font-size:11px;opacity:.8;margin:-3px 0 6px", sub)); }
      const sl = el("div", "", "display:flex;gap:6px;flex-wrap:wrap"); items.forEach((x) => sl.appendChild(x)); b.appendChild(sl);
      return b;
    }
    grid.appendChild(bundle("Gói bờ biển", "nhặt ở chỗ lấp lánh vùng Bãi biển", [slot(find("kaigara", 3), true, "vỏ sò"), slot(find("hitode", 3), true, "sao biển"), slot(find("makigai", 3, false), false, "ốc xoắn"), slot(find("seaglass", 3, false), false, "thuỷ tinh biển")], false));
    const learn = el("div", "", "display:flex;flex-direction:column;gap:6px;font-size:12px;width:100%");
    [["Thuộc thêm 100 từ (cây lên Ra hoa)", 87, 100], ["Có ôn 14 ngày trong tháng", 14, 14], ["Đọc 5 số báo", 3, 5]].forEach(([t, v, of]) => {
      const r = el("div", "", "display:flex;align-items:center;gap:8px"); r.appendChild(el("span", "", "width:190px", t)); r.appendChild(bar(v, of, v >= of ? "#7ad37a" : "#ffd23f")); r.appendChild(el("b", "", "width:52px;text-align:right", v + "/" + of)); learn.appendChild(r);
    });
    grid.appendChild(bundle("Gói chăm học", "đếm từ lúc mở Nhà văn hoá — ôn đều là xong", [learn], false));
    grid.appendChild(bundle("Gói nông sản", "thu từ cây đã Ra quả (xem Bếp)", [slot(iconCv(ICON.gao, 3), true, "gạo ×5"), slot(iconCv(ICON.daikon, 3), true, "củ cải ×3"), slot(iconCv(ICON.kabocha, 3), true, "bí ngô ×2")], true));
    const pay = el("div", "", "display:flex;align-items:center;gap:10px;font-size:13px");
    pay.appendChild(iconCv(ICON.coin, 4)); pay.appendChild(el("span", "", "", "2.000 xu"));
    pay.appendChild(btn("Đã góp ✓"));
    grid.appendChild(bundle("Gói xu", "góp một lần", [pay], true));
    const board = el("div", "", "border:3px solid var(--kb-ink,#3a2a22);border-radius:8px;padding:8px;background:repeating-linear-gradient(90deg,#c79a63,#c79a63 18px,#b98a54 19px)");
    board.appendChild(el("b", "", "font-size:14px;color:#fffaf0;text-shadow:1px 1px 0 #3a2a22", "Bảng việc làng · tuần này (như Special Orders của Stardew)"));
    const notes = el("div", "", "display:flex;gap:8px;margin-top:6px");
    [["Sếu", "Cần 3 bó lúa lót tổ.", "gạo ×3", "Thưởng: tượng sếu gỗ", "#fffaf0", "-2deg"], ["Bác Tanuki", "Ôn 150 lượt deck Kanji trong tuần.", "98/150", "Thưởng: công xây −20%", "#fff3b0", "1.5deg"], ["Chị Hana", "Quán cần 2 bát canh miso.", "Bếp nấu", "Thưởng: công thức ラーメン", "#e8f4ff", "-1deg"]].forEach(([who, t, need, rwd, bgc, rot]) => {
      const n = el("div", "", "flex:1;padding:6px 8px;background:" + bgc + ";border:2px solid var(--kb-ink,#3a2a22);box-shadow:2px 2px 0 rgba(0,0,0,.25);font-size:12px;line-height:1.35;transform:rotate(" + rot + ")");
      n.appendChild(el("b", "", "", "📌 " + who)); n.appendChild(el("div", "", "", t)); n.appendChild(el("div", "", "opacity:.75", need)); n.appendChild(el("div", "", "color:#2e8b3a", rwd)); notes.appendChild(n);
    });
    board.appendChild(notes); mid.appendChild(board);
    const rw = el("div", "", "display:flex;gap:12px;align-items:center;margin-top:auto;padding:8px;border:3px dashed var(--kb-ink,#3a2a22);border-radius:8px;background:#fff3b0");
    const vc = village({ ok: true }), [cc, cg] = canvas(110, 40); cg.drawImage(vc, 0, 56, 110, 40, 0, 0, 110, 40);
    rw.appendChild(framed(up(cc, 2.4)));
    const rt = el("div", "", "font-size:13px;line-height:1.45");
    rt.appendChild(el("b", "", "font-size:15px", "Góp đủ 4 gói → sửa Bến thuyền"));
    rt.appendChild(el("div", "", "", "• StackChan đi câu cá mỗi chiều (Sổ sinh hoạt: 釣りをする — câu cá)"));
    rt.appendChild(el("div", "", "", "• thuyền nhỏ trên ao, sếu và cò ghé bờ"));
    rt.appendChild(el("div", "", "", "• quà: Cần câu tre (đặt được ở sân)"));
    rw.appendChild(rt); mid.appendChild(rw);
    row.appendChild(mid);
    // phải: kho bạc
    const right = card("width:250px;display:flex;flex-direction:column;gap:8px");
    right.appendChild(el("b", "", "font-size:15px", "Kho bạc → Tháp đồng hồ"));
    right.appendChild(el("div", "", "font-size:12px;opacity:.85", "chỉ góp xu · mỗi hũ một lần"));
    [[2500, true], [5000, true], [10000, false], [25000, false]].forEach(([v, done]) => {
      const r = el("div", "", "display:flex;align-items:center;gap:8px;padding:6px;border:2px solid var(--kb-ink,#3a2a22);border-radius:6px;background:" + (done ? "#e3f6dc" : "#fff"));
      const jar = iconCv(["..kkkk..", ".kwwwwk.", "kwyyyywk", "kwyhyywk", "kwyyyywk", "kwyyhywk", ".kwwwwk.", "..kkkk.."].map((r2) => done ? r2 : r2.replace(/[yh]/g, ".")), 4);
      r.appendChild(jar); r.appendChild(el("b", "", "flex:1;font-size:14px", kbXu(v) + " xu"));
      r.appendChild(done ? tag("✓", "#bdf0c8") : btn("Góp"));
      right.appendChild(r);
    });
    right.appendChild(el("div", "", "font-size:12px;line-height:1.4;margin-top:4px", "Xong cả 4 hũ: tháp đồng hồ gõ chuông trưa, mở chỗ đặt Tượng StackChan vàng ở quảng trường."));
    right.appendChild(el("div", "", "font-size:12px;line-height:1.4;padding:6px;border:2px dashed var(--kb-ink,#3a2a22);border-radius:6px;background:#fffaf0", "Cả nhà văn hoá ≈ 60–80 nghìn xu + đồ sưu tầm + mốc học — người ôn nhiều mất 3–4 tháng, người ôn ít thì lâu hơn, không gấp."));
    row.appendChild(right);
  };

  // 3. Thợ mộc tanuki — xây có thời gian chờ
  SHOW[3] = function () {
    const o = overlay("Bác Tanuki thợ mộc — xây trong 1–3 ngày có ôn", "như Robin của Stardew: trả xu, mai mở vườn thấy giàn giáo, xong thì có tiệc nhỏ");
    const vc = village({ ok: true, scaffold: true, quiet: true, b: { greenhouse: false, dock: true } }), g = vc.getContext("2d");
    // tanuki đội mũ bảo hộ cầm búa + biển 工事中
    guest(g, "tanuki", 134, 84); rows(g, ICON.hat, 138, 70); rows(g, ICON.hammer, 131, 73);
    R(g, 121, 70, 1, 14, X.wood); R(g, 112, 62, 19, 9, X.cream); R(g, 112, 62, 19, 1, X.wood); R(g, 112, 70, 19, 1, X.wood);
    [[114, 64], [119, 64], [124, 64]].forEach(([x, y]) => { R(g, x, y, 4, 4, X.r); px(g, x + 1, y + 1, X.cream); px(g, x + 2, y + 2, X.cream); });
    [[148, 80, 6], [154, 82, 4]].forEach(([x, y, w]) => { R(g, x, y, w, 2, X.wood3); R(g, x, y + 2, w, 1, X.wood); });
    const scv = framed(up(vc, 4), "margin:0 auto"); o.appendChild(scv);
    const bub = el("div", "", "position:absolute;white-space:nowrap;padding:4px 10px;border:3px solid var(--kb-ink,#3a2a22);border-radius:12px;background:#fff;font-size:14px;box-shadow:2px 2px 0 rgba(0,0,0,.2)", "Mai xong nhé! · 明日できるよ");
    bub.style.left = (scv.offsetLeft + 3 + 118 * 4) + "px"; bub.style.top = (scv.offsetTop + 3 + 56 * 4) + "px"; o.appendChild(bub);
    const row = el("div", "", "display:flex;gap:14px;margin-top:10px");
    const c1 = card("flex:1.2");
    c1.appendChild(el("b", "", "font-size:15px", "Đang xây: Tháp đồng hồ"));
    const pr = el("div", "", "display:flex;align-items:center;gap:8px;margin:6px 0;font-size:13px");
    pr.appendChild(el("span", "", "", "Ngày có ôn:")); [1, 1, 0].forEach((d) => pr.appendChild(el("span", "", "width:22px;height:22px;border:2px solid var(--kb-ink,#3a2a22);border-radius:50%;display:inline-block;background:" + (d ? "#7ad37a" : "#fff"))));
    pr.appendChild(el("span", "", "", "→ còn 1 ngày · mai mở vườn là xong (chuông kêu, StackChan vỗ tay)"));
    c1.appendChild(pr);
    c1.appendChild(el("div", "", "font-size:12px;opacity:.85;line-height:1.4", "Không ôn thì giàn giáo cứ đứng đó — không hỏng, không mất xu. Cùng lúc chỉ xây một thứ."));
    row.appendChild(c1);
    const c2 = card("flex:1.5");
    c2.appendChild(el("b", "", "font-size:15px", "Nâng nhà của bạn"));
    [["Bếp lớn", "8.000 xu · 2 ngày", "mở Bếp nấu ăn"], ["Hầm ủ", "12.000 xu · 2 ngày", "mở Hũ ủ (umeshu, takuan, miso)"], ["Gác mái", "15.000 xu · 3 ngày", "thêm một gian, cửa sổ ngắm sao"], ["Hiên gỗ engawa", "6.000 xu · 1 ngày", "StackChan ngồi hóng mát, ngắm mưa"]].forEach(([n, p, w]) => {
      const r = el("div", "", "display:flex;align-items:center;gap:10px;margin-top:6px;font-size:13px");
      r.appendChild(el("b", "", "width:120px", n)); r.appendChild(el("span", "", "width:150px", p)); r.appendChild(el("span", "", "flex:1;opacity:.85", w)); r.appendChild(btn("Đặt xây"));
      c2.appendChild(r);
    });
    row.appendChild(c2);
    o.appendChild(row);
  };

  // 4. Tặng quà khách → tim → thư bằng tiếng đang học
  SHOW[4] = function () {
    const o = overlay("Bạn bè trong làng — tặng quà khách ghé vườn", "như tặng quà dân làng ở Stardew: mỗi bạn thích món khác nhau, đủ tim thì có thư / cảnh riêng");
    const row = el("div", "", "display:flex;gap:14px;height:calc(100% - 40px)");
    o.appendChild(row);
    const c1 = card("width:430px;display:flex;flex-direction:column;gap:10px");
    const top = el("div", "", "display:flex;gap:12px;align-items:center");
    const [kc, kg] = canvas(40, 26); R(kg, 0, 0, 40, 26, "#bfe6a8"); R(kg, 0, 18, 40, 8, X.grassD); guest(kg, "kitsune", 11, 22);
    rows(kg, ["..kk.", ".kwwk", "kwkwk", ".kwwk", "..kk."], 30, 3);
    top.appendChild(framed(up(kc, 5)));
    const info = el("div", "", "display:flex;flex-direction:column;gap:5px;font-size:13px");
    info.appendChild(el("b", "", "font-size:18px", "Cáo · きつね"));
    const hs = hearts(4, 10); hs.style.gap = "1px"; info.appendChild(hs);
    info.appendChild(el("div", "", "", "Thích nhất: 油揚げ (đậu phụ chiên) 💛"));
    info.appendChild(el("div", "", "", "Thích: hồng khô, lá phong đỏ"));
    info.appendChild(el("div", "", "opacity:.8", "Không thích: hành lá"));
    top.appendChild(info); c1.appendChild(top);
    const bub = el("div", "", "position:relative;padding:8px 12px;border:3px solid var(--kb-ink,#3a2a22);border-radius:12px;background:#fff;font-size:15px");
    bub.appendChild(el("div", "", "", "「わあ、油揚げだ！ありがとう！」"));
    bub.appendChild(el("div", "", "font-size:12px;opacity:.8", "Oa, đậu phụ chiên! Cảm ơn nhé!  ·  +1 ♥ (5/10)"));
    c1.appendChild(bub);
    c1.appendChild(el("b", "", "font-size:14px", "Tặng quà (2 lần mỗi tuần mỗi bạn)"));
    const gifts = el("div", "", "display:flex;gap:8px;flex-wrap:wrap");
    const tofu = ["..........", ".kkkkkkkk.", "khhhhhhhhk", "khtthhtthk", "khhhhhhhhk", "kthhtthhtk", ".kkkkkkkk."];
    const kaki = [".....G....", "....GG....", "..kkkkkk..", ".kooooook.", "kohooooook", "kooooooook", ".kooooook.", "..kkkkkk.."];
    const nasu = ["...GGG....", "..GGG.....", "..kkk.....", ".kvvvk....", "kvzvvvk...", "kvvvvvvk..", ".kvvvvvk..", "..kkkkk..."];
    [[iconCv(tofu, 3), "油揚げ · 80 xu", true], [iconCv(kaki, 3), "hồng khô · 60 xu"], [find("kouyou", 3), "lá phong · Hộp sưu tầm"], [iconCv(nasu, 3), "cà tím · nông sản"]].forEach(([ic, t, hot]) => {
      const b = el("div", "", "display:flex;flex-direction:column;align-items:center;gap:3px;width:92px;padding:5px;border:2px solid var(--kb-ink,#3a2a22);border-radius:6px;font-size:11px;text-align:center;background:" + (hot ? "#fff3b0" : "#fff"));
      b.appendChild(ic); b.appendChild(el("span", "", "", t)); gifts.appendChild(b);
    });
    c1.appendChild(gifts);
    c1.appendChild(el("b", "", "font-size:14px;margin-top:auto", "Bạn bè"));
    const fr = el("div", "", "font-size:12px;display:grid;grid-template-columns:1fr;gap:4px");
    [["neko", "Mèo", 7], ["tanuki", "Tanuki", 6], ["shika", "Hươu", 3], ["tsuru", "Sếu", 2], ["okojo", "Chồn ecmin", 1], ["fukuro", "Cú mèo", 0]].forEach(([id, n, h]) => {
      const r = el("div", "", "display:flex;align-items:center;gap:6px");
      const [gc, gg] = canvas(20, 20); guest(gg, id, 1, 19); r.appendChild(up(gc, 1.4)); r.appendChild(el("span", "", "width:78px", n)); r.appendChild(bar(h, 10, "#ff7fa0")); r.appendChild(el("b", "", "width:44px;text-align:right", h + "/10 ♥")); fr.appendChild(r);
    });
    c1.appendChild(fr);
    row.appendChild(c1);
    // thư
    const c2 = card("flex:1;display:flex;flex-direction:column;gap:10px;background:#fbf3df");
    c2.appendChild(el("b", "", "font-size:16px", "♥ 5 tim — thư của Cáo (đọc bằng tiếng bạn đang học)"));
    const paper = el("div", "", "padding:16px 20px;border:3px solid var(--kb-ink,#3a2a22);border-radius:4px;background:repeating-linear-gradient(#fffdf6,#fffdf6 31px,#e8dcc4 32px);font-size:20px;line-height:32px;position:relative");
    [["きつねより", "kitsune yori"], ["いつも おいしい 油揚げを ありがとう。", "itsumo oishii aburaage o arigatō."], ["あした、もみじの 山で まって います。", "ashita, momiji no yama de matte imasu."], ["いっしょに 月を 見ませんか。", "issho ni tsuki o mimasen ka."]].forEach(([j, r]) => {
      const ln = el("div", "", ""); ln.appendChild(el("span", "", "", j)); ln.appendChild(el("span", "", "font-size:11px;margin-left:10px;opacity:.55", r)); paper.appendChild(ln);
    });
    const [lc, lg] = canvas(18, 14); rows(lg, FLOWER.momiji, 1, 1); paper.appendChild(framed(up(lc, 3), "position:absolute;right:14px;top:12px;border:none"));
    c2.appendChild(paper);
    c2.appendChild(el("div", "", "font-size:14px;line-height:1.5", "Cáo viết: «Cảm ơn cậu luôn cho tớ đậu phụ chiên ngon. Mai tớ đợi ở núi lá đỏ. Cùng ngắm trăng nhé?»"));
    const words = el("div", "", "display:flex;gap:8px;flex-wrap:wrap;align-items:center;font-size:13px");
    words.appendChild(el("b", "", "", "Từ mới trong thư:"));
    [["油揚げ", "あぶらあげ", "đậu phụ chiên"], ["待つ", "まつ", "đợi"], ["月", "つき", "mặt trăng"]].forEach(([k, r, v]) => { const t = el("span", "", "padding:3px 8px;border:2px solid var(--kb-ink,#3a2a22);border-radius:8px;background:#fff"); t.textContent = k + " · " + r + " · " + v; words.appendChild(t); });
    words.appendChild(btn("+ Thêm vào deck", true));
    c2.appendChild(words);
    // cảnh tim: ngắm trăng trên núi lá đỏ
    const [mc, mg] = canvas(150, 46);
    for (let y = 0; y < 46; y++) { const t = y / 46; R(mg, 0, y, 150, 1, "rgb(" + [Math.round(18 + 40 * t), Math.round(26 + 36 * t), Math.round(66 + 50 * t)].join(",") + ")"); }
    for (let i = 0; i < 40; i++) { px(mg, Math.floor(hash(i + 300) * 150), Math.floor(hash(i + 400) * 26), hash(i) > 0.7 ? "#ffffff" : "#9fb2e8"); }
    mg.globalAlpha = 0.2; disc(mg, 112, 14, 12, "#fff3c4"); mg.globalAlpha = 1; disc(mg, 112, 14, 8, "#fff6d0"); disc(mg, 109, 12, 2, "#efe3b0"); disc(mg, 115, 17, 1, "#efe3b0");
    for (let x = 0; x < 150; x++) { const h = 12 + Math.round(6 * Math.sin(x / 22 + 1)); R(mg, x, 46 - h, 1, h, "#2a4a3a"); }
    const dim = (id, cx, by) => { const sp = SPR[id]; const [tc, tg] = canvas(sp[0].length, sp.length); L.sprite(tg, sp, 0, 0, 1, L.P); mg.globalAlpha = 0.85; mg.drawImage(tc, Math.round(cx - sp[0].length / 2), by - sp.length); mg.globalAlpha = 1; };
    dim("momiji", 22, 40); dim("momiji", 140, 42);
    guest(mg, "kitsune", 56, 37); chan(mg, 72, 38, "sit");
    mg.fillStyle = "rgba(10,18,50,0.18)"; mg.fillRect(0, 0, 150, 46);
    [[40, 22], [96, 30], [86, 18], [130, 26], [62, 26]].forEach(([x, y]) => { glow(mg, x, y, 4, "255,240,120", 0.6); px(mg, x, y, "#fffbb0"); });
    glow(mg, 112, 14, 20, "255,245,200", 0.25);
    const scn = el("div", "", "display:flex;gap:12px;align-items:center;margin-top:auto");
    scn.appendChild(framed(up(mc, 4.6)));
    scn.appendChild(el("div", "", "font-size:13px;line-height:1.5", "Cảnh tim (5 ♥): mai mở vườn, StackChan và Cáo ngắm trăng ở núi lá đỏ. Mỗi bạn 10 tim, cứ 2 tim một thư + một cảnh; vắng lâu tim không giảm."));
    c2.appendChild(scn);
    row.appendChild(c2);
  };

  // 5. Bếp + nông sản + sách công thức
  SHOW[5] = function () {
    const o = overlay("Bếp — nông sản từ từ đã thuộc, nấu món Nhật", "như nấu ăn + công thức ở Stardew: món nấu vào Sổ món ăn, StackChan ăn trong lúc sinh hoạt");
    const row = el("div", "", "display:flex;gap:14px;height:calc(100% - 40px)");
    o.appendChild(row);
    const c1 = card("width:330px;display:flex;flex-direction:column;gap:10px");
    // bếp: StackChan nấu
    const [bc, bg] = canvas(72, 44);
    R(bg, 0, 0, 72, 44, "#f3e1c0"); for (let x = 0; x < 72; x += 6) { R(bg, x, 0, 1, 28, "#e6cfa5"); }
    R(bg, 0, 28, 72, 16, "#c79a63"); R(bg, 0, 28, 72, 2, X.wood);
    R(bg, 34, 18, 38, 12, X.wood2); R(bg, 34, 18, 38, 2, X.wood); R(bg, 36, 30, 34, 14, X.wood3); R(bg, 52, 32, 1, 10, X.wood); R(bg, 44, 36, 2, 1, X.k); R(bg, 60, 36, 2, 1, X.k);
    R(bg, 38, 14, 12, 5, X.k); R(bg, 39, 15, 10, 3, X.stoneD); R(bg, 36, 15, 2, 1, X.k);
    [[41, 9], [45, 6], [43, 2]].forEach(([x, y]) => { px(bg, x, y, "#ffffff"); px(bg, x + 1, y - 1, "#ffffff"); px(bg, x, y - 2, "#ffffff"); });
    R(bg, 56, 15, 12, 3, X.wood3); rows(bg, ICON.daikon.slice(3), 58, 6); R(bg, 54, 2, 16, 1, X.wood); [56, 61, 66].forEach((x, k) => { R(bg, x, 3, 1, 3, X.k); R(bg, x - 2, 6, 5, 3 + k % 2, ["#9a5a3a", "#c8743a", X.stoneD][k]); });
    R(bg, 4, 4, 14, 10, X.glass); R(bg, 10, 4, 1, 10, X.wood); R(bg, 4, 8, 14, 1, X.wood); R(bg, 3, 14, 16, 1, X.wood);
    R(bg, 2, 18, 18, 1, X.wood); [[3, 13], [8, 12], [13, 13]].forEach(([x, y], k) => { R(bg, x, y + 1, 4, 4, ["#e7a84a", "#cbe9f2", "#9a5a3a"][k]); R(bg, x, y, 4, 1, X.R); });
    chan(bg, 14, 42, "cook");
    c1.appendChild(framed(up(bc, 4.4)));
    c1.appendChild(el("b", "", "font-size:15px", "Kho nông sản"));
    c1.appendChild(el("div", "", "font-size:12px;opacity:.85;line-height:1.4", "Mỗi từ lên «Ra quả» cho 1 nông sản theo giống cây của nó (lúa → gạo, củ cải, bí ngô, tre → măng…)."));
    const kho = el("div", "", "display:flex;gap:6px;flex-wrap:wrap");
    [[iconCv(ICON.gao, 3), "gạo ×12"], [iconCv(ICON.daikon, 3), "củ cải ×5"], [iconCv(ICON.kabocha, 3), "bí ngô ×3"], [find("takenoko2", 3), "măng ×2"], [iconCv(ICON.sakuranbo, 3), "anh đào ×4"]].forEach(([c, t]) => kho.appendChild(slot(c, false, t)));
    c1.appendChild(kho);
    c1.appendChild(el("div", "", "font-size:12px;line-height:1.4;padding:6px;border:2px dashed var(--kb-ink,#3a2a22);border-radius:6px;background:#fffaf0", "Gia vị ở chợ (miso, nước tương, rong biển…): 10–40 xu. Công thức mới: 300–1.500 xu, có món chỉ gánh hàng rong bán."));
    row.appendChild(c1);
    const c2 = card("flex:1;display:flex;flex-direction:column;gap:10px");
    const hd = el("div", "", "display:flex;align-items:center;gap:10px"); hd.appendChild(el("b", "", "font-size:16px", "Sách công thức")); hd.appendChild(tag("Sổ món ăn 7/24", "#fff3b0")); c2.appendChild(hd);
    const grid = el("div", "", "display:grid;grid-template-columns:repeat(3,1fr);gap:8px");
    [["onigiri", "おにぎり", "cơm nắm", "gạo ×2 · rong biển", 3], ["miso", "みそしる", "canh miso", "củ cải ×1 · miso", 2], ["tamago", "たまごやき", "trứng cuộn", "trứng ×2 · đường", 1],
     ["takoyaki", "たこやき", "bánh bạch tuộc", "Mua công thức · 600 xu", -1], ["ramen", "ラーメン", "mì ramen", "Mua công thức · 1.200 xu", -1], ["dango", "だんご", "bánh dango", "gạo ×3 · đậu đỏ", 1],
     ["curry", "カレーライス", "cơm cà ri", "gạo ×2 · bí ngô ×1", 0], ["sushi", "すし", "sushi", "gánh hàng rong bán", -1], ["mochi", "おもち", "bánh mochi", "gạo ×4 · (Tết)", 0],
     ["nimono", "かぼちゃの煮物", "bí ngô hầm", "bí ngô ×2 · nước tương", 1], ["oden", "おでん", "lẩu oden", "củ cải ×2 · trứng · (mùa đông)", 0], ["takegohan", "たけのこご飯", "cơm măng", "gạo ×2 · măng ×1", 0]].forEach(([id, ja, vi, need, n]) => {
      const b = el("div", "", "display:flex;gap:10px;align-items:center;padding:8px;min-height:96px;box-sizing:border-box;border:2px solid var(--kb-ink,#3a2a22);border-radius:6px;background:" + (n > 0 ? "#e3f6dc" : n < 0 ? "#eee6d6" : "#fff"));
      const ic = iconCv(n < 0 ? DISH[id].map((r) => r.replace(/[^.]/g, "n")) : DISH[id], 5); if (n < 0) { ic.style.opacity = ".55"; }
      b.appendChild(ic);
      const t = el("div", "", "font-size:12px;line-height:1.3");
      t.appendChild(el("b", "", "font-size:18px", ja)); t.appendChild(el("div", "", "font-size:13px", vi)); t.appendChild(el("div", "", "opacity:.75;font-size:12px", need));
      if (n > 0) { t.appendChild(el("div", "", "font-size:11px;color:#2e8b3a", "đã nấu ×" + n)); }
      b.appendChild(t); grid.appendChild(b);
    });
    c2.appendChild(grid);
    const done = el("div", "", "display:flex;gap:12px;align-items:center;margin-top:auto;padding:8px;border:3px dashed var(--kb-ink,#3a2a22);border-radius:8px;background:#fff3b0");
    const [ec, eg] = canvas(52, 26); R(eg, 0, 0, 52, 26, "#f3e1c0"); R(eg, 0, 18, 52, 8, "#c79a63"); R(eg, 22, 15, 22, 3, X.wood2); rows(eg, DISH.onigiri, 26, 4); chan(eg, 2, 25, "eat");
    done.appendChild(framed(up(ec, 3)));
    const dt = el("div", "", "font-size:13px;line-height:1.5");
    dt.appendChild(el("b", "", "font-size:15px", "Vừa nấu: おにぎり ×2"));
    dt.appendChild(el("div", "", "", "Sáng mai StackChan ăn sáng — Sổ sinh hoạt: 朝ごはんを食べる (ăn sáng)"));
    dt.appendChild(el("div", "", "", "Mang món ăn tặng bạn khách (+2 ♥ nếu đúng món thích) hoặc góp vào gói của Nhà văn hoá."));
    done.appendChild(dt); c2.appendChild(done);
    row.appendChild(c2);
  };

  // 6. Sổ ép hoa
  SHOW[6] = function () {
    const o = overlay("Sổ ép hoa — mỗi từ đã thuộc là một bông hoa", "chỗ tiêu xu lớn dần theo số từ bạn thuộc; như bảo tàng / bộ sưu tập của Stardew");
    const row = el("div", "", "display:flex;gap:14px;height:calc(100% - 40px)");
    o.appendChild(row);
    const book = el("div", "", "flex:1;display:flex;border:4px solid #6b3b1f;border-radius:8px;background:#6b3b1f;padding:8px;gap:0;box-shadow:6px 6px 0 rgba(58,42,34,.3)");
    const PAGES = [
      [["sakura", "桜", "さくら", "hoa anh đào", "N5 · 03/04"], ["tanpopo", "春", "はる", "mùa xuân", "N5 · 18/04"], ["ajisai", "約束", "やくそく", "lời hứa", "N4 · 12/06"], ["himawari", "夏休み", "なつやすみ", "kỳ nghỉ hè", "N4 · 21/07"]],
      [["asagao", "朝", "あさ", "buổi sáng", "N5 · 02/08"], ["momiji", "紅葉", "こうよう", "lá đỏ mùa thu", "N3 · 09/11"], ["sakura", "勉強", "べんきょう", "học hành", "N5 · 24/11"], ["himawari", "景色", "けしき", "phong cảnh", "N4 · 25/11"]]
    ];
    PAGES.forEach((pg, k) => {
      const page = el("div", "", "flex:1;background:#fbf5e4;padding:14px 16px;display:flex;flex-direction:column;gap:12px;" + (k ? "border-left:2px solid #d8c49c;box-shadow:inset 8px 0 10px -8px rgba(0,0,0,.25)" : "box-shadow:inset -8px 0 10px -8px rgba(0,0,0,.25)"));
      page.appendChild(el("div", "", "font-size:12px;opacity:.7;text-align:" + (k ? "right" : "left"), k ? "trang 22 · Tiếng Nhật N4" : "trang 21 · Tiếng Nhật N4"));
      pg.forEach(([f, kanji, kana, vi, meta]) => {
        const e = el("div", "", "display:flex;align-items:center;gap:14px;padding:4px 6px;border-bottom:1px dashed #d8c49c");
        const [fc, fg] = canvas(20, 16); rows(fg, FLOWER[f], 2, 2);
        const fcv = up(fc, 4.4); fcv.style.cssText = "image-rendering:pixelated;background:#f3ead0;border:2px solid #d8c49c;padding:4px;transform:rotate(" + (k ? 3 : -3) + "deg)"; e.appendChild(fcv);
        const t = el("div", "", "line-height:1.25");
        t.appendChild(el("div", "", "font-size:30px;font-weight:bold", kanji)); t.appendChild(el("div", "", "font-size:14px", kana + " · " + vi)); t.appendChild(el("div", "", "font-size:11px;opacity:.65", "ép ngày " + meta));
        e.appendChild(t); page.appendChild(e);
      });
      book.appendChild(page);
    });
    book.style.position = "relative";
    book.appendChild(el("div", "", "position:absolute;right:90px;top:-6px;width:16px;height:70px;background:#c8323c;clip-path:polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)"));
    row.appendChild(book);
    const side = card("width:330px;display:flex;flex-direction:column;gap:10px");
    side.appendChild(el("b", "", "font-size:16px", "Sổ ép hoa"));
    side.appendChild(bigText("128 bông", "font-size:30px"));
    side.appendChild(el("div", "", "font-size:13px", "trên 1.240 từ đã thuộc · 3 deck"));
    side.appendChild(el("b", "", "font-size:14px;margin-top:6px", "Hôm nay ra hoa — chờ ép:"));
    [["約束", "lời hứa"], ["景色", "phong cảnh"], ["届ける", "chuyển đến"], ["優しい", "hiền lành"], ["泳ぐ", "bơi"]].forEach(([k, v]) => {
      const r = el("div", "", "display:flex;align-items:center;gap:8px;font-size:14px");
      r.appendChild(el("b", "", "width:70px;font-size:17px", k)); r.appendChild(el("span", "", "flex:1", v)); r.appendChild(btn("Ép · 20 xu")); side.appendChild(r);
    });
    side.appendChild(btn("Ép cả 5 bông · 100 xu", true));
    side.appendChild(el("div", "", "font-size:12px;line-height:1.45;padding:6px;border:2px dashed var(--kb-ink,#3a2a22);border-radius:6px;background:#fffaf0;margin-top:auto", "Hoa theo giống cây của từ (anh đào, hướng dương, phong…) và mùa lúc ép. Bấm một bông: nghe lại từ, xem câu ví dụ. Đủ 50 / 100 / 500 bông: bìa sổ mới, chậu hoa trưng ở Thư viện."));
    row.appendChild(side);
  };

  // 7. Hầm ủ + lò rèn
  SHOW[7] = function () {
    const o = overlay("Hầm ủ & Lò rèn", "như thùng ủ / hầm rượu và nâng dụng cụ ở Stardew — để càng lâu càng lên hạng; bình tưới chỉ đẹp hơn, không thêm xu");
    const row = el("div", "", "display:flex;gap:14px;height:calc(100% - 40px)");
    o.appendChild(row);
    const c1 = card("flex:1;display:flex;flex-direction:column;gap:10px");
    c1.appendChild(el("b", "", "font-size:16px", "Hầm ủ (dưới nhà, xây ở Bác Tanuki)"));
    const [hc, hg] = canvas(120, 46);
    R(hg, 0, 0, 120, 46, "#3b2a24"); for (let y = 0; y < 34; y += 5) { for (let x = (y % 10 ? 0 : 6); x < 120; x += 12) { R(hg, x, y, 11, 4, "#4c372e"); } }
    R(hg, 0, 34, 120, 12, "#5a4033"); R(hg, 0, 34, 120, 1, "#76563f");
    R(hg, 20, 2, 1, 6, X.wood); R(hg, 96, 2, 1, 6, X.wood);
    // umeshu: hũ thuỷ tinh
    R(hg, 10, 16, 20, 20, "#cbe9f2"); R(hg, 11, 20, 18, 15, "#e7a84a"); R(hg, 12, 13, 16, 3, X.R); R(hg, 10, 16, 20, 1, "#ffffff");
    [[14, 24], [19, 28], [24, 23], [16, 31], [23, 31], [20, 22]].forEach(([x, y]) => disc(hg, x, y, 2, "#b8d36a"));
    R(hg, 11, 18, 1, 16, "#ffffff");
    // takuan: thùng gỗ + đá nén
    R(hg, 50, 18, 22, 18, X.wood3); for (let x = 50; x < 72; x += 4) { R(hg, x, 18, 1, 18, X.wood2); } R(hg, 49, 22, 24, 2, X.stoneD); R(hg, 49, 31, 24, 2, X.stoneD);
    disc(hg, 61, 15, 5, X.stone); disc(hg, 59, 13, 2, X.stoneH);
    // miso: hũ gốm
    R(hg, 88, 18, 22, 18, "#9a5a3a"); R(hg, 86, 17, 26, 3, "#7a4228"); R(hg, 90, 15, 18, 2, X.wood3); R(hg, 98, 13, 2, 2, X.wood);
    R(hg, 94, 23, 10, 10, "#e9d2a6"); [[96, 25], [96, 28], [101, 25], [101, 28]].forEach(([x, y]) => R(hg, x, y, 2, 2, X.R));
    disc(hg, 20, 10, 2, "#ffd23f"); disc(hg, 96, 10, 2, "#ffd23f"); glow(hg, 20, 12, 22, "255,200,100", 0.32); glow(hg, 96, 12, 22, "255,200,100", 0.32);
    c1.appendChild(framed(up(hc, 6.6)));
    const jars = el("div", "", "display:grid;grid-template-columns:repeat(3,1fr);gap:10px");
    [["梅酒 umeshu", "rượu mơ", 3, 5, "chín sau 5 ngày có ôn", ""], ["沢庵 takuan", "dưa củ cải", 5, 5, "Chín! hạng Vàng ★", "#fff3b0"], ["味噌 miso", "tương miso", 2, 10, "để lâu: Bạc → Vàng → Iridi", ""]].forEach(([n, v, d, of, st, bgc]) => {
      const b = el("div", "", "padding:8px;border:2px solid var(--kb-ink,#3a2a22);border-radius:6px;font-size:13px;line-height:1.4;background:" + (bgc || "#fff"));
      b.appendChild(el("b", "", "font-size:15px", n)); b.appendChild(el("div", "", "", v));
      const dots = el("div", "", "display:flex;gap:3px;margin:4px 0;flex-wrap:wrap"); for (let i = 0; i < of; i++) { dots.appendChild(el("span", "", "width:12px;height:12px;border-radius:50%;border:2px solid var(--kb-ink,#3a2a22);background:" + (i < d ? "#7ad37a" : "#fff"))); } b.appendChild(dots);
      b.appendChild(el("div", "", "font-size:12px", st)); jars.appendChild(b);
    });
    c1.appendChild(jars);
    c1.appendChild(el("div", "", "font-size:12px;line-height:1.45;opacity:.9", "Hũ mới 500 xu + nguyên liệu (mơ ở Nhà kính, củ cải / đậu là nông sản). Đồ ủ tặng bạn khách, góp gói, hoặc bày trên kệ. Quên vài ngày không sao — hũ chỉ chín chậm lại."));
    row.appendChild(c1);
    const c2 = card("width:470px;display:flex;flex-direction:column;gap:10px");
    c2.appendChild(el("b", "", "font-size:16px", "Lò rèn — bình tưới"));
    const cans = el("div", "", "display:grid;grid-template-columns:repeat(4,1fr);gap:8px");
    [["Đồng", { c: "#c8743a", h: "#f0a46a" }, "2.000 xu", 1], ["Bạc", { c: "#b9c2cf", h: "#ffffff" }, "5.000 xu", 1], ["Vàng", { c: "#f2c230", h: "#fff3a0" }, "10.000 xu", 2], ["Iridi", { c: "#9b5de5", h: "#f0c8ff" }, "25.000 xu", 0]].forEach(([n, pal, p, st]) => {
      const b = el("div", "", "display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px;border:2px solid var(--kb-ink,#3a2a22);border-radius:6px;font-size:12px;background:" + (st === 2 ? "#fff3b0" : "#fff"));
      const [ic, ig] = canvas(17, 11); rows(ig, ICON.can, 1, 1, Object.assign({}, X, { c: pal.c, h: pal.h })); b.appendChild(up(ic, 3.4));
      b.appendChild(el("b", "", "", n)); b.appendChild(el("span", "", "", p)); b.appendChild(el("span", "", "font-size:11px", st === 2 ? "đang dùng" : st ? "đã có" : "")); cans.appendChild(b);
    });
    c2.appendChild(cans);
    // StackChan tưới bằng bình vàng: hạt nước lấp lánh
    const [wc, wg] = canvas(96, 40);
    R(wg, 0, 0, 96, 40, "#cfeefc"); R(wg, 0, 26, 96, 14, X.grass); for (let i = 0; i < 40; i++) { px(wg, Math.floor(hash(i) * 96), 27 + Math.floor(hash(i + 5) * 12), X.grassD); }
    [52, 64, 76, 88].forEach((x, k) => { R(wg, x, 18 + k % 2, 1, 9 - k % 2, X.G); px(wg, x - 1, 19 + k % 2, X.g); px(wg, x + 1, 20 + k % 2, X.g); px(wg, x, 17 + k % 2, ["r", "y", "p", "v"][k]); px(wg, x + 1, 17 + k % 2, ["r", "y", "p", "v"][k]); });
    chan(wg, 14, 38, "hold");
    rows(wg, ICON.can, 34, 16, Object.assign({}, X, { c: "#f2c230", h: "#fff3a0" }));
    for (let i = 0; i < 18; i++) { const x = 50 + i * 2 + (i % 3), y = 12 + (i % 5) * 3 + Math.floor(i / 6); px(wg, x, y, i % 3 ? "#8fd3ff" : "#ffe680"); if (i % 4 === 0) { px(wg, x - 1, y, "#fff3a0"); px(wg, x + 1, y, "#fff3a0"); px(wg, x, y - 1, "#fff3a0"); } }
    c2.appendChild(framed(up(wc, 4.55)));
    const fx = el("div", "", "display:grid;grid-template-columns:repeat(4,1fr);gap:6px");
    [["Đồng", ["#8fd3ff"], 0], ["Bạc", ["#8fd3ff", "#ffffff"], 0], ["Vàng", ["#8fd3ff", "#ffe680"], 1], ["Iridi", ["#ff7fa0", "#ffd23f", "#7ad37a", "#8fd3ff", "#c77dff"], 2]].forEach(([n, cols, sp]) => {
      const [fc, fg] = canvas(30, 18); R(fg, 0, 0, 30, 18, "#cfeefc"); R(fg, 0, 13, 30, 5, X.grass);
      for (let i = 0; i < 14; i++) { const x = 3 + i * 2, y = 2 + (i % 4) * 2 + Math.floor(i / 5); px(fg, x, y, cols[i % cols.length]); if (sp && i % 3 === 0) { px(fg, x - 1, y, "#fff3a0"); px(fg, x + 1, y, "#fff3a0"); } }
      if (sp === 2) { for (let x = 2; x < 28; x++) { px(fg, x, 11 - Math.round(3 * Math.sin(Math.PI * x / 28)), cols[x % 5]); } }
      const w = el("div", "", "display:flex;flex-direction:column;align-items:center;font-size:11px"); w.appendChild(framed(up(fc, 3))); w.appendChild(el("span", "", "", n)); fx.appendChild(w);
    });
    c2.appendChild(fx);
    c2.appendChild(el("div", "", "font-size:12px;line-height:1.45", "Bấm Tưới / chấm thẻ: nước từ bình của bạn (bình vàng có hạt lấp lánh, bình iridi để lại vệt cầu vồng nhỏ). Chỉ đổi hình — xu nhận được như cũ. Rèn mất 2 ngày ở lò rèn (mở khi sửa Guồng nước)."));
    row.appendChild(c2);
  };

  // 8. Tượng vàng + % vườn hoàn hảo (ban đêm)
  SHOW[8] = function () {
    const o = overlay("Đích cuối: Tượng StackChan vàng + % Vườn hoàn hảo", "như Đồng hồ vàng 10 triệu + chỉ số Hoàn hảo của Stardew — chỉ để ngắm, không đổi gì việc học");
    const vc = village({ ok: true, night: true, statue: true }), g = vc.getContext("2d");
    // pháo hoa mừng
    [[60, 12, "#ff7fa0"], [190, 8, "#ffd23f"], [300, 16, "#8fd3ff"]].forEach(([cx, cy, c]) => { for (let a = 0; a < 360; a += 30) { for (let r = 3; r < 8; r += 2) { px(g, Math.round(cx + r * Math.cos(a * Math.PI / 180)), Math.round(cy + r * Math.sin(a * Math.PI / 180)), c); } } px(g, cx, cy, "#ffffff"); });
    o.appendChild(framed(up(vc, 4), "margin:0 auto"));
    const row = el("div", "", "display:flex;gap:14px;margin-top:10px");
    const c1 = card("width:430px;display:flex;flex-direction:row;gap:14px;align-items:center");
    const ring = el("div", "", "width:104px;height:104px;border-radius:50%;flex:none;background:conic-gradient(#e9b949 0 63%, #eee2c8 63% 100%);border:3px solid var(--kb-ink,#3a2a22);display:flex;align-items:center;justify-content:center");
    ring.appendChild(el("div", "", "width:70px;height:70px;border-radius:50%;background:var(--kb-paper,#fffaf0);border:3px solid var(--kb-ink,#3a2a22);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:22px", "63%"));
    c1.appendChild(ring);
    const t1 = el("div", "", "font-size:13px;line-height:1.5");
    t1.appendChild(el("b", "", "font-size:16px", "Vườn hoàn hảo"));
    t1.appendChild(el("div", "", "", "Tượng StackChan vàng: 500.000 xu — đặt ở quảng trường làng, sáng lấp lánh ban đêm, khách ghé chụp ảnh."));
    t1.appendChild(el("div", "", "opacity:.8", "Đủ 100%: StackChan đội vương miện nhỏ + dòng chữ trên bệ tượng."));
    c1.appendChild(t1); row.appendChild(c1);
    const c2 = card("flex:1;display:grid;grid-template-columns:1fr 1fr;gap:6px 18px;font-size:13px");
    [["Đồ trang trí đã có", 142, 171], ["Công trình làng", 4, 6], ["Hộp sưu tầm", 37, 42], ["Sổ món ăn", 12, 24], ["Bạn bè (tim)", 23, 60], ["Sổ ép hoa (từ đã thuộc)", 128, 300], ["Giao diện mùa", 9, 14], ["Sự kiện mùa đã dự", 1, 4]].forEach(([n, v, of]) => {
      const r = el("div", "", "display:flex;align-items:center;gap:8px"); r.appendChild(el("span", "", "width:170px", n)); r.appendChild(bar(v, of, "#e9b949")); r.appendChild(el("b", "", "width:62px;text-align:right", v + "/" + of)); c2.appendChild(r);
    });
    row.appendChild(c2);
    o.appendChild(row);
  };
  return { show: (n) => { SHOW[n](); return true; }, clear: clear, village: village, up: up, _X: X };
})();
true;
