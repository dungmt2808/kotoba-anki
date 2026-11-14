// 1.30.3 trong Anki thật — kiểm tra "ngoài kịch bản có sẵn" (người dùng 14/11: "test kỹ hơn ngoài các kịch bản và bộ test có sẵn"):
//   1. Độ tương phản chữ (WCAG) ở 9 màn — màn chính ngày / đêm, ⚙, Nhà (3 tab), Trò chơi, Báo, Lịch hoa, Giao diện, hộp hỏi:
//      mọi chữ đang hiện ≥ 4,5:1 (chữ ≥ 18 px hoặc đậm ≥ 14 px: ≥ 3:1) so với nền thật phía sau (trộn các lớp nền bán trong suốt).
//      Bảng màu ấm 1.30.3 (mực nâu cacao, chữ phụ nâu) không được làm chữ khó đọc.
//   2. Bong bóng lời linh vật không đè lên tên vườn / chip giao diện mùa / ô Deck (1.30.2 đè lên chip) ở 1366 / 1024 / 720 px.
//   3. Vườn để mở qua ngày mới của Anki: Python dựng lại vườn đúng một lần (đồng hồ 60 giây + khi mở lại cửa sổ đang mở),
//      không dựng lại khi ngày chưa đổi; trang chào ngày mới khi đang ở màn chính, không chào đè lên bảng đang mở.
//   4. Bấm phím bừa: 500 phím (N T B Q L R, số, Space, Enter, mũi tên, Tab, chữ thường; Esc chỉ khi có bảng / hộp đang mở) →
//      không lỗi JS / Python, không quá một bảng cùng mở, xu không âm, cửa sổ vườn còn mở, Esc đưa về màn chính.
//   5. Bấm chuột bừa: 300 lần bấm ngẫu nhiên khắp cửa sổ (bỏ nút mở hộp thoại của Qt: lưu file, Báo lỗi, email, biểu tượng,
//      chụp ảnh, xuất PDF, chọn ảnh, mở trang web) → không lỗi, xu không âm, mọi lần trừ xu đều qua hộp hỏi.
//   6. Đổi cỡ cửa sổ liên tục (24 cỡ 720 × 520 → 2560 × 1440, có bảng đang mở): không thanh cuộn ngang, hàng dưới cảnh ≤ 2 dòng,
//      thẻ Hôm nay nằm trong dải cảnh, ruộng vẽ đủ bề ngang.
//   7. Cửa sổ rất lớn 2560 × 1440 và rất nhỏ 720 × 520: không tràn ngang, ảnh chụp.
// Chạy: KB_SCRIPTS=e2e_1303.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1303';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const SEED = Number(process.env.KB_SEED || 1303);
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
const coins = () => py(KB + 'result = st.load()["coins"]');
async function reopen(before, w, h) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await size(w || 1366, h || 768);
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data()', 8000);
  await sleep(600);
}
async function size(w, h) { await py(KB + `kb._dialog.showNormal(); kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(700); }
async function shot(name) { await page.shot(SHOTS + '/1303_' + name + '.png'); }
// số ngẫu nhiên có hạt (chạy lại ra đúng chuỗi thao tác)
let rs = SEED >>> 0;
function rnd() { rs = (Math.imul(rs ^ (rs >>> 15), 2246822507) + 0x9e3779b9) >>> 0; rs ^= rs >>> 13; return (rs >>> 0) / 4294967296; }
const pickOne = (a) => a[Math.floor(rnd() * a.length)];

// ---- 1. độ tương phản chữ: chạy trong trang, trả danh sách chữ dưới ngưỡng ----
const CONTRAST = `
  const parse = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(",").map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  function bgOf(el) {
    const layers = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e), c = parse(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== "none" && /url\\(/.test(cs.backgroundImage)) return null;   // ảnh nền: bỏ qua
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
    }
    let out = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return out;
  }
  const bad = [], seen = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let n, checked = 0;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    if (el.closest("canvas, iframe, script, style, option, select, [hidden], .kb-ask[hidden]")) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    let op = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { op *= Number(getComputedStyle(e).opacity); } if (op < 0.95) continue;   // nút bị khoá / mờ cố ý
    if (el.closest(":disabled") || el.closest(".is-wait")) continue;
    // ở dưới lớp phủ (hộp hỏi, màn chào): chỉ xét chữ trên cùng
    const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    if (top && top !== el && !el.contains(top) && !top.contains(el)) continue;
    const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
    if (cs.textShadow && cs.textShadow !== "none" && /px/.test(cs.textShadow) && (cs.textShadow.match(/px/g) || []).length >= 6) continue;   // chữ có viền (tên vườn, điểm)
    const f = fg[3] < 1 ? over(fg, bg) : fg;
    const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 600;
    const need = px >= 18 || (bold && px >= 14) ? 3 : 4.5;
    checked++;
    if (ratio < need - 0.05) bad.push({ t: t.slice(0, 40), ratio: Math.round(ratio * 100) / 100, need, px, fg: cs.color, bg: "rgb(" + bg.slice(0, 3).map(Math.round).join(",") + ")", cls: el.className && String(el.className).slice(0, 40) });
  }
  return { checked, bad };`;

async function contrast(name) {
  const r = await js(CONTRAST);
  const worst = r.bad.slice().sort((a, b) => a.ratio - b.ratio).slice(0, 4).map((b) => '"' + b.t + '" ' + b.ratio + '<' + b.need + ' ' + b.fg + ' / ' + b.bg + ' .' + b.cls);
  ok(r.checked > 3 && r.bad.length === 0, name + ': ' + r.checked + ' chữ, dưới ngưỡng ' + r.bad.length + (worst.length ? ' — ' + worst.join(' | ') : ''));
  return r;
}

const panelCount = () => js(`return ["kb-panel", "kb-game", "kb-home", "kb-paper", "kb-cal", "kb-ui", "kb-fields"].filter((id) => { const e = document.getElementById(id); return e && !e.hidden; }).length;`);
// (bảng nổi position: fixed có offsetParent = null → xét getClientRects)
const anyOpen = () => js(`const p = ["kb-panel", "kb-game", "kb-home", "kb-paper", "kb-cal", "kb-ui", "kb-fields", "kb-ask", "kb-greet", "kb-quest-pop", "kb-sound-pop", "kb-news-pop", "kb-deck-pop", "kb-snap-pop", "kb-pin", "kb-tour"].some((id) => { const e = document.getElementById(id); return e && !e.hidden && e.getClientRects().length > 0; }); return p || !!document.querySelector(".kb-life-card:not([hidden]), .kb-find-card:not([hidden])");`);
const KEYS = {
  n: ['n', 'KeyN', 78], t: ['t', 'KeyT', 84], b: ['b', 'KeyB', 66], q: ['q', 'KeyQ', 81], l: ['l', 'KeyL', 76], r: ['r', 'KeyR', 82],
  1: ['1', 'Digit1', 49], 2: ['2', 'Digit2', 50], 3: ['3', 'Digit3', 51], 4: ['4', 'Digit4', 52], 5: ['5', 'Digit5', 53],
  sp: [' ', 'Space', 32], en: ['Enter', 'Enter', 13], le: ['ArrowLeft', 'ArrowLeft', 37], ri: ['ArrowRight', 'ArrowRight', 39],
  tab: ['Tab', 'Tab', 9], a: ['a', 'KeyA', 65], k: ['k', 'KeyK', 75], esc: ['Escape', 'Escape', 27], sl: ['/', 'Slash', 191],
};
async function press(k) {
  const [key, code, vk] = KEYS[k];
  const text = key.length === 1 ? key : (key === 'Enter' ? '\r' : undefined);
  await page.send('Input.dispatchKeyEvent', { type: text ? 'keyDown' : 'rawKeyDown', key, code, windowsVirtualKeyCode: vk, text });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key, code, windowsVirtualKeyCode: vk });
}
async function escAll() {
  for (let i = 0; i < 12 && await anyOpen(); i++) { await press('esc'); await sleep(350); }
  await js('document.body.click(); return 1;').catch(() => 0);
}
async function alive() { return py(KB + 'result = kb._dialog is not None and kb._dialog.isVisible()'); }

(async () => {
  // ví đủ xu, đã xây nhà, có thú, vùng — để có nhiều thứ để bấm
  await py(KB + `
