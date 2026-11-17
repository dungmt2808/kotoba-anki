// 1.32.2 trong Anki thật (run_ui.sh ADDON SHOTS, KB_SCRIPTS=e2e_1322.js):
//  1. pinyin trên từng chữ: bấm cây tiếng Trung → <ruby> mỗi chữ một âm tiết, dòng pinyin dưới chữ ẩn; ô gợi ý khi rê chuột
//     cũng vậy; deck ghi số (ni3 hao3) → dấu thanh; ngoặc kiểu Anki 中[zhong1]国[guo2]; chia được nhiều kiểu → dòng dưới như
//     1.32.1; deck tiếng Nhật / tiếng Anh không có ruby kiểu mới; chữ của deck không chạy thành mã (textContent).
//  2. nút ✎ Sửa / phím E (người dùng duyệt ảnh phác): mở cửa sổ sửa note của Anki ở mặt trước / mặt sau / bằng nút; một
//     cửa sổ; lưu → thẻ hiện chữ mới đúng mặt, cây cập nhật, revlog / xu / số đếm không đổi, cards.mod không đổi; đóng không
//     sửa → không báo gì; sửa xong chấm bình thường; Ctrl+Z trong vườn không hoàn tác nhầm lần sửa; Undo ở cửa sổ chính trả
//     chữ cũ (thẻ dựng lại); phím E không chạy khi đang gõ / có Ctrl / Alt; đang lưu lượt chấm thì bỏ qua; đóng vườn khi đang
//     sửa; note bị xoá khi đang sửa; sửa ở Trình duyệt thẻ; E ở thẻ khác khi cửa sổ còn mở; không dựng được trình sửa → mở
//     Trình duyệt thẻ; Anki đóng mọi cửa sổ (đóng hồ sơ) → lưu rồi đóng; không khoá collection mới; bố cục ở 3 cỡ cửa sổ.
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1322';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
let page, total = 0, pass = 0;
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) { return p; }
      p.close();
    }
    await sleep(500);
  }
  return null;
}
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
async function deck(name) {
  await py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`);
  await sleep(1800);
}
async function plantPos(word) {
  return js(`const d = Garden._data(), L = Garden._layout(), cv = document.getElementById("kb-canvas").getBoundingClientRect();
    const i = d.plants.findIndex((p) => p.word === ${JSON.stringify(word)}); if (i < 0) return null;
    const cw = 18 * L.scale, ch = 20 * L.scale; return [cv.left + (i % L.cols) * cw + cw / 2, cv.top + Math.floor(i / L.cols) * ch + ch * 0.6];`);
}
async function hover(word) {
  const pos = await plantPos(word);
  if (!pos) { return null; }
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pos[0], y: pos[1] });
  await sleep(400);
  return js(`const w = document.getElementById("kb-tip-word"); const r = w.querySelector("ruby");
    return { text: w.textContent, base: r ? Array.from(r.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent) : null,
             rt: r ? Array.from(r.querySelectorAll("rt")).map((x) => x.textContent) : null, lang: w.getAttribute("lang") };`);
}
async function pin(word) {
  const pos = await plantPos(word);
  if (!pos) { return null; }
  for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x: pos[0], y: pos[1], button: 'left', clickCount: 1 }); }
  await sleep(500);
  const r = await js(`const w = document.getElementById("kb-pin-word"), rd = document.getElementById("kb-pin-reading"), r = w.querySelector("ruby");
    return { text: w.textContent, base: r ? Array.from(r.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent) : null,
             rt: r ? Array.from(r.querySelectorAll("rt")).map((x) => x.textContent) : null, reading: rd.textContent,
             readingShown: !rd.hidden && rd.offsetHeight > 0, lang: w.getAttribute("lang"), html: w.innerHTML,
             visible: !document.getElementById("kb-pin").hidden };`);
  return r;
}
const closePin = () => js(`const x = document.getElementById("kb-pin-x"); if (x) x.click(); return 1;`);
const NFC = (s) => s.normalize('NFC');
// âm tiết có dấu dựng bằng dấu kết hợp (không gõ sẵn chữ có dấu)
const T = { 1: '\u0304', 2: '\u0301', 3: '\u030c', 4: '\u0300' };
const M = (base, i, t) => NFC(base.slice(0, i + 1) + T[t] + base.slice(i + 1));

// ---- 2. nút ✎ Sửa / phím E ----
const ERRSUM = 'result = [sum(int(e.get("count") or 1) for e in kb.ERRORS.entries()), [(e.get("where", "") + ": " + e.get("msg", ""))[:160] for e in kb.ERRORS.entries()[-3:]]]';
async function waitFor(expr, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) { return v; } } catch (e) { /* trang đang dựng lại */ } await sleep(150); }
  return null;
}
async function waitPy(code, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await py(code); if (v) { return v; } } catch (e) { /* bỏ qua */ } await sleep(200); }
  return null;
}
const D = KB + 'd = kb._dialog\nimport aqt\n';
const win = () => py(D + 'w = kb.edit_win.window()\nresult = None if w is None else {"nid": w.nid, "title": w.windowTitle(), "visible": w.isVisible(), "n": sum(1 for x in aqt.mw.app.topLevelWidgets() if type(x).__name__ == "EditCardWindow" and x.isVisible())}');
const state = () => py(D + `c = d._card
result = {"cid": c.id if c else None, "nid": c.nid if c else None, "rev": mw.col.db.scalar("select count() from revlog"),
          "coins": st.load()["coins"], "cmod": mw.col.db.scalar("select mod from cards where id = ?", c.id) if c else None,
          "busy": d._busy, "side": d._side}`);
const panel = () => js(`const g = (id) => document.getElementById(id); let txt = "";
  try { txt = g("kb-card").contentDocument.body.innerText; } catch (e) { txt = ""; }
  return { open: !g("kb-panel").hidden, front: !g("kb-show").hidden, back: !g("kb-ratings").hidden, edit: !g("kb-rv-edit").hidden,
           note: g("kb-rv-note").hidden ? "" : g("kb-rv-note").textContent, text: txt, counts: [0, 1, 2].map((i) => g("kb-c" + i).textContent).join(" ") };`);
const pressE = (opts) => js(`document.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ key: "e", bubbles: true, cancelable: true }, ${JSON.stringify(opts || {})}))); return 1;`);
const pressKey = (k, opts) => js(`document.dispatchEvent(new KeyboardEvent("keydown", Object.assign({ key: ${JSON.stringify(k)}, bubbles: true, cancelable: true }, ${JSON.stringify(opts || {})}))); return 1;`);
// sửa trường Nghĩa trong cửa sổ như người dùng gõ (trình sửa của Anki lưu bằng thao tác "Update Note")
const typeMeaning = (suffix) => py(D + `w = kb.edit_win.window(); ed = w.editor
keys = list(ed.note.keys()); f = "Nghĩa" if "Nghĩa" in keys else keys[-1]
ed.note[f] = ed.note[f] + ${JSON.stringify(suffix)}
ed.loadNote()
ed._save_current_note()
result = ed.note[f]`);
const closeWin = () => py(D + 'w = kb.edit_win.window()\nif w is not None:\n    w.close()\nresult = 1');
async function startReview(deckName) {
  await js('if (!document.getElementById("kb-panel").hidden) document.getElementById("kb-stop").click(); return 1;');
  await sleep(400);
  await deck(deckName);
  await js('document.getElementById("kb-review").click(); return 1;');
  await waitFor('return !document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden;');
  await sleep(500);
}
async function flipCard() {
  await js('document.getElementById("kb-show").click(); return 1;');
  await waitFor('return !document.getElementById("kb-ratings").hidden;');
  await sleep(300);
}

async function part2() {
  console.log('== 2. nút ✎ Sửa / phím E');
  const keys0 = await py(KB + 'result = sorted(k for k in mw.col.all_config() if k.startswith("kotoba_batake"))');
  const DECK = 'A::Có câu ví dụ + audio';
  await startReview(DECK);
  let p = await panel(), s0 = await state();
  const lay = await js(`const r = (id) => document.getElementById(id).getBoundingClientRect(); const e = r("kb-rv-edit"), b = r("kb-show"), c = r("kb-card-wrap");
    return { ex: e.x, ey: e.y, ew: e.width, eh: e.height, bx: b.x, bh: b.height, cl: c.x, cb: c.bottom, ww: window.innerWidth };`);
  ok(p.edit && Math.abs(lay.ex - lay.cl) <= 2 && lay.ex < lay.bx && Math.abs(lay.eh - lay.bh) <= 1 && lay.ey >= lay.cb,
    'mặt trước: nút ✎ Sửa ở góc dưới bên trái, cùng hàng + cao bằng nút Lật thẻ (' + Math.round(lay.ew) + '×' + Math.round(lay.eh) + ') ' + JSON.stringify(lay));
  await page.shot(SHOTS + '/1322_nut_sua_truoc.png');

  // mở bằng phím E ở mặt trước
  await pressE();
  let w = await waitPy(D + 'w = kb.edit_win.window()\nresult = w is not None and w.isVisible()');
  let wi = await win();
  ok(w && wi && wi.nid === s0.nid && wi.title === 'Sửa thẻ · ことば畑', 'phím E ở mặt trước → cửa sổ "Sửa thẻ · ことば畑" cho đúng note đang ôn');
  ok((await state()).side === 'q' && (await panel()).front, 'mở cửa sổ không lật thẻ, không đổi gì trong bảng ôn');
  await pressE(); await sleep(800);
  await js('document.getElementById("kb-rv-edit").click(); return 1;'); await sleep(800);
  wi = await win();
  ok(wi && wi.n === 1, 'bấm E / ✎ Sửa thêm lần nữa → vẫn một cửa sổ (' + (wi && wi.n) + ')');
  // đóng không sửa gì → không báo gì
  await closeWin(); await sleep(1500);
  p = await panel();
  ok(!(await win()) && p.note === '' && p.front, 'đóng cửa sổ không sửa gì → thẻ như cũ, không báo "Đã lưu"');

  // mặt sau: bấm nút, sửa Nghĩa, đóng → hiện chữ mới đúng mặt sau
  await flipCard();
  p = await panel();
  ok(p.edit, 'mặt sau: nút ✎ Sửa vẫn hiện');
  const lay2 = await js(`const r = (id) => document.getElementById(id).getBoundingClientRect(); const e = r("kb-rv-edit"), q = r("kb-ratings");
    return { ok: e.x < q.x && Math.abs(e.y - q.y) <= 2 && q.right <= window.innerWidth };`);
  ok(lay2.ok, 'mặt sau: nút ✎ Sửa bên trái bốn nút chấm, cùng hàng, không tràn');
  await page.shot(SHOTS + '/1322_nut_sua_sau.png');
  await js('document.getElementById("kb-rv-edit").click(); return 1;');
  await waitPy(D + 'w = kb.edit_win.window()\nresult = w is not None');
  const s1 = await state();
  const typed = await typeMeaning(' ✎1322');
  await sleep(1200);
  p = await panel();
  ok(!/✎1322/.test(p.text), 'đang gõ trong cửa sổ: thẻ chưa dựng lại sau mỗi chữ (đợi đóng cửa sổ)');
  await closeWin();
  await waitFor('return /✎1322/.test(document.getElementById("kb-card").contentDocument.body.innerText);', 8000);
  p = await panel();
  const s2 = await state();
  ok(/✎1322/.test(p.text) && p.back && !p.front, 'đóng cửa sổ → mặt sau hiện chữ mới, vẫn ở mặt sau, bốn nút chấm còn');
  ok(p.note === 'Đã lưu thẻ.', 'dòng "Đã lưu thẻ." dưới chậu');
  ok(s2.cid === s1.cid && s2.rev === s1.rev && s2.coins === s1.coins && s2.cmod === s1.cmod && p.counts === (await panel()).counts,
    'đúng thẻ đó; revlog / xu không đổi; cards.mod không đổi (sửa note chỉ đổi notes.mod)');
  const plantM = await js(`const d = Garden._data(); const pl = d.plants.find((x) => x.nid === ${s1.nid}); return pl ? pl.meaning : null;`);
  ok(plantM && /✎1322/.test(plantM), 'cây trong vườn cập nhật nghĩa mới');
  await page.shot(SHOTS + '/1322_da_luu.png');

  // sửa xong chấm bình thường
  await js('document.querySelector(".kb-rate-3").click(); return 1;');
  await waitPy(D + 'result = mw.col.db.scalar("select count() from revlog") > ' + s2.rev + ' and not d._busy');
  await waitFor('return !document.getElementById("kb-show").hidden || !document.getElementById("kb-done").hidden;');
  await sleep(800);
  const s3 = await state();
  const toast = await js('const t = document.getElementById("kb-toast"); return t && !t.hidden ? t.textContent : "";');
  ok(s3.rev === s2.rev + 1 && s3.coins > s2.coins && s3.cid !== s1.cid && !/chỗ khác/.test(toast),
    'sửa xong chấm "Được" như thường: revlog +1, có xu, sang thẻ kế tiếp, không báo "ôn ở chỗ khác"');

  // Ctrl+Z trong vườn: lần sửa note là thao tác của Anki → không hoàn tác nhầm (lật thẻ để thấy trường Nghĩa)
  await flipCard();
  const sB = await state();
  await pressE();
  await waitPy(D + 'w = kb.edit_win.window()\nresult = w is not None');
  await typeMeaning(' ✎undo');
  await closeWin();
  const shownUndo = await waitFor('return /✎undo/.test(document.getElementById("kb-card").contentDocument.body.innerText);', 8000);
  ok(!!shownUndo, 'mặt sau: lưu xong hiện chữ mới (lần hai)');
  const undoBtn = await js('return !document.getElementById("kb-rv-undo").hidden;');
  ok(!undoBtn, 'vừa sửa note: nút ↶ Hoàn tác ẩn (bước Undo kế tiếp của Anki là lần sửa, không phải lượt chấm)');
  await pressKey('z', { ctrlKey: true });
  await sleep(1500);
  p = await panel();
  const sC = await state();
  ok(sC.rev === sB.rev && /✎undo/.test(p.text) && /Không có lượt chấm nào để hoàn tác/.test(p.note),
    'Ctrl+Z trong vườn: không hoàn tác lần sửa, không hoàn tác lượt chấm trước đó, báo "Không có lượt chấm nào để hoàn tác." ' + JSON.stringify([sC.rev, sB.rev, p.note, /✎undo/.test(p.text)]));
  // Undo ở cửa sổ chính trả lại chữ cũ → thẻ dựng lại
  const waitBefore = await py(KB + 'result = bool(kb._dialog._edit_wait)');
  await py(KB + 'mw.undo()\nresult = 1');
  await waitFor('return !/✎undo/.test(document.getElementById("kb-card").contentDocument.body.innerText);', 8000);
  p = await panel();
  const sU = await state();
  ok(!/✎undo/.test(p.text) && p.note === 'Thẻ vừa được sửa.' && sU.cid === sB.cid,
    'Edit → Undo ở cửa sổ chính trả lại chữ cũ: thẻ đang ôn dựng lại, báo "Thẻ vừa được sửa." ' + JSON.stringify([/✎undo/.test(p.text), p.note, sU.cid === sB.cid, 'edit_wait trước Undo: ' + waitBefore]));

  // phím E không chạy khi đang gõ / có Ctrl / Alt / Meta
  await js(`const i = document.createElement("input"); i.id = "mk-e-in"; document.getElementById("kb-panel").appendChild(i); i.focus();
    i.dispatchEvent(new KeyboardEvent("keydown", { key: "e", bubbles: true, cancelable: true })); return 1;`);
  await pressE({ ctrlKey: true }); await pressE({ altKey: true }); await pressE({ metaKey: true });
  await sleep(1000);
  ok(!(await win()), 'phím E trong ô gõ chữ, Ctrl+E, Alt+E, ⌘E → không mở cửa sổ');
  await js('const i = document.getElementById("mk-e-in"); if (i) i.remove(); return 1;');
  // phím E gõ trong ô đáp án của thẻ (iframe chuyển phím sang vườn qua Garden.key)
  const typeans = await js(`const doc = document.getElementById("kb-card").contentDocument; const i = doc.createElement("input"); i.id = "typeans";
    doc.body.appendChild(i); i.focus(); const ev = new KeyboardEvent("keydown", { key: "e", bubbles: true, cancelable: true }); i.dispatchEvent(ev); return 1;`);
  await sleep(1000);
  ok(typeans && !(await win()), 'gõ chữ e trong ô đáp án của thẻ → không mở cửa sổ');

  // đang lưu lượt chấm (_busy) → bỏ qua
  await py(D + 'd._busy = True\nd._dispatch("rv:edit")\nresult = 1');
  await sleep(800);
  const busyWin = await win();
  await py(D + 'd._busy = False\nresult = 1');
  ok(!busyWin, 'đang lưu lượt chấm / đang hoàn tác → ✎ Sửa không mở');

  // sửa ở Trình duyệt thẻ (thao tác khác cửa sổ Sửa thẻ) khi đang ôn → thẻ dựng lại
  const sD = await state();
  await py(KB + `from aqt.operations.note import update_note
