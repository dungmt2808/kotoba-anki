// Ảnh phác 1.32 (16/11) — "Tiếng trong vườn" (Nhật / Anh / Trung / Hàn / chỉ tiếng Việt) + deck tiếng Trung / tiếng Hàn
// bước 1. Chưa phải mã thật: vẽ đè lên vườn thật của add-on 1.31.5 (chữ lấy từ bản nháp docs/ke_hoach_1_32/tieng_nhap.py).
// Chạy (ANKI_PY = venv aqt):
//   B=/tmp/kb_mock132; ./setup_demo.sh $B ../../kotoba_batake && $ANKI_PY demo_zhko.py $B/Test/collection.anki2
//   (./run_anki.sh $B 9333 $B.log &) ; node mock_132.js OUT [bước…] ; python3 mock_132_ghep.py OUT ; ./kill_anki.sh
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_132';
const ONLY = process.argv.slice(3);
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const W = 1366, H = 860;
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const KB = 'import sys, os, time, json, shutil, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
const hideToast = () => js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
async function shot(name, clip) {
  await sleep(300);
  const params = { format: 'png' };
  if (clip) { params.clip = Object.assign({ scale: 1 }, clip); }
  const r = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('  ảnh', name);
}
async function rect(sel) {
  return js(`const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return {x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height)};`);
}
const pad = (r, p, q) => ({ x: Math.max(0, r.x - p), y: Math.max(0, r.y - (q === undefined ? p : q)), width: r.width + 2 * p, height: r.height + 2 * (q === undefined ? p : q) });
const sky = (h, w) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "${w || 'sunny'}"); return 1;`);
const scene = (s) => js(`GardenPrefs.set("kb-main-scene", ${JSON.stringify(s)}); return 1;`).then(() => py(KB + 'kb._dialog.refresh(); result = 1')).then(() => sleep(1500));
const deck = (name) => py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`).then(() => sleep(2000));
const want = (k) => !ONLY.length || ONLY.indexOf(k) >= 0;

async function setup() {
  await py(KB + `d = st.load(); d["coins"] = 200000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
yard = [("sakura", 4, 0), ("lantern", 7, 0), ("bonsai", 12, 0), ("birdhouse", 14, 0), ("flowers", 4, 1), ("bench", 6, 1),
        ("sunflower", 8, 1), ("well", 13, 1), ("kazaguruma", 15, 1), ("mailbox", 4, 2), ("pond", 6, 2), ("maneki", 11, 2)]
room = [("painting", 1, 0), ("clock", 7, 0), ("shelf", 0, 1), ("aquarium", 8, 1), ("plant", 9, 1), ("rug", 4, 2), ("kotatsu", 4, 2), ("andon", 0, 3), ("desk", 6, 1), ("tea", 3, 2)]
for _ in range(3):
    try:
        st.open_rooms()
    except Exception:
        pass
for scene, items in (("yard", yard), ("room", room)):
    for iid, x, y in items:
        try:
            st.buy(iid); st.place(scene, iid, x, y)
        except Exception:
            pass
for z in kb.core.ZONE_IDS:
    try:
        st.unlock_zone(z)
    except Exception:
        pass
try:
    st.pet_buy("neko")
except Exception:
    pass
# sổ sinh hoạt: đã thấy phần lớn việc trong nhà + sân (ngày giả trong tháng 10–11)
lc = kb.life_core
base = datetime.date(2026, 10, 20)
for i, aid in enumerate(lc.ACTS):
    if i % 5 == 4:
        continue
    w = lc.ACTS[aid]["where"]
    sc = "room" if w == "home" else ("yard" if w in ("yard", "out") else w)
    try:
        kb.LIFE.mark(aid, sc, base + datetime.timedelta(days=i % 25))
    except Exception:
        pass
# Hộp sưu tầm: đủ bộ Sân vườn, 4 món Bãi biển
ev = kb.EVENTS.load()
fd = ev.setdefault("found", {})
for i, fid in enumerate(["katatsumuri", "yotsuba", "koishi", "hane", "biidama", "tane", "kaigara", "hitode", "seaglass", "ryuboku"]):
    fd[fid] = {"d": (base + datetime.timedelta(days=i)).isoformat(), "n": 1 + i % 3}
kb.EVENTS.save(ev)
# khách: đã gặp 10 loài
gc = kb.guests
for i, gid in enumerate(list(gc.GUESTS)[:11]):
    try:
        kb.GUESTS.met(gid, "yard", base + datetime.timedelta(days=i))
    except Exception:
        pass
kb.save_config(show_tooltips=False, sound=False, music=False)
kb.open_garden(); result = 1`);
  await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + `kb._dialog.resize(${W}, ${H}); result = 1`);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); return 1;');
  await js('GardenSeason.preview("momiji"); return 1;');
  await scene('yard'); await sky(9); await sleep(1500);
}

(async () => {
  const p0 = await gardenPage();
  if (p0) { page = p0; } else { await setup(); }
  if (p0 && want('setup')) { await setup(); }
  await page.eval(fs.readFileSync(path.join(__dirname, 'mock_132_lib.js'), 'utf8') + '; 1');
  if (want('raw')) { await hideToast(); await shot('raw_vuon'); }
  const steps = require('./mock_132_steps.js');
  for (const k of Object.keys(steps)) {
    if (!want(k)) { continue; }
    console.log('==', k);
    await steps[k]({ js, py, shot, rect, pad, sky, scene, deck, sleep, page, KB, hideToast, W, H });
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
