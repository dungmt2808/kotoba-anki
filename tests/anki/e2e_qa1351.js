// 1.35.1: tập dượt danh sách QA của người dùng (docs/kiem_thu/1.35.1/QA_MAY_THAT.md) trong Anki thật — nhập ĐÚNG bộ thẻ mẫu
// docs/kiem_thu/1.35.1/qa/the_mau_QA_1351.apkg vào hồ sơ mới (như người dùng: File → Import), rồi kiểm từng "kết quả mong
// đợi" ghi trong danh sách: ngôn ngữ mỗi deck tự nhận (Đức / Pháp / Trung / Hàn / Ý = Ngôn ngữ khác), trường câu ví dụ tự
// nhận, mọi thẻ có câu Điền vào câu với ô trống đúng chỗ (kể cả các từ "bẫy"), Ngôn ngữ trong vườn "Tự theo deck" đổi theo
// deck, không lỗi JS / nhật ký lỗi.
// Chạy: KB_SCRIPTS=e2e_qa1351.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_qa1351';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const APKG = path.resolve(__dirname, '..', '..', 'docs', 'kiem_thu', '1.35.1', 'qa', 'the_mau_QA_1351.apkg');
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLang !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
const KB = 'import sys, os, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
const BL = '<span class="kb-blank">　？　</span>';

// từ của deck → câu Điền vào câu phải có (ô trống = "_")
const EXPECT = {
  'Tiếng Đức': ['de', {
    'der Hund, -(e)s, -e': 'Die _ spielen im Garten.', 'der Morgen, -': 'Am _ trinke ich Kaffee.', 'morgen': 'Wir sehen uns _.',
    'aufstehen': 'Er ist um sechs Uhr _.', 'sich freuen': 'Wir _ uns auf das Fest.', 'das Haus, ¨-er': 'Die _ im Dorf sind alt.',
    'die Mutter, ¨': '_ warten vor der Schule.', 'alt': 'Mein Bruder ist _ als ich.', 'gut': 'Das Essen ist heute _.',
    'die Katze, -n': '_ schläft auf dem Sofa.', 'die Straße, -n': '_ ist sehr lang.', 'das Mädchen, -': '_ liest ein Buch.' }],
  'Tiếng Pháp': ['fr', {
    'le lit': 'Le chat dort sur _.', 'lire': 'Il _ un livre le soir.', 'la porte': 'Elle ouvre _.', 'porter': 'Elle _ une robe rouge.',
    "l'été (m)": 'Cet _, il fait très chaud.', 'le papier': "Je n'ai plus de _.", 'se lever': 'Je me _ à sept heures.',
    "s'asseoir": "Il s'est _ près de la fenêtre.", "l'école (f)": 'Les enfants vont à _.', "aujourd'hui": '_, il pleut.',
    "l'œil (m)": 'Il a les _ bleus.', 'le garçon': '_ joue au ballon.' }],
  'Tiếng Trung': ['zh', {
    '家': '我在_吃饭。', '大家': '_好！', '学生': '他是_。', '天气': '今天_很好。', '你好': '_，老师！', '谢谢': '_你！', '喝': '我_茶。', '书': '我看_。' }],
  'Tiếng Hàn': ['ko', {
    '쉬다': '주말에 집에서 _.', '돕다': '친구를 _.', '가다': '학교에 _.', '먹다': '밥을 _.', '학교': '_에서 공부해요.', '사과': '_를 샀어요.',
    '사다': '시장에서 과일을 _.', '친구': '_가 와요.' }],
};

