// 1.22.6 trong Anki thật — soát lại "mọi kịch bản có thể xảy ra" (người dùng: "kiểm tra thật kỹ lại tất cả tính năng,
// giao diện, logic… vì bản thân chưa có đủ xu để test hết tất cả giao diện"):
// - ôn trong vườn: bấm chấm điểm rồi bấm Dừng / Esc / đổi deck ngay (cùng lúc lượt chấm đang lưu ở luồng nền)
//   → bảng ôn không tự bật lại, không hiện thẻ của deck cũ, lượt đó chỉ được trả xu MỘT lần (không bị "bù xu điện thoại");
// - lượt ôn ở màn ôn của Anki đang lưu thì lần bù xu điện thoại chờ (answer_started / answer_finished);
// - Anki ở chế độ tối: thẻ trong bảng ôn của vườn nền tối như màn ôn Anki (mẫu thẻ ".nightMode{color:#fafafa}" đọc được);
// - config sửa tay sai kiểu (daily_goal "", max_plants "nhiều", music_volume "to", stage_days "3,21,90", effects "false")
//   → vườn vẫn mở, giá trị về đúng kiểu;
// - đổi hồ sơ khi vườn đang mở → vườn đóng theo; mở lại hồ sơ → mở vườn bình thường;
// - thẻ Hôm nay ở 1366 × 768 có 4 dòng việc → không dòng nào bị cắt, mỗi dòng vẫn ≥ 18 px; 1024 × 700 không vượt đáy sân;
// - tab Giống cây: ô chọn giống của dòng Deck / Note / tag thẳng cột;
// - không lỗi JS, nhật ký lỗi add-on trống.
// Chạy: KB_SCRIPTS=e2e_1226.js run_ui.sh ADDON SHOTS
const { pages, Page, sleep } = require('./cdp');
const { MEASURE } = require('./measure');
const SHOTS = process.argv[2] || '/tmp/kb_shots';
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
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const DECK_A = 'A::Có câu ví dụ + audio', DECK_C = 'C::Chỉ từ + audio từ';
const panelOpen = () => js('return !document.getElementById("kb-panel").hidden;');
const wallet = () => py(KB + 'd = st.load(); m = d.get("mobile") or {}; result = [d["coins"], (m.get("total") or {}).get("reviews", 0), d["waters"]]');
const revlog = () => py('result = mw.col.db.scalar("select count() from revlog")');
async function openGarden(deck) {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + `kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(deck || DECK_A)}); d.refresh(); result = 1`);
  await sleep(2000);
  await js('if (window.GardenPaper) GardenPaper.close(); if (window.GardenCal) GardenCal.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); return 1;');
}
async function flipCard() {
  await js('document.getElementById("kb-review").click(); return 1;');
  if (!await waitFor('return !document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden;')) { return false; }
  await sleep(500);
  await js('document.getElementById("kb-show").click(); return 1;');
  return waitFor('return !document.getElementById("kb-ratings").hidden;');
}

