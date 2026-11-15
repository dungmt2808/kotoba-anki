// 1.31.3 trong Anki thật — trang web chung mở từ add-on (người dùng 15/11: "mở trang ngay trong xưởng cũng được. nếu báo lỗi thì
// có được không nhỉ"):
//   1. Xưởng → ô "Dán mã thiết kế" có nút "Mã cộng đồng ▸" (bấm chuột thật) → mở <trang>#cong-dong (KB_TEST_NO_LINK: chỉ ghi lại).
//   2. Món tự làm → "Mã chia sẻ" → thẻ mã có nút "Gửi lên trang ▸" → mở <trang>#gui; mã đã ở bộ nhớ tạm.
//   3. Cầu nối chỉ mở các mục có tên (app:site:<lạ> / đường dẫn lạ → không mở gì).
//   4. Cửa sổ Báo lỗi có nút "Gửi qua GitHub…" → chép báo cáo + mở mẫu issue bao_loi.yml.
//   5. Không mở được trình duyệt → chép đường dẫn (người dùng dán tay).
// Chạy: KB_SCRIPTS=e2e_1313.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1313';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenUI !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await page.eval(expr)) return true; } catch (e) { } await sleep(100); }
  return false;
}
const KB = `import sys, os, json, time, datetime
kb = sys.modules["kotoba_batake"]
st = kb.STATE
`;
async function mouse(x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); }
}
async function center(sel) {
  return js(`const e = ${sel}; if (!e) return null; e.scrollIntoView({ block: "center" }); const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];`);
}
const BTN = (label) => `[...document.querySelectorAll("#kb-h-list button")].find((b) => b.textContent === ${JSON.stringify(label)})`;
const links = () => py(KB + 'result = list(kb.OPENED_LINKS)');
async function shot(name) { await page.shot(SHOTS + '/1313_' + name + '.png'); }

