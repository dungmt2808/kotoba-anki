// 1.33 trong Anki thật: báo tiếng Trung / tiếng Hàn (người dùng duyệt ảnh phác docs/ke_hoach_1_33/, quyết định 17/11:
// tối đa 2 báo; mặc định 1 báo theo deck đang chọn → deck ngôn ngữ ôn nhiều nhất 30 ngày → nhiều thẻ nhất → báo tiếng Việt;
// chỉ áp cho người chưa từng chọn báo; dán khoá lần đầu thì giữ lựa chọn lúc đó).
//   1. báo mặc định theo deck (chưa có khoá, chưa có số báo nào): deck Trung / Hàn / Nhật / Anh, deck không phải deck ngôn
//      ngữ (lượt ôn 30 ngày, lượt ôn cũ hơn không tính, chưa ôn → nhiều thẻ nhất), không có deck ngôn ngữ → tiếng Việt
//   2. tab Nguồn báo: 5 ô, đúng ô theo deck, dòng gợi ý báo thứ hai; dán khoá lần đầu → giữ báo lúc đó (đổi deck không đổi)
//   3. tối đa 2 báo (ô thứ ba mờ, bấm không được), "Chỉ tiếng Việt" đi một mình, "Không" ở dòng gợi ý → gợi ý tiếng kế tiếp,
//      chip HSK 1–6 / TOPIK 1–6 lưu config
//   4. "Bắt đầu viết" với Gemini giả (đúng đường đi của add-on, không gọi mạng): mỗi báo đúng 3 lượt (kể lại, viết, soát)
//   5. báo tiếng Trung: đầu báo 词田晨报, ngày 年月日 星期, pinyin trên từng chữ, Ẩn / Hiện pinyin, tra từ có pinyin + Hán Việt
//      + cây trong vườn, không có kana, câu hỏi cộng xu, chép chính tả chấm từng chữ (gần đúng → tô chữ sai)
//   6. báo tiếng Hàn: đầu báo 말밭 신문, ngày 년 월 일 요일, không ruby, tra từ có tiểu từ / đuôi (축제가 → 축제, 무서워서 →
//      무섭다), chép chấm theo cụm, khác chỗ cách vẫn đúng
//   7. lượt Chép hằng ngày của deck tiếng Trung (giọng máy zh_CN) + báo tiếng Nhật / tiếng Anh như cũ
//   8. hợp đồng dữ liệu: khoá collection mới chỉ kotoba_batake_paper_zh / _ko
// Chạy: KB_SCRIPTS=e2e_133.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_133';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const FIXP = path.resolve(__dirname, '..', 'fixtures', 'bao_133.json');
const MODP = path.resolve(__dirname, '..', 'fixtures', 'gemini_models_20261116.json');
const FIX = JSON.parse(fs.readFileSync(FIXP, 'utf8'));
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
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
const KANA = /[぀-ヿ]/;
const shot = (n) => page.shot(SHOTS + '/' + n + '.png');
async function deck(name) {
  await py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`);
  await sleep(1800);
}
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await sleep(600);
}
// đọc lại báo mặc định ngay (bỏ bộ nhớ đệm 30 / 60 giây)
const fresh = 'kb._auto_cache.update(t=0.0, k=None, v=None); kb._started_cache.update(t=0.0, k=None)\n';
const wanted = () => py(KB + fresh + 'result = kb.wanted_langs()');
async function openSrc() {
  await js('GardenPaper.close(); return 1;'); await sleep(300);
  await js('document.getElementById("kb-paper-btn").click(); return 1;');
  await waitFor('return !document.getElementById("kb-paper").hidden;');
  await js('const t = [...document.querySelectorAll(".kb-p-tab")].find((x) => x.getAttribute("data-ptab") === "src"); t.click(); return 1;');
  return waitFor('return !!document.querySelector(".kb-ai-want");', 8000);
}
const wantState = () => js(`const r = document.querySelector(".kb-ai-want"); if (!r) return null;
  return { ticks: [...r.querySelectorAll(".kb-ai-tick")].map((l) => ({ t: l.textContent.trim(), on: l.querySelector("input").checked, dis: l.querySelector("input").disabled, off: l.classList.contains("is-off"), title: l.title })),
           hint: (r.querySelector(".kb-ai-v > .kb-ai-hint") || {}).textContent || "", sug: (r.querySelector(".kb-ai-suggest") || {}).textContent || "" };`);
async function tick(label) {
  await js(`const l = [...document.querySelectorAll(".kb-ai-want .kb-ai-tick")].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); l.querySelector("input").click(); return 1;`);
  await sleep(900);
}
const cfg = (k) => py(KB + `result = kb.config().get(${JSON.stringify(k)})`);

const ZH = [['今天', 'jīntiān', 'hôm nay', 'KIM THIÊN'], ['天气', 'tiānqì', 'thời tiết', 'THIÊN KHÍ'], ['漂亮', 'piàoliang', 'đẹp', 'PHIÊU LƯỢNG'],
  ['大家', 'dàjiā', 'mọi người', 'ĐẠI GIA'], ['拍照', 'pāizhào', 'chụp ảnh', 'PHÁCH CHIẾU'], ['村长', 'cūnzhǎng', 'trưởng làng', 'THÔN TRƯỞNG'],
  ['旅店', 'lǚdiàn', 'quán trọ', 'LỮ ĐIẾM'], ['准备', 'zhǔnbèi', 'chuẩn bị', 'CHUẨN BỊ'], ['节日', 'jiérì', 'ngày lễ', 'TIẾT NHẬT'],
  ['害怕', 'hàipà', 'sợ', 'HẠI PHẠ'], ['本子', 'běnzi', 'cuốn sổ', 'BẢN TỬ'], ['紧张', 'jǐnzhāng', 'căng thẳng', 'KHẨN TRƯƠNG'],
  ['商店', 'shāngdiàn', 'cửa hàng', 'THƯƠNG ĐIẾM'], ['欢迎', 'huānyíng', 'hoan nghênh', 'HOAN NGHÊNH'], ['眼睛', 'yǎnjing', 'mắt', 'NHÃN TINH'],
  ['外面', 'wàimian', 'bên ngoài', 'NGOẠI DIỆN'], ['时候', 'shíhou', 'lúc, khi', 'THỜI HẬU'], ['你好', 'nǐ hǎo', 'xin chào', 'NHĨ HẢO']];
const KO = [['오늘', 'oneul', 'hôm nay'], ['날씨', 'nalssi', 'thời tiết'], ['마을', 'maeul', 'làng'], ['단풍', 'danpung', 'lá đỏ'],
  ['사진', 'sajin', 'ảnh'], ['축제', 'chukje', 'lễ hội'], ['여관', 'yeogwan', 'quán trọ'], ['고양이', 'goyangi', 'con mèo'],
  ['그림', 'geurim', 'bức tranh'], ['귀엽다', 'gwiyeopda', 'dễ thương'], ['꽃', 'kkot', 'hoa'], ['내일', 'naeil', 'ngày mai'],
  ['무섭다', 'museopda', 'sợ'], ['우물', 'umul', 'cái giếng'], ['웃다', 'utda', 'cười'], ['수첩', 'sucheop', 'sổ tay'], ['학교', 'hakgyo', 'trường học']];

(async () => {
  console.log('== chuẩn bị: deck tiếng Trung / tiếng Hàn, lượt ôn có kiểm soát');
  await py(KB + `import random
