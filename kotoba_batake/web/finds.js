/* ことば畑 – 1.28: chỗ lấp lánh (nhặt đồ theo vùng), Hộp sưu tầm, gánh hàng rong.
   Python (finds_core.py) giữ mọi thứ có xu / đồ: chỗ nào mở theo lượt ôn hôm nay, nhặt được món gì, phiên hàng, giá.
   File này chỉ vẽ + gửi lệnh:
   - draw(): vẽ người gánh hàng (thứ Tư, Chủ nhật — ở Ga làng quê nếu đã mở, không thì ở Sân vườn) và các chỗ lấp lánh của
     cảnh đang vẽ (sau đồ / khách, trước lớp chọn ô). Chỗ đứng chọn theo ngày + số thứ tự, tránh đồ đã đặt.
   - at() / hit(): bấm chỗ lấp lánh → "find:pick:<k>:<cảnh>"; bấm người bán → bảng gánh hàng.
   - Thẻ "Nhặt được!" (kb-find-card) và bảng gánh hàng (kb-ped-pop) là lớp nổi theo cửa sổ (không tràn khi đổi cỡ).
   - box(list): Hộp sưu tầm trong tab Album của bảng Nhà (home.js gọi).
   Kiểu Dịu mắt / cảnh Đứng yên: lấp lánh không nhấp nháy, người bán không nhún. */
