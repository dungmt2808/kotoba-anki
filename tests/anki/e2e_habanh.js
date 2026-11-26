// 1.34.1 (kiểm tra lần cuối, 17/11): HẠ BẢN rồi LÊN LẠI trong Anki thật — chạy bằng run_habanh.sh GÓI_MỚI GÓI_CŨ SHOTS.
// Giống người dùng có máy thứ hai còn bản cũ (cùng collection qua AnkiWeb), hoặc lỡ cài lại gói cũ:
//   p1 (bản mới 1.32.x): deck tiếng Trung + Hán Việt, Cấu hình trường lưu là Tiếng Trung, Đuổi quạ pinyin, Ngôn ngữ trong
//      vườn = Tiếng Trung, mua đồ, nhật ký → chụp dữ liệu → cài đè GÓI_CŨ → đóng Anki
//   p2 (bản cũ 1.31.3): mọi khoá / file / cấu hình y nguyên; bản cũ chơi tiếp (mua + đặt đồ, lưu Cấu hình trường của loại
//      note khác, đổi chế độ trò chơi "Ngôn ngữ khác", ôn thẻ) → chụp → cài lại GÓI_MỚI → đóng Anki
//   p3 (bản mới): những gì bản cũ vừa làm còn đủ; deck tiếng Trung vẫn là Tiếng Trung, Hán Việt (f2), Đuổi quạ pinyin
//      (games_lang2), Ngôn ngữ trong vườn vẫn Tiếng Trung; không lỗi
//   1.35: thêm deck tiếng Đức (lang3 / games_lang3) — bản cũ ghi đè vẫn giữ, lên lại vẫn là Tiếng Đức
const fs = require('fs'), path = require('path');
const { pages, Page, sleep } = require('./cdp');
const PHASE = process.argv[2], SHOTS = process.argv[3] || '/tmp/kb_shots_habanh', PKG = path.resolve(process.argv[4] || '');
fs.mkdirSync(SHOTS, { recursive: true });
const SNAP = (n) => path.join(SHOTS, 'habanh_' + n + '.json');
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = 'import sys, os, json, hashlib, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
const SNAPSHOT = KB + `
cfg = {k: v for k, v in mw.col.all_config().items() if k.startswith("kotoba_batake")}
base = os.path.join(kb.ADDON_DIR, "user_files"); files = {}
for root, dirs, fs in os.walk(base):
    for f in fs:
        p = os.path.join(root, f)
        with open(p, "rb") as fh: files[os.path.relpath(p, base)] = hashlib.sha1(fh.read()).hexdigest()
w = st.load()
result = {"version": kb.VERSION, "cfg": cfg, "files": files, "addon": mw.addonManager.getConfig("kotoba_batake"),
          "revlog": mw.col.db.scalar("select count() from revlog"), "coins": w["coins"], "owned": w["home"]["owned"],
          "yard": sorted([e["id"], e["x"], e["y"]] for e in w["home"]["yard"]), "diary": kb.JOURNAL.entry(kb.cal_today()).get("t", "")}`;
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; const g = document.getElementById("kb-greet"); if (g) g.click(); if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); return 1;');
  await sleep(500);
}
async function install() {
  const r = await py(`import os, json
r = mw.addonManager.install(${JSON.stringify(PKG)})
folder = mw.addonManager.addonsFolder("kotoba_batake")
m = json.load(open(os.path.join(folder, "manifest.json"), encoding="utf-8"))
result = {"kind": type(r).__name__, "ver": m.get("human_version")}`);
  ok(r.kind === 'InstallOk', 'cài gói ' + r.ver + ' (' + r.kind + ')');
  await py('from aqt.qt import QTimer\nQTimer.singleShot(300, mw.close)\nresult = 1');
}
// so theo nội dung (khoá xếp theo tên): bản cũ ghi lại config theo thứ tự khoá của nó — cùng nội dung là giữ nguyên
const canon = (v) => JSON.stringify(v, (k, x) => (x && typeof x === 'object' && !Array.isArray(x)
  ? Object.keys(x).sort().reduce((o, key) => { o[key] = x[key]; return o; }, {}) : x));
