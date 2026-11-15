// Ảnh phác 1.26 làm lại trên giao diện 1.25.9 (12/11): màn chào khi mở vườn, Tin làng, ⚙, ảnh gốc cho chuyển cảnh.
// Chưa phải mã thật — vẽ đè lên trang vườn thật (hình thú / StackChan / đồ / trời của add-on), dùng mock_126_lib.js.
// Mới so với bản 07/11: màn chào báo đã dùng vé giữ chuỗi (thay thông báo nhỏ), câu chào theo giao diện mùa, Tin làng có
// gói báo / vé giữ chuỗi, cảnh "Trong nhà" là cả nhà 3 gian, khung "bật nhẹ" khi mở bảng.
// Chạy (trong tests/anki, ANKI_PY = venv aqt):
//   ./setup_demo.sh /tmp/kb_mock126b ../../kotoba_batake && (./run_anki.sh /tmp/kb_mock126b 9333 /tmp/kb_mock126b.log &)
//   node mock_126_v2.js OUT && python3 mock_126_v2_ghep.py OUT ; ./kill_anki.sh
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_126b';
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const LIB = fs.readFileSync(path.join(__dirname, 'mock_126_lib.js'), 'utf8');
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
const hideToast = () => js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; const s = document.getElementById("kb-say"); if (s) s.hidden = true; return 1;');
async function shot(name) { await hideToast(); await sleep(250); await page.shot(path.join(OUT, name + '.png')); console.log('  ảnh', name); }
async function rect(sel) { return js(`const e = document.querySelector(${JSON.stringify(sel)}); const b = e.getBoundingClientRect(); return [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)];`); }
const sky = (h, w) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "${w || 'sunny'}"); return 1;`);
const M = (code) => js('Mock126.' + code + '; return 1;');
// thêm vào màn chào: hình đồ theo mùa ở hai bên, tuyết rơi
const greetExtra = (o) => js(`const cv = document.querySelector(".mk-greet canvas"); if (!cv) { return 0; }
  const ctx = cv.getContext("2d"), L = GardenHome._lib(), S = 6, W = cv.width, H = cv.height;
  (${JSON.stringify(o.items || [])}).forEach(([id, fx, fy]) => { if (L.SPR[id]) { L.sprite(ctx, L.SPR[id], W * fx / S, H * fy / S, S); } });
  if (${!!o.snow}) { ctx.fillStyle = "#ffffff"; for (let i = 0; i < 160; i++) { const s = i % 5 ? 4 : 6; ctx.fillRect((i * 151) % W, (i * 89) % H, s, s); } }
  return 1;`);
const scene = (s) => js(`GardenPrefs.set("kb-main-scene", ${JSON.stringify(s)}); return 1;`).then(() => py(KB + 'kb._dialog.refresh(); result = 1')).then(() => sleep(1500));

(async () => {
  await py(KB + `d = st.load(); d["coins"] = 100000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
yard = [("sakura", 4, 0), ("lantern", 7, 0), ("bonsai", 12, 0), ("birdhouse", 14, 0), ("flowers", 4, 1), ("bench", 6, 1),
        ("sunflower", 8, 1), ("well", 13, 1), ("kazaguruma", 15, 1), ("mailbox", 4, 2), ("pond", 6, 2), ("maneki", 11, 2)]
