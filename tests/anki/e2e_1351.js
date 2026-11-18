// 1.35.1 trong Anki thật — kiểm tra lại 1.35 (ngoài kịch bản có sẵn):
//   1. Ngôn ngữ trong vườn Đức / Pháp / Trung / Hàn: chữ dài ở ô Hộp sưu tầm, Sổ sinh hoạt, Album khách, thẻ trò chơi, tiêu
//      đề bảng — không tràn khỏi ô / bảng, không bị cắt ở giữa một từ (đo bằng độ rộng thật của từng từ trong font của ô),
//      trang không cuộn ngang; ảnh chụp mỗi ngôn ngữ
//   2. Trang trí thử lúc Anki đang đồng bộ (giả _sync_hold): dời / đặt thử vẫn lưu xuống file (đóng vườn mở lại còn), "Dùng
//      bản này" bị chặn + câu báo; đồng bộ xong dùng được
//   3. file bản thử không ghi được (thư mục thay cho file): không vòng lặp đọc lại / báo lỗi liên tục
//   4. "Như cảnh thật" hỏi trước; Huỷ giữ bản thử
//   5. không lỗi JS, nhật ký lỗi add-on không có lỗi mới
// Chạy: KB_SCRIPTS=e2e_1351.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1351';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined" && typeof GardenLang !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(120); }
  return false;
}
const KB = 'import sys, os, time, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nd = kb._dialog\nfrom aqt import mw\n';
async function shot(name) { await sleep(250); await page.shot(path.join(SHOTS, name + '.png')); }
async function mouseAt(x, y) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); }
}
async function key(k, code, vk) {
  for (const type of ['keyDown', 'keyUp']) { await page.send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk }); }
}
const setLang = (v) => js(`const s = document.getElementById("kb-glang"); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event("change")); return s.value;`);

// Đo chữ trong các ô: từ nào rộng hơn ô (sẽ bị bẻ giữa từ), phần tử nào tràn khỏi ô chứa nó, trang có cuộn ngang không
const MEASURE = (sel, box) => `
  const out = { n: 0, broken: [], spill: [], hscroll: document.documentElement.scrollWidth > innerWidth + 1 };
  const cv = document.createElement("canvas").getContext("2d");
  document.querySelectorAll(${JSON.stringify(sel)}).forEach((e) => {
    if (!e.getClientRects().length || !e.textContent.trim()) { return; }
    out.n++;
    const cs = getComputedStyle(e);
    cv.font = cs.fontWeight + " " + cs.fontSize + " " + cs.fontFamily;
    const w = e.clientWidth || e.getBoundingClientRect().width;
    e.textContent.split(/[\\s\\u00a0]+/).forEach((word) => {
      if (word && cv.measureText(word).width > w + 1) { out.broken.push(word + " (" + Math.round(cv.measureText(word).width) + " > " + Math.round(w) + "px)"); }
    });
    const c = e.closest(${JSON.stringify(box)});
    if (c) {
      const a = e.getBoundingClientRect(), b = c.getBoundingClientRect();
      if (a.right > b.right + 1 || a.left < b.left - 1) { out.spill.push(e.textContent.trim().slice(0, 30)); }
    }
  });
  return out;`;