(async () => {
  // bù xu điện thoại đã đặt mốc (lần mở hồ sơ đầu) → mọi lượt ôn sau đây mà "bù" là trả hai lần
  await py(KB + 'kb.mobile_catch_up(); result = 1');
  // lượt chấm lưu chậm 1,5 giây (máy yếu / collection lớn): revlog đã ghi ở luồng nền nhưng add-on chưa kịp ghi "đã trả xu"
  // → dựng đúng lúc dễ trùng (người dùng bấm Dừng / đổi deck trong khoảng đó). Bản cũ trượt chắc chắn, không tuỳ máy.
  await py(KB + `import aqt.operations.scheduling as S
kb._kb_orig_answer = getattr(kb, "_kb_orig_answer", None) or kb.answer_card
def _slow(parent, answer, _o=kb._kb_orig_answer):
    op = _o(parent=parent, answer=answer)
    _s = op.success
    op.success = lambda cb: _s(lambda ch: mw.progress.single_shot(1500, lambda: cb(ch), False))
    return op
kb.answer_card = _slow
result = 1`);
  await openGarden();
  page.errors.splice(0);
  // ghi lại mọi lần Python báo "bù xu điện thoại" cho trang (thông báo có thể đã tắt khi kiểm tra)
  await js('window.__kbPaid = []; const o = Garden.mobilePaid; Garden.mobilePaid = function (x) { window.__kbPaid.push(x); return o.apply(this, arguments); }; return 1;');

  console.log('== Ôn trong vườn: chấm rồi bấm Dừng ngay (lượt chấm còn đang lưu)');
  ok(await flipCard(), 'lật thẻ, hiện 4 nút chấm');
  let w0 = await wallet(), r0 = await revlog();
  await js('document.querySelector(".kb-rate[data-ease=\'3\']").click(); document.getElementById("kb-stop").click(); return 1;');
  await sleep(3000);
  let w1 = await wallet(), r1 = await revlog();
  ok(!(await panelOpen()), 'bảng ôn vẫn đóng sau khi lượt chấm lưu xong (trước 1.22.6: tự bật lại với thẻ kế tiếp)');
  ok(await py(KB + 'result = kb._dialog._card is None'), 'Python không giữ thẻ chờ chấm');
  ok(r1 === r0 + 1, `revlog +1 (${r0} → ${r1})`);
  ok(w1[1] === w0[1] && w1[0] - w0[0] <= 3, `trả xu một lần (ôn +1, lên Mầm +2), không có lượt "bù điện thoại" (xu ${w0[0]} → ${w1[0]}, bù ${w0[1]} → ${w1[1]})`);
  await page.shot(SHOTS + '/1226_a_cham_roi_dung.png');

  console.log('== Ôn trong vườn: chấm rồi bấm Esc ngay');
  ok(await flipCard(), 'lật thẻ');
  w0 = await wallet();
  await js('document.querySelector(".kb-rate[data-ease=\'3\']").click(); return 1;');
  await page.key('Escape', 'Escape', 27);
  await sleep(3000);
  w1 = await wallet();
  ok(!(await panelOpen()), 'Esc: bảng ôn vẫn đóng');
  ok(await py(KB + 'result = kb._dialog is not None and kb._dialog.isVisible()'), 'Esc chỉ đóng bảng ôn, cửa sổ vườn vẫn mở');
  ok(w1[1] === w0[1] && w1[0] - w0[0] <= 3, `trả xu một lần, không bù điện thoại (xu ${w0[0]} → ${w1[0]}, bù ${w0[1]} → ${w1[1]})`);

  console.log('== Ôn trong vườn: chấm rồi đổi deck ngay');
  ok(await flipCard(), 'lật thẻ (deck A)');
  w0 = await wallet(); r0 = await revlog();
  const didC = await py(`result = mw.col.decks.id_for_name(${JSON.stringify(DECK_C)})`);
  await js(`document.querySelector(".kb-rate[data-ease='3']").click(); const s = document.getElementById("kb-deck"); s.value = "${didC}"; s.dispatchEvent(new Event("change")); return 1;`);
  await sleep(3500);
  w1 = await wallet(); r1 = await revlog();
  ok(!(await panelOpen()), 'đổi deck: bảng ôn không tự bật lại (trước 1.22.6: hiện thẻ của deck A dưới tên deck C)');
  ok(await py(KB + `result = kb._dialog.deck_id == ${didC} and kb._dialog._card is None`), 'vườn ở deck C, không có thẻ của deck cũ chờ chấm');
  ok(r1 === r0 + 1 && w1[1] === w0[1] && w1[0] - w0[0] <= 3,
    `lượt chấm ở deck A được lưu, trả xu một lần, không bị "bù điện thoại" cho chính lượt này (xu ${w0[0]} → ${w1[0]}, bù ${w0[1]} → ${w1[1]})`);
  const paid = await js('return (window.__kbPaid || []).map((x) => x.message || "");');
  ok(paid.length === 0, 'cả 3 lần: không có thông báo "Bù … lượt ôn trên điện thoại"' + (paid.length ? ' («' + paid.join(' | ').slice(0, 90) + '»)' : ''));
  await page.shot(SHOTS + '/1226_b_cham_roi_doi_deck.png');

  await py(KB + 'kb.answer_card = kb._kb_orig_answer; result = 1');
  console.log('== Lượt ôn ở màn ôn Anki đang lưu → lần bù xu điện thoại chờ');
  const g = !(await py(KB + 'result = hasattr(kb, "answer_started")')) ? [false, 0, 0] : await py(KB + `col = mw.col
cid = col.db.scalar("select id from cards where did = ? and queue = 0 limit 1", ${didC})
kb.answer_started(cid)
# giả lượt ôn đã ghi revlog ở luồng nền (lượt điện thoại thật cũng chỉ là một dòng revlog)
c = col.get_card(cid)
st0 = st.load()["coins"]
col.db.execute("insert into revlog (id, cid, usn, ease, ivl, lastIvl, factor, time, type) values (?, ?, -1, 3, 1, 0, 2500, 3000, 0)", int(time.time() * 1000), cid)
r_wait = kb.mobile_catch_up()
kb.answer_finished(cid)
r_after = kb.mobile_catch_up()
result = [r_wait is None, (r_after or {}).get("reviews"), (r_after or {}).get("coins")]`);
  ok(g[0], 'lượt đang lưu: mobile_catch_up() không bù');
  ok(g[1] === 1 && g[2] === 1, `lượt lưu xong mà add-on không ghi (vd. điện thoại) thì lần sau vẫn bù đúng 1 lượt (+${g[2]} xu)`);
  ok(g[0] && await py(KB + 'kb._answering.clear(); kb.answer_started(1); kb._answering[1] = time.time() - 120; result = kb.answers_pending() is False and not kb._answering'),
    'lượt lưu hỏng (> 30 giây) không chặn bù xu mãi');

  console.log('== Anki ở chế độ tối: thẻ trong bảng ôn của vườn');
  await py(KB + `did = mw.col.decks.id_for_name(${JSON.stringify(DECK_A)})
nid = mw.col.db.list("select nid from cards where did = ?", did)[0]
m = mw.col.get_note(nid).note_type()
if ".nightMode { color: #fafafa; }" not in m["css"]:
    m["css"] = m["css"] + "\\n.nightMode { color: #fafafa; }\\n"
    mw.col.models.update_dict(m)
from aqt.theme import Theme
mw.set_theme(Theme.DARK)
d = kb._dialog; d.deck_id = did; d.refresh(); result = 1`);
  await sleep(1500);
  ok(await flipCard(), 'lật thẻ (Anki tối)');
  await sleep(600);
  const dark = await js(`const d = document.getElementById("kb-card").contentDocument; const b = d.body, cs = getComputedStyle(b);
    const q = d.getElementById("qa"); const t = q.querySelector("*") || q; return {cls: b.className, bg: cs.backgroundColor, fg: getComputedStyle(t).color};`);
  const lum = (c) => { const m = String(c).match(/\d+/g) || [0, 0, 0]; return (0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]) / 255; };
  ok(/nightMode/.test(dark.cls), 'thân thẻ có lớp nightMode của Anki');
  ok(lum(dark.bg) < 0.25 && lum(dark.fg) > 0.8, `nền tối, chữ sáng như màn ôn Anki (nền ${dark.bg}, chữ ${dark.fg}; trước 1.22.6: nền trắng, chữ #fafafa)`);
  await page.shot(SHOTS + '/1226_c_anki_che_do_toi.png');
  await js('document.getElementById("kb-stop").click(); return 1;');
  await py('from aqt.theme import Theme\nmw.set_theme(Theme.LIGHT)\nresult = 1');
  await sleep(500);
  ok(await flipCard(), 'Anki sáng lại: lật thẻ');
  const light = await js('const b = document.getElementById("kb-card").contentDocument.body; return {cls: b.className, bg: getComputedStyle(b).backgroundColor};');
  ok(!/nightMode/.test(light.cls) && lum(light.bg === 'rgba(0, 0, 0, 0)' ? 'rgb(255,255,255)' : light.bg) > 0.8, `Anki sáng: thẻ nền sáng như cũ (${light.bg})`);
  await js('document.getElementById("kb-stop").click(); return 1;');

  console.log('== Config sửa tay sai kiểu');
  const bad = { daily_goal: '', max_plants: 'nhiều', music_volume: 'to', stage_days: '3,21,90', effects: 'false', wilt_retrievability: '0,7', daily_bonus: -50 };
  const cr = await py(KB + `cfg = dict(mw.addonManager.getConfig("kotoba_batake")); cfg.update(json.loads(${JSON.stringify(JSON.stringify(bad))}))
mw.addonManager.writeConfig("kotoba_batake", cfg)
seen = []
old = kb.showWarning
kb.showWarning = lambda *a, **k: seen.append(str(a[0])[:80])
try:
    kb._dialog.refresh()
finally:
    kb.showWarning = old
c = kb.config()
result = [seen, c["daily_goal"], c["max_plants"], c["music_volume"], c["stage_days"], c["effects"], c["wilt_retrievability"], c["daily_bonus"]]`);
  ok(cr[0].length === 0, 'vườn dựng được, không có hộp "không dựng được khu vườn"' + (cr[0].length ? ' (' + cr[0][0] + ')' : ''));
  ok(cr[1] === 30 && cr[2] === 400 && cr[3] === 0.5, `số đọc không được → mặc định (daily_goal ${cr[1]}, max_plants ${cr[2]}, music_volume ${cr[3]})`);
  ok(JSON.stringify(cr[4]) === '[3,21,90]' && cr[5] === false && cr[6] === 0.7 && cr[7] === 0,
    `đọc được thì về đúng kiểu (stage_days ${JSON.stringify(cr[4])}, effects ${cr[5]}, wilt ${cr[6]}, daily_bonus ${cr[7]})`);
  await sleep(800);
  ok(await js('return Garden && document.getElementById("kb-today-text").textContent.indexOf("/30") > 0;'), 'thẻ Hôm nay hiện "…/30 lượt"');
  await py(KB + `cfg = dict(mw.addonManager.getConfig("kotoba_batake"))
for k in json.loads(${JSON.stringify(JSON.stringify(bad))}): cfg.pop(k, None)
mw.addonManager.writeConfig("kotoba_batake", cfg); kb._dialog.refresh(); result = 1`);
  await sleep(800);

  console.log('== Thẻ Hôm nay ở 1366 × 768 khi mới cài (nhiệm vụ, báo mới, nhật ký, cấu hình trường)');
  await py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(DECK_A)}); d.refresh(); result = 1`);
  await sleep(1500);
  const td = await js(`const l = document.querySelector("#kb-today .kb-today-list"); const rows = Array.from(l.children).filter((e) => !e.hidden && e.getBoundingClientRect().height > 2);
    const lr = l.getBoundingClientRect(); return {n: rows.length, sh: l.scrollHeight, ch: l.clientHeight, tight: l.classList.contains("kb-today-tight"),
    minh: Math.min.apply(null, rows.map((e) => e.getBoundingClientRect().height)),
    cut: rows.filter((e) => { const r = e.getBoundingClientRect(); return r.bottom > lr.bottom + 1; }).map((e) => e.textContent.trim().slice(0, 24))};`);
  ok(td.n >= 4, `thẻ có ${td.n} dòng việc`);
  ok(td.cut.length === 0 && td.sh <= td.ch + 1, `không dòng nào bị cắt / phải cuộn (cao ${td.sh}/${td.ch} px${td.tight ? ', xếp sát' : ''}${td.cut.length ? '; cắt: ' + td.cut.join(', ') : ''})`);
  ok(td.minh >= 18, `mỗi dòng việc vẫn cao ≥ 18 px (cỡ nút tối thiểu của measure.js): ${Math.round(td.minh * 10) / 10} px`);
  await page.shot(SHOTS + '/1226_d_the_hom_nay_1366.png');
  await py(KB + 'kb._dialog.resize(1024, 700); result = 1'); await sleep(1500);
  const td2 = await js(`const l = document.querySelector("#kb-today .kb-today-list"); const y = document.querySelector(".kb-yard-side").getBoundingClientRect(), b = document.getElementById("kb-yard-box") || document.querySelector(".kb-yard-wrap");
    const t = document.getElementById("kb-today").getBoundingClientRect(); return {sh: l.scrollHeight, ch: l.clientHeight, bottom: t.bottom, yard: (b ? b.getBoundingClientRect().bottom : 0)};`);
  ok(td2.bottom <= td2.yard + 1, `1024 × 700: thẻ không vượt đáy sân (${Math.round(td2.bottom)} ≤ ${Math.round(td2.yard)})`);
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1200);

  console.log('== Tab Giống cây: ô chọn giống thẳng cột');
  await py(KB + `d = st.load()