function compare(want, got, label) {
  const keys = Object.keys(want.cfg);
  const lost = keys.filter((k) => !(k in got.cfg));
  const changed = keys.filter((k) => k in got.cfg && k !== 'kotoba_batake_rev' && canon(got.cfg[k]) !== canon(want.cfg[k]));
  ok(!lost.length && !changed.length, label + ': ' + keys.length + ' khoá collection còn đủ, nội dung y nguyên' +
    (lost.length ? ' — MẤT: ' + lost.join(', ') : '') + (changed.length ? ' — ĐỔI: ' + changed.join(', ') : ''));
  const gone = Object.keys(want.files).filter((f) => !(f in got.files) || got.files[f] !== want.files[f]);
  ok(!gone.length, label + ': ' + Object.keys(want.files).length + ' file user_files/ y nguyên' + (gone.length ? ' — KHÁC: ' + gone.join(', ') : ''));
  ok(canon(got.addon) === canon(want.addon), label + ': cấu hình add-on (⚙, Ngôn ngữ trong vườn…) giữ nguyên' +
    (canon(got.addon) === canon(want.addon) ? '' : ' — khác: ' + Object.keys(Object.assign({}, want.addon, got.addon)).filter((k) => canon(got.addon[k]) !== canon(want.addon[k])).join(', ')));
  // 1.36: bản cũ (≤ 1.35) không biết đồ sự kiện Giáng sinh (le_*) — không hiện trong ví của nó nhưng giữ hộ ở tầng NHA_KEY (khoá
  // collection so ở trên: y nguyên); phép so này chỉ xét phần cả hai bản cùng hiểu, phần đồ sự kiện p3 soát riêng
  const noLe = (o) => Object.keys(o || {}).filter((k) => !/^le_/.test(k)).sort().reduce((x, k) => { x[k] = o[k]; return x; }, {});
  const yardNoLe = (y) => (y || []).filter((e) => !/^le_/.test(e[0]));
  ok(got.coins === want.coins && JSON.stringify(noLe(got.owned)) === JSON.stringify(noLe(want.owned)) &&
    JSON.stringify(yardNoLe(got.yard)) === JSON.stringify(yardNoLe(want.yard)) && got.diary === want.diary, label + ': xu ' + got.coins + ', đồ, sân, nhật ký y nguyên');
}

