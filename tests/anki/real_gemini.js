// 1.26.1 — Gemini THẬT nhiều ngày liền trong Anki thật (không nằm trong run_ui mặc định: tốn ~60–90 lượt gọi chữ).
// Đúng đường của add-on (ai_start → gói báo → truyện chung / bản gốc → kể lại → viết số → sửa → soát → giọng đọc),
// chỉ đổi "hôm nay" (kb.ai_today) để đi qua nhiều ngày. Mỗi ngày đọc số báo trong bảng Báo thật, trả lời câu hỏi.
//   Ngày 1 (09/11): báo Claude Code (8 số thật của kotoba_daily) vẫn là nguồn tiếng Nhật, Claude không viết hôm nay →
//     chỉ báo tiếng Anh (Gemini) → bản gốc phải NỐI kỳ 8 của Claude thành kỳ 9; tặng 7 ngày gói báo;
//     kotoba_daily/truyen_chung.json có kỳ 9; pham_vi.py sáng hôm sau: kỳ tiếp theo 10.
//   Ngày 2 – 3 (10–11/11): đổi báo tiếng Nhật sang Gemini → Nhật N4 + Anh A2 cùng kể một kỳ (10, 11); ngày 3 có giọng đọc.
//   Ngày 4 (12/11): chỉ tiếng Việt → in nguyên văn bản gốc kỳ 12.
//   Ngày 5 (16/11): gói thử hết hạn, Tự gia hạn + đủ xu → gia hạn −100 xu, báo tiếng Nhật kỳ 13.
// Chạy: KB_STREAM=1 (proxy cắt request > 30 s) node real_gemini.js SHOTS   (Anki đã mở bằng run_anki.sh, khoá thật hoặc proxy chèn khoá)
const fs = require('fs'), path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_real';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
let pass = 0, total = 0;
const ok = (c, m) => { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json, shutil, datetime\nkb = sys.modules["kotoba_batake"]\nfrom aqt import mw\n';
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
  while (Date.now() - t < ms) { try { const v = await page.eval(expr); if (v) return v; } catch (e) { } await sleep(200); }
  return false;
}
const REPORT = [];
const note = (s) => { REPORT.push(s); };

// đường streaming của bộ test (stream_patch.py) gắn vào ai_core của add-on đang chạy trong Anki
const STREAM = fs.readFileSync(path.join(__dirname, '..', 'gemini', 'stream_patch.py'), 'utf-8')
  .replace('import ai_core as ai', 'ai = sys.modules["kotoba_batake.ai_core"]');

async function setDay(d) { await py(KB + `kb.ai_today = lambda: ${JSON.stringify(d)}\nresult = kb.ai_today()`); }

async function writeLang(lang, label) {
  const t0 = Date.now();
  const started = await py(KB + `kb._kb_calls0 = kb._kb_calls[0]\nresult = [kb.ai_start("manual", kb._dialog, ${JSON.stringify(lang)}), kb._ai.get("why", "")]`);
  if (!started[0]) { ok(false, label + ': không bắt đầu được (' + started[1] + ')'); return null; }
  while (Date.now() - t0 < 30 * 60 * 1000) {
    if (!(await py(KB + 'result = bool(kb._ai["running"])'))) { break; }
    await sleep(3000);
  }
  const r = await py(KB + `lang = ${JSON.stringify(lang)}
base = kb.AI_DIRS[lang]; d = kb.ai_today()
st = kb.ai.load_status(base)
iss = None
if kb.ai.has_issue(base, d):
    iss = json.load(open(kb.ai.issue_path(base, d), encoding="utf-8"))
m = kb.story_core.load_master(kb.AI_DIR_SHARED, d)
result = {"has": iss is not None, "error": st.get("error", ""), "audio_error": st.get("audio_error", ""), "model": st.get("model", ""),
          "log": kb.ai.log_summary(kb.ai.last_log(base, d)), "calls": kb._kb_calls[0] - kb._kb_calls0,
          "ky": [b.get("ky") for b in (iss or {}).get("bai", []) if b.get("loai") == "truyen"],
          "titles": [kb.paper.surface(b.get("tieu_de", "")) for b in (iss or {}).get("bai", [])],
          "kinds": [b.get("loai") for b in (iss or {}).get("bai", [])],
          "truyen_chung": bool((iss or {}).get("truyen_chung")),
          "q": len((iss or {}).get("cau_hoi", [])), "ct": len((iss or {}).get("chinh_ta", [])),
          "master": {"ky": m.get("ky"), "title": m["truyen"]["tieu_de"], "tin": [t.get("tieu_de") for t in m.get("tin", [])],
                     "thoi_tiet": m.get("thoi_tiet", "")} if m else None,
          "coins": kb.STATE.load()["coins"], "sub": kb.paper_sub_view()}`);
  r.secs = Math.round((Date.now() - t0) / 1000);
  console.log('    ' + label + ': ' + r.secs + ' giây, ' + r.calls + ' lượt gọi, model ' + r.model + (r.error ? ', LỖI: ' + r.error : ''));
  for (const l of r.log) console.log('      · ' + l);
  note({ label, lang, ...r });
  return r;
}

