// Ảnh cho bài đăng Facebook bản 1.35.6 (20/11): chụp trong Anki thật với bộ thẻ mẫu, khung đỏ đánh số quanh nút / tính năng
// mới vẽ ngay trên trang (đo đúng vị trí phần tử). Không phải test (không có ✓ / ✗). Mỗi ảnh ghi thêm <tên>.json (tiêu đề +
// chú thích từng số) để bai_dang_1356_ghep.py thêm dải tiêu đề / chú thích.
// Chạy (ANKI_PY = venv có aqt):
//   B=/tmp/kb_fb; ./setup_demo.sh $B ../../kotoba_batake && $ANKI_PY demo_1334.py $B/Test/collection.anki2 && $ANKI_PY demo_zhko.py $B/Test/collection.anki2
//   (./run_anki.sh $B 9333 $B.log &) ; node bai_dang_1356.js RAW [bước…] ; python3 bai_dang_1356_ghep.py RAW ../../docs/bai_dang/1.35.6
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_fb_raw';
const ONLY = process.argv.slice(3);
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const FIX135 = path.resolve(__dirname, '..', 'fixtures', 'bao_135.json');
const FIX133 = path.resolve(__dirname, '..', 'fixtures', 'bao_133.json');
const MODP = path.resolve(__dirname, '..', 'fixtures', 'gemini_models_20261116.json');
const want = (k) => !ONLY.length || ONLY.indexOf(k) >= 0;
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 30; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) { return p; }
      p.close();
    }
    await sleep(500);
  }
  return null;
}
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
async function waitPy(code, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await py(KB + code); if (v) return v; } catch (e) { } await sleep(300); }
  return false;
}
const size = (w, h) => py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`).then(() => sleep(900));
const deck = (name) => py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`).then(() => sleep(1600));
const sky = (h, w) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "${w || 'sunny'}"); return 1;`);
const hideToast = () => js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
async function keyEv(key, code, vk, mods) {
  for (const type of ['keyDown', 'keyUp']) {
    await page.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, modifiers: mods || 0,
      text: type === 'keyDown' && key.length === 1 && !mods ? key : undefined });
  }
}
async function mouseAt(x, y) {
  for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
    await page.send('Input.dispatchMouseEvent', { type, x, y, button: type === 'mouseMoved' ? 'none' : 'left', clickCount: 1 });
  }
}
async function closeAll() {
  await js(`try { GardenPaper.close(); } catch (e) {} try { GardenCal.close(); } catch (e) {} try { GardenGames.close(); } catch (e) {}
    try { if (GardenHome.isOpen()) GardenHome.close(); } catch (e) {} try { GardenFields.close(); } catch (e) {}
    const s = document.getElementById("kb-stop"); if (s && !document.getElementById("kb-panel").hidden) s.click();
    const p = document.getElementById("kb-deck-pop"); if (p && !p.hidden) document.getElementById("kb-deck-btn").click();
    const so = document.getElementById("kb-sound-pop"); if (so && !so.hidden) document.getElementById("kb-sound").click();
    const say = document.getElementById("kb-say"); if (say) say.hidden = true;
    return 1;`);
  await sleep(700);
  await clearMarks();
}

// ---- khung đỏ đánh số -------------------------------------------------------------------------------------------------
const CSS = `
.fb-box { position: fixed; z-index: 99990; pointer-events: none; border: 4px solid #e8382f; border-radius: 10px;
  box-shadow: 0 0 0 2px #fff, 0 0 0 5px rgba(232, 56, 47, .25); }
.fb-num { position: fixed; z-index: 99991; pointer-events: none; width: 34px; height: 34px; border-radius: 50%; background: #e8382f;
  color: #fff; font: 800 20px/30px "Noto Sans", "DejaVu Sans", sans-serif; text-align: center; border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, .35); box-sizing: border-box; }
`;
const ensureCss = () => js(`if (!document.getElementById("fb-css")) { const s = document.createElement("style"); s.id = "fb-css"; s.textContent = ${JSON.stringify(CSS)}; document.head.appendChild(s); } return 1;`);
const clearMarks = () => js('document.querySelectorAll(".fb-box, .fb-num").forEach((e) => e.remove()); return 1;');
// marks: [{ sel | rect: [x, y, w, h] | sels: [..], n, pad, at: "tl" | "tr" | "bl" | "br" | "l" | "r" }]
async function mark(marks) {
  await ensureCss();
  return js(`const out = [];
    ${JSON.stringify(marks)}.forEach((m) => {
      let r = null;
      const rectOf = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.width || b.height ? b : null; };
      if (m.rect) { r = { left: m.rect[0], top: m.rect[1], right: m.rect[0] + m.rect[2], bottom: m.rect[1] + m.rect[3] }; }
      else {
        (m.sels || [m.sel]).forEach((s) => { const b = rectOf(s); if (!b) return;
          r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) }
                : { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; });
      }
      if (!r) { out.push(m.n + ": không thấy " + (m.sel || m.sels)); return; }
      const p = m.pad === undefined ? 5 : m.pad;
      const L = Math.max(3, r.left - p), T = Math.max(3, r.top - p), R = Math.min(innerWidth - 3, r.right + p), B = Math.min(innerHeight - 3, r.bottom + p);
      const f = document.createElement("div"); f.className = "fb-box";
      f.style.left = L + "px"; f.style.top = T + "px"; f.style.width = (R - L) + "px"; f.style.height = (B - T) + "px";
      document.body.appendChild(f);
      const n = document.createElement("div"); n.className = "fb-num"; n.textContent = String(m.n);
      const at = m.at || "tl";
      let x = L - 17, y = T - 17;
      if (at === "tr") { x = R - 17; }
      if (at === "bl") { y = B - 17; }
      if (at === "br") { x = R - 17; y = B - 17; }
      if (at === "l") { x = L - 40; y = (T + B) / 2 - 17; }
      if (at === "r") { x = R + 6; y = (T + B) / 2 - 17; }
      if (at === "t") { x = (L + R) / 2 - 17; y = T - 40; }
      x = Math.max(2, Math.min(innerWidth - 36, x + (m.dx || 0))); y = Math.max(2, Math.min(innerHeight - 36, y + (m.dy || 0)));
      n.style.left = x + "px"; n.style.top = y + "px";
      document.body.appendChild(n);
    });
    return out;`);
}
// ảnh + chú thích: info = { title, sub, items: ["chú thích số 1", …] }
// chụp gấp đôi (deviceScaleFactor 2: chữ / hình vẽ lại nét, bố cục giữ nguyên) để ảnh đăng Facebook không mờ
async function shot(name, info, opts) {
  await hideToast(); await sleep((opts && opts.wait) || 400);
  const dims = await page.eval('[innerWidth, innerHeight]');
  await page.send('Emulation.setDeviceMetricsOverride', { width: dims[0], height: dims[1], deviceScaleFactor: 2, mobile: false });
  await sleep(1300);
  const r = await page.send('Page.captureScreenshot', Object.assign({ format: 'png' }, opts && opts.clip ? { clip: Object.assign({ scale: 1 }, opts.clip) } : {}));
  await page.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  if (info) { fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(info, null, 1)); }
  console.log('  ảnh', name);
}

// ---------------------------------------------------------------------------------------------------------------------
async function setup() {
  await py(KB + `d = st.load(); d["coins"] = 200000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
