// Chụp tài sản cho bản phác thảo giao diện 1.23 (Anki demo đang chạy, đã KB_ONLY=setup): ảnh "bây giờ", hình 1× của
// phòng / sân / bãi biển (lấy thẳng từ canvas của add-on), popup món đồ, thẻ Kho đồ. Ra /tmp/kb_mock/.
const fs = require('fs');
const { pages, Page, sleep } = require('/home/user/kotoba-anki/tests/anki/cdp');
const OUT = '/tmp/kb_mock'; fs.mkdirSync(OUT, { recursive: true });
const W = 1850, H = 1130;
async function py(code) { const r = await fetch('http://127.0.0.1:9444', { method: 'POST', body: code }); const j = await r.json(); if (j.err) throw new Error(j.err); return j.r; }
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
let page;
const js = (e) => page.eval('(() => { ' + e + ' })()');
async function clip(name, r) {
  const res = await page.send('Page.captureScreenshot', { format: 'png', clip: { x: r.x, y: r.y, width: r.w, height: r.h, scale: 1 } });
  fs.writeFileSync(OUT + '/' + name + '.png', Buffer.from(res.data, 'base64'));
}
async function save1x(name, sel, S) {   // canvas → hình 1× (phóng nguyên lần nên lấy mẫu điểm gần nhất là đúng từng điểm ảnh)
  const d = await js(`const cv = document.querySelector(${JSON.stringify(sel)}); const S = ${S} || Math.round(cv.width / 160);
    const c = document.createElement("canvas"); c.width = Math.round(cv.width / S); c.height = Math.round(cv.height / S);
    const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(cv, 0, 0, cv.width, cv.height, 0, 0, c.width, c.height);
    return [c.toDataURL("image/png"), S, cv.width, cv.height];`);
  fs.writeFileSync(OUT + '/' + name + '.png', Buffer.from(d[0].split(',')[1], 'base64'));
  console.log(name, 'S=' + d[1], d[2] + '×' + d[3]);
  return d[1];
}
(async () => {
  for (const info of (await pages(9333)).filter((i) => !['top toolbar', 'bottom toolbar', 'main webview'].includes(i.title))) {
    const p = await Page.open(info.webSocketDebuggerUrl);
    if (await p.eval('typeof GardenHome !== "undefined"').catch(() => false)) { page = p; break; }
    p.close();
  }
  await py(KB + `kb._dialog.resize(${W}, ${H})\nd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("Tiếng Nhật"); d.refresh()\nresult = 1`);
  await sleep(2500);
  const calm = 'const t = document.getElementById("kb-toast"); if (t) t.hidden = true; if (!document.getElementById("kb-nosay")) { const s = document.createElement("style"); s.id = "kb-nosay"; s.textContent = "#kb-say{display:none!important}"; document.head.appendChild(s); } GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); return 1;';
  await js(calm); await sleep(1500);
  console.log('cửa sổ', await js('return [innerWidth, innerHeight];'));
  // bây giờ: màn chính (sân) + bảng Nhà ở Trong nhà
  await js('try { localStorage.setItem("kb-main-scene", "yard"); } catch (e) {} GardenHome.open("yard"); GardenHome.close(); return 1;'); await sleep(1200); await js(calm);
  await page.shot(OUT + '/now_main.png');
  const yr = await js('const r = document.getElementById("kb-yard").getBoundingClientRect(); return [r.x, r.y, r.width, r.height];');
  fs.writeFileSync(OUT + '/yard_rect.json', JSON.stringify(yr));
  console.log('dải cảnh', yr);
  const Sy = Math.round(yr[3] / 76);
  await save1x('yard_1x', '#kb-yard', Sy);
  for (const sc of ['beach', 'shrine']) {
    await js(`try { localStorage.setItem("kb-main-scene", "${sc}"); } catch (e) {} GardenHome.open("${sc}"); GardenHome.close(); return 1;`); await sleep(1500); await js(calm); await sleep(500);
    await save1x(sc + '_1x', '#kb-yard', Sy);
  }
  await js('try { localStorage.setItem("kb-main-scene", "yard"); } catch (e) {} GardenHome.open("yard"); GardenHome.close(); return 1;'); await sleep(800);
  await js('GardenHome.open("room"); document.querySelector("#kb-home button[data-tab=room]").click(); return 1;'); await sleep(1500); await js(calm);
  await page.shot(OUT + '/now_nha_room.png');
  const S = await save1x('room_1x', '#kb-home-canvas', 0);
  const cr = await js('const r = document.getElementById("kb-home-canvas").getBoundingClientRect(); return [r.x, r.y, r.width, r.height];');
  fs.writeFileSync(OUT + '/room_rect.json', JSON.stringify(cr));
  // popup món đồ: bấm bàn kotatsu (ô x 4–5, hàng sàn 2: điểm ảnh 80, 64)
  for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x: cr[0] + 80 * S, y: cr[1] + 64 * S, button: 'left', clickCount: 1 });
  await sleep(700);
  const pr = await js('const p = document.getElementById("kb-h-pop"); if (!p || p.hidden) return null; const r = p.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];');
  console.log('popup', pr);
  if (pr) await clip('pop', { x: pr[0] - 2, y: pr[1] - 2, w: pr[2] + 8, h: pr[3] + 8 });
  await page.shot(OUT + '/now_nha_room_pop.png');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  // thẻ Kho đồ (3 thẻ đầu)
  await js('document.querySelector("#kb-home button[data-tab=inv]").click(); return 1;'); await sleep(1200);
  const kr = await js(`const cs = Array.prototype.slice.call(document.querySelectorAll("#kb-h-list .kb-h-card")).slice(0, 3);
    return cs.map((c) => { const r = c.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; });`);
  for (let i = 0; i < kr.length; i++) await clip('kho_' + i, { x: kr[i][0], y: kr[i][1], w: kr[i][2] + 4, h: kr[i][3] + 4 });
  const head = await js('const r = document.querySelector("#kb-home .kb-game-top").getBoundingClientRect(); return [r.x, r.y, r.width, r.height];');
  fs.writeFileSync(OUT + '/head_rect.json', JSON.stringify(head));
  console.log('kho', kr.length, 'đầu bảng', head);
  await js('GardenHome.close(); return 1;');
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
