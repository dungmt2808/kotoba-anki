// 1.23 trong Anki thật (phần báo + lỗi từ báo cáo kiểm tra 06/11 + giao diện buổi tối):
// - mục 3: nguồn vừa thành Gemini mà chưa xác nhận (bấm "Dùng Gemini", thư mục kotoba_daily mất) → KHÔNG tự viết, chờ
//   "Bắt đầu viết"; "Đổi khoá" không đổi nguồn; bấm Bắt đầu viết → viết đúng một số; người đang dùng Gemini vẫn tự viết.
//   Gemini giả (đếm lượt viết), không gọi mạng.
// - mục 2: thẻ Gemini không còn "Giáo trình", Trình độ chọn được.
// - mục 4: Kệ báo gộp số Claude Code + Gemini, mỗi số ghi nguồn; tiến độ / xu tách theo nguồn.
// - mục 5b: số Gemini cũ thiếu nghĩa → tra trong deck, ghi bổ sung vào số đó; không có thì vẫn có cách đọc.
// - KB-01: gõ nhật ký rồi đóng cửa sổ vườn ngay (trước lần tự lưu) → mở lại vẫn còn chữ.
// - KB-03: ôn → Undo (mw.undo) ba vòng → ví về như cũ.
// - KB-02: tạo hồ sơ mới → 0 xu, chưa có nhà.
// - giao diện: không còn "Ôn buổi tối"; chậu cây ở bảng ôn lúc 22 giờ sáng hơn bản 1.22.8.
// Chạy: KB_SCRIPTS=e2e_123.js run_ui.sh ADDON SHOTS
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots';
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
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
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
const KB = 'import sys, os, time, json, datetime, shutil\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const DECK_A = 'A::Có câu ví dụ + audio';
async function openGarden(deck) {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + `kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(deck || DECK_A)}); d.refresh(); result = 1`);
  await sleep(1800);
  await js('if (window.GardenPaper) GardenPaper.close(); if (window.GardenCal) GardenCal.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", 10); GardenSky.set("weather", "sunny"); return 1;');
}
const calls = () => py(KB + 'result = len(kb._kb_calls)');
const idle = () => py(KB + 'kb._ai.update(running=False, msg=""); result = 1');