(async () => {
  const n0 = await py(KB + `from anki.collection import ImportAnkiPackageRequest, ImportAnkiPackageOptions
before = mw.col.note_count()
mw.col.import_anki_package(ImportAnkiPackageRequest(package_path=${JSON.stringify(APKG)}, options=ImportAnkiPackageOptions()))
kb.save_config(show_tooltips=False, sound=False, music=False)
result = mw.col.note_count() - before`);
  ok(n0 === 52, 'nhập bộ thẻ mẫu QA: ' + n0 + ' note (5 deck)');
  await py(KB + 'kb.open_garden(); result = 1');
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(600);
  page.errors.length = 0;
  const err0 = await py(KB + 'result = len(kb.ERRORS.entries())');
  const deck = (name) => py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify('QA 1.35.1::' + name)}); d.refresh(); result = d.deck_id`).then(() => sleep(1200));

  console.log('== 1. Ngôn ngữ tự nhận + câu Điền vào câu (từng thẻ của bộ mẫu)');
  for (const [name, [lang, want]] of Object.entries(EXPECT)) {
    await deck(name);
    const plants = await js('return Garden._data().plants.map((p) => ({ w: p.word, lang: p.lang, q: p.cloze ? p.cloze.q : null, ex: p.has_ex, exm: p.ex_meaning }));');
    const langs = [...new Set(plants.map((p) => p.lang))];
    ok(plants.length === Object.keys(want).length && langs.length === 1 && langs[0] === lang,
      name + ': ' + plants.length + ' cây, ngôn ngữ ' + langs.join(',') + ' (cần ' + lang + ')');
    const bad = [];
    plants.forEach((p) => {
      const got = p.q ? p.q.split(BL).join('_').replace(/&#x27;/g, "'").replace(/&amp;/g, '&') : null;
      if (got !== want[p.w]) { bad.push(p.w + ' → ' + got + ' (cần ' + want[p.w] + ')'); }
    });
    ok(!bad.length, name + ': mọi thẻ có câu Điền vào câu, ô trống đúng chỗ' + (bad.length ? ' — ' + bad.slice(0, 3).join(' · ') : ''));
    ok(plants.every((p) => p.ex && p.exm), name + ': tự nhận trường câu ví dụ + bản dịch câu (không phải chọn tay ở Cấu hình trường)');
    // trò Điền vào câu thật (thẻ trò chơi số 5): câu hiện ra là một câu của bảng, ô trống đúng chỗ
    await js('GardenGames.open(); return 1;'); await sleep(900);
    const playable = await js('const b = document.querySelector(\'.kb-gcard[data-game="cloze"]\'); return b && !b.disabled && !b.classList.contains("is-off") ? 1 : 0;');
    await js('const b = document.querySelector(\'.kb-gcard[data-game="cloze"]\'); if (b) b.click(); return 1;'); await sleep(1500);
    const shown = await js('const s = document.querySelector(".kb-gz-sent"); return s ? s.innerHTML : null;');
    const shownTxt = shown ? shown.split(BL).join('_').replace(/&#x27;/g, "'").replace(/&amp;/g, '&') : null;
    ok(playable && shownTxt && Object.values(want).indexOf(shownTxt) >= 0, name + ': trò Điền vào câu chơi được, câu đầu: ' + shownTxt);
    await page.shot(path.join(SHOTS, 'qa_dien_vao_cau_' + lang + '.png'));
    await js('GardenGames.close(); return 1;'); await sleep(600);
    const auto = await js('return GardenLang.cur();');
    const sel = await js('const s = document.getElementById("kb-glang"); if (typeof GardenLang !== "undefined" && GardenLang.syncSelect) GardenLang.syncSelect(); return s && s.options[0] ? s.options[0].textContent : "";');
    ok(/Tự theo deck · đang: Tiếng (Đức|Pháp|Trung|Hàn)/.test(sel), name + ': ⚙ ghi "' + sel + '"');
    ok(auto === lang, name + ': Ngôn ngữ trong vườn "Tự theo deck" → ' + auto);
    await page.shot(path.join(SHOTS, 'qa_' + lang + '.png'));
  }
  await deck('Tiếng Ý (phải là Ngôn ngữ khác)');
  const it = await js('return Garden._data().plants.map((p) => p.lang);');
  ok(it.length === 12 && it.every((l) => l !== 'fr' && l !== 'de' && l !== 'en'), 'Tiếng Ý: không bị nhận là Pháp / Đức / Anh (' + [...new Set(it)].join(',') + ')');
  // Cấu hình trường (bảng thật): ô Ngôn ngữ của loại note tiếng Đức ghi "Tiếng Đức"
  await deck('Tiếng Đức');
  await js('if (typeof GardenFields !== "undefined" && GardenFields.open) { GardenFields.open(); } return 1;'); await sleep(1500);
  const fl = await js('const s = Array.from(document.querySelectorAll("select")).find((x) => x.offsetParent && /Tiếng Đức/.test(x.options[x.selectedIndex] ? x.options[x.selectedIndex].text : "")); return s ? s.options[s.selectedIndex].text : (document.body.innerText.match(/Tiếng Đức/) ? "chữ" : "");');
  await page.shot(path.join(SHOTS, 'qa_cau_hinh_truong_de.png'));
  ok(!!fl, 'Cấu hình trường: loại note tiếng Đức hiện "Tiếng Đức" (' + fl + ')');

  console.log('== 2. Không lỗi');
  const jsErr = page.errors.filter((e) => !/ResizeObserver/.test(e));
  ok(!jsErr.length, 'không lỗi JS' + (jsErr.length ? ' — ' + jsErr.slice(0, 2).join(' | ') : ''));
  const logErr = await py(KB + `result = [e["where"] + ": " + e["msg"] for e in kb.ERRORS.entries()[${err0}:]]`);
  ok(!logErr.length, 'nhật ký lỗi add-on không có lỗi mới' + (logErr.length ? ' — ' + logErr.slice(0, 2).join(' | ') : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total + (pass === total ? ' — TẤT CẢ OK' : ''));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI KỊCH BẢN', e); process.exit(3); });
