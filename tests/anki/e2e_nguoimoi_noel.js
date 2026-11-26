// 1.36.4 — kiểm tra ngoài bộ test có sẵn: NGƯỜI MỚI cài ことば畑 trong mùa Giáng sinh, màn chào + hướng dẫn 3 bước BẬT như người
// dùng thật (kịch bản cũ tắt hai thứ này qua zz_kbtest). Hồ sơ mới = 0 xu, chưa tưới, chưa nhà, chưa có đồ.
//   0. đối chứng 28/11 (trước mùa): màn chào → hướng dẫn 3 bước;
//   1. cài 1/12: vườn tặng tủ lịch + cây thông VÀ vẫn có hướng dẫn 3 bước (trước 1.36.4: quà tặng làm hồ sơ "có đồ" → mất hướng dẫn);
//      lần mở sau (đã có quà) vẫn còn hướng dẫn nếu chưa xong; người đang chơi (có xu / đã tưới) không thấy;
//   2. cài tối 24/12 (19:00): hướng dẫn / màn chào / cảnh ông già Noel không đè nhau, bấm được tới cuối;
//   3. cài sáng 25/12: thư của ông + hướng dẫn không đè nhau;
//   4. cài 2/1/2027 (hết mùa): như đối chứng;
//   không lỗi JS, nhật ký lỗi trống.
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_nguoimoi_noel';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenTour !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
const errors = [];
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(120); }
  return false;
}
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
le = kb.le_core
`;
async function reopen(before) {
  if (page) {
    (page.errors || []).forEach((e) => errors.push(e));
    await js('try { ["kb-greet-day", "kb-tour-done"].forEach((k) => localStorage.removeItem(k)); } catch (e) {} return 1;').catch(() => 0);
    try { page.close(); } catch (e) { }
  }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(700);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data()', 8000);
  await sleep(600);
}
// hồ sơ mới hoàn toàn: ví trống, sổ sự kiện trống, chào lại + hướng dẫn lại
const NEWBIE = `mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
d = st.load(); d["coins"] = 0; d["waters"] = 0; d["harvests"] = 0; d["home"]["house"] = 0; d["home"]["owned"] = {}
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
st.save(d)
cfg = kb.config(); pr = dict(cfg.get("prefs") or {}); [pr.pop(k, None) for k in ("kb-greet-day", "kb-tour-done")]; kb.save_config(prefs=pr)
mw.col.decks.select(1)
`;
const TEST = (today, now) => `kb.LE_TEST = {"today": "${today}", "now": "${now}", "days": [], "reviews": 0}\n`;
const tour = () => js('return GardenTour._state();');
// mọi lớp nổi đang hiện (để thấy cái nào đè cái nào)
const LAYERS = `return [["chào", ".kb-greet"], ["hướng dẫn", "#kb-tour"], ["quà sự kiện", "#kb-le-welcome, .kb-le-welcome"], ["cảnh đêm 24", "#kb-le-show"],
  ["thư", "#kb-le-letter"], ["tủ lịch", "#kb-le-pop"], ["cất đồ", "#kb-le-packpop"]].filter(([n, s]) => [...document.querySelectorAll(s)].some((e) => !e.hidden && e.getClientRects().length && getComputedStyle(e).display !== "none" && getComputedStyle(e).visibility !== "hidden")).map((x) => x[0]);`;
// bấm qua các lớp như người dùng: màn chào (bấm), cảnh đêm (Bỏ qua → Đóng), thư (Esc), quà (Esc) — tới khi còn hướng dẫn hoặc hết
async function dismissUntilTour(maxSteps = 8) {
  const seen = [];
  for (let i = 0; i < maxSteps; i++) {
    await sleep(700);
    const L = await js(LAYERS);
    seen.push(L.join('+') || '∅');
    const t = await tour();
    if (t.shown && !L.some((x) => x !== 'hướng dẫn')) { return { seen, tour: true }; }
    if (L.includes('chào')) { await js('const g = document.querySelector(".kb-greet"); if (g) g.click(); return 1;').catch(() => 0); continue; }
    if (L.includes('cảnh đêm 24')) {
      await js('const b = document.getElementById("kb-le-show-skip"); if (b && !b.hidden) b.click(); return 1;'); await sleep(400);
      await js('const b = document.getElementById("kb-le-show-close"); if (b && !b.hidden) b.click(); return 1;'); continue;
    }
    if (L.length) { await page.key('Escape', 'Escape', 27); continue; }
    if (!t.shown) { await sleep(800); if (!(await tour()).shown) { return { seen, tour: false }; } }
  }
  return { seen, tour: (await tour()).shown };
}

(async () => {
  await py(KB + `kb.GREET_TEST_OFF = False
