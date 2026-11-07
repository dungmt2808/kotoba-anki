/* ことば畑 – 1.21: khách ghé vườn.
   Python (guest_core.py) giữ ai được ghé cảnh nào (theo đồ đã đặt, vùng, tháng), tần suất (theo số cây Ra quả) và album
   (data.guests). File này chỉ vẽ: mỗi cảnh chia thời gian thật thành khung 4 phút, mỗi khung có (hoặc không) một vị khách
   chọn theo giờ / thời tiết của trời đang hiện; khách đi vào, ở lại một lúc cạnh món đồ mình thích rồi đi.
   Khách ở trên màn hình đang hiện ≥ 1,5 giây thì báo Python `guest:met:<id>:<cảnh>` (mỗi khách một lần mỗi ngày). */
var GardenGuests = (function () {
  "use strict";
  const PAL = {"k": "#1b1b2f", "g": "#3ccb5e", "G": "#2e8b3a", "j": "#1f5f2a", "f": "#b8e05a", "b": "#8a4a22", "B": "#5a3010",
    "y": "#ffd23f", "Y": "#e9a800", "o": "#ff9f1c", "O": "#d9620a", "p": "#ff7fa0", "P": "#ffc4d6", "r": "#ff4f6d",
    "R": "#c21f3a", "w": "#ffffff", "c": "#fff2b3", "t": "#e2a46a", "s": "#d4d4e0", "S": "#8a8fa8", "u": "#2f5fb0",
    "l": "#8fd3ff", "e": "#f4efe6", "v": "#c77dff", "m": "#9aa0b5", "n": "#3a3a55", "h": "#b98552", "H": "#7a4e2a",
    "d": "#3d8bff", "a": "#6b6f86", "A": "#43465a", "i": "#f2e6c8", "x": "#5b3f7a", "X": "#3a2752", "q": "#9b7bd0",
    "z": "#e8e8f2", "Z": "#c9c9d8"};
  // Hình dựng bằng tests/tools/art/guests.py (hình cơ bản + tự viền), mặt quay sang phải
  const SPR = {
    "suzume": {
      "stand": ["........kk..", "k......kHHk.", "Hk....kHHHHk", "kHkkkkkHwkHa", ".kHhhhhwHwHk", ".khBhBhhkHk.", ".khhhiiihk..", "..khhiiik...", "...kkakak..."],
      "peck": ["............", "k...........", "Hk..kkk.....", "kHkkhhhkk...", ".kHBhBhhhkk.", ".khhhhhHHHHk", ".khhiiiwkHHk", "..kkiiiHwwak", "....kakakkk."]
    },
    "neko": {
      "walk0": ["................", "...........k.k..", "k.........koknk.", "ok.......koownnk", "kwk...kkkkwwwwwk", "kwkkkkwwwkwkwkwk", ".kwwooowwwwwwwwk", "..kwooownnwwpwk.", "..kwwwwwnnwwkk..", "..kwwwwwwwwwk...", "...kwkwwwwkk....", "....kwkkkkwk....", ".....k....k....."],
      "walk1": ["................", "...........k.k..", "k.........koknk.", "ok.......koownnk", "kwk...kkkkwwwwwk", "kwkkkkwwwkwkwkwk", ".kwwooowwwwwwwwk", "..kwooownnwwpwk.", "..kwwwwwnnwwkk..", "..kwwwwwwwwwk...", "..kwkkwwwkwk....", "..kwk.kkk.kwk...", "...k.......k...."],
      "sit": [".......k....k...", "......kokkkknk..", "......koowwnnk..", ".......kwwwwk...", "......kwkwwkwk..", ".....kkwwwwwwk..", "....kwwwwwpwk...", "...kooowwwwk....", ".k.kooowwwk.....", "kokkooowwwk.....", ".kwkwwwnnwk.....", ".kwkwwwnnwk.....", "..kwkwwwwk......"],
      "groom": ["................", "........k...k...", ".......kokkknk..", ".......kowwwnk..", ".......kwwwwwk..", ".....kkkwkwkwk..", "....kwwwwwwwwk..", "...kooowwwwwPk..", ".k.kooowwwwwk...", "kokkooowwwkk....", ".kwkwwwnnwk.....", ".kwkwwwnnwk.....", "..kwkwwwwk......"],
      "lie": ["................", "................", "................", "................", "...........k..k.", "..........kwkkwk", "..........koowwk", "...kkkkkkkkwwwwk", "..kwooowwwwwkwk.", ".kwwooownnnwwwwk", "kwwwwwwwnnnwwpwk", "wkkwwwwwwwwwwkk.", "ok.kkkkkkkkkk..."]
    },
    "cho": {
      "f0": [".kknknkk.", "kyoynyoyk", ".kyynyyk.", "kyyynyyyk", "kyyynyyyk", ".kkynykk.", ".kdynydk.", "..kkkkk.."],
      "f1": ["..knkk...", "..kykyk..", "..kyyyk..", "..kykyk..", "..kyyok..", "...knk...", "...knk...", "....k...."]
    },
    "kaeru": {
      "sit": ["...k..k....", "..kgkkgkk..", "..kgwggwgk.", ".kgggggggk.", ".kgGgggGgk.", "kgggGGGgggk", "gggkgggkggg"],
      "croak": ["...k..k....", "..kgkkgkk..", "..kgwggwgk.", ".kgggggggk.", ".kgGgggGgk.", "kgggcccgggk", "gggkccckggg"]
    },
    "sagi": {
      "stand": ["......kzk.k...", ".......kzkwkkk", "........kwkyyy", "........kwwwkk", ".......kwwkk..", ".......kwwk...", "k...kkkkkwk...", "zkkkwwwwkwwk..", "kzwwwwwwwwk...", ".kzZZwwwwwk...", ".kwwwZZZwwk...", "..kkwwwwkk....", "....kkkk......", ".....k.k......", ".....kk.......", ".....k........", "....kkk......."],
      "dip": ["..............", "..............", "..............", "..............", "..............", "k...kkkk......", "zkkkwwwwkk....", "kzwwwwwwwwk...", ".kzZZwwwwwk...", ".kwwwZZZwwwk..", "..kkwwwwkkwwk.", "....kkkk..kwk.", ".....k.k..kwyk", ".....k.k...kky", ".....k.k....ky", ".....k.k.....k", ".....kkkk....."]
    },
    "tanuki": {
      "walk0": ["................", "..........kk.kk.", ".........kAAkAAk", ".........kAAtAAk", ".kkk.kkkkkttwttk", "khhhktthtttAAAAk", "kAhhhhhhhhtttiik", "khhhttthttttttik", "khAhttttttttkkk.", ".kkttiiiiittk...", "...kAtAtAtAk....", "...kAkAkAkAk....", "....k.k.k.k....."],
      "walk1": ["................", "..........kk.kk.", ".........kAAkAAk", ".........kAAtAAk", ".kkk.kkkkkttwttk", "khhhktthtttAAAAk", "kAhhhhhhhhtttiik", "khhhttthttttttik", "khAhttttttttkkk.", ".kkttiiiiittk...", "..kAktAtAtkAk...", ".kAk.kkAkAkkAk..", "..k....k.k..k..."],
      "sit": [".......kk..kk...", "......kAAkkAAk..", "......kAAttAAk..", ".......kttttk...", "......ktwAtwtk..", "....kkttAAAAAk..", "...ktttttkkttk..", "..kktttttiitk...", ".khttttiittk....", "khAhhtiiittk....", "khhhhtiiitk.....", "kAhhhttiitk.....", ".khkkAAtAAk....."]
    },
    "kitsune": {
      "walk0": ["...........k..k..", "..........knkknk.", "..........kokkok.", "kkkkk.....kooook.", "wwoookkkkkkookok.", "wwoooooooooooook.", "koooooooooooowwok", ".kkoooooooooowwk.", "...kooowwwookkk..", "....kowwwwok.....", "....kokkkkok.....", "....knk..knk.....", ".....k....k......"],
      "walk1": ["...........k..k..", "..........knkknk.", "..........kokkok.", "kkkkk.....kooook.", "wwoookkkkkkookok.", "wwoooooooooooook.", "koooooooooooowwok", ".kkoooooooooowwk.", "...kooowwwookkk..", "...koowwwwwok....", "..kokkkkkkkkok...", "..knk......knk...", "...k........k...."],
      "sit": [".......knk.knk...", ".......kokkkok...", "........kkokk....", ".......koooook...", ".......kokokok...", "......kooooook...", ".....kooowwook...", "....koooowwkk....", ".kkkkooowwok.....", "kwoooooowwok.....", "wwwooooowwwk.....", "kwoooooowwk......", ".kkkkkknonk......"]
    },
    "shika": {
      "walk0": [".........kHkHHk.", "..........kHkHk.", ".........kHkhk..", "..........khkhk.", "..........khhhhk", "..........khhhk.", "kk..kkkkkkkhhk..", "iikkhhhhhhhhk...", "kikhihhhihhk....", ".khhhhihhhhhk...", "..khhiiihihk....", "...khiiiihk.....", "...kkkkkkkk.....", "...k.k..k.k.....", "...kk...k.k.....", "...kk...k.k....."],
      "walk1": [".........kHkHHk.", "..........kHkHk.", ".........kHkhk..", "..........khkhk.", "..........khhhhk", "..........khhhk.", "kk..kkkkkkkhhk..", "iikkhhhhhhhhk...", "kikhihhhihhk....", ".khhhhihhhhhk...", "..khhiiihihk....", "...khiiiihk.....", "...kkkkkkkk.....", "...k.k..k.k.....", "..k..k...k.k....", "..k..k...k.k...."],
      "graze": ["................", "................", "................", "................", "................", "................", "kk..kkkkkk......", "iikkhhhhhhkk....", "kikhihhhihhhk...", ".khhhhihhhhhhk.k", "..khhiiihihHHkkH", "...khiiiihkkhhHk", "...kkkkkkkkkhkhk", "...k.k..k.kkhhhk", "...kk...k.k.kkk.", "...kk...k.k....."]
    },
    "kamome": {
      "stand": ["...............", "..........k....", "......kk.kwkkk.", ".kkkkkwwkwwwyyk", "knnSSSSSSSwwkrk", ".kkwSSSSSwwk.k.", "...kwwwwwwk....", "....kkywyk.....", ".....kykyk.....", "......k.k......"],
      "fly0": [".knkk...knk....", "..kSSk..kSk....", "...kSSk.kSk....", "....kSSkSk.kk..", "..kkkwSSSwkwyk.", ".kwwwwwwwwwwk..", "..kkkwwwwwkk...", ".....kkkkk.....", "...............", "..............."],
      "fly1": ["...............", "...............", "...............", ".....kkkkk.kk..", "..kkkwwwwwkwyk.", ".kwwwwwwwwwwk..", "..kkkwSSSwkk...", ".kkkSSSkkSkk...", "knSSSkk..kSnk..", ".kkkk.....kk..."]
    },
    "tsubame": {
      "fly0": [".....knk.k....", "kk...knuknk...", "nnkk..knunkk..", "kknukkknnkkuk.", "..kkuuuuuuuunk", "..kkuuuwwwurk.", "kknukkkkkkkk..", "nnkk..........", "kk............"],
      "fly1": ["..............", "kk............", "nnkk.......k..", "kknukkkkkkkuk.", "..kkuuuuuuuunk", "..kkuuuwwwurk.", "kknukkknnkkk..", "nnkk.knkknk...", "kk..knk..knk.."]
    },
    "fukuro": {
      "sit": [".k.kkk.k.", "kHkhhhkHk", "khhhhhhhk", "khyhhhyhk", "kykyhykyk", "khyhohyhk", "khhhOhhhk", "khhiiihhk", "khiHiHihk", "khiiiiihk", ".khiHihk.", "..khihk..", "..kokok.."],
      "blink": [".k.kkk.k.", "kHkhhhkHk", "khhhhhhhk", "khhhhhhhk", ".kkkhkkk.", "khhhohhhk", "khhhOhhhk", "khhiiihhk", "khiHiHihk", "khiiiiihk", ".khiHihk.", "..khihk..", "..kokok.."]
    },
    "mejiro": {
      "sit": ["...........", "k......kkk.", "Gk..kkkwwfk", "kGkkfffwkfn", ".kfGffffwyk", ".kffcccfkk.", "..kfccck...", "...kakak..."],
      "hop": ["k......kkk.", "Gk..kkkwwfk", "kGkkfffwkfn", ".kfGffffwyk", ".kffcccfkk.", "..kfccck...", "...kkkk....", "...kakak..."]
    },
    "komori": {
      "f0": [".kk...k.k...kk.", "kqxkkkXkXkkkxqk", "kxxxxkkXkkxxxxk", ".kxxxxrXrxxxxk.", "..kkkxXXXxkkk..", ".....kXXXk.....", "......kXk......", ".......k......."],
      "f1": ["......k.k......", ".....kXkXk.....", "......kXk......", ".....krXrk.....", "...kkxXXXxkk...", "..kxxxXXXxxxk..", ".kxxxkkXkkxxxk.", ".kxkk..k..kkxk."]
    },
    "tsuru": {
      "stand": ["...........k....", "..........krk...", ".........krrwk..", ".........kwkykk.", ".........kwwwyyk", ".........knnkkk.", ".........knnk...", ".....kkkknnk....", "...kkwwwwnnk....", "..kwwwwwwnnk....", ".knnnnwwwwwk....", ".knnnnwwwwwk....", "..knkkwwkkk.....", "...k.kkkk.......", ".....k..k.......", ".....k..k.......", ".....k..k.......", ".....k..k.......", "....kk..kk......"],
      "dance": ["................", "...........kk...", "..........krrkk.", "k........kwkwyyk", "nk.......kwwynk.", "knk......knwnk..", "kwwk.....knnwk..", ".kwwk....knnk...", "..kwwkkkknnk....", "...kwwwwwnnk....", "...kwwwwwwwk....", "...kwwwwwwwk....", "....kwwwwwk.....", ".....kkkkk......", "......k.k.......", "......k.k.......", ".....k...k......", ".....k...k......", ".....k...k......"]
    },
    "okojo": {
      "sit": ["....k..k.", "...kwkkwk", "...kwwwwk", "...kwkwk.", "...kwwwpk", "...kwwwwk", "k.kwwwwk.", "kkkwwwwwk", "kwkwzzwwk", "kwkwzzwk.", ".kwwzzwk.", "..kkzkzk."],
      "peek": [".........", ".........", "....k..k.", "...kwkkwk", "...kwwwwk", "....kwwk.", "...kwwpwk", "...kwwwwk", "..kwwwwwk", "..kwwwwwk", "..kwwwwwk", "...kwwwk."]
    }
  };
  const SLOT = 240000;            // một khung 4 phút (giờ thật)
  const YARD = { W: 256, H: 76, SKY: 28 }, T = 16;
  // bên phải nhà / công trình (như thú nuôi); chừa mép phải để thẻ "Hôm nay" (cửa sổ 1024 px: từ x ≈ 249) không che khách
  const GROUND = { x0: 74, x1: 236, y0: 44, y1: 74 };
  const SPEED = { neko: 10, tanuki: 9, kitsune: 13, shika: 8, tsuru: 6, okojo: 12, suzume: 26, kaeru: 18, kamome: 22, sagi: 7 };
  // Chỗ đậu / đứng trên món đồ: độ cao chân tính từ đỉnh hình món (âm = trên đỉnh)
  const PERCH = { torii: 1, cedar: 7, sakura: 7, momiji: 7, pagoda: 2, lantern: 1, bench: 7 };
  const vis = {};                 // cảnh → khách đang ở (hoặc đang đi)
  const lastAt = {};
  const told = {};                // id → ngày đã báo Python (mỗi khách một lần mỗi ngày)
  const spotFn = {};              // cảnh → hàm tra chỗ các món đồ (home.js đưa vào mỗi khung)
  let H = null;

  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function salt(scene) { let h = 7; for (const ch of String(scene)) { h = (h * 31 + ch.charCodeAt(0)) % 100003; } return h; }
  function gv() { const d = H && H.data && H.data(); return (d && d.guests) || null; }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function wxOk(w, st, scene) {
    if (scene === "room" || !st) { return w !== "wet" && w !== "snow"; }
    const wet = st.rain > 0, snow = st.snow > 0 || !!st.cover;
    if (w === "dry") { return !wet; }
    if (w === "wet") { return wet; }
    if (w === "snow") { return snow; }
    if (w === "nosnow") { return !st.snow; }
    return true;
  }
  function todOk(def, st) { return def.tod.indexOf((st && st.tod) || "day") >= 0; }

  // Khách của khung giờ hiện tại ở cảnh này (null = không có ai): cố định theo khung, đổi khi trời đổi buổi / thời tiết
  function want(scene, now, st) {
    const v = gv();
    if (!v || !v.cand || !v.cand[scene]) { return null; }
    const slot = Math.floor(now / SLOT), sl = salt(scene);
    if (hash(slot * 31.7 + sl) >= (v.rate || 0)) { return null; }
    const t0 = slot * SLOT, start = t0 + hash(slot * 7.3 + sl) * 0.2 * SLOT, end = t0 + (0.75 + hash(slot * 13.1 + sl) * 0.25) * SLOT;
    if (now < start || now > end) { return null; }
    const list = v.cand[scene].filter((c) => v.defs[c[0]] && (SPR[c[0]] !== undefined || v.defs[c[0]].kind === "swarm") &&
      todOk(v.defs[c[0]], st) && wxOk(v.defs[c[0]].wx, st, scene));
    const sum = list.reduce((n, c) => n + c[1], 0);
    if (!sum) { return null; }
    let r = hash(slot * 17.9 + sl * 3) * sum;
    for (const c of list) { r -= c[1]; if (r < 0) { return { id: c[0], slot: slot, end: end }; } }
    return null;
  }

  // ---- chỗ đứng ----------------------------------------------------------------------------------------------------
  function pickSpot(def, scene, spots, seed) {
    const mine = (spots || []).filter((s) => (def.spot || []).indexOf(s.id) >= 0);
    if (!mine.length) { return null; }
    return mine[Math.floor(hash(seed) * mine.length) % mine.length];
  }
  // chỗ đứng có chạm vào món đồ nào không (chừa 7 điểm ảnh hai bên, chân trong khoảng đỉnh → đáy món)
  function onItem(x, y, busy, skip) {
    return (busy || []).some((b) => b !== skip && b.cell !== (skip && skip.cell) && x > b.left - 7 && x < b.right + 7 && y > b.top - 2 && y < b.bottom + 3);
  }
  function groundPoint(seed, busy) {
    let first = null;
    for (let k = 0; k < 8; k++) {
      const p = { x: GROUND.x0 + 10 + hash(seed + k * 13.7) * (GROUND.x1 - GROUND.x0 - 20), y: GROUND.y0 + 4 + hash((seed + k * 13.7) * 1.7) * (GROUND.y1 - GROUND.y0 - 6) };
      if (!first) { first = p; }
      if (!onItem(p.x, p.y, busy)) { return p; }
    }
    // 1.22.5: sân gần kín đồ, 8 lần bốc đều trúng đồ → dò lần lượt mặt đất (bắt đầu ở một chỗ theo seed) tìm chỗ trống;
    // trước đây khách đứng đè lên món đồ đầu tiên bốc được
    const xs = [], ys = [];
    for (let x = GROUND.x0 + 10; x <= GROUND.x1 - 10; x += 6) { xs.push(x); }
    for (let y = GROUND.y0 + 4; y <= GROUND.y1 - 2; y += 4) { ys.push(y); }
    const n = xs.length * ys.length, k0 = Math.floor(hash(seed * 7.9) * n);
    for (let i = 0; i < n; i++) {
      const j = (k0 + i) % n, x = xs[j % xs.length], y = ys[Math.floor(j / xs.length)];
      if (!onItem(x, y, busy)) { return { x: x, y: y }; }
    }
    return first;
  }
  // Chỗ khách sẽ ở lại: {x, y (chân), base (thứ tự vẽ), pose}
  function homeOf(id, def, scene, spots, seed, busy) {
    if (scene === "room") {          // vành khuyên: bậu cửa sổ
      return { x: 72 + hash(seed) * 14, y: 34, base: 34, pose: "sit" };
    }
    const sp = pickSpot(def, scene, spots, seed);
    const side = hash(seed * 2.3) < 0.5 ? -1 : 1;
    if (id === "neko" && sp && sp.id === "bench") { return { x: sp.cx, y: sp.top + PERCH.bench, base: sp.bottom + 0.5, pose: "lie", spot: sp }; }
    if (id === "fukuro") {
      if (sp && PERCH[sp.id] !== undefined) { return { x: sp.cx + (sp.id === "torii" ? side * 8 : side * 3), y: sp.top + PERCH[sp.id], base: sp.bottom + 0.5, pose: "sit", spot: sp }; }
      const g = groundPoint(seed, busy); return { x: g.x, y: g.y, base: g.y, pose: "sit" };
    }
    if (id === "sagi" || id === "kaeru") {
      if (sp) { return { x: side < 0 ? sp.left + 3 : sp.right - 3, y: sp.bottom - 1, base: sp.bottom + 0.5, pose: "sit", spot: sp }; }
      const g = groundPoint(seed, busy); return { x: g.x, y: g.y, base: g.y, pose: "sit" };
    }
    if (def.kind === "swarm") {        // đom đóm: lượn quanh món đồ, thấp gần mặt đất
      if (sp) { return { x: sp.cx, y: sp.top + (sp.bottom - sp.top) * 0.45, base: 999, pose: "fly", spot: sp }; }
      return { x: 110 + hash(seed) * 120, y: 50 + hash(seed * 3.1) * 14, base: 999, pose: "fly" };
    }
    if (def.kind === "fly") {
      if (sp) { return { x: sp.cx, y: sp.top - 4, base: 999, pose: "fly", spot: sp }; }
      return { x: 100 + hash(seed) * 100, y: 8 + hash(seed * 3.1) * 16, base: 999, pose: "fly" };
    }
    if (sp) {        // đứng cạnh món mình thích; bên đó có đồ khác thì sang bên kia
      const at = (sd) => Math.max(GROUND.x0, Math.min(GROUND.x1, sp.cx + sd * (sp.w / 2 + 9)));
      const sd = onItem(at(side), sp.bottom - 1, busy, sp) && !onItem(at(-side), sp.bottom - 1, busy, sp) ? -side : side;
      return { x: at(sd), y: sp.bottom - 1, base: sp.bottom - 1, pose: "sit", spot: sp };
    }
    const g = groundPoint(seed, busy); return { x: g.x, y: g.y, base: g.y, pose: "sit" };
  }

  function make(w, scene, spots) {
    const v = gv(), def = v.defs[w.id], seed = w.slot * 3.7 + salt(scene) + w.id.length;
    const home = homeOf(w.id, def, scene, spots, seed, spotFn[scene] ? spotFn[scene]("*") : []);
    const fromLeft = hash(seed * 5.1) < 0.35 && def.kind !== "perch";
    const a = { id: w.id, def: def, slot: w.slot, scene: scene, home: home, dir: fromLeft ? 1 : -1, act: "enter",
      x: 0, y: home.y, alpha: 1, t: 0, until: 0, frame: "", hop: 0, seen: 0, fx: [], seed: seed, pose: home.pose };
    if (def.kind === "perch" || def.kind === "swarm") { a.x = home.x; a.alpha = 0; }
    else if (def.kind === "fly") { a.x = fromLeft ? -16 : YARD.W + 16; a.y = Math.max(4, home.y - 16); }
    else { a.x = fromLeft ? GROUND.x0 - 30 : YARD.W + 14; if (scene === "room") { a.x = home.x + 20; } }
    if (def.kind === "swarm") {
      a.dots = [];
      for (let i = 0; i < 8; i++) { a.dots.push({ x: home.x + rnd(-18, 18), y: home.y + rnd(-10, 8), vx: 0, vy: 0, ph: rnd(0, 6) }); }
    }
    return a;
  }

  function exitX(a) { return a.dir > 0 ? YARD.W + 18 : -22; }

  function step(a, dt, now, want) {
    const def = a.def, h = a.home;
    a.t += dt;
    if (a.act !== "leave" && (!want || want.id !== a.id || want.slot !== a.slot)) {
      a.act = "leave";
      a.dir = a.x < 128 ? -1 : 1;
      if (def.kind === "walk" || def.kind === "hop") { a.frame = ""; }
    }
    if (def.kind === "perch" || def.kind === "swarm") {
      a.alpha = Math.max(0, Math.min(1, a.alpha + (a.act === "leave" ? -dt : dt) * 1.4));
      if (a.act === "enter" && a.alpha >= 1) { a.act = "stay"; }
      if (a.act === "leave" && a.alpha <= 0) { return false; }
      if (def.kind === "swarm") {
        a.dots.forEach((q) => {
          q.vx += (Math.random() - 0.5) * 14 * dt; q.vy += (Math.random() - 0.5) * 10 * dt; q.vx *= 0.97; q.vy *= 0.97;
          q.vx += (h.x - q.x) * 0.06 * dt; q.vy += (h.y - q.y) * 0.06 * dt;
          q.x += q.vx * dt * 4; q.y += q.vy * dt * 4;
        });
      }
      if (a.id === "sagi" && a.act === "stay" && now > a.until) { a.pose = a.pose === "dip" ? "stand" : (Math.random() < 0.4 ? "dip" : "stand"); a.until = now + rnd(1500, 4000); }
      if (a.id === "fukuro" && now > a.until) { a.blink = !a.blink && Math.random() < 0.5; a.until = now + (a.blink ? 220 : rnd(1500, 4500)); }
      if (a.id === "mejiro" && a.act === "stay" && now > a.until) { a.hop = 1; a.until = now + rnd(1200, 3500); }
      if (a.hop > 0) { a.hop = Math.max(0, a.hop - dt * 3); }
      return true;
    }
    if (def.kind === "fly") {
      const tx = a.act === "leave" ? exitX(a) : h.x + Math.sin(a.t * 0.7 + a.seed) * (h.spot ? 10 : 30);
      const ty = a.act === "leave" ? h.y - 12 : h.y + Math.sin(a.t * 1.9 + a.seed) * (h.spot ? 5 : 7);
      const sp = a.id === "cho" ? 16 : a.id === "komori" ? 34 : 46;
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      if (a.act === "enter" && d < 6) { a.act = "stay"; }
      const k = Math.min(1, (sp * dt) / Math.max(1, d));
      a.x += dx * k; a.y += dy * k;
      if (Math.abs(dx) > 0.4) { a.dir = dx > 0 ? 1 : -1; }
      if (a.act === "leave" && (a.x < -20 || a.x > YARD.W + 16)) { return false; }
      return true;
    }
    // walk / hop: đi tới chỗ của mình, ở lại, thỉnh thoảng nhích một chút; lúc về thì đi ra mép cảnh
    let tx = a.act === "leave" ? exitX(a) : (a.tx !== undefined ? a.tx : h.x);
    const ty = a.act === "leave" ? a.y : (a.ty !== undefined ? a.ty : h.y);
    const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    const sp = (SPEED[a.id] || 10) * (a.act === "stay" ? 1 : 2.4);      // đi vào / đi về nhanh hơn lúc nhích chỗ
    if (d > 0.8) {
      const k = Math.min(1, (sp * dt) / d);
      a.x += dx * k; a.y += dy * k;
      if (Math.abs(dx) > 0.3) { a.dir = dx > 0 ? 1 : -1; }
      a.moving = true;
      if (def.kind === "hop" && a.hop <= 0) { a.hop = 1; }
    } else {
      a.moving = false;
      if (a.act === "leave") { return false; }
      if (a.act === "enter") { a.act = "stay"; a.until = now + rnd(2500, 6000); a.pose = h.pose; }
      if (a.act === "stay" && now > a.until) {
        // nhích sang chỗ gần đó (trừ khi đang nằm / đậu trên đồ), hoặc đổi dáng
        if (h.pose !== "lie" && Math.random() < 0.35) {
          a.tx = Math.max(GROUND.x0, Math.min(GROUND.x1, h.x + rnd(-14, 14))); a.ty = Math.max(GROUND.y0, Math.min(GROUND.y1, h.y + rnd(-3, 3)));
          if (a.id === "kaeru" || a.id === "sagi") { a.ty = h.y; }
        } else {
          a.alt = !a.alt;
        }
        a.until = now + rnd(2000, 5500);
      }
    }
    if (a.hop > 0) { a.hop = Math.max(0, a.hop - dt * (a.id === "kaeru" ? 2.2 : 4.5)); }
    return true;
  }

  function frameOf(a, now) {
    const id = a.id, f = SPR[id] || {}, mv = a.moving;
    if (a.def.kind === "fly") {
      const per = id === "cho" ? 140 : id === "komori" ? 120 : 160;
      const fr = Object.keys(f).filter((k) => /^f|^fly/.test(k));
      return fr[Math.floor(now / per) % fr.length] || Object.keys(f)[0];
    }
    if (a.def.kind === "swarm") { return null; }
    if (id === "neko") { return mv ? (Math.floor(now / 180) % 2 ? "walk1" : "walk0") : a.pose === "lie" ? "lie" : a.alt ? "groom" : "sit"; }
    if (id === "tanuki" || id === "kitsune") { return mv ? (Math.floor(now / 200) % 2 ? "walk1" : "walk0") : "sit"; }
    if (id === "shika") { return mv ? (Math.floor(now / 260) % 2 ? "walk1" : "walk0") : a.alt ? "graze" : "walk0"; }
    if (id === "tsuru") { return !mv && a.alt ? "dance" : "stand"; }
    if (id === "okojo") { return !mv && a.alt ? "peek" : "sit"; }
    if (id === "suzume") { return !mv && Math.floor(now / 420 + a.seed) % 3 === 0 ? "peck" : "stand"; }
    if (id === "kaeru") { return !mv && Math.floor(now / 700 + a.seed) % 4 === 0 ? "croak" : "sit"; }
    if (id === "kamome") { return mv && a.act !== "stay" ? (Math.floor(now / 160) % 2 ? "fly1" : "fly0") : "stand"; }
    if (id === "sagi") { return a.pose === "dip" ? "dip" : "stand"; }
    if (id === "fukuro") { return a.blink ? "blink" : "sit"; }
    if (id === "mejiro") { return a.hop > 0 ? "hop" : "sit"; }
    return Object.keys(f)[0];
  }

  function paint(ctx, rows, x, y, S, flip, alpha) {
    if (alpha !== undefined && alpha < 1) { ctx.globalAlpha = Math.max(0, alpha); }
    const w = rows[0].length;
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const c = row[i];
        if (c === ".") { continue; }
        ctx.fillStyle = PAL[c] || c;
        const xx = flip ? x + (w - 1 - i) : x + i;
        ctx.fillRect(Math.round(xx * S), Math.round((y + j) * S), Math.ceil(S), Math.ceil(S));
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawOne(ctx, S, ox, oy, e, now) {
    const a = e.a;
    if (a.def.kind === "swarm") { e.box = { x: a.home.x - 16, y: a.home.y - 10, w: 32, h: 22 }; return; }   // vẽ ở drawTop (sáng trên nền tối)
    const fr = frameOf(a, now), rows = fr && SPR[a.id] && SPR[a.id][fr];
    if (!rows) { return; }
    const w = rows[0].length, h = rows.length;
    const lift = a.hop > 0 ? Math.round(Math.sin(a.hop * Math.PI) * (a.id === "kaeru" ? 4 : 2)) : 0;
    const x = ox + a.x - w / 2, y = oy + a.y - h - lift;
    if (a.def.kind !== "fly" && a.home.pose !== "lie" && !(a.id === "fukuro" && a.home.spot)) {      // bóng dưới chân
      ctx.globalAlpha = 0.2 * a.alpha; ctx.fillStyle = "#1b1b2f";
      ctx.fillRect(Math.round((x + 2) * S), Math.round((oy + a.y - 1) * S), Math.max(1, w - 4) * S, S); ctx.globalAlpha = 1;
    }
    paint(ctx, rows, x, y, S, a.dir < 0, a.alpha);
    if (a.mark && now - a.mark < 1600) {         // vừa bấm vào: dấu "!" nhảy lên
      const k = (now - a.mark) / 1600;
      ctx.globalAlpha = k < 0.75 ? 1 : (1 - k) * 4;
      ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round((ox + a.x - 2) * S), Math.round((y - 9 - k * 3) * S), 5 * S, 7 * S);
      ctx.fillStyle = "#1b1b2f"; ctx.fillRect(Math.round((ox + a.x) * S), Math.round((y - 8 - k * 3) * S), S, 3 * S);
      ctx.fillRect(Math.round((ox + a.x) * S), Math.round((y - 4 - k * 3) * S), S, S);
      ctx.globalAlpha = 1;
    }
    e.box = { x: x - ox, y: y - oy, w: w, h: h };
  }

  // Đom đóm (và mắt cú ban đêm): vẽ sau lớp tối của ban đêm để còn sáng
  function drawTop(ctx, S, ox, oy, scene, now, st) {
    const a = vis[scene];
    if (!a) { return; }
    if (a.def.kind === "swarm") {
      a.dots.forEach((q, i) => {
        const on = 0.5 + 0.5 * Math.max(0, Math.sin(now / 340 + q.ph * 3 + i));      // nhấp nháy, không tắt hẳn
        ctx.globalAlpha = 0.3 * on * a.alpha; ctx.fillStyle = "#e9ff7a";
        ctx.beginPath(); ctx.arc((ox + q.x + 0.5) * S, (oy + q.y + 0.5) * S, 2 * S, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = on * a.alpha; ctx.fillStyle = "#f6ff9e";
        ctx.fillRect(Math.round((ox + q.x) * S), Math.round((oy + q.y) * S), Math.ceil(S), Math.ceil(S));
      });
      ctx.globalAlpha = 1;
    } else if (a.id === "fukuro" && st && st.tod === "night" && !a.blink && a.alpha > 0.5) {
      const fr = SPR.fukuro.sit, w = fr[0].length, h = fr.length;
      const x = a.x - w / 2, y = a.y - h;
      ctx.globalAlpha = 0.9 * a.alpha; ctx.fillStyle = "#ffe36a";
      fr.forEach((row, j) => {            // tròng mắt vàng (ô "y" của hình) sáng lên trong đêm
        for (let i = 0; i < w; i++) {
          if (row[i] !== "y") { continue; }
          const xx = a.dir < 0 ? x + (w - 1 - i) : x + i;
          ctx.fillRect(Math.round((ox + xx) * S), Math.round((oy + y + j) * S), Math.ceil(S), Math.ceil(S));
        }
      });
      ctx.globalAlpha = 1;
    }
  }

  // home.js gọi mỗi khung vẽ một cảnh: trả các mục {base, guest:true, a} để xếp lớp với đồ / thú nuôi theo chân đứng.
  // opts.spots(ids) → chỗ các món đồ đặt ở cảnh; opts.seen = cảnh này đang hiện cho người dùng (cửa sổ đang mở, không ẩn)
  function place(scene, now, st, opts) {
    const v = gv();
    if (!v) { delete vis[scene]; return []; }
    const dt = lastAt[scene] ? Math.min(0.25, (now - lastAt[scene]) / 1000) : 0;
    lastAt[scene] = now;
    if (opts && opts.spots) { spotFn[scene] = opts.spots; }
    let a = vis[scene];
    const w = a && a.forced ? { id: a.id, slot: a.slot } : want(scene, now, st);
    if (!a && w) { a = vis[scene] = make(w, scene, opts && opts.spots ? opts.spots(v.defs[w.id].spot || []) : []); }
    if (!a) { return []; }
    if (!step(a, dt, now, w)) { delete vis[scene]; return []; }
    // đã ở trên cảnh đang hiện đủ lâu → ghi vào album (Python xét lại rồi mới ghi)
    if (opts && opts.seen && a.act !== "leave" && a.alpha > 0.6 && a.x > 2 && a.x < YARD.W - 2) {
      a.seen += dt;
      if (a.seen >= 1.5 && told[a.id] !== v.today && H && H.send) {
        told[a.id] = v.today;
        H.send("guest:met:" + a.id + ":" + scene);
      }
    }
    return [{ guest: true, a: a, base: a.home.base === 999 || a.def.kind === "fly" ? 999 : a.act === "stay" || !a.moving ? a.home.base : a.y }];
  }

  function at(scene, ax, ay) {
    const a = vis[scene];
    if (!a || a.alpha < 0.5) { return null; }
    const b = a.def.kind === "swarm" ? { x: a.home.x - 16, y: a.home.y - 10, w: 32, h: 22 } : a.box;
    if (!b) { return null; }
    return ax >= b.x - 2 && ax <= b.x + b.w + 2 && ay >= b.y - 3 && ay <= b.y + b.h + 2 ? a.id : null;
  }

  return {
    init: function (helpers) { H = helpers; },
    place: place,
    draw: function (ctx, S, ox, oy, e, now) { drawOne(ctx, S, ox, oy, e, now); e.a.box = e.box; },
    drawTop: drawTop,
    at: at,
    react: function (scene) { const a = vis[scene]; if (a) { a.mark = Date.now(); if (a.def.kind !== "fly") { a.hop = 1; } } },
    current: function (scene) { const a = vis[scene]; return a && a.act !== "leave" ? a.id : null; },
    // món đồ đang có khách nằm / đậu lên (home.js bỏ chim sẻ nhỏ đậu ghế để khỏi đè lên mèo)
    taken: function (scene) { const a = vis[scene]; return a && a.home.spot && a.act !== "leave" && (a.home.pose === "lie" || a.id === "fukuro") ? a.home.spot.cell : null; },
    sprite: function (id) { const f = SPR[id]; return f ? f[Object.keys(f)[0]] : null; },
    paint: paint,
    pal: PAL,
    has: (id) => !!SPR[id] || id === "hotaru",
    // cho test: đặt khách ngay (bỏ qua khung giờ), xem trạng thái
    _force: function (scene, id) {
      const v = gv(); if (!v || !v.defs[id]) { return false; }
      const slot = Math.floor(Date.now() / SLOT);
      vis[scene] = make({ id: id, slot: slot, end: Date.now() + SLOT }, scene, spotFn[scene] ? spotFn[scene](v.defs[id].spot || []) : []);
      vis[scene].forced = true;
      return true;
    },
    _vis: (scene) => vis[scene] || null,
    _want: want, _told: told, _spr: SPR, _clear: function (scene) { if (scene) { delete vis[scene]; } else { Object.keys(vis).forEach((k) => delete vis[k]); } }
  };
})();
