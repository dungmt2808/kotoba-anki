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
          "sky": (kb.config().get("prefs") or {}).get("kb-sky"), "greet_day": (kb.config().get("prefs") or {}).get("kb-greet-day"),
          # 1.28: Hộp sưu tầm (khoá kotoba_batake_events) + món gánh hàng / quà (tầng NHA_KEY)
          "found": sorted(((col.get_config("kotoba_batake_events", {}) or {}).get("found") or {}).keys()),
          "owned_new": {k: w["home"]["owned"].get(k, 0) for k in kb.core.FIND_ITEMS if w["home"]["owned"].get(k)},
          # 1.30: tường / sàn từng gian (khoá "decor" trong kotoba_batake_more), mẫu tự vẽ (điểm ảnh ở kotoba_batake_px), Sổ sinh hoạt
          "rooms": list(w["home"].get("rooms") or []), "decor": w["more"].get("decor"),
          "tile_px": (col.get_config("kotoba_batake_px", {}) or {}).get("t1"),
          "life": {k: [v.get("d"), v.get("s"), v.get("n")] for k, v in ((col.get_config("kotoba_batake_life", {}) or {}).get("seen") or {}).items()}}`;

(async () => {
  if (PHASE === 'a') {
    await py(KB + `kb.GREET_TEST_OFF = False
kb.TOUR_TEST_OFF = False
kb.LIFE_TEST_OFF = False
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
    // 1.28: 10 lượt ôn trên "điện thoại" (revlog) mở 1 chỗ lấp lánh → nhặt; gánh hàng (giả hôm nay là thứ Tư) → mua món riêng
    await py(KB + `col = mw.col
cids = col.db.list("select id from cards order by id limit 20")
start = kb.core.ngay.days_of(col).rel_start(0) * 1000
for i in range(10):
    col.db.execute("insert into revlog(id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", start + 2000 + i * 53, cids[i % len(cids)], -1, 3, 10, 5, 2500, 1000, 1)
kb._dialog.refresh()
result = 1`); await sleep(1500);
    const spot = await js('const f = Garden._data().finds; const s = f.spots.find((x) => x.open && !x.picked); return s ? s.k + ":" + s.scene : "";');
    if (spot) { await send('find:pick:' + spot); await sleep(900); }
    const wed = await py(KB + `real = kb.cal_today
d = real()
while d.weekday() != 2:
    d += datetime.timedelta(days=1)
kb._real_cal_today = real
kb.cal_today = (lambda: d)
w = st.load(); w["home"]["house"] = 7; st.save(w)      # nhà có cửa: món riêng là đồ trong nhà cũng mua được
result = d.isoformat()`);
    await send('ped:buy:x1:' + wed); await sleep(900);
    await py(KB + 'kb.cal_today = kb._real_cal_today\nkb._dialog.refresh()\nresult = 1'); await sleep(1200);
    // 1.30: mở rộng nhà, mua giấy dán tường cho Bếp, vẽ một mẫu sàn cho Phòng ngủ, StackChan quét nhà (ghi Sổ sinh hoạt)
    await py(KB + 'w = st.load(); w["coins"] += 3000; st.save(w); kb._dialog.refresh(); result = 1'); await sleep(900);
    await send('home:nha:open'); await sleep(900);
    await send('home:decor:buy:w_sakura'); await sleep(700);
    await send('home:decor:use:kitchen:wall:w_sakura'); await sleep(700);
    await send('craft:tile:' + JSON.stringify({ name: 'Sọc gỗ', kind: 'floor', px: '8k8y'.repeat(16) })); await sleep(900);
    await send('home:decor:use:bedroom:floor:t1'); await sleep(700);
    await send('life:seen:souji:room'); await sleep(700);
    await js('GardenPrefs.set("kb-sky", JSON.stringify({mode: "fixed", fixedHour: 18.4, dayMinutes: 24, weather: "snow"})); return 1;'); await sleep(1500);
    const s = await py(KB + SNAP);
    ok(!!spot && s.found.length === 1, '10 lượt ôn → 1 chỗ lấp lánh (' + spot + ') → nhặt được ' + JSON.stringify(s.found));
    ok(Object.keys(s.owned_new).length === 1, 'gánh hàng (' + wed + '): mua món riêng ' + JSON.stringify(s.owned_new));
    const dc = s.decor || {};
    ok(s.rooms.length === 2 && (dc.own || []).indexOf('w_sakura') >= 0 && ((dc.use || {}).kitchen || {}).wall === 'w_sakura',
      '1.30: mở rộng nhà, Bếp dán giấy tường Hoa anh đào: ' + JSON.stringify(dc.use));
    ok(!!((dc.mine || {}).items || {}).t1 && ((dc.use || {}).bedroom || {}).floor === 't1' && typeof s.tile_px === 'string' && s.tile_px.length > 0,
      '1.30: mẫu sàn tự vẽ t1 lát Phòng ngủ, điểm ảnh ở kotoba_batake_px (' + String(s.tile_px).length + ' ký tự)');
    ok(!!s.life.souji && s.life.souji[1] === 'room' && s.life.souji[2] === 1, '1.30: Sổ sinh hoạt ghi "Quét nhà": ' + JSON.stringify(s.life));
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
    await py(KB + 'kb.GREET_TEST_OFF = False\nkb.TOUR_TEST_OFF = False\nkb.LIFE_TEST_OFF = False\nresult = 1');
    if (m2) {
      const uf = await py(KB + 'result = sorted(x for x in os.listdir(os.path.join(kb.ADDON_DIR, "user_files")) if x not in ("README.txt",))');
      ok(!uf.some((x) => /state|more|journal|paper\.json|nha|season|events/.test(x)), 'máy 2 chưa có file sao lưu nào: ' + JSON.stringify(uf));
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
    ok(JSON.stringify(s.found) === JSON.stringify(exp.found) && s.found.length === 1, 'Hộp sưu tầm còn món đã nhặt: ' + JSON.stringify(s.found));
    ok(JSON.stringify(s.owned_new) === JSON.stringify(exp.owned_new), 'món gánh hàng còn trong kho: ' + JSON.stringify(s.owned_new));
    ok(JSON.stringify(s.rooms) === JSON.stringify(exp.rooms) && JSON.stringify(s.decor) === JSON.stringify(exp.decor), '1.30: tường / sàn từng gian còn nguyên: ' + JSON.stringify((s.decor || {}).use));
    ok(s.tile_px === exp.tile_px && !!s.tile_px, '1.30: điểm ảnh mẫu sàn tự vẽ còn nguyên');
    ok(JSON.stringify(s.life) === JSON.stringify(exp.life) && !!s.life.souji, '1.30: Sổ sinh hoạt còn nguyên: ' + JSON.stringify(s.life));
    const u30 = await js('const d = Garden._data(), dec = (d.wallet.more || {}).decor || {}, t = (d.catalog.tiles || []).find((x) => x.id === "t1"); return {wall: ((dec.use || {}).kitchen || {}).wall, floor: ((dec.use || {}).bedroom || {}).floor, tile: !!(t && t.px), life: d.life ? d.life.seen : null};');
    ok(u30.wall === 'w_sakura' && u30.floor === 't1' && u30.tile && u30.life === 1, '1.30: trang nhận đủ mẫu tường / sàn để vẽ, sổ Sinh hoạt 1 việc: ' + JSON.stringify(u30));
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
