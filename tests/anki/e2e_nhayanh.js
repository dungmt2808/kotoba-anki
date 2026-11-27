// 1.36.6 — góp ý người dùng (27/11): "lúc t học lâu lâu nó giật giật kiểu mất ảnh cái hiện lại". Quay màn hình từng khung
// (Page.startScreencast) lúc LẬT THẺ và lúc SANG THẺ MỚI ở thẻ có ảnh, đếm số khung mà vùng ảnh bị TRỐNG:
//   A. bảng ôn của vườn (Tưới ngay): lật thẻ (mặt sau có {{FrontSide}} → ảnh mặt trước được dựng lại), chấm → thẻ kế (ảnh khác);
//   B. đối chứng: màn ôn của chính Anki (cùng thẻ, cùng máy) — Anki tải sẵn + giải mã ảnh trước khi thay nội dung.
// Ảnh thử: ảnh nhiễu JPEG (giải mã nặng như ảnh chụp), mỗi thẻ một ảnh. Phân tích khung: nhayanh_phan_tich.py (Pillow — KB_PIL_PY).
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_nhayanh';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const PIL_PY = process.env.KB_PIL_PY || path.join(process.env.HOME || '/root', '.venv-anki/bin/python');
const N_ROUNDS = Number(process.env.KB_NHAY_N || 3);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && !!Garden._data && !!Garden._data()').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let pass = 0, total = 0;
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
const KB = `import sys, os, json, time
kb = sys.modules["kotoba_batake"]
`;
// ---- quay khung hình ----
function recorder(page, dir) {
  const rec = { on: false, list: [], n: 0 };
  const orig = page.ws.onmessage;
  page.ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Page.screencastFrame') {
      page.ws.send(JSON.stringify({ id: 900000 + (++rec.n), method: 'Page.screencastFrameAck', params: { sessionId: m.params.sessionId } }));
      if (rec.on) {
        const f = 'f' + String(rec.list.length).padStart(4, '0') + '.png';
        fs.writeFileSync(path.join(rec.dir, f), Buffer.from(m.params.data, 'base64'));
        rec.list.push({ f, t: m.params.metadata.timestamp });
      }
      return;
    }
    orig(ev);
  };
  rec.start = async (name) => {
    rec.dir = path.join(dir, name); fs.rmSync(rec.dir, { recursive: true, force: true }); fs.mkdirSync(rec.dir, { recursive: true });
    rec.list = []; rec.on = true;
    await page.send('Page.startScreencast', { format: 'png', everyNthFrame: 1 });
  };
  rec.stop = async () => { await page.send('Page.stopScreencast'); await sleep(200); rec.on = false; };
  return rec;
}
// số khung (sau lúc bấm) mà vùng ảnh gần như một màu = ảnh biến mất
function blanks(rec, box, t0) {
  const out = JSON.parse(execFileSync(PIL_PY, [path.join(__dirname, 'nhayanh_phan_tich.py'), rec.dir, ...box.map(String)]).toString());
  const after = out.filter((x) => { const it = rec.list.find((y) => y.f === x.f); return it && it.t >= t0 - 0.02; });
  return { n: after.length, blank: after.filter((x) => x.sd >= 0 && x.sd < 12).length, sd: after.map((x) => x.sd) };
}

// đầu dò trong trang (không phụ thuộc cách vẽ): mỗi khung hình (rAF) ghi [chữ đầu của #qa, số ảnh trong #qa, số ảnh chưa tải xong]
const PROBE = `(() => { const w = WIN; if (w.__kbProbe) { w.__kbProbe.log = []; return 1; }
  const P = w.__kbProbe = { log: [] };
  const tick = () => { const qa = w.document.getElementById("qa");
    if (qa) { const imgs = [...qa.querySelectorAll("img")];
      P.log.push([qa.innerText.replace(/\\s+/g, " ").trim().slice(0, 18), imgs.length, imgs.filter((i) => !i.complete || !i.naturalWidth).length]); }
    w.requestAnimationFrame(tick); };
  w.requestAnimationFrame(tick); return 1; })()`;
