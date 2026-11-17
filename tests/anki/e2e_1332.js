// 1.33.2 — đang viết báo mà người dùng đổi lựa chọn (người dùng: "đang viết báo thì không được chọn đổi ngôn ngữ báo. viết
// xong rồi thì được chọn, nhưng số đó để ngày mai"). Gemini giả, mỗi lượt gọi chậm 2 giây (không gọi mạng).
//   A. hôm nay chưa viết số nào: tick thêm báo → vẫn chờ "Bắt đầu viết" (như 1.22.4)
//   B. "Bắt đầu viết" (Trung + Hàn): trong lúc viết báo Trung — ô Báo muốn nhận / Trình độ / Lấy từ / Đổi khoá / Xoá khoá /
//      Giọng đọc / Truyện / Chủ đề khoá + dòng "Gemini đang viết báo — xong mới đổi được."; báo Hàn ghi "viết sau báo đang
//      viết"; Tự viết + giọng câu chép vẫn đổi được; gửi thẳng lệnh (bỏ qua giao diện) cũng bị Python từ chối, cấu hình / khoá
//      không đổi; "Tạo giọng đọc" khi bận nói đúng lý do; mua gói báo vẫn được
//   C. viết xong: mở khoá; bỏ tick Hàn, tick Anh → báo Anh "bắt đầu từ mai" (không nút Viết, bấm Viết bằng lệnh → từ chối,
//      không gọi Gemini), không chờ "Bắt đầu viết"; tick lại báo đã có số hôm nay → hiện số đó ngay (không "từ mai")
//   D. sang ngày mai: báo Anh tự viết như mọi báo (không còn "từ mai", không chờ "Bắt đầu viết")
// Chạy: KB_SCRIPTS=e2e_1332.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1332';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const FIXP = path.resolve(__dirname, '..', 'fixtures', 'bao_133.json');
const MODP = path.resolve(__dirname, '..', 'fixtures', 'gemini_models_20261116.json');
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
let page, pass = 0, total = 0;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function waitFor(expr, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
async function waitPy(code, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await py(KB + code); if (v) return v; } catch (e) { } await sleep(300); }
  return false;
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
const cfg = (k) => py(KB + `result = kb.config().get(${JSON.stringify(k)})`);
async function openSrc() {
  await js('GardenPaper.close(); GardenPaper.open("src"); return 1;');
  await waitFor('return !!document.querySelector(".kb-ai-want");', 8000);
  await sleep(500);
}
const tick = (label) => js(`const l = [...document.querySelectorAll(".kb-ai-want .kb-ai-tick")].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); const i = l.querySelector("input"); if (i.disabled) return "disabled"; i.click(); return "ok";`);
const todayRow = (paper) => js(`const b = [...document.querySelectorAll(".kb-ai-lang")].find((x) => x.querySelector(".kb-ai-lang-h b").textContent === ${JSON.stringify(paper)}); if (!b) return null;
  const r = [...b.querySelectorAll(".kb-ai-row")].find((x) => (x.querySelector(".kb-ai-k") || {}).textContent === "Hôm nay"); return r ? { t: r.querySelector(".kb-ai-v").textContent, btn: [...r.querySelectorAll("button")].map((x) => [x.textContent, x.disabled]) } : null;`);
