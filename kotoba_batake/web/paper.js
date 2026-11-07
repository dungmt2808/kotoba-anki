// 新聞 · Báo & chép chính tả (bản 1.6).
// Python gửi dữ liệu bằng Garden.paperIndex / paperIssue / dictShow / paperResult / paperError.
// Mọi chữ của báo được đưa vào trang bằng textContent (báo do máy viết, coi là dữ liệu không tin cậy).
var GardenPaper = (function () {
  "use strict";
  let H = null;
  let isOpen = false;
  let tab = "issue";
  let index = null;        // danh sách số báo
  let issue = null;        // số báo đang xem
  let daily = null;        // lượt chép chính tả hôm nay
  let wantDate = null;     // số báo người dùng chọn ở kệ
  let busy = {};           // câu đang chờ Python chấm
  let selectedKey = null;
  let aiView = null;       // 1.12: tab Nguồn báo (Gemini / Claude Code)
  let aiFlash = null;      // thông báo của lần bấm gần nhất ({flash, ok})
  let keyOpen = false;     // đang hiện ô dán khoá dù đã có khoá (Đổi khoá)
  let forgetArmed = false;
  let deckOpen = {};       // 1.19.1: báo đang mở danh sách chọn deck ({ja: true})
  // 1.22.3: ô tìm deck + vị trí cuộn của danh sách (tick một deck thì bảng vẽ lại — trước đây nhảy về deck đầu tiên)
  const deckQuery = {}, deckScroll = {};

  const $ = (id) => document.getElementById(id);
  const RE = /\{([^{}\[\]|]*)\|([^{}\[\]|]*)\|([^{}\[\]|]*)\}|\[([^{}\[\]|]*)\|([^{}\[\]|]*)\]/g;
  const LOAI = { tin_lang: "Tin làng", truyen: "Truyện dài kỳ", thong_bao: "お知らせ", cot: "Cột ngắn", tin_that: "Tin thật" };
  const LOAI_EN = { tin_lang: "Tin làng", truyen: "Truyện dài kỳ", thong_bao: "Thông báo", cot: "Cột ngắn", tin_that: "Tin thật" };
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  function sfx(n) { if (typeof GardenFX !== "undefined" && GardenFX.sound) { GardenFX.sound(n); } }
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
  function ruby(s, r) {
    if (!r) { return document.createTextNode(s); }
    const rb = el("ruby");
    rb.appendChild(document.createTextNode(s));
    rb.appendChild(el("rt", null, r));
    return rb;
  }
  // Chuỗi có đánh dấu [漢字|かんじ] / {表記|よみ|từ gốc} → các nút DOM có furigana
  function md(text, words) {
    const f = document.createDocumentFragment();
    let last = 0, m;
    text = String(text || "");
    RE.lastIndex = 0;
    while ((m = RE.exec(text))) {
      if (m.index > last) { f.appendChild(document.createTextNode(text.slice(last, m.index))); }
      if (m[4] !== undefined) { f.appendChild(ruby(m[4], m[5])); }
      else {
        const node = ruby(m[1], m[2]);
        const info = words && words[m[3]];
        if (info) {
          const s = el("span", "kb-p-w" + (info.moi ? " is-new" : ""));
          s.setAttribute("data-k", m[3]);
          s.tabIndex = 0;
          s.setAttribute("role", "button");
          s.appendChild(node);
          f.appendChild(s);
        } else { f.appendChild(node); }
      }
      last = RE.lastIndex;
    }
    if (last < text.length) { f.appendChild(document.createTextNode(text.slice(last))); }
    return f;
  }
  function plain(text) { return String(text || "").replace(RE, (m0, a, b, c, d) => (d !== undefined ? d : a)); }
  function shortDate(d) { return d ? d.slice(8, 10) + "/" + d.slice(5, 7) : ""; }
  function enDate(d) {        // 1.19: Wednesday, 4 November 2026
    const t = new Date(d + "T00:00:00");
    if (isNaN(t.getTime())) { return d; }
    return DAYS[t.getDay()] + ", " + t.getDate() + " " + MONTHS[t.getMonth()] + " " + t.getFullYear();
  }
  function jpDate(d) {
    const t = new Date(d + "T00:00:00");
    if (isNaN(t.getTime())) { return d; }
    return (t.getMonth() + 1) + "月" + t.getDate() + "日（" + "日月火水木金土"[t.getDay()] + "）";
  }

  // Gõ romaji cũng được: dùng bộ chuyển của game Đuổi quạ (mọi cách hiểu của "nn"). Câu tiếng Anh: giữ nguyên.
  function variants(raw, latin) {
    const out = [raw];
    if (!latin && /[a-z]/i.test(raw) && typeof GardenGames !== "undefined" && GardenGames._typedKana) {
      try { GardenGames._typedKana(raw, true).forEach((v) => out.push(v)); } catch (e) { /* bỏ qua */ }
    }
    return out.slice(0, 20);
  }

  function setInfo(nodeOrText, kind) {
    const box = $("kb-p-info");
    box.className = "kb-p-info" + (kind ? " is-" + kind : "");
    box.textContent = "";
    if (typeof nodeOrText === "string") { box.textContent = nodeOrText; } else { box.appendChild(nodeOrText); }
  }
  // 1.17: ngôn ngữ chiếm đa số trong deck đang xem (theo số cây của từng loại note)
  function deckLang() {
    const n = {};
    ((H && H.data() && H.data().note_types) || []).forEach((t) => { n[t.lang || "ja"] = (n[t.lang || "ja"] || 0) + (t.count || 0); });
    let best = "ja", k = -1;
    Object.keys(n).forEach((l) => { if (n[l] > k) { k = n[l]; best = l; } });
    return best;
  }
  const LANG_NAME = { ja: "tiếng Nhật", en: "tiếng Anh", other: "ngôn ngữ khác" };
  // 1.19.1: ngôn ngữ của báo đang đọc (nút chuyển ở Kệ báo; mở bảng thì Python chọn báo có số chưa đọc)
  function paperLang() {
    if (index && index.lang) { return index.lang; }
    const s = H && H.data() && H.data().paper;
    return (s && s.lang) || "ja";
  }
  function defaultInfo() {
    const pl = paperLang();
    if (tab === "issue" && pl === "en") {
      setInfo("Bấm từ gạch chân để tra nghĩa (nhận cả dạng biến đổi: went → go). Gạch chấm: từ mới. ▶ để nghe.");
    } else if (tab === "issue") { setInfo("Bấm từ gạch chân để tra nghĩa. Gạch liền: từ đã học. Gạch chấm: từ mới. ▶ để nghe."); }
    else if (tab === "dict") {
      setInfo(dictLang() === "ja" ? "Nghe rồi gõ lại câu (kana, kanji hoặc romaji). Enter để kiểm tra."
        : "Nghe rồi gõ lại câu. Không tính hoa thường, dấu câu; don't = do not. Enter để kiểm tra.");
    }
    else if (tab === "src") { setInfo("Chọn báo muốn nhận và nguồn báo."); }
    else { setInfo("Chọn một số báo để đọc."); }
  }

  // 1.19.1: ngôn ngữ của lượt chép hôm nay = ngôn ngữ của đa số câu (deck tiếng Hàn vẫn có câu báo tiếng Nhật)
  function dictLang() {
    const items = (daily && daily.items) || [];
    if (!items.length) { return deckLang(); }
    const latin = items.filter((c) => c.lang && c.lang !== "ja").length;
    return latin * 2 > items.length ? "en" : "ja";
  }
  function plantOf(word) {
    const d = H && H.data();
    const plants = (d && d.plants) || [];
    for (let i = 0; i < plants.length; i++) { if (plants[i].word === word) { return plants[i]; } }
    return null;
  }
  function showWord(k) {
    const w = issue && issue.tu[k];
    if (!w) { return; }
    selectedKey = k;
    Array.prototype.forEach.call(document.querySelectorAll(".kb-p-w.is-sel"), (x) => x.classList.remove("is-sel"));
    Array.prototype.forEach.call(document.querySelectorAll(".kb-p-w"), (x) => {
      if (x.getAttribute("data-k") === k) { x.classList.add("is-sel"); }
    });
    const f = document.createDocumentFragment();
    f.appendChild(el("span", "kb-p-iw", w.w));
    if (w.r) { f.appendChild(el("span", "kb-p-ir", w.r)); }
    if (w.m) { f.appendChild(el("span", "kb-p-im", w.m)); }
    const notes = [];
    if (w.moi) { notes.push("Từ mới trong số này"); }
    else if (w.bai) { notes.push("Đã học ở " + w.bai); }
    const p = plantOf(w.w);
    const d = H && H.data();
    if (p && d && d.stage_names) {
      notes.push("Cây trong vườn: " + d.stage_names[p.stage] + (p.wilted ? ", đang héo" : p.thirsty ? ", đang khát" : ""));
    }
    if (notes.length) { f.appendChild(el("span", "kb-p-inote", notes.join(" · "))); }
    setInfo(f);
    sfx("flip");
  }

  // ---------------------------------------------------------------------
  // Khung bảng
  // ---------------------------------------------------------------------
  function stage() { return $("kb-p-stage"); }
  function setTab(t, lang) {
    tab = t;
    Array.prototype.forEach.call(document.querySelectorAll(".kb-p-tab"), (b) => {
      b.classList.toggle("is-on", b.getAttribute("data-ptab") === t);
    });
    defaultInfo();
    // 1.17: chép chính tả của deck tiếng Anh / khác không có furigana → ẩn nút Ẩn furigana (1.19: cả báo tiếng Anh)
    furiButton();
    stage().textContent = "";
    stage().scrollTop = 0;
    if (t === "issue") {
      if (issue && (!wantDate || wantDate === issue.date)) { drawIssue(); }
      else { stage().appendChild(el("div", "kb-p-empty", "Đang mở báo…")); H.send(lang ? "paper:lang:" + lang : "paper:index"); }
    } else if (t === "dict") {
      stage().appendChild(el("div", "kb-p-empty", "Đang chuẩn bị lượt chép chính tả…"));
      H.send("dict:open");
    } else if (t === "src") {
      forgetArmed = false;
      drawSource();
      H.send("ai:status");
    } else {
      stage().appendChild(el("div", "kb-p-empty", "Đang mở kệ báo…"));
      H.send("paper:index");
    }
  }

  function furiButton() {
    const fb = $("kb-p-furi");       // chỉ có nghĩa ở bài báo và câu chép tiếng Nhật
    if (!fb) { return; }
    const issueLang = issue && tab === "issue" ? issue.lang || "ja" : paperLang();
    fb.hidden = !((tab === "issue" && issueLang === "ja") || (tab === "dict" && dictLang() === "ja"));
  }

  function open(which) {
    if (!H) { return; }
    if (H.closeOthers) { H.closeOthers(); }
    isOpen = true;
    $("kb-paper").hidden = false;
    issue = null;
    index = null;            // 1.19.1: mở bảng → Python chọn lại báo có số chưa đọc
    wantDate = null;
    H.send("paper:open");
    setTab(which || defaultTab());
  }
  function defaultTab() {
    const s = H.data() && H.data().paper;
    return s && s.enabled ? "issue" : "dict";
  }
  function close() {
    if (!isOpen) { return; }
    isOpen = false;
    const act = document.activeElement;
    if (act && $("kb-paper").contains(act) && act.blur) { act.blur(); }   // để phím tắt ở màn chính chạy lại ngay
    $("kb-paper").hidden = true;
    H.send("paper:stop");
  }

  // ---------------------------------------------------------------------
  // Kệ báo
  // ---------------------------------------------------------------------
  function onIndex(v) {
    index = v;
    if (!isOpen) { return; }
    defaultInfo();
    if (tab === "issue") {
      if (!v.enabled) { drawSetup(); return; }
      const pick = wantDate || (v.issues.filter((x) => !x.read)[0] || v.issues[0] || {}).date;
      if (!pick) { drawNoIssue(); return; }
      wantDate = pick;
      H.send("paper:issue:" + pick);
    } else if (tab === "shelf") {
      drawShelf();
    }
  }

  // chưa có nguồn báo: hiện luôn bảng chọn nguồn (Gemini / Claude Code) ngay trong tab Báo
  function drawSetup() {
    setTab("src");
  }
  // 1.19.1: nút chuyển báo tiếng Nhật / tiếng Anh (khi tick cả hai ở "Báo muốn nhận")
  function pickLang(x) {
    index = null; issue = null; wantDate = null;
    if (tab === "issue") { setTab("issue", x); } else { H.send("paper:lang:" + x); }
  }
  function langBar() {
    const langs = (index && index.langs) || [];
    if (langs.length < 2) { return null; }
    const opts = langs.map((x) => [x.lang, "Báo " + x.name + (x.unread ? " · " + x.unread + " mới" : ""), x.issues + " số"]);
    const bar = el("div", "kb-p-langs");
    bar.appendChild(chips(opts, paperLang(), pickLang));
    return bar;
  }
  function source() { const s = H && H.data() && H.data().paper; return (index && index.source) || (s && s.source) || ""; }
  function drawNoIssue() {
    const st = stage();
    st.textContent = "";
    const bar = langBar();             // 1.19.1: hàng chuyển báo ở trên cùng, cùng chỗ với Kệ báo
    if (bar) { st.appendChild(bar); }
    const box = el("div", "kb-p-empty");
    const s = H.data() && H.data().paper;
    const en = paperLang() === "en";
    const acts = el("div", "kb-p-acts");
    if (source() === "gemini") {
      const busyNow = (s && s.ai_busy) || (index && index.ai_busy) || (aiView && aiView.gemini.running && aiView.gemini.run_lang === paperLang());
      box.appendChild(el("div", "kb-p-empty-h", busyNow ? "Gemini đang viết số đầu tiên" + (en ? " (tiếng Anh)" : "") + "…"
        : "Chưa có số báo " + (en ? "tiếng Anh " : "") + "nào"));
      if (busyNow) { box.appendChild(el("p", null, "Khoảng 1–2 phút. Xong sẽ về hòm thư.")); }
      else { acts.appendChild(btn("kb-p-go kb-ai-main", "Viết số hôm nay", () => { H.send("ai:write:" + JSON.stringify({ lang: paperLang() })); setTab("src"); })); }
    } else {
      box.appendChild(el("div", "kb-p-empty-h", "Chưa có số báo nào"));
      box.appendChild(el("p", null, "Thư mục kotoba_daily chưa có số nào."));
    }
    acts.appendChild(btn("kb-p-go", "Nguồn báo", () => setTab("src")));
    acts.appendChild(btn("kb-p-go", "Chép chính tả", () => setTab("dict")));
    box.appendChild(acts);
    st.appendChild(box);
    if (tab === "issue") { setInfo("Mỗi sáng có một số báo mới."); }
  }

  // ---------------------------------------------------------------------
  // 1.12: Nguồn báo — Gemini (khoá của người dùng) hoặc Claude Code (kotoba_daily; 1.22.8: chỉ khi đã đặt bao_dir)
  // ---------------------------------------------------------------------
  function aiSet(obj) { aiFlash = null; H.send("ai:set:" + JSON.stringify(obj)); }
  function chips(options, current, onPick, disabled) {
    const box = el("div", "kb-ai-chips");
    options.forEach((o) => {
      const b = btn("kb-ai-chip" + (o[0] === current ? " is-on" : ""), o[1], () => { if (o[0] !== current) { onPick(o[0]); } }, o[2]);
      b.setAttribute("aria-pressed", o[0] === current ? "true" : "false");
      if (disabled) { b.disabled = true; }
      box.appendChild(b);
    });
    return box;
  }
  function aiRow(parent, label, value, extra, cls) {
    const r = el("div", "kb-ai-row" + (cls ? " " + cls : ""));
    r.appendChild(el("span", "kb-ai-k", label));
    const v = el("span", "kb-ai-v");
    if (typeof value === "string") { GardenIcons.fill(v, value); } else if (value) { v.appendChild(value); }
    r.appendChild(v);
    (extra || []).forEach((x) => { if (x) { r.appendChild(x); } });
    parent.appendChild(r);
    return v;
  }
  function keyForm(g) {
    const box = el("div", "kb-ai-steps");
    const s1 = el("div", "kb-ai-step");
    s1.appendChild(el("b", "kb-ai-n", "1"));
    const t1 = el("div", "kb-ai-st");
    t1.appendChild(el("div", null, "Lấy khoá miễn phí: đăng nhập Google → “Create API key” → “Copy”."));
    const l1 = el("div", "kb-ai-line");
    l1.appendChild(btn("kb-ai-main", "Mở trang lấy khoá ↗", () => H.send("ai:keypage"), "Mở " + ((aiView && aiView.key_page) || "") + " bằng trình duyệt"));
    l1.appendChild(el("span", "kb-ai-url", "aistudio.google.com/apikey"));
    t1.appendChild(l1);
    s1.appendChild(t1);
    box.appendChild(s1);
    const s2 = el("div", "kb-ai-step");
    s2.appendChild(el("b", "kb-ai-n", "2"));
    const t2 = el("div", "kb-ai-st");
    t2.appendChild(el("div", null, "Dán khoá vào đây rồi bấm Thử khoá:"));
    const l2 = el("div", "kb-ai-line");
    const inp = el("input", "kb-p-in kb-ai-key");
    inp.type = "password";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.placeholder = "AQ.… hoặc AIza…";
    inp.setAttribute("aria-label", "Khoá Gemini API");
    const go = btn("kb-ai-main", g.testing ? "Đang thử…" : "Thử khoá", null);
    go.disabled = !!g.testing;
    function test() {
      const v = inp.value.trim();
      if (!v) { inp.focus(); return; }
      aiFlash = null;
      go.disabled = true;
      go.textContent = "Đang thử…";
      H.send("ai:key:" + JSON.stringify({ key: v }));
      inp.value = "";
    }
    go.addEventListener("click", test);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); test(); }
      if (e.key !== "Escape") { e.stopPropagation(); }
    });
    l2.appendChild(inp);
    l2.appendChild(go);
    const eye = btn("", "", () => { inp.type = inp.type === "password" ? "text" : "password"; }, "Hiện / ẩn khoá");
    eye.appendChild(GardenIcons.el("eye"));
    eye.setAttribute("aria-label", "Hiện / ẩn khoá");
    l2.appendChild(eye);
    if (g.key) { l2.appendChild(btn("", "Huỷ", () => { keyOpen = false; drawSource(); })); }
    t2.appendChild(l2);
    s2.appendChild(t2);
    box.appendChild(s2);
    const s3 = el("div", "kb-ai-step");
    s3.appendChild(el("b", "kb-ai-n", "3"));
    s3.appendChild(el("div", "kb-ai-st", "Khoá đúng thì số đầu tiên về sau 1–2 phút."));
    box.appendChild(s3);
    setTimeout(() => { try { if (document.activeElement === document.body) { inp.focus(); } } catch (e) { /* bỏ qua */ } }, 30);
    return box;
  }
  // 1.19.1: "Báo muốn nhận: ☑ Tiếng Nhật ☐ Tiếng Anh" — Gemini viết mỗi sáng một số cho mỗi báo đã tick
  function wantRow(v) {
    const r = el("div", "kb-ai-row kb-ai-want");
    r.appendChild(el("span", "kb-ai-k", "Báo muốn nhận"));
    const val = el("span", "kb-ai-v");
    const on = v.langs_on || [];
    [["ja", "Tiếng Nhật"], ["en", "Tiếng Anh"]].forEach((x) => {
      const lab = el("label", "kb-ai-tick");
      const cb = el("input");
      cb.type = "checkbox";
      cb.checked = on.indexOf(x[0]) >= 0;
      const none = !((v.decks || {})[x[0]] || []).length;
      if (none && !cb.checked) { cb.disabled = true; lab.title = "Chưa có deck " + LANG_NAME[x[0]]; lab.classList.add("is-off"); }
      cb.addEventListener("change", () => {
        const next = ["ja", "en"].filter((l) => (l === x[0] ? cb.checked : on.indexOf(l) >= 0));
        aiSet({ langs: next });
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(" " + x[1]));
      val.appendChild(lab);
    });
    if (!on.length) { val.appendChild(el("span", "kb-ai-hint", "chưa chọn báo nào")); }
    r.appendChild(val);
    return r;
  }
  // nút "Đọc ngay" ở tab Nguồn báo: chuyển sang báo của ngôn ngữ đó
  function readNow(lang, date) { wantDate = date; issue = null; index = null; setTab("issue", lang); }
  // Lấy từ: Mọi deck (ngẫu nhiên) / Chọn deck (tối đa 5) / Giáo trình (kotoba_daily, chỉ báo tiếng Nhật)
  function sourcePicker(v, lang) {
    const g = v.gemini, picked = (v.picked || {})[lang] || [];
    const book = lang === "ja" && v.claude.pham_vi;
    const opts = [];
    if (book) { opts.push(["book", "Giáo trình", "Theo pham_vi.json của bộ kotoba_daily"]); }
    opts.push(["all", "Mọi deck", "Mỗi số lấy ngẫu nhiên 100 từ trong mọi deck " + LANG_NAME[lang]]);
    opts.push(["pick", picked.length ? "Deck đã chọn (" + picked.length + ")" : "Chọn deck", "Tối đa " + (v.max_decks || 5) + " deck"]);
    const cur = book && g.scope !== "deck" ? "book" : (picked.length || deckOpen[lang]) ? "pick" : "all";
    return chips(opts, cur, (x) => {
      aiFlash = null;
      if (x === "book") { deckOpen[lang] = false; aiSet({ scope: "auto" }); return; }
      if (book && g.scope !== "deck") { H.send("ai:set:" + JSON.stringify({ scope: "deck" })); }
      if (x === "all") { deckOpen[lang] = false; H.send("ai:decks:" + JSON.stringify({ lang: lang, decks: [] })); }
      else { deckOpen[lang] = true; drawSource(); }
    });
  }
  function deckHas(name, q) {
    if (typeof Garden !== "undefined" && Garden.deckMatch) { return Garden.deckMatch(name, q); }
    return String(name).toLowerCase().indexOf(String(q || "").trim().toLowerCase()) >= 0;
  }
  function deckList(v, lang) {
    const picked = (v.picked || {})[lang] || [], max = v.max_decks || 5;
    const box = el("div", "kb-ai-decks");
    const decks = (v.decks || {})[lang] || [];
    if (!decks.length) { box.appendChild(el("div", "kb-ai-hint", "Chưa có deck " + LANG_NAME[lang] + ".")); }
    const find = el("div", "kb-ai-line kb-ai-dfind");
    const q = el("input", "kb-p-in kb-ai-dq");
    q.type = "text"; q.placeholder = "Tìm deck…"; q.spellcheck = false; q.autocomplete = "off";
    q.setAttribute("aria-label", "Tìm deck " + LANG_NAME[lang]);
    q.setAttribute("data-lang", lang);
    q.value = deckQuery[lang] || "";
    const cnt = el("span", "kb-ai-hint");
    find.appendChild(el("i", "kb-pi kb-pi-search"));
    find.appendChild(q); find.appendChild(cnt);
    if (decks.length > 6) { box.appendChild(find); }
    const list = el("div", "kb-ai-decks-list");
    list.setAttribute("data-lang", lang);
    const none = el("div", "kb-ai-hint", "Không có deck nào khớp.");
    const labs = [];
    const filter = () => {
      deckQuery[lang] = q.value;
      let n = 0;
      labs.forEach(([lab, d]) => { const on = deckHas(d.name, q.value); lab.hidden = !on; if (on) { n++; } });
      none.hidden = n > 0 || !decks.length;
      cnt.textContent = q.value.trim() ? n + " / " + decks.length + " deck" : decks.length + " deck";
    };
    q.addEventListener("input", () => { filter(); list.scrollTop = 0; });
    q.addEventListener("keydown", (e) => {
      e.stopPropagation();                       // gõ chữ không chạy phím tắt của bảng Báo
      if (e.key === "Escape" && q.value) { e.preventDefault(); q.value = ""; filter(); }
    });
    decks.forEach((d) => {
      const lab = el("label", "kb-ai-deck");
      const cb = el("input");
      cb.type = "checkbox";
      cb.checked = picked.indexOf(d.id) >= 0;
      cb.disabled = !cb.checked && picked.length >= max;
      cb.addEventListener("change", () => {
        const next = cb.checked ? picked.concat([d.id]) : picked.filter((x) => x !== d.id);
        H.send("ai:decks:" + JSON.stringify({ lang: lang, decks: next }));
      });
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(" " + d.name));
      lab.appendChild(el("span", "kb-ai-hint", d.notes + " note"));
      list.appendChild(lab);
      labs.push([lab, d]);
    });
    list.appendChild(none);
    box.appendChild(list);
    filter();
    const foot = el("div", "kb-ai-line");
    foot.appendChild(el("span", "kb-ai-hint", "Đã chọn " + picked.length + " / " + max));
    foot.appendChild(btn("", "Xong", () => { deckOpen[lang] = false; deckQuery[lang] = ""; deckScroll[lang] = 0; drawSource(); }));
    box.appendChild(foot);
    return box;
  }
  function langBlock(v, lang) {
    const g = v.gemini, L = (g.langs || {})[lang] || {}, en = lang === "en";
    const box = el("div", "kb-ai-lang");
    const h = el("div", "kb-ai-lang-h");
    h.appendChild(el("b", null, en ? "Báo tiếng Anh" : "Báo tiếng Nhật"));
    const nm = el("span", "kb-ai-hint", en ? "The Garden Gazette" : "畑新聞");
    if (!en) { nm.lang = "ja"; }
    h.appendChild(nm);
    box.appendChild(h);
    const rows = el("div", "kb-ai-rows");
    if (!en && v.source === "claude") {
      aiRow(rows, "Nguồn", "Claude Code (thẻ bên dưới)");
      box.appendChild(rows);
      return box;
    }
    if (L.running) {
      const val = aiRow(rows, "Hôm nay", "[i:hourglass] " + (g.msg || "Đang viết…"), null, "is-busy");
      val.id = "kb-ai-busy";
    } else if (L.today) {
      const val = el("span", null);
      val.appendChild(document.createTextNode("✓ Số " + L.today.so + ": "));
      const t = el("span", null, L.today.title);
      t.lang = lang;
      val.appendChild(t);
      aiRow(rows, "Hôm nay", val, [
        btn("kb-ai-main", "Đọc", () => readNow(lang, L.today.date)),
        L.today.audio_left && g.audio !== "tat" ? btn("", "Tạo giọng đọc (" + L.today.audio_left + ")", () => {
          aiFlash = null; H.send("ai:audio:" + JSON.stringify({ lang: lang }));
        }) : null]);
    } else if ((g.waiting || []).indexOf(lang) >= 0 && !L.error) {   // 1.22.3 / 1.22.4: chờ bấm "Bắt đầu viết"
      aiRow(rows, "Hôm nay", "chờ bấm “Bắt đầu viết” bên dưới");
    } else if (L.thieu) {
      aiRow(rows, "Hôm nay", "[i:warn] " + L.thieu, [btn("", "Viết", () => { aiFlash = null; H.send("ai:write:" + JSON.stringify({ lang: lang })); })], "is-warn");
    } else {
      aiRow(rows, "Hôm nay", L.error ? "✗ " + L.error : "chưa có số", [btn("kb-ai-main", L.error ? "Viết lại" : "Viết",
        () => { aiFlash = null; H.send("ai:write:" + JSON.stringify({ lang: lang })); }, g.running ? "Gemini đang viết báo khác" : "")],
        L.error ? "is-bad" : "");
    }
    if (L.focus && L.focus[1] && L.today) { aiRow(rows, "Từ phải ôn", "dùng " + L.focus[0] + " / " + L.focus[1] + " từ"); }
    if (L.audio_error && !L.running) { aiRow(rows, "Giọng đọc", "[i:warn] " + L.audio_error, null, "is-warn"); }
    const byBook = !en && v.claude.pham_vi && g.scope !== "deck";
    aiRow(rows, "Trình độ", chips((L.levels || []).map((x) => [x, x]), L.level, (x) => aiSet({ level: x }), byBook));
    if (byBook) { rows.lastChild.appendChild(el("span", "kb-ai-hint", "theo giáo trình")); }
    const picked = (v.picked || {})[lang] || [];
    aiRow(rows, "Lấy từ", sourcePicker(v, lang));
    if (picked.length && !deckOpen[lang] && !byBook) {
      const names = ((v.decks || {})[lang] || []).filter((d) => picked.indexOf(d.id) >= 0).map((d) => d.name);
      aiRow(rows, "", names.join(", "), [btn("", "Đổi", () => { deckOpen[lang] = true; drawSource(); })], "kb-ai-sub-row");
    }
    box.appendChild(rows);
    if (deckOpen[lang] && !byBook) { box.appendChild(deckList(v, lang)); }
    if (L.log && L.log.length) {
      const det = el("details", "kb-ai-log");
      det.appendChild(el("summary", null, "Nhật ký" + (L.log_day ? " " + shortDate(L.log_day) : "") +
        (L.scope_text ? " · " + L.scope_text : "")));
      L.log.forEach((l) => det.appendChild(el("div", "kb-ai-logline", l)));
      box.appendChild(det);
    }
    return box;
  }
  // 1.22.3: dán khoá lần đầu thì chưa viết; 1.22.4: báo vừa tick thêm ở "Báo muốn nhận" cũng chờ.
  // Chọn xong trình độ / deck mới bấm nút này.
  function startBlock(v) {
    const g = v.gemini, box = el("div", "kb-ai-start");
    const langs = v.langs_on || [], wait = g.waiting || [];
    const names = wait.map((x) => (x === "en" ? "Báo tiếng Anh" : "Báo tiếng Nhật"));
    const t = el("div", "kb-ai-start-t");
    if (g.first) {
      t.appendChild(el("b", null, "Bước 3 · "));
      t.appendChild(document.createTextNode(langs.length ? "Chọn báo muốn nhận, trình độ và deck lấy từ ở trên, rồi bấm Bắt đầu viết." :
        "Tick ít nhất một báo ở “Báo muốn nhận” trước đã."));
    } else {
      t.appendChild(el("b", null, "Vừa bật " + names.join(", ") + " · "));
      t.appendChild(document.createTextNode("Chọn trình độ và deck lấy từ ở trên, rồi bấm Bắt đầu viết."));
    }
    box.appendChild(t);
    const busy = !!g.running;
    const go = btn("kb-ai-main kb-ai-startbtn", "Bắt đầu viết", () => {
      aiFlash = null; go.disabled = true; H.send("ai:start");
    }, !langs.length ? "Chưa chọn báo nào" : busy ? "Gemini đang viết báo khác, chờ xong rồi bấm" : "");
    go.disabled = !langs.length || busy;
    box.appendChild(go);
    box.appendChild(el("span", "kb-ai-hint", busy ? "Gemini đang viết báo khác, xong thì bấm được" :
      "Mỗi báo 1–2 phút, chạy nền · từ mai tự viết khi mở Anki" + (g.auto ? "" : " (đang tắt)")));
    return box;
  }
  function geminiCard(v) {
    const g = v.gemini, on = !!g.key;
    const card = el("section", "kb-ai-card" + (on ? " is-on" : ""));
    const h = el("div", "kb-ai-h");
    h.appendChild(el("span", "kb-ai-name", "✦ Gemini"));
    h.appendChild(el("span", "kb-ai-sub", "Gemini viết báo mỗi sáng · miễn phí"));
    if (g.key && v.source !== "gemini" && (v.source === "claude" || v.want === "claude")) {
      h.appendChild(btn("", "Dùng Gemini cho báo tiếng Nhật", () => aiSet({ source: "gemini" })));
    }
    card.appendChild(h);
    if (!g.key || keyOpen) {
      card.appendChild(keyForm(g));
    } else {
      const rows = el("div", "kb-ai-rows");
      aiRow(rows, "Khoá", g.key + " ✓", [btn("", "Đổi khoá", () => { keyOpen = true; aiFlash = null; drawSource(); })]);
      if (g.model) { aiRow(rows, "Model", g.model); }
      card.appendChild(rows);
      (v.langs_on || []).forEach((lang) => card.appendChild(langBlock(v, lang)));
      if (g.first || (g.waiting || []).length) { card.appendChild(startBlock(v)); }

      const opts = el("div", "kb-ai-opts");
      const voice = el("select", "kb-ai-voice");
      voice.setAttribute("aria-label", "Giọng đọc");
      v.voices.forEach((x) => { const o = el("option", null, x); o.value = x; if (x === g.voice) { o.selected = true; } voice.appendChild(o); });
      voice.addEventListener("change", () => aiSet({ voice: voice.value }));
      aiRow(opts, "Giọng đọc", chips([["chinh_ta", "Câu chép", "Chỉ câu chép chính tả: ít lượt gọi nhất"], ["ca_bai", "Cả bài", "Thêm giọng đọc từng đoạn"], ["tat", "Tắt"]],
        g.audio, (x) => aiSet({ audio: x })), [g.audio !== "tat" ? voice : null]);
      if (!g.has_tts && g.audio !== "tat") { opts.lastChild.appendChild(el("span", "kb-ai-hint", "khoá chưa có giọng đọc")); }
      const lab = el("label", "kb-ai-auto");
      const cb = el("input");
      cb.type = "checkbox";
      cb.checked = !!g.auto;
      cb.addEventListener("change", () => aiSet({ auto: cb.checked }));
      lab.appendChild(cb);
      lab.appendChild(document.createTextNode(" Tự viết khi mở Anki"));
      opts.appendChild(lab);
      card.appendChild(opts);
    }
    const note = el("details", "kb-ai-note kb-ai-more");
    note.appendChild(el("summary", null, "Khoá lưu trên máy này, không đồng bộ."));
    note.appendChild(el("div", null, "Gemini nhận danh sách từ bạn đang học, nội dung báo và câu cần giọng đọc. Bản miễn phí: Google có thể dùng dữ liệu này để cải thiện sản phẩm."));
    note.appendChild(el("div", null, "Mỗi số: Gemini viết → máy kiểm tra → Gemini sửa → soát lần 2. Còn lỗi thì không đưa vào hòm thư. Hết lượt miễn phí thì hôm sau viết tiếp."));
    card.appendChild(note);
    if (g.key) {
      const f = btn("kb-ai-forget", forgetArmed ? "Bấm lần nữa để xoá khoá" : "Xoá khoá", () => {
        if (!forgetArmed) { forgetArmed = true; f.textContent = "Bấm lần nữa để xoá khoá"; return; }
        forgetArmed = false; keyOpen = false; aiFlash = null; H.send("ai:forget");
      });
      card.appendChild(f);
    }
    return card;
  }
  function claudeCard(v) {
    const c = v.claude, on = v.source === "claude";
    const card = el("section", "kb-ai-card kb-ai-claude" + (on ? " is-on" : ""));
    const h = el("div", "kb-ai-h");
    h.appendChild(el("span", "kb-ai-name", "Claude Code"));
    h.appendChild(el("span", "kb-ai-sub", "Bộ kotoba_daily · chỉ báo tiếng Nhật"));
    if (on) { h.appendChild(el("span", "kb-p-tag is-done", "Đang dùng")); }
    else if (c.ok) { h.appendChild(btn("", "Dùng Claude Code", () => aiSet({ source: "claude" }))); }
    card.appendChild(h);
    const rows = el("div", "kb-ai-rows");
    const state = c.ok ? " ✓ " + c.issues + " số" + (c.pham_vi ? " · có pham_vi.json" : "") : c.set ? " ✗ không thấy thư mục" : "";
    aiRow(rows, "Thư mục", (c.path || "chưa chọn") + state, [btn("", "Chọn thư mục", () => { aiFlash = null; H.send("ai:dir"); })], c.set && !c.ok ? "is-bad" : "");
    card.appendChild(rows);
    card.appendChild(el("div", "kb-ai-note", "Cách cài: xem HUONG_DAN.md trong thư mục kotoba_daily."));
    return card;
  }
  // 1.13: giọng cho câu chép không có audio (câu ví dụ / từ của deck, câu báo thiếu giọng đọc)
  function voiceCard(v) {
    const dv = v.dict_voice || { mode: "auto" };
    const card = el("section", "kb-ai-card kb-ai-dv");
    const h = el("div", "kb-ai-h");
    h.appendChild(GardenIcons.fill(el("span", "kb-ai-name"), "[i:speaker] Giọng đọc cho câu không có audio"));
    h.appendChild(el("span", "kb-ai-sub", "Dùng cho Chép chính tả"));
    card.appendChild(h);
    const rows = el("div", "kb-ai-rows");
    aiRow(rows, "Dùng", chips([["auto", "Tự động", "Giọng Gemini (nếu có khoá); trong lúc chờ dùng giọng của máy"],
      ["may", "Giọng máy", "Không gửi câu lên Google"], ["tat", "Tắt", "Chỉ chép câu / từ có sẵn audio"]], dv.mode, (x) => aiSet({ dict_voice: x })));
    aiRow(rows, "Máy này", dv.tts ? "✓ có giọng tiếng Nhật" : "chưa có giọng tiếng Nhật", null, dv.tts ? "" : "is-warn");
    if (dv.mode === "auto") {
      aiRow(rows, "Gemini", dv.running ? "[i:hourglass] đang tạo giọng đọc…" : dv.key ? (dv.error ? "[i:warn] " + dv.error : "✓ tạo giọng đọc khi cần") : "chưa có khoá",
        null, dv.error ? "is-warn" : "");
    }
    card.appendChild(rows);
    if (!dv.tts) {
      const how = el("details", "kb-ai-note kb-ai-more");
      how.appendChild(el("summary", null, "Cách cài giọng tiếng Nhật"));
      how.appendChild(el("div", null, "Windows: Cài đặt → Thời gian & ngôn ngữ → Giọng nói → Thêm giọng nói → Tiếng Nhật."));
      how.appendChild(el("div", null, "macOS: Cài đặt hệ thống → Trợ năng → Nội dung đọc → Giọng hệ thống → Quản lý giọng nói → Tiếng Nhật."));
      how.appendChild(el("div", null, "Cài xong thì mở lại Anki."));
      card.appendChild(how);
    }
    return card;
  }
  function drawSource() {
    if (!isOpen || tab !== "src") { return; }
    const st = stage();
    const keep = st.scrollTop;
    Array.prototype.forEach.call(st.querySelectorAll(".kb-ai-decks-list"), (e) => { deckScroll[e.getAttribute("data-lang")] = e.scrollTop; });
    const ae = document.activeElement;
    const typing = ae && ae.classList && ae.classList.contains("kb-ai-dq") ? { lang: ae.getAttribute("data-lang"), a: ae.selectionStart, b: ae.selectionEnd } : null;
    st.textContent = "";
    const v = aiView;
    if (!v) { st.appendChild(el("div", "kb-p-empty", "Đang mở…")); return; }
    const wrap = el("div", "kb-ai");
    if (!v.gemini.key && !v.claude.ok) {
      const intro = el("div", "kb-p-empty kb-ai-intro");
      intro.appendChild(el("div", "kb-p-empty-h", "Chưa có báo"));
      intro.appendChild(el("p", null, "Dán khoá Gemini (miễn phí) để mỗi sáng có báo viết bằng từ bạn đang học."));
      wrap.appendChild(intro);
    }
    if (aiFlash && aiFlash.flash) { wrap.appendChild(el("div", "kb-ai-flash " + (aiFlash.ok ? "is-ok" : "is-bad"), aiFlash.flash)); }
    wrap.appendChild(wantRow(v));
    wrap.appendChild(geminiCard(v));
    // 1.22.8: thẻ Claude Code chỉ hiện khi đã đặt bao_dir trong config (cách nâng cao, hướng dẫn ở config.md / README)
    if (v.claude.set) { wrap.appendChild(claudeCard(v)); }
    wrap.appendChild(voiceCard(v));
    st.appendChild(wrap);
    st.scrollTop = keep;
    Array.prototype.forEach.call(st.querySelectorAll(".kb-ai-decks-list"), (e) => { e.scrollTop = deckScroll[e.getAttribute("data-lang")] || 0; });
    if (typing) {
      const q = st.querySelector('.kb-ai-dq[data-lang="' + typing.lang + '"]');
      if (q) { q.focus(); try { q.setSelectionRange(typing.a, typing.b); } catch (e) { /* bỏ qua */ } }
    }
  }
  function onAiStatus(v) {
    if (!v) { return; }
    if (v.flash !== undefined) { aiFlash = { flash: v.flash, ok: !!v.ok }; }
    if (v.flash && v.ok && /Khoá dùng được/.test(v.flash)) { keyOpen = false; }
    aiView = v;
    if (index && index.lang !== "en") { index.source = v.source; }
    if (isOpen && tab === "src") { drawSource(); }
  }
  function onAiProgress(p) {
    if (!aiView || !p) { return; }
    aiView.gemini.running = true;
    aiView.gemini.msg = p.msg || "";
    const L = (aiView.gemini.langs || {})[aiView.gemini.run_lang];
    if (L) { L.running = true; }
    const b = document.getElementById("kb-ai-busy");
    if (b) { GardenIcons.fill(b, "[i:hourglass] " + aiView.gemini.msg); }
    else if (isOpen && tab === "src" && !keyOpen) { drawSource(); }
  }

  function drawShelf() {
    const st = stage();
    st.textContent = "";
    if (!index || !index.enabled) { drawSetup(); return; }
    if (!index.issues.length) { drawNoIssue(); return; }
    const bar = langBar();
    if (bar) { st.appendChild(bar); }
    const list = el("div", "kb-p-shelf");
    index.issues.forEach((x) => {
      const en = x.lang === "en";
      const row = el("button", "kb-p-row" + (x.read ? "" : " is-unread"));
      row.type = "button";
      row.appendChild(el("span", "kb-p-row-date", shortDate(x.date)));
      const mid = el("span", "kb-p-row-mid");
      const t = el("span", "kb-p-row-title", x.title || (en ? "No. " + x.so : "第" + x.so + "号"));
      t.lang = en ? "en" : "ja";
      mid.appendChild(t);
      const meta = [];
      if (x.so) { meta.push("Số " + x.so); }
      if (x.ky) { meta.push("Truyện kỳ " + x.ky); }
      if (x.rut_gon) { meta.push("số ngắn"); }
      if (x.tom_tat) { meta.push(x.tom_tat); }
      mid.appendChild(el("span", "kb-p-row-meta", meta.join(" · ")));
      row.appendChild(mid);
      row.appendChild(el("span", "kb-p-tag" + (x.read ? (x.complete ? " is-done" : "") : " is-new"),
        x.read ? (x.complete ? "Xong +" + x.coins + " xu" : "Đã đọc") : "Mới"));
      row.addEventListener("click", () => { wantDate = x.date; issue = null; setTab("issue"); });
      list.appendChild(row);
    });
    st.appendChild(list);
  }

  // ---------------------------------------------------------------------
  // Một số báo
  // ---------------------------------------------------------------------
  function onIssue(v) {
    issue = v;
    wantDate = v.date;
    if (isOpen && tab === "issue") { drawIssue(); }
  }

  function playBtn(label, payload, title) {
    const b = el("button", "kb-p-play", label);
    b.type = "button";
    b.title = title || "Nghe";
    b.setAttribute("aria-label", title || "Nghe");
    b.addEventListener("click", (e) => { e.stopPropagation(); H.send((payload.id ? "dict" : "paper") + ":play:" + JSON.stringify(payload)); });
    return b;
  }

  function drawIssue() {
    const v = issue, st = stage();
    const en = v.lang === "en", lg = en ? "en" : "ja";     // 1.19: báo tiếng Anh — The Garden Gazette
    st.textContent = "";
    furiButton();
    const mast = el("div", "kb-p-mast");
    const name = el("div", "kb-p-name" + (en ? " kb-p-name-en" : ""), en ? "The Garden Gazette" : "畑新聞");
    name.lang = lg;
    mast.appendChild(name);
    const meta = el("div", "kb-p-meta");
    meta.lang = lg;
    meta.appendChild(el("div", null, en ? enDate(v.date) : jpDate(v.date)));
    meta.appendChild(el("div", null, en ? "No. " + (v.so || "?") + (v.rut_gon ? " · short edition" : "")
      : "第" + (v.so || "?") + "号" + (v.rut_gon ? "・短縮版" : "")));
    mast.appendChild(meta);
    st.appendChild(mast);
    if (v.rut_gon) {
      st.appendChild(el("div", "kb-p-note", "Số ngắn vì bạn còn số chưa đọc."));
    }
    v.bai.forEach((b, i) => {
      const art = el("article", "kb-p-art kb-p-" + b.loai);
      art.lang = lg;
      const head = el("div", "kb-p-kind", (en ? LOAI_EN : LOAI)[b.loai] + (b.ky ? " · Kỳ " + b.ky : ""));
      head.lang = "vi";
      art.appendChild(head);
      if (b.tieu_de) {
        const h = el("h3", "kb-p-h");
        h.appendChild(md(b.tieu_de, v.tu));
        art.appendChild(h);
      }
      if (b.ky_truoc) {
        const prev = el("div", "kb-p-prev", "Kỳ trước: " + b.ky_truoc);
        prev.lang = "vi";
        art.appendChild(prev);
      }
      if (b.ky_truoc_ngay) {
        const warn = el("div", "kb-p-note");
        warn.lang = "vi";
        warn.appendChild(document.createTextNode("Bạn chưa đọc kỳ " + (b.ky - 1) + " (số ngày " + shortDate(b.ky_truoc_ngay) + "). "));
        warn.appendChild(btn("", "Đọc kỳ trước", () => { wantDate = b.ky_truoc_ngay; issue = null; setTab("issue"); }));
        art.appendChild(warn);
      }
      b.doan.forEach((p, j) => {
        const para = el("p", "kb-p-text");
        para.appendChild(md(p, v.tu));
        if (b.audio && b.audio[j]) { para.appendChild(playBtn("▶", { d: v.date, k: "bai", i: i, j: j }, "Nghe đoạn này")); }
        art.appendChild(para);
      });
      if (b.nguon) {
        const src = el("div", "kb-p-src", "Viết lại từ tin: " + b.nguon);
        src.lang = "vi";
        art.appendChild(src);
      }
      st.appendChild(art);
    });

    if (v.cau_hoi.length || v.chinh_ta.length) {
      const pr = el("section", "kb-p-practice");
      const ph = el("div", "kb-p-ph");
      ph.appendChild(el("span", null, "Luyện tập"));
      ph.appendChild(el("span", "kb-p-reward", "Đúng ngay lần đầu +" + v.reward.q + " xu mỗi câu · làm hết +" + v.reward.bonus + " xu"));
      pr.appendChild(ph);
      v.cau_hoi.forEach((q, i) => pr.appendChild(drawQuestion(q, i, lg)));
      v.chinh_ta.forEach((c, i) => pr.appendChild(drawDictRow(c, i, { d: v.date, k: "ct", i: i }, "Chép câu " + (i + 1))));
      st.appendChild(pr);
    }
    if (v.mau.length) {
      const g = el("section", "kb-p-grammar");
      g.appendChild(el("div", "kb-p-ph", "Mẫu câu trong số này"));
      const chips = el("div", "kb-p-chips");
      v.mau.forEach((m) => {
        const c = btn("kb-p-chip", m.mau, () => setInfo(m.mau + ": " + m.nghia + (m.bai ? " (" + m.bai + ")" : "")));
        c.lang = lg;
        chips.appendChild(c);
      });
      g.appendChild(chips);
      st.appendChild(g);
    }
    st.appendChild(el("div", "kb-p-credit",
      (v.credit ? "Giọng đọc: " + v.credit + ". " : "") + (v.voice_note ? v.voice_note + " " : "") +
      "Báo do " + (v.may_viet || "Claude") + " viết tự động, có thể còn chỗ chưa tự nhiên."));
    updateCoins(v.coins);
  }

  function drawQuestion(q, i, lg) {
    const box = el("div", "kb-p-q");
    box.setAttribute("data-q", i);
    const h = el("div", "kb-p-qh");
    h.lang = lg || "ja";
    h.appendChild(document.createTextNode((i + 1) + ". "));
    h.appendChild(md(q.hoi, null));
    box.appendChild(h);
    const fb = el("div", "kb-p-fb");
    q.chon.forEach((o, j) => {
      const b = el("button", "kb-p-opt");
      b.type = "button";
      b.lang = lg || "ja";
      b.setAttribute("data-c", j);
      b.appendChild(md(o, null));
      b.addEventListener("click", () => {
        if (busy["q" + i]) { return; }
        busy["q" + i] = true;
        box.setAttribute("data-pick", j);
        H.send("paper:q:" + JSON.stringify({ d: issue.date, i: i, c: j }));
      });
      box.appendChild(b);
    });
    box.appendChild(fb);
    if (q.done) { markQuestion(box, { dung: q.dung, ok: null, giai_thich: q.giai_thich, first: false, prev: q.first }); }
    return box;
  }
  function markQuestion(box, res) {
    const pick = Number(box.getAttribute("data-pick"));
    Array.prototype.forEach.call(box.querySelectorAll(".kb-p-opt"), (b) => {
      const c = Number(b.getAttribute("data-c"));
      b.classList.toggle("is-right", res.ok === true && c === res.dung);
      b.classList.toggle("is-wrong", res.ok === false && c === pick);
    });
    const fb = box.querySelector(".kb-p-fb");
    if (res.ok === null) {      // đã làm từ trước
      Array.prototype.forEach.call(box.querySelectorAll(".kb-p-opt"), (b) => {
        if (Number(b.getAttribute("data-c")) === res.dung) { b.classList.add("is-right"); }
      });
      fb.className = "kb-p-fb is-ok";
      fb.textContent = (res.prev ? "Đã trả lời đúng. " : "Đã làm. ") + (res.giai_thich || "");
      return;
    }
    if (res.ok) {
      fb.className = "kb-p-fb is-ok";
      fb.textContent = "Đúng" + (res.gained ? " +" + res.gained + " xu" : "") + ". " + (res.giai_thich || "");
    } else {
      fb.className = "kb-p-fb is-bad";
      fb.textContent = "Chưa đúng. Chọn lại nhé" + (res.first ? " (không tính xu)." : ".");
    }
  }

  // Một dòng chép chính tả (dùng chung cho báo và lượt hằng ngày)
  function drawDictRow(c, i, key, label) {
    const row = el("div", "kb-p-ct");
    const isDaily = !!key.id;
    row.setAttribute("data-ct", isDaily ? key.id : String(i));
    const top = el("div", "kb-p-ct-top");
    top.appendChild(el("span", "kb-p-ct-label", label));
    if (c.review) { top.appendChild(el("span", "kb-p-tag is-review", "Ôn lại")); }
    if (c.audio) {
      top.appendChild(playBtn("▶ Nghe", Object.assign({ s: 0 }, key), "Nghe"));
      if (c.slow) { top.appendChild(playBtn("▶ Chậm", Object.assign({ s: 1 }, key), "Nghe chậm")); }
      if (c.voice) { top.appendChild(el("span", "kb-p-tag kb-p-voice", c.voice)); }
    } else if (c.pending) {
      top.appendChild(GardenIcons.fill(el("span", "kb-p-ct-noaudio is-wait"), "[i:hourglass] đang tạo giọng đọc…"));
    } else {
      top.appendChild(el("span", "kb-p-ct-noaudio", "chưa có audio"));
    }
    if (c.len) { top.appendChild(el("span", "kb-p-ct-len", c.len + " " + (c.unit || "ký tự"))); }
    row.appendChild(top);
    if (c.pending && !c.audio && !c.done) {
      row.appendChild(el("div", "kb-p-ct-hint", "Gemini đang đọc câu này…"));
      return row;
    }
    if (!c.audio && !c.done) {
      // không có giọng đọc: không chép chính tả được (câu đang nằm ngay trong bài)
      row.appendChild(el("div", "kb-p-ct-hint", "Câu này chưa có giọng đọc."));
      return row;
    }
    const latin = !!c.lang && c.lang !== "ja";       // 1.17: câu / từ tiếng Anh (hoặc ngôn ngữ khác)
    if (c.kana_ok === false && !latin) {
      row.appendChild(el("div", "kb-p-ct-hint", "Câu này không có furigana: gõ đúng chữ Hán."));
    }
    const line = el("div", "kb-p-ct-line");
    const inp = el("input", "kb-p-in");
    inp.type = "text";
    inp.lang = latin ? (c.lang === "en" ? "en" : "") : "ja";
    inp.autocomplete = "off";
    inp.spellcheck = false;
    inp.placeholder = (c.src === "word" ? "Gõ từ vừa nghe" : "Gõ câu vừa nghe") + (latin ? " (hoa thường, dấu câu không tính)" : "");
    inp.setAttribute("aria-label", label);
    const chk = btn("kb-p-check", "Kiểm tra", null);
    line.appendChild(inp);
    line.appendChild(chk);
    row.appendChild(line);
    const fb = el("div", "kb-p-fb");
    const ans = el("div", "kb-p-ans");
    ans.lang = latin ? inp.lang : "ja";
    row.appendChild(fb);
    row.appendChild(ans);
    function check() {
      const raw = inp.value.trim();
      if (!raw) { fb.className = "kb-p-fb is-bad"; fb.textContent = "Gõ câu bạn nghe được trước đã."; inp.focus(); return; }
      const id = isDaily ? key.id : "ct" + i;
      if (busy[id]) { return; }
      busy[id] = true;
      fb.className = "kb-p-fb";
      fb.textContent = "Đang chấm…";
      if (isDaily) { H.send("dict:check:" + JSON.stringify({ id: key.id, v: variants(raw, latin) })); }
      else { H.send("paper:ct:" + JSON.stringify({ d: key.d, i: i, v: variants(raw, latin) })); }
    }
    chk.addEventListener("click", check);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); check(); }
      if (e.key !== "Escape") { e.stopPropagation(); }   // Esc vẫn đóng bảng như mọi chỗ khác
    });
    inp.addEventListener("input", () => { if (fb.classList.contains("is-bad")) { fb.textContent = ""; fb.className = "kb-p-fb"; } });
    if (c.done) { markDict(row, { ok: null, cau: c.cau, meaning: c.meaning, prev: c.first }); }
    return row;
  }
  function markDict(row, res) {
    const fb = row.querySelector(".kb-p-fb"), ans = row.querySelector(".kb-p-ans");
    ans.textContent = "";
    if (res.ok === null) {
      fb.className = "kb-p-fb is-ok";
      fb.textContent = res.prev ? "Đã chép đúng." : "Đã làm. Chép lại để luyện thêm (không tính xu).";
    } else if (res.ok) {
      fb.className = "kb-p-fb is-ok";
      fb.textContent = "Đúng rồi" + (res.gained ? " +" + res.gained + " xu" : "") + ".";
    } else {
      fb.className = "kb-p-fb is-bad";
      fb.textContent = "Chưa đúng. Câu đúng là:";
    }
    if (res.cau) { ans.appendChild(md(res.cau, null)); }
    if (res.meaning) { const m = el("div", "kb-p-ans-m", res.meaning); m.lang = "vi"; ans.appendChild(m); }
    if (res.ok === false) {
      const note = el("div", "kb-p-ans-m", "Câu này sẽ quay lại để ôn sau 1 ngày.");
      note.lang = "vi";
      ans.appendChild(note);
    }
  }

  // ---------------------------------------------------------------------
  // Chép chính tả hằng ngày
  // ---------------------------------------------------------------------
  function onDaily(v) {
    daily = v;
    if (isOpen && tab === "dict") { defaultInfo(); furiButton(); drawDaily(); }
  }
  function drawDaily() {
    const v = daily, st = stage();
    st.textContent = "";
    const head = el("div", "kb-p-dhead");
    head.appendChild(el("div", "kb-p-name kb-p-name-s", "書き取り"));
    const meta = el("div", "kb-p-dmeta");
    meta.appendChild(el("div", "kb-p-dcount", "Hôm nay " + v.done + "/" + v.total + " câu" + (v.complete ? " ✓" : "")));
    meta.appendChild(el("div", "kb-p-reward", "Đúng ngay lần đầu +" + v.reward.each + " xu mỗi câu · làm hết +" + v.reward.bonus + " xu" +
      (v.queue ? " · " + v.queue + " câu đang chờ ôn" : "")));
    head.appendChild(meta);
    st.appendChild(head);
    if (!v.items.length) {
      const box = el("div", "kb-p-empty");
      box.appendChild(el("div", "kb-p-empty-h", "Chưa có câu nào để chép"));
      const hint = v.hint && v.hint.length ? v.hint : ["Lượt chép lấy câu từ báo và câu ví dụ có audio của deck đang xem."];
      hint.forEach((h) => box.appendChild(GardenIcons.fill(el("p", "kb-p-hint"), h)));
      const acts = el("div", "kb-p-acts");
      acts.appendChild(btn("kb-p-go", "Nguồn báo", () => setTab("src")));
      box.appendChild(acts);
      st.appendChild(box);
      updateCoins(v.coins);
      return;
    }
    if (v.voicing && v.pending) {
      st.appendChild(GardenIcons.fill(el("div", "kb-p-note"), "[i:hourglass] Gemini đang đọc " + v.pending + " câu — làm câu khác trước nhé."));
    }
    v.items.forEach((c, i) => st.appendChild(drawDictRow(c, i, { id: c.id }, (i + 1) + ". " + c.label)));
    if (v.hint && v.hint.length) {
      const det = el("details", "kb-p-dhint");
      det.appendChild(el("summary", null, "Có câu chưa nghe được"));
      v.hint.forEach((h) => det.appendChild(GardenIcons.fill(el("p", "kb-p-hint"), h)));
      st.appendChild(det);
    }
    updateCoins(v.coins);
    const first = st.querySelector(".kb-p-in");
    if (first) { setTimeout(() => { try { first.focus(); } catch (e) { /* bỏ qua */ } }, 30); }
  }

  // ---------------------------------------------------------------------
  // Kết quả từ Python
  // ---------------------------------------------------------------------
  function updateCoins(n) { const c = $("kb-p-coins"); if (c) { c.textContent = String(n || 0); } }

  function onResult(res) {
    if (res.wallet && H.setWallet) { H.setWallet(res.wallet); }
    if (res.summary && H.setSummary) { H.setSummary(res.summary); }
    if (res.quests && H.questResult) { H.questResult(res.quests); }
    if (res.gained) { sfx("coin"); } else if (res.ok) { sfx("good"); } else { sfx("again"); }
    if (res.bonus) {
      if (typeof GardenFX !== "undefined" && GardenFX.say) {
        GardenFX.say(res.kind === "dict" ? "書き取り完了！ Xong lượt chép +" + res.bonus + " xu" : "Đọc xong số báo! +" + res.bonus + " xu", 2600);
      }
      if (typeof GardenFX !== "undefined" && GardenFX.mood) { GardenFX.mood("star", 1800); }
    }
    if (res.kind === "q") {
      busy["q" + res.i] = false;
      if (!issue || issue.date !== res.date) { return; }
      issue.coins = (issue.coins || 0) + (res.gained || 0);
      updateCoins(issue.coins);
      const box = document.querySelector('.kb-p-q[data-q="' + res.i + '"]');
      if (box) { markQuestion(box, res); }
      if (res.first && issue.cau_hoi[res.i]) { issue.cau_hoi[res.i].done = true; issue.cau_hoi[res.i].first = res.ok ? 1 : 0; issue.cau_hoi[res.i].dung = res.dung; issue.cau_hoi[res.i].giai_thich = res.giai_thich; }
    } else if (res.kind === "ct") {
      busy["ct" + res.i] = false;
      if (!issue || issue.date !== res.date) { return; }
      issue.coins = (issue.coins || 0) + (res.gained || 0);
      updateCoins(issue.coins);
      const row = document.querySelector('.kb-p-practice .kb-p-ct[data-ct="' + res.i + '"]');
      if (row) { markDict(row, res); }
    } else if (res.kind === "dict") {
      busy[res.id] = false;
      if (!daily) { return; }
      daily.coins = (daily.coins || 0) + (res.gained || 0);
      daily.done = res.done;
      daily.complete = res.complete;
      updateCoins(daily.coins);
      const rows = document.querySelectorAll(".kb-p-ct");
      Array.prototype.forEach.call(rows, (row) => { if (row.getAttribute("data-ct") === res.id) { markDict(row, res); } });
      const cnt = document.querySelector(".kb-p-dcount");
      if (cnt) { cnt.textContent = "Hôm nay " + res.done + "/" + res.total + " câu" + (res.complete ? " ✓" : ""); }
    }
  }

  function onError(msg) {
    busy = {};
    sfx("again");
    setInfo(String(msg || "Có lỗi."), "bad");
    Array.prototype.forEach.call(document.querySelectorAll(".kb-p-fb"), (f) => { if (f.textContent === "Đang chấm…") { f.textContent = ""; } });
  }

  function onKey(e) {
    if (!isOpen) { return; }
    if (e.key === "Escape") { e.preventDefault(); close(); return; }
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") { return; }
    if ((e.key === "Enter" || e.key === " ") && e.target && e.target.classList && e.target.classList.contains("kb-p-w")) {
      e.preventDefault();
      showWord(e.target.getAttribute("data-k"));
    }
  }

  return {
    init: function (helpers) {
      H = helpers;
      document.addEventListener("keydown", onKey);
      $("kb-p-exit").addEventListener("click", close);
      Array.prototype.forEach.call(document.querySelectorAll(".kb-p-tab"), (b) => {
        b.addEventListener("click", () => { if (b.getAttribute("data-ptab") === "issue") { wantDate = null; issue = null; } setTab(b.getAttribute("data-ptab")); });
      });
      $("kb-p-furi").addEventListener("click", (e) => {
        const p = $("kb-paper");
        p.classList.toggle("kb-p-nofuri");
        e.currentTarget.textContent = p.classList.contains("kb-p-nofuri") ? "Hiện furigana" : "Ẩn furigana";
      });
      stage().addEventListener("click", (e) => {
        const w = e.target.closest ? e.target.closest(".kb-p-w") : null;
        if (w) { showWord(w.getAttribute("data-k")); }
      });
    },
    open: open,
    close: close,
    isOpen: function () { return isOpen; },
    index: onIndex,
    issue: onIssue,
    daily: onDaily,
    result: onResult,
    error: onError,
    aiStatus: onAiStatus,
    aiProgress: onAiProgress,
    // cho test
    _state: function () { return { tab: tab, issue: issue && issue.date, lang: paperLang(), issueLang: issue && issue.lang, daily: daily && daily.items.length, selected: selectedKey, ai: aiView, index: index }; },
    _md: function (t) { const d = el("div"); d.appendChild(md(t, null)); return d.innerHTML; },
    _plain: plain
  };
})();