for s in ("sakura", "himawari"):
    if s not in d["more"]["seeds"]["owned"]:
        d["more"]["seeds"]["owned"].append(s)
st.save(d); kb._dialog.refresh(); result = 1`);
  await sleep(1200);
  await js('GardenHome.open("yard"); document.querySelector(\'#kb-home .kb-h-tab[data-tab="seed"]\').click(); return 1;');
  await sleep(1200);
  const al = await js(`return Array.from(document.querySelectorAll("#kb-h-list .kb-h-rules .kb-h-rule")).filter((r) => r.querySelector("select"))
    .map((r) => Math.round(r.querySelector("select").getBoundingClientRect().left));`);
  ok(al.length >= 3 && Math.max(...al) - Math.min(...al) <= 1, `ô chọn của dòng Deck / Note / tag cùng mép trái (${al.join(', ')})`);
  await page.shot(SHOTS + '/1226_e_tab_giong_cay.png');
  await py(KB + 'kb._dialog.resize(1024, 700); result = 1'); await sleep(1500);
  await js('GardenHome.open("yard"); document.querySelector(\'#kb-home .kb-h-tab[data-tab="seed"]\').click(); return 1;');
  await sleep(1200);
  const al2 = await js(`return Array.from(document.querySelectorAll("#kb-h-list .kb-h-rules .kb-h-rule")).filter((r) => r.querySelector("select"))
    .map((r) => Math.round(r.querySelector("select").getBoundingClientRect().left));`);
  ok(al2.length >= 3 && Math.max(...al2) - Math.min(...al2) <= 1, `1024 px: cùng mép trái (${al2.join(', ')})`);
  const m2 = await page.eval(MEASURE);
  ok(!m2.hscroll && !m2.outside.length, '1024 px: không tràn ngang' + (m2.outside.length ? ' (' + m2.outside.slice(0, 3).join('; ') + ')' : ''));
  await page.key('Escape', 'Escape', 27); await sleep(400);
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(800);

  console.log('== Đổi hồ sơ khi vườn đang mở');
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  const errs0 = await py(KB + 'result = [e.get("where") for e in kb.ERRORS.entries()]');
  ok(errs0.length === 0, 'nhật ký lỗi add-on trống' + (errs0.length ? ': ' + errs0.join(', ') : ''));
  page.close();
  await py(KB + 'mw.unloadProfileAndShowProfileManager(); result = 1');
  await sleep(4000);
  const pc = await py(KB + 'result = [kb._dialog is None, mw.col is None, [w.windowTitle() for w in mw.app.topLevelWidgets() if w.isVisible() and "ことば畑" in w.windowTitle()]]');
  ok(pc[1] && pc[0] && pc[2].length === 0, `đóng hồ sơ → cửa sổ vườn đóng theo (trước 1.22.6: còn mở, collection đã đóng) ${JSON.stringify(pc)}`);
  await py(KB + 'mw.pm.load("Test"); mw.onOpenProfile(); result = 1');
  await sleep(5000);
  ok(await py('result = mw.col is not None'), 'mở lại hồ sơ');
  await openGarden(DECK_A);
  ok(await js('return document.querySelectorAll("#kb-deck option").length > 3 && !!document.getElementById("kb-today-text").textContent;'), 'mở lại vườn sau khi đổi hồ sơ: vườn hiện bình thường');
  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:80] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on vẫn trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));

  const n = results.filter(Boolean).length;
  console.log(`\nKẾT QUẢ: ${n}/${results.length} đạt`);
  process.exit(n === results.length ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
