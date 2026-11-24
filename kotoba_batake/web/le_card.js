/* ことば畑 – 1.36.1: thiệp Giáng sinh (le_core.py giữ mọi luật; file này vẽ + gửi lệnh).
   - Xưởng thiệp (#kb-le-cardpop): 3 thiệp, thiệp 120 × 80 điểm — 4 khung (Đèn nháy, Tuyết trắng, Cành thông, Giấy quà), sticker
     là hình có sẵn của vườn (6 hình + món đã mở ở tủ lịch + đồ trong vườn của bạn): bấm thêm, kéo để dời, Lật / To – nhỏ / Bỏ;
     lời chúc 2 dòng + câu chúc 7 tiếng; mặt sau "Điều ước" (tiếng Việt hoặc tiếng đang học, "Nhờ Gemini sửa" khi bấm).
   - Treo lên cây cho ông già Noel (tới 18:00 ngày 24, giờ máy) · Lưu ảnh PNG (chữ ことば畑 nhỏ ở góc) · Chép mã gửi bạn (chỉ mặt
     trước, không có điều ước).
   - drawCard(): vẽ thiệp (dùng chung cho Album → Kỷ niệm, thư, ảnh PNG).
   Tự lưu sau khi thôi sửa ~0,8 giây ("le:card:{i, card, rid}"); đóng bảng là lưu nốt. Không dùng emoji. */
