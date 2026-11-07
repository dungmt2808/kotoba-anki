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
  const tip1 = await js('return document.getElementById("kb-p-info").textContent;');
  ok(/chưa có giọng đọc từng đoạn \(cần VOICEVOX\)/.test(tip1) && /Dịch: xem bản dịch/.test(tip1) && !/▶ để nghe/.test(tip1),
     'số không có giọng đọc: gợi ý nói rõ chưa có giọng đọc (không còn ghi "▶ để nghe"): ' + tip1);
  await page.shot(SHOTS + '/kit23_dich_mot_doan.png');
  await js('document.getElementById("kb-p-dich").click(); return 1;'); await sleep(250);
  ok(await js('return [...document.querySelectorAll(".kb-p-dich")].every(d => getComputedStyle(d).display !== "none");'), 'Hiện bản dịch: cả số');
  await page.shot(SHOTS + '/kit23_ca_so.png');
  await js('document.getElementById("kb-p-dich").click(); return 1;'); await sleep(200);

  console.log('== số có giọng đọc VOICEVOX (bao/2026-11-01 của repo) + bản dịch: nút ▶ vẫn còn cạnh nút Dịch');
  await py(KB + `CL = kb.config()["bao_dir"]; today = datetime.date.today().isoformat(); d = CL + "/bao/" + today
shutil.rmtree(d); shutil.copytree(${JSON.stringify(KIT)} + "/bao/2026-11-01", d)
raw = json.load(open(d + "/bao.json", encoding="utf-8")); raw["ngay"] = today
for b in raw["bai"]:
    b["dich"] = ["Bản dịch tiếng Việt của đoạn %d." % (j + 1) for j in range(len(b["doan"]))]
json.dump(raw, open(d + "/bao.json", "w", encoding="utf-8"), ensure_ascii=False)
kb._played = []
kb._play = lambda t: kb._played.append([t[0], str(t[1]), t[2]])
kb._dialog.refresh()
result = 1`);
  await sleep(1200);
  // hồ sơ thử có sẵn số chưa đọc của báo khác → mở đúng số Claude Code hôm nay từ Kệ báo (như người dùng bấm)
  await js('GardenPaper.close(); GardenPaper.open("shelf"); return 1;'); await sleep(1200);
  await py(KB + 'kb._dialog._paper_lang = "ja"; result = 1');
  await js('document.querySelector("[data-ptab=shelf]").click(); return 1;'); await sleep(1500);
  const dm = (() => { const t = new Date(); return String(t.getDate()).padStart(2, '0') + '/' + String(t.getMonth() + 1).padStart(2, '0'); })();
  ok(await js('const r = [...document.querySelectorAll(".kb-p-row")].find(x => x.textContent.indexOf("' + dm + '") >= 0); if (r) r.click(); return !!r;'), 'Kệ báo có số hôm nay (' + dm + ')');
  await sleep(1800);
  const cnt = await js('const a = [...document.querySelectorAll(".kb-p-text")]; return [a.length, a.filter(p => [...p.querySelectorAll(".kb-p-play")].some(b => b.textContent === "▶")).length, document.querySelectorAll(".kb-p-dbtn").length];');
  const tip2 = await js('return document.getElementById("kb-p-info").textContent;');
  ok(/▶ để nghe/.test(tip2) && /Dịch: xem bản dịch/.test(tip2), 'số có giọng đọc: gợi ý "▶ để nghe": ' + tip2);
  ok(cnt[0] === 8 && cnt[1] === 8 && cnt[2] === 8, 'mỗi đoạn có cả ▶ lẫn Dịch (đoạn / có ▶ / có Dịch: ' + cnt.join(' / ') + ')');
  await js('const p = [...document.querySelectorAll(".kb-p-text")][4]; [...p.querySelectorAll(".kb-p-play")].find(b => b.textContent === "▶").click(); return 1;'); await sleep(600);
  const played = await py(KB + 'result = kb._played');
  ok(played.length === 1 && played[0][0] === 'file' && /bai_3_1\.wav$/.test(played[0][1]), 'bấm ▶ đoạn đầu truyện → phát đúng file VOICEVOX: ' + JSON.stringify(played));
  await page.shot(SHOTS + '/kit23_nghe_va_dich.png');
  console.log('KẾT QUẢ: ' + pass + '/' + total + (pass === total ? ' đạt' : ' CÓ LỖI'));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
