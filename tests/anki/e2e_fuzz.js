// 1.30 trong Anki thật — "bấm bừa": ~1.100 lệnh cầu nối ngẫu nhiên (đúng lẫn sai: id lạ, số âm / quá lớn, JSON hỏng, chuỗi dài,
// ký tự Nhật, thiếu tham số) gửi qua pycmd như trang thật gửi. Sau mỗi loạt 40 lệnh kiểm lại:
//   - không lệnh nào ném lỗi chưa bắt ra khỏi cầu nối (nhật ký "lệnh …" trống), không hộp thoại nào bật lên chặn Anki;
//   - cửa sổ vườn còn mở, ví đọc được, xu là số nguyên ≥ 0 và không tăng quá mức kiếm được hợp lệ;
//   - mỗi món: số đã đặt ≤ số đang có; gian bên chỉ mở cả đôi; tường / sàn đang dùng là mẫu đang có;
//   - trang không lỗi JS.
// Bỏ các lệnh mở hộp thoại hệ thống / ghi file ngoài thư mục test / gọi mạng (craft:pick, snap:save, cal:pdf, app:icon,
// app:report, ai:*, base:export / import, win:full) — các lệnh đó có kịch bản riêng.
// Hạt ngẫu nhiên cố định (KB_FUZZ_SEED, mặc định 130) nên chạy lại ra đúng dãy lệnh. Chạy: KB_SCRIPTS=e2e_fuzz.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_fuzz';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const SEED = Number(process.env.KB_FUZZ_SEED || 130), BATCHES = Number(process.env.KB_FUZZ_BATCHES || 28), PER = 40;
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLife !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
`;
// PRNG cố định
let seed = SEED >>> 0;
function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
const pick = (a) => a[Math.floor(rnd() * a.length)];
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

(async () => {
  await py(KB + `kb.LIFE_TEST_OFF = False
mw.col.set_config("kotoba_batake_life", {})
d = st.load(); d["coins"] = 9000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
try:
    st.open_rooms()
except Exception:
    pass
for z in kb.core.ZONE_IDS[:2]:
    try:
        st.unlock_zone(z)
    except Exception:
        pass
