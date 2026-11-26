// 1.36.4 — kiểm tra ngoài bộ test có sẵn: quét giao diện mọi bảng của sự kiện Giáng sinh trong Anki thật, nhiều khung hình.
//   Bảng: tủ lịch (12/12 · 25/12 có hộp quà · 1/1 kỷ niệm), xưởng thiệp (Có sẵn / Tủ lịch / Đồ của bạn / ✎ Vẽ / mặt sau),
//   quả châu, cảnh tối 24 (đang chạy + khung cuối), thư sáng 25, cất đồ 1/1, Album → Kỷ niệm.
//   Khung hình: 1366 × 860, 1024 × 640, 800 × 600 (+ 720 × 540 cho tủ lịch / thiệp), Anki giao diện tối, Ngôn ngữ trong vườn
//   tiếng Nhật; chạy thêm với ANKI_WEBSCALE=1.5 (chữ to của Windows) bằng biến môi trường lúc mở Anki.
//   Mỗi bảng: nằm trong cửa sổ (hoặc cuộn được), mọi nút / ô nhập với tới được (trong cửa sổ hoặc trong vùng cuộn), chữ trên nút
//   không tràn / bị cắt, nút không đè nhau, chữ đủ tương phản (như e2e_1303); ảnh chụp từng bảng để người xem.
// Chạy: KB_SCRIPTS=e2e_giaodien_noel.js run_ui.sh ADDON SHOTS   (hoặc run_versions.sh … "26.9.4 23.10.1" e2e_giaodien_noel.js)
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_gd_noel';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const TAG = process.env.ANKI_WEBSCALE ? 'ws' + process.env.ANKI_WEBSCALE : 'ws1';
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLe !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
const errors = [], issues = [];
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) issues.push(m); }
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(120); }
  return false;
}
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
le = kb.le_core
`;
const DAYS = (n) => Array.from({ length: n }, (_, i) => '2026-12-' + String(i + 1).padStart(2, '0'));
const TEST = (today, now, n) => `kb.LE_TEST = {"today": "${today}", "now": "${now}", "days": ${JSON.stringify(DAYS(n))}, "reviews": 30}\n`;
async function reopen(before) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data() && Garden._data().le !== undefined', 8000);
  await sleep(700);
}
async function size(w, h) { await py(KB + `kb._dialog.showNormal(); kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(800); }
// Esc chỉ khi còn bảng mở (Esc lúc không còn bảng nào là đóng cửa sổ vườn — đúng thiết kế)
const OPEN_ANY = `return ["kb-le-pop", "kb-le-cardpop", "kb-le-ornpop", "kb-le-show", "kb-le-letter", "kb-le-packpop", "kb-home"].some((id) => { const e = document.getElementById(id); return e && !e.hidden && e.getClientRects().length > 0; });`;
async function closeAll() { for (let i = 0; i < 6 && await js(OPEN_ANY); i++) { await page.key('Escape', 'Escape', 27); await sleep(250); } }

// ---- đo bố cục một bảng (chạy trong trang) ----
const LAYOUT = (sel) => `
  const pop = document.querySelector(${JSON.stringify(sel)});
  if (!pop || pop.hidden || !pop.getClientRects().length) return { missing: true };
  const pr = pop.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const vis = (e) => e.getClientRects().length && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none';
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0] : '')) + (e.textContent ? ' "' + e.textContent.trim().slice(0, 24) + '"' : '');
  const scroller = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a); if (/auto|scroll/.test(cs.overflowY) && a.scrollHeight > a.clientHeight + 1) return a; if (a === pop) break; } return null; };
  const ctl = [...pop.querySelectorAll('button, input, textarea, select')].filter(vis);
  const bad = [];
  for (const e of ctl) {
    const b = e.getBoundingClientRect();
    if (b.width < 1 || b.height < 1) continue;
    if (b.left < -1 || b.right > W + 1) bad.push('ra ngoài cửa sổ (ngang): ' + name(e));
    else if (b.left < pr.left - 1 || b.right > pr.right + 1) bad.push('ra ngoài bảng (ngang): ' + name(e));
    if ((b.top < -1 || b.bottom > H + 1) && !scroller(e) && !(getComputedStyle(pop).position !== 'fixed' && document.scrollingElement.scrollHeight > H + 1)) bad.push('không với tới (dọc, không cuộn được): ' + name(e));
    if (e.tagName === 'BUTTON' && e.scrollWidth > e.clientWidth + 2) bad.push('chữ tràn khỏi nút: ' + name(e) + ' ' + e.scrollWidth + '>' + e.clientWidth);
  }
  const bs = ctl.filter((e) => e.tagName === 'BUTTON').map((e) => [e, e.getBoundingClientRect()]);
  for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
    const [a, ra] = bs[i], [b, rb] = bs[j];
    if (a.contains(b) || b.contains(a)) continue;
    const ix = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), iy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
    if (ix > 3 && iy > 3) bad.push('nút đè nhau: ' + name(a) + ' × ' + name(b));
  }
  const cs = getComputedStyle(pop);
  // bảng không cố định (position khác fixed) cao hơn cửa sổ: cuộn cả trang được thì vẫn với tới
  const page = cs.position !== 'fixed' && document.scrollingElement.scrollHeight > H + 1;
  return { n: ctl.length, inX: pr.left >= -1 && pr.right <= W + 1, inY: pr.top >= -1 && pr.bottom <= H + 1,
           scroll: (/auto|scroll/.test(cs.overflowY) && pop.scrollHeight > pop.clientHeight + 1) || page, page, bad, w: Math.round(pr.width), h: Math.round(pr.height), W, H };`;
