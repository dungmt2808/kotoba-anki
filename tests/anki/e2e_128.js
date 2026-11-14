// 1.28 trong Anki thật — chỗ lấp lánh (nhặt đồ theo vùng), Hộp sưu tầm, gánh hàng rong + các lỗi audit 12/11 đã sửa.
//   lượt ôn hôm nay (revlog giả, như ôn ở điện thoại) 0 / 9 / 10 / 29 / 30 / 45 → 0 / 0 / 1 / 2 / 3 / 3 chỗ; Tin làng
//   "Ôn thêm … lượt"; bấm chuột thật vào chỗ lấp lánh trên dải cảnh → thẻ "Nhặt được!" (chữ Nhật + cách đọc + nghĩa), chỗ đó
//   biến mất, Python ghi khoá kotoba_batake_events; bấm đúp chỉ nhặt một lần; lệnh giả (chỗ chưa mở, nhặt lại, sai cảnh)
//   bị từ chối; nhiều ngày (giả "hôm nay" bằng kb.cal_today) → đủ bộ Sân vườn → quà Tủ kính vào Kho đồ, nhặt trùng +3 xu;
//   Album → Hộp sưu tầm (chip, 6 / 42, ô đã nhặt / "? ?"); vùng Bãi biển mở → chỗ lấp lánh sang vùng còn thiếu; bấm dòng
//   Tin làng → dải cảnh sang đúng vùng; gánh hàng rong: thứ Tư → người bán ở Sân vườn (chưa có Ga) / Ga làng quê, bảng
//   5 món, mua món riêng (trừ đúng giá), món giảm 25 %, giống cây, mua lại / ngày không có phiên / thiếu xu bị từ chối,
//   "Đã mua · Đặt" → đặt được; cửa hàng không bán món riêng; Esc đóng bảng (cửa sổ vẫn mở); 720 × 520 bảng trong cửa
//   sổ; Lịch hoa ghi "Nhặt được"; Dịu mắt: lấp lánh không nhấp nháy; không lỗi JS / nhật ký lỗi.
// Chạy: KB_SCRIPTS=e2e_128.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_128';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenFinds !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = `import sys, os, json, time, datetime, random
kb = sys.modules["kotoba_batake"]
st = kb.STATE
fc = kb.finds
`;
// "hôm nay" giả cho phần nhặt đồ / gánh hàng (lượt ôn vẫn đếm theo ngày Anki thật)
const DAY = (iso) => `kb.cal_today = (lambda: datetime.date.fromisoformat("${iso}"))\n`;
async function reopen(before) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data() && !!Garden._data().finds', 8000);
  await sleep(400);
}
async function refresh(before) {
  await py(KB + (before || '') + '\nkb._dialog.refresh(); result = 1');
  await sleep(500);
}
// lượt ôn hôm nay: xoá lượt giả cũ rồi thêm n lượt (id trong ngày Anki hiện tại, như lượt ôn trên điện thoại)
const REVIEWS = (n) => `col = mw.col
col.db.execute("delete from revlog where usn = -7")
cids = col.db.list("select id from cards order by id limit 60")
start = kb.core.ngay.days_of(col).rel_start(0) * 1000
now = int(time.time() * 1000)
for i in range(${n}):
    col.db.execute("insert into revlog(id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", max(start + 1000 + i * 37, now - 600000 + i * 37), cids[i % len(cids)], -7, 3 if i % 4 else 1, 10, 5, 2500, 1000, 1)
