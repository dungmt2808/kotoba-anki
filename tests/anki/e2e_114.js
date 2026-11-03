// 1.14 trong Anki thật: giao diện tự chỉnh, sửa nhà, thú nuôi, giống cây, vùng tự tạo, hiệu ứng thành tích.
// Chạy: node e2e_114.js SHOTS
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
async function waitFor(p, expr, ms = 15000) { const t = Date.now(); while (Date.now() - t < ms) { try { if (await p.eval(expr)) return true; } catch (e) { } await sleep(250); } return false; }
const W = (expr) => '(() => { ' + expr + ' })()';

(async () => {
  // xu + nhà xây xong + nhà đã cũ 22 ngày + mở Bãi biển (dữ liệu dựng thẳng bằng Python)
  await py(KB + `st = kb.STATE
d = st.load(); d["coins"] = 30000; d["home"]["house"] = 7; d["home"]["zones"] = ["beach"]; st.save(d)
d = st.load(); d["more"]["repair"]["day"] = mw.col.sched.today - 22; d["more"]["repair"]["seen"] = mw.col.sched.today; st.save(d)
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  const page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(2000);
  await page.eval(W('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;'));
  const coins = async () => py(KB + 'result = kb.STATE.load()["coins"]');

  console.log('== sửa nhà');
  await page.eval(W('document.getElementById("kb-house").click(); GardenHome.setTab("build"); return 1;')); await sleep(800);
  const rp = await page.eval(W('const c = document.querySelector(".kb-h-repair"); return c ? c.textContent : "";'));
  ok(/Rêu bám · Sơn bong · Ngói lệch \(3\/4\)/.test(rp), 'thẻ Bảo dưỡng: 22 ngày → 3 nấc (rêu, sơn bong, ngói lệch)');
  await page.shot(SHOTS + '/20_sua_nha.png');
  const c0 = await coins();
  await page.eval(W('Array.from(document.querySelectorAll(".kb-h-repair button")).find(b => /Sửa hết/.test(b.textContent)).click(); return 1;'));
  await sleep(1200);
  ok(await coins() === c0 - 315, 'Sửa hết: −315 xu');
  ok(await page.eval(W('return Garden._data().wallet.more_view.wear.level;')) === 0, 'nhà như mới (nấc 0)');

  console.log('== thú nuôi');
  await page.eval(W('GardenHome.setTab("pet"); return 1;')); await sleep(500);
  await page.eval(W('Array.from(document.querySelectorAll(".kb-h-petcard button")).find(b => /Nhận nuôi/.test(b.textContent) && b.closest(".kb-h-petcard").textContent.indexOf("Mèo mướp") >= 0).click(); return 1;'));
  await sleep(1200);
  ok(await coins() === c0 - 315 - 900, 'nhận nuôi Mèo mướp: −900 xu');
  await py(KB + 'd = kb.STATE.load(); d["more"]["pets"]["neko"]["fed"] = mw.col.sched.today - 1; kb.STATE.save(d); kb._dialog.refresh(); result = 1');
  await sleep(1200);
  ok(await page.eval(W('const b = document.getElementById("kb-care-btn"); return !b.hidden && /Mèo mướp đói/.test(b.textContent);')), 'chip góc sân: “🐾 Mèo mướp đói”');
  await page.eval(W('GardenHome.setTab("pet"); return 1;')); await sleep(500);
  await page.eval(W('Array.from(document.querySelectorAll(".kb-h-petcard button")).find(b => /Cho ăn ·/.test(b.textContent)).click(); return 1;'));
  await sleep(1200);
  ok(await page.eval(W('return Garden._data().wallet.more_view.pets[0].state;')) === 'full', 'cho ăn → no bụng');
  await page.eval(W('const i = document.querySelector(".kb-h-petcard .kb-h-input"); i.value = "Mochi"; Array.from(i.parentNode.querySelectorAll("button")).find(b => /Đặt tên/.test(b.textContent)).click(); return 1;'));
  await sleep(1000);
  ok(await py(KB + 'result = kb.STATE.load()["more"]["pets"]["neko"]["name"]') === 'Mochi', 'đặt tên “Mochi”');
  await page.eval(W('const s = document.querySelector(".kb-h-petcard select"); s.value = "beach"; s.dispatchEvent(new Event("change")); return 1;'));
  await sleep(1000);
  ok(await py(KB + 'result = kb.STATE.load()["more"]["pets"]["neko"]["scene"]') === 'beach', 'chuyển mèo ra Bãi biển');
  await page.eval(W('GardenHome.setScene("beach"); return 1;')); await sleep(1500);
  ok(await page.eval(W('const v = GardenHome._mainView ? 1 : 0; return typeof GardenPets !== "undefined" && GardenPets.sprite("neko", "sit") !== null;')), 'pets.js có hình mèo');
  await page.shot(SHOTS + '/21_thu_nuoi.png');

  console.log('== giống cây');
  await page.eval(W('GardenHome.setTab("seed"); return 1;')); await sleep(500);
  await page.eval(W('Array.from(document.querySelectorAll(".kb-h-seed button")).find(b => b.closest(".kb-h-seed").textContent.indexOf("Anh đào") >= 0).click(); return 1;'));
  await sleep(1200);
  ok(await py(KB + 'result = kb.STATE.load()["more"]["seeds"]["owned"]').then(v => v.indexOf('sakura') >= 0), 'mua giống Anh đào');
  await page.eval(W('const s = document.querySelector(".kb-h-rules select"); s.value = "sakura"; s.dispatchEvent(new Event("change")); return 1;'));
  await sleep(2000);
  ok(await page.eval(W('const p = Garden._data().plants; return p.length > 0 && p.every(x => x.v === "sakura");')), 'gieo Anh đào cho deck đang xem → mọi cây là anh đào');
  await page.shot(SHOTS + '/22_giong_cay.png');

  console.log('== vùng tự tạo');
  await page.eval(W('GardenHome.setTab("zone"); GardenCraft.openZone(null); return 1;')); await sleep(600);
  ok(await page.eval(W('const s = GardenCraft._state(); return s.zone && s.gw === 64 && s.gh === 76;')), 'Xưởng mở chế độ vùng: lưới 64×76');
  await page.eval(W(`const c = document.createElement("canvas"); c.width = 64; c.height = 76; const x = c.getContext("2d");
    x.fillStyle = "#c21f3a"; x.fillRect(22, 20, 20, 50); x.fillStyle = "#ffd23f"; x.fillRect(24, 6, 16, 12);
    GardenCraft._load(c.toDataURL(), "thap"); const n = document.getElementById("kb-cf-name"); n.value = "Mũi hải đăng"; n.dispatchEvent(new Event("input"));
    const s = document.getElementById("kb-cf-bgsel"); s.value = "lake"; s.dispatchEvent(new Event("change")); return 1;`));
  await sleep(800);
  await page.shot(SHOTS + '/23_ve_vung.png');
  const c1 = await coins();
  await page.eval(W('document.getElementById("kb-cf-save").click(); return 1;')); await sleep(1800);
  const z = await py(KB + 'd = kb.STATE.load(); result = [d["more"]["zones"], d["home"].get("uzones")]');
  ok(z[0].length === 1 && z[0][0].name === 'Mũi hải đăng' && z[0][0].bg === 'lake' && z[0][0].lm.length > 10 && z[1][0] === 'u1', 'tạo vùng “Mũi hải đăng” (bờ hồ + công trình tự vẽ)');
  ok(await coins() === c1 - 5000, '  −5.000 xu');
  ok(await page.eval(W('return GardenHome._state().scene;')) === 'u1', '  vào luôn vùng mới');
  await py(KB + 'kb.STATE.buy("flowers"); result = 1');
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1000);
  await page.eval(W('GardenHome.setScene("u1"); GardenHome.startPlacing("flowers"); GardenHome._clickCell(8, 1); return 1;')); await sleep(1200);
  ok(await py(KB + 'result = kb.STATE.load()["home"]["u1"]').then(v => v.length === 1 && v[0].id === 'flowers'), 'đặt bụi hoa ở vùng tự tạo');
  await page.shot(SHOTS + '/24_vung_tu_tao.png');
  ok(await page.eval(W('return Array.from(document.querySelectorAll(".kb-h-scene")).some(b => b.textContent === "Mũi hải đăng");')), 'nút cảnh “Mũi hải đăng” ở thanh cảnh');
  await page.eval(W('GardenHome.close(); return 1;')); await sleep(400);
  ok(/Mũi hải đăng/.test(await page.eval(W('return document.getElementById("kb-yard-name").textContent;'))), 'màn chính đang hiện vùng tự tạo (nút ◂ ▸ có vùng mới)');

  console.log('== giao diện tự chỉnh');
  await page.eval(W('document.getElementById("kb-ui-open").click(); return 1;')); await sleep(500);
  ok(await page.eval(W('return !document.getElementById("kb-ui").hidden && document.querySelectorAll("#kb-ui-stage select").length === 21;')), 'bảng Giao diện: 7 dòng × 3 chế độ');
  await page.shot(SHOTS + '/25_giao_dien.png');
  await page.eval(W('document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape", bubbles: true, cancelable: true})); return 1;')); await sleep(800);
  ok(await page.eval(W('return document.getElementById("kb-ui").hidden;')) && await py(KB + 'result = kb._dialog is not None and kb._dialog.isVisible()'),
    'Esc đóng bảng Giao diện, cửa sổ vườn vẫn mở');
  await page.eval(W('document.getElementById("kb-ui-open").click(); return 1;')); await sleep(400);
  await page.eval(W('document.querySelectorAll(".kb-ui-preset")[1].click(); return 1;')); await sleep(1000);
  const uiCfg = await py(KB + 'result = kb.config()["ui"]');
  ok(uiCfg.review.yard === 'hide' && uiCfg.review.field === 'hide' && uiCfg.card === 'tall', 'chọn “Tập trung khi ôn” → lưu vào config');
  await page.eval(W('GardenUI.close(); document.getElementById("kb-review").click(); return 1;')); await sleep(2000);
  ok(await page.eval(W('return GardenUI.mode() === "review" && getComputedStyle(document.getElementById("kb-yard-wrap")).display === "none" && getComputedStyle(document.getElementById("kb-field")).display === "none";')),
    'khi ôn: sân + ruộng ẩn');
  ok(await page.eval(W('const r = document.getElementById("kb-show").getBoundingClientRect(); return r.bottom <= window.innerHeight + 1;')), 'nút Lật thẻ nằm trong cửa sổ (khung thẻ to)');
  await page.shot(SHOTS + '/26_on_tap_trung.png');
  await page.eval(W('document.getElementById("kb-rv-garden").click(); return 1;')); await sleep(800);
  ok(await page.eval(W('return getComputedStyle(document.getElementById("kb-field")).display !== "none";')), 'nút “Hiện vườn” trên bảng ôn: hiện lại sân + ruộng');
  await page.eval(W('pycmd("ui:preset:night"); return 1;')); await sleep(1000);
  ok(await page.eval(W('const d = document.getElementById("kb-card").contentDocument; return d.body.classList.contains("nightMode") && document.getElementById("kb-app").classList.contains("kb-ui-th-night");')),
    '“Ôn buổi tối”: bảng ôn tối, thẻ có lớp nightMode');
  await page.shot(SHOTS + '/27_on_toi.png');

  console.log('== hiệu ứng thành tích (ôn hết thẻ của deck A bằng Dễ)');
  await page.eval(W('pycmd("ui:preset:full"); return 1;')); await sleep(600);
  await page.eval(W('try { Object.keys(localStorage).filter(k => k.indexOf("kb-joy-") === 0).forEach(k => localStorage.removeItem(k)); } catch (e) {} return 1;'));
  for (let i = 0; i < 20; i++) {
    const st = await page.eval(W('return document.getElementById("kb-done").hidden ? (document.getElementById("kb-show").hidden ? "ans" : "q") : "done";'));
    if (st === 'done') break;
    if (st === 'q') { await page.eval(W('document.getElementById("kb-show").click(); return 1;')); await sleep(500); }
    await page.eval(W('const b = document.querySelector(".kb-rate-4"); if (!b.closest("[hidden]")) b.click(); return 1;')); await sleep(900);
  }
  ok(await page.eval(W('return !document.getElementById("kb-done").hidden;')), 'hết thẻ cần tưới');
  ok(await page.eval(W('const j = Garden._data().joy; return !!(j && j.done && j.left === 0);')), 'Python: joy.done (deck không còn thẻ hôm nay)');
  ok(await page.eval(W('return !document.getElementById("kb-joy-banner") || document.getElementById("kb-joy-banner").hidden;')), 'đang ôn: chưa hiện dải chúc mừng');
  await page.eval(W('document.getElementById("kb-close-done").click(); return 1;')); await sleep(900);
  ok(await page.eval(W('const b = document.getElementById("kb-joy-banner"); return !!b && !b.hidden && /Tưới xong/.test(b.textContent);')), 'đóng bảng ôn → dải “Tưới xong cả vườn hôm nay”');
  ok(await page.eval(W('return /Xong thẻ hôm nay/.test(document.getElementById("kb-joy").textContent);')), 'huy hiệu “🌈 Xong thẻ hôm nay”');
  await page.shot(SHOTS + '/28_thanh_tich.png');

  console.log('== cửa sổ nhỏ + lỗi');
  await py(KB + 'kb._dialog.resize(1024, 640); result = 1'); await sleep(1200);
  await page.eval(W('document.getElementById("kb-house").click(); GardenHome.setTab("pet"); return 1;')); await sleep(800);
  ok(await page.eval(W('return document.documentElement.scrollWidth <= window.innerWidth + 1;')), '1024×640: không tràn ngang (tab Thú nuôi)');
  await page.shot(SHOTS + '/29_1024_thu_nuoi.png');
  await page.eval(W('GardenHome.close(); return 1;'));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.join(' | ').slice(0, 300) : ''));
  const errs = await py(KB + 'result = kb.ERRORS.load() if hasattr(kb.ERRORS, "load") else []');
  ok(!errs || !errs.length, 'nhật ký lỗi add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 300) : ''));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length + ' đạt');
  page.close(); process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
