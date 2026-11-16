// Các bước vẽ ảnh phác 1.32 (mock_132.js gọi lần lượt; chạy riêng: node mock_132.js OUT tên_bước…)
const REPO = require('path').resolve(__dirname, '../..');
let T = null;
async function tables(c) {
  if (!T) {
    T = await c.py(`import sys, importlib
sys.path.insert(0, ${JSON.stringify(REPO + '/kotoba_batake')})
import lang_core as tieng_core
importlib.reload(tieng_core)
result = {k: getattr(tieng_core, k) for k in ("ACTS", "FINDS", "GUESTS", "DECOR", "SEASONS", "SAY", "TITLES")}`);
  }
  return T;
}
// (chữ, cách đọc) của một mục theo tiếng: en → (en, ""), zh → (chữ, pinyin), ko → (chữ, romaja)
const pick = (row, lang) => lang === 'en' ? [row[0], ''] : lang === 'zh' ? [row[1], row[2]] : lang === 'ko' ? [row[3], row[4]] : ['', ''];
const LANG_ATTR = { ja: 'ja', en: 'en', zh: 'zh-CN', ko: 'ko', vi: 'vi' };
const TITLE_SRC = 'おうち';

async function setTitles(c, lang) {
  const t = await tables(c);
  await c.js(`const T = ${JSON.stringify(t.TITLES)}, lang = ${JSON.stringify(lang)};
    document.querySelectorAll(".kb-g-title, .kb-quest-head").forEach((e) => {
      const n = e.firstChild; if (!n || n.nodeType !== 3) { return; }
      if (!e.dataset.mkOrig) { e.dataset.mkOrig = n.nodeValue; }
      const orig = e.dataset.mkOrig, m = orig.match(/^(\\S+) · (.*)$/);
      if (!m || !T[m[1]]) { return; }
      const r = T[m[1]];
      const head = lang === "ja" ? m[1] : lang === "en" ? r[0] : lang === "zh" ? r[1] : lang === "ko" ? r[3] : "";
      n.nodeValue = (head ? head + " · " : "") + m[2];
      e.setAttribute("lang", ${JSON.stringify(LANG_ATTR)}[lang] || "vi");
    }); return 1;`);
}

