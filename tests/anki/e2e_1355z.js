// 1.35.5 (audit 19/11 #05) — Anki đặt hệ số phóng to trang (biến ANKI_WEBSCALE, Qt5 trên Linux dpi cao): trước đây vườn
// chèn CSS `body { zoom }` → 100vw / 100vh không co theo, mép phải (nút đóng, phần cuối các bảng) bị cắt, không cuộn ngang
// được. Nay phóng to bằng zoom của webview. Kiểm: hệ số đúng, trang không rộng hơn cửa sổ, mọi bảng lớn nằm trọn bề ngang.
// Chạy: ANKI_WEBSCALE=1.25 KB_SCRIPTS=e2e_1355z.js run_ui.sh ADDON SHOTS
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots';
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
let pass = 0, total = 0;
const ok = (c, m) => { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
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
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\nfrom aqt import mw\n';
const WIDE = `const W = innerWidth, out = { iw: W, sw: document.documentElement.scrollWidth, app: Math.round(document.getElementById("kb-app").getBoundingClientRect().right) };
  out.over = [...document.querySelectorAll("#kb-app *")].filter((e) => e.offsetParent !== null && getComputedStyle(e).position !== "fixed" && e.getBoundingClientRect().right > W + 2 && e.getBoundingClientRect().width > 0)
    .slice(0, 4).map((e) => (e.id || e.className || e.tagName) + "@" + Math.round(e.getBoundingClientRect().right));
  return JSON.stringify(out);`;

(async () => {
  const env = await py('import os\nresult = os.environ.get("ANKI_WEBSCALE", "")');
  await py(KB + 'kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})\nkb.open_garden()\nresult = 1');
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1200);
  const z = await py(KB + 'result = [float(kb._dialog.web.app_zoom_factor()), float(kb._dialog.web.zoomFactor()), kb._dialog.web.width()]');
  console.log('ANKI_WEBSCALE=' + env + ' app_zoom_factor=' + z[0] + ' zoomFactor=' + z[1] + ' web width=' + z[2]);
  ok(env && Math.abs(z[1] - Number(env)) < 0.01, 'webview phóng to đúng hệ số của Anki (' + z[1] + ')');
  const cssZoom = await js('return getComputedStyle(document.body).zoom;');
  ok(String(cssZoom) === '1' || cssZoom === 'normal', 'không còn CSS body { zoom } (' + cssZoom + ')');
  const iw = await js('return innerWidth;');
  ok(Math.abs(iw * z[1] - z[2]) < 4, 'bề ngang trang (px CSS) × hệ số = bề ngang cửa sổ: ' + iw + ' × ' + z[1] + ' ≈ ' + z[2]);
  let w = JSON.parse(await js(WIDE));
  ok(w.sw <= w.iw + 1 && w.app <= w.iw + 1 && w.over.length === 0, 'màn chính: không rộng hơn cửa sổ (1.35.4: cắt ' + Math.round(w.iw * 0.25) + ' px bên phải) — ' + JSON.stringify(w));
  await page.shot(SHOTS + '/1355z_man_chinh.png');
  const openers = [['Nhà', 'GardenHome.open();', 'kb-home'], ['Trò chơi', 'GardenGames.open();', 'kb-game'], ['Báo', 'GardenPaper.open("src");', 'kb-paper'],
    ['Lịch hoa', 'GardenCal.open({});', 'kb-cal']];
  for (const [nm, act, id] of openers) {
    await js(act + ' return 1;'); await sleep(1500);
    w = JSON.parse(await js(WIDE));
    const r = await js('return Math.round(document.getElementById("' + id + '").getBoundingClientRect().right);');
    ok(r <= w.iw + 1 && w.sw <= w.iw + 1, nm + ': bảng nằm trọn bề ngang (phải ' + r + ' / ' + w.iw + ', trang ' + w.sw + ')' + (w.over.length ? ' tràn: ' + w.over.join(' ') : ''));
    await page.shot(SHOTS + '/1355z_' + id + '.png');
    await js('["GardenGames", "GardenHome", "GardenPaper", "GardenCal"].forEach((n) => { if (window[n] && window[n].isOpen && window[n].isOpen()) window[n].close(); }); return 1;'); await sleep(500);
  }
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("B::Có câu ví dụ, không audio"); d.refresh(); result = 1'); await sleep(1500);
  await js('document.getElementById("kb-review").click(); return 1;'); await sleep(2500);
  w = JSON.parse(await js(WIDE));
  const rb = await js('const b = document.getElementById("kb-show").getBoundingClientRect(); return [Math.round(b.right), Math.round(b.bottom), innerHeight];');
  ok(!(await js('return document.getElementById("kb-panel").hidden;')) && rb[0] <= w.iw + 1 && w.sw <= w.iw + 1, 'bảng ôn: nút Lật thẻ trong bề ngang (' + rb.join(', ') + ')');
  ok(page.errors.length === 0, 'không lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log(`KẾT QUẢ: ${pass}/${total}` + (pass === total ? ' — TẤT CẢ OK' : ' — CÓ LỖI'));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e && e.stack || e); process.exit(1); });
