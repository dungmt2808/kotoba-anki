// 1.35 trong Anki thật: tiếng Đức / tiếng Pháp như tiếng Anh / Trung / Nhật / Hàn (người dùng chốt 17/11).
//   1. deck tiếng Đức / tiếng Pháp (trường "Wort / Bedeutung", "Mot / Sens"): cây có ngôn ngữ de / fr, không phải tiếng Anh;
//      Cấu hình trường lưu de / fr ở lang3 (bản cũ đọc là "Ngôn ngữ khác")
//   2. Ngôn ngữ trong vườn: Tự theo deck → tiếng Đức / tiếng Pháp; chọn Tiếng Pháp ở ⚙ → StackChan / thẻ cây không còn chữ
//      Nhật; thuộc tính lang đúng
//   3. Đuổi quạ (Nghĩa → gõ chữ): gõ không mạo từ, không dấu (ä = ae, ß = ss, é = e) đuổi được quạ
//   4. tab Nguồn báo: 7 ô, deck tiếng Đức → tick sẵn Tiếng Đức, gợi ý tiếng Pháp; tối đa 2 báo; trình độ A1–C1 riêng
//      (gemini_level_de / _fr), không đổi trình độ báo tiếng Anh
//   5. "Bắt đầu viết" với Gemini giả: mỗi báo đúng 3 lượt (kể lại, viết, soát), không gọi mạng
//   6. báo tiếng Đức: Der Wortgarten, ngày "Dienstag, 17. November 2026", Nr. 1, bài lang=de, không chữ Nhật, tra từ
//      Blätter → das Blatt, câu hỏi cộng xu, chép chính tả gõ "ae / ss" vẫn đúng, sai một từ → tô đúng từ
//   7. báo tiếng Pháp (Kệ báo → chuyển báo): Le Jardin des Mots, ngày "mardi 17 novembre 2026", N° 1, tra yeux → l'œil, chép
//      không dấu vẫn đúng
//   8. lượt Chép hằng ngày của deck tiếng Đức (giọng máy de_DE) + hợp đồng dữ liệu (khoá mới chỉ kotoba_batake_paper_de / _fr)
// Chạy: KB_SCRIPTS=e2e_135.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_135';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const FIXP = path.resolve(__dirname, '..', 'fixtures', 'bao_135.json');
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
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
async function waitPy(code, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await py(KB + code); if (v) return v; } catch (e) { } await sleep(300); }
  return false;
}
const JP = /[぀-ヿ㐀-鿿]/;
const shot = (n) => page.shot(SHOTS + '/' + n + '.png');
async function deck(name) {
  await py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`);
  await sleep(1800);
}
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await js('window.__errs = []; window.addEventListener("error", (e) => window.__errs.push(String(e.message))); return 1;');
  await sleep(600);
}
const plants = () => js('return Garden._data().plants.map((p) => ({ word: p.word, lang: p.lang, reading: p.reading, meaning: p.meaning }));');
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
  return { ticks: [...r.querySelectorAll(".kb-ai-tick")].map((l) => ({ t: l.textContent.trim(), on: l.querySelector("input").checked, dis: l.querySelector("input").disabled })),
           sug: (r.querySelector(".kb-ai-suggest") || {}).textContent || "" };`);