kb.TOUR_TEST_OFF = False
kb.save_config(show_tooltips=False, sound=False, music=False, season_event=True, ui={})
result = 1`);
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1');

  console.log('== 0. đối chứng: cài 28/11 (trước mùa)');
  await reopen(NEWBIE + TEST('2026-11-28', '2026-11-28T10:00'));
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  ok(await py(KB + 'result = kb.event_core.is_new_player(st.load())'), 'Python: hồ sơ mới');
  let r = await dismissUntilTour();
  ok(r.tour, 'hướng dẫn 3 bước hiện (lớp: ' + r.seen.join(' → ') + ')');
  await page.shot(SHOTS + '/nm_0_2811.png');

  console.log('== 1. cài 1/12 — tặng tủ lịch + cây thông');
  await reopen(NEWBIE + TEST('2026-12-01', '2026-12-01T10:00'));
  const w = await py(KB + 'd = st.load(); result = {"owned": d["home"]["owned"], "new": kb.event_core.is_new_player(d), "tour": kb._dialog is not None}');
  ok(w.owned.le_tulich === 1 && w.owned.xmastree === 1, 'đã tặng tủ lịch + cây thông: ' + JSON.stringify(w.owned));
  const dt = await js('return !!Garden._data().tour;');
  ok(dt, 'data.tour = true (người mới vẫn được hướng dẫn dù vừa nhận quà sự kiện)');
  r = await dismissUntilTour();
  ok(r.tour, 'hướng dẫn 3 bước hiện sau màn chào / thông báo quà (lớp: ' + r.seen.join(' → ') + ')');
  await page.shot(SHOTS + '/nm_1_0112.png');
  await reopen(TEST('2026-12-01', '2026-12-01T11:00'));
  ok(await js('return !!Garden._data().tour;'), 'mở lại (chưa xong hướng dẫn, đã có quà): vẫn là người mới');
  await reopen(TEST('2026-12-02', '2026-12-02T11:00') + 'd = st.load(); d["coins"] = 12; d["waters"] = 3; st.save(d)\n');
  ok(!(await js('return !!Garden._data().tour;')), 'người đã tưới / có xu: không hiện hướng dẫn');

  console.log('== 2. cài tối 24/12 (19:00)');
  await reopen(NEWBIE + TEST('2026-12-24', '2026-12-24T19:00'));
  ok(await js('return !!Garden._data().tour;'), 'data.tour = true');
  r = await dismissUntilTour(10);
  ok(r.tour, 'qua được màn chào / cảnh ông già Noel tới hướng dẫn (lớp: ' + r.seen.join(' → ') + ')');
  ok(!r.seen.some((s) => s.includes('hướng dẫn+') || /\+hướng dẫn/.test(s)), 'hướng dẫn không hiện đè lớp khác');
  await page.shot(SHOTS + '/nm_2_2412.png');
  if (r.tour) {
    await page.click('#kb-tour-skip').catch(() => 0);
    ok(await waitFor('(() => { const s = document.getElementById("kb-le-show"); return !!s && !s.hidden; })()', 6000),
      'người mới bấm "Bỏ qua" hướng dẫn → cảnh ông già Noel tự chạy (không lỡ)');
    ok(await js('return !GardenTour._state().shown;'), 'hướng dẫn không hiện lại đè cảnh');
    await page.click('#kb-le-show-skip').catch(() => 0); await sleep(400);
    await js('const b = document.getElementById("kb-le-show-close"); if (b && !b.hidden) b.click(); return 1;');
  }

  console.log('== 3. cài sáng 25/12');
  await reopen(NEWBIE + TEST('2026-12-25', '2026-12-25T09:00'));
  r = await dismissUntilTour(10);
  ok(r.tour, 'qua được thư / quà tới hướng dẫn (lớp: ' + r.seen.join(' → ') + ')');
  ok(!r.seen.some((s) => s.includes('hướng dẫn+') || /\+hướng dẫn/.test(s)), 'hướng dẫn không hiện đè lớp khác');
  await page.shot(SHOTS + '/nm_3_2512.png');

  console.log('== 4. cài 2/1/2027 (hết mùa)');
  await reopen(NEWBIE + TEST('2027-01-02', '2027-01-02T10:00'));
  r = await dismissUntilTour();
  ok(r.tour, 'hướng dẫn 3 bước (lớp: ' + r.seen.join(' → ') + ')');
  const ow = await py(KB + 'result = st.load()["home"]["owned"]');
  ok(!ow.le_tulich && !ow.xmastree, 'hết mùa: không tặng gì');

  console.log('== 5. người dùng cũ, màn chào bật (mặc định): mở vườn lần đầu tối 24 / sáng 25');
  const OLD = (today, now) => `mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
