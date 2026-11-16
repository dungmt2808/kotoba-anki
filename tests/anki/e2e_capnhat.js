// 1.31.4: cập nhật add-on đúng như người dùng — chạy bằng run_capnhat.sh GÓI_CŨ GÓI_MỚI SHOTS (xem chú thích ở đó).
//   node e2e_capnhat.js truoc SHOTS GÓI_MỚI : chơi bằng bản cũ, chụp dữ liệu, cài đè gói mới, đóng Anki
//   node e2e_capnhat.js sau   SHOTS GÓI_MỚI : (Anki đã mở lại, bản mới) so dữ liệu, mở vườn, thử tính năng mới
const fs = require('fs'), path = require('path');
const { pages, Page, sleep } = require('./cdp');
const PHASE = process.argv[2], SHOTS = process.argv[3] || '/tmp/kb_shots_capnhat', NEW = path.resolve(process.argv[4] || '');
fs.mkdirSync(SHOTS, { recursive: true });
const SNAP = path.join(SHOTS, 'capnhat_truoc.json');
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
async function waitFor(expr, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
async function waitPy(code, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await py(code); if (v) return v; } catch (e) { } await sleep(200); }
  return false;
}
const KB = 'import sys, os, json, hashlib\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
// ảnh chụp dữ liệu: mọi khoá kotoba_batake_* của collection, mọi file của user_files/ (sha1), cấu hình add-on, revlog
const SNAPSHOT = KB + `
cfg = {k: v for k, v in mw.col.all_config().items() if k.startswith("kotoba_batake")}
base = os.path.join(kb.ADDON_DIR, "user_files"); files = {}
for root, dirs, fs in os.walk(base):
    for f in fs:
        p = os.path.join(root, f)
        with open(p, "rb") as fh: files[os.path.relpath(p, base)] = hashlib.sha1(fh.read()).hexdigest()
w = st.load()
result = {"version": kb.VERSION, "cfg": cfg, "files": files, "addon": mw.addonManager.getConfig("kotoba_batake"),
          "revlog": mw.col.db.scalar("select count() from revlog"), "coins": w["coins"],
          "owned": w["home"]["owned"], "yard": sorted([e["id"], e["x"], e["y"]] for e in w["home"]["yard"]),
          "diary": kb.JOURNAL.entry(kb.cal_today()).get("t", ""), "life": sorted(kb.LIFE.seen())}`;
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1');
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
}
async function reviewOne() {
  const r0 = await py('result = mw.col.db.scalar("select count() from revlog")');
  await js('document.getElementById("kb-review").click(); return 1;');
  await waitFor('return !document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden;');
  await js('document.getElementById("kb-show").click(); return 1;');
  await waitFor('return !document.getElementById("kb-ratings").hidden;');
  await js('document.querySelector(".kb-rate-3").click(); return 1;');
  await waitPy('result = mw.col.db.scalar("select count() from revlog") > ' + r0);
  await sleep(800);
}