room = [("painting", 1, 0), ("clock", 7, 0), ("shelf", 0, 1), ("aquarium", 8, 1), ("plant", 9, 1), ("rug", 4, 2), ("kotatsu", 4, 2), ("andon", 0, 3)]
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
kb.save_config(show_tooltips=False, sound=False, music=False)
kb.open_garden(); result = 1`);
  await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + `kb._dialog.resize(${W}, ${H}); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("Tiếng Nhật::N5 · Từ vựng"); d.refresh(); result = 1`); await sleep(2500);
  await js('GardenSeason.preview("momiji"); return 1;');
  await scene('yard');
  await sky(8); await sleep(1500);
  await page.eval(LIB + '; 1');
  const DATE = 'Thứ Năm 12/11 · Mùa lá đỏ';

  console.log('== màn chào');
  await M(`greet({ who: "neko", hi: "おはよう！", vi: "Mít · Chào buổi sáng!", date: "${DATE}", news: ["[i:book] Báo mới đã tới", "[i:paw] Tối nay cáo đỏ có thể ghé Đền trên núi", "[i:star] Còn 3 ngày nữa đủ 100 ngày có ôn"] })`);
  await shot('126_01_chao_sang');
  await shot('raw_chao');
  await sky(20); await sleep(1200);
  await M('greet({ who: "stack", hi: "こんばんは！", vi: "Chào buổi tối! Hôm nay ôn 24 thẻ rồi đó.", date: "Thứ Năm 12/11", news: ["[i:target] Còn 6 lượt nữa là đủ mục tiêu ngày"] })');
  await shot('126_02_chao_toi_stackchan');
  await sky(14); await sleep(1200);
  await M('greet({ who: "stack", out: true, hi: "こんにちは！", vi: "Mít đi chơi rồi — cho ăn là về nhé.", date: "Thứ Năm 12/11", news: ["[i:paw] Nhà → Thú nuôi → Cho ăn"] })');
  await shot('126_03_chao_thu_di_choi');
  await sky(8); await sleep(1200);
  // 1.25.9: quên ôn hôm qua, vé giữ chuỗi đã dùng → báo ngay trên màn chào (không thêm thông báo nhỏ ở góc)
  await M(`greet({ who: "neko", hi: "おはよう！", vi: "Mít · Hôm qua bận hả? Chuỗi vẫn còn nè!", date: "${DATE}", news: ["[i:snow] Đã dùng 1 vé giữ chuỗi · chuỗi 27 ngày", "[i:book] Báo mới đã tới"] })`);
  await shot('126_04_chao_ve_giu_chuoi');
  // câu chào theo giao diện mùa (đang bật Giáng sinh): メリークリスマス！ + đồ của mùa hai bên, tuyết
  await js('GardenSeason.preview("noel"); return 1;'); await sky(19, 'snow'); await sleep(1500);
  await M('greet({ who: "neko", hi: "メリークリスマス！", vi: "Mít · Giáng sinh vui vẻ!", date: "Thứ Sáu 25/12 · Giáng sinh", noFlowers: true, news: ["[i:paw] Chồn tuyết có thể ghé Sân vườn hôm nay"] })');
  await greetExtra({ items: [["xmastree", 0.12, 0.7], ["presents", 0.25, 0.82], ["sleigh", 0.74, 0.76], ["presents", 0.86, 0.86]], snow: true });
  await shot('126_05_chao_theo_mua');
  await M('clear()');
  await js('GardenSeason.preview("momiji"); return 1;'); await sky(8); await sleep(1500);

  console.log('== Tin làng');
  await shot('raw_vuon');
  const yard = await rect('#kb-yard'), today = await rect('#kb-today');
  await M('newsLine("[i:star] Tin làng: cáo đỏ ghé Đền tối nay ▸")');
  await js(`Mock126.newsPop([["[i:paw] Tối nay cáo đỏ có thể ghé Đền trên núi", ""], ["[i:leaf] Mùa lá đỏ · tới 10/12", ""], ["[i:wrench] Nhà hơi cũ (rêu bám)", "Sửa ở Xây nhà"],
    ["[i:star] Còn 3 ngày nữa đủ 100 ngày có ôn", ""], ["[i:snow] Có 1 vé giữ chuỗi", ""]],
    [["[i:snow] Giáng sinh bắt đầu", "CN 15/11"], ["[i:book] Gói báo hết hạn · tự gia hạn", "T3 17/11"]]);
    const h = document.querySelector(".mk-pop h4"); if (h) { h.textContent = "Tin làng · Thứ Năm 12/11"; } return 1;`);
  await shot('126_06_tin_lang');
  await M('clear()');

  console.log('== ⚙');
  await js('GardenUI.open(); return 1;'); await sleep(900);
  await M('uiRows([["Chào khi mở vườn", "Bật", "Tắt"], ["Chuyển cảnh", "Bật", "Tắt"]])'); await sleep(400);
  await shot('126_07_cai_dat');
  await js('document.getElementById("kb-ui-exit").click(); return 1;'); await sleep(900);

  console.log('== ảnh gốc cho chuyển cảnh');
  await clipTo('raw_dai_san', '#kb-yard');
  await scene('house'); await clipTo('raw_dai_nha', '#kb-yard');
  await scene('beach'); await clipTo('raw_dai_bien', '#kb-yard');
  await scene('yard');
  await shot('raw_vuon2');
  await js('GardenHome.open(); return 1;'); await sleep(900);
  const home = await rect('#kb-home');
  await shot('raw_nha');
  await js('GardenHome.close(); return 1;'); await sleep(500);
  fs.writeFileSync(path.join(OUT, 'raw_meta.json'), JSON.stringify({ yard, today, home, size: [W, H] }));
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });

async function clipTo(name, sel) {
  await hideToast();
  const r = await rect(sel);
  const s = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: r[0], y: r[1], width: r[2], height: r[3], scale: 1 } });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(s.data, 'base64')); console.log('  ảnh', name);
}
