// 1.33.1 — kiểm tra lần cuối "ngoài kịch bản có sẵn" trong Anki thật: các thao tác của chính Anki thay / đóng collection mà
// các bản trước chưa thử (người dùng: "đặc biệt các lỗi có thể gây mất dữ liệu").
//   1. File → Import một file .colpkg (bản sao lưu cũ hơn) khi vườn đang mở và vừa ôn vài thẻ trong vườn:
//      - LỖI A (1.33.0): sổ phần thưởng lượt ôn còn lượt của collection cũ → lần làm mới kế tiếp coi là Undo → trừ xu khỏi
//        ví vừa khôi phục. Sửa: bỏ sổ khi collection bị thay.
//      - LỖI B (1.33.0): lần mở hồ sơ sau, lớp giữ dữ liệu khi đồng bộ "trả lại" vườn mới hơn đè lên bản vừa khôi phục.
//        Sửa: Import .colpkg = khôi phục bản sao lưu (như "Mở bản sao lưu" của Anki, 1.31.2).
//      - bảng ôn đang mở lấy thẻ của collection mới, không hộp lỗi
//   2. Hồi quy: không Import mà collection giữ bản cũ hơn bản chụp (đồng bộ lúc add-on tắt) → vẫn trả lại như 1.31.2
//   3. Hồi quy: "Mở bản sao lưu" của Anki (File → Switch Profile → Open Backup) vẫn giữ bản vừa khôi phục
//   4. File → Export .colpkg khi vườn đang mở → mở lại collection, lưu tiếp được, dữ liệu không đổi
//   5. Tools → Check Database: mọi khoá kotoba_batake_* giữ nguyên từng byte
//   6. Xoá deck đang là nguồn báo + xoá loại note đã cấu hình tiếng Hàn: vườn / tab Nguồn báo mở được, không lỗi
// Chạy: KB_SCRIPTS=e2e_1331.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1331';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const TMP = '/tmp/kb_1331_' + CTRL;
fs.mkdirSync(TMP, { recursive: true });
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
let page = null, pass = 0, total = 0;
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
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
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function waitPy(code, ms = 30000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await py(KB + code); if (v) return v; } catch (e) { } await sleep(300); }
  return false;
}
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await sleep(500);
}
// lỗi Python (hộp lỗi Anki) + lỗi JS của trang
const seen = () => py(KB + 'result = [e["kind"] + " " + e["where"] + ": " + e["msg"][:120] for e in kb.ERRORS.entries() for _ in range(e["count"])]');
const coins = () => py(KB + 'result = st.load()["coins"]');
const canon = (v) => (v && typeof v === 'object' ? (Array.isArray(v) ? v.map(canon) : Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]))) : v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const diffKeys = (a, b) => Object.keys(Object.assign({}, a, b)).filter((k) => !same(a[k], b[k]));
const diffDeep = (a, b, pre = '') => { if (same(a, b)) return []; if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return [pre]; return Object.keys(Object.assign({}, a, b)).flatMap((k) => diffDeep(a[k], b[k], pre + '.' + k)); };
const gardenKeys = () => py(KB + 'result = {k: v for k, v in mw.col.all_config().items() if k.startswith("kotoba_batake_")}');
async function reopenProfile() {
  await py(KB + 'mw.unloadProfile(lambda: mw.loadProfile()); result = 1');
  await sleep(2000);
  return waitPy('result = bool(mw.col) and kb._col_ready() and kb._profile_open', 40000);
}
async function importColpkg(p) {
  await py(KB + `from aqt.import_export.importing import ColpkgImporter
ColpkgImporter._import(mw, ${JSON.stringify(p)})      # File → Import → .colpkg (sau hộp hỏi "xoá collection hiện tại")
result = 1`);
  await sleep(1500);
  return waitPy('result = bool(mw.col) and kb._col_ready() and mw.state == "deckBrowser"', 40000);
}
async function answerSome(n) {
  for (let i = 0; i < n; i++) {
    await waitPy('d = kb._dialog\nresult = d is not None and not d._busy and d._card is not None', 8000);
    await py(KB + 'd = kb._dialog\nd._dispatch("rv:show:{}")\nd._dispatch("rv:ans:3")\nresult = 1');
    await sleep(900);
  }
}

