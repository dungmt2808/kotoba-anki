/* ことば畑 – 1.26: màn chào khi mở vườn + hiệu ứng chuyển cảnh + Bảng tin làng.
   Python gửi data.greet (ai chào, tin cho màn chào, câu ngày lễ — event_core.py; null = không chào) và data.news
   (Tin làng: Hôm nay / Sắp tới + dòng cho thẻ Hôm nay). File này chỉ vẽ.

   - Màn chào: lần mở vườn đầu tiên mỗi ngày Anki (cài đặt "kb-greet-day" lưu theo máy qua GardenPrefs). Thú thân nhất
     chạy vào, nhảy vẫy + bong bóng (chào theo giờ trong vườn / câu ngày lễ, 1–3 tin hôm nay); tự vào vườn sau ~4 giây
     (rê chuột lên thì dừng đếm), bấm / phím bất kỳ để vào ngay.
   - Chuyển cảnh (⚙ → Màn chính → Chuyển cảnh): màn chào → vườn (vòng tròn khép rồi mở), mở vườn các lần sau (vòng tròn
     mở), đổi cảnh ◂ ▸ (dải lá / cánh hoa / tuyết theo giao diện mùa quét ngang — home.js gọi strip()), vào / ra Trong
     nhà (rèm), mở bảng Nhà / Trò chơi / Báo / Lịch hoa (bật nhẹ, lớp kb-panel-in). Kiểu Dịu mắt / Tắt hạt bay: chỉ mờ dần. Tắt: không có.
   Lớp phủ hiệu ứng không nhận chuột (pointer-events: none) — không chặn bấm. */
