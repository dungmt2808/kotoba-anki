// 1.31.1 trong Anki thật — những gì bộ test của nhánh audit/release-review-1.31-2026-11-14 chưa phủ (chạy thêm sau các
// bộ của audit ở tests/audit_20261114/):
//   1. F01 ở MỌI chế độ Xưởng: trả lời lưu của món chế tác / mẫu sàn / đồ StackChan về khi đã Huỷ và đang vẽ món khác →
//      bản vẽ mới còn nguyên, Xưởng không đóng, không bật chế độ đặt đồ phía dưới; lần lưu cũ đã trừ xu đúng một lần.
//      Lỗi của lần lưu cũ về muộn → không đụng phiên đang vẽ. Hộp hỏi của phiên đã đóng không gửi lệnh.
//   2. F06 qua giao diện: lỗi ghi điểm ảnh khi chế tác (Xưởng giữ bản vẽ, báo lỗi, xu không đổi, lưu lại được), lỗi ghi ví khi
//      mua đồ ở cửa hàng (báo lỗi ở bảng Nhà, không có món, không trừ xu).
//   3. Nhật ký khi Anki ghi lỗi: báo trong bảng, chữ còn trong ô, đóng vườn → chữ ra file sao lưu của hồ sơ; lỗi một lần → rời
//      ô lần nữa là lưu được (trước 1.31.1: Anki bật hộp lỗi, chữ đang giữ để lưu nốt bị bỏ).
//   4. Sao lưu theo hồ sơ (F03): mua đồ → user_files/ho_so/<mã>/state.json có chủ + ho_so.txt, không ghi file chung.
//   5. F04: máy cũ (1.30.3) mua Mũ rơm khi đang đội mũ tự vẽ → mở vườn thấy Mũ rơm, mũ tự vẽ vẫn trong tủ.
//   6. Bấm Lưu nhiều lần thật nhanh (tắt hỏi trước khi trả xu) → chỉ một món, trừ xu một lần; thiếu xu → Xưởng giữ bản vẽ.
// Chạy: KB_SCRIPTS=e2e_1311.js run_ui.sh ADDON SHOTS  (hoặc tests/audit_20261114/run_ui_audit.sh ADDON OUT tests/anki/e2e_1311.js)
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1311';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenCraft !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = `import sys, os, json, time, datetime, shutil
kb = sys.modules["kotoba_batake"]
st = kb.STATE
core = kb.core
`;
const coins = () => py(KB + 'result = st.load()["coins"]');
async function reopen(w, h) {
  if (page) { (page.errors || []).forEach((e) => errors.push(e)); try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
  await py(KB + 'kb.open_garden(); result = 1');
  page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await py(KB + `kb._dialog.resize(${w || 1366}, ${h || 860}); result = 1`);
  await waitFor('typeof Garden !== "undefined" && Garden._data && !!Garden._data()', 8000);
  await sleep(600);
}
async function click(x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); }
}
async function press(sel) {
  const at = await js(`const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: "center" });
    const r = e.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];`);
  if (!at) { return false; }
  await click(at[0], at[1]); return true;
}
async function ink(dx, dy) {        // một nét bút thật trên lưới Xưởng
  const at = await js(`const r = document.getElementById("kb-cf-grid").getBoundingClientRect(); return [r.left + ${dx || 7}, r.top + ${dy || 7}];`);
  await click(at[0], at[1]);
}
async function shot(name) { await page.shot(SHOTS + '/1311_' + name + '.png'); }
const craftState = () => page.eval('GardenCraft._state()');
async function confirmAsk() {      // hộp "Hỏi trước khi trả xu" (nếu đang bật)
  if (await waitFor('!!document.getElementById("kb-ask") && !document.getElementById("kb-ask").hidden', 1500)) {
    await sleep(520); await press('.kb-ask-yes');
  }
}
// giữ lại trả lời "đã lưu" của Xưởng (Python đã lưu xong), phát lại sau — mô phỏng trả lời về muộn
const HOLD = `kb._h_orig = kb.GardenDialog._js
kb._h_held = []
def _hold(self, fn, payload=None):
    if (fn == "home" and isinstance(payload, dict) and payload.get("sub") == "save") or fn == "craftError":
        kb._h_held.append((self, fn, payload))
    else:
        kb._h_orig(self, fn, payload)
kb.GardenDialog._js = _hold
result = 1`;
const RELEASE = `kb.GardenDialog._js = kb._h_orig
for self, fn, payload in kb._h_held:
    kb._h_orig(self, fn, payload)
