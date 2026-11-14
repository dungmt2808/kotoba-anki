// 1.15 trong Anki thật: màn chính gọn (một thẻ "Hôm nay"), số cây khát trên nút Tưới ngay, thú không đè nhà,
// Xưởng có kẻ thẳng / chữ nhật / làm lại / cỡ bút, bảng Trò chơi cuộn được, đỡ tốn CPU khi đứng yên.
// Chạy: node e2e_115.js SHOTS
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2];
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenUI !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
const W = (expr) => '(() => { ' + expr + ' })()';

(async () => {
  // nhà cũ 22 ngày, 5 thú (1 con đói, 1 con đi chơi), 5 thẻ tới hạn → đủ mọi dòng trong thẻ Hôm nay
  await py(KB + `st = kb.STATE
t = mw.col.sched.today
d = st.load(); d["coins"] = 40000; d["home"]["house"] = 6; st.save(d)
for p in ["neko", "niwatori", "usagi", "shiba", "ahiru"]:
    st.pet_buy(p)
d = st.load(); d["more"]["repair"]["day"] = t - 22; d["more"]["repair"]["seen"] = t
d["more"]["pets"]["neko"]["fed"] = t - 1; d["more"]["pets"]["shiba"]["fed"] = t - 3; st.save(d)
did = mw.col.decks.id_for_name("A::Có câu ví dụ + audio")
mw.col.sched.set_due_date(list(mw.col.find_cards(f"did:{did}"))[:5], "0")
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  const page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(2500);
  await page.eval(W('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; if (typeof GardenPaper !== "undefined") GardenPaper.close(); return 1;'));
  await sleep(500);

  console.log('== màn chính gọn');
  const card = await page.eval(W(`const t = document.getElementById("kb-today");
    const rows = Array.from(t.querySelectorAll(".kb-today-list .kb-quest-btn")).filter(b => !b.hidden).map(b => b.id);
    const side = document.querySelector(".kb-yard-side");
    return { rows: rows, kids: Array.from(side.children).filter(e => !e.hidden).length, weatherIn: t.contains(document.getElementById("kb-weather")) };`));
  ok(card.kids === 1, 'góc sân chỉ còn một khung (thẻ Hôm nay)');
  ok(['kb-quest', 'kb-paper-btn', 'kb-care-btn', 'kb-fields-btn'].every(id => card.rows.indexOf(id) >= 0), 'thẻ Hôm nay có đủ: nhiệm vụ, báo, thú / nhà, cấu hình trường (' + card.rows.join(', ') + ')');
  ok(card.weatherIn, 'thời tiết nằm trong thẻ Hôm nay');
  ok(await page.eval(W('const c = document.getElementById("kb-weather"); return c.textContent.length <= 8 && /·/.test(c.title);')), 'thời tiết chỉ còn biểu tượng, chữ đầy đủ ở tooltip');
  ok(await page.eval(W('return /2 bé cần ăn/.test(document.getElementById("kb-care-btn").textContent) && /Sửa nhà/.test(document.getElementById("kb-care-btn").textContent);')), 'dòng thú / nhà: “2 bé cần ăn · Sửa nhà”');
  ok(await page.eval(W('return document.getElementById("kb-thirsty").offsetParent === null;')), 'bỏ ô “cây khát” rời trên thanh trên');
  ok(await page.eval(W('const n = document.getElementById("kb-review-n"); return !n.hidden && n.textContent === "5" && /5 cây đang khát/.test(document.getElementById("kb-review").title);')), 'nút “Tưới ngay” có số 5 (cây khát)');
  // 1.31: nhãn là nút bấm (chỉ nút này mở bảng Nhà; bấm cảnh không mở) — vẫn chỉ hiện khi rê chuột lên cảnh
  ok(await page.eval(W('const h = document.querySelector(".kb-yard-hint"); const cs = getComputedStyle(h); return h.tagName === "BUTTON" && cs.opacity === "0" && cs.pointerEvents !== "none";')), 'nút “Nhà & Cửa hàng” chỉ hiện khi rê chuột, là nút bấm (1.31)');
  await page.eval(W('document.getElementById("kb-quest").click(); return 1;')); await sleep(400);
  ok(await page.eval(W('const p = document.getElementById("kb-quest-pop").getBoundingClientRect(), c = document.getElementById("kb-today").getBoundingClientRect(); return !document.getElementById("kb-quest-pop").hidden && p.top >= c.bottom - 1;')), 'bảng nhiệm vụ mở dưới thẻ Hôm nay (không che các dòng)');
  await page.eval(W('document.getElementById("kb-quest-x").click(); return 1;'));
  await page.shot(SHOTS + '/30_man_chinh_gon.png');

  console.log('== thú không đè nhà');
  const box = await page.eval(W(`const d = JSON.parse(JSON.stringify(Garden._data())); let t = Date.now(), lo = 1e9;
    for (const st of [{ tod: "day" }, { tod: "day", rain: 1 }]) for (let i = 0; i < 6000; i++) { t += 200;
      GardenPets.place(d, "yard", t, st).forEach(e => { lo = Math.min(lo, e.a.x - 8); }); }
    return lo;`));
  ok(box >= 64, 'mô phỏng 12.000 bước: mép trái thú luôn ≥ cột 4 của sân (x ≥ 64, đo được ' + box.toFixed(1) + ')');

  console.log('== Xưởng: kẻ thẳng, chữ nhật, làm lại, cỡ bút');
  await page.eval(W('document.getElementById("kb-house").click(); GardenHome.setTab("zone"); return 1;')); await sleep(600);
  await page.eval(W('Array.from(document.querySelectorAll("#kb-h-list button")).find(x => /Mở xưởng vùng/.test(x.textContent)).click(); return 1;')); await sleep(900);
  const cr = await page.eval(W(`const cv = document.getElementById("kb-cf-grid"), r = cv.getBoundingClientRect(), cell = GardenCraft._state().cell;
    const ev = (type, x, y, extra) => cv.dispatchEvent(new PointerEvent(type, Object.assign({ clientX: r.left + (x + 0.5) * cell, clientY: r.top + (y + 0.5) * cell, bubbles: true, button: 0, pointerId: 1 }, extra || {})));
    const tool = (t) => document.querySelector('#kb-craft [data-tool="' + t + '"]').click();
    const col = (c) => document.querySelector('#kb-cf-pal [data-c="' + c + '"]').click();
    const count = (c) => GardenCraft._state().px.split("").filter(x => x === c).length;
    col("b"); tool("rect"); ev("pointerdown", 10, 40); ev("pointermove", 19, 49, { shiftKey: true }); ev("pointerup", 19, 49);
    const filled = count("b");
    col("r"); tool("rect"); ev("pointerdown", 30, 40); ev("pointermove", 39, 49); ev("pointerup", 39, 49);
    const frame = count("r");
    col("y"); tool("line"); ev("pointerdown", 0, 30); ev("pointermove", 20, 33, { shiftKey: true }); ev("pointerup", 20, 33);
    const lineY = count("y");
    document.querySelector('#kb-craft [data-brush="3"]').click(); col("g"); tool("pen"); ev("pointerdown", 50, 60); ev("pointerup", 50, 60);
    const dot3 = count("g");
    const before = GardenCraft._state().px;
    document.getElementById("kb-cf-undo").click(); const und = count("g");
    document.getElementById("kb-cf-redo").click(); const back = GardenCraft._state().px === before;
    return { filled, frame, lineY, dot3, und, back, brush: GardenCraft._state().brush };`));
  ok(cr.filled === 100, 'chữ nhật + Shift: tô kín 10×10 = 100 ô (' + cr.filled + ')');
  ok(cr.frame === 36, 'chữ nhật thường: chỉ viền 10×10 = 36 ô (' + cr.frame + ')');
  ok(cr.lineY === 21, 'kẻ thẳng + Shift: bám ngang, 21 ô (' + cr.lineY + ')');
  ok(cr.dot3 === 9 && cr.brush === 3, 'bút cỡ 3: một chấm = 9 ô (' + cr.dot3 + ')');
  ok(cr.und === 0 && cr.back, 'hoàn tác rồi làm lại (Ctrl+Y) về đúng hình');
  await page.shot(SHOTS + '/31_xuong_cong_cu.png');
  await page.eval(W('GardenCraft.close(); GardenHome.close(); return 1;')); await sleep(400);

  console.log('== cửa sổ nhỏ');
  await py(KB + 'kb._dialog.resize(1024, 700); result = 1'); await sleep(1200);
  await page.eval(W('document.getElementById("kb-games").click(); return 1;')); await sleep(900);
  ok(await page.eval(W('const cs = Array.from(document.querySelectorAll(".kb-gcard")); return cs.length > 0 && cs.every(c => c.scrollHeight <= c.clientHeight + 1);')), '1024×700: thẻ trò chơi không bị cắt chữ');
  await page.shot(SHOTS + '/32_tro_choi_1024.png');
  await page.eval(W('GardenGames.close(); return 1;')); await sleep(300);
  await page.eval(W('document.getElementById("kb-house").click(); GardenHome.setTab("pet"); return 1;')); await sleep(800);
  ok(await page.eval(W('return document.getElementById("kb-h-list").clientHeight >= 180;')), '1024×700: danh sách đồ trong Nhà cao ≥ 180px');
  await page.eval(W('GardenHome.close(); return 1;')); await sleep(300);
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1'); await sleep(800);

  console.log('== đỡ tốn CPU');
  await page.send('Performance.enable');
  const metric = async () => Object.fromEntries((await page.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
  await page.eval(W('GardenUI.saved({ main: { yard: "still", field: "still" }, review: {}, panel: {}, theme: "garden", card: "normal" }); return 1;'));
  await sleep(12000);      // chờ các nhấp nháy CSS chạy xong
  const a = await metric(); await sleep(5000); const b = await metric();
  const task = (b.TaskDuration - a.TaskDuration) / 5 * 1000, style = (b.RecalcStyleCount - a.RecalcStyleCount) / 5;
  ok(style < 5, 'sân + ruộng đứng yên: trang không tính lại style liên tục (' + style.toFixed(1) + ' lần/giây)');
  ok(task < 80, 'sân + ruộng đứng yên: dưới 80 ms việc / giây (' + task.toFixed(0) + ' ms)');
  await page.eval(W('GardenUI.refresh(); return 1;'));

  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.join(' | ').slice(0, 300) : ''));
  const errs = await py(KB + 'result = kb.ERRORS.entries()');
  ok(!errs || !errs.length, 'nhật ký lỗi add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 300) : ''));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length + ' đạt');
  page.close(); process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
