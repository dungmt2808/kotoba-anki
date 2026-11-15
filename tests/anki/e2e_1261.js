// 1.26.1 trong Anki thật — hướng dẫn 3 bước cho người mới, chuyển cảnh chậm hơn, gói báo không trừ xu khi Gemini lỗi:
//   hồ sơ mới: màn chào trước → hết màn chào mới hiện bước 1 (khung quanh ô Deck), đổi deck → bước 2 (Tưới ngay), bấm Tưới
//   ngay → ẩn khi ôn, trả lời + đóng bảng ôn → bước 3 (chú giải giai đoạn cây, bong bóng phía trên), Xong → không hiện
//   lại khi mở vườn; Esc = Bỏ qua (không đóng cửa sổ); ⚙ → Hướng dẫn 3 bước mở lại; người đã có xu / lượt tưới không thấy;
//   lớp mờ không chặn bấm; cửa sổ 720 × 520 bong bóng nằm gọn;
//   chuyển cảnh: dải lá ◂ ▸ kéo dài ~600 ms, rèm Trong nhà ~760 ms; bong bóng linh vật / Combo dùng lại kiểu nảy kb-pop
//   (1.26.0 bị đè), bảng Nhà bật nhẹ bằng kb-panel-in;
//   gói báo: hết hạn + Tự gia hạn, Gemini (giả) lỗi hết model → không trừ xu, gói thử chưa bắt đầu; Gemini viết xong →
//   −100 xu; model 404 bỏ qua ở bước sau; không lỗi JS / nhật ký lỗi.
// Chạy: KB_SCRIPTS=e2e_1261.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1261';
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
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(100); }
  return false;
}
const KB = 'import sys, os, json, time, datetime, shutil\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const SKY8 = JSON.stringify(JSON.stringify({ mode: 'fixed', fixedHour: 8, dayMinutes: 24, weather: 'sunny' }));
async function reopen(before, clearLs) {
  if (page) {
    (page.errors || []).forEach((e) => errors.push(e));
    if (clearLs) { await js('try { ["kb-greet-day", "kb-tour-done", "kb-sky"].forEach((k) => localStorage.removeItem(k)); } catch (e) {} return 1;').catch(() => 0); }
    try { page.close(); } catch (e) { }
  }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(700);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data()', 8000);
}
// hồ sơ "mới": 0 xu, chưa tưới, chưa nhà; chào lại + hướng dẫn lại
const NEWBIE = `d = st.load(); d["coins"] = 0; d["waters"] = 0; d["harvests"] = 0; d["home"]["house"] = 0; d["home"]["owned"] = {}; st.save(d)
cfg = kb.config(); pr = dict(cfg.get("prefs") or {}); [pr.pop(k, None) for k in ("kb-greet-day", "kb-tour-done")]; pr["kb-sky"] = ${SKY8}; kb.save_config(prefs=pr)
mw.col.decks.select(1)`;
const tour = () => js('return GardenTour._state();');
const frameBox = () => js(`const f = document.getElementById("kb-tour-frame"), b = document.getElementById("kb-tour");
  if (!f || f.hidden || !b || b.hidden) return null; const r = f.getBoundingClientRect(), q = b.getBoundingClientRect();
  return {f: [r.left, r.top, r.right, r.bottom].map(Math.round), b: [q.left, q.top, q.right, q.bottom].map(Math.round), w: innerWidth, h: innerHeight};`);
const inside = (box, el) => js(`const e = ${el}; if (!e) return false; const r = e.getBoundingClientRect(); const f = ${JSON.stringify(box && box.f)};
  return f && r.left >= f[0] - 1 && r.top >= f[1] - 1 && r.right <= f[2] + 1 && r.bottom <= f[3] + 1;`);