n = len(kb._h_held)
kb._h_held = []
result = n`;
const FAULT = (key, mode) => `kb._f_orig = type(mw.col).set_config
kb._f_hits = []
def _bad(self, key, value, *a, **kw):
    if self is mw.col and key == ${JSON.stringify(key)} and (${mode === 'always' ? 'True' : 'not kb._f_hits'}):
        kb._f_hits.append(key)
        raise OSError(28, "đĩa đầy (giả)")
    return kb._f_orig(self, key, value, *a, **kw)
type(mw.col).set_config = _bad
result = 1`;
const UNFAULT = 'type(mw.col).set_config = kb._f_orig\nresult = len(kb._f_hits)';

(async () => {
  await py(KB + `kb.ASK_TEST_OFF = False
kb.LIFE_TEST_OFF = False
kb.save_config(gemini_auto=False, show_tooltips=False, sound=False, music=False, ui={"trans": "off", "greet": "off"})
d = st.load(); d["coins"] = 50000; d["home"].update(house=7, rooms=["kitchen", "bedroom"]); st.save(d)
result = 1`);
  await reopen(1366, 860);

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 1. F01: trả lời lưu về muộn ở mọi chế độ Xưởng');
  const MODES = [
    { name: 'món chế tác', open: 'GardenHome.open("room"); GardenCraft.open(null)', price: 200, list: 'result = len(st.load()["craft"]["items"])' },
    { name: 'mẫu sàn tự vẽ', open: 'GardenHome.open("room"); GardenCraft.openTile(null, "floor")', price: 250, list: 'result = len(st.load()["more"]["decor"]["mine"]["items"])' },
    { name: 'mũ StackChan', open: 'GardenHome.open("room"); GardenCraft.openWear(null, "head")', price: 200, list: 'result = len(st.load()["more"]["mywear"]["items"])' },
  ];
  for (const m of MODES) {
    await page.eval(m.open); await sleep(300);
    if (!await page.eval('GardenCraft.isOpen()')) { ok(false, m.name + ': mở được Xưởng'); continue; }
    await ink(9, 9); await ink(30, 9);
    const c0 = await coins(), n0 = await py(KB + m.list);
    await py(KB + HOLD);
    await press('#kb-cf-save'); await confirmAsk();
    await waitFor('GardenCraft._state().pending === 1', 3000);
    const held = await py(KB + 'result = len(kb._h_held)');
    await press('#kb-cf-cancel'); await sleep(150);
    await page.eval('GardenCraft.openWear(null, "face")'); await sleep(200);
    await ink(25, 20); await ink(40, 20);
    const draft = (await craftState()).px;
    const released = await py(KB + RELEASE); await sleep(400);
    const s = await craftState();
    ok(held === 1 && released === 1, m.name + ': lần lưu đã chạy ở Python, trả lời bị giữ rồi phát lại');
    ok(await page.eval('GardenCraft.isOpen()') && s.wear === 'face' && s.px === draft && /[^.]/.test(draft),
      m.name + ': trả lời cũ về → Xưởng (Mặt đang vẽ) vẫn mở, bản vẽ còn nguyên');
    ok(!s.saving && s.pending === 0, m.name + ': phiên mới không bị kẹt "Đang lưu…"');
    ok(await coins() === c0 - m.price && await py(KB + m.list) === n0 + 1, m.name + ': lần lưu cũ trừ đúng ' + m.price + ' xu một lần, có món mới');
    ok(!await page.eval('!!GardenHome._state().placing'), m.name + ': không bật chế độ đặt đồ phía dưới Xưởng');
    await press('#kb-cf-cancel'); await sleep(200);
    await page.eval('GardenHome.close()'); await sleep(200);
  }
  await shot('01_tra_loi_cu');

  // lỗi của lần lưu cũ về muộn (Anki ghi lỗi) → không đụng phiên đang vẽ
  await page.eval('GardenHome.open("room"); GardenCraft.openWear(null, "neck")'); await sleep(300);
  await ink(9, 9);
  await py(KB + HOLD);
  await py(KB + FAULT(await py(KB + 'result = core.MORE_KEY'), 'once'));
  await press('#kb-cf-save'); await confirmAsk(); await sleep(300);
  await py(KB + UNFAULT);
  const heldErr = await py(KB + 'result = [fn for _s, fn, _p in kb._h_held]');
  await press('#kb-cf-cancel');
  await page.eval('GardenCraft.openWear(null, "head")'); await sleep(200);
  await ink(9, 9);
  const d2 = (await craftState()).px;
  await py(KB + RELEASE); await sleep(300);
  const s2 = await craftState();
  ok(heldErr.join() === 'craftError', 'lần lưu cũ gặp lỗi ghi → craftError kèm mã lệnh');
  ok(await page.eval('GardenCraft.isOpen()') && s2.wear === 'head' && s2.px === d2 && !s2.saving,
    'lỗi của lần lưu cũ về muộn → phiên đang vẽ giữ nguyên (không đóng, không kẹt)');
  ok(/Lần lưu trước chưa xong/.test(await page.eval('document.getElementById("kb-cf-tip").textContent')), 'báo rõ là lỗi của lần lưu trước');
  await press('#kb-cf-cancel'); await page.eval('GardenHome.close()'); await sleep(200);

  // hộp hỏi của phiên đã đóng (vd. bảng bị đóng từ chỗ khác) không gửi lệnh
  await page.eval('GardenHome.open("room"); GardenCraft.openWear(null, "shell")'); await sleep(300);
  const c1 = await coins();
  await press('#kb-cf-save'); await waitFor('!document.getElementById("kb-ask").hidden', 1500); await sleep(520);
  await page.eval('GardenCraft.close(); GardenCraft.openWear(null, "head")'); await sleep(100);
  await press('.kb-ask-yes'); await sleep(500);
  ok(await coins() === c1 && await page.eval('GardenCraft.isOpen() && GardenCraft._state().wear === "head"'),
    'đồng ý ở hộp hỏi của phiên đã đóng → không tạo vỏ, không trừ xu, phiên mới vẫn mở');
  await press('#kb-cf-cancel'); await page.eval('GardenHome.close()'); await sleep(200);

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 2. F06 qua giao diện');
  await page.eval('GardenHome.open("room"); GardenCraft.open(null)'); await sleep(300);
  await ink(9, 9); await ink(30, 30);
  const draftC = (await craftState()).px, c2 = await coins(), n2 = await py(KB + 'result = len(st.load()["craft"]["items"])');
  await py(KB + FAULT(await py(KB + 'result = core.PX_KEY'), 'once'));
  await press('#kb-cf-save'); await confirmAsk();
  await waitFor('!GardenCraft._state().saving', 4000); await sleep(200);
  const hits = await py(KB + UNFAULT);
  const s3 = await craftState();
  ok(hits === 1, 'lỗi ghi điểm ảnh đã xảy ra đúng một lần');
  ok(await page.eval('GardenCraft.isOpen()') && s3.px === draftC && /Anki báo lỗi/.test(await page.eval('document.getElementById("kb-cf-tip").textContent')),
    'Xưởng giữ bản vẽ + báo "Anki báo lỗi khi lưu"');
  ok(await coins() === c2 && await py(KB + 'result = len(st.load()["craft"]["items"])') === n2, 'không trừ xu, không có món nửa vời');
  await shot('02_loi_ghi_xuong');
  await press('#kb-cf-save'); await confirmAsk();
  ok(await waitFor('!GardenCraft.isOpen()', 4000), 'bấm Lưu lại khi Anki ghi được → lưu xong, Xưởng đóng');
  ok(await coins() === c2 - 200 && await py(KB + 'result = len(st.load()["craft"]["items"])') === n2 + 1, 'trừ đúng 200 xu một lần, có món');
  await page.eval('GardenHome.close()'); await sleep(200);

  // mua đồ ở cửa hàng khi ví không ghi được
  const ROOMITEM = await py(KB + 'result = next(k for k, v in core.CATALOG.items() if v["scene"] == "room" and not v.get("rare") and not v.get("only") and not v.get("zone") and not v.get("season"))');
  const c4 = await coins(), own4 = await py(KB + `result = st.load()["home"]["owned"].get(${JSON.stringify(ROOMITEM)}, 0)`);
  await page.eval('GardenHome.open("room")'); await sleep(300);
  await py(KB + FAULT(await py(KB + 'result = core.CONFIG_KEY'), 'always'));
  await page.eval(`pycmd("home:buy:${ROOMITEM}")`); await sleep(500);
  await py(KB + UNFAULT);
  ok(await coins() === c4 && await py(KB + `result = st.load()["home"]["owned"].get(${JSON.stringify(ROOMITEM)}, 0)`) === own4,
    'mua nội thất khi ví không ghi được → không trừ xu, không có món');
  ok(/Anki báo lỗi/.test(await page.eval('document.getElementById("kb-h-tip").textContent')), 'bảng Nhà báo "Anki báo lỗi khi lưu"');
  await shot('03_loi_mua');
  await page.eval('GardenHome.close()'); await sleep(200);

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 3. nhật ký khi Anki ghi lỗi');
  const MK = await py(KB + 't = kb.cal_today(); result = kb.journal.month_key(t.year, t.month)');
  const TODAY = await py(KB + 'result = kb.cal_today().isoformat()');
  await py(KB + 'kb.JOURNAL.update(kb.cal_today(), {"t": ""}); result = 1');
  await page.eval(`GardenCal.open({ date: ${JSON.stringify(TODAY)} })`); await sleep(600);
  const hasTa = await waitFor('!!document.querySelector(\'textarea[aria-label="Nhật ký một dòng"]\')', 5000);
  ok(hasTa, 'Lịch hoa mở khung ngày hôm nay có ô nhật ký');
  if (hasTa) {
    await py(KB + FAULT(MK, 'once'));
    const sel = 'textarea[aria-label="Nhật ký một dòng"]';
    await press(sel);
    await page.send('Input.insertText', { text: 'Hôm nay đĩa đầy mà vẫn muốn ghi' });
    await page.eval(`document.querySelector('${sel}').blur()`); await sleep(500);
    ok(await py(KB + UNFAULT) === 1, 'lần lưu nhật ký gặp lỗi ghi');
    ok(/Chưa lưu được/.test(await page.eval('document.getElementById("kb-c-info").textContent')), 'bảng Lịch hoa báo "Chưa lưu được"');
    ok(await page.eval(`document.querySelector('${sel}').value`) === 'Hôm nay đĩa đầy mà vẫn muốn ghi', 'chữ vẫn còn trong ô');
    ok(await page.eval('GardenCal.isOpen()'), 'bảng Lịch hoa vẫn mở (lỗi đã bắt, không bật hộp lỗi của Anki)');
    const bk = await py(KB + `p = kb.JOURNAL._backup_path(kb.cal_today().year, kb.cal_today().month)
