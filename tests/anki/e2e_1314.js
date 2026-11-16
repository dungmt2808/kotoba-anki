// 1.31.4 trong Anki thật: Ctrl+Z / nút "↶ Hoàn tác" trong bảng ôn của vườn (Tưới ngay) — người dùng góp ý sau khi phát hành.
//   1. chưa chấm thẻ nào: nút ẩn, Ctrl+Z chỉ báo "Không có lượt chấm nào để hoàn tác.", không đụng gì của Anki
//   2. chấm Được → Ctrl+Z: thẻ vừa chấm hiện lại mặt trước, revlog về như cũ, xu về đúng số trước khi chấm; chấm lại → xu
//      cộng đúng một lần, phần trả lại được ghi vào collection cùng lần ghi ví
//   3. chấm 3 thẻ → Ctrl+Z 3 lần: từng thẻ quay lại theo thứ tự ngược, xu / revlog về như trước cả 3 lượt; lần thứ 4 báo không có
//   4. thao tác khác xen giữa (sửa note, chấm thẻ ở chỗ khác, đổi deck): Ctrl+Z ở vườn KHÔNG hoàn tác nhầm thao tác đó
//   5. thẻ cuối → màn "Hết thẻ": nút Hoàn tác vẫn hiện, Ctrl+Z đưa thẻ cuối trở lại
//   6. đủ mục tiêu ngày ở lượt chấm rồi hoàn tác: thưởng mục tiêu được trả lại, chấm lại thì có lại thưởng (một lần)
//   7. Ctrl+Z trong ô gõ đáp án là hoàn tác chữ của ô, không hoàn tác lượt chấm
//   8. phím Ctrl+Z thật qua Qt (QTest, đi qua cả hệ phím tắt của Anki): hoàn tác đúng MỘT lượt, không thêm Undo của cửa sổ chính
//   9. bấm nút Hoàn tác bằng chuột: như Ctrl+Z, phím Space vẫn lật thẻ sau đó (nút không giữ focus)
// Chạy: KB_SCRIPTS=e2e_1314.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1314';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function waitFor(expr, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
async function waitPy(code, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await py(code); if (v) return v; } catch (e) { } await sleep(200); }
  return false;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nd = kb._dialog\n';
const RAW = 'mw.col.get_config("kotoba_batake_state")["coins"]';
const NOW = KB + 'result = {"coins": st.load()["coins"], "raw": ' + RAW + ', "rev": mw.col.db.scalar("select count() from revlog"), ' +
  '"cid": (d._card.id if d and d._card else None), "stack": len(d._undo_stack) if d else -1, "undo": mw.col.undo_status().undo, "redo": mw.col.undo_status().redo}';
const now = () => py(NOW);
const panel = () => js(`const g = (id) => document.getElementById(id);
  return { open: !g("kb-panel").hidden, front: !g("kb-show").hidden && g("kb-ratings").hidden, back: !g("kb-ratings").hidden,
    done: !g("kb-done").hidden, undoBtn: !g("kb-rv-undo").hidden,
    toast: (g("kb-rv-note") && !g("kb-rv-note").hidden) ? g("kb-rv-note").textContent : "",          // câu báo trong bảng ôn
    float: (g("kb-toast") && !g("kb-toast").hidden) ? g("kb-toast").textContent : "" };`);