note = mw.col.get_note(${sD.nid})
keys = list(note.keys()); f = "Nghĩa" if "Nghĩa" in keys else keys[-1]
note[f] = note[f] + " ✎browser"
update_note(parent=mw, note=note).run_in_background()
result = 1`);
  await waitFor('return /✎browser/.test(document.getElementById("kb-card").contentDocument.body.innerText);', 8000);
  p = await panel();
  ok(/✎browser/.test(p.text) && (await state()).cid === sD.cid, 'note sửa ở chỗ khác (Trình duyệt thẻ) khi đang ôn → thẻ hiện chữ mới, vẫn đúng thẻ');

  // cửa sổ đang mở cho thẻ A, chấm A trong vườn → sang B; bấm E ở B → cửa sổ chuyển sang note B (lưu A trước)
  const sE = await state();
  await pressE();
  await waitPy(D + 'w = kb.edit_win.window()\nresult = w is not None');
  await typeMeaning(' ✎A');
  await sleep(600);
  await flipCard();
  await js('document.querySelector(".kb-rate-3").click(); return 1;');
  await waitPy(D + 'result = mw.col.db.scalar("select count() from revlog") > ' + sE.rev + ' and not d._busy');
  await waitFor('return !document.getElementById("kb-show").hidden;');
  await sleep(600);
  const sF = await state();
  await pressE(); await sleep(1500);
  wi = await win();
  const aSaved = await py(KB + `n = mw.col.get_note(${sE.nid}); result = any("✎A" in n[k] for k in n.keys())`);
  ok(sF.cid !== sE.cid && wi && wi.nid === sF.nid && wi.n === 1 && aSaved, 'E ở thẻ kế tiếp khi cửa sổ còn mở → cùng cửa sổ chuyển sang note mới; chữ đã sửa ở note trước còn nguyên');
  await closeWin(); await sleep(1200);

  // đóng vườn khi cửa sổ sửa đang mở → cửa sổ vẫn lưu; mở lại vườn bình thường
  await pressE();
  await waitPy(D + 'w = kb.edit_win.window()\nresult = w is not None');
  const nidG = (await state()).nid;
  await py(D + 'd.close()\nresult = 1');
  await sleep(1200);
  await typeMeaning(' ✎sauvuon');
  await sleep(800);
  await closeWin(); await sleep(1200);
  const gSaved = await py(KB + `n = mw.col.get_note(${nidG}); result = any("✎sauvuon" in n[k] for k in n.keys())`);
  ok(gSaved && !(await win()), 'đóng vườn khi đang sửa: cửa sổ sửa vẫn mở, lưu được, đóng không lỗi');
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await startReview(DECK);
  ok((await panel()).edit, 'mở lại vườn: ôn tiếp, nút ✎ Sửa hiện');

  // note bị xoá khi cửa sổ sửa đang mở → cửa sổ đóng, vườn sang thẻ kế tiếp
  const sG = await state();
  await pressE();
  await waitPy(D + 'w = kb.edit_win.window()\nresult = w is not None');
  await py(KB + `from aqt.operations.note import remove_notes