for sc, iid, x, y in [("yard", "bench", 6, 1), ("room", "desk", 2, 1), ("kitchen", "nagashi", 2, 1), ("bedroom", "beddo", 1, 2)]:
    try:
        st.buy(iid); st.place(sc, iid, x, y)
    except Exception:
        pass
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
kb._dialog.close() if kb._dialog else None
kb.open_garden(); result = 1`);
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await py(KB + 'kb._dialog.resize(1280, 800); result = 1'); await sleep(1200);
  const cat = await js(`const c = Garden._data().catalog, l = Garden._data().life; return {items: c.items.map((i) => i.id), walls: c.decor.walls.map((w) => w.id), floors: c.decor.floors.map((w) => w.id),
    wear: c.wear.map((w) => w.id), faces: c.faces.map((w) => w.id), styles: c.styles.map((w) => w.id), zones: c.zones.map((w) => w.id), themes: c.themes.map((t) => t.id),
    acts: Object.keys(l.defs), pets: (c.more.pets || []).map((p) => p.id), seeds: (c.more.seeds || []).map((p) => p.id), decks: Garden._data().decks ? Garden._data().decks.map((d) => String(d.id)) : []};`);
  const start = await py(KB + 'result = {"coins": st.load()["coins"], "errs": len(kb.ERRORS.entries())}');
  console.log('danh mục: ' + cat.items.length + ' món, ' + cat.acts.length + ' việc · hạt ' + SEED + ' · ' + BATCHES + ' × ' + PER + ' lệnh');

  const JUNK = ['', 'x', '../..', '-1', '0', '99999999999', '1e9', 'NaN', 'null', 'undefined', '{}', '[]', '{"a":', 'ことば', '%00', 'a:b:c:d:e:f', ' ', '\\', '"', "'", 'A'.repeat(1800), '<b>x</b>', 'true', '3.5'];
  const SCENES = ['yard', 'room', 'kitchen', 'bedroom', 'beach', 'shrine', 'festival', 'bamboo', 'onsen', 'station', 'u1', 'house', 'attic'];
  const ROOMS = ['room', 'kitchen', 'bedroom', 'attic', ''];
  const val = (good) => (rnd() < 0.72 ? pick(good) : pick(JUNK));
  const num = (a, b) => (rnd() < 0.8 ? String(int(a, b)) : pick(JUNK));
  const px16 = () => { const c = pick(['k', 'r', 'g', 'w', 'y']); return rnd() < 0.85 ? '128' + c + '128.' : pick(JUNK); };
  const today = await py(KB + 'result = kb.cal_today().isoformat()');
  const jsonOr = (o) => (rnd() < 0.85 ? JSON.stringify(o) : pick(JUNK));
  const GEN = [
    () => 'home:buy:' + val(cat.items), () => 'home:buy:' + val(cat.items),
    () => 'home:place:' + val(SCENES) + ':' + val(cat.items) + ':' + num(-1, 16) + ':' + num(-1, 4),
    () => 'home:place:' + val(SCENES) + ':' + val(cat.items) + ':' + num(0, 9) + ':' + num(0, 3),
    () => 'home:move:' + val(SCENES) + ':' + num(-1, 6) + ':' + num(-1, 16) + ':' + num(-1, 4),
    () => 'home:take:' + val(SCENES) + ':' + num(-1, 6),
    () => 'home:build' + (rnd() < 0.5 ? ':' + num(0, 9) : ''),
    () => 'home:zone:' + val(cat.zones), () => 'home:nha:open' + (rnd() < 0.5 ? ':' + val(['kitchen', 'bedroom']) : ''),
    () => 'home:style:' + pick(['buy', 'use', 'x']) + ':' + val(cat.styles),
    () => 'home:wear:' + pick(['buy', 'on', 'off', 'x']) + ':' + val(cat.wear.concat(['head', 'face', 'neck', 'shell'])),
    () => 'home:face:' + pick(['buy', 'toggle']) + ':' + val(cat.faces),
    () => 'home:decor:buy:' + val(cat.walls.concat(cat.floors)),
    () => 'home:decor:use:' + val(ROOMS) + ':' + val(['wall', 'floor']) + ':' + val(cat.walls.concat(cat.floors, ['none', 't1', 't2'])),
    () => 'home:tile:del:' + val(['t1', 't2', 't3']),
    () => 'craft:tile:' + jsonOr({ name: val(['Sọc', 'Mẫu']), kind: val(['wall', 'floor']), px: px16(), id: rnd() < 0.3 ? val(['t1', 't2']) : undefined }),
    () => 'craft:save:' + jsonOr({ name: val(['Đèn']), size: Number(val(['16', '24', '32'])) || val(['16']), kind: val(['ground', 'floor', 'wall']), fx: val(['none', 'sway', 'glow']), px: px16() }),
    () => 'home:craft:' + pick(['copy', 'del']) + ':' + val(['c1', 'c2', 'c3']),
    () => 'craft:seed:' + jsonOr({ name: 'Giống', st: [px16(), px16(), px16(), '', ''] }),
    () => 'home:myseed:del:' + val(['g1', 'g2']),
    () => 'craft:zone:' + jsonOr({ name: 'Vùng', bg: val(['meadow']), ground: '#5ed35e', hills: '#7ed98a', px: val(['']), env: '' }),
    () => 'home:uzone:del:' + val(['u1', 'u2']),
    () => 'home:pet:' + pick(['buy', 'feed']) + ':' + val(cat.pets.concat(['all'])),
    () => 'home:pet:move:' + val(cat.pets) + ':' + val(SCENES), () => 'home:pet:auto:' + val(['0', '1']),
    () => 'home:pet:name:' + jsonOr({ id: val(cat.pets), name: val(['Mochi', 'Bông']) }),
    () => 'home:seed:buy:' + val(cat.seeds), () => 'home:seed:rule:' + jsonOr({ where: val(['deck', 'kind', 'tag']), key: val(['vocab', '1']), value: val(cat.seeds.concat(['mix', ''])) }),
    () => 'home:repair:' + val(['all', 'one']),
    () => 'home:theme:' + pick(['buy', 'streak', 'use']) + ':' + val(cat.themes), () => 'home:theme:' + val(['auto', 'off']),
    () => 'life:seen:' + val(cat.acts) + ':' + val(SCENES), () => 'life:' + val(['seen', 'met']) + ':' + val(cat.acts),
    () => 'guest:met:' + val(['suzume', 'neko', 'kaeru', 'mejiro']) + ':' + val(SCENES),
    () => 'find:pick:' + num(0, 4) + ':' + val(SCENES), () => 'ped:buy:' + val(['x1', 'd1', 'd2', 'd3', 's1']) + ':' + val([today]),
    () => 'cal:' + pick(['month', 'year', 'day', 'hint', 'seen', 'book', 'lang']) + ':' + val(['2026-11', '2026', today, 'ja', 'en', 'm:2026-11']),
    () => 'cal:mood:' + jsonOr({ d: val([today]), m: val(['vui', 'met', 'buon', '']) }),
    () => 'cal:note:' + jsonOr({ d: val([today]), t: val(['hôm nay học 30 thẻ', '']) }),
    () => 'cal:draft:' + jsonOr({ d: val([today]), lang: val(['ja', 'en']), t: val(['きょうは べんきょう しました', 'I studied.']) }),
    () => 'paper:' + pick(['index', 'stop']), () => 'paper:issue:' + val(['2026-11-03', today]), () => 'paper:lang:' + val(['ja', 'en', '']),
    () => 'paper:q:' + jsonOr({ d: val(['2026-11-03']), i: int(0, 3), c: int(0, 3) }),
    () => 'paper:ct:' + jsonOr({ d: val(['2026-11-03']), i: int(0, 2), v: [val(['きょう'])] }),
    () => 'dict:open', () => 'dict:check:' + jsonOr({ id: val(['p:2026-11-03:0', 'n:1']), v: [val(['あ'])] }),
    () => 'fields:open', () => 'fields:game:' + val(['listen', 'market', 'crow', 'memory', 'cloze']) + ':' + val(['vocab', 'kanji', 'grammar']) + ':' + val(['mix', 'word', 'x']),
    () => 'fields:save:' + jsonOr({ mid: val(['1']), kind: val(['vocab', 'other']), f: {} }),
    () => 'game:' + pick(['open', 'stop']), () => 'game:reward:' + val(['listen', 'market', 'crow', 'memory', 'cloze']) + ':' + num(0, 50) + ':' + num(0, 400) + (rnd() < 0.5 ? ':' + num(0, 1) : ''),
    () => 'game:' + pick(['audio', 'exaudio']) + ':' + num(1, 5),
    () => 'ui:preset:' + val(['full', 'focus', 'calm']), () => 'ui:set:' + jsonOr({ main: { pets: val(['on', 'off']) }, greet: 'off', trans: 'off' }),
    () => 'prefs:set:' + jsonOr({ 'kb-sky': val(['{"mode":"real"}']), 'kb-muted': val(['0', '1']) }),
    () => 'share:' + pick(['peek', 'make', 'code']) + ':' + val(['KB1:m:16:eA:eA:00000000', 'c1', 'u1', 'g1']),
    () => 'deck:' + val(cat.decks.length ? cat.decks : ['1']), () => pick(['refresh', 'ready', 'rv:stop', 'rv:show:', 'rv:ans:3', 'rv:ans:x', 'play:q:0', 'home:open', 'home:', 'craft:', 'life:', ':', 'khongco:lenh']),
    () => val(['home', 'craft', 'life', 'cal', 'paper', 'find', 'ped', 'guest', 'fields', 'game', 'ui', 'share']) + ':' + pick(JUNK) + (rnd() < 0.5 ? ':' + pick(JUNK) : ''),
  ];
  const CHECK = KB + `out = {"ok": True, "why": ""}
