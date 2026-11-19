// 1.35.4 trong Anki thật — người dùng 19/11: "chuyển cảnh từ tưới sang vườn á (Esc) hay ngược lại thì nó bị giựt á. ngoài ra
// còn một số phần dropdown á. ví dụ dropdown "Mọi deck", "Chọn deck" và "Không chọn deck" trong báo … khi tớ chuyển qua
// "không chọn deck" thì cái dropdown đó vẫn giữ (và phần dropdown đó hình như chưa có gộp deck giống bên anki …)".
// Kịch bản (mọi kiểm tra đều đo trên trang vườn thật trong Anki, không sửa mã add-on):
//   A. Tưới ↔ vườn — ghi lại TỪNG KHUNG HÌNH (requestAnimationFrame) lúc mở / đóng bảng ôn:
//      1. chế độ giao diện đổi cùng khung hình với bảng (mã 1.35.3: tới 200 ms sau) — không khung nào "bảng ôn đã đóng mà vẫn
//         mang lớp Phóng to / Tập trung" (trang trống một nhịp) hay ngược lại;
//      2. cảnh sân + ruộng không đổi bề ngang khi thanh cuộn hiện / ẩn (1.35.3: hẹp lại 14 px, ruộng xếp lại cột);
//      3. ruộng đang ẩn khi ôn (Ẩn vườn) mà chấm thẻ → Esc về vẫn đủ cột ngay khung đầu (1.35.3: 4 cột một nhịp);
//      4. hiệu ứng: mở = bảng bật nhẹ, đóng = vườn trồi lên; Dịu mắt = chỉ mờ dần; Chuyển cảnh Tắt / giảm chuyển động = không;
//         chuyển thẳng ôn → Trò chơi thì vườn đứng yên;
//      5. đang cuộn xuống ruộng mà mở bảng (R / Tưới ngay / T / N / B / L) → bảng nằm trong màn hình (1.35.3: ở trên mép);
//      6. 3 cỡ cửa sổ, vườn 300 cây.
//   B. Bảng nổi: mỗi lúc một bảng (⚙ / chọn deck / Nhiệm vụ / Tin làng / Chụp ảnh — 20 cặp), mở bảng lớn thì bảng nổi đóng.
//   C. Báo → Nguồn báo → Lấy từ:
//      1. mọi cặp chuyển Mọi deck / Chọn deck… / Không dùng deck: ô ghi đúng lựa chọn, danh sách deck hiện ⇔ "Chọn deck…",
//         collection lưu đúng (1.35.3: Không dùng deck → Chọn deck… → ô vẫn ghi "Không dùng deck", chọn lại không đóng được);
//      2. danh sách deck dạng cây như ô deck ở thanh trên: thứ tự theo cấp ("JA B" không chen giữa "JA" và "JA::N4"), thu gọn
//         theo Anki, ▸ / ▾ nhớ chung với ô deck ở thanh trên, nhánh có deck đã chọn tự mở;
//      3. tick deck cha → deck con "đã gồm" (khoá), deck con đã tick riêng được bỏ; tối đa 5 deck;
//      4. Tìm deck: danh sách phẳng có đường dẫn, gõ không vẽ lại ô tìm (bộ gõ đang ghép chữ không bị cắt), Esc về cây;
//      5. bàn phím: ← / → thu / mở nhánh, Space tick vẫn đứng ở ô đó; Xong → tên "JA › N5"; Đổi → mở lại đúng nhánh.
//   D. nhật ký lỗi add-on trống, không lỗi JS.
// Chạy: KB_SCRIPTS=e2e_1354.js run_ui.sh ADDON SHOTS
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
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await js('return !!(' + expr + ');')) return true; } catch (e) { /* bỏ qua */ } await sleep(150); }
  return false;
}
const deckId = (name) => py(KB + 'result = mw.col.decks.id_for_name(' + JSON.stringify(name) + ')');
async function setDeck(name) {
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name(' + JSON.stringify(name) + '); d.refresh(); result = 1');
  await sleep(1500);
}