async function truoc() {
  const ver = await py(KB + 'result = kb.VERSION');
  console.log('== bản cũ ' + ver + ': chơi đủ thứ');
  await py(KB + 'kb.save_config(show_tooltips=False); result = 1');
  await openGarden();
  await py(KB + 'did = mw.col.decks.id_for_name("A::Có câu ví dụ + audio")\nkb._dialog._dispatch("deck:%d" % did)\nresult = did'); await sleep(1200);
  for (let i = 0; i < 3; i++) { await reviewOne(); }
  await js('document.getElementById("kb-stop").click(); return 1;'); await sleep(500);
  const did = await py(KB + `done = []
def tryit(name, f):
    try:
        f(); done.append(name)
    except Exception as e:
        done.append(name + " LỖI: " + repr(e)[:80])
d = st.load(); d["coins"] += 100000; st.save(d)
tryit("xây nhà", lambda: [st.build() for _ in range(7)])
tryit("ghế gỗ", lambda: (st.buy("bench"), st.place("yard", "bench", 6, 1)))
tryit("hướng dương", lambda: (st.buy("sunflower"), st.place("yard", "sunflower", 8, 1)))
tryit("vùng Bãi biển", lambda: st.unlock_zone("beach"))
tryit("mèo", lambda: st.pet_buy("neko"))
tryit("tường anh đào", lambda: (st.decor_buy("w_sakura"), st.decor_use("room", "wall", "w_sakura")))
tryit("mũ rơm", lambda: st.buy_wear("straw"))
tryit("nhật ký", lambda: kb.JOURNAL.update(kb.cal_today(), {"t": "nhật ký viết bằng 1.31.3, trước khi cập nhật"}))
import datetime
tryit("sổ sinh hoạt", lambda: kb.LIFE.mark("hon", "room", datetime.date.today()))
def zh_deck():
    # 1.32: deck tiếng Trung đã cấu hình bằng bản cũ (bản cũ chỉ có "Ngôn ngữ khác") + chế độ Đuổi quạ của nhóm đó
    col = mw.col
    mm = col.models
    m = mm.new("Chinese HSK (cũ)")
    for f in ("Hanzi", "Pinyin", "Nghĩa"):
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = "{{Hanzi}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Nghĩa}}"
    mm.add_template(m, t); mm.add(m); m = mm.by_name("Chinese HSK (cũ)")
    did = col.decks.id("ZH::Cũ")
    for w, p, me in (("你好", "nǐ hǎo", "xin chào"), ("谢谢", "xièxie", "cảm ơn"), ("学生", "xuésheng", "học sinh"), ("老师", "lǎoshī", "giáo viên")):
        n = col.new_note(m); n["Hanzi"], n["Pinyin"], n["Nghĩa"] = w, p, me; col.add_note(n, did)
    lang = "other" if "zh" not in kb.fields_core.LANGS else "zh"
    conf, err = kb.fields_core.validate_save({"kind": "vocab", "f": {"word": "Hanzi", "reading": "Pinyin", "meaning": "Nghĩa"}},
                                             ["Hanzi", "Pinyin", "Nghĩa"], lang)
    kb.FIELDS.set_model(str(m["id"]), conf, lang)
    kb.FIELDS.set_game("crow", "xx", "answer")
tryit("deck tiếng Trung + Cấu hình trường", zh_deck)
kb._dialog.refresh()
result = done`);
  ok(did.every((x) => !/LỖI/.test(x)), 'bản cũ làm được: ' + did.join(', '));
  await js('GardenSky.set("weather", "rain"); return 1;'); await sleep(900);
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(1200);
  const snap = await py(SNAPSHOT);
  fs.writeFileSync(SNAP, JSON.stringify(snap, null, 1));
  ok(snap.revlog >= 3 && snap.coins > 0 && snap.owned.bench && snap.diary && snap.life.includes('hon') &&
    Object.keys(snap.cfg).length >= 5 && Object.keys(snap.files).length >= 3,
  'đã chụp dữ liệu: ' + Object.keys(snap.cfg).length + ' khoá collection, ' + Object.keys(snap.files).length + ' file user_files, ' +
    snap.coins + ' xu, ' + snap.revlog + ' lượt ôn');
  ok(((snap.addon || {}).prefs || {})['kb-sky'] && /rain/.test(snap.addon.prefs['kb-sky']), 'cài đặt ⚙ (Mưa) đã lưu ở cấu hình add-on');

  console.log('== cài đè gói mới bằng trình quản lý add-on của Anki');
  const inst = await py(`import os, json
r = mw.addonManager.install(${JSON.stringify(NEW)})
folder = mw.addonManager.addonsFolder("kotoba_batake")
m = json.load(open(os.path.join(folder, "manifest.json"), encoding="utf-8"))
n = sum(len(f) for _r, _d, f in os.walk(os.path.join(folder, "user_files")))
result = {"kind": type(r).__name__, "ver": m.get("human_version"), "files": n}`);
  const want = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  ok(inst.kind === 'InstallOk' && inst.ver !== ver, 'Anki cài xong (' + inst.kind + '), trên đĩa là bản ' + inst.ver);
  ok(inst.files === Object.keys(want.files).length, 'user_files/ còn đủ ' + inst.files + ' file ngay sau khi cài (Anki giữ thư mục này)');
  console.log('== đóng Anki (bản cũ còn trong bộ nhớ chạy móc đóng hồ sơ)');
  await py('from aqt.qt import QTimer\nQTimer.singleShot(300, mw.close)\nresult = 1');
}

