// Ảnh phác 1.32.2 (17/11) — nút "✎ Sửa" / phím E sửa thẻ ngay lúc ôn + pinyin nằm trên từng chữ (deck tiếng Trung).
// Chưa phải mã thật: vẽ đè lên bảng ôn / thẻ cây thật của add-on 1.32.1; cửa sổ sửa là cửa sổ sửa note THẬT của Anki
// (aqt.editor.Editor dựng cho thẻ đang ôn, chụp bằng QWidget.grab()).
// Chạy (ANKI_PY = venv aqt):
//   B=/tmp/kb_mock1322; ./setup_demo.sh $B ../../kotoba_batake && $ANKI_PY demo_zhko.py $B/Test/collection.anki2
//   (./run_anki.sh $B 9333 $B.log &) ; node mock_132.js OUT setup ; node mock_1322.js OUT ; python3 mock_1322_ghep.py OUT RA
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_1322';
const ONLY = process.argv.slice(3);
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const W = 1366, H = 860;
const want = (k) => !ONLY.length || ONLY.indexOf(k) >= 0;
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nfrom aqt import mw\nfrom aqt.qt import *\n';
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
    const p = await Page.open(info.webSocketDebuggerUrl);
    const yes = await Promise.race([p.eval('typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
    if (yes) { return p; }
    p.close();
  }
  return null;
}
async function shot(name, clip) {
  await sleep(300);
  const params = { format: 'png' };
  if (clip) { params.clip = Object.assign({ scale: 1 }, clip); }
  const r = await page.send('Page.captureScreenshot', params);
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('  ảnh', name);
}
async function rect(sel) {
  return js(`const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return {x: Math.round(b.x), y: Math.round(b.y), width: Math.round(b.width), height: Math.round(b.height)};`);
}
const deck = (name) => py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`).then(() => sleep(2000));
const sky = (h) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "sunny"); return 1;`);

// Nút "✎ Sửa" vẽ đè vào hàng nút dưới thẻ (bên trái, cao bằng nút Lật thẻ / nút chấm), như nút Edit của Anki
const MOCK_CSS = `
.mk-row { display: flex; gap: 10px; align-items: stretch; }
.mk-row > .kb-btn-wide, .mk-row > .kb-ratings { flex: 1 1 auto; min-width: 0; }
.mk-edit { flex: 0 0 auto; height: 60px; box-sizing: border-box; margin-left: 0; padding: 0 14px; font-size: 16px;
  background: var(--kb-paper, #fffaf0); display: flex; flex-direction: column; align-items: center; justify-content: center; line-height: 1.15; }
.mk-edit .kb-key { font-size: 11px; opacity: .75; margin-top: 2px; }
.mk-hl { outline: 3px dashed #e0544e !important; outline-offset: 4px; }
.mk-ruby rt { font-size: 13px; color: #1f5faf; font-weight: normal; }
`;
async function addEditButton() {
  await js(`if (!document.getElementById("mk1322-css")) { const s = document.createElement("style"); s.id = "mk1322-css"; s.textContent = ${JSON.stringify(MOCK_CSS)}; document.head.appendChild(s); }
    const a = document.querySelector("#kb-panel .kb-actions"); if (!a || a.querySelector(".mk-edit")) return 1;
    // dựng lại hàng nút: [✎ Sửa][Lật thẻ] hoặc [✎ Sửa][Lại Khó Được Dễ]
    const row = document.createElement("div"); row.className = "mk-row";
    const b = document.createElement("button"); b.type = "button"; b.className = "kb-btn mk-edit mk-hl";
    b.innerHTML = '<span>✎ Sửa</span><span class="kb-key">E</span>'; b.title = "Sửa thẻ này (E)";
    row.appendChild(b);
    a.insertBefore(row, a.firstChild);
    row.appendChild(document.getElementById("kb-show"));
    row.appendChild(document.getElementById("kb-ratings"));
    return 1;`);
}

