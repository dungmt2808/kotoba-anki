// Tranh pixel tạm cho ảnh phác 1.36 (nạp vào trang vườn bằng mock_136.js). Không thuộc add-on.
// Dùng bảng màu + hàm vẽ của add-on (GardenHome._lib(): P, sprite, SPR.sleigh); viền đen tự thêm như add-on (outline).
window.MK = (function () {
  const L = GardenHome._lib(), P = L.P;
  function grid(w, h) { const g = []; for (let j = 0; j < h; j++) { g.push(new Array(w).fill(".")); } return g; }
  function rect(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) { for (let i = x; i < x + w; i++) { if (g[j] && i >= 0 && i < g[0].length) { g[j][i] = c; } } } }
  function dot(g, x, y, c) { x = Math.round(x); y = Math.round(y); if (g[y] && x >= 0 && x < g[0].length) { g[y][x] = c; } }
  function disc(g, cx, cy, r, c) { for (let j = 0; j < g.length; j++) { for (let i = 0; i < g[0].length; i++) { if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r + r * 0.6) { g[j][i] = c; } } } }
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
  // hình từ chuỗi (có lề 1 điểm ảnh cho viền)
  function pic(lines, noOutline) {
    const w = Math.max.apply(null, lines.map((l) => l.length)), g = grid(w + 2, lines.length + 2);
    lines.forEach((l, j) => { for (let i = 0; i < l.length; i++) { if (l[i] !== ".") { g[j + 1][i + 1] = l[i]; } } });
    return rows(noOutline ? g : outline(g));
  }
  const recolor = (r, map) => r.map((s) => s.replace(/./g, (c) => map[c] || c));

  // ---------------------------------------------------------------- cây thông trống (44 × 52)
  const TIERS = [[5, 15, 7], [12, 25, 11.5], [21, 36, 15.5], [31, 45, 20]];
  const TREE = (function () {
    const g = grid(44, 52);
    TIERS.forEach(([y0, y1, hw]) => {
      for (let j = y0; j <= y1; j++) {
        const half = Math.round(hw * (j - y0 + 2) / (y1 - y0 + 2));
        for (let i = 22 - half; i <= 21 + half; i++) { dot(g, i, j, i < 19 ? "g" : i > 24 ? "j" : "G"); }
      }
      for (let i = 22 - Math.round(hw); i <= 21 + Math.round(hw); i += 3) { dot(g, i, y1 + 1, "G"); }
    });
    rect(g, 20, 3, 4, 3, "G"); dot(g, 21, 2, "G"); dot(g, 22, 2, "G");
    rect(g, 19, 46, 6, 2, "B");
    rect(g, 13, 48, 18, 4, "b"); rect(g, 13, 48, 18, 1, "h"); rect(g, 13, 51, 18, 1, "B");
    return rows(outline(g));
  })();
  const TREE_W = 44, TREE_H = 52;
  // chỗ treo (toạ độ trong cây; món treo vẽ giữa-trên tại điểm này)
  const SPOTS = [[21, 9], [17, 13], [26, 13], [12, 22], [20, 20], [28, 21], [33, 23], [16, 24], [24, 24],
    [9, 32], [15, 29], [22, 30], [29, 29], [35, 31], [12, 34], [19, 34], [26, 34], [32, 35],
    [5, 42], [11, 39], [18, 40], [25, 39], [32, 40], [38, 42], [8, 43], [15, 43], [22, 43], [29, 43], [35, 43]];
  // dây kim tuyến (ngày 2) + dây đèn (ngày 10) + tuyết phủ cành (ngày 19): các điểm ảnh trong cây
  const GARLAND = []; for (let k = 0; k < 11; k++) { GARLAND.push([14 + k * 1.3, 17 + k * 0.75]); }
  for (let k = 0; k < 17; k++) { GARLAND.push([33 - k * 1.5, 27 + k * 0.62]); }
  for (let k = 0; k < 22; k++) { GARLAND.push([6 + k * 1.55, 37 + k * 0.32]); }
  const LIGHTS = [[19, 11], [24, 16], [14, 18], [22, 22], [30, 25], [10, 27], [18, 27], [27, 31], [34, 33], [7, 36], [16, 37], [24, 37],
    [13, 41], [21, 45], [30, 38], [37, 39], [4, 45], [39, 45]];
  const SNOW = []; TIERS.forEach(([y0, y1, hw], t) => { for (let i = Math.round(22 - hw) + 1; i <= Math.round(21 + hw) - 1; i += 1) { if ((i * 7 + t) % 5 < 3) { SNOW.push([i, y1 - ((i * 3 + t) % 2)]); } } });

  // ---------------------------------------------------------------- món treo (mỗi ô cửa một món)
  const ball = (a, z) => pic(["..S..", ".SSS.", "AAwAA".replace(/A/g, a), "AwAAA".replace(/A/g, a), "AAAAZ".replace(/A/g, a).replace("Z", z), ".ZZZ.".replace(/Z/g, z)]);
  const ORN = {
    ball: ball("r", "R"), ball_gold: ball("y", "i"), ball_blue: ball("l", "d"), ball_silver: ball("s", "S"), ball_violet: ball("v", "z"),
    bell: pic(["..i..", ".yyy.", ".yyi.", "yyyyi", "iiiii", "..o.."]),
    cane: pic([".rw.", "w..r", "r..w", "...r", "...w", "...r", "...w"]),
    flake: pic(["w.l.w", ".lwl.", "lwwwl", ".lwl.", "w.l.w"], true),
    bow: pic(["rr...rr", "rRr.rRr", ".rrRrr.", "..rRr..", ".r...r."]),
    cone: pic(["..S.", ".bb.", "bBbB", "BbBb", "bBbB", ".BB."]),
    sock: pic(["wwww.", "wwww.", "rrrr.", "rRrr.", "rrrrr", "rrrRr", ".rrr."]),
    bird: pic(["..bb..", ".bbkb.", "bbbbbo", "rrbbb.", ".rrb..", "..k.k."]),
    angel: pic(["..yyy..", "...e...", "w.cec.w", "wwcccww", ".wcccw.", "..ccc..", ".ccccc."]),
    ginger: pic([".tt.", "twwt", ".tt.", "tttt", "twwt", "t..t"]),
    horse: pic(["....bb.", "...bbbk", "bbbbbb.", "brrbbb.", ".b..b..", "rrrrrr."]),
    yuzu: pic([".g..", "oyyo", "yyyo", "oyoo", ".oo."]),
    candle: pic(["..y..", "..o..", ".www.", ".wwr.", ".www.", ".www."]),
    bulb: pic(["..S..", ".SSS.", ".ppp.", "ppwpp", ".ppp.", "..p.."]),
    heart: pic([".rr.rr.", "rwrrrrr", "rrrrrrR", ".rrrrR.", "..rrR..", "...R..."]),
    card: pic(["kccccccccck", "ckcccccccKc".replace("K", "k"), "cckcccccKcc".replace("K", "k"), "ccckcccKccc".replace("K", "k"), "cccckrrkccc", "ccccrrrcccc", "ccccccccccc"]),
    star: pic(["....y....", "...yyy...", "yyyyiyyyy", ".yyyiyyy.", "..yyyyy..", ".yyy.yyy.", ".yy...yy."]),
    snowman: pic(["..kkk..", ".kkkkk.", "..www..", "..wow..", ".rrrrr.", ".wwwww.", "wwwkwww", "wwwwwww", ".wwwww."]),
    gift: pic(["..w.w..", "...w...", "ddwwwdd", "dddwddd", "dddwddd", "uuuwuuu"]),
    gift_big: pic(["...w...w...", "....w.w....", ".....w.....", "rrrrryrrrrr", "rrrrryrrrrr", "yyyyyyyyyyy", "rrrrryrrrrr", "rrrrryrrrrr", "RRRRRyRRRRR"]),
    // món tự vẽ 8 × 8 (Chủ nhật) — ví dụ của ba người dùng khác nhau
    my_neko: pic(["o......o", "oo....oo", "oooooooo", "okoooko.", "oooppooo", "oooooooo", ".oooooo.", "..o..o.."].map((s) => s.slice(0, 8))),
    my_onigiri: pic(["...ww...", "..wwww..", ".wwwwww.", ".wwwwww.", "wwwwwwww", "wkkkkkkw", "wkkkkkkw", ".kkkkkk."]),
    my_daruma: pic(["..rrrr..", ".rrrrrr.", "rreeeerr", "rekeekre", "rreeeerr", "rrriirrr", ".rrrrrr.", "..RRRR.."])
  };
  // nhãn hiển thị cho ô cửa
  const ORN_NAME = { ball: "Quả châu đỏ", garland: "Dây kim tuyến", bell: "Chuông vàng", cane: "Kẹo gậy", flake: "Bông tuyết", custom: "Tự vẽ",
    bow: "Nơ đỏ", cone: "Quả thông", sock: "Tất nhỏ", lights: "Dây đèn", snowman: "Người tuyết", bird: "Chim cổ đỏ", angel: "Thiên thần",
    gift: "Hộp quà", ginger: "Bánh gừng", ball_silver: "Quả châu bạc", horse: "Ngựa gỗ", snow: "Tuyết phủ cành", yuzu: "Quả yuzu (冬至)",
    ball_blue: "Quả châu xanh", ball_gold: "Quả châu vàng", star: "Ngôi sao" };
  // lịch: ngày → món (Chủ nhật 6 / 13 / 20 tự vẽ)
  const DOORS = { 1: "ball", 2: "garland", 3: "bell", 4: "cane", 5: "flake", 6: "custom", 7: "bow", 8: "cone", 9: "sock", 10: "lights",
    11: "snowman", 12: "bird", 13: "custom", 14: "angel", 15: "gift", 16: "ginger", 17: "ball_silver", 18: "horse", 19: "snow", 20: "custom",
    21: "yuzu", 22: "ball_blue", 23: "ball_gold", 24: "star" };

  // ---------------------------------------------------------------- nhân vật
  const SANTA = pic([
    "......ww.....", ".....rrw.....", "....rrrr.....", "...rrrrrr....", "..wwwwwwww...", "..eekeekee...", "..eeeeeeee...", ".wwweppewww..",
    ".wwwwwwwwww..", "rrwwwwwwwwrr.", "rrrwwwwwwrrrc", "rrrrrwwrrrrcc", "kkkkkyykkkkcc", "rrrrrrrrrrr..", ".rrrrrrrrr...", ".rrrr.rrrr...",
    ".kkkk.kkkk..."]);
  const SANTA_BAG = pic(["..BB..", ".bbbb.", "bbbbbb", "bBbbBb", "bbbbbb", ".bbbb."]);
  const STACK = pic(["wwwwwwwwww", "wnnnnnnnnw", "wnwnnnnwnw", "wnnnnnnnnw", "wnnnwwnnnw", "wnnnnnnnnw", "wwwwwwwwww", ".s......s."]);
  const SANTA_HAT = ["............ww..", "..........rrww..", ".......rrrrr....", ".....rrrrrrrr...", "..wwwwwwwwwwww.."];
  const CAT = pic(["o...o..", "oo.oo..", "ooooo..", "kokoo..", "ooooo.o", ".oooooo", ".ooooo.", ".o.o.o."]);
  const PRINT = ["S.S", "..."];

  // ---------------------------------------------------------------- vẽ đè lên dải cảnh
  function cover(id) {
    const cv = document.getElementById("kb-yard"), r = cv.getBoundingClientRect();
    let o = document.getElementById(id);
    if (!o) { o = document.createElement("canvas"); o.id = id; o.className = "mk-ov mk-x"; document.body.appendChild(o); }
    const dpr = window.devicePixelRatio || 1;
    o.width = Math.round(r.width * dpr); o.height = Math.round(r.height * dpr);
    o.style.cssText = "position:fixed;pointer-events:none;image-rendering:pixelated;z-index:5;left:" + r.left + "px;top:" + r.top + "px;width:" + r.width + "px;height:" + r.height + "px";
    const ctx = o.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    const S = Math.round(r.height / 76), ox = Math.floor((r.width / S - 256) / 2);
    return { ctx, S, ox, oy: 0, r, cv: o };
  }
  // vẽ cây + món: st = {tx, ty, items:[{id, spot|at:[x,y]}], garland, lights, snow, star, night, glow, card, extra:[{spr, x, y}], ghostSpots, hover}
  function drawTree(v, st) {
    const { ctx, S } = v, X = v.ox + st.tx, Y = v.oy + st.ty;
    // bóng dưới gốc
    ctx.globalAlpha = 0.18; ctx.fillStyle = "#1b1b2f"; ctx.fillRect((X + 6) * S, (Y + TREE_H - 1) * S, 32 * S, S); ctx.globalAlpha = 1;
    L.sprite(ctx, TREE, X, Y, S);
    if (st.snow) { SNOW.forEach(([x, y]) => L.box(ctx, X + x, Y + y - 1, 1, 1, P.w, S)); }
    if (st.garland) { GARLAND.forEach(([x, y], k) => L.box(ctx, X + Math.round(x), Y + Math.round(y), 1, 1, k % 3 ? P.i : P.y, S)); }
    if (st.lights) {
      const cols = [P.r, P.y, P.l, P.p, P.f];
      LIGHTS.forEach(([x, y], k) => {
        const c = cols[k % cols.length];
        if (st.night) { ctx.globalAlpha = 0.4; L.box(ctx, X + x - 1, Y + y - 1, 3, 3, c, S); ctx.globalAlpha = 1; }
        L.box(ctx, X + x, Y + y, 1, 1, st.night || k % 2 ? c : "#3a3f55", S);
      });
    }
    (st.ghostSpots ? SPOTS.filter((s, i) => st.ghostSpots.indexOf(i) >= 0) : []).forEach(([x, y]) => {
      ctx.globalAlpha = 0.95; ctx.strokeStyle = "#fffbe0"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc((X + x + 0.5) * S, (Y + y + 1.5) * S, 1.5 * S, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    });
    const placed = [];
    (st.items || []).forEach((it) => {
      const spr = ORN[it.id] || ORN.ball;
      const at = it.at || SPOTS[it.spot];
      const w = spr[0].length;
      const x = X + at[0] - Math.floor(w / 2), y = Y + at[1] - 1;
      if (it.hook !== false) { L.box(ctx, X + at[0], Y + at[1] - 2, 1, 2, "#8a8fa8", S); }
      L.sprite(ctx, spr, x, y, S);
      placed.push({ id: it.id, x: (x) * S + v.r.left, y: y * S + v.r.top, w: w * S, h: spr.length * S });
    });
    if (st.star) {
      const sx = X + 22 - 5, sy = Y - 6;
      L.sprite(ctx, ORN.star, sx, sy, S);
    }
    return placed;
  }
  function glow(v, st) {     // sau khi tô tối: vẽ lại đèn + sao cho sáng
    const { ctx, S } = v, X = v.ox + st.tx, Y = v.oy + st.ty, cols = [P.r, P.y, P.l, P.p, P.f];
    LIGHTS.forEach(([x, y], k) => {
      const c = cols[k % cols.length];
      ctx.globalAlpha = 0.45; L.box(ctx, X + x - 1, Y + y - 1, 3, 3, c, S); ctx.globalAlpha = 1; L.box(ctx, X + x, Y + y, 1, 1, c, S);
    });
    const sx = X + 22 - 5, sy = Y - 6, cx = (sx + 5.5) * S, cy = (sy + 4.5) * S, gr = ctx.createRadialGradient(cx, cy, S, cx, cy, 14 * S);
    gr.addColorStop(0, "rgba(255, 240, 160, .55)"); gr.addColorStop(1, "rgba(255, 240, 160, 0)");
    ctx.fillStyle = gr; ctx.fillRect(cx - 14 * S, cy - 14 * S, 28 * S, 28 * S);
    L.sprite(ctx, ORN.star, sx, sy, S);
  }
  function spr(v, s, x, y, alpha) { L.sprite(v.ctx, s, v.ox + x, v.oy + y, v.S, undefined, alpha); }
  function tint(v, a) {    // ban đêm: tô tối phần vẽ đè cho hợp với cảnh
    const { ctx } = v; ctx.save(); ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = "rgba(20, 24, 60, " + a + ")";
    ctx.fillRect(0, 0, v.r.width, v.r.height); ctx.restore();
  }
  // vẽ một hình lên canvas riêng (icon trong bảng)
  function icon(sprRows, scale, bg) {
    const c = document.createElement("canvas"), w = sprRows[0].length, h = sprRows.length;
    c.width = w * scale; c.height = h * scale; c.style.imageRendering = "pixelated";
    const ctx = c.getContext("2d");
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
    L.sprite(ctx, sprRows, 0, 0, scale);
    return c;
  }
  // cây thu nhỏ (cho Lịch / quả cầu tuyết): vẽ lên canvas có sẵn
  function miniTree(c, scale, st, bg) {
    const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = false;
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
    const fake = { ctx, S: scale, ox: Math.floor((c.width / scale - TREE_W) / 2), oy: Math.floor(c.height / scale - TREE_H - 1), r: { left: 0, top: 0, width: c.width, height: c.height } };
    drawTree(fake, Object.assign({}, st, { tx: 0, ty: 0 }));
    return fake;
  }
  return { L, P, ORN, ORN_NAME, DOORS, TREE, TREE_W, TREE_H, SPOTS, SANTA, SANTA_BAG, STACK, CAT, PRINT, SANTA_HAT, cover, drawTree, glow, spr, tint, icon, miniTree, pic };
})();
