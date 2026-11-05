// 1.22.6 — chụp các màn đã sửa (chạy trên bản cũ và bản mới để so "trước / sau"):
//   a_cham_roi_dung        ôn trong vườn: bấm "Được" rồi bấm Dừng ngay (lượt chấm đang lưu)
//   b_cham_roi_doi_deck    ôn trong vườn: bấm "Được" rồi đổi deck ngay
//   c_anki_che_do_toi      Anki ở chế độ tối, mẫu thẻ có ".nightMode { color: #fafafa }"
//   d_the_hom_nay          thẻ Hôm nay ở 1366 × 768 khi có 4 dòng việc
//   e_tab_giong_cay        tab Giống cây: các ô chọn giống
//   f_config_sai_kieu      mở vườn khi config sửa tay sai kiểu ("daily_goal": "", "max_plants": "nhiều"…)
//   g_doi_ho_so            File → Đổi hồ sơ khi vườn đang mở
// Lượt chấm được làm chậm 1,5 giây (như máy yếu / collection lớn) để lần nào cũng dựng đúng lúc dễ trùng.
// In ra info.json số liệu cho từng ảnh. Chạy: KB_SCRIPTS=shots_1226.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1226';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenPaper !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const info = {};
const DECK_A = 'A::Có câu ví dụ + audio', DECK_C = 'C::Chỉ từ + audio từ';
const shot = async (name) => { await page.shot(SHOTS + '/' + name + '.png'); };
async function clip(name, x, y, w, h, scale) {
  const r = await page.send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: h, scale: scale || 1 } });
  fs.writeFileSync(SHOTS + '/' + name + '.png', Buffer.from(r.data, 'base64'));
}
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + `kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(DECK_A)}); d.refresh(); result = 1`);
  await sleep(2000);
  await js('if (window.GardenPaper) GardenPaper.close(); if (window.GardenCal) GardenCal.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); return 1;');
  await js('window.__kbPaid = []; const o = Garden.mobilePaid; Garden.mobilePaid = function (x) { window.__kbPaid.push(x.message || ""); return o.apply(this, arguments); }; return 1;');
}
async function flipCard() {
  await js('document.getElementById("kb-review").click(); return 1;');
  await waitFor('return !document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden;');
  await sleep(500);
  await js('document.getElementById("kb-show").click(); return 1;');
  return waitFor('return !document.getElementById("kb-ratings").hidden;');
}
const panelState = () => js(`const p = document.getElementById("kb-panel"); if (p.hidden) return "bảng ôn đóng";
  let w = ""; try { w = document.getElementById("kb-card").contentDocument.getElementById("qa").innerText.trim().split("\\n")[0]; } catch (e) {}
  return "bảng ôn MỞ LẠI, thẻ «" + w + "»";`);
const wallet = () => py(KB + 'd = st.load(); m = d.get("mobile") or {}; result = [d["coins"], (m.get("total") or {}).get("reviews", 0)]');
// ảnh một cửa sổ Qt (hộp cảnh báo, bảng chọn hồ sơ) — chụp thật bằng QWidget.grab()
const GRAB = `from aqt.qt import QMessageBox, QImage, QPainter, QColor
def _grab(w, path):
    w.grab().save(path)
`;