const flash = () => js('const f = document.querySelector(".kb-ai-flash"); return f ? f.textContent : "";');

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await py(KB + 'kb._dialog.showNormal(); kb._dialog.resize(1100, 860); result = 1'); await sleep(800);
  // Gemini giả (đường đi thật của add-on, không gọi mạng), mỗi lượt gọi chậm 2 giây
  await py(KB + `S = kb.story_core; A = kb.ai
FIX = json.load(open(${JSON.stringify(FIXP)}, encoding="utf-8"))
MODELS = json.load(open(${JSON.stringify(MODP)}, encoding="utf-8"))["models"]
kb._e2e_calls = []
def fake_models(self):
    return MODELS
def fake_generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None, **k):
    self.calls += 1
    time.sleep(3)
    lg = kb._ai.get("lang"); f = FIX.get(lg) or FIX["zh"]
    if schema is S.RETELL_SCHEMA:
        kb._e2e_calls.append((lg, "ke_lai")); out = dict(f["story"]); out["nho"] = {"tom_tat": "x"}; return json.dumps(out, ensure_ascii=False)
    if schema is A.REVIEW_SCHEMA:
        kb._e2e_calls.append((lg, "soat")); return json.dumps({"van_de": [], "bao": f["issue"]}, ensure_ascii=False)
    kb._e2e_calls.append((lg, "viet")); return json.dumps(f["issue"], ensure_ascii=False)
def no_net(self, *a, **k):
    kb._e2e_calls.append(("?", "mang")); raise A.AIError("test: không gọi mạng", kind="net")
A.Gemini.models = fake_models; A.Gemini.generate = fake_generate; A.Gemini._request = no_net; A.Gemini.speak = no_net
date = kb.ai_today()
A.ensure_dir(kb.AI_DIR_SHARED)
S.save_master(kb.AI_DIR_SHARED, date, {"ngay": date, "ky": 2, "thoi_tiet": "nắng", "tin": [{"tieu_de": "Lá đỏ", "noi_dung": "Lá đỏ."}],
  "truyen": {"tieu_de": "Lời kể", "ky_truoc": "x", "doan": ["Đoạn 1.", "Đoạn 2.", "Đoạn 3."], "nho": {"tom_tat": "x"}, "lang": "vi"}})
d = st.load(); d["coins"] = 1000; st.save(d)
c = dict(mw.addonManager.getConfig(kb.__name__))
c.update(gemini_langs=["zh"], gemini_langs_chosen=True, gemini_wait_start=False, gemini_wait_langs=[], gemini_audio="tat", gemini_auto=False,
         paper_confirmed={"ja": "", "en": "", "zh": "gemini", "ko": "", "vi": ""}, dict_voice="auto")
c.pop("gemini_later", None)
mw.addonManager.writeConfig(kb.__name__, c)
result = date`);

  console.log('== A. Hôm nay chưa viết số nào: tick thêm báo → chờ "Bắt đầu viết" (như cũ)');
  await openSrc();
  ok(await tick('Tiếng Hàn') === 'ok', 'tick Tiếng Hàn'); await sleep(900);
  ok(JSON.stringify(await cfg('gemini_wait_langs')) === '["ko"]' && !(await py(KB + 'result = kb.ai_later()')).ko, 'báo Hàn chờ "Bắt đầu viết" (không phải "từ mai")');
  ok(await waitFor('return !!document.querySelector(".kb-ai-startbtn");'), 'có nút Bắt đầu viết');

  console.log('== B. Đang viết: khoá các lựa chọn của báo');
  await py(KB + 'kb._e2e_calls.clear(); result = 1');
  await openSrc();
  await js('document.querySelector(".kb-ai-startbtn").click(); return 1;');
  ok(await waitPy('result = kb._ai["running"] and kb._ai["lang"] == "zh"', 8000), 'đang viết báo Trung (báo Hàn xếp sau)');
  await openSrc();
  await js('document.querySelectorAll("details.kb-ai-opts-box").forEach((d) => { d.open = true; }); return 1;'); await sleep(300);
  const ui = await js(`const q = (s) => [...document.querySelectorAll(s)];
    const more = document.querySelector("details.kb-ai-opts-box");
    const byLabel = (lab) => q("select.kb-ai-sel").filter((x) => x.getAttribute("aria-label") === lab);
    return { ticks: q(".kb-ai-want .kb-ai-tick input").map((i) => i.disabled), hint: (document.querySelector(".kb-ai-busyhint") || {}).textContent || "",
      lv: q(".kb-ai-lang select.kb-ai-sel").map((s) => s.disabled), doiKhoa: q("button").filter((b) => b.textContent === "Đổi khoá").map((b) => b.disabled),
      xoa: (document.querySelector(".kb-ai-forget") || {}).disabled, giong: byLabel("Giọng đọc của báo").map((s) => s.disabled),
      truyen: byLabel("Truyện dài kỳ").map((s) => s.disabled), tones: q(".kb-ai-tones .kb-ai-chip").every((b) => b.disabled),
      tuViet: (more.querySelector(".kb-ai-auto input") || {}).disabled, dict: byLabel("Giọng cho câu không có audio").map((s) => s.disabled),
      start: (document.querySelector(".kb-ai-startbtn") || {}).disabled };`);
  ok(ui.ticks.length === 7 && ui.ticks.every(Boolean) && /Gemini đang viết báo — xong mới đổi được/.test(ui.hint), 'Báo muốn nhận: 7 ô (1.35: + Đức / Pháp) đều khoá + dòng "Gemini đang viết báo — xong mới đổi được."');
  ok(ui.lv.length === 4 && ui.lv.every(Boolean), 'Trình độ + Lấy từ của hai báo khoá');
  ok(ui.doiKhoa.length === 1 && ui.doiKhoa[0] && ui.xoa === true, 'Đổi khoá + Xoá khoá khoá');
  ok(ui.truyen[0] === true && ui.tones, 'Truyện + Chủ đề truyện khoá');
  ok(ui.tuViet === false && ui.dict[0] === false, 'Tự viết khi mở Anki + giọng cho câu chép vẫn đổi được (không ảnh hưởng số đang viết)');
  const ko = await todayRow('Báo tiếng Hàn');
  ok(ko && /viết sau báo đang viết/.test(ko.t), 'báo Hàn: "viết sau báo đang viết" ' + JSON.stringify(ko));
  await page.shot(SHOTS + '/1332_dang_viet.png');
  // người dùng bấm vào ô bị khoá
  ok(await tick('Tiếng Trung') === 'disabled', 'bấm ô Tiếng Trung (đang viết) → không bỏ tick được');
  // gửi thẳng lệnh, bỏ qua giao diện → Python từ chối
  const key0 = await cfg('gemini_key');
  const r = await py(KB + `d = kb._dialog
before = {k: kb.config().get(k) for k in ("gemini_langs", "gemini_level_zh", "gemini_story", "bao_source", "gemini_key")}
src0 = kb.words.load_src(mw.col)
for cmd in ['set:' + json.dumps({"langs": ["ko"]}), 'set:' + json.dumps({"level": "HSK4"}), 'set:' + json.dumps({"story": "tat"}),
            'set:' + json.dumps({"source": "claude"}), 'decks:' + json.dumps({"lang": "zh", "decks": [], "mode": "level"}),
            'forget', 'key:' + json.dumps({"key": "AIzaSyD3m0K3yF0rT3st1ngOnly-abcdefghiXX"}), 'start']:
    d._on_ai(cmd)
after = {k: kb.config().get(k) for k in before}
result = {"same": before == after, "src_same": src0 == kb.words.load_src(mw.col), "running": kb._ai["running"], "queue": kb._ai.get("queue")}`);
  ok(r.same && r.src_same, 'gửi thẳng lệnh đổi báo / trình độ / truyện / nguồn / deck / xoá khoá / đổi khoá → cấu hình + khoá không đổi');
  ok(r.running && JSON.stringify(r.queue) === '["ko"]', '"Bắt đầu viết" lần nữa không thay hàng chờ đang chạy');
  ok(/Gemini đang viết báo — xong mới đổi được/.test(await waitFor('const f = document.querySelector(".kb-ai-flash"); return f ? f.textContent : "";', 4000) || ''), 'trang báo "Gemini đang viết báo — xong mới đổi được."');
  // bắt đúng câu Python gửi cho trang (không phụ thuộc lúc trang vẽ lại)
  const au = await py(KB + `d = kb._dialog
busy = kb.ai_busy()
got = []
real = d._js
def spy(name, *a):
    got.append([name, a[0].get("flash") if a and isinstance(a[0], dict) else None])
    return real(name, *a)
d._js = spy
try:
    d._on_ai("audio:" + json.dumps({"lang": "zh"}))
finally:
    d._js = real
result = {"busy": busy, "flash": [g[1] for g in got if g[0] == "aiStatus"]}`);
  ok(au.busy && /Gemini đang viết báo/.test(au.flash.join(' ')), '"Tạo giọng đọc" khi đang bận: nói đúng lý do (trước: "Không còn giọng đọc nào cần tạo.") ' + JSON.stringify(au));
  // vẫn làm được: Tự viết, giọng câu chép, mua gói
  const ok2 = await py(KB + `d = kb._dialog
d._on_ai('set:' + json.dumps({"auto": True})); a1 = kb.config().get("gemini_auto")
d._on_ai('set:' + json.dumps({"dict_voice": "may"})); a2 = kb.config().get("dict_voice")
c0 = st.load()["coins"]; d._on_ai('sub:' + json.dumps({"buy": "tuan"})); c1 = st.load()["coins"]
d._on_ai('set:' + json.dumps({"auto": False, "dict_voice": "auto"}))
result = [a1, a2, c0 - c1]`);
  ok(ok2[0] === true && ok2[1] === 'may' && ok2[2] === 100, 'trong lúc viết vẫn đổi được Tự viết, giọng câu chép, mua gói báo (−100 xu) ' + JSON.stringify(ok2));
  ok(await key0 === await cfg('gemini_key'), 'khoá Gemini còn nguyên');

  console.log('== C. Viết xong: mở khoá; báo mới thêm → từ mai');
  ok(await waitPy('result = kb.ai.has_issue(kb.AI_DIR_ZH, kb.ai_today()) and kb.ai.has_issue(kb.AI_DIR_KO, kb.ai_today()) and not kb.ai_busy()', 60000), 'viết xong cả báo Trung + Hàn');
  const calls = await py(KB + 'result = kb._e2e_calls');
  ok(calls.filter((c) => c[0] === 'zh').length === 3 && calls.filter((c) => c[0] === 'ko').length === 3 && !calls.some((c) => c[1] === 'mang'), 'mỗi báo đúng 3 lượt gọi (không lượt thừa vì đổi giữa chừng)');
  await openSrc();
  const ui2 = await js('return { ticks: [...document.querySelectorAll(".kb-ai-want .kb-ai-tick input")].filter((i) => i.disabled).length, hint: !!document.querySelector(".kb-ai-busyhint") };');
  ok(ui2.ticks === 2 && !ui2.hint, 'mở khoá: chỉ còn 2 ô mờ (Nhật, Anh) vì đã đủ 2 báo, không còn dòng "đang viết"');
  ok(await tick('Tiếng Hàn') === 'ok', 'bỏ tick Tiếng Hàn'); await sleep(900);
  ok(await tick('Tiếng Anh') === 'ok', 'tick Tiếng Anh'); await sleep(1200);
  const later = await py(KB + 'result = [kb.ai_later(), kb.config().get("gemini_wait_langs"), kb.ai_waiting(), kb.config().get("paper_confirmed", {}).get("en")]');
  const tomorrow = await py(KB + 'result = (datetime.date.fromisoformat(kb.ai_today()) + datetime.timedelta(days=1)).isoformat()');
  ok(later[0].en === tomorrow && !(later[1] || []).includes('en') && !later[2].includes('en') && later[3] === 'gemini',
    'báo Anh: từ mai (' + later[0].en + '), không chờ "Bắt đầu viết" ' + JSON.stringify(later));
  await openSrc();
  const en = await todayRow('Báo tiếng Anh');
  ok(en && /bắt đầu từ mai/.test(en.t) && en.btn.length === 0, 'tab Nguồn báo: báo Anh "Hôm nay: bắt đầu từ mai", không nút Viết ' + JSON.stringify(en));
  ok(!(await js('return !!document.querySelector(".kb-ai-startbtn");')), 'không hiện khối "Bắt đầu viết"');
  await page.shot(SHOTS + '/1332_tu_mai.png');
  const n0 = (await py(KB + 'result = len(kb._e2e_calls)'));
  await py(KB + 'kb._dialog._on_ai("write:" + json.dumps({"lang": "en"})); kb.ai_start_all("auto"); result = 1'); await sleep(1500);
  ok(!(await py(KB + 'result = kb._ai["running"]')) && (await py(KB + 'result = len(kb._e2e_calls)')) === n0 && /bắt đầu từ mai/.test(await flash()),
    'bấm Viết (gửi thẳng lệnh) / tự viết → không viết báo Anh hôm nay, không gọi Gemini: "' + await flash() + '"');
  // tick lại báo đã có số hôm nay → hiện số đó (không "từ mai")
  ok(await tick('Tiếng Anh') === 'ok', 'bỏ tick Tiếng Anh'); await sleep(900);
  ok(!(await py(KB + 'result = kb.ai_later()')).en, 'bỏ tick → không còn "từ mai"');
  ok(await tick('Tiếng Hàn') === 'ok', 'tick lại Tiếng Hàn (đã có số hôm nay)'); await sleep(1200);
  await openSrc();
  const ko2 = await todayRow('Báo tiếng Hàn');
  ok(ko2 && /✓ Số 1/.test(ko2.t) && !(await py(KB + 'result = kb.ai_later()')).ko, 'báo Hàn hiện "✓ Số 1" ngay (không "từ mai") ' + JSON.stringify(ko2));

  console.log('== D. Sang ngày mai: báo Anh viết như mọi báo');
  await tick('Tiếng Hàn'); await sleep(900); await tick('Tiếng Anh'); await sleep(1200);
  ok((await py(KB + 'result = kb.ai_later()')).en === tomorrow, 'đổi lại: báo Anh từ mai');
  const d = await py(KB + `real = kb.ai_today
kb.ai_today = lambda: ${JSON.stringify(tomorrow)}
try:
    result = {"later": kb.ai_later(), "waiting": kb.ai_waiting()}
finally:
    kb.ai_today = real`);
  ok(!d.later.en && !d.waiting.includes('en'), 'ngày mai: báo Anh không còn "từ mai", không chờ "Bắt đầu viết" → tự viết như báo Trung ' + JSON.stringify(d));

  console.log('== E. Anki đang đồng bộ: bấm trong vườn → báo một câu, bảng ôn không kẹt');
  await js('GardenPaper.close(); return 1;'); await sleep(300);
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); d._dispatch("rv:start"); result = 1');
  await waitFor('const b = document.getElementById("kb-show"); return b && !b.hidden;', 5000);
  await js('document.getElementById("kb-show").click(); return 1;');          // lật thẻ trước khi đồng bộ
  await waitFor('const b = document.querySelector(".kb-rate-3"); return b && b.offsetParent !== null;', 5000);
  await sleep(500);
  const rev0 = await py(KB + 'result = mw.col.db.scalar("select count() from revlog")');
  await py(KB + 'kb._e2e_busy = mw.progress.busy; kb._sync_running = True; mw.progress.busy = lambda: True; result = kb._sync_hold()');
  await js('document.querySelector(".kb-rate-3").click(); return 1;'); await sleep(800);
  // thông báo xếp hàng sau thông báo đang hiện (vd. gợi ý cấu hình trường) → chờ tới lượt
  const t1 = await waitFor('const t = document.getElementById("kb-toast"); return t && !t.hidden && /đồng bộ/.test(t.textContent) ? t.textContent : "";', 15000);
  ok(/Anki đang đồng bộ — xong rồi bấm lại/.test(t1), 'chấm thẻ lúc đồng bộ → "' + t1 + '"');
  ok(await py(KB + 'result = mw.col.db.scalar("select count() from revlog")') === rev0, 'không ghi lượt ôn nào lúc đồng bộ');
  await py(KB + 'mw.progress.busy = kb._e2e_busy; kb._sync_running = False; result = 1');
  await sleep(300);
  await js('document.querySelector(".kb-rate-3").click(); return 1;');
  ok(await waitPy(`result = mw.col.db.scalar("select count() from revlog") == ${rev0} + 1`, 8000), 'đồng bộ xong: bấm Được lần nữa là chấm được (bảng ôn không kẹt chờ)');
  await py(KB + 'kb._dialog._dispatch("rv:stop"); result = 1');

  const errs = await py(KB + 'result = [e["where"] + ": " + e["msg"][:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`KẾT QUẢ: ${pass}/${total}` + (pass === total ? ' — TẤT CẢ OK' : ''));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); console.log(`KẾT QUẢ: ${pass}/${total}`); process.exit(1); });
