/* Ảnh phác 1.25 — nhà 3 gian cùng phong cách theo kiểu nhà (chạy trong trang vườn, dùng hàm vẽ thật qua GardenHome._lib()).
   Mock125.strip(canvas, opts): vẽ dải "Trong nhà" kín bề ngang, ba gian đặt tránh thẻ Hôm nay.
   opts: { style, deco, locked, avail (px CSS phần không bị thẻ che), cw, ch, items } */
var Mock125 = (function () {
  "use strict";
  const L = GardenHome._lib();
  const { P, T, ROOM, box, drawItem, drawNight, skyColors, skyNow, timeOfDay, lights, SEA, drawWeather } = L;
  const W = { kitchen: 144, room: 160, bedroom: 144 };
  const X = { kitchen: 0, room: 148, bedroom: 312 };
  const WIN = { kitchen: 48, room: 64, bedroom: 64 };       // ô bắt đầu cửa sổ: Bếp cột 3–4, phòng chính 4–5, Phòng ngủ 4–5
  const FLOOR = ROOM.FLOOR, H = ROOM.H;

  const STY = {
    classic: { wall: ["#ffe3cf", "#ffd6ba"], beam: P.B, base: P.b, post: P.B, ceil: ["#7a4a2a", "#6b3f22"], floor: "wood", fl: ["#e2a46a", "#c98a52"], win: "glass" },
    minka: { wall: ["#f1e2c2", "#e7d6b2"], beam: "#4a2c18", base: "#4a2c18", post: "#4a2c18", ceil: ["#3a2414", "#2f1d10"], floor: "tatami", win: "shoji", rail: 30 },
    teahouse: { wall: ["#efdfbe", "#e8d6b0"], beam: P.b, base: P.b, post: "#8a5a34", ceil: ["#9a6a40", "#8a5c36"], floor: "tatami", win: "round" },
    castle: { wall: ["#f7f3ea", "#efe8d8"], beam: P.n, base: P.n, post: P.n, ceil: ["#2b2b44", "#23233a"], floor: "wood", fl: ["#8a5a34", "#6b4226"], win: "shojiDark", gold: 7 },
  };
  const R = (ctx, S, ox, oy, x, y, w, h, c) => box(ctx, ox + x, oy + y, w, h, c, S);

  // ---- sàn (vẽ trong [x0, x1) theo toạ độ của gian, liền mạch khi kéo dài)
  function floor(ctx, S, ox, oy, kind, st, x0, x1, y1) {
    let f = st.floor;
    if (kind === "kitchen") { f = { classic: "wood", minka: "doma", teahouse: "pine", castle: "stone" }[st.name]; }
    const w = x1 - x0, h = y1 - FLOOR;
    if (f === "tatami") {
      R(ctx, S, ox, oy, x0, FLOOR, w, h, "#cfc88a");
      for (let y = FLOOR, r = 0; y < y1; y += 16, r++) {
        for (let x = Math.floor(x0 / 32) * 32 - 32 + (r % 2) * 16; x < x1; x += 32) {
          const a = Math.max(x0, x), b = Math.min(x1, x + 32);
          if (b > a) { R(ctx, S, ox, oy, a, y, b - a, 1, "#3f5f2a"); }
          if (x >= x0 && x < x1) { R(ctx, S, ox, oy, x, y, 1, Math.min(16, y1 - y), "#8f8a4a"); }
        }
        for (let x = Math.ceil(x0 / 6) * 6 + 3; x < x1; x += 6) { if (y + 5 < y1) { R(ctx, S, ox, oy, x, y + 5 + (Math.abs(x) % 4), 2, 1, "#bdb576"); } }
      }
    } else if (f === "doma") {            // sàn đất nện + bậc gỗ agari
      R(ctx, S, ox, oy, x0, FLOOR, w, h, "#a8865e");
      for (let i = 0; i < w * h / 40; i++) {
        const x = x0 + ((i * 37) % w), y = FLOOR + 4 + ((i * 53) % Math.max(1, h - 4));
        R(ctx, S, ox, oy, x, y, 1, 1, i % 3 ? "#8f6f4b" : "#c0a079");
      }
      R(ctx, S, ox, oy, x0, FLOOR, w, 3, "#6b3b1f"); R(ctx, S, ox, oy, x0, FLOOR + 3, w, 1, "#4a2c18");
    } else if (f === "stone") {
      R(ctx, S, ox, oy, x0, FLOOR, w, h, "#b4b6c4");
      for (let y = FLOOR, k = 0; y < y1; y += 12, k++) {
        R(ctx, S, ox, oy, x0, y, w, 1, "#8a8fa8");
        for (let x = Math.floor(x0 / 16) * 16 + (k % 2) * 8; x < x1; x += 16) { if (x >= x0) { R(ctx, S, ox, oy, x, y, 1, Math.min(12, y1 - y), "#8a8fa8"); } }
      }
    } else {
      const fl = f === "pine" ? ["#e8c98f", "#d4b070"] : st.fl;
      R(ctx, S, ox, oy, x0, FLOOR, w, h, fl[0]);
      for (let y = FLOOR + 5; y < y1; y += 6) { R(ctx, S, ox, oy, x0, y, w, 1, fl[1]); }
      for (let y = FLOOR, k = 0; y < y1; y += 6, k++) {
        for (let x = Math.floor(x0 / 24) * 24 + (k % 2) * 12; x < x1; x += 24) { if (x >= x0) { R(ctx, S, ox, oy, x, y, 1, Math.min(5, y1 - y), fl[1]); } }
      }
    }
  }
  // ---- cửa sổ cùng kiểu cho cả ba gian
  function windowAt(ctx, S, ox, oy, kind, st, now) {
    const x0 = WIN[kind], tod = timeOfDay(), sky = skyColors(tod), stR = skyNow();
    const curtain = kind === "bedroom" && st.name === "classic" ? "#c9a7e8" : P.p;
    if (st.win === "round") { ctx.save(); ctx.beginPath(); ctx.arc((ox + x0 + 16) * S, (oy + 21) * S, 12 * S, 0, Math.PI * 2); ctx.clip(); }
    R(ctx, S, ox, oy, x0 + 2, 9, 28, 24, P.k); R(ctx, S, ox, oy, x0 + 3, 10, 26, 22, sky[1]); R(ctx, S, ox, oy, x0 + 3, 10, 26, 10, sky[0]);
    if (tod === "night") { R(ctx, S, ox, oy, x0 + 20, 12, 4, 4, "#fff6c8"); } else if (!stR || !stR.rain) { R(ctx, S, ox, oy, x0 + 6, 22, 8, 2, P.w); }
    if (stR && (stR.rain || stR.snow)) {
      ctx.save(); ctx.beginPath(); ctx.rect((ox + x0 + 3) * S, (oy + 10) * S, 26 * S, 22 * S); ctx.clip();
      drawWeather(ctx, S, ox, oy + 10, now, x0 + 3, x0 + 29, 22, Object.assign({}, stR, { flash: 0 })); ctx.restore();
    }
    if (st.win === "glass") {
      R(ctx, S, ox, oy, x0 + 15, 10, 2, 22, P.w); R(ctx, S, ox, oy, x0 + 3, 20, 26, 2, P.w);
      R(ctx, S, ox, oy, x0, 8, 5, 27, curtain); R(ctx, S, ox, oy, x0 + 27, 8, 5, 27, curtain);
      if (kind === "bedroom") { R(ctx, S, ox, oy, x0 + 1, 8, 3, 27, "#b48fd6"); R(ctx, S, ox, oy, x0 + 28, 8, 3, 27, "#b48fd6"); }
      R(ctx, S, ox, oy, x0 - 1, 7, 34, 2, P.B);
    } else if (st.win === "round") {
      R(ctx, S, ox, oy, x0 + 15, 9, 2, 24, P.b); R(ctx, S, ox, oy, x0 + 2, 20, 28, 2, P.b);
      R(ctx, S, ox, oy, x0 + 8, 9, 1, 24, P.b); R(ctx, S, ox, oy, x0 + 23, 9, 1, 24, P.b);
      ctx.restore();
      ctx.strokeStyle = P.B; ctx.lineWidth = 2 * S; ctx.beginPath(); ctx.arc((ox + x0 + 16) * S, (oy + 21) * S, 12 * S, 0, Math.PI * 2); ctx.stroke();
    } else {
      const fr = st.win === "shojiDark" ? P.n : P.B;
      for (let x = x0 + 3; x < x0 + 29; x += 6) { R(ctx, S, ox, oy, x, 10, 1, 22, P.w); }
      for (let y = 10; y < 32; y += 7) { R(ctx, S, ox, oy, x0 + 3, y, 26, 1, P.w); }
      R(ctx, S, ox, oy, x0 - 1, 7, 34, 2, fr); R(ctx, S, ox, oy, x0 - 1, 33, 34, 2, fr);
    }
    if (kind === "bedroom" && st.name === "minka") {      // rèm noren chàm
      R(ctx, S, ox, oy, x0 - 1, 9, 34, 9, "#2f4f7f"); R(ctx, S, ox, oy, x0 + 10, 9, 1, 9, "#1f3557"); R(ctx, S, ox, oy, x0 + 21, 9, 1, 9, "#1f3557");
      R(ctx, S, ox, oy, x0 + 14, 11, 4, 4, "#f4f0e6");
    }
  }
  // ---- nền một gian, trong [x0, x1) (x0 < 0 / x1 > W: phần kéo dài, không cửa sổ / điểm nhấn riêng)
  function roomBg(ctx, S, ox, oy, kind, st, x0, x1, y0, y1, now) {
    const w = x1 - x0;
    if (y0 < 0) {                                          // trần (phần kéo dài phía trên)
      R(ctx, S, ox, oy, x0, y0, w, -y0, st.ceil[0]);
      for (let y = -6; y > y0; y -= 6) { R(ctx, S, ox, oy, x0, y, w, 1, st.ceil[1]); }
    }
    R(ctx, S, ox, oy, x0, 0, w, FLOOR, st.wall[0]);
    for (let x = Math.ceil(x0 / 8) * 8 + 4; x < x1; x += 8) { R(ctx, S, ox, oy, x, 6, 2, FLOOR - 9, st.wall[1]); }
    if (st.rail) { R(ctx, S, ox, oy, x0, st.rail, w, 2, st.beam); }
    if (st.gold) { R(ctx, S, ox, oy, x0, st.gold, w, 1, P.i); }
    // điểm nhấn trên tường
    if (kind === "kitchen" && st.name === "classic") {      // dải gạch men sau chỗ nấu (kéo dài cùng)
      R(ctx, S, ox, oy, x0, 22, w, 15, "#f4f8fb"); R(ctx, S, ox, oy, x0, 21, w, 1, "#8fb8d8");
      for (let y = 26; y < 37; y += 5) { R(ctx, S, ox, oy, x0, y, w, 1, "#cfdbe6"); }
      for (let y = 22, k = 0; y < 37; y += 5, k++) { for (let x = Math.floor(x0 / 8) * 8 + (k % 2) * 4; x < x1; x += 8) { if (x >= x0) { R(ctx, S, ox, oy, x, y, 1, 4, "#cfdbe6"); } } }
    }
    if (kind === "kitchen" && st.name === "minka") { R(ctx, S, ox, oy, x0, 30, w, 7, "#c9a77a"); for (let x = Math.ceil(x0 / 6) * 6; x < x1; x += 6) { R(ctx, S, ox, oy, x, 30, 1, 7, "#a8865e"); } }
    if (kind === "bedroom" && st.name === "classic") {     // viền giấy dán tường hoa nhỏ
      R(ctx, S, ox, oy, x0, 24, w, 3, "#f6c3d6");
      for (let x = Math.ceil(x0 / 6) * 6; x < x1; x += 6) { R(ctx, S, ox, oy, x, 25, 1, 1, "#e0679a"); }
    }
    if (kind === "bedroom" && st.name === "castle") { R(ctx, S, ox, oy, x0, 26, w, 11, "#efe2c6"); R(ctx, S, ox, oy, x0, 26, w, 1, P.i); }
    // xà trên, chân tường
    R(ctx, S, ox, oy, x0, 0, w, 5, st.beam); R(ctx, S, ox, oy, x0, 5, w, 1, P.k);
    R(ctx, S, ox, oy, x0, FLOOR - 3, w, 3, st.base); R(ctx, S, ox, oy, x0, FLOOR - 1, w, 1, P.k);
    floor(ctx, S, ox, oy, kind, st, x0, x1, y1);
    // điểm nhấn trong phạm vi gian
    const W0 = W[kind];
    if (kind === "kitchen" && st.name === "teahouse") {      // kệ tre (vẽ ở nền)
      [7, 38].forEach((x) => { R(ctx, S, ox, oy, x, 9, 2, 22, "#8faf4a"); R(ctx, S, ox, oy, x, 15, 2, 1, "#5f7f2a"); R(ctx, S, ox, oy, x, 24, 2, 1, "#5f7f2a"); });
      [17, 27].forEach((y) => { R(ctx, S, ox, oy, 5, y, 37, 2, "#a9c862"); R(ctx, S, ox, oy, 5, y + 2, 37, 1, "#6f8f3a"); });
      R(ctx, S, ox, oy, 11, 12, 5, 5, "#2b2018"); R(ctx, S, ox, oy, 12, 11, 3, 1, "#2b2018"); R(ctx, S, ox, oy, 12, 13, 1, 1, "#6b5a48");   // hộp trà natsume
      R(ctx, S, ox, oy, 20, 14, 5, 3, "#e8e0d0"); R(ctx, S, ox, oy, 20, 14, 5, 1, "#7a9a4a");                                        // chén trà
      R(ctx, S, ox, oy, 29, 13, 4, 4, "#c06a3a"); R(ctx, S, ox, oy, 30, 12, 2, 1, "#c06a3a");                                        // lọ
      R(ctx, S, ox, oy, 12, 23, 9, 4, "#6f5f8f"); R(ctx, S, ox, oy, 12, 23, 9, 1, "#9f8fbf");                                        // bát
      R(ctx, S, ox, oy, 25, 22, 3, 5, "#e8e0d0"); R(ctx, S, ox, oy, 30, 22, 3, 5, "#e8e0d0"); R(ctx, S, ox, oy, 25, 24, 8, 1, "#9fbf5a");
    }
    if (kind === "bedroom" && st.name === "teahouse") {      // hốc tokonoma
      R(ctx, S, ox, oy, 108, 7, 32, 30, "#8a5a34"); R(ctx, S, ox, oy, 110, 9, 28, 25, "#d6c296"); R(ctx, S, ox, oy, 110, 9, 28, 2, "#bfa979");
      R(ctx, S, ox, oy, 109, 34, 30, 3, "#5a3420"); R(ctx, S, ox, oy, 109, 34, 30, 1, "#7a4a2a");                                    // bậc gỗ
      R(ctx, S, ox, oy, 119, 10, 10, 2, "#5a3420"); R(ctx, S, ox, oy, 120, 12, 8, 17, "#f6f0e0"); R(ctx, S, ox, oy, 119, 29, 10, 2, "#5a3420");  // tranh cuộn
      R(ctx, S, ox, oy, 123, 14, 2, 6, "#2b2b2b"); R(ctx, S, ox, oy, 122, 20, 3, 2, "#2b2b2b"); R(ctx, S, ox, oy, 124, 23, 1, 3, "#c0392b");
      R(ctx, S, ox, oy, 131, 30, 4, 4, "#6f8faf"); R(ctx, S, ox, oy, 132, 26, 1, 4, "#4f7f3a"); R(ctx, S, ox, oy, 131, 25, 3, 2, "#ff8fb0");      // bình hoa
    }
    if (kind === "bedroom" && st.name === "castle") {        // thảm đỏ viền vàng ở sàn
      R(ctx, S, ox, oy, 8, 46, W0 - 16, 38, P.i); R(ctx, S, ox, oy, 10, 48, W0 - 20, 34, "#a3243b");
    }
    windowAt(ctx, S, ox, oy, kind, st, now);
  }
  // biển hai dòng: tên gian + giá chung (hai gian bên giống hệt nhau, bấm bên nào cũng là một lần mở)
  function lockedLabel(ctx, S, x, y, lines) {
    const fs = Math.max(7, 6 * S), lh = fs + 3 * S;
    ctx.font = fs + "px \"DotGothic16\", \"Noto Sans\", monospace";
    const tw = Math.max(...lines.map((t) => ctx.measureText(t).width)) + 10 * S, th = lh * lines.length + 3 * S;
    ctx.fillStyle = "#1b1b2f"; ctx.fillRect(Math.round(x - tw / 2 - S), Math.round(y - S), Math.round(tw + 2 * S), Math.round(th + 2 * S));
    ctx.fillStyle = "#ffd23f"; ctx.fillRect(Math.round(x - tw / 2), Math.round(y), Math.round(tw), Math.round(th));
    ctx.textBaseline = "middle"; ctx.textAlign = "center";
    lines.forEach((t, i) => {
      ctx.fillStyle = i ? "#6b3b1f" : "#1b1b2f";
      ctx.font = (i ? "" : "bold ") + fs + "px \"DotGothic16\", \"Noto Sans\", monospace";
      ctx.fillText(t, Math.round(x), Math.round(y + 2 * S + lh * i + lh / 2));
    });
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  const ITEMS = {
    room: [["ukiyoe", 1, 0], ["clock", 7, 0], ["shelf", 0, 1], ["aquarium", 8, 1], ["plant", 6, 2], ["rug", 3, 3], ["kotatsu", 3, 3], ["andon", 9, 3], ["cat", 6, 3]],
    kitchen: [["shokkidana", 6, 0], ["reizouko", 0, 1], ["nagashi", 1, 1], ["suihanki", 7, 1], ["shokutaku", 3, 3], ["yasaikago", 7, 3]],
    bedroom: [["hoshizora", 1, 0], ["tansu", 0, 1], ["kyodai", 6, 1], ["beddo", 2, 3], ["nightlamp", 1, 3], ["dakimakura", 6, 3]],
  };
  // vẽ cả nhà ở (ox, oy) theo toạ độ nghệ thuật; extL / extR / extT / extB: phần kéo dài (điểm ảnh nghệ thuật)
  function house(ctx, S, ox, oy, o) {
    const now = Date.now(), tod = timeOfDay(), stR = skyNow();
    const st = Object.assign({ name: o.style }, STY[o.style]);
    const extL = o.extL || 0, extR = o.extR || 0, extT = o.extT || 0, extB = o.extB || 0;
    lights.length = 0;
    ["kitchen", "room", "bedroom"].forEach((k) => {
      const x = X[k];
      const x0 = k === "kitchen" ? -extL : 0, x1 = W[k] + (k === "bedroom" ? extR : 0);
      roomBg(ctx, S, ox + x, oy, k, st, x0, x1, -extT, H + extB, now);
      const lit = k === "room" || !o.locked;
      if (lit && o.items !== false) {
        const L0 = lights.length;
        ITEMS[k].forEach(([id, ix, iy]) => drawItem(ctx, S, ox + x, oy, { id: id, x: ix, y: iy }, k, now, tod));
        for (let i = L0; i < lights.length; i++) { lights[i].x += x; }
      }
    });
    [144, 308].forEach((x) => {
      R(ctx, S, ox, oy, x, -extT, 4, H + extT + extB, st.post); R(ctx, S, ox, oy, x + 1, 6, 1, H - 6, P.b);
      R(ctx, S, ox, oy, x, -extT, 1, H + extT + extB, P.k); R(ctx, S, ox, oy, x + 3, -extT, 1, H + extT + extB, P.k);
    });
    if (o.deco && SEA()) { SEA().room(ctx, S, ox - extL, oy, now, 456 + extL + extR, 0, stR); }
    if (stR) {
      lights.forEach((l) => { l.x += extL; l.y += extT; });
      drawNight(ctx, S, ox - extL, oy - extT, 0, 456 + extL + extR, H + extT + extB, Object.assign({}, stR, { light: 0.08 + stR.light * 0.8 }));
      if (o.deco && SEA()) { SEA().room(ctx, S, ox - extL, oy, now, 456 + extL + extR, 1, stR); }
    }
    if (o.locked) {
      ctx.globalAlpha = 0.74;
      R(ctx, S, ox, oy, -extL, -extT, 144 + extL, H + extT + extB, "#1b1b2f");
      R(ctx, S, ox, oy, 312, -extT, 144 + extR, H + extT + extB, "#1b1b2f");
      ctx.globalAlpha = 1;
      lockedLabel(ctx, S, (ox + 72) * S, (oy + 44) * S, ["Bếp", "Mở rộng nhà: cả 2 gian · 2.000 xu"]);
      lockedLabel(ctx, S, (ox + 384) * S, (oy + 44) * S, ["Phòng ngủ", "Mở rộng nhà: cả 2 gian · 2.000 xu"]);
    }
    lights.length = 0;
  }
  // dải "Trong nhà" ở màn chính: cw × ch (px CSS), avail = bề ngang không bị thẻ Hôm nay che
  function strip(canvas, o) {
    const dpr = window.devicePixelRatio || 1, cw = o.cw, ch = o.ch;
    canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
    canvas.style.width = cw + "px"; canvas.style.height = ch + "px";
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    const S = Math.max(2, Math.min(o.maxS || 4, Math.floor(o.avail / 456)));
    const vis = ch / S, hx = Math.max(0, Math.floor((o.avail / S - 456) / 2)), hy = Math.floor(vis - H);
    house(ctx, S, hx, Math.max(hy, -12), Object.assign({}, o, {
      extL: hx + 1, extR: Math.ceil(cw / S) - 456 - hx + 1, extT: Math.max(0, hy) + 1, extB: 1 }));
    return { S: S, hx: hx, hy: hy };
  }
  return { strip: strip, house: house, STY: STY };
})();
