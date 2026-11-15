// 1.26.1 — nối tiếp real_gemini.js bằng MÃ MỚI trên cùng thư mục Anki (truyện chung, gói báo, số báo cũ giữ nguyên):
// thay mã add-on rồi mở lại Anki, Gemini thật viết ngày 17/11 (Nhật N4 + Anh A2):
//   kỳ tiếp theo nối kỳ trước (số kỳ +1), bản gốc gọi chủ quán là "chị Hana" (không "bà Hana" cho chủ quán), báo tiếng Anh
//   không "Grandma"; model 404 chỉ thử một lần trong cả ngày; "Kỳ trước" không bị cắt giữa chữ; gói báo còn hạn → không trừ xu.
// Chạy: KB_STREAM=1 node real_gemini_tiep.js OUT
const fs = require('fs'), path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_real_tiep';
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
let pass = 0, total = 0;
const ok = (c, m) => { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json, shutil, datetime, re\nkb = sys.modules["kotoba_batake"]\nfrom aqt import mw\n';
const STREAM = fs.readFileSync(path.join(__dirname, '..', 'gemini', 'stream_patch.py'), 'utf-8')
  .replace('import ai_core as ai', 'ai = sys.modules["kotoba_batake.ai_core"]');
async function writeLang(lang) {
  const t0 = Date.now();
  const s = await py(KB + `kb._kb_models = []\nresult = [kb.ai_start("manual", kb._dialog, ${JSON.stringify(lang)}), kb._ai.get("why", "")]`);
  if (!s[0]) { ok(false, lang + ': không bắt đầu được (' + s[1] + ')'); return null; }
  while (Date.now() - t0 < 30 * 60 * 1000 && await py(KB + 'result = bool(kb._ai["running"])')) await sleep(3000);
  const r = await py(KB + `lang = ${JSON.stringify(lang)}; base = kb.AI_DIRS[lang]; d = kb.ai_today()
st = kb.ai.load_status(base)
iss = json.load(open(kb.ai.issue_path(base, d), encoding="utf-8")) if kb.ai.has_issue(base, d) else None
result = {"has": iss is not None, "error": st.get("error", ""), "log": kb.ai.log_summary(kb.ai.last_log(base, d)),
          "ky": [b.get("ky") for b in (iss or {}).get("bai", []) if b.get("loai") == "truyen"],
          "ky_truoc": [b.get("ky_truoc", "") for b in (iss or {}).get("bai", []) if b.get("loai") == "truyen"],
          "text": json.dumps(iss or {}, ensure_ascii=False), "models": list(kb._kb_models),
          "coins": kb.STATE.load()["coins"], "sub": kb.paper_sub_view()}`);
  r.secs = Math.round((Date.now() - t0) / 1000);
  console.log('    ' + lang + ': ' + r.secs + ' giây' + (r.error ? ', LỖI: ' + r.error : ''));
  for (const l of r.log) console.log('      · ' + l);
  return r;
}
(async () => {
  await py(KB + `${process.env.KB_STREAM === '1' ? STREAM : ''}
_kb_gen0 = kb.ai.Gemini.generate
def _kb_gen(self, model, *a, **k):
    kb._kb_models.append(model)
    return _kb_gen0(self, model, *a, **k)
kb.ai.Gemini.generate = _kb_gen
kb._kb_models = []
kb.ai_today = lambda: "2026-11-17"
kb.save_config(gemini_langs=["ja", "en"], gemini_audio="tat", bao_source="gemini",
               paper_confirmed={"ja": "gemini", "en": "gemini", "vi": "gemini"})
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  const mem0 = await py(KB + 'result = [e["ky"] for e in kb.story_core.load_story(kb.AI_DIR_SHARED)]');
  const c0 = await py(KB + 'result = kb.STATE.load()["coins"]');
  console.log('== 17/11 — mã 1.26.1, truyện chung đang ở kỳ ' + mem0[mem0.length - 1]);
  const j = await writeLang('ja');
  const e = await writeLang('en');
  const next = mem0[mem0.length - 1] + 1;
  ok(j && j.has && JSON.stringify(j.ky) === '[' + next + ']', 'báo tiếng Nhật kỳ ' + next + ': ' + JSON.stringify(j && j.ky));
  ok(e && e.has && JSON.stringify(e.ky) === '[' + next + ']', 'báo tiếng Anh cùng kỳ ' + next + ': ' + JSON.stringify(e && e.ky));
  const m = await py(KB + `m = kb.story_core.load_master(kb.AI_DIR_SHARED, kb.ai_today())
t = "\\n".join(m["truyen"]["doan"]) if m else ""
result = {"chi": len(re.findall(r"[Cc]hị Hana", t)), "ba": [x for x in re.findall(r"[^.!?\\n]{0,40}[Bb]à Hana[^.!?\\n]{0,40}", t)][:4], "title": m["truyen"]["tieu_de"] if m else "", "doan": m["truyen"]["doan"] if m else []}`);
  console.log('    bản gốc: ' + m.title + ' · "chị Hana" ×' + m.chi + ' · "bà Hana": ' + JSON.stringify(m.ba));
  ok(m.chi >= 1 || !/Hana/.test(m.doan.join(' ')), 'bản gốc gọi chủ quán là "chị Hana"');
  ok(e && !/Grandma|grandma/.test(e.text), 'báo tiếng Anh không có "Grandma"');
  const k404 = (j ? j.models : []).concat(e ? e.models : []).filter((x) => /gemini-2\.5-(flash|pro)/.test(x));
  ok(k404.length <= 3, 'model 404 (2.5-flash / 2.5-flash-lite / 2.5-pro) mỗi cái tối đa một lần: ' + JSON.stringify(k404));
  ok(!(j ? j.log : []).concat(e ? e.log : []).some((l) => /Xoá gemini_model/.test(l)), 'nhật ký không bảo "Xoá gemini_model"');
  ok((j ? j.ky_truoc : []).concat(e ? e.ky_truoc : []).every((x) => !x || /[.!?…」"]$/.test(x.trim())), '"Kỳ trước" không bị cắt giữa chữ: ' + JSON.stringify((j || {}).ky_truoc));
  const c1 = await py(KB + 'result = kb.STATE.load()["coins"]');
  ok(c1 === c0, 'gói còn hạn (tới 22/11): không trừ xu (' + c0 + ' → ' + c1 + ')');
  fs.writeFileSync(OUT + '/ban_goc_17.json', JSON.stringify(m, null, 1));
  const errs = await py(KB + 'result = [(x.get("where"), x.get("msg")) for x in kb.ERRORS.entries()][-10:]');
  console.log('    nhật ký lỗi: ' + JSON.stringify(errs));
  console.log('\nKẾT QUẢ: ' + pass + '/' + total);
  process.exit(pass === total ? 0 : 1);
})().catch((err) => { console.log('LỖI', err); process.exit(3); });
