// 1.34.1 (kiểm tra lần cuối, 17/11) trong Anki thật — kịch bản NGOÀI e2e_132 / e2e_132b:
//   1. deck "bẩn" như ngoài đời: pinyin tô màu bằng HTML (add-on Chinese Support), nhiều cách đọc ghi bằng dấu câu Trung /
//      ngoặc (hǎo，hào · xíng（háng） · hái、huán); deck tiếng Hàn có dấu cách (사과 주스); deck tiếng Nhật làm cho người
//      Trung có trường nghĩa "中文"; deck kanji có trường "Chinese reading" (âm On); deck tiếng Đức; deck chỉ 1 thẻ
//   2. ngôn ngữ của cây, trường lấy ra, Ngôn ngữ trong vườn (Tự theo deck), deck chọn cho báo tiếng Anh
//   3. Đuổi quạ: gõ pinyin của cách đọc thứ hai; gõ nghĩa tiếng Việt kiểu tổ hợp (Unikey "Unicode tổ hợp"); gõ chữ Hàn
//      viết liền; bộ gõ đang ghép chữ (CDP Input.imeSetComposition) → chưa chấm, chốt chữ → đuổi được, ô gõ không còn
//      chữ thừa
//   4. deck 1 thẻ: mở từng trò không lỗi JS / Python
// Chạy: KB_SCRIPTS=e2e_132c.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_132c';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
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
async function waitFor(expr, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
async function deck(name) {
  await py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`);
  await sleep(1800);
}
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await js('window.__errs = []; window.addEventListener("error", (e) => window.__errs.push(String(e.message))); return 1;');
  await sleep(600);
}
const plants = () => js('return Garden._data().plants.map((p) => ({ word: p.word, lang: p.lang, reading: p.reading, meaning: p.meaning, hanviet: p.hanviet || "" }));');
async function crow(group, mode) {
  await py(KB + `kb.FIELDS.set_game("crow", ${JSON.stringify(group)}, ${JSON.stringify(mode)}); kb._dialog.refresh(); result = 1`); await sleep(1500);
  await js('if (typeof GardenGames !== "undefined") GardenGames.close(); document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js('localStorage.setItem("kb-crow-speed", "vslow"); document.querySelector(\'.kb-gcard[data-game="crow"]\').click(); return 1;');
  return waitFor('return GardenGames._debug().flying && GardenGames._debug().flying.length > 0', 12000);
}
const dbg = () => js('return GardenGames._debug();');

const ZH = [
  ['好', '<span class="tone3">hǎo</span>，<span class="tone4">hào</span>', 'tốt; thích', 'HẢO', 'hao4'],
  ['行', 'xíng（háng）', 'được; hàng', 'HÀNH', 'hang2'],
  ['还', 'hái、huán', 'còn; trả lại', 'HOÀN', 'huan2'],
  ['你好', '<span class="tone3">nǐ</span>&nbsp;<span class="tone3">hǎo</span>', 'xin chào', 'NHĨ HẢO', 'ni3hao3'],
  ['谢谢', 'xièxie', 'cảm ơn', 'TẠ TẠ', 'xie4xie'],
  ['学生', 'xuésheng', 'học sinh', 'HỌC SINH', 'xue2sheng'],
];
const KO = [['사과 주스', 'sagwa juseu', 'nước táo'], ['커피 한 잔', 'keopi han jan', 'một cốc cà phê'], ['학교', 'hakgyo', 'trường học'],
  ['고양이', 'goyangi', 'con mèo'], ['날씨', 'nalssi', 'thời tiết'], ['바다', 'bada', 'biển']];
const JA_ZH = [['食べる', 'たべる', '吃'], ['飲む', 'のむ', '喝'], ['大きい', 'おおきい', '大'], ['学生', 'がくせい', '学生'],
  ['先生', 'せんせい', '老师'], ['友達', 'ともだち', '朋友']];
const RTK = [['日', 'sun', 'ニチ', 'ひ'], ['月', 'moon', 'ゲツ', 'つき'], ['山', 'mountain', 'サン', 'やま'], ['水', 'water', 'スイ', 'みず']];
const DE = [['der Hund', 'con chó'], ['die Katze', 'con mèo'], ['das Haus', 'ngôi nhà'], ['gehen', 'đi'], ['schön', 'đẹp'], ['lernen', 'học']];

(async () => {
  await py(KB + `col = mw.col
def model(name, fields):
    mm = col.models
    m = mm.new(name)
    for f in fields:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = "{{%s}}" % fields[0]; t["afmt"] = "{{FrontSide}}<hr id=answer>{{%s}}" % fields[-1]
    mm.add_template(m, t); mm.add(m); return mm.by_name(name)
def add(m, deck, rows, fields):
    did = col.decks.id(deck)
    for row in rows:
        n = col.new_note(m)
        for f, v in zip(fields, row):
            n[f] = v
        col.add_note(n, did)
F = {"zh": ["Hanzi", "Pinyin", "Meaning", "Hán Việt"], "ko": ["Korean", "Romaja", "Nghĩa"], "jz": ["単語", "読み", "中文"],
     "rtk": ["Kanji", "Keyword", "Chinese reading", "Japanese reading"], "de": ["Deutsch", "Nghĩa"]}
add(model("Chinese (Support)", F["zh"]), "ZH::Bẩn", ${JSON.stringify(ZH.map((r) => r.slice(0, 4)))}, F["zh"])
add(model("Korean (có dấu cách)", F["ko"]), "KO::Cụm từ", ${JSON.stringify(KO)}, F["ko"])
add(model("日语单词", F["jz"]), "JA::Cho người Trung", ${JSON.stringify(JA_ZH)}, F["jz"])
add(model("Kanji (RTK)", F["rtk"]), "JA::Kanji RTK", ${JSON.stringify(RTK)}, F["rtk"])
add(model("Deutsch A1", F["de"]), "DE::A1", ${JSON.stringify(DE)}, F["de"])
add(col.models.by_name("Chinese (Support)"), "ZH::Một thẻ", [["猫", "māo", "con mèo", "MIÊU"]], F["zh"])
today = col.sched.today
for i, cid in enumerate(col.find_cards('deck:"ZH::*" or deck:"KO::*" or deck:"JA::Cho người Trung" or deck:"JA::Kanji RTK" or deck:"DE::*"')):
    col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3 where id=?", 5 + i, today + 3, cid)
kb.save_config(show_tooltips=False, sound=False, music=False)
result = 1`);
  await openGarden();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }

  console.log('== 1. deck "bẩn": ngôn ngữ của cây, trường lấy ra');
  await deck('ZH::Bẩn');
  let ps = await plants();
  const hao = ps.find((p) => p.word === '好'), nh = ps.find((p) => p.word === '你好');
  ok(ps.length === 6 && ps.every((p) => p.lang === 'zh'), 'deck tiếng Trung (pinyin tô màu bằng HTML): cây là tiếng Trung');
  ok(hao && hao.reading === 'hǎo，hào' && nh && nh.reading === 'nǐ hǎo', 'pinyin bỏ thẻ HTML / &nbsp;: ' + (hao && hao.reading) + ' · ' + (nh && nh.reading));
  ok(await js('return GardenLang.cur();') === 'zh', 'Tự theo deck → tiếng Trung');
  await deck('JA::Cho người Trung');
  ps = await plants();
  ok(ps.length === 6 && ps.every((p) => p.lang === 'ja') && ps.find((p) => p.word === '食べる').reading === 'たべる',
    'deck tiếng Nhật có trường nghĩa "中文" → tiếng Nhật, cách đọc たべる (trước 1.34.1: tiếng Trung)');
  ok(await js('return GardenLang.cur();') === 'ja', 'Tự theo deck → tiếng Nhật');
  await js('document.getElementById("kb-fields-open").click(); return 1;'); await sleep(1500);
  const fz = await js('const b = document.querySelector(".kb-f-edit"); return b ? b.querySelector(".kb-f-lang").value : null;');
  ok(fz === 'ja', 'Cấu hình trường gợi ý "Tiếng Nhật" cho loại note 日语单词');
  await js('const x = document.getElementById("kb-f-exit"); if (x) x.click(); return 1;'); await sleep(600);
  await deck('JA::Kanji RTK');
  ps = await plants();
  ok(ps.length === 4 && ps.every((p) => p.lang === 'ja') && ps.map((p) => p.word).sort().join('') === ['日', '月', '山', '水'].sort().join(''),
    'deck kanji có trường "Chinese reading" → tiếng Nhật, biển cây là chữ Hán (' + ps.map((p) => p.word).join(' ') + '), không phải âm On');
  await deck('DE::A1');
  ps = await plants();
  ok(ps.length === 6 && ps.every((p) => p.lang === 'other'), 'deck tiếng Đức → Ngôn ngữ khác (trước 1.34.1: Tiếng Anh): ' + ps.map((p) => p.lang).join(','));
  ok(await js('return GardenLang.cur();') !== 'en', 'Tự theo deck không thành tiếng Anh vì deck tiếng Đức: ' + await js('return GardenLang.cur();'));
  const ld = await py(KB + 'import importlib\nw = kb.words\nr = w.lang_decks(mw.col, kb.config())\nresult = {k: [d["name"] for d in v] for k, v in r.items()}');
  ok(!(ld.en || []).some((n) => /^DE/.test(n)) && !(ld.en || []).some((n) => /^JA::Cho/.test(n)),
    'báo tiếng Anh không lấy từ deck tiếng Đức / deck tiếng Nhật (deck tiếng Anh: ' + (ld.en || []).join(', ') + ')');
  ok((ld.ja || []).some((n) => n === 'JA::Cho người Trung'), 'deck tiếng Nhật có trường 中文 có trong danh sách báo tiếng Nhật');
  await deck('KO::Cụm từ');
  ps = await plants();
  ok(ps.length === 6 && ps.every((p) => p.lang === 'ko'), 'deck tiếng Hàn có cụm từ → tiếng Hàn');

  console.log('== 2. Đuổi quạ tiếng Trung: gõ pinyin của cách đọc thứ hai');
  await deck('ZH::Bẩn');
  ok(await crow('zh', 'pinyin'), 'Đuổi quạ (Nghĩa → gõ pinyin): quạ bay ra');
  const ans = Object.fromEntries(ZH.map((r) => [r[0], r[4]]));
  await js('document.querySelector(".kb-gc-input").focus(); return 1;');
  let hit = 0; const tried = [];
  for (let t0 = Date.now(); tried.length < 3 && Date.now() - t0 < 60000;) {
    const d = await dbg();
    const c = (d.flying || [])[0];
    if (!c) { await sleep(800); continue; }
    const before = d.scared;
    await page.type(ans[c.word]); await sleep(500);
    const after = (await dbg()).scared;
    tried.push(c.word + '=' + ans[c.word] + (after > before ? ' ✓' : ' ✗'));
    if (after > before) { hit++; } else { await js('document.querySelector(".kb-gc-input").value = ""; return 1;'); }
    await sleep(1200);
  }
  ok(hit >= 3 && hit === tried.length, 'gõ pinyin (cả cách đọc ghi sau dấu ，、（）) đuổi được quạ: ' + tried.join(' · '));
  await page.shot(SHOTS + '/132c_01_pinyin_hai_cach_doc.png');

  console.log('== 3. Đuổi quạ tiếng Trung: gõ nghĩa tiếng Việt kiểu tổ hợp');
  ok(await crow('zh', 'answer'), 'Đuổi quạ (Chữ → gõ nghĩa): quạ bay ra');
  const meanings = Object.fromEntries(ZH.map((r) => [r[0], r[2].split(';')[0].trim()]));
  await js('document.querySelector(".kb-gc-input").focus(); return 1;');
  hit = 0; tried.length = 0;
  for (let t0 = Date.now(); tried.length < 3 && Date.now() - t0 < 60000;) {
    const d = await dbg();
    const c = (d.flying || [])[0];
    if (!c) { await sleep(800); continue; }
    const before = d.scared;
    const nfd = meanings[c.word].normalize('NFD');
    await page.type(nfd); await sleep(500);
    const after = (await dbg()).scared;
    tried.push(c.word + ' → ' + meanings[c.word] + (nfd !== meanings[c.word] ? ' (tổ hợp)' : '') + (after > before ? ' ✓' : ' ✗'));
    if (after > before) { hit++; } else { await js('document.querySelector(".kb-gc-input").value = ""; return 1;'); }
    await sleep(1200);
  }
  ok(hit === tried.length && hit >= 3, 'gõ nghĩa bằng bộ gõ kiểu tổ hợp đuổi được quạ: ' + tried.join(' · '));

  console.log('== 4. Đuổi quạ tiếng Hàn: viết liền, bộ gõ đang ghép chữ');
  await deck('KO::Cụm từ');
  ok(await crow('ko', 'spell'), 'Đuổi quạ (Nghĩa → gõ chữ Hàn): quạ bay ra');
  await js('document.querySelector(".kb-gc-input").focus(); return 1;');
  // a) gõ liền cụm có dấu cách
  let d0 = await dbg();
  let c0 = (d0.flying || [])[0];
  const typedK = c0.word.replace(/ /g, '');
  await page.type(typedK); await sleep(500);
  let d1 = await dbg();
  ok(d1.scared === d0.scared + 1, 'gõ "' + typedK + '" cho từ "' + c0.word + '" → đuổi được' + (c0.word.includes(' ') ? ' (viết liền)' : ''));
  await sleep(1500);
  // b) bộ gõ đang ghép chữ: chưa chấm; chốt chữ → đuổi được, ô gõ trống
  for (let k = 0; k < 10 && !((await dbg()).flying || []).length; k++) { await sleep(800); }
  d0 = await dbg(); c0 = (d0.flying || [])[0];
  const w = c0.word.replace(/ /g, '');
  await page.send('Input.imeSetComposition', { text: w, selectionStart: w.length, selectionEnd: w.length });
  await sleep(600);
  const mid = await js('const i = document.querySelector(".kb-gc-input"); return { v: i.value, s: GardenGames._debug().scared };');
  ok(mid.s === d0.scared && mid.v === w, 'đang ghép "' + w + '" (bộ gõ chưa chốt) → chưa chấm, chữ còn trong ô (' + JSON.stringify(mid.v) + ')');
  await page.send('Input.insertText', { text: w }); await sleep(600);
  const end = await js('const i = document.querySelector(".kb-gc-input"); return { v: i.value, s: GardenGames._debug().scared };');
  ok(end.s === d0.scared + 1 && end.v === '', 'chốt chữ → đuổi được quạ, ô gõ trống (không còn chữ thừa): ' + JSON.stringify(end.v));
  await page.shot(SHOTS + '/132c_02_han_bo_go.png');
  await js('GardenGames.close(); return 1;'); await sleep(500);

  console.log('== 5. deck chỉ 1 thẻ: mở từng trò');
  await deck('ZH::Một thẻ');
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  const cards = await js('return Array.from(document.querySelectorAll(".kb-gcard")).map((b) => ({ g: b.getAttribute("data-game"), on: !b.disabled, why: (b.querySelector(".kb-gcard-why") || b).textContent.slice(0, 60) }));');
  ok(cards.length === 5, 'menu có 5 trò: ' + cards.map((c) => c.g + (c.on ? '' : '(khoá)')).join(', '));
  for (const c of cards.filter((x) => x.on)) {
    await js(`document.querySelector('.kb-gcard[data-game="${c.g}"]').click(); return 1;`); await sleep(1800);
    await js('GardenGames.close(); document.getElementById("kb-games").click(); return 1;'); await sleep(800);
  }
  await js('GardenGames.close(); return 1;'); await sleep(400);
  const errs = await js('return window.__errs;');
  ok(!errs.length, 'không lỗi JS trong cả kịch bản' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  const perr = await py(KB + 'result = [e.get("where", "") + ": " + str(e.get("msg", ""))[:80] for e in kb.ERRORS.entries() if e.get("ver") == kb.VERSION]');
  ok(!perr.length, 'nhật ký Báo lỗi trống' + (perr.length ? ': ' + perr.slice(0, 3).join(' | ') : ''));

  console.log('\nKẾT QUẢ: ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
