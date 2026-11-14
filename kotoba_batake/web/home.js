/* ことば畑 – Nhà & Cửa hàng: dùng xu xây nhà, mua đồ trang trí sân và nội thất.
   Python giữ giá, kiểm tra xu và chỗ đặt (state.json); file này chỉ vẽ và gửi lệnh. */
var GardenHome = (function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let H = null;
  let isOpen = false;
  let scene = "yard";            // yard | room (trong bảng Nhà)
  let tab = "build";             // build | yard | room | inv
  let placing = null;            // {id, index?}  index = đang di chuyển món đã đặt
  let selected = null;           // {scene, index}
  let hover = null;              // {x, y} ô đang trỏ chuột
  let view = null;               // vị trí cảnh trên canvas của bảng {ox, oy, S, scene}
  const parts = {};               // hạt của từng cảnh (khởi tạo bên dưới, sau ZONE_IDS)
  let RARE = null;                // móc của rare_art.js (1.16: 12 món hiếm mới): frameOf, emit, pal
  let NHA = null;                 // 1.24: móc của nha_art.js (đồ Bếp / Phòng ngủ, nền hai gian bên)
  let ART = null;                 // móc của season_art.js (đồ theo mùa): motion, pal, emit, stepPart, drawPart, frameOf
  let FIND = null;                // 1.28: móc của finds_art.js (quà Hộp sưu tầm, món gánh hàng rong): frameOf, pal
  let lastTs = 0, frame = 0;

  const T = 16;                                   // 1 ô = 16 điểm ảnh nghệ thuật
  const YARD = { W: 256, H: 76, SKY: 28 };
  const ROOM = { W: 160, H: 88, FLOOR: 40, WALL_Y: 12 };
  // 1.24: nhà 3 gian — Bếp (trái) · phòng chính · Phòng ngủ (phải); gian bên 9 ô. "house" = cả nhà ở màn chính / ảnh chụp
  const SIDE = { W: 144 };
  const SIDE_IDS = ["kitchen", "bedroom"];
  const HOUSE3 = { W: 456, POST: 4, X: { kitchen: 0, room: 148, bedroom: 312 } };
  const isRoom = (s) => s === "room" || SIDE_IDS.indexOf(s) >= 0;
  const roomW = (s) => (s === "room" ? ROOM.W : SIDE.W);

  const P = {
    k: "#1b1b2f", w: "#ffffff", y: "#ffd23f", o: "#ff9f1c", r: "#ff4f6d", R: "#c21f3a", p: "#ff7fa0",
    P: "#ffc4d6", g: "#3ccb5e", G: "#2e8b3a", b: "#a0603a", B: "#6b3b1f", t: "#e2a46a", s: "#d4d4e0",
    S: "#8a8fa8", d: "#3d8bff", l: "#8fd3ff", c: "#fff2b3", m: "#9aa0b5", n: "#2b2b44", v: "#c77dff", h: "#f5b971",
    // thêm cho xưởng chế tác & các vùng mới
    i: "#e9b949", e: "#ffd7b5", E: "#d99a6c", z: "#7b2cbf", u: "#2f5fb0", U: "#1e3a8a", a: "#2ec4b6", A: "#1a7f78",
    f: "#b8e05a", j: "#1f5f2a"
  };
  const ZONE_IDS = ["beach", "shrine", "festival", "bamboo", "onsen", "station"];
  const isUz = (s) => /^u\d{1,2}$/.test(String(s || ""));          // 1.14: vùng tự tạo (u1, u2…)
  const isOut = (s) => s === "yard" || ZONE_IDS.indexOf(s) >= 0 || isUz(s);
  const SCENE_NAME = { yard: "Sân vườn", room: "Trong nhà", kitchen: "Bếp", bedroom: "Phòng ngủ", house: "Trong nhà", beach: "Bãi biển", shrine: "Đền trên núi", festival: "Phố lễ hội",
    bamboo: "Rừng tre", onsen: "Suối nước nóng", station: "Ga làng quê" };
  ["yard", "room"].concat(SIDE_IDS, ZONE_IDS).forEach((sc) => { parts[sc] = []; });
  function partsOf(sc) { return parts[sc] || (parts[sc] = []); }

  // ---------------------------------------------------------------------
  // Dựng sprite: lưới ký tự + tự viền đen
  // ---------------------------------------------------------------------
  function grid(w, h) { const g = []; for (let j = 0; j < h; j++) { g.push(new Array(w).fill(".")); } return g; }
  function rect(g, x, y, w, h, c) {
    for (let j = y; j < y + h; j++) { for (let i = x; i < x + w; i++) { if (g[j] && i >= 0 && i < g[0].length) { g[j][i] = c; } } }
  }
  function disc(g, cx, cy, r, c) {
    for (let j = 0; j < g.length; j++) {
      for (let i = 0; i < g[0].length; i++) { if ((i - cx) * (i - cx) + (j - cy) * (j - cy) <= r * r + r * 0.6) { g[j][i] = c; } }
    }
  }
  function dot(g, x, y, c) { if (g[y] && x >= 0 && x < g[0].length) { g[y][x] = c; } }
  function outline(g) {
    const h = g.length, w = g[0].length, out = g.map((r) => r.slice());
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        if (g[j][i] !== ".") { continue; }
        const n = [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => g[j + dy] && g[j + dy][i + dx] && g[j + dy][i + dx] !== ".");
        if (n) { out[j][i] = "k"; }
      }
    }
    return out;
  }
  const rows = (g) => g.map((r) => r.join(""));

  const SPR = {};
  SPR.fence = [
    "................", "................", "................", "................", "................", "................",
    ".kk....kk....kk.",
    "kttk..kttk..kttk",
    "kttkkkkttkkkkttk",
    "kttttttttttttttk",
    "kttkkkkttkkkkttk",
    "kttk..kttk..kttk",
    "kttkkkkttkkkkttk",
    "kttttttttttttttk",
    "kttkkkkttkkkkttk",
    "kbbk..kbbk..kbbk"
  ];
  SPR.flowers = [
    "................", "................", "................", "................", "................", "................",
    "...kk......kk...",
    "..kppk....kyyk..",
    ".kpwppk..kywyyk.",
    "..kppk.kk.kyyk..",
    "...kkgkrrk.kk...",
    "..kgGkkrwrk.k...",
    ".kgGGk.krrk.kgk.",
    ".kGGGGkgkkgkgGk.",
    "..kGGGGGGGGGGk..",
    "...kkkkkkkkkk..."
  ];
  SPR.lantern = [
    "....kkkk....",
    "...kSSSSk...",
    ".kkSSSSSSkk.",
    "kSSSSSSSSSSk",
    ".kkkkkkkkkk.",
    "..kssssssk..",
    "..ksykyysk..",
    "..ksyyyysk..",
    "..kssssssk..",
    "...kkkkkk...",
    "....kssk....",
    "....kssk....",
    "....kssk....",
    "...kssssk...",
    "..kSSSSSSk..",
    "..kkkkkkkk.."
  ];
  SPR.mailbox = [
    "...kkkkkk...",
    "..krrrrrrk..",
    ".krrrrrrrrk.",
    ".krkkkkkkrk.",
    ".krrrrrrrrk.",
    ".krrrrrrrrkk",
    ".kkkkkkkkkk.",
    ".....kbk....",
    ".....kbk....",
    ".....kbk....",
    ".....kbk....",
    ".....kbk....",
    "....kbbbk...",
    "...kkkkkkk.."
  ];
  SPR.bench = [
    "kkkkkkkkkkkkkkkk",
    "kttttttttttttttk",
    "kkkkkkkkkkkkkkkk",
    "kttttttttttttttk",
    "kkkkkkkkkkkkkkkk",
    ".kbk........kbk.",
    ".kbk........kbk.",
    "kkkkkkkkkkkkkkkk",
    "kttttttttttttttk",
    "kkkkkkkkkkkkkkkk",
    ".kbk........kbk.",
    ".kbk........kbk.",
    ".kkk........kkk."
  ];
  SPR.scarecrow = [
    "....kkkkkk....",
    "...kyyyyyyk...",
    ".kkyyyyyyyykk.",
    "kyyyyyyyyyyyyk",
    ".kkkkkkkkkkkk.",
    "...kttttttk...",
    "...ktkttktk...",
    "...kttttttk...",
    "...ktkkkktk...",
    "....kttttk....",
    "kkkkkkbbkkkkkk",
    "kbbbkrrrrkbbbk",
    "kkkkkrrrrkkkkk",
    "....krrrrk....",
    "....krddrk....",
    "....krrrrk....",
    "....kkbbkk....",
    ".....kbbk.....",
    ".....kbbk.....",
    ".....kbbk.....",
    "....kkbbkk....",
    "...kGGGGGGk..."
  ];
  SPR.chochin = [
    "...kkkk...",
    "..kRRRRk..",
    ".krrrrrrk.",
    "krrwrrrrrk",
    "kRRRRRRRRk",
    "krrrrrrrrk",
    "kRRRRRRRRk",
    "krrrrrrrrk",
    ".krrrrrrk.",
    "..kRRRRk..",
    "...kkkk...",
    "....kbk...",      // 1.25.3: cán nối liền thân đèn (trước "....kk...." hụt một điểm viền bên phải)
    "....kbk...",
    "....kbk...",
    "....kbk...",
    "....kbk...",
    "...kbbbk..",
    "..kkkkkkk."
  ];
  SPR.maneki = [
    ".kk..k.....k..",
    "kwwkkwk...kwk.",
    "kwwkkwwkkkwwk.",
    ".kwkwwwwwwwwwk",
    ".kwkwkwwwwkwwk",
    ".kwkwwwprwwwwk",
    ".kwkwwwwwwwwwk",
    "..kkkwwwwwwwk.",
    "...kwrrrrrrwk.",
    "...kwwwyywwwk.",
    "...kwwwwwwwwk.",
    "..kwwwwwwwwwwk",
    "..kwkwwwwwwkwk",
    "..kwwwwwwwwwwk",
    "...kkkkkkkkkk."
  ];
  SPR.statue = [
    ".kkkkkkkkkkkkkk.",
    "kyyyyyyyyyyyyyyk",
    "kyykkkkkkkkkkyyk",
    "kyyknnnnnnnnkyyk",
    "kyyknwnnnnwnkyyk",
    "kyyknwnnnnwnkyyk",
    "kyyknnnnnnnnkyyk",
    "kyyknnwwwwnnkyyk",
    "kyyknnnnnnnnkyyk",
    "kyykkkkkkkkkkyyk",
    "kyyyyyyyyyyyyyyk",
    "koooooooooooooook".slice(0, 15) + "k",
    ".kkkkkkkkkkkkkk.",
    "...kSSSSSSSSk...",
    "..kssssssssssk..",
    "..ksswwwwwwssk..",
    "..kssssssssssk..",
    ".kSSSSSSSSSSSSk.",
    ".kkkkkkkkkkkkkk."
  ];
  SPR.torii = (function () {
    const r = [
      "kkk..........................kkk",
      "kkkkkkkkkkkkkkkkkkkkkkkkkkkkkkkk",
      ".kRRRRRRRRRRRRRRRRRRRRRRRRRRRRk.",
      "..kkkkkkkkkkkkkkkkkkkkkkkkkkkk..",
      ".....krrk......kkkk....krrk.....",
      "...kkkkkkkkkkkkkkkkkkkkkkkkkk...",
      "...kRRRRRRRRRRRRRRRRRRRRRRRRk...",
      "...kkkkkkkkkkkkkkkkkkkkkkkkkk..."
    ];
    for (let i = 0; i < 18; i++) { r.push(".....krrk..............krrk....."); }
    r.push("....kkkkkk............kkkkkk....");
    r.push("....kSSSSk............kSSSSk....");
    return r;
  })();
  SPR.pond = (function () {
    const r = ["................................", "................................",
      "........kkkkkkkkkkkkkkkk........",
      ".....kkkssssssssssssssssskkk....".slice(0, 32)];
    r[3] = ".....kkk" + "ssssssssssssssss" + "kkk.....";
    r.push("...kksss" + "llllllllllllllll" + "ssskk...");
    r.push("..ksslll" + "llllllllllllllll" + "lllssk..");
    r.push(".kssllll" + "llllllllllllllll" + "llllssk.");
    r.push(".kslllll" + "llllllllllllllll" + "lllllsk.");
    r.push(".kslllll" + "llllllllllllllll" + "lllllsk.");
    r.push(".kssllll" + "llllllllllllllll" + "llllssk.");
    r.push("..ksslll" + "llllllllllllllll" + "lllssk..");
    r.push("...kksss" + "llllllllllllllll" + "ssskk...");
    r.push(".....kkk" + "ssssssssssssssss" + "kkk.....");
    r.push("........" + "kkkkkkkkkkkkkkkk" + "........");
    return r;
  })();
  SPR.sakura = (function () {
    const g = grid(34, 36);
    rect(g, 15, 20, 4, 15, "B"); rect(g, 16, 20, 1, 15, "b");
    rect(g, 10, 21, 5, 2, "B"); rect(g, 19, 19, 6, 2, "B");
    disc(g, 10, 13, 7, "p"); disc(g, 23, 12, 8, "p"); disc(g, 17, 8, 7, "p"); disc(g, 6, 17, 4, "p"); disc(g, 28, 17, 4, "p");
    disc(g, 15, 7, 3, "P"); disc(g, 23, 9, 3, "P"); disc(g, 9, 11, 2, "P"); disc(g, 27, 14, 1, "P");
    [[12, 15], [20, 6], [25, 15], [7, 14], [18, 12], [29, 18], [14, 3], [22, 17], [5, 18]].forEach(([x, y]) => dot(g, x, y, "w"));
    [[10, 17], [26, 10], [19, 15]].forEach(([x, y]) => dot(g, x, y, "R"));
    rect(g, 12, 34, 10, 1, "G");
    return rows(outline(g));
  })();
  SPR.bonsai = (function () {
    const g = grid(18, 19);
    rect(g, 4, 13, 10, 4, "b"); rect(g, 3, 12, 12, 2, "B"); rect(g, 5, 16, 8, 1, "B");
    rect(g, 8, 7, 2, 6, "B"); rect(g, 7, 9, 2, 2, "B"); rect(g, 10, 6, 2, 2, "B");
    disc(g, 9, 5, 4, "G"); disc(g, 4, 7, 3, "G"); disc(g, 14, 6, 3, "G");
    disc(g, 8, 4, 2, "g"); disc(g, 4, 6, 1, "g"); disc(g, 14, 5, 1, "g");
    return rows(outline(g));
  })();
  SPR.plant = (function () {
    const g = grid(15, 19);
    rect(g, 4, 12, 7, 5, "t"); rect(g, 3, 11, 9, 2, "b");
    disc(g, 7, 6, 4, "G"); disc(g, 3, 8, 3, "g"); disc(g, 11, 8, 3, "g"); disc(g, 7, 3, 2, "g");
    dot(g, 7, 5, "G"); dot(g, 3, 8, "G"); dot(g, 11, 8, "G");
    return rows(outline(g));
  })();
  SPR.desk = [
    "..kkkkk.........",
    "..krrrk...kk....",
    "..kkkkk..kwwk...",
    "kkkkkkkkkkkkkkkk",
    "kttttttttttttttk",
    "kkkkkkkkkkkkkkkk",
    "kbk......kbbbbbk",
    "kbk......kbkkkbk",
    "kbk......kbbybbk",
    "kbk......kkkkkkk",
    "kbk......kbbbbbk",
    "kbk......kbbybbk",
    "kbk......kbbbbbk",
    "kkk......kkkkkkk"
  ];
  SPR.shelf = [
    "kkkkkkkkkkkkkk",
    "kBBBBBBBBBBBBk",
    "kBrdyGrkdpvyBk",
    "kBrdyGrkdpvyBk",
    "kBrdyGrkdpvyBk",
    "kBBBBBBBBBBBBk",
    "kBvvrkyyddGkBk",
    "kBvvrkyyddGkBk",
    "kBvvrkyyddGkBk",
    "kBBBBBBBBBBBBk",
    "kBdGGkrryykdBk",
    "kBdGGkrryykdBk",
    "kBdGGkrryykdBk",
    "kBBBBBBBBBBBBk",
    "kkkkkkkkkkkkkk",
    "kBk........kBk",
    "kkk........kkk"
  ];
  SPR.lamp = [
    "...kkkk...",
    "..kyyyyk..",
    ".kyyyyyyk.",
    "kyyyyyyyyk",
    "kkkkkkkkkk",
    "....kmk...",
    "....kmk...",
    "....kmk...",
    "....kmk...",
    "....kmk...",
    "....kmk...",
    "....kmk...",
    "....kmk...",
    "....kmk...",
    "...kmmmk..",
    "..kkkkkkk."
  ];
  SPR.tea = (function () {
    const g = grid(21, 13);
    rect(g, 1, 10, 19, 2, "b");
    disc(g, 6, 6, 3, "w"); rect(g, 4, 2, 5, 1, "w"); dot(g, 6, 1, "d");
    dot(g, 10, 6, "w"); dot(g, 11, 5, "w"); dot(g, 12, 4, "w");
    dot(g, 2, 5, "w"); dot(g, 2, 6, "w"); dot(g, 2, 7, "w");
    dot(g, 5, 6, "d"); dot(g, 7, 6, "d"); dot(g, 6, 7, "d"); dot(g, 6, 5, "d");
    rect(g, 13, 7, 3, 3, "w"); rect(g, 13, 7, 3, 1, "g");
    rect(g, 17, 7, 3, 3, "w"); rect(g, 17, 7, 3, 1, "g");
    return rows(outline(g));
  })();
  SPR.painting = [
    "kkkkkkkkkkkkkkkk",
    "kbbbbbbbbbbbbbbk",
    "kbllllllllllllbk",
    "kblllllwwllllybk",
    "kbllllwwwwllllbk",
    "kbllldwwwwdlllbk",
    "kbllddddddddllbk",
    "kbldddddddddddbk",
    "kbddddddddddddbk",
    "kbGGGGGGGGGGGGbk",
    "kbbbbbbbbbbbbbbk",
    "kkkkkkkkkkkkkkkk"
  ];
  SPR.clock = (function () {
    const g = grid(14, 14);
    disc(g, 6, 6, 6, "b"); disc(g, 6, 6, 5, "c");
    [[6, 2], [10, 6], [6, 10], [2, 6]].forEach(([x, y]) => dot(g, x, y, "k"));
    return rows(outline(g));
  })();
  SPR.tv = [
    "..k.....k.....",
    "...k...k......",
    "....k.k.......",
    "kkkkkkkkkkkkkk",
    "kBkkkkkkkkBBBk",
    "kBkllllllkBoBk",
    "kBklwllllkBBBk",
    "kBkllllllkBoBk",
    "kBkllllllkBBBk",
    "kBkkkkkkkkBBBk",
    "kBBBBBBBBBBBBk",
    "kkkkkkkkkkkkkk",
    ".kk........kk."
  ];
  SPR.cat = [
    "..k..k..........",
    ".khkkhk.........",
    ".khhhhhkkkkkkk..",
    "khkhhkhhhhhhhhk.",
    "khhhphhhhhhhhhhk",
    "khhhhhhhhhhhhhhk",
    ".khhhhhhhhhhhkhk",
    "..kkkkkkkkkkkhhk",
    "............kkk."
  ];
  SPR.kotatsu = (function () {
    const g = grid(32, 17);
    disc(g, 11, 2, 2, "o"); disc(g, 17, 2, 2, "o"); dot(g, 11, 1, "y"); dot(g, 17, 1, "y"); dot(g, 11, 0, "G"); dot(g, 17, 0, "G");
    rect(g, 2, 5, 28, 3, "t"); rect(g, 2, 7, 28, 1, "b");
    rect(g, 1, 8, 30, 8, "p");
    for (let j = 9; j < 16; j += 3) { for (let i = 3 + (j % 2) * 2; i < 30; i += 5) { dot(g, i, j, "P"); dot(g, i + 1, j, "P"); } }
    rect(g, 1, 15, 30, 1, "R");
    return rows(outline(g));
  })();
  SPR.futon = (function () {
    const g = grid(32, 13);
    rect(g, 1, 3, 30, 8, "w"); rect(g, 1, 10, 30, 1, "s");
    rect(g, 2, 2, 7, 4, "c");
    rect(g, 10, 2, 21, 8, "d");
    for (let i = 12; i < 31; i += 4) { rect(g, i, 2, 2, 8, "l"); }
    return rows(outline(g));
  })();
  SPR.rug = (function () {
    const g = grid(32, 10);
    rect(g, 1, 1, 30, 8, "R"); rect(g, 3, 2, 26, 6, "r");
    for (let i = 5; i < 28; i += 6) { dot(g, i, 4, "y"); dot(g, i + 1, 5, "y"); dot(g, i - 1, 5, "y"); dot(g, i, 6, "y"); }
    for (let j = 1; j < 9; j += 2) { dot(g, 0, j, "c"); dot(g, 31, j, "c"); }
    return rows(g);
  })();

  // ---- đồ hiếm (rương nhiệm vụ) ----
  SPR.koinobori = (function () {
    const g = grid(19, 33);
    rect(g, 1, 2, 2, 29, "m"); disc(g, 2, 1, 1, "y");
    rect(g, 3, 4, 12, 5, "r"); rect(g, 15, 5, 2, 3, "r"); dot(g, 17, 4, "r"); dot(g, 17, 8, "r");
    for (let x = 7; x < 15; x += 3) { dot(g, x, 5, "R"); dot(g, x + 1, 7, "R"); }
    dot(g, 5, 5, "w"); dot(g, 5, 6, "k");
    rect(g, 3, 11, 10, 4, "d"); rect(g, 13, 12, 2, 2, "d"); dot(g, 15, 11, "d"); dot(g, 15, 14, "d");
    for (let x = 7; x < 13; x += 3) { dot(g, x, 12, "l"); }
    dot(g, 5, 12, "w"); dot(g, 5, 13, "k");
    rect(g, 0, 31, 4, 1, "S");
    return rows(outline(g));
  })();
  SPR.momiji = SPR.sakura.map((r) => r.replace(/p/g, "r").replace(/P/g, "o").replace(/w/g, "y"));
  SPR.tanuki = (function () {
    const g = grid(17, 20);
    disc(g, 8, 14, 5, "b"); disc(g, 8, 14, 3, "c");
    disc(g, 8, 8, 4, "b"); rect(g, 5, 8, 7, 2, "B"); dot(g, 6, 8, "w"); dot(g, 10, 8, "w"); dot(g, 8, 10, "k");
    rect(g, 3, 4, 11, 2, "t"); disc(g, 8, 3, 2, "t");
    rect(g, 14, 11, 2, 5, "s"); dot(g, 14, 10, "S"); dot(g, 15, 13, "R");
    rect(g, 4, 19, 3, 1, "B"); rect(g, 10, 19, 3, 1, "B");
    return rows(outline(g));
  })();
  SPR.daruma = (function () {
    const g = grid(15, 16);
    disc(g, 7, 8, 6, "r"); disc(g, 7, 7, 3, "w");
    dot(g, 6, 6, "k"); dot(g, 8, 6, "w"); dot(g, 8, 6, "k");
    rect(g, 5, 9, 5, 1, "k"); rect(g, 4, 12, 7, 1, "y"); dot(g, 7, 13, "y");
    return rows(outline(g));
  })();
  SPR.kokeshi = (function () {
    const g = grid(10, 19);
    disc(g, 4, 4, 3, "n"); rect(g, 2, 4, 5, 3, "c"); dot(g, 3, 5, "k"); dot(g, 5, 5, "k"); dot(g, 4, 6, "p");
    rect(g, 2, 8, 5, 9, "r"); for (let y = 9; y < 17; y += 3) { dot(g, 3, y, "y"); dot(g, 5, y + 1, "w"); }
    rect(g, 1, 17, 7, 1, "B");
    return rows(outline(g));
  })();
  SPR.furin = (function () {
    const g = grid(11, 17);
    rect(g, 5, 0, 1, 2, "m");
    disc(g, 5, 5, 3, "l"); rect(g, 2, 7, 7, 1, "l"); dot(g, 4, 4, "w"); dot(g, 3, 6, "d"); dot(g, 7, 6, "d");
    rect(g, 5, 8, 1, 2, "k");
    rect(g, 4, 10, 3, 6, "p"); dot(g, 5, 12, "w"); dot(g, 5, 14, "w");
    return rows(outline(g));
  })();

  // ---------------------------------------------------------------------
  // Vẽ
  // ---------------------------------------------------------------------

  // ---- đồ của các vùng mới ----
  SPR.crab = (function () {
    const g = grid(14, 10);
    rect(g, 3, 5, 8, 3, "r"); rect(g, 4, 4, 6, 1, "r"); rect(g, 4, 8, 6, 1, "R");
    dot(g, 5, 3, "r"); dot(g, 8, 3, "r"); dot(g, 5, 2, "w"); dot(g, 8, 2, "w");
    rect(g, 1, 3, 2, 2, "r"); dot(g, 1, 2, "r"); rect(g, 11, 3, 2, 2, "r"); dot(g, 12, 2, "r");
    dot(g, 2, 5, "r"); dot(g, 11, 5, "r"); dot(g, 6, 6, "R"); dot(g, 7, 6, "R");
    dot(g, 2, 7, "R"); dot(g, 11, 7, "R"); dot(g, 3, 8, "R"); dot(g, 10, 8, "R");
    return rows(outline(g));
  })();
  SPR.swimring = (function () {
    const g = grid(16, 15);
    disc(g, 7.5, 7, 6, "r"); disc(g, 7.5, 7, 2.4, ".");
    for (let j = 0; j < 15; j++) {
      for (let i = 0; i < 16; i++) {
        if (g[j][i] === "r" && Math.floor((Math.atan2(j - 7, i - 7.5) + Math.PI) / (Math.PI / 3)) % 2) { g[j][i] = "w"; }
      }
    }
    return rows(outline(g));
  })();
  SPR.parasol = (function () {
    const g = grid(20, 30);
    for (let j = 2; j <= 9; j++) {
      const half = Math.min(9, Math.round((j - 1) * 1.2) + 1);
      for (let i = 10 - half; i < 10 + half; i++) { g[j][i] = Math.floor((i + 30) / 3) % 2 ? "r" : "w"; }
    }
    for (let i = 1; i < 19; i += 2) { dot(g, i, 10, Math.floor((i + 30) / 3) % 2 ? "r" : "w"); }
    rect(g, 9, 1, 2, 1, "S");
    rect(g, 9, 10, 2, 17, "s"); for (let j = 11; j < 27; j += 3) { dot(g, 10, j, "S"); }
    rect(g, 6, 26, 8, 2, "h"); rect(g, 7, 25, 6, 1, "h");
    return rows(outline(g));
  })();
  SPR.sandcastle = (function () {
    const g = grid(20, 18);
    rect(g, 2, 10, 16, 6, "h"); rect(g, 2, 5, 4, 6, "h"); rect(g, 14, 5, 4, 6, "h"); rect(g, 7, 7, 6, 4, "h");
    [[2, 4], [4, 4], [14, 4], [16, 4], [7, 6], [9, 6], [11, 6]].forEach(([x, y]) => dot(g, x, y, "h"));
    rect(g, 9, 12, 2, 4, "B");
    for (let i = 3; i < 17; i += 3) { dot(g, i, 14, "t"); dot(g, i + 1, 11, "t"); }
    dot(g, 3, 7, "t"); dot(g, 16, 8, "t");
    rect(g, 10, 1, 1, 6, "B"); rect(g, 11, 1, 3, 2, "r");
    rect(g, 1, 16, 18, 1, "t");
    return rows(outline(g));
  })();
  SPR.palm = (function () {
    const g = grid(34, 36);
    for (let j = 12; j <= 34; j++) {
      const x = 15 + Math.round(Math.sin((34 - j) / 9) * 3);
      rect(g, x, j, 3, 1, j % 3 === 0 ? "B" : "b");
    }
    [[-1, 0.15], [-0.75, -0.55], [-0.2, -1], [0.3, -0.95], [0.8, -0.5], [1, 0.2], [-0.95, 0.5], [0.9, 0.55]].forEach(([dx, dy], k) => {
      for (let t = 0; t <= 13; t++) {
        const x = Math.round(16 + dx * t), y = Math.round(11 + dy * t + 0.035 * t * t);
        rect(g, x, y, 2, 2, t > 10 ? "g" : (k % 2 ? "G" : "g"));
        if (t % 3 === 1 && t > 2) { dot(g, x + (dx > 0 ? -1 : 2), y + 2, "G"); }
      }
    });
    [[14, 12], [17, 13], [15, 14]].forEach(([x, y]) => rect(g, x, y, 2, 2, "B"));
    return rows(outline(g));
  })();
  SPR.lighthouse = (function () {
    const g = grid(16, 36);
    for (let j = 12; j <= 32; j++) {
      const half = 3 + Math.floor((j - 12) / 7);
      for (let i = 8 - half; i < 8 + half; i++) { g[j][i] = Math.floor((j - 12) / 4) % 2 ? "w" : "r"; }
    }
    rect(g, 3, 11, 10, 1, "S");
    rect(g, 5, 6, 6, 5, "y"); rect(g, 7, 6, 2, 5, "c"); dot(g, 5, 6, "S"); dot(g, 10, 6, "S");
    for (let j = 2; j <= 5; j++) { const h = j - 1; rect(g, 8 - h - 1, j, (h + 1) * 2, 1, "R"); }
    dot(g, 7, 1, "k"); dot(g, 8, 1, "k");
    rect(g, 7, 28, 2, 5, "B");
    rect(g, 2, 33, 12, 2, "S");
    return rows(outline(g));
  })();
  SPR.ema = (function () {
    const g = grid(20, 20);
    rect(g, 1, 3, 18, 2, "b"); rect(g, 2, 2, 16, 1, "B");
    rect(g, 3, 5, 2, 14, "B"); rect(g, 15, 5, 2, 14, "B");
    rect(g, 5, 8, 10, 1, "b"); rect(g, 5, 13, 10, 1, "b");
    [[5, 9], [8, 9], [11, 9], [6, 14], [9, 14], [12, 14]].forEach(([x, y], k) => {
      rect(g, x, y, 3, 3, "t"); dot(g, x + 1, y + 1, k % 2 ? "r" : "R");
    });
    return rows(outline(g));
  })();
  SPR.saisen = (function () {
    const g = grid(18, 14);
    rect(g, 1, 4, 16, 9, "b");
    for (let i = 2; i < 16; i += 2) { rect(g, i, 4, 1, 3, "B"); }
    rect(g, 1, 7, 16, 1, "B"); rect(g, 3, 9, 12, 3, "t"); rect(g, 6, 10, 6, 1, "B"); rect(g, 1, 12, 16, 1, "B");
    return rows(outline(g));
  })();
  SPR.kitsune = (function () {
    const g = grid(14, 24);
    rect(g, 2, 17, 10, 5, "S"); rect(g, 3, 16, 8, 1, "s"); rect(g, 2, 21, 10, 1, "m");
    rect(g, 4, 9, 6, 7, "w"); rect(g, 3, 12, 8, 4, "w");
    rect(g, 4, 4, 6, 5, "w"); dot(g, 4, 2, "w"); dot(g, 4, 3, "w"); dot(g, 9, 2, "w"); dot(g, 9, 3, "w");
    dot(g, 5, 3, "w"); dot(g, 8, 3, "w"); dot(g, 5, 5, "R"); dot(g, 8, 5, "R"); rect(g, 6, 7, 2, 1, "R");
    rect(g, 4, 9, 6, 2, "r");
    rect(g, 10, 6, 2, 8, "w"); dot(g, 11, 5, "y"); dot(g, 10, 5, "w");
    return rows(outline(g));
  })();
  SPR.temizuya = (function () {
    const g = grid(34, 26);
    for (let j = 2; j <= 7; j++) { const half = 6 + (j - 2) * 2; rect(g, 17 - half, j, half * 2, 1, j === 7 ? "A" : "a"); }
    rect(g, 15, 1, 4, 1, "A");
    rect(g, 5, 8, 2, 14, "B"); rect(g, 27, 8, 2, 14, "B");
    rect(g, 7, 15, 20, 6, "S"); rect(g, 8, 15, 18, 2, "l"); rect(g, 8, 17, 18, 1, "d");
    rect(g, 6, 21, 22, 2, "m");
    for (let i = 10; i < 26; i += 5) { rect(g, i, 12, 1, 3, "b"); dot(g, i - 1, 12, "b"); }
    return rows(outline(g));
  })();
  SPR.cedar = (function () {
    const g = grid(32, 44);
    rect(g, 14, 34, 4, 8, "B"); rect(g, 15, 34, 1, 8, "b");
    for (let k = 0; k < 5; k++) {
      const top = 2 + k * 6, hgt = 10, maxHalf = 5 + k * 2.4;
      for (let j = 0; j < hgt; j++) {
        const half = Math.round(1 + (maxHalf - 1) * j / (hgt - 1));
        for (let i = 16 - half; i < 16 + half; i++) {
          g[top + j][i] = i < 16 - half + 2 ? "j" : (j < 2 || (i + j) % 7 === 0) ? "g" : "G";
        }
      }
    }
    rect(g, 13, 37, 6, 1, "c"); dot(g, 14, 38, "w"); dot(g, 17, 38, "w"); dot(g, 14, 39, "w"); dot(g, 17, 39, "w");
    return rows(outline(g));
  })();
  SPR.komainu = (function () {
    const g = grid(16, 22);
    rect(g, 2, 16, 12, 4, "S"); rect(g, 3, 15, 10, 1, "s"); rect(g, 2, 19, 12, 1, "m");
    rect(g, 4, 9, 8, 6, "m"); rect(g, 3, 11, 2, 4, "m");
    rect(g, 3, 3, 7, 6, "m"); rect(g, 2, 4, 1, 4, "S");
    [[3, 2], [5, 2], [7, 2], [9, 3], [10, 5], [10, 7]].forEach(([x, y]) => dot(g, x, y, "S"));
    dot(g, 4, 5, "k"); rect(g, 3, 7, 3, 1, "R");
    rect(g, 11, 6, 2, 5, "S"); dot(g, 12, 5, "S");
    rect(g, 5, 13, 2, 2, "S"); rect(g, 9, 13, 2, 2, "S");
    return rows(outline(g));
  })();
  SPR.nobori = (function () {
    const g = grid(12, 34);
    rect(g, 2, 1, 1, 32, "b"); rect(g, 2, 2, 8, 1, "b");
    rect(g, 4, 3, 6, 22, "r");
    for (let j = 7; j < 24; j += 6) { rect(g, 4, j, 6, 2, "w"); }
    rect(g, 5, 4, 4, 1, "y"); dot(g, 4, 25, "r"); dot(g, 9, 25, "r");
    rect(g, 1, 32, 4, 1, "B");
    return rows(outline(g));
  })();
  SPR.omen = (function () {
    const g = grid(20, 26);
    rect(g, 2, 4, 2, 21, "B"); rect(g, 16, 4, 2, 21, "B"); rect(g, 1, 3, 18, 2, "b");
    rect(g, 4, 6, 12, 1, "b"); rect(g, 4, 15, 12, 1, "b");
    rect(g, 4, 8, 5, 5, "w"); dot(g, 4, 7, "w"); dot(g, 8, 7, "w"); dot(g, 5, 10, "r"); dot(g, 7, 10, "r"); dot(g, 6, 12, "r");
    rect(g, 11, 8, 5, 5, "r"); dot(g, 11, 7, "y"); dot(g, 15, 7, "y"); dot(g, 12, 10, "y"); dot(g, 14, 10, "y"); rect(g, 12, 12, 3, 1, "w");
    rect(g, 7, 17, 6, 5, "e"); dot(g, 8, 18, "k"); dot(g, 11, 18, "k"); rect(g, 9, 20, 2, 1, "E"); dot(g, 10, 21, "E");
    rect(g, 1, 24, 18, 1, "b");
    return rows(outline(g));
  })();
  SPR.ringoame = (function () {
    const g = grid(20, 26);
    for (let i = 1; i < 19; i++) { rect(g, i, 3, 1, 4, Math.floor(i / 3) % 2 ? "r" : "w"); }
    for (let i = 1; i < 19; i += 2) { dot(g, i, 7, Math.floor(i / 3) % 2 ? "r" : "w"); }
    rect(g, 2, 8, 1, 16, "B"); rect(g, 17, 8, 1, 16, "B");
    rect(g, 4, 13, 12, 2, "w");
    [5, 8, 11, 14].forEach((x) => { rect(g, x, 10, 1, 3, "t"); rect(g, x - 1, 8, 2, 2, "r"); dot(g, x - 1, 8, "w"); });
    rect(g, 1, 15, 18, 2, "b"); rect(g, 2, 17, 16, 6, "r"); rect(g, 2, 22, 16, 1, "w");
    return rows(outline(g));
  })();
  SPR.taiko = (function () {
    const g = grid(20, 23);
    disc(g, 9.5, 8, 7, "R"); disc(g, 9.5, 8, 5.4, "c");
    for (let a = 0; a < 12; a++) {
      dot(g, Math.round(9.5 + Math.cos(a * Math.PI / 6) * 6.2), Math.round(8 + Math.sin(a * Math.PI / 6) * 6.2), "k");
    }
    disc(g, 9.5, 8, 1.6, "R");
    for (let t = 0; t < 6; t++) { dot(g, 5 + t, 15 + t, "B"); dot(g, 14 - t, 15 + t, "B"); }
    return rows(outline(g));
  })();
  SPR.kingyo = (function () {
    const g = grid(34, 14);
    rect(g, 2, 4, 30, 8, "d"); rect(g, 1, 5, 32, 6, "d");
    rect(g, 3, 5, 28, 5, "l"); rect(g, 2, 6, 30, 3, "l");
    rect(g, 3, 9, 28, 1, "u");
    return rows(outline(g));
  })();
  SPR.hanabi = (function () {
    const g = grid(14, 16);
    rect(g, 2, 9, 10, 5, "b"); rect(g, 2, 9, 10, 1, "B"); rect(g, 3, 11, 8, 1, "B");
    rect(g, 3, 3, 2, 6, "r"); rect(g, 6, 2, 2, 7, "d"); rect(g, 9, 4, 2, 5, "y");
    dot(g, 3, 2, "w"); dot(g, 6, 1, "w"); dot(g, 9, 3, "w");
    return rows(outline(g));
  })();


  // =====================================================================
  // 1.7: đồ mới (sân, nội thất, Rừng tre, Suối nước nóng, Ga làng quê)
  // =====================================================================
  const FRAMES = {};   // id -> [khung0, khung1, …] cùng cỡ với SPR[id] (đồ có hoạt hình nhiều khung)
  const BASE = {};     // id -> phần tĩnh khi vẽ trong cảnh (vải, dây, gàu… vẽ động riêng); SPR[id] là hình đầy đủ cho cửa hàng
  // 1.25.9: hình thay thế theo lúc / mùa / thời tiết — id -> {tên khung: hàng} (hươu cúi chào, kappa chớp mắt, đài phun
  // nước đóng băng, lúa vàng mùa thu…). Để chung một chỗ thì Sửa hình / Góp ý hình sửa được (trước đây chỉ có trong mã).
  const ALT = {};
  function withExtra(base, fn) { const g = base.map((r) => r.split("")); fn(g); return rows(g); }
  function gline(g, x0, y0, x1, y1, c) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let t = 0; t <= n; t++) { dot(g, Math.round(x0 + (x1 - x0) * t / n), Math.round(y0 + (y1 - y0) * t / n), c); }
  }
  function ellipseFill(g, cx, cy, rx, ry, c) {
    for (let j = 0; j < g.length; j++) {
      for (let i = 0; i < g[0].length; i++) {
        const dx = (i - cx) / rx, dy = (j - cy) / ry;
        if (dx * dx + dy * dy <= 1.05) { g[j][i] = c; }
      }
    }
  }

  // ---- sân vườn ----
  SPR.sunflower = (function () {
    const g = grid(16, 31);
    rect(g, 7, 13, 2, 17, "G"); rect(g, 7, 13, 1, 17, "g");
    rect(g, 2, 19, 5, 2, "g"); rect(g, 3, 18, 3, 1, "g"); dot(g, 6, 21, "G");
    rect(g, 9, 23, 5, 2, "g"); rect(g, 10, 22, 3, 1, "g"); dot(g, 9, 25, "G");
    for (let j = 0; j < 15; j++) {
      for (let i = 0; i < 16; i++) {
        const dx = i - 7.5, dy = j - 7, d = Math.sqrt(dx * dx + dy * dy);
        if (d <= 6.6) {
          const a = Math.atan2(dy, dx);
          g[j][i] = d > 3.3 ? (Math.floor((a + Math.PI) / (Math.PI / 6)) % 2 ? "y" : "i") : (d > 2.2 ? "B" : "b");
        }
      }
    }
    dot(g, 6, 6, "B"); dot(g, 8, 7, "B"); dot(g, 7, 8, "k");
    rect(g, 6, 29, 4, 1, "B");
    return rows(outline(g));
  })();
  function pinwheel(rot) {
    const g = grid(15, 29);
    rect(g, 7, 9, 1, 18, "b"); rect(g, 6, 27, 3, 1, "B");
    const cx = 7, cy = 7, cols = ["r", "y", "d", "g"], dark = ["R", "o", "u", "G"];
    for (let j = 0; j < 15; j++) {
      for (let i = 0; i < 15; i++) {
        const dx = i - cx, dy = j - cy, r = Math.sqrt(dx * dx + dy * dy);
        if (r < 0.5 || r > 6.3) { continue; }
        let a = Math.atan2(dy, dx) - rot;
        a = ((a % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const k = Math.floor(a / (Math.PI / 2)), f = (a % (Math.PI / 2)) / (Math.PI / 2);
        if (f < 1.04 - r * 0.07) { g[j][i] = f < 0.34 ? dark[k] : cols[k]; }
      }
    }
    dot(g, cx, cy, "w");
    return rows(outline(g));
  }
  FRAMES.kazaguruma = [0, 1, 2, 3, 4, 5, 6, 7].map((k) => pinwheel(-k * Math.PI / 4));
  SPR.kazaguruma = FRAMES.kazaguruma[0];
  SPR.birdhouse = (function () {
    const g = grid(14, 31);
    rect(g, 6, 16, 2, 13, "b"); rect(g, 6, 16, 1, 13, "t");
    rect(g, 4, 29, 6, 1, "B");
    rect(g, 2, 6, 10, 10, "t"); rect(g, 2, 15, 10, 1, "b"); rect(g, 10, 6, 2, 10, "b");
    for (let j = 0; j < 5; j++) { rect(g, 5 - j, 1 + j, 4 + j * 2, 1, j === 4 ? "R" : "r"); }
    disc(g, 6.5, 10, 1.6, "n");
    rect(g, 5, 13, 4, 1, "B");
    return rows(outline(g));
  })();
  SPR.well = (function () {
    const g = grid(16, 30);
    for (let j = 0; j < 4; j++) { rect(g, 5 - j, 1 + j, 6 + j * 2, 1, j === 3 ? "B" : "b"); }
    rect(g, 2, 5, 2, 13, "B"); rect(g, 12, 5, 2, 13, "B"); rect(g, 2, 5, 1, 13, "b");
    rect(g, 4, 7, 8, 1, "t"); rect(g, 7, 6, 2, 3, "B");
    rect(g, 1, 17, 14, 2, "s"); rect(g, 3, 17, 10, 1, "n");
    rect(g, 1, 19, 14, 9, "S");
    for (let y = 19, r = 0; y < 28; y += 3, r++) {
      rect(g, 1, y + 2, 14, 1, "m");
      for (let x = 2 + (r % 2) * 2; x < 15; x += 4) { dot(g, x, y, "s"); dot(g, x + 1, y, "s"); dot(g, x - 1, y + 1, "m"); }
    }
    return rows(outline(g));
  })();
  BASE.well = SPR.well;
  SPR.well = withExtra(BASE.well, (g) => {
    for (let y = 8; y < 12; y++) { g[y][8] = "S"; }
    rect(g, 6, 12, 5, 4, "k"); rect(g, 7, 12, 3, 3, "b"); rect(g, 7, 13, 3, 1, "B");
  });
  SPR.swing = (function () {
    const g = grid(32, 34);
    rect(g, 2, 2, 28, 2, "b"); rect(g, 2, 2, 28, 1, "t"); rect(g, 1, 2, 1, 2, "B"); rect(g, 30, 2, 1, 2, "B");
    for (let j = 4; j < 32; j++) {
      const t = (j - 4) / 27, o = Math.round(t * 2.6);
      dot(g, 3 - o, j, "B"); dot(g, 4 - o, j, "b"); dot(g, 4 + o, j, "B"); dot(g, 5 + o, j, "b");
      dot(g, 27 - o, j, "B"); dot(g, 28 - o, j, "b"); dot(g, 27 + o, j, "B"); dot(g, 28 + o, j, "b");
    }
    rect(g, 1, 32, 8, 1, "B"); rect(g, 23, 32, 8, 1, "B");
    rect(g, 2, 18, 6, 1, "b"); rect(g, 24, 18, 6, 1, "b");
    return rows(outline(g));
  })();
  BASE.swing = SPR.swing;
  SPR.swing = withExtra(BASE.swing, (g) => {
    for (let y = 4; y < 24; y++) { g[y][10] = "S"; g[y][21] = "S"; }
    rect(g, 8, 23, 16, 4, "k"); rect(g, 9, 24, 14, 2, "b"); rect(g, 9, 24, 14, 1, "t");
  });
  function fountainSprite(frozen) {
    const g = grid(32, 27);
    for (let j = 17; j <= 25; j++) {
      const half = 14 - Math.max(0, j - 22);
      rect(g, 16 - half, j, half * 2, 1, j === 17 ? "s" : (j >= 24 ? "m" : "S"));
    }
    rect(g, 4, 18, 24, 2, frozen ? "w" : "l"); rect(g, 6, 18, 20, 1, frozen ? "s" : "d");
    for (let x = 5; x < 28; x += 5) { rect(g, x, 21, 1, 3, "s"); }
    rect(g, 14, 9, 4, 9, "s"); rect(g, 16, 9, 2, 9, "S");
    rect(g, 9, 7, 14, 2, "s"); rect(g, 10, 9, 12, 1, "S"); rect(g, 10, 7, 12, 1, frozen ? "w" : "l");
    rect(g, 15, 3, 2, 4, "s"); dot(g, 15, 2, "w"); dot(g, 16, 2, "s");
    return rows(outline(g));
  }
  SPR.fountain = fountainSprite(false);
  ALT.fountain = { bang: fountainSprite(true) };

  // ---- trong nhà ----
  SPR.ikebana = (function () {
    const g = grid(14, 21);
    rect(g, 4, 14, 7, 5, "n"); rect(g, 3, 13, 9, 2, "u"); rect(g, 5, 19, 5, 1, "U"); dot(g, 5, 15, "u");
    gline(g, 7, 12, 3, 3, "B"); gline(g, 7, 12, 11, 6, "B"); gline(g, 7, 12, 7, 8, "B");
    disc(g, 3, 3, 1.7, "p"); dot(g, 3, 3, "y");
    disc(g, 11, 6, 1.5, "r"); dot(g, 11, 6, "y");
    disc(g, 7, 7, 1.2, "P"); dot(g, 7, 7, "y");
    rect(g, 8, 9, 3, 1, "g"); rect(g, 4, 8, 2, 1, "g"); dot(g, 9, 11, "G"); dot(g, 5, 10, "G");
    return rows(outline(g));
  })();
  SPR.andon = (function () {
    const g = grid(12, 25);
    rect(g, 1, 2, 10, 2, "B"); rect(g, 2, 1, 8, 1, "B");
    rect(g, 2, 4, 8, 15, "c");
    rect(g, 2, 4, 1, 15, "B"); rect(g, 9, 4, 1, 15, "B"); rect(g, 2, 11, 8, 1, "b"); rect(g, 5, 4, 2, 15, "h");
    rect(g, 1, 19, 10, 2, "B"); rect(g, 2, 21, 1, 3, "B"); rect(g, 9, 21, 1, 3, "B");
    return rows(outline(g));
  })();
  SPR.radio = (function () {
    const g = grid(17, 16);
    for (let t = 0; t < 4; t++) { dot(g, 11 + t, 4 - t, "S"); }
    rect(g, 1, 5, 15, 9, "b"); rect(g, 1, 5, 15, 1, "t"); rect(g, 1, 13, 15, 1, "B");
    rect(g, 2, 7, 7, 5, "B"); for (let y = 8; y < 12; y += 2) { rect(g, 3, y, 5, 1, "h"); }
    rect(g, 10, 7, 5, 2, "c"); dot(g, 12, 7, "r");
    dot(g, 11, 10, "c"); dot(g, 14, 10, "c"); dot(g, 11, 11, "t"); dot(g, 14, 11, "t");
    rect(g, 2, 14, 2, 1, "B"); rect(g, 13, 14, 2, 1, "B");
    return rows(outline(g));
  })();
  SPR.aquarium = (function () {
    const g = grid(16, 20);
    rect(g, 1, 1, 14, 1, "m");
    rect(g, 1, 2, 14, 9, "l"); rect(g, 1, 2, 14, 2, "w"); rect(g, 2, 2, 12, 1, "l");
    rect(g, 1, 9, 14, 2, "h"); dot(g, 4, 9, "t"); dot(g, 11, 10, "t");
    rect(g, 3, 5, 1, 4, "g"); rect(g, 4, 4, 1, 5, "G"); rect(g, 12, 6, 1, 3, "g"); dot(g, 13, 7, "G");
    dot(g, 9, 8, "S"); dot(g, 10, 8, "s"); dot(g, 2, 3, "w"); dot(g, 2, 4, "w");
    rect(g, 1, 11, 14, 1, "S");
    rect(g, 2, 12, 12, 7, "B"); rect(g, 3, 13, 4, 5, "b"); rect(g, 9, 13, 4, 5, "b"); dot(g, 6, 15, "y"); dot(g, 9, 15, "y");
    return rows(outline(g));
  })();
  SPR.irori = (function () {
    const g = grid(32, 23);
    rect(g, 15, 1, 2, 8, "t"); rect(g, 15, 1, 1, 8, "h");
    rect(g, 12, 3, 8, 3, "b"); dot(g, 13, 4, "k"); rect(g, 19, 3, 2, 3, "B");
    rect(g, 15, 8, 2, 1, "S");
    rect(g, 11, 10, 10, 5, "n"); rect(g, 12, 9, 8, 1, "n"); rect(g, 12, 15, 8, 1, "n"); rect(g, 12, 11, 2, 2, "S");
    rect(g, 21, 11, 3, 1, "n"); dot(g, 24, 10, "n");
    rect(g, 1, 17, 30, 1, "t"); rect(g, 1, 18, 30, 3, "B"); rect(g, 1, 21, 30, 1, "b");
    rect(g, 3, 16, 26, 2, "m"); rect(g, 3, 16, 26, 1, "S");
    [6, 10, 22, 25].forEach((x) => { dot(g, x, 16, "k"); dot(g, x + 1, 16, "n"); });
    return rows(outline(g));
  })();
  SPR.calendar = (function () {
    const g = grid(14, 19);
    rect(g, 1, 2, 12, 15, "w"); rect(g, 1, 2, 12, 4, "r"); rect(g, 1, 5, 12, 1, "R");
    dot(g, 4, 1, "S"); dot(g, 9, 1, "S"); dot(g, 4, 2, "k"); dot(g, 9, 2, "k");
    rect(g, 2, 17, 11, 1, "s");
    return rows(outline(g));
  })();
  SPR.kakejiku = (function () {
    const g = grid(13, 30);
    rect(g, 5, 1, 3, 1, "B");
    rect(g, 1, 2, 11, 2, "B"); rect(g, 1, 2, 11, 1, "b");
    rect(g, 2, 4, 9, 21, "u"); rect(g, 3, 6, 7, 17, "c");
    const ch = [".k.k.k.", "..k.k..", "kkkkkkk", "k.....k", ".kkkkk.", "....k..", "kkkkkkk", "...k...", ".kkk..."];
    ch.forEach((r, j) => { for (let i = 0; i < 7; i++) { if (r[i] === "k") { dot(g, 3 + i, 8 + j, "k"); } } });
    rect(g, 7, 19, 2, 2, "r");
    rect(g, 1, 25, 11, 2, "B"); rect(g, 0, 25, 1, 2, "t"); rect(g, 12, 25, 1, 2, "t");
    return rows(outline(g));
  })();
  SPR.ukiyoe = (function () {
    const g = grid(32, 18);
    rect(g, 1, 1, 30, 16, "B"); rect(g, 2, 2, 28, 14, "c");
    for (let j = 0; j < 5; j++) { rect(g, 20 - j, 8 + j, 1 + j * 2, 1, j < 2 ? "w" : "u"); }
    for (let x = 2; x < 30; x++) {
      const top = x < 15 ? Math.round(13 - 8 * Math.sin(Math.PI * (x - 2) / 13)) : Math.round(12 + Math.sin(x / 2));
      for (let y = Math.max(2, top); y < 16; y++) { g[y][x] = y === top ? "w" : ((y + x) % 4 === 0 ? "d" : "u"); }
    }
    [[9, 4], [11, 4], [12, 5], [13, 6], [7, 5]].forEach(([x, y]) => dot(g, x, y, "w"));
    rect(g, 22, 14, 6, 1, "b"); dot(g, 23, 13, "b");
    return rows(outline(g));
  })();

  // ---- Rừng tre ----
  SPR.bamboofence = (function () {
    const g = grid(16, 17);
    [1, 4, 7, 10, 13].forEach((x, k) => {
      const top = 3 + (k % 2) * 2;
      rect(g, x, top, 2, 16 - top, "g"); rect(g, x, top, 1, 16 - top, "f"); dot(g, x, top, "G"); dot(g, x + 1, top, "G");
      for (let y = top + 4; y < 16; y += 4) { rect(g, x, y, 2, 1, "G"); }
    });
    rect(g, 1, 8, 14, 1, "G"); rect(g, 1, 12, 14, 1, "G");
    [2, 8, 14].forEach((x) => { dot(g, x, 8, "B"); dot(g, x, 12, "B"); });
    return rows(outline(g));
  })();
  SPR.takenoko = (function () {
    const g = grid(12, 15);
    for (let j = 0; j < 11; j++) {
      const half = Math.max(1, Math.round(0.6 + j * 0.45));
      for (let i = 6 - half; i < 6 + half; i++) { g[1 + j][i] = j < 2 ? "f" : ((i + j) % 4 === 0 ? "B" : ((i - j + 20) % 5 === 0 ? "h" : "b")); }
    }
    rect(g, 1, 12, 10, 2, "B"); rect(g, 2, 12, 8, 1, "b");
    return rows(outline(g));
  })();
  SPR.hotaru = (function () {
    const g = grid(11, 15);
    rect(g, 3, 1, 5, 2, "b"); rect(g, 3, 1, 5, 1, "t");
    rect(g, 2, 3, 7, 10, "l"); rect(g, 3, 4, 1, 7, "w");
    rect(g, 2, 12, 7, 1, "m");
    dot(g, 5, 6, "y"); dot(g, 7, 9, "y"); dot(g, 5, 10, "y");
    return rows(outline(g));
  })();
  function shishi(tipped) {
    const g = grid(18, 19);
    rect(g, 1, 4, 2, 13, "b"); rect(g, 1, 4, 1, 13, "t");
    rect(g, 3, 4, 4, 2, "g"); rect(g, 3, 4, 4, 1, "f"); dot(g, 6, 5, "G");
    rect(g, 1, 14, 8, 3, "S"); rect(g, 2, 14, 6, 1, "l"); rect(g, 1, 16, 8, 1, "m");
    disc(g, 14, 15, 1.8, "m"); dot(g, 13, 14, "s");
    rect(g, 9, 10, 1, 7, "B"); rect(g, 8, 16, 3, 1, "B");
    const a = tipped ? -0.62 : 0.42, cx = 9.5, cy = 9;
    for (let t = -6; t <= 6; t++) {
      const x = Math.round(cx + t * Math.cos(a)), y = Math.round(cy - t * Math.sin(a));
      dot(g, x, y, t === -6 ? "G" : (t === 0 ? "G" : "g")); dot(g, x, y + 1, t === -6 ? "j" : "G");
    }
    return rows(outline(g));
  }
  FRAMES.shishiodoshi = [shishi(false), shishi(true)];
  SPR.shishiodoshi = FRAMES.shishiodoshi[0];
  SPR.sasa = (function () {
    const g = grid(18, 40);
    rect(g, 8, 2, 2, 37, "g"); rect(g, 8, 2, 1, 37, "f");
    for (let y = 7; y < 38; y += 6) { rect(g, 8, y, 2, 1, "G"); }
    [[8, 4, -1], [10, 8, 1], [8, 13, -1], [10, 17, 1], [8, 23, -1], [10, 27, 1]].forEach(([x, y, d]) => {
      for (let t = 0; t < 6; t++) { dot(g, x + d * t, y - Math.round(t * 0.5), "G"); }
      rect(g, d > 0 ? x + 3 : x - 6, y - 4, 4, 1, "g"); rect(g, d > 0 ? x + 4 : x - 7, y - 2, 3, 1, "g");
      dot(g, x + d * 6, y - 3, "g");
    });
    [[3, 9, "r"], [14, 12, "y"], [4, 18, "d"], [14, 21, "p"], [3, 27, "v"], [13, 30, "r"]].forEach(([x, y, c]) => {
      rect(g, x, y, 2, 5, c); dot(g, x, y - 1, "s");
    });
    rect(g, 6, 38, 6, 1, "B");
    return rows(outline(g));
  })();
  SPR.panda = (function () {
    const g = grid(17, 18);
    disc(g, 8, 12, 5, "w"); rect(g, 3, 9, 11, 3, "k");
    rect(g, 3, 14, 3, 3, "k"); rect(g, 11, 14, 3, 3, "k");
    disc(g, 8, 6, 4.2, "w");
    disc(g, 4.5, 2.6, 1.4, "k"); disc(g, 11.5, 2.6, 1.4, "k");
    rect(g, 5, 5, 2, 2, "k"); rect(g, 10, 5, 2, 2, "k"); dot(g, 6, 5, "w"); dot(g, 10, 5, "w");
    dot(g, 8, 7, "k"); dot(g, 8, 8, "p");
    rect(g, 13, 3, 1, 9, "g"); dot(g, 14, 3, "G"); dot(g, 14, 4, "g"); dot(g, 12, 2, "g"); dot(g, 13, 7, "G");
    return rows(outline(g));
  })();

  // ---- Suối nước nóng ----
  SPR.oke = (function () {
    const g = grid(15, 14);
    const bucket = (x, y) => { rect(g, x, y, 6, 5, "t"); rect(g, x, y, 6, 1, "h"); rect(g, x, y + 1, 6, 1, "B"); rect(g, x, y + 3, 6, 1, "B"); };
    bucket(1, 8); bucket(8, 8);
    rect(g, 3, 4, 9, 4, "y"); rect(g, 2, 4, 11, 1, "i"); rect(g, 5, 5, 5, 1, "r"); dot(g, 4, 7, "i"); dot(g, 10, 7, "i");
    return rows(outline(g));
  })();
  SPR.yukidaruma = (function () {
    const g = grid(15, 22);
    disc(g, 7, 15.5, 5.3, "w"); disc(g, 7, 7.5, 4, "w");
    [[10, 18], [11, 16], [9, 19], [10, 10], [9, 11]].forEach(([x, y]) => dot(g, x, y, "s"));
    rect(g, 4, 2, 7, 3, "R"); rect(g, 5, 1, 5, 1, "R"); rect(g, 4, 2, 7, 1, "r");
    dot(g, 5, 7, "k"); dot(g, 9, 7, "k"); dot(g, 7, 9, "o"); dot(g, 4, 8, "P"); dot(g, 10, 8, "P");
    rect(g, 3, 11, 9, 2, "r"); rect(g, 9, 12, 2, 3, "R");
    gline(g, 2, 14, 0, 11, "B"); gline(g, 12, 14, 14, 12, "B");
    dot(g, 7, 15, "k"); dot(g, 7, 17, "k");
    return rows(outline(g));
  })();
  BASE.noren = (function () {
    const g = grid(16, 28);
    rect(g, 1, 1, 14, 2, "B"); rect(g, 1, 1, 14, 1, "b");
    rect(g, 1, 3, 1, 23, "B"); rect(g, 14, 3, 1, 23, "B");
    rect(g, 0, 26, 3, 1, "S"); rect(g, 13, 26, 3, 1, "S");
    return rows(outline(g));
  })();
  const NOREN_CLOTH = (function () {   // phần vải (vẽ riêng để bay theo gió)
    const g = grid(12, 15);
    rect(g, 0, 0, 12, 14, "U"); rect(g, 5, 6, 2, 8, ".");
    const mark = [".w.w.w.", "w.w.w..", ".w.w.w.", "w.....w", "w.....w", ".wwwww."];
    mark.forEach((r, j) => { for (let i = 0; i < 7; i++) { if (r[i] === "w") { dot(g, 2 + i, 2 + j, "w"); } } });
    return rows(g);
  })();
  function compose(base, top, dx, dy) {   // chồng một lớp lên sprite (giữ cỡ của base)
    const out = base.map((r) => r.split(""));
    top.forEach((r, j) => { for (let i = 0; i < r.length; i++) { if (r[i] !== "." && out[j + dy] && out[j + dy][i + dx] !== undefined) { out[j + dy][i + dx] = r[i]; } } });
    return out.map((r) => r.join(""));
  }
  const NOREN_CLOTH_OL = rows(outline(NOREN_CLOTH.map((r) => r.split(""))));
  SPR.noren = compose(BASE.noren, NOREN_CLOTH_OL, 2, 3);
  SPR.milk = (function () {
    const g = grid(15, 31);
    rect(g, 1, 1, 13, 29, "w"); rect(g, 1, 1, 13, 4, "d"); rect(g, 3, 2, 9, 2, "w"); rect(g, 4, 2, 7, 1, "r");
    rect(g, 2, 6, 11, 11, "l");
    [3, 6, 9].forEach((x) => { rect(g, x, 8, 2, 3, "w"); dot(g, x, 7, "r"); dot(g, x + 1, 7, "r"); rect(g, x, 13, 2, 3, "h"); dot(g, x, 12, "y"); dot(g, x + 1, 12, "y"); });
    [3, 6, 9].forEach((x) => dot(g, x + 1, 18, "y"));
    rect(g, 10, 20, 2, 3, "S"); rect(g, 3, 24, 9, 3, "n"); rect(g, 13, 1, 1, 29, "s");
    rect(g, 2, 29, 11, 1, "S");
    return rows(outline(g));
  })();
  SPR.monkey = (function () {
    const g = grid(16, 18);
    disc(g, 8, 12.5, 4.8, "t"); rect(g, 4, 11, 2, 4, "b"); rect(g, 11, 11, 2, 4, "b");
    disc(g, 8, 6.5, 4, "t");
    rect(g, 6, 6, 5, 4, "p"); rect(g, 7, 5, 3, 1, "p");
    dot(g, 7, 7, "k"); dot(g, 9, 7, "k"); dot(g, 8, 9, "R");
    rect(g, 4, 2, 9, 2, "w"); rect(g, 5, 1, 7, 1, "w"); rect(g, 4, 3, 9, 1, "s");
    rect(g, 2, 16, 13, 1, "S");
    return rows(outline(g));
  })();
  SPR.rotenburo = (function () {
    const g = grid(32, 16);
    ellipseFill(g, 16, 7, 14, 4.5, "S");
    ellipseFill(g, 16, 7, 11.5, 2.6, "a"); rect(g, 6, 6, 20, 1, "l"); rect(g, 9, 5, 14, 1, "l");
    for (let x = 2; x < 30; x += 4) { disc(g, x + 1, 11 + (x % 3), 2.2, (x % 8 === 2) ? "m" : "S"); dot(g, x, 10 + (x % 3), "s"); }
    for (let x = 4; x < 28; x += 5) { dot(g, x, 3 - (x % 2), "S"); }
    rect(g, 26, 2, 4, 3, "t"); rect(g, 26, 2, 4, 1, "B");
    return rows(outline(g));
  })();

  // ---- Ga làng quê ----
  SPR.busstop = (function () {
    const g = grid(13, 32);
    rect(g, 6, 9, 2, 20, "s"); rect(g, 7, 9, 1, 20, "S");
    disc(g, 6.5, 5, 4.4, "r"); disc(g, 6.5, 5, 3, "w"); rect(g, 4, 4, 6, 1, "d"); rect(g, 5, 6, 4, 1, "d");
    rect(g, 3, 13, 8, 7, "w"); rect(g, 3, 13, 8, 1, "d"); [15, 17].forEach((y) => rect(g, 4, y, 6, 1, "S"));
    rect(g, 3, 29, 8, 2, "S"); rect(g, 3, 29, 8, 1, "m");
    return rows(outline(g));
  })();
  function bike(rot) {
    const g = grid(17, 13);
    const wheel = (cx, cy) => {
      for (let j = 0; j < 13; j++) { for (let i = 0; i < 17; i++) { const d = Math.hypot(i - cx, j - cy); if (d <= 3.6 && d > 2.5) { g[j][i] = "n"; } } }
      for (let k = 0; k < 4; k++) { const a = rot + k * Math.PI / 2; dot(g, Math.round(cx + Math.cos(a) * 1.6), Math.round(cy + Math.sin(a) * 1.6), "s"); }
      dot(g, cx, cy, "S");
    };
    wheel(4, 8); wheel(12, 8);
    gline(g, 4, 8, 7, 5, "r"); gline(g, 7, 5, 11, 5, "r"); gline(g, 7, 5, 8, 8, "r"); gline(g, 8, 8, 4, 8, "r"); gline(g, 11, 4, 12, 8, "r");
    rect(g, 5, 3, 3, 1, "k"); dot(g, 6, 4, "S");
    rect(g, 10, 3, 3, 1, "S");
    rect(g, 13, 3, 3, 3, "b"); dot(g, 14, 4, "t");
    return rows(outline(g));
  }
  FRAMES.bicycle = [0, 1].map((k) => bike(k * Math.PI / 4));
  SPR.bicycle = FRAMES.bicycle[0];
  SPR.jizo = (function () {
    const g = grid(13, 21);
    disc(g, 6, 5.5, 3.3, "s");
    rect(g, 3, 1, 7, 3, "R"); rect(g, 3, 3, 7, 1, "r"); dot(g, 6, 1, "r");
    rect(g, 5, 5, 1, 1, "S"); rect(g, 7, 5, 1, 1, "S"); dot(g, 6, 7, "S");
    rect(g, 3, 9, 7, 8, "s"); rect(g, 9, 9, 1, 8, "S");
    rect(g, 3, 9, 7, 3, "r"); rect(g, 4, 12, 5, 1, "r"); dot(g, 6, 13, "r"); rect(g, 3, 9, 7, 1, "R");
    dot(g, 6, 14, "S");
    rect(g, 2, 17, 9, 3, "S"); rect(g, 2, 17, 9, 1, "m"); dot(g, 10, 16, "y"); dot(g, 2, 16, "o");
    return rows(outline(g));
  })();
  SPR.vending = (function () {
    const g = grid(15, 31);
    rect(g, 1, 1, 13, 29, "r"); rect(g, 13, 1, 1, 29, "R");
    rect(g, 2, 3, 10, 12, "c");
    const cans = ["d", "y", "g", "o", "u"];
    [4, 9].forEach((y, r) => { [3, 5, 7, 9, 11].forEach((x, k) => { rect(g, x - (x === 11 ? 1 : 0), y, 1, 3, cans[(k + r * 2) % 5]); }); });
    [8, 13].forEach((y) => { for (let x = 3; x < 12; x += 2) { dot(g, x, y, "S"); } });
    rect(g, 2, 16, 10, 6, "R"); dot(g, 10, 17, "S"); rect(g, 3, 17, 4, 1, "a");
    rect(g, 3, 24, 9, 3, "n"); rect(g, 1, 29, 13, 1, "n");
    return rows(outline(g));
  })();
  function riceSprite(gold) {
    const g = grid(32, 15);
    rect(g, 1, 9, 30, 4, "u"); rect(g, 1, 9, 30, 1, "l"); rect(g, 1, 13, 30, 1, "B");
    for (let x = 3; x < 30; x += 4) {
      const top = 2 + (x % 3);
      for (let j = top; j < 11; j++) { dot(g, x, j, gold ? "i" : "g"); }
      gline(g, x, 10, x - 2, top + 2, gold ? "y" : "G"); gline(g, x, 10, x + 2, top + 1, gold ? "i" : "f");
      if (gold) { dot(g, x + 1, top, "y"); dot(g, x + 2, top + 1, "y"); dot(g, x - 1, top + 1, "o"); }
    }
    return rows(outline(g));
  }
  SPR.rice = riceSprite(false);
  ALT.rice = { vang: riceSprite(true) };
  function crossing(on) {
    const g = grid(15, 35);
    for (let y = 15; y < 32; y++) { dot(g, 7, y, Math.floor(y / 3) % 2 ? "k" : "w"); dot(g, 8, y, Math.floor(y / 3) % 2 ? "n" : "s"); }
    for (let t = 0; t <= 12; t++) {
      const y = 1 + Math.round(t * 0.62), c = Math.floor(t / 2) % 2 ? "k" : "y";
      dot(g, 1 + t, y, c); dot(g, 13 - t, y, c);
    }
    rect(g, 7, 9, 2, 3, "S");
    rect(g, 1, 11, 13, 1, "n");
    disc(g, 3.5, 13.5, 1.9, on === 1 ? "r" : "R"); disc(g, 10.5, 13.5, 1.9, on === 2 ? "r" : "R");
    if (on === 1) { dot(g, 3, 13, "P"); } if (on === 2) { dot(g, 10, 13, "P"); }
    rect(g, 5, 32, 5, 2, "S");
    return rows(outline(g));
  }
  FRAMES.fumikiri = [crossing(0), crossing(1), crossing(2)];
  SPR.fumikiri = FRAMES.fumikiri[0];

  function sprite(ctx, rowsArr, x, y, S, pal, alpha) {
    pal = pal || P;
    if (alpha !== undefined) { ctx.globalAlpha = alpha; }
    for (let j = 0; j < rowsArr.length; j++) {
      const r = rowsArr[j];
      for (let i = 0; i < r.length; i++) {
        const c = r.charAt(i);
        if (c !== ".") { ctx.fillStyle = pal[c] || c; ctx.fillRect(Math.round((x + i) * S), Math.round((y + j) * S), S, S); }
      }
    }
    ctx.globalAlpha = 1;
  }
  function box(ctx, x, y, w, h, c, S) { ctx.fillStyle = c; ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S)); }

  // Mùa & Lễ hội (season.js): trời / đất / dây trang trí theo chủ đề đang dùng
  function SEA() { return typeof GardenSeason !== "undefined" && GardenSeason ? GardenSeason : null; }
  function skyNow() {
    if (typeof GardenSky === "undefined") { return null; }
    const st = GardenSky.state();
    return SEA() ? SEA().themeSky(st) : st;
  }
  function timeOfDay() {
    const st = skyNow();
    if (st) { return st.tod; }
    const h = new Date().getHours();
    if (h < 5 || h >= 19) { return "night"; }
    if (h >= 17 || h < 7) { return "dusk"; }
    return "day";
  }
  const lights = [];   // nguồn sáng ban đêm thu thập trong lúc vẽ (cửa sổ, đèn lồng)

  let lastCat = null;
  function catalog() {
    const d = H && H.data();
    const c = d && d.catalog;
    if (c && c !== lastCat) {
      lastCat = c;
      itemMap = {};
      (c.items || []).forEach((it) => { itemMap[it.id] = it; });
      decodeCustoms(c);
    }
    return c;
  }
  // Món tự làm: mã nén "5.3kky" → các hàng sprite (cắt bỏ viền trong suốt)
  function pxDecode(code, size) {
    let out = "", num = "";
    for (const ch of String(code || "")) {
      if (ch >= "0" && ch <= "9") { num += ch; continue; }
      out += ch.repeat(num ? Number(num) : 1); num = "";
    }
    return out.length === size * size ? out : null;
  }
  function pxRows(flat, size, trim) {
    const g = [];
    for (let j = 0; j < size; j++) { g.push(flat.slice(j * size, (j + 1) * size)); }
    if (!trim) { return g; }
    let t = 0, b = size - 1, l = size, r = -1;
    g.forEach((row, j) => { for (let i = 0; i < size; i++) { if (row[i] !== ".") { l = Math.min(l, i); r = Math.max(r, i); } } });
    if (r < 0) { return ["k"]; }
    while (g[t].replace(/\./g, "") === "") { t++; }
    while (g[b].replace(/\./g, "") === "") { b--; }
    return g.slice(t, b + 1).map((row) => row.slice(l, r + 1));
  }
  function decodeCustoms(c) {
    (c.items || []).forEach((it) => {
      if (!it.custom) { return; }
      const flat = pxDecode(it.px, it.size);
      SPR[it.id] = flat ? pxRows(flat, it.size, true) : ["kk", "kk"];
    });
  }
  function placedOf(id) {
    const home = homeState();
    return ["yard", "room"].concat(SIDE_IDS, ZONE_IDS, uzIds()).reduce((n, sc) => n + (home[sc] || []).filter((e) => e.id === id).length, 0);
  }
  // 1.14: vùng tự tạo của người dùng (wallet.more.zones), dữ liệu 1.14 tính sẵn (wallet.more_view)
  function moreData() { const d = H && H.data(); return (d && d.wallet && d.wallet.more) || { zones: [], pets: {}, seeds: { owned: [] } }; }
  function moreView() { const d = H && H.data(); return (d && d.wallet && d.wallet.more_view) || { wear: { level: 0 }, pets: [] }; }
  function uzones() { return moreData().zones || []; }
  function uzIds() { return uzones().map((z) => z.id); }
  function uzone(id) { return uzones().find((z) => z.id === id) || null; }
  function sceneName(s) { if (isUz(s)) { const z = uzone(s); return z ? z.name : "Vùng tự tạo"; } return SCENE_NAME[s] || s; }
  function zoneOpen(z) { return isUz(z) ? !!uzone(z) : (homeState().zones || []).indexOf(z) >= 0; }
  function UIget(k) { return typeof GardenUI !== "undefined" && GardenUI.get ? GardenUI.get(k) : (k === "yard" || k === "field" ? "full" : "on"); }
  function canEnter(s) {
    if (s === "room" || s === "house") { return homeState().house >= ((catalog() || {}).room_unlock || 5); }
    if (SIDE_IDS.indexOf(s) >= 0) { return (homeState().rooms || []).indexOf(s) >= 0; }      // 1.24: gian bên đã mở
    return s === "yard" || zoneOpen(s);
  }
  // 1.25.3: cảnh màn chính lưu qua GardenPrefs (config của add-on; localStorage mất khi tắt Anki)
  let benchScene = null;      // _bench vẽ thử cảnh khác mà không ghi cài đặt
  function setMainPref(s) {
    try { if (typeof GardenPrefs !== "undefined") { GardenPrefs.set("kb-main-scene", s); } else { localStorage.setItem("kb-main-scene", s); } } catch (e) { /* bỏ qua */ }
  }
  function mainScene() {
    let s = "yard";
    try { s = benchScene || (typeof GardenPrefs !== "undefined" ? GardenPrefs.get("kb-main-scene") : localStorage.getItem("kb-main-scene")) || "yard"; } catch (e) { /* bỏ qua */ }
    return (isOut(s) || s === "house") && canEnter(s) ? s : "yard";
  }
  let itemMap = {};
  function item(id) { catalog(); return itemMap[id] || null; }   // tra nhanh, dựng lại khi danh mục đổi
  function homeState() {
    const d = H && H.data();
    const w = (d && d.wallet) || {};
    return w.home || { house: 0, owned: {}, yard: [], room: [] };
  }
  function coins() { const d = H && H.data(); return (d && d.wallet && d.wallet.coins) || 0; }

  // ---- nhà theo cấp (và theo kiểu khi đã xây xong) ----
  let snowRoof = false;   // đang có tuyết: phủ trắng mặt trên của mái
  function snowEdge(ctx, S, X, Y, y, half, prevHalf) {
    if (!snowRoof) { return; }
    if (prevHalf < 0) { box(ctx, X(32 - half), Y(y), half * 2, 1, "#f4f8ff", S); return; }
    const d = Math.max(1, half - prevHalf);
    box(ctx, X(32 - half), Y(y), d, 1, "#f4f8ff", S);
    box(ctx, X(32 + half - d), Y(y), d, 1, "#f4f8ff", S);
  }
  function drawHouse(ctx, S, ox, oy, level, now, tod, style) {
    const X = (x) => ox + x, Y = (y) => oy + y;
    const night = tod === "night";
    if (level >= 7 && style && style !== "classic" && STYLE_DRAW[style]) {
      STYLE_DRAW[style](ctx, S, X, Y, now, night);
      return;
    }
    if (level === 0) {
      [[8, 52], [56, 52], [8, 66], [56, 66]].forEach(([x, y]) => { box(ctx, X(x), Y(y), 2, 9, P.B, S); box(ctx, X(x), Y(y), 2, 1, P.k, S); });
      box(ctx, X(9), Y(53), 48, 1, P.c, S); box(ctx, X(9), Y(67), 48, 1, P.c, S);
      box(ctx, X(8), Y(53), 1, 14, P.c, S); box(ctx, X(57), Y(53), 1, 14, P.c, S);
      box(ctx, X(31), Y(48), 2, 18, P.B, S);
      box(ctx, X(23), Y(40), 18, 11, P.k, S); box(ctx, X(24), Y(41), 16, 9, P.t, S);
      box(ctx, X(27), Y(43), 10, 1, P.B, S); box(ctx, X(27), Y(46), 7, 1, P.B, S);
      return;
    }
    // móng
    box(ctx, X(5), Y(63), 54, 10, P.k, S); box(ctx, X(6), Y(64), 52, 8, P.S, S); box(ctx, X(6), Y(64), 52, 2, P.s, S);
    for (let i = 10; i < 56; i += 9) { box(ctx, X(i), Y(66), 1, 6, P.k, S); }
    box(ctx, X(27), Y(72), 10, 3, P.k, S); box(ctx, X(28), Y(72), 8, 2, P.s, S);
    if (level === 1) { return; }
    if (level === 2) {
      [8, 21, 41, 54].forEach((x) => { box(ctx, X(x), Y(33), 3, 31, P.k, S); box(ctx, X(x + 1), Y(34), 1, 29, P.b, S); });
      box(ctx, X(6), Y(31), 52, 4, P.k, S); box(ctx, X(7), Y(32), 50, 2, P.b, S);
      for (let i = 0; i <= 25; i++) {
        const y = 31 - Math.round(i * 17 / 25);
        box(ctx, X(7 + i), Y(y), 1, 1, P.B, S); box(ctx, X(57 - i), Y(y), 1, 1, P.B, S);
      }
      box(ctx, X(31), Y(13), 2, 19, P.B, S);
      return;
    }
    // tường
    box(ctx, X(7), Y(33), 50, 31, P.k, S); box(ctx, X(8), Y(34), 48, 29, "#fff4dc", S);
    for (let y = 38; y < 62; y += 6) { box(ctx, X(8), Y(y), 48, 1, "#f0dfc0", S); }
    box(ctx, X(8), Y(34), 3, 29, P.b, S); box(ctx, X(53), Y(34), 3, 29, P.b, S);
    const door = { x: 27, y: 45, w: 10, h: 18 };
    const wins = [{ x: 13, y: 41, w: 9, h: 9 }, { x: 42, y: 41, w: 9, h: 9 }];
    if (level < 5) {
      box(ctx, X(door.x), Y(door.y), door.w, door.h, P.n, S);
      wins.forEach((w) => box(ctx, X(w.x), Y(w.y), w.w, w.h, P.n, S));
    } else {
      box(ctx, X(door.x - 1), Y(door.y - 1), door.w + 2, door.h + 1, P.k, S);
      box(ctx, X(door.x), Y(door.y), door.w, door.h, P.b, S);
      box(ctx, X(door.x + 1), Y(door.y + 2), 3, 6, P.B, S); box(ctx, X(door.x + 6), Y(door.y + 2), 3, 6, P.B, S);
      box(ctx, X(door.x + 1), Y(door.y + 10), 8, 6, P.B, S);
      box(ctx, X(door.x + 7), Y(door.y + 9), 1, 1, P.y, S);
      const glass = night ? (Math.floor(now / 900) % 7 === 0 ? P.o : P.y) : P.l;
      wins.forEach((w) => {
        box(ctx, X(w.x - 1), Y(w.y - 1), w.w + 2, w.h + 2, P.k, S);
        box(ctx, X(w.x), Y(w.y), w.w, w.h, P.w, S);
        box(ctx, X(w.x + 1), Y(w.y + 1), w.w - 2, w.h - 2, glass, S);
        box(ctx, X(w.x + 4), Y(w.y + 1), 1, w.h - 2, P.w, S); box(ctx, X(w.x + 1), Y(w.y + 4), w.w - 2, 1, P.w, S);
        if (!night) { box(ctx, X(w.x + 1), Y(w.y + 1), 2, 1, P.w, S); }
      });
      if (night) {
        ctx.globalAlpha = 0.18;
        wins.forEach((w) => box(ctx, X(w.x - 3), Y(w.y - 3), w.w + 6, w.h + 6, P.y, S));
        ctx.globalAlpha = 1;
        wins.forEach((w) => lights.push({ x: w.x + w.w / 2, y: w.y + w.h / 2, r: 10 }));
      }
      if (level >= 7) {
        box(ctx, X(door.x), Y(door.y), door.w, 6, "#2f5fb0", S);
        box(ctx, X(door.x + 4), Y(door.y), 2, 6, "#1b1b2f", S);
        box(ctx, X(door.x + 2), Y(door.y + 2), 1, 2, P.w, S); box(ctx, X(door.x + 7), Y(door.y + 2), 1, 2, P.w, S);
      }
    }
    if (level === 3) { return; }
    // mái
    for (let y = 13; y <= 34; y++) {
      const half = Math.round((y - 13) * 1.45) + 3;
      box(ctx, X(32 - half - 1), Y(y), half * 2 + 2, 1, P.k, S);
      box(ctx, X(32 - half), Y(y), half * 2, 1, (y - 13) % 4 === 3 ? P.R : P.r, S);
      snowEdge(ctx, S, X, Y, y, half, y === 13 ? -1 : Math.round((y - 14) * 1.45) + 3);
    }
    box(ctx, X(1), Y(33), 62, 3, P.k, S); box(ctx, X(2), Y(34), 60, 1, P.R, S);
    box(ctx, X(29), Y(11), 6, 3, P.k, S); box(ctx, X(30), Y(12), 4, 1, P.R, S);
    if (level >= 6) {
      // ống khói
      box(ctx, X(43), Y(12), 8, 14, P.k, S); box(ctx, X(44), Y(13), 6, 13, P.R, S);
      for (let y = 15; y < 26; y += 3) { box(ctx, X(44), Y(y), 6, 1, P.r, S); }
      box(ctx, X(42), Y(10), 10, 3, P.k, S); box(ctx, X(43), Y(11), 8, 1, P.S, S);
      // bồn hoa dưới cửa sổ
      wins.forEach((w) => {
        box(ctx, X(w.x - 2), Y(w.y + 10), w.w + 4, 4, P.k, S); box(ctx, X(w.x - 1), Y(w.y + 11), w.w + 2, 2, P.b, S);
        for (let i = 0; i < w.w + 2; i += 2) { box(ctx, X(w.x - 1 + i), Y(w.y + 9), 1, 1, [P.p, P.y, P.r, P.w][(i / 2) % 4], S); }
      });
    }
    if (level >= 7) {
      // cửa sổ tròn trên mái + đèn lồng hai bên cửa
      box(ctx, X(28), Y(20), 9, 9, P.k, S); box(ctx, X(29), Y(21), 7, 7, night ? P.y : P.l, S);
      box(ctx, X(32), Y(21), 1, 7, P.k, S); box(ctx, X(29), Y(24), 7, 1, P.k, S);
      [22, 39].forEach((x) => {
        box(ctx, X(x), Y(48), 4, 6, P.k, S); box(ctx, X(x + 1), Y(49), 2, 4, (Math.floor(now / 400) % 2 && night) ? P.o : P.r, S);
      });
      box(ctx, X(27), Y(9), 2, 3, P.y, S); box(ctx, X(35), Y(9), 2, 3, P.y, S);
    }
  }


  // ---- các kiểu nhà khác (khung 64 × 76 giống nhà gốc) ----
  function roofBand(ctx, S, X, Y, y0, y1, h0, h1, col, edge) {
    let prev = -1;
    for (let y = y0; y <= y1; y++) {
      const half = Math.round(h0 + (h1 - h0) * (y - y0) / Math.max(1, y1 - y0));
      box(ctx, X(32 - half - 1), Y(y), half * 2 + 2, 1, P.k, S);
      box(ctx, X(32 - half), Y(y), half * 2, 1, y === y1 && edge ? edge : col, S);
      if (y < y1) { snowEdge(ctx, S, X, Y, y, half, prev); }
      prev = half;
    }
  }
  const STYLE_DRAW = {
    minka: function (ctx, S, X, Y, now, night) {
      box(ctx, X(5), Y(63), 54, 10, P.k, S); box(ctx, X(6), Y(64), 52, 8, P.S, S); box(ctx, X(6), Y(64), 52, 2, P.s, S);
      box(ctx, X(27), Y(72), 10, 3, P.k, S); box(ctx, X(28), Y(72), 8, 2, P.s, S);
      box(ctx, X(7), Y(36), 50, 28, P.k, S); box(ctx, X(8), Y(37), 48, 26, P.c, S);
      [8, 20, 43, 54].forEach((x) => box(ctx, X(x), Y(37), 2, 26, P.B, S));
      box(ctx, X(8), Y(37), 48, 2, P.B, S); box(ctx, X(8), Y(51), 48, 1, P.B, S);
      const glass = night ? "#ffe9a8" : P.w;
      [[11, 41], [45, 41]].forEach(([x, y]) => {
        box(ctx, X(x), Y(y), 8, 8, glass, S); box(ctx, X(x + 4), Y(y), 1, 8, P.S, S); box(ctx, X(x), Y(y + 4), 8, 1, P.S, S);
        if (night) { lights.push({ x: x + 4, y: y + 4, r: 10 }); }
      });
      box(ctx, X(23), Y(44), 18, 20, P.k, S); box(ctx, X(24), Y(45), 16, 19, glass, S);
      for (let i = 27; i < 40; i += 4) { box(ctx, X(i), Y(45), 1, 19, P.S, S); }
      box(ctx, X(32), Y(45), 1, 19, P.B, S);
      if (night) { lights.push({ x: 32, y: 54, r: 12 }); }
      for (let y = 6; y <= 37; y++) {
        const half = Math.min(32, Math.round((y - 6) * 1.05) + 5);
        box(ctx, X(32 - half - 1), Y(y), half * 2 + 2, 1, P.k, S);
        box(ctx, X(32 - half), Y(y), half * 2, 1, y >= 35 ? P.b : (y % 3 === 0 ? P.t : P.h), S);
        if (y < 35) { snowEdge(ctx, S, X, Y, y, half, y === 6 ? -1 : Math.min(32, Math.round((y - 7) * 1.05) + 5)); }
      }
      box(ctx, X(21), Y(4), 22, 4, P.k, S); box(ctx, X(22), Y(5), 20, 2, P.B, S);
      box(ctx, X(29), Y(11), 6, 4, P.k, S); box(ctx, X(30), Y(12), 4, 2, P.n, S);
    },
    teahouse: function (ctx, S, X, Y, now, night) {
      box(ctx, X(9), Y(66), 46, 7, P.k, S); box(ctx, X(10), Y(67), 44, 5, P.S, S); box(ctx, X(10), Y(67), 44, 1, P.s, S);
      [[20, 73], [30, 74], [40, 73]].forEach(([x, y]) => { box(ctx, X(x), Y(y), 7, 3, P.k, S); box(ctx, X(x + 1), Y(y + 1), 5, 1, P.s, S); });
      box(ctx, X(12), Y(40), 40, 27, P.k, S); box(ctx, X(13), Y(41), 38, 25, "#e8d3a6", S);
      [13, 31, 49].forEach((x) => box(ctx, X(x), Y(41), 2, 25, P.b, S));
      box(ctx, X(13), Y(41), 38, 2, P.b, S);
      const cx = 23, cy = 53;
      for (let y = -6; y <= 6; y++) {
        for (let x = -6; x <= 6; x++) {
          const d = x * x + y * y;
          if (d <= 40 && d > 26) { box(ctx, X(cx + x), Y(cy + y), 1, 1, P.B, S); }
          else if (d <= 26) { box(ctx, X(cx + x), Y(cy + y), 1, 1, (x === 0 || y === 0 || Math.abs(x) === 3) ? P.b : (night ? "#ffe9a8" : P.w), S); }
        }
      }
      if (night) { lights.push({ x: cx, y: cy, r: 11 }); }
      box(ctx, X(36), Y(55), 11, 12, P.k, S); box(ctx, X(37), Y(56), 9, 11, P.b, S); box(ctx, X(41), Y(56), 1, 11, P.B, S);
      roofBand(ctx, S, X, Y, 24, 41, 6, 29, P.m, P.S);
      for (let y = 26; y < 41; y += 3) { box(ctx, X(32 - Math.round(6 + 23 * (y - 24) / 17)), Y(y), Math.round(6 + 23 * (y - 24) / 17) * 2, 1, P.S, S); }
      box(ctx, X(24), Y(22), 16, 3, P.k, S); box(ctx, X(25), Y(23), 14, 1, P.S, S);
      for (let x = 53; x < 63; x += 3) { box(ctx, X(x), Y(55), 2, 17, P.k, S); box(ctx, X(x), Y(56), 1, 15, P.f, S); }
      box(ctx, X(52), Y(59), 11, 1, P.G, S); box(ctx, X(52), Y(66), 11, 1, P.G, S);
    },
    castle: function (ctx, S, X, Y, now, night) {
      const win = night ? P.y : P.n;
      for (let y = 54; y <= 74; y++) {
        const half = 22 + Math.round((y - 54) * 0.45);
        box(ctx, X(32 - half - 1), Y(y), half * 2 + 2, 1, P.k, S);
        box(ctx, X(32 - half), Y(y), half * 2, 1, (Math.floor((y - 54) / 3) % 2) ? P.S : P.m, S);
        if ((y - 54) % 3 === 2) { box(ctx, X(32 - half), Y(y), half * 2, 1, P.n, S); }
        else { for (let x = 32 - half + ((Math.floor((y - 54) / 3) % 2) * 3); x < 32 + half; x += 7) { box(ctx, X(x), Y(y), 1, 1, P.n, S); } }
      }
      box(ctx, X(12), Y(43), 40, 12, P.k, S); box(ctx, X(13), Y(44), 38, 10, P.w, S);
      [17, 26, 35, 43].forEach((x) => { box(ctx, X(x), Y(47), 4, 4, win, S); if (night) { lights.push({ x: x + 2, y: 49, r: 7 }); } });
      roofBand(ctx, S, X, Y, 36, 43, 15, 29, P.n, P.m);
      box(ctx, X(18), Y(28), 28, 9, P.k, S); box(ctx, X(19), Y(29), 26, 7, P.w, S);
      [23, 30, 37].forEach((x) => box(ctx, X(x), Y(31), 4, 3, win, S));
      roofBand(ctx, S, X, Y, 22, 28, 10, 20, P.n, P.m);
      box(ctx, X(23), Y(16), 18, 7, P.k, S); box(ctx, X(24), Y(17), 16, 5, P.w, S);
      box(ctx, X(30), Y(18), 4, 3, win, S);
      roofBand(ctx, S, X, Y, 9, 16, 5, 15, P.n, P.m);
      [[16, 6], [45, 6]].forEach(([x, y]) => { box(ctx, X(x), Y(y), 3, 5, P.k, S); box(ctx, X(x + 1), Y(y + 1), 1, 3, P.y, S); });
      box(ctx, X(28), Y(66), 8, 9, P.k, S); box(ctx, X(29), Y(67), 6, 8, P.B, S);
    }
  };

  // ---- công trình riêng của mỗi vùng (cột 0–3) ----
  const LANDMARK = {
    beach: function (ctx, S, X, Y, now, night) {
      [8, 22, 42, 56].forEach((x) => { box(ctx, X(x), Y(60), 3, 15, P.k, S); box(ctx, X(x + 1), Y(61), 1, 13, P.B, S); });
      box(ctx, X(3), Y(57), 58, 5, P.k, S); box(ctx, X(4), Y(58), 56, 3, P.t, S);
      for (let i = 8; i < 60; i += 6) { box(ctx, X(i), Y(58), 1, 3, P.b, S); }
      box(ctx, X(7), Y(35), 50, 23, P.k, S); box(ctx, X(8), Y(36), 48, 21, P.h, S);
      for (let y = 39; y < 57; y += 4) { box(ctx, X(8), Y(y), 48, 1, P.t, S); }
      box(ctx, X(14), Y(41), 36, 11, P.k, S); box(ctx, X(15), Y(42), 34, 9, night ? "#ffcf6a" : P.n, S);
      box(ctx, X(13), Y(51), 38, 3, P.k, S); box(ctx, X(14), Y(52), 36, 1, P.b, S);
      box(ctx, X(18), Y(48), 6, 3, P.G, S); box(ctx, X(19), Y(48), 4, 2, P.r, S);
      box(ctx, X(40), Y(46), 3, 5, P.l, S); box(ctx, X(40), Y(45), 3, 1, P.w, S); box(ctx, X(44), Y(47), 3, 4, P.p, S);
      for (let i = 2; i < 62; i++) { box(ctx, X(i), Y(31), 1, 5, Math.floor(i / 4) % 2 ? P.r : P.w, S); }
      box(ctx, X(2), Y(30), 60, 1, P.k, S);
      for (let i = 2; i < 62; i += 4) { box(ctx, X(i), Y(36), 2, 1, Math.floor(i / 4) % 2 ? P.r : P.w, S); }
      for (let y = 14; y <= 30; y++) {
        const half = Math.min(31, Math.round((y - 14) * 1.7) + 4);
        box(ctx, X(32 - half - 1), Y(y), half * 2 + 2, 1, P.k, S);
        box(ctx, X(32 - half), Y(y), half * 2, 1, y % 3 === 0 ? P.t : P.h, S);
      }
      box(ctx, X(25), Y(20), 14, 8, P.k, S); box(ctx, X(26), Y(21), 12, 6, P.w, S);
      box(ctx, X(28), Y(22), 8, 1, P.d, S); box(ctx, X(28), Y(24), 8, 1, P.d, S); box(ctx, X(30), Y(23), 1, 3, P.d, S);
      box(ctx, X(57), Y(41), 5, 32, P.k, S); box(ctx, X(58), Y(42), 3, 30, P.y, S); box(ctx, X(59), Y(42), 1, 30, P.o, S);
      if (night) { lights.push({ x: 32, y: 46, r: 15 }); }
    },
    shrine: function (ctx, S, X, Y, now, night) {
      box(ctx, X(4), Y(62), 56, 12, P.k, S); box(ctx, X(5), Y(63), 54, 10, P.S, S); box(ctx, X(5), Y(63), 54, 2, P.s, S);
      for (let i = 10; i < 58; i += 8) { box(ctx, X(i), Y(65), 1, 8, P.m, S); }
      box(ctx, X(24), Y(71), 16, 5, P.k, S); box(ctx, X(25), Y(72), 14, 3, P.s, S); box(ctx, X(25), Y(74), 14, 1, P.m, S);
      box(ctx, X(12), Y(38), 40, 25, P.k, S); box(ctx, X(13), Y(39), 38, 23, P.B, S);
      for (let d = 0; d < 2; d++) {
        const dx = 18 + d * 15;
        box(ctx, X(dx), Y(45), 13, 17, P.b, S);
        for (let i = 1; i < 13; i += 3) { box(ctx, X(dx + i), Y(45), 1, 17, P.B, S); }
        for (let j = 3; j < 17; j += 4) { box(ctx, X(dx), Y(45 + j), 13, 1, P.B, S); }
      }
      [10, 50].forEach((x) => { box(ctx, X(x), Y(36), 4, 27, P.k, S); box(ctx, X(x + 1), Y(37), 2, 26, P.r, S); });
      for (let y = 18; y <= 37; y++) {
        const t = (y - 18) / 19;
        const half = Math.min(31, Math.round(9 + 20 * t + (t > 0.75 ? (t - 0.75) * 14 : 0)));
        box(ctx, X(32 - half - 1), Y(y), half * 2 + 2, 1, P.k, S);
        box(ctx, X(32 - half), Y(y), half * 2, 1, y % 4 === 0 || y === 37 ? P.A : P.a, S);
      }
      box(ctx, X(17), Y(12), 3, 8, P.k, S); box(ctx, X(18), Y(13), 1, 6, P.b, S);
      box(ctx, X(44), Y(12), 3, 8, P.k, S); box(ctx, X(45), Y(13), 1, 6, P.b, S);
      box(ctx, X(20), Y(16), 24, 3, P.k, S); box(ctx, X(21), Y(17), 22, 1, P.b, S);
      box(ctx, X(14), Y(38), 36, 2, P.h, S); box(ctx, X(14), Y(40), 36, 1, P.t, S);
      [17, 25, 37, 45].forEach((x) => { box(ctx, X(x), Y(41), 2, 2, P.w, S); box(ctx, X(x + 1), Y(43), 2, 2, P.w, S); box(ctx, X(x), Y(45), 2, 1, P.w, S); });
      box(ctx, X(31), Y(41), 3, 3, P.y, S); box(ctx, X(32), Y(44), 1, 8, P.r, S); box(ctx, X(32), Y(52), 1, 4, P.w, S);
      [0, 58].forEach((x) => {
        box(ctx, X(x), Y(53), 6, 2, P.k, S); box(ctx, X(x + 1), Y(55), 4, 4, night ? P.y : P.s, S);
        box(ctx, X(x), Y(59), 6, 2, P.S, S); box(ctx, X(x + 1), Y(61), 4, 13, P.S, S); box(ctx, X(x + 1), Y(61), 1, 13, P.s, S);
        if (night) { lights.push({ x: x + 3, y: 57, r: 10 }); }
      });
    },
    festival: function (ctx, S, X, Y, now, night) {
      [[14, 67], [48, 67]].forEach(([x, y]) => {
        box(ctx, X(x - 4), Y(y - 4), 9, 9, P.k, S); box(ctx, X(x - 3), Y(y - 3), 7, 7, P.b, S); box(ctx, X(x - 1), Y(y - 1), 3, 3, P.B, S);
      });
      box(ctx, X(6), Y(46), 52, 19, P.k, S); box(ctx, X(7), Y(47), 50, 17, P.b, S);
      for (let i = 12; i < 56; i += 7) { box(ctx, X(i), Y(47), 1, 17, P.B, S); }
      box(ctx, X(4), Y(43), 56, 4, P.k, S); box(ctx, X(5), Y(44), 54, 2, P.c, S);
      for (let i = 0; i < 6; i++) { box(ctx, X(12 + i * 3), Y(41), 2, 2, P.B, S); }
      box(ctx, X(36), Y(39), 9, 4, P.S, S); box(ctx, X(37), Y(40), 7, 2, P.o, S);
      [8, 54].forEach((x) => box(ctx, X(x), Y(22), 2, 22, P.B, S));
      for (let q = 0; q < 5; q++) {
        const nx = 11 + q * 9;
        box(ctx, X(nx), Y(24), 8, 12, P.k, S); box(ctx, X(nx + 1), Y(24), 6, 11, P.w, S); box(ctx, X(nx + 2), Y(27), 4, 3, P.r, S);
      }
      box(ctx, X(2), Y(16), 60, 7, P.k, S); box(ctx, X(3), Y(17), 58, 5, P.r, S); box(ctx, X(3), Y(21), 58, 1, P.R, S);
      for (let i = 3; i < 61; i += 6) { box(ctx, X(i), Y(23), 3, 1, P.r, S); }
      const glow = night && Math.floor(now / 500) % 5 ? P.y : P.o;
      box(ctx, X(57), Y(24), 6, 9, P.k, S); box(ctx, X(58), Y(25), 4, 7, P.r, S);
      box(ctx, X(58), Y(27), 4, 1, glow, S); box(ctx, X(58), Y(30), 4, 1, glow, S);
      if (night) { lights.push({ x: 60, y: 28, r: 12 }); lights.push({ x: 32, y: 36, r: 16 }); }
    },
    // Rừng tre: quán trà nhỏ, ghế phủ vải đỏ và ô giấy lớn
    bamboo: function (ctx, S, X, Y, now, night) {
      box(ctx, X(2), Y(70), 60, 4, P.k, S); box(ctx, X(3), Y(71), 58, 2, P.s, S);
      [6, 36].forEach((x) => { box(ctx, X(x), Y(34), 3, 37, P.k, S); box(ctx, X(x + 1), Y(35), 1, 35, P.B, S); });
      box(ctx, X(9), Y(38), 27, 32, P.k, S); box(ctx, X(10), Y(39), 25, 30, P.t, S);
      for (let y = 43; y < 68; y += 5) { box(ctx, X(10), Y(y), 25, 1, P.h, S); }
      box(ctx, X(10), Y(57), 25, 4, P.k, S); box(ctx, X(10), Y(58), 25, 2, P.b, S);
      [[13, 55], [18, 55], [27, 55]].forEach(([x, y], k) => { box(ctx, X(x), Y(y), 3, 2, P.k, S); box(ctx, X(x), Y(y), 3, 1, [P.g, P.w, P.d][k], S); });
      box(ctx, X(12), Y(39), 21, 10, P.k, S); box(ctx, X(13), Y(39), 19, 9, P.U, S);
      [19, 26].forEach((x) => box(ctx, X(x), Y(43), 1, 5, P.k, S));
      [".w.w.", "wwwww", ".w.w.", "wwwww", "..w..", ".www."].forEach((r, j) => { for (let i = 0; i < 5; i++) { if (r[i] === "w") { box(ctx, X(20 + i), Y(40 + j), 1, 1, P.w, S); } } });
      for (let y = 25; y <= 35; y++) {
        const l = 1 + Math.round((y - 25) * 0.15), r = 44 - Math.round((35 - y) * 0.6);
        box(ctx, X(l), Y(y), r - l, 1, P.k, S); if (y > 25 && y < 35) { box(ctx, X(l + 1), Y(y), r - l - 2, 1, y % 3 === 0 ? P.B : P.b, S); }
      }
      box(ctx, X(29), Y(59), 33, 4, P.k, S); box(ctx, X(30), Y(60), 31, 2, P.r, S); box(ctx, X(30), Y(62), 31, 3, P.R, S); box(ctx, X(30), Y(65), 31, 1, P.k, S);
      [32, 57].forEach((x) => { box(ctx, X(x), Y(66), 3, 6, P.k, S); box(ctx, X(x + 1), Y(66), 1, 5, P.B, S); });
      box(ctx, X(37), Y(56), 4, 4, P.k, S); box(ctx, X(38), Y(57), 2, 2, P.g, S);
      box(ctx, X(43), Y(54), 1, 6, P.B, S); [[P.p, 52], [P.w, 55], [P.g, 58]].forEach(([c, y]) => { box(ctx, X(42), Y(y - 3), 3, 2, c, S); });
      box(ctx, X(50), Y(22), 2, 38, P.k, S); box(ctx, X(50), Y(23), 1, 36, P.B, S);
      for (let y = 12; y <= 23; y++) {
        const half = 3 + Math.round((y - 12) * 1.3);
        box(ctx, X(51 - half - 1), Y(y), half * 2 + 2, 1, P.k, S);
        for (let i = -half; i < half; i++) { box(ctx, X(51 + i), Y(y), 1, 1, (Math.floor((i + 40) / 4) % 2 ? P.r : P.R), S); }
      }
      box(ctx, X(36), Y(24), 30, 1, P.k, S);
      [38, 44, 58, 63].forEach((x) => { box(ctx, X(x), Y(25), 1, 1, P.B, S); });
      box(ctx, X(50), Y(10), 2, 2, P.B, S);
      if (night) { lights.push({ x: 22, y: 50, r: 12 }); lights.push({ x: 45, y: 58, r: 9 }); }
    },
    // Suối nước nóng: lữ quán gỗ, rèm noren ♨, đèn lồng, mái phủ tuyết
    onsen: function (ctx, S, X, Y, now, night) {
      box(ctx, X(3), Y(68), 58, 7, P.k, S); box(ctx, X(4), Y(69), 56, 5, P.S, S); box(ctx, X(4), Y(69), 56, 1, P.s, S);
      for (let i = 10; i < 58; i += 9) { box(ctx, X(i), Y(70), 1, 4, P.m, S); }
      box(ctx, X(5), Y(36), 54, 33, P.k, S); box(ctx, X(6), Y(37), 52, 31, P.t, S);
      for (let x = 8; x < 57; x += 4) { box(ctx, X(x), Y(37), 1, 31, P.h, S); }
      box(ctx, X(6), Y(62), 52, 1, P.b, S);
      const paper = night ? "#ffe9a8" : P.c;
      [9, 44].forEach((x) => {
        box(ctx, X(x), Y(42), 12, 12, P.k, S); box(ctx, X(x + 1), Y(43), 10, 10, paper, S);
        box(ctx, X(x + 5), Y(43), 1, 10, P.b, S); box(ctx, X(x + 1), Y(47), 10, 1, P.b, S);
        if (night) { lights.push({ x: x + 6, y: 48, r: 10 }); }
      });
      box(ctx, X(22), Y(44), 20, 25, P.k, S); box(ctx, X(23), Y(45), 18, 24, night ? "#ffd27a" : P.c, S);
      for (let x = 26; x < 41; x += 4) { box(ctx, X(x), Y(45), 1, 24, P.b, S); }
      box(ctx, X(23), Y(56), 18, 1, P.b, S);
      if (night) { lights.push({ x: 32, y: 58, r: 13 }); }
      box(ctx, X(21), Y(43), 22, 13, P.k, S); box(ctx, X(22), Y(43), 20, 12, P.U, S);
      [28, 35].forEach((x) => box(ctx, X(x), Y(48), 1, 7, P.k, S));
      [".w.w.w.", "w.w.w..", ".w.w.w.", "w.....w", "w.....w", ".wwwww."].forEach((r, j) => {
        for (let i = 0; i < 7; i++) { if (r[i] === "w") { box(ctx, X(29 + i), Y(44 + j), 1, 1, P.w, S); } }
      });
      [16, 45].forEach((x) => {
        box(ctx, X(x + 1), Y(42), 1, 3, P.k, S);
        box(ctx, X(x), Y(45), 4, 7, P.k, S); box(ctx, X(x + 1), Y(46), 2, 5, night && Math.floor(now / 400 + x) % 4 ? P.o : P.r, S);
        box(ctx, X(x + 1), Y(48), 2, 1, P.R, S);
        if (night) { lights.push({ x: x + 2, y: 48, r: 9 }); }
      });
      for (let y = 18; y <= 37; y++) {
        const half = Math.min(31, Math.round((y - 18) * 1.5) + 6);
        box(ctx, X(32 - half - 1), Y(y), half * 2 + 2, 1, P.k, S);
        box(ctx, X(32 - half), Y(y), half * 2, 1, y < 21 ? P.w : (y % 3 === 0 ? P.m : P.n), S);
        if (y >= 21 && y < 30) { box(ctx, X(32 - half), Y(y), 2, 1, P.w, S); box(ctx, X(32 + half - 2), Y(y), 2, 1, P.w, S); }
      }
      box(ctx, X(24), Y(16), 16, 3, P.k, S); box(ctx, X(25), Y(17), 14, 1, P.w, S);
      box(ctx, X(26), Y(37), 12, 6, P.k, S); box(ctx, X(27), Y(38), 10, 4, P.b, S);
      [".w.w.w.", "w.....w", ".wwwww."].forEach((r, j) => { for (let i = 0; i < 7; i++) { if (r[i] === "w") { box(ctx, X(29 + i), Y(38 + j), 1, 1, P.c, S); } } });
    },
    // Ga làng quê: nhà ga gỗ, biển tên ga, đồng hồ, sân ga có vạch vàng
    station: function (ctx, S, X, Y, now, night) {
      box(ctx, X(0), Y(66), 64, 9, P.k, S); box(ctx, X(0), Y(67), 64, 7, P.s, S); box(ctx, X(0), Y(67), 64, 1, P.w, S);
      box(ctx, X(0), Y(70), 64, 2, P.y, S);
      for (let x = 1; x < 64; x += 2) { box(ctx, X(x), Y(71), 1, 1, P.i, S); }
      box(ctx, X(6), Y(37), 52, 30, P.k, S); box(ctx, X(7), Y(38), 50, 28, P.c, S);
      box(ctx, X(7), Y(58), 50, 8, P.b, S); for (let x = 9; x < 57; x += 4) { box(ctx, X(x), Y(58), 1, 8, P.B, S); }
      const glass = night ? "#ffe9a8" : P.l;
      box(ctx, X(10), Y(47), 13, 10, P.k, S); box(ctx, X(11), Y(48), 11, 8, glass, S); box(ctx, X(11), Y(52), 11, 1, P.w, S);
      box(ctx, X(10), Y(56), 13, 2, P.b, S);
      box(ctx, X(36), Y(45), 15, 21, P.k, S); box(ctx, X(37), Y(46), 13, 20, night ? "#ffd27a" : P.n, S); box(ctx, X(43), Y(46), 1, 20, P.k, S);
      if (night) { lights.push({ x: 16, y: 52, r: 10 }); lights.push({ x: 43, y: 55, r: 12 }); }
      box(ctx, X(14), Y(39), 36, 7, P.k, S); box(ctx, X(15), Y(40), 34, 5, P.w, S); box(ctx, X(15), Y(44), 34, 1, P.R, S);
      ["kk.k", "k..k", "kkk.", "k.k."].forEach((_, q) => {
        const gx = 18 + q * 8;
        [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2], [1, 3]].slice(0, 4 + (q % 3)).forEach(([dx, dy]) => box(ctx, X(gx + dx), Y(40 + dy), 1, 1, P.n, S));
      });
      for (let y = 21; y <= 37; y++) {
        const half = Math.min(32, 9 + Math.round((y - 21) * 1.45));
        box(ctx, X(32 - half - 1), Y(y), half * 2 + 2, 1, P.k, S);
        box(ctx, X(32 - half), Y(y), half * 2, 1, y % 3 === 0 ? P.A : P.a, S);
      }
      box(ctx, X(28), Y(25), 9, 9, P.k, S); box(ctx, X(29), Y(26), 7, 7, P.w, S);
      const d = new Date(), cx = 32, cy = 29;
      const hand = (ang, len, c) => { for (let k = 1; k <= len; k++) { box(ctx, X(Math.round(cx + Math.sin(ang) * k)), Y(Math.round(cy - Math.cos(ang) * k)), 1, 1, c, S); } };
      hand(((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2, 2, P.k); hand(d.getMinutes() / 60 * Math.PI * 2, 3, P.R);
      box(ctx, X(60), Y(40), 2, 27, P.k, S); box(ctx, X(60), Y(40), 1, 26, P.S, S);
      box(ctx, X(57), Y(37), 7, 4, P.k, S); box(ctx, X(58), Y(38), 5, 2, night ? P.y : P.s, S);
      if (night) { lights.push({ x: 60, y: 40, r: 13 }); }
    }
  };
  // Tàu 3 toa chạy qua Ga làng quê (yb = mặt ray)
  function drawTrain(ctx, S, ox, oy, x, yb, st) {
    const body = tone("#f2ead8", st, 0.35), stripe = tone("#2e9e7a", st, 0.35), roof = tone("#9aa0b5", st, 0.35);
    const lit = st.light < 0.55;
    for (let c = 0; c < 3; c++) {
      const r = x - c * 31, l = r - 30;
      box(ctx, ox + l, oy + yb - 11, 30, 10, P.k, S);
      box(ctx, ox + l + 1, oy + yb - 10, 28, 8, body, S);
      box(ctx, ox + l + 1, oy + yb - 10, 28, 1, roof, S);
      box(ctx, ox + l + 1, oy + yb - 4, 28, 2, stripe, S);
      for (let wx = l + 3; wx < r - 3; wx += 5) { box(ctx, ox + wx, oy + yb - 8, 3, 3, lit ? "#ffe9a8" : tone("#8fd3ff", st, 0.35), S); }
      box(ctx, ox + l + 13, oy + yb - 8, 3, 6, tone("#6b6b7a", st, 0.35), S);
      box(ctx, ox + l + 4, oy + yb - 1, 3, 1, P.k, S); box(ctx, ox + r - 7, oy + yb - 1, 3, 1, P.k, S);
      if (c === 0) { box(ctx, ox + r - 2, oy + yb - 8, 2, 3, lit ? P.y : P.n, S); box(ctx, ox + r - 1, oy + yb - 4, 1, 1, lit ? P.y : P.w, S); }
      if (c === 1) { box(ctx, ox + l + 10, oy + yb - 14, 1, 3, P.k, S); box(ctx, ox + l + 8, oy + yb - 15, 6, 1, P.k, S); }
      if (lit && l > -60 && r < YARD.W + 60) { lights.push({ x: l + 15, y: yb - 7, r: 9 }); }
    }
  }

  function tone(c, st, base) { const k = base === undefined ? 0.45 : base; return GardenSky.shade(c, k + (1 - k) * st.light); }
  function snowy(c, st, k) { return st.snow || st.cover ? GardenSky.mix(c, "#eaf1f7", k || 0.72) : c; }
  // 1.10: cây / đất riêng của từng vùng theo Mùa & Lễ hội (xem GardenSeason.foliage)
  function fol() { return SEA() && SEA().foliage ? SEA().foliage() : null; }
  function leafC(c, st, f) { return f && f.tint ? GardenSky.mix(c, tone(f.tint, st, 0.3), f.k) : c; }
  function grassC(c, st) {          // cỏ của vùng pha màu đất của chủ đề (như sân nhà)
    const v = SEA() && SEA().vis ? SEA().vis() : null;
    return v && v.ground ? GardenSky.mix(c, tone(v.ground, st), v.groundK || 0.3) : c;
  }
  function treeDots(ctx, S, ox, oy, i, yTop, h, st, f, salt) {   // hoa / lá điểm và tuyết trên một cột tán cây
    if (f && f.snow || st.snow) { box(ctx, ox + i, oy + yTop, 1, 1, tone("#f4f8ff", st, 0.45), S); }
    if (f && f.dots && hash01(i * 13 + salt) < f.dens && h > 2) {
      box(ctx, ox + i, oy + yTop + 1 + Math.floor(hash01(i * 7 + salt) * (h - 2)), 1, 1, tone(f.dots[Math.floor(hash01(i * 3 + salt) * f.dots.length)], st, 0.4), S);
    }
  }

  // Nền của các vùng (vẽ dài ra hai bên giống sân)
  function drawZoneBg(ctx, S, ox, oy, now, zid, x0, x1, st) {
    const BW = x1 - x0, G0 = YARD.SKY;
    drawSky(ctx, S, ox, oy - skyPad, now, x0, x1, G0 + skyPad, st);
    if (zid === "beach") {
      const sea = GardenSky.mix(tone("#3aa6e0", st, 0.3), st.bottom, 0.25);
      box(ctx, ox + x0, oy + 15, BW, G0 - 15, sea, S);
      box(ctx, ox + x0, oy + 15, BW, 1, GardenSky.mix(sea, "#ffffff", 0.35), S);
      if (st.sun && st.sun.y < 0.45) {   // mặt trời sát biển: vệt sáng
        const sx = x0 + st.sun.x * BW;
        ctx.globalAlpha = 0.5;
        for (let j = 16; j < G0; j += 2) { box(ctx, ox + sx - 3 + ((j * 7 + Math.floor(now / 300)) % 5), oy + j, 4, 1, "#ffe29a", S); }
        ctx.globalAlpha = 1;
      }
      ctx.globalAlpha = 0.75;
      for (let i = 0; i < Math.ceil(BW / 12) + 2; i++) {
        const row = 17 + (i % 3) * 3;
        const x = x0 + ((i * 29 + now / (110 + (i % 3) * 40)) % (BW + 20)) - 10;
        box(ctx, ox + x, oy + row, 4, 1, "#ffffff", S);
      }
      ctx.globalAlpha = 1;
      box(ctx, ox + x0, oy + G0, BW, YARD.H - G0, snowy(tone("#f3dca0", st), st), S);
      box(ctx, ox + x0, oy + G0, BW, 3, snowy(tone("#d9bc80", st), st, 0.5), S);
      ctx.globalAlpha = 0.85;
      for (let i = Math.floor(x0); i < x1; i += 2) { box(ctx, ox + i, oy + G0 - 1 + Math.round(1 + Math.sin(i / 9 + now / 700)), 2, 1, "#ffffff", S); }
      ctx.globalAlpha = 1;
      for (let i = 3 + Math.floor(x0 / 13) * 13; i < x1; i += 13) { box(ctx, ox + i, oy + 34 + (i * 7) % 38, 1, 1, tone("#ffc4d6", st), S); }
    } else if (zid === "shrine") {
      const mtn = GardenSky.mix(tone("#7d8fb3", st, 0.35), st.bottom, 0.35), cap = tone("#f4f7ff", st, 0.4);
      const peaks = [[40, 24], [130, 20], [215, 26], [300, 21]];
      for (let i = Math.floor(x0); i < x1; i++) {
        let h = 0;
        peaks.forEach(([px, ph]) => { const xx = (((i - px) % 340) + 340) % 340; const d = Math.min(xx, 340 - xx); h = Math.max(h, ph - d * 0.5); });
        if (h > 0) {
          const hh = Math.round(h);
          box(ctx, ox + i, oy + G0 - hh, 1, hh, mtn, S);
          if (hh > 15) { box(ctx, ox + i, oy + G0 - hh, 1, Math.min(4, hh - 15), cap, S); }
        }
      }
      const f = fol(), fr = leafC(tone("#2f6b3a", st, 0.3), st, f), fr2 = leafC(tone("#3f8a4a", st, 0.3), st, f);
      for (let i = Math.floor(x0); i < x1; i++) {
        const k = ((i % 9) + 9) % 9, h = 4 + (k < 5 ? k : 9 - k) + (((i * 7) % 3) + 3) % 3;
        box(ctx, ox + i, oy + G0 - h, 1, h, k === 4 ? fr2 : fr, S);
        treeDots(ctx, S, ox, oy, i, G0 - h, h, st, f, 11);
      }
      box(ctx, ox + x0, oy + G0, BW, YARD.H - G0, snowy(tone("#d9d2c3", st), st), S);
      for (let i = 2 + Math.floor(x0 / 7) * 7; i < x1; i += 7) { box(ctx, ox + i, oy + 30 + (((i * 13) % 44) + 44) % 44, 1, 1, tone("#a9a090", st), S); }
      box(ctx, ox + 64, oy + 69, Math.max(0, x1 - 64), 5, snowy(tone("#ebe5d6", st), st, 0.5), S);
      for (let i = 70; i < x1; i += 11) { box(ctx, ox + i, oy + 69, 1, 5, tone("#c9c1ae", st), S); }
    } else if (zid === "festival") {
      const lit = st.light < 0.62;
      for (let bx = Math.floor(x0 / 30) * 30 - 30; bx < x1; bx += 30) {
        const h = 14 + ((((bx / 30) % 3) + 3) % 3) * 3;
        const wall = tone("#6b4a36", st, 0.4), roof = tone("#3b3346", st, 0.4);
        box(ctx, ox + bx, oy + G0 - h, 28, h, wall, S);
        box(ctx, ox + bx - 1, oy + G0 - h - 2, 30, 3, roof, S);
        [5, 16].forEach((wx, q) => {
          box(ctx, ox + bx + wx, oy + G0 - h + 4, 8, 5, lit ? (q ? "#ffb347" : "#ffcf6a") : tone("#e9dcc0", st), S);
          for (let l = 2; l < 8; l += 2) { box(ctx, ox + bx + wx + l, oy + G0 - h + 4, 1, 5, wall, S); }
        });
      }
      box(ctx, ox + x0, oy + G0, BW, YARD.H - G0, snowy(tone("#b9b2a5", st), st), S);
      const joint = tone("#9d978b", st);
      for (let y = G0 + 8; y < YARD.H; y += 8) { box(ctx, ox + x0, oy + y, BW, 1, joint, S); }
      for (let y = G0, r = 0; y < YARD.H; y += 8, r++) {
        for (let i = Math.floor(x0 / 16) * 16 + (r % 2) * 8; i < x1; i += 16) { box(ctx, ox + i, oy + y, 1, 8, joint, S); }
      }
      // dây đèn lồng
      const start = Math.floor(x0 / 48) * 48;
      for (let i = Math.floor(x0); i < x1; i++) {
        const t = (((i - start) % 48) + 48) % 48;
        box(ctx, ox + i, oy + 3 + Math.round(4 * Math.sin(Math.PI * t / 48)), 1, 1, "#3a2f2f", S);
      }
      for (let i = start + 6; i < x1; i += 12) {
        const t = (((i - start) % 48) + 48) % 48, ly = 4 + Math.round(4 * Math.sin(Math.PI * t / 48));
        const col = (Math.floor(i / 12) % 3) === 1 ? P.w : P.r;
        if (lit) {
          ctx.globalAlpha = 0.25; box(ctx, ox + i - 3, oy + ly - 1, 8, 8, P.y, S); ctx.globalAlpha = 1;
          if (i >= 0 && i < YARD.W && (Math.floor(i / 12) % 2 === 0)) { lights.push({ x: i + 1, y: ly + 3, r: 7 }); }
        }
        box(ctx, ox + i, oy + ly + 1, 3, 4, col, S); box(ctx, ox + i, oy + ly + 2, 3, 1, lit ? P.y : P.o, S);
      }
    } else if (zid === "bamboo") {
      const far = GardenSky.mix(tone("#86bd7c", st, 0.35), st.bottom, 0.45), farN = GardenSky.mix(far, "#1b3b22", 0.18);
      for (let bxx = Math.floor(x0 / 6) * 6 - 6; bxx < x1; bxx += 6) {
        const k = (((bxx / 6) % 7) + 7) % 7, xx = bxx + (k * 3) % 5;
        box(ctx, ox + xx, oy, 2, G0, far, S);
        for (let y = 2 + k; y < G0; y += 7) { box(ctx, ox + xx, oy + y, 2, 1, farN, S); }
      }
      const leafFar = GardenSky.mix(tone("#5f9a55", st, 0.35), st.bottom, 0.3);
      for (let i = Math.floor(x0); i < x1; i++) { box(ctx, ox + i, oy, 1, 3 + Math.round(2 * Math.sin(i / 5) + Math.sin(i / 2.3)), leafFar, S); }
      const near = tone("#3f9a4a", st, 0.3), hi = tone("#8fdc72", st, 0.3), node = tone("#24622f", st, 0.3);
      for (let bxx = Math.floor(x0 / 17) * 17 - 17; bxx < x1; bxx += 17) {
        const k = (((bxx / 17) % 5) + 5) % 5, xx = bxx + (k * 7) % 11;
        box(ctx, ox + xx, oy, 3, G0 + 1, near, S); box(ctx, ox + xx, oy, 1, G0 + 1, hi, S);
        for (let y = 4 + k; y < G0; y += 8) {
          box(ctx, ox + xx, oy + y, 3, 1, node, S);
          box(ctx, ox + xx + 3, oy + y - 2, 3, 1, near, S); box(ctx, ox + xx + 5, oy + y - 3, 2, 1, hi, S);
        }
      }
      box(ctx, ox + x0, oy + G0, BW, YARD.H - G0, snowy(grassC(tone("#69a84f", st), st), st), S);
      box(ctx, ox + x0, oy + G0, BW, 2, snowy(tone("#4f8a3c", st), st, 0.5), S);
      for (let i = 2 + Math.floor(x0 / 9) * 9; i < x1; i += 9) { box(ctx, ox + i, oy + G0 + 4 + (((i * 7) % 40) + 40) % 40, 2, 1, tone("#4f8a3c", st), S); }
      const stone = snowy(tone("#cfcabd", st), st, 0.4), stoneD = tone("#8f897d", st);
      for (let i = 66 + Math.max(0, Math.floor((x0 - 66) / 20)) * 20; i < x1; i += 20) {
        const yy = 63 + (Math.floor(i / 20) % 2) * 5;
        box(ctx, ox + i, oy + yy, 10, 4, stoneD, S); box(ctx, ox + i + 1, oy + yy, 8, 3, stone, S);
      }
      if (st.light > 0.7 && !st.rain && !st.snow) {     // nắng xiên qua rừng tre
        ctx.globalAlpha = 0.07;
        for (let k = Math.floor(x0 / 70) - 1; k * 70 < x1; k++) {
          const sx = k * 70 + 20 + Math.sin(now / 4000 + k) * 4;
          for (let y = 0; y < YARD.H; y += 2) { box(ctx, ox + sx + y * 0.45, oy + y, 6, 2, "#fffbe0", S); }
        }
        ctx.globalAlpha = 1;
      }
    } else if (zid === "onsen") {
      const mtn = GardenSky.mix(tone("#8a9bbf", st, 0.35), st.bottom, 0.4), cap = tone("#f8fbff", st, 0.45);
      const peaks = [[20, 22], [95, 25], [170, 19], [250, 24]];
      for (let i = Math.floor(x0); i < x1; i++) {
        let hh = 0;
        peaks.forEach(([px, ph]) => { const xx = (((i - px) % 320) + 320) % 320; const dd = Math.min(xx, 320 - xx); hh = Math.max(hh, ph - dd * 0.55); });
        if (hh > 0) {
          const h2 = Math.round(hh);
          box(ctx, ox + i, oy + G0 - h2, 1, h2, mtn, S);
          if (h2 > 9) { box(ctx, ox + i, oy + G0 - h2, 1, Math.min(7, h2 - 8) + ((i * 7) % 3 === 0 ? 1 : 0), cap, S); }
        }
      }
      for (let k = 0; k < 5; k++) {                  // hơi nước bốc lên từ suối xa
        const ph = ((now / 3200) + k / 5) % 1, base = 180 + (k % 2) * 6;
        if (base < x0 || base > x1) { continue; }
        ctx.globalAlpha = 0.28 * (1 - ph);
        const sz = 3 + Math.round(ph * 6);
        box(ctx, ox + base + Math.sin(ph * 5 + k) * 3 - sz / 2, oy + G0 - 4 - ph * 16, sz, sz, "#ffffff", S);
      }
      ctx.globalAlpha = 1;
      // không có chủ đề: suối nước nóng giữa tuyết như cũ; có chủ đề: theo mùa (cỏ xanh / cỏ úa / tuyết)
      const f = fol(), land = st.snow ? "snow" : f ? f.land : "snow";
      const pine = tone("#2f5f3a", st, 0.3);          // thông xanh quanh năm; chỉ tuyết là đổi theo mùa
      const stripe = land === "snow" ? tone("#eef4fa", st, 0.45) : tone("#3f7a4a", st, 0.3);
      for (let px = Math.floor(x0 / 11) * 11 - 11; px < x1; px += 11) {
        const k = (((px / 11) % 4) + 4) % 4, hh = 9 + k * 2, cx = px + 5;
        for (let j = 0; j < hh; j++) {
          const half = Math.floor(j * 0.45) + 1;
          box(ctx, ox + cx - half, oy + G0 - hh + j, half * 2, 1, (j % 3 === 0) ? stripe : pine, S);
        }
      }
      const GROUND = { snow: ["#e6edf4", "#ffffff", "#c7d2de"], green: ["#7fbf68", "#9fd884", "#5f9f4f"], dry: ["#b9a77a", "#d6c48f", "#9a8a5f"] }[land];
      box(ctx, ox + x0, oy + G0, BW, YARD.H - G0, tone(grassC(GROUND[0], st), st, 0.4), S);
      for (let i = 3 + Math.floor(x0 / 13) * 13; i < x1; i += 13) { box(ctx, ox + i, oy + G0 + 5 + (((i * 11) % 38) + 38) % 38, 4, 1, tone(GROUND[1], st, 0.45), S); }
      for (let i = 5 + Math.floor(x0 / 17) * 17; i < x1; i += 17) { box(ctx, ox + i, oy + G0 + 9 + (((i * 7) % 30) + 30) % 30, 2, 1, tone(GROUND[2], st, 0.4), S); }
      box(ctx, ox + 64, oy + 68, Math.max(0, x1 - 64), 6, tone("#b7b2a6", st, 0.4), S);
      for (let i = 70; i < x1; i += 9) { box(ctx, ox + i, oy + 68, 1, 6, tone("#8f897d", st, 0.4), S); }
      box(ctx, ox + 64, oy + 68, Math.max(0, x1 - 64), 1, tone("#f4f8fc", st, 0.45), S);
    } else if (zid === "station") {
      const fuji = GardenSky.mix(tone("#6f86b5", st, 0.35), st.bottom, 0.35), fcap = tone("#f6f9ff", st, 0.45);
      const fx = 168;
      for (let i = Math.floor(x0); i < x1; i++) {
        const dd = Math.abs(i - fx), hh = Math.round(Math.min(24, 27 - dd * 0.5));
        if (hh > 3) {
          box(ctx, ox + i, oy + G0 - hh, 1, hh, fuji, S);
          if (hh > 15) { box(ctx, ox + i, oy + G0 - hh, 1, Math.min(hh - 15, 6) + ((i * 7) % 3 === 0 ? 1 : 0), fcap, S); }
        }
      }
      ctx.fillStyle = st.hills;
      for (let i = Math.floor(x0); i < x1; i++) {
        const hh = 4 + Math.round(2 * Math.sin(i / 13) + Math.sin(i / 5));
        ctx.fillRect((ox + i) * S, (oy + G0 - 6 - hh) * S, S, hh * S);
      }
      const f = fol(), golden = f ? f.land === "dry" : isAutumn();     // có chủ đề: lúa chín theo chủ đề, không thì theo tháng thật
      const ricec = golden ? tone("#e3c25a", st, 0.35) : tone(f && f.tint === "#ffc4d6" ? "#9be07a" : "#7cc95a", st, 0.35);
      const ricec2 = golden ? tone("#c9a23f", st, 0.35) : tone("#5fae45", st, 0.35);
      box(ctx, ox + x0, oy + G0 - 7, BW, 6, snowy(ricec, st), S);
      for (let y = G0 - 6; y < G0 - 1; y += 2) { box(ctx, ox + x0, oy + y, BW, 1, snowy(ricec2, st, 0.5), S); }
      for (let px = Math.floor(x0 / 40) * 40 + 20; px < x1; px += 40) {
        box(ctx, ox + px, oy + G0 - 17, 1, 15, tone("#6b4a36", st, 0.4), S); box(ctx, ox + px - 2, oy + G0 - 16, 5, 1, tone("#6b4a36", st, 0.4), S);
      }
      for (let i = Math.floor(x0); i < x1; i++) {
        const t = ((((i - 20) % 40) + 40) % 40) / 40;
        box(ctx, ox + i, oy + G0 - 16 + Math.round(Math.sin(Math.PI * t) * 2), 1, 1, tone("#3a3a55", st, 0.4), S);
      }
      box(ctx, ox + x0, oy + G0 - 1, BW, 3, tone("#9a8f78", st, 0.4), S);
      const tx = trainX(now);
      if (tx !== null) { drawTrain(ctx, S, ox, oy, tx, G0 - 1, st); }
      box(ctx, ox + x0, oy + G0 - 1, BW, 1, tone("#5a5a6a", st, 0.4), S);
      for (let i = Math.floor(x0 / 3) * 3; i < x1; i += 3) { box(ctx, ox + i, oy + G0, 1, 1, tone("#6b4a36", st, 0.4), S); }
      box(ctx, ox + x0, oy + G0 + 2, BW, YARD.H - G0 - 2, snowy(grassC(tone("#6cc35a", st), st), st), S);
      box(ctx, ox + x0, oy + G0 + 1, BW, 2, snowy(tone("#b5a98f", st), st, 0.5), S);
      for (let i = 3 + Math.floor(x0 / 7) * 7; i < x1; i += 7) { box(ctx, ox + i, oy + G0 + 5 + (((i * 13) % 40) + 40) % 40, 1, 1, tone("#4fa040", st), S); }
    }
  }

  // ---- cảnh ----
  function skyColors() {
    const st = skyNow();
    return st ? [st.top, st.bottom] : ["#8fd3ff", "#c4ecff"];
  }

  // 1.25.4: số hàng trời thêm phía trên cảnh (cỡ cảnh Lớn) — drawOutdoor đặt trong lúc vẽ nền vùng
  let skyPad = 0;
  // Bầu trời: dải màu, sao, mặt trời / mặt trăng theo giờ, mây theo thời tiết.
  function drawSky(ctx, S, ox, oy, now, x0, x1, H, st) {
    const W = x1 - x0, mix = GardenSky.mix;
    const bands = 7;
    for (let b = 0; b < bands; b++) {
      const y0 = Math.floor(H * b / bands), y1 = Math.floor(H * (b + 1) / bands);
      box(ctx, ox + x0, oy + y0, W, y1 - y0, mix(st.top, st.bottom, b / (bands - 1)), S);
    }
    if (st.light < 0.6 && st.clouds < 8) {
      const n = Math.floor(W / 9);
      for (let i = 0; i < n; i++) {
        const x = x0 + ((i * 53 + 7) % Math.max(1, Math.floor(W))), y = (i * 29 + 3) % Math.max(4, H - 8);
        if ((Math.floor(now / 650) + i) % 6) { box(ctx, ox + x, oy + y + 1, 1, 1, i % 4 ? "#ffffff" : "#ffe9a8", S); }
      }
    }
    const span = YARD.W - 24;
    if (st.sun && st.weather !== "rain" && st.weather !== "storm") {
      const x = 8 + st.sun.x * span, y = H - 7 - st.sun.y * (H - 11);
      const col = (st.phase === "dawn" || st.phase === "dusk") ? P.o : P.y;
      ctx.globalAlpha = 0.25; box(ctx, ox + x - 2, oy + y - 2, 13, 13, col, S); ctx.globalAlpha = 1;
      box(ctx, ox + x, oy + y, 9, 9, col, S); box(ctx, ox + x + 1, oy + y + 1, 3, 2, "#fff6c8", S);
    }
    if (st.moon && st.light < 0.62) {
      const x = 8 + st.moon.x * span, y = H - 7 - st.moon.y * (H - 11);
      if (st.bigMoon && SEA()) { SEA().bigMoon(ctx, S, ox + x - 2, oy + y - 3, st); }     // trăng rằm / trăng Halloween
      else {
        box(ctx, ox + x, oy + y, 7, 7, "#fff6c8", S);
        box(ctx, ox + x + 3, oy + y - 1, 5, 6, mix(st.top, st.bottom, 0.3), S);
      }
    }
    if (st.rainbow > 0.02) {      // cầu vồng sau cơn mưa (sau mặt trời, trước mây)
      const cols = ["#ff4f6d", "#ff9f1c", "#ffd23f", "#3ccb5e", "#3d8bff", "#7b2cbf"];
      const cx = 176, cy = H + 14;
      ctx.globalAlpha = 0.32 * st.rainbow;
      for (let b = 0; b < cols.length; b++) {
        const r = 36 - b * 1.6;
        ctx.fillStyle = cols[b];
        for (let i = Math.max(Math.floor(x0), Math.floor(cx - r)); i <= Math.min(x1, cx + r); i++) {
          const yy = cy - Math.sqrt(Math.max(0, r * r - (i - cx) * (i - cx)));
          if (yy < H - 1) { ctx.fillRect(Math.round((ox + i) * S), Math.round((oy + yy) * S), S, Math.ceil(S * 1.6)); }
        }
      }
      ctx.globalAlpha = 1;
    }
    if (st.light < 0.45 && st.clouds <= 6) {      // sao băng thỉnh thoảng
      const per = 13000, cyc = Math.floor(now / per), t = now % per;
      if (t < 650) {
        const sx = x0 + W * (0.1 + 0.7 * hash01(cyc * 3 + 7)), sy = 2 + hash01(cyc * 5 + 1) * 6, p = t / 650;
        for (let k = 0; k < 7; k++) {
          ctx.globalAlpha = (1 - k / 7) * (p < 0.8 ? 1 : (1 - p) / 0.2);
          box(ctx, ox + sx + p * 26 - k * 1.6, oy + sy + p * 9 - k * 0.55, 1, 1, k ? "#fff6c8" : "#ffffff", S);
        }
        ctx.globalAlpha = 1;
      }
    }
    const grey = st.weather === "storm" ? "#6b7088" : st.weather === "rain" ? "#9aa0b5" : st.weather === "cloudy" ? "#d4d8e2" : "#ffffff";
    const cloudCol = GardenSky.shade(grey, 0.55 + 0.45 * st.light);
    for (let i = 0; i < st.clouds; i++) {
      const speed = 380 + i * 47;
      const wrap = W + 60;
      const x = x0 - 30 + ((now / speed + i * 61) % wrap);
      const y = 2 + ((i * 7) % Math.max(4, H - 14));
      const w = 14 + (i * 5) % 12;
      box(ctx, ox + x, oy + y + 2, w, 4, cloudCol, S); box(ctx, ox + x + 3, oy + y, Math.round(w * 0.55), 2, cloudCol, S);
    }
    if (st.light > 0.6 && !st.rain && !st.snow) {      // đàn chim bay ngang trời ban ngày
      const per = 27000, t = now % per;
      if (t < 11000) {
        const fx = x0 - 20 + (W + 40) * t / 11000, fy = 6 + Math.sin(now / 900) * 1.5, up = Math.floor(now / 170) % 2;
        ctx.fillStyle = GardenSky.shade("#3a3a55", 0.6 + 0.4 * st.light);
        [[0, 0], [-5, 2], [-5, -2], [-10, 3], [-10, -3]].forEach(([dx, dy], k) => {
          const bx = Math.round(fx + dx), by = Math.round(fy + dy), u = (up + k) % 2;
          ctx.fillRect((ox + bx) * S, (oy + by) * S, S, S);
          ctx.fillRect((ox + bx - 1) * S, (oy + by - u) * S, S, S); ctx.fillRect((ox + bx + 1) * S, (oy + by - u) * S, S, S);
        });
      }
    }
    if (SEA()) { SEA().skyExtra(ctx, S, ox, oy, now, x0, x1, H, st); }
  }

  const HOUSE_W = 64;                 // cột 0–3: nhà hoặc công trình của vùng
  function hash01(n) {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  // Vũng nước khi mưa: vẽ ở lớp MẶT ĐẤT (trước nhà, công trình và đồ vật) nên không bao giờ đè lên nhà.
  // Không đặt vũng ở cột nhà / công trình. Có gợn tròn khi giọt mưa rơi xuống.
  function drawPuddles(ctx, S, ox, oy, now, x0, x1, st) {
    if (!st.rain) { return; }
    const G0 = YARD.SKY, big = st.rain > 1.4 ? 3 : 0;
    const water = GardenSky.mix(GardenSky.shade("#7fb6e6", 0.5 + 0.5 * st.light), st.bottom, 0.3);
    const edge = GardenSky.shade(water, 0.78), shine = GardenSky.mix(water, "#ffffff", 0.55);
    for (let n = Math.floor(x0 / 34) - 1; n * 34 < x1; n++) {
      if (hash01(n * 3 + 1) < 0.3) { continue; }
      const w = 7 + Math.floor(hash01(n * 5 + 2) * 6) + big, h = w > 10 ? 3 : 2;
      const px = n * 34 + Math.floor(hash01(n * 7 + 3) * 22), py = G0 + 9 + Math.floor(hash01(n * 11 + 4) * (YARD.H - G0 - 14));
      if (px + w > -2 && px < HOUSE_W + 2) { continue; }
      ctx.globalAlpha = 0.72;
      box(ctx, ox + px + 1, oy + py, w - 2, h, water, S);
      box(ctx, ox + px, oy + py + 1, w, h - 1, water, S);
      box(ctx, ox + px + 1, oy + py + h, w - 2, 1, edge, S);
      box(ctx, ox + px + 2, oy + py, Math.max(1, Math.floor(w / 3)), 1, shine, S);
      const per = 700 + (n % 4) * 90, tt = now + n * 211, ph = (tt % per) / per, cyc = Math.floor(tt / per);
      const rx = px + 2 + Math.floor(hash01(n * 13 + cyc) * (w - 4)), ry = py + Math.floor(h / 2);
      const r = 1 + Math.floor(ph * 2.5);
      ctx.globalAlpha = 0.9 * (1 - ph);
      box(ctx, ox + rx - r, oy + ry, 1, 1, shine, S); box(ctx, ox + rx + r, oy + ry, 1, 1, shine, S);
      if (r >= 2) { box(ctx, ox + rx - 1, oy + ry - 1, 3, 1, shine, S); }
      ctx.globalAlpha = 1;
    }
  }

  // Mưa / tuyết / chớp: tính theo thời gian, không cần lưu hạt.
  function drawWeather(ctx, S, ox, oy, now, x0, x1, H, st, groundY) {
    const W = x1 - x0;
    if (st.rain) {
      const n = Math.floor(W * H / 60 * st.rain);
      ctx.fillStyle = st.light > 0.5 ? "#4f8fd8" : "#8fb4e8";
      for (let i = 0; i < n; i++) {
        const sx = (i * 97.13) % W, sy = (i * 57.71) % H;
        const x = x0 + ((sx + now * 0.02 * (1 + st.rain * 0.3)) % W);
        const y = (sy + now * 0.12 * (0.8 + st.rain * 0.4)) % H;
        ctx.fillRect(Math.round((ox + x) * S), Math.round((oy + y) * S), Math.max(1, S / 2), S * 3);
      }
      if (groundY !== undefined) {       // giọt mưa bắn lên khi chạm đất (chỉ trên nền trống, không đè nhà / công trình)
        const n2 = Math.floor(W / 10 * st.rain);
        ctx.fillStyle = st.light > 0.5 ? "#b9dcf7" : "#8fb4e8";
        for (let i = 0; i < n2; i++) {
          const per = 520 + (i % 5) * 70, tt = now + i * 137, cyc = Math.floor(tt / per), ph = (tt % per) / per;
          const px = Math.floor(x0 + hash01(i * 31 + cyc * 7) * W), py = Math.floor(groundY + 3 + hash01(i * 17 + cyc * 13) * (H - groundY - 5));
          if (px > -3 && px < HOUSE_W + 3) { continue; }
          ctx.globalAlpha = ph < 0.5 ? 0.7 : 0.7 * (1 - ph) * 2;
          const d = ph < 0.5 ? 1 : 2;
          ctx.fillRect(Math.round((ox + px - d) * S), Math.round((oy + py - d) * S), S, S);
          ctx.fillRect(Math.round((ox + px + d) * S), Math.round((oy + py - d) * S), S, S);
          if (ph < 0.25) { ctx.fillRect(Math.round((ox + px) * S), Math.round((oy + py) * S), S, S); }
        }
        ctx.globalAlpha = 1;
      }
    }
    if (st.snow) {
      const n = Math.floor(W * H / 90);
      ctx.fillStyle = "#ffffff";
      for (let i = 0; i < n; i++) {
        const sx = (i * 89.3) % W, sy = (i * 41.7) % H;
        const x = x0 + ((sx + Math.sin(now / 900 + i) * 3 + now * 0.004) % W);
        const y = (sy + now * 0.018) % H;
        ctx.fillRect(Math.round((ox + x) * S), Math.round((oy + y) * S), S, S);
      }
    }
    if (st.flash > 0) {
      ctx.globalAlpha = 0.55 * (1 - st.flash);
      box(ctx, ox + x0, oy, W, H, "#ffffff", S);
      ctx.globalAlpha = 1;
      const bx = x0 + ((Math.floor(now / 997) * 71) % Math.max(1, W - 20)) + 10;
      ctx.fillStyle = "#fff6a8";
      let x = bx;
      for (let y = 0; y < Math.min(24, H); y += 3) { x += ((y * 7) % 5) - 2; ctx.fillRect(Math.round((ox + x) * S), Math.round((oy + y) * S), S, 3 * S); }
    }
  }

  // Ban đêm: phủ tối nhẹ rồi thắp lại các nguồn sáng.
  function drawNight(ctx, S, ox, oy, x0, x1, H, st) {
    const dark = Math.max(0, 0.55 - st.light) * 0.75;
    if (dark > 0.01) {
      ctx.globalAlpha = dark; box(ctx, ox + x0, oy, x1 - x0, H, "#0b0b2a", S); ctx.globalAlpha = 1;
    }
    if (st.light < 0.6) {
      lights.forEach((l) => {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "#ffd23f";
        ctx.beginPath(); ctx.arc((ox + l.x) * S, (oy + l.y) * S, l.r * S, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 0.9;
        box(ctx, ox + l.x - 1, oy + l.y - 1, 2, 2, "#fff6c8", S);
        ctx.globalAlpha = 1;
      });
    }
    lights.length = 0;
  }

  function placedSorted(list) {
    return list.map((e, i) => Object.assign({ index: i }, e)).sort((a, b) => (a.y - b.y) || (a.x - b.x));
  }

  // Khung sprite của một món trong cảnh (toạ độ nghệ thuật)
  function itemBox(e, sceneName) {
    const it = item(e.id) || { w: 1, place: "ground" };   // gọi trước để món tự làm kịp giải mã
    const spr = SPR[e.id];
    if (!spr) { return null; }
    const w = spr[0].length, h = spr.length;
    let cellBottom;
    if (isOut(sceneName)) { cellBottom = YARD.SKY + (e.y + 1) * T; }
    else if (it.place === "wall") { cellBottom = ROOM.WALL_Y + Math.round((T + h) / 2); }
    else { cellBottom = ROOM.FLOOR + e.y * T - (it.place === "rug" ? 3 : 1); }
    return { x: e.x * T + Math.floor((it.w * T - w) / 2), y: cellBottom - h, w: w, h: h, it: it, spr: spr };
  }
  // ---- gió, mùa, tàu: dùng chung cho chuyển động và hiệu ứng ----
  function windOf(st) {
    if (!st) { return 0.5; }
    return { storm: 2.2, rain: 1.2, cloudy: 0.9, snow: 0.6, sunny: 0.5 }[st.weather] || 0.5;
  }
  function monthNow() { return new Date().getMonth() + 1; }
  function isAutumn() { const m = monthNow(); return m >= 9 && m <= 11; }
  // Tàu ở Ga làng quê: chạy qua mỗi 40 giây (toạ độ cảnh, từ -400 tới 660)
  const TRAIN = { period: 40000, dur: 16000, from: -400, to: 660 };
  function trainX(now) {
    const t = now % TRAIN.period;
    return t < TRAIN.dur ? TRAIN.from + (TRAIN.to - TRAIN.from) * t / TRAIN.dur : null;
  }
  function trainNear(now) { const x = trainX(now); return x !== null && x > -190 && x < 400; }

  // Chuyển động nhẹ của từng món: [lệch ngang, lệch dọc]
  const SWAY = { furin: 500, koinobori: 500, nobori: 500, scarecrow: 1100, palm: 1500, omen: 800, ema: 900,
    sunflower: 1300, sasa: 900 };
  function motion(e, it, now, sceneName) {
    let xs = 0, ys = 0;
    const amp = isOut(sceneName) && windOf(skyNow()) >= 2 ? 2 : 1;      // giông: đồ đung đưa mạnh hơn
    if (SWAY[e.id]) { xs = Math.round(Math.sin(now / (SWAY[e.id] / (amp > 1 ? 1.6 : 1)) + e.x) * amp); }
    else if (e.id === "maneki" && Math.floor(now / 600) % 2) { ys = -1; }
    else if (e.id === "crab") { xs = Math.round(Math.sin(now / 380 + e.x * 1.7) * 2); }
    else if (e.id === "taiko" && (now + e.x * 300) % 1600 < 140) { ys = -1; }
    else if (e.id === "flowers") { xs = Math.sin(now / 900 + e.x * 2) > (amp > 1 ? 0.2 : 0.75) ? 1 : 0; }
    else if (e.id === "swimring") { ys = Math.round(Math.sin(now / 700 + e.x)); }
    else if (e.id === "daruma" && Math.floor(now / 250 + e.x * 3) % 12 < 2) { xs = Math.floor(now / 250) % 2 ? 1 : -1; }
    else if (e.id === "panda" && Math.floor(now / 280 + e.x) % 3 === 0) { ys = -1; }
    else if (e.id === "takenoko" && (now + e.x * 900) % 7000 < 260) { ys = -1; }
    else if (e.id === "monkey" && (now + e.x * 500) % 2400 < 900) { ys = -1; }
    else if (e.id === "radio" && (now + e.x * 100) % 500 < 90) { ys = -1; }
    else if (ART && ART.motion(e, now, amp)) { const m = ART.motion(e, now, amp); xs = m[0]; ys = m[1]; }
    else if (it.custom && it.fx) {
      if (it.fx === "sway") { xs = Math.round(Math.sin(now / 600 + e.x) * amp); }
      else if (it.fx === "bounce") { ys = -Math.round(Math.abs(Math.sin(now / 350 + e.x)) * 2); }
      else if (it.fx === "float") { ys = -Math.round(1.5 + Math.sin(now / 900 + e.x) * 1.5); }
      else if (it.fx === "notes" && (now + e.x * 100) % 500 < 90) { ys = -1; }
    }
    if (justPlaced && justPlaced.scene === sceneName && justPlaced.x === e.x && justPlaced.y === e.y && justPlaced.id === e.id) {
      const t = now - justPlaced.at;
      if (t < 450) { ys -= Math.round(4 * Math.sin(Math.PI * t / 450)); }
    }
    return [xs, ys];
  }
  let justPlaced = null;      // món vừa đặt: nảy lên một cái

  // Hình vẽ trong cảnh: khung hoạt hình / phần tĩnh / hình theo mùa – thời tiết
  function sceneSprite(e, it, spr, now, sceneName, st, ghost) {
    if (ghost && BASE[e.id]) { return spr; }      // bóng mờ khi đang đặt: hình đầy đủ (phần động không vẽ cho bóng mờ)
    if (e.id === "fountain" && st && (st.snow || st.cover)) { return ALT.fountain.bang; }
    if (e.id === "rice" && isAutumn()) { return ALT.rice.vang; }
    const fr = FRAMES[e.id];
    if (fr) {
      const wind = windOf(st);
      if (e.id === "kazaguruma") {
        const gap = wind >= 2 ? 55 : wind >= 1.2 ? 95 : wind >= 0.9 ? 150 : 260;
        return isOut(sceneName) ? fr[Math.floor(now / gap + e.x * 3) % fr.length] : fr[0];
      }
      if (e.id === "bicycle") { return isOut(sceneName) && wind >= 0.9 ? fr[Math.floor(now / (wind >= 2 ? 90 : 220)) % 2] : fr[0]; }
      if (e.id === "shishiodoshi") { const t = (now + e.x * 700) % 5200; return fr[t >= 3800 && t < 4500 ? 1 : 0]; }
      if (e.id === "fumikiri") { return sceneName === "station" && trainNear(now) ? fr[1 + Math.floor(now / 380) % 2] : fr[0]; }
    }
    if (RARE) { const f = RARE.frameOf(e, now); if (f) { return f; } }
    if (NHA) { const f = NHA.frameOf(e, now); if (f) { return f; } }
    if (FIND) { const f = FIND.frameOf(e, now); if (f) { return f; } }
    if (ART) { const f = ART.frameOf(e, now); if (f) { return f; } }
    return BASE[e.id] || spr;
  }
  // Vẽ sprite co giãn theo chiều ngang (hiệu ứng "xoay" của món tự làm)
  function spriteSquash(ctx, rowsArr, x, y, S, pal, alpha, k) {
    const w = rowsArr[0].length, cx = w / 2;
    if (alpha !== undefined) { ctx.globalAlpha = alpha; }
    for (let j = 0; j < rowsArr.length; j++) {
      for (let i = 0; i < w; i++) {
        const c = rowsArr[j].charAt(i);
        if (c === ".") { continue; }
        const tx = Math.round(cx + (i + 0.5 - cx) * k - 0.5);
        ctx.fillStyle = (k < 0 && c !== "k") ? GardenSky.shade(pal[c] || c, 0.82) : (pal[c] || c);
        ctx.fillRect(Math.round((x + tx) * S), Math.round((y + j) * S), S, S);
      }
    }
    ctx.globalAlpha = 1;
  }
  // Tuyết đọng trên đỉnh món đồ (cache theo sprite)
  const topCache = new WeakMap();
  function topProfile(rowsArr) {
    let tp = topCache.get(rowsArr);
    if (!tp) {
      tp = [];
      for (let i = 0; i < rowsArr[0].length; i++) {
        let j = 0;
        while (j < rowsArr.length && rowsArr[j].charAt(i) === ".") { j++; }
        tp.push(j < rowsArr.length ? j : -1);
      }
      topCache.set(rowsArr, tp);
    }
    return tp;
  }
  function drawSnowCap(ctx, S, X, Y, rowsArr) {
    const tp = topProfile(rowsArr);
    ctx.fillStyle = "#f4f8ff";
    for (let i = 0; i < tp.length; i++) {
      const j = tp[i];
      if (j < 0) { continue; }
      const l = i > 0 ? tp[i - 1] : -1, r = i < tp.length - 1 ? tp[i + 1] : -1;
      if ((l >= 0 && l < j - 2) && (r >= 0 && r < j - 2)) { continue; }   // khe hẹp giữa hai chỗ cao
      ctx.fillRect(Math.round((X + i) * S), Math.round((Y + j) * S), S, S);
      if ((l < 0 || Math.abs(l - j) <= 1) && (r < 0 || Math.abs(r - j) <= 1)) {
        ctx.fillRect(Math.round((X + i) * S), Math.round((Y + j + 1) * S), S, S);
      }
    }
  }
  // Đồ phát sáng ban đêm: [độ cao tâm sáng tính từ đỉnh, bán kính]
  const GLOW = { lantern: [6, 14], chochin: [6, 14], lamp: [2, 14], andon: [11, 14], milk: [12, 15], vending: [10, 15],
    hotaru: [8, 9], irori: [15, 16] };

  function drawItem(ctx, S, ox, oy, e, sceneName, now, tod, alpha) {
    const bx = itemBox(e, sceneName);
    if (!bx) { return; }
    const it = bx.it, w = bx.w, h = bx.h, x = bx.x;
    const st = skyNow();
    const spr = sceneSprite(e, it, bx.spr, now, sceneName, st, alpha !== undefined);
    let y = bx.y;
    const mv = motion(e, it, now, sceneName);
    const xs = mv[0];
    y += mv[1];
    const night = tod !== "day";
    let pal = P;
    if (e.id === "tv") { pal = Object.assign({}, P, { l: ["#8fd3ff", "#6be08a", "#ffd23f", "#ff7fa0"][Math.floor(now / 700) % 4] }); }
    else if (e.id === "lantern" || e.id === "chochin") { pal = Object.assign({}, P, { y: (night && Math.floor(now / 300) % 3 === 0) ? P.o : P.y }); }
    else if (e.id === "andon" && night) { pal = Object.assign({}, P, { c: "#ffe9a8", h: "#ffd27a" }); }
    else if ((e.id === "milk" || e.id === "vending") && night) { pal = Object.assign({}, P, { l: "#d8f4ff", c: "#fff6d8" }); }
    else if (e.id === "hotaru" && night) { pal = Object.assign({}, P, { l: "#2b3a6b", w: "#3d4f8a", y: Math.floor(now / 260) % 2 ? "#fff36a" : "#c8e04a" }); }
    else if (RARE && RARE.pal(e, night)) { pal = RARE.pal(e, night); }
    else if (NHA && NHA.pal(e, night)) { pal = NHA.pal(e, night); }
    else if (ART) { pal = ART.pal(e, night, now) || P; }
    const g = GLOW[e.id] || (it.custom && (it.fx === "glow" || it.fx === "pulse") ? [h / 2, Math.max(10, h * 0.7)] : null);
    if (g && night) {
      ctx.globalAlpha = (0.13 + 0.05 * Math.sin(now / 400 + e.x)) * (alpha === undefined ? 1 : alpha) * (it.fx === "pulse" ? 0.6 + 0.6 * Math.abs(Math.sin(now / 600 + e.x)) : 1);
      ctx.fillStyle = P.y;
      ctx.beginPath(); ctx.arc((ox + x + w / 2) * S, (oy + y + g[0]) * S, g[1] * S, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (it.custom && it.fx === "spin") {
      spriteSquash(ctx, spr, ox + x, oy + y, S, pal, alpha, Math.cos(now / 520 + e.x));
    } else {
      sprite(ctx, spr, ox + x + xs, oy + y, S, pal, alpha);
    }
    if (it.custom && it.fx === "pulse") {   // nhấp nháy: phủ sáng theo nhịp
      const k = Math.max(0, Math.sin(now / 420 + e.x));
      if (k > 0.05) { sprite(ctx, spr.map((r) => r.replace(/[^.]/g, "w")), ox + x + xs, oy + y, S, P, 0.38 * k * (alpha === undefined ? 1 : alpha)); }
    }
    if (alpha === undefined && g && night) {
      lights.push({ x: x + w / 2, y: y + g[0], r: Math.max(9, g[1] - 2) });
    }
    if (alpha === undefined && st && (st.snow || st.cover) && isOut(sceneName) && !(it.custom && it.fx === "spin")) {
      drawSnowCap(ctx, S, ox + x + xs, oy + y, spr);
    }
    if (alpha === undefined) { drawItemExtra(ctx, S, ox, oy, e, x + xs, y, w, h, now, tod, sceneName); }
    if (e.id === "pond") {
      const t = now / 1600 + e.x;
      const fx = ox + x + 16 + Math.round(Math.cos(t) * 8), fy = oy + y + 8 + Math.round(Math.sin(t) * 2);
      box(ctx, fx, fy, 3, 2, P.o, S); box(ctx, fx + (Math.cos(t + 1.6) > 0 ? -1 : 3), fy, 1, 1, P.w, S);
      const t2 = now / 2100 + 2;
      const gx = ox + x + 16 + Math.round(Math.cos(t2) * 6), gy = oy + y + 8 + Math.round(Math.sin(t2) * 2);
      box(ctx, gx, gy, 3, 2, P.w, S); box(ctx, gx + 1, gy, 1, 1, P.r, S);
      box(ctx, ox + x + 7, oy + y + 6, 3, 2, P.G, S);
    }
    if (e.id === "kingyo") {
      for (let f = 0; f < 3; f++) {
        const t = now / (1400 + f * 500) + e.x * 2 + f * 2.1;
        const fx2 = ox + x + 16 + Math.round(Math.cos(t) * 11), fy2 = oy + y + 7 + Math.round(Math.sin(t * 1.7));
        box(ctx, fx2, fy2, 2, 1, f === 1 ? P.r : P.o, S); box(ctx, fx2 + (Math.sin(t) > 0 ? -1 : 2), fy2, 1, 1, P.y, S);
      }
    }
    if (e.id === "lighthouse" && tod !== "day" && alpha === undefined) {
      const lx = ox + x + 8, ly = oy + y + 8, dir = Math.sin(now / 1300);
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = "#fff6a8";
      ctx.beginPath(); ctx.moveTo(lx * S, ly * S);
      ctx.lineTo((lx + dir * 70) * S, (ly - 9) * S); ctx.lineTo((lx + dir * 70) * S, (ly + 7) * S); ctx.fill();
      ctx.globalAlpha = 1;
      lights.push({ x: x + 8, y: y + 8, r: 12 });
    }
    if (e.id === "clock") {
      const d = new Date();
      const cx = ox + x + 7, cy = oy + y + 7;
      const hand = (ang, len, c) => {
        for (let k = 1; k <= len; k++) { box(ctx, Math.round(cx + Math.sin(ang) * k) - 0.5, Math.round(cy - Math.cos(ang) * k) - 0.5, 1, 1, c, S); }
      };
      hand(((d.getHours() % 12) + d.getMinutes() / 60) / 12 * Math.PI * 2, 2, P.k);
      hand(d.getMinutes() / 60 * Math.PI * 2, 4, P.R);
    }
    if (e.id === "cat") {
      const zt = (now / 1200) % 2;
      ctx.globalAlpha = zt < 1 ? zt : 2 - zt;
      ctx.fillStyle = P.d;
      ctx.font = "bold " + Math.round(5 * S) + "px monospace";
      ctx.fillText("z", (ox + x + 4) * S, (oy + y - 2 - zt * 3) * S);
      ctx.globalAlpha = 1;
    }
  }

  // Vẽ thêm trên món đồ: chim đậu ghế, cờ hòm thư, gợn ao, sóng trống, cờ lâu đài cát
  function drawItemExtra(ctx, S, ox, oy, e, x, y, w, h, now, tod, sceneName) {
    const X = ox + x, Y = oy + y;
    if (e.id === "bench" && tod === "day" && !(typeof GardenGuests !== "undefined" && GardenGuests.taken(sceneName) === e.x + "," + e.y)) {
      const ph = ((now / 1000 + e.x * 7) % 19 + 19) % 19;
      if (ph < 6) {
        const hop = Math.floor(now / 180) % 6 === 0 ? 1 : 0, bxp = X + 3 + Math.floor(ph) % 3 * 3;
        box(ctx, bxp, Y - 3 - hop, 3, 2, "#6b4a36", S); box(ctx, bxp + 2, Y - 4 - hop, 2, 2, "#6b4a36", S);
        box(ctx, bxp + 3, Y - 4 - hop, 1, 1, P.k, S); box(ctx, bxp + 4, Y - 3 - hop, 1, 1, P.o, S); box(ctx, bxp + 1, Y - 2 - hop, 2, 1, P.h, S);
      }
    } else if (e.id === "mailbox") {
      // Đã nối báo 畑新聞: cờ đỏ dựng khi có số chưa đọc. Chưa nối: thỉnh thoảng có thư cho vui.
      const ps = H && H.data && H.data() && H.data().paper;
      const ph = ((now / 1000 + e.x * 5) % 12 + 12) % 12;
      const hasMail = ps && ps.enabled ? ps.unread > 0 : ph < 3;
      if (hasMail) {   // có thư: cờ đỏ dựng lên + phong thư ló ra
        const wave = ps && ps.enabled && Math.floor(now / 400) % 2 ? 1 : 0;
        box(ctx, X + w - 1, Y - 2, 1, 6, P.k, S); box(ctx, X + w, Y - 2 + wave, 3, 2, P.r, S);
        box(ctx, X + 3, Y + 2, 5, 1, P.w, S);
      }
    } else if (e.id === "pond") {
      const ph = ((now / 1000 + e.x) % 3.2 + 3.2) % 3.2;
      ctx.globalAlpha = Math.max(0, 0.6 - ph / 3.2 * 0.6);
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, S / 2);
      ctx.beginPath(); ctx.ellipse((X + 10 + (e.x % 3) * 4) * S, (Y + 6) * S, (1 + ph * 3) * S, (0.5 + ph) * S, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else if (e.id === "taiko") {
      const t = ((now + e.x * 300) % 1600 + 1600) % 1600;
      if (t < 420) {
        ctx.globalAlpha = 0.7 * (1 - t / 420);
        ctx.strokeStyle = "#ffffff"; ctx.lineWidth = Math.max(1, S / 2);
        ctx.beginPath(); ctx.arc((X + w / 2) * S, (Y + 8) * S, (9 + t / 40) * S, -2.6, -0.5); ctx.stroke();
        ctx.globalAlpha = 1;
      }
    } else if (e.id === "sandcastle") {
      if (Math.floor(now / 350) % 2) { box(ctx, X + 15, Y + 2, 1, 1, P.r, S); }
    } else if (EXTRA17[e.id]) {
      EXTRA17[e.id](ctx, S, X, Y, e, now, tod, sceneName);
    }
  }

  // ---- 1.7: phần vẽ động của đồ mới ----
  const DIGIT = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001",
    "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
  function digits(ctx, S, X, Y, n, col) {
    const str = String(n);
    str.split("").forEach((ch, k) => {
      const d = DIGIT[Number(ch)];
      for (let q = 0; q < 15; q++) { if (d[q] === "1") { box(ctx, X + k * 4 + (q % 3), Y + Math.floor(q / 3), 1, 1, col, S); } }
    });
    return str.length * 4 - 1;
  }
  const EXTRA17 = {
    birdhouse: function (ctx, S, X, Y, e, now, tod) {
      if (tod !== "day") { return; }
      const ph = ((now / 1000 + e.x * 3.7) % 9 + 9) % 9;
      if (ph < 4) {
        const peek = ph < 0.3 || ph > 3.7 ? 0 : 1;
        box(ctx, X + 5, Y + 9 - peek, 3, 2, "#8a5a34", S); box(ctx, X + 6, Y + 9 - peek, 1, 1, P.k, S);
        box(ctx, X + 8, Y + 10 - peek, 1, 1, P.o, S);
        if (Math.floor(now / 400) % 5 === 0) { box(ctx, X + 4, Y + 10 - peek, 1, 1, "#6b4426", S); }
      }
    },
    well: function (ctx, S, X, Y, e, now) {
      const t = ((now / 1000 + e.x * 2.3) % 12 + 12) % 12;
      const off = t < 6 ? Math.round(4 * Math.sin(Math.PI * t / 6)) : 0;
      const by = 12 - off;
      for (let yy = 8; yy < by; yy++) { box(ctx, X + 8, Y + yy, 1, 1, P.S, S); }
      box(ctx, X + 6, Y + by, 5, 4, P.k, S); box(ctx, X + 7, Y + by, 3, 3, P.b, S); box(ctx, X + 7, Y + by + 1, 3, 1, P.B, S);
      if (off > 0 && t > 3 && Math.floor(now / 200) % 2) { box(ctx, X + 7 + Math.floor(now / 150) % 3, Y + by + 4, 1, 1, P.l, S); }
    },
    swing: function (ctx, S, X, Y, e, now) {
      const wind = windOf(skyNow());
      const dx = Math.round(Math.sin(now / 650 + e.x) * (wind >= 2 ? 4 : 3));
      [10, 21].forEach((ax) => {
        for (let yy = 4; yy < 24; yy++) { box(ctx, X + ax + Math.round(dx * (yy - 4) / 20), Y + yy, 1, 1, P.S, S); }
      });
      box(ctx, X + 8 + dx, Y + 23, 16, 4, P.k, S); box(ctx, X + 9 + dx, Y + 24, 14, 2, P.b, S); box(ctx, X + 9 + dx, Y + 24, 14, 1, P.t, S);
    },
    fountain: function (ctx, S, X, Y, e, now) {
      const st = skyNow();
      if (st && (st.snow || st.cover)) { return; }
      const k = Math.floor(now / 140) % 2;
      box(ctx, X + 15, Y + 0 - k, 2, 3 + k, P.l, S); box(ctx, X + 15 + k, Y - k, 1, 1, P.w, S);
      for (let i = 0; i < 3; i++) { box(ctx, X + 6 + ((Math.floor(now / 180) + i * 7) % 20), Y + 18, 2, 1, P.w, S); }
    },
    noren: function (ctx, S, X, Y, e, now) {
      const wind = windOf(skyNow());
      NOREN_CLOTH_OL.forEach((r, j) => {
        const sh = Math.round(Math.sin(now / 520 + e.x + j * 0.25) * j / 14 * (wind >= 2 ? 3 : 1.6));
        sprite(ctx, [r], X + 2 + sh, Y + 3 + j, S);
      });
    },
    calendar: function (ctx, S, X, Y) {
      const d = new Date();
      const mw = String(d.getMonth() + 1).length * 4 - 1;
      digits(ctx, S, X + 7 - Math.floor(mw / 2), Y + 3, d.getMonth() + 1, P.w);
      const dw = String(d.getDate()).length * 4 - 1;
      digits(ctx, S, X + 7 - Math.floor(dw / 2), Y + 8, d.getDate(), d.getDay() === 0 ? P.R : d.getDay() === 6 ? P.u : P.k);
      for (let i = 0; i < 7; i++) { box(ctx, X + 3 + i + Math.floor(i / 2) * 0, Y + 14, 1, 1, i === d.getDay() ? P.r : P.s, S); }
    },
    aquarium: function (ctx, S, X, Y, e, now) {
      for (let f = 0; f < 2; f++) {
        const t = now / (1700 + f * 600) + e.x + f * 2;
        const fx = X + 4 + Math.round((Math.sin(t) * 0.5 + 0.5) * 7), fy = Y + 4 + f * 2 + Math.round(Math.sin(t * 2.3) * 0.6);
        const right = Math.cos(t) > 0;
        box(ctx, fx, fy, 2, 1, f ? P.o : P.r, S); box(ctx, right ? fx - 1 : fx + 2, fy, 1, 1, f ? P.y : P.p, S);
      }
    },
    irori: function (ctx, S, X, Y, e, now, tod) {
      const cols = [P.r, P.o, P.y];
      for (let k = 0; k < 4; k++) {
        const hh = 1 + ((Math.floor(now / 110) + k * 2) % 3);
        const fx = X + 11 + k * 3;
        box(ctx, fx, Y + 16 - hh, 2, hh, cols[(k + Math.floor(now / 160)) % 3], S);
        box(ctx, fx + (k % 2), Y + 16 - hh - 1, 1, 1, P.y, S);
      }
      if (tod !== "day") { ctx.globalAlpha = 0.18; box(ctx, X + 8, Y + 12, 16, 5, P.o, S); ctx.globalAlpha = 1; }
    },
    ukiyoe: function (ctx, S, X, Y, e, now) {
      const k = Math.floor(now / 500) % 3;
      [[6, 5], [10, 3], [13, 5]].forEach(([x, y], i) => { if (i !== k) { box(ctx, X + x, Y + y, 1, 1, P.w, S); } });
    },
    hotaru: function (ctx, S, X, Y, e, now, tod) {
      if (tod === "day") { return; }
      for (let i = 0; i < 3; i++) {
        const t = now / 700 + i * 2.1 + e.x;
        if (Math.sin(t * 2.7) > -0.2) { box(ctx, X + 4 + Math.round((Math.sin(t) + 1) * 1.5), Y + 5 + Math.round((Math.cos(t * 1.3) + 1) * 3), 1, 1, "#fff36a", S); }
      }
    },
    shishiodoshi: function (ctx, S, X, Y, e, now) {
      const t = (now + e.x * 700) % 5200;
      if (t < 3800) { const yy = Math.floor(now / 90) % 3; box(ctx, X + 6, Y + 6 + yy, 1, 1, P.l, S); }
      if (t >= 3800 && t < 4500) { box(ctx, X + 3 + Math.floor(now / 100) % 3, Y + 13, 2, 1, P.w, S); }
      if (t >= 4500 && t < 4750) {     // "cốc!" khi đầu ống gõ xuống đá
        ctx.globalAlpha = 1 - (t - 4500) / 250;
        box(ctx, X + 15, Y + 10, 1, 2, P.w, S); box(ctx, X + 17, Y + 11, 1, 1, P.w, S); box(ctx, X + 13, Y + 9, 1, 1, P.w, S);
        ctx.globalAlpha = 1;
      }
    },
    monkey: function (ctx, S, X, Y, e, now) {
      if ((now + e.x * 333) % 4200 < 180) { box(ctx, X + 7, Y + 7, 1, 1, P.p, S); box(ctx, X + 9, Y + 7, 1, 1, P.p, S); }
    },
    rotenburo: function (ctx, S, X, Y, e, now) {
      for (let i = 0; i < 3; i++) { box(ctx, X + 7 + ((Math.floor(now / 260) + i * 6) % 17), Y + 6 + (i % 2), 2, 1, P.w, S); }
    },
    vending: function (ctx, S, X, Y, e, now, tod) {
      const k = Math.floor(now / 300 + e.x) % 10;
      if (k < 5) { box(ctx, X + 3 + k * 2, Y + (k % 2 ? 13 : 8), 1, 1, tod === "day" ? P.r : "#ff8a8a", S); }
      box(ctx, X + 3, Y + 17, 4, 1, Math.floor(now / 600) % 2 ? P.a : P.f, S);
    },
    milk: function (ctx, S, X, Y, e, now) {
      const k = Math.floor(now / 450 + e.x) % 3;
      box(ctx, X + 4 + k * 3, Y + 18, 1, 1, P.r, S);
    },
    sunflower: function (ctx, S, X, Y, e, now, tod) {
      const st = skyNow();
      if (tod !== "day" || (st && (st.rain || st.snow))) { return; }
      const t = now / 900 + e.x;
      const bx2 = X + 7 + Math.round(Math.cos(t) * 9), by2 = Y + 7 + Math.round(Math.sin(t * 2) * 3);
      box(ctx, bx2, by2, 2, 1, P.y, S); box(ctx, bx2 + 1, by2, 1, 1, P.k, S);
      if (Math.floor(now / 90) % 2) { box(ctx, bx2, by2 - 1, 1, 1, P.w, S); }
    },
    panda: function (ctx, S, X, Y, e, now) {
      if (Math.floor(now / 280 + e.x) % 3 === 0) { box(ctx, X + 8, Y + 8, 1, 1, P.k, S); }
    },
    fumikiri: function (ctx, S, X, Y, e, now, tod, sceneName) {
      if (sceneName === "station" && trainNear(now) && tod !== "day") {
        const on = Math.floor(now / 380) % 2;
        ctx.globalAlpha = 0.3; box(ctx, X + (on ? 7 : 0), Y + 10, 7, 7, P.r, S); ctx.globalAlpha = 1;
      }
    }
  };

  // 1.8: đồ theo Mùa & Lễ hội (sprite + chuyển động ở season_art.js)
  if (typeof GardenSeasonArt !== "undefined") {
    ART = GardenSeasonArt.install({ grid, rect, disc, dot, outline, rows, gline, ellipseFill, compose, SPR, FRAMES, BASE, SWAY, GLOW,
      EXTRA: EXTRA17, P, box, sprite, windOf, skyNow, isOut });
  }
  // 1.16: món hiếm mới của rương nhiệm vụ (sprite + chuyển động ở rare_art.js)
  if (typeof GardenRareArt !== "undefined") {
    RARE = GardenRareArt.install({ grid, rect, disc, dot, outline, rows, gline, ellipseFill, SPR, ALT, GLOW, EXTRA: EXTRA17, P, box });
  }
  // 1.24: đồ Bếp / Phòng ngủ + nền hai gian bên (nha_art.js)
  if (typeof GardenNhaArt !== "undefined") {
    NHA = GardenNhaArt.install({ grid, rect, disc, dot, outline, rows, SPR, ALT, GLOW, P, box });
  }
  // 1.28: quà đủ bộ Hộp sưu tầm + món chỉ có ở gánh hàng rong (finds_art.js)
  if (typeof GardenFindArt !== "undefined") {
    FIND = GardenFindArt.install({ SPR, ALT, GLOW, EXTRA: EXTRA17, P, box });
  }
  // 1.25.5: bản sửa hình gốc (fix.js) — khung "spr" (cửa hàng + cảnh), "f<i>" (FRAMES khác spr), "base" (phần tĩnh)
  if (typeof GardenFix !== "undefined") {
    const isRows = (r) => Array.isArray(r) && r.length > 0 && typeof r[0] === "string";
    GardenFix.register("do", {
      frames: function (id) {
        const out = {}, s = SPR[id];
        if (!isRows(s)) { return out; }
        out.spr = s;
        (FRAMES[id] || []).forEach((f, i) => { if (isRows(f) && f !== s) { out["f" + i] = f; } });
        if (isRows(BASE[id]) && BASE[id] !== s) { out.base = BASE[id]; }
        Object.keys(ALT[id] || {}).forEach((n) => { if (isRows(ALT[id][n])) { out[n] = ALT[id][n]; } });
        return out;
      },
      set: function (id, name, r) {
        if (name === "spr") {
          const old = SPR[id];
          SPR[id] = r;
          (FRAMES[id] || []).forEach((f, i) => { if (f === old) { FRAMES[id][i] = r; } });
          if (BASE[id] === old) { BASE[id] = r; }
        } else if (name === "base") { BASE[id] = r; }
        else if (/^f\d+$/.test(name) && FRAMES[id]) { FRAMES[id][Number(name.slice(1))] = r; }
        else if (ALT[id] && ALT[id][name]) { ALT[id][name] = r; }
      },
      pal: () => P
    });
  }

  // Hạt phát ra từ món đồ (chỉ tính cho cảnh đang xem)
  function emit(sceneName, e, dt, night) {
    const bx = itemBox(e, sceneName);
    if (!bx) { return; }
    const r = Math.random(), it = bx.it;
    const add = (o) => addPart(sceneName, o);
    if (e.id === "tea" && r < dt * 1.6) {
      add({ kind: "steam", x: bx.x + 4 + Math.random() * 3, y: bx.y + 1, vx: 0.8 + Math.random(), vy: -4 - Math.random() * 2, life: 1.8 });
    } else if (e.id === "momiji" && r < dt * 1.1) {
      add({ kind: "leaf", x: bx.x + 4 + Math.random() * (bx.w - 8), y: bx.y + 6 + Math.random() * 10, vx: 3 + Math.random() * 4, vy: 5 + Math.random() * 3, life: 3.2 });
    } else if ((e.id === "maneki" || e.id === "saisen") && r < dt * 0.5) {
      add({ kind: "spark", x: bx.x + 2 + Math.random() * (bx.w - 4), y: bx.y + 2 + Math.random() * 6, vx: 0, vy: -2, life: 0.7 });
    } else if (e.id === "ringoame" && r < dt * 0.8) {
      add({ kind: "spark", x: bx.x + 3 + Math.random() * 12, y: bx.y + 8, vx: 0, vy: -1.5, life: 0.6 });
    } else if (e.id === "kitsune" && night && r < dt * 1.2) {
      add({ kind: "wisp", x: bx.x + 2 + Math.random() * (bx.w - 4), y: bx.y + 2 + Math.random() * 6, vx: (Math.random() - 0.5) * 3, vy: -3 - Math.random() * 2, life: 2.2 });
    } else if (e.id === "temizuya" && r < dt * 2.5) {
      add({ kind: "drip", x: bx.x + 9 + Math.floor(Math.random() * 4) * 5, y: bx.y + 13, vx: 0, vy: 9, life: 0.28 });
    } else if (e.id === "kingyo" && r < dt * 1.4) {
      add({ kind: "bubble", x: bx.x + 5 + Math.random() * (bx.w - 10), y: bx.y + 6, vx: 0, vy: -3, life: 0.7 });
    } else if (it.custom && it.fx === "sparkle" && r < dt * 1.3) {
      add({ kind: "spark", x: bx.x + Math.random() * bx.w, y: bx.y + Math.random() * bx.h, vx: 0, vy: -2, life: 0.7 });
    } else if (it.custom && it.fx === "hearts" && r < dt * 0.9) {
      add({ kind: "heart", x: bx.x + 2 + Math.random() * (bx.w - 4), y: bx.y + 2, vx: (Math.random() - 0.5) * 3, vy: -5, life: 1.5 });
    } else if ((e.id === "radio" || (it.custom && it.fx === "notes")) && r < dt * 0.9) {
      add({ kind: "note", x: bx.x + (e.id === "radio" ? 12 : bx.w / 2), y: bx.y + 2, vx: 2 + Math.random() * 3, vy: -5, life: 1.7,
        color: ["#ff4f6d", "#3d8bff", "#c77dff", "#2e8b3a"][Math.floor(Math.random() * 4)] });
    } else if (it.custom && it.fx === "bubbles" && r < dt * 1.6) {
      add({ kind: "bubble2", x: bx.x + Math.random() * bx.w, y: bx.y + bx.h * 0.4, vx: (Math.random() - 0.5) * 2, vy: -6, life: 1.4 });
    } else if (e.id === "aquarium" && r < dt * 1.5) {
      add({ kind: "bubble", x: bx.x + 4 + Math.random() * 8, y: bx.y + 8, vx: 0, vy: -5, life: 1 });
    } else if (e.id === "irori" && r < dt * 2) {
      if (Math.random() < 0.7) { add({ kind: "steam", x: bx.x + 24, y: bx.y + 9, vx: 2 + Math.random() * 2, vy: -4 - Math.random() * 2, life: 1.6 }); }
      else { add({ kind: "ember", x: bx.x + 12 + Math.random() * 8, y: bx.y + 13, vx: (Math.random() - 0.5) * 3, vy: -6, life: 0.6 }); }
    } else if (e.id === "fountain" && r < dt * 16 && !(skyNow() && (skyNow().snow || skyNow().cover))) {
      add({ kind: "jet", x: bx.x + 15.5 + (Math.random() - 0.5), y: bx.y + 1, vx: (Math.random() < 0.5 ? -1 : 1) * (5 + Math.random() * 5),
        vy: -12 - Math.random() * 6, life: 0.95 });
    } else if (e.id === "rotenburo" && r < dt * 3) {
      add({ kind: "steam2", x: bx.x + 6 + Math.random() * 20, y: bx.y + 5, vx: (Math.random() - 0.5) * 2, vy: -4 - Math.random() * 2, life: 2.4 });
    } else if (e.id === "monkey" && r < dt * 0.7) {
      add({ kind: "steam2", x: bx.x + 4 + Math.random() * 8, y: bx.y + 1, vx: (Math.random() - 0.5), vy: -3, life: 1.8 });
    } else if (e.id === "hotaru" && night && r < dt * 0.8) {
      add({ kind: "firefly", x: bx.x + 5, y: bx.y + 3, vx: (Math.random() - 0.5) * 6, vy: -2 - Math.random() * 3, life: 4 + Math.random() * 2 });
    } else if (e.id === "shishiodoshi" && r < dt * 1.2) {
      const t = (Date.now() + e.x * 700) % 5200;
      if (t >= 3800 && t < 4500) { add({ kind: "drip", x: bx.x + 3 + Math.random() * 3, y: bx.y + 12, vx: 0, vy: 8, life: 0.25 }); }
    } else if (RARE && RARE.ids.indexOf(e.id) >= 0) {
      RARE.emit(e, bx, dt, night, add);
    } else if (NHA && NHA.ids.indexOf(e.id) >= 0) {
      NHA.emit(e, bx, dt, night, add);
    } else if (ART && it.season) {
      ART.emit(e, bx, dt, night, add);
    }
  }
  function burst(sceneName, e) {   // vừa đặt: bụi + lấp lánh
    const bx = itemBox(e, sceneName);
    if (!bx || !partsOf(sceneName)) { return; }
    const cx = bx.x + bx.w / 2, by = bx.y + bx.h;
    for (let k = 0; k < 6; k++) { addPart(sceneName, { kind: "smoke", x: cx - 6 + k * 2.2, y: by - 2, vx: (k - 2.5) * 3, vy: -3 - Math.random() * 3, life: 0.7 }); }
    for (let k = 0; k < 5; k++) { addPart(sceneName, { kind: "spark", x: bx.x + Math.random() * bx.w, y: bx.y + Math.random() * bx.h, vx: 0, vy: -4, life: 0.8 }); }
  }

  function addPart(sceneName, o) { o.t = 0; partsOf(sceneName).push(o); if (partsOf(sceneName).length > 80) { partsOf(sceneName).shift(); } }

  // Hạt môi trường: theo vùng (hơi nước suối nóng, lá tre) và theo mùa thật (xuân: cánh hoa, hè: chuồn chuồn, thu: lá đỏ)
  function ambient(sceneName, dt) {
    const st = skyNow();
    const wet = st && (st.rain || st.snow);
    const add = (o) => addPart(sceneName, o);
    if (sceneName === "onsen" && Math.random() < dt * 2.2) {
      add({ kind: "steam2", x: 16 + Math.random() * 34, y: 20 + Math.random() * 6, vx: 1 + Math.random() * 2, vy: -4 - Math.random() * 2, life: 2.6 });
    }
    if (sceneName === "bamboo" && !wet && Math.random() < dt * 0.6) {
      add({ kind: "bleaf", x: 60 + Math.random() * 200, y: -2, vx: 3 + Math.random() * 3, vy: 5 + Math.random() * 3, life: 6 });
    }
    if (wet || !st) { return; }
    if (SEA() && SEA().active()) { return; }      // đang dùng giao diện mùa: hạt bay do season.js vẽ
    const m = monthNow(), wind = windOf(st);
    if ((m === 3 || m === 4) && Math.random() < dt * 0.9) {
      add({ kind: "petal", x: 20 + Math.random() * 260, y: -2, vx: 3 + wind * 4, vy: 8 + Math.random() * 4, life: 8 });
    } else if (m >= 9 && m <= 11 && Math.random() < dt * 0.7 * wind) {
      add({ kind: "leaf", x: 20 + Math.random() * 260, y: -2, vx: 3 + wind * 5, vy: 8 + Math.random() * 4, life: 8 });
    } else if (m >= 6 && m <= 8 && st.light > 0.6 && Math.random() < dt * 0.12) {
      const left = Math.random() < 0.5;
      add({ kind: "tonbo", x: left ? 60 : 250, y: 30 + Math.random() * 25, vx: (left ? 1 : -1) * (8 + Math.random() * 6), vy: 0, life: 9 });
    }
  }

  function stepParts(sceneName, dt) {
    const home = homeState();
    const list = partsOf(sceneName);
    if (!list) { return; }
    if (sceneName === "yard") {
      const sty = home.house >= 7 ? (home.style || "classic") : "classic";
      // 1.24: đã mở Bếp → ống khói bốc khói dày hơn (đang nấu ăn)
      if (home.house >= 6 && (sty === "classic" || sty === "minka") && Math.random() < dt * ((home.rooms || []).indexOf("kitchen") >= 0 ? 3.6 : 2.2)) {
        const sx = sty === "minka" ? 31 : 47, sy = sty === "minka" ? 11 : 9;
        addPart("yard", { kind: "smoke", x: sx + Math.random() * 2, y: sy, vx: 2 + Math.random() * 3, vy: -6 - Math.random() * 3, life: 2.6 });
      }
    }
    if (isOut(sceneName)) { ambient(sceneName, dt); }
    {
      const night = timeOfDay() !== "day";
      (home[sceneName] || []).forEach((e) => {
        emit(sceneName, e, dt, night);
        if (e.id === "hanabi" && night && Math.random() < dt * 0.8) {
          addPart(sceneName, { kind: "rocket", x: e.x * T + 8, y: YARD.SKY + (e.y + 1) * T - 14, vx: (Math.random() - 0.5) * 6,
            vy: -38 - Math.random() * 10, life: 0.5 + Math.random() * 0.35, color: ["#ff4f6d", "#ffd23f", "#8fd3ff", "#c77dff", "#6be08a"][Math.floor(Math.random() * 5)] });
        }
        if (e.id === "sakura" && Math.random() < dt * 1.2) {
          addPart(sceneName, { kind: "petal", x: e.x * T + 4 + Math.random() * 26, y: YARD.SKY + (e.y + 1) * T - 30 + Math.random() * 10,
            vx: 4 + Math.random() * 4, vy: 6 + Math.random() * 4, life: 3 });
        }
        if (e.id === "statue" && Math.random() < dt * 0.8) {
          addPart(sceneName, { kind: "spark", x: e.x * T + 2 + Math.random() * 12, y: YARD.SKY + (e.y + 1) * T - 18 + Math.random() * 10, vx: 0, vy: -2, life: 0.7 });
        }
      });
    }
    for (let i = list.length - 1; i >= 0; i--) {
      const q = list[i];
      q.t += dt; q.x += q.vx * dt; q.y += q.vy * dt;
      if (q.kind === "petal") { q.x += Math.sin(q.t * 4) * 0.08; }
      if (q.kind === "fw") { q.vy += 14 * dt; }
      if (q.kind === "jet") { q.vy += 34 * dt; }
      if (q.kind === "leaf" || q.kind === "wisp" || q.kind === "bleaf") { q.x += Math.sin(q.t * 3 + q.y) * 0.12; }
      if (q.kind === "firefly") { q.vx += (Math.random() - 0.5) * 18 * dt; q.vy += (Math.random() - 0.55) * 14 * dt; q.vx *= 0.98; q.vy *= 0.98; }
      if (q.kind === "tonbo") { q.y += Math.sin(q.t * 2.3) * 0.15; if (Math.random() < dt * 0.6) { q.vx = -q.vx; } }
      if (q.kind === "heart" || q.kind === "note") { q.x += Math.sin(q.t * 5) * 0.1; }
      if (ART) { ART.stepPart(q, dt); }
      if (q.t > q.life) {
        list.splice(i, 1);
        if (q.kind === "rocket") {   // nổ thành chùm sáng
          for (let k = 0; k < 18; k++) {
            const a = k / 18 * Math.PI * 2, sp = 10 + Math.random() * 6;
            addPart(sceneName, { kind: "fw", x: q.x, y: q.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.9 + Math.random() * 0.4, color: q.color });
          }
        }
      }
    }
  }

  function drawParts(ctx, S, ox, oy, sceneName) {
    partsOf(sceneName).forEach((q) => {
      const k = q.t / q.life;
      if (ART && ART.drawPart(ctx, S, ox, oy, q, k)) { ctx.globalAlpha = 1; return; }
      if (q.kind === "smoke") {
        ctx.globalAlpha = 0.55 * (1 - k);
        const s = 2 + Math.floor(k * 3);
        box(ctx, ox + q.x, oy + q.y, s, s, "#e8e8f0", S);
      } else if (q.kind === "petal") {
        ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
        box(ctx, ox + q.x, oy + q.y, 1, 1, Math.floor(q.t * 5) % 2 ? P.p : P.P, S);
      } else if (q.kind === "spark") {
        ctx.globalAlpha = 1 - k;
        box(ctx, ox + q.x, oy + q.y, 1, 1, P.y, S); box(ctx, ox + q.x - 1, oy + q.y, 1, 1, P.w, S);
      } else if (q.kind === "steam") {
        ctx.globalAlpha = 0.5 * (1 - k);
        box(ctx, ox + q.x, oy + q.y, 1 + Math.floor(k * 2), 1 + Math.floor(k * 2), "#ffffff", S);
      } else if (q.kind === "leaf") {
        ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
        box(ctx, ox + q.x, oy + q.y, 1, 1, Math.floor(q.t * 4) % 2 ? P.r : P.o, S);
      } else if (q.kind === "wisp") {
        const a = (k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8);
        ctx.globalAlpha = 0.3 * a; box(ctx, ox + q.x - 1, oy + q.y - 1, 3, 3, "#8fd3ff", S);
        ctx.globalAlpha = 0.9 * a; box(ctx, ox + q.x, oy + q.y, 1, 1, "#e8f7ff", S);
      } else if (q.kind === "drip") {
        box(ctx, ox + q.x, oy + q.y, 1, 1, P.l, S);
      } else if (q.kind === "bubble") {
        ctx.globalAlpha = 0.8 * (1 - k);
        box(ctx, ox + q.x, oy + q.y, 1, 1, P.w, S);
      } else if (q.kind === "rocket") {
        box(ctx, ox + q.x, oy + q.y, 1, 2, "#fff6c8", S);
      } else if (q.kind === "fw") {
        ctx.globalAlpha = Math.max(0, 1 - k);
        box(ctx, ox + q.x, oy + q.y, 1, 1, k < 0.25 ? "#ffffff" : q.color, S);
      } else if (q.kind === "heart") {
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        const hx = ox + Math.round(q.x), hy = oy + Math.round(q.y);
        box(ctx, hx, hy, 1, 1, P.r, S); box(ctx, hx + 2, hy, 1, 1, P.r, S); box(ctx, hx, hy + 1, 3, 1, P.r, S); box(ctx, hx + 1, hy + 2, 1, 1, P.r, S);
        box(ctx, hx, hy, 1, 1, P.p, S);
      } else if (q.kind === "note") {
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        const nx = ox + Math.round(q.x), ny = oy + Math.round(q.y);
        box(ctx, nx + 1, ny, 1, 3, q.color, S); box(ctx, nx, ny + 2, 2, 2, q.color, S); box(ctx, nx + 2, ny, 1, 1, q.color, S);
      } else if (q.kind === "bubble2") {
        ctx.globalAlpha = 0.85 * (1 - k);
        box(ctx, ox + q.x, oy + q.y, 2, 2, "#bfe9ff", S); box(ctx, ox + q.x, oy + q.y, 1, 1, P.w, S);
      } else if (q.kind === "ember") {
        ctx.globalAlpha = 1 - k;
        box(ctx, ox + q.x, oy + q.y, 1, 1, k < 0.4 ? P.y : P.o, S);
      } else if (q.kind === "jet") {
        ctx.globalAlpha = 0.9 * (1 - k * 0.6);
        box(ctx, ox + q.x, oy + q.y, 1, 1, k < 0.3 ? P.w : P.l, S);
      } else if (q.kind === "steam2") {
        ctx.globalAlpha = 0.42 * (k < 0.15 ? k / 0.15 : 1 - k);
        const sz = 2 + Math.floor(k * 4);
        box(ctx, ox + q.x - sz / 2, oy + q.y, sz, sz, "#ffffff", S);
      } else if (q.kind === "firefly") {
        const a = (k < 0.1 ? k / 0.1 : k > 0.8 ? (1 - k) / 0.2 : 1) * (0.5 + 0.5 * Math.abs(Math.sin(q.t * 4)));
        ctx.globalAlpha = 0.3 * a; box(ctx, ox + q.x - 1, oy + q.y - 1, 3, 3, "#fff6a8", S);
        ctx.globalAlpha = a; box(ctx, ox + q.x, oy + q.y, 1, 1, "#ffe95c", S);
      } else if (q.kind === "bleaf") {
        ctx.globalAlpha = k > 0.8 ? (1 - k) / 0.2 : 1;
        box(ctx, ox + q.x, oy + q.y, 2, 1, Math.floor(q.t * 3) % 2 ? P.g : P.f, S);
      } else if (q.kind === "tonbo") {
        ctx.globalAlpha = k < 0.1 ? k / 0.1 : k > 0.9 ? (1 - k) / 0.1 : 1;
        const tx = ox + Math.round(q.x), ty = oy + Math.round(q.y), dir = q.vx > 0 ? 1 : -1;
        box(ctx, tx - 2 * dir, ty, 4, 1, P.R, S); box(ctx, tx + (dir > 0 ? 2 : -2), ty, 1, 1, P.k, S);
        const up = Math.floor(q.t * 18) % 2;
        box(ctx, tx - 1, ty - 1 + up, 1, 1, "#d8f4ff", S); box(ctx, tx + 1, ty - 1 + up, 1, 1, "#d8f4ff", S);
      } else if (q.kind === "splash") {
        ctx.globalAlpha = 0.8 * (1 - k);
        box(ctx, ox + q.x, oy + q.y, 1, 1, "#d8f4ff", S);
      }
      ctx.globalAlpha = 1;
    });
  }


  // ---------------------------------------------------------------------
  // 1.14: vùng tự tạo — nền theo kiểu đã chọn + màu đất / đồi, công trình 64×76 vẽ bằng Xưởng
  // ---------------------------------------------------------------------
  const lmCache = {};
  function lmRows(z) {
    if (!z || !z.lm) { return null; }
    if (lmCache[z.id] && lmCache[z.id].code === z.lm) { return lmCache[z.id].rows; }
    let out = "", num = "";
    for (const ch of z.lm) { if (ch >= "0" && ch <= "9") { num += ch; continue; } out += ch.repeat(num ? Number(num) : 1); num = ""; }
    const W = 64, Hh = 76;
    const rows = out.length === W * Hh ? Array.from({ length: Hh }, (_, j) => out.slice(j * W, (j + 1) * W)) : null;
    lmCache[z.id] = { code: z.lm, rows: rows };
    return rows;
  }
  function drawUzoneBg(ctx, S, ox, oy, now, z, x0, x1, st) {
    const G0 = YARD.SKY, BW = x1 - x0, bg = z.bg || "meadow";
    drawSky(ctx, S, ox, oy - skyPad, now, x0, x1, G0 + skyPad, st);
    const hill = snowy(tone(z.hills || "#7ed98a", st, 0.35), st, 0.5), hill2 = GardenSky.shade(hill, 0.85);
    const ground = snowy(tone(z.ground || "#5ed35e", st), st), dark = GardenSky.shade(ground, 0.86), lite = GardenSky.mix(ground, "#ffffff", 0.3);
    if (bg === "lake") {
      const water = GardenSky.mix(tone("#5aa9e6", st, 0.3), st.bottom, 0.3);
      for (let i = Math.floor(x0); i < x1; i++) { const h = 6 + Math.round(3 * Math.sin(i / 23) + 2 * Math.sin(i / 9)); box(ctx, ox + i, oy + 14 - h, 1, h, hill, S); }
      box(ctx, ox + x0, oy + 14, BW, G0 - 14, water, S);
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < Math.ceil(BW / 10) + 2; i++) { const x = x0 + ((i * 23 + now / 160) % (BW + 10)) - 5; box(ctx, ox + x, oy + 17 + (i % 3) * 3, 3, 1, "#ffffff", S); }
      ctx.globalAlpha = 1;
    } else if (bg === "rock") {
      for (let i = Math.floor(x0); i < x1; i++) {
        const k = ((i % 37) + 37) % 37, h = 4 + Math.round(16 * (1 - Math.abs(k - 18) / 18)) + ((i * 7) % 3);
        box(ctx, ox + i, oy + G0 - h, 1, h, k % 9 === 0 ? hill2 : hill, S);
        if (h > 15) { box(ctx, ox + i, oy + G0 - h, 1, 2, snowy(tone("#e8eef6", st, 0.4), st), S); }
      }
    } else if (bg === "town") {
      for (let n = Math.floor(x0 / 14) - 1; n * 14 < x1; n++) {
        const h = 6 + Math.floor(hash01(n * 5 + 1) * 9), w = 10 + Math.floor(hash01(n * 3) * 4), x = n * 14;
        box(ctx, ox + x, oy + G0 - h, w, h, hill, S); box(ctx, ox + x - 1, oy + G0 - h - 2, w + 2, 2, hill2, S);
        if (st.light < 0.6 && hash01(n * 11) < 0.7) { box(ctx, ox + x + 3, oy + G0 - h + 3, 2, 2, "#ffd23f", S); }
      }
    } else if (bg === "forest") {
      for (let n = Math.floor(x0 / 7) - 1; n * 7 < x1; n++) {
        const h = 10 + Math.floor(hash01(n * 7 + 3) * 8), cx = n * 7 + 3;
        for (let j = 0; j < h; j++) { const w = Math.max(1, Math.round((j / h) * 4)); box(ctx, ox + cx - w, oy + G0 - h + j, w * 2 + 1, 1, j % 4 === 3 ? hill2 : hill, S); }
      }
    } else {   // đồng cỏ / đồi hoa / cát / tuyết: đồi thoải
      const amp = bg === "sand" ? 2 : 3;
      for (let i = Math.floor(x0); i < x1; i++) {
        const hh = 5 + Math.round(amp * Math.sin(i / (bg === "sand" ? 31 : 17)) + 2 * Math.sin(i / 7));
        box(ctx, ox + i, oy + G0 - hh, 1, hh, hill, S);
        if (bg === "flower" && (i * 13) % 7 === 0) { box(ctx, ox + i, oy + G0 - hh, 1, 1, tone(["#ff7fa0", "#ffd23f", "#ffffff"][i % 3], st, 0.4), S); }
      }
    }
    box(ctx, ox + x0, oy + G0, BW, YARD.H - G0, ground, S);
    box(ctx, ox + x0, oy + G0, BW, 1, dark, S);
    for (let i = 3 + Math.floor(x0 / 9) * 9; i < x1; i += 9) {
      const y = oy + G0 + 4 + (i * 7) % 42;
      if (bg === "flower") { box(ctx, ox + i, y, 1, 1, tone(["#ff7fa0", "#ffd23f", "#ffffff", "#c77dff"][(i / 9) % 4 | 0], st), S); }
      else if (bg === "sand") { box(ctx, ox + i, y, 3, 1, dark, S); }
      else if (bg === "snow") { if ((i + Math.floor(now / 500)) % 4 === 0) { box(ctx, ox + i, y, 1, 1, "#ffffff", S); } }
      else if (bg === "rock") { box(ctx, ox + i, y, 2, 1, GardenSky.shade(ground, 0.7), S); box(ctx, ox + i, y - 1, 1, 1, lite, S); }
      else if (bg === "town") { if ((i / 9 | 0) % 2) { box(ctx, ox + i - 3, y, 6, 1, dark, S); } }
      else { box(ctx, ox + i, y, 1, 1, dark, S); box(ctx, ox + i + 1, y - 1, 1, 1, lite, S); }
    }
    if (bg === "town") { box(ctx, ox + x0, oy + G0 + 20, BW, 1, dark, S); }
  }
  // 1.16: cảnh nền tự vẽ 256×76 (trên nền có sẵn, dưới công trình và đồ) — giải nén một lần thành ảnh rồi vẽ phóng to
  const envCache = {};
  function envCanvas(z) {
    if (!z || !z.env) { return null; }
    const c = envCache[z.id];
    if (c && c.code === z.env) { return c.cv; }
    let out = "", num = "";
    for (const ch of z.env) { if (ch >= "0" && ch <= "9") { num += ch; continue; } out += ch.repeat(num ? Number(num) : 1); num = ""; }
    const W = YARD.W, Hh = YARD.H;
    let cv = null;
    if (out.length === W * Hh) {
      cv = document.createElement("canvas"); cv.width = W; cv.height = Hh;
      const g = cv.getContext("2d");
      for (let j = 0; j < Hh; j++) {
        for (let i = 0; i < W; i++) { const ch = out[j * W + i]; if (ch !== ".") { g.fillStyle = P[ch] || "#ff00ff"; g.fillRect(i, j, 1, 1); } }
      }
    }
    envCache[z.id] = { code: z.env, cv: cv };
    return cv;
  }
  function drawUzEnv(ctx, S, ox, oy, z) {
    const cv = envCanvas(z);
    if (!cv) { return; }
    const sm = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(cv, ox * S, oy * S, cv.width * S, cv.height * S);
    ctx.imageSmoothingEnabled = sm;
  }
  // trời ban ngày cố định (nền dưới lưới vẽ của Xưởng)
  const DAY_SKY = { top: "#8fd3ff", bottom: "#c4ecff", light: 1, clouds: 2, tod: "day", rain: 0, snow: 0, flash: 0,
    sun: { x: 0.8, y: 0.8 }, moon: null, phase: "noon", weather: "sunny" };
  function drawUzLandmark(ctx, S, ox, oy, z, now, night) {
    const rows = lmRows(z);
    if (rows) { sprite(ctx, rows, ox, oy, S); return; }
    // chưa vẽ công trình: cái biển gỗ ghi tên vùng
    box(ctx, ox + 30, oy + 50, 3, 24, P.B, S);
    box(ctx, ox + 14, oy + 40, 36, 13, P.k, S); box(ctx, ox + 15, oy + 41, 34, 11, P.t, S);
    box(ctx, ox + 19, oy + 44, 26, 1, P.B, S); box(ctx, ox + 19, oy + 47, 18, 1, P.B, S);
  }

  // ---------------------------------------------------------------------
  // 1.14: nhà cũ dần — rêu (1), sơn bong (2), ngói lệch (3), dột khi mưa (4). Python tính nấc (more_view.wear).
  // Phủ lên đúng các điểm ảnh của ngôi nhà (đo một lần cho mỗi bậc / kiểu nhà) nên hợp với mọi kiểu nhà.
  // ---------------------------------------------------------------------
  const wearMasks = {};
  function wearLevel() { const v = moreView().wear; return (v && v.level) || 0; }
  function houseMask(level, style) {
    const key = level + "|" + style;
    if (wearMasks[key]) { return wearMasks[key]; }
    const cv = document.createElement("canvas"); cv.width = 64; cv.height = 76;
    const c = cv.getContext("2d");
    const keepSnow = snowRoof; snowRoof = false;
    const keepLights = lights.slice();
    drawHouse(c, 1, 0, 0, level, 0, "day", style);
    lights.length = 0; keepLights.forEach((l) => lights.push(l)); snowRoof = keepSnow;
    const d = c.getImageData(0, 0, 64, 76).data;
    const at = (x, y) => { const i = (y * 64 + x) * 4; return d[i + 3] > 0 ? [d[i], d[i + 1], d[i + 2]] : null; };
    let top = 76, bot = 0;
    for (let y = 0; y < 76; y++) { for (let x = 0; x < 64; x++) { if (at(x, y)) { top = Math.min(top, y); bot = Math.max(bot, y); } } }
    const Hh = Math.max(1, bot - top + 1), m = { roof: [], wall: [], base: [], top: top, bot: bot, eave: top };
    for (let y = top; y <= bot; y++) {
      for (let x = 0; x < 64; x++) {
        const c3 = at(x, y);
        if (!c3 || c3[0] + c3[1] + c3[2] < 150) { continue; }      // bỏ viền đen
        const rel = (y - top) / Hh, hex = "#" + c3.map((v) => v.toString(16).padStart(2, "0")).join("");
        if (rel < 0.42) { m.roof.push([x, y, hex]); m.eave = Math.max(m.eave, y); }
        else if (rel > 0.86) { m.base.push([x, y, hex]); }
        else { m.wall.push([x, y, hex]); }
      }
    }
    // chọn sẵn chỗ hư (cố định theo nhà, không nhảy mỗi khung)
    const pick = (list, n, salt) => { const out = []; for (let i = 0; i < n && list.length; i++) { out.push(list[Math.floor(hash01(i * 97 + salt) * list.length)]); } return out; };
    m.moss = m.base.filter(([x, y]) => hash01(x * 7 + y * 13) < 0.42).concat(m.wall.filter(([x, y]) => y > bot - 15 && hash01(x * 31 + y * 17) < (bot - y < 7 ? 0.3 : 0.1)));
    const blobs = pick(m.wall.filter(([, y]) => y < bot - 6), 6, 5);
    m.peel = m.wall.filter(([x, y]) => blobs.some(([bx, by]) => Math.abs(x - bx) + Math.abs(y - by) <= 2 + (bx % 2)));
    m.tiles = pick(m.roof.filter(([, y]) => y > top + 3), 7, 11);
    m.drips = pick(m.roof.filter(([, y]) => y >= m.eave - 1), 3, 23).map(([x]) => x);
    return (wearMasks[key] = m);
  }
  function shade(hex, k) { return typeof GardenSky !== "undefined" ? GardenSky.shade(hex, k) : hex; }
  function drawWear(ctx, S, ox, oy, home, now, st, lvl) {
    if (lvl === undefined) { lvl = wearLevel(); }
    if (!lvl || home.house < 3) { return; }
    const m = houseMask(home.house, home.house >= 7 ? (home.style || "classic") : "classic");
    const lt = st || { light: 1 };
    const t = (c) => (typeof GardenSky !== "undefined" ? tone(c, lt, 0.4) : c);
    m.moss.forEach(([x, y], i) => box(ctx, ox + x, oy + y, 1, 1, t(i % 3 ? "#5f8f3a" : "#86b04e"), S));
    if (lvl >= 2) { m.peel.forEach(([x, y, c], i) => box(ctx, ox + x, oy + y, 1, 1, t(i % 4 ? shade(c, 0.82) : "#c9b48f"), S)); }
    if (lvl >= 3) {
      m.tiles.forEach(([x, y, c]) => {
        box(ctx, ox + x - 1, oy + y, 3, 1, P.k, S);
        box(ctx, ox + x, oy + y + 1, 3, 2, t(shade(c, 0.72)), S);
      });
    }
    if (lvl >= 4) {
      m.drips.forEach((x, i) => {      // vệt nước dưới mái
        box(ctx, ox + x, oy + m.eave + 2, 1, 6 + (i % 2) * 3, t("#8f8a7a"), S);
      });
      if (lt.rain) {
        ctx.fillStyle = "#6fb0ec";
        m.drips.forEach((x, i) => {
          const per = 620 + i * 90, ph = ((now + i * 211) % per) / per, y = m.eave + 2 + ph * (m.bot - m.eave);
          ctx.fillRect(Math.round((ox + x) * S), Math.round((oy + y) * S), S, 2 * S);
        });
      }
    }
  }
  function drawRoomWear(ctx, S, ox, oy, now, st, lvl) {
    if (lvl === undefined) { lvl = wearLevel(); }
    if (!lvl) { return; }
    ctx.globalAlpha = 0.5;
    box(ctx, ox + 1, oy + ROOM.FLOOR - 7, 4, 4, "#6f8f4a", S); box(ctx, ox + 155, oy + ROOM.FLOOR - 6, 4, 3, "#6f8f4a", S);
    if (lvl >= 2) { box(ctx, ox + 10, oy + 7, 7, 5, "#b59d78", S); box(ctx, ox + 12, oy + 12, 3, 3, "#b59d78", S); box(ctx, ox + 134, oy + 14, 5, 6, "#b59d78", S); }
    if (lvl >= 3) { [[40, 6], [41, 7], [42, 7], [43, 8], [44, 9], [46, 9]].forEach(([x, y]) => box(ctx, ox + x, oy + y, 1, 1, P.k, S)); }
    ctx.globalAlpha = 1;
    if (lvl >= 4) {
      ctx.globalAlpha = 0.45; box(ctx, ox + 20, oy + 6, 10, 3, "#8f8a7a", S); box(ctx, ox + 23, oy + 9, 4, 2, "#8f8a7a", S); ctx.globalAlpha = 1;
      if (st && st.rain) {     // dột: nước nhỏ giọt xuống cái xô
        box(ctx, ox + 20, oy + 76, 10, 10, P.k, S); box(ctx, ox + 21, oy + 77, 8, 8, P.S, S); box(ctx, ox + 21, oy + 77, 8, 2, "#6fb0ec", S);
        const ph = (now % 700) / 700;
        box(ctx, ox + 25, oy + 10 + ph * 66, 1, 2, "#6fb0ec", S);
      }
    }
  }

  // ---- 1.14: thú nuôi (pets.js) — xếp lớp với đồ vật theo chân đứng
  // 1.21: cùng lớp với thú nuôi là khách ghé vườn (guests.js) — tắt "Thú nuôi, khách trên sân" thì ẩn cả hai
  function petsFor(sceneName, now, st, opts) {
    if (!isOpen && UIget("pets") === "off") { return []; }
    let list = typeof GardenPets !== "undefined" ? GardenPets.place(H.data(), sceneName, now, st, (ids) => spotsFor(sceneName, ids)) : [];
    if (typeof GardenGuests !== "undefined" && !(opts && opts.noGuests)) {
      const g = GardenGuests.place(sceneName, now, st, { spots: (ids) => spotsFor(sceneName, ids), seen: !!(opts && opts.seen),
        visTo: opts && Number.isFinite(opts.bgTo) ? opts.bgTo : YARD.W });
      if (g.length) { list = list.concat(g).sort((a, b) => a.base - b.base); }
    }
    const lf = opts && opts.noGuests ? [] : lifeFor(sceneName, now, st, opts);       // 1.30: StackChan sinh hoạt
    if (lf.length) { list = list.concat(lf).sort((a, b) => a.base - b.base); }
    return list;
  }
  // 1.30: StackChan đang sinh hoạt ở cảnh / gian này (life.js) — xếp lớp với đồ theo chân đứng như thú nuôi
  function lifeFor(sceneName, now, st, opts) {
    if (typeof GardenLife === "undefined" || (!isOpen && UIget("pets") === "off")) { return []; }
    if (isOpen && placing) { return []; }               // đang đặt đồ: không che ô
    return GardenLife.place(sceneName, now, st, { spots: (ids, sc) => spotsFor(sc || sceneName, ids), seen: !!(opts && opts.seen) });
  }
  function drawPetsBefore(ctx, S, ox, oy, list, state, base, now) {
    while (state.i < list.length && (base === null || list[state.i].base <= base)) {
      const e = list[state.i++];
      if (e.life) { GardenLife.draw(ctx, S, ox, oy, e, now); }
      else if (e.guest) { GardenGuests.draw(ctx, S, ox, oy, e, now); } else { GardenPets.draw(ctx, S, ox, oy, e, now); }
    }
  }
  // chỗ các món đồ ở cảnh (toạ độ nghệ thuật) để khách đứng / đậu cạnh món mình thích
  function spotsFor(sc, ids) {          // ids = "*": mọi món (để khách tránh đứng chồng lên đồ)
    if (!ids || !ids.length) { return []; }
    return placedSorted(homeState()[sc] || []).filter((e) => ids === "*" || ids.indexOf(e.id) >= 0).map((e) => {
      const b = itemBox(e, sc);
      return b ? { id: e.id, cx: b.x + b.w / 2, top: b.y, bottom: b.y + b.h, w: b.w, left: b.x, right: b.x + b.w, cell: e.x + "," + e.y } : null;
    }).filter(Boolean);
  }
  // 1.30: chỗ các món đồ trong cả nhà (toạ độ cả nhà 3 gian) — thú trong nhà tìm chỗ ưa thích
  function houseSpots(ids) {
    const rooms = homeState().rooms || [];
    let out = [];
    ["kitchen", "room", "bedroom"].forEach((k) => {
      if (k !== "room" && rooms.indexOf(k) < 0) { return; }
      const dx = HOUSE3.X[k];
      out = out.concat(spotsFor(k, ids).filter((sp) => sp.bottom >= ROOM.FLOOR).map((sp) => Object.assign({}, sp, { cx: sp.cx + dx, left: sp.left + dx, right: sp.right + dx })));
    });
    return out;
  }
  function guestsTop(ctx, S, ox, oy, sceneName, now, st, opts) {
    if (typeof GardenGuests === "undefined" || (opts && (opts.noGuests || opts.noPets)) || (!isOpen && UIget("pets") === "off")) { return; }
    GardenGuests.drawTop(ctx, S, ox, oy, sceneName, now, st);
  }

  function drawYard(ctx, S, ox, oy, now, opts) { drawOutdoor(ctx, S, ox, oy, now, "yard", opts); }
  function drawOutdoor(ctx, S, ox, oy, now, sceneName, opts) {
    const home = homeState();
    const st = skyNow() || { top: "#8fd3ff", bottom: "#c4ecff", light: 1, clouds: 2, tod: "day", ground: "#5ed35e",
      grass: "#45bf4a", hills: "#7ed98a", rain: 0, snow: 0, flash: 0, sun: { x: 0.8, y: 0.8 }, moon: null, phase: "noon", weather: "sunny" };
    const tod = st.tod;
    lights.length = 0;
    // nền có thể kéo dài ra hai bên cảnh (màn chính rộng hơn sân)
    const bx0 = (opts && opts.bgFrom !== undefined) ? opts.bgFrom : 0;
    const bx1 = (opts && opts.bgTo !== undefined) ? opts.bgTo : YARD.W;
    const BW = bx1 - bx0;
    snowRoof = !!(st.snow || st.cover);
    const sea = typeof GardenSky !== "undefined" ? SEA() : null;
    const uz = isUz(sceneName) ? (opts && opts.uz) || uzone(sceneName) : null;
    // 1.25.4 (cỡ cảnh Lớn, người dùng chọn A'): opts.padTop hàng trời thêm phía trên cảnh (cảnh vẽ ở oy, trời bắt đầu ở oy − padTop)
    const P0 = Math.max(0, Math.floor((opts && opts.padTop) || 0));
    if (sceneName !== "yard" && typeof GardenSky !== "undefined") {
      skyPad = P0;
      try {
        if (uz) { drawUzoneBg(ctx, S, ox, oy, now, uz, bx0, bx1, st); } else { drawZoneBg(ctx, S, ox, oy, now, sceneName, bx0, bx1, st); }
      } finally { skyPad = 0; }
      if (sea) { sea.decorGround(ctx, S, ox, oy, bx0, bx1, YARD.SKY, YARD.H, st); }
      drawPuddles(ctx, S, ox, oy, now, bx0, bx1, st);
      if (sea) { sea.garland(ctx, S, ox, oy - P0, now, bx0, bx1, 0, st); }
      if (uz) { drawUzEnv(ctx, S, ox, oy, uz); drawUzLandmark(ctx, S, ox, oy, uz, now, tod === "night"); }
      else if (LANDMARK[sceneName]) { LANDMARK[sceneName](ctx, S, (x) => ox + x, (y) => oy + y, now, tod === "night"); }
    } else {
    if (typeof GardenSky !== "undefined") { drawSky(ctx, S, ox, oy - P0, now, bx0, bx1, YARD.SKY + P0, st); }
    else { box(ctx, ox + bx0, oy - P0, BW, YARD.SKY + P0, st.top, S); }
    // đồi xa
    ctx.fillStyle = st.hills;
    for (let i = Math.floor(bx0); i < bx1; i++) {
      const hh = 5 + Math.round(3 * Math.sin(i / 17) + 2 * Math.sin(i / 7));
      ctx.fillRect((ox + i) * S, (oy + YARD.SKY - hh) * S, S, hh * S);
    }
    if (sea) { sea.decorHills(ctx, S, ox, oy, bx0, bx1, YARD.SKY, st); }
    // đất sân
    box(ctx, ox + bx0, oy + YARD.SKY, BW, YARD.H - YARD.SKY, st.ground, S);
    for (let i = 3 + Math.floor(bx0 / 11) * 11; i < bx1; i += 11) { box(ctx, ox + i, oy + YARD.SKY + 4 + (i * 7) % 40, 1, 1, st.grass, S); }
    if (sea) { sea.decorGround(ctx, S, ox, oy, bx0, bx1, YARD.SKY, YARD.H, st); }
    box(ctx, ox + 28, oy + 74, 8, 2, "#d9ae72", S);
    if (typeof GardenSky !== "undefined") { drawPuddles(ctx, S, ox, oy, now, bx0, bx1, st); }
    if (sea) { sea.garland(ctx, S, ox, oy - P0, now, bx0, bx1, 0, st); }
    drawHouse(ctx, S, ox, oy, home.house, now, tod, home.style);
    drawWear(ctx, S, ox, oy, home, now, st, opts && opts.wear);
    }
    snowRoof = false;
    if (opts && opts.grid) {
      ctx.globalAlpha = 0.25;
      for (let gx = 4; gx <= 16; gx++) { box(ctx, ox + gx * T, oy + YARD.SKY, 0.34, 48, P.k, S); }
      for (let gy = 0; gy <= 3; gy++) { box(ctx, ox + 64, oy + YARD.SKY + gy * T, 192, 0.34, P.k, S); }
      ctx.globalAlpha = 1;
    }
    const pets = opts && opts.noPets ? [] : petsFor(sceneName, now, st, opts), pst = { i: 0 };
    placedSorted(home[sceneName] || []).forEach((e) => {
      const ghost = placing && placing.index === e.index && placing.scene === sceneName;
      drawPetsBefore(ctx, S, ox, oy, pets, pst, YARD.SKY + (e.y + 1) * T, now);
      drawItem(ctx, S, ox, oy, e, sceneName, now, tod, ghost ? 0.3 : undefined);
    });
    drawPetsBefore(ctx, S, ox, oy, pets, pst, null, now);
    drawParts(ctx, S, ox, oy, sceneName);
    if (sea) { sea.ambient(ctx, S, ox, oy, now, bx0, bx1, YARD.H, st); }
    if (typeof GardenJoy !== "undefined" && !(opts && opts.noJoy) && (isOpen || UIget("joy") !== "off")) {
      GardenJoy.drawYard(ctx, S, ox, oy, now, bx0, bx1, YARD.SKY, st);
    }
    if (typeof GardenSky !== "undefined" && (isOpen || UIget("weather") !== "off")) {
      drawWeather(ctx, S, ox, oy - P0, now, bx0, bx1, YARD.H + P0, st, YARD.SKY + P0);
      if (P0) {                       // 1.25.4: phần trời thêm cũng tối theo giờ (đèn chỉ ở trong cảnh)
        const dark = Math.max(0, 0.55 - st.light) * 0.75;
        if (dark > 0.01) { ctx.globalAlpha = dark; box(ctx, ox + bx0, oy - P0, bx1 - bx0, P0, "#0b0b2a", S); ctx.globalAlpha = 1; }
      }
      drawNight(ctx, S, ox, oy, bx0, bx1, YARD.H, st);
      if (sea) { sea.nightTop(ctx, S, ox, oy, now, bx0, bx1, YARD.H, st); }
    }
    guestsTop(ctx, S, ox, oy, sceneName, now, st, opts);
    // 1.28: gánh hàng rong + chỗ lấp lánh (không vẽ ở ảnh xem trước / ảnh chụp / bản vẽ của Xưởng)
    if (typeof GardenFinds !== "undefined" && !(opts && (opts.noGuests || opts.noPets || opts.uz))) {
      GardenFinds.draw(ctx, S, ox, oy, sceneName, now, st, () => spotsFor(sceneName, "*"), !!(opts && opts.photo));
    }
    if (opts && opts.overlay) { opts.overlay(ctx, S, ox, oy); }
  }

  // 1.25: kiểu nhà của ba gian (nhà chưa xây xong 7 bước: kiểu gốc); opts.style: vẽ thử kiểu khác (tab Xây nhà)
  function houseStyle(opts) {
    const h = homeState();
    return (opts && opts.style) || (h.house >= 7 ? (h.style || "classic") : "classic");
  }
  // 1.30: giấy dán tường + sàn riêng của từng gian (ví: more.decor.use[gian] = {wall, floor}; trống = theo kiểu nhà).
  // decoTry: đang xem thử một mẫu trong bảng Nhà (không lưu). opts.style (vẽ thử kiểu nhà khác ở tab Xây nhà): nền thuần.
  let decoTry = null;
  let tileSig = "", tileMap = {};
  function decorState() { return moreData().decor || { own: [], use: {}, mine: { items: {} } }; }
  function tileRows() {
    const tiles = (catalog() || {}).tiles || [];
    const sig = tiles.map((t) => t.id + "=" + t.px).join("|");
    if (sig !== tileSig) {
      tileSig = sig; tileMap = {};
      tiles.forEach((t) => { const flat = t.px ? pxDecode(t.px, 16) : null; if (flat) { tileMap[t.id] = pxRows(flat, 16, false); } });
    }
    return tileMap;
  }
  function decoOf(kind, opts) {
    if (opts && opts.style) { return null; }
    const use = (decorState().use || {})[kind] || {};
    let wall = use.wall || null, floor = use.floor || null;
    if (decoTry && isOpen && decoTry.room === kind) { if (decoTry.slot === "wall") { wall = decoTry.id || null; } else { floor = decoTry.id || null; } }
    return wall || floor ? { wall: wall, floor: floor, tiles: tileRows() } : null;
  }
  // 1.25: cửa sổ phòng chính (cột 4–5, x 64–96) theo kiểu nhà
  function roomWindow(ctx, S, ox, oy, style, now) {
    const tod = timeOfDay(), sky = skyColors(tod), stR = skyNow(), night = tod === "night";
    const c = (x, y, w, h, col) => box(ctx, ox + x, oy + y, w, h, col, S);
    const weather = (x, y, w, h) => {
      if (!(stR && (stR.rain || stR.snow))) { return; }
      ctx.save(); ctx.beginPath(); ctx.rect((ox + x) * S, (oy + y) * S, w * S, h * S); ctx.clip();
      drawWeather(ctx, S, ox, oy + y, now, x, x + w, h, Object.assign({}, stR, { flash: 0 })); ctx.restore();
    };
    const glass = (x, y, w, h) => {
      c(x, y, w, h, sky[1]); c(x, y, w, Math.ceil(h * 0.45), sky[0]);
      if (night) { c(x + w - 8, y + 2, 3, 3, "#fff6c8"); }
      else if (!stR || !stR.rain) { c(x + 3, y + Math.floor(h * 0.6), 7, 2, P.w); c(x + 5, y + Math.floor(h * 0.6) - 1, 3, 1, P.w); }
      weather(x, y, w, h);
    };
    if (style === "classic") {            // kính khung trắng, rèm hồng có nếp + dây buộc, diềm rèm, chậu hoa ở bậu
      c(67, 9, 26, 24, P.w); glass(68, 10, 24, 22); c(79, 10, 2, 22, P.w); c(68, 20, 24, 2, P.w);
      c(66, 33, 28, 2, P.w); c(66, 35, 28, 1, "#d9c9b0");
      c(70, 30, 6, 3, "#d9704a"); c(71, 28, 1, 2, P.g); c(73, 27, 1, 3, P.g); c(72, 28, 1, 1, P.p); c(74, 27, 1, 1, P.y);
      [[60, 1], [93, -1]].forEach(([x, d]) => {
        for (let y = 9; y < 35; y++) {
          const pinch = y > 21 && y < 27 ? 2 : (y >= 27 ? 1 : 0), w = 7 - pinch, xs = d > 0 ? x : x + pinch;
          c(xs, y, w, 1, "#f49ab0"); c(xs + 2, y, 1, 1, "#e07a96"); c(xs + 4, y, 1, 1, "#e07a96");
        }
        c(d > 0 ? x : x + 2, 24, 5, 1, "#e9b949");
      });
      c(59, 6, 42, 3, "#f49ab0"); c(59, 6, 42, 1, "#f8bccb"); for (let x = 59; x < 101; x += 2) { c(x, 9, 1, 1, "#f49ab0"); }
    } else if (style === "minka") {       // nửa kính nhìn trời, nửa shoji khép
      c(65, 8, 30, 27, "#3b2414"); glass(67, 10, 13, 23);
      c(80, 10, 13, 23, night ? "#4a5470" : "#f3ecd8");
      for (let x = 83; x < 93; x += 3) { c(x, 10, 1, 23, "#6b4226"); }
      for (let y = 15; y < 33; y += 5) { c(80, y, 13, 1, "#6b4226"); }
      c(79, 9, 2, 25, "#3b2414"); c(64, 34, 32, 2, "#4a2c18");
    } else if (style === "teahouse") {    // cửa sổ tròn song tre
      ctx.save(); ctx.beginPath(); ctx.arc((ox + 80) * S, (oy + 21) * S, 12 * S, 0, Math.PI * 2); ctx.clip();
      glass(66, 8, 28, 26);
      [[71, 8, 1, 26], [77, 8, 2, 26], [85, 8, 1, 26], [66, 14, 28, 1], [66, 22, 28, 2], [66, 29, 28, 1]].forEach(([x, y, w, h]) => c(x, y, w, h, "#a8884a"));
      [[74, 18], [81, 25], [88, 16]].forEach(([x, y]) => c(x, y, 2, 2, "#8a6a34"));
      ctx.restore();
      ctx.strokeStyle = "#8a6238"; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.arc((ox + 80) * S, (oy + 21) * S, 12.5 * S, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = "#d9c094"; ctx.lineWidth = S; ctx.beginPath(); ctx.arc((ox + 80) * S, (oy + 21) * S, 14 * S, 0, Math.PI * 2); ctx.stroke();
    } else {                              // lâu đài: cửa sổ hình chuông katōmado, khung đen viền vàng
      const HW = { 8: 1, 9: 2, 10: 3, 11: 4, 12: 6, 13: 8, 14: 10, 15: 12, 16: 14, 17: 13 };
      const half = (y) => (HW[y] !== undefined ? HW[y] : 12);
      for (let y = 7; y <= 35; y++) { const hw = y === 7 ? 1 : half(Math.min(y, 34)) + 2; c(80 - hw, y, hw * 2, 1, "#1f1f33"); }
      for (let y = 9; y <= 33; y++) { const hw = half(y); if (hw > 1) { c(80 - hw + 1, y, hw * 2 - 2, 1, y < 19 ? sky[0] : sky[1]); } }
      if (night) { c(84, 21, 3, 3, "#fff6c8"); } else if (!stR || !stR.rain) { c(71, 24, 7, 2, P.w); c(73, 23, 3, 1, P.w); }
      weather(69, 18, 22, 15);
      c(79, 10, 2, 24, "#1f1f33"); c(69, 25, 22, 1, "#1f1f33");
      for (let y = 7; y <= 35; y++) { const hw = y === 7 ? 1 : half(Math.min(y, 34)) + 2; c(80 - hw - 1, y, 1, 1, "#e9b949"); c(80 + hw, y, 1, 1, "#e9b949"); }
      c(64, 35, 32, 2, "#1f1f33"); c(64, 35, 32, 1, "#e9b949");
    }
  }
  // vệt nắng từ cửa sổ xuống sàn (ban ngày, trời không mưa)
  function sunbeam(ctx, S, ox, oy) {
    const stR = skyNow();
    if (timeOfDay() !== "day" || (stR && (stR.rain || stR.light <= 0.6))) { return; }
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = "#fff4c0"; ctx.beginPath();
    ctx.moveTo((ox + 67) * S, (oy + 41) * S); ctx.lineTo((ox + 93) * S, (oy + 41) * S);
    ctx.lineTo((ox + 106) * S, (oy + 74) * S); ctx.lineTo((ox + 58) * S, (oy + 74) * S); ctx.closePath(); ctx.fill(); ctx.restore();
    // 1.30: bụi nắng lơ lửng trong vệt nắng (cảnh Đứng yên / Dịu mắt thì thôi)
    if (UIget("yard") !== "full" && !isOpen) { return; }
    const t = Date.now() / 1000;
    for (let i = 0; i < 6; i++) {
      const k = (t / (9 + i * 2.3) + i * 0.37) % 1, y = 43 + k * 30, half = 13 + (y - 41) * 0.33;
      const x = 80 + Math.sin(t / (3 + i) + i * 2.1) * half * 0.8;
      ctx.globalAlpha = 0.55 * Math.sin(k * Math.PI);
      box(ctx, ox + x, oy + y, 1, 1, "#fffbe0", S);
    }
    ctx.globalAlpha = 1;
  }
  function drawRoom(ctx, S, ox, oy, now, opts) {
    const kind = (opts && opts.kind) || "room";
    if (kind !== "room") { drawSideRoom(ctx, S, ox, oy, now, kind, opts || {}); return; }      // 1.24: Bếp / Phòng ngủ
    const home = homeState();
    const L0 = opts && opts.keepLights ? lights.length : (lights.length = 0);
    const tod = timeOfDay(), stR = skyNow();
    const sty = houseStyle(opts);
    if (NHA) { NHA.bg(ctx, S, ox, oy, "room", ROOM.W, ROOM.H, ROOM.FLOOR, sty, decoOf("room", opts)); } else { box(ctx, ox, oy, ROOM.W, ROOM.H, "#f1e2c2", S); }
    roomWindow(ctx, S, ox, oy, sty, now);
    sunbeam(ctx, S, ox, oy);
    if (opts && opts.grid) {
      ctx.globalAlpha = 0.25;
      for (let gx = 0; gx <= 10; gx++) { box(ctx, ox + gx * T, oy + ROOM.FLOOR, 0.34, 48, P.k, S); }
      for (let gy = 0; gy <= 3; gy++) { box(ctx, ox, oy + ROOM.FLOOR + gy * T, 160, 0.34, P.k, S); }
      for (let gx = 0; gx <= 10; gx++) { box(ctx, ox + gx * T, oy + ROOM.WALL_Y, 0.34, 16, P.k, S); }
      box(ctx, ox, oy + ROOM.WALL_Y, 160, 0.34, P.k, S); box(ctx, ox, oy + ROOM.WALL_Y + 16, 160, 0.34, P.k, S);
      ctx.globalAlpha = 1;
    }
    if (SEA()) { SEA().room(ctx, S, ox, oy, now, ROOM.W, 0, stR); }
    const all = placedSorted(home.room);
    const order = all.filter((e) => (item(e.id) || {}).place === "wall")
      .concat(all.filter((e) => (item(e.id) || {}).place === "rug"))
      .concat(all.filter((e) => ["floor", undefined].indexOf((item(e.id) || {}).place) >= 0));
    drawRoomWear(ctx, S, ox, oy, now, stR, opts && opts.wear);
    const pets = opts && opts.noPets ? (opts.life ? lifeFor("room", now, stR, opts) : []) : petsFor("room", now, stR, opts), pst = { i: 0 };
    order.forEach((e) => {
      const ghost = placing && placing.index === e.index && placing.scene === "room";
      const pl = (item(e.id) || {}).place;
      if (pl !== "wall" && pl !== "rug") { drawPetsBefore(ctx, S, ox, oy, pets, pst, ROOM.FLOOR + e.y * T - 1, now); }
      drawItem(ctx, S, ox, oy, e, "room", now, tod, ghost ? 0.3 : undefined);
    });
    drawPetsBefore(ctx, S, ox, oy, pets, pst, null, now);
    drawParts(ctx, S, ox, oy, "room");      // 1.24: hơi nước, nốt nhạc… của đồ trong nhà (trước đây tính mà không vẽ)
    roomNight(ctx, S, ox, oy, now, ROOM.W, tod, stR, opts, L0);
    if (opts && opts.overlay) { opts.overlay(ctx, S, ox, oy); }
  }
  // 1.30: chiều tối trong nhà ngả màu đèn vàng ấm (nhẹ, phủ sau lớp tối)
  function warmGlow(ctx, S, ox, oy, W, stR) {
    if (!stR || stR.light >= 0.8) { return; }
    ctx.globalAlpha = Math.min(0.1, (0.8 - stR.light) * 0.2);
    box(ctx, ox, oy, W, ROOM.H, "#ff9d3c", S);
    ctx.globalAlpha = 1;
  }
  // tối trong phòng; lightDx: dời nguồn sáng của gian này về toạ độ cả nhà (vẽ đêm một lần cho cả 3 gian)
  function roomNight(ctx, S, ox, oy, now, W, tod, stR, opts, L0) {
    if (opts && opts.lightDx) { for (let i = L0; i < lights.length; i++) { lights[i].x += opts.lightDx; } }
    if (opts && opts.noNight) { return; }
    if (stR && typeof GardenSky !== "undefined") {
      drawNight(ctx, S, ox, oy, 0, W, ROOM.H, Object.assign({}, stR, { light: 0.08 + stR.light * 0.8 }));
      warmGlow(ctx, S, ox, oy, W, stR);
      if (SEA()) { SEA().room(ctx, S, ox, oy, now, W, 1, stR); }
    } else if (tod !== "day") {
      ctx.globalAlpha = 0.12; box(ctx, ox, oy, W, ROOM.H, "#1b1b4f", S); ctx.globalAlpha = 1;
    }
  }
  // ---- 1.24: gian bên (Bếp / Phòng ngủ): nền ở nha_art.js, đồ / lưới / đêm như phòng chính ----
  function drawSideRoom(ctx, S, ox, oy, now, kind, opts) {
    const home = homeState(), tod = timeOfDay(), stR = skyNow(), W = SIDE.W;
    const L0 = opts.keepLights ? lights.length : (lights.length = 0);
    if (NHA) { NHA.bg(ctx, S, ox, oy, kind, W, ROOM.H, ROOM.FLOOR, houseStyle(opts), decoOf(kind, opts)); } else { box(ctx, ox, oy, W, ROOM.H, "#e8dcc8", S); }
    if (opts.grid) {
      ctx.globalAlpha = 0.25;
      for (let gx = 0; gx <= 9; gx++) { box(ctx, ox + gx * T, oy + ROOM.FLOOR, 0.34, 48, P.k, S); box(ctx, ox + gx * T, oy + ROOM.WALL_Y, 0.34, 16, P.k, S); }
      for (let gy = 0; gy <= 3; gy++) { box(ctx, ox, oy + ROOM.FLOOR + gy * T, W, 0.34, P.k, S); }
      box(ctx, ox, oy + ROOM.WALL_Y, W, 0.34, P.k, S); box(ctx, ox, oy + ROOM.WALL_Y + 16, W, 0.34, P.k, S);
      ctx.globalAlpha = 1;
    }
    if (SEA()) { SEA().room(ctx, S, ox, oy, now, W, 0, stR); }
    const all = placedSorted(home[kind] || []);
    const order = all.filter((e) => (item(e.id) || {}).place === "wall")
      .concat(all.filter((e) => (item(e.id) || {}).place === "rug"))
      .concat(all.filter((e) => ["floor", undefined].indexOf((item(e.id) || {}).place) >= 0));
    const lf = !opts.noPets || opts.life ? lifeFor(kind, now, stR, opts) : [], pst = { i: 0 };     // 1.30
    order.forEach((e) => {
      const ghost = placing && placing.index === e.index && placing.scene === kind;
      const pl = (item(e.id) || {}).place;
      if (pl !== "wall" && pl !== "rug") { drawPetsBefore(ctx, S, ox, oy, lf, pst, ROOM.FLOOR + e.y * T - 1, now); }
      drawItem(ctx, S, ox, oy, e, kind, now, tod, ghost ? 0.3 : undefined);
    });
    drawPetsBefore(ctx, S, ox, oy, lf, pst, null, now);
    drawParts(ctx, S, ox, oy, kind);
    roomNight(ctx, S, ox, oy, now, W, tod, stR, opts, L0);
    if (opts.overlay) { opts.overlay(ctx, S, ox, oy); }
  }
  // gian chưa mở: tối lại như nhau ở cả hai bên, biển hai dòng giống nhau (1.25: một lần mở cả hai gian, bấm bên nào cũng được)
  function lockedRoom(ctx, S, ox, oy, kind, opts) {
    if (NHA) { NHA.bg(ctx, S, ox, oy, kind, SIDE.W, ROOM.H, ROOM.FLOOR, houseStyle(opts)); } else { box(ctx, ox, oy, SIDE.W, ROOM.H, "#e8dcc8", S); }
    ctx.globalAlpha = 0.74; box(ctx, ox, oy, SIDE.W, ROOM.H, "#1b1b2f", S); ctx.globalAlpha = 1;
    if (opts && opts.noSign) { return; }
    const cat = catalog() || {}, info = (cat.rooms || []).find((r) => r.id === kind) || { name: SCENE_NAME[kind] };
    const ready = homeState().house >= (cat.nha_unlock || 7);
    const lines = [info.name, ready ? "Mở rộng nhà: cả 2 gian · " + kbXu(cat.nha_price || 2000) + " xu" : "Xây xong nhà để mở rộng"];
    const fs = Math.max(7, 6 * S), lh = fs + 3 * S, maxW = SIDE.W * S - 6 * S;
    const font = (b) => (b ? "bold " : "") + fs + "px \"DotGothic16\", \"Noto Sans\", monospace";
    ctx.font = font(true); let tw = ctx.measureText(lines[0]).width;
    ctx.font = font(false); tw = Math.min(maxW, Math.max(tw, ctx.measureText(lines[1]).width) + 10 * S);
    const th = lh * 2 + 3 * S, cx = (ox + SIDE.W / 2) * S, by = (oy + 44) * S;
    ctx.fillStyle = "#1b1b2f"; ctx.fillRect(Math.round(cx - tw / 2 - S), Math.round(by - S), Math.round(tw + 2 * S), Math.round(th + 2 * S));
    ctx.fillStyle = "#ffd23f"; ctx.fillRect(Math.round(cx - tw / 2), Math.round(by), Math.round(tw), Math.round(th));
    ctx.textBaseline = "middle"; ctx.textAlign = "center";
    lines.forEach((t, i) => {
      ctx.fillStyle = i ? "#6b3b1f" : "#1b1b2f"; ctx.font = font(!i);
      ctx.fillText(t, Math.round(cx), Math.round(by + 2 * S + lh * i + lh / 2), tw - 4 * S);
    });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  // cả nhà 3 gian (màn chính "Trong nhà", ảnh chụp nguyên nhà): Bếp · cột · phòng chính · cột · Phòng ngủ, thú đi khắp nhà
  //   opts.style: vẽ thử kiểu nhà khác · opts.open: vẽ như đã mở rộng (ảnh nhỏ ở tab Xây nhà) · opts.noSign: gian chưa mở không có biển
  function drawHouse3(ctx, S, ox, oy, now, opts) {
    opts = opts || {};
    const rooms = homeState().rooms || [], stR = skyNow(), tod = timeOfDay(), sty = houseStyle(opts);
    const isOpen3 = (k) => k === "room" || opts.open || rooms.indexOf(k) >= 0;
    lights.length = 0;
    ["kitchen", "room", "bedroom"].forEach((k) => {
      const x = HOUSE3.X[k];
      if (isOpen3(k)) {
        drawRoom(ctx, S, ox + x, oy, now, { kind: k, noPets: true, noNight: true, keepLights: true, lightDx: x, style: opts.style,
          life: !!opts.life, seen: !!opts.seen });
      } else { lockedRoom(ctx, S, ox + x, oy, k, opts); }
    });
    [144, 308].forEach((x) => {
      if (NHA) { NHA.post(ctx, S, ox, oy, x, 0, ROOM.H, sty); }
      else { box(ctx, ox + x, oy, HOUSE3.POST, ROOM.H, P.B, S); box(ctx, ox + x, oy + 5, HOUSE3.POST, 1, P.k, S); }
    });
    if (!opts.noPets && (isOpen || UIget("pets") !== "off") && typeof GardenPets !== "undefined") {
      GardenPets.place(H.data(), "house", now, stR, houseSpots).forEach((e) => GardenPets.draw(ctx, S, ox, oy, e, now));
    }
    if (stR && typeof GardenSky !== "undefined") {
      drawNight(ctx, S, ox, oy, 0, HOUSE3.W, ROOM.H, Object.assign({}, stR, { light: 0.08 + stR.light * 0.8 }));
      warmGlow(ctx, S, ox, oy, HOUSE3.W, stR);
      if (SEA()) { ["kitchen", "room", "bedroom"].forEach((k) => { if (isOpen3(k)) { SEA().room(ctx, S, ox + HOUSE3.X[k], oy, now, roomW(k), 1, stR); } }); }
    } else if (tod !== "day") {
      ctx.globalAlpha = 0.12; box(ctx, ox, oy, HOUSE3.W, ROOM.H, "#1b1b4f", S); ctx.globalAlpha = 1;
    }
    lights.length = 0;
  }
  function houseRoomAt(ax) {        // toạ độ nghệ thuật trên cả nhà → gian (phần vườn hai bên: gian gần nhất)
    return ax < 146 ? "kitchen" : ax < 310 ? "room" : "bedroom";
  }
  // ---- 1.25: cả nhà đứng giữa vườn (bố cục A): hai bên là vườn (trời theo giờ, đồi, cỏ theo mùa), chân trời ngang mép sàn,
  // tường ngoài hai đầu, mái theo kiểu nhà phía trên (mái hiên khi chỉ còn chỗ hẹp, mái đầy đủ khi đủ cao), móng đá khi còn chỗ dưới.
  // Vùng vẽ: VW × VH điểm ảnh nghệ thuật từ (0, 0); nhà ở (hx, hy).
  function gardenBand(ctx, S, x0, x1, y0, y1, hz, st, side) {
    const w = x1 - x0, mix = typeof GardenSky !== "undefined" && GardenSky.mix ? GardenSky.mix : (a) => a;
    if (w <= 0) { return; }
    const bands = 7;
    for (let b = 0; b < bands; b++) {
      const a = y0 + Math.floor((hz - y0) * b / bands), c = y0 + Math.floor((hz - y0) * (b + 1) / bands);
      if (c > a) { box(ctx, x0, a, w, c - a, mix(st.top, st.bottom, b / (bands - 1)), S); }
    }
    if (st.light < 0.6) {
      for (let i = 0; i < w / 6; i++) { box(ctx, x0 + ((i * 37 + 5) % Math.max(1, Math.floor(w))), y0 + ((i * 23 + 3) % Math.max(4, hz - y0 - 8)), 1, 1, i % 3 ? "#ffffff" : "#ffe9a8", S); }
    } else if (!st.rain && w > 30 && side) {
      const cx = side < 0 ? x0 + Math.floor(w * 0.35) : x0 + Math.floor(w * 0.55), cy = y0 + Math.max(3, Math.floor((hz - y0) * 0.3));
      [[0, 2, 14, 3], [3, 0, 7, 2], [-3, 3, 4, 2]].forEach(([dx, dy, ww, hh]) => box(ctx, cx + dx, cy + dy, ww, hh, "#ffffff", S));
    }
    ctx.fillStyle = st.hills;
    for (let i = Math.floor(x0); i < x1; i++) { const hh = 5 + Math.round(3 * Math.sin(i / 17) + 2 * Math.sin(i / 7)); ctx.fillRect(i * S, (hz - hh) * S, S, hh * S); }
    const sea = SEA();
    if (sea) { try { sea.decorHills(ctx, S, 0, 0, x0, x1, hz, st); } catch (e) { /* bỏ qua */ } }
    box(ctx, x0, hz, w, y1 - hz, st.ground, S);
    for (let i = Math.floor(x0 / 11) * 11 + 3; i < x1; i += 11) { if (i >= x0) { box(ctx, i, hz + 3 + (Math.abs(i) * 7) % Math.max(1, y1 - hz - 4), 1, 1, st.grass, S); } }
    if (sea) { try { sea.decorGround(ctx, S, 0, 0, x0, x1, hz, y1, st); } catch (e) { /* bỏ qua */ } }
    if (!side) { return; }
    // 1.25.4: bỏ bụi cây vuông sát tường nhà (người dùng: "ô vuông xanh 2 bên nhà … nhìn không đẹp lắm"); giữ mấy bông hoa nhỏ
    const by = hz + 6;
    const fx = side < 0 ? x1 - 30 : x0 + 22;
    if (fx >= x0 && fx + 10 <= x1 && by + 10 <= y1) { [0, 4, 8].forEach((d, i) => { box(ctx, fx + d, by + 6, 1, 4, P.G, S); box(ctx, fx + d - 1, by + 5, 3, 2, [P.p, P.y, P.r][i], S); }); }
  }
  function roofOver(ctx, S, hx, hy, style, night) {          // mái phía trên nhà: hy = chỗ trống phía trên (điểm ảnh nghệ thuật)
    const r = (NHA && NHA.ROOF[style]) || { a: P.r, b: P.R, edge: P.k, board: P.B };
    const x0 = hx - 12, x1 = hx + HOUSE3.W + 12;
    if (hy >= 40) {                                           // đủ cao: mái đầy đủ hình thang + cửa sổ áp mái
      const yE = hy - 1, yR = hy - Math.min(44, hy - 6), W0 = x1 - x0 + 4, a0 = x0 - 2, inset = Math.floor(W0 * 0.16);
      for (let y = yR; y <= yE; y++) {
        const t = (y - yR) / Math.max(1, yE - yR), a = a0 + Math.round(inset * (1 - t)), b = a0 + W0 - Math.round(inset * (1 - t));
        box(ctx, a - 1, y, b - a + 2, 1, P.k, S); box(ctx, a, y, b - a, 1, (Math.floor((y - yR) / 3) % 2) ? r.b : r.a, S);
        if ((y - yR) % 3 === 2) { for (let x = a + ((Math.floor((y - yR) / 3) % 2) * 4); x < b; x += 8) { box(ctx, x, y, 1, 1, r.edge, S); } }
      }
      box(ctx, a0 + inset - 2, yR - 3, W0 - 2 * inset + 4, 3, P.k, S); box(ctx, a0 + inset - 1, yR - 2, W0 - 2 * inset + 2, 1, r.board, S);
      box(ctx, a0, yE - 1, W0, 2, r.board, S);
      const cx = hx + HOUSE3.W / 2, cy = Math.floor((yR + yE) / 2);
      box(ctx, cx - 6, cy - 5, 12, 11, P.k, S); box(ctx, cx - 5, cy - 4, 10, 9, night ? P.y : P.l, S);
      box(ctx, cx, cy - 4, 1, 9, P.k, S); box(ctx, cx - 5, cy, 10, 1, P.k, S);
      if (night) { lights.push({ x: cx, y: cy, r: 12 }); }
      return;
    }
    if (hy <= 0) { return; }
    for (let y = 0; y < hy - 2; y++) {                        // mái hiên cắt ngang (mái còn tiếp phía trên khung)
      const k = y;
      box(ctx, x0, y, x1 - x0, 1, (Math.floor(k / 3) % 2) ? r.b : r.a, S);
      if (k % 3 === 2) { for (let x = x0 + ((Math.floor(k / 3) % 2) * 4); x < x1; x += 8) { box(ctx, x, y, 1, 1, r.edge, S); } }
    }
    box(ctx, x0, hy - 3, x1 - x0, 2, r.board, S); box(ctx, x0, hy - 1, x1 - x0, 1, P.k, S);
  }
  function drawHouseScene(ctx, S, VW, VH, hx, hy, now, opts) {
    opts = opts || {};
    const st = skyNow() || { top: "#8fd3ff", bottom: "#c4ecff", light: 1, clouds: 2, ground: "#5ed35e", grass: "#45bf4a", hills: "#7ed98a", rain: 0, snow: 0 };
    const sty = houseStyle(opts), hz = hy + ROOM.FLOOR, night = st.light < 0.6;
    lights.length = 0;
    gardenBand(ctx, S, -1, hx - 4, -1, VH + 1, hz, st, -1);
    gardenBand(ctx, S, hx + HOUSE3.W + 4, VW + 1, -1, VH + 1, hz, st, 1);
    // 1.25.3: trời phía trên mái dùng cùng đường chân trời với hai bên (trước đây dải màu bị nén vào khoảng trống
    // phía trên nhà → thành khối chữ nhật sáng hơn ở cỡ cảnh Lớn); đồi / đất của dải này nằm sau nhà nên không thấy
    if (hy > 0) { gardenBand(ctx, S, hx - 4, hx + HOUSE3.W + 4, -1, hz + 1, hz, st, 0); }
    roofOver(ctx, S, hx, hy, sty, night);
    const below = VH - (hy + ROOM.H);
    if (below > 0) {                                          // đất + móng đá dưới nhà (hình nền)
      gardenBand(ctx, S, hx - 4, hx + HOUSE3.W + 4, hy + ROOM.H, VH + 1, hy + ROOM.H, st, 0);
      box(ctx, hx - 6, hy + ROOM.H, HOUSE3.W + 12, Math.min(6, below), P.k, S);
      box(ctx, hx - 5, hy + ROOM.H + 1, HOUSE3.W + 10, Math.min(4, below - 1), P.S, S); box(ctx, hx - 5, hy + ROOM.H + 1, HOUSE3.W + 10, 1, P.s, S);
    }
    [-4, HOUSE3.W].forEach((x) => {
      if (NHA) { NHA.post(ctx, S, hx, hy, x, 0, ROOM.H, sty); }
      else { box(ctx, hx + x, Math.max(0, hy), 4, ROOM.H, P.B, S); }
    });
    if (typeof GardenSky !== "undefined") {                    // mưa / tuyết ngoài vườn, rồi tối theo trời ngoài (không có đèn trong nhà)
      drawWeather(ctx, S, 0, 0, now, -1, hx - 4, VH + 1, st, hz);
      drawWeather(ctx, S, 0, 0, now, hx + HOUSE3.W + 4, VW + 1, VH + 1, st, hz);
      // 1.25.3: cả trời phía trên mái cũng mưa / tuyết / chớp như hai bên (trước đây chỉ hai bên có)
      if (hy > 0) { drawWeather(ctx, S, 0, 0, now, hx - 4, hx + HOUSE3.W + 4, hy, st); }
      drawNight(ctx, S, 0, 0, -1, VW + 1, VH + 1, st);     // lights lúc này chỉ có cửa sổ áp mái
    }
    lights.length = 0;
    drawHouse3(ctx, S, hx, hy, now, opts);
  }

  // ---------------------------------------------------------------------
  // Kiểm tra chỗ đặt (giống Python, để tô xanh/đỏ khi rê chuột)
  // ---------------------------------------------------------------------
  function cellsOf(id, x, y) { const it = item(id); const out = []; for (let i = 0; i < ((it && it.w) || 1); i++) { out.push([x + i, y]); } return out; }
  function layerOf(id) { return (item(id) || {}).place === "rug" ? "under" : "obj"; }
  function spotError(sceneName, id, x, y, ignore) {
    const it = item(id), home = homeState(), cat = catalog();
    if (!it || !cat) { return "?"; }
    const w = it.w;
    if ((it.scene === "room") !== isRoom(sceneName)) { return it.scene === "room" ? "Đồ trong nhà" : "Đồ ngoài trời"; }
    if (isOut(sceneName)) {
      if (!canEnter(sceneName)) { return "Chưa mở vùng này"; }
      if (!(cat.yard.house_cols <= x && x + w <= cat.yard.cols && y >= 0 && y < cat.yard.rows)) { return "Ngoài khu đất hoặc đè lên công trình"; }
    } else {
      const cols = sceneName === "room" ? cat.room.cols : (cat.side || { cols: 9 }).cols, win = sceneName === "room" ? cat.room.window : [];
      if (!canEnter(sceneName)) { return "Chưa mở gian này"; }
      if (!(x >= 0 && x + w <= cols && y >= 0 && y < cat.room.rows)) { return "Ngoài căn phòng"; }
      if (it.place === "wall") {
        if (y !== 0) { return "Đồ treo tường"; }
        if (cellsOf(id, x, y).some(([cx]) => win.indexOf(cx) >= 0)) { return "Chỗ cửa sổ"; }
      } else if (y === 0) { return "Đặt dưới sàn"; }
    }
    const mine = cellsOf(id, x, y).map((c) => c.join(","));
    const hit = (home[sceneName] || []).some((e, i) => i !== ignore && layerOf(e.id) === layerOf(id) &&
      cellsOf(e.id, e.x, e.y).some((c) => mine.indexOf(c.join(",")) >= 0));
    return hit ? "Ô đã có đồ" : "";
  }

  function cellAt(sceneName, ax, ay) {
    if (isOut(sceneName)) {
      if (ay < YARD.SKY || ay >= YARD.H || ax < 0 || ax >= YARD.W) { return null; }
      return { x: Math.floor(ax / T), y: Math.floor((ay - YARD.SKY) / T) };
    }
    if (ax < 0 || ax >= roomW(sceneName)) { return null; }
    if (ay >= ROOM.WALL_Y && ay < ROOM.WALL_Y + T) { return { x: Math.floor(ax / T), y: 0 }; }
    if (ay >= ROOM.FLOOR && ay < ROOM.H) { return { x: Math.floor(ax / T), y: 1 + Math.floor((ay - ROOM.FLOOR) / T) }; }
    return null;
  }
  function cellRect(sceneName, x, y, w) {
    if (isOut(sceneName)) { return { x: x * T, y: YARD.SKY + y * T, w: w * T, h: T }; }
    if (y === 0) { return { x: x * T, y: ROOM.WALL_Y, w: w * T, h: T }; }
    return { x: x * T, y: ROOM.FLOOR + (y - 1) * T, w: w * T, h: T };
  }
  function itemAt(sceneName, cell) {
    if (!cell) { return -1; }
    const list = homeState()[sceneName] || [];
    let found = -1;
    list.forEach((e, i) => {
      if (cellsOf(e.id, e.x, e.y).some(([cx, cy]) => cx === cell.x && cy === cell.y)) {
        if (found < 0 || layerOf(e.id) === "obj") { found = i; }
      }
    });
    return found;
  }

  // ---------------------------------------------------------------------
  // Sân trên màn chính
  // ---------------------------------------------------------------------
  let mainView = null;
  let mainViewKey = "";        // 1.30: cảnh + tỉ lệ + lề + bề rộng của lần vẽ trước (đổi thì xếp lại chip sinh hoạt)
  // Món đồ ở chỗ bấm trên sân màn chính (để bấm hòm thư thì mở báo)
  function mainPetAt(ev) {
    const cv = $("kb-yard");
    if (!cv || !mainView || typeof GardenPets === "undefined") { return null; }
    const r = cv.getBoundingClientRect();
    return GardenPets.at(mainScene(), (ev.clientX - r.left) / mainView.S - mainView.ox, (ev.clientY - r.top) / mainView.S - (mainView.oy || 0));
  }
  function mainLifeAt(ev) {       // 1.30: bấm trúng StackChan đang sinh hoạt
    const cv = $("kb-yard");
    if (!cv || !mainView || typeof GardenLife === "undefined") { return false; }
    const r = cv.getBoundingClientRect();
    return GardenLife.at(mainScene(), (ev.clientX - r.left) / mainView.S - mainView.ox, (ev.clientY - r.top) / mainView.S - (mainView.oy || 0));
  }
  function mainFindAt(ev) {
    const cv = $("kb-yard");
    if (!cv || !mainView || mainView.house || typeof GardenFinds === "undefined") { return null; }
    const r = cv.getBoundingClientRect();
    return GardenFinds.at(mainScene(), (ev.clientX - r.left) / mainView.S - mainView.ox, (ev.clientY - r.top) / mainView.S - (mainView.oy || 0));
  }
  function mainGuestAt(ev) {
    const cv = $("kb-yard");
    if (!cv || !mainView || mainView.house || typeof GardenGuests === "undefined") { return null; }
    const r = cv.getBoundingClientRect();
    return GardenGuests.at(mainScene(), (ev.clientX - r.left) / mainView.S - mainView.ox, (ev.clientY - r.top) / mainView.S - (mainView.oy || 0));
  }
  function mainItemAt(ev) {
    const cv = $("kb-yard");
    if (!cv || !mainView || mainView.house) { return null; }
    const r = cv.getBoundingClientRect(), sc = mainScene();
    const ax = (ev.clientX - r.left) / mainView.S - mainView.ox, ay = (ev.clientY - r.top) / mainView.S - (mainView.oy || 0);
    const idx = itemAt(sc, cellAt(sc, ax, ay));
    return idx >= 0 ? (homeState()[sc] || [])[idx] : null;
  }
  // Các cảnh chuyển nhanh trên màn chính: Sân vườn → Trong nhà (1.24: cả nhà 3 gian) → các vùng đã mở → vùng tự tạo
  function outdoorList() { return ["yard"].concat(canEnter("house") ? ["house"] : [], ZONE_IDS.filter((z) => zoneOpen(z)), uzIds()); }
  let mainSwitchAt = 0;
  // 1.26: chuyển cảnh — giữ hình cảnh cũ để dải lá / rèm quét qua (GardenGreet.strip)
  let switchSnap = null, switchKind = "sweep", switchDir = 1;
  // 1.26.1: chậm hơn (1.26.0: 350 ms dải lá / rèm, 380 ms mờ dần — người dùng thấy nhanh quá)
  const SWITCH_MS = { sweep: 600, curtain: 760 }, SWITCH_FADE_MS = 520;
  function cycleMain(step) {
    const list = outdoorList();
    if (list.length < 2) { return false; }
    const cur = mainScene();
    const i = Math.max(0, list.indexOf(cur));
    const next = list[(i + step + list.length) % list.length];
    switchSnap = null;
    const cv = $("kb-yard");
    if (cv && cv.width && cv.height && typeof GardenGreet !== "undefined" && GardenGreet.mode() === "full") {
      try {
        const snap = document.createElement("canvas");
        snap.width = cv.width; snap.height = cv.height;
        snap.getContext("2d").drawImage(cv, 0, 0);
        switchSnap = snap;
      } catch (e) { switchSnap = null; }
    }
    if (typeof GardenFinds !== "undefined") { GardenFinds.closeCard(); GardenFinds.closePed(); }    // 1.28: thẻ / bảng của cảnh cũ
    switchKind = cur === "house" || next === "house" ? "curtain" : "sweep";
    switchDir = step < 0 ? -1 : 1;
    setMainPref(next);
    mainSwitchAt = Date.now();
    stillDirty = true;
    syncYardNav();
    sfx("flip");
    return true;
  }
  // 1.28: Tin làng / chỗ lấp lánh → đưa dải cảnh màn chính tới đúng cảnh (đi một bước theo hướng gần nhất)
  function showMain(sc) {
    const list = outdoorList(), cur = mainScene();
    if (!sc || sc === cur || list.indexOf(sc) < 0) { return false; }
    const i = list.indexOf(cur), j = list.indexOf(sc), n = list.length;
    const fwd = (j - i + n) % n, back = (i - j + n) % n;
    const ok = cycleMain(fwd <= back ? 1 : -1);
    if (ok && mainScene() !== sc) { setMainPref(sc); stillDirty = true; syncYardNav(); }
    return ok;
  }
  function syncYardNav() {
    const nav = $("kb-yard-nav");
    if (!nav) { return; }
    const list = outdoorList();
    nav.hidden = list.length < 2;
    const name = sceneName(mainScene()) + " · " + (list.indexOf(mainScene()) + 1) + "/" + list.length;
    const lab = $("kb-yard-name");
    if (lab && lab.textContent !== name) { lab.textContent = name; }
  }
  function drawMainYard(now) {
    const cv = $("kb-yard");
    if (!cv || !cv.offsetParent) { return; }
    const wrap = cv.parentNode;
    const cw = wrap.clientWidth;
    // cửa sổ thấp thì thu nhỏ sân; phóng to màn hình thì sân to theo (tối đa ×4)
    const maxS = window.innerHeight < 860 ? 2 : window.innerHeight < 1000 ? 3 : 4;
    const Svua = Math.max(2, Math.min(maxS, Math.floor(cw / YARD.W)));
    let S = Svua, pad = 0;
    // 1.23: ⚙ → Màn chính → Cỡ cảnh: Lớn — dải cảnh tới ~55 % chiều cao cửa sổ; cửa sổ thấp hơn 900 px giữ Vừa.
    // 1.25.4 (người dùng chọn A'): không phóng điểm ảnh tới ×7 nữa ("pixel bự lên nhìn không đẹp") — điểm ảnh bằng 5/7,
    // dải vẫn cao như cũ, phần cao thêm là trời phía trên cảnh (padTop)
    if (typeof GardenUI !== "undefined" && GardenUI.glob && GardenUI.glob("scene") === "large" && window.innerHeight >= 900) {
      const big = Math.max(2, Math.min(Math.max(maxS, Math.floor(window.innerHeight * 0.55 / YARD.H)), Math.floor(cw / YARD.W)));
      S = Math.max(Svua, Math.min(big, Math.round(big * 5 / 7)));
      pad = Math.max(0, Math.round(big * YARD.H / S) - YARD.H);
    }
    const dpr = window.devicePixelRatio || 1;
    const hgt = (YARD.H + pad) * S;
    if (cv._w !== cw || cv._h !== hgt || cv._dpr !== dpr) {
      cv.width = Math.round(cw * dpr); cv.height = Math.round(hgt * dpr);
      cv.style.width = cw + "px"; cv.style.height = hgt + "px";
      const grew = cv._h !== hgt;
      cv._w = cw; cv._h = hgt; cv._dpr = dpr;
      wrap.classList.toggle("kb-yard-short", hgt < 230);   // sân thấp: xếp các chip bên phải thành 2 hàng cho khỏi bị cắt
      if (grew) { window.dispatchEvent(new Event("kb-relayout")); }
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    const ox = Math.floor((cw / S - YARD.W) / 2);
    if (mainScene() === "house") {
      // 1.25 (bố cục A): cả nhà giữa dải, phóng nguyên lần vừa chiều cao (thấp quá thì bớt tối đa 12 điểm ảnh xà trên cùng),
      // hai bên là vườn, mái phía trên
      const Sh = Math.max(1, Math.min(S, Math.max(Math.floor(hgt / ROOM.H), 2), Math.floor(cw / (HOUSE3.W + 10))));
      const VW = Math.ceil(cw / Sh), VH = Math.ceil(hgt / Sh);
      const hx = Math.floor((cw / Sh - HOUSE3.W) / 2), hy = Math.max(-12, Math.floor(hgt / Sh - ROOM.H));
      mainView = { S: Sh, ox: hx, oy: hy, house: true };
      drawHouseScene(ctx, Sh, VW, VH, hx, hy, now, { life: true, seen: !document.hidden });
    } else {
      mainView = { S: S, ox: ox, oy: pad };
      drawOutdoor(ctx, S, ox, pad, now, mainScene(), { bgFrom: -ox - 1, bgTo: cw / S - ox + 1, seen: !document.hidden, padTop: pad });
    }
    // 1.30: khung nhìn đổi (đổi cảnh / đổi cỡ cửa sổ) → xếp lại chip sinh hoạt ngay, không chờ nhịp 1 giây của nó
    const vkey = mainScene() + "|" + mainView.S + "|" + mainView.ox + "|" + cw;
    if (vkey !== mainViewKey) { mainViewKey = vkey; if (typeof GardenLife !== "undefined" && GardenLife.sync) { GardenLife.sync(); } }
    const sw = now - mainSwitchAt;
    const tmode = typeof GardenGreet !== "undefined" ? GardenGreet.mode() : "fade";
    const swMs = SWITCH_MS[switchKind] || SWITCH_MS.sweep;
    if (sw < swMs && UIget("yard") === "full" && tmode === "full" && switchSnap) {
      GardenGreet.strip(ctx, cw, hgt, sw / swMs, switchSnap, switchKind, switchDir);     // 1.26: dải lá / rèm
    } else if (sw < SWITCH_FADE_MS && UIget("yard") === "full" && tmode !== "none") {          // chuyển cảnh: màn tối mờ dần
      ctx.globalAlpha = 0.65 * (1 - sw / SWITCH_FADE_MS); ctx.fillStyle = "#1b1b2f"; ctx.fillRect(0, 0, cw, hgt); ctx.globalAlpha = 1;
    }
    if (switchSnap && sw >= swMs) { switchSnap = null; }
    if (frame % 15 === 0 || stillDirty) { syncYardNav(); }
    const chip = document.getElementById("kb-weather");
    const st = skyNow();
    if (chip && st) {
      const hh = Math.floor(st.hour), mm = Math.floor((st.hour - hh) * 60);
      // 1.15: chỉ còn biểu tượng (+ giờ game) trong thẻ Hôm nay; chữ đầy đủ nằm ở tooltip
      const clock = st.mode !== "real" ? String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0") : "";
      const txt = "[i:" + st.icon + "]" + (clock ? " " + clock : "");      // 1.17.3: icon pixel thay ký tự ☀ ☁…
      if (chip.getAttribute("data-txt") !== txt) {
        chip.setAttribute("data-txt", txt); GardenIcons.fill(chip, txt);
        window.dispatchEvent(new Event("kb-today-fit"));       // chỗ chữ "Hôm nay … · N ngày liền" hẹp / rộng ra
      }
      const tt = st.phaseLabel + " · " + st.weatherLabel + (clock ? " · " + clock : "") + " (bấm để đổi giờ / thời tiết)";
      if (chip.title !== tt) { chip.title = tt; }
    }
  }

  // ---------------------------------------------------------------------
  // Bảng Nhà & Cửa hàng
  // ---------------------------------------------------------------------
  let fitTick = 0;
  function drawPanel(now) {
    const cv = $("kb-home-canvas");
    if (!cv) { return; }
    if (++fitTick % 30 === 0) { fitHome(true); }
    const area = cv.parentNode;
    const cw = area.clientWidth, ch = area.clientHeight - 30;
    const SW = isOut(scene) ? YARD.W : roomW(scene), SH = isOut(scene) ? YARD.H : ROOM.H;
    const S = Math.max(2, Math.min(Math.floor(cw / SW), Math.floor(ch / SH), 5));
    const dpr = window.devicePixelRatio || 1;
    const w = SW * S, h = SH * S;
    if (cv._w !== w || cv._h !== h || cv._dpr !== dpr) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv.style.width = w + "px"; cv.style.height = h + "px";
      cv._w = w; cv._h = h; cv._dpr = dpr;
    }
    view = { S: S, scene: scene };
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, w, h);
    const overlay = (c, s, ox, oy) => {
      if (placing && hover) {
        const it = item(placing.id);
        const err = spotError(scene, placing.id, hover.x, hover.y, placing.index);
        const r = cellRect(scene, hover.x, hover.y, it ? it.w : 1);
        if (!err) {
          const ghost = { id: placing.id, x: hover.x, y: hover.y };
          drawItem(c, s, ox, oy, ghost, scene, now, timeOfDay(), 0.75);
        }
        c.globalAlpha = 0.35;
        box(c, ox + r.x, oy + r.y, r.w, r.h, err ? "#ff4f6d" : "#6be08a", s);
        c.globalAlpha = 1;
        c.strokeStyle = err ? "#c21f3a" : "#1f7a3a"; c.lineWidth = 2;
        c.strokeRect((ox + r.x) * s + 1, (oy + r.y) * s + 1, r.w * s - 2, r.h * s - 2);
      } else if (selected && selected.scene === scene) {
        const e = homeState()[scene][selected.index];
        if (e) {
          const it = item(e.id);
          const r = cellRect(scene, e.x, e.y, it ? it.w : 1);
          c.strokeStyle = "#ffd23f"; c.lineWidth = 3;
          c.strokeRect((ox + r.x) * s, (oy + r.y) * s, r.w * s, r.h * s);
        }
      } else if (hover) {
        const idx = itemAt(scene, hover);
        if (idx >= 0) {
          const e = homeState()[scene][idx], it = item(e.id);
          const r = cellRect(scene, e.x, e.y, it ? it.w : 1);
          c.strokeStyle = "#ffffff"; c.lineWidth = 2;
          c.strokeRect((ox + r.x) * s, (oy + r.y) * s, r.w * s, r.h * s);
        }
      }
    };
    if (isOut(scene)) { drawOutdoor(ctx, S, 0, 0, now, scene, { grid: !!placing, overlay: overlay, seen: !document.hidden }); }
    else { drawRoom(ctx, S, 0, 0, now, { kind: scene, grid: !!placing, overlay: overlay, seen: !document.hidden }); }
  }

  // ---- 1.22: chụp ảnh vườn — cảnh đang xem (sân / vùng / trong nhà) thành PNG có khung, ngày, tên giao diện mùa ----
  // size: "s" cỡ thường (×2, cảnh 512 px), "l" cỡ lớn (×4, 1024 px), "wall" hình nền 1920×1080
  function photoCaption(sc) {
    const d = new Date(), dd = String(d.getDate()).padStart(2, "0") + "/" + String(d.getMonth() + 1).padStart(2, "0") + "/" + d.getFullYear();
    const sea = SEA(), cur = sea && sea.current ? sea.current() : null;
    const th = cur ? ((catalog() || {}).themes || []).find((t) => t.id === cur) : null;
    return { title: "ことば畑 · " + sceneName(sc), sub: dd + (th ? " · " + th.name : "") };
  }
  function photoScene(ctx, S, ox, oy, sc, now, wide) {
    if (isOut(sc)) { drawOutdoor(ctx, S, ox, oy, now, sc, wide ? { bgFrom: -ox - 1, bgTo: wide - ox + 1, photo: true } : { photo: true }); }
    else if (sc === "house") { drawHouse3(ctx, S, ox, oy, now, { life: true }); }        // 1.24: ảnh nguyên nhà (1.30: có StackChan)
    else { drawRoom(ctx, S, ox, oy, now, { kind: sc }); }
    lights.length = 0;
  }
  function photoCanvas(size, sc) {
    sc = sc || mainScene();
    const out = isOut(sc), SW = out ? YARD.W : sc === "house" ? HOUSE3.W : roomW(sc), SH = out ? YARD.H : ROOM.H, now = Date.now(), cap = photoCaption(sc);
    const cv = document.createElement("canvas"), ctx = cv.getContext("2d");
    const font = (px, bold) => (bold ? "700 " : "") + px + "px \"Noto Sans\", \"Noto Sans CJK JP\", \"Segoe UI\", sans-serif";
    if (size === "wall") {
      const W = 1920, Hh = 1080, S = out ? 7 : sc === "house" ? 4 : sc === "room" ? 11 : 12;
      cv.width = W; cv.height = Hh; ctx.imageSmoothingEnabled = false;
      const wide = W / S, ox = Math.floor((wide - SW) / 2), oy = Math.round((Hh / S - SH) * (out ? 0.56 : sc === "house" ? 0.62 : 0.45));
      if (sc === "house") {       // 1.25: nhà đứng giữa vườn, mái đầy đủ, móng đá (như màn chính)
        drawHouseScene(ctx, S, Math.ceil(wide), Math.ceil(Hh / S), ox, oy, now, {});
        lights.length = 0;
      } else { photoScene(ctx, S, out ? ox : Math.floor((wide - SW) / 2), oy, sc, now, out ? wide : 0); }
      // trời phía trên / đất phía dưới: kéo dài màu ở mép cảnh cho kín khung hình nền
      const top = ctx.getImageData(Math.floor(W / 2), oy * S, 1, 1).data, bot = ctx.getImageData(Math.floor(W / 2), (oy + SH) * S - 1, 1, 1).data;
      const rgb = (d) => "rgb(" + d[0] + "," + d[1] + "," + d[2] + ")";
      if (sc === "house") { /* vườn đã kín khung */ } else if (out) {
        ctx.fillStyle = rgb(top); ctx.fillRect(0, 0, W, oy * S);
        ctx.fillStyle = rgb(bot); ctx.fillRect(0, (oy + SH) * S, W, Hh - (oy + SH) * S);
      } else {
        const rx = Math.floor((wide - SW) / 2) * S, img = ctx.getImageData(rx, oy * S, SW * S, SH * S);
        ctx.fillStyle = "#3a2a22"; ctx.fillRect(0, 0, W, Hh); ctx.putImageData(img, rx, oy * S);
      }
      ctx.font = font(30, true);
      const tw = Math.max(ctx.measureText(cap.title).width, (ctx.font = font(24), ctx.measureText(cap.sub).width)) + 48;
      ctx.globalAlpha = 0.86; ctx.fillStyle = "#fff8dc"; ctx.fillRect(W - tw - 40, Hh - 132, tw, 92); ctx.globalAlpha = 1;
      ctx.strokeStyle = "#1b1b2f"; ctx.lineWidth = 4; ctx.strokeRect(W - tw - 40, Hh - 132, tw, 92);
      ctx.fillStyle = "#1b1b2f"; ctx.font = font(30, true); ctx.fillText(cap.title, W - tw - 16, Hh - 92);
      ctx.fillStyle = "#4a4a66"; ctx.font = font(24); ctx.fillText(cap.sub, W - tw - 16, Hh - 56);
      return cv;
    }
    const S = size === "l" ? 4 : 2, k = S / 2;
    const B = 3 * k, M = 8 * k, capH = 26 * k;           // viền đen, lề giấy, dải chữ
    const w = SW * S, h = SH * S;
    cv.width = w + 2 * (B + M); cv.height = h + 2 * (B + M) + capH;
    ctx.fillStyle = "#1b1b2f"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#fff8dc"; ctx.fillRect(B, B, cv.width - 2 * B, cv.height - 2 * B);
    ctx.fillStyle = "#1b1b2f"; ctx.fillRect(B + M - k * 2, B + M - k * 2, w + k * 4, h + k * 4);
    ctx.save(); ctx.translate(B + M, B + M); ctx.imageSmoothingEnabled = false;
    ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
    photoScene(ctx, S, 0, 0, sc, now, 0);
    ctx.restore();
    const ty = B + M + h + M + 12 * k;
    ctx.fillStyle = "#1b1b2f"; ctx.font = font(13 * k, true); ctx.textBaseline = "middle";
    ctx.fillText(cap.title, B + M, ty);
    ctx.fillStyle = "#4a4a66"; ctx.font = font(12 * k); ctx.textAlign = "right";
    ctx.fillText(cap.sub, cv.width - B - M, ty);
    return cv;
  }
  let snapScene = null;
  function openSnap(trigger, sc) {
    const pop = $("kb-snap-pop");
    if (!pop) { return; }
    snapScene = sc || mainScene();
    $("kb-snap-scene").textContent = sceneName(snapScene);
    pop.hidden = false;
    const r = trigger.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    let x = Math.min(Math.max(8, r.left), window.innerWidth - pw - 8), y = r.top - ph - 6;
    if (y < 8) { y = Math.min(window.innerHeight - ph - 8, r.bottom + 6); }
    pop.style.left = x + "px"; pop.style.top = y + "px";
  }
  function closeSnap() { const pop = $("kb-snap-pop"); if (pop) { pop.hidden = true; } }
  function takePhoto(size) {
    const sc = snapScene || mainScene();
    let url = "";
    try { url = photoCanvas(size, sc).toDataURL("image/png"); } catch (e) { setTip("Không chụp được ảnh này."); return; }
    closeSnap();
    const d = new Date(), day = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    const name = "kotoba_batake_" + (isUz(sc) ? "vung" : sc === "house" ? "nha" : sc) + "_" + day + (size === "wall" ? "_hinh_nen" : size === "l" ? "_lon" : "") + ".png";
    sfx("flip");
    H.send("snap:save:" + JSON.stringify({ name: name, url: url }));
  }

  // ~20 khung/giây khi đang dùng, ~5 khung/giây khi cửa sổ ở nền (đủ cho pixel art, đỡ tốn pin).
  // 1.14: Giao diện → cảnh sân "đứng yên" / "mờ" thì chỉ vẽ lại khi có thay đổi (hoặc mỗi 30 giây), "ẩn" thì không vẽ
  let stillDirty = true, stillAt = 0;
  let lastTick = -1;
  let startDone = false;      // 1.23: "Cảnh hiện: Luôn về Sân vườn khi mở vườn"
  function loop(ts) {
    if (!startDone && H && H.data() && H.data().ui) {
      startDone = true;
      if (H.data().ui.start === "yard") { setMainPref("yard"); }
    }
    // 1.15: 15 khung/giây (5 khi ở nền), bám cùng nhịp 30 khung/giây với ruộng (fx.js) để vẽ chung khung hình
    const every = document.hasFocus() ? 2 : 6, tk = Math.floor(Math.floor(ts / 33.34) / every);
    if (tk === lastTick) { requestAnimationFrame(loop); return; }
    lastTick = tk;
    const dt = lastTs ? Math.min(0.25, (ts - lastTs) / 1000) : 0.05;
    lastTs = ts;
    frame++;
    if (!document.hidden) {
      const now = Date.now();
      if (isOpen) { stepParts(scene, dt); drawPanel(now); }
      else {
        const ym = UIget("yard");
        if (ym === "full") {
          if (mainScene() === "house") { ["kitchen", "room", "bedroom"].forEach((k) => stepParts(k, dt)); } else { stepParts(mainScene(), dt); }
          drawMainYard(now);
        }
        else if (ym !== "hide" && (stillDirty || now - stillAt > 30000)) { stillDirty = false; stillAt = now; drawMainYard(now); }
        if (frame % 15 === 0) { syncCare(); }
      }
    }
    requestAnimationFrame(loop);
  }
  window.addEventListener("kb-ui-change", () => { stillDirty = true; });
  window.addEventListener("resize", () => { stillDirty = true; });

  // ---- 1.14: chip "🐾 đói · 🔧 sửa nhà" ở góc sân ----
  function careInfo() {
    const v = moreView(), m = moreData(), out = { pets: [], wear: (v.wear && v.wear.level) || 0 };
    // tự cho ăn bật thì Python đã cho ăn lúc mở vườn; còn bé nào chưa no tức là thiếu xu → vẫn phải báo
    out.pets = (v.pets || []).filter((p) => p.state !== "full");
    out.short = !!m.pet_auto && out.pets.length > 0;
    return out;
  }
  function syncCare() {
    const b = $("kb-care-btn");
    if (!b) { return; }
    const c = careInfo(), bits = [];
    if (c.pets.length) {
      const away = c.pets.filter((p) => p.state === "away").length;
      bits.push("[i:paw] " + (c.pets.length === 1 ? c.pets[0].name + (away ? " đi chơi" : " đói") :
        c.pets.length + " bé " + (away === c.pets.length ? "đi chơi" : away ? "cần ăn" : "đói")));
    }
    if (c.short) { bits[0] += " · thiếu xu"; }
    if (c.wear >= 2) { bits.push("[i:wrench] Sửa nhà"); }
    const txt = bits.length ? bits.join(" · ") + " ▸" : "";
    if (b.getAttribute("data-txt") !== txt) { b.setAttribute("data-txt", txt); GardenIcons.fill(b, txt); }
    b.hidden = !txt;
    b.setAttribute("data-tab", c.pets.length ? "pet" : "build");
  }

  function setTip(text) { const t = $("kb-h-tip"); if (t) { t.textContent = text || ""; } }
  // 1.22.5: cảnh còn ô đặt được món này không (vườn nhiều đồ: mua thêm khi sân đã kín thì báo rõ thay vì "bấm vào ô trống")
  function hasFreeCell(sc, id) {
    const c = catalog() || {}, g = isOut(sc) ? (c.yard || { cols: 16, rows: 4 }) : sc === "room" ? (c.room || { cols: 10, rows: 4 }) : { cols: (c.side || { cols: 9 }).cols, rows: 4 };
    for (let y = 0; y < g.rows; y++) { for (let x = 0; x < g.cols; x++) { if (!spotError(sc, id, x, y, placing && placing.index)) { return true; } } }
    return false;
  }
  function defaultTip() {
    if (placing) {
      const it = item(placing.id), nm = it ? it.name : placing.id;
      if (placing.index === undefined && !hasFreeCell(placing.scene, placing.id)) {
        setTip("“" + sceneName(placing.scene) + "” hết chỗ · “" + nm + "” đã vào Kho đồ: cất bớt đồ rồi bấm Đặt · Esc: huỷ");
        return;
      }
      setTip("Đang đặt “" + nm + "”: bấm ô xanh để đặt · Esc: huỷ");
    } else if (ZONE_IDS.indexOf(scene) >= 0 || isUz(scene)) {
      setTip(sceneName(scene) + ": bấm món đồ để dời chỗ hoặc cất kho");
    } else if (scene === "yard") {
      setTip(homeState().house >= ((catalog() || {}).room_unlock || 5) ?
        "Bấm ngôi nhà để vào trong · bấm món đồ để dời chỗ hoặc cất kho" :
        "Chưa có nhà · xây ở tab Xây nhà");
    } else {
      setTip("Đồ treo tường ở hàng trên, đồ khác dưới sàn · thảm đặt dưới bàn được");
    }
  }

  function hidePop() { const p = $("kb-h-pop"); if (p) { p.hidden = true; } }
  function showPop(e) {
    const p = $("kb-h-pop"), cv = $("kb-home-canvas");
    if (!p || !view) { return; }
    const it = item(e.id) || { w: 1, name: e.id };
    const r = cellRect(scene, e.x, e.y, it.w);
    const area = cv.parentNode.getBoundingClientRect(), cr = cv.getBoundingClientRect();
    p.querySelector(".kb-h-pop-name").textContent = it.name;
    const rd = $("kb-h-read");
    if (rd) { rd.hidden = e.id !== "shelf"; }
    p.hidden = false;
    const left = cr.left - area.left + (r.x + r.w / 2) * view.S - p.offsetWidth / 2;
    const top = cr.top - area.top + (r.y + r.h) * view.S + 6;
    p.style.left = Math.max(4, Math.min(area.width - p.offsetWidth - 4, left)) + "px";
    p.style.top = Math.min(area.height - p.offsetHeight - 2, top) + "px";
  }

  function canvasCell(ev) {
    const cv = $("kb-home-canvas");
    if (!cv || !view) { return null; }
    const r = cv.getBoundingClientRect();
    return cellAt(scene, (ev.clientX - r.left) / view.S, (ev.clientY - r.top) / view.S);
  }

  function onCanvasMove(ev) { hover = canvasCell(ev); }
  function onCanvasClick(ev) {
    const cell = canvasCell(ev);
    if (!placing && typeof GardenFinds !== "undefined" && view && isOut(scene)) {      // 1.28: chỗ lấp lánh / gánh hàng
      const cv = $("kb-home-canvas"), r = cv.getBoundingClientRect();
      const fh = GardenFinds.at(scene, (ev.clientX - r.left) / view.S, (ev.clientY - r.top) / view.S);
      if (fh) { GardenFinds.hit(fh, scene, ev); return; }
    }
    if (!placing && typeof GardenPets !== "undefined" && view) {
      const cv = $("kb-home-canvas"), r = cv.getBoundingClientRect();
      const pid = GardenPets.at(scene, (ev.clientX - r.left) / view.S, (ev.clientY - r.top) / view.S);
      if (pid) { GardenPets.cheer(pid); sfx("boop"); petFocus = pid; tab = "pet"; renderList(); return; }
    }
    if (!placing && typeof GardenGuests !== "undefined" && view) {      // 1.21: bấm khách → Album khách
      const cv = $("kb-home-canvas"), r = cv.getBoundingClientRect();
      const gid = GardenGuests.at(scene, (ev.clientX - r.left) / view.S, (ev.clientY - r.top) / view.S);
      if (gid) { GardenGuests.react(scene); sfx("boop"); guestFocus = gid; tab = "guest"; albumView = "guest"; renderList(); return; }
    }
    if (placing) {
      if (!cell) { return; }
      const err = spotError(scene, placing.id, cell.x, cell.y, placing.index);
      if (err) { sfx("again"); setTip("Không đặt được: " + err + " · Esc để huỷ"); return; }
      pendingSpot = { scene: scene, id: placing.id, x: cell.x, y: cell.y };
      if (placing.index !== undefined) { H.send("home:move:" + scene + ":" + placing.index + ":" + cell.x + ":" + cell.y); }
      else { H.send("home:place:" + scene + ":" + placing.id + ":" + cell.x + ":" + cell.y); }
      placing = null;
      return;
    }
    if (isOut(scene)) {
      const cv = $("kb-home-canvas"), r = cv.getBoundingClientRect();
      const ax = (ev.clientX - r.left) / view.S;
      if (ax < 64 && isUz(scene)) {
        const z = uzone(scene);
        mood("happy", 1200, "ようこそ！ " + (z ? z.name : "")); sfx("boop");
        return;
      }
      if (ax < 64 && scene !== "yard") {
        mood("happy", 1200, { beach: "海の家へようこそ！ Nghỉ chân ở bãi biển nhé", shrine: "合格祈願！ Cầu thi JLPT đỗ nè", festival: "たこ焼き、いかが？",
          bamboo: "お茶をどうぞ～ Mời uống trà nhé", onsen: "いい湯だな～ Nước ấm ghê!", station: "次は、ことば駅～ Ga tiếp theo: ga Kotoba" }[scene]);
        sfx("boop");
        return;
      }
      if (ax < 64) {
        const lvl = homeState().house, need = (catalog() || {}).room_unlock || 5;
        if (lvl >= need) { setScene("room"); sfx("flip"); }
        else { setTip("Cần xây tới bước “Lắp cửa & cửa sổ” mới vào nhà được."); }
        return;
      }
    }
    const idx = itemAt(scene, cell);
    if (idx >= 0) {
      selected = { scene: scene, index: idx };
      showPop(homeState()[scene][idx]);
      sfx("flip");
    } else {
      selected = null; hidePop();
    }
  }

  function startPlacing(id, index, where) {
    const it = item(id);
    if (!it) { return; }
    // đồ ngoài trời: đặt ở cảnh ngoài trời đang xem; nếu đang trong nhà thì về vùng của món (hoặc sân)
    let target = where || scene;
    if (it.scene === "room") {          // 1.24: gian đang xem; gian đó kín chỗ thì sang gian còn chỗ (mới mua / tự làm)
      target = isRoom(target) && canEnter(target) ? target : "room";
      if (index === undefined && canEnter(target) && !hasFreeCell(target, id)) {
        const alt = ["room", "kitchen", "bedroom"].find((r) => r !== target && canEnter(r) && hasFreeCell(r, id));
        if (alt) { target = alt; }
      }
    }
    else if (!isOut(target)) { target = canEnter(it.scene) ? it.scene : "yard"; }
    if (!canEnter(target)) {
      const lv = ((catalog() || {}).levels || [])[(catalog() || {}).room_unlock || 5];
      setTip(target === "room" ? "Xây nhà tới bước “" + (lv ? lv.name : "Lắp cửa & cửa sổ") + "” rồi mới bày đồ trong nhà được." : "Chưa vào được chỗ này.");
      return;
    }
    if (scene !== target) { setScene(target); }
    placing = { id: id, index: index, scene: target };
    selected = null; hidePop();
    defaultTip();
  }

  function setScene(s) {
    if (s === "house") { s = "room"; }          // 1.24: "Trong nhà" ở màn chính = cả nhà; bảng Nhà mở từng gian
    if (!canEnter(s)) { return; }
    scene = s;
    if (isOut(s)) { setMainPref(s); }
    renderScenes();
    if (placing && placing.scene !== s) { placing = null; }
    selected = null; hidePop(); hover = null;
    defaultTip();
    // 1.30: đang ở "Tường & sàn" thì danh sách theo gian đang xem
    if (decoTry) { decoTry = null; }
    if (isOpen && tab === "room" && roomView === "decor") { renderList(); }
  }
  // Nhiều vùng (6 vùng + vùng tự tạo) thì hàng nút cảnh xuống 2–3 dòng: bớt chiều cao khung xem / danh sách
  // đúng bằng phần thanh trên cao thêm, để bảng Nhà (và Xưởng phủ lên nó) vẫn vừa cửa sổ, trang không phải cuộn.
  let fitSig = "";
  let scrollBack = null;     // 1.22.5: chỗ cuộn của trang trước khi fitHome tự cuộn (cửa sổ rất thấp)
  function fitHome(check) {
    const home = $("kb-home"), top = home && home.querySelector(".kb-game-top");
    if (!top || home.hidden) { return; }
    // check = gọi từ vòng vẽ: chỉ tính lại khi cửa sổ / chỗ bảng / thanh trên / cảnh đổi (vd. dải giao diện mùa vừa hiện)
    const sig = window.innerWidth + "x" + window.innerHeight + "|" + Math.round(home.getBoundingClientRect().top + window.scrollY) + "|" +
      top.offsetHeight + "|" + (isOut(scene) ? "out" : "room");
    if (check && sig === fitSig) { return; }
    const list = $("kb-h-list"), vbox = home.querySelector(".kb-h-view");
    const extra = () => { const v = Math.max(0, top.offsetHeight - 36) + "px"; if (home.style.getPropertyValue("--kb-h-extra") !== v) { home.style.setProperty("--kb-h-extra", v); } };
    const over = () => Math.ceil(home.getBoundingClientRect().bottom + window.scrollY - window.innerHeight + 6);
    const shrink = (e, floor, by) => { e.style.height = Math.max(floor, Math.floor(parseFloat(getComputedStyle(e).height) - by)) + "px"; };   // height không gồm đệm / viền
    // drawPanel: chỗ cho cảnh = clientHeight − 30, cảnh tối thiểu ×2 → khung xem không thấp hơn mức này (cảnh Trong nhà cao
    // hơn sân: trước đây ở cửa sổ < 650 px cảnh tràn lên viền trên, dòng gợi ý đè viền dưới)
    const need = (isOut(scene) ? YARD.H : ROOM.H) * 2 + 30;
    home.classList.remove("kb-h-tight");
    if (vbox) { vbox.style.height = ""; if (parseFloat(getComputedStyle(vbox).height) < need) { vbox.style.height = need + "px"; } }
    if (list) { list.style.height = ""; }
    extra();
    // còn thừa (vd. dải trang trí của giao diện mùa đẩy cả trang xuống): danh sách thấp bớt cho đáy bảng vừa cửa sổ
    let o = list ? over() : 0;
    if (o > 0) { shrink(list, 140, o); o = over(); }
    if (o > 0) {
      // 1.22.5: cửa sổ thấp (laptop 1366 × 768 đặt Windows 125% → trang ~1093 × 560; Anki cho thu nhỏ tới 720 × 520) —
      // trước đây danh sách đồ (nút Mua…) nằm dưới mép cửa sổ, phải cuộn cả trang. Thanh trên của bảng gọn lại (nút cảnh
      // một hàng, cuộn ngang), khung xem thấp tới mức cảnh còn ×2, danh sách tới 120 px.
      home.classList.add("kb-h-tight");
      list.style.height = "";
      extra();
      o = over();
      if (o > 0 && vbox && parseFloat(getComputedStyle(vbox).height) > need) { shrink(vbox, need, o); o = over(); }
      if (o > 0) { shrink(list, 120, o); o = over(); }
      // vẫn cao hơn cửa sổ (cỡ nhỏ nhất 720 × 520): cuộn trang cho đáy bảng vừa cửa sổ — thanh trên của vườn tạm khuất
      // (bảng có Ví / Thoát riêng); đóng bảng thì cuộn về chỗ cũ
      if (o > 0) {
        const y = Math.min(o, Math.max(0, Math.round(home.getBoundingClientRect().top + window.scrollY)));
        if (y > window.scrollY + 1) { if (scrollBack === null) { scrollBack = window.scrollY; } window.scrollTo(0, y); }
      }
    }
    fitSig = window.innerWidth + "x" + window.innerHeight + "|" + Math.round(home.getBoundingClientRect().top + window.scrollY) + "|" +
      top.offsetHeight + "|" + (isOut(scene) ? "out" : "room");
  }
  // Nút chuyển cảnh: Sân · Trong nhà · các vùng đã mở · vùng kế tiếp (khoá)
  function renderScenes() {
    const box0 = document.querySelector(".kb-h-scenes");
    const cat = catalog();
    if (!box0) { return; }
    const list = ["yard", "room"].concat(SIDE_IDS.filter((r) => canEnter(r)), ZONE_IDS.filter((z) => zoneOpen(z)), uzIds());
    const nextZone = ((cat && cat.zones) || []).find((z) => !zoneOpen(z.id));
    // 1.24: gian chưa mở không có nút ở đây (thanh trên tràn ở 1024 px) — mở ở tab Xây nhà / bấm gian tối ở màn chính
    const key = list.map(sceneName).join(",") + "|" + list.join(",") + "|" + (nextZone ? nextZone.id : "") + "|" + scene + "|" + homeState().house;
    if (box0.getAttribute("data-key") === key) { fitHome(); return; }
    box0.setAttribute("data-key", key);
    box0.textContent = "";
    list.forEach((sc) => {
      const b = el("button", "kb-btn kb-btn-small kb-h-scene" + (sc === scene ? " is-on" : ""), sceneName(sc));
      b.type = "button"; b.setAttribute("data-scene", sc);
      if (!canEnter(sc)) { b.disabled = true; b.title = "Xây tới “Lắp cửa & cửa sổ” để vào nhà"; }
      b.addEventListener("click", () => setScene(sc));
      box0.appendChild(b);
    });
    if (nextZone) {
      const b = GardenIcons.fill(el("button", "kb-btn kb-btn-small kb-h-scene kb-h-scene-lock"), "[i:lock] " + nextZone.name);
      b.type = "button"; b.title = "Mở khoá ở tab “Vùng mới”";
      b.addEventListener("click", () => { tab = "zone"; renderList(); });
      box0.appendChild(b);
    }
    fitHome();
  }

  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
  function mood(m, ms, text) {
    if (typeof GardenFX === "undefined") { return; }
    GardenFX.mood(m, ms); if (text) { GardenFX.say(text, ms); }
  }

  // ---- danh sách cửa hàng ----
  function iconCanvas(rowsArr, size) {
    const cv = document.createElement("canvas");
    cv.width = size; cv.height = size;
    cv.className = "kb-h-icon";
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const w = rowsArr[0].length, h = rowsArr.length;
    const S = Math.max(1, Math.floor(Math.min((size - 2) / w, (size - 2) / h)));
    sprite(ctx, rowsArr, Math.floor((size / S - w) / 2), Math.floor((size / S - h) / 2), S);
    return cv;
  }
  // 1.25: ảnh nhỏ cả nhà 3 gian (tab Xây nhà): thẻ Mở rộng nhà (kiểu đang dùng) + từng kiểu nhà; vẽ như đã mở rộng
  function house3Preview(style, cssW) {
    const cv = document.createElement("canvas");
    cv.width = HOUSE3.W; cv.height = ROOM.H;
    cv.className = "kb-h-house3";
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    drawHouse3(ctx, 1, 0, 0, Date.now(), { open: true, noPets: true, style: style || undefined });
    lights.length = 0;
    cv.style.width = cssW + "px"; cv.style.height = Math.round(cssW * ROOM.H / HOUSE3.W) + "px";
    return cv;
  }
  function housePreview(level, size, style, wear) {
    const cv = document.createElement("canvas");
    cv.width = 64 * 2; cv.height = 76 * 2;
    cv.className = "kb-h-house";
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    box(ctx, 0, 0, 64, 28, "#c4ecff", 2); box(ctx, 0, 28, 64, 48, "#5ed35e", 2);
    drawHouse(ctx, 2, 0, 0, level, Date.now(), "day", style);
    if (wear) { drawWear(ctx, 2, 0, 0, { house: level, style: style }, Date.now(), { light: 1, rain: 0 }, wear); }
    lights.length = 0;
    if (size) { cv.style.width = size + "px"; }
    return cv;
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined && text !== null) { e.textContent = text; }
    if (tag === "button") { e.addEventListener("mousedown", (ev) => ev.preventDefault()); }
    return e;
  }

  function scenePreview(zid) {
    const cv = document.createElement("canvas");
    cv.width = YARD.W; cv.height = YARD.H; cv.className = "kb-h-zoneview";
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    drawOutdoor(ctx, 1, 0, 0, Date.now(), zid, { noPets: true, noJoy: true });
    lights.length = 0;
    return cv;
  }
  function mascotCanvas(on, mood, sc) {
    const L = typeof GardenFX !== "undefined" && GardenFX.lib;
    const cv = document.createElement("canvas");
    cv.width = 20 * sc; cv.height = 23 * sc; cv.className = "kb-h-mascot";
    if (L && L.paintFace) {
      const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
      ctx.translate(0, 5 * sc);
      L.paintFace(ctx, sc, mood || "idle", Date.now(), 0, on || {});
    }
    return cv;
  }
  function btn(text, cls, onClick, disabled, title) {
    const b = el("button", "kb-btn " + (cls || "kb-btn-small"), text);
    b.type = "button"; b.disabled = !!disabled;
    if (title) { b.title = title; }
    // 1.22.5: lần bấm thứ hai của một cú bấm đúp không làm gì — trước đây bấm đúp "Xây" xây luôn hai bước, "Mua" /
    // "+1 cái" / "Sửa 1 nấc" trả xu hai lần, bấm đúp "Xoá vùng" qua luôn bước "Bấm lần nữa" (danh sách vẽ lại giữa hai lần bấm)
    if (onClick) { b.addEventListener("click", (e) => { if (e.detail > 1) { return; } onClick(e); }); }
    return b;
  }
  // 1.22.5: lệnh trả xu đã gửi mà Python chưa trả lời (collection lớn / máy chậm) → bỏ qua lần bấm tiếp, tối đa 4 giây
  let payWait = 0;
  // 1.30.1: q = {title, price, cost, yes, note} → hỏi lại trước (GardenUI.ask; tắt ở ⚙ thì gửi ngay); then: chạy sau khi gửi lệnh
  function pay(cmd, q, then) {
    const go = () => {
      if (payWait && Date.now() - payWait < 4000) { return; }
      payWait = Date.now();
      H.send(cmd);
      if (then) { then(); }
    };
    if (q && typeof GardenUI !== "undefined" && GardenUI.ask) { GardenUI.ask(Object.assign({}, q, { then: go })); } else { go(); }
    return true;
  }
  const ZONE_NOTE = {
    beach: "Cát trắng, sóng vỗ, nhà nghỉ biển. Có cua, phao bơi, cây dừa, hải đăng…",
    shrine: "Đền nhỏ giữa rừng tuyết tùng, núi tuyết phía xa. Có cáo kitsune, komainu, bể rửa tay…",
    festival: "Phố đêm lễ hội với dây đèn lồng và xe yatai. Có trống taiko, hồ vớt cá vàng, pháo hoa…",
    bamboo: "Rừng tre xanh mát, nắng xiên qua kẽ lá, quán trà với ô giấy đỏ. Có gấu trúc, ống tre shishi-odoshi, đom đóm…",
    onsen: "Lữ quán suối nước nóng giữa núi tuyết, hơi nước bốc nghi ngút. Có khỉ tuyết, bồn tắm đá, người tuyết…",
    station: "Ga tàu nhỏ dưới chân núi Phú Sĩ, tàu chạy qua ruộng lúa (sang thu thì chín vàng). Có đèn chắn tàu, máy bán nước…"
  };
  const WEAR_SLOT_NAME = { head: "Mũ", face: "Mặt", neck: "Cổ", shell: "Vỏ" };
  let delArm = null;   // mẫu đang chờ bấm "Xoá" lần hai

  // 1.25.5 (admin): nút "Sửa hình" cho hình có sẵn — mở Xưởng ở chế độ hình gốc.
  // 1.25.7: người dùng thường có "Góp ý hình" ở món mình đang có — vẽ thử rồi lưu file gửi người làm add-on, vườn không đổi
  function fixBtn(row, group, id, name, owned) {
    const d = H && H.data();
    if (!d || typeof GardenFix === "undefined" || typeof GardenCraft === "undefined" || !GardenCraft.openBase ||
        !GardenFix.editable(group, id) || (!d.admin && !owned)) { return; }
    if (!d.admin) {
      const g = btn("Góp ý hình", "kb-btn-small kb-h-fix", () => GardenCraft.openBase({ group: group, id: id, name: name, suggest: true }));
      g.title = "Thấy hình chưa đẹp? Vẽ lại rồi gửi file qua email cho người làm ことば畑";
      row.appendChild(g);
      return;
    }
    const b = btn("Sửa hình", "kb-btn-small kb-h-fix" + (GardenFix.has(group, id) ? " is-fixed" : ""), () => GardenCraft.openBase({ group: group, id: id, name: name }));
    if (GardenFix.has(group, id)) { b.title = "Đã sửa"; }
    row.appendChild(b);
  }
  // 1.30: món đồ / vùng này cho StackChan làm việc gì (data.life.defs) → dòng nhỏ trên thẻ cửa hàng
  let lifeSig = null, lifeByItem = {}, lifeByZone = {};
  function lifeIndex() {
    const lf = H && H.data() && H.data().life, defs = (lf && lf.defs) || null;
    if (defs === lifeSig) { return; }
    lifeSig = defs; lifeByItem = {}; lifeByZone = {};
    Object.keys(defs || {}).forEach((k) => {
      const d = defs[k];
      (d.need || []).forEach((i) => { (lifeByItem[i] = lifeByItem[i] || []).push(d.name); });
      if (!(d.need || []).length && ZONE_IDS.indexOf(d.where) >= 0) { (lifeByZone[d.where] = lifeByZone[d.where] || []).push(d.name); }
    });
  }
  function lifeLine(names) {
    if (!names || !names.length) { return null; }
    const row = GardenIcons.fill(el("div", "kb-h-desc kb-h-life"), "[i:stack] " + names.slice(0, 3).join(" · ") + (names.length > 3 ? "…" : ""));
    row.title = "StackChan: " + names.join(", ") + " (đúng giờ thì tự làm)";
    return row;
  }
  function itemCard(list, it, opts) {
    const home = homeState(), money = coins(), cat = catalog();
    const owned = home.owned[it.id] || 0;
    const placed = placedOf(it.id);
    const avail = owned - placed;
    const special = it.rare || !!it.only;       // 1.28: quà Hộp sưu tầm / món gánh hàng rong: không bán ở cửa hàng
    const card = el("div", "kb-h-card" + (it.rare ? " kb-h-card-rare" : it.only ? " kb-h-card-only" : "") + (special && !owned ? " kb-h-locked" : ""));
    card.appendChild(iconCanvas(SPR[it.id] || ["k"], 68));
    const info = el("div", "kb-h-info");
    const nm = el("div", "kb-h-name", it.name);
    if (it.new && !owned) { nm.appendChild(el("span", "kb-h-newtag", "Mới")); }
    info.appendChild(nm);
    if (it.desc) { info.appendChild(el("div", "kb-h-desc", "✦ " + it.desc)); }
    if (!opts.inv) { lifeIndex(); const ll = lifeLine(lifeByItem[it.id]); if (ll) { info.appendChild(ll); } }
    if (!opts.inv && !it.custom) {
      const SETN = { yard: "Sân vườn", beach: "Bãi biển", shrine: "Đền trên núi", festival: "Phố lễ hội", bamboo: "Rừng tre", onsen: "Suối nước nóng", station: "Ga làng quê" };
      const label = it.rare ? "Quà rương nhiệm vụ" : it.only === "set" ? "Quà đủ bộ " + (SETN[it.set] || "") + " (Hộp sưu tầm)" :
        it.only === "ped" ? "Chỉ có ở gánh hàng rong · " + kbXu(it.price) + " xu" : kbXu(it.price) + " xu";
      info.appendChild(el("div", "kb-h-price" + (it.rare ? " kb-h-rare" : it.only ? " kb-h-only" : ""), label +
        (it.w > 1 ? " · rộng " + it.w + " ô" : "") + (it.place === "wall" ? " · treo tường" : "")));
    }
    if (owned) { info.appendChild(el("div", "kb-h-own", "Có " + owned + (placed ? " · đã đặt " + placed : "") + (avail ? " · trong kho " + avail : ""))); }
    const row = el("div", "kb-h-btns");
    if (!opts.inv && !special && !it.custom) {
      const locked = (it.scene === "room" && home.house < cat.room_unlock) || (it.zone && !zoneOpen(it.zone)) ||
        (it.season && !themeOpen(it.season));
      const maxed = owned >= it.max;
      const short = !locked && !maxed && money < it.price;      // 1.30.1: thiếu xu thì nút ghi luôn còn thiếu bao nhiêu
      const b = btn(maxed ? "Đã có" : short ? "Thiếu " + kbXu(it.price - money) + " xu" : "Mua", "kb-h-buy", () => pay("home:buy:" + it.id, { title: "Mua " + it.name + "?", price: it.price, note: "Mua xong đặt luôn vào cảnh." }, () => { pendingPlace = it.id; }),
        locked || maxed || money < it.price, !locked && !maxed && money < it.price ? "Thiếu " + kbXu(it.price - money) + " xu" : "");
      row.appendChild(b);
    }
    if (avail > 0) { row.appendChild(btn("Đặt", "kb-btn-small kb-h-place", () => startPlacing(it.id))); }
    if (!it.custom) { fixBtn(row, "do", it.id, it.name, owned > 0); }
    info.appendChild(row);
    card.appendChild(info);
    list.appendChild(card);
    return card;
  }

  function renderList() {
    const list = $("kb-h-list");
    if (!list) { return; }
    const cat = catalog();
    const keep = list.getAttribute("data-tab") === tab ? list.scrollTop : 0;
    list.setAttribute("data-tab", tab);
    requestAnimationFrame(() => { list.scrollTop = keep; });
    list.textContent = "";
    if (tab !== "guest") { guestHi = null; }
    Array.prototype.forEach.call(document.querySelectorAll("#kb-home .kb-h-tab"), (b) => {
      b.classList.toggle("is-on", b.getAttribute("data-tab") === tab);
    });
    const home = homeState(), money = coins();
    $("kb-h-coins").textContent = kbXu(money) + " xu";
    if (!cat) { list.appendChild(el("div", "kb-h-empty", "Đang tải…")); return; }
    renderScenes();
    const unlock = cat.room_unlock;
    const sec = (text) => list.appendChild(el("div", "kb-h-sec", text));

    if (tab === "build") {
      const lv = home.house;
      if (lv >= 3) { renderRepair(list, home, money); }
      const cur = el("div", "kb-h-card kb-h-build");
      cur.appendChild(housePreview(lv, 64, home.style, wearLevel()));
      const info = el("div", "kb-h-info");
      info.appendChild(el("div", "kb-h-name", "Hiện tại: " + cat.levels[lv].name));
      const steps = el("div", "kb-h-steps");
      cat.levels.forEach((L, i) => { steps.appendChild(el("span", "kb-h-step" + (i <= lv ? " is-done" : ""), (i <= lv ? "✓ " : "") + L.name)); });
      info.appendChild(steps);
      cur.appendChild(info);
      list.appendChild(cur);
      if (lv + 1 < cat.levels.length) {
        const nx = cat.levels[lv + 1];
        const card = el("div", "kb-h-card kb-h-build");
        card.appendChild(housePreview(lv + 1, 64));
        const inf = el("div", "kb-h-info");
        inf.appendChild(el("div", "kb-h-name", "Bước tiếp: " + nx.name));
        inf.appendChild(el("div", "kb-h-price", kbXu(nx.price) + " xu"));
        if (lv + 1 === unlock) { inf.appendChild(el("div", "kb-h-note", "Mở khoá: vào trong nhà và mua nội thất")); }
        inf.appendChild(btn(money >= nx.price ? "Xây" : "Thiếu " + kbXu(nx.price - money) + " xu", "kb-h-buy", () => pay("home:build:" + (lv + 1), { title: "Xây bước tiếp: " + nx.name + "?", price: nx.price, yes: "Xây" }), money < nx.price));
        card.appendChild(inf);
        list.appendChild(card);
        if (cat.styles) { list.appendChild(el("div", "kb-h-empty", "Xây xong 7 bước: mở thêm kiểu nhà, Bếp và Phòng ngủ.")); }
      } else {
        list.appendChild(el("div", "kb-h-empty", "Nhà đã xây xong! Giờ trang trí thôi ♪"));
        // 1.24: nhà 3 gian
        // 1.25: mở rộng nhà một lần được cả Bếp lẫn Phòng ngủ
        sec("Mở rộng nhà");
        {
          const price = cat.nha_price || 2000, opened = (cat.rooms || []).every((rm) => canEnter(rm.id));
          const card = el("div", "kb-h-card kb-h-build kb-h-room kb-h-nha" + (opened ? " kb-h-using" : ""));
          card.appendChild(house3Preview(null, 228));
          const inf = el("div", "kb-h-info");
          inf.appendChild(el("div", "kb-h-name", "Bếp + Phòng ngủ"));
          inf.appendChild(el("div", "kb-h-price", opened ? "Đã mở" : kbXu(price) + " xu"));
          if (opened) {
            const row = el("div", "kb-h-btnrow");
            (cat.rooms || []).forEach((rm) => row.appendChild(btn(scene === rm.id ? "Đang ở " + rm.name : "Đến " + rm.name, "kb-h-buy", () => setScene(rm.id), scene === rm.id)));
            inf.appendChild(row);
          } else {
            inf.appendChild(btn(money >= price ? "Mở rộng" : "Thiếu " + kbXu(price - money) + " xu", "kb-h-buy", () => pay("home:nha:open", { title: "Mở rộng nhà: thêm Bếp và Phòng ngủ?", price: price, yes: "Mở rộng" }), money < price));
          }
          card.appendChild(inf);
          list.appendChild(card);
        }
        sec("Kiểu nhà · đổi qua lại miễn phí sau khi mua");
        (cat.styles || []).forEach((stl) => {
          const own = stl.id === "classic" || (home.styles || []).indexOf(stl.id) >= 0;
          const using = (home.style || "classic") === stl.id;
          const card = el("div", "kb-h-card kb-h-build" + (using ? " kb-h-using" : ""));
          card.appendChild(housePreview(7, 64, stl.id));
          const inf = el("div", "kb-h-info");
          inf.appendChild(el("div", "kb-h-name", stl.name));
          inf.appendChild(house3Preview(stl.id, 152));          // 1.25: ba gian bên trong theo kiểu này
          inf.appendChild(el("div", "kb-h-price", own ? (using ? "Đang dùng" : "Đã có") : kbXu(stl.price) + " xu"));
          if (own) { inf.appendChild(btn(using ? "Đang dùng" : "Dùng kiểu này", "kb-h-buy", () => H.send("home:style:use:" + stl.id), using)); }
          else {
            inf.appendChild(btn(money >= stl.price ? "Mua · " + kbXu(stl.price) + " xu" : "Thiếu " + kbXu(stl.price - money) + " xu", "kb-h-buy",
              () => pay("home:style:buy:" + stl.id, { title: "Mua kiểu nhà " + stl.name + "?", price: stl.price }), money < stl.price));
          }
          card.appendChild(inf);
          list.appendChild(card);
        });
      }
      return;
    }

    if (tab === "season") { renderSeason(list, cat, money); return; }
    if (tab === "pet") { renderPets(list, cat, money); return; }
    if (tab === "guest") { renderAlbum(list); return; }
    if (tab === "seed") { renderSeeds(list, cat, money); return; }

    if (tab === "zone") {
      (cat.zones || []).forEach((z, i) => {
        const open = zoneOpen(z.id);
        const isNext = !open && i === (home.zones || []).length;
        const card = el("div", "kb-h-card kb-h-zone" + (open ? "" : " kb-h-zone-locked"));
        card.appendChild(scenePreview(z.id));
        const info = el("div", "kb-h-info");
        const zn = GardenIcons.fill(el("div", "kb-h-name"), (open ? "" : "[i:lock] ") + z.name);
        if (z.new && !open) { zn.appendChild(el("span", "kb-h-newtag", "Mới")); }
        info.appendChild(zn);
        info.appendChild(el("div", "kb-h-desc", ZONE_NOTE[z.id] || ""));
        { lifeIndex(); const ll = lifeLine(lifeByZone[z.id]); if (ll) { info.appendChild(ll); } }
        if (open) {
          info.appendChild(btn(scene === z.id ? "Đang ở đây" : "Đến " + z.name, "kb-h-buy", () => setScene(z.id), scene === z.id));
        } else if (isNext) {
          info.appendChild(el("div", "kb-h-price", kbXu(z.price) + " xu"));
          info.appendChild(btn(money >= z.price ? "Mở khoá" : "Thiếu " + kbXu(z.price - money) + " xu", "kb-h-buy",
            () => pay("home:zone:" + z.id, { title: "Mở khoá vùng " + z.name + "?", price: z.price, yes: "Mở khoá" }), money < z.price));
        } else {
          info.appendChild(el("div", "kb-h-price", kbXu(z.price) + " xu · mở sau “" + cat.zones[i - 1].name + "”"));
        }
        card.appendChild(info);
        list.appendChild(card);
        if (open) { cat.items.filter((it) => it.zone === z.id).forEach((it) => itemCard(list, it, {})); }
      });
      renderUzones(list, cat, money);
      return;
    }

    if (tab === "wear") {
      const w = (H.data().wallet || {}).wear || { owned: [], on: {}, faces: [], faces_off: [] };
      const top = el("div", "kb-h-card kb-h-wear-top");
      top.appendChild(mascotCanvas(w.on, "happy", 4));
      const ti = el("div", "kb-h-info");
      ti.appendChild(el("div", "kb-h-name", "StackChan của bạn"));
      const worn = el("div", "kb-h-btns");
      Object.keys(WEAR_SLOT_NAME).forEach((slot) => {
        const id = w.on[slot];
        if (!id) { return; }
        const it = (cat.wear || []).find((x) => x.id === id);
        worn.appendChild(btn("Cởi " + (it ? it.name : id) + " ✕", "kb-btn-small", () => H.send("home:wear:off:" + slot)));
      });
      if (!worn.childNodes.length) { ti.appendChild(el("div", "kb-h-desc", "Chưa mặc gì. Mua đồ bên dưới, mua xong là mặc luôn.")); }
      ti.appendChild(worn);
      top.appendChild(ti);
      list.appendChild(top);
      Object.keys(WEAR_SLOT_NAME).forEach((slot) => {
        sec(WEAR_SLOT_NAME[slot]);
        (cat.wear || []).filter((it) => it.slot === slot).forEach((it) => {
          const own = w.owned.indexOf(it.id) >= 0, on = w.on[slot] === it.id;
          const card = el("div", "kb-h-card" + (on ? " kb-h-using" : ""));
          const preview = Object.assign({}, w.on); preview[slot] = it.id;
          card.appendChild(mascotCanvas(preview, "idle", 2));
          const inf = el("div", "kb-h-info");
          inf.appendChild(el("div", "kb-h-name", it.name));
          inf.appendChild(el("div", "kb-h-price", own ? (on ? "Đang mặc" : "Đã có") : kbXu(it.price) + " xu"));
          const row = el("div", "kb-h-btns");
          if (own) { row.appendChild(on ? btn("Cởi", "kb-btn-small", () => H.send("home:wear:off:" + slot)) : btn("Mặc", "kb-h-buy", () => H.send("home:wear:on:" + it.id))); }
          else { row.appendChild(btn(money < it.price ? "Thiếu " + kbXu(it.price - money) + " xu" : "Mua", "kb-h-buy", () => pay("home:wear:buy:" + it.id, { title: "Mua " + it.name + " cho StackChan?", price: it.price }), money < it.price, money < it.price ? "Thiếu " + kbXu(it.price - money) + " xu" : "")); }
          inf.appendChild(row);
          card.appendChild(inf);
          list.appendChild(card);
        });
      });
      sec("Biểu cảm · StackChan thỉnh thoảng dùng thay biểu cảm thường");
      const MOOD_TXT = { happy: "khi trả lời đúng", star: "khi lên cây / combo", sad: "khi bấm Lại", think: "khi lật thẻ" };
      (cat.faces || []).forEach((f) => {
        const own = w.faces.indexOf(f.id) >= 0, off = (w.faces_off || []).indexOf(f.id) >= 0;
        const card = el("div", "kb-h-card" + (own && !off ? " kb-h-using" : ""));
        card.appendChild(mascotCanvas(w.on, f.id, 2));
        const inf = el("div", "kb-h-info");
        inf.appendChild(el("div", "kb-h-name", f.name));
        inf.appendChild(el("div", "kb-h-desc", "Dùng " + f.moods.map((m) => MOOD_TXT[m] || m).join(", ")));
        const row = el("div", "kb-h-btns");
        if (own) { row.appendChild(btn(off ? "Đang tắt · bật lại" : "Đang dùng · tắt", "kb-btn-small", () => H.send("home:face:toggle:" + f.id))); }
        else { row.appendChild(btn("Mua · " + kbXu(f.price) + " xu", "kb-h-buy", () => pay("home:face:buy:" + f.id, { title: "Mua biểu cảm " + f.name + "?", price: f.price }), money < f.price)); }
        inf.appendChild(row);
        card.appendChild(inf);
        list.appendChild(card);
      });
      return;
    }

    if (tab === "craft") {
      const cc = cat.craft || { prices: {}, edit: 50, max: 60 };
      const mine = cat.items.filter((it) => it.custom);
      renderShareBox(list, "craft");
      const add = el("div", "kb-h-card kb-h-craft-new");
      add.appendChild(el("div", "kb-h-craft-plus", "＋"));
      const ai = el("div", "kb-h-info");
      ai.appendChild(el("div", "kb-h-name", "Tạo món đồ mới"));
      ai.appendChild(el("div", "kb-h-desc", "Tự vẽ, hoặc chọn một tấm ảnh để chuyển thành pixel rồi sửa."));
      ai.appendChild(el("div", "kb-h-price", "16×16: " + kbXu(cc.prices["16"]) + " xu · 24×24: " + kbXu(cc.prices["24"]) + " xu · 32×32: " + kbXu(cc.prices["32"]) + " xu"));
      // 1.22.5: chưa đủ xu cho cỡ nhỏ nhất thì khoá như "Tạo vùng mới" / "Tự vẽ giống cây" (trước đây mở được, vẽ xong mới
      // biết không lưu được — đóng Xưởng là mất hình)
      const cheap = Math.min.apply(null, Object.keys(cc.prices || {}).map((k) => Number(cc.prices[k])).filter((n) => n > 0).concat([200]));
      const cfull = mine.length >= cc.max, cpoor = !cfull && money < cheap;
      ai.appendChild(btn(cpoor ? "Thiếu " + kbXu(cheap - money) + " xu" : "Mở xưởng", "kb-h-buy", () => { if (typeof GardenCraft !== "undefined") { GardenCraft.open(null); } },
        cfull || cpoor, cfull ? "Đã đủ " + cc.max + " mẫu" : cpoor ? "Món nhỏ nhất (16×16) " + kbXu(cheap) + " xu" : ""));
      add.appendChild(ai);
      list.appendChild(add);
      const ms = cat.myseed || { price: 500 };
      const addS = el("div", "kb-h-card kb-h-craft-new");
      addS.appendChild(el("div", "kb-h-craft-plus", "＋"));
      const si = el("div", "kb-h-info");
      si.appendChild(el("div", "kb-h-name", "Tự vẽ giống cây"));
      si.appendChild(el("div", "kb-h-desc", "Cây 16×16 cho từng giai đoạn, gieo cho deck / loại note / tag ở tab Giống cây."));
      si.appendChild(el("div", "kb-h-price", kbXu(ms.price) + " xu · " + mySeeds().length + "/" + (ms.max || 12) + " giống"));
      const sfull = mySeeds().length >= (ms.max || 12), spoor = !sfull && money < ms.price;
      si.appendChild(btn(spoor ? "Thiếu " + kbXu(ms.price - money) + " xu" : "Mở xưởng", "kb-h-buy", () => { if (typeof GardenCraft !== "undefined" && GardenCraft.openSeed) { GardenCraft.openSeed(null); } },
        sfull || spoor, sfull ? "Đã đủ " + (ms.max || 12) + " giống" : ""));
      addS.appendChild(si);
      list.appendChild(addS);
      renderPaste(list, cat, money);
      if (mine.length) { sec("Món của bạn (" + mine.length + "/" + cc.max + ")"); }
      const KIND = { ground: "ngoài trời", floor: "sàn trong nhà", wall: "treo tường" };
      const FXN = { sway: "đung đưa", bounce: "nhún nhảy", float: "bay lơ lửng", sparkle: "lấp lánh", glow: "phát sáng ban đêm",
        hearts: "tim bay", notes: "nốt nhạc", bubbles: "bong bóng", pulse: "nhấp nháy sáng", spin: "xoay tròn" };
      mine.forEach((it) => {
        const owned = home.owned[it.id] || 0, placed = placedOf(it.id), avail = owned - placed;
        const card = el("div", "kb-h-card kb-h-craftcard");
        card.appendChild(iconCanvas(SPR[it.id] || ["k"], 68));
        const inf = el("div", "kb-h-info");
        inf.appendChild(el("div", "kb-h-name", it.name));
        inf.appendChild(el("div", "kb-h-price", it.size + "×" + it.size + " · " + KIND[it.place]));
        if (FXN[it.fx]) { inf.appendChild(el("div", "kb-h-desc", "✦ " + FXN[it.fx])); }
        inf.appendChild(el("div", "kb-h-own", "Có " + owned + (placed ? " · đã đặt " + placed : "") + (avail ? " · trong kho " + avail : "")));
        const row = el("div", "kb-h-btns");
        if (avail > 0) { row.appendChild(btn("Đặt", "kb-btn-small kb-h-place", () => startPlacing(it.id))); }
        row.appendChild(btn("Sửa · " + kbXu(cc.edit) + " xu", "kb-btn-small", () => { if (typeof GardenCraft !== "undefined") { GardenCraft.open(it); } }, false,
          "Đổi tên / hiệu ứng miễn phí, vẽ lại hình " + kbXu(cc.edit) + " xu"));
        const half = Math.floor((cc.prices[String(it.size)] || 0) / 2);
        row.appendChild(btn("+1 cái · " + kbXu(half) + " xu", "kb-btn-small", () => pay("home:craft:copy:" + it.id, { title: "Làm thêm 1 cái " + it.name + "?", price: half, yes: "Làm thêm" }), money < half));
        row.appendChild(shareBtn(it.id));
        const armed = delArm === it.id;
        row.appendChild(btn(armed ? "Bấm lần nữa để xoá" : "Xoá mẫu", "kb-btn-small kb-h-del" + (armed ? " is-armed" : ""), () => {
          if (delArm === it.id) { delArm = null; H.send("home:craft:del:" + it.id); } else { delArm = it.id; renderList(); }
        }, placed > 0, placed > 0 ? "Cất hết món này vào kho trước" : ""));
        inf.appendChild(row);
        card.appendChild(inf);
        list.appendChild(card);
      });
      return;
    }

    let items = cat.items.filter((i) => !i.custom);
    let extra = [];        // 1.28: quà Hộp sưu tầm + món gánh hàng rong — nhóm riêng cuối danh sách
    if (tab === "yard") { items = items.filter((i) => i.scene === "yard" && !i.season); }
    else if (tab === "room") { items = items.filter((i) => i.scene === "room" && !i.season); }
    else { items = cat.items.filter((i) => (home.owned[i.id] || 0) > 0); }
    if (tab === "yard" || tab === "room") { extra = items.filter((i) => i.only); items = items.filter((i) => !i.only); }
    const extraSec = () => {
      if (!extra.length) { return; }
      sec("Hộp sưu tầm · gánh hàng rong");
      extra.forEach((it) => itemCard(list, it, {}));
    };
    if (tab === "room") { roomChips(list); }       // 1.30: Đồ nội thất · Tường & sàn
    if (tab === "room" && home.house < unlock) {
      list.appendChild(el("div", "kb-h-empty", "Xây nhà tới bước “" + cat.levels[unlock].name + "” để mua nội thất."));
    }
    if (tab === "room" && roomView === "decor") { if (home.house >= unlock) { renderDecor(list, cat, money); } return; }
    if (tab === "inv" && !items.length) { list.appendChild(el("div", "kb-h-empty", "Kho đang trống. Mua đồ ở tab “Trang trí sân” hoặc “Nội thất”.")); }
    if (tab === "inv" && items.length) {
      // có nhiều đồ (hơn 100 món khi mua hết) thì món còn trong kho lên đầu, khỏi phải tìm nút "Đặt" giữa đồ đã đặt
      const left = items.filter((it) => (home.owned[it.id] || 0) > placedOf(it.id)), done = items.filter((it) => left.indexOf(it) < 0);
      if (left.length && done.length) { sec("Trong kho · chưa đặt (" + left.length + ")"); }
      left.forEach((it) => itemCard(list, it, { inv: true }));
      if (left.length && done.length) { sec("Đã đặt hết (" + done.length + ")"); }
      done.forEach((it) => itemCard(list, it, { inv: true }));
      return;
    }
    if (tab === "room") {      // 1.24: nhóm Phòng chính / Bếp / Phòng ngủ (đồ nào cũng đặt được ở cả ba gian)
      [["", "Phòng chính"], ["kitchen", "Bếp"], ["bedroom", "Phòng ngủ"]].forEach(([g, name]) => {
        const grp = items.filter((it) => (it.group || "") === g);
        if (!grp.length) { return; }
        sec(name);
        grp.forEach((it) => itemCard(list, it, {}));
      });
      extraSec();
      return;
    }
    items.forEach((it) => itemCard(list, it, { inv: tab === "inv" }));
    extraSec();
  }
  // ---- 1.30: tab Nội thất → "Tường & sàn": giấy dán tường + sàn cho từng gian ----
  let roomView = "items";      // items | decor
  let pendingDecor = null;     // mẫu vừa bấm Mua → mua xong dùng luôn cho gian đang xem
  let tileDelArm = null;
  function decoRoom() { return isRoom(scene) && canEnter(scene) ? scene : "room"; }
  function roomChips(list) {
    const row = el("div", "kb-h-btns kb-album-chips kb-room-chips");
    [["items", "Đồ nội thất"], ["decor", "Tường & sàn"]].forEach(([k, label]) => {
      const b = btn(label, "kb-btn-small kb-album-chip" + (roomView === k ? " is-on" : ""), () => {
        roomView = k; decoTry = null;
        if (k === "decor" && !isRoom(scene) && canEnter("room")) { setScene("room"); return; }
        renderList();
      });
      b.setAttribute("data-roomview", k);
      b.setAttribute("aria-pressed", roomView === k ? "true" : "false");
      row.appendChild(b);
    });
    list.appendChild(row);
  }
  // room (1.30.1): gian đang trang trí — "Theo kiểu nhà" vẽ đúng nền của gian đó (trước luôn vẽ phòng chính: Bếp lát gạch ô cờ
  // mà ô "Theo kiểu nhà · Đang dùng" lại là sàn gỗ)
  function swatchCanvas(id, tile, room) {
    const cv = document.createElement("canvas"), sc = 2;
    cv.width = 34 * sc; cv.height = 34 * sc; cv.className = "kb-h-icon kb-h-swatch";
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    const hk = id && NHA && NHA.houseKind ? NHA.houseKind(id) : null;
    if (!id || hk) {         // Theo kiểu nhà / nền nhà của gian khác: một góc gian đó theo kiểu nhà đang dùng
      const k = hk || room || "room";
      if (NHA) { NHA.bg(ctx, sc, -60, tile === "floor" || (id && id[0] === "f") ? -47 : -5, k, roomW(k), ROOM.H, ROOM.FLOOR, houseStyle(null), null); }
      return cv;
    }
    if (NHA && NHA.swatch) {
      const rowsArr = tile && tileRows()[id] ? { rows: tileRows()[id], slot: tile } : null;
      if (rowsArr || !tile) { NHA.swatch(ctx, sc, 0, 0, 34, 34, id, rowsArr); }
    }
    return cv;
  }
  function renderDecor(list, cat, money) {
    const dc = cat.decor || { walls: [], floors: [], rooms: [], tile: { price: 250, edit: 50, max: 12 } };
    const dec = decorState(), room = decoRoom(), rname = sceneName(room === "room" ? "room" : room);
    const roomLabel = room === "room" ? "Phòng chính" : rname;
    const use = (dec.use || {})[room] || {};
    const tiles = cat.tiles || [];
    const head = el("div", "kb-h-card kb-h-wear-top kb-decor-head");
    const hi = el("div", "kb-h-info");
    hi.appendChild(el("div", "kb-h-name", "Đang trang trí: " + roomLabel));
    hi.appendChild(el("div", "kb-h-desc", "Mua một lần, dùng cho gian nào cũng được. Đổi gian bằng nút cảnh phía trên."));
    head.appendChild(hi);
    list.appendChild(head);
    const usedIn = (id) => ["room", "kitchen", "bedroom"].filter((r) => { const u = (dec.use || {})[r] || {}; return u.wall === id || u.floor === id; })
      .map((r) => (r === "room" ? "Phòng chính" : sceneName(r)));
    const tryBtn = (slot, id) => {
      const on = decoTry && decoTry.room === room && decoTry.slot === slot && decoTry.id === id;
      return btn(on ? "Dừng xem thử" : "Xem thử", "kb-btn-small", () => { decoTry = on ? null : { room: room, slot: slot, id: id }; renderList(); });
    };
    [["wall", "Giấy dán tường", dc.walls || []], ["floor", "Sàn", dc.floors || []]].forEach(([slot, title, presets]) => {
      list.appendChild(el("div", "kb-h-sec", title));
      const cur = use[slot] || "";
      {   // Theo kiểu nhà
        const card = el("div", "kb-h-card kb-decor-card" + (!cur ? " kb-h-using" : ""));
        card.setAttribute("data-decor", slot + ":");
        card.appendChild(swatchCanvas("", slot, room));
        const inf = el("div", "kb-h-info");
        inf.appendChild(el("div", "kb-h-name", "Theo kiểu nhà"));
        inf.appendChild(el("div", "kb-h-desc", (slot === "wall" ? "Tường" : "Sàn") + " vốn có của " + roomLabel));
        inf.appendChild(el("div", "kb-h-own", "Có sẵn"));
        const row = el("div", "kb-h-btns");
        row.appendChild(btn(!cur ? "Đang dùng" : "Dùng cho " + roomLabel, "kb-h-buy", () => { decoTry = null; H.send("home:decor:use:" + room + ":" + slot + ":none"); }, !cur));
        inf.appendChild(row); card.appendChild(inf); list.appendChild(card);
      }
      // 1.30.1: nền vốn có của gian khác (Sàn Bếp cho phòng chính…) — miễn phí; bỏ ô trùng với nền của chính gian này
      const own = (dc.house_same || {})[slot + ":" + room] || (slot === "wall" ? "w_h" : "f_h") + room;
      (dc.house || []).filter((it) => it.slot === slot && it.id !== own && (it.room === "room" || (homeState().rooms || []).indexOf(it.room) >= 0)).forEach((it) => {
        const using = cur === it.id, where = usedIn(it.id);
        const card = el("div", "kb-h-card kb-decor-card" + (using ? " kb-h-using" : ""));
        card.setAttribute("data-decor", slot + ":" + it.id);
        card.appendChild(swatchCanvas(it.id, slot, room));
        const inf = el("div", "kb-h-info");
        inf.appendChild(el("div", "kb-h-name", it.name));
        inf.appendChild(el("div", "kb-h-desc", "Lấy " + (slot === "wall" ? "tường" : "sàn") + " của " + (it.room === "room" ? "Phòng chính" : sceneName(it.room)) + " theo kiểu nhà"));
        inf.appendChild(el("div", "kb-h-own", where.length ? "Đang dùng: " + where.join(", ") : "Có sẵn"));
        const row = el("div", "kb-h-btns");
        row.appendChild(btn(using ? "Đang dùng" : "Dùng cho " + roomLabel, "kb-h-buy", () => { decoTry = null; H.send("home:decor:use:" + room + ":" + slot + ":" + it.id); }, using));
        inf.appendChild(row); card.appendChild(inf); list.appendChild(card);
      });
      presets.forEach((it) => {
        const own = (dec.own || []).indexOf(it.id) >= 0, using = cur === it.id, where = usedIn(it.id);
        const card = el("div", "kb-h-card kb-decor-card" + (using ? " kb-h-using" : ""));
        card.setAttribute("data-decor", slot + ":" + it.id);
        card.appendChild(swatchCanvas(it.id, null));
        const inf = el("div", "kb-h-info");
        const nm = el("div", "kb-h-name", it.name);
        if (it.ja) { nm.appendChild(el("span", "kb-h-guest-ja", it.ja)); }
        inf.appendChild(nm);
        if (it.desc) { inf.appendChild(el("div", "kb-h-desc", it.desc)); }
        inf.appendChild(el("div", own ? "kb-h-own" : "kb-h-price", own ? (where.length ? "Đang dùng: " + where.join(", ") : "Đã có") : kbXu(it.price) + " xu"));
        const row = el("div", "kb-h-btns");
        if (own) {
          row.appendChild(btn(using ? "Đang dùng" : "Dùng cho " + roomLabel, "kb-h-buy", () => { decoTry = null; H.send("home:decor:use:" + room + ":" + slot + ":" + it.id); }, using));
        } else {
          row.appendChild(btn(money < it.price ? "Thiếu " + kbXu(it.price - money) + " xu" : "Mua", "kb-h-buy", () => pay("home:decor:buy:" + it.id, { title: "Mua " + (slot === "wall" ? "giấy dán tường " : "sàn ") + it.name + "?", price: it.price,
            note: "Mua một lần, dùng cho gian nào cũng được. Mua xong dán luôn cho " + roomLabel + "." }, () => { pendingDecor = { room: room, slot: slot, id: it.id }; }),
            money < it.price, money < it.price ? "Thiếu " + kbXu(it.price - money) + " xu" : "Mua xong dùng luôn cho " + roomLabel));
          row.appendChild(tryBtn(slot, it.id));
        }
        inf.appendChild(row); card.appendChild(inf); list.appendChild(card);
      });
      tiles.filter((t) => t.kind === slot).forEach((t) => {
        const using = cur === t.id, where = usedIn(t.id);
        const card = el("div", "kb-h-card kb-decor-card kb-h-craftcard" + (using ? " kb-h-using" : ""));
        card.setAttribute("data-decor", slot + ":" + t.id);
        card.appendChild(swatchCanvas(t.id, slot));
        const inf = el("div", "kb-h-info");
        inf.appendChild(el("div", "kb-h-name", t.name));
        inf.appendChild(el("div", "kb-h-own", "Tự vẽ" + (where.length ? " · đang dùng: " + where.join(", ") : "")));
        const row = el("div", "kb-h-btns");
        row.appendChild(btn(using ? "Đang dùng" : "Dùng cho " + roomLabel, "kb-h-buy", () => { decoTry = null; H.send("home:decor:use:" + room + ":" + slot + ":" + t.id); }, using));
        row.appendChild(btn("Sửa · " + kbXu(dc.tile.edit) + " xu", "kb-btn-small", () => { if (typeof GardenCraft !== "undefined" && GardenCraft.openTile) { GardenCraft.openTile(t); } }, false,
          "Đổi tên miễn phí, vẽ lại " + kbXu(dc.tile.edit) + " xu"));
        const armed = tileDelArm === t.id;
        row.appendChild(btn(armed ? "Bấm lần nữa để xoá" : "Xoá mẫu", "kb-btn-small kb-h-del" + (armed ? " is-armed" : ""), () => {
          if (tileDelArm === t.id) { tileDelArm = null; H.send("home:tile:del:" + t.id); } else { tileDelArm = t.id; renderList(); }
        }));
        inf.appendChild(row); card.appendChild(inf); list.appendChild(card);
      });
      {   // tự vẽ
        const full = tiles.length >= dc.tile.max, poor = !full && money < dc.tile.price;
        const add = el("div", "kb-h-card kb-h-craft-new kb-decor-card");
        add.setAttribute("data-decor", slot + ":new");
        add.appendChild(el("div", "kb-h-craft-plus", "＋"));
        const ai = el("div", "kb-h-info");
        ai.appendChild(el("div", "kb-h-name", slot === "wall" ? "Tự vẽ giấy dán tường" : "Tự vẽ sàn"));
        ai.appendChild(el("div", "kb-h-price", kbXu(dc.tile.price) + " xu · " + tiles.length + "/" + dc.tile.max + " mẫu"));
        ai.appendChild(btn(poor ? "Thiếu " + kbXu(dc.tile.price - money) + " xu" : "Mở xưởng", "kb-h-buy",
          () => { if (typeof GardenCraft !== "undefined" && GardenCraft.openTile) { GardenCraft.openTile(null, slot); } },
          full || poor, full ? "Đã đủ " + dc.tile.max + " mẫu" : ""));
        add.appendChild(ai); list.appendChild(add);
      }
    });
  }
  let pendingPlace = null;
  let pendingSpot = null;
  let petFocus = null;      // thú vừa bấm vào (cuộn tới thẻ của nó)
  let uzDelArm = null;

  // ---- 1.14: Bảo dưỡng nhà (đầu tab Xây nhà) ----
  function renderRepair(list, home, money) {
    const w = moreView().wear || { level: 0 };
    const card = el("div", "kb-h-card kb-h-build kb-h-repair" + (w.level >= 2 ? " kb-h-warn" : ""));
    card.appendChild(housePreview(home.house, 64, home.style, w.level));
    const inf = el("div", "kb-h-info");
    inf.appendChild(GardenIcons.fill(el("div", "kb-h-name"), "[i:wrench] Bảo dưỡng nhà"));
    if (!w.level) {
      inf.appendChild(el("div", "kb-h-own", "✓ Nhà như mới"));
      if (w.next_in) { inf.appendChild(el("div", "kb-h-desc", "Khoảng " + w.next_in + " ngày nữa sẽ bắt đầu " + (w.all_steps ? w.all_steps[0].name.toLowerCase() : "bám rêu") + ".")); }
    } else {
      inf.appendChild(el("div", "kb-h-price", "Tình trạng: " + (w.steps || []).map((x) => x.name).join(" · ") + " (" + w.level + "/" + (w.cap || 4) + ")"));
      if (w.back) { inf.appendChild(el("div", "kb-h-note", "Mừng bạn quay lại! Sửa nhà giảm 50% trong tuần này.")); }
      const row = el("div", "kb-h-btns");
      row.appendChild(btn(money >= w.cost_all ? "Sửa hết · " + kbXu(w.cost_all) + " xu" : "Thiếu " + kbXu(w.cost_all - money) + " xu", "kb-h-buy",
        () => pay("home:repair:all", { title: "Sửa hết chỗ hỏng của nhà?", price: w.cost_all, yes: "Sửa" }), money < w.cost_all));
      if (w.level >= 2) {
        const one = (w.steps || [])[w.level - 1];
        row.appendChild(btn((one ? one.fix : "Sửa 1 nấc") + " · " + kbXu(w.cost_one) + " xu", "kb-btn-small", () => pay("home:repair:one", { title: (one ? one.fix : "Sửa 1 nấc") + "?", price: w.cost_one, yes: "Sửa" }), money < w.cost_one));
      }
      inf.appendChild(row);
    }
    inf.appendChild(el("div", "kb-h-desc", "Nhà cũ dần 1 nấc mỗi " + (((catalog() || {}).more || {}).wear_days || 7) +
      " ngày: rêu bám → sơn bong → ngói lệch → mái dột khi mưa. Không bao giờ sập hay mất đồ."));
    card.appendChild(inf);
    list.appendChild(card);
  }

  // ---- 1.14: tab Thú nuôi ----
  const PET_STATE = { full: "No bụng ♥", hungry: "Đang đói — cho ăn nhé", away: "Đi chơi rồi — cho ăn là về ngay" };
  function petStateText(p) { return PET_STATE[p.state] || ""; }
  function petCanvas(id, frame, sc) {
    const cv = document.createElement("canvas");
    cv.width = 18 * sc; cv.height = 15 * sc; cv.className = "kb-h-icon kb-h-pet";
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    const rows = typeof GardenPets !== "undefined" ? GardenPets.sprite(id, frame) : null;
    if (rows) { GardenPets.paint(ctx, rows, 1, 1, sc, false); }
    return cv;
  }
  function renderPets(list, cat, money) {
    const mc = cat.more || { pets: [], pet_love: [] }, m = moreData(), v = moreView();
    const mine = {};
    (v.pets || []).forEach((p) => { mine[p.id] = p; });
    const owned = Object.keys(mine);
    const top = el("div", "kb-h-card kb-h-wear-top");
    const ti = el("div", "kb-h-info");
    ti.appendChild(GardenIcons.fill(el("div", "kb-h-name"), "[i:paw] Thú nuôi · " + owned.length + "/" + mc.pets.length));
    // 1.30.3: một câu ngắn; các mức thân thiết để ở chú thích rê chuột (mỗi thẻ thú đã ghi mức hiện tại)
    const petDesc = ti.appendChild(el("div", "kb-h-desc", "Mỗi ngày cho ăn vài xu. Quên thì bé đi chơi, cho ăn là về."));
    petDesc.title = "Thân dần: " + (mc.pet_love || []).slice(1).map((x) => x.name + " " + x.need + " ngày").join(" · ");
    if (owned.length) {
      const hungry = (v.pets || []).filter((p) => p.state !== "full");
      const cost = hungry.reduce((n, p) => n + p.food, 0);
      const row = el("div", "kb-h-btns");
      row.appendChild(btn(hungry.length ? "Cho cả nhà ăn · " + kbXu(cost) + " xu" : "Hôm nay đã cho ăn hết ✓", "kb-h-buy",
        () => pay("home:pet:feed:all", { title: "Cho cả nhà ăn (" + hungry.length + " con)?", price: cost, yes: "Cho ăn" }), !hungry.length || money < cost));
      const lab = el("label", "kb-h-auto");
      const cb = document.createElement("input"); cb.type = "checkbox"; cb.checked = !!m.pet_auto;
      cb.addEventListener("change", () => H.send("home:pet:auto:" + (cb.checked ? "1" : "0")));
      lab.appendChild(cb); lab.appendChild(document.createTextNode(" Tự cho ăn mỗi ngày khi mở vườn (trừ xu)"));
      row.appendChild(lab);
      ti.appendChild(row);
    }
    top.appendChild(ti);
    list.appendChild(top);
    let focusCard = null;
    (mc.pets || []).forEach((sp) => {
      const p = mine[sp.id];
      const card = el("div", "kb-h-card kb-h-petcard" + (p ? " kb-h-using" : "") + (petFocus === sp.id ? " kb-h-focus" : ""));
      card.appendChild(petCanvas(sp.id, p && p.state === "away" ? "sleep" : "sit", 4));
      const inf = el("div", "kb-h-info");
      if (!p) {
        inf.appendChild(el("div", "kb-h-name", sp.name));
        inf.appendChild(el("div", "kb-h-desc", "✦ " + sp.desc));
        inf.appendChild(el("div", "kb-h-price", kbXu(sp.price) + " xu · ăn " + kbXu(sp.food) + " xu / ngày" + (sp.room ? " · ở được trong nhà" : "")));
        inf.appendChild(btn(money >= sp.price ? "Nhận nuôi · " + kbXu(sp.price) + " xu" : "Thiếu " + kbXu(sp.price - money) + " xu", "kb-h-buy",
          () => pay("home:pet:buy:" + sp.id, { title: "Nhận nuôi " + sp.name + "?", price: sp.price, yes: "Nhận nuôi",
            note: "Mỗi ngày ăn " + kbXu(sp.food) + " xu (cho ăn ở tab Thú nuôi, hoặc bật Tự cho ăn)." }), money < sp.price));
      } else {
        const nm = el("div", "kb-h-name", p.name + (p.name !== sp.name ? " (" + sp.name + ")" : ""));
        inf.appendChild(nm);
        inf.appendChild(el("div", p.state === "full" ? "kb-h-own" : "kb-h-note", petStateText(p)));
        inf.appendChild(el("div", "kb-h-desc", "♥ " + p.love_name + " · đã cho ăn " + p.love + " ngày" +
          (p.love_next ? " (còn " + (p.love_next - p.love) + " ngày tới mức sau)" : "")));
        const row = el("div", "kb-h-btns");
        row.appendChild(btn(p.state === "full" ? "Đã ăn hôm nay" : "Cho ăn · " + kbXu(p.food) + " xu", "kb-h-buy",
          () => pay("home:pet:feed:" + p.id, { title: "Cho " + (p.name || "bé") + " ăn?", price: p.food, yes: "Cho ăn" }), p.state === "full" || money < p.food));
        const sel = document.createElement("select"); sel.className = "kb-h-select"; sel.title = "Chỗ ở";
        const scenes = ["yard"].concat(ZONE_IDS.filter((z) => zoneOpen(z)), uzIds());
        if (sp.room && canEnter("room")) { scenes.push("room"); }
        scenes.forEach((sc) => { const o = document.createElement("option"); o.value = sc; o.textContent = "Ở: " + sceneName(sc); sel.appendChild(o); });
        sel.value = scenes.indexOf(p.scene) >= 0 ? p.scene : "yard";
        sel.addEventListener("change", () => H.send("home:pet:move:" + p.id + ":" + sel.value));
        row.appendChild(sel);
        inf.appendChild(row);
        const nrow = el("div", "kb-h-btns");
        const inp = document.createElement("input"); inp.type = "text"; inp.maxLength = 12; inp.value = p.name; inp.className = "kb-h-input";
        inp.placeholder = "Đặt tên"; inp.spellcheck = false;
        inp.addEventListener("keydown", (e) => { e.stopPropagation(); if (e.key === "Enter") { e.preventDefault(); save(); } });
        const save = () => { const v2 = inp.value.trim(); if (v2 && v2 !== p.name) { H.send("home:pet:name:" + JSON.stringify({ id: p.id, name: v2 })); } };
        nrow.appendChild(inp);
        nrow.appendChild(btn("Đặt tên", "kb-btn-small", save));
        inf.appendChild(nrow);
      }
      const frow = el("div", "kb-h-btns"); fixBtn(frow, "thu", sp.id, sp.name, !!p); if (frow.childNodes.length) { inf.appendChild(frow); }
      card.appendChild(inf);
      list.appendChild(card);
      if (petFocus === sp.id) { focusCard = card; }
    });
    if (focusCard) { const fc = focusCard; requestAnimationFrame(() => { try { fc.scrollIntoView({ block: "nearest" }); } catch (e) { /* bỏ qua */ } }); petFocus = null; }
  }

  // ---- 1.21: tab Album khách ----
  let guestFocus = null;     // khách vừa bấm vào (cuộn tới thẻ của nó một lần)
  let guestHi = null;        // thẻ đang tô viền (giữ khi danh sách vẽ lại, vd. album vừa đổi)
  function guestData() { const d = H && H.data(); return (d && d.guests) || null; }
  function guestName(id) { const g = guestData(); const e = g && (g.list || []).find((x) => x.id === id); return e ? e.name : ""; }
  function guestCanvas(id, met, sc) {
    const cv = document.createElement("canvas");
    cv.width = 22 * sc; cv.height = 22 * sc; cv.className = "kb-h-icon kb-h-guest" + (met ? "" : " kb-h-guest-un");
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    if (typeof GardenGuests === "undefined") { return cv; }
    if (id === "hotaru") {      // đom đóm: một mảng đêm nhỏ với các đốm sáng
      ctx.fillStyle = met ? "#26265a" : "#5a5a72"; ctx.fillRect(3 * sc, 4 * sc, 16 * sc, 14 * sc);
      [[6, 7], [13, 6], [10, 10], [15, 12], [7, 14], [12, 16]].forEach(([x, y]) => {
        if (met) { ctx.globalAlpha = 0.35; ctx.fillStyle = "#e9ff7a"; ctx.fillRect((x - 1) * sc, (y - 1) * sc, 3 * sc, 3 * sc); ctx.globalAlpha = 1; }
        ctx.fillStyle = met ? "#f6ff9e" : "#9a9ab0"; ctx.fillRect(x * sc, y * sc, sc, sc);
      });
      return cv;
    }
    let rows = GardenGuests.sprite(id);
    if (!rows) { return cv; }
    if (!met) { rows = rows.map((r) => r.replace(/[^.]/g, "n")); }       // chưa gặp: chỉ hiện bóng
    const w = rows[0].length, h = rows.length;
    GardenGuests.paint(ctx, rows, Math.floor((22 - w) / 2), Math.max(0, 22 - h - 1), sc, false);
    return cv;
  }
  // 1.28: tab Album = Khách ghé vườn + Hộp sưu tầm (hai nút chọn ở đầu danh sách)
  let albumView = "guest", boxFocus = null;
  function albumChips(list) {
    const row = el("div", "kb-h-btns kb-album-chips");
    const g = guestData(), f = H && H.data() && H.data().finds;
    const lf = H && H.data() && H.data().life;
    const chips = [["guest", "Khách ghé vườn" + (g ? " · " + g.met + "/" + g.total : "")],
      ["box", "Hộp sưu tầm" + (f && f.box ? " · " + f.box.found + "/" + f.box.total : "")]];
    if (typeof GardenLife !== "undefined") { chips.push(["life", "Sinh hoạt" + (lf ? " · " + lf.seen + "/" + lf.total : "")]); }   // 1.30
    chips.forEach(([k, label]) => {
      const b = btn(label, "kb-btn-small kb-album-chip" + (albumView === k ? " is-on" : ""), () => { albumView = k; renderList(); });
      b.setAttribute("data-album", k);
      b.setAttribute("aria-pressed", albumView === k ? "true" : "false");
      row.appendChild(b);
    });
    list.appendChild(row);
  }
  function renderAlbum(list) {
    if (typeof GardenFinds !== "undefined") { albumChips(list); }
    if (albumView === "box" && typeof GardenFinds !== "undefined") {
      GardenFinds.box(list, boxFocus); boxFocus = null;
      return;
    }
    if (albumView === "life" && typeof GardenLife !== "undefined") { GardenLife.book(list); return; }
    renderGuests(list);
  }
  function renderGuests(list) {
    const g = guestData();
    const top = el("div", "kb-h-card kb-h-wear-top");
    const ti = el("div", "kb-h-info");
    if (!g) { ti.appendChild(el("div", "kb-h-name", "Album khách")); top.appendChild(ti); list.appendChild(top); return; }
    ti.appendChild(GardenIcons.fill(el("div", "kb-h-name"), "[i:book] Album khách · " + g.met + "/" + g.total));
    ti.appendChild(el("div", "kb-h-desc", "Khách ghé tuỳ đồ đã đặt, vùng, mùa, giờ và thời tiết. Không phải cho ăn, vắng nhà không mất gì."));
    ti.appendChild(el("div", "kb-h-own", "Vườn đang xem có " + g.fruit + " cây Ra quả: khách ghé " + g.rate_label + "."));
    top.appendChild(ti);
    list.appendChild(top);
    let focusCard = null;
    (g.list || []).forEach((e) => {
      const card = el("div", "kb-h-card kb-h-guestcard" + (e.met ? " kb-h-using" : "") + ((guestFocus || guestHi) === e.id ? " kb-h-focus" : ""));
      card.setAttribute("data-guest", e.id);
      card.appendChild(guestCanvas(e.id, e.met, 3));
      const inf = el("div", "kb-h-info");
      const nm = el("div", "kb-h-name", e.met ? e.name : "???");
      if (e.met) { nm.appendChild(el("span", "kb-h-guest-ja", e.ja)); }
      if (e.rare) { nm.appendChild(el("span", "kb-h-guest-rare", "Hiếm")); }
      inf.appendChild(nm);
      if (e.met) {
        const p = e.d.split("-");
        inf.appendChild(el("div", "kb-h-own", "Gặp lần đầu " + p[2] + "/" + p[1] + "/" + p[0] + " · " + sceneName(e.s) + " · ghé " + e.n + " ngày"));
      } else {
        inf.appendChild(el("div", "kb-h-desc", "Chưa gặp" + (e.season ? "" : " · chưa tới mùa")));
      }
      inf.appendChild(el("div", "kb-h-desc kb-h-guest-hint", "✦ " + e.hint));
      const frow = el("div", "kb-h-btns"); fixBtn(frow, "khach", e.id, e.name || e.id, !!e.met); if (frow.childNodes.length) { inf.appendChild(frow); }
      card.appendChild(inf);
      list.appendChild(card);
      if (guestFocus === e.id) { focusCard = card; }
    });
    if (focusCard) { const fc = focusCard; requestAnimationFrame(() => { try { fc.scrollIntoView({ block: "nearest" }); } catch (e) { /* bỏ qua */ } }); guestHi = guestFocus; guestFocus = null; }
  }

  // ---- 1.14: tab Giống cây ----
  const KIND_NAME = { vocab: "Từ vựng", kanji: "Chữ Hán", grammar: "Ngữ pháp", other: "Khác" };
  const BASE_PAL = { k: "#1b1b2f", g: "#3ccb5e", G: "#2e8b3a", b: "#8a4a22", y: "#ffd23f", p: "#ff7fa0", r: "#ff4f6d", w: "#ffffff" };
  // rowsOf(st) (1.22, tuỳ chọn): hình từng giai đoạn lấy từ bản xem trước của mã chia sẻ thay vì GardenSeeds
  function seedStrip(id, sc, rowsOf) {
    const cv = document.createElement("canvas");
    cv.width = 5 * 17 * sc; cv.height = 17 * sc; cv.className = "kb-h-seedstrip";
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    box(ctx, 0, 13, 85, 4, "#a0603a", sc);
    const GS = typeof GardenSeeds !== "undefined" ? GardenSeeds : null;
    for (let st = 0; st < 5; st++) {
      let rows = null, pal = BASE_PAL;
      if (rowsOf) { rows = rowsOf(st); pal = (catalog().craft || {}).palette || BASE_PAL; }
      else if (id && GS) { rows = GS.rows(id, st); pal = GS.pal(false, id); }
      if (!rows && (rowsOf || !id || (GS && GS.custom && GS.custom(id))) && typeof Garden !== "undefined") { rows = Garden.SPRITES[st]; pal = BASE_PAL; }
      if (rows) { sprite(ctx, rows, st * 17, 0, sc, pal); }
    }
    return cv;
  }
  // hình 5 giai đoạn từ 5 mã ("" = chưa vẽ → giai đoạn gần nhất trước nó; Hạt chưa vẽ → null)
  function stageRows(codes) {
    const st = (codes || []).map((c) => (c && typeof GardenSeeds !== "undefined" ? GardenSeeds.decode(c) : null));
    return (i) => {
      let r = st[i] || null;
      if (!r && i > 0) { for (let j = i - 1; j >= 0 && !r; j--) { r = st[j] || null; } }
      if (!r && i > 0) { for (let j = i + 1; j < 5 && !r; j++) { r = st[j] || null; } }
      return r;
    };
  }
  function mySeeds() { return (catalog() || {}).myseeds || []; }
  function myRules() { const m = moreData().myseeds; return (m && m.rules) || { deck: {}, kind: {}, tag: [] }; }
  function seedSelect(cur, opts, onChange) {
    const sel = document.createElement("select"); sel.className = "kb-h-select";
    opts.forEach(([v, label]) => { const o = document.createElement("option"); o.value = v; o.textContent = label; sel.appendChild(o); });
    sel.value = cur || "";
    sel.addEventListener("change", () => onChange(sel.value));
    return sel;
  }
  function renderSeeds(list, cat, money) {
    const mc = cat.more || { seeds: [] }, sd0 = moreData().seeds || { owned: [], deck: {}, kind: {}, tag: [] }, d = H.data() || {};
    const names = {}; (mc.seeds || []).forEach((x) => { names[x.id] = x.name; });
    // 1.22: giống tự vẽ chọn được như giống mua; luật của giống mua thắng khi hai bên cùng có luật một chỗ (như Python)
    const mine = mySeeds(), mr = myRules();
    mine.forEach((g) => { names[g.id] = g.name + " (tự vẽ)"; });
    const legacyTags = (sd0.tag || []).map((r) => r[0].toLowerCase());
    const sd = { owned: (sd0.owned || []).concat(mine.map((g) => g.id)), deck: Object.assign({}, mr.deck, sd0.deck), kind: Object.assign({}, mr.kind, sd0.kind),
      tag: (sd0.tag || []).concat((mr.tag || []).filter((r) => legacyTags.indexOf(r[0].toLowerCase()) < 0)) };
    const owned = sd.owned;
    const opts = (first) => [["", first]].concat(owned.length > 1 ? [["mix", "Trộn các giống"]] : [], owned.map((id) => [id, names[id] || id]));
    const rule = (where, key, value) => H.send("home:seed:rule:" + JSON.stringify({ where: where, key: key, value: value }));
    const intro = el("div", "kb-h-card kb-h-wear-top");
    const ii = el("div", "kb-h-info");
    ii.appendChild(GardenIcons.fill(el("div", "kb-h-name"), "[i:seed] Giống cây cho ruộng"));
    ii.appendChild(el("div", "kb-h-desc", "Giống chỉ đổi hình của cây, cây vẫn lớn theo trí nhớ như cũ."));
    intro.appendChild(ii);
    list.appendChild(intro);
    if (owned.length) {
      sec2(list, "Gieo ở đâu", "Trùng nhau thì theo thứ tự: tag → loại note → deck (deck con trước deck cha)");
      const deck = d.deck || {};
      const box1 = el("div", "kb-h-card kb-h-rules");
      const inf = el("div", "kb-h-info");
      const r1 = el("div", "kb-h-rule kb-h-rule-sel");
      r1.appendChild(el("span", "kb-h-rule-l", "Deck “" + (deck.name || "?") + "”"));
      r1.appendChild(seedSelect((sd.deck || {})[String(deck.id)], opts("Cây gốc"), (v) => rule("deck", String(deck.id), v)));
      inf.appendChild(r1);
      const other = Object.keys(sd.deck || {}).filter((id) => id !== String(deck.id));
      other.forEach((id) => {
        const dk = (d.decks || []).find((x) => String(x.id) === id);
        const r = el("div", "kb-h-rule");
        r.appendChild(el("span", "kb-h-rule-l", "Deck “" + (dk ? dk.name : "đã xoá") + "” → " + (sd.deck[id] === "mix" ? "Trộn" : names[sd.deck[id]] || sd.deck[id])));
        r.appendChild(btn("Bỏ ✕", "kb-btn-small", () => rule("deck", id, "")));
        inf.appendChild(r);
      });
      const kinds = {};
      (d.note_types || []).forEach((t) => { kinds[t.kind] = true; });
      Object.keys(sd.kind || {}).forEach((k) => { kinds[k] = true; });
      Object.keys(KIND_NAME).filter((k) => kinds[k]).forEach((k) => {
        const r = el("div", "kb-h-rule kb-h-rule-sel");
        r.appendChild(el("span", "kb-h-rule-l", "Note " + KIND_NAME[k]));
        r.appendChild(seedSelect((sd.kind || {})[k], opts("Theo deck"), (v) => rule("kind", k, v)));
        inf.appendChild(r);
      });
      (sd.tag || []).forEach(([t, v]) => {
        const r = el("div", "kb-h-rule");
        r.appendChild(el("span", "kb-h-rule-l", "Tag “" + t + "” → " + (v === "mix" ? "Trộn" : names[v] || v)));
        r.appendChild(btn("Bỏ ✕", "kb-btn-small", () => rule("tag", t, "")));
        inf.appendChild(r);
      });
      const r3 = el("div", "kb-h-rule kb-h-rule-sel");
      const tin = document.createElement("input"); tin.type = "text"; tin.className = "kb-h-input"; tin.placeholder = "tag (vd. N5, bai29)"; tin.maxLength = 60; tin.spellcheck = false;
      tin.addEventListener("keydown", (e) => e.stopPropagation());
      const tsel = seedSelect(owned[0], opts("—").slice(1), () => {});
      r3.appendChild(tin); r3.appendChild(tsel);
      r3.appendChild(btn("Thêm luật tag", "kb-btn-small", () => { const t = tin.value.trim(); if (t) { rule("tag", t, tsel.value); } }));
      inf.appendChild(r3);
      box1.appendChild(inf);
      list.appendChild(box1);
      alignRules(box1);
    }
    sec2(list, "Giống cây · mua một lần, gieo cho bao nhiêu deck cũng được");
    (mc.seeds || []).forEach((x) => {
      const own = (sd0.owned || []).indexOf(x.id) >= 0;
      const card = el("div", "kb-h-card kb-h-seed" + (own ? " kb-h-using" : ""));
      card.appendChild(seedStrip(x.id, 2));
      const inf = el("div", "kb-h-info");
      inf.appendChild(el("div", "kb-h-name", x.name));
      inf.appendChild(el("div", "kb-h-desc", "✦ " + x.desc));
      if (own) { inf.appendChild(el("div", "kb-h-own", "Đã có · chọn chỗ gieo ở trên")); }
      else {
        inf.appendChild(btn(money >= x.price ? "Mua giống · " + kbXu(x.price) + " xu" : "Thiếu " + kbXu(x.price - money) + " xu", "kb-h-buy",
          () => pay("home:seed:buy:" + x.id, { title: "Mua giống " + x.name + "?", price: x.price }), money < x.price));
      }
      const frow = el("div", "kb-h-btns"); fixBtn(frow, "giong", x.id, x.name, own); if (frow.childNodes.length) { inf.appendChild(frow); }
      card.appendChild(inf);
      list.appendChild(card);
    });
    renderMySeeds(list, cat, money);
  }
  function sec2(list, text, tip) { const h = list.appendChild(el("div", "kb-h-sec", text)); if (tip) { h.title = tip; } return h; }
  // 1.22.6: nhãn "Deck “…”" dài hơn "Note Từ vựng" nên ô chọn giống của các dòng lệch nhau → mọi nhãn (và ô gõ tag) rộng
  // bằng nhãn dài nhất (tối đa nửa thẻ, tên deck dài thì xuống dòng)
  function alignRules(box) {
    requestAnimationFrame(() => {
      const ls = Array.prototype.slice.call(box.querySelectorAll(".kb-h-rule-sel > .kb-h-rule-l, .kb-h-rule-sel > .kb-h-input"));
      if (!ls.length || !box.clientWidth) { return; }
      ls.forEach((l) => { l.style.width = ""; l.style.minWidth = ""; });
      const w = Math.min(Math.ceil(Math.max.apply(null, ls.map((l) => l.getBoundingClientRect().width))), Math.floor(box.clientWidth * 0.5));
      ls.forEach((l) => { l.style.boxSizing = "border-box"; l.style.width = w + "px"; l.style.minWidth = w + "px"; });
    });
  }

  // ---- 1.22: giống cây tự vẽ (cuối tab Giống cây) ----
  let seedDelArm = null;
  function renderMySeeds(list, cat, money) {
    const m = cat.myseed || { price: 500, edit: 50, max: 12, min: 3 }, mine = mySeeds();
    renderShareBox(list, "seed");
    sec2(list, "Giống tự vẽ · " + mine.length + "/" + m.max + " · vẽ trong Xưởng, gieo như giống mua");
    mine.forEach((g) => {
      const card = el("div", "kb-h-card kb-h-seed");
      card.appendChild(seedStrip(g.id, 2));
      const inf = el("div", "kb-h-info");
      inf.appendChild(el("div", "kb-h-name", g.name));
      inf.appendChild(el("div", "kb-h-desc", "✦ Đã vẽ " + g.drawn + "/5 giai đoạn"));
      const row = el("div", "kb-h-btns");
      row.appendChild(btn("Sửa · " + kbXu(m.edit) + " xu", "kb-btn-small", () => { if (typeof GardenCraft !== "undefined" && GardenCraft.openSeed) { GardenCraft.openSeed(g); } }, false,
        "Đổi tên miễn phí, đổi hình " + kbXu(m.edit) + " xu"));
      row.appendChild(shareBtn(g.id));
      const armed = seedDelArm === g.id;
      row.appendChild(btn(armed ? "Bấm lần nữa: xoá, cây về cây gốc" : "Xoá giống", "kb-btn-small kb-h-del" + (armed ? " is-armed" : ""), () => {
        if (seedDelArm === g.id) { seedDelArm = null; H.send("home:myseed:del:" + g.id); } else { seedDelArm = g.id; renderList(); }
      }));
      inf.appendChild(row);
      card.appendChild(inf);
      list.appendChild(card);
    });
    if (mine.length < m.max) {
      const add = el("div", "kb-h-card kb-h-craft-new");
      add.appendChild(el("div", "kb-h-craft-plus", "＋"));
      const ai = el("div", "kb-h-info");
      ai.appendChild(el("div", "kb-h-name", "Tự vẽ giống cây"));
      ai.appendChild(el("div", "kb-h-desc", "Vẽ cây 16×16 cho từng giai đoạn (tối thiểu " + m.min + "), giai đoạn còn lại tự lấy hình giai đoạn trước."));
      ai.appendChild(el("div", "kb-h-price", kbXu(m.price) + " xu · sửa hình " + kbXu(m.edit) + " xu · đổi tên miễn phí"));
      ai.appendChild(btn(money >= m.price ? "Mở xưởng" : "Thiếu " + kbXu(m.price - money) + " xu", "kb-h-buy",
        () => { if (typeof GardenCraft !== "undefined" && GardenCraft.openSeed) { GardenCraft.openSeed(null); } }, money < m.price));
      add.appendChild(ai);
      list.appendChild(add);
    }
  }

  // ---- 1.22: mã chia sẻ thiết kế ----
  let shareBox = null;                       // mã vừa xuất {id, name, code, copied, tab} — hiện ở tab đã bấm
  let pasteText = "", peek = null;           // ô "Dán mã thiết kế" (tab Xưởng) và bản xem trước Python gửi về
  // 1.22.5: mã đã bấm "Xem trước" — nút "Làm …" gửi đúng mã này (trước đây gửi chữ đang có trong ô: xem trước một món
  // 200 xu rồi dán đè mã vùng mà không xem lại, bấm "Làm món này · 200 xu" thì bị trừ 5.000 xu và tạo vùng)
  let peekCode = "";
  const codeKey = (t) => String(t || "").split(/\s+/).join("");
  // cuộn danh sách tới thẻ vừa hiện (sau lần đặt lại scrollTop của renderList)
  function showInList(sel) {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const e = document.querySelector("#kb-h-list " + sel);
      const card = e && (e.closest(".kb-h-card") || e);
      if (card) { try { card.scrollIntoView({ block: "nearest" }); } catch (err) { /* bỏ qua */ } }
    }));
  }
  function shareBtn(id) { return btn("Mã chia sẻ", "kb-btn-small", () => { shareFrom = tab; H.send("share:code:" + id); }, false, "Xuất một đoạn chữ để gửi cho người khác"); }
  let shareFrom = "craft";
  function renderShareBox(list, where) {
    if (!shareBox || shareBox.tab !== where) { return; }
    const card = el("div", "kb-h-card kb-h-share");
    const inf = el("div", "kb-h-info");
    inf.appendChild(el("div", "kb-h-name", "Mã chia sẻ “" + shareBox.name + "”"));
    inf.appendChild(el("div", "kb-h-desc", (shareBox.copied ? "Đã chép vào bộ nhớ tạm · " : "") + shareBox.code.length + " ký tự · người nhận dán vào ô “Dán mã thiết kế” ở tab Xưởng"));
    const ta = document.createElement("textarea");
    ta.className = "kb-h-sharecode"; ta.readOnly = true; ta.rows = 2; ta.spellcheck = false; ta.value = shareBox.code;
    ta.addEventListener("focus", () => ta.select());
    ta.addEventListener("keydown", (e) => e.stopPropagation());
    inf.appendChild(ta);
    const row = el("div", "kb-h-btns");
    row.appendChild(btn("Chép lại", "kb-btn-small", () => { shareFrom = shareBox.tab; H.send("share:code:" + shareBox.id); }));
    row.appendChild(btn("Đóng ✕", "kb-btn-small", () => { shareBox = null; renderList(); }));
    inf.appendChild(row);
    card.appendChild(inf);
    list.appendChild(card);
  }
  const SHARE_KIND = { ground: "ngoài trời", floor: "sàn trong nhà", wall: "treo tường" };
  function renderPaste(list, cat, money) {
    const card = el("div", "kb-h-card kb-h-share kb-h-paste");
    const inf = el("div", "kb-h-info");
    inf.appendChild(el("div", "kb-h-name", "Dán mã thiết kế"));
    inf.appendChild(el("div", "kb-h-desc", "Mã món đồ, vùng hoặc giống cây người khác chia sẻ (bắt đầu bằng KB1:). Xem trước rồi mới trả xu."));
    const ta = document.createElement("textarea");
    ta.className = "kb-h-sharecode"; ta.rows = 2; ta.spellcheck = false; ta.placeholder = "KB1:…"; ta.value = pasteText;
    ta.addEventListener("input", () => {
      pasteText = ta.value;
      // chữ trong ô không còn là mã đã xem trước → bỏ bản xem trước cũ (phải bấm "Xem trước" lại mới làm được)
      if (peek && !peek.error && codeKey(pasteText) !== codeKey(peekCode)) {
        peek = null;
        const old = document.querySelector("#kb-h-list .kb-h-peek");
        if (old) { old.remove(); }
      }
    });
    ta.addEventListener("keydown", (e) => e.stopPropagation());
    inf.appendChild(ta);
    const row = el("div", "kb-h-btns");
    row.appendChild(btn("Xem trước", "kb-btn-small", () => {
      pasteText = ta.value;
      if (!pasteText.trim()) { peek = { error: "Dán mã chia sẻ vào ô trước đã." }; peekCode = ""; renderList(); return; }
      peekCode = pasteText.trim();
      H.send("share:peek:" + peekCode);
    }));
    if (pasteText || peek) { row.appendChild(btn("Xoá ô", "kb-btn-small", () => { pasteText = ""; peek = null; peekCode = ""; renderList(); })); }
    inf.appendChild(row);
    if (peek && peek.error) { inf.appendChild(GardenIcons.fill(el("div", "kb-h-warn"), "[i:warn] " + peek.error)); }
    card.appendChild(inf);
    list.appendChild(card);
    if (!peek || peek.error) { return; }
    const p = peek, pv = el("div", "kb-h-card kb-h-share kb-h-peek");
    let art, desc, label, full = "";
    if (p.t === "m") {
      const flat = pxDecode(p.px, p.size);
      art = iconCanvas(flat ? pxRows(flat, p.size, true) : ["k"], 68);
      desc = "Món đồ " + p.size + "×" + p.size + " · " + (SHARE_KIND[p.kind] || p.kind);
      label = "Làm món này";
      const cc = cat.craft || { max: 60 };
      if (cat.items.filter((it) => it.custom).length >= cc.max) { full = "Xưởng đã đủ " + cc.max + " mẫu"; }
    } else if (p.t === "z") {
      (((cat.more || {}).uzone || {}).bg || []).forEach((b) => { UZ_BG_NAME[b.id] = b.name; });
      art = document.createElement("canvas"); art.width = YARD.W; art.height = YARD.H; art.className = "kb-h-zoneview";
      GardenHome.zonePreview(art, { id: "u99", name: p.name, bg: p.bg, ground: p.ground, hills: p.hills, lm: p.lm, env: p.env });
      desc = "Vùng tự tạo · nền " + (UZ_BG_NAME[p.bg] || p.bg) + (p.lm ? " · có công trình" : "") + (p.env ? " · có cảnh nền" : "");
      label = "Tạo vùng này";
      const u = (cat.more || {}).uzone || { max: 6 };
      if (uzones().length >= u.max) { full = "Đã có " + u.max + " vùng tự tạo"; }
    } else {
      art = seedStrip(null, 2, stageRows(p.st));
      desc = "Giống cây tự vẽ · vẽ " + p.st.filter(Boolean).length + "/5 giai đoạn";
      label = "Tạo giống này";
      const m = cat.myseed || { max: 12 };
      if (mySeeds().length >= m.max) { full = "Đã có " + m.max + " giống tự vẽ"; }
    }
    pv.appendChild(art);
    const pi = el("div", "kb-h-info");
    pi.appendChild(el("div", "kb-h-name", p.name));
    pi.appendChild(el("div", "kb-h-desc", desc));
    pi.appendChild(el("div", "kb-h-price", kbXu(p.price) + " xu · trả như tự chế tác"));
    const short = money < p.price;
    pi.appendChild(btn(full || (short ? "Thiếu " + kbXu(p.price - money) + " xu" : label + " · " + kbXu(p.price) + " xu"), "kb-h-buy",
      () => pay("share:make:" + peekCode, { title: label + "?", price: p.price, yes: label }), !!full || short));
    pv.appendChild(pi);
    list.appendChild(pv);
  }

  // ---- 1.14: Vùng tự tạo (cuối tab Vùng mới) ----
  const UZ_BG_NAME = {};
  function renderUzones(list, cat, money) {
    const u = (cat.more || {}).uzone || { max: 6, price: 5000, edit: 50, bg: [] };
    (u.bg || []).forEach((b) => { UZ_BG_NAME[b.id] = b.name; });
    const zs = uzones();
    renderShareBox(list, "zone");
    sec2(list, "Vùng tự tạo · " + zs.length + "/" + u.max + " · " + kbXu(u.price) + " xu / vùng");
    zs.forEach((z) => {
      const card = el("div", "kb-h-card kb-h-zone");
      card.appendChild(scenePreview(z.id));
      const info = el("div", "kb-h-info");
      info.appendChild(el("div", "kb-h-name", z.name));
      info.appendChild(el("div", "kb-h-desc", "Nền: " + (UZ_BG_NAME[z.bg] || z.bg) + (z.lm ? " · có công trình tự vẽ" : " · chưa vẽ công trình")));
      const row = el("div", "kb-h-btns");
      row.appendChild(btn(scene === z.id ? "Đang ở đây" : "Đến " + z.name, "kb-h-buy", () => setScene(z.id), scene === z.id));
      row.appendChild(btn("Sửa vùng", "kb-btn-small", () => { if (typeof GardenCraft !== "undefined" && GardenCraft.openZone) { GardenCraft.openZone(z); } }));
      if (z.lm || z.env) { row.appendChild(shareBtn(z.id)); }
      const armed = uzDelArm === z.id;
      row.appendChild(btn(armed ? "Bấm lần nữa: xoá, đồ về kho" : "Xoá vùng", "kb-btn-small kb-h-del" + (armed ? " is-armed" : ""), () => {
        if (uzDelArm === z.id) { uzDelArm = null; H.send("home:uzone:del:" + z.id); } else { uzDelArm = z.id; renderList(); }
      }));
      info.appendChild(row);
      card.appendChild(info);
      list.appendChild(card);
    });
    if (zs.length < u.max) {
      const add = el("div", "kb-h-card kb-h-craft-new");
      add.appendChild(el("div", "kb-h-craft-plus", "＋"));
      const ai = el("div", "kb-h-info");
      ai.appendChild(el("div", "kb-h-name", "Tạo vùng mới"));
      ai.appendChild(el("div", "kb-h-desc", "Đặt tên, chọn nền, màu đất và đồi, rồi tự vẽ công trình bằng Xưởng."));
      ai.appendChild(el("div", "kb-h-price", kbXu(u.price) + " xu · sửa tên / nền / màu miễn phí · vẽ lại công trình " + kbXu(u.edit) + " xu"));
      ai.appendChild(btn(money >= u.price ? "Mở xưởng vùng" : "Thiếu " + kbXu(u.price - money) + " xu", "kb-h-buy",
        () => { if (typeof GardenCraft !== "undefined" && GardenCraft.openZone) { GardenCraft.openZone(null); } }, money < u.price));
      add.appendChild(ai);
      list.appendChild(add);
    }
  }

  // ---- tab Mùa & Lễ hội ----
  function seasonState() { const d = H && H.data(); return (d && d.wallet && d.wallet.season) || { unlocked: [], mode: "auto", pick: null, free_day: null }; }
  function themeOpen(id) { return (seasonState().unlocked || []).indexOf(id) >= 0; }
  function streakAvail() {
    const d = H && H.data(), td = (d && d.today) || {}, ss = seasonState();
    const st = td.streak || 0;
    return ss.free_day === null || ss.free_day === undefined ? st : Math.max(0, Math.min(st, (td.day || 0) - ss.free_day));
  }
  function themePreview(id) {
    const cv = document.createElement("canvas");
    cv.width = YARD.W; cv.height = YARD.H; cv.className = "kb-h-zoneview kb-h-themeview";
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    const draw = () => { drawOutdoor(ctx, 1, 0, 0, Date.now(), "yard", { noGuests: true }); lights.length = 0; };
    if (SEA()) { SEA().withTheme(id, draw); } else { draw(); }
    return cv;
  }
  const MODE_TEXT = { auto: "Tự đổi theo lịch.", pick: "Luôn dùng giao diện này.", off: "" };
  function renderSeason(list, cat, money) {
    const themes = cat.themes || [];
    const ss = seasonState(), sea = SEA();
    const curId = sea ? sea.current() : null, pv = sea ? sea.previewing() : null;
    const d = H.data(), td = d.today || {}, avail = streakAvail();
    const top = el("div", "kb-h-card kb-h-season-top");
    const curT = themes.find((t) => t.id === curId);
    top.appendChild(curT && SPR[curT.icon] ? iconCanvas(SPR[curT.icon], 68) : el("div", "kb-h-craft-plus", "✦"));
    const ti = el("div", "kb-h-info");
    ti.appendChild(el("div", "kb-h-name", ss.mode === "off" ? "Giao diện mùa: Tắt" : curT ? "Đang dùng: " + curT.name + " · " + curT.jp : "Chưa dùng giao diện nào"));
    if (MODE_TEXT[ss.mode] !== "") { ti.appendChild(el("div", "kb-h-desc", MODE_TEXT[ss.mode] || MODE_TEXT.auto)); }
    const row = el("div", "kb-h-btns");
    // 1.19.1: hai nút Bật (tự động) / Tắt, nút đang chọn chỉ đổi nền
    row.appendChild(btn("Tự động", ss.mode === "auto" ? "kb-btn-small kb-h-mode-on" : "kb-btn-small",
      () => H.send("home:theme:auto"), ss.mode === "auto", "Tự đổi giao diện theo lịch (lễ hội ưu tiên hơn mùa)"));
    row.appendChild(btn("Tắt", ss.mode === "off" ? "kb-btn-small kb-h-mode-on" : "kb-btn-small",
      () => H.send("home:theme:off"), ss.mode === "off", "Vườn dùng giao diện thường"));
    if (pv) { row.appendChild(btn("Dừng xem thử", "kb-btn-small kb-h-place", () => { sea.preview(null); renderList(); defaultTip(); })); }
    ti.appendChild(row);
    const allOpen = themes.length && themes.every((t) => (ss.unlocked || []).indexOf(t.id) >= 0);
    const how = el("div", allOpen ? "kb-h-own" : "kb-h-price", allOpen ? "✓ Đã mở cả " + themes.length + " giao diện · bấm “Dùng ngay” để chọn tay" :
      "Mở khoá: 1000 xu, hoặc đổi bằng ngày ôn liền (mùa 7 ngày, lễ hội 10 ngày) · đang có " + avail + " ngày để đổi");
    if (!allOpen) { how.title = "Bạn đang ôn liền " + (td.streak || 0) + " ngày. Đổi bằng ngày ôn liền không làm đứt chuỗi; ngày đã đổi thì không đổi lại được, ôn tiếp sẽ có thêm. Mở khoá được tặng kèm đồ của giao diện đó."; }
    ti.appendChild(how);
    top.appendChild(ti);
    list.appendChild(top);
    const now = themes.filter((t) => t.now), later = themes.filter((t) => !t.now).sort((a, b) => a.starts_in - b.starts_in);
    if (now.length) { list.appendChild(el("div", "kb-h-sec", "Đang diễn ra")); now.forEach((t) => themeCard(list, t, ss, money, avail, curId, pv)); }
    if (later.length) { list.appendChild(el("div", "kb-h-sec", "Sắp tới")); later.forEach((t) => themeCard(list, t, ss, money, avail, curId, pv)); }
  }
  function previewMusicText() {
    if (typeof GardenMusic === "undefined") { return "có nhạc riêng"; }
    return GardenMusic.enabled() ? "♪ đang phát nhạc" : "nhạc nền đang tắt (bật ở ⚙)";
  }
  function themeCard(list, t, ss, money, avail, curId, pv) {
    const open = (ss.unlocked || []).indexOf(t.id) >= 0, using = curId === t.id;
    const card = el("div", "kb-h-card kb-h-zone kb-h-theme" + (open ? "" : " kb-h-zone-locked") + (using ? " kb-h-using" : "") +
      (pv === t.id ? " kb-h-previewing" : ""));
    card.appendChild(themePreview(t.id));
    const info = el("div", "kb-h-info");
    const nm = GardenIcons.fill(el("div", "kb-h-name"), (open ? "" : "[i:lock] ") + t.name + " · " + t.jp);
    if (t.now) { nm.appendChild(el("span", "kb-h-newtag kb-h-nowtag", "Đang diễn ra")); }
    info.appendChild(nm);
    info.appendChild(el("div", "kb-h-when", (t.lunar ? "Theo âm lịch · " : "") + t.start + " – " + t.end +
      (t.now ? (t.days_left > 0 ? " · còn " + t.days_left + " ngày" : " · hôm nay là ngày cuối") :
        " · " + (t.starts_in <= 1 ? "bắt đầu ngày mai" : "còn " + t.starts_in + " ngày nữa"))));
    info.appendChild(el("div", "kb-h-desc", t.desc));
    const icons = el("div", "kb-h-theme-items");
    t.items.forEach((id) => {
      const it = item(id);
      if (!SPR[id]) { return; }
      const ic = iconCanvas(SPR[id], 36); ic.className = "kb-h-mini"; ic.title = it ? it.name : id;
      icons.appendChild(ic);
    });
    info.appendChild(icons);
    const row = el("div", "kb-h-btns");
    // 1.18: Xem thử = xem giao diện + nghe luôn nhạc của chủ đề (cả chủ đề đã mở mà chưa dùng)
    const tryBtn = () => btn(pv === t.id ? "Dừng xem thử" : "Xem thử", "kb-btn-small kb-h-try", () => {
      SEA().preview(pv === t.id ? null : t.id);
      renderList();
      if (pv !== t.id) { setTip("Đang xem thử “" + t.name + "” · " + previewMusicText() + " · bấm “Dừng xem thử” để trở lại"); }
      else { defaultTip(); }
    }, false, "Xem và nghe thử, chưa đổi gì");
    if (open) {
      row.appendChild(btn(using ? "Đang dùng" : "Dùng ngay", "kb-h-buy", () => H.send("home:theme:use:" + t.id), using));
      if (!using) { row.appendChild(tryBtn()); }
    } else {
      row.appendChild(btn(money >= t.price ? "Mở khoá · " + kbXu(t.price) + " xu" : "Thiếu " + kbXu(t.price - money) + " xu", "kb-h-buy",
        () => pay("home:theme:buy:" + t.id, { title: "Mở khoá giao diện mùa " + t.name + "?", price: t.price, yes: "Mở khoá" }), money < t.price));
      row.appendChild(btn("Đổi " + t.streak + " ngày ôn liền", "kb-btn-small", () => pay("home:theme:streak:" + t.id, { title: "Mở khoá giao diện mùa " + t.name + "?", cost: t.streak + " ngày ôn liền (không mất xu, chuỗi không đứt)", yes: "Đổi" }), avail < t.streak,
        avail < t.streak ? "Cần " + t.streak + " ngày ôn liền để đổi (đang có " + avail + " ngày)" : "Mở miễn phí bằng ngày ôn liền (chuỗi không đứt)"));
      row.appendChild(tryBtn());
    }
    info.appendChild(row);
    if (!open) {
      info.appendChild(el("div", "kb-h-note", "Tặng kèm: " + t.items.map((id) => (item(id) || { name: id }).name).join(", ")));
    }
    card.appendChild(info);
    list.appendChild(card);
    if (open) { t.items.forEach((id) => { const it = item(id); if (it) { itemCard(list, it, {}); } }); }
  }

  // ---------------------------------------------------------------------
  function open(which) {
    if (!H) { return; }
    if (typeof GardenFinds !== "undefined") { GardenFinds.closeCard(); }
    if (typeof GardenFields !== "undefined") { GardenFields.close(); }
    if (typeof GardenUI !== "undefined") { GardenUI.close(); }
    isOpen = true;
    $("kb-home").hidden = false;
    $("kb-yard-wrap").hidden = true;
    placing = null; selected = null; hidePop();
    setScene(which || mainScene());
    renderList();
    H.send("home:open");
  }
  function close() {
    if (!isOpen) { return; }
    if (typeof GardenCraft !== "undefined" && GardenCraft.isOpen()) { GardenCraft.close(); }
    if (SEA() && SEA().previewing()) { SEA().preview(null); }
    isOpen = false;
    placing = null; selected = null; hidePop();
    $("kb-home").hidden = true;
    $("kb-yard-wrap").hidden = false;
    if (scrollBack !== null) { window.scrollTo(0, scrollBack); scrollBack = null; }
    syncYardNav();
    window.dispatchEvent(new Event("kb-today-fit"));
  }

  function onKey(e) {
    if (!isOpen) { return; }
    if (typeof GardenCraft !== "undefined" && GardenCraft.isOpen()) { return; }
    if (e.key === "Escape") {
      e.preventDefault();
      if (placing) { placing = null; defaultTip(); }
      else if (selected) { selected = null; hidePop(); }
      else { close(); }
    }
  }

  function update(payload) {
    if (!payload) { return; }
    const before = homeState().house;
    const zonesBefore = (homeState().zones || []).length;
    const themesBefore = (seasonState().unlocked || []).slice();
    let tipMsg = null;
    if (payload.catalog && H.setCatalog) { H.setCatalog(payload.catalog); }
    if (payload.wallet) { H.setWallet(payload.wallet); }
    const a = payload.action, sub = payload.sub;
    delArm = null; seedDelArm = null; tileDelArm = null; payWait = 0;
    if (a === "build") {
      const lvl = homeState().house;
      const name = ((catalog() || {}).levels || [])[lvl];
      sfx("stage");
      mood("star", 1800, "やった！ " + (name ? name.name : ""));
      if (lvl >= ((catalog() || {}).room_unlock || 5) && before < ((catalog() || {}).room_unlock || 5)) {
        setTip("Nhà đã có cửa! Bấm vào ngôi nhà hoặc tab “Trong nhà” để vào trong.");
      }
    } else if (a === "buy") {
      sfx("coin");
      mood("happy", 900, "かわいい！");
      if (pendingPlace) { const id = pendingPlace; pendingPlace = null; startPlacing(id); }
    } else if (a === "place" || a === "move") {
      sfx("good"); mood("happy", 700);
      if (pendingSpot) {
        justPlaced = Object.assign({ at: Date.now() }, pendingSpot);
        burst(pendingSpot.scene, pendingSpot);
        pendingSpot = null;
      }
    } else if (a === "take") {
      sfx("flip");
    } else if (a === "zone") {
      const zs = (homeState().zones || []);
      const z = zs.length > zonesBefore ? zs[zs.length - 1] : null;
      sfx("stage");
      mood("star", 2400, "新しい場所！ Đã mở " + (z ? sceneName(z) : "vùng mới"));
      if (z) { setScene(z); }
    } else if (a === "theme") {
      const got = (seasonState().unlocked || []).filter((x) => themesBefore.indexOf(x) < 0)[0];
      if (SEA()) { if (got) { SEA().preview(null); } SEA().refresh(); }
      if (got) {
        const t = ((catalog() || {}).themes || []).find((x) => x.id === got);
        sfx("stage");
        mood("star", 2600, "新しい季節！ Đã mở " + (t ? t.name : "giao diện mới"));
        tipMsg = "Đã mở “" + (t ? t.name : got) + "” và nhận " + (t ? t.items.length : 0) + " món đồ trong kho · bấm “Đặt” để bày ra vườn";
      } else { sfx("flip"); }
    } else if (a === "style") {
      sfx(sub === "buy" ? "stage" : "flip");
      if (sub === "buy") { mood("star", 2000, "新しい家！ Nhà mới đẹp quá"); setScene("yard"); }
    } else if (a === "wear") {
      sfx(sub === "buy" ? "coin" : "flip");
      mood("happy", 1500, sub === "buy" ? "似合う？ Hợp không nè?" : sub === "off" ? "スッキリ！" : "えへへ");
    } else if (a === "face") {
      sfx(sub === "buy" ? "coin" : "flip");
      if (sub === "buy" && typeof GardenFX !== "undefined") {
        const f = ((H.data().wallet || {}).wear || {}).faces || [];
        GardenFX.mood(f[f.length - 1] || "happy", 2200); GardenFX.say("新しい顔！", 2000);
      }
    } else if (a === "repair") {
      sfx("stage"); mood("star", 2000, "ピカピカ！ Nhà sạch đẹp rồi");
    } else if (a === "pet") {
      if (sub === "buy") {
        sfx("stage"); const v = moreView().pets || [], np = v[v.length - 1];
        mood("star", 2200, "よろしくね！ Chào " + (np ? np.name : "bé mới"));
        if (typeof GardenPets !== "undefined") { (v || []).forEach((p) => GardenPets.cheer(p.id)); }
      } else if (sub === "feed") {
        sfx("coin"); mood("happy", 1400, "おいしい！");
        if (typeof GardenPets !== "undefined") { (payload.wallet && payload.wallet.fed || []).forEach((id) => GardenPets.cheer(id)); }
      } else { sfx("flip"); }
    } else if (a === "seed") {
      sfx(sub === "buy" ? "stage" : "flip");
      if (sub === "buy") { mood("star", 2000, "たねゲット！ Chọn chỗ gieo ở trên nhé"); }
    } else if (a === "uzone") {
      if (sub === "save") {
        sfx("stage");
        const isNew = typeof GardenCraft !== "undefined" && GardenCraft.savedZone ? GardenCraft.savedZone(payload) : true;
        mood("star", 2400, isNew ? "新しい場所！ Vùng mới xong rồi" : "Đã sửa vùng ♪");
        tab = "zone";
        if (payload.id) { delete lmCache[payload.id]; if (isNew) { setScene(payload.id); } }
      } else if (sub === "del") {
        sfx("flip");
        if (isUz(scene) && !uzone(scene)) { setScene("yard"); }
      }
    } else if (a === "myseed") {
      if (sub === "save") {
        sfx("stage");
        const isNew = typeof GardenCraft !== "undefined" && GardenCraft.savedSeed ? GardenCraft.savedSeed(payload) : true;
        mood("star", 2200, isNew ? "新しい種！ Giống mới xong rồi" : "Đã sửa giống ♪");
        tab = "seed";
        if (isNew) { tipMsg = "Giống mới ở cuối tab · chọn chỗ gieo ở mục “Gieo ở đâu”"; }
      } else { sfx("flip"); }
    } else if (a === "share") {
      sfx("stage"); peek = null; pasteText = ""; peekCode = "";
      if (sub === "m") {
        mood("star", 2000, "できた！ Đã làm món từ mã");
        if (payload.id) { tab = "craft"; startPlacing(payload.id); }
      } else if (sub === "z") {
        mood("star", 2400, "新しい場所！ Đã tạo vùng từ mã");
        tab = "zone";
        if (payload.id) { delete lmCache[payload.id]; setScene(payload.id); }
      } else {
        mood("star", 2200, "新しい種！ Đã có giống mới");
        tab = "seed"; tipMsg = "Giống mới ở cuối tab · chọn chỗ gieo ở mục “Gieo ở đâu”";
      }
    } else if (a === "decor") {           // 1.30: giấy dán tường / sàn
      decoTry = null;
      if (sub === "buy") {
        sfx("coin"); mood("happy", 1200, "いい感じ！");
        const pd = pendingDecor; pendingDecor = null;
        if (pd && (decorState().own || []).indexOf(pd.id) >= 0) { H.send("home:decor:use:" + pd.room + ":" + pd.slot + ":" + pd.id); }
      } else { sfx("good"); mood("happy", 900, "模様替え！ Đổi không khí ♪"); }
    } else if (a === "tile") {
      decoTry = null;
      if (sub === "save") {
        sfx("stage");
        const isNew = typeof GardenCraft !== "undefined" && GardenCraft.savedTile ? GardenCraft.savedTile(payload) : true;
        mood("star", 2000, isNew ? "できた！ Mẫu mới xong rồi" : "Đã sửa mẫu ♪");
        tab = "room"; roomView = "decor";
        const t = ((catalog() || {}).tiles || []).find((x) => x.id === payload.id);
        if (isNew && t) { H.send("home:decor:use:" + decoRoom() + ":" + t.kind + ":" + t.id); }
      } else { sfx("flip"); }
    } else if (a === "craft") {
      if (sub === "save") {
        sfx("stage");
        const isNew = typeof GardenCraft !== "undefined" ? GardenCraft.saved(payload) : true;
        mood("star", 2000, isNew ? "できた！ Món mới xong rồi" : "Đã sửa xong ♪");
        if (isNew && payload.id) { tab = "craft"; startPlacing(payload.id); }
      } else if (sub === "copy") { sfx("coin"); mood("happy", 900); }
      else { sfx("flip"); }
    }
    selected = null; hidePop();
    renderList();
    if (!placing) { if (tipMsg) { setTip(tipMsg); } else { defaultTip(); } }
  }

  function error(msg) {
    pendingPlace = null; pendingDecor = null; payWait = 0;
    if (typeof GardenCraft !== "undefined" && GardenCraft.isOpen()) { GardenCraft.error(msg); }
    sfx("again");
    mood("sad", 1200, "あれ？");
    setTip(msg);
  }

  return {
    init: function (helpers) {
      H = helpers;
      document.addEventListener("keydown", onKey);
      const cv = $("kb-home-canvas");
      cv.addEventListener("mousemove", onCanvasMove);
      cv.addEventListener("mouseleave", () => { hover = null; });
      cv.addEventListener("click", onCanvasClick);
      $("kb-h-exit").addEventListener("click", close);
      window.addEventListener("resize", () => fitHome());
      // chỉ tab của bảng Nhà (bảng Báo / Lịch hoa dùng chung kiểu nút .kb-h-tab nhưng có bộ nghe riêng)
      Array.prototype.forEach.call(document.querySelectorAll("#kb-home .kb-h-tab"), (b) => {
        b.addEventListener("click", () => { tab = b.getAttribute("data-tab"); renderList(); });
      });

      $("kb-h-move").addEventListener("click", () => {
        if (!selected) { return; }
        const e = homeState()[selected.scene][selected.index];
        if (e) { startPlacing(e.id, selected.index); }
      });
      $("kb-h-take").addEventListener("click", () => {
        if (!selected) { return; }
        H.send("home:take:" + selected.scene + ":" + selected.index);
      });
      $("kb-h-cancel").addEventListener("click", () => { selected = null; hidePop(); });
      // 1.20: kệ sách trong phòng → mở tab Cuốn nhật ký của Lịch hoa
      $("kb-h-read").addEventListener("click", () => { selected = null; hidePop(); close(); if (H.openBook) { H.openBook(); } });
      [["kb-yard-prev", -1], ["kb-yard-next", 1]].forEach(([id, step]) => {
        const b = $(id);
        if (!b) { return; }
        b.addEventListener("mousedown", (ev) => ev.preventDefault());
        b.addEventListener("click", (ev) => { ev.stopPropagation(); cycleMain(step); });
      });
      const navBox = $("kb-yard-nav");
      if (navBox) { navBox.addEventListener("click", (ev) => ev.stopPropagation()); }
      // 1.22: chụp ảnh vườn (nút ở góc sân + nút trong Nhà)
      const ys = $("kb-yard-snap");
      if (ys) {
        ys.addEventListener("mousedown", (ev) => ev.preventDefault());
        ys.addEventListener("click", (ev) => { ev.stopPropagation(); const pop = $("kb-snap-pop"); if (pop && !pop.hidden) { closeSnap(); } else { openSnap(ys, mainScene()); } });
      }
      const hs = $("kb-h-snap");
      if (hs) { hs.addEventListener("click", (ev) => { ev.stopPropagation(); openSnap(hs, scene); }); }
      const spop = $("kb-snap-pop");
      if (spop) {
        spop.addEventListener("click", (ev) => ev.stopPropagation());
        Array.prototype.forEach.call(spop.querySelectorAll("[data-snap]"), (b) => {
          b.addEventListener("mousedown", (ev) => ev.preventDefault());
          b.addEventListener("click", () => takePhoto(b.getAttribute("data-snap")));
        });
        $("kb-snap-x").addEventListener("click", closeSnap);
        document.addEventListener("click", () => closeSnap());
        document.addEventListener("keydown", (ev) => { if (ev.key === "Escape" && !spop.hidden) { ev.stopImmediatePropagation(); ev.preventDefault(); closeSnap(); } }, true);
      }
      $("kb-yard").addEventListener("click", (ev) => {
        const fh = mainFindAt(ev);
        if (fh) { GardenFinds.hit(fh, mainScene(), ev); return; }       // 1.28: chỗ lấp lánh / gánh hàng rong
        if (mainLifeAt(ev)) { ev.stopPropagation(); GardenLife.poke(ev); return; }       // 1.30: StackChan đang sinh hoạt
        const pid = mainPetAt(ev);
        if (pid) {
          if (typeof GardenGames !== "undefined") { GardenGames.close(); }
          if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
          if (typeof GardenCal !== "undefined") { GardenCal.close(); }
          H.closeReview();
          open(mainScene()); petFocus = pid; tab = "pet"; renderList();
          if (typeof GardenPets !== "undefined") { GardenPets.cheer(pid); }
          return;
        }
        const gid = mainGuestAt(ev);
        if (gid) {      // 1.21: bấm khách → mở Album khách ở thẻ của khách đó
          if (typeof GardenGames !== "undefined") { GardenGames.close(); }
          if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
          if (typeof GardenCal !== "undefined") { GardenCal.close(); }
          H.closeReview();
          GardenGuests.react(mainScene());
          open(mainScene()); guestFocus = gid; tab = "guest"; albumView = "guest"; renderList();
          return;
        }
        const hit = mainItemAt(ev);
        if (hit && hit.id === "mailbox" && H.openPaper) { H.openPaper(); return; }
        if (typeof GardenGames !== "undefined") { GardenGames.close(); }
        if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
        if (typeof GardenCal !== "undefined") { GardenCal.close(); }
        H.closeReview();
        if (mainView && mainView.house) {        // 1.24: bấm vào gian nào thì mở bảng Nhà ở gian đó (gian chưa mở → Xây nhà)
          const r = $("kb-yard").getBoundingClientRect(), k = houseRoomAt((ev.clientX - r.left) / mainView.S - mainView.ox);
          if (canEnter(k)) { open(k); } else { open("room"); tab = "build"; renderList(); }
          return;
        }
        open(mainScene());
      });
      $("kb-yard").addEventListener("mousemove", (ev) => {
        const hit = mainItemAt(ev), pid = mainPetAt(ev), gid = pid ? null : mainGuestAt(ev);
        const cv = $("kb-yard");
        const pv = pid ? (moreView().pets || []).find((p) => p.id === pid) : null;
        const lw = !pid && mainLifeAt(ev) ? GardenLife.where() : null;
        if (lw) { cv.title = "StackChan: " + lw.name + " (bấm để xem)"; cv.style.cursor = "pointer"; }
        else if (pv) { cv.title = pv.name + " · " + petStateText(pv) + " (bấm để chăm)"; cv.style.cursor = "pointer"; }
        else if (gid) { cv.title = (guestName(gid) || "Khách") + " ghé vườn (bấm để xem Album khách)"; cv.style.cursor = "pointer"; }
        else if (hit && hit.id === "mailbox") { cv.title = "Hòm thư: mở Báo (phím B)"; cv.style.cursor = "pointer"; }
        else if (mainView && mainView.house) {
          const r = cv.getBoundingClientRect(), k = houseRoomAt((ev.clientX - r.left) / mainView.S - mainView.ox);
          cv.title = canEnter(k) ? sceneName(k) + ": bấm để bày đồ" : sceneName(k) + ": mở rộng nhà ở tab Xây nhà"; cv.style.cursor = "pointer";
        }
        else { cv.removeAttribute("title"); cv.style.cursor = ""; }
      });
      const care = $("kb-care-btn");
      if (care) {
        care.addEventListener("click", (ev) => {
          ev.stopPropagation();
          if (typeof GardenGames !== "undefined") { GardenGames.close(); }
          if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
          if (typeof GardenCal !== "undefined") { GardenCal.close(); }
          H.closeReview();
          open(mainScene()); tab = care.getAttribute("data-tab") || "pet"; renderList();
        });
      }
      requestAnimationFrame(loop);
    },
    open: open,
    close: close,
    isOpen: () => isOpen,
    cycleMain: cycleMain,
    // 1.20: bìa cuốn nhật ký — ảnh xem trước của giao diện mùa, và ảnh vườn tự chụp mỗi tuần (cảnh đang xem, ×2)
    themePreview: themePreview,
    snapshot: function () {
      const S = 2;
      const cv = document.createElement("canvas"); cv.width = YARD.W * S; cv.height = YARD.H * S;
      const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
      drawOutdoor(ctx, S, 0, 0, Date.now(), mainScene() === "house" ? "yard" : mainScene(), {});
      lights.length = 0;
      return cv.toDataURL("image/png");
    },
    _drawWear: drawWear, _houseMask: houseMask,
    // 1.14: ảnh xem trước của vùng tự tạo đang vẽ trong Xưởng (z = bản nháp: bg, ground, hills, lm)
    // 1.16: nền có sẵn của vùng (trời ban ngày, không công trình / đồ) cỡ 256×76 để Xưởng vẽ dưới lưới
    zoneBgCanvas: function (z) {
      const cv = document.createElement("canvas"); cv.width = YARD.W; cv.height = YARD.H;
      const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
      try { drawUzoneBg(ctx, 1, 0, 0, 0, Object.assign({ id: "u99" }, z || {}), 0, YARD.W, DAY_SKY); } catch (e) { return null; }
      return cv;
    },
    photo: function (size, sc) { return photoCanvas(size || "s", sc).toDataURL("image/png"); },
    _photoCanvas: photoCanvas, _openSnap: openSnap,
    zonePreview: function (cv, z) {
      const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, cv.width, cv.height);
      delete lmCache[z.id];
      drawOutdoor(ctx, 1, 0, 0, Date.now(), z.id || "u99", { uz: z, noPets: true, noJoy: true });
      delete lmCache[z.id];
      lights.length = 0;
    },
    update: update,
    error: error,
    // 1.22: mã chia sẻ vừa xuất (Python đã chép vào bộ nhớ tạm) / bản xem trước của mã dán vào
    shareCode: function (p) {
      if (!p || !p.code) { return; }
      shareBox = { id: p.id, name: p.name, code: p.code, copied: !!p.copied, tab: shareFrom };
      sfx("coin");
      if (isOpen) {
        renderList(); showInList(".kb-h-share textarea[readonly]");
        setTip(p.copied ? "Đã chép mã chia sẻ “" + p.name + "” · dán vào tin nhắn / ghi chú để gửi" : "Mã chia sẻ ở trong danh sách · chọn rồi chép");
      }
    },
    sharePeek: function (p) {
      peek = p || null;
      if (p && p.error) { sfx("again"); }
      if (isOpen) { renderList(); showInList(p && p.error ? ".kb-h-paste" : ".kb-h-peek"); }
    },
    dataChanged: () => { stillDirty = true; if (isOpen) { renderList(); } syncYardNav(); syncCare(); },
    // cho test
    _sprites: SPR, _pal: P,
    _parts: (sc) => (parts[sc] || []).length,
    _partKinds: (sc) => (parts[sc] || []).map((q) => q.kind),
    _motion: (sc, i) => { const e = (homeState()[sc] || [])[i]; return e ? motion(e, item(e.id) || {}, Date.now(), sc) : null; },
    _step: (sc, dt) => stepParts(sc, dt),
    pxDecode: pxDecode, pxRows: pxRows, drawItemPreview: function (ctx, S, ox, oy, e, sceneName) { drawItem(ctx, S, ox, oy, e, sceneName, Date.now(), "day"); },
    setScene: setScene, mainScene: mainScene, startPlacing: startPlacing,
    // 1.25.5: bản sửa hình gốc vừa đổi → vẽ lại danh sách (icon) + cảnh
    fixChanged: function () { stillDirty = true; if (isOpen) { renderList(); } },
    _mainItemAt: mainItemAt, _mainView: function () { return mainView; },
    _popFor: function (sc, i) { setScene(sc); selected = { scene: sc, index: i }; showPop(homeState()[sc][i]); },
    setTab: function (t) { tab = t; renderList(); },
    // 1.21: mở Nhà ở tab Album khách, cuộn tới khách id
    openGuests: function (id) { open(mainScene()); guestFocus = id || null; tab = "guest"; albumView = "guest"; renderList(); },
    // 1.28: mở Nhà ở tab Album → Hộp sưu tầm, cuộn tới bộ của cảnh sc
    openBox: function (sc) { open(mainScene() === "house" ? "yard" : mainScene()); tab = "guest"; albumView = "box"; boxFocus = sc || null; renderList(); },
    // 1.30: mở Nhà ở tab Album → Sinh hoạt
    openLife: function () { open(mainScene() === "house" ? "room" : mainScene()); tab = "guest"; albumView = "life"; renderList(); },
    showMain: showMain,
    icon: function (id, size) { return SPR[id] ? iconCanvas(SPR[id], size || 40) : null; },
    _state: () => ({ scene: scene, tab: tab, placing: placing, selected: selected, payWait: payWait, peekCode: peekCode }),
    _spotError: spotError,
    // test / ảnh phác: hàm vẽ nội bộ (không dùng trong giao diện)
    _lib: () => ({ SPR, ALT, P, T, ROOM, SIDE, HOUSE3, box, sprite, drawItem, drawNight, skyColors, skyNow, timeOfDay, lights, SEA, drawWeather }),
    _clickCell: function (x, y) {
      const cv = $("kb-home-canvas"), r = cv.getBoundingClientRect();
      const rc = cellRect(scene, x, y, 1);
      const ev = { clientX: r.left + (rc.x + 4) * view.S, clientY: r.top + (rc.y + 8) * view.S };
      hover = canvasCell(ev);
      onCanvasClick(ev);
    },
    _hoverCell: function (x, y) {
      const cv = $("kb-home-canvas"), r = cv.getBoundingClientRect();
      const rc = cellRect(scene, x, y, 1);
      hover = canvasCell({ clientX: r.left + (rc.x + 4) * view.S, clientY: r.top + (rc.y + 8) * view.S });
    },
    _drawHouse: drawHouse,
    // cho test hiệu năng: vẽ sân màn chính n lần với cảnh sc, trả về ms / khung
    _bench: function (sc, n) {
      benchScene = sc;
      const t0 = performance.now(), base = Date.now();
      try { for (let i = 0; i < n; i++) { stepParts(sc, 0.05); drawMainYard(base + i * 50); } } finally { benchScene = null; }
      return (performance.now() - t0) / n;
    }
  };
})();