(async () => {
  await py(KB + `kb.mobile_catch_up()
kb._kb_orig_answer = getattr(kb, "_kb_orig_answer", None) or kb.answer_card
def _slow(parent, answer, _o=kb._kb_orig_answer):
    op = _o(parent=parent, answer=answer)
    _s = op.success
    op.success = lambda cb: _s(lambda ch: mw.progress.single_shot(1500, lambda: cb(ch), False))
    return op
kb.answer_card = _slow
result = 1`);
  await openGarden();

  // a. chấm rồi Dừng
  await flipCard();
  await js('document.querySelector(".kb-rate[data-ease=\'3\']").click(); document.getElementById("kb-stop").click(); return 1;');
  await sleep(2600);
  info.a = [await panelState()];
  await shot('a_cham_roi_dung');
  await js('if (!document.getElementById("kb-panel").hidden) document.getElementById("kb-stop").click(); return 1;');
  await sleep(500);

  // b. chấm rồi đổi deck
  await flipCard();
  const w0 = await wallet();
  const didC = await py(`result = mw.col.decks.id_for_name(${JSON.stringify(DECK_C)})`);
  await js(`document.querySelector(".kb-rate[data-ease='3']").click(); const s = document.getElementById("kb-deck"); s.value = "${didC}"; s.dispatchEvent(new Event("change")); return 1;`);
  await sleep(2100);
  await shot('b_cham_roi_doi_deck');
  await sleep(1500);
  const w1 = await wallet();
  const paid = await js('return window.__kbPaid || [];');
  info.b = [await panelState(), 'xu ' + w0[0] + ' → ' + w1[0], 'lượt "bù điện thoại": ' + (w1[1] - w0[1]) + (paid.length ? ' («' + paid[0].replace('ことば畑: ', '') + '»)' : '')];
  await js('if (!document.getElementById("kb-panel").hidden) document.getElementById("kb-stop").click(); return 1;');
  await py(KB + 'kb.answer_card = kb._kb_orig_answer; result = 1');

  // c. Anki tối
  await py(KB + `did = mw.col.decks.id_for_name(${JSON.stringify(DECK_A)})
nid = mw.col.db.list("select nid from cards where did = ?", did)[0]
m = mw.col.get_note(nid).note_type()
m["css"] = m["css"] + "\\n.nightMode { color: #fafafa; }\\n"
mw.col.models.update_dict(m)
from aqt.theme import Theme
mw.set_theme(Theme.DARK)
d = kb._dialog; d.deck_id = did; d.refresh(); result = 1`);
  await sleep(1500);
  await flipCard(); await sleep(700);
  info.c = [await js(`const b = document.getElementById("kb-card").contentDocument.body; const q = b.querySelector("#qa *") || b;
    return "nền thẻ " + getComputedStyle(b).backgroundColor + ", chữ " + getComputedStyle(q).color;`)];
  await shot('c_anki_che_do_toi');
  await js('document.getElementById("kb-stop").click(); return 1;');
  await py('from aqt.theme import Theme\nmw.set_theme(Theme.LIGHT)\nresult = 1');
  await sleep(800);

  // d. thẻ Hôm nay 1366 × 768
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  const td = await js(`const l = document.querySelector("#kb-today .kb-today-list"); const lr = l.getBoundingClientRect();
    const rows = Array.from(l.children).filter((e) => !e.hidden && e.getBoundingClientRect().height > 2);
    const cut = rows.filter((e) => e.getBoundingClientRect().bottom > lr.bottom + 1).map((e) => e.textContent.trim());
    const r = document.getElementById("kb-today").getBoundingClientRect();
    return {n: rows.length, cut: cut, box: [r.left, r.top, r.width, r.height], scroll: l.scrollHeight > l.clientHeight + 1};`);
  info.d = [td.n + ' dòng việc', td.cut.length ? 'bị cắt: ' + td.cut.join(', ') + (td.scroll ? ' (phải cuộn)' : '') : 'không dòng nào bị cắt'];
  await clip('d_the_hom_nay', Math.max(0, td.box[0] - 260), 0, 600, 300, 1.5);

  // e. tab Giống cây
  await py(KB + `d = st.load()
for s in ("sakura", "himawari"):
    if s not in d["more"]["seeds"]["owned"]:
        d["more"]["seeds"]["owned"].append(s)
st.save(d); kb._dialog.refresh(); result = 1`);
  await sleep(1200);
  await js('GardenHome.open("yard"); document.querySelector(\'#kb-home .kb-h-tab[data-tab="seed"]\').click(); return 1;');
  await sleep(1300);
  const rb = await js(`const b = document.querySelector("#kb-h-list .kb-h-rules"); b.scrollIntoView({block: "center"}); const r = b.getBoundingClientRect();
    const xs = Array.from(b.querySelectorAll(".kb-h-rule")).filter((e) => e.querySelector("select")).map((e) => Math.round(e.querySelector("select").getBoundingClientRect().left));
    return {box: [r.left, r.top, r.width, r.height], xs: xs};`);
  info.e = ['mép trái 3 ô chọn: ' + rb.xs.join(' / ') + ' px'];
  await sleep(300);
  await clip('e_tab_giong_cay', rb.box[0] - 10, rb.box[1] - 40, 720, rb.box[3] + 60, 1.5);
  await page.key('Escape', 'Escape', 27); await sleep(500);

  // f. config sai kiểu → mở vườn
  page.close();
  await py(KB + GRAB + `cfg = dict(mw.addonManager.getConfig("kotoba_batake"))
cfg.update({"daily_goal": "", "max_plants": "nhiều", "effects": "false"})
mw.addonManager.writeConfig("kotoba_batake", cfg)
kb._dialog.close()
kb._kb_warn = []
def _w(text, *a, **k):
    kb._kb_warn.append(str(text))
    box = QMessageBox(QMessageBox.Icon.Warning, "Anki", str(text))
    box.resize(520, 220)
    box.show()
    _grab(box, ${JSON.stringify(SHOTS + '/_f_dialog.png')})
    box.close()
kb._kb_old_warn = kb.showWarning
kb.showWarning = _w
result = 1`);
  await sleep(800);
  await openGarden();
  await sleep(1000);
  const fw = await py(KB + 'result = kb._kb_warn');
  info.f = [fw.length ? 'hộp lỗi: ' + fw[0].split('\n').slice(0, 3).join(' ').slice(0, 110) : 'vườn mở bình thường, không có hộp lỗi',
    'hiệu ứng: ' + (await js('return Garden && document.getElementById("kb-today-text").textContent ? "thẻ Hôm nay: " + document.getElementById("kb-today-text").textContent.slice(0, 30) : "trang trống (không có dữ liệu)";'))];
  await shot('f_config_sai_kieu');
  if (fw.length) {   // dán ảnh hộp cảnh báo (chụp thật) lên giữa ảnh trang
    await py(KB + `from aqt.qt import QImage, QPainter
img = QImage(${JSON.stringify(SHOTS + '/f_config_sai_kieu.png')}); dlg = QImage(${JSON.stringify(SHOTS + '/_f_dialog.png')})
p = QPainter(img); p.drawImage(int((img.width() - dlg.width()) / 2), int((img.height() - dlg.height()) / 2), dlg); p.end()
img.save(${JSON.stringify(SHOTS + '/f_config_sai_kieu.png')}); result = 1`);
  }
  await py(KB + `kb.showWarning = kb._kb_old_warn
cfg = dict(mw.addonManager.getConfig("kotoba_batake"))
for k in ("daily_goal", "max_plants", "effects"): cfg.pop(k, None)
mw.addonManager.writeConfig("kotoba_batake", cfg)
kb._dialog.refresh(); result = 1`);
  await sleep(1500);

  // g. đổi hồ sơ khi vườn mở
  await py(KB + 'mw.unloadProfileAndShowProfileManager(); result = 1');
  await sleep(4000);
  const g = await py(KB + GRAB + `wins = [w.windowTitle() for w in mw.app.topLevelWidgets() if w.isVisible()]
_grab(mw.profileDiag, ${JSON.stringify(SHOTS + '/_g_profiles.png')})
result = [kb._dialog is not None and kb._dialog.isVisible(), wins, mw.col is None]`);
  let alive = false;
  try { alive = !!(await Promise.race([page.eval('typeof Garden !== "undefined"'), sleep(3000).then(() => false)])); } catch (e) { alive = false; }
  if (alive) { await page.shot(SHOTS + '/_g_garden.png'); }
  // ghép: bảng chọn hồ sơ (bên trái) + cửa sổ vườn nếu còn mở (bên phải, thu nhỏ một nửa)
  await py(KB + `from aqt.qt import QImage, QPainter, QColor, QFont
a = QImage(${JSON.stringify(SHOTS + '/_g_profiles.png')})
b = QImage(${JSON.stringify(SHOTS + '/_g_garden.png')}) if os.path.exists(${JSON.stringify(SHOTS + '/_g_garden.png')}) and ${alive ? 'True' : 'False'} else None
W = a.width() + (700 if b is not None else 0) + 60; H = max(a.height(), 400) + 80
img = QImage(W, H, QImage.Format.Format_RGB32); img.fill(QColor("#3a3f4b"))
p = QPainter(img); p.setPen(QColor("#ffffff")); f = QFont(); f.setPointSize(13); p.setFont(f)
p.drawText(20, 30, "Anki: bảng chọn hồ sơ (collection đã đóng)")
p.drawImage(20, 50, a)
if b is not None:
    s = b.scaledToWidth(680)
    p.drawText(a.width() + 40, 30, "Cửa sổ vườn VẪN MỞ (bấm gì cũng lỗi)")
    p.drawImage(a.width() + 40, 50, s)
p.end(); img.save(${JSON.stringify(SHOTS + '/g_doi_ho_so.png')}); result = 1`);
  info.g = [g[0] ? 'cửa sổ vườn còn mở sau khi đóng hồ sơ' : 'cửa sổ vườn đã đóng theo hồ sơ', 'cửa sổ đang hiện: ' + g[1].join(', ')];
  fs.writeFileSync(SHOTS + '/info.json', JSON.stringify(info, null, 1));
  console.log(JSON.stringify(info, null, 1));
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
