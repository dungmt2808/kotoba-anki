/* ことば畑 – Xưởng chế tác: tự vẽ món đồ pixel, hoặc chọn một tấm ảnh để
   tự chuyển thành pixel art (thu nhỏ, xoá nền, quy về bảng màu của vườn, viền đen).
   Python giữ giá, kiểm tra hình và lưu; file này chỉ vẽ và gửi lệnh. */
var GardenCraft = (function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let H = null;
  let isOpen = false;
  let design = null;          // món đang sửa (mục trong danh mục) hoặc null = tạo mới
  let designOrig = "";        // 1.22.1: hình gốc của món đang sửa — chỉ đổi tên / hiệu ứng thì không mất xu
  let size = 16, kind = "ground";
  let gw = 16, gh = 16;       // 1.14: lưới w×h (món đồ: vuông theo cỡ; vùng tự tạo: công trình 64×76)
  let zoneMode = false, zone = null, zoneDraft = null;
  // 1.22 (giống cây tự vẽ): 5 lớp 16×16 "s0".."s4" = Hạt · Mầm · Cây non · Ra hoa · Ra quả
  let seedMode = false, seedDesign = null;
  // 1.25.5 (admin): sửa hình gốc — mỗi khung một lớp (w×h đúng hình gốc), bảng màu của nhóm; baseInfo {group, id, name}
  let baseMode = false, baseInfo = null;
  const STAGE_TIP = ["Hạt nằm trong đất (bỏ trống thì dùng hạt của cây gốc)", "Mầm vừa nhú", "Cây non có lá",
    "Ra hoa", "Ra quả · cây khoẻ nhất, nhớ lâu nhất"];
  // 1.16 (vùng tự tạo): hai lớp vẽ — "lm" công trình 64×76 ở góc trái, "env" cảnh nền 256×76 phủ cả vùng
  let layer = "lm";
  const layers = {};          // lớp → {px, undo, redo, orig (mã đã lưu)}
  let zoom = 1;               // phóng to lưới (chỉ ở chế độ vùng), khung vẽ cuộn được
  let bgCanvas = null, bgSig = "";
  let px = [];                // gw*gh ký tự màu, "." = trong suốt
  let color = "k", tool = "pen";
  let undo = [], redo = [];
  let brush = 1;              // 1.15: cỡ bút 1 / 2 / 3 ô (bút, tẩy, đường thẳng, hình chữ nhật)
  let img = null;             // ảnh nguồn (để chuyển lại khi đổi cỡ / tuỳ chọn)
  let painting = false, lastCell = null, hoverCell = null, saving = false, escArmed = false;
  let cell = 16;
  let fx = "none", previewTimer = null;
  let mirror = false;                       // vẽ đối xứng trái – phải
  let lastNew = { size: 16, kind: "ground" };   // cỡ / loại chọn gần nhất cho món MỚI (không lấy theo món vừa sửa)
  let objUrl = null;                        // URL tạm của ảnh dán / kéo thả (thu hồi khi xong)

  function cat() { const d = H && H.data(); return (d && d.catalog) || {}; }
  function palette() {
    if (baseMode && baseInfo && baseInfo.pal) { return baseInfo.pal; }
    return (cat().craft && cat().craft.palette) || { k: "#1b1b2f", w: "#ffffff" };
  }
  function uzCat() { return (cat().more && cat().more.uzone) || { price: 5000, edit: 50, bg: [], ground: [], hills: [] }; }
  function seedCat() { return cat().myseed || { price: 500, edit: 50, max: 12, min: 3, stages: ["Hạt", "Mầm", "Cây non", "Ra hoa", "Ra quả"] }; }
  function seedCodes() { return [0, 1, 2, 3, 4].map((i) => codeOf("s" + i)); }
  function seedDrawn() { return seedCodes().filter(Boolean).length; }
  function priceOf(n) {
    if (baseMode) { return 0; }
    if (seedMode) { const m = seedCat(); return seedDesign ? (seedCodes().some((c, i) => c !== layers["s" + i].orig) ? m.edit : 0) : m.price; }
    if (zoneMode) { const u = uzCat(); return zone ? (codeOf("lm") !== layers.lm.orig || codeOf("env") !== layers.env.orig ? u.edit : 0) : u.price; }
    const c = cat().craft; return c ? (design ? (px.join("") !== designOrig ? c.edit : 0) : c.prices[String(n)]) : 0;
  }
  function layerDims(l) { if (baseMode && layers[l]) { return [layers[l].w, layers[l].h]; } if (/^s\d$/.test(l)) { return [16, 16]; } const u = uzCat(); return l === "env" ? [u.env_w || 256, u.env_h || 76] : [u.w || 64, u.h || 76]; }
  function layerPx(l) { return l === layer ? px : (layers[l] ? layers[l].px : []); }
  function codeOf(l) { const f = layerPx(l).join(""); return f.replace(/\./g, "") ? encode(f) : ""; }
  function baseChanged(l) { return layerPx(l).join("") !== layers[l].origFlat; }
  function edited() {
    if (baseMode) { return Object.keys(layers).some((l) => layerPx(l).join("") !== layers[l].fixFlat); }
    if (undo.length > 0) { return true; }
    if (zoneMode || seedMode) { return Object.keys(layers).some((l) => l !== layer && layers[l].undo.length); }
    // 1.25.3 (audit BUG-03): đổi cỡ xoá lịch sử hoàn tác → so thẳng hình đang có (món mới: còn ô nào đã tô; sửa món: khác hình gốc)
    const flat = px.join("");
    return design ? flat !== designOrig : /[^.]/.test(flat);
  }
  function zoneBg() {         // nền có sẵn của vùng (trời ban ngày) vẽ dưới lưới
    if (!zoneMode || !zoneDraft || !(window.GardenHome && GardenHome.zoneBgCanvas)) { return null; }
    const sig = zoneDraft.bg + "|" + zoneDraft.ground + "|" + zoneDraft.hills;
    if (sig !== bgSig) { bgSig = sig; bgCanvas = GardenHome.zoneBgCanvas(zoneDraft); }
    return bgCanvas;
  }
  function coins() { const d = H && H.data(); return (d && d.wallet && d.wallet.coins) || 0; }
  function tip(text) { const t = $("kb-cf-tip"); if (t) { t.textContent = text || ""; } }
  function rgb(hex) { return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]; }

  // ---- mã nén: "5.3kky" ----
  function encode(flat) {
    let out = "", i = 0;
    while (i < flat.length) {
      let j = i;
      while (j < flat.length && flat[j] === flat[i]) { j++; }
      out += (j - i > 1 ? String(j - i) : "") + flat[i];
      i = j;
    }
    return out;
  }
  function decode(code, w, h) {
    if (h === undefined) { h = w; }
    let out = "", num = "";
    for (const ch of String(code || "")) {
      if (ch >= "0" && ch <= "9") { num += ch; continue; }
      out += ch.repeat(num ? Number(num) : 1); num = "";
    }
    return out.length === w * h ? out.split("") : new Array(w * h).fill(".");
  }

  // ---- chỉnh lưới ----
  function snapshot() { undo.push(px.join("")); if (undo.length > 60) { undo.shift(); } redo = []; }
  function at(x, y) { return px[y * gw + x]; }
  function put(x, y, c) { if (x >= 0 && y >= 0 && x < gw && y < gh) { px[y * gw + x] = c; } }
  function putM(x, y, c) { put(x, y, c); if (mirror) { put(gw - 1 - x, y, c); } }
  // bút to: ô vuông brush×brush quanh điểm bấm
  function putB(x, y, c) {
    const o = Math.floor((brush - 1) / 2);
    for (let j = 0; j < brush; j++) { for (let i = 0; i < brush; i++) { putM(x - o + i, y - o + j, c); } }
  }
  function shift(dx, dy) {
    const out = new Array(gw * gh).fill(".");
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < gw && ny < gh) { out[ny * gw + nx] = px[y * gw + x]; }
      }
    }
    px = out;
  }
  function outlineGrid(g, w, h) {
    if (h === undefined) { h = w; }
    const out = g.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (g[y * w + x] !== ".") { continue; }
        const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
          const xx = x + dx, yy = y + dy;
          return xx >= 0 && yy >= 0 && xx < w && yy < h && g[yy * w + xx] !== ".";
        });
        if (nb) { out[y * w + x] = "k"; }
      }
    }
    return out;
  }
  function fill(x, y, c) {
    const from = at(x, y);
    if (from === c) { return; }
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= gw || cy >= gh || at(cx, cy) !== from) { continue; }
      put(cx, cy, c);
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  }
  function line(a, b, c) {
    let x0 = a.x, y0 = a.y;
    const dx = Math.abs(b.x - x0), dy = -Math.abs(b.y - y0), sx = x0 < b.x ? 1 : -1, sy = y0 < b.y ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      putB(x0, y0, c);
      if (x0 === b.x && y0 === b.y) { break; }
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }
  // hình chữ nhật từ a tới b (viền theo cỡ bút, hoặc tô kín khi giữ Shift)
  function rect(a, b, c, filled) {
    const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
    if (filled) {
      for (let y = y0; y <= y1; y++) { for (let x = x0; x <= x1; x++) { putM(x, y, c); } }
      return;
    }
    line({ x: x0, y: y0 }, { x: x1, y: y0 }, c); line({ x: x0, y: y1 }, { x: x1, y: y1 }, c);
    line({ x: x0, y: y0 }, { x: x0, y: y1 }, c); line({ x: x1, y: y0 }, { x: x1, y: y1 }, c);
  }
  // giữ Shift khi kẻ đường thẳng: bám theo ngang / dọc / chéo 45°
  function snap45(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, ax = Math.abs(dx), ay = Math.abs(dy);
    if (ax > ay * 2) { return { x: b.x, y: a.y }; }
    if (ay > ax * 2) { return { x: a.x, y: b.y }; }
    const m = Math.min(ax, ay);
    return { x: a.x + Math.sign(dx) * m, y: a.y + Math.sign(dy) * m };
  }
  // đổi cỡ mà không có ảnh: giữ hình, căn giữa, đặt sát đáy
  function resizeGrid(n) {
    const old = px, on = size, out = new Array(n * n).fill(".");
    const dx = Math.floor((n - on) / 2), dy = n - on;
    for (let y = 0; y < on; y++) {
      for (let x = 0; x < on; x++) {
        const nx = x + dx, ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < n && ny < n) { out[ny * n + nx] = old[y * on + x]; }
      }
    }
    size = n; gw = gh = n; px = out;
  }

  // ---- ảnh → pixel art ----
  // 1.22: so màu theo OKLab (giữ sắc màu: hồng / đỏ tối đi vẫn là hồng / đỏ, không ra nâu như khi so RGB),
  // mỗi ô lấy màu có nhiều điểm mẫu nhất (không trộn trung bình: chỗ giáp đỏ / lá xanh không ra nâu), giữ chi tiết nhỏ
  // (mắt, hạt dâu), gọn màu bỏ màu "rẻ" nhất thay vì màu ít điểm nhất. dist() (RGB) chỉ còn dùng để xoá nền như cũ.
  function dist(a, b) {
    const rm = (a[0] + b[0]) / 2, dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2];
    return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
  }
  // ---- so màu theo OKLab: giữ sắc màu (hồng vẫn là hồng khi tối đi), không theo RGB ----
  const LIN = new Float64Array(256);
  for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  const BOOST = 1.2;          // ảnh chụp nhạt màu hơn bảng màu pixel → đậm màu ảnh lên một chút trước khi so
  function oklab(r, g, b, boost) {
    const R = LIN[r], G = LIN[g], B = LIN[b];
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    let A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, Bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
    let C = Math.sqrt(A * A + Bb * Bb);
    if (boost && C > 0) {     // đậm màu lên; màu rất nhạt mà vẫn có màu (hồng phấn gần trắng) đậm thêm một chút để khỏi ra xám
      const C2 = C * boost + Math.max(0, Math.min(0.012, C - 0.012));
      A *= C2 / C; Bb *= C2 / C; C = C2;
    }
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, A, Bb, C];
  }
  // khác nhau về sắc màu (đỏ ↔ nâu, hồng ↔ cam) nặng hơn khác nhau về độ sáng
  function cdist(p, q) {
    const dL = p[0] - q[0], da = p[1] - q[1], db = p[2] - q[2], dC = p[3] - q[3];
    let dH = da * da + db * db - dC * dC; if (dH < 0) { dH = 0; }
    const w = 1 + 2 * Math.min(1, p[3] / 0.08);       // p = màu ảnh: ảnh càng có màu thì càng phải giữ sắc màu
    const wc = dC > 0 ? 3 : 1.96;              // màu bảng nhạt hơn màu ảnh (đỏ → nâu, hồng → be) bị phạt nặng hơn
    return dL * dL * 0.85 + dC * dC * wc + dH * w * w;
  }
  function palLab() { const P = palette(); return Object.keys(P).map((ch) => { const c = rgb(P[ch]); return [ch, oklab(c[0], c[1], c[2])]; }); }
  // màu ảnh → màu bảng: trùng (gần như) đúng một màu của bảng thì giữ nguyên màu đó (ảnh pixel art vẽ bằng bảng Xưởng
  // chuyển lại không đổi màu), còn lại đậm màu lên rồi tìm màu gần nhất
  function matchColor(r, g, b, pal) {
    const q0 = oklab(r, g, b);
    const i0 = nearestIdx(q0, pal);
    if (cdist(q0, pal[i0][1]) < 0.0003) { return i0; }
    return nearestIdx(oklab(r, g, b, BOOST), pal);
  }
  function nearestIdx(q, pal, allow) {
    let best = -1, bd = Infinity;
    for (let j = 0; j < pal.length; j++) { if (allow && !allow[j]) { continue; } const v = cdist(q, pal[j][1]); if (v < bd) { bd = v; best = j; } }
    return best;
  }
  // gọn màu: bỏ dần màu "rẻ" nhất (bỏ đi mà ít sai nhất), không bỏ màu ít điểm nhưng khác hẳn (vd. chấm hồng trên nền nâu)
  function fewColors(cells, pal, max) {
    const used = new Uint8Array(pal.length);
    cells.forEach((c) => { used[c.idx] = 1; });
    let n = used.reduce((a, v) => a + v, 0);
    while (n > max) {
      const cost = new Float64Array(pal.length);
      cells.forEach((c) => {
        used[c.idx] = 0;
        const alt = nearestIdx(c.lab, pal, used);
        used[c.idx] = 1;
        cost[c.idx] += cdist(c.lab, pal[alt][1]) - cdist(c.lab, pal[c.idx][1]);
      });
      let drop = -1, bc = Infinity;
      for (let j = 0; j < pal.length; j++) { if (used[j] && cost[j] < bc) { bc = cost[j]; drop = j; } }
      used[drop] = 0; n--;
      cells.forEach((c) => { if (c.idx === drop) { c.idx = nearestIdx(c.lab, pal, used); } });
    }
  }
  function scaled(src, sw, sh, w, h) {
    while (sw / 2 >= w * 2 && sh / 2 >= h * 2) {      // thu nhỏ dần cho mịn
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(sw / 2)); c.height = Math.max(1, Math.round(sh / 2));
      const x = c.getContext("2d"); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high";
      x.drawImage(src, 0, 0, c.width, c.height);
      src = c; sw = c.width; sh = c.height;
    }
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const cx = c.getContext("2d"); cx.imageSmoothingEnabled = true; cx.imageSmoothingQuality = "high";
    cx.drawImage(src, 0, 0, w, h);
    return c;
  }
  function convert(im, n, o, nh) {
    const W = n, Hh = nh || n;
    const pad = o.outline ? 1 : 0;
    const scale = Math.min((W - pad * 2) / im.width, (Hh - pad * 2) / im.height);
    const tw = Math.max(1, Math.round(im.width * scale)), th = Math.max(1, Math.round(im.height * scale));
    // K×K điểm mẫu cho mỗi ô: mỗi ô lấy màu có nhiều điểm mẫu nhất — chỗ giáp đỏ / lá xanh không bị trộn thành nâu
    const K = Math.max(1, Math.min(4, Math.floor(Math.min(im.width / tw, im.height / th))));
    const big = scaled(im, im.width, im.height, tw * K, th * K);
    const bd = big.getContext("2d").getImageData(0, 0, tw * K, th * K).data;
    const small = scaled(big, tw * K, th * K, tw, th);
    const d = small.getContext("2d").getImageData(0, 0, tw, th).data;
    const keep = new Uint8Array(tw * th);
    let transparent = false;
    for (let i = 0; i < tw * th; i++) { keep[i] = d[i * 4 + 3] >= 128 ? 1 : 0; if (!keep[i]) { transparent = true; } }
    let bgColor = [255, 255, 255];
    if (o.removeBg && !transparent) {
      const edge = [];
      for (let x = 0; x < tw; x++) { edge.push(x, (th - 1) * tw + x); }
      for (let y = 0; y < th; y++) { edge.push(y * tw, y * tw + tw - 1); }
      const sum = [0, 0, 0];
      edge.forEach((i) => { sum[0] += d[i * 4]; sum[1] += d[i * 4 + 1]; sum[2] += d[i * 4 + 2]; });
      const bg = sum.map((v) => v / edge.length);
      bgColor = bg;
      const near = (i) => dist([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]], bg) < 2600;
      const seen = new Uint8Array(tw * th), stack = edge.filter(near);
      while (stack.length) {
        const i = stack.pop();
        if (seen[i] || !near(i)) { continue; }
        seen[i] = 1; keep[i] = 0;
        const x = i % tw, y = Math.floor(i / tw);
        if (x > 0) { stack.push(i - 1); } if (x < tw - 1) { stack.push(i + 1); }
        if (y > 0) { stack.push(i - tw); } if (y < th - 1) { stack.push(i + tw); }
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      const drop = [];
      for (let i = 0; i < tw * th; i++) {
        if (!keep[i]) { continue; }
        const x = i % tw, y = Math.floor(i / tw);
        const edge = (x === 0 || !keep[i - 1]) || (x === tw - 1 || !keep[i + 1]) || (y === 0 || !keep[i - tw]) || (y === th - 1 || !keep[i + tw]);
        if (edge && (transparent ? d[i * 4 + 3] < 200 : (o.removeBg && dist([d[i * 4], d[i * 4 + 1], d[i * 4 + 2]], bgColor) < 9000))) { drop.push(i); }
      }
      drop.forEach((i) => { keep[i] = 0; });
    }
    const pal = palLab();
    const memo = new Int8Array(1 << 18).fill(-1);      // màu ảnh (6 bit mỗi kênh) → màu bảng
    const quant = (r, g, b) => {
      const key = ((r >> 2) << 12) | ((g >> 2) << 6) | (b >> 2);
      if (memo[key] < 0) { memo[key] = matchColor(r, g, b, pal); }
      return memo[key];
    };
    const skipBg = o.removeBg && !transparent;
    const out = new Array(W * Hh).fill(".");
    const offX = Math.floor((W - tw) / 2), offY = kind === "wall" && !zoneMode ? Math.floor((Hh - th) / 2) : Hh - pad - th;
    const cells = [], at = new Int32Array(tw * th).fill(-1);
    const votes = new Float64Array(pal.length), sums = new Float64Array(pal.length * 3);
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const i = y * tw + x;
        if (!keep[i]) { continue; }
        votes.fill(0); sums.fill(0);
        let total = 0;
        for (let v = 0; v < K; v++) {
          for (let u = 0; u < K; u++) {
            const j = ((y * K + v) * tw * K + x * K + u) * 4;
            if (bd[j + 3] < 128) { continue; }
            const r = bd[j], g = bd[j + 1], b = bd[j + 2];
            if (skipBg && dist([r, g, b], bgColor) < 2600) { continue; }       // điểm nền ở mép không được bầu
            const q = quant(r, g, b);
            votes[q] += 1; sums[q * 3] += r; sums[q * 3 + 1] += g; sums[q * 3 + 2] += b; total++;
          }
        }
        const c = { at: (offY + y) * W + offX + x, idx: -1, alt: -1, lab: null, labAlt: null };
        const labOf = (q) => oklab(Math.round(sums[q * 3] / votes[q]), Math.round(sums[q * 3 + 1] / votes[q]), Math.round(sums[q * 3 + 2] / votes[q]), BOOST);
        if (total) {
          for (let q = 0; q < pal.length; q++) { if (votes[q] > 0 && (c.idx < 0 || votes[q] > votes[c.idx])) { c.idx = q; } }
          // màu thứ hai đủ nhiều (≥ 1/4 ô) và khác hẳn màu chính: có thể là chi tiết nhỏ (mắt, hạt dâu)
          for (let q = 0; q < pal.length; q++) {
            if (q !== c.idx && votes[q] >= total / 4 && (c.alt < 0 || votes[q] > votes[c.alt]) && cdist(pal[q][1], pal[c.idx][1]) > 0.02) { c.alt = q; }
          }
          c.lab = labOf(c.idx);
          if (c.alt >= 0) { c.labAlt = labOf(c.alt); }
        } else {
          c.idx = quant(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]);
          c.lab = oklab(d[i * 4], d[i * 4 + 1], d[i * 4 + 2], BOOST);
        }
        at[i] = cells.length; cells.push(c);
      }
    }
    // chi tiết nhỏ: ô nằm trong hình, màu thứ hai không phải màu chính của ô nào bên cạnh (không phải mép giữa hai vùng) thì giữ nó
    const swap = [];
    for (let y = 0; y < th; y++) {
      for (let x = 0; x < tw; x++) {
        const k = at[y * tw + x];
        if (k < 0 || cells[k].alt < 0) { continue; }
        const alt = cells[k].alt;
        let nb = false;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const xx = x + dx, yy = y + dy;
          const kk = xx < 0 || yy < 0 || xx >= tw || yy >= th ? -1 : at[yy * tw + xx];
          if (kk < 0 || cells[kk].idx === alt) { nb = true; }        // ô ở mép hình: màu thứ hai thường là màu trộn với nền
        }
        if (!nb) { swap.push(k); }
      }
    }
    swap.forEach((k) => { const c = cells[k]; c.idx = c.alt; c.lab = c.labAlt; });
    if (o.few) { fewColors(cells, pal, 12); }
    cells.forEach((c) => { out[c.at] = pal[c.idx][0]; });
    return o.outline ? outlineGrid(out, W, Hh) : out;
  }
  function options() {
    return { removeBg: $("kb-cf-bg").checked, outline: $("kb-cf-ol").checked, few: $("kb-cf-few").checked };
  }
  function reconvert() {
    if (!img) { return; }
    snapshot();
    px = convert(img, gw, options(), gh);
    draw();
    tip("Đã chuyển ảnh thành pixel art · bấm vào từng ô để sửa lại cho đẹp.");
  }
  function freeUrl() { if (objUrl) { try { URL.revokeObjectURL(objUrl); } catch (e) { /* bỏ qua */ } objUrl = null; } }
  function loadImage(url, name) {
    const im = new Image();
    if (String(url).indexOf("blob:") === 0) { freeUrl(); objUrl = url; }
    im.onload = () => {
      if (!im.width || !im.height) { tip("Ảnh này không đọc được."); return; }
      img = im;
      if (!$("kb-cf-name").value.trim() && name) { $("kb-cf-name").value = String(name).replace(/\.[a-z0-9]+$/i, "").slice(0, 24); }
      reconvert();
    };
    im.onerror = () => tip("Không đọc được ảnh này. Thử ảnh PNG hoặc JPG khác nhé.");
    im.src = url;
  }

  // ---- vẽ ----
  function layout() {
    const stage = $("kb-cf-grid").parentNode;
    const aw = Math.max(160, stage.clientWidth - 8), ah = Math.max(160, stage.clientHeight - 8);
    const fit = Math.max(3, Math.min(34, Math.floor(Math.min(aw / gw, ah / gh))));
    cell = zoneMode ? Math.min(40, fit * zoom) : fit;
    const cv = $("kb-cf-grid"), dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(cell * gw * dpr); cv.height = Math.round(cell * gh * dpr);
    cv.style.width = cell * gw + "px"; cv.style.height = cell * gh + "px";
  }
  function draw() {
    const cv = $("kb-cf-grid");
    if (!cv) { return; }
    const ctx = cv.getContext("2d"), dpr = window.devicePixelRatio || 1, pal = palette();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bgc = zoneBg();
    if (bgc) {        // vùng tự tạo: vẽ lên nền thật của vùng (ô trống = thấy nền)
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(bgc, 0, 0, gw, gh, 0, 0, gw * cell, gh * cell);
      if (layer === "lm" && layers.env) {      // cảnh nền phía sau công trình (mờ, không sửa ở lớp này)
        const ep = layers.env.px, ew = layerDims("env")[0];
        ctx.globalAlpha = 0.55;
        for (let y = 0; y < gh; y++) { for (let x = 0; x < gw; x++) { const c = ep[y * ew + x]; if (c && c !== ".") { ctx.fillStyle = pal[c] || c; ctx.fillRect(x * cell, y * cell, cell, cell); } } }
        ctx.globalAlpha = 1;
      }
    }
    const onion = seedMode ? prevStage() : null;     // giống cây: giai đoạn trước hiện mờ dưới lưới
    for (let y = 0; y < gh; y++) {
      for (let x = 0; x < gw; x++) {
        const c = px[y * gw + x];
        if (c === "." && bgc) { continue; }
        if (c === "." && onion && onion[y * gw + x] !== ".") {
          ctx.fillStyle = (x + y) % 2 ? "#e9edf3" : "#f8fafc"; ctx.fillRect(x * cell, y * cell, cell, cell);
          ctx.globalAlpha = 0.3; ctx.fillStyle = pal[onion[y * gw + x]] || "#888"; ctx.fillRect(x * cell, y * cell, cell, cell); ctx.globalAlpha = 1;
          continue;
        }
        ctx.fillStyle = c === "." ? (zoneMode && y < 28 ? ((x + y) % 2 ? "#d6eefc" : "#e4f4ff") : ((x + y) % 2 ? "#e9edf3" : "#f8fafc")) : (pal[c] || c);
        ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    if (bgc && layer === "env" && layers.lm) {   // công trình nằm trên cảnh nền (mờ) + khung chỗ của nó
      const lp = layers.lm.px, [lw, lh] = layerDims("lm");
      ctx.globalAlpha = 0.4;
      for (let y = 0; y < lh; y++) { for (let x = 0; x < lw; x++) { const c = lp[y * lw + x]; if (c && c !== ".") { ctx.fillStyle = pal[c] || c; ctx.fillRect(x * cell, y * cell, cell, cell); } } }
      ctx.globalAlpha = 1;
      ctx.setLineDash([4, 3]); ctx.strokeStyle = "rgba(27,27,47,0.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, lw * cell - 1, lh * cell - 1); ctx.setLineDash([]);
    }
    if (cell >= 6) {
      ctx.fillStyle = "rgba(27,27,47,0.12)";
      if (cell >= 8) {
        for (let i = 1; i < gw; i++) { ctx.fillRect(i * cell, 0, 1, gh * cell); }
        for (let i = 1; i < gh; i++) { ctx.fillRect(0, i * cell, gw * cell, 1); }
      }
      ctx.fillStyle = "rgba(27,27,47,0.28)";
      for (let i = 8; i < gw; i += 8) { ctx.fillRect(i * cell, 0, 1, gh * cell); }
      for (let i = 8; i < gh; i += 8) { ctx.fillRect(0, i * cell, gw * cell, 1); }
    }
    if (zoneMode) {      // đường chân trời của cảnh (trên là trời, dưới là đất)
      ctx.fillStyle = "rgba(46,139,58,0.7)"; ctx.fillRect(0, 28 * cell - 1, gw * cell, 2);
    }
    if (mirror) {
      ctx.fillStyle = "rgba(61,139,255,0.55)"; ctx.fillRect(gw * cell / 2 - 1, 0, 2, gh * cell);
    }
    if (hoverCell) {
      const bs = tool === "fill" || tool === "pick" ? 1 : brush, o = Math.floor((bs - 1) / 2);
      ctx.strokeStyle = "#ff4f6d"; ctx.lineWidth = 2;
      ctx.strokeRect((hoverCell.x - o) * cell + 1, (hoverCell.y - o) * cell + 1, bs * cell - 2, bs * cell - 2);
      if (mirror && hoverCell.x !== gw - 1 - hoverCell.x) {
        ctx.strokeStyle = "rgba(255,79,109,0.5)"; ctx.strokeRect((gw - 1 - hoverCell.x - (bs - 1 - o)) * cell + 1, (hoverCell.y - o) * cell + 1, bs * cell - 2, bs * cell - 2);
      }
    }
    if (!zoneMode) { drawPreview(); }       // vùng tự tạo: ảnh xem trước vẽ lại theo nhịp 250 ms (đỡ giật khi vẽ)
    syncButtons();
  }
  // giai đoạn gần nhất trước giai đoạn đang vẽ mà đã có hình (để hiện mờ / chép sang)
  function prevStage() {
    const n = Number(layer.slice(1));
    for (let i = n - 1; i >= 0; i--) { const p = layerPx("s" + i); if (p.some((c) => c !== ".")) { return p; } }
    return null;
  }
  function drawSeedPreview(cv) {
    const S = 3, T = 18;
    cv.style.width = ""; cv.style.height = "";
    cv.width = 5 * T * S; cv.height = 22 * S;
    const ctx = cv.getContext("2d"), pal = palette();
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#5ed35e"; ctx.fillRect(0, 0, cv.width, cv.height);
    const rows = [0, 1, 2, 3, 4].map((i) => layerPx("s" + i));
    const has = rows.map((p) => p.some((c) => c !== "."));
    const BASE = { k: "#1b1b2f", g: "#3ccb5e", G: "#2e8b3a", b: "#8a4a22", y: "#ffd23f", p: "#ff7fa0", r: "#ff4f6d", w: "#ffffff" };
    for (let i = 0; i < 5; i++) {
      const ox = i * T;
      ctx.fillStyle = "#a0603a"; ctx.fillRect((ox + 1) * S, 16 * S, (T - 2) * S, 5 * S);
      ctx.fillStyle = "#c98a52"; ctx.fillRect((ox + 1) * S, 16 * S, (T - 2) * S, S);
      let src = has[i] ? i : -1;
      if (src < 0 && i > 0) { for (let j = i - 1; j >= 0 && src < 0; j--) { if (has[j]) { src = j; } } }
      if (src < 0 && i > 0) { for (let j = i + 1; j < 5 && src < 0; j++) { if (has[j]) { src = j; } } }
      if (src >= 0) {
        const p = rows[src];
        ctx.globalAlpha = has[i] ? 1 : 0.55;
        for (let y = 0; y < 16; y++) { for (let x = 0; x < 16; x++) { const c = p[y * 16 + x]; if (c !== ".") { ctx.fillStyle = pal[c] || c; ctx.fillRect((ox + 1 + x) * S, (y + 4) * S, S, S); } } }
        ctx.globalAlpha = 1;
      } else if (i === 0 && typeof Garden !== "undefined" && Garden.SPRITES) {
        Garden.SPRITES[0].forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = row[x]; if (c !== ".") { ctx.fillStyle = BASE[c] || "#888"; ctx.fillRect((ox + 1 + x) * S, (y + 4) * S, S, S); } } });
      }
      if (layer === "s" + i) { ctx.strokeStyle = "#ff4f6d"; ctx.lineWidth = 2; ctx.strokeRect(ox * S + 1, 1, T * S - 2, 22 * S - 2); }
    }
    const n = has.filter(Boolean).length, need = seedCat().min || 3;
    $("kb-cf-prevnote").textContent = "Đã vẽ " + n + "/5" + (n < need ? " · vẽ tối thiểu " + need : "") + " · hình mờ = lấy từ giai đoạn trước";
  }
  function drawPreview() {
    const cv = $("kb-cf-prev");
    if (!cv) { return; }
    if (seedMode) { drawSeedPreview(cv); return; }
    if (baseMode) {       // 1.25.5: mọi khung cạnh nhau (×3)
      const ls = Object.keys(layers), S = 3, pad = 4, pal = palette();
      const W = ls.reduce((a, l) => a + layers[l].w + pad, pad), Hh = Math.max.apply(null, ls.map((l) => layers[l].h)) + pad * 2;
      cv.style.width = ""; cv.style.height = "";
      cv.width = W * S; cv.height = Hh * S;
      const ctx = cv.getContext("2d");
      ctx.fillStyle = "#e9f3e2"; ctx.fillRect(0, 0, cv.width, cv.height);
      let ox = pad;
      ls.forEach((l) => {
        const p = layerPx(l), w = layers[l].w, h = layers[l].h, oy = Hh - pad - h;
        for (let y = 0; y < h; y++) { for (let x = 0; x < w; x++) { const c = p[y * w + x]; if (c && c !== ".") { ctx.fillStyle = pal[c] || c; ctx.fillRect((ox + x) * S, (oy + y) * S, S, S); } } }
        if (l === layer) { ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 2; ctx.strokeRect((ox - 1) * S, (oy - 1) * S, (w + 2) * S, (h + 2) * S); }
        ox += w + pad;
      });
      $("kb-cf-prevnote").textContent = "";
      return;
    }
    if (zoneMode) {     // vùng tự tạo: xem cả cảnh (nền + công trình) như trên sân
      cv.width = 256; cv.height = 76; cv.style.width = "256px"; cv.style.height = "76px";
      const z = Object.assign({}, zoneDraft || {}, { id: (zone && zone.id) || "u99", lm: codeOf("lm"), env: codeOf("env") });
      if (window.GardenHome && GardenHome.zonePreview) { GardenHome.zonePreview(cv, z); }
      $("kb-cf-prevnote").textContent = "Xem trước cả vùng · đồ ngoài trời đặt ở bên phải công trình";
      return;
    }
    cv.style.width = ""; cv.style.height = "";
    const S = 3, W = 72, Hh = 50;
    cv.width = W * S; cv.height = Hh * S;
    const ctx = cv.getContext("2d"), pal = palette();
    ctx.imageSmoothingEnabled = false;
    const P = (window.GardenHome && GardenHome._pal) || pal;
    if (kind === "ground") {
      ctx.fillStyle = "#bfe9ff"; ctx.fillRect(0, 0, W * S, 20 * S);
      ctx.fillStyle = "#5ed35e"; ctx.fillRect(0, 20 * S, W * S, (Hh - 20) * S);
    } else if (kind === "floor") {
      ctx.fillStyle = "#ffe3cf"; ctx.fillRect(0, 0, W * S, 22 * S);
      ctx.fillStyle = "#e2a46a"; ctx.fillRect(0, 22 * S, W * S, (Hh - 22) * S);
    } else {
      ctx.fillStyle = "#ffe3cf"; ctx.fillRect(0, 0, W * S, Hh * S);
      ctx.fillStyle = "#e2a46a"; ctx.fillRect(0, 42 * S, W * S, 8 * S);
    }
    // món đang vẽ (cắt viền trong suốt) + một món mẫu để so cỡ
    const rows = window.GardenHome && GardenHome.pxRows ? GardenHome.pxRows(px.join(""), size, true) : [];   // món đồ luôn vuông (gw = gh = size)
    const ref = window.GardenHome && GardenHome._sprites ? GardenHome._sprites[kind === "ground" ? "flowers" : kind === "floor" ? "plant" : "clock"] : null;
    const paint = (r, x0, y0) => r.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = row[i]; if (c !== ".") { ctx.fillStyle = pal[c] || P[c] || c; ctx.fillRect((x0 + i) * S, (y0 + j) * S, S, S); } } });
    const bottom = kind === "wall" ? 22 : 46;
    if (ref) { paint(ref, 4, kind === "wall" ? bottom - Math.round(ref.length / 2) : bottom - ref.length); }
    if (rows.length && rows[0] !== "k") {
      const now = Date.now();
      const w = rows[0].length, h = rows.length, slot = size === 16 ? 16 : 32;
      let xs = 0, ys = 0;
      if (fx === "sway") { xs = Math.round(Math.sin(now / 600)); }
      else if (fx === "bounce") { ys = -Math.round(Math.abs(Math.sin(now / 350)) * 2); }
      else if (fx === "float") { ys = -Math.round(1.5 + Math.sin(now / 900) * 1.5); }
      const x0 = 28 + Math.floor((slot - w) / 2) + xs, y0 = (kind === "wall" ? bottom - Math.round(h / 2) : bottom - h) + ys;
      if (fx === "glow") {
        ctx.globalAlpha = 0.25; ctx.fillStyle = "#ffd23f";
        ctx.beginPath(); ctx.arc((x0 + w / 2) * S, (y0 + h / 2) * S, Math.max(10, h * 0.7) * S, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (fx === "spin") {
        const k = Math.cos(now / 520), cxp = w / 2;
        rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = row[i]; if (c !== ".") { ctx.fillStyle = pal[c] || P[c] || c; ctx.fillRect((x0 + Math.round(cxp + (i + 0.5 - cxp) * k - 0.5)) * S, (y0 + j) * S, S, S); } } });
      } else {
        paint(rows, x0, y0);
      }
      if (fx === "hearts" || fx === "notes" || fx === "bubbles") {
        const k2 = (now / 1400) % 1, col = fx === "hearts" ? "#ff4f6d" : fx === "notes" ? "#3d8bff" : "#bfe9ff";
        [[0.3, 0], [0.7, 0.5]].forEach(([fxp, off]) => {
          const kk = (k2 + off) % 1, hx = x0 + w * fxp, hy = y0 - kk * 10;
          ctx.globalAlpha = 1 - kk; ctx.fillStyle = col;
          if (fx === "hearts") { [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2]].forEach(([a, b]) => ctx.fillRect((hx + a) * S, (hy + b) * S, S, S)); }
          else if (fx === "notes") { [[1, 0], [1, 1], [1, 2], [0, 2], [0, 3], [1, 3], [2, 0]].forEach(([a, b]) => ctx.fillRect((hx + a) * S, (hy + b) * S, S, S)); }
          else { ctx.fillRect(hx * S, hy * S, 2 * S, 2 * S); }
          ctx.globalAlpha = 1;
        });
      }
      if (fx === "pulse") {
        const kk = Math.max(0, Math.sin(now / 420));
        ctx.globalAlpha = 0.38 * kk; ctx.fillStyle = "#ffffff";
        rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { if (row[i] !== ".") { ctx.fillRect((x0 + i) * S, (y0 + j) * S, S, S); } } });
        ctx.globalAlpha = 1;
      }
      if (fx === "sparkle") {
        const k = Math.floor(now / 160);
        [[3, 5], [w - 3, 2], [w / 2, h - 3], [1, h / 2]].forEach(([sx, sy], i) => {
          if ((k + i) % 3 === 0) { ctx.fillStyle = "#ffd23f"; ctx.fillRect((x0 + sx) * S, (y0 + sy) * S, S, S); ctx.fillStyle = "#ffffff"; ctx.fillRect((x0 + sx - 1) * S, (y0 + sy) * S, S, S); }
        });
      }
    }
    $("kb-cf-prevnote").textContent = "Xem trước (cạnh một món có sẵn) · chiếm " + (size === 16 ? "1 ô" : "2 ô");
  }
  function syncButtons() {
    Array.prototype.forEach.call(document.querySelectorAll("#kb-craft [data-tool]"), (b) => b.classList.toggle("is-on", b.getAttribute("data-tool") === tool));
    Array.prototype.forEach.call(document.querySelectorAll("#kb-cf-pal [data-c]"), (b) => b.classList.toggle("is-on", b.getAttribute("data-c") === color));
    const price = priceOf(size), save = $("kb-cf-save");
    save.textContent = baseMode ? "Lưu" : seedMode ? (seedDesign ? "Lưu giống · " + (price ? price + " xu" : "miễn phí") : "Tạo giống · " + price + " xu")
      : zoneMode ? (zone ? "Lưu vùng · " + (price ? price + " xu" : "miễn phí") : "Tạo vùng · " + price + " xu")
      : design ? "Lưu sửa · " + (price ? price + " xu" : "miễn phí") : "Chế tác · " + price + " xu";
    save.disabled = saving || coins() < price;
    save.title = coins() < price ? "Còn thiếu " + (price - coins()) + " xu" : "";
    $("kb-cf-undo").disabled = !undo.length;
    const rb = $("kb-cf-redo"); if (rb) { rb.disabled = !redo.length; }
    Array.prototype.forEach.call(document.querySelectorAll("#kb-craft [data-brush]"), (b) => b.classList.toggle("is-on", Number(b.getAttribute("data-brush")) === brush));
    const mb = $("kb-cf-mirror");
    if (mb) { mb.classList.toggle("is-on", mirror); }
    Array.prototype.forEach.call(document.querySelectorAll("#kb-craft [data-layer]"), (b) => {
      const l = b.getAttribute("data-layer");
      b.classList.toggle("is-on", l === layer);
      if (/^s\d$/.test(l)) { b.classList.toggle("is-drawn", seedMode && layerPx(l).some((c) => c !== ".")); }
      if (baseMode && layers[l]) { b.classList.toggle("is-drawn", baseChanged(l)); }
    });
    const sc = $("kb-cf-seedcopy"); if (sc) { sc.disabled = !(seedMode && prevStage()); }
    const zv = $("kb-cf-zoomv"); if (zv) { zv.textContent = "×" + zoom; }
  }
  function buildPalette() {
    const box = $("kb-cf-pal");
    box.textContent = "";
    const pal = palette();
    Object.keys(pal).forEach((ch) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "kb-cf-sw"; b.setAttribute("data-c", ch);
      b.style.background = pal[ch]; b.title = pal[ch];
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => { color = ch; if (tool === "erase" || tool === "pick") { tool = "pen"; } draw(); });
      box.appendChild(b);
    });
  }

  // ---- chuột ----
  function cellOf(ev) {
    const r = $("kb-cf-grid").getBoundingClientRect();
    const x = Math.floor((ev.clientX - r.left) / cell), y = Math.floor((ev.clientY - r.top) / cell);
    return x >= 0 && y >= 0 && x < gw && y < gh ? { x: x, y: y } : null;
  }
  function apply(c, erase) {
    if (!c) { return; }
    const t = erase ? "erase" : tool;
    if (t === "pick") {
      const v = at(c.x, c.y);
      if (v !== ".") { color = v; tool = "pen"; }
    } else if (t === "fill") {
      snapshot(); fill(c.x, c.y, color);
      if (mirror && at(gw - 1 - c.x, c.y) !== color) { fill(gw - 1 - c.x, c.y, color); }
    } else {
      line(lastCell || c, c, t === "erase" ? "." : color);
    }
    lastCell = c;
  }
  function onDown(ev) {
    ev.preventDefault();
    const c = cellOf(ev);
    if (!c) { return; }
    const erase = ev.button === 2;
    if (!erase && (tool === "line" || tool === "rect")) {     // kéo để kẻ; thả chuột là xong
      snapshot();
      painting = { shape: tool, start: c, base: px.slice() };
      shapeTo(c, ev.shiftKey);
      try { $("kb-cf-grid").setPointerCapture(ev.pointerId); } catch (e) { /* bỏ qua */ }
      escArmed = false; draw();
      return;
    }
    if (erase || tool === "pen" || tool === "erase") { snapshot(); painting = { erase: erase }; }
    lastCell = null;
    apply(c, erase);
    try { $("kb-cf-grid").setPointerCapture(ev.pointerId); } catch (e) { /* bỏ qua */ }
    escArmed = false;
    draw();
  }
  function shapeTo(c, shift) {
    const p = painting;
    px = p.base.slice();
    if (p.shape === "line") { line(p.start, shift ? snap45(p.start, c) : c, color); } else { rect(p.start, c, color, shift); }
  }
  function onMove(ev) {
    const c = cellOf(ev);
    hoverCell = c;
    if (painting && painting.shape) {
      // kéo ra ngoài khung vẫn kẻ tới mép
      const r = $("kb-cf-grid").getBoundingClientRect();
      const cc = c || { x: Math.max(0, Math.min(gw - 1, Math.floor((ev.clientX - r.left) / cell))), y: Math.max(0, Math.min(gh - 1, Math.floor((ev.clientY - r.top) / cell))) };
      shapeTo(cc, ev.shiftKey);
    } else if (painting && c) { apply(c, painting.erase); }
    draw();
  }
  function onUp() { painting = false; lastCell = null; }

  function onKey(e) {
    if (!isOpen) { return; }
    const tag = (e.target && e.target.tagName) || "";
    if (e.key === "Escape") {
      e.preventDefault(); e.stopPropagation();
      if (edited() && !escArmed) { escArmed = true; tip("Bấm Esc lần nữa để bỏ, không lưu hình này."); return; }
      close();
      return;
    }
    if (tag === "INPUT" || tag === "SELECT") { return; }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); doRedo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); doUndo(); return; }
    const map = { b: "pen", e: "erase", g: "fill", i: "pick", l: "line", h: "rect" };
    const k = e.key.toLowerCase();
    if (e.ctrlKey || e.metaKey || e.altKey) { return; }
    if (map[k]) { e.preventDefault(); tool = map[k]; draw(); return; }
    if (k === "m") { e.preventDefault(); mirror = !mirror; draw(); return; }
    if (k === "[" || k === "]") { e.preventDefault(); setBrush(brush + (k === "]" ? 1 : -1)); return; }
    if (zoneMode && (k === "+" || k === "=" || k === "-")) { e.preventDefault(); zoomBy(k === "-" ? -1 : 1); return; }
    if (seedMode && k >= "1" && k <= "5") { e.preventDefault(); setLayer("s" + (Number(k) - 1)); return; }
    if (baseMode && k >= "1" && k <= "9") { const ls = Object.keys(layers); if (ls[Number(k) - 1]) { e.preventDefault(); setLayer(ls[Number(k) - 1]); } return; }
    const arrows = { arrowleft: [-1, 0], arrowright: [1, 0], arrowup: [0, -1], arrowdown: [0, 1] };
    if (arrows[k]) { e.preventDefault(); e.stopPropagation(); snapshot(); shift(arrows[k][0], arrows[k][1]); draw(); }
  }
  function doUndo() { if (undo.length) { redo.push(px.join("")); px = undo.pop().split(""); draw(); } }
  function doRedo() { if (redo.length) { undo.push(px.join("")); px = redo.pop().split(""); draw(); } }
  // phóng to / thu nhỏ lưới vùng, giữ chỗ đang xem ở giữa khung
  function zoomBy(d) {
    const nz = Math.max(1, Math.min(4, zoom + d));
    if (nz === zoom) { return; }
    const st = $("kb-cf-grid").parentNode;
    const rx = (st.scrollLeft + st.clientWidth / 2) / Math.max(1, st.scrollWidth), ry = (st.scrollTop + st.clientHeight / 2) / Math.max(1, st.scrollHeight);
    zoom = nz; layout(); draw();
    st.scrollLeft = rx * st.scrollWidth - st.clientWidth / 2; st.scrollTop = ry * st.scrollHeight - st.clientHeight / 2;
  }
  // đổi lớp vẽ của vùng tự tạo (mỗi lớp giữ hoàn tác riêng)
  function setLayer(l) {
    if ((!zoneMode && !seedMode && !baseMode) || l === layer || !layers[l]) { return; }
    layers[layer].px = px; layers[layer].undo = undo; layers[layer].redo = redo;
    layer = l;
    [gw, gh] = layerDims(l);
    px = layers[l].px; undo = layers[l].undo; redo = layers[l].redo;
    img = null; hoverCell = null; painting = false; lastCell = null;
    if (l === "env" && zoom === 1) { zoom = 2; }
    layout(); draw();
    if (baseMode) { tip("Hình gốc · " + baseInfo.name); return; }
    if (seedMode) { const n = Number(l.slice(1)); tip((seedCat().stages || [])[n] + ": " + STAGE_TIP[n] + " · phím 1–5 đổi giai đoạn"); return; }
    tip(l === "env" ? "Cảnh nền 256×76: ô trống giữ nền có sẵn, khung nét đứt là chỗ công trình. Phím + / − phóng to."
      : "Công trình 64×76 ở góc trái vùng. Cảnh nền phía sau hiện mờ.");
  }
  function setBrush(n) { brush = Math.max(1, Math.min(3, n)); draw(); tip("Cỡ bút " + brush + " ô · phím [ ] để đổi"); }
  function onPaste(e) {
    if (!isOpen) { return; }
    const items = (e.clipboardData && e.clipboardData.items) || [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf("image/") === 0) {
        const f = items[i].getAsFile();
        if (f) { e.preventDefault(); loadImage(URL.createObjectURL(f), ""); return; }
      }
    }
  }

  // ---- mở / đóng / lưu ----
  // bật / tắt các ô của chế độ vùng tự tạo trên thanh trên cùng của xưởng
  // mode: "item" (món đồ) · "zone" (vùng tự tạo) · "seed" (1.22: giống cây tự vẽ)
  function setModeUi(mode) {
    const on = mode === "zone";
    ["kb-cf-size", "kb-cf-kind", "kb-cf-fx"].forEach((id) => { const e = $(id); if (e && e.parentNode) { e.parentNode.hidden = mode !== "item"; } });
    const zb = $("kb-cf-zone"); if (zb) { zb.hidden = !on; }
    const sb = $("kb-cf-seed"); if (sb) { sb.hidden = mode !== "seed"; }
    const bb = $("kb-cf-base"); if (bb) { bb.hidden = mode !== "base"; }
    $("kb-cf-name").readOnly = mode === "base";
    const zr = $("kb-cf-zoomrow"); if (zr) { zr.hidden = !on; }
    const cr = $("kb-craft"); if (cr) { cr.classList.toggle("kb-cf-zonemode", on); cr.classList.toggle("kb-cf-seedmode", mode === "seed"); }
    const tl = document.querySelector("#kb-craft .kb-g-title");
    if (tl) { tl.textContent = on ? "工房 · Vùng tự tạo" : mode === "seed" ? "工房 · Giống cây tự vẽ" : mode === "base" ? "工房 · Hình gốc" : "工房 · Xưởng chế tác"; }
    $("kb-cf-name").maxLength = on ? 20 : 24;
    $("kb-cf-name").placeholder = on ? "Tên vùng" : mode === "seed" ? "Tên giống cây" : "Món tự làm";
  }
  function setZoneUi(on) { setModeUi(on ? "zone" : "item"); }
  function swatches(boxId, list, key) {
    const box = $(boxId);
    if (!box) { return; }
    box.textContent = "";
    list.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "kb-cf-sw kb-cf-sw-mini" + (zoneDraft[key] === c ? " is-on" : ""); b.style.background = c; b.title = c;
      b.addEventListener("mousedown", (e) => e.preventDefault());
      b.addEventListener("click", () => { zoneDraft[key] = c; swatches(boxId, list, key); drawPreview(); });
      box.appendChild(b);
    });
  }
  function openZone(z) {
    if (!H) { return; }
    const u = uzCat();
    zoneMode = true; zone = z || null; design = null; seedMode = false; seedDesign = null; baseMode = false; baseInfo = null;
    zoneDraft = { name: z ? z.name : "", bg: z ? z.bg : ((u.bg[0] || {}).id || "meadow"),
      ground: z ? z.ground : (u.ground[0] || "#5ed35e"), hills: z ? z.hills : (u.hills[0] || "#7ed98a") };
    const [lw, lh] = layerDims("lm"), [ew, eh] = layerDims("env");
    Object.keys(layers).forEach((k) => { delete layers[k]; });
    layers.lm = { px: decode(z ? z.lm : "", lw, lh), undo: [], redo: [], orig: (z && z.lm) || "" };
    layers.env = { px: decode(z ? z.env : "", ew, eh), undo: [], redo: [], orig: (z && z.env) || "" };
    layer = "lm"; zoom = 1; bgSig = "";
    gw = lw; gh = lh; px = layers.lm.px;
    $("kb-cf-name").value = zoneDraft.name;
    const sel = $("kb-cf-bgsel");
    if (sel) {
      sel.textContent = "";
      (u.bg || []).forEach((b) => { const o = document.createElement("option"); o.value = b.id; o.textContent = b.name; sel.appendChild(o); });
      sel.value = zoneDraft.bg;
    }
    swatches("kb-cf-ground", u.ground || [], "ground");
    swatches("kb-cf-hills", u.hills || [], "hills");
    setZoneUi(true);
    mirror = false; fx = "none";
    clearInterval(previewTimer);
    previewTimer = setInterval(() => { if (isOpen && !document.hidden) { drawPreview(); } }, 250);
    img = null; undo = layers.lm.undo; redo = layers.lm.redo; saving = false; escArmed = false; tool = "pen"; hoverCell = null;
    isOpen = true;
    $("kb-craft").hidden = false;
    buildPalette();
    layout(); draw(); showWhole();
    tip(z ? "Sửa vùng “" + z.name + "” · đổi tên / nền / màu miễn phí, vẽ lại công trình hoặc cảnh nền " + u.edit + " xu"
      : "Vẽ công trình 64×76 (nhà, tháp, cây to…), rồi bấm “Cảnh nền” để vẽ khung cảnh. Trên vạch xanh là trời.");
  }
  // 1.22: giống cây tự vẽ — g = mục trong catalog.myseeds (sửa) hoặc null (tạo mới)
  function openSeed(g) {
    if (!H) { return; }
    zoneMode = false; zone = null; zoom = 1; design = null; baseMode = false; baseInfo = null;
    seedMode = true; seedDesign = g || null;
    Object.keys(layers).forEach((k) => { delete layers[k]; });
    for (let i = 0; i < 5; i++) {
      const code = g && g.st ? g.st[i] || "" : "";
      layers["s" + i] = { px: decode(code, 16, 16), undo: [], redo: [], orig: code };
    }
    const first = g && g.st ? Math.max(0, g.st.findIndex((c) => !!c)) : 1;
    layer = "s" + (g ? first : 1);
    gw = gh = 16; size = 16; kind = "ground";
    px = layers[layer].px; undo = layers[layer].undo; redo = layers[layer].redo;
    $("kb-cf-name").value = g ? g.name : "";
    setModeUi("seed");
    mirror = false; fx = "none";
    clearInterval(previewTimer); previewTimer = null;
    img = null; saving = false; escArmed = false; tool = "pen"; hoverCell = null;
    isOpen = true;
    $("kb-craft").hidden = false;
    buildPalette();
    layout(); draw(); showWhole();
    tip(g ? "Sửa giống “" + g.name + "” · đổi hình " + seedCat().edit + " xu, đổi tên miễn phí"
      : "Vẽ từng giai đoạn 16×16 (tối thiểu " + seedCat().min + "), giai đoạn trước hiện mờ để vẽ tiếp · phím 1–5 đổi giai đoạn.");
  }
  // 1.25.5 (admin): mở hình gốc {group, id, name} — các khung lấy từ GardenFix (đang dùng, có thể đã sửa) + hình gốc để so
  function openBase(info) {
    if (!H || !info || typeof GardenFix === "undefined") { return; }
    const cur = GardenFix.frames(info.group, info.id), org = GardenFix.original(info.group, info.id), names = Object.keys(cur);
    if (!names.length) { return; }
    zoneMode = false; zone = null; zoom = 1; design = null; seedMode = false; seedDesign = null;
    baseMode = true; baseInfo = { group: info.group, id: info.id, name: info.name || info.id, pal: GardenFix.pal(info.group, info.id) };
    Object.keys(layers).forEach((k) => { delete layers[k]; });
    const bar = $("kb-cf-frames");
    if (bar) { bar.textContent = ""; }
    names.forEach((n, i) => {
      const rows = cur[n], o = org[n] || rows, w = rows[0].length, h = rows.length;
      layers[n] = { px: rows.join("").split(""), w: w, h: h, undo: [], redo: [], origFlat: o.join(""), fixFlat: rows.join("") };
      if (bar) {
        const b = document.createElement("button");
        b.type = "button"; b.className = "kb-btn kb-btn-small"; b.setAttribute("data-layer", n);
        b.textContent = GardenFix.label(info.group, n, i); b.title = "Phím " + (i + 1);
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => setLayer(n));
        bar.appendChild(b);
      }
    });
    if (bar) { bar.parentNode.hidden = names.length < 2; }
    layer = names[0];
    [gw, gh] = layerDims(layer); size = Math.max(gw, gh); kind = "ground";
    px = layers[layer].px; undo = layers[layer].undo; redo = layers[layer].redo;
    $("kb-cf-name").value = baseInfo.name;
    setModeUi("base");
    mirror = false; fx = "none";
    clearInterval(previewTimer); previewTimer = null;
    img = null; saving = false; escArmed = false; tool = "pen"; hoverCell = null;
    isOpen = true;
    $("kb-craft").hidden = false;
    buildPalette();
    layout(); draw(); showWhole();
    tip("Hình gốc · " + baseInfo.name);
  }
  function rowsOf(l) {
    const p = layerPx(l), w = layers[l].w, out = [];
    for (let y = 0; y < layers[l].h; y++) { out.push(p.slice(y * w, y * w + w).join("")); }
    return out;
  }
  function open(it) {
    if (!H) { return; }
    zoneMode = false; zone = null; zoom = 1; seedMode = false; seedDesign = null; baseMode = false; baseInfo = null;
    setZoneUi(false);
    design = it || null;
    if (design) {
      size = design.size; kind = design.place;
      gw = gh = size;
      px = decode(design.px, size);
      designOrig = px.join("");
      $("kb-cf-name").value = design.name;
    } else {
      size = lastNew.size; kind = lastNew.kind;
      gw = gh = size;
      px = new Array(size * size).fill(".");
      $("kb-cf-name").value = "";
    }
    mirror = false;
    fx = (design && design.fx) || "none";
    $("kb-cf-size").value = String(size); $("kb-cf-kind").value = kind; $("kb-cf-fx").value = fx;
    clearInterval(previewTimer);
    previewTimer = setInterval(() => { if (isOpen && fx !== "none" && !document.hidden) { drawPreview(); } }, 120);
    $("kb-cf-size").disabled = !!design; $("kb-cf-kind").disabled = !!design;
    img = null; undo = []; redo = []; saving = false; escArmed = false; tool = "pen"; hoverCell = null;
    isOpen = true;
    $("kb-craft").hidden = false;
    buildPalette();
    layout(); draw(); showWhole();
    tip(design ? "Sửa món “" + design.name + "” · cỡ và loại giữ nguyên · đổi tên / hiệu ứng miễn phí, vẽ lại " + ((cat().craft || {}).edit || 50) + " xu" :
      "Vẽ bằng chuột (chuột phải = tẩy), hoặc bấm “Chọn ảnh…” để biến ảnh thành pixel art.");
  }
  // 1.22.5: trang đang cuộn xuống (lăn chuột trên bảng Nhà, cửa sổ thấp) thì mở Xưởng xong thanh trên của Xưởng (tên, nút
  // Chế tác) nằm khuất phía trên → cuộn cho cả Xưởng nằm trong cửa sổ (Xưởng cao hơn cửa sổ thì ưu tiên thấy thanh trên)
  function showWhole() {
    const r = $("kb-craft").getBoundingClientRect();
    if (r.top < 0) { window.scrollBy(0, r.top - 4); }
    else if (r.bottom > window.innerHeight) { window.scrollBy(0, Math.min(r.top - 4, r.bottom - window.innerHeight + 4)); }
  }
  function close() {
    if (!design && !zoneMode && !seedMode && !baseMode) { lastNew = { size: size, kind: kind }; }
    if (baseMode) { baseMode = false; baseInfo = null; setModeUi("item"); }
    freeUrl();
    isOpen = false; painting = false; escArmed = false;
    clearInterval(previewTimer); previewTimer = null;
    $("kb-craft").hidden = true;
  }
  function save() {
    if (saving) { return; }
    const flat = px.join("");
    if (baseMode) {
      layers[layer].px = px;
      const key = baseInfo.group + ":" + baseInfo.id, frames = {};
      Object.keys(layers).forEach((l) => { if (baseChanged(l)) { frames[l] = rowsOf(l); } });
      // 1.25.5: khung trống hết thì món đồ biến mất khỏi vườn của mọi người → không cho lưu
      const empty = Object.keys(layers).find((l) => !layerPx(l).some((c) => c !== "."));
      if (empty) { setLayer(empty); tip("Khung này đang trống."); return; }
      saving = true; syncButtons(); tip("Đang lưu…");
      H.send(Object.keys(frames).length ? "base:save:" + JSON.stringify({ key: key, frames: frames }) : "base:reset:" + key);
      return;
    }
    if (seedMode) {
      const need = seedCat().min || 3, n = seedDrawn();
      if (n < need) { tip("Vẽ ít nhất " + need + " giai đoạn đã nhé (mới có " + n + ")."); return; }
      const payload = { name: $("kb-cf-name").value.trim() || "Giống của tớ", st: seedCodes() };
      if (seedDesign) { payload.id = seedDesign.id; }
      saving = true; syncButtons(); tip("Đang lưu…");
      H.send("craft:seed:" + JSON.stringify(payload));
      return;
    }
    if (zoneMode) {
      const payload = { name: $("kb-cf-name").value.trim() || "Vùng của tớ", bg: zoneDraft.bg, ground: zoneDraft.ground, hills: zoneDraft.hills,
        px: codeOf("lm"), env: codeOf("env") };
      if (zone) { payload.id = zone.id; }
      saving = true; syncButtons(); tip("Đang lưu…");
      H.send("craft:zone:" + JSON.stringify(payload));
      return;
    }
    if (!flat.replace(/\./g, "")) { tip("Hình còn trống, vẽ gì đó đã nhé!"); return; }
    const payload = { name: $("kb-cf-name").value.trim() || "Món tự làm", size: size, kind: kind, fx: fx, px: encode(flat) };
    if (design) { payload.id = design.id; }
    saving = true; syncButtons(); tip("Đang lưu…");
    H.send("craft:save:" + JSON.stringify(payload));
  }

  return {
    init: function (helpers) {
      H = helpers;
      const cv = $("kb-cf-grid");
      if (!cv) { return; }
      cv.addEventListener("pointerdown", onDown);
      cv.addEventListener("pointermove", onMove);
      cv.addEventListener("pointerup", onUp);
      cv.addEventListener("pointercancel", onUp);
      cv.addEventListener("pointerleave", () => { hoverCell = null; draw(); });
      cv.addEventListener("contextmenu", (e) => e.preventDefault());
      document.addEventListener("keydown", onKey, true);
      document.addEventListener("paste", onPaste);
      const stage = cv.parentNode;
      stage.addEventListener("dragover", (e) => { if (isOpen) { e.preventDefault(); $("kb-cf-drop").hidden = false; } });
      stage.addEventListener("dragleave", () => { $("kb-cf-drop").hidden = true; });
      stage.addEventListener("drop", (e) => {
        if (!isOpen) { return; }
        e.preventDefault(); $("kb-cf-drop").hidden = true;
        const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f && f.type.indexOf("image/") === 0) { loadImage(URL.createObjectURL(f), f.name); }
        else { tip("Chỉ nhận file ảnh."); }
      });
      Array.prototype.forEach.call(document.querySelectorAll("#kb-craft [data-tool]"), (b) => {
        b.addEventListener("click", () => { tool = b.getAttribute("data-tool"); draw(); });
      });
      $("kb-cf-undo").addEventListener("click", doUndo);
      const rdb = $("kb-cf-redo"); if (rdb) { rdb.addEventListener("click", doRedo); }
      Array.prototype.forEach.call(document.querySelectorAll("#kb-craft [data-layer]"), (b) => {
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => setLayer(b.getAttribute("data-layer")));
      });
      Array.prototype.forEach.call(document.querySelectorAll("#kb-craft [data-zoom]"), (b) => {
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => zoomBy(Number(b.getAttribute("data-zoom"))));
      });
      cv.parentNode.addEventListener("wheel", (e) => { if (isOpen && zoneMode && (e.ctrlKey || e.metaKey)) { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1 : -1); } }, { passive: false });
      Array.prototype.forEach.call(document.querySelectorAll("#kb-craft [data-brush]"), (b) => {
        b.addEventListener("mousedown", (e) => e.preventDefault());
        b.addEventListener("click", () => setBrush(Number(b.getAttribute("data-brush"))));
      });
      $("kb-cf-flip").addEventListener("click", () => {
        snapshot();
        const out = px.slice();
        for (let y = 0; y < gh; y++) { for (let x = 0; x < gw; x++) { out[y * gw + x] = px[y * gw + gw - 1 - x]; } }
        px = out; draw();
      });
      $("kb-cf-outline").addEventListener("click", () => { snapshot(); px = outlineGrid(px, gw, gh); draw(); });
      // 1.25.5 (admin): hình gốc — về gốc (hoàn tác được, bấm Lưu mới lưu), xuất / nhập file bản sửa
      const bind = (id, fn) => { const b = $(id); if (b) { b.addEventListener("mousedown", (e) => e.preventDefault()); b.addEventListener("click", fn); } };
      bind("kb-cf-revert", () => {
        if (!baseMode) { return; }
        layers[layer].px = px;
        Object.keys(layers).forEach((l) => {
          const L = layers[l];
          if (L.px.join("") !== L.origFlat) { L.undo.push(L.px.join("")); L.redo = []; L.px = L.origFlat.split(""); }
        });
        px = layers[layer].px; undo = layers[layer].undo; redo = layers[layer].redo;
        draw(); tip("Đã về hình gốc · bấm Lưu để lưu");
      });
      bind("kb-cf-export", () => { if (baseMode) { H.send("base:export"); } });
      bind("kb-cf-import", () => { if (baseMode) { H.send("base:import"); } });
      const scp = $("kb-cf-seedcopy");
      if (scp) {
        scp.addEventListener("mousedown", (e) => e.preventDefault());
        scp.addEventListener("click", () => { const p = seedMode && prevStage(); if (p) { snapshot(); px = p.slice(); draw(); tip("Đã chép hình giai đoạn trước · vẽ thêm cho cây lớn lên"); } });
      }
      $("kb-cf-flipv").addEventListener("click", () => {
        snapshot();
        const out = px.slice();
        for (let y = 0; y < gh; y++) { for (let x = 0; x < gw; x++) { out[y * gw + x] = px[(gh - 1 - y) * gw + x]; } }
        px = out; draw();
      });
      $("kb-cf-mirror").addEventListener("click", () => { mirror = !mirror; draw(); tip(mirror ? "Đang vẽ đối xứng: vẽ một bên, bên kia tự vẽ theo (phím M để tắt)" : "Đã tắt vẽ đối xứng"); });
      $("kb-cf-clear").addEventListener("click", () => { snapshot(); px = new Array(gw * gh).fill("."); img = null; draw(); });
      $("kb-cf-size").addEventListener("change", (e) => {
        undo = []; redo = [];   // các bản cũ khác cỡ, không hoàn tác qua được
        const n = Number(e.target.value);
        if (img) { size = n; gw = gh = n; px = convert(img, n, options()); } else { resizeGrid(n); }
        layout(); draw();
      });
      $("kb-cf-kind").addEventListener("change", (e) => { kind = e.target.value; if (img) { reconvert(); } else { draw(); } });
      $("kb-cf-fx").addEventListener("change", (e) => { fx = e.target.value; drawPreview(); });
      ["kb-cf-bg", "kb-cf-ol", "kb-cf-few"].forEach((id) => $(id).addEventListener("change", reconvert));
      $("kb-cf-pick").addEventListener("click", () => { tip("Đang mở hộp chọn ảnh…"); H.send("craft:pick"); });
      $("kb-cf-save").addEventListener("click", save);
      const bgsel = $("kb-cf-bgsel");
      if (bgsel) { bgsel.addEventListener("change", () => { if (zoneDraft) { zoneDraft.bg = bgsel.value; drawPreview(); } }); }
      $("kb-cf-name").addEventListener("input", () => { if (zoneMode && zoneDraft) { zoneDraft.name = $("kb-cf-name").value; } });
      $("kb-cf-cancel").addEventListener("click", close);
      window.addEventListener("resize", () => { if (isOpen) { layout(); draw(); } });
    },
    open: open,
    openZone: openZone,
    openSeed: openSeed,
    close: close,
    isOpen: () => isOpen,
    image: function (p) { if (isOpen && p && p.url) { loadImage(p.url, p.name); } },
    // Python báo đã lưu: trả về true nếu là món mới
    saved: function () { const isNew = !design; saving = false; close(); return isNew; },
    savedZone: function () { const isNew = !zone; saving = false; close(); return isNew; },
    openBase: openBase,
    // 1.25.5: Python đã lưu / bỏ bản sửa hình gốc
    baseSaved: function () { if (baseMode && saving) { saving = false; close(); return true; } return false; },
    savedSeed: function () { const isNew = !seedDesign; saving = false; close(); return isNew; },
    error: function (msg) { saving = false; tip(msg); syncButtons(); },
    // cho test
    _state: () => ({ size: size, kind: kind, fx: fx, tool: tool, color: color, px: px.join(""), undo: undo.length, redo: redo.length, brush: brush, layer: layer, zoom: zoom, env: zoneMode ? codeOf("env") : "", lm: zoneMode ? codeOf("lm") : "", design: design && design.id, cell: cell,
      gw: gw, gh: gh, zone: zoneMode, zoneDraft: zoneDraft, seed: seedMode, seedId: seedDesign && seedDesign.id,
      st: seedMode ? seedCodes() : null, price: priceOf(size), base: baseMode ? baseInfo && (baseInfo.group + ":" + baseInfo.id) : null,
      frames: baseMode ? Object.keys(layers) : null }),
    _setLayer: setLayer, _zoom: zoomBy,
    _load: loadImage,
    _encode: encode
  };
})();
