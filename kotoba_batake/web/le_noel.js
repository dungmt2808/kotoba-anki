/* ことば畑 – 1.36.1: ông già Noel + kỷ niệm Giáng sinh (le_core.py giữ luật; file này vẽ + gửi lệnh).
   - Cảnh đêm 24 (#kb-le-show): sân thật của bạn (GardenHome.drawYardInto) dưới trời đêm có tuyết (GardenSky.hold — không đổi
     cài đặt), Silent Night (GardenMusic.force — chỉ khi nhạc đang bật): xe tuần lộc đáp xuống sân, ông già Noel tới cây thông
     lấy thiệp điều ước, để lại thư, vẫy StackChan đội mũ Noel rồi bay đi. ~13 giây, Bỏ qua / Xem lại. Tự chạy lần đầu mở vườn
     tối 24 (từ 18:00, giờ máy) → "le:seen".
   - Thư sáng 25 (#kb-le-letter): viết sẵn (le_core.letter) — lời chào + ký tên theo Ngôn ngữ trong vườn; tự mở lần đầu mở vườn
     ngày 25–31/12 → "le:read". "Xem lại đêm qua ▸".
   - Cất đồ 1/1 (#kb-le-pack): StackChan cất đồ Noel vào Kho đồ (Python đã cất, cùng một lần lưu) — cảnh ngắn + danh sách.
   - Album → Kỷ niệm: tủ lịch 24 ngăn (ngày mở), thiệp của bạn, thư, thiệp bạn bè gửi (dán mã "KBC1:…").
   Không dùng emoji. */
