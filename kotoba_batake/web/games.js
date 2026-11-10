/* ことば畑 – 5 mini-game ôn từ: Nghe tìm cây, Chợ sáng, Đuổi quạ, Lật cặp, Điền vào câu.
   Game chỉ để luyện thêm: KHÔNG ghi vào lịch ôn FSRS. Thắng được xu (Python
   giới hạn số xu mỗi ngày). garden.js gọi GardenGames.init(helpers).
   Từ 1.9: chơi theo loại note (từ vựng / chữ Hán / ngữ pháp, theo Cấu hình trường)
   và mỗi trò có chế độ riêng (vd. Lật cặp: Kanji ↔ Hán Việt). Bảng MODES phải khớp
   fields_core.GAME_MODES bên Python. */
var GardenGames = (function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  let H = null;                 // trợ giúp từ garden.js
  let isOpen = false;
  let game = null;              // game đang chơi
  let screen = "menu";          // menu | play | result
  let lastDef = null;
  let raf = 0, lastTs = 0, speed = 1;
  const parts = [];             // hạt hiệu ứng trên lớp phủ

  // ---------------------------------------------------------------------
  // Tiện ích chung
  // ---------------------------------------------------------------------
  const rnd = (n) => Math.floor(Math.random() * n);
  function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (tag === "button") { e.addEventListener("mousedown", (ev) => ev.preventDefault()); }
    if (cls) { e.className = cls; }
    if (text !== undefined && text !== null) { e.textContent = text; }
    return e;
  }
  function fxApi() { return typeof GardenFX !== "undefined" ? GardenFX : null; }
  function sfx(name) { const f = fxApi(); if (f && f.sound) { f.sound(name); } }
  function mood(m, ms, text) {
    const f = fxApi();
    if (!f) { return; }
    if (f.mood) { f.mood(m, ms); }
    if (text && f.say) { f.say(text, ms); }
  }
  function effectsOn() { const f = fxApi(); return !f || !f.effectsOn ? true : f.effectsOn(); }
  function C() { const f = fxApi(); return (f && f.lib && f.lib.C) || {}; }

  // Vẽ sprite chuỗi ký tự tại toạ độ px (CSS), mỗi điểm ảnh = s px.
  function sp(ctx, rows, x, y, s, pal, alpha) {
    pal = pal || C();
    if (alpha !== undefined) { ctx.globalAlpha = Math.max(0, Math.min(1, alpha)); }
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      for (let i = 0; i < row.length; i++) {
        const c = row.charAt(i);
        if (c !== ".") {
          ctx.fillStyle = pal[c] || c;
          ctx.fillRect(Math.round(x + i * s), Math.round(y + j * s), s, s);
        }
      }
    }
    ctx.globalAlpha = 1;
  }

  function fitCanvas(cv) {
    const r = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
    if (cv._w !== w || cv._h !== h || cv._dpr !== dpr) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      cv._w = w; cv._h = h; cv._dpr = dpr;
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.imageSmoothingEnabled = false;
    return { ctx: ctx, w: w, h: h };
  }

  // ---------------------------------------------------------------------
  // 1.10: trời & Mùa / Lễ hội của màn trò chơi theo khu vườn (giờ, thời tiết, chủ đề đang dùng).
  // Chợ sáng, Đuổi quạ tự vẽ trời / đất theo đây; các trò còn lại có lớp nền nhạt màu chủ đề + hạt bay.
  // ---------------------------------------------------------------------
  const SKY0 = { top: "#9fdcff", bottom: "#c4ecff", light: 1, clouds: 2, tod: "day", ground: "#5ed35e", grass: "#45bf4a",
    hills: "#7ed98a", rain: 0, snow: 0, sun: { x: 0.85, y: 0.85 }, moon: null, phase: "noon", weather: "sunny" };
  const PX = 3;            // 1 điểm ảnh pixel art = 3 px CSS (như vườn)
  function SEA() { return typeof GardenSeason !== "undefined" && GardenSeason && GardenSeason.active() ? GardenSeason : null; }
  function skyNow() {
    let st = null;
    try { st = typeof GardenSky !== "undefined" ? GardenSky.state() : null; } catch (e) { st = null; }
    if (!st) { return SKY0; }
    const sea = SEA();
    return sea ? sea.themeSky(st) : st;
  }
  function cmix(a, b, t) { return typeof GardenSky !== "undefined" ? GardenSky.mix(a, b, Math.max(0, Math.min(1, t))) : a; }
  function cshade(c, k) { return typeof GardenSky !== "undefined" ? GardenSky.shade(c, k) : c; }
  function snowC(c, st, k) { return st.snow || st.cover ? cmix(c, "#eaf1f7", k || 0.72) : c; }
  function hash01(n) {
    let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
    x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
    return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
  }
  // Trời từ y0 tới y1. Ban đêm sáng dịu hơn vườn để quạ và chữ vẫn rõ. (mx, my): chỗ mặt trời / trăng.
  function paintSky(ctx, w, y0, y1, st, now, mx, my) {
    const L = st.light, lift = L < 0.6 ? (0.6 - L) * 0.55 : 0;
    const top = cmix(st.top, "#6d7fb8", lift), bot = cmix(st.bottom, "#8d9ccc", lift);
    const bands = 6, H = y1 - y0;
    for (let b = 0; b < bands; b++) {
      const a = y0 + Math.floor(H * b / bands), z = y0 + Math.floor(H * (b + 1) / bands);
      ctx.fillStyle = cmix(top, bot, b / (bands - 1)); ctx.fillRect(0, a, w, z - a);
    }
    if (L < 0.55 && (st.clouds || 0) < 8) {            // sao
      const n = Math.floor(w / 28);
      for (let i = 0; i < n; i++) {
        if ((Math.floor(now / 650) + i) % 7 === 0) { continue; }
        ctx.fillStyle = i % 4 ? "#ffffff" : "#ffe9a8";
        ctx.fillRect(Math.floor(hash01(i * 7 + 1) * w), y0 + Math.floor(hash01(i * 13 + 5) * H * 0.8), 2, 2);
      }
    }
    const rainy = st.weather === "rain" || st.weather === "storm";
    if (L >= 0.45) {
      if (!rainy) {
        const col = st.phase === "dawn" || st.phase === "dusk" ? "#ff9f1c" : "#ffd23f";
        ctx.globalAlpha = 0.25; ctx.fillStyle = col; ctx.fillRect(mx - 6, my - 6, 42, 42); ctx.globalAlpha = 1;
        ctx.fillStyle = col; ctx.fillRect(mx, my, 30, 30); ctx.fillStyle = "#fff6c8"; ctx.fillRect(mx + 4, my + 4, 9, 6);
      }
    } else if (st.bigMoon && SEA()) {
      SEA().bigMoon(ctx, PX, mx / PX, my / PX, st);
    } else {
      ctx.fillStyle = "#fff6c8"; ctx.fillRect(mx + 4, my + 4, 22, 22);
      ctx.fillStyle = cmix(top, bot, 0.3); ctx.fillRect(mx + 13, my + 1, 16, 19);
    }
    const grey = st.weather === "storm" ? "#6b7088" : rainy ? "#9aa0b5" : st.weather === "cloudy" ? "#d4d8e2" : "#ffffff";
    const cc = cshade(grey, 0.55 + 0.45 * L), nc = Math.min(6, st.clouds || 0);
    for (let i = 0; i < nc; i++) {
      const cw = (14 + (i * 5) % 12) * PX, x = ((now / (90 + i * 13) + i * 211) % (w + cw + 60)) - cw - 30;
      const y = y0 + 6 + ((i * 37) % Math.max(10, Math.floor(H * 0.45)));
      ctx.fillStyle = cc; ctx.fillRect(Math.round(x), y + 2 * PX, cw, 4 * PX); ctx.fillRect(Math.round(x + 3 * PX), y, Math.round(cw * 0.55), 2 * PX);
    }
  }
  // Mưa / tuyết nhẹ theo thời tiết của vườn
  function paintWeather(ctx, w, y0, y1, st, now) {
    if (st.rain) {
      ctx.fillStyle = "rgba(200, 220, 255, 0.55)";
      const n = Math.round(w / 22 * Math.min(1.5, st.rain));
      for (let i = 0; i < n; i++) {
        const sp = 0.55 + hash01(i * 3) * 0.3, t = ((now / 1000) * sp + hash01(i * 7)) % 1;
        const x = hash01(i * 11) * (w + 40) - t * 40, y = y0 + t * (y1 - y0);
        ctx.fillRect(Math.round(x), Math.round(y), 2, 9);
      }
    }
    if (st.snow) {
      ctx.fillStyle = "#ffffff";
      const n = Math.round(w / 26 * Math.min(1.5, st.snow));
      for (let i = 0; i < n; i++) {
        const t = ((now / 7000) * (0.7 + hash01(i * 5) * 0.6) + hash01(i * 9)) % 1;
        const x = hash01(i * 17) * w + Math.sin(now / 900 + i) * 8, y = y0 + t * (y1 - y0);
        ctx.fillRect(Math.round(x), Math.round(y), 3, 3);
      }
    }
  }
  // Lớp nền theo chủ đề của menu và các trò không tự vẽ trời (Nghe tìm cây, Lật cặp, Điền vào câu)
  let seasonShown = false;
  function drawSeasonLayer(now) {
    const cv = $("kb-g-season"), stage = $("kb-g-stage");
    if (!cv || !stage) { return; }
    const sea = SEA(), show = !!sea && !(game && game.ownSky);
    if (!show) {
      if (seasonShown) { stage.classList.remove("kb-g-themed"); cv.hidden = true; seasonShown = false; }
      return;
    }
    if (!seasonShown) { stage.classList.add("kb-g-themed"); cv.hidden = false; seasonShown = true; }
    const f = fitCanvas(cv), ctx = f.ctx, v = sea.vis() || {}, tint = v.page || "#ffffff";
    const gr = ctx.createLinearGradient(0, 0, 0, f.h);
    gr.addColorStop(0, cmix("#e9f7ff", tint, 0.3)); gr.addColorStop(1, cmix("#e9f7ff", tint, 0.1));
    ctx.fillStyle = gr; ctx.fillRect(0, 0, f.w, f.h);
    const env = Object.assign({}, skyNow(), { light: 1, tod: "day", rain: 0, snow: 0 });
    sea.ambient(ctx, PX, 0, 0, now, 0, f.w / PX, f.h / PX, env);
  }

  function tileCanvas(p, s) {
    const cv = el("canvas", "kb-g-plant");
    cv.width = 18 * s; cv.height = 20 * s;
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    H.drawGrass(ctx, 0, 0, p.nid, s);
    H.drawSoil(ctx, 0, 0, p.nid, p.wilted, s);
    const art = H.art ? H.art(p) : { rows: H.sprites[p.stage], pal: p.wilted ? H.dry : H.pal };
    H.drawSprite(ctx, art.rows, 1, 4, s, art.pal);
    return cv;
  }

  // ---------------------------------------------------------------------
  // Kana, romaji
  // ---------------------------------------------------------------------
  const HAS_KANJI = /[㐀-鿿豈-﫿々]/;
  const KANA_ONLY = /^[ぁ-ゖゝゞー]+$/;
  function toHira(s) {
    return String(s || "").replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
      .replace(/ヽ/g, "ゝ").replace(/ヾ/g, "ゞ");
  }
  function normKana(s) {
    return toHira(s).replace(/[\s　・.。、,~～〜]/g, "");
  }
  function isKana(s) { return !!s && KANA_ONLY.test(s); }

  // Các cách đọc chấp nhận được (hiragana) của một từ.
  // Hỗ trợ cả kiểu deck kanji: "Kun: うご・く、うご・かす / On: ドウ", "-ばん", "た.べる".
  function readingsOf(p) {
    if (p._readings) { return p._readings; }
    let r = String(p.reading || "").replace(/[（(][^）)]*[）)]/g, "");
    r = r.replace(/(?:âm\s*)?(?:kun|on)(?:'?yomi)?\s*[:：]|[音訓](?:読み)?\s*[:：]/gi, " ");
    const out = [];
    const add = (x) => { const k = normKana(x); if (isKana(k) && out.indexOf(k) < 0) { out.push(k); } };
    r.split(/[、,/;；|]|\s+(?:or|hoặc)\s+|\s+/).forEach((x) => {
      const tok = x.trim().replace(/[?？!！]/g, "").replace(/^[-‐－~～〜]+|[-‐－~～〜]+$/g, "");
      if (!tok) { return; }
      const parts = tok.split(/[・.．]/).filter(Boolean);
      if (parts.length > 1 && !parts.every((q) => /^[\u30a0-\u30ff]+$/.test(q))) {
        add(parts.join("")); add(parts[0]);          // うご・く → うごく, うご (okurigana)
      } else {
        parts.forEach(add);                          // イチ・イツ → イチ, イツ
      }
    });
    if (!out.length) {
      const w = normKana(p.word);
      if (isKana(w)) { out.push(w); }
    }
    p._readings = out;
    return out;
  }

  // 1.25.3: cài đặt riêng máy qua GardenPrefs (config của add-on; localStorage mất khi tắt Anki)
  function pget(k) { try { return typeof GardenPrefs !== "undefined" ? GardenPrefs.get(k) : localStorage.getItem(k); } catch (e) { return null; } }
  function pset(k, v) { try { if (typeof GardenPrefs !== "undefined") { GardenPrefs.set(k, v); } else { localStorage.setItem(k, v); } } catch (e) { /* bỏ qua */ } }
  // Chế độ game Đuổi quạ: "vi" = biển nghĩa tiếng Việt, gõ từ Nhật (kana/romaji/kanji);
  // "jp" = biển chữ Nhật, gõ cách đọc.
  function crowMode() {
    return pget("kb-crow-mode") === "jp" ? "jp" : "vi";
  }
  function setCrowMode(m) { pset("kb-crow-mode", m); }
  // Tốc độ quạ: time = thời gian bay qua màn hình (nhân), gap = khoảng cách giữa các con, pts = hệ số điểm
  const CROW_SPEEDS = {
    vslow: { label: "Rất chậm", time: 2.0, gap: 1.6, pts: 0.6 },
    slow: { label: "Chậm", time: 1.45, gap: 1.3, pts: 0.8 },
    normal: { label: "Vừa", time: 1, gap: 1, pts: 1 },
    fast: { label: "Nhanh", time: 0.72, gap: 0.8, pts: 1.25 }
  };
  function crowSpeed() {
    const v = pget("kb-crow-speed"); return v && Object.prototype.hasOwnProperty.call(CROW_SPEEDS, v) ? v : "normal";
  }
  function setCrowSpeed(v) { pset("kb-crow-speed", v); }

  // Các cách viết chữ được chấp nhận: 「(～に)賛成(する)」→ 賛成, 賛成する, ～に賛成する…
  function wordForms(p) {
    if (p._forms) { return p._forms; }
    const w = String(p.word || "");
    const out = [];
    const add = (x) => { const k = normKana(String(x).replace(/[～〜~]/g, "")); if (k && out.indexOf(k) < 0) { out.push(k); } };
    add(w);
    add(w.replace(/[（(][^）)]*[）)]/g, ""));
    add(w.replace(/[（()）]/g, ""));
    const core = w.replace(/[（(][^）)]*[）)]/g, "");
    const tail = /[（(]する[）)]/.test(w) ? "する" : "";
    if (tail) { add(core + tail); }
    w.split(/[、,/・]/).forEach((x) => add(x.replace(/[（(][^）)]*[）)]/g, "")));
    p._forms = out;
    return out;
  }
  // 1.17: tiếng Anh — so khớp chữ gõ vào (chữ thường, nháy cong = thẳng, gạch nối = dấu cách)
  function enNorm(s) {
    return String(s || "").replace(/[’‘`]/g, "'").toLowerCase().replace(/[-‐–—_]+/g, " ")
      .replace(/[^\p{L}\p{N}' ]+/gu, " ").split(/\s+/).filter(Boolean).join(" ").replace(/^'+|'+$/g, "");
  }
  const POS_ABBR = new Set(["n", "v", "vt", "vi", "adj", "adv", "prep", "conj", "pron", "int", "interj", "det", "phr",
    "phrv", "noun", "verb", "adjective", "adverb", "num", "aux", "modal", "abbr", "sth", "sb", "sbsth", "idiom", "pl",
    "sing", "us", "uk", "informal", "formal", "c", "u", "cu"]);
  // Các cách viết chấp nhận được: 「to go (v)」 → to go, go · 「color, colour」 · 「(be) able to」 → able to, be able to
  function enAnswers(p) {
    if (p._en) { return p._en; }
    const out = [];
    const add = (x) => { const k = enNorm(x); if (k && out.indexOf(k) < 0) { out.push(k); } };
    String(p.word || "").replace(/\[[^\]]*\]|\/[^/]*\//g, " ").split(/[,;/|]/).forEach((part) => {
      const core = part.replace(/\([^)]*\)/g, " ");
      add(core);
      const inner = (part.match(/\(([^)]*)\)/g) || []).map((x) => x.slice(1, -1).toLowerCase().replace(/[^a-z]/g, ""));
      if (inner.length && !inner.some((x) => POS_ABBR.has(x))) { add(part.replace(/[()]/g, "")); }
      const m = core.match(/^\s*(to|a|an|the)\s+(.+)$/i);
      if (m) { add(m[2]); }
    });
    p._en = out;
    return out;
  }
  // 1.25.1: Đuổi quạ cho ngôn ngữ khác — chữ phải gõ ngắn (từ / câu trả lời ≤ 24 ký tự), không phải câu dài
  function typedText(p, mode) { return String((mode && mode.type === "spell_m" ? p.meaning : p.word) || ""); }
  function typeable(p, mode) {
    const t = typedText(p, mode).replace(/<[^>]*>/g, "").trim();
    return t.length >= 1 && t.length <= 24 && !!enNorm(t) && (mode.type !== "spell_m" || String(p.word || "").length <= 40);
  }
  function spellAnswers(text) {
    const out = [];
    const add = (x) => { const k = enNorm(x); if (k && out.indexOf(k) < 0) { out.push(k); } };
    String(text || "").replace(/<[^>]*>/g, " ").split(/[,;/|；、]/).forEach((part) => { add(part.replace(/\([^)]*\)/g, " ")); add(part); });
    return out;
  }
  // Nghĩa ngắn gọn cho biển quạ (lấy vế đầu trước dấu ;)
  function shortMeaning(p) {
    let m = String(p.meaning || "").split(/[;；]/)[0].trim();
    if (p.hanviet) { m = String(p.hanviet).toUpperCase() + " · " + m; }
    return m.length > 34 ? m.slice(0, 33) + "…" : m;
  }
  // Nghĩa hiển thị (kèm âm Hán Việt nếu là kanji có Hán Việt)
  function meaningText(p) { return (p.hanviet ? String(p.hanviet).toUpperCase() + " – " : "") + (p.meaning || ""); }

  // ---------------------------------------------------------------------
  // 1.9: loại note và chế độ của từng trò · 1.17: thêm nhóm theo ngôn ngữ
  //   nhóm = loại note tiếng Nhật (vocab / kanji / grammar) hoặc từ vựng tiếng Anh (en) / ngôn ngữ khác (xx)
  // ---------------------------------------------------------------------
  const KINDS = { vocab: "Từ vựng", kanji: "Chữ Hán", grammar: "Ngữ pháp" };
  const GROUPS = { vocab: "Từ vựng", kanji: "Chữ Hán", grammar: "Ngữ pháp", en: "Tiếng Anh", xx: "Ngôn ngữ khác" };
  const GROUP_IDS = ["vocab", "kanji", "grammar", "en", "xx"];
  const GROUP_KIND = { vocab: "vocab", kanji: "kanji", grammar: "grammar", en: "vocab", xx: "vocab" };
  const GROUP_LANG = { en: "en", xx: "other" };      // khoá games_lang (Python)
  const UNIT = { vocab: "từ", kanji: "chữ", grammar: "mẫu", en: "từ", xx: "từ" };
  // Tên "mặt" của note theo nhóm (dùng trong lý do thiếu trường)
  const FACE_NAME = {
    vocab: { word: "chữ", meaning: "nghĩa", reading: "cách đọc", audio: "audio của từ",
      exaudio: "audio câu ví dụ", cloze: "câu ví dụ chứa đúng từ đó" },
    kanji: { word: "kanji", meaning: "nghĩa", reading: "âm On/Kun", hanviet: "Hán Việt", audio: "audio",
      exaudio: "audio ví dụ", cloze: "ví dụ chứa đúng chữ đó" },
    grammar: { word: "cấu trúc", meaning: "nghĩa", reading: "cách đọc", audio: "audio",
      exaudio: "audio câu ví dụ", cloze: "câu ví dụ chứa đúng mẫu đó" },
    en: { word: "từ", meaning: "nghĩa", reading: "phiên âm", audio: "audio (hoặc giọng đọc tiếng Anh của máy)",
      exaudio: "audio câu ví dụ", cloze: "câu ví dụ chứa từ đó" },
    xx: { word: "từ", meaning: "nghĩa", reading: "phiên âm", audio: "audio của từ",
      exaudio: "audio câu ví dụ", cloze: "câu ví dụ chứa đúng từ đó" }
  };
  // Mặt → vai trò (trường) trong Cấu hình trường
  const FACE_ROLE = { word: ["word"], meaning: ["meaning"], reading: ["reading", "kun"], hanviet: ["hanviet"],
    audio: ["audio"], exaudio: ["ex_audio"], cloze: ["example"] };
  // alt = các cách đủ điều kiện (mỗi cách là danh sách mặt phải có). Mục đầu = mặc định.
  const MODES = {
    listen: {
      vocab: [{ id: "word", label: "Nghe → chọn chữ", ans: "word", alt: [["audio"]] },
        { id: "meaning", label: "Nghe → chọn nghĩa", ans: "meaning", alt: [["audio", "meaning"]] }],
      kanji: [{ id: "word", label: "Nghe → chọn kanji", ans: "word", alt: [["audio"]] },
        { id: "hanviet", label: "Nghe → chọn Hán Việt", ans: "hanviet", alt: [["audio", "hanviet"]] }],
      grammar: [{ id: "word", label: "Nghe câu ví dụ → chọn mẫu", ans: "word", alt: [["exaudio"]],
        desc: "Nghe câu ví dụ rồi chọn đúng mẫu ngữ pháp được dùng trong câu." }],
      en: [{ id: "word", label: "Nghe → chọn từ", ans: "word", alt: [["audio"]],
        desc: "Nghe đọc từ tiếng Anh rồi chọn đúng chữ trên biển cây." },
      { id: "meaning", label: "Nghe → chọn nghĩa", ans: "meaning", alt: [["audio", "meaning"]] }],
      xx: [{ id: "word", label: "Nghe → chọn từ", ans: "word", alt: [["audio"]] },
        { id: "meaning", label: "Nghe → chọn nghĩa", ans: "meaning", alt: [["audio", "meaning"]] }]
    },
    market: {
      vocab: [{ id: "mix", label: "Trộn", alt: [["meaning", "word"], ["word", "meaning"]] },
        { id: "meaning-word", label: "Nghĩa → Từ", alt: [["meaning", "word"]] },
        { id: "word-meaning", label: "Từ → Nghĩa", alt: [["word", "meaning"]] },
        { id: "reading-word", label: "Cách đọc → Từ", alt: [["reading", "word"]] }],
      kanji: [{ id: "hanviet-word", label: "Hán Việt → Kanji", alt: [["hanviet", "word"]] },
        { id: "meaning-word", label: "Nghĩa → Kanji", alt: [["meaning", "word"]] },
        { id: "word-hanviet", label: "Kanji → Hán Việt", alt: [["word", "hanviet"]] },
        { id: "word-reading", label: "Kanji → On/Kun", alt: [["word", "reading"]] },
        { id: "mix", label: "Trộn", alt: [["hanviet", "word"], ["meaning", "word"], ["word", "hanviet"], ["word", "reading"]] }],
      grammar: [{ id: "mix", label: "Trộn", alt: [["meaning", "word"], ["word", "meaning"]] },
        { id: "meaning-word", label: "Nghĩa → Mẫu", alt: [["meaning", "word"]] },
        { id: "word-meaning", label: "Mẫu → Nghĩa", alt: [["word", "meaning"]] }],
      en: [{ id: "mix", label: "Trộn", alt: [["meaning", "word"], ["word", "meaning"]] },
        { id: "meaning-word", label: "Nghĩa → Từ", alt: [["meaning", "word"]] },
        { id: "word-meaning", label: "Từ → Nghĩa", alt: [["word", "meaning"]] },
        { id: "reading-word", label: "Phiên âm → Từ", alt: [["reading", "word"]] }],
      xx: [{ id: "mix", label: "Trộn", alt: [["meaning", "word"], ["word", "meaning"]] },
        { id: "meaning-word", label: "Nghĩa → Từ", alt: [["meaning", "word"]] },
        { id: "word-meaning", label: "Từ → Nghĩa", alt: [["word", "meaning"]] }]
    },
    crow: {
      vocab: [{ id: "vi", label: "Nghĩa → gõ từ Nhật", show: "meaning", type: "both", alt: [["meaning"]] },
        { id: "jp", label: "Chữ → gõ cách đọc", show: "word", type: "reading", alt: [["reading"]],
          desc: "Quạ mang chữ Nhật bay tới trộm hạt. Gõ cách đọc (romaji hoặc kana) để đuổi." }],
      kanji: [{ id: "word", label: "Kanji → gõ âm On/Kun", show: "word", type: "reading", alt: [["reading"]],
        desc: "Quạ mang chữ Hán bay tới trộm hạt. Gõ âm On hoặc Kun (romaji hoặc kana) để đuổi." },
      { id: "hanviet", label: "Hán Việt → gõ âm / chữ", show: "hanviet", type: "both", alt: [["hanviet"]],
        desc: "Quạ mang âm Hán Việt bay tới. Gõ âm On / Kun (romaji, kana) hoặc chính chữ Hán (IME) để đuổi." }],
      grammar: [],
      en: [{ id: "spell", label: "Nghĩa → gõ từ tiếng Anh", show: "meaning", type: "spell", alt: [["meaning"]],
        desc: "Quạ mang nghĩa tiếng Việt bay tới trộm hạt. Gõ đúng chính tả từ tiếng Anh để đuổi." }],
      // 1.25.1: ngôn ngữ khác / deck kiến thức — gõ đúng chữ (chỉ thẻ có chữ cần gõ ngắn, ≤ 24 ký tự)
      xx: [{ id: "spell", label: "Nghĩa → gõ từ", show: "meaning", type: "spell", alt: [["meaning"]],
        desc: "Quạ mang nghĩa bay tới trộm hạt. Gõ đúng từ (mặt trước của thẻ) để đuổi. Không tính hoa thường, dấu câu." },
      { id: "answer", label: "Từ → gõ nghĩa", show: "word", type: "spell_m", alt: [["meaning"]],
        desc: "Quạ mang mặt trước của thẻ bay tới. Gõ đúng mặt sau (câu trả lời ngắn) để đuổi. Không tính hoa thường, dấu câu." }]
    },
    memory: {
      vocab: [{ id: "mix", label: "Trộn", alt: [["meaning"], ["reading"]] },
        { id: "meaning", label: "Từ ↔ Nghĩa", alt: [["meaning"]] },
        { id: "reading", label: "Từ ↔ Cách đọc", alt: [["reading"]] }],
      kanji: [{ id: "hanviet", label: "Kanji ↔ Hán Việt", alt: [["hanviet"]] },
        { id: "meaning", label: "Kanji ↔ Nghĩa", alt: [["meaning"]] },
        { id: "reading", label: "Kanji ↔ On/Kun", alt: [["reading"]] },
        { id: "mix", label: "Trộn", alt: [["hanviet"], ["meaning"], ["reading"]] }],
      grammar: [{ id: "meaning", label: "Mẫu ↔ Nghĩa", alt: [["meaning"]] }],
      en: [{ id: "mix", label: "Trộn", alt: [["meaning"], ["reading"]] },
        { id: "meaning", label: "Từ ↔ Nghĩa", alt: [["meaning"]] },
        { id: "reading", label: "Từ ↔ Phiên âm", alt: [["reading"]] }],
      xx: [{ id: "mix", label: "Trộn", alt: [["meaning"], ["reading"]] },
        { id: "meaning", label: "Từ ↔ Nghĩa", alt: [["meaning"]] },
        { id: "reading", label: "Từ ↔ Phiên âm", alt: [["reading"]] }]
    },
    cloze: {
      vocab: [{ id: "word", label: "Điền từ vào câu ví dụ", alt: [["cloze"]] }],
      kanji: [{ id: "word", label: "Điền chữ vào ví dụ", alt: [["cloze"]],
        desc: "Từ / câu ví dụ của bạn bị che một chữ Hán. Chọn chữ đúng để điền." }],
      grammar: [{ id: "word", label: "Điền mẫu vào câu ví dụ", alt: [["cloze"]],
        desc: "Câu ví dụ bị che mẫu ngữ pháp. Chọn mẫu đúng để điền, rồi nghe cả câu." }],
      en: [{ id: "word", label: "Điền từ vào câu ví dụ", alt: [["cloze"]],
        desc: "Câu ví dụ tiếng Anh bị che một từ (nhận cả dạng went, studying, cities…). Chọn từ đúng để điền." }],
      xx: [{ id: "word", label: "Điền từ vào câu ví dụ", alt: [["cloze"]] }]
    }
  };
  const KIND_DESC = {
    listen: { kanji: "Nghe phát âm rồi chọn đúng chữ Hán." },
    market: { kanji: "Khách hỏi mua theo Hán Việt, nghĩa hoặc chữ Hán, bán đúng trong 75 giây.",
      grammar: "Khách hỏi theo nghĩa hoặc theo mẫu ngữ pháp, bán đúng trong 75 giây." },
    memory: { en: "Lật thẻ tìm cặp từ ↔ nghĩa hoặc phiên âm.",
      xx: "Lật thẻ tìm cặp từ ↔ nghĩa hoặc phiên âm." }
  };

  // cách đọc viết sau chữ: tiếng Nhật trong ngoặc （…）, phiên âm tiếng Anh viết liền (đã có / /)
  function readSuffix(p, r) {
    r = r === undefined ? p.reading : r;
    if (!r) { return ""; }
    return latin(p) ? " " + r : "（" + r + "）";
  }
  function kindOf(p) { return p && KINDS[p.kind] ? p.kind : (p && p.kind === "other" ? "other" : "vocab"); }
  function latin(p) { return !!(p && p.lang && p.lang !== "ja"); }
  // Nhóm trò chơi của một cây: loại note tiếng Nhật, hoặc en / xx cho từ vựng tiếng Anh / ngôn ngữ khác
  function groupOf(p) {
    const k = kindOf(p);
    if (!latin(p)) { return k; }
    return k === "vocab" ? (p.lang === "en" ? "en" : "xx") : "other";
  }
  function has(p, f) {
    if (f === "word") { return !!p.word && p.word !== "?"; }
    if (f === "meaning") { return !!p.meaning; }
    if (f === "reading") { return !!p.reading && (latin(p) || readingsOf(p).length > 0); }
    if (f === "hanviet") { return !!p.hanviet; }
    if (f === "audio") { return !!p.audio; }
    if (f === "exaudio") { return !!p.ex_audio; }
    if (f === "cloze") { return !!(p.cloze && p.cloze.q); }
    return false;
  }
  function okAlt(p, alt) { return alt.every((f) => has(p, f)); }
  function fits(p, mode) { return !!mode && mode.alt.some((a) => okAlt(p, a)); }
  // Chữ hiện ra cho một mặt của note
  function faceText(p, f, kind) {
    if (f === "word") { return p.word; }
    if (f === "meaning") { return (kind || kindOf(p)) === "vocab" ? meaningText(p) : (p.meaning || ""); }
    if (f === "reading") { return p.reading || ""; }
    if (f === "hanviet") { return p.hanviet ? String(p.hanviet).toUpperCase() : ""; }
    return "";
  }
  function playable(p) { return !!p && (kindOf(p) === "grammar" ? !!p.ex_audio : !!p.audio); }
  function kindsIn() {
    const d = H.data() || {}, c = {};
    ((d && d.plants) || []).forEach((p) => { const k = groupOf(p); if (GROUPS[k] && has(p, "word")) { c[k] = (c[k] || 0) + 1; } });
    return c;
  }
  function curKind() {
    const c = kindsIn();
    let k = null;
    k = pget("kb-game-kind");
    if (k && c[k]) { return k; }
    let best = "vocab", n = 0;
    GROUP_IDS.forEach((id) => { if ((c[id] || 0) > n) { n = c[id]; best = id; } });
    return best;
  }
  function setKind(k) { pset("kb-game-kind", k); }
  function modeList(game, group) { return (MODES[game] && MODES[game][group]) || []; }
  function modeOf(game, group) {
    const list = modeList(game, group);
    if (!list.length) { return null; }
    const d = H.data() || {};
    let id = GROUP_LANG[group] ? ((d.game_modes_lang || {})[GROUP_LANG[group]] || {})[game]
      : ((d.game_modes || {})[game] || {})[group];
    if (!id && game === "crow" && group === "vocab") { id = crowMode(); }   // chế độ cũ lưu trong máy (≤ 1.8)
    return list.find((m) => m.id === id) || list[0];
  }
  function setMode(game, group, id) {
    const d = H.data();
    if (d) {
      if (GROUP_LANG[group]) {
        const lang = GROUP_LANG[group];
        d.game_modes_lang = d.game_modes_lang || {};
        d.game_modes_lang[lang] = Object.assign({}, d.game_modes_lang[lang] || {});
        d.game_modes_lang[lang][game] = id;
      } else {
        d.game_modes = d.game_modes || {};
        d.game_modes[game] = Object.assign({}, d.game_modes[game] || {});
        d.game_modes[game][group] = id;
      }
    }
    if (game === "crow" && group === "vocab") { setCrowMode(id); }
    H.send("fields:game:" + game + ":" + group + ":" + id);
    showMenu();
  }
  // Trò nào chơi được với một cấu hình trường (cho bảng Cấu hình trường). roles = {vai trò: tên trường}
  function supportFor(kind, roles, lang) {
    const hasRole = (f) => (FACE_ROLE[f] || []).some((r) => roles && roles[r]);
    const group = !lang || lang === "ja" ? kind : (kind === "vocab" ? (lang === "en" ? "en" : "xx") : "other");
    return DEFS.map((def) => {
      const list = GROUPS[group] ? modeList(def.id, group) : [];
      const out = { id: def.id, name: def.vi, jp: def.jp, ok: false, modes: [], why: "" };
      if (!list.length) {
        out.why = !GROUPS[group] ? "loại Khác không dùng cho trò chơi"
          : group === "xx" ? "chưa hỗ trợ ngôn ngữ này" : "không dùng cho " + GROUPS[group].toLowerCase();
        return out;
      }
      out.modes = list.filter((m) => m.alt.some((a) => a.every((f) => hasRole(f) || (f === "audio" && group === "en" && ((H.data() || {}).tts || {}).en)))).map((m) => m.label);
      out.ok = out.modes.length > 0;
      if (!out.ok) { out.why = "cần " + list[0].alt[0].filter((f) => !hasRole(f)).map((f) => FACE_NAME[group][f]).join(" + "); }
      return out;
    });
  }
  function wrapText(ctx, text, maxW) {
    const words = text.split(/\s+/);
    const lines = [""];
    words.forEach((w) => {
      const cur = lines[lines.length - 1];
      const tryLine = cur ? cur + " " + w : w;
      if (ctx.measureText(tryLine).width <= maxW || !cur) { lines[lines.length - 1] = tryLine; }
      else { lines.push(w); }
    });
    if (lines.length > 2) { lines[1] = lines.slice(1).join(" "); lines.length = 2; }
    if (ctx.measureText(lines[lines.length - 1]).width > maxW * 1.15) {
      let l = lines[lines.length - 1];
      while (l.length > 3 && ctx.measureText(l + "…").width > maxW * 1.15) { l = l.slice(0, -1); }
      lines[lines.length - 1] = l + "…";
    }
    return lines;
  }

  const ROMA = (function () {
    const t = {};
    const V = ["a", "i", "u", "e", "o"];
    const rows = {
      "": "あいうえお", k: "かきくけこ", s: "さしすせそ", t: "たちつてと", n: "なにぬねの",
      h: "はひふへほ", m: "まみむめも", y: ["や", "い", "ゆ", "いぇ", "よ"], r: "らりるれろ",
      w: ["わ", "うぃ", "う", "うぇ", "を"], g: "がぎぐげご", z: "ざじずぜぞ", d: "だぢづでど",
      b: "ばびぶべぼ", p: "ぱぴぷぺぽ", f: ["ふぁ", "ふぃ", "ふ", "ふぇ", "ふぉ"],
      v: ["ゔぁ", "ゔぃ", "ゔ", "ゔぇ", "ゔぉ"], j: ["じゃ", "じ", "じゅ", "じぇ", "じょ"],
      l: "ぁぃぅぇぉ", x: "ぁぃぅぇぉ", q: ["くぁ", "くぃ", "く", "くぇ", "くぉ"], c: ["か", "し", "く", "せ", "こ"]
    };
    Object.keys(rows).forEach((c) => {
      for (let i = 0; i < 5; i++) { t[c + V[i]] = rows[c][i]; }
    });
    const yo = { k: "き", s: "し", t: "ち", c: "ち", n: "に", h: "ひ", m: "み", r: "り", g: "ぎ",
      z: "じ", j: "じ", d: "ぢ", b: "び", p: "ぴ", f: "ふ", v: "ゔ", q: "く" };
    const small = { a: "ゃ", u: "ゅ", o: "ょ", i: "ぃ", e: "ぇ" };
    Object.keys(yo).forEach((c) => { Object.keys(small).forEach((v) => { t[c + "y" + v] = yo[c] + small[v]; }); });
    Object.assign(t, {
      shi: "し", chi: "ち", tsu: "つ", si: "し", ti: "ち", tu: "つ", hu: "ふ", fu: "ふ", ji: "じ", zi: "じ",
      di: "ぢ", du: "づ", sha: "しゃ", shu: "しゅ", she: "しぇ", sho: "しょ",
      cha: "ちゃ", chu: "ちゅ", che: "ちぇ", cho: "ちょ", tsa: "つぁ", tsi: "つぃ", tse: "つぇ", tso: "つぉ",
      thi: "てぃ", thu: "てゅ", dhi: "でぃ", dhu: "でゅ", twu: "とぅ", dwu: "どぅ",
      xtu: "っ", ltu: "っ", xtsu: "っ", ltsu: "っ", xya: "ゃ", xyu: "ゅ", xyo: "ょ",
      lya: "ゃ", lyu: "ゅ", lyo: "ょ", xwa: "ゎ", lwa: "ゎ", "-": "ー", nn: "ん", "n'": "ん", xn: "ん"
    });
    return t;
  })();

  // Đổi romaji sang hiragana (giữ nguyên kana gõ bằng IME). "nn" + nguyên âm
  // có 2 cách hiểu (IME chuẩn: kinnenn → きんえん; kiểu konnichiha → こんにちは),
  // nên trả về mọi cách hiểu để so với đáp án.
  function kanaVariants(raw) {
    const s = String(raw || "").toLowerCase();
    const done = [];
    const stack = [{ i: 0, out: "" }];
    while (stack.length && done.length < 16) {
      const st = stack.pop();
      let i = st.i, out = st.out;
      while (i < s.length) {
        const c = s[i], n = s[i + 1];
        if (c === "n") {
          if (n === undefined) { out += "n"; i++; continue; }
          if (n === "'") { out += "ん"; i += 2; continue; }
          if (n === "n") {
            const after = s[i + 2];
            if (after !== undefined && "aiueoy".indexOf(after) >= 0) {
              stack.push({ i: i + 2, out: out + "ん" });
              out += "ん"; i += 1; continue;
            }
            out += "ん"; i += 2; continue;
          }
          if ("aiueoy".indexOf(n) < 0) { out += "ん"; i++; continue; }
        }
        if (c === n && /[bcdfghjklmpqrstvwxz]/.test(c)) { out += "っ"; i++; continue; }
        if (c === "t" && n === "c" && s[i + 2] === "h") { out += "っ"; i++; continue; }
        let hit = false;
        for (let L = 4; L >= 1; L--) {
          const chunk = s.substr(i, L);
          if (chunk.length === L && Object.prototype.hasOwnProperty.call(ROMA, chunk)) {
            out += ROMA[chunk]; i += L; hit = true; break;
          }
        }
        if (!hit) { out += s[i]; i++; }
      }
      done.push(out);
    }
    return done;
  }
  function toKana(raw) { return kanaVariants(raw)[0]; }
  // final = đã bấm Enter: chữ "n" lẻ ở cuối được hiểu là ん.
  function typedKana(raw, final) {
    return kanaVariants(raw).map((v) => normKana(final ? v.replace(/n$/, "ん") : v)).filter((v) => v);
  }

  // ---------------------------------------------------------------------
  // Chọn từ
  // ---------------------------------------------------------------------
  function weight(p) {
    if (p.wilted) { return 4; }
    if (p.thirsty) { return 3; }
    return [1, 2.5, 2, 1.5, 1][p.stage] || 1;
  }

  function dedupe(list) {
    const seen = new Set();
    return list.filter((p) => { const k = p.word; if (seen.has(k)) { return false; } seen.add(k); return true; });
  }

  // group = nhóm trò chơi (curKind); pool.kind = loại note (en / xx là từ vựng), pool.group = nhóm
  function poolFor(def, group, mode) {
    group = group || curKind();
    mode = mode === undefined ? modeOf(def.id, group) : mode;
    const d = H.data();
    const base = dedupe(((d && d.plants) || []).filter((p) => groupOf(p) === group && has(p, "word")));
    const kind = GROUP_KIND[group] || "vocab";
    if (!mode) { return { items: [], targets: [], learnedOnly: false, kind: kind, group: group, mode: null, base: base }; }
    let items = base;
    if (def.id === "market" || def.id === "memory" || def.id === "crow") { items = base.filter((p) => fits(p, mode)); }
    if (def.id === "crow" && group === "xx") { items = items.filter((p) => typeable(p, mode)); }   // 1.25.1
    else if (def.id === "listen") { items = base.filter((p) => has(p, mode.ans)); }
    let targets = def.id === "listen" || def.id === "cloze" ? items.filter((p) => fits(p, mode)) : items.slice();
    const learned = targets.filter((p) => p.stage >= 1);
    const learnedOnly = learned.length >= Math.max(def.min, 6);
    if (learnedOnly) { targets = learned; }
    return { items: items, targets: targets, learnedOnly: learnedOnly, kind: kind, group: group, mode: mode, base: base };
  }
  function playableOk(def, pool) { return !!pool.mode && pool.targets.length >= def.min && pool.items.length >= def.min; }
  // Vì sao trò này chưa chơi được với loại note / chế độ đang chọn
  function lackText(def, pool) {
    const group = pool.group || pool.kind, mode = pool.mode, unit = UNIT[group] || "từ";
    if (!mode) {
      return def.id === "crow" && group === "grammar" ? "Đuổi quạ không dùng cho ngữ pháp."
        : group === "xx" ? "Trò này chưa hỗ trợ ngôn ngữ này."
          : "Trò này không dùng cho loại note này.";
    }
    if (pool.base.length < def.min) { return "Cần ít nhất " + def.min + " " + unit + " (" + (GROUPS[group] || "") + ") trong deck này."; }
    let best = mode.alt[0], bestN = -1;
    mode.alt.forEach((a) => { const n = pool.base.filter((p) => okAlt(p, a)).length; if (n > bestN) { bestN = n; best = a; } });
    const miss = best.filter((f) => pool.base.filter((p) => has(p, f)).length < def.min);
    const names = (miss.length ? miss : best).map((f) => FACE_NAME[group][f]);
    return "Cần ít nhất " + def.min + " " + unit + " có " + names.join(" + ") + " (hiện có " + Math.max(0, bestN) + "). Chọn trường ở Cấu hình trường.";
  }
  function descFor(def, group, mode) {
    if (mode && mode.desc) { return mode.desc; }
    const kind = group;
    const F = FACE_NAME[group] || FACE_NAME.vocab;
    if (def.id === "memory" && mode && mode.id !== "mix") {
      return "Lật thẻ tìm cặp " + F.word + " ↔ " + F[mode.alt[0][0]] + ".";
    }
    if (def.id === "memory" && kind === "kanji") { return "Lật thẻ tìm cặp kanji ↔ Hán Việt, nghĩa hoặc âm On/Kun."; }
    if (def.id === "market" && mode && mode.id !== "mix") {
      const a = mode.alt[0];
      return "Khách hỏi theo " + F[a[0]] + ", bạn đưa đúng " + F[a[1]] + ", bán đúng trong 75 giây.";
    }
    return (KIND_DESC[def.id] || {})[kind] || def.desc;
  }

  function picker(targets) {
    let bag = [];
    return function (avoid) {
      if (!bag.length) { bag = targets.slice(); }
      let idx = 0;
      for (let tries = 0; tries < 6; tries++) {
        let total = 0;
        bag.forEach((p) => { total += weight(p); });
        let r = Math.random() * total;
        for (idx = 0; idx < bag.length - 1; idx++) { r -= weight(bag[idx]); if (r <= 0) { break; } }
        if (!avoid || !avoid(bag[idx]) || bag.length === 1) { break; }
      }
      return bag.splice(idx, 1)[0];
    };
  }

  const norm = (s) => String(s || "").trim().toLowerCase();

  // Đáp án đúng + các đáp án nhiễu, giá trị hiển thị (mặt key) không trùng nhau.
  // askKey (1.25.3, audit BUG-04): mặt của câu hỏi — bỏ các từ có cùng mặt câu hỏi với đáp án (vd. hỏi "to lớn" mà có cả
  // big lẫn large; nghe はし mà có cả 橋 lẫn 箸), nếu không thì có hai đáp án đúng mà chỉ một cái được chấm đúng
  function choices(target, items, n, key, kind, askKey) {
    const used = new Set([norm(faceText(target, key, kind)), norm(target.word)]);
    const askT = askKey ? norm(faceText(target, askKey, kind)) : "";
    const out = [target];
    shuffle(items.slice()).forEach((p) => {
      if (out.length >= n || p.nid === target.nid) { return; }
      const k = norm(faceText(p, key, kind));
      if (!k || used.has(k) || used.has(norm(p.word))) { return; }
      if (askT && norm(faceText(p, askKey, kind)) === askT) { return; }
      used.add(k); used.add(norm(p.word));
      out.push(p);
    });
    return shuffle(out);
  }

  // ---------------------------------------------------------------------
  // Hạt hiệu ứng trên lớp phủ của màn game
  // ---------------------------------------------------------------------
  function addPart(o) {
    if (o.kind !== "text" && !effectsOn()) { return; }
    o.t = 0; o.vx = o.vx || 0; o.vy = o.vy || 0; o.g = o.g || 0; o.delay = o.delay || 0;
    parts.push(o);
    if (parts.length > 260) { parts.splice(0, parts.length - 260); }
  }
  function burst(x, y, n, kind, speed) {
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.5;
      const v = (speed || 120) * (0.6 + Math.random() * 0.6);
      addPart({ kind: kind, x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, g: 260, life: 0.8 + Math.random() * 0.3 });
    }
  }
  function floatText(x, y, text, color) {
    addPart({ kind: "text", x: x, y: y, vy: -55, life: 1.0, text: text, color: color || "#ffd23f" });
  }
  function confetti(w, n) {
    const cols = ["#ff4f6d", "#ffd23f", "#3d8bff", "#6be08a", "#ff9f1c", "#c77dff"];
    for (let i = 0; i < n; i++) {
      addPart({ kind: "conf", x: Math.random() * w, y: -10, vx: (Math.random() - 0.5) * 60, vy: 40 + Math.random() * 80,
        g: 120, life: 2 + Math.random(), color: cols[i % cols.length], delay: Math.random() * 0.4 });
    }
  }
  // Thêm cách đọc / nghĩa dưới một đáp án (chỉ phần chưa hiện trên đáp án).
  // shown = "word" nếu đáp án đang hiện chữ, "meaning" nếu đang hiện nghĩa.
  function revealUnder(btn, p, shown) {
    if (!btn || btn.querySelector(".kb-reveal")) { return; }
    const box = el("span", "kb-reveal");
    const vocab = kindOf(p) === "vocab";
    if (shown !== "word") { box.appendChild(el("span", "kb-reveal-w", p.word)); }
    if (p.reading && p.reading !== p.word && shown !== "reading") { box.appendChild(el("span", "kb-reveal-r", p.reading)); }
    if (p.hanviet && shown !== "hanviet" && !(vocab && shown === "meaning")) {
      box.appendChild(el("span", "kb-reveal-hv", String(p.hanviet).toUpperCase()));
    }
    if (shown !== "meaning" && p.meaning) { box.appendChild(el("span", "kb-reveal-m", p.meaning)); }
    if (p.usage) { box.appendChild(el("span", "kb-reveal-u", p.usage)); }
    if (playable(p)) { box.appendChild(el("span", "kb-reveal-a", "♪ bấm để nghe")); }
    btn.appendChild(box);
    btn.classList.add("kb-revealed");
  }
  // Ngữ pháp: phát audio câu ví dụ; còn lại: audio của từ
  function playWord(p) {
    if (!p) { return; }
    if (kindOf(p) === "grammar") { if (p.ex_audio) { H.send("game:exaudio:" + p.nid); } }
    else if (p.audio) { H.send("game:audio:" + p.nid); }
  }
  function nextButton(label, onClick) {
    const b = el("button", "kb-btn kb-next", label);
    b.type = "button";
    b.appendChild(el("span", "kb-key", "Space"));
    b.addEventListener("click", onClick);
    return b;
  }

  function centerOf(node) {
    const st = $("kb-g-stage").getBoundingClientRect();
    const r = node.getBoundingClientRect();
    return { x: r.left - st.left + r.width / 2, y: r.top - st.top + r.height / 2 };
  }

  function drawFx(dt) {
    const cv = $("kb-g-fx");
    if (!cv) { return; }
    const f = fitCanvas(cv), ctx = f.ctx;
    ctx.clearRect(0, 0, f.w, f.h);
    const L = (fxApi() && fxApi().lib) || {};
    for (let i = parts.length - 1; i >= 0; i--) {
      const q = parts[i];
      q.t += dt;
      const t = q.t - q.delay;
      if (t < 0) { continue; }
      if (t > q.life) { parts.splice(i, 1); continue; }
      const x = q.x + q.vx * t, y = q.y + q.vy * t + 0.5 * q.g * t * t;
      const k = t / q.life, a = k > 0.7 ? (1 - k) / 0.3 : 1;
      if (q.kind === "sparkle" && L.STAR) {
        sp(ctx, (Math.floor(t * 8) % 2) ? L.STAR : L.TWINKLE, x - 7, y - 7, 3, null, a);
      } else if (q.kind === "heart" && L.HEART) {
        sp(ctx, L.HEART, x - 10, y - 9, 3, null, a);
      } else if (q.kind === "coin" && L.COIN) {
        sp(ctx, L.COIN, x - 9, y - 9, 3, null, a);
      } else if (q.kind === "conf") {
        ctx.globalAlpha = a; ctx.fillStyle = q.color;
        ctx.fillRect(Math.round(x), Math.round(y), (Math.floor(t * 10) % 2) ? 6 : 3, 6);
        ctx.globalAlpha = 1;
      } else if (q.kind === "feather") {
        ctx.globalAlpha = a; ctx.fillStyle = "#2b2b44";
        ctx.fillRect(Math.round(x), Math.round(y), (Math.floor(t * 9) % 2) ? 3 : 6, (Math.floor(t * 9) % 2) ? 6 : 3);
        ctx.globalAlpha = 1;
      } else if (q.kind === "drop") {
        ctx.fillStyle = "#3d8bff"; ctx.fillRect(Math.round(x), Math.round(y), 3, 6);
        ctx.fillStyle = "#8fd3ff"; ctx.fillRect(Math.round(x), Math.round(y) - 3, 3, 3);
      } else if (q.kind === "text") {
        ctx.globalAlpha = a;
        ctx.font = "bold 20px DotGothic16, 'Noto Sans CJK JP', monospace";
        ctx.textAlign = "center";
        ctx.lineWidth = 4; ctx.strokeStyle = "#1b1b2f"; ctx.strokeText(q.text, x, y);
        ctx.fillStyle = q.color; ctx.fillText(q.text, x, y);
        ctx.textAlign = "start"; ctx.globalAlpha = 1;
      }
    }
  }

  // ---------------------------------------------------------------------
  // Khung: mở/đóng, HUD, menu, kết quả
  // ---------------------------------------------------------------------
  const DEFS = [
    { id: "listen", jp: "聞いて探そう", vi: "Nghe tìm cây", min: 4,
      desc: "Nghe phát âm rồi chọn đúng chữ trên biển cây." },
    { id: "market", jp: "朝市", vi: "Chợ sáng", min: 4,
      desc: "Khách hỏi mua theo nghĩa hoặc theo chữ, bán đúng trong 75 giây." },
    { id: "crow", jp: "カラス追い", vi: "Đuổi quạ", min: 3,
      desc: "Quạ mang nghĩa tiếng Việt bay tới trộm hạt. Gõ từ tiếng Nhật (romaji, kana hoặc kanji) để đuổi." },
    { id: "memory", jp: "神経衰弱", vi: "Lật cặp", min: 4,
      desc: "Lật thẻ tìm cặp: chữ ↔ nghĩa hoặc cách đọc." },
    { id: "cloze", jp: "穴埋め", vi: "Điền vào câu", min: 4,
      desc: "Câu ví dụ của bạn bị che một từ. Chọn từ đúng để điền, rồi nghe cả câu." }
  ];
  const BUILDERS = {};

  function setHud(items) {
    const hud = $("kb-g-hud");
    hud.textContent = "";
    items.forEach((it) => {
      if (!it) { return; }
      const chip = el("div", "kb-g-chip" + (it[2] ? " " + it[2] : ""));
      chip.appendChild(el("span", "kb-g-chip-l", it[0]));
      chip.appendChild(el("b", null, String(it[1])));
      hud.appendChild(chip);
    });
  }

  function clearStage() {
    if (game) { game.alive = false; (game.timers || []).forEach(clearTimeout); if (game.stop) { game.stop(); } }
    game = null;
    parts.length = 0;
    const st = $("kb-g-stage");
    st.textContent = "";
    st.classList.remove("kb-g-themed");
    seasonShown = false;
    const sb = el("canvas", "kb-g-season");
    sb.id = "kb-g-season";
    sb.hidden = true;
    st.appendChild(sb);
    const fx = el("canvas", "kb-g-fx");
    fx.id = "kb-g-fx";
    st.appendChild(fx);
    setHud([]);
    return st;
  }

  function open() {
    if (!H) { return; }
    if (typeof GardenFields !== "undefined") { GardenFields.close(); }
    isOpen = true;
    $("kb-game").hidden = false;
    H.send("game:open");
    showMenu();
    if (!raf) { lastTs = 0; raf = requestAnimationFrame(loop); }
  }

  function close() {
    if (!isOpen) { return; }
    clearStage();
    isOpen = false;
    screen = "menu";
    $("kb-game").hidden = true;
    H.send("game:stop");
  }

  function loop(ts) {
    if (!isOpen) { raf = 0; return; }
    const dt = (lastTs ? Math.min(0.1, (ts - lastTs) / 1000) : 0.016) * speed;
    lastTs = ts;
    if (!document.hidden) {
      if (game && game.tick && screen === "play") { game.tick(dt); }
      drawSeasonLayer(performance.now());
      drawFx(dt);
    }
    raf = requestAnimationFrame(loop);
  }

  function drawIcon(cv, id) {
    const ctx = cv.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#bfe9ff"; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#5ed35e"; ctx.fillRect(0, cv.height - 18, cv.width, 18);
    const L = (fxApi() && fxApi().lib) || {};
    if (id === "listen") {
      H.drawSoil(ctx, 4, 2, 7, false, 3);
      H.drawSprite(ctx, H.sprites[3], 5, 6, 3, H.pal);
      sp(ctx, NOTE, 6, 8, 3);
    } else if (id === "market") {
      sp(ctx, CRATE, 10, 28, 3, CRATE_PAL);
      if (L.COIN) { sp(ctx, L.COIN, 50, 10, 3); }
    } else if (id === "crow") {
      sp(ctx, CROW[0], 18, 10, 3, CROW_PAL);
    } else if (id === "memory") {
      sp(ctx, CARD, 8, 8, 3, CARD_PAL); sp(ctx, CARD, 36, 14, 3, CARD_PAL);
    } else {
      ctx.fillStyle = "#1b1b2f"; ctx.fillRect(6, 10, 72, 36);
      ctx.fillStyle = "#ffffff"; ctx.fillRect(9, 13, 66, 30);
      ctx.fillStyle = "#1b1b2f"; ctx.fillRect(14, 46, 9, 6); ctx.fillRect(14, 22, 14, 4); ctx.fillRect(54, 22, 14, 4); ctx.fillRect(14, 32, 44, 4);
      ctx.fillStyle = "#ffd23f"; ctx.fillRect(31, 18, 20, 12);
      ctx.fillStyle = "#1b1b2f"; ctx.fillRect(39, 21, 4, 2); ctx.fillRect(41, 23, 2, 2); ctx.fillRect(40, 27, 2, 2);
    }
  }

  // Bảng chọn trò chơi — 1.17 trở lại kiểu 1.15 (thẻ to, 3 cột, chữ mô tả đầy đủ); các lựa chọn là drop-down nằm dưới thẻ.
  function selectBox(cls, title, opts, value, onChange) {
    const sel = el("select", "kb-gsel " + cls);
    sel.title = title;
    opts.forEach((o) => {
      const op = el("option", null, o[1]);
      op.value = o[0];
      sel.appendChild(op);
    });
    sel.value = value;
    sel.addEventListener("change", () => onChange(sel.value));
    sel.addEventListener("keydown", (e) => { if (e.key !== "Escape") { e.stopPropagation(); } });
    return sel;
  }

  function showMenu() {
    screen = "menu";
    const st = clearStage();
    $("kb-g-title").textContent = "ミニゲーム · Trò chơi ôn từ";
    const d = H.data() || {};
    const wallet = d.wallet || {};
    const best = wallet.best || {};
    const kinds = kindsIn(), kind = curKind();
    const box = el("div", "kb-gmenu");
    // hàng trên: chọn nhóm note để ôn (drop-down) · một nút Cấu hình trường (đỏ khi có loại note chưa cấu hình)
    const head = el("div", "kb-gmenu-kinds");
    const present = GROUP_IDS.filter((k) => kinds[k]);
    if (present.length) {
      head.appendChild(el("span", "kb-gmenu-kl", "Ôn:"));
      head.appendChild(selectBox("kb-gmenu-kind", "Loại note dùng cho trò chơi",
        present.map((k) => [k, GROUPS[k] + " · " + kinds[k] + " " + (UNIT[k] || "từ")]), kind,
        (v) => { setKind(v); showMenu(); }));
    } else {
      head.appendChild(el("span", "kb-gmenu-kl", "Deck này chưa có note dùng được cho trò chơi."));
    }
    const pend = (d.note_types || []).filter((t) => !t.configured);
    const cfgBtn = GardenIcons.fill(el("button", "kb-btn kb-btn-small kb-gmenu-cfg" + (pend.length ? " is-warn" : "")),
      pend.length ? "[i:warn] Cấu hình trường" : "[i:gear] Cấu hình trường");
    cfgBtn.type = "button";
    cfgBtn.title = pend.length
      ? (pend.length === 1 ? "Loại note “" + pend[0].name + "”" : pend.length + " loại note") + " chưa cấu hình trường: trò chơi đang tự đoán."
      : "Chọn trường Từ / Nghĩa / Cách đọc… cho từng loại note";
    cfgBtn.addEventListener("click", () => { if (H.openFields) { H.openFields(pend.length ? pend[0].id : undefined); } });
    head.appendChild(cfgBtn);
    box.appendChild(head);
    const grid = el("div", "kb-gmenu-grid");
    DEFS.forEach((def, i) => {
      const pool = poolFor(def, kind);
      const ok = playableOk(def, pool);
      const cell = el("div", "kb-gcell");
      const b = el("button", "kb-gcard");
      b.type = "button";
      b.disabled = !ok;
      b.setAttribute("data-game", def.id);
      const icon = el("canvas", "kb-gcard-icon");
      icon.width = 84; icon.height = 72;
      drawIcon(icon, def.id);
      b.appendChild(icon);
      const txt = el("div", "kb-gcard-text");
      txt.appendChild(el("div", "kb-gcard-jp", def.jp));
      txt.appendChild(el("div", "kb-gcard-vi", (i + 1) + ". " + def.vi));
      txt.appendChild(el("div", "kb-gcard-desc", ok ? descFor(def, kind, pool.mode) : lackText(def, pool)));
      txt.appendChild(el("div", "kb-gcard-best", best[def.id] ? "Kỷ lục: " + best[def.id] : "Chưa có kỷ lục"));
      b.appendChild(txt);
      b.addEventListener("click", () => start(def));
      cell.appendChild(b);
      // lựa chọn của trò: kiểu chơi (khi có từ 2 kiểu) + tốc độ quạ — drop-down cho gọn
      const opts = el("div", "kb-gopts");
      const list = modeList(def.id, kind);
      if (list.length > 1) {
        const items = list.map((m) => {
          const n = pool.base.filter((p) => fits(p, m)).length;
          return [m.id, m.label + (n < def.min ? " (chưa đủ " + (UNIT[kind] || "từ") + ")" : "")];
        });
        const ms = selectBox("kb-gmode-sel", "Kiểu chơi", items, pool.mode ? pool.mode.id : list[0].id,
          (v) => setMode(def.id, kind, v));
        ms.setAttribute("data-game", def.id);
        opts.appendChild(ms);
      }
      if (def.id === "crow" && list.length) {
        const sp = selectBox("kb-gspeed-sel", "Tốc độ quạ — chậm thì ít điểm hơn (Rất chậm ×0.6, Chậm ×0.8, Vừa ×1, Nhanh ×1.25)",
          Object.keys(CROW_SPEEDS).map((k) => [k, "Bay " + CROW_SPEEDS[k].label.toLowerCase()]),
          crowSpeed(), (v) => { setCrowSpeed(v); showMenu(); });
        opts.appendChild(sp);
      }
      if (opts.children.length) { cell.appendChild(opts); }
      grid.appendChild(cell);
    });
    box.appendChild(grid);
    const all = poolFor(DEFS[3], kind, modeList("memory", kind)[0] || null);
    const today = new Date();
    const day = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    const earned = wallet.game_day === day ? (wallet.game_coins || 0) : 0;
    const cap = (d.fx && d.fx.game_daily_coins) || 40;
    box.appendChild(el("div", "kb-gmenu-note",
      "Dùng " + (kinds[kind] || 0) + " " + (UNIT[kind] || "từ") + " (" + (GROUPS[kind] || "") + ") của deck “" + ((d.deck && d.deck.name) || "") + "”" +
      (all.learnedOnly ? ", ưu tiên cây đã học đang khát / héo." : ", có cả note mới.") +
      " Xu từ game hôm nay: " + earned + "/" + cap + ". Không tính vào lịch ôn."));
    st.insertBefore(box, st.firstChild);
    setHud([["Phím", "1–" + DEFS.length + " chọn trò"]]);
  }

  function start(def) {
    const pool = poolFor(def);
    if (!playableOk(def, pool)) { return; }
    const st = clearStage();
    lastDef = def;
    screen = "play";
    $("kb-g-title").textContent = def.jp + " · " + def.vi + (modeList(def.id, pool.group).length > 1 ? " · " + pool.mode.label : "");
    game = BUILDERS[def.id](st, pool, def);
    game.alive = true;
    game.timers = game.timers || [];
    mood("happy", 1200, "がんばって！");
  }

  function later(g, fn, ms) {
    const id = setTimeout(() => { if (g.alive) { fn(); } }, ms);
    g.timers.push(id);
    return id;
  }

  function uniqMissed(list) {
    const seen = new Set();
    return list.filter((p) => { if (seen.has(p.nid)) { return false; } seen.add(p.nid); return true; });
  }

  // r = {score, win, title, line, coins, missed}
  function finish(g, r) {
    if (!g.alive) { return; }
    g.alive = false;
    (g.timers || []).forEach(clearTimeout);
    if (g.stop) { g.stop(); }
    game = null;
    screen = "result";
    const def = lastDef;
    const st = $("kb-g-stage");
    Array.prototype.slice.call(st.children).forEach((c) => { if (c.id !== "kb-g-fx") { c.remove(); } });
    const box = el("div", "kb-gres");
    box.appendChild(el("div", "kb-gres-title" + (r.win ? "" : " kb-gres-lose"), r.title));
    box.appendChild(el("div", "kb-gres-score", r.score + " điểm"));
    box.appendChild(el("div", "kb-gres-line", r.line));
    const save = el("div", "kb-gres-save", "Đang lưu…");
    save.id = "kb-gres-save";
    box.appendChild(save);
    const missed = uniqMissed(r.missed || []).slice(0, 12);
    if (missed.length) {
      const m = el("div", "kb-gres-missed");
      m.appendChild(el("div", "kb-gres-h", "Từ cần chú ý (" + missed.length + ")"));
      const ul = el("ul");
      missed.forEach((p) => {
        const li = el("li");
        if (playable(p)) {
          const pb = el("button", "kb-gres-play", "♪");
          pb.type = "button";
          pb.title = "Nghe";
          pb.addEventListener("click", () => playWord(p));
          li.appendChild(pb);
        }
        li.appendChild(el("b", null, p.word));
        if (p.reading) { li.appendChild(el("span", "kb-gres-r", readSuffix(p))); }
        li.appendChild(el("span", "kb-gres-m", p.meaning || ""));
        ul.appendChild(li);
      });
      m.appendChild(ul);
      box.appendChild(m);
    } else {
      box.appendChild(el("div", "kb-gres-perfect", "Không sai từ nào. 完璧！"));
    }
    const acts = el("div", "kb-gres-actions");
    const again = el("button", "kb-btn kb-gres-again", "Chơi lại");
    again.type = "button";
    again.addEventListener("click", () => start(def));
    const menu = el("button", "kb-btn kb-btn-small", "Chọn game khác");
    menu.type = "button";
    menu.addEventListener("click", showMenu);
    const home = el("button", "kb-btn kb-btn-small", "Về vườn");
    home.type = "button";
    home.addEventListener("click", close);
    acts.appendChild(again); acts.appendChild(menu); acts.appendChild(home);
    box.appendChild(acts);
    st.insertBefore(box, st.firstChild);
    setHud([["Điểm", r.score]]);
    if (r.win) {
      confetti(st.clientWidth, 50);
      sfx("harvest");
      mood("star", 2200, "やったね！");
    } else {
      sfx("done");
      mood("happy", 1800, "おつかれさま！");
    }
    const coins = Math.max(0, Math.min(15, Math.round(r.coins || 0)));
    H.send("game:reward:" + def.id + ":" + Math.max(0, Math.round(r.score)) + ":" + coins + ":" + (r.win ? 1 : 0));
    again.focus();
  }

  function gameSaved(res) {
    if (!res) { return; }
    if (res.wallet) { H.setWallet(res.wallet); }
    const save = $("kb-gres-save");
    if (!save) { return; }
    let t = res.gained > 0 ? "+" + res.gained + " xu" : "Không có xu";
    if (res.capped) { t += " (đã chạm giới hạn xu từ game hôm nay)"; }
    t += " · " + (res.new_best ? "Kỷ lục mới!" : "Kỷ lục: " + res.best);
    save.textContent = t;
    save.className = "kb-gres-save" + (res.new_best ? " kb-gres-best" : "");
    if (res.gained > 0) { sfx("coin"); }
    const q = res.quests;
    if (q && ((q.done && q.done.length) || q.chest)) {
      const box = el("div", "kb-gres-quest");
      (q.done || []).forEach((txt) => box.appendChild(el("div", null, "✓ Xong nhiệm vụ: " + txt + " (+" + ((q.view && q.view.reward) || 20) + " xu)")));
      if (q.chest) { box.appendChild(el("div", "kb-gres-chest", "Mở rương quà: " + (q.chest.name || "xu") + " +" + q.chest.coins + " xu!")); }
      save.parentNode.insertBefore(box, save.nextSibling);
    }
    if (q && H.questResult) { H.questResult(q); }
  }

  function onKey(e) {
    if (!isOpen) { return; }
    if (e.key === "Escape") {
      e.preventDefault();
      if (screen === "menu") { close(); } else { showMenu(); }
      return;
    }
    if (screen === "menu") {
      const tag = (e.target && e.target.tagName) || "";
      if (tag === "SELECT" || tag === "INPUT") { return; }
      const n = Number(e.key);
      if (n >= 1 && n <= DEFS.length) {
        e.preventDefault();
        start(DEFS[n - 1]);
      }
      return;
    }
    if (screen === "play" && game && game.key) { game.key(e); }
  }

  function stageSize() { const st = $("kb-g-stage"); return { w: st.clientWidth, h: st.clientHeight }; }

  // ---------------------------------------------------------------------
  // Sprite riêng cho game
  // ---------------------------------------------------------------------
  const NOTE = ["...kk", "...kwk", "...k.k", "...k..", ".kkk..", "kwwk..", ".kk..."];
  const CRATE = [
    "..kkkkkkkkkkkkkk..",
    ".krrkrrkyykrrkrrk.",
    "kkrrrkyyyykrrrkkkk",
    "kbbbbbbbbbbbbbbbbk",
    "kbBBBBBBBBBBBBBBbk",
    "kbbbbbbbbbbbbbbbbk",
    "kbBBBBBBBBBBBBBBbk",
    "kbbbbbbbbbbbbbbbbk",
    "kkkkkkkkkkkkkkkkkk"
  ];
  const CRATE_PAL = { k: "#1b1b2f", r: "#ff4f6d", y: "#ffd23f", b: "#c57a45", B: "#a0603a" };
  const CARD = [
    "kkkkkkkk",
    "kGgGgGgk",
    "kgGgGgGk",
    "kGgwwgGk",
    "kgGwwGgk",
    "kGgGgGgk",
    "kgGgGgGk",
    "kkkkkkkk"
  ];
  const CARD_PAL = { k: "#1b1b2f", G: "#2e8b3a", g: "#3ccb5e", w: "#ffffff" };
  const CROW = [
    [
      "................",
      "......kk........",
      ".....kbbk.......",
      "....kbbbk.......",
      "..kkkbbbkkkk....",
      ".kbwbbbbbbbbkk..",
      "okbbbbbbbbbbbbk.",
      ".kkbbbbbbbbbkkkk",
      "...kkbbbbbkk....",
      ".....kkkkk......",
      "......k..k......",
      "................"
    ],
    [
      "................",
      "................",
      "................",
      "................",
      "..kkkkkkkkkk....",
      ".kbwbbbbbbbbkk..",
      "okbbbbbbbbbbbbk.",
      ".kkbbbbbbbbbkkkk",
      "...kbbbbbbbk....",
      "....kbbbbk......",
      ".....kbbk.......",
      "......kk........"
    ]
  ];
  const CROW_PAL = { k: "#11111d", b: "#2b2b44", w: "#ffffff", o: "#ffb03b" };
  const PERSON = [
    "....kkkkkk....",
    "..kkhhhhhhkk..",
    ".khhhhhhhhhhk.",
    ".khhhhhhhhhhk.",
    ".khsssssssshk.",
    "khsskssssksshk",
    "khsskssssksshk",
    "khspssmmsspshk",
    ".kssssssssssk.",
    "..kkkkkkkkkk..",
    "...kcccccck...",
    "..kcccccccck..",
    ".ksccccccccsk.",
    ".ksccccccccsk.",
    "..kcccccccck..",
    "...kcccccck...",
    "...kllkkllk...",
    "...kkk..kkk..."
  ];
  const PERSON_WALK = ["...kllkk.llk..", "...kkk...kkk.."];
  const CAT_TOP = ["..kk......kk..", ".khhk....khhk.", ".khhhkkkkhhhk."];
  const VARIANTS = [
    { h: "#6b3b1f", s: "#ffd9b3", c: "#ff7fa0", l: "#3d5a99", p: "#ff9fb5", m: "#c2410c" },
    { h: "#1b1b2f", s: "#f6c99e", c: "#3d8bff", l: "#4a4a66", p: "#ffb3a0", m: "#c2410c" },
    { h: "#c8c8d8", s: "#ffe0c4", c: "#6be08a", l: "#7a5a3a", p: "#ffb3a0", m: "#c2410c" },
    { h: "#f5b971", s: "#ffe9c9", c: "#c77dff", l: "#3d5a99", p: "#ff9fb5", m: "#c2410c", cat: true },
    { h: "#d94f2b", s: "#ffd9b3", c: "#ffd23f", l: "#2e8b3a", p: "#ff9fb5", m: "#c2410c" }
  ];
  const APPLE = [".kk.", "krrk", "krwk", ".kk."];

  // =====================================================================
  // GAME 1: Nghe tìm cây
  // =====================================================================
  BUILDERS.listen = function (st, pool) {
    const ROUNDS = 10, TIME = 12;
    const g = { timers: [], alive: true };
    const kind = pool.kind, ans = pool.mode.ans;
    const next = picker(pool.targets);
    let round = 0, score = 0, combo = 0, right = 0, t = TIME, locked = true, target = null, opts = [];
    let waitNext = false;
    const missed = [];

    const wrap = el("div", "kb-gl");
    const top = el("div", "kb-gl-top");
    const play = el("button", "kb-btn kb-gl-play", "♪ Nghe lại");
    play.type = "button";
    play.appendChild(el("span", "kb-key", "R / Space"));
    play.addEventListener("click", () => sayIt());
    top.appendChild(play);
    top.appendChild(el("div", "kb-gl-q", kind === "grammar" ? "Câu vừa nghe dùng mẫu ngữ pháp nào? (phím 1–6)"
      : ans === "meaning" ? "Vừa nghe từ nào? Chọn nghĩa đúng (phím 1–6)."
        : ans === "hanviet" ? "Vừa nghe chữ nào? Chọn âm Hán Việt đúng (phím 1–6)."
          : "Vừa nghe " + (kind === "kanji" ? "chữ" : "từ") + " nào? Chọn biển cây đúng (phím 1–6)."));
    const grid = el("div", "kb-gl-grid");
    const info = el("div", "kb-gl-info");
    const bar = el("div", "kb-timebar");
    const fill = el("div", "kb-timebar-fill");
    bar.appendChild(fill);
    wrap.appendChild(top); wrap.appendChild(bar); wrap.appendChild(grid); wrap.appendChild(info);
    st.insertBefore(wrap, st.firstChild);

    function hud() {
      setHud([["Câu", Math.min(round, ROUNDS) + "/" + ROUNDS], ["Đúng", right], ["Điểm", score],
        combo >= 2 ? ["Combo", "×" + combo, "kb-g-hot"] : null]);
    }
    function sayIt() { if (target) { H.send((kind === "grammar" ? "game:exaudio:" : "game:audio:") + target.nid); } }

    function nextRound() {
      if (!g.alive) { return; }
      round++;
      if (round > ROUNDS) {
        finish(g, {
          score: score, win: right >= 7, title: right >= 7 ? "よくできました！" : "もう少し！",
          line: right + "/" + ROUNDS + " câu đúng", coins: right + (right === ROUNDS ? 3 : 0), missed: missed
        });
        return;
      }
      target = next((p) => p === target);
      opts = choices(target, pool.items, Math.min(6, pool.items.length), ans, kind, kind === "grammar" ? null : "reading");
      grid.textContent = "";
      info.textContent = "";
      info.className = "kb-gl-info";
      waitNext = false;
      opts.forEach((p, i) => {
        const b = el("button", "kb-gl-plot");
        b.type = "button";
        b.appendChild(el("span", "kb-gl-num", String(i + 1)));
        b.appendChild(tileCanvas(p, 3));
        b.appendChild(el("span", "kb-gl-sign" + (ans === "meaning" || kind === "grammar" ? " kb-gl-sign-text" : ""), faceText(p, ans, kind)));
        b.addEventListener("click", () => { if (waitNext) { playWord(opts[i]); } else { choose(i); } });
        grid.appendChild(b);
      });
      t = TIME; locked = false;
      hud();
      later(g, sayIt, 250);
    }

    // Sau khi trả lời: hiện cách đọc + nghĩa dưới MỌI biển cây, chờ bấm Tiếp.
    function reveal(ok) {
      Array.prototype.forEach.call(grid.children, (b, i) => revealUnder(b, opts[i], ans));
      info.textContent = "";
      const line = el("span", "kb-gl-info-line");
      line.appendChild(el("span", "kb-gl-verdict", ok ? "Đúng rồi! " : kind === "grammar" ? "Mẫu trong câu: " : "Từ vừa nghe: "));
      line.appendChild(el("b", null, target.word));
      if (target.reading) { line.appendChild(el("span", null, readSuffix(target))); }
      line.appendChild(el("span", null, " " + (target.meaning || "")));
      info.appendChild(line);
      info.appendChild(nextButton(round >= ROUNDS ? "Xem kết quả ▶" : "Câu tiếp ▶", goNext));
      info.className = "kb-gl-info kb-gl-info-show" + (ok ? " kb-gl-info-ok" : "");
      waitNext = true;
    }
    function goNext() { if (waitNext && g.alive) { waitNext = false; nextRound(); } }

    function choose(i) {
      if (locked || !g.alive) { return; }
      locked = true;
      const btns = grid.children;
      const ok = i >= 0 && opts[i].nid === target.nid;
      const goodIdx = opts.indexOf(target);
      const c = centerOf(btns[goodIdx]);
      if (ok) {
        right++; combo++;
        const gain = Math.round((100 + Math.round((t / TIME) * 100)) * (1 + Math.min(combo - 1, 5) * 0.1));
        score += gain;
        btns[i].classList.add("kb-good");
        for (let k = 0; k < 7; k++) { addPart({ kind: "drop", x: c.x - 18 + k * 6, y: c.y - 70, vy: 120, g: 300, life: 0.45, delay: k * 0.04 }); }
        burst(c.x, c.y - 20, 8, "sparkle", 140);
        floatText(c.x, c.y - 50, "+" + gain);
        sfx(combo >= 3 ? "easy" : "good");
        if (combo === 5 || combo === 10) { mood("star", 1200, "Combo ×" + combo + "！"); } else { mood("happy", 800); }
        hud();
        reveal(true);
      } else {
        combo = 0;
        missed.push(target);
        if (i >= 0) { btns[i].classList.add("kb-bad"); }
        btns[goodIdx].classList.add("kb-good");
        reveal(false);
        sfx("again");
        mood("sad", 1200, i >= 0 ? "ドンマイ！" : "時間切れ！");
        hud();
      }
    }

    g.tick = function (dt) {
      if (locked) { return; }
      t -= dt;
      fill.style.width = Math.max(0, (t / TIME) * 100) + "%";
      fill.className = "kb-timebar-fill" + (t < TIME * 0.3 ? " kb-low" : "");
      if (t <= 0) { choose(-1); }
    };
    g.key = function (e) {
      const n = Number(e.key);
      if (waitNext) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); goNext(); }
        else if (n >= 1 && n <= opts.length) { e.preventDefault(); playWord(opts[n - 1]); }
        else if (e.key === "r" || e.key === "R") { e.preventDefault(); sayIt(); }
        return;
      }
      if (n >= 1 && n <= opts.length) { e.preventDefault(); choose(n - 1); }
      else if (e.key === "r" || e.key === "R" || e.key === " ") { e.preventDefault(); sayIt(); }
    };
    g.debug = () => ({ round: round, answer: opts.indexOf(target), locked: locked, score: score, right: right, waitNext: waitNext,
      kind: kind, mode: pool.mode.id, options: opts.map((p) => faceText(p, ans, kind)), word: target && target.word });
    g.stop = () => H.send("game:stop");
    hud();
    later(g, nextRound, 300);
    return g;
  };

  // =====================================================================
  // GAME 2: Chợ sáng
  // =====================================================================
  BUILDERS.market = function (st, pool) {
    const TIME = 75, PATIENCE = 10;
    const g = { timers: [], alive: true, ownSky: true };
    const kind = pool.kind, mode = pool.mode;
    const next = picker(pool.targets);
    let timeLeft = TIME, score = 0, combo = 0, served = 0, total = 0, cust = null, opts = [], over = false;
    let waitNext = false;
    const missed = [];

    const wrap = el("div", "kb-gm");
    const cv = el("canvas", "kb-gm-canvas");
    const bubble = el("div", "kb-gm-bubble");
    bubble.hidden = true;
    const strip = el("div", "kb-gm-strip");
    const crates = el("div", "kb-gm-crates");
    wrap.appendChild(cv); wrap.appendChild(bubble); wrap.appendChild(strip); wrap.appendChild(crates);
    st.insertBefore(wrap, st.firstChild);

    const ASK_MEANING = ["Cho tôi “%s” nhé!", "Ở đây có “%s” không?", "Bán cho tôi “%s” với!"];
    const ASK_WORD = ["「%s」ください！", "「%s」はありますか？", "「%s」をひとつ！"];

    function hud() {
      setHud([["Thời gian", Math.ceil(timeLeft) + "s", timeLeft < 15 ? "kb-g-warn" : ""], ["Đã bán", served],
        ["Điểm", score], combo >= 2 ? ["Combo", "×" + combo, "kb-g-hot"] : null]);
    }

    function newCustomer() {
      if (over || !g.alive) { return; }
      const target = next((p) => cust && p === cust.target);
      // chọn kiểu hỏi hợp với note này (chế độ Trộn: 60% hỏi theo nghĩa / Hán Việt như bản cũ)
      const pairs = mode.alt.filter((a) => okAlt(target, a));
      let pair = pairs[rnd(pairs.length)];
      if (mode.id === "mix" && pairs.length > 1) {
        const first = pairs[0];
        pair = Math.random() < 0.6 ? first : pairs[1 + rnd(pairs.length - 1)];
      }
      const ask = pair[0], key = pair[1];
      const pickFrom = pool.items.filter((p) => has(p, key));
      opts = choices(target, pickFrom, Math.min(4, pickFrom.length), key, kind, ask);
      const size = stageSize();
      cust = { target: target, ask: ask, key: key, x: size.w + 60, state: "in", patience: PATIENCE,
        v: VARIANTS[rnd(VARIANTS.length)], mood: "" };
      total++;
      waitNext = false;
      crates.textContent = "";
      strip.textContent = "";
      strip.className = "kb-gm-strip";
      const list = opts;
      list.forEach((p, i) => {
        const b = el("button", "kb-gm-crate" + (key !== "word" ? " kb-gm-crate-text" : ""));
        b.type = "button";
        b.disabled = true;
        b.appendChild(el("span", "kb-gm-num", String(i + 1)));
        b.appendChild(el("span", "kb-gm-label", faceText(p, key, kind)));
        b.addEventListener("click", () => { if (waitNext) { playWord(list[i]); } else { choose(i); } });
        crates.appendChild(b);
      });
      const jpAsk = ask === "word" || ask === "reading";
      const text = (jpAsk ? ASK_WORD : ASK_MEANING)[rnd(3)].replace("%s", faceText(target, ask, kind));
      bubble.textContent = text;
      bubble.hidden = true;
    }

    // Chỉ cho đúng vị khách đó ra về (khách mới tới thì không bị ảnh hưởng).
    function leave(who, m) {
      if (!cust || cust !== who) { return; }
      cust.state = "out";
      cust.mood = m;
      bubble.hidden = true;
    }

    // Hiện cách đọc + nghĩa dưới mọi thùng hàng, chờ bấm "Khách tiếp".
    function reveal(ok, target) {
      Array.prototype.forEach.call(crates.children, (b, i) => {
        revealUnder(b, opts[i], cust.key);
        b.disabled = false;
      });
      strip.textContent = "";
      const line = el("span", "kb-gm-strip-line");
      line.appendChild(el("span", "kb-gl-verdict", ok ? "Bán đúng! " : "Khách cần: "));
      line.appendChild(el("b", null, target.word));
      if (target.reading) { line.appendChild(el("span", null, readSuffix(target))); }
      line.appendChild(el("span", null, " = " + target.meaning));
      strip.appendChild(line);
      strip.appendChild(nextButton("Khách tiếp ▶", goNext));
      strip.className = "kb-gm-strip kb-gm-strip-show" + (ok ? " kb-gm-strip-ok" : "");
      waitNext = true;
    }
    function goNext() {
      if (!waitNext || over || !g.alive) { return; }
      waitNext = false;
      bubble.hidden = true;
      cust = null;
      if (timeLeft <= 0) { end(); } else { newCustomer(); }
    }

    function choose(i) {
      if (!cust || cust.state !== "wait" || over) { return; }
      const btns = crates.children;
      const goodIdx = opts.indexOf(cust.target);
      const ok = i >= 0 && opts[i].nid === cust.target.nid;
      const size = stageSize();
      const head = { x: cust.x, y: cust.headY || size.h * 0.4 };
      if (ok) {
        served++; combo++;
        const gain = Math.round((100 + Math.round((cust.patience / PATIENCE) * 100)) * (1 + Math.min(combo - 1, 5) * 0.1));
        score += gain;
        btns[i].classList.add("kb-good");
        for (let k = 0; k < 3; k++) { addPart({ kind: "heart", x: head.x - 20 + k * 20, y: head.y, vy: -60, life: 1, delay: k * 0.12 }); }
        addPart({ kind: "coin", x: size.w * 0.3, y: size.h * 0.45, vy: -70, life: 0.9 });
        floatText(size.w * 0.3 + 30, size.h * 0.45, "+" + gain);
        sfx("coin");
        mood(combo >= 5 ? "star" : "happy", 800, combo === 5 || combo === 10 ? "Combo ×" + combo + "！" : null);
        cust.mood = "happy";
        cust.state = "thanks";
        bubble.textContent = ["ありがとう！", "Cảm ơn nha!", "またね！"][rnd(3)];
        const me = cust;
        later(g, () => leave(me, "happy"), 900);
      } else {
        combo = 0;
        missed.push(cust.target);
        if (i >= 0) { btns[i].classList.add("kb-bad"); }
        btns[goodIdx].classList.add("kb-good");
        sfx("again");
        mood("sad", 1100, i >= 0 ? "あれ？" : "遅すぎた…");
        cust.mood = "sad";
        cust.state = "thanks";
        bubble.textContent = i >= 0 ? "えっ、違うよ…" : "もういいです…";
        const me = cust;
        later(g, () => leave(me, "sad"), 1500);
      }
      reveal(ok, cust.target);
      hud();
    }

    function end() {
      over = true;
      const win = served >= 6 && served >= total * 0.6;
      finish(g, { score: score, win: win, title: win ? "完売！ Bán đắt quá!" : "閉店！ Hết giờ rồi",
        line: "Bán đúng " + served + "/" + Math.max(total, served) + " khách", coins: Math.min(12, served), missed: missed });
    }

    function draw(now) {
      const f = fitCanvas(cv), ctx = f.ctx, w = f.w, h = f.h;
      const ground = Math.round(h * 0.62);
      // 1.10: trời, đất theo giờ / thời tiết / Mùa & Lễ hội của vườn
      const env = skyNow(), sea = SEA(), lk = 0.55 + 0.45 * env.light;
      paintSky(ctx, w, 32, ground, env, now, w - 90, 46);
      if (sea) { sea.skyExtra(ctx, PX, 0, 32 / PX, now, 0, w / PX, (ground - 32) / PX, env); }
      ctx.fillStyle = snowC(cshade("#e8c48f", lk), env); ctx.fillRect(0, ground, w, h - ground);
      ctx.fillStyle = snowC(cshade("#d9ae72", lk), env, 0.5);
      for (let x = 0; x < w; x += 24) { ctx.fillRect(x, ground + 10 + (x / 24 % 2) * 14, 9, 3); }
      if (sea) { sea.decorGround(ctx, PX, 0, 0, 0, w / PX, ground / PX, h / PX, env); }
      // mái che sọc (tối dịu khi đêm xuống)
      const aw = 30, ak = 0.7 + 0.3 * Math.max(0.4, env.light);
      for (let x = 0; x < w; x += aw) {
        ctx.fillStyle = cshade((x / aw) % 2 ? "#ffffff" : "#ff4f6d", ak);
        ctx.fillRect(x, 0, aw, 26);
        ctx.fillRect(x + 3, 26, aw - 6, 6);
      }
      ctx.fillStyle = "#1b1b2f"; ctx.fillRect(0, 26, w, 3);
      if (sea) {     // dây trang trí dưới mái che; ban đêm: đèn sáng + pháo hoa (nightTop)
        sea.garland(ctx, PX, 0, 32 / PX, now, 0, w / PX, 0, env);
        sea.nightTop(ctx, PX, 0, 32 / PX, now, 0, w / PX, (ground - 32) / PX, env);
        sea.ambient(ctx, PX, 0, 34 / PX, now, 0, w / PX, (h - 34) / PX, env);
      }
      paintWeather(ctx, w, 32, ground + 30, env, now);
      // StackChan bán hàng
      const L = fxApi() && fxApi().lib;
      const counterTop = ground - 6;
      const cw = Math.round(w * 0.46);
      if (L && L.paintFace) {
        ctx.save();
        ctx.translate(Math.round(cw * 0.36), counterTop - 56);
        L.paintFace(ctx, 3, cust && cust.mood === "happy" && cust.state !== "in" ? "happy" : cust && cust.mood === "sad" ? "sad" : "idle", now, 0);
        ctx.restore();
      }
      // quầy
      ctx.fillStyle = "#1b1b2f"; ctx.fillRect(0, counterTop - 3, cw + 3, h - counterTop + 3);
      ctx.fillStyle = "#c57a45"; ctx.fillRect(0, counterTop, cw, 12);
      ctx.fillStyle = "#a0603a"; ctx.fillRect(0, counterTop + 12, cw, h - counterTop - 12);
      ctx.fillStyle = "#8a4a22";
      for (let x = 12; x < cw - 6; x += 36) { ctx.fillRect(x, counterTop + 20, 3, h - counterTop - 24); }
      sp(ctx, CRATE, 14, counterTop - 27, 3, CRATE_PAL);
      for (let i = 0; i < 4; i++) { sp(ctx, APPLE, cw - 70 + i * 13, counterTop - 12, 3, { k: "#1b1b2f", r: "#ff4f6d", w: "#ffffff" }); }
      // khách
      if (cust) {
        const s = 5;
        const pw = 14 * s, ph = 18 * s;
        const walking = cust.state === "in" || cust.state === "out";
        const rows = PERSON.slice();
        if (cust.v.cat) { rows[0] = CAT_TOP[0]; rows[1] = CAT_TOP[1]; rows[2] = CAT_TOP[2]; }
        if (walking && Math.floor(now / 140) % 2) { rows[16] = PERSON_WALK[0]; rows[17] = PERSON_WALK[1]; }
        const bob = walking ? (Math.floor(now / 140) % 2) * 2 : (cust.mood === "happy" ? (Math.floor(now / 160) % 2) * 3 : 0);
        const px = Math.round(cust.x - pw / 2), py = ground + 10 - ph - bob;
        cust.headY = py + 10;
        sp(ctx, rows, px, py, s, Object.assign({ k: "#1b1b2f" }, cust.v));
        if (cust.state === "wait") {
          const k = cust.patience / PATIENCE;
          ctx.fillStyle = "#1b1b2f"; ctx.fillRect(px - 2, py - 16, pw + 4, 10);
          ctx.fillStyle = k > 0.5 ? "#6be08a" : k > 0.25 ? "#ffd23f" : "#ff4f6d";
          ctx.fillRect(px, py - 14, Math.max(0, Math.round(pw * k)), 6);
        }
        if (cust.mood === "sad" && L && L.CLOUD) { sp(ctx, L.CLOUD, px + 8, py - 40, 3, null, 0.95); }
        // bong bóng lời thoại
        if (cust.state === "wait" || cust.state === "thanks") {
          bubble.hidden = false;
          const bw = bubble.offsetWidth;
          const left = Math.max(8, Math.min(w - bw - 8, cust.x - bw + 30));
          bubble.style.left = left + "px";
          bubble.style.top = Math.max(36, py - bubble.offsetHeight - 26) + "px";
        }
      }
    }

    g.tick = function (dt) {
      if (over) { return; }
      // Đồng hồ chỉ chạy khi khách đang tới / đang chờ (lúc xem đáp án thì dừng).
      const clockOn = cust && (cust.state === "in" || cust.state === "wait");
      if (clockOn) { timeLeft -= dt; }
      const size = stageSize();
      if (cust) {
        const stop = size.w * 0.72;
        if (cust.state === "in") {
          cust.x -= 320 * dt;
          if (cust.x <= stop) {
            cust.x = stop; cust.state = "wait";
            Array.prototype.forEach.call(crates.children, (b) => { b.disabled = false; });
          }
        } else if (cust.state === "wait") {
          cust.patience -= dt;
          if (cust.patience <= 0) { cust.patience = 0; choose(-1); }
        } else if (cust.state === "out") {
          cust.x += 360 * dt;
          if (cust.x > size.w + 70) { cust = null; }
        }
      }
      draw(Date.now());
      if (clockOn && Math.floor(timeLeft + dt) !== Math.floor(timeLeft)) { hud(); }
      if (clockOn && timeLeft <= 0) { timeLeft = 0; hud(); end(); }
    };
    g.key = function (e) {
      const n = Number(e.key);
      if (waitNext) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); goNext(); }
        else if (n >= 1 && n <= opts.length) { e.preventDefault(); playWord(opts[n - 1]); }
        return;
      }
      if (n >= 1 && n <= opts.length) { e.preventDefault(); choose(n - 1); }
    };
    g.debug = () => ({ answer: cust ? opts.indexOf(cust.target) : -1, state: cust ? cust.state : null,
      served: served, score: score, timeLeft: timeLeft, total: total, waitNext: waitNext, kind: kind, mode: mode.id,
      ask: cust ? cust.ask : null, key: cust ? cust.key : null, bubble: bubble.textContent,
      options: Array.prototype.map.call(crates.children, (b) => b.querySelector(".kb-gm-label").textContent) });
    g.skipTime = (s) => { timeLeft = Math.max(0.01, timeLeft - s); };
    hud();
    newCustomer();
    return g;
  };

  // =====================================================================
  // GAME 3: Đuổi quạ
  // =====================================================================
  BUILDERS.crow = function (st, pool) {
    const TOTAL = 15, LIVES = 5, LANES = 4;
    const g = { timers: [], alive: true };
    const next = picker(pool.targets);
    const kind = pool.kind, cm = pool.mode;
    const spell = cm.type === "spell" || cm.type === "spell_m";   // 1.17: tiếng Anh — gõ đúng chính tả, không đổi sang kana
    const SPD = CROW_SPEEDS[crowSpeed()];
    let lives = LIVES, score = 0, combo = 0, spawned = 0, scared = 0, spawnIn = 0.6, over = false;
    const crows = [];
    const xx = pool.group === "xx";             // 1.25.1: ngôn ngữ khác — đáp án là đúng chữ của thẻ
    const answersOf = (p) => cm.type === "spell_m" ? (p._sm || (p._sm = spellAnswers(p.meaning)))
      : spell && xx ? (p._sw || (p._sw = spellAnswers(p.word)))
        : spell ? enAnswers(p) : cm.type === "both" ? readingsOf(p).concat(wordForms(p)) : readingsOf(p);
    // chữ trên biển của quạ
    function labelOf(p) {
      if (cm.show === "meaning") { return shortMeaning(p); }
      if (cm.type === "spell_m") { const w = String(p.word || ""); return w.length > 34 ? w.slice(0, 33) + "…" : w; }
      if (cm.show === "hanviet") {
        const m = String(p.meaning || "").split(/[;；,、]/)[0].trim();
        const t = String(p.hanviet || "").toUpperCase() + (m ? " · " + m : "");
        return t.length > 34 ? t.slice(0, 33) + "…" : t;
      }
      return kind === "vocab" && !HAS_KANJI.test(p.word) ? (p.meaning || p.word) : p.word;
    }
    const missed = [];
    g.ownSky = true;

    const wrap = el("div", "kb-gc");
    const cv = el("canvas", "kb-gc-canvas");
    const reveal = el("div", "kb-gc-reveal");
    reveal.hidden = true;
    const row = el("div", "kb-gc-row");
    const input = el("input", "kb-gc-input");
    input.type = "text";
    input.placeholder = cm.type === "spell_m" ? "Gõ mặt sau của thẻ…" : spell && xx ? "Gõ từ…" : spell ? "Gõ từ tiếng Anh… (vd. apple, look up)" : kind === "kanji" ? (cm.type === "both" ? "Gõ âm On / Kun (romaji, kana) hoặc chữ Hán (IME)…"
      : "Gõ âm On hoặc Kun… (romaji: chikara / kana)")
      : cm.type === "both" ? "Gõ từ tiếng Nhật: romaji (saraishuu), kana hoặc kanji (IME)…"
        : "Gõ cách đọc… (romaji: saraishuu / kana)";
    input.setAttribute("autocomplete", "off");
    input.setAttribute("spellcheck", "false");
    const preview = el("div", "kb-gc-preview", "");
    row.appendChild(input); row.appendChild(preview);
    wrap.appendChild(cv); wrap.appendChild(reveal); wrap.appendChild(row);
    st.insertBefore(wrap, st.firstChild);
    cv.addEventListener("mousedown", (e) => { e.preventDefault(); input.focus(); });

    function hud() {
      setHud([["Tốc độ", SPD.label], ["Hạt", "●".repeat(lives) + "○".repeat(LIVES - lives), lives <= 2 ? "kb-g-warn" : ""],
        ["Quạ", Math.min(spawned, TOTAL) + "/" + TOTAL], ["Điểm", score],
        combo >= 2 ? ["Combo", "×" + combo, "kb-g-hot"] : null]);
    }

    let canvasH = 300;
    function laneY(i, h) { return Math.round(h * 0.1 + i * ((h * 0.62) / LANES)); }

    function spawn() {
      const onScreen = new Set(crows.map((c) => c.p.nid));
      const labels = new Set(crows.filter((c) => c.state === "fly").map((c) => c.label));
      const p = next((q) => onScreen.has(q.nid) || labels.has(labelOf(q)));
      if (!p || onScreen.has(p.nid)) { return false; }
      const size = stageSize();
      const used = crows.filter((c) => c.state === "fly").map((c) => c.lane);
      let lane = rnd(LANES);
      for (let k = 0; k < LANES && used.indexOf(lane) >= 0; k++) { lane = (lane + 1) % LANES; }
      const travel = Math.max(7.5, 15 - spawned * 0.55) * SPD.time;
      const label = labelOf(p);
      // 1.25.3: từ khác có cùng chữ trên biển (đồng nghĩa: big / large cùng "to lớn") cũng là đáp án đúng
      const alts = (pool.items || pool.targets).filter((q) => q !== p && q.nid !== p.nid && labelOf(q) === label);
      crows.push({ p: p, lane: lane, x: size.w + 40, y: 0, state: "fly", speed: (size.w - 70) / travel,
        label: label, t: 0, flap: Math.random(), alts: alts });
      spawned++;
      hud();
      return true;
    }

    function showReveal(p) {
      reveal.textContent = "";
      reveal.appendChild(el("b", null, cm.type === "spell_m" ? p.meaning : p.word));
      reveal.appendChild(el("span", null, cm.type === "spell_m" ? "  (" + p.word + ")"
        : spell ? (p.reading ? " " + p.reading : "") + (p.meaning ? "  (" + p.meaning + ")" : "")
        : " → " + readingsOf(p)[0] + (p.meaning ? "  (" + p.meaning + ")" : "")));
      reveal.hidden = false;
      later(g, () => { reveal.hidden = true; }, 2600);
    }

    function crowAnswers(c) {
      if (!c.alts || !c.alts.length) { return answersOf(c.p); }
      return c._rs || (c._rs = c.alts.reduce((acc, q) => acc.concat(answersOf(q)), answersOf(c.p).slice()));
    }
    function check(final) {
      const raw = input.value;
      const flyingNow = crows.filter((c) => c.state === "fly");
      let typed;
      if (spell) {
        typed = enNorm(raw) ? [enNorm(raw)] : [];
      } else {
        const vars = kanaVariants(raw);
        const shown = vars.find((v) => flyingNow.some((c) => crowAnswers(c).some((r) => r.indexOf(normKana(v)) === 0))) || vars[0];
        preview.textContent = raw && shown !== raw ? shown : "";
        typed = typedKana(raw, final);
      }
      if (!typed.length) { return false; }
      let best = null;
      flyingNow.forEach((c) => {
        const rs = crowAnswers(c);
        if (typed.some((t) => rs.indexOf(t.replace(/[～〜~]/g, "")) >= 0) && (!best || c.x < best.x)) { best = c; }
      });
      if (!best) { return false; }
      const size = stageSize();
      best.state = "scared";
      scared++; combo++;
      const left = Math.max(0, (best.x - 70) / (size.w - 70));
      const gain = Math.round((100 + Math.round(left * 100)) * (1 + Math.min(combo - 1, 5) * 0.1) * SPD.pts);
      score += gain;
      const y = laneY(best.lane, canvasH) + best.y;
      for (let k = 0; k < 8; k++) {
        addPart({ kind: "feather", x: best.x, y: y + 15, vx: (Math.random() - 0.5) * 160, vy: -40 - Math.random() * 80, g: 160, life: 0.9 });
      }
      floatText(best.x, y, "+" + gain);
      sfx(combo >= 3 ? "easy" : "good");
      if (combo === 5 || combo === 10) { mood("star", 1200, "Combo ×" + combo + "！"); } else { mood("happy", 700); }
      input.value = "";
      preview.textContent = "";
      hud();
      return true;
    }
    input.addEventListener("input", () => check(false));
    input.addEventListener("compositionend", () => check(false));
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        if (input.value && !check(true)) {
          input.classList.remove("kb-shake"); void input.offsetWidth; input.classList.add("kb-shake");
        }
      }
    });

    function end(win) {
      if (over) { return; }
      over = true;
      later(g, () => finish(g, {
        score: score + (win ? lives * 150 : 0), win: win,
        title: win ? "守れた！ Giữ được vườn!" : "全部取られた… Quạ thắng rồi",
        line: "Đuổi được " + scared + "/" + TOTAL + " con quạ · còn " + lives + " hạt · tốc độ " + SPD.label,
        coins: win ? Math.round(scared / 2) + lives : Math.round(scared / 3), missed: missed
      }), 700);
    }

    function draw(now) {
      const f = fitCanvas(cv), ctx = f.ctx, w = f.w, h = f.h;
      canvasH = h;
      const ground = Math.round(h * 0.8);
      // 1.10: trời, đồi, ruộng theo giờ / thời tiết / Mùa & Lễ hội của vườn
      const env = skyNow(), sea = SEA();
      paintSky(ctx, w, 0, ground, env, now, w - 70, 18);
      if (sea) { sea.skyExtra(ctx, PX, 0, 0, now, 0, w / PX, ground / PX, env); }
      ctx.fillStyle = env.hills;
      for (let x = 0; x < w; x += PX) {
        const hh = (4 + Math.round(2 * Math.sin(x / 51) + Math.sin(x / 17))) * PX;
        ctx.fillRect(x, ground - hh, PX, hh);
      }
      if (sea) { sea.decorHills(ctx, PX, 0, 0, 0, w / PX, ground / PX, env); }
      ctx.fillStyle = env.ground; ctx.fillRect(0, ground, w, h - ground);
      ctx.fillStyle = env.grass;
      for (let x = 7; x < w; x += 19) { ctx.fillRect(x, ground + 8 + (x % 3) * 4, 3, 3); }
      if (sea) {
        sea.decorGround(ctx, PX, 0, 0, 0, w / PX, ground / PX, h / PX, env);
        sea.garland(ctx, PX, 0, 0, now, 0, w / PX, 0, env);
        sea.nightTop(ctx, PX, 0, 0, now, 0, w / PX, ground / PX, env);
        sea.ambient(ctx, PX, 0, 0, now, 0, w / PX, h / PX, env);
      }
      paintWeather(ctx, w, 0, ground + 20, env, now);
      // luống hạt bên trái + StackChan bù nhìn
      ctx.fillStyle = "#1b1b2f"; ctx.fillRect(0, ground - 14, 66, 30);
      ctx.fillStyle = "#a0603a"; ctx.fillRect(0, ground - 11, 63, 24);
      for (let i = 0; i < LIVES; i++) {
        const x = 2 + i * 12;
        if (i < lives) { H.drawSprite(ctx, H.sprites[1], x / 2, (ground - 34) / 2, 2, H.pal); }
        else { ctx.fillStyle = "#7a4220"; ctx.fillRect(x + 12, ground - 6, 8, 4); }
      }
      const L = fxApi() && fxApi().lib;
      ctx.fillStyle = "#8a4a22"; ctx.fillRect(28, ground - 92, 5, 80);
      if (L && L.paintFace) {
        ctx.save(); ctx.translate(10, ground - 130);
        L.paintFace(ctx, 2, lives <= 1 ? "sad" : (combo >= 3 ? "happy" : "idle"), now, 0);
        ctx.restore();
      }
      // quạ
      crows.forEach((c) => {
        const y = laneY(c.lane, h) + (c.state === "fly" ? Math.round(Math.sin(c.t * 5 + c.flap * 6) * 4) : 0) + c.y;
        const frame = Math.floor(c.t * (c.state === "fly" ? 6 : 12) + c.flap * 2) % 2;
        sp(ctx, CROW[frame], Math.round(c.x - 24), y, 3, CROW_PAL);
        if (c.state === "steal") { H.drawSprite(ctx, H.sprites[1], (c.x - 18) / 2, (y + 24) / 2, 2, H.pal); }
        if (c.state === "scared" || c.state === "steal") {
          // quạ bay đi vẫn mang biển: hiện chữ + cách đọc + nghĩa để kịp học
          const r0 = readingsOf(c.p)[0] || "";
          const top = c.p.word + (r0 && r0 !== c.p.word ? "（" + r0 + "）" : "");
          const sub = (c.p.hanviet ? String(c.p.hanviet).toUpperCase() + " · " : "") + (c.p.meaning || "");
          ctx.font = "18px 'Noto Sans CJK JP', DotGothic16, sans-serif";
          const tw = Math.ceil(Math.max(ctx.measureText(top).width, ctx.measureText(sub.slice(0, 24)).width));
          const bx = Math.round(c.x - tw / 2 - 8), by = y + 40;
          ctx.fillStyle = "#1b1b2f"; ctx.fillRect(bx - 3, by - 3, tw + 22, sub ? 52 : 32);
          ctx.fillStyle = c.state === "scared" ? "#c8f7d2" : "#ffd0d6"; ctx.fillRect(bx, by, tw + 16, sub ? 46 : 26);
          ctx.fillStyle = "#1b1b2f"; ctx.textBaseline = "middle";
          ctx.fillText(top, bx + 8, by + 13);
          if (sub) { ctx.font = "15px DotGothic16, sans-serif"; ctx.fillText(sub.length > 24 ? sub.slice(0, 23) + "…" : sub, bx + 8, by + 34); }
          ctx.textBaseline = "alphabetic";
        }
        if (c.state === "fly") {
          ctx.font = cm.show !== "word" ? "17px DotGothic16, 'Noto Sans CJK JP', sans-serif" : "20px 'Noto Sans CJK JP', DotGothic16, sans-serif";
          const lines = cm.show !== "word" ? wrapText(ctx, c.label, 170) : [c.label.length > 14 ? c.label.slice(0, 13) + "…" : c.label];
          const tw = Math.ceil(Math.max.apply(null, lines.map((l) => ctx.measureText(l).width)));
          const lh = cm.show !== "word" ? 21 : 26;
          const bh = lines.length * lh + 6;
          const bx = Math.round(Math.min(w - tw - 24, Math.max(4, c.x - tw / 2 - 8))), by = y + 40;
          ctx.fillStyle = "#1b1b2f"; ctx.fillRect(bx - 3, by - 3, tw + 22, bh + 6);
          ctx.fillStyle = "#fff8dc"; ctx.fillRect(bx, by, tw + 16, bh);
          ctx.fillStyle = "#8a4a22"; ctx.fillRect(Math.round(c.x) - 1, y + 30, 3, 8);
          ctx.fillStyle = "#1b1b2f"; ctx.textBaseline = "middle";
          lines.forEach((l, i) => ctx.fillText(l, bx + 8, by + 3 + lh / 2 + i * lh));
          const prog = 1 - (c.x - 70) / (w - 70);
          const r0 = spell ? (answersOf(c.p)[0] || "") : (readingsOf(c.p)[0] || normKana(c.p.word));
          if (prog > 0.55 && r0) {
            ctx.font = "15px 'Noto Sans CJK JP', sans-serif";
            const n = prog > 0.8 ? 2 : 1;
            const hint = "gợi ý: " + r0.slice(0, n) + "…（" + r0.length + (spell ? " ký tự" : " chữ") + "）";
            ctx.fillStyle = "rgba(255, 248, 220, 0.88)"; ctx.fillRect(bx - 3, by + bh + 7, Math.ceil(ctx.measureText(hint).width) + 8, 19);
            ctx.fillStyle = "#c21f3a";
            ctx.fillText(hint, bx + 1, by + bh + 16);
          }
          ctx.textBaseline = "alphabetic";
        }
      });
    }

    g.tick = function (dt) {
      const size = stageSize();
      if (!over) {
        spawnIn -= dt;
        const flying = crows.filter((c) => c.state === "fly").length;
        if (spawnIn <= 0 && spawned < TOTAL && flying < 4) {
          if (spawn()) { spawnIn = Math.max(1.5, 3.2 - spawned * 0.12) * SPD.gap; } else { spawnIn = 0.3; }
        }
      }
      for (let i = crows.length - 1; i >= 0; i--) {
        const c = crows[i];
        c.t += dt;
        if (c.state === "fly") {
          c.x -= c.speed * dt;
          if (c.x <= 70 && !over) {
            c.state = "steal";
            lives--; combo = 0;
            missed.push(c.p);
            showReveal(c.p);
            sfx("again");
            mood("sad", 1200, "取られた！");
            hud();
            if (lives <= 0) { end(false); }
          }
        } else if (c.state === "scared") {
          c.x += 120 * dt; c.y -= 90 * dt;
          if (c.y < -200) { crows.splice(i, 1); }
        } else if (c.state === "steal") {
          c.x -= 60 * dt; c.y -= 80 * dt;
          if (c.y < -200 || c.x < -60) { crows.splice(i, 1); }
        }
      }
      if (!over && spawned >= TOTAL && !crows.some((c) => c.state === "fly")) { end(true); }
      draw(Date.now());
    };
    g.key = function () { if (document.activeElement !== input) { input.focus(); } };
    g.debug = () => ({
      flying: crows.filter((c) => c.state === "fly").map((c) => ({ word: c.p.word, label: c.label, reading: readingsOf(c.p)[0],
        forms: wordForms(c.p), x: c.x })),
      mode: cm.id, kind: kind, speedKey: crowSpeed(), speeds: crows.filter((c) => c.state === "fly").map((c) => c.speed),
      lives: lives, score: score, scared: scared, spawned: spawned
    });
    g.stop = () => { input.blur(); };
    hud();
    later(g, () => input.focus(), 50);
    return g;
  };

  // =====================================================================
  // GAME 4: Lật cặp
  // =====================================================================
  BUILDERS.memory = function (st, pool) {
    const g = { timers: [], alive: true };
    const nKind = pool.kind;
    const faces = pool.mode.alt.map((a) => a[0]);       // mặt ghép với chữ: nghĩa / cách đọc / Hán Việt
    const nPairs = Math.min(8, pool.targets.length);
    const next = picker(pool.targets);
    const chosen = [];
    const usedText = new Set();
    const memText = (p, f) => f === "reading" ? p.reading : f === "hanviet" ? String(p.hanviet || "").toUpperCase() : p.meaning;
    let attempts = 0;
    while (chosen.length < nPairs && attempts++ < 400) {
      const p = next();
      if (!p || chosen.some((c) => c.p === p)) { if (chosen.length >= pool.targets.length) { break; } continue; }
      // Trộn: thử các mặt theo thứ tự ngẫu nhiên (cách đọc chỉ khi chữ có kanji)
      const avail = shuffle(faces.filter((f) => has(p, f) && (f !== "reading" || latin(p) || HAS_KANJI.test(p.word))));
      let pick = null;
      for (let k = 0; k < avail.length && !pick; k++) {
        const t = memText(p, avail[k]);
        if (t && !usedText.has(norm(t))) { pick = [avail[k], t]; }
      }
      if (!pick || usedText.has(norm(p.word))) {
        if (pool.targets.length <= chosen.length + 1) { break; }
        continue;
      }
      usedText.add(norm(pick[1])); usedText.add(norm(p.word));
      chosen.push({ p: p, kind: pick[0], text: pick[1] });
    }
    const cards = [];
    chosen.forEach((c, i) => {
      cards.push({ pair: i, kind: "word", text: c.p.word, p: c.p });
      cards.push({ pair: i, kind: c.kind, text: c.text, p: c.p });
    });
    shuffle(cards);
    const pairs = chosen.length;
    let open = [], moves = 0, found = 0, time = 0, lock = false, combo = 0, score = 0;
    const mistakes = chosen.map(() => 0);

    const wrap = el("div", "kb-gmem");
    const grid = el("div", "kb-gmem-grid");
    grid.style.gridTemplateRows = "repeat(" + Math.ceil(cards.length / 4) + ", minmax(0, 1fr))";
    const TAG = { word: nKind === "kanji" ? "字" : nKind === "grammar" ? "文" : "語", meaning: "意", reading: "読", hanviet: "漢" };
    cards.forEach((c, i) => {
      const b = el("button", "kb-mc");
      b.type = "button";
      const inner = el("div", "kb-mc-inner");
      const back = el("div", "kb-mc-back");
      const front = el("div", "kb-mc-front kb-mc-" + c.kind);
      front.appendChild(el("span", "kb-mc-tag", TAG[c.kind]));
      front.appendChild(el("span", "kb-mc-text", c.text));
      inner.appendChild(back); inner.appendChild(front);
      b.appendChild(inner);
      b.title = "";
      b.addEventListener("click", () => flip(i));
      grid.appendChild(b);
      c.btn = b;
    });
    wrap.appendChild(grid);
    st.insertBefore(wrap, st.firstChild);

    function hud() {
      setHud([["Cặp", found + "/" + pairs], ["Lượt", moves], ["Thời gian", Math.floor(time) + "s"],
        combo >= 2 ? ["Combo", "×" + combo, "kb-g-hot"] : null]);
    }

    function subLine(c) {
      const p = c.p, r = p.reading && p.reading !== p.word ? p.reading : "";
      if (c.kind === "word") { return [r, p.hanviet ? String(p.hanviet).toUpperCase() : "", p.meaning].filter(Boolean).join(" · "); }
      if (c.kind === "hanviet") { return p.word + " · " + (p.meaning || ""); }
      if (c.kind === "meaning") { return p.word + readSuffix(p, r); }
      return p.word + (p.meaning ? " · " + p.meaning : "");
    }

    function flip(i) {
      const c = cards[i];
      if (c.done) { playWord(c.p); return; }
      if (lock || open.indexOf(i) >= 0 || !g.alive) { return; }
      c.btn.classList.add("is-open");
      c.btn.title = c.text;
      sfx("flip");
      open.push(i);
      if (open.length < 2) { return; }
      moves++;
      lock = true;
      const a = cards[open[0]], b = cards[open[1]];
      if (a.pair === b.pair) {
        later(g, () => {
          a.done = b.done = true;
          a.btn.classList.add("is-done"); b.btn.classList.add("is-done");
          [a, b].forEach((c) => {
            const front = c.btn.querySelector(".kb-mc-front");
            front.appendChild(el("span", "kb-mc-sub", subLine(c)));
            c.btn.title = c.text + " — " + subLine(c) + (playable(c.p) ? " (bấm để nghe)" : "");
          });
          found++; combo++;
          score += 100 + (combo - 1) * 25;
          const p1 = centerOf(a.btn), p2 = centerOf(b.btn);
          burst(p1.x, p1.y, 6, "sparkle", 110); burst(p2.x, p2.y, 6, "sparkle", 110);
          sfx(combo >= 3 ? "easy" : "good");
          mood("happy", 700, combo === 3 || combo === 6 ? "すごい！" : null);
          open = []; lock = false;
          hud();
          if (found === pairs) { done(); }
        }, 380);
      } else {
        mistakes[a.pair]++; mistakes[b.pair]++;
        combo = 0;
        later(g, () => {
          a.btn.classList.add("kb-shake"); b.btn.classList.add("kb-shake");
          sfx("hard");
        }, 420);
        later(g, () => {
          a.btn.classList.remove("is-open", "kb-shake"); b.btn.classList.remove("is-open", "kb-shake");
          open = []; lock = false;
          hud();
        }, 1150);
      }
      hud();
    }

    function done() {
      const extra = Math.max(0, moves - pairs);
      const total = Math.max(50, score + pairs * 100 - extra * 20 + Math.max(0, Math.round((pairs * 12 - time) * 4)));
      const missed = chosen.filter((c, i) => mistakes[i] >= 2).map((c) => c.p);
      later(g, () => finish(g, {
        score: total, win: true, title: extra <= 2 ? "完璧！ Trí nhớ siêu đỉnh!" : "クリア！ Tìm đủ cặp rồi",
        line: pairs + " cặp · " + moves + " lượt · " + Math.floor(time) + " giây",
        coins: pairs + (extra <= 3 ? 3 : 0), missed: missed
      }), 600);
    }

    g.tick = function (dt) {
      if (found < pairs) {
        const before = Math.floor(time);
        time += dt;
        if (Math.floor(time) !== before) { hud(); }
      }
    };
    g.debug = () => ({ cards: cards.map((c) => ({ pair: c.pair, kind: c.kind, text: c.text, done: !!c.done,
      sub: (c.btn.querySelector(".kb-mc-sub") || {}).textContent || "" })), noteKind: nKind, mode: pool.mode.id,
      lock: lock, found: found, pairs: pairs, moves: moves });
    g.flip = flip;
    hud();
    return g;
  };

  // =====================================================================
  // GAME 5: Điền vào câu (câu ví dụ trong thẻ của bạn)
  // =====================================================================
  BUILDERS.cloze = function (st, pool) {
    const ROUNDS = Math.min(8, pool.targets.length), TIME = 20;
    const g = { timers: [], alive: true };
    const kind = pool.kind;
    const next = picker(pool.targets);
    let round = 0, score = 0, combo = 0, right = 0, t = TIME, locked = true, target = null, opts = [];
    let waitNext = false, hinted = false;
    const missed = [];

    const wrap = el("div", "kb-gz");
    const top = el("div", "kb-gz-top");
    const listenBtn = el("button", "kb-btn kb-btn-small kb-gz-audio", "♪ Nghe câu");
    listenBtn.type = "button";
    listenBtn.appendChild(el("span", "kb-key", "A"));
    const hintBtn = el("button", "kb-btn kb-btn-small kb-gz-hintbtn", "Gợi ý nghĩa");
    hintBtn.type = "button";
    hintBtn.appendChild(el("span", "kb-key", "H"));
    top.appendChild(el("div", "kb-gz-q", kind === "grammar" ? "Chọn mẫu ngữ pháp điền vào ô trống (phím 1–4)"
      : kind === "kanji" ? "Chọn chữ Hán điền vào ô trống (phím 1–4)" : "Chọn từ điền vào ô trống (phím 1–4)"));
    top.appendChild(listenBtn); top.appendChild(hintBtn);
    const bar = el("div", "kb-timebar"), fill = el("div", "kb-timebar-fill");
    bar.appendChild(fill);
    const sent = el("div", "kb-gz-sent");
    const hint = el("div", "kb-gz-hint");
    const grid = el("div", "kb-gz-opts");
    const info = el("div", "kb-gl-info");
    wrap.appendChild(top); wrap.appendChild(bar); wrap.appendChild(sent); wrap.appendChild(hint);
    wrap.appendChild(grid); wrap.appendChild(info);
    st.insertBefore(wrap, st.firstChild);

    function hud() {
      setHud([["Câu", Math.min(round, ROUNDS) + "/" + ROUNDS], ["Đúng", right], ["Điểm", score],
        combo >= 2 ? ["Combo", "×" + combo, "kb-g-hot"] : null]);
    }
    function playSentence() { if (target && target.ex_audio) { H.send("game:exaudio:" + target.nid); } }
    function useHint(how) {
      if (!target || waitNext) { return; }
      hinted = true;
      if (how === "audio") { playSentence(); return; }
      const what = kind === "grammar" ? "Nghĩa của mẫu cần điền: " : kind === "kanji" ? "Chữ cần điền: " : "Nghĩa của từ cần điền: ";
      hint.textContent = what + (kind === "vocab" ? (target.meaning || "?") : (faceText(target, "hanviet", kind) ? faceText(target, "hanviet", kind) + " – " : "") +
        (target.meaning || (kind === "kanji" ? "" : "?"))) + (target.ex_meaning ? "  ·  Câu: " + target.ex_meaning : "");
      hint.className = "kb-gz-hint kb-gz-hint-show";
    }
    listenBtn.addEventListener("click", () => { if (waitNext) { playSentence(); } else { useHint("audio"); } });
    hintBtn.addEventListener("click", () => useHint("meaning"));

    // Đáp án nhiễu: bỏ từ có sẵn trong câu hoặc lồng nhau với đáp án.
    function clozeChoices(tg) {
      const plain = (tg.cloze && tg.cloze.plain) || "";
      const tForms = wordForms(tg);
      const related = (p) => wordForms(p).some((f) => f && (plain.indexOf(f) >= 0 ||
        tForms.some((t) => t && (t.indexOf(f) >= 0 || f.indexOf(t) >= 0))));
      const seen = new Set([norm(tg.word)]);
      const cands = shuffle(pool.items.filter((p) => p.nid !== tg.nid && !related(p)));
      const out = [tg];
      cands.forEach((p) => {
        if (out.length >= 4 || seen.has(norm(p.word))) { return; }
        seen.add(norm(p.word)); out.push(p);
      });
      return shuffle(out);
    }

    function nextRound() {
      if (!g.alive) { return; }
      round++;
      if (round > ROUNDS) {
        const win = right >= Math.ceil(ROUNDS * 0.7);
        finish(g, { score: score, win: win, title: win ? "よくできました！ Hiểu cả cách dùng!" : "もう少し！",
          line: right + "/" + ROUNDS + " câu đúng", coins: right + (right === ROUNDS ? 3 : 0), missed: missed });
        return;
      }
      target = next((p) => p === target);
      opts = clozeChoices(target);
      sent.innerHTML = target.cloze.q;
      hint.textContent = ""; hint.className = "kb-gz-hint";
      info.textContent = ""; info.className = "kb-gl-info";
      listenBtn.disabled = !target.ex_audio;
      hinted = false; waitNext = false;
      grid.textContent = "";
      opts.forEach((p, i) => {
        const b = el("button", "kb-gz-opt");
        b.type = "button";
        b.appendChild(el("span", "kb-gl-num", String(i + 1)));
        b.appendChild(el("span", "kb-gz-word", p.word));
        b.addEventListener("click", () => { if (waitNext) { playWord(opts[i]); } else { choose(i); } });
        grid.appendChild(b);
      });
      t = TIME; locked = false;
      hud();
    }

    function reveal(ok) {
      sent.innerHTML = target.cloze.a;
      Array.prototype.forEach.call(grid.children, (b, i) => revealUnder(b, opts[i], "word"));
      info.textContent = "";
      const line = el("span", "kb-gl-info-line");
      line.appendChild(el("span", "kb-gl-verdict", ok ? "Đúng rồi! " : kind === "grammar" ? "Mẫu đúng: " : "Từ đúng: "));
      line.appendChild(el("b", null, target.word));
      if (target.reading) { line.appendChild(el("span", null, readSuffix(target))); }
      line.appendChild(el("span", null, " " + meaningText(target)));
      info.appendChild(line);
      info.appendChild(nextButton(round >= ROUNDS ? "Xem kết quả ▶" : "Câu tiếp ▶", goNext));
      info.className = "kb-gl-info kb-gl-info-show" + (ok ? " kb-gl-info-ok" : "");
      if (target.ex_meaning) { hint.textContent = "Câu: " + target.ex_meaning; hint.className = "kb-gz-hint kb-gz-hint-show"; }
      waitNext = true;
      later(g, playSentence, 350);
    }
    function goNext() { if (waitNext && g.alive) { waitNext = false; nextRound(); } }

    function choose(i) {
      if (locked || !g.alive) { return; }
      locked = true;
      const btns = grid.children;
      const ok = i >= 0 && opts[i].nid === target.nid;
      const goodIdx = opts.indexOf(target);
      if (ok) {
        right++; combo++;
        let gain = Math.round((100 + Math.round((t / TIME) * 100)) * (1 + Math.min(combo - 1, 5) * 0.1));
        if (hinted) { gain = Math.round(gain * 0.6); }
        score += gain;
        btns[i].classList.add("kb-good");
        const c = centerOf(btns[i]);
        burst(c.x, c.y, 8, "sparkle", 140);
        floatText(c.x, c.y - 30, "+" + gain);
        sfx(combo >= 3 ? "easy" : "good");
        if (combo === 5) { mood("star", 1200, "Combo ×5！"); } else { mood("happy", 800); }
      } else {
        combo = 0;
        missed.push(target);
        if (i >= 0) { btns[i].classList.add("kb-bad"); }
        btns[goodIdx].classList.add("kb-good");
        sfx("again");
        mood("sad", 1200, i >= 0 ? "ドンマイ！" : "時間切れ！");
      }
      hud();
      reveal(ok);
    }

    g.tick = function (dt) {
      if (locked) { return; }
      t -= dt;
      fill.style.width = Math.max(0, (t / TIME) * 100) + "%";
      fill.className = "kb-timebar-fill" + (t < TIME * 0.3 ? " kb-low" : "");
      if (t <= 0) { choose(-1); }
    };
    g.key = function (e) {
      const n = Number(e.key), k = (e.key || "").toLowerCase();
      if (waitNext) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); goNext(); }
        else if (n >= 1 && n <= opts.length) { e.preventDefault(); playWord(opts[n - 1]); }
        else if (k === "a") { e.preventDefault(); playSentence(); }
        return;
      }
      if (n >= 1 && n <= opts.length) { e.preventDefault(); choose(n - 1); }
      else if (k === "h") { e.preventDefault(); useHint("meaning"); }
      else if (k === "a") { e.preventDefault(); useHint("audio"); }
    };
    g.debug = () => ({ round: round, answer: opts.indexOf(target), locked: locked, score: score, right: right,
      waitNext: waitNext, word: target && target.word, options: opts.map((p) => p.word), hinted: hinted, kind: kind,
      hint: hint.textContent });
    g.stop = () => H.send("game:stop");
    hud();
    later(g, nextRound, 200);
    return g;
  };

  // ---------------------------------------------------------------------
  return {
    init: function (helpers) {
      H = helpers;
      document.addEventListener("keydown", onKey);
      $("kb-g-exit").addEventListener("click", () => { if (screen === "menu") { close(); } else { showMenu(); } });
    },
    open: open,
    close: close,
    isOpen: function () { return isOpen; },
    playing: function () { return isOpen && screen === "play" && lastDef ? lastDef.id : null; },
    // 1.9: Python báo chế độ đã lưu; bảng Cấu hình trường hỏi trò nào chơi được
    modesChanged: function (g) {
      const d = H && H.data();
      if (d && g) { d.game_modes = g.games || d.game_modes || {}; d.game_modes_lang = g.lang || d.game_modes_lang || {}; }
      if (isOpen && screen === "menu") { showMenu(); }
    },
    supportFor: supportFor,
    kinds: KINDS,
    dataChanged: function () { if (isOpen && screen === "menu") { showMenu(); } },
    deckChanged: function () { if (isOpen) { showMenu(); } },
    gameSaved: gameSaved,
    // dùng cho test tự động
    _debug: function () { return game && game.debug ? Object.assign({ screen: screen }, game.debug()) : { screen: screen }; },
    _game: function () { return game; },
    _speed: function (k) { speed = k; },
    _toKana: toKana,
    _choices: choices,          // 1.25.3: test lựa chọn không có hai đáp án cùng đúng
    _typedKana: typedKana,
    _variants: kanaVariants,
    _readings: readingsOf,
    _wordForms: wordForms,
    _setCrowMode: setCrowMode,
    _modes: MODES,
    _pool: function (id, kind, modeId) {
      const def = DEFS.find((x) => x.id === id);
      const m = modeId ? modeList(id, kind).find((x) => x.id === modeId) : undefined;
      const p = poolFor(def, kind, m);
      return { items: p.items.length, targets: p.targets.length, ok: playableOk(def, p), mode: p.mode && p.mode.id, kind: p.kind,
        lack: playableOk(def, p) ? "" : lackText(def, p) };
    },
    _setKind: setKind,
    _curKind: function () { return curKind(); },
    _setCrowSpeed: setCrowSpeed
  };
})();