yard = [("sakura", 4, 0), ("lantern", 7, 0), ("bonsai", 12, 0), ("flowers", 4, 1), ("bench", 6, 1), ("well", 13, 1), ("mailbox", 4, 2), ("pond", 6, 2)]
room = [("painting", 1, 0), ("clock", 7, 0), ("shelf", 0, 1), ("plant", 9, 1), ("rug", 4, 2), ("kotatsu", 4, 2)]
for _ in range(3):
    try:
        st.open_rooms()
    except Exception:
        pass
for scene, items in (("yard", yard), ("room", room)):
    for iid, x, y in items:
        try:
            st.buy(iid); st.place(scene, iid, x, y)
        except Exception:
            pass
try:
    st.pet_buy("neko")
except Exception:
    pass
d = st.load(); d["coins"] = 3420; st.save(d)
kb.ASK_TEST_OFF = True
kb.save_config(show_tooltips=False, sound=False, music=False)
kb.open_garden(); result = 1`);
  await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await size(1366, 860);
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await sky(9); await sleep(1200);
}

// ---- 1. bảng ôn -------------------------------------------------------------------------------------------------------
async function stepReview() {
  await closeAll(); await size(1366, 860);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await js('GardenUI.setGlob("card", "normal"); return 1;');
  await js('document.getElementById("kb-review").click(); return 1;'); await sleep(1800);
  await keyEv(' ', 'Space', 32); await sleep(1100);              // lật
  await keyEv('3', 'Digit3', 51); await sleep(1500);             // Được → thẻ kế tiếp (có nút Hoàn tác)
  await keyEv(' ', 'Space', 32); await sleep(1300);              // lật thẻ kế tiếp: mặt sau, 4 nút chấm
  const vis = await js('return ["kb-rv-undo", "kb-rv-replay", "kb-rv-edit", "kb-ratings"].map((i) => i + ":" + !document.getElementById(i).hidden).join(" ");');
  console.log('  ', vis);
  await mark([
    { sel: '#kb-rv-undo', n: 1, at: 'tl' },
    { sel: '#kb-rv-replay', n: 2, at: 'tl' },
    { sel: '#kb-rv-garden', n: 3, at: 'tl' },
    { sel: '#kb-rv-zoom', n: 4, at: 'tl' },
    { sel: '#kb-rv-edit', n: 5, at: 'tl' },
    { sel: '#kb-ratings', n: 6, at: 'tl', pad: 4 },
  ]);
  await shot('10_bang_on', { title: 'Bảng ôn (Tưới ngay) có thêm nút mới', items: [
    'Hoàn tác (Ctrl+Z): lỡ tay chấm nhầm thì quay lại thẻ vừa chấm',
    'Nghe lại (R): phát lại âm thanh của thẻ',
    'Ẩn vườn: chỉ còn thẻ, bấm lại là hiện vườn',
    'Phóng to (F): thẻ chiếm gần hết cửa sổ — hợp với thẻ dài',
    'Sửa (E): mở cửa sổ sửa thẻ của Anki ngay lúc đang ôn',
    'Phím 1 · 2 · 3 · 4 ghi ngay trên nút chấm; thẻ trắc nghiệm tự lật như trong Anki',
  ] });
  await clearMarks();
}

// ---- S1. cửa sổ chính của Anki: nút ことば畑 trên thanh trên cùng --------------------------------------------------------
async function stepAnki() {
  await py(KB + 'mw.resize(1000, 600); mw.raise_(); result = 1'); await sleep(1500);
  const garden = page;
  const anki = {};
  for (const t of ['top toolbar', 'main webview']) {
    const info = (await pages(CDP)).find((i) => i.title === t);
    anki[t] = await Page.open(info.webSocketDebuggerUrl);
  }
  page = anki['top toolbar'];
  // khung vẽ ở bước ghép (thanh trên cùng chỉ cao 37 px, khung vẽ trong trang bị cắt): ghi toạ độ nút
  const r = await js('const a = Array.from(document.querySelectorAll("a, button")).find((x) => /ことば畑/.test(x.textContent)); if (!a) return null; const b = a.getBoundingClientRect(); return [b.left, b.top, b.width, b.height];');
  fs.writeFileSync(path.join(OUT, '01a_anki_thanh_nut.json'), JSON.stringify(r));
  await shot('01a_anki_thanh');
  page.close();
  page = anki['main webview'];
  await shot('01b_anki_deck');
  page.close();
  page = garden;
  fs.writeFileSync(path.join(OUT, '01_mo_vuon.json'), JSON.stringify({ title: 'Bước 1 · Mở vườn', items: [
    'Bấm nút ことば畑 trên thanh trên cùng của Anki (hoặc Ctrl+Shift+K). Lần đầu có hướng dẫn 3 bước.'] }));
  console.log('  thanh Anki:', r);
}

// ---- S2. Cấu hình trường -----------------------------------------------------------------------------------------------
async function stepFields() {
  await closeAll(); await size(1366, 860);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await js('document.getElementById("kb-fields-open").click(); return 1;');
  await waitFor('return !!document.querySelector("#kb-f-stage .kb-f-table");', 8000); await sleep(600);
  await js('window.scrollTo(0, 0); return 1;');
  await mark([
    { sel: '#kb-f-stage .kb-f-list', n: 1, at: 'tl' },
    { sel: '#kb-f-stage .kb-f-kinds', n: 2, at: 'l', pad: 2 },
    { sel: '#kb-f-stage .kb-f-table', n: 3, at: 'l', pad: 2 },
    { sel: '#kb-f-stage .kb-f-games', n: 4, at: 'tl' },
    { sel: '#kb-f-save', n: 5, at: 'tl' },
  ]);
  await shot('02_cau_hinh_truong', { title: 'Bước 2 · Cấu hình trường (⚙ → Cấu hình trường…)', items: [
    'Chọn loại note của deck (loại nào chưa cấu hình có dấu ⚠)',
    'Ngôn ngữ (Nhật · Anh · Trung · Hàn · Đức · Pháp) và Loại: Từ vựng / Chữ Hán / Ngữ pháp',
    'Mỗi vai trò (Từ, Cách đọc, Nghĩa, Câu ví dụ…) chọn đúng trường; cột phải là note mẫu để kiểm tra',
    'Xem luôn trò chơi nào chơi được với cấu hình này',
    'Bấm Lưu cấu hình — xong! Add-on đã điền sẵn gợi ý, thường chỉ cần kiểm tra lại',
  ] });
  await clearMarks();
}

// ---- S3. dán khoá Gemini -------------------------------------------------------------------------------------------------
async function openSrc() {
  await js('try { GardenPaper.close(); } catch (e) {} return 1;'); await sleep(300);
  await js('document.getElementById("kb-paper-btn").click(); return 1;');
  await waitFor('return !document.getElementById("kb-paper").hidden;');
  await js('const t = [...document.querySelectorAll(".kb-p-tab")].find((x) => x.getAttribute("data-ptab") === "src"); t.click(); return 1;');
  await sleep(900);
}
async function stepKey() {
  await closeAll(); await size(1366, 860);
  await py(KB + `c = dict(mw.addonManager.getConfig(kb.__name__)); c.pop("gemini_langs_chosen", None)