var GardenFinds = (function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const YARD = { W: 256, H: 76, SKY: 28 };
  const GROUND = { x0: 78, x1: 232, y0: 46, y1: 72 };
  const SCENE_NAME = { yard: "Sân vườn", beach: "Bãi biển", shrine: "Đền trên núi", festival: "Phố lễ hội", bamboo: "Rừng tre",
    onsen: "Suối nước nóng", station: "Ga làng quê" };
  let H = null;
  let pending = 0;                 // lệnh nhặt / mua đang chờ Python (chống bấm đúp)
  let lastHits = {};               // cảnh → [{kind, k, box}] của lần vẽ gần nhất (toạ độ cảnh)
  let fx = [];                     // tia sáng khi nhặt: {scene, x, y, t0}
  let cardTimer = 0;

  function data() { const d = H && H.data && H.data(); return (d && d.finds) || null; }
  function hash(n) { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); }
  function salt(str) { let h = 7; for (const ch of String(str)) { h = (h * 31 + ch.charCodeAt(0)) % 100003; } return h; }
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
  function still() { return typeof GardenUI !== "undefined" && GardenUI.get && GardenUI.get("yard") !== "full"; }
  function art() { return typeof GardenFindArt !== "undefined" ? GardenFindArt : null; }

  // ---- vẽ lưới điểm ảnh ----
  function paint(ctx, rows, x, y, S, alpha) {
    const pal = art() ? art().pal : {};
    if (alpha !== undefined) { ctx.globalAlpha = alpha; }
    for (let j = 0; j < rows.length; j++) {
      const r = rows[j];
      for (let i = 0; i < r.length; i++) {
        const c = r.charAt(i);
        if (c === ".") { continue; }
        ctx.fillStyle = pal[c] || c;
        ctx.fillRect(Math.round((x + i) * S), Math.round((y + j) * S), Math.ceil(S), Math.ceil(S));
      }
    }
    if (alpha !== undefined) { ctx.globalAlpha = 1; }
  }
  // icon canvas của một món nhặt được (thẻ, Hộp sưu tầm); found = false → bóng đen "chưa nhặt"
  function icon(id, scale, found) {
    const rows = art() ? art().find(id) : null;
    const sc = scale || 4, n = 12;
    const cv = document.createElement("canvas");
    cv.width = (n + 2) * sc; cv.height = (n + 2) * sc; cv.className = "kb-find-ico";
    const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
    if (rows) {
      const r2 = found === false ? rows.map((r) => r.replace(/[^.]/g, "n")) : rows;
      paint(ctx, r2, 1 + (n - rows[0].length) / 2, 1 + (n - rows.length) / 2, sc, found === false ? 0.55 : undefined);
    }
    return cv;
  }

  // ---- chỗ đứng ----
  function busyHit(busy, x, y, w, h) {
    return (busy || []).some((b) => x + w > b.left - 2 && x < b.right + 2 && y + h > b.top - 1 && y < b.bottom + 2);
  }
  // chỗ lấp lánh thứ k ở cảnh sc hôm nay: cố định theo ngày, tránh đồ (dò lưới bắt đầu ở một chỗ theo ngày)
  function spotPos(day, k, sc, busy) {
    const seed = salt(day + ":" + k + ":" + sc);
    const xs = [], ys = [];
    for (let x = GROUND.x0; x <= GROUND.x1; x += 5) { xs.push(x); }
    for (let y = GROUND.y0; y <= GROUND.y1; y += 4) { ys.push(y); }
    const n = xs.length * ys.length, k0 = Math.floor(hash(seed) * n);
    for (let i = 0; i < n; i++) {
      const j = (k0 + i * 7) % n, x = xs[j % xs.length], y = ys[Math.floor(j / xs.length)];
      if (!busyHit(busy, x - 4, y - 4, 9, 8)) { return { x: x, y: y }; }
    }
    return { x: GROUND.x0 + hash(seed * 1.7) * (GROUND.x1 - GROUND.x0), y: GROUND.y0 + 10 };
  }
  // người bán: chỗ trống gần bên trái cảnh (cạnh nhà / nhà ga), chân trên hàng đất cuối
  function pedPos(busy) {
    for (let x = 70; x <= 200; x += 6) {
      if (!busyHit(busy, x, 48, 30, 26)) { return { x: x, y: 48 }; }
    }
    return { x: 70, y: 48 };
  }

  // ---- vẽ ----
  function sparkle(ctx, S, cx, cy, now, k, calm) {
    const tw = calm ? 0.75 : 0.5 + 0.5 * Math.sin(now / 260 + k * 2.1);
    if (!calm) { cy -= Math.round(Math.max(0, Math.sin(now / 700 + k)) * 1.5); }      // nhún nhẹ cho dễ thấy
    const glow = 4.5 + tw * 3;
    ctx.globalAlpha = 0.22 + 0.2 * tw; ctx.fillStyle = "#fff6a8";
    ctx.beginPath(); ctx.arc((cx + 0.5) * S, (cy + 0.5) * S, glow * S, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
    const arm = 3 + Math.round(tw * 2);
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(Math.round((cx - arm) * S), Math.round(cy * S), (arm * 2 + 1) * S, S);
    ctx.fillRect(Math.round(cx * S), Math.round((cy - arm) * S), S, (arm * 2 + 1) * S);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(cx * S), Math.round(cy * S), S, S);
    if (!calm) {                            // mỗi ~2,4 giây một tia sáng bay lên (dễ thấy ở cảnh nhiều đồ / khách)
      const ph = ((now / 2400) + k * 0.37) % 1;
      if (ph < 0.45) {
        const t = ph / 0.45, yy = cy - 3 - t * 12;
        ctx.globalAlpha = 1 - t; ctx.fillStyle = "#ffffff";
        ctx.fillRect(Math.round((cx - 1) * S), Math.round(yy * S), 3 * S, S);
        ctx.fillRect(Math.round(cx * S), Math.round((yy - 1) * S), S, 3 * S);
        ctx.globalAlpha = 1;
      }
    }
    if (!calm) {                            // hai đốm nhỏ quay quanh
      const a = now / 520 + k;
      ctx.fillStyle = "#fffbe0";
      ctx.fillRect(Math.round((cx + Math.cos(a) * 5) * S), Math.round((cy + Math.sin(a) * 3) * S), S, S);
      ctx.fillRect(Math.round((cx - Math.cos(a) * 4) * S), Math.round((cy - Math.sin(a) * 3 - 1) * S), S, S);
    }
  }
  function draw(ctx, S, ox, oy, sc, now, st, busyFn, photo) {
    const v = data();
    lastHits[sc] = [];
    if (!v || !SCENE_NAME[sc]) { return; }
    let busy = null;
    const getBusy = () => { if (!busy) { busy = busyFn ? busyFn() : []; } return busy; };
    const calm = still();
    // người gánh hàng
    if (v.ped && v.ped.today && v.ped.scene === sc && art()) {
      const p = pedPos(getBusy());
      const fr = !calm && Math.floor(now / 650) % 2 ? "b" : "a";
      ctx.globalAlpha = 0.25; ctx.fillStyle = "#1b1b2f";
      ctx.fillRect(Math.round((ox + p.x + 4) * S), Math.round((oy + p.y + 25) * S), 22 * S, S); ctx.globalAlpha = 1;
      paint(ctx, art().peddler(fr), ox + p.x, oy + p.y, S);
      if (!photo) {
        const bubble = !calm && Math.floor(now / 2400) % 3 === 0;
        if (bubble) {                         // "ghé chơi nè" — bong bóng ¥ nhỏ
          ctx.fillStyle = "#ffffff"; ctx.fillRect(Math.round((ox + p.x + 22) * S), Math.round((oy + p.y - 7) * S), 9 * S, 7 * S);
          ctx.fillStyle = "#1b1b2f"; ctx.fillRect(Math.round((ox + p.x + 25) * S), Math.round((oy + p.y - 5) * S), 3 * S, S);
          ctx.fillRect(Math.round((ox + p.x + 26) * S), Math.round((oy + p.y - 5) * S), S, 4 * S);
          ctx.fillRect(Math.round((ox + p.x + 25) * S), Math.round((oy + p.y - 3) * S), 3 * S, S);
        }
        lastHits[sc].push({ kind: "ped", box: { x: p.x, y: p.y, w: 30, h: 26 } });
      }
    }
    if (photo) { return; }
    // chỗ lấp lánh của cảnh này (đã mở, chưa nhặt)
    (v.spots || []).forEach((s) => {
      if (s.scene !== sc || !s.open || s.picked) { return; }
      const p = spotPos(v.day, s.k, sc, getBusy());
      sparkle(ctx, S, ox + p.x, oy + p.y, now, s.k, calm);
      lastHits[sc].push({ kind: "spot", k: s.k, box: { x: p.x - 7, y: p.y - 8, w: 15, h: 15 } });
    });
    // tia sáng khi vừa nhặt
    fx = fx.filter((f) => now - f.t0 < 900);
    fx.forEach((f) => {
      if (f.scene !== sc) { return; }
      const t = (now - f.t0) / 900;
      ctx.globalAlpha = 1 - t; ctx.fillStyle = "#ffd23f";
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4, r = 2 + t * 12;
        ctx.fillRect(Math.round((ox + f.x + Math.cos(a) * r) * S), Math.round((oy + f.y + Math.sin(a) * r * 0.7) * S), S, S);
      }
      ctx.globalAlpha = 1;
    });
  }

  // ---- bấm ----
  function at(sc, ax, ay) {
    const list = lastHits[sc] || [];
    for (let i = list.length - 1; i >= 0; i--) {
      const b = list[i].box;
      if (ax >= b.x && ax <= b.x + b.w && ay >= b.y && ay <= b.y + b.h) { return list[i]; }
    }
    return null;
  }
  function hit(h, sc, ev) {
    if (!h) { return; }
    if (ev && ev.stopPropagation) { ev.stopPropagation(); }     // cú bấm này không được đóng luôn bảng vừa mở
    if (h.kind === "ped") { sfx("boop"); pedAnchor = ev ? { x: ev.clientX, y: ev.clientY } : null; openPed(); return; }
    if (h.kind === "spot") { pick(h.k, sc, ev, { x: h.box.x + 7, y: h.box.y + 8 }); }
  }
  let lastPick = null;
  function pick(k, sc, ev, p) {
    if (pending && Date.now() - pending < 4000) { return; }
    pending = Date.now();
    lastPick = { k: k, scene: sc, cx: ev ? ev.clientX : innerWidth / 2, cy: ev ? ev.clientY : innerHeight / 2, x: p ? p.x : 0, y: p ? p.y : 0 };
    sfx("flip");
    if (H && H.send) { H.send("find:pick:" + k + ":" + sc); }
  }

  // ---- thẻ "Nhặt được!" ----
  function closeCard() { const c = $("kb-find-card"); if (c) { c.hidden = true; } clearTimeout(cardTimer); }
  function showCard(res) {
    let c = $("kb-find-card");
    if (!c) {
      c = el("div", "kb-find-card"); c.id = "kb-find-card"; c.setAttribute("role", "status");
      c.addEventListener("click", (e) => e.stopPropagation());
      ($("kb-app") || document.body).appendChild(c);
    }
    c.textContent = "";
    const it = res.item;
    const top = c.appendChild(el("div", "kb-find-top"));
    top.appendChild(icon(it.id, 4, true));
    const t = top.appendChild(el("div", "kb-find-txt"));
    const ja = t.appendChild(el("div", "kb-find-ja", it.ja)); ja.setAttribute("lang", "ja");
    const kv = t.appendChild(el("div", "kb-find-kana"));
    kv.appendChild(el("span", null, it.kana)).setAttribute("lang", "ja");
    kv.appendChild(document.createTextNode(" · " + it.vi));
    const x = top.appendChild(el("button", "kb-pin-x", "✕")); x.type = "button"; x.setAttribute("aria-label", "Đóng");
    x.addEventListener("click", closeCard);
    const st = res.set || {};
    const line = c.appendChild(el("div", "kb-find-line" + (st.done ? " is-done" : "")));
    if (st.done) {
      line.textContent = "Đủ bộ " + st.name + "! Quà: " + st.reward_name + " (trong Kho đồ)";
    } else if (res.new) {
      line.textContent = "Nhặt được! Bộ " + st.name + " " + st.n + " / " + st.total;
    } else {
      line.textContent = "Có rồi · đổi " + res.coins + " xu · bộ " + st.name + " " + st.n + " / " + st.total;
    }
    const go = c.appendChild(el("button", "kb-btn kb-btn-small kb-find-go", st.done ? "Đặt quà ▸" : "Hộp sưu tầm ▸"));
    go.type = "button";
    go.addEventListener("click", () => {
      closeCard();
      if (typeof GardenHome === "undefined") { return; }
      if (st.done && st.reward) { placeItem(st.reward); } else if (GardenHome.openBox) { GardenHome.openBox(it.scene); }
    });
    c.hidden = false;
    // gần chỗ vừa bấm, không ra ngoài cửa sổ
    const M = 8, w = c.offsetWidth, h = c.offsetHeight;
    const px = lastPick ? lastPick.cx : innerWidth / 2, py = lastPick ? lastPick.cy : innerHeight / 3;
    c.style.left = Math.max(M, Math.min(innerWidth - w - M, px + 14)) + "px";
    c.style.top = Math.max(M, Math.min(innerHeight - h - M, py - h / 2)) + "px";
    clearTimeout(cardTimer);
    cardTimer = setTimeout(closeCard, st.done ? 12000 : 7000);
  }

  // ---- bảng gánh hàng rong ----
  let pedOpen = false;
  let pedAnchor = null;            // chỗ vừa bấm người bán: bảng mở bên phải, không che người bán
  function closePed() { const p = $("kb-ped-pop"); if (p) { p.hidden = true; } pedOpen = false; pedAnchor = null; }
  function placeItem(id) {
    const d = H && H.data && H.data();
    const it = d && d.catalog && (d.catalog.items || []).find((x) => x.id === id);
    if (!it || typeof GardenHome === "undefined") { return; }
    const sc = it.scene === "room" ? "room" : (GardenHome.mainScene && GardenHome.mainScene() !== "house" ? GardenHome.mainScene() : "yard");
    GardenHome.open(sc);
    if (GardenHome.startPlacing) { GardenHome.startPlacing(id); }
  }
  function goodIcon(g) {
    if (g.kind === "seed") {
      const cv = document.createElement("canvas"); cv.width = 36; cv.height = 36; cv.className = "kb-ped-ico";
      const ctx = cv.getContext("2d"); ctx.imageSmoothingEnabled = false;
      const GS = typeof GardenSeeds !== "undefined" ? GardenSeeds : null;
      const rows = GS ? GS.rows(g.id, 3) : null;
      if (rows) {
        const pal = GS.pal(false, g.id);
        for (let j = 0; j < rows.length; j++) { for (let i = 0; i < rows[j].length; i++) { const c = rows[j].charAt(i); if (c !== ".") { ctx.fillStyle = pal[c] || c; ctx.fillRect(1 + i * 2, 1 + j * 2, 2, 2); } } }
      }
      return cv;
    }
    const c = typeof GardenHome !== "undefined" && GardenHome.icon ? GardenHome.icon(g.id, 36) : null;
    if (c) { c.classList.add("kb-ped-ico"); return c; }
    return el("span", "kb-ped-ico");
  }
  function renderPed() {
    const p = $("kb-ped-pop"), v = data();
    if (!p || !v) { return; }
    const ped = v.ped || {};
    p.textContent = "";
    const head = p.appendChild(el("div", "kb-quest-head"));
    GardenIcons.fill(head.appendChild(el("span")), "[i:peddler] Gánh hàng rong · " + (ped.today ? ped.date : "hôm nay nghỉ"));
    const x = head.appendChild(el("button", "kb-pin-x", "✕")); x.type = "button"; x.setAttribute("aria-label", "Đóng");
    x.addEventListener("click", (e) => { e.stopPropagation(); closePed(); });
    p.appendChild(el("div", "kb-ped-sub", "Ghé thứ Tư và Chủ nhật · phiên sau: " + (ped.next || "")));
    const list = p.appendChild(el("ul", "kb-ped-list"));
    const money = ((H.data() || {}).wallet || {}).coins || 0;
    (ped.goods || []).forEach((g) => {
      const li = list.appendChild(el("li", "kb-ped-row" + (g.kind === "only" ? " is-only" : "")));
      li.setAttribute("data-slot", g.slot);
      li.appendChild(goodIcon(g));
      const t = li.appendChild(el("div", "kb-ped-t"));
      const nm = t.appendChild(el("div", "kb-ped-name", g.name));
      nm.appendChild(el("span", g.kind === "only" ? "kb-ped-tag is-only" : "kb-ped-tag", g.kind === "only" ? "Chỉ có ở gánh hàng" : "−25%"));
      t.appendChild(el("div", "kb-ped-desc", g.kind === "only" ? (g.desc || "") + " · quay lại sau ~4 tuần" :
        "Giá thường " + g.price + " → " + g.now + " xu" + (g.desc ? " · " + g.desc : "")));
      let b;
      if (g.bought) {
        b = el("button", "kb-btn kb-btn-small kb-ped-buy is-done", g.kind === "seed" ? "Đã mua" : "Đã mua · Đặt");
        b.disabled = g.kind === "seed";
        if (g.kind !== "seed") { b.addEventListener("click", () => { closePed(); placeItem(g.id); }); }
      } else if (g.lock) {
        b = el("button", "kb-btn kb-btn-small kb-ped-buy", g.lock); b.disabled = true;
      } else {
        b = el("button", "kb-btn kb-btn-small kb-ped-buy", g.now + " xu");
        b.disabled = money < g.now;
        if (money < g.now) { b.title = "Còn thiếu " + (g.now - money) + " xu"; }
        b.addEventListener("click", () => {
          if (pending && Date.now() - pending < 4000) { return; }
          pending = Date.now(); b.disabled = true;
          H.send("ped:buy:" + g.slot + ":" + (v.day || ""));
        });
      }
      b.type = "button";
      li.appendChild(b);
    });
    if (!ped.today) { list.appendChild(el("li", "kb-ped-empty", "Hôm nay gánh hàng không ghé.")); }
  }
  function openPed() {
    let p = $("kb-ped-pop");
    if (!p) {
      p = el("div", "kb-quest-pop kb-ped-pop"); p.id = "kb-ped-pop"; p.setAttribute("role", "dialog"); p.setAttribute("aria-label", "Gánh hàng rong");
      p.hidden = true;
      p.addEventListener("click", (e) => e.stopPropagation());
      ($("kb-app") || document.body).appendChild(p);
    }
    renderPed();
    closeCard();
    p.hidden = false; pedOpen = true;
    placePed();
  }
  function placePed() {
    const p = $("kb-ped-pop");
    if (!p || p.hidden) { return; }
    const M = 8, vh = innerHeight, vw = document.documentElement.clientWidth || innerWidth;
    p.style.maxHeight = Math.max(160, vh - 2 * M) + "px";
    const y = $("kb-yard"), r = y && y.offsetParent ? y.getBoundingClientRect() : { top: 80, left: 0, right: vw, bottom: 300 };
    const w = p.offsetWidth, h = p.offsetHeight;
    let left = r.left + (r.right - r.left) / 2 - w / 2;
    if (pedAnchor) { left = pedAnchor.x + 48 + w <= vw - M ? pedAnchor.x + 48 : pedAnchor.x - 48 - w; }
    p.style.left = Math.max(M, Math.min(vw - w - M, left)) + "px";
    p.style.top = Math.max(M, Math.min(vh - h - M, r.top + 12)) + "px";
  }

  // ---- kết quả từ Python ----
  function result(res) {
    pending = 0;
    if (!res) { return; }
    const d = H && H.data && H.data();
    if (res.finds && d) { d.finds = res.finds; }
    if (res.wallet && typeof Garden !== "undefined" && Garden.home) { Garden.home({ wallet: res.wallet, action: "find", sub: "" }); }
    if (!res.ok) {
      sfx("again");
      if (H.toast) { H.toast(res.msg || "Không làm được."); }
      if (pedOpen) { renderPed(); }
      return;
    }
    if (res.act === "pick") {
      if (lastPick) { fx.push({ scene: lastPick.scene, x: lastPick.x, y: lastPick.y, t0: Date.now() }); }
      sfx(res.set && res.set.done ? "stage" : res.new ? "coin" : "good");
      showCard(res);
    } else if (res.act === "buy") {
      sfx("coin");
      if (H.toast) {
        H.toast("[i:peddler] Đã mua " + res.name + " · −" + res.paid + " xu" + (res.kind === "seed" ? " · gieo ở tab Giống cây" : " · bấm để đặt"),
          res.kind === "seed" ? null : () => { closePed(); placeItem(res.id); }, 5000);
      }
      if (pedOpen) { renderPed(); }
    }
    if (typeof GardenHome !== "undefined" && GardenHome.dataChanged) { GardenHome.dataChanged(); }
    if (typeof GardenGreet !== "undefined" && GardenGreet.refreshNews) { GardenGreet.refreshNews(); }
  }

  // ---- Hộp sưu tầm (tab Album của bảng Nhà) ----
  function box(list, focusScene) {
    const v = data();
    const b = v && v.box;
    const top = list.appendChild(el("div", "kb-h-card kb-h-wear-top"));
    const ti = top.appendChild(el("div", "kb-h-info"));
    if (!b) { ti.appendChild(el("div", "kb-h-name", "Hộp sưu tầm")); return; }
    GardenIcons.fill(ti.appendChild(el("div", "kb-h-name")), "[i:sparkle] Hộp sưu tầm · " + b.found + "/" + b.total);
    ti.appendChild(el("div", "kb-h-desc", "Mỗi " + (v.per || 10) + " lượt ôn hôm nay mở một chỗ lấp lánh (tối đa " + (v.max || 3) +
      "), ở sân hoặc một vùng đã mở. Món chưa có được ưu tiên; nhặt trùng đổi 3 xu. Đủ một bộ được một món trang trí."));
    const left = (v.spots || []).filter((s) => s.open && !s.picked);
    ti.appendChild(el("div", "kb-h-own", left.length ? "Hôm nay còn " + left.length + " chỗ: " + left.map((s) => SCENE_NAME[s.scene]).join(" · ") :
      v.next ? "Hôm nay " + v.reviews + " lượt · tới " + v.next + " lượt có chỗ lấp lánh mới" : "Hôm nay đã mở đủ " + (v.max || 3) + " chỗ"));
    let focusEl = null;
    (b.sets || []).forEach((s) => {
      const sec = list.appendChild(el("div", "kb-h-sec kb-box-sec" + (s.done ? " is-done" : "")));
      sec.setAttribute("data-scene", s.scene);
      sec.appendChild(document.createTextNode(s.name + " · " + s.n + " / " + s.total + " — "));
      sec.appendChild(el("span", "kb-box-reward", s.done ? "đã nhận " + s.reward_name : "đủ bộ: " + s.reward_name));
      if (!s.open) { sec.appendChild(el("span", "kb-box-lock", " · mở vùng để nhặt")); }
      const grid = list.appendChild(el("div", "kb-box-grid"));
      s.items.forEach((it) => {
        const c = grid.appendChild(el("div", "kb-box-cell" + (it.found ? " is-found" : "")));
        c.setAttribute("data-find", it.id);
        c.appendChild(icon(it.id, 3, it.found));
        if (it.found) {
          const ja = c.appendChild(el("div", "kb-box-ja", it.ja)); ja.setAttribute("lang", "ja");
          const kn = c.appendChild(el("div", "kb-box-kana", it.kana)); kn.setAttribute("lang", "ja");
          c.appendChild(el("div", "kb-box-vi", it.vi));
          const p = it.d.split("-");
          c.title = it.ja + " (" + it.kana + ") · " + it.vi + " · nhặt lần đầu " + p[2] + "/" + p[1] + "/" + p[0] + (it.n > 1 ? " · " + it.n + " lần" : "");
        } else {
          c.appendChild(el("div", "kb-box-ja", "? ?"));
          c.appendChild(el("div", "kb-box-vi", it.season ? it.season + (it.now ? "" : " · chưa tới mùa") : "chưa nhặt"));
          c.title = "Chưa nhặt · " + s.name + (it.season ? " · " + it.season : "");
        }
      });
      if (focusScene === s.scene) { focusEl = sec; }
    });
    if (focusEl) { const f = focusEl; requestAnimationFrame(() => { try { f.scrollIntoView({ block: "start" }); } catch (e) { /* bỏ qua */ } }); }
  }

  // ---- Tin làng: bấm dòng "chỗ lấp lánh" → sang cảnh có chỗ lấp lánh; "gánh hàng" → mở bảng gánh hàng ----
  function fromNews(id) {
    const v = data();
    if (!v) { return false; }
    if (id === "ped" && v.ped && v.ped.today) {
      if (typeof GardenHome !== "undefined" && GardenHome.showMain) { GardenHome.showMain(v.ped.scene); }
      openPed();
      return true;
    }
    if (id === "finds") {
      const s = (v.spots || []).find((x) => x.open && !x.picked);
      if (s && typeof GardenHome !== "undefined" && GardenHome.showMain) { GardenHome.showMain(s.scene); return true; }
    }
    return false;
  }

  function init(helpers) {
    H = helpers;
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") { return; }
      const c = $("kb-find-card"), p = $("kb-ped-pop");
      if (p && !p.hidden) { e.preventDefault(); closePed(); return; }
      if (c && !c.hidden) { e.preventDefault(); closeCard(); }
    });
    document.addEventListener("click", () => { if (pedOpen) { closePed(); } });
    let raf = 0;
    window.addEventListener("resize", () => { if (pedOpen && !raf) { raf = requestAnimationFrame(() => { raf = 0; placePed(); }); } });
  }

  return {
    init: init,
    draw: draw,
    at: at,
    hit: hit,
    result: result,
    box: box,
    icon: icon,
    openPed: openPed,
    closePed: closePed,
    closeCard: closeCard,
    fromNews: fromNews,
    count: function () { const v = data(); return v && v.box ? v.box.found : 0; },
    isOpen: () => pedOpen || !!($("kb-find-card") && !$("kb-find-card").hidden),
    // cho test
    _hits: (sc) => lastHits[sc] || [],
    _pick: pick,
    _state: () => ({ pending: pending, ped: pedOpen, card: !!($("kb-find-card") && !$("kb-find-card").hidden) })
  };
})();
