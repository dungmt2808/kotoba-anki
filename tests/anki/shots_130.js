// Ảnh 1.30 cho README / báo cáo (không phải test): bộ thẻ mẫu (setup_demo.sh), nhà 3 gian đủ đồ, 6 vùng.
//   a: Trong nhà buổi sáng — StackChan nấu ăn trong Bếp (tường / sàn mua riêng) · b: thẻ câu tiếng Nhật khi bấm vào StackChan
//   c: buổi tối — ngủ trên giường · d: tab Nội thất → Tường & sàn · e: Xưởng vẽ mẫu sàn 16×16
//   f: Suối nước nóng — ngâm trong bồn đá · g: Bãi biển — bơi phao · h: Album → Sinh hoạt
// Chạy: ANKI_PY=… setup_demo.sh BASE ADDON && run_anki.sh BASE 9333 LOG & ; node shots_130.js OUT
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = path.resolve(process.argv[2] || '/tmp/kb_shots_130');
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLife !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
  await js('const t = document.getElementById("kb-toast"); if (t) { t.hidden = true; } return 1;').catch(() => 0);
  await sleep(250); await page.shot(path.join(OUT, name + '.png')); console.log('  ảnh', name);
}
const SETUP = KB + `
mw.col.set_config("kotoba_batake_life", {})
d = st.load(); d["coins"] = 100000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
for z in kb.core.ZONE_IDS:
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
        print("x", scene, iid, e)
for sc in ("room", "kitchen", "bedroom", "yard", "beach", "onsen"):
    d = st.load()
    for i in range(len(d["home"].get(sc) or []) - 1, -1, -1):
        st.take(sc, i)
for a in [("kitchen", "reizouko", 0, 1), ("kitchen", "nagashi", 2, 1), ("kitchen", "suihanki", 5, 1), ("kitchen", "shokutaku", 3, 3),
          ("kitchen", "yasaikago", 7, 2), ("kitchen", "shokkidana", 6, 0), ("kitchen", "tea", 8, 1),
          ("room", "painting", 1, 0), ("room", "calendar", 7, 0), ("room", "shelf", 0, 1), ("room", "desk", 2, 1), ("room", "tv", 7, 1),
          ("room", "plant", 9, 1), ("room", "rug", 4, 2), ("room", "kotatsu", 4, 2), ("room", "radio", 1, 3), ("room", "aquarium", 8, 3), ("room", "lamp", 3, 1),
          ("bedroom", "beddo", 1, 2), ("bedroom", "tansu", 0, 1), ("bedroom", "kyodai", 4, 1), ("bedroom", "nightlamp", 3, 2),
          ("bedroom", "hoshizora", 5, 0), ("bedroom", "dakimakura", 7, 3), ("bedroom", "ikebana", 8, 1),
          ("yard", "sakura", 4, 0), ("yard", "flowers", 4, 1), ("yard", "bench", 6, 1), ("yard", "well", 13, 1), ("yard", "mailbox", 4, 2), ("yard", "pond", 10, 2), ("yard", "lantern", 7, 2),
          ("beach", "parasol", 6, 1), ("beach", "palm", 12, 0), ("beach", "sandcastle", 9, 2),
          ("onsen", "rotenburo", 7, 1), ("onsen", "milk", 5, 1), ("onsen", "yukidaruma", 12, 2), ("onsen", "oke", 10, 1)]:
    put(*a)
try:
    st.pet_buy("neko"); st.pet_move("neko", "room")
except Exception:
    pass
for did in ("w_sakura", "f_soi", "w_kem", "f_caro", "w_sao", "f_xuongca"):
    try:
        st.decor_buy(did)
    except Exception:
        pass
st.decor_use("kitchen", "wall", "w_kem"); st.decor_use("kitchen", "floor", "f_caro")
st.decor_use("bedroom", "wall", "w_sao"); st.decor_use("bedroom", "floor", "f_xuongca")
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
result = 1
`;
(async () => {
  await py(KB + 'kb.LIFE_TEST_OFF = False\nresult = 1');        // add-on test tắt ghi Sổ sinh hoạt cho kịch bản cũ
  await py(SETUP);
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nkb.open_garden()\nresult = 1');
  page = await gardenPage();
  await py(KB + 'kb._dialog.resize(1600, 900)\nresult = 1');
  await sleep(1500);
  const sky = (h, w) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "${w || 'sunny'}"); return 1;`).catch(() => 0);
  const act = async (view, id, scene) => {
    await js(`if (GardenHome.mainScene() !== "${view}") { GardenHome.showMain("${view}"); } GardenLife._force("${id}", "${scene}"); return 1;`);
    await sleep(700); await js('GardenLife._snap(); return 1;'); await sleep(1300);
  };
  await sky(7.2);
  await act('house', 'ryouri', 'kitchen');
  await shot('130_a_nau_an');
  await act('house', 'ocha', 'kitchen');
  const hit = await js(`const b = GardenLife._box(), v = GardenHome._mainView(), cv = document.getElementById("kb-yard"), r = cv.getBoundingClientRect();
    return b ? [r.left + (b.x + 148 * 0 + b.w / 2 + v.ox) * v.S, r.top + (b.y + b.h / 2 + (v.oy || 0)) * v.S] : null;`);
  if (hit) { for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x: hit[0], y: hit[1], button: 'left', clickCount: 1 }); } }
  await sleep(600);
  await shot('130_b_the_tieng_nhat');
  await js('GardenLife.closeCard(); return 1;');
  await sky(23);
  await act('house', 'neru', 'bedroom');
  await shot('130_c_ngu');
  await sky(20);
  await act('house', 'hon', 'room');
  await shot('130_c2_doc_sach');
  await sleep(1800);            // để thông báo "Sinh hoạt mới: Đọc sách" kịp hiện rồi shot() ẩn đi (khỏi lọt vào ảnh sau)
  await sky(10);
  await js('GardenLife._force("", "yard"); GardenHome.open("room"); GardenHome.setTab("room"); return 1;'); await sleep(500);
  await js('document.querySelector(\'[data-roomview="decor"]\').click(); return 1;'); await sleep(700);
  await shot('130_d_tuong_san');
  await js('document.querySelector(\'[data-decor="floor:new"] .kb-h-buy\').click(); return 1;'); await sleep(700);
  // vẽ sẵn một mẫu caro chéo để có hình xem trước
  const g = await js('const r = document.getElementById("kb-cf-grid").getBoundingClientRect(); return [r.left, r.top, r.width / 16];');
  for (let k = 0; k < 16; k += 4) {
    await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: g[0] + g[2] * (k + 0.5), y: g[1] + g[2] * 0.5, button: 'left', clickCount: 1 });
    for (let i = 1; i < 16; i++) { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g[0] + g[2] * (((k + i) % 16) + 0.5), y: g[1] + g[2] * (i + 0.5), button: 'left' }); }
    await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g[0] + g[2] * (((k + 15) % 16) + 0.5), y: g[1] + g[2] * 15.5, button: 'left', clickCount: 1 });
  }
  await js('document.getElementById("kb-cf-name").value = "Sọc chéo"; return 1;'); await sleep(400);
  await shot('130_e_xuong_ve_san');
  await js('GardenCraft.close(); GardenHome.close(); return 1;'); await sleep(400);
  await sky(20);
  await act('onsen', 'onsen', 'onsen');
  await shot('130_f_tam_suoi');
  await sky(12);
  await act('beach', 'oyogu', 'beach');
  await shot('130_g_tam_bien');
  // vài việc vào sổ rồi mở Album → Sinh hoạt
  await py(KB + `import datetime
for i, (a, s) in enumerate([("ryouri", "kitchen"), ("ocha", "kitchen"), ("neru", "bedroom"), ("hon", "room"), ("onsen", "onsen"), ("oyogu", "beach"), ("mizuyari", "room"), ("taberu", "kitchen")]):
    kb.LIFE.mark(a, s, kb.cal_today() - datetime.timedelta(days=i % 3))
kb._dialog.refresh(); result = 1`);
  await sleep(700);
  await js('GardenLife._force("", "yard"); GardenHome.openLife(); return 1;'); await sleep(900);
  await shot('130_h_so_sinh_hoat');
  await js('GardenHome.close(); GardenLife._force(null); return 1;');
  page.close();
  process.exit(0);
})().catch((e) => { console.error(e); try { page && page.close(); } catch (x) { } process.exit(1); });