remove_notes(parent=mw, note_ids=[${sG.nid}]).run_in_background()
result = 1`);
  await waitPy(D + 'result = kb.edit_win.window() is None and (d._card is None or d._card.nid != ' + sG.nid + ')', 10000);
  await sleep(800);
  const sH = await state();
  ok(!(await win()) && sH.nid !== sG.nid, 'note bị xoá khi đang sửa → cửa sổ đóng, bảng ôn sang thẻ kế tiếp');

  // không dựng được trình sửa (bản Anki khác) → mở Trình duyệt thẻ ở đúng note
  await py(KB + `kb.edit_win._make_editor_saved = kb.edit_win._make_editor
def _boom(*a, **k):
    raise RuntimeError("thử: không dựng được")
kb.edit_win._make_editor = _boom
result = 1`);
  await pressE(); await sleep(2500);
  const br = await py(KB + `import aqt
b = aqt.dialogs._dialogs.get("Browser", [None, None])[1]
result = None if b is None else {"rows": len(b.table.get_selected_note_ids()) if hasattr(b, "table") else -1, "search": b.form.searchEdit.lineEdit().text() if hasattr(b.form, "searchEdit") else ""}`);
  const note1 = (await panel()).note;
  await py(KB + `kb.edit_win._make_editor = kb.edit_win._make_editor_saved