(async () => {
  // một món tự làm có sẵn (làm từ mã như người chơi dán mã) để có nút "Mã chia sẻ"
  await py(KB + `d = st.load(); d["coins"] = 5000; st.save(d)
core = sys.modules["kotoba_batake.garden_core"]
flat = "".join("r" if (i % 16 - 8) ** 2 + (i // 16 - 8) ** 2 < 30 else "." for i in range(256))
code = core.share.code_item({"size": 16, "name": "Đèn đỏ thử", "kind": "ground", "fx": "glow"}, core.more.px_encode(flat))
st.share_make(code)
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
os.environ["KB_TEST_NO_LINK"] = "1"
kb.OPENED_LINKS.clear()
result = 1`);
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nkb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data()', 8000);
  await sleep(600);
  const SITE = await py(KB + 'result = kb.diag.SITE_URL');

  console.log('== 1. Xưởng → Mã cộng đồng');
  await js('GardenHome.open("yard"); GardenHome.setTab("craft"); return 1;'); await sleep(800);
  const at = await center(BTN('Mã cộng đồng ▸'));
  ok(!!at && await js(`return !!${BTN('Mã cộng đồng ▸')}.closest(".kb-h-paste");`), 'ô "Dán mã thiết kế" có nút "Mã cộng đồng ▸"');
  await shot('01_xuong_nut');
  await mouse(at[0], at[1]); await sleep(700);
  let l = await links();
  ok(l[l.length - 1] === SITE + '#cong-dong', 'bấm chuột → mở ' + l[l.length - 1]);
  ok(/Mã cộng đồng/.test(await js('return document.getElementById("kb-h-tip").textContent;')), 'dòng gợi ý nói đang mở trang');
  ok(await js('return GardenHome.isOpen();'), 'bảng Nhà vẫn mở (trang mở ở trình duyệt riêng)');

  console.log('== 2. Mã chia sẻ → Gửi lên trang');
  const sh = await center('[...document.querySelectorAll("#kb-h-list .kb-h-craftcard")].find((c) => /Đèn đỏ thử/.test(c.textContent)).querySelector("button[title*=\\"đoạn chữ\\"]")');
  ok(!!sh, 'món tự làm "Đèn đỏ thử" có nút Mã chia sẻ');
  await mouse(sh[0], sh[1]);
  ok(await waitFor(`!!${BTN('Gửi lên trang ▸')}`, 6000), 'thẻ mã chia sẻ hiện nút "Gửi lên trang ▸"');
  const clip = await py(KB + 'from aqt.qt import QApplication\nresult = QApplication.clipboard().text()');
  ok(/^KB1:m:16:/.test(clip), 'mã đã ở bộ nhớ tạm (' + clip.slice(0, 20) + '…)');
  await shot('02_ma_chia_se');
  const g = await center(BTN('Gửi lên trang ▸'));
  await mouse(g[0], g[1]); await sleep(700);
  l = await links();
  ok(l[l.length - 1] === SITE + '#gui', 'bấm → mở ' + l[l.length - 1]);

  console.log('== 3. cầu nối chỉ mở mục có tên');
  const n0 = (await links()).length;
  await js('["app:site:https://example.com", "app:site:../x", "app:site:", "app:site:kho#x", "app:site:COng-dong"].forEach((c) => pycmd(c)); return 1;');
  await sleep(800);
  ok((await links()).length === n0, 'app:site:<đường dẫn lạ / mục lạ> → không mở gì');
  await js('pycmd("app:site:bao-loi"); return 1;'); await sleep(500);
  l = await links();
  ok(l.length === n0 + 1 && l[l.length - 1] === SITE + '#bao-loi', 'app:site:bao-loi → mở mục Báo lỗi');

  console.log('== 4. Báo lỗi → Gửi qua GitHub');
  const rep = await py(KB + `dlg = kb.show_report(kb._dialog, {})
from aqt.qt import QPushButton, QApplication
btns = [b.text() for b in dlg.findChildren(QPushButton)]
QApplication.clipboard().setText("")
[b for b in dlg.findChildren(QPushButton) if b.text() == "Gửi qua GitHub…"][0].click()
clip = QApplication.clipboard().text()
dlg.close()
result = {"btns": btns, "clip": clip[:200], "last": kb.OPENED_LINKS[-1], "bug": kb.diag.ISSUE_BUG_URL}`);
  ok(rep.btns.indexOf('Gửi qua GitHub…') === 1, 'cửa sổ Báo lỗi: ' + rep.btns.join(' · '));
  ok(rep.last === rep.bug && /template=bao_loi\.yml$/.test(rep.last), 'bấm → mở mẫu issue Báo lỗi (' + rep.last + ')');
  ok(/ことば畑/.test(rep.clip), 'báo cáo đã chép vào bộ nhớ tạm');

  console.log('== 5. không mở được trình duyệt → chép đường dẫn');
  const fb = await py(KB + `os.environ.pop("KB_TEST_NO_LINK", None)
from aqt.qt import QDesktopServices, QApplication
old = QDesktopServices.openUrl
QDesktopServices.openUrl = staticmethod(lambda u: False)
try:
    r = kb.open_url(kb.diag.site_link("kho"))
finally:
    QDesktopServices.openUrl = old
os.environ["KB_TEST_NO_LINK"] = "1"
result = {"r": r, "clip": QApplication.clipboard().text()}`);
  ok(fb.r === false && fb.clip === SITE + '#kho', 'trả về False và chép sẵn ' + fb.clip);

  console.log('== 6. lỗi');
  const errs = page.errors || [];
  ok(errs.length === 0, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  const log = await py(KB + 'result = [(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-8:]');
  ok(!log.length, 'nhật ký lỗi add-on trống' + (log.length ? ': ' + JSON.stringify(log) : ''));
  await py(KB + 'os.environ.pop("KB_TEST_NO_LINK", None)\nresult = 1');
  console.log('KẾT QUẢ: ' + pass + '/' + total);
  page.close();
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); try { page && page.close(); } catch (x) { } process.exit(2); });
