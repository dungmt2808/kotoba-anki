// 1.32 — kiểm tra lần cuối trong Anki thật, kịch bản NGOÀI các test có sẵn (người dùng 17/11: "kiểm tra lại logic, giao diện,
// tính năng, lần cuối nhé. test kỹ hơn, tạo kịch bản test ngoài các test đã có sẵn, có làm mất dữ liệu không").
//   1. dữ liệu: chỉ xem / đổi ngôn ngữ (40 lần, mở đủ bảng, đóng mở lại vườn) → collection + user_files KHÔNG đổi một byte
//   2. Album đầy đủ (67 sinh hoạt, 42 đồ nhặt, 16 khách, tường / sàn, mùa) ở 5 ngôn ngữ × 2 cỡ cửa sổ: chữ không tràn ô,
//      không lẫn chữ Nhật (trừ tên add-on), ảnh chụp để xem bằng mắt
//   3. đổi ngôn ngữ dồn dập khi đang mở Nhà / Trò chơi / Lịch hoa / Cấu hình trường / ⚙ / thẻ sinh hoạt — không lỗi JS
//   4. đổi ngôn ngữ giữa lúc đang chơi Đuổi quạ: trò vẫn chạy, chữ của trò vẫn theo deck
//   5. deck tiếng Trung đã cấu hình ở bản cũ ("Ngôn ngữ khác"): vườn nhận lại tiếng Trung; chọn "Ngôn ngữ khác" thì giữ
//   6. Lịch hoa ngày có sinh hoạt / đồ nhặt mới: tên theo ngôn ngữ; màn chào ngày lễ ở Chỉ tiếng Việt / tiếng Trung
//   7. từ vựng trùng câu StackChan (すごい) trong câu "lên giai đoạn" không bị dịch
//   8. deck cha có cả Nhật + Trung + Hàn: Tự theo deck chọn ngôn ngữ nhiều cây nhất, đổi deck → đổi theo
// Chạy: KB_SCRIPTS=e2e_132b.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_132b';
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
const KB = 'import sys, os, time, json, hashlib\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
const shot = (n) => page.shot(SHOTS + '/' + n + '.png');
async function deck(name) { await py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`); await sleep(1800); }
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await sleep(600);
}
const setLang = (v) => js(`const s = document.getElementById("kb-glang"); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event("change")); return s.value;`);
// ảnh chụp dữ liệu: mọi khoá kotoba_batake_* (trừ dấu phiên bản), mọi file user_files (băm), số dòng revlog / note / thẻ
const SNAP = KB + `res = {}
for k in sorted(mw.col.all_config()):
    if k.startswith("kotoba_batake") and k != "kotoba_batake_rev":
        res["col:" + k] = hashlib.sha1(json.dumps(mw.col.get_config(k), sort_keys=True, ensure_ascii=False).encode()).hexdigest()
uf = os.path.join(kb.ADDON_DIR, "user_files")
for root, _d, files in os.walk(uf):
    for f in files:
        p = os.path.join(root, f)
        if "/logs/" in p or f.endswith((".log", ".tmp")):
            continue
        res["file:" + os.path.relpath(p, uf)] = hashlib.sha1(open(p, "rb").read()).hexdigest()
