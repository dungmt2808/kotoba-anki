// 1.34 trong Anki thật — góp ý sau phát hành (17/11), người dùng duyệt ảnh phác docs/ke_hoach_1_34/ ("xong nhớ test kỹ nha").
// Chuột / phím thật qua CDP (Input.dispatch*), lệnh phát âm thanh ghi ở zz_kbtest (LOG).
//   1. số phím 1–4 trên nút chấm
//   2. Nghe lại: nút chỉ hiện khi mặt đang xem có âm thanh; R / F5 / bấm nút → phát đúng âm thanh của mặt đó; mặt sau theo
//      tuỳ chọn deck "Skip question when replaying answer"; thẻ không âm thanh: nút ẩn, R không phát gì
//   3. thẻ trắc nghiệm gọi pycmd("ans") khi bấm đáp án → lật (chuột thật); pycmd("ease3") ở mặt trước bị bỏ, ("ease4") ở mặt
//      sau chấm Dễ; mẫu thẻ đếm giờ rồi tự lật: chấm trước khi hết giờ → thẻ sau KHÔNG bị lật nhầm
//   4. giữ phím Space / 3 (phím lặp) → một lần; radio trong thẻ không chặn Space / 1–4; ô chữ trong thẻ vẫn chặn;
//      bàn phím số NumLock tắt (End = 1)
//   5. Phóng to (F / nút / Esc): ẩn thanh trên + vườn, thẻ cao hơn, lưu config ui.zoom, Esc lần 1 thu nhỏ lần 2 dừng; nhớ lần sau;
//      cửa sổ 1024 × 640 không tràn; màn chính không bị ảnh hưởng
//   6. Ẩn / Hiện vườn (1600 × 1000): về đúng cỡ; cấu hình bản cũ lỡ lưu ("tall" + ẩn) → Hiện vườn về Vừa
//   7. thẻ dài: ↓ / PageDown cuộn khung thẻ
//   8. cây deck: nút gọn, mở bằng chuột / phím /, mở sẵn nhánh deck đang xem, số thẻ = Python, ← → thu / mở (nhớ theo máy),
//      gõ lọc, Enter đổi deck, Esc / bấm ra ngoài đóng
//   9. Trang trí thử: bật / tắt, đặt thử món chưa có (vườn thật không đổi), 3 bản (bản trống chép cảnh thật), Như cảnh thật,
//      tường & sàn, Thiếu xu, Dùng bản này (hỏi một lần, bấm đúp chỉ trừ một lần, mua + bày đúng), chụp ảnh khi thử = cảnh thật,
//      Esc lần 1 thoát thử, đóng Nhà giữ bản thử
//  10. không lỗi JS, nhật ký lỗi add-on không có lỗi mới
// Chạy: KB_SCRIPTS=e2e_134.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_134';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nd = kb._dialog\nfrom aqt import mw\n';
const revs = () => py('from aqt import mw\nresult = mw.col.db.scalar("select count() from revlog")');
const lastEase = () => py('from aqt import mw\nresult = mw.col.db.scalar("select ease from revlog order by id desc limit 1")');
const plays = () => py('result = [x["tag"] for x in LOG if x["tag"] != "STOP"]');
const clearLog = () => py('LOG.clear()\nresult = 1');
async function shot(name) { await sleep(250); await page.shot(path.join(SHOTS, name + '.png')); }
async function key(k, code, vk, extra) {
  for (const type of ['keyDown', 'keyUp']) {
    await page.send('Input.dispatchKeyEvent', Object.assign({ type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk,
      text: type === 'keyDown' && k.length === 1 ? k : undefined }, extra || {}));
  }
}
async function hold(k, code, vk, n) {        // giữ phím: keyDown + n lần phím lặp + keyUp
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text: k.length === 1 ? k : undefined });
  for (let i = 0; i < n; i++) { await sleep(50); await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, autoRepeat: true, text: k.length === 1 ? k : undefined }); }
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk });
}
async function mouseAt(x, y) {
  await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
  for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); }
}
async function clickIn(sel, i) {       // bấm chuột thật vào phần tử trong khung thẻ
  const b = await js(`const f = document.getElementById("kb-card"), r = f.getBoundingClientRect(), e = f.contentDocument.querySelectorAll(${JSON.stringify(sel)})[${i || 0}];
    if (!e) return null; const q = e.getBoundingClientRect(); return [r.x + q.x + q.width / 2, r.y + q.y + q.height / 2];`);
  if (!b) { return false; }
  await mouseAt(b[0], b[1]);
  return true;
}
const panel = () => js(`const g = (id) => document.getElementById(id);
  return { open: !g("kb-panel").hidden, front: !g("kb-show").hidden && g("kb-ratings").hidden, back: !g("kb-ratings").hidden,
    done: !g("kb-done").hidden, replay: !g("kb-rv-replay").hidden, card: g("kb-card").clientHeight, bar: getComputedStyle(document.querySelector(".kb-bar")).display };`);
const deck = (name) => py(KB + `d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`).then(() => sleep(900));
async function review(name) {
  await js('if (!document.getElementById("kb-panel").hidden) document.getElementById("kb-stop").click(); return 1;');
  await sleep(300);
  await deck(name);
  await page.click('#kb-review');
  await waitFor('return !document.getElementById("kb-panel").hidden && (!document.getElementById("kb-show").hidden || !document.getElementById("kb-done").hidden);');
  await sleep(500);
}
const stop = async () => { await js('if (!document.getElementById("kb-panel").hidden) document.getElementById("kb-stop").click(); return 1;'); await sleep(400); };

