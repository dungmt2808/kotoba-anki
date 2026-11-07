/* ことば畑 – 1.14: Giao diện tự chỉnh. Mỗi chế độ (màn chính / khi ôn thẻ / trò chơi & báo) một kiểu:
   cảnh sân và ruộng chuyển động / đứng yên / mờ / ẩn, hạt bay theo mùa, mưa tuyết, thú nuôi, linh vật nói, hiệu ứng
   thành tích; màu bảng ôn và cỡ khung thẻ. Python lưu (config.json "ui", chỉ trên máy này) và làm sạch. */
var GardenUI = (function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let G = null;
  let ui = null;              // cấu hình đã làm sạch (Python gửi kèm render / uiSaved)
  let mode = "main";
  let lastSig = "";
  let isOpen = false;

  const MODES = [["main", "Màn chính"], ["review", "Khi ôn thẻ"], ["panel", "Trò chơi & báo"]];
  const ROWS = [
    ["yard", "Cảnh sân (nhà, vùng)", [["full", "Chuyển động"], ["still", "Đứng yên"], ["dim", "Mờ, đứng yên"], ["hide", "Ẩn"]]],
    ["field", "Ruộng cây", [["full", "Chuyển động"], ["still", "Đứng yên"], ["dim", "Mờ, đứng yên"], ["hide", "Ẩn"]]],
    ["sky", "Hạt bay theo mùa (nền trang)", [["on", "Bật"], ["off", "Tắt"]]],
    ["weather", "Mưa / tuyết rơi, chớp", [["on", "Bật"], ["off", "Tắt"]]],
    ["pets", "Thú nuôi, khách trên sân", [["on", "Bật"], ["off", "Tắt"]]],
    ["mascot", "Linh vật nói chuyện", [["on", "Bật"], ["off", "Tắt"]]],
    ["joy", "Hiệu ứng thành tích", [["on", "Bật"], ["off", "Tắt"]]]
  ];
  const DEF = { yard: "full", field: "full", sky: "on", weather: "on", pets: "on", mascot: "on", joy: "on" };
  const PRESETS = [
    ["full", "Đầy đủ", "Như cũ: mọi thứ chuyển động ở mọi màn."],
    ["focus", "Tập trung khi ôn", "Ôn thẻ thì ẩn sân + ruộng, tắt hạt bay, mưa, linh vật nói; khung thẻ to hết chỗ."],
    ["calm", "Dịu mắt", "Sân và ruộng đứng yên ở mọi màn, tắt hạt bay và mưa tuyết."]
  ];      // 1.23: bỏ "Ôn buổi tối" (bảng ôn Đêm vườn) — người dùng thấy không đẹp

  function conf() {
    if (ui) { return ui; }
    const d = G && G.data();
    return (d && d.ui) || null;
  }
  function detect() {
    if ($("kb-panel") && !$("kb-panel").hidden) { return "review"; }
    const ids = ["kb-game", "kb-paper", "kb-fields", "kb-ui", "kb-cal"];     // 1.20: Lịch hoa = chế độ "Trò chơi & báo"
    for (let i = 0; i < ids.length; i++) { const e = $(ids[i]); if (e && !e.hidden) { return "panel"; } }
    return "main";
  }
  function get(k, m) {
    const c = conf();
    const sub = c && c[m || mode];
    return (sub && sub[k]) || DEF[k];
  }
  const GLOB_DEF = { card: "normal", theme: "garden", scene: "normal", start: "last" };
  function glob(k) { const c = conf(); return (c && c[k]) || GLOB_DEF[k] || "garden"; }

  // thẻ đang ôn nằm trong iframe: bảng tối thì thêm lớp nightMode (như Anki) + màu nền dịu.
  // 1.23: bỏ bảng "Đêm vườn" → luôn gọi với false (gỡ lớp nếu trang còn giữ từ trước); Anki chế độ tối do garden.js lo
  function syncFrame(night) {
    const f = $("kb-card");
    let doc = null;
    try { doc = f && f.contentDocument; } catch (e) { doc = null; }
    if (!doc || !doc.body) { return; }
    if (doc.body.classList.contains("kb-night") === night) { return; }
    doc.body.classList.toggle("kb-night", night);
    doc.body.classList.toggle("nightMode", night);
    doc.body.classList.toggle("night_mode", night);
    if (night && !doc.getElementById("kb-night-css")) {
      const st = doc.createElement("style");
      st.id = "kb-night-css";
      st.textContent = "body.kb-night{background:#262d5e!important;color:#f4ecd8}" +
        "body.kb-night .card{background-color:transparent!important;color:#f4ecd8!important}" +
        "body.kb-night a{color:#ffd27a}body.kb-night hr{border-color:#4a55a8}";
      (doc.head || doc.documentElement).appendChild(st);
    }
  }

  function apply() {
    mode = detect();
    const app = $("kb-app");
    if (!app) { return; }
    const cls = ["kb-ui-m-" + mode, "kb-ui-yard-" + get("yard"), "kb-ui-field-" + get("field"),
      "kb-ui-th-" + glob("theme"), "kb-ui-card-" + glob("card")];
    if (get("sky") === "off") { cls.push("kb-ui-sky-off"); }
    const sig = cls.join(" ");
    syncFrame(glob("theme") === "night");
    if (sig === lastSig) { return; }
    app.className.split(/\s+/).filter((c) => c.indexOf("kb-ui-") === 0).forEach((c) => app.classList.remove(c));
    cls.forEach((c) => app.classList.add(c));
    const first = !lastSig;
    lastSig = sig;
    syncQuick();
    window.dispatchEvent(new Event("kb-ui-change"));
    if (!first) { window.dispatchEvent(new Event("kb-relayout")); }
  }

  // ---- lưu ----
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function full() {
    const c = conf() ? clone(conf()) : {};
    MODES.forEach(([m]) => { c[m] = Object.assign({}, DEF, c[m] || {}); });
    Object.keys(GLOB_DEF).forEach((k) => { c[k] = c[k] || GLOB_DEF[k]; });
    return c;
  }
  function save(c) {
    ui = c;
    const d = G && G.data();
    if (d) { d.ui = c; }
    lastSig = "";
    apply();
    if (G) { G.send("ui:set:" + JSON.stringify(c)); }
    if (isOpen) { render(); }
  }

  // nút nhanh trên bảng ôn: ẩn / hiện sân + ruộng khi ôn thẻ
  function syncQuick() {
    const b = $("kb-rv-garden");
    if (!b) { return; }
    const hidden = get("yard", "review") === "hide" && get("field", "review") === "hide";
    const t = hidden ? "Hiện vườn" : "Ẩn vườn";
    if (b.textContent !== t) { b.textContent = t; }
    b.setAttribute("aria-pressed", hidden ? "true" : "false");
  }
  function toggleQuick() {
    const c = full();
    const hidden = c.review.yard === "hide" && c.review.field === "hide";
    c.review.yard = hidden ? "full" : "hide";
    c.review.field = hidden ? "full" : "hide";
    if (!hidden) { c.card = "tall"; }
    save(c);
  }

  // ---- bảng Giao diện ----
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text !== undefined && text !== null) { e.textContent = text; }
    if (tag === "button") { e.type = "button"; e.addEventListener("mousedown", (ev) => ev.preventDefault()); }
    return e;
  }
  function render() {
    const st = $("kb-ui-stage");
    if (!st) { return; }
    const c = full();
    st.textContent = "";
    st.appendChild(el("div", "kb-ui-h", "Kiểu có sẵn"));
    const pr = el("div", "kb-ui-presets");
    PRESETS.forEach(([id, name, desc]) => {
      const b = el("button", "kb-btn kb-ui-preset");
      b.appendChild(el("b", null, name));
      b.appendChild(el("span", null, desc));
      b.addEventListener("click", () => {
        if (G) { G.send("ui:preset:" + id); }
        const note = $("kb-ui-note"); if (note) { note.textContent = "Đã chọn “" + name + "”"; }
      });
      pr.appendChild(b);
    });
    st.appendChild(pr);

    // 1.17: "Bảng ôn thẻ" lên trước, phần tự chỉnh từng chế độ gập lại (ít người cần)
    globals();
    const more = document.createElement("details");
    more.className = "kb-ui-more";
    more.open = moreOpen;
    more.addEventListener("toggle", () => { moreOpen = more.open; });
    const sum = document.createElement("summary");
    sum.textContent = "Tự chỉnh từng chế độ (nâng cao)";
    more.appendChild(sum);
    const tb = el("table", "kb-ui-table");
    const hr = el("tr");
    hr.appendChild(el("th", null, ""));
    MODES.forEach(([m, name]) => hr.appendChild(el("th", m === mode ? "is-now" : null, name + (m === mode ? " · đang xem" : ""))));
    tb.appendChild(hr);
    ROWS.forEach(([k, label, opts]) => {
      const tr = el("tr");
      tr.appendChild(el("td", "kb-ui-l", label));
      MODES.forEach(([m]) => {
        const td = el("td");
        const sel = document.createElement("select");
        sel.className = "kb-h-select"; sel.setAttribute("data-mode", m); sel.setAttribute("data-key", k);
        opts.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; sel.appendChild(o); });
        sel.value = c[m][k];
        sel.addEventListener("change", () => { const n = full(); n[m][k] = sel.value; save(n); });
        td.appendChild(sel);
        tr.appendChild(td);
      });
      tb.appendChild(tr);
    });
    more.appendChild(tb);
    st.appendChild(more);
  }
  let moreOpen = false;
  function globals() {
    const st = $("kb-ui-stage"), c = full();
    let g = null;
    const radios = (key, label, list) => {
      const box = el("div", "kb-ui-radio");
      box.appendChild(el("span", "kb-ui-l", label));
      list.forEach(([v, t]) => {
        const lab = el("label", "kb-ui-opt" + (c[key] === v ? " is-on" : ""));
        const r = document.createElement("input"); r.type = "radio"; r.name = "kb-ui-" + key; r.value = v; r.checked = c[key] === v;
        r.addEventListener("change", () => { const n = full(); n[key] = v; save(n); });
        lab.appendChild(r);
        if (key === "theme") { lab.appendChild(el("i", "kb-ui-sw kb-ui-sw-" + v)); }
        lab.appendChild(document.createTextNode(" " + t));
        box.appendChild(lab);
      });
      g.appendChild(box);
    };
    // 1.23: nhóm "Màn chính" — cỡ dải cảnh, cảnh hiện khi mở vườn (Ngắm cảnh cả cửa sổ: nút Ngắm / phím V)
    st.appendChild(el("div", "kb-ui-h", "Màn chính"));
    g = el("div", "kb-ui-globals");
    radios("scene", "Cỡ cảnh", [["normal", "Vừa"], ["large", "Lớn (ruộng cây lùi xuống)"]]);
    radios("start", "Cảnh hiện", [["last", "Cảnh đang chọn"], ["yard", "Luôn về Sân vườn khi mở vườn"]]);
    st.appendChild(g);
    st.appendChild(el("div", "kb-ui-h", "Bảng ôn thẻ"));
    g = el("div", "kb-ui-globals");
    radios("theme", "Màu bảng", [["garden", "Vàng vườn"], ["paper", "Trắng giấy"]]);
    radios("card", "Khung thẻ", [["normal", "Vừa"], ["tall", "To hết chỗ còn lại"]]);
    st.appendChild(g);
    st.appendChild(el("div", "kb-sound-note", "Nút “Ẩn vườn” trên bảng ôn bật / tắt nhanh sân + ruộng khi ôn."));
  }
  function open() {
    if (!G) { return; }
    if (G.closeOthers) { G.closeOthers(); }
    isOpen = true;
    $("kb-ui").hidden = false;
    const note = $("kb-ui-note"); if (note) { note.textContent = "Lưu ngay trên máy này"; }
    mode = detect();
    render();
  }
  function close() {
    if (!isOpen) { return; }
    isOpen = false;
    $("kb-ui").hidden = true;
  }

  return {
    init: function (helpers) {
      G = helpers;
      const ex = $("kb-ui-exit");
      if (ex) { ex.addEventListener("click", close); }
      const op = $("kb-ui-open");
      if (op) { op.addEventListener("click", () => { const pop = $("kb-sound-pop"); if (pop) { pop.hidden = true; } open(); }); }
      const q = $("kb-rv-garden");
      if (q) { q.addEventListener("mousedown", (e) => e.preventDefault()); q.addEventListener("click", toggleQuick); }
      document.addEventListener("keydown", (e) => {
        if (isOpen && e.key === "Escape") { e.preventDefault(); close(); }
      });
      setInterval(apply, 200);
      apply();
    },
    get: get,
    glob: glob,
    mode: () => mode,
    allow: (k) => get(k) !== "off",
    open: open,
    close: close,
    isOpen: () => isOpen,
    saved: function (c) { if (c) { ui = c; const d = G && G.data(); if (d) { d.ui = c; } lastSig = ""; apply(); if (isOpen) { render(); } } },
    refresh: function () { ui = null; lastSig = ""; apply(); },
    _apply: apply
  };
})();
