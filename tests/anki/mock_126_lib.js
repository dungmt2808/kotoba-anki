/* Ảnh phác 1.26 → 1.29 (chưa phải mã thật): màn chào, Bảng tin làng, ⚙, cây lấp lánh, quẻ, trăng + sao băng, sổ 歳時記,
   mốc học, chỗ lấp lánh + Hộp sưu tầm, gánh hàng rong, chuông làng, hiệu ứng thêm.
   Vẽ trên trang vườn thật (hình thú / StackChan / đồ của add-on, khung bảng giống bảng Nhiệm vụ), phủ lên giao diện. */
var Mock126 = (function () {
  "use strict";
  const L = GardenHome._lib();
  const { P, SPR, sprite } = L;
  const $ = (id) => document.getElementById(id);
  const css = `
    .mk-x { position: fixed; z-index: 60; }
    .mk-greet { position: fixed; inset: 0; z-index: 80; overflow: hidden; }
    .mk-greet canvas { position: absolute; inset: 0; image-rendering: pixelated; }
    .mk-bubble { position: absolute; background: #ffffff; border: 3px solid #1b1b2f; box-shadow: 5px 5px 0 #1b1b2f; padding: 14px 20px 12px; min-width: 300px; }
    .mk-bubble:after { content: ""; position: absolute; left: 50%; bottom: -17px; margin-left: -10px; border: 10px solid transparent; border-top: 14px solid #1b1b2f; }
    .mk-bubble .mk-hi { font-family: "Noto Sans CJK JP", sans-serif; font-weight: 700; font-size: 40px; line-height: 1.15; }
    .mk-bubble .mk-vi { font-size: 18px; margin-top: 2px; }
    .mk-bubble .mk-news { margin-top: 10px; padding-top: 8px; border-top: 2px dashed #9aa0b5; display: flex; flex-direction: column; gap: 4px; font-size: 16px; }
    .mk-date { position: absolute; left: 0; right: 0; top: 34px; text-align: center; font-size: 22px; color: #1b1b2f; text-shadow: 2px 2px 0 rgba(255,255,255,.7); }
    .mk-tap { position: absolute; left: 0; right: 0; bottom: 30px; text-align: center; font-size: 16px; color: #1b1b2f; opacity: .55; }
    .mk-tap i { display: inline-block; width: 8px; height: 8px; margin: 0 3px; background: #1b1b2f; }
    .mk-tap i.off { opacity: .25; }
    .mk-pop { position: fixed; z-index: 70; background: #ffffff; border: 3px solid #1b1b2f; box-shadow: 5px 5px 0 #1b1b2f; padding: 10px 12px; font-size: 14px; }
    .mk-pop h4 { margin: 0 0 8px; font-size: 15px; }
    .mk-pop .mk-sec { font-weight: 700; margin: 8px 0 4px; font-size: 13px; color: #6b3b1f; }
    .mk-pop ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
    .mk-pop li { padding: 5px 8px; background: #fff8dc; border: 2px solid #1b1b2f; display: flex; gap: 8px; align-items: center; }
    .mk-pop li.mk-soon { background: #eef4ff; }
    .mk-pop .mk-d { margin-left: auto; color: #6b6b80; font-size: 12px; white-space: nowrap; }
    .mk-jp { font-family: "Noto Sans CJK JP", sans-serif; }
    .mk-hl { outline: 3px dashed #ff4f6d; outline-offset: 2px; }
    .mk-cap { position: fixed; z-index: 90; left: 12px; bottom: 12px; background: #1b1b2f; color: #ffd23f; padding: 4px 10px; font-size: 14px; }
    .mk-kuji { width: 300px; background: #fffaf0; border: 3px solid #1b1b2f; box-shadow: 5px 5px 0 #1b1b2f; padding: 0; }
    .mk-kuji .mk-top { background: #c0392b; color: #fff; text-align: center; padding: 6px 0 4px; font-size: 14px; }
    .mk-kuji .mk-rank { text-align: center; font-family: "Noto Sans CJK JP", serif; font-weight: 900; font-size: 64px; color: #c0392b; line-height: 1.1; margin: 8px 0 2px; }
    .mk-kuji .mk-rank small { display: block; font-size: 15px; color: #1b1b2f; font-weight: 400; font-family: inherit; }
    .mk-kuji dl { margin: 6px 14px 12px; display: grid; grid-template-columns: 64px 1fr; gap: 6px 8px; font-size: 14px; }
    .mk-kuji dt { font-family: "Noto Sans CJK JP", sans-serif; font-weight: 700; color: #6b3b1f; }
    .mk-kuji dd { margin: 0; }
    .mk-kuji dd small { display: block; color: #5b5b70; font-size: 12px; }
    .mk-book { width: 620px; display: grid; grid-template-columns: 1fr 1fr; gap: 0; background: #fff8e6; border: 3px solid #1b1b2f; box-shadow: 5px 5px 0 #1b1b2f; }
    .mk-book > div { padding: 12px 14px; }
    .mk-book > div + div { border-left: 3px double #c9a774; }
    .mk-entry { border-bottom: 2px dashed #e0cfa8; padding: 6px 0; }
    .mk-entry b { font-family: "Noto Sans CJK JP", sans-serif; font-size: 22px; }
    .mk-entry .mk-r { font-size: 12px; color: #6b3b1f; }
    .mk-entry .mk-m { font-size: 13px; }
    .mk-entry.mk-lock { color: #b0a890; }
    .mk-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; }
    .mk-cell { border: 2px solid #1b1b2f; background: #fff8dc; padding: 4px; text-align: center; font-size: 11px; }
    .mk-cell canvas { display: block; margin: 0 auto 2px; image-rendering: pixelated; }
    .mk-cell.mk-no { background: #eceae4; color: #9a98a0; }
    .mk-cell b { font-family: "Noto Sans CJK JP", sans-serif; font-size: 13px; display: block; }
    .mk-shop li { justify-content: flex-start; }
    .mk-shop canvas { image-rendering: pixelated; border: 2px solid #1b1b2f; background: #e9f7ff; }
    .mk-tag { font-size: 11px; padding: 1px 5px; border: 2px solid #1b1b2f; background: #ffd23f; }
    .mk-tag.mk-only { background: #c77dff; color: #fff; }
    .mk-btn { font: inherit; font-size: 13px; padding: 3px 10px; background: #5fd17a; border: 2px solid #1b1b2f; box-shadow: 2px 2px 0 #1b1b2f; }
    .mk-roll { display: grid; grid-template-columns: 54px repeat(16, 26px); gap: 2px; font-size: 12px; align-items: center; }
    .mk-roll i { display: block; width: 26px; height: 20px; background: #f4f0e4; border: 1px solid #d8d0bc; }
    .mk-roll i.on { background: #ffd23f; border-color: #1b1b2f; box-shadow: inset 0 -4px 0 #e9a800; }
    .mk-roll i.beat { background: #ece6d2; }
    .mk-roll i.on.beat { background: #ffd23f; }
    .mk-roll span { text-align: right; padding-right: 6px; font-family: "Noto Sans CJK JP", sans-serif; }
  `;
  function ensureCss() { if (!$("mk-css")) { const s = document.createElement("style"); s.id = "mk-css"; s.textContent = css; document.head.appendChild(s); } }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function iconText(node, txt) { if (typeof GardenIcons !== "undefined" && GardenIcons.fill) { GardenIcons.fill(node, txt); } else { node.textContent = txt.replace(/\[i:[a-z]+\]/g, ""); } return node; }
  function clear() { document.querySelectorAll(".mk-x, .mk-greet, .mk-pop, .mk-cap, .mk-row").forEach((e) => e.remove()); document.querySelectorAll(".mk-hl").forEach((e) => e.classList.remove("mk-hl")); }
  function cap(t) { const c = el("div", "mk-cap mk-x", t); document.body.appendChild(c); }
  // vẽ hình từ chuỗi + bảng màu
  function pix(ctx, rows, x, y, S, pal) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = r[i]; if (c === "." || c === " ") { continue; } ctx.fillStyle = (pal && pal[c]) || P[c] || c; ctx.fillRect(Math.round(x + i * S), Math.round(y + j * S), S, S); } });
  }
  function canvasFor(w, h) { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x]; }
  const SPARK = ["..y..", ".yYy.", "yYwYy", ".yYy.", "..y.."];

  // ------------------------------------------------------------------ 1.26 màn chào
  function sky() { return (typeof GardenSky !== "undefined" && GardenSky.state()) || { top: "#8fd3ff", bottom: "#c4ecff", hills: "#7ed98a", ground: "#5ed35e", grass: "#45bf4a", light: 1 }; }
  function scene(ctx, W, H, st, now) {
    const mix = GardenSky.mix, hz = Math.round(H * 0.6);
    for (let b = 0; b < 12; b++) { ctx.fillStyle = mix(st.top, st.bottom, b / 11); ctx.fillRect(0, Math.floor(hz * b / 12), W, Math.ceil(hz / 12) + 1); }
    if (st.light < 0.6) { for (let i = 0; i < 140; i++) { ctx.fillStyle = i % 4 ? "#ffffff" : "#ffe9a8"; const s = i % 7 ? 3 : 5; ctx.fillRect((i * 137) % W, (i * 71) % (hz - 60), s, s); } }
    else { [[0.18, 0.16, 1.0], [0.72, 0.1, 0.8], [0.45, 0.24, 0.6]].forEach(([fx, fy, k]) => { const x = W * fx, y = H * fy, s = 8 * k; ctx.fillStyle = "#ffffff"; ctx.fillRect(x, y + 2 * s, 14 * s, 3 * s); ctx.fillRect(x + 3 * s, y, 7 * s, 2 * s); ctx.fillRect(x - 3 * s, y + 3 * s, 4 * s, 2 * s); }); }
    ctx.fillStyle = st.hills;
    for (let x = 0; x < W; x += 6) { const h = 50 + 28 * Math.sin(x / 140) + 16 * Math.sin(x / 55); ctx.fillRect(x, hz - h, 6, h); }
    ctx.fillStyle = st.ground; ctx.fillRect(0, hz, W, H - hz);
    ctx.fillStyle = st.grass; for (let i = 0; i < 260; i++) { ctx.fillRect((i * 173) % W, hz + 10 + (i * 97) % (H - hz - 20), 6, 6); }
    // hàng rào + hoa ở hai bên
    const S = 6;
    if (SPR.fence) { for (let x = -20; x < W * 0.3; x += 16 * S) { sprite(ctx, SPR.fence, x / S, (hz + 30) / S, S); } for (let x = W * 0.72; x < W + 20; x += 16 * S) { sprite(ctx, SPR.fence, x / S, (hz + 30) / S, S); } }
    ["flower", "tulip", "sunflower"].forEach((id, k) => { if (SPR[id]) { sprite(ctx, SPR[id], (W * (0.12 + k * 0.07)) / S, (H * 0.8) / S, S); sprite(ctx, SPR[id], (W * (0.74 + k * 0.07)) / S, (H * 0.82) / S, S); } });
    return hz;
  }
  function stackchan(ctx, x, y, w) {      // chép hình StackChan đang vẽ ở góc trái
    const m = $("kb-mascot"); if (!m) { return; }
    const h = Math.round(w * m.height / m.width);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(m, x - w / 2, y - h, w, h);
  }
  // o: { who: "neko"|"stack", name, hi, vi, news: [...], date, night, out }
  function greet(o) {
    ensureCss(); clear();
    const W = window.innerWidth, H = window.innerHeight;
    const g = el("div", "mk-greet"); const [cv, ctx] = canvasFor(W, H); g.appendChild(cv); document.body.appendChild(g);
    const st = sky(), hz = scene(ctx, W, H, st, Date.now());
    const cx = Math.round(W / 2), base = Math.round(hz + (H - hz) * 0.42);
    if (o.who === "stack") {
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(cx - 70, base - 6, 140, 12);
      stackchan(ctx, cx, base, 170);
    } else {
      const S = 9, rows = GardenPets.sprite(o.who, "sit"), w = rows[0].length * S, h = rows.length * S, hop = 46;
      ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(cx - w / 2 + 10, base - 6, w - 20, 12);
      GardenPets.paint(ctx, rows, (cx - w / 2) / S, (base - h - hop) / S, S);
      // vệt nhảy + vẫy + tim
      ctx.fillStyle = "#ffffff"; [[-w / 2 - 30, -h - hop + 20], [-w / 2 - 44, -h - hop + 44], [w / 2 + 22, -h - hop + 26], [w / 2 + 36, -h - hop + 50]].forEach(([dx, dy]) => { ctx.fillRect(cx + dx, base + dy, 14, 5); });
      pix(ctx, [".rr.rr.", "rrrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."], cx + w / 2 + 6, base - h - hop - 40, 6, { r: "#ff4f6d" });
      ctx.fillStyle = "#1b1b2f"; for (let i = 0; i < 3; i++) { ctx.fillRect(cx - 6 + i * 6 - 6, base - 10 - i * 12, 4, 4); }
    }
    // bong bóng
    const b = el("div", "mk-bubble");
    b.appendChild(el("div", "mk-hi", o.hi));
    b.appendChild(el("div", "mk-vi", o.vi));
    if (o.news && o.news.length) { const n = el("div", "mk-news"); o.news.forEach((t) => n.appendChild(iconText(el("div"), t))); b.appendChild(n); }
    g.appendChild(b);
    const bw = b.offsetWidth, bh = b.offsetHeight, topPet = o.who === "stack" ? base - 230 : base - 13 * 9 - 46 - 60;
    b.style.left = Math.round(cx - bw / 2) + "px"; b.style.top = Math.round(topPet - bh - 10) + "px";
    if (o.date) { iconText(g.appendChild(el("div", "mk-date")), o.date); }
    const tap = el("div", "mk-tap"); tap.appendChild(document.createTextNode("bấm để vào vườn  ")); [1, 1, 0, 0].forEach((on) => { const i = el("i"); if (!on) { i.className = "off"; } tap.appendChild(i); }); g.appendChild(tap);
    return { bubble: [b.offsetLeft, b.offsetTop, bw, bh] };
  }

  // ------------------------------------------------------------------ 1.26 Bảng tin làng
  function newsLine(text) {
    ensureCss();
    const list = document.querySelector("#kb-today .kb-today-list"); if (!list) { return; }
    const b = el("button", "kb-quest-btn mk-row mk-hl"); iconText(b, text); list.insertBefore(b, list.children[2] || null);
  }
  function newsPop(today, soon) {
    ensureCss();
    const card = $("kb-today").getBoundingClientRect();
    const p = el("div", "mk-pop mk-x"); p.style.width = "380px";
    p.appendChild(el("h4", null, "Tin làng · Thứ bảy 07/11"));
    p.appendChild(el("div", "mk-sec", "Hôm nay"));
    const u = el("ul"); today.forEach(([t, d]) => { const li = el("li"); iconText(li, t); if (d) { li.appendChild(el("span", "mk-d", d)); } u.appendChild(li); }); p.appendChild(u);
    p.appendChild(el("div", "mk-sec", "Sắp tới"));
    const u2 = el("ul"); soon.forEach(([t, d]) => { const li = el("li", "mk-soon"); iconText(li, t); li.appendChild(el("span", "mk-d", d)); u2.appendChild(li); }); p.appendChild(u2);
    document.body.appendChild(p);
    p.style.left = Math.round(card.right - 380 - 6) + "px"; p.style.top = Math.round(card.bottom + 8) + "px";
  }
  // ⚙ → Màn chính: thêm dòng (khung đỏ = dòng mới)
  function uiRows(rows) {
    ensureCss();
    const all = [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio")], r0 = all.find((r) => /Dây trang trí/.test(r.textContent)) || all.find((r) => /Cảnh hiện/.test(r.textContent));
    let after = r0;
    rows.forEach(([label, a, bb]) => {
      const n = r0.cloneNode(true); n.classList.add("mk-row", "mk-hl");
      n.querySelector(".kb-ui-l").textContent = label;
      const ops = n.querySelectorAll(".kb-ui-opt"); ops[0].lastChild.textContent = " " + a; ops[1].lastChild.textContent = " " + bb;
      ops[0].classList.add("is-on"); ops[1].classList.remove("is-on"); const ins = n.querySelectorAll("input"); ins[0].checked = true; ins[1].checked = false;
      after.parentNode.insertBefore(n, after.nextSibling); after = n;
    });
    after.scrollIntoView({ block: "center" });
  }

  // ------------------------------------------------------------------ 1.27
  function fieldCells() { const lay = Garden._layout(), cv = $("kb-canvas").getBoundingClientRect(); return { lay, cv, cw: 18 * lay.scale, ch: 20 * lay.scale }; }
  function sparkle(idxs, pinIdx) {
    ensureCss();
    const { lay, cv, cw, ch } = fieldCells();
    idxs.forEach((idx, k) => {
      const col = idx % lay.cols, row = Math.floor(idx / lay.cols);
      const [c, x] = canvasFor(cw + 24, ch + 24); c.className = "mk-x"; c.style.left = (cv.left + col * cw - 12) + "px"; c.style.top = (cv.top + row * ch - 12 + window.scrollY) + "px"; c.style.position = "absolute";
      const g = x.createRadialGradient((cw + 24) / 2, (ch + 24) / 2, 4, (cw + 24) / 2, (ch + 24) / 2, cw * 0.7);
      g.addColorStop(0, "rgba(255,226,90,.55)"); g.addColorStop(1, "rgba(255,226,90,0)"); x.fillStyle = g; x.fillRect(0, 0, cw + 24, ch + 24);
      const S = Math.max(2, Math.round(lay.scale * 0.8));
      [[4, 6], [cw - 2, 14], [cw / 2 + 4, 2], [10, ch - 4]].forEach(([dx, dy], i) => pix(x, SPARK, dx + (k * 3 + i) % 5, dy, S, { y: "#ffd23f", Y: "#e9a800", w: "#ffffff" }));
      document.body.appendChild(c);
    });
    if (pinIdx !== undefined) {
      const col = pinIdx % lay.cols, row = Math.floor(pinIdx / lay.cols);
      const p = el("div", "mk-pop mk-x"); p.style.width = "300px"; p.style.position = "absolute";
      const d = Garden._data().plants[pinIdx] || { word: "予約", reading: "よやく", meaning: "đặt trước" };
      p.appendChild(el("div", "mk-jp", d.word)).style.cssText = "font-size:28px;font-weight:700";
      p.appendChild(el("div", null, (d.reading || "") + " · " + (d.meaning || "")));
      const s = el("div"); s.style.cssText = "margin-top:8px;padding:6px 8px;background:#fff6c8;border:2px solid #1b1b2f";
      iconText(s, "[i:star] Cây lấp lánh: tưới cây này hôm nay → giọt sương vàng (+3 xu)"); p.appendChild(s);
      document.body.appendChild(p);
      p.style.left = (cv.left + (col + 1) * cw + 10) + "px"; p.style.top = (cv.top + row * ch + window.scrollY - 10) + "px";
    }
  }
  function kuji(x, y) {
    ensureCss();
    const k = el("div", "mk-kuji mk-x"); k.style.position = "fixed"; k.style.left = x + "px"; k.style.top = y + "px";
    k.appendChild(el("div", "mk-top", "おみくじ · Quẻ hôm nay · 07/11"));
    const r = el("div", "mk-rank", "中吉"); r.appendChild(el("small", null, "ちゅうきち · Trung cát")); k.appendChild(r);
    const dl = el("dl");
    [["学問", "こつこつ続ければ実る", "Chăm chỉ từng chút sẽ có quả"], ["待ち人", "水のそばに来る", "Hôm nay cò có thể ghé mép ao"], ["失せ物", "海の近くで見つかる", "Có chỗ lấp lánh ở Bãi biển"], ["言葉", "予約 · よやく", "Từ may mắn (đến hạn hôm nay) — bấm để xem"]].forEach(([t, jp, vi]) => {
      dl.appendChild(el("dt", null, t)); const dd = el("dd"); dd.appendChild(el("span", "mk-jp", jp)); dd.appendChild(el("small", null, vi)); dl.appendChild(dd);
    });
    k.appendChild(dl); document.body.appendChild(k);
  }
  function omikujiBox(sel, ax, ay) {      // hộp quẻ cạnh cổng đền (toạ độ nghệ thuật của dải cảnh)
    const v = GardenHome._mainView(), yard = $("kb-yard").getBoundingClientRect(), S = v.S;
    const [c, x] = canvasFor(14 * S, 20 * S); c.className = "mk-x"; c.style.left = (yard.left + (v.ox + ax) * S) + "px"; c.style.top = (yard.top + ((v.oy || 0) + ay) * S) + "px";
    pix(x, ["....kkkk......", "...krrrrk.....", "..krrRRrrk....", "..krwkkwrk....", "..krwwwwrk....", "..krw..wrk....", "..krrrrrrk....", "..kRRRRRRk....", "..krrrrrrk....", "..krrrrrrk....", "..krrrrrrk....", "..kRRRRRRk....", "...kkkkkk.....", "....kBk.......", "....kBk.......", "....kBk.......", "...kBBBk......", "..kkkkkkk....."], 0, 0, S);
    pix(x, SPARK, 9 * S, 0, Math.max(2, S / 2));
    document.body.appendChild(c);
  }
  function moonMeteors() {                // trăng thật (lưỡi liềm cuối tháng) + mưa sao băng trên dải cảnh
    const yard = $("kb-yard").getBoundingClientRect(), v = GardenHome._mainView(), S = v.S;
    const [c, x] = canvasFor(Math.round(yard.width), Math.round(28 * S)); c.className = "mk-x"; c.style.left = yard.left + "px"; c.style.top = yard.top + "px";
    const mx = Math.round(yard.width * 0.62), my = 4 * S, R = 7 * S, cy = my + R;
    x.globalAlpha = 0.14; x.fillStyle = "#fff1b8"; x.beginPath(); x.arc(mx, cy, R * 1.9, 0, 7); x.fill(); x.globalAlpha = 1;
    for (let j = -R; j < R; j += S) { for (let i = -R; i < R; i += S) {          // lưỡi liềm cuối tháng: sáng phía trái
      const a = i + S / 2, b = j + S / 2, inDisc = a * a + b * b <= R * R, sh = (a + R * 0.55) * (a + R * 0.55) + b * b <= R * R;
      if (inDisc) { x.fillStyle = sh ? "#2b3358" : "#fff1b8"; x.fillRect(mx + i, cy + j, S, S); }
    } }
    for (let k = 0; k < 9; k++) {
      const sx = (k * 211 + 60) % (yard.width - 200) + 100, sy = (k * 37) % (14 * S) + 2 * S, len = (8 + (k % 3) * 4) * S;
      for (let t = 0; t < len; t += S) { x.globalAlpha = 1 - t / len; x.fillStyle = t < 2 * S ? "#ffffff" : "#ffe9a8"; x.fillRect(sx + t, sy + t * 0.45, S, S); }
    }
    x.globalAlpha = 1;
    document.body.appendChild(c);
  }
  function saijiki(x, y) {
    ensureCss();
    const b = el("div", "mk-book mk-x"); b.style.position = "fixed"; b.style.left = x + "px"; b.style.top = y + "px";
    const L1 = el("div"), R1 = el("div");
    L1.appendChild(el("h4", null, "歳時記 · Sổ từ mùa · Thu → Đông")).style.margin = "0 0 6px";
    [["立冬", "りっとう", "Lập đông — bắt đầu mùa đông", "07/11/2026"], ["十三夜", "じゅうさんや", "Trăng đêm 13 (tháng 9 âm lịch)", "30/10/2026"], ["霜降", "そうこう", "Sương giáng — sương muối bắt đầu", "23/10/2026"]].forEach(([k, r, m, d]) => {
      const e = el("div", "mk-entry"); e.appendChild(el("b", null, k)); e.appendChild(el("span", "mk-r", "  " + r + " · " + d)); e.appendChild(el("div", "mk-m", m)); L1.appendChild(e);
    });
    R1.appendChild(el("div", "mk-sec", "Đêm nay & sắp tới")).style.marginTop = "0";
    [["しし座流星群", "ししざりゅうせいぐん", "Mưa sao băng Sư Tử · 17/11", false], ["小雪", "しょうせつ", "Tiểu tuyết · 22/11", true], ["満月", "まんげつ", "Trăng tròn · 24/11", true]].forEach(([k, r, m, lock]) => {
      const e = el("div", "mk-entry" + (lock ? " mk-lock" : "")); e.appendChild(el("b", null, lock ? "？？" : k)); e.appendChild(el("span", "mk-r", "  " + (lock ? "chưa thấy" : r))); e.appendChild(el("div", "mk-m", m)); R1.appendChild(e);
    });
    R1.appendChild(el("div", "mk-m", "Đã ghi 14 / 52 trang")).style.cssText = "margin-top:8px;color:#6b3b1f";
    b.appendChild(L1); b.appendChild(R1); document.body.appendChild(b);
  }
  function milestone() {                  // mốc học: dải chúc + mũ tiệc StackChan + bánh trong nhà
    ensureCss();
    const m = $("kb-mascot").getBoundingClientRect();
    const [c, x] = canvasFor(36, 28); c.className = "mk-x"; c.style.left = (m.left + m.width / 2 - 18) + "px"; c.style.top = Math.max(0, m.top - 22) + "px";
    pix(x, ["....y....", "...ryr...", "..rryrr..", "..ryryr..", ".rryrryr.", ".ryyryyr.", "rrrrrrrrr"], 0, 0, 4, { r: "#ff7fa0" });
    document.body.appendChild(c);
    const y = $("kb-yard").getBoundingClientRect();
    const b = el("div", "mk-x"); b.style.cssText = "position:fixed;left:" + (y.left + y.width / 2 - 260) + "px;top:" + (y.top + 14) + "px;width:520px;text-align:center;background:#ffd23f;border:3px solid #1b1b2f;box-shadow:5px 5px 0 #1b1b2f;padding:8px 10px;font-size:18px";
    iconText(b, "[i:star] 100 ngày có ôn · cảm ơn cậu đã chăm vườn! [i:star]");
    const s = el("div", null, "Quà: Khung ảnh kỷ niệm (07/11/2026) — đã vào Kho đồ"); s.style.cssText = "font-size:13px;margin-top:4px"; b.appendChild(s);
    document.body.appendChild(b);
  }
  function cake(ax, ay) {                 // bánh kỷ niệm trên dải "Trong nhà"
    const v = GardenHome._mainView(), yard = $("kb-yard").getBoundingClientRect(), S = v.S;
    const [c, x] = canvasFor(18 * S, 16 * S); c.className = "mk-x"; c.style.left = (yard.left + (v.ox + ax) * S) + "px"; c.style.top = (yard.top + (v.oy + ay) * S) + "px";
    pix(x, ["......y.y.y.......", "......r.r.r.......", "......w.w.w.......", "...kkkkkkkkkkkk...", "..kwwwwwwwwwwwwk..", "..kwpwwpwwpwwpwk..", "..kPPPPPPPPPPPPk..", "..kwwwwwwwwwwwwk..", "..kPPPPPPPPPPPPk..", "..kkkkkkkkkkkkkk..", ".kssssssssssssssk.", "..kkkkkkkkkkkkkk.."], 0, 0, S);
    document.body.appendChild(c);
  }

  // ------------------------------------------------------------------ 1.28
  const ITEMS = {
    shell: ["....kkkk....", "..kkwPwPkk..", ".kwPwPwPwPk.", "kPwPwPwPwPwk", "kwPwPwPwPwPk", ".kPwPwPwPwk.", "..kkPwPwkk..", "....kkkk....", "....kPPk....", "....kkkk...."],
    star: [".....kk.....", "....kook....", "....kook....", "kkkkkoookkkk", "kooooooooook", ".kooookoook.", "..kooooook..", ".koook.kook.", ".kook...kok.", ".kkk.....kk."],
    glass: ["...kkkk.....", "..kllllk....", ".kllwlllk...", ".klwlllllk..", "..kllllllk..", "...kllllk...", "....kkkk...."],
    feather: ["........kk..", ".......kwk..", "......kwsk..", ".....kwsk...", "....kwsk....", "...kwsk.....", "..kwsk......", ".kssk.......", "kkk........."],
    ticket: ["kkkkkkkkkkkk", "kccccccccccc", "kckkkckkkcck", "kccccccccccc", "kcrrcccckkck", "kccccccccccc", "kkkkkkkkkkkk"],
    bell: ["....kk....", "...kyyk...", "..kyyyyk..", "..kyyyyk..", ".kyyyyyyk.", ".kyYyyyyk.", "kkkkkkkkkk", "....kk....", "....rr...."],
    leaf: ["....k.....", "...kok....", "..koook...", ".koooook..", "kooookook.", ".koooook..", "..kooook..", "...kook...", "....kk....", "....k....."],
    acorn: ["...kkkk...", "..kBBBBk..", ".kBbBbBBk.", ".kkkkkkkk.", ".kttttttk.", ".kttttttk.", "..kttttk..", "...kttk...", "....kk...."],
  };
  function itemCanvas(id, S, gray) {
    const rows = ITEMS[id], [c, x] = canvasFor(rows[0].length * S, rows.length * S);
    pix(x, rows, 0, 0, S, gray ? { k: "#8a8898", w: "#c8c6cc", P: "#b8b6bc", o: "#b8b6bc", l: "#c8c6cc", s: "#b8b6bc", c: "#d8d6dc", r: "#a8a6ac", y: "#c8c6cc", Y: "#b0aeb4", B: "#9a98a0", b: "#a8a6ac", t: "#c0bec4" } : null);
    return c;
  }
  function spot(ax, ay) {                 // chỗ lấp lánh trên dải cảnh (toạ độ nghệ thuật)
    const v = GardenHome._mainView(), yard = $("kb-yard").getBoundingClientRect(), S = v.S;
    const [c, x] = canvasFor(16 * S, 12 * S); c.className = "mk-x"; c.style.left = (yard.left + (v.ox + ax) * S) + "px"; c.style.top = (yard.top + ((v.oy || 0) + ay) * S) + "px";
    const g = x.createRadialGradient(8 * S, 8 * S, S, 8 * S, 8 * S, 7 * S); g.addColorStop(0, "rgba(255,240,150,.85)"); g.addColorStop(1, "rgba(255,240,150,0)"); x.fillStyle = g; x.fillRect(0, 0, 16 * S, 12 * S);
    pix(x, SPARK, 2 * S, 1 * S, S); pix(x, SPARK, 9 * S, 4 * S, Math.max(1, S - 1)); pix(x, ["y"], 6 * S, 9 * S, S);
    document.body.appendChild(c);
    return [yard.left + (v.ox + ax) * S, yard.top + ((v.oy || 0) + ay) * S];
  }
  function pickPop(x, y) {
    ensureCss();
    const p = el("div", "mk-pop mk-x"); p.style.width = "300px"; p.style.left = x + "px"; p.style.top = y + "px";
    const row = el("div"); row.style.cssText = "display:flex;gap:10px;align-items:center";
    const ic = itemCanvas("shell", 6); ic.style.cssText = "border:2px solid #1b1b2f;background:#e9f7ff;padding:4px"; row.appendChild(ic);
    const t = el("div"); t.appendChild(el("div", "mk-jp", "貝殻")).style.cssText = "font-size:26px;font-weight:700"; t.appendChild(el("div", null, "かいがら · vỏ sò")); row.appendChild(t);
    p.appendChild(row);
    const s = el("div", null, "Nhặt được! Bộ Bãi biển 4 / 6"); s.style.cssText = "margin-top:8px;padding:5px 8px;background:#fff8dc;border:2px solid #1b1b2f"; p.appendChild(s);
    document.body.appendChild(p);
  }
  function collection(x, y) {
    ensureCss();
    const p = el("div", "mk-pop mk-x"); p.style.width = "640px"; p.style.left = x + "px"; p.style.top = y + "px";
    p.appendChild(el("h4", null, "Album · Hộp sưu tầm · 19 / 42"));
    [["Bãi biển · 4 / 6 — đủ bộ: chuông gió vỏ sò", [["shell", "貝殻", "かいがら"], ["star", "ヒトデ", "ひとで"], ["glass", "ガラスの欠片", "かけら"], ["feather", "羽", "はね"], [null], [null]]],
     ["Ga làng quê · 2 / 6", [["ticket", "古い切符", "きっぷ"], ["bell", "鈴", "すず"], [null], [null], [null], [null]]],
     ["Đền trên núi · 3 / 6", [["leaf", "紅葉", "もみじ"], ["acorn", "どんぐり", "どんぐり"], ["bell", "お守りの鈴", "すず"], [null], [null], [null]]]].forEach(([title, list]) => {
      p.appendChild(el("div", "mk-sec", title));
      const g = el("div", "mk-grid");
      list.forEach(([id, jp, r]) => { const c = el("div", "mk-cell" + (id ? "" : " mk-no")); c.appendChild(itemCanvas(id || "shell", 4, !id)); c.appendChild(el("b", null, id ? jp : "？？")); c.appendChild(el("span", null, id ? r : "chưa nhặt")); g.appendChild(c); });
      p.appendChild(g);
    });
    document.body.appendChild(p);
  }
  const VENDOR = [
    "......kkkkk.......", "....kkyyyyykk.....", "..kkyyyyyyyyykk...", ".kkkkkkkkkkkkkkk..", "......keeek.......", "......kekek.......", "......keeek.......",
    "..B...kkkkk...B...", "..BBBBBBBBBBBBBB..", "..B..krrrrrk..B...", "..B..krrwrrk..B...", ".kkk.krrrrrk.kkk..", "kgggk.kbbbk.kgggk.", "kgogk.kbbbk.kgrgk.", "kkkkk.kb.bk.kkkkk.", "......kk.kk......."];
  function vendor(ax, ay) {
    const v = GardenHome._mainView(), yard = $("kb-yard").getBoundingClientRect(), S = v.S;
    const [c, x] = canvasFor(18 * S, 16 * S); c.className = "mk-x"; c.style.left = (yard.left + (v.ox + ax) * S) + "px"; c.style.top = (yard.top + ((v.oy || 0) + ay) * S) + "px";
    pix(x, VENDOR, 0, 0, S, { e: "#ffd7b5" });
    document.body.appendChild(c);
    return [yard.left + (v.ox + ax) * S, yard.top + ((v.oy || 0) + ay) * S];
  }
  function shop(x, y) {
    ensureCss();
    const p = el("div", "mk-pop mk-shop mk-x"); p.style.width = "420px"; p.style.left = x + "px"; p.style.top = y + "px";
    p.appendChild(el("h4", null, "Gánh hàng rong · Chủ nhật 08/11 · phiên sau: Thứ Tư 11/11"));
    const u = el("ul");
    [["bell", "Chuông gió thuỷ tinh", "only", "Chỉ có ở gánh hàng · quay lại sau ~4 tuần", "180 xu"], ["leaf", "Đèn lồng lá phong", "sale", "Cửa hàng 160 → 120 xu", "120 xu"], ["acorn", "Ghế gỗ sồi", "sale", "Cửa hàng 200 → 150 xu", "150 xu"], ["feather", "Hạt giống: Cúc vạn thọ", null, "Giống cây theo mùa", "300 xu"]].forEach(([id, name, tag, sub, price]) => {
      const li = el("li"); const ic = itemCanvas(id, 3); li.appendChild(ic);
      const t = el("div"); const n = el("div", null, name); n.style.fontWeight = "700"; if (tag) { const g = el("span", "mk-tag" + (tag === "only" ? " mk-only" : ""), tag === "only" ? "Hiếm" : "−25%"); g.style.marginLeft = "6px"; n.appendChild(g); } t.appendChild(n); t.appendChild(el("div", null, sub)).style.cssText = "font-size:12px;color:#5b5b70"; li.appendChild(t);
      const b = el("button", "mk-btn", price); b.style.marginLeft = "auto"; li.appendChild(b); u.appendChild(li);
    });
    p.appendChild(u); document.body.appendChild(p);
  }

  // ------------------------------------------------------------------ 1.29
  function bellEditor(x, y) {
    ensureCss();
    const p = el("div", "mk-pop mk-x"); p.style.width = "560px"; p.style.left = x + "px"; p.style.top = y + "px";
    p.appendChild(el("h4", null, "Chuông làng · phát ở màn chào, khi có báo mới, khi đủ mục tiêu ngày"));
    const g = el("div", "mk-roll");
    const notes = ["ド'", "シ", "ラ", "ソ", "ファ", "ミ", "レ", "ド"], song = [7, 5, 4, 5, 3, -1, 4, -1, 2, 3, 4, 5, 0, -1, 7, -1];
    notes.forEach((nm, r) => { g.appendChild(el("span", null, nm)); for (let c = 0; c < 16; c++) { const i = el("i", (song[c] === r ? "on" : "") + (c % 4 === 0 ? " beat" : "")); g.appendChild(i); } });
    p.appendChild(g);
    const row = el("div"); row.style.cssText = "display:flex;gap:8px;margin-top:10px;align-items:center";
    ["Nghe thử", "Xoá", "Mẫu ngẫu nhiên"].forEach((t, k) => { const b = el("button", "mk-btn", t); if (k) { b.style.background = "#ffffff"; } row.appendChild(b); });
    const s = el("span", null, "16 nốt · lưu trong collection (đồng bộ)"); s.style.cssText = "margin-left:auto;font-size:12px;color:#5b5b70"; row.appendChild(s);
    p.appendChild(row);
    const r2 = el("div"); r2.style.cssText = "margin-top:10px;padding-top:8px;border-top:2px dashed #9aa0b5;font-size:13px"; iconText(r2, "[i:speaker] Nhạc nền theo buổi: sáng · trưa · chiều · tối · đêm (giao diện mùa vẫn dùng nhạc riêng)"); p.appendChild(r2);
    document.body.appendChild(p);
  }
  function fxSun() {                      // nắng xiên buổi sáng + sương sớm trên dải cảnh
    const yard = $("kb-yard").getBoundingClientRect();
    const [c, x] = canvasFor(Math.round(yard.width), Math.round(yard.height)); c.className = "mk-x"; c.style.left = yard.left + "px"; c.style.top = yard.top + "px";
    x.globalAlpha = 0.16; x.fillStyle = "#fff4c0";
    for (let k = 0; k < 6; k++) { const sx = 120 + k * 230; x.beginPath(); x.moveTo(sx, 0); x.lineTo(sx + 70, 0); x.lineTo(sx + 260, yard.height); x.lineTo(sx + 150, yard.height); x.closePath(); x.fill(); }
    x.globalAlpha = 1;
    for (let y = Math.round(yard.height * 0.62); y < yard.height * 0.86; y += 6) { x.globalAlpha = 0.07 + 0.05 * Math.sin(y / 9); x.fillStyle = "#ffffff"; x.fillRect(0, y, yard.width, 6); }
    x.globalAlpha = 1;
    document.body.appendChild(c);
  }
  function fxPlace(ax, ay) {             // bụi lấp lánh khi đặt đồ
    const v = GardenHome._mainView(), yard = $("kb-yard").getBoundingClientRect(), S = v.S;
    const [c, x] = canvasFor(30 * S, 24 * S); c.className = "mk-x"; c.style.left = (yard.left + (v.ox + ax - 7) * S) + "px"; c.style.top = (yard.top + (ay - 6) * S) + "px";
    [[2, 4], [24, 2], [12, 0], [26, 14], [0, 16], [16, 20], [8, 10], [20, 9]].forEach(([dx, dy], i) => pix(x, i % 2 ? ["y"] : SPARK, dx * S, dy * S, Math.max(1, S - (i % 3)), { y: "#ffd23f", Y: "#e9a800", w: "#ffffff" }));
    document.body.appendChild(c);
  }
  return { clear, cap, greet, newsLine, newsPop, uiRows, sparkle, kuji, omikujiBox, moonMeteors, saijiki, milestone, cake, spot, pickPop, collection, vendor, shop, bellEditor, fxSun, fxPlace };
})();