`;
const RESET = `mw.col.set_config("kotoba_batake_events", {})
d = st.load(); d["coins"] = 5000; d["home"]["house"] = 7; d["home"]["zones"] = []; d["home"]["owned"] = {}
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
st.save(d)
`;
const fv = () => js('return Garden._data().finds;');
// bấm chuột thật vào giữa một vùng bấm của cảnh trên dải màn chính
async function clickMain(kind, k) {
  const pt = await js(`const sc = GardenHome.mainScene(), v = GardenHome._mainView(), cv = document.getElementById("kb-yard");
    const h = GardenFinds._hits(sc).find((x) => x.kind === ${JSON.stringify(kind)} && (${k === undefined ? 'true' : 'x.k === ' + k}));
    if (!h || !v) return null; const r = cv.getBoundingClientRect();
    return [r.left + (h.box.x + h.box.w / 2 + v.ox) * v.S, r.top + (h.box.y + h.box.h / 2 + (v.oy || 0)) * v.S];`);
  if (!pt) { return false; }
  for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x: pt[0], y: pt[1], button: 'left', clickCount: 1 });
  return true;
}
async function sendCmd(cmd) {          // lệnh gửi thẳng (như giao diện cũ / bấm vội), chờ Python trả kết quả
  await js('window.__lastFind = null; const f = Garden.finds; Garden.finds = function (r) { window.__lastFind = r; f(r); Garden.finds = f; }; return 1;');
  await js('pycmd(' + JSON.stringify(cmd) + '); return 1;');
  await waitFor('!!window.__lastFind', 5000);
  return js('return window.__lastFind;');
}
const events = () => py(KB + 'result = mw.col.get_config("kotoba_batake_events", {})');
const coins = () => py(KB + 'result = st.load()["coins"]');
const owned = (id) => py(KB + `result = st.load()["home"]["owned"].get("${id}", 0)`);

(async () => {
  await py(KB + `kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet":"off","trans":"off"})