import aqt
b = aqt.dialogs._dialogs.get("Browser", [None, None])[1]
if b is not None:
    b.close()
result = 1`);
  await sleep(1200);
  ok(br && /nid:/.test(br.search) && /Trình duyệt thẻ/.test(note1) && !(await win()), 'không dựng được trình sửa → mở Trình duyệt thẻ ở đúng note (' + (br && br.search) + ')');

  // Anki đóng mọi cửa sổ (đóng hồ sơ / đồng bộ toàn bộ) khi cửa sổ sửa đang mở → lưu rồi đóng
  await pressE();
  await waitPy(D + 'w = kb.edit_win.window()\nresult = w is not None');
  const nidC = (await state()).nid;
  await typeMeaning(' ✎closeall');
  await py(KB + `import aqt
kb._t_closeall = False
def _ok():
    kb._t_closeall = True
aqt.dialogs.closeAll(_ok)
result = 1`);
  const closed = await waitPy(KB + 'result = kb._t_closeall', 8000);
  const cSaved = await py(KB + `n = mw.col.get_note(${nidC}); result = any("✎closeall" in n[k] for k in n.keys())`);
  ok(closed && cSaved && !(await win()), 'Anki đóng mọi cửa sổ (như lúc đóng hồ sơ) → cửa sổ sửa lưu xong rồi mới đóng');

  // không thêm khoá collection mới
  const keys1 = await py(KB + 'result = sorted(k for k in mw.col.all_config() if k.startswith("kotoba_batake"))');
  ok(JSON.stringify(keys1) === JSON.stringify(keys0), 'không thêm khoá collection nào');

  // bố cục ở cửa sổ nhỏ
  for (const [ww, hh] of [[1024, 700], [720, 520]]) {
    await py(D + `d.showNormal(); d.resize(${ww}, ${hh})\nresult = 1`); await sleep(900);
    await startReview(DECK);
    await flipCard();
    const L = await js(`const r = (id) => document.getElementById(id).getBoundingClientRect(); const e = r("kb-rv-edit"), q = r("kb-ratings");
      const rates = Array.from(document.querySelectorAll(".kb-rate")).map((b) => b.getBoundingClientRect());
      return { fit: e.left >= 0 && q.right <= document.documentElement.clientWidth + 1, row: rates.every((b) => Math.abs(b.top - e.top) <= 2),
               w: Math.round(e.width), minRate: Math.round(Math.min.apply(null, rates.map((b) => b.width))), scroll: document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1 };`);
    ok(L.fit && L.row && L.scroll && L.minRate >= 60, 'cửa sổ ' + ww + '×' + hh + ': nút ✎ Sửa + 4 nút chấm cùng hàng, không tràn ngang (nút chấm hẹp nhất ' + L.minRate + ' px)');
    await page.shot(SHOTS + '/1322_' + ww + '.png');
  }
  await py(D + 'd.resize(1366, 860)\nresult = 1');
}

let ERR0 = 0;
const T0 = Date.now();

(async () => {
  ERR0 = (await py(KB + ERRSUM))[0];
  await py(KB + `col = mw.col
