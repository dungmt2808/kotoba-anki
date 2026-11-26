/* ことば畑 · trang web chung — thiệp Giáng sinh (1.36.1): đọc mã "KBC1:" và vẽ mặt trước thiệp ngay trên trình duyệt.
   - Đọc mã như le_core.decode_card của add-on (bỏ khoảng trắng, "KBC1:" + base64url(zlib(JSON)) + ":" + 6 số crc32, giải nén
     ≤ 16.000 byte, làm sạch như clean_card(wish=False): 4 khung, ≤ 12 sticker, toạ độ trong khung, chữ một dòng ≤ 28 ký tự,
     câu chúc 7 tiếng). Mã thiệp không có điều ước.
   - Vẽ y như web/le_card.js drawCard (mặt trước): hình sticker + bảng màu xuất từ add-on (data/su_kien.json — site/tools/
     xuat_hinh.js); tests/trang/kiem_tra_trang.js so từng điểm ảnh với hàm của add-on.
   1.36.3: hình vẽ tay "d" (120 × 80, 32 màu của Xưởng, nén "5.3kky" như le_core._px_encode) — đọc chặt như le_core.clean_drawing,
   vẽ trên sticker, dưới viền + chữ.
   Không phụ thuộc giao diện trang (dùng lại được trong test). */