var GardenGreet = (function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const INK = "#1b1b2f";
  const PX = 8;                 // cỡ bậc thang của vòng tròn
  const GREET_MS = 4000;        // tự vào vườn sau chừng này (không tính lúc rê chuột lên màn chào)
  // 1.26.1 (người dùng: "thời gian chuyển cảnh nó đang bị nhanh quá, chậm lại một chút") — chậm hơn 1.26.0 khoảng 1,7 lần
  const T = { close: 450, open: 620, first: 650, fade: 480, out: 450 };
  let first = true;             // lần vẽ đầu tiên của trang (= vừa mở vườn)
  let greet = null;             // màn chào đang hiện
  let newsOpen = false;

  // ---------------------------------------------------------------- cài đặt
  function glob(k) { return typeof GardenUI !== "undefined" && GardenUI.glob ? GardenUI.glob(k) : "on"; }
  function mode() {
    if (glob("trans") === "off") { return "none"; }
    const calm = typeof GardenUI !== "undefined" && GardenUI.get && GardenUI.get("sky") === "off";    // Dịu mắt / Tắt hạt bay
    return calm ? "fade" : "full";
  }
  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
  function prefGet(k) { try { return typeof GardenPrefs !== "undefined" ? GardenPrefs.get(k) : null; } catch (e) { return null; } }
  function prefSet(k, v) { try { if (typeof GardenPrefs !== "undefined") { GardenPrefs.set(k, v); } } catch (e) { /* bỏ qua */ } }
  function skyNow() {
    return (typeof GardenSky !== "undefined" && GardenSky.state && GardenSky.state()) ||
      { top: "#8fd3ff", bottom: "#c4ecff", hills: "#7ed98a", ground: "#5ed35e", grass: "#45bf4a", light: 1, hour: 9, weather: "sunny" };
  }
  function mix(a, b, t) { return typeof GardenSky !== "undefined" && GardenSky.mix ? GardenSky.mix(a, b, t) : a; }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function fill(node, text) { if (typeof GardenIcons !== "undefined" && GardenIcons.fill) { GardenIcons.fill(node, text); } else { node.textContent = String(text).replace(/\[i:[a-z]+\]\s?/g, ""); } return node; }
  function anim(ms, draw, done) {
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      try { draw(t); } catch (e) { /* bỏ qua */ }
      if (t < 1) { requestAnimationFrame(step); } else if (done) { done(); }
    };
    requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- lớp phủ vòng tròn (cả cửa sổ)
  function veil() {
    let c = $("kb-trans");
    if (!c) { c = el("canvas", "kb-trans"); c.id = "kb-trans"; document.body.appendChild(c); }
    if (c.width !== window.innerWidth || c.height !== window.innerHeight) { c.width = window.innerWidth; c.height = window.innerHeight; }
    c.hidden = false;
    return c;
  }
  function veilOff() { const c = $("kb-trans"); if (c) { c.hidden = true; c.style.opacity = ""; } }
  // phủ màu mực ngoài vòng tròn (cx, cy, r), viền bậc thang PX
  function iris(c, cx, cy, r) {
    const x = c.getContext("2d"), W = c.width, H = c.height;
    x.globalAlpha = 1; x.fillStyle = INK; x.fillRect(0, 0, W, H);
    if (r <= 0) { return; }
    for (let y = Math.floor((cy - r) / PX) * PX; y < cy + r; y += PX) {
      const yy = y + PX / 2 - cy;
      if (Math.abs(yy) > r) { continue; }
      const dx = Math.floor(Math.sqrt(r * r - yy * yy) / PX) * PX;
      x.clearRect(Math.round(cx - dx), y, dx * 2, PX);
    }
  }
  function irisOpen(ms, cx, cy, done) {
    const c = veil(), R = Math.hypot(Math.max(cx, c.width - cx), Math.max(cy, c.height - cy)) + PX;
    anim(ms, (t) => iris(c, cx, cy, R * (1 - Math.pow(1 - t, 2))), () => { veilOff(); if (done) { done(); } });
  }
  function irisClose(ms, cx, cy, done) {
    const c = veil(), R = Math.hypot(Math.max(cx, c.width - cx), Math.max(cy, c.height - cy)) + PX;
    anim(ms, (t) => iris(c, cx, cy, R * (1 - t * t)), done);
  }
  function fadeIn(ms) {
    const c = veil(), x = c.getContext("2d");
    x.fillStyle = INK; x.fillRect(0, 0, c.width, c.height);
    anim(ms, (t) => { c.style.opacity = String(0.6 * (1 - t)); }, veilOff);
  }

  // ---------------------------------------------------------------- cảnh của màn chào
  function scene(ctx, W, H, st, g) {
    const hz = Math.round(H * 0.6);
    for (let b = 0; b < 12; b++) { ctx.fillStyle = mix(st.top, st.bottom, b / 11); ctx.fillRect(0, Math.floor(hz * b / 12), W, Math.ceil(hz / 12) + 1); }
    if (st.light < 0.6) {
      for (let i = 0; i < 140; i++) { ctx.fillStyle = i % 4 ? "#ffffff" : "#ffe9a8"; const s = i % 7 ? 3 : 5; ctx.fillRect((i * 137) % W, (i * 71) % Math.max(1, hz - 60), s, s); }
    } else {
      [[0.18, 0.16, 1.0], [0.72, 0.1, 0.8], [0.45, 0.24, 0.6]].forEach(([fx, fy, k]) => {
        const x = W * fx, y = H * fy, s = 8 * k; ctx.fillStyle = "#ffffff";
        ctx.fillRect(x, y + 2 * s, 14 * s, 3 * s); ctx.fillRect(x + 3 * s, y, 7 * s, 2 * s); ctx.fillRect(x - 3 * s, y + 3 * s, 4 * s, 2 * s);
      });
    }
    ctx.fillStyle = st.hills || "#7ed98a";
    for (let x = 0; x < W; x += 6) { const h = 50 + 28 * Math.sin(x / 140) + 16 * Math.sin(x / 55); ctx.fillRect(x, hz - h, 6, h); }
    ctx.fillStyle = st.ground || "#5ed35e"; ctx.fillRect(0, hz, W, H - hz);
    ctx.fillStyle = st.grass || "#45bf4a"; for (let i = 0; i < 260; i++) { ctx.fillRect((i * 173) % W, hz + 10 + (i * 97) % Math.max(1, H - hz - 20), 6, 6); }
    const L = typeof GardenHome !== "undefined" && GardenHome._lib ? GardenHome._lib() : null;
    const S = H < 700 ? 5 : 6;
    if (L) {
      const sp = (id, fx, fy) => { if (L.SPR[id]) { L.sprite(ctx, L.SPR[id], (W * fx) / S, (H * fy) / S, S); } };
      if (L.SPR.fence) {
        for (let x = -20; x < W * 0.3; x += 16 * S) { L.sprite(ctx, L.SPR.fence, x / S, (hz + 30) / S, S); }
        for (let x = W * 0.72; x < W + 20; x += 16 * S) { L.sprite(ctx, L.SPR.fence, x / S, (hz + 30) / S, S); }
      }
      const items = (g.items || []).filter((id) => L.SPR[id]);
      if (items.length) {          // giao diện mùa đang bật: đồ của mùa hai bên
        const pos = [[0.1, 0.7], [0.76, 0.74], [0.24, 0.82], [0.88, 0.84]];
        items.slice(0, 4).forEach((id, i) => sp(id, pos[i][0], pos[i][1]));
      } else {
        ["tulip", "sunflower"].forEach((id, k) => { sp(id, 0.19 + k * 0.07, 0.8); sp(id, 0.81 + k * 0.07, 0.82); });
      }
    }
    if (st.weather === "snow" || (g.theme === "noel" && st.snow)) {
      ctx.fillStyle = "#ffffff"; for (let i = 0; i < 160; i++) { const s = i % 5 ? 4 : 6; ctx.fillRect((i * 151) % W, (i * 89) % H, s, s); }
    }
    return hz;
  }
  function mascotImg() { return $("kb-mascot"); }

  // ---------------------------------------------------------------- màn chào
  function hello(g, st) {
    const h = Math.floor(st.hour || 9);
    const byHour = h >= 4 && h < 11 ? ["おはよう！", "Chào buổi sáng!"] : h >= 11 && h < 18 ? ["こんにちは！", "Xin chào!"] : ["こんばんは！", "Chào buổi tối!"];
    let hi = byHour[0], vi = byHour[1];
    if (g.fest) { hi = g.fest.hi; vi = g.fest.vi; }
    if (g.who === "stack") {
      if (g.away) { return [hi, g.away + " đi chơi rồi — cho ăn là về nhé."]; }
      return [hi, vi + (g.reviews > 0 ? " Hôm nay ôn " + g.reviews + " lượt rồi đó." : "")];
    }
    if (g.freeze && !g.fest) { return [hi, g.name + " · Hôm qua bận hả? Chuỗi vẫn còn nè!"]; }
    return [hi, g.name + " · " + vi];
  }
  function show(g) {
    const st = skyNow();
    const box = el("div", "kb-greet"); box.id = "kb-greet";
    box.setAttribute("role", "dialog"); box.setAttribute("aria-label", "Màn chào");
    const cv = el("canvas", "kb-greet-cv"); box.appendChild(cv);
    const date = el("div", "kb-greet-date"); fill(date, g.date + (g.theme_name ? " · " + g.theme_name : "")); box.appendChild(date);
    const bub = el("div", "kb-greet-bubble");
    const [hi, vi] = hello(g, st);
    const hiEl = el("div", "kb-greet-hi", hi); hiEl.setAttribute("lang", "ja"); bub.appendChild(hiEl);
    bub.appendChild(el("div", "kb-greet-vi", vi));
    const lines = (g.news || []).slice(0, 3);
    if (g.who === "stack" && g.away && lines.length < 3) { lines.push("[i:paw] Nhà → Thú nuôi → Cho ăn"); }
    if (lines.length) { const n = el("div", "kb-greet-news"); lines.forEach((t) => n.appendChild(fill(el("div"), t))); bub.appendChild(n); }
    box.appendChild(bub);
    const tap = el("div", "kb-greet-tap"); tap.appendChild(document.createTextNode("bấm để vào vườn "));
    const dots = [0, 1, 2, 3].map(() => { const i = el("i"); tap.appendChild(i); return i; });
    box.appendChild(tap);
    document.body.appendChild(box);
    greet = { g: g, box: box, cv: cv, bub: bub, dots: dots, t0: performance.now(), shown: 0, hover: false, last: performance.now(), done: false, petX: 0, petY: 0 };
    box.addEventListener("mouseenter", () => { if (greet) { greet.hover = true; } });
    box.addEventListener("mouseleave", () => { if (greet) { greet.hover = false; } });
    box.addEventListener("click", (e) => { e.stopPropagation(); leave(); });
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("resize", layout);
    prefSet("kb-greet-day", String(g.day));
    sfx("boop");
    layout();
    requestAnimationFrame(tick);
  }
  function onKey(e) {
    if (!greet || greet.done) { return; }
    if (e.isComposing || e.keyCode === 229) { return; }
    if (["Shift", "Control", "Alt", "Meta"].indexOf(e.key) >= 0) { return; }
    e.preventDefault(); e.stopImmediatePropagation();       // phím này chỉ để vào vườn (không mở bảng / không đóng cửa sổ)
    if (e.key === "Escape") { window.__kbEscUsed = true; }
    leave();
  }
  function layout() {
    if (!greet) { return; }
    const W = window.innerWidth, H = window.innerHeight;
    greet.cv.width = W; greet.cv.height = H;
    greet.W = W; greet.H = H;
    greet.hz = Math.round(H * 0.6);
    greet.base = Math.round(greet.hz + (H - greet.hz) * 0.42);
    const b = greet.bub, top = greet.g.who === "stack" ? greet.base - 230 : greet.base - 13 * 9 - 46 - 60;
    b.style.left = Math.round(W / 2 - b.offsetWidth / 2) + "px";
    b.style.top = Math.max(70, Math.round(top - b.offsetHeight - 10)) + "px";
  }
  function tick(now) {
    if (!greet || greet.done) { return; }
    const g = greet.g, cv = greet.cv, ctx = cv.getContext("2d"), W = greet.W, H = greet.H;
    ctx.imageSmoothingEnabled = false;
    const st = skyNow();
    scene(ctx, W, H, st, g);
    const cx = Math.round(W / 2), base = greet.base, el0 = now - greet.t0;
    if (g.who === "stack") {
      const m = mascotImg(), w = 170;
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(cx - 70, base - 6, 140, 12);
      const hop = Math.max(0, Math.round(Math.sin(el0 / 260) * 10));
      if (m && m.width) { const h = Math.round(w * m.height / m.width); ctx.drawImage(m, cx - w / 2, base - h - hop, w, h); }
      greet.petX = cx; greet.petY = base - 90;
    } else if (typeof GardenPets !== "undefined") {
      const S = 9, run = Math.min(1, el0 / 900);
      const frame = run < 1 ? (Math.floor(el0 / 140) % 2 ? "walk1" : "walk0") : "sit";
      const rows = GardenPets.sprite(g.who, frame) || GardenPets.sprite(g.who, "sit");
      if (rows) {
        const w = rows[0].length * S, h = rows.length * S;
        const x = run < 1 ? -w + (cx - w / 2 + w) * (1 - Math.pow(1 - run, 2)) : cx - w / 2;
        const hop = run < 1 ? 0 : Math.round(Math.abs(Math.sin((el0 - 900) / 300)) * 40);
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x + 10, base - 6, w - 20, 12);
        GardenPets.paint(ctx, rows, x / S, (base - h - hop) / S, S, false);
        if (run >= 1) {            // tim nhỏ khi vẫy
          ctx.fillStyle = "#ff4f6d";
          [".rr.rr.", "rrrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."].forEach((r, j) => { for (let i = 0; i < r.length; i++) { if (r[i] === "r") { ctx.fillRect(cx + w / 2 + 6 + i * 6, base - h - 86 + j * 6, 6, 6); } } });
        }
        greet.petX = x + w / 2; greet.petY = base - h / 2 - hop;
      }
    }
    // đếm ngược: không tính lúc rê chuột lên
    const dt = now - greet.last; greet.last = now;
    if (!greet.hover) { greet.shown += dt; }
    const k = Math.min(4, Math.floor(greet.shown / (GREET_MS / 4)));
    greet.dots.forEach((d, i) => { d.className = i < k ? "" : "off"; });
    if (greet.shown >= GREET_MS) { leave(); return; }
    requestAnimationFrame(tick);
  }
  function leave() {
    if (!greet || greet.done) { return; }
    greet.done = true;
    const box = greet.box, px = greet.petX || window.innerWidth / 2, py = greet.petY || window.innerHeight / 2;
    window.removeEventListener("keydown", onKey, true);
    window.removeEventListener("resize", layout);
    const m = mode();
    const gone = () => { if (box.parentNode) { box.parentNode.removeChild(box); } greet = null; };
    if (m === "full") {
      irisClose(T.close, px, py, () => { gone(); irisOpen(T.open, window.innerWidth / 2, window.innerHeight / 2); });
    } else if (m === "fade") {
      box.classList.add("kb-greet-out");
      setTimeout(gone, T.out + 20);
    } else { gone(); }
  }

  // ---------------------------------------------------------------- bật nhẹ khi mở bảng
  const POP_IDS = ["kb-home", "kb-game", "kb-paper", "kb-cal"];
  function watchPanels() {
    if (typeof MutationObserver === "undefined") { return; }
    const mo = new MutationObserver((list) => {
      list.forEach((r) => {
        const t = r.target;
        if (t.hidden || r.oldValue === null) { return; }       // vừa hiện (trước đó có thuộc tính hidden)
        if (mode() !== "full") { return; }
        t.classList.remove("kb-panel-in"); void t.offsetWidth; t.classList.add("kb-panel-in");
      });
    });
    POP_IDS.forEach((id) => { const e = $(id); if (e) { mo.observe(e, { attributes: true, attributeFilter: ["hidden"], attributeOldValue: true }); e.addEventListener("animationend", (ev) => { if (ev.target === e) { e.classList.remove("kb-panel-in"); } }); } });
  }

  // ---------------------------------------------------------------- đổi cảnh trên dải cảnh (home.js gọi khi vẽ)
  const SHAPES = {
    leaf: ["....k....", "...kok...", "..koook..", ".koooook.", "koooRooook", ".kooooook", "..kooook.", "...kook..", "....kk...", "....k...."],
    petal: ["..kk..", ".kook.", "koooRk", "koooRk", ".kook.", "..kk.."],
    snow: ["..o..", "o.o.o", ".ooo.", "ooRoo", ".ooo.", "o.o.o", "..o.."],
    star: ["...o...", "...o...", "..ooo..", "ooooooo", ".ooooo.", ".oo.oo.", "o.....o"],
    square: ["oooo", "oRRo", "oRRo", "oooo"]
  };
  const THEME_FX = {
    momiji: ["leaf", ["#ff7a4a", "#c23c1e"], ["#ffd23f", "#e9a800"]], autumn: ["leaf", ["#ff7a4a", "#c23c1e"], ["#ffd23f", "#e9a800"]],
    hanami: ["petal", ["#ffc4d6", "#ff8fb1"], ["#ffffff", "#ffc4d6"]], spring: ["petal", ["#ffc4d6", "#ff8fb1"], ["#fff3a8", "#ffd23f"]],
    tet: ["petal", ["#ffd23f", "#e9a800"], ["#ff4f6d", "#c23c1e"]], tsuyu: ["petal", ["#8fb6ff", "#5b7fe0"], ["#c9a2ff", "#9a6be0"]],
    winter: ["snow", ["#ffffff", "#cfe6ff"], ["#e8f4ff", "#9ac8ff"]], noel: ["snow", ["#ffffff", "#cfe6ff"], ["#ff4f6d", "#2e8b3a"]],
    shogatsu: ["snow", ["#ffffff", "#cfe6ff"], ["#ff4f6d", "#ffd23f"]],
    summer: ["leaf", ["#5fd17a", "#2e8b3a"], ["#a6e86a", "#5fae45"]], natsumatsuri: ["star", ["#ffd23f", "#ff7a4a"], ["#ff4f6d", "#c77dff"]],
    tanabata: ["star", ["#ffe27a", "#ffd23f"], ["#c9e4ff", "#8fb6ff"]], tsukimi: ["star", ["#ffe27a", "#e9a800"], ["#ffffff", "#ffe9a8"]],
    halloween: ["square", ["#ff7a1a", "#c4520a"], ["#9a6be0", "#5b3a8e"]]
  };
  function particles(ctx, h, x0, band, theme) {
    const fx = THEME_FX[theme] || ["square", ["#5fd17a", INK], ["#ffd23f", INK]];
    const shape = SHAPES[fx[0]], S = Math.max(3, Math.round(h / 46));
    for (let i = 0; i < 54; i++) {
      const pal = i % 3 ? fx[1] : fx[2];
      const lx = Math.round(x0 - band + (i * 97) % band), ly = Math.round(((i * 53) % 100) / 100 * (h - shape.length * S));
      for (let j = 0; j < shape.length; j++) {
        for (let k = 0; k < shape[j].length; k++) {
          const c = shape[j][k];
          if (c === ".") { continue; }
          ctx.fillStyle = c === "k" ? INK : c === "R" ? pal[1] : pal[0];
          ctx.fillRect(lx + k * S, ly + j * S, S, S);
        }
      }
    }
  }
  // t: 0 → 1; snap: hình cảnh cũ (canvas); kind: "sweep" | "curtain"; dir: +1 (▸) / −1 (◂)
  function strip(ctx, w, h, t, snap, kind, dir) {
    if (kind === "curtain") {
      const k = t < 0.5 ? t / 0.5 : (1 - t) / 0.5;
      if (t < 0.5 && snap) { ctx.drawImage(snap, 0, 0, w, h); }
      const cw = Math.ceil(w / 2 * k);
      [0, 1].forEach((side) => {
        const x0 = side === 0 ? 0 : w - cw;
        ctx.fillStyle = "#d6405c"; ctx.fillRect(x0, 0, cw, h);
        for (let x = side === 0 ? cw - 28 : x0; side === 0 ? x >= 0 : x < w; x += side === 0 ? -28 : 28) {
          ctx.fillStyle = "#aa2844"; ctx.fillRect(x, 0, 6, h);
          ctx.fillStyle = "#f0788c"; ctx.fillRect(x + 12, 0, 3, h);
        }
        ctx.fillStyle = "#e9b949"; ctx.fillRect(x0, 0, cw, Math.max(6, Math.round(h / 14)));
      });
      return;
    }
    const band = Math.max(160, Math.round(w * 0.22));
    const pos = Math.round(t * (w + band));                     // mép trước của dải lá
    if (snap) {                                                  // phần chưa quét tới vẫn là cảnh cũ
      if (dir < 0) {
        const cut = Math.max(0, w - pos + band / 2);
        if (cut > 0) { ctx.drawImage(snap, 0, 0, snap.width * cut / w, snap.height, 0, 0, cut, h); }
      } else {
        const from = Math.min(w, Math.max(0, pos - band / 2));
        if (from < w) { ctx.drawImage(snap, snap.width * from / w, 0, snap.width * (w - from) / w, snap.height, from, 0, w - from, h); }
      }
    }
    const theme = typeof GardenSeason !== "undefined" && GardenSeason.active ? GardenSeason.active() : null;
    particles(ctx, h, dir < 0 ? w - pos + band : pos, band, theme);
  }

  // ---------------------------------------------------------------- Tin làng (thẻ Hôm nay)
  function drawNews(d) {
    const b = $("kb-news-btn"), n = d && d.news;
    if (!b) { return; }
    if (!n || !n.line) { b.hidden = true; if (newsOpen) { closeNews(); } return; }
    b.hidden = false;
    fill(b, "[i:star] Tin làng: " + n.line + " ▸");
    if (newsOpen) { buildPop(n); }
  }
  function buildPop(n) {
    const p = $("kb-news-pop");
    if (!p) { return; }
    $("kb-news-date").textContent = "Tin làng · " + (n.date || "");
    const list = (id, rows, soon) => {
      const u = $(id); u.textContent = "";
      rows.forEach((x) => {
        const li = el("li", soon ? "is-soon" : "");
        fill(li.appendChild(el("span", "kb-news-t")), "[i:" + (x.icon || "star") + "] " + x.text);
        if (x.d || x.hint) { li.appendChild(el("span", "kb-news-d", x.d || x.hint)); }
        u.appendChild(li);
      });
      u.previousElementSibling.hidden = !rows.length;
    };
    list("kb-news-today", n.today || [], false);
    list("kb-news-soon", n.soon || [], true);
  }
  function toggleNews(show) {
    const p = $("kb-news-pop"), btn = $("kb-news-btn");
    if (!p) { return; }
    if (show === undefined) { show = p.hidden; }
    if (!show) { p.hidden = true; newsOpen = false; return; }
    const d = typeof Garden !== "undefined" && Garden._data ? Garden._data() : null;
    if (!d || !d.news) { return; }
    newsOpen = true;
    buildPop(d.news);
    p.hidden = false;
    const anchor = $("kb-today") && $("kb-today").offsetParent ? $("kb-today") : btn;
    const r = anchor.getBoundingClientRect(), app = $("kb-app").getBoundingClientRect();
    p.style.top = (r.bottom - app.top + 6) + "px";
    p.style.left = Math.max(8, Math.min(app.width - p.offsetWidth - 8, r.right - app.left - p.offsetWidth)) + "px";
  }
  function closeNews() { toggleNews(false); }

  function init() {
    watchPanels();
    const b = $("kb-news-btn");
    if (b) { b.addEventListener("click", (e) => { e.stopPropagation(); if (typeof Garden !== "undefined" && Garden.closeQuests) { Garden.closeQuests(); } toggleNews(); }); }
    const x = $("kb-news-x");
    if (x) { x.addEventListener("click", (e) => { e.stopPropagation(); closeNews(); }); }
    const p = $("kb-news-pop");
    if (p) { p.addEventListener("click", (e) => e.stopPropagation()); }
    document.addEventListener("click", () => { if (newsOpen) { closeNews(); } });
    document.addEventListener("keydown", (e) => { if (newsOpen && e.key === "Escape") { e.preventDefault(); closeNews(); } });
  }
  if (document.readyState === "loading") { document.addEventListener("DOMContentLoaded", init); } else { init(); }

  return {
    // garden.js gọi mỗi lần vẽ lại vườn
    render: function (d) {
      drawNews(d);
      if (!first) { return; }
      first = false;
      const g = d && d.greet;
      if (g && glob("greet") !== "off" && prefGet("kb-greet-day") !== String(g.day)) { show(g); return; }
      const m = mode();
      if (m === "full") { irisOpen(T.first, window.innerWidth / 2, window.innerHeight / 2); } else if (m === "fade") { fadeIn(T.fade); }
    },
    mode: mode,
    strip: strip,
    closeNews: closeNews,
    isGreeting: () => !!greet && !greet.done,
    leave: leave,
    _state: () => (greet ? { who: greet.g.who, hi: greet.bub.querySelector(".kb-greet-hi").textContent, vi: greet.bub.querySelector(".kb-greet-vi").textContent,
      news: [...greet.bub.querySelectorAll(".kb-greet-news div")].map((x) => x.textContent), shown: Math.round(greet.shown) } : null),
    _show: show
  };
})();