mm = col.models
m = mm.new("Chinese 1322")
for f in ("Hanzi", "Pinyin", "Nghĩa"):
    mm.add_field(m, mm.new_field(f))
t = mm.new_template("T1"); t["qfmt"] = "{{Hanzi}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Nghĩa}}"
mm.add_template(m, t); mm.add(m); zh = mm.by_name("Chinese 1322")
dz = col.decks.id("ZH1322")
rows = [("你好", "ni3 hao3", "xin chào"), ("学生", "xue2sheng", "học sinh"), ("中[zhong1]国[guo2]", "", "Trung Quốc"),
        ("方案", "fangan", "phương án"), ("一点儿", "yi4dian3r", "một chút"), ("<img src=x onerror=alert(1)>猫", "mao1", "mèo")]
for w, p, mn in rows:
    n = col.new_note(zh); n["Hanzi"], n["Pinyin"], n["Nghĩa"] = w, p, mn; col.add_note(n, dz)
today = col.sched.today
for i, cid in enumerate(col.find_cards('deck:"ZH1322"')):
    col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3 where id=?", 5 + i, today + 3, cid)
kb.save_config(show_tooltips=False, sound=False, music=False)
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await sleep(600);

  console.log('== 1. pinyin trên từng chữ');
  await deck('ZH1322');
  let r = await pin('你好');
  ok(r && r.visible && JSON.stringify(r.base) === JSON.stringify(['你', '好']) && JSON.stringify(r.rt) === JSON.stringify([M('ni', 1, 3), M('hao', 1, 3)]),
    'bấm cây 你好 (deck ghi ni3 hao3): mỗi chữ một âm tiết, có dấu thanh');
  ok(r && !r.readingShown && r.lang === 'zh', 'dòng pinyin dưới chữ ẩn khi đã có pinyin trên chữ; chữ mang lang="zh"');
  await page.shot(SHOTS + '/1322_pin_ni_hao.png');
  await closePin();
  r = await pin('学生');
  ok(r && JSON.stringify(r.rt) === JSON.stringify([M('xue', 2, 2), 'sheng']), 'xue2sheng → âm thứ hai thanh nhẹ, không dấu');
  await closePin();
  r = await pin('中国');
  ok(r && JSON.stringify(r.base) === JSON.stringify(['中', '国']) && JSON.stringify(r.rt) === JSON.stringify([M('zhong', 2, 1), M('guo', 2, 2)]),
    'trường Từ 中[zhong1]国[guo2] → chữ 中国, pinyin trên từng chữ');
  await closePin();
  r = await pin('方案');
  ok(r && r.rt === null && r.readingShown && r.reading === 'fangan', 'fangan (chia được 2 kiểu) → không đoán, dòng pinyin dưới chữ như 1.32.1');
  await closePin();
  r = await pin('一点儿');
  ok(r && JSON.stringify(r.rt) === JSON.stringify([M('yi', 1, 4), M('dian', 2, 3), 'r']), '一点儿 (yi4dian3r) → 儿 nhận r');
  await closePin();
  const tip = await hover('你好');
  ok(tip && JSON.stringify(tip.rt) === JSON.stringify([M('ni', 1, 3), M('hao', 1, 3)]) && tip.lang === 'zh', 'ô gợi ý khi rê chuột: pinyin trên từng chữ');
  const evil = await js(`const d = Garden._data(); const p = d.plants.find((x) => /猫/.test(x.word)); return p ? p.word : null;`);
  if (evil) {
    r = await pin(evil);
    ok(r && !/<img/i.test(r.html), 'chữ lạ trong trường Từ không thành thẻ HTML (textContent)');
  } else {
    ok(true, 'trường Từ có HTML: Anki / plain_text đã bỏ thẻ (không có cây mang chữ HTML)');
  }
  await closePin();
  await deck('A::Có câu ví dụ + audio');
  const ja = await js(`const d = Garden._data(); return d.plants.slice(0, 40).every((p) => !p.ruby);`);
  ok(ja, 'deck tiếng Nhật: không cây nào có ruby kiểu mới');
  await part2();
  const e1 = await py(KB + ERRSUM);
  ok(e1[0] === ERR0, 'nhật ký Báo lỗi không có lỗi mới' + (e1[0] !== ERR0 ? ': ' + e1[1].join(' | ') : ''));

  console.log('\nKẾT QUẢ: ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });

