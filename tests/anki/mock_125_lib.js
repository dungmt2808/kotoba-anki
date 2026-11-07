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
    if (kind === "bedroom" && st.name === "minka" && !st.sideWin) {      // không cửa sổ: cửa lùa fusuma vẽ sóng chàm
      R(ctx, S, ox, oy, 52, 8, 42, 29, "#4a2c18"); R(ctx, S, ox, oy, 54, 10, 18, 25, "#f4ecd8"); R(ctx, S, ox, oy, 74, 10, 18, 25, "#f4ecd8");
      [[56, 26], [62, 23], [68, 27], [76, 24], [82, 27], [88, 25]].forEach(([x, y]) => { R(ctx, S, ox, oy, x - 2, y, 5, 2, "#2f4f7f"); R(ctx, S, ox, oy, x - 1, y - 1, 3, 1, "#5f7faf"); });
      R(ctx, S, ox, oy, 69, 21, 2, 3, "#4a2c18"); R(ctx, S, ox, oy, 75, 21, 2, 3, "#4a2c18");
    }
    if (kind === "room" || st.sideWin) { windowAt(ctx, S, ox, oy, kind, st, now); }
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
    const st = Object.assign({ name: o.style, sideWin: o.sideWin !== false }, STY[o.style]);
    const extL = o.extL || 0, extR = o.extR || 0, extT = o.extT || 0, extB = o.extB || 0;
    lights.length = 0;
    ["kitchen", "room", "bedroom"].forEach((k) => {
      const x = X[k];
      const x0 = k === "kitchen" ? -extL : 0, x1 = W[k] + (k === "bedroom" ? extR : 0);
      if (o.v2) { roomBg2(ctx, S, ox + x, oy, k, o.style, now); } else { roomBg(ctx, S, ox + x, oy, k, st, x0, x1, -extT, H + extB, now); }
      const lit = k === "room" || !o.locked;
      if (lit && o.items !== false) {
        const L0 = lights.length;
        ITEMS[k].forEach(([id, ix, iy]) => drawItem(ctx, S, ox + x, oy, { id: id, x: ix, y: iy }, k, now, tod));
        for (let i = L0; i < lights.length; i++) { lights[i].x += x; }
      }
    });
    if (o.v2) { [144, 308].forEach((x) => post2(ctx, S, ox, oy, x, -extT, H + extT + extB, o.style)); }
    else [144, 308].forEach((x) => {
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

  // ================= Bố cục khác (07/11, sau góp ý "vừa đối xứng vừa bất đối xứng") =================
  const ROOF = {
    classic: { a: P.r, b: P.R, edge: P.k, board: P.B },
    minka: { a: P.h, b: P.t, edge: "#7a5a2a", board: P.B },
    teahouse: { a: P.m, b: P.S, edge: P.n, board: P.b },
    castle: { a: P.m, b: P.n, edge: P.k, board: P.n },
  };
  const mix = (a, b, t) => (typeof GardenSky !== "undefined" && GardenSky.mix ? GardenSky.mix(a, b, t) : a);
  function outdoorSt() {
    return skyNow() || { top: "#8fd3ff", bottom: "#c4ecff", light: 1, clouds: 2, tod: "day", ground: "#5ed35e", grass: "#45bf4a", hills: "#7ed98a" };
  }
  // vườn ngoài nhà trong [x0, x1) × [y0, y1), chân trời ở hz (toạ độ nghệ thuật, gốc ox / oy)
  function garden(ctx, S, ox, oy, x0, x1, y0, y1, hz, side) {
    const st = outdoorSt(), w = x1 - x0, now = Date.now();
    if (w <= 0) { return; }
    const bands = 7;
    for (let b = 0; b < bands; b++) {
      const a = y0 + Math.floor((hz - y0) * b / bands), c = y0 + Math.floor((hz - y0) * (b + 1) / bands);
      R(ctx, S, ox, oy, x0, a, w, c - a, mix(st.top, st.bottom, b / (bands - 1)));
    }
    if (st.light >= 0.6) {                                     // mây
      const cx = side < 0 ? x0 + Math.floor(w * 0.35) : x0 + Math.floor(w * 0.55), cy = y0 + Math.max(3, Math.floor((hz - y0) * 0.3));
      [[0, 2, 14, 3], [3, 0, 7, 2], [-3, 3, 4, 2]].forEach(([dx, dy, ww, hh]) => R(ctx, S, ox, oy, cx + dx, cy + dy, ww, hh, "#ffffff"));
    } else {                                                   // sao
      for (let i = 0; i < w / 6; i++) { R(ctx, S, ox, oy, x0 + ((i * 37 + 5) % w), y0 + ((i * 23 + 3) % Math.max(4, hz - y0 - 8)), 1, 1, i % 3 ? "#ffffff" : "#ffe9a8"); }
    }
    ctx.fillStyle = st.hills;
    for (let i = x0; i < x1; i++) { const hh = 5 + Math.round(3 * Math.sin(i / 17) + 2 * Math.sin(i / 7)); ctx.fillRect((ox + i) * S, (oy + hz - hh) * S, S, hh * S); }
    if (SEA()) { try { SEA().decorHills(ctx, S, ox, oy, x0, x1, hz, st); } catch (e) { /* bỏ qua */ } }
    R(ctx, S, ox, oy, x0, hz, w, y1 - hz, st.ground);
    for (let i = Math.floor(x0 / 11) * 11 + 3; i < x1; i += 11) { if (i >= x0) { R(ctx, S, ox, oy, i, hz + 3 + (Math.abs(i) * 7) % Math.max(1, y1 - hz - 4), 1, 1, st.grass); } }
    if (SEA()) { try { SEA().decorGround(ctx, S, ox, oy, x0, x1, hz, y1, st); } catch (e) { /* bỏ qua */ } }
    // bụi cây + hoa sát tường nhà
    const bx = side < 0 ? x1 - 16 : x0 + 3, by = hz + 6;
    if (bx >= x0 && bx + 13 <= x1) {
      R(ctx, S, ox, oy, bx + 1, by + 3, 12, 6, P.k); R(ctx, S, ox, oy, bx + 2, by + 1, 10, 7, P.G); R(ctx, S, ox, oy, bx + 3, by, 8, 6, P.g);
      R(ctx, S, ox, oy, bx + 4, by + 2, 1, 1, P.p); R(ctx, S, ox, oy, bx + 8, by + 1, 1, 1, P.y); R(ctx, S, ox, oy, bx + 6, by + 4, 1, 1, P.w);
    }
    const fx = side < 0 ? x1 - 30 : x0 + 22;
    if (fx >= x0 && fx + 10 <= x1) { [0, 4, 8].forEach((d, i) => { R(ctx, S, ox, oy, fx + d, by + 6, 1, 4, P.G); R(ctx, S, ox, oy, fx + d - 1, by + 5, 3, 2, [P.p, P.y, P.r][i]); }); }
    // đêm: tối theo trời ngoài (không có đèn trong nhà)
    const keep = lights.splice(0);
    const stN = Object.assign({}, st);
    if (stN.light < 0.6) { drawNight(ctx, S, ox, oy, x0, x1, y1 - 0, stN); }
    lights.push(...keep);
  }
  // mái hiên phía trên trần (cắt ngang), kín bề ngang nhà + chìa ra hai bên
  function eave(ctx, S, ox, oy, x0, x1, top, style) {
    const r = ROOF[style] || ROOF.classic, h = -top;
    if (h <= 0) { return; }
    for (let y = top; y < -2; y++) {
      const k = y - top;
      R(ctx, S, ox, oy, x0, y, x1 - x0, 1, (Math.floor(k / 3) % 2) ? r.b : r.a);
      if (k % 3 === 2) { for (let x = x0 + ((Math.floor(k / 3) % 2) * 4); x < x1; x += 8) { R(ctx, S, ox, oy, x, y, 1, 1, r.edge); } }
    }
    R(ctx, S, ox, oy, x0, -3, x1 - x0, 2, r.board); R(ctx, S, ox, oy, x0, -1, x1 - x0, 1, P.k);
  }
  // mái đầy đủ (nhà búp bê): hình thang từ yE (mái hiên) lên yR (nóc)
  function fullRoof(ctx, S, ox, oy, x0, x1, yR, yE, style, night) {
    const r = ROOF[style] || ROOF.classic, W0 = x1 - x0, inset = Math.floor(W0 * 0.16);
    for (let y = yR; y <= yE; y++) {
      const t = (y - yR) / Math.max(1, yE - yR), a = x0 + Math.round(inset * (1 - t)), b = x1 - Math.round(inset * (1 - t));
      R(ctx, S, ox, oy, a - 1, y, b - a + 2, 1, P.k);
      R(ctx, S, ox, oy, a, y, b - a, 1, (Math.floor((y - yR) / 3) % 2) ? r.b : r.a);
      if ((y - yR) % 3 === 2) { for (let x = a + ((Math.floor((y - yR) / 3) % 2) * 4); x < b; x += 8) { R(ctx, S, ox, oy, x, y, 1, 1, r.edge); } }
    }
    R(ctx, S, ox, oy, x0 + inset - 2, yR - 3, W0 - 2 * inset + 4, 3, P.k); R(ctx, S, ox, oy, x0 + inset - 1, yR - 2, W0 - 2 * inset + 2, 1, r.board);
    R(ctx, S, ox, oy, x0, yE - 1, W0, 2, r.board); R(ctx, S, ox, oy, x0, yE + 1, W0, 1, P.k);
    const cx = Math.floor((x0 + x1) / 2), cy = Math.floor((yR + yE) / 2);            // cửa sổ áp mái
    R(ctx, S, ox, oy, cx - 6, cy - 5, 12, 11, P.k); R(ctx, S, ox, oy, cx - 5, cy - 4, 10, 9, night ? P.y : P.l);
    R(ctx, S, ox, oy, cx, cy - 4, 1, 9, P.k); R(ctx, S, ox, oy, cx - 5, cy, 10, 1, P.k);
    if (style === "classic") {                                                       // ống khói phía Bếp
      const hx = x0 + inset + 26; R(ctx, S, ox, oy, hx, yR - 12, 10, 14, P.k); R(ctx, S, ox, oy, hx + 1, yR - 11, 8, 13, P.R);
      for (let y = yR - 9; y < yR + 1; y += 3) { R(ctx, S, ox, oy, hx + 1, y, 8, 1, P.r); }
      R(ctx, S, ox, oy, hx - 1, yR - 14, 12, 3, P.k); R(ctx, S, ox, oy, hx, yR - 13, 10, 1, P.S);
    }
  }
  function outerWalls(ctx, S, ox, oy, y0, y1, style, v2) {
    if (v2) { [-4, 456].forEach((x) => post2(ctx, S, ox, oy, x, y0, y1, style)); return; }
    const c = STY[style].post;
    [-4, 456].forEach((x) => { R(ctx, S, ox, oy, x, y0, 4, y1 - y0, c); R(ctx, S, ox, oy, x, y0, 1, y1 - y0, P.k); R(ctx, S, ox, oy, x + 3, y0, 1, y1 - y0, P.k); });
  }
  function canvasSetup(canvas, o) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(o.cw * dpr); canvas.height = Math.round(o.ch * dpr);
    canvas.style.width = o.cw + "px"; canvas.style.height = o.ch + "px";
    const ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    return ctx;
  }
  // Phương án A: như 1.24 (nhà giữa dải, cỡ theo chiều cao), hai bên là vườn, mái hiên phía trên
  function stripA(canvas, o) {
    const ctx = canvasSetup(canvas, o);
    const S = Math.max(2, Math.min(o.maxS || 4, Math.floor(o.ch / H), Math.floor(o.cw / 466)));
    const VW = Math.ceil(o.cw / S), VH = Math.ceil(o.ch / S);
    const hx = Math.floor((VW - 456) / 2), hy = VH - H;            // hy < 0: cắt bớt trần như 1.24
    const top = -Math.max(0, hy);
    garden(ctx, S, hx, Math.max(hy, 0) + Math.min(hy, 0), -hx - 1, -4, top - 1, H + 1, FLOOR, -1);
    garden(ctx, S, hx, Math.max(hy, 0) + Math.min(hy, 0), 460, VW - hx + 1, top - 1, H + 1, FLOOR, 1);
    const oy = hy;
    house(ctx, S, hx, oy, Object.assign({}, o, { sideWin: o.sideWin === true, extL: 0, extR: 0, extT: 0, extB: 1 }));
    outerWalls(ctx, S, hx, oy, Math.min(0, top), H + 1, o.style, o.v2);
    if (hy > 0) { eave(ctx, S, hx, oy, -12, 468, top, o.style); }
    return { S: S, hx: hx, hy: hy };
  }
  // Phương án B: nhà búp bê — cả nhà có mái, nhỏ hơn (×2 ở 1920), vườn quanh nhà
  function stripB(canvas, o) {
    const ctx = canvasSetup(canvas, o);
    const S = Math.max(1, Math.min(o.maxS || 4, Math.floor(o.ch / 140), Math.floor(o.cw / 520)));
    const VW = Math.ceil(o.cw / S), VH = Math.ceil(o.ch / S);
    const hx = Math.floor((VW - 456) / 2), oy = VH - 6 - H, hz = VH - 26;
    garden(ctx, S, 0, 0, -1, VW + 1, -1, VH + 1, hz, -1);
    // bụi cây hai bên nhà
    const night = (outdoorSt().light < 0.6);
    fullRoof(ctx, S, hx, oy, -14, 470, -Math.min(44, oy - 8), -1, o.style, night);
    house(ctx, S, hx, oy, Object.assign({}, o, { sideWin: o.sideWin === true, extL: 0, extR: 0, extT: 0, extB: 0 }));
    outerWalls(ctx, S, hx, oy, 0, H, o.style, o.v2);
    R(ctx, S, hx, oy, -6, H, 468, 6, P.k); R(ctx, S, hx, oy, -5, H + 1, 466, 4, P.S); R(ctx, S, hx, oy, -5, H + 1, 466, 1, P.s);   // móng đá
    return { S: S, hx: hx, oy: oy };
  }

  // ================= Nội thất v2 (07/11 lượt 3: "thiết kế lại giao diện bên trong từng ngôi nhà đẹp hơn") =================
  // Mỗi kiểu nhà: xà + tường có lớp (giấy dán / đất trát / vữa trắng) + nẹp / ốp chân tường + sàn có vân, bóng đổ dưới xà
  // và ở mép sàn, vệt nắng từ cửa sổ. Hai gian bên đổi một điểm nhấn.
  const hexA = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
  const mixc = (a, b, t) => "#" + hexA(a).map((v, i) => Math.max(0, Math.min(255, Math.round(v + (hexA(b)[i] - v) * t))).toString(16).padStart(2, "0")).join("");
  const dk = (c, t) => mixc(c, "#000000", t), lt = (c, t) => mixc(c, "#ffffff", t);
  function hs(x, y, s) { let h = (x * 374761393 + y * 668265263 + (s || 0) * 1442695041) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) % 1000 / 1000; }

  function woodFloor(c, x0, x1, pal, rowH) {
    for (let y = FLOOR, r = 0; y < H; y += rowH, r++) {
      const h = Math.min(rowH, H - y);
      let x = Math.floor(x0 / 40) * 40 - 40 + Math.floor(hs(r, 7) * 30);
      while (x < x1) {
        const L = 22 + Math.floor(hs(x, r, 3) * 22), a = Math.max(x0, x), b = Math.min(x1, x + L);
        if (b > a) {
          const tone = pal.fl[Math.floor(hs(x, r, 5) * pal.fl.length)];
          c(a, y, b - a, h, tone); c(a, y, b - a, 1, lt(tone, 0.16));
          for (let k = 0; k < 3; k++) { const gx = x + 3 + Math.floor(hs(x, r, 11 + k) * Math.max(1, L - 9)); const gy = y + 1 + ((k + r) % Math.max(1, h - 2)); if (gx >= a && gx + 5 <= b && gy < y + h - 1) { c(gx, gy, 5, 1, dk(tone, 0.07)); } }
          if (x >= x0) { c(x, y, 1, h, pal.ln); }
        }
        x += L;
      }
      c(x0, y + h - 1, x1 - x0, 1, pal.ln);
    }
  }
  function tatami(c, x0, x1, pal) {
    for (let y = FLOOR, r = 0; y < H; y += 16, r++) {
      for (let x = Math.floor(x0 / 32) * 32 - 32 + (r % 2) * 16; x < x1; x += 32) {
        const a = Math.max(x0, x), b = Math.min(x1, x + 32); if (b <= a) { continue; }
        const m = mixc(pal.mat, pal.mat2, hs(x, r, 2) * 0.8);
        c(a, y, b - a, 16, m);
        for (let yy = y + 3; yy < y + 16; yy += 2) { c(a, yy, b - a, 1, dk(m, 0.05)); }
        if (x >= x0) { c(x, y, 1, 16, dk(m, 0.22)); }
      }
      c(x0, y, x1 - x0, 2, pal.heri);
      if (pal.dot) { for (let x = Math.ceil(x0 / 4) * 4 + (r % 2) * 2; x < x1; x += 4) { c(x, y, 1, 1, pal.dot); } }
      c(x0, y + 2, x1 - x0, 1, dk(pal.mat, 0.12));
    }
  }
  function checker(c, x0, x1, a, b, g) {
    for (let y = FLOOR, r = 0; y < H; y += 8, r++) {
      for (let x = Math.floor(x0 / 8) * 8; x < x1; x += 8) {
        const t = ((x / 8) + r) % 2 ? a : b, xa = Math.max(x0, x), w = Math.min(x1, x + 8) - xa;
        c(xa, y, w, 8, t); c(xa, y, w, 1, lt(t, 0.15)); c(xa, y + 7, w, 1, g); if (x >= x0) { c(x, y, 1, 8, g); }
      }
    }
  }
  function doma(c, x0, x1) {
    c(x0, FLOOR, x1 - x0, H - FLOOR, "#ab8660");
    for (let y = FLOOR + 5; y < H; y++) { for (let x = Math.floor(x0 / 2) * 2; x < x1; x += 2) { const v = hs(x, y, 9); if (v > 0.88) { c(x, y, 2, 1, "#b48f68"); } else if (v < 0.08) { c(x, y, 2, 1, "#a07c56"); } else if (v > 0.992) { c(x, y, 1, 1, "#d6c09a"); } } }
    for (let y = FLOOR + 14; y < H; y += 16) { c(x0, y, x1 - x0, 1, "#a37f59"); }                                  // vệt chổi quét
    c(x0, FLOOR, x1 - x0, 4, "#4a2c18"); c(x0, FLOOR, x1 - x0, 1, "#7a4a2a"); c(x0, FLOOR + 4, x1 - x0, 1, "#2b1a10");      // bậc gỗ agari-kamachi
  }
  function speckle(c, x0, x1, y0, y1, base, d1, d2, seed) {
    c(x0, y0, x1 - x0, y1 - y0, base);
    for (let y = y0; y < y1; y++) { for (let x = x0; x < x1; x++) { const v = hs(x, y, seed); if (v > 0.93) { c(x, y, 1, 1, d1); } else if (v < 0.035) { c(x, y, 1, 1, d2); } } }
  }
  function straw(c, x0, x1, y0, y1, base, f1, f2) {
    c(x0, y0, x1 - x0, y1 - y0, base);
    for (let y = y0; y < y1; y++) { for (let x = x0; x < x1; x++) { const v = hs(x, y, 31); if (v > 0.965) { c(x, y, 2 + Math.floor(hs(x, y, 4) * 2), 1, f1); } else if (v < 0.02) { c(x, y, 1, 1, f2); } } }
  }
  function shadowBands(c, x0, x1, yTop) {                       // bóng dưới xà + mép sàn
    const ga = c.ctx.globalAlpha;
    c.ctx.globalAlpha = 0.13; c(x0, yTop, x1 - x0, 2, "#000000"); c.ctx.globalAlpha = 0.06; c(x0, yTop + 2, x1 - x0, 2, "#000000");
    c.ctx.globalAlpha = 0.16; c(x0, FLOOR, x1 - x0, 2, "#000000"); c.ctx.globalAlpha = 0.07; c(x0, FLOOR + 2, x1 - x0, 3, "#000000");
    c.ctx.globalAlpha = ga;
  }
  // ---------- tường từng kiểu ----------
  const WALLS = {
    classic: function (c, x0, x1, kind, W0) {
      c(x0, 0, x1 - x0, 5, "#6b3b1f"); c(x0, 1, x1 - x0, 1, "#8a5030"); c(x0, 5, x1 - x0, 1, P.k);
      const paper = { room: "#fff0dc", kitchen: "#fff4e4", bedroom: "#f7eaf7" }[kind];
      const fl = { room: ["#ef8fa3", "#f8cdd3"], kitchen: ["#f0a04a", "#fbd9a8"], bedroom: ["#b98ad6", "#e2cdf0"] }[kind];
      c(x0, 6, x1 - x0, 32, paper); c(x0, 6, x1 - x0, 1, lt(paper, 0.5));
      const top = kind === "kitchen" ? 19 : 26;
      for (let y = 10, r = 0; y < top - 2; y += 7, r++) {
        for (let x = Math.floor(x0 / 10) * 10 + (r % 2) * 5; x < x1; x += 10) {
          if (x < x0 || x + 2 >= x1) { continue; }
          c(x + 1, y, 1, 1, fl[0]); c(x, y, 1, 1, fl[1]); c(x + 2, y, 1, 1, fl[1]); c(x + 1, y - 1, 1, 1, fl[1]); c(x + 1, y + 1, 1, 1, fl[1]);
          if (kind !== "kitchen") { c(x + 3, y + 2, 1, 1, "#a8cf9e"); }
        }
      }
      if (kind === "kitchen") {                                  // điểm nhấn Bếp: gạch men trắng viền xanh, cao tới giữa tường
        c(x0, 19, x1 - x0, 1, "#5f97c4"); c(x0, 20, x1 - x0, 1, "#8fc0e6");
        for (let y = 21, r = 0; y < 37; y += 4, r++) {
          c(x0, y, x1 - x0, 4, "#f7f9fb"); c(x0, y + 3, x1 - x0, 1, "#d3dbe3");
          for (let x = Math.floor(x0 / 8) * 8 + (r % 2) * 4; x < x1; x += 8) { if (x >= x0) { c(x, y, 1, 3, "#d3dbe3"); c(x + 1, y, 3, 1, "#ffffff"); } }
        }
      } else {
        const wn = kind === "bedroom" ? ["#e7b3c1", "#d39aaa", "#f4cfd8"] : ["#9cc5a1", "#80ab88", "#b6dcba"];
        c(x0, 26, x1 - x0, 2, "#c8854f"); c(x0, 26, x1 - x0, 1, "#e8b07a"); c(x0, 28, x1 - x0, 1, "#8a5030");
        c(x0, 29, x1 - x0, 8, wn[0]);
        for (let x = Math.ceil(x0 / 4) * 4; x < x1; x += 4) { c(x, 29, 1, 8, wn[1]); c(x + 1, 29, 1, 8, wn[2]); }
      }
      c(x0, 37, x1 - x0, 3, "#efe0c6"); c(x0, 37, x1 - x0, 1, "#fff8ea"); c(x0, 39, x1 - x0, 1, P.k);
      if (kind === "kitchen") { checker(c, x0, x1, "#f4ead6", "#e0907a", "#cdb79a"); }
      else { woodFloor(c, x0, x1, { fl: ["#e0a466", "#d6975a", "#e9b47a"], ln: "#b0743f" }, 6); }
    },
    minka: function (c, x0, x1, kind, W0) {
      c(x0, 0, x1 - x0, 5, "#3b2414"); for (let x = Math.ceil(x0 / 9) * 9; x < x1; x += 9) { c(x, 2, 5, 1, "#5a3a22"); } c(x0, 5, x1 - x0, 1, P.k);
      if (kind === "bedroom") {                                  // điểm nhấn Phòng ngủ: ranma + cửa lùa fusuma vẽ sóng chàm
        c(x0, 6, x1 - x0, 5, "#efe3c4"); for (let x = Math.ceil(x0 / 3) * 3; x < x1; x += 3) { c(x, 6, 1, 5, "#5a3a22"); }
        c(x0, 11, x1 - x0, 2, "#4a2c18"); c(x0, 11, x1 - x0, 1, "#6b4226");
        c(x0, 13, x1 - x0, 24, "#f2e9d3");
        for (let y = 14; y < 22; y += 3) { for (let x = x0; x < x1; x++) { if (hs(x, y, 41) > 0.8) { c(x, y, 3, 1, "#e6d6ae"); } } }
        for (let y = 22, r = 0; y < 36; y += 3, r++) {
          for (let x = Math.floor(x0 / 8) * 8 - 8 + (r % 2) * 4; x < x1; x += 8) {
            [[0, 2], [1, 1], [2, 0], [3, 0], [4, 0], [5, 1], [6, 2]].forEach(([dx, dy]) => { const px = x + dx; if (px >= x0 && px < x1 && y + dy < 37) { c(px, y + dy, 1, 1, "#3d5a80"); } });
            if (x + 3 >= x0 && x + 3 < x1 && y + 2 < 37) { c(x + 3, y + 2, 1, 1, "#7f9cc0"); }
          }
        }
        for (let x = Math.floor(x0 / 36) * 36; x <= x1; x += 36) { if (x >= x0 && x < x1) { c(x, 13, 1, 24, "#2b1a10"); } if (x + 32 >= x0 && x + 32 < x1) { c(x + 32, 23, 2, 3, "#2b1a10"); } if (x + 3 >= x0 && x + 3 < x1) { c(x + 2, 23, 2, 3, "#2b1a10"); } }
      } else {
        const up = kind === "kitchen" ? "#d8bd8a" : "#e8cf9f";
        speckle(c, x0, x1, 6, 22, up, dk(up, 0.1), lt(up, 0.3), 5);
        if (kind === "kitchen") { const ga = c.ctx.globalAlpha; c.ctx.globalAlpha = 0.18; c(x0, 6, x1 - x0, 6, "#3b2414"); c.ctx.globalAlpha = ga; }   // ám khói bếp
        c(x0, 22, x1 - x0, 3, "#4a2c18"); c(x0, 22, x1 - x0, 1, "#6b4226");
        speckle(c, x0, x1, 25, 31, "#ecd6a8", "#dcc390", "#f6e7c4", 6);
        c(x0, 31, x1 - x0, 6, "#5a3a22"); for (let x = Math.ceil(x0 / 6) * 6; x < x1; x += 6) { c(x, 31, 1, 6, "#3b2414"); c(x + 1, 31, 1, 6, "#6e4a2e"); }
        if (kind === "kitchen" && W0 - 22 >= x0 && W0 - 8 <= x1) {   // điểm nhấn Bếp: dây hồng treo khô
          [W0 - 20, W0 - 11].forEach((sx, j) => {
            c(sx, 6, 1, 17, "#8a6a3a");
            for (let y = 8 + j * 2; y < 21; y += 4) { const dx = (y / 4) % 2 ? -1 : 0; c(sx - 1 + dx, y, 3, 3, "#e8742a"); c(sx - 1 + dx, y + 2, 3, 1, "#b8521a"); c(sx + dx, y, 1, 1, "#4f7f3a"); }
          });
        }
      }
      c(x0, 37, x1 - x0, 3, "#3b2414"); c(x0, 37, x1 - x0, 1, "#5a3a22");
      if (kind === "kitchen") { doma(c, x0, x1); }
      else { tatami(c, x0, x1, { mat: "#d6cd88", mat2: "#cbc07a", heri: "#2f3526" }); }
    },
    teahouse: function (c, x0, x1, kind, W0) {
      for (let y = 0; y < 5; y += 2) { for (let x = Math.floor(x0 / 4) * 4; x < x1; x += 4) { const o = ((y / 2) % 2) * 2; c(x + o, y, 2, 2, "#caa56c"); c(x + 2 - o, y, 2, 2, "#b38b52"); } }   // trần đan ajiro
      c(x0, 4, x1 - x0, 1, "#8a6238"); c(x0, 5, x1 - x0, 1, "#5a3a22");
      straw(c, x0, x1, 6, 30, "#e7d1a6", "#cdb27e", "#f4e6c6");
      c(x0, 29, x1 - x0, 8, "#f6f1e4"); c(x0, 29, x1 - x0, 1, "#cbbfa6");                      // giấy dán chân tường koshibari
      for (let x = Math.ceil(x0 / 12) * 12; x < x1; x += 12) { c(x, 30, 1, 7, "#e4dccb"); }
      c(x0, 37, x1 - x0, 3, "#8a6238"); c(x0, 37, x1 - x0, 1, "#a87a4a");
      if (kind === "kitchen") {
        woodFloor(c, x0, x1, { fl: ["#ebd3a4", "#e2c793", "#f0dcb2"], ln: "#c9a774" }, 8);
        if (x0 <= 4 && x1 >= 44) {                                 // kệ tre 2 tầng (nền)
          [5, 40].forEach((x) => { c(x, 9, 2, 22, "#8faf4a"); c(x, 15, 2, 1, "#5f7f2a"); c(x, 24, 2, 1, "#5f7f2a"); c(x + 1, 9, 1, 22, "#a9c862"); });
          [17, 27].forEach((y) => { c(4, y, 39, 2, "#a9c862"); c(4, y + 2, 39, 1, "#6f8f3a"); });
          c(9, 12, 5, 5, "#2b2018"); c(10, 11, 3, 1, "#2b2018"); c(10, 13, 1, 1, "#6b5a48");
          c(18, 14, 5, 3, "#e8e0d0"); c(18, 14, 5, 1, "#7a9a4a"); c(27, 13, 4, 4, "#c06a3a"); c(28, 12, 2, 1, "#c06a3a"); c(34, 14, 4, 3, "#5f7faf");
          c(10, 23, 9, 4, "#6f5f8f"); c(10, 23, 9, 1, "#9f8fbf"); c(24, 22, 3, 5, "#e8e0d0"); c(29, 22, 3, 5, "#e8e0d0"); c(24, 24, 8, 1, "#9fbf5a");
        }
      } else {
        tatami(c, x0, x1, { mat: "#dcd291", mat2: "#d0c47f", heri: "#5a4632" });
      }
      if (kind === "bedroom" && x0 <= 48 && x1 >= 96) {          // hốc tokonoma giữa gian (thẻ Hôm nay không che)
        const a = 50, b = 94;
        c(a + 3, 8, b - a - 3, 26, "#d8c093"); c(a + 3, 8, b - a - 3, 2, "#c4aa7c");
        c(a, 6, 4, 31, "#a87a4a"); c(a + 1, 6, 1, 31, "#c4955e"); [10, 17, 25, 31].forEach((y) => c(a + 2, y, 1, 2, "#7a5530"));    // cột tokobashira
        c(a, 7, b - a, 2, "#8a6238");
        c(a + 3, 33, b - a - 3, 4, "#5a3018"); c(a + 3, 33, b - a - 3, 1, "#8a5030");
        const cx = Math.floor((a + b) / 2) - 2;
        c(cx - 5, 10, 11, 2, "#5a3a22"); c(cx - 4, 12, 9, 18, "#b8a27a"); c(cx - 3, 13, 7, 15, "#f7f1e1"); c(cx - 5, 30, 11, 2, "#5a3a22");
        c(cx, 15, 1, 7, "#2b2b2b"); c(cx - 1, 17, 3, 1, "#2b2b2b"); c(cx - 1, 22, 2, 2, "#2b2b2b"); c(cx + 1, 25, 1, 1, "#c0392b");
        c(b - 9, 29, 5, 4, "#4f6f8f"); c(b - 8, 29, 3, 1, "#6f8faf"); c(b - 7, 23, 1, 6, "#4f7f3a"); c(b - 9, 22, 3, 2, "#f08aa8"); c(b - 6, 24, 2, 2, "#ffffff");
      }
    },
    castle: function (c, x0, x1, kind, W0) {
      c(x0, 0, x1 - x0, 5, "#1f1f33"); c(x0, 4, x1 - x0, 1, "#e9b949"); c(x0, 5, x1 - x0, 1, P.k);
      for (let x = Math.ceil((x0 - 12) / 24) * 24 + 12; x < x1; x += 24) { if (x >= x0) { c(x - 1, 1, 3, 3, "#e9b949"); c(x, 2, 1, 1, "#a37a1f"); } }
      const lowTop = kind === "kitchen" ? 30 : 23;
      c(x0, 6, x1 - x0, lowTop - 6, "#f7f3ea"); for (let y = 7; y < lowTop; y++) { for (let x = x0; x < x1; x++) { if (hs(x, y, 51) > 0.96) { c(x, y, 1, 1, "#ece6d7"); } } }
      if (kind === "kitchen") {                                    // điểm nhấn Bếp: ốp gỗ sơn đen, sàn gỗ sẫm bóng
        c(x0, 30, x1 - x0, 7, "#2a2436"); c(x0, 30, x1 - x0, 1, "#e9b949");
        for (let x = Math.ceil(x0 / 8) * 8; x < x1; x += 8) { c(x, 31, 1, 6, "#1a1626"); c(x + 1, 31, 1, 6, "#3a3450"); }
      } else {
        c(x0, 21, x1 - x0, 2, "#1f1f33"); c(x0, 22, x1 - x0, 1, "#e9b949");
        for (let x = Math.ceil((x0 - 12) / 24) * 24 + 12; x < x1; x += 24) { if (x >= x0) { c(x - 1, 21, 3, 2, "#e9b949"); } }
        c(x0, 23, x1 - x0, 14, "#e6c35c");                         // fusuma lá vàng
        for (let y = 23; y < 37; y += 7) { for (let x = Math.floor(x0 / 7) * 7; x < x1; x += 7) { if (x >= x0 && hs(x, y, 61) > 0.6) { c(x, y, Math.min(7, x1 - x), Math.min(7, 37 - y), "#ecce72"); } } }
        for (let y = 23; y < 37; y += 7) { c(x0, y, x1 - x0, 1, "#d6ad48"); }
        for (let x = Math.ceil(x0 / 7) * 7; x < x1; x += 7) { c(x, 23, 1, 14, "#d6ad48"); }
        if (kind === "room") {                                     // tùng xanh + mây vàng
          const pine = (px) => {
            if (px < x0 || px + 32 > x1) { return; }
            const B = 23;
            [[1, 13, 3, 1], [3, 12, 3, 1], [5, 11, 2, 1], [6, 10, 2, 1], [7, 9, 2, 1], [8, 8, 2, 1], [10, 7, 1, 1]].forEach(([dx, dy, w, h]) => c(px + dx, B + dy, w, h, "#5a3a22"));
            [[8, 9, 6, 1], [13, 8, 4, 1], [5, 11, -4, 1]].forEach(([dx, dy, w]) => { const a = w < 0 ? px + dx + w : px + dx; c(a, B + dy, Math.abs(w), 1, "#5a3a22"); });
            const pad = (x, y, w) => { c(px + x + 2, B + y, w - 4, 1, "#5f9f52"); c(px + x, B + y + 1, w, 1, "#2f6b3a"); c(px + x + 1, B + y + 2, w - 2, 1, "#1f4f2a");
              for (let i = 1; i < w - 1; i += 3) { c(px + x + i, B + y, 1, 1, "#7fbf6a"); } };
            pad(9, 2, 14); pad(18, 5, 12); pad(0, 6, 10); pad(13, 8, 9);
          };
          pine(4); pine(W0 - 34);
          [[38, 26, 18], [104, 32, 16]].forEach(([x, y, w]) => { if (x >= x0 && x + w <= x1) { c(x, y, w, 2, "#f6e3a0"); c(x + 2, y - 1, w - 6, 1, "#f6e3a0"); c(x, y + 2, w, 1, "#d6ad48"); } });
        } else {                                                   // điểm nhấn Phòng ngủ: cành anh đào
          const br = (px) => {
            if (px < x0 || px + 34 > x1) { return; }
            for (let i = 0; i < 26; i++) { c(px + i, 23 + 3 + Math.round(i * 0.35), 1, 1, "#4a2c18"); }
            [[3, 2], [9, 5], [15, 4], [21, 8], [26, 10], [12, 9], [30, 7]].forEach(([dx, dy]) => { c(px + dx, 23 + dy, 3, 3, "#f7a8c0"); c(px + dx + 1, 23 + dy + 1, 1, 1, "#ffffff"); });
            [[6, 11], [18, 12], [28, 3]].forEach(([dx, dy]) => c(px + dx, 23 + dy, 1, 1, "#f7a8c0"));
          };
          br(2); br(54); br(W0 - 38);
        }
        for (let x = Math.floor(x0 / 36) * 36; x < x1; x += 36) { if (x >= x0) { c(x, 23, 1, 14, "#1f1f33"); } if (x + 33 >= x0 && x + 33 < x1) { c(x + 33, 28, 2, 3, "#1f1f33"); } }
      }
      c(x0, 37, x1 - x0, 3, "#1f1f33"); c(x0, 37, x1 - x0, 1, "#e9b949");
      if (kind === "kitchen") {
        woodFloor(c, x0, x1, { fl: ["#5e3a24", "#54331f", "#6a432a"], ln: "#2e1c12" }, 6);
        const ga = c.ctx.globalAlpha; c.ctx.globalAlpha = 0.09;
        for (let k = 0; k < 4; k++) { const sx = x0 + 10 + k * 37; for (let i = 0; i < 40; i++) { if (sx + i < x1) { c(sx + i, FLOOR + 6 + Math.floor(i * 0.9), 3, 1, "#ffffff"); } } }
        c.ctx.globalAlpha = ga;
      } else {
        tatami(c, x0, x1, { mat: "#d9cf8c", mat2: "#cec27c", heri: "#7a1f2a", dot: "#e9b949" });
      }
    },
  };
  // ---------- cửa sổ phòng chính (cột 4–5, x 64–96) ----------
  function windowV2(c, style, now) {
    const tod = timeOfDay(), sky = skyColors(tod), stR = skyNow(), night = tod === "night";
    const glass = (x, y, w, h) => {
      c(x, y, w, h, sky[1]); c(x, y, w, Math.ceil(h * 0.45), sky[0]);
      if (night) { c(x + w - 8, y + 2, 3, 3, "#fff6c8"); } else if (!stR || !stR.rain) { c(x + 3, y + Math.floor(h * 0.6), 7, 2, P.w); c(x + 5, y + Math.floor(h * 0.6) - 1, 3, 1, P.w); }
    };
    if (style === "classic") {
      c(67, 9, 26, 24, P.w); glass(68, 10, 24, 22); c(79, 10, 2, 22, P.w); c(68, 20, 24, 2, P.w);
      c(66, 33, 28, 2, P.w); c(66, 35, 28, 1, "#d9c9b0");                                        // bậu cửa
      c(70, 30, 6, 3, "#d9704a"); c(71, 28, 1, 2, P.g); c(73, 27, 1, 3, P.g); c(72, 28, 1, 1, P.p); c(74, 27, 1, 1, P.y);       // chậu hoa
      [[60, 1], [93, -1]].forEach(([x, d]) => {                                                 // rèm hồng có nếp + dây buộc
        for (let y = 9; y < 35; y++) { const pinch = y > 21 && y < 27 ? 2 : (y >= 27 ? 1 : 0), w = 7 - pinch, xs = d > 0 ? x : x + pinch; c(xs, y, w, 1, "#f49ab0"); c(xs + 2, y, 1, 1, "#e07a96"); c(xs + 4, y, 1, 1, "#e07a96"); }
        c(d > 0 ? x : x + 2, 24, 5, 1, "#e9b949");
      });
      c(59, 6, 42, 3, "#f49ab0"); c(59, 6, 42, 1, "#f8bccb"); for (let x = 59; x < 101; x += 2) { c(x, 9, 1, 1, "#f49ab0"); }   // diềm rèm
      return;
    }
    if (style === "minka") {
      c(65, 8, 30, 27, "#3b2414"); glass(67, 10, 13, 23);
      c(80, 10, 13, 23, night ? "#4a5470" : "#f3ecd8");                                          // nửa shoji khép
      for (let x = 83; x < 93; x += 3) { c(x, 10, 1, 23, "#6b4226"); } for (let y = 15; y < 33; y += 5) { c(80, y, 13, 1, "#6b4226"); }
      c(79, 9, 2, 25, "#3b2414"); c(64, 34, 32, 2, "#4a2c18");
      return;
    }
    if (style === "teahouse") {
      ctx0.save(); ctx0.beginPath(); ctx0.arc((c.ox + 80) * c.S, (c.oy + 21) * c.S, 12 * c.S, 0, Math.PI * 2); ctx0.clip();
      glass(66, 8, 28, 26);
      [[71, 8, 1, 26], [77, 8, 2, 26], [85, 8, 1, 26], [66, 14, 28, 1], [66, 22, 28, 2], [66, 29, 28, 1]].forEach(([x, y, w, h]) => c(x, y, w, h, "#a8884a"));
      [[74, 18], [81, 25], [88, 16]].forEach(([x, y]) => c(x, y, 2, 2, "#8a6a34"));
      ctx0.restore();
      ctx0.strokeStyle = "#8a6238"; ctx0.lineWidth = 2 * c.S; ctx0.beginPath(); ctx0.arc((c.ox + 80) * c.S, (c.oy + 21) * c.S, 12.5 * c.S, 0, Math.PI * 2); ctx0.stroke();
      ctx0.strokeStyle = "#d9c094"; ctx0.lineWidth = 1 * c.S; ctx0.beginPath(); ctx0.arc((c.ox + 80) * c.S, (c.oy + 21) * c.S, 14 * c.S, 0, Math.PI * 2); ctx0.stroke();
      return;
    }
    // castle: cửa sổ hình chuông katōmado, khung sơn đen viền vàng
    const HW = { 8: 1, 9: 2, 10: 3, 11: 4, 12: 6, 13: 8, 14: 10, 15: 12, 16: 14, 17: 13 };
    const half = (y) => HW[y] !== undefined ? HW[y] : 12;
    for (let y = 7; y <= 35; y++) { const hw = (y === 7 ? 1 : half(Math.min(y, 34)) + 2); c(80 - hw, y, hw * 2, 1, "#1f1f33"); }
    for (let y = 9; y <= 33; y++) { const hw = half(y); if (hw > 1) { c(80 - hw + 1, y, hw * 2 - 2, 1, y < 19 ? sky[0] : sky[1]); } }
    if (night) { c(84, 21, 3, 3, "#fff6c8"); } else if (!stR || !stR.rain) { c(71, 24, 7, 2, P.w); c(73, 23, 3, 1, P.w); }
    c(79, 10, 2, 24, "#1f1f33"); c(69, 25, 22, 1, "#1f1f33");
    for (let y = 7; y <= 35; y++) { const hw = (y === 7 ? 1 : half(Math.min(y, 34)) + 2); c(80 - hw - 1, y, 1, 1, "#e9b949"); c(80 + hw, y, 1, 1, "#e9b949"); }
    c(64, 35, 32, 2, "#1f1f33"); c(64, 35, 32, 1, "#e9b949");
  }
  let ctx0 = null;
  function roomBg2(ctx, S, ox, oy, kind, style, now) {
    ctx0 = ctx;
    const c = (x, y, w, h, col) => box(ctx, ox + x, oy + y, w, h, col, S);
    c.ctx = ctx; c.ox = ox; c.oy = oy; c.S = S;
    const W0 = W[kind];
    WALLS[style](c, 0, W0, kind, W0);
    shadowBands(c, 0, W0, 6);
    if (kind === "room") {
      windowV2(c, style, now);
      const stR = skyNow();
      if (timeOfDay() === "day" && (!stR || (!stR.rain && stR.light > 0.6))) {           // vệt nắng trên sàn
        ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = "#fff4c0"; ctx.beginPath();
        ctx.moveTo((ox + 67) * S, (oy + 41) * S); ctx.lineTo((ox + 93) * S, (oy + 41) * S); ctx.lineTo((ox + 106) * S, (oy + 74) * S); ctx.lineTo((ox + 58) * S, (oy + 74) * S); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
  }
  const POST2 = {
    classic: { body: "#8a5030", hi: "#b0703e", cap: "#c8854f" },
    minka: { body: "#3b2414", hi: "#5a3a22", cap: "#4a2c18" },
    teahouse: { body: "#b88a58", hi: "#d0a470", cap: "#a87a4a", bark: "#8a6238" },
    castle: { body: "#1f1f33", hi: "#3a3a55", cap: "#e9b949" },
  };
  function post2(ctx, S, ox, oy, x, y0, y1, style) {
    const p = POST2[style];
    R(ctx, S, ox, oy, x, y0, 4, y1 - y0, p.body); R(ctx, S, ox, oy, x + 1, y0, 1, y1 - y0, p.hi);
    R(ctx, S, ox, oy, x, y0, 1, y1 - y0, P.k); R(ctx, S, ox, oy, x + 3, y0, 1, y1 - y0, P.k);
    R(ctx, S, ox, oy, x - 1, 6, 6, 2, p.cap); R(ctx, S, ox, oy, x - 1, 36, 6, 2, p.cap);
    if (p.bark) { for (let y = y0 + 8; y < y1; y += 11) { R(ctx, S, ox, oy, x + 2, y, 1, 2, p.bark); } }
  }
  function posts(ctx, S, ox, oy, style) { [-4, 456].forEach((x) => post2(ctx, S, ox, oy, x, 0, H, style)); }
  return { posts: posts, strip: strip, stripA: stripA, stripB: stripB, house: house, STY: STY };
})();
