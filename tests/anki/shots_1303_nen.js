// 1.30.3 — ảnh hai kiểu nền trang (Giấy ấm / Trời xanh) lúc ngày / hoàng hôn / đêm + nút chuyển ở ⚙ (không phải test, nhưng in lỗi JS nếu có).
// Chạy trên hai bản rồi ghép bằng tools/compare_shots.py:
//   ANKI_PY=… tests/anki/setup_demo.sh BASE ADDON && tests/anki/run_anki.sh BASE 9333 LOG &
//   node tests/anki/shots_1303.js OUT
// Hoặc: KB_SETUP=demo KB_SCRIPTS=shots_1303.js tests/anki/run_ui.sh ADDON OUT (run_ui.sh dùng bộ thẻ test — vẫn chụp được)
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = path.resolve(process.argv[2] || '/tmp/kb_shots_1303');
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
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
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function shot(name) {
  await sleep(350); await page.shot(path.join(OUT, name + '.png')); console.log('  ảnh', name);
}
async function size(w, h) { await py(KB + `kb._dialog.showNormal(); kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(900); }
const SETUP = KB + `
d = st.load(); d["coins"] = 100000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
for z in ("beach", "onsen"):
    try:
        st.unlock_zone(z)
    except Exception:
        pass
try:
    st.open_rooms()
except Exception:
    pass
def put(scene, iid, x, y):
    try:
        st.buy(iid); st.place(scene, iid, x, y)
    except Exception as e:
        pass
for a in [("kitchen", "reizouko", 0, 1), ("kitchen", "nagashi", 2, 1), ("kitchen", "shokutaku", 3, 3), ("kitchen", "tea", 8, 1),
          ("room", "painting", 1, 0), ("room", "shelf", 0, 1), ("room", "desk", 2, 1), ("room", "plant", 9, 1), ("room", "rug", 4, 2),
          ("room", "lamp", 3, 1), ("bedroom", "beddo", 1, 2), ("bedroom", "nightlamp", 3, 2),
          ("yard", "sakura", 4, 0), ("yard", "flowers", 4, 1), ("yard", "bench", 6, 1), ("yard", "mailbox", 4, 2), ("yard", "pond", 10, 2), ("yard", "lantern", 7, 2)]:
    put(*a)
try:
    st.pet_buy("neko"); st.pet_move("neko", "yard")
except Exception:
    pass
d = st.load(); d["coins"] = 4860; st.save(d)
result = 1`;

(async () => {
  await py(SETUP);
  await py(KB + 'kb.ASK_TEST_OFF = False; kb.LIFE_TEST_OFF = False; kb.GREET_TEST_OFF = True; kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await size(1366, 768);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(2000);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("weather", "sunny"); return 1;');
  for (const pg of ['paper', 'sky']) {
    await js(`GardenSky.set("page", "${pg}"); return 1;`);
    for (const [h, n] of [[9, 'ngay'], [18.4, 'hoang_hon'], [22, 'dem']]) {
      await js(`GardenSky.set("fixedHour", ${h}); return 1;`); await sleep(3000);
      await shot('nen_' + pg + '_' + n);
    }
  }
  await js('GardenSky.set("page", "paper"); GardenSky.set("fixedHour", 9); return 1;'); await sleep(3000);
  await js('document.getElementById("kb-sound").click(); return 1;'); await sleep(600);
  await shot('nen_nut_chuyen');
  console.log('lỗi JS:', JSON.stringify(page.errors));
  page.close();
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