res["revlog"] = mw.col.db.scalar("select count() from revlog")
res["notes"] = mw.col.db.scalar("select count() from notes")
res["cards"] = mw.col.db.scalar("select sum(due + ivl + queue) from cards")
result = res`;
const diff = (a, b) => Object.keys(Object.assign({}, a, b)).filter((k) => a[k] !== b[k]);
const LANGS = ['ja', 'en', 'zh', 'ko', 'vi'];

const ZH = [['你好', 'nǐ hǎo', 'xin chào', 'NHĨ HẢO'], ['谢谢', 'xièxie', 'cảm ơn', 'TẠ TẠ'], ['学生', 'xuésheng', 'học sinh', 'HỌC SINH'],
  ['老师', 'lǎoshī', 'giáo viên', 'LÃO SƯ'], ['朋友', 'péngyou', 'bạn bè', 'BẰNG HỮU'], ['吃饭', 'chī fàn', 'ăn cơm', 'NGẬT PHẠN'],
  ['喝茶', 'hē chá', 'uống trà', 'HÁT TRÀ'], ['看书', 'kàn shū', 'đọc sách', 'KHÁN THƯ'], ['天气', 'tiānqì', 'thời tiết', 'THIÊN KHÍ'],
  ['下雨', 'xià yǔ', 'trời mưa', 'HẠ VŨ'], ['医院', 'yīyuàn', 'bệnh viện', 'Y VIỆN'], ['飞机', 'fēijī', 'máy bay', 'PHI CƠ'],
  ['电脑', 'diànnǎo', 'máy tính', 'ĐIỆN NÃO'], ['今天', 'jīntiān', 'hôm nay', 'KIM THIÊN']];
const KO = [['안녕하세요', 'annyeonghaseyo', 'xin chào'], ['감사합니다', 'gamsahamnida', 'cảm ơn'], ['학생', 'haksaeng', 'học sinh'],
  ['친구', 'chingu', 'bạn bè'], ['학교', 'hakgyo', 'trường học'], ['고양이', 'goyangi', 'con mèo']];

(async () => {
  await py(KB + `import datetime
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
dz, dk = col.decks.id("Mix::Trung"), col.decks.id("Mix::Hàn")
for w, p, m, hv in ${JSON.stringify(ZH)}:
    n = col.new_note(zh); n["Hanzi"], n["Pinyin"], n["Nghĩa"], n["Hán Việt"] = w, p, m, hv; col.add_note(n, dz)
for w, r, m in ${JSON.stringify(KO)}:
    n = col.new_note(ko); n["Korean"], n["Romaja"], n["Nghĩa"] = w, r, m; col.add_note(n, dk)
today = col.sched.today
for i, cid in enumerate(col.find_cards('deck:"Mix::Trung" or deck:"Mix::Hàn"')):
    col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3 where id=?", 5 + i, today + 3, cid)
d = st.load(); d["coins"] = 200000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
try:
    st.open_rooms()
except Exception:
    pass
for z in kb.core.ZONE_IDS:
    try:
        st.unlock_zone(z)
    except Exception:
        pass
lc = kb.life_core
t0 = kb.cal_today() if hasattr(kb, "cal_today") else datetime.date.today()
for i, aid in enumerate(lc.ACTS):
    w = lc.ACTS[aid]["where"]
    kb.LIFE.mark(aid, "room" if w == "home" else ("yard" if w in ("yard", "out") else w), t0 - datetime.timedelta(days=1 + i % 20))
ev = kb.EVENTS.load(); fd = ev.setdefault("found", {})
for i, fid in enumerate(kb.finds.FINDS):
    fd[fid] = {"d": (t0 - datetime.timedelta(days=1 + i % 20)).isoformat(), "n": 1}
kb.EVENTS.save(ev)
for i, gid in enumerate(kb.guests.GUESTS):
    kb.GUESTS.met(gid, "yard", t0 - datetime.timedelta(days=1 + i % 20))
    # 1.33.4: khách ghé thật lúc chạy test (khung 4 phút theo giờ) được ghi "gặp hôm nay" — ghi sẵn để bước "chỉ xem thì
    # dữ liệu không đổi" không phụ thuộc giờ chạy (một lần mỗi ngày: lần ghé sau không ghi thêm)
    kb.GUESTS.met(gid, "yard", t0)
