/* ことば畑 – 1.36: sự kiện Giáng sinh 2026 — tủ lịch 24 ngăn (Python: le_core.py giữ mọi luật; file này chỉ vẽ + gửi lệnh).
   - Bảng tủ lịch (#kb-le-pop): tủ gỗ 6 × 4 ngăn — ngăn đã mở thấy món, ngăn chờ mở lấp lánh, ngăn hôm nay chờ ôn 1 thẻ, ngăn lỡ
     ngày (mở bù bằng 15 lượt ôn), ngăn mai hé bóng món; bấm ngăn → "le:open:<ngăn>"; 3 hộp quà bí mật (lắc đoán, mở từ 25/12).
   - Đường vào: chip "Tủ lịch" ở hàng dưới dải cảnh, nút trong thẻ Hôm nay, bấm tủ lịch trên tường / cây thông ở sân.
   - Móc vẽ cho home.js (chỉ khi sự kiện đang chạy và ⚙ Sự kiện mùa = Bật): cây thông trơn → đầy dần (treeSprite / treeLit),
     hộp quà dưới gốc cây (drawTreeExtra), áo Noel của nhà (drawHouse, trước lớp tối ban đêm), đèn sân (drawLights, sau lớp
     tối: đèn viền mái, đèn rủ, quấn đèn cây thông + món cao, đèn lối đi, dây đèn võng, ngôi sao trên mái).
   Kiểu Dịu mắt / cảnh Đứng yên / tắt hiệu ứng: đèn không nhấp nháy (issue #7: vườn nặng CPU trên một số máy). Không dùng emoji. */