// đọc số báo hôm nay của `lang` trong bảng Báo thật: đo tràn, đếm chỗ tra từ, trả lời đúng mọi câu hỏi
async function readIssue(lang, label) {
  const want = await py(KB + `d = kb.ai_today(); lang = ${JSON.stringify(lang)}
iss = json.load(open(kb.ai.issue_path(kb.AI_DIRS[lang], d), encoding="utf-8"))
result = {"d": d, "right": [q.get("dung") for q in iss.get("cau_hoi", [])], "coins": kb.STATE.load()["coins"]}`);
  await js(`GardenPaper.close(); return 1;`); await sleep(300);
  await js(`GardenPaper.open("issue"); return 1;`); await sleep(400);
  await js(`pycmd("paper:lang:${lang}"); return 1;`);
  const ref = lang === 'ja' ? null : want.d;
  await waitFor('document.querySelector("#kb-p-stage .kb-p-mast")', 15000);
  // mở đúng số hôm nay (Kệ báo chọn số chưa đọc đầu tiên)
  await js(`pycmd("paper:issue:" + ${JSON.stringify(want.d)} + ${JSON.stringify(lang === 'ja' ? '@gemini' : '')}); return 1;`);
  await sleep(1500);
  const v = await js(`const st = document.getElementById("kb-p-stage");
    const over = [...st.querySelectorAll("*")].filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX !== "visible" && e.clientWidth > 0).length;
    return {name: (st.querySelector(".kb-p-name") || {}).textContent, meta: (st.querySelector(".kb-p-meta") || {}).textContent,
      kinds: [...st.querySelectorAll(".kb-p-kind")].map((x) => x.textContent), words: st.querySelectorAll(".kb-p-w").length,
      q: st.querySelectorAll(".kb-p-q").length, plays: st.querySelectorAll(".kb-p-play").length, ruby: st.querySelectorAll("ruby").length,
      hscroll: st.scrollWidth - st.clientWidth, page: document.documentElement.scrollWidth - window.innerWidth, over: over,
      text: st.innerText.length};`);
  await page.shot(SHOTS + '/' + label + '.png');
  // bấm một chỗ tra từ (nếu có) → bảng nghĩa
  let look = null;
  if (v.words) {
    await js('const w = document.querySelector("#kb-p-stage .kb-p-w"); w.scrollIntoView({block: "center"}); w.click(); return 1;'); await sleep(500);
    look = await js('const p = document.getElementById("kb-p-info"); return p && p.querySelector(".kb-p-iw") ? p.innerText.slice(0, 160) : "";');
    await js('document.body.click(); return 1;');
  }
  // trả lời đúng mọi câu hỏi
  for (let i = 0; i < want.right.length; i++) {
    await js(`const q = document.querySelectorAll("#kb-p-stage .kb-p-q")[${i}]; if (q) { q.scrollIntoView({block: "center"}); q.querySelectorAll(".kb-p-opt")[${want.right[i]}].click(); } return 1;`);
    await sleep(700);
  }
  const after = await py(KB + 'result = kb.STATE.load()["coins"]');
  const errs = await js('return (window.__kbErrors || []).length;').catch(() => 0);
  console.log('    đọc ' + label + ': ' + JSON.stringify(v) + (look !== null ? ' · tra: ' + JSON.stringify(look) : '') + ' · xu ' + want.coins + ' → ' + after);
  note({ label: 'đọc ' + label, ...v, look, coins: [want.coins, after], jsErrors: errs });
  return { v, look, gained: after - want.coins, nq: want.right.length };
}

