// 1.22.5 — chụp các màn đã sửa (chạy trên bản cũ và bản mới để so "trước / sau"):
//   a_thieu_xu_xuong      0 xu: thẻ "Tạo món đồ mới" ở tab Xưởng
//   b_doi_ma_sau_xem      xem trước mã món (200 xu) rồi dán đè mã vùng (5.000 xu), chưa bấm Xem trước lại
//   c_bam_dup_xay         sau khi bấm đúp "Xây" ở bước "Đổ móng" (80 xu): bảng Xây nhà + số xu / bước đã xây
//   d_nha_1093x560        bảng Nhà ở laptop 1366 × 768 đặt Windows 125% (trang ~1093 × 560)
//   e_nha_720x520         bảng Nhà ở cửa sổ nhỏ nhất Anki cho phép
//   f_trong_nha_1093x560  cảnh Trong nhà ở cửa sổ thấp
// In ra JSON số liệu (xu, bước nhà, …) cho từng ảnh để ghi chú. Chạy: KB_SCRIPTS=shots_1225.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1225';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenCraft !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\ncore = kb.core\n';
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const info = {};
const RESET = `d = st.load(); d["home"] = core._empty_home(); d["home"]["uzones"] = []; d["craft"] = core._clean_craft(None)
d["more"] = kb.more_core.empty_more(); d["more"]["myseeds"] = kb.share_core.empty_myseeds()
`;
async function size(w, h) { await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(1500); }
async function home(tab, scene) {
  await js(`if (window.GardenCraft && GardenCraft.isOpen()) GardenCraft.close(); if (!GardenHome.isOpen()) GardenHome.open(${JSON.stringify(scene || 'yard')}); else GardenHome.setScene(${JSON.stringify(scene || 'yard')});
    document.querySelector('#kb-home .kb-h-tab[data-tab="${tab}"]').click(); return 1;`);
  await sleep(900);
}
const shot = async (name) => { await sleep(500); await page.shot(SHOTS + '/' + name + '.png'); };
const fixSky = () => js('GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); return 1;');

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await size(1366, 768);
  await js('if (window.GardenPaper) GardenPaper.close(); if (window.GardenCal) GardenCal.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  await fixSky();

  // a. 0 xu: thẻ "Tạo món đồ mới"
  await py(KB + RESET + 'd["coins"] = 0; st.save(d); kb._dialog.refresh(); result = 1'); await sleep(1200);
  await home('craft');
  info.a = await js('const c = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new")).map((k) => { const b = k.querySelector("button"); return k.querySelector(".kb-h-name").textContent + ": «" + b.textContent + "»" + (b.disabled ? " (khoá)" : " (bấm được)"); }); return c;');
  await shot('a_thieu_xu_xuong');

  // b. xem trước mã món rồi dán đè mã vùng
  const codes = await py(KB + RESET + `d["coins"] = 100000; st.save(d)
spr = core.px_encode("." * 100 + "r" * 40 + "." * 76 + "k" * 40)
st.craft_save({"name": "Táo đỏ", "size": 16, "kind": "ground", "fx": "none", "px": spr})
lm = kb.more_core.px_encode("." * (64 * 60) + "B" * (64 * 16))
zone = kb.share_core.code_zone({"name": "Vùng của bạn", "bg": "flower", "ground": "#5ed35e", "hills": "#7ed98a", "lm": lm, "env": ""})
d = st.load(); d["coins"] = 100000; st.save(d); kb._dialog.refresh()
result = [st.share_code(list(d["craft"]["items"])[0])[0], zone]`);
  await sleep(1200);
  await home('craft');
  await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = ${JSON.stringify(codes[0])}; t.dispatchEvent(new Event("input"));
    Array.from(document.querySelectorAll("#kb-h-list .kb-h-paste button")).find((x) => x.textContent === "Xem trước").click(); return 1;`);
  await sleep(1500);
  await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.focus(); t.value = ${JSON.stringify(codes[1])}; t.dispatchEvent(new Event("input"));
    document.querySelector("#kb-h-list .kb-h-paste").scrollIntoView({ block: "start" }); return 1;`);
  await sleep(500);
  info.b = await js('const b = document.querySelector("#kb-h-list .kb-h-peek button"); return b ? "nút «" + b.textContent + "» vẫn bấm được" : "không còn nút làm (phải Xem trước lại)";');
  await shot('b_doi_ma_sau_xem');
  const c0 = await py(KB + 'result = st.load()["coins"]');
  await js('const b = document.querySelector("#kb-h-list .kb-h-peek button"); if (b && !b.disabled) b.click(); return 1;');
  await sleep(2000);
  if (await js('return !!GardenHome._state().placing;')) { await page.key('Escape', 'Escape', 27); }
  const c1 = await py(KB + 'result = st.load()["coins"]');
  info.b += ' · bấm nút đó: trừ ' + (c0 - c1) + ' xu, có ' + (await py(KB + 'result = len(st.load()["more"]["zones"])')) + ' vùng tự tạo';

  // c. bấm đúp "Xây"
  await py(KB + RESET + 'd["coins"] = 1000; st.save(d); kb._dialog.refresh(); result = 1'); await sleep(1200);
  await home('build');
  const p = await js('const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => x.textContent === "Xây"); b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];');
  const m = (type, cc) => page.send('Input.dispatchMouseEvent', { type, x: p[0], y: p[1], button: 'left', clickCount: cc });
  await m('mouseMoved', 1); await m('mousePressed', 1); await m('mouseReleased', 1); await sleep(60); await m('mousePressed', 2); await m('mouseReleased', 2);
  await sleep(2000);
  info.c = await py(KB + 'd = st.load(); result = "1.000 xu, bấm đúp «Xây» (Đổ móng 80 xu) → còn %d xu, nhà ở bước %d (%s)" % (d["coins"], d["home"]["house"], core.HOUSE_LEVELS[d["home"]["house"]][0])');
  await js('document.getElementById("kb-h-list").scrollTop = 0; return 1;');
  await shot('c_bam_dup_xay');
  await js('GardenHome.close(); return 1;');

  // d / e / f: cửa sổ thấp
  await py(KB + RESET + `d["coins"] = 50000; d["home"]["house"] = 7; d["home"]["zones"] = list(core.ZONE_IDS); st.save(d); kb._dialog.refresh(); result = 1`);
  await sleep(1200);
  for (const [w, h, name, scene] of [[1093, 560, 'd_nha_1093x560', 'yard'], [720, 520, 'e_nha_720x520', 'yard'], [1093, 560, 'f_trong_nha_1093x560', 'room']]) {
    await js('if (GardenHome.isOpen()) GardenHome.close(); window.scrollTo(0, 0); return 1;');
    await size(w, h);
    await fixSky();
    await home('yard', scene);
    await sleep(1200);
    info[name[0]] = await js(`const r = document.getElementById("kb-home").getBoundingClientRect(), l = document.getElementById("kb-h-list").getBoundingClientRect(),
      v = document.querySelector("#kb-home .kb-h-view").getBoundingClientRect(), c = document.getElementById("kb-home-canvas").getBoundingClientRect();
      const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => x.textContent === "Mua");
      return "cửa sổ " + innerWidth + "×" + innerHeight + ": đáy bảng Nhà " + Math.round(r.bottom) + " px, danh sách thấy " + Math.max(0, Math.round(Math.min(innerHeight, l.bottom) - Math.max(0, l.top))) + " px, nút Mua đầu tiên " +
        (b && b.getBoundingClientRect().bottom <= innerHeight ? "trong" : "ngoài") + " cửa sổ" + (c.top < v.top || c.bottom > v.bottom ? " · cảnh tràn khỏi khung xem " + Math.round(Math.max(v.top - c.top, c.bottom - v.bottom)) + " px" : "");`);
    await shot(name);
  }
  fs.writeFileSync(SHOTS + '/info.json', JSON.stringify(info, null, 1));
  console.log(JSON.stringify(info, null, 1));
  page.close(); process.exit(0);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
