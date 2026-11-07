// Soát cuối "người chơi nhiều xu": cho 1.000.000 xu rồi bấm mua / dùng MỌI thứ qua giao diện thật (nút trên màn hình,
// không gọi thẳng Python): xây nhà 7 bước + 3 kiểu nhà, sửa nhà, mọi món trang trí sân / nội thất, 6 vùng + đồ của vùng,
// thú nuôi (nhận nuôi, cho ăn, đặt tên, đổi chỗ ở, tự cho ăn), giống cây (mua, luật deck / loại note / tag, Trộn),
// giao diện mùa (mở bằng xu, đổi chuỗi, xem thử, dùng ngay từng giao diện, Tự động / Tắt), tủ đồ + biểu cảm,
// Xưởng (vẽ bằng chuột với mọi công cụ, chuyển ảnh qua hộp "Chọn ảnh…", 3 cỡ, 3 loại, hiệu ứng, sửa, +1 cái, xoá),
// vùng tự tạo (công trình + cảnh nền), giống cây tự vẽ, mã chia sẻ (xuất + dán làm), Kho đồ (Đặt / Di chuyển / Cất),
// đồ hiếm, chụp ảnh vườn. Mỗi lần mua kiểm tra xu bị trừ đúng giá trên nút. Chụp mọi cảnh (ngày / đêm / mưa) ở 1366
// và 1024 px, đo tràn / cắt chữ / hàng nút lệch, bắt lỗi JS và nhật ký lỗi của add-on, đo thời gian vẽ một khung
// khi vườn đầy đồ. Chạy: node audit_full.js SHOTS (Anki đã chạy bằng run_anki.sh; run_ui.sh với KB_SCRIPTS=audit_full.js).
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const { MEASURE } = require('./measure');
const SHOTS = process.argv[2] || '/tmp/kb_shots_full';
fs.mkdirSync(SHOTS, { recursive: true });
const results = []; const fails = [];
const ok = (c, m) => { results.push(!!c); if (!c) fails.push(m); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
// ảnh vườn tự lưu: mỗi Anki (cổng điều khiển) một file — chạy song song nhiều bản Anki không ghi đè nhau (1.22.7)
const PHOTO = '/tmp/kb_full_photo_' + CTRL + '.png';
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
const KB = 'import sys, os, time, datetime, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
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
const owned = (id) => py(KB + `result = st.load()["home"]["owned"].get(${JSON.stringify(id)}, 0)`);
const placedN = (sc) => py(KB + `result = len(st.load()["home"].get(${JSON.stringify(sc)}) or [])`);
const hideToast = () => js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
async function mouse(type, x, y, button = 'left', mods = 0) { await page.send('Input.dispatchMouseEvent', { type, x, y, button, clickCount: 1, modifiers: mods }); }

// ---- chụp + đo (như audit.js) ----
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
}

// ---- Nhà & Cửa hàng ----
async function openHome(tab, scene) {
  await js(`if (window.GardenCraft && GardenCraft.isOpen()) GardenCraft.close();
    if (!GardenHome.isOpen()) GardenHome.open(${scene ? JSON.stringify(scene) : ''}); else if (${!!scene}) GardenHome.setScene(${JSON.stringify(scene || '')});
    const b = document.querySelector('#kb-home .kb-h-tab[data-tab="${tab}"]'); if (b) b.click(); return 1;`);
  await sleep(350);
}
const closeHome = () => js('if (window.GardenCraft && GardenCraft.isOpen()) GardenCraft.close(); GardenHome.close(); return 1;');
// nút re trong thẻ có tên name (tên đúng như hiện, bỏ nhãn "Mới" / "Đang diễn ra"); click=false: chỉ đọc
const cardBtn = (name, re, click = true) => js(`
  const want = ${JSON.stringify(name)};
  const cards = Array.from(document.querySelectorAll("#kb-h-list .kb-h-card"));
  const own = (n) => Array.from(n.childNodes).filter((x) => !(x.classList && /newtag|guest-ja|guest-rare/.test(x.className))).map((x) => x.textContent).join("").trim();
  let c = cards.find((k) => { const n = k.querySelector(".kb-h-name"); return n && own(n) === want; });
  if (!c) c = cards.find((k) => { const n = k.querySelector(".kb-h-name"); return n && own(n).indexOf(want) >= 0; });
  if (!c) return { found: false };
  const b = Array.from(c.querySelectorAll("button")).find((x) => ${re}.test(x.textContent));
  if (!b) return { found: true, btn: false, btns: Array.from(c.querySelectorAll("button")).map((x) => x.textContent) };
  const r = { found: true, btn: true, disabled: b.disabled, text: b.textContent, title: b.title };
  if (${click} && !b.disabled) { b.scrollIntoView({ block: "center" }); b.click(); }
  return r;`);
const freeCell = (sc, id) => js(`for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) if (!GardenHome._spotError(${JSON.stringify(sc)}, ${JSON.stringify(id)}, x, y)) return [x, y]; return null;`);
const priceIn = (text) => { const m = /([\d.]+) xu/.exec(text || ''); return m ? Number(m[1].replace(/\./g, '')) : null; };
const cat = () => js('return Garden._data().catalog;');

// đang ở chế độ đặt đồ: tìm ô trống của cảnh đang đặt rồi bấm vào canvas; hết chỗ thì Esc (đồ nằm trong kho)
async function placeNow(id) {
  const stt = await js('const s = GardenHome._state(); return s.placing ? { scene: s.placing.scene, id: s.placing.id } : null;');
  if (!stt) return { placed: false, why: 'không vào chế độ đặt' };
  const cell = await freeCell(stt.scene, stt.id);
  if (!cell) { await page.key('Escape', 'Escape', 27); return { placed: false, why: 'hết chỗ ở ' + stt.scene, scene: stt.scene }; }
  const n0 = await placedN(stt.scene);
  await js(`GardenHome._clickCell(${cell[0]}, ${cell[1]}); return 1;`);
  const done = await waitPy(`result = len(st.load()["home"].get(${JSON.stringify(stt.scene)}) or []) > ${n0}`);
  return { placed: !!done, scene: stt.scene, cell };
}

// mua một món ở tab đang mở qua nút "Mua", kiểm tra xu bị trừ đúng giá, rồi đặt
const buyLog = { bought: 0, placed: 0, stored: 0, bad: [] };
async function buyItem(it) {
  const c0 = await coins(), o0 = await owned(it.id);
  const r = await cardBtn(it.name, /^Mua$/);
  if (!r.found || !r.btn) { buyLog.bad.push(it.name + ': không thấy nút Mua ' + JSON.stringify(r.btns || '')); return false; }
  if (r.disabled) { buyLog.bad.push(it.name + ': nút Mua bị khoá (' + (r.title || '') + ')'); return false; }
  const got = await waitPy(`result = st.load()["home"]["owned"].get(${JSON.stringify(it.id)}, 0) > ${o0}`);
  const c1 = await coins();
  if (!got) { buyLog.bad.push(it.name + ': bấm Mua mà không có đồ'); return false; }
  if (c0 - c1 !== it.price) buyLog.bad.push(it.name + ': trừ ' + (c0 - c1) + ' xu, giá ' + it.price);
  buyLog.bought++;
  await sleep(150);
  const p = await placeNow(it.id);
  if (p.placed) buyLog.placed++; else { buyLog.stored++; if (!/hết chỗ/.test(p.why)) buyLog.bad.push(it.name + ': ' + p.why); }
  return true;
}

// ---- Xưởng: vẽ bằng chuột ----
const cellPt = (x, y) => js(`const cv = document.getElementById("kb-cf-grid"), r = cv.getBoundingClientRect(), c = GardenCraft._state().cell;
  return [r.left + (${x} + 0.5) * c, r.top + (${y} + 0.5) * c];`);
async function stroke(cells, button = 'left') {
  const [x0, y0] = await cellPt(cells[0][0], cells[0][1]);
  await mouse('mouseMoved', x0, y0); await mouse('mousePressed', x0, y0, button);
  for (const [cx, cy] of cells.slice(1)) { const [x, y] = await cellPt(cx, cy); await mouse('mouseMoved', x, y, button); }
  const [x1, y1] = await cellPt(cells[cells.length - 1][0], cells[cells.length - 1][1]);
  await mouse('mouseReleased', x1, y1, button);
}
const tool = (t) => js(`document.querySelector('.kb-cf-tools [data-tool="${t}"]').click(); return 1;`);
const color = (c) => js(`const b = document.querySelector('#kb-cf-pal [data-c="${c}"]'); if (b) b.click(); return !!b;`);
const cfState = () => page.eval('GardenCraft._state()');
const inked = (px) => (px || '').replace(/\./g, '').length;
async function typeInto(sel, text) {
  await js(`const e = document.querySelector(${JSON.stringify(sel)}); e.focus(); e.select && e.select(); return 1;`);
  await page.send('Input.insertText', { text });
  await js(`const e = document.querySelector(${JSON.stringify(sel)}); e.dispatchEvent(new Event("input")); e.dispatchEvent(new Event("change")); return 1;`);
}
async function selectVal(sel, value) {
  return js(`const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.value = ${JSON.stringify(value)}; e.dispatchEvent(new Event("change")); return e.value === ${JSON.stringify(value)};`);
}