c.update(gemini_key="", bao_dir="", gemini_langs=["ja"], gemini_wait_start=False, gemini_wait_langs=[], gemini_auto=False)
mw.addonManager.writeConfig(kb.__name__, c)
result = 1`);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await openSrc();
  await waitFor('return !!document.querySelector(".kb-ai-steps .kb-ai-key");', 8000);
  await js('window.scrollTo(0, 0); return 1;');
  await mark([
    { sel: '.kb-p-tab[data-ptab="src"]', n: 1, at: 'tl' },
    { sel: '.kb-ai-want', n: 2, at: 'r' },
    { sel: '.kb-ai-steps', n: 3, at: 'r' },
  ]);
  await shot('03_khoa_gemini', { title: 'Bước 3 · Dán khoá Gemini để có báo mỗi sáng (tuỳ chọn, miễn phí)', items: [
    'Mở tab Nguồn báo: ⚙ → Nguồn báo…, hoặc nút Báo → Nguồn báo',
    'Tick báo muốn nhận (tối đa 2), add-on tự gợi ý theo deck bạn học',
    'Bấm "Mở trang lấy khoá ↗" (aistudio.google.com/apikey) → đăng nhập Google → Create API key → Copy → dán vào ô → "Thử khoá". Khoá chỉ lưu trên máy bạn',
  ] });
  await clearMarks();
}

// ---- 11. ô chọn deck dạng cây ---------------------------------------------------------------------------------------------
async function stepDeck() {
  await closeAll(); await size(1366, 860);
  await deck('Tiếng Nhật::N4::Bài 17');
  await js('document.getElementById("kb-deck-btn").click(); return 1;'); await sleep(800);
  await mark([
    { sel: '#kb-deck-btn', n: 1, at: 'tl' },
    { sel: '#kb-deck-q', n: 2, at: 'r' },
    { sel: '#kb-deck-list', n: 3, at: 'r' },
  ]);
  await shot('11_cay_deck', { title: 'Chọn deck dạng cây như trong Anki', items: [
    'Ô Deck gọn: bấm để mở cây deck',
    'Gõ để tìm deck (gõ không dấu cũng được, vd. "n4 bai 17")',
    'Deck con thu gọn / mở (▸ ▾), có số thẻ Mới · Học · Ôn của từng deck',
  ] });
  await clearMarks();
  await js('document.getElementById("kb-deck-btn").click(); return 1;'); await sleep(400);
}

// ---- 12. 4 ngôn ngữ mới + Ngôn ngữ trong vườn -----------------------------------------------------------------------------
async function stepLang() {
  await closeAll(); await size(1366, 860);
  await deck('Tiếng Trung::HSK 1');
  await sky(9); await sleep(600);
  await js('window.scrollTo(0, 0); return 1;');
  // mở thẻ của một cây (bấm vào cây trên ruộng)
  const hit = await js(`const c = document.getElementById("kb-canvas"), r = c.getBoundingClientRect();
    for (let y = r.top + 30; y < r.bottom - 10; y += 24) { for (let x = r.left + 30; x < r.left + 600; x += 24) {
      c.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true }));
      const p = document.getElementById("kb-pin"); if (!p.hidden && /\\S/.test(document.getElementById("kb-pin-word").textContent) && document.querySelector("#kb-pin-word rt")) return [x, y, document.getElementById("kb-pin-word").textContent];
    } } return null;`);
  console.log('  thẻ cây:', hit);
  await js('GardenLang.setPref("auto"); GardenFX.say(GardenLang.line("いいね！ Hay lắm", "zh"), 20000, "zh"); return 1;'); await sleep(500);
  await js('document.getElementById("kb-sound").click(); return 1;'); await sleep(600);
  await js('const s = document.querySelector(".kb-glang-row"); if (s) s.scrollIntoView({ block: "center" }); window.scrollTo(0, 0); return 1;');
  await mark([
    { sel: '#kb-pin', n: 1, at: 'tl' },
    { sel: '#kb-say', n: 2, at: 'tl', pad: 3 },
    { sel: '.kb-glang-row', n: 3, at: 'l' },
  ]);
  await shot('12_ngon_ngu', { title: 'Thêm tiếng Trung · tiếng Hàn · tiếng Đức · tiếng Pháp', items: [
    'Deck tiếng Trung: pinyin trên từng chữ + âm Hán Việt; tiếng Hàn có phiên âm; Đức / Pháp nhận mạo từ, dạng biến đổi',
    'StackChan, sinh hoạt, đồ nhặt, khách ghé nói theo tiếng của deck',
    '⚙ → Ngôn ngữ trong vườn: Tự theo deck / Nhật / Anh / Trung / Hàn / Đức / Pháp / Chỉ tiếng Việt',
  ] });
  await clearMarks();
  await js('document.getElementById("kb-sound").click(); return 1;'); await sleep(300);
}

// ---- 13–14. báo 6 thứ tiếng (Gemini giả: số báo mẫu tests/fixtures, không gọi mạng) -----------------------------------------
const DE = [['das Wetter', 'thời tiết'], ['das Dorf', 'làng'], ['das Foto', 'ảnh'], ['das Fest', 'lễ hội'], ['vorbereiten', 'chuẩn bị'],
  ['das Notizbuch', 'sổ tay'], ['der Brunnen', 'cái giếng'], ['die Angst', 'nỗi sợ'], ['das Geräusch', 'tiếng động'], ['das Auge', 'mắt'],
  ['die Geschichte', 'câu chuyện'], ['das Gasthaus', 'quán trọ'], ['die Katze', 'con mèo'], ['das Bild', 'bức tranh'], ['die Blume', 'bông hoa'],
  ['schön', 'đẹp'], ['machen', 'làm'], ['das Blatt', 'chiếc lá'], ['malen', 'vẽ'], ['lachen', 'cười'], ['zittern', 'run'], ['gehen', 'đi']];
async function stepPaper() {
  await closeAll(); await size(1366, 860);
  await py(KB + `col = mw.col
