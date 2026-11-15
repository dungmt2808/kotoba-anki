// 1.22 trong Anki thật: chuyển ảnh thành pixel giữ đúng màu (hồng / đỏ không ra nâu), giống cây tự vẽ (Xưởng 5 giai đoạn,
// gieo cho deck, cây trên ruộng đổi hình), mã chia sẻ thiết kế (xuất + chép vào bộ nhớ tạm, dán → xem trước → làm, mã sai),
// chụp ảnh vườn (cỡ thường / lớn / hình nền, cảnh trong nhà), không đè / tràn ở 1366 và 1024 px, không lỗi JS.
// Chạy: node e2e_122.js SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots';
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
// ảnh vườn tự lưu: mỗi Anki (cổng điều khiển) một file — chạy song song nhiều bản Anki không ghi đè nhau (1.22.7)
const PHOTO = '/tmp/kb_photo_122_' + CTRL + '.png';
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
async function waitFor(p, expr, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await p.eval(expr); if (v) return v; } catch (e) { } await sleep(300); }
  return false;
}
const KB = 'import sys, os, time, datetime, json\nkb = sys.modules["kotoba_batake"]\n';
const W = (expr) => '(() => { ' + expr + ' })()';
let page;
const hideToast = () => page.eval(W('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;'));
const state = () => page.eval('GardenCraft._state()');
const coins = () => py(KB + 'result = kb.STATE.load()["coins"]');
const clickText = (sel, re) => page.eval(W(`const b = Array.from(document.querySelectorAll(${JSON.stringify(sel)})).find((x) => ${re}.test(x.textContent));
  if (!b) return false; b.scrollIntoView({ block: "center" }); b.click(); return true;`));
// ô (x, y) của lưới Xưởng → toạ độ màn hình
const cellPt = (x, y) => page.eval(W(`const cv = document.getElementById("kb-cf-grid"), r = cv.getBoundingClientRect(), c = GardenCraft._state().cell;
  return [r.left + (${x} + 0.5) * c, r.top + (${y} + 0.5) * c];`));
async function mouse(type, x, y, button = 'left') { await page.send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1 }); }
async function stroke(cells) {
  const [x0, y0] = await cellPt(cells[0][0], cells[0][1]);
  await mouse('mousePressed', x0, y0);
  for (const [cx, cy] of cells.slice(1)) { const [x, y] = await cellPt(cx, cy); await mouse('mouseMoved', x, y); }
  await mouse('mouseReleased', x0, y0);
}
// khung có đè lên nhau / tràn ra ngoài cửa sổ không
const rectOf = (sel) => page.eval(W(`const e = document.querySelector(${JSON.stringify(sel)}); if (!e || !e.getClientRects().length) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height };`));
const overlap = (a, b) => !!(a && b && a.l < b.r - 1 && b.l < a.r - 1 && a.t < b.b - 1 && b.t < a.b - 1);
const pngSize = (path) => py(KB + `import struct
with open(${JSON.stringify(path)}, "rb") as f: head = f.read(24)
result = list(struct.unpack(">II", head[16:24])) if head[:8] == b"\\x89PNG\\r\\n\\x1a\\n" else None`);