result = json.load(open(p, encoding="utf-8")).get(kb.cal_today().isoformat(), {}).get("t") if os.path.exists(p) else None`);
    ok(bk === 'Hôm nay đĩa đầy mà vẫn muốn ghi', 'chữ đã ra file sao lưu của hồ sơ (cứu được bằng tay)');
    await page.eval(`(function(){const t=document.querySelector('${sel}');t.focus();})()`);
    await page.eval(`document.querySelector('${sel}').blur()`); await sleep(500);
    ok(await py(KB + 'result = kb.JOURNAL.entry(kb.cal_today()).get("t", "")') === 'Hôm nay đĩa đầy mà vẫn muốn ghi',
      'Anki ghi được lại → rời ô lần nữa là lưu (trước: coi như đã lưu, không gửi lại)');
    await shot('04_nhat_ky_loi');
    // đóng vườn khi Anki còn lỗi: chữ đang giữ ra file sao lưu, không mất
    await press(sel);
    await page.send('Input.insertText', { text: ' + đóng vội' });
    await py(KB + FAULT(MK, 'always'));
    await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(600);
    await py(KB + UNFAULT);
    const bk2 = await py(KB + `p = kb.JOURNAL._backup_path(kb.cal_today().year, kb.cal_today().month)
result = json.load(open(p, encoding="utf-8")).get(kb.cal_today().isoformat(), {}).get("t") if os.path.exists(p) else None`);
    ok(bk2 === 'Hôm nay đĩa đầy mà vẫn muốn ghi + đóng vội', 'đóng vườn lúc Anki ghi lỗi → chữ gõ dở vẫn ra file sao lưu');
    await reopen(1366, 860);
  }

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 4. sao lưu theo hồ sơ (F03)');
  const bp = await py(KB + `uf = os.path.join(kb.ADDON_DIR, "user_files")
