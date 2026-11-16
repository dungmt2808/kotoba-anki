/* ことば畑 – 1.32: "Ngôn ngữ trong vườn". Câu StackChan nói, sinh hoạt, đồ nhặt, khách, tường / sàn, mùa, tiêu đề bảng
   theo ngôn ngữ chọn ở ⚙ (Tự theo deck / Nhật / Anh / Trung / Hàn / Chỉ tiếng Việt); trò chơi theo ngôn ngữ của deck
   đang chơi. Bảng chữ do Python gửi (lang_core.bundle → data.gl); mã JS giữ nguyên câu tiếng Nhật làm khoá — chỗ hiện
   chữ gọi line() / fill() / item() / title(). Lựa chọn lưu ở cài đặt riêng máy (GardenPrefs "kb-glang").
   Tự theo deck: ngôn ngữ của phần lớn cây trong vườn (ja / en / zh / ko); deck "Ngôn ngữ khác" không tính, không có cây
   nào thì tiếng Nhật như các bản trước. */
var GardenLang = (function () {
  "use strict";

  const LANGS = ["ja", "en", "zh", "ko", "vi"];
  const ATTR = { ja: "ja", en: "en", zh: "zh-CN", ko: "ko", vi: "vi" };
  const PREF = "kb-glang";
  let B = null;                  // bảng chữ (data.gl)
  let plants = [];
  let keys = [];                 // khoá câu nói, dài trước
  const listeners = [];

  function setData(d) {
    if (!d) { return; }
    if (d.gl && d.gl !== B) {
      B = d.gl;
      keys = Object.keys(B.say || {}).sort((a, b) => b.length - a.length);
    }
    plants = d.plants || [];
  }
  function prefs() { return typeof GardenPrefs !== "undefined" ? GardenPrefs : null; }
  function pref() {
    const P = prefs(), v = P ? P.get(PREF) : null;
    return v && (v === "auto" || LANGS.indexOf(v) >= 0) ? v : "auto";
  }
  function plantLang(p) {
    const l = p && p.lang;
    if (!l || l === "ja") { return "ja"; }
    return l === "en" || l === "zh" || l === "ko" ? l : "";
  }
  function auto() {
    const n = { ja: 0, en: 0, zh: 0, ko: 0 };
    plants.forEach((p) => { const l = plantLang(p); if (l) { n[l] += 1; } });
    let best = "ja";
    ["en", "zh", "ko"].forEach((l) => { if (n[l] > n[best]) { best = l; } });
    return best;
  }
  function cur() { const p = pref(); return p === "auto" ? auto() : p; }
  // trò chơi: ngôn ngữ của deck (nhóm trò chơi), "Chỉ tiếng Việt" thì tiếng Việt; deck ngôn ngữ khác thì theo vườn
  function forDeck(lang) {
    if (pref() === "vi") { return "vi"; }
    return lang === "ja" || lang === "en" || lang === "zh" || lang === "ko" ? lang : cur();
  }
  function setPref(v) {
    const P = prefs();
    if (!P || (v !== "auto" && LANGS.indexOf(v) < 0)) { return; }
    P.set(PREF, v);
    applyTitles(document);
    syncSelect();
    listeners.forEach((f) => { try { f(cur()); } catch (e) { /* bỏ qua */ } });
  }
  function onChange(f) { listeners.push(f); }

  // ---- câu nói: tách thành đoạn chữ thường / khoá tiếng Nhật (khớp khoá dài nhất trước)
  function parts(text) {
    const s = String(text === undefined || text === null ? "" : text), out = [];
    let buf = "", i = 0;
    while (i < s.length) {
      let hit = null;
      if (/[぀-ヿ㐀-鿿]/.test(s[i])) {
        for (let k = 0; k < keys.length; k++) { if (s.startsWith(keys[k], i)) { hit = keys[k]; break; } }
      }
      if (hit) { if (buf) { out.push([buf]); buf = ""; } out.push([hit, B.say[hit]]); i += hit.length; } else { buf += s[i]; i++; }
    }
    if (buf) { out.push([buf]); }
    return out;
  }
  function subVi(s, lang) {
    const sub = (B && B.sub) || {};
    Object.keys(sub).forEach((k) => { if (sub[k][lang] && s.indexOf(k) >= 0) { s = s.split(k).join(sub[k][lang]); } });
    return s;
  }
  function tidy(s) { return s.replace(/\s{2,}/g, " ").replace(/^\s+|\s+$/g, ""); }
  function rep(row, lang) { return lang === "en" ? row[0] : lang === "zh" ? row[1] : lang === "ko" ? row[3] : row[4]; }
  function line(text, lang) {
    lang = lang || cur();
    if (lang === "ja" || !B) { return text; }
    const s = parts(text).map((p) => (p[1] ? rep(p[1], lang) : p[0])).join("");
    return tidy(subVi(s, lang));
  }
  // như line() nhưng gắn vào node: tiếng Trung có pinyin nhỏ sau chữ (span.kb-py)
  function fill(node, text, lang) {
    lang = lang || cur();
    node.textContent = "";
    if (lang === "ja" || !B) { node.textContent = text; node.removeAttribute("lang"); return node; }
    const ps = parts(text);
    let acc = "";
    const flush = () => { if (acc) { node.appendChild(document.createTextNode(acc)); acc = ""; } };
    ps.forEach((p, i) => {
      if (!p[1]) { acc += p[0]; return; }
      const t = rep(p[1], lang);
      if (lang === "zh" && p[1][2]) {
        acc += t; flush();
        const py = document.createElement("span"); py.className = "kb-py"; py.setAttribute("lang", "zh-Latn"); py.textContent = " " + p[1][2];
        node.appendChild(py);
        if (i + 1 < ps.length && !/^\s/.test(ps[i + 1][0] || "")) { acc += " "; }
      } else { acc += t; }
    });
    flush();
    // gọn khoảng trắng ở đầu / cuối và đổi chữ tiếng Việt riêng của tiếng Nhật (JLPT…)
    Array.from(node.childNodes).forEach((n) => { if (n.nodeType === 3) { n.nodeValue = subVi(n.nodeValue.replace(/\s{2,}/g, " "), lang); } });
    const first = node.firstChild, last = node.lastChild;
    if (first && first.nodeType === 3) { first.nodeValue = first.nodeValue.replace(/^\s+/, ""); }
    if (last && last.nodeType === 3) { last.nodeValue = last.nodeValue.replace(/\s+$/, ""); }
    if (lang === "zh" || lang === "ko") { node.setAttribute("lang", ATTR[lang]); } else { node.removeAttribute("lang"); }
    return node;
  }

  // ---- mục có mã (sinh hoạt, đồ nhặt, khách, tường / sàn, mùa): {t, r, lang, rlang} hoặc null khi "Chỉ tiếng Việt"
  function item(kind, id, ja, kana, lang) {
    lang = lang || cur();
    if (lang === "vi") { return null; }
    const row = B && B[kind] && B[kind][id];
    if (lang === "ja") { return { t: ja || "", r: kana && kana !== ja ? kana : "", lang: "ja", rlang: "ja" }; }
    if (!row) { return null; }          // mục chưa có bản dịch (bản sau thêm): chỉ hiện tên tiếng Việt
    if (lang === "en") { return { t: row[0], r: "", lang: "en", rlang: "en" }; }
    if (lang === "zh") { return { t: row[1], r: row[2], lang: "zh-CN", rlang: "zh-Latn" }; }
    return { t: row[3], r: row[4], lang: "ko", rlang: "ko-Latn" };
  }
  // tên kèm theo tên tiếng Việt (Album khách, tường / sàn, mùa): chữ + cách đọc trên một dòng
  function label(kind, id, ja, kana, lang) {
    const it = item(kind, id, ja, kana, lang);
    if (!it || !it.t) { return ""; }
    return it.r && it.lang !== "ja" ? it.t + " " + it.r : it.t;
  }

  // ---- tiêu đề bảng "工房 · Xưởng chế tác"
  function title(text, lang) {
    lang = lang || cur();
    const m = /^(\S+) · ([\s\S]*)$/.exec(String(text || ""));
    if (!m || lang === "ja" || !B) { return text; }
    const row = B.titles && B.titles[m[1]];
    if (!row) { return text; }
    const head = lang === "en" ? row[0] : lang === "zh" ? row[1] : lang === "ko" ? row[3] : "";
    return head ? head + " · " + m[2] : m[2];
  }
  function applyTitles(root) {
    if (!root || !root.querySelectorAll) { return; }
    const lang = cur();
    root.querySelectorAll(".kb-g-title, .kb-quest-head").forEach((e) => {
      const n = e.firstChild;
      if (!n || n.nodeType !== 3) { return; }
      // chữ đang hiện khác chữ lần trước đặt → mã vừa đặt tiêu đề mới (gốc tiếng Nhật)
      if (e.dataset.kbShown === undefined || n.nodeValue !== e.dataset.kbShown) { e.dataset.kbOrig = n.nodeValue; }
      const shown = title(e.dataset.kbOrig, lang);
      e.dataset.kbShown = shown;
      if (n.nodeValue !== shown) { n.nodeValue = shown; }
    });
  }

  // ---- trò chơi
  function game(id, jp, lang) {
    lang = lang || cur();
    const g = B && B.games && B.games[id];
    if (lang === "vi") { return ""; }
    return (g && g[lang]) || jp;
  }
  function ask(lang) { lang = lang || cur(); return (B && B.ask && (B.ask[lang] || B.ask.ja)) || ["「%s」ください！"]; }
  function tag(k, fallback, lang) {
    lang = lang || cur();
    const t = B && B.tags && B.tags[lang];
    return (t && t[k]) || fallback;
  }
  function attr(lang) { return ATTR[lang || cur()] || ""; }
  function names() { return (B && B.names) || {}; }

  // ⚙ → Ngôn ngữ trong vườn (select#kb-glang): "Tự theo deck · đang: Tiếng Trung", Tiếng Nhật…
  function syncSelect() {
    const s = typeof document !== "undefined" ? document.getElementById("kb-glang") : null;
    if (!s || !B) { return; }
    const N = names(), p = pref();
    const want = ["auto"].concat(LANGS).map((v) => [v, v === "auto" ? (N.auto || "Tự theo deck") + " · đang: " + (N[auto()] || "") : (N[v] || v)]);
    if (s.options.length !== want.length) {
      s.textContent = "";
      want.forEach(([v]) => { const o = document.createElement("option"); o.value = v; s.appendChild(o); });
    }
    want.forEach(([v, t], i) => { if (s.options[i].textContent !== t) { s.options[i].textContent = t; } });
    if (s.value !== p) { s.value = p; }
    if (!s.dataset.kbWired) {
      s.dataset.kbWired = "1";
      s.addEventListener("change", () => setPref(s.value));
    }
  }

  return {
    syncSelect: syncSelect,
    setData: setData, pref: pref, setPref: setPref, cur: cur, auto: auto, forDeck: forDeck, onChange: onChange,
    line: line, fill: fill, item: item, label: label, title: title, applyTitles: applyTitles,
    game: game, ask: ask, tag: tag, attr: attr, names: names, LANGS: LANGS,
    _parts: parts
  };
})();
