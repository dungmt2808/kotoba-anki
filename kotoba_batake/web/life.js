/* ことば畑 – 1.30: sinh hoạt của StackChan trong nhà, ngoài sân và ở các vùng.
   Python (life_core.py) giữ danh mục việc (cần món nào, ở đâu, giờ nào, tháng nào) + sổ "Sinh hoạt"; gửi sang:
     data.life = {defs: {id: {name, ja, kana, vi, where, need, hours, wx, w, pose, prop, at, pet}}, can: {cảnh: [id…]}, groups, …}
   File này chỉ vẽ + gửi lệnh:
   - Mỗi khung 3 phút chọn một việc trong những việc đang làm được (giờ + thời tiết của trời đang hiện, đồ đã đặt, vùng đã mở):
     trong nhà được ưu tiên, giờ ngủ thì ngủ, giờ cơm thì nấu / ăn. Cả ngày cùng một cách chọn nên không nhảy lung tung.
   - StackChan thu nhỏ đi tới chỗ món đồ rồi làm việc đó; home.js xếp lớp theo chân đứng như thú nuôi (place / draw).
   - Người dùng thấy ≥ 1,5 giây trên cảnh đang xem → "life:seen:<việc>:<cảnh>" (Python xét lại rồi ghi sổ, mỗi ngày một lần).
   - Chip cạnh nút chụp ảnh: "Pha trà" / "ở Bãi biển" → thẻ có câu tiếng Nhật + cách đọc + nghĩa, Đến xem / Gọi về đây.
   - book(list): phần "Sinh hoạt" trong tab Album của bảng Nhà.
   Tắt chung với thú nuôi / khách (⚙ → Giao diện). Kiểu Dịu mắt / cảnh Đứng yên: không nhún, không hạt bay. */