(async () => {
  const errs0 = (await seen()).length;
  await openGarden();
  ok(!!page, 'mở được vườn');
  await py(KB + 'kb._dialog.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); kb._dialog.refresh(); result = 1');
  await sleep(1200);

  console.log('== 1. File → Import .colpkg (bản sao lưu cũ hơn) khi vườn đang mở, vừa ôn trong vườn');
  // bản sao lưu: ví có 100 xu (đã có lần đồng bộ trước: bản chụp của máy)
  await py(KB + `st.add_coins(100)
mw.col.export_collection_package(${JSON.stringify(TMP + '/sao_luu.colpkg')}, include_media=False, legacy=False)
mw.reopen()
result = 1`);
  const cBackup = await coins();
  // chơi tiếp sau bản sao lưu: +100 xu, rồi một lần đồng bộ (bản chụp của máy = bản mới hơn)
  await py(KB + 'st.add_coins(100)\nkb.sync_core.before_sync(mw.col, kb.USER_DIR)\nresult = 1');
  // ôn 4 thẻ trong vườn (sổ phần thưởng có 4 lượt)
  await py(KB + 'kb._dialog._dispatch("rv:start"); result = 1'); await sleep(1500);
  await answerSome(4);
  const before = await py(KB + 'result = {"c": st.load()["coins"], "ledger": len(kb._ledger), "revlog": mw.col.db.scalar("select count() from revlog")}');
  ok(before.ledger >= 4 && before.c > cBackup + 100, `ôn 4 thẻ trong vườn: ${before.c} xu, sổ ${before.ledger} lượt (bản sao lưu ${cBackup} xu)`);
  ok(await importColpkg(TMP + '/sao_luu.colpkg'), 'Import xong, Anki về màn deck');
  const cImp = await coins();
  ok(cImp === cBackup, `ví = bản sao lưu (${cImp} / ${cBackup})`);
  await sleep(800);
  ok(await py(KB + 'result = len(kb._ledger)') === 0, 'sổ phần thưởng lượt ôn của collection cũ đã bỏ');
  await py(KB + 'kb._dialog.refresh(); kb.check_undo(); result = 1'); await sleep(800);
  ok(await coins() === cBackup, `LỖI A: vườn làm mới không trừ xu của ví vừa khôi phục (${await coins()} / ${cBackup})`);
  const rv = await waitPy('d = kb._dialog\nresult = d is not None and d._card is not None and mw.col.db.scalar("select count() from cards where id = ?", d._card.id) == 1 and {"cid": d._card.id}', 8000);
  ok(!!rv, 'bảng ôn đang mở lấy thẻ của collection vừa nhập');
  await py(KB + 'd = kb._dialog\nd._dispatch("rv:show:{}")\nd._dispatch("rv:ans:3")\nresult = 1'); await sleep(1200);
  const r1 = await py(KB + 'result = {"revlog": mw.col.db.scalar("select count() from revlog"), "c": st.load()["coins"]}');
  ok(r1.revlog >= 1 && r1.c >= cBackup, 'chấm tiếp được trên collection mới, ví cộng như thường');
  await py(KB + 'kb._dialog._dispatch("rv:stop"); result = 1');
  const cKeep = await coins();
  const k1 = await gardenKeys();
  ok(await reopenProfile(), 'mở lại hồ sơ');
  ok(await coins() === cKeep, `LỖI B: mở lại hồ sơ → vườn vẫn là bản vừa khôi phục (${await coins()} / ${cKeep}), không bị trả về bản trước khi Import`);
  const k2 = await gardenKeys();
  ok(same(k2.kotoba_batake_state, k1.kotoba_batake_state), 'ví / nhà trong collection không đổi sau khi mở lại');
  await openGarden();

  console.log('== 2. Hồi quy 1.31.2: collection giữ bản cũ hơn bản chụp (đồng bộ lúc add-on tắt) → mở hồ sơ trả lại');
  await py(KB + 'st.add_coins(50)\nkb.sync_core.before_sync(mw.col, kb.USER_DIR)\nresult = 1');
  const cNew = await coins();
  await py(KB + `rev = mw.col.get_config("kotoba_batake_rev")
s = mw.col.get_config("kotoba_batake_state")
s["coins"] = s["coins"] - 50
mw.col.set_config("kotoba_batake_state", s)                  # như bản cũ của điện thoại vừa đè lên
mw.col.set_config("kotoba_batake_rev", dict(rev, t=rev["t"] - 60000))
result = 1`);
  ok(await reopenProfile(), 'mở lại hồ sơ');
  ok(await coins() === cNew, `vẫn trả lại bản mới của máy (${await coins()} / ${cNew}) — móc mới không đổi đường cũ`);
  await openGarden();

  console.log('== 3. Hồi quy: "Mở bản sao lưu" của Anki vẫn giữ bản vừa khôi phục');
  await py(KB + `mw.col.export_collection_package(${JSON.stringify(TMP + '/sao_luu2.colpkg')}, include_media=False, legacy=False)
mw.reopen()
st.add_coins(30)
kb.sync_core.before_sync(mw.col, kb.USER_DIR)
result = 1`);
  const c3 = await coins();
  await py(KB + `mw.unloadProfile(lambda: mw._start_restore_backup(${JSON.stringify(TMP + '/sao_luu2.colpkg')}))\nresult = 1`);
  await sleep(2500);
  await waitPy('result = bool(mw.col) and kb._col_ready() and kb._profile_open', 40000);
  ok(await coins() === c3 - 30, `Mở bản sao lưu → ví của bản sao lưu (${await coins()} / ${c3 - 30})`);
  ok(await reopenProfile(), 'mở lại hồ sơ');
  ok(await coins() === c3 - 30, 'mở lại hồ sơ lần nữa vẫn giữ bản sao lưu');
  await openGarden();

  console.log('== 4. File → Export .colpkg khi vườn đang mở');
  const k4 = await gardenKeys();
  const r4 = await py(KB + `d = kb._dialog
mw.col.export_collection_package(${JSON.stringify(TMP + '/xuat.colpkg')}, include_media=False, legacy=False)
out = {"ready_during": kb._col_ready()}
for cmd in ["refresh", "home:buy:bench", "life:seen:x"]:
    try:
        d._on_bridge(cmd)
    except Exception as e:
        out[cmd] = repr(e)
mw.reopen()
out["ready"] = kb._col_ready()
result = out`);
  ok(r4.ready && Object.keys(r4).length === 2, 'trong lúc xuất: lệnh của vườn bỏ qua êm, xuất xong dùng lại được');
  const k4b = await gardenKeys();
  ok(same(k4b, k4), 'dữ liệu vườn không đổi khi xuất' + (same(k4b, k4) ? '' : ': ' + diffKeys(k4, k4b).map((k) => k + diffDeep(k4[k], k4b[k]).slice(0, 6).join(',')).join(' | ')));
  await py(KB + 'st.add_coins(5); result = 1');
  ok(await coins() === k4.kotoba_batake_state.coins + 5, 'lưu tiếp được sau khi xuất');

  console.log('== 5. Tools → Check Database');
  const k5 = await gardenKeys();
  const r5 = await py(KB + 'out, okk = mw.col.fix_integrity()\nresult = {"ok": okk}');
  const k5b = await gardenKeys();
  ok(same(k5b, k5), 'mọi khoá kotoba_batake_* giữ nguyên (cùng nội dung)' + (same(k5b, k5) ? '' : ': ' + diffKeys(k5, k5b).map((k) => k + diffDeep(k5[k], k5b[k]).slice(0, 6).join(',')).join(' | ')));

  console.log('== 6. Xoá deck đang là nguồn báo + loại note đã cấu hình tiếng Hàn');
  const r6 = await py(KB + `did = mw.col.decks.id_for_name("J::Tiếng Hàn")
kb.words.save_src(mw.col, "ko", [did], "deck")
mid = [m["id"] for m in mw.col.models.all() if m["name"] == "Tiếng Hàn KB"][0]
m = mw.col.models.get(mid)
names = [f["name"] for f in m["flds"]]
kb.FIELDS.set_model(str(mid), {"kind": "vocab", "roles": {"word": names[0], "meaning": names[1]}}, "ko")
kb.save_config(gemini_langs=["ko", "en"], gemini_langs_chosen=True)
mw.col.decks.remove([did])
mw.col.models.remove(mid)
kb._auto_cache.update(t=0.0, k=None, v=None)
v = kb.ai_view()
kb._dialog.refresh()
result = {"picked": v["picked"]["ko"], "decks": len(v["decks"]["ko"])}`);
  ok(r6.picked.length === 0 && r6.decks === 0, 'tab Nguồn báo: deck đã xoá không còn trong danh sách / đã chọn');
  await js('document.getElementById("kb-paper-btn").click(); return 1;'); await sleep(800);
  await js('const t = [...document.querySelectorAll(".kb-p-tab")].find((x) => x.getAttribute("data-ptab") === "src"); if (t) t.click(); return 1;');
  await sleep(1200);
  ok(await js('return !!document.querySelector(".kb-ai-want");'), 'tab Nguồn báo mở được');
  await page.shot(SHOTS + '/1331_nguon_sau_khi_xoa.png');
  await js('GardenPaper.close(); return 1;');

  console.log('== 7. Tab Nguồn báo gọn hơn (người dùng: "bên set up báo hơi nhiều nút")');
  await py(KB + `c = dict(mw.addonManager.getConfig(kb.__name__))
c.update(gemini_langs=["ja", "en"], gemini_langs_chosen=True, gemini_wait_start=False, gemini_wait_langs=[], gemini_level="N4", gemini_level_en="A2",
         gemini_audio="chinh_ta", gemini_story="hay", dict_voice="auto", paper_confirmed={"ja": "gemini", "en": "gemini", "zh": "", "ko": "", "vi": ""})
mw.addonManager.writeConfig(kb.__name__, c); result = 1`);
  const openSrc = async () => {
    await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(1200);
  };
  await openSrc();
  const visCount = () => js(`const root = document.querySelector(".kb-ai"); const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; let p = e.parentElement; while (p) { if (p.tagName === "DETAILS" && !p.open && !p.querySelector(":scope > summary").contains(e)) return false; p = p.parentElement; } return true; };
    return [...root.querySelectorAll("button, input, select, summary")].filter(vis).length;`);
  const n2 = await visCount();
  ok(n2 > 0 && n2 <= 16, `hai báo (Nhật + Anh), đang dùng: ${n2} chỗ bấm đang hiện (1.33.0: 49)`);
  const st7 = await js(`return { more: !!document.querySelector("details.kb-ai-opts-box:not([open])"), plan: !!document.querySelector(".kb-ai-plan:not([open])"),
    sel: [...document.querySelectorAll(".kb-ai-lang select.kb-ai-sel")].map((s) => s.getAttribute("aria-label")),
    chipsInLang: document.querySelectorAll(".kb-ai-lang .kb-ai-chip").length };`);
  ok(st7.more && st7.plan, '"Tuỳ chọn thêm" và dòng Gói báo thu gọn sẵn');
  ok(st7.sel.length === 4 && st7.chipsInLang === 0, 'mỗi báo: Trình độ + Lấy từ là ô thả xuống, không còn hàng nút ' + JSON.stringify(st7.sel));
  const choose = (label, v) => js(`const s = [...document.querySelectorAll("select.kb-ai-sel")].find((x) => x.getAttribute("aria-label") === ${JSON.stringify(label)}); if (!s) return false; s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event("change")); return true;`);
  const cfg = (k) => py(KB + `result = kb.config().get(${JSON.stringify(k)})`);
  ok(await choose('Trình độ của Báo tiếng Nhật', 'N3'), 'chọn được Trình độ báo Nhật'); await sleep(900);
  ok(await choose('Trình độ của Báo tiếng Anh', 'B1'), 'chọn được Trình độ báo Anh'); await sleep(900);
  ok(await cfg('gemini_level') === 'N3' && await cfg('gemini_level_en') === 'B1', 'Trình độ lưu gemini_level = N3, gemini_level_en = B1');
  await choose('Lấy từ cho Báo tiếng Anh', 'level'); await sleep(900);
  ok(await py(KB + 'result = kb.words.load_src(mw.col)["en"]["mode"]') === 'level', 'Lấy từ → Không dùng deck: lưu mode "level"');
  await choose('Lấy từ cho Báo tiếng Anh', 'pick'); await sleep(600);
  ok(await js('return !!document.querySelector(".kb-ai-decks-list");'), 'Lấy từ → Chọn deck…: hiện danh sách deck');
  await js('const b = [...document.querySelectorAll(".kb-ai-decks button")].find((x) => x.textContent === "Xong"); if (b) b.click(); return 1;'); await sleep(300);
  await choose('Lấy từ cho Báo tiếng Anh', 'all'); await sleep(900);
  ok(await py(KB + 'result = kb.words.load_src(mw.col)["en"]["mode"]') === 'deck', 'Lấy từ → Mọi deck: về "deck"');
  // khối "Tuỳ chọn thêm": mở → đổi một mục (bảng vẽ lại) → vẫn mở
  await js('document.querySelector("details.kb-ai-opts-box").open = true; return 1;'); await sleep(300);
  ok(await choose('Giọng đọc của báo', 'ca_bai'), 'mở "Tuỳ chọn thêm": có ô Giọng đọc'); await sleep(1000);
  ok(await cfg('gemini_audio') === 'ca_bai', 'Giọng đọc → Cả bài: lưu gemini_audio');
  ok(await js('return document.querySelector("details.kb-ai-opts-box").open;'), 'bảng vẽ lại sau khi đổi: "Tuỳ chọn thêm" vẫn mở');
  await choose('Giọng đọc của báo', 'chinh_ta'); await sleep(800);
  await choose('Truyện dài kỳ', 'tiet_kiem'); await sleep(900);
  ok(await cfg('gemini_story') === 'tiet_kiem', 'Truyện → Tiết kiệm: lưu gemini_story');
  await choose('Truyện dài kỳ', 'hay'); await sleep(800);
  await choose('Giọng cho câu không có audio', 'may'); await sleep(900);
  ok(await cfg('dict_voice') === 'may', 'Giọng cho câu không có audio → Giọng máy: lưu dict_voice');
  await choose('Giọng cho câu không có audio', 'auto'); await sleep(800);
  const more7 = await js(`const d = document.querySelector("details.kb-ai-opts-box"); return { t: d.innerText, forget: !!d.querySelector(".kb-ai-forget"), tones: d.querySelectorAll(".kb-ai-tones .kb-ai-chip").length, auto: !!d.querySelector(".kb-ai-auto input") };`);
  ok(/Khoá/.test(more7.t) && /Đổi khoá/.test(more7.t) && more7.forget && more7.tones === 8 && more7.auto,
    '"Tuỳ chọn thêm" còn đủ: Khoá + Đổi khoá, Chủ đề truyện (8), Tự viết khi mở Anki, Xoá khoá');
  await page.shot(SHOTS + '/1331_tuy_chon_them.png');
  // dòng Gói báo: bấm mở → nút mua + Tự gia hạn
  await js('document.querySelector(".kb-ai-plan > summary").click(); return 1;'); await sleep(300);
  const plan7 = await js('const p = document.querySelector(".kb-ai-plan"); return { open: p.open, btn: [...p.querySelectorAll("button")].map((b) => b.textContent), auto: !!p.querySelector("input[type=checkbox]") };');
  ok(plan7.open && plan7.btn.length === 2 && /1 tuần/.test(plan7.btn[0]) && plan7.auto, 'bấm dòng Gói báo → 2 nút mua + Tự gia hạn ' + JSON.stringify(plan7.btn));
  for (const [w, h] of [[1366, 768], [720, 520]]) {
    await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(1000);
    await openSrc();
    const ov = await js('const st = document.getElementById("kb-p-stage"); return [st.scrollWidth - st.clientWidth, document.documentElement.scrollWidth - window.innerWidth, [...st.querySelectorAll("select.kb-ai-sel, .kb-ai-plan-go")].filter((e) => e.getBoundingClientRect().right > st.getBoundingClientRect().right + 1).length];');
    ok(ov[0] <= 1 && ov[1] <= 1 && ov[2] === 0, `${w} × ${h}: không tràn ngang, ô thả xuống / nút Gói báo trong khung ` + JSON.stringify(ov));
    await page.shot(SHOTS + `/1331_nguon_${w}.png`);
  }
  await js('GardenPaper.close(); return 1;');

  console.log('== 8. Bấm bừa tab Nguồn báo (120 thao tác ngẫu nhiên, hạt cố định)');
  await py(KB + 'kb._dialog.resize(1100, 820); result = 1'); await sleep(800);
  await openSrc();
  let seed = Number(process.env.KB_SEED || 1331);
  const rnd = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return Math.floor(seed / 65536) % n; };   // bit cao (bit thấp của LCG lặp ngắn)
  const acts = { tick: 0, sel: 0, det: 0, reopen: 0 };
  for (let i = 0; i < 120; i++) {
    const k = rnd(10);
    if (k < 3) {
      acts.tick++;
      await js(`const l = [...document.querySelectorAll(".kb-ai-want .kb-ai-tick input")].filter((x) => !x.disabled); if (l.length) l[${rnd(97)} % l.length].click(); return 1;`);
    } else if (k < 7) {
      acts.sel++;
      // không chọn "Chọn deck…" (mở danh sách deck — phần đó có kịch bản riêng ở e2e_119 / e2e_1223)
      await js(`const s = [...document.querySelectorAll("select.kb-ai-sel")]; if (!s.length) return 0; const x = s[${rnd(97)} % s.length];
        const o = [...x.options].filter((op) => !op.disabled && op.value !== "pick"); if (!o.length) return 0; x.value = o[${rnd(89)} % o.length].value; x.dispatchEvent(new Event("change")); return 1;`);
    } else if (k < 9) {
      acts.det++;
      await js('const d = [...document.querySelectorAll("#kb-p-stage details")]; if (d.length) { const x = d[' + rnd(97) + ' % d.length]; x.open = !x.open; } return 1;');
    } else {
      acts.reopen++;
      await openSrc();
    }
    await sleep(120 + rnd(250));
  }
  await sleep(1200);
  const inv = await py(KB + `c = kb.config()
langs = c.get("gemini_langs")
learn = [x for x in (langs or []) if x in kb.LEARN_LANGS]
result = {"langs": langs, "ok_langs": isinstance(langs, list) and len(learn) <= 2 and (("vi" not in langs) or langs == ["vi"]) and len(set(langs)) == len(langs),
          "ok_lv": c.get("gemini_level") in kb.ai.LEVELS and c.get("gemini_level_en") in kb.ai_en.LEVELS and c.get("gemini_level_zh") in kb.ai_zh.LEVELS and c.get("gemini_level_ko") in kb.ai_ko.LEVELS,
          "ok_other": c.get("gemini_audio") in kb.ai.AUDIO_MODES and c.get("gemini_story") in kb.story_core.MODES and c.get("dict_voice") in kb.DICT_VOICE_MODES,
          "src": {k: v.get("mode") for k, v in kb.words.load_src(mw.col).items()}}`);
  ok(inv.ok_langs && inv.ok_lv && inv.ok_other, `sau ${JSON.stringify(acts)}: cấu hình báo luôn hợp lệ ${JSON.stringify(inv)}`);
  const vis8 = await js('return !!document.querySelector(".kb-ai-want") && document.documentElement.scrollWidth <= innerWidth + 1;');
  ok(vis8, 'tab Nguồn báo vẫn vẽ đúng, không tràn ngang');
  await js('GardenPaper.close(); return 1;');

  const errs = (await seen()).slice(errs0);
  ok(errs.length === 0, 'nhật ký lỗi của add-on trống (lỗi Python + lỗi JS của trang)' + (errs.length ? ': ' + errs.join(' | ') : ''));
  console.log(`KẾT QUẢ: ${pass}/${total}` + (pass === total ? ' — TẤT CẢ OK' : ''));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); console.log(`KẾT QUẢ: ${pass}/${total}`); process.exit(1); });
