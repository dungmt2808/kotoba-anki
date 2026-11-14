// 1.30.3 — ảnh "trước / sau" khi làm giao diện ấm hơn (không phải test, nhưng in lỗi JS nếu có).
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
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 9); GardenSky.set("weather", "sunny"); return 1;');
  await sleep(1500);
  await shot('01_vuon_sang');

  // ⚙
  await js('document.getElementById("kb-sound").click(); return 1;'); await sleep(500);
  await shot('02_cai_dat');
  await js('document.body.click(); return 1;'); await sleep(300);

  // Nhiệm vụ
  await js('const b = document.getElementById("kb-quest"); if (b) b.click(); return 1;'); await sleep(500);
  await shot('03_nhiem_vu');
  await js('const b = document.getElementById("kb-quest"); if (b) b.click(); document.body.click(); return 1;'); await sleep(300);

  // Nhà: Trang trí sân + Nội thất + Xây nhà
  await js('document.getElementById("kb-house").click(); return 1;'); await sleep(1200);
  await js('document.querySelector("#kb-home .kb-h-tab[data-tab=yard]").click(); return 1;'); await sleep(700);
  await shot('04_nha_trang_tri_san');
  await js('document.querySelector("#kb-home .kb-h-tab[data-tab=room]").click(); return 1;'); await sleep(700);
  await shot('05_nha_noi_that');
  // hộp hỏi trước khi trả xu: bấm nút Mua đầu tiên còn bấm được
  await js(`const b = Array.from(document.querySelectorAll("#kb-h-list button")).find(x => /^Mua/.test(x.textContent) && !x.disabled); if (b) b.click(); return !!b;`);
  await sleep(700);
  await shot('06_hoi_mua');
  await js('const n = Array.from(document.querySelectorAll("button")).find(x => x.textContent.trim() === "Huỷ" && x.offsetParent); if (n) { n.disabled = false; n.click(); } return 1;'); await sleep(600);
  await js('document.querySelector("#kb-home .kb-h-tab[data-tab=pet]").click(); return 1;'); await sleep(700);
  await shot('07_nha_thu_nuoi');
  await js('document.getElementById("kb-h-exit").click(); return 1;'); await sleep(900);

  // Trò chơi
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(1000);
  await shot('08_tro_choi');
  await js('document.getElementById("kb-g-exit").click(); return 1;'); await sleep(800);

  // Ôn thẻ
  await js('document.getElementById("kb-review").click(); return 1;'); await sleep(2500);
  await shot('09_on_the');
  await js('const b = document.getElementById("kb-show"); if (b && !b.hidden) b.click(); return 1;'); await sleep(1200);
  await shot('10_on_the_mat_sau');
  await js('document.getElementById("kb-stop").click(); return 1;'); await sleep(900);

  // Báo
  await js('if (typeof GardenPaper !== "undefined") GardenPaper.open(); return 1;'); await sleep(1500);
  await shot('11_bao');
  await js('const b = document.querySelector("#kb-paper .kb-btn-small[id$=exit], #kb-p-exit"); if (b) b.click(); else if (GardenPaper.close) GardenPaper.close(); return 1;'); await sleep(800);

  // Lịch hoa
  await js('if (typeof GardenCal !== "undefined") GardenCal.open(); return 1;'); await sleep(1500);
  await shot('12_lich_hoa');
  await js('const e = Array.from(document.querySelectorAll("button")).find(x => /^Thoát/.test(x.textContent) && x.offsetParent); if (e) e.click(); return 1;'); await sleep(800);

  // Giao diện & chế độ học
  await js('document.getElementById("kb-sound").click(); document.getElementById("kb-ui-open").click(); return 1;'); await sleep(900);
  await shot('13_giao_dien');
  await js('const e = Array.from(document.querySelectorAll("button")).find(x => /^(Đóng|Thoát)/.test(x.textContent.trim()) && x.offsetParent); if (e) e.click(); return 1;'); await sleep(600);

  // Hoàng hôn + đêm
  // nền trang đổi màu dần trong 2 giây (transition) → chờ đủ rồi mới chụp
  await js('GardenSky.set("fixedHour", 18.4); return 1;'); await sleep(2800);
  await shot('14_vuon_hoang_hon');
  await js('GardenSky.set("fixedHour", 22); return 1;'); await sleep(2800);
  await shot('15_vuon_dem');
  await js('GardenSky.set("fixedHour", 9); GardenSky.set("weather", "rain"); return 1;'); await sleep(2800);
  await shot('16_vuon_mua');
  await js('GardenSky.set("weather", "sunny"); return 1;'); await sleep(600);

  // Cửa sổ nhỏ
  await size(1024, 700);
  await shot('17_vuon_1024');

  // Màn chào
  await size(1366, 768);
  await py(KB + 'kb.GREET_TEST_OFF = False; result = 1');
  await js('try { GardenPrefs.set("kb-greet-day", ""); } catch (e) {} return 1;');
  page.close();
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(1500);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await size(1366, 768); await sleep(1200);
  await shot('18_man_chao');
  console.log('lỗi JS:', JSON.stringify(page.errors));
  console.log('Ảnh:', OUT);
  page.close();
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
