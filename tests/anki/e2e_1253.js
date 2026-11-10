// 1.25.3 trong Anki thật:
//   1. cài đặt ⚙ (Trời & giờ, Thời tiết, Nhạc nền, Âm lượng, Đuổi quạ) còn nguyên sau khi TẮT HẲN ANKI rồi mở lại
//      (1.25.2: chỉ ở localStorage — webview của Anki dùng profile không lưu → mất), lưu ở config "prefs"
//   2. cỡ cảnh Lớn, Trong nhà: trời phía trên mái cùng màu với trời hai bên, có mưa phía trên mái (ảnh người dùng 10/11)
//   3. Undo lượt ôn vẫn Redo được (audit BUG-01), xu theo đúng Undo / Redo, lần ghi ví sau ghi phần trả lại
//   4. Xưởng: vẽ → đổi cỡ → Esc lần đầu chỉ cảnh báo (audit BUG-03)
//   5. đổi deck nguồn → gợi ý luyện viết tính lại (audit BUG-05)
// Chạy: KB_SCRIPTS=e2e_1253.js run_ui.sh ADDON SHOTS (cần ANKI_PY; bước 1 tự tắt / mở lại Anki bằng kill_anki.sh + run_anki.sh)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1253';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const BASE = process.env.KB_BASE || '/tmp/kb_anki_base';
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
}
async function restartAnki() {
  try { page.close(); } catch (e) { }
  cp.spawnSync(path.join(__dirname, 'kill_anki.sh'), { stdio: 'ignore' });
  const log = fs.openSync(path.join(SHOTS, 'anki_e2e_1253_lan2.log'), 'w');
  const child = cp.spawn(path.join(__dirname, 'run_anki.sh'), [BASE, String(CDP), path.join(SHOTS, 'anki_e2e_1253_lan2.log')],
    { detached: true, stdio: ['ignore', log, log], env: process.env });
  child.unref();
  for (let i = 0; i < 90; i++) {
    try { if (await py('result = bool(mw.col)')) return true; } catch (e) { }
    await sleep(1000);
  }
  return false;
}

