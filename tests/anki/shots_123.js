// 1.23 — chụp các màn đã đổi (chạy trên bản 1.22.8 và bản 1.23.0 để so "trước / sau"):
//   a_chau_cay_toi     bảng ôn lúc 22 giờ: chậu cây nhỏ ở góc trên trái (phóng 2 lần)
//   b_kieu_giao_dien   ⚙ → Giao diện & chế độ học: các kiểu có sẵn ("Ôn buổi tối" đã bỏ), nhóm Màn chính mới
//   c_the_gemini       tab Nguồn báo, thẻ Gemini khi máy có pham_vi.json của kotoba_daily (bỏ "Giáo trình")
//   d_tra_nghia        số báo Gemini cũ sau khi pham_vi.json bị ghi đè: bấm từ gạch chân 学生
//   e_ke_bao           Kệ báo sau khi chuyển từ Claude Code sang Gemini (số Claude Code còn trong kệ)
//   f_ngam_canh        Ngắm cảnh (chỉ có từ 1.23; bản cũ chụp màn chính)
// In info.json số liệu cho từng ảnh. Chạy: KB_SCRIPTS=shots_123.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_123';
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
const KB = 'import sys, os, time, json, shutil\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const info = {};
async function clip(name, x, y, w, h, scale) {
  const r = await page.send('Page.captureScreenshot', { format: 'png', clip: { x, y, width: w, height: h, scale: scale || 1 } });
  fs.writeFileSync(SHOTS + '/' + name + '.png', Buffer.from(r.data, 'base64'));
}
async function rectOf(sel) { return js(`const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];`); }

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(2000);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 22); GardenSky.set("weather", "sunny"); return 1;');
  info.version = await py(KB + 'result = kb.VERSION');

  // a: chậu cây lúc 22 giờ
  await js('document.getElementById("kb-review").click(); return 1;'); await sleep(2500);
  const pr = await rectOf('#kb-pot');
  if (pr) {
    await clip('a_chau_cay_toi', Math.max(0, pr[0] - 6), Math.max(0, pr[1] - 6), Math.min(560, pr[2] + 360), pr[3] + 12, 2);
    info.a = await js(`const c = document.getElementById("kb-pot"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data;
      let s = 0; for (let i = 0; i < d.length; i += 4) { s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; } return { sang: Math.round(s / (d.length / 4)) };`);
  }
  await js('document.getElementById("kb-stop").click(); GardenSky.set("fixedHour", 10); return 1;'); await sleep(800);

  // b: bảng Giao diện
  await js('GardenUI.open(); return 1;'); await sleep(700);
  await page.shot(SHOTS + '/b_kieu_giao_dien.png');
  info.b = await js('return { kieu: [...document.querySelectorAll(".kb-ui-preset b")].map(b => b.textContent) };');
  await js('GardenUI.close(); return 1;'); await sleep(400);

  // c: thẻ Gemini khi có pham_vi.json của kotoba_daily
  await py(KB + `CL = "/tmp/kb_shots123_cl_" + os.environ.get("KB_CTRL_PORT", "9444"); shutil.rmtree(CL, ignore_errors=True); os.makedirs(CL + "/bao/2026-11-01")
FIX = os.path.join(kb.AI_DIR, "bao", "2026-11-03", "bao.json")
raw = json.load(open(FIX, encoding="utf-8")); raw["ngay"] = "2026-11-01"; raw["may_viet"] = ""
json.dump(raw, open(CL + "/bao/2026-11-01/bao.json", "w", encoding="utf-8"), ensure_ascii=False)
shutil.copy(os.path.join(kb.AI_DIR, "pham_vi.json"), CL + "/pham_vi.json")
kb.save_config(bao_dir=CL, bao_source="claude"); kb._dialog.refresh()
result = 1`);
  await sleep(800);
  // đọc số Claude Code cho có tiến độ rồi chuyển sang Gemini
  await py(KB + 'kb.save_config(bao_source="gemini", gemini_scope="auto"); kb._dialog.refresh(); result = 1'); await sleep(800);
  await js('GardenPaper.open("src"); return 1;'); await sleep(1500);
  const card = await rectOf('.kb-ai-card');
  if (card) { await clip('c_the_gemini', card[0], card[1], card[2], Math.min(card[3], 640)); }
  info.c = await js('const t = document.querySelector(".kb-ai-card").textContent; return { giao_trinh: /Giáo trình/.test(t), theo_giao_trinh: /theo giáo trình/.test(t), truyen: /Giọng truyện/.test(t) };');
  await js('GardenPaper.close(); return 1;'); await sleep(400);

  // d: số Gemini cũ, phạm vi đã bị ghi đè
  await py(KB + `d = os.path.join(kb.AI_DIR, "bao", "2026-10-30"); os.makedirs(d, exist_ok=True)
raw = {"ngay": "2026-10-30", "so": 1, "bai": [{"loai": "tin_lang", "tieu_de": "[村|むら]の[話|はなし]", "doan": ["{学生|がくせい|学生}と{先生|せんせい|先生}が{宇宙船|うちゅうせん|宇宙船}を[見|み]ました。"]}],
       "cau_hoi": [], "chinh_ta": [], "mau_cau": [], "tu_moi": []}
json.dump(raw, open(os.path.join(d, "bao.json"), "w", encoding="utf-8"), ensure_ascii=False)
kb.ai.write_scope(kb.AI_DIR, {"trinh_do": "N4", "tu_vung": [["図書館", "としょかん", "thư viện", "deck"]], "ngu_phap": []})
kb._libraries.clear()
result = 1`);
  await js('GardenPaper.open("shelf"); return 1;'); await sleep(1500);
  await page.shot(SHOTS + '/e_ke_bao.png');
  info.e = await js('return { so: [...document.querySelectorAll(".kb-p-row")].map(r => r.querySelector(".kb-p-row-date").textContent + (r.querySelector(".kb-p-src") ? " " + r.querySelector(".kb-p-src").textContent : "")) };');
  await js('const r = [...document.querySelectorAll(".kb-p-row")].find(x => x.textContent.indexOf("30/10") >= 0); if (r) r.click(); return 1;'); await sleep(1800);
  await js('const w = [...document.querySelectorAll(".kb-p-w")].find(e => e.getAttribute("data-k") === "学生"); if (w) w.click(); return 1;'); await sleep(500);
  const st0 = await rectOf('#kb-p-stage'), inf = await rectOf('#kb-p-info');
  if (st0 && inf) { await clip('d_tra_nghia', st0[0], inf[1], st0[2], Math.min(330, st0[1] + 260 - inf[1])); }
  info.d = await js('return { o_thong_tin: document.getElementById("kb-p-info").textContent.slice(0, 120) };');
  await js('GardenPaper.close(); return 1;'); await sleep(400);

  // f: Ngắm cảnh
  await py(KB + 'd = st.load(); d["home"]["house"] = 7; st.save(d); kb._dialog.refresh(); result = 1'); await sleep(1500);
  const hasView = await js('return typeof GardenHome.view === "function";');
  if (hasView) { await js('GardenHome.view("yard"); return 1;'); await sleep(1500); }
  await page.shot(SHOTS + '/f_ngam_canh.png');
  info.f = { ngam_canh: hasView };
  fs.writeFileSync(SHOTS + '/info.json', JSON.stringify(info, null, 1));
  console.log(JSON.stringify(info));
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
