// Test giao diện trong Anki thật: bảng 新聞 (Báo / Chép chính tả / Nguồn báo) với 5 kiểu deck.
// Chạy: node e2e.js SHOTS  (Anki đã chạy bằng run_anki.sh). KB_REAL_GEMINI=1: thêm bước Gemini TTS thật (cần mạng + khoá).
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2];
const results = [];
const ok = (c, m) => { results.push([!!c, m]); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {     // webview của vườn (bỏ qua 3 webview của Anki; mỗi trang chỉ chờ 3 giây)
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
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
async function deck(name, extra = '', paperToo = false) {
  await py(KB + `
st = kb.PAPER.load(); st["dict"]["day"] = -1; st["queue"] = {}; st["seen"] = []
lib = kb._library()
if not ${paperToo ? 'True' : 'False'} and lib:   # test riêng deck: coi các câu trong báo là đã gặp
    st["seen"] = ["p:%s:%d" % (d, i) for d in lib.issues() for i in range(len(lib.issue(d)["chinh_ta"]))]
kb.PAPER.save(st)
${extra}
d = kb._dialog
d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)})
d.refresh()
result = d.deck_id`);
  await sleep(1500);
}
async function waitFor(p, expr, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await p.eval(expr)) return true; } catch (e) { } await sleep(300); }
  return false;
}
const lastPlay = async () => (await py('result = [x["tag"] for x in LOG if x["tag"] != "STOP"][-1:]'))[0] || '';
(async () => {
  await py(KB + 'kb.open_garden(); kb._dialog.resize(1280, 800); result = 1');
  await sleep(3000);
  const page = await gardenPage();
  ok(page, 'tìm thấy trang khu vườn trong Anki');
  if (!page) process.exit(1);
  await waitFor(page, 'document.querySelector("#kb-paper-btn") !== null');
  await deck('A::Có câu ví dụ + audio', '', true);
  await page.shot(SHOTS + '/01_vuon.png');

  // ---- Báo: số 03/11 (Gemini, đủ giọng đọc) ----
  await page.eval('GardenPaper.open("issue")');
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-art").length >= 3'), 'mở số báo hôm nay: đủ 3 bài');
  await page.shot(SHOTS + '/02_bao.png');
  const nPlay = await page.eval('document.querySelectorAll(".kb-p-text .kb-p-play").length');
  ok(nPlay >= 6, 'nút ▶ cho từng đoạn: ' + nPlay);
  const ctBtns = await page.eval('Array.from(document.querySelectorAll(".kb-p-practice .kb-p-ct")).map(r => Array.from(r.querySelectorAll(".kb-p-play")).map(b => b.textContent))');
  ok(ctBtns.length === 2 && ctBtns.every(b => b.includes('▶ Chậm')), 'câu chép trong báo có ▶ Nghe + ▶ Chậm: ' + JSON.stringify(ctBtns));
  await page.eval('document.querySelectorAll(".kb-p-practice .kb-p-ct")[0].querySelectorAll(".kb-p-play")[1].click()');
  await sleep(500);
  ok((await lastPlay()).includes('ct_1_cham.wav'), 'bấm ▶ Chậm phát ct_1_cham.wav: ' + (await lastPlay()).slice(-60));
  const links = await page.eval('document.querySelectorAll(".kb-p-art .kb-p-w, .kb-p-art [data-k]").length');
  ok(links >= 10, 'số chỗ bấm tra từ trong bài: ' + links);
  // ---- số cũ 02/11: audio lồng của 1.12 đã được sửa ----
  let fixed = [0, false];
  for (let k = 0; k < 40 && !(fixed[0] >= 10 && fixed[1]); k++) {
    await sleep(500);
    fixed = await py(KB + `
import wave, glob
res = []
for f in sorted(glob.glob(os.path.join(kb.AI_DIR, "bao", "2026-11-02", "audio", "*.wav"))):
    w = wave.open(f); d = w.readframes(w.getnframes()); res.append(d[:4] != b"RIFF" and b"C2PA" not in d)
result = [len(res), all(res)]`);
  }
  ok(fixed[0] >= 10 && fixed[1], 'số 02/11 của 1.12: file lồng đã sửa + tạo bù 2 bản chậm (luồng nền): ' + JSON.stringify(fixed));
  await py(KB + 'kb._dialog._js("paperIssue", kb.paper.issue_view(kb._library(), kb.PAPER.load(), "2026-11-02", kb._voice()))\nresult = 1');
  await sleep(800);
  const old = await page.eval('Array.from(document.querySelectorAll(".kb-p-practice .kb-p-ct")).map(r => r.querySelectorAll(".kb-p-play").length)');
  ok(old.length && old.every(n => n === 2), 'số 02/11 giờ có ▶ Chậm: ' + JSON.stringify(old));
  await page.shot(SHOTS + '/02b_bao_cu_1_12.png');

  // ---- Chép chính tả, deck A: câu ví dụ có audio ----
  await page.eval('GardenPaper.open("dict")');
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-ct").length >= 5'), 'deck A: lượt chép có 5 câu');
  const srcA = await page.eval('Array.from(document.querySelectorAll(".kb-p-ct .kb-p-ct-label")).map(x => x.textContent)');
  console.log('     ', JSON.stringify(srcA));
  await page.shot(SHOTS + '/03_chep_deckA.png');

  // ---- deck D (chỉ từ, không gì cả), giả lập máy có giọng tiếng Nhật ----
  await deck('D::Chỉ từ, không gì cả', 'kb._ja_tts = True\nkb.save_config(dict_voice="may")');
  await page.eval('GardenPaper.open("dict")');
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-ct .kb-p-play").length >= 5'), 'deck D + giọng máy: 5 từ nghe được');
  const tagsD = await page.eval('Array.from(document.querySelectorAll(".kb-p-voice")).map(x => x.textContent)');
  ok(tagsD.length >= 5 && tagsD.every(t => t === 'giọng máy'), 'nhãn "giọng máy": ' + JSON.stringify(tagsD));
  ok((await page.eval('document.querySelector(".kb-p-ct .kb-p-in").placeholder')) === 'Gõ từ vừa nghe', 'ô gõ ghi "Gõ từ vừa nghe"');
  await page.eval('document.querySelector(".kb-p-ct .kb-p-play").click()'); await sleep(400);
  const t1 = await lastPlay();
  ok(t1.includes('TTSTag') && t1.includes("lang='ja_JP'") && t1.includes('speed=1.0'), 'bấm ▶ Nghe → giọng máy ja_JP: ' + t1.slice(0, 90));
  await page.eval('document.querySelectorAll(".kb-p-ct")[0].querySelectorAll(".kb-p-play")[1].click()'); await sleep(400);
  ok((await lastPlay()).includes('speed=0.7'), 'bấm ▶ Chậm → giọng máy tốc độ 0.7');
  const firstId = await page.eval('document.querySelector(".kb-p-ct").getAttribute("data-ct")');
  const ans = await py(KB + `P = kb.paper\ninfo = P.resolve(${JSON.stringify(firstId)}, None, kb._note_item, kb._voice(), kb._word_item)\nresult = P.kana(info["markup"])`);
  await page.eval(`(() => { const r = document.querySelector('.kb-p-ct'); r.querySelector('.kb-p-in').value = ${JSON.stringify(ans)}; r.querySelector('.kb-p-check').click(); })()`);
  ok(await waitFor(page, 'document.querySelector(".kb-p-ct .kb-p-fb").classList.contains("is-ok")'), 'gõ "' + ans + '" (kana) → đúng: ' + await page.eval('document.querySelector(".kb-p-ct .kb-p-fb").textContent'));
  await page.shot(SHOTS + '/04_chep_deckD_giongmay.png');

  if (process.env.KB_REAL_GEMINI === '1') {
    // ---- deck B (có câu, không audio), không giọng máy, có khoá Gemini → Gemini tạo giọng đọc thật ----
    await deck('B::Có câu ví dụ, không audio', 'kb._ja_tts = False\nkb.save_config(dict_voice="auto")\nkb._voice_job["tried"].clear()');
    await page.eval('GardenPaper.open("dict")');
    ok(await waitFor(page, 'document.querySelectorAll(".kb-p-ct").length >= 5'), 'deck B: 5 câu ví dụ');
    const waitShown = await page.eval('document.querySelectorAll(".is-wait").length');
    ok(waitShown >= 1, 'đang chờ Gemini: ' + waitShown + ' câu hiện "⏳ đang tạo giọng đọc…"');
    await page.shot(SHOTS + '/05_chep_deckB_dang_tao.png');
    const voiced = await waitFor(page, 'document.querySelectorAll(".kb-p-ct .kb-p-play").length >= 5 && !document.querySelector(".is-wait")', 90000);
    const st = await py(KB + 'st = kb.ai.load_status(kb.AI_DIR)\nresult = {k: st.get(k) for k in ("voice_fail_day", "voice_error", "exhausted")}');
    ok(voiced, 'Gemini tạo xong giọng đọc, cả 5 câu có ▶ Nghe (trạng thái: ' + JSON.stringify(st).slice(0, 160) + ')');
    const tagsB = await page.eval('Array.from(document.querySelectorAll(".kb-p-voice")).map(x => x.textContent)');
    console.log('      nhãn:', JSON.stringify(tagsB));
    await page.eval('document.querySelectorAll(".kb-p-ct")[0].querySelectorAll(".kb-p-play")[1].click()'); await sleep(400);
    ok((await lastPlay()).includes('_cham.wav') && (await lastPlay()).includes('giong'), 'bấm ▶ Chậm → bản chậm Gemini trong kho: ' + (await lastPlay()).slice(-50));
    await page.shot(SHOTS + '/06_chep_deckB_gemini_xong.png');
  } else { console.log('  – bỏ qua bước Gemini TTS thật (đặt KB_REAL_GEMINI=1 để chạy)'); }

  // ---- deck E (kanji đơn), giọng tắt → hướng dẫn riêng ----
  await deck('E::Kanji đơn', 'kb.save_config(dict_voice="tat")');
  await page.eval('GardenPaper.open("dict")');
  await waitFor(page, 'document.querySelector(".kb-p-empty") !== null');
  const hintE = await page.eval('Array.from(document.querySelectorAll(".kb-p-empty .kb-p-hint")).map(x => x.textContent).join(" | ")');
  ok(/chữ Hán/.test(hintE), 'deck kanji: hướng dẫn riêng: ' + hintE.slice(0, 90));
  await page.shot(SHOTS + '/07_chep_deckE_trong.png');
  // ---- deck D, giọng tắt, không giọng máy → hướng dẫn cài giọng ----
  await deck('D::Chỉ từ, không gì cả', 'kb._ja_tts = False\nkb.save_config(dict_voice="tat")');
  await page.eval('GardenPaper.open("dict")');
  await waitFor(page, 'document.querySelector(".kb-p-empty") !== null');
  const hintD = await page.eval('Array.from(document.querySelectorAll(".kb-p-empty .kb-p-hint")).map(x => x.textContent)');
  ok(hintD.some(h => /Windows/.test(h)) && hintD.some(h => /Tự động/.test(h)), 'deck D không giọng: chỉ cách bật Gemini + cài giọng máy (' + hintD.length + ' dòng)');
  await page.shot(SHOTS + '/08_chep_deckD_trong.png');
  // ---- deck C (từ + audio từ) ----
  await deck('C::Chỉ từ + audio từ', 'kb.save_config(dict_voice="tat")');
  await page.eval('GardenPaper.open("dict")');
  ok(await waitFor(page, 'document.querySelectorAll(".kb-p-ct .kb-p-play").length >= 5'), 'deck C: 5 từ có audio của deck (không cần giọng dự phòng)');
  await page.eval('document.querySelector(".kb-p-ct .kb-p-play").click()'); await sleep(400);
  ok(/kbtest_w_\d\.wav/.test(await lastPlay()), 'phát audio của từ trong media: ' + (await lastPlay()).slice(-40));

  // ---- tab Nguồn báo: thẻ giọng dự phòng ----
  await py(KB + 'kb.save_config(dict_voice="auto")\nresult = 1');
  await page.eval('GardenPaper.open("src")');
  ok(await waitFor(page, 'document.querySelector(".kb-ai-dv") !== null'), 'tab Nguồn báo có thẻ "Giọng đọc cho câu không có audio"');
  await page.eval('document.querySelector(".kb-ai-dv").scrollIntoView()');
  await page.shot(SHOTS + '/09_nguon_bao.png');
  await page.eval('Array.from(document.querySelectorAll(".kb-ai-dv .kb-ai-chip")).find(b => b.textContent === "Giọng máy").click()');
  await sleep(800);
  ok((await py(KB + 'result = kb.config().get("dict_voice")')) === 'may', 'bấm "Giọng máy" → lưu dict_voice = may');
  await py(KB + 'kb.save_config(dict_voice="auto")\nresult = 1');
  // ---- cửa sổ nhỏ ----
  await py(KB + 'kb._dialog.resize(1024, 640); result = 1'); await sleep(800);
  await deck('B::Có câu ví dụ, không audio', 'kb._ja_tts = True');
  await page.eval('GardenPaper.open("dict")'); await sleep(1500);
  const overflow = await page.eval('document.documentElement.scrollWidth > innerWidth + 2');
  ok(!overflow, 'cửa sổ 1024×640: không tràn ngang');
  await page.shot(SHOTS + '/10_chep_1024.png');
  // ---- lỗi JS / Python ----
  ok(page.errors.length === 0, 'không có lỗi JS trên trang' + (page.errors.length ? ': ' + page.errors.join(' | ').slice(0, 300) : ''));
  const errs = await py(KB + 'result = [e for e in kb.ERRORS.entries()]');
  ok(!errs || !errs.length, 'nhật ký lỗi của add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 400) : ''));
  const fails = results.filter(r => !r[0]).length;
  console.log('\nKẾT QUẢ: ' + (results.length - fails) + '/' + results.length + ' đạt');
  page.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