const SETUP = KB + `mm = mw.col.models
def model(name, fields, q, a, css=".card{font-family:sans-serif;font-size:24px;text-align:center}"):
    m = mm.by_name(name)
    if m:
        return m
    m = mm.new(name)
    for f in fields:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = q; t["afmt"] = a
    mm.add_template(m, t); m["css"] = css; mm.add(m)
    return mm.by_name(name)
def add(m, deck, rows):
    did = mw.col.decks.id(deck)
    for r in rows:
        n = mw.col.new_note(m)
        for k, v in r.items():
            n[k] = v
        mw.col.add_note(n, did)
snd = model("T134 âm thanh", ["Q", "A"], "{{Q}}[sound:q134.mp3]", "{{FrontSide}}<hr id=answer>{{A}}[sound:a134.mp3]")
add(snd, "T134::Âm thanh", [{"Q": "猫", "A": "mèo"}, {"Q": "犬", "A": "chó"}])
basic = mm.by_name("Basic")
add(basic, "T134::Im lặng", [{"Front": "山", "Back": "núi"}, {"Front": "川", "Back": "sông"}])
mc = model("T134 trắc nghiệm", ["Q", "A", "B"],
  '<div>{{Q}}</div><button class="opt" onclick="this.style.background=\\'#ffe9a8\\';setTimeout(function(){pycmd(\\'ans\\')},300)">{{A}}</button> <button class="opt">{{B}}</button>',
  '{{FrontSide}}<hr id=answer><div id="sau">Đáp án: {{A}}</div>')
add(mc, "T134::Trắc nghiệm", [{"Q": "学生?", "A": "がくせい", "B": "がくしょう"}, {"Q": "雨?", "A": "あめ", "B": "ゆき"}])
ae = model("T134 tự chấm", ["Q"], '{{Q}}<button id="e3" onclick="pycmd(\\'ease3\\')">ease3</button>',
  '{{FrontSide}}<hr id=answer><button id="e4" onclick="pycmd(\\'ease4\\')">ease4</button>')
add(ae, "T134::Tự chấm", [{"Q": "一"}, {"Q": "二"}])
tm = model("T134 đếm giờ", ["Q", "Timer"], '{{Q}}{{#Timer}}<script>setTimeout(function(){pycmd("ans")},2500)</script>{{/Timer}}', '{{FrontSide}}<hr id=answer>sau')
add(tm, "T134::Đếm giờ", [{"Q": "có hẹn giờ", "Timer": "1"}, {"Q": "không hẹn giờ", "Timer": ""}])
rd = model("T134 radio", ["Q"], '{{Q}}<label><input type="radio" name="r" id="r1"> A</label><label><input type="radio" name="r" id="r2"> B</label><input type="text" id="tx">',
  '{{FrontSide}}<hr id=answer>đáp án')
add(rd, "T134::Radio", [{"Q": "câu %d" % i} for i in range(1, 5)])
add(basic, "T134::Lặp", [{"Front": "lặp %d" % i, "Back": "x"} for i in range(1, 6)])
long = model("T134 dài", ["Q"], '<div style="text-align:left">{{Q}}</div>', '{{FrontSide}}<hr id=answer>hết')
add(long, "T134::Dài", [{"Q": "".join("<p>Đoạn %d — わたしの 町には 小さな 公園が あります。</p>" % i for i in range(60))}])
for u in range(1, 4):
    add(basic, "T134::Cây::Unit %d" % u, [{"Front": "u%d-%d" % (u, i), "Back": "x"} for i in range(u)])
add(basic, "T134::Cây::Unit 2::Phần A", [{"Front": "pa", "Back": "x"}])
kb.ASK_TEST_OFF = False
kb.save_config(show_tooltips=False, sound=False, music=False)
kb.open_garden(); result = 1`;

