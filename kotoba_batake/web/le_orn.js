/* ことば畑 – 1.36.3: quả châu tự vẽ (le_core.py giữ mọi luật; file này vẽ + gửi lệnh). Ảnh phác người dùng duyệt 25/11
   (docs/ke_hoach_ve_tay/).
   - Bảng #kb-le-ornpop (mở từ tủ lịch "Vẽ quả châu ▸" / Album → Kỷ niệm): 3 quả, mỗi quả lưới 8 × 8 (32 màu của Xưởng, "."
     trong suốt), Bút / Tẩy / Hoàn tác / Xoá, xem trước ngay trên cây thông của bạn, mỗi quả treo / gỡ riêng, Lưu ảnh PNG.
   - Treo trên mọi cây thông ngoài sân ở 3 chỗ cố định (le_core.ORN_SPOTS) — le.js drawTreeExtra gọi paintOrn.
   - Tự lưu sau khi thôi vẽ ~0,6 giây ("le:orn:{i, p, on, rid, q}"); mỗi nét gửi "le:keep" để đóng cửa sổ ngay vẫn lưu nốt; Anki
     đang đồng bộ thì giữ lại, vườn dựng lại sau đồng bộ thì gửi lại (như xưởng thiệp). Không dùng emoji. */
var GardenLeOrn = (function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const N = 8, CELL = 30, TS = 6;
  let H = null;
  let slot = 0, cur = null, tool = "pen", ink = "r", undo = [], painting = null;
  let timer = 0, rid = 0, kq = 0, mode = null, retry = 0;
  const pend = {};              // ô → {rid, q, p, on, sync}

  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) { e.className = cls; } if (text !== undefined) { e.textContent = text; } return e; }
  function data() { const d = H && H.data && H.data(); return d || null; }
  function le() { const d = data(); return (d && d.le) || null; }
  function art() { return typeof GardenLeArt !== "undefined" ? GardenLeArt : null; }
  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
  function pal() { const v = le(); return (v && v.draw_pal) || {}; }
  function editable() { const v = le(); return !!(v && v.orn_edit); }
  function stored(i) { const v = le(); const o = v && v.orn && v.orn[i]; return o ? { p: o.p, on: o.on ? 1 : 0 } : null; }
  function blank() { return ".".repeat(N * N); }

  // ---- vẽ một quả châu (dùng chung: cây ngoài sân, xem trước, Album) — móc vàng phía trên ----
  function paintOrn(ctx, p, x, y, S, P) {
    if (typeof p !== "string" || p.length !== N * N) { return; }
    P = P || pal();
    ctx.fillStyle = "#e9b949"; ctx.fillRect(Math.round((x + 3) * S), Math.round((y - 1) * S), Math.ceil(2 * S), Math.ceil(S));
    for (let k = 0; k < N * N; k++) {
      const c = p.charAt(k);
      if (c !== "." && P[c]) { ctx.fillStyle = P[c]; ctx.fillRect(Math.round((x + k % N) * S), Math.round((y + Math.floor(k / N)) * S), Math.ceil(S), Math.ceil(S)); }
    }
  }
  // quả châu đang treo: [[chỗ x, chỗ y, 64 ký tự]] (bảng đang mở → bản đang vẽ)
  function hung() {
    const v = le();
    if (!v || !v.orn) { return []; }
    const spots = v.orn_spots || [[4, 24], [20, 27], [12, 12]];
    const out = [];
    for (let i = 0; i < 3; i++) {
      const o = i === slot && cur && isOpen() ? cur : (pend[i] ? { p: pend[i].p, on: pend[i].on } : stored(i));
      if (o && o.on && /[^.]/.test(o.p || "")) { out.push([spots[i][0], spots[i][1], o.p]); }
    }
    return out;
  }

  // ---- lưu ----
  function sendPend(i) {
    const p = pend[i];
    if (!p || !H) { return; }
    rid++; p.rid = rid; p.sync = false;
    H.send("le:orn:" + JSON.stringify({ i: i, p: p.p, on: p.on, rid: rid, q: p.q }));
  }
  function armRetry(ms) {
    clearTimeout(retry);
    retry = setTimeout(() => { retry = 0; let left = false; Object.keys(pend).forEach((k) => { sendPend(+k); left = true; }); if (left) { armRetry(8000); } }, ms);
  }
  function changed() {
    if (!cur || !editable()) { return; }
    kq++;
    if (H) { H.send("le:keep:" + JSON.stringify({ o: slot, q: kq, orn: { p: cur.p, on: cur.on } })); }
    clearTimeout(timer);
    timer = setTimeout(flush, 600);
  }
  function flush() {
    clearTimeout(timer); timer = 0;
    if (!cur || !H) { return; }
    const s = stored(slot);
    if (s && s.p === cur.p && s.on === cur.on && !pend[slot]) { return; }
    if (!s && !/[^.]/.test(cur.p) && !pend[slot]) { return; }
    pend[slot] = { rid: 0, q: kq, p: cur.p, on: cur.on, sync: false };
    sendPend(slot);
    armRetry(6000);
  }

  // ---- bảng ----
  function build() {
    let pop = $("kb-le-ornpop");
    if (pop) { return pop; }
    pop = el("div", "kb-le-pop kb-le-ornpop"); pop.id = "kb-le-ornpop"; pop.hidden = true;
    pop.setAttribute("role", "dialog"); pop.setAttribute("aria-label", "Quả châu tự vẽ");
    const head = pop.appendChild(el("div", "kb-le-head"));
    head.appendChild(el("b", "", "Quả châu tự vẽ"));
    head.appendChild(el("span", "kb-le-hintt", "3 quả · treo lên cây thông ngoài sân"));
    const x = head.appendChild(el("button", "kb-pin-x", "✕")); x.type = "button"; x.setAttribute("aria-label", "Đóng");
    x.addEventListener("click", (ev) => { ev.stopPropagation(); close(); });
    const body = pop.appendChild(el("div", "kb-le-cw"));
    const left = body.appendChild(el("div", "kb-le-cl"));
    left.appendChild(el("div", "kb-le-orn-slots")).id = "kb-le-orn-slots";
    const gc = left.appendChild(document.createElement("canvas")); gc.id = "kb-le-orn-grid"; gc.className = "kb-le-orn-grid";
    gc.width = N * CELL; gc.height = N * CELL; gc.tabIndex = 0; gc.setAttribute("role", "img"); gc.setAttribute("aria-label", "Lưới vẽ quả châu 8 × 8");
    const tools = left.appendChild(el("div", "kb-h-btns kb-le-drawtools"));
    [["pen", "✎ Bút"], ["eraser", "◻ Tẩy"]].forEach(([k, t]) => {
      const b = tools.appendChild(el("button", "kb-btn kb-btn-small", t)); b.type = "button"; b.setAttribute("data-tool", k);
      b.addEventListener("click", () => { tool = k; renderTools(); });
    });
    const ub = tools.appendChild(el("button", "kb-btn kb-btn-small", "↶ Hoàn tác")); ub.type = "button"; ub.id = "kb-le-orn-undo";
    ub.addEventListener("click", undoOne);
    const cb = tools.appendChild(el("button", "kb-btn kb-btn-small", "Xoá")); cb.type = "button"; cb.id = "kb-le-orn-clear";
    cb.addEventListener("click", clearOne);
    left.appendChild(el("div", "kb-le-drawpal kb-le-orn-pal")).id = "kb-le-orn-pal";
    const right = body.appendChild(el("div", "kb-le-cr kb-le-orn-right"));
    const tc = right.appendChild(document.createElement("canvas")); tc.id = "kb-le-orn-tree"; tc.className = "kb-le-orn-tree";
    tc.width = (32 + 8) * TS; tc.height = (44 + 4) * TS;
    right.appendChild(el("div", "kb-le-hintt", "Quả châu treo ở 3 chỗ trên mọi cây thông ngoài sân, tới hết mùa Giáng sinh. Ngày 1/1 StackChan cất vào hộp cùng đồ Noel — quả châu giữ ở Album → Kỷ niệm. Không tốn xu."));
    const rb = right.appendChild(el("div", "kb-h-btns"));
    const hb = rb.appendChild(el("button", "kb-btn kb-btn-small kb-le-hangb", "")); hb.type = "button"; hb.id = "kb-le-orn-hang";
    hb.addEventListener("click", toggleHang);
    const pb = rb.appendChild(el("button", "kb-btn kb-btn-small", "Lưu ảnh PNG")); pb.type = "button"; pb.id = "kb-le-orn-png";
    pb.addEventListener("click", savePng);
    const nt = pop.appendChild(el("div", "kb-le-note")); nt.id = "kb-le-orn-note"; nt.setAttribute("aria-live", "polite");
    pop.addEventListener("click", (ev) => ev.stopPropagation());
    // vẽ trên lưới
    const cell = (ev) => { const r = gc.getBoundingClientRect(); return [Math.floor((ev.clientX - r.left) / (r.width / N)), Math.floor((ev.clientY - r.top) / (r.height / N))]; };
    gc.addEventListener("mousedown", (ev) => {
      if (ev.button !== 0 || !editable() || !cur) { return; }
      ev.preventDefault();
      painting = { before: cur.p };
      paintCell(cell(ev));
      try { gc.focus({ preventScroll: true }); } catch (e) { /* bỏ qua */ }
    });
    window.addEventListener("mousemove", (ev) => { if (painting) { if (!(ev.buttons & 1)) { endPaint(); return; } paintCell(cell(ev)); } });     // thả chuột ngoài cửa sổ: hết nét
    window.addEventListener("mouseup", () => { if (painting) { endPaint(); } });
    gc.addEventListener("keydown", (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && (ev.key === "z" || ev.key === "Z")) { ev.preventDefault(); ev.stopPropagation(); undoOne(); }
    });
    ($("kb-app") || document.body).appendChild(pop);
    return pop;
  }
  function paintCell([i, j]) {
    if (!cur || !painting) { return; }
    // nối từ ô trước tới ô này (chuột kéo nhanh nhảy cóc qua vài ô)
    const a = painting.last || [i, j], n = Math.max(Math.abs(i - a[0]), Math.abs(j - a[1]), 1), c = tool === "eraser" ? "." : ink;
    let p = cur.p;
    for (let t = 0; t <= n; t++) {
      const x = Math.round(a[0] + (i - a[0]) * t / n), y = Math.round(a[1] + (j - a[1]) * t / n);
      if (x >= 0 && x < N && y >= 0 && y < N) { const k = y * N + x; p = p.slice(0, k) + c + p.slice(k + 1); }
    }
    painting.last = [i, j];
    if (p !== cur.p) { cur.p = p; paint(); }
  }
  function endPaint() {
    const st = painting; painting = null;
    if (!st || !cur || st.before === cur.p) { return; }
    undo.push(st.before); if (undo.length > 40) { undo.shift(); }
    if (!/[^.]/.test(st.before) && /[^.]/.test(cur.p) && !stored(slot)) { cur.on = 1; }     // quả mới vẽ: treo luôn
    renderTools(); renderSlots(); changed();
  }
  function undoOne() {
    if (!cur || !editable() || !undo.length) { return; }
    cur.p = undo.pop(); sfx("boop"); render(); changed();
  }
  function clearOne() {
    if (!cur || !editable() || !/[^.]/.test(cur.p)) { return; }
    const go = () => { undo.push(cur.p); cur.p = blank(); sfx("boop"); render(); changed(); };
    if (typeof GardenUI !== "undefined" && GardenUI.ask) { GardenUI.ask({ title: "Xoá quả châu " + (slot + 1) + "?", note: "Bấm Hoàn tác để lấy lại.", yes: "Xoá", always: true, then: go }); }
    else { go(); }
  }
  function toggleHang() {
    if (!cur || !editable() || !/[^.]/.test(cur.p)) { return; }
    cur.on = cur.on ? 0 : 1; sfx(cur.on ? "coin" : "boop");
    note(cur.on ? "Đã treo quả châu " + (slot + 1) + " lên cây thông." : "Đã gỡ quả châu " + (slot + 1) + " khỏi cây.");
    render(); changed(); flush();
  }
  function savePng() {
    if (!H) { return; }
    const cv = document.createElement("canvas"); cv.width = (32 + 8) * 8; cv.height = (44 + 4) * 8;
    drawTree(cv.getContext("2d"), 8, true);
    const d = new Date(), day = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
    sfx("flip");
    H.send("snap:save:" + JSON.stringify({ name: "kotoba_batake_qua_chau_" + day + ".png", url: cv.toDataURL("image/png"), what: "orn" }));
  }
  function note(t, bad) {
    const n = $("kb-le-orn-note");
    if (n) { n.textContent = t || (editable() ? "" : "Mùa Giáng sinh đã qua — quả châu chỉ xem, lưu ảnh."); n.classList.toggle("is-bad", !!bad); }
  }
  function loadSlot(i) {
    flush();
    slot = i; undo = []; painting = null;
    const o = pend[i] ? { p: pend[i].p, on: pend[i].on } : stored(i);
    cur = o ? { p: o.p, on: o.on } : { p: blank(), on: 0 };
  }
  function drawTree(ctx, S, all) {
    const A = art(), v = le() || {};
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#d8ecf7"; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.fillStyle = "#cfe6c4"; ctx.fillRect(0, (44 + 4 - 8) * S, ctx.canvas.width, 8 * S);
    if (!A) { return; }
    A.paint(ctx, A.tree(v.parts || []), 4, 2, S);
    const spots = v.orn_spots || [[4, 24], [20, 27], [12, 12]];
    for (let i = 0; i < 3; i++) {
      const o = i === slot && cur ? cur : (pend[i] ? { p: pend[i].p, on: pend[i].on } : stored(i));
      if (o && /[^.]/.test(o.p) && (o.on || (!all && i === slot))) {
        if (!o.on) { ctx.globalAlpha = 0.45; }
        paintOrn(ctx, o.p, 4 + spots[i][0], 2 + spots[i][1], S);
        ctx.globalAlpha = 1;
      }
    }
  }
  function paint() {
    const gc = $("kb-le-orn-grid");
    if (gc && cur) {
      const g = gc.getContext("2d"), P = pal();
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const c = cur.p.charAt(j * N + i);
          g.fillStyle = c !== "." && P[c] ? P[c] : ((i + j) % 2 ? "#f3ecdf" : "#fffaf0");
          g.fillRect(i * CELL, j * CELL, CELL, CELL);
        }
      }
      g.strokeStyle = "rgba(58,42,34,.18)"; g.lineWidth = 1;
      for (let k = 0; k <= N; k++) { g.beginPath(); g.moveTo(k * CELL + 0.5, 0); g.lineTo(k * CELL + 0.5, N * CELL); g.stroke(); g.beginPath(); g.moveTo(0, k * CELL + 0.5); g.lineTo(N * CELL, k * CELL + 0.5); g.stroke(); }
    }
    const tc = $("kb-le-orn-tree");
    if (tc) { drawTree(tc.getContext("2d"), TS, false); }
  }
  function renderSlots() {
    const box = $("kb-le-orn-slots");
    if (!box) { return; }
    box.textContent = "";
    for (let i = 0; i < 3; i++) {
      const o = i === slot ? cur : (pend[i] ? { p: pend[i].p, on: pend[i].on } : stored(i));
      const has = !!(o && /[^.]/.test(o.p));
      const b = box.appendChild(el("button", "kb-le-orn-slot" + (i === slot ? " is-on" : ""))); b.type = "button"; b.setAttribute("data-orn", i);
      const c = b.appendChild(document.createElement("canvas")); c.width = 10 * 5; c.height = 10 * 5;
      const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
      if (has) { paintOrn(g, o.p, 1, 1.4, 5); }
      b.appendChild(el("span", "", "Quả " + (i + 1) + " · " + (!has ? "trống" : o.on ? "trên cây" : "chưa treo")));
      b.addEventListener("click", () => { if (i !== slot) { loadSlot(i); render(); } });
    }
  }
  function renderTools() {
    const pop = $("kb-le-ornpop");
    if (!pop) { return; }
    const ed = editable();
    Array.prototype.forEach.call(pop.querySelectorAll("[data-tool]"), (b) => { b.classList.toggle("is-on", b.getAttribute("data-tool") === tool); b.disabled = !ed; });
    $("kb-le-orn-undo").disabled = !ed || !undo.length;
    $("kb-le-orn-clear").disabled = !ed || !(cur && /[^.]/.test(cur.p));
    const palBox = $("kb-le-orn-pal"), P = pal();
    if (!palBox.childNodes.length || palBox.getAttribute("data-n") !== String(Object.keys(P).length)) {
      palBox.textContent = ""; palBox.setAttribute("data-n", String(Object.keys(P).length));
      Object.keys(P).forEach((k) => {
        const b = palBox.appendChild(el("button", "kb-le-sw")); b.type = "button"; b.style.background = P[k]; b.setAttribute("data-ink", k); b.title = P[k];
        b.addEventListener("click", () => { ink = k; tool = "pen"; renderTools(); });
      });
    }
    Array.prototype.forEach.call(palBox.childNodes, (b) => { b.classList.toggle("is-on", b.getAttribute("data-ink") === ink && tool === "pen"); b.disabled = !ed; });
    palBox.hidden = !ed;
    const hb = $("kb-le-orn-hang"), has = !!(cur && /[^.]/.test(cur.p));
    hb.hidden = !ed || !has;
    hb.textContent = cur && cur.on ? "Gỡ quả " + (slot + 1) + " khỏi cây" : "Treo quả " + (slot + 1) + " lên cây";
    $("kb-le-orn-grid").classList.toggle("is-ro", !ed);
  }
  function render() {
    const pop = $("kb-le-ornpop");
    if (!pop || pop.hidden) { return; }
    renderSlots(); renderTools(); paint();
  }
  function open(i) {
    const v = le();
    if (!v || !v.orn) { return; }
    const pop = build();
    if (typeof GardenLe !== "undefined" && GardenLe.close) { GardenLe.close(); }
    if (typeof GardenLeCard !== "undefined" && GardenLeCard.close) { GardenLeCard.close(); }
    pop.hidden = false;
    loadSlot(typeof i === "number" ? Math.max(0, Math.min(2, i)) : slot);
    note("");
    render();
  }
  function close() {
    const pop = $("kb-le-ornpop");
    if (!pop || pop.hidden) { return; }
    if (painting) { endPaint(); }
    flush();
    pop.hidden = true;
  }
  function isOpen() { const p = $("kb-le-ornpop"); return !!(p && !p.hidden); }
  function result(res) {
    if (!res || res.act !== "orn") { return; }
    const p = typeof res.i === "number" ? pend[res.i] : null;
    if (!p || (res.rid !== undefined && res.rid !== p.rid)) { return; }
    if (res.ok) { delete pend[res.i]; }
    else if (res.sync) { p.sync = true; armRetry(8000); if (isOpen() && res.i === slot) { note(res.msg, true); } }
    else if (res.retry) { if (isOpen() && res.i === slot) { note(res.msg || "Chưa lưu được quả châu.", true); sfx("again"); } }
    else { delete pend[res.i]; if (isOpen() && res.i === slot) { note(res.msg || "Chưa lưu được quả châu.", true); sfx("again"); } }
    render();
  }
  function renderData() {
    const v = le();
    const m = v ? (v.preview ? "pv:" + (v.preview_key || "") : "real") : mode;
    if (mode !== null && m !== mode) { Object.keys(pend).forEach((k) => { delete pend[k]; }); clearTimeout(timer); timer = 0; if (isOpen()) { loadSlot(slot); } }
    mode = m;
    Object.keys(pend).forEach((k) => { if (pend[k] && pend[k].sync) { sendPend(+k); } });     // đồng bộ xong, vườn dựng lại
    if (!isOpen()) { return; }
    if (!v || !v.orn) { close(); return; }
    if (!painting && !timer && !pend[slot] && !undo.length) { loadSlot(slot); }
    render();
  }
  return {
    init: function (helpers) {
      H = helpers;
      document.addEventListener("keydown", (ev) => {
        const pop = $("kb-le-ornpop");
        if (ev.key !== "Escape" || !pop || pop.hidden) { return; }
        if (typeof GardenUI !== "undefined" && GardenUI.asking && GardenUI.asking()) { return; }
        ev.stopImmediatePropagation(); ev.preventDefault(); window.__kbEscUsed = true;
        close();
      }, true);
      window.addEventListener("beforeunload", flush);
    },
    open: open, close: close, isOpen: isOpen, render: renderData, result: result, paintOrn: paintOrn, hung: hung, flush: flush,
    // cho test
    _cur: () => cur && { p: cur.p, on: cur.on }, _slot: () => slot, _tool: (t, c) => { tool = t || tool; ink = c || ink; renderTools(); },
    _pend: () => JSON.parse(JSON.stringify(pend)), _undoN: () => undo.length
  };
})();