try:
    d = st.load(); d2 = st.load()
    d.pop("more_view", None); d2.pop("more_view", None)
    home = d["home"]
    if json.dumps(d, sort_keys=True) != json.dumps(d2, sort_keys=True):
        out = {"ok": False, "why": "đọc hai lần khác nhau"}
    elif not isinstance(d["coins"], int) or d["coins"] < 0:
        out = {"ok": False, "why": "xu %r" % (d["coins"],)}
    else:
        for iid, n in home["owned"].items():
            placed = sum(1 for sc in home if isinstance(home[sc], list) for e in home[sc] if isinstance(e, dict) and e.get("id") == iid)
            if placed > n:
                out = {"ok": False, "why": "đặt %d > có %d: %s" % (placed, n, iid)}
        if home["rooms"] not in ([], list(kb.core.SIDE_IDS)):
            out = {"ok": False, "why": "gian bên %r" % (home["rooms"],)}
        dec = d["more"]["decor"]
        for room in dec["use"]:
            for slot, did in dec["use"][room].items():
                if not kb.core.decor.usable(dec, did, slot):
                    out = {"ok": False, "why": "gian %s dùng mẫu không có %s" % (room, did)}
    out["coins"] = d["coins"]
except Exception as e:
    import traceback
    out = {"ok": False, "why": "đọc ví lỗi: " + traceback.format_exc()[-400:]}
out["open"] = bool(kb._dialog and kb._dialog.isVisible())
m = mw.app.activeModalWidget()
out["modal"] = type(m).__name__ + ":" + (m.windowTitle() if m else "") if m else ""
if m:
    try:
        m.close()
    except Exception:
        pass