async function storyMem() {
  return py(KB + 'result = [[e["ky"], e.get("ngay"), e.get("nguon", "")] for e in kb.story_core.load_story(kb.AI_DIR_SHARED)]');
}

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('KHÔNG TÌM THẤY TRANG VƯỜN'); process.exit(2); }
  const KD_SRC = path.join(__dirname, '..', '..', 'kotoba_daily');
  console.log('== 0. chuẩn bị: kotoba_daily (8 số Claude thật), khoá Gemini (proxy chèn khoá thật), không có số Gemini nào');
  await py(KB + `import tempfile
${process.env.KB_STREAM === '1' ? STREAM : ''}
kb._kb_calls = [0]
_kb_req0 = kb.ai.Gemini._request
def _count(self, *a, **k):
    kb._kb_calls[0] += 1
    return _kb_req0(self, *a, **k)
kb.ai.Gemini._request = _count
kd = os.path.join(tempfile.mkdtemp(prefix="kb_kd_real_"), "kotoba_daily")
shutil.copytree(${JSON.stringify(KD_SRC)}, kd, ignore=shutil.ignore_patterns("audio", "*.html", "__pycache__", "truyen_chung.json"))
kb._kb_kd = kd
for p in (kb.AI_DIR, kb.AI_DIR_EN, kb.AI_DIR_VI, kb.AI_DIR_SHARED):
    shutil.rmtree(p, ignore_errors=True)
kb._libraries.clear()
kb.save_config(bao_dir=kd, bao_source="auto", gemini_langs=["en"], gemini_auto=False, gemini_level="N4", gemini_level_en="A2",
               gemini_audio="tat", gemini_story="hay", gemini_story_tones=["am", "bi_an"],
               paper_confirmed={"ja": "claude", "en": "gemini", "vi": ""}, gemini_wait_start=False, gemini_wait_langs=[])
d = kb.STATE.load(); d["coins"] = 260; d["more"]["paper_sub"] = {}; kb.STATE.save(d)
result = 1`);
  // thử khoá như người dùng bấm "Thử khoá" (chọn model, danh sách model TTS)
  await py(KB + 'kb.ai_test_key(kb.config().get("gemini_key")); result = 1');
  for (let i = 0; i < 60 && await py(KB + 'result = bool(kb._ai["testing"])'); i++) await sleep(1000);
  const tk = await py(KB + 'st = kb.ai.load_status(kb.AI_DIR); result = [st.get("model"), (st.get("models") or [])[:4], st.get("tts"), st.get("error", "")]');
  console.log('    Thử khoá: ' + JSON.stringify(tk));
  ok(!!tk[0] && !tk[3], 'Thử khoá với Gemini thật: chọn model ' + tk[0]);

  console.log('== 1. 09/11 — Claude không viết hôm nay; báo tiếng Anh (Gemini) nối truyện của Claude');
  await setDay('2026-11-09');
  const e1 = await writeLang('en', 'ngay1_en');
  ok(e1 && e1.has, 'Gemini thật viết xong báo tiếng Anh 09/11');
  ok(e1 && e1.master && e1.master.ky === 9 && JSON.stringify(e1.ky) === '[9]', 'bản gốc kỳ 9 nối 8 kỳ của Claude, báo tiếng Anh kể kỳ 9: ' + JSON.stringify(e1 && [e1.master, e1.ky]));
  ok(e1 && e1.sub.in_trial && e1.coins === 260, 'gói báo: tặng 7 ngày, không trừ xu (' + JSON.stringify(e1 && [e1.sub.until, e1.coins]) + ')');
  const tc = await py(KB + 'p = os.path.join(kb._kb_kd, "truyen_chung.json"); result = [[r["ky"], r["ngay"]] for r in json.load(open(p, encoding="utf-8")).get("ky", [])] if os.path.exists(p) else None');
  ok(JSON.stringify(tc) === '[[9,"2026-11-09"]]', 'kotoba_daily/truyen_chung.json có kỳ 9 cho Claude: ' + JSON.stringify(tc));
  const pv = await py(KB + `import subprocess
r = subprocess.run([sys.executable, os.path.join(kb._kb_kd, "tools", "pham_vi.py")], capture_output=True, text=True, env=dict(os.environ, KB_TODAY="2026-11-10"))
t = json.load(open(os.path.join(kb._kb_kd, "pham_vi.json"), encoding="utf-8"))["truyen"]
result = [t.get("ky_tiep_theo"), [x["ky"] for x in t.get("ky_them", [])], r.returncode, [l for l in r.stdout.splitlines() if "TRUYỆN CHUNG" in l][:1]]`);
  ok(pv[0] === 10 && JSON.stringify(pv[1]) === '[9]' && pv[2] === 0, 'sáng 10/11 pham_vi.py của Claude: kỳ tiếp theo 10 (biết kỳ 9 của Gemini): ' + JSON.stringify(pv));
  if (e1 && e1.has) { const r1 = await readIssue('en', 'ngay1_en'); ok(r1.v.hscroll <= 0 && r1.v.page <= 0 && r1.v.words >= 10 && !!r1.look, 'đọc báo tiếng Anh: không tràn ngang, ' + r1.v.words + ' chỗ tra từ, bấm ra nghĩa: ' + JSON.stringify(r1.look)); ok(r1.gained >= 2 * r1.nq, 'trả lời đúng ' + r1.nq + ' câu: +' + r1.gained + ' xu'); }

  console.log('== 2. 10/11 — báo tiếng Nhật chuyển sang Gemini: Nhật N4 + Anh A2 cùng một kỳ');
  await setDay('2026-11-10');
  await py(KB + 'kb.save_config(bao_source="gemini", gemini_langs=["ja", "en"], paper_confirmed={"ja": "gemini", "en": "gemini", "vi": ""}); result = 1');
  const j2 = await writeLang('ja', 'ngay2_ja');
  const e2 = await writeLang('en', 'ngay2_en');
  ok(j2 && j2.has && e2 && e2.has, 'viết xong cả hai báo 10/11');
  ok(j2 && e2 && j2.master && j2.master.ky === 10 && JSON.stringify(j2.ky) === '[10]' && JSON.stringify(e2.ky) === '[10]', 'Nhật + Anh cùng kể kỳ 10: ' + JSON.stringify([j2 && j2.ky, e2 && e2.ky]));
  ok(e2 && e2.calls < j2.calls, 'báo thứ hai trong ngày không viết lại truyện (' + (j2 && j2.calls) + ' → ' + (e2 && e2.calls) + ' lượt gọi)');
  if (j2 && j2.has) { const r = await readIssue('ja', 'ngay2_ja'); ok(r.v.hscroll <= 0 && r.v.page <= 0 && r.v.ruby > 20 && r.v.words >= 10, 'đọc báo tiếng Nhật: furigana ' + r.v.ruby + ', tra từ ' + r.v.words + ', không tràn'); ok(r.gained >= 2 * r.nq, 'Nhật: trả lời đúng ' + r.nq + ' câu +' + r.gained + ' xu'); }
  if (e2 && e2.has) { await readIssue('en', 'ngay2_en'); }

  console.log('== 3. 11/11 — kỳ 11, có giọng đọc câu chép (Gemini TTS thật)');
  await setDay('2026-11-11');
  await py(KB + 'kb.save_config(gemini_audio="chinh_ta"); result = 1');
  const j3 = await writeLang('ja', 'ngay3_ja');
  const e3 = await writeLang('en', 'ngay3_en');
  ok(j3 && e3 && JSON.stringify(j3.ky) === '[11]' && JSON.stringify(e3.ky) === '[11]', 'kỳ 11 ở cả hai báo: ' + JSON.stringify([j3 && j3.ky, e3 && e3.ky]));
  const au = await py(KB + 'dd = os.path.join(kb.AI_DIR, "bao", kb.ai_today(), "audio"); result = [len(kb.ai.audio_todo(kb.AI_DIR, kb.ai_today(), "chinh_ta")), len([f for f in os.listdir(dd) if f.endswith(".wav")]) if os.path.isdir(dd) else 0]');
  ok(au[1] > 0, 'giọng đọc Gemini: ' + au[1] + ' file WAV, còn thiếu ' + au[0] + (j3 && j3.audio_error ? ' (' + j3.audio_error + ')' : ''));
  if (j3 && j3.has) { await readIssue('ja', 'ngay3_ja'); }
  if (e3 && e3.has) { await readIssue('en', 'ngay3_en'); }
  const mem3 = await storyMem();
  ok(JSON.stringify(mem3.slice(-3).map(x => x[0])) === '[9,10,11]', 'bộ nhớ truyện chung: ' + JSON.stringify(mem3.map(x => x[0] + (x[2] ? 'c' : ''))));

  console.log('== 4. 12/11 — chỉ tiếng Việt: in nguyên văn bản gốc kỳ 12');
  await setDay('2026-11-12');
  await py(KB + 'kb.save_config(gemini_langs=["vi"], gemini_audio="tat", paper_confirmed={"ja": "gemini", "en": "gemini", "vi": "gemini"}); result = 1');
  const v4 = await writeLang('vi', 'ngay4_vi');
  ok(v4 && v4.has && JSON.stringify(v4.ky) === '[12]' && v4.master && v4.master.ky === 12, 'báo tiếng Việt kỳ 12: ' + JSON.stringify(v4 && [v4.ky, v4.kinds]));
  const same = await py(KB + `d = kb.ai_today(); m = kb.story_core.load_master(kb.AI_DIR_SHARED, d)
iss = json.load(open(kb.ai.issue_path(kb.AI_DIR_VI, d), encoding="utf-8"))
tr = [b for b in iss["bai"] if b.get("loai") == "truyen"][0]
result = [kb.paper.surface(x) for x in tr["doan"]] == m["truyen"]["doan"]`);
  ok(same, 'truyện của báo tiếng Việt = nguyên văn bản gốc');
  if (v4 && v4.has) { const r = await readIssue('vi', 'ngay4_vi'); ok(r.v.hscroll <= 0 && r.v.page <= 0 && r.v.ruby === 0, 'đọc báo tiếng Việt: không furigana, không tràn'); ok(r.gained >= 2 * r.nq, 'Việt: trả lời đúng ' + r.nq + ' câu +' + r.gained + ' xu'); }

  console.log('== 5. 16/11 — gói thử hết hạn → Tự gia hạn −100 xu, báo tiếng Nhật kỳ 13');
  await setDay('2026-11-16');
  await py(KB + 'kb.save_config(gemini_langs=["ja"]); result = 1');
  const c0 = await py(KB + 'result = [kb.STATE.load()["coins"], kb.paper_sub_view()["active"]]');
  ok(c0[1] === false, 'gói thử 09/11 → 15/11 đã hết hạn ngày 16/11');
  const j5 = await writeLang('ja', 'ngay5_ja');
  ok(j5 && j5.has && JSON.stringify(j5.ky) === '[13]', 'kỳ 13 (ngày 13–15 không mở Anki: truyện vẫn nối): ' + JSON.stringify(j5 && j5.ky));
  ok(j5 && j5.coins === c0[0] - 100 && j5.sub.active && j5.sub.until === '2026-11-22', 'gia hạn 1 tuần −100 xu tới 22/11: ' + JSON.stringify(j5 && [c0[0], j5.coins, j5.sub.until]));

  const mem = await storyMem();
  console.log('    bộ nhớ truyện chung: ' + JSON.stringify(mem));
  const st = await py(KB + `out = []
for e in kb.story_core.load_story(kb.AI_DIR_SHARED)[-6:]:
    out.append({"ky": e["ky"], "ngay": e.get("ngay"), "nguon": e.get("nguon", ""), "tieu_de": e.get("tieu_de", ""), "tom_tat": e.get("tom_tat", ""),
                "nguyen_van": e.get("nguyen_van", [])})
result = out`);
  fs.writeFileSync(SHOTS + '/truyen.json', JSON.stringify(st, null, 1));
  fs.writeFileSync(SHOTS + '/ket_qua.json', JSON.stringify(REPORT, null, 1));
  const errs = await py(KB + 'result = [(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-20:]');
  console.log('    nhật ký lỗi (Báo lỗi): ' + JSON.stringify(errs));
  ok(!errs.length, 'nhật ký lỗi trống');
  console.log('\nKẾT QUẢ: ' + pass + '/' + total + ' · tổng lượt gọi: ' + (await py(KB + 'result = kb._kb_calls[0]')));
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(3); });