d = st.load(); d["coins"] = 50000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
try:
    st.unlock_zone("beach")
except Exception:
    pass
for iid, x, y in (("bench", 6, 1), ("flowers", 4, 1), ("lantern", 7, 2)):
    try:
        st.buy(iid); st.place("yard", iid, x, y)
    except Exception:
        pass
try:
    st.pet_buy("neko")
except Exception:
    pass
result = 1`);
  await reopen('kb.ASK_TEST_OFF = False\nkb.LIFE_TEST_OFF = False\nkb.GREET_TEST_OFF = True\nkb.TOUR_TEST_OFF = True', 1366, 768);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); return 1;');
  await sleep(1200);

  console.log('== 1. độ tương phản chữ');
  await contrast('màn chính ban ngày');
  await js('document.getElementById("kb-sound").click(); return 1;'); await sleep(400);
  await contrast('bảng ⚙');
  await js('document.body.click(); return 1;'); await sleep(300);
  await js('document.getElementById("kb-house").click(); return 1;'); await sleep(1000);
  for (const tab of ['build', 'room', 'pet']) {
    await js(`document.querySelector("#kb-home .kb-h-tab[data-tab=${tab}]").click(); return 1;`); await sleep(600);
    await contrast('Nhà → ' + tab);
  }
  await js(`const b = Array.from(document.querySelectorAll("#kb-h-list button")).find(x => /^Mua/.test(x.textContent) && !x.disabled); if (b) b.click(); return !!b;`); await sleep(700);
  await contrast('hộp hỏi trước khi trả xu');
  await press('esc'); await sleep(300);
  await js('document.getElementById("kb-h-exit").click(); return 1;'); await sleep(700);
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await contrast('Trò chơi');
  await js('document.getElementById("kb-g-exit").click(); return 1;'); await sleep(600);
  await js('GardenPaper.open(); return 1;'); await sleep(1200);
  await contrast('Báo');
  await escAll();
  await js('GardenCal.open(); return 1;'); await sleep(1200);
  await contrast('Lịch hoa');
  await escAll();
  await js('document.getElementById("kb-sound").click(); document.getElementById("kb-ui-open").click(); return 1;'); await sleep(800);
  await contrast('Giao diện & chế độ học');
  await escAll();
  await js('GardenSky.set("fixedHour", 22); return 1;'); await sleep(1500);
  await contrast('màn chính ban đêm');
  await js('GardenSky.set("fixedHour", 10); return 1;'); await sleep(600);

  console.log('== 2. bong bóng lời linh vật');
  for (const [w, h] of [[1366, 768], [1024, 700], [720, 520]]) {
    await size(w, h);
    await js('GardenFX.say ? GardenFX.say("Hôm nay học gì nè? がんばって！", 4000) : document.getElementById("kb-mascot").click(); return 1;'); await sleep(450);
    const hit = await js(`const b = document.getElementById("kb-say"); if (!b || b.hidden) return "không thấy bong bóng";
      const r = b.getBoundingClientRect(), out = [];
      for (const sel of [".kb-title", "#kb-theme-chip", ".kb-deck", "#kb-coins"]) { const e = document.querySelector(sel); if (!e || !e.offsetParent) continue;
        const q = e.getBoundingClientRect(); if (r.left < q.right && q.left < r.right && r.top < q.bottom && q.top < r.bottom) out.push(sel); }
      return r.right > innerWidth + 1 ? "tràn mép phải" : out.join(", ");`);
    ok(hit === '', w + ' px: bong bóng không đè lên tên vườn / chip / Deck / xu' + (hit ? ' — đè: ' + hit : ''));
  }
  await shot('01_bong_bong_720');
  await size(1366, 768);

  console.log('== 3. vườn để mở qua ngày mới');
  const hasDay = await py(KB + 'result = hasattr(kb._dialog, "_check_day")');
  if (!hasDay) { ok(false, 'không có GardenDialog._check_day (bản trước 1.30.3: vườn để mở qua ngày mới không tự dựng lại) — bỏ qua mục 3'); }
  if (hasDay) {
  const cnt = await py(KB + `