async function hideToast() { await js('for (const id of ["kb-toast", "kb-rv-note"]) { const t = document.getElementById(id); if (t) { t.hidden = true; t.textContent = ""; } } return 1;'); }
async function ctrlZ() {        // phím thật vào trang (CDP): keydown Ctrl+Z
  for (const type of ['rawKeyDown', 'keyUp']) {
    await page.send('Input.dispatchKeyEvent', { type, key: 'z', code: 'KeyZ', windowsVirtualKeyCode: 90, nativeVirtualKeyCode: 90, modifiers: 2 });
  }
}
async function deck(name) {
  await py(KB + 'did = mw.col.decks.id_for_name(' + JSON.stringify(name) + ')\nd._dispatch("deck:%d" % did)\nresult = did');
  await sleep(1000);
}
async function startReview() {
  await js('document.getElementById("kb-review").click(); return 1;');
  return waitFor('return !document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden;');
}
async function rate(ease) {             // lật rồi chấm bằng nút, chờ Python ghi xong (thẻ kế tiếp / Hết thẻ)
  const before = await now();
  await js('document.getElementById("kb-show").click(); return 1;');
  await waitFor('return !document.getElementById("kb-ratings").hidden;');
  await js('document.querySelector(".kb-rate-' + ease + '").click(); return 1;');
  await waitPy(KB + 'result = mw.col.db.scalar("select count() from revlog") > ' + before.rev + ' and not d._busy');
  await waitFor('const g = (id) => document.getElementById(id); return (!g("kb-show").hidden || !g("kb-done").hidden);');
  await sleep(300);
  return before;
}
async function afterUndo(prevRev) {     // chờ lượt hoàn tác xong: revlog giảm, Python hết bận, trang hiện thẻ / hết thẻ
  await waitPy(KB + 'result = mw.col.db.scalar("select count() from revlog") < ' + prevRev + ' and not d._busy', 8000);
  await waitFor('const g = (id) => document.getElementById(id); return (!g("kb-show").hidden || !g("kb-done").hidden);');
  await sleep(300);
}

