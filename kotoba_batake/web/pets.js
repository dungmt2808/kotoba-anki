/* ことば畑 – 1.14: thú nuôi chạy trên sân / vùng / trong nhà.
   Python giữ ai được nuôi, đã ăn chưa, thân thiết tới đâu (wallet.more_view.pets); file này chỉ có hình và
   cách đi lại: no bụng thì đi dạo / ngồi chơi, đói thì ngồi nghĩ tới bát cơm, ban đêm ngủ, bỏ đói 2 ngày thì đi chơi. */
var GardenPets = (function () {
  "use strict";
  const PAL = {"k": "#1b1b2f", "g": "#3ccb5e", "G": "#2e8b3a", "f": "#b8e05a", "b": "#8a4a22", "B": "#5a3010", "y": "#ffd23f", "Y": "#e9a800", "o": "#ff9f1c", "O": "#d9620a", "p": "#ff7fa0", "P": "#ffc4d6", "r": "#ff4f6d", "w": "#ffffff", "c": "#fff2b3", "t": "#e2a46a", "s": "#d4d4e0"};
  const SPR = {
    neko: {
      walk0: ["................", "...........k.k..", "k.........ktktk.", "tk.......ktttttk", "ktk...kkkktttttk", "ktkkkktttktktktk", ".ktttBtBtBtttttk", "..ktttttttttptk.", "..ktttttttttkk..", "..ktttttttttk...", "...ktkttttkk....", "....ktkkkktk....", ".....k....k....."],
      walk1: ["................", "...........k.k..", "k.........ktktk.", "tk.......ktttttk", "ktk...kkkktttttk", "ktkkkktttktktktk", ".ktttBtBtBtttttk", "..ktttttttttptk.", "..ktttttttttkk..", "..ktttttttttk...", "..ktkktttktk....", "..ktk.kkk.ktk...", "...k.......k...."],
      sit: [".......k....k...", "......ktkkkktk..", ".......kttttk...", ".......kttttk...", "......ktkttktk..", ".....kkttttttk..", "....ktttttptk...", "...ktBtttttk....", ".k.ktttBttk.....", "ktkktBttttk.....", ".ktkttttttk.....", ".ktkttttttk.....", "..ktkttctck....."],
      sleep: ["................", "................", "................", "................", "..........k.....", ".........ktk.k..", ".....kkkkkkkktk.", "...kkBtBtBttttk.", "..kttttttttttttk", ".ktttttttttBtBtk", ".kttttttttttttk.", ".ktttttttttttk..", "..kktttttttkk..."]
    },
    shiba: {
      walk0: ["...........k..k.", "..........kokkok", "..k.......kokkok", ".kok.....koooook", "kocokkkkkkokoook", "koookoooooooock.", ".kooooooooooccck", ".kooooooooooock.", ".koooooooooook..", "..kooocccccok...", "...koooooook....", "...kokokkkok....", "....k.k...k....."],
      walk1: ["...........k..k.", "..........kokkok", "..k.......kokkok", ".kok.....koooook", "kocokkkkkkokoook", "koookoooooooock.", ".kooooooooooccck", ".kooooooooooock.", ".koooooooooook..", "..kooocccccok...", "..kokoooookok...", ".kok.kkokk.kok..", "..k....k....k..."],
      sit: [".......k....k...", "......kokkkkok..", "......kooooook..", "......kooooook..", "......kokookok..", ".....kkooockok..", "..kkkoooocccck..", ".koooooooocck...", "kocooooocokk....", ".koooooccck.....", "..kkoooccck.....", "...koooocok.....", "....kooook......"],
      sleep: ["................", "................", "................", "................", "................", "..........k..k..", "..kkkkkkkkokkok.", ".kooooooooooook.", ".kocoooooookoook", ".kooooooooocccok", ".koooooooooccck.", "..kooooooooook..", "...kkooooookk..."]
    },
    niwatori: {
      walk0: [".........krrk...", "..........krk...", "..kk.....kwwwkk.", ".kwwk.kkkwwkwyyk", ".kwkkkwwkwwwwwk.", "kwkwwwwwwwwwrk..", ".kkwwwwwwwwkk...", ".kwwsswwwwwwk...", "..kwwwsswwwk....", "..kwwwwwwwwk....", "...kkkywykk.....", ".....kykkyk.....", "......k..k......"],
      walk1: [".........krrk...", "..........krk...", "..kk.....kwwwkk.", ".kwwk.kkkwwkwyyk", ".kwkkkwwkwwwwwk.", "kwkwwwwwwwwwrk..", ".kkwwwwwwwwkk...", ".kwwsswwwwwwk...", "..kwwwsswwwk....", "..kwwwwwwwwk....", "...kkkywykk.....", "....kykkyk......", ".....k..k......."],
      sit: ["................", "................", "................", "...k............", "..kwk.kk........", ".kwkkkwwkkk.....", ".kwwwwwwwwwkk...", "..kwwwwwwwwrrk..", ".kwwsswwwwwwwk..", "..kwwwsswwwkwwk.", "..kwwwwwwwwwwwk.", "...kkkywykkwwyk.", "......kkk..kckck"],
      sleep: ["................", "................", "................", "...........kk...", "..........krrk..", "......kkkkwwwk..", "....kkwwwwwwwwk.", "...kwwwwwwkkwyk.", "..kwsswwwwwwwk..", "..kwwwssswwwwk..", "..kwwwwwwwwwwk..", "...kwwwwwwwwk...", "....kkwwwwkk...."]
    },
    usagi: {
      walk0: ["........kwkkwk..", "........kPkkPk..", ".........kwkwk..", ".........kwkwk..", ".........kwwwwk.", "..kkkkkkkkwwkwk.", ".kwwwwwwwwwwwwpk", ".kwwwwwwwwwwwwk.", ".kwwwwwwwwwwkk..", "..kwwwwwwwwwk...", "...kwwwwwwwk....", "...kwwkkkwwk....", "....kk...kk....."],
      walk1: ["........kwkkwk..", "........kPkkPk..", ".........kwkwk..", ".........kwwwwk.", "..kkkkkkkkwwkwk.", ".kwwwwwwwwwwwwpk", ".kwwwwwwwwwwwwk.", ".kwwwwwwwwwwkk..", "..kwwwwwwwwwk...", "...kwwwwwwwk....", "..kkwkkkkwkk....", ".kwwk....kwwk...", "..kk......kk...."],
      sit: [".......kwkkwk...", ".......kPkkPk...", ".......kwkwk....", ".......kwwwk....", ".......kwwwwk...", ".....kkwwwkwwk..", "....kwwwwwwwwk..", "...kwwwwwwwpk.k.", "..kwwwwwwwwk.kgk", ".kwwwwwwwwwkkook", ".kwwwwwwwwwkokk.", "..kkwwwwwwk.k...", "....kwwwwk......"],
      sleep: ["................", "................", "................", ".......k........", "......kwkk......", ".....kwPwwkkk...", ".....kkkwwwwwk..", "....kwwwwwwwwwk.", "..kkwwwwwwwwkwk.", ".kwwwwwwwwwwwwk.", "..kwwwwwwwwwwk..", "...kwwwwwwwwk...", "....kwwwwwwk...."]
    },
    ahiru: {
      walk0: ["................", "................", ".........kkkk...", "........kyyyyk..", "........kyykykk.", "....kkkkkyyyyook", "..kkyyyyyyyyyook", ".kyyyyyyyyyykkk.", "..kyYYyyyyyyk...", "..kyyyYYyyyyk...", "...kyyyyyyyk....", "....kkokkok.....", "....kok.kok....."],
      walk1: ["................", "................", ".........kkkk...", "........kyyyyk..", "........kyykykk.", "....kkkkkyyyyook", "..kkyyyyyyyyyook", ".kyyyyyyyyyykkk.", "..kyYYyyyyyyk...", "..kyyyYYyyyyk...", "...kyyyyyyyk....", "....kkokkok.....", ".....kok.kok...."],
      sit: ["................", "................", "................", ".........kkk....", "........kyyyk...", ".......kyykyyk..", "......kkyyyyyok.", "....kkyyyyyykok.", "...kyyyyyyyk.k..", "..kyYYyyyyyyk...", "..kyyyYYyyyyk...", "...kyyyyyyyk....", "....kkyyykk....."],
      sleep: ["................", "................", "................", "................", "................", ".........kkk....", "......kkkyyyk...", "....kkyykkyyyk..", "...kyyyyyyyyok..", "..kyYYyyyyyyyk..", "..kyyyYYyyyyyk..", "...kyyyyyyyyk...", "....kkyyyykk...."]
    },
    kame: {
      walk0: ["................", "................", "................", "................", ".......kk.......", "....kkkGGkkk....", "...kGGGGfGGGkk..", "..kGGfGGGGGGffk.", ".kkGGGGGGGfGfffk", "kfkGGGfGfGGGfffk", ".kkggggggggggkk.", "...kffkGGkffk...", "....kk.kk.kk...."],
      walk1: ["................", "................", "................", "................", ".......kk.......", "....kkkGGkkk....", "...kGGGGfGGGkk..", "..kGGfGGGGGGffk.", ".kkGGGGGGGfGfffk", "kfkGGGfGfGGGfffk", ".kkggggggggggkk.", "...kkffGGkkffk..", ".....kkkk..kk..."],
      sit: ["................", "................", "................", "................", ".......kk.......", "....kkkGGkkk....", "...kGGGGfGGGk...", "..kGGfGGGGGffk..", ".kkGGGGGGGffffk.", "kfkGGGfGfGGfffk.", ".kkggggggggggk..", "...kkffGGkkffk..", ".....kkkk..kk..."],
      sleep: ["................", "................", "................", "................", "................", ".......kk.......", "....kkkGGkkk....", "...kGGGGfGGGk...", "..kGGfGGGGGGGk..", "..kGGGGGGGfGGk..", "..kGGGfGGGGGGk..", "..kggggggggggk..", "...kkkkGGkkkk..."]
    }
  };
  const SPEED = { neko: 9, shiba: 15, niwatori: 6, usagi: 11, ahiru: 6, kame: 2.2 };   // điểm ảnh nghệ thuật / giây
  const actors = {};        // "cảnh|id" → {x, y, dir, act, until, tx, ty, hop, fx}
  const lastAt = {};
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }

  function petsOf(data) { return (data && data.wallet && data.wallet.more_view && data.wallet.more_view.pets) || []; }
  // vùng chân thú đứng được (toạ độ nghệ thuật của cảnh)
  // ngoài trời: bên phải nhà / công trình (cột 0–3 là nhà), trong nhà: cả sàn
  // 1.24: "house" = cả nhà 3 gian ở màn chính (Bếp 0–144 · cột · phòng chính 148–308 · cột · Phòng ngủ 312–456)
  function area(scene) {
    if (scene === "house") { return { x0: 8, x1: 448, y0: 50, y1: 86 }; }
    return scene === "room" ? { x0: 6, x1: 146, y0: 50, y1: 86 } : { x0: 72, x1: 246, y0: 40, y1: 74 };
  }
  // 1.30.1: cả nhà 3 gian — mỗi gian một đoạn sàn (chừa cột ngăn gian). Người dùng: "mấy con thú có chạy ngang hẳn qua nhà
  // luôn, nhìn không hợp lý" → thú đi dạo trong gian mình đang ở, thỉnh thoảng mới sang gian bên (qua cửa giữa hai gian);
  // gian chưa mở rộng (tối) thì không vào.
  const HSEG = { kitchen: [10, 134], room: [158, 298], bedroom: [322, 446] };
  function houseSegs(data) {
    const h = data && data.wallet && data.wallet.home, rooms = (h && Array.isArray(h.rooms)) ? h.rooms : [];
    return ["kitchen", "room", "bedroom"].filter((k) => k === "room" || rooms.indexOf(k) >= 0).map((k) => HSEG[k]);
  }
  function segOf(segs, x) {
    let best = segs[0], bd = Infinity;
    segs.forEach((g) => { const d = x < g[0] ? g[0] - x : x > g[1] ? x - g[1] : 0; if (d < bd) { bd = d; best = g; } });
    return best;
  }
  function rnd(a, b) { return a + Math.random() * (b - a); }

  function actor(scene, p, data) {
    const key = scene + "|" + p.id;
    let a = actors[key];
    if (!a) {
      const h = hash(p.id.length * 7 + p.id.charCodeAt(0)), r = area(scene);
      const g = scene === "house" ? HSEG.room : [r.x0 + 20, r.x1 - 20];
      a = actors[key] = { x: g[0] + h * (g[1] - g[0]), y: r.y0 + 6 + hash(h * 99) * (r.y1 - r.y0 - 10), dir: h > 0.5 ? 1 : -1,
        act: "sit", until: 0, tx: 0, ty: 0, hop: 0, fx: [] };
    }
    if (scene === "house") {          // gian chưa mở (dữ liệu đổi, hồ sơ khác): đưa về phần nhà đang mở; cửa giữa hai gian mở thì đi qua được
      const segs = houseSegs(data), lo = segs[0][0], hi = segs[segs.length - 1][1];
      if (a.x < lo - 2 || a.x > hi + 2) { a.x = Math.max(lo, Math.min(hi, a.x)); a.tx = a.x; }
    }
    return a;
  }

  // 1.30: thú có chỗ ưa thích theo đồ đã đặt — đêm tìm chỗ êm để ngủ (bàn sưởi, nệm, thảm…), ngày ghé chơi cạnh món mình thích
  const FAV = {
    neko: { sleep: ["kotatsu", "futon", "dakimakura", "rug", "irori", "beddo"], day: ["aquarium", "kotatsu", "rug", "yasaikago", "irori"] },
    usagi: { sleep: ["rug", "dakimakura", "futon"], day: ["plant", "yasaikago", "ikebana"] },
    kame: { sleep: ["rug", "aquarium"], day: ["aquarium", "plant"] },
    shiba: { sleep: ["bench", "well"], day: ["bench", "well", "mailbox", "swing", "posuto"] },
    niwatori: { sleep: ["fence", "birdhouse", "scarecrow"], day: ["flowers", "sunflower", "rice", "scarecrow"] },
    ahiru: { sleep: ["pond", "fountain"], day: ["pond", "fountain", "well", "luunuoc"] }
  };
  function favSpot(p, kind, scene, spots, data) {
    const ids = (FAV[p.id] || {})[kind];
    if (!ids || typeof spots !== "function") { return null; }
    let list = [];
    try { list = spots(ids) || []; } catch (e) { list = []; }
    if (!list.length) { return null; }
    const r = area(scene), sp = list[Math.floor(hash(p.id.charCodeAt(0) + Math.floor(Date.now() / 600000)) * list.length) % list.length];
    const side = hash(p.id.length + sp.cx) > 0.5 ? 1 : -1;
    let x = Math.max(r.x0, Math.min(r.x1, sp.cx + side * (sp.w / 2 + 6)));
    if (scene === "house") { const g = segOf(houseSegs(data), sp.cx); x = Math.max(g[0], Math.min(g[1], x)); }     // 1.30.1: cạnh món, trong gian của món (không đứng trên cột)
    return { x: x, y: Math.max(r.y0, Math.min(r.y1, sp.bottom + 2)) };
  }
  function choose(a, p, now, st, scene, spots, data) {
    const r = area(scene);
    if (scene === "house") {          // đi dạo trong gian đang ở; ~1/12 lần sang gian khác đang mở
      const segs = houseSegs(data), cur = segOf(segs, a.x);
      if (a.x < cur[0] - 1 || a.x > cur[1] + 1) {        // đang đứng ở cửa giữa hai gian (đi dở): vào hẳn trong gian rồi mới nghỉ
        a.tx = a.x < cur[0] ? cur[0] + rnd(4, 24) : cur[1] - rnd(4, 24); a.ty = Math.max(r.y0, Math.min(r.y1, a.y));
        a.act = "walk"; a.until = now + 12000; return;
      }
      const g = segs.length > 1 && Math.random() < 0.08 ? segs.filter((x) => x !== cur)[Math.floor(Math.random() * (segs.length - 1))] : cur;
      r.x0 = g[0]; r.x1 = g[1];
    }
    const night = st && st.tod === "night", wet = st && (st.rain || st.snow) && scene !== "room" && scene !== "house";
    if (night) {
      const bed = a.bedAt && now - a.bedAt < 600000 ? null : favSpot(p, "sleep", scene, spots, data);
      if (bed && Math.hypot(bed.x - a.x, bed.y - a.y) > 3 && (p.id !== "neko" || Math.random() < 0.8)) {
        a.tx = bed.x; a.ty = bed.y; a.act = "walk"; a.then = "sleep"; a.bedAt = now; a.until = now + 20000; return;
      }
    }
    if (night && p.id !== "neko") { a.act = "sleep"; a.until = now + 8000; return; }
    if (night && Math.random() < 0.7) { a.act = "sleep"; a.until = now + 9000; return; }
    if (p.state === "hungry") {
      if (Math.random() < 0.7) { a.act = "sit"; a.until = now + rnd(3000, 6000); return; }
    }
    if (wet && p.id !== "ahiru" && p.id !== "kame") {      // trời mưa: chạy vào gần hiên nhà ngồi
      a.tx = rnd(r.x0, r.x0 + 20); a.ty = r.y1 - 2; a.act = "walk"; a.until = now + 9000; return;
    }
    if (p.state !== "hungry" && Math.random() < 0.3) {       // ghé chỗ ưa thích rồi ngồi chơi một lúc
      const fav = favSpot(p, "day", scene, spots, data);
      if (fav && Math.hypot(fav.x - a.x, fav.y - a.y) > 6) { a.tx = fav.x; a.ty = fav.y; a.act = "walk"; a.then = "sit"; a.until = now + 20000; return; }
    }
    const lazy = p.id === "kame" || p.id === "neko" ? 0.25 : 0.12;
    if (Math.random() < lazy) { a.act = "sleep"; a.until = now + rnd(5000, 12000); return; }
    if (Math.random() < 0.4) { a.act = "sit"; a.until = now + rnd(1800, 5000); return; }
    const far = p.id === "shiba" ? 120 : p.id === "kame" ? 30 : 70;
    const fx = a.x >= r.x0 && a.x <= r.x1 ? a.x : rnd(r.x0, r.x1);         // sang gian khác: chọn chỗ trong gian đó
    a.tx = Math.max(r.x0, Math.min(r.x1, fx + rnd(-far, far)));
    a.ty = Math.max(r.y0, Math.min(r.y1, a.y + rnd(-14, 14)));
    a.act = "walk"; a.until = now + Math.max(15000, Math.abs(a.tx - a.x) / (SPEED[p.id] || 6) * 1000 * 1.8);     // đi xa (sang gian khác): đủ thời gian tới nơi
  }

  function step(a, p, dt, now, st, scene, spots, data) {
    if (now >= a.until) { a.then = ""; choose(a, p, now, st, scene, spots, data); }
    if (a.act === "walk") {
      const dx = a.tx - a.x, dy = a.ty - a.y, d = Math.hypot(dx, dy);
      const sp = (SPEED[p.id] || 6) * (p.state === "hungry" ? 0.6 : 1) * ((st && st.rain && p.id === "ahiru") ? 1.6 : 1);
      if (d < 1) {
        if (a.then === "sleep") { a.act = "sleep"; a.until = now + rnd(9000, 16000); }
        else { a.act = "sit"; a.until = now + (a.then === "sit" ? rnd(5000, 11000) : rnd(1500, 4000)); }
        a.then = "";
      }
      else { const k = Math.min(1, sp * dt / d); a.x += dx * k; a.y += dy * k; if (Math.abs(dx) > 0.3) { a.dir = dx > 0 ? 1 : -1; } }
    }
    if (a.hop > 0) { a.hop = Math.max(0, a.hop - dt * 2.5); }
    // hiệu ứng nhỏ: tim (thân thiết), bát cơm (đói), zZ (ngủ)
    if (!a.fxAt || now > a.fxAt) {
      a.fxAt = now + rnd(2600, 5200);
      if (p.state === "hungry" && a.act !== "sleep") { a.fx.push({ k: "bowl", t: now }); }
      else if (a.act === "sleep") { a.fx.push({ k: "z", t: now }); }
      else if (p.tier >= 1 && Math.random() < 0.25 + p.tier * 0.15) { a.fx.push({ k: "heart", t: now }); }
    }
    a.fx = a.fx.filter((f) => now - f.t < 1800);
  }

  function frameOf(a, p, now) {
    if (a.act === "sleep") { return "sleep"; }
    if (a.act === "walk") { return Math.floor(now / (p.id === "kame" ? 420 : 180)) % 2 ? "walk1" : "walk0"; }
    return "sit";
  }

  function paint(ctx, rows, x, y, S, flip, alpha) {
    if (alpha !== undefined) { ctx.globalAlpha = alpha; }
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
  const HEART = [".r.r.", "rrrrr", ".rrr.", "..r.."];
  const BOWL = [".kkkkk.", "kwwwwwk", "kbbbbbk", ".kbbbk."];
  const ZZ = ["kkk", "..k", ".k.", "kkk"];

  function drawFx(ctx, S, ox, oy, a, now) {
    a.fx.forEach((f) => {
      const k = (now - f.t) / 1800, y = oy + a.y - 16 - k * 8, x = ox + a.x + (a.dir > 0 ? 2 : -6);
      const al = k < 0.8 ? 1 : (1 - k) * 5;
      if (f.k === "heart") { paint(ctx, HEART, x, y, S, false, al); }
      else if (f.k === "bowl") {
        ctx.globalAlpha = al; ctx.fillStyle = "#ffffff"; ctx.fillRect((x - 2) * S, (y - 2) * S, 11 * S, 8 * S);
        ctx.fillStyle = "#1b1b2f"; ctx.fillRect((x - 2) * S, (y + 6) * S, 2 * S, S);
        ctx.globalAlpha = 1; paint(ctx, BOWL, x, y - 1, S, false, al);
      } else { paint(ctx, ZZ, x + 2 + k * 3, y + 2, S, false, al); }
    });
  }

  // các thú đang ở cảnh này (để home.js xếp lớp với đồ vật theo chân đứng)
  function list(data, scene) {
    const sc = scene === "house" ? "room" : scene;      // 1.24: thú trong nhà đi khắp ba gian
    return petsOf(data).filter((p) => p.scene === sc && p.state !== "away" && SPR[p.id]);
  }
  function place(data, scene, now, st, spots) {
    const out = [];
    const dt = lastAt[scene] ? Math.max(0, Math.min(0.25, (now - lastAt[scene]) / 1000)) : 0;      // 1.30.1: đồng hồ lùi (chỉnh giờ máy) không làm khách / thú đi ngược ra xa
    lastAt[scene] = now;
    list(data, scene).forEach((p) => {
      const a = actor(scene, p, data);
      step(a, p, dt, now, st, scene, spots, data);
      out.push({ p: p, a: a, base: a.y });
    });
    return out.sort((x, y) => x.base - y.base);
  }
  function drawOne(ctx, S, ox, oy, e, now) {
    const p = e.p, a = e.a, rows = SPR[p.id][frameOf(a, p, now)];
    const h = rows.length, w = rows[0].length;
    const hop = a.hop > 0 ? Math.round(Math.sin(a.hop * Math.PI) * 4) : 0;
    const x = ox + a.x - w / 2, y = oy + a.y - h - hop;
    ctx.globalAlpha = 0.22; ctx.fillStyle = "#1b1b2f"; ctx.fillRect(Math.round((x + 2) * S), Math.round((oy + a.y - 1) * S), (w - 4) * S, S); ctx.globalAlpha = 1;
    paint(ctx, rows, x, y, S, a.dir < 0);
    if (p.tier >= 2) {     // thân thiết: khăn quàng đỏ
      const nx = a.dir < 0 ? x + 4 : x + w - 6, ny = y + (frameOf(a, p, now) === "sit" ? 7 : 7);
      ctx.fillStyle = "#ff4f6d"; ctx.fillRect(Math.round(nx * S), Math.round(ny * S), 2 * S, S);
      if (p.tier >= 3 && Math.floor(now / 300) % 5 === 0) { ctx.fillStyle = "#ffd23f"; ctx.fillRect(Math.round((x + w / 2) * S), Math.round((y - 2) * S), S, S); }
    }
    drawFx(ctx, S, ox, oy, a, now);
    e.box = { x: x - ox, y: y - oy, w: w, h: h };
  }
  let lastBoxes = {};
  // 1.25.5: bản sửa hình gốc (fix.js)
  if (typeof GardenFix !== "undefined") {
    GardenFix.register("thu", {
      frames: (id) => { const o = {}; Object.keys(SPR[id] || {}).forEach((f) => { if (Array.isArray(SPR[id][f])) { o[f] = SPR[id][f]; } }); return o; },
      set: (id, f, r) => { if (SPR[id]) { SPR[id][f] = r; } },
      pal: () => PAL
    });
  }
  return {
    has: (id) => !!SPR[id],
    sprite: (id, frame) => (SPR[id] ? SPR[id][frame || "sit"] : null),
    paint: paint,
    pal: PAL,
    // home.js gọi mỗi khung: trả danh sách đã sắp theo chân đứng; vẽ từng con bằng draw()
    // spots (1.30, tuỳ chọn): hàm (ids) → chỗ các món đồ ở cảnh, để thú tìm chỗ ưa thích
    place: function (data, scene, now, st, spots) { const l = place(data, scene, now, st, spots); lastBoxes[scene] = l; return l; },
    draw: drawOne,
    // toạ độ nghệ thuật → id thú dưới chuột
    at: function (scene, ax, ay) {
      const l = lastBoxes[scene] || [];
      for (let i = l.length - 1; i >= 0; i--) {
        const b = l[i].box;
        if (b && ax >= b.x - 1 && ax <= b.x + b.w + 1 && ay >= b.y - 2 && ay <= b.y + b.h + 1) { return l[i].p.id; }
      }
      return null;
    },
    // 1.30: chỗ các thú đang đứng ở cảnh (StackChan lại gần chơi cùng)
    where: function (scene) { return (lastBoxes[scene] || []).map((e) => ({ id: e.p.id, x: e.a.x, y: e.a.y })); },
    cheer: function (id) {     // vừa cho ăn / bấm vào: nhảy lên + tim
      Object.keys(actors).forEach((k) => {
        if (k.split("|")[1] === id) { const a = actors[k]; a.hop = 1; a.act = "sit"; a.until = Date.now() + 2500; a.fx.push({ k: "heart", t: Date.now() }); }
      });
    }
  };
})();
