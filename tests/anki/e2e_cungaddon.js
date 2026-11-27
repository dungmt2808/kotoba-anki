// 1.36.5 — kiểm tra 1.36.4 lần 2 (người dùng cho phép chạy 27/11): ことば畑 CÀI CHUNG với 6 add-on phổ biến trên AnkiWeb trong
// Anki thật. Chạy: KB_EXTRA_ADDONS=<thư mục có 6 add-on, mỗi add-on một thư mục đặt tên theo mã AnkiWeb> run_versions.sh … e2e_cungaddon.js
//   Memory Forest 1255432496 · Onigiri 1011095603 · AnkiConnect 2055492159 · Review Heatmap 1771074083 · AJT Japanese 1344485230 ·
//   FSRS Helper 759844606 (bản tải 27/11 cho Anki 26.09.4; không đưa vào repo).
//   A. mọi add-on nạp được, ことば畑 nạp được;
//   B. nút ことば畑: thanh trên cùng có link; Onigiri gom link vào thanh bên của nó — gọi đúng đường Onigiri xử lý khi bấm → mở vườn;
//   C. vườn: không lỗi JS; Nhà (N) → Esc chỉ đóng bảng;
//   D. ôn 5 thẻ trong bảng ôn của vườn (revlog +5) — các add-on nghe móc của Anki không ném lỗi;
//   E. AnkiConnect lúc vườn đang mở: version, deckNames, addNote vào deck đang xem → Tưới / dựng lại vườn được;
//   F. Giáng sinh 1/12 (kb.LE_TEST): tặng tủ lịch + thông báo "Quà tặng" trong vườn;
//   G. đóng vườn → màn hình deck (Onigiri + Memory Forest) dựng lại, không lỗi; 0 cửa sổ vườn còn chạy đồng hồ;
//   H. nhật ký lỗi ことば畑 trống; log Anki không có traceback nào dính kotoba_batake (traceback của add-on khác: liệt kê, không tính).
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_cungaddon';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const IDS = { '1255432496': 'Memory Forest', '1011095603': 'Onigiri', '2055492159': 'AnkiConnect', '1771074083': 'Review Heatmap',
  '1344485230': 'AJT Japanese', '759844606': 'FSRS Helper' };
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function ac(action, params) {         // AnkiConnect (cổng 8765)
  const r = await fetch('http://127.0.0.1:8765', { method: 'POST', body: JSON.stringify({ action, version: 6, params: params || {} }) });
  return r.json();
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLe !== "undefined" && !!Garden._data && !!Garden._data()').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(150); }
  return false;
}
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
`;
const key = async (k, code, kc) => { await page.key(k, code, kc); await sleep(700); };

(async () => {
  console.log('== A. add-on nạp được');
  const info = await py(KB + `am = mw.addonManager
dirs = am.allAddons()
result = {"dirs": dirs, "off": [d for d in dirs if not am.isEnabled(d)], "mods": [d for d in dirs if d in sys.modules]}`);
  for (const id of Object.keys(IDS)) {
    ok(info.dirs.includes(id) && !info.off.includes(id) && info.mods.includes(id), IDS[id] + ' (' + id + ') đã nạp');
  }
  ok(info.mods.includes('kotoba_batake'), 'ことば畑 đã nạp cùng ' + Object.keys(IDS).length + ' add-on');

  console.log('== B. nút ことば畑: thanh trên cùng + thanh bên Onigiri');
  const tb = await py(KB + 'result = "kotoba_batake" in getattr(mw.toolbar, "link_handlers", {})');
  ok(tb, 'thanh trên cùng có link "kotoba_batake"');
  const oni = await py(KB + `m = sys.modules.get("1011095603.api.sidebar")
result = None if m is None else sorted(getattr(m, "_toolbar_cmds", set()))`);
  ok(oni === null || oni.includes('kotoba_batake'), 'Onigiri gom link ことば畑 vào thanh bên: ' + JSON.stringify(oni));
  const opened = await py(KB + `m = sys.modules.get("1011095603.api.sidebar")
if m is not None and hasattr(m, "_dispatch_toolbar_cmd"):
    res = m._dispatch_toolbar_cmd((False, None), "kotoba_batake", None)     # đúng đường Onigiri gọi khi bấm ở thanh bên
    how = "onigiri"
else:
    mw.toolbar.link_handlers["kotoba_batake"]()
    how = "toolbar"
result = [how, kb._dialog is not None]`);
  await sleep(2500);
  ok(opened[1], 'bấm nút ことば畑 (' + opened[0] + ') → mở vườn');
  page = await gardenPage();
  ok(!!page, 'trang vườn dựng được');
  if (!page) { throw new Error('không có trang vườn'); }
  await py(KB + `kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
