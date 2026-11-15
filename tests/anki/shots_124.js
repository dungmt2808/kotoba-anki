// 1.24 — chụp nhà 3 gian đã bày đồ (README + báo cáo kiểm tra):
//   124_nha_3_gian_ngay / _dem   dải cảnh "Trong nhà" ở màn chính, cửa sổ 1920 × 1080 (cả nhà ×4)
//   124_bep / 124_phong_ngu      bảng Nhà ở từng gian
//   124_mo_rong_nha              tab Xây nhà: hai thẻ "Mở rộng nhà" (một gian đã mở)
//   124_anh_nguyen_nha.png       ảnh chụp nguyên nhà cỡ lớn (nút chụp ảnh của màn chính)
// Chạy: KB_SCRIPTS=shots_124.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_124';
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
const KB = 'import sys, os, time, json, shutil\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
async function clip(name, sel) {
  const r = await js(`const e = document.querySelector(${JSON.stringify(sel)}); const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height];`);
  const s = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: r[0], y: r[1], width: r[2], height: r[3], scale: 1 } });
  fs.writeFileSync(SHOTS + '/' + name + '.png', Buffer.from(s.data, 'base64'));
}

(async () => {
  const PHOTO = SHOTS + '/124_anh_nguyen_nha.png';
  await py(KB + `d = st.load(); d["coins"] = 50000; d["home"]["house"] = 7; d["home"]["room"] = []
st.save(d)
os.environ["KB_TEST_PHOTO"] = "${PHOTO}"
st.open_room("kitchen"); st.open_room("bedroom")
for k in ("kotatsu", "shelf", "aquarium", "andon", "clock", "ukiyoe", "plant", "rug",
          "reizouko", "nagashi", "shokutaku", "suihanki", "shokkidana", "yasaikago",
          "beddo", "tansu", "nightlamp", "kyodai", "dakimakura", "hoshizora"):
    st.buy(k)
for sc, k, x, y in [("room", "shelf", 0, 1), ("room", "ukiyoe", 1, 0), ("room", "clock", 7, 0), ("room", "rug", 3, 3), ("room", "kotatsu", 3, 3),
                    ("room", "aquarium", 8, 1), ("room", "andon", 9, 3), ("room", "plant", 6, 2),
                    ("kitchen", "reizouko", 0, 1), ("kitchen", "nagashi", 1, 1), ("kitchen", "shokkidana", 2, 0), ("kitchen", "suihanki", 4, 1),
                    ("kitchen", "shokutaku", 4, 3), ("kitchen", "yasaikago", 7, 2),
                    ("bedroom", "hoshizora", 2, 0), ("bedroom", "tansu", 0, 1), ("bedroom", "kyodai", 8, 1), ("bedroom", "beddo", 2, 3),
                    ("bedroom", "nightlamp", 1, 3), ("bedroom", "dakimakura", 5, 2)]:
    st.place(sc, k, x, y)
try:
    st.pet_buy("neko")
except Exception:
    pass
try:
    st.pet_move("neko", "room")
except Exception:
    pass
kb.open_garden(); result = 1`);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1920, 1080); kb._dialog.refresh(); result = 1'); await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); localStorage.setItem("kb-main-scene", "house"); return 1;');
  await sleep(2500);
  await clip('124_nha_3_gian_ngay', '#kb-yard');
  await js('GardenSky.set("fixedHour", 21); return 1;'); await sleep(2500);
  await clip('124_nha_3_gian_dem', '#kb-yard');
  await js('GardenSky.set("fixedHour", 10); return 1;'); await sleep(800);
  await js('document.getElementById("kb-yard-snap").click(); return 1;'); await sleep(400);
  await js('document.querySelector("#kb-snap-pop [data-snap=l]").click(); return 1;'); await sleep(2000);
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1200);
  await js('GardenHome.open("kitchen"); return 1;'); await sleep(1500);
  await page.shot(SHOTS + '/124_bep.png');
  await js('GardenHome.open("bedroom"); return 1;'); await sleep(1500);
  await page.shot(SHOTS + '/124_phong_ngu.png');
  console.log(JSON.stringify({ photo: fs.existsSync(PHOTO) }));
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