var GardenLeCard = (function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const W = 120, HH = 80;
  const FONT = "\"Noto Sans\", \"Noto Sans CJK JP\", \"Segoe UI\", sans-serif";
  const BASE = ["xmastree", "presents", "yukidaruma", "stackchan", "wreath", "sleigh"];
  const BASE_NAMES = { xmastree: "Cây thông Noel", presents: "Hộp quà", yukidaruma: "Người tuyết", stackchan: "StackChan đội mũ Noel",
    wreath: "Vòng hoa", sleigh: "Xe tuần lộc" };
  const FRAME = {
    den: { sky: ["#1f2b52", "#2b3d70"], ink: "#fff8e6", sub: "#ffd23f", foot: "#1f2b52" },
    tuyet: { sky: ["#8fb8e8", "#bcd6f2"], ink: "#16314f", sub: "#c21f3a", foot: "#16314f" },
    thong: { sky: ["#2b4a3a", "#3b6a50"], ink: "#fff8e6", sub: "#ffd23f", foot: "#1f5f2a" },
    qua: { sky: ["#7a1f2a", "#a8303e"], ink: "#fff8e6", sub: "#ffe9a8", foot: "#7a1f2a" }
  };
  const LANG_NAMES = { vi: "Tiếng Việt", ja: "Tiếng Nhật", en: "Tiếng Anh", zh: "Tiếng Trung", ko: "Tiếng Hàn", de: "Tiếng Đức", fr: "Tiếng Pháp" };
  const WISH_LANGS = ["vi", "ja", "en", "zh", "ko", "de", "fr"];
  let H = null;
  let slot = 0, draft = null, side = "front", sel = -1, drag = null, tab = "base";
  let dirty = false, timer = 0, rid = 0, retry = 0, msg = "", msgBad = false, S = 4, fixWait = false, codeShown = "";
  let delArm = 0, kq = 0;
  // 1.36.2 (audit #04, #13): thiệp đã gửi mà chưa lưu xong, theo từng ô ({rid, q, card, failed}) — Anki đang đồng bộ thì lệnh bị bỏ
  // (Python trả lời sync: true) → gửi lại sau; đổi sang ô khác trong lúc đó không mất lần sửa (trước: chỉ gửi lại khi còn ở ô cũ)
  const pend = {};
  const CTRL = /[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
  // 1.36.2 (audit #03): chữ một dòng như le_core._line (NFC, xuống dòng → dấu cách, gộp khoảng trắng, bỏ khoảng trắng đầu / cuối)
  // — điều ước Python lưu là chữ đã chuẩn hoá, trang so bản Gemini sửa với chữ trong ô theo cùng cách
  function normW(t) {
    let x = String(t || "");
    try { x = x.normalize("NFC"); } catch (e) { /* bỏ qua */ }
    return x.replace(/[\r\n\t]/g, " ").replace(CTRL, "").replace(/ {2,}/g, " ").trim();
  }

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function data() { const d = H && H.data && H.data(); return d || null; }
  function le() { const d = data(); return (d && d.le) || null; }
  function lib() { return typeof GardenHome !== "undefined" && GardenHome._lib ? GardenHome._lib() : null; }
  function art() { return typeof GardenLeArt !== "undefined" ? GardenLeArt : null; }
  function fxl() { return typeof GardenFX !== "undefined" && GardenFX.lib && GardenFX.lib.paintFace ? GardenFX.lib : null; }
  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
  function clone(x) { return x ? JSON.parse(JSON.stringify(x)) : null; }
  function limits() { const v = le(); return (v && v.limits) || { t1: 28, t2: 28, wish: 160, stickers: 12, cards: 3 }; }
  function deckLang() {
    try { const g = typeof GardenLang !== "undefined" && GardenLang.auto ? GardenLang.auto() : ""; return WISH_LANGS.indexOf(g) >= 0 ? g : "vi"; } catch (e) { return "vi"; }
  }

  // =====================================================================================================
  // Vẽ thiệp
  // =====================================================================================================
  function stickerRows(id) {
    const L = lib();
    if (L && L.SPR && L.SPR[id]) { return L.SPR[id]; }
    const A = art();
    if (A && A.ITEMS[id]) { return A.ITEMS[id]; }
    return null;
  }
  function stickerSize(s) {
    const z = s.z === 2 ? 2 : 1;
    if (s.s === "stackchan") { return fxl() ? [20 * z, 21 * z] : null; }
    const r = stickerRows(s.s);
    return r ? [r[0].length * z, r.length * z] : null;
  }
  function paintRows(ctx, rows, x, y, k) {
    const L = lib();
    if (L && L.sprite) { L.sprite(ctx, rows, x, y, k, L.P); } else if (art()) { art().paint(ctx, rows, x, y, k); }
  }
  function drawSticker(ctx, S0, s) {
    const sz = stickerSize(s);
    if (!sz) { return null; }
    const z = s.z === 2 ? 2 : 1, k = S0 * z;
    ctx.save();
    if (s.m) { ctx.translate((s.x + sz[0]) * S0, 0); ctx.scale(-1, 1); ctx.translate(-s.x * S0, 0); }
    if (s.s === "stackchan") {
      ctx.translate(s.x * S0, s.y * S0);
      try { fxl().paintFace(ctx, k, "happy", 0, 0, { head: "santa" }); } catch (e) { /* bỏ qua */ }
    } else {
      paintRows(ctx, stickerRows(s.s), s.x / z, s.y / z, k);
    }
    ctx.restore();
    return sz;
  }
  function rnd(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  function fitFont(ctx, t, px, maxW, bold) {
    let size = px;
    for (;;) {
      ctx.font = (bold ? "700 " : "") + size.toFixed(1) + "px " + FONT;
      if (ctx.measureText(t).width <= maxW || size <= 5) { return size; }
      size -= Math.max(0.5, px * 0.05);
    }
  }
  function frameBorder(ctx, S0, f, box) {
    if (f === "thong") {
      for (let i = 0; i < W; i += 3) { box(i, 0, 3, 3, i % 2 ? "#2e8b3a" : "#1f5f2a"); box(i, HH - 3, 3, 3, i % 2 ? "#1f5f2a" : "#2e8b3a"); }
      for (let j = 0; j < HH; j += 3) { box(0, j, 3, 3, j % 2 ? "#2e8b3a" : "#1f5f2a"); box(W - 3, j, 3, 3, j % 2 ? "#1f5f2a" : "#2e8b3a"); }
      for (let i = 6; i < W; i += 14) { box(i, 1, 2, 2, "#ff4f6d"); box(i + 7, HH - 2, 2, 1, "#ffd23f"); }
    } else if (f === "qua") {
      box(0, 0, W, 3, "#c21f3a"); box(0, HH - 3, W, 3, "#c21f3a"); box(0, 0, 3, HH, "#c21f3a"); box(W - 3, 0, 3, HH, "#c21f3a");
      box(W / 2 - 2, 0, 4, 3, "#ffd23f"); box(W / 2 - 2, HH - 3, 4, 3, "#ffd23f"); box(0, HH / 2 - 2, 3, 4, "#ffd23f"); box(W - 3, HH / 2 - 2, 3, 4, "#ffd23f");
    } else if (f === "tuyet") {
      box(0, 0, W, 2, "#ffffff"); box(0, HH - 2, W, 2, "#ffffff"); box(0, 0, 2, HH, "#ffffff"); box(W - 2, 0, 2, HH, "#ffffff");
      for (let i = 4; i < W; i += 8) { box(i, 2, 1, 2, "#ffffff"); box(i + 1, 2, 1, 1, "#ffffff"); }
    } else {
      box(0, 0, W, 2, "#1b1b2f"); box(0, HH - 2, W, 2, "#1b1b2f"); box(0, 0, 2, HH, "#1b1b2f"); box(W - 2, 0, 2, HH, "#1b1b2f");
      const C = ["#ff4f6d", "#ffd23f", "#3ccb5e", "#3d8bff"];
      for (let i = 3, k = 0; i < W - 3; i += 6, k++) { box(i, 2 + (k % 2), 6, 1, "#1b1b2f"); box(i + 2, 3 + (k % 2), 2, 2, C[k % 4]); }
    }
  }
  function shadowText(ctx, t, x, y, col, glow) {
    ctx.fillStyle = glow ? "rgba(255,255,255,.75)" : "rgba(0,0,0,.45)";
    const d = Math.max(1, ctx.__s / 3);
    ctx.fillText(t, x + d, y + d);
    ctx.fillStyle = col; ctx.fillText(t, x, y);
  }
  function chucText(c) { const v = le(); return (c.c && v && v.chuc && v.chuc[c.c]) || ""; }
  // o: {back, sel (chỉ số sticker đang chọn), mark (chữ ことば畑 ở góc — ảnh PNG), hung, taken}
  function drawCard(ctx, S0, card, o) {
    o = o || {};
    ctx.imageSmoothingEnabled = false;
    ctx.__s = S0;
    if (o.back) { drawBack(ctx, S0, card || {}, o); return; }
    const c = card || { f: "den", st: [] }, fr = FRAME[c.f] || FRAME.den, R = rnd((c.f || "den").length * 31 + 7);
    const box = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x * S0), Math.round(y * S0), Math.ceil(w * S0), Math.ceil(h * S0)); };
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W * S0, HH * S0); ctx.clip();
    box(0, 0, W, HH, fr.sky[0]); box(0, 34, W, 32, fr.sky[1]);
    for (let i = 0; i < 70; i++) { const x = Math.floor(R() * W), y = Math.floor(R() * 62); box(x, y, 1, 1, i % 5 ? "#ffffff" : "#ffd23f"); }
    box(0, 64, W, 16, "#eef3f8");
    for (let i = 0; i < W; i += 7) { box(i, 63, 4, 1, "#eef3f8"); box(i + 2, 66, 3, 1, "#d5e2ee"); }
    const boxes = [];
    (c.st || []).forEach((s) => { boxes.push(drawSticker(ctx, S0, s)); });
    frameBorder(ctx, S0, c.f, box);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (c.t1) { fitFont(ctx, c.t1, 9 * S0, (W - 14) * S0, true); shadowText(ctx, c.t1, W / 2 * S0, 13 * S0, fr.ink); }
    const ch = chucText(c);
    if (ch) { fitFont(ctx, ch, 6 * S0, (W - 20) * S0, false); shadowText(ctx, ch, W / 2 * S0, (c.t1 ? 24 : 13) * S0, fr.sub); }
    if (c.t2) {
      ctx.textAlign = "right";
      fitFont(ctx, c.t2, 5.5 * S0, (W - 16) * S0, false); shadowText(ctx, c.t2, (W - 6) * S0, 73 * S0, fr.foot, true);
    }
    if (o.mark) {
      ctx.textAlign = "left"; ctx.globalAlpha = 0.75;
      ctx.font = "700 " + (4.2 * S0).toFixed(1) + "px " + FONT; shadowText(ctx, "ことば畑", 5 * S0, 74 * S0, "#4a5a78", true);
      ctx.globalAlpha = 1;
    }
    if (o.sel !== undefined && o.sel >= 0 && boxes[o.sel] && c.st[o.sel]) {
      const s = c.st[o.sel], b = boxes[o.sel];
      ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = Math.max(1, S0 / 2); ctx.setLineDash([S0 * 1.5, S0]);
      ctx.strokeRect((s.x - 1) * S0, (s.y - 1) * S0, (b[0] + 2) * S0, (b[1] + 2) * S0); ctx.setLineDash([]);
    }
    ctx.restore();
  }
  function wrap(ctx, t, maxW) {
    const out = [];
    const words = /\s/.test(t) ? t.split(/(\s+)/) : Array.from(t);
    let line = "";
    words.forEach((w) => {
      const next = line + w;
      if (line && ctx.measureText(next.trim()).width > maxW) { out.push(line.trim()); line = w.trim() ? w : ""; } else { line = next; }
      while (ctx.measureText(line).width > maxW && line.length > 1) {      // một từ dài hơn cả dòng
        let cut = line.length - 1;
        while (cut > 1 && ctx.measureText(line.slice(0, cut)).width > maxW) { cut--; }
        out.push(line.slice(0, cut)); line = line.slice(cut);
      }
    });
    if (line.trim()) { out.push(line.trim()); }
    return out;
  }
  function drawBack(ctx, S0, c, o) {
    const box = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x * S0), Math.round(y * S0), Math.ceil(w * S0), Math.ceil(h * S0)); };
    box(0, 0, W, HH, "#fff8e6");
    for (let i = 0; i < W; i += 6) { box(i, 0, 3, 2, i % 12 ? "#2e8b3a" : "#c21f3a"); box(i + 3, HH - 2, 3, 2, i % 12 ? "#c21f3a" : "#2e8b3a"); }
    for (let j = 0; j < HH; j += 6) { box(0, j, 2, 3, j % 12 ? "#c21f3a" : "#2e8b3a"); box(W - 2, j + 3, 2, 3, j % 12 ? "#2e8b3a" : "#c21f3a"); }
    for (let y = 26; y < HH - 6; y += 8) { box(8, y, W - 16, 0.4, "#e3d3b0"); }
    ctx.save(); ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left"; ctx.fillStyle = "#7a1f2a"; ctx.font = "700 " + (6.5 * S0).toFixed(1) + "px " + FONT;
    ctx.fillText("Điều ước", 8 * S0, 13 * S0);
    ctx.textAlign = "right"; ctx.fillStyle = "#8a7a66"; ctx.font = (4.5 * S0).toFixed(1) + "px " + FONT;
    ctx.fillText(LANG_NAMES[c.wl] || "", (W - 8) * S0, 13 * S0);
    ctx.textAlign = "left";
    const t = c.w || "";
    ctx.font = (5.4 * S0).toFixed(1) + "px " + FONT;
    if (t) {
      ctx.fillStyle = "#2b2b44";
      wrap(ctx, t, (W - 18) * S0).slice(0, 7).forEach((ln, k) => ctx.fillText(ln, 9 * S0, (24.5 + k * 8) * S0));
    } else {
      ctx.fillStyle = "#b0a08a"; ctx.fillText("(chưa viết điều ước)", 9 * S0, 24.5 * S0);
    }
    if (o.taken) {        // dấu đỏ "Ông già Noel đã nhận"
      ctx.translate((W - 24) * S0, (HH - 19) * S0); ctx.rotate(-0.18);
      ctx.strokeStyle = "rgba(194,31,58,.85)"; ctx.lineWidth = Math.max(1, S0 * 0.7);
      ctx.beginPath(); ctx.arc(0, 0, 15 * S0, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 13 * S0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(194,31,58,.9)"; ctx.textAlign = "center";
      fitFont(ctx, "Ông già Noel", 3.6 * S0, 22 * S0, true); ctx.fillText("Ông già Noel", 0, -1.5 * S0);
      fitFont(ctx, "đã nhận · 24/12", 3.2 * S0, 22 * S0, false); ctx.fillText("đã nhận · 24/12", 0, 4 * S0);
    } else if (o.hung) {
      ctx.fillStyle = "#2e8b3a"; ctx.font = "700 " + (4.2 * S0).toFixed(1) + "px " + FONT;
      ctx.fillText("Đang treo trên cây", 9 * S0, (HH - 6) * S0);
    }
    ctx.restore();
  }
  // canvas nhỏ của một thiệp (Album, thư, thiệp nhận)
  function thumb(card, scale, o) {
    const cv = el("canvas", "kb-le-cthumb");
    cv.width = W * scale; cv.height = HH * scale;
    const ctx = cv.getContext("2d");
    drawCard(ctx, scale, card, o);
    return cv;
  }
  function pngOf(card, back) {
    const cv = document.createElement("canvas");
    cv.width = W * 4; cv.height = HH * 4;
    drawCard(cv.getContext("2d"), 4, card, { mark: true, back: !!back });
    return cv.toDataURL("image/png");
  }
  function savePng(card, name) {
    if (!H || !card) { return; }
    let url = "";
    try { url = pngOf(card); } catch (e) { note("Không vẽ được ảnh thiệp.", true); return; }
    const d = new Date(), day = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    sfx("flip");
    H.send("snap:save:" + JSON.stringify({ name: (name || "kotoba_batake_thiep") + "_" + day + ".png", url: url, what: "card" }));
  }

  // =====================================================================================================
  // Xưởng thiệp
  // =====================================================================================================
  function cardsOf() { const v = le(); return (v && v.cards) || [null, null, null]; }
  function editable() {
    const v = le();
    return !!(v && v.card_edit && slot !== v.taken && draft);
  }
  function lockWhy() {
    const v = le();
    if (!v) { return ""; }
    if (draft && slot === v.taken) { return "Ông già Noel đã mang thiệp này đi — giữ làm kỷ niệm (lưu ảnh / chép mã vẫn được)."; }
    if (!v.card_edit) { return v.phase === "done" ? "Mùa Giáng sinh đã qua — thiệp chỉ xem, lưu ảnh, chép mã." : "Xưởng thiệp mở từ 1/12."; }
    return "";
  }
  function newCard() {
    const dl = deckLang();
    return { f: "den", st: [{ s: "xmastree", x: 6, y: 22 }, { s: "presents", x: 30, y: 50 }, { s: "stackchan", x: 86, y: 43 }],
      t1: "Giáng sinh an lành!", t2: "", c: dl !== "vi" ? dl : "", w: "", wl: dl };
  }
  function loadSlot(i) {
    flush();
    slot = i; sel = -1; drag = null; side = side === "back" ? "back" : "front"; codeShown = ""; delArm = 0;
    const p = pend[i];
    draft = clone(p ? p.card : cardsOf()[i]);      // bản chưa lưu xong của ô này (đang đồng bộ / Anki ghi lỗi) thắng bản trong sổ
    if (p && p.failed) { dirty = true; }
    msg = "";
  }
  function markDirty() {
    if (!editable()) { return; }
    dirty = true;
    kq++;
    // 1.36.2 (audit #05): Python giữ bản đang sửa (chỉ bộ nhớ) — đóng cửa sổ / hồ sơ trước lần tự lưu thì lưu nốt
    if (H && draft) { H.send("le:keep:" + JSON.stringify({ i: slot, q: kq, card: draft })); }
    clearTimeout(timer);
    timer = setTimeout(flush, 800);
  }
  function sendPend(i) {
    const p = pend[i];
    if (!p || !H) { return; }
    rid++; p.rid = rid; p.failed = false; p.sync = false;
    H.send("le:card:" + JSON.stringify({ i: i, card: p.card, rid: rid, q: p.q }));
  }
  function armRetry(ms) {
    clearTimeout(retry);
    // không có trả lời / Anki đang đồng bộ → gửi lại mọi ô chưa lưu xong (Python lưu theo dấu thời gian — gửi lặp không hại)
    retry = setTimeout(() => {
      retry = 0;
      let left = false;
      Object.keys(pend).forEach((k) => { const p = pend[k]; if (p && !p.failed) { sendPend(+k); left = true; } });
      if (left) { armRetry(6000); }
    }, ms);
  }
  function flush() {
    clearTimeout(timer); timer = 0;
    if (!dirty || !draft || !H) { return; }
    dirty = false;
    pend[slot] = { rid: 0, q: kq, card: clone(draft), failed: false };
    sendPend(slot);
    armRetry(6000);
  }
  function note(t, bad) {
    msg = t || ""; msgBad = !!bad;
    const n = $("kb-le-cnote");
    if (n) { n.textContent = msg || lockWhy(); n.classList.toggle("is-bad", !!(msg && msgBad)); }
  }
  function canvasS() {
    const avail = Math.min(window.innerWidth - 40, 980) * (window.innerWidth >= 860 ? 0.5 : 0.92);
    return Math.max(2, Math.min(4, Math.floor(avail / W)));
  }
  function paint() {
    const cv = $("kb-le-cardcv");
    if (!cv) { return; }
    const want = canvasS();
    if (want !== S || cv.width !== W * want) { S = want; cv.width = W * S; cv.height = HH * S; cv.style.width = W * S + "px"; cv.style.height = HH * S + "px"; }
    const col = cv.parentNode;
    if (col && col.style.width !== (W * S + 6) + "px") { col.style.width = (W * S + 6) + "px"; }
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    if (!draft) {
      ctx.fillStyle = "#f3ead6"; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.strokeStyle = "#c9b48a"; ctx.setLineDash([6, 5]); ctx.lineWidth = 2; ctx.strokeRect(4, 4, cv.width - 8, cv.height - 8); ctx.setLineDash([]);
      return;
    }
    const v = le() || {};
    drawCard(ctx, S, draft, { back: side === "back", sel: side === "front" && editable() ? sel : -1, hung: v.hang === slot, taken: v.taken === slot });
  }
  function build() {
    let pop = $("kb-le-cardpop");
    if (pop) { return pop; }
    pop = el("div", "kb-le-pop kb-le-cardpop"); pop.id = "kb-le-cardpop"; pop.hidden = true;
    pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Thiệp Giáng sinh");
    const head = pop.appendChild(el("div", "kb-le-head"));
    head.appendChild(el("b", "", "Thiệp Giáng sinh"));
    const slots = head.appendChild(el("span", "kb-le-slots")); slots.id = "kb-le-slots";
    const x = head.appendChild(el("button", "kb-pin-x", "✕")); x.type = "button"; x.setAttribute("aria-label", "Đóng");
    x.addEventListener("click", (ev) => { ev.stopPropagation(); close(); });
    const body = pop.appendChild(el("div", "kb-le-cw"));
    const left = body.appendChild(el("div", "kb-le-cl"));
    const cv = left.appendChild(document.createElement("canvas")); cv.id = "kb-le-cardcv"; cv.className = "kb-le-cardcv";
    cv.tabIndex = 0; cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Thiệp");
    const sides = left.appendChild(el("div", "kb-h-btns kb-le-sides")); sides.id = "kb-le-sides";
    [["front", "Mặt trước"], ["back", "Mặt sau · Điều ước"]].forEach(([k, t]) => {
      const b = sides.appendChild(el("button", "kb-btn kb-btn-small", t)); b.type = "button"; b.setAttribute("data-side", k);
      b.addEventListener("click", () => { side = k; sel = -1; render(); });
    });
    const empty = left.appendChild(el("div", "kb-le-cempty")); empty.id = "kb-le-cempty";
    empty.appendChild(el("span", "", "Ô này chưa có thiệp."));
    const nb = empty.appendChild(el("button", "kb-btn kb-btn-small", "Làm thiệp mới ▸")); nb.type = "button"; nb.id = "kb-le-cnew";
    nb.addEventListener("click", () => { draft = newCard(); side = "front"; sel = -1; dirty = false; markDirty(); render(); sfx("flip"); });
    // mặt trước: lời chúc
    const ff = left.appendChild(el("div", "kb-le-form")); ff.id = "kb-le-ff";
    const lim = limits();
    const t1 = ff.appendChild(el("input", "kb-le-in")); t1.id = "kb-le-t1"; t1.maxLength = lim.t1; t1.placeholder = "Lời chúc (dòng 1)";
    const t2 = ff.appendChild(el("input", "kb-le-in")); t2.id = "kb-le-t2"; t2.maxLength = lim.t2; t2.placeholder = "Dòng 2 · ký tên (vd. — Lan gửi cả nhà)";
    [t1, t2].forEach((inp) => {
      inp.addEventListener("input", () => { if (!draft || !editable()) { return; } draft[inp.id === "kb-le-t1" ? "t1" : "t2"] = inp.value; paint(); markDirty(); });
      inp.addEventListener("blur", flush);
    });
    const chucs = ff.appendChild(el("div", "kb-le-chucs")); chucs.id = "kb-le-chucs";
    // mặt sau: điều ước
    const bf = left.appendChild(el("div", "kb-le-form")); bf.id = "kb-le-bf";
    const lr = bf.appendChild(el("div", "kb-le-row"));
    lr.appendChild(el("span", "kb-le-lab", "Viết bằng"));
    const wl = lr.appendChild(el("select", "kb-le-sel")); wl.id = "kb-le-wl";
    WISH_LANGS.forEach((k) => { const o = wl.appendChild(el("option", "", LANG_NAMES[k])); o.value = k; });
    wl.addEventListener("change", () => { if (!draft || !editable()) { return; } draft.wl = wl.value; paint(); markDirty(); renderFix(); });
    const wi = bf.appendChild(el("textarea", "kb-le-in kb-le-wish")); wi.id = "kb-le-wish"; wi.rows = 3; wi.maxLength = lim.wish;
    wi.placeholder = "Điều ước gửi ông già Noel…";
    wi.addEventListener("input", () => { if (!draft || !editable()) { return; } draft.w = wi.value.replace(/\n/g, " "); paint(); markDirty(); renderFix(); });
    wi.addEventListener("blur", flush);
    const fr = bf.appendChild(el("div", "kb-le-row"));
    const fb = fr.appendChild(el("button", "kb-btn kb-btn-small", "Nhờ Gemini sửa")); fb.type = "button"; fb.id = "kb-le-fix";
    fb.addEventListener("click", askFix);
    fr.appendChild(el("span", "kb-le-hintt", "")).id = "kb-le-fixhint";
    bf.appendChild(el("div", "kb-le-fixres")).id = "kb-le-fixres";
    // sticker đang chọn
    const sb = left.appendChild(el("div", "kb-h-btns kb-le-selbar")); sb.id = "kb-le-selbar";
    [["flip", "Lật"], ["size", "To / nhỏ"], ["up", "Lên trên"], ["del", "Bỏ"]].forEach(([k, t]) => {
      const b = sb.appendChild(el("button", "kb-btn kb-btn-small", t)); b.type = "button"; b.setAttribute("data-sel", k);
      b.addEventListener("click", () => selAct(k));
    });
    sb.appendChild(el("span", "kb-le-hintt", "kéo trên thiệp để dời · phím mũi tên dời từng điểm"));
    // cột phải
    const right = body.appendChild(el("div", "kb-le-cr")); right.id = "kb-le-cr";
    right.appendChild(el("div", "kb-le-sec", "Khung thiệp"));
    right.appendChild(el("div", "kb-le-frames")).id = "kb-le-frames";
    right.appendChild(el("div", "kb-le-sec", "Sticker · bấm để thêm vào thiệp")).id = "kb-le-stk-t";
    const tabs = right.appendChild(el("div", "kb-h-btns kb-le-tabs")); tabs.id = "kb-le-stk-tabs";
    [["base", "Có sẵn"], ["le", "Tủ lịch"], ["own", "Đồ của bạn"]].forEach(([k, t]) => {
      const b = tabs.appendChild(el("button", "kb-btn-small kb-album-chip", t)); b.type = "button"; b.setAttribute("data-tab", k);
      b.addEventListener("click", () => { tab = k; renderStickers(); });
    });
    right.appendChild(el("div", "kb-le-stk")).id = "kb-le-stk";
    right.appendChild(el("div", "kb-le-sec", "Xong thiệp"));
    const done = right.appendChild(el("div", "kb-h-btns kb-le-done")); done.id = "kb-le-done";
    const hb = done.appendChild(el("button", "kb-btn kb-btn-small kb-le-hangb", "")); hb.type = "button"; hb.id = "kb-le-hang";
    hb.addEventListener("click", hang);
    const pb = done.appendChild(el("button", "kb-btn kb-btn-small", "Lưu ảnh PNG")); pb.type = "button"; pb.id = "kb-le-png";
    pb.addEventListener("click", () => { flush(); savePng(draft, "kotoba_batake_thiep_" + (slot + 1)); });
    const cb = done.appendChild(el("button", "kb-btn kb-btn-small", "Chép mã thiệp")); cb.type = "button"; cb.id = "kb-le-code";
    cb.addEventListener("click", () => { flush(); if (H) { H.send("le:code:" + slot); } });
    const db = done.appendChild(el("button", "kb-btn kb-btn-small kb-le-delb", "Xoá thiệp")); db.type = "button"; db.id = "kb-le-cdel";
    db.addEventListener("click", delCard);
    const cbox = right.appendChild(el("input", "kb-le-in kb-le-codebox")); cbox.id = "kb-le-codebox"; cbox.readOnly = true; cbox.hidden = true;
    cbox.addEventListener("focus", () => cbox.select());
    right.appendChild(el("div", "kb-le-hintt", "Làm thiệp không tốn xu · lưu tối đa 3 thiệp · mã thiệp chỉ có mặt trước (không có điều ước)."));
    const nt = pop.appendChild(el("div", "kb-le-note")); nt.id = "kb-le-cnote"; nt.setAttribute("aria-live", "polite");
    pop.addEventListener("click", (ev) => ev.stopPropagation());
    // kéo sticker
    cv.addEventListener("mousedown", (ev) => {
      if (side !== "front" || !editable()) { return; }
      const p = pt(ev), k = hit(p.x, p.y);
      sel = k;
      if (k >= 0) { const s = draft.st[k]; drag = { k: k, dx: p.x - s.x, dy: p.y - s.y, moved: false }; ev.preventDefault(); }
      render();
      try { cv.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
    });
    window.addEventListener("mousemove", (ev) => {
      if (!drag || !draft) { return; }
      const p = pt(ev), s = draft.st[drag.k];
      if (!s) { drag = null; return; }
      const nx = Math.round(p.x - drag.dx), ny = Math.round(p.y - drag.dy);
      if (nx !== s.x || ny !== s.y) { s.x = Math.max(-48, Math.min(W, nx)); s.y = Math.max(-48, Math.min(HH, ny)); drag.moved = true; paint(); }
    });
    window.addEventListener("mouseup", () => { if (drag) { if (drag.moved) { markDirty(); } drag = null; } });
    cv.addEventListener("keydown", (ev) => {
      if (side !== "front" || !editable() || sel < 0 || !draft.st[sel]) { return; }
      const s = draft.st[sel], step = ev.shiftKey ? 4 : 1;
      const mv = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
      if (mv) { s.x = Math.max(-48, Math.min(W, s.x + mv[0])); s.y = Math.max(-48, Math.min(HH, s.y + mv[1])); ev.preventDefault(); ev.stopPropagation(); paint(); markDirty(); return; }
      if (ev.key === "Delete" || ev.key === "Backspace") { ev.preventDefault(); ev.stopPropagation(); selAct("del"); }
    });
    ($("kb-app") || document.body).appendChild(pop);
    return pop;
  }
  function pt(ev) {
    const cv = $("kb-le-cardcv"), r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / (r.width / W), y: (ev.clientY - r.top) / (r.height / HH) };
  }
  function hit(x, y) {
    if (!draft) { return -1; }
    for (let k = draft.st.length - 1; k >= 0; k--) {
      const s = draft.st[k], sz = stickerSize(s);
      if (sz && x >= s.x && x < s.x + sz[0] && y >= s.y && y < s.y + sz[1]) { return k; }
    }
    return -1;
  }
  function selAct(k) {
    if (!editable() || sel < 0 || !draft.st[sel]) { return; }
    const s = draft.st[sel];
    if (k === "flip") { s.m = s.m ? 0 : 1; if (!s.m) { delete s.m; } }
    else if (k === "size") { const sz = stickerSize(s); if (s.z === 2) { delete s.z; } else if (sz && sz[0] <= 24 && sz[1] <= 24) { s.z = 2; } else { note("Hình này đã to — chỉ phóng được hình nhỏ.", false); return; } }
    else if (k === "up") { draft.st.splice(sel, 1); draft.st.push(s); sel = draft.st.length - 1; }
    else if (k === "del") { draft.st.splice(sel, 1); sel = -1; }
    sfx("boop"); render(); markDirty();
  }
  function addSticker(id) {
    if (!editable() || side !== "front") { return; }
    if (draft.st.length >= limits().stickers) { note("Thiệp có tối đa " + limits().stickers + " sticker — bỏ bớt rồi thêm nhé.", true); sfx("again"); return; }
    const s = { s: id, x: 0, y: 0 }, sz = stickerSize(s) || [16, 16];
    s.x = Math.round((W - sz[0]) / 2); s.y = Math.max(4, Math.round(64 - sz[1] + 2));
    draft.st.push(s); sel = draft.st.length - 1;
    sfx("coin"); render(); markDirty();
  }
  function stickerList() {
    const v = le() || {};
    if (tab === "le") { return (v.stickers || []).filter((id) => stickerRows(id)); }
    if (tab === "own") {
      const d = data(), own = (d && d.wallet && d.wallet.home && d.wallet.home.owned) || {};
      const mine = {};       // đồ tự làm ở Xưởng: máy bạn bè không có hình → không làm sticker (mã thiệp chỉ có id)
      ((d && d.catalog && d.catalog.items) || []).forEach((it) => { if (it.custom) { mine[it.id] = true; } });
      return Object.keys(own).filter((id) => own[id] > 0 && !mine[id] && BASE.indexOf(id) < 0 && id.indexOf("le_") !== 0 && /^[a-z][a-z0-9_]*$/.test(id) && stickerRows(id)).slice(0, 60);
    }
    return BASE.filter((id) => id === "stackchan" ? !!fxl() : !!stickerRows(id));
  }
  function itemName(id) {
    if (BASE_NAMES[id]) { return BASE_NAMES[id]; }
    const d = data(), list = (d && d.catalog && d.catalog.items) || [];
    const it = list.find((x) => x.id === id);
    return (it && it.name) || id;
  }
  function renderStickers() {
    const wrap = $("kb-le-stk"), tabs = $("kb-le-stk-tabs");
    if (!wrap) { return; }
    Array.prototype.forEach.call(tabs.querySelectorAll("[data-tab]"), (b) => {
      const on = b.getAttribute("data-tab") === tab; b.classList.toggle("is-on", on); b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    wrap.textContent = "";
    const ids = stickerList();
    if (!ids.length) {
      wrap.appendChild(el("div", "kb-le-hintt", tab === "le" ? "Mở ngăn tủ lịch để có thêm sticker (tất Noel, người tuyết, bánh kem…)." : "Chưa có đồ nào."));
      return;
    }
    ids.forEach((id) => {
      const b = wrap.appendChild(el("button", "kb-le-stkb")); b.type = "button"; b.title = itemName(id); b.setAttribute("data-stk", id);
      const cv = b.appendChild(document.createElement("canvas")); cv.width = 64; cv.height = 64;
      const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
      const s = { s: id, x: 0, y: 0 }, sz = stickerSize(s) || [16, 16], k = Math.max(1, Math.min(3, Math.floor(60 / Math.max(sz[0], sz[1]))));
      ctx.save(); ctx.translate(Math.floor((64 - sz[0] * k) / 2), Math.floor((64 - sz[1] * k) / 2)); drawSticker(ctx, k, s); ctx.restore();
      b.addEventListener("click", () => addSticker(id));
    });
  }
  function renderFrames() {
    const wrap = $("kb-le-frames"), v = le();
    if (!wrap || !v) { return; }
    wrap.textContent = "";
    (v.frames || []).forEach((f) => {
      const b = wrap.appendChild(el("button", "kb-le-frameb" + (draft && draft.f === f.id ? " is-on" : ""))); b.type = "button"; b.setAttribute("data-frame", f.id);
      b.appendChild(thumb({ f: f.id, st: [] }, 1));
      b.appendChild(el("span", "", f.name));
      b.addEventListener("click", () => { if (!editable()) { return; } draft.f = f.id; sfx("flip"); render(); markDirty(); });
    });
  }
  function renderChucs() {
    const wrap = $("kb-le-chucs"), v = le();
    if (!wrap || !v) { return; }
    wrap.textContent = "";
    const order = [deckLang()].concat(WISH_LANGS).filter((k, i, a) => a.indexOf(k) === i);
    order.forEach((k) => {
      const t = (v.chuc || {})[k];
      if (!t) { return; }
      const b = wrap.appendChild(el("button", "kb-btn-small kb-album-chip" + (draft && draft.c === k ? " is-on" : ""), t)); b.type = "button";
      b.setAttribute("data-chuc", k); b.title = LANG_NAMES[k] + (draft && draft.c === k ? " · bấm lần nữa để bỏ" : "");
      b.addEventListener("click", () => { if (!editable()) { return; } draft.c = draft.c === k ? "" : k; render(); markDirty(); });
    });
  }
  function renderFix() {
    const v = le() || {}, fb = $("kb-le-fix"), hint = $("kb-le-fixhint"), res = $("kb-le-fixres");
    if (!fb) { return; }
    const lang = draft ? draft.wl : "vi", w = draft ? normW(draft.w) : "";
    const fx = draft && draft.fx && draft.fx.for === w ? draft.fx : null;
    fb.hidden = !draft || lang === "vi";
    fb.disabled = !editable() || !w || fixWait || !!fx || (v.fix_left || 0) <= 0;
    fb.textContent = fixWait ? "Gemini đang sửa…" : "Nhờ Gemini sửa";
    hint.textContent = !draft || lang === "vi" ? "Viết tiếng đang học thì nhờ Gemini sửa được (một lượt khi bấm)." :
      (v.fix_left || 0) <= 0 ? "Hôm nay đã nhờ sửa đủ lượt — mai nhé." : "Còn " + v.fix_left + " lượt hôm nay.";
    res.textContent = "";
    if (fx) {
      res.appendChild(el("div", "kb-le-fixsua", fx.sua));
      (fx.loi || []).forEach((e) => { res.appendChild(el("div", "kb-le-fixloi", (e.goc ? e.goc + " → " : "") + e.sua + (e.gt ? " · " + e.gt : ""))); });
      if (fx.nx) { res.appendChild(el("div", "kb-le-hintt", fx.nx)); }
      if (editable() && fx.sua !== normW(draft.w)) {
        const b = res.appendChild(el("button", "kb-btn kb-btn-small", "Dùng bản sửa")); b.type = "button";
        b.addEventListener("click", () => { draft.w = fx.sua.slice(0, limits().wish); $("kb-le-wish").value = draft.w; paint(); markDirty(); renderFix(); });
      }
    }
  }
  function askFix() {
    if (!draft || !editable() || fixWait) { return; }
    flush();
    fixWait = true; renderFix();
    if (H) { H.send("le:fix:" + slot); }
  }
  function hang() {
    const v = le();
    if (!v || !H || !draft) { return; }
    flush();
    H.send("le:hang:" + (v.hang === slot ? -1 : slot));
  }
  function delCard() {
    if (!editable()) { return; }
    const go = () => { clearTimeout(timer); dirty = false; delete pend[slot]; if (H) { H.send("le:cdel:" + slot); } };
    if (typeof GardenUI !== "undefined" && GardenUI.ask) {
      GardenUI.ask({ title: "Xoá thiệp " + (slot + 1) + "?", note: "Thiệp xoá rồi không lấy lại được.", yes: "Xoá", always: true, then: go });
    } else if (Date.now() - delArm < 3000) { go(); } else { delArm = Date.now(); note("Bấm “Xoá thiệp” lần nữa để xoá.", true); }
  }
  function render() {
    const pop = $("kb-le-cardpop"), v = le();
    if (!pop || pop.hidden) { return; }
    if (!v || !v.cards) { close(); return; }
    const sl = $("kb-le-slots");
    sl.textContent = "";
    for (let i = 0; i < (limits().cards || 3); i++) {
      const c = cardsOf()[i];
      const b = sl.appendChild(el("button", "kb-btn-small kb-album-chip" + (i === slot ? " is-on" : ""),
        "Thiệp " + (i + 1) + (v.hang === i ? (v.taken === i ? " · ông đã nhận" : " · trên cây") : c ? "" : " · trống")));
      b.type = "button"; b.setAttribute("data-slot", i);
      b.addEventListener("click", () => { if (i !== slot) { loadSlot(i); render(); } });
    }
    const has = !!draft, ed = editable();
    $("kb-le-cempty").hidden = has;
    $("kb-le-cnew").hidden = !v.card_edit;
    $("kb-le-sides").hidden = !has;
    Array.prototype.forEach.call($("kb-le-sides").querySelectorAll("[data-side]"), (b) => b.classList.toggle("is-on", b.getAttribute("data-side") === side));
    $("kb-le-ff").hidden = !has || side !== "front";
    $("kb-le-bf").hidden = !has || side !== "back";
    if (has) {
      const t1 = $("kb-le-t1"), t2 = $("kb-le-t2"), wi = $("kb-le-wish"), wl = $("kb-le-wl");
      if (document.activeElement !== t1) { t1.value = draft.t1 || ""; }
      if (document.activeElement !== t2) { t2.value = draft.t2 || ""; }
      if (document.activeElement !== wi) { wi.value = draft.w || ""; }
      wl.value = draft.wl || "vi";
      [t1, t2, wi].forEach((e) => { e.readOnly = !ed; }); wl.disabled = !ed;
    }
    $("kb-le-selbar").hidden = !(ed && side === "front" && sel >= 0 && draft.st[sel]);
    $("kb-le-cr").classList.toggle("is-ro", !ed);
    $("kb-le-stk-t").hidden = $("kb-le-stk-tabs").hidden = $("kb-le-stk").hidden = !ed || side !== "front";
    const hb = $("kb-le-hang");
    hb.hidden = !has || !v.hang_edit;
    hb.textContent = v.hang === slot ? "Gỡ khỏi cây" : v.hang >= 0 ? "Treo thiệp này lên cây (thay thiệp " + (v.hang + 1) + ")" : "Treo lên cây cho ông già Noel";
    hb.title = "Treo tới 18:00 ngày 24/12 — tối đó ông già Noel ghé lấy thiệp";
    $("kb-le-png").hidden = $("kb-le-code").hidden = !has;
    $("kb-le-cdel").hidden = !has || !ed;
    const cbox = $("kb-le-codebox");
    cbox.hidden = !codeShown; cbox.value = codeShown;
    renderFrames(); renderChucs(); renderStickers(); renderFix();
    note(msg, msgBad);
    paint();
  }
  function open(i) {
    const v = le();
    if (!v || !v.cards) { return; }
    const pop = build();
    if (typeof GardenLe !== "undefined" && GardenLe.close) { GardenLe.close(); }
    if (i === undefined || i === null) {
      i = v.hang >= 0 ? v.hang : Math.max(0, (v.cards || []).findIndex((c) => !!c));
    }
    pop.hidden = false;
    loadSlot(Math.max(0, Math.min(2, i | 0)));
    side = "front";
    render();
  }
  function close() {
    const pop = $("kb-le-cardpop");
    if (!pop || pop.hidden) { return; }
    flush();
    pop.hidden = true; drag = null; sel = -1; codeShown = "";
  }
  function result(res) {
    if (!res) { return; }
    const pop = $("kb-le-cardpop"), open1 = pop && !pop.hidden;
    if (res.act === "card") {
      const p = typeof res.i === "number" ? pend[res.i] : null;
      if (!p || (res.rid !== undefined && res.rid !== p.rid)) { return; }     // trả lời của lần gửi cũ
      if (res.ok) {
        delete pend[res.i];
        if (open1 && draft && res.i === slot) { draft.at = res.at; }
      } else if (res.sync) {
        // Anki đang đồng bộ: gửi lại khi vườn dựng lại sau đồng bộ (renderData), chậm nhất 8 giây — kể cả khi đã sang ô khác /
        // đóng xưởng
        p.sync = true;
        armRetry(8000);
        if (open1 && res.i === slot) { note(res.msg, true); }
      } else if (res.retry) {
        p.failed = true;                        // Anki ghi lỗi: giữ bản này, lần sửa sau của ô đó gửi lại
        if (res.i === slot) { dirty = true; }
        if (open1 && res.i === slot) { note(res.msg || "Chưa lưu được thiệp.", true); sfx("again"); }
      } else {
        delete pend[res.i];                     // luật không cho (ông già Noel đã mang đi…): không gửi lại
        if (open1 && res.i === slot) { note(res.msg || "Chưa lưu được thiệp.", true); sfx("again"); }
      }
      return;
    }
    if (res.act === "fix" || res.act === "fixed") {
      fixWait = res.act === "fix" ? !!res.ok : false;
      if (!res.ok) { fixWait = false; note(res.msg || "Chưa sửa được.", true); sfx("again"); }
      else if (res.act === "fixed") {
        const c = (le() && le().cards || [])[res.i];
        if (open1 && draft && res.i === slot && c && c.fx) { draft.fx = c.fx; }
        note(res.i === slot ? "Gemini đã sửa điều ước — xem bên dưới." : "Gemini đã sửa điều ước của thiệp " + (res.i + 1) + " — mở thiệp đó để xem.", false);
        sfx("stage");
      }
      if (open1) { render(); }
      return;
    }
    if (!open1) {
      if (res.act === "code" && res.ok && H && H.toast) { H.toast(res.copied ? "Đã chép mã thiệp — dán gửi bạn nhé." : "Mã thiệp: " + res.code, null, 5000); }
      return;
    }
    if (res.act === "cdel") {
      const mine = typeof res.i !== "number" || res.i === slot;        // 1.36.2 (audit #13): đã sang ô khác thì ô đó không bị xoá trắng
      if (res.ok) {
        if (mine) { draft = null; dirty = false; sel = -1; }
        note("Đã xoá thiệp " + ((typeof res.i === "number" ? res.i : slot) + 1) + ".", false); sfx("boop");
      } else {
        if (mine && draft) { dirty = true; }    // chưa xoá được (đang đồng bộ…): thiệp vẫn còn — lần lưu sau giữ chữ đang thấy
        note(res.msg, true); sfx("again");
      }
    } else if (res.act === "hang") {
      if (res.ok) {
        const v = le();
        note(v && v.hang === slot ? "Đã treo thiệp lên cây thông — tối 24 ông già Noel ghé lấy." : "Đã gỡ thiệp khỏi cây.", false); sfx("coin");
      } else { note(res.msg, true); sfx("again"); }
    } else if (res.act === "code") {
      if (res.ok) { codeShown = res.code; note(res.copied ? "Đã chép mã thiệp — dán gửi bạn nhé (bạn dán ở Album → Kỷ niệm → Nhận thiệp)." : "Chép mã bên dưới gửi bạn nhé.", false); sfx("coin"); }
      else { note(res.msg, true); }
    }
    render();
  }
  let mode = null;
  function renderData() {
    const v0 = le();
    // 1.36.2: bật / tắt Xem thử sự kiện → bản chưa lưu xong thuộc chế độ cũ (sửa lúc xem thử không bao giờ sang sổ thật)
    const m = v0 ? (v0.preview ? "pv:" + (v0.preview_key || "") : "real") : mode;
    if (mode !== null && m !== mode) { Object.keys(pend).forEach((k) => { delete pend[k]; }); dirty = false; clearTimeout(timer); timer = 0; }
    mode = m;
    Object.keys(pend).forEach((k) => { if (pend[k] && pend[k].sync) { sendPend(+k); } });     // đồng bộ xong, vườn dựng lại
    const pop = $("kb-le-cardpop");
    if (!pop || pop.hidden) { return; }
    const v = le();
    if (!v || !v.cards) { close(); return; }
    if (!dirty && !timer && !drag) {          // sổ mới (lưu xong / máy khác): lấy lại thiệp nếu không đang sửa dở
      const p = pend[slot];
      const c = p ? p.card : cardsOf()[slot];
      const keepFx = draft && draft.fx;
      draft = clone(c);
      if (draft && !draft.fx && keepFx && keepFx.for === normW(draft.w)) { draft.fx = keepFx; }
    }
    render();
  }

  return {
    init: function (helpers) {
      H = helpers;
      document.addEventListener("keydown", (ev) => {
        const pop = $("kb-le-cardpop");
        if (ev.key !== "Escape" || !pop || pop.hidden) { return; }
        if (typeof GardenUI !== "undefined" && GardenUI.asking && GardenUI.asking()) { return; }
        ev.stopImmediatePropagation(); ev.preventDefault(); window.__kbEscUsed = true;
        const a = document.activeElement;
        if (a && pop.contains(a) && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.tagName === "SELECT")) { a.blur(); return; }
        if (sel >= 0) { sel = -1; render(); return; }
        close();
      }, true);
      window.addEventListener("resize", () => { const pop = $("kb-le-cardpop"); if (pop && !pop.hidden) { paint(); } });
      window.addEventListener("beforeunload", flush);
    },
    open: open, close: close, render: renderData, result: result, flush: flush,
    isOpen: () => { const p = $("kb-le-cardpop"); return !!(p && !p.hidden); },
    drawCard: drawCard, thumb: thumb, savePng: savePng, W: W, H: HH,
    // cho test
    _draft: () => draft, _slot: () => slot, _hit: hit, _stickerSize: stickerSize, _add: addSticker, _sel: (k) => { sel = k; render(); },
    _selAct: selAct, _dirty: () => dirty, _png: pngOf, _side: (s) => { side = s; render(); },
    _pend: () => JSON.parse(JSON.stringify(pend)), _norm: normW
  };
})();