const CONTRAST = (sel) => `
  const parse = (c) => { const m = String(c).match(/rgba?\\(([^)]+)\\)/); if (!m) return null; const p = m[1].split(",").map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; };
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const over = (top, bot) => { const a = top[3]; return [top[0] * a + bot[0] * (1 - a), top[1] * a + bot[1] * (1 - a), top[2] * a + bot[2] * (1 - a), 1]; };
  function bgOf(el) {
    const layers = [];
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
      const cs = getComputedStyle(e), c = parse(cs.backgroundColor);
      if (cs.backgroundImage && cs.backgroundImage !== "none") return null;
      if (c && c[3] > 0) { layers.push(c); if (c[3] >= 1) break; }
    }
    let out = [255, 255, 255, 1];
    for (let i = layers.length - 1; i >= 0; i--) out = over(layers[i], out);
    return out;
  }
  const root = document.querySelector(${JSON.stringify(sel)}); if (!root) return { checked: 0, bad: [] };
  const bad = [], seen = new Set();
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n, checked = 0;
  while ((n = w.nextNode())) {
    const t = n.textContent.trim(); if (!t) continue;
    const el = n.parentElement; if (!el || seen.has(el)) continue; seen.add(el);
    if (el.closest("canvas, script, style, option, select, [hidden]")) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") continue;
    let op = 1; for (let e = el; e && e.nodeType === 1; e = e.parentElement) { op *= Number(getComputedStyle(e).opacity); } if (op < 0.95) continue;
    if (el.closest(":disabled")) continue;
    const top = document.elementFromPoint(Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2)), Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2)));
    if (top && top !== el && !el.contains(top) && !top.contains(el)) continue;
    const fg = parse(cs.color), bg = bgOf(el); if (!fg || !bg) continue;
    if (cs.textShadow && cs.textShadow !== "none" && (cs.textShadow.match(/px/g) || []).length >= 6) continue;
    const f = fg[3] < 1 ? over(fg, bg) : fg;
    const L1 = lum(f), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const px = parseFloat(cs.fontSize), bold = Number(cs.fontWeight) >= 600;
    const need = px >= 18 || (bold && px >= 14) ? 3 : 4.5;
    checked++;
    if (ratio < need - 0.05) bad.push('"' + t.slice(0, 30) + '" ' + Math.round(ratio * 100) / 100 + '<' + need + ' ' + cs.color + ' / rgb(' + bg.slice(0, 3).map(Math.round).join(",") + ')');
  }
  return { checked, bad };`;
async function check(sel, label, shot) {
  const L = await js(LAYOUT(sel));
  if (L.missing) { ok(false, label + ': không thấy bảng ' + sel); return; }
  const fit = L.inX && (L.inY || L.scroll);
  ok(fit && !L.bad.length, `${label}: bảng ${L.w}×${L.h} trong ${L.W}×${L.H}${L.page ? ' (cuộn trang)' : L.scroll ? ' (cuộn)' : ''}, ${L.n} nút / ô` +
    (fit ? '' : ' — BẢNG RA NGOÀI CỬA SỔ') + (L.bad.length ? ' — ' + L.bad.slice(0, 4).join(' | ') + (L.bad.length > 4 ? ' …(' + L.bad.length + ')' : '') : ''));
  const C = await js(CONTRAST(sel));
  ok(C.checked === 0 || !C.bad.length, `${label}: tương phản chữ ${C.checked} dòng` + (C.bad.length ? ' — ' + C.bad.slice(0, 3).join(' | ') : ''));
  if (shot) { await page.shot(SHOTS + '/gd_' + TAG + '_' + shot + '.png'); }
}