col = mw.col
def model(name, fields):
    mm = col.models
    m = mm.new(name)
    for f in fields:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = "{{%s}}" % fields[0]; t["afmt"] = "{{FrontSide}}<hr id=answer>{{%s}}" % fields[2]
    mm.add_template(m, t); mm.add(m); return mm.by_name(name)
zh = model("Chinese HSK", ["Hanzi", "Pinyin", "Nghĩa", "Hán Việt"])
ko = model("Korean vocabulary", ["Korean", "Romaja", "Nghĩa"])
dz, dk = col.decks.id("ZH::HSK 2"), col.decks.id("KO::TOPIK 2")
col.decks.id("Trống")
for w, p, m, hv in ${JSON.stringify(ZH)}:
    n = col.new_note(zh); n["Hanzi"], n["Pinyin"], n["Nghĩa"], n["Hán Việt"] = w, p, m, hv; col.add_note(n, dz)
for w, r, m in ${JSON.stringify(KO)}:
    n = col.new_note(ko); n["Korean"], n["Romaja"], n["Nghĩa"] = w, r, m; col.add_note(n, dk)
today = col.sched.today
for i, cid in enumerate(col.find_cards('deck:"ZH::HSK 2" or deck:"KO::TOPIK 2"')):
    col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3 where id=?", 5 + i, today + 3, cid)
# lượt ôn: tiếng Hàn 40 > tiếng Trung 10 > tiếng Nhật 5 (30 ngày qua); tiếng Anh 200 lượt nhưng 45 ngày trước (không tính)
col.db.execute("delete from revlog")
now = int(time.time() * 1000)
def rev(search, n, days_ago):
    cids = col.find_cards(search)
    for k in range(n):
        col.db.execute("insert into revlog (id, cid, usn, ease, ivl, lastIvl, factor, time, type) values (?, ?, -1, 3, 5, 3, 2500, 4000, 1)",
                       now - days_ago * 86400000 - k * 1000 - random.randint(0, 999), cids[k % len(cids)])
rev('deck:"KO::TOPIK 2"', 40, 2)
rev('deck:"ZH::HSK 2"', 10, 3)
rev('note:"Từ vựng KB"', 5, 4)
rev('note:"English KB"', 200, 45)
d = st.load(); d["coins"] = 5000; st.save(d)
kb.save_config(show_tooltips=False, sound=False, music=False, gemini_audio="tat", dict_voice="may")
kb._xx_tts["zh"] = kb._xx_tts["ko"] = True          # máy thử không có giọng zh_CN / ko_KR: coi như có (không phát)
result = 1`);
  const keys0 = await py(KB + 'result = sorted(k for k in mw.col.all_config() if k.startswith("kotoba_batake"))');

  console.log('== 1. báo mặc định theo deck (chưa có khoá, chưa có số báo nào, chưa từng chọn)');
  // máy "mới": cất các số báo mẫu, bỏ khoá; 1.31.3 lúc mở hồ sơ đã ghi gemini_langs = ["ja"] (không phải người dùng chọn)
  await py(KB + `import shutil
for b in kb.AI_DIRS.values():
    if os.path.isdir(os.path.join(b, "bao")):
        os.rename(os.path.join(b, "bao"), os.path.join(b, "bao_e2e_cat"))
c = dict(mw.addonManager.getConfig(kb.__name__)); c.pop("gemini_langs_chosen", None)
c.update(gemini_key="", bao_dir="", gemini_langs=["ja"], gemini_wait_start=False, gemini_wait_langs=[])
mw.addonManager.writeConfig(kb.__name__, c)
result = 1`);
  await openGarden();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  ok(await py(KB + fresh + 'result = kb._papers_started(kb.config())') === false, 'máy chưa có khoá / số báo → báo chưa từng chạy');
  await deck('ZH::HSK 2');
  ok(JSON.stringify(await wanted()) === '["zh"]', 'deck tiếng Trung → báo tiếng Trung');
  await deck('KO::TOPIK 2');
  ok(JSON.stringify(await wanted()) === '["ko"]', 'deck tiếng Hàn → báo tiếng Hàn');
  const jaDeck = 'A::Có câu ví dụ + audio', enDeck = 'M::Tiếng Anh A2';
  await deck(jaDeck);
  ok(JSON.stringify(await wanted()) === '["ja"]', 'deck tiếng Nhật (' + jaDeck + ') → báo tiếng Nhật');
  await deck(enDeck);
  ok(JSON.stringify(await wanted()) === '["en"]', 'deck tiếng Anh (' + enDeck + ') → báo tiếng Anh');
  await deck('Trống');
  ok(JSON.stringify(await wanted()) === '["ko"]', 'deck không có thẻ → ngôn ngữ ôn nhiều nhất 30 ngày qua: tiếng Hàn (40 lượt; tiếng Anh 200 lượt cũ hơn 30 ngày không tính)');
  const rank = await py(KB + fresh + 'result = kb._lang_rank()');
  ok(rank.slice(0, 3).join(',') === 'ko,zh,ja', 'thứ tự ngôn ngữ theo lượt ôn 30 ngày: ' + rank.join(' > '));
  const byCards = await py(KB + `saved = mw.col.db.all("select * from revlog")
