// 1.22.5 — soát "tình huống khó" mà người chơi ít xu không tự thử được, và các lỗi người dùng thật hay gặp:
//   · 0 xu: mọi nút trả xu ở mọi tab Nhà / Xưởng đều bị khoá; gửi thẳng lệnh mua (giao diện cũ) → Python từ chối, xu không âm
//   · vừa đủ xu (xu = giá): mua được, xu về 0 — xây, đồ sân, vùng, kiểu nhà, thú, giống, giao diện mùa, đồ mặc, biểu cảm,
//     chế tác, +1 cái, sửa nhà, giống tự vẽ, vùng tự tạo, làm từ mã
//   · bấm đúp (chuột thật qua CDP) vào nút trả xu: chỉ trả một lần
//   · chạm giới hạn: 60 món tự làm, 6 vùng tự tạo, 12 giống tự vẽ, 12 luật tag, món chỉ có một cái
//   · xoá khi đang dùng: món đang đặt, vùng tự tạo đang hiện ở màn chính (có đồ + thú), giống đang gieo cho deck
//   · mã chia sẻ: trống / chữ lạ / KB2 / sai một ký tự / quá dài / xem trước mã A rồi đổi chữ sang mã B mà không xem lại
//   · deck lạ: deck trống, deck bị xoá khi vườn đang mở, tên deck rất dài, deck lọc
//   · xu rất nhiều (123.456.789) ở thanh trên, thú nuôi (tự cho ăn khi thiếu xu, tên có thẻ HTML / quá dài)
//   · cửa sổ nhỏ nhất Anki cho phép (720 × 520), laptop 1366 × 768 đặt Windows 125% (trang ~1093 × 560) và 1920 × 1080:
//     mọi màn chính đo tràn / cắt / ngoài khung, bảng Nhà (cả danh sách đồ + nút đầu tiên) nằm trong cửa sổ
// Chạy: KB_SCRIPTS=audit_edge.js tests/anki/run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const { MEASURE } = require('./measure');
const SHOTS = process.argv[2] || '/tmp/kb_shots_edge';
fs.mkdirSync(SHOTS, { recursive: true });
const results = []; const fails = [];
const ok = (c, m) => { results.push(!!c); if (!c) fails.push(m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
// ảnh vườn tự lưu: mỗi Anki (cổng điều khiển) một file — chạy song song nhiều bản Anki không ghi đè nhau (1.22.7)
const PHOTO = '/tmp/kb_edge_photo_' + CTRL + '.png';
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
const KB = 'import sys, os, time, datetime, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\ncore = kb.core\n';
const W = (expr) => '(() => { ' + expr + ' })()';
let page;
const js = (expr) => page.eval(W(expr));
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await page.eval(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
async function waitPy(code, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await py(KB + code); if (v) return v; } catch (e) { } await sleep(200); }
  return false;
}
const coins = () => py(KB + 'result = st.load()["coins"]');
const setCoins = async (n) => { await py(KB + `d = st.load(); d["coins"] = ${n}; st.save(d); kb._dialog.refresh(); result = 1`); await sleep(700); };
const hideToast = () => js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
async function mouse(type, x, y, button = 'left', clickCount = 1) { await page.send('Input.dispatchMouseEvent', { type, x, y, button, clickCount }); }
// đang ở chế độ đặt đồ thì bấm Esc thật (sự kiện JS tự tạo không huỷ được → Anki đóng luôn cửa sổ vườn)
async function escPlacing() { if (await js('return !!GardenHome._state().placing;')) { await page.key('Escape', 'Escape', 27); await sleep(200); } }
const tip = () => js('const t = document.getElementById("kb-h-tip"); return t ? t.textContent : "";');

// ---- chụp + đo ----
const report = [];
let sizeTag = '1366';
async function shot(name, note) {
  await sleep(450);
  const m = await page.eval(MEASURE);
  const file = sizeTag + '_' + name;
  await page.shot(SHOTS + '/' + file + '.png');
  const errs = page.errors.splice(0);
  report.push({ name: file, note: note || '', ...m, errs });
  const flags = [m.hscroll ? 'TRÀN NGANG' : '', m.cut.length ? 'cắt ' + m.cut.length : '', m.outside.length ? 'ngoài khung ' + m.outside.length : '',
    m.tiny.length ? 'nút nhỏ ' + m.tiny.length : '', m.rows.length ? 'hàng lệch ' + m.rows.length : '', m.style.length ? 'kiểu lệch ' + m.style.length : '',
    m.label.length ? 'nhãn thừa ' + m.label.length : '', errs.length ? 'LỖI JS ' + errs.length : ''].filter(Boolean).join(', ');
  console.log((flags ? '  ! ' : '  · ') + file + (note ? ' (' + note + ')' : '') + (flags ? ' — ' + flags : ''));
  m.cut.concat(m.outside, m.style, m.label, m.rows, errs).slice(0, 8).forEach((x) => console.log('      ' + x));
  return { m, errs, flags };
}

// ---- Nhà & Cửa hàng ----
async function openHome(tab, scene) {
  await js(`if (window.GardenCraft && GardenCraft.isOpen()) GardenCraft.close();
    if (!GardenHome.isOpen()) GardenHome.open(${scene ? JSON.stringify(scene) : ''}); else if (${!!scene}) GardenHome.setScene(${JSON.stringify(scene || '')});
    const b = document.querySelector('#kb-home .kb-h-tab[data-tab="${tab}"]'); if (b) b.click(); return 1;`);
  await sleep(400);
}
const closeHome = () => js('if (window.GardenCraft && GardenCraft.isOpen()) GardenCraft.close(); if (GardenHome.isOpen()) GardenHome.close(); return 1;');
// nút trong danh sách Nhà: tìm theo chữ (regex) trong thẻ có tên chứa `name` (bỏ trống = mọi thẻ)
const BTN = (re, name) => `(() => {
  const cards = Array.from(document.querySelectorAll("#kb-h-list .kb-h-card"));
  const want = ${JSON.stringify(name || '')};
  const pool = want ? cards.filter((k) => { const n = k.querySelector(".kb-h-name"); return n && n.textContent.indexOf(want) >= 0; }) : cards;
  for (const c of pool) { const b = Array.from(c.querySelectorAll("button")).find((x) => ${re}.test(x.textContent)); if (b) return b; }
  return null; })()`;
const btnInfo = (re, name) => js(`const b = ${BTN(re, name)}; return b ? { text: b.textContent, disabled: b.disabled, title: b.title } : null;`);
const click = (re, name) => js(`const b = ${BTN(re, name)}; if (!b || b.disabled) return false; b.scrollIntoView({ block: "center" }); b.click(); return true;`);
// bấm đúp bằng chuột thật (CDP): nhấn-thả clickCount 1 rồi nhấn-thả clickCount 2, như người dùng bấm đúp
async function dblAt(elExpr) {
  const p = await js(`const b = ${elExpr}; if (!b) return null; b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, b.disabled, b.textContent];`);
  if (!p) return null;
  const [x, y] = p;
  await mouse('mouseMoved', x, y);
  await mouse('mousePressed', x, y, 'left', 1); await mouse('mouseReleased', x, y, 'left', 1);
  await sleep(60);
  await mouse('mousePressed', x, y, 'left', 2); await mouse('mouseReleased', x, y, 'left', 2);
  return p;
}
// bấm hai lần cách nhau ~350 ms (người dùng sốt ruột bấm lại khi chưa thấy gì đổi)
async function twiceAt(elExpr, gap = 350) {
  const p = await js(`const b = ${elExpr}; if (!b) return null; b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, b.disabled, b.textContent];`);
  if (!p) return null;
  const [x, y] = p;
  await mouse('mouseMoved', x, y);
  await mouse('mousePressed', x, y, 'left', 1); await mouse('mouseReleased', x, y, 'left', 1);
  await sleep(gap);
  await mouse('mousePressed', x, y, 'left', 1); await mouse('mouseReleased', x, y, 'left', 1);
  return p;
}
const PAY = /^(Mua|Mở khoá|Xây|Nhận nuôi|Mua giống|Mở xưởng|Sửa hết|Cho ăn|Cho cả nhà ăn|\+1 cái|Làm món|Tạo vùng|Tạo giống|Còn thiếu|Thiếu |Cạo rêu|Sơn lại|Lợp lại|Chống dột)/;
async function payButtons() {
  return js(`const re = ${PAY};
    return Array.from(document.querySelectorAll("#kb-h-list button")).filter((b) => re.test(b.textContent.trim()))
      .map((b) => { const c = b.closest(".kb-h-card"); const n = c && c.querySelector(".kb-h-name"); return { t: b.textContent.trim(), d: b.disabled, n: n ? n.textContent.trim().slice(0, 30) : "" }; });`);
}
// Xưởng: vẽ vài ô
const cellPt = (x, y) => js(`const cv = document.getElementById("kb-cf-grid"), r = cv.getBoundingClientRect(), c = GardenCraft._state().cell;
  return [r.left + (${x} + 0.5) * c, r.top + (${y} + 0.5) * c];`);
async function stroke(cells) {
  const [x0, y0] = await cellPt(cells[0][0], cells[0][1]);
  await mouse('mouseMoved', x0, y0); await mouse('mousePressed', x0, y0);
  for (const [cx, cy] of cells.slice(1)) { const [x, y] = await cellPt(cx, cy); await mouse('mouseMoved', x, y); }
  const [x1, y1] = await cellPt(cells[cells.length - 1][0], cells[cells.length - 1][1]);
  await mouse('mouseReleased', x1, y1);
}
async function typeInto(sel, text) {
  await js(`const e = document.querySelector(${JSON.stringify(sel)}); e.focus(); e.select && e.select(); return 1;`);
  await page.send('Input.insertText', { text });
  await js(`const e = document.querySelector(${JSON.stringify(sel)}); e.dispatchEvent(new Event("input")); e.dispatchEvent(new Event("change")); return 1;`);
}
// KB_PHASES=2,3 → chỉ chạy các pha này (để gỡ lỗi kịch bản)
const ONLY = process.env.KB_PHASES ? new Set(process.env.KB_PHASES.split(',').map(Number)) : null;
let phaseNo = 0;
async function phase(name, fn) {
  phaseNo++;
  if (ONLY && !ONLY.has(phaseNo)) return;
  console.log('== ' + name);
  try { await fn(); } catch (e) { const L = e.message.trim().split('\n'); ok(false, name + ': LỖI KỊCH BẢN ' + (L.length > 1 ? L.slice(-3).join(' / ') : L[0])); }
  const errs = page.errors.splice(0);
  if (errs.length) { ok(false, name + ': lỗi JS ' + errs.slice(0, 3).join(' | ')); }
}
const fixSky = (hour = 10, weather = 'sunny') => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${hour}); GardenSky.set("weather", ${JSON.stringify(weather)}); return 1;`);
// trạng thái vườn dựng sẵn bằng Python (không qua nút) — chỉ để chuẩn bị, mọi lần mua kiểm tra đều bấm nút
const PREP = `
def prep(coins=0, house=0, zones=0, wear_days=None, pets=(), seeds=(), themes=(), craft=0):
    d = st.load()
    d["coins"] = coins
    # vườn mới tinh (giữ ví / nhiệm vụ), rồi dựng theo tham số
    d["home"] = core._empty_home(); d["home"]["uzones"] = []
    d["craft"] = core._clean_craft(None)
    d["wear"] = core._clean_wear(None)
    d["more"] = kb.more_core.empty_more(); d["more"]["myseeds"] = kb.share_core.empty_myseeds()
    d["season"] = core.season.clean_season(None)
    h = d["home"]
    h["house"] = house
    h["zones"] = list(core.ZONE_IDS[:zones])
    for z in core.ZONE_IDS[zones:]:
        h[z] = []
    m = d["more"]
    today = int(mw.col.sched.today)
    m["repair"] = {"day": (today - wear_days) if wear_days is not None else (today if house >= 3 else None), "seen": today, "back": None}
    for p in pets:
        m["pets"][p] = {"name": kb.more_core.PETS[p]["name"], "scene": "yard", "fed": today - 1, "love": 1, "got": today - 1}
    m["seeds"]["owned"] = list(seeds)
    d["season"]["unlocked"] = list(themes)
    st.save(d)