if not col.decks.id_for_name("Tiếng Đức::A2"):
    mm = col.models
    m = mm.new("Deutsch Wortschatz")
    for f in ("Wort", "Bedeutung"):
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = "{{Wort}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Bedeutung}}"
    mm.add_template(m, t); mm.add(m); m = mm.by_name("Deutsch Wortschatz")
    did = col.decks.id("Tiếng Đức::A2")
    for w, me in ${JSON.stringify(DE)}:
        n = col.new_note(m); n["Wort"], n["Bedeutung"] = w, me; col.add_note(n, did)
    today = col.sched.today
    for i, cid in enumerate(col.find_cards('deck:"Tiếng Đức::A2"')):
        col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3 where id=?", 5 + i, today + (i % 4) - 1, cid)
S = kb.story_core
A = kb.ai
F1 = json.load(open(${JSON.stringify(FIX133)}, encoding="utf-8"))
F2 = json.load(open(${JSON.stringify(FIX135)}, encoding="utf-8"))
FIX = {"zh": F1["zh"], "ko": F1["ko"], "de": F2["de"], "fr": F2["fr"]}
MODELS = json.load(open(${JSON.stringify(MODP)}, encoding="utf-8"))["models"]
def fake_models(self):
    return MODELS
def fake_generate(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None, **k):
    self.calls += 1
    f = FIX[kb._ai.get("lang")]
    if schema is S.RETELL_SCHEMA:
        out = dict(f["story"]); out["nho"] = {"tom_tat": "Lin sợ khi nghe chuyện ma."}
        return json.dumps(out, ensure_ascii=False)
    if schema is A.REVIEW_SCHEMA:
        return json.dumps({"van_de": [], "bao": f["issue"]}, ensure_ascii=False)
    if schema is A.ISSUE_SCHEMA:
        return json.dumps(f["issue"], ensure_ascii=False)
    raise A.AIError("lượt gọi lạ", kind="bad")
