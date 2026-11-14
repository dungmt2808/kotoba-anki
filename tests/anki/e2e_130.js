// 1.30 trong Anki thật — tường & sàn từng gian, mẫu tự vẽ ở Xưởng, sinh hoạt của StackChan, sổ Sinh hoạt.
//   Tường & sàn: tab Nội thất có hai nút (Đồ nội thất · Tường & sàn), 12 + 9 mẫu + "Theo kiểu nhà" + "Tự vẽ"; bấm Mua bằng
//   chuột thật → trừ đúng giá, dùng luôn cho gian đang xem, điểm ảnh tường / sàn đổi; bấm đúp chỉ mua một lần; Xem thử không
//   ghi ví, đổi gian thì thôi xem thử; đổi gian bằng nút cảnh → "Đang trang trí: Bếp", gian khác không đổi; Theo kiểu nhà;
//   Xưởng vẽ mẫu sàn 16×16 (−250 xu, dùng luôn), đổi tên miễn phí, vẽ lại −50 xu, Esc lần đầu chỉ nhắc, xoá hai lần bấm →
//   gian về kiểu nhà; nhà chưa mở rộng: lệnh trang trí Bếp bị từ chối; đóng / mở lại vườn vẫn còn; khoá "decor" trong
//   kotoba_batake_more.
//   Sinh hoạt: 23 giờ có giường → tự Ngủ ở Phòng ngủ (không ép); 7:30 có việc nấu / ăn; thấy ≥ 1,5 giây → Python ghi khoá
//   kotoba_batake_life + thông báo; đang ôn thẻ thì không ghi, không thông báo; lệnh giả (việc lạ, sai cảnh, thiếu đồ) bị
//   từ chối; chip → thẻ chữ Nhật + cách đọc + nghĩa, Esc chỉ đóng thẻ (cửa sổ vẫn mở); ở cảnh khác: chip "ở …", Đến xem,
//   Gọi về đây; bấm chuột thật trúng StackChan → thẻ (không mở bảng Nhà); Album → Sinh hoạt (3 nút, đủ ô, ô đã thấy có chữ
//   Nhật); thẻ cửa hàng ghi việc của StackChan; Lịch hoa có dòng Sinh hoạt; tắm biển / tắm suối (bồn đá + nhà tắm); tắt
//   thú nuôi ở ⚙ → không còn StackChan + chip; cảnh Đứng yên không đổi khung hình; 720 × 520; không lỗi JS / nhật ký lỗi.
// Chạy: KB_SCRIPTS=e2e_130.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_130';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLife !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
const errors = [];
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(100); }
  return false;
}
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
`;
async function reopen(before, w, h) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await py(KB + `kb._dialog.resize(${w || 1366}, ${h || 860}); result = 1`);
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data() && !!Garden._data().life', 8000);
  await js('GardenLife._force("", "yard"); return 1;');      // nghỉ ngoài sân: các phần không thử sinh hoạt không ghi sổ ngoài ý muốn
  await sleep(500);
}
const CLEAR_LIFE = 'mw.col.set_config("kotoba_batake_life", {})\n';
async function refresh(before) { await py(KB + (before || '') + '\nkb._dialog.refresh(); result = 1'); await sleep(500); }
const sky = (h, w) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "${w || 'sunny'}"); return 1;`);
const coins = () => py(KB + 'result = st.load()["coins"]');
const decor = () => py(KB + 'result = st.load()["more"]["decor"]');
const shot = (n) => page.shot(SHOTS + '/130_' + n + '.png');
// màu một điểm của cảnh trong bảng Nhà (toạ độ nghệ thuật của gian)
const panelPx = (ax, ay) => js(`const cv = document.getElementById("kb-home-canvas"), k = cv.width / cv.offsetWidth, S = cv.offsetWidth / (GardenHome._state().scene === "room" ? 160 : 144);
  const d = cv.getContext("2d").getImageData(Math.round((${ax} + 0.5) * S * k), Math.round((${ay} + 0.5) * S * k), 1, 1).data; return [d[0], d[1], d[2]].join(",");`);
const clickBtn = (sel) => page.click(sel);
const SETUP = `mw.col.set_config("kotoba_batake_life", {})
d = st.load(); d["coins"] = 20000; d["home"]["house"] = 0; d["home"]["zones"] = []; d["home"]["owned"] = {}; d["home"]["rooms"] = []
for sc in list(kb.core.ALL_SCENES) + ["kitchen", "bedroom"]:
    d["home"][sc] = []
d["more"]["decor"] = kb.core.decor.empty(); d["more"]["pets"] = {}
st.save(d)
px = {k: v for k, v in st.load_px().items() if not k.startswith("t")}; st.save_px(px)
for _ in range(7):
    st.build()
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
`;
const PUT = (list) => list.map(([sc, id, x, y]) => `st.buy("${id}"); st.place("${sc}", "${id}", ${x}, ${y})`).join('\n') + '\n';