kb.save_config(show_tooltips=False, sound=False, music=False)
result = str(t0)`);
  await openGarden();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(800);

  console.log('== 1. chỉ xem + đổi ngôn ngữ: dữ liệu không đổi');
  await deck('Mix::Trung');
  await setLang('auto'); await sleep(400);
  await js('GardenHome.open(); return 1;'); await sleep(700); await js('GardenHome.close(); return 1;'); await sleep(400);
  const before = await py(SNAP);
  page.errors.length = 0;
  const views = ['GardenHome.openLife()', 'GardenHome.openBox()', 'GardenHome.openGuests()', 'GardenHome.setTab("season")',
    'GardenHome.setTab("room")', 'GardenHome.close()', 'document.getElementById("kb-games").click()', 'GardenGames.close()',
    'GardenCal.open()', 'GardenCal.close()', 'document.getElementById("kb-fields-open").click()',
    'document.getElementById("kb-f-exit") && document.getElementById("kb-f-exit").click()',
    'document.getElementById("kb-sound").click()', 'document.getElementById("kb-sound").click()',
    'document.getElementById("kb-life-chip").click()', 'GardenLife.closeCard()', 'GardenUI.open()', 'GardenUI.close && GardenUI.close()'];
  let seed = 11; const rnd = (n) => { seed = (seed * 16807) % 2147483647; return seed % n; };
  for (let i = 0; i < 40; i++) {
    await js(views[rnd(views.length)] + '; return 1;').catch(() => 0);
    await setLang(['auto'].concat(LANGS)[rnd(6)]);
    await sleep(120 + rnd(250));
  }
  await js('GardenHome.close(); GardenGames.close(); GardenCal.close(); return 1;').catch(() => 0);
  await setLang('zh'); await sleep(500);
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(1200);
  await openGarden();
  await js('GardenHome.openLife(); return 1;'); await sleep(700); await js('GardenHome.close(); return 1;'); await sleep(400);
  const after = await py(SNAP);
  await deck('Mix::Trung');          // mở lại vườn là về deck đang chọn ở Anki
  const changed = diff(before, after);
  ok(Object.keys(before).length > 8 && !changed.length, 'đổi ngôn ngữ 40 lần xen mở / đóng mọi bảng, đóng mở lại vườn: ' +
    Object.keys(before).length + ' mục dữ liệu không đổi một byte' + (changed.length ? ' — đổi: ' + changed.join(', ') : ''));
  ok(!page.errors.length, '3. đổi ngôn ngữ dồn dập khi đang mở Nhà / Trò chơi / Lịch hoa / Cấu hình trường / ⚙ / thẻ sinh hoạt: không lỗi JS' +
    (page.errors.length ? ' — ' + page.errors.slice(0, 3).join(' | ') : ''));
  const pref = await py(KB + 'result = (mw.addonManager.getConfig("kotoba_batake") or {}).get("prefs", {}).get("kb-glang")');
  ok(pref === 'zh' && await js('return document.getElementById("kb-glang").value;') === 'zh', 'lựa chọn cuối (Tiếng Trung) được lưu và còn sau khi mở lại');

  console.log('== 2. Album đầy đủ ở 5 ngôn ngữ × 2 cỡ cửa sổ');
  const views2 = [['life', 'GardenHome.openLife()', '.kb-life-cell'], ['box', 'GardenHome.openBox()', '.kb-box-cell'],
    ['guest', 'GardenHome.openGuests()', '.kb-h-guestcard'], ['season', 'GardenHome.setTab("season")', '.kb-h-card'],
    ['decor', 'GardenHome.setTab("room"); (document.querySelector(\'[data-roomview="decor"]\') || {click(){}}).click()', '.kb-decor-card']];
  const over = [], leak = [], counts = {};
  for (const [w, h] of [[1366, 860], [900, 700]]) {
    await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(900);
    for (const lang of LANGS) {
      await setLang(lang); await sleep(300);
      for (const [name, open, cellSel] of views2) {
        await js(open + '; return 1;').catch(() => 0); await sleep(650);
        const r = await js(`const cells = Array.from(document.querySelectorAll("#kb-home ${cellSel}"));
          const bad = [], kana = [];
          cells.forEach((c) => {
            c.querySelectorAll(".kb-box-ja, .kb-box-kana, .kb-box-vi, .kb-life-name, .kb-h-name, .kb-h-guest-ja").forEach((e) => {
              if (e.offsetParent !== null && (e.scrollWidth > e.clientWidth + 2 || e.getBoundingClientRect().right > c.getBoundingClientRect().right + 2)) {
                bad.push(e.textContent.slice(0, 30));
              }
            });
            const t = c.innerText.replace(/ことば畑/g, "");
            if (${JSON.stringify(lang)} !== "ja" && /[\\u3040-\\u30ff]/.test(t)) { kana.push(t.slice(0, 30)); }
          });
          return { n: cells.length, bad: bad, kana: kana };`);
        counts[name] = Math.max(counts[name] || 0, r.n);
        r.bad.forEach((b) => over.push(w + 'px ' + lang + ' ' + name + ': ' + b));
        r.kana.forEach((b) => leak.push(lang + ' ' + name + ': ' + b));
        if ((lang === 'en' || lang === 'ko') && w === 900 && (name === 'life' || name === 'box')) { await shot('132b_' + name + '_' + lang + '_' + w); }
      }
      await js('GardenHome.close(); return 1;'); await sleep(300);
    }
  }
  ok(counts.life >= 60 && counts.box >= 40 && counts.guest >= 16, 'đủ ô: sinh hoạt ' + counts.life + ', đồ nhặt ' + counts.box + ', khách ' + counts.guest + ', mùa ' + counts.season + ', tường / sàn ' + counts.decor);
  ok(!over.length, 'không chữ nào tràn ô (5 ngôn ngữ × 2 cỡ cửa sổ)' + (over.length ? ' — ' + over.length + ' chỗ: ' + over.slice(0, 5).join(' | ') : ''));
  ok(!leak.length, 'ngoài Tiếng Nhật: không chữ kana nào trong Album' + (leak.length ? ' — ' + leak.slice(0, 4).join(' | ') : ''));
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(800);

  console.log('== 4. đổi ngôn ngữ giữa lúc đang chơi Đuổi quạ');
  await setLang('auto'); await sleep(300);
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js('localStorage.setItem("kb-crow-speed", "vslow"); document.querySelector(\'.kb-gcard[data-game="crow"]\').click(); return 1;');
  ok(await waitFor('return GardenGames._debug().flying && GardenGames._debug().flying.length > 0'), 'Đuổi quạ (deck tiếng Trung) chạy');
  page.errors.length = 0;
  for (const l of ['en', 'vi', 'ko', 'zh', 'ja']) { await setLang(l); await sleep(250); }
  const t2 = await js('return document.getElementById("kb-g-title").textContent;');
  ok(/^赶乌鸦 · /.test(t2), 'tiêu đề trò vẫn theo deck tiếng Trung: ' + t2);
  const fly = await js('return GardenGames._debug().flying[0];');
  await js('document.querySelector(".kb-gc-input").focus(); return 1;');
  const NUM = { '你好': 'nihao', '谢谢': 'xiexie', '学生': 'xuesheng', '老师': 'laoshi', '朋友': 'pengyou', '吃饭': 'chifan', '喝茶': 'hecha',
    '看书': 'kanshu', '天气': 'tianqi', '下雨': 'xiayu', '医院': 'yiyuan', '飞机': 'feiji', '电脑': 'diannao', '今天': 'jintian' };
  await page.type(NUM[fly.word] || ''); await sleep(500);
  ok(await js('return GardenGames._debug().scared;') >= 1 && !page.errors.length, 'vẫn chơi tiếp được (gõ "' + (NUM[fly.word] || '') + '"), không lỗi JS');
  await js('GardenGames.close(); return 1;'); await sleep(400);
  await setLang('auto'); await sleep(300);

  console.log('== 5. deck tiếng Trung đã cấu hình ở bản cũ');
  const mid = await py(KB + 'result = str(mw.col.models.by_name("Chinese HSK")["id"])');
  // đúng như 1.31.x lưu: lang = other, không có lang2 (bản cũ chưa có tiếng Trung)
  await py(KB + `raw = {"models": {${JSON.stringify(mid)}: {"kind": "vocab", "f": {"word": "Hanzi", "reading": "Pinyin", "meaning": "Nghĩa"}}}, "games": {}, "lang": {${JSON.stringify(mid)}: "other"}, "games_lang": {"other": {"crow": "answer"}}}