async function p1() {
  console.log('== p1: bản mới ' + await py(KB + 'result = kb.VERSION'));
  const did = await py(KB + `col = mw.col
mm = col.models
m = mm.new("Chinese HSK (hạ bản)")
for f in ("Hanzi", "Pinyin", "Nghĩa", "Hán Việt"):
    mm.add_field(m, mm.new_field(f))
t = mm.new_template("T1"); t["qfmt"] = "{{Hanzi}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Nghĩa}}"
mm.add_template(m, t); mm.add(m); m = mm.by_name("Chinese HSK (hạ bản)")
did = col.decks.id("ZH::Hạ bản")
for w, p, me, hv in (("你好", "nǐ hǎo", "xin chào", "NHĨ HẢO"), ("谢谢", "xièxie", "cảm ơn", "TẠ TẠ"), ("学生", "xuésheng", "học sinh", "HỌC SINH"), ("老师", "lǎoshī", "giáo viên", "LÃO SƯ")):
    n = col.new_note(m); n["Hanzi"], n["Pinyin"], n["Nghĩa"], n["Hán Việt"] = w, p, me, hv; col.add_note(n, did)
conf, err = kb.fields_core.validate_save({"kind": "vocab", "f": {"word": "Hanzi", "reading": "Pinyin", "meaning": "Nghĩa", "hanviet": "Hán Việt"}},
                                         ["Hanzi", "Pinyin", "Nghĩa", "Hán Việt"], "zh")
assert conf, err
kb.FIELDS.set_model(str(m["id"]), conf, "zh")
kb.FIELDS.set_game("crow", "zh", "spell")
if "de" in kb.fields_core.LANGS:          # 1.35: deck tiếng Đức — lưu ở lang3 / games_lang3
    md = mm.new("Deutsch (hạ bản)")
    for f in ("Wort", "Bedeutung"):
        mm.add_field(md, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = "{{Wort}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Bedeutung}}"
    mm.add_template(md, t); mm.add(md); md = mm.by_name("Deutsch (hạ bản)")
    dd = col.decks.id("DE::Hạ bản")
    for w, me in (("der Hund, -e", "con chó"), ("die Straße", "con đường"), ("schön", "đẹp"), ("gehen", "đi")):
        n = col.new_note(md); n["Wort"], n["Bedeutung"] = w, me; col.add_note(n, dd)
    conf, err = kb.fields_core.validate_save({"kind": "vocab", "f": {"word": "Wort", "meaning": "Bedeutung"}}, ["Wort", "Bedeutung"], "de")
    assert conf, err
    kb.FIELDS.set_model(str(md["id"]), conf, "de")
    kb.FIELDS.set_game("crow", "de", "spell")
d = st.load(); d["coins"] += 100000; st.save(d)
[st.build() for _ in range(7)]
st.buy("bench"); st.place("yard", "bench", 6, 1)
if hasattr(kb, "le_core"):          # 1.36: đã mở 21 ngăn tủ lịch Giáng sinh, dán tường Noel — rồi máy khác còn bản cũ chạy chen
    import datetime as _dt
    _today = _dt.date(2026, 12, 21); _days = ["2026-12-%02d" % k for k in range(1, 22)]
    ev = kb.LE.load(); give = {}; tiles = []
    for dd in range(1, 22):
        r = kb.le_core.open_door(ev, dd, _today, _days, [], 3)
        for k, v in r["item"].items():
            give[k] = give.get(k, 0) + v
        tiles += r["tiles"]
    kb.le_core.mark_gifts(ev, ["tulich", "tree"], _today); give["le_tulich"] = 1; give["xmastree"] = 1
    st.le_apply(give, kb.le_core.auto_list(give), tiles, extra=[kb.LE.write(ev)])
    st.decor_use("room", "wall", "w_noelkeo")
    if hasattr(kb.le_core, "save_card"):      # 1.36.1: thiệp đã treo, thiệp nhận của bạn, ông già Noel đã ghé
        _now = _dt.datetime(2026, 12, 21, 20, 0)
        ev = kb.LE.load()
        kb.le_core.save_card(ev, 0, {"f": "qua", "st": [{"s": "xmastree", "x": 6, "y": 22}], "t1": "Giáng sinh an lành!", "t2": "— hạ bản", "c": "ja", "w": "Ước gì học giỏi", "wl": "vi"}, _today, _now)
        kb.le_core.hang_card(ev, 0, _today, _now)
        kb.le_core.recv_add(ev, kb.le_core.card_code({"f": "thong", "st": [], "t1": "Merry Christmas", "t2": "", "c": ""}), _today)
        kb.le_core.mark_seen(ev, _dt.datetime(2026, 12, 24, 19, 0), "star,tree")
        if hasattr(kb.le_core, "save_orn"):       # 1.36.3: hình vẽ trên thiệp + quả châu tự vẽ
            _c = kb.le_core.cards(ev)[0]
            kb.le_core.save_card(ev, 1, dict(_c, t1="Thiệp vẽ tay", d="5U9595."), _today, _now)
            kb.le_core.save_orn(ev, 0, "..kkkk.." * 2 + ".kUUUUk." * 4 + "..kkkk.." * 2, 1, _today, _now)
        kb.LE.save(ev)
kb.JOURNAL.update(kb.cal_today(), {"t": "viết bằng 1.32 trước khi hạ bản"})
c = mw.addonManager.getConfig("kotoba_batake"); c.setdefault("prefs", {})["kb-glang"] = "zh"; mw.addonManager.writeConfig("kotoba_batake", c)
result = did`);
  const raw = await py(KB + 'result = mw.col.get_config("kotoba_batake_fields", None)');
  const mid = Object.keys(raw.lang2 || {}).find((k) => raw.lang2[k] === 'zh');
  ok(mid && raw.lang[mid] === 'other' && raw.f2[mid].hanviet === 'Hán Việt' && raw.games_lang2.zh.crow === 'spell',
    'bản mới lưu: lang = other + lang2 = zh, Hán Việt ở f2, Đuổi quạ "gõ chữ Hán" ở games_lang2');
  if (raw.lang3) {
    const md = Object.keys(raw.lang3).find((k) => raw.lang3[k] === 'de');
    ok(md && raw.lang[md] === 'other' && !(md in (raw.lang2 || {})) && raw.games_lang3.de.crow === 'spell' && !raw.games_lang2.de,
      '1.35: tiếng Đức lưu ở lang3 (lang = other), Đuổi quạ ở games_lang3 — không đụng lang2 / games_lang2');
  }
  await openGarden();
  await py(KB + `kb._dialog.deck_id = ${did}; kb._dialog.refresh(); result = 1`); await sleep(1500);
  ok(await js('return GardenLang.pref() === "zh" && Garden._data().plants.every((p) => p.lang === "zh");'), 'vườn: deck tiếng Trung, Ngôn ngữ trong vườn = Tiếng Trung');
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(1000);
  const snap = await py(SNAPSHOT);
  fs.writeFileSync(SNAP(1), JSON.stringify(snap));
  await install();
}