(async () => {
  await py(KB + 'kb.save_config(show_tooltips=False, ui={}); result = 1');
  await openGarden();

  console.log('== 1. cài đặt ⚙ còn sau khi tắt hẳn Anki rồi mở lại');
  ok(await js('return typeof GardenPrefs !== "undefined" && window.__kbPrefs && typeof window.__kbPrefs === "object";'), 'trang có GardenPrefs + cài đặt Python đưa vào <head>');
  await js(`document.querySelector("input[name='kb-sky-mode'][value='fixed']").click();
    const h = document.getElementById("kb-sky-hour"); h.value = "18.4"; h.dispatchEvent(new Event("change"));
    const w = document.getElementById("kb-sky-weather"); w.value = "rain"; w.dispatchEvent(new Event("change"));
    const m = document.getElementById("kb-music-on"); if (!m.checked) { m.click(); }      // config test: music=false → bật lên
    const v = document.getElementById("kb-music-vol"); v.value = "25"; v.dispatchEvent(new Event("input"));
    GardenGames._setCrowMode("jp"); return 1;`);
  await sleep(900);
  const saved = await py(KB + 'result = (mw.addonManager.getConfig("kotoba_batake") or {}).get("prefs")');
  const sky0 = saved && saved['kb-sky'] ? JSON.parse(saved['kb-sky']) : {};
  ok(sky0.mode === 'fixed' && sky0.fixedHour === 18.4 && sky0.weather === 'rain', 'config "prefs" có Trời & giờ: Cố định Hoàng hôn, Mưa ' + (saved && saved['kb-sky']));
  ok(saved && saved['kb-music'] === '1' && saved['kb-music-vol'] === '0.25' && saved['kb-crow-mode'] === 'jp',
    'config "prefs" có Nhạc nền Bật (config mặc định của máy test: Tắt), Âm lượng 25%, Đuổi quạ chữ Nhật: ' + JSON.stringify(saved));
  const before = await js('return { sky: GardenSky.settings(), music: GardenMusic.enabled(), vol: GardenMusic.volume() };');
  ok(await restartAnki(), 'tắt hẳn Anki (kill) rồi mở lại cùng thư mục hồ sơ');
  await openGarden();
  const after = await js(`return { ls: localStorage.getItem("kb-sky"), sky: GardenSky.settings(), music: GardenMusic.enabled(), vol: GardenMusic.volume(),
    crow: typeof GardenPrefs !== "undefined" ? GardenPrefs.get("kb-crow-mode") : localStorage.getItem("kb-crow-mode"), radio: (document.querySelector("input[name='kb-sky-mode']:checked") || {}).value,
    hour: document.getElementById("kb-sky-hour").value, weather: document.getElementById("kb-sky-weather").value,
    st: GardenSky.state().weather, h: GardenSky.state().hour };`);
  ok(after.ls === null, 'localStorage trống sau khi mở lại (đúng như máy người dùng: 1.25.2 mất cài đặt ở đây)');
  ok(JSON.stringify(after.sky) === JSON.stringify(before.sky) && after.st === 'rain' && Math.abs(after.h - 18.4) < 1e-6,
    'Trời & giờ còn nguyên: ' + JSON.stringify(after.sky));
  ok(after.radio === 'fixed' && after.hour === '18.4' && after.weather === 'rain', 'bảng ⚙ hiện đúng: Cố định · Hoàng hôn · Mưa');
  ok(after.music === true && Math.abs(after.vol - 0.25) < 1e-9 && after.crow === 'jp', 'Nhạc nền Bật, Âm lượng 25%, Đuổi quạ chữ Nhật còn nguyên');
  await js('document.getElementById("kb-sound-pop").hidden = false; return 1;'); await sleep(300);
  await page.shot(SHOTS + '/1253_01_cai_dat_sau_khi_mo_lai.png');
  await js('document.getElementById("kb-sound-pop").hidden = true; return 1;');

  console.log('== 2. cỡ cảnh Lớn: trời phía trên mái khớp hai bên, mưa cả phía trên mái');
  await py(KB + `d = st.load(); d["coins"] = 10000; d["home"]["house"] = 7; st.save(d)
kb.save_config(ui={"scene": "large"}); kb._dialog.resize(1920, 1080); kb._dialog.refresh(); result = 1`);
  await sleep(1500);
  await js('localStorage.setItem("kb-main-scene", "house"); GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "cloudy"); return 1;');
  await sleep(1500);
  // điểm trời sát mép mái (mái hình thang: rộng dần xuống dưới) so với trời của vườn trái / phải cùng hàng
  const SKYPX = `const cv = document.getElementById("kb-yard"), c = cv.getContext("2d"), v = GardenHome._mainView(), d = cv.width / cv.getBoundingClientRect().width;
    const at = (ax, ay) => { const p = c.getImageData(Math.round((ax + 0.5) * v.S * d), Math.round((ay + 0.5) * v.S * d), 1, 1).data; return [p[0], p[1], p[2]]; };
    const W = 456, hx = v.ox, hy = v.oy, x0 = hx - 12, x1 = hx + W + 12, W0 = x1 - x0 + 4, a0 = x0 - 2, inset = Math.floor(W0 * 0.16);
    const yE = hy - 1, yR = hy - Math.min(44, hy - 6), VW = Math.ceil(cv.getBoundingClientRect().width / v.S);
    const edge = (y) => { if (y < yR) { return a0 + inset - 6; } const t = (y - yR) / Math.max(1, yE - yR); return a0 + Math.round(inset * (1 - t)) - 3; };`;   // trái thanh nóc / mép mái
  const cmp = await js(SKYPX + `
    let same = 0, diff = 0, rows = [];
    for (let y = 1; y < yE - 3; y++) { const x = edge(y); if (x < hx - 3) { continue; }
      const a = at(1, y).join(","), b = at(x, y).join(","), e = at(VW - 2, y).join(",");
      if (a === b && b === e) { same++; } else { diff++; rows.push(y + "@" + x + ":" + a + "|" + b + "|" + e); } }
    return { S: v.S, ox: hx, oy: hy, yR: yR, same: same, diff: diff, rows: rows.slice(0, 4) };`);
  ok(cmp.oy > 40, 'cỡ Lớn ở 1920 × 1080: có khoảng trời phía trên nhà (' + cmp.oy + ' điểm ảnh, ×' + cmp.S + ')');
  ok(cmp.same > 10 && cmp.diff === 0, 'trời sát mép mái cùng màu với vườn trái / phải ở mọi hàng (' + cmp.same + ' hàng khớp, ' + cmp.diff + ' lệch ' + cmp.rows.join(' ') + ')');
  await js('GardenSky.set("weather", "rain"); return 1;'); await sleep(800);
  const rain = await js(SKYPX + `
    let n = 0;
    for (let k = 0; k < 5; k++) { for (let y = 0; y < yE - 2; y++) { for (let x = hx; x < hx + W; x += 1) { const p = at(x, y);
      if (Math.abs(p[0] - 0x4f) < 8 && Math.abs(p[1] - 0x8f) < 8 && Math.abs(p[2] - 0xd8) < 8) { n++; } } } }
    return n;`);
  ok(rain > 0, 'trời mưa: có hạt mưa phía trên nhà, cả trước mái (' + rain + ' điểm ảnh màu mưa; 1.25.2: 0)');
  await js('GardenSky.set("fixedHour", 18.4); return 1;'); await sleep(800);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  await page.shot(SHOTS + '/1253_02_lon_hoang_hon_mua.png');
  await js('GardenSky.set("weather", "cloudy"); GardenSky.set("fixedHour", 10); return 1;'); await sleep(800);
  await page.shot(SHOTS + '/1253_03_lon_ban_ngay.png');
  await py(KB + 'kb.save_config(ui={}); kb._dialog.resize(1366, 768); kb._dialog.refresh(); result = 1'); await sleep(800);

  console.log('== 3. Undo lượt ôn vẫn Redo được');
  await js('localStorage.setItem("kb-main-scene", "yard"); return 1;');
  // hồ sơ test mở lại đang ở deck Default (trống) → chọn deck A (có thẻ mới) như người dùng chọn ở ô Deck
  await py(KB + 'did = mw.col.decks.id_for_name("A::Có câu ví dụ + audio")\nkb._dialog._dispatch("deck:%d" % did)\nresult = did'); await sleep(1200);
  const answer = async () => {
    const n0 = await py(KB + 'result = len(kb._ledger)');
    await js('document.getElementById("kb-review").click(); return 1;');
    await waitFor('return !document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden;');
    await sleep(500);
    await js('document.getElementById("kb-show").click(); return 1;');
    await waitFor('return !document.getElementById("kb-ratings").hidden;');
    await js('document.querySelector(".kb-rate-3").click(); return 1;');
    for (let i = 0; i < 40; i++) { if ((await py(KB + 'result = len(kb._ledger)')) > n0) { break; } await sleep(250); }
    await sleep(400);
    await js('document.getElementById("kb-stop").click(); return 1;'); await sleep(500);
  };
  const raw = 'mw.col.get_config("kotoba_batake_state")["coins"]';
  const c0 = await py(KB + 'result = [st.load()["coins"], ' + raw + ', mw.col.db.scalar("select count() from revlog")]');
  await answer();
  const c1 = await py(KB + 'result = [st.load()["coins"], ' + raw + ', mw.col.db.scalar("select count() from revlog")]');
  ok(c1[0] > c0[0] && c1[2] === c0[2] + 1, 'ôn 1 thẻ: +' + (c1[0] - c0[0]) + ' xu, revlog +1');
  await py(KB + 'from aqt.operations.collection import undo; undo(parent=mw); result = 1'); await sleep(1500);
  const u = await py(KB + 'mw.update_undo_actions()\nresult = [st.load()["coins"], ' + raw + ', mw.col.db.scalar("select count() from revlog"), mw.col.undo_status().redo, mw.form.actionRedo.isEnabled()]');
  ok(u[0] === c0[0] && u[2] === c0[2], 'Undo: ví đọc ra đã trả lại xu (' + c1[0] + ' → ' + u[0] + '), revlog về như cũ');
  ok(!!u[3] && u[4] === true, 'Edit → Redo vẫn bấm được: "' + u[3] + '" (1.25.2: mất Redo)');
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(800);
  const u2 = await py(KB + 'result = [st.load()["coins"], mw.col.undo_status().redo]');
  ok(u2[0] === c0[0] && !!u2[1], 'vườn làm mới sau Undo: xu vẫn đúng, Redo vẫn còn');
  await py(KB + 'from aqt.operations.collection import redo; redo(parent=mw); result = 1'); await sleep(1500);
  const r = await py(KB + 'kb.check_undo()\nresult = [st.load()["coins"], ' + raw + ', mw.col.db.scalar("select count() from revlog")]');
  ok(r[0] === c1[0] && r[2] === c1[2], 'Redo: lượt ôn về lại, xu như lúc vừa ôn (' + r[0] + '), không cộng hai lần');
  await py(KB + 'from aqt.operations.collection import undo; undo(parent=mw); result = 1'); await sleep(1500);
  const c2 = await py(KB + 'result = st.load()["coins"]');
  await answer();
  const c3 = await py(KB + 'result = [st.load()["coins"], ' + raw + ', mw.col.undo_status().redo]');
  ok(c2 === c0[0] && c3[0] === c3[1] && c3[0] > c2, 'Undo rồi ôn thẻ khác: phần trả lại được ghi cùng lần ghi ví (collection ' + c3[1] + ' = ví ' + c3[0] + ')');
  await py(KB + 'kb.mobile_catch_up(); kb._dialog.refresh(); result = 1'); await sleep(600);
  ok(await py(KB + 'result = st.load()["coins"]') === c3[0], 'lần bù xu điện thoại sau đó không trả lại xu cho lượt đã Undo');
  // Undo rồi đồng bộ AnkiWeb ngay: phần trả lại phải ghi vào collection trước khi đồng bộ (không thì máy khác nhận ví cũ)
  await py(KB + 'from aqt.operations.collection import undo; undo(parent=mw); result = 1'); await sleep(1500);
  const sy = await py(KB + 'a = [st.load()["coins"], ' + raw + ']\nkb._on_sync_start()\nresult = a + [' + raw + ']');
  ok(sy[0] < sy[1] && sy[2] === sy[0], 'Undo rồi đồng bộ: trước đồng bộ ví ghi đúng ' + sy[0] + ' xu (collection ' + sy[1] + ' → ' + sy[2] + ')');

  console.log('== 4. Xưởng: vẽ → đổi cỡ → Esc');
  await js('GardenCraft.open(); return 1;'); await sleep(600);
  const drawn = await js(`const cv = document.getElementById("kb-cf-grid"), r = cv.getBoundingClientRect(), cell = GardenCraft._state().cell;
    const ev = (type, x, y) => cv.dispatchEvent(new PointerEvent(type, { clientX: r.left + (x + 0.5) * cell, clientY: r.top + (y + 0.5) * cell, bubbles: true, button: 0, pointerId: 1 }));
    document.querySelector('#kb-cf-pal [data-c="r"]').click(); document.querySelector('#kb-craft [data-tool="pen"]').click();
    for (let x = 4; x < 12; x++) { ev("pointerdown", x, 8); ev("pointerup", x, 8); }
    const s = document.getElementById("kb-cf-size"); s.value = "24"; s.dispatchEvent(new Event("change"));
    const st = GardenCraft._state(); return { size: st.size, ink: st.px.split("").filter(c => c !== ".").length, undo: st.undo };`);
  ok(drawn.size === 24 && drawn.ink === 8 && drawn.undo === 0, 'vẽ 8 ô rồi đổi cỡ 24×24: hình còn, lịch sử hoàn tác trống (' + JSON.stringify(drawn) + ')');
  await js('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return 1;'); await sleep(300);
  const esc1 = await js('return { open: GardenCraft.isOpen(), tip: document.getElementById("kb-cf-tip").textContent };');
  ok(esc1.open && /Esc lần nữa/.test(esc1.tip), 'Esc lần đầu: Xưởng còn mở, nhắc "' + esc1.tip + '" (1.25.2: đóng luôn, mất hình)');
  await js('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return 1;'); await sleep(300);
  ok(await js('return !GardenCraft.isOpen();'), 'Esc lần hai: đóng');
  await js('GardenCraft.open(); return 1;'); await sleep(300);
  await js('const s = document.getElementById("kb-cf-size"); s.value = "32"; s.dispatchEvent(new Event("change")); document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return 1;'); await sleep(300);
  ok(await js('return !GardenCraft.isOpen();'), 'chưa vẽ gì, chỉ đổi cỡ: Esc một lần là đóng (không hỏi thừa)');

  console.log('== 5. đổi deck nguồn → gợi ý luyện viết tính lại');
  const hint = await py(KB + `import datetime
cfg = kb.config(); ds = datetime.date.today().isoformat()
a = kb._words_for(ds, "en", cfg)
ids = [d.id for d in mw.col.decks.all_names_and_ids()]
kb.words.save_src(mw.col, "en", ids[:1])
b = kb._words_for(ds, "en", cfg)
kb.words.save_src(mw.col, "en", [])
c = kb._words_for(ds, "en", cfg)
result = [a is b, a is c, len(kb._words_cache)]`);
  ok(hint[0] === false && hint[1] === true, 'đổi deck nguồn tiếng Anh → tính lại (1.25.2: vẫn từ cũ); chọn lại như cũ → dùng lại bản đã tính');

  console.log('== 6. deck chọn ở ô Deck của vườn còn sau khi đóng / mở lại vườn; cài đặt có chữ lạ không làm hỏng trang');
  await py(KB + 'p = dict((mw.addonManager.getConfig("kotoba_batake") or {}).get("prefs") or {}); p["kb-test-x"] = "</script><b>x</b>\u2028"; kb.save_config(prefs=p); result = 1');
  const dk = await py(KB + `did = mw.col.decks.id_for_name("B::Có câu ví dụ, không audio")
kb._dialog._dispatch("deck:%d" % did)
cur = mw.col.decks.current()["id"]
kb._dialog.close()
result = [did, cur]`); await sleep(1200);
  await openGarden();
  const dk2 = await py(KB + 'result = kb._dialog.deck_id');
  ok(dk[1] === dk[0] && dk2 === dk[0], 'chọn deck B rồi đóng vườn: mở lại vẫn là deck B (1.25.2: về deck cũ nếu chưa bấm Tưới ngay)');
  ok(await js('const s = document.querySelector("#kb-deck, select[id*=deck]"); return !s || String(s.value) === "' + dk[0] + '";'), 'ô Deck trên thanh trên hiện đúng deck B');
  ok(await js('return GardenPrefs.get("kb-test-x") === "</script><b>x</b>\u2028" && typeof Garden !== "undefined" && !document.querySelector("body > b");'),
    'cài đặt có "</script>" trong giá trị: trang vẫn chạy, giá trị đọc lại nguyên vẹn (chèn vào <head> an toàn)');

  const boxes = await py('from aqt.qt import QApplication, QMessageBox\nresult = [w.text()[:160] for w in QApplication.topLevelWidgets() if isinstance(w, QMessageBox) and w.isVisible()]');
  if (boxes.length) { console.log('  (hộp thoại đang mở: ' + boxes.join(' | ') + ')'); }
  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  if (errs.length) { console.log('  (nhật ký lỗi: ' + errs.join(' | ') + ')'); }
  const bad = errs.filter(e => !/Tunnel|403|giọng|TTS|models/i.test(e));
  ok(!bad.length, 'nhật ký lỗi không có lỗi mới' + (bad.length ? ': ' + bad.join(' | ') : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total + ' đạt');
  try { page.close(); } catch (e) { }
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI KỊCH BẢN', e && e.stack || e); process.exit(3); });