kb.backup_core.put_config(mw.col, "kotoba_batake_fields", raw)
kb._dialog.refresh(); result = 1`);
  await sleep(1800);
  const pl = await js('return Garden._data().plants.filter((p) => p.word === "你好").map((p) => p.lang);');
  ok(pl[0] === 'zh', 'loại note lưu "Ngôn ngữ khác" từ bản cũ → vườn nhận lại là tiếng Trung');
  await js('document.getElementById("kb-fields-open").click(); return 1;'); await sleep(1500);
  const fl = await js('const b = document.querySelector(".kb-f-edit"); return b ? b.querySelector(".kb-f-lang").value : "";');
  ok(fl === 'zh', 'Cấu hình trường hiện Tiếng Trung cho loại note đó');
  await js(`const s = document.querySelector(".kb-f-edit .kb-f-lang"); s.value = "other"; s.dispatchEvent(new Event("change")); return 1;`); await sleep(500);
  await js('document.getElementById("kb-f-save").click(); return 1;'); await sleep(1500);
  const raw = await py(KB + 'result = mw.col.get_config("kotoba_batake_fields", None)');
  ok(raw.lang[mid] === 'other' && raw.lang2 && raw.lang2[mid] === 'other', 'chọn "Ngôn ngữ khác" ở 1.32 → ghi lang2 = other');
  ok(raw.games_lang && raw.games_lang.other && raw.games_lang.other.crow === 'answer', 'chế độ trò chơi đã lưu ở bản cũ còn nguyên');
  await js('const x = document.getElementById("kb-f-exit"); if (x) x.click(); return 1;'); await sleep(500);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1600);
  ok((await js('return Garden._data().plants.filter((p) => p.word === "你好").map((p) => p.lang);'))[0] === 'other', '→ vườn giữ đúng "Ngôn ngữ khác" như người dùng chọn');
  await py(KB + `raw = mw.col.get_config("kotoba_batake_fields", None); raw["lang2"] = {}; raw["lang"] = {}
