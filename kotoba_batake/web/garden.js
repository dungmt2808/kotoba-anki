/* ことば畑 – vẽ khu vườn pixel. Python gọi Garden.render(data). */
var Garden = (function () {
  "use strict";

  var SCALE = 3;          // mỗi pixel nghệ thuật = 3–5 pixel màn hình (tự to lên khi cửa sổ lớn)
  var TW = 18, TH = 20;   // kích thước 1 ô (pixel nghệ thuật)

  var PAL = {
    k: "#1b1b2f", g: "#3ccb5e", G: "#2e8b3a", b: "#8a4a22",
    y: "#ffd23f", p: "#ff7fa0", r: "#ff4f6d", w: "#ffffff", d: "#3d8bff"
  };
  var DRY = {
    k: "#3a2f2a", g: "#b7a86a", G: "#8a7a45", b: "#7a5a3a",
    y: "#c8b77a", p: "#b59a8e", r: "#9b6e5c", w: "#ffffff", d: "#3d8bff"
  };

  var E = "................";
  var STEM = ".......kbk......";
  var SPRITES = [
    // 0 Hạt giống
    [E, E, E, E, E, E, E, E, E, E, E, E,
     "......kkkk......",
     ".....kbbbbk.....",
     ".....kbbbbk.....",
     "......kkkk......"],
    // 1 Mầm
    [E, E, E, E, E, E, E, E,
     "...kk.....kk....",
     "..kggk...kggk...",
     "..kgggk.kgggk...",
     "...kkgGkGgkk....",
     ".......kGk......",
     ".......kGk......",
     ".......kGk......",
     ".......kGk......"],
    // 2 Cây non
    [E, E, E,
     "......kkkk......",
     ".....kggggk.....",
     "....kgggggGk....",
     "...kgggggGGGk...",
     "...kggggGGGGk...",
     "....kgggGGGk....",
     ".....kkGGkk.....",
     STEM, STEM, STEM, STEM, STEM, STEM],
    // 3 Ra hoa
    [E,
     "....kk....kk....",
     "...kppk..kppk...",
     "...kpypkkpypk...",
     "....kpkggkpk....",
     "....kggggggk....",
     "...kgggggGGGk...",
     "...kggggGGGGk...",
     "....kgggGGGk....",
     ".....kkGGkk.....",
     STEM, STEM, STEM, STEM, STEM, STEM],
    // 4 Ra quả
    [".....kkkkkk.....",
     "....kggggggk....",
     "...kggrgggggk...",
     "..kggrrggggGGk..",
     "..kgggggrgGGGk..",
     "..kggggrrGGGGk..",
     "...kggggGGrGk...",
     "....kgGGGGGk....",
     ".....kkkkkk.....",
     STEM, STEM, STEM, STEM, STEM, STEM, STEM]
  ];
  var DROP = ["..k..", ".kdk.", "kdddk", "kdwdk", ".kkk."];

  var data = null;
  var cols = 1;
  function fx(name) {
    if (typeof GardenFX === "undefined" || !GardenFX[name]) { return; }
    try { GardenFX[name].apply(null, Array.prototype.slice.call(arguments, 1)); } catch (e) { /* hiệu ứng lỗi không làm hỏng việc ôn */ }
  }
  var $ = function (id) { return document.getElementById(id); };

  // Trong Anki, pycmd chỉ được tạo sau khi kênh QWebChannel kết nối xong,
  // muộn hơn DOMContentLoaded. Chờ tới khi có pycmd rồi mới gửi.
  function send(cmd, tries) {
    tries = tries || 0;
    if (typeof pycmd === "function") {
      pycmd(cmd);
    } else if (tries < 100) {
      setTimeout(function () { send(cmd, tries + 1); }, 50);
    }
  }

  function hash(n) {
    n = (n ^ 61) ^ (n >>> 16);
    n = n + (n << 3);
    n = n ^ (n >>> 4);
    n = Math.imul(n, 0x27d4eb2d);
    return (n ^ (n >>> 15)) >>> 0;
  }

  function px(ctx, x, y, w, h, color, s) {
    ctx.fillStyle = color;
    ctx.fillRect(x * s, y * s, w * s, h * s);
  }

  function drawSprite(ctx, rows, ox, oy, s, pal) {
    for (var j = 0; j < rows.length; j++) {
      var row = rows[j];
      for (var i = 0; i < row.length; i++) {
        var c = row.charAt(i);
        if (c !== ".") { px(ctx, ox + i, oy + j, 1, 1, pal[c], s); }
      }
    }
  }

  function season() { return typeof GardenSeason !== "undefined" && GardenSeason ? GardenSeason : null; }

  function drawGrass(ctx, ox, oy, seed, s) {
    var f = season() ? season().field() : null;   // giao diện theo mùa: cỏ tuyết / cỏ thu, hoa – lá rơi trên cỏ
    px(ctx, ox, oy, TW, TH, f ? f.base : "#5ed35e", s);
    var h = hash(seed);
    for (var t = 0; t < 3; t++) {
      var gx = ox + ((h >>> (t * 5)) % (TW - 2)) + 1;
      var gy = oy + ((h >>> (t * 7 + 3)) % 10) + 1;
      px(ctx, gx, gy, 1, 1, f ? f.speck : "#45bf4a", s);
      px(ctx, gx + 1, gy - 1, 1, 1, f ? f.speck : "#45bf4a", s);
    }
    if (f && f.dots && f.dots.length) {
      var h2 = hash(seed * 7 + 3);
      var n = (h2 % 1000) / 1000 < f.dens ? 1 + ((h2 >>> 10) % 2) : 0;
      for (var d = 0; d < n; d++) {
        var dx = ox + 1 + ((h2 >>> (12 + d * 5)) % (TW - 2)), dy = oy + 1 + ((h2 >>> (16 + d * 4)) % 11);
        px(ctx, dx, dy, 1, 1, f.dots[(h2 >>> (22 + d * 3)) % f.dots.length], s);
      }
    }
  }

  function drawSoil(ctx, ox, oy, seed, dry, s) {
    var base = dry ? "#c9a27a" : "#a0603a";
    var top = dry ? "#dcbb91" : "#c57a45";
    var dark = dry ? "#a07a52" : "#7a4220";
    px(ctx, ox + 1, oy + 13, TW - 2, 7, base, s);
    px(ctx, ox + 1, oy + 13, TW - 2, 1, top, s);
    px(ctx, ox, oy + 14, 1, 5, dark, s);
    px(ctx, ox + TW - 1, oy + 14, 1, 5, dark, s);
    var h = hash(seed + 7);
    for (var t = 0; t < 4; t++) {
      var sx = ox + 2 + ((h >>> (t * 4)) % (TW - 4));
      var sy = oy + 15 + ((h >>> (t * 6 + 2)) % 4);
      px(ctx, sx, sy, 1, 1, dark, s);
    }
    if (dry) {
      px(ctx, ox + 5, oy + 16, 2, 1, dark, s);
      px(ctx, ox + 7, oy + 17, 1, 1, dark, s);
      px(ctx, ox + 11, oy + 15, 1, 2, dark, s);
    }
  }

  // 1.14: hình của cây theo giống (Python gán plant.v), không có thì cây gốc
  function plantArt(plant) {
    var rows = plant && plant.v && typeof GardenSeeds !== "undefined" ? GardenSeeds.rows(plant.v, plant.stage) : null;
    if (rows) { return { rows: rows, pal: GardenSeeds.pal(plant.wilted, plant.v) }; }
    return { rows: SPRITES[(plant && plant.stage) || 0], pal: plant && plant.wilted ? DRY : PAL };
  }

  function drawTile(ctx, plant, i) {
    var ox = (i % cols) * TW;
    var oy = Math.floor(i / cols) * TH;
    drawGrass(ctx, ox, oy, plant.nid, SCALE);
    drawSoil(ctx, ox, oy, plant.nid, plant.wilted, SCALE);
    var art = plantArt(plant);
    drawSprite(ctx, art.rows, ox + 1, oy + 4, SCALE, art.pal);
    // 1.18: giọt nước = tưới được ngay (Anki có thẻ cho ôn). Cây héo mà Anki chưa cho ôn thì chỉ héo, không có giọt.
    if (plant.thirsty) {
      drawSprite(ctx, DROP, ox + TW - 6, oy + 1, SCALE, PAL);
    }
  }

  // Bố cục ruộng: chọn cỡ ô theo cửa sổ (to hơn khi phóng to màn hình, nhỏ lại nếu nhiều cây quá)
  // và trải cỏ kín phần dưới. Chỉ đo lại khi không mở bảng nào, để lúc đang ôn trang không nhảy.
  var fieldLayout = null;
  function panelsOpen() {
    return !$("kb-panel").hidden || !$("kb-game").hidden || !$("kb-home").hidden || !$("kb-paper").hidden ||
      ($("kb-fields") && !$("kb-fields").hidden) || ($("kb-ui") && !$("kb-ui").hidden);
  }
  function measureField(field, n) {
    var width = Math.max(field.clientWidth, 300);
    var top = field.getBoundingClientRect().top + (window.scrollY || 0);
    var avail = window.innerHeight - top - 26;           // chỗ còn lại tới đáy cửa sổ
    var maxS = window.innerHeight < 860 ? 3 : Math.max(3, Math.min(5, Math.floor(width / 420)));
    var s = 3;
    for (var t = maxS; t >= 3; t--) {
      var c = Math.max(4, Math.floor(width / (TW * t)));
      if (t === 3 || Math.ceil(n / c) * TH * t <= Math.max(avail, TH * t * 3)) { s = t; break; }
    }
    var fill = Math.floor(Math.max(0, avail) / (TH * s));
    return { width: width, height: window.innerHeight, top: Math.round(top), n: n, scale: s, fill: fill };
  }

  function drawField() {
    var field = $("kb-field");
    var canvas = $("kb-canvas");
    var plants = (data && data.plants) || [];
    var stale = !fieldLayout || fieldLayout.width !== field.clientWidth || fieldLayout.height !== window.innerHeight ||
      fieldLayout.n !== plants.length ||
      fieldLayout.top !== Math.round(field.getBoundingClientRect().top + (window.scrollY || 0));
    if (!fieldLayout || (stale && !panelsOpen())) { fieldLayout = measureField(field, plants.length); }
    SCALE = fieldLayout.scale;
    var width = Math.max(field.clientWidth, TW * SCALE * 4);
    cols = Math.max(4, Math.floor(width / (TW * SCALE)));
    var rows = Math.max(3, Math.ceil(plants.length / cols), Math.min(fieldLayout.fill, 40));
    canvas.width = cols * TW * SCALE;
    canvas.height = rows * TH * SCALE;
    var ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    // nền cỏ cho cả ruộng (kể cả ô trống)
    for (var e = 0; e < cols * rows; e++) {
      drawGrass(ctx, (e % cols) * TW, Math.floor(e / cols) * TH, e + 1000, SCALE);
    }
    for (var i = 0; i < plants.length; i++) { drawTile(ctx, plants[i], i); }
    $("kb-hover").hidden = true;
    $("kb-tip").hidden = true;
  }

  function drawLegend() {
    var box = $("kb-legend");
    box.textContent = "";
    var names = data.stage_names || [];
    var counts = (data.stats && data.stats.stages) || [];
    // 1.14: phần lớn ruộng cùng một giống → chú thích vẽ theo giống đó
    var vc = {}, top = null, plants = data.plants || [];
    plants.forEach(function (p) { if (p.v) { vc[p.v] = (vc[p.v] || 0) + 1; if (!top || vc[p.v] > vc[top]) { top = p.v; } } });
    var legendV = top && vc[top] >= plants.length * 0.6 ? top : null;
    for (var st = 0; st < names.length; st++) {
      var item = document.createElement("div");
      item.className = "kb-legend-item";
      var c = document.createElement("canvas");
      c.width = 16 * 2; c.height = 16 * 2;
      var ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      var lart = plantArt({ v: legendV, stage: st });
      drawSprite(ctx, lart.rows, 0, 0, 2, lart.pal);
      var label = document.createElement("span");
      label.textContent = names[st];
      var count = document.createElement("span");
      count.className = "kb-legend-count";
      count.textContent = String(counts[st] || 0);
      item.appendChild(c); item.appendChild(label); item.appendChild(count);
      box.appendChild(item);
    }
  }

  function drawHeader() {
    var sel = $("kb-deck");
    sel.textContent = "";
    (data.decks || []).forEach(function (d) {
      var o = document.createElement("option");
      o.value = String(d.id);
      o.textContent = d.name;
      if (d.id === data.deck.id) { o.selected = true; }
      sel.appendChild(o);
    });
    var wallet = data.wallet || { coins: 0 };
    $("kb-coins").textContent = wallet.coins + " xu";
    // 1.18: số trên nút = số cây tưới được ngay (Anki còn thẻ cho ôn), không phải mọi cây trông khát / héo
    var st0 = data.stats || {};
    var thirsty = typeof st0.water_now === "number" ? st0.water_now : (st0.thirsty || 0);
    var chip = $("kb-thirsty");
    chip.textContent = thirsty + " cây khát";
    chip.className = "kb-chip" + (thirsty ? " kb-has-thirsty" : "");
    // 1.15: số cây khát nằm luôn trên nút "Tưới ngay" (bớt một ô trên thanh trên)
    var rn = $("kb-review-n");
    if (rn) { rn.hidden = !thirsty; rn.textContent = thirsty > 99 ? "99+" : String(thirsty); }
    var heldN = heldTotal(st0.held);
    $("kb-review").title = "Ôn thẻ ngay trong vườn (phím R)" + (thirsty ? " · " + thirsty + " cây đang khát" : " · chưa cây nào khát") +
      (heldN ? " · " + heldN + " cây chưa tưới được lúc này" : "");
    var note = $("kb-note");
    var st = data.stats;
    if (!st.total_notes) {
      note.textContent = "Deck này chưa có thẻ nào để gieo.";
    } else if (st.shown < st.total_notes) {
      note.textContent = "Đang hiện " + st.shown + "/" + st.total_notes + " từ (ưu tiên từ đã học).";
      note.title = "Muốn hiện thêm: tăng max_plants ở Tools → Add-ons → ことば畑 → Config.";
    } else {
      note.textContent = "";
    }
  }

  function stateText(p) {
    if (p.held === "filtered") { return (p.wilted ? "Đang héo" : "Đang khát") + ": thẻ đang ở deck lọc"; }
    if (p.held === "buried") { return (p.wilted ? "Đang héo" : "Đang khát") + ": Anki hoãn thẻ tới mai"; }
    if (p.held === "notdue") { return "Đang héo: sắp quên nhưng Anki chưa hẹn ôn"; }
    if (p.held === "later") { return "Đang học: chờ tới lượt"; }
    if (p.wilted) { return "Đang héo: lâu chưa ôn"; }
    if (p.thirsty) { return "Đang khát: tới hạn ôn"; }
    return p.stage === 0 ? "" : "Tươi tốt";
  }

  function clock(secs) {
    var d = new Date(secs * 1000);
    return d.getHours() + ":" + (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
  }

  function heldTotal(h) {
    var n = 0;
    if (h) { for (var k in h) { if (Object.prototype.hasOwnProperty.call(h, k)) { n += h[k] || 0; } } }
    return n;
  }

  function dueText(p) {
    if (p.held === "buried") { return "Ôn lại từ ngày mai"; }
    if (p.held === "later" && p.later_at) { return "Tới lượt lúc " + clock(p.later_at); }
    if (p.due_in === null || p.due_in === undefined) { return p.stage === 0 ? "Chưa học" : ""; }
    if (p.due_in < 0) { return "Quá hạn " + (-p.due_in) + " ngày"; }
    if (p.due_in === 0) { return "Tới hạn hôm nay"; }
    return "Ôn lại sau " + p.due_in + " ngày";
  }

  function plantAt(ev) {
    if (!data || !data.plants) { return -1; }
    var rect = $("kb-canvas").getBoundingClientRect();
    var cw = TW * SCALE, ch = TH * SCALE;
    var col = Math.floor((ev.clientX - rect.left) / cw), row = Math.floor((ev.clientY - rect.top) / ch);
    var idx = row * cols + col;
    if (col < 0 || col >= cols || idx < 0 || idx >= data.plants.length) { return -1; }
    return idx;
  }

  // Bấm vào cây: ghim thẻ thông tin (chữ, cách đọc, nghĩa, lịch ôn) + nút nghe.
  var pinned = null;
  function showPin(idx) {
    var p = data.plants[idx], pin = $("kb-pin");
    pinned = p;
    $("kb-pin-word").textContent = p.word;
    $("kb-pin-reading").textContent = p.reading || p.usage || "";
    $("kb-pin-meaning").textContent = (p.hanviet ? String(p.hanviet).toUpperCase() + " · " : "") + (p.meaning || "");
    var meta = [data.stage_names[p.stage], stateText(p), dueText(p)];
    if (p.stability !== null && p.stability !== undefined) { meta.push("nhớ ~" + p.stability + " ngày"); }
    $("kb-pin-meta").textContent = meta.filter(Boolean).join(" · ");
    $("kb-pin-play").hidden = !(p.audio || (p.kind === "grammar" && p.ex_audio));
    $("kb-pin-play").textContent = p.audio ? "♪ Nghe" : "♪ Nghe ví dụ";
    pin.hidden = false;
    $("kb-tip").hidden = true;
    var cw = TW * SCALE, ch = TH * SCALE, field = $("kb-field");
    var col = idx % cols, row = Math.floor(idx / cols);
    var left = (col + 1) * cw + 6;
    if (left + pin.offsetWidth > field.clientWidth) { left = col * cw - pin.offsetWidth - 6; }
    pin.style.left = Math.max(4, left) + "px";
    pin.style.top = Math.max(4, Math.min(row * ch, field.clientHeight - pin.offsetHeight - 4)) + "px";
    if (p.audio) { send("game:audio:" + p.nid); }
  }
  function hidePin() { pinned = null; $("kb-pin").hidden = true; }
  function showPinSilently(idx) {
    var p = data.plants[idx];
    var had = p.audio;
    p.audio = false; showPin(idx); p.audio = had;
    $("kb-pin-play").hidden = !(had || (p.kind === "grammar" && p.ex_audio));
    $("kb-pin-play").textContent = had ? "♪ Nghe" : "♪ Nghe ví dụ";
  }

  // Phím tắt ở màn chính: R ôn, T trò chơi, N nhà, B báo, ← → đổi cảnh ngoài trời, Esc đóng thẻ thông tin.
  function mainKey(e) {
    if (!$("kb-panel").hidden) { return; }
    if (typeof GardenGames !== "undefined" && GardenGames.isOpen()) { return; }
    if (typeof GardenHome !== "undefined" && GardenHome.isOpen()) { return; }
    if (typeof GardenPaper !== "undefined" && GardenPaper.isOpen()) {
      // phím B bấm lần nữa thì đóng bảng báo (trừ khi đang gõ chữ)
      var tg = (e.target && e.target.tagName) || "";
      if ((e.key === "b" || e.key === "B") && tg !== "INPUT" && tg !== "SELECT" && tg !== "TEXTAREA" && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        GardenPaper.close();
      }
      return;
    }
    if (typeof GardenFields !== "undefined" && GardenFields.isOpen()) { return; }
    if (typeof GardenUI !== "undefined" && GardenUI.isOpen()) { return; }
    if (cal() && cal().isOpen()) { return; }        // 1.20: Lịch hoa tự xử lý phím (Esc, L)
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA" || e.ctrlKey || e.metaKey || e.altKey) { return; }
    var k = (e.key || "").toLowerCase();
    if (k === "escape" && pinned) { e.preventDefault(); hidePin(); }
    else if (k === "r") { e.preventDefault(); $("kb-review").click(); }
    else if (k === "t") { e.preventDefault(); $("kb-games").click(); }
    else if (k === "n") { e.preventDefault(); $("kb-house").click(); }
    else if (k === "b") { e.preventDefault(); openPaper(true); }
    else if (k === "l") { e.preventDefault(); openCal({}); }
    else if (k === "/") { e.preventDefault(); openDeckFind(); }
    else if ((k === "arrowleft" || k === "arrowright") && typeof GardenHome !== "undefined" && GardenHome.cycleMain) {
      if (GardenHome.cycleMain(k === "arrowleft" ? -1 : 1)) { e.preventDefault(); }
    }
    else if (k === "q" && !$("kb-quest").hidden) { e.preventDefault(); toggleQuests(); }
    else if (k === "escape" && !$("kb-quest-pop").hidden) { e.preventDefault(); toggleQuests(false); }
  }

  // ---- Báo 畑新聞 & chép chính tả ----
  function drawPaperChip() {
    var b = $("kb-paper-btn"), s = data && data.paper;
    if (!b) { return; }
    if (!s) { b.hidden = true; return; }
    // 1.25.1: không có gì để chép (chỉ báo tiếng Việt, deck không có câu / audio) → không ghi "Chép 0/5"
    var canDict = s.dict_ok !== false;
    if (!canDict && !s.enabled && !s.ai_busy) { b.hidden = true; return; }
    b.hidden = false;
    var dict = canDict ? "Chép " + s.dict_done + "/" + s.dict_total : "";
    var sep = dict ? " · " : "";
    if (s.ai_busy && !(s.enabled && s.unread > 0)) {          // 1.12: Gemini đang viết số hôm nay
      b.textContent = "Báo: Gemini đang viết…" + sep + dict + " ▸";
      b.className = "kb-quest-btn kb-paper-btn kb-paper-busy";
    } else if (s.enabled && s.unread > 0) {
      b.textContent = "Báo mới " + s.unread + sep + dict + " ▸";
      b.className = "kb-quest-btn kb-paper-btn kb-paper-new";
    } else {
      b.textContent = (s.enabled ? "Báo" + sep : "") + dict + " ▸";
      b.className = "kb-quest-btn kb-paper-btn" + (s.dict_total && s.dict_done >= s.dict_total ? " kb-quest-all" : "");
    }
  }
  function ui() { return typeof GardenUI !== "undefined" ? GardenUI : null; }
  function cal() { return typeof GardenCal !== "undefined" ? GardenCal : null; }
  function closeOthersForUI() {
    closePanel(true);
    if (cal()) { cal().close(); }
    if (typeof GardenGames !== "undefined") { GardenGames.close(); }
    if (typeof GardenHome !== "undefined") { GardenHome.close(); }
    if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
    if (typeof GardenFields !== "undefined") { GardenFields.close(); }
    toggleQuests(false);
    hidePin();
  }
  function closeOthersForPaper() {
    if (ui()) { ui().close(); }
    if (cal()) { cal().close(); }
    closePanel(true);
    if (typeof GardenGames !== "undefined") { GardenGames.close(); }
    if (typeof GardenHome !== "undefined") { GardenHome.close(); }
    if (typeof GardenFields !== "undefined") { GardenFields.close(); }
    hidePin();
  }

  // ---- 1.9: Cấu hình trường theo loại note ----
  var fieldsWarned = {};
  function drawFieldsChip() {
    var b = $("kb-fields-btn");
    if (!b) { return; }
    var pend = ((data && data.note_types) || []).filter(function (t) { return !t.configured; });
    b.hidden = !pend.length;
    if (!pend.length) { return; }
    GardenIcons.fill(b, "[i:warn] Cấu hình trường" + (pend.length > 1 ? " (" + pend.length + ")" : "") + " ▸");
    b.title = "Loại note chưa cấu hình trường: " + pend.map(function (t) { return t.name + (t.problem ? " (" + t.problem + ")" : ""); }).join(", ") +
      ". Trò chơi và thẻ thông tin đang dùng trường tự đoán.";
    b.setAttribute("data-mid", pend[0].id);
    // 1.15: mỗi loại note chỉ nhắc bằng thông báo nổi MỘT lần trên máy này; sau đó chỉ còn dòng ⚠ trong thẻ Hôm nay
    var seenKey = function (t) { return "kb-fields-warned-" + t.id; };
    var fresh = pend.filter(function (t) {
      if (fieldsWarned[t.id]) { return false; }
      try { if (typeof GardenPrefs !== "undefined" ? GardenPrefs.get(seenKey(t)) : localStorage.getItem(seenKey(t))) { fieldsWarned[t.id] = true; return false; } } catch (e) { /* bỏ qua */ }
      return true;
    });
    if (fresh.length) {
      fresh.forEach(function (t) { fieldsWarned[t.id] = true; try { if (typeof GardenPrefs !== "undefined") { GardenPrefs.set(seenKey(t), "1"); } else { localStorage.setItem(seenKey(t), "1"); } } catch (e) { /* bỏ qua */ } });
      toast((fresh.length === 1 ? "Có loại note “" + fresh[0].name + "” chưa cấu hình trường."
        : "Có " + fresh.length + " loại note chưa cấu hình trường.") + " Bấm vào đây để cấu hình ▸",
      function () { openFields(fresh[0].id); }, 7000);
    }
  }
  function openFields(mid, origin) {
    if (typeof GardenFields === "undefined") { return; }
    GardenFields.open(mid, origin);
  }
  function closeOthersForFields() {
    if (ui()) { ui().close(); }
    if (cal()) { cal().close(); }
    closePanel(true);
    if (typeof GardenGames !== "undefined") { GardenGames.close(); }
    if (typeof GardenHome !== "undefined") { GardenHome.close(); }
    if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
    toggleQuests(false);
    hidePin();
  }
  // ---- 1.20: 花暦 · Lịch hoa ----
  function closeOthersForCal() {
    if (ui()) { ui().close(); }
    closePanel(true);
    if (typeof GardenGames !== "undefined") { GardenGames.close(); }
    if (typeof GardenHome !== "undefined") { GardenHome.close(); }
    if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
    if (typeof GardenFields !== "undefined") { GardenFields.close(); }
    toggleQuests(false);
    hidePin();
  }
  // opts: {tab, date, book}; không có gì = mở tháng này ở hôm nay
  function openCal(opts) {
    if (!cal()) { return; }
    hideLinkToast();
    if (cal().isOpen() && !(opts && (opts.date || opts.tab))) { cal().close(); return; }
    cal().open(opts || {});
  }
  function drawJournal() {
    var j = data && data.journal;
    var ask = $("kb-cal-ask"), wr = $("kb-cal-write");
    if (!ask || !wr) { return; }
    ask.hidden = !j || !!j.asked;
    if (!j || !j.w) { wr.hidden = true; return; }
    wr.hidden = false;
    wr.setAttribute("data-d", j.w.d);
    var t = j.w.st === "done" ? "Luyện viết: Gemini đã sửa (" + (j.w.n ? j.w.n + " lỗi" : "không có lỗi") + ") · xem ▸"
      : j.w.st === "wait" ? "Luyện viết: Gemini đang sửa…" : "Luyện viết: chờ lượt Gemini ▸";
    GardenIcons.fill(wr, "[i:pencil] " + t);
    wr.className = "kb-quest-btn kb-cal-write-btn" + (j.w.st === "done" ? " is-new" : j.w.st === "wait" ? " is-busy" : "");
  }
  var photoAsked = false;
  function maybePhoto() {
    var j = data && data.journal;
    if (!j || !j.photo_due || photoAsked || typeof GardenHome === "undefined" || !GardenHome.snapshot) { return; }
    photoAsked = true;
    setTimeout(function () {       // đợi cảnh vẽ xong (thời tiết, đồ đạc) rồi mới chụp
      try {
        var url = GardenHome.snapshot();
        if (url && url.length < 500000) { send("cal:photo:" + url); }
      } catch (e) { /* không chụp được thì thôi, bìa dùng ảnh xem trước của giao diện mùa */ }
    }, 6000);
  }

  // toggle = phím B (bấm lần nữa thì đóng). Chip / hòm thư thì luôn mở: tab Báo nếu đã nối báo,
  // chưa nối thì tab Chép chính tả.
  function openPaper(toggle) {
    if (typeof GardenPaper === "undefined") { return; }
    hideLinkToast();
    if (toggle && GardenPaper.isOpen()) { GardenPaper.close(); return; }
    GardenPaper.open();
  }

  // ---- Nhiệm vụ hằng ngày ----
  // 1.25.8: nhiệm vụ đổi ngoài lần làm mới cả vườn (trò chơi, báo, chép chính tả…) → cập nhật luôn huy hiệu
  // "Xong 3 nhiệm vụ" + đèn trời (data.joy chỉ tính lại khi làm mới — trước đây phải đổi deck mới hiện)
  function questsUpdated(q) {
    if (q && q.view && data) {
      data.quests = q.view;
      drawQuests();
      var lst = q.view.list || [], all = lst.length > 0 && lst.every(function (x) { return x.done; });
      if (data.joy && !!data.joy.quests !== all) {
        data.joy = Object.assign({}, data.joy, { quests: all });
        if (typeof GardenJoy !== "undefined") { GardenJoy.render(data.joy); }
      }
    }
    fx("quests", q);
  }
  // ---- Nhiệm vụ hằng ngày ----
  function drawQuests() {
    var q = data && data.quests, btn = $("kb-quest");
    if (!btn) { return; }
    if (!q || !q.list || !q.list.length) { btn.hidden = true; return; }
    var done = q.list.filter(function (x) { return x.done; }).length;
    btn.hidden = false;
    btn.textContent = "Nhiệm vụ " + done + "/" + q.list.length + (q.chest ? " ✓" : " ▸");
    btn.className = "kb-quest-btn" + (q.chest ? " kb-quest-all" : "");
    var list = $("kb-quest-list");
    list.textContent = "";
    q.list.forEach(function (x) {
      var li = document.createElement("li");
      li.className = x.done ? "is-done" : "";
      var t = document.createElement("div"); t.className = "kb-quest-text"; t.textContent = (x.done ? "✓ " : "") + x.text;
      var row = document.createElement("div"); row.className = "kb-quest-row";
      var bar = document.createElement("div"); bar.className = "kb-today-bar";
      var f = document.createElement("div"); f.className = "kb-today-fill"; f.style.width = Math.round(x.progress / x.target * 100) + "%";
      bar.appendChild(f);
      var n = document.createElement("span"); n.className = "kb-quest-n"; n.textContent = x.progress + "/" + x.target + " · +" + x.reward + " xu";
      row.appendChild(bar); row.appendChild(n);
      li.appendChild(t); li.appendChild(row);
      list.appendChild(li);
    });
    var chest = $("kb-quest-chest");
    chest.textContent = "";
    var icon = null;
    var label = document.createElement("div");
    if (q.chest) {
      label.textContent = "Đã mở rương hôm nay" + (q.chest_item ? ": nhận " + nameOf(q.chest_item) + " (+" + q.chest_coins + " xu). Đặt nó ở Nhà → Kho đồ." : ".");
      if (q.chest_item && typeof GardenHome !== "undefined") { icon = GardenHome.icon(q.chest_item, 40); }
    } else {
      label.textContent = "Xong cả " + q.list.length + " nhiệm vụ: mở rương quà +" + q.chest_coins + " xu" +
        (q.next_rare ? " và đồ hiếm “" + q.next_rare.name + "”" : "") + ".";
      if (q.next_rare && typeof GardenHome !== "undefined") { icon = GardenHome.icon(q.next_rare.id, 40); }
    }
    if (icon) { chest.appendChild(icon); }
    chest.appendChild(label);
    chest.className = "kb-quest-chest" + (q.chest ? " is-open" : "");
  }
  function nameOf(id) {
    var c = data && data.catalog;
    if (!c) { return id; }
    for (var i = 0; i < c.items.length; i++) { if (c.items[i].id === id) { return c.items[i].name; } }
    return id;
  }
  function toggleQuests(show) {
    var pop = $("kb-quest-pop"), btn = $("kb-quest");
    if (show === undefined) { show = pop.hidden; }
    if (!show) { pop.hidden = true; return; }
    drawQuests();
    pop.hidden = false;
    var anchor = $("kb-today") && $("kb-today").offsetParent ? $("kb-today") : btn;     // 1.15: mở dưới cả thẻ Hôm nay, không che các dòng khác
    var r = anchor.getBoundingClientRect(), app = $("kb-app").getBoundingClientRect();
    pop.style.top = (r.bottom - app.top + 6) + "px";
    pop.style.left = Math.max(8, Math.min(app.width - pop.offsetWidth - 8, r.right - app.left - pop.offsetWidth)) + "px";
  }

  function drawToday() {
    var t = data && data.today, box = $("kb-today");
    if (!t || !box) { return; }
    box.hidden = false;
    var goal = t.goal || 0;
    var txt = "Hôm nay " + t.reviews + (goal ? "/" + goal : "") + " lượt";
    if (goal && t.claimed) { txt += " ✓"; }
    var tt = $("kb-today-text");
    tt.textContent = txt;
    // 1.20: bấm "· N ngày liền" (chuỗi) để mở Lịch hoa
    var sk = document.createElement("span");
    sk.className = "kb-today-streak";
    sk.textContent = t.streak ? " · " + t.streak + " ngày liền" : " · Lịch hoa";
    sk.setAttribute("data-t1", sk.textContent);
    sk.setAttribute("data-t2", t.streak ? t.streak + " ngày liền" : "Lịch hoa");
    sk.title = "Mở Lịch hoa (phím L)";
    sk.setAttribute("role", "button");
    sk.addEventListener("click", function (e) { e.stopPropagation(); openCal({}); });
    tt.appendChild(sk);
    box.querySelector(".kb-today-main").title = "Số lượt ôn hôm nay (tính cả ôn ở màn ôn của Anki)" +
      (goal ? (t.claimed ? ". Đã nhận thưởng +" + t.bonus + " xu hôm nay." : ". Đạt " + goal + " lượt được thưởng +" + t.bonus + " xu.") : "") +
      (t.streak ? " Chuỗi " + t.streak + " ngày ôn liên tiếp." : "") +
      (t.freeze ? " Vé giữ chuỗi: " + t.freeze.n + "/" + t.freeze.max + " (mua ở Lịch hoa)." : "");
    $("kb-today-fill").style.width = (goal ? Math.min(100, Math.round(t.reviews / goal * 100)) : 100) + "%";
    box.className = "kb-today" + (goal && t.reviews >= goal ? " kb-today-done" : "");
    fitToday();
  }
  // chuỗi ngày dài ("Hôm nay 30/30 lượt ✓ · 120 ngày liền") không vừa một dòng: đưa "N ngày liền" xuống dòng thay vì cắt "…"
  var fitPending = false;
  function fitToday() {
    var tt = $("kb-today-text"), sk = tt && tt.querySelector(".kb-today-streak");
    if (!sk) { return; }
    if (!tt.clientWidth) { fitPending = true; return; }      // sân đang ẩn (Nhà / Trò chơi / Báo mở): đo khi hiện lại
    fitPending = false;
    tt.classList.remove("kb-today-2l"); sk.textContent = sk.getAttribute("data-t1");
    if (tt.clientWidth && tt.scrollWidth > tt.clientWidth + 1) { tt.classList.add("kb-today-2l"); sk.textContent = sk.getAttribute("data-t2"); }
    fitTodayList();
  }
  // 1.22.6: sân thấp (1366 × 768) mà thẻ có 4 dòng việc (nhiệm vụ, báo, nhật ký, cấu hình trường — đúng lúc mới cài)
  // → dòng cuối bị cắt nửa + thanh cuộn. Các dòng việc không vừa thì xếp sát lại (bỏ đệm trên dưới) trước khi phải cuộn.
  function fitTodayList() {
    var list = document.querySelector("#kb-today .kb-today-list");
    if (!list || !list.clientHeight) { return; }
    var tight = list.classList.contains("kb-today-tight");
    if (!tight && list.scrollHeight > list.clientHeight + 1) { list.classList.add("kb-today-tight"); }
    else if (tight) {
      list.classList.remove("kb-today-tight");
      if (list.scrollHeight > list.clientHeight + 1) { list.classList.add("kb-today-tight"); }
    }
  }

  function onMove(ev) {
    if (!data || !data.plants) { return; }
    var canvas = $("kb-canvas");
    var rect = canvas.getBoundingClientRect();
    var x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    var cw = TW * SCALE, ch = TH * SCALE;
    var col = Math.floor(x / cw), row = Math.floor(y / ch);
    var idx = row * cols + col;
    var hover = $("kb-hover"), tip = $("kb-tip");
    if (col < 0 || col >= cols || idx < 0 || idx >= data.plants.length) {
      hover.hidden = true; tip.hidden = true; return;
    }
    var p = data.plants[idx];
    if (pinned) { tip.hidden = true; }
    hover.style.left = (col * cw) + "px";
    hover.style.top = (row * ch) + "px";
    hover.style.width = cw + "px";
    hover.style.height = ch + "px";
    hover.hidden = false;
    // 1.17: phiên âm IPA của từ tiếng Anh viết liền sau chữ, không bọc ngoặc Nhật
    $("kb-tip-word").textContent = p.word + (!p.reading ? "" : (p.lang && p.lang !== "ja") ? " " + p.reading : "（" + p.reading + "）");
    $("kb-tip-meaning").textContent = (p.hanviet ? String(p.hanviet).toUpperCase() + " · " : "") + (p.meaning || "");
    var parts = [data.stage_names[p.stage], stateText(p), dueText(p)];
    if (p.stability !== null && p.stability !== undefined) { parts.push("nhớ ~" + p.stability + " ngày"); }
    parts.push("bấm để xem/nghe");
    $("kb-tip-meta").textContent = parts.filter(Boolean).join(" · ");
    tip.hidden = !!pinned;
    var field = $("kb-field");
    var left = (col + 1) * cw + 6;
    if (left + tip.offsetWidth > field.clientWidth) { left = col * cw - tip.offsetWidth - 6; }
    var top = Math.min(row * ch, Math.max(0, field.clientHeight - tip.offsetHeight - 4));
    tip.style.left = Math.max(4, left) + "px";
    tip.style.top = top + "px";
  }

  // ---- Ôn thẻ ngay trong vườn ------------------------------------------

  var card = null;          // dữ liệu thẻ đang ôn (từ Python)
  var showingAnswer = false;
  var waiting = false;      // đã chấm, đang chờ thẻ kế tiếp
  var flipping = false;     // đã bấm lật, đang chờ Python gửi mặt sau
  var frameReady = false;   // iframe thẻ đã dựng xong khung chưa
  var queued = null;        // mặt thẻ chờ iframe sẵn sàng

  // CSS mặc định của màn ôn Anki (ô gõ đáp án, nút phát âm). Đặt TRƯỚC CSS của
  // mẫu thẻ để mẫu thẻ ghi đè được.
  // 1.22.6: Anki đang ở chế độ tối thì thân thẻ có lớp nightMode (theme_manager) — dùng đúng nền / chữ của màn ôn Anki
  // (reviewer.css: body.nightMode{background-color:var(--canvas);color:var(--fg)}). Trước đây khung thẻ vẫn nền trắng,
  // mẫu thẻ có ".nightMode{color:#fff}" (rất hay gặp) thì chữ trắng trên nền trắng, gần như không đọc được.
  var BASE_CSS = "<style>html,body{margin:0}body{padding:14px 16px;min-height:40px}" +
    "body.nightMode{background-color:#2c2c2c;color:#fcfcfc}" +
    ".nightMode .latex{filter:invert(100%)}.nightMode img.drawing{filter:invert(1) hue-rotate(180deg)}" +
    "img{max-width:100%;height:auto}" +
    "#typeans{width:100%;box-sizing:border-box;line-height:1.75}" +
    "code#typeans{font-family:inherit;white-space:pre-wrap}" +
    ".typeGood{background:#afa;color:#000}.typeBad{background:#faa;color:#000}" +
    ".typeMissed{background:#ccc;color:#000}" +
    ".replay-button{text-decoration:none;display:inline-flex;vertical-align:middle;margin:3px}" +
    ".replay-button svg{width:40px;height:40px}" +
    ".replay-button svg circle{fill:#fff;stroke:#414141}" +
    ".replay-button svg path{stroke:#414141;fill:#000}</style>";

  // Khung iframe dựng MỘT lần cho cả buổi ôn; mỗi mặt thẻ chỉ thay nội dung #qa
  // (giống webview của Anki) nên không bị tải lại trang, không nháy, không giật.
  var FRAME_JS = "<script>" +
    "var pycmd=function(c,cb){return parent.pycmd(c,cb);};" +
    "var onUpdateHook=[],onShownHook=[];" +
    "function _typeAnsPress(){var e=window.event;if(e&&(e.key==='Enter'||e.keyCode===13)){e.preventDefault&&e.preventDefault();parent.Garden.flip();}}" +
    "function getTypedAnswer(){var t=document.getElementById('typeans');return t?t.value:null;}" +
    "document.addEventListener('keydown',function(e){parent.Garden.key(e);});" +
    // Chạy lần lượt các <script> của mẫu thẻ sau khi HTML đã nằm trong trang.
    "function __kbRun(list,i,done){if(i>=list.length){done();return;}" +
    "var old=list[i],s=document.createElement('script');" +
    "for(var k=0;k<old.attributes.length;k++){s.setAttribute(old.attributes[k].name,old.attributes[k].value);}" +
    "s.text=old.text;var next=function(){__kbRun(list,i+1,done);};" +
    "if(old.src){s.onload=next;s.onerror=next;old.parentNode.replaceChild(s,old);}" +
    "else{try{old.parentNode.replaceChild(s,old);}catch(e){}next();}}" +
    "var __kbSeq=0;" +
    "window.__kbShow=function(html,css,bodyclass,side){" +
    "var seq=++__kbSeq;onUpdateHook=[];onShownHook=[];" +
    "document.body.className=bodyclass||'card';document.body.setAttribute('data-side',side);" +
    "var qa=document.getElementById('qa');qa.innerHTML=(css||'')+html;" +
    "if(side==='q'){window.scrollTo(0,0);}" +
    "__kbRun(Array.prototype.slice.call(qa.querySelectorAll('script')),0,function(){" +
    "if(seq!==__kbSeq){return;}" +
    "for(var i=0;i<onUpdateHook.length;i++){try{onUpdateHook[i]();}catch(e){}}" +
    "for(var j=0;j<onShownHook.length;j++){try{onShownHook[j]();}catch(e){}}" +
    "var t=document.getElementById('typeans');if(t&&t.tagName==='INPUT'&&document.activeElement!==t){t.focus({preventScroll:true});}" +
    // Chỉ cuộn (bên trong khung thẻ) khi phần đáp án thật sự nằm khuất bên dưới.
    "if(side==='a'){var a=document.getElementById('answer');" +
    "if(a&&a.offsetParent){var r=a.getBoundingClientRect();" +
    "if(r.top>window.innerHeight-40){window.scrollTo(0,window.scrollY+r.top-12);}}}" +
    "});};" +
    "document.addEventListener('DOMContentLoaded',function(){parent.Garden.frameReady();});" +
    "<\/script>";
  var activeNid = null;
  var toastTimer = null;

  function markActive() {
    var box = $("kb-active");
    if (!data || activeNid === null) { box.hidden = true; return; }
    var idx = -1;
    for (var i = 0; i < data.plants.length; i++) {
      if (data.plants[i].nid === activeNid) { idx = i; break; }
    }
    if (idx < 0) { box.hidden = true; return; }
    var cw = TW * SCALE, ch = TH * SCALE;
    box.style.left = ((idx % cols) * cw) + "px";
    box.style.top = (Math.floor(idx / cols) * ch) + "px";
    box.style.width = cw + "px";
    box.style.height = ch + "px";
    box.hidden = false;
  }

  // Khung thẻ có chiều cao cố định (CSS), nội dung dài thì cuộn bên trong.
  function fitCard() { /* giữ cho tương thích, không đổi chiều cao nữa */ }

  function buildFrame() {
    frameReady = false;
    var doc = "<!doctype html><html><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
      "<base href=\"" + ((card && card.base) || "") + "\">" + BASE_CSS + FRAME_JS +
      "</head><body class=\"card\"><div id=\"qa\"></div></body></html>";
    $("kb-card").srcdoc = doc;
  }

  function onFrameReady() {
    frameReady = true;
    if (queued) { var q = queued; queued = null; renderSide(q.html, q.side); }
  }

  function renderSide(html, side) {
    var win = null;
    try { win = $("kb-card").contentWindow; } catch (e) { win = null; }
    if (!frameReady || !win || !win.__kbShow) {
      queued = { html: html, side: side };
      if (!frameReady && !$("kb-card").srcdoc) { buildFrame(); }
      return;
    }
    win.__kbShow(html, card.css || "", card.bodyclass || "card", side);
  }

  function showSide(html, side) {
    if (!frameReady && !$("kb-card").srcdoc) { buildFrame(); }
    renderSide(html, side);
  }

  function typedAnswer() {
    try {
      var t = $("kb-card").contentDocument.getElementById("typeans");
      return t ? String(t.value || "") : "";
    } catch (e) { return ""; }
  }

  function setCounts(counts, current) {
    for (var i = 0; i < 3; i++) {
      var el = $("kb-c" + i);
      el.textContent = String(counts[i] || 0);
      el.className = el.className.replace(" kb-current", "") + (i === current ? " kb-current" : "");
    }
  }

  function showCard(c) {
    if ($("kb-panel").hidden) { fx("startReview"); }
    card = c;
    showingAnswer = false;
    waiting = false;
    flipping = false;
    $("kb-panel").hidden = false;
    $("kb-card-wrap").hidden = false;
    $("kb-done").hidden = true;
    $("kb-close-done").hidden = true;
    $("kb-ratings").hidden = true;
    $("kb-show").hidden = false;
    setCounts(c.counts, c.queue);
    for (var i = 1; i <= 4; i++) { $("kb-l" + i).textContent = ((c.labels && c.labels[i - 1]) || "").replace(/[\u2068\u2069]/g, ""); }
    showSide(c.question, "q");
    activeNid = c.nid;
    markActive();
    fx("setActive", c.nid);
  }

  function flip() {
    if (!card || showingAnswer || waiting || flipping) { return; }
    flipping = true;
    fx("flip");
    // Python dựng mặt sau (chấm phần gõ đáp án giống Anki) rồi gọi showAnswer.
    send("rv:show:" + typedAnswer());
  }

  function showAnswer(a) {
    if (!card || !flipping || (a && a.cid !== card.cid)) { return; }
    flipping = false;
    showingAnswer = true;
    showSide(a.answer, "a");
    $("kb-show").hidden = true;
    $("kb-ratings").hidden = false;
  }

  function rate(ease) {
    if (!card || !showingAnswer || waiting) { return; }
    waiting = true;
    fx("rate", ease);
    send("rv:ans:" + ease);
  }

  // 1.18: hết thẻ mà vườn vẫn còn cây trông khát / héo → nói rõ vì sao hôm nay chưa tưới được
  function doneWhy() {
    var h = (data && data.stats && data.stats.held) || {}, out = [];
    if (h.later) {
      var at = null;
      ((data && data.plants) || []).forEach(function (p) { if (p.held === "later" && p.later_at && (at === null || p.later_at < at)) { at = p.later_at; } });
      out.push(h.later + " cây có thẻ đang học, tới lượt " + (at ? "lúc " + clock(at) : "sau ít phút") + ": bấm Tưới ngay lại lúc đó.");
    }
    if (h.limit) {
      out.push(h.limit + " cây còn khát nhưng deck đã đủ số thẻ ôn hôm nay. Mai tưới tiếp.");
    }
    if (h.buried) {
      out.push(h.buried + " cây có thẻ được Anki hoãn tới mai. Mai sẽ tưới được.");
    }
    if (h.filtered) {
      out.push(h.filtered + " cây có thẻ đang ở deck lọc (Filtered deck) khác: ôn ở deck đó.");
    }
    if (h.notdue) {
      out.push(h.notdue + " cây héo nhưng Anki hẹn ôn ở ngày sau. Bấm vào cây để xem ngày ôn.");
    }
    return out;
  }

  function reviewDone(info) {
    card = null;
    showingAnswer = false;
    waiting = false;
    flipping = false;
    $("kb-panel").hidden = false;
    $("kb-card-wrap").hidden = true;
    $("kb-done").hidden = false;
    setCounts((info && info.counts) || [0, 0, 0], -1);
    var why = $("kb-done-why"), lines = doneWhy();
    if (why) {
      why.textContent = "";
      lines.forEach(function (t) { var li = document.createElement("li"); li.textContent = t; why.appendChild(li); });
      why.hidden = !lines.length;
    }
    $("kb-show").hidden = true;
    $("kb-ratings").hidden = true;
    $("kb-close-done").hidden = false;
    fx("done");
    activeNid = null;
    markActive(false);
  }

  function closePanel(notify) {
    if (notify) { send("rv:stop"); }
    card = null;
    showingAnswer = false;
    waiting = false;
    flipping = false;
    $("kb-panel").hidden = true;
    $("kb-card").srcdoc = "";
    frameReady = false;
    queued = null;
    activeNid = null;
    markActive(false);
  }

  function key(e) {
    if (e.key === "F11") { e.preventDefault(); send("win:full"); return; }   // toàn màn hình
    if ($("kb-panel").hidden) { return; }
    var tag = (e.target && e.target.tagName) || "";
    if (tag === "SELECT" || tag === "INPUT" || tag === "TEXTAREA") { return; }
    var k = e.key;
    if (k === " " || k === "Enter") {
      e.preventDefault();
      if (!card) { return; }
      if (!showingAnswer) { flip(); } else { rate(3); }
    } else if (k >= "1" && k <= "4") {
      e.preventDefault();
      rate(Number(k));
    } else if (k === "Escape") {
      e.preventDefault();
      closePanel(true);
    }
  }

  // ---- Âm thanh: bảng bật/tắt hiệu ứng, nhạc nền, âm lượng ----
  function syncSoundUi() {
    var sfxOn = $("kb-sfx-on"), musicOn = $("kb-music-on"), vol = $("kb-music-vol");
    if (!sfxOn) { return; }
    var fxOk = typeof GardenFX !== "undefined";
    var blocked = fxOk && GardenFX.soundAllowed && !GardenFX.soundAllowed();
    sfxOn.checked = fxOk && !blocked ? !GardenFX.muted() : false;     // 1.17: bị tắt trong config thì không hiện "đã bật"
    sfxOn.disabled = blocked;
    sfxOn.parentNode.title = blocked ? "Đang tắt trong Tools → Add-ons → Config (sound = false)" : "";
    if (typeof GardenMusic !== "undefined") {
      musicOn.checked = GardenMusic.enabled();
      vol.value = String(Math.round(GardenMusic.volume() * 100));
    }
    syncSkyUi();
    drawMobileNote();
  }

  // ---- 1.11: bù xu cho lượt ôn trên điện thoại ----
  function two(n) { return (n < 10 ? "0" : "") + n; }
  function drawMobileNote() {
    var el = $("kb-mobile-now");
    if (!el || !data) { return; }
    var m = data.wallet && data.wallet.mobile;
    if (data.mobile_on === false) {
      el.textContent = "Đang tắt (config mobile_coins = false).";
    } else if (!m) {
      el.textContent = "Bắt đầu tính từ bây giờ.";
    } else if (m.total && m.total.reviews > 0) {
      var t = "Đã bù " + m.total.reviews + " lượt · +" + m.total.coins + " xu.";
      if (m.last && m.last.at) {
        var d = new Date(m.last.at * 1000);
        t += " Lần gần nhất " + two(d.getDate()) + "/" + two(d.getMonth() + 1) + " " + two(d.getHours()) + ":" +
          two(d.getMinutes()) + ": " + m.last.reviews + " lượt, +" + m.last.coins + " xu.";
      }
      el.textContent = t;
    } else {
      el.textContent = "Chưa có lượt nào cần bù.";
    }
  }

  // ---- 1.11: Báo lỗi ----
  function openReport() {
    $("kb-sound-pop").hidden = true;
    var panel = !$("kb-panel").hidden ? "ôn thẻ"
      : (typeof GardenGames !== "undefined" && GardenGames.isOpen()) ? "trò chơi " + (GardenGames.playing() || "menu")
      : (typeof GardenHome !== "undefined" && GardenHome.isOpen()) ? "nhà"
      : (typeof GardenPaper !== "undefined" && GardenPaper.isOpen()) ? "báo" : "vườn";
    var scene = "";
    try { scene = (typeof GardenPrefs !== "undefined" ? GardenPrefs.get("kb-main-scene") : localStorage.getItem("kb-main-scene")) || ""; } catch (e) { scene = ""; }
    var c = typeof GardenDiag !== "undefined" ? GardenDiag.client({ panel: panel, scene: scene })
      : { w: window.innerWidth, h: window.innerHeight, panel: panel, scene: scene };
    send("app:report:" + JSON.stringify(c));
  }

  // ---- Trời & giờ ----
  function syncSkyUi() {
    if (typeof GardenSky === "undefined" || !$("kb-sky-day")) { return; }
    var c = GardenSky.settings(), st = GardenSky.state();
    applySkyCss();
    Array.prototype.forEach.call(document.querySelectorAll("input[name='kb-sky-mode']"), function (r) { r.checked = r.value === c.mode; });
    $("kb-sky-day").value = String(c.dayMinutes);
    $("kb-sky-hour").value = String(c.fixedHour);
    $("kb-sky-weather").value = c.weather;
    var hh = Math.floor(st.hour), mm = Math.floor((st.hour - hh) * 60);
    $("kb-sky-now").textContent = "Bây giờ trong vườn: " + String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0") +
      " · " + st.phaseLabel + " · " + st.weatherLabel;
  }
  function initSky() {
    if (typeof GardenSky === "undefined" || !$("kb-sky-day")) { return; }
    Array.prototype.forEach.call(document.querySelectorAll("input[name='kb-sky-mode']"), function (r) {
      r.addEventListener("change", function () { GardenSky.set("mode", r.value); syncSkyUi(); });
    });
    $("kb-sky-day").addEventListener("change", function (e) { GardenSky.set("dayMinutes", Number(e.target.value)); GardenSky.set("mode", "game"); syncSkyUi(); });
    $("kb-sky-hour").addEventListener("change", function (e) { GardenSky.set("fixedHour", Number(e.target.value)); GardenSky.set("mode", "fixed"); syncSkyUi(); });
    $("kb-sky-weather").addEventListener("change", function (e) { GardenSky.set("weather", e.target.value); syncSkyUi(); });
    $("kb-weather").addEventListener("click", function (e) { e.stopPropagation(); $("kb-sound").click(); });
    // linh vật nói khi đổi thời tiết / buổi
    var SAY_W = { rain: "雨だ！ Mưa rồi, cây được tưới miễn phí ♪", storm: "雷！ Giông tới, vào nhà ôn bài nhé", snow: "雪だ！ Tuyết rơi kìa",
      sunny: "晴れ！ Nắng đẹp quá", cloudy: "くもり… Trời nhiều mây" };
    var SAY_P = { dawn: "おはよう！ Bình minh rồi", morning: "Buổi sáng tốt lành!", noon: "お昼だ！ Trưa rồi",
      afternoon: "Buổi chiều rồi, ôn thêm chút nhé", dusk: "夕焼け、きれい！", night: "こんばんは～ Trời tối rồi" };
    GardenSky.onChange(function (st, prev) {
      var pw = prev.split("|")[1];
      var text = pw !== st.weather ? (st.weather === "sunny" && st.night ? "星がきれい！ Trời quang, nhiều sao" : SAY_W[st.weather]) : SAY_P[st.phase];
      if (text && typeof GardenFX !== "undefined") {
        GardenFX.mood(st.weather === "storm" ? "sad" : "happy", 1800);
        GardenFX.say(text, 2400);
      }
    });
    // màu nền trang theo trời
    setInterval(function () {
      applySkyCss();
      if (!$("kb-sound-pop").hidden) { syncSkyUi(); }
      if (fitPending) { fitToday(); }
      else {      // 1.22.6: dòng việc mới hiện (nhật ký, thú đói…) làm thẻ tràn → xếp sát; chỉ đọc kích thước khi không cần đổi
        var tl = document.querySelector("#kb-today .kb-today-list");
        if (tl && tl.clientHeight && !tl.classList.contains("kb-today-tight") && tl.scrollHeight > tl.clientHeight + 1) { fitTodayList(); }
      }
    }, 1000);
    applySkyCss();
  }
  function applySkyCss() {
    if (typeof GardenSky === "undefined") { return; }
    var st = GardenSky.state(), root = document.documentElement.style;
    if (season()) { st = season().themeSky(st); }
    root.setProperty("--kb-page-bg", st.page);
    // dải thừa bên phải ruộng (canvas chia đủ ô) cùng màu cỏ của giao diện mùa đang dùng, không lệch sang xanh mặc định
    var f = season() && season().field ? season().field() : null;
    root.setProperty("--kb-field-bg", f && f.base && GardenSky.mix ? GardenSky.mix(f.base, "#0b0b2a", st.fieldDark || 0) : st.field);
  }

  function initSound() {
    var btn = $("kb-sound"), pop = $("kb-sound-pop");
    if (!btn) { return; }
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
      syncSoundUi();
      fitPop();
    });
    // 1.10: bảng ⚙ dài hơn cửa sổ thấp → giới hạn chiều cao theo chỗ còn lại, cuộn bên trong
    function fitPop() {
      if (pop.hidden) { return; }
      pop.style.maxHeight = "";
      var top = pop.getBoundingClientRect().top;
      pop.style.maxHeight = Math.max(160, window.innerHeight - top - 12 - 26) + "px";   // 26 = viền + đệm
    }
    window.addEventListener("resize", fitPop);
    pop.addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () { pop.hidden = true; });
    $("kb-sfx-on").addEventListener("change", function (e) {
      if (typeof GardenFX !== "undefined") { GardenFX.setMuted(!e.target.checked); }
      syncSoundUi();
    });
    $("kb-music-on").addEventListener("change", function (e) {
      if (typeof GardenMusic !== "undefined") { GardenMusic.setEnabled(e.target.checked); }
      syncSoundUi();
    });
    $("kb-music-vol").addEventListener("input", function (e) {
      if (typeof GardenMusic !== "undefined") { GardenMusic.setVolume(Number(e.target.value) / 100); }
    });
  }

  // Nhạc theo màn: ôn thẻ / "Nghe tìm cây" thì im, còn lại mỗi màn một bản.
  function syncMusic() {
    if (typeof GardenMusic === "undefined") { return; }
    var s = "garden";
    if (!$("kb-panel").hidden) { s = "review"; }
    else if (typeof GardenPaper !== "undefined" && GardenPaper.isOpen()) { s = "listen"; }
    else if (typeof GardenHome !== "undefined" && GardenHome.isOpen()) { s = "home"; }
    else if (typeof GardenGames !== "undefined" && GardenGames.isOpen()) {
      var pg = GardenGames.playing();
      s = (pg === "listen" || pg === "cloze") ? "listen" : "game";
    }
    GardenMusic.setScene(s);
  }

  // 1.12: thông báo mời bấm (vd. "chưa cấu hình trường") nằm đè lên nút Hiện đáp án / ô gõ của trò chơi
  // → mở bảng nào thì ẩn nó đi (chip ⚠ ở góc sân vẫn còn)
  function hideLinkToast() {
    var t = $("kb-toast");
    if (t && !t.hidden && t.onclick) { toastNext(); }
  }
  // 1.20: hàng chờ thông báo. Thông báo quan trọng (bấm được hoặc hiện ≥ 5 giây, vd. "Báo mới…", "Gemini đã sửa
  // bài…") không bị câu sau thay mất: câu sau chờ tới lượt. Thông báo ngắn thường thì vẫn thay nhau như cũ.
  // 1.25.9: toastPend = câu đã lấy khỏi hàng, đang chờ 250 ms để hiện — câu mới tới lúc này xếp sau nó (trước đây câu
  // mới hiện luôn và xoá hẹn giờ của câu đang chờ → câu đó mất hẳn)
  var toastQ = [], toastCur = null, toastPend = null;
  // onClick: bấm vào thông báo để làm luôn (vd. mở Cấu hình trường); ms: thời gian hiện
  function toast(msg, onClick, ms) {
    var item = { msg: String(msg || ""), onClick: onClick || null, ms: ms || 2600 };
    item.imp = !!onClick || item.ms >= 5000;
    var t = $("kb-toast");
    if (toastPend || (toastCur && toastCur.imp && t && !t.hidden)) {
      var same = (toastCur && toastCur.msg === item.msg) || (toastPend && toastPend.msg === item.msg);
      if (!same && !toastQ.some(function (x) { return x.msg === item.msg; }) && toastQ.length < 5) { toastQ.push(item); }
      return;
    }
    showToast(item);
  }
  function showToast(item) {
    var t = $("kb-toast");
    toastCur = item;
    GardenIcons.fill(t, item.msg);        // 1.17.3: "[i:tên]" trong câu → icon pixel
    t.hidden = false;
    t.onclick = item.onClick ? function () { var f = item.onClick; toastNext(); f(); } : null;
    t.className = "kb-toast" + (item.onClick ? " kb-toast-link" : "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(toastNext, item.ms);
  }
  function toastNext() {
    var t = $("kb-toast");
    clearTimeout(toastTimer);
    if (t) { t.hidden = true; t.onclick = null; }
    toastCur = null;
    toastPend = null;
    if (toastQ.length) {
      toastPend = toastQ.shift();
      toastTimer = setTimeout(function () { var n = toastPend; toastPend = null; if (n) { showToast(n); } }, 250);
    }
  }

  function render(d) {
    data = d;
    if (ui()) { ui().refresh(); }
    if (season()) { season().refresh(); }
    drawHeader();
    drawLegend();
    drawField();
    markActive(false);
    drawToday();
    drawQuests();
    drawPaperChip();
    drawFieldsChip();
    drawJournal();
    fitTodayList();
    maybePhoto();
    if (pinned) {
      var again = -1;
      for (var pi = 0; pi < d.plants.length; pi++) { if (d.plants[pi].nid === pinned.nid) { again = pi; } }
      if (again >= 0 && !$("kb-pin").hidden) { showPinSilently(again); } else { hidePin(); }
    }
    fx("config", d.fx);
    fx("rendered");
    if (typeof GardenGames !== "undefined") { GardenGames.dataChanged(); }
    if (typeof GardenHome !== "undefined") { GardenHome.dataChanged(); }
    if (typeof GardenMusic !== "undefined") { GardenMusic.config(d.fx); }
    if (typeof GardenJoy !== "undefined") { GardenJoy.render(d.joy); }
    syncSoundUi();
  }

  // ---- 1.22.3: tìm deck theo tên (nút kính lúp cạnh ô Deck, phím /) ----
  // người dùng: "tớ nghĩ tất cả nên có nút tìm kiếm deck thì sẽ nhanh hơn". Bỏ dấu, "::" như dấu cách, mọi từ phải có.
  function deckNorm(s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/::/g, " ");
  }
  function deckMatch(name, q) {
    var n = deckNorm(name), terms = deckNorm(q).split(/\s+/).filter(Boolean);
    return terms.every(function (t) { return n.indexOf(t) >= 0; });
  }
  var deckHit = 0, deckShown = [];
  function drawDeckList() {
    var q = $("kb-deck-q").value, box = $("kb-deck-list");
    box.textContent = "";
    // khớp nguyên cụm gõ vào ("bai 3" → "Bài 30…") lên trước, khớp rời từng từ ("Bài 23") sau; giữ thứ tự deck của Anki
    var phrase = deckNorm(q).trim().replace(/\s+/g, " ");
    deckShown = ((data && data.decks) || []).filter(function (d) { return deckMatch(d.name, q); });
    if (phrase) {
      deckShown = deckShown.filter(function (d) { return deckNorm(d.name).replace(/\s+/g, " ").indexOf(phrase) >= 0; })
        .concat(deckShown.filter(function (d) { return deckNorm(d.name).replace(/\s+/g, " ").indexOf(phrase) < 0; }));
    }
    deckHit = Math.max(0, Math.min(deckHit, deckShown.length - 1));
    if (!deckShown.length) {
      var none = document.createElement("div");
      none.className = "kb-deck-none";
      none.textContent = "Không có deck nào khớp “" + q.trim() + "”.";
      box.appendChild(none);
    }
    deckShown.forEach(function (d, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "kb-deck-item" + (i === deckHit ? " is-hit" : "") + (data.deck && d.id === data.deck.id ? " is-cur" : "");
      b.setAttribute("role", "option");
      b.setAttribute("data-id", String(d.id));
      b.textContent = d.name;
      b.title = d.name;
      b.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
      b.addEventListener("click", function () { pickDeck(d.id); });
      b.addEventListener("mousemove", function () { if (deckHit !== i) { deckHit = i; markDeckHit(); } });
      box.appendChild(b);
    });
    markDeckHit();
  }
  function markDeckHit() {
    Array.prototype.forEach.call($("kb-deck-list").querySelectorAll(".kb-deck-item"), function (b, i) {
      b.classList.toggle("is-hit", i === deckHit);
      if (i === deckHit) { b.scrollIntoView({ block: "nearest" }); }
    });
  }
  function pickDeck(id) {
    closeDeckFind();
    var sel = $("kb-deck");
    if (String(id) === sel.value) { return; }
    sel.value = String(id);
    sel.dispatchEvent(new Event("change"));
  }
  function openDeckFind() {
    var pop = $("kb-deck-pop"), lab = $("kb-deck").parentNode;
    if (!pop || !data) { return; }
    pop.hidden = false;
    var r = lab.getBoundingClientRect();
    pop.style.left = Math.max(8, Math.min(window.innerWidth - pop.offsetWidth - 8, r.left)) + "px";
    pop.style.top = Math.round(r.bottom + 6) + "px";
    $("kb-deck-q").value = "";
    deckHit = Math.max(0, (data.decks || []).findIndex(function (d) { return data.deck && d.id === data.deck.id; }));
    drawDeckList();
    $("kb-deck-q").focus();
  }
  function closeDeckFind() { var pop = $("kb-deck-pop"); if (pop) { pop.hidden = true; } }
  function initDeckFind() {
    var pop = $("kb-deck-pop"), find = $("kb-deck-find"), q = $("kb-deck-q");
    if (!pop || !find || !q) { return; }
    find.addEventListener("mousedown", function (ev) { ev.preventDefault(); });
    find.addEventListener("click", function (ev) { ev.preventDefault(); ev.stopPropagation(); if (pop.hidden) { openDeckFind(); } else { closeDeckFind(); } });
    pop.addEventListener("click", function (ev) { ev.stopPropagation(); });
    document.addEventListener("click", function () { if (!pop.hidden) { closeDeckFind(); } });
    q.addEventListener("input", function () { deckHit = 0; drawDeckList(); });
    q.addEventListener("keydown", function (ev) {
      ev.stopPropagation();          // gõ chữ không chạy phím tắt của vườn
      if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
        ev.preventDefault();
        if (deckShown.length) { deckHit = (deckHit + (ev.key === "ArrowDown" ? 1 : -1) + deckShown.length) % deckShown.length; markDeckHit(); }
      } else if (ev.key === "Enter") {
        ev.preventDefault();
        if (deckShown[deckHit]) { pickDeck(deckShown[deckHit].id); }
      }
    });
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !pop.hidden) { ev.stopImmediatePropagation(); ev.preventDefault(); closeDeckFind(); }
    }, true);
    window.addEventListener("resize", closeDeckFind);
  }

  function init() {
    initDeckFind();
    $("kb-deck").addEventListener("change", function (e) {
      closePanel(false);
      if (typeof GardenGames !== "undefined") { GardenGames.deckChanged(); }
      send("deck:" + e.target.value);
      if (typeof GardenFields !== "undefined" && GardenFields.isOpen()) { GardenFields.open(null); }
    });
    $("kb-review").addEventListener("click", function () {
      hideLinkToast();
      if (typeof GardenFields !== "undefined") { GardenFields.close(); }
      if (typeof GardenGames !== "undefined") { GardenGames.close(); }
      if (typeof GardenHome !== "undefined") { GardenHome.close(); }
      if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
      if (ui()) { ui().close(); }
      if (cal()) { cal().close(); }
      send("rv:start");
    });
    $("kb-games").addEventListener("click", function () {
      hideLinkToast();
      if (typeof GardenGames === "undefined") { return; }
      if (GardenGames.isOpen()) { GardenGames.close(); return; }
      closePanel(true);
      if (typeof GardenFields !== "undefined") { GardenFields.close(); }
      if (typeof GardenHome !== "undefined") { GardenHome.close(); }
      if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
      if (ui()) { ui().close(); }
      if (cal()) { cal().close(); }
      GardenGames.open();
    });
    $("kb-house").addEventListener("click", function () {
      if (typeof GardenHome === "undefined") { return; }
      if (GardenHome.isOpen()) { GardenHome.close(); return; }
      closePanel(true);
      if (typeof GardenFields !== "undefined") { GardenFields.close(); }
      if (typeof GardenGames !== "undefined") { GardenGames.close(); }
      if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
      if (ui()) { ui().close(); }
      if (cal()) { cal().close(); }
      GardenHome.open();      // mở đúng cảnh đang hiện ở màn chính
    });
    initSound();
    initSky();
    setInterval(syncMusic, 400);
    $("kb-show").addEventListener("click", flip);
    $("kb-stop").addEventListener("click", function () { closePanel(true); });
    $("kb-close-done").addEventListener("click", function () { closePanel(true); });
    var rates = document.querySelectorAll(".kb-rate");
    for (var r = 0; r < rates.length; r++) {
      rates[r].addEventListener("click", function (e) {
        rate(Number(e.currentTarget.getAttribute("data-ease")));
      });
    }
    // 1.25.9: phím bấm khi bộ gõ (IME tiếng Nhật / Telex…) đang chọn chữ là của bộ gõ — không tới phím tắt nào của vườn,
    // kể cả Esc đóng bảng / đóng cửa sổ (Anki nghe Esc ở document). Nghe ở window, pha capture: chạy trước mọi bộ nghe.
    window.addEventListener("keydown", function (e) {
      if (e.isComposing || e.keyCode === 229) { e.stopPropagation(); }
    }, true);
    document.addEventListener("keydown", key);
    document.addEventListener("keydown", mainKey);
    // 1.13: Esc đã được một bảng dùng (preventDefault) thì Python không đóng cửa sổ (xem GardenDialog._on_esc).
    // Nghe ở window (sau mọi bộ nghe ở document) để biết kết quả cuối cùng.
    window.addEventListener("keydown", function (e) { if (e.key === "Escape") { window.__kbEscUsed = e.defaultPrevented; } });
    $("kb-canvas").addEventListener("click", function (ev) {
      var idx = plantAt(ev);
      if (idx >= 0) { showPin(idx); } else { hidePin(); }
    });
    $("kb-pin-x").addEventListener("click", hidePin);
    $("kb-quest").addEventListener("click", function (e) { e.stopPropagation(); toggleQuests(); });
    $("kb-paper-btn").addEventListener("click", function (e) { e.stopPropagation(); openPaper(false); });
    $("kb-fields-btn").addEventListener("click", function (e) { e.stopPropagation(); openFields($("kb-fields-btn").getAttribute("data-mid")); });
    $("kb-fields-open").addEventListener("click", function () { $("kb-sound-pop").hidden = true; openFields(null); });
    $("kb-paper-src").addEventListener("click", function () {
      $("kb-sound-pop").hidden = true;
      if (typeof GardenPaper !== "undefined") { GardenPaper.open("src"); }
    });
    if (/Mac/i.test(navigator.platform || "")) { $("kb-app-key").textContent = "⌘⇧K"; }
    $("kb-app-icon").addEventListener("click", function () {
      var b = $("kb-app-icon");
      if (b.disabled) { return; }
      b.disabled = true; b.textContent = "Đang tạo…";
      send("app:icon");
    });
    $("kb-report").addEventListener("click", openReport);
    $("kb-cal-open").addEventListener("click", function () { $("kb-sound-pop").hidden = true; openCal({ tab: "month" }); });
    $("kb-cal-ask").addEventListener("click", function (e) { e.stopPropagation(); openCal({ tab: "month", date: data && data.journal && data.journal.today }); });
    $("kb-cal-write").addEventListener("click", function (e) { e.stopPropagation(); openCal({ tab: "month", date: $("kb-cal-write").getAttribute("data-d") }); });
    if (typeof GardenDiag !== "undefined") {
      GardenDiag.onError(function (first) {
        if (first) { toast("[i:warn] Vườn vừa gặp lỗi. Bấm vào đây để mở Báo lỗi ▸", openReport, 8000); }
      });
    }
    document.querySelector("#kb-today .kb-today-main").addEventListener("click", function (e) { e.stopPropagation(); toggleQuests(); });
    $("kb-quest-x").addEventListener("click", function () { toggleQuests(false); });
    $("kb-quest-pop").addEventListener("click", function (e) { e.stopPropagation(); });
    document.addEventListener("click", function () { if (!$("kb-quest-pop").hidden) { toggleQuests(false); } });
    $("kb-pin-play").addEventListener("click", function () {
      if (pinned) { send((pinned.audio ? "game:audio:" : "game:exaudio:") + pinned.nid); }
    });
    $("kb-canvas").addEventListener("mousemove", onMove);
    $("kb-canvas").addEventListener("mouseleave", function () {
      $("kb-hover").hidden = true; $("kb-tip").hidden = true;
    });
    var timer = null;
    function relayout() {
      clearTimeout(timer);
      timer = setTimeout(function () { if (data) { drawField(); } fitToday(); }, 120);
    }
    window.addEventListener("resize", relayout);
    window.addEventListener("kb-relayout", relayout);   // sân đổi cỡ → ruộng đo lại
    // nút thời tiết đổi chữ (giờ game "10:00", home.js) sau khi thẻ Hôm nay đã đo → đo lại
    window.addEventListener("kb-today-fit", fitToday);
    if (season()) {
      season().init({
        data: function () { return data; },
        openSeason: function () {       // chip chủ đề trên thanh trên cùng → tab Mùa & Lễ hội
          if (typeof GardenHome === "undefined") { return; }
          closePanel(true);
          if (typeof GardenGames !== "undefined") { GardenGames.close(); }
          if (typeof GardenPaper !== "undefined") { GardenPaper.close(); }
          if (cal()) { cal().close(); }
          if (!GardenHome.isOpen()) { GardenHome.open(); }
          GardenHome.setTab("season");
        }
      });
      season().onChange(function () {    // đổi chủ đề: vẽ lại ruộng, màu trang, đổi nhạc vườn
        relayout(); applySkyCss();
        if (typeof GardenMusic !== "undefined" && GardenMusic.themeChanged) { GardenMusic.themeChanged(); }
      });
    }
    fx("init", {
      data: function () { return data; }, cols: function () { return cols; },
      TW: TW, TH: TH, get SCALE() { return SCALE; }, sprites: SPRITES, pal: PAL, dry: DRY, art: plantArt,
      drawGrass: drawGrass, drawSoil: drawSoil, drawSprite: drawSprite
    });
    if (typeof GardenFields !== "undefined") {
      GardenFields.init({
        send: send, toast: toast, closeOthers: closeOthersForFields,
        openGames: function () { if (typeof GardenGames !== "undefined") { GardenGames.open(); } }
      });
    }
    if (typeof GardenGames !== "undefined") {
      GardenGames.init({
        data: function () { return data; }, send: send,
        openFields: function (mid) { openFields(mid, "games"); },
        questResult: questsUpdated,
        sprites: SPRITES, pal: PAL, dry: DRY, art: plantArt,
        drawGrass: drawGrass, drawSoil: drawSoil, drawSprite: drawSprite,
        setWallet: function (w) {
          if (!data) { return; }
          data.wallet = w;
          $("kb-coins").textContent = w.coins + " xu";
          var chip = $("kb-coins");
          chip.classList.remove("kb-bump"); void chip.offsetWidth; chip.classList.add("kb-bump");
        }
      });
    }
    if (typeof GardenHome !== "undefined") {
      GardenHome.init({
        data: function () { return data; }, send: send,
        setCatalog: function (c) { if (data && c) { data.catalog = c; } },
        setWallet: function (w) {
          if (!data) { return; }
          data.wallet = w;
          $("kb-coins").textContent = w.coins + " xu";
        },
        closeReview: function () { closePanel(true); },
        openPaper: function () { openPaper(false); },
        openBook: function () { openCal({ tab: "book" }); }
      });
    }
    if (typeof GardenGuests !== "undefined") { GardenGuests.init({ data: function () { return data; }, send: send }); }
    if (typeof GardenSeeds !== "undefined" && GardenSeeds.source) { GardenSeeds.source(function () { return data && data.catalog; }); }
    if (typeof GardenPaper !== "undefined") {
      GardenPaper.init({
        data: function () { return data; }, send: send,
        closeOthers: closeOthersForPaper,
        setWallet: function (w) {
          if (!data || !w) { return; }
          data.wallet = w;
          $("kb-coins").textContent = w.coins + " xu";
          var chip = $("kb-coins");
          chip.classList.remove("kb-bump"); void chip.offsetWidth; chip.classList.add("kb-bump");
        },
        setSummary: function (s) { if (data && s) { data.paper = s; drawPaperChip(); } },
        questResult: questsUpdated
      });
    }
    if (typeof GardenCraft !== "undefined") {
      GardenCraft.init({ data: function () { return data; }, send: send });
    }
    if (ui()) { ui().init({ data: function () { return data; }, send: send, closeOthers: closeOthersForUI }); }
    if (cal()) {
      cal().init({
        data: function () { return data; }, send: send, toast: toast, closeOthers: closeOthersForCal,
        openPaperSrc: function () { if (typeof GardenPaper !== "undefined") { GardenPaper.open("src"); } }
      });
    }
    if (typeof GardenJoy !== "undefined") {
      GardenJoy.init({ data: function () { return data; }, toast: toast, cols: function () { return cols; }, TW: TW, TH: TH,
        get SCALE() { return SCALE; } });
    }
    send("ready");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    deckMatch: deckMatch, openDeckFind: openDeckFind,     // 1.22.3: tìm deck (paper.js dùng chung cách so)
    _layout: function () { return Object.assign({ scale: SCALE, cols: cols }, fieldLayout); },   // cho test
    _data: function () { return data; },   // cho test
    render: render,
    showCard: showCard,
    showAnswer: showAnswer,
    celebrate: function (info) {
      fx("celebrate", info);
      if (info && info.quests) { questsUpdated(info.quests); }
    },
    // 1.11: vừa bù xu cho lượt ôn trên điện thoại (Python đã cộng xu; trang chỉ thông báo)
    mobilePaid: function (info) {
      if (!info) { return; }
      if (info.quests) { questsUpdated(info.quests); }
      var chip = $("kb-coins");
      if (chip) { chip.classList.remove("kb-bump"); void chip.offsetWidth; chip.classList.add("kb-bump"); }
      var msg = (info.message || "").replace(/^ことば畑: /, "");
      toast("[i:phone] " + msg.charAt(0).toUpperCase() + msg.slice(1), null, 7000);
      drawMobileNote();
    },
    openReport: openReport,
    gameSaved: function (res) { if (typeof GardenGames !== "undefined") { GardenGames.gameSaved(res); } },
    // 1.10: kết quả tạo biểu tượng ngoài Anki
    appIcon: function (r) {
      var b = $("kb-app-icon");
      b.disabled = false; b.textContent = "Tạo biểu tượng trên màn hình nền";
      r = r || {};
      $("kb-sound-pop").hidden = true;
      toast((r.ok ? "✓ " : "✗ ") + (r.msg || ""), null, r.ok ? 6000 : 8000);
    },
    fieldsData: function (p) { if (typeof GardenFields !== "undefined") { GardenFields.data(p); } },
    fieldsSaved: function (r) { if (typeof GardenFields !== "undefined") { GardenFields.saved(r); } },
    fieldsError: function (m) { if (typeof GardenFields !== "undefined") { GardenFields.error(m); } },
    gameModes: function (g) {
      // 1.17: {games: chế độ theo loại note tiếng Nhật, lang: chế độ của tiếng Anh / ngôn ngữ khác}
      if (data && g) { data.game_modes = g.games || {}; data.game_modes_lang = g.lang || {}; }
      if (typeof GardenGames !== "undefined" && GardenGames.modesChanged) { GardenGames.modesChanged(g); }
    },
    home: function (res) { if (typeof GardenHome !== "undefined") { GardenHome.update(res); } },
    uiSaved: function (c) { if (ui()) { ui().saved(c); } },
    homeError: function (msg) { if (typeof GardenHome !== "undefined") { GardenHome.error(msg); } },
    shareCode: function (p) { if (typeof GardenHome !== "undefined" && GardenHome.shareCode) { GardenHome.shareCode(p); } },
    sharePeek: function (p) { if (typeof GardenHome !== "undefined" && GardenHome.sharePeek) { GardenHome.sharePeek(p); } },
    craftImage: function (p) { if (typeof GardenCraft !== "undefined") { GardenCraft.image(p); } },
    paperIndex: function (v) { if (typeof GardenPaper !== "undefined") { GardenPaper.index(v); } },
    paperIssue: function (v) { if (typeof GardenPaper !== "undefined") { GardenPaper.issue(v); } },
    paperSummary: function (s) { if (data && s) { data.paper = s; drawPaperChip(); } },
    dictShow: function (v) { if (typeof GardenPaper !== "undefined") { GardenPaper.daily(v); } },
    paperResult: function (r) { if (typeof GardenPaper !== "undefined") { GardenPaper.result(r); } },
    paperError: function (m) { if (typeof GardenPaper !== "undefined") { GardenPaper.error(m); } },
    // 1.12: tab Nguồn báo (Gemini / Claude Code)
    aiStatus: function (v) { if (typeof GardenPaper !== "undefined") { GardenPaper.aiStatus(v); } },
    aiProgress: function (p) {
      if (data && data.paper && !data.paper.ai_busy) { data.paper.ai_busy = true; drawPaperChip(); }
      if (typeof GardenPaper !== "undefined") { GardenPaper.aiProgress(p); }
    },
    // 1.20: Lịch hoa / nhật ký / luyện viết
    calView: function (v) {
      if (v && v.freeze && data) {          // 1.25.9: mua vé giữ chuỗi ở Lịch hoa → số xu ở thanh trên
        if (data.wallet && data.wallet.coins !== v.freeze.coins) {
          data.wallet.coins = v.freeze.coins;
          var chip = $("kb-coins");
          chip.textContent = v.freeze.coins + " xu";
          chip.classList.remove("kb-bump"); void chip.offsetWidth; chip.classList.add("kb-bump");
        }
        if (data.today) { data.today.freeze = v.freeze; }
      }
      if (cal()) { cal().view(v); }
    },
    calSaved: function (r) { if (cal()) { cal().saved(r); } },
    calPdf: function (r) { if (cal()) { cal().pdf(r); } },
    calFix: function (r) {
      if (!r) { return; }
      if (cal() && cal().fix(r)) { return; }        // bảng đang mở đúng ngày đó: cập nhật tại chỗ
      toast(r.msg || "", function () { openCal({ tab: "month", date: r.d }); }, 8000);
    },
    journal: function (j) { if (data) { data.journal = j; drawJournal(); } },
    // 1.21: album khách vừa đổi (gặp khách mới / ghé thêm một ngày)
    guests: function (g) {
      if (!data || !g) { return; }
      var isNew = g.new;
      delete g.new;
      data.guests = g;
      if (typeof GardenHome !== "undefined") { GardenHome.dataChanged(); }
      if (isNew) {
        var e = (g.list || []).filter(function (x) { return x.id === isNew; })[0];
        if (e) {
          toast("[i:paw] Khách mới ghé vườn: " + e.name + " · xem Album ▸", function () {
            if (typeof GardenHome !== "undefined" && GardenHome.openGuests) { closeOthersForCal(); if (cal()) { cal().close(); } GardenHome.openGuests(isNew); }
          }, 8000);
        }
      }
    },
    // thông báo từ Python không bị thông báo sau thay mất (hàng chờ)
    notice: function (n) { if (n && n.msg) { toast(n.msg, null, n.ms || 8000); } },
    // 1.25.7: góp ý hình đã lưu ra file (vườn không đổi)
    baseSuggested: function (r) {
      if (typeof GardenCraft !== "undefined" && GardenCraft.baseSuggested) { GardenCraft.baseSuggested(r); }
      if (r && r.ok) { toast("Đã lưu " + r.file + " · gửi file này cho người làm add-on."); }
    },
    // 1.25.5 (admin): bản sửa hình gốc vừa lưu / bỏ / nhập
    fixes: function (p) {
      if (typeof GardenFix !== "undefined") { GardenFix.set((p && p.fixes) || {}); }
      if (typeof GardenCraft !== "undefined" && GardenCraft.baseSaved) { GardenCraft.baseSaved(); }
      if (typeof GardenHome !== "undefined" && GardenHome.fixChanged) { GardenHome.fixChanged(); }
      if (p && p.saved) { toast("Đã lưu hình."); } else if (p && p.reset) { toast("Đã về hình gốc."); }
    },
    openCal: openCal,
    flip: flip,
    reviewDone: reviewDone,
    toast: toast,
    key: key,
    fit: fitCard,
    frameReady: onFrameReady,
    SPRITES: SPRITES
  };
})();