(async () => {
  await py(KB + SETUP + 'result = 1');
  await reopen();
  await sky(10);

  console.log('== 1. Tường & sàn: cửa hàng');
  await js('GardenHome.open("room"); GardenHome.setTab("room"); return 1;'); await sleep(500);
  const chips = await js('return [...document.querySelectorAll("[data-roomview]")].map((b) => b.textContent + (b.classList.contains("is-on") ? "*" : ""));');
  ok(chips.join('|') === 'Đồ nội thất*|Tường & sàn', 'tab Nội thất có hai nút: ' + chips.join(' · '));
  await clickBtn('[data-roomview="decor"]'); await sleep(400);
  const cards = await js('return [...document.querySelectorAll("[data-decor]")].map((c) => c.getAttribute("data-decor"));');
  const walls = cards.filter((c) => /^wall:w_/.test(c)), floors = cards.filter((c) => /^floor:f_/.test(c));
  ok(walls.length === 12 && floors.length === 9, '12 giấy dán tường + 9 sàn (' + walls.length + ' + ' + floors.length + ')');
  ok(cards.includes('wall:') && cards.includes('floor:') && cards.includes('wall:new') && cards.includes('floor:new'), 'có "Theo kiểu nhà" và "Tự vẽ" cho cả tường lẫn sàn');
  const head = await js('return document.querySelector(".kb-decor-head .kb-h-name").textContent;');
  ok(head === 'Đang trang trí: Phòng chính', head);
  const sw = await js('const cv = document.querySelector(\'[data-decor="wall:w_gach"] canvas\'), d = cv.getContext("2d").getImageData(10, 10, 20, 20).data; let n = new Set(); for (let i = 0; i < d.length; i += 4) { n.add(d[i] + "," + d[i + 1] + "," + d[i + 2]); } return n.size;');
  ok(sw >= 3, 'ô mẫu Gạch nung có hình (' + sw + ' màu)');
  await shot('01_tuong_san');

  console.log('== 2. mua bằng chuột, dùng luôn, bấm đúp');
  const wall0 = await panelPx(20, 30), floor0 = await panelPx(20, 80), c0 = await coins();
  await clickBtn('[data-decor="wall:w_sakura"] .kb-h-buy');
  await waitFor('(() => { const u = Garden._data().wallet.more.decor.use.room; return u && u.wall === "w_sakura"; })()', 5000);
  const d1 = await decor(), c1 = await coins(), wall1 = await panelPx(20, 30);
  ok(c1 === c0 - 300 && d1.own.join() === 'w_sakura' && d1.use.room.wall === 'w_sakura', 'Mua Cánh anh đào: −300 xu, dùng luôn cho phòng chính');
  await sleep(300);
  ok(wall1 !== wall0 || (await panelPx(20, 30)) !== wall0, 'tường phòng chính đổi màu (' + wall0 + ' → ' + (await panelPx(20, 30)) + ')');
  ok((await panelPx(20, 80)) === floor0, 'sàn chưa đổi');
  const using = await js('const c = document.querySelector(\'[data-decor="wall:w_sakura"]\'); return [c.classList.contains("kb-h-using"), c.querySelector(".kb-h-buy").textContent, c.querySelector(".kb-h-buy").disabled, c.querySelector(".kb-h-own").textContent].join("|");');
  ok(using === 'true|Đang dùng|true|Đang dùng: Phòng chính', 'thẻ ghi "Đang dùng: Phòng chính"');
  // bấm đúp Mua mẫu sàn
  await js('const b = document.querySelector(\'[data-decor="floor:f_tatami"] .kb-h-buy\'); b.click(); b.click(); return 1;');
  await waitFor('(() => { const u = Garden._data().wallet.more.decor.use.room; return u && u.floor === "f_tatami"; })()', 5000);
  await sleep(500);
  ok((await coins()) === c1 - 300 && (await decor()).own.join() === 'w_sakura,f_tatami', 'bấm đúp Mua: chỉ trừ một lần 300 xu');
  ok((await panelPx(20, 80)) !== floor0, 'sàn phòng chính đổi');
  await shot('02_da_mua');

  console.log('== 3. xem thử, đổi gian, Theo kiểu nhà');
  const c2 = await coins(), wallS = await panelPx(20, 30);
  await js('[...document.querySelectorAll(\'[data-decor="wall:w_sao"] button\')].find((b) => b.textContent === "Xem thử").click(); return 1;'); await sleep(500);
  const wallTry = await panelPx(20, 30);
  ok(wallTry !== wallS && (await coins()) === c2 && (await decor()).use.room.wall === 'w_sakura', 'Xem thử Trời sao: cảnh đổi, ví và mẫu đang dùng không đổi');
  const stopTxt = await js('return [...document.querySelectorAll(\'[data-decor="wall:w_sao"] button\')].map((b) => b.textContent).join("|");');
  ok(/Dừng xem thử/.test(stopTxt), 'nút thành "Dừng xem thử"');
  await py(KB + 'st.open_rooms(); kb._dialog.refresh(); result = 1'); await sleep(600);
  const c2b = await coins();
  ok(c2b === c2 - 2000, 'mở rộng nhà (Bếp + Phòng ngủ): −2.000 xu');
  await clickBtn('.kb-h-scene[data-scene="kitchen"]'); await sleep(600);
  const headK = await js('return document.querySelector(".kb-decor-head .kb-h-name").textContent;');
  ok(headK === 'Đang trang trí: Bếp', 'đổi gian bằng nút cảnh → ' + headK);
  await clickBtn('.kb-h-scene[data-scene="room"]'); await sleep(600);
  ok((await panelPx(20, 30)) === wallS, 'đổi gian rồi quay lại: hết xem thử, tường như đã lưu');
  await clickBtn('.kb-h-scene[data-scene="kitchen"]'); await sleep(500);
  const kWall0 = await panelPx(20, 12);
  await clickBtn('[data-decor="wall:w_sakura"] .kb-h-buy'); await sleep(700);
  let dd = await decor();
  ok(dd.use.kitchen.wall === 'w_sakura' && dd.use.room.wall === 'w_sakura' && (await coins()) === c2b, 'mẫu đã mua dùng thêm cho Bếp: miễn phí');
  ok((await panelPx(20, 12)) !== kWall0, 'tường Bếp đổi');
  await clickBtn('[data-decor="wall:"] .kb-h-buy'); await sleep(700);
  dd = await decor();
  ok(!dd.use.kitchen.wall && dd.use.room.wall === 'w_sakura' && (await panelPx(20, 12)) === kWall0, 'Theo kiểu nhà: Bếp về như cũ, phòng chính giữ nguyên');

  console.log('== 4. Xưởng: mẫu sàn tự vẽ');
  const c3 = await coins();
  await clickBtn('[data-decor="floor:new"] .kb-h-buy'); await sleep(600);
  const cf = await js('const s = GardenCraft._state(); return [GardenCraft.isOpen(), s.tile, s.gw, s.gh, s.price, document.querySelector("#kb-craft .kb-g-title").textContent, document.getElementById("kb-cf-save").textContent, document.getElementById("kb-cf-size").parentNode.hidden].join("|");');
  ok(cf === 'true|floor|16|16|250|工房 · Sàn nhà|Tạo mẫu · 250 xu|true', 'Xưởng mở chế độ mẫu sàn 16×16: ' + cf);
  await clickBtn('#kb-cf-save'); await sleep(300);
  ok((await js('return document.getElementById("kb-cf-tip").textContent;')).indexOf('trống') >= 0 && (await coins()) === c3, 'hình trống: không lưu, không trừ xu');
  // vẽ bằng chuột thật: kéo một đường chéo trên lưới
  const g = await js('const r = document.getElementById("kb-cf-grid").getBoundingClientRect(); return [r.left, r.top, r.width / 16];');
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: g[0] + g[2] * 2.5, y: g[1] + g[2] * 2.5, button: 'left', clickCount: 1 });
  for (let i = 3; i <= 12; i++) { await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: g[0] + g[2] * (i + 0.5), y: g[1] + g[2] * (i + 0.5), button: 'left' }); }
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g[0] + g[2] * 12.5, y: g[1] + g[2] * 12.5, button: 'left', clickCount: 1 });
  await sleep(300);
  const drawnN = await js('return GardenCraft._state().px.replace(/\\./g, "").length;');
  ok(drawnN >= 8, 'kéo chuột vẽ được ' + drawnN + ' ô');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(await js('return GardenCraft.isOpen();'), 'Esc lần đầu chỉ nhắc (hình chưa lưu), Xưởng vẫn mở');
  await js('const n = document.getElementById("kb-cf-name"); n.value = "Sàn chéo"; n.dispatchEvent(new Event("input")); return 1;');
  await clickBtn('#kb-cf-save');
  await waitFor('!GardenCraft.isOpen()', 5000); await sleep(700);
  dd = await decor();
  const tid = Object.keys(dd.mine.items)[0];
  ok((await coins()) === c3 - 250 && tid === 't1' && dd.mine.items.t1.name === 'Sàn chéo' && dd.mine.items.t1.kind === 'floor', 'Tạo mẫu: −250 xu, mẫu t1 "Sàn chéo"');
  ok(dd.use.kitchen.floor === 't1', 'mẫu mới dùng luôn cho gian đang xem (Bếp)');
  const st4 = await js('return JSON.stringify([GardenHome._state().tab, !!document.querySelector(\'[data-decor="floor:t1"]\'), !!Garden._data().catalog.tiles[0].px]);');
  ok(st4 === '["room",true,true]', 'về tab Nội thất → Tường & sàn, có thẻ mẫu tự vẽ');
  await shot('03_mau_tu_ve');
  // đổi tên miễn phí
  await js('[...document.querySelectorAll(\'[data-decor="floor:t1"] button\')].find((b) => /^Sửa/.test(b.textContent)).click(); return 1;'); await sleep(500);
  ok((await js('return GardenCraft._state().price + "|" + GardenCraft._state().tileId + "|" + document.getElementById("kb-cf-save").textContent;')) === '0|t1|Lưu mẫu · miễn phí', 'mở sửa: chưa đổi hình thì miễn phí');
  await js('const n = document.getElementById("kb-cf-name"); n.value = "Sàn chéo 2"; return 1;');
  await clickBtn('#kb-cf-save'); await waitFor('!GardenCraft.isOpen()', 5000); await sleep(500);
  ok((await coins()) === c3 - 250 && (await decor()).mine.items.t1.name === 'Sàn chéo 2', 'đổi tên: miễn phí');
  await js('[...document.querySelectorAll(\'[data-decor="floor:t1"] button\')].find((b) => /^Sửa/.test(b.textContent)).click(); return 1;'); await sleep(500);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: g[0] + g[2] * 14.5, y: g[1] + g[2] * 1.5, button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: g[0] + g[2] * 14.5, y: g[1] + g[2] * 1.5, button: 'left', clickCount: 1 });
  await sleep(200);
  ok((await js('return document.getElementById("kb-cf-save").textContent;')) === 'Lưu mẫu · 50 xu', 'vẽ thêm một ô → 50 xu');
  await clickBtn('#kb-cf-save'); await waitFor('!GardenCraft.isOpen()', 5000); await sleep(500);
  ok((await coins()) === c3 - 300, 'vẽ lại: −50 xu');
  // xoá: hai lần bấm
  await js('[...document.querySelectorAll(\'[data-decor="floor:t1"] button\')].find((b) => /Xoá/.test(b.textContent)).click(); return 1;'); await sleep(300);
  ok((await js('return [...document.querySelectorAll(\'[data-decor="floor:t1"] button\')].find((b) => /xoá/i.test(b.textContent)).textContent;')) === 'Bấm lần nữa để xoá' && !!(await decor()).mine.items.t1, 'bấm Xoá lần đầu: hỏi lại');
  await js('[...document.querySelectorAll(\'[data-decor="floor:t1"] button\')].find((b) => /xoá/i.test(b.textContent)).click(); return 1;'); await sleep(700);
  dd = await decor();
  ok(!dd.mine.items.t1 && !dd.use.kitchen.floor && !(await py(KB + 'result = "t1" in st.load_px()')), 'bấm lần hai: xoá mẫu, Bếp về sàn của kiểu nhà');

  console.log('== 5. lệnh lạ, lưu lại');
  const before5 = JSON.stringify(await decor()), c5 = await coins();
  await js('["home:decor:buy:w_khongco", "home:decor:buy:bench", "home:decor:use:attic:wall:w_sakura", "home:decor:use:room:floor:w_sakura", "home:decor:use:room:wall:f_tatami", "home:decor:use:room:wall:t9", "home:decor:buy:w_sakura", "home:tile:del:t9", "craft:tile:{}", "craft:tile:[1]", "craft:tile:{\\"kind\\":\\"wall\\",\\"px\\":\\"zzz\\"}"].forEach((c) => pycmd(c)); return 1;');
  await sleep(900);
  ok(JSON.stringify(await decor()) === before5 && (await coins()) === c5, '11 lệnh sai (mẫu lạ, sai chỗ, chưa có, mua trùng, mẫu hỏng): ví và trang trí không đổi');
  ok(await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())'), 'cửa sổ vườn vẫn mở sau các lệnh sai');
  await js('GardenHome.close(); return 1;');
  await reopen();
  dd = await decor();
  ok(dd.use.room.wall === 'w_sakura' && dd.use.room.floor === 'f_tatami', 'đóng / mở lại vườn: tường + sàn phòng chính còn');
  const key = await py(KB + 'result = mw.col.get_config("kotoba_batake_more", {}).get("decor")');
  ok(key && key.own.join() === 'w_sakura,f_tatami' && key.use.room.wall === 'w_sakura', 'lưu ở khoá decor của kotoba_batake_more (đồng bộ AnkiWeb)');
  await sky(10); await js('GardenHome.showMain("house"); return 1;'); await sleep(1200);
  const stripWall = await js(`const cv = document.getElementById("kb-yard"), v = GardenHome._mainView(), k = cv.width / cv.offsetWidth;
    const d = cv.getContext("2d").getImageData(Math.round((v.ox + 148 + 20) * v.S * k), Math.round((v.oy + 30) * v.S * k), 1, 1).data; return [d[0], d[1], d[2]].join(",");`);
  ok(/^25[0-5],2[23]\d,2[34]\d$/.test(stripWall), 'dải "Trong nhà" ở màn chính cũng dán giấy anh đào (' + stripWall + ')');
  await shot('04_dai_trong_nha');

  console.log('== 6. sinh hoạt theo giờ (không ép)');
  await refresh(CLEAR_LIFE + PUT([['bedroom', 'beddo', 1, 2], ['kitchen', 'nagashi', 2, 1], ['kitchen', 'shokutaku', 3, 3], ['room', 'tea', 6, 1], ['room', 'desk', 2, 1], ['room', 'shelf', 0, 1]]));
  const life0 = await js('const l = Garden._data().life; return [l.total, Object.keys(l.defs).length, l.groups.length, l.seen, Object.keys(l.can).sort().join(",")].join("|");');
  ok(/^(\d+)\|\1\|8\|0\|bedroom,kitchen,room,yard$/.test(life0), 'data.life: ' + life0);
  // đặt / cất đồ qua lệnh thật: việc làm được đổi ngay, không chờ mở lại vườn
  await py(KB + 'st.buy("tv"); kb._dialog.refresh(); result = 1'); await sleep(900);
  const canTv0 = await js('return (Garden._data().life.can.room || []).indexOf("terebi") >= 0;');
  await js('pycmd("home:place:room:tv:7:1"); return 1;');
  ok(!canTv0 && await waitFor('(Garden._data().life.can.room || []).indexOf("terebi") >= 0', 5000), 'vừa đặt TV (home:place) → "Xem TV" vào danh sách việc làm được ngay, còn nguyên danh mục 67 việc: ' + (await js('return Object.keys(Garden._data().life.defs).length;')));
  const tvIdx = await py(KB + 'result = [i for i, e in enumerate(st.load()["home"]["room"]) if e["id"] == "tv"][0]');
  await js('pycmd("home:take:room:' + tvIdx + '"); return 1;');
  ok(await waitFor('(Garden._data().life.can.room || []).indexOf("terebi") < 0', 5000), 'cất TV (home:take) → "Xem TV" rời danh sách ngay');
  await sky(23); await js('GardenLife._force(null); return 1;'); await sleep(300);
  const night = await js('const c = GardenLife._candidates(); return c.map((x) => x.id + "@" + x.scene).join(",") + " → " + GardenLife._current().id;');
  ok(night === 'neru@bedroom → neru', '23 giờ, có giường: chỉ Ngủ ở Phòng ngủ (' + night + ')');
  await js('GardenHome.showMain("house"); return 1;');
  await waitFor('(() => { const a = GardenLife._actor(); return a && a.act === "neru" && a.phase === "do"; })()', 40000);
  const a23 = await js('return JSON.stringify(GardenLife._actor());');
  ok(/"loc":"bedroom"/.test(a23) && /"mode":"bed"/.test(a23) && /"phase":"do"/.test(a23), 'StackChan nằm trên giường: ' + a23.slice(0, 120));
  await shot('05_ngu');
  await waitFor('(() => { const l = Garden._data().life; return l && l.seen >= 1; })()', 6000);
  await sky(7.5); await sleep(300);
  const morning = await js('return GardenLife._candidates().map((x) => x.id).join(",");');
  ok(/ryouri/.test(morning) && /taberu/.test(morning) && /ocha/.test(morning) && !/neru/.test(morning), '7:30: nấu ăn, ăn cơm, pha trà (' + morning + ')');
  const chip = await js('GardenLife.sync(); const c = document.getElementById("kb-life-chip"); return [c.hidden, c.querySelector(".kb-life-chip-t").textContent].join("|");');
  ok(/^false\|.+/.test(chip), 'chip trên dải cảnh: ' + chip);
  const nightSeen = await py(KB + 'result = sorted(mw.col.get_config("kotoba_batake_life", {}).get("seen", {}))');
  ok(nightSeen.join() === 'neru', 'việc tự làm (Ngủ) cũng vào sổ khi đã thấy: ' + nightSeen.join());
  await js('GardenLife._force("", "yard"); return 1;');
  await refresh(CLEAR_LIFE);
  await waitFor('document.getElementById("kb-toast").hidden', 9000);       // thông báo "Sinh hoạt mới: Ngủ" tự tắt

  console.log('== 7. thấy ≥ 1,5 giây → ghi sổ');
  await js('GardenLife._force("ocha", "room"); return 1;'); await sleep(400);
  await js('GardenLife._snap(); return 1;');
  const got = await waitFor('(() => { const l = Garden._data().life; return l && l.seen === 1; })()', 6000);
  const lifeKey = await py(KB + 'result = mw.col.get_config("kotoba_batake_life", None)');
  ok(got && lifeKey && lifeKey.seen && lifeKey.seen.ocha && lifeKey.seen.ocha.s === 'room' && lifeKey.seen.ocha.n === 1, 'Python ghi kotoba_batake_life.seen.ocha (' + JSON.stringify(lifeKey && lifeKey.seen) + ')');
  const toast = await js('const t = document.getElementById("kb-toast"); return t.hidden ? "" : t.textContent;');
  ok(/Sinh hoạt mới: Pha trà/.test(toast) && /お茶を入れる/.test(toast), 'thông báo: ' + toast);
  await shot('06_pha_tra');
  await js('const t = document.getElementById("kb-toast"); if (!t.hidden) { t.hidden = true; } return 1;');
  // lệnh giả
  await js('["life:seen:khongco:room", "life:seen:neru:yard", "life:seen:neru:room", "life:seen:oyogu:beach", "life:seen:rajio:room", "life:seen:ocha:../x", "life:seen:ocha", "life:met:ocha:room"].forEach((c) => pycmd(c)); return 1;');
  await sleep(900);
  const seenKeys = await py(KB + 'result = sorted(mw.col.get_config("kotoba_batake_life", {}).get("seen", {}))');
  ok(seenKeys.join() === 'ocha', 'lệnh giả (việc lạ, sai cảnh, giường không ở gian đó, vùng chưa mở, chưa có radio): không ghi (' + seenKeys.join() + ')');
  // đang ôn thẻ: không ghi, không thông báo
  await js('GardenLife._force("hon", "room"); return 1;'); await sleep(200);
  await js('document.getElementById("kb-review").click(); return 1;');
  await waitFor('!document.getElementById("kb-panel").hidden', 6000);
  await js('GardenLife._snap(); return 1;'); await sleep(3200);
  const rvSeen = await py(KB + 'result = sorted(mw.col.get_config("kotoba_batake_life", {}).get("seen", {}))');
  const rvToast = await js('const t = document.getElementById("kb-toast"); return t.hidden ? "" : t.textContent;');
  ok(rvSeen.join() === 'ocha' && !/Sinh hoạt/.test(rvToast), 'đang ôn thẻ 3 giây: không ghi sổ, không thông báo che nút chấm điểm');
  await js('document.getElementById("kb-stop").click(); return 1;').catch(() => 0);
  await waitFor('document.getElementById("kb-panel").hidden', 5000);
  await js('window.scrollTo(0, 0); return 1;');
  const got2 = await waitFor('(() => { const l = Garden._data().life; return l && l.seen === 2; })()', 6000);
  ok(got2, 'đóng bảng ôn, về màn chính: việc Đọc sách được ghi');
  await js('const t = document.getElementById("kb-toast"); if (!t.hidden) { t.hidden = true; } return 1;');

  console.log('== 8. chip, thẻ, Esc, Đến xem, Gọi về đây, bấm trúng');
  await js('GardenLife._force("ocha", "room"); return 1;'); await sleep(300); await js('GardenLife._snap(); return 1;'); await sleep(400);
  await clickBtn('#kb-life-chip'); await sleep(400);
  const card = await js('const c = document.getElementById("kb-life-card"); return c && !c.hidden ? [c.querySelector(".kb-find-ja").textContent, c.querySelector(".kb-find-kana").textContent, c.querySelector(".kb-find-line").textContent].join("|") : "";');
  ok(card === 'お茶を入れる|おちゃをいれる · pha trà|StackChan đang trong nhà (Phòng chính): Pha trà', 'thẻ: ' + card);
  const inWin = await js('const r = document.getElementById("kb-life-card").getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;');
  ok(inWin, 'thẻ nằm trong cửa sổ');
  await shot('07_the');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  ok((await js('return document.getElementById("kb-life-card").hidden;')) && (await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())')), 'Esc chỉ đóng thẻ, cửa sổ vườn vẫn mở');
  await js('GardenHome.showMain("yard"); return 1;'); await sleep(1300);
  const away = await js('GardenLife.sync(); const c = document.getElementById("kb-life-chip"); return c.querySelector(".kb-life-chip-t").textContent + "|" + c.classList.contains("is-away");');
  ok(away === 'ở trong nhà|true', 'sang Sân vườn: chip "' + away + '"');
  await clickBtn('#kb-life-chip'); await sleep(400);
  const btns = await js('return [...document.querySelectorAll("#kb-life-card button")].map((b) => b.textContent).join("|");');
  ok(/Đến xem/.test(btns) && /Gọi về đây/.test(btns) && /Sổ sinh hoạt/.test(btns), 'thẻ khi ở cảnh khác: ' + btns);
  await js('[...document.querySelectorAll("#kb-life-card button")].find((b) => /Đến xem/.test(b.textContent)).click(); return 1;'); await sleep(1300);
  ok((await js('return GardenHome.mainScene();')) === 'house', 'Đến xem → dải cảnh sang Trong nhà');
  await js('GardenLife._force(null); GardenHome.showMain("yard"); return 1;'); await sleep(1300);
  await sky(12);
  await js('GardenLife.call("yard"); return 1;'); await sleep(600);
  const called = await js('const c = GardenLife._current(); return c.scene + "|" + (GardenLife._invite() || {}).scene;');
  ok(called === 'yard|yard', 'Gọi về đây: StackChan ra Sân vườn (' + called + ')');
  await js('GardenLife._snap(); return 1;'); await sleep(700);
  const hit = await js(`const b = GardenLife._box(), v = GardenHome._mainView(), cv = document.getElementById("kb-yard"), r = cv.getBoundingClientRect();
    return b ? [r.left + (b.x + b.w / 2 + v.ox) * v.S, r.top + (b.y + b.h / 2 + (v.oy || 0)) * v.S] : null;`);
  if (hit) { for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x: hit[0], y: hit[1], button: 'left', clickCount: 1 }); } }
  await sleep(500);
  const poke = await js('const c = document.getElementById("kb-life-card"); return [!!hit0(), c && !c.hidden, GardenHome.isOpen()].join("|"); function hit0() { return GardenLife._box(); }');
  ok(poke === 'true|true|false', 'bấm chuột thật trúng StackChan: mở thẻ, không mở bảng Nhà (' + poke + ')');
  await js('GardenLife.closeCard(); GardenLife._force("", "yard"); return 1;');

  console.log('== 9. Album → Sinh hoạt, thẻ cửa hàng, Lịch hoa');
  await js('GardenHome.openLife(); return 1;'); await sleep(700);
  const alb = await js('return [...document.querySelectorAll(".kb-album-chip")].map((b) => b.textContent.replace(/ · .*/, "") + (b.classList.contains("is-on") ? "*" : "")).join("|");');
  ok(alb === 'Khách ghé vườn|Hộp sưu tầm|Sinh hoạt*', 'Album có 3 nút: ' + alb);
  const cells = await js('const l = Garden._data().life; const c = [...document.querySelectorAll("[data-life]")]; const o = document.querySelector(\'[data-life="ocha"]\'); return [c.length === l.total, document.querySelectorAll("[data-life-group]").length, o.classList.contains("is-found"), o.querySelector(".kb-box-ja").textContent, document.querySelector(\'[data-life="neru"] .kb-life-hint\').textContent].join("|");');
  ok(/^true\|8\|true\|お茶を入れる\|22:30–5:30 · cần Giường/.test(cells), 'sổ: đủ ô, 8 nhóm, ô đã thấy có chữ Nhật, ô chưa thấy có gợi ý (' + cells + ')');
  const noOverflow = await js('const L = document.getElementById("kb-h-list"); return L.scrollWidth <= L.clientWidth + 1 && [...document.querySelectorAll(".kb-life-cell")].every((c) => c.scrollWidth <= c.clientWidth + 1);');
  ok(noOverflow, 'sổ không tràn ngang');
  await shot('08_so_sinh_hoat');
  await js('GardenHome.setTab("room"); document.querySelector(\'[data-roomview="items"]\').click(); return 1;'); await sleep(500);
  const hint = await js('const cards = [...document.querySelectorAll("#kb-h-list .kb-h-card")]; const c = cards.find((x) => (x.querySelector(".kb-h-name") || {}).textContent === "Bàn học"); const l = c && c.querySelector(".kb-h-life"); return l ? l.textContent + "|" + l.title : "";');
  ok(/Học bài/.test(hint) && /Viết nhật ký/.test(hint), 'thẻ Bàn học ghi việc của StackChan: ' + hint);
  await js('GardenHome.close(); return 1;');
  const today = await py(KB + 'result = kb.cal_today().isoformat()');
  const calLife = await py(KB + `v = kb.cal_day("${today}"); result = v.get("life")`);
  ok(Array.isArray(calLife) && /お茶を入れる \(Pha trà\)/.test(calLife.join()) && /本を読む \(Đọc sách\)/.test(calLife.join()), 'Lịch hoa hôm nay: Sinh hoạt ' + JSON.stringify(calLife));

  console.log('== 10. vùng: tắm biển, tắm suối');
  await refresh('d = st.load(); d["coins"] = 100000; st.save(d)\nfor z in kb.core.ZONE_IDS:\n    st.unlock_zone(z)\n');
  const zcan = await js('const c = Garden._data().life.can; return ["beach", "shrine", "festival", "bamboo", "onsen", "station"].map((z) => (c[z] || []).length).join(",");');
  ok(zcan.split(',').every((n) => Number(n) >= 2), 'vừa mở vùng là có việc (số việc từng vùng: ' + zcan + ')');
  await js('GardenHome.showMain("beach"); GardenLife._force("oyogu", "beach"); return 1;'); await sleep(900);
  await js('GardenLife._snap(); return 1;'); await sleep(1200);
  ok((await js('return (GardenLife._actor() || {}).mode;')) === 'sea', 'Bãi biển: bơi ngoài biển');
  await shot('09_tam_bien');
  await sky(20);
  await js('GardenHome.showMain("onsen"); GardenLife._force("onsen", "onsen"); return 1;'); await sleep(900);
  await js('GardenLife._snap(); return 1;'); await sleep(900);
  ok((await js('return (GardenLife._actor() || {}).mode;')) === 'house', 'Suối nước nóng chưa có bồn đá: tắm trong nhà tắm');
  await refresh(PUT([['onsen', 'rotenburo', 7, 1]]));
  await js('GardenLife._force("yuki", "onsen"); return 1;'); await sleep(300); await js('GardenLife._force("onsen", "onsen"); return 1;'); await sleep(500);
  await js('GardenLife._snap(); return 1;'); await sleep(1200);
  ok((await js('const a = GardenLife._actor() || {}; return a.mode + "|" + a.item;')) === 'tub|rotenburo', 'đặt Bồn tắm đá: ngâm ngoài trời');
  await shot('10_tam_suoi');
  const zoneSeen = await waitFor('(() => { const l = Garden._data().life; const g = l.groups.find((x) => x.id === "onsen"); return g && g.seen >= 1; })()', 6000);
  ok(zoneSeen, 'việc ở vùng cũng vào sổ');

  console.log('== 11. tắt, Đứng yên, cửa sổ nhỏ');
  await js('GardenLife._force("ocha", "room"); GardenHome.showMain("house"); return 1;'); await sleep(1200);
  await refresh('kb.save_config(ui={"greet":"off","trans":"off","main":{"pets":"off"}})');
  await sleep(1300);
  const offS = await js('GardenLife.sync(); return [document.getElementById("kb-life-chip").hidden, GardenLife.place("room", Date.now(), GardenSky.state(), {}).length].join("|");');
  ok(offS === 'true|0', 'tắt Thú nuôi ở ⚙: chip ẩn, StackChan không vẽ (' + offS + ')');
  await refresh('kb.save_config(ui={"greet":"off","trans":"off","main":{"yard":"still"}})');
  await sleep(1200);
  const still = await js('const cv = document.getElementById("kb-yard"); const a = cv.toDataURL(); return new Promise((ok) => setTimeout(() => ok(a === cv.toDataURL()), 900));');
  ok(still, 'cảnh Đứng yên: khung hình không đổi');
  await refresh('kb.save_config(ui={"greet":"off","trans":"off"})');
  await py(KB + 'kb._dialog.resize(720, 520); result = 1'); await sleep(900);
  await js('GardenLife._force("ocha", "room"); return 1;'); await sleep(400);
  const narrow = await js(`GardenLife.sync(); const c = document.getElementById("kb-life-chip").getBoundingClientRect(), w = document.getElementById("kb-yard-wrap").getBoundingClientRect();
    return [c.right <= w.right + 1, document.documentElement.scrollWidth <= innerWidth + 1].join("|");`);
  ok(narrow === 'true|true', '720 × 520: chip trong dải cảnh, trang không tràn ngang');
  await clickBtn('#kb-life-chip'); await sleep(400);
  ok(await js('const r = document.getElementById("kb-life-card").getBoundingClientRect(); return r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;'), '720 × 520: thẻ trong cửa sổ');
  await shot('11_hep');
  await js('GardenLife.closeCard(); GardenLife._force(null); return 1;');
  // chip không che StackChan, không cắt chữ ở các cỡ cửa sổ hay gặp (1.30: ở 1366 px chip từng đè lên góc Bếp, che StackChan đang ăn cơm)
  const chipAt = () => js(`GardenLife.sync(); const chip = document.getElementById("kb-life-chip"), cv = document.getElementById("kb-yard").getBoundingClientRect(), v = GardenHome._mainView(),
      r = chip.getBoundingClientRect(), lab = chip.querySelector(".kb-life-chip-t"), b = GardenLife._box(), HX = { kitchen: 0, room: 148, bedroom: 312 };
    const ax = cv.left + (v.ox + (HX[b.scene] !== undefined && v.house ? HX[b.scene] : 0) + b.x) * v.S, ay = cv.top + ((v.oy || 0) + b.y) * v.S;
    const hit = !(r.right <= ax || r.left >= ax + b.w * v.S || r.bottom <= ay || r.top >= ay + b.h * v.S);
    const wr = document.getElementById("kb-yard-wrap").getBoundingClientRect();
    return { up: chip.classList.contains("is-up"), mini: chip.classList.contains("is-mini"), over: Math.round(r.right - (cv.left + v.ox * v.S)), hit: hit,
      cut: lab.scrollWidth > lab.clientWidth + 1, inside: r.left >= wr.left - 1 && r.top >= wr.top - 1 && r.right <= wr.right + 1 && r.bottom <= wr.bottom + 1 };`);
  const sizes = [[1024, 700], [1280, 720], [1366, 768], [1920, 1080]], chipBad = [];
  for (const [w, h] of sizes) {
    await py(KB + 'kb._dialog.showNormal(); kb._dialog.resize(' + w + ', ' + h + '); result = 1'); await sleep(900);
    for (const [view, act, scene] of [['house', 'taberu', 'kitchen'], ['house', 'mado', 'room'], ['onsen', 'gyunyu', 'onsen'], ['beach', 'suna', 'beach']]) {
      await js('GardenHome.showMain("' + view + '"); GardenLife._force("' + act + '", "' + scene + '"); return 1;'); await sleep(600);
      await js('GardenLife._snap(); return 1;'); await sleep(700);
      const c = await chipAt();
      if (c.hit || c.cut || !c.inside || (view === 'house' && c.over > 24)) { chipBad.push(w + ' ' + act + ' ' + JSON.stringify(c)); }
      if (w === 1366 && act === 'taberu') { ok(c.up && !c.mini && !c.hit, '1366 × 768, Trong nhà: chip nằm trên hàng nút, còn tên việc, không che StackChan đang ăn cơm: ' + JSON.stringify(c)); await shot('12_chip_1366'); }
    }
  }
  ok(!chipBad.length, 'chip ở ' + sizes.map((x) => x[0]).join(' / ') + ' px × 4 việc: không che StackChan, không cắt chữ, không lấn vào nhà quá 24 px, nằm trong dải cảnh' + (chipBad.length ? ' — ' + chipBad.slice(0, 3).join(' · ') : ''));
  await js('GardenLife._force(null); GardenHome.showMain("yard"); return 1;');
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(500);

  console.log('== 12. lỗi');
  (page.errors || []).forEach((e) => errors.push(e));
  ok(errors.length === 0, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const log = await py(KB + 'result = [(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-8:]');
  ok(!log.length, 'nhật ký lỗi add-on trống' + (log.length ? ': ' + JSON.stringify(log) : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total);
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); try { page && page.close(); } catch (x) { } process.exit(2); });
