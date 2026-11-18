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

  // ---------------------------------------------------------------- 1.36 bản 2: cây thưa (10 chỗ đẹp sẵn) + trang trí nhà
  const SPOTS2 = [[21, 11], [15, 21], [28, 20], [10, 31], [22, 29], [33, 31], [6, 42], [17, 40], [27, 41], [37, 42]];
  function ring(n, cols) {
    const g = grid(n, n), c = (n - 1) / 2;
    for (let j = 0; j < n; j++) { for (let i = 0; i < n; i++) { const d = Math.hypot(i - c, j - c); if (d >= c - 1.9 && d <= c + 0.4) { g[j][i] = (i * 3 + j * 5) % 7 === 0 ? "j" : (i + j) % 3 === 0 ? "g" : "G"; } } }
    return g;
  }
  const WREATH = (function () { const g = ring(11); [[2, 3], [8, 2], [9, 7], [1, 7], [5, 0]].forEach(([x, y]) => dot(g, x, y, "r")); rect(g, 3, 8, 2, 2, "r"); rect(g, 6, 8, 2, 2, "r"); dot(g, 5, 9, "R"); dot(g, 3, 10, "R"); dot(g, 7, 10, "R"); return rows(outline(g)); })();
  const SNOWMAN_BIG = (function () {
    const g = grid(15, 18);
    disc(g, 7, 5, 2.6, "w"); disc(g, 7, 12, 4, "w"); rect(g, 4, 0, 7, 1, "k"); rect(g, 5, -1, 5, 1, "k"); rect(g, 5, 1, 5, 2, "k"); rect(g, 3, 3, 9, 1, "k");
    dot(g, 6, 5, "k"); dot(g, 8, 5, "k"); dot(g, 9, 6, "o"); dot(g, 10, 6, "o"); rect(g, 4, 8, 7, 1, "r"); rect(g, 9, 9, 2, 2, "r");
    dot(g, 7, 11, "k"); dot(g, 7, 13, "k"); dot(g, 1, 9, "B"); dot(g, 2, 10, "B"); dot(g, 13, 9, "B"); dot(g, 12, 10, "B"); dot(g, 0, 8, "B"); dot(g, 14, 8, "B");
    for (let i = 3; i <= 11; i++) { dot(g, i, 17, "s"); }
    return rows(outline(g));
  })();
  const CANE_BIG = pic([".rwr.", "w...w", "r...r", "....w", "....r", "....w", "....r", "....w", "....r", "....w"]);
  const CANDLE = pic([".y.", ".o.", "www", "wrw", "www", "www"]);
  const STICKER = pic(["...l...", ".l.w.l.", "..www..", "lwwlwwl", "..www..", ".l.w.l.", "...l..."], true);
  const STOCKING = pic(["wwwww.", "wwwww.", "rrrr..", "rgrr..", "rrrr..", "rrrrr.", "rrrrrr", "rrrgrr", ".rrrr."]);
  const MINI_TREE = (function () {
    const g = grid(15, 21);
    [[2, 7, 3.5], [6, 12, 5.5], [10, 17, 7]].forEach(([y0, y1, hw]) => { for (let j = y0; j <= y1; j++) { const h = Math.round(hw * (j - y0 + 2) / (y1 - y0 + 2)); for (let i = 7 - h; i <= 7 + h; i++) { dot(g, i, j, i < 6 ? "g" : i > 8 ? "j" : "G"); } } });
    [[5, 9, "r"], [9, 11, "y"], [4, 15, "d"], [10, 16, "r"], [7, 6, "y"]].forEach(([x, y, c]) => dot(g, x, y, c));
    dot(g, 7, 0, "y"); rect(g, 6, 1, 3, 1, "y"); rect(g, 6, 18, 3, 1, "B"); rect(g, 4, 19, 7, 2, "r"); rect(g, 4, 19, 7, 1, "R");
    return rows(outline(g));
  })();
  const CAKE = pic(["..w.w.w..", "bbbbbbbbB", "bBbbBbbBB", "bbbbbbbbB", "SSSSSSSSS"]);
  const YUZU_BOWL = pic([".g.......", "oyoyyoy..", "yyoyyyoy.", "SsssssssS", ".SSSSSSS."].map((s) => s.slice(0, 9)));
  const GIFTS = pic(["..w.......", ".www..w.w.", "rrwrr..w..", "rrwrr.dwdd", "wwwww.wwww", "rrwrr.dwdd", "rrwrr.dwdd"]);
  const PAINT = (function () {     // tranh tự vẽ 16 × 16 trong khung gỗ (ví dụ: nhà nhỏ dưới tuyết)
    const pix = ["nnnnnnnnnnnnnnnn", "nnwnnnnnnnwnnnnn", "nnnnnnyynnnnnwnn", "nnnnnnyynnnnnnnn", "nnnnnwnnnnnnnnnn", "nnnnnnnnrrnnnnnn", "nnnnnnnrrrrnnnwn", "nnnnnnrrrrrrnnnn",
      "nnnnnrrrrrrrrnnn", "nnnnnnhhhhhhnnnn", "nnnnnnhyhhyhnnnn", "nnnnnnhhhhhhnnnn", "nnGnnnhhhBhhnGnn", "nGGGnnhhhBhhGGGn", "wwwwwwwwwwwwwwww", "wwwwwwwwwwwwwwww"];
    const g = grid(18, 18); rect(g, 0, 0, 18, 18, "b"); rect(g, 0, 0, 18, 1, "h");
    pix.forEach((r, j) => { for (let i = 0; i < 16; i++) { g[j + 1][i + 1] = r[i]; } });
    return rows(outline(g));
  })();
  // ngoài nhà: nhà vẽ ở toạ độ sân x 0..64 (drawHouse(ctx, S, ox, oy, …))
  function drawHouseDeco(v, o) {
    const { ctx, S } = v, X = v.ox, Y = v.oy, cols = [P.r, P.y, P.l, P.f, P.p];
    if (o.icicles) {
      for (let x = 3; x <= 61; x += 2) { const h = 1 + ((x * 7) % 3); L.box(ctx, X + x, Y + 36, 1, h, (x % 4) ? "#dff3ff" : "#ffffff", S); }
      for (let x = 2; x <= 62; x += 1) { L.box(ctx, X + x, Y + 32, 1, 1, "#ffffff", S); }
    }
    if (o.roof) {
      const pts = []; for (let x = 3; x <= 61; x += 3) { pts.push([x, 36]); }
      for (let y = 15; y <= 32; y += 3) { const h = Math.round((y - 13) * 1.45) + 4; pts.push([32 - h, y]); pts.push([32 + h - 1, y]); }
      pts.forEach(([x, y], k) => {
        const c = cols[k % cols.length];
        if (o.night) { ctx.globalAlpha = 0.45; L.box(ctx, X + x - 1, Y + y - 1, 3, 3, c, S); ctx.globalAlpha = 1; }
        L.box(ctx, X + x, Y + y, 1, 1, o.night || k % 2 ? c : "#3a3f55", S);
      });
    }
    if (o.wreath) { L.sprite(ctx, WREATH, X + 26.5, Y + 44, S); }
    if (o.candles) { [[15, 43], [44, 43]].forEach(([x, y]) => { if (o.night) { ctx.globalAlpha = 0.4; L.box(ctx, X + x - 2, Y + y - 2, 7, 6, "#ffd23f", S); ctx.globalAlpha = 1; } L.sprite(ctx, CANDLE, X + x, Y + y, S); }); }
    if (o.sticker) { L.sprite(ctx, STICKER, X + 43, Y + 41, S, undefined, 0.95); }
    if (o.canes) { [[19, 62], [41, 62]].forEach(([x, y]) => L.sprite(ctx, CANE_BIG, X + x, Y + y, S)); }
    if (o.snowman) { L.sprite(ctx, SNOWMAN_BIG, X + 63, Y + 57, S); }
  }
  // trong nhà: phòng giữa của nhà 3 gian (dải cảnh "Trong nhà"); v = coverHouse()
  function drawRoomDeco(v, o) {
    const { ctx, S } = v, X = v.ox, Y = v.oy;
    if (o.wreath_in) { L.sprite(ctx, WREATH, X + 100, Y + 17, S); }
    if (o.paint) { L.sprite(ctx, PAINT, X + 6, Y + 17, S); }
    if (o.stocking) { [[40, 19], [50, 19]].forEach(([x, y], k) => L.sprite(ctx, k ? recolor(STOCKING, { r: "d", g: "y" }) : STOCKING, X + x, Y + y, S)); }
    if (o.yuzu) { L.sprite(ctx, YUZU_BOWL, X + 76, Y + 27, S); }
    if (o.minitree) { L.sprite(ctx, MINI_TREE, X + 18, Y + 35, S); }
    if (o.gifts) { L.sprite(ctx, GIFTS, X + 33, Y + 49, S); }
    if (o.cake) { L.sprite(ctx, CAKE, X + 74, Y + 51, S); }
  }
  function coverHouse(id) {
    const cv = document.getElementById("kb-yard"), r = cv.getBoundingClientRect(), H3 = L.HOUSE3, R = L.ROOM;
    const S0 = Math.round(r.height / 76);
    const Sh = Math.max(1, Math.min(S0, Math.max(Math.floor(r.height / R.H), 2), Math.floor(r.width / (H3.W + 10))));
    const hx = Math.floor((r.width / Sh - H3.W) / 2), hy = Math.max(-12, Math.floor(r.height / Sh - R.H));
    const v = cover(id); v.S = Sh; v.ox = hx + H3.X.room; v.oy = hy; return v;
  }

  // ---------------------------------------------------------------- 1.36 bản 3
  // cây thông được tặng khi mở giao diện mùa Giáng sinh (SPR.xmastree 32 × 44) — bản trơn rồi đầy dần
  const XT = L.SPR.xmastree, XT_W = XT[0].length, XT_H = XT.length;
  const XT_BALLS = [[14, 9], [11, 16], [20, 17], [8, 23], [17, 24], [24, 24], [12, 29], [21, 31], [6, 31], [26, 32]];
  const XT_GARL = []; for (let k = 0; k < 9; k++) { XT_GARL.push([Math.round(10 + k * 1.6), 14 + k]); XT_GARL.push([Math.round(23 - k * 1.7), Math.round(22 + k * 1.1)]); }
  const XT_LIGHTS = [[12, 11], [19, 13], [9, 18], [16, 19], [23, 20], [6, 26], [13, 26], [20, 27], [26, 28], [10, 31], [17, 32]];
  const XT_BARE = (function () {
    const g = XT.map((r) => r.split(""));
    for (let j = 0; j < 34; j++) {
      for (let i = 0; i < XT_W; i++) {
        const c = g[j][i];
        if (c === "k") { g[j][i] = "."; continue; }
        if (c === ".") { continue; }
        if (j < 5) { g[j][i] = "."; continue; }
        if (["g", "G", "j"].indexOf(c) < 0) { g[j][i] = i < 14 ? "g" : i > 18 ? "j" : "G"; }
      }
    }
    // giữ nguyên chậu + thân (dòng 34 trở xuống), viền lại phần lá
    const top = g.slice(0, 34), o = outline(top.map((r) => r.slice()).concat([new Array(XT_W).fill(".")]));
    return rows(o.slice(0, 34)).concat(XT.slice(34));
  })();
  // st: {balls: [chỉ số XT_BALLS], garland, lights, star, night}
  function xtree(st) {
    const g = XT_BARE.map((r) => r.split(""));
    const take = (x, y) => { if (XT[y] && XT[y][x] !== undefined && XT[y][x] !== ".") { g[y][x] = XT[y][x]; } };
    (st.balls || []).forEach((k) => { const [x, y] = XT_BALLS[k]; take(x, y); take(x + 1, y); take(x, y + 1); take(x + 1, y + 1); });
    if (st.garland) { XT_GARL.forEach(([x, y]) => take(x, y)); }
    if (st.star) { for (let y = 0; y < 8; y++) { for (let x = 0; x < XT_W; x++) { if (XT[y][x] !== ".") { g[y][x] = XT[y][x]; } else if (y < 5) { g[y][x] = "."; } } } }
    return rows(g);
  }
  function drawXTree(v, x, y, st) {
    const { ctx, S } = v, X = v.ox + x, Y = v.oy + y;
    ctx.globalAlpha = 0.18; ctx.fillStyle = "#1b1b2f"; ctx.fillRect((X + 4) * S, (Y + XT_H - 1) * S, 24 * S, S); ctx.globalAlpha = 1;
    L.sprite(ctx, xtree(st), X, Y, S);
    if (st.lights) {
      const cols = [P.r, P.y, P.l, P.p, P.f];
      XT_LIGHTS.forEach(([lx, ly], k) => {
        const c = cols[k % cols.length];
        if (st.night) { ctx.globalAlpha = 0.45; L.box(ctx, X + lx - 1, Y + ly - 1, 3, 3, c, S); ctx.globalAlpha = 1; }
        L.box(ctx, X + lx, Y + ly, 1, 1, st.night || k % 2 ? c : "#3a3f55", S);
      });
    }
    if (st.star && st.night) {
      const cx = (X + 16) * S, cy = (Y + 3) * S, gr = ctx.createRadialGradient(cx, cy, S, cx, cy, 12 * S);
      gr.addColorStop(0, "rgba(255, 240, 160, .5)"); gr.addColorStop(1, "rgba(255, 240, 160, 0)"); ctx.fillStyle = gr; ctx.fillRect(cx - 12 * S, cy - 12 * S, 24 * S, 24 * S);
      for (let y2 = 0; y2 < 8; y2++) { for (let x2 = 0; x2 < XT_W; x2++) { const c = XT[y2][x2]; if (c !== "." ) { L.box(ctx, X + x2, Y + y2, 1, 1, P[c] || c, S); } } }
    }
  }
  // nhà khoác áo Noel: nấc 1–4 (nhà gốc 64 × 76 ở toạ độ sân x 0..64)
  const BOW = pic(["r.r", "rRr", ".r."], true);
  const LAMP_POST = pic([".kk.", "kyyk", "kyyk", ".kk.", "..k.", "..k.", "..k.", ".kkk"].map((s) => s), true);
  const ROOF_STAR = pic(["....y....", "...yyy...", "yyyyiyyyy", ".yyyiyyy.", "..yyyyy..", ".yyy.yyy.", ".yy...yy."]);
  function drawHouseNoel(v, n, night, onlyGlow) {
    const { ctx, S } = v, X = v.ox, Y = v.oy, b = (x, y, w, h, c) => L.box(ctx, X + x, Y + y, w, h, c, S);
    if (n >= 2 && !onlyGlow) {
      // mái tuyết dày: phủ phần trên mái, mép dưới lượn sóng + bóng xanh nhạt, tuyết trên ống khói
      for (let x = 4; x <= 60; x++) {
        const half = Math.abs(x - 31.5);
        const yTop = 13 + Math.max(0, Math.ceil((half - 3) / 1.45));
        const yBot = 25 + Math.round(1.2 * Math.sin(x * 0.9) + 0.8 * Math.sin(x * 0.37));
        if (yTop > yBot) { continue; }
        for (let y = yTop; y <= yBot; y++) { if (!(x >= 27 && x <= 37 && y >= 19 && y <= 29)) { b(x, y, 1, 1, "#ffffff"); } }
        if (x >= 27 && x <= 37 && yTop < 19) { b(x, 18, 1, 1, "#e8f2fb"); }
        b(x, yBot + 1, 1, 1, "#cfe0f0");
        if ((x * 7) % 11 === 0) { b(x, yBot + 1, 1, 2, "#e8f2fb"); }
      }
      b(42, 8, 10, 3, "#ffffff"); b(42, 11, 10, 1, "#cfe0f0");
      // dây lá thông dọc mép mái + nơ đỏ
      for (let x = 1; x <= 62; x++) { const y = 35 + (x % 3 === 0 ? 1 : 0); b(x, y, 1, 2, (x % 4 === 0) ? P.g : (x % 3 ? P.G : P.j)); }
      for (let x = 6; x <= 58; x += 13) { L.sprite(ctx, BOW, X + x - 1, Y + 34, S); }
    }
    if (n >= 1 && !onlyGlow) {
      L.sprite(ctx, WREATH, X + 26.5, Y + 44, S);
      [[22, 45], [39, 45]].forEach(([x, y]) => L.sprite(ctx, BOW, X + x - 0.5, Y + y, S));
    }
    if (n >= 3) {
      const cols = [P.r, P.y, P.l, P.f, P.p], pts = [];
      for (let x = 3; x <= 61; x += 3) { pts.push([x, 37]); }
      for (let y = 27; y <= 33; y += 2) { const h = Math.round((y - 13) * 1.45) + 3; pts.push([32 - h - 1, y]); pts.push([32 + h, y]); }
      pts.forEach(([x, y], k) => { const c = cols[k % cols.length]; if (night) { ctx.globalAlpha = 0.45; b(x - 1, y - 1, 3, 3, c); ctx.globalAlpha = 1; } b(x, y, 1, 1, night || k % 2 ? c : "#3a3f55"); });
      if (!onlyGlow) { for (let x = 3; x <= 61; x += 2) { b(x, 38, 1, 1 + ((x * 7) % 3), (x % 4) ? "#dff3ff" : "#ffffff"); } }
      [[15, 43], [44, 43]].forEach(([x, y]) => { if (night) { ctx.globalAlpha = 0.4; b(x - 2, y - 2, 7, 6, "#ffd23f"); ctx.globalAlpha = 1; } L.sprite(ctx, CANDLE, X + x, Y + y, S); });
    }
    if (n >= 4) {
      if (night) { const cx = (X + 32) * S, cy = (Y + 5) * S, gr = ctx.createRadialGradient(cx, cy, S, cx, cy, 10 * S); gr.addColorStop(0, "rgba(255,240,160,.5)"); gr.addColorStop(1, "rgba(255,240,160,0)"); ctx.fillStyle = gr; ctx.fillRect(cx - 10 * S, cy - 10 * S, 20 * S, 20 * S); }
      L.sprite(ctx, ROOF_STAR, X + 27.5, Y + 1, S);
      if (!onlyGlow) { L.sprite(ctx, SNOWMAN_BIG, X + 64, Y + 57, S); }
    }
  }
  // tủ lịch gỗ 24 ngăn (vẽ trên canvas riêng, S điểm ảnh): o = {open: {ngày: sprite}, today, tomorrow: sprite, miss: [..]}
  function drawCabinet(c, S, o) {
    const ctx = c.getContext("2d"); ctx.imageSmoothingEnabled = false;
    const b = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S)); };
    const DW = 16, DH = 13, G = 2, FR = 3, TOP = 12, W = FR * 2 + 6 * DW + 5 * G, H = TOP + FR * 2 + 4 * DH + 3 * G;
    // mái nhọn + biển "24"
    for (let y = 0; y < TOP; y++) { const half = Math.round((W / 2) * (y + 1) / TOP); b(W / 2 - half, y, half * 2, 1, y % 3 === 0 ? "#8a4a26" : "#a0603a"); b(W / 2 - half, y, 1, 1, "#3a2a22"); b(W / 2 + half - 1, y, 1, 1, "#3a2a22"); }
    for (let x = 0; x < W; x += 6) { b(x + 1, TOP - 2, 4, 2, "#ffffff"); }
    b(W / 2 - 7, 4, 14, 7, "#f2d36b"); b(W / 2 - 7, 4, 14, 1, "#3a2a22"); b(W / 2 - 7, 10, 14, 1, "#3a2a22"); b(W / 2 - 7, 4, 1, 7, "#3a2a22"); b(W / 2 + 6, 4, 1, 7, "#3a2a22");
    ctx.fillStyle = "#7a2a1a"; ctx.font = "bold " + (5 * S) + "px monospace"; ctx.textAlign = "center"; ctx.fillText("24", (W / 2) * S, 9.6 * S);
    // thân tủ
    b(0, TOP, W, H - TOP, "#3a2a22"); b(1, TOP + 1, W - 2, H - TOP - 2, "#8a4a26"); b(1, TOP + 1, W - 2, 1, "#b0703c");
    for (let r = 0; r < 4; r++) {
      for (let col = 0; col < 6; col++) {
        const d = r * 6 + col + 1, x = FR + col * (DW + G), y = TOP + FR + r * (DH + G);
        const isOpen = o.open[d], isToday = d === o.today, isTom = d === o.today + 1, isMiss = (o.miss || []).indexOf(d) >= 0;
        if (isOpen) {
          b(x, y, DW, DH, "#3a2a22"); b(x + 1, y + 1, DW - 2, DH - 2, "#2a1a12");
          b(x + 1, y + DH - 3, DW - 2, 2, "#5a3a22");
          const sp = isOpen, sw = sp[0].length, sh = sp.length, k = Math.min(1, Math.min((DW - 2) / sw, (DH - 2) / sh));
          const t = document.createElement("canvas"); t.width = sw * S; t.height = sh * S; L.sprite(t.getContext("2d"), sp, 0, 0, S);
          const dw = sw * S * k, dh = sh * S * k; ctx.drawImage(t, (x + DW / 2) * S - dw / 2, (y + DH - 1.5) * S - dh, dw, dh);
          ctx.fillStyle = "#f2d36b"; ctx.font = "bold " + (3 * S) + "px monospace"; ctx.textAlign = "left"; ctx.fillText(String(d), (x + 1) * S, (y + 3.6) * S);
          continue;
        }
        const face = isToday ? "#e9b949" : (d % 2 ? "#c8534b" : "#3f7d4f");
        if (isToday) { ctx.globalAlpha = 0.55; b(x - 1.5, y - 1.5, DW + 3, DH + 3, "#fff3a0"); ctx.globalAlpha = 1; }
        let dy = 0;
        if (isTom) {      // ngăn ngày mai hé ra: thấy bóng món bên trong
          b(x, y, DW, DH, "#3a2a22"); b(x + 1, y + 1, DW - 2, 4, "#6a4428"); dy = 4;
          if (o.tomorrow) { const sp = o.tomorrow.map((r2) => r2.replace(/[^.]/g, "k")); const t = document.createElement("canvas"); t.width = sp[0].length * S; t.height = sp.length * S; L.sprite(t.getContext("2d"), sp, 0, 0, S, undefined, 0.85);
            const k = Math.min(1, (DW - 4) / sp[0].length, 6 / sp.length); ctx.drawImage(t, (x + DW / 2) * S - t.width * k / 2, (y + 0.5) * S, t.width * k, t.height * k); }
        }
        b(x, y + dy, DW, DH - dy, "#3a2a22"); b(x + 1, y + dy + 1, DW - 2, DH - dy - 2, face); b(x + 1, y + dy + 1, DW - 2, 1, "rgba(255,255,255,.25)");
        b(x + DW / 2 - 4, y + dy + 2, 8, 4, "#f4e7c8"); b(x + DW / 2 - 4, y + dy + 2, 8, 0.5, "#3a2a22");
        b(x + DW / 2 - 1, y + DH - 3, 2, 2, "#f2d36b"); b(x + DW / 2 - 1, y + DH - 3, 2, 0.6, "#ffffff");
        ctx.fillStyle = isMiss ? "#9a8a7a" : "#3a2a22"; ctx.font = "bold " + (3.4 * S) + "px monospace"; ctx.textAlign = "center"; ctx.fillText(String(d), (x + DW / 2) * S, (y + dy + 5.2) * S);
        if (isMiss) { ctx.strokeStyle = "#fff3c4"; ctx.setLineDash([S, S]); ctx.lineWidth = 2; ctx.strokeRect((x + 0.5) * S, (y + 0.5) * S, (DW - 1) * S, (DH - 1) * S); ctx.setLineDash([]); }
        if (isToday) { [[x - 1, y - 1], [x + DW, y + 2], [x + 3, y + DH], [x + DW - 2, y - 2]].forEach(([sx, sy]) => { b(sx, sy, 1, 1, "#ffffff"); }); }
      }
    }
    return { W, H };
  }
  // tủ lịch nhỏ treo tường (trong cảnh): khối gỗ + lưới ngăn
  function drawCabinetMini(v, x, y, o) {
    const { ctx, S } = v, X = v.ox + x, Y = v.oy + y, b = (xx, yy, w, h, c) => L.box(ctx, X + xx, Y + yy, w, h, c, S);
    for (let yy = 0; yy < 4; yy++) { const h = 2 + yy * 4; b(13 - h, yy, h * 2, 1, "#a0603a"); }
    b(0, 4, 26, 19, "#3a2a22"); b(1, 5, 24, 17, "#8a4a26");
    for (let r = 0; r < 4; r++) { for (let c = 0; c < 6; c++) { const d = r * 6 + c + 1, xx = 1 + c * 4, yy = 5 + r * 4; b(xx + 0.5, yy + 0.5, 3, 3, (o.open[d] ? "#2a1a12" : d === o.today ? "#ffd23f" : (d % 2 ? "#c8534b" : "#3f7d4f"))); } }
  }
  const MUSIC_BOX = pic(["..BBBBBBBB..", ".BbbbbbbbbB.", "BBBBBBBBBBBB", ".....G......", "....GGG.....", "...GGGGG....", "cccccBcccccc", "bbbbbbbbbbbi", "bhbbbbbbbbbi", "bbbbbbbbbbbb"], false);
  const COOKIES = pic(["..tt..tt..", ".twtt.ttt.", "..tt.twtt.", "SSSSSSSSSS"]);
  const CRUMBS = pic(["..........", "...t....t.", ".t...t....", "SSSSSSSSSS"]);
  const MILK = pic(["sws", "sws", "sws", "sws"]);
  const GLASS = pic(["s.s", "s.s", "s.s", "sss"]);
  const NOTE = pic(["wwwww", "wkkkw", "wwwww", "wkkww", "wwwww"]);
  const BOX_R = L.SPR.presents;

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
    (st.ghostSpots ? (st.spots2 ? SPOTS2 : SPOTS).filter((s, i) => st.ghostSpots.indexOf(i) >= 0) : []).forEach(([x, y]) => {
      ctx.globalAlpha = 0.95; ctx.strokeStyle = "#fffbe0"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc((X + x + 0.5) * S, (Y + y + 1.5) * S, 1.5 * S, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    });
    const placed = [];
    (st.items || []).forEach((it) => {
      const spr = ORN[it.id] || ORN.ball;
      const at = it.at || (st.spots2 ? SPOTS2 : SPOTS)[it.spot];
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
  return { XT, XT_BARE, xtree, drawXTree, drawHouseNoel, drawCabinet, drawCabinetMini, MUSIC_BOX, COOKIES, CRUMBS, MILK, GLASS, NOTE, BOW, ROOF_STAR, SPOTS2, WREATH, SNOWMAN_BIG, CANE_BIG, CANDLE, STICKER, STOCKING, MINI_TREE, CAKE, YUZU_BOWL, GIFTS, PAINT, drawHouseDeco, drawRoomDeco, coverHouse, L, P, ORN, ORN_NAME, DOORS, TREE, TREE_W, TREE_H, SPOTS, SANTA, SANTA_BAG, STACK, CAT, PRINT, SANTA_HAT, cover, drawTree, glow, spr, tint, icon, miniTree, pic };
})();
