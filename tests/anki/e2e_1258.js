// 1.25.8 — hai lỗi người dùng báo 11/11, trong Anki thật:
//   1. trò "Điền vào câu": xong một câu, bấm "Câu tiếp" thì câu cũ vẫn đọc tiếp ở câu mới
//      (+ bấm Câu tiếp trong 350 ms sau khi trả lời thì đọc luôn câu MỚI — lộ đáp án); cùng kiểu ở Nghe tìm cây, Chợ sáng
//   2. xong nhiệm vụ thứ ba (trong trò chơi) thì huy hiệu "Xong 3 nhiệm vụ" + đèn trời không hiện, phải đổi deck mới hiện
// Chạy: KB_SCRIPTS=e2e_1258.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1258';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenGames !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = 'import sys, os, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const log = () => py('result = [x["tag"] for x in LOG]');
const clearLog = () => py('LOG.clear()\nresult = 1');
const key = (k) => js(`document.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(k)}, bubbles: true })); return 1;`);
const dbg = () => js('return GardenGames._debug();');
// tên file audio câu ví dụ của từ đang hỏi (deck A: kbtest_ex_<i>.wav theo thứ tự WORDS của make_col)
const WORDS = ['学生', '先生', '食べる', 'りんご', '天気', '図書館', 'コーヒー', '勉強する'];
const exFile = (w) => 'kbtest_ex_' + WORDS.indexOf(w) + '.wav';
// đèn trời vẽ trên trời sân: đếm điểm ảnh cam của đèn (#ff9f1c / #ffb347) ở nửa trên khung cảnh sân
const lampPx = () => js(`const cv = document.getElementById("kb-yard"); if (!cv) { return -1; }
  const c = cv.getContext("2d"), w = cv.width, h = Math.floor(cv.height * 0.45), px = c.getImageData(0, 0, w, h).data;
  let n = 0; for (let i = 0; i < px.length; i += 4) { if ((px[i] === 255 && px[i + 1] === 159 && px[i + 2] === 28) || (px[i] === 255 && px[i + 1] === 179 && px[i + 2] === 71)) { n++; } } return n;`);