(async () => {
  await py(SETUP);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'd.resize(1366, 860); result = 1'); await sleep(800);
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); return 1;');

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 1. số phím 1–4 trên nút chấm');
  await review('T134::Im lặng');
  await key(' ', 'Space', 32); await sleep(700);
  const keys = await js(`return Array.from(document.querySelectorAll(".kb-rate")).map((b) => { const k = b.querySelector(".kb-rate-key"), r = b.getBoundingClientRect(), q = k ? k.getBoundingClientRect() : null;
    return [k ? k.textContent : "", !!q && q.left >= r.left && q.right <= r.right && q.top >= r.top && q.bottom <= r.bottom && q.width > 0]; });`);
  ok(keys.length === 4 && keys.every((k, i) => k[0] === String(i + 1) && k[1]), 'nút Lại / Khó / Được / Dễ ghi 1 / 2 / 3 / 4 ở góc, nằm trong nút: ' + JSON.stringify(keys));
  await shot('134_01_phim');

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 2. Nghe lại');
  let p = await panel();
  ok(p.back && !p.replay, 'thẻ không có âm thanh (mặt sau): nút Nghe lại ẩn');
  await clearLog(); await key('r', 'KeyR', 82); await sleep(400);
  ok((await plays()).length === 0, 'thẻ không có âm thanh: phím R không phát gì');
  await review('T134::Âm thanh');
  p = await panel();
  ok(p.front && p.replay, 'mặt trước có [sound:q134]: nút Nghe lại hiện');
  await clearLog(); await key('r', 'KeyR', 82); await sleep(400);
  let pl = await plays();
  ok(pl.length === 1 && /q134/.test(pl[0]), 'phím R ở mặt trước → phát q134: ' + JSON.stringify(pl));
  await clearLog(); await key('F5', 'F5', 116); await sleep(400);
  ok((await plays()).some((t) => /q134/.test(t)), 'phím F5 (như Anki) → phát lại');
  await clearLog(); await page.click('#kb-rv-replay'); await sleep(400);
  ok((await plays()).some((t) => /q134/.test(t)), 'bấm nút Nghe lại bằng chuột → phát lại');
  await key(' ', 'Space', 32); await sleep(700);
  await clearLog(); await key('r', 'KeyR', 82); await sleep(400);
  pl = await plays();
  ok(pl.length === 2 && /q134/.test(pl[0]) && /a134/.test(pl[1]), 'mặt sau (deck để mặc định: phát lại cả câu hỏi) → q134 + a134: ' + JSON.stringify(pl));
  await py(KB + 'did = mw.col.decks.id_for_name("T134::Âm thanh"); conf = mw.col.decks.config_dict_for_deck_id(did); conf["replayq"] = False; mw.col.decks.update_config(conf); result = 1');
  await clearLog(); await key('r', 'KeyR', 82); await sleep(400);
  pl = await plays();
  ok(pl.length === 1 && /a134/.test(pl[0]), 'tuỳ chọn deck "Skip question when replaying answer" → chỉ a134: ' + JSON.stringify(pl));
  await clearLog(); await key('r', 'KeyR', 82, { ctrlKey: true, modifiers: 2 }); await sleep(300);
  ok((await plays()).length === 0, 'Ctrl+R không phải Nghe lại');
  const r0 = await revs();
  await key('3', 'Digit3', 51); await sleep(1200);
  ok((await revs()) === r0 + 1, 'phím 3 vẫn chấm sau khi nghe lại');

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 3. thẻ tự lật / tự chấm');
  await review('T134::Trắc nghiệm');
  let rv = await revs();
  ok(await clickIn('.opt', 0), 'bấm chuột thật vào đáp án A (mẫu thẻ gọi pycmd("ans") sau 0,3 giây)');
  ok(await waitFor('return !document.getElementById("kb-ratings").hidden;', 3000), 'thẻ tự lật sang mặt sau');
  ok((await js('return document.getElementById("kb-card").contentDocument.getElementById("sau") ? 1 : 0;')) === 1 && (await revs()) === rv, 'mặt sau hiện đáp án, chưa chấm gì');
  await key('3', 'Digit3', 51); await sleep(1200);
  ok((await revs()) === rv + 1, 'chấm bằng phím 3 sau khi tự lật');
  await review('T134::Tự chấm');
  rv = await revs();
  await clickIn('#e3'); await sleep(800);
  p = await panel();
  ok(p.front && (await revs()) === rv, 'pycmd("ease3") ở mặt trước bị bỏ (như Anki): vẫn mặt trước, không chấm');
  await key(' ', 'Space', 32); await sleep(700);
  await clickIn('#e4'); await sleep(1300);
  ok((await revs()) === rv + 1 && (await lastEase()) === 4, 'pycmd("ease4") ở mặt sau → chấm Dễ (revlog ease 4)');
  await review('T134::Đếm giờ');
  const first = await js('return document.getElementById("kb-card").contentDocument.body.textContent;');
  ok(/có hẹn giờ/.test(first), 'thẻ 1 có hẹn giờ 2,5 giây rồi tự lật');
  await key(' ', 'Space', 32); await sleep(400); await key('3', 'Digit3', 51);
  await waitFor('return /không hẹn giờ/.test(document.getElementById("kb-card").contentDocument.body.textContent);', 3000);
  await sleep(3200);
  p = await panel();
  ok(p.front, 'chấm thẻ 1 trước khi hết giờ → thẻ 2 KHÔNG bị hẹn giờ của thẻ 1 lật nhầm (vẫn mặt trước sau 3,2 giây)');

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 4. phím chắc hơn');
  await review('T134::Lặp');
  rv = await revs();
  await hold(' ', 'Space', 32, 8); await sleep(1300);
  p = await panel();
  ok(p.back && (await revs()) === rv, 'giữ Space (8 lần phím lặp): chỉ lật, không chấm (1.33.3: chấm liền 3 thẻ)');
  await hold('3', 'Digit3', 51, 8); await sleep(1500);
  ok((await revs()) === rv + 1, 'giữ phím 3: chấm đúng một thẻ');
  await review('T134::Radio');
  rv = await revs();
  await clickIn('#r1'); await sleep(300);
  ok((await js('const d = document.getElementById("kb-card").contentDocument; return d.activeElement && d.activeElement.id;')) === 'r1', 'đang chọn ô radio trong thẻ');
  await key(' ', 'Space', 32); await sleep(800);
  ok((await panel()).back, 'Space vẫn lật khi vừa bấm ô radio (1.33.3: không lật)');
  await clickIn('#tx'); await sleep(200);
  await key('2', 'Digit2', 50); await sleep(700);
  ok((await revs()) === rv && (await js('return document.getElementById("kb-card").contentDocument.getElementById("tx").value;')) === '2',
    'đang gõ trong ô chữ của thẻ: phím 2 là chữ, không chấm');
  await clickIn('#r2'); await sleep(200);
  await key('1', 'Digit1', 49, { modifiers: 2 }); await sleep(800);
  ok((await revs()) === rv, 'Ctrl+1 (Anki: gắn cờ) không chấm thẻ (1.33.3: chấm Lại)');
  await key('End', 'Numpad1', 35); await sleep(1300);
  ok((await revs()) === rv + 1 && (await lastEase()) === 1, 'bàn phím số NumLock tắt (End ở vị trí số 1) → chấm Lại');

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 5. Phóng to');
  await review('T134::Dài');
  const n0 = await panel();
  await key('f', 'KeyF', 70); await sleep(600);
  let z = await panel();
  const zcfg = await py(KB + 'result = kb.config().get("ui", {}).get("zoom")');
  ok(z.bar === 'none' && z.card > n0.card + 120 && zcfg === 'on', `phím F: thanh trên ẩn, thẻ ${n0.card} → ${z.card} px, lưu ui.zoom = ${zcfg}`);
  const zb = await js('const b = document.getElementById("kb-rv-zoom"); return [b.textContent.trim(), b.getAttribute("aria-pressed"), getComputedStyle(document.getElementById("kb-rv-garden")).display];');
  ok(/^Thu nhỏ/.test(zb[0]) && zb[1] === 'true' && zb[2] === 'none', 'nút thành "Thu nhỏ F", nút Ẩn vườn ẩn khi phóng to');
  const fit = await js('const p = document.getElementById("kb-panel").getBoundingClientRect(); return [Math.round(p.bottom), innerHeight, document.documentElement.scrollWidth <= innerWidth];');
  ok(fit[0] <= fit[1] && fit[2], 'bảng ôn vừa cửa sổ 1366 × 860 (đáy ' + fit[0] + ' ≤ ' + fit[1] + '), không tràn ngang');
  await shot('134_05_phong_to');
  await key('Escape', 'Escape', 27); await sleep(500);
  z = await panel();
  ok(z.open && z.bar !== 'none' && Math.abs(z.card - n0.card) < 3, 'Esc lần 1: thu nhỏ (bảng ôn vẫn mở, thẻ về ' + z.card + ' px)');
  await key('Escape', 'Escape', 27); await sleep(500);
  ok(!(await panel()).open, 'Esc lần 2: dừng ôn');
  await review('T134::Dài');
  await page.click('#kb-rv-zoom'); await sleep(500);
  ok((await panel()).bar === 'none', 'bấm nút Phóng to bằng chuột');
  await stop();
  ok((await panel()).bar !== 'none' && await js('return getComputedStyle(document.getElementById("kb-yard-wrap")).display !== "none";'), 'màn chính không bị Phóng to ảnh hưởng');
  await review('T134::Dài');
  ok((await panel()).bar === 'none', 'mở bảng ôn lần sau: vẫn Phóng to (nhớ theo máy)');
  await py(KB + 'd.resize(1024, 640); result = 1'); await sleep(800);
  const f2 = await js('const p = document.getElementById("kb-panel").getBoundingClientRect(); return [Math.round(p.bottom), innerHeight, document.documentElement.scrollWidth <= innerWidth, document.getElementById("kb-card").clientHeight];');
  ok(f2[0] <= f2[1] && f2[2] && f2[3] >= 400, '1024 × 640: vừa cửa sổ, không tràn ngang, thẻ cao ' + f2[3] + ' px');
  await shot('134_05b_phong_to_1024');
  console.log('== 7. thẻ dài: ↓ / PageDown cuộn khung thẻ');
  await js('document.activeElement && document.activeElement.blur && document.activeElement.blur(); window.focus(); return 1;');
  const y0 = await js('return document.getElementById("kb-card").contentWindow.scrollY;');
  await key('ArrowDown', 'ArrowDown', 40); await sleep(300);
  const y1 = await js('return document.getElementById("kb-card").contentWindow.scrollY;');
  await key('PageDown', 'PageDown', 34); await sleep(300);
  const y2 = await js('return document.getElementById("kb-card").contentWindow.scrollY;');
  ok(y1 > y0 && y2 > y1 + 200, `↓ cuộn ${y1 - y0} px, PageDown cuộn thêm ${y2 - y1} px`);
  await page.click('#kb-rv-zoom'); await sleep(400);
  await stop();
  await py(KB + 'd.resize(1366, 860); result = 1'); await sleep(600);

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 6. Ẩn / Hiện vườn (1600 × 1000)');
  await py(KB + 'd.resize(1600, 1000); result = 1'); await sleep(800);
  await js('GardenUI.setGlob("card", "normal"); return 1;'); await sleep(300);
  await review('T134::Lặp');
  const geo = () => js('const y = document.getElementById("kb-yard-wrap"); return { card: document.getElementById("kb-card").clientHeight, yard: getComputedStyle(y).display !== "none", top: Math.round(y.getBoundingClientRect().top), btn: document.getElementById("kb-rv-garden").textContent, cfg: GardenUI.glob("card") };');
  const g0 = await geo();
  await page.click('#kb-rv-garden'); await sleep(700);
  const g1 = await geo();
  ok(!g1.yard && g1.card > g0.card && g1.btn === 'Hiện vườn' && g1.cfg === 'normal', `Ẩn vườn: vườn ẩn, thẻ ${g0.card} → ${g1.card} px, cỡ thẻ đã chọn vẫn "Vừa"`);
  await page.click('#kb-rv-garden'); await sleep(700);
  const g2 = await geo();
  ok(g2.yard && g2.card === g0.card && g2.top === g0.top && g2.btn === 'Ẩn vườn', `Hiện vườn: về đúng như trước (thẻ ${g2.card} px, vườn bắt đầu ở ${g2.top} px như lúc đầu ${g0.top})`);
  // cấu hình bản cũ đã lỡ lưu: "To hết chỗ" + ẩn vườn
  await js('const c = JSON.parse(JSON.stringify(Garden._data().ui)); c.card = "tall"; c.review.yard = "hide"; c.review.field = "hide"; GardenUI.saved(c); pycmd("ui:set:" + JSON.stringify(c)); return 1;');
  await sleep(700);
  await page.click('#kb-rv-garden'); await sleep(800);
  const g3 = await geo();
  const saved = await py(KB + 'u = kb.config().get("ui", {}); result = [u.get("card"), u["review"]["yard"], u["review"]["field"]]');
  ok(g3.yard && g3.card === g0.card && g3.cfg === 'normal' && saved[0] === 'normal' && saved[1] === 'full', 'cấu hình bản cũ ("tall" + ẩn) → Hiện vườn: về Vừa, vườn hiện lại như lúc đầu: ' + JSON.stringify(saved));
  await shot('134_06_hien_vuon');
  await stop();
  await py(KB + 'd.resize(1366, 860); result = 1'); await sleep(600);

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 8. cây deck');
  await deck('T134::Cây::Unit 2::Phần A');
  const bt = await js('const b = document.getElementById("kb-deck-btn"); return [b.querySelector(".kb-deck-path").textContent, b.querySelector(".kb-deck-leaf").textContent, getComputedStyle(document.getElementById("kb-deck")).display];');
  ok(bt[0] === 'T134 › Cây › Unit 2 ›' && bt[1] === 'Phần A' && bt[2] === 'none', 'nút gọn: "' + bt[0] + ' ' + bt[1] + '", ô thả xuống cũ ẩn');
  await page.click('#kb-deck-btn'); await sleep(800);
  const rows = () => js('return Array.from(document.querySelectorAll("#kb-deck-list .kb-deck-row")).map((r) => ({ t: r.querySelector(".kb-deck-name").textContent, id: Number(r.getAttribute("data-id")), hit: r.classList.contains("is-hit"), cur: r.classList.contains("is-cur"), n: Array.from(r.querySelectorAll(".kb-deck-n")).map((x) => x.textContent).join("/"), tog: r.querySelector(".kb-deck-tog").textContent }));');
  let rs = await rows();
  const tree = await py(KB + 'result = kb.core.deck_tree(mw.col)');
  const byId = {}; tree.forEach((t) => { byId[t.id] = t; });
  ok(await js('return !document.getElementById("kb-deck-pop").hidden && document.activeElement.id === "kb-deck-q";'), 'bấm nút → bảng cây mở, con trỏ ở ô tìm');
  const curRow = rs.find((r) => r.cur);
  ok(curRow && curRow.t === 'Phần A' && curRow.hit && rs.some((r) => r.t === 'Unit 2' && r.tog === '▾') && rs.some((r) => r.t === 'Cây' && r.tog === '▾'),
    'mở sẵn nhánh tới deck đang xem (T134 › Cây › Unit 2 › Phần A), dòng đang xem được chọn');
  ok(rs.length >= 6 && rs.every((r) => byId[r.id] && r.n === byId[r.id].n.join('/')), 'số thẻ Mới / Học / Ôn từng dòng = Python deck_tree (' + rs.length + ' dòng)');
  await shot('134_08_cay_deck');
  await key('ArrowLeft', 'ArrowLeft', 37); await sleep(150);          // lên Unit 2
  await key('ArrowLeft', 'ArrowLeft', 37); await sleep(250);          // thu Unit 2
  rs = await rows();
  const u2 = rs.find((r) => r.t === 'Unit 2');
  ok(u2 && u2.hit && u2.tog === '▸' && !rs.some((r) => r.t === 'Phần A'), '← lên deck cha, ← nữa thu nhánh (giống Anki)');
  const fold = await py(KB + 'result = kb.config().get("prefs", {}).get("kb-deck-fold", "")');
  ok(/-\d+/.test(fold), 'thu / mở nhánh nhớ theo máy (prefs kb-deck-fold = ' + fold + ')');
  await key('ArrowRight', 'ArrowRight', 39); await sleep(250);
  ok((await rows()).some((r) => r.t === 'Phần A'), '→ mở lại nhánh');
  await page.type('unit 3'); await sleep(300);
  rs = await rows();
  ok(rs.length >= 1 && rs[0].t.indexOf('Unit 3') >= 0 && /T134 › Cây ›/.test(rs[0].t), 'gõ "unit 3" → lọc, có đường dẫn: ' + rs.map((r) => r.t).join(' | '));
  await key('Enter', 'Enter', 13); await sleep(1500);
  const dn = await py(KB + 'result = mw.col.decks.name(d.deck_id)');
  ok(dn === 'T134::Cây::Unit 3' && await js('return document.getElementById("kb-deck-pop").hidden && /Unit 3/.test(document.getElementById("kb-deck-btn").textContent);'),
    'Enter → đổi deck của vườn (' + dn + '), bảng đóng, nút ghi tên mới');
  await key('/', 'Slash', 191); await sleep(500);
  ok(await js('return !document.getElementById("kb-deck-pop").hidden;'), 'phím / mở bảng cây');
  await key('Escape', 'Escape', 27); await sleep(300);
  ok(await js('return document.getElementById("kb-deck-pop").hidden;') && (await py(KB + 'result = bool(d and d.isVisible())')), 'Esc đóng bảng cây (cửa sổ vườn vẫn mở)');
  await page.click('#kb-deck-btn'); await sleep(400);
  await mouseAt(1200, 600); await sleep(300);
  ok(await js('return document.getElementById("kb-deck-pop").hidden;'), 'bấm ra ngoài → đóng');
  await py(KB + 'd.resize(1024, 640); result = 1'); await sleep(600);
  await page.click('#kb-deck-btn'); await sleep(500);
  const pr = await js('const r = document.getElementById("kb-deck-pop").getBoundingClientRect(); return [r.left >= 0, r.right <= innerWidth, document.documentElement.scrollWidth <= innerWidth];');
  ok(pr.every(Boolean), '1024 × 640: bảng cây nằm trong cửa sổ, không tràn ngang');
  await key('Escape', 'Escape', 27);
  await py(KB + 'd.resize(1366, 860); result = 1'); await sleep(600);

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 9. Trang trí thử');
  await py(KB + `dd = st.load(); dd["coins"] = 200000; st.save(dd)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
for iid, x, y in [("painting", 1, 0), ("shelf", 0, 1), ("plant", 9, 1)]:
    st.buy(iid); st.place("room", iid, x, y)
dd = st.load(); dd["coins"] = 100; st.save(dd)
d.refresh(); result = 1`);
  await sleep(1200);
  const real0 = await py(KB + 'result = st.load()["home"]["room"]');
  await js('GardenHome.open("room"); return 1;'); await sleep(1000);
  await js('document.querySelector(\'.kb-h-tab[data-tab="room"]\').click(); return 1;'); await sleep(400);
  await page.click('#kb-h-try');
  await waitFor('return document.getElementById("kb-h-tip").classList.contains("kb-h-trybar") && /Bản/.test(document.getElementById("kb-h-tip").textContent);');
  await sleep(500);
  const bar = () => js('const t = document.getElementById("kb-h-tip"); return { msg: (t.querySelector(".kb-try-msg") || {}).textContent || "", use: (t.querySelector(".kb-try-use") || {}).textContent || "", dis: !!(t.querySelector(".kb-try-use") || {}).disabled, slot: Array.from(t.querySelectorAll(".kb-try-slot")).findIndex((b) => b.classList.contains("is-on")) };');
  let b = await bar();
  ok(b.slot === 0 && /Giống cảnh thật/.test(b.msg) && b.dis, 'bật Trang trí thử: thanh dưới cảnh, Bản 1, "Giống cảnh thật", nút Dùng khoá');
  const drafts = () => py(KB + 'result = st.draft_load()');
  let dr = await drafts();
  ok(dr.scenes.room && JSON.stringify(dr.scenes.room.slots[0].items) === JSON.stringify(real0), 'Bản 1 = bản chép cảnh thật, lưu ở Python (file theo hồ sơ)');
  // toạ độ màn hình của ô (x, y) trong phòng — đo lại mỗi lần (bấm nút trong danh sách có thể làm trang cuộn)
  const cell = async (x, y) => js(`const L = GardenHome._lib(), r = document.getElementById("kb-home-canvas").getBoundingClientRect(), S = r.width / 160;
    return [r.left + (${x} * L.T + 8) * S, r.top + ((${y} === 0 ? L.ROOM.WALL_Y : L.ROOM.FLOOR + (${y} - 1) * L.T) + 8) * S];`);
  async function tryPut(name, x, y) {
    const r = await js(`const c = Array.from(document.querySelectorAll("#kb-h-list .kb-h-card")).find((e) => (e.querySelector(".kb-h-name") || {}).textContent && e.querySelector(".kb-h-name").textContent.indexOf(${JSON.stringify(name)}) === 0);
      if (!c) return "không thấy thẻ"; const bt = c.querySelector(".kb-try-put"); if (!bt) return "không có nút Đặt thử"; if (bt.disabled) return "nút khoá"; bt.scrollIntoView({block: "center"}); bt.click(); return "ok";`);
    if (r !== 'ok') { return r; }
    await sleep(250);
    const [cx, cy] = await cell(x, y);
    await mouseAt(cx, cy); await sleep(500);
    return 'ok';
  }
  ok((await tryPut('TV cổ', 6, 3)) === 'ok', 'Đặt thử "TV cổ" (chưa có, ví chỉ 100 xu) → bấm ô trên cảnh');
  b = await bar();
  ok(/1 món chưa có · 220 xu/.test(b.msg) && /Thiếu 120 xu/.test(b.use) && b.dis, 'thanh: "1 món chưa có · 220 xu", nút "Thiếu 120 xu" (khoá)');
  ok(JSON.stringify(await py(KB + 'result = st.load()["home"]["room"]')) === JSON.stringify(real0) && (await py(KB + 'result = st.load()["coins"]')) === 100,
    'vườn thật không đổi (phòng, xu) khi đặt thử');
  dr = await drafts();
  ok(dr.scenes.room.slots[0].items.some((e) => e.id === 'tv' && e.x === 6 && e.y === 3), 'bản thử đã lưu TV ở ô (6, 3)');
  const tvCard = await js('const c = Array.from(document.querySelectorAll("#kb-h-list .kb-h-card")).find((e) => /^TV cổ/.test(e.querySelector(".kb-h-name").textContent)); return [c.classList.contains("kb-try-card"), (c.querySelector(".kb-try-has") || {}).textContent || "", Array.from(c.querySelectorAll(".kb-h-btns button")).map((x) => x.textContent)];');
  ok(tvCard[0] && /Trong bản thử: 1 · cần mua 1/.test(tvCard[1]) && JSON.stringify(tvCard[2]) === '["Đặt thử"]', 'thẻ TV: viền "cần mua", chỉ còn nút "Đặt thử": ' + JSON.stringify(tvCard));
  await shot('134_09_trang_tri_thu');
  // chụp ảnh khi đang thử = cảnh thật
  const ph1 = await js('return GardenHome.photo("s", "room").length;');
  ok(ph1 > 0 && await js('const t = GardenHome.trying(); return t;'), 'đang thử vẫn chụp ảnh được');
  // Bản 2: trống → chép cảnh thật
  await js('document.querySelectorAll("#kb-h-tip .kb-try-slot")[1].click(); return 1;'); await sleep(700);
  b = await bar(); dr = await drafts();
  ok(b.slot === 1 && /Giống cảnh thật/.test(b.msg) && dr.scenes.room.cur === 1 && JSON.stringify(dr.scenes.room.slots[1].items) === JSON.stringify(real0) && dr.scenes.room.slots[0].items.some((e) => e.id === 'tv'),
    'Bản 2 (trống) → chép cảnh thật; Bản 1 vẫn giữ TV');
  ok((await tryPut('Bể cá', 8, 1)) === 'ok', 'Bản 2: đặt thử Bể cá');
  await js('document.querySelectorAll("#kb-h-tip .kb-try-slot")[0].click(); return 1;'); await sleep(600);
  b = await bar();
  ok(b.slot === 0 && /1 món chưa có · 220 xu/.test(b.msg), 'về Bản 1: vẫn TV (220 xu)');
  ok((await tryPut('Bể cá', 8, 1)) === 'ok', 'Bản 1: thêm Bể cá');
  b = await bar();
  ok(/2 món chưa có · 460 xu/.test(b.msg), 'thanh: "2 món chưa có · 460 xu"');
  // dời món đang có trong bản thử (bấm kệ → Di chuyển → ô mới) — vườn thật không đổi
  const [kx, ky] = await cell(0, 1); await mouseAt(kx, ky); await sleep(300);
  const popName = await js('return document.getElementById("kb-h-pop").hidden ? "" : document.querySelector(".kb-h-pop-name").textContent + "|" + document.getElementById("kb-h-take").textContent;');
  ok(/Bỏ khỏi bản thử/.test(popName), 'bấm món trong bản thử: nút "' + popName.split('|')[1] + '"');
  await page.click('#kb-h-move'); await sleep(200);
  const [mx, my] = await cell(2, 2); await mouseAt(mx, my); await sleep(500);
  dr = await drafts();
  ok(dr.scenes.room.slots[0].items.some((e) => e.id === 'shelf' && e.x === 2 && e.y === 2) && JSON.stringify(await py(KB + 'result = st.load()["home"]["room"]')) === JSON.stringify(real0),
    'dời kệ sách trong bản thử sang (2, 2); vườn thật vẫn ở (0, 1)');
  // tường & sàn
  await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-room-chips button")).find((x) => /Tường/.test(x.textContent)); if (b) b.click(); return 1;'); await sleep(500);
  const wall = await js(`const c = Array.from(document.querySelectorAll("#kb-h-list .kb-decor-card[data-decor^='wall:w_']"))[0]; if (!c) return null; const bt = c.querySelector(".kb-try-put"); bt.click(); return c.getAttribute("data-decor");`);
  await sleep(600);
  dr = await drafts();
  ok(wall && dr.scenes.room.slots[0].decor && dr.scenes.room.slots[0].decor.wall === wall.split(':')[1], 'Tường & sàn: "Đặt thử" giấy dán tường ' + wall + ' vào bản thử');
  b = await bar();
  const wallPrice = await py(KB + `result = kb.core.decor.PRESETS[${JSON.stringify(wall ? wall.split(':')[1] : '')}]["price"]`);
  ok(new RegExp('3 món chưa có · ' + (460 + wallPrice) + ' xu').test(b.msg.replace(/\./g, '')), 'thanh tính cả giấy dán tường: ' + b.msg);
  await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-room-chips button")).find((x) => /Đồ nội thất/.test(x.textContent)); if (b) b.click(); return 1;'); await sleep(400);
  // Esc lần 1 thoát thử, đóng Nhà giữ bản thử
  await key('Escape', 'Escape', 27); await sleep(400);
  ok(!(await js('return GardenHome.trying();')) && await js('return GardenHome.isOpen();'), 'Esc lần 1: thoát thử, bảng Nhà còn mở');
  await key('Escape', 'Escape', 27); await sleep(400);
  ok(!(await js('return GardenHome.isOpen();')), 'Esc lần 2: đóng bảng Nhà');
  await js('GardenHome.open("room"); return 1;'); await sleep(900);
  await page.click('#kb-h-try'); await sleep(800);
  b = await bar();
  ok(b.slot === 0 && /3 món chưa có/.test(b.msg), 'mở lại + Trang trí thử: Bản 1 vẫn còn (3 món)');
  // Như cảnh thật → rồi đặt lại
  await js('document.querySelector("#kb-h-tip .kb-try-reset").click(); return 1;'); await sleep(600);
  // 1.35.1: bản thử khác cảnh thật → hỏi trước; Huỷ thì bản thử còn nguyên
  ok(await js('const a = document.getElementById("kb-ask"); return !!a && !a.hidden && /giống cảnh thật/.test(a.textContent);'),
    '"Như cảnh thật" khi bản thử đã khác: hỏi trước');
  await js('document.querySelector(".kb-ask-no").click(); return 1;'); await sleep(400);
  b = await bar();
  ok(/3 món chưa có/.test(b.msg), 'Huỷ: bản thử còn nguyên (3 món)');
  await js('document.querySelector("#kb-h-tip .kb-try-reset").click(); return 1;'); await sleep(600);
  await js('document.querySelector(".kb-ask-yes").click(); return 1;'); await sleep(600);
  b = await bar();
  ok(/Giống cảnh thật/.test(b.msg), '"Như cảnh thật" → đồng ý: Bản 1 về giống cảnh bây giờ');
  ok((await tryPut('TV cổ', 6, 3)) === 'ok' && (await tryPut('Bể cá', 8, 1)) === 'ok', 'đặt thử lại TV + Bể cá');
  await py(KB + 'dd = st.load(); dd["coins"] = 3000; st.save(dd); d.refresh(); result = 1'); await sleep(1200);
  b = await bar();
  ok(/Dùng bản này · 460 xu/.test(b.use) && !b.dis, 'đủ xu: nút "Dùng bản này · 460 xu" (' + JSON.stringify(b) + ')');
  await page.click('#kb-h-tip .kb-try-use'); await sleep(700);
  const ask = await js('const a = document.querySelector(".kb-ask"); return a && !a.hidden ? a.textContent : "";');
  ok(/Dùng bản thử 1/.test(ask) && /TV cổ/.test(ask) && /Bể cá/.test(ask) && /460 xu/.test(ask), 'hộp hỏi một lần: liệt kê món phải mua + giá');
  await sleep(500);
  const yes = await js('const r = document.querySelector(".kb-ask-yes").getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2];');
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: yes[0], y: yes[1], button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: yes[0], y: yes[1], button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: yes[0], y: yes[1], button: 'left', clickCount: 2 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: yes[0], y: yes[1], button: 'left', clickCount: 2 });
  await sleep(1800);
  const w1 = await py(KB + 'x = st.load(); result = [x["coins"], x["home"]["owned"].get("tv", 0), x["home"]["owned"].get("aquarium", 0), x["home"]["room"]]');
  ok(w1[0] === 3000 - 460 && w1[1] === 1 && w1[2] === 1, `bấm đúp "Mua 2 món & dùng": trừ đúng một lần (${3000 - w1[0]} xu), có TV + Bể cá`);
  ok(w1[3].some((e) => e.id === 'tv' && e.x === 6 && e.y === 3) && w1[3].some((e) => e.id === 'aquarium' && e.x === 8 && e.y === 1), 'phòng thật bày đúng như bản thử');
  ok(!(await js('return GardenHome.trying();')) && /Đã bày/.test(await js('return document.getElementById("kb-h-tip").textContent;')), 'xong: thoát thử, dòng "Đã bày … như bản thử"');
  await shot('134_09b_da_dung');
  // lúc Anki đang đồng bộ: 1.34 bỏ lệnh lưu bản thử (đóng vườn là mất lần sửa) — 1.35.1 lưu luôn (bản thử chỉ là file trên
  // máy); "Dùng bản này" vẫn bày đúng như bản đang thấy
  await js('GardenHome.open("room"); return 1;'); await sleep(800);
  await js('document.querySelector(\'.kb-h-tab[data-tab="room"]\').click(); return 1;'); await sleep(300);
  await page.click('#kb-h-try'); await sleep(700);
  await py(KB + 'kb._e2e_busy = mw.progress.busy; kb._sync_running = True; mw.progress.busy = lambda: True; result = kb._sync_hold()');
  ok((await tryPut('Đèn cây', 3, 1)) === 'ok', 'đang "đồng bộ": đặt thử Đèn cây');
  const kept = await drafts();
  ok(kept.scenes.room.slots[kept.scenes.room.cur].items.some((e) => e.id === 'lamp'), '… 1.35.1: bản thử vẫn lưu xuống file lúc đồng bộ (có Đèn cây)');
  await py(KB + 'mw.progress.busy = kb._e2e_busy; kb._sync_running = False; result = kb._sync_hold()');
  await sleep(300);
  const c0 = await py(KB + 'result = st.load()["coins"]');
  await page.click('#kb-h-tip .kb-try-use'); await sleep(900);
  await js('document.querySelector(".kb-ask-yes").click(); return 1;'); await sleep(1500);
  const w2 = await py(KB + 'x = st.load(); result = [x["coins"], x["home"]["owned"].get("lamp", 0), [e for e in x["home"]["room"] if e["id"] == "lamp"]]');
  ok(w2[1] === 1 && w2[2].length === 1 && w2[2][0].x === 3 && w2[2][0].y === 1 && c0 - w2[0] === 60, 'đồng bộ xong, "Dùng bản này": có Đèn cây ở (3, 1), trừ 60 xu (đúng bản đang thấy)');
  await sleep(500);
  ok(!(await js('return GardenHome.trying();')), '… và thoát thử');
  await key('Escape', 'Escape', 27); await sleep(400);

  // ---------------------------------------------------------------------------------------------------------------------
  console.log('== 10. lỗi');
  ok(page.errors.length === 0, 'không lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  const log = await py(KB + 'result = [(e.get("where"), e.get("msg")) for e in kb.ERRORS.entries()][-8:]');
  ok(log.length === 0, 'nhật ký lỗi add-on trống' + (log.length ? ': ' + JSON.stringify(log) : ''));
  console.log(`KẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error(e); console.log(`KẾT QUẢ: ${pass}/${total + 1}`); process.exit(1); });
