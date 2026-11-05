// 1.22.8 trong Anki thật — thẻ Claude Code ở tab Nguồn báo chỉ hiện khi người dùng đã tự đặt `bao_dir` trong config
// (người dùng: "ẩn thẻ claude code trong web là hợp lý, nếu config bên ngoài có thì mới hiện, còn không thì thôi"):
// - bao_dir trống (mặc định) → không có thẻ / chữ Claude Code ở tab Nguồn báo, nút "Nguồn báo…" không nhắc Claude Code;
// - bao_source "claude" sửa tay mà bao_dir trống → như "auto" (có khoá thì Gemini viết), không kẹt "chưa có nguồn";
// - bao_dir là thư mục kotoba_daily có thật → thẻ hiện, "Đang dùng", ✓ số báo; nút "Dùng Gemini cho báo tiếng Nhật"
//   đổi qua lại được, thẻ vẫn còn (vì bao_dir vẫn đặt);
// - bao_dir trỏ tới thư mục không còn (ổ ngoài rút ra) + bao_source "claude" → thẻ hiện "✗ không thấy thư mục",
//   Gemini có nút "Dùng Gemini cho báo tiếng Nhật" (trước 1.22.8: không có nút, báo tiếng Nhật trống);
// - bao_dir chỉ có dấu cách → coi như trống; xoá bao_dir → thẻ ẩn lại, báo về Gemini;
// - không lỗi JS, nhật ký lỗi add-on trống.
// Chạy: KB_SCRIPTS=e2e_1228.js run_ui.sh ADDON SHOTS
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenPaper !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\n';
const KIT = '/tmp/kb_kit_1228_' + CTRL;
const MISSING = '/tmp/kb_khong_co_thu_muc_nay_1228';

// mở lại tab Nguồn báo sau khi đổi config (như người dùng sửa config rồi mở lại vườn)
async function source(cfg) {
  await py(KB + `kb.save_config(**json.loads(${JSON.stringify(JSON.stringify(cfg))}))\nkb._dialog.refresh()\nresult = 1`);
  await sleep(1200);
  await js('GardenPaper.close(); return 1;'); await sleep(300);
  await js('GardenPaper.open("src"); return 1;');
  await waitFor('return !!document.querySelector(".kb-ai-card");');
  await sleep(600);
  return js(`const st = document.getElementById("kb-p-stage") || document.body;
    const c = document.querySelector(".kb-ai-claude");
    const btns = Array.prototype.map.call(document.querySelectorAll(".kb-ai-card button"), (b) => b.textContent.trim());
    return { claude: !!c, claudeText: c ? c.textContent : "", bad: c ? !!c.querySelector(".is-bad") : false,
             on: c ? c.classList.contains("is-on") : false, text: st.textContent, btns,
             cards: document.querySelectorAll(".kb-ai-card").length };`);
}
const src = () => py(KB + 'result = [kb.paper_source(), kb.config().get("bao_source"), kb.ai_view()["claude"]["set"]]');

