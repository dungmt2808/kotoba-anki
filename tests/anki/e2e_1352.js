// 1.35.2: lỗi của nhánh audit/release-review-1.35.1-2026-11-18 chạy thật trong Anki (Lịch hoa, Luyện viết, Trang trí thử,
// Nguồn báo) + "Bắt đầu truyện mới". Mỗi mục làm đúng thao tác của báo cáo audit rồi đọc collection / file:
//   02 bỏ chọn báo tiếng Đức → bài tiếng Đức đang viết vẫn là tiếng Đức, gõ thêm không bị cắt
//   03 bấm đổi tiếng mà bài dài hơn giới hạn → hỏi trước; Huỷ = bài nguyên vẹn; lệnh cũ không kèm ":cut" không cắt
//   12 Lịch hoa đang mở + File → Import .colpkg / đồng bộ mang về bản khác → ô hiện bản vừa nhận, gõ tiếp không ghi đè
//      bản cũ; ô collection không đổi thì chữ đang gõ dở được giữ; chữ gõ dở mà ô đã đổi → báo lại, không ghi đè
//   13 Nhờ Gemini sửa khi lần lưu bài mới lỗi → không gửi bài cũ, không mất lượt; lưu lại được thì gửi đúng bài mới
//   14 sang ngày mới giữa lúc chờ tự lưu → chữ gõ trước lúc đổi ngày lưu vào ngày cũ, ô ngày cũ khoá
//   15 lưu lỗi một lần rồi lưu lại được → hết cảnh báo đỏ
//   01 Trang trí thử: lệnh lưu / chuyển ô gặp một lần đọc file lỗi → không mất bản thử nào
//   B  tab Nguồn báo → Tuỳ chọn thêm → Bắt đầu truyện mới (hỏi trước) → Lấy lại truyện cũ; khoá khi Gemini đang viết
// Chạy: KB_SCRIPTS=e2e_1352.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1352';
fs.mkdirSync(SHOTS, { recursive: true });
const TMP = fs.mkdtempSync('/tmp/kb1352_');
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function waitPy(code, ms) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) { try { const r = await py(code); if (r) return r; } catch (e) { /* đang nạp */ } await sleep(400); }
  return null;
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
const KB = 'import sys, os, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
const DE24 = 'Heute gehe ich mit meiner Freundin in den großen Garten und wir trinken gemeinsam Kaffee unter dem alten Baum am Ende des langen Weges.';

const card = () => js(`const c = document.querySelector(".kb-cal-write"); if (!c) return null; const t = c.querySelector(".kb-cal-ta");
  return { lang: t ? t.getAttribute("lang") : "", val: t ? t.value : "", ro: t ? t.readOnly : null, cnt: (c.querySelector(".kb-cal-cnt") || {}).textContent || "",
    chips: Array.from(c.querySelectorAll(".kb-cal-langs .kb-ai-chip")).map((b) => b.textContent), on: (c.querySelector(".kb-cal-langs .is-on") || {}).textContent || "" };`);
