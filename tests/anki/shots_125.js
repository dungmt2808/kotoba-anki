// 1.25 — chụp nhà 3 gian theo kiểu nhà, bố cục A (README + báo cáo kiểm tra):
//   125_nha_{kiểu}_ngay          dải cảnh "Trong nhà" ở màn chính 1920 × 1080, 4 kiểu nhà (ba gian đổi theo kiểu)
//   125_nha_classic_dem / _1366  ban đêm · cửa sổ 1366 × 768
//   125_chua_mo_rong             chưa mở rộng: hai gian bên tối như nhau, hai biển đối xứng
//   125_the_mo_rong / 125_kieu_nha  tab Xây nhà: một thẻ "Mở rộng nhà" · thẻ kiểu nhà có ảnh ba gian
//   125_an_day_trang_tri         ⚙ → Màn chính → Dây trang trí: Ẩn
//   125_hinh_nen_nha.png         hình nền 1920 × 1080 nguyên nhà (nút chụp ảnh)
// Chạy: KB_SCRIPTS=shots_125.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_125';
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
  const PHOTO = SHOTS + '/125_hinh_nen_nha.png';
  await py(KB + `d = st.load(); d["coins"] = 50000; d["home"]["house"] = 7; d["home"]["room"] = []
d["home"]["styles"] = ["minka", "teahouse", "castle"]; d["home"]["style"] = "classic"
st.save(d)
os.environ["KB_TEST_PHOTO"] = "${PHOTO}"
for k in ("kotatsu", "shelf", "aquarium", "andon", "clock", "ukiyoe", "plant", "rug",
          "reizouko", "nagashi", "shokutaku", "suihanki", "shokkidana", "yasaikago",
          "beddo", "tansu", "nightlamp", "kyodai", "dakimakura", "hoshizora"):
    st.buy(k)
kb.open_garden(); result = 1`);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1920, 1080); kb._dialog.refresh(); result = 1'); await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); localStorage.setItem("kb-main-scene", "house"); GardenSeason.preview("momiji"); return 1;');
  await sleep(2000);
  await clip('125_chua_mo_rong', '#kb-yard');
  await py(KB + `st.open_rooms()
for sc, k, x, y in [("room", "shelf", 0, 1), ("room", "ukiyoe", 1, 0), ("room", "clock", 7, 0), ("room", "rug", 3, 3), ("room", "kotatsu", 3, 3),
                    ("room", "aquarium", 8, 1), ("room", "andon", 9, 3), ("room", "plant", 6, 2),
                    ("kitchen", "reizouko", 0, 1), ("kitchen", "nagashi", 1, 1), ("kitchen", "shokkidana", 6, 0), ("kitchen", "suihanki", 7, 1),
                    ("kitchen", "shokutaku", 3, 3), ("kitchen", "yasaikago", 7, 3),
                    ("bedroom", "hoshizora", 1, 0), ("bedroom", "tansu", 0, 1), ("bedroom", "kyodai", 6, 1), ("bedroom", "beddo", 2, 3),
                    ("bedroom", "nightlamp", 1, 3), ("bedroom", "dakimakura", 6, 3)]:
    st.place(sc, k, x, y)
try:
    st.pet_buy("neko")
except Exception:
    pass
kb._dialog.refresh(); result = 1`);
  await sleep(2500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); GardenSeason.preview("momiji"); return 1;');
  await sleep(1500);
  for (const s of ['classic', 'minka', 'teahouse', 'castle']) {
    await py(KB + `st.use_style("${s}") if "${s}" != "classic" or st.load()["home"]["style"] != "classic" else None
kb._dialog.refresh(); result = 1`);
    await sleep(2200);
    await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSeason.preview("momiji"); return 1;'); await sleep(600);
    await clip('125_nha_' + s + '_ngay', '#kb-yard');
  }
  await py(KB + 'st.use_style("classic"); kb._dialog.refresh(); result = 1'); await sleep(2200);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 21); GardenSeason.preview("momiji"); return 1;'); await sleep(2500);
  await clip('125_nha_classic_dem', '#kb-yard');
  await js('GardenSky.set("fixedHour", 10); return 1;'); await sleep(800);
  await js('document.getElementById("kb-yard-snap").click(); return 1;'); await sleep(400);
  await js('document.querySelector("#kb-snap-pop [data-snap=wall]").click(); return 1;'); await sleep(2500);
  // ⚙ → Màn chính → Dây trang trí: Ẩn
  await js('GardenUI.open(); return 1;'); await sleep(800);
  await js('const r = [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio")].find((x) => /Dây trang trí/.test(x.textContent)); r.scrollIntoView({ block: "center" }); return 1;'); await sleep(300);
  await page.shot(SHOTS + '/125_nut_day_trang_tri.png');
  await js('const r = [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio")].find((x) => /Dây trang trí/.test(x.textContent)); r.querySelectorAll("input")[1].click(); return 1;'); await sleep(600);
  await js('GardenUI.close ? GardenUI.close() : document.getElementById("kb-ui-exit").click(); return 1;'); await sleep(1500);
  await page.shot(SHOTS + '/125_an_day_trang_tri.png');
  const deco = await js('return { band: document.getElementById("kb-theme-band").hidden, cls: document.getElementById("kb-app").className };');
  await js('GardenUI.open(); return 1;'); await sleep(600);
  await js('const r = [...document.querySelectorAll("#kb-ui-stage .kb-ui-radio")].find((x) => /Dây trang trí/.test(x.textContent)); r.querySelectorAll("input")[0].click(); return 1;'); await sleep(400);
  await js('GardenUI.close ? GardenUI.close() : document.getElementById("kb-ui-exit").click(); return 1;'); await sleep(800);
  // tab Xây nhà
  await js('GardenHome.open("room"); document.querySelector("#kb-home .kb-h-tab[data-tab=build]").click(); return 1;'); await sleep(1000);
  await js('const c = document.querySelector(".kb-h-nha"); c.scrollIntoView({ block: "start" }); return 1;'); await sleep(400);
  await page.shot(SHOTS + '/125_the_mo_rong.png');
  await js('const c = [...document.querySelectorAll("#kb-h-list .kb-h-card")].find((x) => /Lâu đài/.test(x.textContent)); c.scrollIntoView({ block: "center" }); return 1;'); await sleep(400);
  await page.shot(SHOTS + '/125_kieu_nha.png');
  await js('GardenHome.open("kitchen"); return 1;'); await sleep(1200);
  await page.shot(SHOTS + '/125_bang_bep.png');
  await js('GardenHome.close(); return 1;'); await sleep(500);
  // 1366 × 768
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(2000);
  await clip('125_nha_classic_1366', '#kb-yard');
  // mưa · tuyết (1366)
  await js('GardenSky.set("weather", "rain"); return 1;'); await sleep(1500);
  await clip('125_mua', '#kb-yard');
  await js('GardenSky.set("weather", "snow"); return 1;'); await sleep(1500);
  await clip('125_tuyet', '#kb-yard');
  await js('GardenSky.set("weather", "sunny"); return 1;'); await sleep(600);
  // Cỡ cảnh Lớn ở 1920 × 1080: đủ chỗ cho mái đầy đủ
  await py(KB + 'kb.save_config(ui={"scene": "large"}); kb._dialog.resize(1920, 1080); kb._dialog.refresh(); result = 1'); await sleep(2500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); GardenSeason.preview("momiji"); return 1;'); await sleep(1500);
  await clip('125_co_canh_lon', '#kb-yard');
  await py(KB + 'kb.save_config(ui={}); result = 1');
  // nhà chưa xây xong (bước 5): phòng chính kiểu gốc, hai gian bên "Xây xong nhà để mở rộng"
  await py(KB + `d = st.load(); d["home"]["house"] = 5; st.save(d)
col = st._col(); n = col.get_config(kb.core.NHA_KEY, {}); n["rooms"] = []; col.set_config(kb.core.NHA_KEY, n)
kb._dialog.refresh(); result = st.load()["home"]["rooms"]`); await sleep(2500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; localStorage.setItem("kb-main-scene", "house"); return 1;'); await sleep(1500);
  await clip('125_nha_chua_xay_xong', '#kb-yard');
  console.log(JSON.stringify({ photo: fs.existsSync(PHOTO), deco }));
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