(async () => {
  await py(KB + `st = kb.STATE
d = st.load(); d["coins"] = 40000; d["home"]["house"] = 7; st.save(d)
spr = "." * 200 + "r" * 8 + "." * 8 + "k" * 40
st.craft_save({"name": "Táo đỏ", "size": 16, "kind": "ground", "fx": "sway", "px": kb.core.px_encode(spr)})
st.zone_save({"name": "Đồi hồng", "bg": "flower", "ground": "#5ed35e", "hills": "#ff7fa0",
              "px": kb.core.px_encode("." * (64 * 70) + "p" * (64 * 6)), "env": ""})
d = st.load(); d["coins"] = 40000; st.save(d)
os.environ["KB_TEST_PHOTO"] = "${PHOTO}"
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1'); await sleep(2500);
  await page.eval(W('GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); if (window.GardenPaper) GardenPaper.close(); return 1;'));
  await hideToast();

  console.log('== chuyển ảnh thành pixel: hồng / đỏ giữ màu (không ra nâu)');
  await page.eval(W('GardenHome.open("yard"); return 1;')); await sleep(600);
  await page.eval(W('GardenCraft.open(null); return 1;')); await sleep(400);
  await page.eval(W('document.getElementById("kb-cf-size").value = "32"; document.getElementById("kb-cf-size").dispatchEvent(new Event("change")); return 1;'));
  // ảnh kiểu ảnh chụp: hoa hồng có bóng tối ở mép, gấu bông hồng phai, đỏ sẫm — trước 1.22 các chỗ này ra nâu / be
  const conv = await page.eval(W(`return new Promise((done) => {
    const c = document.createElement("canvas"); c.width = 360; c.height = 360; const x = c.getContext("2d");
    x.fillStyle = "#f4f2ee"; x.fillRect(0, 0, 360, 360);
    const g = x.createRadialGradient(150, 150, 10, 180, 180, 160); g.addColorStop(0, "#fbe3ea"); g.addColorStop(0.45, "#f08aa6"); g.addColorStop(0.8, "#c0607a"); g.addColorStop(1, "#a8485f");
    x.fillStyle = g; x.beginPath(); x.arc(180, 180, 150, 0, 7); x.fill();
    x.fillStyle = "#c08088"; x.fillRect(60, 250, 90, 60); x.fillStyle = "#8a2a2a"; x.fillRect(210, 250, 90, 60);
    const im = new Image(); im.onload = () => {
      const before = GardenCraft._state().px;
      GardenCraft._load(c.toDataURL("image/jpeg", 0.85), "hoa");
      const t = Date.now(); const wait = () => { const s = GardenCraft._state(); if (s.px !== before || Date.now() - t > 4000) { done(s.px); } else { setTimeout(wait, 50); } }; wait();
    }; im.src = c.toDataURL();
  });`));
  const cnt = {}; for (const ch of conv) { cnt[ch] = (cnt[ch] || 0) + 1; }
  const brown = ['b', 'B', 't', 'E', 'h', 'e', 'i', 'o'].reduce((n, ch) => n + (cnt[ch] || 0), 0);
  const pink = ['P', 'p', 'r', 'R'].reduce((n, ch) => n + (cnt[ch] || 0), 0);
  ok(pink > 300 && brown === 0, 'hoa hồng có bóng + hồng phai + đỏ sẫm → toàn ô hồng / đỏ (' + pink + '), không ô nâu / be (' + brown + ')');
  await page.shot(SHOTS + '/_15_chuyen_anh_hong.png');
  // ảnh pixel art vẽ đúng 32 màu của bảng Xưởng → chuyển lại không đổi màu nào (tắt Xoá nền / Viền đen / Gọn màu)
  const round = await page.eval(W(`return new Promise((done) => {
    ["kb-cf-bg", "kb-cf-ol", "kb-cf-few"].forEach((id) => { document.getElementById(id).checked = false; });
    document.getElementById("kb-cf-size").value = "16"; document.getElementById("kb-cf-size").dispatchEvent(new Event("change"));
    const pal = Garden._data().catalog.craft.palette, keys = Object.keys(pal);
    const c = document.createElement("canvas"); c.width = 192; c.height = 96; const x = c.getContext("2d");
    keys.forEach((k, i) => { x.fillStyle = pal[k]; x.fillRect((i % 8) * 24, Math.floor(i / 8) * 24, 24, 24); });
    const before = GardenCraft._state().px;
    GardenCraft._load(c.toDataURL("image/png"), "bang mau");
    const t = Date.now(); const wait = () => { const s = GardenCraft._state(); if (s.px !== before || Date.now() - t > 4000) {
      const bad = []; keys.forEach((k, i) => { const cx = (i % 8) * 2, cy = 8 + Math.floor(i / 8) * 2; [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([a, b]) => { const got = s.px[(cy + b) * 16 + cx + a]; if (got !== k && bad.indexOf(k) < 0) bad.push(k + "→" + got); }); });
      ["kb-cf-bg", "kb-cf-ol", "kb-cf-few"].forEach((id) => { document.getElementById(id).checked = true; });
      done(bad); } else { setTimeout(wait, 50); } }; wait();
  });`));
  ok(round.length === 0, 'ảnh pixel art dùng đủ 32 màu của bảng Xưởng → chuyển lại giữ nguyên từng màu ' + round.join(' '));
  await page.key('Escape', 'Escape', 27); await sleep(150); await page.key('Escape', 'Escape', 27); await sleep(300);

  console.log('== giống cây tự vẽ: Xưởng 5 giai đoạn');
  await page.eval(W('GardenHome.open("yard"); return 1;')); await sleep(400);
  await page.click('#kb-home .kb-h-tab[data-tab="seed"]'); await sleep(400);
  ok(await page.eval(W('return /Giống tự vẽ · 0\\/12/.test(document.getElementById("kb-h-list").textContent);')), 'tab Giống cây có mục "Giống tự vẽ · 0/12"');
  ok(await clickText('#kb-h-list .kb-h-craft-new button', '/Mở xưởng/'), 'bấm "Mở xưởng" ở thẻ "Tự vẽ giống cây"');
  await sleep(500);
  let s = await state();
  ok(s.seed && s.layer === 's1' && s.gw === 16 && s.gh === 16, 'Xưởng mở chế độ giống cây, bắt đầu ở giai đoạn Mầm (16×16)');
  ok(await page.eval(W(`const q = (id) => document.getElementById(id);
    return q("kb-cf-seed").hidden === false && q("kb-cf-size").parentNode.hidden && q("kb-cf-kind").parentNode.hidden && q("kb-cf-fx").parentNode.hidden &&
      document.querySelector("#kb-craft .kb-g-title").textContent === "工房 · Giống cây tự vẽ";`)), 'thanh trên: 5 nút giai đoạn, ẩn Cỡ / Loại / Hiệu ứng, tiêu đề "Giống cây tự vẽ"');
  ok(/Tạo giống · 500 xu/.test(await page.eval('document.getElementById("kb-cf-save").textContent')), 'nút lưu "Tạo giống · 500 xu"');
  // Mầm: thân + 2 lá
  await stroke([[7, 15], [7, 14], [7, 13], [7, 12]]);
  await page.eval(W('GardenCraft._state(); return 1;'));
  const pickColor = (ch) => page.eval(W(`const b = document.querySelector('#kb-cf-pal [data-c="${ch}"]'); if (b) b.click(); return !!b;`));
  await pickColor('g'); await stroke([[6, 11], [5, 11]]); await stroke([[8, 11], [9, 11]]);
  s = await state();
  ok(s.st[1] && !s.st[0] && !s.st[2], 'vẽ được giai đoạn Mầm');
  await page.key('3', 'Digit3', 51); await sleep(200);
  s = await state();
  ok(s.layer === 's2', 'phím 3 → giai đoạn Cây non');
  ok(await page.eval(W('return !document.getElementById("kb-cf-seedcopy").disabled;')), 'có giai đoạn trước → nút "Chép giai đoạn trước" bấm được');
  await page.shot(SHOTS + '/_15_giong_cay_mo_mau.png');
  await page.click('#kb-cf-seedcopy'); await sleep(150);
  s = await state();
  ok(s.st[2] === s.st[1], 'chép hình Mầm sang Cây non');
  await pickColor('G'); await stroke([[4, 9], [3, 8], [3, 7]]); await stroke([[10, 9], [11, 8], [11, 7]]);
  // thử lưu khi mới có 2 giai đoạn
  await page.click('#kb-cf-save'); await sleep(300);
  ok(/Vẽ ít nhất 3 giai đoạn/.test(await page.eval('document.getElementById("kb-cf-tip").textContent')), 'mới vẽ 2 giai đoạn → nhắc "Vẽ ít nhất 3 giai đoạn"');
  await page.key('5', 'Digit5', 53); await sleep(150);
  await page.click('#kb-cf-seedcopy'); await sleep(150);
  await pickColor('r'); await stroke([[5, 6], [6, 5]]); await stroke([[9, 6], [10, 5]]);
  await page.eval(W('const n = document.getElementById("kb-cf-name"); n.value = "Cà chua bi"; return 1;'));
  s = await state();
  ok(s.st.filter(Boolean).length === 3 && s.st[4] && !s.st[3] && !s.st[0], 'đã vẽ Mầm, Cây non, Ra quả (Hạt, Ra hoa để tự suy ra)');
  ok(/Đã vẽ 3\/5/.test(await page.eval('document.getElementById("kb-cf-prevnote").textContent')), 'xem trước ghi "Đã vẽ 3/5"');
  const drawn = await page.eval(W('return Array.from(document.querySelectorAll("#kb-cf-seed [data-layer]")).map((b) => b.classList.contains("is-drawn"));'));
  ok(JSON.stringify(drawn) === JSON.stringify([false, true, true, false, true]), 'nút giai đoạn đã vẽ có chấm xanh');
  await page.shot(SHOTS + '/_15_xuong_giong_cay_1366.png');
  // thanh trên của Xưởng không tràn ở 1366
  ok(await page.eval(W('const t = document.querySelector("#kb-craft .kb-craft-top"); return t.scrollWidth <= t.clientWidth + 1;')), 'thanh trên Xưởng (giống cây) không tràn ngang ở 1366 px');
  const c0 = await coins();
  await page.click('#kb-cf-save');
  ok(await waitFor(page, W('return !GardenCraft.isOpen();'), 8000), 'lưu giống → Xưởng đóng');
  await sleep(1200);
  const c1 = await coins();
  ok(c0 - c1 === 500, 'trừ 500 xu (' + c0 + ' → ' + c1 + ')');
  const my = await py(KB + 'd = kb.STATE.load(); result = [d["more"]["myseeds"], kb.STATE.load_px().get("g1", "")]');
  ok(my[0].items.g1 && my[0].items.g1.name === 'Cà chua bi' && my[1].split('|').length === 5 && my[1].split('|')[0] === '' && my[1].split('|')[3] === '',
    'Python lưu tên ở khoá "myseeds", điểm ảnh 5 giai đoạn ở PX_KEY ("g1")');
  ok(await page.eval(W('return GardenHome.isOpen() && document.querySelector("#kb-home .kb-h-tab.is-on").getAttribute("data-tab") === "seed" && /Cà chua bi/.test(document.getElementById("kb-h-list").textContent);')),
    'về tab Giống cây, có thẻ "Cà chua bi"');
  ok(await page.eval(W(`const g = GardenSeeds; return g.custom("g1") && g.rows("g1", 0) === null && g.rows("g1", 3).join("") === g.rows("g1", 2).join("") && g.rows("g1", 4).length === 16 && g.pal(true, "g1").k === "#3a2f2a";`)),
    'seeds.js: Hạt chưa vẽ → hạt cây gốc, Ra hoa lấy hình Cây non, cây héo có bảng màu khô');

  console.log('== gieo giống tự vẽ cho deck → cây trên ruộng đổi hình');
  const sel = await page.eval(W(`const s = document.querySelector("#kb-h-list .kb-h-rules select"); if (!s) return null; return Array.from(s.options).map((o) => o.value + "=" + o.textContent);`));
  ok(sel && sel.some((x) => /^g1=Cà chua bi \(tự vẽ\)$/.test(x)), 'chọn được "Cà chua bi (tự vẽ)" ở luật gieo theo deck');
  await page.eval(W(`const s = document.querySelector("#kb-h-list .kb-h-rules select"); s.value = "g1"; s.dispatchEvent(new Event("change")); return 1;`));
  await sleep(2500);
  const rules = await py(KB + 'd = kb.STATE.load(); result = [d["more"]["seeds"]["deck"], d["more"]["myseeds"]["rules"]["deck"]]');
  ok(Object.keys(rules[0]).length === 0 && Object.values(rules[1]).indexOf('g1') >= 0, 'luật trỏ tới giống tự vẽ lưu ở myseeds (khoá "seeds" của bản cũ không bị đụng)');
  await page.eval(W('GardenHome.close(); return 1;')); await sleep(800);
  const gotV = await page.eval(W('return ((Garden._data() || {}).plants || []).filter((p) => p.v === "g1").length;'));
  const nPl = await page.eval(W('return (Garden._data() || {}).plants.length;'));
  ok(gotV > 0 && gotV === nPl, 'mọi cây của deck đang xem mang giống "g1" (' + gotV + '/' + nPl + ' cây)');
  await page.shot(SHOTS + '/_15_ruong_giong_tu_ve.png');

  console.log('== sửa giống: đổi tên miễn phí');
  await page.eval(W('GardenHome.open("yard"); return 1;')); await sleep(400);
  await page.click('#kb-home .kb-h-tab[data-tab="seed"]'); await sleep(300);
  ok(await clickText('#kb-h-list .kb-h-seed button', '/^Sửa · 50 xu$/'), 'bấm "Sửa · 50 xu"');
  await sleep(400);
  s = await state();
  ok(s.seed && s.seedId === 'g1' && s.layer === 's1', 'mở lại giống g1 ở giai đoạn đã vẽ đầu tiên');
  await page.eval(W('const n = document.getElementById("kb-cf-name"); n.value = "Cà chua"; GardenCraft._state(); return 1;'));
  await page.eval(W('document.getElementById("kb-cf-name").dispatchEvent(new Event("input")); return 1;'));
  await page.eval(W('GardenCraft._state(); return 1;'));
  ok(/Lưu giống · miễn phí/.test(await page.eval(W('GardenCraft._setLayer("s2"); return document.getElementById("kb-cf-save").textContent;'))), 'chưa đổi hình → "Lưu giống · miễn phí"');
  const c2 = await coins();
  await page.click('#kb-cf-save');
  await waitFor(page, W('return !GardenCraft.isOpen();'), 8000); await sleep(1200);
  ok(await coins() === c2 && (await py(KB + 'result = kb.STATE.load()["more"]["myseeds"]["items"]["g1"]["name"]')) === 'Cà chua', 'đổi tên không mất xu');

  console.log('== mã chia sẻ: xuất');
  await page.click('#kb-home .kb-h-tab[data-tab="craft"]'); await sleep(400);
  ok(await page.eval(W('return /Dán mã thiết kế/.test(document.getElementById("kb-h-list").textContent);')), 'tab Xưởng có ô "Dán mã thiết kế"');
  ok(await clickText('#kb-h-list .kb-h-card button', '/^Mã chia sẻ$/'), 'bấm "Mã chia sẻ" ở món "Táo đỏ"');
  ok(await waitFor(page, W('const t = document.querySelector("#kb-h-list .kb-h-share textarea[readonly]"); return t && /^KB1:m:16:/.test(t.value);'), 6000), 'hiện mã "KB1:m:16:…" ở đầu danh sách');
  await sleep(300);
  ok(await page.eval(W(`const c = document.querySelector("#kb-h-list .kb-h-share textarea[readonly]").closest(".kb-h-card").getBoundingClientRect(), l = document.getElementById("kb-h-list").getBoundingClientRect();
    return c.top >= l.top - 1 && c.bottom <= l.bottom + 1;`)), 'danh sách tự cuộn tới hộp mã (bấm ở món cuối danh sách vẫn thấy mã)');
  const itemCode = await page.eval(W('return document.querySelector("#kb-h-list .kb-h-share textarea[readonly]").value;'));
  ok(await py(KB + 'from aqt import qt\nresult = qt.QApplication.clipboard().text()') === itemCode, 'mã đã chép vào bộ nhớ tạm');
  ok(/Đã chép vào bộ nhớ tạm/.test(await page.eval('document.querySelector("#kb-h-list .kb-h-share").textContent')), 'ghi "Đã chép vào bộ nhớ tạm"');
  await page.shot(SHOTS + '/_15_ma_chia_se_1366.png');

  console.log('== mã chia sẻ: dán → xem trước → làm');
  const paste = async (code) => {
    await page.eval(W(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = ${JSON.stringify(code)}; t.dispatchEvent(new Event("input")); return 1;`));
    await clickText('#kb-h-list .kb-h-paste button', '/^Xem trước$/');
  };
  await paste('xin chào');
  ok(await waitFor(page, W('return /không phải mã thiết kế/.test(document.getElementById("kb-h-list").textContent);'), 5000), 'dán chữ thường → "Đây không phải mã thiết kế…"');
  await paste(itemCode.slice(0, -3) + (itemCode.endsWith('000') ? '111' : '000'));
  ok(await waitFor(page, W('return /mã kiểm tra không khớp/.test(document.getElementById("kb-h-list").textContent);'), 5000), 'sửa một chỗ → "mã kiểm tra không khớp"');
  await paste(itemCode.slice(0, 40) + '\n  ' + itemCode.slice(40));
  ok(await waitFor(page, W('return document.querySelector("#kb-h-list .kb-h-peek") && /Làm món này · 200 xu/.test(document.querySelector("#kb-h-list .kb-h-peek").textContent);'), 5000),
    'mã bị xuống dòng / dấu cách vẫn đọc được → xem trước "Táo đỏ", nút "Làm món này · 200 xu"');
  ok(await page.eval(W('return /Táo đỏ/.test(document.querySelector("#kb-h-list .kb-h-peek").textContent) && !!document.querySelector("#kb-h-list .kb-h-peek canvas");')), 'xem trước có hình + tên');
  await page.shot(SHOTS + '/_15_dan_ma_xem_truoc.png');
  const c3 = await coins();
  await clickText('#kb-h-list .kb-h-peek button', '/Làm món này/');
  await sleep(1500);
  const items = await py(KB + 'result = sorted(kb.STATE.load()["craft"]["items"].keys())');
  ok(c3 - await coins() === 200 && items.length === 2, 'làm món từ mã: trừ 200 xu, thêm mẫu thứ hai');
  await page.key('Escape', 'Escape', 27); await sleep(300);

  console.log('== mã chia sẻ: vùng + giống cây');
  await page.click('#kb-home .kb-h-tab[data-tab="zone"]'); await sleep(400);
  ok(await clickText('#kb-h-list .kb-h-zone button', '/^Mã chia sẻ$/'), 'vùng tự tạo có nút "Mã chia sẻ"');
  ok(await waitFor(page, W('const t = document.querySelector("#kb-h-list .kb-h-share textarea[readonly]"); return t && /^KB1:z:64x76:/.test(t.value);'), 6000), 'mã vùng "KB1:z:64x76:…" hiện ở tab Vùng mới');
  const zoneCode = await page.eval(W('return document.querySelector("#kb-h-list .kb-h-share textarea[readonly]").value;'));
  await page.click('#kb-home .kb-h-tab[data-tab="seed"]'); await sleep(300);
  ok(await clickText('#kb-h-list .kb-h-seed button', '/^Mã chia sẻ$/'), 'giống tự vẽ có nút "Mã chia sẻ"');
  ok(await waitFor(page, W('const t = document.querySelector("#kb-h-list .kb-h-share textarea[readonly]"); return t && /^KB1:g:16:/.test(t.value);'), 6000), 'mã giống "KB1:g:16:…"');
  const seedCode = await page.eval(W('return document.querySelector("#kb-h-list .kb-h-share textarea[readonly]").value;'));
  await page.click('#kb-home .kb-h-tab[data-tab="craft"]'); await sleep(300);
  await paste(zoneCode);
  ok(await waitFor(page, W('const p = document.querySelector("#kb-h-list .kb-h-peek"); return p && /Tạo vùng này · 5.000 xu/.test(p.textContent) && /Đồi hoa/.test(p.textContent);'), 5000),
    'xem trước vùng: nền Đồi hoa, "Tạo vùng này · 5.000 xu"');
  await page.shot(SHOTS + '/_15_dan_ma_vung.png');
  await paste(seedCode);
  ok(await waitFor(page, W('const p = document.querySelector("#kb-h-list .kb-h-peek"); return p && /Tạo giống này · 500 xu/.test(p.textContent) && /vẽ 3\\/5/.test(p.textContent);'), 5000),
    'xem trước giống: "vẽ 3/5 giai đoạn", "Tạo giống này · 500 xu"');
  const c4 = await coins();
  await clickText('#kb-h-list .kb-h-peek button', '/Tạo giống này/');
  await sleep(2500);
  const my2 = await py(KB + 'result = sorted(kb.STATE.load()["more"]["myseeds"]["items"].keys())');
  ok(c4 - await coins() === 500 && my2.join(',') === 'g1,g2', 'tạo giống từ mã: trừ 500 xu, có giống g2');
  ok(await page.eval(W('return document.querySelector("#kb-home .kb-h-tab.is-on").getAttribute("data-tab") === "seed";')), 'xong thì chuyển sang tab Giống cây');

  console.log('== chụp ảnh vườn');
  await page.eval(W('GardenHome.close(); return 1;')); await sleep(500); await hideToast();
  const snapBtn = await rectOf('#kb-yard-snap');
  ok(!!snapBtn, 'góc dưới trái sân có nút chụp ảnh');
  ok(!overlap(snapBtn, await rectOf('.kb-yard-side')) && !overlap(snapBtn, await rectOf('.kb-yard-hint')), 'nút chụp không đè thẻ Hôm nay / chữ "Nhà & Cửa hàng"');
  await page.click('#kb-yard-snap'); await sleep(300);
  const pop = await rectOf('#kb-snap-pop');
  ok(pop && pop.l >= 0 && pop.t >= 0 && pop.r <= 1366 && !(await page.eval('GardenHome.isOpen()')), 'bấm nút → bảng chọn cỡ ảnh (không mở Nhà, không tràn khỏi cửa sổ)');
  await page.shot(SHOTS + '/_15_chup_anh_bang.png');
  await py(KB + 'import os\nfor p in ["' + PHOTO + '"]:\n    os.path.exists(p) and os.remove(p)\nresult = 1');
  await clickText('#kb-snap-pop [data-snap]', '/Cỡ thường/');
  ok(await waitFor(page, W('const t = document.getElementById("kb-toast"); return t && !t.hidden && /Đã lưu ảnh vườn/.test(t.textContent);'), 8000), 'lưu xong có thông báo "Đã lưu ảnh vườn"');
  let sz = await pngSize(PHOTO);
  ok(sz && sz[0] === 534 && sz[1] === 200, 'cỡ thường: cảnh 512×152 + khung + dải chữ = 534×200 (' + sz + ')');
  fs.copyFileSync(PHOTO, SHOTS + '/_15_anh_vuon_thuong.png');
  ok(await page.eval('document.getElementById("kb-snap-pop").hidden'), 'chụp xong bảng chọn tự đóng');
  await page.click('#kb-yard-snap'); await sleep(200);
  await clickText('#kb-snap-pop [data-snap]', '/Hình nền/'); await sleep(2500);
  sz = await pngSize(PHOTO);
  ok(sz && sz[0] === 1920 && sz[1] === 1080, 'hình nền 1920×1080');
  fs.copyFileSync(PHOTO, SHOTS + '/_15_anh_vuon_hinh_nen.png');
  await page.click('#kb-yard-snap'); await sleep(200);
  await clickText('#kb-snap-pop [data-snap]', '/Cỡ lớn/'); await sleep(2500);
  sz = await pngSize(PHOTO);
  ok(sz && sz[0] === 1068 && sz[1] === 400, 'cỡ lớn ×2: 1068×400');
  fs.copyFileSync(PHOTO, SHOTS + '/_15_anh_vuon_lon.png');
  await page.click('#kb-yard-snap'); await sleep(200);
  await page.key('Escape', 'Escape', 27); await sleep(200);
  ok(await page.eval('document.getElementById("kb-snap-pop").hidden && !GardenHome.isOpen()'), 'Esc đóng bảng chọn (không đóng / mở bảng khác)');
  // trong Nhà: chụp cảnh đang xem (trong nhà)
  await page.eval(W('GardenHome.open("room"); return 1;')); await sleep(600);
  await page.click('#kb-h-snap'); await sleep(300);
  ok(/Trong nhà/.test(await page.eval('document.getElementById("kb-snap-scene").textContent')), 'nút "Chụp ảnh" trong Nhà chụp cảnh đang xem (Trong nhà)');
  await clickText('#kb-snap-pop [data-snap]', '/Cỡ thường/'); await sleep(2500);
  sz = await pngSize(PHOTO);
  ok(sz && sz[0] === 320 + 22 && sz[1] === 176 + 22 + 26, 'ảnh trong nhà 342×224 (' + sz + ')');
  fs.copyFileSync(PHOTO, SHOTS + '/_15_anh_trong_nha.png');
  const top1366 = await page.eval(W('const t = document.querySelector("#kb-home .kb-game-top"); return t ? [t.scrollWidth, t.clientWidth, t.getBoundingClientRect().height] : null;'));
  ok(top1366 && top1366[0] <= top1366[1] + 1, 'thanh trên của Nhà có thêm nút "Chụp ảnh" vẫn không tràn ở 1366 px');
  await page.eval(W('GardenHome.close(); return 1;'));

  console.log('== cửa sổ 1024 px');
  await py(KB + 'kb._dialog.resize(1024, 700); result = 1'); await sleep(1500); await hideToast();
  const sn2 = await rectOf('#kb-yard-snap'), side2 = await rectOf('.kb-yard-side');
  ok(sn2 && !overlap(sn2, side2), 'nút chụp không đè thẻ Hôm nay ở 1024 px');
  await page.eval(W('GardenHome.open("yard"); return 1;')); await sleep(500);
  const top1024 = await page.eval(W('const t = document.querySelector("#kb-home .kb-game-top"); const b = document.getElementById("kb-h-snap").getBoundingClientRect(), x = document.getElementById("kb-h-exit").getBoundingClientRect(); return t ? [t.scrollWidth, t.clientWidth, b.right <= x.left + 1 || b.top >= x.bottom - 1] : null;'));
  ok(top1024 && top1024[0] <= top1024[1] + 1 && top1024[2], 'thanh trên của Nhà không tràn, nút "Chụp ảnh" không đè "Thoát" ở 1024 px');
  await page.click('#kb-home .kb-h-tab[data-tab="craft"]'); await sleep(300);
  await page.shot(SHOTS + '/_15_xuong_tab_1024.png');
  await page.eval(W('GardenCraft.openSeed(null); return 1;')); await sleep(500);
  ok(await page.eval(W('const t = document.querySelector("#kb-craft .kb-craft-top"); return t.scrollWidth <= t.clientWidth + 1;')), 'thanh trên Xưởng (giống cây) không tràn ngang ở 1024 px');
  const segR = await rectOf('#kb-cf-seed'), saveR = await rectOf('#kb-cf-save'), cancelR = await rectOf('#kb-cf-cancel'), nameR = await rectOf('#kb-cf-name');
  ok(!overlap(segR, saveR) && !overlap(segR, cancelR) && !overlap(segR, nameR), 'nút giai đoạn không đè ô Tên / Huỷ / Tạo giống ở 1024 px');
  await page.shot(SHOTS + '/_15_xuong_giong_cay_1024.png');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  await page.eval(W('GardenHome.close(); return 1;'));

  const errs = page.errors.filter((e) => !/ResizeObserver/.test(e));
  ok(errs.length === 0, 'không có lỗi JavaScript' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  const pass = results.filter(Boolean).length;
  console.log('KẾT QUẢ: ' + pass + '/' + results.length);
  page.close();
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(2); });
