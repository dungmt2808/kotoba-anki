// Ảnh phác giao diện 1.26 → 1.29 (chưa phải mã thật) trên vườn mẫu (bộ thẻ demo_col.py, có cây đủ giai đoạn):
//   1.26 màn chào (thú / StackChan / thú đi chơi), Bảng tin làng, ⚙ · ảnh gốc để ghép chuyển cảnh (tools: mock_126_ghep.py)
//   1.27 cây lấp lánh, quẻ, trăng + sao băng, sổ 歳時記, mốc học · 1.28 chỗ lấp lánh, Hộp sưu tầm, gánh hàng rong
//   1.29 chuông làng, hiệu ứng thêm
// Chạy (trong tests/anki, ANKI_PY = venv aqt):
//   ./setup_demo.sh /tmp/kb_mock126 ../../kotoba_batake && (./run_anki.sh /tmp/kb_mock126 9333 /tmp/kb_mock126.log &)
//   node mock_126.js OUT ; ./kill_anki.sh
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_126';
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const LIB = fs.readFileSync(path.join(__dirname, 'mock_126_lib.js'), 'utf8');
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
const KB = 'import sys, os, time, json, shutil\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
async function shot(name) { await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;'); await sleep(200); await page.shot(path.join(OUT, name + '.png')); console.log('  ảnh', name); }
async function clip(name, sel) {
  const r = await js(`const e = document.querySelector(${JSON.stringify(sel)}); const b = e.getBoundingClientRect(); return [b.x, b.y, b.width, b.height];`);
  const s = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: r[0], y: r[1], width: r[2], height: r[3], scale: 1 } });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64')); console.log('  ảnh', name);
}
const sky = (h, w) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "${w || 'sunny'}"); return 1;`);
const scene = (s) => js(`localStorage.setItem("kb-main-scene", ${JSON.stringify(s)}); return 1;`).then(() => sleep(1300));
const M = (code) => js('Mock126.' + code + '; return 1;');

(async () => {
  await py(KB + `d = st.load(); d["coins"] = 100000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
yard = [("sakura", 4, 0), ("lantern", 7, 0), ("bonsai", 12, 0), ("birdhouse", 14, 0), ("flowers", 4, 1), ("bench", 6, 1),
        ("sunflower", 8, 1), ("well", 13, 1), ("kazaguruma", 15, 1), ("mailbox", 4, 2), ("pond", 6, 2), ("maneki", 11, 2)]
room = [("painting", 1, 0), ("clock", 7, 0), ("shelf", 0, 1), ("aquarium", 8, 1), ("plant", 9, 1), ("rug", 4, 2), ("kotatsu", 4, 2), ("cat", 7, 3), ("andon", 0, 3)]
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
    st.open_rooms()
except Exception:
    pass
try:
    st.pet_buy("neko")
except Exception:
    pass
