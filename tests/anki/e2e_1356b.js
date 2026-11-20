// 1.35.6 — kịch bản NGOÀI bộ test cho nút "Ẩn vườn / Hiện vườn" của bảng Báo (Anki thật):
//   1. bấm vội 40 lần (không chờ) xen đổi tab → chữ nút / lớp trang / config khớp nhau, không lỗi;
//   2. đổi cỡ cửa sổ liên tục khi vườn ẩn (12 lần, có lần nhỏ nhất 720 × 520 của Anki) → khung báo / hàng trên cùng đúng ở cỡ cuối;
//   3. Anki chế độ tối: nút đọc được (độ tương phản chữ / nền ≥ 4,5);
//   4. cỡ cảnh Lớn + Giáng sinh: Ẩn vườn → Hiện vườn → dải cảnh vẽ lại (có điểm ảnh), ruộng có cây;
//   5. Ngôn ngữ trong vườn = tiếng Anh: tiêu đề "Newspaper · …", cửa sổ 1024 px vẫn một hàng;
//   6. Báo đang ẩn vườn → Tưới ngay (R): bảng ôn theo chế độ riêng (hiện vườn), Dừng → màn chính; mở lại Báo vẫn ẩn;
//   7. Báo đang ẩn vườn → Nhà (N) → Thoát: màn chính đầy đủ;
//   8. nhật ký lỗi add-on trống, không lỗi JS.
// Chạy: KB_SCRIPTS=e2e_1356b.js run_ui.sh ADDON SHOTS
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenPaper !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
async function waitFor(expr, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await js('return (' + expr + ');')) return true; } catch (e) { /* trang đang nạp */ } await sleep(250); }
  return false;
}
const CLOSE_ALL = 'if (!document.getElementById("kb-panel").hidden) { document.getElementById("kb-stop").click(); } ' +
  'if (window.GardenGames) GardenGames.close(); if (window.GardenHome) GardenHome.close(); if (window.GardenPaper) GardenPaper.close(); ' +
  'if (window.GardenCal) GardenCal.close(); if (window.GardenUI && GardenUI.close) GardenUI.close(); ' +
  'if (window.GardenGreet && GardenGreet.close) GardenGreet.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;';
const STATE = `const b = document.getElementById("kb-p-garden"), app = document.getElementById("kb-app"), st = document.getElementById("kb-p-stage").getBoundingClientRect(),
    top = document.querySelector("#kb-paper .kb-game-top").getBoundingClientRect(), x = document.getElementById("kb-p-exit").getBoundingClientRect();
  return JSON.stringify({ btn: b.textContent, pressed: b.getAttribute("aria-pressed"), hideCls: app.classList.contains("kb-ui-yard-hide") && app.classList.contains("kb-ui-field-hide"),
    yard: !!document.getElementById("kb-yard-wrap").offsetParent, stage: Math.round(st.height), bottom: Math.round(st.bottom), vh: innerHeight, vw: innerWidth,
    docH: document.documentElement.scrollHeight, docW: document.documentElement.scrollWidth, topH: Math.round(top.height), exitIn: x.right <= top.right + 1,
    title: !!document.querySelector("#kb-paper .kb-game-top > .kb-g-title").offsetParent, titleText: document.querySelector("#kb-paper .kb-game-top > .kb-g-title").textContent,
    tab: document.querySelector(".kb-p-tab.is-on").getAttribute("data-ptab") });`;
