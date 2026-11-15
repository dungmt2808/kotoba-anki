/* ことば畑 · trang web chung — giao diện: Kho hình · Mã cộng đồng · Xem mã · Gửi thiết kế.
   Dữ liệu: data/hinh.json (site/tools/xuat_hinh.js), data/thong_tin.json, data/cong_dong.json (site/tools/them_ma.py).
   Mọi chữ từ dữ liệu đưa vào trang bằng textContent (không innerHTML). */
(function () {
  "use strict";
  const REPO = "dungmt2808/kotoba-anki";
  const ISSUE_TEMPLATE = "chia_se_thiet_ke.yml";
  const BUG_TEMPLATE = "bao_loi.yml";
  const $ = (id) => document.getElementById(id);
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined && text !== null) { e.textContent = text; }
    return e;
  }
  const xu = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") + " xu";
  const fold = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();
  const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const KIND = { ground: "Ngoài trời", floor: "Sàn trong nhà", wall: "Treo tường" };
  const FXN = { none: "Không", sway: "Đung đưa", bounce: "Nhún nhảy", float: "Bay lơ lửng", sparkle: "Lấp lánh", glow: "Phát sáng ban đêm",
    hearts: "Tim bay", notes: "Nốt nhạc", bubbles: "Bong bóng", pulse: "Nhấp nháy sáng", spin: "Xoay tròn" };
  const TNAME = { m: "Món đồ", z: "Vùng", g: "Giống cây" };
  let HINH = { groups: [] }, INFO = null, CD = { ma: [] };
  let seedBase = null, seedPal = null;

  // ---------------------------------------------------------------- tiện ích
  let toastT = 0;
  function toast(msg) {
    const t = $("toast");
    t.textContent = msg; t.hidden = false;
    clearTimeout(toastT); toastT = setTimeout(() => { t.hidden = true; }, 2600);
  }
  async function copy(text, what) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch (e) {
      const ta = el("textarea"); ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (e2) { ok = false; }
      ta.remove();
    }
    toast(ok ? "Đã chép " + (what || "mã") + " — dán vào ô “Dán mã thiết kế” ở tab Xưởng." : "Không chép được — chọn cả đoạn mã rồi chép tay nhé.");
  }
  const fit = (w, h, bw, bh) => Math.max(1, Math.floor(Math.min(bw / w, bh / h)));
  const imgCache = {};
  function loadImg(src) {
    if (!imgCache[src]) {
      imgCache[src] = new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    }
    return imgCache[src];
  }
  function download(cv, name) {
    const a = el("a"); a.download = name; a.href = cv.toDataURL("image/png");
    document.body.appendChild(a); a.click(); a.remove();
  }
  const safeName = (s) => fold(s).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "hinh";

  // ---------------------------------------------------------------- hình của một món
  function frameNames(it) { return it.frames ? Object.keys(it.frames) : []; }
  function cardFrame(g, it) {
    const n = frameNames(it);
    if (g.id === "cay" && it.frames["4"]) { return "4"; }
    if (g.id === "thu" && it.frames.sit) { return "sit"; }
    return n[0];
  }
  function frameCanvas(it, f, dry) { return KB.sprite(it.frames[f], dry && it.dry ? it.dry : it.pal, 1); }
  // canvas 1× của món (ảnh PNG thì vẽ lại vào canvas) — dùng để tải về
  async function baseCanvas(it, f, dry) {
    if (it.img) {
      const im = await loadImg(it.img.src);
      const [c, g] = KB.canvas(im.naturalWidth, im.naturalHeight); g.drawImage(im, 0, 0); return c;
    }
    return frameCanvas(it, f, dry);
  }
  function strip(it, dry) {
    const n = frameNames(it), w = it.w, h = it.h;
    const [c, g] = KB.canvas(n.length * w + (n.length - 1) * 2, h);
    n.forEach((f, i) => KB.paint(g, it.frames[f], dry && it.dry ? it.dry : it.pal, i * (w + 2), 0, 1));
    return c;
  }

  // ---------------------------------------------------------------- Kho hình
  let khoGroup = "", khoQ = "";
  function itemCard(g, it) {
    const b = el("button", "item"); b.type = "button";
    b.setAttribute("data-id", g.id + "/" + it.id);
    const w = it.img ? it.img.w : it.w, h = it.img ? it.img.h : it.h;
    const wide = w > 110;
    if (wide) { b.classList.add("wide"); }
    const art = el("div", "art");
    const S = wide ? fit(w, h, 300, 102) : fit(w, h, 128, 100);
    let cv = null;
    if (it.img) {
      const im = el("img", "px"); im.src = it.img.src; im.width = w * S; im.height = h * S; im.alt = ""; im.loading = "lazy"; im.decoding = "async";
      art.appendChild(im);
    } else {
      cv = KB.scaled(frameCanvas(it, cardFrame(g, it)), S); art.appendChild(cv);
    }
    b.appendChild(art);
    const m = el("div", "meta");
    m.appendChild(el("span", "name", it.name));
    if (it.ja) { m.appendChild(el("span", "ja", it.ja + (it.kana && it.kana !== it.ja ? " · " + it.kana : ""))); }
    if (it.tag) { m.appendChild(el("span", "tag", it.tag)); }
    if (it.price) { m.appendChild(el("span", "price", xu(it.price))); }
    b.appendChild(m);
    b.setAttribute("aria-label", it.name + (it.tag ? ", " + it.tag : ""));
    b.addEventListener("click", () => { location.hash = "hinh/" + g.id + "/" + it.id; });
    // rê chuột: chạy các khung (đi, ngồi, đèn chớp…)
    const fr = frameNames(it);
    if (cv && fr.length > 1 && !reduced && g.id !== "cay") {
      let t = 0, k = 0;
      const same = fr.filter((f) => it.frames[f].length === it.h && it.frames[f][0].length === it.w);
      b.addEventListener("mouseenter", () => {
        clearInterval(t);
        t = setInterval(() => { k = (k + 1) % same.length; const c2 = KB.scaled(frameCanvas(it, same[k]), S); cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); cv.getContext("2d").drawImage(c2, 0, 0); }, 380);
      });
      b.addEventListener("mouseleave", () => {
        clearInterval(t); k = 0;
        const c2 = KB.scaled(frameCanvas(it, cardFrame(g, it)), S); cv.getContext("2d").clearRect(0, 0, cv.width, cv.height); cv.getContext("2d").drawImage(c2, 0, 0);
      });
    }
    return b;
  }
  function matches(g, it, q) {
    if (!q) { return true; }
    const hay = fold([it.name, it.ja, it.kana, it.tag, it.id, it.desc, g.name].join(" "));
    return q.split(/\s+/).every((w) => hay.indexOf(w) >= 0);
  }
  function renderKhoChips() {
    const box = $("kho-chips"); box.textContent = "";
    const mk = (id, label, n) => {
      const c = el("button", "chip", label); c.type = "button";
      if (n !== undefined) { c.appendChild(el("span", "n", String(n))); }
      c.setAttribute("aria-pressed", String(khoGroup === id));
      c.addEventListener("click", () => { khoGroup = id; location.hash = id ? "kho/" + id : "kho"; });
      box.appendChild(c);
    };
    mk("", "Tất cả");
    HINH.groups.forEach((g) => mk(g.id, g.name, g.items.length));
  }
  function renderKho() {
    renderKhoChips();
    const list = $("kho-list"); list.textContent = "";
    const q = fold(khoQ).trim();
    let shown = 0;
    HINH.groups.forEach((g) => {
      if (khoGroup && g.id !== khoGroup) { return; }
      const items = g.items.filter((it) => matches(g, it, q));
      if (!items.length) { return; }
      shown += items.length;
      const sec = el("section", "group"); sec.id = "nhom-" + g.id;
      const head = el("div", "group-head");
      head.appendChild(el("h2", null, g.name));
      if (g.ja) { head.appendChild(el("span", "jp", g.ja)); }
      if (g.desc) { head.appendChild(el("p", null, g.desc)); }
      sec.appendChild(head);
      const grid = el("div", "grid");
      items.forEach((it) => { try { grid.appendChild(itemCard(g, it)); } catch (e) { /* hình hỏng: bỏ qua, không làm hỏng cả trang */ } });
      sec.appendChild(grid);
      list.appendChild(sec);
    });
    const total = HINH.groups.reduce((s, g) => s + g.items.length, 0);
    $("kho-note").textContent = q ? (shown ? "Tìm thấy " + shown + " hình." : "") :
      total + " hình, xuất thẳng từ mã của add-on bản " + HINH.version + ". Bấm vào hình để xem lớn, xem các khung và tải PNG.";
    if (!shown) {
      const e = el("div", "card empty");
      e.appendChild(el("p", null, "Không thấy hình nào khớp “" + khoQ + "”."));
      e.appendChild(el("p", "muted", "Thử tên tiếng Việt không dấu, tên tiếng Nhật, hoặc bỏ bớt chữ."));
      list.appendChild(e);
    }
  }

  // ---------------------------------------------------------------- hộp chi tiết
  let dlgTimer = 0;
  function dlgReset() {
    clearInterval(dlgTimer);
    ["dlg-art", "dlg-frames", "dlg-extra", "dlg-pal", "dlg-dl"].forEach((id) => { $(id).textContent = ""; });
    ["dlg-tag", "dlg-ja", "dlg-desc", "dlg-price"].forEach((id) => { $(id).textContent = ""; $(id).hidden = true; });
  }
  function setText(id, t) { $(id).textContent = t || ""; $(id).hidden = !t; }
  // hình rộng (cảnh vùng, gian phòng…): hộp chi tiết xếp dọc để hình to hơn
  function dlgWide(on) { document.querySelector(".dlg-in").classList.toggle("wide", !!on); }
  const artBox = (w) => (w > 200 ? [880, 340] : [440, 300]);
  function dlgShow() {
    const d = $("dlg");
    if (!d.open) { if (d.showModal) { d.showModal(); } else { d.setAttribute("open", ""); } }
    // focus vào khung hộp (Tab tới nút ✕, Esc đóng) — focus thẳng nút ✕ thì viền chấm hiện cả khi mở bằng chuột / đường dẫn
    document.querySelector(".dlg-in").focus();
  }
  function palette(pal) {
    const box = $("dlg-pal"); box.textContent = "";
    Object.keys(pal || {}).forEach((k) => { const s = el("span"); s.style.background = pal[k]; s.title = pal[k]; box.appendChild(s); });
  }
  function dlBtn(label, make, name) {
    const b = el("button", "btn btn-soft", label); b.type = "button";
    b.addEventListener("click", async () => { try { download(await make(), name); } catch (e) { toast("Không tải được hình."); } });
    $("dlg-dl").appendChild(b);
  }
  function openItem(gid, id) {
    const g = HINH.groups.find((x) => x.id === gid), it = g && g.items.find((x) => x.id === id);
    if (!it) { return false; }
    dlgReset();
    $("dlg-title").textContent = it.name;
    setText("dlg-tag", g.name + (it.tag ? " · " + it.tag : ""));
    setText("dlg-ja", it.ja ? it.ja + (it.kana && it.kana !== it.ja ? " · " + it.kana : "") : "");
    $("dlg-ja").className = "jp-line";
    setText("dlg-desc", it.desc);
    setText("dlg-price", it.price ? "Giá trong vườn: " + xu(it.price) : (g.id === "hiem" || g.id === "qua_bo") ? "Không bán" : "");
    const stage = $("dlg-art");
    const w = it.img ? it.img.w : it.w, h = it.img ? it.img.h : it.h;
    dlgWide(w > 200);
    const S = fit(w, h, artBox(w)[0], artBox(w)[1]);
    if (it.img) {
      const im = el("img", "px"); im.src = it.img.src; im.width = w * S; im.height = h * S; im.alt = it.name;
      stage.appendChild(im);
      dlBtn("Tải PNG ×1", () => baseCanvas(it), "kotoba_" + it.id + ".png");
      dlBtn("Tải PNG ×4", async () => KB.scaled(await baseCanvas(it), 4), "kotoba_" + it.id + "_x4.png");
    } else {
      const fr = frameNames(it);
      let cur = cardFrame(g, it), dry = false, play = false;
      const draw = () => { stage.textContent = ""; const c = KB.scaled(frameCanvas(it, cur, dry), S); c.setAttribute("role", "img"); c.setAttribute("aria-label", it.name); stage.appendChild(c); };
      const chips = [];
      if (fr.length > 1) {
        fr.forEach((f) => {
          const c = el("button", "chip", (it.labels && it.labels[f]) || f); c.type = "button";
          c.addEventListener("click", () => { play = false; clearInterval(dlgTimer); cur = f; sync(); draw(); });
          chips.push([f, c]); $("dlg-frames").appendChild(c);
        });
        if (g.id !== "cay") {
          const p = el("button", "chip", "▶ Chạy"); p.type = "button";
          p.addEventListener("click", () => {
            play = !play; clearInterval(dlgTimer);
            if (play) { dlgTimer = setInterval(() => { cur = fr[(fr.indexOf(cur) + 1) % fr.length]; sync(); draw(); }, 420); }
            sync();
          });
          chips.push(["__play", p]); $("dlg-frames").appendChild(p);
        }
      }
      if (it.dry) {
        const d = el("button", "chip", "Cây héo"); d.type = "button";
        d.addEventListener("click", () => { dry = !dry; sync(); draw(); });
        chips.push(["__dry", d]); $("dlg-frames").appendChild(d);
      }
      const sync = () => chips.forEach(([f, c]) => c.setAttribute("aria-pressed", String(f === "__play" ? play : f === "__dry" ? dry : f === cur)));
      sync(); draw();
      if (g.id === "cay") {
        const row = el("div", "stage"); row.style.marginTop = "10px"; row.style.background = "var(--mist)";
        row.appendChild(KB.scaled(strip(it, false), 3));
        $("dlg-extra").appendChild(el("p", "muted", "Năm giai đoạn: " + fr.map((f) => it.labels[f] || f).join(" → ")));
        $("dlg-extra").appendChild(row);
      }
      palette(it.pal);
      const base = "kotoba_" + it.id;
      dlBtn("Tải PNG ×1", () => frameCanvas(it, cur, dry), base + (fr.length > 1 ? "_" + safeName((it.labels && it.labels[cur]) || cur) : "") + ".png");
      dlBtn("Tải PNG ×8", () => KB.scaled(frameCanvas(it, cur, dry), 8), base + "_x8.png");
      if (fr.length > 1) { dlBtn("Tải dải " + fr.length + " khung", () => KB.scaled(strip(it, dry), 4), base + "_khung_x4.png"); }
    }
    dlgShow();
    return true;
  }

  // ---------------------------------------------------------------- Mã cộng đồng
  let cdKind = "", cdQ = "";
  function designCanvas(d) { return KB.design(d, INFO, seedBase, seedPal); }
  function cdCard(e) {
    const d = e.xem, b = el("article", "item cd");
    const cv = designCanvas(d);
    const wide = d.t === "z" || d.t === "g";
    if (wide) { b.classList.add("wide"); }
    const art = el("div", "art");
    art.appendChild(KB.scaled(cv, wide ? fit(cv.width, cv.height, 320, 124) : fit(cv.width, cv.height, 128, 120)));
    art.style.cursor = "pointer";
    art.addEventListener("click", () => { location.hash = "ma/" + e.id; });
    b.appendChild(art);
    const m = el("div", "meta");
    const nm = el("span", "name"); const k = el("span", "kind " + d.t, TNAME[d.t]); nm.appendChild(k); nm.appendChild(document.createTextNode(d.name));
    m.appendChild(nm);
    m.appendChild(el("span", "by", "Vẽ bởi " + (e.tac_gia || "Ẩn danh") + (e.ngay ? " · " + e.ngay.split("-").reverse().join("/") : "")));
    m.appendChild(el("span", "price", "Làm trong vườn: " + xu(d.price)));
    b.appendChild(m);
    const acts = el("div", "acts");
    const c = el("button", "btn", "Chép mã"); c.type = "button"; c.addEventListener("click", () => copy(e.ma));
    const v = el("button", "btn btn-soft", "Xem"); v.type = "button"; v.addEventListener("click", () => { location.hash = "ma/" + e.id; });
    acts.appendChild(c); acts.appendChild(v); b.appendChild(acts);
    return b;
  }
  function renderCD() {
    const chips = $("cd-chips"); chips.textContent = "";
    const all = CD.ma || [];
    [["", "Tất cả"], ["m", "Món đồ"], ["z", "Vùng"], ["g", "Giống cây"]].forEach(([k, label]) => {
      const n = k ? all.filter((e) => e.xem.t === k).length : all.length;
      const c = el("button", "chip", label); c.type = "button"; c.appendChild(el("span", "n", String(n)));
      c.setAttribute("aria-pressed", String(cdKind === k));
      c.addEventListener("click", () => { cdKind = k; renderCD(); });
      chips.appendChild(c);
    });
    const list = $("cd-list"); list.textContent = "";
    const q = fold(cdQ).trim();
    const items = all.filter((e) => (!cdKind || e.xem.t === cdKind) && (!q || q.split(/\s+/).every((w) => fold([e.xem.name, e.tac_gia, e.ghi_chu, TNAME[e.xem.t]].join(" ")).indexOf(w) >= 0)))
      .slice().sort((a, b) => String(b.ngay).localeCompare(String(a.ngay)));
    items.forEach((e) => { try { list.appendChild(cdCard(e)); } catch (err) { /* mã hỏng: bỏ qua */ } });
    if (!items.length) {
      const e = el("div", "card empty"); e.style.gridColumn = "1 / -1";
      if (all.length) { e.appendChild(el("p", null, "Không có thiết kế nào khớp.")); }
      else {
        e.appendChild(el("p", null, "Chưa có thiết kế nào được đăng."));
        const p = el("p"); p.appendChild(document.createTextNode("Vẽ trong Xưởng rồi "));
        const a = el("a", null, "gửi thiết kế đầu tiên"); a.href = "#gui"; p.appendChild(a); p.appendChild(document.createTextNode(" nhé!"));
        e.appendChild(p);
      }
      list.appendChild(e);
    }
  }
  function infoList(d) {
    const dl = el("dl", "info");
    const add = (k, v) => { dl.appendChild(el("dt", null, k)); dl.appendChild(el("dd", null, v)); };
    add("Loại", TNAME[d.t]);
    if (d.t === "m") { add("Cỡ", d.size + " × " + d.size); add("Đặt ở", KIND[d.kind] || d.kind); add("Hiệu ứng", FXN[d.fx] || "Không"); }
    if (d.t === "z") {
      const bg = (INFO.uzone.bg.find((b) => b.id === d.bg) || {}).name || d.bg;
      add("Nền", bg); add("Công trình", d.lm ? "Có" : "Chưa vẽ"); add("Cảnh nền", d.env ? "Có" : "Chưa vẽ");
    }
    if (d.t === "g") { add("Đã vẽ", d.st.filter(Boolean).length + "/5 giai đoạn"); }
    add("Làm trong vườn", xu(d.price));
    return dl;
  }
  function openCD(id) {
    const e = (CD.ma || []).find((x) => x.id === id);
    if (!e) { return false; }
    const d = e.xem;
    dlgReset();
    $("dlg-title").textContent = d.name;
    setText("dlg-tag", "Mã cộng đồng · " + TNAME[d.t]);
    setText("dlg-ja", "Vẽ bởi " + (e.tac_gia || "Ẩn danh") + (e.ngay ? " · " + e.ngay.split("-").reverse().join("/") : ""));
    $("dlg-ja").className = "who";
    setText("dlg-desc", e.ghi_chu);
    const cv = designCanvas(d);
    dlgWide(cv.width > 200);
    $("dlg-art").appendChild(KB.scaled(cv, fit(cv.width, cv.height, artBox(cv.width)[0], artBox(cv.width)[1])));
    $("dlg-extra").appendChild(infoList(d));
    $("dlg-extra").appendChild(el("div", "codebox", e.ma));
    const c = el("button", "btn", "Chép mã"); c.type = "button"; c.addEventListener("click", () => copy(e.ma));
    $("dlg-dl").appendChild(c);
    dlBtn("Tải PNG ×4", () => KB.scaled(designCanvas(d), 4), "kotoba_" + safeName(d.name) + "_x4.png");
    dlgShow();
    return true;
  }

  // ---------------------------------------------------------------- Xem mã
  let lastCode = "";
  async function xemMa() {
    const raw = $("xm-in").value, out = $("xm-out"), err = $("xm-err");
    out.textContent = ""; err.hidden = true;
    let d;
    try { d = await KB.decode(raw, INFO); } catch (e) { err.textContent = e.message; err.hidden = false; return; }
    lastCode = raw.split(/\s+/).join("");
    const box = el("div", "result");
    const st = el("div", "stage");
    const cv = designCanvas(d);
    st.appendChild(KB.scaled(cv, fit(cv.width, cv.height, 640, 300)));
    box.appendChild(st);
    const info = el("div", "card");
    info.appendChild(el("h2", null, d.name));
    info.appendChild(infoList(d));
    const row = el("div", "row");
    const c = el("button", "btn", "Chép mã"); c.type = "button"; c.addEventListener("click", () => copy(lastCode));
    const s = el("button", "btn btn-peach", "Gửi mã này lên trang"); s.type = "button";
    s.addEventListener("click", () => { $("gui-ma").value = lastCode; updateGui(); location.hash = "gui"; });
    const p = el("button", "btn btn-soft", "Tải PNG"); p.type = "button";
    p.addEventListener("click", () => download(KB.scaled(designCanvas(d), 4), "kotoba_" + safeName(d.name) + "_x4.png"));
    row.appendChild(c); row.appendChild(s); row.appendChild(p);
    info.appendChild(row);
    info.appendChild(el("p", "muted", "Trong vườn: Nhà & Cửa hàng → Xưởng → ô “Dán mã thiết kế” → Xem trước → Làm món này."));
    box.appendChild(info);
    out.appendChild(box);
  }

  // ---------------------------------------------------------------- Gửi thiết kế
  function updateGui() {
    const code = $("gui-ma").value.split(/\s+/).join(""), name = $("gui-ten").value.trim(), note = $("gui-note").value.trim();
    const q = new URLSearchParams({ template: ISSUE_TEMPLATE, title: "[Chia sẻ] " + (name ? "thiết kế của " + name : "thiết kế mới") });
    if (code && code.length <= 6000) { q.set("ma", code); }
    if (name) { q.set("tac_gia", name); }
    if (note) { q.set("ghi_chu", note); }
    $("gui-gh").href = "https://github.com/" + REPO + "/issues/new?" + q.toString();
    const mail = INFO && INFO.contact;
    const gm = $("gui-mail");
    if (mail) {
      const body = "Mã thiết kế:\n" + (code && code.length <= 1800 ? code : "(dán mã vào đây)") + "\n\nTên hiển thị: " + (name || "Ẩn danh") +
        "\nGhi chú: " + (note || "") + "\n\nTớ tự vẽ thiết kế này và đồng ý để nó được đăng công khai trên trang ことば畑.";
      gm.href = "mailto:" + mail + "?subject=" + encodeURIComponent("[ことば畑] Chia sẻ thiết kế") + "&body=" + encodeURIComponent(body);
      gm.hidden = false;
    } else { gm.hidden = true; }
    $("gui-hint").textContent = code.length > 6000
      ? "Mã dài (vùng có cảnh nền) — bấm Gửi rồi dán mã vào ô “Mã thiết kế” của mẫu GitHub / vào thư."
      : "GitHub cần tài khoản (miễn phí). Không có thì gửi email — mã được điền sẵn vào thư.";
  }

  // ---------------------------------------------------------------- tranh nhỏ ở đầu trang
  function heroArt() {
    const cv = $("hero-art"), W = 84, H = 30;
    cv.width = W * 2; cv.height = H * 2;
    const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
    const cay = HINH.groups.find((x) => x.id === "cay"), thu = HINH.groups.find((x) => x.id === "thu");
    const goc = cay && cay.items.find((x) => x.id === "goc"), sakura = cay && cay.items.find((x) => x.id === "sakura");
    const pet = thu && (thu.items.find((x) => x.id === "shiba") || thu.items[0]);
    const sc = HINH.groups.find((x) => x.id === "stackchan"), bot = sc && sc.items[0];
    let k = 0;
    const draw = (im) => {
      g.clearRect(0, 0, cv.width, cv.height);
      g.fillStyle = "#8a4a22"; g.fillRect(0, (H - 3) * 2, W * 2, 6);
      g.fillStyle = "#3ccb5e"; g.fillRect(0, (H - 4) * 2, W * 2, 2);
      if (im) { g.drawImage(im, 2 * 2, (H - 4 - im.naturalHeight) * 2, im.naturalWidth * 2, im.naturalHeight * 2); }
      [goc && ["2", goc], goc && ["4", goc], sakura && ["4", sakura]].forEach((p, i) => {
        if (p && p[1].frames[p[0]]) { const c = KB.scaled(frameCanvas(p[1], p[0]), 2); g.drawImage(c, (26 + i * 17) * 2, (H - 4 - 16) * 2); }
      });
      if (pet) {
        const f = pet.frames[k % 2 ? "walk1" : "walk0"] ? (k % 2 ? "walk1" : "walk0") : frameNames(pet)[0];
        const c = KB.scaled(frameCanvas(pet, f), 2);
        g.drawImage(c, (W - 2 - pet.w) * 2, (H - 4 - pet.h) * 2);
      }
    };
    const go = (im) => { draw(im); if (!reduced) { setInterval(() => { k++; draw(im); }, 520); } };
    if (bot && bot.img) { loadImg(bot.img.src).then(go, () => go(null)); } else { go(null); }
  }

  // ---------------------------------------------------------------- điều hướng
  const TABS = ["kho", "cong-dong", "xem-ma", "gui", "bao-loi"];
  function route() {
    const h = decodeURIComponent(location.hash.replace(/^#/, ""));
    const [a, b, c] = h.split("/");
    let tab = TABS.indexOf(a) >= 0 ? a : (a === "hinh" ? "kho" : a === "ma" ? "cong-dong" : "kho");
    const d = $("dlg");
    if (a === "hinh") {
      if (khoGroup && khoGroup !== b) { khoGroup = ""; renderKho(); }
      if (!openItem(b, c)) { tab = "kho"; }
    } else if (a === "ma") {
      if (!openCD(b)) { tab = "cong-dong"; }
    } else if (d.open) { d.close(); }
    if (a === "kho") {
      const g = b && HINH.groups.some((x) => x.id === b) ? b : "";
      if (g !== khoGroup) { khoGroup = g; renderKho(); }
    }
    TABS.forEach((t) => { $("tab-" + t).hidden = t !== tab; });
    document.querySelectorAll(".tabs a").forEach((x) => { if (x.getAttribute("data-tab") === tab) { x.setAttribute("aria-current", "page"); } else { x.removeAttribute("aria-current"); } });
    if (a !== "hinh" && a !== "ma") { window.scrollTo(0, 0); }
  }
  let lastTab = "#kho";
  function closeDlg() {
    const d = $("dlg");
    clearInterval(dlgTimer);
    if (d.open) { d.close(); }
    if (/^#(hinh|ma)\//.test(location.hash)) {
      const back = location.hash.indexOf("#ma/") === 0 ? "#cong-dong" : (khoGroup ? "#kho/" + khoGroup : "#kho");
      history.replaceState(null, "", back); lastTab = back; route();
    }
  }

  async function getJSON(url, fallback) {
    try { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) { throw new Error(r.status); } return await r.json(); } catch (e) { return fallback; }
  }
  async function start() {
    [HINH, INFO, CD] = await Promise.all([getJSON("data/hinh.json", { groups: [] }), getJSON("data/thong_tin.json", null), getJSON("data/cong_dong.json", { ma: [] })]);
    if (!INFO) { document.body.appendChild(el("p", "err", "Không tải được dữ liệu của trang. Thử tải lại nhé.")); return; }
    if (!Array.isArray(CD.ma)) { CD.ma = []; }
    const cay = HINH.groups.find((x) => x.id === "cay"), goc = cay && cay.items.find((x) => x.id === "goc");
    if (goc) { seedBase = goc.frames["0"]; seedPal = goc.pal; }
    $("n-kho").textContent = String(HINH.groups.reduce((s, g) => s + g.items.length, 0));
    $("n-cd").textContent = String(CD.ma.length);
    $("ver").textContent = "ことば畑 " + (HINH.version || INFO.version);
    if (INFO.contact) { $("mail-link").href = "mailto:" + INFO.contact; } else { $("mail-link").hidden = true; }
    $("repo-link").href = "https://github.com/" + REPO;
    // Báo lỗi: mẫu issue bao_loi.yml, email liên hệ của add-on, danh sách lỗi đã báo
    $("bl-gh").href = "https://github.com/" + REPO + "/issues/new?template=" + BUG_TEMPLATE;
    $("bl-list").href = "https://github.com/" + REPO + "/issues?q=" + encodeURIComponent("label:bao-loi");
    if (INFO.contact) {
      $("bl-mail").href = "mailto:" + INFO.contact + "?subject=" + encodeURIComponent("ことば畑 · Báo lỗi") + "&body=" +
        encodeURIComponent("Mô tả lỗi:\n\n\nCác bước làm lại lỗi:\n\n\nBáo cáo (Tools → ことば畑 · Báo lỗi → Chép):\n");
    } else { $("bl-mail").hidden = true; }
    renderKho(); renderCD(); updateGui(); heroArt();
    $("kho-q").addEventListener("input", (e) => { khoQ = e.target.value; renderKho(); });
    $("cd-q").addEventListener("input", (e) => { cdQ = e.target.value; renderCD(); });
    $("xm-go").addEventListener("click", xemMa);
    $("xm-in").addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { xemMa(); } });
    $("xm-in").addEventListener("paste", () => setTimeout(xemMa, 0));
    $("xm-clear").addEventListener("click", () => { $("xm-in").value = ""; $("xm-out").textContent = ""; $("xm-err").hidden = true; $("xm-in").focus(); });
    $("xm-paste").addEventListener("click", async () => {
      try { $("xm-in").value = await navigator.clipboard.readText(); xemMa(); } catch (e) { toast("Trình duyệt không cho đọc bộ nhớ tạm — bấm vào ô rồi Ctrl+V nhé."); $("xm-in").focus(); }
    });
    ["gui-ma", "gui-ten", "gui-note"].forEach((id) => $(id).addEventListener("input", updateGui));
    $("gui-gh").addEventListener("click", (e) => { if (!$("gui-ma").value.trim()) { e.preventDefault(); toast("Dán mã thiết kế vào ô trước đã."); $("gui-ma").focus(); } });
    $("gui-mail").addEventListener("click", (e) => { if (!$("gui-ma").value.trim()) { e.preventDefault(); toast("Dán mã thiết kế vào ô trước đã."); $("gui-ma").focus(); } });
    $("dlg-x").addEventListener("click", closeDlg);
    $("dlg").addEventListener("cancel", (e) => { e.preventDefault(); closeDlg(); });
    $("dlg").addEventListener("click", (e) => { if (e.target === $("dlg")) { closeDlg(); } });
    window.addEventListener("hashchange", route);
    const hero = document.querySelector(".hero");
    // thu gọn đầu trang khi cuộn (ngưỡng hai chiều để không nhấp nháy khi đầu trang đổi cao)
    window.addEventListener("scroll", () => {
      const y = window.scrollY, c = hero.classList.contains("compact");
      if (!c && y > 180) { hero.classList.add("compact"); } else if (c && y < 30) { hero.classList.remove("compact"); }
    }, { passive: true });
    route();
  }
  start();
})();
