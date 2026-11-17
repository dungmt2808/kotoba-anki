// Đo CPU + số lần vẽ canvas của cửa sổ vườn (Anki thật, offscreen) — issue #7 (chớp màn hình, quạt kêu), kế hoạch docs/ke_hoach_ve_nhe/.
// Chạy qua do_cpu.sh ADDON OUT [still]; một mình: node do_cpu.js OUT (Anki đã chạy, cổng KB_CDP_PORT / KB_CTRL_PORT). KB_SECS = số giây mỗi lần đo.
const fs = require('fs');
const { execSync } = require('child_process');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2];
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const SECS = Number(process.env.KB_SECS || 15);
async function py(code) { const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code }); const j = await r.json(); if (j.err) throw new Error(j.err); return j.r; }
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
// tổng thời gian CPU (giây) của Anki + mọi tiến trình QtWebEngine
function procs() {
  const out = execSync("ps -eo pid=,comm=,args=").toString().split('\n');
  return out.filter(l => /QtWebEngineProc|aqt\.run|import aqt/.test(l)).map(l => {
    const pid = Number(l.trim().split(/\s+/)[0]);
    const t = /--type=(\w+)/.exec(l); return { pid, kind: t ? t[1] : 'anki' };
  });
}
function cpuOf(pid) { try { const f = fs.readFileSync('/proc/' + pid + '/stat', 'utf8').split(') ')[1].split(' '); return (Number(f[11]) + Number(f[12])) / 100; } catch (e) { return 0; } }
async function measure(label, during) {
  const ps = procs(); const a = {}; ps.forEach(p => a[p.pid] = cpuOf(p.pid));
  const t0 = Date.now(); await during(); const dt = (Date.now() - t0) / 1000;
  const by = {}; let tot = 0;
  ps.forEach(p => { const d = cpuOf(p.pid) - a[p.pid]; by[p.kind] = (by[p.kind] || 0) + d; tot += d; });
  const pct = (x) => Math.round(x / dt * 100);
  const row = { label, secs: Math.round(dt), total_pct: pct(tot) }; Object.keys(by).forEach(k => row[k + '_pct'] = pct(by[k]));
  console.log(JSON.stringify(row)); return row;
}
const INSTR = `(() => {
  if (window.__kbc) { return 1; }
  const C = window.__kbc = { draw: new Map(), raf: 0 };
  const key = (cv) => cv ? (cv.id || cv.className || 'canvas') : '?';
  const P = CanvasRenderingContext2D.prototype;
  ['clearRect', 'fillRect', 'drawImage', 'putImageData'].forEach(m => { const o = P[m]; P[m] = function () { const k = key(this.canvas) + '.' + m; C.draw.set(k, (C.draw.get(k) || 0) + 1); return o.apply(this, arguments); }; });
  const r = window.requestAnimationFrame; window.requestAnimationFrame = function (f) { C.raf++; return r.call(window, f); };
  return 1; })()`;
(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  const page = await gardenPage();
  await py(KB + 'kb._dialog.resize(1384, 1018); result = 1'); await sleep(1500);
  await page.eval('document.hasFocus = () => true; 1');   // cửa sổ đang dùng (offscreen thì hasFocus = false)
  const info = await page.eval(`({ dpr: devicePixelRatio, vw: innerWidth, vh: innerHeight,
    canvases: Array.from(document.querySelectorAll('canvas')).filter(c => c.offsetParent !== null || getComputedStyle(c).position === 'fixed')
      .map(c => ({ id: c.id || c.className, w: c.width, h: c.height, cssW: Math.round(c.getBoundingClientRect().width), cssH: Math.round(c.getBoundingClientRect().height), hidden: c.hidden })) })`);
  console.log(JSON.stringify(info, null, 1));
  await page.shot(OUT + '/vuon.png');
  const rows = [];
  rows.push(await measure('vuon_mo_dung_yen', () => sleep(SECS * 1000)));
  // rê chuột qua ruộng như video
  const box = await page.eval(`(() => { const r = document.getElementById('kb-canvas').getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()`);
  rows.push(await measure('vuon_mo_re_chuot', async () => {
    const t0 = Date.now(); let i = 0;
    while (Date.now() - t0 < SECS * 1000) {
      const x = box[0] + 20 + (i * 37) % Math.max(40, box[2] - 40), y = box[1] + 20 + (i * 13) % Math.max(40, Math.min(200, box[3] - 40));
      await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y }); i++; await sleep(16);
    }
  }));
  await page.eval(INSTR); await sleep(5000);
  await page.eval('window.__kbc.draw.clear(); window.__kbc.raf = 0; 1');
  await sleep(10000);
  const counts = await page.eval('({ raf: window.__kbc.raf, draw: Array.from(window.__kbc.draw.entries()).sort((a, b) => b[1] - a[1]) })');
  console.log('trong 10 giây: rAF', counts.raf); counts.draw.slice(0, 25).forEach(([k, n]) => console.log('  ' + k + ': ' + n + ' (' + (n / 10).toFixed(1) + '/giây)'));
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(3000);
  rows.push(await measure('vuon_dong', () => sleep(SECS * 1000)));
  fs.writeFileSync(OUT + '/ket_qua.json', JSON.stringify({ info, rows, counts }, null, 1));
  page.close(); process.exit(0);
})().catch(e => { console.error('LỖI:', e.message); process.exit(2); });