var GardenLe = (function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const YARD = { W: 256, H: 76, SKY: 28 };
  let H = null;
  let pending = 0, pendingAt = 0;      // lệnh đang chờ Python (chống bấm đúp)
  let anim = null;                     // ngăn đang mở: {d, t0}
  let shake = null;                    // hộp đang lắc: {n, t0}
  let card = null;                     // thẻ kết quả trong bảng
  let msg = "", msgBad = false;
  let hoverD = 0;
  let welcomed = "";
  let drawTimer = 0;

  function A() { return typeof GardenLeArt !== "undefined" ? GardenLeArt : null; }
  function data() { const d = H && H.data && H.data(); return d || null; }
  function le() { const d = data(); return (d && d.le) || null; }
  function active() { const v = le(); return !!(v && v.active); }
  function parts() { const v = le(); return (v && v.parts) || []; }
  function has(p) { return parts().indexOf(p) >= 0; }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
  function still() {
    const d = data();
    if (d && d.fx && d.fx.effects === false) { return true; }
    return typeof GardenUI !== "undefined" && GardenUI.get && GardenUI.get("yard") !== "full";
  }
  function homeState() { const d = data(); return (d && d.wallet && d.wallet.home) || { owned: {}, yard: [], room: [] }; }
  function placedIn(id) {
    const h = homeState(); let n = 0;
    Object.keys(h).forEach((sc) => { if (Array.isArray(h[sc])) { h[sc].forEach((e) => { if (e && e.id === id) { n++; } }); } });
    return n;
  }
  function ownedN(id) { return (homeState().owned || {})[id] || 0; }
  let itemMap = null, itemSrc = null;
  function itemInfo(id) {
    const d = data(), list = d && d.catalog && d.catalog.items;
    if (list !== itemSrc) { itemSrc = list; itemMap = {}; (list || []).forEach((it) => { itemMap[it.id] = it; }); }
    return (itemMap && itemMap[id]) || null;
  }
  function itemName(id) { const v = le(); return (v && v.names && v.names[id]) || id; }
  function ddmm(iso) { const p = String(iso || "").split("-"); return p.length === 3 ? (+p[2]) + "/" + (+p[1]) : ""; }

  // =====================================================================================================
  // Móc vẽ cho home.js
  // =====================================================================================================
  function treeSprite() {
    if (!active() || !A()) { return null; }
    return A().tree(parts());
  }
  function treeLit() { return active() ? { lights: has("lights"), star: has("star") } : null; }
  function openedSet() {
    const v = le();
    if (!v || !v.doors) { return null; }
    const out = {};
    v.doors.forEach((x) => { if (x.state === "open") { out[x.d] = true; } });
    return out;
  }
  // hộp quà bí mật dưới gốc cây (chưa mở) — vẽ trước chậu cây (X, Y: góc trên trái của hình cây 32 × 44)
  function drawTreeExtra(ctx, S, X, Y, e, now) {
    const v = le();
    if (!active() || !v || !A()) { return; }
    // 1.36.1: thiệp điều ước treo trên cây (tới lúc ông già Noel ghé) · thư của ông dưới gốc cây (chưa đọc) — lúc đang chiếu cảnh
    // đêm 24 thì cảnh tự vẽ hai thứ này theo thời gian
    const showing = typeof GardenLeNoel !== "undefined" && GardenLeNoel.isShowing();
    // 1.36.3: quả châu tự vẽ (trước thiệp nhỏ — thiệp treo đè lên)
    if (typeof GardenLeOrn !== "undefined") { GardenLeOrn.hung().forEach(([dx, dy, p]) => GardenLeOrn.paintOrn(ctx, p, X + dx, Y + dy, S, v.draw_pal)); }
    if (!showing && typeof v.hang === "number" && v.hang >= 0 && v.santa && !v.santa.came && A().CARD_MINI) { A().paint(ctx, A().CARD_MINI, X + 19, Y + 20, S); }
    if (!showing && v.letter && v.santa && !v.santa.read && A().LETTER) { const k = 0.6; A().paint(ctx, A().LETTER, (X + 11) / k, (Y + 37) / k, S * k); }
    const bx = (v.boxes || []).filter((b) => !b.opened);
    const spots = [[-2, 33], [24, 34], [28, 36]];
    bx.forEach((b, i) => {
      const [dx, dy] = spots[i] || spots[0];
      const hop = shake && shake.n === b.n && now - shake.t0 < 700 ? Math.round(Math.sin((now - shake.t0) / 40) * 1) : 0, k = 0.72;
      A().paint(ctx, A().boxIcon(b.n, false), (X + dx + hop) / k, (Y + dy) / k, S * k, null);
    });
  }
  function nightK(st) {
    if (!st) { return 0; }
    return Math.max(0, Math.min(1, (0.62 - (st.light === undefined ? 1 : st.light)) / 0.3));
  }
  function bulb(ctx, S, x, y, c, nk, k, now, glow) {
    if (nk <= 0.02) {          // ban ngày: dây đèn tắt
      ctx.fillStyle = "#6f7488";
      ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.ceil(S), Math.ceil(S));
      return;
    }
    const tw = still() ? 1 : 0.62 + 0.38 * Math.sin(now / 1100 + k * 2.3);
    if (glow !== false) {
      ctx.globalAlpha = 0.26 * nk * tw; ctx.fillStyle = c;
      ctx.fillRect(Math.round((x - 1) * S), Math.round((y - 1) * S), Math.ceil(3 * S), Math.ceil(3 * S));
    }
    ctx.globalAlpha = Math.min(1, 0.35 + nk * tw); ctx.fillStyle = c;
    ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.ceil(S), Math.ceil(S));
    ctx.globalAlpha = 1;
  }
  // áo Noel của nhà: phần không phát sáng (vòng hoa, dây lá thông + nơ, que đèn rủ, nến, ngôi sao ban ngày) — trước lớp tối
  function drawHouse(ctx, S, ox, oy, home) {
    if (!active() || !A() || !home) { return; }
    const level = home.house || 0, geo = A().houseGeo(level, home.style), L = A().houseLights(level, home.style, parts());
    if (!geo) { return; }
    const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round((ox + x) * S), Math.round((oy + y) * S), Math.ceil(S), Math.ceil(S)); };
    if (has("garland")) {
      L.green.forEach(([x, y], i) => { px(x, y, i % 3 ? "#2e8b3a" : "#1f5f2a"); px(x, y + 1, i % 2 ? "#3ccb5e" : "#2e8b3a"); });
      L.bows.forEach(([x, y]) => { px(x - 1, y, "#ff4f6d"); px(x + 1, y, "#ff4f6d"); px(x, y, "#c21f3a"); px(x - 1, y + 2, "#c21f3a"); px(x + 1, y + 2, "#c21f3a"); });
      L.icicles.forEach((ic) => { for (let j = 0; j < ic.len; j++) { px(ic.x, ic.y + j, "#5a6074"); } });
    }
    if (has("wreath") && geo.door) {
      const d = geo.door, cx = d.x + Math.floor(d.w / 2), r = d.w >= 10 ? 3 : 2, cy = d.y + r + 2;
      for (let a = 0; a < 20; a++) {
        const t = a / 20 * Math.PI * 2;
        px(cx + Math.round(Math.cos(t) * r) - 0.5, cy + Math.round(Math.sin(t) * r), a % 3 ? "#2e8b3a" : "#1f5f2a");
      }
      px(cx - 1, cy - r, "#ff4f6d"); px(cx + r - 1, cy, "#ff4f6d"); px(cx - r, cy + 1, "#ffd23f");
      px(cx - 1, cy + r + 1, "#ff4f6d"); px(cx, cy + r + 1, "#ff4f6d"); px(cx - 2, cy + r + 2, "#c21f3a"); px(cx + 1, cy + r + 2, "#c21f3a");
      (geo.lanterns || []).forEach(([x, y]) => { px(x, y - 1, "#ff4f6d"); px(x + 3, y - 1, "#ff4f6d"); px(x + 1, y - 1, "#c21f3a"); px(x + 2, y - 1, "#c21f3a"); });
    }
    if (has("path")) {
      (geo.wins || []).forEach((w) => {
        const cx = w.x + Math.floor(w.w / 2) - (w.round ? 0 : 1), by = w.y + w.h - 1;
        px(cx, by - 1, "#ffffff"); px(cx, by - 2, "#ffffff"); px(cx, by, "#d4d4e0");
      });
    }
    if (has("swag") && L.star) {
      const [x, y] = L.star;
      [[0, -2], [-2, 0], [-1, 0], [0, 0], [1, 0], [2, 0], [0, -1], [-1, 1], [1, 1], [-2, 2], [2, 2]].forEach(([dx, dy]) => px(x + dx, y + dy, "#ffd23f"));
      px(x, y, "#fff6a8");
    }
  }
  // các chỗ đèn của sân (tính lại khi đồ / nhà / phần đã mở đổi)
  let lightKey = "", lightCache = null;
  const MAX_BULBS = 400;
  function topRow(spr, i) { for (let j = 0; j < spr.length; j++) { if (spr[j].charAt(i) !== ".") { return j; } } return -1; }
  function yardLights(sceneName, home, boxes) {
    const key = sceneName + "|" + (home.house || 0) + "|" + (home.style || "") + "|" + parts().join(",") + "|" +
      (boxes || []).map((b) => b.id + "@" + b.x + "," + b.y + "," + b.w + "," + b.h).join(";");
    if (key === lightKey && lightCache) { return lightCache; }
    const out = { bulbs: [], wires: [] };
    const yard = sceneName === "yard";
    const geo = yard && A() ? A().houseGeo(home.house || 0, home.style) : null;
    if (yard && geo) {
      const L = A().houseLights(home.house || 0, home.style, parts());
      out.bulbs = out.bulbs.concat(L.bulbs);
    }
    const tall = (boxes || []).filter((b) => b.spr && (b.id === "xmastree" || b.h >= 26));
    if (has("path")) {
      tall.forEach((b, n) => {          // cây thông + món cao quấn đèn: dọc mép trên hình, mỗi 3 cột; món rộng thêm hai vòng chéo
        for (let i = 1; i < b.w - 1; i += 3) {
          const j = topRow(b.spr, i);
          if (j >= 0) { out.bulbs.push({ x: b.x + i, y: b.y + j + 1, c: A().WARM[(i + n) % 3], k: i * 7 + n }); }
        }
        if (b.w >= 24) {
          for (let s = 0; s < 2; s++) {
            const y0 = b.h * (0.3 + s * 0.28), y1 = y0 + b.h * 0.14;
            for (let t = 0; t <= 1.001; t += 0.12) {
              const i = Math.round(b.w * (0.18 + 0.64 * t)), j = Math.round(y0 + (y1 - y0) * t);
              const r = b.spr[j];
              if (r && r.charAt(i) !== "." && r.charAt(i) !== "k") { out.bulbs.push({ x: b.x + i, y: b.y + j, c: A().WARM[(s + Math.round(t * 8)) % 3], k: j * 3 + i }); }
            }
          }
        }
      });
      if (yard) {                      // đèn lối đi: mép trước các ô trống của hàng trước (không chiếm ô) + hai bên lối vào nhà
        const busy = {};
        (home.yard || []).forEach((e) => {
          const it = itemInfo(e.id), w = (it && it.w) || 1;
          for (let k = 0; k < w; k++) { busy[(e.x + k) + "," + e.y] = true; }
        });
        for (let cx = 4; cx < 16; cx++) {
          if (busy[cx + ",2"]) { continue; }
          out.bulbs.push({ x: cx * 16 + 8, y: YARD.H - 4, c: A().WARM[cx % 2], k: cx * 5, stake: true });
        }
        if ((home.house || 0) >= 1) {
          out.bulbs.push({ x: 25, y: 71, c: A().WARM[0], k: 1, stake: true }); out.bulbs.push({ x: 39, y: 71, c: A().WARM[0], k: 2, stake: true });
        }
      }
    }
    if (has("swag") && yard) {       // dây đèn võng: ống khói / nóc nhà → đỉnh cây thông, món cao (từ trái sang phải)
      const anchors = [];
      if (geo && (home.house || 0) >= 4) { anchors.push({ x: geo.top[0], y: geo.top[1] }); }
      tall.slice().sort((a, b) => a.x - b.x).forEach((b) => {
        let best = null;
        for (let i = 0; i < b.w; i++) { const j = topRow(b.spr, i); if (j >= 0 && (best === null || j < best.j)) { best = { i: i, j: j }; } }
        if (best) { anchors.push({ x: b.x + best.i, y: b.y + best.j + 2 }); }
      });
      for (let a = 0; a + 1 < anchors.length; a++) {
        const p = anchors[a], q = anchors[a + 1], dx = q.x - p.x;
        if (dx < 12 || dx > 150) { continue; }
        const sag = Math.min(12, 3 + dx * 0.1), n = Math.ceil(dx / 2);
        for (let k = 0; k <= n; k++) {
          const t = k / n, x = p.x + dx * t, y = p.y + (q.y - p.y) * t + sag * 4 * t * (1 - t);
          out.wires.push([Math.round(x), Math.round(y)]);
          if (k % 2 === 0 && k > 0 && k < n) { out.bulbs.push({ x: Math.round(x), y: Math.round(y) + 1, c: A().WARM[(k >> 1) % 3], k: k * 3 + a }); }
        }
      }
    }
    if (out.bulbs.length > MAX_BULBS) {         // sân kín món cao: giữ đều ≤ 400 bóng (vườn đã nặng CPU trên một số máy — issue #7)
      const k = out.bulbs.length / MAX_BULBS;
      out.bulbs = out.bulbs.filter((_, i) => Math.floor(i / k) !== Math.floor((i - 1) / k));
    }
    lightKey = key; lightCache = out;
    return out;
  }
  // đèn của sân sau lớp tối ban đêm (ban ngày: bóng tắt). boxes: [{id, x, y, w, h, spr}] món đã đặt ở cảnh (toạ độ nghệ thuật)
  function drawLights(ctx, S, ox, oy, sceneName, home, now, st, boxes) {
    if (!A() || !home) { return; }
    const nk = nightK(st);
    // tuần lộc đèn (món, cả khi hết mùa): bóng đèn dọc khung — ban đêm sáng, nhấp nháy chậm
    if (nk > 0.02) {
      (boxes || []).forEach((b) => {
        if (b.id !== "le_tuanloc") { return; }
        A().DEER_BULBS.forEach(([i, j], k) => bulb(ctx, S, ox + b.x + i, oy + b.y + j, k % 5 === 0 ? "#bfe8ff" : "#fff1c2", nk, k + b.x, now));
      });
    }
    if (!active()) { return; }
    const yard = sceneName === "yard";
    if (!yard && !has("path")) { return; }
    const Ls = yardLights(sceneName, home, boxes);
    if (Ls.wires.length) {
      ctx.fillStyle = nk > 0.3 ? "#2a2a3a" : "#4a4e60";
      Ls.wires.forEach(([x, y]) => ctx.fillRect(Math.round((ox + x) * S), Math.round((oy + y) * S), Math.ceil(S), Math.ceil(S)));
    }
    Ls.bulbs.forEach((b) => {
      if (b.stake) { ctx.fillStyle = "#5a6074"; ctx.fillRect(Math.round((ox + b.x) * S), Math.round((oy + b.y + 1) * S), Math.ceil(S), Math.ceil(2 * S)); }
      bulb(ctx, S, ox + b.x, oy + b.y, b.c, nk, b.k, now);
    });
    if (yard && has("swag")) {        // ngôi sao trên mái sáng ban đêm
      const geo = A().houseGeo(home.house || 0, home.style);
      if (geo && nk > 0.02) {
        const tw = still() ? 1 : 0.75 + 0.25 * Math.sin(now / 1300);
        ctx.globalAlpha = 0.22 * nk * tw; ctx.fillStyle = "#fff6a8";
        ctx.beginPath(); ctx.arc((ox + geo.apex[0] + 0.5) * S, (oy + geo.apex[1] + 0.5) * S, 6 * S, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
    if (has("path") && nk > 0.02) {   // nến cửa sổ: ngọn lửa
      const geo = yard ? A().houseGeo(home.house || 0, home.style) : null;
      (geo ? geo.wins || [] : []).forEach((w, k) => {
        const cx = w.x + Math.floor(w.w / 2) - (w.round ? 0 : 1), fy = w.y + w.h - 4;
        bulb(ctx, S, ox + cx, oy + fy, k % 2 ? "#ffb347" : "#ffd23f", nk, k + 40, now);
      });
    }
    if (has("lights") && nk > 0.05) {  // quầng sáng trên tuyết dưới cây thông
      (boxes || []).filter((b) => b.id === "xmastree").forEach((b) => {
        ctx.globalAlpha = 0.1 * nk; ctx.fillStyle = "#ffe9a8";
        ctx.beginPath(); ctx.ellipse((ox + b.x + b.w / 2) * S, (oy + b.y + b.h) * S, 22 * S, 4 * S, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      });
    }
  }

  // =====================================================================================================
  // Bảng tủ lịch
  // =====================================================================================================
  const CAB = { cols: 6, rows: 4, cw: 24, ch: 20, gap: 2, mx: 8, top: 14, bot: 8 };
  CAB.W = CAB.mx * 2 + CAB.cols * CAB.cw + (CAB.cols - 1) * CAB.gap;
  CAB.H = CAB.top + CAB.rows * CAB.ch + (CAB.rows - 1) * CAB.gap + CAB.bot;
  let S = 3;
  function cell(d) {
    const i = d - 1, c = i % CAB.cols, r = Math.floor(i / CAB.cols);
    return { x: CAB.mx + c * (CAB.cw + CAB.gap), y: CAB.top + r * (CAB.ch + CAB.gap), w: CAB.cw, h: CAB.ch };
  }
  function doorAt(ax, ay) {
    for (let d = 1; d <= 24; d++) { const c = cell(d); if (ax >= c.x && ax < c.x + c.w && ay >= c.y && ay < c.y + c.h) { return d; } }
    return 0;
  }
  const TILE_ICON = {
    w_noeltuyet: ["#2f6b4a", "#ffffff"], w_noelkeo: ["#fff7f2", "#d23a3a"], w_noeldo: ["#7a1f2e", "#ffd23f"],
    f_noelcaro: ["#b3242f", "#1f5a3a"], f_noellen: ["#f4f1ea", "#c8323c"]
  };
  function iconRows(x) {
    const Ar = A();
    if (!Ar) { return null; }
    if (x.kind === "qua") { return Ar.boxIcon(x.box || 1, false); }
    if (x.item && Ar.ITEMS[x.item]) { return Ar.ITEMS[x.item]; }
    if (x.part && Ar.ICON[x.part]) { return Ar.ICON[x.part]; }
    return null;
  }
  function drawIcon(ctx, x, rx, ry, rw, rh, alpha, silhouette) {
    const Ar = A();
    if ((x.tiles || []).length) {          // mẫu tường / sàn: các ô màu nhỏ
      const ts = x.tiles, w = Math.min(6, Math.floor((rw - 2) / ts.length));
      ts.forEach((t, k) => {
        const [a, b] = TILE_ICON[t] || ["#cccccc", "#888888"], px0 = rx + Math.floor((rw - ts.length * (w + 1)) / 2) + k * (w + 1), py0 = ry + Math.floor((rh - 8) / 2);
        ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.fillStyle = silhouette ? "#2b2b44" : "#1b1b2f"; ctx.fillRect(px0 * S, py0 * S, w * S, 8 * S);
        ctx.fillStyle = silhouette ? "#2b2b44" : a; ctx.fillRect((px0 + 0.5) * S, (py0 + 0.5) * S, (w - 1) * S, 7 * S);
        if (!silhouette) { ctx.fillStyle = b; ctx.fillRect((px0 + 1) * S, (py0 + 2) * S, Math.max(1, w - 3) * S, S); ctx.fillRect((px0 + 2) * S, (py0 + 5) * S, Math.max(1, w - 4) * S, S); }
        ctx.globalAlpha = 1;
      });
      return;
    }
    let r = iconRows(x);
    if (!r || !Ar) { return; }
    if (silhouette) { r = Ar.shadowRows(r); }
    const k = Math.min(1, (rw - 2) / r[0].length, (rh - 2) / r.length);
    const w = r[0].length * k, h = r.length * k;
    Ar.paint(ctx, r, (rx + (rw - w) / 2) / k, (ry + (rh - h) / 2) / k, S * k, null, alpha);
  }
  function drawCabinet(now) {
    const cv = $("kb-le-cab"), v = le();
    if (!cv || !v || !v.doors) { return; }
    const want = Math.min(3, Math.max(2, Math.floor((Math.min(window.innerWidth, 620) - 60) / CAB.W)));
    if (want !== S || cv.width !== CAB.W * S) {
      S = want; cv.width = CAB.W * S; cv.height = CAB.H * S; cv.style.width = CAB.W * S + "px"; cv.style.height = CAB.H * S + "px";
    }
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const bx = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S)); };
    ctx.clearRect(0, 0, cv.width, cv.height);
    // khung tủ gỗ + mái nhỏ + nơ đỏ
    bx(0, 6, CAB.W, CAB.H - 6, "#3a2418"); bx(2, 8, CAB.W - 4, CAB.H - 10, "#6b3b1f");
    bx(4, 10, CAB.W - 8, CAB.H - 14, "#5a3a26");
    bx(0, 3, CAB.W, 4, "#3a2418"); bx(6, 0, CAB.W - 12, 4, "#3a2418"); bx(8, 1, CAB.W - 16, 2, "#7a4a2a");
    const mid = CAB.W / 2;
    bx(mid - 6, 0, 5, 4, "#ff4f6d"); bx(mid + 1, 0, 5, 4, "#ff4f6d"); bx(mid - 1, 0, 2, 5, "#c21f3a"); bx(mid - 3, 4, 2, 4, "#c21f3a"); bx(mid + 1, 4, 2, 4, "#c21f3a");
    for (let x = 10; x < CAB.W - 10; x += 12) { bx(x, CAB.H - 4, 2, 2, "#e9b949"); }
    const Ar = A();
    v.doors.forEach((x) => {
      const c = cell(x.d), st = x.state;
      const opening = anim && anim.d === x.d ? Math.min(1, (now - anim.t0) / 420) : 0;
      if (st === "open" || opening) {
        bx(c.x, c.y, c.w, c.h, "#1b1b2f"); bx(c.x + 1, c.y + 1, c.w - 2, c.h - 2, "#f7e7c6");
        bx(c.x + 1, c.y + 1, c.w - 2, 2, "#e8d3a6");
        if (st === "open") { drawIcon(ctx, x, c.x + 3, c.y + 4, c.w - 6, c.h - 6); }
        if (Ar) { Ar.digit(ctx, S, c.x + 2, c.y + 2, x.d, x.bu ? "#a0603a" : "#c9962e"); }
        if (opening && opening < 1) {      // mặt ngăn trượt xuống
          const dy = Math.round(opening * (c.h - 3));
          bx(c.x, c.y + dy, c.w, c.h - dy, "#1b1b2f"); bx(c.x + 1, c.y + dy, c.w - 2, c.h - dy - 1, "#b8743f");
        }
        return;
      }
      const odd = (x.d + Math.floor((x.d - 1) / 6)) % 2;
      let face = odd ? "#b8743f" : "#a8683a";
      if (st === "miss" || st === "closed") { face = odd ? "#9a8472" : "#8e7a6a"; }
      bx(c.x, c.y, c.w, c.h, "#1b1b2f"); bx(c.x + 1, c.y + 1, c.w - 2, c.h - 2, face);
      bx(c.x + 1, c.y + 1, c.w - 2, 1, "#d08a50"); bx(c.x + 1, c.y + c.h - 2, c.w - 2, 1, "#7a4a2a");
      bx(c.x + c.w / 2 - 2, c.y + c.h - 6, 4, 2, "#e9b949"); bx(c.x + c.w / 2 - 1, c.y + c.h - 5, 2, 1, "#fff6a8");
      if (x.peek) { drawIcon(ctx, x, c.x + 8, c.y + 2, c.w - 10, c.h - 9, 0.4, true); }
      const numCol = st === "ready" ? "#fff6a8" : st === "wait" ? "#ffffff" : st === "miss" || st === "closed" ? "#5a4a40" : "#fff2b3";
      if (Ar) { Ar.digit(ctx, S, c.x + 3, c.y + 3, x.d, numCol); }
      if (st === "ready") {               // chờ mở: viền vàng + lấp lánh
        const k = still() ? 1 : 0.6 + 0.4 * Math.sin(now / 260 + x.d);
        ctx.globalAlpha = 0.9 * k;
        bx(c.x - 1, c.y - 1, c.w + 2, 1, "#ffd23f"); bx(c.x - 1, c.y + c.h, c.w + 2, 1, "#ffd23f");
        bx(c.x - 1, c.y, 1, c.h, "#ffd23f"); bx(c.x + c.w, c.y, 1, c.h, "#ffd23f");
        ctx.globalAlpha = 1;
        const t = Math.floor(now / 300 + x.d) % 4;
        [[c.x + 18, c.y + 3], [c.x + 20, c.y + 9], [c.x + 15, c.y + 12], [c.x + 6, c.y + 13]].forEach(([sx, sy], i) => {
          if (still() || (i + t) % 2 === 0) { bx(sx, sy, 1, 1, "#fff6a8"); bx(sx - 1, sy, 1, 1, "#ffd23f"); bx(sx + 1, sy, 1, 1, "#ffd23f"); }
        });
      } else if (st === "wait") {
        ctx.globalAlpha = 0.7;
        for (let i = 0; i < c.w; i += 3) { bx(c.x + i, c.y - 1, 2, 1, "#ffffff"); bx(c.x + i, c.y + c.h, 2, 1, "#ffffff"); }
        ctx.globalAlpha = 1;
      } else if (st === "miss" && (v.makeup || {}).left > 0) {
        bx(c.x + c.w - 6, c.y + 2, 4, 4, "#4a9258"); bx(c.x + c.w - 5, c.y + 3, 2, 2, "#c8f7d2");
      }
      if (hoverD === x.d && (st === "ready" || st === "miss")) { ctx.globalAlpha = 0.18; bx(c.x + 1, c.y + 1, c.w - 2, c.h - 2, "#ffffff"); ctx.globalAlpha = 1; }
    });
  }
  function doorTip(x) {
    const v = le() || {}, mk = v.makeup || {};
    const base = "Ngăn " + x.d + "/12";
    if (x.state === "open") { return base + " · " + x.name + (x.at ? " · mở " + ddmm(x.at) + (x.bu ? " (mở bù)" : "") : ""); }
    if (x.state === "ready") { return base + " · bấm để mở" + (x.frozen ? " (ngày dùng vé giữ chuỗi)" : ""); }
    if (x.state === "wait") { return base + " · hôm nay — ôn 1 thẻ là mở được"; }
    if (x.state === "miss") {
      if (mk.left > 0) { return base + " · lỡ ngày — bấm để mở bù (hôm nay còn " + mk.left + " ngăn bù)"; }
      if (mk.next === null) { return base + " · lỡ ngày — hôm nay đã mở bù đủ " + mk.max + " ngăn, mai mở bù tiếp"; }
      return base + " · lỡ ngày — ôn thêm " + mk.next + " lượt hôm nay để mở bù";
    }
    if (x.state === "closed") { return base + " · không mở trong mùa"; }
    if (x.peek) { return base + " · mai mở · " + x.kname + ": " + x.name; }
    return base + " · mở từ " + x.d + "/12";
  }
  function noteText() {
    const v = le();
    if (!v) { return ""; }
    if (v.phase === "done") { return "Mùa Giáng sinh " + v.year + " đã qua — tủ lịch giữ làm kỷ niệm (" + v.opened + "/24 ngăn đã mở)."; }
    const mk = v.makeup || {}, lines = [];
    const today = (v.doors || []).find((x) => x.d === v.day);
    if (v.ready && v.ready.length) { lines.push(v.ready.length === 1 ? "Ngăn " + v.ready[0] + " chờ mở — bấm ngăn sáng." : v.ready.length + " ngăn chờ mở — bấm ngăn sáng."); }
    else if (today && today.state === "wait") { lines.push("Ôn 1 thẻ hôm nay là mở được ngăn " + v.day + "."); }
    if (v.miss && v.miss.length) {
      lines.push("Lỡ " + v.miss.length + " ngày: " + mk.per + " lượt ôn mở bù 1 ngăn (tối đa " + mk.max + " ngăn / ngày, tới hết 31/12)" +
        (mk.left > 0 ? " · bấm ngăn xám để mở bù." : mk.next ? " · hôm nay còn " + mk.next + " lượt nữa." : " · hôm nay đã bù đủ."));
    }
    if (!lines.length && v.opened >= 24) { lines.push("Đã mở đủ 24 ngăn!"); }
    if (v.santa && !v.santa.came && v.day === 24 && !(typeof v.hang === "number" && v.hang >= 0)) { lines.push("Tối nay ông già Noel ghé — treo thiệp điều ước lên cây trước 18:00."); }
    return lines.join(" ");
  }
  function hints() {
    const v = le(), out = [];
    if (!v || v.phase === "done") { return out; }
    const h = homeState();
    if ((has("wreath") || has("garland")) && (v.house || 0) < 4) { out.push({ t: "Áo Noel của nhà hiện khi nhà có mái (tab Xây nhà)." }); }
    if (!placedIn("xmastree")) {
      out.push(ownedN("xmastree") ? { t: "Cây thông đang ở Kho đồ — đặt ra sân để thấy đồ treo.", b: "Đặt cây thông ▸", id: "xmastree" }
        : { t: "Chưa có cây thông Noel." });
    }
    if (ownedN("le_tulich") && !placedIn("le_tulich")) {
      out.push((v.house || 0) >= (v.room_unlock || 5) ? { t: "Tủ lịch đang ở Kho đồ.", b: "Treo lên tường ▸", id: "le_tulich", auto: true }
        : { t: "Tủ lịch nằm trong Kho đồ — xây nhà tới bước “Lắp cửa” là treo được (vẫn mở ngăn ở đây được)." });
    }
    ["le_nguoituyet", "le_tuanloc"].forEach((id) => {
      if (ownedN(id) > placedIn(id)) { out.push({ t: itemName(id) + " đang ở Kho đồ.", b: "Bày ra sân ▸", id: id, auto: true }); }
    });
    void h;
    return out;
  }
  function render() {
    const pop = $("kb-le-pop"), v = le();
    if (!pop || pop.hidden) { return; }
    if (!v || !v.doors) { close(); return; }
    $("kb-le-title").textContent = "Lịch chờ Giáng sinh " + v.year;
    $("kb-le-count").textContent = v.opened + "/24";
    const pv = $("kb-le-pv");
    pv.hidden = !v.preview;
    if (v.preview) { pv.textContent = "Đang xem thử ngày " + ddmm(v.today) + " — không lưu gì"; }
    const note = $("kb-le-note");
    note.textContent = msg || noteText();
    note.classList.toggle("is-bad", !!(msg && msgBad));
    const hb = $("kb-le-hints");
    hb.textContent = "";
    hints().forEach((x) => {
      const row = hb.appendChild(el("div", "kb-le-hint"));
      row.appendChild(el("span", "", x.t));
      if (x.b) {
        const b = row.appendChild(el("button", "kb-btn kb-btn-small", x.b)); b.type = "button";
        b.addEventListener("click", () => { if (x.auto) { send("auto:" + x.id); } else { placeOut(x.id); } });
      }
    });
    hb.hidden = !hb.childNodes.length;
    renderActs();
    renderBoxes();
    renderCard();
    drawCabinet(Date.now());
  }
  function renderActs() {
    const wrap = $("kb-le-acts"), v = le();
    wrap.textContent = "";
    if (!v) { wrap.hidden = true; return; }
    const add = (t, id, fn) => { const b = wrap.appendChild(el("button", "kb-btn kb-btn-small", t)); b.type = "button"; b.id = id; b.addEventListener("click", (ev) => { ev.stopPropagation(); fn(); }); };
    if (v.cards && typeof GardenLeCard !== "undefined" && (v.card_edit || v.cards.some(Boolean))) {
      const hung = (typeof v.hang === "number" && v.hang >= 0);
      add(v.card_edit && !v.santa.came ? (hung ? "Thiệp điều ước (đang treo trên cây) ▸" : "Làm thiệp điều ước ▸") : "Thiệp Giáng sinh ▸", "kb-le-to-card", () => GardenLeCard.open());
    }
    // 1.36.3: quả châu tự vẽ (vẽ được 1/12 – 31/12; sau mùa xem ở Album → Kỷ niệm)
    if (v.orn && v.orn_edit && typeof GardenLeOrn !== "undefined") { add("Vẽ quả châu ▸", "kb-le-to-orn", () => GardenLeOrn.open()); }
    if (v.letter && typeof GardenLeNoel !== "undefined") { add("Thư của ông già Noel ▸", "kb-le-to-letter", () => GardenLeNoel.openLetter()); }
    if (v.santa && v.santa.came && typeof GardenLeNoel !== "undefined") { add("Xem lại đêm 24 ▸", "kb-le-to-show", () => GardenLeNoel.play("replay")); }
    wrap.hidden = !wrap.childNodes.length;
  }
  function renderBoxes() {
    const wrap = $("kb-le-boxes"), v = le();
    wrap.textContent = "";
    const bx = (v && v.boxes) || [];
    if (!bx.length) { wrap.hidden = true; return; }
    wrap.hidden = false;
    wrap.appendChild(el("div", "kb-le-sec", "Hộp quà bí mật dưới gốc cây" + (v.phase === "advent" ? " · mở từ sáng 25/12" : "")));
    const row = wrap.appendChild(el("div", "kb-le-box-row"));
    bx.forEach((b) => {
      const btn = row.appendChild(el("button", "kb-le-box" + (b.opened ? " is-open" : b.can ? " is-can" : ""))); btn.type = "button";
      btn.setAttribute("data-box", b.n);
      const cv = btn.appendChild(document.createElement("canvas"));
      cv.width = 42; cv.height = 42; cv.className = "kb-le-box-ico";
      const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
      if (A()) {
        if (b.opened && b.item && A().ITEMS[b.item]) {
          const r = A().ITEMS[b.item], k = Math.min(1, 14 / r[0].length, 14 / r.length);
          A().paint(ctx, r, (14 - r[0].length * k) / 2 / k, (14 - r.length * k) / 2 / k, 3 * k);
        } else { A().paint(ctx, A().boxIcon(b.n, false), 0, 0, 3); }
      }
      btn.appendChild(el("span", "kb-le-box-t", b.opened ? itemName(b.item) : "Hộp " + b.n + " · ngăn " + b.d + "/12"));
      btn.title = b.opened ? "Đã mở: " + itemName(b.item) : b.can ? "Mở hộp quà" : "Lắc thử đoán xem";
      btn.addEventListener("click", (ev) => {
        ev.stopPropagation();
        if (b.opened) { return; }
        if (b.can) { send("box:" + b.n); return; }
        shake = { n: b.n, t0: Date.now() };
        btn.classList.remove("is-shake"); void btn.offsetWidth; btn.classList.add("is-shake");
        sfx("boop");
        msg = b.shake[0] + " " + b.shake[1]; msgBad = false;
        $("kb-le-note").textContent = msg; $("kb-le-note").classList.remove("is-bad");
      });
    });
  }
  function renderCard() {
    const c = $("kb-le-card");
    c.textContent = "";
    if (!card) { c.hidden = true; return; }
    c.hidden = false;
    const top = c.appendChild(el("div", "kb-le-card-top"));
    const cv = top.appendChild(document.createElement("canvas"));
    cv.width = 56; cv.height = 56; cv.className = "kb-le-card-ico";
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    const r = card.rows;
    if (r && A()) { const k = Math.min(1, 16 / r[0].length, 16 / r.length); A().paint(ctx, r, (18 - r[0].length * k) / 2 / k, (18 - r.length * k) / 2 / k, 3 * k); }
    const t = top.appendChild(el("div", "kb-le-card-txt"));
    t.appendChild(el("div", "kb-le-card-name", card.title));
    if (card.desc) { t.appendChild(el("div", "kb-le-card-desc", card.desc)); }
    if (card.line) { c.appendChild(el("div", "kb-le-card-line", card.line)); }
    const row = c.appendChild(el("div", "kb-le-card-btns"));
    (card.btns || []).forEach((b) => {
      const e = row.appendChild(el("button", "kb-btn kb-btn-small", b.t)); e.type = "button";
      e.addEventListener("click", (ev) => { ev.stopPropagation(); b.fn(); });
    });
    const ok = row.appendChild(el("button", "kb-btn kb-btn-small", "Đóng")); ok.type = "button";
    ok.addEventListener("click", (ev) => { ev.stopPropagation(); card = null; renderCard(); });
  }
  function loop() {
    drawTimer = 0;
    const pop = $("kb-le-pop");
    if (!pop || pop.hidden) { return; }
    if (!document.hidden) { drawCabinet(Date.now()); }
    drawTimer = setTimeout(loop, still() ? 600 : 90);
  }
  function build() {
    let pop = $("kb-le-pop");
    if (pop) { return pop; }
    pop = el("div", "kb-le-pop"); pop.id = "kb-le-pop"; pop.hidden = true;
    pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Lịch chờ Giáng sinh");
    const head = pop.appendChild(el("div", "kb-le-head"));
    head.appendChild(el("b", "", "Lịch chờ Giáng sinh")).id = "kb-le-title";
    head.appendChild(el("span", "kb-le-count", "")).id = "kb-le-count";
    const x = head.appendChild(el("button", "kb-pin-x", "✕")); x.type = "button"; x.setAttribute("aria-label", "Đóng");
    x.addEventListener("click", (ev) => { ev.stopPropagation(); close(); });
    const pv = pop.appendChild(el("div", "kb-le-pv")); pv.id = "kb-le-pv"; pv.hidden = true;
    const cv = pop.appendChild(document.createElement("canvas")); cv.id = "kb-le-cab"; cv.className = "kb-le-cab";
    cv.setAttribute("role", "img"); cv.setAttribute("aria-label", "Tủ lịch 24 ngăn");
    const note = pop.appendChild(el("div", "kb-le-note")); note.id = "kb-le-note"; note.setAttribute("aria-live", "polite");
    const hb = pop.appendChild(el("div", "kb-le-hints")); hb.id = "kb-le-hints";
    const acts = pop.appendChild(el("div", "kb-h-btns kb-le-acts")); acts.id = "kb-le-acts";      // 1.36.1
    const bx = pop.appendChild(el("div", "kb-le-boxes")); bx.id = "kb-le-boxes";
    const cd = pop.appendChild(el("div", "kb-le-card")); cd.id = "kb-le-card"; cd.hidden = true;
    pop.addEventListener("click", (ev) => ev.stopPropagation());
    cv.addEventListener("mousemove", (ev) => {
      const r = cv.getBoundingClientRect(), d = doorAt((ev.clientX - r.left) / S, (ev.clientY - r.top) / S), v = le();
      hoverD = d;
      const x0 = d && v ? v.doors[d - 1] : null;
      cv.title = x0 ? doorTip(x0) : "";
      cv.style.cursor = x0 && (x0.state === "ready" || x0.state === "miss") ? "pointer" : "";
    });
    cv.addEventListener("mouseleave", () => { hoverD = 0; });
    cv.addEventListener("click", (ev) => {
      const r = cv.getBoundingClientRect(), d = doorAt((ev.clientX - r.left) / S, (ev.clientY - r.top) / S);
      if (d) { clickDoor(d); }
    });
    ($("kb-app") || document.body).appendChild(pop);
    return pop;
  }
  function clickDoor(d) {
    const v = le();
    if (!v || !v.doors) { return; }
    const x = v.doors[d - 1];
    if (x.state === "open") {
      card = { title: "Ngăn " + d + "/12 · " + x.name, desc: x.desc, rows: iconRows(x), line: x.at ? "Mở ngày " + ddmm(x.at) + (x.bu ? " (mở bù)" : "") : "", btns: doneBtns(x) };
      msg = ""; render(); return;
    }
    if (x.state === "ready" || x.state === "miss") {
      if (x.state === "miss" && !((v.makeup || {}).left > 0)) { msg = doorTip(x); msgBad = true; sfx("again"); render(); return; }
      if (pending && Date.now() - pendingAt < 8000) { return; }
      anim = { d: d, t0: Date.now() };
      send("open:" + d);
      return;
    }
    msg = doorTip(x); msgBad = x.state !== "future"; sfx("boop"); render();
  }
  function doneBtns(x) {
    const out = [];
    if (x.item) {
      const id = x.item, it = itemInfo(id);
      if (ownedN(id) > placedIn(id)) {
        if (it && it.scene === "yard") { out.push({ t: "Bày ra sân ▸", fn: () => send("auto:" + id) }); }
        else { out.push({ t: "Đặt ▸", fn: () => placeOut(id) }); }
      }
    }
    if ((x.tiles || []).length) { out.push({ t: "Dùng ở Tường & sàn ▸", fn: () => { close(); if (typeof GardenHome !== "undefined" && GardenHome.openDecor) { GardenHome.openDecor(); } } }); }
    if (x.part || x.kind === "qua") { out.push({ t: "Xem ở sân ▸", fn: () => { close(); if (typeof GardenHome !== "undefined" && GardenHome.showMain) { GardenHome.showMain("yard"); } } }); }
    return out;
  }
  function placeOut(id) {
    close();
    if (typeof GardenHome !== "undefined" && GardenHome.placeNew) { GardenHome.placeNew(id); }
  }
  function send(cmd) {
    if (!H) { return; }
    pending++; pendingAt = Date.now();
    H.send("le:" + cmd);
  }
  // 1.36.1: lệnh của thiệp / ông già Noel / Album (le_card.js, le_noel.js tự gửi — không tính vào chống bấm đúp của tủ lịch)
  const LATER = { card: 1, cdel: 1, hang: 1, fix: 1, fixed: 1, code: 1, seen: 1, read: 1, recv: 1, rdel: 1, rpeek: 1, rcode: 1, orn: 1 };
  // 1.36.2 (audit #09): tủ lịch tự treo sang Bếp / Phòng ngủ khi tường phòng chính kín chỗ — báo đúng chỗ
  function whereName(scene) {
    return { room: "tường phòng khách", kitchen: "tường Bếp", bedroom: "tường Phòng ngủ", yard: "sân" }[scene] || "sân";
  }
  function result(res) {
    if (res && LATER[res.act]) {
      const d0 = data();
      if (d0 && res.le !== undefined) { d0.le = res.le; }
      lightKey = "";
      if (typeof GardenLeCard !== "undefined") { GardenLeCard.result(res); }
      if (typeof GardenLeOrn !== "undefined") { GardenLeOrn.result(res); }          // 1.36.3
      if (typeof GardenLeNoel !== "undefined") { GardenLeNoel.result(res); }
      const pop = $("kb-le-pop");
      if (pop && !pop.hidden) { render(); }
      sync();
      return;
    }
    pending = Math.max(0, pending - 1);
    if (!res) { return; }
    const d = data();
    if (d && res.wallet) { d.wallet = res.wallet; }
    if (d && res.le !== undefined) { d.le = res.le; }
    if (res.wallet && typeof GardenHome !== "undefined" && GardenHome.dataChanged) { GardenHome.dataChanged(); }
    lightKey = "";
    if (!res.ok) {
      anim = null;
      msg = res.msg || "Không làm được."; msgBad = true; sfx("again");
      render(); sync(); return;
    }
    msg = ""; msgBad = false;
    if (res.act === "open") {
      const x = res.door, v = le(), dv = v && v.doors ? v.doors[x.d - 1] : x;
      sfx("stage");
      if (typeof GardenFX !== "undefined" && GardenFX.mood) { GardenFX.mood("happy", 1800); }
      const placed = (res.placed || []).map((p) => itemName(p.id) + " (" + whereName(p.scene) + ")");
      let line = x.makeup ? "Mở bù · " : "";
      if (x.kind === "qua") { line += "Hộp quà đặt dưới gốc cây — lắc thử đoán xem, mở từ sáng 25/12."; }
      else if (placed.length) { line += "Đã bày: " + placed.join(", ") + "."; }
      else if (Object.keys(x.item || {}).length) { line += "Đã vào Kho đồ."; }
      else if ((x.tiles || []).length) { line += "Mẫu mới ở Nội thất → Tường & sàn."; }
      else if (x.kind === "cay") { line += placedIn("xmastree") ? "Đã treo lên cây thông." : "Đặt cây thông ra sân để thấy."; }
      else if (x.kind === "nha" && ((v && v.house) || 0) < 4) { line += "Áo Noel hiện khi nhà có mái."; }
      else { line += x.part === "garland" || x.part === "swag" || x.part === "path" ? "Tối là sáng đèn." : ""; }
      if (res.preview) { line += " (xem thử — không lưu)"; }
      card = { title: "Ngăn " + x.d + "/12 · " + x.name, desc: x.desc, rows: iconRows(dv || x), line: line, btns: doneBtns(dv || x) };
      setTimeout(() => { anim = null; }, 450);
    } else if (res.act === "box") {
      sfx("harvest");
      const id = Object.keys(res.item || {})[0];
      card = { title: "Hộp quà " + res.n + " · " + itemName(id), desc: "Món trong hộp quà bí mật — đã vào Kho đồ" + (res.preview ? " (xem thử — không lưu)" : "") + ".",
        rows: A() && A().ITEMS[id] ? A().ITEMS[id] : null, btns: ownedN(id) > placedIn(id) ? [{ t: "Đặt ▸", fn: () => placeOut(id) }] : [] };
    } else if (res.act === "auto") {
      sfx("coin");
      const p = (res.placed || [])[0];
      msg = p ? "Đã bày " + itemName(p.id) + (p.scene === "yard" ? " ra sân." : " lên " + whereName(p.scene) + ".") : "";
    }
    render(); sync();
  }

  // =====================================================================================================
  // Chip "Tủ lịch" (hàng dưới dải cảnh) + nút trong thẻ Hôm nay
  // =====================================================================================================
  function ensureUi() {
    if (!$("kb-le-chip")) {
      const bar = $("kb-scene-bar");
      if (bar) {
        const b = el("button", "kb-yard-snap kb-le-chip"); b.type = "button"; b.id = "kb-le-chip"; b.hidden = true;
        b.setAttribute("aria-label", "Lịch chờ Giáng sinh");
        b.appendChild(el("i", "kb-pi kb-pi-gift")).setAttribute("aria-hidden", "true");
        b.appendChild(el("span", "kb-le-chip-t", ""));
        b.addEventListener("mousedown", (ev) => ev.preventDefault());
        b.addEventListener("click", (ev) => { ev.stopPropagation(); toggle(); });
        bar.appendChild(b);
      }
    }
    if (!$("kb-le-btn")) {
      const list = document.querySelector("#kb-today .kb-today-list"), nb = $("kb-news-btn");
      if (list) {
        const b = el("button", "kb-quest-btn kb-le-btn"); b.type = "button"; b.id = "kb-le-btn"; b.hidden = true;
        b.title = "Lịch chờ Giáng sinh: mỗi ngày ôn mở một ngăn";
        b.addEventListener("click", (ev) => {
          ev.stopPropagation();
          // 1.36.1: dòng "treo thiệp trước 18:00" / "làm thiệp" → xưởng thiệp; "thư của ông già Noel" → thư
          const n = (le() || {}).news, id = n && n.id;
          if ((id === "le_eve_card" || id === "le_card") && typeof GardenLeCard !== "undefined") { GardenLeCard.open(); return; }
          if (id === "le_letter" && typeof GardenLeNoel !== "undefined") { GardenLeNoel.openLetter(); return; }
          open();
        });
        if (nb) { list.insertBefore(b, nb); } else { list.appendChild(b); }
      }
    }
  }
  function sync() {
    ensureUi();
    const v = le(), chip = $("kb-le-chip"), tb = $("kb-le-btn");
    const show = !!(v && v.doors && v.chip !== false);
    if (chip) {
      chip.hidden = !show;
      if (show) {
        const t = chip.querySelector(".kb-le-chip-t");
        const txt = "Tủ lịch " + v.opened + "/24";
        if (t.textContent !== txt) { t.textContent = txt; }
        const hot = !!(v.ready && v.ready.length) || ((v.makeup || {}).left > 0 && v.miss && v.miss.length) || (v.boxes || []).some((b) => b.can);
        chip.classList.toggle("is-hot", hot);
        chip.title = (v.news && v.news.text) || "Lịch chờ Giáng sinh " + v.year;
      }
    }
    if (tb) {
      const n = v && v.news;
      const on = show && n && !n.low && v.phase !== "done" || (show && n && n.id === "le_box");
      tb.hidden = !on;
      if (on) {
        const txt = n.text + " ▸";
        if (tb.getAttribute("data-t") !== txt) {
          tb.setAttribute("data-t", txt); tb.textContent = "";
          tb.appendChild(el("i", "kb-pi kb-pi-gift")).setAttribute("aria-hidden", "true");
          tb.appendChild(document.createTextNode(txt));
        }
      }
    }
  }
  function open() {
    const v = le();
    if (!v || !v.doors) { return; }
    const pop = build();
    msg = ""; card = null;
    if (pop.hidden) {
      pop.hidden = false;
      if (!drawTimer) { loop(); }
    }
    render();
  }
  function close() {
    const pop = $("kb-le-pop");
    if (!pop || pop.hidden) { return; }
    pop.hidden = true; card = null; msg = ""; anim = null;
    if (drawTimer) { clearTimeout(drawTimer); drawTimer = 0; }
  }
  function toggle() { const pop = $("kb-le-pop"); if (pop && !pop.hidden) { close(); } else { open(); } }

  function renderData() {
    const v = le();
    lightKey = "";
    sync();
    const pop = $("kb-le-pop");
    if (pop && !pop.hidden) { render(); }
    if (typeof GardenLeCard !== "undefined") { GardenLeCard.render(); }      // 1.36.1
    if (typeof GardenLeOrn !== "undefined") { GardenLeOrn.render(); }        // 1.36.3
    if (typeof GardenLeNoel !== "undefined") { GardenLeNoel.render(); }
    // lần đầu mở vườn trong mùa: tặng tủ lịch + cây thông
    if (v && v.welcome && v.welcome.welcome && welcomed !== v.today) {
      welcomed = v.today;
      const pl = (v.welcome.placed || []).map((p) => p.id);
      const tl = (v.welcome.placed || []).filter((p) => p.id === "le_tulich")[0];
      const where = [];
      where.push(tl ? "tủ lịch treo ở " + whereName(tl.scene) : "tủ lịch ở Kho đồ");
      if ((v.welcome.give || {}).xmastree || pl.indexOf("xmastree") >= 0) { where.push(pl.indexOf("xmastree") >= 0 ? "cây thông ở sân" : "cây thông ở Kho đồ"); }
      if (H && H.toast) { H.toast("[i:gift] Lịch chờ Giáng sinh mở rồi! Quà tặng: " + where.join(", ") + " · bấm “Tủ lịch” để mở ngăn.", null, 7000); }
    }
  }

  return {
    init: function (helpers) {
      H = helpers;
      ensureUi();
      if (typeof GardenLeCard !== "undefined") { GardenLeCard.init(helpers); }      // 1.36.1
      if (typeof GardenLeOrn !== "undefined") { GardenLeOrn.init(helpers); }        // 1.36.3
      if (typeof GardenLeNoel !== "undefined") { GardenLeNoel.init(helpers); }
      document.addEventListener("keydown", (ev) => {
        const pop = $("kb-le-pop");
        if (ev.key === "Escape" && pop && !pop.hidden) {
          ev.stopImmediatePropagation(); ev.preventDefault(); window.__kbEscUsed = true;
          if (card) { card = null; renderCard(); } else { close(); }
        }
      }, true);
      document.addEventListener("click", () => { /* bấm ngoài bảng không đóng (bảng có nút ✕ / Esc) */ });
      window.addEventListener("resize", () => { const pop = $("kb-le-pop"); if (pop && !pop.hidden) { drawCabinet(Date.now()); } });
    },
    render: renderData,
    result: result,
    open: open, show: open, close: close, toggle: toggle,
    isOpen: () => { const p = $("kb-le-pop"); return !!(p && !p.hidden); },
    canOpen: () => { const v = le(); return !!(v && v.doors); },      // có tủ lịch để xem (cả sau mùa — tủ lịch kỷ niệm)
    active: active, still: still, parts: parts, has: has,
    // 1.36.1: bánh quy đã ăn (từ 18:00 ngày 24 tới lúc cất đồ 1/1)
    eaten: () => { const v = le(); return !!(v && v.eaten && v.phase !== "done"); },
    crumbs: () => (A() ? A().EATEN : null),
    treeSprite: treeSprite, treeLit: treeLit, openedSet: openedSet, drawTreeExtra: drawTreeExtra,
    drawHouse: drawHouse, drawLights: drawLights,
    // cho test
    _cell: cell, _cab: CAB, _yardLights: yardLights, _doorTip: doorTip, _note: noteText, _hints: hints,
    _clickDoor: clickDoor, _S: () => S
  };
})();