def no_net(self, *a, **k):
    raise A.AIError("không gọi mạng", kind="net")
A.Gemini.models = fake_models; A.Gemini.generate = fake_generate; A.Gemini._request = no_net; A.Gemini.speak = no_net
kb.ai.test_key = lambda client, prefer=None: {"model": "gemini-4-hydrogen", "models": ["gemini-4-hydrogen", "gemini-3.5-flash-lite"], "tts": "gemini-3.8-tts"}
date = kb.ai_today()
A.ensure_dir(kb.AI_DIR_SHARED)
S.save_master(kb.AI_DIR_SHARED, date, {"ngay": date, "ky": 2, "thoi_tiet": "nắng", "tin": [{"tieu_de": "Lá đỏ", "noi_dung": "Lá trong làng rất đẹp."}],
              "truyen": {"tieu_de": "Lời kể lúc bình minh", "ky_truoc": "Lin nghe tiếng guốc gỗ ở giếng cổ.", "doan": ["Đoạn 1.", "Đoạn 2.", "Đoạn 3."],
                         "nho": {"tom_tat": "Lin sợ."}, "lang": "vi"}})
c = dict(mw.addonManager.getConfig(kb.__name__))
c.update(gemini_key="AIzaSyFB-demo-key-0000000000000000000abcd", gemini_langs=["zh", "de"], gemini_langs_chosen=True, gemini_auto=False,
         gemini_wait_start=False, gemini_wait_langs=[], gemini_audio="tat")