kb.backup_core.put_config(mw.col, "kotoba_batake_fields", raw)
kb._dialog.refresh(); result = 1`); await sleep(1600);

  console.log('== 6. Lịch hoa và màn chào');
  const t0 = await py(KB + 'import datetime\nt0 = kb.cal_today() if hasattr(kb, "cal_today") else datetime.date.today()\nresult = str(t0 - datetime.timedelta(days=1))');
  await setLang('zh'); await sleep(300);
  await js(`GardenCal.open({ date: ${JSON.stringify(t0)} }); return 1;`); await sleep(1800);
  await waitFor('return /\\nSinh hoạt\\n/.test(document.getElementById("kb-cal").innerText);', 6000);
  const cal = await js(`const t = document.getElementById("kb-cal").innerText;
    const row = (h) => { const i = t.indexOf("\\n" + h + "\\n"); return i < 0 ? "" : t.slice(i + h.length + 2).split("\\n")[0]; };
    return { life: row("Sinh hoạt"), finds: row("Nhặt được") };`);
  // chỉ soát 2 dòng của add-on (bảng Lịch hoa còn có từ vựng tiếng Nhật của người dùng ở phần luyện viết)
  ok(/睡觉/.test(cal.life) && /蜗牛|面具|纽扣/.test(cal.finds) && !/[\u3040-\u30ff]/.test(cal.life + cal.finds),
    'Lịch hoa ngày có sinh hoạt / đồ nhặt mới: tên tiếng Trung, không kana: ' + cal.life.slice(0, 50) + ' | ' + cal.finds.slice(0, 40));
  await js('GardenCal.close(); return 1;'); await sleep(400);
  for (const [lang, want] of [['vi', 'Giáng sinh vui vẻ!'], ['zh', '圣诞快乐！']]) {
    await setLang(lang); await sleep(300);
    await js('GardenGreet._show({ who: "stack", day: 99999, date: "Thứ Sáu 25/12", fest: { hi: "メリークリスマス！", vi: "Giáng sinh vui vẻ!", theme: "noel" }, reviews: 3, news: [] }); return 1;');
    await sleep(600);
    const g = await js('const b = document.getElementById("kb-greet"); return b ? { hi: b.querySelector(".kb-greet-hi").textContent, vi: (b.querySelector(".kb-greet-vi") || {}).textContent || "" } : null;');
    ok(g && g.hi.startsWith(want) && !/[぀-ヿ]/.test(g.hi + g.vi), 'màn chào Giáng sinh (' + lang + '): ' + JSON.stringify(g));
    await js('const b = document.getElementById("kb-greet"); if (b) b.click(); return 1;'); await sleep(1500);
  }

  console.log('== 7. từ vựng trùng câu StackChan');
  await setLang('en'); await sleep(300);
  await js('GardenFX.say("やった！ \\u2068すごい\\u2069 → Ra quả", 60000); return 1;');
  ok(await js('return document.getElementById("kb-say").textContent;') === 'Yay! ⁨すごい⁩ → Ra quả', 'từ すごい của deck giữ nguyên trong câu tiếng Anh');

  console.log('== 8. deck cha có nhiều ngôn ngữ');
  await setLang('auto'); await sleep(300);
  await deck('Mix');
  const n = await js('const c = {}; Garden._data().plants.forEach((p) => { c[p.lang] = (c[p.lang] || 0) + 1; }); return c;');
  ok(await js('return GardenLang.cur();') === 'zh' && n.zh > n.ko, 'deck cha Mix (Trung ' + n.zh + ' + Hàn ' + n.ko + ') → tiếng Trung');
  await deck('Mix::Hàn');
  ok(await js('return GardenLang.cur();') === 'ko' && /đang: Tiếng Hàn/.test(await js('return document.getElementById("kb-glang").options[0].textContent;')), 'đổi sang deck con tiếng Hàn → tiếng Hàn, ô chọn ghi "đang: Tiếng Hàn"');

  console.log('\nKẾT QUẢ: ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
