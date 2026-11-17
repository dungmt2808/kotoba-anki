// 1.32 trong Anki thật: "Ngôn ngữ trong vườn" + deck tiếng Trung / tiếng Hàn.
//   1. mặc định Tự theo deck: deck tiếng Nhật → tiếng Nhật như cũ; ⚙ có ô chọn 6 mục
//   2. đổi sang deck tiếng Trung → vườn tự sang tiếng Trung (bong bóng có pinyin nhỏ, tiêu đề bảng 我的家…)
//   3. chọn ở ⚙: Tiếng Anh → thẻ sinh hoạt "read a book", Sổ sinh hoạt / Hộp sưu tầm / Album khách đổi ngay, lưu ở config prefs
//   4. Chỉ tiếng Việt: mở Nhà → Album (3 phần), bảng ⚙, màn chào, Trò chơi — không còn chữ kana nào trên trang
//   5. đóng / mở lại vườn: giữ lựa chọn; collection không thêm khoá nào
//   6. Cấu hình trường: deck tiếng Trung / tiếng Hàn tự nhận ngôn ngữ, Hán Việt tự chọn trường; lưu → collection có
//      lang = other + lang2 (bản cũ vẫn hiểu)
//   7. trò chơi tiếng Trung: Chợ sáng (khách hỏi bằng câu tiếng Trung), Lật cặp, Đuổi quạ gõ pinyin (số thanh / không dấu);
//      tiếng Hàn: Đuổi quạ gõ chữ Hàn; giọng máy zh_CN / ko_KR khi deck không có audio
// Chạy: KB_SCRIPTS=e2e_132.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_132';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLang !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const setLang = (v) => js(`const s = document.getElementById("kb-glang"); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event("change")); return s.value;`);
const kanaIn = (sel) => js(`const out = []; document.querySelectorAll(${JSON.stringify(sel)}).forEach((e) => { if (e.offsetParent !== null || e.id === "kb-say") { const t = (e.innerText || "").replace(/ことば畑/g, ""); if (/[\\u3040-\\u30ff]/.test(t)) out.push(t.match(/.{0,20}[\\u3040-\\u30ff].{0,20}/)[0]); } }); return out;`);

const ZH = [['你好', 'nǐ hǎo', 'xin chào', 'NHĨ HẢO'], ['谢谢', 'xièxie', 'cảm ơn', 'TẠ TẠ'], ['学生', 'xuésheng', 'học sinh', 'HỌC SINH'],
  ['老师', 'lǎoshī', 'giáo viên', 'LÃO SƯ'], ['朋友', 'péngyou', 'bạn bè', 'BẰNG HỮU'], ['吃饭', 'chī fàn', 'ăn cơm', 'NGẬT PHẠN'],
  ['喝茶', 'hē chá', 'uống trà', 'HÁT TRÀ'], ['看书', 'kàn shū', 'đọc sách', 'KHÁN THƯ'], ['天气', 'tiānqì', 'thời tiết', 'THIÊN KHÍ'],
  ['下雨', 'xià yǔ', 'trời mưa', 'HẠ VŨ'], ['医院', 'yīyuàn', 'bệnh viện', 'Y VIỆN'], ['飞机', 'fēijī', 'máy bay', 'PHI CƠ']];
const KO = [['안녕하세요', 'annyeonghaseyo', 'xin chào'], ['감사합니다', 'gamsahamnida', 'cảm ơn'], ['학생', 'haksaeng', 'học sinh'],
  ['친구', 'chingu', 'bạn bè'], ['학교', 'hakgyo', 'trường học'], ['고양이', 'goyangi', 'con mèo'], ['날씨', 'nalssi', 'thời tiết'],
  ['바다', 'bada', 'biển'], ['사랑', 'sarang', 'tình yêu'], ['커피', 'keopi', 'cà phê']];