(async () => {
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn — chạy mock_132.js OUT setup trước'); process.exit(2); }
  await py(KB + `kb._dialog.resize(${W}, ${H}); result = 1`);
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');

  if (want('on')) {
    // 1. bảng ôn: mặt trước + mặt sau có nút ✎ Sửa ở góc dưới bên trái
    await deck('Tiếng Nhật::N5 · Từ vựng'); await sky(9);
    await js(`if (!document.getElementById("kb-panel").hidden) document.getElementById("kb-stop").click(); return 1;`); await sleep(800);
    // thẻ đầu hàng đợi là 電車 (demo_col) — đặt nghĩa về như cũ để chạy lại được nhiều lần
    await py(KB + `nid = mw.col.find_notes('deck:"Tiếng Nhật::N5 · Từ vựng" "Từ:電車"')
for n in nid:
    note = mw.col.get_note(n); note["Nghĩa"] = "tàu điện"; mw.col.update_note(note)
result = len(nid)`);
    await js(`document.getElementById("kb-review").click(); return 1;`); await sleep(2500);
    await addEditButton(); await sleep(400);
    await shot('raw_truoc', { x: 0, y: 0, width: W, height: H });
    await js(`document.getElementById("kb-show").click(); return 1;`); await sleep(1500);
    await shot('raw_sau', { x: 0, y: 0, width: W, height: H });
  }

  if (want('sua')) {
    // 2. bấm ✎ Sửa → cửa sổ sửa note của Anki cho đúng thẻ đang ôn (đổi trường Nghĩa)
    const shotPath = path.join(OUT, 'raw_cua_so_sua.png');
    await py(KB + `import aqt, aqt.editor, builtins
card = kb._dialog._card or kb._dialog._shown_card
w = QMainWindow(None, Qt.WindowType.Window)
form = aqt.forms.editcurrent.Ui_Dialog(); form.setupUi(w); w.setMenuBar(None)
w.setWindowTitle("Sửa thẻ · ことば畑")
ed = aqt.editor.Editor(mw, form.fieldsArea, w, editor_mode=aqt.editor.EditorMode.EDIT_CURRENT)
ed.card = card; ed.set_note(card.note(), focusTo=2)
bb = QDialogButtonBox(Qt.Orientation.Horizontal); form.verticalLayout.insertWidget(1, bb)
bb.addButton(QDialogButtonBox.StandardButton.Close)
w.resize(560, 600); w.show()
builtins._kb_mock_edit = (w, ed)
result = card.id`);
    await sleep(3500);
    // gõ thêm vào trường Nghĩa (như người dùng đang sửa) rồi chụp
    await py(KB + `import builtins
w, ed = builtins._kb_mock_edit
ed.web.eval("""(() => { const f = document.querySelectorAll('.field-container')[2]; return 1; })()""")
ed.note["Nghĩa"] = "tàu điện, xe điện"; ed.loadNote(focusTo=2)
result = 1`);
    await sleep(2500);
    await py(KB + `import builtins
w, ed = builtins._kb_mock_edit
result = w.grab().save(${JSON.stringify(shotPath)})`);
    console.log('  ảnh raw_cua_so_sua (cửa sổ Anki)');
  }

  if (want('luu')) {
    // 3. đóng cửa sổ (lưu) → thẻ đang ôn hiện chữ mới ở đúng mặt đang xem, không đổi lượt ôn / xu
    await py(KB + `import builtins
w, ed = builtins._kb_mock_edit
note = ed.note; note["Nghĩa"] = "tàu điện, xe điện"; mw.col.update_note(note)
ed.cleanup(); w.close()
d = kb._dialog; card = d._card or d._shown_card; card.load()
html = kb.core.type_answer(mw.col, mw.prepare_card_text_for_display(card.answer()), d._type_info, "")
d.web.eval("(() => { const f = document.getElementById('kb-card'); f.contentWindow.__kbShow(" + json.dumps(html) + ", " + json.dumps("<style>" + card.render_output().css + "</style>") + ", 'card', 'a'); return 1; })()")
result = 1`);
    await sleep(1200);
    await js(`Garden.rvNote("Đã lưu thẻ."); const n = document.getElementById("kb-rv-note"); n.classList.add("mk-hl"); return 1;`);
    await sleep(400);
    await shot('raw_da_luu', { x: 0, y: 0, width: W, height: H });
    await js(`document.getElementById("kb-rv-note").classList.remove("mk-hl"); document.getElementById("kb-stop").click(); return 1;`);
    await sleep(800);
  }

  if (want('pinyin')) {
    // 4. cây tiếng Trung: pinyin hiện tại (dòng dưới, đúng như deck ghi) → pinyin nằm trên từng chữ; deck ghi số → dấu thanh
    await deck('Tiếng Trung::HSK 1'); await sky(10);
    await py(KB + `n = mw.col.find_notes('deck:"Tiếng Trung::HSK 1" "Hanzi:你好"')
for nid in n:
    note = mw.col.get_note(nid)
    for k in note.keys():
        if k.lower().startswith("pinyin"):
            note[k] = "ni3 hao3"
    mw.col.update_note(note)
kb._dialog.refresh(); result = len(n)`);
    await sleep(2000);
    const items = [
      { word: '学生', out: 'raw_py_hoc_sinh', ruby: '<ruby>学<rt>xué</rt>生<rt>sheng</rt></ruby>' },
      { word: '你好', out: 'raw_py_ni_hao', ruby: '<ruby>你<rt>nǐ</rt>好<rt>hǎo</rt></ruby>' },
    ];
    for (const o of items) {
      const pos = await js(`const d = Garden._data(), L = Garden._layout(), cv = document.getElementById("kb-canvas").getBoundingClientRect();
        const i = d.plants.findIndex((p) => p.word === ${JSON.stringify(o.word)}); if (i < 0) return null;
        const cw = 18 * L.scale, ch = 20 * L.scale; return [cv.left + (i % L.cols) * cw + cw / 2, cv.top + Math.floor(i / L.cols) * ch + ch * 0.6];`);
      if (!pos) { console.log('  không thấy cây', o.word); continue; }
      for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x: pos[0], y: pos[1], button: 'left', clickCount: 1 }); }
      await sleep(600);
      const r = await rect('#kb-pin');
      const clip = { x: Math.max(0, r.x - 30), y: Math.max(0, r.y - 30), width: r.width + 60, height: r.height + 60 };
      await shot(o.out + '_cu', clip);
      await js(`if (!document.getElementById("mk1322-css")) { const s = document.createElement("style"); s.id = "mk1322-css"; s.textContent = ${JSON.stringify(MOCK_CSS)}; document.head.appendChild(s); }
        const w = document.getElementById("kb-pin-word"); w.innerHTML = ${JSON.stringify(o.ruby)}; w.setAttribute("lang", "zh-CN"); w.classList.add("mk-ruby");
        document.getElementById("kb-pin-reading").hidden = true; return 1;`);
      await sleep(300);
      await shot(o.out + '_moi', clip);
      await js(`document.getElementById("kb-pin-reading").hidden = false; document.getElementById("kb-pin-x").click(); return 1;`);
      await sleep(300);
    }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