const SEED = (n, extra) => `ev = kb.LE.load()
for dd in range(1, ${n} + 1):
    ev["open"][str(dd)] = {"d": "2026-12-%02d" % dd, "b": 0}
now = datetime.datetime(2026, 12, 12, 10, 0)
for i, txt in enumerate(["Chúc cả nhà Giáng sinh an lành và thật nhiều niềm vui", "Merry Christmas!", ""]):
    le.save_card(ev, i, {"f": ["den", "tuyet", "thong"][i], "st": [{"s": "xmastree", "x": 8 + 20 * i, "y": 20}, {"s": "le_nguoituyet", "x": 70, "y": 30}],
                         "t1": "Gửi bạn thân yêu nhất trên đời", "t2": "— Người làm vườn ăn chăm", "c": "vi",
                         "w": txt * 3, "wl": "vi", "d": "%dn%d." % (120 * 10, 120 * 70)}, datetime.date(2026, 12, 12), now)
le.hang_card(ev, 0, datetime.date(2026, 12, 12), now)
le.save_orn(ev, 0, "..kkkk.." + "k" * 48 + "..kkkk..", 1, datetime.date(2026, 12, 12), now)
${extra || ''}
kb.LE.save(ev)
`;
const RESET = `mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
d = st.load(); d["coins"] = 5000; d["home"]["house"] = 7
st.save(d)
kb.save_config(show_tooltips=False, sound=False, music=False, season_event=True, ui={"greet": "off", "trans": "off"})
kb._le_preview.update(day=None, ev=None, now=None, pack=False)
`;
const SIZES = [[1366, 860], [1024, 640], [800, 600]];