var KBC = (function () {
  "use strict";
  const W = 120, HH = 80;
  const FONT = "\"Noto Sans\", \"Noto Sans CJK JP\", \"Segoe UI\", sans-serif";      // như le_card.js
  const FRAME = {
    den: { sky: ["#1f2b52", "#2b3d70"], ink: "#fff8e6", sub: "#ffd23f", foot: "#1f2b52" },
    tuyet: { sky: ["#8fb8e8", "#bcd6f2"], ink: "#16314f", sub: "#c21f3a", foot: "#16314f" },
    thong: { sky: ["#2b4a3a", "#3b6a50"], ink: "#fff8e6", sub: "#ffd23f", foot: "#1f5f2a" },
    qua: { sky: ["#7a1f2a", "#a8303e"], ink: "#fff8e6", sub: "#ffe9a8", foot: "#7a1f2a" }
  };
  const STICKER_RE = /^[a-z][a-z0-9_]{0,39}\n?$/;       // như re.match(r"^…$") của Python ($ khớp cả trước một "\n" cuối)
  // ký tự Python coi là khoảng trắng (str.strip) — JS trim khác một chút (\x85, ﻿)
  const PYWS = "\t\n\x0b\x0c\r\x1c\x1d\x1e\x1f \x85\xa0                　";
  const CTRL = /[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁦-⁩﻿]/g;

  // ---------------------------------------------------------------- đọc mã (như le_core.decode_card)
  function pyStrip(s, left, right) {
    const a = Array.from(s);
    let i = 0, j = a.length;
    if (left) { while (i < j && PYWS.indexOf(a[i]) >= 0) { i++; } }
    if (right) { while (j > i && PYWS.indexOf(a[j - 1]) >= 0) { j--; } }
    return a.slice(i, j).join("");
  }
  // le_core._line: NFC, bỏ ký tự điều khiển / chiều chữ, xuống dòng → dấu cách, gộp dấu cách, cắt theo số ký tự
  function line(s, limit) {
    if (typeof s !== "string") { return ""; }
    try { s = s.normalize("NFC"); } catch (e) { /* bỏ qua */ }
    s = s.replace(/\r/g, " ").replace(/\n/g, " ").replace(/\t/g, " ").replace(CTRL, "");
    s = pyStrip(s.replace(/ {2,}/g, " "), true, true);
    return pyStrip(Array.from(s).slice(0, limit).join(""), false, true);
  }
  // round() của Python: làm tròn về số chẵn khi đúng nửa
  function pyRound(v) {
    const f = Math.floor(v), d = v - f;
    if (d > 0.5) { return f + 1; }
    if (d < 0.5) { return f; }
    return f % 2 === 0 ? f : f + 1;
  }
  function clamp(v, lo, hi) {
    if (typeof v !== "number" || !isFinite(v)) { return null; }
    return Math.max(lo, Math.min(hi, pyRound(v)));
  }
  // le_core._px_decode: chữ số ASCII, lặp ≥ 1, không số đứng cuối, màu của Xưởng / ".", đủ đúng n ô
  function pxDecode(code, n, chars) {
    if (typeof code !== "string" || !code || code.length > n * 3) { return null; }
    const out = []; let total = 0, num = "";
    for (const ch of code) {
      if (ch >= "0" && ch <= "9") { num += ch; if (num.length > 5) { return null; } continue; }
      if (ch !== "." && chars.indexOf(ch) < 0) { return null; }
      const k = num ? Number(num) : 1; num = "";
      if (k < 1 || total + k > n) { return null; }
      out.push(ch.repeat(k)); total += k;
    }
    return num || total !== n ? null : out.join("");
  }
  function pxEncode(flat) {
    let out = "", i = 0;
    while (i < flat.length) { let j = i; while (j < flat.length && flat[j] === flat[i]) { j++; } out += (j - i > 1 ? String(j - i) : "") + flat[i]; i = j; }
    return out;
  }
  // le_core.clean_drawing: dạng gọn hoặc "" (không có / hỏng / trống / quá giới hạn)
  function cleanDrawing(raw, ev) {
    const flat = pxDecode(raw, W * HH, Object.keys(ev.draw_pal || {}).join(""));
    if (flat === null || !/[^.]/.test(flat)) { return ""; }
    const code = pxEncode(flat);
    return code.length <= (ev.d_max || 12000) ? code : "";
  }
  function cleanCard(raw, ev) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) { return null; }
    const frames = (ev.frames || []).map((f) => f.id);
    if (typeof raw.f !== "string" || frames.indexOf(raw.f) < 0) { return null; }
    const L = ev.limits, max = L.stickers;
    const st = [];
    const lst = Array.isArray(raw.st) ? raw.st.slice(0, max * 3) : [];
    for (const x of lst) {
      if (x && typeof x === "object" && !Array.isArray(x) && typeof x.s === "string" && STICKER_RE.test(x.s)) {
        const px = clamp(x.x, -48, L.w), py = clamp(x.y, -48, L.h);
        if (px !== null && py !== null) {
          const o = { s: x.s, x: px, y: py };
          if (x.m === 1 || x.m === true) { o.m = 1; }
          if (x.z === 2) { o.z = 2; }
          st.push(o);
        }
      }
      if (st.length >= max) { break; }
    }
    const c = raw.c;
    const out = { f: raw.f, st: st, t1: line(raw.t1, L.t1), t2: line(raw.t2, L.t2),
      c: typeof c === "string" && Object.prototype.hasOwnProperty.call(ev.chuc || {}, c) ? c : "" };
    const d = cleanDrawing(raw.d, ev);
    if (d) { out.d = d; }
    return out;
  }
  let CRC = null;
  function crc32(bytes) {
    if (!CRC) {
      CRC = new Uint32Array(256);
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) { c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } CRC[n] = c >>> 0; }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < bytes.length; i++) { crc = CRC[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8); }
    return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
  }
  async function unzip(bytes, limit) {
    if (typeof DecompressionStream === "undefined") { throw new Error("Trình duyệt này chưa đọc được mã — thử Chrome / Edge / Safari / Firefox bản mới nhé."); }
    const rd = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
    const parts = []; let n = 0;
    for (;;) {
      const { done, value } = await rd.read();
      if (done) { break; }
      n += value.length;
      if (n > limit) { try { rd.cancel(); } catch (e) { /* bỏ qua */ } return null; }
      parts.push(value);
    }
    const all = new Uint8Array(n); let o = 0;
    parts.forEach((p) => { all.set(p, o); o += p.length; });
    return all;
  }
  const BAD = "Mã thiệp không đúng — chép lại cả đoạn bắt đầu bằng “KBC1:” nhé.";
  // trả thiệp (mặt trước, đã làm sạch) hoặc ném Error có câu cho người đọc
  async function decode(text, ev) {
    const prefix = ev.code.prefix;
    if (typeof text !== "string" || !text.trim()) { throw new Error("Dán mã thiệp vào ô trước đã."); }
    const s = text.replace(/\s+/g, "");
    if (s.indexOf("KB1:") === 0) { throw new Error("Đây là mã thiết kế (KB1) — dán vào mục Xem mã nhé. Mã thiệp bắt đầu bằng “KBC1:”."); }
    if (s.indexOf(prefix) !== 0) { throw new Error(BAD); }
    if (s.length > ev.code.max) { throw new Error("Mã dài quá, không phải mã thiệp."); }
    const rest = s.slice(prefix.length), k = rest.lastIndexOf(":");
    const body = k >= 0 ? rest.slice(0, k) : "", crc = k >= 0 ? rest.slice(k + 1) : rest;
    if (!body || !/^[A-Za-z0-9_-]+$/.test(body)) { throw new Error(BAD); }
    let bin;
    try { bin = atob(body.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - body.length % 4) % 4)); } catch (e) { throw new Error(BAD); }
    const z = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) { z[i] = bin.charCodeAt(i); }
    if (crc32(z).slice(0, 6) !== crc) { throw new Error("Mã thiệp bị thiếu / sai một đoạn — chép lại cả đoạn nhé."); }
    let raw;
    try {
      const out = await unzip(z, ev.code.unzip_max);
      if (!out) { throw new Error("lớn quá"); }
      raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(out));
    } catch (e) { throw new Error(BAD); }
    const c = cleanCard(raw, ev);
    if (!c) { throw new Error(BAD); }
    return c;
  }

  // ---------------------------------------------------------------- vẽ (như le_card.js drawCard, mặt trước)
  function stickerSize(s, ev) {
    const z = s.z === 2 ? 2 : 1;
    if (s.s === "stackchan") { return [ev.stackchan.w * z, ev.stackchan.h * z]; }
    const r = ev.stickers[s.s];
    return r ? [r[0].length * z, r.length * z] : null;
  }
  // như home.js sprite(): điểm (x + i, y + j) × S, làm tròn
  function paintRows(ctx, rows, pal, x, y, S) {
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const c = r.charAt(i);
        if (c !== ".") { ctx.fillStyle = pal[c] || c; ctx.fillRect(Math.round((x + i) * S), Math.round((y + j) * S), S, S); }
      }
    }
  }
  function drawSticker(ctx, S0, s, ev) {
    const sz = stickerSize(s, ev);
    if (!sz) { return null; }
    const z = s.z === 2 ? 2 : 1, k = S0 * z;
    ctx.save();
    if (s.m) { ctx.translate((s.x + sz[0]) * S0, 0); ctx.scale(-1, 1); ctx.translate(-s.x * S0, 0); }
    if (s.s === "stackchan") {
      ctx.translate(s.x * S0, s.y * S0);
      const sc = ev.stackchan;
      paintRows(ctx, sc.rows, sc.pal, sc.dx, sc.dy, k);
    } else {
      paintRows(ctx, ev.stickers[s.s], ev.pal, s.x / z, s.y / z, k);
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
  function frameBorder(f, box) {
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
  // o: {mark: chữ ことば畑 ở góc (như ảnh PNG của add-on)}
  function draw(ctx, S0, card, ev, o) {
    o = o || {};
    ctx.imageSmoothingEnabled = false;
    ctx.__s = S0;
    const c = card || { f: "den", st: [] }, fr = FRAME[c.f] || FRAME.den, R = rnd((c.f || "den").length * 31 + 7);
    const box = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x * S0), Math.round(y * S0), Math.ceil(w * S0), Math.ceil(h * S0)); };
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W * S0, HH * S0); ctx.clip();
    box(0, 0, W, HH, fr.sky[0]); box(0, 34, W, 32, fr.sky[1]);
    for (let i = 0; i < 70; i++) { const x = Math.floor(R() * W), y = Math.floor(R() * 62); box(x, y, 1, 1, i % 5 ? "#ffffff" : "#ffd23f"); }
    box(0, 64, W, 16, "#eef3f8");
    for (let i = 0; i < W; i += 7) { box(i, 63, 4, 1, "#eef3f8"); box(i + 2, 66, 3, 1, "#d5e2ee"); }
    (c.st || []).forEach((s) => { drawSticker(ctx, S0, s, ev); });
    if (c.d) {                         // hình vẽ tay (như le_card.js drawLayer)
      const flat = pxDecode(c.d, W * HH, Object.keys(ev.draw_pal || {}).join("")), P = ev.draw_pal || {};
      if (flat) {
        for (let k = 0; k < W * HH; k++) {
          const ch = flat.charAt(k);
          if (ch !== "." && P[ch]) { ctx.fillStyle = P[ch]; ctx.fillRect(Math.round((k % W) * S0), Math.round(Math.floor(k / W) * S0), Math.ceil(S0), Math.ceil(S0)); }
        }
      }
    }
    frameBorder(c.f, box);
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    if (c.t1) { fitFont(ctx, c.t1, 9 * S0, (W - 14) * S0, true); shadowText(ctx, c.t1, W / 2 * S0, 13 * S0, fr.ink); }
    const ch = (c.c && ev.chuc && ev.chuc[c.c]) || "";
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
    ctx.restore();
  }
  function canvas(card, ev, S, o) {
    const cv = document.createElement("canvas");
    cv.width = W * S; cv.height = HH * S;
    draw(cv.getContext("2d"), S, card, ev, o);
    return cv;
  }
  // một sticker riêng (để bày quà theo nhóm) — canvas cỡ 1
  function stickerCanvas(id, ev) {
    const s = { s: id, x: 0, y: 0 }, sz = stickerSize(s, ev);
    if (!sz) { return null; }
    const cv = document.createElement("canvas");
    const top = id === "stackchan" ? -ev.stackchan.dy : 0;
    cv.width = sz[0]; cv.height = sz[1] + top;
    const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
    g.translate(0, top);
    drawSticker(g, 1, s, ev);
    return cv;
  }
  return { W: W, H: HH, decode: decode, cleanCard: cleanCard, draw: draw, canvas: canvas, stickerCanvas: stickerCanvas, line: line, pyRound: pyRound,
    pxDecode: pxDecode, pxEncode: pxEncode };
})();