module.exports = {
  // 1. ⚙ → Tiếng trong vườn (hàng mới + danh sách chọn đang mở)
  async caidat(c) {
    await c.scene('yard'); await c.sky(9);
    await c.js(`document.getElementById("kb-sound").click(); return 1;`); await c.sleep(500);
    await c.js(`const pop = document.getElementById("kb-sound-pop"), M = Mock132;
      pop.querySelectorAll(".mk-x").forEach((e) => e.remove());
      const hs = Array.from(pop.querySelectorAll(".kb-set-h")), other = hs[hs.length - 1];
      const h = M.el("div", "kb-set-h mk-x", "Tiếng trong vườn"); pop.insertBefore(h, other);
      const row = M.el("label", "mk-x mk-hl"); row.style.display = "block";
      row.appendChild(document.createTextNode("StackChan nói, đồ vật, sinh hoạt: "));
      const s = M.el("select", "mk-x"); const o = M.el("option", null, "Tự theo deck · đang: Tiếng Nhật"); s.appendChild(o); row.appendChild(s);
      pop.insertBefore(row, other);
      const note = M.el("div", "kb-sound-note mk-x", "Gồm câu StackChan nói, sinh hoạt, đồ nhặt, khách ghé, tường / sàn, tên mùa. Thẻ và báo không đổi; trò chơi theo tiếng của deck đang chơi. Đổi lúc nào cũng được, không mất gì.");
      pop.insertBefore(note, other);
      const r = s.getBoundingClientRect(), pr = pop.getBoundingClientRect();
      const dd = M.el("div", "mk-dd mk-x"); dd.style.position = "fixed"; dd.style.left = (pr.right + 10) + "px"; dd.style.top = (r.top - 8) + "px";
      [["Tự theo deck", "đang: Tiếng Nhật", 1], ["Tiếng Nhật", "日本語"], ["Tiếng Anh", "English"], ["Tiếng Trung", "中文 · có pinyin"],
       ["Tiếng Hàn", "한국어 · có phiên âm"], ["Chỉ tiếng Việt", ""]].forEach(([a, b, on]) => {
        const d = M.el("div", on ? "on" : null, a); if (b) { d.appendChild(M.el("small", null, b)); } dd.appendChild(d); });
      document.body.appendChild(dd); return 1;`);
    await c.sleep(300);
    const r = await c.rect('#kb-sound-pop');
    await c.shot('132_01_cai_dat', { x: r.x - 20, y: 0, width: r.width + 330, height: Math.min(c.H, r.y + r.height + 20) });
    await c.js(`Mock132.clear(); document.getElementById("kb-sound").click(); return 1;`);
  },

  // 2. Bấm StackChan đang đọc sách: thẻ sinh hoạt ở 5 tiếng
  async sinhhoat(c) {
    const t = await tables(c);
    await c.scene('house'); await c.sky(20);
    await c.js(`GardenLife._force("hon", "room"); return 1;`); await c.sleep(2500);
    await c.js(`GardenLife._snap(); return 1;`); await c.sleep(1200);
    for (const lang of ['ja', 'en', 'zh', 'ko', 'vi']) {
      await c.js(`const c0 = document.getElementById("kb-life-card"); if (c0) c0.hidden = true;
        document.getElementById("kb-life-chip").click(); return 1;`);
      await c.sleep(400);
      const [txt, rd] = pick(t.ACTS.hon, lang);
      await c.js(`const card = document.getElementById("kb-life-card"), lang = ${JSON.stringify(lang)};
        const ja = card.querySelector(".kb-find-ja"), kv = card.querySelector(".kb-find-kana");
        if (lang === "vi") { ja.textContent = "Đọc sách"; ja.setAttribute("lang", "vi"); kv.remove(); }
        else if (lang !== "ja") {
          ja.textContent = ${JSON.stringify(txt)}; ja.setAttribute("lang", ${JSON.stringify(LANG_ATTR)}[lang]);
          kv.textContent = "";
          if (${JSON.stringify(rd)}) { const s = kv.appendChild(document.createElement("span")); s.textContent = ${JSON.stringify(rd)}; kv.appendChild(document.createTextNode(" · đọc sách")); }
          else { kv.textContent = "đọc sách"; }
        }
        return 1;`);
      await c.sleep(250);
      const r = await c.rect('#kb-life-card');
      await c.shot('raw_sinhhoat_' + lang, c.pad(r, 12));
    }
    // ảnh nền: cả nhà, StackChan đang đọc sách, thẻ tiếng Trung
    await c.shot('raw_sinhhoat_nen');
    await c.js(`GardenLife.closeCard(); return 1;`);
  },

  // 3. StackChan nói (bong bóng cạnh linh vật) ở 5 tiếng
  async noi(c) {
    const t = await tables(c);
    await c.scene('yard'); await c.sky(9);
    const lines = [['いいね！', '', 'Hay lắm!'], ['雨だ！', ' Mưa rồi, cây được tưới miễn phí ♪', '']];
    for (let i = 0; i < lines.length; i++) {
      const [ja, rest] = lines[i];
      const row = t.SAY[ja];
      for (const lang of ['ja', 'en', 'zh', 'ko', 'vi']) {
        let html;
        const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
        if (lang === 'ja') { html = esc(ja + rest); }
        else if (lang === 'vi') { html = esc((row[4] || '') + (row[4] ? '' : rest.trim())); }
        else if (lang === 'zh') { html = esc(row[1]) + ' <span class="mk-py" style="font-size:.8em;opacity:.75">' + esc(row[2]) + '</span>' + esc(rest); }
        else { html = esc(lang === 'en' ? row[0] : row[3]) + esc(rest); }
        await c.js(`GardenFX.say("x", 60000); const s = document.querySelector(".kb-say, #kb-say, .kb-mascot-say");
          const b = document.getElementById("kb-say") || s; b.innerHTML = ${JSON.stringify(html)}; b.setAttribute("lang", ${JSON.stringify(LANG_ATTR)}[${JSON.stringify(lang)}]); b.hidden = false; return 1;`);
        await c.sleep(300);
        const r = await c.rect('#kb-say');
        await c.shot('raw_noi_' + i + '_' + lang, { x: 8, y: r.y - 70, width: Math.max(r.width + 40, 260), height: r.height + 82 });
      }
    }
  },

  // 4. Sổ sinh hoạt bằng tiếng Trung
  async so(c) {
    await c.js(`const s0 = document.getElementById("kb-say"); if (s0) s0.hidden = true; GardenSeason.preview("momiji"); return 1;`);
    const t = await tables(c);
    await c.scene('house'); await c.sky(10);
    await c.js(`const d = Garden._data(), T = ${JSON.stringify(t.ACTS)};
      (d.life.groups || []).forEach((g) => g.list.forEach((it) => { const r = T[it.id]; if (r) { it.ja = r[1]; it.kana = r[2]; } }));
      GardenHome.openLife(); return 1;`);
    await c.sleep(900);
    await setTitles(c, 'zh');
    await c.js(`document.querySelectorAll("#kb-home .kb-box-ja, #kb-home .kb-box-kana").forEach((e) => e.setAttribute("lang", "zh-CN"));
      document.querySelectorAll("#kb-home .kb-h-desc").forEach((e) => { e.textContent = e.textContent.replace("kèm một câu tiếng Nhật", "kèm một câu tiếng Trung (có pinyin)"); });
      return 1;`);
    await c.sleep(300);
    await c.shot('132_04_so_sinh_hoat_trung');
    await c.js(`GardenHome.close(); return 1;`); await c.sleep(500);
  },

  // 5. Hộp sưu tầm bằng tiếng Hàn
  async hop(c) {
    await c.js(`const s0 = document.getElementById("kb-say"); if (s0) s0.hidden = true; GardenSeason.preview("momiji"); return 1;`);
    const t = await tables(c);
    await c.scene('yard'); await c.sky(10);
    await c.js(`GardenHome.openBox(); return 1;`); await c.sleep(1200);
    await setTitles(c, 'ko');
    await c.js(`const T = ${JSON.stringify(t.FINDS)};
      document.querySelectorAll("#kb-home .kb-box-cell.is-found").forEach((cell) => {
        const r = T[cell.getAttribute("data-find")]; if (!r) { return; }
        const ja = cell.querySelector(".kb-box-ja"), kn = cell.querySelector(".kb-box-kana");
        ja.textContent = r[3]; ja.setAttribute("lang", "ko"); kn.textContent = r[4]; kn.setAttribute("lang", "ko-Latn");
      });
      window.scrollTo(0, 0); document.scrollingElement.scrollTop = 0;
      return 1;`);
    await c.sleep(300);
    await c.shot('132_05_hop_suu_tam_han');
    await c.js(`GardenHome.close(); return 1;`); await c.sleep(500);
  },

  // 6. Album khách bằng tiếng Anh
  async khach(c) {
    await c.js(`const s0 = document.getElementById("kb-say"); if (s0) s0.hidden = true; GardenSeason.preview("momiji"); return 1;`);
    const t = await tables(c);
    await c.js(`GardenHome.openGuests(); return 1;`); await c.sleep(1200);
    await setTitles(c, 'en');
    await c.js(`const T = ${JSON.stringify(t.GUESTS)};
      document.querySelectorAll("#kb-home .kb-h-guestcard").forEach((card) => {
        const r = T[card.getAttribute("data-guest")], s = card.querySelector(".kb-h-guest-ja"); if (!r || !s) { return; }
        s.textContent = r[0]; s.setAttribute("lang", "en");
      }); return 1;`);
    await c.sleep(300);
    await c.shot('132_06_khach_anh');
    await c.js(`GardenHome.close(); return 1;`); await c.sleep(500);
  },
};
module.exports.xemtruong = async function (c) {
  await c.js(`const s = document.getElementById("kb-say"); if (s) s.hidden = true; return 1;`);
  await c.deck('Tiếng Trung::HSK 1');
  await c.js(`document.getElementById("kb-fields-open").click(); return 1;`); await c.sleep(1500);
  await c.shot('raw_truong');
  await c.js(`document.getElementById("kb-f-exit") && document.getElementById("kb-f-exit").click(); return 1;`);
};
// 7. Cấu hình trường: deck tiếng Trung / tiếng Hàn nhận đúng ngôn ngữ
async function fieldsMock(c, o) {
  await c.js(`const s = document.getElementById("kb-say"); if (s) s.hidden = true; const n = document.getElementById("kb-toast"); if (n) n.hidden = true; return 1;`);
  await c.deck(o.deck);
  await c.js(`document.getElementById("kb-fields-open").click(); return 1;`); await c.sleep(1500);
  await setTitles(c, o.ui);
  await c.js(`const o = ${JSON.stringify(o)}, M = Mock132;
    const box = document.querySelector(".kb-f-edit");
    const info = box.querySelector(".kb-f-info"); if (info) { info.textContent = o.info; }
    const ls = box.querySelector(".kb-f-lang"); ls.innerHTML = ""; const lo = M.el("option", null, o.langName); ls.appendChild(lo);
    const ks = box.querySelector(".kb-f-kindsel"); ks.innerHTML = ""; ks.appendChild(M.el("option", null, o.kindName));
    ls.classList.add("mk-hl");
    const t = box.querySelector(".kb-f-table");
    Array.from(t.children).slice(3).forEach((e) => e.remove());
    o.rows.forEach(([lab, hint, req, fld, val, hl]) => {
      const L = M.el("div", "kb-f-role" + (req ? " is-req" : "")); L.appendChild(M.el("span", null, lab + (req ? " *" : ""))); L.appendChild(M.el("span", "kb-f-hint", hint));
      const S = M.el("select", "kb-f-select"); S.appendChild(M.el("option", null, fld || "(không có)"));
      const V = M.el("div", "kb-f-val", val || ""); if (o.attr && val) { V.setAttribute("lang", o.attr); }
      if (hl) { L.classList.add("mk-hl"); }
      t.appendChild(L); t.appendChild(S); t.appendChild(V);
    });
    const pv = box.querySelector(".kb-f-preview"); if (pv) { pv.textContent = o.preview; }
    const g = box.querySelector(".kb-f-games"); g.querySelectorAll(".kb-f-game").forEach((e) => e.remove());
    o.games.forEach(([ok, name, why]) => { const ch = M.el("span", "kb-f-game " + (ok ? "is-ok" : "is-no"), (ok ? "✓ " : "✗ ") + name); if (why) { ch.appendChild(M.el("span", "kb-f-why", " (" + why + ")")); } g.appendChild(ch); });
    const sv = document.getElementById("kb-f-save"); if (sv) { sv.textContent = "Lưu cấu hình"; }
    const r = ls.getBoundingClientRect();
    const tr = t.getBoundingClientRect();
    const dd = M.el("div", "mk-dd mk-x"); dd.style.position = "fixed"; dd.style.left = (tr.right - 330) + "px"; dd.style.top = (r.top - 4) + "px";
    [["Tiếng Nhật", ""], ["Tiếng Anh", ""], ["Tiếng Trung", "mới"], ["Tiếng Hàn", "mới"], ["Ngôn ngữ khác", "chỉ vườn + trò chơi cơ bản"]].forEach(([a, b]) => {
      const d = M.el("div", a === o.langName ? "on" : null, a); if (b) { d.appendChild(M.el("small", null, b)); } dd.appendChild(d); });
    document.body.appendChild(dd);
    return 1;`);
  await c.sleep(400);
  await c.shot(o.out);
  await c.js(`Mock132.clear(); const x = document.getElementById("kb-f-exit"); if (x) x.click(); return 1;`); await c.sleep(600);
}
module.exports.truong = async function (c) {
  await fieldsMock(c, { deck: 'Tiếng Trung::HSK 1', ui: 'zh', out: '132_07_cau_hinh_trung', attr: 'zh-CN', langName: 'Tiếng Trung', kindName: 'Từ vựng 词汇',
    info: 'Đã điền sẵn — nhận ra deck tiếng Trung (chữ giản thể, có trường Pinyin). Kiểm tra rồi bấm Lưu.',
    rows: [['Từ (chữ Hán)', 'Chữ hiện trên biển cây · giản thể hoặc phồn thể', true, 'Hanzi', '你好'],
      ['Pinyin', 'nǐ hǎo · deck ghi số (ni3 hao3) cũng được', false, 'Pinyin', 'nǐ hǎo', true],
      ['Nghĩa', 'Nghĩa tiếng Việt', true, 'Nghĩa', 'xin chào'],
      ['Hán Việt (nếu có)', 'NHĨ HẢO · hiện cạnh nghĩa, có trò Hán Việt', false, 'Hán Việt', 'NHĨ HẢO', true],
      ['Câu ví dụ', 'Dùng cho Điền vào câu và chép chính tả', false, '', ''],
      ['Dịch câu ví dụ', 'Hiện làm gợi ý khi điền vào câu', false, '', ''],
      ['Audio của từ', 'Không có thì đọc bằng giọng tiếng Trung của máy', false, '', ''],
      ['Audio câu ví dụ', 'Đọc cả câu sau khi điền đúng', false, '', '']],
    preview: 'Trên cây: 你好 nǐ hǎo · NHĨ HẢO — xin chào',
    games: [[1, 'Nghe tìm cây', ''], [1, 'Chợ sáng', ''], [1, 'Đuổi quạ', ''], [1, 'Lật cặp', ''], [0, 'Điền vào câu', 'cần câu ví dụ chứa đúng từ đó']] });
  await fieldsMock(c, { deck: 'Tiếng Hàn::Sơ cấp 1', ui: 'ko', out: '132_08_cau_hinh_han', attr: 'ko', langName: 'Tiếng Hàn', kindName: 'Từ vựng 단어',
    info: 'Đã điền sẵn — nhận ra deck tiếng Hàn (chữ Hangul, có trường Romaja). Kiểm tra rồi bấm Lưu.',
    rows: [['Từ (Hangul)', 'Chữ hiện trên biển cây', true, 'Korean', '안녕하세요'],
      ['Phiên âm (romaja)', 'Nếu deck có, vd. annyeonghaseyo', false, 'Romaja', 'annyeonghaseyo', true],
      ['Nghĩa', 'Nghĩa tiếng Việt', true, 'Nghĩa', 'xin chào'],
      ['Hán Việt (nếu có)', '학교 (學校) → HỌC HIỆU', false, '', '', true],
      ['Câu ví dụ', 'Dùng cho Điền vào câu và chép chính tả', false, '', ''],
      ['Dịch câu ví dụ', 'Hiện làm gợi ý khi điền vào câu', false, '', ''],
      ['Audio của từ', 'Không có thì đọc bằng giọng tiếng Hàn của máy', false, '', ''],
      ['Audio câu ví dụ', 'Đọc cả câu sau khi điền đúng', false, '', '']],
    preview: 'Trên cây: 안녕하세요 annyeonghaseyo — xin chào',
    games: [[1, 'Nghe tìm cây', ''], [1, 'Chợ sáng', ''], [1, 'Đuổi quạ', ''], [1, 'Lật cặp', ''], [0, 'Điền vào câu', 'cần câu ví dụ chứa đúng từ đó']] });
};