mw.col.db.execute("delete from revlog")
infos = kb.words.model_infos(mw.col, kb.core.merged_config(kb.config()))
lang_of = {int(m): i["lang"] for m, i in infos.items() if i.get("lang") in kb.LEARN_LANGS}
cnt = {}
for mid, n in mw.col.db.all("select n.mid, count() from cards c join notes n on n.id = c.nid group by n.mid"):
    if int(mid) in lang_of:
        cnt[lang_of[int(mid)]] = cnt.get(lang_of[int(mid)], 0) + n
want = max(cnt, key=lambda x: cnt[x])
got = kb.wanted_langs() if not kb._auto_cache.update(t=0.0, k=None, v=None) else None
for r in saved:
    mw.col.db.execute("insert into revlog values (?,?,?,?,?,?,?,?,?)", *r)
result = [got, want, cnt]`);
  ok(JSON.stringify(byCards[0]) === JSON.stringify([byCards[1]]), 'chưa ôn gì → ngôn ngữ nhiều thẻ nhất: ' + byCards[0] + ' (' + JSON.stringify(byCards[2]) + ')');
  const noLang = await py(KB + `orig = kb.words.model_infos
kb.words.model_infos = lambda *a, **k: {}
try:
    kb._auto_cache.update(t=0.0, k=None, v=None); result = kb.wanted_langs()
finally:
    kb.words.model_infos = orig`);
  ok(JSON.stringify(noLang) === '["vi"]', 'tài khoản không có deck ngôn ngữ nào → báo tiếng Việt');

  console.log('== 2. tab Nguồn báo: ô theo deck, gợi ý báo thứ hai, dán khoá lần đầu giữ lựa chọn');
  await deck('ZH::HSK 2');
  ok(await openSrc(), 'mở tab Nguồn báo');
  let w = await wantState();
  ok(w && w.ticks.length === 5 && w.ticks.map((t) => t.t).join('|') === 'Tiếng Nhật|Tiếng Anh|Tiếng Trung|Tiếng Hàn|Chỉ tiếng Việt',
    '5 ô: ' + (w ? w.ticks.map((t) => t.t).join(' · ') : ''));
  ok(w && w.ticks.filter((t) => t.on).map((t) => t.t).join() === 'Tiếng Trung' && /tối đa 2 báo/.test(w.hint), 'deck tiếng Trung → tick sẵn Tiếng Trung, dòng nhỏ "tối đa 2 báo"');
  ok(w && /Bạn cũng học tiếng Hàn — thêm báo tiếng Hàn\?/.test(w.sug) && /Thêm báo tiếng Hàn/.test(w.sug) && /Không/.test(w.sug),
    'gợi ý ngôn ngữ ôn nhiều nhất còn lại: ' + (w && w.sug));
  await shot('133_e2e_01_nguon_bao');
  await deck('KO::TOPIK 2');
  await openSrc();
  w = await wantState();
  ok(w && w.ticks.filter((t) => t.on).map((t) => t.t).join() === 'Tiếng Hàn' && /tiếng Trung/.test(w.sug), 'đổi sang deck tiếng Hàn → tick Tiếng Hàn, gợi ý tiếng Trung');
  await deck('ZH::HSK 2');
  await openSrc();
  // dán khoá (thử khoá giả, không gọi mạng)
  await py(KB + `if not hasattr(kb.ai, "_e2e_test_key"):
    kb.ai._e2e_test_key = kb.ai.test_key
kb.ai.test_key = lambda client, prefer=None: {"model": "gemini-4-hydrogen", "models": ["gemini-4-hydrogen", "gemini-3.5-flash-lite"], "tts": "gemini-3.8-tts"}
result = 1`);
  await js(`const i = document.querySelector(".kb-ai-key"); i.value = "AIzaSyE2E-test-key-0000000000000000000"; const b = [...document.querySelectorAll(".kb-ai-steps button")].find((x) => x.textContent === "Thử khoá"); b.click(); return 1;`);
  ok(await waitPy('result = bool(kb.ai.clean_key(kb.config().get("gemini_key")))'), 'thử khoá xong → lưu khoá');
  ok(JSON.stringify(await cfg('gemini_langs')) === '["zh"]' && await cfg('gemini_wait_start') === true,
    'dán khoá lần đầu → lưu báo mặc định lúc đó (tiếng Trung), chờ "Bắt đầu viết"');
  ok(!(await cfg('gemini_langs_chosen')), 'chưa ghi "đã tự chọn" (người dùng chưa tick gì)');
  await deck('KO::TOPIK 2');
  ok(JSON.stringify(await wanted()) === '["zh"]', 'có khoá rồi: đổi sang deck tiếng Hàn → báo vẫn là tiếng Trung (không tự đổi theo deck)');
  const legacy = await py(KB + fresh + `c = dict(mw.addonManager.getConfig(kb.__name__)); saved = c.get("gemini_langs")