errs = kb.ERRORS.entries()
out["unhandled"] = [(e.get("where"), e.get("msg")) for e in errs if str(e.get("where", "")).startswith("lệnh ")][-5:]
out["handled"] = len(errs)
out["seen"] = len(mw.col.get_config("kotoba_batake_life", {}).get("seen", {}))
result = out`;

  // Lỗi "nhẹ" (hộp thoại lỗi của Anki bật lên, lệnh ném lỗi chưa bắt) được gom lại rồi chạy tiếp để một lần chạy liệt kê hết;
  // lỗi "nặng" (Anki không trả lời, cửa sổ vườn đóng, ví sai) thì dừng ngay.
  let sentN = 0, bad = null, maxCoins = start.coins, handled = 0;
  const log = [], soft = new Set(), softCmds = [];
  for (let b = 0; b < BATCHES && !bad; b++) {
    const cmds = [];
    for (let i = 0; i < PER; i++) { cmds.push(pick(GEN)()); }
    log.push(...cmds);
    await js('const L = ' + JSON.stringify(cmds) + '; L.forEach((c) => { try { pycmd(c); } catch (e) { } }); return 1;');
    sentN += cmds.length;
    await sleep(700);
    let r = null;
    for (let k = 0; k < 6 && !r; k++) { try { r = await py(CHECK); } catch (e) { await sleep(800); } }
    if (!r) { bad = 'Anki không trả lời sau loạt ' + b; break; }
    handled = r.handled; maxCoins = Math.max(maxCoins, r.coins || 0);
    if (!r.ok) { bad = 'loạt ' + b + ': ' + r.why; }
    else if (!r.open) { bad = 'loạt ' + b + ': cửa sổ vườn bị đóng'; }
    const before = soft.size;
    if (r.modal) { soft.add('hộp thoại bật lên (' + r.modal + ')'); }
    (r.unhandled || []).forEach((u) => soft.add('lỗi chưa bắt ' + JSON.stringify(u)));
    if (bad || soft.size > before) { softCmds.push({ loat: b, cmds: cmds }); fs.writeFileSync(path.join(SHOTS, 'fuzz_loat_loi.json'), JSON.stringify(softCmds, null, 1)); }
    if (b % 7 === 6) { console.log('  … ' + sentN + ' lệnh, xu ' + r.coins + ', nhật ký (đã bắt) ' + r.handled + ', sổ sinh hoạt ' + r.seen); }
  }
  if (!bad && soft.size) { bad = Array.from(soft).join(' · '); }
  fs.writeFileSync(path.join(SHOTS, 'fuzz_lenh.json'), JSON.stringify({ seed: SEED, cmds: log }));
  ok(!bad, sentN + ' lệnh ngẫu nhiên: không lỗi chưa bắt, không hộp thoại, cửa sổ còn mở, ví hợp lệ' + (bad ? ' — ' + bad : ''));
  // xu kiếm được hợp lệ trong lúc bấm bừa: trò chơi ≤ trần ngày, trả lời báo, nhặt trùng — không thể nhiều
  const cap = await py(KB + 'result = int(kb.config()["game_daily_coins"])');
  ok(maxCoins <= start.coins + cap + 120, 'xu không tăng quá mức kiếm được hợp lệ (đầu ' + start.coins + ', cao nhất ' + maxCoins + ', trần trò chơi ' + cap + ')');
  const seenBad = await py(KB + `from kotoba_batake import life_core as L
w = st.load()
home, scenes, pets_home = kb._life_ctx(w)
seen = mw.col.get_config("kotoba_batake_life", {}).get("seen", {})
result = [a for a, e in seen.items() if not L.can_do(a, e.get("s"), home, scenes, kb.cal_today(), pets_home)]`);
  ok(Array.isArray(seenBad), 'sổ Sinh hoạt sau khi bấm bừa đọc được (' + (seenBad || []).length + ' mục nay không còn làm được do đồ đã cất — vẫn hợp lệ lúc ghi)');
  const stillOk = await js('return typeof Garden !== "undefined" && !!Garden._data() && !!document.getElementById("kb-yard");');
  ok(stillOk, 'trang vườn còn sống sau khi bấm bừa');
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(800);
  await js('GardenHome.close && GardenHome.close(); return 1;').catch(() => 0);
  await page.shot(path.join(SHOTS, 'fuzz_cuoi.png'));
  ok((page.errors || []).length === 0, 'không lỗi JS' + ((page.errors || []).length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log('  (nhật ký lỗi đã bắt trong lúc bấm bừa: ' + (handled - start.errs) + ' mục)');
  const logf = path.join(SHOTS, 'anki_e2e_fuzz.log');
  if (fs.existsSync(logf)) {
    const t = fs.readFileSync(logf, 'utf8');
    const tb = (t.match(/Traceback \(most recent call last\)/g) || []).length;
    ok(tb === 0, 'log của Anki không có Traceback (' + tb + ')' + (tb ? ': ' + t.slice(t.indexOf('Traceback'), t.indexOf('Traceback') + 600).replace(/\n/g, ' ⏎ ') : ''));
  }
  console.log('KẾT QUẢ: ' + pass + '/' + total);
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); try { page && page.close(); } catch (x) { } process.exit(2); });