result = 1`);
  console.log('== 1. lượt ôn → số chỗ lấp lánh');
  await reopen(RESET + REVIEWS(0) + DAY('2026-11-12'));     // thứ Năm: không có phiên gánh hàng
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  for (const [n, want] of [[0, 0], [9, 0], [10, 1], [29, 2], [30, 3], [45, 3]]) {
    await refresh(REVIEWS(n));
    const v = await fv();
    ok(v.reviews === n && v.open === want && v.spots.length === 3 && v.spots.filter((s) => s.open).length === want,
      n + ' lượt → ' + want + ' chỗ mở (open=' + v.open + ', next=' + v.next + ')');
  }
  await refresh(REVIEWS(4));
  const n4 = await js('return Garden._data().news.today.map((x) => x.text);');
  ok(n4.some((t) => /Ôn thêm 6 lượt nữa mở một chỗ lấp lánh/.test(t)), 'Tin làng: "Ôn thêm 6 lượt nữa…" (' + n4.join(' | ') + ')');
  ok((await fv()).spots.every((s) => s.scene === 'yard'), 'chưa mở vùng nào → cả 3 chỗ ở Sân vườn');
  const plan = await events();
  ok(plan.days && plan.days['2026-11-12'] && plan.days['2026-11-12'].spots.length === 3, 'Python chốt cảnh 3 chỗ của ngày vào khoá kotoba_batake_events');

  console.log('== 2. bấm chỗ lấp lánh trên dải cảnh');
  await refresh(REVIEWS(12));
  ok(await waitFor('GardenFinds._hits("yard").some((h) => h.kind === "spot" && h.k === 1)', 3000), 'dải cảnh vẽ chỗ lấp lánh số 1');
  ok((await js('return GardenFinds._hits("yard").filter((h) => h.kind === "spot").length;')) === 1, 'chỉ 1 chỗ (12 lượt)');
  await page.shot(SHOTS + '/128_01_cho_lap_lanh.png');
  const c0 = await coins();
  ok(await clickMain('spot', 1), 'bấm chuột thật vào chỗ lấp lánh');
  ok(await waitFor('GardenFinds._state().card', 4000), 'thẻ "Nhặt được!" hiện');
  const card = await js(`const c = document.getElementById("kb-find-card"); const r = c.getBoundingClientRect();
    return {ja: c.querySelector(".kb-find-ja").textContent, kana: c.querySelector(".kb-find-kana").textContent, line: c.querySelector(".kb-find-line").textContent,
      inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, ico: !!c.querySelector("canvas")};`);
  ok(card.ja && /·/.test(card.kana) && /Nhặt được! Bộ Sân vườn 1 \/ 6/.test(card.line) && card.inside && card.ico,
    'thẻ: ' + card.ja + ' · ' + card.kana + ' · ' + card.line);
  await page.shot(SHOTS + '/128_02_nhat_duoc.png');
  ok(await waitFor('!GardenFinds._hits("yard").some((h) => h.kind === "spot")', 2000), 'chỗ vừa nhặt biến mất');
  let ev = await events();
  ok(Object.keys(ev.found || {}).length === 1 && ev.days['2026-11-12'].picked.join() === '1', 'Python ghi 1 món + chỗ 1 đã nhặt');
  ok((await coins()) === c0, 'món mới: không đổi xu');
  const again = await sendCmd('find:pick:1:yard');
  ok(!again.ok && /nhặt rồi/.test(again.msg), 'nhặt lại chỗ 1 → từ chối (' + again.msg + ')');
  const notOpen = await sendCmd('find:pick:2:yard');
  ok(!notOpen.ok && /Ôn thêm 8 lượt/.test(notOpen.msg), 'chỗ 2 chưa mở (12 lượt) → "' + notOpen.msg + '"');
  await refresh(REVIEWS(30));
  const wrong = await sendCmd('find:pick:2:beach');
  ok(!wrong.ok, 'sai cảnh → từ chối (' + wrong.msg + ')');
  const bad = await sendCmd('find:pick:7:yard');
  ok(!bad.ok, 'chỗ số 7 → từ chối');
  // bấm đúp: hai lệnh liền nhau chỉ nhặt một lần
  await js('GardenFinds._pick(2, "yard"); GardenFinds._pick(2, "yard"); return 1;');
  await sleep(1200);
  ev = await events();
  ok(Object.keys(ev.found).length === 2 && ev.days['2026-11-12'].picked.join() === '1,2', 'bấm đúp chỗ 2 → nhặt đúng một lần');
  await js('pycmd("find:pick:3:yard"); pycmd("find:pick:3:yard"); return 1;');       // lệnh lặp gửi thẳng
  await sleep(1200);
  ev = await events();
  ok(Object.keys(ev.found).length === 3 && ev.days['2026-11-12'].picked.join() === '1,2,3', 'lệnh lặp gửi thẳng → vẫn một lần');

  console.log('== 3. nhiều ngày → đủ bộ Sân vườn, nhặt trùng');
  let day = new Date('2026-11-13T12:00:00Z'), done = null, dupCoins = 0;
  for (let i = 0; i < 4 && !done; i++) {
    const iso = day.toISOString().slice(0, 10);
    await refresh(DAY(iso));
    for (const k of [1, 2, 3]) {
      const c1 = await coins();
      const r = await sendCmd('find:pick:' + k + ':yard');
      if (r.ok && !r.new) { dupCoins += (await coins()) - c1; }
      if (r.ok && r.set && r.set.done) { done = { r: r, day: iso }; }
    }
    day = new Date(day.getTime() + 86400000);
  }
  ok(done && done.r.set.reward === 'tukinh' && /Tủ kính/.test(done.r.set.reward_name), 'đủ 6 món Sân vườn → quà Tủ kính sưu tầm (' + (done && done.day) + ')');
  ok((await owned('tukinh')) === 1, 'Tủ kính vào Kho đồ (owned = 1)');
  ev = await events();
  ok(ev.sets && ev.sets.yard, 'khoá sự kiện ghi đã tặng quà bộ Sân vườn');
  // ngày sau: Sân vườn đã đủ → nhặt trùng +3 xu, không tặng quà lần hai
  await refresh(DAY('2026-11-20'));
  const cA = await coins();
  const dup = await sendCmd('find:pick:1:yard');
  ok(dup.ok && !dup.new && dup.coins === 3 && (await coins()) === cA + 3 && !dup.set.done, 'nhặt trùng → +3 xu, không quà lần hai');
  ok((await owned('tukinh')) === 1, 'Tủ kính vẫn 1');
  await js('GardenFinds.result(window.__lastFind); return 1;');
  await page.shot(SHOTS + '/128_03_nhat_trung.png');

  console.log('== 4. Album → Hộp sưu tầm');
  await js('GardenHome.openBox("yard"); return 1;');
  await sleep(600);
  const box = await js(`const L = document.getElementById("kb-h-list");
    const chips = [...L.querySelectorAll(".kb-album-chip")].map((b) => b.textContent + (b.classList.contains("is-on") ? "*" : ""));
    const sec = [...L.querySelectorAll(".kb-box-sec")].map((s) => s.textContent);
    const cells = [...L.querySelectorAll(".kb-box-cell")];
    return {chips, sec, found: cells.filter((c) => c.classList.contains("is-found")).length, total: cells.length,
      unknown: cells.filter((c) => !c.classList.contains("is-found"))[0].textContent,
      tab: document.querySelector('#kb-home .kb-h-tab[data-tab="guest"]').textContent};`);
  ok(box.tab === 'Album', 'tab Nhà tên "Album"');
  // 1.30: thêm nút thứ ba "Sinh hoạt" (Sổ sinh hoạt của StackChan)
  ok(box.chips.length === 3 && /Hộp sưu tầm · 6\/42\*/.test(box.chips[1]) && /^Sinh hoạt · \d+\/\d+/.test(box.chips[2]), 'ba nút: ' + box.chips.join(' | '));
  ok(box.total === 42 && box.found === 6 && box.sec.length === 7, '7 bộ, 42 ô, 6 đã nhặt');
  ok(/Sân vườn · 6 \/ 6 — đã nhận Tủ kính sưu tầm/.test(box.sec[0]) && /mở vùng để nhặt/.test(box.sec[1]), 'bộ Sân vườn đủ, Bãi biển "mở vùng để nhặt"');
  ok(/\? \?/.test(box.unknown), 'ô chưa nhặt: "? ?" (' + box.unknown + ')');
  await page.shot(SHOTS + '/128_04_hop_suu_tam.png');
  for (const [w, h] of [[1024, 700], [720, 520]]) {          // ô Hộp sưu tầm không tràn chữ ở cửa sổ nhỏ
    await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(700);
    const lay = await js(`const L = document.getElementById("kb-h-list"), lr = L.getBoundingClientRect();
      const cells = [...L.querySelectorAll(".kb-box-cell")];
      const over = cells.filter((c) => c.scrollWidth > c.clientWidth + 1 || [...c.children].some((x) => x.getBoundingClientRect().right > c.getBoundingClientRect().right + 1));
      const out = cells.filter((c) => { const r = c.getBoundingClientRect(); return r.left < lr.left - 1 || r.right > lr.right + 1; });
      const cols = new Set(cells.slice(0, 6).map((c) => Math.round(c.getBoundingClientRect().top))).size === 1 ? 6 : new Set(cells.slice(0, 6).map((c) => Math.round(c.getBoundingClientRect().left))).size;
      return {over: over.map((c) => c.getAttribute("data-find")), out: out.length, cols: cols, hscroll: document.scrollingElement.scrollWidth > innerWidth + 1};`);
    ok(!lay.over.length && !lay.out && !lay.hscroll, w + '×' + h + ': ô Hộp sưu tầm không tràn chữ / ra ngoài danh sách (' + lay.cols + ' cột' + (lay.over.length ? ', tràn: ' + lay.over.join(',') : '') + ')');
    await page.shot(SHOTS + '/128_04_hop_suu_tam_' + w + '.png');
  }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(500);
  await js('document.querySelector(\'.kb-album-chip[data-album="guest"]\').click(); return 1;');
  await sleep(300);
  ok(await js('return !!document.querySelector(".kb-h-guestcard") && !document.querySelector(".kb-box-grid");'), 'nút Khách ghé vườn → album khách như cũ');
  // tab Trang trí sân: món quà / món gánh hàng ở nhóm riêng, không có nút Mua
  await js('GardenHome.setTab("yard"); return 1;'); await sleep(400);
  const yardTab = await js(`const L = document.getElementById("kb-h-list"); const secs = [...L.querySelectorAll(".kb-h-sec")].map((s) => s.textContent);
    const cards = [...L.querySelectorAll(".kb-h-card")].filter((c) => /Đèn kéo quân|Giá buộc quẻ/.test(c.textContent));
    return {secs, n: cards.length, buy: cards.some((c) => !!c.querySelector(".kb-h-buy")), price: cards.map((c) => c.querySelector(".kb-h-price").textContent)};`);
  ok(yardTab.secs.indexOf('Hộp sưu tầm · gánh hàng rong') >= 0 && yardTab.n === 2 && !yardTab.buy,
    'Trang trí sân: nhóm "Hộp sưu tầm · gánh hàng rong", không nút Mua (' + yardTab.price.join(' | ') + ')');
  const shopBuy = await py(KB + `try:
    st.buy("denkeoquan"); result = "bought"