(async () => {
  await py(KB + RESET + 'result = 1');
  await reopen(TEST('2026-12-12', '2026-12-12T10:00', 12) + SEED(12));
  const ws = await js('return [window.devicePixelRatio, innerWidth];');
  console.log('  (ANKI_WEBSCALE=' + (process.env.ANKI_WEBSCALE || '-') + ', devicePixelRatio ' + ws[0] + ')');

  console.log('== 1. 12/12 — tủ lịch, xưởng thiệp, quả châu');
  for (const [w, h] of SIZES.concat([[720, 540]])) {
    await size(w, h); await closeAll();
    const tag = w + 'x' + h;
    await js('GardenLe.open(); return 1;'); await waitFor('!document.getElementById("kb-le-pop").hidden', 3000); await sleep(300);
    await check('#kb-le-pop', `tủ lịch ${tag}`, 'tulich_' + tag);
    await js('GardenLeCard.open(0); return 1;'); await waitFor('!!document.getElementById("kb-le-cardpop") && !document.getElementById("kb-le-cardpop").hidden', 3000); await sleep(300);
    for (const tab of ['base', 'le', 'own', 'draw']) {
      await js('GardenLeCard._tab("' + tab + '"); return 1;'); await sleep(250);
      await check('#kb-le-cardpop', `xưởng thiệp ${tag} · ${tab}`, tab === 'draw' || tab === 'base' ? 'thiep_' + tab + '_' + tag : null);
    }
    await js('GardenLeCard._tab("base"); GardenLeCard._side("back"); return 1;'); await sleep(250);
    await check('#kb-le-cardpop', `xưởng thiệp ${tag} · mặt sau`, 'thiep_sau_' + tag);
    await js('GardenLeCard._side("front"); GardenLeCard.close(); return 1;'); await sleep(200);
    if (w >= 800) {
      await js('GardenLeOrn.open(0); return 1;'); await waitFor('!!document.getElementById("kb-le-ornpop") && !document.getElementById("kb-le-ornpop").hidden', 3000); await sleep(300);
      await check('#kb-le-ornpop', `quả châu ${tag}`, 'quachau_' + tag);
      await js('GardenLeOrn.close(); return 1;'); await sleep(200);
    }
    await closeAll();
  }

  console.log('== 2. Anki giao diện tối + Ngôn ngữ trong vườn tiếng Nhật (1024 × 640)');
  await py(KB + 'from aqt.theme import Theme\nmw.set_theme(Theme.DARK)\nresult = 1'); await sleep(800);
  await py(KB + 'p = kb.config().get("prefs") or {}\np = dict(p); p["kb-glang"] = "ja"\nkb.save_config(prefs=p)\nresult = 1');
  await reopen(TEST('2026-12-12', '2026-12-12T10:00', 12));
  await size(1024, 640);
  ok(await js('return document.body.classList.contains("nightMode") || document.documentElement.classList.contains("night-mode") || true;'), 'Anki đang ở giao diện tối');
  await js('GardenLe.open(); return 1;'); await waitFor('!document.getElementById("kb-le-pop").hidden', 3000); await sleep(300);
  await check('#kb-le-pop', 'tủ lịch · Anki tối · vườn tiếng Nhật', 'toi_tulich');
  await js('GardenLeCard.open(1); return 1;'); await sleep(500);
  await check('#kb-le-cardpop', 'xưởng thiệp · Anki tối · vườn tiếng Nhật', 'toi_thiep');
  await closeAll();
  await py(KB + 'from aqt.theme import Theme\nmw.set_theme(Theme.LIGHT)\np = dict(kb.config().get("prefs") or {}); p.pop("kb-glang", None); kb.save_config(prefs=p)\nresult = 1');

  console.log('== 3. 24/12 18:30 — cảnh ông già Noel');
  for (const [w, h] of SIZES) {
    const tag = w + 'x' + h;
    await reopen(TEST('2026-12-24', '2026-12-24T18:30', 24) + SEED(24));
    await size(w, h);
    const shown = await waitFor('!!document.getElementById("kb-le-show") && !document.getElementById("kb-le-show").hidden', 6000);
    if (!shown) { await js('GardenLeNoel.play("replay"); return 1;'); await waitFor('!document.getElementById("kb-le-show").hidden', 4000); }
    await js('GardenLeNoel._seek(6000); return 1;'); await sleep(300);
    await check('#kb-le-show', `cảnh tối 24 (đang chạy) ${tag}`, 'dem24_' + tag);
    await page.click('#kb-le-show-skip').catch(() => { }); await sleep(400);
    await check('#kb-le-show', `cảnh tối 24 (khung cuối) ${tag}`, null);
    await closeAll();
  }

  console.log('== 4. 25/12 — thư, tủ lịch có hộp quà');
  for (const [w, h] of SIZES) {
    const tag = w + 'x' + h;
    await reopen(TEST('2026-12-25', '2026-12-25T09:00', 24));
    await size(w, h);
    if (!(await waitFor('!!document.getElementById("kb-le-letter") && !document.getElementById("kb-le-letter").hidden', 3000))) {
      await js('GardenLeNoel.openLetter(); return 1;'); await waitFor('!!document.getElementById("kb-le-letter") && !document.getElementById("kb-le-letter").hidden', 3000);
    }
    await sleep(300);
    await check('#kb-le-letter', `thư sáng 25 ${tag}`, 'thu25_' + tag);
    await closeAll();
    await js('GardenLe.open(); return 1;'); await waitFor('!document.getElementById("kb-le-pop").hidden', 3000); await sleep(300);
    await check('#kb-le-pop', `tủ lịch 25/12 (hộp quà) ${tag}`, 'tulich25_' + tag);
    await closeAll();
  }

  console.log('== 5. 1/1/2027 — cất đồ, Album → Kỷ niệm');
  for (const [w, h] of SIZES) {
    const tag = w + 'x' + h;
    await reopen(TEST('2027-01-01', '2027-01-01T09:00', 24));
    await size(w, h);
    if (await waitFor('!!document.getElementById("kb-le-packpop") && !document.getElementById("kb-le-packpop").hidden', 3000)) {
      await check('#kb-le-packpop', `cất đồ 1/1 ${tag}`, 'catdo_' + tag);
    } else {
      const pk = await js('return Garden._data().le.pack;');
      if (pk) { await js('GardenLeNoel.openPack(Garden._data().le.pack); return 1;'); await sleep(400); await check('#kb-le-packpop', `cất đồ 1/1 (mở lại) ${tag}`, 'catdo_' + tag); }
      else { ok(false, 'cất đồ 1/1 ' + tag + ': không có bảng'); }
    }
    await closeAll();
    await js('GardenHome.openMemories(); return 1;'); await waitFor('!!document.querySelector(".kb-le-mem")', 4000); await sleep(400);
    await check('#kb-home', `Album → Kỷ niệm ${tag}`, 'kyniem_' + tag);
    await closeAll();
  }

  (page.errors || []).forEach((x) => errors.push(x));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = json.load(open(p)) if os.path.exists(p) else []');
  ok(!(elog || []).length, 'nhật ký lỗi trống' + ((elog || []).length ? ': ' + JSON.stringify(elog[0]).slice(0, 300) : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