// 8. Bấm cây tiếng Trung / tiếng Hàn: pinyin nằm trên chữ như furigana, Hán Việt cạnh nghĩa
async function pinMock(c, o) {
  await c.deck(o.deck); await c.scene('yard'); await c.sky(10);
  await setTitles(c, o.ui);
  const pos = await c.js(`const d = Garden._data(), L = Garden._layout(), cv = document.getElementById("kb-canvas").getBoundingClientRect();
    const i = d.plants.findIndex((p) => p.word === ${JSON.stringify(o.word)}); if (i < 0) return null;
    const cw = 18 * L.scale, ch = 20 * L.scale; return [cv.left + (i % L.cols) * cw + cw / 2, cv.top + Math.floor(i / L.cols) * ch + ch * 0.6];`);
  if (!pos) { console.log('  không thấy cây', o.word); return; }
  for (const type of ['mousePressed', 'mouseReleased']) { await c.page.send('Input.dispatchMouseEvent', { type, x: pos[0], y: pos[1], button: 'left', clickCount: 1 }); }
  await c.sleep(500);
  await c.js(`const o = ${JSON.stringify(o)};
    const w = document.getElementById("kb-pin-word"); w.innerHTML = o.ruby; w.setAttribute("lang", o.attr); w.classList.add("mk-ruby");
    const rd = document.getElementById("kb-pin-reading"); rd.textContent = o.reading; rd.hidden = !o.reading;
    document.getElementById("kb-pin-meaning").textContent = o.meaning;
    const pl = document.getElementById("kb-pin-play"); pl.hidden = false; pl.textContent = "♪ Nghe (giọng máy)";
    return 1;`);
  await c.sleep(300);
  const r = await c.rect('#kb-pin');
  await c.shot(o.out, { x: Math.max(0, r.x - 180), y: Math.max(0, r.y - 60), width: r.width + 360, height: r.height + 120 });
  await c.js(`document.getElementById("kb-pin-x").click(); return 1;`);
}
module.exports.ghim = async function (c) {
  await pinMock(c, { deck: 'Tiếng Trung::HSK 1', ui: 'zh', word: '学生', attr: 'zh-CN', out: 'raw_ghim_zh',
    ruby: '<ruby>学<rt>xué</rt>生<rt>sheng</rt></ruby>', reading: '', meaning: 'HỌC SINH · học sinh' });
  await pinMock(c, { deck: 'Tiếng Hàn::Sơ cấp 1', ui: 'ko', word: '학교', attr: 'ko', out: 'raw_ghim_ko',
    ruby: '학교', reading: 'hakgyo', meaning: 'trường học' });
};