`;
const ITEM_CODE = `spr = core.px_encode("." * 100 + "r" * 40 + "." * 76 + "k" * 40)`;

(async () => {
  await py(KB + `os.environ["KB_TEST_PHOTO"] = "${PHOTO}"
d = st.load(); d["coins"] = 0; st.save(d)
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(2500);
  await js('if (window.GardenPaper) GardenPaper.close(); if (window.GardenCal) GardenCal.close(); return 1;');
  await fixSky(); await hideToast();
  page.errors.splice(0);
  const C = await js('return Garden._data().catalog;');

  // ---------------------------------------------------------------------------------------------------------------
  await phase('0 xu: mọi nút trả xu đều khoá, lệnh mua gửi thẳng bị Python từ chối', async () => {
    await py(KB + PREP + `prep(coins=0, house=7, zones=6, wear_days=40, pets=("neko",), seeds=("ine",))
d = st.load(); d["coins"] = 0; st.save(d)
${ITEM_CODE}
st.craft_save({"name": "Táo", "size": 16, "kind": "ground", "fx": "none", "px": spr}) if False else None
kb._dialog.refresh(); result = 1`);
    await sleep(1200); await hideToast();
    let open = [];
    for (const t of ['build', 'yard', 'room', 'zone', 'pet', 'seed', 'season', 'wear', 'craft']) {
      await openHome(t, 'yard');
      const bs = await payButtons();
      const en = bs.filter((b) => !b.d);
      open = open.concat(en.map((b) => t + ': ' + b.n + ' «' + b.t + '»'));
      if (['build', 'craft', 'pet', 'season'].includes(t)) await shot('01_0xu_' + t, '0 xu');
    }
    ok(!open.length, '0 xu: không còn nút trả xu nào bấm được' + (open.length ? ' — còn: ' + open.slice(0, 6).join(' | ') : ''));
    // Xưởng: thẻ "Tạo món đồ mới" khi không đủ xu cho cỡ nhỏ nhất
    await openHome('craft');
    const mk = await btnInfo(/^(Mở xưởng|Còn thiếu|Thiếu)/, 'Tạo món đồ mới');
    ok(mk && mk.disabled && /thiếu 200 xu/i.test(mk.text + mk.title), 'Thẻ "Tạo món đồ mới" khi 0 xu: nút khoá, ghi còn thiếu 200 xu (' + JSON.stringify(mk) + ')');
    // giao diện cũ / bấm khi danh sách chưa kịp vẽ lại: lệnh mua đi thẳng tới Python
    const before = await py(KB + 'd = st.load(); result = [d["coins"], d["home"]["owned"].get("bench", 0), len(d["more"]["pets"]), d["home"]["house"]]');
    for (const c of ['home:buy:bench', 'home:pet:buy:shiba', 'home:seed:buy:sakura', 'home:theme:buy:sakura', 'home:wear:buy:' + C.wear[0].id,
      'home:face:buy:' + C.faces[0].id, 'home:repair:all', 'home:pet:feed:all', 'home:style:buy:castle']) {
      await js(`pycmd(${JSON.stringify(c)}); return 1;`); await sleep(250);
    }
    await sleep(600);
    const after = await py(KB + 'd = st.load(); result = [d["coins"], d["home"]["owned"].get("bench", 0), len(d["more"]["pets"]), d["home"]["house"]]');
    ok(JSON.stringify(before) === JSON.stringify(after) && after[0] === 0, 'Lệnh mua gửi thẳng khi 0 xu: Python từ chối hết, xu vẫn 0 (' + JSON.stringify(after) + ')');
    const t = await tip();
    ok(/Thiếu [0-9.]+ xu/.test(t), 'Báo "Thiếu N xu…" ở dòng gợi ý: ' + t.slice(0, 60));
    await closeHome();
  });

  // ---------------------------------------------------------------------------------------------------------------
  await phase('Vừa đủ xu (xu = giá): mua được, xu về 0', async () => {
    const cases = [];
    // xây bước 1
    await py(KB + PREP + `prep(coins=${C.levels[1].price}, house=0, zones=0)
kb._dialog.refresh(); result = 1`); await sleep(900);
    await openHome('build', 'yard');
    let r = await click(/^Xây$/);
    cases.push(['Xây "' + C.levels[1].name + '"', r && await waitPy('result = st.load()["home"]["house"] == 1')]);
    // một món sân rẻ nhất
    const yardItem = C.items.filter((i) => i.scene === 'yard' && !i.rare && !i.only && !i.zone && !i.season && !i.custom).sort((a, b) => a.price - b.price)[0];
    await setCoins(yardItem.price); await openHome('yard');
    r = await click(/^Mua$/, yardItem.name);
    cases.push(['Mua "' + yardItem.name + '" ' + yardItem.price + ' xu', r && await waitPy(`result = st.load()["home"]["owned"].get("${yardItem.id}", 0) == 1`)]);
    await escPlacing();
    // vùng đầu tiên
    await setCoins(C.zones[0].price); await openHome('zone');
    r = await click(/^Mở khoá$/, C.zones[0].name);
    cases.push(['Mở vùng "' + C.zones[0].name + '" ' + C.zones[0].price + ' xu', r && await waitPy('result = "beach" in st.load()["home"]["zones"]')]);
    // thú nuôi
    const pet = C.more.pets[0];
    await setCoins(pet.price); await openHome('pet');
    r = await click(/^Nhận nuôi/, pet.name);
    cases.push(['Nhận nuôi "' + pet.name + '" ' + pet.price + ' xu', r && await waitPy(`result = "${pet.id}" in st.load()["more"]["pets"]`)]);
    // giống
    const seed = C.more.seeds[0];
    await setCoins(seed.price); await openHome('seed');
    r = await click(/^Mua giống/, seed.name);
    cases.push(['Mua giống "' + seed.name + '" ' + seed.price + ' xu', r && await waitPy(`result = "${seed.id}" in st.load()["more"]["seeds"]["owned"]`)]);
    // giao diện mùa
    const th = C.themes.list ? C.themes.list[0] : (C.themes[0] || C.themes.themes[0]);
    await setCoins(th.price); await openHome('season');
    r = await click(/^Mở khoá · /, th.name);
    cases.push(['Mở giao diện "' + th.name + '" ' + th.price + ' xu', r && await waitPy(`result = "${th.id}" in st.load()["season"]["unlocked"]`)]);
    // đồ mặc + biểu cảm
    const wr = C.wear[0], fc = C.faces[0];
    await setCoins(wr.price); await openHome('wear');
    r = await click(/^Mua$/, wr.name);
    cases.push(['Mua đồ mặc "' + wr.name + '" ' + wr.price + ' xu', r && await waitPy(`result = "${wr.id}" in st.load()["wear"]["owned"]`)]);
    await setCoins(fc.price); await openHome('wear');
    r = await click(/^Mua · /, fc.name);
    cases.push(['Mua biểu cảm "' + fc.name + '" ' + fc.price + ' xu', r && await waitPy(`result = "${fc.id}" in st.load()["wear"]["faces"]`)]);
    // chế tác 16×16 rồi +1 cái
    await setCoins(200); await openHome('craft');
    await click(/^Mở xưởng$/, 'Tạo món đồ mới'); await sleep(500);
    await js('document.getElementById("kb-cf-size").value = "16"; document.getElementById("kb-cf-size").dispatchEvent(new Event("change")); return 1;');
    await stroke([[3, 3], [4, 3], [5, 3], [5, 4], [5, 5]]);
    await js('document.getElementById("kb-cf-save").click(); return 1;');
    cases.push(['Chế tác món 16×16 · 200 xu', await waitPy('result = len(st.load()["craft"]["items"]) == 1')]);
    await escPlacing();
    await setCoins(100); await openHome('craft');
    r = await click(/^\+1 cái/);
    cases.push(['+1 cái · 100 xu', r && await waitPy('d = st.load(); cid = list(d["craft"]["items"])[0]; result = d["home"]["owned"].get(cid) == 2')]);
    // sửa nhà 1 nấc
    await py(KB + `d = st.load(); d["home"]["house"] = 7; d["more"]["repair"]["day"] = int(mw.col.sched.today) - 30; d["more"]["repair"]["back"] = None; st.save(d); kb._dialog.refresh(); result = 1`);
    await sleep(800);
    const one = await py(KB + 'd = st.load(); result = d["more_view"]["wear"]["cost_one"]');
    await setCoins(one); await openHome('build');
    r = await click(/^(Cạo rêu|Sơn lại|Lợp lại|Chống dột)/);
    cases.push(['Sửa nhà 1 nấc · ' + one + ' xu', r && await waitPy('result = st.load()["more_view"]["wear"]["level"] == 3')]);
    // kiểu nhà
    const sty = C.styles.find((s) => s.id !== 'classic');
    await setCoins(sty.price); await openHome('build');
    r = await click(/^Mua · /, sty.name);
    cases.push(['Mua kiểu nhà "' + sty.name + '" ' + sty.price + ' xu', r && await waitPy(`result = "${sty.id}" in st.load()["home"]["styles"]`)]);
    for (const [name, okk] of cases) {
      const c = await coins();
      ok(okk && c === 0, 'Vừa đủ xu → ' + name + ' · còn ' + c + ' xu');
      if (!okk) break;
    }
    await shot('02_vua_du_xu', 'mua bằng đúng số xu đang có');
    await closeHome();
  });

  // ---------------------------------------------------------------------------------------------------------------
  await phase('Bấm đúp / bấm lại liền tay vào nút trả xu: chỉ trả một lần', async () => {
    await py(KB + PREP + `prep(coins=100000, house=0, zones=0)
${ITEM_CODE}
d = st.load(); d["craft"] = core._clean_craft(None); st.save(d)
st.craft_save({"name": "Táo", "size": 16, "kind": "ground", "fx": "none", "px": spr})
d = st.load(); d["coins"] = 100000; st.save(d)
kb._dialog.refresh(); result = 1`);
    await sleep(1000); await hideToast();
    const tests = [];
    // Xây
    await openHome('build', 'yard');
    let c0 = await coins(), h0 = await py(KB + 'result = st.load()["home"]["house"]');
    await dblAt(BTN(/^Xây$/)); await sleep(1800);
    let c1 = await coins(), h1 = await py(KB + 'result = st.load()["home"]["house"]');
    tests.push(['Bấm đúp "Xây"', h1 - h0, c0 - c1, C.levels[h0 + 1].price]);
    // hai lần bấm riêng (cách 0,35 giây, sau khi Python đã trả lời lần đầu) là hai lần bấm có chủ ý: xây hai bước, mỗi bước đúng giá
    c0 = c1; h0 = h1;
    await twiceAt(BTN(/^Xây$/)); await sleep(1800);
    c1 = await coins(); h1 = await py(KB + 'result = st.load()["home"]["house"]');
    ok(h1 - h0 === 2 && c0 - c1 === C.levels[h0 + 1].price + C.levels[h0 + 2].price,
      'Bấm "Xây" hai lần riêng (cách 0,35 giây): xây ' + (h1 - h0) + ' bước, trả ' + (c0 - c1) + ' xu (= ' + C.levels[h0 + 1].price + ' + ' + C.levels[h0 + 2].price + ')');
    // Mua đồ sân (đồ có nhiều cái được)
    const it = C.items.filter((i) => i.scene === 'yard' && !i.rare && !i.only && !i.zone && !i.season && !i.custom && (i.max || 99) > 1)[0];
    await openHome('yard');
    c0 = await coins(); let o0 = await py(KB + `result = st.load()["home"]["owned"].get("${it.id}", 0)`);
    await dblAt(BTN(/^Mua$/, it.name)); await sleep(1800);
    await escPlacing();
    c1 = await coins(); let o1 = await py(KB + `result = st.load()["home"]["owned"].get("${it.id}", 0)`);
    tests.push(['Bấm đúp "Mua" ' + it.name, o1 - o0, c0 - c1, it.price]);
    // +1 cái
    await openHome('craft');
    c0 = await coins(); o0 = await py(KB + 'd = st.load(); result = d["home"]["owned"].get(list(d["craft"]["items"])[0], 0)');
    await dblAt(BTN(/^\+1 cái/)); await sleep(1800);
    c1 = await coins(); o1 = await py(KB + 'd = st.load(); result = d["home"]["owned"].get(list(d["craft"]["items"])[0], 0)');
    tests.push(['Bấm đúp "+1 cái"', o1 - o0, c0 - c1, 100]);
    // Làm món từ mã
    const code = await py(KB + 'd = st.load(); result = st.share_code(list(d["craft"]["items"])[0])[0]');
    await openHome('craft');
    await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = ${JSON.stringify(code)}; t.dispatchEvent(new Event("input")); return 1;`);
    await click(/^Xem trước$/); await waitFor('!!document.querySelector("#kb-h-list .kb-h-peek")'); await sleep(400);
    c0 = await coins(); o0 = await py(KB + 'result = len(st.load()["craft"]["items"])');
    await dblAt(BTN(/^Làm món này/)); await sleep(2000);
    await escPlacing();
    c1 = await coins(); o1 = await py(KB + 'result = len(st.load()["craft"]["items"])');
    const mt = await tip();
    tests.push(['Bấm đúp "Làm món này" (mã chia sẻ)', o1 - o0, c0 - c1, 200, o1 - o0 !== 1 ? 'gợi ý: ' + mt : '']);
    // Mở khoá vùng
    await openHome('zone');
    c0 = await coins(); o0 = await py(KB + 'result = len(st.load()["home"]["zones"])');
    await dblAt(BTN(/^Mở khoá$/, C.zones[0].name)); await sleep(1800);
    c1 = await coins(); o1 = await py(KB + 'result = len(st.load()["home"]["zones"])');
    const zt = await tip();
    tests.push(['Bấm đúp "Mở khoá" vùng', o1 - o0, c0 - c1, C.zones[0].price, /đã mở rồi|lần lượt/.test(zt) ? 'báo lỗi thừa: ' + zt : '']);
    // Sửa nhà 1 nấc
    await py(KB + `d = st.load(); d["home"]["house"] = 7; d["more"]["repair"]["day"] = int(mw.col.sched.today) - 30; d["more"]["repair"]["back"] = None; st.save(d); kb._dialog.refresh(); result = 1`);
    await sleep(900); await openHome('build');
    const one = await py(KB + 'result = st.load()["more_view"]["wear"]["cost_one"]');
    c0 = await coins(); o0 = await py(KB + 'result = st.load()["more_view"]["wear"]["level"]');
    await dblAt(BTN(/^(Cạo rêu|Sơn lại|Lợp lại|Chống dột)/)); await sleep(1800);
    c1 = await coins(); o1 = await py(KB + 'result = st.load()["more_view"]["wear"]["level"]');
    tests.push(['Bấm đúp "Sửa 1 nấc"', o0 - o1, c0 - c1, one]);
    // Chế tác trong Xưởng
    await openHome('craft');
    await click(/^Mở xưởng$/, 'Tạo món đồ mới'); await sleep(500);
    await stroke([[2, 2], [3, 2], [4, 2]]);
    c0 = await coins(); o0 = await py(KB + 'result = len(st.load()["craft"]["items"])');
    await dblAt('document.getElementById("kb-cf-save")'); await sleep(1800);
    await escPlacing();
    c1 = await coins(); o1 = await py(KB + 'result = len(st.load()["craft"]["items"])');
    tests.push(['Bấm đúp "Chế tác"', o1 - o0, c0 - c1, 200]);
    // Nhận nuôi
    await openHome('pet');
    const pet = C.more.pets[1];
    c0 = await coins();
    await dblAt(BTN(/^Nhận nuôi/, pet.name)); await sleep(1800);
    c1 = await coins();
    const pt = await tip();
    tests.push(['Bấm đúp "Nhận nuôi"', 1, c0 - c1, pet.price, /đã nuôi/.test(pt) ? 'báo lỗi thừa: ' + pt : '']);
    for (const [name, got, paid, price, extra] of tests) {
      ok(got === 1 && paid === price && !extra, name + ': được ' + got + ' lần, trả ' + paid + ' xu (giá ' + price + ')' + (extra ? ' · ' + extra : ''));
    }
    await shot('03_bam_dup', 'sau khi bấm đúp các nút trả xu');
    await closeHome();
  });

  // ---------------------------------------------------------------------------------------------------------------
  await phase('Chạm giới hạn: 60 món, 6 vùng tự tạo, 12 giống tự vẽ, 12 luật tag, món chỉ một cái', async () => {
    await py(KB + PREP + `prep(coins=10000000, house=7, zones=6, seeds=("ine", "sakura"))
${ITEM_CODE}
d = st.load(); d["craft"] = core._clean_craft(None); st.save(d)
for i in range(60):
    st.craft_save({"name": "Món %d" % (i + 1), "size": 16, "kind": "ground", "fx": "none", "px": spr})
lm = kb.more_core.px_encode("." * (64 * 70) + "B" * (64 * 6))
for i in range(6):
    st.zone_save({"name": "Vùng %d" % (i + 1), "bg": "meadow", "ground": "#5ed35e", "hills": "#7ed98a", "px": lm, "env": ""})
seed = core.px_encode("." * 200 + "g" * 16 + "k" * 40)
for i in range(12):
    st.myseed_save({"name": "Giống %d" % (i + 1), "st": [seed, seed, seed, "", ""]})
kb._dialog.refresh(); result = 1`);
    await sleep(1500); await hideToast();
    await openHome('craft', 'yard');
    const mk = await btnInfo(/^(Mở xưởng|Còn thiếu|Thiếu)/, 'Tạo món đồ mới');
    ok(mk && mk.disabled, '60 món: nút tạo món mới bị khoá (' + (mk && (mk.title || mk.text)) + ')');
    const sk = await btnInfo(/^(Mở xưởng|Còn thiếu|Thiếu|Đã đủ)/, 'Tự vẽ giống cây');
    ok(sk && sk.disabled, '12 giống: nút "Tự vẽ giống cây" ở tab Xưởng bị khoá (' + (sk && (sk.title || sk.text)) + ')');
    const codes = await py(KB + `d = st.load()
result = [st.share_code(list(d["craft"]["items"])[0])[0], st.share_code(d["more"]["zones"][0]["id"])[0], st.share_code(list(d["more"]["myseeds"]["items"])[0])[0]]`);
    const full = [];
    for (const [i, c] of codes.entries()) {
      await openHome('craft');
      await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = ${JSON.stringify(c)}; t.dispatchEvent(new Event("input")); return 1;`);
      await click(/^Xem trước$/); await waitFor('!!document.querySelector("#kb-h-list .kb-h-peek")'); await sleep(400);
      const b = await js('const b = document.querySelector("#kb-h-list .kb-h-peek button"); return b ? { t: b.textContent, d: b.disabled } : null;');
      full.push(b);
      if (i === 1) await shot('04_gioi_han_dan_ma_vung', '6 vùng tự tạo rồi, dán mã vùng');
    }
    ok(full.every((b) => b && b.d && /đủ|Đã có/.test(b.t)), 'Dán mã khi đã đủ (món / vùng / giống): nút làm bị khoá, ghi lý do — ' + full.map((b) => b && b.t).join(' | '));
    // gửi thẳng lệnh làm từ mã khi đã đủ → Python từ chối, không trừ xu
    const c0 = await coins();
    for (const c of codes) { await js(`pycmd(${JSON.stringify('share:make:' + c)}); return 1;`); await sleep(500); }
    const c1 = await coins();
    const n = await py(KB + 'd = st.load(); result = [len(d["craft"]["items"]), len(d["more"]["zones"]), len(d["more"]["myseeds"]["items"])]');
    ok(c0 === c1 && JSON.stringify(n) === '[60,6,12]', 'Gửi thẳng lệnh làm từ mã khi đã đủ: không làm thêm, không trừ xu (' + JSON.stringify(n) + ')');
    await openHome('zone');
    const addZ = await js('return Array.from(document.querySelectorAll("#kb-h-list .kb-h-name")).some((x) => x.textContent === "Tạo vùng mới");');
    ok(!addZ, '6 vùng tự tạo: không còn thẻ "Tạo vùng mới"');
    await shot('04_gioi_han_vung', '6 vùng tự tạo');
    await openHome('seed');
    // 12 luật tag (tính chung giống mua + giống tự vẽ) → luật thứ 13 báo lỗi
    for (let i = 1; i <= 13; i++) {
      await typeInto('#kb-h-list .kb-h-rule input.kb-h-input', 'tag' + i);
      await click(/^Thêm luật tag$/); await sleep(450);
    }
    const nTags = await py(KB + 'd = st.load(); result = len(d["more"]["seeds"]["tag"]) + len(d["more"]["myseeds"]["rules"]["tag"])');
    const t = await tip();
    ok(nTags === 12 && /Tối đa 12/.test(t), 'Luật tag thứ 13: báo "' + t.slice(0, 40) + '", vẫn 12 luật (' + nTags + ')');
    await shot('04_gioi_han_12_tag', '12 luật tag');
    // món chỉ có một cái
    const uniq = C.items.find((i) => i.max === 1 && i.scene === 'yard' && !i.rare && !i.only && !i.zone && !i.season);
    if (uniq) {
      await py(KB + `d = st.load(); d["home"]["owned"]["${uniq.id}"] = 1; st.save(d); kb._dialog.refresh(); result = 1`); await sleep(800);
      await openHome('yard');
      const b = await btnInfo(/^(Mua|Đã có)$/, uniq.name);
      ok(b && b.disabled && b.text === 'Đã có', 'Món chỉ một cái "' + uniq.name + '" đã mua: nút "Đã có" bị khoá');
    }
    // sân kín chỗ (mọi ô có hàng rào) → mua thêm: báo hết chỗ, món nằm trong kho (trước 1.22.5: "bấm vào ô trống (xanh)")
    const nCells = await py(KB + `d = st.load(); h = d["home"]; h["yard"] = []
for y in range(core.YARD_ROWS):
    for x in range(core.HOUSE_COLS, core.YARD_COLS):
        h["yard"].append({"id": "fence", "x": x, "y": y})
h["owned"]["fence"] = len(h["yard"]); st.save(d); kb._dialog.refresh(); result = len(h["yard"])`);
    await sleep(900);
    await openHome('yard', 'yard');
    const o0 = await py(KB + 'result = st.load()["home"]["owned"]["fence"]');
    await click(/^Mua$/, 'Hàng rào gỗ');
    await waitPy(`result = st.load()["home"]["owned"]["fence"] > ${o0}`); await sleep(500);
    const fullTip = await tip();
    ok(/hết chỗ/.test(fullTip) && /Kho đồ/.test(fullTip), 'Sân kín chỗ (' + nCells + ' ô) mà mua thêm: "' + fullTip.slice(0, 70) + '…"');
    await shot('04_san_kin_cho', 'mua thêm khi sân kín chỗ');
    await escPlacing();
    await closeHome();
  });

  // ---------------------------------------------------------------------------------------------------------------
  await phase('Xoá khi đang dùng: món đang đặt, vùng đang hiện ở màn chính, giống đang gieo', async () => {
    await py(KB + PREP + `prep(coins=100000, house=7, zones=0, pets=("neko",))
${ITEM_CODE}
d = st.load(); d["craft"] = core._clean_craft(None); d["more"]["zones"] = []; d["home"]["uzones"] = []; d["more"]["myseeds"] = kb.share_core.empty_myseeds(); st.save(d)
st.craft_save({"name": "Táo", "size": 16, "kind": "ground", "fx": "none", "px": spr})
cid = list(st.load()["craft"]["items"])[0]
st.place("yard", cid, 6, 1)
lm = kb.more_core.px_encode("." * (64 * 70) + "B" * (64 * 6))
z = st.zone_save({"name": "Vườn tre", "bg": "forest", "ground": "#5ed35e", "hills": "#7ed98a", "px": lm, "env": ""})["zone_id"]
d = st.load(); d["home"]["owned"]["bench"] = d["home"]["owned"].get("bench", 0) + 1; st.save(d)
st.place(z, "bench", 6, 2)
st.pet_move("neko", z)
seed = core.px_encode("." * 200 + "g" * 16 + "k" * 40)
g = st.myseed_save({"name": "Cây xanh", "st": [seed, seed, seed, "", ""]})["myseed_id"]
st.seed_rule("deck", str(kb._dialog.deck_id), g)
kb._dialog.refresh(); result = [cid, z, g]`);
    await sleep(1500); await hideToast();
    // món đang đặt: nút xoá khoá; gửi thẳng lệnh xoá → báo lỗi, món còn
    await openHome('craft', 'yard');
    const del = await btnInfo(/^Xoá mẫu$/, 'Táo');
    ok(del && del.disabled && /Cất hết/.test(del.title), 'Món đang đặt ngoài sân: nút "Xoá mẫu" khoá, chú thích "' + (del && del.title) + '"');
    const cid = await py(KB + 'result = list(st.load()["craft"]["items"])[0]');
    await js(`pycmd("home:craft:del:${cid}"); return 1;`); await sleep(700);
    ok(await py(KB + `result = "${cid}" in st.load()["craft"]["items"]`), 'Gửi thẳng lệnh xoá món đang đặt: Python từ chối, món còn nguyên');
    await closeHome();
    // vùng tự tạo đang hiện ở màn chính (có ghế + mèo) → xoá
    const z = await py(KB + 'result = st.load()["more"]["zones"][0]["id"]');
    await js(`try { localStorage.setItem("kb-main-scene", "${z}"); } catch (e) {} Garden._rerender ? Garden._rerender() : 0; return 1;`);
    await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1200);
    const onZ = await js('return GardenHome.mainScene();');
    await shot('05_vung_tu_tao_man_chinh', 'màn chính đang ở vùng tự tạo, có ghế + mèo');
    await openHome('zone');
    await click(/^Xoá vùng$/); await sleep(300);
    await click(/^Bấm lần nữa/); await sleep(1500);
    const st2 = await py(KB + `d = st.load(); result = [len(d["more"]["zones"]), d["more"]["pets"]["neko"]["scene"], d["home"]["owned"].get("bench", 0), sum(1 for s in kb.core.scene_names(d["home"]) for e in d["home"].get(s, []) if e["id"] == "bench")]`);
    await closeHome(); await sleep(600);
    const mainAfter = await js('return GardenHome.mainScene();');
    const yardName = await js('const n = document.getElementById("kb-yard-name"); return n ? n.textContent : "";');
    ok(onZ === z && st2[0] === 0 && st2[1] === 'yard' && st2[2] >= 1 && st2[3] === 0 && mainAfter === 'yard',
      'Xoá vùng đang hiện: màn chính về sân nhà ("' + yardName + '"), mèo về sân, ghế về kho (' + JSON.stringify(st2) + ')');
    await shot('05_sau_xoa_vung', 'màn chính sau khi xoá vùng');
    // giống tự vẽ đang gieo cho deck → xoá → cây về cây gốc
    const g = await py(KB + 'result = list(st.load()["more"]["myseeds"]["items"])[0]');
    const withG = await js(`return Garden._data().plants.filter((p) => p.v === "${g}").length;`);
    await openHome('seed');
    await click(/^Xoá giống$/); await sleep(300);
    await click(/^Bấm lần nữa/); await sleep(1800);
    const left = await js(`return Garden._data().plants.filter((p) => p.v === "${g}").length;`);
    const rules = await py(KB + 'result = st.load()["more"]["myseeds"]["rules"]["deck"]');
    ok(withG > 0 && left === 0 && !Object.keys(rules).length, 'Xoá giống đang gieo: ' + withG + ' cây → 0 cây mang giống, luật deck bị bỏ');
    await closeHome();
  });

  // ---------------------------------------------------------------------------------------------------------------
  await phase('Mã chia sẻ: dán sai, quá dài, đổi chữ sau khi xem trước', async () => {
    await py(KB + PREP + `prep(coins=100000, house=7, zones=0)
${ITEM_CODE}
d = st.load(); d["craft"] = core._clean_craft(None); d["more"]["zones"] = []; d["home"]["uzones"] = []; st.save(d)
st.craft_save({"name": "Táo", "size": 16, "kind": "ground", "fx": "none", "px": spr})
d = st.load(); d["coins"] = 100000; st.save(d)
kb._dialog.refresh(); result = 1`);
    await sleep(1200); await hideToast();
    const item = await py(KB + 'd = st.load(); result = st.share_code(list(d["craft"]["items"])[0])[0]');
    const zone = await py(KB + `lm = kb.more_core.px_encode("." * (64 * 70) + "B" * (64 * 6))
result = kb.share_core.code_zone({"name": "Vùng B", "bg": "meadow", "ground": "#5ed35e", "hills": "#7ed98a", "lm": lm, "env": ""})`);
    const bad1 = item.slice(0, 20) + (item[20] === 'A' ? 'B' : 'A') + item.slice(21);
    const cases = [['', /Dán mã/], ['xin chào', /không phải mã/], ['KB2:m:16:abc:def:00000000', /mới hơn/], [bad1, /sai một chỗ|chép lại/],
      ['KB1:' + 'A'.repeat(450000), /dài quá/], [item.match(/.{1,30}/g).join('\n '), null]];
    await openHome('craft', 'yard');
    for (const [txt, want] of cases) {
      await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = ${JSON.stringify(txt)}; t.dispatchEvent(new Event("input")); return 1;`);
      await click(/^Xem trước$/); await sleep(700);
      const r = await js('const w = document.querySelector("#kb-h-list .kb-h-paste .kb-h-warn"); const p = document.querySelector("#kb-h-list .kb-h-peek"); return { warn: w ? w.textContent : "", peek: !!p };');
      const label = txt.length > 40 ? txt.slice(0, 18) + '… (' + txt.length + ' ký tự)' : JSON.stringify(txt);
      if (want) ok(want.test(r.warn) && !r.peek, 'Dán ' + label + ' → "' + r.warn.slice(0, 60) + '"');
      else ok(r.peek && !r.warn, 'Dán mã bị xuống dòng + dấu cách → xem trước được');
    }
    await shot('06_ma_chia_se_loi', 'mã sai một ký tự');
    // xem trước mã món (200 xu), rồi dán đè mã vùng (5.000 xu) mà không bấm Xem trước lại → bấm nút làm
    await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = ${JSON.stringify(item)}; t.dispatchEvent(new Event("input")); return 1;`);
    await click(/^Xem trước$/); await waitFor('!!document.querySelector("#kb-h-list .kb-h-peek")'); await sleep(400);
    const label = await js('const b = document.querySelector("#kb-h-list .kb-h-peek button"); return b ? b.textContent : "";');
    await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.focus(); t.value = ${JSON.stringify(zone)}; t.dispatchEvent(new Event("input")); return 1;`);
    await sleep(300);
    await shot('06_doi_ma_sau_xem_truoc', 'xem trước mã món rồi dán đè mã vùng');
    const c0 = await coins(), z0 = await py(KB + 'result = len(st.load()["more"]["zones"])'), m0 = await py(KB + 'result = len(st.load()["craft"]["items"])');
    const b = await js('const b = document.querySelector("#kb-h-list .kb-h-peek button"); if (!b || b.disabled) return b ? "khoá" : "không còn nút"; b.click(); return b.textContent;');
    await sleep(1800);
    await escPlacing();
    const c1 = await coins(), z1 = await py(KB + 'result = len(st.load()["more"]["zones"])'), m1 = await py(KB + 'result = len(st.load()["craft"]["items"])');
    ok(z1 === z0 && (c0 - c1 === 0 || (c0 - c1 === 200 && m1 === m0 + 1)),
      'Xem trước "' + label + '", đổi chữ sang mã vùng rồi bấm "' + b + '": trả ' + (c0 - c1) + ' xu, vùng ' + z0 + '→' + z1 + ', món ' + m0 + '→' + m1 + ' (không được trả 5.000 xu cho vùng chưa xem)');
    await closeHome();
  });

  // ---------------------------------------------------------------------------------------------------------------
  await phase('Deck lạ: deck trống, deck bị xoá khi vườn mở, tên rất dài, deck lọc', async () => {
    // deck trống
    await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("Default"); d.refresh(); result = 1'); await sleep(1500); await hideToast();
    const empty = await js('return { plants: Garden._data().plants.length, text: document.body.innerText.slice(0, 2000) };');
    await shot('07_deck_trong', 'deck Default trống');
    ok(empty.plants === 0, 'Deck trống: 0 cây, vườn vẫn mở');
    await js('document.getElementById("kb-review").click(); return 1;'); await sleep(1500);
    const done = await js('const d = document.getElementById("kb-done"); return d && !d.hidden ? d.textContent.trim().slice(0, 80) : "";');
    ok(!!done, 'Deck trống → Tưới ngay: màn "hết thẻ" hiện ("' + done + '")');
    await shot('07_deck_trong_tuoi_ngay');
    await js('const s = document.getElementById("kb-stop"); if (s && !document.getElementById("kb-panel").hidden) s.click(); return 1;'); await sleep(500);
    // tên deck rất dài + deck sẽ bị xoá khi vườn đang mở
    const long = 'Tiếng Nhật::Giáo trình GUNGUN N4::Chương 29 kính ngữ させていただけませんか お〜になる お〜ください::Từ vựng bổ sung rất dài';
    const did = await py(KB + `col = mw.col
did = col.decks.id(${JSON.stringify(long)})
src = col.find_notes('deck:"A::Có câu ví dụ + audio"')[:6]
cids = [c for n in src for c in col.get_note(n).card_ids()]
col.set_deck(cids, did)
d = kb._dialog; d.deck_id = did; d.refresh(); result = did`);
    await sleep(1800); await hideToast();
    await shot('07_ten_deck_dai', 'tên deck 120 ký tự');
    const r1 = await page.eval(MEASURE);
    ok(!r1.hscroll, 'Tên deck rất dài: thanh trên không tràn ngang');
    await py(KB + `col = mw.col
src = col.find_cards('deck:"${long.replace(/"/g, '\\"')}"')
col.set_deck(src, col.decks.id_for_name("A::Có câu ví dụ + audio"))
col.decks.remove([${did}])
kb._dialog.refresh(); result = 1`);
    await sleep(1800);
    const after = await js('return { deck: Garden._data().deck, n: Garden._data().plants.length };');
    const errs = await py(KB + 'result = len(kb.ERRORS.entries())');
    ok(after.deck && errs === 0, 'Deck đang xem bị xoá khi vườn mở → làm mới không lỗi, vườn đổi sang "' + (after.deck && after.deck.name) + '" (' + after.n + ' cây)');
    await shot('07_deck_bi_xoa', 'deck đang xem vừa bị xoá');
    // deck lọc
    const fid = await py(KB + `col = mw.col
fid = col.decks.new_filtered("Lọc · ôn lại")
dk = col.decks.get(fid); dk["terms"] = [['deck:"A::Có câu ví dụ + audio"', 20, 0]]; col.decks.save(dk); col.sched.rebuild_filtered_deck(fid)
d = kb._dialog; d.deck_id = fid; d.refresh(); result = fid`);
    await sleep(1800); await hideToast();
    const fl = await js('return Garden._data().plants.length;');
    ok(fl > 0, 'Deck lọc: vườn có ' + fl + ' cây');
    await js('document.getElementById("kb-review").click(); return 1;');
    const showB = await waitFor('(() => { const b = document.getElementById("kb-show"); return b && b.offsetParent; })()', 6000);
    ok(!!showB, 'Deck lọc → Tưới ngay: có thẻ để ôn');
    await js('const s = document.getElementById("kb-stop"); if (s && !document.getElementById("kb-panel").hidden) s.click(); return 1;'); await sleep(500);
    await py(KB + `col = mw.col; col.sched.empty_filtered_deck(${fid}); col.decks.remove([${fid}]); d = kb._dialog; d.deck_id = col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1`);
    await sleep(1500);
  });

  // ---------------------------------------------------------------------------------------------------------------
  await phase('Xu rất nhiều, thú nuôi: tự cho ăn khi thiếu xu, tên có thẻ HTML / quá dài', async () => {
    await py(KB + PREP + `prep(coins=123456789, house=7, zones=0, pets=("neko", "shiba"))
kb._dialog.refresh(); result = 1`); await sleep(1200); await hideToast();
    const top = await js('return document.getElementById("kb-coins").textContent;');
    await shot('08_xu_rat_nhieu', '123.456.789 xu');
    await openHome('pet', 'yard');
    const hc = await js('return document.getElementById("kb-h-coins").textContent;');
    ok(/123/.test(top) && /123/.test(hc), 'Xu rất nhiều: thanh trên "' + top + '", Nhà "' + hc + '"');
    await shot('08_xu_rat_nhieu_nha');
    // tên thú có thẻ HTML / quá dài
    await typeInto('#kb-h-list .kb-h-petcard input.kb-h-input', '<img src=x onerror="window.__xss=1">Mèo béo của tớ nè');
    await page.key('Enter', 'Enter', 13); await sleep(900);
    const nm = await py(KB + 'result = st.load()["more"]["pets"]["neko"]["name"]');
    const xss = await js('return !!window.__xss || !!document.querySelector("#kb-h-list img");');
    ok(!xss && nm.length <= 12 && !/[<>]/.test(nm), 'Đặt tên thú có thẻ HTML + dài: lưu "' + nm + '" (≤ 12 ký tự, không chạy thẻ)');
    await closeHome();
    // tự cho ăn khi thiếu xu
    await py(KB + `d = st.load(); d["coins"] = 3; d["more"]["pet_auto"] = True
for p in d["more"]["pets"].values():
    p["fed"] = int(mw.col.sched.today) - 1
st.save(d); kb._dialog.refresh(); result = 1`);
    await sleep(1500);
    const af = await py(KB + 'd = st.load(); result = [d["coins"], [p["fed"] == int(mw.col.sched.today) for p in d["more"]["pets"].values()]]');
    ok(af[0] === 3 && af[1].every((x) => !x), 'Tự cho ăn khi chỉ có 3 xu (cần 7): không cho ăn, không trừ xu, xu không âm (' + JSON.stringify(af) + ')');
    const care = await js('const b = document.getElementById("kb-care-btn"); return b && !b.hidden ? b.textContent : "";');
    ok(/đói|ăn/i.test(care), 'Thẻ Hôm nay nhắc thú đói: "' + care + '"');
    await shot('08_thu_doi_thieu_xu', 'tự cho ăn bật nhưng thiếu xu');
  });

  // ---------------------------------------------------------------------------------------------------------------
  for (const [w, h] of [[720, 520], [1093, 560], [1920, 1080]]) {
    await phase('Cửa sổ ' + w + ' × ' + h + ': màn chính, Nhà, Xưởng, Trò chơi, Báo, Lịch hoa', async () => {
      sizeTag = w + 'x' + h;
      await py(KB + PREP + `prep(coins=50000, house=7, zones=6, pets=("neko",), seeds=("ine",))
${ITEM_CODE}
d = st.load(); d["craft"] = core._clean_craft(None); st.save(d)
st.craft_save({"name": "Táo", "size": 16, "kind": "ground", "fx": "none", "px": spr})
kb._dialog.resize(${w}, ${h}); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1`);
      await sleep(2000); await hideToast();
      const real = await js('return [innerWidth, innerHeight];');
      const flagged = [];
      const note = (name, r) => { if (r.m.hscroll || r.m.outside.length || r.errs.length) flagged.push(name + ': ' + r.flags); };
      note('vườn', await shot('09_vuon', 'cửa sổ thật ' + real.join('×')));
      for (const t of ['build', 'yard', 'zone', 'pet', 'seed', 'season', 'craft', 'inv']) {
        await openHome(t, 'yard');
        note('Nhà/' + t, await shot('09_nha_' + t));
        // bảng Nhà (gồm danh sách đồ) phải nằm trong cửa sổ — trang tự cuộn được nếu cửa sổ rất thấp; nút đầu tiên của danh sách
        // (nằm trọn trong khung danh sách) phải thấy được
        const fit = await js(`const r = document.getElementById("kb-home").getBoundingClientRect(), l = document.getElementById("kb-h-list").getBoundingClientRect();
          const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => { const q = x.getBoundingClientRect(); return x.offsetParent && q.top >= l.top && q.bottom <= l.bottom; });
          const br = b ? b.getBoundingClientRect() : null;
          return { top: Math.round(r.top), over: Math.round(r.bottom - innerHeight), right: Math.round(r.right - innerWidth), list: Math.round(Math.min(innerHeight, l.bottom) - l.top), btn: br ? Math.round(innerHeight - br.bottom) : 999 };`);
        if (fit.over > 2 || fit.right > 1 || fit.btn < 0 || fit.top < -2) flagged.push('Nhà/' + t + ': bảng Nhà vượt cửa sổ ' + fit.over + ' px (đầu bảng ' + fit.top + '), danh sách thấy ' + fit.list + ' px, nút đầu tiên ' + (fit.btn < 0 ? 'ngoài' : 'trong') + ' cửa sổ');
      }
      await openHome('craft');
      await js('window.scrollTo(0, document.documentElement.scrollHeight); return 1;');     // như lăn chuột xuống cuối trang
      await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new button")).find((x) => x.textContent === "Mở xưởng"); if (b) b.click(); return 1;');
      await sleep(600);
      note('Xưởng', await shot('09_xuong'));
      // nút "Chế tác" (thanh trên của Xưởng) phải thấy được ngay khi mở — kể cả khi trang đã bị cuộn xuống trước đó
      const sv = await js('const b = document.getElementById("kb-cf-save").getBoundingClientRect(); return b.top >= 0 && b.bottom <= innerHeight + 1 && b.right <= innerWidth + 1 && b.width > 0;');
      if (!sv) flagged.push('Xưởng: nút Chế tác ra ngoài cửa sổ');
      await closeHome();
      await js('document.getElementById("kb-games").click(); return 1;'); await sleep(700);
      note('Trò chơi', await shot('09_tro_choi'));
      await js('GardenGames.close(); return 1;');
      await js('GardenPaper.open("issue"); return 1;'); await sleep(1500);
      note('Báo', await shot('09_bao'));
      await js('GardenPaper.close(); return 1;');
      await js('GardenCal.open({ tab: "month" }); return 1;'); await sleep(1800);
      note('Lịch hoa', await shot('09_lich_hoa'));
      await js('GardenCal.close(); return 1;');
      await js('document.getElementById("kb-review").click(); return 1;'); await sleep(1500);
      note('Ôn thẻ', await shot('09_on_the'));
      const rv = await js('const b = document.getElementById("kb-show"); if (!b || !b.offsetParent) return true; const r = b.getBoundingClientRect(); return r.bottom <= innerHeight + 1;');
      if (!rv) flagged.push('Ôn thẻ: nút Lật thẻ ra ngoài cửa sổ');
      await js('const s = document.getElementById("kb-stop"); if (s && !document.getElementById("kb-panel").hidden) s.click(); return 1;'); await sleep(400);
      ok(!flagged.length, w + ' × ' + h + ' (trang ' + real.join('×') + '): không tràn ngang / ra ngoài khung / lỗi JS' + (flagged.length ? ' — ' + flagged.join(' | ') : ''));
    });
  }
  sizeTag = '1366';

  const errs = await py(KB + 'result = kb.ERRORS.entries()');
  ok(!errs || !errs.length, 'Nhật ký lỗi add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 400) : ''));
  report.push({ name: 'errors.json', addon_errors: errs });
  fs.writeFileSync(SHOTS + '/audit_edge.json', JSON.stringify(report, null, 1));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length + ' đạt');
  if (fails.length) { console.log('Chưa đạt:'); fails.forEach((f) => console.log('  - ' + f)); }
  page.close(); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