c.pop("gemini_langs", None); mw.addonManager.writeConfig(kb.__name__, c)
r = kb.wanted_langs()
c["gemini_langs"] = saved; mw.addonManager.writeConfig(kb.__name__, c)
result = r`);
  ok(JSON.stringify(legacy) === '["ja"]', 'đã dùng báo nhưng config chưa có lựa chọn (máy từ bản ≤ 1.19.0) → như 1.19.1: tiếng Nhật, không theo deck (' + JSON.stringify(legacy) + ')');
  await deck('ZH::HSK 2');
  await openSrc();

  console.log('== 3. tối đa 2 báo, Chỉ tiếng Việt, gợi ý, trình độ');
  w = await wantState();
  ok(w && /tiếng Hàn/.test(w.sug), 'có khoá vẫn gợi ý thêm báo tiếng Hàn');
  await js('const b = [...document.querySelectorAll(".kb-ai-suggest button")].find((x) => x.textContent === "Không"); b.click(); return 1;');
  await sleep(1000);
  ok(JSON.stringify(await cfg('gemini_suggest_off')) === '["ko"]', '"Không" → lưu gemini_suggest_off = ["ko"]');
  w = await wantState();
  ok(w && /thêm báo tiếng Nhật\?/.test(w.sug), 'gợi ý chuyển sang ngôn ngữ ôn nhiều kế tiếp (tiếng Nhật): ' + (w && w.sug));
  await tick('Tiếng Hàn');
  ok(JSON.stringify(await cfg('gemini_langs')) === '["zh","ko"]' && await cfg('gemini_langs_chosen') === true, 'tick Tiếng Hàn → 2 báo [zh, ko], ghi "đã tự chọn"');
  w = await wantState();
  const offs = w ? w.ticks.filter((t) => t.dis).map((t) => t.t) : [];
  ok(offs.join() === 'Tiếng Nhật,Tiếng Anh' && w.ticks.filter((t) => t.off).length === 2 && /Tối đa 2 báo/.test(w.ticks[0].title),
    'đủ 2 báo → Tiếng Nhật / Tiếng Anh mờ, "Tối đa 2 báo: bỏ tick một báo trước"');
  ok(w && !w.sug && /hai báo cùng kể một chuyện/.test(w.hint), 'đủ 2 báo → không còn dòng gợi ý; "hai báo cùng kể một chuyện"');
  await js('const l = [...document.querySelectorAll(".kb-ai-want .kb-ai-tick")].find((x) => x.textContent.trim() === "Tiếng Nhật"); l.click(); l.querySelector("input").click(); return 1;');
  await sleep(800);
  ok(JSON.stringify(await cfg('gemini_langs')) === '["zh","ko"]', 'bấm ô mờ (Tiếng Nhật) → không đổi');
  ok(JSON.stringify(await py(KB + 'result = kb.clean_langs(["zh", "ko", "ja", "en"])')) === '["zh","ko"]', 'config bị sửa tay 4 báo → chỉ giữ 2 báo đầu');
  await shot('133_e2e_02_hai_bao');
  await tick('Chỉ tiếng Việt');
  ok(JSON.stringify(await cfg('gemini_langs')) === '["vi"]', 'tick Chỉ tiếng Việt → chỉ báo tiếng Việt');
  w = await wantState();
  ok(w && w.ticks.every((t) => !t.dis) && !w.sug, 'báo tiếng Việt: các ô khác bấm được, không gợi ý');
  await tick('Tiếng Trung');
  ok(JSON.stringify(await cfg('gemini_langs')) === '["zh"]', 'tick Tiếng Trung → bỏ tiếng Việt, còn [zh]');
  await tick('Tiếng Hàn');
  ok(JSON.stringify(await cfg('gemini_langs')) === '["zh","ko"]', 'tick lại Tiếng Hàn → [zh, ko]');
  const lv = await js(`const out = {}; document.querySelectorAll(".kb-ai-lang").forEach((b) => { const h = b.querySelector(".kb-ai-lang-h"); out[h.querySelector("b").textContent] = { mast: h.querySelector(".kb-ai-hint").textContent, chips: [...b.querySelectorAll("select.kb-ai-sel option")].map((c) => c.textContent + (c.selected ? "*" : "")) }; }); return out;`);   // 1.33.1: ô thả xuống
  const zhB = Object.keys(lv).find((k) => k === 'Báo tiếng Trung'), koB = Object.keys(lv).find((k) => k === 'Báo tiếng Hàn');
  ok(zhB && lv[zhB].mast === '词田晨报' && lv[zhB].chips.slice(0, 6).join(',') === 'HSK 1,HSK 2*,HSK 3,HSK 4,HSK 5,HSK 6', 'khối báo tiếng Trung: 词田晨报, HSK 1–6 (đang HSK 2)');
  ok(koB && lv[koB].mast === '말밭 신문' && lv[koB].chips.slice(0, 6).join(',') === 'TOPIK 1,TOPIK 2*,TOPIK 3,TOPIK 4,TOPIK 5,TOPIK 6', 'khối báo tiếng Hàn: 말밭 신문, TOPIK 1–6 (đang TOPIK 2)');
  await js('const s = [...document.querySelectorAll("select.kb-ai-sel")].find((x) => [...x.options].some((o) => o.textContent === "HSK 3")); s.value = [...s.options].find((o) => o.textContent === "HSK 3").value; s.dispatchEvent(new Event("change")); return 1;'); await sleep(900);
  await js('const s = [...document.querySelectorAll("select.kb-ai-sel")].find((x) => [...x.options].some((o) => o.textContent === "TOPIK 3")); s.value = [...s.options].find((o) => o.textContent === "TOPIK 3").value; s.dispatchEvent(new Event("change")); return 1;'); await sleep(900);
  ok(await cfg('gemini_level_zh') === 'HSK3' && await cfg('gemini_level_ko') === 'TOPIK3' && await cfg('gemini_level') === 'N4',
    'chọn HSK 3 / TOPIK 3 → gemini_level_zh / _ko, trình độ báo Nhật không đổi');
  await js('const s = [...document.querySelectorAll("select.kb-ai-sel")].find((x) => [...x.options].some((o) => o.textContent === "HSK 2")); s.value = [...s.options].find((o) => o.textContent === "HSK 2").value; s.dispatchEvent(new Event("change")); return 1;'); await sleep(700);
  await js('const s = [...document.querySelectorAll("select.kb-ai-sel")].find((x) => [...x.options].some((o) => o.textContent === "TOPIK 2")); s.value = [...s.options].find((o) => o.textContent === "TOPIK 2").value; s.dispatchEvent(new Event("change")); return 1;'); await sleep(700);

  console.log('== 4. "Bắt đầu viết" với Gemini giả (không gọi mạng)');
  await py(KB + `S = kb.story_core
