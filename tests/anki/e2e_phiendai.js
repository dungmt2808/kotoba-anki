// 1.36.5 — kiểm tra ngoài bộ test có sẵn (lần 2): PHIÊN ÔN DÀI trong Anki thật với vườn Giáng sinh đầy đồ (20 ngăn đã mở, đèn sân,
// cây thông, áo nhà, tường / sàn Noel). Người dùng hay để vườn mở cả buổi: mỗi lượt chấm dựng lại cả vườn (GardenDialog.refresh)
// → nếu một module gắn thêm bộ nghe / vòng vẽ / hẹn giờ mỗi lần dựng lại thì sau vài trăm thẻ vườn chậm dần, bấm một lần chạy
// nhiều lần. Đo trước / sau 300 lượt chấm (+ mở / đóng tủ lịch, bảng Nhà, xưởng thiệp xen giữa):
//   - bộ nhớ JS sau khi dọn rác (HeapProfiler.collectGarbage), số phần tử DOM;
//   - số bộ nghe sự kiện trên window / document (DOMDebugger.getEventListeners);
//   - số lần gọi requestAnimationFrame mỗi giây (= số vòng vẽ đang chạy × khung hình), số setInterval còn sống, setTimeout mỗi giây;
//   - thời gian một khung hình;
//   - bấm chip Tủ lịch một lần → bảng mở (không mở rồi đóng vì chạy hai lần); revlog đúng 300 lượt; không lỗi JS, nhật ký lỗi trống.
// Chạy: run_versions.sh … "e2e_phiendai.js" (hoặc run_ui.sh).
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_phiendai';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const N = Number(process.env.KB_PHIEN_N || 300);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLe !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(100); }
  return false;
}
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
le = kb.le_core
`;
// đếm gọi rAF / setInterval / setTimeout từ lúc cài (vòng vẽ có sẵn gọi lại rAF mỗi khung nên vẫn đếm được)
const INSTR = `if (!window.__kbI) {
  const I = window.__kbI = { raf: 0, ivLive: new Set(), to: 0 };
  const r0 = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (f) => { I.raf++; return r0(f); };
  const si = window.setInterval.bind(window), ci = window.clearInterval.bind(window), st = window.setTimeout.bind(window);
  window.setInterval = (f, ms, ...a) => { const id = si(f, ms, ...a); I.ivLive.add(id); return id; };
  window.clearInterval = (id) => { I.ivLive.delete(id); return ci(id); };
  window.setTimeout = (f, ms, ...a) => { I.to++; return st(f, ms, ...a); };
} return 1;`;
async function listeners(expr) {
  const r = await page.send('Runtime.evaluate', { expression: expr });
  const l = await page.send('DOMDebugger.getEventListeners', { objectId: r.result.objectId, depth: 0 });
  const by = {};
  for (const x of l.listeners) by[x.type] = (by[x.type] || 0) + 1;
  return { n: l.listeners.length, by };
}
async function metrics(label) {
  await page.send('HeapProfiler.collectGarbage'); await sleep(400);
  await page.send('HeapProfiler.collectGarbage'); await sleep(400);
  const heap = await page.send('Runtime.getHeapUsage');
  const dom = await js('return document.getElementsByTagName("*").length;');
  const lw = await listeners('window'), ld = await listeners('document');
  const a = await js('const I = window.__kbI; return [I.raf, I.to, performance.now()];');
  const ft = await js(`return new Promise((res) => { const ts = []; const f = (t) => { ts.push(t); if (ts.length < 61) requestAnimationFrame(f); else res(ts); }; requestAnimationFrame(f); });`);
  const b = await js('const I = window.__kbI; return [I.raf, I.to, performance.now(), I.ivLive.size];');
  const sec = (b[2] - a[2]) / 1000;
  const gaps = ft.slice(1).map((t, i) => t - ft[i]).sort((x, y) => x - y);
  const m = { heapMB: +(heap.usedSize / 1048576).toFixed(1), dom, lw: lw.n, ld: ld.n, lwBy: lw.by, ldBy: ld.by,
    rafPerSec: Math.round((b[0] - a[0] - 60) / sec), toPerSec: Math.round((b[1] - a[1]) / sec), iv: b[3],
    frameMs: +gaps[Math.floor(gaps.length / 2)].toFixed(1) };
  console.log('  [' + label + '] ' + JSON.stringify({ heapMB: m.heapMB, dom: m.dom, lw: m.lw, ld: m.ld, rafPerSec: m.rafPerSec, toPerSec: m.toPerSec, iv: m.iv, frameMs: m.frameMs }));
  return m;
}
async function answerOne(ease) {
  const r0 = await py(KB + 'result = mw.col.db.scalar("select count() from revlog")');
  await py(KB + 'kb._dialog._dispatch("rv:show:")\nresult = 1');
  await py(KB + `kb._dialog._dispatch("rv:ans:${ease}")\nresult = 1`);
  for (let i = 0; i < 80; i++) {
    await sleep(60);
    const s = await py(KB + 'd = kb._dialog\nresult = [mw.col.db.scalar("select count() from revlog"), d._busy, d._card is not None]');
    if (s[0] > r0 && !s[1] && s[2]) { return true; }
  }
  return false;
}

(async () => {
  console.log('== chuẩn bị: vườn Giáng sinh ngày 20/12 (20 ngăn đã mở), deck 600 thẻ');
  const did = await py(KB + `col = mw.col
