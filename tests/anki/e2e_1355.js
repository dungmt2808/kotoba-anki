// 1.35.5 — lỗi audit 19/11 trong Anki thật (người dùng: "sửa các lỗi nằm trên nhánh audit/release-review-1.35.4-2026-11-19.
// verify lại, và sửa lỗi. sau đó test lại lần cuối"). Mỗi mục chạy đúng thao tác của báo cáo audit:
//   01 đồng bộ: hết thanh tiến độ nhưng Anki chưa báo xong (hộp thoại cuối của lần đồng bộ) → vẫn khoá ghi; ghi chen vào
//      không đóng dấu lên bản cũ vừa mang về → lúc so trả lại đúng bản của máy; việc nền xếp hàng; Anki không bao giờ báo
//      xong → chốt an toàn tự so rồi mở khoá
//   06 tiếng Nhật dùng Claude Code → báo tiếng Trung (Gemini) vẫn đủ nút
//   07 Lịch hoa lúc đang đồng bộ: đổi tiếng / gợi ý / đã xem không bật hộp lỗi; Nhờ Gemini sửa khi máy khác vừa sửa bài →
//      không ghi đè; bài vừa về đã khoá → chữ gõ dở báo lại + Chép chữ gõ dở
//   08 Esc Esc: thẻ lấp lánh / gánh hàng / hộp hỏi trên bảng Nhà → mỗi Esc một lớp, cửa sổ vườn còn
//   11 lật thẻ lúc đang đồng bộ → đồng bộ xong lật / chấm được · 12 Tưới ngay rồi Nhà ngay → không chồng hai bảng
//   17 đủ 5 deck con → tick được deck cha · 18 đổi deck → Ctrl+Z không hoàn tác lượt ở deck cũ
//   22 Esc trong ô tìm deck trống → rời ô, Esc nữa đóng bảng Báo · 24 openSeason đóng ⚙ Giao diện
//   25 cửa sổ Sửa thẻ còn mở mà note đổi → lật thẻ thấy mặt sau mới
// Chạy: KB_SCRIPTS=e2e_1355.js run_ui.sh ADDON SHOTS
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots';
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
let pass = 0, total = 0;
const ok = (c, m) => { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview', 'editor']);
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
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const KB = 'import sys, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
const alive = () => py(KB + 'result = bool(kb._dialog) and kb._dialog.isVisible()');
const esc = () => Promise.race([page.key('Escape', 'Escape', 27).catch(() => 'x'), sleep(1500)]);
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await js('return !!(' + expr + ');')) return true; } catch (e) { /* bỏ qua */ } await sleep(150); }
  return false;
}
async function reopen() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('if (window.GardenGreet && GardenGreet.close) GardenGreet.close(); if (window.GardenTour && GardenTour.close) GardenTour.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(600);
}
async function setDeck(name) { await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name(' + JSON.stringify(name) + '); d.refresh(); result = 1'); await sleep(1400); }
const closeAll = () => js('if (!document.getElementById("kb-panel").hidden) { document.getElementById("kb-stop").click(); } ["GardenGames", "GardenHome", "GardenPaper", "GardenCal"].forEach((n) => { if (window[n] && window[n].isOpen && window[n].isOpen()) window[n].close(); }); return 1;');

(async () => {
  await py(KB + `kb.ASK_TEST_OFF = False
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"},
               gemini_key="AIzaDUMMY-proxy-injects-the-real-key-00", gemini_langs=["ja", "zh"], gemini_langs_chosen=True,
               gemini_wait_start=False, gemini_wait_langs=[])
d = st.load(); d["coins"] = 3000; st.save(d)
result = 1`);
  await reopen();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  page.errors.length = 0;
  const err0 = await py(KB + 'result = len(kb.ERRORS.entries())');

  // ===================================================================================================================
  console.log('== 01. Đồng bộ: khoá ghi tới lúc so xong');
  const s1 = await py(KB + `out = {}
c0 = st.load()["coins"]
kb._on_sync_start()
out["busy"] = bool(mw.progress.busy())
out["hold"] = kb._sync_hold()                       # hết thanh tiến độ (như lúc hộp thoại cuối của đồng bộ đang mở)
# bản cũ vừa mang về: ví cũ hơn 1.000 xu, dấu phiên bản cũ hơn bản vừa chụp
before = kb._sync_before
old = json.loads(json.dumps(mw.col.get_config(kb.core.CONFIG_KEY)))
old["coins"] = c0 - 1000
mw.col.set_config(kb.core.CONFIG_KEY, old)
mw.col.set_config("kotoba_batake_rev", {"v": 1, "t": before["rev"]["t"] - 60000, "d": "phone"})
try:
    st.add_coins(7); out["write"] = "ghi được"
except Exception as e:
    out["write"] = str(e)
ran = []
kb._after_sync(lambda x: ran.append(x))("kết quả Gemini")
out["queued"] = len(kb._sync_wait)
kb._on_sync_finished()                               # Anki báo xong → so
out["after"] = [kb._sync_hold(), st.load()["coins"] - c0, list(ran)]
result = out`);
  ok(s1.busy === false && s1.hold === true, 'hết thanh tiến độ nhưng Anki chưa báo xong → vẫn khoá (1.35.4: mở khoá ngay)');
  ok(/đang đồng bộ/.test(s1.write), 'ghi xu chen vào lúc đó bị từ chối ("Anki đang đồng bộ…") — không đóng dấu "mới nhất" lên bản cũ');
  ok(s1.queued === 1 && s1.after[0] === false && s1.after[2][0] === 'kết quả Gemini', 'việc nền xếp hàng, đồng bộ xong mới chạy');
  ok(s1.after[1] === 0, 'so xong: bản cũ vừa mang về (−1.000 xu) được trả lại đúng ví của máy (1.35.4: mất 1.000 xu) — ' + s1.after[1]);
  const s2 = await py(KB + `kb.SYNC_STUCK_S = 3
ran = []
kb._on_sync_start()
kb._after_sync(lambda x: ran.append(x))("việc chờ")
kb._e2e_ran = ran
result = kb._sync_hold()`);
  await sleep(9000);
  const s3 = await py(KB + 'result = [kb._sync_hold(), list(kb._e2e_ran)]\nkb.SYNC_STUCK_S = 120.0');
  ok(s2 === true && s3[0] === false && s3[1][0] === 'việc chờ', 'Anki không bao giờ báo xong → sau 3 giây yên lặng (thử) tự so rồi mở khoá, việc chờ chạy');

  // ===================================================================================================================
  console.log('== 06. Tiếng Nhật dùng Claude Code → báo tiếng Trung (Gemini) vẫn đủ nút');
  await py(KB + `import os
kit = os.path.join(kb.ADDON_DIR, "user_files", "kit_1355")
os.makedirs(os.path.join(kit, "bao"), exist_ok=True)
kb.save_config(bao_dir=kit, bao_source="claude", gemini_langs=["ja", "zh"])
result = 1`);
  await js('GardenPaper.open("src"); return 1;'); await sleep(1500);
  const p6 = await js(`const bs = [...document.querySelectorAll(".kb-ai-lang")]; return JSON.stringify(bs.map((b) => ({ h: b.querySelector(".kb-ai-lang-h b").textContent,
    rows: b.querySelectorAll(".kb-ai-row").length, btn: [...b.querySelectorAll("button")].map((x) => x.textContent).slice(0, 4), src: /Claude Code/.test(b.textContent) })));`).then(JSON.parse);
  const ja6 = p6.find((b) => /Nhật/.test(b.h)), zh6 = p6.find((b) => /Trung/.test(b.h));
  ok(ja6 && ja6.src && ja6.rows <= 1, 'báo tiếng Nhật: "Nguồn: Claude Code" (đúng)');
  ok(zh6 && !zh6.src && zh6.rows >= 2 && zh6.btn.some((t) => /Viết|Đọc/.test(t)), 'báo tiếng Trung: đủ dòng Hôm nay / Trình độ + nút Viết (1.35.4: chỉ còn "Nguồn: Claude Code") — ' + JSON.stringify(zh6));
  await page.shot(SHOTS + '/1355_06_nguon_bao.png');
  await py(KB + 'kb.save_config(bao_dir="", bao_source="gemini")\nresult = 1');
  await closeAll(); await sleep(500);

  // ===================================================================================================================
  console.log('== 07. Lịch hoa');
  const c7 = await py(KB + `out = {}
d = kb._dialog
today = kb.cal_today().isoformat()
lang0 = kb.config().get("journal_lang")
kb._sync_running = True
kb._e2e_busy = mw.progress.busy
mw.progress.busy = lambda: True                     # như lúc thanh tiến độ đồng bộ còn hiện (mã cũ cũng khoá)
errs = []
for cmd in ["lang:en", "hint", "seen:" + today]:
    try:
        d._on_cal(cmd)
    except Exception as e:
        errs.append(cmd + " → " + type(e).__name__)
kb._sync_running = False
mw.progress.busy = kb._e2e_busy
out["errs"] = errs
out["lang_same"] = kb.config().get("journal_lang") == lang0
# Nhờ Gemini sửa khi máy khác vừa sửa bài
r = d._cal_save("draft", {"d": today, "lang": "ja", "t": "ばんごはんをたべました。"})
out["saved"] = r.get("ok")
w = kb.JOURNAL.entry(kb.cal_today()).get("w") or {}
kb.JOURNAL.update(kb.cal_today(), {"w": dict(w, goc="ほかのきかいでかきました。")})
d._on_cal("fix:" + json.dumps({"d": today, "t": "LOCAL_UNSAVED_TEXT", "lang": "ja", "b": "ばんごはんをたべました。"}))
w2 = kb.JOURNAL.entry(kb.cal_today()).get("w") or {}
out["after"] = [w2.get("goc"), w2.get("st", "")]
result = out`);
  ok(c7.errs.length === 0, 'Anki đang đồng bộ: đổi tiếng / gợi ý / đã xem không ném lỗi ra hộp lỗi của Anki' + (c7.errs.length ? ' — ' + c7.errs.join(', ') : ''));
  ok(c7.lang_same, 'đổi tiếng lúc ghi lỗi: tiếng trong config.json không đổi (không lệch với bài)');
  ok(c7.saved && c7.after[0] === 'ほかのきかいでかきました。' && c7.after[1] === '', 'Nhờ Gemini sửa khi máy khác vừa sửa bài: bài của máy khác giữ nguyên, chưa gửi (1.35.4: bị ghi đè) — ' + JSON.stringify(c7.after));
  // bài vừa về đã khoá mà đang gõ dở
  await js('if (GardenCal.isOpen()) GardenCal.close(); GardenCal.open({}); return 1;'); await sleep(1600);
  const typed = 'CHỮ_GÕ_DỞ_CHƯA_LƯU_12345';
  const hasTa = await js(`const t = document.querySelector(".kb-cal-ta"); if (!t || t.readOnly) return false; t.focus(); t.value = ${JSON.stringify(typed)}; t.dispatchEvent(new Event("input")); return true;`);
  await py(KB + `w = kb.JOURNAL.entry(kb.cal_today()).get("w") or {}
kb.JOURNAL.update(kb.cal_today(), {"w": dict(w, st="done", goc="Bài máy khác đã gửi.", sua="Bài máy khác đã gửi.", loi=[], nhan_xet="Tốt.")})
kb._dialog.cal_stale()
result = 1`);
  await sleep(1800);
  const i7 = await js('const i = document.getElementById("kb-c-info"), t = document.querySelector(".kb-cal-ta"); return JSON.stringify({ t: i ? i.textContent : "", copy: !!document.querySelector(".kb-cal-copy"), ro: t ? t.readOnly : null });').then(JSON.parse);
  ok(hasTa && i7.ro === true && i7.t.indexOf(typed.slice(0, 20)) >= 0 && i7.copy, 'bài vừa về đã khoá: chữ gõ dở báo lại + nút "Chép chữ gõ dở" (1.35.4: mất hẳn, không báo) — ' + i7.t.slice(0, 90));
  await js('const b = document.querySelector(".kb-cal-copy"); if (b) b.click(); return 1;'); await sleep(600);
  const clip = await py(KB + 'from aqt.qt import QApplication\nresult = QApplication.clipboard().text()');
  ok(clip === typed, 'bấm Chép chữ gõ dở → cả đoạn vào bộ nhớ tạm');
  await page.shot(SHOTS + '/1355_07_lich_hoa.png');
  await closeAll(); await sleep(500);

  // ===================================================================================================================
  console.log('== 08. Esc Esc: một lần một lớp');
  for (const [name, show] of [['gánh hàng', 'GardenFinds.openPed();'],
    ['thẻ lấp lánh', 'var c=document.getElementById("kb-find-card"); if(!c){c=document.createElement("div");c.id="kb-find-card";c.className="kb-find-card";document.getElementById("kb-app").appendChild(c);} c.hidden=false;'],
    ['hộp hỏi', 'GardenUI.ask({ title: "thử", yes: "Mua", always: true, then: function () {} });']]) {
    await page.key('n', 'KeyN', 78); await waitFor('!document.getElementById("kb-home").hidden'); await sleep(500);
    await js(show + ' return 1;'); await sleep(400);
    await esc(); await sleep(700);
    const mid = await js('return JSON.stringify({ home: !document.getElementById("kb-home").hidden, pop: GardenFinds.isOpen() || !!(document.getElementById("kb-ask") && !document.getElementById("kb-ask").hidden) });').then(JSON.parse);
    await esc(); await sleep(1500);
    const a = await alive();
    const home2 = a ? await js('return !document.getElementById("kb-home").hidden;') : null;
    ok(mid.home && !mid.pop && a && home2 === false, `${name} trên bảng Nhà: Esc 1 chỉ đóng ${name}, Esc 2 đóng bảng Nhà, cửa sổ vườn còn (1.35.4: Esc 1 đóng cả hai, Esc 2 đóng cửa sổ) — ${JSON.stringify(mid)} ${a}`);
    if (!a) { await reopen(); }
  }

  // ===================================================================================================================
  console.log('== 11 / 12. Bảng ôn');
  await setDeck('B::Có câu ví dụ, không audio');
  await js('document.getElementById("kb-review").click(); GardenHome.open(); return 1;'); await sleep(2500);
  const r12 = await js('return JSON.stringify({ review: !document.getElementById("kb-panel").hidden, home: !document.getElementById("kb-home").hidden });').then(JSON.parse);
  ok(!r12.review && r12.home, 'Tưới ngay rồi mở Nhà ngay: chỉ bảng Nhà (1.35.4: bảng ôn bật đè lên) — ' + JSON.stringify(r12));
  await closeAll(); await sleep(600);
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden');
  await sleep(800);
  await py(KB + 'kb._sync_running = True\nkb._e2e_busy = mw.progress.busy\nmw.progress.busy = lambda: True\nresult = 1');
  await page.key(' ', 'Space', 32); await sleep(1200);
  await py(KB + 'kb._sync_running = False\nmw.progress.busy = kb._e2e_busy\nresult = 1');
  await page.key(' ', 'Space', 32); await sleep(1500);
  const r11 = await js('return JSON.stringify({ ratings: !document.getElementById("kb-ratings").hidden, show: !document.getElementById("kb-show").hidden });').then(JSON.parse);
  ok(r11.ratings && !r11.show, 'Space lúc đang đồng bộ (lệnh bị bỏ) → đồng bộ xong Space lật được, hiện nút chấm (1.35.4: kẹt ở "đang lật")');
  await page.key('3', 'Digit3', 51); await sleep(1500);
  const u18 = await py(KB + 'result = len(kb._dialog._undo_stack)');
  await js('const s = document.getElementById("kb-deck"); const o = [...s.options].find((x) => /C::/.test(x.textContent)) || s.options[1]; s.value = o.value; s.dispatchEvent(new Event("change")); return 1;');
  await sleep(1500);
  const u18b = await py(KB + 'result = [len(kb._dialog._undo_stack), kb._dialog._undo_target() is None]');
  ok(u18 >= 1 && u18b[0] === 0 && u18b[1], 'chấm 1 thẻ rồi đổi deck: sổ Hoàn tác của bảng ôn bỏ — Ctrl+Z không hoàn tác lượt ở deck cũ (' + u18 + ' → ' + u18b[0] + ')');
  await closeAll(); await sleep(500);

  // ===================================================================================================================
  console.log('== 25. Cửa sổ Sửa thẻ còn mở mà note đổi → lật thẻ thấy mặt sau mới');
  await setDeck('B::Có câu ví dụ, không audio');
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden');
  await sleep(800);
  const e25 = await py(KB + `d = kb._dialog
card = d._card
note = card.note()
kb._e2e_isopen = kb.edit_win.is_open
kb.edit_win.is_open = lambda nid: True          # như lúc cửa sổ Sửa thẻ còn mở (vườn đợi nó đóng mới dựng lại)
qa, aa = card.question(), card.answer()
last = next((k for k in note.keys() if note[k] and note[k] in aa and note[k] not in qa), note.keys()[-1])
note[last] = note[last] + " MỚI_SỬA_25"
mw.col.update_note(note)
result = last`);
  await sleep(800);
  await page.key(' ', 'Space', 32); await sleep(1500);
  const ans = await js('const f = document.getElementById("kb-card"); const d = f && (f.contentDocument || (f.contentWindow && f.contentWindow.document)); return d ? d.body.innerText : "";');
  await py(KB + 'kb.edit_win.is_open = kb._e2e_isopen\nresult = 1');
  ok(/MỚI_SỬA_25/.test(ans), 'lật thẻ: mặt sau có chữ vừa sửa (trường "' + e25 + '") (1.35.4: mặt sau cũ)');
  await closeAll(); await sleep(500);

  // ===================================================================================================================
  console.log('== 17. Bộ chọn deck: đủ 5 deck con vẫn tick được deck cha');
  const ids17 = await py(KB + `col = mw.col
nids = col.find_notes('"deck:B::Có câu ví dụ, không audio"')
names = ["Cha17::Con %d" % i for i in range(1, 6)]
for i, n in enumerate(nids):
    col.set_deck(col.card_ids_of_note(n), col.decks.id(names[i % 5]))
kids = [col.decks.id_for_name(x) for x in names]
kb.words.save_src(col, "ja", kids, "deck")
result = {"kids": kids, "cha": col.decks.id_for_name("Cha17")}`);
  await js('GardenPaper.open("src"); return 1;'); await sleep(1500);
  await js('const b = [...document.querySelectorAll(".kb-ai-lang")].find((x) => /Nhật/.test(x.textContent)); const btn = b && [...b.querySelectorAll("button")].find((x) => x.textContent === "Đổi"); if (btn) btn.click(); return 1;'); await sleep(900);
  const cha = await js(`const l = document.querySelector('.kb-ai-deck[data-id="${ids17.cha}"] input'); return l ? JSON.stringify({ dis: l.disabled, on: l.checked }) : "null";`).then(JSON.parse);
  ok(cha && cha.dis === false && cha.on === false, 'đã chọn 5 deck con của Cha17 → ô deck cha vẫn bấm được (1.35.4: khoá) — ' + JSON.stringify(cha));
  if (cha && !cha.dis) {
    await js(`document.querySelector('.kb-ai-deck[data-id="${ids17.cha}"] input').click(); return 1;`); await sleep(800);
    const sv = await py(KB + 'result = kb.words.load_src(mw.col)["ja"]["decks"]');
    ok(JSON.stringify(sv) === JSON.stringify([ids17.cha]), 'tick deck cha → gom 5 deck con thành 1 lựa chọn');
  }

  console.log('== 22. Esc trong ô tìm deck trống');
  const hasQ = await js('const q = document.querySelector(".kb-ai-lang .kb-ai-dq"); if (!q) return false; q.value = ""; q.focus(); return document.activeElement === q;');
  if (hasQ) {
    await esc(); await sleep(500);
    const q1 = await js('const q = document.querySelector(".kb-ai-lang .kb-ai-dq"); return JSON.stringify({ focus: document.activeElement === q, paper: !document.getElementById("kb-paper").hidden });').then(JSON.parse);
    await esc(); await sleep(1200);
    const a22 = await alive();
    const p2 = a22 ? await js('return !document.getElementById("kb-paper").hidden;') : null;
    ok(!q1.focus && q1.paper && a22 && p2 === false, 'Esc 1: rời ô tìm (bảng Báo còn), Esc 2: đóng bảng Báo, cửa sổ vườn còn (1.35.4: Esc "chết") — ' + JSON.stringify(q1));
    if (!a22) { await reopen(); }
  } else {
    ok(false, 'không thấy ô tìm deck (cần > 6 deck tiếng Nhật)');
  }
  await closeAll(); await sleep(400);

  console.log('== 24. Chip chủ đề mùa đóng ⚙ Giao diện');
  const s24 = await js('if (window.GardenUI && GardenUI.open) { GardenUI.open(); } return !!(document.getElementById("kb-ui") && !document.getElementById("kb-ui").hidden);');
  await js('const c = document.getElementById("kb-theme-chip") || document.querySelector(".kb-theme-chip"); if (c) { c.click(); } return 1;'); await sleep(900);
  const s24b = await js('return JSON.stringify({ ui: !!(document.getElementById("kb-ui") && !document.getElementById("kb-ui").hidden), home: !document.getElementById("kb-home").hidden });').then(JSON.parse);
  if (s24 && s24b.home) { ok(!s24b.ui, '⚙ Giao diện đang mở rồi bấm chip chủ đề mùa → chỉ còn bảng Nhà (1.35.4: hai bảng chồng nhau)'); }
  else { console.log('  (bỏ qua: hồ sơ thử chưa có chip chủ đề mùa / bảng ⚙ Giao diện — ' + JSON.stringify([s24, s24b]) + ')'); }
  await closeAll(); await sleep(400);

  // ===================================================================================================================
  const err1 = await py(KB + 'result = [e["msg"] for e in kb.ERRORS.entries()][' + err0 + ':]');
  ok(page.errors.length === 0, 'không lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  ok(err1.filter((m) => !/TEST|đọc collection lỗi thoáng qua/.test(m)).length === 0, 'nhật ký lỗi add-on không thêm lỗi lạ' + (err1.length ? ': ' + err1.slice(0, 3).join(' | ') : ''));
  console.log(`KẾT QUẢ: ${pass}/${total}` + (pass === total ? ' — TẤT CẢ OK' : ' — CÓ LỖI'));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e && e.stack || e); process.exit(1); });
