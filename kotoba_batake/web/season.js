/* ことば畑 – Mùa & Lễ hội: giao diện theo mùa.
   Python (season_core.py) quyết định lịch, chủ đề nào đã mở khoá và giá; file này chỉ vẽ:
   màu trang / trời / đồi / đất / ruộng, dải trang trí trên cùng, hạt rơi ở nền trang và trên ruộng,
   dây đèn trong cảnh, pháo hoa, trăng rằm, Ngân Hà… home.js và garden.js gọi các hàm ở đây.
   Mọi hiệu ứng đều tính theo thời gian (không lưu hạt) nên rất nhẹ. */
var GardenSeason = (function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let G = null;              // tiện ích từ garden.js: data()
  let preview = null;        // chủ đề đang xem thử (chưa mở khoá vẫn xem được)
  let forced = null;         // chủ đề ép tạm khi vẽ ảnh xem trước trong cửa hàng
  let cur = null;            // chủ đề đang áp dụng
  const listeners = [];

  const mix = (a, b, t) => GardenSky.mix(a, b, Math.max(0, Math.min(1, t)));
  const shade = (c, k) => GardenSky.shade(c, k);
  function hash(n) {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  function bx(ctx, x, y, w, h, c, S) { ctx.fillStyle = c; ctx.fillRect(Math.round(x * S), Math.round(y * S), Math.round(w * S), Math.round(h * S)); }

  const C = { k: "#1b1b2f", w: "#ffffff", y: "#ffd23f", i: "#e9b949", o: "#ff9f1c", r: "#ff4f6d", R: "#c21f3a", p: "#ff7fa0",
    P: "#ffc4d6", g: "#3ccb5e", G: "#2e8b3a", j: "#1f5f2a", l: "#8fd3ff", d: "#3d8bff", v: "#c77dff", z: "#7b2cbf",
    b: "#a0603a", B: "#6b3b1f", h: "#f5b971", t: "#e2a46a", s: "#d4d4e0", S: "#8a8fa8", f: "#b8e05a", Y: "#fff6a8" };

  // ---------------------------------------------------------------------
  // Bảng giao diện của từng chủ đề
  //   page/pageK: màu pha vào nền trang · title: màu chữ ことば畑 · band: kiểu dải trang trí trên cùng
  //   bg: hạt rơi ở nền trang · garland: dây trang trí trong cảnh (null = không) · room: dây trang trí trong phòng
  //   cover: tuyết phủ · hills/hillDots: màu đồi · ground/groundK/groundDots: đất · ambient: hạt bay trong cảnh
  //   sky: hiệu ứng trời · field: ruộng {base, speck, dots} · fieldFx: hạt rơi trên ruộng · weather: thiên hướng thời tiết
  // ---------------------------------------------------------------------
  const VIS = {
    spring: { page: "#ffd1e3", pageK: 0.2, title: "#fff0f6", band: "flowers", bg: "petal", garland: null, room: "flowers",
      hillDots: [C.P, C.w, "#fff2b3"], hillDens: 0.35, groundDots: [C.P, C.w, "#ffe95c"], groundDens: 0.5,
      ambient: [["petal", 6], ["bfly", 1]], field: { base: "#64d964", speck: "#45bf4a", dots: [C.P, C.w, "#ffe95c"], dens: 0.5 },
      fieldFx: "petal", greet: "春が来た！ Xuân về rồi ♪" },
    summer: { page: "#46d0ff", pageK: 0.14, title: "#fffbd0", band: "furin", bg: null, garland: null, room: "furin",
      hills: "#58cf66", groundDots: [C.w, "#ffe95c"], groundDens: 0.15,
      ambient: [["tonbo", 1], ["firefly", 4]], field: { base: "#55d655", speck: "#3cb84a", dots: [C.w], dens: 0.15 },
      fieldFx: null, greet: "夏だ！ Nắng quá đi" },
    autumn: { page: "#ffb36b", pageK: 0.2, title: "#ffe2b8", band: "leaves", bg: "leaf", garland: null, room: "leaves",
      hills: "#c9a24a", hillDots: ["#e07a3a", "#7fa04a", "#f2c14a"], hillDens: 0.45, ground: "#a8b84a", groundK: 0.35,
      groundDots: [C.r, C.o, C.y, C.b], groundDens: 0.6, ambient: [["leaf", 5], ["tonboR", 1]],
      field: { base: "#93cb52", speck: "#7aa83e", dots: [C.r, C.o, C.y], dens: 0.5 }, fieldFx: "leaf", greet: "秋だね～ Mùa thu rồi" },
    winter: { page: "#cfe3f5", pageK: 0.3, title: "#ffffff", band: "icicles", bg: "flake", garland: null, room: null, cover: true,
      hillDots: ["#5a8a6a"], hillDens: 0.12, groundDots: ["#cfdcea"], groundDens: 0.4, ambient: [["flake", 4]],
      field: { base: "#e4edf5", speck: "#c9d7e6", dots: ["#9fbf9f", "#ffffff"], dens: 0.25 }, fieldFx: "flake",
      weather: { snow: 0.14 }, greet: "冬だ！ Lạnh quá, nhớ giữ ấm nhé" },
    hanami: { page: "#ffc4d6", pageK: 0.28, title: "#ffe3ee", band: "sakura", bg: "petal", garland: "sakura", room: "sakura",
      skyTint: ["#ffd6e6", 0.18], hillDots: [C.P, C.p, C.w], hillDens: 0.75, groundDots: [C.P, C.p, C.w], groundDens: 0.9,
      ambient: [["petal", 14]], field: { base: "#62d862", speck: "#45bf4a", dots: [C.P, C.p, C.w], dens: 0.9 },
      fieldFx: "petal", greet: "お花見しよう！ Hoa anh đào nở rồi" },
    tsuyu: { page: "#8fa8d8", pageK: 0.22, title: "#e8f0ff", band: "teru", bg: "rain", garland: "teru", room: "teru",
      hills: "#4fae62", ground: "#3f9a50", groundK: 0.25, groundDots: [C.l, C.v, C.d], groundDens: 0.3,
      ambient: [["drop", 3]], field: { base: "#4fc45a", speck: "#3a9e48", dots: [C.l, C.v, C.d], dens: 0.35 }, fieldFx: null,
      weather: { rain: 2.2 }, greet: "梅雨だね… Nhớ mang ô nhé" },
    tanabata: { page: "#3d4f8a", pageK: 0.2, title: "#fff6a8", band: "streamers", bg: "star", garland: "streamers", room: "streamers",
      sky: ["milky"], groundDots: [C.y, C.l, C.p], groundDens: 0.15, ambient: [["firefly", 5]],
      field: { base: "#5ed35e", speck: "#45bf4a", dots: [C.y, C.l, C.p, C.v], dens: 0.2 }, fieldFx: "star", greet: "七夕だ！ Ước gì nào? ☆" },
    natsumatsuri: { page: "#ff9f6b", pageK: 0.18, title: "#ffe9a8", band: "chochin", bg: "fw", garland: "chochin", room: "chochin",
      sky: ["fireworks"], fw: [C.r, C.y, C.l, C.v, C.f], ambient: [["firefly", 3]], groundDots: [C.r, C.y], groundDens: 0.1,
      field: { base: "#5ed35e", speck: "#45bf4a", dots: [C.r, C.y], dens: 0.12 }, fieldFx: null, greet: "夏祭りだ！ Đi hội thôi ♪" },
    tsukimi: { page: "#3a3f6b", pageK: 0.2, title: "#fff1b8", band: "ongsao", bg: "star", garland: "ongsao", room: "ongsao",
      bigMoon: "#fff1b8", rabbit: true, hillDots: ["#e8d8a0"], hillDens: 0.4, groundDots: ["#e8d8a0", "#c9b878"], groundDens: 0.3,
      ambient: [["firefly", 2], ["leaf", 1]], field: { base: "#6bcf5e", speck: "#4fae4a", dots: ["#e8d8a0", "#fff1b8"], dens: 0.3 },
      fieldFx: null, greet: "お月見だ！ Trăng rằm đẹp quá" },
    halloween: { page: "#7b2cbf", pageK: 0.3, title: "#ffb36b", band: "bunting", bg: "bat", garland: "bunting", room: "bunting",
      skyTint: ["#5a2a8a", 0.3], bigMoon: "#ffb347", hills: "#4f7a4a", groundDots: [C.o, C.z], groundDens: 0.2,
      ambient: [["bat", 3], ["wisp", 2]], field: { base: "#4fae52", speck: "#3a8a40", dots: [C.o, C.v], dens: 0.25 },
      fieldFx: null, greet: "トリック・オア・トリート！ Cho kẹo hay bị ghẹo?" },
    momiji: { page: "#ff7a4a", pageK: 0.22, title: "#ffd0b0", band: "momiji", bg: "leaf", garland: null, room: "momiji",
      hills: "#d9603a", hillDots: ["#f2a03a", "#b8302a", "#f2c14a", "#8a3a2a"], hillDens: 0.8, ground: "#9ab84a", groundK: 0.2,
      groundDots: [C.r, C.o, C.R, C.y], groundDens: 0.9, ambient: [["leaf", 10], ["gleaf", 3]],
      field: { base: "#86c450", speck: "#6ea040", dots: [C.r, C.o, C.R, C.y], dens: 0.8 }, fieldFx: "leaf", greet: "紅葉がきれい！ Lá đỏ rồi" },
    noel: { page: "#d6e8f7", pageK: 0.28, title: "#ffffff", band: "lights", bg: "flake", garland: "lights", room: "lights", cover: true,
      sky: ["sleigh"], hillDots: ["#3a6a4a"], hillDens: 0.2, groundDots: ["#cfdcea"], groundDens: 0.4, ambient: [["flake", 6]],
      field: { base: "#e6eef6", speck: "#cad8e7", dots: [C.r, "#3a7a4a", C.w], dens: 0.18 }, fieldFx: "flake",
      weather: { snow: 0.2 }, greet: "メリークリスマス！ Giáng sinh vui vẻ ♪" },
    shogatsu: { page: "#ffe9c0", pageK: 0.2, title: "#fff1c8", band: "shimenawa", bg: "gold", garland: "shimenawa", room: "shimenawa",
      sky: ["kites"], groundDots: [C.w, C.P], groundDens: 0.15, ambient: [],
      field: { base: "#6fcf5e", speck: "#52aa4a", dots: [C.r, C.w], dens: 0.15 }, fieldFx: null, greet: "あけましておめでとう！" },
    tet: { page: "#ff4f6d", pageK: 0.24, title: "#ffd23f", band: "tet", bg: "ypetal", garland: "tet", room: "tet",
      sky: ["fireworks"], fw: [C.r, C.y, "#ffe95c", C.o, C.w], groundDots: [C.y, C.r, C.i], groundDens: 0.5,
      ambient: [["ypetal", 7], ["petal", 3]], field: { base: "#62d862", speck: "#45bf4a", dots: [C.y, C.r, C.i], dens: 0.45 },
      fieldFx: "ypetal", greet: "Chúc mừng năm mới! An khang thịnh vượng ♪" }
  };

  // ---------------------------------------------------------------------
  // Chủ đề đang dùng (giống season_core.active_theme)
  // ---------------------------------------------------------------------
  function data() { return G && G.data ? G.data() : null; }
  function themes() { const d = data(); return (d && d.catalog && d.catalog.themes) || []; }
  function settings() { const d = data(); return (d && d.wallet && d.wallet.season) || { unlocked: [], mode: "auto", pick: null, free_day: null }; }
  function computeActive() {
    const ss = settings(), un = ss.unlocked || [];
    if (ss.mode === "off") { return null; }
    if (ss.mode === "pick") { return un.indexOf(ss.pick) >= 0 ? ss.pick : null; }
    const t = themes().find((x) => x.now && un.indexOf(x.id) >= 0);
    return t ? t.id : null;
  }
  function activeId() { return forced || preview || cur; }
  function V() { const id = activeId(); return id ? VIS[id] : null; }
  function effects() { return typeof GardenFX === "undefined" || !GardenFX.effectsOn || GardenFX.effectsOn(); }

  // ---------------------------------------------------------------------
  // Trời / đất theo chủ đề
  // ---------------------------------------------------------------------
  let skyCache = { src: null, id: null, out: null };
  function themeSky(st) {
    const id = activeId();
    if (!st || !id) { return st; }
    if (skyCache.src === st && skyCache.id === id) { return skyCache.out; }
    const v = VIS[id], o = Object.assign({}, st), L = st.light;
    o.theme = id;
    if (v.skyTint) { o.top = mix(st.top, shade(v.skyTint[0], 0.4 + 0.6 * L), v.skyTint[1] * (st.night ? 1.4 : 0.8)); o.bottom = mix(st.bottom, shade(v.skyTint[0], 0.45 + 0.55 * L), v.skyTint[1]); }
    if (v.hills) { o.hills = mix(shade(v.hills, 0.4 + 0.6 * L), "#f2f6fa", st.snow ? 0.7 : 0); }
    if (v.ground) { o.ground = mix(st.ground, shade(v.ground, 0.45 + 0.55 * L), v.groundK || 0.3); }
    if (v.cover) {
      o.cover = true;
      o.ground = mix(st.ground, shade("#e8f0f6", 0.55 + 0.45 * L), 0.8);
      o.hills = mix(st.hills, shade("#f2f6fa", 0.5 + 0.5 * L), 0.75);
      o.grass = mix(st.grass, shade("#c6d6e6", 0.5 + 0.5 * L), 0.75);
    }
    if (v.bigMoon) { o.bigMoon = v.bigMoon; o.rabbit = !!v.rabbit; }
    o.page = mix(st.page, shade(v.page, 0.35 + 0.65 * L), v.pageK);
    if (v.cover) { o.field = mix(st.field, "#cfdcea", 0.7); }
    skyCache = { src: st, id: id, out: o };
    return o;
  }
  // 1.10: cây và đất riêng của các vùng (Đền trên núi, Suối nước nóng, Ga làng quê, Rừng tre…) theo chủ đề.
  //   tint/k: pha màu tán cây · dots/dens: hoa / lá điểm trên tán · snow: tuyết phủ ngọn cây
  //   land: "green" (cỏ xanh) | "dry" (cỏ úa, lúa chín) | "snow" (tuyết)
  const FOLIAGE = {
    spring: { dots: [C.P, C.w], dens: 0.22, land: "green" },
    summer: { tint: "#3ccb5e", k: 0.15, land: "green" },
    autumn: { tint: "#c98a3a", k: 0.55, dots: [C.o, C.y, "#e07a3a"], dens: 0.35, land: "dry" },
    winter: { snow: true, land: "snow" },
    hanami: { tint: "#ffc4d6", k: 0.45, dots: [C.P, C.p, C.w], dens: 0.55, land: "green" },
    tsuyu: { tint: "#2f7a3a", k: 0.25, dots: [C.l, C.v], dens: 0.12, land: "green" },
    tanabata: { land: "green" },
    natsumatsuri: { tint: "#3ccb5e", k: 0.12, land: "green" },
    tsukimi: { tint: "#b8a04a", k: 0.25, land: "dry" },
    halloween: { tint: "#b8702a", k: 0.35, dots: [C.o], dens: 0.12, land: "dry" },
    momiji: { tint: "#d9483a", k: 0.7, dots: [C.r, C.o, C.R, C.y], dens: 0.5, land: "dry" },
    noel: { snow: true, land: "snow" },
    shogatsu: { snow: true, land: "snow" },
    tet: { dots: [C.y, C.p], dens: 0.3, land: "green" }
  };
  function foliage() { const id = activeId(); return id ? FOLIAGE[id] || null : null; }
  function weatherBias() { const id = cur; return id && VIS[id].weather ? VIS[id].weather : null; }

  // ---------------------------------------------------------------------
  // Dây trang trí: dây võng giữa các điểm treo cách nhau L, đồ treo cách nhau step
  // pass 0 = vẽ thường · pass 1 = lớp sáng ban đêm (vẽ sau khi phủ tối)
  // ---------------------------------------------------------------------
  const LIGHT_COLS = [C.r, C.y, C.l, C.f, C.p];
  const GARLAND = {
    lights: { rope: "#1f5f2a", step: 5, orn: function (ctx, S, x, y, k, now, pass) {
      const on = (Math.floor(now / 520) + k) % 3 !== 0, c = LIGHT_COLS[(k + Math.floor(now / 1560)) % LIGHT_COLS.length];
      if (pass) { if (!on) { return; } ctx.globalAlpha = 0.35; bx(ctx, x - 1, y, 3, 3, c, S); ctx.globalAlpha = 1; bx(ctx, x, y + 1, 1, 1, c, S); return; }
      bx(ctx, x, y, 1, 1, "#1b1b2f", S); bx(ctx, x, y + 1, 1, 2, on ? c : shade(c, 0.45), S);
      if (k % 4 === 2) { bx(ctx, x - 1, y - 1, 1, 1, C.R, S); bx(ctx, x + 1, y - 1, 1, 1, C.R, S); }
    } },
    chochin: { rope: "#3a3a55", step: 8, orn: function (ctx, S, x, y, k, now, pass) {
      const c = k % 2 ? C.w : C.r;
      if (pass) { ctx.globalAlpha = 0.3; bx(ctx, x - 2, y, 5, 6, C.o, S); ctx.globalAlpha = 1; bx(ctx, x, y + 2, 1, 2, C.Y, S); return; }
      bx(ctx, x - 1, y, 3, 1, C.k, S); bx(ctx, x - 1, y + 1, 3, 3, c, S); bx(ctx, x - 1, y + 4, 3, 1, C.k, S);
      bx(ctx, x, y + 2, 1, 1, k % 2 ? C.r : C.y, S);
    } },
    tet: { rope: "#c21f3a", step: 6, orn: function (ctx, S, x, y, k, now, pass) {
      if (k % 2) {   // hoa mai giữa các đèn lồng
        if (pass) { return; }
        bx(ctx, x, y, 1, 1, C.o, S); bx(ctx, x - 1, y, 1, 1, C.y, S); bx(ctx, x + 1, y, 1, 1, C.y, S); bx(ctx, x, y - 1, 1, 1, C.y, S); bx(ctx, x, y + 1, 1, 1, C.y, S);
        return;
      }
      if (pass) { ctx.globalAlpha = 0.32; bx(ctx, x - 2, y, 6, 7, C.o, S); ctx.globalAlpha = 1; bx(ctx, x, y + 2, 2, 2, C.Y, S); return; }
      const sw = Math.round(Math.sin(now / 900 + k) * 0.6);
      bx(ctx, x - 1 + sw, y, 4, 1, C.i, S); bx(ctx, x - 2 + sw, y + 1, 6, 4, C.r, S); bx(ctx, x - 1 + sw, y + 1, 1, 4, C.R, S);
      bx(ctx, x - 1 + sw, y + 5, 4, 1, C.i, S); bx(ctx, x + sw, y + 6, 2, 2, C.y, S);
    } },
    bunting: { rope: "#2b2140", step: 4, orn: function (ctx, S, x, y, k, now, pass) {
      if (pass) { return; }
      const c = [C.o, "#6a2c9f", C.k][k % 3];
      if (k % 7 === 3) {   // bí ngô nhỏ
        bx(ctx, x - 1, y + 1, 3, 2, C.o, S); bx(ctx, x, y, 1, 1, C.G, S); bx(ctx, x, y + 1, 1, 1, "#c96a10", S);
        return;
      }
      bx(ctx, x - 1, y, 3, 1, c, S); bx(ctx, x - 1, y + 1, 3, 1, c, S); bx(ctx, x, y + 2, 1, 1, c, S);
    } },
    streamers: { rope: "#2e8b3a", step: 3, orn: function (ctx, S, x, y, k, now, pass) {
      if (pass) { if (k % 5 === 0) { ctx.globalAlpha = 0.4; bx(ctx, x - 1, y, 3, 3, C.Y, S); ctx.globalAlpha = 1; } return; }
      if (k % 5 === 0) { bx(ctx, x, y, 1, 1, C.y, S); bx(ctx, x - 1, y + 1, 3, 1, C.y, S); bx(ctx, x, y + 2, 1, 1, C.y, S); return; }
      const c = [C.r, C.l, C.v, C.f, C.p, C.o][k % 6], len = 3 + (k * 7) % 3, sw = Math.round(Math.sin(now / 500 + k) * 0.7);
      for (let j = 0; j < len; j++) { bx(ctx, x + (j > 1 ? sw : 0), y + j, 1, 1, c, S); }
    } },
    flowers: { rope: "#2e8b3a", step: 4, orn: function (ctx, S, x, y, k, now, pass) {
      if (pass) { return; }
      const c = [C.P, C.w, "#ffe95c", C.p][k % 4];
      bx(ctx, x, y + 1, 1, 1, C.o, S); bx(ctx, x - 1, y + 1, 1, 1, c, S); bx(ctx, x + 1, y + 1, 1, 1, c, S); bx(ctx, x, y, 1, 1, c, S); bx(ctx, x, y + 2, 1, 1, c, S);
      if (k % 2) { bx(ctx, x + 2, y, 1, 1, C.g, S); }
    } },
    sakura: { rope: "#a0603a", step: 6, orn: function (ctx, S, x, y, k, now, pass) {
      if (k % 2) {
        if (pass) { ctx.globalAlpha = 0.3; bx(ctx, x - 2, y, 5, 6, "#ffd6e6", S); ctx.globalAlpha = 1; return; }
        bx(ctx, x - 1, y, 3, 1, C.r, S); bx(ctx, x - 1, y + 1, 3, 3, C.P, S); bx(ctx, x - 1, y + 1, 1, 3, C.w, S); bx(ctx, x - 1, y + 4, 3, 1, C.r, S);
        return;
      }
      if (pass) { return; }
      bx(ctx, x, y + 1, 1, 1, C.w, S); bx(ctx, x - 1, y + 1, 1, 1, C.p, S); bx(ctx, x + 1, y + 1, 1, 1, C.p, S); bx(ctx, x, y, 1, 1, C.P, S); bx(ctx, x, y + 2, 1, 1, C.P, S);
    } },
    leaves: { rope: "#8a5a34", step: 3, orn: function (ctx, S, x, y, k, now, pass) {
      if (pass) { return; }
      const c = [C.o, C.y, C.r, "#d98a3a"][k % 4];
      bx(ctx, x, y, 2, 1, c, S); bx(ctx, x, y + 1, 1, 1, c, S);
    } },
    momiji: { rope: "#6b3b1f", step: 3, orn: function (ctx, S, x, y, k, now, pass) {
      if (pass) { return; }
      const c = [C.r, C.o, C.R, C.r, C.y][k % 5];
      bx(ctx, x - 1, y, 3, 1, c, S); bx(ctx, x, y + 1, 1, 1, c, S); bx(ctx, x, y - 1, 1, 1, c, S);
    } },
    icicles: { rope: "#ffffff", thick: 2, step: 2, orn: function (ctx, S, x, y, k, now, pass) {
      if (pass) { return; }
      const len = Math.floor(hash(k * 13) * 4);
      for (let j = 0; j < len; j++) { bx(ctx, x, y + 1 + j, 1, 1, j === len - 1 ? C.w : C.l, S); }
      if (len >= 3 && Math.floor(now / 700 + k) % 9 === 0) { bx(ctx, x, y + len + 1 + (Math.floor(now / 100) % 3), 1, 1, C.l, S); }
    } },
    teru: { rope: "#8a8fa8", step: 9, orn: function (ctx, S, x, y, k, now, pass) {
      if (pass) { return; }
      const sw = Math.round(Math.sin(now / 700 + k) * 0.8);
      bx(ctx, x - 1 + sw, y, 3, 3, C.w, S); bx(ctx, x - 1 + sw, y + 3, 3, 1, C.r, S); bx(ctx, x - 2 + sw, y + 4, 5, 2, C.w, S);
      bx(ctx, x - 1 + sw, y + 1, 1, 1, C.k, S); bx(ctx, x + 1 + sw, y + 1, 1, 1, C.k, S);
    } },
    ongsao: { rope: "#6b3b1f", step: 7, orn: function (ctx, S, x, y, k, now, pass) {
      if (k % 2) {
        if (pass) { ctx.globalAlpha = 0.3; bx(ctx, x - 1, y, 3, 3, C.Y, S); ctx.globalAlpha = 1; return; }
        bx(ctx, x - 1, y, 3, 3, C.y, S); bx(ctx, x, y + 1, 1, 1, C.w, S);
        return;
      }
      if (pass) { ctx.globalAlpha = 0.35; bx(ctx, x - 2, y, 5, 6, C.o, S); ctx.globalAlpha = 1; bx(ctx, x, y + 2, 1, 1, C.Y, S); return; }
      bx(ctx, x, y, 1, 1, C.r, S); bx(ctx, x - 2, y + 1, 5, 1, C.r, S); bx(ctx, x - 1, y + 2, 3, 2, C.r, S);
      bx(ctx, x - 2, y + 4, 1, 1, C.r, S); bx(ctx, x + 2, y + 4, 1, 1, C.r, S); bx(ctx, x, y + 2, 1, 1, C.y, S);
      bx(ctx, x - 2, y + 5, 1, 1, C.y, S); bx(ctx, x + 2, y + 5, 1, 1, C.y, S);
    } },
    shimenawa: { rope: "#e2c27a", thick: 2, step: 7, orn: function (ctx, S, x, y, k, now, pass) {
      if (pass) { return; }
      bx(ctx, x, y + 1, 2, 1, C.w, S); bx(ctx, x + 1, y + 2, 2, 1, C.w, S); bx(ctx, x, y + 3, 2, 1, C.w, S); bx(ctx, x + 1, y + 4, 2, 1, C.w, S);
      if (k % 3 === 1) { bx(ctx, x + 4, y + 1, 1, 3, C.r, S); bx(ctx, x + 5, y + 1, 1, 3, C.w, S); }
    } },
    furin: { rope: "#8a8fa8", step: 10, orn: function (ctx, S, x, y, k, now, pass) {
      if (pass) { return; }
      const sw = Math.round(Math.sin(now / 450 + k * 1.3) * 0.9);
      bx(ctx, x - 1, y, 3, 1, "#bfe9ff", S); bx(ctx, x - 2, y + 1, 5, 2, "#bfe9ff", S); bx(ctx, x - 1, y + 1, 1, 1, [C.r, C.d, C.g][k % 3], S);
      bx(ctx, x, y + 3, 1, 1, C.S, S); bx(ctx, x + sw, y + 4, 1, 3, k % 2 ? C.r : C.w, S);
    } }
  };
  // y của dây võng tại x (toạ độ cảnh, cố định theo x nên không nhảy khi cảnh cuộn rộng ra)
  function ropeY(x, y0, L, sag) { const f = (((x % L) + L) % L) / L; return y0 + sag * Math.sin(Math.PI * f); }
  function garland(ctx, S, ox, oy, x0, x1, y0, now, style, pass, opt) {
    const g = GARLAND[style];
    if (!g) { return; }
    const L = (opt && opt.L) || 44, sag = (opt && opt.sag) || 4;
    if (!pass) {
      ctx.fillStyle = g.rope;
      for (let x = Math.floor(x0); x < x1; x++) {
        const y = Math.round(ropeY(x, y0, L, sag));
        ctx.fillRect(Math.round((ox + x) * S), Math.round((oy + y) * S), S, S * (g.thick || 1));
        if (g.thick && x % 3 === 0) { bx(ctx, ox + x, oy + y, 1, 1, shade(g.rope, 0.78), S); }
      }
    }
    const step = g.step;
    for (let k = Math.floor(x0 / step) - 1; k * step < x1 + step; k++) {
      const x = k * step + 2;
      if (((x % L) + L) % L < 2) { continue; }     // không treo đồ ngay tại điểm buộc
      g.orn(ctx, S, ox + x, oy + Math.round(ropeY(x, y0, L, sag)) + (g.thick || 1), k, now, pass);
    }
  }

  // ---------------------------------------------------------------------
  // Hạt bay (tính thẳng từ thời gian): petal, leaf, gleaf, ypetal, flake, firefly, bfly, tonbo, tonboR, bat, wisp, drop, star
  // ---------------------------------------------------------------------
  function flyer(ctx, S, ox, oy, kind, i, now, X0, W, Y0, H, scale) {
    const sc = scale || 1, t = now / 1000;
    const r1 = hash(i * 7 + 1), r2 = hash(i * 13 + 5), r3 = hash(i * 29 + 11);
    if (kind === "petal" || kind === "leaf" || kind === "gleaf" || kind === "ypetal" || kind === "flake" || kind === "lixi") {
      const vy = (kind === "flake" ? 5 : 7) + r2 * 5, vx = kind === "flake" ? 1 + r3 * 2 : 3 + r3 * 4;
      const x = X0 + ((r1 * W + t * vx * sc + Math.sin(t * (1 + r3) + i) * 3 * sc) % W + W) % W;
      const y = Y0 + ((r2 * H + t * vy * sc) % H);
      const f = Math.floor(t * (3 + r3 * 3) + i) % 2;
      if (kind === "petal") { bx(ctx, ox + x, oy + y, 1, 1, f ? C.p : C.P, S); }
      else if (kind === "ypetal") { bx(ctx, ox + x, oy + y, 1, 1, f ? C.y : C.i, S); }
      else if (kind === "lixi") { bx(ctx, ox + x, oy + y, 2, 3, C.r, S); bx(ctx, ox + x, oy + y + 1, 2, 1, C.i, S); }
      else if (kind === "flake") {
        if (i % 5 === 0) { bx(ctx, ox + x - 1, oy + y, 3, 1, C.w, S); bx(ctx, ox + x, oy + y - 1, 1, 3, C.w, S); }
        else { bx(ctx, ox + x, oy + y, 1, 1, C.w, S); }
      } else if (kind === "gleaf") { bx(ctx, ox + x, oy + y, f ? 2 : 1, 1, C.y, S); bx(ctx, ox + x + (f ? 0 : 1), oy + y + 1, 1, 1, C.i, S); }
      else { const c = [C.r, C.o, C.y, C.R][i % 4]; bx(ctx, ox + x, oy + y, f ? 2 : 1, 1, c, S); if (!f) { bx(ctx, ox + x, oy + y + 1, 1, 1, c, S); } }
      return;
    }
    if (kind === "drop") {     // giọt mưa lăn trên lá (tsuyu): lấp lánh trên mặt đất
      const per = 1.4 + r2, ph = ((t + r1 * 10) % per) / per;
      if (ph > 0.25) { return; }
      const x = X0 + Math.floor((r1 + Math.floor((t + r1 * 10) / per) * 0.37) % 1 * W), y = Y0 + r3 * H;
      ctx.globalAlpha = 1 - ph * 4; bx(ctx, ox + x, oy + y, 1, 1, "#e8f7ff", S); ctx.globalAlpha = 1;
      return;
    }
    if (kind === "star") {
      if ((Math.floor(t * 2 + r1 * 10) + i) % 4 === 0) { return; }
      const x = X0 + r1 * W, y = Y0 + r2 * H;
      bx(ctx, ox + x, oy + y, 1, 1, i % 3 ? C.Y : C.w, S);
      if (i % 7 === 0 && Math.floor(t * 3 + i) % 2) { bx(ctx, ox + x - 1, oy + y, 3, 1, C.Y, S); bx(ctx, ox + x, oy + y - 1, 1, 3, C.Y, S); }
      return;
    }
    // bay lượn: đường cong khép kín quanh một điểm, trôi chậm sang ngang
    const cx = X0 + ((r1 * W + t * (2 + r3 * 3) * (i % 2 ? 1 : -1) * sc) % W + W) % W;
    const cy = Y0 + r2 * H;
    const x = cx + Math.sin(t * (0.7 + r3) + i) * 6 * sc, y = cy + Math.sin(t * (1.1 + r2) + i * 2) * 3 * sc;
    if (kind === "firefly") {
      const a = 0.5 + 0.5 * Math.abs(Math.sin(t * 2 + i));
      ctx.globalAlpha = 0.3 * a; bx(ctx, ox + x - 1, oy + y - 1, 3, 3, "#fff6a8", S);
      ctx.globalAlpha = a; bx(ctx, ox + x, oy + y, 1, 1, "#ffe95c", S); ctx.globalAlpha = 1;
    } else if (kind === "bfly") {
      const up = Math.floor(t * 8 + i) % 2, c = i % 2 ? "#ffe95c" : C.w;
      bx(ctx, ox + x, oy + y, 1, 1, C.k, S); bx(ctx, ox + x - 1, oy + y - up, 1, 1, c, S); bx(ctx, ox + x + 1, oy + y - up, 1, 1, c, S);
    } else if (kind === "tonbo" || kind === "tonboR") {
      const dir = Math.cos(t * (0.7 + r3) + i) > 0 ? 1 : -1, up = Math.floor(t * 16 + i) % 2;
      bx(ctx, ox + x - 2 * dir, oy + y, 4, 1, kind === "tonboR" ? C.r : "#3a8ad8", S);
      bx(ctx, ox + x - 1, oy + y - 1 + up, 1, 1, "#d8f4ff", S); bx(ctx, ox + x + 1, oy + y - 1 + up, 1, 1, "#d8f4ff", S);
    } else if (kind === "bat") {
      const up = Math.floor(t * 9 + i) % 2;
      bx(ctx, ox + x, oy + y, 2, 1, "#2b2140", S); bx(ctx, ox + x - 2, oy + y - up, 2, 1, "#2b2140", S); bx(ctx, ox + x + 2, oy + y - up, 2, 1, "#2b2140", S);
      bx(ctx, ox + x, oy + y - 1, 1, 1, "#2b2140", S); bx(ctx, ox + x + 1, oy + y - 1, 1, 1, "#2b2140", S);
    } else if (kind === "wisp") {
      const a = 0.5 + 0.5 * Math.sin(t * 1.7 + i);
      ctx.globalAlpha = 0.25 * a; bx(ctx, ox + x - 1, oy + y - 1, 3, 3, "#c8a0ff", S);
      ctx.globalAlpha = 0.8 * a; bx(ctx, ox + x, oy + y, 1, 1, "#efe0ff", S); ctx.globalAlpha = 1;
    }
  }
  const FLY_OK = { bfly: "day", tonbo: "day", tonboR: "day", firefly: "night", bat: "dusk", wisp: "night" };
  function okNow(kind, st) {
    const w = FLY_OK[kind];
    if (!w) { return true; }
    if (st && (st.rain || st.snow) && kind !== "bat" && kind !== "wisp") { return false; }
    if (w === "day") { return !st || st.light > 0.6; }
    if (w === "night") { return st && st.light < 0.5; }
    return st && st.light < 0.75;      // dusk: hoàng hôn và đêm
  }

  // pháo hoa không lưu hạt: mỗi "khe" bắn một quả theo chu kỳ
  function fireworks(ctx, S, ox, oy, now, X0, W, H, cols, slots, topY) {
    for (let s = 0; s < slots; s++) {
      const per = 1900 + s * 370, tt = now + s * 811, cyc = Math.floor(tt / per), p = (tt % per) / per;
      const cx = X0 + hash(cyc * 7 + s) * W, cy = topY + 3 + hash(cyc * 3 + s * 5) * Math.max(4, H * 0.45);
      const col = cols[Math.floor(hash(cyc + s * 17) * cols.length)];
      if (p < 0.22) {      // pháo bay lên
        const yy = H - (H - cy) * (p / 0.22);
        bx(ctx, ox + cx, oy + yy, 1, 2, "#fff6c8", S);
        continue;
      }
      const q = (p - 0.22) / 0.78, r = 2 + q * 11, n = 14;
      ctx.globalAlpha = Math.max(0, 1 - q);
      for (let k = 0; k < n; k++) {
        const a = k / n * Math.PI * 2, x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r + q * q * 4;
        bx(ctx, ox + x, oy + y, 1, 1, q < 0.2 ? C.w : col, S);
        if (q < 0.6) { bx(ctx, ox + cx + Math.cos(a) * r * 0.6, oy + cy + Math.sin(a) * r * 0.6 + q * q * 3, 1, 1, col, S); }
      }
      ctx.globalAlpha = 1;
    }
  }

  // ---------------------------------------------------------------------
  // Cảnh ngoài trời (home.js gọi)
  // ---------------------------------------------------------------------
  function skyExtra(ctx, S, ox, oy, now, x0, x1, H, st) {
    const v = V();
    if (!v) { return; }
    const W = x1 - x0, fx = v.sky || [];
    if (fx.indexOf("milky") >= 0 && st.light < 0.5) {       // Ngân Hà chéo trời
      for (let x = Math.floor(x0); x < x1; x++) {
        const u = ((x % 260) + 260) % 260 / 260, yc = H - 2 - u * (H - 4) + Math.sin(x / 9) * 1.5;
        ctx.globalAlpha = 0.16; bx(ctx, ox + x, oy + yc - 3, 1, 6, "#c8d8ff", S);
        ctx.globalAlpha = 0.28; bx(ctx, ox + x, oy + yc - 1, 1, 2, "#e8eeff", S);
        if (hash(x * 5) < 0.35) { ctx.globalAlpha = 0.9; bx(ctx, ox + x, oy + yc + Math.floor(hash(x * 3) * 7) - 3, 1, 1, C.w, S); }
      }
      ctx.globalAlpha = 1;
    }
    if (fx.indexOf("kites") >= 0 && st.light > 0.55 && !st.rain) {     // diều bay trên trời (お正月)
      [[0.22, 6, C.r], [0.7, 9, C.d]].forEach(([u, y, c], k) => {
        const x = x0 + W * u + Math.sin(now / 1700 + k * 2) * 5, yy = y + Math.cos(now / 1300 + k) * 1.5;
        bx(ctx, ox + x, oy + yy, 3, 3, C.w, S); bx(ctx, ox + x + 1, oy + yy + 1, 1, 1, c, S);
        bx(ctx, ox + x, oy + yy, 3, 1, c, S);
        for (let j = 0; j < 4; j++) { bx(ctx, ox + x + 1 + Math.round(Math.sin(now / 250 + j) * 0.7), oy + yy + 3 + j, 1, 1, j % 2 ? C.y : c, S); }
      });
    }
    if (fx.indexOf("sleigh") >= 0 && st.light < 0.5) {      // xe tuần lộc bay ngang trời đêm Noel
      const per = 32000, t = now % per;
      if (t < 9000) {
        const x = x1 + 10 - (W + 40) * t / 9000, y = 5 + Math.sin(t / 900) * 2;
        const col = "#2a2a48";
        for (let k = 0; k < 2; k++) {       // hai con tuần lộc
          const rx = x + k * 6;
          bx(ctx, ox + rx, oy + y + 1, 4, 2, col, S); bx(ctx, ox + rx - 1, oy + y, 1, 2, col, S); bx(ctx, ox + rx - 1, oy + y - 1, 1, 1, col, S);
          bx(ctx, ox + rx, oy + y + 3, 1, 1, col, S); bx(ctx, ox + rx + 3, oy + y + 3, 1, 1, col, S);
        }
        bx(ctx, ox + x - 2, oy + y + 1, 1, 1, Math.floor(now / 300) % 2 ? "#ff6a6a" : C.r, S);
        bx(ctx, ox + x + 13, oy + y + 1, 6, 3, col, S); bx(ctx, ox + x + 18, oy + y - 1, 2, 3, col, S); bx(ctx, ox + x + 12, oy + y + 4, 8, 1, col, S);
        bx(ctx, ox + x + 14, oy + y, 2, 1, C.r, S);
        for (let k = 0; k < 8; k++) {
          ctx.globalAlpha = 1 - k / 8;
          bx(ctx, ox + x + 21 + k * 2, oy + y + 2 + Math.sin(now / 120 + k) * 1.2, 1, 1, k % 2 ? C.Y : C.y, S);
        }
        ctx.globalAlpha = 1;
      }
    }
  }
  function decorHills(ctx, S, ox, oy, x0, x1, top, st) {
    const v = V();
    if (!v || !v.hillDots) { return; }
    const dens = v.hillDens || 0.3, k = 0.5 + 0.5 * st.light;
    for (let i = Math.floor(x0); i < x1; i++) {
      if (hash(i * 31 + 7) > dens) { continue; }
      const hh = 5 + Math.round(3 * Math.sin(i / 17) + 2 * Math.sin(i / 7));
      const y = top - 1 - Math.floor(hash(i * 17) * (hh - 1));
      bx(ctx, ox + i, oy + y, 1, 1, shade(v.hillDots[Math.floor(hash(i * 5) * v.hillDots.length)], k), S);
    }
  }
  function decorGround(ctx, S, ox, oy, x0, x1, G0, H, st) {
    const v = V();
    if (!v || !v.groundDots) { return; }
    const dens = v.groundDens || 0.3, k = 0.5 + 0.5 * st.light;
    for (let n = Math.floor(x0 / 4); n * 4 < x1; n++) {
      if (hash(n * 11 + 3) > dens) { continue; }
      const x = n * 4 + Math.floor(hash(n * 7) * 4), y = G0 + 2 + Math.floor(hash(n * 23 + 1) * (H - G0 - 3));
      const c = shade(v.groundDots[Math.floor(hash(n * 3) * v.groundDots.length)], k);
      bx(ctx, ox + x, oy + y, 1, 1, c, S);
      if (hash(n * 41) < 0.3) { bx(ctx, ox + x + 1, oy + y, 1, 1, c, S); }
    }
  }
  function sceneGarland(ctx, S, ox, oy, now, x0, x1, pass, st) {
    const v = V();
    if (!v || !v.garland) { return; }
    if (pass && st.light >= 0.6) { return; }
    garland(ctx, S, ox, oy, x0, x1, 1, effects() ? now : 0, v.garland, pass);
  }
  function ambient(ctx, S, ox, oy, now, x0, x1, H, st) {
    const v = V();
    if (!v || !effects()) { return; }
    const W = x1 - x0;
    (v.ambient || []).forEach(([kind, per100], kk) => {
      if (!okNow(kind, st)) { return; }
      if ((kind === "petal" || kind === "leaf" || kind === "ypetal" || kind === "gleaf") && (st.rain || st.snow)) { return; }
      const n = Math.max(1, Math.round(W / 100 * per100));
      const top = kind === "drop" ? 30 : kind === "firefly" || kind === "bfly" || kind === "tonbo" || kind === "tonboR" ? 26 : 0;
      const h = kind === "bat" || kind === "wisp" ? 30 : H - top;
      for (let i = 0; i < n; i++) { flyer(ctx, S, ox, oy, kind, i + kk * 101, now, x0, W, top, h); }
    });
  }
  function nightTop(ctx, S, ox, oy, now, x0, x1, H, st) {
    const v = V();
    if (!v) { return; }
    if ((v.sky || []).indexOf("fireworks") >= 0 && st.light < 0.5 && !st.rain && effects()) {
      fireworks(ctx, S, ox, oy, now, x0, x1 - x0, 26, v.fw || [C.r, C.y, C.l], Math.max(2, Math.round((x1 - x0) / 150)), 0);
    }
    sceneGarland(ctx, S, ox, oy, now, x0, x1, 1, st);
  }
  // Trong phòng: dây trang trí dưới xà nhà
  function room(ctx, S, ox, oy, now, W, pass, st) {
    const v = V();
    if (!v || !v.room) { return; }
    if (pass && (!st || st.light >= 0.6)) { return; }
    garland(ctx, S, ox, oy, 0, W, 6, effects() ? now : 0, v.room, pass, { L: 40, sag: 3 });
  }
  // Mặt trăng to (Trung thu, Halloween)
  function bigMoon(ctx, S, X, Y, st) {
    const c = st.bigMoon;
    ctx.globalAlpha = 0.18; bx(ctx, X - 3, Y - 3, 15, 15, c, S); ctx.globalAlpha = 1;
    for (let j = 0; j < 11; j++) {
      for (let i = 0; i < 11; i++) { if ((i - 5) * (i - 5) + (j - 5) * (j - 5) <= 28) { bx(ctx, X + i - 1, Y + j - 1, 1, 1, c, S); } }
    }
    const d = shade(c, 0.86);
    [[2, 3], [6, 6], [3, 7], [7, 2]].forEach(([i, j]) => bx(ctx, X + i, Y + j, 1, 1, d, S));
    if (st.rabbit) { [[4, 4], [5, 4], [4, 5], [5, 5], [6, 5], [3, 3], [4, 2]].forEach(([i, j]) => bx(ctx, X + i, Y + j, 1, 1, shade(c, 0.78), S)); }
  }

  // ---------------------------------------------------------------------
  // Ruộng (garden.js / fx.js)
  // ---------------------------------------------------------------------
  function field() { const v = V(); return v ? v.field : null; }
  function drawField(ctx, W, H, now, s) {
    const v = V();
    if (!v || !v.fieldFx || !effects()) { return; }
    const sk = typeof GardenSky !== "undefined" ? GardenSky.state() : null;
    if (sk && (sk.rain || sk.snow) && v.fieldFx !== "flake") { return; }
    const Wa = W / s, Ha = H / s, n = Math.min(70, Math.round(Wa * Ha / 1500));
    for (let i = 0; i < n; i++) { flyer(ctx, s, 0, 0, v.fieldFx, i, now, 0, Wa, 0, Ha, 1.6); }
  }

  // ---------------------------------------------------------------------
  // Trang: dải trang trí trên cùng + hạt rơi ở nền
  // ---------------------------------------------------------------------
  const BAND_S = 3, BAND_H = 9;
  function uiSkyOff() { return typeof GardenUI !== "undefined" && GardenUI.get && GardenUI.get("sky") === "off"; }
  function drawBand(now) {
    const cv = $("kb-theme-band"), v = V();
    if (!cv) { return; }
    if (uiSkyOff()) { now = 0; }    // 1.14: tắt hạt bay → dải trang trí đứng yên
    if (!v) { if (!cv.hidden) { cv.hidden = true; } return; }
    cv.hidden = false;
    const w = cv.clientWidth || window.innerWidth, dpr = 1;
    if (cv.width !== w * dpr || cv.height !== BAND_H * BAND_S) { cv.width = w * dpr; cv.height = BAND_H * BAND_S; }
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, cv.width, cv.height);
    garland(ctx, BAND_S, 0, 0, 0, w / BAND_S + 2, 0, effects() ? now : 0, v.band, 0, { L: 40, sag: 2 });
    const sk = typeof GardenSky !== "undefined" ? GardenSky.state() : null;
    if (sk && sk.light < 0.6) { garland(ctx, BAND_S, 0, 0, 0, w / BAND_S + 2, 0, now, v.band, 1, { L: 40, sag: 2 }); }
  }
  function drawBg(now) {
    const cv = $("kb-theme-bg"), v = V();
    if (!cv) { return; }
    if (!v || !v.bg || !effects() || uiSkyOff()) { if (!cv.hidden) { cv.hidden = true; } return; }
    cv.hidden = false;
    const S = 3, w = window.innerWidth, h = window.innerHeight;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, w, h);
    const Wa = w / S, Ha = h / S;
    if (v.bg === "fw") {
      ctx.globalAlpha = 0.8;
      fireworks(ctx, S, 0, 0, now, 0, Wa, Ha * 0.6, VIS.natsumatsuri.fw, 3, 5);
      ctx.globalAlpha = 1;
      return;
    }
    if (v.bg === "rain") {
      ctx.fillStyle = "rgba(220,235,255,0.55)";
      const n = Math.round(Wa * Ha / 900);
      for (let i = 0; i < n; i++) {
        const x = (hash(i) * Wa + now * 0.012) % Wa, y = (hash(i + 77) * Ha + now * 0.09) % Ha;
        ctx.fillRect(Math.round(x) * S, Math.round(y) * S, S / 1.5, S * 3);
      }
      return;
    }
    if (v.bg === "gold") {
      const n = Math.round(Wa * Ha / 2600);
      for (let i = 0; i < n; i++) {
        if ((Math.floor(now / 400) + i) % 5) { continue; }
        bx(ctx, hash(i * 3) * Wa, hash(i * 7) * Ha, 1, 1, i % 2 ? C.Y : C.y, S);
      }
      return;
    }
    const n = Math.min(90, Math.round(Wa * Ha / (v.bg === "star" ? 900 : v.bg === "bat" ? 9000 : 1700)));
    for (let i = 0; i < n; i++) { flyer(ctx, S, 0, 0, v.bg, i, now, 0, Wa, 0, Ha, 1.5); }
    if (v.bg === "ypetal") { for (let i = 0; i < Math.round(n / 8); i++) { flyer(ctx, S, 0, 0, "lixi", i + 500, now, 0, Wa, 0, Ha, 1.1); } }
  }

  // ---------------------------------------------------------------------
  // Áp dụng: thuộc tính trên trang, chip chủ đề, chào khi đổi
  // ---------------------------------------------------------------------
  function themeInfo(id) { return themes().find((t) => t.id === id) || null; }
  function apply() {
    const id = activeId(), v = id ? VIS[id] : null;
    const app = $("kb-app");
    document.documentElement.setAttribute("data-kb-theme", id || "");
    if (app) {
      app.classList.toggle("kb-themed", !!v);
      app.style.setProperty("--kb-title", v ? v.title : "#ffffff");
    }
    syncChip();
  }
  function syncChip() {
    const chip = $("kb-theme-chip");
    if (!chip) { return; }
    const id = activeId(), info = id ? themeInfo(id) : null;
    let teaser = null;
    if (!info && settings().mode !== "off") {
      teaser = themes().find((t) => t.now && t.kind === "event" && (settings().unlocked || []).indexOf(t.id) < 0) || null;
    }
    const show = info || teaser;
    chip.hidden = !show;
    if (!show) { return; }
    const key = (info ? "a:" : "t:") + show.id;
    if (chip.getAttribute("data-key") === key) { return; }
    chip.setAttribute("data-key", key);
    chip.textContent = "";
    chip.classList.toggle("kb-theme-teaser", !info);
    const ic = typeof GardenHome !== "undefined" && GardenHome.icon ? GardenHome.icon(show.icon, 26) : null;
    if (ic) { ic.className = "kb-theme-ico"; chip.appendChild(ic); }
    const sp = document.createElement("span");
    sp.className = "kb-theme-name";
    sp.textContent = info ? show.name : show.name + " tới rồi ▸";
    chip.appendChild(sp);
    chip.title = info ? "Giao diện mùa: " + show.name + " · bấm để đổi" :
      show.name + " (" + show.start + " – " + show.end + ") · bấm để xem Giao diện mùa";
  }
  let greeted = null;
  function refresh() {
    const before = cur;
    cur = computeActive();
    skyCache = { src: null, id: null, out: null };
    apply();
    if (cur !== before) {
      listeners.forEach((fn) => { try { fn(cur, before); } catch (e) { /* bỏ qua */ } });
      if (cur && cur !== greeted && typeof GardenFX !== "undefined" && GardenFX.say) {
        greeted = cur;
        setTimeout(() => { GardenFX.mood("happy", 2000); GardenFX.say(VIS[cur] ? VIS[cur].greet : "", 2800); }, before === null ? 1200 : 300);
      }
    }
  }

  // vòng vẽ dải trang trí + nền (~12 khung/giây, ~3 khi cửa sổ ở nền)
  let last = -1;
  function loop(ts) {
    // 10 khung/giây (~3 khi ở nền), cùng nhịp với ruộng / sân (xem fx.js)
    const every = document.hasFocus() ? 3 : 10, tk = Math.floor(Math.floor(ts / 33.34) / every);
    if (tk !== last) {
      last = tk;
      if (!document.hidden) { const now = Date.now(); drawBand(now); drawBg(now); }
    }
    requestAnimationFrame(loop);
  }

  return {
    init: function (helpers) {
      G = helpers;
      const chip = $("kb-theme-chip");
      if (chip) {
        chip.addEventListener("mousedown", (ev) => ev.preventDefault());
        chip.addEventListener("click", (ev) => { ev.stopPropagation(); if (G.openSeason) { G.openSeason(); } });
      }
      requestAnimationFrame(loop);
    },
    refresh: refresh,
    onChange: function (fn) { listeners.push(fn); },
    active: activeId,
    current: () => cur,
    previewing: () => preview,
    preview: function (id) {
      const before = activeId();
      preview = id && VIS[id] ? id : null;
      skyCache = { src: null, id: null, out: null };
      apply();
      if (activeId() !== before) { listeners.forEach((fn) => { try { fn(activeId(), before); } catch (e) { /* bỏ qua */ } }); }
    },
    withTheme: function (id, fn) {    // vẽ tạm với một chủ đề (ảnh xem trước)
      const keep = forced; forced = id; skyCache = { src: null, id: null, out: null };
      try { return fn(); } finally { forced = keep; skyCache = { src: null, id: null, out: null }; }
    },
    vis: V, VIS: VIS, themeSky: themeSky, weatherBias: weatherBias, foliage: foliage,
    skyExtra: skyExtra, decorHills: decorHills, decorGround: decorGround, garland: sceneGarland, ambient: ambient,
    nightTop: nightTop, room: room, bigMoon: bigMoon, field: field, drawField: drawField,
    // cho test
    _garland: garland, _styles: Object.keys(GARLAND), _compute: computeActive
  };
})();