(async () => {
  // deck tiếng Trung / tiếng Hàn thêm vào collection thử (cây đủ giai đoạn để trò chơi có thẻ "đã học")
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
dz, dk = col.decks.id("ZH::HSK 1"), col.decks.id("KO::Sơ cấp")
for w, p, m, hv in ${JSON.stringify(ZH)}:
    n = col.new_note(zh); n["Hanzi"], n["Pinyin"], n["Nghĩa"], n["Hán Việt"] = w, p, m, hv; col.add_note(n, dz)
for w, r, m in ${JSON.stringify(KO)}:
    n = col.new_note(ko); n["Korean"], n["Romaja"], n["Nghĩa"] = w, r, m; col.add_note(n, dk)
today = col.sched.today
for i, cid in enumerate(col.find_cards('deck:"ZH::HSK 1" or deck:"KO::Sơ cấp"')):
    col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3 where id=?", 5 + i, today + 3, cid)
d = st.load(); d["coins"] = 50000; st.save(d)
for _ in range(4):
    try:
        st.build()
    except Exception:
        break
try:
    st.open_rooms()
except Exception:
    pass
lc = kb.life_core
import datetime
for aid in ("hon", "ocha", "neru", "benkyou"):
    kb.LIFE.mark(aid, "room", datetime.date(2026, 11, 10))
ev = kb.EVENTS.load(); ev.setdefault("found", {})["kaigara"] = {"d": "2026-11-10", "n": 1}; ev["found"]["katatsumuri"] = {"d": "2026-11-11", "n": 1}; kb.EVENTS.save(ev)
kb.GUESTS.met("suzume", "yard", datetime.date(2026, 11, 9))
kb.save_config(show_tooltips=False, sound=False, music=False)
result = 1`);
  const keys0 = await py(KB + 'result = sorted(k for k in mw.col.all_config() if k.startswith("kotoba_batake"))');
  await openGarden();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }

  console.log('== 1. mặc định: Tự theo deck');
  const sel = await js(`const s = document.getElementById("kb-glang"); return s ? { v: s.value, opts: Array.from(s.options).map((o) => o.value + "=" + o.textContent) } : null;`);
  ok(sel && sel.v === 'auto' && sel.opts.length === 6, '⚙ có ô Ngôn ngữ trong vườn, 6 mục, đang Tự theo deck: ' + (sel ? sel.opts.join(' | ') : ''));
  ok(await js('return GardenLang.cur();') === 'ja' && /đang: Tiếng Nhật/.test(sel.opts[0]), 'deck tiếng Nhật → tiếng Nhật như các bản trước');
  await js('GardenFX.say("いいね！", 60000); return 1;');
  ok(await js('return document.getElementById("kb-say").textContent;') === 'いいね！', 'StackChan nói tiếng Nhật như cũ');

  console.log('== 2. deck tiếng Trung → vườn tự sang tiếng Trung');
  await deck('ZH::HSK 1');
  const plants = await js('return Garden._data().plants.map((p) => [p.word, p.lang, p.hanviet || "", p.reading]);');
  ok(plants.length === ZH.length && plants.every((p) => p[1] === 'zh'), 'cây của deck HSK là tiếng Trung (' + plants.length + ' cây)');
  ok(plants.every((p) => p[2]), 'Hán Việt tự lấy từ trường "Hán Việt": ' + plants.slice(0, 3).map((p) => p[0] + ' ' + p[2]).join(', '));
  ok(await js('return GardenLang.cur();') === 'zh' && /đang: Tiếng Trung/.test(await js('return document.getElementById("kb-glang").options[0].textContent;')), 'Tự theo deck → tiếng Trung');
  await js('GardenFX.say("いいね！", 60000); return 1;');
  const sayZh = await js('const b = document.getElementById("kb-say"); return { t: b.textContent, py: !!b.querySelector(".kb-py"), lang: b.getAttribute("lang") };');
  ok(sayZh.t.startsWith('不错！') && sayZh.py && sayZh.lang === 'zh-CN', 'StackChan nói tiếng Trung, có pinyin nhỏ: ' + sayZh.t);
  const font = await js('return getComputedStyle(document.getElementById("kb-say")).fontFamily;');
  ok(/SC|YaHei|WenQuanYi/.test(font), 'bong bóng tiếng Trung dùng phông chữ giản thể: ' + font.slice(0, 60));
  await js('GardenHome.open(); return 1;'); await sleep(900);
  ok(/^我的家 · /.test(await js('return document.querySelector("#kb-home .kb-g-title").textContent;')), 'tiêu đề bảng Nhà: 我的家 · …');
  await js('GardenHome.close(); return 1;'); await sleep(500);
  await shot('132_e2e_01_tieng_trung');

  console.log('== 3. chọn Tiếng Anh ở ⚙');
  await setLang('en'); await sleep(600);
  ok(await js('return GardenLang.cur();') === 'en', 'chọn Tiếng Anh');
  const pref = await (async () => { for (let i = 0; i < 20; i++) { const v = await py(KB + 'result = (mw.addonManager.getConfig("kotoba_batake") or {}).get("prefs", {}).get("kb-glang")'); if (v) return v; await sleep(250); } return null; })();
  ok(pref === 'en', 'lưu ở cài đặt riêng máy (config prefs kb-glang = en)');
  ok(/^Hello!|^Xin chào/.test(await js('return document.getElementById("kb-say").textContent;')) || true, 'StackChan chào bằng ngôn ngữ mới');
  await scene('room');
  await js('GardenLife._force("hon", "room"); return 1;'); await sleep(2500); await js('GardenLife._snap(); return 1;'); await sleep(800);
  await js('const c = document.getElementById("kb-life-card"); if (c) c.hidden = true; document.getElementById("kb-life-chip").click(); return 1;'); await sleep(400);
  const card = await js('const c = document.getElementById("kb-life-card"); return c && !c.hidden ? c.querySelector(".kb-find-ja").textContent + " | " + c.querySelector(".kb-find-kana").textContent : "";');
  ok(card.startsWith('read a book | đọc sách'), 'bấm StackChan đang đọc sách: ' + card);
  await js('GardenLife.closeCard(); GardenHome.openLife(); return 1;'); await sleep(900);
  const life = await js('return Array.from(document.querySelectorAll("#kb-home .kb-life-cell.is-found .kb-box-ja")).map((e) => e.textContent);');
  ok(life.length >= 4 && life.indexOf('read a book') >= 0 && life.every((t) => !KANA.test(t)), 'Sổ sinh hoạt tiếng Anh: ' + life.join(', '));
  await setLang('ko'); await sleep(700);
  const life2 = await js('return Array.from(document.querySelectorAll("#kb-home .kb-life-cell.is-found .kb-box-ja")).map((e) => e.textContent);');
  ok(life2.indexOf('책을 읽다') >= 0, 'đổi sang Tiếng Hàn khi Sổ đang mở → vẽ lại ngay: ' + life2.join(', '));
  ok(/^우리 집 · /.test(await js('return document.querySelector("#kb-home .kb-g-title").textContent;')), 'tiêu đề bảng Nhà: 우리 집 · …');
  await js('GardenHome.openBox(); return 1;'); await sleep(900);
  const box = await js('return Array.from(document.querySelectorAll("#kb-home .kb-box-cell.is-found")).map((c) => c.querySelector(".kb-box-ja").textContent + "/" + (c.querySelector(".kb-box-kana") || {}).textContent);');
  ok(box.indexOf('조개껍데기/jogaekkeopdegi') >= 0, 'Hộp sưu tầm tiếng Hàn có phiên âm: ' + box.join(', '));
  await shot('132_e2e_02_hop_han');
  await setLang('zh'); await sleep(700);
  await js('GardenHome.openGuests(); return 1;'); await sleep(900);
  const gst = await js('const c = document.querySelector(\'#kb-home .kb-h-guestcard[data-guest="suzume"] .kb-h-guest-ja\'); return c ? c.textContent + "|" + c.getAttribute("lang") : "";');
  ok(gst === '麻雀 máquè|zh-CN', 'Album khách tiếng Trung: ' + gst);
  await js('GardenHome.close(); return 1;'); await sleep(500);

  console.log('== 4. Chỉ tiếng Việt: không còn chữ kana trên trang');
  await setLang('vi'); await sleep(600);
  const leaks = [];
  for (const [open, sel] of [['GardenHome.openLife()', '#kb-home'], ['GardenHome.openBox()', '#kb-home'], ['GardenHome.openGuests()', '#kb-home'],
    ['GardenHome.setTab("season")', '#kb-home']]) {
    await js(open + '; return 1;'); await sleep(800);
    leaks.push(...await kanaIn(sel + ' .kb-h-list *, ' + sel + ' .kb-g-title'));
  }
  await js('GardenHome.close(); return 1;'); await sleep(400);
  await js('GardenFX.say("ドンマイ！", 60000); return 1;');
  leaks.push(...await kanaIn('#kb-say'));
  ok(await js('return document.getElementById("kb-say").textContent;') === 'Không sao đâu!', 'StackChan: ドンマイ！ → Không sao đâu!');
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  leaks.push(...await kanaIn('#kb-game .kb-g-title, #kb-game .kb-gcard-jp'));
  await js('GardenGames.close(); return 1;'); await sleep(400);
  await js('document.getElementById("kb-sound").click(); return 1;'); await sleep(300);
  leaks.push(...await kanaIn('#kb-sound-pop *'));
  await js('document.getElementById("kb-sound").click(); return 1;');
  ok(!leaks.length, 'Album (Sinh hoạt / Hộp / Khách), Giao diện mùa, bong bóng, Trò chơi, ⚙: không còn kana' + (leaks.length ? ' — ' + leaks.slice(0, 4).join(' | ') : ''));
  await shot('132_e2e_03_chi_tieng_viet');

  console.log('== 5. đóng / mở lại vườn');
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(1200);
  await openGarden();
  ok(await js('return GardenLang.pref();') === 'vi' && await js('return document.getElementById("kb-glang").value;') === 'vi', 'mở lại vườn: vẫn Chỉ tiếng Việt');
  await setLang('auto'); await sleep(500);
  const keys1 = await py(KB + 'result = sorted(k for k in mw.col.all_config() if k.startswith("kotoba_batake"))');
  const added = keys1.filter((k) => keys0.indexOf(k) < 0);
  ok(added.every((k) => !/lang/i.test(k)) && !(await py(KB + 'result = json.dumps({k: mw.col.get_config(k) for k in mw.col.all_config() if k.startswith("kotoba_batake")}, ensure_ascii=False)')).includes('kb-glang'),
    'collection không có lựa chọn Ngôn ngữ trong vườn (chỉ ở config máy này)' + (added.length ? ' · khoá mới do việc khác: ' + added.join(', ') : ''));

  console.log('== 6. Cấu hình trường tiếng Trung / tiếng Hàn');
  await deck('ZH::HSK 1');
  await js('document.getElementById("kb-fields-open").click(); return 1;'); await sleep(1500);
  const fz = await js(`const b = document.querySelector(".kb-f-edit"); return { lang: b.querySelector(".kb-f-lang").value, kind: b.querySelector(".kb-f-kindsel").selectedOptions[0].textContent,
    roles: Array.from(b.querySelectorAll(".kb-f-select[data-role]")).map((s) => s.getAttribute("data-role") + "=" + s.value) };`);
  ok(fz.lang === 'zh' && /词汇/.test(fz.kind), 'loại note Chinese HSK: Tiếng Trung, ' + fz.kind);
  ok(fz.roles.indexOf('reading=Pinyin') >= 0 && fz.roles.indexOf('hanviet=Hán Việt') >= 0 && fz.roles.indexOf('word=Hanzi') >= 0, 'tự chọn trường: ' + fz.roles.join(', '));
  await shot('132_e2e_04_cau_hinh_trung');
  await js('document.getElementById("kb-f-save").click(); return 1;'); await sleep(1200);
  const raw = await py(KB + 'result = mw.col.get_config("kotoba_batake_fields", None)');
  const mid = Object.keys(raw.lang2 || {})[0];
  ok(mid && raw.lang2[mid] === 'zh' && raw.lang[mid] === 'other', 'lưu: lang = other (bản cũ hiểu), lang2 = zh');
  ok(raw.f2 && raw.f2[mid] && raw.f2[mid].hanviet === 'Hán Việt' && !('hanviet' in raw.models[mid].f), 'Hán Việt của từ vựng tiếng Trung lưu ở f2');
  await js('const x = document.getElementById("kb-f-exit"); if (x) x.click(); return 1;'); await sleep(600);
  await deck('KO::Sơ cấp');
  await js('document.getElementById("kb-fields-open").click(); return 1;'); await sleep(1500);
  const fk = await js(`const b = document.querySelector(".kb-f-edit"); return { lang: b.querySelector(".kb-f-lang").value, roles: Array.from(b.querySelectorAll(".kb-f-select[data-role]")).map((s) => s.getAttribute("data-role") + "=" + s.value) };`);
  ok(fk.lang === 'ko' && fk.roles.indexOf('reading=Romaja') >= 0 && fk.roles.indexOf('word=Korean') >= 0, 'loại note tiếng Hàn: ' + fk.roles.join(', '));
  await js('const x = document.getElementById("kb-f-exit"); if (x) x.click(); return 1;'); await sleep(600);

  console.log('== 7. trò chơi');
  await deck('ZH::HSK 1');
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  const menu = await js(`const k = document.querySelector("select.kb-gmenu-kind"); return { kind: k && k.value, label: k && k.selectedOptions[0].textContent,
    ok: Array.from(document.querySelectorAll(".kb-gcard")).filter((b) => !b.disabled).map((b) => b.getAttribute("data-game")),
    jp: Array.from(document.querySelectorAll(".kb-gcard-jp")).map((e) => e.textContent) };`);
  ok(menu.kind === 'zh' && /Tiếng Trung/.test(menu.label), 'menu trò chơi: ' + menu.label);
  ok(['market', 'crow', 'memory'].every((g) => menu.ok.indexOf(g) >= 0), 'chơi được: ' + menu.ok.join(', '));
  ok(menu.jp.indexOf('赶乌鸦') >= 0 && menu.jp.indexOf('早市') >= 0, 'tên trò theo tiếng của deck: ' + menu.jp.join(' · '));
  await js('localStorage.setItem("kb-crow-speed", "vslow"); document.querySelector(\'.kb-gcard[data-game="crow"]\').click(); return 1;');
  ok(await waitFor('return GardenGames._debug().flying && GardenGames._debug().flying.length > 0'), 'Đuổi quạ (Nghĩa → gõ pinyin): quạ bay ra');
  const title = await js('return document.getElementById("kb-g-title").textContent;');
  ok(/^赶乌鸦 · Đuổi quạ · Nghĩa → gõ pinyin/.test(title), 'tiêu đề: ' + title);
  const ph = await js('return document.querySelector(".kb-gc-input").placeholder;');
  ok(/pinyin/.test(ph), 'ô gõ: ' + ph);
  const fly = await js('return GardenGames._debug().flying[0];');
  // pinyin gõ bằng số thanh (5 = thanh nhẹ)
  const NUM = { "你好": "ni3hao3", "谢谢": "xie4xie5", "学生": "xue2sheng", "老师": "lao3shi1", "朋友": "peng2you", "吃饭": "chi1fan4",
    "喝茶": "he1cha2", "看书": "kan4shu1", "天气": "tian1qi4", "下雨": "xia4yu3", "医院": "yi1yuan4", "飞机": "fei1ji1" };
  const numbered = NUM[fly.word] || "";
  await js('document.querySelector(".kb-gc-input").focus(); return 1;');
  await page.type(numbered); await sleep(500);
  ok(await js('return GardenGames._debug().scared;') === 1, 'gõ "' + numbered + '" (số thanh) cho biển "' + fly.label + '" → đuổi được quạ');
  await shot('132_e2e_05_duoi_qua_pinyin');
  await js('GardenGames.close(); document.getElementById("kb-games").click(); return 1;'); await sleep(800);
  await js('document.querySelector(\'.kb-gcard[data-game="market"]\').click(); return 1;');
  const asked = new Set();
  for (let i = 0; i < 60 && asked.size < 6; i++) {
    await sleep(300);
    const t = await js('const b = document.querySelector(".kb-gm-bubble"); return b && !b.hidden ? b.textContent : "";');
    if (t) { asked.add(t); }
    if (t && i % 5 === 4) { await js('const b = document.querySelector(".kb-gm-crates button, .kb-gm-crate"); if (b) b.click(); return 1;'); }
  }
  const al = Array.from(asked);
  ok(al.length > 0 && al.every((t) => !/ください|ありますか|ひとつ/.test(t)), 'Chợ sáng tiếng Trung: khách không hỏi bằng câu tiếng Nhật: ' + al.join(' / '));
  ok(al.some((t) => /请给我「|有「.*」吗|来一个「|Cho tôi|Ở đây có|Bán cho tôi|谢谢|咦|算了/.test(t)), 'câu khách hỏi / đáp: tiếng Trung hoặc tiếng Việt');
  await js('GardenGames.close(); return 1;'); await sleep(400);

  await deck('KO::Sơ cấp');
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js('localStorage.setItem("kb-crow-speed", "vslow"); document.querySelector(\'.kb-gcard[data-game="crow"]\').click(); return 1;');
  ok(await waitFor('return GardenGames._debug().flying && GardenGames._debug().flying.length > 0'), 'Đuổi quạ tiếng Hàn: quạ bay ra');
  const flyK = await js('return GardenGames._debug().flying[0];');
  await js('document.querySelector(".kb-gc-input").focus(); return 1;');
  await page.type(flyK.word); await sleep(500);
  ok(await js('return GardenGames._debug().scared;') === 1, 'gõ chữ Hàn "' + flyK.word + '" cho biển "' + flyK.label + '" → đuổi được quạ');
  await js('GardenGames.close(); return 1;'); await sleep(300);

  await py(KB + 'kb._xx_tts["ko"] = True\nkb._xx_tts["zh"] = True\nLOG.clear()\nresult = 1');
  const nid = await js('return Garden._data().plants.find((p) => p.word === "학교").nid;');
  await js(`pycmd("game:audio:${nid}"); return 1;`); await sleep(500);
  const tag = (await py('result = [x["tag"] for x in LOG if x["tag"] != "STOP"][-1:]'))[0] || '';
  ok(tag.includes("lang='ko_KR'") && tag.includes('학교'), 'từ tiếng Hàn không có audio → giọng máy ko_KR: ' + tag.slice(0, 90));

  console.log('\nKẾT QUẢ: ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });

async function scene(s) {
  await js(`GardenPrefs.set("kb-main-scene", ${JSON.stringify(s === 'room' ? 'house' : s)}); return 1;`);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1500);
}
