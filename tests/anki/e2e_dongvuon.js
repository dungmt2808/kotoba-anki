// 1.36.5 — lỗi tìm được khi kiểm tra 1.36.4 lần 2 (27/11): đóng cửa sổ vườn không dừng đồng hồ 60 giây của nó.
// GardenDialog có cha là cửa sổ chính của Anki (không tự huỷ khi đóng) → mỗi lần đóng / mở vườn để lại một "cửa sổ ma" vẫn chạy
// _check_day mỗi phút. Sang ngày mới (Anki để mở qua giờ đổi ngày) cửa sổ ma dựng lại vườn trên trang đã dọn: lỗi JS "Garden is not
// defined", tốn CPU (mỗi cửa sổ ma dựng cả vườn), và **nhận quà / cất đồ Giáng sinh thay người dùng** — bảng "Quà tặng: tủ lịch…" /
// "Cất đồ Noel" hiện trong trang đã đóng nên người dùng không bao giờ thấy.
//   A. mở / đóng vườn 4 lần → số cửa sổ vườn còn chạy đồng hồ (1.36.4: 4; 1.36.5: 0);
//   B. vườn đang đóng, ngày Anki sang 1/12 (kb.LE_TEST + ngày đã dựng của cửa sổ cũ lùi 1 ngày như Anki để mở qua 4:00), chờ 70 giây
//      → không cửa sổ nào tự tặng tủ lịch (sổ / kho không đổi), nhật ký lỗi không thêm dòng;
//   C. mở vườn → lúc đó mới tặng, bảng chào quà hiện trong cửa sổ đang mở;
//   D. cửa sổ đang mở vẫn tự sang ngày (đồng hồ của nó còn chạy) — như 1.30.3.
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_dongvuon';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLe !== "undefined" && !!Garden._data && !!Garden._data()').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let pass = 0, total = 0;
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
from aqt.qt import QDialog
def gds():
    return [o for o in mw.findChildren(QDialog) if type(o).__name__ == "GardenDialog"]
`;
const ELOG = 'p = os.path.join(kb.ADDON_DIR, "user_files", "errors.json")\nresult = len(json.load(open(p))) if os.path.exists(p) else 0';
const alive = () => py(KB + 'result = [[d.isVisible(), d._day_timer.isActive(), d is kb._dialog] for d in gds()]');

(async () => {
  await py(KB + `d = st.load(); d["coins"] = 5000; d["home"]["house"] = 7; d["home"]["owned"] = {}
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
st.save(d)
mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
kb.LE_TEST = {"today": "2026-11-28", "days": [], "reviews": 0}
kb.save_config(show_tooltips=False, sound=False, music=False, season_event=True, ui={"greet": "off", "trans": "off"})
result = 1`);
  console.log('== A. mở / đóng vườn 4 lần (28/11)');
  for (let i = 0; i < 4; i++) {
    await py(KB + 'kb.open_garden(); result = 1'); await sleep(1500);
    await py(KB + 'kb._dialog.close(); result = 1'); await sleep(800);
  }
  let a = await alive();
  ok(a.every((x) => !x[0]), 'không cửa sổ vườn nào đang hiện: ' + JSON.stringify(a));
  const ticking = a.filter((x) => x[1]).length;
  ok(ticking === 0, 'cửa sổ vườn đã đóng còn chạy đồng hồ 60 giây: ' + ticking + ' (phải là 0)');
  const e0 = await py(KB + ELOG);

  console.log('== B. vườn đang đóng, ngày Anki sang 1/12 (Anki để mở qua 4:00) — chờ 70 giây');
  await py(KB + `kb.LE_TEST = {"today": "2026-12-01", "days": [], "reviews": 0}
for d in gds():
    if d._day_seen is not None:
        d._day_seen -= 1          # như Anki để mở qua giờ đổi ngày: cửa sổ dựng hôm qua
result = 1`);
  await sleep(70000);
  const w1 = await py(KB + 'd = st.load(); result = d["home"]["owned"]');
  const k1 = await py(KB + 'result = mw.col.get_config("kotoba_batake_le", None)');
  ok(!w1.le_tulich && k1 === null, 'vườn đóng → chưa ai nhận quà thay người dùng (kho ' + JSON.stringify(w1) + ', sổ ' + (k1 ? 'đã ghi' : 'trống') + ')');
  const e1 = await py(KB + ELOG);
  ok(e1 === e0, 'nhật ký lỗi không thêm dòng (' + e0 + ' → ' + e1 + ')');

  console.log('== C. mở vườn ngày 1/12 → tặng lúc này, bảng chào quà hiện');
  await py(KB + 'kb.open_garden(); result = 1');
  const page = await gardenPage();
  ok(!!page, 'trang vườn');
  const w2 = await py(KB + 'd = st.load(); result = d["home"]["owned"]');
  ok(w2.le_tulich === 1, 'tặng tủ lịch khi người dùng mở vườn');
  // thông báo "Lịch chờ Giáng sinh mở rồi! Quà tặng: …" (7 giây, có thể xếp hàng sau thông báo khác) — trong cửa sổ đang mở
  let welcome = false;
  for (let i = 0; i < 50 && !welcome; i++) {
    welcome = await page.eval('(() => { const t = document.getElementById("kb-toast"); return !!t && /Quà tặng/.test(t.textContent); })()').catch(() => false);
    if (!welcome) await sleep(400);
  }
  ok(welcome, 'thông báo "Lịch chờ Giáng sinh mở rồi! Quà tặng: …" hiện trong cửa sổ đang mở');
  await page.shot(SHOTS + '/dongvuon_01_qua.png');

  console.log('== D. cửa sổ đang mở vẫn tự sang ngày');
  a = await alive();
  ok(a.filter((x) => x[2] && x[0] && x[1]).length === 1, 'cửa sổ đang mở: đồng hồ chạy (' + JSON.stringify(a) + ')');
  await py(KB + `kb.LE_TEST = {"today": "2026-12-02", "days": [], "reviews": 0}
kb._dialog._day_seen -= 1
result = 1`);
  const t0 = Date.now();
  let moved = false;
  while (Date.now() - t0 < 75000 && !moved) {
    await sleep(2000);
    moved = await page.eval('(() => { const v = Garden._data().le; return !!v && v.today === "2026-12-02"; })()').catch(() => false);
  }
  ok(moved, 'đồng hồ 60 giây của cửa sổ đang mở tự dựng lại theo ngày mới (' + Math.round((Date.now() - t0) / 1000) + ' giây)');
  ok(page.errors.length === 0, 'không lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 2).join(' | ') : ''));
  await py(KB + 'kb.LE_TEST = None\nresult = 1');
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error('LỖI KỊCH BẢN:', e.stack || e.message); process.exit(2); });
