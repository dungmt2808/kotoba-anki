/* ことば畑 – hiệu ứng: linh vật StackChan, chậu cây khi ôn, hạt nước, lấp lánh,
   xu bay, pháo giấy, bướm trong vườn và âm thanh 8-bit.
   garden.js gọi GardenFX.*; mọi hàm đều an toàn nếu phần tử chưa có. */
var GardenFX = (function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };
  var G = null;               // trợ giúp vẽ từ garden.js
  var cfg = { effects: true, sound: true };
  var reduced = false;
  try { reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) { reduced = false; }

  var C = {
    k: "#1b1b2f", w: "#ffffff", y: "#ffd23f", o: "#ff9f1c", p: "#ff7fa0", r: "#ff4f6d",
    d: "#3d8bff", l: "#8fd3ff", s: "#e8e8f0", S: "#b8b8c8", g: "#9aa0b5", G: "#6b7088"
  };

  // ---------------------------------------------------------------------
  // Sprite nhỏ
  // ---------------------------------------------------------------------
  var CAN = [
    "...kkkk.......",
    "..k....k......",
    ".kkkkkkkk...kk",
    ".kddddddk..kdk",
    ".kdlddddkkkdk.",
    ".kddddddddddk.",
    ".kddddddk.kk..",
    "..kkkkkk......"
  ];
  var CLOUD = [
    "...kkkk.....",
    "..kSSSSkkk..",
    ".kSssssSSSk.",
    "kSssssssssSk",
    "kSSSSSSSSSSk",
    ".kkkkkkkkkk."
  ];
  var HEART = [".kk.kk.", "krrkrrk", "krwrrrk", ".krrrk.", "..krk..", "...k..."];
  var COIN = [".kkkk.", "kyyyyk", "kywyok", "kyyyok", "kyoook", ".kkkk."];
  var STAR = ["..y..", ".yyy.", "yywyy", ".yyy.", "..y.."];
  var TWINKLE = ["y.y", ".w.", "y.y"];
  var BFLY = [
    ["p...p", "ppkpp", ".pkp.", "p.k.p"],
    [".p.p.", ".pkp.", "..k..", "....."]
  ];

  function spr(ctx, rows, x, y, s, pal, alpha) {
    pal = pal || C;
    if (alpha !== undefined) { ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); }
    for (var j = 0; j < rows.length; j++) {
      for (var i = 0; i < rows[j].length; i++) {
        var c = rows[j].charAt(i);
        if (c !== ".") {
          ctx.fillStyle = pal[c] || c;
          ctx.fillRect(Math.round((x + i) * s), Math.round((y + j) * s), s, s);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function dot(ctx, x, y, s, color, size) {
    size = size || 1;
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x * s), Math.round(y * s), size * s, size * s);
  }

  // ---------------------------------------------------------------------
  // Âm thanh 8-bit (WebAudio, không cần file)
  // ---------------------------------------------------------------------
  var audio = null;
  var muted = false;
  // 1.25.3: cài đặt riêng máy qua GardenPrefs (config của add-on; localStorage mất khi tắt Anki)
  function pget(k) { try { return typeof GardenPrefs !== "undefined" ? GardenPrefs.get(k) : localStorage.getItem(k); } catch (e) { return null; } }
  function pset(k, v) { try { if (typeof GardenPrefs !== "undefined") { GardenPrefs.set(k, v); } else { localStorage.setItem(k, v); } } catch (e) { /* bỏ qua */ } }
  muted = pget("kb-muted") === "1";

  function soundOn() { return cfg.sound && !muted; }

  function tones(seq, type, vol) {
    if (!soundOn()) { return; }
    try {
      if (!audio) {
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) { return; }
        audio = new AC();
      }
      if (audio.state === "suspended") { audio.resume(); }
      var t = audio.currentTime + 0.01;
      for (var i = 0; i < seq.length; i++) {
        var f = seq[i][0], d = seq[i][1];
        if (f > 0) {
          var o = audio.createOscillator(), g = audio.createGain();
          o.type = type || "square";
          o.frequency.setValueAtTime(f, t);
          g.gain.setValueAtTime(vol || 0.05, t);
          g.gain.exponentialRampToValueAtTime(0.0008, t + d);
          o.connect(g); g.connect(audio.destination);
          o.start(t); o.stop(t + d + 0.02);
        }
        t += d * 0.9;
      }
    } catch (e) { /* không có âm thanh cũng được */ }
  }

  var SFX = {
    flip: function () { tones([[784, 0.05]], "triangle", 0.06); },
    again: function () { tones([[392, 0.09], [311, 0.16]], "triangle", 0.07); },
    hard: function () { tones([[523, 0.08], [587, 0.1]]); },
    good: function () { tones([[659, 0.07], [880, 0.12]]); },
    easy: function () { tones([[659, 0.06], [880, 0.06], [1175, 0.14]]); },
    coin: function () { tones([[988, 0.07], [1319, 0.22]], "square", 0.04); },
    stage: function () { tones([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.24]]); },
    harvest: function () { tones([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.1], [1319, 0.08], [1568, 0.3]]); },
    combo: function () { tones([[880, 0.05], [1109, 0.05], [1319, 0.12]], "square", 0.04); },
    boop: function () { tones([[1047, 0.05], [1397, 0.08]], "triangle", 0.07); },
    done: function () { tones([[523, 0.1], [659, 0.1], [784, 0.1], [659, 0.1], [1047, 0.3]], "triangle", 0.07); }
  };

  function play(name) { if (SFX[name]) { SFX[name](); } }

  // ---------------------------------------------------------------------
  // Linh vật StackChan (màn hình đen, mắt trắng)
  // ---------------------------------------------------------------------
  var MS = 3, MW = 20, MH = 17, TOP = 4;     // TOP: chỗ trống phía trên cho mũ
  var mascot = { mood: "idle", until: 0, blinkAt: 0, look: 0, lookUntil: 0, lastAct: Date.now() };

  // ---- Tủ đồ: mũ / phụ kiện mặt / cổ / vỏ. Lưới 20 cột thẳng hàng với thân hộp;
  //      dy = hàng bắt đầu so với đỉnh hộp; viền đen tự thêm (trừ đồ đeo trên màn hình).
  var WEAR_PAL = {
    k: "#1b1b2f", w: "#ffffff", y: "#ffd23f", i: "#e9b949", o: "#ff9f1c", p: "#ff7fa0", P: "#ffc4d6",
    r: "#ff4f6d", R: "#c21f3a", d: "#3d8bff", l: "#8fd3ff", g: "#3ccb5e", G: "#2e8b3a", h: "#f5b971",
    t: "#e2a46a", c: "#fff2b3", n: "#2b2b44", b: "#a0603a"
  };
  var WEAR_ART = {
    leaf: { dy: -5, rows: ["..........gg........", "......gg..gGg.......", ".....gGgg.g.........", "........ggg.........", ".........g.........."] },
    hachimaki: { dy: -2, rows: [".ww.................", "..ww................", "....................", "wwwwwwwwwrrwwwwwwwww", "wwwwwwwwwrrwwwwwwwww"] },
    catears: { dy: -4, rows: ["..s..............s..", "..ss............ss..", "..sPs..........sPs..", "..sPPs........sPPs.."], shellColor: true },
    straw: { dy: -5, rows: ["......hhthhhhh......", ".....hhhhhhthhh.....", ".....hthhhhhhhh.....", ".....rrrrrrrrrr.....", "hhhhhthhhhhhhthhhhhh", ".hhhhhhhhthhhhhhhhh."] },
    santa: { dy: -6, rows: ["...............ww...", "............rrrww...", "..........rrrrr.....", ".......rrrrrrrr.....", ".....rrrrrrrrrrr....", "..wwwwwwwwwwwwwwww..", "..wwwwwwwwwwwwwwww.."] },
    nonla: { dy: -5, rows: [".........cc.........", "........cccc........", "......cchccccc......", ".....ccccccchcc.....", "...cchccccccccccc...", ".ccccccchccccccchcc.", "cccccccccccccccccccc"] },
    grad: { dy: -5, rows: ["........nnnn........", "..nnnnnnnnnnnnnnnn..", "....nnnnnnnnnnnnnny.", ".....nnnnnnnnnn...y.", ".....nnnnnnnnnn...y.", "..................yy"] },
    crown: { dy: -5, rows: ["....y....yy....y....", "....yy..yyyy..yy....", "....yyyyyyyyyyyy....", "....yryyydyyyyry....", "....iiiiiiiiiiii...."] },
    glasses: { dy: 4, flat: true, rows: ["....iiiiii.iiiiii...", "....i....iii....i...", "....i....i.i....i...", "....i....i.i....i...", "....iiiiii.iiiiii..."] },
    bandaid: { dy: 8, flat: true, rows: ["..............hh....", ".............hch....", "............hh......"] },
    bow: { dy: 12, rows: ["......rr....rr......", "......rrrRRrrr......", "......rr....rr......"] },
    scarf: { dy: 12, rows: ["rrrrrrrrrrrrrrrrrrrr", "RRrRRrRRrRRrRRrRRrRR", "...rr...............", "...rR...............", "...rr..............."] },
    bell: { dy: 13, rows: ["rrrrrrrrrrrrrrrrrrrr", ".........yy.........", "........yyyy........", ".........kk........."] }
  };
  var SHELL = { sky: ["#cde9ff", "#86bde8"], matcha: ["#d5edb8", "#93c26c"], sakura: ["#ffd9e6", "#ff9fbf"], gold: ["#ffe58a", "#d9a92e"] };
  var FACE_MOODS = { pout: ["sad"], wink: ["happy"], cry: ["sad"], surprise: ["think"], kira: ["happy", "star"],
    heart: ["happy", "star"], cool: ["star"] };
  var BOUNCY = { happy: 1, star: 1, heart: 1, wink: 1, kira: 1, cool: 1 };
  var wearCache = {};
  function wearRows(id) {
    if (id && typeof id === "object") {     // 1.31: hình đang vẽ ở Xưởng {rows, dy} — vẽ đúng như vẽ, không thêm viền
      return id.rows && id.rows.length ? { dy: id.dy || 0, rows: id.rows, pal: craftPal() } : null;
    }
    if (/^w\d/.test(String(id))) {           // 1.31: món tự vẽ (bảng 32 màu của Xưởng, không thêm viền)
      var m = mineItems()[id];               // (danh mục đổi → bỏ hình cũ trong wearCache)
      if (wearCache[id]) { return wearCache[id]; }
      if (!m || !m.rows || !m.rows.length) { return null; }
      wearCache[id] = { dy: m.dy || 0, rows: m.rows, pal: craftPal() };
      return wearCache[id];
    }
    if (wearCache[id]) { return wearCache[id]; }
    var a = WEAR_ART[id];
    if (!a) { return null; }
    var rows = a.rows.map(function (r) { return r.split(""); });
    if (!a.flat) {   // thêm viền đen (lưới rộng thêm 1 hàng trên/dưới)
      var w = rows[0].length;
      rows.unshift(new Array(w).fill(".")); rows.push(new Array(w).fill("."));
      var out = rows.map(function (r) { return r.slice(); });
      for (var j = 0; j < rows.length; j++) {
        for (var i = 0; i < w; i++) {
          if (rows[j][i] !== ".") { continue; }
          if ((rows[j - 1] && rows[j - 1][i] !== ".") || (rows[j + 1] && rows[j + 1][i] !== ".") ||
              (rows[j][i - 1] && rows[j][i - 1] !== ".") || (rows[j][i + 1] && rows[j][i + 1] !== ".")) { out[j][i] = "k"; }
        }
      }
      rows = out;
    }
    wearCache[id] = { dy: a.dy - (a.flat ? 0 : 1), rows: rows.map(function (r) { return r.join(""); }), shellColor: a.shellColor };
    return wearCache[id];
  }
  // 1.31: đồ tự vẽ (catalog.mywears: {id, slot, rows, dy, hex}) — món có sẵn và món tự vẽ dùng chung một bảng "đang mặc"
  var mineList = null, mineMap = {}, mineSigStr = "";
  function mineItems() {
    var d = G && G.data && G.data();
    var list = (d && d.catalog && d.catalog.mywears) || [];
    if (list !== mineList) {
      mineList = list; mineMap = {};
      list.forEach(function (e) { mineMap[e.id] = e; });
      mineSigStr = list.map(function (e) { return e.id + ":" + (e.px || "") + ":" + (e.c || []).join(""); }).join(",");
      Object.keys(wearCache).forEach(function (k) { if (/^w\d/.test(k)) { delete wearCache[k]; } });
    }
    return mineMap;
  }
  function craftPal() {
    var d = G && G.data && G.data();
    return (d && d.catalog && d.catalog.craft && d.catalog.craft.palette) || WEAR_PAL;
  }
  function walletWear() {
    var d = G && G.data && G.data();
    var w = (d && d.wallet && d.wallet.wear) || null;
    var mine = d && d.wallet && d.wallet.more && d.wallet.more.mywear;
    if (!mine || !mine.on || !Object.keys(mine.on).length) { return w; }
    return Object.assign({}, w || {}, { on: Object.assign({}, (w && w.on) || {}, mine.on) });
  }
  // vỏ: id có sẵn → 2 màu; id tự vẽ → màu đã chọn; đối tượng {hex} (Xưởng đang xem trước)
  function shellOf(id) {
    if (!id) { return null; }
    if (typeof id === "object") { return id.hex || null; }
    if (SHELL[id]) { return SHELL[id]; }
    var m = mineItems()[id];
    return m && m.hex ? m.hex : null;
  }
  // Biểu cảm đã mua & đang bật → thay cho biểu cảm thường (khoảng 60% số lần)
  function variantFor(mood) {
    var w = walletWear();
    if (!w || !w.faces || !w.faces.length) { return mood; }
    var d = G && G.data && G.data();
    var map = {};
    ((d && d.catalog && d.catalog.faces) || []).forEach(function (f) { map[f.id] = f.moods; });
    var opts = w.faces.filter(function (f) {
      return (w.faces_off || []).indexOf(f) < 0 && (map[f] || FACE_MOODS[f] || []).indexOf(mood) >= 0;
    });
    if (!opts.length || Math.random() > 0.6) { return mood; }
    return opts[Math.floor(Math.random() * opts.length)];
  }

  var SAY = {
    again: ["ドンマイ！", "Không sao, lần sau nhớ!", "もう一回！"],
    hard: ["がんばった！", "Cố lên nè!"],
    good: ["いいね！", "Giỏi quá!", "その調子！"],
    easy: ["すごい！", "Thuộc làu luôn!", "天才！"],
    poke: ["こんにちは！", "Tưới cây thôi!", "がんばって！", "Hôm nay học gì nè?", "えへへ"],
    done: ["おつかれさま！", "Vườn no nước rồi!"],
    sleep: ["zzz…"]
  };

  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }

  var sayTimer = null;
  function say(text, ms) {
    var b = $("kb-say");
    if (!b) { return; }
    if (typeof GardenUI !== "undefined" && GardenUI.allow && !GardenUI.allow("mascot")) { return; }   // 1.14: tắt linh vật nói
    b.textContent = text;
    b.hidden = false;
    b.classList.remove("kb-pop");
    void b.offsetWidth;
    b.classList.add("kb-pop");
    clearTimeout(sayTimer);
    sayTimer = setTimeout(function () { b.hidden = true; }, ms || 1800);
  }

  function setMood(mood, ms) {
    mascot.mood = variantFor(mood);
    mascot.until = ms ? Date.now() + ms : 0;
    mascot.lastAct = Date.now();
  }

  // 1.15: chỉ vẽ lại khi mặt thật sự đổi (chớp mắt, nhún, z bay…) — đứng yên thì không tạo khung hình mới
  var faceSig = "";
  function faceQuantum(mood, now) {
    if (mood === "sleep") { return reduced ? 0 : Math.floor(now / 100); }
    if (mood === "idle") { return (now % 4200) < 140 ? 1 : 0; }
    if (mood === "cry") { return Math.floor(now / 140) % 3; }
    if (mood === "kira") { return Math.floor(now / 220) % 4 + "," + (reduced ? 0 : Math.floor(now / 160) % 2); }
    if (mood === "wink") { return Math.floor(now / 300) % 2 + "," + (reduced ? 0 : Math.floor(now / 160) % 2); }
    return !reduced && BOUNCY[mood] ? Math.floor(now / 160) % 2 : 0;
  }
  function drawMascot(now) {
    var cv = $("kb-mascot");
    if (!cv) { return; }

    if (mascot.until && now > mascot.until) { mascot.mood = "idle"; mascot.until = 0; }
    var mood = mascot.mood;
    if (mood === "idle" && now - mascot.lastAct > 90000) { mood = "sleep"; }

    var lx = 0;
    if (mood === "idle") {
      if (now > mascot.lookUntil) {
        mascot.look = Math.random() < 0.3 ? (Math.random() < 0.5 ? -1 : 1) : 0;
        mascot.lookUntil = now + 1500 + Math.random() * 2500;
      }
      lx = mascot.look;
    }
    var ww = walletWear();
    mineItems();
    var sig = mood + "|" + lx + "|" + faceQuantum(mood, now) + "|" + cv.width + "x" + cv.height + "|" + JSON.stringify((ww && ww.on) || {}) + "|" + mineSigStr;
    if (sig === faceSig) { return; }
    faceSig = sig;
    var ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.translate(0, TOP * MS);
    paintFace(ctx, MS, mood, now, lx);
    ctx.restore();
  }

  // Vẽ mặt StackChan tại gốc toạ độ hiện tại, mỗi pixel nghệ thuật = s px.
  function paintFace(ctx, s, mood, now, lx, wearOn) {
    lx = lx || 0;
    if (wearOn === undefined) { var ww = walletWear(); wearOn = (ww && ww.on) || {}; }
    wearOn = wearOn || {};
    var shell = shellOf(wearOn.shell);
    var bob = 0;
    if (!reduced) {
      if (BOUNCY[mood]) { bob = Math.floor(now / 160) % 2; }
      else if (mood === "sleep") { bob = Math.floor(now / 900) % 2; }
    }
    var oy = 1 - bob;

    // thân hộp
    ctx.fillStyle = C.k;
    ctx.fillRect(1 * s, oy * s, (MW - 2) * s, MH * s - s);
    ctx.fillRect(0, (oy + 1) * s, MW * s, (MH - 3) * s);
    ctx.fillStyle = shell ? shell[0] : C.s;
    ctx.fillRect(1 * s, (oy + 1) * s, (MW - 2) * s, (MH - 3) * s);
    ctx.fillStyle = shell ? shell[1] : C.S;
    ctx.fillRect(1 * s, (oy + MH - 3) * s, (MW - 2) * s, s);
    // màn hình
    ctx.fillStyle = "#111122";
    ctx.fillRect(3 * s, (oy + 3) * s, (MW - 6) * s, (MH - 8) * s);

    var blink = mood === "idle" && (now % 4200) < 140;
    var W = C.w;
    var e1 = 6 + lx, e2 = 12 + lx, ey = oy + 5;

    if (mood === "sleep") {
      for (var i = 0; i < 3; i++) { dot(ctx, e1 - 1 + i, ey + 2, s, W); dot(ctx, e2 - 1 + i, ey + 2, s, W); }
      dot(ctx, 9, ey + 5, s, W); dot(ctx, 10, ey + 5, s, W);
      var zt = (now / 1000) % 2;
      ctx.globalAlpha = zt < 1 ? zt : 2 - zt;
      ctx.fillStyle = C.d;
      ctx.font = "bold " + (9 + Math.floor(zt * 3)) + "px monospace";
      ctx.fillText("z", 15 * s, (oy + 3 - zt * 2) * s);
      ctx.globalAlpha = 1;
    } else if (mood === "happy") {
      [e1, e2].forEach(function (x) { dot(ctx, x - 1, ey + 2, s, W); dot(ctx, x, ey + 1, s, W); dot(ctx, x + 1, ey + 2, s, W); });
      dot(ctx, 8, ey + 5, s, W); dot(ctx, 11, ey + 5, s, W); dot(ctx, 9, ey + 6, s, W); dot(ctx, 10, ey + 6, s, W);
      dot(ctx, 4, ey + 4, s, C.p); dot(ctx, 15, ey + 4, s, C.p);
    } else if (mood === "star") {
      [e1, e2].forEach(function (x) {
        dot(ctx, x, ey, s, C.y); dot(ctx, x - 1, ey + 1, s, C.y); dot(ctx, x, ey + 1, s, W);
        dot(ctx, x + 1, ey + 1, s, C.y); dot(ctx, x, ey + 2, s, C.y);
      });
      for (var m = 8; m <= 11; m++) { dot(ctx, m, ey + 5, s, W); }
      dot(ctx, 9, ey + 6, s, C.p); dot(ctx, 10, ey + 6, s, C.p);
      dot(ctx, 4, ey + 4, s, C.p); dot(ctx, 15, ey + 4, s, C.p);
    } else if (mood === "sad") {
      dot(ctx, 5, ey, s, W); dot(ctx, 6, ey + 1, s, W); dot(ctx, 5, ey + 2, s, W);
      dot(ctx, 13, ey, s, W); dot(ctx, 12, ey + 1, s, W); dot(ctx, 13, ey + 2, s, W);
      dot(ctx, 8, ey + 6, s, W); dot(ctx, 9, ey + 5, s, W); dot(ctx, 10, ey + 6, s, W); dot(ctx, 11, ey + 5, s, W);
      dot(ctx, 17, oy + 2, s, C.l); dot(ctx, 17, oy + 3, s, C.d);
    } else if (mood === "think") {
      dot(ctx, e1, ey + 2, s, W); dot(ctx, e1 + 1, ey + 2, s, W);
      dot(ctx, e2, ey + 1, s, W); dot(ctx, e2 + 1, ey + 1, s, W); dot(ctx, e2, ey + 2, s, W); dot(ctx, e2 + 1, ey + 2, s, W);
      dot(ctx, 9, ey + 5, s, W);
    } else if (mood === "heart") {
      [e1, e2].forEach(function (x) {
        dot(ctx, x - 1, ey, s, C.p); dot(ctx, x + 1, ey, s, C.p);
        for (var hx = -1; hx <= 1; hx++) { dot(ctx, x + hx, ey + 1, s, C.r); }
        dot(ctx, x, ey + 2, s, C.r);
      });
      dot(ctx, 8, ey + 5, s, W); dot(ctx, 11, ey + 5, s, W); dot(ctx, 9, ey + 6, s, W); dot(ctx, 10, ey + 6, s, W);
      dot(ctx, 4, ey + 4, s, C.p); dot(ctx, 15, ey + 4, s, C.p);
    } else if (mood === "wink") {
      dot(ctx, e1 - 1, ey + 2, s, W); dot(ctx, e1, ey + 1, s, W); dot(ctx, e1 + 1, ey + 2, s, W);
      for (var wr = 0; wr < 3; wr++) { dot(ctx, e2, ey + wr, s, W); dot(ctx, e2 + 1, ey + wr, s, W); }
      dot(ctx, 8, ey + 5, s, W); dot(ctx, 11, ey + 5, s, W); dot(ctx, 9, ey + 6, s, W); dot(ctx, 10, ey + 6, s, W);
      if (Math.floor(now / 300) % 2) { dot(ctx, 16, oy + 3, s, C.y); }
    } else if (mood === "surprise") {
      [e1, e2].forEach(function (x) {
        for (var sx = -1; sx <= 1; sx++) { dot(ctx, x + sx, ey - 1, s, W); dot(ctx, x + sx, ey + 2, s, W); }
        dot(ctx, x - 1, ey, s, W); dot(ctx, x - 1, ey + 1, s, W); dot(ctx, x + 1, ey, s, W); dot(ctx, x + 1, ey + 1, s, W);
      });
      dot(ctx, 9, ey + 4, s, W); dot(ctx, 10, ey + 4, s, W); dot(ctx, 8, ey + 5, s, W); dot(ctx, 11, ey + 5, s, W);
      dot(ctx, 9, ey + 6, s, W); dot(ctx, 10, ey + 6, s, W);
    } else if (mood === "cool") {
      for (var cx = 4; cx <= 15; cx++) { dot(ctx, cx, ey, s, C.k); }
      for (var cg = 4; cg <= 8; cg++) { dot(ctx, cg, ey + 1, s, C.k); dot(ctx, cg + 7, ey + 1, s, C.k); }
      dot(ctx, 5, ey, s, "#5a5a7a"); dot(ctx, 12, ey, s, "#5a5a7a");
      for (var cz = 4; cz <= 15; cz++) { dot(ctx, cz, ey - 1, s, "#3a3a55"); }
      dot(ctx, 9, ey + 5, s, W); dot(ctx, 10, ey + 5, s, W); dot(ctx, 11, ey + 4, s, W);
    } else if (mood === "cry") {
      for (var ci = 0; ci < 3; ci++) { dot(ctx, e1 - 1 + ci, ey + 1, s, W); dot(ctx, e2 - 1 + ci, ey + 1, s, W); }
      var tf = Math.floor(now / 140) % 3;
      [e1, e2 + 1].forEach(function (x) {
        dot(ctx, x, ey + 2, s, C.l); dot(ctx, x, ey + 3 + tf, s, C.d);
      });
      dot(ctx, 8, ey + 6, s, W); dot(ctx, 9, ey + 5, s, W); dot(ctx, 10, ey + 5, s, W); dot(ctx, 11, ey + 6, s, W);
    } else if (mood === "kira") {
      [e1, e2].forEach(function (x) {
        dot(ctx, x, ey, s, C.y); dot(ctx, x - 1, ey + 1, s, C.y); dot(ctx, x, ey + 1, s, W);
        dot(ctx, x + 1, ey + 1, s, C.y); dot(ctx, x, ey + 2, s, C.y);
      });
      dot(ctx, 8, ey + 5, s, W); dot(ctx, 11, ey + 5, s, W); dot(ctx, 9, ey + 6, s, W); dot(ctx, 10, ey + 6, s, W);
      var tw = Math.floor(now / 220) % 4;
      dot(ctx, [3, 16, 16, 3][tw], oy + [3, 3, 11, 11][tw], s, C.y);
    } else if (mood === "pout") {
      dot(ctx, e1 - 1, ey, s, W); dot(ctx, e1, ey + 1, s, W); dot(ctx, e1 - 1, ey + 2, s, W);
      dot(ctx, e2 + 2, ey, s, W); dot(ctx, e2 + 1, ey + 1, s, W); dot(ctx, e2 + 2, ey + 2, s, W);
      dot(ctx, 8, ey + 5, s, W); dot(ctx, 9, ey + 6, s, W); dot(ctx, 10, ey + 5, s, W); dot(ctx, 11, ey + 6, s, W);
      dot(ctx, 4, ey + 4, s, C.r); dot(ctx, 15, ey + 4, s, C.r);
    } else if (blink) {
      for (var b = 0; b < 2; b++) { dot(ctx, e1 + b, ey + 2, s, W); dot(ctx, e2 + b, ey + 2, s, W); }
      for (var q = 8; q <= 11; q++) { dot(ctx, q, ey + 5, s, W); }
    } else {
      for (var r = 0; r < 3; r++) {
        dot(ctx, e1, ey + r, s, W); dot(ctx, e1 + 1, ey + r, s, W);
        dot(ctx, e2, ey + r, s, W); dot(ctx, e2 + 1, ey + r, s, W);
      }
      for (var n = 8; n <= 11; n++) { dot(ctx, n, ey + 5, s, W); }
    }
    // đồ mặc: cổ → mặt → đầu
    ["neck", "face", "head"].forEach(function (slot) {
      var id = wearOn[slot];
      if (slot === "face" && mood === "cool") { return; }    // kính ngầu thay cho kính thường
      var a = id && wearRows(id);
      if (!a) { return; }
      var pal = a.pal || (a.shellColor ? Object.assign({}, WEAR_PAL, { s: shell ? shell[0] : C.s }) : WEAR_PAL);
      spr(ctx, a.rows, 0, oy + a.dy, s, pal);
    });
  }

  // ---------------------------------------------------------------------
  // Chậu cây trong bảng ôn
  // ---------------------------------------------------------------------
  var PS = 3, PW = 44, PH = 24, TILE_X = 22, TILE_Y = 3;
  var pot = { nid: null, nextNid: null, busyUntil: 0, hopAt: 0, shakeAt: 0, canFrom: 0, canTo: 0, cloudFrom: 0, cloudTo: 0 };
  var potParts = [];
  var fieldParts = [];

  function plantOf(nid) {
    var d = G && G.data();
    if (!d || !d.plants) { return null; }
    for (var i = 0; i < d.plants.length; i++) { if (d.plants[i].nid === nid) { return { p: d.plants[i], i: i }; } }
    return null;
  }

  function drawPot(now) {
    var cv = $("kb-pot");
    if (!cv || !G) { return; }
    var ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    // trời + cỏ (theo giờ & thời tiết). 1.23 (người dùng: "buổi tối … hơi tối nên nhìn không đẹp lắm"): chậu cây
    // nhỏ ở góc bảng ôn sáng hơn cảnh sân lúc tối — trời ngả tím nhạt, cỏ xanh dịu, lớp tối phủ chỉ còn nhẹ
    var sk = typeof GardenSky !== "undefined" ? GardenSky.state() : null;
    var dusk = sk ? Math.max(0, Math.min(1, (0.8 - sk.light) / 0.55)) : 0;      // 0 = ngày, 1 = đêm
    ctx.fillStyle = sk ? mixHex(sk.bottom, "#7d86c9", 0.5 * dusk) : "#bfe9ff";
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = sk ? mixHex(sk.ground, "#5ed35e", 0.45 * dusk) : "#5ed35e";
    ctx.fillRect(0, 16 * PS, cv.width, cv.height);
    var grass = sk ? mixHex(sk.grass, "#45bf4a", 0.45 * dusk) : "#45bf4a";
    for (var gx = 1; gx < PW; gx += 5) { dot(ctx, gx, 17 + (gx % 3), PS, grass); }

    if (pot.nextNid !== null && now > pot.busyUntil) {
      pot.nid = pot.nextNid; pot.nextNid = null; pot.hopAt = now; potInfo();
    }
    var found = plantOf(pot.nid);
    if (!found) { return; }
    var p = found.p;

    var hop = 0, shake = 0;
    var th = now - pot.hopAt;
    if (th < 420) { hop = Math.round(3 * Math.sin(Math.PI * th / 420)); }
    var ts = now - pot.shakeAt;
    if (ts < 420) { shake = Math.round(Math.sin(ts / 30) * (1 - ts / 420)); }

    G.drawSoil(ctx, TILE_X, TILE_Y, p.nid, p.wilted, PS);
    var art = G.art ? G.art(p) : { rows: G.sprites[p.stage], pal: p.wilted ? G.dry : G.pal };
    G.drawSprite(ctx, art.rows, TILE_X + 1 + shake, TILE_Y + 4 - hop, PS, art.pal);
    if (p.thirsty && now > pot.canTo) {
      spr(ctx, ["..k..", ".kdk.", "kdddk", "kdwdk", ".kkk."], TILE_X + 14, TILE_Y - 2 + (Math.floor(now / 400) % 2), PS);
    }

    // bình tưới
    if (now < pot.canTo) {
      var k = (now - pot.canFrom) / (pot.canTo - pot.canFrom);
      var ang = -0.15 - 0.5 * Math.min(1, k * 3);
      var slide = Math.min(1, k * 4);
      ctx.save();
      ctx.translate((4 + slide * 4) * PS, 9 * PS);
      ctx.rotate(ang);
      spr(ctx, CAN, -2, -6, PS);
      ctx.restore();
    }
    // mây mưa
    if (now < pot.cloudTo) {
      var kc = (now - pot.cloudFrom) / (pot.cloudTo - pot.cloudFrom);
      var a = kc < 0.15 ? kc / 0.15 : (kc > 0.85 ? (1 - kc) / 0.15 : 1);
      spr(ctx, CLOUD, TILE_X + 3, 1, PS, null, a);
    }
    stepParts(ctx, potParts, PS, now);
    if (sk && (sk.rain || sk.snow)) {
      ctx.fillStyle = sk.snow ? "#ffffff" : "#4f8fd8";
      for (var ri = 0; ri < 14; ri++) {
        var rx = (ri * 37.7 + now * (sk.snow ? 0.002 : 0.012)) % PW, ry = (ri * 19.3 + now * (sk.snow ? 0.01 : 0.06)) % PH;
        ctx.fillRect(Math.round(rx * PS), Math.round(ry * PS), sk.snow ? PS : 1, sk.snow ? PS : PS * 2);
      }
    }
    if (sk && sk.light < 0.55) {      // 1.23: phủ tối nhẹ hơn (trước 0,7 → đêm phủ ~23 %, nay ~8 %)
      ctx.globalAlpha = (0.55 - sk.light) * 0.25; ctx.fillStyle = "#1b1b4a"; ctx.fillRect(0, 0, cv.width, cv.height); ctx.globalAlpha = 1;
    }
  }
  function mixHex(a, b, k) {          // trộn hai màu #rrggbb (k = 0 → a, 1 → b)
    if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b) || !(k > 0)) { return a; }
    k = Math.min(1, k);
    var o = "#";
    for (var i = 1; i < 7; i += 2) {
      var v = Math.round(parseInt(a.substr(i, 2), 16) * (1 - k) + parseInt(b.substr(i, 2), 16) * k);
      o += (v < 16 ? "0" : "") + v.toString(16);
    }
    return o;
  }

  // ---------------------------------------------------------------------
  // Hạt hiệu ứng
  // ---------------------------------------------------------------------
  function part(list, o) {
    if (reduced && o.kind !== "text") { return; }
    o.born = Date.now();
    o.vx = o.vx || 0; o.vy = o.vy || 0; o.g = o.g || 0;
    list.push(o);
    if (list.length > 220) { list.splice(0, list.length - 220); }
  }

  function stepParts(ctx, list, s, now) {
    for (var i = list.length - 1; i >= 0; i--) {
      var q = list[i];
      var age = now - q.born;
      if (q.delay && age < q.delay) { continue; }
      var t = (age - (q.delay || 0)) / 1000;
      if (t * 1000 > q.life) { list.splice(i, 1); continue; }
      var x = q.x + q.vx * t, y = q.y + q.vy * t + 0.5 * q.g * t * t;
      var k = t * 1000 / q.life;
      var fade = k > 0.7 ? (1 - k) / 0.3 : 1;
      if (q.kind === "drop") {
        dot(ctx, x, y, s, C.d); dot(ctx, x, y - 1, s, C.l);
      } else if (q.kind === "sparkle") {
        spr(ctx, (Math.floor(age / 120) % 2) ? STAR : TWINKLE, x - 2, y - 2, s, null, fade);
      } else if (q.kind === "heart") {
        spr(ctx, HEART, x - 3, y - 3, s, null, fade);
      } else if (q.kind === "coin") {
        spr(ctx, COIN, x - 3, y - 3, s, null, fade);
        ctx.globalAlpha = Math.max(0, fade);
        ctx.font = "bold " + (4 * s) + "px DotGothic16, monospace";
        ctx.lineWidth = s;
        ctx.strokeStyle = C.k;
        ctx.strokeText(q.text, (x + 4) * s, (y + 2) * s);
        ctx.fillStyle = C.y;
        ctx.fillText(q.text, (x + 4) * s, (y + 2) * s);
        ctx.globalAlpha = 1;
      } else if (q.kind === "conf") {
        ctx.globalAlpha = Math.max(0, fade);
        dot(ctx, x, y, s, q.color, (Math.floor(age / 90) % 2) ? 1 : 0.6);
        ctx.globalAlpha = 1;
      } else if (q.kind === "rain") {
        dot(ctx, x, y, s, C.d);
      }
    }
  }

  function burst(list, cx, cy, n, kind, speed) {
    for (var i = 0; i < n; i++) {
      var a = (Math.PI * 2 * i) / n + Math.random() * 0.4;
      var v = (speed || 14) * (0.6 + Math.random() * 0.6);
      part(list, { kind: kind, x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, g: 18, life: 700 + Math.random() * 300 });
    }
  }

  var CONF = ["#ff4f6d", "#ffd23f", "#3d8bff", "#6be08a", "#ff9f1c", "#c77dff"];
  function confetti(list, w, n) {
    for (var i = 0; i < n; i++) {
      part(list, {
        kind: "conf", x: Math.random() * w, y: -2 - Math.random() * 6, vx: (Math.random() - 0.5) * 8,
        vy: 6 + Math.random() * 8, g: 14, life: 1600 + Math.random() * 700,
        color: CONF[i % CONF.length], delay: Math.random() * 300
      });
    }
  }

  // ---------------------------------------------------------------------
  // Hiệu ứng trên ruộng (bướm, lấp lánh, cây nhảy khi lên giai đoạn)
  // ---------------------------------------------------------------------
  var butterflies = [];
  var hops = {};          // idx -> thời điểm bắt đầu nhảy
  var nextTwinkle = 0;

  function fieldCanvas() {
    var fx = $("kb-fx"), base = $("kb-canvas");
    if (!fx || !base) { return null; }
    if (fx.width !== base.width || fx.height !== base.height) { fx.width = base.width; fx.height = base.height; }
    return fx;
  }

  function tileCenter(i) {
    var cols = G.cols();
    return { x: (i % cols) * G.TW + G.TW / 2, y: Math.floor(i / cols) * G.TH + 10 };
  }

  function chooseTarget(bf) {
    var d = G.data();
    if (!d || !d.plants || !d.plants.length) { return; }
    var good = [];
    for (var i = 0; i < d.plants.length; i++) { if (d.plants[i].stage >= 3 && !d.plants[i].wilted) { good.push(i); } }
    var list = good.length ? good : [Math.floor(Math.random() * d.plants.length)];
    var idx = list[Math.floor(Math.random() * list.length)];
    var c = tileCenter(idx);
    bf.tx = c.x + (Math.random() * 6 - 3);
    bf.ty = c.y - 6 + (Math.random() * 4 - 2);
    bf.rest = 0;
  }

  function syncButterflies() {
    var d = G && G.data();
    var n = 0;
    if (cfg.effects && !reduced && d && d.plants && d.plants.length) {
      var flowers = 0;
      for (var i = 0; i < d.plants.length; i++) { if (d.plants[i].stage >= 3) { flowers++; } }
      n = Math.min(4, 1 + Math.floor(flowers / 8));
    }
    while (butterflies.length > n) { butterflies.pop(); }
    while (butterflies.length < n) {
      var bf = { x: Math.random() * 60, y: Math.random() * 30, tx: 0, ty: 0, rest: 0, ph: Math.random() * 6, col: CONF[butterflies.length % CONF.length] };
      chooseTarget(bf);
      butterflies.push(bf);
    }
  }

  var fireflies = [];
  // 1.14: Giao diện → ruộng "đứng yên" / "mờ": vẽ một khung tĩnh (không hạt, không bướm) rồi thôi; "ẩn": không vẽ
  var stillField = { sig: "", at: 0 };
  function uiGet(k) { return typeof GardenUI !== "undefined" && GardenUI.get ? GardenUI.get(k) : (k === "field" ? "full" : "on"); }
  function drawField(now, dt) {
    var cv = fieldCanvas();
    if (!cv || !G) { return; }
    var fm = uiGet("field");
    if (fm === "hide") { return; }
    var still = fm !== "full";
    if (still) {
      var sig = cv.width + "x" + cv.height + "|" + fm;
      if (stillField.sig === sig && now - stillField.at < 30000) { return; }
      stillField.sig = sig; stillField.at = now;
    } else { stillField.sig = ""; }
    var motionOk = cfg.effects && !reduced && !still;
    var weatherOk = uiGet("weather") !== "off";
    var ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, cv.width, cv.height);
    var s = G.SCALE, d = G.data();
    if (!d || !d.plants) { return; }
    var sk = typeof GardenSky !== "undefined" ? GardenSky.state() : null;
    var nightK = sk ? Math.max(0, 0.6 - sk.light) / 0.45 : 0;    // 0 ban ngày → ~1 ban đêm

    // cây nhảy lên khi vừa lên giai đoạn
    Object.keys(hops).forEach(function (key) {
      var i = Number(key), t = now - hops[key];
      if (t > 600 || i >= d.plants.length) { delete hops[key]; return; }
      var p = d.plants[i], cols = G.cols();
      var ox = (i % cols) * G.TW, oy = Math.floor(i / cols) * G.TH;
      var h = Math.round(4 * Math.sin(Math.PI * t / 600));
      G.drawGrass(ctx, ox, oy, p.nid, s);
      G.drawSoil(ctx, ox, oy, p.nid, p.wilted, s);
      var hart = G.art ? G.art(p) : { rows: G.sprites[p.stage], pal: p.wilted ? G.dry : G.pal };
      G.drawSprite(ctx, hart.rows, ox + 1, oy + 4 - h, s, hart.pal);
    });

    if (motionOk) {
      // lấp lánh trên cây ra quả
      if (now > nextTwinkle) {
        nextTwinkle = now + 900 + Math.random() * 1400;
        var fruits = [];
        for (var i = 0; i < d.plants.length; i++) { if (d.plants[i].stage === 4 && !d.plants[i].wilted) { fruits.push(i); } }
        if (fruits.length) {
          var c = tileCenter(fruits[Math.floor(Math.random() * fruits.length)]);
          part(fieldParts, { kind: "sparkle", x: c.x - 5 + Math.random() * 10, y: c.y - 6 + Math.random() * 6, life: 700 });
        }
      }
      // bướm (chỉ bay khi trời sáng, không mưa)
      var bflyOk = !sk || (sk.light >= 0.5 && !sk.rain && !sk.snow);
      for (var b = 0; b < butterflies.length && bflyOk; b++) {
        var bf = butterflies[b];
        var dx = bf.tx - bf.x, dy = bf.ty - bf.y, dist = Math.sqrt(dx * dx + dy * dy);
        var resting = dist < 1.5;
        if (resting) {
          bf.rest += dt;
          if (bf.rest > 2200 + (b * 700)) { chooseTarget(bf); }
        } else {
          var sp = Math.min(dist, dt * 0.02);
          bf.x += dx / dist * sp;
          bf.y += dy / dist * sp + Math.sin(now / 160 + bf.ph) * 0.25;
        }
        var frame = resting ? (Math.floor(now / 500 + b) % 3 === 0 ? 0 : 1) : Math.floor(now / 120 + b) % 2;
        spr(ctx, BFLY[frame], bf.x - 2, bf.y - 2, s, { p: bf.col, k: C.k });
      }
    }
    if (!still) { stepParts(ctx, fieldParts, s, now); }
    if (motionOk && uiGet("sky") !== "off" && typeof GardenSeason !== "undefined" && GardenSeason) {   // cánh hoa / lá / tuyết rơi theo mùa
      GardenSeason.drawField(ctx, cv.width, cv.height, now, s);
    }
    if (motionOk && uiGet("joy") !== "off" && typeof GardenJoy !== "undefined") {    // 1.14: hiệu ứng thành tích trên ruộng
      GardenJoy.drawField(ctx, cv.width, cv.height, now, s, tileCenter);
    }
    if (!sk) { return; }
    var W = cv.width, Hh = cv.height;
    // ban đêm: phủ tối nhẹ + đom đóm
    if (nightK > 0.02) {
      ctx.globalAlpha = sk.fieldDark; ctx.fillStyle = "#0b0b2a"; ctx.fillRect(0, 0, W, Hh); ctx.globalAlpha = 1;
      if (motionOk && !sk.rain && !sk.snow) {
        var want = Math.min(22, 4 + Math.floor(d.plants.length / 25) + Math.floor(W * Hh / 150000));   // ruộng to → nhiều đom đóm hơn
        while (fireflies.length < want) { fireflies.push({ x: Math.random() * W, y: Math.random() * Hh, a: Math.random() * 6, v: 0.3 + Math.random() * 0.4 }); }
        fireflies.length = want;
        for (var fi = 0; fi < fireflies.length; fi++) {
          var ff = fireflies[fi];
          ff.a += dt * 0.0012 * ff.v * 3;
          ff.x = (ff.x + Math.cos(ff.a) * dt * 0.02 + W) % W; ff.y = (ff.y + Math.sin(ff.a * 1.3) * dt * 0.015 + Hh) % Hh;
          var glow = 0.4 + 0.6 * Math.abs(Math.sin(now / 600 + fi));
          ctx.globalAlpha = glow * 0.35; ctx.fillStyle = "#fff6a8"; ctx.fillRect(Math.round(ff.x) - 3, Math.round(ff.y) - 3, 9, 9);
          ctx.globalAlpha = glow; ctx.fillStyle = "#ffe95c"; ctx.fillRect(Math.round(ff.x), Math.round(ff.y), 3, 3);
        }
        ctx.globalAlpha = 1;
      }
    }
    // mưa / tuyết / chớp trên ruộng
    if ((sk.rain || sk.snow) && motionOk && weatherOk) {
      var n = Math.min(260, Math.floor(W * Hh / (sk.snow ? 5200 : 2600) * (sk.rain || 1)));
      ctx.fillStyle = sk.snow ? "#ffffff" : (sk.light > 0.5 ? "#3d7fd0" : "#8fb4e8");
      for (var ri = 0; ri < n; ri++) {
        var sx = (ri * 97.13) % W, sy = (ri * 57.71) % Hh;
        var x = sk.snow ? (sx + Math.sin(now / 900 + ri) * 6 + now * 0.01) % W : (sx + now * 0.05) % W;
        var y = (sy + now * (sk.snow ? 0.03 : 0.42)) % Hh;
        if (sk.snow) { ctx.fillRect(Math.round(x), Math.round(y), 3, 3); } else { ctx.fillRect(Math.round(x), Math.round(y), 2, 9); }
      }
    }
    if (sk.flash > 0 && motionOk && weatherOk) { ctx.globalAlpha = 0.45 * (1 - sk.flash); ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, W, Hh); ctx.globalAlpha = 1; }
  }

  // ---------------------------------------------------------------------
  // Vòng lặp
  // ---------------------------------------------------------------------
  var last = 0, running = false;
  // Tiết kiệm CPU: ~30 khung/giây khi cửa sổ đang dùng, ~6 khung/giây khi ở nền.
  // 1.15: ba vòng vẽ (ruộng ở đây, sân ở home.js, nền mùa ở season.js) cùng bám một nhịp 30 khung/giây
  // theo thời điểm khung hình → vẽ chung một khung, trình duyệt ghép ít khung hơn (đỡ CPU khi không có GPU)
  var lastTick = -1;
  function loop(ts) {
    var now = Date.now();
    var tk = Math.floor(ts / 33.34), every = document.hasFocus() ? 1 : 5;
    if (Math.floor(tk / every) === lastTick) { window.requestAnimationFrame(loop); return; }
    lastTick = Math.floor(tk / every);
    var dt = last ? Math.min(200, ts - last) : 16;
    last = ts;
    if (!document.hidden) {
      drawMascot(now);
      var panel = $("kb-panel");
      if (panel && !panel.hidden) { drawPot(now); }
      drawField(now, dt);
    }
    window.requestAnimationFrame(loop);
  }

  function start() {
    if (running) { return; }
    running = true;
    var mc = $("kb-mascot");
    if (mc) {
      mc.width = MW * MS; mc.height = (MH + 1 + TOP) * MS;
      mc.addEventListener("click", function () {
        setMood("happy", 1400);
        say(pick(SAY.poke));
        play("boop");
      });
    }
    var pc = $("kb-pot");
    if (pc) { pc.width = PW * PS; pc.height = PH * PS; }
    var mute = $("kb-mute");
    if (mute) {
      mute.addEventListener("click", function () {
        muted = !muted;
        pset("kb-muted", muted ? "1" : "0");
        updateMute();
        if (!muted) { play("boop"); }
      });
      updateMute();
    }
    window.requestAnimationFrame(loop);
  }

  function updateMute() {
    var m = $("kb-mute");
    if (!m) { return; }
    m.hidden = !cfg.sound;
    m.textContent = muted ? "♪×" : "♪";
    m.setAttribute("aria-pressed", muted ? "false" : "true");
    m.title = muted ? "Bật âm thanh" : "Tắt âm thanh";
  }

  // ---------------------------------------------------------------------
  // Sự kiện từ garden.js
  // ---------------------------------------------------------------------
  var combo = 0;

  function setCombo(n) {
    combo = n;
    var el = $("kb-combo");
    if (!el) { return; }
    if (n >= 3) {
      el.textContent = "Combo ×" + n;
      el.hidden = false;
      el.classList.remove("kb-pop"); void el.offsetWidth; el.classList.add("kb-pop");
    } else {
      el.hidden = true;
    }
  }

  function potInfo() {
    var el = $("kb-pot-info");
    var found = plantOf(pot.nid);
    if (!el) { return; }
    if (!found) { el.textContent = ""; return; }
    var d = G.data();
    var p = found.p;
    el.textContent = d.stage_names[p.stage] + (p.wilted ? " · đang héo" : p.thirsty ? " · đang khát" : "");
  }

  return {
    init: function (helpers) { G = helpers; start(); },
    lib: {
      spr: spr, dot: dot, C: C, STAR: STAR, TWINKLE: TWINKLE, HEART: HEART, COIN: COIN,
      CAN: CAN, CLOUD: CLOUD, CONF: CONF, BFLY: BFLY, paintFace: paintFace, reduced: reduced,
      wearOn: function () { var w = walletWear(); return Object.assign({}, (w && w.on) || {}); },   // 1.31: đang mặc (có sẵn + tự vẽ)
      shellOf: shellOf, wearItem: function (id) { return mineItems()[id] || null; },
      FACE_W: MW, FACE_H: MH, FACE_TOP: TOP + 2
    },
    mood: function (m, ms) { setMood(m, ms); },
    _mood: function () { return mascot.mood; },   // cho test
    say: function (text, ms) { say(text, ms); },
    effectsOn: function () { return cfg.effects && !reduced; },
    soundAllowed: function () { return cfg.sound; },
    muted: function () { return muted; },
    setMuted: function (m) {
      muted = !!m;
      pset("kb-muted", muted ? "1" : "0");
      if (!muted) { play("boop"); }
    },
    config: function (c) {
      if (c) { cfg.effects = c.effects !== false; cfg.sound = c.sound !== false; }
      updateMute();
      syncButterflies();
    },
    rendered: function () { syncButterflies(); potInfo(); },
    sound: play,
    setActive: function (nid) {
      // Đang tưới cây cũ thì cho xem hết hiệu ứng rồi mới đổi sang cây mới.
      if (Date.now() < pot.busyUntil && pot.nid !== null) { pot.nextNid = nid; return; }
      if (nid !== pot.nid) { pot.hopAt = Date.now(); }
      pot.nid = nid; pot.nextNid = null;
      potInfo();
    },
    startReview: function () { setCombo(0); setMood("happy", 900); },
    flip: function () { play("flip"); setMood("think", 700); },
    rate: function (ease) {
      var now = Date.now();
      mascot.lastAct = now;
      if (!cfg.effects) {
        play(ease === 1 ? "again" : ease === 2 ? "hard" : ease === 3 ? "good" : "easy");
        return;
      }
      pot.busyUntil = now + (ease === 1 ? 1100 : 1300);
      if (ease === 1) {
        pot.cloudFrom = now; pot.cloudTo = now + 1100; pot.shakeAt = now + 250;
        for (var r = 0; r < 6; r++) {
          part(potParts, { kind: "rain", x: TILE_X + 5 + Math.random() * 9, y: 6, vy: 22, life: 450, delay: 150 + r * 110 });
        }
        setMood("sad", 1300); say(pick(SAY.again), 1300); play("again"); setCombo(0);
        return;
      }
      pot.canFrom = now; pot.canTo = now + 900;
      var drops = ease === 2 ? 5 : 9;
      for (var i = 0; i < drops; i++) {
        part(potParts, { kind: "drop", x: 14 + Math.random(), y: 6, vx: 10 + Math.random() * 5, vy: -2, g: 60, life: 520, delay: 160 + i * 60 });
      }
      pot.hopAt = now + 650;
      if (ease === 4) {
        for (var h = 0; h < 3; h++) {
          part(potParts, { kind: "heart", x: TILE_X + 6 + h * 4, y: TILE_Y + 8, vx: (h - 1) * 3, vy: -14, life: 1000, delay: 650 + h * 120 });
        }
      } else if (ease === 3) {
        burst(potParts, TILE_X + 9, TILE_Y + 8, 4, "sparkle", 10);
      }
      setMood("happy", 1100);
      if (Math.random() < 0.45) { say(pick(ease === 2 ? SAY.hard : ease === 3 ? SAY.good : SAY.easy), 1100); }
      play(ease === 2 ? "hard" : ease === 3 ? "good" : "easy");
      setCombo(combo + 1);
      if (combo > 0 && combo % 5 === 0) {
        setTimeout(function () {
          burst(potParts, TILE_X + 9, TILE_Y + 6, 10, "sparkle", 18);
          setMood("star", 1200); say("Combo ×" + combo + "！", 1200); play("combo");
        }, 500);
      }
    },
    // Python báo kết quả sau khi lưu: xu nhận được và giai đoạn mới
    celebrate: function (info) {
      if (!info) { return; }
      if (info.goal_bonus) {
        setTimeout(function () {
          setMood("star", 2400);
          say("目標達成！ Xong mục tiêu hôm nay +" + kbXu(info.goal_bonus) + " xu", 2600);
          play("harvest");
          var chip0 = $("kb-coins");
          if (chip0) { chip0.classList.remove("kb-bump"); void chip0.offsetWidth; chip0.classList.add("kb-bump"); }
          if (cfg.effects) { confetti(potParts, PW, 40); }
        }, 900);
      }
      var panelOpen = $("kb-panel") && !$("kb-panel").hidden;
      var found = plantOf(info.nid);
      potInfo();
      var chip = $("kb-coins");
      if (info.gained > 0 && chip) {
        chip.classList.remove("kb-bump"); void chip.offsetWidth; chip.classList.add("kb-bump");
      }
      if (!cfg.effects) {
        if (info.gained > 0) { play("coin"); }
        return;
      }
      var stageUp = info.new !== null && info.old !== null && info.new > info.old;
      if (info.gained > 0) {
        if (panelOpen) {
          part(potParts, { kind: "coin", x: TILE_X + 10, y: TILE_Y + 4, vy: -10, life: 1100, text: "+" + info.gained, delay: stageUp ? 300 : 700 });
        } else if (found) {
          var c0 = tileCenter(found.i);
          part(fieldParts, { kind: "coin", x: c0.x, y: c0.y - 4, vy: -10, life: 1100, text: "+" + info.gained });
        }
        setTimeout(function () { play("coin"); }, stageUp ? 250 : 650);
      }
      if (stageUp) {
        var harvest = info.new === 4;
        if (panelOpen) { pot.busyUntil = Math.max(pot.busyUntil, Date.now() + 1500); }
        setTimeout(function () {
          if (panelOpen) {
            pot.hopAt = Date.now();
            burst(potParts, TILE_X + 9, TILE_Y + 8, 12, "sparkle", 20);
            if (harvest) { confetti(potParts, PW, 40); }
          }
          if (found) {
            hops[found.i] = Date.now();
            var c = tileCenter(found.i);
            burst(fieldParts, c.x, c.y, 8, "sparkle", 16);
            if (harvest) {
              for (var i = 0; i < 24; i++) {
                part(fieldParts, { kind: "conf", x: c.x, y: c.y - 4, vx: (Math.random() - 0.5) * 40, vy: -20 - Math.random() * 20, g: 50, life: 1300, color: CONF[i % CONF.length] });
              }
            }
          }
          setMood("star", 1600);
          var d = G.data();
          var name = (found && found.p.word) || "";
          say((harvest ? "やった！ " : "わあ！ ") + name + " → " + d.stage_names[info.new], 2000);
          play(harvest ? "harvest" : "stage");
        }, 200);
      }
    },
    quests: function (q) {
      if (!q || (!(q.done && q.done.length) && !q.chest)) { return; }
      setTimeout(function () {
        var chip = $("kb-coins");
        if (chip) { chip.classList.remove("kb-bump"); void chip.offsetWidth; chip.classList.add("kb-bump"); }
        if (q.chest) {
          setMood("star", 3000);
          say("宝箱！ Mở rương: " + (q.chest.name || "xu") + " +" + kbXu(q.chest.coins) + " xu", 3200);
          play("harvest");
          if (cfg.effects) { confetti(potParts, PW, 50); }
        } else {
          setMood("star", 1800);
          say("Xong nhiệm vụ: " + q.done[0] + " +" + kbXu(q.coins) + " xu", 2400);
          play("coin");
        }
        var btn = $("kb-quest");
        if (btn) { btn.classList.remove("kb-pop"); void btn.offsetWidth; btn.classList.add("kb-pop"); }
      }, 1400);
    },
    done: function () {
      setMood("happy", 2500);
      say(pick(SAY.done), 2200);
      play("done");
      if (cfg.effects) { confetti(potParts, PW, 30); }
      setCombo(0);
    }
  };
})();