key = core.profile_key(mw.col)
p = os.path.join(uf, "ho_so", key)
result = {"state": os.path.isfile(os.path.join(p, "state.json")), "owner": json.load(open(os.path.join(p, "state.json"))).get(core.OWNER_KEY) == key if os.path.isfile(os.path.join(p, "state.json")) else False,
          "note": open(os.path.join(p, "ho_so.txt"), encoding="utf-8").read() if os.path.isfile(os.path.join(p, "ho_so.txt")) else "",
          "journal": os.path.isdir(os.path.join(p, "journal")), "shared_mtime": os.path.getmtime(os.path.join(uf, "state.json")) if os.path.exists(os.path.join(uf, "state.json")) else 0}`);
  ok(bp.state && bp.owner, 'ví sao lưu ở user_files/ho_so/<mã hồ sơ>/state.json, ghi chủ');
  ok(/Test/.test(bp.note), 'ho_so.txt ghi tên hồ sơ Anki (' + bp.note.trim() + ')');
  ok(bp.journal, 'nhật ký sao lưu trong cùng thư mục hồ sơ');
  await py(KB + 'd = st.load(); d["coins"] += 1; st.save(d); result = 1');
  const mt = await py(KB + 'p = os.path.join(kb.ADDON_DIR, "user_files", "state.json")\nresult = os.path.getmtime(p) if os.path.exists(p) else 0');
  ok(mt === bp.shared_mtime, 'lưu ví không ghi file chung user_files/state.json (hồ sơ khác không bị ghi đè)');

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 5. F04: máy cũ mua Mũ rơm khi đang đội mũ tự vẽ');
  const wid = await py(KB + `d = st.mywear_save({"slot": "head", "px": "160r", "name": "Mũ tự vẽ"})