(async () => {
  // bộ kotoba_daily nhỏ: lo_trinh.json + một số báo mẫu (chép từ fixture Gemini, cùng định dạng bao.json)
  await py(KB + `import shutil, glob
kit = ${JSON.stringify(KIT)}
shutil.rmtree(kit, ignore_errors=True)
os.makedirs(kit)
json.dump({"nen_tang": "N5", "giao_trinh": []}, open(os.path.join(kit, "lo_trinh.json"), "w"))
g = os.path.join(kb.ADDON_DIR if hasattr(kb, "ADDON_DIR") else os.path.dirname(kb.__file__), "user_files", "bao_gemini", "bao")
days = sorted(d for d in os.listdir(g) if os.path.isfile(os.path.join(g, d, "bao.json")))
shutil.copytree(os.path.join(g, days[-1]), os.path.join(kit, "bao", days[-1]))
shutil.rmtree(${JSON.stringify(MISSING)}, ignore_errors=True)
result = days[-1]`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); return 1;');
  page.errors.splice(0);

  console.log('== bao_dir trống (mặc định của người dùng mới)');
  let v = await source({ bao_dir: '', bao_source: 'auto' });
  ok(!v.claude && v.cards >= 2, `không có thẻ Claude Code, vẫn có thẻ Gemini + Giọng đọc (${v.cards} thẻ)`);
  ok(!/Claude/.test(v.text) && !/kotoba_daily/.test(v.text), 'tab Nguồn báo không còn chữ "Claude" / "kotoba_daily"');
  ok(!v.btns.some((b) => /Gemini cho báo/.test(b)), 'không có nút "Dùng Gemini cho báo tiếng Nhật" (đang dùng Gemini rồi)');
  const title = await js('return document.getElementById("kb-paper-src").title;');
  ok(!/Claude|kotoba_daily/.test(title), `nút "Nguồn báo…" không nhắc Claude Code ("${title}")`);
  ok(JSON.stringify(await src()) === JSON.stringify(['gemini', 'auto', false]), 'nguồn báo: gemini');
  await page.shot(SHOTS + '/1228_nguon_bao_mac_dinh.png');

  console.log('== bao_source "claude" sửa tay, bao_dir trống');
  v = await source({ bao_dir: '', bao_source: 'claude' });
  ok(!v.claude, 'thẻ Claude Code vẫn ẩn');
  let s = await src();
  ok(s[0] === 'gemini', `như "auto": có khoá thì Gemini viết (trước 1.22.8: "" — chưa có nguồn) ${JSON.stringify(s)}`);
  const idx = await py(KB + 'lib = kb._library("ja"); result = bool(lib) and len(lib.issues())');
  ok(idx >= 1, `kệ báo tiếng Nhật đọc báo Gemini (${idx} số)`);
  v = await source({ bao_dir: '   ', bao_source: 'claude' });
  ok(!v.claude && (await src())[0] === 'gemini', 'bao_dir chỉ có dấu cách → coi như trống');

  console.log('== bao_dir là thư mục kotoba_daily có thật');
  v = await source({ bao_dir: KIT, bao_source: 'auto' });
  ok(v.claude && v.on, 'thẻ Claude Code hiện, đang dùng (auto + có bao_dir)');
  ok(/✓ 1 số/.test(v.claudeText) && /Đang dùng/.test(v.claudeText), 'thẻ ghi "✓ 1 số" + "Đang dùng"');
  ok(/Claude Code \(thẻ bên dưới\)/.test(v.text), 'hàng Báo tiếng Nhật ghi "Nguồn: Claude Code (thẻ bên dưới)"');
  ok(v.btns.some((b) => /Gemini cho báo/.test(b)), 'thẻ Gemini có nút "Dùng Gemini cho báo tiếng Nhật"');
  await page.shot(SHOTS + '/1228_nguon_bao_co_bao_dir.png');
  await page.click('.kb-ai-card:not(.kb-ai-claude) .kb-ai-h button'); await sleep(1500);   // bấm "Dùng Gemini cho báo tiếng Nhật"
  s = await src();
  ok(s[0] === 'gemini' && s[1] === 'gemini', `→ nguồn gemini ${JSON.stringify(s)}`);
  const v2 = await js('const c = document.querySelector(".kb-ai-claude"); return c ? Array.prototype.map.call(c.querySelectorAll("button"), (b) => b.textContent.trim()) : null;');
  ok(v2 && v2.indexOf('Dùng Claude Code') >= 0, 'thẻ Claude Code vẫn còn, có nút "Dùng Claude Code" để đổi lại');
  await page.click('.kb-ai-claude .kb-ai-h button'); await sleep(1500);
  s = await src();
  ok(s[0] === 'claude' && s[1] === 'claude', `bấm "Dùng Claude Code" → nguồn claude ${JSON.stringify(s)}`);

  console.log('== bao_dir trỏ tới thư mục không còn');
  v = await source({ bao_dir: MISSING, bao_source: 'claude' });
  ok(v.claude && v.bad && /không thấy thư mục/.test(v.claudeText), 'thẻ hiện "✗ không thấy thư mục" (chữ đỏ)');
  ok((await src())[0] === '', 'nguồn báo tiếng Nhật: chưa có (đúng ý người dùng chọn Claude Code)');
  ok(v.btns.some((b) => /Gemini cho báo/.test(b)), 'thẻ Gemini có nút "Dùng Gemini cho báo tiếng Nhật" (trước 1.22.8: không có)');
  await page.shot(SHOTS + '/1228_nguon_bao_mat_thu_muc.png');
  await page.click('.kb-ai-card:not(.kb-ai-claude) .kb-ai-h button'); await sleep(1500);
  s = await src();
  ok(s[0] === 'gemini', `bấm → báo tiếng Nhật về Gemini ${JSON.stringify(s)}`);

  console.log('== xoá bao_dir');
  v = await source({ bao_dir: '', bao_source: 'claude' });
  ok(!v.claude && (await src())[0] === 'gemini', 'thẻ Claude Code ẩn lại, báo về Gemini');
  ok(await py(`result = os.path.isfile(os.path.join(${JSON.stringify(KIT)}, "bao", sorted(os.listdir(os.path.join(${JSON.stringify(KIT)}, "bao")))[-1], "bao.json"))`),
    'số báo cũ trong thư mục kotoba_daily không bị xoá');
  ok(!await py(`result = os.path.exists(${JSON.stringify(MISSING)})`), 'không tạo thư mục bao_dir không có thật');

  console.log('== Không có Gemini, không có bao_dir');
  await py(KB + 'kb._key_saved = kb.config().get("gemini_key"); result = 1');
  v = await source({ bao_dir: '', bao_source: 'auto', gemini_key: '' });
  ok(!v.claude && /Chưa có báo/.test(v.text) && /khoá Gemini/.test(v.text), 'chưa có báo: chỉ mời dán khoá Gemini');
  await page.shot(SHOTS + '/1228_nguon_bao_chua_khoa.png');
  await py(KB + 'kb.save_config(gemini_key=kb._key_saved, bao_source="gemini"); result = 1');

  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:80] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await py(`import shutil\nshutil.rmtree(${JSON.stringify(KIT)}, ignore_errors=True)\nresult = 1`);

  const n = results.filter(Boolean).length;
  console.log(`\nKẾT QUẢ: ${n}/${results.length} đạt`);
  process.exit(n === results.length ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
