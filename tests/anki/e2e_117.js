// 1.17 trong Anki thật: bảng Trò chơi trở lại kiểu 1.15 + drop-down, deck tiếng Anh (cây, Đuổi quạ gõ chính tả,
// Điền vào câu nhận dạng biến đổi, giọng máy en_US, chép chính tả chấm theo từ), Cấu hình trường có Ngôn ngữ,
// furigana kiểu ruby HTML / ngoặc tròn, bỏ Hán Việt khỏi từ vựng.
// Chạy: node e2e_117.js SHOTS
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2];
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenGames !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
async function waitFor(p, expr, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await p.eval(expr)) return true; } catch (e) { } await sleep(300); }
  return false;
}
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
const W = (expr) => '(() => { ' + expr + ' })()';
const lastPlay = async () => (await py('result = [x["tag"] for x in LOG if x["tag"] != "STOP"][-1:]'))[0] || '';
let page;
async function deck(name, extra = '') {
  await py(KB + `
st = kb.PAPER.load(); st["dict"]["day"] = -1; st["queue"] = {}; st["seen"] = []
lib = kb._library()
if lib:
    st["seen"] = ["p:%s:%d" % (d, i) for d in lib.issues() for i in range(len(lib.issue(d)["chinh_ta"]))]
kb.PAPER.save(st)
${extra}
d = kb._dialog
d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)})
d.refresh()
result = d.deck_id`);
  await sleep(1800);
  await page.eval(W('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; if (typeof GardenPaper !== "undefined") GardenPaper.close(); if (typeof GardenFields !== "undefined") GardenFields.close(); return 1;'));
}
const plantsOf = () => page.eval(W('return Garden._data().plants.map(p => ({ w: p.word, r: p.reading, m: p.meaning, hv: p.hanviet, lang: p.lang, kind: p.kind, audio: p.audio, cloze: p.cloze && p.cloze.a }));'));

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1');
  await deck('A::Có câu ví dụ + audio');

  console.log('== bảng Trò chơi kiểu 1.15 + drop-down');
  await page.eval(W('document.getElementById("kb-games").click(); return 1;')); await sleep(900);
  const menu = await page.eval(W(`const cards = Array.from(document.querySelectorAll(".kb-gmenu .kb-gcard")), r = cards.map(c => c.getBoundingClientRect());
    const cell = (id) => document.querySelector('.kb-gcard[data-game="' + id + '"]').parentNode;
    return { n: cards.length, cols: new Set(r.slice(0, 3).map(x => Math.round(x.left))).size, rows: new Set(r.map(x => Math.round(x.top))).size,
      ws: r.map(x => Math.round(x.width)), kindSel: document.querySelectorAll("select.kb-gmenu-kind").length,
      kindOpts: Array.from(document.querySelectorAll("select.kb-gmenu-kind option")).map(o => o.textContent),
      modeSel: document.querySelectorAll("select.kb-gmode-sel").length, speedSel: cell("crow").querySelectorAll("select.kb-gspeed-sel").length,
      speedOpts: cell("crow").querySelectorAll("select.kb-gspeed-sel option").length, chips: document.querySelectorAll(".kb-gmode, .kb-gmenu-kind.kb-btn").length,
      inside: cards.every(c => !c.querySelector("select")), cfg: document.querySelectorAll(".kb-gmenu-cfg").length,
      warn: document.querySelectorAll(".kb-gmenu-warn").length, coins: !!document.querySelector(".kb-gmenu-coins"),
      cut: Array.from(document.querySelectorAll(".kb-gcard-desc")).filter(d => d.scrollHeight > d.clientHeight + 2).length,
      note: (document.querySelector(".kb-gmenu-note") || {}).textContent || "" };`));
  ok(menu.n === 5 && menu.cols === 3 && menu.rows === 2 && Math.max(...menu.ws) - Math.min(...menu.ws) <= 1, 'lưới 3 cột như 1.15: 5 thẻ to, 3 + 2 (' + menu.ws.join(', ') + ')');
  ok(menu.kindSel === 1 && menu.kindOpts.length >= 1 && /Từ vựng · 8 từ/.test(menu.kindOpts[0]), 'loại note là drop-down: ' + JSON.stringify(menu.kindOpts));
  ok(menu.modeSel === 4 && menu.speedSel === 1 && menu.speedOpts === 4 && menu.chips === 0, 'kiểu chơi (4 trò) + tốc độ quạ (4 mức) là drop-down, không còn nút nhỏ');
  ok(menu.inside, 'drop-down nằm dưới thẻ (bấm thẻ là vào game, không lẫn với lựa chọn)');
  ok(menu.cfg === 1 && menu.warn === 0 && !menu.coins && /Xu từ game hôm nay: \d+\/40/.test(menu.note), 'một nút Cấu hình trường, xu game hôm nay ở dòng chú thích');
  ok(menu.cut === 0, 'mô tả trò chơi hiện đủ chữ (không cắt "…")');
  await page.shot(SHOTS + '/50_tro_choi_1366.png');
  const sel = await page.eval(W(`const s = document.querySelector('select.kb-gmode-sel[data-game="market"]'); const v = Array.from(s.options).map(o => o.value).find(x => x !== s.value);
    s.value = v; s.dispatchEvent(new Event("change")); return v;`)); await sleep(800);
  ok(await page.eval(W('return /ミニゲーム/.test(document.getElementById("kb-g-title").textContent);')), 'đổi kiểu chơi ở drop-down: không vào game');
  const saved = await py(KB + 'result = kb.FIELDS.load()["games"].get("market", {}).get("vocab")');
  ok(saved === sel && await page.eval(W(`return document.querySelector('select.kb-gmode-sel[data-game="market"]').value;`)) === sel, 'kiểu chơi đã lưu vào collection (' + saved + ')');
  await page.eval(W('const s = document.querySelector("select.kb-gspeed-sel"); s.value = "slow"; s.dispatchEvent(new Event("change")); return 1;')); await sleep(400);
  ok(await page.eval(W('return localStorage.getItem("kb-crow-speed") === "slow" && document.querySelector("select.kb-gspeed-sel").value === "slow";')), 'tốc độ quạ đổi bằng drop-down');
  await page.eval(W('document.querySelector(\'.kb-gcard[data-game="market"]\').click(); return 1;')); await sleep(900);
  ok(await page.eval(W('return /朝市/.test(document.getElementById("kb-g-title").textContent);')), 'bấm thẻ Chợ sáng: vào game');
  await page.eval(W('GardenGames.close(); return 1;')); await sleep(300);
  await py(KB + 'kb._dialog.resize(1024, 700); result = 1'); await sleep(1300);
  await page.eval(W('document.getElementById("kb-games").click(); return 1;')); await sleep(900);
  const small = await page.eval(W(`const cards = Array.from(document.querySelectorAll(".kb-gmenu .kb-gcard")).map(c => c.getBoundingClientRect());
    const m = document.querySelector(".kb-gmenu");
    return { rows: new Set(cards.map(r => Math.round(r.top))).size, hscroll: m.scrollWidth > m.clientWidth + 1,
      cut: Array.from(document.querySelectorAll(".kb-gcard-text > div")).filter(d => d.scrollWidth > d.clientWidth + 1).length };`));
  ok(small.rows === 2 && !small.hscroll && small.cut === 0, '1024×700: 3 + 2 thẻ, không tràn ngang, chữ không bị cắt');
  await page.shot(SHOTS + '/51_tro_choi_1024.png');
  await page.eval(W('GardenGames.close(); return 1;')); await sleep(300);
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1'); await sleep(1000);

  console.log('== bỏ Hán Việt khỏi từ vựng');
  const roles = await py(KB + 'result = [r["id"] for r in kb.fields_core.kinds_view()[0]["roles"]]');
  ok(roles.indexOf('hanviet') < 0 && roles.indexOf('pos') < 0 && roles.length === 7, 'vai trò của Từ vựng: ' + roles.join(', '));
  await deck('E::Kanji đơn');
  const kan = await plantsOf();
  ok(kan.length === 4 && kan.every(p => p.hv), 'loại Chữ Hán vẫn giữ Hán Việt (' + kan.map(p => p.w + ' ' + p.hv).join(', ') + ')');

  console.log('== furigana: ruby HTML, ngoặc tròn');
  await deck('K::Nhật ruby HTML');
  const ruby = await plantsOf();
  ok(ruby.map(p => p.w + '/' + p.r).join(' ') === '学生/がくせい 先生/せんせい 食べる/たべる 天気/てんき 図書館/としょかん', 'ruby HTML → chữ + cách đọc: ' + ruby.map(p => p.w + '/' + p.r).join(' '));
  ok(ruby.every(p => p.cloze && /<rt>/.test(p.cloze) && /kb-hl/.test(p.cloze)), 'câu ví dụ dạng ruby dùng được cho Điền vào câu');
  await deck('L::Nhật ngoặc tròn');
  const par = await plantsOf();
  ok(par.map(p => p.w + '/' + p.r).join(' ') === '学生/がくせい 先生/せんせい 天気/てんき 賛成(する)/ 図書館/としょかん', 'ngoặc tròn / 【】 / hai dòng: ' + par.map(p => p.w + '/' + p.r).join(' '));

  console.log('== deck tiếng Anh');
  await deck('G::Tiếng Anh đầy đủ', 'kb._en_tts = True\nkb.save_config(dict_voice="may")');
  const en = await plantsOf();
  ok(en.length === 8 && en.every(p => p.lang === 'en' && p.kind === 'vocab'), 'loại note tự nhận là tiếng Anh');
  ok(en[0].w === 'apple' && en[0].r === '/ˈæp.əl/' && en[0].m === 'quả táo', 'cây: apple /ˈæp.əl/ — quả táo');
  ok(en.every(p => p.audio), 'không có audio thì vẫn nghe được bằng giọng tiếng Anh của máy');
  const cl = en.map(p => (p.cloze || '').replace(/.*<b class="kb-hl">(.*?)<\/b>.*/, '$1'));
  ok(cl.join(',') === 'apple,went,studying,stopped,cities,looked up,children,happier', 'Điền vào câu tìm được dạng biến đổi: ' + cl.join(','));
  await page.eval(W('document.getElementById("kb-games").click(); return 1;')); await sleep(900);
  const enMenu = await page.eval(W(`const k = document.querySelector("select.kb-gmenu-kind"); const c = document.querySelector('select.kb-gmode-sel[data-game="crow"]');
    return { kind: k && k.value, label: k && k.options[k.selectedIndex].textContent, ok: Array.from(document.querySelectorAll(".kb-gcard")).filter(b => !b.disabled).map(b => b.getAttribute("data-game")),
      crowDesc: document.querySelector('.kb-gcard[data-game="crow"] .kb-gcard-desc').textContent };`));
  ok(enMenu.kind === 'en' && /Tiếng Anh · 8 từ/.test(enMenu.label), 'menu: ' + enMenu.label);
  ok(enMenu.ok.length === 5, 'cả 5 trò chơi được với deck tiếng Anh: ' + enMenu.ok.join(', '));
  ok(/chính tả từ tiếng Anh/.test(enMenu.crowDesc), 'Đuổi quạ: ' + enMenu.crowDesc);
  await page.shot(SHOTS + '/52_tro_choi_tieng_anh.png');
  await page.eval(W('localStorage.setItem("kb-crow-speed", "vslow"); document.querySelector(\'.kb-gcard[data-game="crow"]\').click(); return 1;'));
  ok(await waitFor(page, 'GardenGames._debug().flying && GardenGames._debug().flying.length > 0'), 'quạ bay ra');
  const fly = await page.eval(W('return GardenGames._debug().flying[0];'));
  const ph = await page.eval(W('return document.querySelector(".kb-gc-input").placeholder;'));
  ok(/tiếng Anh/.test(ph), 'ô gõ: ' + ph);
  await page.eval(W('document.querySelector(".kb-gc-input").focus(); return 1;'));
  await page.type(fly.word.toUpperCase());
  await sleep(500);
  const after = await page.eval(W('return GardenGames._debug();'));
  ok(after.scared === 1, 'gõ "' + fly.word.toUpperCase() + '" (hoa thường không tính) cho biển "' + fly.label + '" → đuổi được quạ');
  await page.shot(SHOTS + '/53_duoi_qua_tieng_anh.png');
  await page.eval(W('GardenGames.close(); document.getElementById("kb-games").click(); return 1;')); await sleep(800);
  await page.eval(W('document.querySelector(\'.kb-gcard[data-game="cloze"]\').click(); return 1;'));
  ok(await waitFor(page, 'GardenGames._debug().word && GardenGames._debug().locked === false'), 'Điền vào câu (tiếng Anh) chạy');
  const cz = await page.eval(W('return GardenGames._debug();'));
  ok(cz.options.length === 4 && cz.options.indexOf(cz.word) >= 0, 'có 4 lựa chọn, đáp án ' + cz.word);
  await page.shot(SHOTS + '/54_dien_cau_tieng_anh.png');
  await page.eval(W('GardenGames.close(); return 1;')); await sleep(300);
  await py('LOG.clear()\nresult = 1');
  const nid = await page.eval(W('return Garden._data().plants.find(p => p.word === "child").nid;'));
  await page.eval(W(`pycmd("game:audio:${nid}"); return 1;`)); await sleep(400);
  const t1 = await lastPlay();
  ok(t1.includes('TTSTag') && t1.includes("lang='en_US'") && t1.includes("'child'"), 'từ không có audio → giọng máy en_US: ' + t1.slice(0, 80));
  const nid0 = await page.eval(W('return Garden._data().plants.find(p => p.word === "apple").nid;'));
  await page.eval(W(`pycmd("game:audio:${nid0}"); return 1;`)); await sleep(400);
  ok((await lastPlay()).includes('kbtest_en_0.wav'), 'từ có audio → phát file của deck');

  console.log('== chép chính tả tiếng Anh');
  await page.eval(W('GardenPaper.open("dict"); return 1;'));
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-ct .kb-p-in").length >= 5'), 'lượt chép có 5 câu tiếng Anh');
  const head = await page.eval(W('return { furi: document.getElementById("kb-p-furi").hidden, info: document.getElementById("kb-p-info").textContent };'));
  ok(head.furi && /don't = do not/.test(head.info), 'deck tiếng Anh: ẩn nút Ẩn furigana, hướng dẫn gõ tiếng Anh: ' + head.info);
  const ct = await page.eval(W('const r = document.querySelector(".kb-p-ct"); return { id: r.getAttribute("data-ct"), ph: r.querySelector(".kb-p-in").placeholder, hint: Array.from(r.querySelectorAll(".kb-p-ct-hint")).map(x => x.textContent) };'));
  ok(/dấu câu không tính/.test(ct.ph) && !ct.hint.some(h => /furigana/.test(h)), 'ô gõ tiếng Anh, không nhắc furigana: ' + ct.ph);
  const sent = await py(KB + `P = kb.paper\ninfo = P.resolve(${JSON.stringify(ct.id)}, None, kb._note_item, kb._voice(), kb._word_item)\nresult = info["markup"]`);
  const typed = sent.toLowerCase().replace(/[.,!?]/g, '').replace("don't", 'do not');
  await page.eval(`(() => { const r = document.querySelector('.kb-p-ct'); r.querySelector('.kb-p-in').value = ${JSON.stringify(typed)}; r.querySelector('.kb-p-check').click(); })()`);
  ok(await waitFor(page, 'document.querySelector(".kb-p-ct .kb-p-fb").classList.contains("is-ok")'), 'gõ "' + typed + '" (chữ thường, không dấu câu) → đúng');
  await page.eval(W('document.querySelectorAll(".kb-p-ct")[1].querySelector(".kb-p-play").click(); return 1;')); await sleep(400);
  ok((await lastPlay()).includes("lang='en_US'") || (await lastPlay()).includes('kbtest_en_'), 'câu không có audio → giọng máy en_US');
  await page.shot(SHOTS + '/55_chep_tieng_anh.png');
  await page.eval(W('GardenPaper.open("issue"); return 1;')); await sleep(800);
  ok(/chỉ viết bằng tiếng Nhật/.test(await page.eval(W('return document.getElementById("kb-p-info").textContent;'))), 'tab Báo: ghi rõ báo hiện chỉ tiếng Nhật');
  const auto = await py(KB + 'result = kb._deck_is_japanese(kb._dialog)');
  ok(auto === false, 'deck tiếng Anh: không tự viết báo tiếng Nhật');
  await page.eval(W('GardenPaper.close(); return 1;'));

  console.log('== Cấu hình trường: Ngôn ngữ');
  await deck('H::Tiếng Anh nhồi chung');
  await page.eval(W('GardenFields.open(); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-f-lang")'), 'bảng Cấu hình trường có ô Ngôn ngữ');
  const f1 = await page.eval(W(`return { lang: document.querySelector(".kb-f-lang").value, kind: document.querySelector(".kb-f-kindsel").value,
    kinds: Array.from(document.querySelectorAll(".kb-f-kindsel option")).map(o => o.value), bad: Array.from(document.querySelectorAll(".kb-f-bad")).map(x => x.textContent).join(" "),
    roles: Array.from(document.querySelectorAll(".kb-f-role > span:first-child")).map(x => x.textContent), tip: !!document.querySelector(".kb-f-tip") };`));
  ok(f1.lang === 'en' && f1.kind === 'vocab' && f1.kinds.join() === 'vocab,other', 'loại note “EN nhồi chung”: tiếng Anh, chỉ chọn Từ vựng / Khác');
  ok(/chứa cả nghĩa/.test(f1.bad) && !f1.tip, 'cảnh báo trường Từ nhồi chung (thay cho dòng gợi ý chung)');
  ok(f1.roles.indexOf('Phiên âm (IPA)') >= 0 && !f1.roles.some(r => /Hán Việt|Loại từ/.test(r)), 'vai trò tiếng Anh: ' + f1.roles.join(', '));
  await page.shot(SHOTS + '/56_cau_hinh_tieng_anh.png');
  await page.eval(W('const s = document.querySelector(".kb-f-lang"); s.value = "other"; s.dispatchEvent(new Event("change")); return 1;')); await sleep(300);
  await page.eval(W('document.getElementById("kb-f-save").click(); return 1;')); await sleep(1500);
  const st = await py(KB + `mid = str(mw.col.models.by_name("EN nhồi chung KB")["id"])
s = kb.FIELDS.load()
result = [s["lang"].get(mid), s["models"].get(mid, {}).get("kind")]`);
  ok(st[0] === 'other' && st[1] === 'vocab', 'lưu ngôn ngữ đã chọn vào khoá lang (' + JSON.stringify(st) + ')');
  const types = await page.eval(W('return Garden._data().note_types.map(t => t.lang + ":" + t.configured);'));
  ok(types.join() === 'other:true', 'vườn dùng ngôn ngữ vừa lưu: ' + types.join());
  await page.eval(W('GardenFields.close(); return 1;'));

  console.log('== soát lại: gọn hơn');
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1'); await sleep(1200);
  await deck('A::Có câu ví dụ + audio');
  await page.eval(W('document.getElementById("kb-sound").click(); return 1;')); await sleep(300);
  const pop = await page.eval(W('const p = document.getElementById("kb-sound-pop"); return { notes: p.querySelectorAll(".kb-sound-note").length, hv: /Hán Việt/.test(p.textContent), btns: p.querySelectorAll("button").length };'));
  ok(pop.notes <= 3 && !pop.hv && pop.btns === 5, '⚙ cài đặt: 5 nút, ≤ 3 dòng chú thích, không còn nhắc Hán Việt (' + JSON.stringify(pop) + ')');
  await page.eval(W('document.getElementById("kb-sound-pop").hidden = true; GardenPaper.open("shelf"); return 1;')); await sleep(600);
  const furi = await page.eval(W('const a = document.getElementById("kb-p-furi").hidden; GardenPaper.open("issue"); return a;')); await sleep(800);
  ok(furi && !(await page.eval(W('return document.getElementById("kb-p-furi").hidden;'))), 'nút Ẩn furigana chỉ hiện ở tab Báo (ẩn ở Kệ báo)');
  await page.eval(W('GardenPaper.close(); document.getElementById("kb-house").click(); GardenHome.setTab("yard"); return 1;')); await sleep(600);
  const tabTop = await page.eval(W('return Math.round(document.querySelector(".kb-h-tabs").getBoundingClientRect().top);'));
  const moved = [];
  for (const t of ["seed", "wear", "craft", "season", "pet"]) {
    await page.eval(W('GardenHome.setTab("' + t + '"); return 1;')); await sleep(300);
    const r = await page.eval(W('return [Math.round(document.querySelector(".kb-h-tabs").getBoundingClientRect().top), getComputedStyle(document.querySelector(".kb-h-view")).display];'));
    if (r[0] !== tabTop || r[1] === 'none') { moved.push(t + ':' + r.join('/')); }
  }
  ok(!moved.length, '1.17.3: đổi tab Nhà (Giống cây, Tủ đồ, Xưởng…) khung xem trước vẫn hiện, hàng tab không nhảy' + (moved.length ? ' — ' + moved.join(', ') : ''));
  await page.eval(W('GardenHome.setTab("seed"); return 1;')); await sleep(400);
  const pix = await page.eval(W(`const emo = /[\u{1F300}-\u{1FAFF}\u26a0\u26a1\u23f3\u2600-\u2602\u2744\u263e]/u;
    const txt = document.body.innerText; const icons = Array.from(document.querySelectorAll(".kb-pi")).filter(i => i.offsetWidth === 16 && getComputedStyle(i).backgroundImage.indexOf("svg") > 0);
    return { emoji: (txt.match(emo) || [""])[0], icons: icons.length, seed: !!document.querySelector("#kb-h-list .kb-h-name .kb-pi-seed") };`));
  ok(!pix.emoji && pix.icons >= 2 && pix.seed, 'không còn emoji, icon pixel 16px (vd. mầm cây ở “Giống cây cho ruộng”, ' + pix.icons + ' icon đang hiện)' + (pix.emoji ? ' — còn: ' + pix.emoji : ''));
  await page.shot(SHOTS + '/57_nha_giong_cay.png');
  const tabs = await page.eval(W(`const t = Array.from(document.querySelectorAll(".kb-h-tabs .kb-h-tab")).map(b => b.getBoundingClientRect());
    return { n: t.length, ws: t.map(r => Math.round(r.width)), gaps: t.slice(1).map((r, i) => Math.round(r.left - t[i].right)), seps: Array.from(document.querySelectorAll(".kb-h-tabsep")).filter(x => x.offsetWidth > 0).length };`));
  ok(tabs.n === 10 && tabs.seps === 0 && new Set(tabs.gaps).size === 1 && Math.max(...tabs.ws) - Math.min(...tabs.ws) <= 1,
    'Nhà: 10 tab bằng nhau, khoảng cách đều (' + tabs.ws.join('/') + ' · cách ' + Array.from(new Set(tabs.gaps)).join('/') + ')');
  const hd = await page.eval(W(`const h = (sel) => Array.from(document.querySelectorAll(sel)).filter(e => e.offsetHeight).map(e => Math.round(e.getBoundingClientRect().height));
    return { bar: h(".kb-bar > .kb-chip, .kb-bar > .kb-btn, .kb-bar .kb-sound-btn, .kb-bar > .kb-deck"), top: h("#kb-home .kb-game-top .kb-g-chip, #kb-home .kb-game-top > .kb-btn") };`));
  ok(new Set(hd.bar).size === 1 && new Set(hd.top).size === 1, 'thanh trên cùng các ô cao bằng nhau (' + hd.bar.join('/') + '), đầu bảng Nhà: ô Ví = nút Thoát (' + hd.top.join('/') + ')');
  await page.eval(W('GardenHome.setTab("yard"); return 1;')); await sleep(500);
  const buys = await page.eval(W(`const cards = Array.from(document.querySelectorAll("#kb-h-list .kb-h-card")).slice(0, 6);
    return cards.map(c => { const b = c.querySelector(".kb-h-buy"); return b ? Math.round(c.getBoundingClientRect().bottom - b.getBoundingClientRect().bottom) : -1; });`));
  ok(buys.length === 6 && new Set(buys).size === 1, 'nút Mua thẳng hàng ở đáy thẻ (' + buys.join(',') + ')');
  await page.eval(W('GardenHome.close(); document.getElementById("kb-ui-open").click(); return 1;')); await sleep(500);
  const ui = await page.eval(W('const d = document.querySelector("#kb-ui-stage details.kb-ui-more"); return { closed: d && !d.open, sel: document.querySelectorAll("#kb-ui-stage select").length };'));
  ok(ui.closed && ui.sel === 21, 'bảng Giao diện: phần tự chỉnh gập lại (vẫn đủ 21 ô chọn)');
  await page.eval(W('GardenUI.close(); return 1;'));

  // 1.17.3 (sửa): dải chúc mừng ghi nhầm tên icon ("target", "rainbow") thay vì vẽ icon
  const ban = [];
  for (const j of [{ day: 990, goal: true }, { day: 991, done: true }, { day: 992, streak: 7, streak_mark: true }, { day: 993, quests: true }]) {
    const r = await page.eval(W(`GardenJoy.render(Object.assign({ done: false, goal: false, grown: null, streak: 0, streak_mark: false, quests: false }, ${JSON.stringify(j)}));
      const b = document.getElementById("kb-joy-banner"); const i = b && b.querySelector(".kb-pi");
      return { t: b ? b.textContent : "", icon: i ? i.className : "" };`));
    ban.push(r);
  }
  const NAMES = /\b(target|rainbow|firework|gift|fire|leaf|blossom|apple)\b/;
  ok(ban.every((b) => b.t && !NAMES.test(b.t) && /kb-pi-(target|rainbow|firework|gift)/.test(b.icon)),
    'dải chúc mừng có icon pixel, không lộ tên icon: ' + ban.map((b) => b.icon.replace('kb-pi kb-pi-', '') + ' «' + b.t.slice(0, 22) + '»').join(' · '));
  const bdg = await page.eval(W('GardenJoy.render({ day: 994, done: true, goal: true, grown: "fruit", streak: 9, streak_mark: false, quests: true }); const box = document.getElementById("kb-joy"); return { t: box.textContent, n: box.querySelectorAll(".kb-pi").length, b: box.children.length };'));
  ok(bdg.n === bdg.b && bdg.b >= 4 && !NAMES.test(bdg.t), 'huy hiệu cạnh ruộng: mỗi cái một icon pixel (' + bdg.t + ')');
  await page.shot(SHOTS + '/58_chuc_mung.png');

  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.join(' | ').slice(0, 300) : ''));
  const errs = await py(KB + 'result = kb.ERRORS.load() if hasattr(kb.ERRORS, "load") else []');
  ok(!errs || !errs.length, 'nhật ký lỗi add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 300) : ''));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length + ' đạt');
  page.close(); process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
