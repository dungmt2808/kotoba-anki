/* ことば畑 1.20 – 花暦 · Lịch hoa: lịch tháng (hoa theo giao diện mùa), lịch năm (heatmap), cuốn nhật ký;
   khung ngày có nhật ký một dòng + sticker tâm trạng (không gửi cho Gemini) và luyện viết (Gemini sửa 1 lần / ngày).
   Python giữ dữ liệu và gửi sang bằng Garden.calView / calSaved / calFix / calPdf. Mọi chữ của người dùng và của
   Gemini đưa vào trang bằng textContent. */
var GardenCal = (function () {
  "use strict";
  let H = null;
  let isOpen = false;
  let tab = "month";
  let month = null;        // dữ liệu tháng đang xem
  let year = null;         // dữ liệu năm đang xem
  let day = null;          // khung ngày đang xem
  let shelfData = null;    // {shelf, book}
  let sel = null;          // ngày đang chọn (yyyy-mm-dd)
  let pageIdx = 0;         // cặp trang đang mở của cuốn nhật ký
  let shelfYear = null;    // năm đang bày trên kệ sách (mặc định năm của cuốn đang mở)
  let pages = [];
  let composing = false;   // đang gõ bằng bộ gõ (IME tiếng Nhật): không cắt chữ giữa chừng
  const timers = {};
  const seenSent = {};

  const $ = (id) => document.getElementById(id);
  // màu của từng giao diện mùa (vạch dưới ô ngày, dải tháng, gáy sách)
  const COLOR = {
    tet: "#ffcc00", noel: "#2a9d8f", shogatsu: "#d62828", tsukimi: "#f4a261", halloween: "#7b2cbf", momiji: "#e85d04",
    tanabata: "#3d348b", natsumatsuri: "#ef476f", tsuyu: "#6c8ebf", hanami: "#ff8fab", spring: "#ffb7c5",
    summer: "#ffd166", autumn: "#e76f51", winter: "#9ecbff"
  };
  const SHORT = { tet: "Tết", noel: "Giáng sinh", shogatsu: "お正月", tsukimi: "Trung thu", halloween: "Halloween",
    momiji: "Mùa lá đỏ", tanabata: "Thất Tịch", natsumatsuri: "Lễ hội mùa hè", tsuyu: "Mùa mưa", hanami: "Hoa anh đào",
    spring: "Mùa xuân", summer: "Mùa hè", autumn: "Mùa thu", winter: "Mùa đông" };
  const LV_COL = ["#e8dfc4", "#b8e0a8", "#6fcf87", "#2fa85a", "#17713a"];
  const LV_NAME = ["Chưa ôn", "Mầm", "Cây non", "Ra nụ", "Nở rộ"];
  const WD = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  const LOAI_TEXT = { "ngữ pháp": "Ngữ pháp", "dạng chia": "Dạng chia", "từ": "Từ", "trợ từ": "Trợ từ", "chính tả": "Chính tả", "tự nhiên hơn": "Tự nhiên hơn" };
  const INFO = { month: "Bấm một ngày để xem và viết nhật ký.", year: "Dải màu dưới tên tháng là giao diện mùa của tháng đó.",
    book: "Hết tháng, nhật ký tự đóng thành một cuốn." };

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined && text !== null) { e.textContent = text; }
    return e;
  }
  function btn(cls, text, onClick, title) {
    const b = el("button", "kb-btn kb-btn-small " + (cls || ""), text);
    b.type = "button";
    if (title) { b.title = title; }
    if (onClick) { b.addEventListener("click", onClick); }
    return b;
  }
  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
  function stage() { return $("kb-c-stage"); }
  function tint(hex, k) {     // pha màu với trắng (nền chip giao diện mùa)
    const n = parseInt(String(hex || "#dddddd").slice(1), 16);
    const mix = (c) => Math.round(c + (255 - c) * k);
    return "rgb(" + mix(n >> 16) + "," + mix((n >> 8) & 255) + "," + mix(n & 255) + ")";
  }
  function setInfo(text, bad) {
    const i = $("kb-c-info");
    if (!i) { return; }
    GardenIcons.fill(i, text || INFO[tab]);
    i.classList.toggle("is-bad", !!bad);
  }
  function chip(label, value) {
    const c = el("div", "kb-g-chip");
    c.appendChild(el("span", "kb-g-chip-l", label));
    c.appendChild(el("b", null, value));
    return c;
  }
  function setHud(list) {
    const h = $("kb-c-hud");
    h.textContent = "";
    list.forEach((x) => h.appendChild(chip(x[0], x[1])));
  }
  function nf(n) { return String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, "."); }
  function ddmm(ds) { return ds ? Number(ds.slice(8, 10)) + "/" + Number(ds.slice(5, 7)) : ""; }

  // ---------------------------------------------------------------------
  // Hoa của ô lịch: đúng kiểu cây của ruộng (16×16 viền đen) đứng trên đất như ô ruộng
  // ---------------------------------------------------------------------
  function speciesRows(sp, lv) {
    if (lv <= 0) { return null; }
    if (!sp || sp === "goc" || typeof GardenSeeds === "undefined" || !GardenSeeds.rows(sp, lv)) {
      return typeof Garden !== "undefined" && Garden.SPRITES ? Garden.SPRITES[lv] : null;
    }
    return GardenSeeds.rows(sp, lv);
  }
  function flower(sp, lv, s, seed) {
    const cv = document.createElement("canvas");
    cv.width = 18 * s; cv.height = 20 * s;
    cv.className = "kb-cal-fl";
    const ctx = cv.getContext("2d");
    const px = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x * s, y * s, w * s, h * s); };
    px(1, 16, 16, 4, "#8a4a22"); px(1, 16, 16, 1, "#a8643a"); px(0, 17, 1, 2, "#5a3010"); px(17, 17, 1, 2, "#5a3010");
    [[3, 18], [8, 17], [13, 19], [11, 18]].forEach((p, i) => { if (((seed || 0) + i) % 2 === 0) { px(p[0], p[1], 1, 1, "#5a3010"); } });
    const rows = speciesRows(sp, lv);
    if (rows) {
      const pal = typeof GardenSeeds !== "undefined" ? GardenSeeds.pal(false) : { k: "#1b1b2f", g: "#3ccb5e", G: "#2e8b3a", b: "#8a4a22", y: "#ffd23f", p: "#ff7fa0", r: "#ff4f6d", w: "#ffffff" };
      rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) { const c = pal[row[x]]; if (c) { px(x + 1, y, 1, 1, c); } }
      });
    }
    return cv;
  }

  // ---------------------------------------------------------------------
  // Khung bảng
  // ---------------------------------------------------------------------
  function open(opts) {
    if (!H) { return; }
    opts = opts || {};
    if (H.closeOthers) { H.closeOthers(); }
    isOpen = true;
    $("kb-cal").hidden = false;
    const d = H.data && H.data();
    const today = (d && d.journal && d.journal.today) || null;
    sel = opts.date || today || sel;      // mở lại luôn về hôm nay (hoặc ngày được chỉ định)
    month = null; day = null;
    setTab(opts.tab || "month", opts);
  }
  function close() {
    if (!isOpen) { return; }
    flushAll();
    isOpen = false;
    const act = document.activeElement;
    if (act && $("kb-cal").contains(act) && act.blur) { act.blur(); }
    $("kb-cal").hidden = true;
  }
  function setTab(t, opts) {
    flushAll();
    tab = t;
    Array.prototype.forEach.call(document.querySelectorAll(".kb-c-tab"), (b) => {
      b.classList.toggle("is-on", b.getAttribute("data-ctab") === t);
    });
    setInfo("");
    const st = stage();
    st.textContent = "";
    st.scrollTop = 0;
    st.appendChild(el("div", "kb-p-empty", "Đang mở…"));
    if (t === "month") {
      const ym = (opts && opts.month) || (sel ? sel.slice(0, 7) : "");
      H.send("cal:month:" + ym);
      if (sel) { H.send("cal:day:" + sel); }
      setHud([]);
    } else if (t === "year") {
      H.send("cal:year:" + ((opts && opts.year) || (sel ? sel.slice(0, 4) : "")));
      setHud([]);
    } else {
      H.send("cal:book:" + ((opts && opts.book) || ""));
      setHud([]);
    }
  }

  function onView(v) {
    if (!v || !isOpen) { return; }
    if (v.kind === "month") {
      if (v.bought) { sfx("coin"); }
      month = v;
      if (tab !== "month") { return; }
      if (!sel || sel.slice(0, 7) !== v.id) {
        sel = v.today.slice(0, 7) === v.id ? v.today : v.id + "-01";
        H.send("cal:day:" + sel);
      }
      drawMonth();
    } else if (v.kind === "day") {
      if (tab !== "month" || v.d !== sel) { return; }
      day = v;
      drawDay();
      if (v.flash) { setInfo(v.flash, true); sfx("again"); }
    } else if (v.kind === "year") {
      year = v;
      if (tab === "year") { drawYear(); }
    } else if (v.kind === "book") {
      if (!shelfData || !v.book || !shelfData.book || shelfData.book.y !== v.book.y) { shelfYear = v.book ? v.book.y : null; }
      shelfData = v;
      pageIdx = 0;
      if (tab === "book") { drawBook(); }
    }
  }

  // ---------------------------------------------------------------------
  // Tháng
  // ---------------------------------------------------------------------
  function drawMonth() {
    const v = month;
    const st = stage();
    const keepScroll = st.scrollTop;
    st.textContent = "";
    // 1.30.1 (người dùng: "sửa cách diễn đạt … đơn giản dễ hiểu (ví dụ 21 ngày có ôn là gì)"): ghi rõ ôn bao nhiêu ngày trên
    // bao nhiêu ngày đã qua của tháng
    const passed = v.days.filter((d) => !v.today || d.d <= v.today).length;
    setHud([["Ôn liền", (v.streak || 0) + " ngày"], ["Tháng này", "đã ôn " + v.reviewed + "/" + passed + " ngày"]]);
    const body = el("div", "kb-cal-body");
    const L = el("div", "kb-cal-left");
    const nav = el("div", "kb-cal-nav");
    const prev = btn("kb-cal-arrow", "◂", () => go(v.prev), "Tháng trước");
    const next = btn("kb-cal-arrow", "▸", () => go(v.next), "Tháng sau");
    prev.disabled = !v.prev; next.disabled = !v.next;
    nav.appendChild(prev);
    nav.appendChild(el("div", "kb-cal-month", "Tháng " + v.m + " · " + v.y));
    nav.appendChild(next);
    L.appendChild(nav);
    const bands = el("div", "kb-cal-bands");
    v.bands.forEach((b) => {
      const r = el("div", "kb-cal-band");
      const i = el("i"); i.style.background = COLOR[b.id] || "#dddddd";
      r.appendChild(i);
      r.appendChild(el("b", null, b.name));
      r.appendChild(el("span", null, b.start + " – " + b.end + (b.over.length ? " (ưu tiên hơn " + b.over.join(", ") + ")" : "") +
        (b.lunar ? " · âm lịch" : "")));
      bands.appendChild(r);
    });
    L.appendChild(bands);
    if (v.soon && v.soon.length) {
      L.appendChild(el("div", "kb-cal-next", "Sắp tới: " + v.soon.map((x) => x.name + " " + x.start + (x.single ? "" : " – " + x.end) +
        (x.lunar ? " (theo âm lịch)" : "")).join(" · ")));
    }
    const g = el("div", "kb-cal-grid");
    WD.forEach((d) => g.appendChild(el("div", "kb-cal-wd", d)));
    for (let i = 0; i < v.first_wd; i++) { g.appendChild(el("div", "kb-cal-day is-empty")); }
    v.days.forEach((d) => g.appendChild(dayCell(d, v)));
    L.appendChild(g);
    const lg = el("div", "kb-cal-legend");
    const sp = (v.days.find((d) => d.d === v.today) || v.days[0] || {}).sp || "goc";
    for (let l = 0; l <= 4; l++) { const f = flower(sp, l, 2, l); f.title = LV_NAME[l]; lg.appendChild(f); }
    lg.appendChild(el("span", null, "hoa nở rộ: ôn đủ " + v.goal + " lượt trong ngày"));
    lg.appendChild(el("span", "sp"));
    lg.appendChild(el("i", "kb-cal-dot kb-cal-dot-s"));
    lg.appendChild(el("span", null, "có nhật ký"));
    if (v.days.some((d) => d.fz)) {          // bông tuyết + chữ xuống dòng cùng nhau
      const fz = el("span", "kb-cal-lg-fz");
      fz.appendChild(GardenIcons.el("snow"));
      fz.appendChild(el("span", null, "dùng vé"));
      lg.appendChild(fz);
    }
    L.appendChild(lg);
    if (v.freeze) { L.appendChild(freezeRow(v)); }
    body.appendChild(L);
    const R = el("div", "kb-cal-right");
    R.id = "kb-cal-right";
    body.appendChild(R);
    st.appendChild(body);
    if (day && day.d === sel) { drawDay(); } else { R.appendChild(el("div", "kb-cal-card kb-cal-wait-load", "Đang mở…")); }
    st.scrollTop = keepScroll;
  }
  // 1.25.9: vé giữ chuỗi — quên ôn một ngày thì tự dùng 1 vé, chuỗi không đứt (chỉ giữ số ngày liền, không đổi lịch ôn)
  function freezeRow(v) {
    const f = v.freeze;
    const row = el("div", "kb-cal-freeze");
    row.appendChild(GardenIcons.el("snow"));
    const t = el("span", "kb-cal-freeze-t");
    t.appendChild(el("b", null, "Vé giữ chuỗi " + f.n + "/" + f.max));
    t.appendChild(document.createTextNode(" · quên ôn 1 ngày thì tự dùng 1 vé"));
    row.appendChild(t);
    const full = f.n >= f.max, poor = f.coins < f.price;
    const b = btn("kb-cal-freeze-buy", full ? "Đã đủ vé" : "Mua · " + kbXu(f.price) + " xu", () => {
      const buy = () => { b.disabled = true; H.send("cal:freeze:" + v.id); };
      if (typeof GardenUI !== "undefined" && GardenUI.ask) {      // 1.30.1: hỏi lại trước khi trả xu
        GardenUI.ask({ title: "Mua 1 vé giữ chuỗi?", price: f.price, note: "Quên ôn 1 ngày thì vé tự dùng, chuỗi ngày ôn không đứt.", then: buy });
      } else { buy(); }
    }, full ? "Giữ tối đa " + f.max + " vé" : poor ? "Thiếu " + kbXu(f.price - f.coins) + " xu" :
      "Mua 1 vé giữ chuỗi (" + kbXu(f.price) + " xu). Vé chỉ giữ số ngày ôn liên tiếp, không đổi lịch ôn.");
    b.disabled = full || poor;
    row.appendChild(b);
    return row;
  }
  function go(ym) {
    if (!ym) { return; }
    flushAll();
    sel = null; day = null;
    H.send("cal:month:" + ym);
    sfx("flip");
  }
  function dayCell(d, v) {
    const c = el("div", "kb-cal-day" + (d.fut ? " is-future" : "") + (d.d === v.today ? " is-today" : "") + (d.d === sel ? " is-sel" : ""));
    c.setAttribute("data-d", d.d);
    c.tabIndex = 0;
    c.setAttribute("role", "button");
    c.appendChild(el("span", "kb-cal-num", String(d.day)));
    if (!d.fut) {
      c.appendChild(flower(d.sp, d.lv, 3, d.day));
      if (d.mood && GardenIcons.face) { const s = GardenIcons.face(d.mood, 18); s.classList.add("kb-cal-stk"); c.appendChild(s); }
      if (d.note) { c.appendChild(el("i", "kb-cal-dot")); }
      if (d.fz) { const z = GardenIcons.el("snow"); z.classList.add("kb-cal-fz"); c.appendChild(z); }
    }
    const strip = el("i", "kb-cal-strip");
    strip.style.background = COLOR[d.th] || "transparent";
    c.appendChild(strip);
    c.title = (d.fut ? "Ngày chưa tới" : d.n ? d.n + " lượt ôn · " + LV_NAME[d.lv] : d.fz ? "Chưa ôn · dùng vé giữ chuỗi" : "Chưa ôn") +
      (d.th ? " · " + (SHORT[d.th] || "") : "");
    const pick = () => {
      if (sel === d.d) { return; }
      flushAll();
      sel = d.d;
      Array.prototype.forEach.call(stage().querySelectorAll(".kb-cal-day.is-sel"), (x) => x.classList.remove("is-sel"));
      c.classList.add("is-sel");
      day = null;
      const R = $("kb-cal-right");
      if (R) { R.textContent = ""; R.appendChild(el("div", "kb-cal-card kb-cal-wait-load", "Đang mở…")); }
      setInfo("");
      H.send("cal:day:" + d.d);
      sfx("flip");
    };
    c.addEventListener("click", pick);
    c.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(); } });
    return c;
  }
  function refreshCell(ds, mood, note) {
    if (!month) { return; }
    const d = month.days.find((x) => x.d === ds);
    if (!d) { return; }
    d.mood = mood; d.note = note;
    const c = stage().querySelector('.kb-cal-day[data-d="' + ds + '"]');
    if (!c) { return; }
    const nc = dayCell(d, month);
    c.parentNode.replaceChild(nc, c);
  }

  // ---------------------------------------------------------------------
  // Khung ngày: số liệu · nhật ký · luyện viết
  // ---------------------------------------------------------------------
  // 1.28 (audit 12/11 F01): dựng lại khung ngày (kết quả sửa bài về, Python gửi lại ngày…) không được làm mất chữ đang gõ
  // ở ô nhật ký / bài luyện viết chưa tự lưu: lưu ngay chữ đó, dựng lại bằng chữ đó, giữ con trỏ + vùng chọn + focus
  function grabTyping(R, d) {
    const out = {};
    if (R.getAttribute("data-d") !== d) { return out; }
    Array.prototype.forEach.call(R.querySelectorAll("textarea"), (ta) => {
      const k = ta.classList.contains("kb-cal-note") ? "note" : ta.classList.contains("kb-cal-ta") ? "write" : "";
      if (!k || ta.readOnly) { return; }
      const dirty = ta._kbDirty ? ta._kbDirty() : false;
      if (dirty && ta._kbSave && !composing) { ta._kbSave(); }
      out[k] = { val: ta.value, a: ta.selectionStart, b: ta.selectionEnd, dir: ta.selectionDirection,
                 focus: document.activeElement === ta, dirty: dirty, top: ta.scrollTop };
    });
    return out;
  }
  function putTyping(R, keepT) {
    Array.prototype.forEach.call(R.querySelectorAll("textarea"), (ta) => {
      const k = ta.classList.contains("kb-cal-note") ? "note" : ta.classList.contains("kb-cal-ta") ? "write" : "";
      const s = keepT[k];
      if (!s || ta.readOnly) { return; }
      if (s.dirty && ta.value !== s.val) {
        ta.value = s.val;
        ta.dispatchEvent(new Event("kb-sync"));
      }
      if (s.focus) {
        try { ta.focus({ preventScroll: true }); } catch (e) { ta.focus(); }
        try { ta.setSelectionRange(s.a, s.b, s.dir || "none"); } catch (e) { /* ô đã đổi */ }
        ta.scrollTop = s.top;
      }
    });
  }
  function drawDay() {
    const R = $("kb-cal-right");
    if (!R || !day) { return; }
    const v = day;
    const keepT = grabTyping(R, v.d);
    if (keepT.note && keepT.note.dirty) { v.t = keepT.note.val; }          // vừa lưu ở grabTyping
    if (keepT.write && keepT.write.dirty && v.w && !v.w.locked) { v.w.goc = keepT.write.val; }
    R.textContent = "";
    R.setAttribute("data-d", v.d);
    const c1 = el("div", "kb-cal-card");
    const h1 = el("div", "kb-cal-h");
    h1.appendChild(el("span", null, v.title));
    if (v.th) {
      const tg = el("span", "kb-p-tag kb-cal-tag", SHORT[v.th] || v.th_name);
      tg.style.background = tint(COLOR[v.th], 0.72);
      tg.title = "Giao diện mùa của ngày này: " + v.th_name;
      h1.appendChild(tg);
    }
    c1.appendChild(h1);
    const stats = el("div", "kb-cal-stats");
    const row = (k, val, title) => {
      const a = el("span", "kb-cal-k", k), b = el("span", "kb-cal-v", val);
      if (title) { a.title = b.title = title; }
      stats.appendChild(a); stats.appendChild(b);
    };
    if (v.fut) {
      row("Ôn", "Ngày chưa tới");
    } else {
      row("Ôn", v.n ? v.n + " lượt" + (v.new ? " · " + v.new + " thẻ mới" : "") : "Chưa ôn");
      if (v.fruit) {
        row("Thành cây Ra quả", v.fruit + " từ" + (v.fruit_words.length ? ": " + v.fruit_words.slice(0, 4).join(" · ") : ""),
          "Gần đúng: thẻ có khoảng ôn vượt mốc Ra quả trong ngày này (lịch sử ôn không lưu độ bền FSRS từng lượt).");
      }
      if (v.paper) { row("Báo", v.paper); }
      if (v.guests && v.guests.length) { row("Khách mới", v.guests.join(" · "), "Khách ghé vườn lần đầu hôm này (Album khách ở Nhà)."); }
      if (v.finds && v.finds.length) { row("Nhặt được", v.finds.join(" · "), "Món nhặt lần đầu ở chỗ lấp lánh hôm này (Hộp sưu tầm ở Nhà → Album)."); }
      if (v.life && v.life.length) { row("Sinh hoạt", v.life.join(" · "), "Việc của StackChan thấy lần đầu hôm này (Nhà → Album → Sinh hoạt)."); }
    }
    c1.appendChild(stats);
    R.appendChild(c1);
    if (v.editable) { R.appendChild(diaryCard(v)); }
    if (v.w) { R.appendChild(writeCard(v)); }
    autoGrowAll(R);
    putTyping(R, keepT);
  }

  function diaryCard(v) {
    const c = el("div", "kb-cal-card kb-cal-diary");
    const h = el("div", "kb-cal-h");
    h.appendChild(el("span", null, "Nhật ký"));
    h.appendChild(el("small", null, "không gửi cho Gemini"));
    c.appendChild(h);
    const sr = el("div", "kb-cal-stk-row");
    (GardenIcons.faces || []).forEach((k) => {
      const b = el("button", "kb-cal-stk-b" + (v.mood === k ? " is-on" : ""));
      b.type = "button";
      b.title = GardenIcons.faceName(k);
      b.setAttribute("aria-label", GardenIcons.faceName(k));
      b.setAttribute("data-m", k);
      b.appendChild(GardenIcons.face(k, 27));
      b.addEventListener("click", () => {
        const m = v.mood === k ? "" : k;      // bấm lại để bỏ
        v.mood = m;
        Array.prototype.forEach.call(sr.querySelectorAll(".kb-cal-stk-b"), (x) => x.classList.toggle("is-on", x.getAttribute("data-m") === m));
        H.send("cal:mood:" + JSON.stringify({ d: v.d, m: m }));
        sfx(m ? "boop" : "flip");
      });
      sr.appendChild(b);
    });
    c.appendChild(sr);
    const ta = el("textarea", "kb-cal-in kb-cal-note");
    ta.rows = 2;
    ta.maxLength = v.diary_max || 200;
    ta.placeholder = "Hôm nay thế nào?";
    ta.value = v.t || "";
    ta.setAttribute("aria-label", "Nhật ký một dòng");
    ta.spellcheck = false;
    const meta = el("div", "kb-cal-meta");
    meta.appendChild(el("span", null, "Đồng bộ qua AnkiWeb"));
    const cnt = el("span", "kb-cal-cnt", ta.value.length + " / " + ta.maxLength + " ký tự");
    meta.appendChild(cnt);
    const save = () => {
      clearTimeout(timers.note); timers.note = null;
      if (ta.value === (v.t || "")) { return; }
      v.t = ta.value;
      H.send("cal:note:" + JSON.stringify({ d: v.d, t: ta.value }));
    };
    ta.addEventListener("input", () => {
      cnt.textContent = ta.value.length + " / " + ta.maxLength + " ký tự";
      grow(ta);
      keep("note", { d: v.d, t: ta.value });
      if (!composing) { clearTimeout(timers.note); timers.note = setTimeout(save, 1500); }
    });
    ta.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ta.blur(); } });
    ta.addEventListener("blur", save);
    ta.addEventListener("kb-sync", () => { cnt.textContent = ta.value.length + " / " + ta.maxLength + " ký tự"; grow(ta); });
    ta._kbSave = save;
    ta._kbDirty = () => ta.value !== (v.t || "");
    c.appendChild(ta);
    c.appendChild(meta);
    return c;
  }

  // đếm như Python (journal_core.count_units): tiếng Nhật đếm ký tự không tính khoảng trắng, tiếng Anh đếm từ
  const EN_WORD = /[A-Za-z0-9À-ɏ]+(?:['’\-][A-Za-z0-9À-ɏ]+)*/g;
  function units(s, lang) {
    if (lang === "en") { return (String(s || "").match(EN_WORD) || []).length; }
    return Array.from(String(s || "").replace(/\s/g, "")).length;     // đếm theo ký tự (code point) như Python
  }
  function clip(s, lang, max) {
    if (units(s, lang) <= max) { return s; }
    if (lang === "en") {
      let m, n = 0, end = s.length;
      EN_WORD.lastIndex = 0;
      while ((m = EN_WORD.exec(s))) { n++; if (n === max) { end = m.index + m[0].length; break; } }
      const tail = /^[.,!?;:…"'”’)]*/.exec(s.slice(end));
      return s.slice(0, end + (tail ? tail[0].length : 0)).replace(/\s+$/, "");
    }
    let n = 0, out = "";
    for (const ch of s) {
      if (!/\s/.test(ch)) { if (n >= max) { break; } n++; }
      out += ch;
    }
    return out.replace(/\s+$/, "");
  }

  function writeCard(v) {
    const w = v.w;
    const c = el("div", "kb-cal-card kb-cal-write");
    const h = el("div", "kb-cal-h");
    h.appendChild(el("span", null, "Luyện viết"));
    h.appendChild(el("small", null, w.lang === "en" ? "tối đa 30 từ" : "tối đa 60 ký tự (khoảng 20–30 từ)"));
    if (w.today && !w.locked && w.langs.length > 1) {
      const lc = el("div", "kb-ai-chips kb-cal-langs");
      [["ja", "Tiếng Nhật"], ["en", "Tiếng Anh"]].forEach((x) => {
        if (w.langs.indexOf(x[0]) < 0) { return; }
        const b = btn("kb-ai-chip" + (x[0] === w.lang ? " is-on" : ""), x[1], () => {
          if (x[0] === w.lang) { return; }
          flushAll();
          H.send("cal:lang:" + x[0]);
        });
        lc.appendChild(b);
      });
      h.appendChild(lc);
    }
    c.appendChild(h);
    if (w.hints && w.hints.length) {
      const hint = el("div", "kb-cal-hint");
      hint.appendChild(el("span", null, w.locked ? "Gợi ý:" : "Thử dùng:"));
      w.hints.forEach((x) => {
        const s = el("span", "kb-cal-word" + (w.used.indexOf(x) >= 0 ? " is-used" : ""), x);
        s.setAttribute("lang", w.lang);
        hint.appendChild(s);
      });
      if (!w.locked) { hint.appendChild(btn("kb-cal-swap", "Đổi gợi ý", () => { flushAll(); H.send("cal:hint:" + v.d); sfx("flip"); }, "2 từ khác trong các từ phải ôn hôm nay")); }
      c.appendChild(hint);
    }
    const ta = el("textarea", "kb-cal-in kb-cal-ta" + (w.lang === "en" ? " is-en" : ""));
    ta.rows = 2;
    ta.value = w.goc || "";
    ta.setAttribute("lang", w.lang);
    ta.setAttribute("aria-label", "Bài luyện viết");
    ta.spellcheck = false;
    ta.placeholder = w.locked ? "" : w.lang === "en" ? "Write one or two sentences…" : "一、二文を書いてみよう…";
    ta.readOnly = !!w.locked;
    if (w.locked) { ta.classList.add("is-locked"); }
    c.appendChild(ta);
    const meta = el("div", "kb-cal-meta");
    const used = el("span", "kb-cal-used");
    const cnt = el("span", "kb-cal-cnt");
    const paint = (count, usedList) => {
      cnt.textContent = count + " / " + w.max + " " + w.unit;
      cnt.classList.toggle("is-full", count >= w.max);
      if (w.hints && w.hints.length && w.goc !== undefined) {
        const n = usedList.length;
        used.textContent = "Đã dùng " + n + " / " + w.hints.length + " từ gợi ý" + (n && n === w.hints.length ? " ✓" : "");
      } else { used.textContent = ""; }
    };
    paint(w.count, w.used);
    meta.appendChild(used); meta.appendChild(cnt);
    c.appendChild(meta);
    const note = el("div", "kb-cal-cut");
    note.hidden = true;
    c.appendChild(note);
    if (!w.locked) {
      const save = () => {
        clearTimeout(timers.write); timers.write = null;
        if (ta.value === (w.goc || "")) { return; }
        w.goc = ta.value;
        H.send("cal:draft:" + JSON.stringify({ d: v.d, lang: w.lang, t: ta.value }));
      };
      const limit = () => {
        const t = clip(ta.value, w.lang, w.max);
        if (t !== ta.value) {
          ta.value = t;
          note.textContent = "Đã cắt bớt ở " + w.max + " " + w.unit + ".";
          note.hidden = false;
          clearTimeout(timers.cut); timers.cut = setTimeout(() => { note.hidden = true; }, 4000);
        }
      };
      ta.addEventListener("input", () => {
        if (!composing) { limit(); }
        paint(units(ta.value, w.lang), w.used);
        grow(ta);
        keep("draft", { d: v.d, lang: w.lang, t: ta.value });
        if (!composing) { clearTimeout(timers.write); timers.write = setTimeout(save, 800); }
        actsFor(c, v);
      });
      ta.addEventListener("compositionend", () => { setTimeout(() => { limit(); paint(units(ta.value, w.lang), w.used); clearTimeout(timers.write); timers.write = setTimeout(save, 800); }, 0); });
      ta.addEventListener("blur", save);
      ta.addEventListener("kb-sync", () => { paint(units(ta.value, w.lang), w.used); grow(ta); actsFor(c, v); });
      ta._kbSave = save;
      ta._kbDirty = () => ta.value !== (w.goc || "");
    }
    if (w.st === "wait") {
      const box = el("div", "kb-cal-wait");
      const hg = el("div", "kb-cal-wait-h");
      hg.appendChild(GardenIcons.el("hourglass"));
      hg.appendChild(el("b", null, "Gemini đang sửa bài…"));
      box.appendChild(hg);
      box.appendChild(el("div", "kb-cal-why", "Thường mất 10–60 giây. Có thể đóng bảng hoặc làm việc khác — xong sẽ có thông báo."));
      c.appendChild(box);
    } else if (w.st === "queue") {
      const box = el("div", "kb-cal-wait kb-cal-queue");
      const hg = el("div", "kb-cal-wait-h");
      hg.appendChild(GardenIcons.el("hourglass"));
      hg.appendChild(el("b", null, "Hôm nay Gemini hết lượt miễn phí · sẽ tự sửa sau " + (w.reset || "15:00")));
      box.appendChild(hg);
      c.appendChild(box);
    } else if (w.st === "done" && w.fix) {
      c.appendChild(fixBox(w));
      if (!w.fix.seen && !seenSent[v.d]) { seenSent[v.d] = true; H.send("cal:seen:" + v.d); }
    }
    if (w.err && w.st === "") {
      c.appendChild(el("div", "kb-cal-err", "Chưa sửa được: " + w.err + " · không tính lượt, thử lại sau."));
    }
    const acts = el("div", "kb-cal-acts");
    acts.id = "kb-cal-wacts";
    c.appendChild(acts);
    actsFor(c, v);
    return c;
  }
  function actsFor(card, v) {
    const w = v.w;
    const acts = card.querySelector(".kb-cal-acts");
    if (!acts) { return; }
    const ta = card.querySelector(".kb-cal-ta");
    const has = ta && ta.value.trim();
    acts.textContent = "";
    if (w.st === "wait") {
      const b = btn("", "Đang sửa…"); b.disabled = true; acts.appendChild(b);
      acts.appendChild(btn("", "Đóng bảng", close));
      acts.appendChild(el("span", "kb-cal-lock", "Bài đã gửi, tạm khoá để khỏi lệch với bản sửa"));
    } else if (w.st === "done") {
      if (w.today) {
        const b = btn("", "Đã sửa hôm nay"); b.disabled = true; acts.appendChild(b);
        acts.appendChild(el("span", "kb-cal-lock", "Gemini sửa 1 lần mỗi ngày · mai viết bài mới"));
      }
    } else if (w.st === "queue") {
      acts.appendChild(el("span", "kb-cal-lock", "Bài đã gửi, không tính lượt khi Gemini chưa sửa"));
    } else if (!w.today) {
      acts.appendChild(el("span", "kb-cal-lock", w.goc ? "Bài chưa gửi sửa · luyện viết chỉ cho hôm nay" : ""));
    } else if (!w.key) {
      acts.appendChild(el("span", "kb-cal-lock", "Dán khoá Gemini ở tab Nguồn báo để được sửa"));
      acts.appendChild(btn("", "Nguồn báo", () => { close(); if (H.openPaperSrc) { H.openPaperSrc(); } }));
    } else {
      const b = btn("kb-cal-send", "Nhờ Gemini sửa", () => {
        if (!ta || !ta.value.trim()) { return; }
        if (ta._kbSave) { ta._kbSave(); }
        b.disabled = true; b.textContent = "Đang gửi…";
        H.send("cal:fix:" + v.d);
      }, "Gemini sửa 1 lần mỗi ngày (câu đã sửa · lỗi · nhận xét)");
      b.disabled = !has;
      acts.appendChild(b);
      acts.appendChild(el("span", "kb-cal-lock", "Gemini sửa 1 lần mỗi ngày"));
    }
  }
  function fixBox(w) {
    const f = w.fix;
    const box = el("div", "kb-cal-fix");
    let n = 1;
    if (f.segs && f.segs.length) {
      box.appendChild(el("b", null, (n++) + ". Câu đã sửa"));
      const jp = el("div", "kb-cal-fixed" + (w.lang === "en" ? " is-en" : ""));
      jp.setAttribute("lang", w.lang);
      f.segs.forEach((s) => {
        if (s[1] === "d") { const d = el("del", null, s[0]); d.title = "Chữ của bài gốc đã bỏ"; jp.appendChild(d); return; }
        const tag = s[1].indexOf("c") >= 0 ? "mark" : "span";
        const e = el(tag, s[1].indexOf("u") >= 0 ? "is-learned" : null, s[0]);
        if (s[1].indexOf("u") >= 0) { e.title = "Từ đã học"; }
        jp.appendChild(e);
      });
      box.appendChild(jp);
    }
    if (f.loi && f.loi.length) {
      box.appendChild(el("b", null, (n++) + ". Lỗi (" + f.loi.length + (f.con_lai ? "+" : "") + ")"));
      f.loi.forEach((e) => {
        const r = el("div", "kb-cal-why");
        const a = el("span", "kb-cal-errw", (e.goc || "") + " → " + (e.sua || ""));
        a.setAttribute("lang", w.lang);
        r.appendChild(a);
        r.appendChild(document.createTextNode(" — " + (LOAI_TEXT[e.loai] || e.loai) + (e.giai_thich ? " · " + e.giai_thich : "")));
        box.appendChild(r);
      });
      if (f.con_lai) { box.appendChild(el("div", "kb-cal-why kb-cal-more", f.con_lai)); }
    } else {
      box.appendChild(el("b", null, (n++) + ". Không có lỗi"));
      if (f.tu_nhien) {
        const r = el("div", "kb-cal-why");
        r.appendChild(document.createTextNode("Cách nói tự nhiên hơn (không phải sai): "));
        const t = el("span", "kb-cal-errw", f.tu_nhien);
        t.setAttribute("lang", w.lang);
        r.appendChild(t);
        box.appendChild(r);
      }
    }
    if (f.nhan_xet) {
      box.appendChild(el("b", null, n + ". Nhận xét"));
      box.appendChild(el("div", "kb-cal-why", f.nhan_xet));
    }
    return box;
  }

  function grow(ta) {
    ta.style.height = "auto";
    ta.style.height = (ta.scrollHeight + 6) + "px";
  }
  function autoGrowAll(root) { Array.prototype.forEach.call(root.querySelectorAll("textarea"), grow); }
  // 1.23 (KB-01): đóng cửa sổ vườn ngay sau khi gõ (trước lần tự lưu 1,5 / 0,8 giây) làm mất chữ vừa nhập — gửi
  // chữ đang gõ cho Python giữ trong bộ nhớ (không ghi), đóng cửa sổ / đóng hồ sơ thì Python lưu nốt
  function keep(kind, p) { H.send("cal:keep:" + JSON.stringify(Object.assign({ k: kind }, p))); }
  function flushAll() {
    const st = stage();
    if (!st) { return; }
    Array.prototype.forEach.call(st.querySelectorAll("textarea"), (ta) => { if (ta._kbSave) { ta._kbSave(); } });
  }

  function onSaved(r) {
    if (!r) { return; }
    if (!r.ok) { if (isOpen) { setInfo(r.msg || "Không lưu được.", true); } return; }
    refreshCell(r.d, r.mood, r.note);
    if (day && day.d === r.d) {
      day.mood = r.mood;
      if (r.kind === "draft" && day.w) {
        const w = day.w;
        w.used = r.used || []; w.hints = r.hints || w.hints; w.count = r.count;
        const ta = stage().querySelector(".kb-cal-ta");
        if (ta && r.cut && !composing && ta.value !== r.goc) { ta.value = r.goc; w.goc = r.goc; }
        const card = stage().querySelector(".kb-cal-write");
        if (card) {
          const used = card.querySelector(".kb-cal-used");
          if (used && w.hints && w.hints.length) {
            used.textContent = "Đã dùng " + w.used.length + " / " + w.hints.length + " từ gợi ý" + (w.used.length && w.used.length === w.hints.length ? " ✓" : "");
          }
          Array.prototype.forEach.call(card.querySelectorAll(".kb-cal-word"), (s) => s.classList.toggle("is-used", w.used.indexOf(s.textContent) >= 0));
        }
      }
    }
  }
  // Gemini sửa xong (bảng có thể đang mở đúng ngày đó → cập nhật tại chỗ, không cần thông báo)
  function onFix(r) {
    if (isOpen && tab === "month" && r && r.d === sel && r.view) {
      const R = $("kb-cal-right");
      const old = R && R.getAttribute("data-d") === r.d ? R.querySelector(".kb-cal-write") : null;
      if (day && day.d === r.d && old && r.view.w) {
        // 1.28 (F01): bài sửa về → chỉ thay khung Luyện viết; khung Nhật ký (đang gõ, chưa tự lưu) giữ nguyên
        day.w = r.view.w;
        const nc = writeCard(day);
        old.parentNode.replaceChild(nc, old);
        autoGrowAll(nc);
      } else {
        onView(Object.assign({ kind: "day" }, r.view));
      }
      if (!r.ok) { setInfo(r.msg, true); }
      return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------
  // Năm
  // ---------------------------------------------------------------------
  function drawYear() {
    const v = year;
    const st = stage();
    st.textContent = "";
    setHud([["Ôn liền", (v.streak || 0) + " ngày"], ["Liền lâu nhất", (v.sum.best || 0) + " ngày"]]);
    const nav = el("div", "kb-cal-nav kb-cal-ynav");
    const prev = btn("kb-cal-arrow", "◂", () => { H.send("cal:year:" + v.prev); sfx("flip"); }, "Năm trước");
    const next = btn("kb-cal-arrow", "▸", () => { H.send("cal:year:" + v.next); sfx("flip"); }, "Năm sau");
    prev.disabled = !v.prev; next.disabled = !v.next;
    nav.appendChild(prev); nav.appendChild(el("div", "kb-cal-month", "Năm " + v.y)); nav.appendChild(next);
    st.appendChild(nav);
    const sum = el("div", "kb-cal-sum");
    sum.appendChild(chip("Số ngày đã ôn", nf(v.sum.days)));
    sum.appendChild(chip("Số lượt ôn", nf(v.sum.reviews)));
    const fr = chip("Từ ra quả mới", nf(v.sum.fruit));
    fr.title = "Gần đúng: số lượt thẻ vượt mốc Ra quả trong năm";
    sum.appendChild(fr);
    sum.appendChild(chip("Ngày có nhật ký", nf(v.sum.notes)));
    if (v.sum.mood) {
      const c = el("div", "kb-g-chip kb-cal-moodchip");
      c.appendChild(el("span", "kb-g-chip-l", "Hay gặp nhất"));
      c.appendChild(GardenIcons.face(v.sum.mood[0], 16));
      c.appendChild(el("b", null, GardenIcons.faceName(v.sum.mood[0]) + " · " + v.sum.mood[1] + " ngày"));
      sum.appendChild(c);
    }
    st.appendChild(sum);
    const grid = el("div", "kb-cal-year");
    v.months.forEach((mo) => {
      const box = el("div", "kb-cal-mini" + (mo.now ? " is-now" : "") + (mo.fut ? " is-fut" : ""));
      box.setAttribute("role", "button");
      box.tabIndex = 0;
      box.title = "Mở tháng " + mo.m;
      const h = el("div", "kb-cal-mini-h");
      h.appendChild(el("b", null, "Th " + mo.m));
      h.appendChild(el("small", null, mo.fut ? "" : mo.reviewed + " ngày"));
      box.appendChild(h);
      const strip = el("div", "kb-cal-mini-strip");
      mo.strip.forEach((s) => { const i = el("i"); i.style.flex = String(s[1]); i.style.background = COLOR[s[0]] || "#eeeeee"; i.title = SHORT[s[0]] || ""; strip.appendChild(i); });
      box.appendChild(strip);
      const mg = el("div", "kb-cal-mini-grid");
      for (let i = 0; i < mo.first_wd; i++) { mg.appendChild(el("b", "is-blank")); }
      mo.days.forEach((lv, i) => {
        const b = el("b", lv < 0 ? "is-fut" : null);
        b.style.background = lv < 0 ? "#f4f1e4" : LV_COL[lv];
        b.title = (i + 1) + "/" + mo.m + (lv < 0 ? "" : " · " + LV_NAME[lv]);
        mg.appendChild(b);
      });
      box.appendChild(mg);
      const openIt = () => { sel = null; setTab("month", { month: v.y + "-" + (mo.m < 10 ? "0" : "") + mo.m }); sfx("flip"); };
      box.addEventListener("click", openIt);
      box.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openIt(); } });
      grid.appendChild(box);
    });
    st.appendChild(grid);
    const lg = el("div", "kb-cal-ylegend");
    const sp0 = el("span");
    sp0.appendChild(document.createTextNode("Ít "));
    LV_COL.forEach((c, i) => { const x = el("i"); x.style.background = c; x.title = LV_NAME[i]; sp0.appendChild(x); });
    sp0.appendChild(document.createTextNode(" Nhiều"));
    lg.appendChild(sp0);
    (v.legend || []).forEach((k) => { const s = el("span"); const i = el("i"); i.style.background = COLOR[k]; s.appendChild(i); s.appendChild(document.createTextNode(SHORT[k] || k)); lg.appendChild(s); });
    st.appendChild(lg);
  }

  // ---------------------------------------------------------------------
  // Cuốn nhật ký: kệ sách + sách mở hai trang, ngắt trang theo chiều cao thật, xuất PDF
  // ---------------------------------------------------------------------
  function coverCanvas(b, wide) {
    if (b.photo) {
      const img = el("img", "kb-page-cover");
      img.src = b.photo;
      img.alt = "Ảnh vườn";
      return img;
    }
    let cv = null;
    try { cv = typeof GardenHome !== "undefined" && GardenHome.themePreview ? GardenHome.themePreview(b.plain ? null : b.th) : null; } catch (e) { cv = null; }
    if (!cv) { cv = document.createElement("canvas"); cv.width = 256; cv.height = 76; const x = cv.getContext("2d"); x.fillStyle = "#8fd3ff"; x.fillRect(0, 0, 256, 40); x.fillStyle = "#5cbf5c"; x.fillRect(0, 40, 256, 36); }
    cv.className = "kb-page-cover";
    if (wide) { cv.style.width = "100%"; }
    return cv;
  }
  function statCell(k, val) { const d = el("div"); d.appendChild(el("div", "kb-page-sub", k)); d.appendChild(el("b", null, val)); return d; }
  function coverPage(b) {
    const p = el("div", "kb-page kb-page-first");
    p.appendChild(el("div", "kb-page-t", b.title + (b.draft ? " · bản nháp" : "")));
    const sub = (b.m ? (b.plain ? "Giao diện mùa: Tắt" : "Giao diện mùa: " + (b.th_name || "–")) : "Cả năm " + b.y) +
      (b.photo_day ? " · ảnh vườn chụp ngày " + b.photo_day : "");
    p.appendChild(el("div", "kb-page-sub", sub));
    p.appendChild(coverCanvas(b, true));
    const s = b.stats;
    const g = el("div", "kb-page-stats");
    g.appendChild(statCell("Số ngày đã ôn", s.days + " / " + s.of));
    g.appendChild(statCell("Số lượt ôn", nf(s.reviews)));
    g.appendChild(statCell("Từ ra quả mới", nf(s.fruit)));
    g.appendChild(statCell(b.m ? "Ngày ôn nhiều lượt nhất" : "Tháng ôn nhiều lượt nhất", s.best || "–"));
    g.appendChild(statCell("Ngày có nhật ký", String(s.notes)));
    g.appendChild(statCell("Luyện viết", s.writes + " bài · " + s.sentences + " câu"));
    p.appendChild(g);
    if (s.moods && s.moods.length) {
      const m = el("div", "kb-page-line");
      m.appendChild(el("span", null, "Tâm trạng " + (b.m ? "tháng này" : "năm nay") + ":"));
      s.moods.forEach((x) => { const e = el("span", "kb-page-mood"); e.appendChild(GardenIcons.face(x[0], 16)); e.appendChild(document.createTextNode("×" + x[1])); m.appendChild(e); });
      p.appendChild(m);
    }
    if (s.guests && s.guests.length) {      // 1.21: khách gặp lần đầu trong tháng / năm
      const e = el("div", "kb-page-line");
      e.appendChild(el("span", null, "Khách mới:"));
      const names = s.guests.length > 6 ? s.guests.slice(0, 6).join(", ") + "… (" + s.guests.length + " khách)" : s.guests.join(", ");
      e.appendChild(el("span", "kb-page-errs", names));
      p.appendChild(e);
    }
    if (s.errors && s.errors.length) {
      const e = el("div", "kb-page-line");
      e.appendChild(el("span", null, "Lỗi hay gặp:"));
      e.appendChild(el("span", "kb-page-errs", s.errors.map((x) => x[0] + " ×" + x[1]).join(" · ")));
      p.appendChild(e);
    }
    return p;
  }
  function entryRow(r) {
    const e = el("div", "kb-entry");
    e.appendChild(el("span", "d", r.label));
    e.appendChild(flower(r.sp, r.lv, 2, Number(r.d.slice(8, 10))));
    if (r.mood) { e.appendChild(GardenIcons.face(r.mood, 16)); } else { e.appendChild(el("span")); }
    const t = el("div", "txt");
    if (r.t) { t.appendChild(el("span", "dia", r.t)); } else if (!r.w) { t.appendChild(el("span", "dim", r.n ? "Ôn " + r.n + " lượt" : "")); }
    if (r.w) { const wr = el("span", "wr", "✎ " + r.w); wr.setAttribute("lang", r.wl || "ja"); t.appendChild(wr); }
    e.appendChild(t);
    return e;
  }
  // xếp các dòng vào trang có chiều cao cố định (đo sau khi vẽ); không cắt một ngày ra hai trang
  function paginate(b, cls, width, height) {
    const host = el("div", "kb-book-measure " + (cls || ""));
    host.style.width = width; host.style.height = height;
    document.body.appendChild(host);
    const out = [];
    const foot = (p, left) => {     // chân trang có ngay từ đầu để đo đúng phần còn lại cho các dòng
      const f = el("div", "kb-page-foot");
      f.appendChild(el("span", null, left));
      f.appendChild(el("span", "kb-page-no", ""));
      p.appendChild(f);
    };
    const first = coverPage(b);
    foot(first, "ことば畑");
    out.push(first);
    // trang đầu cũng phải vừa khung: ảnh bìa thấp dần (cắt hai bên, vẫn pixel) tới khi không tràn
    host.appendChild(first);
    first.style.width = "100%"; first.style.height = "100%";
    const cov = first.querySelector(".kb-page-cover");
    if (cov) {
      let h = cov.getBoundingClientRect().height;
      while (first.scrollHeight > first.clientHeight + 1 && h > 56) {
        h -= 8;
        cov.style.height = h + "px";
        cov.style.objectFit = "cover";
      }
    }
    first.style.width = ""; first.style.height = "";
    host.removeChild(first);
    const groups = b.months ? b.months.filter((m) => m.rows.length) : [{ title: "", rows: b.rows }];
    let page = null, body = null;
    const newPage = () => {
      page = el("div", "kb-page");
      body = el("div", "kb-page-body");
      page.appendChild(body);
      foot(page, "Chỉ ghi ngày có ôn hoặc có viết");
      host.textContent = "";
      host.appendChild(page);
      out.push(page);
    };
    const fits = () => body.scrollHeight <= body.clientHeight + 1;
    groups.forEach((g) => {
      if (!page) { newPage(); }
      if (g.title) {
        const hd = el("div", "kb-page-mh", g.title);
        body.appendChild(hd);
        if (!fits() && body.children.length > 1) { body.removeChild(hd); newPage(); body.appendChild(hd); }
      }
      g.rows.forEach((r) => {
        const e = entryRow(r);
        body.appendChild(e);
        if (!fits() && body.children.length > 1) {
          body.removeChild(e);
          newPage();
          if (g.title) { body.appendChild(el("div", "kb-page-mh", g.title + " (tiếp)")); }
          body.appendChild(e);
        }
      });
    });
    if (out.length === 1) {
      newPage();
      body.appendChild(el("div", "kb-page-empty", b.draft ? "Tháng này chưa có ngày nào để ghi." : "Không có ngày nào có ôn hoặc có viết."));
    }
    host.remove();
    out.forEach((p, i) => { const no = p.querySelector(".kb-page-no"); if (no) { no.textContent = String(i + 1); } });
    return out;
  }
  function drawBook() {
    const v = shelfData;
    const st = stage();
    st.textContent = "";
    const done = v.shelf.filter((x) => !x.draft).length;
    setHud([["Đã có", done + " cuốn"]]);
    const wrap = el("div", "kb-book-wrap");
    const shelf = el("div", "kb-shelf");
    shelf.id = "kb-shelf";
    wrap.appendChild(shelf);
    const years = Array.from(new Set(v.shelf.map((b) => b.y))).sort((a, b) => a - b);
    if (shelfYear === null || years.indexOf(shelfYear) < 0) { shelfYear = v.book.y; }
    drawShelf(shelf, v, years);
    const right = el("div", "kb-book-right");
    const bk = el("div", "kb-book");
    bk.id = "kb-book";
    right.appendChild(bk);
    const acts = el("div", "kb-book-acts");
    const prev = btn("", "◂ Trang trước", () => { pageIdx = Math.max(0, pageIdx - 1); showPages(); sfx("flip"); });
    const next = btn("", "Trang sau ▸", () => { pageIdx = Math.min(spreads() - 1, pageIdx + 1); showPages(); sfx("flip"); });
    const pdf = btn("", "Xuất PDF", () => exportPdf(v.book, pdf), "Khổ A5 dọc, mỗi cuốn một file");
    prev.id = "kb-book-prev"; next.id = "kb-book-next"; pdf.id = "kb-book-pdf";
    acts.appendChild(prev); acts.appendChild(next); acts.appendChild(pdf);
    right.appendChild(acts);
    wrap.appendChild(right);
    st.appendChild(wrap);
    // trang trên màn hình: rộng bằng nửa sách, cao cố định (vừa khung bảng để thấy cả hàng nút bên dưới)
    const two = bk.clientWidth > 700;
    const pw = two ? Math.floor((bk.clientWidth - 34) / 2) : bk.clientWidth - 26;
    const ph = Math.max(420, Math.min(640, st.clientHeight - 84));
    bk.style.setProperty("--kb-page-h", ph + "px");
    pages = paginate(v.book, "kb-book-screen", pw + "px", ph + "px");
    showPages();
  }
  // 1.20: kệ sách chỉ bày một năm (◂ năm ▸) để nhiều năm vẫn gọn; tháng nào cũng đúng chỗ (Th 1–6 tầng trên,
  // Th 7–12 tầng dưới), cuốn năm (năm đã hết) nằm ngang trên cùng
  function drawShelf(shelf, v, years) {
    shelf.textContent = "";
    shelf.appendChild(el("div", "kb-shelf-h", "Kệ sách"));
    const y = shelfYear;
    const i = years.indexOf(y);
    const nav = el("div", "kb-shelf-nav");
    const prev = btn("kb-shelf-arrow", "◂", () => { shelfYear = years[i - 1]; drawShelf(shelf, v, years); sfx("flip"); }, "Năm trước");
    const next = btn("kb-shelf-arrow", "▸", () => { shelfYear = years[i + 1]; drawShelf(shelf, v, years); sfx("flip"); }, "Năm sau");
    prev.disabled = i <= 0; next.disabled = i >= years.length - 1;
    nav.appendChild(prev);
    nav.appendChild(el("span", "kb-shelf-y", String(y)));
    nav.appendChild(next);
    shelf.appendChild(nav);
    const mine = v.shelf.filter((b) => b.y === y);
    const yb = mine.find((b) => b.year);
    if (yb) {
      const f = el("button", "kb-spine-flat" + (yb.id === v.book.id ? " is-on" : ""), "Năm " + y);
      f.type = "button";
      f.title = "Cuốn năm " + y + " (gộp 12 tháng)";
      f.addEventListener("click", () => { H.send("cal:book:" + yb.id); sfx("flip"); });
      shelf.appendChild(f);
    }
    [[1, 6], [7, 12]].forEach((r) => {
      const books = [];
      for (let m = r[0]; m <= r[1]; m++) { books.push(mine.find((b) => !b.year && b.m === m) || null); }
      if (!books.some(Boolean)) { return; }
      const row = el("div", "kb-shelf-row");
      books.forEach((b, j) => {
        if (!b) { const g = el("span", "kb-spine-gap"); g.title = "Tháng " + (r[0] + j) + " · chưa có cuốn"; row.appendChild(g); return; }
        const sp = el("button", "kb-spine" + (b.id === v.book.id ? " is-on" : "") + (b.draft ? " is-draft" : ""), b.label);
        sp.type = "button";
        sp.style.background = COLOR[b.th] || "#e2a46a";
        sp.title = "Tháng " + b.m + " · " + b.y + (b.draft ? " (bản nháp)" : "");
        sp.addEventListener("click", () => { H.send("cal:book:" + b.id); sfx("flip"); });
        row.appendChild(sp);
      });
      shelf.appendChild(row);
    });
    if (years.length > 1) { shelf.appendChild(el("div", "kb-shelf-note", years.length + " năm · " + v.shelf.filter((b) => !b.draft).length + " cuốn")); }
  }
  function spreads() { const two = $("kb-book") && $("kb-book").clientWidth > 700; return Math.max(1, Math.ceil(pages.length / (two ? 2 : 1))); }
  function showPages() {
    const bk = $("kb-book");
    if (!bk) { return; }
    const two = bk.clientWidth > 700;
    const per = two ? 2 : 1;
    bk.textContent = "";
    pages.slice(pageIdx * per, pageIdx * per + per).forEach((p) => bk.appendChild(p));
    if (per === 2 && bk.children.length === 1) { bk.appendChild(el("div", "kb-page kb-page-blank")); }
    $("kb-book-prev").disabled = pageIdx <= 0;
    $("kb-book-next").disabled = pageIdx >= spreads() - 1;
  }

  // PDF: dựng lại các trang theo khổ A5 (148 × 210 mm), hình (hoa, sticker, ảnh) nằm ngay trong HTML
  const PDF_PAGE = "@page{size:148mm 210mm;margin:0}html,body{margin:0;padding:0;background:#fffdf3}";
  const PDF_CSS = [
    ".kb-pdf{font-family:'Noto Sans','Noto Sans CJK JP',sans-serif;color:#1b1b2f;font-size:11pt}",
    ".kb-pdf .kb-page{width:148mm;height:210mm;box-sizing:border-box;padding:11mm 12mm 9mm;display:flex;flex-direction:column;gap:7px;overflow:hidden;page-break-after:always;break-after:page;background:#fffdf3;border:0;box-shadow:none}",
    ".kb-pdf .kb-page:last-child{page-break-after:auto;break-after:auto}",
    ".kb-pdf .kb-page-body{flex:1;min-height:0;display:flex;flex-direction:column;gap:6px;overflow:hidden}",
    ".kb-pdf .kb-page-t{font-family:'DotGothic16','Noto Sans Mono CJK JP',monospace;font-size:20pt;font-weight:700}",
    ".kb-pdf .kb-page-sub{color:#4a4a66;font-size:9pt}",
    ".kb-pdf .kb-page-cover{width:100%;height:auto;border:2px solid #1b1b2f;image-rendering:pixelated;box-sizing:border-box}",
    ".kb-pdf .kb-page-stats{display:grid;grid-template-columns:1fr 1fr;gap:4px 12px}",
    ".kb-pdf .kb-page-stats b{font-family:'DotGothic16','Noto Sans Mono CJK JP',monospace;font-size:14pt}",
    ".kb-pdf .kb-page-line{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:10pt}",
    ".kb-pdf .kb-page-mood{display:inline-flex;align-items:center;gap:2px}",
    ".kb-pdf .kb-page-mh{font-family:'DotGothic16','Noto Sans Mono CJK JP',monospace;font-size:13pt;font-weight:700;border-bottom:2px solid #1b1b2f;padding-bottom:2px}",
    ".kb-pdf .kb-entry{display:grid;grid-template-columns:42px 38px 18px 1fr;gap:5px;align-items:start;border-bottom:1.5px dashed #d8cfa8;padding-bottom:5px}",
    ".kb-pdf .kb-entry .d{font-family:'DotGothic16','Noto Sans Mono CJK JP',monospace;font-size:9.5pt}",
    ".kb-pdf .kb-entry .kb-cal-fl{width:36px;height:40px;image-rendering:pixelated}",
    ".kb-pdf .kb-entry .txt{line-height:1.45;font-size:10pt;overflow-wrap:anywhere}",
    ".kb-pdf .kb-entry .dia{display:block}",
    ".kb-pdf .kb-entry .wr{display:block;margin-top:2px;font-family:'Noto Sans CJK JP','Noto Sans',sans-serif;color:#2e6b3a}",
    ".kb-pdf .kb-entry .dim{color:#8a8aa0}.kb-pdf .kb-face{image-rendering:pixelated}",
    ".kb-pdf .kb-page-empty{color:#8a8aa0;margin-top:20px}",
    ".kb-pdf .kb-page-foot{margin-top:auto;display:flex;justify-content:space-between;font-size:8.5pt;color:#4a4a66}"
  ].join("");
  function pdfStyle() {
    if (!document.getElementById("kb-pdf-css")) {
      const st = document.createElement("style");
      st.id = "kb-pdf-css";
      st.textContent = PDF_CSS;
      document.head.appendChild(st);
    }
  }
  function exportPdf(b, button) {
    if (!b) { return; }
    pdfStyle();
    const ps = paginate(b, "kb-pdf", "148mm", "210mm");
    const toImg = (root) => {
      Array.prototype.forEach.call(root.querySelectorAll("canvas"), (cv) => {
        const img = document.createElement("img");
        img.className = cv.className;
        try { img.src = cv.toDataURL("image/png"); } catch (e) { return; }
        if (cv.classList.contains("kb-page-cover")) { img.style.width = "100%"; }
        cv.parentNode.replaceChild(img, cv);
      });
    };
    ps.forEach(toImg);
    const html = "<!doctype html><html><head><meta charset='utf-8'><style>" + PDF_PAGE + PDF_CSS + "</style></head><body><div class='kb-pdf'>" +
      ps.map((p) => p.outerHTML).join("") + "</div></body></html>";
    if (button) { button.disabled = true; button.textContent = "Đang xuất…"; }
    H.send("cal:pdf:" + JSON.stringify({ name: b.id, html: html }));
    setTimeout(() => { if (button) { button.disabled = false; button.textContent = "Xuất PDF"; } }, 4000);
  }
  function onPdf(r) {
    const b = $("kb-book-pdf");
    if (b) { b.disabled = false; b.textContent = "Xuất PDF"; }
    if (H.toast) { H.toast(r && r.ok ? "Đã lưu " + r.name : "Chưa xuất được PDF.", null, 5000); }
  }

  function onKey(e) {
    if (!isOpen || e.defaultPrevented) { return; }     // phím vừa mở bảng (L ở màn chính) thì không đóng lại ngay
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") { return; }
    if ((e.key === "l" || e.key === "L") && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); close(); return; }
    if (tab === "book" && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      pageIdx = e.key === "ArrowRight" ? Math.min(spreads() - 1, pageIdx + 1) : Math.max(0, pageIdx - 1);
      showPages();
    }
  }

  return {
    init: function (helpers) {
      H = helpers;
      document.addEventListener("keydown", onKey);
      document.addEventListener("compositionstart", () => { composing = true; }, true);
      document.addEventListener("compositionend", () => { composing = false; }, true);
      $("kb-c-exit").addEventListener("click", close);
      Array.prototype.forEach.call(document.querySelectorAll(".kb-c-tab"), (b) => {
        b.addEventListener("click", () => { if (b.getAttribute("data-ctab") !== tab) { setTab(b.getAttribute("data-ctab")); sfx("flip"); } });
      });
      let rz = null;
      window.addEventListener("resize", () => {
        if (!isOpen || tab !== "book" || !shelfData) { return; }
        clearTimeout(rz); rz = setTimeout(drawBook, 200);
      });
    },
    open: open,
    close: close,
    isOpen: function () { return isOpen; },
    view: onView,
    saved: onSaved,
    fix: onFix,
    pdf: onPdf,
    showing: function (d) { return isOpen && tab === "month" && sel === d; },
    flower: flower,
    COLOR: COLOR,
    // cho test
    _state: function () { return { tab: tab, sel: sel, month: month && month.id, day: day, year: year && year.y, book: shelfData && shelfData.book && shelfData.book.id, pages: pages.length, pageIdx: pageIdx }; },
    _units: units, _clip: clip
  };
})();
