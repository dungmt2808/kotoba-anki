// 1.32.2 trong Anki thật (run_ui.sh ADDON SHOTS, KB_SCRIPTS=e2e_1322.js):
//  1. pinyin trên từng chữ: bấm cây tiếng Trung → <ruby> mỗi chữ một âm tiết, dòng pinyin dưới chữ ẩn; ô gợi ý khi rê chuột
//     cũng vậy; deck ghi số (ni3 hao3) → dấu thanh; ngoặc kiểu Anki 中[zhong1]国[guo2]; chia được nhiều kiểu → dòng dưới như
//     1.32.1; deck tiếng Nhật / tiếng Anh không có ruby kiểu mới; chữ của deck không chạy thành mã (textContent).
//  [2. nút ✎ Sửa / phím E — thêm sau khi người dùng duyệt ảnh phác]
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1322';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
let page, total = 0, pass = 0;
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) { return p; }
      p.close();
    }
    await sleep(500);
  }
  return null;
}
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
async function deck(name) {
  await py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`);
  await sleep(1800);
}
async function plantPos(word) {
  return js(`const d = Garden._data(), L = Garden._layout(), cv = document.getElementById("kb-canvas").getBoundingClientRect();
    const i = d.plants.findIndex((p) => p.word === ${JSON.stringify(word)}); if (i < 0) return null;
    const cw = 18 * L.scale, ch = 20 * L.scale; return [cv.left + (i % L.cols) * cw + cw / 2, cv.top + Math.floor(i / L.cols) * ch + ch * 0.6];`);
}
async function hover(word) {
  const pos = await plantPos(word);
  if (!pos) { return null; }
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: pos[0], y: pos[1] });
  await sleep(400);
  return js(`const w = document.getElementById("kb-tip-word"); const r = w.querySelector("ruby");
    return { text: w.textContent, base: r ? Array.from(r.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent) : null,
             rt: r ? Array.from(r.querySelectorAll("rt")).map((x) => x.textContent) : null, lang: w.getAttribute("lang") };`);
}
async function pin(word) {
  const pos = await plantPos(word);
  if (!pos) { return null; }
  for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x: pos[0], y: pos[1], button: 'left', clickCount: 1 }); }
  await sleep(500);
  const r = await js(`const w = document.getElementById("kb-pin-word"), rd = document.getElementById("kb-pin-reading"), r = w.querySelector("ruby");
    return { text: w.textContent, base: r ? Array.from(r.childNodes).filter((n) => n.nodeType === 3).map((n) => n.textContent) : null,
             rt: r ? Array.from(r.querySelectorAll("rt")).map((x) => x.textContent) : null, reading: rd.textContent,
             readingShown: !rd.hidden && rd.offsetHeight > 0, lang: w.getAttribute("lang"), html: w.innerHTML,
             visible: !document.getElementById("kb-pin").hidden };`);
  return r;
}
const closePin = () => js(`const x = document.getElementById("kb-pin-x"); if (x) x.click(); return 1;`);
const NFC = (s) => s.normalize('NFC');
// âm tiết có dấu dựng bằng dấu kết hợp (không gõ sẵn chữ có dấu)
const T = { 1: '̄', 2: '́', 3: '̌', 4: '̀' };
const M = (base, i, t) => NFC(base.slice(0, i + 1) + T[t] + base.slice(i + 1));

(async () => {
  await py(KB + `col = mw.col
mm = col.models
m = mm.new("Chinese 1322")
for f in ("Hanzi", "Pinyin", "Nghĩa"):
    mm.add_field(m, mm.new_field(f))
t = mm.new_template("T1"); t["qfmt"] = "{{Hanzi}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Nghĩa}}"
mm.add_template(m, t); mm.add(m); zh = mm.by_name("Chinese 1322")
dz = col.decks.id("ZH1322")
rows = [("你好", "ni3 hao3", "xin chào"), ("学生", "xue2sheng", "học sinh"), ("中[zhong1]国[guo2]", "", "Trung Quốc"),
        ("方案", "fangan", "phương án"), ("一点儿", "yi4dian3r", "một chút"), ("<img src=x onerror=alert(1)>猫", "mao1", "mèo")]
for w, p, mn in rows:
    n = col.new_note(zh); n["Hanzi"], n["Pinyin"], n["Nghĩa"] = w, p, mn; col.add_note(n, dz)
today = col.sched.today
for i, cid in enumerate(col.find_cards('deck:"ZH1322"')):
    col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3 where id=?", 5 + i, today + 3, cid)
kb.save_config(show_tooltips=False, sound=False, music=False)
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await sleep(600);

  console.log('== 1. pinyin trên từng chữ');
  await deck('ZH1322');
  let r = await pin('你好');
  ok(r && r.visible && JSON.stringify(r.base) === JSON.stringify(['你', '好']) && JSON.stringify(r.rt) === JSON.stringify([M('ni', 1, 3), M('hao', 1, 3)]),
    'bấm cây 你好 (deck ghi ni3 hao3): mỗi chữ một âm tiết, có dấu thanh');
  ok(r && !r.readingShown && r.lang === 'zh', 'dòng pinyin dưới chữ ẩn khi đã có pinyin trên chữ; chữ mang lang="zh"');
  await page.shot(SHOTS + '/1322_pin_ni_hao.png');
  await closePin();
  r = await pin('学生');
  ok(r && JSON.stringify(r.rt) === JSON.stringify([M('xue', 2, 2), 'sheng']), 'xue2sheng → âm thứ hai thanh nhẹ, không dấu');
  await closePin();
  r = await pin('中国');
  ok(r && JSON.stringify(r.base) === JSON.stringify(['中', '国']) && JSON.stringify(r.rt) === JSON.stringify([M('zhong', 2, 1), M('guo', 2, 2)]),
    'trường Từ 中[zhong1]国[guo2] → chữ 中国, pinyin trên từng chữ');
  await closePin();
  r = await pin('方案');
  ok(r && r.rt === null && r.readingShown && r.reading === 'fangan', 'fangan (chia được 2 kiểu) → không đoán, dòng pinyin dưới chữ như 1.32.1');
  await closePin();
  r = await pin('一点儿');
  ok(r && JSON.stringify(r.rt) === JSON.stringify([M('yi', 1, 4), M('dian', 2, 3), 'r']), '一点儿 (yi4dian3r) → 儿 nhận r');
  await closePin();
  const tip = await hover('你好');
  ok(tip && JSON.stringify(tip.rt) === JSON.stringify([M('ni', 1, 3), M('hao', 1, 3)]) && tip.lang === 'zh', 'ô gợi ý khi rê chuột: pinyin trên từng chữ');
  const evil = await js(`const d = Garden._data(); const p = d.plants.find((x) => /猫/.test(x.word)); return p ? p.word : null;`);
  if (evil) {
    r = await pin(evil);
    ok(r && !/<img/i.test(r.html), 'chữ lạ trong trường Từ không thành thẻ HTML (textContent)');
  } else {
    ok(true, 'trường Từ có HTML: Anki / plain_text đã bỏ thẻ (không có cây mang chữ HTML)');
  }
  await closePin();
  await deck('A::Có câu ví dụ + audio');
  const ja = await js(`const d = Garden._data(); return d.plants.slice(0, 40).every((p) => !p.ruby);`);
  ok(ja, 'deck tiếng Nhật: không cây nào có ruby kiểu mới');
  const errs = await py(KB + 'result = [e for e in kb.ERRORS.items() if "1322" in str(e) or "ruby" in str(e)] if hasattr(kb.ERRORS, "items") else []');
  ok(!errs || !errs.length, 'nhật ký lỗi không có lỗi mới');

  console.log('\nKẾT QUẢ: ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });

