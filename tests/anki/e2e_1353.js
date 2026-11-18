// 1.35.3 trong Anki thật — ảnh người dùng 18/11 (cỡ cảnh Lớn, Giáng sinh, 20:38): "tự nhiên có 1 cái dây trang trí bắc ngang
// qua phía trên nhà". Kịch bản: cửa sổ vườn 1920 × 1080, ⚙ Cỡ cảnh Lớn, Giáng sinh (xem thử), 22 giờ
//   1. hàng đèn sáng ban đêm nằm trên dây ở mép trên (đọc điểm ảnh của dải cảnh: không có hàng đèn ở giữa trời);
//   2. ⚙ hiệu ứng tắt (như máy bật "giảm chuyển động"): khung hình vẽ đủ, không lỗi JS (1.35.2: đèn Giáng sinh ném lỗi
//      ở phần cảnh bên trái → khung hình vẽ dở);
//   3. vùng tự tạo nền "Đồi hoa" ở màn chính rộng: vẽ đủ (1.35.2: ném lỗi mỗi khung hình → chỉ còn trời);
//   4. nhật ký lỗi add-on trống, không lỗi JS.
// Chạy: KB_SCRIPTS=e2e_1353.js run_ui.sh ADDON SHOTS
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots';
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
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
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';

// đọc dải cảnh: hàng (theo điểm ảnh cảnh) có nhiều điểm màu đèn rực (đỏ / vàng / xanh / tím…) trong phần trời
const SCAN = `
  const cv = document.getElementById("kb-yard"), v = GardenHome._mainView(), ctx = cv.getContext("2d");
  const dpr = cv.width / cv.clientWidth, S = v.S * dpr, W = cv.width, top = v.oy;   // top = số hàng trời thêm (cỡ Lớn)
  const d = ctx.getImageData(0, 0, W, cv.height).data, rows = [];
  for (let y = 0; y < top + 28; y++) {
    const py = Math.floor((y + 0.5) * S); let n = 0;
    for (let x = 0; x < W; x += Math.max(1, Math.floor(S))) {
      const i = (py * W + x) * 4, r = d[i], g = d[i + 1], b = d[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      if (mx > 140 && mx - mn > 90) { n++; }          // màu rực: đèn / đồ treo, không phải trời đêm / mây / tuyết
    }
    rows.push(n);
  }
  return JSON.stringify({ top: top, S: v.S, rows: rows });`;

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1920, 1080); kb._dialog.refresh(); result = 1'); await sleep(1800);
  await js('if (window.GardenPaper) GardenPaper.close(); if (window.GardenCal) GardenCal.close(); if (window.GardenGreet && GardenGreet.close) GardenGreet.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  await js('GardenUI.open(); return 1;'); await sleep(400);
  await js('const r = [...document.querySelectorAll("#kb-ui-stage .kb-ui-opt input")].find(i => i.name === "kb-ui-scene" && i.value === "large"); r.click(); return 1;'); await sleep(700);
  await js('GardenUI.close(); GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 22); GardenSky.set("weather", "sunny"); GardenSeason.preview("noel"); return 1;');
  await sleep(2500);
  const v = JSON.parse(await js('return JSON.stringify(GardenHome._mainView());'));
  ok(v && v.oy > 0, 'cỡ cảnh Lớn ở cửa sổ 1920 × 1080: có ' + (v && v.oy) + ' hàng trời thêm phía trên cảnh (×' + (v && v.S) + ')');
  ok(await js('return GardenSeason.active() === "noel";'), 'giao diện Giáng sinh (xem thử)');
  await page.shot(SHOTS + '/1353_01_lon_giang_sinh_22h.png');
  // dây ở mép trên: hàng 0–9 có đèn; giữa phần trời thêm (hàng 12 … top − 1) không có hàng đèn nào
  const sc = JSON.parse(await js(SCAN));
  const topRows = sc.rows.slice(0, 10), mid = sc.rows.slice(12, sc.top);
  const peakTop = Math.max.apply(null, topRows), peakMid = Math.max.apply(null, mid.length ? mid : [0]);
  ok(peakTop >= 20, 'dây đèn ở mép trên của dải cảnh (hàng đèn rực nhất: ' + peakTop + ' điểm)');
  ok(peakMid < Math.max(6, peakTop / 4), 'giữa phần trời thêm không có hàng đèn thứ hai (nhiều nhất ' + peakMid + ' điểm / hàng; 1.35.2: hàng đèn ở hàng ' + sc.top + ' trở đi)');
  const near = sc.rows.slice(sc.top, sc.top + 10), peakNear = Math.max.apply(null, near);
  ok(peakNear < Math.max(6, peakTop / 4), 'ngay dưới phần trời thêm (chỗ dây của cỡ thường) cũng không có hàng đèn (' + peakNear + ')');

  // ⚙ hiệu ứng tắt: 1.35.2 ném lỗi ở đèn Giáng sinh (phần cảnh bên trái)
  const e0 = page.errors.length;
  await js('GardenFX.config({ effects: false, sound: false }); return 1;'); await sleep(2000);
  await page.shot(SHOTS + '/1353_02_lon_giang_sinh_tat_hieu_ung.png');
  ok(page.errors.length === e0, 'hiệu ứng tắt: không lỗi JS khi vẽ dây Giáng sinh' + (page.errors.length > e0 ? ': ' + page.errors.slice(e0, e0 + 2).join(' | ') : ''));
  const house = await js(`const cv = document.getElementById("kb-yard"), v = GardenHome._mainView(), dpr = cv.width / cv.clientWidth;
    const d = cv.getContext("2d").getImageData(Math.floor((v.ox + 30) * v.S * dpr), Math.floor((v.oy + 50) * v.S * dpr), 1, 1).data;
    return [d[0], d[1], d[2]].join(",");`);
  ok(house !== '0,0,0', 'hiệu ứng tắt: khung hình vẽ đủ (điểm ảnh ở thân nhà: ' + house + ')');
  await js('GardenFX.config({ effects: true, sound: false }); return 1;');

  // vùng tự tạo nền Đồi hoa ở màn chính rộng
  const e1 = page.errors.length;
  await js(`const d = Garden._data(); d.wallet.more = d.wallet.more || {}; d.wallet.more.zones = (d.wallet.more.zones || []).concat([{ id: "u9", name: "Đồi hoa thử", bg: "flower", ground: "#5ed35e", hills: "#7ed98a" }]);
    GardenPrefs.set("kb-main-scene", "u9"); GardenSeason.preview(null); GardenSky.set("fixedHour", 12); return 1;`);
  await sleep(2000);
  const sceneNow = await js('return GardenHome.mainScene();');
  await page.shot(SHOTS + '/1353_03_vung_doi_hoa.png');
  ok(sceneNow === 'u9', 'màn chính là vùng tự tạo nền Đồi hoa (' + sceneNow + ')');
  ok(page.errors.length === e1, 'vùng Đồi hoa ở cửa sổ rộng: không lỗi JS' + (page.errors.length > e1 ? ': ' + page.errors.slice(e1, e1 + 2).join(' | ') : ''));
  const ground = await js(`const cv = document.getElementById("kb-yard"), v = GardenHome._mainView(), dpr = cv.width / cv.clientWidth;
    const d = cv.getContext("2d").getImageData(Math.floor(4 * dpr), Math.floor((v.oy + 60) * v.S * dpr), 1, 1).data;
    return d[1] > d[0] && d[1] > d[2] && d[1] > 120;`);
  ok(ground, 'vùng Đồi hoa: đất xanh vẽ tới tận mép trái cửa sổ (1.35.2: chỉ còn trời)');
  await js('GardenPrefs.set("kb-main-scene", "yard"); return 1;');
  await py(KB + 'kb.save_config(ui={}); result = 1');

  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log('\n' + results.filter(Boolean).length + '/' + results.length + ' kiểm tra đạt');
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