mw.addonManager.writeConfig(kb.__name__, c)
result = date`);
  await deck('Tiếng Trung::HSK 1');
  await openSrc();
  const start = await waitFor('const b = document.querySelector(".kb-ai-startbtn"); return b && !b.disabled ? b.textContent : "";', 6000);
  console.log('  nút viết:', start);
  if (start) {
    await js('document.querySelector(".kb-ai-startbtn").click(); return 1;');
    const done = await waitPy('result = kb.ai.has_issue(kb.AI_DIR_ZH, kb.ai_today()) and kb.ai.has_issue(kb.AI_DIR_DE, kb.ai_today()) and not kb._ai["running"]', 90000);
    console.log('  viết xong:', done);
  }
  await openSrc();
  await js('const g = [...document.querySelectorAll(".kb-ai-card button")].find((x) => /^Gia hạn ▴/.test(x.textContent)); if (g) g.click(); window.scrollTo(0, 0); return 1;'); await sleep(500);
  const n = await js('return document.querySelectorAll(".kb-ai-lang").length;');
  console.log('  khối báo:', n);
  // ảnh trên: Báo muốn nhận + khối báo tiếng Trung; ảnh dưới: Tuỳ chọn thêm → Bắt đầu truyện mới (ghép ở bước ghép)
  await mark([
    { sel: '.kb-ai-want', n: 1, at: 'l' },
    { sels: ['.kb-ai-lang'], n: 2, at: 'l' },
  ]);
  const crop1 = await js(`const a = document.querySelector(".kb-ai-want").getBoundingClientRect(), b = document.querySelector(".kb-ai-lang").getBoundingClientRect();
    return [Math.max(0, a.left - 50), a.top - 22, Math.min(innerWidth, a.right + 30) - Math.max(0, a.left - 50), b.bottom + 16 - (a.top - 22)];`);
  await shot('13_nguon_bao', { title: 'Báo mỗi sáng: thêm báo tiếng Trung · Hàn · Đức · Pháp', items: [
    'Báo muốn nhận: chọn tối đa 2 báo trong Nhật / Anh / Trung / Hàn / Đức / Pháp (hoặc chỉ tiếng Việt)',
    'Mỗi báo một trình độ riêng (HSK / TOPIK / A1–C1…) và lấy từ deck bạn chọn',
    'Tuỳ chọn thêm → Bắt đầu truyện mới: cả làng kể truyện dài kỳ mới từ kỳ 1 (truyện cũ được cất lại)',
  ], crop: crop1 });
  await clearMarks();
  await js('const d = [...document.querySelectorAll("#kb-p-stage details")].find((x) => /Tuỳ chọn thêm/.test((x.querySelector("summary") || {}).textContent || "")); if (d && !d.open) { d.querySelector("summary").click(); } return 1;'); await sleep(700);
  await js('const r = document.querySelector(".kb-ai-restart"); window.scrollTo(0, 0); const st = document.getElementById("kb-p-stage"); st.scrollTop = st.scrollHeight; return 1;'); await sleep(500);
  await mark([{ sel: '.kb-ai-restart', n: 3, at: 'l' }]);
  const crop2 = await js(`const a = [...document.querySelectorAll("#kb-p-stage details")].find((x) => /Tuỳ chọn thêm/.test((x.querySelector("summary") || {}).textContent || "")).getBoundingClientRect(), r = document.querySelector(".kb-ai-restart").getBoundingClientRect();
    const top = Math.max(a.top, r.top - 140) - 10;
    return [Math.max(0, a.left - 50), top, Math.min(innerWidth, a.right + 30) - Math.max(0, a.left - 50), r.bottom + 9 - top];`);
  await shot('13b_nguon_bao', { crop: crop2 });
  await clearMarks();
  await size(1366, 860);
  // đọc báo tiếng Trung, Ẩn vườn
  await js(`const b = [...document.querySelectorAll(".kb-ai-lang")].find((x) => /Trung/.test(x.querySelector("b").textContent)); const r = b && [...b.querySelectorAll("button")].find((x) => x.textContent === "Đọc"); if (r) r.click(); return 1;`);
  await waitFor('return !!document.querySelector("#kb-p-stage .kb-p-name");', 8000); await sleep(800);
  if (await js('return document.getElementById("kb-p-garden").getAttribute("aria-pressed") !== "true";')) {
    await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(900);
  }
  await js('const w = [...document.querySelectorAll("#kb-p-stage .kb-p-w")][2]; if (w) w.click(); window.scrollTo(0, 0); return 1;'); await sleep(600);
  await mark([
    { sel: '#kb-p-stage .kb-p-name', n: 1, at: 'l' },
    { sel: '#kb-p-info', n: 2, at: 'tl' },
    { sel: '#kb-p-garden', n: 3, at: 'tl' },
  ]);
  await shot('14_doc_bao', { title: 'Đọc báo tiếng Trung 词田晨报 (báo tiếng Hàn 말밭 신문, Đức Der Wortgarten, Pháp Le Jardin des Mots)', items: [
    'Báo viết bằng chính từ trong deck, có pinyin trên chữ; chung một truyện dài kỳ với các báo khác',
    'Bấm từ gạch chân để tra nghĩa + Hán Việt, xem cây của từ đó trong vườn',
    'Ẩn vườn: khung báo cao kín cửa sổ (Trò chơi cũng có nút này)',
  ] });
  await clearMarks();
  await js('if (document.getElementById("kb-p-garden").getAttribute("aria-pressed") === "true") document.getElementById("kb-p-garden").click(); return 1;'); await sleep(600);
}

// ---- 15. Trò chơi: Ẩn vườn -------------------------------------------------------------------------------------------------
async function stepGames() {
  await closeAll(); await size(1366, 860);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(1000);
  if (await js('return document.getElementById("kb-g-garden").getAttribute("aria-pressed") !== "true";')) {
    await js('document.getElementById("kb-g-garden").click(); return 1;'); await sleep(900);
  }
  await js('window.scrollTo(0, 0); return 1;');
  await mark([{ sel: '#kb-g-garden', n: 1, at: 'tl' }]);
  await shot('15_tro_choi', { title: 'Trò chơi: nút Ẩn vườn / Hiện vườn', items: [
    'Ẩn vườn để vùng chơi cao kín cửa sổ; bấm lại là hiện vườn. Nhớ lựa chọn cho lần sau'] });
  await clearMarks();
  await js('if (document.getElementById("kb-g-garden").getAttribute("aria-pressed") === "true") document.getElementById("kb-g-garden").click(); return 1;'); await sleep(500);
}

// ---- 16. Nhà → Trang trí thử -----------------------------------------------------------------------------------------------
async function stepTry() {
  await closeAll(); await size(1366, 860);
  await js('GardenHome.open("room"); return 1;'); await sleep(1200);
  await js('document.querySelector(\'.kb-h-tab[data-tab="room"]\').click(); return 1;'); await sleep(500);
  if (!(await js('return GardenHome.trying && GardenHome.trying();'))) { await page.click('#kb-h-try'); }
  await waitFor('return document.getElementById("kb-h-tip").classList.contains("kb-h-trybar") && /Bản/.test(document.getElementById("kb-h-tip").textContent);');
  await sleep(500);
  const cell = async (x, y) => js(`const L = GardenHome._lib(), r = document.getElementById("kb-home-canvas").getBoundingClientRect(), S = r.width / 160;
    return [r.left + (${x} * L.T + 8) * S, r.top + ((${y} === 0 ? L.ROOM.WALL_Y : L.ROOM.FLOOR + (${y} - 1) * L.T) + 8) * S];`);
  async function tryPut(name, x, y) {
    const r = await js(`const c = Array.from(document.querySelectorAll("#kb-h-list .kb-h-card")).find((e) => (e.querySelector(".kb-h-name") || {}).textContent && e.querySelector(".kb-h-name").textContent.indexOf(${JSON.stringify(name)}) === 0);
      if (!c) return "không thấy thẻ"; const bt = c.querySelector(".kb-try-put"); if (!bt) return "không có nút Đặt thử"; if (bt.disabled) return "nút khoá"; bt.scrollIntoView({block: "center"}); bt.click(); return "ok";`);
    if (r !== 'ok') { return r; }
    await sleep(300);
    await js('window.scrollTo(0, 0); return 1;'); await sleep(200);
    const [cx, cy] = await cell(x, y);
    await mouseAt(cx, cy); await sleep(600);
    return 'ok';
  }
  console.log('  TV:', await tryPut('TV cổ', 7, 2));
  console.log('  bể cá:', await tryPut('Bể cá', 8, 1));
  console.log('  andon:', await tryPut('Đèn giấy andon', 2, 2));
  await js('window.scrollTo(0, 0); const c = Array.from(document.querySelectorAll("#kb-h-list .kb-h-card")).find((e) => /^TV cổ/.test(e.querySelector(".kb-h-name").textContent)); if (c) { c.id = "fb-try-card"; c.scrollIntoView({ block: "nearest" }); } window.scrollTo(0, 0); return 1;');
  await sleep(500);
  await mark([
    { sel: '#kb-h-try', n: 1, at: 'tl' },
    { sel: '#kb-home-canvas', n: 2, at: 'tl', pad: 2 },
    { sel: '#kb-h-tip', n: 3, at: 'l' },
    { sel: '#fb-try-card', n: 4, at: 'tl' },
  ]);
  await shot('16_trang_tri_thu', { title: 'Nhà → Trang trí thử: bày thử cả đồ chưa mua', items: [
    'Bấm "Trang trí thử" (bấm lại để về cảnh thật — vườn thật không đổi)',
    'Đồ chưa có hiện kèm khung "thử"; bấm món để dời / cất như bình thường',
    'Lưu sẵn 3 bản cho mỗi cảnh; "Dùng bản này" mua đủ món còn thiếu và bày đúng như bản thử',
    'Món nào cũng có nút "Đặt thử", kể cả khi chưa đủ xu',
  ] });
  await clearMarks();
  await js('if (GardenHome.trying && GardenHome.trying()) document.getElementById("kb-h-try").click(); return 1;'); await sleep(500);
}

// ---- 20. Giáng sinh (ảnh mời sự kiện tháng 12) --------------------------------------------------------------------------------
async function stepNoel() {
  await closeAll();
  await py(KB + `d = st.load(); d["coins"] = 200000; st.save(d)
