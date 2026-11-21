// Ảnh phác (21/11) — hai ý người dùng chọn: (2) THIỆP GIÁNG SINH tự làm (sự kiện tháng 12) và (1) TÔ TRANH THEO SỐ.
// Chưa phải mã thật: vẽ đè lên vườn / bảng Trò chơi / bảng Nhà thật của 1.35.6 trong Anki thật. Hình trên thiệp và tranh tô
// dùng đúng hình pixel của add-on (GardenHome._lib().SPR + sprite(), StackChan đội Mũ Noel bằng GardenFX.lib.paintFace).
// Khung đỏ đánh số như ảnh bài đăng 1.35.6; mock_thiep_to_mau_ghep.py thêm tiêu đề + chú thích.
// Chạy (ANKI_PY = venv aqt; dùng chung Anki mẫu của bai_dang_1356.js):
//   (./run_anki.sh $B 9333 $B.log &) ; node mock_thiep_to_mau.js RAW [bước…] ; python3 mock_thiep_to_mau_ghep.py RAW RA
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_thiep';
const ONLY = process.argv.slice(3);
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const want = (k) => !ONLY.length || ONLY.indexOf(k) >= 0;
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
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
const size = (w, h) => py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`).then(() => sleep(900));
const deck = (name) => py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`).then(() => sleep(1600));
const sky = (h, w) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "${w || 'sunny'}"); return 1;`);
async function closeAll() {
  await js(`try { GardenPaper.close(); } catch (e) {} try { GardenCal.close(); } catch (e) {} try { GardenGames.close(); } catch (e) {}
    try { if (GardenHome.isOpen()) GardenHome.close(); } catch (e) {}
    const s = document.getElementById("kb-stop"); if (s && !document.getElementById("kb-panel").hidden) s.click();
    document.querySelectorAll(".mk-x").forEach((e) => e.remove());
    const say = document.getElementById("kb-say"); if (say) say.hidden = true;
    return 1;`);
  await sleep(700);
  await clearMarks();
}

// ---- khung đỏ đánh số (giống bai_dang_1356.js) -------------------------------------------------------------------------
const CSS = `
.fb-box { position: fixed; z-index: 99990; pointer-events: none; border: 4px solid #e8382f; border-radius: 10px;
  box-shadow: 0 0 0 2px #fff, 0 0 0 5px rgba(232, 56, 47, .25); }
.fb-num { position: fixed; z-index: 99991; pointer-events: none; width: 34px; height: 34px; border-radius: 50%; background: #e8382f;
  color: #fff; font: 800 20px/30px "Noto Sans", "DejaVu Sans", sans-serif; text-align: center; border: 3px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, .35); box-sizing: border-box; }
/* ---- phần vẽ thêm của ảnh phác ---- */
.mk-stage { display: flex; gap: 14px; align-items: flex-start; padding: 4px 2px; }
.mk-col { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.mk-box { border: 3px solid var(--kb-ink); background: var(--kb-paper); box-shadow: 3px 3px 0 var(--kb-ink); padding: 8px 10px; }
.mk-h { font-weight: 700; font-size: 14px; margin-bottom: 6px; display: flex; gap: 8px; align-items: baseline; }
.mk-h small { font-weight: 400; color: var(--kb-ink-3); font-size: 12px; }
.mk-grid { display: grid; gap: 6px; }
.mk-thumb { border: 2px solid var(--kb-ink); background: var(--kb-cream); padding: 2px; position: relative; image-rendering: pixelated; cursor: pointer; }
.mk-thumb.is-on { outline: 3px solid #ffd23f; outline-offset: 1px; background: #fff3c4; }
.mk-thumb.is-lock { opacity: .45; }
.mk-thumb .mk-lockt { position: absolute; right: 2px; bottom: 1px; font-size: 10px; color: var(--kb-ink); background: var(--kb-paper); padding: 0 3px; }
.mk-chips { display: flex; flex-wrap: wrap; gap: 5px; }
.mk-chip { font-size: 12px; padding: 2px 7px; border: 2px solid var(--kb-ink); background: var(--kb-cream); }
.mk-chip.is-on { background: #ffd23f; font-weight: 700; }
.mk-in { width: 100%; box-sizing: border-box; font: inherit; font-size: 14px; padding: 5px 8px; border: 2px solid var(--kb-ink); background: #fff; }
.mk-acts { display: flex; flex-wrap: wrap; gap: 8px; }
.mk-note { font-size: 12px; color: var(--kb-ink-3); line-height: 1.4; }
.mk-cardcv { border: 3px solid var(--kb-ink); box-shadow: 4px 4px 0 var(--kb-ink); image-rendering: pixelated; display: block; }
.mk-pal { display: flex; flex-direction: column; gap: 4px; }
.mk-sw { display: flex; align-items: center; gap: 8px; padding: 3px 6px; border: 2px solid transparent; font-size: 13px; }
.mk-sw.is-on { border-color: var(--kb-ink); background: #fff3c4; font-weight: 700; }
.mk-sw.is-done { color: var(--kb-ink-3); }
.mk-sw i { width: 22px; height: 18px; border: 2px solid var(--kb-ink); flex: none; display: inline-block; }
.mk-sw b { width: 20px; text-align: right; flex: none; }
.mk-bar { height: 14px; border: 2px solid var(--kb-ink); background: var(--kb-cream); position: relative; }
.mk-bar > span { position: absolute; left: 0; top: 0; bottom: 0; background: #3ccb5e; }
.mk-dlg { position: fixed; z-index: 80; background: var(--kb-paper); border: 3px solid var(--kb-ink); box-shadow: 5px 5px 0 var(--kb-ink); padding: 12px 14px; display: flex; flex-direction: column; gap: 8px; }
.mk-dlg h3 { margin: 0; font-size: 16px; }
.mk-tag-new { display: inline-block; font-size: 11px; padding: 0 5px; margin-left: 4px; background: #e8382f; color: #fff; font-weight: 700; vertical-align: 1px; }
`;
const ensureCss = () => js(`if (!document.getElementById("fb-css")) { const s = document.createElement("style"); s.id = "fb-css"; s.textContent = ${JSON.stringify(CSS)}; document.head.appendChild(s); } return 1;`);
const clearMarks = () => js('document.querySelectorAll(".fb-box, .fb-num").forEach((e) => e.remove()); return 1;');
async function mark(marks) {
  await ensureCss();
  const miss = await js(`const out = [];
    ${JSON.stringify(marks)}.forEach((m) => {
      let r = null;
      const rectOf = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return b.width || b.height ? b : null; };
      (m.sels || [m.sel]).forEach((s) => { const b = rectOf(s); if (!b) return;
        r = r ? { left: Math.min(r.left, b.left), top: Math.min(r.top, b.top), right: Math.max(r.right, b.right), bottom: Math.max(r.bottom, b.bottom) }
              : { left: b.left, top: b.top, right: b.right, bottom: b.bottom }; });
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
      if (at === "l") { x = L - 40; y = (T + B) / 2 - 17; }
      if (at === "r") { x = R + 6; y = (T + B) / 2 - 17; }
      x = Math.max(2, Math.min(innerWidth - 36, x)); y = Math.max(2, Math.min(innerHeight - 36, y));
      n.style.left = x + "px"; n.style.top = y + "px";
      document.body.appendChild(n);
    });
    return out;`);
  if (miss.length) { console.log('  thiếu khung:', miss); }
}
async function shot(name, info) {
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  await sleep(400);
  const dims = await page.eval('[innerWidth, innerHeight]');
  await page.send('Emulation.setDeviceMetricsOverride', { width: dims[0], height: dims[1], deviceScaleFactor: 2, mobile: false });
  await sleep(1300);
  const r = await page.send('Page.captureScreenshot', { format: 'png' });
  await page.send('Emulation.clearDeviceMetricsOverride');
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  if (info) { fs.writeFileSync(path.join(OUT, name + '.json'), JSON.stringify(info, null, 1)); }
  console.log('  ảnh', name);
}

// ---- hình vẽ dùng chung (chạy trong trang) ------------------------------------------------------------------------------
// Canvas vẽ ở độ phân giải gấp đôi để ảnh chụp deviceScaleFactor 2 vẫn nét.
const ART = `
window.MK = (function () {
  const L = GardenHome._lib(), F = GardenFX.lib;
  function cv(w, h, cls) {          // w, h: px CSS
    const c = document.createElement("canvas"); c.width = w * 2; c.height = h * 2; c.style.width = w + "px"; c.style.height = h + "px";
    if (cls) { c.className = cls; }
    const x = c.getContext("2d"); x.imageSmoothingEnabled = false; return [c, x];
  }
  function rnd(seed) { let s = seed; return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; }
  // món pixel của add-on (sprite có sẵn) vào ô thumb w × h px CSS, căn giữa, phóng nguyên lần
  function itemThumb(id, w, h) {
    const rows = L.SPR[id]; const [c, x] = cv(w, h, "mk-thumbcv");
    if (!rows) { return c; }
    const rw = rows[0].length, rh = rows.length, S = Math.max(1, Math.floor(Math.min((w * 2 - 8) / rw, (h * 2 - 8) / rh)));
    L.sprite(x, rows, Math.floor((w * 2 / S - rw) / 2), Math.floor((h * 2 / S - rh) / 2), S, L.P);
    return c;
  }
  function stackchan(w, h) {
    const [c, x] = cv(w, h, "mk-thumbcv");
    const s = Math.max(1, Math.floor(Math.min((w * 2 - 8) / F.FACE_W, (h * 2 - 8) / F.FACE_H)));
    x.translate(Math.floor((w * 2 - F.FACE_W * s) / 2), Math.floor((h * 2 - F.FACE_H * s) / 2));
    F.paintFace(x, s, "happy", 0, 0, { head: "santa" });
    return c;
  }
  // ---- thiệp: 120 × 80 "điểm" ----
  const FRAMES = {
    den:  { name: "Đèn nháy", sky: ["#1f2b52", "#2b3d70"] },
    tuyet:{ name: "Tuyết trắng", sky: ["#8fb8e8", "#bcd6f2"] },
    thong:{ name: "Cành thông", sky: ["#2b4a3a", "#3b6a50"] },
    qua:  { name: "Giấy quà", sky: ["#7a1f2a", "#a8303e"] },
  };
  function drawCard(x, S, opt) {
    const W = 120, H = 80, fr = FRAMES[opt.frame || "den"], R = rnd(opt.seed || 7);
    const box = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a * S, b * S, w * S, h * S); };
    box(0, 0, W, H, fr.sky[0]); box(0, 34, W, 32, fr.sky[1]);
    for (let i = 0; i < 70; i++) { box(Math.floor(R() * W), Math.floor(R() * 62), 1, 1, i % 5 ? "#ffffff" : "#ffd23f"); }
    box(0, 64, W, 16, "#eef3f8"); for (let i = 0; i < W; i += 7) { box(i, 63, 4, 1, "#eef3f8"); box(i + 2, 66, 3, 1, "#d5e2ee"); }
    // khung
    if (opt.frame === "thong") {
      for (let i = 0; i < W; i += 3) { box(i, 0, 3, 3, i % 2 ? "#2e8b3a" : "#1f5f2a"); box(i, H - 3, 3, 3, i % 2 ? "#1f5f2a" : "#2e8b3a"); }
      for (let j = 0; j < H; j += 3) { box(0, j, 3, 3, j % 2 ? "#2e8b3a" : "#1f5f2a"); box(W - 3, j, 3, 3, j % 2 ? "#1f5f2a" : "#2e8b3a"); }
      for (let i = 6; i < W; i += 14) { box(i, 1, 2, 2, "#ff4f6d"); }
    } else if (opt.frame === "qua") {
      box(0, 0, W, 3, "#c21f3a"); box(0, H - 3, W, 3, "#c21f3a"); box(0, 0, 3, H, "#c21f3a"); box(W - 3, 0, 3, H, "#c21f3a");
      box(W / 2 - 2, 0, 4, 3, "#ffd23f"); box(W / 2 - 2, H - 3, 4, 3, "#ffd23f");
    } else if (opt.frame === "tuyet") {
      box(0, 0, W, 2, "#ffffff"); box(0, H - 2, W, 2, "#ffffff"); box(0, 0, 2, H, "#ffffff"); box(W - 2, 0, 2, H, "#ffffff");
      for (let i = 4; i < W; i += 8) { box(i, 2, 1, 2, "#ffffff"); }
    } else {
      box(0, 0, W, 2, "#1b1b2f"); box(0, H - 2, W, 2, "#1b1b2f"); box(0, 0, 2, H, "#1b1b2f"); box(W - 2, 0, 2, H, "#1b1b2f");
      const C = ["#ff4f6d", "#ffd23f", "#3ccb5e", "#3d8bff"];
      for (let i = 3, k = 0; i < W - 3; i += 6, k++) { box(i, 2 + (k % 2), 6, 1, "#1b1b2f"); box(i + 2, 3 + (k % 2), 2, 2, C[k % 4]); }
    }
    if (opt.empty) { return; }
    // sticker
    const put = (id, a, b) => { if (L.SPR[id]) { L.sprite(x, L.SPR[id], a, b, S, L.P); } };
    put("xmastree", 4, 64 - 44 + 2);
    put("presents", 30, 50);
    put("yukidaruma", 92, 64 - (L.SPR.yukidaruma ? L.SPR.yukidaruma.length : 16) + 2);
    // StackChan đội Mũ Noel
    x.save(); x.translate(70 * S, 46 * S); F.paintFace(x, S, "happy", 0, 0, { head: "santa" }); x.restore();
  }
  function cardText(x, S, lines) {          // chữ chúc vẽ ở độ phân giải thật (không pixel hoá) — giống chữ trong add-on
    x.save(); x.textAlign = "center";
    lines.forEach((l) => {
      x.font = l.font; x.fillStyle = "rgba(0,0,0,.55)"; x.fillText(l.t, l.x * S + 2, l.y * S + 2);
      x.fillStyle = l.col || "#fff8e6"; x.fillText(l.t, l.x * S, l.y * S);
    });
    x.restore();
  }
  // ---- tranh tô theo số: cây thông Noel 32 × 44 của add-on + nền trời đêm ----
  function picture() {
    const rows = L.SPR.xmastree, H = rows.length, W = rows[0].length;
    const cnt = {}; rows.join("").split("").forEach((c) => { cnt[c] = (cnt[c] || 0) + 1; });
    const order = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a]);
    const col = (c) => c === "." ? "#2b3a67" : L.P[c];
    const num = {}; order.forEach((c, i) => { num[c] = i + 1; });
    return { W, H, rows, order, cnt, col, num };
  }
  // painted(c, i, j) → true nếu ô đã tô; sel: số đang chọn
  function drawBoard(x, cell, pic, painted, sel) {
    const S = cell * 2;
    for (let j = 0; j < pic.H; j++) {
      for (let i = 0; i < pic.W; i++) {
        const c = pic.rows[j].charAt(i), n = pic.num[c];
        if (painted(c, i, j)) { x.fillStyle = pic.col(c); x.fillRect(i * S, j * S, S, S); continue; }
        x.fillStyle = n === sel ? "#ffe680" : "#fbf6ea"; x.fillRect(i * S, j * S, S, S);
        x.strokeStyle = "#e3d6bf"; x.lineWidth = 1; x.strokeRect(i * S + 0.5, j * S + 0.5, S - 1, S - 1);
        x.fillStyle = n === sel ? "#4a3426" : "#a8957f"; x.font = (n === sel ? "bold " : "") + Math.round(S * 0.58) + "px 'Noto Sans CJK JP', sans-serif";
        x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(n), i * S + S / 2, j * S + S / 2 + 1);
      }
    }
  }
  return { cv, itemThumb, stackchan, drawCard, cardText, FRAMES, picture, drawBoard, L };
})(); 1;`;

// ---- T1. lối vào sự kiện -------------------------------------------------------------------------------------------------
async function stepT1() {
  await closeAll(); await size(1366, 860);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await sky(19, 'snow'); await sleep(800);
  await js(`window.scrollTo(0, 0);
    const card = document.getElementById("kb-today");
    if (!card || card.offsetParent === null) { const t = document.getElementById("kb-today-tog"); if (t) t.click(); }
    return 1;`);
  await sleep(500);
  // dòng Tin làng của thẻ Hôm nay đổi thành dòng sự kiện (trong tháng 12 Tin làng nhường chỗ cho sự kiện)
  await js(`const b = document.getElementById("kb-news-btn"); b.hidden = false; b.style.background = "#ffe1e8";
    b.innerHTML = "<b>Giáng sinh</b>: làm thiệp · quà 5/24 ▸";
    const chip = document.getElementById("kb-theme-chip");
    if (chip && !chip.querySelector(".mk-tag-new")) { const t = document.createElement("span"); t.className = "mk-tag-new mk-x"; t.textContent = "Sự kiện"; chip.appendChild(t); }
    return 1;`);
  await ensureCss();
  await mark([
    { sel: '#kb-theme-chip', n: 1, at: 'tl' },
    { sel: '#kb-news-btn', n: 2, at: 'l', pad: 3 },
  ]);
  await shot('t1_loi_vao', { title: 'Ảnh phác · Thiệp Giáng sinh (1/3): lối vào sự kiện', items: [
    'Chip Giáng sinh trên thanh trên có nhãn "Sự kiện" (1/12 – 31/12); bấm mở bảng sự kiện',
    'Thẻ Hôm nay có dòng sự kiện: làm thiệp + lịch mở quà (mỗi ngày đạt mục tiêu ôn mở 1 ô, 24 ô tới 24/12)',
  ] });
  await clearMarks();
}

// ---- T2. Xưởng thiệp ---------------------------------------------------------------------------------------------------------
async function stepT2() {
  await closeAll(); await size(1366, 860); await sky(10);
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js(`if (document.getElementById("kb-g-garden").getAttribute("aria-pressed") !== "true") document.getElementById("kb-g-garden").click(); return 1;`); await sleep(700);
  await page.eval(ART);
  await js(`const M = window.MK;
    document.getElementById("kb-g-title").innerHTML = '<span lang="ja">クリスマスカード</span> · Xưởng thiệp Giáng sinh';
    document.getElementById("kb-g-hud").innerHTML = '<span class="kb-g-chip">Thiệp 1 / 3</span>';
    const st = document.getElementById("kb-g-stage"); st.innerHTML = "";
    const wrap = document.createElement("div"); wrap.className = "mk-stage"; st.appendChild(wrap);
    // trái: thiệp + lời chúc
    const left = document.createElement("div"); left.className = "mk-col"; wrap.appendChild(left);
    const S = 10, [c, x] = M.cv(600, 400, "mk-cardcv"); c.id = "mk-card"; left.appendChild(c);
    M.drawCard(x, S, { frame: "den", seed: 11 });
    M.cardText(x, S, [{ t: "Giáng sinh an lành!", x: 60, y: 18, font: "bold 56px 'Noto Sans CJK JP', sans-serif" },
      { t: "メリークリスマス", x: 60, y: 28, font: "34px 'Noto Sans CJK JP', sans-serif", col: "#ffd23f" },
      { t: "— Lan gửi cả nhà", x: 98, y: 76.5, font: "26px 'Noto Sans CJK JP', sans-serif", col: "#4a3426" }]);
    const msg = document.createElement("div"); msg.className = "mk-box"; msg.id = "mk-msg";
    msg.innerHTML = '<div class="mk-h">Lời chúc <small>tối đa 2 dòng · 40 ký tự</small></div>' +
      '<input class="mk-in" value="Giáng sinh an lành!"><input class="mk-in" style="margin-top:6px" value="— Lan gửi cả nhà">' +
      '<div class="mk-chips" style="margin-top:6px"><span class="mk-chip is-on" lang="ja">メリークリスマス</span><span class="mk-chip">Merry Christmas</span>' +
      '<span class="mk-chip" lang="zh">圣诞快乐</span><span class="mk-chip" lang="ko">메리 크리스마스</span><span class="mk-chip">Frohe Weihnachten</span><span class="mk-chip">Joyeux Noël</span></div>';
    left.appendChild(msg);
    // phải: khung, sticker, nút
    const right = document.createElement("div"); right.className = "mk-col"; right.style.flex = "1 1 auto"; wrap.appendChild(right);
    const fb = document.createElement("div"); fb.className = "mk-box"; fb.id = "mk-frames";
    fb.innerHTML = '<div class="mk-h">Khung thiệp <small>4 khung</small></div>';
    const fg = document.createElement("div"); fg.className = "mk-grid"; fg.style.gridTemplateColumns = "repeat(4, 1fr)"; fb.appendChild(fg);
    Object.keys(M.FRAMES).forEach((k, i) => { const t = document.createElement("div"); t.className = "mk-thumb" + (i === 0 ? " is-on" : "");
      const [cc, xx] = M.cv(120, 80); M.drawCard(xx, 2, { frame: k, seed: 3 + i, empty: true }); cc.style.width = "100%"; cc.style.height = "auto"; t.appendChild(cc);
      const n = document.createElement("div"); n.className = "mk-note"; n.style.textAlign = "center"; n.textContent = M.FRAMES[k].name; t.appendChild(n); fg.appendChild(t); });
    right.appendChild(fb);
    const sb = document.createElement("div"); sb.className = "mk-box"; sb.id = "mk-stickers";
    sb.innerHTML = '<div class="mk-h">Sticker <small>kéo vào thiệp · mở 5 / 24 ô quà</small></div>';
    const sg = document.createElement("div"); sg.className = "mk-grid"; sg.style.gridTemplateColumns = "repeat(6, 1fr)"; sb.appendChild(sg);
    const ids = ["xmastree", "presents", "yukidaruma", "__sc", "wreath", "sleigh", "yukiusagi", "kamakura", "starlamp", "lantern", "kadomatsu", "hoshizora"];
    ids.forEach((id, i) => { const t = document.createElement("div"); t.className = "mk-thumb" + (i >= 6 ? " is-lock" : "");
      t.appendChild(id === "__sc" ? M.stackchan(56, 48) : M.itemThumb(id, 56, 48));
      if (i >= 6) { const l = document.createElement("span"); l.className = "mk-lockt"; l.textContent = "ô quà " + [7, 9, 12, 15, 18, 24][i - 6]; t.appendChild(l); }
      sg.appendChild(t); });
    const own = document.createElement("div"); own.className = "mk-acts"; own.style.marginTop = "8px";
    own.innerHTML = '<button type="button" class="kb-btn kb-btn-small">Đồ trong vườn của bạn ▸</button><button type="button" class="kb-btn kb-btn-small">Vẽ sticker riêng ở Xưởng ▸</button>';
    sb.appendChild(own);
    right.appendChild(sb);
    const ab = document.createElement("div"); ab.className = "mk-box"; ab.id = "mk-acts";
    ab.innerHTML = '<div class="mk-h">Xong thiệp</div><div class="mk-acts">' +
      '<button type="button" class="kb-btn kb-h-buy">Lưu ảnh PNG</button><button type="button" class="kb-btn">Chép mã thiệp</button>' +
      '<button type="button" class="kb-btn">Treo trong nhà</button><button type="button" class="kb-btn kb-btn-small">Gửi lên trang ▸</button></div>' +
      '<div class="mk-note" style="margin-top:6px">Lưu tối đa 3 thiệp · làm thiệp không tốn xu</div>';
    right.appendChild(ab);
    window.scrollTo(0, 0); return 1;`);
  await sleep(600);
  await mark([
    { sel: '#mk-card', n: 1, at: 'tl' },
    { sel: '#mk-msg', n: 2, at: 'l' },
    { sel: '#mk-frames', n: 3, at: 'tl' },
    { sel: '#mk-stickers', n: 4, at: 'tl' },
    { sel: '#mk-acts', n: 5, at: 'tl' },
  ]);
  await shot('t2_xuong_thiep', { title: 'Ảnh phác · Thiệp Giáng sinh (2/3): xưởng làm thiệp', items: [
    'Thiệp pixel 120 × 80: kéo sticker vào, bấm để dời / lật / bỏ; vẽ thêm bằng bút như Xưởng',
    'Lời chúc 2 dòng; câu "Giáng sinh vui vẻ" bằng tiếng của deck bạn học bấm là thêm vào',
    'Chọn 1 trong 4 khung: đèn nháy, tuyết trắng, cành thông, giấy quà',
    'Sticker là hình của vườn (cây thông, quà, người tuyết, StackChan đội Mũ Noel…): 6 có sẵn, 6 mở dần ở các ô của lịch mở quà; dùng được cả đồ bạn đã có và hình tự vẽ ở Xưởng',
    'Lưu ảnh PNG để đăng nhóm, chép mã để gửi bạn, treo thiệp trong nhà',
  ] });
  await clearMarks();
}

// ---- T3. thiệp treo trong nhà + nhận thiệp bằng mã -------------------------------------------------------------------------
async function roomOverlay(drawFn) {
  await js('if (!GardenHome.isOpen()) GardenHome.open("room"); return 1;'); await sleep(1300);
  await js('const t = document.querySelector(\'.kb-h-tab[data-tab="room"]\'); if (t) t.click(); return 1;'); await sleep(700);
  await js('window.scrollTo(0, 0); return 1;'); await sleep(300);
  await page.eval(ART);
  // lớp vẽ cố định (position: fixed) phủ đúng canvas phòng lúc trang ở đầu (không cuộn)
  return js(`const M = window.MK, L = M.L, cvs = document.getElementById("kb-home-canvas");
    let g = document.getElementById("mk-roomfx"); if (!g) { g = document.createElement("canvas"); g.id = "mk-roomfx"; g.className = "mk-x"; document.body.appendChild(g); }
    const cr = cvs.getBoundingClientRect();
    g.width = cr.width * 2; g.height = cr.height * 2; g.style.cssText = "position:fixed;z-index:60;pointer-events:none;image-rendering:pixelated;left:" + cr.left + "px;top:" + cr.top + "px;width:" + cr.width + "px;height:" + cr.height + "px";
    const x = g.getContext("2d"); x.imageSmoothingEnabled = false;
    const S = cr.width * 2 / 160;     // điểm ảnh canvas / ô điểm của phòng (160 × 88)
    (${drawFn})(x, S, M, L);
    return [cr.left, cr.top, cr.width, cr.height, S, cvs.width, cvs.height];`);
}
async function stepT3() {
  await closeAll(); await size(1366, 860); await sky(19, 'snow');
  const r = await roomOverlay(`function (x, S, M, L) {
    // dây treo thiệp trên tường, từ x = 30 tới 132, y ≈ 16..20; 4 tấm thiệp nhỏ 14 × 10
    x.strokeStyle = "#7a4a1f"; x.lineWidth = Math.max(2, S * 0.5);
    x.beginPath(); x.moveTo(30 * S, 15 * S); x.quadraticCurveTo(81 * S, 22 * S, 132 * S, 15 * S); x.stroke();
    const cards = [["den", 40], ["thong", 62], ["qua", 86], ["tuyet", 110]];
    cards.forEach(([fr, cx], i) => {
      const t = (cx - 30) / 102, cy = 15 + 4 * (1 - Math.pow(2 * t - 1, 2)) * 1.75;
      const [c, cc] = M.cv(120, 80); M.drawCard(cc, 2, { frame: fr, seed: 21 + i });
      x.save(); x.translate((cx) * S, (cy + 1) * S); x.rotate((i % 2 ? 1 : -1) * 0.06);
      x.drawImage(c, -8 * S, 0, 16 * S, 10.7 * S);
      x.fillStyle = "#c8a46a"; x.fillRect(-1 * S, -1 * S, 2 * S, 2 * S);      // kẹp gỗ
      x.restore();
    });
  }`);
  // hộp "Nhận thiệp" (dán mã) + bản xem trước thiệp của bạn
  await js(`const M = window.MK;
    const d = document.createElement("div"); d.className = "mk-dlg mk-x"; d.id = "mk-recv";
    d.innerHTML = '<h3>Nhận thiệp của bạn bè</h3><div class="mk-note">Dán mã thiệp (KB1:…) bạn bè gửi — thiệp treo lên dây trong nhà, không tốn xu.</div>' +
      '<input class="mk-in" value="KB1:thiep·Rk9YLm5vZWwuMjAyNi…">';
    const [c, x] = M.cv(300, 200, "mk-cardcv"); M.drawCard(x, 5, { frame: "thong", seed: 5 });
    M.cardText(x, 5, [{ t: "Merry Christmas!", x: 60, y: 18, font: "bold 26px 'Noto Sans CJK JP', sans-serif" },
      { t: "— Minh", x: 104, y: 76.5, font: "16px 'Noto Sans CJK JP', sans-serif", col: "#4a3426" }]);
    d.appendChild(c);
    const a = document.createElement("div"); a.className = "mk-acts";
    a.innerHTML = '<button type="button" class="kb-btn kb-h-buy">Treo lên dây</button><button type="button" class="kb-btn">Để sau</button>';
    d.appendChild(a); document.body.appendChild(d);
    d.style.right = "28px"; d.style.top = "170px"; d.style.width = "330px";
    // nút trên thanh bảng Nhà
    const top = document.querySelector("#kb-home .kb-game-top"), snap = document.getElementById("kb-h-snap");
    const b = document.createElement("button"); b.type = "button"; b.id = "mk-recv-btn"; b.className = "kb-btn kb-btn-small mk-x"; b.textContent = "Nhận thiệp"; top.insertBefore(b, snap);
    window.scrollTo(0, 0); return 1;`);
  await sleep(500);
  // vị trí dây thiệp trên màn hình: canvas phủ r = [left, top, w, h]; dây ở x 26..136, y 10..30 (ô phòng)
  const k = r[2] / 160;
  await js(`const f = document.createElement("div"); f.id = "mk-line"; f.className = "mk-x"; f.style.cssText = "position:fixed;pointer-events:none;left:${r[0] + 26 * k}px;top:${r[1] + 10 * k}px;width:${110 * k}px;height:${22 * k}px"; document.body.appendChild(f); return 1;`);
  await mark([
    { sel: '#mk-line', n: 1, at: 'tl', pad: 2 },
    { sel: '#mk-recv-btn', n: 2, at: 'tl' },
    { sel: '#mk-recv', n: 3, at: 'tl' },
  ]);
  await shot('t3_treo_thiep', { title: 'Ảnh phác · Thiệp Giáng sinh (3/3): treo thiệp, nhận thiệp của bạn', items: [
    'Dây treo thiệp trên tường phòng: thiệp mình làm và thiệp bạn bè gửi (tối đa 6 tấm); bấm vào thiệp để xem to',
    'Nút "Nhận thiệp" trên bảng Nhà (chỉ hiện trong tháng 12)',
    'Dán mã thiệp bạn gửi → xem trước → treo lên dây. Mã chỉ chứa hình + chữ trên thiệp, không có gì về deck của bạn',
  ] });
  await clearMarks();
}

// ---- C1. Trò chơi: ô thứ 6 "Tô tranh" ----------------------------------------------------------------------------------------
async function stepC1() {
  await closeAll(); await size(1366, 860); await sky(10);
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(1000);
  await js(`if (document.getElementById("kb-g-garden").getAttribute("aria-pressed") === "true") document.getElementById("kb-g-garden").click(); return 1;`); await sleep(500);
  await page.eval(ART);
  await js(`const M = window.MK, ref = document.querySelector(".kb-gcard[data-game=memory]").parentElement;
    const cell = ref.cloneNode(true); cell.classList.add("mk-x"); cell.id = "mk-tocell";
    const card = cell.querySelector(".kb-gcard"); card.setAttribute("data-game", "paint");
    card.querySelector(".kb-gcard-jp").textContent = "塗り絵";
    card.querySelector(".kb-gcard-vi").textContent = "6. Tô tranh";
    card.querySelector(".kb-gcard-desc").textContent = "Tô tranh pixel theo số cho thư giãn — không phải học từ. Đạt mục tiêu ngày thì mở 1 bức mới.";
    card.querySelector(".kb-gcard-best").innerHTML = "Mùa đông: 3 / 12 bức · <b>hôm nay mở 1 bức</b>";
    const old = card.querySelector(".kb-gcard-icon"), [ic, ix] = M.cv(84, 72, "kb-gcard-icon");
    const pic = M.picture(); ix.fillStyle = "#fbf6ea"; ix.fillRect(0, 0, 168, 144);
    ix.save(); ix.translate(36, 4); M.drawBoard(ix, 1.55, pic, (c, i, j) => j > 14 || (j > 8 && i % 3), 0); ix.restore();
    old.replaceWith(ic);
    const opt = cell.querySelector(".kb-gopts"); if (opt) { opt.querySelectorAll("select").forEach((s, k) => { s.innerHTML = k ? "" : "<option>Bộ tranh: Mùa đông (12 bức)</option>"; if (k) s.remove(); }); }
    ref.parentElement.appendChild(cell);
    // dòng chú thích dưới bảng
    window.scrollTo(0, 0); return 1;`);
  await sleep(500);
  await mark([{ sel: '#mk-tocell', n: 1, at: 'tl' }]);
  await shot('c1_tro_choi', { title: 'Ảnh phác · Tô tranh theo số (1/3): ô thứ 6 trong bảng Trò chơi', items: [
    'Ô "6. Tô tranh" ở chỗ trống của bảng Trò chơi; chọn bộ tranh (mùa đông, Tết, hoa anh đào…). Không ghi lịch ôn, không cần cấu hình trường',
  ] });
  await clearMarks();
}

// ---- C2. màn tô ---------------------------------------------------------------------------------------------------------------
async function stepC2() {
  await closeAll(); await size(1366, 860); await sky(10);
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(900);
  await js(`if (document.getElementById("kb-g-garden").getAttribute("aria-pressed") !== "true") document.getElementById("kb-g-garden").click(); return 1;`); await sleep(700);
  await page.eval(ART);
  await js(`const M = window.MK, pic = M.picture();
    document.getElementById("kb-g-title").innerHTML = '<span lang="ja">塗り絵</span> · Tô tranh — Cây thông Noel';
    document.getElementById("kb-g-hud").innerHTML = '<span class="kb-g-chip">Mùa đông 4 / 12</span>';
    const st = document.getElementById("kb-g-stage"); st.innerHTML = "";
    const wrap = document.createElement("div"); wrap.className = "mk-stage"; st.appendChild(wrap);
    const cell = 14, [c, x] = M.cv(pic.W * cell, pic.H * cell, "mk-cardcv"); c.id = "mk-board";
    const SEL = 5;
    const painted = (ch, i, j) => { const n = pic.num[ch]; return n <= 3 || (n === 4 && (j < 22 || i % 2)) || (n === 6 && j < 12); };
    M.drawBoard(x, cell, pic, painted, SEL);
    const bw = document.createElement("div"); bw.className = "mk-col"; bw.appendChild(c); wrap.appendChild(bw);
    const right = document.createElement("div"); right.className = "mk-col"; right.style.flex = "1 1 auto"; wrap.appendChild(right);
    // bảng màu
    const pb = document.createElement("div"); pb.className = "mk-box"; pb.id = "mk-pal";
    pb.innerHTML = '<div class="mk-h">Bảng màu <small>bấm số rồi tô các ô có số đó</small></div>';
    const pal = document.createElement("div"); pal.className = "mk-pal"; pal.style.display = "grid"; pal.style.gridTemplateColumns = "repeat(2, 1fr)"; pb.appendChild(pal);
    let left = 0, total = 0;
    pic.order.forEach((ch) => {
      const n = pic.num[ch]; let rest = 0;
      pic.rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { if (r.charAt(i) === ch) { total++; if (!painted(ch, i, j)) { rest++; left++; } } } });
      const s = document.createElement("div"); s.className = "mk-sw" + (n === SEL ? " is-on" : "") + (rest ? "" : " is-done");
      s.innerHTML = '<b>' + n + '</b><i style="background:' + pic.col(ch) + '"></i><span>' + (rest ? "còn " + rest + " ô" : "xong ✓") + '</span>';
      pal.appendChild(s);
    });
    right.appendChild(pb);
    const pr = document.createElement("div"); pr.className = "mk-box"; pr.id = "mk-prog";
    const pct = Math.round((total - left) / total * 100);
    pr.innerHTML = '<div class="mk-h">Đã tô ' + pct + '% <small>' + (total - left) + ' / ' + total + ' ô · tự lưu, mai tô tiếp được</small></div><div class="mk-bar"><span style="width:' + pct + '%"></span></div>';
    right.appendChild(pr);
    const tb = document.createElement("div"); tb.className = "mk-box"; tb.id = "mk-tools";
    tb.innerHTML = '<div class="mk-h">Cách tô</div><div class="mk-acts"><button type="button" class="kb-btn kb-btn-small" style="background:#ffd23f">Bấm từng ô</button>' +
      '<button type="button" class="kb-btn kb-btn-small">Kéo chuột tô liền</button><button type="button" class="kb-btn kb-btn-small">Tìm ô còn sót</button>' +
      '<button type="button" class="kb-btn kb-btn-small">Phóng to ＋</button></div>' +
      '<div class="mk-note" style="margin-top:6px">Tô nhầm số thì ô không nhận màu (không bị phạt). Phím 1–9 chọn số, Z hoàn tác.</div>';
    right.appendChild(tb);
    window.scrollTo(0, 0); return 1;`);
  await sleep(600);
  await mark([
    { sel: '#mk-board', n: 1, at: 'tl' },
    { sel: '#mk-pal', n: 2, at: 'tl' },
    { sel: '#mk-prog', n: 3, at: 'tl' },
    { sel: '#mk-tools', n: 4, at: 'tl' },
  ]);
  await shot('c2_man_to', { title: 'Ảnh phác · Tô tranh theo số (2/3): màn tô', items: [
    'Tranh pixel lấy từ chính hình trong vườn (đây là cây thông Noel 32 × 44 ô); ô của số đang chọn sáng vàng',
    'Bảng màu đánh số, ghi còn bao nhiêu ô; màu tô xong có dấu ✓',
    'Tiến độ tự lưu: tô dở thoát ra, hôm sau tô tiếp',
    'Bấm từng ô hoặc kéo chuột tô liền, nút tìm ô còn sót, phóng to; tô nhầm số thì ô không nhận màu',
  ] });
  await clearMarks();
}

// ---- C3. tô xong → treo lên tường ---------------------------------------------------------------------------------------------
async function stepC3() {
  await closeAll(); await size(1366, 860); await sky(10);
  const r = await roomOverlay(`function (x, S, M, L) {
    const pic = M.picture();
    // tranh treo ở tường bên trái cửa sổ: khung gỗ 18 × 24 ô điểm, ở x = 18, y = 12
    const fx = 38, fy = 13, fw = 18, fh = 24;
    x.fillStyle = "#7a4a1f"; x.fillRect(fx * S, fy * S, fw * S, fh * S);
    x.fillStyle = "#c8a46a"; x.fillRect((fx + 1) * S, (fy + 1) * S, (fw - 2) * S, (fh - 2) * S);
    const iw = fw - 4, ih = fh - 4, k = Math.min(iw / pic.W, ih / pic.H);
    x.save(); x.translate((fx + 2) * S, (fy + 2) * S); x.scale(k * S, k * S);
    for (let j = 0; j < pic.H; j++) { for (let i = 0; i < pic.W; i++) { x.fillStyle = pic.col(pic.rows[j].charAt(i)); x.fillRect(i, j, 1.02, 1.02); } }
    x.restore();
  }`);
  await js(`const M = window.MK, pic = M.picture();
    const d = document.createElement("div"); d.className = "mk-dlg mk-x"; d.id = "mk-done";
    d.innerHTML = '<h3>Tô xong “Cây thông Noel”! <span style="color:#2e8b3a">+10 xu</span></h3><div class="mk-note">Tranh vào Kho đồ như một món nội thất — treo ở tường gian nào cũng được.</div>';
    const [c, x] = M.cv(pic.W * 6, pic.H * 6, "mk-cardcv"); M.drawBoard(x, 6, pic, () => true, 0); c.style.margin = "0 auto"; d.appendChild(c);
    const a = document.createElement("div"); a.className = "mk-acts";
    a.innerHTML = '<button type="button" class="kb-btn kb-h-buy">Treo lên tường</button><button type="button" class="kb-btn">Lưu ảnh PNG</button><button type="button" class="kb-btn">Để vào Kho đồ</button>';
    d.appendChild(a); document.body.appendChild(d);
    d.style.right = "28px"; d.style.top = "150px"; d.style.width = "330px";
    window.scrollTo(0, 0); return 1;`);
  await sleep(500);
  const k = r[2] / 160;
  await js(`const f = document.createElement("div"); f.id = "mk-frame"; f.className = "mk-x"; f.style.cssText = "position:fixed;pointer-events:none;left:${r[0] + 38 * k}px;top:${r[1] + 13 * k}px;width:${18 * k}px;height:${24 * k}px"; document.body.appendChild(f); return 1;`);
  await mark([
    { sel: '#mk-done', n: 1, at: 'tl' },
    { sel: '#mk-frame', n: 2, at: 'tl', pad: 4 },
  ]);
  await shot('c3_treo_tranh', { title: 'Ảnh phác · Tô tranh theo số (3/3): tô xong → treo lên tường', items: [
    'Tô xong: +10 xu (mỗi ngày tối đa 1 bức có thưởng) và tranh vào Kho đồ',
    'Treo ở tường của bất kỳ gian nào như tranh mua ở cửa hàng; mỗi bức tô xong là một món riêng của bạn',
  ] });
  await clearMarks();
}

(async () => {
  page = await gardenPage();
  if (!page) { await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000); page = await gardenPage(); }
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await ensureCss();
  if (want('t1')) { await stepT1(); }
  if (want('t2')) { await stepT2(); }
  if (want('t3')) { await stepT3(); }
  if (want('c1')) { await stepC1(); }
  if (want('c2')) { await stepC2(); }
  if (want('c3')) { await stepC3(); }
  await closeAll();
  console.log('lỗi JS:', page.errors);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