const state = () => js(STATE).then(JSON.parse);
const cfgPanel = () => py(KB + 'c = kb.config()["ui"]; result = [c["panel"]["yard"], c["panel"]["field"]]');
const jsErrors = [];

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(2200);
  await js(CLOSE_ALL); await sleep(300);

  // ---- 1. bấm vội ----
  console.log('== 1. Bấm vội 40 lần xen đổi tab');
  await js('GardenPaper.open("issue"); return 1;');
  await waitFor('document.querySelectorAll("#kb-p-stage .kb-p-art").length >= 1');
  const TABS = ['issue', 'dict', 'shelf', 'src'];
  for (let i = 0; i < 40; i++) {
    const t = TABS[i % 4];
    await js('document.getElementById("kb-p-garden").click(); ' + (i % 3 === 0 ? 'document.querySelector(\'.kb-p-tab[data-ptab="' + t + '"]\').click(); ' : '') + 'return 1;');
    if (i % 7 === 0) { await sleep(40); }
  }
  await sleep(1500);
  const s1 = await state(), c1 = await cfgPanel();
  ok(s1.btn === 'Ẩn vườn' && s1.pressed === 'false' && !s1.hideCls && s1.yard && c1.join() === 'full,full', '40 lần (số chẵn) → về hiện vườn: nút / lớp / config khớp (' + s1.btn + ', ' + c1.join(', ') + ')');
  await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(900);
  const s1b = await state(), c1b = await cfgPanel();
  ok(s1b.btn === 'Hiện vườn' && s1b.hideCls && !s1b.yard && c1b.join() === 'hide,hide', 'thêm 1 lần → ẩn: nút / lớp / config khớp');

  // ---- 2. đổi cỡ liên tục ----
  console.log('== 2. Đổi cỡ cửa sổ liên tục khi vườn ẩn');
  const SIZES = [[1920, 1080], [800, 600], [1500, 900], [720, 520], [1024, 640], [1280, 720], [900, 1000], [1366, 768], [1110, 700], [1050, 700], [2200, 1300], [1024, 768]];
  for (const [w, h] of SIZES) { await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(120); }
  await sleep(1500);
  const s2 = await state();
  ok(s2.btn === 'Hiện vườn' && !s2.yard && s2.docW <= s2.vw && s2.exitIn, 'cỡ cuối 1024 × 768: vẫn ẩn, không tràn ngang (' + s2.docW + ' / ' + s2.vw + ')');
  ok(s2.stage === Math.max(320, s2.vh - 250) && s2.docH <= s2.vh + 1, 'khung báo theo cỡ cuối: ' + s2.stage + ' px = max(320, ' + s2.vh + ' − 250), trang không cuộn (' + s2.docH + ')');
  ok(s2.topH <= 40, 'hàng trên cùng một hàng ở cỡ cuối (' + s2.topH + ' px, tab ' + s2.tab + ')');
  await py(KB + 'kb._dialog.resize(720, 520); result = 1'); await sleep(1300);
  const s2b = await state();
  await page.shot(SHOTS + '/1356b_01_720x520_an_vuon.png');
  ok(s2b.docW <= s2b.vw && s2b.exitIn && s2b.stage >= 320, 'cửa sổ nhỏ nhất 720 × 520: không tràn ngang, nút Thoát trong hàng, khung báo ≥ 320 px (' + s2b.stage + ', hàng trên ' + s2b.topH + ')');

  // ---- 3. Anki chế độ tối ----
  console.log('== 3. Anki chế độ tối');
  await py('from aqt.theme import Theme\nmw.set_theme(Theme.DARK)\nresult = 1'); await sleep(1500);
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1000);
  const con = await js(`const lum = (c) => { const m = String(c).match(/[\\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
    const out = {}; ["kb-p-garden", "kb-p-exit"].forEach((id) => { const cs = getComputedStyle(document.getElementById(id)); const a = lum(cs.color), b = lum(cs.backgroundColor);
      out[id] = Math.round(((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)) * 10) / 10; }); return JSON.stringify(out);`).then(JSON.parse);
  await page.shot(SHOTS + '/1356b_02_che_do_toi.png');
  ok(con['kb-p-garden'] >= 4.5, 'Anki chế độ tối: chữ nút Hiện vườn đọc được (tương phản ' + con['kb-p-garden'] + ', nút Thoát ' + con['kb-p-exit'] + ')');
  await py('from aqt.theme import Theme\nmw.set_theme(Theme.LIGHT)\nresult = 1'); await sleep(800);

  // ---- 4. cỡ cảnh Lớn ----
  console.log('== 4. Cỡ cảnh Lớn + Giáng sinh');
  await js('GardenUI.setGlob("scene", "large"); GardenSeason.preview("noel"); return 1;'); await sleep(1200);
  await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(1500);
  const sc = await js(`const cv = document.getElementById("kb-yard"), f = document.getElementById("kb-field");
    const d = cv.getContext("2d").getImageData(0, 0, cv.width, cv.height).data; let n = 0; for (let i = 0; i < d.length; i += 4 * 97) { if (d[i + 3] > 0) n++; }
    return JSON.stringify({ yard: !!document.getElementById("kb-yard-wrap").offsetParent, w: cv.width, h: cv.height, painted: n, plants: f ? f.querySelectorAll("canvas, .kb-plant, [data-nid]").length : 0, fieldH: f ? Math.round(f.getBoundingClientRect().height) : 0 });`).then(JSON.parse);
  await page.shot(SHOTS + '/1356b_03_lon_hien_vuon.png');
  ok(sc.yard && sc.w > 0 && sc.painted > 100 && sc.fieldH > 50, 'Hiện vườn ở cỡ Lớn: dải cảnh vẽ lại (' + sc.w + ' × ' + sc.h + ', ' + sc.painted + ' mẫu có màu), ruộng cao ' + sc.fieldH + ' px');
  await js('GardenUI.setGlob("scene", "normal"); GardenSeason.preview(null); return 1;'); await sleep(500);

  // ---- 5. Ngôn ngữ trong vườn = tiếng Anh ----
  console.log('== 5. Ngôn ngữ trong vườn: tiếng Anh');
  await js('GardenPaper.close(); return 1;'); await sleep(300);
  await js('GardenLang.setPref("en"); return 1;'); await sleep(500);
  await py(KB + 'kb._dialog.resize(1600, 800); result = 1'); await sleep(1000);
  await js('GardenPaper.open("issue"); return 1;'); await sleep(1500);
  const e1 = await state();
  await py(KB + 'kb._dialog.resize(1024, 700); result = 1'); await sleep(1200);
  const e2 = await state();
  await page.shot(SHOTS + '/1356b_04_tieng_anh_1024.png');
  ok(e1.title && /^Newspaper · /.test(e1.titleText), 'tiếng Anh, 1600 px: tiêu đề "' + e1.titleText + '"');
  ok(e2.topH <= 40 && e2.exitIn, 'tiếng Anh, 1024 px: hàng trên cùng một hàng (' + e2.topH + ' px' + (e2.title ? '' : ', bỏ tiêu đề') + ')');
  await js('GardenPaper.close(); GardenLang.setPref("auto"); return 1;'); await sleep(500);

  // ---- 6. Tưới ngay khi Báo đang ẩn vườn ----
  console.log('== 6. Tưới ngay / Nhà khi Báo đang ẩn vườn');
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(800);
  await js('GardenPaper.open("issue"); return 1;'); await sleep(1200);
  if ((await state()).btn === 'Ẩn vườn') { await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(600); }
  await js('document.getElementById("kb-review").click(); return 1;');
  const rvOpen = await waitFor('!document.getElementById("kb-panel").hidden', 6000); await sleep(900);
  const rv = await js('return JSON.stringify({ paper: !document.getElementById("kb-paper").hidden, yard: !!document.getElementById("kb-yard-wrap").offsetParent });').then(JSON.parse);
  ok(rvOpen && !rv.paper && rv.yard, 'Tưới ngay: Báo đóng, bảng ôn hiện vườn (chế độ riêng)');
  await js('document.getElementById("kb-stop").click(); return 1;'); await sleep(900);
  ok(await js('return !!document.getElementById("kb-yard-wrap").offsetParent && document.getElementById("kb-panel").hidden;'), 'Dừng → màn chính có vườn');
  await js('GardenPaper.open("shelf"); return 1;'); await sleep(1000);
  ok((await state()).btn === 'Hiện vườn', 'mở lại Báo: vẫn ẩn vườn');
  await js('document.getElementById("kb-house").click(); return 1;'); await sleep(1500);
  const ho = await js('return JSON.stringify({ home: !document.getElementById("kb-home").hidden, paper: !document.getElementById("kb-paper").hidden });').then(JSON.parse);
  await js('if (window.GardenHome) GardenHome.close(); return 1;'); await sleep(900);
  const mainOk = await js('return !!document.getElementById("kb-yard-wrap").offsetParent && !!document.getElementById("kb-field").offsetParent;');
  ok(ho.home && !ho.paper && mainOk, 'Nhà khi Báo đang ẩn vườn → Báo đóng; Thoát Nhà → màn chính đầy đủ sân + ruộng');

  await py(KB + 'kb.save_config(ui={}); result = 1');
  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  jsErrors.push(...page.errors);
  ok(jsErrors.length === 0, 'không có lỗi JS' + (jsErrors.length ? ': ' + jsErrors.slice(0, 3).join(' | ') : ''));
  console.log('\n' + results.filter(Boolean).length + '/' + results.length + ' kiểm tra đạt');
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
