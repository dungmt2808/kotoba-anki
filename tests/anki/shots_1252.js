// 1.25.2 "Một làng, một truyện" — chụp ba báo của CÙNG một ngày do Gemini thật viết (tests/fixtures/ngay_1252, ngày
// 09/11/2026: bản gốc kỳ 2 "Lời kể lúc bình minh" → báo Nhật N4 / báo Anh A2 kể lại, báo tiếng Việt in thẳng bản gốc).
// Số báo được chép vào thư mục báo của add-on với ngày hôm nay (không gọi mạng):
//   1252_bao_viet / 1252_bao_viet_truyen   Báo Làng Kotoba (chỉ tiếng Việt): Tin làng · Truyện dài kỳ · Cột ngắn
//   1252_bao_nhat_truyen / 1252_bao_anh_truyen   cùng kỳ truyện ở báo Nhật / báo Anh
//   1252_nguon_bao   tab Nguồn báo khi chọn Nhật + Anh (khối báo, Truyện, Chủ đề truyện)
// Chạy: KB_SCRIPTS=shots_1252.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1252';
fs.mkdirSync(SHOTS, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const FIX = path.join(__dirname, '..', 'fixtures', 'ngay_1252');
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof GardenPaper !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const KB = 'import sys, os, time, json, shutil, datetime\nkb = sys.modules["kotoba_batake"]\nfrom aqt import mw\n';
let errs = 0;
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) errs++; };
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await page.eval(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
async function shot(name) { await page.shot(SHOTS + '/' + name + '.png'); }
async function scrollTo(kind) {
  await js(`const k = [...document.querySelectorAll("#kb-p-stage .kb-p-kind")].find((x) => x.textContent.indexOf(${JSON.stringify(kind)}) === 0);
    if (!k) return 0;
    let sc = k.parentElement; while (sc && sc !== document.body && !(sc.scrollHeight > sc.clientHeight + 4 && /auto|scroll/.test(getComputedStyle(sc).overflowY))) sc = sc.parentElement;
    if (sc && sc !== document.body) sc.scrollTop += k.getBoundingClientRect().top - sc.getBoundingClientRect().top - 12;
    window.scrollTo(0, 0); document.scrollingElement.scrollTop = 0; return 1;`);
  await sleep(500);
}
async function openIssue(lang) {
  await py(KB + `kb._dialog._paper_lang = ${JSON.stringify(lang)}; result = 1`);
  await js('GardenPaper.close(); GardenPaper.open("issue"); return 1;');
  await waitFor('document.querySelector(".kb-p-mast")', 10000);
  await sleep(800);
  return js('const s = document.getElementById("kb-p-stage"); return [s.querySelector(".kb-p-name").textContent, [...s.querySelectorAll(".kb-p-kind")].map((x) => x.textContent)];');
}

(async () => {
  // chép số báo thật vào thư mục báo, đổi ngày thành hôm nay (Anki), gói báo còn hạn, khoá giả
  await py(KB + `fix = ${JSON.stringify(FIX)}
day = kb.ai_today()
for lang, base in kb.AI_DIRS.items():
    shutil.rmtree(base, ignore_errors=True)
    d = json.load(open(os.path.join(fix, lang + ".json"), encoding="utf-8"))
    d["ngay"] = day
    os.makedirs(os.path.join(base, "bao", day), exist_ok=True)
    json.dump(d, open(os.path.join(base, "bao", day, "bao.json"), "w", encoding="utf-8"), ensure_ascii=False)
m = json.load(open(os.path.join(fix, "ban_goc.json"), encoding="utf-8")); m["ngay"] = day
os.makedirs(os.path.join(kb.AI_DIR_SHARED, "ban_goc"), exist_ok=True)
json.dump(m, open(os.path.join(kb.AI_DIR_SHARED, "ban_goc", day + ".json"), "w", encoding="utf-8"), ensure_ascii=False)
kb.save_config(gemini_key="AQ.Ab8RN6thu-khoa-gia-1252-0000000000", bao_source="gemini", gemini_langs=["vi"], gemini_auto=False,
               paper_confirmed={"ja": "gemini", "en": "gemini", "vi": "gemini"}, gemini_wait_start=False, gemini_wait_langs=[],
               gemini_story_tones=["kinh_di", "hai"])
st = kb.STATE.load(); st["more"]["paper_sub"] = {"until": (datetime.date.today() + datetime.timedelta(days=20)).isoformat(), "plan": "thang", "auto": True, "trial": True, "paid": 300}
kb.STATE.save(st)
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('  ✗ không mở được vườn'); process.exit(1); }
  await py(KB + 'kb._dialog.resize(1366, 768); kb._dialog.refresh(); result = 1');
  await sleep(2500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  page.errors.splice(0);

  console.log('== Báo tiếng Việt (chỉ tiếng Việt)');
  let v = await openIssue('vi');
  ok(v[0] === 'Báo Làng Kotoba' && v[1].join('|') === 'Tin làng|Truyện dài kỳ · Kỳ 2|Cột ngắn', v[0] + ': ' + v[1].join(' / '));
  await shot('1252_bao_viet');
  await scrollTo('Truyện dài kỳ'); await shot('1252_bao_viet_truyen');

  console.log('== Báo Nhật + báo Anh (cùng kỳ truyện)');
  await py(KB + 'kb.save_config(gemini_langs=["ja", "en"]); result = 1');
  v = await openIssue('ja');
  ok(/畑新聞|新聞/.test(v[0]) && v[1].some((x) => /Kỳ 2|第2回|2/.test(x)), v[0] + ': ' + v[1].join(' / '));
  await scrollTo(v[1].find((x) => /Kỳ|連載|truyện/i.test(x)) || v[1][1]); await shot('1252_bao_nhat_truyen');
  v = await openIssue('en');
  ok(/Gazette/.test(v[0]), v[0] + ': ' + v[1].join(' / '));
  await scrollTo(v[1].find((x) => /Kỳ|Story|truyện/i.test(x)) || v[1][1]); await shot('1252_bao_anh_truyen');

  console.log('== Nguồn báo: Nhật + Anh');
  await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(1500);
  await shot('1252_nguon_bao');
  ok(!page.errors.length, 'không lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 2).join(' | ') : ''));
  console.log(errs ? 'KẾT QUẢ: ' + errs + ' LỖI' : 'KẾT QUẢ: OK');
  process.exit(errs ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