except kb.core.HomeError as e:
    result = str(e)`);
  ok(/gánh hàng rong/.test(shopBuy), 'cửa hàng không bán món riêng của gánh hàng (' + shopBuy + ')');
  await js('GardenHome.close(); return 1;'); await sleep(300);

  console.log('== 5. mở vùng → chỗ lấp lánh sang vùng còn thiếu; Tin làng dẫn tới');
  await refresh(`d = st.load(); d["home"]["zones"] = ["beach"]; st.save(d)\n` + DAY('2026-11-21'));
  let v = await fv();
  ok(v.spots[0].scene === 'beach' && v.spots.filter((s) => s.scene === 'beach').length >= 2, 'ngày mới: chỗ lấp lánh ưu tiên Bãi biển còn thiếu (' + v.spots.map((s) => s.scene).join(',') + ')');
  const line = await js('return Garden._data().news.line;');
  ok(/chỗ lấp lánh/.test(line), 'dòng Tin làng trong thẻ Hôm nay: "' + line + '"');
  await js('GardenHome.showMain("yard"); return 1;'); await sleep(900);
  await page.click('#kb-news-btn'); await sleep(400);
  ok(await js('return !!document.querySelector("#kb-news-today li.is-link");'), 'bảng Tin làng: dòng chỗ lấp lánh bấm được');
  await page.click('#kb-news-today li.is-link'); await sleep(1000);
  ok((await js('return GardenHome.mainScene();')) === 'beach', 'bấm → dải cảnh sang Bãi biển');
  ok(await waitFor('GardenFinds._hits("beach").some((h) => h.kind === "spot")', 3000), 'Bãi biển có chỗ lấp lánh');
  await page.shot(SHOTS + '/128_05_bai_bien.png');
  ok(await clickMain('spot'), 'bấm chỗ lấp lánh ở Bãi biển');
  ok(await waitFor('GardenFinds._state().card && /Bãi biển 1 \\/ 6/.test(document.getElementById("kb-find-card").textContent)', 4000), 'thẻ: bộ Bãi biển 1 / 6');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(!(await js('return GardenFinds._state().card;')) && await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())'), 'Esc đóng thẻ, cửa sổ vườn vẫn mở');

  console.log('== 6. gánh hàng rong');
  await refresh(DAY('2026-11-19'));          // thứ Năm
  v = await fv();
  ok(!v.ped.today && v.ped.next === 'CN 22/11', 'thứ Năm: không có phiên, phiên sau "CN 22/11" (' + v.ped.next + ')');
  const noMarket = await sendCmd('ped:buy:x1');
  ok(!noMarket.ok && /không ghé/.test(noMarket.msg), 'mua ngày không có phiên → từ chối (' + noMarket.msg + ')');
  const soon = await js('return Garden._data().news.soon.map((x) => x.text + " " + x.d);');
  ok(soon.some((t) => /Gánh hàng rong ghé Sân vườn CN 22\/11/.test(t)), 'Tin làng · Sắp tới: ' + soon.join(' | '));
  await refresh(DAY('2026-11-18') + 'd = st.load(); d["coins"] = 2000; st.save(d)');       // thứ Tư
  await js('GardenHome.showMain("yard"); return 1;'); await sleep(900);
  v = await fv();
  ok(v.ped.today && v.ped.scene === 'yard' && v.ped.goods.length === 5, 'thứ Tư: gánh hàng ở Sân vườn (chưa có Ga), 5 món');
  const goods = v.ped.goods;
  ok(goods[0].kind === 'only' && goods.slice(1, 4).every((g) => g.kind === 'item' && g.now === Math.max(5, Math.round(g.price * 0.75 / 5) * 5)) && goods[4].kind === 'seed',
    'món riêng + 3 món giảm 25 % + 1 giống cây (' + goods.map((g) => g.name + ' ' + g.now).join(' | ') + ')');
  const same = await py(KB + `a = [g["id"] for g in fc.stock(datetime.date(2026,11,18), kb._ped_shop_items(), list(kb.more_core.SEEDS))]