// ---- ghi lại từng khung hình: bảng nào mở, lớp chế độ, phần nào hiện, bề ngang canvas ----
const SAMPLER = `
  window.__kbFrames = []; window.__kbRec = true;
  const $ = (id) => document.getElementById(id);
  const shown = (e) => !!(e && e.offsetParent !== null);
  const tick = () => {
    if (!window.__kbRec) { return; }
    const app = $("kb-app"), m = (app.className.match(/kb-ui-m-(\\w+)/) || [])[1] || "";
    const big = ["kb-panel", "kb-game", "kb-home", "kb-paper", "kb-cal", "kb-ui", "kb-fields"].filter((i) => $(i) && !$(i).hidden);
    const yard = $("kb-yard"), cv = $("kb-canvas");
    window.__kbFrames.push({ t: Math.round(performance.now()), review: !$("kb-panel").hidden, big: big.join(","), mode: m,
      zoom: app.classList.contains("kb-ui-zoom-on"), bar: shown(document.querySelector(".kb-bar")), yard: shown($("kb-yard-wrap")),
      field: shown($("kb-field")), yw: shown(yard) ? yard.getBoundingClientRect().width : -1, fw: cv.width, fcss: shown(cv) ? Math.round(cv.getBoundingClientRect().width) : -1,
      cw: document.documentElement.clientWidth, sy: Math.round(scrollY) });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick); return 1;`;
const STOP = 'window.__kbRec = false; return JSON.stringify(window.__kbFrames);';
// khung nào bảng ôn mở mà lớp chế độ chưa là "review" (hoặc ngược lại)
function badModes(frames) {
  return frames.filter((f) => (f.review && f.mode !== 'review') || (!f.big && f.mode !== 'main'));
}
// khung "trang trống": không bảng nào mở mà thanh trên / sân bị ẩn
function blanks(frames) { return frames.filter((f) => !f.big && (!f.bar || !f.yard)); }
function uniq(a) { return [...new Set(a)]; }

// ---- lớp hiệu ứng được gắn vào phần tử nào (MutationObserver, ghi lại mọi lần thêm lớp) ----
const ANIM_WATCH = `
  window.__kbAnim = [];
  const ids = ["kb-panel", "kb-game", "kb-home", "kb-paper", "kb-cal", "kb-yard-wrap", "kb-field"];
  const els = ids.map((i) => document.getElementById(i)).concat([document.querySelector(".kb-legend-row")]);
  if (window.__kbAnimMo) { window.__kbAnimMo.disconnect(); }
  window.__kbAnimMo = new MutationObserver((list) => list.forEach((r) => {
    const t = r.target, cls = ["kb-panel-in", "kb-panel-fade", "kb-garden-in", "kb-garden-fade"].filter((c) => t.classList.contains(c) && !(r.oldValue || "").split(/\\s+/).includes(c));
    cls.forEach((c) => window.__kbAnim.push((t.id || "legend") + ":" + c + ":" + getComputedStyle(t).animationName));
  }));
  els.forEach((e) => e && window.__kbAnimMo.observe(e, { attributes: true, attributeFilter: ["class"], attributeOldValue: true }));
  return 1;`;