A = kb.ai
FIX = json.load(open(${JSON.stringify(FIXP)}, encoding="utf-8"))
MODELS = json.load(open(${JSON.stringify(MODP)}, encoding="utf-8"))["models"]
kb._e2e_calls = []
def fake_models(self):
    return MODELS
def fake_generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None, **k):
    self.calls += 1
    lg = kb._ai.get("lang")
    f = FIX[lg]
    if schema is S.RETELL_SCHEMA:
        kb._e2e_calls.append((lg, "ke_lai")); out = dict(f["story"]); out["nho"] = {"tom_tat": "Lin sợ khi nghe chuyện ma."}
        return json.dumps(out, ensure_ascii=False)
    if schema is A.REVIEW_SCHEMA:
        kb._e2e_calls.append((lg, "soat")); return json.dumps({"van_de": [], "bao": f["issue"]}, ensure_ascii=False)
    if schema is A.ISSUE_SCHEMA:
        kb._e2e_calls.append((lg, "viet")); return json.dumps(f["issue"], ensure_ascii=False)
    kb._e2e_calls.append((lg, "la")); raise A.AIError("lượt gọi lạ", kind="bad")
def no_net(self, *a, **k):
    kb._e2e_calls.append(("?", "mang")); raise A.AIError("test: không gọi mạng", kind="net")
A.Gemini.models = fake_models; A.Gemini.generate = fake_generate; A.Gemini._request = no_net; A.Gemini.speak = no_net
date = kb.ai_today()
A.ensure_dir(kb.AI_DIR_SHARED)
S.save_master(kb.AI_DIR_SHARED, date, {"ngay": date, "ky": 2, "thoi_tiet": "nắng", "tin": [{"tieu_de": "Lá đỏ", "noi_dung": "Lá đỏ trong làng rất đẹp."}],
              "truyen": {"tieu_de": "Lời kể lúc bình minh", "ky_truoc": "Lin nghe tiếng guốc gỗ ở giếng cổ.", "doan": ["Đoạn 1.", "Đoạn 2.", "Đoạn 3."],
                         "nho": {"tom_tat": "Lin sợ."}, "lang": "vi"}})