async function phase(name, fn) {
  console.log('== ' + name);
  try { await fn(); } catch (e) { ok(false, name + ': LỖI KỊCH BẢN ' + e.message.split('\n')[0]); }
  const errs = page.errors.splice(0);
  if (errs.length) { ok(false, name + ': lỗi JS ' + errs.slice(0, 3).join(' | ')); }
}
const fixSky = (hour = 10, weather = 'sunny') => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${hour}); GardenSky.set("weather", ${JSON.stringify(weather)}); return 1;`);

(async () => {
  // vườn mới: 1.000.000 xu, deck có câu ví dụ, 14 ngày ôn liên tục (đổi chuỗi), hộp chọn ảnh / lưu ảnh tự trả lời
  await py(KB + `d = st.load(); d["coins"] = 1000000; st.save(d)
col = mw.col
cids = list(col.db.list("select id from cards limit 200"))
day0 = int(col.sched.day_cutoff) - 86400
rows = []
for back in range(1, 15):
    for i in range(12):
        rows.append(((day0 - back * 86400 + 36000) * 1000 + i * 1000 + back, cids[(back * 12 + i) % len(cids)], -1, 3, 10, 5, 2500, 4000, 1))
col.db.executemany("insert or ignore into revlog (id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", rows)
os.environ["KB_TEST_PHOTO"] = "${PHOTO}"
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(2500);
  await js('if (window.GardenPaper) GardenPaper.close(); if (window.GardenCal) GardenCal.close(); return 1;');
  await fixSky(); await hideToast();
  page.errors.splice(0);
  await shot('00_vuon_moi', 'vườn mới, 1.000.000 xu');
  const C = await cat();

  await phase('Kiếm xu: lượt ôn trên điện thoại, ôn trong vườn, mục tiêu ngày, nhiệm vụ, rương đồ hiếm', async () => {
    // 27 lượt ôn "trên điện thoại" (revlog không qua add-on) → mở lại vườn thì được bù +1 xu / lượt nhớ
    const c0 = await coins();
    await py(KB + `col = mw.col
cids = list(col.db.list("select id from cards where did = ? limit 27", kb._dialog.deck_id)) or list(col.db.list("select id from cards limit 27"))
now = int(time.time() * 1000)
rows = [(now + i * 50, cids[i % len(cids)], -1, 3, 4, 1, 2500, 4000, 1) for i in range(27)]
time.sleep(1.5)
col.db.executemany("insert or ignore into revlog (id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", rows)
kb._dialog.refresh(); result = 1`);
    await sleep(2500);
    const c1 = await coins();
    const toast = await js('const t = document.getElementById("kb-toast"); return t && !t.hidden ? t.textContent : "";');
    ok(c1 - c0 >= 27, 'Bù 27 lượt ôn ngoài add-on: +' + (c1 - c0) + ' xu (gồm thưởng nhiệm vụ nếu xong) · thông báo "' + toast.slice(0, 70) + '"');
    await shot('00b_bu_xu_dien_thoai');
    // nhiệm vụ: còn thiếu đúng một lượt ôn không bấm "Lại"
    const q = await py(KB + `d = st.load(); q = d["quest"]; pr = q["progress"]
for it in q["list"]:
    pr[it["kind"]] = it["target"]
ks = [it["kind"] for it in q["list"]]
if "streak" in ks:
    pr["streak"] = pr["streak_cur"] = next(it["target"] for it in q["list"] if it["kind"] == "streak") - 1
else:
    t0 = q["list"][0]["target"]; pr["new"] = t0 - 1; pr["due"] = t0 - 1
q["done"] = []; q["chest"] = False; q["chest_item"] = None
st.save(d); kb._dialog.refresh(); result = q["list"]`);
    await sleep(1800); await hideToast();
    const c2 = await coins();
    const rare0 = await py(KB + 'o = st.load()["home"]["owned"]; result = sum(1 for k, v in kb.core.CATALOG.items() if v.get("rare") and o.get(k))');
    await js('document.getElementById("kb-review").click(); return 1;');
    let answered = 0, chest = false;
    let goal = false;
    for (let i = 0; i < 8 && !(chest && goal); i++) {
      if (!await waitFor('(() => { const b = document.getElementById("kb-show"); return b && b.offsetParent; })()', 6000)) break;
      await js('document.getElementById("kb-show").click(); return 1;'); await sleep(500);
      if (i === 0) await shot('00c_on_the_dap_an');
      await js('document.querySelector(\'#kb-panel [data-ease="3"]\').click(); return 1;');
      answered++;
      await sleep(900);
      chest = await py(KB + 'result = st.load()["quest"]["chest"]');
      goal = await py(KB + 'd = st.load(); result = d.get("goal_day") == kb.core.daily_stats(mw.col)["day"]');
    }
    const c3 = await coins();
    const goalDay = await py(KB + 'd = st.load(); result = d.get("goal_day") == kb.core.daily_stats(mw.col)["day"]');
    const rare1 = await py(KB + 'o = st.load()["home"]["owned"]; result = sum(1 for k, v in kb.core.CATALOG.items() if v.get("rare") and o.get(k))');
    ok(answered >= 1 && goalDay, 'Ôn ' + answered + ' thẻ trong vườn → đủ 30 lượt, nhận thưởng mục tiêu ngày');
    ok(chest && rare1 === rare0 + 1, 'Xong 3 nhiệm vụ → mở rương, nhận 1 món hiếm (' + rare0 + ' → ' + rare1 + ')');
    ok(c3 - c2 >= answered + 20 + 30 + 15, 'Xu ôn thẻ + nhiệm vụ + rương + mục tiêu: +' + (c3 - c2) + ' xu');
    await shot('00d_ruong_nhiem_vu');
    await js('const s = document.getElementById("kb-stop"); if (s && !document.getElementById("kb-panel").hidden) s.click(); return 1;');
    await sleep(800);
    await js('const b = document.getElementById("kb-quest"); if (b && !b.hidden) b.click(); const t = document.querySelector(".kb-today-list .kb-quest-btn"); if (t) t.click(); return 1;');
    await sleep(500); await shot('00e_bang_nhiem_vu_ruong');
    await js('const q = document.getElementById("kb-quest-pop"); if (q) q.hidden = true; return 1;');
    void q;
  });

  await phase('Xây nhà 7 bước + 3 kiểu nhà', async () => {
    await openHome('build', 'yard');
    await shot('01_xay_nha_dau');
    for (let lv = 1; lv < C.levels.length; lv++) {
      const c0 = await coins();
      const r = await js(`const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => x.textContent === "Xây"); if (!b || b.disabled) return false; b.click(); return true;`);
      const up = r && await waitPy(`result = st.load()["home"]["house"] >= ${lv}`);
      const c1 = await coins();
      ok(up && c0 - c1 === C.levels[lv].price, 'Xây "' + C.levels[lv].name + '" · trừ ' + (c0 - c1) + ' / ' + C.levels[lv].price + ' xu');
      await sleep(250);
    }
    await shot('01_xay_nha_xong', 'nhà xây xong + 3 kiểu nhà');
    for (const sid of ['minka', 'teahouse', 'castle']) {
      const s = C.styles.find((x) => x.id === sid);
      await openHome('build');
      const c0 = await coins();
      const r = await cardBtn(s.name, /^Mua · /);
      const got = r.btn && !r.disabled && await waitPy(`result = ${JSON.stringify(sid)} in (st.load()["home"].get("styles") or [])`);
      ok(got && c0 - (await coins()) === s.price, 'Mua kiểu "' + s.name + '" ' + s.price + ' xu');
      const u = await waitPy(`result = st.load()["home"].get("style") == ${JSON.stringify(sid)}`, 1500);
      if (!u) { await openHome('build'); await cardBtn(s.name, /^Dùng kiểu này$/); await waitPy(`result = st.load()["home"].get("style") == ${JSON.stringify(sid)}`); }
      ok(await py(KB + `result = st.load()["home"].get("style")`) === sid, 'Dùng kiểu "' + s.name + '"');
      await closeHome(); await sleep(400);
      await shot('01_kieu_' + sid);
    }
    await openHome('build');
    await cardBtn(C.styles.find((x) => x.id === 'classic').name, /^Dùng kiểu này$/);
    ok(await waitPy('result = st.load()["home"].get("style") in (None, "classic")'), 'Quay lại nhà gỗ mái đỏ (miễn phí)');
  });

  await phase('Sửa nhà (nhà cũ 4 nấc)', async () => {
    await py(KB + 'd = st.load(); d["more"]["repair"]["day"] = st._day() - 30; st.save(d); kb._dialog.refresh(); result = 1'); await sleep(2000);
    await fixSky(9, 'rain'); await hideToast();
    await closeHome(); await sleep(500);
    await shot('02_nha_cu_mua', 'nhà cũ 4 nấc khi mưa (mái dột)');
    await openHome('build');
    await shot('02_tab_sua_nha');
    const one = await js(`const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-repair button")).find((x) => /· \\d+ xu$/.test(x.textContent) && !/^Sửa hết/.test(x.textContent)); return b ? b.textContent : null;`);
    const c0 = await coins();
    await js(`const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-repair button")).find((x) => x.textContent === ${JSON.stringify(one)}); b.click(); return 1;`);
    await waitPy(`result = st.load()["coins"] < ${c0}`);
    const lv1 = await js('return (Garden._data().wallet.more_view || {}).wear ? Garden._data().wallet.more_view.wear.level : null;');
    ok(c0 - (await coins()) === priceIn(one), 'Sửa 1 nấc "' + one + '" trừ đúng giá');
    const c1 = await coins();
    const all = await js(`const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-repair button")).find((x) => /^Sửa hết/.test(x.textContent)); if (!b) return null; const t = b.textContent; b.click(); return t;`);
    await waitPy(`result = st.load()["coins"] < ${c1}`);
    ok(all && c1 - (await coins()) === priceIn(all), 'Sửa hết "' + all + '" trừ đúng giá');
    await sleep(400);
    ok(await js('return !!Array.from(document.querySelectorAll("#kb-h-list .kb-h-repair .kb-h-own")).find((x) => /Nhà như mới/.test(x.textContent));'), 'Sửa xong: "Nhà như mới"' + (lv1 !== null ? '' : ''));
    await fixSky();
  });

  await phase('Trang trí sân (mọi món, đặt ra sân)', async () => {
    await openHome('yard', 'yard');
    for (const it of C.items.filter((i) => i.scene === 'yard' && !i.season && !i.rare && !i.custom)) { await openHome('yard'); await buyItem(it); }
    await openHome('yard', 'yard'); await shot('03_tab_trang_tri_san', 'mua hết, “Đã có”');
  });
  await phase('Mở rộng nhà (1.24: Bếp, Phòng ngủ)', async () => {
    for (const rm of (C.rooms || [])) {
      await openHome('build');
      const c0 = await coins();
      const r = await js(`const c = document.querySelector('.kb-h-room[data-room="${rm.id}"]'); if (!c) return null; const b = c.querySelector(".kb-h-buy"); if (!b || b.disabled) return b ? "khoá" : null; b.click(); return b.textContent;`);
      const got = await waitPy(`result = ${JSON.stringify(rm.id)} in (st.load()["home"].get("rooms") or [])`);
      ok(got && c0 - (await coins()) === rm.price, 'Mở rộng nhà: ' + rm.name + ' ' + rm.price + ' xu' + (r === 'Mở rộng' ? '' : ' — ' + r));
    }
    await openHome('build'); await shot('03b_mo_rong_nha', 'hai gian đã mở');
  });
  await phase('Nội thất (mọi món, đặt trong phòng)', async () => {
    await openHome('room', 'room');
    for (const it of C.items.filter((i) => i.scene === 'room' && !i.season && !i.rare && !i.custom)) { await openHome('room'); await buyItem(it); }
    await openHome('room', 'room'); await shot('04_tab_noi_that_phong_day');
  });
  await phase('6 vùng + đồ của từng vùng', async () => {
    for (const z of C.zones) {
      await openHome('zone');
      const c0 = await coins();
      const r = await cardBtn(z.name, /^Mở khoá$/);
      const got = r.btn && !r.disabled && await waitPy(`result = ${JSON.stringify(z.id)} in st.load()["more"]["zones"] or ${JSON.stringify(z.id)} in (st.load()["home"].get("zones") or [])`);
      ok(got && c0 - (await coins()) === z.price, 'Mở vùng "' + z.name + '" ' + z.price + ' xu' + (r.btn ? '' : ' — ' + JSON.stringify(r)));
      for (const it of C.items.filter((i) => i.zone === z.id && !i.season)) { await openHome('zone', z.id); await buyItem(it); }
    }
    await openHome('zone'); await shot('05_tab_vung_moi_mo_het');
  });
  console.log('  mua đồ thường: ' + buyLog.bought + ' món, đặt ' + buyLog.placed + ', vào kho ' + buyLog.stored);
  ok(buyLog.bad.length === 0, 'mọi lần bấm Mua trừ đúng giá, có đồ, đặt được ' + buyLog.bad.slice(0, 6).join(' | '));

  await phase('Thú nuôi', async () => {
    await openHome('pet', 'yard');
    await shot('06_tab_thu_nuoi_chua_co');
    for (const sp of C.more.pets) {
      await openHome('pet');
      const c0 = await coins();
      const r = await cardBtn(sp.name, /^Nhận nuôi/);
      const got = r.btn && !r.disabled && await waitPy(`result = ${JSON.stringify(sp.id)} in st.load()["more"]["pets"]`);
      ok(got && c0 - (await coins()) === sp.price, 'Nhận nuôi "' + sp.name + '" ' + sp.price + ' xu');
    }
    // đổi tên + chỗ ở (mèo vào trong nhà, rùa ra bãi biển)
    await openHome('pet');
    const cat0 = C.more.pets.find((p) => p.room);
    await js(`const c = Array.from(document.querySelectorAll("#kb-h-list .kb-h-petcard")).find((k) => k.querySelector(".kb-h-name").textContent.indexOf(${JSON.stringify(cat0.name)}) >= 0);
      const inp = c.querySelector("input.kb-h-input"); inp.focus(); inp.select(); return 1;`);
    await page.send('Input.insertText', { text: 'Mochi' });
    await js(`const c = Array.from(document.querySelectorAll("#kb-h-list .kb-h-petcard")).find((k) => k.querySelector(".kb-h-name").textContent.indexOf(${JSON.stringify(cat0.name)}) >= 0);
      Array.from(c.querySelectorAll("button")).find((x) => x.textContent === "Đặt tên").click(); return 1;`);
    ok(await waitPy(`result = st.load()["more"]["pets"][${JSON.stringify(cat0.id)}]["name"] == "Mochi"`), 'Đặt tên thú "' + cat0.name + '" → Mochi');
    await openHome('pet');
    await js(`const c = Array.from(document.querySelectorAll("#kb-h-list .kb-h-petcard")).find((k) => k.querySelector(".kb-h-name").textContent.indexOf("Mochi") >= 0);
      const s = c.querySelector("select"); s.value = "room"; s.dispatchEvent(new Event("change")); return 1;`);
    ok(await waitPy(`result = st.load()["more"]["pets"][${JSON.stringify(cat0.id)}].get("scene") == "room"`), 'Mochi chuyển vào trong nhà');
    // để cả nhà đói (hôm qua chưa cho ăn) rồi bấm "Cho cả nhà ăn"
    await py(KB + `d = st.load()
for p in d["more"]["pets"].values():
    for k in ("fed", "last", "day"):
        if isinstance(p.get(k), int): p[k] = st._day() - 2
st.save(d); kb._dialog.refresh(); result = {k: v for k, v in d["more"]["pets"].items()}`);
    await sleep(1800); await hideToast();
    await openHome('pet'); await shot('06_tab_thu_nuoi_doi', 'cả nhà đói / đi chơi');
    const all = await js(`const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => /^Cho cả nhà ăn/.test(x.textContent)); if (!b || b.disabled) return null; const t = b.textContent; b.click(); return t;`);
    const c0 = await coins();
    const fed = all && await waitPy(`result = st.load()["coins"] < ${c0} or True`);
    await sleep(800);
    const c1 = await coins();
    ok(all && fed, 'Cho cả nhà ăn: "' + all + '"');
    ok(await js('return !!Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => /Hôm nay đã cho ăn hết/.test(x.textContent));'), 'Sau khi cho ăn: "Hôm nay đã cho ăn hết ✓"');
    await js(`const cb = document.querySelector("#kb-h-list .kb-h-auto input"); cb.click(); return 1;`);
    ok(await waitPy('result = st.load()["more"]["pet_auto"] == True'), 'Bật "Tự cho ăn mỗi ngày"');
    await openHome('pet'); await shot('06_tab_thu_nuoi_du', '6 thú, đã cho ăn');
    void c1;
  });

  await phase('Giống cây (mua 8 giống + luật gieo)', async () => {
    for (const s of C.more.seeds) {
      await openHome('seed');
      const c0 = await coins();
      const r = await cardBtn(s.name, /^Mua giống/);
      const got = r.btn && !r.disabled && await waitPy(`result = ${JSON.stringify(s.id)} in st.load()["more"]["seeds"]["owned"]`);
      ok(got && c0 - (await coins()) === s.price, 'Mua giống "' + s.name + '" ' + s.price + ' xu');
    }
    await openHome('seed'); await shot('07_tab_giong_cay_du');
    // deck đang xem: lần lượt từng giống (chụp ruộng), rồi Trộn
    const deckId = await py(KB + 'result = str(kb._dialog.deck_id)');
    for (const s of C.more.seeds.concat([{ id: 'mix', name: 'Trộn' }])) {
      await openHome('seed');
      await js(`const r = Array.from(document.querySelectorAll("#kb-h-list .kb-h-rule")).find((x) => /^Deck “/.test(x.textContent) && x.querySelector("select"));
        const s = r.querySelector("select"); s.value = ${JSON.stringify(s.id)}; s.dispatchEvent(new Event("change")); return 1;`);
      const set = await waitPy(`result = st.load()["more"]["seeds"]["deck"].get(${JSON.stringify(deckId)}) == ${JSON.stringify(s.id)}`);
      ok(set, 'Gieo "' + s.name + '" cho deck đang xem');
      await sleep(1500); await closeHome(); await hideToast(); await sleep(500);
      await shot('07_ruong_' + s.id);
    }
    // luật loại note + tag + bỏ luật
    await openHome('seed');
    await js(`const r = Array.from(document.querySelectorAll("#kb-h-list .kb-h-rule")).find((x) => /^Note Từ vựng/.test(x.textContent));
      const s = r.querySelector("select"); s.value = ${JSON.stringify(C.more.seeds[2].id)}; s.dispatchEvent(new Event("change")); return 1;`);
    ok(await waitPy(`result = st.load()["more"]["seeds"]["kind"].get("vocab") == ${JSON.stringify(C.more.seeds[2].id)}`), 'Luật loại note Từ vựng → ' + C.more.seeds[2].name);
    await openHome('seed');
    await js('const i = Array.from(document.querySelectorAll("#kb-h-list .kb-h-rule input.kb-h-input")).pop(); i.focus(); return 1;');
    await page.send('Input.insertText', { text: 'N5' });
    await js(`const r = Array.from(document.querySelectorAll("#kb-h-list .kb-h-rule")).pop(); const s = r.querySelector("select"); s.value = ${JSON.stringify(C.more.seeds[5].id)};
      Array.from(r.querySelectorAll("button")).find((x) => x.textContent === "Thêm luật tag").click(); return 1;`);
    ok(await waitPy(`result = any(t[0] == "N5" for t in st.load()["more"]["seeds"]["tag"])`), 'Thêm luật tag N5 → ' + C.more.seeds[5].name);
    await openHome('seed'); await shot('07_tab_giong_cay_luat', 'luật deck / loại note / tag');
    await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-rule")).find((x) => /^Tag “N5”/.test(x.textContent)).querySelector("button"); b.click(); return 1;');
    ok(await waitPy('result = not st.load()["more"]["seeds"]["tag"]'), 'Bỏ luật tag');
  });

  await phase('Giao diện mùa (đổi chuỗi, mua hết, xem thử, dùng từng giao diện)', async () => {
    await openHome('season', 'yard');
    await shot('08_tab_giao_dien_mua_dau');
    const T = C.themes;
    const first = T.find((t) => t.streak <= 10);
    const r0 = await cardBtn(first.name, /^Đổi chuỗi/);
    ok(r0.btn && !r0.disabled && await waitPy(`result = ${JSON.stringify(first.id)} in st.load()["season"]["unlocked"]`), 'Mở "' + first.name + '" bằng chuỗi ngày ôn (' + (r0.text || '') + ')');
    for (const t of T) {
      if (await py(KB + `result = ${JSON.stringify(t.id)} in st.load()["season"]["unlocked"]`)) continue;
      await openHome('season');
      const c0 = await coins();
      const r = await cardBtn(t.name, /^Mở khoá · /);
      const got = r.btn && !r.disabled && await waitPy(`result = ${JSON.stringify(t.id)} in st.load()["season"]["unlocked"]`);
      ok(got && c0 - (await coins()) === t.price, 'Mở giao diện "' + t.name + '" ' + t.price + ' xu');
      const gift = await py(KB + `o = st.load()["home"]["owned"]; result = all(o.get(i, 0) > 0 for i in ${JSON.stringify(t.items)})`);
      if (!gift) ok(false, '"' + t.name + '": không nhận đủ đồ tặng kèm');
    }
    // đặt đồ tặng kèm: mỗi vùng một giao diện
    const scenes = ['yard'].concat(C.zones.map((z) => z.id));
    let si = 0, put = 0, left = 0;
    for (const t of T) {
      for (const id of t.items) {
        const it = C.items.find((x) => x.id === id);
        const sc = it.scene === 'room' ? 'room' : scenes[si % scenes.length];
        await js(`GardenHome.startPlacing(${JSON.stringify(id)}, undefined, ${JSON.stringify(sc)}); return 1;`);
        const p = await placeNow(id);
        if (p.placed) put++; else left++;
      }
      si++;
    }
    console.log('  đồ giao diện mùa: đặt ' + put + ', để kho ' + left);
    // xem thử một giao diện đã mở mà chưa dùng
    await openHome('season');
    const other = T.find((t) => t.id !== 'none');
    const tr = await cardBtn(other.name, /^Xem thử$/);
    await sleep(600);
    ok(tr.btn && await js('return GardenSeason.previewing ? !!GardenSeason.previewing() : true;'), 'Xem thử "' + other.name + '"');
    await shot('08_xem_thu', 'đang xem thử');
    await js('const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => x.textContent === "Dừng xem thử"); if (b) b.click(); return 1;');
    // dùng ngay từng giao diện → chụp sân
    for (const t of T) {
      await openHome('season');
      const r = await cardBtn(t.name, /^Dùng ngay$/);
      const used = r.btn && await waitPy(`s = st.load()["season"]; result = s.get("mode") == "pick" and s.get("pick") == ${JSON.stringify(t.id)}`);
      if (!used) ok(false, 'Dùng ngay "' + t.name + '" ' + JSON.stringify(r));
      await sleep(500); await closeHome(); await hideToast(); await sleep(700);
      await shot('08_gd_' + t.id + '_san');
    }
    ok(true, 'Dùng ngay đủ ' + T.length + ' giao diện');
    await openHome('season');
    await js('const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => x.textContent === "Tắt"); b.click(); return 1;');
    ok(await waitPy('result = st.load()["season"]["mode"] == "off"'), 'Giao diện mùa: Tắt');
    await openHome('season');
    await js('const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => x.textContent === "Tự động"); b.click(); return 1;');
    ok(await waitPy('result = st.load()["season"]["mode"] == "auto"'), 'Giao diện mùa: Tự động');
    await openHome('season');
    ok(await js('return /Đã mở cả \\d+ giao diện/.test(document.querySelector("#kb-h-list .kb-h-season-top").textContent);'), 'Mở hết giao diện mùa: không còn nhắc cách mở khoá');
    await shot('08_tab_giao_dien_mua_mo_het');
  });

  await phase('Tủ đồ StackChan + biểu cảm', async () => {
    for (const w of C.wear) {
      await openHome('wear');
      const c0 = await coins();
      const r = await cardBtn(w.name, /^Mua$/);
      const got = r.btn && !r.disabled && await waitPy(`result = ${JSON.stringify(w.id)} in st.load()["wear"]["owned"]`);
      ok(got && c0 - (await coins()) === w.price, 'Mua đồ mặc "' + w.name + '" ' + w.price + ' xu');
    }
    for (const f of C.faces) {
      await openHome('wear');
      const c0 = await coins();
      const r = await cardBtn(f.name, /^Mua · /);
      const got = r.btn && !r.disabled && await waitPy(`result = ${JSON.stringify(f.id)} in st.load()["wear"]["faces"]`);
      ok(got && c0 - (await coins()) === f.price, 'Mua biểu cảm "' + f.name + '" ' + f.price + ' xu');
    }
    // mặc từng món một lần (Mặc), cởi qua nút trên đầu
    await openHome('wear');
    const first = C.wear[0];
    const m = await cardBtn(first.name, /^Mặc$/);
    if (m.btn) ok(await waitPy(`result = st.load()["wear"]["on"].get(${JSON.stringify(first.slot)}) == ${JSON.stringify(first.id)}`), 'Mặc lại "' + first.name + '"');
    await openHome('wear'); await shot('09_tu_do_mac_du');
    const off = await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-wear-top button")).find((x) => /^Cởi /.test(x.textContent)); if (!b) return null; const t = b.textContent; b.click(); return t;');
    ok(!!off && await waitPy('result = len(st.load()["wear"]["on"]) < 4'), 'Cởi: ' + off);
    const tog = await js('const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => x.textContent === "Đang dùng · tắt"); if (!b) return false; b.click(); return true;');
    ok(tog && await waitPy('result = len(st.load()["wear"].get("faces_off") or []) == 1'), 'Tắt một biểu cảm');
    await closeHome(); await sleep(400); await shot('09_san_stackchan_mac_do');
  });

  await phase('Xưởng: vẽ bằng chuột, mọi công cụ, 3 cỡ / 3 loại', async () => {
    await openHome('craft', 'yard');
    await shot('10_tab_xuong_trong');
    await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new button")).find((x) => x.textContent === "Mở xưởng"); b.click(); return 1;');
    ok(await waitFor('GardenCraft.isOpen()'), 'Mở Xưởng từ thẻ "Tạo món đồ mới"');
    await typeInto('#kb-cf-name', 'Đèn hoa');
    await selectVal('#kb-cf-size', '24'); await sleep(200);
    ok((await cfState()).size === 24, 'Đổi cỡ 24×24');
    await tool('pen'); await color('k');
    await stroke([[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [8, 2]]);
    let s = await cfState();
    ok(inked(s.px) >= 7, 'Bút: kéo chuột vẽ ' + inked(s.px) + ' ô');
    await tool('rect'); await color('r'); await stroke([[3, 5], [9, 5], [12, 12]]);
    s = await cfState(); ok(inked(s.px) > 20, 'Chữ nhật: ' + inked(s.px) + ' ô');
    await tool('fill'); await color('y'); await stroke([[6, 8]]);
    const afterFill = inked((await cfState()).px);
    ok(afterFill > inked(s.px), 'Đổ màu trong khung: ' + afterFill + ' ô');
    await tool('line'); await color('G'); await stroke([[14, 2], [16, 8], [20, 20]]);
    ok(inked((await cfState()).px) > afterFill, 'Kẻ thẳng');
    await js('document.getElementById("kb-cf-mirror").click(); return 1;');
    await tool('pen'); await color('p'); await stroke([[1, 18], [2, 19], [3, 20]]);
    s = await cfState();
    ok(s.px[(18 * 24) + 22] === 'p', 'Đối xứng: vẽ bên trái, bên phải tự vẽ theo');
    await js('document.getElementById("kb-cf-mirror").click(); return 1;');
    await js('document.querySelector(\'.kb-cf-brush [data-brush="2"]\').click(); return 1;');
    await tool('erase'); await stroke([[3, 2], [4, 2]]);
    ok((await cfState()).brush === 2, 'Cỡ bút 2 + tẩy');
    const pre = (await cfState()).px;
    await stroke([[10, 10], [11, 10]], 'right');
    await js('document.getElementById("kb-cf-undo").click(); return 1;');
    await js('document.getElementById("kb-cf-redo").click(); return 1;');
    await js('document.getElementById("kb-cf-undo").click(); return 1;');
    ok((await cfState()).px === pre, 'Chuột phải tẩy + Hoàn tác / Làm lại');
    for (const id of ['kb-cf-flip', 'kb-cf-flipv', 'kb-cf-outline']) { await js(`document.getElementById("${id}").click(); return 1;`); }
    await page.key('ArrowLeft', 'ArrowLeft', 37);
    ok((await cfState()).px !== pre, 'Lật ngang / lật dọc / viền đen / mũi tên dịch hình');
    await tool('pick'); await stroke([[6, 8]]);
    ok((await cfState()).tool !== 'pick' || (await cfState()).color !== 'p', 'Hút màu');
    await selectVal('#kb-cf-fx', 'sparkle');
    await shot('10_xuong_dang_ve', 'đã dùng mọi công cụ');
    const label = await js('return document.getElementById("kb-cf-save").textContent;');
    const c0 = await coins();
    await js('document.getElementById("kb-cf-save").click(); return 1;');
    const made = await waitPy(`result = st.load()["coins"] < ${c0}`);
    ok(made && c0 - (await coins()) === C.craft.prices['24'], 'Chế tác 24×24 (' + label + ') trừ ' + C.craft.prices['24'] + ' xu');
    await sleep(300);
    const p = await placeNow('');
    ok(p.placed, 'Món vừa làm tự vào chế độ đặt và đặt được ra sân');
    // chuyển ảnh qua nút "Chọn ảnh…" (hộp chọn file trả lời bằng file PNG dựng sẵn) — 32×32, đồ treo tường
    const dataUrl = await js(`const c = document.createElement("canvas"); c.width = 240; c.height = 240; const x = c.getContext("2d");
      x.fillStyle = "#f4f2ee"; x.fillRect(0, 0, 240, 240);
      const g = x.createRadialGradient(110, 100, 8, 120, 120, 100); g.addColorStop(0, "#ffd0dc"); g.addColorStop(0.6, "#e0607e"); g.addColorStop(1, "#a03050");
      x.fillStyle = g; x.beginPath(); x.arc(120, 115, 90, 0, 7); x.fill(); x.fillStyle = "#3c8a30"; x.fillRect(110, 200, 20, 40);
      return c.toDataURL("image/png");`);
    await py(KB + `import base64
open("/tmp/kb_full_pick.png", "wb").write(base64.b64decode(${JSON.stringify(dataUrl.split(',')[1])}))
kb.getFile = lambda parent, title, cb, filter=None, key=None, **kw: cb("/tmp/kb_full_pick.png")
result = 1`);
    await openHome('craft');
    await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new button")).find((x) => x.textContent === "Mở xưởng"); b.click(); return 1;');
    await waitFor('GardenCraft.isOpen()');
    await selectVal('#kb-cf-size', '32'); await selectVal('#kb-cf-kind', 'wall');
    await js('document.getElementById("kb-cf-pick").click(); return 1;');
    const conv = await waitFor('(() => { const s = GardenCraft._state(); return s.px.replace(/\\./g, "").length > 200 ? s.px : false; })()', 10000);
    ok(!!conv, 'Chọn ảnh… → ảnh chuyển thành pixel 32×32');
    const pinkish = conv ? (conv.match(/[pPrR]/g) || []).length : 0, brown = conv ? (conv.match(/[bBtE]/g) || []).length : 0;
    ok(pinkish > 150 && brown === 0, 'Ảnh hoa hồng: ' + pinkish + ' ô hồng / đỏ, ' + brown + ' ô nâu');
    for (const opt of ['kb-cf-bg', 'kb-cf-ol', 'kb-cf-few']) { await js(`document.getElementById("${opt}").click(); return 1;`); await sleep(200); }
    await shot('10_xuong_chuyen_anh', 'đã tắt Xoá nền / Viền đen / Gọn màu');
    for (const opt of ['kb-cf-bg', 'kb-cf-ol', 'kb-cf-few']) { await js(`document.getElementById("${opt}").click(); return 1;`); await sleep(200); }
    await typeInto('#kb-cf-name', 'Tranh hoa hồng');
    const c1 = await coins();
    await js('document.getElementById("kb-cf-save").click(); return 1;');
    ok(await waitPy(`result = st.load()["coins"] < ${c1}`) && c1 - (await coins()) === C.craft.prices['32'], 'Chế tác 32×32 treo tường ' + C.craft.prices['32'] + ' xu');
    await sleep(300);
    const pw = await placeNow('');
    ok(pw.placed || (/hết chỗ ở room/.test(pw.why || '') && await py(KB + 'c = st.load(); result = any(v["name"] == "Tranh hoa hồng" for v in c["craft"]["items"].values())')),
      'Tranh treo tường: đặt lên tường, tường kín thì vào kho (' + (pw.placed ? 'đã đặt' : pw.why) + ')');
    // 16×16 sàn, hiệu ứng tim bay
    await openHome('craft');
    await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new button")).find((x) => x.textContent === "Mở xưởng"); b.click(); return 1;');
    await waitFor('GardenCraft.isOpen()');
    await selectVal('#kb-cf-size', '16'); await selectVal('#kb-cf-kind', 'floor'); await selectVal('#kb-cf-fx', 'hearts');
    await tool('rect'); await color('v'); await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Shift', code: 'ShiftLeft', modifiers: 8 });
    const [ax, ay] = await cellPt(3, 6), [bx, by] = await cellPt(12, 15);
    await mouse('mouseMoved', ax, ay, 'left', 8); await mouse('mousePressed', ax, ay, 'left', 8); await mouse('mouseMoved', bx, by, 'left', 8); await mouse('mouseReleased', bx, by, 'left', 8);
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft' });
    ok(inked((await cfState()).px) >= 90, 'Shift + chữ nhật: tô kín ' + inked((await cfState()).px) + ' ô');
    await typeInto('#kb-cf-name', 'Gối tím');
    const c2 = await coins();
    await js('document.getElementById("kb-cf-save").click(); return 1;');
    ok(await waitPy(`result = st.load()["coins"] < ${c2}`) && c2 - (await coins()) === C.craft.prices['16'], 'Chế tác 16×16 sàn ' + C.craft.prices['16'] + ' xu');
    await sleep(300);
    ok((await placeNow('')).placed, 'Gối tím đặt dưới sàn phòng');
    await closeHome(); await sleep(300);
    await openHome('craft', 'room'); await shot('10_tab_xuong_3_mon', '3 món tự làm');
    // sửa (50 xu), +1 cái, mã chia sẻ, xoá (món đã đặt thì nút xoá khoá)
    const items = await py(KB + 'result = {k: v["name"] for k, v in st.load()["craft"]["items"].items()}');
    const gid = Object.keys(items).find((k) => items[k] === 'Gối tím');
    const e = await cardBtn('Gối tím', /^Sửa · /);
    await waitFor('GardenCraft.isOpen()');
    await tool('pen'); await color('w'); await stroke([[7, 9], [8, 9]]);
    const c3 = await coins();
    await js('document.getElementById("kb-cf-save").click(); return 1;');
    ok(e.btn && await waitPy(`result = st.load()["coins"] < ${c3}`) && c3 - (await coins()) === C.craft.edit, 'Sửa món (vẽ lại hình) ' + C.craft.edit + ' xu');
    // chỉ đổi tên / hiệu ứng: miễn phí
    await openHome('craft');
    await cardBtn('Gối tím', /^Sửa · /);
    await waitFor('GardenCraft.isOpen()');
    await typeInto('#kb-cf-name', 'Gối tím mộng mơ'); await selectVal('#kb-cf-fx', 'notes');
    const freeLab = await js('return document.getElementById("kb-cf-save").textContent;');
    const c3b = await coins();
    await js('document.getElementById("kb-cf-save").click(); return 1;');
    ok(/miễn phí/.test(freeLab) && await waitPy('result = any(v["name"] == "Gối tím mộng mơ" for v in st.load()["craft"]["items"].values())') && c3b === await coins(),
      'Sửa món chỉ đổi tên + hiệu ứng: miễn phí (nút "' + freeLab + '")');
    await openHome('craft');
    await cardBtn('Gối tím mộng mơ', /^Sửa · /); await waitFor('GardenCraft.isOpen()');
    await typeInto('#kb-cf-name', 'Gối tím'); await js('document.getElementById("kb-cf-save").click(); return 1;');
    await waitPy('result = any(v["name"] == "Gối tím" for v in st.load()["craft"]["items"].values())');
    await openHome('craft');
    const c4 = await coins();
    const cp = await cardBtn('Gối tím', /^\+1 cái/);
    ok(cp.btn && await waitPy(`result = st.load()["home"]["owned"].get(${JSON.stringify(gid)}, 0) == 2`) && c4 - (await coins()) === priceIn(cp.text), '+1 cái (' + cp.text + ')');
    await openHome('craft');
    const del = await cardBtn('Gối tím', /Xoá mẫu/, false);
    ok(del.btn && del.disabled, 'Món đang đặt: nút "Xoá mẫu" khoá (' + del.title + ')');
  });

  await phase('Kho đồ: Đặt / Di chuyển / Cất vào kho', async () => {
    await openHome('inv', 'yard');
    await shot('11_kho_do');
    const sc = 'yard';
    const n0 = await placedN(sc);
    await js(`GardenHome._popFor("${sc}", 0); return 1;`); await sleep(300);
    await shot('11_bang_mon_da_dat', 'bấm một món trên sân');
    await js('document.getElementById("kb-h-take").click(); return 1;');
    ok(await waitPy(`result = len(st.load()["home"]["${sc}"]) == ${n0 - 1}`), 'Cất vào kho');
    await openHome('inv');
    const placeBtn = await js('const b = Array.from(document.querySelectorAll("#kb-h-list button")).find((x) => x.textContent === "Đặt"); if (!b) return false; b.click(); return true;');
    const p = placeBtn && await placeNow('');
    ok(p && p.placed, 'Kho đồ → Đặt lại');
    await js(`GardenHome._popFor("${sc}", 1); return 1;`); await sleep(200);
    await js('document.getElementById("kb-h-move").click(); return 1;');
    const before = await py(KB + `result = st.load()["home"]["${sc}"][1]`);
    const mv = await placeNow('');
    const after = await py(KB + `result = st.load()["home"]["${sc}"][1]`);
    ok(mv.placed !== undefined && (after.x !== before.x || after.y !== before.y || !mv.cell), 'Di chuyển món (' + JSON.stringify(before) + ' → ' + JSON.stringify(after) + ')');
  });

  await phase('Đồ hiếm (18 món) đặt từ Kho đồ', async () => {
    await py(KB + `d = st.load()
for k, v in kb.core.CATALOG.items():
    if v.get("rare"): d["home"]["owned"][k] = max(1, d["home"]["owned"].get(k, 0))
st.save(d); kb._dialog.refresh(); result = 1`); await sleep(1800); await hideToast();
    let put = 0, left = 0;
    for (const it of C.items.filter((i) => i.rare)) {
      await openHome('inv', it.scene === 'room' ? 'room' : 'yard');
      const r = await cardBtn(it.name, /^Đặt$/);
      if (!r.btn) { left++; continue; }
      const sc = it.scene === 'room' ? 'room' : 'yard';
      let p = await placeNow(it.id);
      if (!p.placed && sc === 'yard') {
        for (const z of C.zones.map((x) => x.id)) { await js(`GardenHome.startPlacing(${JSON.stringify(it.id)}, undefined, ${JSON.stringify(z)}); return 1;`); p = await placeNow(it.id); if (p.placed) break; }
      }
      if (p.placed) put++; else left++;
    }
    ok(put >= 10, 'Đặt đồ hiếm: ' + put + ' món ra cảnh, ' + left + ' món còn trong kho (hết chỗ)');
    await openHome('inv');
    const first = await js('const e = document.querySelector("#kb-h-list > *"); return e ? e.textContent : "";');
    ok(left === 0 || /^Trong kho · chưa đặt/.test(first), 'Kho đồ: món còn trong kho lên đầu ("' + first.slice(0, 40) + '")');
    await shot('11_kho_do_co_do_hiem');
  });

  await phase('Vùng tự tạo (công trình + cảnh nền) + mã chia sẻ', async () => {
    await openHome('zone');
    await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new button")).find((x) => x.textContent === "Mở xưởng vùng"); b.click(); return 1;');
    ok(await waitFor('GardenCraft.isOpen() && GardenCraft._state().zone'), 'Mở xưởng vùng');
    await typeInto('#kb-cf-name', 'Vườn trà hồng');
    const bgs = await js('return Array.from(document.querySelectorAll("#kb-cf-bgsel option")).map((o) => o.value);');
    await selectVal('#kb-cf-bgsel', bgs[2] || bgs[0]);
    await js('const g = document.querySelectorAll("#kb-cf-ground .kb-cf-sw")[3]; if (g) g.click(); const h = document.querySelectorAll("#kb-cf-hills .kb-cf-sw")[5]; if (h) h.click(); return 1;');
    await tool('rect'); await color('R');
    await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Shift', code: 'ShiftLeft', modifiers: 8 });
    const [ax, ay] = await cellPt(10, 30), [bx, by] = await cellPt(50, 70);
    await mouse('mouseMoved', ax, ay, 'left', 8); await mouse('mousePressed', ax, ay, 'left', 8); await mouse('mouseMoved', bx, by, 'left', 8); await mouse('mouseReleased', bx, by, 'left', 8);
    await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Shift', code: 'ShiftLeft' });
    await tool('rect'); await color('B'); await stroke([[8, 20], [30, 12], [54, 28]]);
    ok(((await cfState()).lm || '').length > 10, 'Vẽ công trình 64×76');
    await js('document.querySelector(\'#kb-cf-zone [data-layer="env"]\').click(); return 1;'); await sleep(300);
    await tool('line'); await color('w');
    await stroke([[80, 10], [120, 10], [200, 12]]);
    ok(((await cfState()).env || '').length > 4, 'Vẽ cảnh nền 256×76');
    await shot('12_xuong_vung', 'lớp Cảnh nền');
    const c0 = await coins();
    await js('document.getElementById("kb-cf-save").click(); return 1;');
    ok(await waitPy(`result = st.load()["coins"] < ${c0}`) && c0 - (await coins()) === C.more.uzone.price, 'Tạo vùng ' + C.more.uzone.price + ' xu');
    await sleep(800); await openHome('zone'); await shot('12_tab_vung_tu_tao');
    const sh = await cardBtn('Vườn trà hồng', /^Mã chia sẻ$/);
    const code = sh.btn && await waitFor('(() => { const t = document.querySelector("#kb-h-list .kb-h-share textarea[readonly]"); return t && t.value; })()');
    ok(code && /^KB1:z:/.test(code), 'Mã chia sẻ vùng: ' + (code ? code.length + ' ký tự' : 'không có'));
    const clip = await py(KB + 'from aqt.qt import QApplication; result = QApplication.clipboard().text()');
    ok(clip === code, 'Mã vùng đã chép vào bộ nhớ tạm');
    // dán mã ở tab Xưởng → xem trước → tạo vùng
    await openHome('craft');
    await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = ${JSON.stringify(code || '')}; t.dispatchEvent(new Event("input"));
      Array.from(document.querySelectorAll("#kb-h-list .kb-h-paste button")).find((x) => x.textContent === "Xem trước").click(); return 1;`);
    const pk = await waitFor('document.querySelector("#kb-h-list .kb-h-peek") && document.querySelector("#kb-h-list .kb-h-peek").textContent');
    ok(pk && /Vườn trà hồng/.test(pk), 'Xem trước vùng từ mã');
    await shot('12_dan_ma_vung');
    const c1 = await coins();
    const mk = await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-peek button")).find((x) => /^Tạo vùng này/.test(x.textContent)); if (!b || b.disabled) return null; const t = b.textContent; b.click(); return t;');
    ok(mk && await waitPy(`result = len(st.load()["more"]["zones"]) == 2`) && c1 - (await coins()) === priceIn(mk), 'Tạo vùng từ mã (' + mk + ')');
    await sleep(800); await closeHome(); await sleep(500); await shot('12_vung_tu_ma_san');
    // sửa vùng: đổi tên miễn phí
    await openHome('zone');
    await cardBtn('Vườn trà hồng', /^Sửa vùng$/);
    await waitFor('GardenCraft.isOpen()');
    const lab = await js('return document.getElementById("kb-cf-save").textContent;');
    await typeInto('#kb-cf-name', 'Vườn trà');
    const c2 = await coins();
    await js('document.getElementById("kb-cf-save").click(); return 1;');
    await waitPy('result = any(z["name"] == "Vườn trà" for z in st.load()["more"]["zones"])');
    ok(c2 === await coins(), 'Đổi tên vùng miễn phí (nút: "' + lab + '")');
  });

  await phase('Giống cây tự vẽ + mã chia sẻ', async () => {
    await openHome('seed');
    await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new button")).find((x) => x.textContent === "Mở xưởng"); b.click(); return 1;');
    ok(await waitFor('GardenCraft.isOpen() && GardenCraft._state().seed'), 'Mở Xưởng giống cây từ tab Giống cây');
    await typeInto('#kb-cf-name', 'Dâu tây');
    await js('document.getElementById("kb-cf-name").blur(); return 1;');
    for (const [k, rows] of [[2, [[7, 14], [7, 13], [7, 12]]], [3, [[7, 14], [7, 10], [5, 9], [9, 9]]], [5, [[7, 14], [7, 8], [4, 6], [10, 6], [6, 11]]]]) {
      await page.key(String(k), 'Digit' + k, 48 + k); await sleep(100);
      await tool('pen'); await color(k === 5 ? 'r' : 'g'); await stroke(rows);
    }
    const s = await cfState();
    ok(s.st.filter(Boolean).length === 3, 'Vẽ 3 giai đoạn (phím 2, 3, 5)');
    await shot('13_xuong_giong_dau');
    const c0 = await coins();
    await js('document.getElementById("kb-cf-save").click(); return 1;');
    ok(await waitPy(`result = st.load()["coins"] < ${c0}`) && c0 - (await coins()) === C.myseed.price, 'Tạo giống ' + C.myseed.price + ' xu');
    await sleep(800);
    await openHome('seed');
    await js(`const r = Array.from(document.querySelectorAll("#kb-h-list .kb-h-rule")).find((x) => /^Deck “/.test(x.textContent) && x.querySelector("select"));
      const s = r.querySelector("select"); const o = Array.from(s.options).find((x) => /Dâu tây/.test(x.textContent)); s.value = o.value; s.dispatchEvent(new Event("change")); return 1;`);
    ok(await waitPy('m = st.load()["more"]; result = any(v.startswith("g") for v in m["myseeds"]["rules"]["deck"].values())'), 'Gieo "Dâu tây (tự vẽ)" cho deck đang xem');
    await sleep(1500); await closeHome(); await hideToast(); await sleep(500);
    await shot('13_ruong_dau_tay');
    await openHome('seed');
    const sh = await cardBtn('Dâu tây', /^Mã chia sẻ$/);
    const code = sh.btn && await waitFor('(() => { const t = document.querySelector("#kb-h-list .kb-h-share textarea[readonly]"); return t && t.value; })()');
    ok(code && /^KB1:g:/.test(code), 'Mã giống cây ' + (code ? code.length + ' ký tự' : ''));
    await shot('13_ma_giong');
    await openHome('craft');
    await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = "  " + ${JSON.stringify(code || '')}.replace(/(.{20})/g, "$1\\n") + "  "; t.dispatchEvent(new Event("input"));
      Array.from(document.querySelectorAll("#kb-h-list .kb-h-paste button")).find((x) => x.textContent === "Xem trước").click(); return 1;`);
    ok(await waitFor('document.querySelector("#kb-h-list .kb-h-peek")'), 'Dán mã bị xuống dòng / thừa dấu cách vẫn xem trước được');
    const c1 = await coins();
    const mk = await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-peek button")).find((x) => /^Tạo giống này/.test(x.textContent)); if (!b || b.disabled) return null; const t = b.textContent; b.click(); return t;');
    ok(mk && await waitPy('result = len(st.load()["more"]["myseeds"]["items"]) == 2') && c1 - (await coins()) === priceIn(mk), 'Tạo giống từ mã (' + mk + ')');
    // mã sai một ký tự / mã rác
    await openHome('craft');
    const bad = code.slice(0, 30) + (code[30] === 'A' ? 'B' : 'A') + code.slice(31);
    await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = ${JSON.stringify(bad)}; t.dispatchEvent(new Event("input"));
      Array.from(document.querySelectorAll("#kb-h-list .kb-h-paste button")).find((x) => x.textContent === "Xem trước").click(); return 1;`);
    const w = await waitFor('(() => { const e = document.querySelector("#kb-h-list .kb-h-paste .kb-h-warn"); return e && e.textContent; })()');
    ok(w && /chép lại|thiếu|sai/.test(w), 'Mã sai một chỗ → "' + w + '"');
    await shot('13_ma_sai');
    // sửa giống: đổi tên miễn phí; xoá (bấm 2 lần)
    await openHome('seed');
    await cardBtn('Dâu tây', /^Sửa · /);
    await waitFor('GardenCraft.isOpen()');
    const lab = await js('return document.getElementById("kb-cf-save").textContent;');
    ok(/miễn phí/.test(lab), 'Sửa giống chưa đổi hình: nút "' + lab + '"');
    await js('GardenCraft.close(); return 1;');
    await openHome('seed');
    const n0 = await py(KB + 'result = len(st.load()["more"]["myseeds"]["items"])');
    await cardBtn('Dâu tây', /^Xoá giống$/); await sleep(200);
    const armed = await cardBtn('Dâu tây', /^Bấm lần nữa/, false);
    ok(armed.btn, 'Bấm "Xoá giống" lần 1: hỏi lại');
    await cardBtn('Dâu tây', /^Bấm lần nữa/);
    ok(await waitPy(`result = len(st.load()["more"]["myseeds"]["items"]) == ${n0 - 1}`), 'Bấm lần 2: xoá giống');
  });

  await phase('Mã chia sẻ món + dán làm món', async () => {
    await openHome('craft');
    const sh = await cardBtn('Đèn hoa', /^Mã chia sẻ$/);
    const code = sh.btn && await waitFor('(() => { const t = document.querySelector("#kb-h-list .kb-h-share textarea[readonly]"); return t && t.value; })()');
    ok(code && /^KB1:m:24/.test(code), 'Mã món 24×24: ' + (code ? code.length + ' ký tự' : ''));
    await js(`const t = document.querySelector("#kb-h-list .kb-h-paste textarea"); t.value = ${JSON.stringify(code || '')}; t.dispatchEvent(new Event("input"));
      Array.from(document.querySelectorAll("#kb-h-list .kb-h-paste button")).find((x) => x.textContent === "Xem trước").click(); return 1;`);
    await waitFor('document.querySelector("#kb-h-list .kb-h-peek")');
    await shot('14_dan_ma_mon');
    const c0 = await coins();
    const mk = await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-peek button")).find((x) => /^Làm món này/.test(x.textContent)); if (!b || b.disabled) return null; const t = b.textContent; b.click(); return t;');
    ok(mk && await waitPy(`result = st.load()["coins"] < ${c0}`) && c0 - (await coins()) === priceIn(mk), 'Làm món từ mã (' + mk + ')');
    await sleep(300);
    const p = await placeNow('');
    ok(p.placed || /hết chỗ/.test(p.why || ''), 'Món từ mã vào chế độ đặt');
  });

  await phase('Cảnh ngoài trời đầy đồ: từng vùng, ngày / đêm / mưa / tuyết + tốc độ vẽ', async () => {
    await closeHome(); await hideToast();
    const scenes = ['yard'].concat(C.zones.map((z) => z.id)).concat(await py(KB + 'result = [z["id"] for z in st.load()["more"]["zones"]]'));
    for (const sc of scenes) {
      await js(`try { localStorage.setItem("kb-main-scene", ${JSON.stringify(sc)}); } catch (e) {} GardenHome.setScene(${JSON.stringify(sc)}); return 1;`);
      await openHome('zone', sc); await closeHome(); await sleep(600);
      await shot('15_canh_' + sc + '_ngay');
      const ms = await page.eval(`GardenHome._bench(${JSON.stringify(sc)}, 30)`);
      ok(ms < 25, 'Vẽ một khung "' + sc + '" đầy đồ: ' + ms.toFixed(1) + ' ms');
    }
    await js('try { localStorage.setItem("kb-main-scene", "yard"); } catch (e) {} GardenHome.setScene("yard"); return 1;');
    await openHome('yard', 'yard'); await closeHome();
    await fixSky(21, 'sunny'); await sleep(900); await shot('15_san_dem', 'đèn, đom đóm');
    await fixSky(15, 'rain'); await sleep(900); await shot('15_san_mua');
    await fixSky(8, 'snow'); await sleep(900); await shot('15_san_tuyet');
    await fixSky();
    await openHome('build', 'room'); await sleep(400); await shot('15_trong_nha_day', 'phòng đầy nội thất + đồ hiếm + mèo');
    await js('GardenHome.setScene("yard"); return 1;');
  });

  await phase('Chụp ảnh vườn (3 cỡ)', async () => {
    await closeHome(); await sleep(300);
    for (const [k, w, h] of [['s', 534, 200], ['l', 1068, 400], ['wall', 1920, 1080]]) {
      await py(KB + 'p = "' + PHOTO + '"\nif os.path.exists(p): os.remove(p)\nresult = 1');
      await js('document.getElementById("kb-yard-snap").click(); return 1;'); await sleep(250);
      if (k === 's') await shot('16_bang_chup_anh');
      await js(`document.querySelector('#kb-snap-pop [data-snap="${k}"]').click(); return 1;`);
      const ok1 = await waitPy('result = os.path.exists("' + PHOTO + '")', 10000);
      const dim = ok1 && await py(KB + 'import struct\nb = open("' + PHOTO + '", "rb").read(24)\nresult = list(struct.unpack(">II", b[16:24]))');
      ok(dim && dim[0] === w && dim[1] === h, 'Ảnh vườn cỡ ' + k + ': ' + JSON.stringify(dim));
      if (dim) fs.copyFileSync(PHOTO, SHOTS + '/anh_vuon_' + k + '.png');
    }
  });

  await phase('Các tab Nhà khi đã có hết (1366 và 1024 px)', async () => {
    for (const [w, h] of [[1366, 768], [1024, 700]]) {
      sizeTag = String(w);
      await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(1200); await hideToast();
      await closeHome(); await sleep(500);
      await shot('20_vuon_day_do');
      await sleep(1200);
      const td = await js(`const t = document.getElementById("kb-today-text"), k = t.querySelector(".kb-today-streak");
        return { cut: t.scrollWidth > t.clientWidth + 1 || k.scrollWidth > k.clientWidth + 1 && getComputedStyle(k).display === "block", text: t.textContent,
          two: t.classList.contains("kb-today-2l"), sw: t.scrollWidth, cw: t.clientWidth };`);
      ok(!td.cut && /\d+ ngày liền/.test(td.text), w + ' px: thẻ Hôm nay không cắt chuỗi ngày ("' + td.text + '"' + (td.two ? ', chuỗi xuống dòng' : '') + ' ' + td.sw + '/' + td.cw + ')');
      const fb = await js(`const f = GardenSeason.field && GardenSeason.field(); const bg = getComputedStyle(document.getElementById("kb-field")).backgroundColor;
        const hex = (c) => "#" + c.match(/\\d+/g).slice(0, 3).map((x) => (+x).toString(16).padStart(2, "0")).join("");
        return { theme: f ? f.base : null, bg: hex(bg) };`);
      ok(!fb.theme || fb.theme === fb.bg, w + ' px: phần thừa bên phải ruộng cùng màu cỏ giao diện mùa (' + fb.bg + ' / ' + fb.theme + ')');
      for (const t of ['build', 'yard', 'room', 'zone', 'pet', 'guest', 'seed', 'season', 'wear', 'craft', 'inv']) {
        await openHome(t, t === 'room' ? 'room' : 'yard'); await sleep(250);
        await shot('21_nha_' + t);
        await js('document.getElementById("kb-h-list").scrollTop = 1e6; return 1;'); await sleep(250);
        await shot('21_nha_' + t + '_cuoi');
      }
      // bảng Nhà / Xưởng vừa cửa sổ dù hàng nút cảnh xuống nhiều dòng; danh sách đồ đủ cao để dùng
      await openHome('craft'); await sleep(300);
      const fit = await js('window.scrollTo(0, 0); const l = document.getElementById("kb-h-list").getBoundingClientRect(), p = document.getElementById("kb-home").getBoundingClientRect(); return { panel: Math.round(p.bottom), h: innerHeight, list: Math.round(l.height) };');
      ok(fit.panel <= fit.h && fit.list >= 170, w + ' px: bảng Nhà nằm gọn trong cửa sổ (đáy ' + fit.panel + ' / ' + fit.h + ' px, danh sách cao ' + fit.list + ' px)');
      const tipOk = await js('const c = document.getElementById("kb-home-canvas").getBoundingClientRect(), t = document.getElementById("kb-h-tip").getBoundingClientRect(), v = document.querySelector("#kb-home .kb-h-view").getBoundingClientRect(); return { c: Math.round(c.bottom), t: Math.round(t.top), tb: Math.round(t.bottom), v: Math.round(v.bottom) };');
      ok(tipOk.t >= tipOk.c - 1 && tipOk.tb <= tipOk.v + 1, w + ' px: dòng gợi ý dưới cảnh không đè lên cảnh / không lọt khỏi khung (cảnh tới ' + tipOk.c + ', gợi ý ' + tipOk.t + '–' + tipOk.tb + ', khung tới ' + tipOk.v + ')');
      await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new button")).find((x) => x.textContent === "Mở xưởng"); b.click(); return 1;');
      await sleep(400);
      const cf = await js('window.scrollTo(0, 0); const g = document.getElementById("kb-cf-grid").getBoundingClientRect(); return { h: innerHeight, gb: Math.round(g.bottom) };');
      ok(cf.gb <= cf.h, w + ' px: Xưởng vừa cửa sổ, lưới vẽ không lọt xuống dưới (lưới tới ' + cf.gb + ' / ' + cf.h + ' px)');
      await shot('22_xuong_moi');
      await js('GardenCraft.close(); return 1;');
      await openHome('seed');
      await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new button")).find((x) => x.textContent === "Mở xưởng"); b.click(); return 1;');
      await sleep(400); await shot('22_xuong_giong');
      await js('GardenCraft.close(); return 1;');
      await openHome('zone');
      await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-craft-new button")).find((x) => x.textContent === "Mở xưởng vùng"); if (b) b.click(); return 1;');
      await sleep(400); await shot('22_xuong_vung');
      await js('GardenCraft.close(); return 1;');
      await closeHome();
    }
    sizeTag = '1366';
    await py(KB + 'kb._dialog.resize(1366, 768); result = 1');
  });

  const errs = await py(KB + 'result = kb.ERRORS.entries()');
  ok(!errs || !errs.length, 'nhật ký lỗi add-on trống ' + (errs && errs.length ? JSON.stringify(errs).slice(0, 800) : ''));
  const flagged = report.filter((r) => r.hscroll || r.cut.length || r.outside.length || r.rows.length || r.style.length || r.errs.length);
  fs.writeFileSync(SHOTS + '/audit_full.json', JSON.stringify(report, null, 1));
  console.log('\nảnh có cờ đo: ' + flagged.length + '/' + report.length);
  const total = await py(KB + 'result = st.load()["coins"]');
  console.log('xu còn lại: ' + total + ' (đã tiêu ' + (1000000 - total) + ')');
  const pass = results.filter(Boolean).length;
  console.log('KẾT QUẢ: ' + pass + '/' + results.length + (fails.length ? '\nSAI:\n  - ' + fails.join('\n  - ') : ''));
  page.close(); process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.stack || e.message); process.exit(2); });
