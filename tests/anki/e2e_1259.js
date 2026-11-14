// 1.25.9 — trong Anki thật:
//   1. vé giữ chuỗi: quên ôn hôm qua + có vé mua trước → tự dùng vé, thông báo, chuỗi giữ; Lịch hoa: dòng vé, ô ngày có bông
//      tuyết, mua vé (trừ xu, thanh trên cập nhật, tối đa 2)
//   2. Sửa hình / Góp ý hình mở được khung động (hươu cúi chào, kappa chớp mắt, mũ kabuto loé, tủ lạnh mở, giường) và hình
//      dựng từ hình khác (đài phun nước đóng băng, lúa vàng mùa thu); lưu bản sửa khung "Cúi chào" → cảnh dùng bản sửa
//   3. lỗi của nhánh audit 11/11: F01 đồ tự làm ở Bếp cất rồi không hiện lại · F02 luyện viết tiếng Anh 30 từ dài không mất
//      chữ · F03 đổi cài đặt rồi đóng vườn ngay · F04 Esc lúc bộ gõ đang chọn chữ · F05 trần xu trò chơi 0 · F06 trời cố định
//      → thời tiết trong báo · F07 hàng chờ thông báo · F08 ngôn ngữ theo hồ sơ
// Chạy: KB_SCRIPTS=e2e_1259.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1259';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenCal !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
async function waitFor(expr, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(150); }
  return false;
}
const KB = 'import sys, os, json, time, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const hideToast = () => js('const t = document.getElementById("kb-toast"); if (t) { t.hidden = true; } return 1;');
const closeAll = () => js('GardenCal.close(); GardenHome.close(); GardenGames.close(); GardenPaper.close(); if (GardenCraft.isOpen()) { GardenCraft.close(); } return 1;');
async function reopen() {
  try { page.close(); } catch (e) { }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(800);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
}