try:
    st.unlock_theme("noel", "coins")
except Exception:
    pass
for iid, x, y in (("xmastree", 9, 0), ("presents", 11, 1), ("sleigh", 1, 1)):
    try:
        st.buy(iid); st.place("yard", iid, x, y)
    except Exception as e:
        pass
try:
    st.set_theme("pick", "noel")
except Exception:
    pass
d = st.load(); d["coins"] = 3420; st.save(d)
kb._dialog.refresh(); result = 1`);
  await sleep(2000);
  await size(1366, 860);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await sky(20, 'snow'); await sleep(2500);
  await js('window.scrollTo(0, 0); const h = document.getElementById("kb-today-hide"); if (h && h.offsetParent) h.click(); return 1;'); await sleep(800);
  const crop = await js('const b = document.getElementById("kb-yard-wrap").getBoundingClientRect(); return [0, 0, innerWidth, b.bottom + 10];');
  await shot('20_giang_sinh', { title: 'Đón chờ sự kiện Giáng sinh tháng 12', items: [], crop }, { wait: 1500 });
  await js('const h = document.getElementById("kb-today-hide"); if (h && h.offsetParent) h.click(); return 1;');
}

(async () => {
  page = await gardenPage();
  if (!page || want('setup')) { await setup(); }
  await ensureCss();
  if (want('anki')) { await stepAnki(); }
  if (want('fields')) { await stepFields(); }
  if (want('key')) { await stepKey(); }
  if (want('review')) { await stepReview(); }
  if (want('deck')) { await stepDeck(); }
  if (want('lang')) { await stepLang(); }
  if (want('paper')) { await stepPaper(); }
  if (want('games')) { await stepGames(); }
  if (want('try')) { await stepTry(); }
  if (want('noel')) { await stepNoel(); }
  console.log('lỗi JS:', page.errors);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