d = st.load(); d["coins"] = 900; d["waters"] = 50; d["home"]["house"] = 7; st.save(d)
cfg = kb.config(); pr = dict(cfg.get("prefs") or {}); pr.pop("kb-greet-day", None); pr["kb-tour-done"] = "1"; kb.save_config(prefs=pr)
kb.LE_TEST = {"today": "${today}", "now": "${now}", "days": ["2026-12-%02d" % i for i in range(1, 25)], "reviews": 3}
`;
  const STATE = `return (() => { const g = document.getElementById("kb-greet"), s = document.getElementById("kb-le-show"), l = document.getElementById("kb-le-letter");
    return { greet: GardenGreet.isGreeting(), show: !!(s && !s.hidden), letter: !!(l && !l.hidden),
             top: (document.elementFromPoint(innerWidth / 2, innerHeight / 2) || {}).id || "" }; })();`;
  await reopen(OLD('2026-12-24', '2026-12-24T19:00'));
  const samples = [];
  for (let i = 0; i < 14; i++) { samples.push(await js(STATE)); await sleep(300); }
  const firstGreet = samples.filter((s) => s.greet);
  ok(firstGreet.length > 0, 'màn chào hiện (' + firstGreet.length + ' / ' + samples.length + ' lần đo)');
  ok(firstGreet.every((s) => !s.show), 'trong lúc màn chào còn: cảnh ông già Noel CHƯA chạy (1.36.3: chạy luôn bên dưới màn chào)');
  await page.shot(SHOTS + '/nm_5_2412_chao.png');
  await js('const g = document.querySelector(".kb-greet"); if (g) g.click(); return 1;').catch(() => 0);
  ok(await waitFor('(() => { const s = document.getElementById("kb-le-show"); return !GardenGreet.isGreeting() && !!s && !s.hidden; })()', 8000),
    'hết màn chào → cảnh ông già Noel tự chạy từ đầu');
  const top = await js(STATE);
  ok(/kb-le-show/.test(top.top), 'cảnh nằm trên cùng (giữa màn hình: #' + top.top + ')');
  await page.shot(SHOTS + '/nm_5_2412_canh.png');
  await page.click('#kb-le-show-skip').catch(() => 0); await sleep(400);
  await js('const b = document.getElementById("kb-le-show-close"); if (b && !b.hidden) b.click(); return 1;');
  await reopen(OLD('2026-12-25', '2026-12-25T09:00').replace('mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None\n', ''));
  const s25 = [];
  for (let i = 0; i < 10; i++) { s25.push(await js(STATE)); await sleep(300); }
  ok(s25.filter((s) => s.greet).every((s) => !s.letter), 'sáng 25: thư chưa bật khi màn chào còn');
  await js('const g = document.querySelector(".kb-greet"); if (g) g.click(); return 1;').catch(() => 0);
  ok(await waitFor('(() => { const l = document.getElementById("kb-le-letter"); return !GardenGreet.isGreeting() && !!l && !l.hidden; })()', 8000),
    'hết màn chào → thư của ông già Noel tự mở');
  await page.key('Escape', 'Escape', 27); await sleep(300);

  (page.errors || []).forEach((x) => errors.push(x));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  ok(!(elog || []).length, 'nhật ký lỗi trống' + ((elog || []).length ? ': ' + JSON.stringify(elog[0]).slice(0, 300) : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