async function p2() {
  const want = JSON.parse(fs.readFileSync(SNAP(1), 'utf8'));
  const got = await py(SNAPSHOT);
  console.log('== p2: hạ bản ' + want.version + ' → ' + got.version);
  ok(got.version !== want.version, 'Anki chạy bản cũ ' + got.version);
  compare(want, got, 'sau khi hạ bản');
  await openGarden();
  const did = await py(KB + 'result = mw.col.decks.id_for_name("ZH::Hạ bản")');
  await py(KB + `kb._dialog.deck_id = ${did}; kb._dialog.refresh(); result = 1`); await sleep(1500);
  const pl = await js('return Garden._data().plants.map((p) => p.lang || "ja");');
  ok(pl.length === 4, 'bản cũ mở vườn với deck tiếng Trung (bản cũ hiểu là: ' + Array.from(new Set(pl)).join(',') + ')');
  const did2 = await py(KB + `done = []
def tryit(name, f):
    try:
        f(); done.append(name)
    except Exception as e:
        done.append(name + " LỖI: " + repr(e)[:80])
tryit("mua + đặt hướng dương", lambda: (st.buy("sunflower"), st.place("yard", "sunflower", 8, 1)))
def fields_old():
    col = mw.col
    m = col.models.by_name("Kanji")
    if m is None:
        m = [x for x in col.models.all() if not x["name"].startswith("Chinese")][0]
    keys = [f["name"] for f in m["flds"]]
    conf, err = kb.fields_core.validate_save({"kind": "vocab", "f": {"word": keys[0], "meaning": keys[-1]}}, keys, "ja")
    kb.FIELDS.set_model(str(m["id"]), conf, "ja")
    kb.FIELDS.set_game("crow", "xx", "answer")
tryit("bản cũ lưu Cấu hình trường loại note khác + chế độ Ngôn ngữ khác", fields_old)
tryit("nhật ký", lambda: kb.JOURNAL.update(kb.cal_today(), {"t": "bản cũ viết tiếp"}))
result = done`);
  ok(did2.every((x) => !/LỖI/.test(x)), 'bản cũ chơi tiếp: ' + did2.join(', '));
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(1000);
  const raw = await py(KB + 'result = mw.col.get_config("kotoba_batake_fields", None)');
  ok(raw.lang2 && Object.values(raw.lang2).includes('zh') && raw.f2 && raw.games_lang2 && raw.games_lang2.zh,
    'bản cũ ghi đè Cấu hình trường mà vẫn giữ lang2 / f2 / games_lang2 của bản mới');
  if (raw.lang3 || want.cfg.kotoba_batake_fields && want.cfg.kotoba_batake_fields.lang3) {
    ok(raw.lang3 && Object.values(raw.lang3).includes('de') && raw.games_lang3 && raw.games_lang3.de && raw.games_lang3.de.crow === 'spell',
      '1.35: bản cũ ghi đè mà vẫn giữ lang3 / games_lang3 (tiếng Đức)');
  }
  const snap = await py(SNAPSHOT);
  fs.writeFileSync(SNAP(2), JSON.stringify(snap));
  await install();
}