async function tick(label) {
  await js(`const l = [...document.querySelectorAll(".kb-ai-want .kb-ai-tick")].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); l.querySelector("input").click(); return 1;`);
  await sleep(900);
}
const cfg = (k) => py(KB + `result = kb.config().get(${JSON.stringify(k)})`);
async function crow(group, mode) {
  await py(KB + `kb.FIELDS.set_game("crow", ${JSON.stringify(group)}, ${JSON.stringify(mode)}); kb._dialog.refresh(); result = 1`); await sleep(1500);
  await js('if (typeof GardenGames !== "undefined") GardenGames.close(); document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js('localStorage.setItem("kb-crow-speed", "vslow"); document.querySelector(\'.kb-gcard[data-game="crow"]\').click(); return 1;');
  return waitFor('return GardenGames._debug().flying && GardenGames._debug().flying.length > 0', 12000);
}
const dbg = () => js('return GardenGames._debug();');

// [từ trong deck, nghĩa, cách gõ không dấu / không mạo từ]
const DE = [['das Wetter', 'thời tiết', 'Wetter'], ['das Dorf, ¨-er', 'làng', 'dorf'], ['das Foto, -s', 'ảnh', 'Foto'],
  ['das Fest, -e', 'lễ hội', 'fest'], ['vorbereiten', 'chuẩn bị', 'vorbereiten'], ['das Notizbuch', 'sổ tay', 'Notizbuch'],
  ['der Brunnen', 'cái giếng', 'brunnen'], ['die Angst', 'nỗi sợ', 'Angst'], ['das Geräusch', 'tiếng động', 'Geraeusch'],
  ['das Auge, -n', 'mắt', 'auge'], ['die Geschichte', 'câu chuyện', 'Geschichte'], ['das Gasthaus', 'quán trọ', 'gasthaus'],
  ['die Katze, -n', 'con mèo', 'Katze'], ['das Bild, -er', 'bức tranh', 'bild'], ['die Blume, -n', 'bông hoa', 'Blume'],
  ['die Schule', 'trường học', 'schule'], ['das Krankenhaus', 'bệnh viện', 'Krankenhaus'], ['süß', 'dễ thương', 'suess'],
  ['klar', 'trong, quang', 'klar'], ['schön', 'đẹp', 'schoen'], ['machen', 'làm', 'machen'], ['das Blatt, ¨-er', 'chiếc lá', 'Blatt'],
  ['malen', 'vẽ', 'malen'], ['lachen', 'cười', 'lachen'], ['zittern', 'run', 'zittern'], ['gehen', 'đi', 'gehen'],
  ['die Woche', 'tuần', 'Woche'], ['die Straße', 'con đường', 'Strasse']];
const FR = [['la feuille', 'chiếc lá', 'feuille'], ['le village', 'làng', 'village'], ['la photo', 'ảnh', 'photo'],
  ['la fête', 'lễ hội', 'fete'], ['préparer', 'chuẩn bị', 'preparer'], ['le carnet', 'sổ tay', 'carnet'], ['le puits', 'cái giếng', 'puits'],
  ['la peur', 'nỗi sợ', 'peur'], ['le bruit', 'tiếng động', 'bruit'], ["l'œil (m)", 'mắt', 'oeil'], ["l'histoire (f)", 'câu chuyện', 'histoire'],
  ["l'auberge (f)", 'quán trọ', 'auberge'], ['le chat', 'con mèo', 'chat'], ['le dessin', 'bức vẽ', 'dessin'], ['la fleur', 'bông hoa', 'fleur'],
  ["l'école (f)", 'trường học', 'ecole'], ["l'hôpital (m)", 'bệnh viện', 'hopital'], ['mignon', 'dễ thương', 'mignon'], ['beau', 'đẹp', 'beau'],
  ['prendre', 'lấy, chụp', 'prendre'], ['dessiner', 'vẽ', 'dessiner'], ['rire', 'cười', 'rire'], ['trembler', 'run', 'trembler'],
  ['aller', 'đi', 'aller'], ['la semaine', 'tuần', 'semaine'], ["l'automne (m)", 'mùa thu', 'automne'], ['la journée', 'ngày', 'journee'],
  ['le garçon', 'cậu bé', 'garcon']];

(async () => {
  console.log('== chuẩn bị: deck tiếng Đức / tiếng Pháp');
  await py(KB + `import random
col = mw.col
def model(name, fields):
    mm = col.models
    m = mm.new(name)
    for f in fields:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = "{{%s}}" % fields[0]; t["afmt"] = "{{FrontSide}}<hr id=answer>{{%s}}" % fields[1]
    mm.add_template(m, t); mm.add(m); return mm.by_name(name)
de = model("Deutsch Wortschatz", ["Wort", "Bedeutung"])
fr = model("Vocabulaire français", ["Mot", "Sens"])
dd, df = col.decks.id("DE::A2"), col.decks.id("FR::A2")
for w, m, _t in ${JSON.stringify(DE)}:
    n = col.new_note(de); n["Wort"], n["Bedeutung"] = w, m; col.add_note(n, dd)
for w, m, _t in ${JSON.stringify(FR)}:
    n = col.new_note(fr); n["Mot"], n["Sens"] = w, m; col.add_note(n, df)
today = col.sched.today
for i, cid in enumerate(col.find_cards('deck:"DE::A2" or deck:"FR::A2"')):
    col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3 where id=?", 5 + i, today + 3, cid)
# lượt ôn 30 ngày: tiếng Đức 40 > tiếng Pháp 20 > các deck khác (bỏ lượt ôn cũ của collection mẫu)
col.db.execute("delete from revlog")
now = int(time.time() * 1000)
def rev(search, n, days_ago):
    cids = col.find_cards(search)
    for k in range(n):
        col.db.execute("insert into revlog (id, cid, usn, ease, ivl, lastIvl, factor, time, type) values (?, ?, -1, 3, 5, 3, 2500, 4000, 1)",
                       now - days_ago * 86400000 - k * 1000 - random.randint(0, 999), cids[k % len(cids)])
rev('deck:"DE::A2"', 40, 2)
rev('deck:"FR::A2"', 20, 3)
d = st.load(); d["coins"] = 5000; st.save(d)
kb.save_config(show_tooltips=False, sound=False, music=False, gemini_audio="tat", dict_voice="may")
kb._xx_tts["de"] = kb._xx_tts["fr"] = True          # máy thử không có giọng de_DE / fr_FR: coi như có (không phát)
result = 1`);
  const keys0 = await py(KB + 'result = sorted(k for k in mw.col.all_config() if k.startswith("kotoba_batake"))');
  await py(KB + `for b in kb.AI_DIRS.values():
    if os.path.isdir(os.path.join(b, "bao")):
        os.rename(os.path.join(b, "bao"), os.path.join(b, "bao_e2e_cat"))
c = dict(mw.addonManager.getConfig(kb.__name__)); c.pop("gemini_langs_chosen", None)
c.update(gemini_key="", bao_dir="", gemini_langs=["ja"], gemini_wait_start=False, gemini_wait_langs=[])
mw.addonManager.writeConfig(kb.__name__, c)
result = 1`);
  await openGarden();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }

  console.log('== 1. deck tiếng Đức / tiếng Pháp → cây de / fr');
  await deck('DE::A2');
  let ps = await plants();
  ok(ps.length === DE.length && ps.every((p) => p.lang === 'de'), 'deck tiếng Đức: ' + ps.length + ' cây, ngôn ngữ ' + [...new Set(ps.map((p) => p.lang))].join(','));
  await deck('FR::A2');
  ps = await plants();
  ok(ps.length === FR.length && ps.every((p) => p.lang === 'fr'), 'deck tiếng Pháp: ' + ps.length + ' cây, ngôn ngữ ' + [...new Set(ps.map((p) => p.lang))].join(','));
  const store = await py(KB + `m = mw.col.models.by_name("Vocabulaire français")
kb.FIELDS.set_model(str(m["id"]), {"kind": "vocab", "f": {"word": "Mot", "meaning": "Sens"}}, "fr")
raw = mw.col.get_config("kotoba_batake_fields")
result = [raw["lang"].get(str(m["id"])), (raw.get("lang3") or {}).get(str(m["id"])), (raw.get("lang2") or {}).get(str(m["id"]))]`);
  ok(store[0] === 'other' && store[1] === 'fr' && !store[2], 'Cấu hình trường lưu tiếng Pháp: lang = "other" (bản cũ hiểu) + lang3 = fr: ' + JSON.stringify(store));
  await deck('FR::A2');
  ps = await plants();
  ok(ps.every((p) => p.lang === 'fr'), 'sau khi lưu Cấu hình trường: cây vẫn tiếng Pháp');

  console.log('== 2. Ngôn ngữ trong vườn');
  ok(await js('return GardenLang.cur();') === 'fr', 'Tự theo deck (deck tiếng Pháp) → tiếng Pháp');
  await deck('DE::A2');
  ok(await js('return GardenLang.cur();') === 'de', 'Tự theo deck (deck tiếng Đức) → tiếng Đức');
  const sel = await js('const s = document.getElementById("kb-glang"); return s ? [...s.options].map((o) => o.value) : [];');
  ok(sel.indexOf('de') >= 0 && sel.indexOf('fr') >= 0, '⚙ Ngôn ngữ trong vườn có Tiếng Đức / Tiếng Pháp: ' + sel.join(','));
  await js('GardenLang.setPref("fr"); return 1;'); await sleep(500);
  const pref = await py(KB + 'result = (kb.config().get("prefs") or {}).get("kb-glang")');
  ok(pref === 'fr', 'chọn Tiếng Pháp → lưu config prefs kb-glang = fr');
  const said = [];
  for (let k = 0; k < 6; k++) {
    const t = await js('const n = GardenLang.line("いいね！ Hay lắm", "fr"); const it = GardenLang.item("acts", "neru", "寝る", "ねる"); return n + " | " + (it ? it.t + "@" + it.lang : "");');
    said.push(t);
  }
  ok(said.every((s) => !JP.test(s) && /@fr$/.test(s)), 'câu nói / sinh hoạt tiếng Pháp, không chữ Nhật: ' + said[0]);
  await shot('135_e2e_01_vuon_tieng_phap');
  await js('GardenLang.setPref("auto"); return 1;'); await sleep(400);

  console.log('== 3. Đuổi quạ: gõ từ tiếng Đức không mạo từ, không dấu');
  ok(await crow('de', 'spell'), 'Đuổi quạ tiếng Đức (Nghĩa → gõ chữ): quạ bay ra');
  const ans = Object.fromEntries(DE.map((r) => [r[0], r[2]]));
  await js('document.querySelector(".kb-gc-input").focus(); return 1;');
  let hit = 0; const tried = [];
  for (let t0 = Date.now(); tried.length < 4 && Date.now() - t0 < 70000;) {
    const d = await dbg();
    const c = (d.flying || [])[0];
    if (!c) { await sleep(800); continue; }
    const before = d.scared;
    const typed = ans[c.word] || ans[Object.keys(ans).find((k) => k.indexOf(c.word) === 0)] || c.word;
    await page.type(typed); await sleep(500);
    const after = (await dbg()).scared;
    tried.push(c.word + ' ← ' + typed + (after > before ? ' ✓' : ' ✗'));
    if (after > before) { hit++; } else { await js('document.querySelector(".kb-gc-input").value = ""; return 1;'); }
    await sleep(1200);
  }
  ok(hit >= 3 && hit === tried.length, 'gõ không mạo từ / ae / ss / chữ thường đuổi được quạ: ' + tried.join(' · '));
  await shot('135_e2e_02_duoi_qua_duc');
  await js('GardenGames.close(); return 1;'); await sleep(500);
  await deck('FR::A2');
  ok(await crow('fr', 'spell'), 'Đuổi quạ tiếng Pháp: quạ bay ra');
  const ansF = Object.fromEntries(FR.map((r) => [r[0], r[2]]));
  await js('document.querySelector(".kb-gc-input").focus(); return 1;');
  hit = 0; tried.length = 0;
  for (let t0 = Date.now(); tried.length < 4 && Date.now() - t0 < 70000;) {
    const d = await dbg();
    const c = (d.flying || [])[0];
    if (!c) { await sleep(800); continue; }
    const before = d.scared;
    const typed = ansF[c.word] || ansF[Object.keys(ansF).find((k) => k.indexOf(c.word) === 0)] || c.word;
    await page.type(typed); await sleep(500);
    const after = (await dbg()).scared;
    tried.push(c.word + ' ← ' + typed + (after > before ? ' ✓' : ' ✗'));
    if (after > before) { hit++; } else { await js('document.querySelector(".kb-gc-input").value = ""; return 1;'); }
    await sleep(1200);
  }
  ok(hit >= 3 && hit === tried.length, 'tiếng Pháp gõ không dấu / không mạo từ: ' + tried.join(' · '));
  await js('GardenGames.close(); return 1;'); await sleep(500);

  console.log('== 4. tab Nguồn báo');
  await deck('DE::A2');
  ok(JSON.stringify(await wanted()) === '["de"]', 'chưa có khoá: deck tiếng Đức → báo tiếng Đức');
  await deck('FR::A2');
  ok(JSON.stringify(await wanted()) === '["fr"]', 'deck tiếng Pháp → báo tiếng Pháp');
  await deck('DE::A2');
  ok(await openSrc(), 'mở tab Nguồn báo');
  let w = await wantState();
  ok(w && w.ticks.map((t) => t.t).join('|') === 'Tiếng Nhật|Tiếng Anh|Tiếng Trung|Tiếng Hàn|Tiếng Đức|Tiếng Pháp|Chỉ tiếng Việt',
    '7 ô: ' + (w ? w.ticks.map((t) => t.t).join(' · ') : ''));
  ok(w && w.ticks.filter((t) => t.on).map((t) => t.t).join() === 'Tiếng Đức' && /tiếng Pháp/.test(w.sug), 'tick sẵn Tiếng Đức, gợi ý thêm báo tiếng Pháp: ' + (w && w.sug));
  await py(KB + `if not hasattr(kb.ai, "_e2e_test_key"):
    kb.ai._e2e_test_key = kb.ai.test_key
kb.ai.test_key = lambda client, prefer=None: {"model": "gemini-4-hydrogen", "models": ["gemini-4-hydrogen", "gemini-3.5-flash-lite"], "tts": "gemini-3.8-tts"}
result = 1`);
  await js(`const i = document.querySelector(".kb-ai-key"); i.value = "AIzaSyE2E-test-key-0000000000000000000"; const b = [...document.querySelectorAll(".kb-ai-steps button")].find((x) => x.textContent === "Thử khoá"); b.click(); return 1;`);
  ok(await waitPy('result = bool(kb.ai.clean_key(kb.config().get("gemini_key")))'), 'thử khoá (giả) xong → lưu khoá');
  ok(JSON.stringify(await cfg('gemini_langs')) === '["de"]', 'dán khoá lần đầu → giữ báo tiếng Đức');
  await openSrc();
  await tick('Tiếng Pháp');
  ok(JSON.stringify(await cfg('gemini_langs')) === '["de","fr"]', 'tick Tiếng Pháp → 2 báo [de, fr]');
  w = await wantState();
  ok(w && w.ticks.filter((t) => t.dis).map((t) => t.t).join() === 'Tiếng Nhật,Tiếng Anh,Tiếng Trung,Tiếng Hàn', 'đủ 2 báo → 4 ô kia mờ');
  const lv = await js(`const out = {}; document.querySelectorAll(".kb-ai-lang").forEach((b) => { const h = b.querySelector(".kb-ai-lang-h"); out[h.querySelector("b").textContent] = { mast: h.querySelector(".kb-ai-hint").textContent, lang: h.querySelector(".kb-ai-hint").lang, opts: [...b.querySelectorAll("select.kb-ai-sel option")].map((c) => c.textContent + (c.selected ? "*" : "")) }; }); return out;`);
  const deB = lv['Báo tiếng Đức'], frB = lv['Báo tiếng Pháp'];
  ok(deB && deB.mast === 'Der Wortgarten' && deB.lang === 'de' && deB.opts.slice(0, 5).join(',') === 'A1,A2*,B1,B2,C1', 'khối báo tiếng Đức: Der Wortgarten, A1–C1 (đang A2): ' + JSON.stringify(deB));
  ok(frB && frB.mast === 'Le Jardin des Mots' && frB.opts.slice(0, 5).join(',') === 'A1,A2*,B1,B2,C1', 'khối báo tiếng Pháp: Le Jardin des Mots, A1–C1');
  const en0 = await cfg('gemini_level_en');
  await js(`const b = [...document.querySelectorAll(".kb-ai-lang")].find((x) => x.querySelector("b").textContent === "Báo tiếng Đức"); const s = b.querySelector("select.kb-ai-sel"); s.value = [...s.options].find((o) => o.textContent === "B1").value; s.dispatchEvent(new Event("change")); return 1;`);
  await sleep(900);
  ok(await cfg('gemini_level_de') === 'B1' && await cfg('gemini_level_en') === en0 && !(await cfg('gemini_level_fr')),
    'chọn B1 cho báo tiếng Đức → gemini_level_de = B1; báo tiếng Anh vẫn ' + en0 + ', báo tiếng Pháp chưa ghi (mặc định A2)');
  await openSrc();
  await js(`const b = [...document.querySelectorAll(".kb-ai-lang")].find((x) => x.querySelector("b").textContent === "Báo tiếng Đức"); const s = b.querySelector("select.kb-ai-sel"); s.value = [...s.options].find((o) => o.textContent === "A2").value; s.dispatchEvent(new Event("change")); return 1;`);
  await sleep(900);
  ok(await cfg('gemini_level_de') === 'A2', 'đổi lại A2');
  await shot('135_e2e_03_nguon_bao');

  console.log('== 5. "Bắt đầu viết" với Gemini giả (không gọi mạng)');
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
S.save_master(kb.AI_DIR_SHARED, date, {"ngay": date, "ky": 2, "thoi_tiet": "nắng", "tin": [{"tieu_de": "Lá đỏ", "noi_dung": "Lá trong làng rất đẹp."}],
              "truyen": {"tieu_de": "Lời kể lúc bình minh", "ky_truoc": "Lin nghe tiếng guốc gỗ ở giếng cổ.", "doan": ["Đoạn 1.", "Đoạn 2.", "Đoạn 3."],
                         "nho": {"tom_tat": "Lin sợ."}, "lang": "vi"}})
result = date`);
  await openSrc();
  const startBtn = await waitFor('const b = document.querySelector(".kb-ai-startbtn"); return b && !b.disabled ? b.textContent : "";');
  ok(startBtn === 'Bắt đầu viết', 'nút "Bắt đầu viết"');
  await js('document.querySelector(".kb-ai-startbtn").click(); return 1;');
  const done = await waitPy('result = kb.ai.has_issue(kb.AI_DIR_DE, kb.ai_today()) and kb.ai.has_issue(kb.AI_DIR_FR, kb.ai_today()) and not kb._ai["running"]', 90000);
  ok(done, 'viết xong số hôm nay của báo tiếng Đức và báo tiếng Pháp');
  const calls = await py(KB + 'result = kb._e2e_calls');
  const kinds = (lg) => calls.filter((c) => c[0] === lg).map((c) => c[1]).join(',');
  ok(kinds('de') === 'ke_lai,viet,soat' && kinds('fr') === 'ke_lai,viet,soat', 'mỗi báo đúng 3 lượt gọi: de ' + kinds('de') + ' · fr ' + kinds('fr'));
  ok(!calls.some((c) => c[1] === 'mang' || c[1] === 'la'), 'không có lượt gọi mạng / lượt gọi lạ');
  const errs = await py(KB + 'result = [kb.ai.load_status(kb.AI_DIR_DE).get("error", ""), kb.ai.load_status(kb.AI_DIR_FR).get("error", "")]');
  ok(!errs[0] && !errs[1], 'không lỗi: ' + JSON.stringify(errs));
  ok(await py(KB + 'result = os.path.basename(kb.AI_DIR_DE) + "," + os.path.basename(kb.AI_DIR_FR)') === 'bao_gemini_de,bao_gemini_fr', 'thư mục riêng bao_gemini_de / _fr');

  console.log('== 6. báo tiếng Đức');
  await openSrc();
  await js(`const b = [...document.querySelectorAll(".kb-ai-lang")].find((x) => /Đức/.test(x.querySelector("b").textContent)); [...b.querySelectorAll("button")].find((x) => x.textContent === "Đọc").click(); return 1;`);
  ok(await waitFor('const n = document.querySelector("#kb-p-stage .kb-p-name"); return n && n.textContent === "Der Wortgarten";', 8000), 'đầu báo Der Wortgarten');
  const dm = await js(`const n = document.querySelector("#kb-p-stage .kb-p-name"), m = document.querySelectorAll("#kb-p-stage .kb-p-meta > div");
    return { lang: n.lang, date: m[0].textContent, no: m[1].textContent, art: [...document.querySelectorAll("#kb-p-stage .kb-p-art")].map((a) => a.lang), text: document.getElementById("kb-p-stage").innerText, furi: document.getElementById("kb-p-furi").hidden };`);
  ok(dm.lang === 'de' && /^(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag), \d{1,2}\. [A-ZÄ][a-zä]+ \d{4}$/.test(dm.date) && dm.no === 'Nr. 1'
    && dm.art.length === 3 && dm.art.every((l) => l === 'de'), 'ngày kiểu Đức: ' + dm.date + ' · ' + dm.no + ' · bài lang=de');
  ok(!JP.test(dm.text.replace(/StackChan/g, '')) && dm.furi, 'không chữ Nhật, không nút Ẩn furigana');
  const words = await js('return [...document.querySelectorAll("#kb-p-stage .kb-p-w")].map((x) => x.textContent + "→" + x.getAttribute("data-k"));');
  ok(words.indexOf('Blätter→das Blatt') >= 0 && words.indexOf('gegangen→gehen') >= 0 && words.some((x) => /^Holzschuhe→der Holzschuh$/.test(x)),
    'gạch chân cả dạng biến đổi: ' + words.filter((x) => /Blätter|gegangen|Holzschuhe/.test(x)).join(' '));
  await js('[...document.querySelectorAll("#kb-p-stage .kb-p-w")].find((x) => x.textContent === "Blätter").click(); return 1;'); await sleep(400);
  const info = await js('const i = document.getElementById("kb-p-info"); return { w: (i.querySelector(".kb-p-iw") || {}).textContent, m: (i.querySelector(".kb-p-im") || {}).textContent, n: (i.querySelector(".kb-p-inote") || {}).textContent };');
  ok(info.w === 'das Blatt' && /lá/.test(info.m || ''), 'tra Blätter → das Blatt · ' + info.m);
  ok(/Cây trong vườn/.test(info.n || ''), 'tra từ có trạng thái cây trong vườn: ' + info.n);
  await shot('135_e2e_04_bao_duc');
  const coins0 = await py(KB + 'result = st.load()["coins"]');
  await js(`const q = document.querySelectorAll("[data-q]")[0]; q.querySelectorAll(".kb-p-opt")[${FIX.de.issue.cau_hoi[0].dung}].click(); return 1;`);
  ok(await waitFor('const q = document.querySelectorAll("[data-q]")[0]; const f = q.querySelector(".kb-p-fb"); return f && /^Đúng/.test(f.textContent);'), 'câu hỏi 1 đúng → "Đúng +… xu"');
  ok(await waitPy(`result = st.load()["coins"] > ${coins0}`), 'xu tăng');
  const ct = await js('const r = document.querySelector("#kb-p-stage .kb-p-ct"); const i = r && r.querySelector("input"); return i ? { lang: i.lang, ph: i.placeholder, len: (r.querySelector(".kb-p-ct-len") || {}).textContent } : null;');
  ok(ct && ct.lang === 'de' && /từ$/.test(ct.len || ''), 'ô chép câu tiếng Đức: lang=de, "' + (ct && ct.ph) + '", ' + (ct && ct.len));
  async function typeCt(i, text) {
    await js(`const r = document.querySelectorAll("#kb-p-stage .kb-p-ct")[${i}]; const inp = r.querySelector("input"); inp.value = ${JSON.stringify(text)}; r.querySelector(".kb-p-check").click(); return 1;`);
    await waitFor(`const f = document.querySelectorAll("#kb-p-stage .kb-p-ct")[${i}].querySelector(".kb-p-fb"); return f && f.textContent && f.textContent !== "Đang chấm…";`);
    await sleep(300);
    return js(`const r = document.querySelectorAll("#kb-p-stage .kb-p-ct")[${i}]; return { fb: r.querySelector(".kb-p-fb").textContent, bad: [...r.querySelectorAll(".kb-p-g-bad, .kb-p-miss")].map((x) => x.textContent).join("|") };`);
  }
  let g = await typeCt(0, 'Nächste Woche gibt es kein Herbstfest.');
  ok(!/^Đúng rồi/.test(g.fb), 'sai một từ (kein) → chưa đúng: ' + g.fb.slice(0, 50));
  g = await typeCt(0, 'Naechste Woche gibt es ein Herbstfest');
  ok(/^Đúng rồi/.test(g.fb), 'gõ ae thay ä, thiếu dấu chấm → ' + g.fb.slice(0, 40));
  g = await typeCt(1, 'die katze ist sehr suess');
  ok(/^Đúng rồi/.test(g.fb), 'câu 2: chữ thường + ss thay ß → ' + g.fb.slice(0, 40));
  await shot('135_e2e_05_chep_duc');

  console.log('== 7. báo tiếng Pháp');
  await js('const t = [...document.querySelectorAll(".kb-p-tab")].find((x) => x.getAttribute("data-ptab") === "shelf"); t.click(); return 1;');
  await waitFor('return !!document.querySelector(".kb-p-langs .kb-ai-chip");', 8000);
  const bar = await js('const b = document.querySelector(".kb-p-langs"); return b ? [...b.querySelectorAll(".kb-ai-chip")].map((x) => x.textContent) : [];');
  ok(bar.length === 2 && /Báo tiếng Đức/.test(bar.join()) && /Báo tiếng Pháp/.test(bar.join()), 'thanh chuyển báo: ' + bar.join(' · '));
  const shelf = await js('return [...document.querySelectorAll("#kb-p-stage .kb-p-row-title")].map((x) => x.textContent + "@" + x.lang);');
  ok(shelf.length >= 1 && shelf.every((x) => /@de$/.test(x)), 'Kệ báo tiếng Đức: ' + shelf.join(' · '));
  await js('const b = [...document.querySelectorAll(".kb-p-langs .kb-ai-chip")].find((x) => /tiếng Pháp/.test(x.textContent)); b.click(); return 1;');
  await waitFor('return [...document.querySelectorAll("#kb-p-stage .kb-p-row-title")].some((x) => x.lang === "fr");', 8000);
  await js('document.querySelector("#kb-p-stage .kb-p-row").click(); return 1;');
  ok(await waitFor('const n = document.querySelector("#kb-p-stage .kb-p-name"); return n && n.textContent === "Le Jardin des Mots";', 8000), 'đầu báo Le Jardin des Mots');
  const fm = await js(`const m = document.querySelectorAll("#kb-p-stage .kb-p-meta > div");
    return { date: m[0].textContent, no: m[1].textContent, art: [...document.querySelectorAll("#kb-p-stage .kb-p-art")].map((a) => a.lang), text: document.getElementById("kb-p-stage").innerText };`);
  ok(/^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche) (1er|\d{1,2}) [a-zéû]+ \d{4}$/.test(fm.date) && fm.no === 'N° 1' && fm.art.every((l) => l === 'fr'),
    'ngày kiểu Pháp: ' + fm.date + ' · ' + fm.no);
  ok(!JP.test(fm.text.replace(/StackChan/g, '')), 'không chữ Nhật trong báo tiếng Pháp');
  const fw = await js('return [...document.querySelectorAll("#kb-p-stage .kb-p-w")].map((x) => x.textContent + "→" + x.getAttribute("data-k"));');
  ok(fw.indexOf("yeux→l'œil") >= 0 && fw.indexOf('feuilles→la feuille') >= 0 && fw.indexOf('pris→prendre') >= 0,
    'gạch chân: ' + fw.filter((x) => /yeux|feuilles|pris/.test(x)).join(' '));
  await js(`[...document.querySelectorAll("#kb-p-stage .kb-p-w")].find((x) => x.textContent === "yeux").click(); return 1;`); await sleep(400);
  const fi = await js('const i = document.getElementById("kb-p-info"); return [(i.querySelector(".kb-p-iw") || {}).textContent, (i.querySelector(".kb-p-im") || {}).textContent, (i.querySelector(".kb-p-inote") || {}).textContent];');
  ok(fi[0] === "l'œil" && /mắt/.test(fi[1] || ''), 'tra yeux → l\'œil · ' + fi[1]);
  // đang xem deck tiếng Đức: vườn là cây tiếng Đức → báo tiếng Pháp không tìm nhầm cây
  ok(!/Cây trong vườn/.test(fi[2] || ''), 'vườn đang là deck tiếng Đức → không hiện cây cho từ tiếng Pháp: ' + fi[2]);
  await shot('135_e2e_06_bao_phap');
  g = await typeCt(0, 'la semaine prochaine il y a une fete d’automne');
  ok(/^Đúng rồi/.test(g.fb), 'chép không dấu, dấu nháy cong, không dấu phẩy → ' + g.fb.slice(0, 40));
  g = await typeCt(1, 'Le chien est très mignon.');
  ok(!/^Đúng rồi/.test(g.fb), 'sai một từ (chien) → chưa đúng: ' + g.fb.slice(0, 40));

  console.log('== 8. Chép hằng ngày (deck tiếng Đức) + hợp đồng dữ liệu');
  await js('GardenPaper.close(); return 1;'); await sleep(300);
  await deck('DE::A2');
  await js('document.getElementById("kb-paper-btn").click(); return 1;');
  await waitFor('return !document.getElementById("kb-paper").hidden;');
  await js('const t = [...document.querySelectorAll(".kb-p-tab")].find((x) => x.getAttribute("data-ptab") === "dict"); t.click(); return 1;');
  const dl = await waitFor('const r = document.querySelectorAll("#kb-p-stage .kb-p-ct"); return r.length ? { n: r.length, lang: r[0].querySelector("input") && r[0].querySelector("input").lang, info: document.getElementById("kb-p-info").textContent } : null;', 10000);
  ok(dl && dl.n > 0 && dl.lang === 'de', 'lượt chép của deck tiếng Đức: ' + (dl && dl.n) + ' câu / từ, lang=de');
  ok(dl && /ae/.test(dl.info) && /ss/.test(dl.info), 'gợi ý chép: ' + (dl && dl.info));
  await shot('135_e2e_07_chep_hang_ngay');
  const keys1 = await py(KB + 'result = sorted(k for k in mw.col.all_config() if k.startswith("kotoba_batake"))');
  const added = keys1.filter((k) => keys0.indexOf(k) < 0);
  const OLD = ['kotoba_batake_paper', 'kotoba_batake_paper_en', 'kotoba_batake_paper_vi', 'kotoba_batake_paper_nguon', 'kotoba_batake_paper_sub',
    'kotoba_batake_rev', 'kotoba_batake_words_src', 'kotoba_batake_events', 'kotoba_batake_guests', 'kotoba_batake_life', 'kotoba_batake_more',
    'kotoba_batake_state', 'kotoba_batake_fields', 'kotoba_batake_paper_src'];
  ok(added.every((k) => OLD.indexOf(k) >= 0 || k === 'kotoba_batake_paper_de' || k === 'kotoba_batake_paper_fr'), 'khoá collection mới (trong lúc test): ' + added.join(', '));
  ok(added.indexOf('kotoba_batake_paper_de') >= 0 && added.indexOf('kotoba_batake_paper_fr') >= 0, 'tiến độ báo tiếng Đức / Pháp ở kotoba_batake_paper_de / _fr');
  const jsErr = await js('return window.__errs || [];');
  ok(!jsErr.length, 'không lỗi JS' + (jsErr.length ? ': ' + jsErr.slice(0, 3).join(' | ') : ''));
  const errs2 = await py(KB + 'result = kb.ERRORS.entries()');
  ok(!errs2 || !errs2.length, 'nhật ký lỗi add-on trống' + (errs2 && errs2.length ? ': ' + JSON.stringify(errs2).slice(0, 600) : ''));
  await py(KB + `for b in kb.AI_DIRS.values():
    if os.path.isdir(os.path.join(b, "bao_e2e_cat")) and not os.path.isdir(os.path.join(b, "bao")):
        os.rename(os.path.join(b, "bao_e2e_cat"), os.path.join(b, "bao"))
result = 1`);

  console.log('KẾT QUẢ: ' + pass + '/' + total + (pass === total ? ' — TẤT CẢ OK' : ''));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e && e.stack || e); process.exit(1); });