result = date`);
  await openSrc();
  const startBtn = await waitFor('const b = document.querySelector(".kb-ai-startbtn"); return b && !b.disabled ? b.textContent : "";');
  ok(startBtn === 'Bắt đầu viết', 'nút "Bắt đầu viết" (báo chờ sau khi dán khoá)');
  await js('document.querySelector(".kb-ai-startbtn").click(); return 1;');
  const done = await waitPy('result = kb.ai.has_issue(kb.AI_DIR_ZH, kb.ai_today()) and kb.ai.has_issue(kb.AI_DIR_KO, kb.ai_today()) and not kb._ai["running"]', 90000);
  ok(done, 'viết xong số hôm nay của cả báo tiếng Trung và báo tiếng Hàn');
  const calls = await py(KB + 'result = kb._e2e_calls');
  const kinds = (lg) => calls.filter((c) => c[0] === lg).map((c) => c[1]).join(',');
  ok(kinds('zh') === 'ke_lai,viet,soat' && kinds('ko') === 'ke_lai,viet,soat', 'mỗi báo đúng 3 lượt gọi (kể lại, viết, soát): zh ' + kinds('zh') + ' · ko ' + kinds('ko'));
  ok(!calls.some((c) => c[1] === 'mang' || c[1] === 'la'), 'không có lượt gọi mạng / lượt gọi lạ nào');
  const subs = await py(KB + 'result = [kb.ai.load_status(kb.AI_DIR_ZH).get("error", ""), kb.ai.load_status(kb.AI_DIR_KO).get("error", ""), bool(st.load()["more"].get("paper_sub", {}).get("until"))]');
  ok(!subs[0] && !subs[1] && subs[2], 'không lỗi; gói báo tặng thử bắt đầu từ số đầu tiên');
  await openSrc();
  const today = await js(`const out = []; document.querySelectorAll(".kb-ai-lang").forEach((b) => { const r = [...b.querySelectorAll(".kb-ai-row")].find((x) => x.querySelector(".kb-ai-k").textContent === "Hôm nay"); out.push(r ? r.textContent : ""); }); return out;`);
  ok(today.length === 2 && today.every((t) => /✓ Số 1/.test(t)), 'tab Nguồn báo: "Hôm nay ✓ Số 1" ở cả hai báo');
  await shot('133_e2e_03_da_viet');

  console.log('== 5. báo tiếng Trung');
  await js(`const b = [...document.querySelectorAll(".kb-ai-lang")].find((x) => /Trung/.test(x.querySelector("b").textContent)); [...b.querySelectorAll("button")].find((x) => x.textContent === "Đọc").click(); return 1;`);
  ok(await waitFor('const n = document.querySelector("#kb-p-stage .kb-p-name"); return n && n.textContent === "词田晨报";', 8000), 'đầu báo 词田晨报');
  const zm = await js(`const n = document.querySelector("#kb-p-stage .kb-p-name"), m = document.querySelectorAll("#kb-p-stage .kb-p-meta > div");
    return { lang: n.lang, date: m[0].textContent, no: m[1].textContent, art: [...document.querySelectorAll("#kb-p-stage .kb-p-art")].map((a) => a.lang) };`);
  ok(zm.lang === 'zh' && /^\d{4}年\d{1,2}月\d{1,2}日 星期[一二三四五六日]$/.test(zm.date) && zm.art.every((l) => l === 'zh') && /^第1期$/.test(zm.no),
    'ngày kiểu Trung: ' + zm.date + ' · ' + zm.no + ' · bài lang=zh (phông chữ Trung)');
  const rb = await js(`const ps = [...document.querySelectorAll("#kb-p-stage .kb-p-art .kb-p-text")];
    let han = 0, ruby = 0, bad = [];
    ps.forEach((p) => { const c = p.cloneNode(true); c.querySelectorAll("rt, button, .kb-p-dich").forEach((x) => x.remove()); han += (c.textContent.match(/[\\u3400-\\u9fff]/g) || []).length; });
    // mỗi chữ Hán một cặp (chữ, <rt> một âm tiết có dấu) — kể cả từ có gạch chân (một <ruby> nhiều cặp)
    document.querySelectorAll("#kb-p-stage .kb-p-art .kb-p-text ruby").forEach((r) => { const ns = [...r.childNodes];
      for (let k = 0; k < ns.length; k += 2) { ruby++; const b = ns[k], t = ns[k + 1];
        if (!b || b.nodeType !== 3 || b.textContent.length !== 1 || !t || t.tagName !== "RT" || !/^[a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü]+$/.test(t.textContent)) bad.push((b && b.textContent) + "|" + (t && t.textContent)); } });
    return { han, ruby, bad: bad.slice(0, 5) };`);
  ok(rb.han > 100 && rb.ruby === rb.han && !rb.bad.length, 'pinyin trên từng chữ: ' + rb.ruby + ' / ' + rb.han + ' chữ Hán có một âm tiết có dấu riêng' + (rb.bad.length ? ' — lạ: ' + rb.bad.join(' ') : ''));
  const story = await js('const a = document.querySelector("#kb-p-stage .kb-p-truyen"); return a ? a.textContent : "";');
  ok(/木\s*mù\s*屐\s*jī|木mù屐jī/.test(story.replace(/\s+/g, '')) || /木mù屐jī/.test(story.replace(/\s+/g, '')), 'truyện kể lại có 木屐 (mù jī) đúng pinyin');
  ok(!KANA.test(await js('return document.getElementById("kb-p-stage").innerText;')), 'không có chữ kana nào trong số báo tiếng Trung');
  ok(await js('return !document.getElementById("kb-p-furi").hidden && document.getElementById("kb-p-furi").textContent === "Ẩn pinyin";'), 'nút "Ẩn pinyin"');
  await shot('133_e2e_04_bao_trung');
  await js('document.getElementById("kb-p-furi").click(); return 1;'); await sleep(400);
  const hid = await js('const rt = document.querySelector("#kb-p-stage .kb-p-text rt"); const s = getComputedStyle(rt); return { cls: document.getElementById("kb-paper").classList.contains("kb-p-nofuri"), vis: s.visibility, disp: s.display, opa: s.opacity, btn: document.getElementById("kb-p-furi").textContent };');
  ok(hid.cls && (hid.vis === 'hidden' || hid.disp === 'none' || hid.opa === '0') && hid.btn === 'Hiện pinyin', 'bấm → pinyin ẩn, nút thành "Hiện pinyin"');
  await js('document.getElementById("kb-p-furi").click(); return 1;'); await sleep(300);
  ok(await js('return !document.getElementById("kb-paper").classList.contains("kb-p-nofuri");'), 'bấm lại → pinyin hiện');
  ok(/Bấm từ gạch chân để tra nghĩa/.test(await js('return document.getElementById("kb-p-info").textContent;')), 'dòng gợi ý: "Bấm từ gạch chân để tra nghĩa" (1.33.2: rút gọn)');
  const words = await js('return [...new Set([...document.querySelectorAll("#kb-p-stage .kb-p-w")].map((x) => x.getAttribute("data-k")))];');
  ok(words.length >= 5 && words.indexOf('天气') >= 0 && words.indexOf('害怕') >= 0, 'từ của deck được gạch chân: ' + words.slice(0, 10).join(' '));
  await js('[...document.querySelectorAll("#kb-p-stage .kb-p-w")].find((x) => x.getAttribute("data-k") === "害怕").click(); return 1;'); await sleep(400);
  const info = await js('const i = document.getElementById("kb-p-info"); return { w: (i.querySelector(".kb-p-iw") || {}).textContent, r: (i.querySelector(".kb-p-ir") || {}).textContent, m: (i.querySelector(".kb-p-im") || {}).textContent, n: (i.querySelector(".kb-p-inote") || {}).textContent };');
  ok(info.w === '害怕' && /hài\s*pà/.test(info.r) && /sợ/.test(info.m) && /HẠI PHẠ/.test(info.m), 'tra 害怕: ' + [info.w, info.r, info.m].join(' · '));
  ok(/Cây trong vườn/.test(info.n || ''), 'tra từ có trạng thái cây trong vườn: ' + info.n);
  await shot('133_e2e_05_tra_tu_trung');
  const coins0 = await py(KB + 'result = st.load()["coins"]');
  const qa = FIX.zh.issue.cau_hoi[0].dung;
  await js(`const q = document.querySelector('.kb-p-q[data-q="0"]') || document.querySelectorAll("[data-q]")[0]; q.querySelectorAll(".kb-p-opt")[${qa}].click(); return 1;`);
  ok(await waitFor('const q = document.querySelectorAll("[data-q]")[0]; const f = q.querySelector(".kb-p-fb"); return f && /^Đúng/.test(f.textContent);'), 'câu hỏi 1 trả lời đúng → "Đúng +… xu"');
  ok(await waitPy(`result = st.load()["coins"] > ${coins0}`), 'xu tăng sau câu hỏi đúng');
  const ct = await js('const r = document.querySelector("#kb-p-stage .kb-p-ct"); const i = r && r.querySelector("input"); return i ? { lang: i.lang, ph: i.placeholder, len: (r.querySelector(".kb-p-ct-len") || {}).textContent } : null;');
  ok(ct && ct.lang === 'zh' && /chữ Hán \(bộ gõ pinyin\)/.test(ct.ph) && /chữ$/.test(ct.len || ''), 'ô chép câu tiếng Trung: lang=zh, "' + (ct && ct.ph) + '", ' + (ct && ct.len));
  async function typeCt(i, text) {
    await js(`const r = document.querySelectorAll("#kb-p-stage .kb-p-ct")[${i}]; const inp = r.querySelector("input"); inp.value = ${JSON.stringify(text)}; r.querySelector(".kb-p-check").click(); return 1;`);
    await waitFor(`const f = document.querySelectorAll("#kb-p-stage .kb-p-ct")[${i}].querySelector(".kb-p-fb"); return f && f.textContent && f.textContent !== "Đang chấm…";`);
    await sleep(300);
    return js(`const r = document.querySelectorAll("#kb-p-stage .kb-p-ct")[${i}]; return { fb: r.querySelector(".kb-p-fb").textContent, ok: [...r.querySelectorAll(".kb-p-g-ok")].map((x) => x.textContent).join(""), bad: [...r.querySelectorAll(".kb-p-g-bad")].map((x) => x.textContent).join("|") };`);
  }
  let g = await typeCt(0, '今天天汽很好一天都是晴天');
  ok(/^Gần đúng — 11\/12 chữ/.test(g.fb) && g.bad === '气', 'gõ sai một chữ (汽 thay 气) → "' + g.fb.slice(0, 22) + '", chỉ tô 气');
  g = await typeCt(0, '今天天气很好，一天都是晴天。');
  ok(/^Đúng rồi/.test(g.fb), 'gõ lại đúng (có dấu câu) → ' + g.fb);
  g = await typeCt(1, '大家都出来拍照');
  ok(/^Đúng rồi/.test(g.fb), 'câu 2 gõ không dấu câu → đúng');
  await shot('133_e2e_06_chep_trung');

  console.log('== 6. báo tiếng Hàn');
  await js('const t = [...document.querySelectorAll(".kb-p-tab")].find((x) => x.getAttribute("data-ptab") === "shelf"); t.click(); return 1;');
  await waitFor('return !!document.querySelector(".kb-p-langs .kb-ai-chip");', 8000);
  const shelf = await js('return [...document.querySelectorAll("#kb-p-stage .kb-p-row-title")].map((x) => x.textContent + "@" + x.lang);');
  ok(shelf.length >= 1 && shelf.every((x) => /@zh$/.test(x)), 'Kệ báo tiếng Trung: tiêu đề số báo lang=zh — ' + shelf.join(' · '));
  const bar = await js('const b = document.querySelector(".kb-p-langs"); return b ? [...b.querySelectorAll(".kb-ai-chip")].map((x) => x.textContent) : [];');
  ok(bar.length === 2 && /Báo tiếng Trung/.test(bar.join()) && /Báo tiếng Hàn/.test(bar.join()), 'thanh chuyển báo: ' + bar.join(' · '));
  await js('const b = [...document.querySelectorAll(".kb-p-langs .kb-ai-chip")].find((x) => /tiếng Hàn/.test(x.textContent)); b.click(); return 1;');
  await waitFor('return [...document.querySelectorAll("#kb-p-stage .kb-p-row-title")].some((x) => x.lang === "ko");', 8000);
  const shelfKo = await js('return [...document.querySelectorAll("#kb-p-stage .kb-p-row-title")].map((x) => x.textContent + "@" + x.lang);');
  ok(shelfKo.length >= 1 && shelfKo.every((x) => /@ko$/.test(x)), 'chuyển sang báo tiếng Hàn ở Kệ báo: ' + shelfKo.join(' · '));
  await js('document.querySelector("#kb-p-stage .kb-p-row").click(); return 1;');
  ok(await waitFor('const n = document.querySelector("#kb-p-stage .kb-p-name"); return n && n.textContent === "말밭 신문";', 8000), 'đầu báo 말밭 신문');
  const km = await js(`const n = document.querySelector("#kb-p-stage .kb-p-name"), m = document.querySelectorAll("#kb-p-stage .kb-p-meta > div");
    return { lang: n.lang, date: m[0].textContent, ruby: document.querySelectorAll("#kb-p-stage .kb-p-art ruby").length, furi: document.getElementById("kb-p-furi").hidden, text: document.getElementById("kb-p-stage").innerText };`);
  ok(km.lang === 'ko' && /^\d{4}년 \d{1,2}월 \d{1,2}일 [월화수목금토일]요일$/.test(km.date), 'ngày kiểu Hàn: ' + km.date);
  ok(km.ruby === 0 && km.furi === true, 'không có chữ nhỏ trên chữ, không có nút Ẩn furigana / pinyin');
  ok(!KANA.test(km.text) && !/[一-鿿]/.test(km.text.replace(/StackChan/g, '')), 'không có kana / chữ Hán trong số báo tiếng Hàn');
  ok(/학교에 → 학교/.test(await js('return document.getElementById("kb-p-info").textContent;')), 'dòng gợi ý tiếng Hàn: nhận cả từ có tiểu từ / đuôi');
  const kw = await js('return [...document.querySelectorAll("#kb-p-stage .kb-p-w")].map((x) => x.textContent + "→" + x.getAttribute("data-k"));');
  ok(kw.some((x) => x === '축제가→축제' || x === '축제→축제') && kw.some((x) => /^무서워/.test(x) && /→무섭다$/.test(x)), 'gạch chân cả từ biến đổi: ' + kw.filter((x) => /축제|무서/.test(x)).join(' '));
  await js('[...document.querySelectorAll("#kb-p-stage .kb-p-w")].find((x) => x.getAttribute("data-k") === "무섭다").click(); return 1;'); await sleep(400);
  const ki = await js('const i = document.getElementById("kb-p-info"); return [(i.querySelector(".kb-p-iw") || {}).textContent, (i.querySelector(".kb-p-im") || {}).textContent];');
  ok(ki[0] === '무섭다' && /sợ/.test(ki[1] || ''), 'tra 무서워서 → 무섭다 · ' + ki[1]);
  await shot('133_e2e_07_bao_han');
  g = await typeCt(0, '다음 가을 축제가 있어요');
  ok(/^Gần đúng — 4\/5 cụm/.test(g.fb) && g.bad === '주에', 'thiếu một cụm → "' + g.fb.slice(0, 20) + '", chỉ tô 주에');
  g = await typeCt(0, '다음주에 가을 축제가 있어요');
  ok(/^Đúng rồi/.test(g.fb) && /khác chỗ cách chữ/.test(g.fb), 'chỉ khác chỗ cách → ' + g.fb);
  await shot('133_e2e_08_chep_han');

  console.log('== 7. lượt Chép hằng ngày (deck tiếng Trung) + báo tiếng Nhật / tiếng Anh như cũ');
  await js('const t = [...document.querySelectorAll(".kb-p-tab")].find((x) => x.getAttribute("data-ptab") === "dict"); t.click(); return 1;');
  const dl = await waitFor('const r = document.querySelectorAll("#kb-p-stage .kb-p-ct"); return r.length ? { n: r.length, lang: r[0].querySelector("input") && r[0].querySelector("input").lang, info: document.getElementById("kb-p-info").textContent, title: (document.querySelector("#kb-p-stage .kb-p-name") || {}).textContent } : null;', 10000);
  ok(dl && dl.n > 0 && dl.lang === 'zh', 'deck tiếng Trung: lượt chép có ' + (dl && dl.n) + ' câu / từ tiếng Trung (giọng máy zh_CN)');
  ok(dl && /chữ Hán \(bộ gõ pinyin\)/.test(dl.info) && !/don't/.test(dl.info), 'dòng gợi ý chép: gõ bằng chữ Hán (không còn "don\'t = do not")');
  await shot('133_e2e_09_chep_hang_ngay');
  await py(KB + `for b in kb.AI_DIRS.values():
    if os.path.isdir(os.path.join(b, "bao_e2e_cat")):
        if os.path.isdir(os.path.join(b, "bao")):
            import shutil
            for d in os.listdir(os.path.join(b, "bao_e2e_cat")):
                if not os.path.exists(os.path.join(b, "bao", d)):
                    os.rename(os.path.join(b, "bao_e2e_cat", d), os.path.join(b, "bao", d))
            shutil.rmtree(os.path.join(b, "bao_e2e_cat"), ignore_errors=True)
        else:
            os.rename(os.path.join(b, "bao_e2e_cat"), os.path.join(b, "bao"))
