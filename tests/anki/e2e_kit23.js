// kotoba_daily 2.3 — số báo Claude Code có bản dịch `dich` hiện nút Dịch / Hiện bản dịch trong add-on (Anki thật).
// Chạy: KB_SCRIPTS=e2e_kit23.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_kit23';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenPaper !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = 'import sys, os, time, json, shutil, datetime\nkb = sys.modules["kotoba_batake"]\n';
const KIT = require('path').resolve(__dirname, '..', '..', 'kotoba_daily');

(async () => {
  // thư mục kotoba_daily tạm: số hôm nay = số mẫu của bộ 2.3 (có dich)
  await py(KB + `CL = "/tmp/kb_kit23_" + os.environ.get("KB_CTRL_PORT", "9444"); shutil.rmtree(CL, ignore_errors=True)
today = datetime.date.today().isoformat(); os.makedirs(CL + "/bao/" + today)
raw = json.load(open(${JSON.stringify(KIT)} + "/vi_du/bao_mau.json", encoding="utf-8")); raw["ngay"] = today
json.dump(raw, open(CL + "/bao/" + today + "/bao.json", "w", encoding="utf-8"), ensure_ascii=False)
shutil.copy(${JSON.stringify(KIT)} + "/pham_vi.json", CL + "/pham_vi.json")
kb.save_config(bao_dir=CL, bao_source="claude")
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 768); kb._dialog.refresh(); result = 1'); await sleep(1500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenPaper.open("issue"); return 1;'); await sleep(1800);
  console.log('== số Claude Code (kotoba_daily 2.3) có bản dịch');
  ok(await js('return document.querySelectorAll(".kb-p-dbtn").length;') === 10, 'mỗi đoạn (10 đoạn) có nút Dịch');
  ok(await js('return [...document.querySelectorAll(".kb-p-dich")].every(d => getComputedStyle(d).display === "none");'), 'bản dịch ẩn sẵn');
  const db = await js('const b = document.getElementById("kb-p-dich"); return [b.hidden, b.textContent];');
  ok(db[0] === false && db[1] === 'Hiện bản dịch', 'nút đầu bảng là "Hiện bản dịch" (không phải "Dịch số này" của Gemini): ' + db[1]);
  await js('[...document.querySelectorAll(".kb-p-dbtn")][3].click(); return 1;'); await sleep(250);
  ok(await js('const d = [...document.querySelectorAll(".kb-p-dich")][3]; return getComputedStyle(d).display !== "none" && /Lin đến từ Việt Nam/.test(d.textContent);'), 'bấm Dịch ở đoạn đầu truyện: hiện đúng bản dịch đoạn đó');
  await page.shot(SHOTS + '/kit23_dich_mot_doan.png');
  await js('document.getElementById("kb-p-dich").click(); return 1;'); await sleep(250);
  ok(await js('return [...document.querySelectorAll(".kb-p-dich")].every(d => getComputedStyle(d).display !== "none");'), 'Hiện bản dịch: cả số');
  await page.shot(SHOTS + '/kit23_ca_so.png');
  await js('document.getElementById("kb-p-dich").click(); return 1;'); await sleep(200);
  console.log('KẾT QUẢ: ' + pass + '/' + total + (pass === total ? ' đạt' : ' CÓ LỖI'));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