const ANIM_GET = 'const a = window.__kbAnim.slice(); window.__kbAnim = []; return JSON.stringify(a);';

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await js('if (window.GardenGreet && GardenGreet.close) GardenGreet.close(); if (window.GardenTour && GardenTour.close) GardenTour.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');

  // ---- dữ liệu: deck lồng nhiều cấp + vườn 300 cây ----
  await py(`
col = mw.col
nids = col.find_notes('"deck:A::Có câu ví dụ + audio"')
names = ["JA::N5::Bài 1", "JA::N5::Bài 2", "JA::N4::Bài 17::Phần a", "JA B"]
for i, n in enumerate(nids):
    col.set_deck(col.card_ids_of_note(n), col.decks.id(names[i % len(names)]))
import random
m = col.models.new("Từ vựng (300)")
for f in ("Từ", "Cách đọc", "Nghĩa"):
    col.models.add_field(m, col.models.new_field(f))
t = col.models.new_template("T1"); t["qfmt"] = "{{Từ}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Nghĩa}}"
col.models.add_template(m, t); col.models.add(m); m = col.models.by_name("Từ vựng (300)")
did = col.decks.id("Lớn::300 từ")
K = list("日月火水木金土山川田人口目耳手足花草竹石雨雪風空海森林村町市国語学校先生年時分前後午上下中外右左大小高安新古長多少早明暗白黒赤青春夏秋冬朝昼夜晩")
rnd = random.Random(300)
for i in range(300):
    n = col.new_note(m); n["Từ"] = K[i % len(K)] + K[(i * 7 + 3) % len(K)]; n["Cách đọc"] = "よみ%d" % i; n["Nghĩa"] = "từ số %d" % (i + 1)
    col.add_note(n, did)
today = col.sched.today
for k, cid in enumerate(col.find_cards('deck:"Lớn::300 từ"', order="c.id")):
    if k % 9 == 0:
        continue
    ivl = rnd.randint(4, 200)
    due = today if k % 7 == 0 else today + rnd.randint(1, 30)
    col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3, left=0 where id=?", ivl, due, cid)
result = 1`);
  await setDeck('Lớn::300 từ');

  // =====================================================================================================================
  console.log('== A. Tưới ↔ vườn: từng khung hình lúc mở / đóng bảng ôn');
  for (const [w, h] of [[1920, 1080], [1366, 768], [1024, 640]]) {
    await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(1300);
    const main0 = JSON.parse(await js('const y = document.getElementById("kb-yard"), c = document.getElementById("kb-canvas"); return JSON.stringify({ yw: y.getBoundingClientRect().width, fw: c.width });'));
    await js(SAMPLER);
    await js('document.getElementById("kb-review").click(); return 1;');
    await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(900);
    await page.key('Escape', 'Escape', 27); await sleep(900);
    const fr = JSON.parse(await js(STOP));
    const rv = fr.filter((f) => f.review);
    ok(rv.length > 3 && fr.length - rv.length > 3, `${w}×${h}: ghi được ${fr.length} khung (${rv.length} khung đang ôn)`);
    ok(badModes(fr).length === 0, `${w}×${h}: chế độ giao diện đổi cùng khung hình với bảng ôn (${badModes(fr).length} khung lệch)`);
    ok(blanks(fr).length === 0, `${w}×${h}: không khung nào trang trống / mất sân`);
    const yws = uniq(fr.filter((f) => f.yw > 0).map((f) => Math.round(f.yw))), fws = uniq(fr.map((f) => f.fw));
    const scrolled = fr.some((f) => f.cw < w);
    ok(yws.length === 1 && Math.round(main0.yw) === yws[0], `${w}×${h}: cảnh sân giữ bề ngang ${yws.join(' / ')} px suốt lúc mở / đóng` + (scrolled ? ' (có lúc hiện thanh cuộn)' : ''));
    ok(fws.length === 1 && fws[0] === main0.fw, `${w}×${h}: ruộng giữ ${fws.join(' / ')} px (không xếp lại cột)`);
  }

  console.log('== A3. Phóng to (F) rồi Dừng / Esc — không còn khung trang trống');
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1000);
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(700);
  await page.key('f', 'KeyF', 70); await sleep(500);
  ok(await js('return GardenUI.glob("zoom") === "on";'), 'phím F → Phóng to');
  await js(SAMPLER);
  await js('document.getElementById("kb-stop").click(); return 1;'); await sleep(700);
  let fr = JSON.parse(await js(STOP));
  ok(blanks(fr).length === 0 && badModes(fr).length === 0, 'Phóng to → Dừng: vườn + thanh trên hiện ngay khung đầu (' + blanks(fr).length + ' khung trống; 1.35.3: trang trống tới 200 ms)');
  await js(SAMPLER);
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(700);
  fr = JSON.parse(await js(STOP));
  const zf = fr.filter((f) => f.review);
  ok(zf.length > 0 && zf.every((f) => f.zoom && !f.bar && !f.yard), 'mở lại khi đang Phóng to: ngay khung đầu đã là thẻ to (không thấy thanh trên + vườn chớp qua)');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  ok(await js('return GardenUI.glob("zoom") === "off" && !document.getElementById("kb-panel").hidden;'), 'Esc lần 1: thu nhỏ, bảng ôn vẫn mở');
  await js(SAMPLER);
  await page.key('Escape', 'Escape', 27); await sleep(700);
  fr = JSON.parse(await js(STOP));
  ok(blanks(fr).length === 0 && badModes(fr).length === 0, 'Esc lần 2: về vườn, không khung trống / lệch chế độ');

  console.log('== A4. Ẩn vườn khi ôn + chấm 3 thẻ → Esc: ruộng đủ cột ngay khung đầu');
  const fw0 = await js('return document.getElementById("kb-canvas").width;');
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(700);
  await js('document.getElementById("kb-rv-garden").click(); return 1;'); await sleep(500);
  ok(await js('return !document.getElementById("kb-field").offsetParent && !document.getElementById("kb-yard-wrap").offsetParent;'), 'Ẩn vườn: sân + ruộng ẩn');
  for (let i = 0; i < 3; i++) {
    await page.key(' ', 'Space', 32); await sleep(600);
    await page.key('3', 'Digit3', 51); await sleep(900);
  }
  const fwHidden = await js('return document.getElementById("kb-canvas").width;');
  ok(fwHidden === fw0, 'chấm 3 thẻ lúc ruộng ẩn: ruộng vẽ theo bề ngang cũ ' + fwHidden + ' px (1.35.3: còn 4 cột)');
  await js(SAMPLER);
  await page.key('Escape', 'Escape', 27); await sleep(700);
  fr = JSON.parse(await js(STOP));
  const back = fr.filter((f) => !f.big);
  ok(back.length > 0 && uniq(back.map((f) => f.fw)).join() === String(fw0) && back.every((f) => f.field && f.yard), 'Esc: mọi khung sau khi đóng đều có sân + ruộng ' + fw0 + ' px');
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(600);
  await js('document.getElementById("kb-rv-garden").click(); return 1;'); await sleep(400);    // Hiện vườn lại
  await page.key('Escape', 'Escape', 27); await sleep(600);

  console.log('== A5. Hiệu ứng: bật nhẹ / trồi lên / mờ dần / tắt');
  await js(ANIM_WATCH);
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(500);
  await page.shot(SHOTS + '/1354_01_mo_bang_on.png');
  let an = JSON.parse(await js(ANIM_GET));
  ok(an.some((x) => x.startsWith('kb-panel:kb-panel-in:kb-panel-in')), 'mở bảng ôn: bật nhẹ như Nhà / Trò chơi / Báo (' + an.join(' ') + ')');
  await page.key('Escape', 'Escape', 27); await sleep(500);
  an = JSON.parse(await js(ANIM_GET));
  ok(['kb-yard-wrap', 'kb-field', 'legend'].every((id) => an.some((x) => x.startsWith(id + ':kb-garden-in:kb-garden-in'))), 'Esc: sân, hàng chú thích, ruộng trồi lên nhẹ (' + an.join(' ') + ')');
  await sleep(500);
  ok(await js('return !["kb-yard-wrap", "kb-field"].some((i) => /kb-garden-in|kb-panel-in/.test(document.getElementById(i).className));'), 'hiệu ứng xong thì gỡ lớp (không để lại transform)');
  // ôn → Trò chơi thẳng: Trò chơi bật nhẹ, vườn không nhún
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(500);
  await js(ANIM_GET);
  await js('document.getElementById("kb-games").click(); return 1;'); await waitFor('!document.getElementById("kb-game").hidden'); await sleep(400);
  an = JSON.parse(await js(ANIM_GET));
  ok(an.some((x) => x.startsWith('kb-game:kb-panel-in')) && !an.some((x) => /kb-garden/.test(x)), 'đang ôn bấm Trò chơi: bảng Trò chơi bật nhẹ, vườn đứng yên (' + an.join(' ') + ')');
  await js('GardenGames.close(); return 1;'); await sleep(500); await js(ANIM_GET);
  // Dịu mắt: chỉ mờ dần
  await js('const ui = Garden._data().ui || {}; ["main", "review", "panel"].forEach((m) => { ui[m] = Object.assign({}, ui[m] || {}, { sky: "off" }); }); GardenUI.saved(ui); return 1;'); await sleep(400);
  await js(ANIM_GET);
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(500);
  await page.key('Escape', 'Escape', 27); await sleep(500);
  an = JSON.parse(await js(ANIM_GET));
  ok(an.some((x) => x.startsWith('kb-panel:kb-panel-fade')) && an.some((x) => x.startsWith('kb-yard-wrap:kb-garden-fade')) && !an.some((x) => /kb-panel-in|kb-garden-in/.test(x)),
    'Dịu mắt (tắt hạt bay): chỉ mờ dần, không nhún (' + an.join(' ') + ')');
  // giảm chuyển động của máy: không chạy hiệu ứng
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await js('const ui = Garden._data().ui || {}; ["main", "review", "panel"].forEach((m) => { ui[m] = Object.assign({}, ui[m] || {}, { sky: "on" }); }); GardenUI.saved(ui); return 1;'); await sleep(300);
  await js(ANIM_GET);
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(400);
  await page.key('Escape', 'Escape', 27); await sleep(400);
  an = JSON.parse(await js(ANIM_GET));
  ok(an.length > 0 && an.every((x) => x.endsWith(':none')), 'máy bật "giảm chuyển động": lớp có nhưng không có hoạt ảnh (' + an.join(' ') + ')');
  await page.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  // ⚙ Chuyển cảnh: Tắt
  await js('GardenUI.setGlob("trans", "off"); return 1;'); await sleep(400); await js(ANIM_GET);
  await js('document.getElementById("kb-review").click(); return 1;'); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(400);
  await page.key('Escape', 'Escape', 27); await sleep(400);
  an = JSON.parse(await js(ANIM_GET));
  ok(an.length === 0, '⚙ Chuyển cảnh: Tắt → không hiệu ứng nào (' + an.join(' ') + ')');
  await js('GardenUI.setGlob("trans", "on"); return 1;'); await sleep(400);

  console.log('== A6. Đang cuộn xuống ruộng mà mở bảng → bảng nằm trong màn hình');
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1000);
  const openers = [['R', () => page.key('r', 'KeyR', 82), 'kb-panel'], ['Tưới ngay', () => js('document.getElementById("kb-review").click(); return 1;'), 'kb-panel'],
    ['T', () => page.key('t', 'KeyT', 84), 'kb-game'], ['N', () => page.key('n', 'KeyN', 78), 'kb-home'],
    ['B', () => page.key('b', 'KeyB', 66), 'kb-paper'], ['L', () => page.key('l', 'KeyL', 76), 'kb-cal']];
  const maxY = await js('return document.documentElement.scrollHeight - innerHeight;');
  ok(maxY > 100, 'vườn 300 cây ở 1366 × 768: trang cuộn được ' + maxY + ' px');
  for (const [nm, act, id] of openers) {
    await js('document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.scrollTo(0, ' + Math.min(220, maxY) + '); return 1;'); await sleep(250);
    await act();
    await waitFor('!document.getElementById("' + id + '").hidden'); await sleep(500);
    const top = await js('return Math.round(document.getElementById("' + id + '").getBoundingClientRect().top);');
    ok(top >= 0 && top < 300, `cuộn xuống ${Math.min(220, maxY)} px rồi ${nm}: đầu bảng ở ${top} px (1.35.3: −800 px, ngoài màn hình)`);
    await js('if (!document.getElementById("kb-panel").hidden) { document.getElementById("kb-stop").click(); } if (window.GardenGames) GardenGames.close(); if (window.GardenHome) GardenHome.close(); if (window.GardenPaper) GardenPaper.close(); if (window.GardenCal) GardenCal.close(); return 1;');
    await sleep(500);
  }

  // =====================================================================================================================
  console.log('== B. Bảng nổi: mỗi lúc một bảng');
  await setDeck('B::Có câu ví dụ, không audio');
  await js('window.scrollTo(0, 0); return 1;');
  const POPS = { 'kb-sound-pop': '#kb-sound', 'kb-deck-pop': '#kb-deck-btn', 'kb-quest-pop': '#kb-quest', 'kb-news-pop': '#kb-news-btn', 'kb-snap-pop': '#kb-yard-snap' };
  const openPops = () => js(`return ${JSON.stringify(Object.keys(POPS))}.filter((i) => !document.getElementById(i).hidden);`);
  const hideAll = () => js(`document.body.click(); ${JSON.stringify(Object.keys(POPS))}.forEach((i) => { document.getElementById(i).hidden = true; }); if (window.GardenGreet && GardenGreet.closeNews) GardenGreet.closeNews(); return 1;`);
  const avail = await js(`return ${JSON.stringify(POPS)} && Object.entries(${JSON.stringify(POPS)}).filter(([, s]) => { const e = document.querySelector(s); return e && !e.hidden && e.offsetParent !== null; }).map(([k]) => k);`);
  // Tin làng chỉ có nút khi hôm nay / 7 ngày tới có tin (hồ sơ mới có thể không có) — còn lại phải đủ
  ok(avail.length >= 4 && ['kb-sound-pop', 'kb-deck-pop', 'kb-quest-pop', 'kb-snap-pop'].every((x) => avail.includes(x)), 'nút mở bảng nổi trên màn chính: ' + avail.join(', '));
  let both = 0, pairs = 0, wrong = [];
  for (const a of avail) {
    for (const b of avail) {
      if (a === b) { continue; }
      await hideAll(); await sleep(120);
      await page.click(POPS[a]); await sleep(250);
      await page.click(POPS[b]); await sleep(250);
      const o = await openPops();
      pairs++;
      if (o.length !== 1 || o[0] !== b) { both++; wrong.push(a + '→' + b + ':' + o.join('+')); }
    }
  }
  ok(pairs === avail.length * (avail.length - 1) && pairs >= 12 && both === 0, `mở bảng này rồi bấm nút bảng kia: chỉ còn bảng vừa bấm (${pairs - both}/${pairs} cặp; 1.35.3: cặp nào cũng chồng hai bảng)` + (wrong.length ? ' ' + wrong.slice(0, 4).join(' ') : ''));
  for (const a of avail) {
    await hideAll(); await sleep(120);
    await page.click(POPS[a]); await sleep(250);
    await js('document.activeElement && document.activeElement.blur && document.activeElement.blur(); document.getElementById("kb-games").click(); return 1;');
    await waitFor('!document.getElementById("kb-game").hidden'); await sleep(300);
    const o = await openPops();
    ok(o.length === 0, `${a} đang mở rồi mở Trò chơi: bảng nổi tự đóng` + (o.length ? ' (còn ' + o.join(', ') + ')' : ''));
    await js('GardenGames.close(); return 1;'); await sleep(300);
  }
  await hideAll();

  // =====================================================================================================================
  console.log('== C. Báo → Nguồn báo → Lấy từ');
  await py(KB + 'kb._dialog.resize(1280, 900); result = 1'); await sleep(800);
  await js('GardenPaper.open("src"); return 1;');
  ok(await waitFor('document.querySelector(".kb-ai-lang select[aria-label^=\'Lấy từ\']")'), 'tab Nguồn báo có ô "Lấy từ" của báo tiếng Nhật');
  const SEL = '.kb-ai-lang select[aria-label="Lấy từ cho Báo tiếng Nhật"]';
  ok(await js(`return !!document.querySelector('${SEL}');`), 'ô "Lấy từ cho Báo tiếng Nhật"');
  const pstate = () => js(`const s = document.querySelector('${SEL}'), b = s.closest(".kb-ai-lang"); return JSON.stringify({ sel: s.value, list: !!b.querySelector(".kb-ai-decks") });`).then(JSON.parse);
  const choose = async (v) => { await js(`const s = document.querySelector('${SEL}'); s.value = "${v}"; s.dispatchEvent(new Event("change")); return 1;`); await sleep(350); };
  const saved = () => py(KB + 'result = kb.words.load_src(mw.col)["ja"]');
  const ORDER = ['all', 'pick', 'level', 'pick', 'all', 'level', 'all', 'pick', 'level', 'level', 'pick', 'pick', 'all'];
  let cur = (await pstate()).sel, bad = [], expMode = (await saved()).mode;
  for (const v of ORDER) {
    const before = cur;
    await choose(v);
    const s = await pstate(), sv = await saved();
    if (v !== 'pick') { expMode = v === 'level' ? 'level' : 'deck'; }      // mở danh sách chưa tick thì chưa lưu gì
    const good = s.sel === v && s.list === (v === 'pick') && sv.mode === expMode && sv.decks.length === 0;
    if (!good) { bad.push(before + '→' + v + ': ô ' + s.sel + ', danh sách ' + s.list + ', lưu ' + sv.mode); }
    cur = v;
  }
  ok(bad.length === 0, `${ORDER.length} lần đổi Mọi deck / Chọn deck… / Không dùng deck: ô ghi đúng, danh sách deck hiện đúng lúc "Chọn deck…"` + (bad.length ? ' — ' + bad.join(' | ') : ''));
  // đúng ca người dùng gặp: Chọn deck… (danh sách mở) → Không dùng deck → đóng ngay
  await choose('pick');
  ok((await pstate()).list, 'Chọn deck… → hiện danh sách deck');
  await choose('level');
  const lv = await pstate();
  ok(!lv.list && lv.sel === 'level', '→ Không dùng deck: danh sách deck đóng ngay, ô ghi "Không dùng deck"');
  await choose('pick');
  ok((await pstate()).sel === 'pick', 'từ "Không dùng deck" bấm "Chọn deck…": ô ghi "Chọn deck…" (1.35.3: vẫn ghi "Không dùng deck")');

  console.log('== C2. Danh sách deck dạng cây');
  const rows = () => js(`return JSON.stringify([...document.querySelector('${SEL}').closest(".kb-ai-lang").querySelectorAll(".kb-ai-deck")].filter((l) => !l.hidden).map((l) => ({
    id: Number(l.getAttribute("data-id")), d: Number(l.style.getPropertyValue("--kb-dd") || 0), tog: l.querySelector(".kb-ai-dtog").textContent,
    name: l.querySelector(".kb-ai-dname").textContent, leaf: l.querySelector(".kb-ai-dleaf").textContent, on: l.querySelector("input").checked,
    dis: l.querySelector("input").disabled, hint: l.querySelector(".kb-ai-hint").textContent })));`).then(JSON.parse);
  let r0 = await rows();
  const JA = await deckId('JA'), N5 = await deckId('JA::N5'), N4 = await deckId('JA::N4'), B1 = await deckId('JA::N5::Bài 1'), B2 = await deckId('JA::N5::Bài 2'), JAB = await deckId('JA B');
  ok(r0.length >= 8 && r0.every((r) => r.d === 0), 'deck đang thu gọn ở Anki → chỉ hiện deck cấp đầu (' + r0.map((r) => r.leaf + r.tog).join(' ') + ')');
  ok(r0.every((r) => r.leaf.indexOf('::') < 0), 'chỉ ghi tên của chính deck (không "A::B")');
  const ia = r0.findIndex((r) => r.id === JA), ib = r0.findIndex((r) => r.id === JAB);
  ok(ia >= 0 && ib === ia + 1 && r0[ia].tog === '▸', '"JA" có ▸, ngay sau là "JA B"');
  await page.shot(SHOTS + '/1354_02_cay_deck_thu_gon.png');
  await js(`document.querySelector('[data-tog="${JA}"]').click(); return 1;`); await sleep(250);
  let r1 = await rows();
  const ja1 = r1.findIndex((r) => r.id === JA);
  ok(r1[ja1].tog === '▾' && r1[ja1 + 1].id === N4 && r1[ja1 + 1].d === 1 && r1[ja1 + 2].id === N5 && r1[ja1 + 3].id === JAB,
    'bấm ▸ JA → N4, N5 thụt vào một cấp ngay dưới JA, rồi mới tới "JA B" (Anki xếp như vậy; 1.35.3 sắp theo chữ: "JA B" chen giữa)');
  const fold = await js('return GardenPrefs.get("kb-deck-fold") || "";');
  ok(fold.split(',').includes('+' + JA), 'nhớ nhánh đang mở chung với ô deck ở thanh trên (prefs kb-deck-fold: ' + fold + ')');
  // ô deck ở thanh trên thấy cùng nhánh mở
  await js('document.getElementById("kb-deck-btn").click(); return 1;'); await sleep(500);
  const topTog = await js(`const r = document.querySelector('#kb-deck-list .kb-deck-row[data-id="${JA}"]'); return r ? r.querySelector(".kb-deck-tog").textContent : "?";`);
  ok(topTog === '▾', 'ô deck ở thanh trên: JA cũng đang mở (▾)');
  await js('document.getElementById("kb-deck-btn").click(); return 1;'); await sleep(300);
  // tick Bài 1 rồi tick N5
  await js(`document.querySelector('[data-tog="${N5}"]').click(); return 1;`); await sleep(250);
  await js(`document.querySelector('.kb-ai-deck[data-id="${B1}"] input').click(); return 1;`); await sleep(500);
  ok(JSON.stringify((await saved()).decks) === JSON.stringify([B1]), 'tick "Bài 1" → lưu 1 deck');
  await js(`document.querySelector('.kb-ai-deck[data-id="${N5}"] input').click(); return 1;`); await sleep(500);
  let sv = await saved(); r1 = await rows();
  const rb1 = r1.find((r) => r.id === B1), rb2 = r1.find((r) => r.id === B2);
  ok(JSON.stringify(sv.decks) === JSON.stringify([N5]) && sv.mode === 'deck', 'tick deck cha "N5" → chỉ lưu N5 (deck cha lấy cả deck con; "Bài 1" tick riêng được bỏ)');
  ok(rb1 && rb2 && rb1.on && rb1.dis && rb2.on && rb2.dis && rb1.hint === 'đã gồm', 'Bài 1, Bài 2: đánh dấu + khoá, ghi "đã gồm"');
  ok((await pstate()).sel === 'pick' && await js(`return /Deck đã chọn \\(1\\)/.test(document.querySelector('${SEL}').selectedOptions[0].textContent);`), 'ô ghi "Deck đã chọn (1)"');
  await page.shot(SHOTS + '/1354_03_cay_deck_tick_cha.png');
  await js(`document.querySelector('.kb-ai-deck[data-id="${N5}"] input').click(); return 1;`); await sleep(500);
  r1 = await rows();
  ok((await saved()).decks.length === 0 && !r1.find((r) => r.id === B1).on && !r1.find((r) => r.id === B1).dis, 'bỏ tick N5 → Bài 1 / Bài 2 bỏ khoá');
  // tối đa 5
  const tops = r1.filter((r) => r.d === 0).slice(0, 5);
  for (const r of tops) { await js(`document.querySelector('.kb-ai-deck[data-id="${r.id}"] input').click(); return 1;`); await sleep(350); }
  sv = await saved(); r1 = await rows();
  ok(sv.decks.length === 5 && r1.filter((r) => !r.on).every((r) => r.dis), 'tick 5 deck → các ô còn lại khoá (lưu ' + sv.decks.length + ')');
  for (const r of tops) { await js(`document.querySelector('.kb-ai-deck[data-id="${r.id}"] input').click(); return 1;`); await sleep(300); }
  ok((await saved()).decks.length === 0, 'bỏ tick cả 5');

  console.log('== C3. Tìm deck');
  const nShown = (await rows()).length;
  await js(`const q = document.querySelector('.kb-ai-lang .kb-ai-dq'); q.__kbSame = 1; q.focus(); return 1;`);
  await page.send('Input.insertText', { text: 'bai' }); await sleep(300);
  const fl = await rows();
  ok(fl.length >= 4 && fl.every((r) => /Bài/.test(r.name)) && fl.some((r) => r.name === 'JA › N5 › Bài 1') && fl.every((r) => r.tog === ''),
    'gõ "bai" (không dấu): danh sách phẳng có đường dẫn — ' + fl.map((r) => r.name).join(' | '));
  ok(await js('const q = document.querySelector(".kb-ai-lang .kb-ai-dq"); return q.__kbSame === 1 && document.activeElement === q && q.value === "bai";'), 'ô tìm không bị vẽ lại khi gõ (bộ gõ đang ghép chữ không bị cắt), vẫn giữ focus');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(await js('return document.querySelector(".kb-ai-lang .kb-ai-dq").value === "" && !document.getElementById("kb-paper").hidden;') && (await rows()).length === nShown, 'Esc trong ô tìm: xoá chữ, về cây như cũ, bảng Báo vẫn mở');

  console.log('== C4. Bàn phím');
  await js(`document.querySelector('.kb-ai-deck[data-id="${JA}"] input').focus(); return 1;`);
  await page.key('ArrowLeft', 'ArrowLeft', 37); await sleep(250);
  ok((await rows()).find((r) => r.id === JA).tog === '▸' && !(await rows()).some((r) => r.id === N4), '← trên JA: thu nhánh');
  await page.key('ArrowRight', 'ArrowRight', 39); await sleep(250);
  ok((await rows()).find((r) => r.id === JA).tog === '▾', '→ trên JA: mở nhánh');
  await js(`document.querySelector('.kb-ai-deck[data-id="${N4}"] input').focus(); return 1;`);
  await page.key(' ', 'Space', 32); await sleep(600);
  ok(JSON.stringify((await saved()).decks) === JSON.stringify([N4]), 'Space trên N4: tick');
  ok(await js(`const a = document.activeElement; return !!a && a.getAttribute("data-id") === "${N4}" && a.closest(".kb-ai-decks-list") !== null;`), 'vẽ lại xong focus vẫn ở ô N4 (1.35.3: về đầu trang)');
  await js('[...document.querySelectorAll(".kb-ai-decks button")].find((b) => b.textContent === "Xong").click(); return 1;'); await sleep(500);
  const nameRow = await js(`return [...document.querySelector('${SEL}').closest(".kb-ai-lang").querySelectorAll(".kb-ai-sub-row .kb-ai-v")].map((e) => e.textContent).join("|");`);
  ok(/JA › N4/.test(nameRow) && !/::/.test(nameRow), 'Xong → dòng deck đã chọn ghi "JA › N4" (' + nameRow + ')');
  // thu JA ở thanh trên rồi bấm Đổi: nhánh có deck đã chọn tự mở
  await js('Garden.deckFoldSave(' + JA + ', false); return 1;');
  await js('[...document.querySelector(\'' + SEL + '\').closest(".kb-ai-lang").querySelectorAll("button")].find((b) => b.textContent === "Đổi").click(); return 1;'); await sleep(400);
  const r2 = await rows();
  ok(r2.find((r) => r.id === JA) && r2.find((r) => r.id === JA).tog === '▾' && r2.some((r) => r.id === N4 && r.on), 'bấm Đổi: nhánh JA (có N4 đã chọn) tự mở dù đang thu gọn');
  await page.shot(SHOTS + '/1354_04_doi_deck.png');
  await choose('level'); await sleep(200);
  ok(!(await pstate()).list && (await saved()).mode === 'level' && (await saved()).decks.length === 0, 'đang mở danh sách → Không dùng deck: danh sách đóng, bỏ deck đã chọn, lưu "level"');
  await choose('all');

  console.log('== C5. Báo tiếng Anh cũng là cây');
  const SELE = '.kb-ai-lang select[aria-label="Lấy từ cho Báo tiếng Anh"]';
  if (await js(`return !!document.querySelector('${SELE}');`)) {
    await js(`const s = document.querySelector('${SELE}'); s.value = "pick"; s.dispatchEvent(new Event("change")); return 1;`); await sleep(400);
    const er = await js(`return [...document.querySelector('${SELE}').closest(".kb-ai-lang").querySelectorAll(".kb-ai-deck")].filter((l) => !l.hidden).map((l) => l.querySelector(".kb-ai-dleaf").textContent + l.querySelector(".kb-ai-dtog").textContent);`);
    ok(er.length >= 3 && er.every((x) => x.indexOf('::') < 0) && er.some((x) => /▸|▾/.test(x)), 'báo tiếng Anh: cây deck (' + er.join(', ') + ')');
    await js(`const s = document.querySelector('${SELE}'); s.value = "all"; s.dispatchEvent(new Event("change")); return 1;`); await sleep(300);
  } else { ok(true, 'không có báo tiếng Anh trong lần chạy này (bỏ qua)'); }
  await js('GardenPaper.close(); return 1;');

  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log('\n' + results.filter(Boolean).length + '/' + results.length + ' kiểm tra đạt');
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