(async () => {
  await py(KB + `kb.save_config(show_tooltips=False, sound=False, music=False)
if os.path.exists(kb.ADMIN_FILE): os.remove(kb.ADMIN_FILE)
for p in (kb.MAU_LOCAL,):
    if os.path.exists(p): os.remove(p)
kb.open_garden(); result = 1`);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(600);

  console.log('== 1. Vé giữ chuỗi');
  // lịch sử ôn giả: ôn 4, 3, 2 ngày trước; hôm qua quên; hôm nay chưa ôn. Có 1 vé mua từ 5 ngày trước.
  const setup = await py(KB + `col = mw.col
col.db.execute("delete from revlog")
cut = int(col.sched.day_cutoff)
cid = col.db.scalar("select id from cards limit 1")
for k in (2, 3, 4):
    rid = (cut - (k + 1) * 86400 + 3600) * 1000
    col.db.execute("insert into revlog(id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", rid, cid, -1, 3, 10, 5, 2500, 1000, 1)
today = kb.cal_today()
d = st.load(); d["coins"] = 1000
d["more"]["freeze"] = {"n": 1, "days": [], "since": (today - datetime.timedelta(days=5)).isoformat()}
st.save(d)
result = {"today": today.isoformat(), "yday": (today - datetime.timedelta(days=1)).isoformat(), "before": kb.core.daily_stats(col)["streak"]}`);
  ok(setup.before === 0, 'chưa dùng vé: chuỗi đứt (0 ngày) vì hôm qua chưa ôn');
  await py(KB + 'kb._dialog.refresh(); result = 1');
  const shown = await waitFor('document.getElementById("kb-toast") && !document.getElementById("kb-toast").hidden && /vé giữ chuỗi/.test(document.getElementById("kb-toast").textContent)', 20000);   // khách ghé có thể hiện trước: chờ tới lượt
  const tmsg = await js('return document.getElementById("kb-toast").textContent;');
  ok(shown && /Hôm qua chưa ôn — đã dùng 1 vé giữ chuỗi, chuỗi 3 ngày vẫn còn/.test(tmsg), 'mở vườn → thông báo: "' + tmsg + '"');
  await page.shot(SHOTS + '/1259_01_dung_ve.png');
  const td = await js('const t = Garden._data ? Garden._data().today : null; return { streak: document.querySelector(".kb-today-streak").textContent, title: document.querySelector(".kb-today-main").title };');
  ok(/3 ngày liền/.test(td.streak) && /Vé giữ chuỗi: 0\/2/.test(td.title), 'thẻ Hôm nay: "' + td.streak.trim() + '", chú thích có số vé');
  const fd = await py(KB + 'result = st.frozen_days()');
  ok(JSON.stringify(fd) === JSON.stringify([setup.yday]), 'ghi ngày dùng vé: ' + fd);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(900);
  ok((await py(KB + 'result = st.load()["more"]["freeze"]["n"]')) === 0 && JSON.stringify(await py(KB + 'result = st.frozen_days()')) === JSON.stringify(fd),
    'làm mới lần nữa: không dùng thêm vé');
  await hideToast();

  await js('GardenCal.open({}); return 1;');
  await waitFor('document.querySelector(".kb-cal-freeze")', 6000);
  const cal = await js(`const r = document.querySelector(".kb-cal-freeze"), b = r && r.querySelector("button"), c = document.querySelector('.kb-cal-day[data-d="${setup.yday}"]');
    return { text: r && r.textContent, btn: b && b.textContent, dis: b && b.disabled, fz: !!(c && c.querySelector(".kb-cal-fz")), title: c && c.title,
      hud: document.getElementById("kb-c-hud") ? document.getElementById("kb-c-hud").textContent : "", legend: document.querySelector(".kb-cal-legend").textContent };`);
  ok(cal.text && /Vé giữ chuỗi 0\/2/.test(cal.text) && cal.btn === 'Mua · 150 xu' && !cal.dis, 'Lịch hoa: "' + (cal.text || '').slice(0, 40) + '…" + nút "' + cal.btn + '"');
  ok(cal.fz && /dùng vé giữ chuỗi/.test(cal.title) && /dùng vé/.test(cal.legend), 'ô hôm qua có bông tuyết, chú thích "' + cal.title + '"');
  ok(/Ôn liền\s*3 ngày/.test(cal.hud), 'thanh dưới (1.30.1: "Ôn liền" thay "Chuỗi"): ' + cal.hud.replace(/\s+/g, ' ').trim());
  await page.shot(SHOTS + '/1259_02_lich_hoa_ve.png');
  await js('document.querySelector(".kb-cal-freeze button").click(); return 1;');
  await waitFor('/Vé giữ chuỗi 1\\/2/.test(document.querySelector(".kb-cal-freeze").textContent)', 5000);
  const b1 = await js('return { text: document.querySelector(".kb-cal-freeze").textContent, coins: document.getElementById("kb-coins").textContent };');
  const w1 = await py(KB + 'd = st.load(); result = [d["coins"], d["more"]["freeze"]["n"], d["more"]["freeze"]["since"]]');
  ok(/1\/2/.test(b1.text) && b1.coins === '850 xu' && w1[0] === 850 && w1[1] === 1 && w1[2] === setup.today, 'mua 1 vé: −150 xu (thanh trên ' + b1.coins + '), ngày mua = hôm nay');
  await js('document.querySelector(".kb-cal-freeze button").click(); return 1;');
  await waitFor('/Vé giữ chuỗi 2\\/2/.test(document.querySelector(".kb-cal-freeze").textContent)', 5000);
  const b2 = await js('const b = document.querySelector(".kb-cal-freeze button"); return { text: document.querySelector(".kb-cal-freeze").textContent, btn: b.textContent, dis: b.disabled, coins: document.getElementById("kb-coins").textContent };');
  ok(/2\/2/.test(b2.text) && b2.btn === 'Đã đủ vé' && b2.dis && b2.coins === '700 xu', 'mua vé thứ hai: "' + b2.btn + '" (khoá), ' + b2.coins);
  await js('document.querySelector(".kb-cal-freeze").scrollIntoView({ block: "end" }); return 1;'); await sleep(200);
  await page.shot(SHOTS + '/1259_03_mua_ve.png');
  await js('document.querySelector(".kb-c-tab[data-ctab=\\"year\\"]").click(); return 1;'); await sleep(900);
  const yh = await js('return document.getElementById("kb-c-hud") ? document.getElementById("kb-c-hud").textContent : "";');
  ok(/Liền lâu nhất\s*3 ngày/.test(yh), 'Lịch năm: ' + yh.replace(/\s+/g, ' ').trim());
  await closeAll();
  // ít xu: nút mua khoá, ghi thiếu bao nhiêu
  await py(KB + 'd = st.load(); d["coins"] = 100; d["more"]["freeze"]["n"] = 0; st.save(d); kb._dialog.refresh(); result = 1'); await sleep(900);
  await js('GardenCal.open({}); return 1;'); await waitFor('document.querySelector(".kb-cal-freeze")', 6000);
  const poor = await js('const b = document.querySelector(".kb-cal-freeze button"); return { dis: b.disabled, title: b.title };');
  ok(poor.dis && /Thiếu 50 xu/.test(poor.title), 'ít xu: nút khoá, "' + poor.title + '"');
  await closeAll();

  console.log('== 2. Sửa hình: khung động + hình dựng từ hình khác');
  await py(KB + 'open(kb.ADMIN_FILE, "w").close(); d = st.load(); d["coins"] = 100000; d["home"]["house"] = 7; st.save(d); kb._dialog.refresh(); result = 1'); await sleep(1200);
  const want = { shika: 'Cúi chào', kappa: 'Chớp mắt', kabuto: 'Loé sáng', reizouko: 'Mở cửa', beddo: 'Chăn phồng', fountain: 'Đóng băng', rice: 'Mùa thu' };
  for (const [id, lab] of Object.entries(want)) {
    const r = await js(`GardenCraft.openBase({ group: "do", id: "${id}", name: "${id}" });
      const labs = [...document.querySelectorAll("#kb-cf-frames button")].map(b => b.textContent);
      const bar = !document.getElementById("kb-cf-frames").parentNode.hidden; return { labs: labs, bar: bar, editable: GardenFix.editable("do", "${id}") };`);
    ok(r.editable && r.bar && r.labs.indexOf(lab) >= 0, id + ': khung ' + JSON.stringify(r.labs));
    await js('GardenCraft.close(); return 1;'); await sleep(150);
  }
  // sửa khung "Cúi chào" của hươu → lưu → cảnh dùng bản sửa (kể cả sau khi mở lại vườn)
  // như người dùng: Nhà → thẻ Hươu Nara → Sửa hình (hươu là quà rương: cho có 1 con để thẻ hiện)
  await py(KB + 'd = st.load(); d["home"]["owned"]["shika"] = 1; st.save(d); kb._dialog.refresh(); result = 1'); await sleep(900);
  await js('GardenHome.open(); return 1;'); await sleep(400);
  const viaCard = await js(`for (const t of ["yard", "room", "inv"]) { GardenHome.setTab(t);
      const c = [...document.querySelectorAll("#kb-h-list .kb-h-card")].find(x => /Hươu/.test(x.textContent) && x.querySelector(".kb-h-fix"));
      if (c) { c.querySelector(".kb-h-fix").click(); return t; } } return "";`);
  await sleep(400);
  if (!viaCard) { await js('GardenCraft.openBase({ group: "do", id: "shika", name: "Hươu Nara" }); return 1;'); }
  await js('const b = [...document.querySelectorAll("#kb-cf-frames button")].find(x => x.textContent === "Cúi chào"); b.click(); return 1;');
  await sleep(300);
  const st1 = await js('return GardenCraft._state().layer;');
  ok(viaCard && (await js('return document.getElementById("kb-craft").offsetParent !== null;')), 'Nhà → thẻ Hươu → nút Sửa hình mở Xưởng (tab ' + viaCard + ')');
  await page.shot(SHOTS + '/1259_04_sua_hinh_cui_chao.png');
  const painted = await js(`const cv = document.getElementById("kb-cf-grid"), r = cv.getBoundingClientRect(), cell = GardenCraft._state().cell;
    const sw = document.querySelector('#kb-cf-pal [data-c="r"]'); if (!sw) { return false; } sw.click(); document.querySelector('#kb-craft [data-tool="pen"]').click();
    const ev = (t) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + 0.5 * cell, clientY: r.top + 0.5 * cell, bubbles: true, button: 0, pointerId: 1 }));
    ev("pointerdown"); ev("pointerup"); return true;`);
  await js('document.getElementById("kb-cf-save").click(); return 1;'); await sleep(1200);
  const saved = await py(KB + 'result = kb.mau.read(kb.MAU_LOCAL)["sua"].get("do:shika")');
  const alt = await js('return GardenHome._lib().ALT.shika.cui[0];');
  ok(st1 === 'cui' && painted && saved && saved.cui && saved.cui[0][0] === 'r' && !saved.spr && alt[0] === 'r',
    'lưu khung "Cúi chào": chỉ ghi khung đó (' + Object.keys(saved || {}) + '), cảnh dùng ngay: ' + alt.slice(0, 6) + '…');
  await reopen();
  ok(await js('return GardenHome._lib().ALT.shika.cui[0][0] === "r" && !!window.__kbFix["do:shika"];'), 'mở lại vườn: bản sửa khung động vẫn áp');
  // Góp ý hình (không phải admin): cũng thấy khung động
  await py(KB + 'os.remove(kb.ADMIN_FILE); kb._dialog.refresh(); result = 1'); await sleep(900);
  const sug = await js('GardenCraft.openBase({ group: "do", id: "fountain", name: "Đài phun nước", suggest: true }); const r = { labs: [...document.querySelectorAll("#kb-cf-frames button")].map(b => b.textContent), title: document.querySelector("#kb-craft .kb-g-title").textContent }; GardenCraft.close(); return r;');
  ok(sug.labs.indexOf('Đóng băng') >= 0 && /Góp ý hình/.test(sug.title), 'Góp ý hình (người dùng thường): ' + JSON.stringify(sug.labs));
  await py(KB + 'os.path.exists(kb.MAU_LOCAL) and os.remove(kb.MAU_LOCAL); result = 1');

  console.log('== 3. Lỗi của nhánh audit 11/11');
  // F01: đồ tự làm ở Bếp
  const f01 = await py(KB + `d = st.load(); d["home"]["house"] = 7; d["home"]["rooms"] = ["kitchen", "bedroom"]; st.save(d)
r = st.craft_save({"name": "Mẫu Bếp", "kind": "floor", "size": 16, "fx": "none", "px": kb.core.px_encode("r" * 256)})
cid = r["craft_id"]
done = False
for y in range(4):
    for x in range(9):
        try:
            kb.core.check_spot(st.load()["home"], "kitchen", cid, x, y, cat=kb.core.full_catalog(st.load()))
        except kb.core.HomeError:
            continue
        st.place("kitchen", cid, x, y); done = True; break
    if done: break
for _ in range(3): st.save(st.load())
i = next(i for i, e in enumerate(st.load()["home"]["kitchen"]) if e["id"] == cid)
st.take("kitchen", i)
st.save(st.load())
kb._dialog.refresh()
result = {"cid": cid, "left": [e["id"] for e in st.load()["home"]["kitchen"]], "raw": len(mw.col.get_config(kb.core.NHA_KEY)["places"].get("kitchen", []))}`);
  await sleep(900);
  await js('GardenHome.open(); GardenHome.setScene("kitchen"); return 1;'); await sleep(400);
  ok(f01.left.indexOf(f01.cid) < 0 && f01.raw === 0, 'F01: cất món tự làm ở Bếp → không còn ở gian (collection: ' + f01.raw + ' chỗ đặt)');
  await page.shot(SHOTS + '/1259_05_bep_sau_cat.png');
  await closeAll();
  // F02: 30 từ tiếng Anh dài qua giao diện
  await py(KB + 'kb.save_config(journal_lang="en", gemini_langs=["en"]); kb._dialog.refresh(); result = 1'); await sleep(900);
  await js('GardenCal.open({}); return 1;'); await waitFor('document.querySelector(".kb-cal-ta")', 6000);
  const long = Array(30).fill('internationalization').join(' ');
  const isEn = await js('return document.querySelector(".kb-cal-ta").classList.contains("is-en");');
  await js(`const t = document.querySelector(".kb-cal-ta"); t.focus(); t.value = ${JSON.stringify(long)}; t.dispatchEvent(new Event("input", { bubbles: true })); t.blur(); return 1;`);
  await sleep(600); await js('GardenCal.close(); return 1;'); await sleep(400);
  await js('GardenCal.open({}); return 1;'); await waitFor('document.querySelector(".kb-cal-ta")', 6000); await sleep(300);
  const back = await js('return document.querySelector(".kb-cal-ta").value;');
  ok(isEn && back === long, 'F02: bài tiếng Anh 30 từ (' + long.length + ' ký tự) đóng / mở lại còn nguyên (' + back.length + ')');
  // F04: Esc lúc bộ gõ đang chọn chữ (CDP: bộ gõ giả của Chromium) → bảng không đóng, cửa sổ vườn không đóng
  await js('const t = document.querySelector(".kb-cal-note"); t.focus(); return 1;');
  await page.send('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
  await sleep(150);
  await page.key('Escape', 'Escape', 27); await sleep(500);
  const ime1 = await js('return { open: GardenCal.isOpen() };');
  const vis1 = await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())');
  await page.send('Input.insertText', { text: 'に' }); await sleep(200);
  // sự kiện DOM như kịch bản audit (isComposing = true)
  const ime2 = await js(`const t = document.querySelector(".kb-cal-note"); t.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "に" }));
    t.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", isComposing: true, bubbles: true, cancelable: true }));
    t.dispatchEvent(new CompositionEvent("compositionend", { bubbles: true, data: "に" })); return { open: GardenCal.isOpen() };`);
  await sleep(300);
  const vis2 = await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())');
  ok(ime1.open && vis1 && ime2.open && vis2, 'F04: Esc lúc đang chọn chữ (bộ gõ của Chromium + sự kiện isComposing) → Lịch hoa và cửa sổ vườn vẫn mở');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  ok(!(await js('return GardenCal.isOpen();')), 'F04: Esc thường (đã chốt chữ) vẫn đóng Lịch hoa');
  await py(KB + 'kb.save_config(journal_lang="ja", gemini_langs=["ja"]); result = 1');
  // F05: trần xu trò chơi 0
  for (const cap of [0, 40]) {
    await py(KB + `kb.save_config(game_daily_coins=${cap}); kb._dialog.refresh(); result = 1`); await sleep(900);
    await js('GardenGames.open(); return 1;'); await sleep(400);
    const note = await js('const n = document.querySelector(".kb-gmenu-note"); return n ? n.textContent : "";');
    // 1.30.3: chú thích menu đổi thành "… · xu trò chơi hôm nay 0/40 · không đổi lịch ôn"
    ok(new RegExp('hôm nay \\d+/' + cap + '(\\D|$)').test(note), 'F05: trần ' + cap + ' → menu "' + (note.match(/xu trò chơi hôm nay [0-9/]+/) || [''])[0] + '"');
    await closeAll();
  }
  // F06: trời cố định → thời tiết trong báo hôm nay
  for (const w of ['snow', 'rain', 'auto']) {
    await js(`GardenSky.set("weather", "${w}"); GardenPrefs.flush(); return 1;`); await sleep(300);
    const r = await py(KB + 'from kotoba_batake import story_core\nt = kb.ai_today()\nresult = [kb._village_weather(t), story_core.village_weather(datetime.date.fromisoformat(t), None)]');
    const want6 = { snow: 'cả ngày tuyết', rain: 'cả ngày mưa' }[w];
    ok(w === 'auto' ? !/cả ngày (tuyết|mưa)$/.test(r[0]) || r[0] === r[1] : r[0] === want6, 'F06: trời ' + w + ' → báo "' + r[0] + '"');
  }
  // F07: hàng chờ thông báo
  await js('Garden.toast("A-link", () => {}, 5000); Garden.toast("B-chờ", () => {}, 5000); return 1;');
  await js('document.getElementById("kb-toast").click(); return 1;'); await sleep(80);
  await js('Garden.toast("C-chen", null, 1500); return 1;'); await sleep(350);
  const t1 = await js('return document.getElementById("kb-toast").textContent;');
  const sawC = await waitFor('!document.getElementById("kb-toast").hidden && document.getElementById("kb-toast").textContent === "C-chen"', 7000);
  ok(t1 === 'B-chờ' && sawC, 'F07: câu chen vào lúc chuyển không làm mất câu đang chờ (B rồi C)');
  await hideToast();
  // F03: đổi cài đặt rồi đóng vườn ngay
  await py(KB + 'kb.save_config(prefs={}); result = 1');
  await js('GardenPrefs.set("kb-test-close", "v1259"); return 1;');
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(400);
  ok((await py(KB + 'result = (kb.config().get("prefs") or {}).get("kb-test-close")')) === 'v1259', 'F03: đổi cài đặt rồi đóng vườn ngay (0 ms) → vẫn lưu');
  await reopen();
  // F08: ngôn ngữ theo hồ sơ
  const pres = await py(KB + `orig = kb.words.model_infos
try:
    kb._presence.update(t=0.0, v={}, col="")
    kb.words.model_infos = lambda *a, **k: {"a": {"lang": "ja"}}
    a = dict(kb._lang_presence())
    kb._on_profile_close()
    kb.words.model_infos = lambda *a, **k: {"b": {"lang": "ko"}}
    b = dict(kb._lang_presence())
    kb._presence.update(t=time.time(), v={"ja": True, "en": False}, col="/khac/collection.anki2")
    c = dict(kb._lang_presence())
    result = [a, b, c]
finally:
    kb.words.model_infos = orig
    kb._presence.update(t=0.0, v={}, col="")`);
  ok(pres[0].ja && !pres[1].ja && !pres[1].en && !pres[2].ja, 'F08: đóng hồ sơ / collection khác → đọc lại ngôn ngữ (' + JSON.stringify(pres) + ')');
  await reopen();

  const errs = (page.errors || []).filter(e => !/favicon/.test(e));
  ok(errs.length === 0, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error(e); process.exit(2); });