(async () => {
  await py(KB + `col = mw.col
def model(name, fields):
    mm = col.models
    m = mm.new(name)
    for f in fields:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = "{{%s}}" % fields[0]; t["afmt"] = "{{FrontSide}}<hr id=answer>{{%s}}" % fields[1]
    mm.add_template(m, t); mm.add(m); return mm.by_name(name)
de = model("Deutsch Wortschatz", ["Wort", "Bedeutung"])
dd = col.decks.id("ZZ::Đức")
for w, m in [("der Hund, -(e)s, -e", "con chó"), ("die Katze, -n", "con mèo"), ("gehen", "đi"), ("das Haus, ¨-er", "ngôi nhà"),
             ("der Schmetterling, -e", "con bướm")]:
    n = col.new_note(de); n["Wort"], n["Bedeutung"] = w, m; col.add_note(n, dd)
fr = model("Vocabulaire français", ["Mot", "Sens"])
df = col.decks.id("ZZ::Pháp")
for w, m in [("le chien", "con chó"), ("le chat", "con mèo"), ("aller", "đi"), ("la maison", "ngôi nhà"), ("l'œil (m)", "mắt")]:
    n = col.new_note(fr); n["Mot"], n["Sens"] = w, m; col.add_note(n, df)
dat = st.load(); dat["coins"] = 300000; st.save(dat)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
try:
    st.open_rooms()
except Exception:
    pass
for z in kb.core.ZONE_IDS:
    try:
        st.unlock_zone(z)
    except Exception:
        pass
lc = kb.life_core
t0 = datetime.date.today()
for i, aid in enumerate(lc.ACTS):
    w = lc.ACTS[aid]["where"]
    kb.LIFE.mark(aid, "room" if w == "home" else ("yard" if w in ("yard", "out") else w), t0 - datetime.timedelta(days=1 + i % 20))
kb.ASK_TEST_OFF = False
kb.save_config(show_tooltips=False, sound=False, music=False)
kb.open_garden(); result = 1`);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(800);
  page.errors.length = 0;
  const err0 = await py(KB + 'result = len(kb.ERRORS.entries())');

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 1. Chữ dài của Ngôn ngữ trong vườn không tràn / không bị bẻ giữa từ');
  for (const lang of ['de', 'fr', 'zh', 'ko']) {
    await setLang(lang); await sleep(400);
    await js('GardenHome.openLife(); return 1;'); await sleep(900);
    let m = await js(MEASURE('.kb-life-cell .kb-box-ja, .kb-life-cell .kb-life-name', '.kb-life-cell'));
    await shot('1351_so_sinh_hoat_' + lang);
    ok(m.n >= 20 && !m.spill.length && !m.hscroll, lang + ' · Sổ sinh hoạt: ' + m.n + ' ô, không tràn khỏi ô, trang không cuộn ngang' +
      (m.spill.length ? ' — tràn: ' + m.spill.slice(0, 3).join(' · ') : ''));
    ok(!m.broken.length, lang + ' · Sổ sinh hoạt: không từ nào rộng hơn ô (không bẻ giữa từ)' + (m.broken.length ? ' — ' + m.broken.slice(0, 4).join(' · ') : ''));
    await js('GardenHome.openBox(); return 1;'); await sleep(900);
    m = await js(MEASURE('.kb-box-cell .kb-box-ja', '.kb-box-cell'));
    await shot('1351_hop_suu_tam_' + lang);
    ok(m.n >= 20 && !m.spill.length && !m.hscroll, lang + ' · Hộp sưu tầm: ' + m.n + ' ô, không tràn' + (m.spill.length ? ' — tràn: ' + m.spill.slice(0, 3).join(' · ') : ''));
    ok(!m.broken.length, lang + ' · Hộp sưu tầm: không từ nào rộng hơn ô' + (m.broken.length ? ' — ' + m.broken.slice(0, 4).join(' · ') : ''));
    await js('GardenHome.openGuests(); return 1;'); await sleep(900);
    m = await js(MEASURE('#kb-h-list .kb-box-ja, #kb-h-list .kb-h-name', '.kb-box-cell, .kb-h-card'));
    ok(!m.spill.length && !m.hscroll, lang + ' · Album khách: không tràn' + (m.spill.length ? ' — ' + m.spill.slice(0, 3).join(' · ') : ''));
    await js('GardenHome.close(); return 1;'); await sleep(300);
    // tên trò chơi theo ngôn ngữ của deck đang chơi → chọn deck Đức / Pháp (Trung / Hàn: deck mặc định)
    const dk = lang === 'de' ? 'ZZ::Đức' : lang === 'fr' ? 'ZZ::Pháp' : 'Default';
    await py(KB + `d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(dk)}); d.refresh(); result = 1`); await sleep(900);
    await js('if (typeof GardenGames !== "undefined") { GardenGames.open(); } return 1;'); await sleep(900);
    m = await js(MEASURE('.kb-gcard-jp', '.kb-gcard'));
    await shot('1351_tro_choi_' + lang);
    ok(!m.spill.length && !m.broken.length, lang + ' · tên trò chơi trên thẻ: không tràn / không bẻ giữa từ' +
      (m.spill.length || m.broken.length ? ' — ' + m.spill.concat(m.broken).slice(0, 3).join(' · ') : ''));
    await js('if (typeof GardenGames !== "undefined" && GardenGames.close) { GardenGames.close(); } return 1;'); await sleep(400);
  }
  await setLang('auto'); await sleep(300);

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 2. Trang trí thử lúc Anki đang đồng bộ');
  await py(KB + `for iid, x, y in [("painting", 1, 0), ("shelf", 0, 1)]:
    try:
        st.buy(iid); st.place("room", iid, x, y)
    except Exception:
        pass
d.refresh(); result = 1`); await sleep(1200);
  await js('GardenHome.open("room"); return 1;'); await sleep(1000);
  await js('document.querySelector(\'.kb-h-tab[data-tab="room"]\').click(); return 1;'); await sleep(400);
  await page.click('#kb-h-try');
  await waitFor('return document.getElementById("kb-h-tip").classList.contains("kb-h-trybar") && /Bản/.test(document.getElementById("kb-h-tip").textContent);');
  await sleep(600);
  const drafts = () => py(KB + 'result = st.draft_load()');
  const cell = async (x, y) => js(`const L = GardenHome._lib(), r = document.getElementById("kb-home-canvas").getBoundingClientRect(), S = r.width / 160;
    return [r.left + (${x} * L.T + 8) * S, r.top + ((${y} === 0 ? L.ROOM.WALL_Y : L.ROOM.FLOOR + (${y} - 1) * L.T) + 8) * S];`);
  async function tryPut(name, x, y) {
    const r = await js(`const c = Array.from(document.querySelectorAll("#kb-h-list .kb-h-card")).find((e) => (e.querySelector(".kb-h-name") || {}).textContent && e.querySelector(".kb-h-name").textContent.indexOf(${JSON.stringify(name)}) === 0);
      if (!c) return "không thấy thẻ"; const bt = c.querySelector(".kb-try-put"); if (!bt) return "không có nút Đặt thử"; if (bt.disabled) return "nút khoá"; bt.scrollIntoView({block: "center"}); bt.click(); return "ok";`);
    if (r !== 'ok') { return r; }
    await sleep(250);
    const [cx, cy] = await cell(x, y);
    await mouseAt(cx, cy); await sleep(600);
    return 'ok';
  }
  // giả "Anki đang đồng bộ" (thanh tiến độ đồng bộ còn đó)
  await py(KB + 'kb._kb1351_hold = kb._sync_hold\nkb._sync_hold = lambda: True\nresult = 1');
  const r1 = await tryPut('TV cổ', 6, 3);
  await sleep(800);
  let dr = await drafts();
  const items = (dr.scenes.room && dr.scenes.room.slots[dr.scenes.room.cur || 0] || { items: [] }).items.map((e) => e.id);
  ok(r1 === 'ok' && items.indexOf('tv') >= 0, 'đang đồng bộ: Đặt thử "TV cổ" vẫn lưu xuống file bản thử (' + items.join(', ') + ')');
  const toast = await js('const t = document.getElementById("kb-toast") || document.querySelector(".kb-toast"); return t ? t.textContent : "";');
  ok(!/đang đồng bộ/.test(toast), 'đặt thử lúc đồng bộ: không báo "Anki đang đồng bộ" (đã lưu)');
  await js(`window.__kbToasts = []; const t = document.getElementById("kb-toast");
    if (t) { new MutationObserver(() => { if (!t.hidden) { window.__kbToasts.push(t.textContent); } }).observe(t, { childList: true, subtree: true, characterData: true, attributes: true }); }
    return 1;`);
  await page.click('#kb-h-tip .kb-try-use').catch(() => {}); await sleep(700);
  await js('const y = document.querySelector(".kb-ask-yes"); if (y && !document.getElementById("kb-ask").hidden) { y.click(); } return 1;'); await sleep(900);
  const coinsA = await py(KB + 'result = st.load()["coins"]');
  const roomA = await py(KB + 'result = [e["id"] for e in st.load()["home"]["room"]]');
  const toast2 = await js('return (window.__kbToasts || []).join(" | ") + " " + ((document.getElementById("kb-toast") || {}).textContent || "");');
  ok(roomA.indexOf('tv') < 0 && /đang đồng bộ/.test(toast2), '"Dùng bản này" lúc đồng bộ: bị chặn (vườn thật không đổi) + câu báo đồng bộ' +
    ' (phòng: ' + roomA.join(', ') + (/đang đồng bộ/.test(toast2) ? '' : ' · không thấy câu báo') + ')');
  await py(KB + 'kb._sync_hold = kb._kb1351_hold\nresult = 1');
  // đóng vườn mở lại: bản thử còn
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(1500);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('GardenHome.open("room"); return 1;'); await sleep(1000);
  await js('document.querySelector(\'.kb-h-tab[data-tab="room"]\').click(); return 1;'); await sleep(400);
  await page.click('#kb-h-try');
  await waitFor('return /món chưa có/.test(document.getElementById("kb-h-tip").textContent);', 6000);
  const msg = await js('return (document.querySelector("#kb-h-tip .kb-try-msg") || {}).textContent || "";');
  ok(/1 món chưa có/.test(msg), 'đóng vườn mở lại: bản thử sửa lúc đồng bộ vẫn còn (' + msg + ')');
  await page.click('#kb-h-tip .kb-try-use'); await sleep(700);
  await js('document.querySelector(".kb-ask-yes").click(); return 1;'); await sleep(1500);
  const roomB = await py(KB + 'result = [e["id"] for e in st.load()["home"]["room"]]');
  const coinsB = await py(KB + 'result = st.load()["coins"]');
  ok(roomB.indexOf('tv') >= 0 && coinsA - coinsB === 220, 'đồng bộ xong: "Dùng bản này" mua + bày TV (−220 xu)');

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 3. "Như cảnh thật" hỏi trước');
  await page.click('#kb-h-try').catch(() => {}); await sleep(500);
  if (!(await js('return GardenHome.trying();'))) { await page.click('#kb-h-try'); await sleep(700); }
  ok((await tryPut('Bể cá', 8, 1)) === 'ok', 'đặt thử thêm "Bể cá"');
  await js('document.querySelector("#kb-h-tip .kb-try-reset").click(); return 1;'); await sleep(600);
  ok(await js('const a = document.getElementById("kb-ask"); return !!a && !a.hidden;'), '"Như cảnh thật": hỏi trước');
  await js('document.querySelector(".kb-ask-no").click(); return 1;'); await sleep(500);
  dr = await drafts();
  const it2 = dr.scenes.room.slots[dr.scenes.room.cur].items.map((e) => e.id);
  ok(it2.indexOf('aquarium') >= 0, 'Huỷ: bản thử còn món vừa đặt (' + it2.join(', ') + ')');

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 4. file bản thử không ghi được: không vòng lặp');
  const target = await py(KB + 'result = kb.core.backup.profile_path(st._draft_path(), mw.col)');
  await py(KB + `p = ${JSON.stringify(target)}
os.replace(p, p + ".e2e")
os.makedirs(p)
result = 1`);
  // đếm lệnh bản thử Python nhận được (bọc GardenDialog._on_draft)
  await py(KB + `kb._kb_cnt = [0]
_orig = kb.GardenDialog._on_draft
def _cnt(self, cmd, _o=_orig):
    kb._kb_cnt[0] += 1
    return _o(self, cmd)
kb._kb_orig_draft = _orig
kb.GardenDialog._on_draft = _cnt
result = 1`);
  // bấm "Bản 3" (ô trống → chép cảnh thật → lưu → lỗi → đọc lại → ô vẫn trống → chép → lưu → lỗi …)
  const putR = await js('const b = document.querySelectorAll("#kb-h-tip .kb-try-slot")[2]; if (!b) return "không có nút Bản 3"; b.click(); return "ok";');
  await sleep(6000);
  const sent = await py(KB + 'result = kb._kb_cnt[0]');
  await py(KB + 'kb.GardenDialog._on_draft = kb._kb_orig_draft\nresult = 1');
  ok(putR === 'ok' && sent >= 1 && sent <= 4, 'lưu bản thử lỗi (file thành thư mục): ' + sent + ' lệnh bản thử trong 6 giây (không lặp đọc lại → chép → lưu → lỗi)' +
    (putR === 'ok' ? '' : ' — đặt thử: ' + putR));
  await py(KB + `p = ${JSON.stringify(target)}
os.rmdir(p)
os.replace(p + ".e2e", p)
result = 1`);

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 5. Không lỗi');
  const jsErr = page.errors.filter((e) => !/ResizeObserver/.test(e));
  ok(!jsErr.length, 'không lỗi JS' + (jsErr.length ? ' — ' + jsErr.slice(0, 2).join(' | ') : ''));
  const logErr = await py(KB + `result = [e["where"] + ": " + e["msg"] for e in kb.ERRORS.entries()[${err0}:]]`);
  ok(!logErr.length, 'nhật ký lỗi add-on không có lỗi mới' + (logErr.length ? ' — ' + logErr.slice(0, 2).join(' | ') : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total + (pass === total ? ' — TẤT CẢ OK' : ''));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI KỊCH BẢN', e); process.exit(3); });
