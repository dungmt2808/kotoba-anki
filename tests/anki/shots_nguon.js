// shots_nguon.js SHOTS [TAG] — chụp toàn bộ tab Nguồn báo ở 4 trạng thái + đếm nút / ô chọn đang hiện (1.33.1: người dùng
// thấy "bên set up báo hơi nhiều nút"). Không phải test: chỉ in số đếm + ghi ảnh. Chạy: KB_SCRIPTS=shots_nguon.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_nguon';
const TAG = process.env.KB_TAG || 'truoc';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nfrom aqt import mw\n';
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function waitFor(expr, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
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
async function setCfg(obj, drop) {
  await py(KB + `c = dict(mw.addonManager.getConfig(kb.__name__)); c.update(json.loads(${JSON.stringify(JSON.stringify(obj))}))
for k in ${JSON.stringify(drop || [])}: c.pop(k, None)
mw.addonManager.writeConfig(kb.__name__, c); result = 1`);
}
async function openSrc() {
  await js('GardenPaper.close(); return 1;'); await sleep(300);
  await js('document.getElementById("kb-paper-btn").click(); return 1;');
  await waitFor('return !document.getElementById("kb-paper").hidden;');
  await js('const t = [...document.querySelectorAll(".kb-p-tab")].find((x) => x.getAttribute("data-ptab") === "src"); t.click(); return 1;');
  await waitFor('return !!document.querySelector(".kb-ai-want");', 8000);
  await sleep(700);
}
// đếm thứ người dùng bấm được: nút, ô tick, ô chọn, ô gõ, khối thu gọn — chỉ thứ đang hiện
const COUNT = `const root = document.querySelector(".kb-ai"); if (!root) return null;
  const vis = (e) => { const r = e.getBoundingClientRect(); if (!r.width || !r.height) return false; let p = e; while (p) { if (p.hidden) return false; if (p.tagName === "DETAILS" && !p.open && e.tagName !== "SUMMARY" && !p.querySelector(":scope > summary").contains(e)) return false; p = p.parentElement; } return true; };
  const all = [...root.querySelectorAll("button, input, select, summary")].filter(vis);
  const by = {}; all.forEach((e) => { const k = e.tagName === "INPUT" ? "input:" + e.type : e.tagName.toLowerCase(); by[k] = (by[k] || 0) + 1; });
  return { total: all.length, by, height: root.scrollHeight, text: all.map((e) => (e.textContent || e.value || e.getAttribute("aria-label") || "").trim().slice(0, 24)) };`;
async function capture(name) {
  const c = await js(COUNT);
  // cuộn từng đoạn của khung bảng Báo rồi ghép (khung có thanh cuộn riêng)
  const st = await js('const s = document.querySelector("#kb-paper .kb-p-stage") || document.querySelector(".kb-p-stage"); return s ? [s.scrollHeight, s.clientHeight] : null;');
  const parts = [];
  if (st) {
    for (let y = 0, i = 0; y < st[0] && i < 8; y += st[1] - 40, i++) {
      await js(`const s = document.querySelector(".kb-p-stage"); s.scrollTop = ${y}; return 1;`); await sleep(250);
      const f = `${SHOTS}/${TAG}_${name}_${i}.png`; await page.shot(f); parts.push(f);
    }
    await js('document.querySelector(".kb-p-stage").scrollTop = 0; return 1;');
  }
  console.log(`${name}: ${c ? c.total : '?'} chỗ bấm  ${c ? JSON.stringify(c.by) : ''}  cao ${c ? c.height : '?'} px  (${parts.length} ảnh)`);
  if (c) { console.log('   ' + c.text.join(' | ')); }
  fs.writeFileSync(`${SHOTS}/${TAG}_${name}.json`, JSON.stringify({ count: c, parts, stage: st }, null, 1));
}
(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await py(KB + 'kb._dialog.showNormal(); kb._dialog.resize(1100, 820); result = 1'); await sleep(900);
  // A. dùng hằng ngày: một báo tiếng Nhật đã có số hôm nay (số mẫu của make_fixture), đã bấm Bắt đầu viết
  await setCfg({ gemini_langs: ['ja'], gemini_langs_chosen: true, gemini_wait_start: false, gemini_wait_langs: [],
    paper_confirmed: { ja: 'gemini', en: 'gemini', zh: '', ko: '', vi: '' } });
  await openSrc(); await capture('A_mot_bao');
  // B. hai báo Nhật + Anh, đang dùng
  await setCfg({ gemini_langs: ['ja', 'en'] });
  await openSrc(); await capture('B_hai_bao');
  // C. vừa dán khoá lần đầu, chọn Trung + Hàn, chờ Bắt đầu viết
  await setCfg({ gemini_langs: ['zh', 'ko'], gemini_wait_start: true });
  await openSrc(); await capture('C_trung_han_cho');
  // E. (1.33.1) hai báo, mở "Tuỳ chọn thêm" + dòng Gói báo — mọi tuỳ chọn còn đủ, bố cục bên trong
  await setCfg({ gemini_langs: ['ja', 'en'], gemini_wait_start: false });
  await openSrc();
  await js('document.querySelectorAll(".kb-ai-opts-box, .kb-ai-plan").forEach((d) => { d.open = true; }); return 1;'); await sleep(500);
  await capture('E_mo_tuy_chon');
  await js('document.querySelectorAll(".kb-ai-opts-box, .kb-ai-plan").forEach((d) => { d.open = false; }); return 1;');
  // D. chưa có khoá
  await setCfg({ gemini_key: '', gemini_langs: ['ja'], gemini_wait_start: false });
  await openSrc(); await capture('D_chua_khoa');
  page.close();
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