kb._dialog.resize(1366, 860); kb._dialog._dispatch("deck:" + str(mw.col.decks.id_for_name("A::Có câu ví dụ + audio"))); result = 1`);
  await sleep(1500);
  await page.shot(SHOTS + '/cungaddon_01_vuon.png');

  console.log('== C. phím N → Esc chỉ đóng bảng');
  await key('n', 'KeyN', 78);
  ok(await waitFor('(() => { const h = document.getElementById("kb-home"); return !!h && !h.hidden; })()', 3000), 'N mở bảng Nhà');
  await key('Escape', 'Escape', 27);
  ok(await waitFor('(() => { const h = document.getElementById("kb-home"); return !h || h.hidden; })()', 3000), 'Esc đóng bảng Nhà');
  ok(await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())'), 'cửa sổ vườn vẫn mở');

  console.log('== D. ôn 5 thẻ trong bảng ôn của vườn');
  const r0 = await py(KB + 'result = mw.col.db.scalar("select count() from revlog")');
  await py(KB + 'kb._dialog._dispatch("rv:start")\nresult = 1'); await sleep(800);
  for (let i = 0; i < 5; i++) {
    const a = await py(KB + 'result = mw.col.db.scalar("select count() from revlog")');
    await py(KB + 'kb._dialog._dispatch("rv:show:")\nresult = 1'); await sleep(300);
    await py(KB + 'kb._dialog._dispatch("rv:ans:' + (1 + i % 4) + '")\nresult = 1');
    for (let k = 0; k < 60; k++) { await sleep(100); if ((await py(KB + 'result = [mw.col.db.scalar("select count() from revlog"), kb._dialog._busy]'))[0] > a) break; }
    await sleep(400);
  }
  await py(KB + 'kb._dialog._dispatch("rv:stop")\nresult = 1'); await sleep(800);
  const r1 = await py(KB + 'result = mw.col.db.scalar("select count() from revlog")');
  ok(r1 - r0 === 5, 'revlog +' + (r1 - r0) + ' (= 5)');

  console.log('== E. AnkiConnect lúc vườn đang mở');
  let v = null;
  try { v = await ac('version'); } catch (e) { v = { error: e.message }; }
  ok(v && v.result >= 6, 'AnkiConnect trả lời: version ' + JSON.stringify(v));
  const dn = await ac('deckNames');
  ok(Array.isArray(dn.result) && dn.result.includes('A::Có câu ví dụ + audio'), 'deckNames: ' + (dn.result || []).length + ' deck');
  const nn = await ac('addNote', { note: { deckName: 'A::Có câu ví dụ + audio', modelName: 'Basic', fields: { Front: 'AnkiConnect 試験', Back: 'thử AnkiConnect' }, options: { allowDuplicate: true } } });
  ok(Number.isInteger(nn.result) && !nn.error, 'addNote: ' + JSON.stringify(nn));
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1200);
  ok(await page.eval('Array.isArray(Garden._data().plants)'), 'vườn dựng lại sau addNote');

  console.log('== F. Giáng sinh 1/12');
  await py(KB + `mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
d = st.load(); d["home"]["house"] = 7; st.save(d)
kb.save_config(season_event=True)
kb.LE_TEST = {"today": "2026-12-01", "days": [], "reviews": 0}
kb._dialog.refresh()
result = 1`);
  let gift = false;
  for (let i = 0; i < 40 && !gift; i++) { gift = await page.eval('(() => { const t = document.getElementById("kb-toast"); return !!t && /Quà tặng/.test(t.textContent); })()').catch(() => false); if (!gift) await sleep(300); }
  ok(gift, 'thông báo "Lịch chờ Giáng sinh mở rồi! Quà tặng: …"');
  const w = await py(KB + 'result = st.load()["home"]["owned"]');
  ok(w.le_tulich === 1, 'tủ lịch vào kho');
  await page.click('#kb-le-chip');
  ok(await waitFor('!document.getElementById("kb-le-pop").hidden', 3000), 'bảng tủ lịch mở');
  await page.shot(SHOTS + '/cungaddon_02_tulich.png');
  await key('Escape', 'Escape', 27);
  await py(KB + 'kb.LE_TEST = None\nresult = 1');
  const jsErr = page.errors.slice();
  ok(!jsErr.length, 'không lỗi JS trong vườn' + (jsErr.length ? ': ' + jsErr.slice(0, 3).join(' | ') : ''));

  console.log('== G. đóng vườn → màn hình deck');
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(800);
  await py(KB + 'mw.moveToState("deckBrowser"); mw.deckBrowser.refresh(); result = 1'); await sleep(2500);
  const main = (await pages(CDP)).find((i) => i.title === 'main webview');
  ok(!!main, 'màn hình deck có trang');
  if (main) {
    const mp = await Page.open(main.webSocketDebuggerUrl);
    const html = await mp.eval('document.body ? document.body.innerHTML.length : 0');
    ok(html > 200, 'màn hình deck dựng được (' + html + ' ký tự)');
    await mp.shot(SHOTS + '/cungaddon_03_deck.png');
    mp.close();
  }
  const ghosts = await py(KB + `from aqt.qt import QDialog
result = sum(1 for o in mw.findChildren(QDialog) if type(o).__name__ == "GardenDialog" and o._day_timer.isActive())`);
  ok(ghosts === 0, 'không cửa sổ vườn nào còn chạy đồng hồ (' + ghosts + ')');

  console.log('== H. nhật ký');
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  ok(!(elog || []).length, 'nhật ký lỗi ことば畑 trống' + ((elog || []).length ? ': ' + JSON.stringify(elog[0]).slice(0, 300) : ''));
  const logf = path.join(SHOTS, 'anki_e2e_cungaddon.log');
  let tb2 = [];
  try {
    const txt = fs.readFileSync(logf, 'utf8').replace(/\u0000/g, '');
    tb2 = txt.split(/Traceback \(most recent call last\):/).slice(1).map((x) => x.split('\n').slice(0, 14).join('\n'));
  } catch (e) { console.log('  (không đọc được log Anki: ' + e.message + ')'); }
  const ours = tb2.filter((x) => /kotoba_batake/.test(x));
  ok(!ours.length, 'log Anki: không traceback nào dính ことば畑' + (ours.length ? ':\n' + ours[0] : ''));
  if (tb2.length) {
    console.log('  (log Anki có ' + tb2.length + ' traceback của add-on khác / Anki — dòng cuối từng cái:)');
    tb2.slice(0, 6).forEach((x) => console.log('     · ' + x.trim().split('\n').filter(Boolean).slice(-1)[0]));
  }
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error('LỖI KỊCH BẢN:', e.stack || e.message); process.exit(2); });