d = kb._dialog
if not hasattr(kb, "_t1303"):
    kb._t1303 = {"n": 0}
    _orig = d.refresh
    def _wrap(*a, **k):
        kb._t1303["n"] += 1
        return _orig(*a, **k)
    d.refresh = _wrap
kb._t1303["n"] = 0
d._check_day()
result = [kb._t1303["n"], d._day_seen == kb._today(), d._day_timer.isActive(), d._day_timer.interval()]`);
  ok(cnt[0] === 0 && cnt[1] && cnt[2] && cnt[3] === 60000, 'ngày chưa đổi: không dựng lại; đồng hồ 60 giây đang chạy');
  const r3 = await py(KB + `
d = kb._dialog
real = kb._today
kb._today = lambda: real() + 1
try:
    d._check_day()
    n1 = kb._t1303["n"]
    d._check_day()
    n2 = kb._t1303["n"]
finally:
    kb._today = real
d._check_day()
result = [n1, n2, kb._t1303["n"]]`);
  ok(r3[0] === 1 && r3[1] === 1, 'sang ngày mới: dựng lại đúng một lần (gọi lại cùng ngày không dựng nữa)');
  ok(r3[2] === 2, 'đổi lại ngày: dựng lại thêm một lần');
  const r3b = await py(KB + `
