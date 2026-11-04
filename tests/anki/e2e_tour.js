// Vòng tính năng cũ trong Anki thật: phím N / Q / T / B / R, Esc chỉ đóng bảng, ôn 1 thẻ thật (revlog).
// Chạy: node e2e_tour.js SHOTS
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2];
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
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
async function waitFor(p, expr, ms = 20000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (await p.eval(expr)) return true; } catch (e) { } await sleep(300); } return false; }
(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  const page = await gardenPage();
  await py(KB + 'kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(1500);
  // ---- vòng tính năng cũ bằng phím tắt ----
  await page.eval('GardenPaper.isOpen() && document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true}))'); await sleep(500);
  const key = async (k) => { await page.eval(`(() => { const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document; t.dispatchEvent(new KeyboardEvent("keydown", {key: ${JSON.stringify(k)}, code: ${JSON.stringify(k === ' ' ? 'Space' : k.length === 1 ? 'Key' + k.toUpperCase() : k)}, bubbles: true, cancelable: true})); })()`); await sleep(900); };
  for (const [k, name] of [['n', 'Nhà'], ['q', 'Nhiệm vụ'], ['t', 'Trò chơi'], ['b', 'Báo']]) {
    await key(k);
    await page.shot(SHOTS + '/12_phim_' + k + '.png');
    const vis = await page.eval(k === 'q' ? '!document.getElementById("kb-quest-pop").hidden' : 'Array.from(document.querySelectorAll("[class*=panel], [class*=modal], .kb-p-stage, [id*=panel]")).some(e => e.offsetParent !== null)');
    ok(vis, 'phím ' + k.toUpperCase() + ' mở ' + name);
    await key('Escape');
    ok(await py(KB + 'result = kb._dialog is not None and kb._dialog.isVisible()'), '  Esc đóng ' + name + ', cửa sổ vườn vẫn mở');
  }
  // ôn thẻ trong vườn: R, lật, chấm Good
  await key('r'); await sleep(1500);
  await page.shot(SHOTS + '/13_on_the.png');
  const before = await py('result = mw.col.db.scalar("select count() from revlog")');
  await key(' '); await sleep(600);
  await key('3'); await sleep(1500);
  const after = await py('result = mw.col.db.scalar("select count() from revlog")');
  ok(after === before + 1, 'ôn 1 thẻ trong vườn (Space → 3): revlog ' + before + ' → ' + after);
  await key('Escape');
  ok(await py(KB + 'result = kb._dialog is not None and kb._dialog.isVisible()'), 'Esc khi đang ôn: chỉ đóng bảng ôn');
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.join(' | ').slice(0, 300) : ''));
  const errs = await py(KB + 'result = kb.ERRORS.entries()');
  ok(!errs || !errs.length, 'nhật ký lỗi add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 300) : ''));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length + ' đạt'); page.close(); process.exit(0);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