var GardenLife = (function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const YARD = { W: 256, H: 76, SKY: 28 };
  const HOUSE_X = { kitchen: 0, room: 148, bedroom: 312 };          // như HOUSE3.X của home.js
  const ROOM_W = { kitchen: 144, room: 160, bedroom: 144 };
  const ROOMS = ["kitchen", "room", "bedroom"];
  const FLOOR = { y0: 52, y1: 87 };                                  // chân đứng được trong phòng
  const GROUND = { x0: 72, x1: 246, y0: 42, y1: 74 };                // … và ngoài trời (bên phải nhà / công trình)
  const SLOT_MS = 180000, WALK = 22, SEEN_S = 1.5, INVITE_MS = 240000;
  const SCENE_NAME = { yard: "Sân vườn", room: "Phòng chính", kitchen: "Bếp", bedroom: "Phòng ngủ", beach: "Bãi biển",
    shrine: "Đền trên núi", festival: "Phố lễ hội", bamboo: "Rừng tre", onsen: "Suối nước nóng", station: "Ga làng quê" };
  // chỗ đứng mặc định của từng cảnh (toạ độ cảnh; trong nhà: toạ độ của gian)
  const SPOT = { room: [80, 80], kitchen: [72, 80], bedroom: [72, 80], yard: [150, 70], beach: [150, 60], shrine: [78, 70],
    festival: [150, 66], bamboo: [118, 71], onsen: [118, 64], station: [58, 68], u: [150, 66] };
  const SIDE_PREF = { ryouri: -1, arau: 1, gohan: 1, terebi: -1 };
  // chỗ đứng riêng của vài việc không cần đồ: [x, y, hướng mặt]
  const ACT_SPOT = { omairi: [78, 70, -1], suzu: [72, 72, -1], yatai: [74, 71, -1], densha: [58, 68, 1], te_furu: [50, 68, 1] };
  const PLACE_W = { home: 3, yard: 1.2 };                            // ưu tiên trong nhà (người dùng: "ưu tiên trong nhà")
  const SHELL = { sky: ["#cde9ff", "#86bde8"], matcha: ["#d5edb8", "#93c26c"], sakura: ["#ffd9e6", "#ff9fbf"], gold: ["#ffe58a", "#d9a92e"] };
  const PAL = { k: "#1b1b2f", s: "#e8e8f0", S: "#b8b8c8", n: "#111122", w: "#ffffff", p: "#ff7fa0", a: "#8a8fa8", d: "#3d8bff",
    l: "#8fd3ff", y: "#ffd23f", o: "#ff9f1c", r: "#ff4f6d", g: "#3ccb5e", G: "#2e8b3a", b: "#a0603a", B: "#6b3b1f", t: "#e2a46a",
    c: "#fff2b3", m: "#9aa0b5", P: "#ffc4d6", v: "#c77dff" };

  let H = null;
  let actor = null;            // {loc, x, y, dir, act, scene, phase, tx, ty, tdir, spec, since, seen, fx, hop, slotKey}
  let invite = null;           // {scene, until}
  let forced = null;           // test: {id, scene}
  let lastTick = 0;
  const lastDraw = {};         // cảnh → lần cuối được vẽ (để biết cảnh vừa hiện lại)
  const told = {};             // việc → ngày đã báo Python
  let lastBox = null;          // {scene, x, y, w, h} của lần vẽ gần nhất (toạ độ cảnh / gian)
  let cardFor = "";

  function data() { const d = H && H.data && H.data(); return (d && d.life) || null; }
  function wallet() { const d = H && H.data && H.data(); return (d && d.wallet) || {}; }
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function salt(str) { let h = 7; for (const ch of String(str)) { h = (h * 31 + ch.charCodeAt(0)) % 100003; } return h; }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
  function still() { return typeof GardenUI !== "undefined" && GardenUI.get && GardenUI.get("yard") !== "full"; }
  function isRoom(s) { return ROOMS.indexOf(s) >= 0; }
  function isUz(s) { return /^u\d{1,2}$/.test(String(s || "")); }
  function sceneName(s) {
    if (isUz(s)) { const z = ((wallet().more || {}).zones || []).find((q) => q.id === s); return z ? z.name : "Vùng tự tạo"; }
    return SCENE_NAME[s] || s;
  }
  function sky() { return typeof GardenSky !== "undefined" ? GardenSky.state() : { hour: new Date().getHours() + new Date().getMinutes() / 60, rain: 0, snow: 0 }; }

  // ---------------------------------------------------------------------
  // Hình StackChan thu nhỏ: đầu hộp 14 × 10, thân 8 × 4, chân 2 hàng. Lưới 24 cột để còn chỗ cho tay và đồ cầm.
  // ---------------------------------------------------------------------
  const GW = 24, HX = 5, BX = 8;
  function G(w, h) { const g = []; for (let j = 0; j < h; j++) { g.push(new Array(w).fill(".")); } return g; }
  function R(g, x, y, w, h, c) { for (let j = y; j < y + h; j++) { for (let i = x; i < x + w; i++) { if (g[j] && i >= 0 && i < g[j].length) { g[j][i] = c; } } } }
  function D(g, x, y, c) { R(g, x, y, 1, 1, c); }
  function head(g, ox, oy, face) {
    R(g, ox + 1, oy, 12, 1, "k"); R(g, ox, oy + 1, 14, 8, "k"); R(g, ox + 1, oy + 9, 12, 1, "k");
    R(g, ox + 1, oy + 1, 12, 7, "s"); R(g, ox + 1, oy + 8, 12, 1, "S");
    R(g, ox + 2, oy + 2, 10, 6, "n");
    const sx = ox + 2, sy = oy + 2;
    if (face === "sleep") { R(g, sx + 1, sy + 2, 3, 1, "w"); R(g, sx + 6, sy + 2, 3, 1, "w"); R(g, sx + 4, sy + 4, 2, 1, "w"); }
    else if (face === "blink") { R(g, sx + 2, sy + 2, 2, 1, "w"); R(g, sx + 6, sy + 2, 2, 1, "w"); R(g, sx + 4, sy + 4, 2, 1, "w"); }
    else if (face === "happy") {
      [[1, 2], [2, 1], [3, 2], [6, 2], [7, 1], [8, 2]].forEach(([x, y]) => D(g, sx + x, sy + y, "w"));
      R(g, sx + 4, sy + 4, 2, 1, "w"); D(g, sx, sy + 3, "p"); D(g, sx + 9, sy + 3, "p");
    } else if (face === "o") { R(g, sx + 2, sy + 1, 2, 2, "w"); R(g, sx + 6, sy + 1, 2, 2, "w"); R(g, sx + 4, sy + 3, 2, 2, "w"); }
    else if (face === "down") { R(g, sx + 2, sy + 2, 2, 2, "w"); R(g, sx + 6, sy + 2, 2, 2, "w"); }
    else { R(g, sx + 2, sy + 1, 2, 2, "w"); R(g, sx + 6, sy + 1, 2, 2, "w"); R(g, sx + 4, sy + 4, 2, 1, "w"); }
  }
  function body(g, oy) { R(g, BX, oy, 8, 4, "k"); R(g, BX + 1, oy, 6, 2, "s"); R(g, BX + 1, oy + 2, 6, 1, "S"); }
  // tay: side −1 (sau lưng khi quay phải) / +1 (phía trước); pose down / mid / fwd / up → trả chỗ bàn tay
  function arm(g, side, oy, pose) {
    const x = side < 0 ? BX - 1 : BX + 8, xo = x + side, tip = xo + side;
    let hand;
    if (pose === "up") { D(g, x, oy, "a"); D(g, xo, oy - 1, "a"); hand = [tip, oy - 2]; }
    else if (pose === "mid") { D(g, x, oy, "a"); D(g, xo, oy, "a"); hand = [tip, oy - 1]; }
    else if (pose === "fwd") { D(g, x, oy + 1, "a"); D(g, xo, oy + 1, "a"); hand = [tip, oy + 1]; }
    else { D(g, x, oy, "a"); D(g, x, oy + 1, "a"); hand = [x, oy + 2]; }
    D(g, hand[0], hand[1], "k");
    return hand;
  }
  function feet(g, oy, step) {
    const L = (x, dy) => { R(g, x, oy + dy, 4, 2, "k"); R(g, x + 1, oy + dy, 2, 1, "S"); };
    if (step === 1) { L(BX - 1, 0); L(BX + 4, -1); } else if (step === 2) { L(BX, -1); L(BX + 5, 0); } else { L(BX, 0); L(BX + 4, 0); }
  }
  // đồ cầm tay (vẽ vào lưới cạnh bàn tay phải h = [x, y])
  const PROPS = {
    cup: (g, h) => { R(g, h[0] + 1, h[1] - 2, 3, 3, "w"); R(g, h[0] + 1, h[1] - 2, 3, 1, "g"); D(g, h[0] + 4, h[1] - 1, "w"); },
    can: (g, h) => { R(g, h[0] + 1, h[1] - 1, 4, 3, "d"); D(g, h[0] + 2, h[1] - 1, "l"); D(g, h[0] + 5, h[1], "d"); D(g, h[0] + 5, h[1] + 1, "l"); R(g, h[0] + 2, h[1] - 2, 2, 1, "k"); },
    broom: (g, h) => { D(g, h[0] + 1, h[1] + 1, "b"); D(g, h[0] + 2, h[1] + 2, "b"); R(g, h[0] + 1, h[1] + 3, 4, 2, "y"); R(g, h[0] + 1, h[1] + 4, 4, 1, "o"); },
    book: (g, h) => { R(g, h[0] - 1, h[1] - 1, 6, 3, "r"); R(g, h[0], h[1] - 1, 4, 2, "w"); D(g, h[0] + 2, h[1] - 1, "m"); },
    paper: (g, h) => { R(g, h[0] - 2, h[1] - 2, 8, 4, "w"); R(g, h[0] - 1, h[1] - 1, 6, 1, "m"); R(g, h[0] - 1, h[1] + 1, 4, 1, "m"); D(g, h[0] + 2, h[1] - 2, "k"); },
    pencil: (g, h) => { D(g, h[0] + 1, h[1] - 1, "y"); D(g, h[0] + 2, h[1] - 2, "y"); D(g, h[0] + 3, h[1] - 3, "p"); },
    ladle: (g, h) => { D(g, h[0] + 1, h[1] + 1, "m"); D(g, h[0] + 2, h[1] + 2, "m"); R(g, h[0] + 2, h[1] + 3, 2, 1, "m"); },
    bowl: (g, h) => { R(g, h[0] + 1, h[1] - 1, 4, 2, "w"); R(g, h[0] + 2, h[1] + 1, 2, 1, "m"); D(g, h[0] + 3, h[1] - 3, "b"); D(g, h[0] + 3, h[1] - 2, "b"); },
    snack: (g, h) => { R(g, h[0] + 1, h[1] - 2, 3, 3, "w"); D(g, h[0] + 2, h[1], "k"); D(g, h[0] + 2, h[1] - 3, "w"); },
    mikan: (g, h) => { R(g, h[0] + 1, h[1] - 1, 2, 2, "o"); D(g, h[0] + 1, h[1] - 2, "G"); },
    dango: (g, h) => { D(g, h[0] + 1, h[1] - 4, "p"); D(g, h[0] + 1, h[1] - 3, "w"); D(g, h[0] + 1, h[1] - 2, "g"); D(g, h[0] + 1, h[1] - 1, "b"); },
    fan: (g, h) => { R(g, h[0], h[1] - 5, 5, 4, "r"); R(g, h[0] + 1, h[1] - 4, 3, 2, "w"); D(g, h[0] + 2, h[1] - 1, "b"); },
    apple: (g, h) => { R(g, h[0] + 1, h[1] - 4, 3, 3, "r"); D(g, h[0] + 1, h[1] - 4, "w"); D(g, h[0] + 2, h[1] - 1, "b"); },
    poi: (g, h) => { R(g, h[0] + 1, h[1] + 1, 4, 3, "w"); R(g, h[0] + 2, h[1] + 2, 2, 1, "l"); },
    bachi: (g, h) => { D(g, h[0] + 1, h[1] - 1, "b"); D(g, h[0] + 2, h[1] - 2, "b"); D(g, h[0] + 3, h[1] - 3, "t"); },
    rod: (g, h) => { for (let i = 1; i <= 5; i++) { D(g, h[0] + i, h[1] - i, "b"); } for (let j = h[1] - 4; j < h[1] + 5; j++) { D(g, h[0] + 5, j, "m"); } },
    bucket: (g, h) => { R(g, h[0], h[1] + 1, 4, 3, "m"); R(g, h[0] + 1, h[1] + 1, 2, 1, "l"); },
    milk: (g, h) => { R(g, h[0] + 1, h[1] - 3, 2, 4, "w"); R(g, h[0] + 1, h[1] - 3, 2, 1, "d"); },
    can2: (g, h) => { R(g, h[0] + 1, h[1] - 2, 2, 3, "r"); R(g, h[0] + 1, h[1] - 2, 2, 1, "m"); },
    sand: (g, h, gh) => { R(g, 18, gh - 3, 5, 3, "c"); R(g, 19, gh - 5, 3, 2, "c"); D(g, 20, gh - 7, "b"); D(g, 20, gh - 6, "b"); D(g, 21, gh - 7, "r"); R(g, 18, gh - 1, 5, 1, "t"); },
    snowman: (g, h, gh) => { R(g, 18, gh - 5, 5, 5, "w"); R(g, 19, gh - 8, 3, 3, "w"); D(g, 19, gh - 7, "k"); D(g, 21, gh - 7, "k"); D(g, 20, gh - 6, "o"); D(g, 20, gh - 3, "k"); },
    shoot: (g, h, gh) => { R(g, 19, gh - 3, 3, 3, "b"); R(g, 20, gh - 5, 1, 2, "t"); D(g, 20, gh - 2, "t"); },
  };
  const cache = {};
  // pose + khung (0 / 1) + đồ cầm → hàng điểm ảnh (ô "." trong suốt); chân đứng = hàng cuối
  function build(pose, f, prop) {
    const key = pose + "|" + f + "|" + (prop || "");
    if (cache[key]) { return cache[key]; }
    const sitting = pose === "sit" || pose === "eat" || pose === "read";
    let g, hand = null;
    if (pose === "bath" || pose === "swim") {            // chỉ có đầu (khăn trên đầu / phao quanh người)
      g = G(GW, 13);
      head(g, HX, 2, pose === "bath" ? (f ? "sleep" : "happy") : "happy");
      if (pose === "bath") { R(g, HX + 3, 0, 8, 2, "w"); R(g, HX + 4, 1, 6, 1, "P"); }
      else { R(g, HX - 2, 10, 18, 3, "r"); [HX - 1, HX + 4, HX + 9, HX + 14].forEach((x) => R(g, x, 10, 2, 3, "w")); R(g, HX - 2, 12, 18, 1, "k"); }
    } else if (sitting) {
      g = G(GW, 14);
      const face = pose === "read" ? "down" : pose === "eat" ? (f ? "o" : "happy") : (f ? "blink" : "idle");
      head(g, HX, 0, face); body(g, 10);
      R(g, BX + 6, 12, 5, 2, "k"); R(g, BX + 7, 12, 3, 1, "S");                      // chân duỗi ra trước
      arm(g, -1, 10, "down");
      hand = arm(g, 1, 10, pose === "read" ? "fwd" : pose === "eat" ? (f ? "mid" : "fwd") : "down");
    } else {
      g = G(GW, 16);
      const face = pose === "stretch" || pose === "wave" ? "happy" : pose === "pray" ? "sleep" : (f && pose === "stand" ? "blink" : "idle");
      head(g, HX, 0, face); body(g, 10);
      feet(g, 14, pose === "walk" || pose === "sweep" ? (f ? 1 : 2) : 0);
      if (pose === "stretch") { arm(g, -1, 10, f ? "up" : "mid"); hand = arm(g, 1, 10, f ? "up" : "mid"); }
      else if (pose === "wave") { arm(g, -1, 10, "down"); hand = arm(g, 1, 10, f ? "up" : "mid"); }
      else if (pose === "pray") { arm(g, -1, 10, "mid"); hand = arm(g, 1, 10, "mid"); }
      else if (pose === "reach") { arm(g, -1, 10, "down"); hand = arm(g, 1, 10, f ? "mid" : "fwd"); }
      else if (pose === "cook") { arm(g, -1, 10, "mid"); hand = arm(g, 1, 10, f ? "fwd" : "mid"); }
      else if (pose === "hold") { arm(g, -1, 10, "down"); hand = arm(g, 1, 10, "mid"); }
      else if (pose === "sweep") { arm(g, -1, 10, "fwd"); hand = arm(g, 1, 10, "fwd"); }
      else if (pose === "walk") { arm(g, -1, 10, f ? "down" : "fwd"); hand = arm(g, 1, 10, f ? "fwd" : "down"); }
      else { arm(g, -1, 10, "down"); hand = arm(g, 1, 10, "down"); }
    }
    if (prop && PROPS[prop] && hand) { PROPS[prop](g, hand, g.length); }
    const rows = g.map((r) => r.join(""));
    cache[key] = rows;
    return rows;
  }
  function dozeRows() {                    // ngồi ngủ gật (ngủ trưa trên thảm, đêm không có giường…)
    if (!cache.doze) {
      const g = G(GW, 14);
      head(g, HX, 0, "sleep"); body(g, 10); R(g, BX + 6, 12, 5, 2, "k"); R(g, BX + 7, 12, 3, 1, "S");
      arm(g, -1, 10, "down"); arm(g, 1, 10, "down");
      cache.doze = g.map((r) => r.join(""));
    }
    return cache.doze;
  }
  function headOnly(face) {
    const key = "head|" + face;
    if (!cache[key]) { const g = G(14, 10); head(g, 0, 0, face); cache[key] = g.map((r) => r.join("")); }
    return cache[key];
  }
  function pal() {
    const on = ((wallet().wear || {}).on || {}).shell, sh = SHELL[on];
    return sh ? Object.assign({}, PAL, { s: sh[0], S: sh[1] }) : PAL;
  }
  function paint(ctx, rows, x, y, S, flip, alpha, p) {
    p = p || pal();
    if (alpha !== undefined) { ctx.globalAlpha = alpha; }
    const w = rows[0].length;
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < w; i++) {
        const c = row[i];
        if (c === ".") { continue; }
        ctx.fillStyle = p[c] || c;
        const xx = flip ? x + (w - 1 - i) : x + i;
        ctx.fillRect(Math.round(xx * S), Math.round((y + j) * S), Math.ceil(S), Math.ceil(S));
      }
    }
    if (alpha !== undefined) { ctx.globalAlpha = 1; }
  }
  // icon nhỏ cho thẻ / sổ; seen = false → bóng đen
  function icon(aid, scale, seen) {
    const v = data(), def = v && v.defs ? v.defs[aid] : null;
    const sc = scale || 3, cv = document.createElement("canvas");
    cv.width = 26 * sc; cv.height = 18 * sc; cv.className = "kb-life-ico";
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    let rows = !def ? build("sit", 0, "") : def.pose === "sleep" ? dozeRows() : build(def.pose === "walk" ? "stand" : def.pose, 0, def.prop);
    if (seen === false) { rows = rows.map((r) => r.replace(/[^.]/g, "n")); }
    paint(ctx, rows, 1, 18 - rows.length - 1, sc, false, seen === false ? 0.5 : undefined);
    return cv;
  }

  // ---------------------------------------------------------------------
  // Chọn việc theo giờ
  // ---------------------------------------------------------------------
  function hourOk(def, h) { return (def.hours || []).some((r) => h >= r[0] && h < r[1]); }
  function wxOk(def, st) {
    const wet = !!(st.rain || st.snow);
    if (def.wx === "dry") { return !wet; }
    if (def.wx === "rain") { return !!st.rain; }
    if (def.wx === "snow") { return !!st.snow; }
    if (def.wx === "nosnow") { return !st.snow; }
    return true;
  }
  // các việc làm được ngay lúc này: [{id, scene, w}] — only (tuỳ chọn): chỉ ở các cảnh này
  function candidates(only) {
    const v = data();
    if (!v || !v.can || !v.defs) { return []; }
    const st = sky(), out = [];
    Object.keys(v.can).forEach((sc) => {
      if (only && only.indexOf(sc) < 0) { return; }
      (v.can[sc] || []).forEach((id) => {
        const def = v.defs[id];
        if (!def || !hourOk(def, st.hour) || !wxOk(def, st)) { return; }
        // việc trong nhà không cần đồ: chỉ tính ở phòng chính (khỏi nhân ba)
        if (def.where === "home" && !(def.need || []).length && sc !== "room") { return; }
        out.push({ id: id, scene: sc, w: def.w * (PLACE_W[def.where] || 1) });
      });
    });
    return out;
  }
  function homeScenes() { const v = data(); return ROOMS.filter((r) => v && v.can && v.can[r]); }
  function hasRoom() { const d = H && H.data && H.data(); const h = d && d.wallet && d.wallet.home; return !!(h && h.house >= ((d.catalog || {}).room_unlock || 5)); }
  function current(now) {
    if (forced) { return forced; }
    const v = data();
    if (!v || v.off) { return null; }        // off: add-on test tắt StackChan cho kịch bản cũ (LIFE_TEST_OFF)
    let only = null;
    if (invite && now < invite.until) { only = invite.scene === "house" ? ROOMS.slice() : [invite.scene]; } else { invite = null; }
    const list = candidates(only);
    const slot = Math.floor(now / SLOT_MS), seed = salt(v.today || "") * 131 + slot;
    if (!list.length) {
      const sc = only ? (only.indexOf("room") >= 0 ? "room" : only[0]) : (hasRoom() ? "room" : "yard");
      return { id: "", scene: sc, key: "idle|" + sc };
    }
    const total = list.reduce((s, c) => s + c.w, 0);
    let r = hash(seed) * total;
    for (let i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) { return Object.assign({ key: list[i].id + "|" + list[i].scene }, list[i]); } }
    const last = list[list.length - 1];
    return Object.assign({ key: last.id + "|" + last.scene }, last);
  }

  // ---------------------------------------------------------------------
  // Chỗ đứng của một việc trong cảnh (toạ độ cảnh / gian) — spots(ids): chỗ các món đồ (home.js)
  // ---------------------------------------------------------------------
  function clampFloor(sc, x, y) {
    if (isRoom(sc)) { return [Math.max(8, Math.min(ROOM_W[sc] - 8, x)), Math.max(FLOOR.y0, Math.min(FLOOR.y1, y))]; }
    return [Math.max(GROUND.x0, Math.min(GROUND.x1, x)), Math.max(GROUND.y0, Math.min(GROUND.y1, y))];
  }
  function freeSpot(sc, x, y, spots) {
    const all = spots ? spots("*") : [];
    for (let k = 0; k < 6; k++) {
      const hit = all.some((s) => s.bottom >= 40 && x > s.left - 7 && x < s.right + 7 && y > s.bottom - 10 && y <= s.bottom + 8);
      if (!hit) { break; }
      x += (k % 2 ? -1 : 1) * (14 + k * 8);
      const c = clampFloor(sc, x, y); x = c[0];
    }
    return [x, y];
  }
  function target(cur, spots) {
    const v = data(), def = cur.id && v ? v.defs[cur.id] : null, sc = cur.scene;
    const base = SPOT[isUz(sc) ? "u" : sc] || SPOT.yard;
    const t = { x: base[0], y: base[1], dir: 1, mode: "stand", item: null };
    if (!def) { const f = freeSpot(sc, base[0], base[1], spots); t.x = f[0]; t.y = f[1]; return t; }
    const need = def.need || [];
    const its = need.length && spots ? spots(need) : [];
    const it = its.length ? its[salt(cur.id + (v.today || "")) % its.length] : null;
    t.item = it ? it.id : null;
    const at = def.at;
    if (it && (at === "front" || at === "side" || at === "on")) {
      const wall = isRoom(sc) && it.bottom < 40;                     // đồ treo tường: đứng dưới sàn, ngay bên dưới
      if (wall) { const c = clampFloor(sc, it.cx, 54), f = freeSpot(sc, c[0], c[1], spots); t.x = f[0]; t.y = f[1]; t.dir = f[0] > it.cx ? -1 : 1; return t; }
      if (at === "on") {
        t.mode = "on"; t.x = it.cx; t.y = it.bottom; t.box = it;
        if (def.pose === "sleep" && (it.id === "beddo" || it.id === "futon")) { t.mode = "bed"; }
        return t;
      }
      if (at === "front") { const c = clampFloor(sc, it.cx, it.bottom + 4); t.x = c[0]; t.y = c[1]; t.dir = 1; return t; }       // đứng ngay trước món đồ
      // side: đứng cạnh món đồ, quay mặt vào nó
      const lim = isRoom(sc) ? [10, ROOM_W[sc] - 10] : [GROUND.x0, GROUND.x1];
      const leftOk = it.left - 9 >= lim[0], rightOk = it.right + 9 <= lim[1];
      const pref = SIDE_PREF[cur.id] || 0;         // −1: bên trái món đồ (nồi ở đầu trái bếp) · +1: bên phải (bồn rửa)
      const onLeft = leftOk && (!rightOk || (pref ? pref < 0 : salt(cur.id) % 2 === 0));
      const c = clampFloor(sc, onLeft ? it.left - 9 : it.right + 9, it.bottom + 1);
      t.x = c[0]; t.y = c[1]; t.dir = onLeft ? 1 : -1;
      return t;
    }
    if (at === "window") { t.x = 80; t.y = 54; return t; }
    if (at === "roam") { t.mode = "roam"; return t; }
    if (at === "sea") { t.mode = "sea"; t.x = 160; t.y = 27; return t; }
    if (at === "shore") { t.x = 172; t.y = 35; t.raw = true; return t; }
    if (at === "bath") {
      const tubs = spots ? spots(["rotenburo"]) : [];
      if (tubs.length) { t.mode = "tub"; t.box = tubs[0]; t.x = tubs[0].cx; t.y = tubs[0].bottom; t.item = "rotenburo"; }
      else { t.mode = "house"; t.x = 32; t.y = 70; t.raw = true; }
      return t;
    }
    if (at === "pet") {
      const P0 = typeof GardenPets !== "undefined" && GardenPets.where ? GardenPets : null;
      const ph = P0 ? P0.where("house") : [], pr = P0 ? P0.where("room") : [];
      const px = ph.length ? ph[0].x - HOUSE_X.room : pr.length ? pr[0].x : null, py = ph.length ? ph[0].y : pr.length ? pr[0].y : 0;
      if (px !== null && px > 20 && px < 140) { const c = clampFloor(sc, px + 15, py + 1); t.x = c[0]; t.y = c[1]; t.dir = -1; return t; }
    }
    if (ACT_SPOT[cur.id]) { const q = ACT_SPOT[cur.id]; t.x = q[0]; t.y = q[1]; t.dir = q[2]; return t; }
    const f = freeSpot(sc, t.x, t.y, spots); t.x = f[0]; t.y = f[1];
    return t;
  }

  // ---------------------------------------------------------------------
  // Diễn viên: đi tới chỗ rồi làm
  // ---------------------------------------------------------------------
  function gx(sc, x) { return isRoom(sc) ? HOUSE_X[sc] + x : x; }            // toạ độ gian → toạ độ cả nhà
  function roomAt(x) { return x < 146 ? "kitchen" : x < 310 ? "room" : "bedroom"; }
  function entry(sc) {
    if (isRoom(sc)) { return [gx("room", 80), 88]; }
    if (sc === "yard") { return [40, 74]; }
    return [250, 66];
  }
  function tick(now) {
    const dt = lastTick ? Math.min(0.25, (now - lastTick) / 1000) : 0;
    lastTick = now;
    const cur = current(now);
    if (!cur) { actor = null; return 0; }
    if (!actor) { actor = { loc: cur.scene, x: 0, y: 0, dir: 1, key: "", phase: "new", fx: [], hop: 0, seen: 0, since: now }; }
    const a = actor;
    if (a.key !== cur.key) {
      const sameHouse = isRoom(a.loc) && isRoom(cur.scene) && a.phase !== "new";
      const sameScene = a.loc === cur.scene && a.phase !== "new";
      a.key = cur.key; a.act = cur.id; a.spec = null; a.seen = 0; a.since = now; a.hidden = false;
      if (!sameHouse && !sameScene) { const e = entry(cur.scene); a.x = e[0]; a.y = e[1]; a.fresh = true; }
      a.loc = cur.scene; a.phase = "seek";
    }
    return dt;
  }
  function resolve(a, cur, spots) {
    const t = target(cur, spots);
    a.spec = t;
    a.tx = gx(cur.scene, t.x); a.ty = t.y; a.tdir = t.dir;
    a.phase = "walk";
  }
  function step(a, dt, now, visible, justShown) {
    if (a.phase !== "walk" && a.phase !== "do") { return; }
    const sp = a.spec;
    if (a.phase === "walk") {
      // cảnh vừa hiện lại (người dùng vừa chuyển tới): đặt luôn vào chỗ, khỏi phải chờ đi bộ từ cửa
      if (justShown || !visible) { a.x = a.tx; a.y = a.ty; }
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      if (d < 1) { a.x = a.tx; a.y = a.ty; a.dir = a.tdir || 1; a.phase = "do"; a.since = now; a.roamAt = 0; }
      else { const k = Math.min(1, WALK * dt / d); a.x += dx * k; a.y += dy * k; if (Math.abs(dx) > 0.3) { a.dir = dx > 0 ? 1 : -1; } }
      a.fresh = false;
      return;
    }
    if (sp && sp.mode === "roam") {                      // quét nhà / đi dạo: đi qua đi lại
      if (!a.roamAt || now > a.roamAt) {
        const room = isRoom(a.loc);
        const x0 = room ? HOUSE_X[a.loc] + 12 : GROUND.x0 + 6, x1 = room ? HOUSE_X[a.loc] + ROOM_W[a.loc] - 12 : GROUND.x1 - 6;
        a.rx = x0 + Math.random() * (x1 - x0); a.ry = room ? 74 + Math.random() * 12 : 60 + Math.random() * 12;
        a.roamAt = now + 5000 + Math.random() * 3000;
      }
      const dx = a.rx - a.x, dy = a.ry - a.y, d = Math.hypot(dx, dy);
      a.moving = d > 1;
      if (a.moving) { const k = Math.min(1, WALK * 0.6 * dt / d); a.x += dx * k; a.y += dy * k; if (Math.abs(dx) > 0.3) { a.dir = dx > 0 ? 1 : -1; } }
    } else if (sp && sp.mode === "sea") {
      a.x = 160 + Math.sin(now / 5200) * 38; a.dir = Math.cos(now / 5200) >= 0 ? 1 : -1;
    }
    if (a.hop > 0) { a.hop = Math.max(0, a.hop - dt * 2.5); }
  }
  // hạt nhỏ quanh StackChan: hơi nước, giọt nước, nốt nhạc, zZ, tim, bụi
  function emit(a, def, now) {
    if (still() || (a.fxAt && now < a.fxAt)) { return; }
    const pose = def ? def.pose : "", id = a.act;
    let kind = "", gap = 900;
    if (pose === "sleep" || (!def && a.doze)) { kind = "z"; gap = 1700; }
    else if (id === "ocha" || id === "ryouri" || id === "gohan" || pose === "bath" || id === "hi") { kind = "steam"; gap = 520; }
    else if (def && def.prop === "can") { kind = "drop"; gap = 260; }
    else if (id === "rajio" || id === "gakki" || id === "taiko") { kind = "note"; gap = 1000; }
    else if (id === "asobu" || id === "hanami" || id === "yuuhi" || id === "hoshi" || id === "hotaru" || id === "hanabi") { kind = "heart"; gap = 2400; }
    else if (pose === "sweep" && a.moving) { kind = "dust"; gap = 420; }
    else if (pose === "swim") { kind = "splash"; gap = 700; }
    else if (id === "arau" || id === "te" || id === "jitensha") { kind = "bubble"; gap = 600; }
    if (!kind) { return; }
    a.fxAt = now + gap * (0.7 + Math.random() * 0.6);
    a.fx.push({ k: kind, t: now, dx: (Math.random() - 0.5) * 4 });
    if (a.fx.length > 14) { a.fx.shift(); }
  }
  const NOTE = [".kk", ".k.", ".k.", "kk.", "kk."], ZZ = ["kkk", "..k", ".k.", "kkk"], HEART = [".r.r.", "rrrrr", ".rrr.", "..r.."];
  function drawFx(ctx, S, ox, oy, a, x, top, now) {
    a.fx = a.fx.filter((f) => now - f.t < 1600);
    a.fx.forEach((f) => {
      const k = (now - f.t) / 1600, al = k < 0.7 ? 1 : (1 - k) / 0.3;
      const fxx = ox + x + f.dx, front = a.dir > 0 ? 7 : -9;
      ctx.globalAlpha = Math.max(0, al);
      if (f.k === "z") { paint(ctx, ZZ, fxx + 5 + k * 4, oy + top - 4 - k * 7, S, false, al, { k: "#3d8bff" }); }
      else if (f.k === "steam") { ctx.fillStyle = "#ffffff"; ctx.globalAlpha = al * 0.7; ctx.fillRect(Math.round((fxx + front + Math.sin(k * 6 + f.dx) * 1.5) * S), Math.round((oy + top + 4 - k * 9) * S), 2 * S, 2 * S); }
      else if (f.k === "drop") { ctx.fillStyle = "#8fd3ff"; ctx.fillRect(Math.round((fxx + (a.dir > 0 ? 12 : -13)) * S), Math.round((oy + top + 11 + k * 7) * S), S, 2 * S); }
      else if (f.k === "note") { paint(ctx, NOTE, fxx + front, oy + top - 2 - k * 9, S, false, al, { k: ["#3d8bff", "#ff7fa0", "#3ccb5e"][Math.floor(f.t / 7) % 3] }); }
      else if (f.k === "heart") { paint(ctx, HEART, fxx - 2, oy + top - 5 - k * 6, S, false, al, { r: "#ff4f6d" }); }
      else if (f.k === "dust") { ctx.fillStyle = "#d9c9a8"; ctx.fillRect(Math.round((fxx + (a.dir > 0 ? 12 : -12) + k * 3 * a.dir) * S), Math.round((oy + a.y - 2 - k * 3) * S), S, S); }
      else if (f.k === "splash") { ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round((fxx - 9 + f.dx * 4) * S), Math.round((oy + a.y - 1 - Math.sin(k * 3.1) * 3) * S), S, S); }
      else if (f.k === "bubble") { ctx.fillStyle = "#bfe9ff"; ctx.fillRect(Math.round((fxx + front) * S), Math.round((oy + top + 8 - k * 8) * S), 2 * S, 2 * S); }
      ctx.globalAlpha = 1;
    });
  }

  // home.js gọi mỗi khung cho từng cảnh / gian đang vẽ: trả [] hoặc [{life, base}] để xếp lớp với đồ theo chân đứng.
  // opts.spots(ids) → chỗ các món đồ ở cảnh; opts.seen = cảnh này đang hiện cho người dùng
  function place(scene, now, st, opts) {
    if (typeof GardenUI !== "undefined" && GardenUI.get && GardenUI.get("pets") === "off" && !(opts && opts.force)) { return []; }
    const dt = tick(now);
    const a = actor;
    const shown = lastDraw[scene] && now - lastDraw[scene] < 600;
    lastDraw[scene] = now;
    if (!a) { return []; }
    const visible = a.loc === scene || (isRoom(scene) && isRoom(a.loc));
    if (a.phase === "seek" && opts && opts.spots) { const cur = current(now); resolve(a, cur, (ids) => opts.spots(ids, cur.scene)); }
    if (a.stepAt !== now) { a.stepAt = now; step(a, dt, now, visible, visible && !shown); }
    if (!visible || a.phase === "seek") { return []; }
    // trong nhà: toạ độ cả nhà → gian đang vẽ
    if (isRoom(scene)) {
      if (roomAt(a.x) !== scene) { return []; }
      return [{ life: true, lx: a.x - HOUSE_X[scene], y: a.y, base: a.spec && (a.spec.mode === "bed" || a.spec.mode === "on") ? a.y + 0.5 : a.y, scene: scene, seen: !!(opts && opts.seen) }];
    }
    const early = a.spec && (a.spec.mode === "sea" || a.spec.mode === "house");
    return [{ life: true, lx: a.x, y: a.y, base: early ? 0 : (a.spec && (a.spec.mode === "tub" || a.spec.mode === "on") ? a.y + 0.5 : a.y), scene: scene, seen: !!(opts && opts.seen) }];
  }
  function draw(ctx, S, ox, oy, e, now) {
    const a = actor, v = data();
    if (!a) { return; }
    const def = a.act && v && v.defs ? v.defs[a.act] : null, sp = a.spec || {};
    const doing = a.phase === "do";
    const f = still() ? 0 : Math.floor(now / 380) % 2;
    const x = e.lx, y = e.y;
    let rows, top, flip = a.dir < 0, bx, by;
    const hop = a.hop > 0 ? Math.round(Math.sin(a.hop * Math.PI) * 4) : 0;
    const hour = sky().hour, night = hour >= 22.5 || hour < 5.5;
    a.doze = !def && doing && night;
    if (!doing) { rows = build("walk", still() ? 0 : Math.floor(now / 190) % 2, ""); }
    else if (sp.mode === "bed" && sp.box) {                 // ngủ trên giường / nệm: chỉ thấy đầu trên gối
      rows = headOnly("sleep");
      bx = sp.box.left + (sp.item === "beddo" ? -3 : -2); by = sp.box.top + (sp.item === "beddo" ? -3 : -1);
      paint(ctx, rows, ox + bx, oy + by, S, false);
      emit(a, def, now); drawFx(ctx, S, ox, oy, a, bx + 7, by, now);
      box(e, bx, by, 14, 10); seen(a, e, now); return;
    } else if (sp.mode === "tub" && sp.box) {               // ngâm trong bồn đá
      rows = build("bath", Math.floor(now / 2600) % 2, "");
      bx = sp.box.cx - 12; by = sp.box.top - 3 + (still() ? 0 : Math.round(Math.sin(now / 900) * 0.6));
      paint(ctx, rows.slice(0, 11), ox + bx, oy + by, S, false);
      emit(a, def, now); drawFx(ctx, S, ox, oy, a, sp.box.cx, by, now);
      box(e, bx + 5, by, 14, 12); seen(a, e, now); return;
    } else if (sp.mode === "house") {                       // tắm trong nhà tắm: ló đầu ở cửa sổ, hơi nước trên mái
      const wx = 11, wy = 45;
      ctx.fillStyle = "#b8b8c8"; ctx.fillRect(Math.round((ox + wx) * S), Math.round((oy + wy + 2) * S), 8 * S, 6 * S);
      ctx.fillStyle = "#111122"; ctx.fillRect(Math.round((ox + wx + 1) * S), Math.round((oy + wy + 3) * S), 6 * S, 4 * S);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round((ox + wx + 2) * S), Math.round((oy + wy + 4) * S), S, S); ctx.fillRect(Math.round((ox + wx + 5) * S), Math.round((oy + wy + 4) * S), S, S);
      ctx.fillRect(Math.round((ox + wx + 1) * S), Math.round((oy + wy) * S), 6 * S, 2 * S);
      emit(a, def, now); drawFx(ctx, S, ox, oy, a, 30, 30, now);
      box(e, wx - 1, wy - 1, 12, 12); seen(a, e, now); return;
    } else if (sp.mode === "sea") {
      rows = build("swim", 0, "");
      by = y - 13 + (still() ? 0 : Math.round(Math.sin(now / 600) * 1));
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, ctx.canvas.width, Math.round((oy + 28) * S)); ctx.clip();
      paint(ctx, rows, ox + x - GW / 2, oy + by, S, flip);
      ctx.restore();
      emit(a, def, now); drawFx(ctx, S, ox, oy, a, x, by, now);
      box(e, x - 8, by, 16, 13); seen(a, e, now); return;
    } else if (!def) { rows = a.doze ? dozeRows() : build("sit", f, ""); }
    else if (def.pose === "sleep") { rows = dozeRows(); }
    else if (def.pose === "walk" || def.pose === "sweep") { rows = build(def.pose, a.moving === false ? 0 : (still() ? 0 : Math.floor(now / 220) % 2), def.prop); }
    else { rows = build(def.pose, f, def.prop); }
    top = y - rows.length - hop;
    let yy = top;
    if (doing && sp.mode === "on" && sp.box) {             // ngồi lên ghế / mép bồn / gối
      const bh = sp.box.bottom - sp.box.top;
      yy = sp.box.top + (sp.item === "bench" ? 9 : Math.max(2, bh - 4)) - rows.length;
    }
    ctx.globalAlpha = 0.2; ctx.fillStyle = "#1b1b2f"; ctx.fillRect(Math.round((ox + x - 5) * S), Math.round((oy + (sp.mode === "on" && doing ? yy + rows.length : y) - 1) * S), 10 * S, S); ctx.globalAlpha = 1;
    paint(ctx, rows, ox + x - GW / 2, oy + yy, S, flip);
    if (doing) { emit(a, def, now); }
    drawFx(ctx, S, ox, oy, a, x, yy, now);
    box(e, x - 8, yy, 16, rows.length);
    if (doing) { seen(a, e, now); }
  }
  function box(e, x, y, w, h) { lastBox = { scene: e.scene, x: x, y: y, w: w, h: h, t: Date.now() }; }
  // đang ở màn chính (không ôn thẻ / chơi / đọc báo) và cảnh nằm trong khung nhìn — không thì không tính là "đã thấy"
  function watching() {
    if (document.hidden) { return false; }
    if (typeof GardenUI !== "undefined" && GardenUI.mode && GardenUI.mode() !== "main") { return false; }
    const open = typeof GardenHome !== "undefined" && GardenHome.isOpen && GardenHome.isOpen();
    const cv = $(open ? "kb-home-canvas" : "kb-yard");
    if (!cv || !cv.getBoundingClientRect) { return true; }
    const r = cv.getBoundingClientRect();
    return r.width > 0 && r.bottom > 24 && r.top < (window.innerHeight || 0) - 24;
  }
  function seen(a, e, now) {
    if (!e.seen || !a.act || !watching()) { a.seenAt = 0; return; }
    if (!a.seenAt) { a.seenAt = now; }
    // cảnh Đứng yên chỉ vẽ lại mỗi ~30 giây: lần vẽ sau coi như đã nhìn đủ lâu
    const dt = Math.min(still() ? 2 : 0.25, (now - a.seenAt) / 1000); a.seenAt = now;
    a.seen += dt;
    const v = data();
    if (a.seen >= SEEN_S && v && told[a.act] !== v.today && H && H.send) {
      told[a.act] = v.today;
      H.send("life:seen:" + a.act + ":" + a.loc);
    }
  }
  // toạ độ cảnh / gian → có bấm trúng StackChan không
  function at(scene, ax, ay) {
    const b = lastBox;
    if (!b || !actor || (!still() && Date.now() - b.t > 500)) { return false; }      // cảnh Đứng yên chỉ vẽ lại mỗi ~30 giây
    if (b.scene !== scene && !(scene === "house" && isRoom(b.scene))) { return false; }
    const bx = scene === "house" ? b.x + HOUSE_X[b.scene] : b.x;
    return ax >= bx - 2 && ax <= bx + b.w + 2 && ay >= b.y - 2 && ay <= b.y + b.h + 2;
  }

  // ---------------------------------------------------------------------
  // Chip + thẻ
  // ---------------------------------------------------------------------
  function where() {             // {scene, id, name, here(mainScene)}
    const now = Date.now(), cur = current(now), v = data();
    if (!cur || !v) { return null; }
    const def = cur.id ? v.defs[cur.id] : null;
    return { scene: cur.scene, id: cur.id, def: def, name: def ? def.name : "Nghỉ ngơi", moving: !!actor && actor.phase !== "do" };
  }
  function viewScene() { return typeof GardenHome !== "undefined" && GardenHome.mainScene ? GardenHome.mainScene() : "yard"; }
  function isHere(w, view) { return w.scene === view || (view === "house" && isRoom(w.scene)); }
  function off() { return typeof GardenUI !== "undefined" && GardenUI.get && GardenUI.get("pets") === "off"; }
  function syncChip() {
    const chip = $("kb-life-chip");
    if (!chip) { return; }
    const w = off() ? null : where();
    chip.hidden = !w;
    if (!w) { return; }
    const view = viewScene(), here = isHere(w, view);
    const txt = here ? w.name : "ở " + (isRoom(w.scene) ? "trong nhà" : sceneName(w.scene));
    const lab = chip.querySelector(".kb-life-chip-t");
    if (lab && lab.textContent !== txt) { lab.textContent = txt; }
    const tt = "StackChan " + (here ? "đang: " + w.name : "đang " + (isRoom(w.scene) ? "ở trong nhà" : "ở " + sceneName(w.scene)) + " · " + w.name) + " (bấm để xem)";
    if (chip.title !== tt) { chip.title = tt; }
    chip.classList.toggle("is-away", !here);
    layoutChip(chip, view);
  }
  // 1.30.2: chip nằm ở hàng ngay dưới dải cảnh (cạnh ◂ cảnh ▸ và nút chụp ảnh), không còn đè lên cảnh → không phải dời chỗ
  // theo nhà / theo StackChan như 1.30 (is-up / is-mini). Hàng chật thì garden.js (fitLegendRow) ẩn chữ, chỉ còn hình.
  const CHIP_MAX = 180;          // khớp max-width của .kb-life-chip
  function layoutChip(chip) { chip.classList.remove("is-up", "is-mini"); }
  function closeCard() { const c = $("kb-life-card"); if (c) { c.hidden = true; } cardFor = ""; }
  function goBook() {
    closeCard();
    if (typeof GardenHome !== "undefined" && GardenHome.openLife) { GardenHome.openLife(); }
  }
  function showCard(px, py) {
    const w = where();
    if (!w) { return; }
    let c = $("kb-life-card");
    if (!c) {
      c = el("div", "kb-find-card kb-life-card"); c.id = "kb-life-card"; c.setAttribute("role", "status");
      c.addEventListener("click", (e) => e.stopPropagation());
      ($("kb-app") || document.body).appendChild(c);
    }
    c.textContent = "";
    const view = viewScene(), here = isHere(w, view);
    const top = c.appendChild(el("div", "kb-find-top"));
    top.appendChild(icon(w.id, 3, true));
    const t = top.appendChild(el("div", "kb-find-txt"));
    if (w.def) {
      const ja = t.appendChild(el("div", "kb-find-ja", w.def.ja)); ja.setAttribute("lang", "ja");
      const kv = t.appendChild(el("div", "kb-find-kana"));
      kv.appendChild(el("span", null, w.def.kana)).setAttribute("lang", "ja");
      kv.appendChild(document.createTextNode(" · " + w.def.vi));
    } else {
      const ja = t.appendChild(el("div", "kb-find-ja", "ひとやすみ")); ja.setAttribute("lang", "ja");
      t.appendChild(el("div", "kb-find-kana", "nghỉ một lát"));
    }
    const x = top.appendChild(el("button", "kb-pin-x", "✕")); x.type = "button"; x.setAttribute("aria-label", "Đóng");
    x.addEventListener("click", closeCard);
    const place0 = isRoom(w.scene) ? "trong nhà (" + sceneName(w.scene) + ")" : "ở " + sceneName(w.scene);
    c.appendChild(el("div", "kb-find-line", "StackChan đang " + place0 + ": " + w.name));
    const row = c.appendChild(el("div", "kb-life-btns"));
    const mk = (label, fn) => { const b = row.appendChild(el("button", "kb-btn kb-btn-small", label)); b.type = "button"; b.addEventListener("click", fn); return b; };
    if (!here) {
      mk("Đến xem ▸", () => { closeCard(); if (typeof GardenHome !== "undefined" && GardenHome.showMain) { GardenHome.showMain(isRoom(w.scene) ? "house" : w.scene); } });
      mk("Gọi về đây", () => { closeCard(); call(view); });
    }
    mk("Sổ sinh hoạt ▸", goBook);
    c.hidden = false; cardFor = w.id + "|" + w.scene;
    const M = 8, cw = c.offsetWidth, ch = c.offsetHeight;
    c.style.left = Math.max(M, Math.min(innerWidth - cw - M, (px === undefined ? innerWidth / 2 : px) + 12)) + "px";
    c.style.top = Math.max(M, Math.min(innerHeight - ch - M, (py === undefined ? innerHeight / 3 : py) - ch - 10)) + "px";
  }
  // gọi StackChan về cảnh đang xem: làm một việc hợp giờ ở đó (không có thì nghỉ ngơi) trong vài phút
  function call(scene) {
    if (!scene) { return; }
    invite = { scene: scene, until: Date.now() + INVITE_MS };
    sfx("boop");
    if (typeof GardenFX !== "undefined" && GardenFX.say) { GardenFX.say("今行くよ！ Tới ngay!", 1600); }
    syncChip();
  }
  function poke(ev) {            // bấm trúng StackChan trên cảnh
    if (actor) { actor.hop = 1; actor.fx.push({ k: "heart", t: Date.now(), dx: 0 }); }
    sfx("boop");
    showCard(ev ? ev.clientX : undefined, ev ? ev.clientY : undefined);
  }

  // ---------------------------------------------------------------------
  // Sổ Sinh hoạt (tab Album của bảng Nhà)
  // ---------------------------------------------------------------------
  function book(list) {
    const v = data();
    const top = list.appendChild(el("div", "kb-h-card kb-h-wear-top"));
    const ti = top.appendChild(el("div", "kb-h-info"));
    if (!v) { ti.appendChild(el("div", "kb-h-name", "Sinh hoạt")); return; }
    GardenIcons.fill(ti.appendChild(el("div", "kb-h-name")), "[i:book] Sinh hoạt · " + v.seen + "/" + v.total);
    ti.appendChild(el("div", "kb-h-desc", "StackChan tự làm việc theo giờ trong vườn, đồ đã đặt và vùng đã mở. Thấy việc nào thì việc đó vào sổ, kèm một câu tiếng Nhật."));
    const w = where();
    if (w) { ti.appendChild(el("div", "kb-h-own", "Bây giờ: " + w.name + " · " + (isRoom(w.scene) ? "trong nhà" : sceneName(w.scene)))); }
    (v.groups || []).forEach((g) => {
      const sec = list.appendChild(el("div", "kb-h-sec kb-box-sec" + (g.seen === g.total ? " is-done" : "")));
      sec.setAttribute("data-life-group", g.id);
      sec.appendChild(document.createTextNode(g.name + " · " + g.seen + " / " + g.total));
      if (!g.open) { sec.appendChild(el("span", "kb-box-lock", g.id === "home" ? " · xây nhà để vào" : " · mở vùng để xem")); }
      const grid = list.appendChild(el("div", "kb-box-grid kb-life-grid"));
      g.list.forEach((it) => {
        const c = grid.appendChild(el("div", "kb-box-cell kb-life-cell" + (it.seen ? " is-found" : "")));
        c.setAttribute("data-life", it.id);
        c.appendChild(icon(it.id, 2, it.seen));
        c.appendChild(el("div", "kb-life-name", it.name));
        if (it.seen) {
          const ja = c.appendChild(el("div", "kb-box-ja", it.ja)); ja.setAttribute("lang", "ja");
          const kn = c.appendChild(el("div", "kb-box-kana", it.kana)); kn.setAttribute("lang", "ja");
          const p = it.d.split("-");
          c.title = it.ja + " (" + it.kana + ") · " + it.vi + " · thấy lần đầu " + p[2] + "/" + p[1] + "/" + p[0] + (it.n > 1 ? " · " + it.n + " ngày" : "") + (it.hint ? " · " + it.hint : "");
        } else {
          c.appendChild(el("div", "kb-box-vi kb-life-hint", it.hint || "lúc nào cũng có"));
          c.title = "Chưa thấy · " + (it.hint || "");
        }
      });
    });
  }

  function init(helpers) {
    H = helpers;
    const chip = $("kb-life-chip");
    if (chip) {
      chip.addEventListener("mousedown", (e) => e.preventDefault());
      chip.addEventListener("click", (e) => {
        e.stopPropagation();
        const c = $("kb-life-card");
        if (c && !c.hidden) { closeCard(); return; }
        const r = chip.getBoundingClientRect();
        showCard(r.left, r.top);
      });
    }
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") { return; }
      const c = $("kb-life-card");
      if (c && !c.hidden) { e.preventDefault(); window.__kbEscUsed = true; closeCard(); }
    }, true);
    document.addEventListener("click", () => closeCard());
    setInterval(syncChip, 1000);
  }

  return {
    init: init,
    place: place,
    draw: draw,
    at: at,
    poke: poke,
    call: call,
    book: book,
    icon: icon,
    where: where,
    closeCard: closeCard,
    sync: syncChip,
    count: function () { const v = data(); return v ? v.seen : 0; },
    // đồ vừa được đặt / chuyển / cất: tìm lại chỗ đứng của việc đang làm (món có thể đã sang ô khác)
    rethink: function () { if (actor && actor.phase !== "new") { actor.phase = "seek"; actor.spec = null; } syncChip(); },
    isOpen: () => !!($("kb-life-card") && !$("kb-life-card").hidden),
    // cho test
    _force: function (id, scene) { forced = id === null ? null : { id: id || "", scene: scene, key: (id || "idle") + "|" + scene + "|f" }; if (actor) { actor.seen = 0; } },
    _snap: function () { if (actor && actor.phase === "walk") { actor.x = actor.tx; actor.y = actor.ty; } },
    _actor: () => (actor ? { loc: actor.loc, x: actor.x, y: actor.y, act: actor.act, phase: actor.phase, seen: actor.seen, dir: actor.dir, mode: actor.spec && actor.spec.mode, item: actor.spec && actor.spec.item } : null),
    _candidates: candidates, _current: () => current(Date.now()), _build: build, _box: () => lastBox,
    _invite: () => invite, _told: told
  };
})();