did = col.decks.id("Phiên dài")
m = col.models.by_name("Basic") or col.models.current()
for i in range(600):
    n = col.new_note(m); n.fields[0] = "từ %d" % i; n.fields[1] = "nghĩa %d" % i; col.add_note(n, did)
conf = col.decks.config_dict_for_deck_id(did); conf["new"]["perDay"] = 9999; conf["rev"]["perDay"] = 9999; col.decks.save(conf)
col.decks.select(did)
d = st.load(); d["coins"] = 5000; d["home"]["house"] = 7; d["home"]["owned"] = {}
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
st.save(d)
ev = le.simulate(datetime.date(2026, 12, 20))
mw.col.set_config("kotoba_batake_le", {"v": 1, "noel2026": ev})
d = st.load(); d["home"]["owned"]["xmastree"] = 1
sp = kb.core.le_auto_spot(d["home"], "xmastree")
if sp:
    d["home"][sp[0]].append({"id": "xmastree", "x": sp[1], "y": sp[2]})
st.save(d)
kb.LE_TEST = {"today": "2026-12-20", "days": [le.door_date(i).isoformat() for i in range(1, 21)], "reviews": 0}
kb.save_config(show_tooltips=False, sound=False, music=False, season_event=True, effects=True, ui={"greet": "off", "trans": "off"})
result = did`);
  await py(KB + 'kb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await page.send('HeapProfiler.enable');
  await py(KB + `kb._dialog._dispatch("deck:${did}"); kb._dialog.resize(1366, 860); result = 1`); await sleep(1500);
  const w = await py(KB + 'd = st.load(); result = {"owned": d["home"]["owned"], "yard": len(d["home"]["yard"])}');
  // (cây thông: sổ giả đã ghi "đã tặng" → không tặng lại — đúng thiết kế, cây thông là món bán ở cửa hàng mùa; ở đây đặt thêm)
  ok(w.owned.le_tulich === 1 && Object.keys(w.owned).filter((k) => k.startsWith('le_')).length >= 5,
    'vườn có quà của 20 ngăn: ' + Object.keys(w.owned).join(','));
  await js(INSTR);
  await page.shot(SHOTS + '/phiendai_00_dau.png');

  console.log('== khởi động: 10 lượt chấm');
  await py(KB + 'kb._dialog._dispatch("rv:start")\nresult = 1'); await sleep(800);
  const rv0 = await py(KB + 'result = mw.col.db.scalar("select count() from revlog")');
  for (let i = 0; i < 10; i++) await answerOne(3);
  await py(KB + 'kb._dialog._dispatch("rv:stop")\nresult = 1'); await sleep(800);
  const m0 = await metrics('sau 10 lượt');

  console.log('== ' + N + ' lượt chấm, xen mở / đóng bảng');
  const t0 = Date.now();
  let done = 0, stuck = 0, twice = 0;
  await py(KB + 'kb._dialog._dispatch("rv:start")\nresult = 1'); await sleep(800);
  for (let i = 0; i < N; i++) {
    const got = await answerOne(1 + (i * 7) % 4);
    if (got) done++; else stuck++;
    if (i % 50 === 49) {
      await py(KB + 'kb._dialog._dispatch("rv:stop")\nresult = 1'); await sleep(600);
      await page.click('#kb-le-chip');
      const open1 = await waitFor('!document.getElementById("kb-le-pop").hidden', 3000);
      await sleep(400);
      const still = await js('return !document.getElementById("kb-le-pop").hidden;');
      if (!open1 || !still) twice++;
      await page.key('Escape', 'Escape', 27); await sleep(400);
      await page.key('n', 'KeyN', 78); await sleep(700);
      await page.key('Escape', 'Escape', 27); await sleep(400);
      await py(KB + 'kb._dialog._dispatch("rv:start")\nresult = 1'); await sleep(600);
    }
  }
  await py(KB + 'kb._dialog._dispatch("rv:stop")\nresult = 1'); await sleep(1000);
  const secs = Math.round((Date.now() - t0) / 1000);
  const rv1 = await py(KB + 'result = mw.col.db.scalar("select count() from revlog")');
  ok(done === N && stuck === 0, N + ' lượt chấm xong (' + secs + ' giây, kẹt ' + stuck + ')');
  ok(rv1 - rv0 === N + 10, 'revlog +' + (rv1 - rv0) + ' (= ' + (N + 10) + ')');
  ok(twice === 0, 'bấm chip Tủ lịch một lần → bảng mở và ở yên (6 lần, lần nào cũng vậy)');
  const m1 = await metrics('sau ' + (N + 10) + ' lượt');
  await page.shot(SHOTS + '/phiendai_01_cuoi.png');

  ok(m1.heapMB - m0.heapMB < 15, 'bộ nhớ JS sau dọn rác: ' + m0.heapMB + ' → ' + m1.heapMB + ' MB (tăng < 15 MB)');
  ok(m1.dom <= m0.dom * 1.1 + 20, 'phần tử DOM: ' + m0.dom + ' → ' + m1.dom);
  ok(m1.lw <= m0.lw + 2, 'bộ nghe trên window: ' + m0.lw + ' → ' + m1.lw + ' ' + JSON.stringify(m1.lwBy));
  ok(m1.ld <= m0.ld + 2, 'bộ nghe trên document: ' + m0.ld + ' → ' + m1.ld + ' ' + JSON.stringify(m1.ldBy));
  ok(m1.rafPerSec <= Math.max(m0.rafPerSec * 1.3, m0.rafPerSec + 15), 'rAF / giây (số vòng vẽ × khung): ' + m0.rafPerSec + ' → ' + m1.rafPerSec);
  ok(m1.iv <= m0.iv + 1, 'setInterval còn sống (tạo sau khi đo): ' + m0.iv + ' → ' + m1.iv);
  ok(m1.toPerSec <= Math.max(m0.toPerSec * 1.5, m0.toPerSec + 10), 'setTimeout / giây lúc vườn đứng yên: ' + m0.toPerSec + ' → ' + m1.toPerSec);
  ok(m1.frameMs <= Math.max(m0.frameMs * 1.5, 25), 'khung hình (trung vị): ' + m0.frameMs + ' → ' + m1.frameMs + ' ms');

  ok(page.errors.length === 0, 'không lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  ok(!(elog || []).length, 'nhật ký lỗi trống' + ((elog || []).length ? ': ' + JSON.stringify(elog[0]).slice(0, 400) : ''));
  await py(KB + 'kb.LE_TEST = None\nresult = 1');
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error('LỖI KỊCH BẢN:', e.stack || e.message); process.exit(2); });