const note = () => js('const t = document.querySelector(".kb-cal-note"); return t ? t.value : null;');
const info = () => js('const i = document.getElementById("kb-c-info"); return i ? { t: i.textContent, bad: i.classList.contains("is-bad") } : null;');
const openCal = async () => { await js('if (GardenCal.isOpen()) GardenCal.close(); GardenCal.open({}); return 1;'); await sleep(1600); };
const closeCal = async () => { await js('GardenCal.close(); return 1;'); await sleep(500); };
const chip = (name) => js(`const b = Array.from(document.querySelectorAll(".kb-cal-langs .kb-ai-chip")).find((x) => x.textContent === ${JSON.stringify(name)}); if (b) { b.click(); return 1; } return 0;`);
const setTa = (sel, txt) => js(`const t = document.querySelector(${JSON.stringify(sel)}); t.focus(); t.value = ${JSON.stringify(txt)}; t.dispatchEvent(new Event("input")); return 1;`);
const typeEnd = async (sel, txt) => { await js(`const t = document.querySelector(${JSON.stringify(sel)}); t.focus(); t.setSelectionRange(t.value.length, t.value.length); return 1;`); await page.type(txt); };
const ask = () => js('const a = document.getElementById("kb-ask"); return a && !a.hidden ? { t: a.querySelector(".kb-ask-t").textContent, n: a.querySelector(".kb-ask-n").textContent, yes: a.querySelector(".kb-ask-yes").textContent } : null;');
const askClick = async (yes) => { await sleep(700); await js(`document.querySelector(${JSON.stringify(yes ? '#kb-ask .kb-ask-yes' : '#kb-ask .kb-ask-no')}).click(); return 1;`); };
const rawDay = () => py(KB + `d = kb.cal_today()\nraw = mw.col.get_config("kotoba_batake_journal_%04d_%02d" % (d.year, d.month), {}) or {}\nresult = raw.get(d.isoformat()) or {}`);
const words = (s) => (String(s || '').match(/[A-Za-zÀ-ɏ]+/g) || []).length;

