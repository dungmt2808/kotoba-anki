// 1.18 trong Anki thật: (1) nút Tưới ngay khớp với hàng đợi ôn — lỗi người dùng gặp 03/11/2026: ôn hết thẻ nhưng
// nút vẫn còn số 1 và có một cây héo kèm giọt nước (thẻ anh em bị Anki hoãn tới mai / thẻ héo mà Anki hẹn ôn ngày sau);
// (2) mỗi giao diện mùa có nhạc riêng, nút "Xem thử" trong Nhà phát luôn nhạc của chủ đề.
// Chạy: node e2e_118.js SHOTS
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenMusic !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
async function waitFor(p, expr, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await p.eval(expr)) return true; } catch (e) { } await sleep(300); }
  return false;
}
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
const W = (expr) => '(() => { ' + expr + ' })()';
let page;
async function deck(name) {
  await py(KB + `
d = kb._dialog
d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)})
d._stop_review()
d.refresh()
result = d.deck_id`);
  await sleep(1500);
  await page.eval(W('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; if (typeof GardenPaper !== "undefined") GardenPaper.close(); if (typeof GardenFields !== "undefined") GardenFields.close(); return 1;'));
}
// Dựng deck: thẻ ôn có trạng thái FSRS (ngày ôn cuối, khoảng cách, độ bền)
const SETUP = KB + `
import time
from anki.cards_pb2 import FsrsMemoryState
col = mw.col
col.set_config("fsrs", True)
now, today = int(time.time()), col.sched.today
def rv(card, days_ago, ivl, stab):
    card.type, card.queue, card.ivl, card.reps = 2, 2, ivl, 3
    card.due = today - days_ago + ivl
    card.memory_state = FsrsMemoryState(stability=stab, difficulty=5.0)
    card.last_review_time = now - days_ago * 86400
    col.update_card(card)
def note(model, did, front, back):
    n = col.new_note(col.models.by_name(model)); n["Front"], n["Back"] = front, back
    col.add_note(n, did); return n
# deck M: chôn thẻ anh em bật, 1 note 2 thẻ cùng héo + đến hạn, 1 note còn tươi
did = col.decks.id("M::Thẻ anh em")
cid = col.decks.add_config_returning_id("Chôn thẻ anh em")
conf = col.decks.get_config(cid); conf["rev"]["bury"] = True; col.decks.update_config(conf)
dk = col.decks.get(did); dk["conf"] = cid; col.decks.save(dk)
a, b = note("Basic (and reversed card)", did, "猫", "con mèo").cards()
rv(a, 40, 5, 3.0); rv(b, 40, 5, 3.0)
for c in note("Basic (and reversed card)", did, "犬", "con chó").cards():
    rv(c, 1, 30, 60.0)
# deck N: thẻ héo nhưng Anki hẹn ôn sau 20 ngày (lịch cũ trước khi bật FSRS)
did2 = col.decks.id("N::Lịch cũ")
rv(note("Basic", did2, "鳥", "con chim").cards()[0], 20, 40, 3.0)
result = [did, did2]`;

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1');
  await py(SETUP);

  console.log('== thẻ anh em bị hoãn tới mai (ảnh người dùng: "Tưới ngay 1" mà bảng ôn báo hết thẻ)');
  await deck('M::Thẻ anh em');
  ok(await page.eval(W('const n = document.getElementById("kb-review-n"); return !n.hidden && n.textContent === "1";')), 'trước khi ôn: Tưới ngay 1 (cây 猫 khát)');
  await page.eval(W('document.getElementById("kb-review").click(); return 1;'));
  ok(await waitFor(page, W('return !document.getElementById("kb-show").hidden && !document.getElementById("kb-panel").hidden;')), 'bảng ôn mở với 1 thẻ');
  await page.eval(W('document.getElementById("kb-show").click(); return 1;'));
  await waitFor(page, W('return !document.getElementById("kb-ratings").hidden;'));
  await page.eval(W('document.querySelector(".kb-rate-3").click(); return 1;'));
  ok(await waitFor(page, W('return !document.getElementById("kb-done").hidden;')), 'ôn 1 thẻ → hết thẻ (thẻ kia bị Anki hoãn)');
  ok(await py(KB + 'result = len(mw.col.find_cards(\'deck:"M::Thẻ anh em" is:buried\'))') === 1, 'Anki thật sự hoãn 1 thẻ anh em');
  await sleep(800);
  const done = await page.eval(W(`const why = document.getElementById("kb-done-why"), p = Garden._data().plants.find(x => x.word === "猫") || {};
    return { counts: [0, 1, 2].map(i => document.getElementById("kb-c" + i).textContent), why: why && !why.hidden ? why.textContent : "",
      badge: document.getElementById("kb-review-n").hidden, title: document.getElementById("kb-review").title,
      wilted: p.wilted, thirsty: p.thirsty, held: p.held, st: Garden._data().stats };`));
  ok(done.counts.join(' ') === '0 0 0', 'số đếm trên bảng ôn về 0 0 0 (trước 1.18 giữ số của thẻ cuối, vd. "0 1 0"): ' + done.counts.join(' '));
  ok(done.badge, 'nút Tưới ngay không còn số (trước 1.18: còn 1)');
  ok(done.wilted && !done.thirsty && done.held === 'buried', 'cây 猫 vẫn héo (nhớ thật) nhưng không khát / không giọt nước, lý do "buried"');
  ok(/hoãn tới mai/.test(done.why) && /Mai sẽ tưới được/.test(done.why), 'màn hết thẻ nói rõ: ' + done.why);
  ok(/1 cây chưa tưới được lúc này/.test(done.title), 'chú thích nút Tưới ngay: ' + done.title);
  await page.shot(SHOTS + '/80_het_the_hoan_toi_mai.png');
  await page.eval(W('document.getElementById("kb-close-done").click(); return 1;')); await sleep(700);
  ok(await page.eval(W('return document.getElementById("kb-panel").hidden;')), 'đóng bảng ôn');

  console.log('== thẻ héo nhưng Anki hẹn ôn ở ngày sau');
  await deck('N::Lịch cũ');
  const n0 = await page.eval(W('const p = Garden._data().plants[0]; return { badge: document.getElementById("kb-review-n").hidden, wilted: p.wilted, thirsty: p.thirsty, held: p.held, due: p.due_in };'));
  ok(n0.badge && n0.wilted && !n0.thirsty && n0.held === 'notdue' && n0.due === 20, 'cây héo, nút không có số (trước 1.18: 1), ôn sau 20 ngày: ' + JSON.stringify(n0));
  await page.eval(W('document.getElementById("kb-review").click(); return 1;'));
  ok(await waitFor(page, W('return !document.getElementById("kb-done").hidden;')), 'bấm Tưới ngay → hết thẻ');
  const why2 = await page.eval(W('return document.getElementById("kb-done-why").textContent;'));
  ok(/Anki hẹn ôn ở ngày sau/.test(why2), 'màn hết thẻ giải thích: ' + why2);
  await page.shot(SHOTS + '/81_het_the_lich_cu.png');
  await page.eval(W('document.getElementById("kb-close-done").click(); return 1;')); await sleep(500);

  console.log('== nhạc theo chủ đề + nút Xem thử');
  await py(KB + `
st = kb.STATE
d = st.load(); d["coins"] = 5000; st.save(d)
st.unlock_theme("autumn", "coins"); st.unlock_theme("winter", "coins"); st.set_theme("pick", "autumn")
kb._dialog.refresh()
result = 1`);
  await sleep(1500);
  await page.eval(W('GardenMusic.setEnabled(true); document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); return 1;'));
  const playing = () => page.eval('GardenMusic._state().playing');
  ok(await waitFor(page, 'GardenMusic._state().playing === "autumn"', 8000), 'đang dùng Mùa thu → vườn phát bản Mùa thu (trước 1.18: bản vườn thường): ' + await playing());
  await page.eval(W('document.getElementById("kb-house").click(); GardenHome.setTab("season"); return 1;')); await sleep(900);
  ok(await waitFor(page, 'GardenMusic._state().playing === "home"', 6000), 'mở Nhà → hộp nhạc của nhà');
  const clickTry = (name) => page.eval(W(`const card = Array.from(document.querySelectorAll(".kb-h-theme")).find(c => c.querySelector(".kb-h-name").textContent.indexOf(${JSON.stringify(name)}) >= 0);
    if (!card) return "không thấy thẻ"; const b = Array.from(card.querySelectorAll("button")).find(x => /[Xx]em thử/.test(x.textContent));
    if (!b) return "không có nút Xem thử"; b.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); b.click(); return b.textContent;`));
  ok(await clickTry('Lễ hội mùa hè') === 'Xem thử', 'chủ đề chưa mở có nút Xem thử');
  ok(await waitFor(page, 'GardenMusic._state().playing === "natsumatsuri"', 6000), 'Xem thử “Lễ hội mùa hè” → phát nhạc lễ hội: ' + await playing());
  const tipT = await page.eval(W('return document.getElementById("kb-h-tip").textContent;'));
  ok(/đang phát nhạc của chủ đề/.test(tipT), 'dòng gợi ý: ' + tipT);
  await page.shot(SHOTS + '/82_xem_thu_nhac.png');
  ok(await clickTry('Mùa đông') === 'Xem thử', 'chủ đề đã mở mà chưa dùng cũng có nút Xem thử');
  ok(await waitFor(page, 'GardenMusic._state().playing === "winter"', 6000), 'Xem thử Mùa đông → nhạc Mùa đông');
  ok(await clickTry('Mùa đông') === 'Thôi xem thử', 'bấm lần nữa = Thôi xem thử');
  ok(await waitFor(page, 'GardenMusic._state().playing === "home"', 6000), 'thôi xem thử → lại hộp nhạc của nhà');
  const useRow = await page.eval(W(`const card = Array.from(document.querySelectorAll(".kb-h-theme")).find(c => c.querySelector(".kb-h-name").textContent.indexOf("Mùa thu") >= 0);
    return Array.from(card.querySelectorAll("button")).map(b => b.textContent);`));
  ok(useRow.indexOf('Đang dùng') >= 0 && !useRow.some(t => /Xem thử/.test(t)), 'chủ đề đang dùng không có nút Xem thử: ' + useRow.join(' | '));
  await clickTry('Tết');
  ok(await waitFor(page, 'GardenMusic._state().playing === "tet"', 6000), 'xem thử Tết → nhạc Tết');
  await page.eval(W('GardenHome.close(); return 1;'));
  ok(await waitFor(page, 'GardenMusic._state().playing === "autumn" && !GardenSeason.previewing()', 8000), 'đóng Nhà → hết xem thử, lại nhạc Mùa thu: ' + await playing());
  await page.eval(W('GardenMusic.setEnabled(false); return 1;'));
  await page.eval(W('document.getElementById("kb-house").click(); GardenHome.setTab("season"); return 1;')); await sleep(900);
  await clickTry('Lễ hội mùa hè'); await sleep(500);
  ok(/nhạc nền đang tắt/.test(await page.eval(W('return document.getElementById("kb-h-tip").textContent;'))), 'nhạc nền tắt: Xem thử nhắc bật ở ⚙ (không tự bật nhạc)');
  ok(await waitFor(page, '!GardenMusic._state().playing || GardenMusic._state().gain < 0.01', 4000), 'nhạc tắt thì vẫn im');
  await page.eval(W('GardenHome.close(); return 1;'));

  console.log('== lỗi');
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.join(' | ').slice(0, 300) : ''));
  const errs = await py(KB + 'result = kb.ERRORS.load() if hasattr(kb.ERRORS, "load") else []');
  ok(!errs || !errs.length, 'nhật ký lỗi add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 300) : ''));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length + ' đạt');
  page.close(); process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