async function sau() {
  const want = JSON.parse(fs.readFileSync(SNAP, 'utf8'));
  const got = await py(SNAPSHOT);
  console.log('== sau khi cập nhật: ' + want.version + ' → ' + got.version);
  const man = JSON.parse(require('child_process').execFileSync('python3', ['-c',
    'import sys, zipfile, json; print(zipfile.ZipFile(sys.argv[1]).read("manifest.json").decode())', NEW]).toString());
  ok(got.version === man.human_version && got.version !== want.version, 'Anki chạy bản mới ' + got.version);
  const keys = Object.keys(want.cfg);
  const lost = keys.filter((k) => !(k in got.cfg));
  const changed = keys.filter((k) => k in got.cfg && k !== 'kotoba_batake_rev' && JSON.stringify(got.cfg[k]) !== JSON.stringify(want.cfg[k]));
  ok(!lost.length, 'không mất khoá nào của collection (' + keys.length + ' khoá)' + (lost.length ? ' — MẤT: ' + lost.join(', ') : ''));
  ok(!changed.length, 'mọi khoá giữ nguyên nội dung (trừ dấu phiên bản kotoba_batake_rev)' + (changed.length ? ' — ĐỔI: ' + changed.join(', ') : ''));
  const gone = Object.keys(want.files).filter((f) => !(f in got.files));
  const diffF = Object.keys(want.files).filter((f) => f in got.files && got.files[f] !== want.files[f]);
  ok(!gone.length, 'mọi file trong user_files/ còn nguyên (' + Object.keys(want.files).length + ' file)' + (gone.length ? ' — MẤT: ' + gone.join(', ') : ''));
  ok(!diffF.length, 'nội dung file không đổi' + (diffF.length ? ' — đổi: ' + diffF.join(', ') : ''));
  ok(JSON.stringify(got.addon) === JSON.stringify(want.addon), 'cấu hình add-on (⚙, khoá Gemini, mục tiêu ngày…) giữ nguyên');
  ok(got.coins === want.coins && got.revlog === want.revlog && JSON.stringify(got.owned) === JSON.stringify(want.owned) &&
    JSON.stringify(got.yard) === JSON.stringify(want.yard), 'xu ' + got.coins + ', đồ đã mua, đồ trên sân, lượt ôn y như trước');
  ok(got.diary === want.diary && JSON.stringify(got.life) === JSON.stringify(want.life), 'nhật ký "' + got.diary + '" và sổ sinh hoạt còn nguyên');

  console.log('== mở vườn bằng bản mới');
  await openGarden();
  const shown = await js('return { coins: (document.getElementById("kb-coins") || {}).textContent || "", weather: GardenSky.settings().weather };');
  ok(shown.coins.replace(/\D/g, '') === String(want.coins), 'vườn hiện đúng số xu: ' + shown.coins);
  ok(shown.weather === 'rain', 'cài đặt ⚙ còn: Mưa');
  await page.shot(path.join(SHOTS, 'capnhat_vuon_sau.png'));
  await py(KB + 'did = mw.col.decks.id_for_name("A::Có câu ví dụ + audio")\nkb._dialog._dispatch("deck:%d" % did)\nresult = did'); await sleep(1200);
  const c0 = await py(KB + 'result = [st.load()["coins"], mw.col.db.scalar("select count() from revlog")]');
  await reviewOne();
  const c1 = await py(KB + 'result = [st.load()["coins"], mw.col.db.scalar("select count() from revlog")]');
  await js('document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true })); return 1;');
  await waitPy(KB + 'result = mw.col.db.scalar("select count() from revlog") < ' + c1[1] + ' and not kb._dialog._busy');
  await sleep(600);
  const c2 = await py(KB + 'result = [st.load()["coins"], mw.col.db.scalar("select count() from revlog")]');
  ok(c1[1] === c0[1] + 1 && c2[1] === c0[1] && c2[0] === c0[0], 'tính năng mới trên dữ liệu cũ: ôn 1 thẻ (+' + (c1[0] - c0[0]) + ' xu) → Ctrl+Z → xu / lượt ôn về như trước');
  if (await py(KB + 'result = "zh" in kb.fields_core.LANGS and mw.col.decks.id_for_name("ZH::Cũ") is not None')) {
    // 1.32: deck tiếng Trung bản cũ lưu là "Ngôn ngữ khác" → bản mới nhận lại là tiếng Trung, không đổi dữ liệu đã lưu
    await py(KB + 'kb._dialog._dispatch("deck:%d" % mw.col.decks.id_for_name("ZH::Cũ"))\nresult = 1'); await sleep(1500);
    const zl = await js('return { langs: Garden._data().plants.map((p) => p.lang), cur: GardenLang.cur() };');
    ok(zl.langs.length === 4 && zl.langs.every((l) => l === 'zh') && zl.cur === 'zh', 'deck tiếng Trung cấu hình ở bản cũ ("Ngôn ngữ khác") → bản mới nhận là tiếng Trung, vườn tự sang tiếng Trung');
    const raw2 = await py(KB + 'result = mw.col.get_config("kotoba_batake_fields", None)');
    ok(JSON.stringify(raw2) === JSON.stringify(want.cfg.kotoba_batake_fields), 'Cấu hình trường trong collection không bị đổi khi chỉ mở vườn');
  }
  const errs = await py(KB + 'result = [e.get("where") for e in kb.ERRORS.entries() if e.get("ver") == kb.VERSION]');
  ok(!errs.length, 'nhật ký Báo lỗi không có lỗi của bản mới' + (errs.length ? ': ' + errs.join(', ') : ''));
}

(async () => {
  if (PHASE === 'truoc') { await truoc(); } else if (PHASE === 'sau') { await sau(); } else { console.log('truoc | sau'); process.exit(2); }
  console.log(`\n${pass}/${total} kiểm tra đạt`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
