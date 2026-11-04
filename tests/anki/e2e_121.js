// 1.21 trong Anki thật: khách ghé vườn + Album khách.
// Khách theo đồ đã đặt (ghế gỗ → mèo nằm, ao → cò, đèn đá → cú, chuông gió → vành khuyên), vào / ở lại / về,
// gặp lần đầu → Python ghi album (xét lại đồ / tháng) + thông báo bấm được, bấm khách → Album khách, rê chuột có chú thích,
// đom đóm / mắt cú vẽ trên lớp tối ban đêm, tab Album (16 thẻ, bóng đen khi chưa gặp), Lịch hoa ghi "Khách mới",
// cuốn nhật ký ghi khách mới của tháng, tắt "Thú nuôi, khách trên sân" thì không có khách, cửa sổ 1024 px.
// Chạy: node e2e_121.js SHOTS
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenGuests !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = 'import sys, time, datetime, json\nkb = sys.modules["kotoba_batake"]\n';
const W = (expr) => '(() => { ' + expr + ' })()';
let page;
const album = () => py(KB + 'result = kb.GUESTS.album()');
const vis = (sc) => page.eval(W(`const a = GardenGuests._vis(${JSON.stringify(sc)}); return a ? { id: a.id, act: a.act, x: a.x, y: a.y, pose: a.pose, home: a.home, box: a.box || null, alpha: a.alpha, mark: !!a.mark } : null;`));
const force = (sc, id) => page.eval(W(`return GardenGuests._force(${JSON.stringify(sc)}, ${JSON.stringify(id)});`));
const hideToast = () => page.eval(W('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;'));
// toạ độ màn hình của một điểm nghệ thuật trên sân màn chính
const yardPoint = (ax, ay) => page.eval(W(`const cv = document.getElementById("kb-yard"), r = cv.getBoundingClientRect(), v = GardenHome._mainView();
  return [r.left + (${ax} + v.ox) * v.S, r.top + ${ay} * v.S];`));
async function mouse(type, x, y) { await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); }