result = 1`);
  await openSrc();
  await tick('Tiếng Hàn');
  await tick('Tiếng Nhật');
  const zj = await cfg('gemini_langs');
  ok(zj && zj.length === 2 && zj.indexOf('zh') >= 0 && zj.indexOf('ja') >= 0, 'bỏ Tiếng Hàn, tick Tiếng Nhật → ' + JSON.stringify(zj));
  await js('const t = [...document.querySelectorAll(".kb-p-tab")].find((x) => x.getAttribute("data-ptab") === "shelf"); t.click(); return 1;');
  await waitFor('return !!document.querySelector(".kb-p-langs .kb-ai-chip");', 8000);
  await js('const b = [...document.querySelectorAll(".kb-p-langs .kb-ai-chip")].find((x) => /tiếng Nhật/.test(x.textContent)); if (b) b.click(); return 1;');
  await waitFor('return [...document.querySelectorAll("#kb-p-stage .kb-p-row-title")].some((x) => x.lang === "ja");', 8000);
  await js('document.querySelector("#kb-p-stage .kb-p-row").click(); return 1;');
  const ja = await waitFor('const n = document.querySelector("#kb-p-stage .kb-p-name"); return n && n.lang === "ja" ? { name: n.textContent, furi: document.getElementById("kb-p-furi").textContent, rt: document.querySelectorAll("#kb-p-stage .kb-p-art rt").length, date: document.querySelector("#kb-p-stage .kb-p-meta > div").textContent } : null;', 8000);
  ok(ja && ja.furi === 'Ẩn furigana' && ja.rt > 0 && /月.*日/.test(ja.date) && ja.name === '畑新聞', 'báo tiếng Nhật như cũ: ' + (ja ? ja.name + ' · ' + ja.date + ' · ' + ja.rt + ' furigana · nút "' + ja.furi + '"' : 'không mở được'));
  await shot('133_e2e_10_bao_nhat');

  console.log('== 8. hợp đồng dữ liệu');
  const keys1 = await py(KB + 'result = sorted(k for k in mw.col.all_config() if k.startswith("kotoba_batake"))');
  const added = keys1.filter((k) => keys0.indexOf(k) < 0);
  // khoá có từ trước (bản đã phát hành tạo khi dùng tới) + đúng 2 khoá mới của 1.33
  const OLD = ['kotoba_batake_paper', 'kotoba_batake_paper_en', 'kotoba_batake_paper_vi', 'kotoba_batake_paper_nguon', 'kotoba_batake_paper_sub',
    'kotoba_batake_rev', 'kotoba_batake_words_src', 'kotoba_batake_events', 'kotoba_batake_guests', 'kotoba_batake_life', 'kotoba_batake_more', 'kotoba_batake_state'];
  ok(added.every((k) => OLD.indexOf(k) >= 0 || k === 'kotoba_batake_paper_zh' || k === 'kotoba_batake_paper_ko'),
    'khoá collection mới (trong lúc test): ' + (added.join(', ') || 'không có'));
  ok(added.indexOf('kotoba_batake_paper_zh') >= 0 && added.indexOf('kotoba_batake_paper_ko') >= 0, 'tiến độ báo tiếng Trung / tiếng Hàn lưu ở kotoba_batake_paper_zh / _ko');
  const pz = await py(KB + 'result = mw.col.get_config("kotoba_batake_paper_zh")');
  ok(pz && typeof pz === 'object' && JSON.stringify(pz).indexOf(await py(KB + 'result = kb.ai_today()')) >= 0, 'kotoba_batake_paper_zh có kết quả hôm nay');

  console.log('KẾT QUẢ: ' + pass + '/' + total + (pass === total ? ' — TẤT CẢ OK' : ''));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e && e.stack || e); process.exit(1); });