// 9. Đuổi quạ với deck tiếng Trung: Nghĩa → gõ pinyin (số thanh hoặc không dấu)
module.exports.qua = async function (c) {
  await c.deck('Tiếng Trung::HSK 1'); await c.scene('yard'); await c.sky(10);
  await c.js(`document.getElementById("kb-games").click(); return 1;`); await c.sleep(900);
  await c.shot('raw_menu_zh');
  await c.js(`localStorage.setItem("kb-crow-speed", "vslow"); document.querySelector('.kb-gcard[data-game="crow"]').click(); return 1;`);
  await c.sleep(4200);
  await c.js(`const M = Mock132;
    const t = document.querySelector("#kb-game .kb-g-title, .kb-g-title:not([hidden])");
    document.querySelectorAll(".kb-g-title").forEach((e) => { if (/カラス追い/.test(e.textContent)) { e.textContent = "赶乌鸦 · Đuổi quạ · Nghĩa → gõ pinyin"; e.setAttribute("lang", "zh-CN"); } });
    const inp = document.querySelector(".kb-gc-input");
    inp.placeholder = "Gõ pinyin… (xia4yu3, xiayu hay xià yǔ đều được)";
    const NUM = {"你好": ["ni3hao3", "nǐ hǎo"], "谢谢": ["xie4xie", "xièxie"], "学生": ["xue2sheng", "xuésheng"], "老师": ["lao3shi1", "lǎoshī"],
      "朋友": ["peng2you", "péngyou"], "吃饭": ["chi1fan4", "chī fàn"], "喝茶": ["he1cha2", "hē chá"], "看书": ["kan4shu1", "kàn shū"],
      "学习": ["xue2xi2", "xuéxí"], "天气": ["tian1qi4", "tiānqì"], "下雨": ["xia4yu3", "xià yǔ"], "花": ["hua1", "huā"], "水": ["shui3", "shuǐ"],
      "猫": ["mao1", "māo"], "狗": ["gou3", "gǒu"], "家": ["jia1", "jiā"], "医院": ["yi1yuan4", "yīyuàn"], "飞机": ["fei1ji1", "fēijī"],
      "电脑": ["dian4nao3", "diànnǎo"], "中国": ["zhong1guo2", "Zhōngguó"], "今天": ["jin1tian1", "jīntiān"], "明天": ["ming2tian1", "míngtiān"],
      "喜欢": ["xi3huan", "xǐhuan"], "漂亮": ["piao4liang", "piàoliang"]};
    const f = (GardenGames._debug().flying || [])[0] || {}, w = f.word || "下雨", pz = NUM[w] || ["xia4yu3", "xià yǔ"];
    inp.value = pz[0]; inp.classList.add("mk-hl");
    const r = inp.getBoundingClientRect();
    const chip = M.el("div", "mk-x mk-tag"); chip.style.background = "#2f7d4a"; chip.style.left = (r.right - 230) + "px"; chip.style.top = (r.top + 8) + "px";
    chip.style.fontSize = "16px"; chip.textContent = "→ " + pz[1] + "  " + w + " ✓"; chip.setAttribute("lang", "zh-CN");
    document.body.appendChild(chip);
    return 1;`);
  await c.sleep(300);
  await c.shot('132_10_duoi_qua_pinyin');
  await c.js(`Mock132.clear(); GardenGames.close(); return 1;`);
};