// số khung đã có chữ của thẻ mới mà ảnh chưa tải xong (người dùng thấy chữ, ảnh "bật" vào sau)
function popFrames(log, before) {
  let n = 0, seen = false;
  for (const [txt, ni, nu] of log) { if (txt && txt !== before) { seen = true; if (ni && nu) n++; } }
  return { n, seen };
}
function inner(b) { return [b[0] + b[2] * 0.2, b[1] + b[3] * 0.2, b[2] * 0.6, b[3] * 0.6].map(Math.round); }

(async () => {
  console.log('== chuẩn bị: 2 × ' + (N_ROUNDS + 1) + ' thẻ có ảnh nhiễu 640 × 360 (JPEG)');
  const did = await py(KB + `import random
from aqt.qt import QImage, QBuffer, QByteArray, QIODevice
col = mw.col
did = col.decks.id("Ảnh nháy")
m = col.models.by_name("Basic")
assert "{{FrontSide}}" in m["tmpls"][0]["afmt"]
W, H = 640, 360
for i in range(${2 * (N_ROUNDS + 1)}):
    raw = os.urandom(W * H * 3)
    img = QImage(raw, W, H, W * 3, QImage.Format.Format_RGB888).copy()
    ba = QByteArray(); buf = QBuffer(ba); buf.open(QIODevice.OpenModeFlag.WriteOnly); img.save(buf, "JPG", 92); buf.close()
    name = col.media.write_data("kb_nhay_%d.jpg" % i, bytes(ba.data()))
    n = col.new_note(m)
    n["Front"] = '<img src="%s"><div style="font-size:24px">từ có ảnh %d</div>' % (name, i)
    n["Back"] = "nghĩa %d" % i
    col.add_note(n, did)
conf = col.decks.config_dict_for_deck_id(did); conf["new"]["perDay"] = 999; col.decks.save(conf)
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
result = did`);

  // ================================================================== A. bảng ôn của vườn
  console.log('== A. bảng ôn của vườn');
  await py(KB + 'kb.open_garden(); result = 1');
  const page = await gardenPage();
  if (!page) { throw new Error('không thấy trang vườn'); }
  await py(KB + `kb._dialog.resize(1366, 860); kb._dialog._dispatch("deck:${did}"); result = 1`); await sleep(1200);
  const rec = recorder(page, SHOTS);
  const imgBox = () => page.eval(`(() => { const f = document.getElementById("kb-card"); if (!f || !f.contentDocument) return null;
    const r = f.getBoundingClientRect(), img = f.contentDocument.querySelector("#qa img"); if (!img || !img.complete || !img.naturalWidth) return null;
    const ir = img.getBoundingClientRect(); return [r.left + ir.left, r.top + ir.top, ir.width, ir.height]; })()`);
  const waitImg = async () => { for (let i = 0; i < 60; i++) { const b = await imgBox(); if (b && b[2] > 50) return b; await sleep(100); } return null; };
  await py(KB + 'kb._dialog._dispatch("rv:start")\nresult = 1');
  let g = { flip: 0, next: 0, flipN: 0, nextN: 0, sd: [] };
  for (let r = 0; r < N_ROUNDS; r++) {
    let box = await waitImg();
    if (!box) { ok(false, 'vòng ' + (r + 1) + ': ảnh mặt trước hiện'); break; }
    await sleep(600);
    // lật thẻ
    await rec.start('vuon_lat_' + r); await sleep(300);
    const t0 = Date.now() / 1000;
    await page.eval('Garden.flip()');
    await sleep(1500); await rec.stop();
    let b = blanks(rec, inner(box), t0);
    g.flip += b.blank; g.flipN += b.n; g.sd.push('lật: ' + b.sd.join(','));
    // chấm → thẻ kế (ảnh khác)
    box = await waitImg();
    await sleep(400);
    const txt0 = await page.eval('document.getElementById("kb-card").contentDocument.getElementById("qa").innerText.replace(/\\s+/g, " ").trim().slice(0, 18)');
    await page.eval(PROBE.replace('WIN', 'document.getElementById("kb-card").contentWindow'));
    await rec.start('vuon_ke_' + r); await sleep(300);
    const t1 = Date.now() / 1000;
    await page.eval('Garden.cardCmd("ease3")');
    await sleep(2200); await rec.stop();
    b = blanks(rec, inner(box), t1);
    g.next += b.blank; g.nextN += b.n; g.sd.push('thẻ kế: ' + b.sd.join(','));
    const pf = popFrames(await page.eval('document.getElementById("kb-card").contentWindow.__kbProbe.log'), txt0);
    g.pop = (g.pop || 0) + pf.n; g.popSeen = (g.popSeen || 0) + (pf.seen ? 1 : 0);
  }
  console.log('     (độ lệch chuẩn vùng ảnh từng khung — < 12 là trống) ' + g.sd.join(' | '));
  ok(g.flip === 0, 'vườn — lật thẻ ' + N_ROUNDS + ' lần: khung ảnh trống ' + g.flip + ' / ' + g.flipN + ' khung');
  ok(g.next === 0, 'vườn — sang thẻ kế (ảnh mới) ' + N_ROUNDS + ' lần: khung ảnh trống ' + g.next + ' / ' + g.nextN + ' khung');
  ok(g.popSeen === N_ROUNDS && g.pop === 0, 'vườn — sang thẻ kế: số khung đã có chữ thẻ mới mà ảnh chưa tải xong = ' + g.pop + ' (đầu dò DOM, ' + g.popSeen + '/' + N_ROUNDS + ' lần thấy thẻ mới)');
  await page.shot(SHOTS + '/nhay_vuon.png');
  await py(KB + 'kb._dialog._dispatch("rv:stop")\nresult = 1');
  ok(page.errors.length === 0, 'không lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 2).join(' | ') : ''));
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(800);

  // ================================================================== B. đối chứng: màn ôn của Anki
  console.log('== B. đối chứng: màn ôn của Anki');
  await py(KB + `mw.col.decks.select(${did}); mw.moveToState("review"); result = 1`); await sleep(2500);
  const mi = (await pages(CDP)).find((i) => i.title === 'main webview');
  const mp = await Page.open(mi.webSocketDebuggerUrl);
  const rec2 = recorder(mp, SHOTS);
  const aBox = () => mp.eval(`(() => { const img = document.querySelector("#qa img"); if (!img || !img.complete || !img.naturalWidth) return null;
    const ir = img.getBoundingClientRect(); return [ir.left, ir.top, ir.width, ir.height]; })()`);
  const waitA = async () => { for (let i = 0; i < 60; i++) { const b = await aBox(); if (b && b[2] > 50) return b; await sleep(100); } return null; };
  let a = { flip: 0, next: 0, flipN: 0, nextN: 0 };
  for (let r = 0; r < N_ROUNDS; r++) {
    let box = await waitA();
    if (!box) { ok(false, 'Anki vòng ' + (r + 1) + ': ảnh mặt trước hiện'); break; }
    await sleep(600);
    await rec2.start('anki_lat_' + r); await sleep(300);
    const t0 = Date.now() / 1000;
    await py(KB + 'mw.reviewer._showAnswer()\nresult = 1');
    await sleep(1500); await rec2.stop();
    let b = blanks(rec2, inner(box), t0); a.flip += b.blank; a.flipN += b.n;
    box = await waitA(); await sleep(400);
    const atxt = await mp.eval('document.getElementById("qa").innerText.replace(/\\s+/g, " ").trim().slice(0, 18)');
    await mp.eval(PROBE.replace('WIN', 'window'));
    await rec2.start('anki_ke_' + r); await sleep(300);
    const t1 = Date.now() / 1000;
    await py(KB + 'mw.reviewer._answerCard(3)\nresult = 1');
    await sleep(2200); await rec2.stop();
    b = blanks(rec2, inner(box), t1); a.next += b.blank; a.nextN += b.n;
    const apf = popFrames(await mp.eval('window.__kbProbe.log'), atxt); a.pop = (a.pop || 0) + apf.n;
  }
  console.log('     Anki: lật thẻ ' + a.flip + ' / ' + a.flipN + ' khung trống · sang thẻ kế ' + a.next + ' / ' + a.nextN + ' khung trống · khung có chữ mà ảnh chưa tải ' + (a.pop || 0));
  ok(true, 'đối chứng Anki: lật ' + a.flip + ' · thẻ kế ' + a.next + ' khung trống (ghi lại, không tính)');
  await mp.shot(SHOTS + '/nhay_anki.png');
  await py(KB + 'mw.moveToState("deckBrowser"); result = 1');
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.error('LỖI KỊCH BẢN:', e.stack || e.message); process.exit(2); });