var GardenLeNoel = (function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const YW = 256, YH = 76, PAD = 28, EXT = 16;
  // mốc thời gian của cảnh (ms)
  const T = { fly0: 900, land: 4200, out: 4700, walk: 5200, pick: 7000, wave: 8000, back: 9100, inn: 10400, off: 10700, end: 13200 };
  let H = null;
  let show = null;             // {t0, mode, plan, raf, final}
  let autoTimer = 0, autoKey = "", autoStart = 0;
  let peek = null, peekMsg = "", peekBad = false, recvInput = "";
  let seenSent = "";                     // đã gửi "le:seen" cho ngày này (Python chỉ ghi lần đầu — khỏi gửi lặp)
  let packShown = "", packWait = null;     // cất đồ 1/1: Python chỉ báo một lần (lần vẽ đầu sau khi cất) — giữ lại tới lúc hiện

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function data() { const d = H && H.data && H.data(); return d || null; }
  function le() { const d = data(); return (d && d.le) || null; }
  function art() { return typeof GardenLeArt !== "undefined" ? GardenLeArt : null; }
  function lib() { return typeof GardenHome !== "undefined" && GardenHome._lib ? GardenHome._lib() : null; }
  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
  function still() { return typeof GardenLe !== "undefined" && GardenLe.still ? GardenLe.still() : false; }
  function glang() {
    try { const g = typeof GardenLang !== "undefined" && GardenLang.cur ? GardenLang.cur() : "vi"; return g || "vi"; } catch (e) { return "vi"; }
  }
  function ddmm(iso) { const p = String(iso || "").slice(0, 10).split("-"); return p.length === 3 ? (+p[2]) + "/" + (+p[1]) : ""; }
  function homeState() { const d = data(); return (d && d.wallet && d.wallet.home) || {}; }
  function itemName(id) { const v = le(); return (v && v.names && v.names[id]) || id; }

  // =====================================================================================================
  // Cảnh đêm 24
  // =====================================================================================================
  function planScene() {
    const boxes = typeof GardenHome !== "undefined" && GardenHome.itemBoxes ? GardenHome.itemBoxes("yard") : [];
    const trees = boxes.filter((b) => b.id === "xmastree").sort((a, b) => (b.y + b.h) - (a.y + a.h) || a.x - b.x);
    const tree = trees[0] || null;
    const base = tree ? Math.max(46, Math.min(75, tree.y + tree.h)) : 74;
    let land;
    if (tree) {
      land = tree.x + tree.w + 18;
      if (land + 36 > YW) { land = tree.x - 52; }
      if (land < 64) { land = Math.min(YW - 36, tree.x + tree.w + 2); }
    } else { land = 150; }
    const v = le() || {};
    const h = homeState(), A = art();
    const geo = A ? A.houseGeo(h.house || 0, h.style) : null;
    const scx = geo && geo.door ? geo.door.x + geo.door.w + 2 : 40;
    const target = tree ? (land > tree.x ? tree.x + tree.w - 4 : tree.x - 12) : land - 30;
    return { tree: tree, base: base, land: land, target: target, scx: Math.max(2, Math.min(60, scx)), hung: (typeof v.hang === "number" && v.hang >= 0) && (v.cards || [])[v.hang],
      cardAt: tree ? { x: tree.x + 19, y: tree.y + 20 } : null, morning: !!(v.santa && v.santa.morning) || !!v.letter };
  }
  function canvasS() { return Math.max(2, Math.min(4, Math.floor(Math.min(window.innerWidth - 48, 1180) / (YW + EXT * 2)))); }
  function lerp(a, b, u) { return a + (b - a) * u; }
  function ease(u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); }
  function paintR(ctx, rows, x, y, S, flip) {
    if (!rows) { return; }
    const A = art(), L = lib();
    ctx.save();
    if (flip) { const w = rows[0].length; ctx.translate((x * 2 + w) * S, 0); ctx.scale(-1, 1); }
    if (L && L.sprite) { L.sprite(ctx, rows, x, y, S, Object.assign({}, A ? A.PAL : {}, L.P)); } else if (A) { A.paint(ctx, rows, x, y, S); }
    ctx.restore();
  }
  function drawStack(ctx, S, x, base, now, t) {
    if (typeof GardenLife === "undefined" || !GardenLife.preview) { return; }
    const hop = t > T.wave && t < T.back && !still() ? (Math.floor(now / 180) % 2) : 0;
    try { GardenLife.preview(ctx, S, x, base - 20 - hop, { head: "santa" }, "stand"); } catch (e) { /* bỏ qua */ }
  }
  function frame() {
    if (!show) { return; }
    const now = Date.now(), t = show.final ? T.end - 1 : now - show.t0, cv = $("kb-le-show-cv");
    if (!cv) { return; }
    const S = canvasS(), Wc = (YW + EXT * 2) * S, Hc = (YH + PAD) * S;
    if (cv.width !== Wc || cv.height !== Hc) { cv.width = Wc; cv.height = Hc; cv.style.width = Wc + "px"; cv.style.height = Hc + "px"; }
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, Wc, Hc);
    try {
      if (typeof GardenHome !== "undefined" && GardenHome.drawYardInto) {
        GardenHome.drawYardInto(ctx, S, EXT, PAD, now, { padTop: PAD, bgFrom: -EXT, bgTo: YW + EXT });
      }
    } catch (e) { ctx.fillStyle = "#0b0b2a"; ctx.fillRect(0, 0, Wc, Hc); }
    ctx.save(); ctx.translate(EXT * S, PAD * S);
    const p = show.plan, A = art(), L = lib();
    const sleigh = L && L.SPR ? L.SPR.sleigh : null;
    const sh = sleigh ? sleigh.length : 22, sw = sleigh ? sleigh[0].length : 34;
    const groundY = p.base - sh;
    drawStack(ctx, S, p.scx, p.base, now, t);
    // thiệp trên cây (tới lúc ông lấy)
    if (p.hung && p.cardAt && t < T.pick + 300 && A) { paintR(ctx, A.CARD_MINI, p.cardAt.x, p.cardAt.y, S); }
    // thư dưới gốc cây (sau khi ông lấy thiệp)
    if (t > T.pick + 400 && A) {
      const lx = p.tree ? p.tree.x + Math.floor(p.tree.w / 2) - 5 : p.target - 4, k = 0.6;
      ctx.save(); ctx.scale(k, k); paintR(ctx, A.LETTER, lx / k, (p.base - 8) / k, S); ctx.restore();
    }
    // xe tuần lộc
    let sx = null, sy = null, sitting = false;
    if (t >= T.fly0 && t < T.land) {
      const u = ease((t - T.fly0) / (T.land - T.fly0));
      sx = lerp(YW + 30, p.land, u); sy = lerp(-PAD - sh, groundY, Math.sqrt(u)) - Math.sin(Math.PI * u) * 6; sitting = true;
    } else if (t >= T.land && t < T.off) {
      sx = p.land; sy = groundY; sitting = t < T.out || t >= T.inn;
    } else if (t >= T.off) {
      const u = Math.min(1, (t - T.off) / (T.end - T.off - 400));
      sx = lerp(p.land, -sw - 40, u * u); sy = lerp(groundY, -PAD - sh - 6, u); sitting = true;
    }
    if (sx !== null && sleigh) {
      if (!still() && (t < T.land || t >= T.off)) {         // vệt sao bay theo xe
        for (let k = 0; k < 10; k++) {
          ctx.globalAlpha = 0.8 * (1 - k / 10);
          ctx.fillStyle = k % 2 ? "#ffd23f" : "#fff6a8";
          const tx = sx + sw + 2 + k * 3, ty = sy + sh - 6 + Math.sin(now / 120 + k) * 1.5 + (t >= T.off ? k * 1.2 : -k * 0.6);
          ctx.fillRect(Math.round(tx * S), Math.round(ty * S), S, S);
        }
        ctx.globalAlpha = 1;
      }
      paintR(ctx, sleigh, Math.round(sx), Math.round(sy), S);
      if (sitting && A) { paintR(ctx, A.SANTA.sit, Math.round(sx + 19), Math.round(sy - 1), S, true); }
    }
    // ông già Noel đi bộ
    if (A && t >= T.out && t < T.inn) {
      const out = p.land > p.target ? p.land - 14 : p.land + 36, tg = p.target;
      let x = out, pose = "stand", flip = tg < out;
      if (t >= T.walk && t < T.pick) { const u = (t - T.walk) / (T.pick - T.walk); x = lerp(out, tg, u); pose = Math.floor(now / 170) % 2 ? "walk1" : "walk2"; }
      else if (t >= T.pick && t < T.wave) { x = tg; pose = p.hung ? "hold" : "stand"; flip = p.tree ? p.tree.x + p.tree.w / 2 < tg : false; }
      else if (t >= T.wave && t < T.back) { x = tg; pose = "wave"; flip = p.scx < tg; }
      else if (t >= T.back) { const u = (t - T.back) / (T.inn - T.back); x = lerp(tg, out, u); pose = Math.floor(now / 170) % 2 ? "walk1" : "walk2"; flip = out < tg; }
      if (t < T.walk) { flip = tg < out; }
      paintR(ctx, A.SANTA[pose], Math.round(x), p.base - 21, S, flip);
      if (pose === "hold" && p.hung) { paintR(ctx, A.CARD_MINI, Math.round(flip ? x - 4 : x + 13), p.base - 13, S); }
    }
    ctx.restore();
    if (t < 500 && !still()) { ctx.globalAlpha = 1 - t / 500; ctx.fillStyle = "#05050f"; ctx.fillRect(0, 0, Wc, Hc); ctx.globalAlpha = 1; }
    caption(t);
    if (show.final) { return; }
    if (t >= T.end) { finish(); return; }
    show.raf = setTimeout(frame, still() ? 80 : 40);
  }
  function caption(t) {
    const c = $("kb-le-show-cap"), p = show.plan;
    let txt;
    if (t < 1800) { txt = "Đêm 24/12 · cả vườn sáng đèn chờ ông già Noel…"; }
    else if (t < T.walk) { txt = "Ông già Noel đáp xuống sân!"; }
    else if (t < T.wave) { txt = p.hung ? "Ông ghé cây thông lấy thiệp điều ước của bạn." : p.tree ? "Ông ghé cây thông, để lại một lá thư dưới gốc." : "Ông để lại một lá thư trong sân."; }
    else if (t < T.back) { txt = "StackChan vẫy chào ông!"; }
    else { txt = p.morning ? "Giáng sinh vui vẻ! Thư của ông để dưới gốc cây." : "Giáng sinh vui vẻ! Sáng mai xem dưới gốc cây có gì nhé."; }
    if (c && c.textContent !== txt) { c.textContent = txt; }
  }
  function buildShow() {
    let pop = $("kb-le-show");
    if (pop) { return pop; }
    pop = el("div", "kb-le-show"); pop.id = "kb-le-show"; pop.hidden = true;
    pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Đêm Giáng sinh");
    const box = pop.appendChild(el("div", "kb-le-show-box"));
    const cv = box.appendChild(document.createElement("canvas")); cv.id = "kb-le-show-cv"; cv.className = "kb-le-show-cv";
    cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Ông già Noel ghé vườn");
    const cap = box.appendChild(el("div", "kb-le-show-cap")); cap.id = "kb-le-show-cap"; cap.setAttribute("aria-live", "polite");
    const row = box.appendChild(el("div", "kb-h-btns kb-le-show-btns"));
    const skip = row.appendChild(el("button", "kb-btn kb-btn-small", "Bỏ qua")); skip.type = "button"; skip.id = "kb-le-show-skip";
    skip.addEventListener("click", (ev) => { ev.stopPropagation(); finish(); });
    const again = row.appendChild(el("button", "kb-btn kb-btn-small", "Xem lại")); again.type = "button"; again.id = "kb-le-show-again"; again.hidden = true;
    again.addEventListener("click", (ev) => { ev.stopPropagation(); play(show ? show.mode : "replay"); });
    const done = row.appendChild(el("button", "kb-btn kb-btn-small", "Đóng")); done.type = "button"; done.id = "kb-le-show-close"; done.hidden = true;
    done.addEventListener("click", (ev) => { ev.stopPropagation(); closeShow(); });
    pop.addEventListener("click", (ev) => ev.stopPropagation());
    document.body.appendChild(pop);
    return pop;
  }
  function play(mode) {
    const v = le();
    if (!v || !v.santa || !v.santa.came) { return; }
    closeAllPops();
    const pop = buildShow();
    if (show && show.raf) { clearTimeout(show.raf); }
    show = { t0: Date.now(), mode: mode || "replay", plan: planScene(), raf: 0, final: false };
    pop.hidden = false;
    $("kb-le-show-skip").hidden = false; $("kb-le-show-again").hidden = true; $("kb-le-show-close").hidden = true;
    if (typeof GardenSky !== "undefined" && GardenSky.hold) { GardenSky.hold(21.5, "snow", T.end + 60000); }
    if (typeof GardenMusic !== "undefined" && GardenMusic.force) { GardenMusic.force("silent"); }
    sfx("stage");
    frame();
  }
  function finish() {
    if (!show) { return; }
    if (show.raf) { clearTimeout(show.raf); show.raf = 0; }
    show.final = true;                       // khung cuối: xe đã bay đi, thư dưới gốc cây
    const v = le();
    if (v && v.santa && !v.santa.seen && H && seenSent !== v.today) { seenSent = v.today; H.send("le:seen"); }
    frame();
    $("kb-le-show-skip").hidden = true; $("kb-le-show-again").hidden = false; $("kb-le-show-close").hidden = false;
    try { $("kb-le-show-close").focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
  }
  function closeShow() {
    const pop = $("kb-le-show");
    if (show && show.raf) { clearTimeout(show.raf); }
    const wasMorning = show && show.plan && show.plan.morning;
    show = null;
    if (pop) { pop.hidden = true; }
    if (typeof GardenSky !== "undefined" && GardenSky.release) { GardenSky.release(); }
    if (typeof GardenMusic !== "undefined" && GardenMusic.force) { GardenMusic.force(null); }
    const v = le();
    if (wasMorning && v && v.letter && v.santa && !v.santa.read) { openLetter(); }
  }
  function showOpen() { const p = $("kb-le-show"); return !!(p && !p.hidden); }

  // =====================================================================================================
  // Thư của ông già Noel
  // =====================================================================================================
  function buildPop(id, title) {
    let pop = $(id);
    if (pop) { return pop; }
    pop = el("div", "kb-le-pop kb-le-mini"); pop.id = id; pop.hidden = true;
    pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", title);
    const head = pop.appendChild(el("div", "kb-le-head"));
    head.appendChild(el("b", "", title));
    const x = head.appendChild(el("button", "kb-pin-x", "✕")); x.type = "button"; x.setAttribute("aria-label", "Đóng");
    x.addEventListener("click", (ev) => { ev.stopPropagation(); pop.hidden = true; });
    pop.appendChild(el("div", "kb-le-mini-body"));
    pop.addEventListener("click", (ev) => ev.stopPropagation());
    ($("kb-app") || document.body).appendChild(pop);
    return pop;
  }
  function letterNode(L0, v) {
    const g = glang(), paper = el("div", "kb-le-paper");
    const top = paper.appendChild(el("div", "kb-le-paper-top"));
    const cv = top.appendChild(document.createElement("canvas")); cv.width = 48; cv.height = 36; cv.className = "kb-le-env";
    if (art()) { const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false; art().paint(ctx, art().LETTER, 0, 0, 3); }
    top.appendChild(el("div", "kb-le-greet", (L0.greet && (L0.greet[g] || L0.greet.vi)) || ""));
    (L0.body || []).forEach((t) => paper.appendChild(el("p", "kb-le-ptext", t)));
    if (L0.wish) {
      const q = paper.appendChild(el("div", "kb-le-quote"));
      q.appendChild(el("span", "", "“" + L0.wish + "”"));
    }
    const c = (v.cards || [])[L0.card];
    if (c && typeof GardenLeCard !== "undefined") { const th = GardenLeCard.thumb(c, 2); th.classList.add("kb-le-letter-card"); paper.appendChild(th); }
    const sign = paper.appendChild(el("div", "kb-le-sign"));
    sign.appendChild(el("b", "", (L0.sign && (L0.sign[g] || L0.sign.vi)) || ""));
    sign.appendChild(el("span", "", L0.date || ""));
    return paper;
  }
  function openLetter() {
    const v = le();
    if (!v || !v.letter) { return; }
    closeAllPops("kb-le-letter");
    const pop = buildPop("kb-le-letter", "Thư của ông già Noel");
    const body = pop.querySelector(".kb-le-mini-body");
    body.textContent = "";
    body.appendChild(letterNode(v.letter, v));
    const row = body.appendChild(el("div", "kb-h-btns kb-le-mini-btns"));
    const again = row.appendChild(el("button", "kb-btn kb-btn-small", "Xem lại đêm qua ▸")); again.type = "button"; again.id = "kb-le-replay";
    again.addEventListener("click", () => { pop.hidden = true; play("replay"); });
    if ((v.boxes || []).some((b) => b.can)) {
      const bx = row.appendChild(el("button", "kb-btn kb-btn-small", "Mở hộp quà ▸")); bx.type = "button";
      bx.addEventListener("click", () => { pop.hidden = true; if (typeof GardenLe !== "undefined") { GardenLe.open(); } });
    }
    const ok = row.appendChild(el("button", "kb-btn kb-btn-small", "Đóng")); ok.type = "button";
    ok.addEventListener("click", () => { pop.hidden = true; });
    pop.hidden = false;
    sfx("flip");
    if (v.santa && !v.santa.read && H) { H.send("le:read"); }
    try { ok.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
  }

  // =====================================================================================================
  // Cất đồ 1/1
  // =====================================================================================================
  const ROOM_NAMES = { room: "Phòng chính", kitchen: "Bếp", bedroom: "Phòng ngủ" };
  function packLines(pk) {
    const v = le() || {}, out = [];
    if ((v.parts || []).length) { out.push("Áo Noel của nhà và đèn sân · cây thông về như lúc chưa có tủ lịch"); }
    Object.keys(pk.items || {}).forEach((id) => { out.push(itemName(id) + (pk.items[id] > 1 ? " × " + pk.items[id] : "") + " → Kho đồ"); });
    (pk.tiles || []).forEach((t) => { out.push(ROOM_NAMES[t[0]] + ": " + (t[1] === "wall" ? "tường" : "sàn") + (t[3] ? " về mẫu dùng trước đó" : " về theo kiểu nhà")); });
    return out;
  }
  function openPack(pk) {
    const v = le();
    pk = pk || (v && v.pack);
    if (!pk) { return; }
    closeAllPops("kb-le-packpop");
    const pop = buildPop("kb-le-packpop", "Cất đồ Noel");
    const body = pop.querySelector(".kb-le-mini-body");
    body.textContent = "";
    const cv = body.appendChild(document.createElement("canvas")); cv.className = "kb-le-pack-cv"; cv.width = 64 * 4; cv.height = 30 * 4;
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#f6eedc"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#e4d5b6"; ctx.fillRect(0, 26 * 4, cv.width, 4 * 4);
    if (art()) { art().paint(ctx, art().PACKBOX, 34, 9, 4); }
    if (typeof GardenLife !== "undefined" && GardenLife.preview) { try { GardenLife.preview(ctx, 4, 8, 7, { head: "santa" }, "stand"); } catch (e) { /* bỏ qua */ } }
    body.appendChild(el("p", "kb-le-ptext", "Năm mới rồi — StackChan đã cất đồ Noel vào hộp." + (pk.preview ? " (Xem thử — không cất thật.)" : "")));
    const ul = body.appendChild(el("ul", "kb-le-packlist"));
    packLines(pk).forEach((t) => ul.appendChild(el("li", "", t)));
    body.appendChild(el("p", "kb-le-hintt", "Tủ lịch, thiệp và thư của ông già Noel giữ ở Album → Kỷ niệm. Đồ trong nhà (tất, đèn ngủ, quả cầu tuyết…) vẫn bày quanh năm."));
    const row = body.appendChild(el("div", "kb-h-btns kb-le-mini-btns"));
    const mem = row.appendChild(el("button", "kb-btn kb-btn-small", "Xem Kỷ niệm ▸")); mem.type = "button";
    mem.addEventListener("click", () => { pop.hidden = true; if (typeof GardenHome !== "undefined" && GardenHome.openMemories) { GardenHome.openMemories(); } });
    const ok = row.appendChild(el("button", "kb-btn kb-btn-small", "Đóng")); ok.type = "button";
    ok.addEventListener("click", () => { pop.hidden = true; });
    pop.hidden = false;
    sfx("flip");
  }

  function closeAllPops(except) {
    ["kb-le-letter", "kb-le-packpop"].forEach((id) => { if (id !== except) { const p = $(id); if (p) { p.hidden = true; } } });
    if (typeof GardenLe !== "undefined" && GardenLe.close) { GardenLe.close(); }
    if (typeof GardenLeCard !== "undefined" && GardenLeCard.close) { GardenLeCard.close(); }
  }

  // =====================================================================================================
  // Tự mở: cảnh đêm 24 / thư sáng 25 / cất đồ 1/1 (khi không có bảng nào đang mở, màn chào đã tắt)
  // =====================================================================================================
  function idle() {
    if (document.hidden) { return false; }
    const g = $("kb-greet"), tr = $("kb-trans");
    if ((g && !g.hidden && g.offsetParent !== null) || (tr && tr.offsetParent !== null && getComputedStyle(tr).display !== "none" && tr.style.opacity !== "0")) { return false; }
    const busy = ["kb-panel", "kb-game", "kb-home", "kb-paper", "kb-cal", "kb-ui", "kb-fields", "kb-le-pop", "kb-le-cardpop", "kb-le-letter", "kb-le-packpop", "kb-le-show"]
      .some((id) => { const e = $(id); return e && !e.hidden; });
    if (busy) { return false; }
    if (typeof GardenUI !== "undefined" && GardenUI.asking && GardenUI.asking()) { return false; }
    return !document.querySelector(".kb-tour:not([hidden])");
  }
  function pending() {
    const v = le();
    if (!v || !v.santa) { return null; }
    if (packWait && packShown !== v.today) { return { k: "pack", pack: packWait }; }
    if (v.santa.due) { return { k: "show" }; }
    if (v.santa.morning && v.letter) { return { k: "letter" }; }
    return null;
  }
  function tick() {
    autoTimer = 0;
    const p = pending();
    if (!p) { return; }
    const key = p.k + "|" + ((le() || {}).today || "");
    if (key === autoKey) { return; }
    if (!idle()) {
      if (Date.now() - autoStart < 180000) { autoTimer = setTimeout(tick, 900); }
      return;
    }
    autoKey = key;
    if (p.k === "pack") { packShown = (le() || {}).today; packWait = null; openPack(p.pack); }
    else if (p.k === "show") { play("auto"); }
    else { openLetter(); }
  }
  function renderData() {
    const v = le();
    if (!v || !v.santa) {
      ["kb-le-letter", "kb-le-packpop"].forEach((id) => { const p = $(id); if (p) { p.hidden = true; } });
      return;
    }
    if (v.welcome && v.welcome.pack && packShown !== v.today) { packWait = v.welcome.pack; }
    if (pending() && !autoTimer) { autoStart = Date.now(); autoTimer = setTimeout(tick, 1200); }
  }

  // =====================================================================================================
  // Album → Kỷ niệm
  // =====================================================================================================
  function hasAlbum() { const v = le(); return !!(v && v.doors && v.santa && ((v.opened || 0) > 0 || (v.cards || []).some(Boolean) || (v.recv || []).length || v.gift && v.gift.tulich)); }
  function miniCabinet(v) {
    const cv = el("canvas", "kb-le-memcab");
    const CW = 22, CH = 18, G = 2, Sx = 2;
    cv.width = (6 * CW + 5 * G + 8) * Sx; cv.height = (4 * CH + 3 * G + 8) * Sx;
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#3a2418"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#6b3b1f"; ctx.fillRect(2 * Sx, 2 * Sx, cv.width - 4 * Sx, cv.height - 4 * Sx);
    const A = art();
    (v.doors || []).forEach((x) => {
      const i = x.d - 1, cx = 4 + (i % 6) * (CW + G), cy = 4 + Math.floor(i / 6) * (CH + G);
      ctx.fillStyle = "#1b1b2f"; ctx.fillRect(cx * Sx, cy * Sx, CW * Sx, CH * Sx);
      ctx.fillStyle = x.state === "open" ? "#f7e7c6" : "#9a8472"; ctx.fillRect((cx + 1) * Sx, (cy + 1) * Sx, (CW - 2) * Sx, (CH - 2) * Sx);
      if (A) { A.digit(ctx, Sx, cx + 2, cy + 2, x.d, x.state === "open" ? "#c9962e" : "#5a4a40"); }
      if (x.state === "open" && (x.tiles || []).length) {          // mẫu tường / sàn: các ô màu nhỏ
        const TC = { w_noeltuyet: "#2f6b4a", w_noelkeo: "#d23a3a", w_noeldo: "#7a1f2e", f_noelcaro: "#b3242f", f_noellen: "#f4f1ea" };
        x.tiles.forEach((t, j) => {
          ctx.fillStyle = "#1b1b2f"; ctx.fillRect((cx + 8 + j * 5) * Sx, (cy + 7) * Sx, 4 * Sx, 8 * Sx);
          ctx.fillStyle = TC[t] || "#cccccc"; ctx.fillRect((cx + 8.5 + j * 5) * Sx, (cy + 7.5) * Sx, 3 * Sx, 7 * Sx);
        });
      } else if (x.state === "open" && A) {
        const rows = x.kind === "qua" ? A.boxIcon(x.box || 1, false) : (x.item && A.ITEMS[x.item]) || (x.part && A.ICON[x.part]) || null;
        if (rows) {
          const k = Math.min(1, (CW - 6) / rows[0].length, (CH - 6) / rows.length);
          ctx.save(); ctx.scale(k, k); A.paint(ctx, rows, (cx + CW - 3 - rows[0].length * k) / k, (cy + CH - 2 - rows.length * k) / k, Sx); ctx.restore();
        }
      }
    });
    cv.title = (v.doors || []).filter((x) => x.state === "open").map((x) => x.d + "/12 " + x.name + (x.at ? " (mở " + ddmm(x.at) + ")" : "")).join(" · ");
    return cv;
  }
  function album(list) {
    const v = le();
    if (!v) { return; }
    const card = list.appendChild(el("div", "kb-h-card kb-le-mem"));
    const head = card.appendChild(el("div", "kb-le-mem-head"));
    head.appendChild(el("b", "", "Giáng sinh " + v.year));
    head.appendChild(el("span", "kb-le-hintt", " · tủ lịch " + v.opened + "/24 ngăn"));
    // tủ lịch
    const cab = card.appendChild(el("div", "kb-le-mem-row"));
    cab.appendChild(miniCabinet(v));
    const cb = cab.appendChild(el("div", "kb-le-mem-side"));
    const ob = cb.appendChild(el("button", "kb-btn kb-btn-small", "Mở tủ lịch ▸")); ob.type = "button";
    ob.addEventListener("click", () => { if (typeof GardenLe !== "undefined") { GardenLe.open(); } });
    if (v.letter) {
      const lb = cb.appendChild(el("button", "kb-btn kb-btn-small", "Thư của ông già Noel ▸")); lb.type = "button"; lb.id = "kb-le-mem-letter";
      lb.addEventListener("click", openLetter);
    }
    if (v.santa && v.santa.came) {
      const rb = cb.appendChild(el("button", "kb-btn kb-btn-small", "Xem lại đêm 24 ▸")); rb.type = "button";
      rb.addEventListener("click", () => play("replay"));
    }
    if (v.pack) {
      const pb = cb.appendChild(el("button", "kb-btn kb-btn-small", "Đồ Noel đã cất ▸")); pb.type = "button";
      pb.addEventListener("click", () => openPack(v.pack));
    }
    // thiệp của bạn
    card.appendChild(el("div", "kb-le-sec", "Thiệp của bạn"));
    const cs = card.appendChild(el("div", "kb-le-mem-cards"));
    const mine = (v.cards || []).map((c, i) => [c, i]).filter(([c]) => c);
    if (!mine.length) { cs.appendChild(el("div", "kb-le-hintt", v.card_edit ? "Chưa làm thiệp nào." : "Năm nay chưa làm thiệp.")); }
    mine.forEach(([c, i]) => {
      const it = cs.appendChild(el("div", "kb-le-mem-card"));
      if (typeof GardenLeCard !== "undefined") { it.appendChild(GardenLeCard.thumb(c, 2)); }
      it.appendChild(el("div", "kb-le-hintt", "Thiệp " + (i + 1) + (v.hang === i ? (v.taken === i ? " · ông già Noel đã nhận" : " · đang treo trên cây") : "")));
      const row = it.appendChild(el("div", "kb-h-btns"));
      const o = row.appendChild(el("button", "kb-btn kb-btn-small", v.card_edit && v.taken !== i ? "Sửa ▸" : "Xem ▸")); o.type = "button";
      o.addEventListener("click", () => { if (typeof GardenLeCard !== "undefined") { GardenLeCard.open(i); } });
      const pn = row.appendChild(el("button", "kb-btn kb-btn-small", "Lưu ảnh")); pn.type = "button";
      pn.addEventListener("click", () => { if (typeof GardenLeCard !== "undefined") { GardenLeCard.savePng(c, "kotoba_batake_thiep_" + (i + 1)); } });
      const cd = row.appendChild(el("button", "kb-btn kb-btn-small", "Chép mã")); cd.type = "button";
      cd.addEventListener("click", () => { if (H) { H.send("le:code:" + i); } });
    });
    if (v.card_edit && mine.length < 3) {
      const nb = cs.appendChild(el("button", "kb-btn kb-btn-small", "Làm thiệp ▸")); nb.type = "button";
      nb.addEventListener("click", () => { if (typeof GardenLeCard !== "undefined") { GardenLeCard.open((v.cards || []).findIndex((c) => !c)); } });
    }
    // thiệp bạn gửi
    card.appendChild(el("div", "kb-le-sec", "Thiệp bạn gửi"));
    const rs = card.appendChild(el("div", "kb-le-mem-cards"));
    (v.recv || []).forEach((r) => {
      const it = rs.appendChild(el("div", "kb-le-mem-card"));
      if (typeof GardenLeCard !== "undefined") { it.appendChild(GardenLeCard.thumb(r.card, 2)); }
      it.appendChild(el("div", "kb-le-hintt", "nhận " + ddmm(r.at)));
      const row = it.appendChild(el("div", "kb-h-btns"));
      const pn = row.appendChild(el("button", "kb-btn kb-btn-small", "Lưu ảnh")); pn.type = "button";
      pn.addEventListener("click", () => { if (typeof GardenLeCard !== "undefined") { GardenLeCard.savePng(r.card, "kotoba_batake_thiep_nhan"); } });
      const cp = row.appendChild(el("button", "kb-btn kb-btn-small", "Chép mã")); cp.type = "button";
      cp.addEventListener("click", () => { if (H) { H.send("le:rcode:" + r.k); } });
      const dl = row.appendChild(el("button", "kb-btn kb-btn-small", "Xoá")); dl.type = "button";
      dl.addEventListener("click", () => {
        const go = () => { if (H) { H.send("le:rdel:" + r.k); } };
        if (typeof GardenUI !== "undefined" && GardenUI.ask) { GardenUI.ask({ title: "Xoá thiệp này khỏi Album?", yes: "Xoá", always: true, then: go }); } else { go(); }
      });
    });
    const rf = card.appendChild(el("div", "kb-le-row kb-le-recv"));
    const inp = rf.appendChild(el("input", "kb-le-in")); inp.id = "kb-le-recv-in"; inp.placeholder = "Dán mã thiệp bạn gửi (KBC1:…)"; inp.value = recvInput;
    inp.addEventListener("input", () => { recvInput = inp.value; });
    inp.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); peekCode(); } });
    const pb = rf.appendChild(el("button", "kb-btn kb-btn-small", "Xem thiệp")); pb.type = "button"; pb.id = "kb-le-recv-peek";
    pb.addEventListener("click", peekCode);
    const pm = card.appendChild(el("div", "kb-le-note" + (peekBad ? " is-bad" : ""), peekMsg)); pm.id = "kb-le-recv-msg";
    if (peek) {
      const pv = card.appendChild(el("div", "kb-le-mem-card kb-le-peek"));
      if (typeof GardenLeCard !== "undefined") { pv.appendChild(GardenLeCard.thumb(peek.card, 3)); }
      const row = pv.appendChild(el("div", "kb-h-btns"));
      if (!peek.have) {
        const kb = row.appendChild(el("button", "kb-btn kb-btn-small", "Giữ vào Album")); kb.type = "button"; kb.id = "kb-le-recv-keep";
        kb.addEventListener("click", () => { if (H) { H.send("le:recv:" + peek.code); } });
      }
      const xb = row.appendChild(el("button", "kb-btn kb-btn-small", "Huỷ")); xb.type = "button";
      xb.addEventListener("click", () => { peek = null; peekMsg = ""; refresh(); });
    }
    card.appendChild(el("div", "kb-le-hintt", "Mã thiệp chỉ có hình + chữ trên thiệp (không có điều ước, không có gì về deck). Album giữ tối đa 12 thiệp nhận."));
  }
  function peekCode() {
    const t = (recvInput || "").trim();
    if (!t) { peekMsg = "Dán mã thiệp vào ô trước đã."; peekBad = true; refresh(); return; }
    if (H) { H.send("le:rpeek:" + t); }
  }
  function refresh() { if (typeof GardenHome !== "undefined" && GardenHome.refreshList) { GardenHome.refreshList(); } }
  function result(res) {
    if (!res) { return; }
    if (res.act === "rpeek") {
      if (res.ok) { peek = { card: res.card, code: res.code, have: res.have }; peekMsg = res.have ? "Thiệp này đã có trong Album." : ""; peekBad = false; sfx("flip"); }
      else { peek = null; peekMsg = res.msg || "Mã thiệp không đúng."; peekBad = true; sfx("again"); }
      refresh();
    } else if (res.act === "recv") {
      if (res.ok) { peek = null; recvInput = ""; peekMsg = "Đã giữ thiệp vào Album."; peekBad = false; sfx("coin"); }
      else { peekMsg = res.msg || "Chưa giữ được."; peekBad = true; sfx("again"); }
      refresh();
    } else if (res.act === "rdel" || res.act === "card" || res.act === "cdel" || res.act === "hang" || res.act === "fixed") {
      if (res.act === "rdel" && !res.ok) { peekMsg = res.msg || ""; peekBad = true; }
      if (typeof GardenHome !== "undefined" && GardenHome.albumView && GardenHome.albumView() === "le") { refresh(); }
    } else if (res.act === "rcode" || (res.act === "code" && !(typeof GardenLeCard !== "undefined" && GardenLeCard.isOpen()))) {
      if (H && H.toast) { H.toast(res.ok ? (res.copied ? "Đã chép mã thiệp — dán gửi bạn nhé." : "Mã thiệp: " + res.code) : (res.msg || "Không chép được."), null, 5000); }
    } else if (res.act === "seen" || res.act === "read") {
      if (typeof GardenHome !== "undefined" && GardenHome.albumView && GardenHome.albumView() === "le") { refresh(); }
    }
  }

  return {
    init: function (helpers) {
      H = helpers;
      document.addEventListener("keydown", (ev) => {
        if (ev.key !== "Escape") { return; }
        if (showOpen()) {
          ev.stopImmediatePropagation(); ev.preventDefault(); window.__kbEscUsed = true;
          if (show && !show.final) { finish(); } else { closeShow(); }
          return;
        }
        for (const id of ["kb-le-letter", "kb-le-packpop"]) {
          const p = $(id);
          if (p && !p.hidden) { ev.stopImmediatePropagation(); ev.preventDefault(); window.__kbEscUsed = true; p.hidden = true; return; }
        }
      }, true);
      window.addEventListener("resize", () => { if (showOpen() && show && show.final) { frame(); } });
    },
    render: renderData, result: result,
    play: play, openLetter: openLetter, openPack: openPack, closeShow: closeShow, hasAlbum: hasAlbum, album: album,
    isShowing: showOpen,
    // cho test
    _plan: planScene, _T: T, _pending: pending, _finish: finish, _seek: function (ms) { if (show) { show.t0 = Date.now() - ms; } }
  };
})();
