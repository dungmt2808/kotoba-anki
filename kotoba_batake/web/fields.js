/* ことば畑 – Cấu hình trường theo loại note (từ 1.9).
   Mỗi loại note chọn: ngôn ngữ (1.17: tiếng Nhật / tiếng Anh / khác), đây là Từ vựng / Chữ Hán /
   Ngữ pháp / Khác, rồi chọn trường cho từng vai trò (Từ, Cách đọc, Nghĩa…; dấu * là bắt buộc).
   Python (fields_core) kiểm tra và lưu; JS chỉ hiển thị + gửi lệnh fields:open / fields:save:<json>.
   garden.js gọi GardenFields.init(helpers). */
var GardenFields = (function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let H = null;
  let isOpen = false;
  let panel = null;        // dữ liệu từ Python (fields_panel)
  let sel = null;          // id loại note đang sửa
  let pendingSel = null;
  let from = "";           // mở từ đâu ("games" → có nút quay lại)
  const draft = {};        // id → {kind, f} đang sửa (chưa lưu)
  let sample = 0;
  let showOthers = false;
  let msg = { text: "", bad: false };

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) { n.className = cls; }
    if (text !== undefined && text !== null) { n.textContent = text; }
    return n;
  }
  function btn(cls, text, onClick) {
    const b = el("button", cls, text);
    b.type = "button";
    if (onClick) { b.addEventListener("click", onClick); }
    return b;
  }
  const copy = (o) => JSON.parse(JSON.stringify(o));
  function kindsOf(lang) {
    const L = panel && panel.langs;
    return (L && L.kinds && L.kinds[lang || "ja"]) || (panel && panel.kinds) || [];
  }
  function kindDef(id, lang) { return kindsOf(lang).find((k) => k.id === id) || null; }
  function model(id) { return ((panel && panel.models) || []).find((m) => m.id === id) || null; }

  // Cấu hình đang hiện cho một loại note: bản nháp > đã lưu (bỏ trường không còn) > gợi ý tự động
  function confOf(m) {
    if (draft[m.id]) { return draft[m.id]; }
    if (m.conf) {
      const c = copy(m.conf);
      Object.keys(c.f).forEach((r) => { if (m.fields.indexOf(c.f[r]) < 0) { delete c.f[r]; } });
      c.lang = m.lang || "ja";
      return c;
    }
    const g = copy(m.guess);
    g.lang = m.lang_set ? m.lang : (g.lang || m.lang || "ja");
    return g;
  }
  function savedConf(m) { return m.conf && m.configured ? Object.assign(copy(m.conf), { lang: m.lang || "ja" }) : null; }
  function dirty(m) {
    const c = confOf(m), s = savedConf(m);
    if (!s) { return true; }
    return JSON.stringify({ l: c.lang || "ja", k: c.kind, f: sortObj(c.f) }) !== JSON.stringify({ l: s.lang || "ja", k: s.kind, f: sortObj(s.f) });
  }
  function sortObj(o) { const out = {}; Object.keys(o).sort().forEach((k) => { if (o[k]) { out[k] = o[k]; } }); return out; }
  function missing(m) {
    const c = confOf(m), k = kindDef(c.kind, c.lang);
    return k ? k.roles.filter((r) => r.req && !c.f[r.id]).map((r) => r.label) : [];
  }

  // ------------------------------------------------------------------
  function open(mid, origin) {
    if (!H) { return; }
    if (H.closeOthers) { H.closeOthers(); }
    isOpen = true;
    from = origin || "";
    pendingSel = mid || null;
    msg = { text: "", bad: false };
    $("kb-fields").hidden = false;
    const stage = $("kb-f-stage");
    stage.textContent = "";
    stage.appendChild(el("div", "kb-f-loading", "Đang đọc các loại note…"));
    $("kb-f-back").hidden = from !== "games";
    H.send("fields:open");
  }
  function close() {
    if (!isOpen) { return; }
    isOpen = false;
    $("kb-fields").hidden = true;
  }
  function back() {
    close();
    if (from === "games" && H.openGames) { H.openGames(); }
  }

  function setData(p) {
    if (panel && panel.deck !== p.deck) { sel = null; showOthers = false; }   // đổi deck → chọn lại theo deck mới
    panel = p;
    const ids = (p.models || []).map((m) => m.id);
    Object.keys(draft).forEach((k) => { if (ids.indexOf(k) < 0) { delete draft[k]; } });
    if (pendingSel && model(pendingSel)) { sel = pendingSel; }
    else if (!sel || !model(sel)) {
      const firstBad = (p.models || []).find((m) => m.deck_count && !m.configured);
      sel = firstBad ? firstBad.id : (ids[0] || null);
    }
    pendingSel = null;
    sample = 0;
    if (sel && !model(sel).deck_count) { showOthers = true; }
    if (isOpen) { render(); }
  }
  function saved(r) {
    if (!r) { return; }
    delete draft[r.mid];
    const name = (model(r.mid) || {}).name || "";
    if (r.panel) { pendingSel = r.mid; setData(r.panel); }
    const left = ((panel && panel.models) || []).filter((m) => m.deck_count && !m.configured);
    msg = { text: "Đã lưu cấu hình cho “" + name + "” ✓" + (left.length ? " · Còn " + left.length + " loại note chưa cấu hình." : ""), bad: false };
    if (isOpen) { render(); }
    if (H.toast) { H.toast("Đã lưu cấu hình trường cho “" + name + "”"); }
  }
  function error(text) {
    msg = { text: text || "Không lưu được.", bad: true };
    if (isOpen && panel) { render(); }
  }

  // ------------------------------------------------------------------
  function render() {
    const stage = $("kb-f-stage");
    stage.textContent = "";
    if (!panel || !panel.models || !panel.models.length) {
      stage.appendChild(el("div", "kb-f-loading", "Chưa có note nào trong bộ sưu tập."));
      return;
    }
    const wrap = el("div", "kb-f-wrap");
    wrap.appendChild(renderList());
    wrap.appendChild(renderEdit());
    stage.appendChild(wrap);
    const pend = panel.models.filter((m) => m.deck_count && !m.configured).length;
    GardenIcons.fill($("kb-f-note"), pend ? "[i:warn] " + pend + " loại note chưa cấu hình" : "Đã cấu hình hết ✓");
    $("kb-f-note").className = "kb-g-chip" + (pend ? " kb-g-warn" : "");
  }

  function renderList() {
    const box = el("div", "kb-f-list");
    const inDeck = panel.models.filter((m) => m.deck_count);
    const others = panel.models.filter((m) => !m.deck_count);
    box.appendChild(el("div", "kb-f-h", "Deck “" + (panel.deck || "") + "”"));
    if (!inDeck.length) { box.appendChild(el("div", "kb-f-empty", "Deck này chưa có note.")); }
    inDeck.forEach((m) => box.appendChild(modelButton(m, m.deck_count)));
    if (others.length) {
      const t = btn("kb-f-more", (showOthers ? "▾ " : "▸ ") + "Loại note khác (" + others.length + ")", () => { showOthers = !showOthers; render(); });
      box.appendChild(t);
      if (showOthers) { others.forEach((m) => box.appendChild(modelButton(m, m.count))); }
    }
    return box;
  }
  function modelButton(m, count) {
    const b = btn("kb-f-model" + (m.id === sel ? " is-on" : "") + (m.configured ? "" : " is-bad"), null, () => {
      sel = m.id; sample = 0; msg = { text: "", bad: false }; render();
    });
    b.setAttribute("data-mid", m.id);
    b.appendChild(el("span", "kb-f-mname", m.name));
    const cm = confOf(m), k = kindDef(cm.kind, cm.lang);
    const L = (panel.langs && panel.langs.names) || {};
    const st = m.configured ? "✓ " + (k ? k.name : "") + (cm.lang && cm.lang !== "ja" ? " · " + (L[cm.lang] || "") : "")
      : (m.problem ? "[i:warn] hỏng: " + m.problem : "[i:warn] chưa cấu hình");
    b.appendChild(GardenIcons.fill(el("span", "kb-f-msub"), count + " note · " + st + (draft[m.id] && dirty(m) ? " · chưa lưu" : "")));
    return b;
  }

  function sampleOf(m) { return (m.samples || [])[Math.min(sample, Math.max(0, (m.samples || []).length - 1))] || {}; }

  function renderEdit() {
    const m = model(sel);
    const box = el("div", "kb-f-edit");
    if (!m) { return box; }
    const c = confOf(m);
    const head = el("div", "kb-f-head");
    head.appendChild(el("div", "kb-f-title", m.name));
    head.appendChild(el("div", "kb-f-count", m.count + " note" + (m.deck_count ? " · " + m.deck_count + " trong deck này" : "") + " · " +
      m.fields.length + " trường"));
    box.appendChild(head);
    // 1.17: một dòng nhắc duy nhất (hỏng / nhồi chung / chưa cấu hình)
    if (m.problem) { box.appendChild(el("div", "kb-f-bad", "Cấu hình cũ không dùng được nữa: " + m.problem + ". Chọn lại trường rồi lưu.")); }
    else if (!m.configured && !m.crammed) {
      box.appendChild(el("div", "kb-f-info", "Đã điền sẵn — kiểm tra rồi bấm Lưu."));
    }
    if (m.crammed) {
      box.appendChild(el("div", "kb-f-bad", "Trường Từ có vẻ chứa cả nghĩa (kiểu “食べる - ăn”): trò chơi có thể hiện sai."));
    }

    // 1.17: ngôn ngữ + loại note (drop-down cho gọn)
    const L = panel.langs || { order: ["ja"], names: { ja: "Tiếng Nhật" } };
    const kinds = el("div", "kb-f-kinds");
    kinds.appendChild(el("span", "kb-f-label", "Ngôn ngữ:"));
    const ls = el("select", "kb-f-select kb-f-lang");
    L.order.forEach((id) => { const o = el("option", null, L.names[id] + (id === "other" ? " (chỉ vườn + trò chung)" : "")); o.value = id; ls.appendChild(o); });
    ls.value = c.lang || "ja";
    ls.addEventListener("change", () => setLang(m, ls.value));
    kinds.appendChild(ls);
    kinds.appendChild(el("span", "kb-f-label", "Loại:"));
    const ks = el("select", "kb-f-select kb-f-kindsel");
    kindsOf(c.lang).forEach((k) => { const o = el("option", null, k.name + " " + k.jp); o.value = k.id; o.title = k.desc; ks.appendChild(o); });
    ks.value = c.kind;
    ks.addEventListener("change", () => setKind(m, ks.value));
    kinds.appendChild(ks);
    box.appendChild(kinds);
    const kd = kindDef(c.kind, c.lang);
    ks.title = kd ? kd.desc : "";
    if (c.kind === "other" && kd) { box.appendChild(el("div", "kb-f-kdesc", kd.desc)); }   // 1.19.1: chỉ nhắc khi "Khác"

    // bảng vai trò → trường
    const smp = sampleOf(m);
    const table = el("div", "kb-f-table");
    table.appendChild(el("div", "kb-f-th", "Vai trò"));
    table.appendChild(el("div", "kb-f-th", "Trường của note"));
    table.appendChild(el("div", "kb-f-th", "Note mẫu"));
    const miss = missing(m);
    (kd ? kd.roles : []).forEach((r) => {
      const lab = el("div", "kb-f-role" + (r.req ? " is-req" : "") + (r.req && !c.f[r.id] ? " is-miss" : ""));
      lab.appendChild(el("span", null, r.label + (r.req ? " *" : "")));
      if (r.hint) { lab.title = r.hint; lab.appendChild(el("span", "kb-f-hint", r.hint)); }
      const s = el("select", "kb-f-select");
      s.setAttribute("data-role", r.id);
      const none = el("option", null, r.req ? "— chọn trường —" : "(không có)");
      none.value = "";
      s.appendChild(none);
      m.fields.forEach((f) => { const o = el("option", null, f); o.value = f; s.appendChild(o); });
      s.value = c.f[r.id] || "";
      s.addEventListener("change", () => setRole(m, r.id, s.value));
      const val = el("div", "kb-f-val", c.f[r.id] ? (smp[c.f[r.id]] || "(trống)") : "");
      if (c.f[r.id] && !smp[c.f[r.id]]) { val.classList.add("is-empty"); }
      table.appendChild(lab); table.appendChild(s); table.appendChild(val);
    });
    box.appendChild(table);

    // chọn note mẫu
    const nav = el("div", "kb-f-sample");
    const n = (m.samples || []).length;
    nav.appendChild(el("span", null, n ? "Note mẫu " + (Math.min(sample, n - 1) + 1) + "/" + n : "Chưa có note mẫu"));
    if (n > 1) {
      nav.appendChild(btn("kb-btn kb-btn-small", "◂", () => { sample = (sample + n - 1) % n; render(); }));
      nav.appendChild(btn("kb-btn kb-btn-small", "▸", () => { sample = (sample + 1) % n; render(); }));
    }
    nav.appendChild(el("span", "kb-f-preview", previewText(c, smp)));
    box.appendChild(nav);

    // trò chơi dùng được
    const gbox = el("div", "kb-f-games");
    gbox.appendChild(el("span", "kb-f-label", "Trò chơi:"));
    const sup = typeof GardenGames !== "undefined" && GardenGames.supportFor ? GardenGames.supportFor(c.kind, c.f, c.lang) : [];
    sup.forEach((g) => {
      const chip = el("span", "kb-f-game" + (g.ok ? " is-ok" : " is-no"), (g.ok ? "✓ " : "✗ ") + g.name);
      chip.setAttribute("data-game", g.id);
      chip.title = g.ok ? "Chế độ: " + g.modes.join(", ") : "Chưa chơi được: " + g.why;
      if (!g.ok) { chip.appendChild(el("span", "kb-f-why", " (" + g.why + ")")); }
      gbox.appendChild(chip);
    });
    box.appendChild(gbox);

    // nút
    const acts = el("div", "kb-f-actions");
    acts.appendChild(btn("kb-btn kb-btn-small", "Dùng gợi ý tự động", () => {
      draft[m.id] = copy(m.guess); msg = { text: "Đã điền theo gợi ý tự động (chưa lưu).", bad: false }; render();
    }));
    if (savedConf(m) && dirty(m)) {
      acts.appendChild(btn("kb-btn kb-btn-small", "Hoàn tác", () => { delete draft[m.id]; msg = { text: "", bad: false }; render(); }));
    }
    const save = btn("kb-btn kb-f-save", m.configured && !dirty(m) ? "Đã lưu ✓" : "Lưu cấu hình", () => doSave(m));
    save.id = "kb-f-save";
    acts.appendChild(save);
    const line = el("span", "kb-f-msg" + (msg.bad ? " is-bad" : ""), msg.text || (miss.length ? "Còn thiếu: " + miss.join(", ") : ""));
    if (!msg.text && miss.length) { line.classList.add("is-bad"); }
    acts.appendChild(line);
    box.appendChild(acts);
    return box;
  }

  // Xem trước chữ sẽ hiện trên cây (gần đúng, Python làm sạch khi lưu)
  function previewText(c, smp) {
    const v = (r) => (c.f[r] && smp[c.f[r]]) || "";
    const parts = [v("word") || "?"];
    if (v("reading")) { parts.push((c.lang && c.lang !== "ja") ? v("reading") : "（" + v("reading") + (v("kun") ? " / " + v("kun") : "") + "）"); }
    if (c.kind === "kanji" && v("hanviet") && v("hanviet") !== v("meaning")) { parts.push(String(v("hanviet")).toUpperCase()); }
    if (v("meaning")) { parts.push("— " + v("meaning")); }
    return "Trên cây: " + parts.join(" ");
  }

  function setKind(m, kind) {
    const c = copy(confOf(m)), k = kindDef(kind, c.lang);
    const g = (m.guess.lang || "ja") === (c.lang || "ja") ? (m.guess.f || {}) : {};
    const f = {};
    (k ? k.roles : []).forEach((r) => {
      const v = c.f[r.id] || g[r.id];
      if (v) { f[r.id] = v; }
    });
    draft[m.id] = { kind: kind, f: f, lang: c.lang || "ja" };
    msg = { text: "", bad: false };
    render();
  }
  function setLang(m, lang) {
    const c = copy(confOf(m));
    const allowed = kindsOf(lang).map((k) => k.id);
    if ((m.guess.lang || "ja") === lang) {
      draft[m.id] = Object.assign(copy(m.guess), { lang: lang });       // gợi ý tự động của đúng ngôn ngữ này
    } else {
      const kind = allowed.indexOf(c.kind) >= 0 ? c.kind : "vocab";
      const roles = (kindDef(kind, lang) || { roles: [] }).roles.map((r) => r.id);
      const f = {};
      Object.keys(c.f).forEach((r) => { if (roles.indexOf(r) >= 0) { f[r] = c.f[r]; } });
      draft[m.id] = { kind: kind, f: f, lang: lang };
    }
    msg = { text: "", bad: false };
    render();
  }
  function setRole(m, role, field) {
    const c = copy(confOf(m));
    if (field) { c.f[role] = field; } else { delete c.f[role]; }
    draft[m.id] = c;
    msg = { text: "", bad: false };
    render();
  }
  function doSave(m) {
    const miss = missing(m);
    if (miss.length) { error("Cần chọn trường cho: " + miss.join(", ") + "."); return; }
    const c = confOf(m);
    msg = { text: "Đang lưu…", bad: false };
    render();
    H.send("fields:save:" + JSON.stringify({ mid: m.id, kind: c.kind, f: c.f, lang: c.lang || "ja" }));
  }

  function onKey(e) {
    if (!isOpen) { return; }
    if (e.key === "Escape") { e.preventDefault(); e.stopImmediatePropagation(); back(); }
  }

  return {
    init: function (helpers) {
      H = helpers;
      document.addEventListener("keydown", onKey, true);
      $("kb-f-exit").addEventListener("click", close);
      $("kb-f-back").addEventListener("click", back);
    },
    open: open,
    close: close,
    isOpen: function () { return isOpen; },
    data: setData,
    saved: saved,
    error: error,
    _state: function () { return { sel: sel, sample: sample, draft: copy(draft), msg: msg.text, panel: panel }; }
  };
})();