(async () => {
  await py(KB + `kb.GREET_TEST_OFF = False
kb.TOUR_TEST_OFF = False
kb.save_config(show_tooltips=False, sound=False, music=False, ui={})
result = 1`);
  console.log('== 1. người mới: màn chào trước, rồi hướng dẫn bước 1');
  await reopen(NEWBIE, true);
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  ok(await py(KB + 'result = kb.event_core.is_new_player(st.load())'), 'Python: hồ sơ mới (0 xu, chưa tưới)');
  ok(await waitFor('GardenGreet.isGreeting()', 4000), 'màn chào hiện trước');
  ok((await tour()).step === -1, 'đang chào: chưa có hướng dẫn');
  await js('document.querySelector(".kb-greet").click(); return 1;').catch(() => 0);
  ok(await waitFor('GardenTour._state().shown', 6000), 'hết màn chào → hướng dẫn hiện');
  await sleep(400);
  const t1 = await tour(), b1 = await frameBox();
  ok(t1.step === 0 && /Chọn deck/.test(t1.text), 'bước 1/3: ' + t1.text);
  ok(b1 && await inside(b1, 'document.getElementById("kb-deck")'), 'khung vàng bao ô Deck: ' + JSON.stringify(b1 && b1.f));
  ok(b1 && b1.b[0] >= 0 && b1.b[2] <= b1.w && b1.b[3] <= b1.h, 'bong bóng nằm gọn trong cửa sổ');
  ok(await js('return getComputedStyle(document.getElementById("kb-tour-frame")).pointerEvents === "none";'), 'lớp mờ không chặn bấm');
  await page.shot(SHOTS + '/1261_01_buoc1.png');

  console.log('== 2. đổi deck → bước 2; Tưới ngay → ẩn khi ôn → bước 3');
  const did = await py(KB + 'result = [d.id for d in mw.col.decks.all_names_and_ids() if d.name == "A::Có câu ví dụ + audio"][0]');
  await js(`const s = document.getElementById("kb-deck"); s.value = "${did}"; s.dispatchEvent(new Event("change")); return 1;`);
  ok(await waitFor('GardenTour._state().step === 1 && GardenTour._state().shown', 6000), 'đổi deck → bước 2 tự hiện');
  const b2 = await frameBox();
  ok(b2 && await inside(b2, 'document.getElementById("kb-review")'), 'khung bao nút Tưới ngay');
  await page.shot(SHOTS + '/1261_02_buoc2.png');
  await js('document.getElementById("kb-review").click(); return 1;');
  ok(await waitFor('!document.getElementById("kb-panel").hidden', 6000), 'bấm thẳng Tưới ngay (lớp mờ không chặn) → bảng ôn mở');
  await sleep(600);
  ok(!(await tour()).shown, 'đang ôn: hướng dẫn ẩn');
  const c0 = await py(KB + 'result = st.load()["coins"]');
  await js('const b = document.getElementById("kb-show"); if (b && !b.hidden) b.click(); return 1;'); await sleep(1500);
  await js('const b = document.getElementById("kb-l3"); if (b) b.click(); return 1;'); await sleep(1800);
  const c1 = await py(KB + 'result = st.load()["coins"]');
  ok(c1 > c0, 'trả lời một thẻ: +' + (c1 - c0) + ' xu');
  await js('document.getElementById("kb-stop").click(); return 1;');
  ok(await waitFor('GardenTour._state().step === 2 && GardenTour._state().shown', 6000), 'đóng bảng ôn → bước 3');
  const b3 = await frameBox(), t3 = await tour();
  ok(/Hạt giống → Mầm → Cây non → Ra hoa → Ra quả/.test(t3.text) && b3 && await inside(b3, 'document.getElementById("kb-legend")'), 'bước 3: chú giải giai đoạn cây');
  ok(b3 && b3.b[3] <= b3.f[1] + 2, 'bong bóng bước 3 ở phía trên (không che cây vừa lớn)');
  ok(await js('return document.getElementById("kb-tour-next").textContent === "Xong" && document.getElementById("kb-tour-skip").hidden;'), 'bước cuối: nút Xong, không còn Bỏ qua');
  await page.shot(SHOTS + '/1261_03_buoc3.png');
  await js('document.getElementById("kb-tour-next").click(); return 1;'); await sleep(400);
  ok((await tour()).step === -1 && await py(KB + 'result = (kb.config().get("prefs") or {}).get("kb-tour-done")') === '1', 'Xong → nhớ kb-tour-done (config prefs, còn sau khi tắt Anki)');
  await reopen('');
  await sleep(2500);
  ok((await tour()).step === -1, 'mở lại vườn: không hiện nữa');

  console.log('== 3. Esc = Bỏ qua (không đóng cửa sổ), ⚙ mở lại');
  await js('document.getElementById("kb-sound").click(); return 1;'); await sleep(300);
  ok(await js('return !!document.getElementById("kb-tour-open") && !document.getElementById("kb-tour-open").hidden;'), '⚙ có nút Hướng dẫn 3 bước');
  await js('document.getElementById("kb-tour-open").click(); return 1;'); await sleep(500);
  ok((await tour()).step === 0 && (await tour()).shown && await js('return document.getElementById("kb-sound-pop").hidden;'), '⚙ → Hướng dẫn 3 bước: bước 1, bảng ⚙ đóng');
  await js('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true})); return 1;'); await sleep(500);
  ok((await tour()).step === -1 && await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())'), 'Esc: tắt hướng dẫn, cửa sổ vườn vẫn mở');
  await js('document.getElementById("kb-sound").click(); return 1;'); await sleep(300);
  await js('document.getElementById("kb-tour-open").click(); return 1;'); await sleep(400);
  await js('document.getElementById("kb-tour-skip").click(); return 1;'); await sleep(300);
  ok((await tour()).step === -1, 'Bỏ qua: tắt');

  console.log('== 4. người đang dùng (có xu / lượt tưới): không thấy hướng dẫn');
  await reopen(NEWBIE + '\nd = st.load(); d["coins"] = 120; d["waters"] = 40; st.save(d)', true);
  await sleep(1200);
  await js('const g = document.querySelector(".kb-greet"); if (g) g.click(); return 1;');
  await sleep(2500);
  ok((await tour()).step === -1 && !(await js('return Garden._data().tour;')), 'có 120 xu, 40 lượt tưới → data.tour = false, không hướng dẫn');

  console.log('== 5. cửa sổ nhỏ 720 × 520');
  await reopen(NEWBIE, true);
  await py(KB + 'kb._dialog.resize(720, 520); result = 1'); await sleep(800);
  await js('const g = document.querySelector(".kb-greet"); if (g) g.click(); return 1;');
  ok(await waitFor('GardenTour._state().shown', 6000), 'hướng dẫn hiện ở 720 × 520');
  for (let i = 0; i < 3; i++) {
    await sleep(500);
    const b = await frameBox();
    ok(b && b.b[0] >= 0 && b.b[1] >= 0 && b.b[2] <= b.w + 1 && b.b[3] <= b.h + 1, 'bước ' + (i + 1) + ': bong bóng gọn trong 720 × 520 ' + JSON.stringify(b && b.b));
    await page.shot(SHOTS + '/1261_05_nho_' + (i + 1) + '.png');
    await js('document.getElementById("kb-tour-next").click(); return 1;');
  }
  await py(KB + 'kb._dialog.resize(1366, 860); d = st.load(); d["coins"] = 5000; d["waters"] = 10; d["home"]["house"] = 7; st.save(d); result = 1');

  console.log('== 6. chuyển cảnh chậm hơn; kb-pop / kb-panel-in');
  await reopen('cfg = kb.config(); pr = dict(cfg.get("prefs") or {}); pr["kb-greet-day"] = str(int(mw.col.sched.today)); kb.save_config(prefs=pr, ui={})\nd = st.load(); d["coins"] = 9000; st.save(d)');
  await sleep(1500);
  const navOk = await js('return !document.getElementById("kb-yard-nav").hidden;');
  if (navOk) {
    await js(`window.__strip = []; const o = GardenGreet.strip; GardenGreet.strip = function (ctx, w, h, t, snap, kind) { window.__strip.push([performance.now(), kind, t]); return o.apply(this, arguments); };
      [...document.querySelectorAll("#kb-yard-nav button")].pop().click(); return 1;`);
    await sleep(1400);
    const sw = await js('const s = window.__strip; return s.length ? [s[0][1], Math.round(s[s.length - 1][0] - s[0][0]), s.length] : null;');
    ok(sw && sw[1] >= 380 && sw[1] <= 900, 'đổi cảnh ◂ ▸: hiệu ứng ' + (sw && sw[0]) + ' kéo dài ~' + (sw && sw[1]) + ' ms (1.26.0: ~350 ms)');
  } else { ok(false, 'không có nút ◂ ▸ để đổi cảnh'); }
  const fxs = await js(`if (typeof GardenFX !== "undefined" && GardenFX.say) { GardenFX.say("thử", 1500); }
    const b = document.getElementById("kb-say"); const cs = b ? getComputedStyle(b) : null;
    return cs ? [cs.animationName, cs.animationDuration] : null;`);
  ok(fxs && fxs[0] === 'kb-pop' && fxs[1] === '0.28s', 'bong bóng linh vật: kiểu nảy kb-pop 0,28 s như trước 1.26 (' + JSON.stringify(fxs) + ')');
  await js('GardenHome.open(); return 1;'); await sleep(60);
  const hp = await js('const e = document.getElementById("kb-home"); return [e.classList.contains("kb-panel-in"), getComputedStyle(e).animationName];');
  ok(hp[0] && hp[1] === 'kb-panel-in', 'mở bảng Nhà: bật nhẹ kb-panel-in (' + JSON.stringify(hp) + ')');
  await sleep(600);
  ok(!(await js('return document.getElementById("kb-home").classList.contains("kb-panel-in");')), 'hết hiệu ứng thì gỡ lớp');
  await js('GardenHome.close(); return 1;'); await sleep(300);

  console.log('== 7. gói báo: Gemini lỗi → không trừ xu; viết xong → −100 xu');
  const subRes = await py(KB + `import tempfile
kb.save_config(bao_source="gemini", gemini_key="AQ.Ab8RN6thu-khoa-gia-1261-0000000000", gemini_langs=["ja"], gemini_auto=False,
               gemini_audio="tat", paper_confirmed={"ja": "gemini", "en": "", "vi": ""}, gemini_wait_start=False, gemini_wait_langs=[])
today = kb.ai_today()
yday = (datetime.date.fromisoformat(today) - datetime.timedelta(days=1)).isoformat()
d = st.load(); d["coins"] = 250; d["more"]["paper_sub"] = {"until": yday, "plan": "tuan", "auto": True, "trial": "2026-10-01"}; st.save(d)
shutil.rmtree(os.path.join(kb.AI_DIR, "bao", today), ignore_errors=True)
st_ = kb.ai.load_status(kb.ai.ensure_dir(kb.AI_DIR)); st_.update(day=today, tries=0, last_try=0); kb.ai.save_status(kb.AI_DIR, st_)
kb._kb_calls = []
def _fail(self, model, *a, **k):
    kb._kb_calls.append(model)
    raise kb.ai.AIError("Hết hạn mức miễn phí của Gemini (%s), thử lại ngày mai." % model, "quota", daily=True)
kb.ai.Gemini.generate = _fail
kb.ai.Gemini.models = lambda self: [{"name": "models/gemini-3.6-flash", "supportedGenerationMethods": ["generateContent"]},
                                     {"name": "models/gemini-flash-lite-latest", "supportedGenerationMethods": ["generateContent"]}]
result = kb.ai_start("manual", kb._dialog, "ja")`);
  ok(subRes === true, 'gói hết hạn + Tự gia hạn + đủ xu → vẫn cho Gemini viết');
  const t0 = Date.now(); while (Date.now() - t0 < 30000 && await py(KB + 'result = bool(kb._ai["running"])')) await sleep(400);
  const f1 = await py(KB + 'result = [st.load()["coins"], st.load()["more"]["paper_sub"]["until"], kb.ai.has_issue(kb.AI_DIR, kb.ai_today()), kb.ai.load_status(kb.AI_DIR).get("error", "")]');
  ok(f1[0] === 250 && f1[2] === false, 'Gemini lỗi (hết hạn mức mọi model) → không có báo, KHÔNG trừ xu (' + JSON.stringify(f1) + ')');
  ok(/hạn mức/.test(f1[3]), 'tab Nguồn báo ghi lỗi: ' + f1[3]);
  // Gemini viết được → gia hạn −100 xu (Gemini giả trả lời đúng khuôn như e2e_1258; model đầu tiên 404)
  const okRes = await py(KB + `SC = kb.story_core
S = ("Sáng hôm ấy, Lin mang túi hạt giống xuống vườn Kotoba. StackChan chạy theo sau, tay ôm cuốn sổ vẽ, miệng hỏi liên tục "
     "rằng hạt này sẽ mọc thành cây gì. Chị Hana đứng ở hiên quán, nhìn hai người rồi mỉm cười. Ông trưởng làng nói hồi nhỏ ông từng "
     "gieo hạt ở chỗ quán cũ trên núi, và ông vẫn nhớ mùi đất sau cơn mưa đầu đông năm đó.")
P = ("Sáng nay cả làng Kotoba tụ tập bên giếng cũ để nghe chị Hana kể chuyện. Lin cầm cuốn sổ nhỏ ghi chép không ngừng, còn "
     "StackChan thì vẽ lại mọi thứ bằng những ô vuông màu. Ông trưởng làng bảo rằng ngày mai sẽ có hội chợ mùa đông.")
def _good(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
    kb._kb_calls.append(model)
    if model == "gemini-3.6-flash":
        raise kb.ai.explain_http(404, b"{}", model)
    if schema is SC.ARC_SCHEMA:
        return json.dumps({"ten": "Hạt giống đầu đông", "muc_tieu": "gieo hạt", "bi_an": "cây gì", "nhan_vat_phu": "bác đưa thư",
                           "buoc": ["b1", "b2", "b3", "b4", "b5", "b6"], "ket": "cây nảy mầm"}, ensure_ascii=False)
    if schema is SC.MASTER_SCHEMA:
        return json.dumps({"dan_y": {"muon": "a", "tro_ngai": "b", "bat_ngo": "c", "moc_cau": "d"}, "tieu_de": "Hạt giống đầu đông",
                           "doan": [S, S, S], "nho": {"tom_tat": "Lin gieo túi hạt.", "bo_ngo": ["cây gì"]},
                           "tin": [{"tieu_de": "Gió lạnh", "noi_dung": "Sáng nay gió lạnh thổi qua làng, nhà nào cũng phơi chăn."},
                                   {"tieu_de": "Vé số", "noi_dung": "Trưởng làng vẫn chưa dám mở tấm vé số mua tuần trước."}],
                           "muc3": {"tieu_de": "Góc của StackChan", "doan": ["Tớ vẽ được ba quả bí ngô hôm nay."]}}, ensure_ascii=False)
    if schema is SC.EDIT_SCHEMA:
        return json.dumps({"diem": {k: 5 for k in SC.CRIT}, "loi": [], "goi_y": []}, ensure_ascii=False)
    q = [{"hoi": "Cả làng tụ tập ở đâu?", "chon": ["Bên giếng cũ", "Ở chợ", "Trên núi"], "dung": 0, "giai_thich": "Tin làng kể mọi người tụ tập bên giếng cũ."},
         {"hoi": "Ai ghi chép vào sổ nhỏ?", "chon": ["StackChan", "Lin", "Ông trưởng làng"], "dung": 1, "giai_thich": "Lin cầm cuốn sổ nhỏ ghi chép."}]
    iss = {"bai": [{"loai": "tin_lang", "tieu_de": "Hội chợ mùa đông", "doan": [P, P, P]},
                   {"loai": "cot", "tieu_de": "Góc của StackChan", "doan": ["Tớ vẽ được ba quả bí ngô hôm nay. " + P]}],
           "cau_hoi": q, "chinh_ta": [], "mau_cau": [], "tu_moi": [], "tom_tat": "Làng chuẩn bị hội chợ.", "tom_tat_truyen": "Lin gieo hạt."}
    if "van_de" in json.dumps(schema or {}):
        return json.dumps({"van_de": [], "bao": iss}, ensure_ascii=False)
    return json.dumps(iss, ensure_ascii=False)
kb.ai.Gemini.generate = _good
shutil.rmtree(kb.AI_DIR_SHARED, ignore_errors=True)
for b in (kb.AI_DIR, kb.AI_DIR_VI):
    st_ = kb.ai.load_status(kb.ai.ensure_dir(b)); st_.update(tries=0, last_try=0, model="gemini-3.6-flash"); kb.ai.save_status(b, st_)
kb._kb_calls = []
kb.save_config(gemini_langs=["vi"], paper_confirmed={"ja": "gemini", "en": "", "vi": "gemini"})
result = kb.ai_start("manual", kb._dialog, "vi")`);
  ok(okRes === true, 'thử lại');
  const t1b = Date.now(); while (Date.now() - t1b < 60000 && await py(KB + 'result = bool(kb._ai["running"])')) await sleep(400);
  const f2 = await py(KB + 'result = [st.load()["coins"], st.load()["more"]["paper_sub"]["until"], kb.ai.has_issue(kb.AI_DIR_VI, kb.ai_today()), kb._kb_calls, kb.ai.load_status(kb.AI_DIR_VI).get("error", ""), [x for x in kb.ai.log_summary(kb.ai.last_log(kb.AI_DIR_VI, kb.ai_today())) if "Config" in x]]');
  const until = await py(KB + 'result = (datetime.date.fromisoformat(kb.ai_today()) + datetime.timedelta(days=6)).isoformat()');
  ok(f2[2] === true && f2[0] === 150 && f2[1] === until, 'Gemini viết xong → gia hạn 1 tuần −100 xu (' + JSON.stringify(f2.slice(0, 3)) + ', lỗi: ' + f2[4] + ')');
  ok(f2[3].filter((m) => m === 'gemini-3.6-flash').length === 1, 'model 404 chỉ thử một lần trong cả số báo: ' + JSON.stringify(f2[3]));
  ok(f2[5].length === 0, 'nhật ký không bảo "Xoá gemini_model trong Config" (người dùng không đặt model)');

  (page.errors || []).forEach((e) => errors.push(e));
  ok(errors.length === 0, 'không có lỗi JS: ' + JSON.stringify(errors.slice(0, 3)));
  const elog = await py(KB + 'result = [(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-8:]');
  ok(elog.length === 0, 'nhật ký lỗi trống: ' + JSON.stringify(elog));
  console.log('\nKẾT QUẢ: ' + pass + '/' + total);
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(3); });