(async () => {
  // Gemini giả: Job ghi một số báo (bản sao số 03/11) và đếm lượt; thử khoá không gọi mạng; không tạo giọng đọc
  await py(KB + `import copy
kb._kb_calls = []
FIX = os.path.join(kb.AI_DIR, "bao", "2026-11-03", "bao.json")
class FakeJob:
    def __init__(self, client, base, date, scope, opts, progress):
        self.base, self.date = base, date
    def run(self):
        kb._kb_calls.append(self.date)
        raw = json.load(open(FIX, encoding="utf-8")); raw["ngay"] = self.date
        kb.ai._write_json(kb.ai.issue_path(self.base, self.date), raw)
        return {"ok": True, "so": 9, "date": self.date, "model": "gia"}
kb.ai.Job = FakeJob
kb.ai.test_key = lambda client, prefer="": {"model": "gia", "models": ["gia"], "tts": False}
CL = "/tmp/kb123_claude_" + os.environ.get("KB_CTRL_PORT", "9444")
shutil.rmtree(CL, ignore_errors=True); shutil.rmtree(CL + "_cat", ignore_errors=True)
os.makedirs(CL + "/bao/2026-11-01")
raw = json.load(open(FIX, encoding="utf-8")); raw["ngay"] = "2026-11-01"; raw["may_viet"] = ""
raw["bai"][0]["tieu_de"] = "[村|むら]のニュース（Claude）"
json.dump(raw, open(CL + "/bao/2026-11-01/bao.json", "w", encoding="utf-8"), ensure_ascii=False)
shutil.copy(os.path.join(kb.AI_DIR, "pham_vi.json"), CL + "/pham_vi.json")
kb._kb_cl = CL
cfg = mw.addonManager.getConfig("kotoba_batake")
cfg.pop("paper_confirmed", None)
cfg.update(bao_dir=CL, bao_source="claude", gemini_auto=True, gemini_audio="tat", gemini_langs=["ja"],
           gemini_wait_start=False, gemini_wait_langs=[])
mw.addonManager.writeConfig("kotoba_batake", cfg)
result = 1`);
  await openGarden();
  page.errors.splice(0);

  console.log('== mục 3: lên 1.23 khi đang dùng Claude Code');
  ok(await py(KB + 'result = kb.confirmed_sources()["ja"]') === 'claude', 'lần đầu chạy 1.23: nguồn đã xác nhận = Claude Code (nguồn đang dùng)');
  await py(KB + 'kb.ai_start_all("auto"); result = 1'); await sleep(500);
  ok(await calls() === 0, 'đang dùng Claude Code: Gemini không viết');

  console.log('== đường 1: bấm "Dùng Gemini cho báo tiếng Nhật"');
  await js('GardenPaper.open("src"); return 1;'); await sleep(900);
  ok(await waitFor('return [...document.querySelectorAll(".kb-ai-card button")].some(b => /Dùng Gemini cho báo tiếng Nhật/.test(b.textContent));'), 'thẻ Gemini có nút "Dùng Gemini cho báo tiếng Nhật"');
  await js('[...document.querySelectorAll(".kb-ai-card button")].find(b => /Dùng Gemini cho báo tiếng Nhật/.test(b.textContent)).click(); return 1;');
  await sleep(2500);
  ok(await py(KB + 'result = kb.paper_source()') === 'gemini', 'nguồn báo tiếng Nhật thành Gemini');
  ok(await calls() === 0, 'KHÔNG tự viết ngay (1.22.8: viết luôn) — lượt viết: ' + await calls());
  const w1 = await py(KB + 'v = kb.ai_view(); result = [v["gemini"]["waiting"], v["gemini"]["switched"]]');
  ok(w1[0].includes('ja') && w1[1].includes('ja'), 'báo tiếng Nhật chờ "Bắt đầu viết" (vì vừa chuyển nguồn) ' + JSON.stringify(w1));
  ok(await waitFor('return !!document.querySelector(".kb-ai-startbtn") && /Chuyển sang Gemini/.test(document.querySelector(".kb-ai-start").textContent);'), 'thẻ Gemini hiện khối "Chuyển sang Gemini · … Bắt đầu viết"');
  await page.shot(SHOTS + '/123_01_cho_bat_dau_viet.png');
  console.log('== mục 2: thẻ Gemini chỉ chọn deck');
  ok(await js('const t = document.querySelector(".kb-ai-lang").textContent; return !/Giáo trình/.test(t) && !/theo giáo trình/.test(t) && /Mọi deck/.test(t);'), 'không còn "Giáo trình" / "theo giáo trình", có Mọi deck / Chọn deck');
  ok(await js('const b = [...document.querySelectorAll(".kb-ai-lang .kb-chip, .kb-ai-lang button")].filter(x => /^N[1-5]$/.test(x.textContent.trim())); return b.length === 5 && b.every(x => !x.disabled);'), 'Trình độ N5–N1 chọn được');
  await py(KB + 'kb._dialog.refresh(); kb.ai_start_all("auto"); result = 1'); await sleep(600);
  ok(await calls() === 0, 'làm mới vườn / mở hồ sơ (tự viết sau 8 giây): vẫn chờ');

  console.log('== đường 2: "Đổi khoá" khi đang dùng Claude Code');
  await py(KB + 'kb.save_config(bao_source="claude"); kb._dialog.refresh(); result = 1'); await sleep(800);
  await py(KB + 'kb.ai_test_key("AIzaSyD-khoa-moi-cua-nguoi-dung-0000000"); result = 1');
  await sleep(2500);
  ok(await py(KB + 'result = [kb.config().get("bao_source"), kb.paper_source()]').then(r => r[0] === 'claude' && r[1] === 'claude'), 'đổi khoá đúng: nguồn vẫn là Claude Code (1.22.8: tự chuyển sang Gemini)');
  ok(await calls() === 0, 'không viết số nào');

  console.log('== đường 3: thư mục kotoba_daily tạm không thấy (bao_source "auto")');
  await py(KB + 'kb.save_config(bao_source="auto"); kb._dialog.refresh(); os.rename(kb._kb_cl, kb._kb_cl + "_cat"); kb._dialog.refresh(); kb.ai_start_all("auto"); result = 1');
  await sleep(800);
  ok(await py(KB + 'result = kb.paper_source()') === 'gemini' && await calls() === 0, 'mất thư mục: nguồn thành Gemini nhưng không tự viết');
  await py(KB + 'os.rename(kb._kb_cl + "_cat", kb._kb_cl); kb._dialog.refresh(); result = 1'); await sleep(600);
  ok(await py(KB + 'result = kb.paper_source()') === 'claude', 'thư mục có lại → về Claude Code');

  console.log('== Bắt đầu viết');
  await py(KB + 'kb.save_config(bao_source="gemini"); kb._dialog.refresh(); result = 1'); await sleep(800);
  await py(KB + 'kb._dialog._on_ai("start"); result = 1');
  ok(await waitFor('return true;') && await (async () => { for (let i = 0; i < 30; i++) { if (await calls() >= 1) return true; await sleep(300); } return false; })(), 'bấm Bắt đầu viết → Gemini viết');
  await sleep(1500); await idle();
  ok(await calls() === 1, 'viết đúng một số (' + await calls() + ')');
  ok(await py(KB + 'result = kb.confirmed_sources()["ja"]') === 'gemini', 'nguồn đã xác nhận = Gemini');
  await py(KB + 'kb.ai_start_all("auto"); result = 1'); await sleep(600); await idle();
  ok(await calls() === 1, 'đã có số hôm nay: không viết thêm');
  await py(KB + 'os.remove(kb.ai.issue_path(kb.AI_DIR, kb.ai_today())); s = kb.ai.load_status(kb.AI_DIR); s.update(tries=0, last_try=0); kb.ai.save_status(kb.AI_DIR, s); kb.ai_start_all("auto"); result = 1');
  await sleep(1500); await idle();
  ok(await calls() === 2, 'người đã xác nhận Gemini: tự viết như bình thường (hôm sau / mở lại)');

  console.log('== mục 4: Kệ báo gộp hai nguồn');
  const idx = await py(KB + 'result = kb._dialog._paper_index("ja")');
  const srcs = [...new Set(idx.issues.map(x => x.src))];
  ok(idx.multi && srcs.includes('claude') && srcs.includes('gemini'), 'kệ có số của cả Claude Code và Gemini (' + idx.issues.map(x => x.ref).join(', ') + ')');
  ok(idx.issues.some(x => x.ref === '2026-11-01@claude'), 'số Claude Code 01/11 vẫn trong kệ khi đang dùng Gemini (1.22.8: biến mất)');
  await js('GardenPaper.close(); GardenPaper.open("shelf"); return 1;');
  ok(await waitFor('return [...document.querySelectorAll(".kb-p-row .kb-p-src")].some(e => e.textContent === "Claude Code") && [...document.querySelectorAll(".kb-p-row .kb-p-src")].some(e => e.textContent === "Gemini");'), 'mỗi số ghi nguồn (nhãn Claude Code / Gemini)');
  await page.shot(SHOTS + '/123_02_ke_bao_gop.png');
  await js('[...document.querySelectorAll(".kb-p-row")].find(r => /Claude/.test(r.textContent) && r.textContent.indexOf("01/11") >= 0).click(); return 1;');
  ok(await waitFor('return GardenPaper._state().issue === "2026-11-01" && document.querySelector(".kb-p-h") && /Claude/.test(document.querySelector(".kb-p-h").textContent);'), 'mở số Claude Code từ kệ khi đang dùng Gemini');
  const c0 = await py(KB + 'result = st.load()["coins"]');
  await js('const b = document.querySelector(".kb-p-q .kb-p-opt, .kb-p-q button"); if (b) b.click(); return 1;'); await sleep(1200);
  const book = await py(KB + 'b = kb.BOOK.load(); p = kb.PAPER.load(); result = [b["mac_dinh"], "2026-11-01" in b["read"]["claude"], "2026-11-01" in p["read"]]');
  ok(book[0] === 'claude' ? (book[1] === false && book[2] === true) : (book[1] === true), 'tiến độ số Claude Code ghi đúng chỗ theo nguồn (mặc định ' + book[0] + ') ' + JSON.stringify(book));
  const c1 = await py(KB + 'result = st.load()["coins"]');
  ok(c1 >= c0, 'trả lời câu hỏi số Claude Code: xu không giảm (' + c0 + ' → ' + c1 + ')');

  console.log('== mục 5b: số Gemini cũ thiếu nghĩa');
  await py(KB + `d = os.path.join(kb.AI_DIR, "bao", "2026-10-30"); os.makedirs(d, exist_ok=True)
raw = {"ngay": "2026-10-30", "so": 1, "bai": [{"loai": "tin_lang", "tieu_de": "[村|むら]の[話|はなし]", "doan": ["{学生|がくせい|学生}と{先生|せんせい|先生}が{宇宙船|うちゅうせん|宇宙船}を[見|み]ました。"]}],
       "cau_hoi": [], "chinh_ta": [], "mau_cau": [], "tu_moi": []}
json.dump(raw, open(os.path.join(d, "bao.json"), "w", encoding="utf-8"), ensure_ascii=False)
# số sau viết theo deck khác → pham_vi.json chung bị ghi đè (đúng lỗi 1.22.8)
kb.ai.write_scope(kb.AI_DIR, {"trinh_do": "N4", "tu_vung": [["図書館", "としょかん", "thư viện", "deck"]], "ngu_phap": []})
result = 1`);
  await js('GardenPaper.close(); GardenPaper.open("shelf"); if (!window.__kbWrap) { const o = Garden.paperIssue; Garden.paperIssue = (v) => { window.__kbIssue = v; return o(v); }; window.__kbWrap = 1; } return 1;'); await sleep(900);
  await js('[...document.querySelectorAll(".kb-p-row")].find(r => r.textContent.indexOf("30/10") >= 0).click(); return 1;');
  ok(await waitFor('const v = window.__kbIssue; return v && v.date === "2026-10-30" && GardenPaper._state().issue === "2026-10-30";'), 'mở số 30/10 từ kệ (viết trước 1.23, phạm vi đã đổi)');
  const tu = await js('return window.__kbIssue.tu;');
  ok(tu['学生'] && tu['学生'].m === 'học sinh' && tu['先生'] && tu['先生'].m === 'giáo viên', 'từ có trong deck: có nghĩa (tìm trong deck, 1.22.8: trống) — 学生: ' + (tu['学生'] || {}).m);
  ok(tu['宇宙船'] && tu['宇宙船'].r === 'うちゅうせん' && tu['宇宙船'].thieu, 'từ không có ở đâu (cả deck lẫn kotoba_daily): vẫn có cách đọc うちゅうせん');
  const saved = await py(KB + 'result = sorted(json.load(open(os.path.join(kb.AI_DIR, "bao", "2026-10-30", "bao.json"), encoding="utf-8")).get("tra_tu", {}))');
  ok(saved.includes('学生') && saved.includes('先生') && !saved.includes('宇宙船'), 'nghĩa tìm được ghi bổ sung vào chính số đó: ' + saved.join(', '));
  await js('const w = [...document.querySelectorAll(".kb-p-w")].find(e => e.getAttribute("data-k") === "宇宙船"); if (w) w.click(); return 1;'); await sleep(400);
  ok(await js('return /Chưa có nghĩa trong deck/.test(document.getElementById("kb-p-info").textContent) && /うちゅうせん/.test(document.getElementById("kb-p-info").textContent);'), 'bấm 宇宙船: hiện cách đọc + "Chưa có nghĩa trong deck"');
  await page.shot(SHOTS + '/123_03_tra_nghia_so_cu.png');
  await js('GardenPaper.close(); return 1;');

  console.log('== 5d: bản dịch ẩn sẵn, Dịch số này; 5c: Kỳ này hay / Nhạt');
  await py(KB + `p = kb.ai.issue_path(kb.AI_DIR, kb.ai_today()); raw = json.load(open(p, encoding="utf-8"))
for b in raw["bai"]:
    b["dich"] = ["Bản dịch tiếng Việt của đoạn %d." % (j + 1) for j in range(len(b["doan"]))]
json.dump(raw, open(p, "w", encoding="utf-8"), ensure_ascii=False)
kb.ai.translate_issue = lambda client, iss, lang="ja", prefer=None: [["Dịch máy giả đoạn %d." % (j + 1) for j in range(len(b["doan"]))] for b in iss["bai"]]
result = 1`);
  await js('GardenPaper.close(); window.__kbIssue = null; GardenPaper.open("shelf"); return 1;'); await sleep(900);
  await py(KB + 'kb._dialog._on_paper("paper:issue:" + kb.ai_today() + "@gemini"); result = 1');
  ok(await waitFor('return window.__kbIssue && window.__kbIssue.has_dich && GardenPaper._state().tab === "issue";'), 'mở số hôm nay (có bản dịch)');
  ok(await js('return document.querySelectorAll(".kb-p-dbtn").length >= 4 && [...document.querySelectorAll(".kb-p-dich")].every(d => getComputedStyle(d).display === "none");'), 'mỗi đoạn có nút Dịch, bản dịch ẩn sẵn');
  await js('document.querySelector(".kb-p-dbtn").click(); return 1;'); await sleep(200);
  ok(await js('const d = document.querySelector(".kb-p-dich"); return getComputedStyle(d).display !== "none" && /Bản dịch tiếng Việt/.test(d.textContent) && d.lang === "vi";'), 'bấm Dịch: hiện bản dịch đoạn đó');
  const db = await js('const b = document.getElementById("kb-p-dich"); return [b.hidden, b.textContent];');
  ok(!db[0] && db[1] === 'Hiện bản dịch', 'nút "Hiện bản dịch" cạnh "Ẩn furigana"');
  await js('document.getElementById("kb-p-dich").click(); return 1;'); await sleep(200);
  ok(await js('return [...document.querySelectorAll(".kb-p-dich")].every(d => getComputedStyle(d).display !== "none") && document.getElementById("kb-p-dich").textContent === "Ẩn bản dịch";'), 'Hiện bản dịch: cả số hiện bản dịch');
  await page.shot(SHOTS + '/123_05_ban_dich.png');
  await js('document.getElementById("kb-p-dich").click(); return 1;'); await sleep(200);
  const fbn = await js('return [...document.querySelectorAll(".kb-p-fbs .kb-btn")].map(b => b.textContent);');
  ok(fbn.join(",") === 'Kỳ này hay,Nhạt', 'dưới truyện có "Kỳ này hay / Nhạt" + ô ghi một dòng');
  await js('const i = document.querySelector(".kb-p-fbs-in"); i.value = "muốn thêm スタックちゃん"; [...document.querySelectorAll(".kb-p-fbs .kb-btn")][1].click(); return 1;'); await sleep(900);
  const fbs = await py(KB + 'import json as J\nraw = J.load(open(os.path.join(kb.AI_DIR, "truyen.json"), encoding="utf-8")) if os.path.exists(os.path.join(kb.AI_DIR, "truyen.json")) else []\nresult = [x.get("phan_hoi") for x in raw if isinstance(x, dict) and x.get("phan_hoi")]');
  ok(fbs.some(f => f.y === 'nhat' && /スタックちゃん/.test(f.ghi)), 'bấm Nhạt → ghi nhận xét vào truyen.json (kỳ sau Gemini đọc) ' + JSON.stringify(fbs));
  ok(await waitFor('return document.querySelector(".kb-p-fbs .kb-btn.is-on") && document.querySelector(".kb-p-fbs .kb-btn.is-on").textContent === "Nhạt";'), 'nút Nhạt sáng lên sau khi ghi');
  await js('GardenPaper.close(); window.__kbIssue = null; GardenPaper.open("shelf"); return 1;'); await sleep(900);
  await py(KB + 'kb._dialog._on_paper("paper:issue:2026-11-02@gemini"); result = 1');
  ok(await waitFor('return window.__kbIssue && window.__kbIssue.date === "2026-11-02" && !window.__kbIssue.has_dich && window.__kbIssue.can_dich;'), 'số cũ chưa có bản dịch');
  ok(await waitFor('return document.getElementById("kb-p-dich").textContent === "Dịch số này";'), 'nút "Dịch số này"');
  await js('document.getElementById("kb-p-dich").click(); return 1;');
  ok(await waitFor('return window.__kbIssue && window.__kbIssue.date === "2026-11-02" && window.__kbIssue.has_dich;', 10000), 'Dịch số này → Gemini (giả) dịch, số hiện nút Dịch');
  ok(await py(KB + 'import json as J\nraw = J.load(open(kb.ai.issue_path(kb.AI_DIR, "2026-11-02"), encoding="utf-8"))\nresult = all(b.get("dich") for b in raw["bai"])'), 'bản dịch ghi vào bao.json của số đó');
  await js('GardenPaper.close(); return 1;');

  console.log('== KB-01: gõ nhật ký rồi đóng cửa sổ vườn ngay');
  await js('GardenCal.open({}); return 1;');
  ok(await waitFor('return !!document.querySelector(".kb-cal-note");'), 'mở Lịch hoa · hôm nay');
  await js('const t = document.querySelector(".kb-cal-note"); t.value = "NHẬT KÝ ĐÃ LƯU"; t.dispatchEvent(new Event("input")); t.blur(); return 1;'); await sleep(800);
  await page.click('.kb-cal-note');
  await page.type(' DÒNG VỪA VIẾT'); await sleep(100);
  const ta = await js('const t = document.querySelector(".kb-cal-ta"); if (t && !t.readOnly) { t.value = "いい天気です。"; t.dispatchEvent(new Event("input")); } return !!t;');
  await sleep(100);
  page.close();
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(1500);
  const ent = await py(KB + 'e = kb.JOURNAL.entry(kb.cal_today()); result = [e.get("t", ""), (e.get("w") or {}).get("goc", "")]');
  ok(ent[0] === 'NHẬT KÝ ĐÃ LƯU DÒNG VỪA VIẾT', 'nhật ký còn đủ phần vừa gõ: "' + ent[0] + '" (1.22.8: mất " DÒNG VỪA VIẾT")');
  ok(!ta || ent[1] === 'いい天気です。', 'bản nháp luyện viết còn nguyên: "' + ent[1] + '"');
  await openGarden();

  console.log('== KB-03: ôn rồi Undo ba lần');
  await py(KB + 'kb.save_config(show_tooltips=False); result = 1');
  const before = await py(KB + 'd = st.load(); result = [d["coins"], d["waters"], mw.col.db.scalar("select count() from revlog")]');
  const cyc = [];
  for (let i = 0; i < 3; i++) {
    await js('document.getElementById("kb-review").click(); return 1;');
    await waitFor('return !document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden;');
    await sleep(500);
    await js('document.getElementById("kb-show").click(); return 1;');
    await waitFor('return !document.getElementById("kb-ratings").hidden;');
    await js('document.querySelector(".kb-rate-3").click(); return 1;'); await sleep(1500);
    await js('document.getElementById("kb-stop").click(); return 1;'); await sleep(500);
    const mid = await py(KB + 'result = st.load()["coins"]');
    await py(KB + 'from aqt.operations.collection import undo; undo(parent=mw); result = 1'); await sleep(1500);
    const after = await py(KB + 'd = st.load(); result = [d["coins"], d["waters"], mw.col.db.scalar("select count() from revlog")]');
    cyc.push([mid, after]);
  }
  ok(cyc.every(([mid]) => mid > before[0]), 'mỗi lượt ôn được cộng xu: ' + cyc.map(c => c[0]).join(', '));
  const last = cyc[2][1];
  ok(last[2] === before[2], 'Undo: revlog về như cũ (' + before[2] + ' → ' + last[2] + ')');
  ok(last[0] === before[0] && last[1] === before[1], 'sau 3 vòng ôn + Undo: xu và số lần tưới về như cũ ' + JSON.stringify(before) + ' → ' + JSON.stringify(last) + ' (1.22.8: +9 xu)');
  await py(KB + 'kb.mobile_catch_up(); kb._dialog.refresh(); result = 1'); await sleep(600);
  ok(await py(KB + 'result = st.load()["coins"]') === before[0], 'lần bù xu điện thoại sau Undo không trả lại xu cho lượt đã Undo');

  console.log('== giao diện ôn buổi tối');
  await js('GardenUI.open(); return 1;'); await sleep(500);
  ok(await js('return [...document.querySelectorAll(".kb-ui-preset")].length === 3 && ![...document.querySelectorAll(".kb-ui-preset")].some(b => /buổi tối/.test(b.textContent)) && !/Đêm vườn/.test(document.getElementById("kb-ui-stage").textContent);'), 'bảng Giao diện: không còn "Ôn buổi tối" / "Đêm vườn"');
  await js('GardenUI.close(); return 1;');
  await py(KB + 'kb.save_config(ui={"theme": "night", "review": {"yard": "dim", "field": "dim", "sky": "off", "weather": "off", "mascot": "off"}}); kb._dialog.refresh(); result = 1'); await sleep(1200);
  ok(await js('const a = document.getElementById("kb-app"); return a.classList.contains("kb-ui-th-garden") && !a.classList.contains("kb-ui-th-night");'), 'config cũ "Ôn buổi tối" → bảng ôn Vàng vườn');
  await js('GardenSky.set("fixedHour", 22); document.getElementById("kb-review").click(); return 1;');
  await waitFor('return !document.getElementById("kb-panel").hidden;'); await sleep(1200);
  const lum = await js(`const c = document.getElementById("kb-pot"), x = c.getContext("2d"), d = x.getImageData(0, 0, c.width, c.height).data;
    let s = 0; for (let i = 0; i < d.length; i += 4) { s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; } return Math.round(s / (d.length / 4));`);
  ok(lum >= 75, 'chậu cây lúc 22 giờ đủ sáng: độ sáng trung bình ' + lum + ' (1.22.8 đo được ~45)');
  await page.shot(SHOTS + '/123_04_chau_cay_22h.png');
  await js('document.getElementById("kb-stop").click(); GardenSky.set("fixedHour", 10); return 1;'); await sleep(400);

  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));

  console.log('== Ngắm cảnh (mục 1.3, 1.4)');
  await py(KB + `d = st.load(); d["coins"] = max(d["coins"], 5000); d["home"]["house"] = 7
d["home"]["owned"].update({"plant": 2, "tea": 1, "fence": 1, "flowers": 2})
d["home"]["room"] = [e for e in d["home"].get("room", []) if e.get("id") != "plant"]
st.save(d); kb._dialog.refresh(); result = 1`); await sleep(1500);
  await py(KB + 'kb._dialog.resize(1920, 1080); result = 1'); await sleep(1200);
  await js('GardenSky.set("fixedHour", 10); return 1;');
  const keyJS = (k) => js(`const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document; t.dispatchEvent(new KeyboardEvent("keydown", {key: ${JSON.stringify(k)}, code: ${JSON.stringify(k.length === 1 ? 'Key' + k.toUpperCase() : k)}, bubbles: true, cancelable: true})); return 1;`);
  await keyJS('v'); await sleep(900);
  let v = await js('return GardenHome._view();');
  ok(v.open, 'phím V mở Ngắm cảnh');
  ok(await js('return !document.getElementById("kb-view").hidden && document.getElementById("kb-view-canvas").width >= 1900;'), 'cả cửa sổ chỉ một cảnh (canvas kín cửa sổ)');
  ok(v.list[0] === 'yard' && v.list[1] === 'room', 'danh sách cảnh: Sân vườn → Trong nhà → các vùng (' + v.list.join(', ') + ')');
  ok(v.scene !== 'room' ? v.S === 7 : true, 'ngoài trời ở 1920 × 1080: phóng ×' + v.S + ' (kế hoạch: khoảng 7)');
  await page.shot(SHOTS + '/123_10_ngam_san.png');
  await keyJS('ArrowRight'); await sleep(600);
  v = await js('return GardenHome._view();');
  ok(v.scene === 'room' && v.S >= 11, 'phím → sang Trong nhà, phóng ×' + v.S + ' (kế hoạch: khoảng 11)');
  await sleep(500); await page.shot(SHOTS + '/123_11_ngam_trong_nha.png');
  await js('document.getElementById("kb-view-arrange").click(); document.getElementById("kb-view-khobtn").click(); return 1;'); await sleep(500);
  v = await js('return GardenHome._view();');
  ok(v.arrange && v.kho.includes('plant') && !v.kho.includes('fence'), 'Sắp xếp đồ → Đặt từ kho: chỉ đồ trong nhà còn trong kho (' + v.kho.join(', ') + ')');
  await page.shot(SHOTS + '/123_12_sap_xep_do.png');
  const nRoom0 = await py(KB + 'result = len(st.load()["home"]["room"])');
  await js('[...document.querySelectorAll(".kb-view-kho-item")].find(b => b.title === "Chậu cây" || /cây/i.test(b.title)).click(); return 1;'); await sleep(300);
  // ô trống ở hàng sàn: thử lần lượt các ô cho tới khi Python nhận
  const spot = await js(`const v = GardenHome._view(); for (let y = 3; y >= 1; y--) { for (let x = 0; x < 10; x++) { const c = document.getElementById("kb-view-canvas").getBoundingClientRect();
      const px = c.left + (v.ox + x * 16 + 8) * v.S, py = c.top + (v.oy + 40 + (y - 1) * 16 + 8) * v.S;
      const el = document.elementFromPoint(px, py); if (el && el.id === "kb-view-canvas") { return [px, py]; } } } return null;`);
  if (spot) { await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: spot[0], y: spot[1], button: 'left', clickCount: 1 }); await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: spot[0], y: spot[1], button: 'left', clickCount: 1 }); }
  await sleep(1200);
  const nRoom1 = await py(KB + 'result = len(st.load()["home"]["room"])');
  ok(nRoom1 === nRoom0 + 1, 'đặt chậu cây từ kho ngay trên khung lớn → Python ghi chỗ đặt (' + nRoom0 + ' → ' + nRoom1 + ')');
  const idxPlant = await py(KB + 'r = st.load()["home"]["room"]; result = max(i for i, e in enumerate(r) if e["id"] == "plant")');
  await py(KB + `kb._dialog._on_home("take:room:${idxPlant}"); result = 1`); await sleep(900);
  ok(await py(KB + 'result = len(st.load()["home"]["room"])') === nRoom0, 'Cất vào kho trên khung lớn');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  ok(await js('return !GardenHome._view().arrange && GardenHome._view().open;'), 'Esc: thoát Sắp xếp đồ trước, vẫn đang ngắm');
  await page.key('Escape', 'Escape', 27); await sleep(700);
  ok(!(await js('return GardenHome._view().open;')) && await py(KB + 'result = kb._dialog is not None and kb._dialog.isVisible()'), 'Esc lần nữa: thoát Ngắm cảnh, cửa sổ vườn vẫn mở');
  await js('localStorage.setItem("kb-main-scene", "yard"); return 1;'); await sleep(800);
  const hp = await js(`const cv = document.getElementById("kb-yard"), r = cv.getBoundingClientRect(); return [r.left + 30 * (r.width / Math.max(256, r.width / 4)), r.top + r.height * 0.55];`);
  const yv = await js(`const cv = document.getElementById("kb-yard"); const r = cv.getBoundingClientRect(); const S = Math.max(2, Math.min(4, Math.floor(r.width / 256))); const ox = Math.floor((r.width / S - 256) / 2); return [r.left + (ox + 30) * S, r.top + 45 * S];`);
  await page.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: yv[0], y: yv[1], button: 'left', clickCount: 1 });
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: yv[0], y: yv[1], button: 'left', clickCount: 1 });
  await sleep(800);
  v = await js('return GardenHome._view();');
  ok(v.open && v.scene === 'room', 'bấm vào ngôi nhà ở màn chính → Ngắm cảnh · Trong nhà');
  await js('GardenHome.viewClose(); return 1;'); await sleep(400);
  await js('GardenUI.open(); return 1;'); await sleep(400);
  ok(await js('return /Màn chính/.test(document.getElementById("kb-ui-stage").textContent) && /Cỡ cảnh/.test(document.getElementById("kb-ui-stage").textContent) && /Luôn về Sân vườn/.test(document.getElementById("kb-ui-stage").textContent);'), '⚙ Giao diện có nhóm Màn chính: Cỡ cảnh, Cảnh hiện');
  const h0 = await js('return document.getElementById("kb-yard").getBoundingClientRect().height;');
  await js('const r = [...document.querySelectorAll("#kb-ui-stage .kb-ui-opt input")].find(i => i.name === "kb-ui-scene" && i.value === "large"); r.click(); return 1;'); await sleep(900);
  await js('GardenUI.close(); return 1;'); await sleep(600);
  const h1 = await js('return document.getElementById("kb-yard").getBoundingClientRect().height;');
  ok(h1 > h0 * 1.3, 'Cỡ cảnh Lớn: dải cảnh cao hơn (' + Math.round(h0) + ' → ' + Math.round(h1) + ' px)');
  await page.shot(SHOTS + '/123_13_man_chinh_co_lon.png');
  ok(await py(KB + 'result = kb.config()["ui"].get("scene")') === 'large', 'lưu vào config (ui.scene = large)');
  await py(KB + 'kb.save_config(ui={}); kb._dialog.resize(1366, 768); kb._dialog.refresh(); result = 1'); await sleep(800);
  const errs2 = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs2.length === 0, 'nhật ký lỗi add-on vẫn trống sau Ngắm cảnh' + (errs2.length ? ': ' + errs2.join(' | ') : ''));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));

  console.log('== KB-02: hồ sơ Anki mới');
  const a = await py(KB + 'd = st.load(); result = [d["coins"], d["home"].get("house", 0)]');
  await py(KB + 'd = st.load(); d["coins"] = max(d["coins"], 12345); d["home"]["house"] = 7; st.save(d); result = 1');
  page.close();
  await py(KB + 'mw.unloadProfileAndShowProfileManager(); result = 1'); await sleep(4000);
  await py(KB + 'mw.pm.create("HoSoMoi"); mw.pm.load("HoSoMoi"); mw.onOpenProfile(); result = 1'); await sleep(6000);
  const b = await py(KB + 'd = st.load(); result = [mw.pm.name, mw.col.note_count(), d["coins"], d["home"].get("house", 0), kb.PAPER.load()["read"] != {}]');
  ok(b[0] === 'HoSoMoi' && b[1] === 0, 'đã mở hồ sơ mới (0 note)');
  ok(b[2] === 0 && b[3] === 0, 'hồ sơ mới: 0 xu, chưa có nhà (1.22.8: 12.345 xu, nhà cấp 7) — ' + JSON.stringify(b.slice(2, 4)));
  ok(b[4] === false, 'hồ sơ mới: không nhận tiến độ đọc báo của hồ sơ khác');
  await py(KB + 'mw.unloadProfileAndShowProfileManager(); result = 1'); await sleep(4000);
  await py(KB + 'mw.pm.load("Test"); mw.onOpenProfile(); result = 1'); await sleep(5000);
  const back = await py(KB + 'd = st.load(); result = [mw.pm.name, d["coins"], d["home"].get("house", 0)]');
  ok(back[0] === 'Test' && back[1] >= 12345 && back[2] === 7, 'về hồ sơ cũ: ví còn nguyên ' + JSON.stringify(back) + ' (trước: ' + JSON.stringify(a) + ')');

  const n = results.filter(Boolean).length;
  console.log(`\nKẾT QUẢ: ${n}/${results.length} đạt`);
  process.exit(n === results.length ? 0 : 1);
})().catch((e) => { console.log('LỖI KỊCH BẢN:', e); process.exit(1); });