async function p3() {
  const want = JSON.parse(fs.readFileSync(SNAP(2), 'utf8')), first = JSON.parse(fs.readFileSync(SNAP(1), 'utf8'));
  const got = await py(SNAPSHOT);
  console.log('== p3: lên lại ' + want.version + ' → ' + got.version);
  ok(got.version === first.version, 'Anki chạy lại bản mới ' + got.version);
  compare(want, got, 'sau khi lên lại');
  ok(got.owned.bench && got.owned.sunflower && got.diary === 'bản cũ viết tiếp', 'đồ mua ở bản mới (ghế) + ở bản cũ (hướng dương), nhật ký bản cũ viết đều còn');
  const leIds = Object.keys(first.owned).filter((k) => /^le_/.test(k));
  if (leIds.length) {         // 1.36: đồ sự kiện + tường Noel qua tay bản cũ
    const ex = await py(KB + 'd = st.load(); result = {"room": d["home"]["room"], "yard": d["home"]["yard"], "use": d["more"]["decor"]["use"]["room"], "own": d["more"]["decor"]["own"], "le": mw.col.get_config("kotoba_batake_le", None)}');
    ok(leIds.every((k) => got.owned[k] === first.owned[k]), 'đồ sự kiện Giáng sinh còn đủ sau khi bản cũ chạy chen: ' + leIds.map((k) => k + '×' + got.owned[k]).join(', '));
    ok(ex.room.some((e) => e.id === 'le_tulich') && ex.yard.some((e) => e.id === 'le_nguoituyet') && ex.yard.some((e) => e.id === 'xmastree'),
      'tủ lịch trên tường, người tuyết + cây thông ngoài sân vẫn ở chỗ cũ');
    ok(ex.use.wall === 'w_noelkeo' && ['w_noeltuyet', 'w_noelkeo', 'w_noeldo', 'f_noelcaro', 'f_noellen'].every((t) => ex.own.indexOf(t) >= 0),
      'tường Noel đang dùng + 5 mẫu Noel còn (bản cũ vẽ theo kiểu nhà, không xoá)');
    ok(ex.le && Object.keys(ex.le.noel2026.open).length === 21, 'sổ tủ lịch còn 21 ngăn đã mở');
    const n26 = (ex.le && ex.le.noel2026) || {};
    if (n26.cards) {
      ok(n26.cards[0] && n26.cards[0].t1 === 'Giáng sinh an lành!' && n26.cards[0].w === 'Ước gì học giỏi' && n26.hang && n26.hang.i === 0,
        '1.36.1: thiệp đã treo (cả điều ước) còn nguyên');
      ok((n26.recv || []).length === 1 && n26.santa && n26.santa.seen && n26.santa.facts === 'star,tree', '1.36.1: thiệp nhận, ông già Noel đã ghé còn nguyên');
      if (n26.orn) {
        ok(n26.cards[1] && n26.cards[1].d === '5U9595.' && n26.orn[0] && n26.orn[0].p === '..kkkk..'.repeat(2) + '.kUUUUk.'.repeat(4) + '..kkkk..'.repeat(2) && n26.orn[0].on === 1,
          '1.36.3: hình vẽ trên thiệp + quả châu tự vẽ (đang treo) còn nguyên');
      }
    }
  }
  await openGarden();
  const did = await py(KB + 'result = mw.col.decks.id_for_name("ZH::Hạ bản")');
  await py(KB + `kb._dialog.deck_id = ${did}; kb._dialog.refresh(); result = 1`); await sleep(1500);
  const v = await js('return { langs: Garden._data().plants.map((p) => p.lang), hv: Garden._data().plants.map((p) => p.hanviet || ""), pref: GardenLang.pref(), cur: GardenLang.cur() };');
  ok(v.langs.length === 4 && v.langs.every((l) => l === 'zh'), 'deck tiếng Trung vẫn là Tiếng Trung');
  ok(v.hv.every(Boolean), 'Hán Việt (lưu ở f2) còn: ' + v.hv.join(', '));
  ok(v.pref === 'zh' && v.cur === 'zh', 'Ngôn ngữ trong vườn vẫn là Tiếng Trung');
  const st2 = await py(KB + 'result = kb.FIELDS.load()');
  ok(st2.games_lang.zh && st2.games_lang.zh.crow === 'spell' && st2.games_lang.other && st2.games_lang.other.crow === 'answer',
    'chế độ Đuổi quạ: tiếng Trung "gõ chữ Hán" (bản mới đặt) + Ngôn ngữ khác "gõ nghĩa" (bản cũ đặt) đều còn');
  if (first.cfg.kotoba_batake_fields && first.cfg.kotoba_batake_fields.lang3) {      // 1.35
    const dd = await py(KB + 'result = mw.col.decks.id_for_name("DE::Hạ bản")');
    await py(KB + `kb._dialog.deck_id = ${dd}; kb._dialog.refresh(); result = 1`); await sleep(1500);
    const dl = await js('return Garden._data().plants.map((p) => p.lang);');
    ok(dl.length === 4 && dl.every((l) => l === 'de') && st2.games_lang.de && st2.games_lang.de.crow === 'spell',
      'deck tiếng Đức vẫn là Tiếng Đức, Đuổi quạ tiếng Đức "gõ chữ" còn: ' + dl.join(','));
  }
  await page.shot(path.join(SHOTS, 'habanh_p3.png'));
  const errs = await py(KB + 'result = [e.get("where") for e in kb.ERRORS.entries() if e.get("ver") == kb.VERSION]');
  ok(!errs.length, 'nhật ký Báo lỗi không có lỗi của bản mới' + (errs.length ? ': ' + errs.join(', ') : ''));
}

(async () => {
  if (PHASE === 'p1') { await p1(); } else if (PHASE === 'p2') { await p2(); } else if (PHASE === 'p3') { await p3(); } else { console.log('p1 | p2 | p3'); process.exit(2); }
  console.log(`\n${pass}/${total} kiểm tra đạt`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