b = [g["id"] for g in fc.stock(datetime.date(2026,11,18), kb._ped_shop_items(), list(kb.more_core.SEEDS))]
result = a == b and a[0] == fc.ped_only_of(fc.market_no(datetime.date(2026,11,18)))`);
  ok(same, 'phiên hàng cố định theo ngày (gọi lại ra cùng hàng)');
  ok(await waitFor('GardenFinds._hits("yard").some((h) => h.kind === "ped")', 3000), 'người bán đứng ở Sân vườn');
  await page.shot(SHOTS + '/128_06_ganh_hang.png');
  ok(await clickMain('ped'), 'bấm người bán');
  ok(await waitFor('GardenFinds._state().ped', 3000), 'bảng gánh hàng mở');
  const pop = await js(`const p = document.getElementById("kb-ped-pop"), r = p.getBoundingClientRect();
    return {rows: p.querySelectorAll(".kb-ped-row").length, tag: p.querySelector(".kb-ped-tag.is-only") && p.querySelector(".kb-ped-tag.is-only").textContent,
      inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, head: p.querySelector(".kb-quest-head").textContent};`);
  ok(pop.rows === 5 && pop.tag === 'Chỉ có ở gánh hàng' && pop.inside, 'bảng: 5 hàng, nhãn "Chỉ có ở gánh hàng", nằm trong cửa sổ (' + pop.head + ')');
  await page.shot(SHOTS + '/128_07_bang_ganh_hang.png');
  const x1 = goods[0], cB = await coins(), oB = await owned(x1.id);
  await page.click('#kb-ped-pop .kb-ped-row[data-slot="x1"] .kb-ped-buy');
  ok(await waitFor('/Đã mua/.test(document.querySelector(\'#kb-ped-pop .kb-ped-row[data-slot="x1"] .kb-ped-buy\').textContent)', 4000), 'mua món riêng → "Đã mua · Đặt"');
  ok((await coins()) === cB - x1.now && (await owned(x1.id)) === oB + 1, 'trừ đúng ' + x1.now + ' xu, ' + x1.name + ' vào kho');
  const rebuy = await sendCmd('ped:buy:x1');
  ok(!rebuy.ok && /đã mua/.test(rebuy.msg), 'mua lại cùng phiên → từ chối');
  const d1 = goods.find((g) => g.slot === 'd1' && !g.lock) || goods.find((g) => g.kind === 'item' && !g.lock);
  if (d1) {
    const c2 = await coins();
    const rd = await sendCmd('ped:buy:' + d1.slot);
    ok(rd.ok && (await coins()) === c2 - d1.now, 'món cửa hàng giảm giá: ' + d1.name + ' ' + d1.price + ' → ' + d1.now + ' xu');
  } else { ok(true, '(phiên này không có món cửa hàng mở khoá)'); }
  const sd = goods[4], c3 = await coins();
  const rs = await sendCmd('ped:buy:s1');
  ok(rs.ok && (await coins()) === c3 - sd.now && (await py(KB + `result = "${sd.id}" in st.load()["more"]["seeds"]["owned"]`)), 'giống cây ' + sd.name + ' −' + sd.now + ' xu');
  const locked = goods.find((g) => g.lock);
  if (locked) {
    const rl = await sendCmd('ped:buy:' + locked.slot);
    ok(!rl.ok, 'món đang khoá (' + locked.lock + ') → Python từ chối');
  }
  await refresh(`d = st.load(); d["coins"] = 3; st.save(d)`);
  const poor = goods.find((g) => g.kind === 'item' && !g.lock && g.slot !== (d1 && d1.slot));
  if (poor) { const rp = await sendCmd('ped:buy:' + poor.slot); ok(!rp.ok && /Chưa đủ xu/.test(rp.msg), 'thiếu xu → "' + rp.msg + '", xu vẫn 3'); }
  ok((await coins()) === 3, 'xu không âm');
  // Đặt món vừa mua
  await refresh(`d = st.load(); d["coins"] = 500; st.save(d)`);
  await js('GardenFinds.openPed(); return 1;'); await sleep(300);
  await page.key('Escape', 'Escape', 27); await sleep(300);
  ok(!(await js('return GardenFinds._state().ped;')) && await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())'), 'Esc đóng bảng gánh hàng, cửa sổ vườn vẫn mở');
  await js('GardenFinds.openPed(); return 1;'); await sleep(300);
  await page.click('#kb-ped-pop .kb-ped-row[data-slot="x1"] .kb-ped-buy');
  await sleep(700);
  const placing = await js('return GardenHome._state();');
  ok(placing.placing && placing.placing.id === x1.id, 'bấm "Đã mua · Đặt" → Nhà ở chế độ đặt ' + x1.id + ' (cảnh ' + placing.scene + ')');
  await js('GardenHome.close(); return 1;'); await sleep(300);
  // có Ga làng quê → người bán ở Ga
  await refresh(`d = st.load(); d["home"]["zones"] = ["beach","shrine","festival","bamboo","onsen","station"]; st.save(d)`);
  v = await fv();
  ok(v.ped.scene === 'station', 'đã mở Ga làng quê → gánh hàng ghé Ga');
  await js('GardenHome.showMain("station"); return 1;'); await sleep(900);
  ok(await waitFor('GardenFinds._hits("station").some((h) => h.kind === "ped")', 3000), 'người bán đứng ở Ga');
  await page.shot(SHOTS + '/128_08_ganh_hang_ga.png');
  // cửa sổ hẹp: bảng nằm gọn
  await py(KB + 'kb._dialog.resize(720, 520); result = 1'); await sleep(700);
  await js('GardenFinds.openPed(); return 1;'); await sleep(400);
  const narrow = await js(`const p = document.getElementById("kb-ped-pop"), r = p.getBoundingClientRect();
    return {inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 1 && r.bottom <= innerHeight + 1, scroll: p.scrollHeight > p.clientHeight ? getComputedStyle(p).overflowY : "-"};`);
  ok(narrow.inside, '720 × 520: bảng gánh hàng nằm trong cửa sổ (cuộn: ' + narrow.scroll + ')');
  await page.shot(SHOTS + '/128_09_hep.png');
  await js('GardenFinds.closePed(); return 1;');
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(500);

  console.log('== 7. Lịch hoa, Dịu mắt, hồ sơ khác');
  const day21 = await py(KB + 'v = kb.cal_day("2026-11-21"); result = v.get("finds")');
  ok(Array.isArray(day21) && day21.length === 1 && /\(/.test(day21[0]), 'Lịch hoa 21/11: "Nhặt được" ' + JSON.stringify(day21));
  await refresh(REVIEWS(30) + DAY('2026-11-22') + `kb.save_config(ui={"greet":"off","trans":"off","main":{"yard":"still"}})`);
  await js('GardenHome.showMain(Garden._data().finds.spots[0].scene); return 1;'); await sleep(900);
  const sparkStill = await js(`const cv = document.getElementById("kb-yard"); const a = cv.toDataURL(); return new Promise((ok) => setTimeout(() => ok(a === cv.toDataURL()), 700));`);
  ok(sparkStill, 'cảnh Đứng yên: khung hình không đổi (lấp lánh không nhấp nháy)');
  await py(KB + 'kb.save_config(ui={"greet":"off","trans":"off"}); result = 1');

  console.log('== 8. lỗi');
  (page.errors || []).forEach((e) => errors.push(e));
  ok(errors.length === 0, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  const log = await py(KB + 'result = [(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-8:]');
  ok(!log.length, 'nhật ký lỗi add-on trống' + (log.length ? ': ' + JSON.stringify(log) : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total);
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); try { page && page.close(); } catch (x) { } process.exit(2); });