(async () => {
  await py(KB + `kb.save_config(show_tooltips=False, sound=False, music=False, gemini_key="AIzaDUMMY-proxy-injects-the-real-key-00",
               gemini_langs=["de", "zh"], gemini_langs_chosen=True, gemini_wait_start=False, gemini_wait_langs=[])
kb.ASK_TEST_OFF = False
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1');
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 860); kb._dialog.refresh(); result = 1'); await sleep(1200);
  page.errors.length = 0;
  const err0 = await py(KB + 'result = len(kb.ERRORS.entries())');

  console.log('== 02. Bỏ chọn báo tiếng Đức khi đang viết bài tiếng Đức');
  await openCal();
  await chip('Tiếng Đức'); await sleep(1300);
  await setTa('.kb-cal-ta', DE24); await sleep(1500);
  let w = (await rawDay()).w || {};
  ok(w.l === 'de' && words(w.goc) === 24, 'bài tiếng Đức 24 từ đã lưu (lang ' + w.lang + ' + l ' + w.l + ')');
  await closeCal();
  await py(KB + 'kb.save_config(gemini_langs=["zh"]); kb._dialog.refresh(); result = 1'); await sleep(800);
  await openCal();
  let c = await card();
  ok(c && c.lang === 'de' && c.val === DE24, 'mở lại Lịch hoa: ô vẫn tiếng Đức, đủ bài');
  await typeEnd('.kb-cal-ta', ' Ja.'); await sleep(1600);
  w = (await rawDay()).w || {};
  ok(w.l === 'de' && w.goc === DE24 + ' Ja.', 'gõ thêm " Ja." → collection: tiếng Đức, ' + words(w.goc) + ' từ, đủ bài (1.35.1: thành zh, cắt ở "wir trinken g")');
  await closeCal(); await openCal();
  c = await card();
  ok(c && c.cnt === '25 / 30 từ', 'mở lại: ' + (c && c.cnt) + ' (1.35.1: 60 / 60 ký tự)');

  console.log('== 03. Bấm đổi tiếng khi bài dài hơn giới hạn của tiếng mới');
  await py(KB + 'kb.save_config(gemini_langs=["de", "zh"]); kb._dialog.refresh(); result = 1'); await sleep(800);
  await openCal();
  await chip('Tiếng Trung'); await sleep(500);
  let a = await ask();
  ok(a && a.t === 'Đổi sang Tiếng Trung?' && /cắt bớt/.test(a.n) && /Đổi và cắt bớt/.test(a.yes), 'hỏi trước: "' + (a && a.t) + '" · ' + (a && a.n));
  await page.shot(path.join(SHOTS, '1352_doi_tieng_hoi.png'));
  await askClick(false); await sleep(900);
  w = (await rawDay()).w || {};
  c = await card();
  ok(w.l === 'de' && w.goc === DE24 + ' Ja.' && c.lang === 'de', 'Huỷ: bài + tiếng giữ nguyên');
  await js('pycmd("cal:lang:zh"); return 1;'); await sleep(1200);      // lệnh của bản trang cũ / bấm trước khi hỏi
  w = (await rawDay()).w || {};
  const fl = await info();
  ok(w.l === 'de' && w.goc === DE24 + ' Ja.' && fl && fl.bad && /chưa đổi tiếng/.test(fl.t), 'lệnh đổi tiếng không kèm ":cut": không cắt — "' + (fl && fl.t) + '"');
  await chip('Tiếng Trung'); await sleep(400); await askClick(true); await sleep(1500);
  w = (await rawDay()).w || {};
  c = await card();
  ok(w.lang === 'ja' && (w.l || 'zh') === 'zh' && Array.from(w.goc.replace(/\s/g, '')).length === 60 && c.lang === 'zh',
    'chọn "Đổi và cắt bớt": tiếng Trung, còn 60 ký tự (người dùng đã đồng ý)');
  await chip('Tiếng Đức'); await sleep(1300);
  await setTa('.kb-cal-ta', 'Ich lese ein Buch.'); await sleep(1500);

  console.log('== 12a. Lịch hoa đang mở + File → Import .colpkg');
  await setTa('.kb-cal-note', 'Nhật ký A'); await sleep(1800);
  await py(KB + `mw.col.export_collection_package(${JSON.stringify(TMP + '/a.colpkg')}, include_media=False, legacy=False)
mw.reopen()
result = 1`);
  await sleep(1500);
  await setTa('.kb-cal-note', 'Nhật ký B'); await sleep(1800);
  await setTa('.kb-cal-ta', 'Heute trinke ich Tee.'); await sleep(1500);
  let e = await rawDay();
  ok(e.t === 'Nhật ký B' && (e.w || {}).goc === 'Heute trinke ich Tee.', 'trước khi nhập: collection có B');
  await py(KB + `from aqt.import_export.importing import ColpkgImporter
ColpkgImporter._import(mw, ${JSON.stringify(TMP + '/a.colpkg')})
result = 1`);
  await waitPy('result = bool(mw.col) and kb._col_ready() and mw.state == "deckBrowser"', 40000);
  await sleep(2500);
  e = await rawDay();
  const shown = { note: await note(), w: (await card() || {}).val, open: await js('return GardenCal.isOpen();') };
  ok(e.t === 'Nhật ký A' && (e.w || {}).goc === 'Ich lese ein Buch.', 'vừa nhập: collection có A');
  ok(shown.open && shown.note === 'Nhật ký A' && shown.w === 'Ich lese ein Buch.',
    'Lịch hoa vẫn mở và hiện A (1.35.1: còn hiện B, gõ tiếp là ghi B đè A): ' + JSON.stringify(shown));
  await typeEnd('.kb-cal-note', '!'); await js('document.querySelector(".kb-cal-note").blur(); return 1;');
  await typeEnd('.kb-cal-ta', '!'); await js('document.querySelector(".kb-cal-ta").blur(); return 1;'); await sleep(1500);
  await closeCal(); await sleep(300);
  e = await rawDay();
  ok(e.t === 'Nhật ký A!' && (e.w || {}).goc === 'Ich lese ein Buch.!', 'thêm "!" rồi đóng: collection = A + "!" (1.35.1: B + "!")');
  ok(await py(KB + 'result = len(kb._dialog._cal_keep)') === 0, 'không còn chữ cũ chờ lưu nốt lúc đóng cửa sổ');

  console.log('== 12b. Đồng bộ mang về bản khác khi Lịch hoa đang mở');
  await openCal();
  await setTa('.kb-cal-ta', 'Ich bin in Berlin.'); await sleep(1500);
  await setTa('.kb-cal-note', 'Nhật ký của máy này, đang gõ dở');          // chưa tới lần tự lưu (1,5 giây)
  await py(KB + `kb._on_sync_start()
d = kb.cal_today()
w = kb.JOURNAL.entry(d).get("w") or {}
kb._sync_running = False      # 1.35.5: dữ liệu mang về do Anki ghi (không qua khoá ghi của vườn)
kb.JOURNAL.update(d, {"w": dict(w, goc="Ich bin in Leipzig.")})
kb._sync_running = True        # máy B sửa bài rồi đồng bộ lên; máy này nhận về
kb._on_sync_finished()
result = 1`);
  await sleep(2200);
  e = await rawDay();
  c = await card();
  ok(c && c.val === 'Ich bin in Leipzig.', 'ô luyện viết hiện bản vừa nhận "Ich bin in Leipzig." (1.35.1: vẫn Berlin)');
  ok(e.t === 'Nhật ký của máy này, đang gõ dở' && (await note()) === e.t,
    'ô nhật ký (collection không đổi) giữ chữ đang gõ dở và lưu được: "' + e.t + '"');
  await typeEnd('.kb-cal-ta', '!'); await js('document.querySelector(".kb-cal-ta").blur(); return 1;'); await sleep(1500);
  e = await rawDay();
  ok((e.w || {}).goc === 'Ich bin in Leipzig.!', 'gõ "!" → "Ich bin in Leipzig.!" (1.35.1: máy B nhận lại "Ich bin in Berlin.!")');
  // chữ gõ dở mà chính ô đó vừa đổi ở máy khác → hiện bản mới, báo lại chữ gõ dở (không ghi đè)
  await setTa('.kb-cal-ta', 'Ich bin in München und');
  await py(KB + `kb._on_sync_start()
d = kb.cal_today()
w = kb.JOURNAL.entry(d).get("w") or {}
kb._sync_running = False      # 1.35.5: dữ liệu mang về do Anki ghi (không qua khoá ghi của vườn)
kb.JOURNAL.update(d, {"w": dict(w, goc="Ich bin in Hamburg.")})
kb._sync_running = True
kb._on_sync_finished()
result = 1`);
  await sleep(2200);
  e = await rawDay(); c = await card(); let inf = await info();
  ok((e.w || {}).goc === 'Ich bin in Hamburg.' && c.val === 'Ich bin in Hamburg.' && inf.bad && /München und/.test(inf.t),
    'cùng ô vừa đổi ở máy khác: hiện bản mới, chữ gõ dở báo lại — "' + (inf && inf.t.slice(0, 90)) + '…"');
  await page.shot(path.join(SHOTS, '1352_dong_bo_lich_hoa.png'));
  // lần lưu của trang cũ tới SAU đồng bộ (b = bản trang tin là đã lưu, collection đã khác) → không ghi đè
  const t0 = (await rawDay()).t;
  await py(KB + `d = kb.cal_today()\nkb.JOURNAL.update(d, {"t": "Nhật ký máy B viết"})\nresult = 1`);
  await js(`pycmd("cal:note:" + JSON.stringify({ d: ${JSON.stringify(await py(KB + 'result = kb.cal_today().isoformat()'))}, t: "chữ cũ gõ tiếp", b: ${JSON.stringify(t0)} })); return 1;`);
  await sleep(2000);
  e = await rawDay();
  ok(e.t === 'Nhật ký máy B viết' && (await note()) === 'Nhật ký máy B viết',
    'lần lưu tới sau đồng bộ (dựa trên bản cũ): không ghi đè "Nhật ký máy B viết", ô hiện bản mới');

  console.log('== 13. Nhờ Gemini sửa khi lần lưu bài mới lỗi');
  await py(KB + `kb._fake_goc = []
def _fake(client, names, goc, lang, level, hints):
    kb._fake_goc.append(goc)
    return {"raw": {"sua": goc, "loi": [], "con_lai": "", "tu_nhien": "", "nhan_xet": "Câu đúng rồi."}, "model": "gemini-flash-lite-latest"}
kb.journal.run_fix = _fake
kb.ai.Gemini.models = lambda self: [{"name": "models/gemini-flash-lite-latest", "supportedGenerationMethods": ["generateContent"]}]
kb._fail_left = [0]
if not hasattr(kb, "_put0"):
    kb._put0 = kb.journal.backup.put_config
def _put(col, key, val, *a, **k):
    if key.startswith("kotoba_batake_journal_") and kb._fail_left[0] > 0:
        kb._fail_left[0] -= 1
        raise OSError("QA: ghi lỗi")
    return kb._put0(col, key, val, *a, **k)
kb.journal.backup.put_config = _put
result = 1`);
  await setTa('.kb-cal-ta', 'Ich lese ein Buch.'); await sleep(1500);
  await py(KB + 'kb._fail_left[0] = 2; result = 1');
  await setTa('.kb-cal-ta', 'Heute trinke ich Tee.');
  await js('document.querySelector(".kb-cal-ta").blur(); const b = document.querySelector(".kb-cal-send"); if (b) b.click(); return 1;');
  await sleep(2500);
  e = await rawDay(); inf = await info(); c = await card();
  let sent = await py(KB + 'result = list(kb._fake_goc)');
  ok(!sent.length && (e.w || {}).st !== 'done' && c.val === 'Heute trinke ich Tee.' && !c.ro,
    'hai lần ghi lỗi: KHÔNG gửi (1.35.1: gửi "Ich lese ein Buch." + mất lượt), ô còn câu mới, chưa khoá — "' + (inf && inf.t.slice(0, 80)) + '"');
  await js('const b = document.querySelector(".kb-cal-send"); if (b) b.click(); return 1;');
  const done = await waitPy(KB + 'result = (kb.JOURNAL.entry(kb.cal_today()).get("w") or {}).get("st") == "done"', 15000);
  sent = await py(KB + 'result = list(kb._fake_goc)');
  ok(done && sent.length === 1 && sent[0] === 'Heute trinke ich Tee.', 'bấm lại (ghi được): Gemini nhận đúng câu mới: ' + JSON.stringify(sent));

  console.log('== 15. Lưu lỗi một lần rồi lưu lại được');
  await py(KB + 'kb._fail_left[0] = 1; result = 1');
  await setTa('.kb-cal-note', 'Nhật ký mới'); await js('document.querySelector(".kb-cal-note").blur(); return 1;'); await sleep(1500);
  inf = await info();
  ok(inf && inf.bad && /Chưa lưu được/.test(inf.t), 'lần ghi lỗi: cảnh báo "' + (inf && inf.t.slice(0, 50)) + '"');
  await typeEnd('.kb-cal-note', '!'); await js('document.querySelector(".kb-cal-note").blur(); return 1;'); await sleep(1500);
  inf = await info(); e = await rawDay();
  ok(e.t === 'Nhật ký mới!' && inf && !inf.bad && !/Chưa lưu được/.test(inf.t), 'lưu lại được: collection có "Nhật ký mới!", hết cảnh báo đỏ ("' + (inf && inf.t) + '")');
  await py(KB + 'kb.journal.backup.put_config = kb._put0; result = 1');

  console.log('== 14. Sang ngày mới giữa lúc chờ tự lưu');
  await py(KB + `d = kb.cal_today() + datetime.timedelta(days=1)
kb._real_cal_today, kb._real_today = kb.cal_today, kb._today
result = d.isoformat()`);
  const D1 = await py(KB + 'result = kb.cal_today().isoformat()');
  await py(KB + 'd = kb.cal_today()\nkb.JOURNAL.update(d, {"w": None}); result = 1');
  await closeCal(); await openCal();
  await setTa('.kb-cal-ta', 'Ich lese ein Buch.'); await sleep(1500);
  await typeEnd('.kb-cal-ta', ' Heute Abend.'); await sleep(250);          // còn trong 800 ms chờ tự lưu
  await py(KB + `base = kb._real_cal_today()
kb.cal_today = lambda: base + datetime.timedelta(days=1)
t0 = kb._real_today()
kb._today = lambda: t0 + 1
kb._dialog._check_day()
result = 1`);
  await sleep(2500);
  const old = await py(KB + `d = datetime.date.fromisoformat(${JSON.stringify(D1)})\nresult = (kb.JOURNAL.entry(d).get("w") or {}).get("goc")`);
  c = await card(); inf = await info();
  ok(old === 'Ich lese ein Buch. Heute Abend.', 'chữ gõ trước lúc đổi ngày lưu vào ngày cũ: "' + old + '" (1.35.1: mất " Heute Abend.")');
  ok(!c || c.ro, 'ô luyện viết của ngày cũ khoá (không cho gõ tiếp mà không lưu được)');
  ok(inf && /Đã sang ngày mới/.test(inf.t), 'Lịch hoa báo: "' + (inf && inf.t) + '"');
  await py(KB + 'kb.cal_today, kb._today = kb._real_cal_today, kb._real_today; kb._dialog._day_seen = kb._today(); result = 1');
  await closeCal();

  console.log('== 01. Trang trí thử: một lần đọc file lỗi');
  await py(KB + `dc = kb.draft_core
for sc, sl, it in (("yard", 0, "bench"), ("room", 1, "tv")):
    st.draft_store(dc.put(st.draft_load(), sc, sl, {"items": [{"id": it, "x": 6, "y": 1}]}))
result = 1`);
  const before = await py(KB + 'p = kb.backup_core.profile_path(st._draft_path(), mw.col)\nresult = open(p, encoding="utf-8").read()');
  const once = (cmd) => py(KB + `import builtins
p = kb.backup_core.profile_path(st._draft_path(), mw.col)
real = builtins.open
left = [1]
def op(path, mode="r", *a, **k):
    if os.fspath(path) == p and mode == "r" and left:
        left.pop()
        raise OSError("QA")
    return real(path, mode, *a, **k)
builtins.open = op
try:
    kb._dialog._on_draft(${JSON.stringify(cmd)})
finally:
    builtins.open = real
result = open(p, encoding="utf-8").read()`);
  const a1 = await once('put:' + JSON.stringify({ scene: 'yard', slot: 2, draft: { items: [{ id: 'lamp', x: 6, y: 1 }] } }));
  const a2 = await once('pick:' + JSON.stringify({ scene: 'yard', slot: 1 }));
  ok(a1 === before && a2 === before, 'lệnh lưu ô / chuyển ô gặp một lần đọc lỗi: file bản thử giữ nguyên (1.35.1: còn mỗi Sân bản 3 / Sân bản 1 trống)');

  console.log('== B. Nguồn báo → Bắt đầu truyện mới');
  await py(KB + `S = kb.story_core
sh = kb.AI_DIR_SHARED
for i in range(1, 4):
    d = "2026-10-%02d" % (10 + i)
    S.save_episode(sh, d, i, {"doan": ["Đoạn kỳ %d." % i], "nho": {"tom_tat": "Kỳ %d." % i}}, "Kỳ %d" % i)
result = 1`);
  await js('GardenPaper.open("src"); return 1;'); await sleep(1800);
  const row = () => js('const d = document.querySelector(".kb-ai-opts-box"); if (d) d.open = true; const r = document.querySelector(".kb-ai-restart"); return r ? { v: r.querySelector(".kb-ai-v").textContent, b: Array.from(r.querySelectorAll("button")).map((x) => [x.textContent, x.disabled]) } : null;');
  let r = await row();
  ok(r && r.v === 'đang ở kỳ 3' && r.b[0][0] === 'Bắt đầu truyện mới' && !r.b[0][1], 'Tuỳ chọn thêm → Truyện dài kỳ: ' + JSON.stringify(r));
  await js('const r = document.querySelector(".kb-ai-restart"); if (r) r.scrollIntoView({ block: "center" }); return 1;'); await sleep(300);
  await page.shot(path.join(SHOTS, '1352_truyen_dai_ky.png'));
  await js('document.querySelector(".kb-ai-restart-btn").click(); return 1;'); await sleep(500);
  a = await ask();
  ok(a && a.t === 'Bắt đầu truyện mới từ kỳ 1?' && /Truyện cũ \(3 kỳ\) được cất lại/.test(a.n) && /Kệ báo/.test(a.n), 'hỏi trước: ' + (a && a.n));
  await page.shot(path.join(SHOTS, '1352_truyen_moi_hoi.png'));
  await askClick(true); await sleep(1500);
  r = await row();
  const flash = await js('const f = document.querySelector(".kb-ai-flash, .kb-ai-msg"); return f ? f.textContent : document.querySelector("#kb-p-stage") ? document.querySelector("#kb-p-stage").textContent.match(/✓ Đã cất truyện cũ[^.]*\\./) : "";');
  const files = await py(KB + 'S = kb.story_core\nsh = kb.AI_DIR_SHARED\nresult = {"ky": S.last_ky(sh), "cu": os.listdir(os.path.join(sh, S.ARCHIVE_DIR))}');
  ok(files.ky === 0 && files.cu.length === 1 && r && r.v === 'số tới bắt đầu truyện mới (kỳ 1)' && r.b[0][0] === 'Lấy lại truyện cũ',
    'đã cất truyện cũ (' + files.cu[0] + '), dòng: "' + (r && r.v) + '", nút ' + (r && r.b[0][0]) + ' · ' + JSON.stringify(flash));
  await js('const r = document.querySelector(".kb-ai-restart"); if (r) r.scrollIntoView({ block: "center" }); return 1;'); await sleep(300);
  await page.shot(path.join(SHOTS, '1352_truyen_moi.png'));
  await py(KB + 'kb._ai["running"] = True; kb._dialog._js("aiStatus", kb.ai_view()); result = 1'); await sleep(800);
  r = await row();
  ok(r && r.b[0][1], 'Gemini đang viết báo: nút bị khoá');
  await js('pycmd("ai:restart_undo"); return 1;'); await sleep(900);
  ok((await py(KB + 'S = kb.story_core\nresult = S.last_ky(kb.AI_DIR_SHARED)')) === 0, 'lệnh gửi lúc đang viết bị từ chối (truyện không đổi)');
  await py(KB + 'kb._ai["running"] = False; kb._dialog._js("aiStatus", kb.ai_view()); result = 1'); await sleep(800);
  await js('document.querySelector(".kb-ai-restart-undo").click(); return 1;'); await sleep(1500);
  r = await row();
  ok(r && r.v === 'đang ở kỳ 3' && (await py(KB + 'S = kb.story_core\nresult = S.resets(kb.AI_DIR_SHARED)')).length === 0,
    'Lấy lại truyện cũ: "' + (r && r.v) + '"');

  // lỗi ghi do kịch bản tự gây ra (mục 13 / 15: "QA: ghi lỗi") là lỗi mong đợi — chỉ đếm lỗi khác
  const errs = (await py(KB + 'result = [e["where"] + ": " + e["msg"][:100] for e in kb.ERRORS.entries()]')).slice(err0).filter((x) => !/QA: ghi lỗi/.test(x));
  ok(!page.errors.length && !errs.length, 'không lỗi JS / nhật ký lỗi' + (page.errors.length ? ' JS: ' + page.errors.slice(0, 2).join(' | ') : '') + (errs.length ? ' PY: ' + errs.slice(0, 2).join(' | ') : ''));
  console.log('\nKẾT QUẢ: ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI KỊCH BẢN', e); process.exit(3); });