result = d["mywear_id"]`);
  await py(KB + `w = mw.col.get_config(core.CONFIG_KEY)
w.setdefault("wear", {}).setdefault("owned", [])
if "straw" not in w["wear"]["owned"]: w["wear"]["owned"].append("straw")
w["wear"].setdefault("on", {})["head"] = "straw"
mw.col.set_config(core.CONFIG_KEY, w)
result = 1`);
  await reopen(1366, 860);
  const wv = await page.eval('({on: Garden._data().wallet.wear.on.head, mine: (Garden._data().wallet.more.mywear.on || {}).head || null, has: !!Garden._data().wallet.more.mywear.items[' + JSON.stringify(wid) + ']})');
  ok(wv.on === 'straw' && wv.mine === null && wv.has, 'mở vườn: StackChan đội Mũ rơm (vừa mua ở máy cũ), mũ tự vẽ vẫn trong tủ');

  // ------------------------------------------------------------------------------------------------------------------
  console.log('== 6. bấm Lưu thật nhanh, thiếu xu');
  await py(KB + 'kb.ASK_TEST_OFF = True\nkb.save_config(ui={"trans": "off", "greet": "off", "buyask": "off"})\nresult = 1');
  await reopen(1366, 860);
  await page.eval('GardenHome.open("room"); GardenCraft.openWear(null, "shell")'); await sleep(300);
  const c6 = await coins(), n6 = await py(KB + 'result = len(st.load()["more"]["mywear"]["items"])');
  for (let i = 0; i < 4; i++) { await page.eval('document.getElementById("kb-cf-save").click()'); }
  await waitFor('!GardenCraft.isOpen()', 4000); await sleep(300);
  ok(await coins() === c6 - 150 && await py(KB + 'result = len(st.load()["more"]["mywear"]["items"])') === n6 + 1,
    'bấm Lưu 4 lần liền → một vỏ, trừ 150 xu một lần');
  await py(KB + 'd = st.load(); d["coins"] = 120; st.save(d); kb._dialog.refresh(); result = 1'); await sleep(500);
  await page.eval('GardenHome.open("room"); GardenCraft.open(null)'); await sleep(300);
  await ink(9, 9);
  const d6 = (await craftState()).px;
  await page.eval('document.getElementById("kb-cf-save").disabled = false; document.getElementById("kb-cf-save").click()'); await sleep(500);
  ok(await page.eval('GardenCraft.isOpen()') && (await craftState()).px === d6 && await coins() === 120,
    'thiếu xu → Xưởng giữ bản vẽ, không trừ xu');
  await press('#kb-cf-cancel'); await page.eval('GardenHome.close()');

  // ------------------------------------------------------------------------------------------------------------------
  (page.errors || []).forEach((e) => errors.push(e));
  ok(!errors.length, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await py(KB + 'kb.ASK_TEST_OFF = True; result = 1');
  console.log(`KẾT QUẢ: ${pass}/${total}` + (pass === total ? ' — TẤT CẢ OK' : ''));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); console.log(`KẾT QUẢ: ${pass}/${total} (dừng giữa chừng)`); process.exit(1); });
