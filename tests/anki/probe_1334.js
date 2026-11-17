// Dò lỗi bảng ôn trên bản hiện tại (1.33.3) trước khi làm 1.34 — không phải test chấm đạt / không đạt, chỉ in kết quả.
// Chạy: B=/tmp/kb_m134; ./setup_demo.sh $B ../../kotoba_batake && $ANKI_PY demo_1334.py $B/Test/collection.anki2
//       (./run_anki.sh $B 9333 $B.log &) ; node probe_1334.js OUT
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_probe_1334';
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
    const p = await Page.open(info.webSocketDebuggerUrl);
    const yes = await Promise.race([p.eval('typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
    if (yes) { return p; }
    p.close();
  }
  return null;
}
async function shot(name) { await sleep(400); await page.shot(path.join(OUT, name + '.png')); console.log('  ảnh', name); }
const deck = (name) => py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`).then(() => sleep(1500));
async function keyEv(key, code, vk, extra) {
  for (const type of ['keyDown', 'keyUp']) {
    await page.send('Input.dispatchKeyEvent', Object.assign({ type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: type === 'keyDown' && key.length === 1 ? key : undefined }, extra || {}));
  }
}
const state = () => js(`const ui = GardenUI; return { ratings: !document.getElementById("kb-ratings").hidden, show: !document.getElementById("kb-show").hidden,
  card: document.getElementById("kb-card").getBoundingClientRect().height, yard: (document.getElementById("kb-yard-wrap") || {}).offsetHeight || 0,
  yardTop: Math.round(((document.getElementById("kb-yard-wrap") || document.body).getBoundingClientRect()).top), vh: innerHeight,
  btn: document.getElementById("kb-rv-garden").textContent, cardCfg: ui.glob("card"), yardCfg: ui.get("yard", "review") };`);
const revs = () => py(KB + 'result = mw.col.db.scalar("select count() from revlog")');
async function clickIn(frameSel) {      // bấm chuột thật vào phần tử bên trong iframe thẻ
  const box = await js(`const f = document.getElementById("kb-card"), r = f.getBoundingClientRect(), e = f.contentDocument.querySelector(${JSON.stringify(frameSel)});
    if (!e) return null; const b = e.getBoundingClientRect(); return [r.x + b.x + b.width / 2, r.y + b.y + b.height / 2];`);
  if (!box) { return false; }
  for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x: box[0], y: box[1], button: 'left', clickCount: 1 }); }
  return true;
}

(async () => {
  page = await gardenPage();
  if (!page) {
    await py(KB + 'kb.save_config(show_tooltips=False, sound=False, music=False)\nkb.open_garden(); result = 1');
    await sleep(3000);
    page = await gardenPage();
  }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); return 1;');
  const R = {};

  // 1. Ẩn vườn → Hiện vườn
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await page.click('#kb-review'); await sleep(1500);
  R.an0 = await state(); await shot('p01_dang_on');
  await page.click('#kb-rv-garden'); await sleep(900);
  R.an1 = await state(); await shot('p02_an_vuon');
  await page.click('#kb-rv-garden'); await sleep(900);
  R.an2 = await state(); await shot('p03_hien_vuon_lai');

  // 2. phím 1–4 / Space khi bấm vào ô của thẻ (thẻ trắc nghiệm có nút; thẻ có ô chọn)
  await page.click('#kb-stop'); await sleep(600);
  await deck('Tiếng Nhật::Trắc nghiệm');
  await page.click('#kb-review'); await sleep(1500);
  const r0 = await revs();
  R.mc0 = await state();
  R.mcClick = await clickIn('.mc-opt');
  await sleep(1500);
  R.mc1 = await state();        // mẫu thẻ gọi pycmd('ans') → bản hiện tại có lật không?
  await shot('p04_trac_nghiem_sau_khi_bam');
  await keyEv(' ', 'Space', 32); await sleep(900);
  R.mc2 = await state();
  await keyEv('3', 'Digit3', 51); await sleep(1500);
  R.mcRev = (await revs()) - r0;
  // giữ phím Space (lặp phím): lật rồi chấm luôn?
  const r1 = await revs();
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, text: ' ' });
  for (let i = 0; i < 6; i++) { await sleep(60); await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32, autoRepeat: true, text: ' ' }); }
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await sleep(1500);
  R.holdSpaceRev = (await revs()) - r1;
  // bàn phím số (NumLock tắt → End / ArrowDown…)
  R.st3 = await state();
  if (!R.st3.ratings) { await keyEv(' ', 'Space', 32); await sleep(900); }
  const r2 = await revs();
  await keyEv('End', 'Numpad1', 35); await sleep(1200);
  R.numpadOffRev = (await revs()) - r2;
  // bộ gõ (IME) đang bật: Chromium gửi key "Process" / keyCode 229
  R.st4 = await state();
  const r3 = await revs();
  if (!R.st4.ratings) { await keyEv('Process', 'Space', 229); await sleep(900); R.imeFlip = (await state()).ratings; }
  // phím R khi đang ôn (Anki: phát lại âm thanh)
  await page.click('#kb-stop'); await sleep(600);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await page.click('#kb-review'); await sleep(1500);
  await py(KB + 'import sys\nz = sys.modules.get("zz_kbtest")\nresult = 1');
  const before = await py(KB + 'z = sys.modules.get("zz_kbtest"); result = len([e for e in z.LOG if e["tag"] != "STOP"]) if z else -1');
  await keyEv('r', 'KeyR', 82); await sleep(800);
  const after = await py(KB + 'z = sys.modules.get("zz_kbtest"); result = len([e for e in z.LOG if e["tag"] != "STOP"]) if z else -1');
  R.replayR = { before, after };
  // e. thẻ có ô chọn (radio): bấm vào ô rồi nhấn Space
  await page.click('#kb-stop'); await sleep(600);
  await py(KB + `mm = mw.col.models
m = mm.by_name("Thử radio")
if not m:
    m = mm.new("Thử radio"); mm.add_field(m, mm.new_field("Q")); t = mm.new_template("T1")
    t["qfmt"] = '{{Q}}<br><label><input type="radio" name="r" id="r1"> A</label> <label><input type="radio" name="r" id="r2"> B</label>'
    t["afmt"] = "{{FrontSide}}<hr id=answer>đáp án"; mm.add_template(m, t); mm.add(m); m = mm.by_name("Thử radio")
    did = mw.col.decks.id("Thử::Radio")
    for q in ("câu 1", "câu 2"):
        n = mw.col.new_note(m); n["Q"] = q; mw.col.add_note(n, did)
result = 1`);
  await deck('Thử::Radio');
  await page.click('#kb-review'); await sleep(1500);
  await clickIn('#r1'); await sleep(400);
  await keyEv(' ', 'Space', 32); await sleep(1000);
  R.radioSpaceFlip = (await state()).ratings;
  // 3. thẻ dài: cuộn bằng phím khi focus không ở trong thẻ
  await page.click('#kb-stop'); await sleep(600);
  await deck('Ôn thi::JLPT N4::Đọc hiểu');
  await page.click('#kb-review'); await sleep(1500);
  R.long = await js(`const d = document.getElementById("kb-card").contentDocument; return { sh: d.documentElement.scrollHeight, ch: innerHeight, frame: document.getElementById("kb-card").clientHeight };`);
  await shot('p05_the_dai');
  await page.click('#kb-stop'); await sleep(600);
  fs.writeFileSync(path.join(OUT, 'probe.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R, null, 1));
  console.log('lỗi JS:', page.errors);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
