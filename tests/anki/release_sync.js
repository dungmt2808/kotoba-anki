// 1.26.1 — kịch bản sâu trước khi phát hành: dữ liệu có còn nguyên qua "tắt hẳn Anki" và "máy thứ hai" không.
// Ba pha, mỗi pha một lần mở Anki (run_release.sh điều khiển):
//   a (máy 1): người dùng đang chơi (2.000 xu) làm một ngày bình thường qua đúng lệnh cầu nối của giao diện — ôn 4 thẻ bằng
//      nút, mua + đặt Ghế gỗ, nhận nuôi + cho mèo ăn, sticker + nhật ký, mua vé giữ chuỗi, mua gói báo 1 tuần, trả lời
//      câu hỏi báo, đổi trời ở ⚙ — ghi lại kỳ vọng (expect.json) rồi đóng Anki như người dùng (mw.close).
//   b (máy 1 mở lại): mọi thứ còn nguyên, kể cả cài đặt riêng máy (trời), không chào lại trong ngày, không hướng dẫn.
//   c (máy 2: add-on mới cài, user_files trống, collection chép từ máy 1 như sau khi đồng bộ AnkiWeb): xu, đồ đặt, thú,
//      nhật ký, vé, gói báo, trạng thái đọc báo đều từ collection; cài đặt riêng máy KHÔNG đi theo (đúng thiết kế);
//      màn chào hiện (máy mới), không hướng dẫn người mới (đã có xu).
// Chạy: node release_sync.js a|b|c OUTDIR
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const PHASE = process.argv[2], OUT = process.argv[3] || '/tmp/kb_release';
fs.mkdirSync(OUT, { recursive: true });
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
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(150); }
  return false;
}
const KB = 'import sys, os, json, time, datetime, hashlib\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const send = (cmd) => js('pycmd(' + JSON.stringify(cmd) + '); return 1;');
// trạng thái đọc từ collection (đồng bộ AnkiWeb) — không đọc file sao lưu
const SNAP = `col = mw.col
w = st.load()
today = kb.cal_today().isoformat()
yard = [[p.get("id"), p.get("x"), p.get("y")] for p in (w["home"].get("yard") or []) if isinstance(p, dict)]
pets = w["more"].get("pets") or {}
j = kb.JOURNAL.entry(kb.cal_today())
paper = col.get_config("kotoba_batake_paper", {}) or {}
keys = sorted(k for k in col.all_config().keys() if k.startswith("kotoba_batake"))
result = {"coins": w["coins"], "waters": w.get("waters"), "bench": [p for p in yard if p[0] == "bench"],
          "pet": {k: [v.get("name"), v.get("fed")] for k, v in pets.items()}, "mood": j.get("m"), "note": j.get("t"),
          "freeze": (w["more"].get("freeze") or {}).get("n"), "sub": w["more"]["paper_sub"].get("until"),
          "read": sorted((paper.get("read") or {}).keys()), "keys": keys, "today": today,
          "sky": (kb.config().get("prefs") or {}).get("kb-sky"), "greet_day": (kb.config().get("prefs") or {}).get("kb-greet-day")}`;