real = kb._today
kb._today = lambda: real() + 1
try:
    kb._t1303["n"] = 0
    kb.open_garden()
    n = kb._t1303["n"]
finally:
    kb._today = real
kb._dialog._check_day()
result = n`);
  ok(r3b === 1, 'mở lại cửa sổ vườn đang mở (phím tắt / nút ことば畑) sau khi qua ngày: dựng lại ngay');
  await sleep(800);
  // trang: ngày của data.greet đổi → chào ngày mới (đang ở màn chính); có bảng đang mở thì không chào
  await py(KB + 'kb.GREET_TEST_OFF = False\nkb._dialog.refresh()\nresult = 1'); await sleep(900);
  const g1 = await js(`const d = JSON.parse(JSON.stringify(Garden._data())); if (!d.greet) return "không có data.greet";
    try { GardenPrefs.set("kb-greet-day", ""); } catch (e) {}
    document.getElementById("kb-house").click();
    d.greet.day = d.greet.day + 1; d.today.day = d.today.day + 1; GardenGreet.render(d);
    return !!document.getElementById("kb-greet");`);
  ok(g1 === false, 'ngày mới khi đang mở bảng Nhà: không chào đè lên bảng');
  await js('document.getElementById("kb-h-exit").click(); return 1;'); await sleep(500);
  const g2 = await js(`const d = JSON.parse(JSON.stringify(Garden._data())); try { GardenPrefs.set("kb-greet-day", ""); } catch (e) {}
    d.greet.day = d.greet.day + 2; d.today.day = d.today.day + 2; GardenGreet.render(d);
    return !!document.getElementById("kb-greet");`);
  ok(g2 === true, 'ngày mới khi đang ở màn chính: màn chào ngày mới hiện');
  await sleep(500); await shot('02_chao_ngay_moi');
  await press('sp'); await sleep(1500);
  ok(!(await js('const g = document.getElementById("kb-greet"); return !!(g && g.offsetParent);')), 'bấm phím → vào vườn');
  await py(KB + 'kb.GREET_TEST_OFF = True\nresult = 1');
  }

  console.log('== 4a. Esc ở từng bảng nổi chỉ đóng bảng đó (1.30.2: Esc ở bảng ⚙ đóng cả cửa sổ vườn)');
  await escAll();
  for (const [name, sel] of [['⚙', '#kb-sound'], ['Nhiệm vụ', '#kb-quest'], ['Tin làng', '#kb-news-btn'], ['Tìm deck', '#kb-deck-find'],
    ['Chụp ảnh', '#kb-yard-snap'], ['StackChan', '#kb-life-chip'], ['Thời tiết (thẻ Hôm nay)', '#kb-weather']]) {
    const shown = await js(`const b = document.querySelector(${JSON.stringify(sel)}); return !!(b && !b.hidden && b.offsetParent);`);
    if (!shown) { console.log('    (bỏ qua ' + name + ': nút không hiện)'); continue; }
    await page.click(sel);      // chuột thật (CDP)
    await sleep(450);
    const opened = await anyOpen();
    try { await press('esc'); } catch (e) { /* cửa sổ vườn bị đóng giữa chừng: trang mất → lệnh phím hết giờ */ }
    await sleep(450);
    const live = await alive();
    ok(opened && live && !(await anyOpen()), name + ': mở → Esc → đóng bảng, cửa sổ vườn vẫn mở' + (!opened ? ' (không mở được)' : !live ? ' — CỬA SỔ VƯỜN BỊ ĐÓNG' : ''));
    if (!live) { await reopen('', 1366, 768); }
  }
  // ⚙ mở trên bảng Nhà: Esc lần 1 đóng ⚙, Nhà vẫn mở; lần 2 đóng Nhà
  await js('document.getElementById("kb-house").click(); return 1;'); await sleep(800);
  await js('document.getElementById("kb-sound").click(); return 1;'); await sleep(300);
  await press('esc'); await sleep(350);
  const s1 = await js('return [document.getElementById("kb-sound-pop").hidden, !document.getElementById("kb-home").hidden];');
  await press('esc'); await sleep(450);
  ok(s1[0] && s1[1] && await js('return document.getElementById("kb-home").hidden;') && await alive(), '⚙ trên bảng Nhà: Esc lần 1 chỉ đóng ⚙, lần 2 đóng Nhà');

  console.log('== 4. bấm phím bừa');
  const c4 = await coins();
  let maxPanels = 0, escSent = 0, sent = 0, closedWin = 0;
  const pool = ['n', 't', 'b', 'q', 'l', 'r', '1', '2', '3', '4', '5', 'sp', 'en', 'le', 'ri', 'tab', 'a', 'k', 'sl', 'esc', 'esc'];
  for (let i = 0; i < 500; i++) {
    let k = pickOne(pool);
    if (k === 'esc' && !(await anyOpen())) { k = 'le'; }      // Esc ở màn chính đóng cửa sổ vườn (đúng thiết kế) — không gửi
    if (k === 'esc') escSent++;
    await press(k); sent++;
    await sleep(rnd() < 0.2 ? 400 : 60);
    if (i % 10 === 9) {
      maxPanels = Math.max(maxPanels, await panelCount());
      if (!(await alive())) { closedWin++; await reopen('', 1366, 768); }
    }
  }
  await escAll(); await sleep(500);
  ok(closedWin === 0, 'cửa sổ vườn không bị đóng (' + sent + ' phím, ' + escSent + ' lần Esc khi có bảng mở)');
  ok(maxPanels <= 1, 'không lúc nào có quá một bảng cùng mở (nhiều nhất ' + maxPanels + ')');
  const c4b = await coins();
  ok(c4b >= 0, 'xu không âm (' + c4 + ' → ' + c4b + ')');
  ok((await panelCount()) === 0 && await js('return !!document.getElementById("kb-canvas") && document.getElementById("kb-canvas").width > 0;'), 'Esc đưa về màn chính, ruộng vẫn vẽ');
  (page.errors || []).forEach((e) => errors.push(e)); page.errors = [];

  console.log('== 5. bấm chuột bừa');
  const SKIP = /^(Báo lỗi|Góp ý qua email|Tạo biểu tượng|Chụp ảnh|Lưu ảnh|Xuất|Chọn ảnh|Lưu file|Nhập file|Mở trang|Lưu PDF|Gửi email|Chép|Đổi khoá|Bắt đầu viết|Viết lại|Dùng Gemini|Thử khoá|Lưu khoá)/;
  let clicks = 0, asks = 0, paidNoAsk = 0;
  for (let i = 0; i < 300; i++) {
    const W = await js('return [innerWidth, innerHeight];');
    const x = Math.floor(rnd() * W[0]), y = Math.floor(rnd() * W[1]);
    const what = await js(`const e = document.elementFromPoint(${x}, ${y}); if (!e) return "";
      const b = e.closest("button, a, label, input, select, [role=button]"); const id = (b && b.id) || e.id || "";
      return id + "|" + ((b || e).textContent || "").trim().slice(0, 30) + "|" + ((b && b.tagName) || e.tagName);`);
    const [id, txt, tag] = what.split('|');
    if (SKIP.test(txt || '') || /^(kb-report|kb-mail|kb-app-icon|kb-h-snap|kb-snap|kb-cf-file|kb-cf-load|kb-cf-export|kb-cf-import)/.test(id || '') || tag === 'SELECT' || tag === 'A') { continue; }
    const before = await coins();
    for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); }
    clicks++;
    await sleep(120);
    if (await js('const a = document.getElementById("kb-ask"); return !!(a && !a.hidden);')) {
      asks++;
      await sleep(500);
      if (rnd() < 0.5) { await press('en'); } else { await press('esc'); }
      await sleep(400);
    } else if ((await coins()) < before) { paidNoAsk++; }
    if (i % 25 === 24) { if (!(await alive())) { await reopen('', 1366, 768); } await escAll(); }
  }
  await escAll();
  ok(clicks > 150, 'đã bấm ' + clicks + ' lần (hộp hỏi hiện ' + asks + ' lần)');
  ok(paidNoAsk === 0, 'không lần trừ xu nào bỏ qua hộp hỏi' + (paidNoAsk ? ' (' + paidNoAsk + ' lần)' : ''));
  ok((await coins()) >= 0 && await alive(), 'xu không âm, cửa sổ vườn còn mở');
  (page.errors || []).forEach((e) => errors.push(e)); page.errors = [];

  console.log('== 6. đổi cỡ cửa sổ liên tục');
  const SIZES = [[720, 520], [1920, 1080], [1024, 700], [2560, 1440], [800, 600], [1366, 768], [1280, 720], [1600, 900], [960, 640], [1440, 900], [1100, 760], [2048, 1152]];
  let bad6 = [];
  for (let i = 0; i < 24; i++) {
    const [w, h] = SIZES[i % SIZES.length];
    if (i % 6 === 3) { await js('document.getElementById("kb-house").click(); return 1;'); }
    if (i % 6 === 4) { await js('GardenHome.close && GardenHome.close(); return 1;'); }
    await size(w, h); await sleep(250);
    const m = await js(`const de = document.documentElement, out = [];
      if (de.scrollWidth > innerWidth + 1) out.push("cuộn ngang " + (de.scrollWidth - innerWidth) + "px");
      const row = document.querySelector(".kb-legend-row");
      if (row && row.offsetParent) { const tops = new Set(); [...row.children].forEach((k) => { if (k.offsetParent && k.offsetHeight) tops.add(Math.round(k.getBoundingClientRect().top / 8)); }); if (tops.size > 2) out.push("hàng dưới cảnh " + tops.size + " dòng"); }
      const card = document.querySelector(".kb-yard-side"), band = document.getElementById("kb-yard");
      if (card && band && card.offsetParent && band.offsetParent) { const a = card.getBoundingClientRect(), b = band.getBoundingClientRect(); if (a.right > b.right + 8 || a.left < b.left - 8) out.push("thẻ Hôm nay ra ngoài dải cảnh"); }
      const cv = document.getElementById("kb-canvas"), f = document.getElementById("kb-field");
      if (cv && f && f.offsetParent && cv.getBoundingClientRect().width < f.clientWidth - 80) out.push("ruộng hẹp hơn khung");
      return out.join(", ");`);
    if (m) bad6.push(w + '×' + h + ': ' + m);
  }
  await js('GardenHome.close && GardenHome.close(); return 1;');
  ok(bad6.length === 0, '24 lần đổi cỡ: không tràn ngang, hàng dưới cảnh ≤ 2 dòng, thẻ Hôm nay trong dải cảnh' + (bad6.length ? ' — ' + bad6.slice(0, 4).join(' | ') : ''));

  console.log('== 7. cửa sổ rất lớn / rất nhỏ');
  for (const [w, h] of [[2560, 1440], [720, 520]]) {
    await size(w, h); await sleep(700);
    const ov = await js('return document.documentElement.scrollWidth - innerWidth;');
    ok(ov <= 1, w + ' × ' + h + ': không tràn ngang (' + ov + ')');
    await shot('03_' + w + 'x' + h);
  }
  await size(1366, 768);

  console.log('== 8. lỗi');
  (page.errors || []).forEach((e) => errors.push(e));
  ok(errors.length === 0, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const log = await py(KB + 'result = [(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-8:]');
  ok(!log.length, 'nhật ký lỗi add-on trống' + (log.length ? ': ' + JSON.stringify(log) : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total);
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); try { page && page.close(); } catch (x) { } process.exit(2); });