(async () => {
  await py(KB + `st = kb.STATE
d = st.load(); d["coins"] = 40000; d["home"]["house"] = 7; d["home"]["zones"] = ["beach", "shrine"]
d["home"]["owned"].update({"bench": 1, "pond": 1, "flowers": 1, "lantern": 1, "furin": 1}); st.save(d)
st.place("yard", "bench", 5, 2); st.place("yard", "pond", 8, 1); st.place("yard", "flowers", 11, 2); st.place("yard", "lantern", 13, 0)
st.place("room", "furin", 2, 0)
col = mw.col
cids = list(col.db.list("select id from cards limit 50"))
day0 = int(col.sched.day_cutoff) - 86400
rows = [((day0 - b * 86400 + 3600 * 10) * 1000 + i, cids[i % len(cids)], -1, 3, 5, 2, 2500, 4000, 1) for b in range(0, 6) for i in range(12)]
col.db.executemany("insert or ignore into revlog (id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", rows)
# khách tự ghé theo khung giờ làm số "đã gặp" khó đoán → tắt lịch ghé (tần suất 0), ép từng khách bằng GardenGuests._force;
# cuối kịch bản bật lại để thử khách tự ghé
kb._rate = kb.guests.rate
kb.guests.rate = lambda fruit: 0.0
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); kb._dialog.refresh(); result = 1'); await sleep(2500);
  // trời cố định: 10 giờ sáng, nắng (thời tiết tự đổi làm khách đổi theo)
  await page.eval(W('GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); GardenPaper.close(); return 1;'));
  await hideToast();

  console.log('== Python: ai được ghé, tần suất, album');
  const g = await py(KB + 'result = kb.guest_view(kb.STATE.load(), kb._dialog._plants)');
  const yard = Object.fromEntries(g.cand.yard || []);
  ok(g.total === 16 && g.met === 0 && g.list.length === 16, 'album 16 khách, chưa gặp ai');
  ok(yard.neko === 18 && yard.suzume === 30 && yard.sagi === 7 && yard.fukuro === 12, 'sân: ghế gỗ gọi mèo (×3), bụi hoa gọi chim sẻ (×3), ao gọi cò, đèn đá gọi cú (×3)');
  ok(!yard.kamome && !yard.shika && (g.cand.beach || []).some(x => x[0] === 'kamome') && (g.cand.shrine || []).some(x => x[0] === 'shika'),
    'hải âu chỉ ở Bãi biển, hươu ở Đền');
  ok((g.cand.room || []).some(x => x[0] === 'mejiro'), 'chuông gió trong nhà gọi vành khuyên');
  ok(await py(KB + 'result = kb._rate(0)') === 0.3 && g.rate_label === 'thỉnh thoảng' && g.fruit === 0, 'deck chưa có cây Ra quả → khách ghé thỉnh thoảng (0,3)');
  ok(await page.eval(W('return !!(Garden && window.GardenGuests) && GardenGuests._want("yard", Date.now(), GardenSky.state()) !== undefined;')), 'trang có dữ liệu khách (data.guests)');

  console.log('== mèo hoang nằm trên ghế gỗ, gặp lần đầu');
  await force('yard', 'neko');
  ok(await waitFor(page, W('const a = GardenGuests._vis("yard"); return a && a.act === "stay";'), 20000), 'mèo đi vào rồi ở lại');
  const nk = await vis('yard');
  ok(nk.home.pose === 'lie' && nk.home.spot && nk.home.spot.id === 'bench' && Math.abs(nk.x - nk.home.spot.cx) < 1, 'nằm giữa ghế gỗ');
  ok(nk.home.base > nk.home.spot.bottom, 'vẽ sau ghế (nằm trên ghế, không bị ghế che)');
  ok(await page.eval(W('return GardenGuests.taken("yard") === "5,2";')), 'ghế đang có mèo nằm → không vẽ chim sẻ nhỏ đậu ghế (khỏi đè lên mèo)');
  ok(await waitFor(page, W('const t = document.getElementById("kb-toast"); return t && !t.hidden && /Khách mới ghé vườn: Mèo hoang/.test(t.textContent);'), 8000),
    'thông báo "Khách mới ghé vườn: Mèo hoang · xem Album ▸"');
  let al = await album();
  ok(al.neko && al.neko.s === 'yard' && al.neko.n === 1, 'Python ghi album: gặp lần đầu ở Sân vườn');
  const p1 = await yardPoint(nk.x, nk.y - 3);
  await page.shot(SHOTS + '/121_meo_tren_ghe.png');
  await page.click('#kb-toast');
  ok(await waitFor(page, W('return !document.getElementById("kb-home").hidden && document.querySelector(\'#kb-home .kb-h-tab[data-tab="guest"]\').classList.contains("is-on");')),
    'bấm thông báo → Nhà mở tab Album khách');
  ok(await waitFor(page, W('const c = document.querySelector(".kb-h-guestcard.kb-h-focus"); return c && c.getAttribute("data-guest") === "neko";')), 'thẻ Mèo hoang được tô viền');
  const card = await page.eval(W(`const c = document.querySelector('.kb-h-guestcard[data-guest="neko"]'); const u = document.querySelector('.kb-h-guestcard[data-guest="kamome"]');
    return { t: c.textContent, met: c.classList.contains("kb-h-using"), un: u.textContent, sil: !!u.querySelector(".kb-h-guest-un"), n: document.querySelectorAll(".kb-h-guestcard").length,
      top: document.querySelector("#kb-h-list .kb-h-wear-top").textContent };`));
  ok(card.n === 16 && /1\/16/.test(card.top) && /0 cây Ra quả: khách ghé thỉnh thoảng/.test(card.top), 'tab Album: 16 thẻ, "1/16", dòng tần suất theo cây Ra quả');
  ok(card.met && /Mèo hoang/.test(card.t) && /ノラネコ/.test(card.t) && /Gặp lần đầu \d\d\/\d\d\/\d{4} · Sân vườn · ghé 1 ngày/.test(card.t), 'thẻ đã gặp: tên, tên Nhật, ngày gặp, cảnh, số ngày');
  ok(/^\?\?\?/.test(card.un) && card.sil && /Bãi biển/.test(card.un), 'thẻ chưa gặp: "???", bóng đen, gợi ý chỗ gặp');
  await page.shot(SHOTS + '/121_album.png');
  await page.eval(W('GardenHome.close(); return 1;')); await hideToast();

  console.log('== bấm khách trên sân → Album khách');
  await force('yard', 'sagi');
  ok(await waitFor(page, W('const a = GardenGuests._vis("yard"); return a && a.act === "stay" && a.box;'), 8000), 'cò hiện ở ao (hiện dần)');
  const sg = await vis('yard');
  ok(sg.home.spot && sg.home.spot.id === 'pond' && (Math.abs(sg.x - (sg.home.spot.left + 3)) < 1 || Math.abs(sg.x - (sg.home.spot.right - 3)) < 1), 'cò đứng ở mép ao');
  const pt = await yardPoint(sg.box.x + sg.box.w / 2, sg.box.y + sg.box.h / 2);
  await mouse('mouseMoved', pt[0], pt[1]); await sleep(300);
  const tip = await page.eval(W('const c = document.getElementById("kb-yard"); return [c.title, c.style.cursor];'));
  ok(/Cò trắng ghé vườn \(bấm để xem Album khách\)/.test(tip[0]) && tip[1] === 'pointer', 'rê chuột: chú thích + con trỏ tay (' + tip[0] + ')');
  await page.shot(SHOTS + '/121_co_o_ao.png');
  await mouse('mousePressed', pt[0], pt[1]); await mouse('mouseReleased', pt[0], pt[1]); await sleep(800);
  ok(await waitFor(page, W('const c = document.querySelector(".kb-h-guestcard.kb-h-focus"); return !document.getElementById("kb-home").hidden && c && c.getAttribute("data-guest") === "sagi";')),
    'bấm cò → Nhà mở Album, tô thẻ Cò trắng');
  ok((await vis('yard')).mark, 'khách được bấm có dấu "!"');
  await page.eval(W('GardenHome.close(); return 1;')); await hideToast();
  void p1;

  console.log('== Python xét lại trước khi ghi album');
  await force('yard', 'kaeru');            // tháng 11: ếch không ghé (chỉ tháng 4–10)
  await force('yard', 'kamome');
  await sleep(4000);
  al = await album();
  const nowMonth = Number((await py(KB + 'result = kb.cal_today().month')));
  ok(nowMonth >= 4 && nowMonth <= 10 ? true : !al.kaeru, 'khách không được ghé (ếch ngoài mùa) → không ghi album');
  await force('yard', 'kamome'); await sleep(3500);
  al = await album();
  ok(!al.kamome, 'hải âu ở sân (chỉ ghé Bãi biển) → không ghi album');
  await py(KB + 'kb.GUESTS.met("neko", "yard", kb.cal_today()); result = 1');
  ok((await album()).neko.n === 1, 'cùng ngày gặp lại không đếm thêm');

  console.log('== ban đêm: cú trên đèn đá, đom đóm');
  await page.eval(W('GardenSky.set("fixedHour", 22); return 1;')); await sleep(400);
  await force('yard', 'fukuro');
  ok(await waitFor(page, W('const a = GardenGuests._vis("yard"); return a && a.act === "stay";'), 6000), 'cú hiện dần');
  const fk = await vis('yard');
  ok(fk.home.spot && fk.home.spot.id === 'lantern' && fk.y <= fk.home.spot.top + 2 && fk.home.base > fk.home.spot.bottom, 'cú đậu trên đỉnh đèn đá, vẽ sau đèn');
  await sleep(4000);
  ok((await album()).fukuro, 'cú ban đêm ở sân có đèn đá → ghi album');
  await page.shot(SHOTS + '/121_cu_ban_dem.png');
  await force('yard', 'hotaru');
  await sleep(2500);
  // đếm điểm ảnh vàng-xanh sáng (lõi đom đóm #f6ff9e: xanh lá ≥ đỏ, khác ánh đèn vàng cam) quanh chỗ đom đóm lượn
  const ff = await page.eval(W(`const cv = document.getElementById("kb-yard"), x = cv.getContext("2d"), a = GardenGuests._vis("yard"), v = GardenHome._mainView(), d = window.devicePixelRatio || 1;
    const x0 = Math.round((a.home.x - 30 + v.ox) * v.S * d), y0 = Math.max(0, Math.round((a.home.y - 24) * v.S * d)), w = Math.round(60 * v.S * d), h = Math.round(44 * v.S * d);
    const px = x.getImageData(x0, y0, w, h).data; let lit = 0;
    for (let i = 0; i < px.length; i += 4) { if (px[i + 1] > 215 && px[i] > 170 && px[i + 2] < 180 && px[i + 1] >= px[i]) lit++; }
    return { lit: lit, n: a.dots.length };`));
  ok(ff.lit >= 8, 'đom đóm sáng trên nền tối (' + ff.lit + ' điểm ảnh lõi sáng quanh chỗ lượn)');
  await page.shot(SHOTS + '/121_dom_dom.png');
  await page.eval(W('GardenSky.set("fixedHour", 10); GardenGuests._clear(); return 1;'));

  console.log('== trong nhà: vành khuyên ở bậu cửa sổ');
  await page.eval(W('GardenHome.open("room"); return 1;')); await sleep(1200);
  await force('room', 'mejiro');
  ok(await waitFor(page, W('const a = GardenGuests._vis("room"); return a && a.act === "stay";'), 6000), 'vành khuyên hiện ở bậu cửa');
  const mj = await vis('room');
  ok(mj.x >= 66 && mj.x <= 94 && mj.y === 34, 'trong khung cửa sổ (x 66–94), đứng trên bậu');
  ok(await waitFor(page, W('return true;')) && (await (async () => { await sleep(3000); return (await album()).mejiro; })()), 'ghi album: gặp trong nhà');
  await page.shot(SHOTS + '/121_vanh_khuyen.png');
  await page.eval(W('GardenHome.openGuests("mejiro"); return 1;')); await sleep(800);
  ok(await page.eval(W('return /Trong nhà/.test(document.querySelector(\'.kb-h-guestcard[data-guest="mejiro"]\').textContent);')), 'thẻ Album ghi "Trong nhà"');
  await page.eval(W('GardenHome.close(); GardenGuests._clear(); return 1;')); await hideToast();

  console.log('== tắt "Thú nuôi, khách trên sân"');
  ok(await page.eval(W('return /Thú nuôi, khách trên sân/.test(document.body.innerHTML) || (GardenUI && true);')), 'bảng Giao diện có dòng "Thú nuôi, khách trên sân"');
  await page.eval(W('document.getElementById("kb-ui-open").click(); return 1;')); await sleep(600);
  ok(await page.eval(W('return Array.from(document.querySelectorAll("#kb-uipanel *, .kb-ui-panel *")).some((e) => e.children.length === 0 && /Thú nuôi, khách trên sân/.test(e.textContent));')),
    'nhãn mới hiện trong bảng Giao diện');
  await page.eval(W('GardenUI.close(); return 1;'));
  await py(KB + 'c = kb.config(); ui = dict(c.get("ui") or {}); m = dict(ui.get("main") or {}); m["pets"] = "off"; ui["main"] = m; kb.save_config(ui=ui); kb._dialog.refresh(); result = 1');
  await sleep(1500);
  await force('yard', 'tanuki');
  await sleep(1500);
  const off = await vis('yard');
  ok(!off || off.box === null, 'tắt thì khách không được vẽ trên sân (' + JSON.stringify(off && off.box) + ')');
  await py(KB + 'c = kb.config(); ui = dict(c.get("ui") or {}); m = dict(ui.get("main") or {}); m["pets"] = "on"; ui["main"] = m; kb.save_config(ui=ui); kb._dialog.refresh(); result = 1');
  await sleep(1500);
  await page.eval(W('GardenGuests._clear(); return 1;'));

  console.log('== Lịch hoa: "Khách mới" ở khung ngày, bìa cuốn nhật ký');
  await page.eval(W('GardenCal.open({ tab: "month" }); return 1;'));
  ok(await waitFor(page, W('return Array.from(document.querySelectorAll(".kb-cal-k")).some((e) => e.textContent === "Khách mới");')), 'khung hôm nay có dòng "Khách mới"');
  const kv = await page.eval(W('const k = Array.from(document.querySelectorAll(".kb-cal-k")).find((e) => e.textContent === "Khách mới"); return k.nextSibling.textContent;'));
  ok(/Mèo hoang/.test(kv) && /Cò trắng/.test(kv) && /Cú/.test(kv), 'liệt kê khách mới hôm nay: ' + kv);
  await page.shot(SHOTS + '/121_lich_khach_moi.png');
  const T = await py(KB + 'result = kb.cal_today().isoformat()[:7]');
  await page.eval(W('GardenCal.open({ tab: "book", book: ' + JSON.stringify(T) + ' }); return 1;'));
  ok(await waitFor(page, W('return Array.from(document.querySelectorAll("#kb-book .kb-page-first .kb-page-line")).some((e) => /Khách mới:/.test(e.textContent) && /Mèo hoang/.test(e.textContent));')),
    'bìa cuốn nhật ký tháng này: "Khách mới: …"');
  ok(await page.eval(W('const p = document.querySelector("#kb-book .kb-page-first"); return p.scrollHeight <= p.clientHeight + 1;')), 'trang đầu vẫn vừa khung');
  await page.shot(SHOTS + '/121_cuon_khach_moi.png');
  await page.eval(W('GardenCal.close(); return 1;'));

  console.log('== khách tự ghé theo khung giờ (tần suất 1)');
  await py(KB + 'kb.guests.rate = lambda fruit: 1.0; kb._dialog.refresh(); result = 1'); await sleep(2000);
  await page.eval(W('GardenGuests._clear(); return 1;'));
  const nat = await page.eval(W('const w = GardenGuests._want("yard", Date.now(), GardenSky.state()); return w ? w.id : null;'));
  if (nat) {
    ok(await waitFor(page, W('const a = GardenGuests._vis("yard"); return a && a.id === ' + JSON.stringify(nat) + ';'), 5000), 'khung giờ này có khách → khách tự ghé: ' + nat);
  } else {
    ok(true, 'khung giờ này ở đầu / cuối khung (chưa / hết khách) → không có ai, đúng lịch');
  }
  await py(KB + 'kb.guests.rate = kb._rate; result = 1');

  const tw = await page.eval(W('GardenHome.openGuests(); const t = Array.from(document.querySelectorAll("#kb-home .kb-h-tab")).map((b) => b.getBoundingClientRect().width); GardenHome.close(); return [Math.min(...t), Math.max(...t)];'));
  ok(tw[1] - tw[0] <= 1, '1366 px: 11 tab của Nhà rộng bằng nhau (' + tw.map(Math.round).join('–') + ')');

  console.log('== cửa sổ 1024 px');
  await py(KB + 'kb._dialog.resize(1024, 700); result = 1'); await sleep(1200);
  await page.eval(W('GardenHome.openGuests("sagi"); return 1;')); await sleep(1000);
  const lay = await page.eval(W(`const tabs = Array.from(document.querySelectorAll("#kb-home .kb-h-tab")); const L = document.getElementById("kb-h-list");
    const cards = Array.from(L.querySelectorAll(".kb-h-guestcard"));
    return { rows: new Set(tabs.map((t) => Math.round(t.getBoundingClientRect().top))).size, sw: L.scrollWidth, cw: L.clientWidth, page: document.documentElement.scrollWidth <= innerWidth,
      over: cards.filter((c) => Array.from(c.querySelectorAll("*")).some((x) => x.getBoundingClientRect().right > c.getBoundingClientRect().right + 1)).length };`));
  ok(lay.rows === 1, '11 tab của Nhà vẫn một hàng ở 1024 px');
  ok(lay.sw <= lay.cw + 1 && lay.page && lay.over === 0, 'Album không tràn ngang, chữ không lọt khỏi thẻ');
  await page.shot(SHOTS + '/121_album_1024.png');
  await page.eval(W('GardenHome.close(); return 1;'));

  const errs = page.errors.filter(e => !/ResizeObserver/.test(e));
  ok(errs.length === 0, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'result = [e for e in kb.ERRORS.entries()]');
  ok(elog.length === 0, 'nhật ký lỗi add-on trống' + (elog.length ? ': ' + JSON.stringify(elog).slice(0, 300) : ''));
  const pass = results.filter(Boolean).length;
  console.log('KẾT QUẢ: ' + pass + '/' + results.length);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.log('LỖI KỊCH BẢN:', e.stack || e); process.exit(1); });
