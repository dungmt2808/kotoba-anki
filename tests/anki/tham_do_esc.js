// Thăm dò 1.36.2 (ngoài bộ test, audit #02): Esc tới Python bằng đường nào trong Anki thật — đếm số lần GardenDialog._on_esc chạy (Anki gọi khi bộ nghe Esc ở document, pha bubble, chạy), cửa sổ còn không.
const { pages, Page, sleep } = require('./cdp');
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) { const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code }); const j = await r.json(); if (j.err) throw new Error(j.err); return j.r; }
const KB = 'import sys, os, json\nkb = sys.modules["kotoba_batake"]\n';
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p; p.close();
    }
    await sleep(500);
  }
  return null;
}
(async () => {
  await py(KB + 'kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet":"off","trans":"off"})\nresult = 1');
  const cases = [
    ['màn chính', ''],
    ['Chụp ảnh (snap pop)', 'document.getElementById("kb-snap") && document.getElementById("kb-snap").click();'],
    ['tìm deck (/)', 'document.dispatchEvent(new KeyboardEvent("keydown", { key: "/", bubbles: true }));'],
    ['⚙', 'document.getElementById("kb-sound").click();'],
    ['tủ lịch có thẻ (Esc Esc)', 'GardenLe.open(); pycmd("le:open:10");', 2],
    ['xưởng thiệp có sticker chọn (Esc Esc)', 'GardenLeCard.open(0); GardenLeCard._sel(0); document.getElementById("kb-le-cardcv").focus();', 2],
  ];
  await py(KB + `le = kb.le_core
kb.LE_TEST = {"today": "2026-12-10", "now": "2026-12-10T20:00", "days": ["2026-12-%02d" % d for d in range(1, 11)], "reviews": 3}
mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
ev = kb.LE.load()
for dd in range(1, 10):
    ev["open"][str(dd)] = {"d": "2026-12-%02d" % dd, "b": 0}
ev["gift"] = {"tulich": "2026-12-01", "tree": "2026-12-01"}
le.save_card(ev, 0, {"f": "den", "st": [{"s": "xmastree", "x": 6, "y": 22}], "t1": "x", "t2": "", "c": "", "w": "", "wl": "vi"}, kb.le_today(), kb.le_now())
kb.LE.save(ev)
kb.save_config(season_event=True)
result = 1`);
  for (const [name, open, nEsc] of cases) {
    await py(KB + 'ev = kb.LE.load(); ev["open"].pop("10", None); kb.LE.save(ev); result = 1');
    await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(500);
    await py(KB + 'kb.open_garden()\nd = kb._dialog\nd._esc_n = 0\n_o = d._on_esc\ndef _c():\n    d._esc_n += 1\n    _o()\nd.web.onEsc = _c\nresult = 1');
    const page = await gardenPage(); await sleep(800);
    if (open) { await page.eval('(() => { ' + open + ' return 1; })()'); await sleep(500); }
    const vis = await page.eval('(() => Array.from(document.querySelectorAll("[id^=kb-]")).filter((e) => !e.hidden && /pop|find/.test(e.id) && e.offsetParent !== null).map((e) => e.id).join(","))()');
    for (let k = 0; k < (nEsc || 1); k++) { await Promise.race([page.key('Escape', 'Escape', 27).catch(() => {}), sleep(1500)]); }
    await sleep(1500);
    const r = await py(KB + 'result = [bool(kb._dialog) and kb._dialog.isVisible(), getattr(kb._dialog, "_esc_n", -1)]');
    console.log(name + ': bảng hiện = [' + vis + '] → Esc: cửa sổ còn = ' + r[0] + ', _on_esc chạy ' + r[1] + ' lần');
    try { page.close(); } catch (e) { }
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
