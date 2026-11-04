// 1.19 trong Anki thật: báo 畑新聞 bản tiếng Anh (The Garden Gazette) — báo theo ngôn ngữ của deck đang xem,
// đọc / tra từ (went → go) / câu hỏi / chép chính tả tiếng Anh, trạng thái đọc riêng (cùng ngày với báo tiếng Nhật
// không đụng nhau), nút chuyển báo Nhật / Anh ở Kệ báo, tab Nguồn báo theo ngôn ngữ (trình độ A1–C1),
// deck ngôn ngữ khác: "Báo chưa hỗ trợ", không nhờ Gemini viết; deck tiếng Nhật vẫn như cũ.
// Chạy: node e2e_119.js SHOTS
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenPaper !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
  await py(KB + `${extra}
d = kb._dialog
d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)})
d._paper_pick = ""
d.refresh()
result = d.deck_id`);
  await sleep(1800);
  await page.eval(W('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; if (typeof GardenPaper !== "undefined") GardenPaper.close(); return 1;'));
}
const info = () => page.eval(W('return document.getElementById("kb-p-info").textContent;'));

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1');

  console.log('== deck tiếng Anh → báo tiếng Anh');
  await deck('M::Tiếng Anh A2', 'kb._en_tts = True');
  const sum = await page.eval(W('return Garden._data().paper;'));
  ok(sum && sum.lang === 'en' && sum.enabled && sum.unread === 1, 'chip Báo theo báo tiếng Anh: ' + JSON.stringify(sum));
  ok(/^Báo mới 1/.test(await page.eval(W('return document.getElementById("kb-paper-btn").textContent;'))), 'chip “Báo mới 1” (số tiếng Anh chưa đọc)');
  ok(await py(KB + 'result = [kb.paper_lang(kb._dialog), kb.deck_lang(kb._dialog)]').then(x => x.join() === 'en,en'), 'paper_lang = deck_lang = en');
  await page.eval(W('GardenPaper.open("issue"); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-p-name") && document.querySelector(".kb-p-name").textContent === "The Garden Gazette"'), 'đầu báo: The Garden Gazette');
  const head = await page.eval(W(`return { meta: document.querySelector(".kb-p-meta").textContent, langs: Array.from(document.querySelectorAll(".kb-p-art")).map(a => a.lang),
    furi: document.getElementById("kb-p-furi").hidden, rt: document.querySelectorAll(".kb-p-art rt").length, words: document.querySelectorAll(".kb-p-w").length,
    kinds: Array.from(document.querySelectorAll(".kb-p-kind")).map(k => k.textContent), qlang: document.querySelector(".kb-p-qh").lang };`));
  ok(/Tuesday, 3 November 2026/.test(head.meta) && /No\. 1/.test(head.meta), 'ngày + số kiểu tiếng Anh: ' + head.meta);
  ok(head.langs.length === 3 && head.langs.every(l => l === 'en') && head.qlang === 'en', 'bài + câu hỏi gắn lang="en"');
  ok(head.furi && head.rt === 0, 'không có nút Ẩn furigana, không có furigana');
  ok(head.words >= 15, head.words + ' chỗ bấm tra từ (máy tự nối)');
  ok(head.kinds.join('|') === 'Tin làng|Truyện dài kỳ · Kỳ 1|Thông báo', 'nhãn bài: ' + head.kinds.join(' | '));
  await page.eval(W('const w = Array.from(document.querySelectorAll(".kb-p-w")).find(x => x.getAttribute("data-k") === "drop"); w.click(); return 1;')); await sleep(300);
  const look = await page.eval(W('return { w: document.querySelector(".kb-p-iw").textContent, r: (document.querySelector(".kb-p-ir") || {}).textContent, m: document.querySelector(".kb-p-im").textContent, note: (document.querySelector(".kb-p-inote") || {}).textContent, sel: document.querySelector(".kb-p-w.is-sel").textContent };'));
  ok(look.sel === 'dropped' && look.w === 'drop' && look.r === '/drɒp/' && look.m === 'làm rơi' && /Từ mới/.test(look.note), 'bấm “dropped” → drop /drɒp/ làm rơi (từ mới): ' + JSON.stringify(look));
  await page.eval(W('const w = Array.from(document.querySelectorAll(".kb-p-w")).find(x => x.getAttribute("data-k") === "letter"); w.click(); return 1;')); await sleep(300);
  const look2 = await page.eval(W('return { sel: document.querySelector(".kb-p-w.is-sel").textContent, w: document.querySelector(".kb-p-iw").textContent, m: document.querySelector(".kb-p-im").textContent, note: (document.querySelector(".kb-p-inote") || {}).textContent };'));
  ok(look2.sel === 'letters' && look2.w === 'letter' && look2.m === 'lá thư' && /deck/.test(look2.note), 'bấm “letters” → letter (lá thư, đã học ở deck): ' + JSON.stringify(look2));
  await page.shot(SHOTS + '/60_bao_tieng_anh.png');
  await py('LOG.clear()\nresult = 1');
  await page.eval(W('document.querySelector(".kb-p-art .kb-p-play").click(); return 1;')); await sleep(400);
  const t1 = await lastPlay();
  ok(t1.includes('TTSTag') && t1.includes("lang='en_US'") && t1.includes('Yesterday afternoon'), 'đoạn không có audio → giọng máy en_US: ' + t1.slice(0, 90));

  console.log('== luyện tập');
  const coins0 = await py(KB + 'result = kb.STATE.load()["coins"]');
  await page.eval(W('document.querySelector(".kb-p-q[data-q=\'1\'] .kb-p-opt[data-c=\'1\']").click(); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-p-q[data-q=\'1\'] .kb-p-fb").classList.contains("is-ok")'), 'câu hỏi “What did Linh drop…” chọn “A cup” → đúng');
  const row = await page.eval(W('const r = document.querySelector(".kb-p-practice .kb-p-ct"); return { len: r.querySelector(".kb-p-ct-len").textContent, ph: r.querySelector(".kb-p-in").placeholder, lang: r.querySelector(".kb-p-in").lang, hint: Array.from(r.querySelectorAll(".kb-p-ct-hint")).map(x => x.textContent) };'));
  ok(row.len === '7 từ' && row.lang === 'en' && /hoa thường/.test(row.ph) && !row.hint.length, 'câu chép tiếng Anh: đếm từ, ô gõ tiếng Anh: ' + JSON.stringify(row));
  await py('LOG.clear()\nresult = 1');
  await page.eval(W('document.querySelectorAll(".kb-p-practice .kb-p-ct")[0].querySelectorAll(".kb-p-play")[1].click(); return 1;')); await sleep(400);
  const t2 = await lastPlay();
  ok(t2.includes('bao_gemini_en') && t2.includes('ct_1_cham.wav'), '▶ Chậm phát bản chậm của báo tiếng Anh: ' + t2.slice(-60));
  await page.eval(`(() => { const r = document.querySelectorAll('.kb-p-practice .kb-p-ct')[0]; r.querySelector('.kb-p-in').value = 'ben carried a big bag of letters'; r.querySelector('.kb-p-check').click(); })()`);
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-practice .kb-p-ct")[0].querySelector(".kb-p-fb").classList.contains("is-ok")'), 'gõ chữ thường, không dấu câu → đúng');
  await page.eval(`(() => { const r = document.querySelectorAll('.kb-p-practice .kb-p-ct')[2]; r.querySelector('.kb-p-in').value = 'please wait at the shops'; r.querySelector('.kb-p-check').click(); })()`);
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-practice .kb-p-ct")[2].querySelector(".kb-p-fb").classList.contains("is-bad")'), 'gõ sai một từ → chưa đúng, hiện câu đúng');
  const ans = await page.eval(W('return document.querySelectorAll(".kb-p-practice .kb-p-ct")[2].querySelector(".kb-p-ans").textContent;'));
  ok(/^Please wait at the shop\./.test(ans), 'câu đúng hiện bằng chữ thường (không lộ đánh dấu ||): ' + ans);
  const coins1 = await py(KB + 'result = [kb.STATE.load()["coins"], kb.PAPER_EN.load()["read"]["2026-11-03"]["coins"]]');
  ok(coins1[1] === 4 && coins1[0] - coins0 >= 4, 'đúng ngay lần đầu: +2 (câu hỏi) +2 (câu chép) = +' + coins1[1] + ' xu (ví +' + (coins1[0] - coins0) + ', kể cả nhiệm vụ)');
  const stv = await py(KB + `en = kb.PAPER_EN.load(); ja = kb.PAPER.load()
result = {"en": en["read"].get("2026-11-03"), "ja": "2026-11-03" in ja["read"], "miss": list(en["miss"]), "q": list(en["queue"]),
          "col": [k for k in ("kotoba_batake_paper", "kotoba_batake_paper_en") if mw.col.get_config(k, None) is not None]}`);
  ok(stv.en && stv.en.q['1'] === 1 && stv.en.ct['0'] === 1 && !stv.ja, 'đọc / làm số tiếng Anh 03/11 ghi vào khoá riêng, số tiếng Nhật cùng ngày vẫn chưa đọc: ' + JSON.stringify(stv));
  ok(stv.miss.indexOf('shop') >= 0 && stv.q.indexOf('p:2026-11-03:2') >= 0 && stv.col.indexOf('kotoba_batake_paper_en') >= 0, 'chép sai → ghi từ chép sai (shop) + hàng ôn trong khoá kotoba_batake_paper_en');
  const sum2 = await page.eval(W('return Garden._data().paper;'));
  ok(sum2.lang === 'en' && sum2.unread === 0, 'đọc xong → chip hết “Báo mới”');

  console.log('== Kệ báo: chuyển báo Nhật / Anh');
  await page.eval(W('document.querySelector(".kb-p-tab[data-ptab=shelf]").click(); return 1;'));
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-row").length >= 1 && document.querySelector(".kb-p-langs")'), 'kệ báo tiếng Anh + nút chuyển ngôn ngữ');
  const shelf = await page.eval(W('return { rows: Array.from(document.querySelectorAll(".kb-p-row-title")).map(t => t.lang + ":" + t.textContent), chips: Array.from(document.querySelectorAll(".kb-p-langs .kb-ai-chip")).map(b => b.textContent + (b.classList.contains("is-on") ? "*" : "")) };'));
  ok(shelf.rows.length === 1 && shelf.rows[0] === 'en:Autumn Walk Near the River', 'kệ chỉ có số tiếng Anh: ' + shelf.rows.join(' | '));
  ok(shelf.chips.length === 2 && /tiếng Nhật · 2 mới/.test(shelf.chips[0]) && /tiếng Anh\*$/.test(shelf.chips[1]), 'nút: ' + shelf.chips.join(' | '));
  await page.shot(SHOTS + '/61_ke_bao_chuyen_ngon_ngu.png');
  await page.eval(W('document.querySelectorAll(".kb-p-langs .kb-ai-chip")[0].click(); return 1;'));
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-row-title").length === 2 && document.querySelector(".kb-p-row-title").lang === "ja"'), 'bấm “Báo tiếng Nhật” → kệ báo tiếng Nhật (2 số)');
  ok((await page.eval(W('return Garden._data().paper.lang;'))) === 'ja' && (await py(KB + 'result = kb._dialog._paper_pick')) === 'ja', 'chip Báo + hòm thư theo báo tiếng Nhật đã chọn');
  await page.eval(W('document.querySelector(".kb-p-row").click(); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-p-name") && document.querySelector(".kb-p-name").textContent === "畑新聞"'), 'mở số tiếng Nhật: đầu báo 畑新聞');
  ok(!(await page.eval(W('return document.getElementById("kb-p-furi").hidden;'))) && await page.eval(W('return document.querySelectorAll(".kb-p-art rt").length > 10;')), 'báo tiếng Nhật: có furigana + nút Ẩn furigana');
  const stja = await py(KB + 'result = ["2026-11-03" in kb.PAPER.load()["read"], kb.PAPER_EN.load()["read"]["2026-11-03"]["coins"]]');
  ok(stja[0] === true && stja[1] === 4, 'đọc số tiếng Nhật 03/11: ghi vào khoá cũ, số tiếng Anh vẫn giữ +4 xu');
  await page.eval(W('document.querySelector(".kb-p-tab[data-ptab=shelf]").click(); return 1;'));
  ok(await waitFor(page, 'Array.from(document.querySelectorAll(".kb-p-langs button")).some(b => b.textContent === "Theo deck đang xem")'), 'có nút “Theo deck đang xem” khi đã chọn tay');
  await page.eval(W('Array.from(document.querySelectorAll(".kb-p-langs button")).find(b => b.textContent === "Theo deck đang xem").click(); return 1;'));
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-row-title").length === 1 && document.querySelector(".kb-p-row-title").lang === "en"'), '“Theo deck đang xem” → lại báo tiếng Anh');

  console.log('== tab Nguồn báo (tiếng Anh)');
  await page.eval(W('document.querySelector(".kb-p-tab[data-ptab=src]").click(); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-ai-card") && /The Garden Gazette/.test(document.querySelector(".kb-ai-card").textContent)'), 'thẻ Gemini ghi báo tiếng Anh');
  const src = await page.eval(W(`const rows = Array.from(document.querySelectorAll(".kb-ai-opts .kb-ai-row"));
    const lv = rows.find(r => r.querySelector(".kb-ai-k").textContent === "Trình độ");
    return { lv: Array.from(lv.querySelectorAll(".kb-ai-chip")).map(b => b.textContent + (b.classList.contains("is-on") ? "*" : "")).join(","),
      scope: rows.some(r => r.querySelector(".kb-ai-k").textContent === "Lấy từ"), claude: document.querySelector(".kb-ai-claude").textContent };`));
  ok(src.lv === 'A1,A2*,B1,B2,C1' && !src.scope, 'trình độ CEFR A1–C1 (đang A2), không có “Lấy từ giáo trình”: ' + src.lv);
  ok(/chỉ viết báo tiếng Nhật/.test(src.claude) && !/Dùng Claude Code/.test(src.claude), 'thẻ Claude Code ghi chỉ có báo tiếng Nhật');
  await page.shot(SHOTS + '/62_nguon_bao_tieng_anh.png');
  await page.eval(W('Array.from(document.querySelectorAll(".kb-ai-opts .kb-ai-chip")).find(b => b.textContent === "B1").click(); return 1;')); await sleep(800);
  const cfg = await py(KB + 'c = kb.config(); result = [c.get("gemini_level_en"), c.get("gemini_level")]');
  ok(cfg[0] === 'B1' && cfg[1] === 'N4', 'chọn B1 → lưu gemini_level_en, trình độ báo tiếng Nhật giữ N4: ' + cfg.join());
  ok(await waitFor(page, 'Array.from(document.querySelectorAll(".kb-ai-opts .kb-ai-chip.is-on")).some(b => b.textContent === "B1")'), 'chip B1 sáng');
  const why = await py(KB + `kb._dialog._plants = [p for p in kb._dialog._plants][:8]
ok = kb.ai_start("manual", kb._dialog)
result = [ok, kb._ai["why"]]`);
  ok(why[0] === false && /chưa có đủ từ tiếng Anh/.test(why[1]), 'deck < 10 từ tiếng Anh: không gọi Gemini, báo lý do: ' + why[1]);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1200);
  await page.eval(W('GardenPaper.close(); return 1;'));

  console.log('== deck ngôn ngữ khác (tiếng Hàn)');
  await deck('J::Tiếng Hàn');
  const sko = await page.eval(W('return Garden._data().paper;'));
  ok(sko.lang === 'other' && !sko.enabled, 'chip Báo: ngôn ngữ khác, không có báo');
  ok(/^Chép /.test(await page.eval(W('return document.getElementById("kb-paper-btn").textContent;'))), 'chip chỉ còn “Chép x/5”');
  await page.eval(W('GardenPaper.open("issue"); return 1;'));
  ok(await waitFor(page, '/Báo chưa hỗ trợ ngôn ngữ này/.test(document.getElementById("kb-p-stage").textContent)'), 'tab Báo: “Báo chưa hỗ trợ ngôn ngữ này”');
  ok(/hiện có báo tiếng Nhật và tiếng Anh/.test(await info()), 'dòng hướng dẫn: ' + (await info()).slice(0, 90));
  const other = await page.eval(W('return Array.from(document.querySelectorAll("#kb-p-stage .kb-ai-chip")).map(b => b.textContent);'));
  ok(other.length === 2, 'vẫn có nút đọc báo tiếng Nhật / tiếng Anh: ' + other.join(' | '));
  await page.shot(SHOTS + '/63_ngon_ngu_khac.png');
  const ko = await py(KB + 'ok = kb.ai_start("manual", kb._dialog)\nresult = [ok, kb._ai["why"], kb._ai["running"]]');
  ok(ko[0] === false && /chưa hỗ trợ/.test(ko[1]) && !ko[2], 'không nhờ Gemini viết báo cho tiếng Hàn: ' + ko[1]);
  await page.eval(W('GardenPaper.close(); return 1;'));

  console.log('== deck tiếng Nhật: như cũ');
  await deck('A::Có câu ví dụ + audio');
  const sja = await page.eval(W('return Garden._data().paper;'));
  ok(sja.lang === 'ja' && sja.enabled && sja.unread === 1, 'deck tiếng Nhật → báo tiếng Nhật (1 số chưa đọc): ' + JSON.stringify(sja));
  await page.eval(W('GardenPaper.open("issue"); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-p-name") && document.querySelector(".kb-p-name").textContent === "畑新聞"'), 'tab Báo: 畑新聞');
  ok(/Gạch liền: từ đã học/.test(await info()), 'hướng dẫn như cũ');
  await page.eval(W('document.querySelector(".kb-p-tab[data-ptab=src]").click(); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-ai-opts") && Array.from(document.querySelectorAll(".kb-ai-opts .kb-ai-chip")).map(b => b.textContent).join(",").indexOf("N5,N4,N3,N2,N1") >= 0'), 'tab Nguồn báo: trình độ N5–N1 như cũ');
  await page.eval(W('GardenPaper.close(); return 1;'));
  const w = await page.eval(W('return [document.documentElement.scrollWidth, window.innerWidth];'));
  ok(w[0] <= w[1], 'không tràn ngang');

  console.log('== lỗi');
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.join(' | ').slice(0, 300) : ''));
  const errs = await py(KB + 'result = kb.ERRORS.load() if hasattr(kb.ERRORS, "load") else []');
  ok(!errs || !errs.length, 'nhật ký lỗi add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 300) : ''));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length + ' đạt');
  page.close(); process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
