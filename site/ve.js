/* ことば畑 · trang web chung — phần vẽ + giải mã (không phụ thuộc giao diện, dùng lại được trong test).
   - Hình pixel: mảng hàng ký tự + bảng màu (như SPR của add-on), "." = trong suốt.
   - Mã chia sẻ KB1 (share_core.py của add-on): KB1:<m|z|g>:<cỡ>:<tên base64url>:<dữ liệu zlib base64url>:<CRC32>
     Giải mã ngay trên trình duyệt, kiểm tra như add-on (cùng câu báo lỗi) — add-on vẫn tự kiểm lại khi người chơi dán mã.
   - Vùng tự tạo: chép đúng cách add-on vẽ nền vùng lúc trời trong (home.js drawUzoneBg + drawSky, now = 0) để xem trước
     giống trong game; site/tools/kiem_tra.js so từng điểm ảnh với hàm của add-on. */
var KB = (function () {
  "use strict";

  // ---------------------------------------------------------------- màu (như sky.js)
  function hex(c) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
  function toHex(a) { return "#" + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join(""); }
  function mix(c1, c2, t) { const a = hex(c1), b = hex(c2); return toHex(a.map((v, i) => v + (b[i] - v) * t)); }
  function shade(c, k) { return toHex(hex(c).map((v) => v * k)); }
  function hash01(n) {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }

  // ---------------------------------------------------------------- hình pixel
  function canvas(w, h) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, w); c.height = Math.max(1, h);
    const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
    return [c, g];
  }
  // vẽ hàng ký tự lên canvas có sẵn (S = cỡ một điểm ảnh)
  function paint(g, rows, pal, x0, y0, S) {
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const c = r.charAt(i);
        if (c !== ".") { g.fillStyle = pal[c] || "#ff00ff"; g.fillRect((x0 + i) * S, (y0 + j) * S, S, S); }
      }
    }
  }
  function sprite(rows, pal, S) {
    S = S || 1;
    const w = rows.reduce((m, r) => Math.max(m, r.length), 0);
    const [c, g] = canvas(w * S, rows.length * S);
    paint(g, rows, pal, 0, 0, S);
    return c;
  }
  // phóng to canvas 1× theo số nguyên (giữ nét pixel)
  function scaled(src, S) {
    const [c, g] = canvas(src.width * S, src.height * S);
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
  }
  // "5.3kky" → chuỗi phẳng (null nếu sai định dạng / sai cỡ / màu lạ) — như more_core.px_decode_wh
  function rle(code, w, h, pal) {
    const all = w * h;
    if (typeof code !== "string" || code.length > all * 3) { return null; }
    let out = "", total = 0, num = "";
    for (const ch of code) {
      if (ch >= "0" && ch <= "9") { num += ch; if (num.length > 5) { return null; } continue; }
      if (ch !== "." && !(pal && Object.prototype.hasOwnProperty.call(pal, ch))) { return null; }
      const n = num ? Number(num) : 1;
      num = "";
      if (n < 1 || total + n > all) { return null; }
      out += ch.repeat(n); total += n;
    }
    if (num || total !== all) { return null; }
    return out;
  }
  function rowsOf(flat, w) { const r = []; for (let i = 0; i < flat.length; i += w) { r.push(flat.slice(i, i + w)); } return r; }

  // ---------------------------------------------------------------- vùng tự tạo (home.js, trời trong, now = 0)
  const YARD = { W: 256, H: 76, SKY: 28 };
  const DAY = { top: "#8fd3ff", bottom: "#c4ecff" };
  function zoneBg(z) {
    const W = YARD.W, H = YARD.H, G0 = YARD.SKY, bg = z.bg || "meadow";
    const [c, g] = canvas(W, H);
    const box = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    // trời: 7 dải, mặt trời, 2 đám mây (đàn chim lúc now = 0 còn ngoài khung)
    for (let b = 0; b < 7; b++) { const y0 = Math.floor(G0 * b / 7), y1 = Math.floor(G0 * (b + 1) / 7); box(0, y0, W, y1 - y0, mix(DAY.top, DAY.bottom, b / 6)); }
    const sx = 8 + 0.8 * (W - 24), sy = G0 - 7 - 0.8 * (G0 - 11);
    g.globalAlpha = 0.25; box(sx - 2, sy - 2, 13, 13, "#ffd23f"); g.globalAlpha = 1;
    box(sx, sy, 9, 9, "#ffd23f"); box(sx + 1, sy + 1, 3, 2, "#fff6c8");
    for (let i = 0; i < 2; i++) {
      const x = -30 + ((i * 61) % (W + 60)), y = 2 + ((i * 7) % Math.max(4, G0 - 14)), w = 14 + (i * 5) % 12;
      box(x, y + 2, w, 4, "#ffffff"); box(x + 3, y, Math.round(w * 0.55), 2, "#ffffff");
    }
    const hill = z.hills || "#7ed98a", hill2 = shade(hill, 0.85);
    const ground = z.ground || "#5ed35e", dark = shade(ground, 0.86), lite = mix(ground, "#ffffff", 0.3);
    if (bg === "lake") {
      const water = mix("#5aa9e6", DAY.bottom, 0.3);
      for (let i = 0; i < W; i++) { const h = 6 + Math.round(3 * Math.sin(i / 23) + 2 * Math.sin(i / 9)); box(i, 14 - h, 1, h, hill); }
      box(0, 14, W, G0 - 14, water);
      g.globalAlpha = 0.6;
      for (let i = 0; i < Math.ceil(W / 10) + 2; i++) { const x = ((i * 23) % (W + 10)) - 5; box(x, 17 + (i % 3) * 3, 3, 1, "#ffffff"); }
      g.globalAlpha = 1;
    } else if (bg === "rock") {
      for (let i = 0; i < W; i++) {
        const k = ((i % 37) + 37) % 37, h = 4 + Math.round(16 * (1 - Math.abs(k - 18) / 18)) + ((i * 7) % 3);
        box(i, G0 - h, 1, h, k % 9 === 0 ? hill2 : hill);
        if (h > 15) { box(i, G0 - h, 1, 2, "#e8eef6"); }
      }
    } else if (bg === "town") {
      for (let n = -1; n * 14 < W; n++) {
        const h = 6 + Math.floor(hash01(n * 5 + 1) * 9), w = 10 + Math.floor(hash01(n * 3) * 4), x = n * 14;
        box(x, G0 - h, w, h, hill); box(x - 1, G0 - h - 2, w + 2, 2, hill2);
      }
    } else if (bg === "forest") {
      for (let n = -1; n * 7 < W; n++) {
        const h = 10 + Math.floor(hash01(n * 7 + 3) * 8), cx = n * 7 + 3;
        for (let j = 0; j < h; j++) { const w = Math.max(1, Math.round((j / h) * 4)); box(cx - w, G0 - h + j, w * 2 + 1, 1, j % 4 === 3 ? hill2 : hill); }
      }
    } else {
      const amp = bg === "sand" ? 2 : 3;
      for (let i = 0; i < W; i++) {
        const hh = 5 + Math.round(amp * Math.sin(i / (bg === "sand" ? 31 : 17)) + 2 * Math.sin(i / 7));
        box(i, G0 - hh, 1, hh, hill);
        if (bg === "flower" && (i * 13) % 7 === 0) { box(i, G0 - hh, 1, 1, ["#ff7fa0", "#ffd23f", "#ffffff"][i % 3]); }
      }
    }
    box(0, G0, W, H - G0, ground);
    box(0, G0, W, 1, dark);
    for (let i = 3; i < W; i += 9) {
      const y = G0 + 4 + (i * 7) % 42;
      if (bg === "flower") { box(i, y, 1, 1, ["#ff7fa0", "#ffd23f", "#ffffff", "#c77dff"][(i / 9) % 4 | 0]); }
      else if (bg === "sand") { box(i, y, 3, 1, dark); }
      else if (bg === "snow") { if (i % 4 === 0) { box(i, y, 1, 1, "#ffffff"); } }
      else if (bg === "rock") { box(i, y, 2, 1, shade(ground, 0.7)); box(i, y - 1, 1, 1, lite); }
      else if (bg === "town") { if ((i / 9 | 0) % 2) { box(i - 3, y, 6, 1, dark); } }
      else { box(i, y, 1, 1, dark); box(i + 1, y - 1, 1, 1, lite); }
    }
    if (bg === "town") { box(0, G0 + 20, W, 1, dark); }
    return c;
  }
  // vùng đầy đủ (1×): nền + cảnh nền tự vẽ 256×76 + công trình 64×76 ở góc trái (chưa vẽ thì biển gỗ như trong game)
  function zone(z, pal) {
    const c = zoneBg(z), g = c.getContext("2d");
    const env = z.env ? rle(z.env, YARD.W, YARD.H, pal) : null;
    if (env) { paint(g, rowsOf(env, YARD.W), pal, 0, 0, 1); }
    const lm = z.lm ? rle(z.lm, 64, 76, pal) : null;
    if (lm) { paint(g, rowsOf(lm, 64), pal, 0, 0, 1); }
    else {
      const box = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
      box(30, 50, 3, 24, pal.B); box(14, 40, 36, 13, pal.k); box(15, 41, 34, 11, pal.t);
      box(19, 44, 26, 1, pal.B); box(19, 47, 18, 1, pal.B);
    }
    return c;
  }

  // ---------------------------------------------------------------- mã chia sẻ KB1 (như share_core.parse_code)
  let CRC = null;
  function crc32(str) {
    if (!CRC) {
      CRC = new Uint32Array(256);
      for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) { c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; } CRC[n] = c >>> 0; }
    }
    let crc = 0xffffffff;
    for (let i = 0; i < str.length; i++) { crc = CRC[(crc ^ str.charCodeAt(i)) & 0xff] ^ (crc >>> 8); }
    return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
  }
  function b64d(text) {
    if (!/^[A-Za-z0-9_-]*$/.test(text)) { throw new Error("Mã có ký tự lạ — chép lại cả đoạn nhé."); }
    const s = text.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - text.length % 4) % 4);
    let bin;
    try { bin = atob(s); } catch (e) { throw new Error("Mã bị hỏng — chép lại cả đoạn nhé."); }
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) { out[i] = bin.charCodeAt(i); }
    return out;
  }
  async function inflate(bytes, limit) {
    if (typeof DecompressionStream === "undefined") { throw new Error("Trình duyệt này chưa đọc được mã — thử Chrome / Edge / Safari / Firefox bản mới nhé."); }
    const rd = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate")).getReader();
    const parts = []; let n = 0;
    try {
      for (;;) {
        const { done, value } = await rd.read();
        if (done) { break; }
        n += value.length;
        if (n > limit) { try { rd.cancel(); } catch (e) { /* bỏ qua */ } throw new Error("Mã chứa quá nhiều dữ liệu."); }
        parts.push(value);
      }
    } catch (e) {
      if (e.message === "Mã chứa quá nhiều dữ liệu.") { throw e; }
      throw new Error("Mã bị hỏng — chép lại cả đoạn nhé.");
    }
    const all = new Uint8Array(n); let o = 0;
    parts.forEach((p) => { all.set(p, o); o += p.length; });
    for (let i = 0; i < all.length; i++) { if (all[i] > 127) { throw new Error("Mã bị hỏng — chép lại cả đoạn nhé."); } }
    return String.fromCharCode.apply(null, Array.from(all));
  }
  function cleanText(raw, limit, def) {
    let t = String(raw || "").replace(/[\x00-\x1f<>&"'`\\]/g, "").trim().replace(/\s+/g, " ");
    t = Array.from(t).slice(0, limit).join("");
    return t || def;
  }
  // info: data/thong_tin.json (bảng màu Xưởng, giá, nền / màu vùng)
  async function decode(text, info) {
    const S = info.share, P = info.craft.palette, U = info.uzone;
    if (typeof text !== "string") { throw new Error("Dán mã chia sẻ vào ô trước đã."); }
    if (text.length > S.code_max * 2) { throw new Error("Mã dài quá, không phải mã thiết kế của vườn."); }
    const code = text.split(/\s+/).join("");
    if (!code) { throw new Error("Dán mã chia sẻ vào ô trước đã."); }
    if (code.length > S.code_max) { throw new Error("Mã dài quá, không phải mã thiết kế của vườn."); }
    const m = /^KB(\d+):/.exec(code);
    if (!m) { throw new Error("Đây không phải mã thiết kế (mã đúng bắt đầu bằng “KB1:”)."); }
    if (m[0] !== S.ver + ":") { throw new Error("Mã này của bản ことば畑 mới hơn — trang này sẽ cập nhật sau nhé."); }
    const parts = code.split(":");
    if (parts.length !== 6) { throw new Error("Mã bị thiếu một đoạn — chép lại cả đoạn nhé."); }
    const [, kind, size, name64, data64, crc] = parts;
    if (crc.toLowerCase() !== crc32(parts.slice(0, 5).join(":"))) {
      throw new Error("Mã bị thiếu hoặc sai một chỗ (mã kiểm tra không khớp) — chép lại cả đoạn nhé.");
    }
    let rawName = "";
    try { rawName = new TextDecoder("utf-8").decode(b64d(name64).slice(0, 400)).replace(/�/g, ""); } catch (e) { rawName = ""; }
    const data = await inflate(b64d(data64), S.data_max);
    const f = data.split(",");
    const enc = (flat) => { let o = "", i = 0; while (i < flat.length) { let j = i; while (j < flat.length && flat[j] === flat[i]) { j++; } o += (j - i > 1 ? String(j - i) : "") + flat[i]; i = j; } return o; };
    if (kind === "m") {
      const sz = /^\d+$/.test(size) ? Number(size) : 0;
      if (!info.craft.prices[String(sz)] || f.length !== 3) { throw new Error("Mã món đồ không hợp lệ."); }
      const [place, fx, px] = f;
      if (!Object.prototype.hasOwnProperty.call(info.craft.kinds, place)) { throw new Error("Mã món đồ không hợp lệ (loại đặt lạ)."); }
      const flat = rle(px, sz, sz, P);
      if (flat === null || !flat.replace(/\./g, "")) { throw new Error("Hình trong mã bị hỏng."); }
      return { t: "m", name: cleanText(rawName, 24, "Món tự làm"), size: sz, kind: place,
        fx: info.craft.fx.indexOf(fx) >= 0 ? fx : "none", px: enc(flat), price: info.craft.prices[String(sz)] };
    }
    if (kind === "z") {
      if (size !== U.w + "x" + U.h || f.length !== 5) { throw new Error("Mã vùng không hợp lệ."); }
      let [bg, ground, hills, lm, env] = f;
      ground = "#" + ground.toLowerCase(); hills = "#" + hills.toLowerCase();
      if (!U.bg.some((b) => b.id === bg) || U.ground.indexOf(ground) < 0 || U.hills.indexOf(hills) < 0) { throw new Error("Mã vùng không hợp lệ (nền / màu lạ)."); }
      const lmFlat = lm ? rle(lm, U.w, U.h, P) : ".".repeat(U.w * U.h);
      const envFlat = env ? rle(env, U.env_w, U.env_h, P) : "";
      if (lmFlat === null || envFlat === null) { throw new Error("Hình trong mã bị hỏng."); }
      const lmCode = lmFlat.replace(/\./g, "") ? enc(lmFlat) : "", envCode = envFlat && envFlat.replace(/\./g, "") ? enc(envFlat) : "";
      if (!lmCode && !envCode) { throw new Error("Vùng trong mã chưa vẽ gì."); }
      return { t: "z", name: cleanText(rawName, 20, "Vùng của tớ"), bg: bg, ground: ground, hills: hills, lm: lmCode, env: envCode, price: U.price };
    }
    if (kind === "g") {
      if (size !== "16" || f.length !== 5) { throw new Error("Mã giống cây không hợp lệ."); }
      const st = f.map((c) => {
        if (!c) { return ""; }
        const flat = rle(c, 16, 16, P);
        if (flat === null) { throw new Error("Hình trong mã bị hỏng."); }
        return flat.replace(/\./g, "") ? enc(flat) : "";
      });
      if (st.filter(Boolean).length < 3) { throw new Error("Hình trong mã bị hỏng."); }
      return { t: "g", name: cleanText(rawName, 24, "Giống của tớ"), st: st, price: S.seed_price };
    }
    throw new Error("Mã này của bản ことば畑 mới hơn — trang này sẽ cập nhật sau nhé.");
  }

  // ---------------------------------------------------------------- xem trước một thiết kế đã giải mã
  // seedBase: hàng hình Hạt của cây gốc (giai đoạn Hạt chưa vẽ thì dùng hạt cây gốc, như add-on)
  function design(d, info, seedBase, seedBasePal) {
    const P = info.craft.palette;
    if (d.t === "m") { return sprite(rowsOf(rle(d.px, d.size, d.size, P), d.size), P, 1); }
    if (d.t === "z") { return zone(d, P); }
    // giống cây: 5 giai đoạn cạnh nhau, giai đoạn chưa vẽ lấy giai đoạn đã vẽ gần nhất trước nó
    const [c, g] = canvas(16 * 5 + 4 * 4, 16);
    let last = null;
    d.st.forEach((code, i) => {
      let rows = null, pal = P;
      if (code) { rows = rowsOf(rle(code, 16, 16, P), 16); last = rows; }
      else if (last) { rows = last; g.globalAlpha = 0.55; }
      else if (i === 0 && seedBase) { rows = seedBase; pal = seedBasePal; }
      if (rows) { paint(g, rows, pal, i * 20, 0, 1); }
      g.globalAlpha = 1;
    });
    return c;
  }

  return { hex, mix, shade, hash01, canvas, paint, sprite, scaled, rle, rowsOf, zoneBg, zone, crc32, decode, design, cleanText, YARD };
})();
if (typeof module !== "undefined") { module.exports = KB; }