(async () => {
  if (PHASE === 'a') {
    await py(KB + `kb.GREET_TEST_OFF = False
kb.TOUR_TEST_OFF = False
kb.save_config(show_tooltips=False, sound=False, music=False)
d = st.load(); d["coins"] = 2000; d["waters"] = 25; st.save(d)
mw.col.decks.select([x.id for x in mw.col.decks.all_names_and_ids() if x.name == "A::Có câu ví dụ + audio"][0])
result = 1`);
    await py(KB + 'kb.open_garden(); result = 1');
    page = await gardenPage();
    await waitFor('Garden._data && !!Garden._data()', 10000);
    console.log('== a. máy 1: một ngày dùng bình thường');
    ok(await waitFor('GardenGreet.isGreeting()', 5000), 'lần mở đầu hôm nay: màn chào');
    await js('document.getElementById("kb-greet").click(); return 1;'); await sleep(1500);
    ok(!(await js('return Garden._data().tour;')), 'người đang dùng: không có hướng dẫn người mới');
    const c0 = await py(KB + 'result = st.load()["coins"]');
    await js('document.getElementById("kb-review").click(); return 1;');
    let answered = 0;
    for (let i = 0; i < 4; i++) {
      if (!(await waitFor('!document.getElementById("kb-show").hidden || !document.getElementById("kb-ratings").hidden', 5000))) break;
      await js('const b = document.getElementById("kb-show"); if (!b.hidden) b.click(); return 1;'); await sleep(900);
      await js('const b = document.getElementById("kb-l3"); if (b && !document.getElementById("kb-ratings").hidden) b.click(); return 1;'); await sleep(1400);
      answered++;
    }
    await js('document.getElementById("kb-stop").click(); return 1;'); await sleep(600);
    const c1 = await py(KB + 'result = st.load()["coins"]');
    ok(answered >= 3 && c1 > c0, 'ôn ' + answered + ' thẻ bằng nút: +' + (c1 - c0) + ' xu');
    await send('home:buy:bench'); await sleep(700);
    await send('home:place:yard:bench:4:2'); await sleep(700);
    await send('home:pet:buy:neko'); await sleep(700);
    await send('home:pet:feed:all'); await sleep(700);
    const today = await py(KB + 'result = kb.cal_today().isoformat()');
    await send('cal:mood:' + JSON.stringify({ d: today, m: 'vui' })); await sleep(500);
    await send('cal:note:' + JSON.stringify({ d: today, t: 'Hôm nay ôn 4 thẻ, mua ghế gỗ cho mèo.' })); await sleep(500);
    await send('cal:freeze:' + today.slice(0, 7)); await sleep(700);
    await send('ai:sub:' + JSON.stringify({ buy: 'tuan' })); await sleep(900);
    // báo Gemini mẫu (make_fixture): trả lời câu 1 qua bảng Báo
    await py(KB + 'kb.save_config(bao_source="gemini", gemini_langs=["ja"], gemini_auto=False, paper_confirmed={"ja": "gemini", "en": "", "vi": ""}); result = 1');
    const iss = await py(KB + `lib = kb.paper.Library(kb.AI_DIR)
d0 = sorted(lib.issues())[-1]
iss = json.load(open(kb.ai.issue_path(kb.AI_DIR, d0), encoding="utf-8"))
result = [d0, iss["cau_hoi"][0]["dung"]]`);
    await send('paper:q:' + JSON.stringify({ d: iss[0] + '@gemini', i: 0, c: Number(iss[1]) })); await sleep(900);
    await js('GardenPrefs.set("kb-sky", JSON.stringify({mode: "fixed", fixedHour: 18.4, dayMinutes: 24, weather: "snow"})); return 1;'); await sleep(1500);
    const s = await py(KB + SNAP);
    ok(s.bench.length === 1, 'Ghế gỗ đặt ở sân ' + JSON.stringify(s.bench));
    const aday = await py(KB + 'result = int(mw.col.sched.today)');
    ok(s.pet.neko && s.pet.neko[1] === aday, 'nhận nuôi + cho mèo ăn hôm nay (ngày Anki ' + aday + '): ' + JSON.stringify(s.pet));
    ok(s.mood === 'vui' && /ghế gỗ/.test(s.note || ''), 'sticker + nhật ký hôm nay');
    ok(s.freeze === 1, 'mua 1 vé giữ chuỗi');
    ok(!!s.sub, 'gói báo tới ' + s.sub);
    ok(s.read.indexOf(iss[0]) >= 0, 'trạng thái đọc báo ' + iss[0] + ' lưu trong collection');
    ok(/snow/.test(s.sky || ''), 'trời cố định Tuyết lưu ở config prefs (riêng máy)');
    fs.writeFileSync(OUT + '/expect.json', JSON.stringify(s, null, 1));
    await page.shot(OUT + '/a_may1.png');
    // đóng như người dùng: đóng vườn, thoát Anki (lưu collection, gỡ hồ sơ)
    await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(800);
    await py('from aqt import mw\nmw.close()\nresult = 1').catch(() => 0);
  } else {
    const exp = JSON.parse(fs.readFileSync(OUT + '/expect.json', 'utf-8'));
    const m2 = PHASE === 'c';
    console.log(m2 ? '== c. máy 2: add-on mới, chỉ có collection (như sau khi đồng bộ AnkiWeb)' : '== b. máy 1: tắt hẳn Anki rồi mở lại');
    await py(KB + 'kb.GREET_TEST_OFF = False\nkb.TOUR_TEST_OFF = False\nresult = 1');
    if (m2) {
      const uf = await py(KB + 'result = sorted(x for x in os.listdir(os.path.join(kb.ADDON_DIR, "user_files")) if x not in ("README.txt",))');
      ok(!uf.some((x) => /state|more|journal|paper\.json|nha|season/.test(x)), 'máy 2 chưa có file sao lưu nào: ' + JSON.stringify(uf));
    }
    await py(KB + 'kb.open_garden(); result = 1');
    page = await gardenPage();
    await waitFor('Garden._data && !!Garden._data()', 10000);
    await sleep(1200);
    const s = await py(KB + SNAP);
    ok(s.coins === exp.coins, 'xu: ' + s.coins + ' (kỳ vọng ' + exp.coins + ')');
    ok(s.waters === exp.waters, 'số lượt tưới: ' + s.waters);
    ok(JSON.stringify(s.bench) === JSON.stringify(exp.bench), 'Ghế gỗ đúng chỗ: ' + JSON.stringify(s.bench));
    ok(JSON.stringify(s.pet) === JSON.stringify(exp.pet), 'thú nuôi: ' + JSON.stringify(s.pet));
    ok(s.mood === exp.mood && s.note === exp.note, 'sticker + nhật ký: ' + s.mood + ' · ' + s.note);
    ok(s.freeze === exp.freeze, 'vé giữ chuỗi: ' + s.freeze);
    ok(s.sub === exp.sub, 'gói báo tới ' + s.sub);
    ok(JSON.stringify(s.read) === JSON.stringify(exp.read), 'trạng thái đọc báo: ' + JSON.stringify(s.read));
    ok(JSON.stringify(s.keys) === JSON.stringify(exp.keys), 'đủ ' + s.keys.length + ' khoá kotoba_batake_* trong collection');
    const ui = await js('const d = Garden._data(); return {coins: d.wallet.coins, tour: d.tour, greeting: GardenGreet.isGreeting(), sky: GardenPrefs.get("kb-sky")};');
    ok(ui.coins === exp.coins, 'giao diện hiện ' + ui.coins + ' xu');
    ok(!ui.tour, 'không có hướng dẫn người mới');
    if (m2) {
      ok(s.sky !== exp.sky, 'cài đặt riêng máy (trời Tuyết) không đi theo sang máy 2 — đúng thiết kế');
      ok(ui.greeting, 'máy 2 mở vườn lần đầu hôm nay: có màn chào');
    } else {
      ok(s.sky === exp.sky && /snow/.test(ui.sky || ''), 'trời cố định Tuyết còn sau khi tắt Anki');
      ok(!ui.greeting, 'đã chào hôm nay (trước khi tắt Anki): không chào lại');
    }
    await page.shot(OUT + '/' + PHASE + '.png');
    const elog = await py(KB + 'result = [(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-8:]');
    ok(elog.length === 0, 'nhật ký lỗi trống: ' + JSON.stringify(elog));
    ok((page.errors || []).length === 0, 'không lỗi JS: ' + JSON.stringify((page.errors || []).slice(0, 3)));
  }
  console.log('KẾT QUẢ ' + PHASE + ': ' + pass + '/' + total);
  try { page.close(); } catch (e) { }
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(3); });