kb.open_garden(); result = 1`);
  await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + `kb._dialog.resize(1920, 1080); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("Tiếng Nhật::N5 · Từ vựng"); d.refresh(); result = 1`); await sleep(2500);
  await js('localStorage.setItem("kb-main-scene", "yard"); GardenSeason.preview("momiji"); return 1;');
  await sky(8); await sleep(1500);
  await page.eval(LIB + '; 1');

  console.log('== 1.26');
  await M('greet({ who: "neko", hi: "おはよう！", vi: "Mít · Chào buổi sáng!", date: "Thứ bảy 07/11 · Mùa lá đỏ", news: ["[i:book] Báo mới đã tới", "[i:paw] Hôm nay cáo có thể ghé Đền trên núi", "[i:star] Còn 3 ngày nữa đủ 100 ngày có ôn"] })');
  await shot('126_01_chao_sang');
  await sky(20); await sleep(1200);
  await M('greet({ who: "stack", hi: "こんばんは！", vi: "Chào buổi tối! Hôm nay ôn 24 thẻ rồi đó.", date: "Thứ bảy 07/11", news: ["[i:target] Còn 6 lượt nữa là đủ mục tiêu ngày", "[i:moon] Trăng lưỡi liềm cuối tháng"] })');
  await shot('126_02_chao_toi_stackchan');
  await sky(14); await sleep(1200);
  await M('greet({ who: "stack", out: true, hi: "こんにちは！", vi: "Mít đi chơi rồi — cho ăn là về nhé.", date: "Thứ bảy 07/11", news: ["[i:paw] Nhà → Thú nuôi → Cho ăn"] })');
  await shot('126_03_chao_thu_di_choi');
  // ảnh gốc cho chuyển cảnh: màn chào sáng · vườn · Trong nhà
  await sky(8); await sleep(1000);
  await M('greet({ who: "neko", hi: "おはよう！", vi: "Mít · Chào buổi sáng!", date: "Thứ bảy 07/11 · Mùa lá đỏ", news: ["[i:book] Báo mới đã tới", "[i:paw] Hôm nay cáo có thể ghé Đền trên núi"] })');
  await shot('raw_chao');
  await M('clear()'); await sleep(400);
  await shot('raw_vuon');
  await clip('raw_dai_san', '#kb-yard');
  await scene('house'); await clip('raw_dai_nha', '#kb-yard');
  await scene('yard');
  // Bảng tin làng
  await M('newsLine("[i:star] Tin làng: cáo có thể ghé Đền ▸")');
  await M('newsPop([["[i:paw] Cáo có thể ghé Đền trên núi", ""], ["[i:leaf] Mùa lá đỏ · tới 15/11", ""], ["[i:wrench] Nhà hơi cũ (rêu bám)", "Sửa ở Xây nhà"], ["[i:star] Còn 3 ngày nữa đủ 100 ngày có ôn", ""]], [["[i:blossom] 立冬 りっとう · Lập đông", "CN 08/11"], ["[i:gift] Gánh hàng ghé Ga", "T4 11/11"], ["[i:snow] Giáng sinh bắt đầu", "15/11"], ["[i:star] Mưa sao băng Sư Tử", "17/11"]])');
  await shot('126_04_tin_lang');
  await M('clear()');
  await js('GardenUI.open(); return 1;'); await sleep(800);
  await M('uiRows([["Chào khi mở vườn", "Bật", "Tắt"], ["Chuyển cảnh", "Bật", "Tắt"]])'); await sleep(300);
  await clip('126_05_cai_dat', '#kb-ui-stage');
  await js('document.getElementById("kb-ui-exit").click(); return 1;'); await sleep(800);

  console.log('== 1.27');
  const due = await js('const p = Garden._data().plants || []; const out = []; p.forEach((x, i) => { if (x.due_in !== null && x.due_in !== undefined && x.due_in <= 0 && out.length < 3) out.push(i); }); return out;');
  await js('window.scrollTo(0, 0); return 1;');
  await M(`sparkle(${JSON.stringify(due.length ? due : [2, 9, 15])}, ${due.length ? due[0] : 2})`);
  await shot('127_01_cay_lap_lanh');
  await M('clear()');
  await scene('shrine'); await sleep(500);
  await M('omikujiBox(null, 46, 40)');
  await M('kuji(760, 120)');
  await shot('127_02_que');
  await M('clear()');
  await scene('yard'); await sky(22); await sleep(1500);
  await M('moonMeteors()');
  await M('newsLine("[i:moon] Đêm nay mưa sao băng Sư Tử ▸")');
  await shot('127_03_dem_sao_bang');
  await M('clear()');
  await sky(10); await sleep(800);
  await M('saijiki(640, 300)');
  await shot('127_04_saijiki');
  await M('clear()');
  await scene('house'); await sleep(500);
  await M('milestone()'); await M('cake(214, 56)');
  await shot('127_05_moc_hoc');
  await M('clear()');

  console.log('== 1.28');
  await scene('beach'); await sleep(500);
  const sp = await js('const r = Mock126.spot(150, 52); return r;');
  await js(`Mock126.pickPop(${Math.round(sp[0] + 70)}, ${Math.round(sp[1] - 40)}); return 1;`);
  await shot('128_01_nhat_do');
  await M('clear()');
  await M('collection(620, 260)');
  await shot('128_02_hop_suu_tam');
  await M('clear()');
  await scene('station'); await sleep(500);
  const vd = await js('return Mock126.vendor(118, 34);');
  await js(`Mock126.shop(${Math.round(vd[0] + 130)}, ${Math.round(vd[1] + 40)}); return 1;`);
  await shot('128_03_ganh_hang');
  await M('clear()');

  console.log('== 1.29');
  await scene('yard'); await sky(7); await sleep(1200);
  await M('bellEditor(660, 300)');
  await shot('129_01_chuong_lang');
  await M('clear()');
  await M('fxSun()'); await M('fxPlace(150, 40)');
  await shot('129_02_hieu_ung');
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