(async () => {
  await py(KB + `kb.save_config(show_tooltips=False, sound=False, music=False)
d = st.load(); d["coins"] = 500; st.save(d)
kb.open_garden(); result = 1`);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 860)\nd = kb._dialog\nd.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio")\nd.refresh()\nresult = d.deck_id'); await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');

  console.log('== 1. Điền vào câu: sang câu mới thì tắt câu cũ');
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js('document.querySelector(\'.kb-gcard[data-game="cloze"]\').click(); return 1;');
  ok(await waitFor('GardenGames._debug().word && GardenGames._debug().locked === false'), 'Điền vào câu chạy (deck có câu ví dụ + audio)');
  let g = await dbg();
  await clearLog();
  await key(String(g.answer + 1)); await sleep(900);
  let tags = await log();
  ok(tags.some(t => t.includes(exFile(g.word))), 'trả lời xong → đọc câu ví dụ của "' + g.word + '": ' + tags.join(' | ').slice(0, 120));
  await clearLog();
  await js('document.querySelector("#kb-g-stage .kb-next").click(); return 1;'); await sleep(500);
  tags = await log();
  const g2 = await dbg();
  ok(g2.round === g.round + 1 && tags[0] === 'STOP', 'bấm "Câu tiếp" → tắt câu đang đọc trước khi sang câu ' + g2.round + ': ' + JSON.stringify(tags));
  ok(!tags.some(t => t.includes('kbtest_ex_')), 'câu mới chưa đọc gì (không lộ đáp án)');
  await page.shot(SHOTS + '/1258_01_dien_cau_cau_tiep.png');
  // trả lời rồi bấm Câu tiếp ngay (trong 350 ms): câu mới không được đọc
  await waitFor('GardenGames._debug().locked === false');
  g = await dbg();
  await clearLog();
  await key(String(g.answer + 1)); await sleep(60);
  await key('Enter'); await sleep(900);
  tags = await log();
  const g3 = await dbg();
  ok(g3.round === g.round + 1 && !tags.some(t => t.includes('kbtest_ex_')),
    'bấm Câu tiếp ngay sau khi trả lời → không đọc câu nào (trước đây đọc luôn câu mới "' + g3.word + '"): ' + JSON.stringify(tags));
  // phím Space ở câu sau cũng tắt câu đang đọc
  await waitFor('GardenGames._debug().locked === false');
  g = await dbg();
  await key(String(g.answer + 1)); await sleep(900);
  await clearLog();
  await key(' '); await sleep(400);
  tags = await log();
  ok(tags[0] === 'STOP', 'phím Space (Câu tiếp) cũng tắt câu đang đọc: ' + JSON.stringify(tags));
  await js('GardenGames.close(); return 1;'); await sleep(400);

  console.log('== 2. Nghe tìm cây, Chợ sáng: sang câu / khách mới thì tắt từ đang đọc');
  await py(KB + 'd = kb._dialog\nd.deck_id = mw.col.decks.id_for_name("C::Chỉ từ + audio từ")\nd.refresh()\nresult = 1'); await sleep(1500);
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js('document.querySelector(\'.kb-gcard[data-game="listen"]\').click(); return 1;');
  ok(await waitFor('GardenGames._debug().locked === false'), 'Nghe tìm cây chạy (deck có audio từ)');
  g = await dbg();
  await key(String(g.answer + 1)); await sleep(500);
  await clearLog();
  await key('Enter'); await sleep(700);
  tags = await log();
  ok(tags[0] === 'STOP', 'Nghe tìm cây: Câu tiếp → tắt từ cũ rồi mới đọc từ mới: ' + JSON.stringify(tags).slice(0, 160));
  await js('GardenGames.close(); return 1;'); await sleep(400);
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js('document.querySelector(\'.kb-gcard[data-game="market"]\').click(); return 1;');
  const mk = await waitFor('GardenGames._debug().state === "wait"', 20000);
  ok(mk, 'Chợ sáng chạy, có khách');
  if (mk) {
    g = await dbg();
    await key(String(g.answer + 1)); await sleep(1600);
    await clearLog();
    await key('Enter'); await sleep(400);
    tags = await log();
    ok(tags[0] === 'STOP', 'Chợ sáng: Khách tiếp → tắt từ đang đọc: ' + JSON.stringify(tags));
    await clearLog();
    await page.key('Escape', 'Escape', 27); await sleep(400);     // phím thật (KeyboardEvent giả "Escape" giữa trò chơi làm webview treo trong môi trường test)
    tags = await log();
    ok((await dbg()).screen === 'menu' && tags.indexOf('STOP') >= 0, 'Chợ sáng: Esc về menu giữa chừng → tắt từ đang đọc: ' + JSON.stringify(tags));
  }
  await js('GardenGames.close(); return 1;'); await sleep(400);

  console.log('== 3. xong nhiệm vụ thứ ba trong trò chơi → huy hiệu + đèn trời hiện ngay');
  await py(KB + `d = st.load()
day = kb._today()
d["quest"] = {"day": day, "list": [
    {"id": "q_due", "kind": "due", "target": 1, "reward": 20, "text": "Ôn 1 thẻ đến hạn"},
    {"id": "q_new", "kind": "new", "target": 1, "reward": 20, "text": "Học 1 thẻ mới"},
    {"id": "q_games", "kind": "games", "target": 1, "reward": 20, "text": "Chơi 1 trò chơi"}],
  "progress": {"due": 1, "new": 1}, "done": ["q_due", "q_new"], "chest": False, "chest_item": None}
st.save(d)
kb._dialog.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio")
kb._dialog.refresh()
result = 1`);
  await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  const b0 = await js('return { joy: (Garden._data().joy || {}).quests, badge: document.getElementById("kb-joy").textContent, quest: document.getElementById("kb-quest").textContent };');
  ok(b0.joy === false && !/Xong 3 nhiệm vụ/.test(b0.badge) && /2\/3/.test(b0.quest), 'trước: nhiệm vụ 2/3, chưa có huy hiệu: ' + JSON.stringify(b0));
  await sleep(1200);
  const lamp0 = await lampPx();
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js('document.querySelector(\'.kb-gcard[data-game="cloze"]\').click(); return 1;');
  for (let i = 0; i < 8; i++) {
    if (!(await waitFor('GardenGames._debug().screen !== "play" || GardenGames._debug().locked === false', 8000))) { break; }
    if ((await dbg()).screen !== 'play') { break; }
    g = await dbg();
    await key(String(g.answer + 1)); await sleep(250);
    await key('Enter'); await sleep(250);
  }
  ok(await waitFor('document.getElementById("kb-gres-save") && !/Đang lưu/.test(document.getElementById("kb-gres-save").textContent)', 10000), 'chơi hết 8 câu → màn kết quả, đã lưu');
  const b1 = await js('return { joy: (Garden._data().joy || {}).quests, badge: document.getElementById("kb-joy").textContent, quest: document.getElementById("kb-quest").textContent, res: (document.querySelector(".kb-gres-quest") || {}).textContent || "", banner: !!document.getElementById("kb-joy-banner") && !document.getElementById("kb-joy-banner").hidden };');
  ok(b1.joy === true && /Xong 3 nhiệm vụ/.test(b1.badge) && /3\/3/.test(b1.quest) && /Xong nhiệm vụ/.test(b1.res),
    'ngay khi lưu kết quả (chưa đổi deck): nhiệm vụ 3/3, huy hiệu "Xong 3 nhiệm vụ", đèn trời bật: ' + JSON.stringify(b1));
  ok(!b1.banner, 'đang mở bảng Trò chơi: dải chúc mừng để dành (không nấp sau bảng)');
  await js('GardenGames.close(); return 1;'); await sleep(700);
  const b2 = await js('const b = document.getElementById("kb-joy-banner"); return b && !b.hidden ? b.textContent : "";');
  ok(/Xong cả 3 nhiệm vụ/.test(b2), 'đóng bảng Trò chơi → dải chúc mừng "' + b2 + '"');
  await sleep(2500);
  await page.shot(SHOTS + '/1258_02_xong_3_nhiem_vu.png');
  const lamp = await lampPx();
  ok(lamp > lamp0 + 20, 'đèn trời bay trên trời sân (điểm ảnh cam ở dải trời: ' + lamp0 + ' → ' + lamp + ')');
  await js('document.getElementById("kb-quest").click(); return 1;'); await sleep(400);
  await page.shot(SHOTS + '/1258_03_nhiem_vu_3_3.png');
  await js('const q = document.getElementById("kb-quest-pop"); if (q) q.hidden = true; return 1;');
  // làm mới cả vườn (đổi deck) không hiện lại dải chúc mừng lần nữa trong ngày
  await py(KB + 'd = kb._dialog\nd.deck_id = mw.col.decks.id_for_name("B::Có câu ví dụ, không audio")\nd.refresh()\nresult = 1'); await sleep(1500);
  const b3 = await js('const b = document.getElementById("kb-joy-banner"); return { banner: !!b && !b.hidden && /Xong cả 3/.test(b.textContent), badge: document.getElementById("kb-joy").textContent };');
  ok(/Xong 3 nhiệm vụ/.test(b3.badge), 'đổi deck: huy hiệu vẫn còn: ' + JSON.stringify(b3));

  console.log('== 4. truyện chung: báo Claude Code (kotoba_daily, kỳ 1–8) → hôm nay Gemini viết báo → nối kỳ 9');
  const KD_SRC = require('path').join(__dirname, '..', '..', 'kotoba_daily');
  await py(KB + `import shutil, tempfile, datetime
kd = os.path.join(tempfile.mkdtemp(prefix="kb_kd_"), "kotoba_daily")
shutil.copytree(${JSON.stringify(KD_SRC)}, kd, ignore=shutil.ignore_patterns("audio", "*.html", "__pycache__", "truyen_chung.json"))
kb._kb_kd = kd
for p in (kb.AI_DIR_SHARED,):
    shutil.rmtree(p, ignore_errors=True)
kb.save_config(bao_dir=kd, bao_source="auto", gemini_key="AQ.Ab8RN6thu-khoa-gia-1258-0000000000", gemini_langs=["vi"],
               gemini_auto=False, paper_confirmed={"ja": "claude", "en": "", "vi": "gemini"}, gemini_wait_start=False, gemini_wait_langs=[])
SC = kb.story_core
kb._kb_prompts = []
S = ("Sáng hôm ấy, Lin mang túi hạt giống xuống vườn Kotoba. StackChan chạy theo sau, tay ôm cuốn sổ vẽ, miệng hỏi liên tục "
     "rằng hạt này sẽ mọc thành cây gì. Bà Hana đứng ở hiên quán, nhìn hai người rồi mỉm cười. Ông Ken nói hồi nhỏ ông từng "
     "gieo hạt cùng bà Hana ở chỗ quán cũ trên núi, và ông vẫn nhớ mùi đất sau cơn mưa đầu đông năm đó.")
P = ("Sáng nay cả làng Kotoba tụ tập bên giếng cũ để nghe bà Hana kể chuyện. Lin cầm cuốn sổ nhỏ ghi chép không ngừng, còn "
     "StackChan thì vẽ lại mọi thứ bằng những ô vuông màu. Ông trưởng làng bảo rằng ngày mai sẽ có hội chợ mùa đông.")
def _gen(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
    self.calls += 1
    kb._kb_prompts.append(prompt[:12000])
    if schema is SC.ARC_SCHEMA:
        return json.dumps({"ten": "Hạt giống đầu đông", "muc_tieu": "gieo hạt", "bi_an": "cây gì", "nhan_vat_phu": "ông Ken",
                           "buoc": ["b1", "b2", "b3", "b4", "b5", "b6"], "ket": "cây nảy mầm"}, ensure_ascii=False)
    if schema is SC.MASTER_SCHEMA:
        return json.dumps({"dan_y": {"muon": "a", "tro_ngai": "b", "bat_ngo": "c", "moc_cau": "d"}, "tieu_de": "Hạt giống đầu đông",
                           "doan": [S, S, S], "nho": {"tom_tat": "Lin gieo túi hạt của bà Hana.", "bo_ngo": ["cây gì"]},
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
kb.ai.Gemini.generate = _gen
kb.ai.Gemini.models = lambda self: [{"name": "models/gemini-3.6-flash", "supportedGenerationMethods": ["generateContent"]}]
d = st.load(); d["coins"] = 250; st.save(d)
result = kb.ai_start("manual", kb._dialog, "vi")`);
  const wrote = await (async () => { const t = Date.now(); while (Date.now() - t < 40000) { if (await py(KB + 'result = kb.ai.has_issue(kb.AI_DIR_VI, kb.ai_today()) and not kb._ai["running"]')) { return true; } await sleep(500); } return false; })();
  ok(wrote, 'Gemini (giả) viết xong báo tiếng Việt hôm nay');
  const sync = await py(KB + `mem = kb.story_core.load_story(kb.AI_DIR_SHARED)
today = kb.ai_today()
tc = json.load(open(os.path.join(kb._kb_kd, "truyen_chung.json"), encoding="utf-8")) if os.path.exists(os.path.join(kb._kb_kd, "truyen_chung.json")) else {}
arc = next((p for p in kb._kb_prompts if "Lập MẠCH TRUYỆN" in p), "")
iss = json.load(open(kb.ai.issue_path(kb.AI_DIR_VI, today), encoding="utf-8"))
result = {"mem": [[e["ky"], e.get("nguon", "")] for e in mem], "tc": [[r["ky"], r["ngay"] == today] for r in tc.get("ky", [])],
          "arc_ok": "Kỳ 8:" in arc and "hộp thiếc" in arc and "bắt đầu từ kỳ 9" in arc,
          "ky": [b.get("ky") for b in iss["bai"] if b.get("loai") == "truyen"]}`);
  ok(JSON.stringify(sync.mem) === JSON.stringify([[1, 'claude'], [2, 'claude'], [3, 'claude'], [4, 'claude'], [5, 'claude'], [6, 'claude'], [7, 'claude'], [8, 'claude'], [9, '']]),
    'bộ nhớ truyện chung: kỳ 1–8 của Claude + kỳ 9 Gemini viết hôm nay: ' + JSON.stringify(sync.mem));
  ok(sync.arc_ok && JSON.stringify(sync.ky) === '[9]', 'Gemini lập mạch nối kỳ 8 (hộp thiếc), số báo hôm nay in kỳ 9');
  const lg = await py(KB + 'result = kb.ai.log_summary(kb.ai.last_log(kb.AI_DIR_VI, kb.ai_today()))');
  ok(lg.some(x => /Nối 8 kỳ của báo Claude Code/.test(x)), 'nhật ký viết báo ghi "Nối 8 kỳ của báo Claude Code" (không vào nhật ký lỗi)');
  ok(JSON.stringify(sync.tc) === '[[9,true]]', 'kotoba_daily/truyen_chung.json có kỳ 9 cho Claude đọc: ' + JSON.stringify(sync.tc));
  const pv = await py(KB + `import subprocess, datetime
tom = (datetime.date.fromisoformat(kb.ai_today()) + datetime.timedelta(days=1)).isoformat()
r = subprocess.run([sys.executable, os.path.join(kb._kb_kd, "tools", "pham_vi.py")], capture_output=True, text=True, env=dict(os.environ, KB_TODAY=tom))
t = json.load(open(os.path.join(kb._kb_kd, "pham_vi.json"), encoding="utf-8"))["truyen"]
result = [t["ky_tiep_theo"], [x["ky"] for x in t["ky_them"]], r.returncode]`);
  ok(pv[0] === 10 && JSON.stringify(pv[1]) === '[9]' && pv[2] === 0, 'sáng hôm sau pham_vi.py của Claude: kỳ tiếp theo 10, biết kỳ 9 đã đăng ở add-on: ' + JSON.stringify(pv));
  await py(KB + 'kb.save_config(bao_dir="", gemini_langs=["ja"]); result = 1');

  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  const bad = errs.filter(e => !/Tunnel|403|giọng|TTS|models/i.test(e));
  ok(!bad.length, 'nhật ký lỗi không có lỗi mới' + (bad.length ? ': ' + bad.join(' | ') : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total + ' đạt');
  try { page.close(); } catch (e) { }
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI KỊCH BẢN', e && e.stack || e); process.exit(3); });