(async () => {
  await py(KB + 'kb.save_config(show_tooltips=False, ui={}, daily_goal=200); result = 1');
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1');
  await js('localStorage.setItem("kb-main-scene", "yard"); return 1;');
  // deck có đủ thẻ mới cho cả kịch bản
  await py(KB + `col = mw.col
for name in ["D::Chỉ từ, không gì cả"]:
    did = col.decks.id_for_name(name)
    dk = col.decks.get(did); conf = col.decks.config_dict_for_deck_id(did); conf["new"]["perDay"] = 999; col.decks.save(conf)
z = col.decks.id("Z::Một thẻ")
n = col.new_note(col.models.by_name("Basic")); n["Front"], n["Back"] = "海", "biển"; col.add_note(n, z)
y = col.decks.id("Y::Gõ đáp án")
n = col.new_note(col.models.by_name("Basic (type in the answer)")); n["Front"], n["Back"] = "山", "núi"; col.add_note(n, y)
for i in range(3):
    n = col.new_note(col.models.by_name("Basic")); n["Front"], n["Back"] = "木%d" % i, "cây"; col.add_note(n, col.decks.id("D::Chỉ từ, không gì cả"))
result = 1`);
  await deck('D::Chỉ từ, không gì cả');

  console.log('== 1. chưa chấm thẻ nào');
  ok(await startReview(), 'Tưới ngay: bảng ôn mở, thẻ đầu tiên hiện mặt trước');
  await hideToast();
  const s0 = await now();
  let p = await panel();
  ok(p.open && !p.undoBtn, 'nút Hoàn tác ẩn khi chưa chấm thẻ nào');
  await ctrlZ(); await sleep(600);
  p = await panel();
  const s0b = await now();
  ok(/Không có lượt chấm nào để hoàn tác/.test(p.toast), 'Ctrl+Z: báo "' + p.toast + '"');
  ok(s0b.rev === s0.rev && s0b.coins === s0.coins && s0b.undo === s0.undo && s0b.cid === s0.cid && p.front,
    'không đụng gì: revlog / xu / bước Undo của Anki (' + s0.undo + ') / thẻ đang hiện như cũ');

  console.log('== 2. chấm Được → Ctrl+Z → chấm lại');
  await hideToast();
  const a0 = await rate(3);
  const a1 = await now();
  p = await panel();
  ok(a1.rev === a0.rev + 1 && a1.coins > a0.coins && a1.cid !== a0.cid, 'chấm Được: revlog +1, +' + (a1.coins - a0.coins) + ' xu, sang thẻ kế tiếp');
  ok(p.undoBtn && a1.stack === 1, 'nút "↶ Hoàn tác" hiện (sổ của bảng ôn: ' + a1.stack + ' lượt)');
  await page.shot(SHOTS + '/1314_01_nut_hoan_tac.png');
  await ctrlZ(); await afterUndo(a1.rev);
  const a2 = await now();
  p = await panel();
  ok(a2.rev === a0.rev && a2.cid === a0.cid && p.front, 'Ctrl+Z: thẻ vừa chấm hiện lại mặt trước, revlog về như cũ (' + a2.rev + ')');
  ok(a2.coins === a0.coins, 'xu về đúng số trước khi chấm: ' + a1.coins + ' → ' + a2.coins + ' (trước: ' + a0.coins + ')');
  ok(/Đã hoàn tác lượt chấm vừa rồi · −\d+ xu/.test(p.toast), 'báo trong bảng ôn (dưới tên giai đoạn): "' + p.toast + '"');
  ok(!p.float, 'không có thông báo nổi đè lên nút Lật thẻ' + (p.float ? ': "' + p.float + '"' : ''));
  ok(!p.undoBtn && a2.stack === 0, 'không còn lượt để hoàn tác → nút ẩn');
  ok(a2.redo === 'Answer Card', 'Anki vẫn giữ Redo của lượt vừa hoàn tác (Edit → Redo ở cửa sổ chính): "' + a2.redo + '"');
  await page.shot(SHOTS + '/1314_02_sau_hoan_tac.png');
  await hideToast();
  const a3b = await rate(3);
  const a3 = await now();
  ok(a3b.cid === a0.cid && a3.rev === a0.rev + 1 && a3.coins === a1.coins,
    'chấm lại đúng thẻ đó: xu cộng một lần (' + a3.coins + ' = ' + a1.coins + ')');
  ok(a3.raw === a3.coins, 'phần trả lại ghi vào collection cùng lần ghi ví (collection ' + a3.raw + ' = ví ' + a3.coins + ')');

  console.log('== 3. chấm 3 thẻ → Ctrl+Z 3 lần');
  const seq = [];
  for (const e of [1, 3, 4]) { const b = await rate(e); seq.push(b); }
  const m1 = await now();
  ok(m1.rev === seq[0].rev + 3 && m1.stack === 4, 'chấm Lại / Được / Dễ: revlog +3, sổ bảng ôn ' + m1.stack + ' lượt');
  let back = true, order = [];
  for (let i = 2; i >= 0; i--) {
    const cur = await now();
    await ctrlZ(); await afterUndo(cur.rev);
    const s = await now();
    order.push(s.cid === seq[i].cid);
    back = back && s.rev === seq[i].rev && s.coins === seq[i].coins;
  }
  ok(order.every(Boolean), 'từng thẻ quay lại theo thứ tự ngược (' + order.join(', ') + ')');
  ok(back, 'sau mỗi lần: revlog và xu đúng bằng lúc trước lượt đó (cuối: ' + (await now()).coins + ' = ' + seq[0].coins + ' xu)');
  const m2 = await now();
  ok(m2.stack === 1 && (await panel()).undoBtn, 'còn lượt chấm ở mục 2 (chấm lại) → nút vẫn hiện');
  await ctrlZ(); await afterUndo(m2.rev);
  const m3 = await now();
  ok(m3.rev === a0.rev && m3.coins === a0.coins && m3.cid === a0.cid, 'Ctrl+Z lần 4: về đúng lúc đầu mục 2 (xu ' + m3.coins + ', revlog ' + m3.rev + ')');
  await hideToast();
  await ctrlZ(); await sleep(700);
  const m4 = await now();
  ok(m4.rev === m3.rev && /Không có lượt chấm/.test((await panel()).toast), 'lần 5: không còn gì, revlog giữ nguyên');

  console.log('== 4. thao tác khác xen giữa: Ctrl+Z ở vườn không hoàn tác nhầm');
  await hideToast();
  await rate(3);
  const x0 = await now();
  // 4a. sửa note ở Trình duyệt thẻ (bước Undo "Update Note")
  const nid = await py(KB + `n = mw.col.get_note(mw.col.find_notes('deck:"A::Có câu ví dụ + audio"')[0])
key = list(n.keys())[1]; n[key] = n[key] + " (sửa)"; mw.col.update_note(n)
result = n.id`);
  const x1 = await now();
  ok(x1.undo === 'Update Note', 'sau lượt chấm có bước Undo khác của Anki: "' + x1.undo + '"');
  ok((await panel()).undoBtn, '(nút vẫn hiện vì trang chưa biết — Python kiểm lại lúc bấm)');
  await ctrlZ(); await sleep(900);
  const x2 = await now();
  const edited = await py(KB + 'n = mw.col.get_note(' + nid + ')\nresult = n[list(n.keys())[1]].endswith(" (sửa)")');
  p = await panel();
  ok(edited && x2.undo === 'Update Note' && x2.rev === x1.rev && x2.coins === x1.coins,
    'Ctrl+Z ở vườn KHÔNG hoàn tác chỗ sửa note (chữ sửa còn, revlog / xu giữ nguyên)');
  ok(/Không có lượt chấm/.test(p.toast) && !p.undoBtn, 'báo "' + p.toast + '", nút ẩn');
  // 4b. chấm thẻ ở chỗ khác (cửa sổ ôn của Anki / điện thoại): lượt mới nhất không phải của vườn
  await hideToast();
  await rate(3);
  const y0 = await now();
  // như chấm ở cửa sổ ôn của Anki: cùng deck, thẻ đầu hàng đợi (chính thẻ đang hiện ở vườn)
  await py(KB + `from anki.scheduler.v3 import CardAnswer
top = mw.col.sched.get_queued_cards(fetch_limit=1).cards[0]
c = mw.col.get_card(top.card.id); c.start_timer()
mw.col.sched.answer_card(mw.col.sched.build_answer(card=c, states=top.states, rating=CardAnswer.GOOD))
result = c.id`);
  const y1 = await now();
  await ctrlZ(); await sleep(900);
  const y2 = await now();
  ok(y1.rev === y0.rev + 1 && y2.rev === y1.rev && y2.undo === 'Answer Card',
    'lượt chấm ở chỗ khác sau lượt của vườn: Ctrl+Z ở vườn không hoàn tác (revlog ' + y2.rev + ' giữ nguyên)');
  // 4c. đổi deck rồi về lại (bước Undo "Select Deck")
  await hideToast();
  await deck('A::Có câu ví dụ + audio'); await deck('D::Chỉ từ, không gì cả');
  ok(await startReview(), 'đổi deck rồi về lại, Tưới ngay');
  const z0 = await now();
  await ctrlZ(); await sleep(900);
  const z1 = await now();
  ok(z1.rev === z0.rev && z1.undo === z0.undo, 'Ctrl+Z sau khi đổi deck không hoàn tác gì (Undo kế tiếp của Anki: "' + z0.undo + '")');

  console.log('== 5. thẻ cuối → Hết thẻ → Ctrl+Z');
  await hideToast();
  await deck('Z::Một thẻ');
  ok(await startReview(), 'deck 1 thẻ: bảng ôn mở');
  const l0 = await rate(4);
  p = await panel();
  ok(p.done && p.undoBtn, 'chấm xong thẻ cuối: màn "Hết thẻ" có nút Hoàn tác');
  await page.shot(SHOTS + '/1314_03_het_the_hoan_tac.png');
  const l1 = await now();
  await ctrlZ(); await afterUndo(l1.rev);
  const l2 = await now();
  p = await panel();
  ok(p.front && !p.done && l2.cid === l0.cid && l2.rev === l0.rev && l2.coins === l0.coins, 'Ctrl+Z: thẻ cuối trở lại, xu / revlog về như trước');

  console.log('== 6. thưởng mục tiêu ngày');
  await hideToast();
  // mục tiêu ngày thấp nhất là 10 lượt: chấm tới 9 lượt hôm nay, lượt thứ 10 là lượt đủ mục tiêu
  await py(KB + 'kb.save_config(daily_goal=10); result = 1');
  await deck('D::Chỉ từ, không gì cả');
  ok(await startReview(), 'deck D: bảng ôn mở');
  for (let i = 0; i < 20 && (await py(KB + 'result = kb._daily_stats()["reviews"]')) < 9; i++) { await rate(3); }
  ok(await py(KB + 'result = kb._daily_stats()["reviews"]') === 9, 'hôm nay đã có 9 lượt ôn');
  const g0 = await rate(3);
  const g1 = await now();
  const bonus = await py(KB + 'result = int(kb.config()["daily_bonus"])');
  ok(g1.coins - g0.coins >= bonus, 'lượt này đủ mục tiêu ngày: +' + (g1.coins - g0.coins) + ' xu (thưởng ' + bonus + ')');
  await ctrlZ(); await afterUndo(g1.rev);
  const g2 = await now();
  ok(g2.coins === g0.coins, 'Ctrl+Z: trả lại cả thưởng mục tiêu (' + g1.coins + ' → ' + g2.coins + ')');
  await rate(3);
  const g3 = await now();
  ok(g3.coins === g1.coins && g3.raw === g3.coins, 'chấm lại: có lại thưởng đúng một lần (' + g3.coins + '), collection khớp ví');
  await py(KB + 'kb.save_config(daily_goal=200); result = 1');

  console.log('== 7. Ctrl+Z trong ô gõ đáp án');
  await hideToast();
  await deck('Y::Gõ đáp án');
  ok(await startReview(), 'deck có ô gõ đáp án');
  const t0 = await now();
  const focused = await waitFor(`const f = document.getElementById("kb-card"); const i = f && f.contentDocument && f.contentDocument.getElementById("typeans");
    if (!i) return false; i.focus(); return f.contentDocument.activeElement === i;`);
  ok(!!focused, 'ô gõ đáp án có focus');
  await page.type('nui');
  await ctrlZ(); await sleep(700);
  const t1 = await now();
  const typed = await js('return document.getElementById("kb-card").contentDocument.getElementById("typeans").value;');
  ok(t1.rev === t0.rev && t1.coins === t0.coins && t1.cid === t0.cid, 'không hoàn tác lượt chấm nào (revlog ' + t1.rev + ', thẻ giữ nguyên)');
  ok(typed !== 'nui', 'Ctrl+Z hoàn tác chữ trong ô như mọi ô gõ ("nui" → "' + typed + '")');

  console.log('== 8. Ctrl+Z thật qua Qt: hoàn tác đúng một lượt');
  await deck('D::Chỉ từ, không gì cả');
  ok(await startReview(), 'về deck D');
  await rate(3); await rate(3);
  const q0 = await now();
  await js('if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return 1;');
  await py(KB + `from aqt.qt import Qt
from PyQt6.QtTest import QTest
d.activateWindow(); d.web.setFocus()
w = d.web.focusProxy() or d.web
QTest.keyClick(w, Qt.Key.Key_Z, Qt.KeyboardModifier.ControlModifier)
result = 1`);
  await afterUndo(q0.rev); await sleep(1200);
  const q1 = await now();
  ok(q1.rev === q0.rev - 1 && q1.stack === q0.stack - 1, 'phím Ctrl+Z gõ vào cửa sổ vườn: revlog −1 (' + q0.rev + ' → ' + q1.rev + '), không phải −2');

  console.log('== 9. bấm nút Hoàn tác bằng chuột');
  await hideToast();
  await rate(3);
  const b0 = await now();
  await page.click('#kb-rv-undo'); await afterUndo(b0.rev);
  const b1 = await now();
  ok(b1.rev === b0.rev - 1 && (await panel()).front, 'bấm "↶ Hoàn tác": lượt vừa chấm được hoàn tác, thẻ hiện mặt trước');
  await page.key(' ', 'Space', 32); await sleep(800);
  ok((await panel()).back, 'phím Space vẫn lật thẻ ngay sau đó (nút không giữ focus)');

  const errs = await py(KB + 'result = [e for e in kb.ERRORS.entries() if "hoàn tác" in json.dumps(e, ensure_ascii=False)]');
  ok(!errs || !errs.length, 'nhật ký Báo lỗi không có lỗi hoàn tác');
  console.log(`\n${pass}/${total} kiểm tra đạt`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
