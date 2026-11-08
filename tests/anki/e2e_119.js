// 1.19 / 1.19.1 trong Anki thật: báo 畑新聞 bản tiếng Anh (The Garden Gazette) — đọc / tra từ (went → go) / câu hỏi /
// chép chính tả tiếng Anh, trạng thái đọc riêng (cùng ngày với báo tiếng Nhật không đụng nhau).
// 1.19.1: báo KHÔNG theo deck đang xem — ô tick "Báo muốn nhận" (tiếng Nhật / tiếng Anh), hòm thư cộng số chưa đọc
// của mọi báo đã tick, mở bảng Báo thì vào báo có số chưa đọc (tiếng Nhật trước), deck tiếng Hàn không làm mất báo,
// tab Nguồn báo: một khối cho mỗi báo (trình độ, Lấy từ: Mọi deck / Chọn deck tối đa 5), deck quá ít từ → không gọi Gemini.
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
d.refresh()
result = d.deck_id`);
  await sleep(1800);
  await page.eval(W('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; if (typeof GardenPaper !== "undefined") GardenPaper.close(); return 1;'));
}
const info = () => page.eval(W('return document.getElementById("kb-p-info").textContent;'));
const chip = () => page.eval(W('return document.getElementById("kb-paper-btn").textContent;'));
const langs = (x) => py(KB + `kb.save_config(gemini_langs=${JSON.stringify(x)})\nkb._dialog.refresh()\nresult = 1`).then(() => sleep(1200));

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1');

  console.log('== báo muốn nhận: máy đã có báo tiếng Anh (1.19.0) → tick sẵn cả hai');
  ok(JSON.stringify(await py(KB + 'result = mw.addonManager.getConfig("kotoba_batake").get("gemini_langs")')) === '["ja","en"]',
    'mở hồ sơ lần đầu: ghi gemini_langs = ["ja", "en"] một lần');

  console.log('== đang xem deck tiếng Anh: hòm thư cộng cả hai báo, mở bảng → báo tiếng Nhật (có số chưa đọc)');
  await deck('M::Tiếng Anh A2', 'kb._en_tts = True');
  const sum = await page.eval(W('return Garden._data().paper;'));
  ok(sum && sum.enabled && sum.unread === 3 && sum.lang === 'ja', 'hòm thư: 2 số tiếng Nhật + 1 số tiếng Anh = ' + JSON.stringify(sum));
  ok(/^Báo mới 3/.test(await chip()), 'chip “Báo mới 3”');

  console.log('== Kệ báo: chuyển sang báo tiếng Anh');
  await page.eval(W('GardenPaper.open("shelf"); return 1;'));
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-row").length >= 1 && document.querySelector(".kb-p-langs")'), 'mở kệ báo (báo tiếng Nhật, không theo deck đang xem) + nút chuyển báo');
  const shelf = await page.eval(W('return { rows: Array.from(document.querySelectorAll(".kb-p-row-title")).map(t => t.lang), chips: Array.from(document.querySelectorAll(".kb-p-langs .kb-ai-chip")).map(b => b.textContent + (b.classList.contains("is-on") ? "*" : "")), label: document.querySelector(".kb-p-langs .kb-ai-k") };'));
  ok(shelf.rows.join() === 'ja,ja', 'kệ báo tiếng Nhật: 2 số');
  ok(shelf.chips.length === 2 && /^Báo tiếng Nhật · 2 mới\*$/.test(shelf.chips[0]) && /^Báo tiếng Anh · 1 mới$/.test(shelf.chips[1]) && !shelf.label,
    'nút: ' + shelf.chips.join(' | ') + ' (không còn nhãn “Đọc báo:”)');
  ok(!(await page.eval(W('return Array.from(document.querySelectorAll("#kb-p-stage button")).some(b => b.textContent === "Theo deck đang xem");'))), 'không còn nút “Theo deck đang xem”');
  await page.shot(SHOTS + '/61_ke_bao_chuyen_ngon_ngu.png');
  await page.eval(W('document.querySelectorAll(".kb-p-langs .kb-ai-chip")[1].click(); return 1;'));
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-row-title").length === 1 && document.querySelector(".kb-p-row-title").lang === "en"'), 'bấm “Báo tiếng Anh” → kệ báo tiếng Anh (1 số)');
  ok((await page.eval(W('return Garden._data().paper.lang;'))) === 'en' && (await py(KB + 'result = kb._dialog._paper_lang')) === 'en', 'đang đọc báo tiếng Anh');
  await page.eval(W('document.querySelector(".kb-p-row").click(); return 1;'));
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
  ok(sum2.lang === 'en' && sum2.unread === 2, 'đọc xong số tiếng Anh: vẫn ở báo tiếng Anh (không tự nhảy), hòm thư còn 2 số tiếng Nhật: ' + JSON.stringify(sum2));
  await page.eval(W('GardenPaper.close(); return 1;'));

  console.log('== chỉ tick tiếng Nhật');
  await langs(['ja']);
  const s3 = await page.eval(W('return Garden._data().paper;'));
  ok(s3.unread === 2 && s3.lang === 'ja', 'hòm thư chỉ tính báo tiếng Nhật, kể cả khi đang xem deck tiếng Anh');
  await page.eval(W('GardenPaper.open("shelf"); return 1;'));
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-row-title").length === 2'), 'kệ báo tiếng Nhật');
  ok(!(await page.eval(W('return !!document.querySelector(".kb-p-langs");'))), 'không có nút chuyển báo (chỉ một báo)');
  await page.eval(W('GardenPaper.close(); return 1;'));

  console.log('== deck ngôn ngữ khác (tiếng Hàn): báo vẫn bình thường');
  await deck('J::Tiếng Hàn');
  const sko = await page.eval(W('return Garden._data().paper;'));
  ok(sko.enabled && sko.lang === 'ja' && sko.unread === 2, 'chip Báo không đổi khi xem deck tiếng Hàn: ' + JSON.stringify(sko));
  await page.eval(W('GardenPaper.open("issue"); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-p-name") && document.querySelector(".kb-p-name").textContent === "畑新聞"'), 'tab Báo: 畑新聞 (không còn màn “Báo chưa hỗ trợ”)');
  ok(!/chưa hỗ trợ/.test(await page.eval(W('return document.getElementById("kb-paper").textContent;'))), 'không có chữ “chưa hỗ trợ”');
  await page.shot(SHOTS + '/63_ngon_ngu_khac.png');
  await page.eval(W('GardenPaper.close(); return 1;'));

  console.log('== chỉ tick tiếng Anh, xem deck tiếng Nhật');
  await langs(['en']);
  await deck('A::Có câu ví dụ + audio');
  const s4 = await page.eval(W('return Garden._data().paper;'));
  ok(s4.enabled && s4.lang === 'en' && s4.unread === 0, 'chỉ báo tiếng Anh (đã đọc hết): ' + JSON.stringify(s4));
  await page.eval(W('GardenPaper.open("issue"); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-p-name") && document.querySelector(".kb-p-name").textContent === "The Garden Gazette"'), 'tab Báo: The Garden Gazette dù đang xem deck tiếng Nhật');
  await page.eval(W('GardenPaper.close(); return 1;'));
  await langs(['ja', 'en']);

  console.log('== tab Nguồn báo');
  await page.eval(W('GardenPaper.open("src"); return 1;'));
  ok(await waitFor(page, 'document.querySelectorAll(".kb-ai-lang").length === 2'), 'thẻ Gemini: một khối cho mỗi báo đã tick');
  const want = await page.eval(W('return Array.from(document.querySelectorAll(".kb-ai-want .kb-ai-tick")).map(l => l.textContent.trim() + (l.querySelector("input").checked ? "*" : ""));'));
  ok(want.join('|') === 'Tiếng Nhật*|Tiếng Anh*', 'Báo muốn nhận: ' + want.join(' | '));
  const blocks = await page.eval(W(`return Array.from(document.querySelectorAll(".kb-ai-lang")).map(b => {
    const rows = Array.from(b.querySelectorAll(".kb-ai-row"));
    const get = (k) => rows.find(r => r.querySelector(".kb-ai-k").textContent === k);
    return { h: b.querySelector(".kb-ai-lang-h").textContent, lv: Array.from(get("Trình độ").querySelectorAll(".kb-ai-chip")).map(x => x.textContent + (x.classList.contains("is-on") ? "*" : "")).join(","),
      src: Array.from(get("Lấy từ").querySelectorAll(".kb-ai-chip")).map(x => x.textContent + (x.classList.contains("is-on") ? "*" : "")).join(",") }; });`));
  ok(/Báo tiếng Nhật/.test(blocks[0].h) && blocks[0].lv === 'N5,N4*,N3,N2,N1', 'khối báo tiếng Nhật: ' + JSON.stringify(blocks[0]));
  ok(/Báo tiếng Anh/.test(blocks[1].h) && blocks[1].lv === 'A1,A2*,B1,B2,C1' && /^Mọi deck\*,Chọn deck$/.test(blocks[1].src), 'khối báo tiếng Anh: ' + JSON.stringify(blocks[1]));
  ok(!/deck đang xem/i.test(await page.eval(W('return document.querySelector(".kb-ai").textContent;'))), 'không còn chữ “deck đang xem”');
  await page.shot(SHOTS + '/62_nguon_bao.png');
  await page.eval(W('Array.from(document.querySelectorAll(".kb-ai-lang")[1].querySelectorAll(".kb-ai-chip")).find(b => b.textContent === "B1").click(); return 1;')); await sleep(800);
  const cfg = await py(KB + 'c = kb.config(); result = [c.get("gemini_level_en"), c.get("gemini_level")]');
  ok(cfg[0] === 'B1' && cfg[1] === 'N4', 'chọn B1 → lưu gemini_level_en, báo tiếng Nhật giữ N4: ' + cfg.join());

  console.log('== chọn deck cho báo tiếng Anh');
  await page.eval(W('Array.from(document.querySelectorAll(".kb-ai-lang")[1].querySelectorAll(".kb-ai-chip")).find(b => b.textContent === "Chọn deck").click(); return 1;'));
  ok(await waitFor(page, 'document.querySelector(".kb-ai-decks")'), 'bấm “Chọn deck” → danh sách deck');
  const dl = await page.eval(W('return Array.from(document.querySelectorAll(".kb-ai-deck")).map(l => l.textContent);'));
  ok(dl.some(x => /^ M::Tiếng Anh A2/.test(x) && /40 note/.test(x)) && !dl.some(x => /Tiếng Hàn|Có câu ví dụ/.test(x)),
    'chỉ deck có note tiếng Anh, kèm số note: ' + dl.slice(0, 4).join(' | '));
  await page.eval(W('Array.from(document.querySelectorAll(".kb-ai-deck")).find(l => /F::Tiếng Anh Basic/.test(l.textContent)).querySelector("input").click(); return 1;'));
  ok(await waitFor(page, 'Array.from(document.querySelectorAll(".kb-ai-deck input")).filter(i => i.checked).length === 1'), 'tick một deck');
  const src1 = await py(KB + 'result = mw.col.get_config("kotoba_batake_paper_src", None)');
  const fid = await py(KB + 'result = mw.col.decks.id_for_name("F::Tiếng Anh Basic")');
  ok(src1 && src1.en && src1.en.decks.length === 1 && src1.en.decks[0] === fid, 'lưu vào khoá collection kotoba_batake_paper_src: ' + JSON.stringify(src1));
  // 1.25.1: deck đã chọn < 10 từ không còn chặn — Gemini viết theo trình độ, kèm vài từ đã có (không gọi mạng ở đây)
  const why = await py(KB + 'sc = kb._ai_scope(kb.config(), kb._ai_opts(kb.config()), "en")\nresult = [sc.get("khong_deck"), sc.get("it_tu"), len(sc.get("kho") or [])]');
  ok(why[0] === true && why[1] === 8 && why[2] === 8, 'deck đã chọn < 10 từ (1.25.1): vẫn viết theo trình độ, 8 từ đã có gửi kèm: ' + JSON.stringify(why));
  await page.eval(W('GardenPaper.close(); GardenPaper.open("src"); return 1;'));
  ok(await waitFor(page, '/Không dùng deck/.test((document.querySelectorAll(".kb-ai-lang")[1] || {}).textContent || "")'), 'khối báo tiếng Anh có nút "Không dùng deck" (1.25.1)');
  for (let i = 0; i < 6; i++) {
    await page.eval(W('const b = Array.from(document.querySelectorAll(".kb-ai-deck input")).find(i => !i.checked && !i.disabled); if (b) b.click(); return 1;'));
    await sleep(700);
    if (!(await page.eval(W('return !!document.querySelector(".kb-ai-decks");')))) {
      await page.eval(W('const b = Array.from(document.querySelectorAll(".kb-ai-lang")[1].querySelectorAll("button")).find(x => x.textContent === "Đổi"); if (b) b.click(); return 1;'));
      await sleep(300);
    }
  }
  const lim = await page.eval(W('const i = Array.from(document.querySelectorAll(".kb-ai-deck input")); return [i.filter(x => x.checked).length, i.filter(x => !x.checked && !x.disabled).length];'));
  ok(lim[0] === 5 && lim[1] === 0, 'tối đa 5 deck: các ô còn lại bị khoá ' + JSON.stringify(lim));
  await page.shot(SHOTS + '/64_chon_deck.png');
  await page.eval(W('Array.from(document.querySelectorAll(".kb-ai-lang")[1].querySelectorAll(".kb-ai-chip")).find(b => b.textContent === "Mọi deck").click(); return 1;')); await sleep(800);
  ok((await py(KB + 'result = mw.col.get_config("kotoba_batake_paper_src")["en"]["decks"]')).length === 0, 'bấm “Mọi deck” → bỏ chọn deck');

  console.log('== bỏ tick tiếng Anh ở tab Nguồn báo');
  await page.eval(W('Array.from(document.querySelectorAll(".kb-ai-want .kb-ai-tick")).find(l => /Tiếng Anh/.test(l.textContent)).querySelector("input").click(); return 1;'));
  ok(await waitFor(page, 'document.querySelectorAll(".kb-ai-lang").length === 1'), 'chỉ còn khối báo tiếng Nhật');
  ok(JSON.stringify(await py(KB + 'result = kb.config().get("gemini_langs")')) === '["ja"]', 'lưu gemini_langs = ["ja"]');
  await page.eval(W('GardenPaper.close(); return 1;'));
  const w = await page.eval(W('return [document.documentElement.scrollWidth, window.innerWidth];'));
  ok(w[0] <= w[1], 'không tràn ngang');

  console.log('== lỗi');
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.join(' | ').slice(0, 300) : ''));
  const errs = await py(KB + 'result = kb.ERRORS.entries()');
  ok(!errs || !errs.length, 'nhật ký lỗi add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 300) : ''));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length + ' đạt');
  page.close(); process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
