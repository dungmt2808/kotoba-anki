// 1.25.1 trong Anki thật — cho người không học tiếng Nhật / tiếng Anh + gói báo + chủ đề truyện (Gemini giả, không gọi mạng):
// - deck kiến thức tiếng Việt (loại note riêng) → "Ngôn ngữ khác"; Báo muốn nhận có Tiếng Việt; khối Báo tiếng Việt
//   (Báo Làng Kotoba, không Trình độ, Lấy thẻ: Mọi deck / Chọn deck / Không dùng deck), không hàng Giọng đọc khi chỉ có báo
//   tiếng Việt; Chủ đề truyện chọn nhiều (lưu gemini_story_tones, không bỏ được chủ đề cuối);
// - Gói báo: số đầu tiên tặng 7 ngày (không trừ xu) → hết hạn + Tự gia hạn → −100 xu tự gia hạn → tắt Tự gia hạn → không
//   viết, "Gói báo hết hạn", tab Báo có nút Gia hạn → bấm → −100 xu, viết số mới; thiếu xu / quá 60 ngày → nút khoá;
// - đọc số tiếng Việt: đầu báo, ngày tiếng Việt, "Góc ôn bài", không furigana / ▶ / Dịch / câu chép, bấm chữ gạch chân →
//   mặt trước / mặt sau của thẻ, trả lời câu hỏi +2 xu, làm hết +5; Kệ báo chuyển báo;
// - Không dùng deck (tiếng Nhật): lưu mode "level", phạm vi khong_deck; Luyện viết ẩn khi không có deck Nhật / Anh;
// - Đuổi quạ cho deck tiếng Hàn: 2 kiểu chơi mới, gõ đúng → quạ bay; không tràn ở 1366 / 720 px, không lỗi JS.
// Chạy: node e2e_1251.js SHOTS
const { pages, Page, sleep } = require('./cdp');
const { MEASURE } = require('./measure');
const SHOTS = process.argv[2] || '/tmp/kb_shots';
let pass = 0, total = 0;
const ok = (c, m) => { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); };
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
  while (Date.now() - t < ms) { try { const v = await page.eval(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
async function waitPy(code, ms = 20000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await py(KB + code); if (v) return v; } catch (e) { } await sleep(300); }
  return false;
}
const KB = 'import sys, os, time, json, shutil, datetime\nkb = sys.modules["kotoba_batake"]\nfrom aqt import mw\n';
const flash = () => js('const f = document.querySelector(".kb-ai-flash"); return f ? f.textContent : "";');
const srcText = () => js('return document.getElementById("kb-p-stage").innerText;');
async function shot(name) { await page.shot(SHOTS + '/1251_' + name + '.png'); }

// Gemini giả (1.25.2 "Một làng, một truyện"): bản gốc chung (truyện + tin làng) → số báo tiếng Việt
const FAKE = String.raw`
SC = kb.story_core
P = ("Sáng nay cả làng Kotoba tụ tập bên giếng cũ để nghe bà Hana kể chuyện. Lin cầm cuốn sổ nhỏ ghi chép không ngừng, "
     "còn StackChan thì vẽ lại mọi thứ bằng những ô vuông màu. Ông trưởng làng bảo rằng ngày mai sẽ có hội chợ mùa thu, ai "
     "cũng nên mang theo một câu chuyện hay để kể cho nhau nghe. ")
S = ("Đêm đó, Lin nghe tiếng gõ cộc cộc phát ra từ cái giếng cạn sau quán. Cô cầm đèn bão nhón chân ra sân, tim đập thình "
     "thịch. StackChan lăn theo sau, thì thầm rằng tớ thấy một bóng trắng. Bà Hana đứng ở cửa, không nói gì, chỉ nhìn cái "
     "giếng rất lâu như đang nhớ lại một điều gì đã cũ. ")
def _issue(story):
    bai = [{"loai": "tin_lang", "tieu_de": "Hội chợ mùa thu sắp tới", "doan": [P, P, P]}]
    if story:
        bai.append({"loai": "truyen", "ky": 1, "tieu_de": "Tiếng gõ trong đêm", "doan": [S, S, S]})
    bai.append({"loai": "cot", "tieu_de": "Góc của StackChan", "doan": ["Tớ vẽ được ba quả bí ngô hôm nay. " + P]})
    q = [{"hoi": "Cả làng tụ tập ở đâu?", "chon": ["Bên giếng cũ", "Ở chợ", "Trên núi"], "dung": 0, "giai_thich": "Tin làng kể mọi người tụ tập bên giếng cũ."},
         {"hoi": "Ai ghi chép vào sổ nhỏ?", "chon": ["StackChan", "Lin", "Ông trưởng làng"], "dung": 1, "giai_thich": "Lin cầm cuốn sổ nhỏ ghi chép."},
         {"hoi": "Ngày mai làng có gì?", "chon": ["Lễ hội đèn", "Phiên chợ cá", "Hội chợ mùa thu"], "dung": 2, "giai_thich": "Ông trưởng làng nói ngày mai có hội chợ mùa thu."}]
    return {"bai": bai, "cau_hoi": q, "chinh_ta": [], "mau_cau": [], "tu_moi": [], "tom_tat": "Làng chuẩn bị hội chợ mùa thu.",
            "tom_tat_truyen": "Lin nghe tiếng gõ ở giếng cạn."}
def _gen(self, model, system, prompt, schema=None, temperature=0.7, max_tokens=0, thinking=None):
    self.calls += 1
    kb._kb_prompts.append(prompt[:8000])
    if schema is SC.ARC_SCHEMA:
        return json.dumps({"ten": "Tiếng gõ trong đêm", "muc_tieu": "tìm ra ai gõ", "bi_an": "bóng trắng", "nhan_vat_phu": "mèo trắng",
                           "buoc": ["b1", "b2", "b3", "b4", "b5", "b6"], "ket": "là con mèo"}, ensure_ascii=False)
    if schema is SC.MASTER_SCHEMA:
        return json.dumps({"dan_y": {"muon": "a", "tro_ngai": "b", "bat_ngo": "c", "moc_cau": "d"}, "tieu_de": "Tiếng gõ trong đêm",
                           "doan": [S, S, S], "nho": {"tom_tat": "Lin nghe tiếng gõ ở giếng cạn.", "bo_ngo": ["bóng trắng là ai"]},
                           "tin": [{"tieu_de": "Hội chợ mùa thu", "noi_dung": "Ngày mai làng mở hội chợ mùa thu bên giếng cũ."},
                                   {"tieu_de": "Bí ngô to", "noi_dung": "Bác đưa thư thấy một quả bí ngô to bằng cái ghế."}],
                           "muc3": {"tieu_de": "Góc của StackChan", "doan": ["Tớ vẽ được ba quả bí ngô hôm nay."]}}, ensure_ascii=False)
    if schema is SC.EDIT_SCHEMA:
        return json.dumps({"diem": {k: 5 for k in SC.CRIT}, "loi": [], "goi_y": []}, ensure_ascii=False)
    two = "TRUYỆN ĐÃ VIẾT SẴN" in prompt or "TRUYỆN HÔM NAY (kỳ" in prompt or "máy tự chèn truyện" in prompt
    iss = _issue(not two)
    if "van_de" in json.dumps(schema or {}):
        return json.dumps({"van_de": [], "bao": iss}, ensure_ascii=False)
    return json.dumps(iss, ensure_ascii=False)
kb.ai.Gemini.generate = _gen
kb.ai.Gemini.models = lambda self: [{"name": "models/gemini-3.6-flash", "supportedGenerationMethods": ["generateContent"]}]
`;

(async () => {
  // deck kiến thức tiếng Việt (loại note riêng → "Ngôn ngữ khác"), 12 thẻ đã học (6 đến hạn hôm nay)
  await py(KB + `col = mw.col
mm = col.models
m = mm.new("Kiến thức")
for f in ("Mặt trước", "Mặt sau"):
    mm.add_field(m, mm.new_field(f))
t = mm.new_template("Thẻ 1"); t["qfmt"] = "{{Mặt trước}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Mặt sau}}"
mm.add_template(m, t); mm.add(m)
m = mm.by_name("Kiến thức")
the = json.load(open(${JSON.stringify(require('path').join(__dirname, '..', 'fixtures', 'vi_deck.json'))}, encoding="utf-8"))["the"]
did = col.decks.id("Lịch sử & Sinh học")
nids = []
for front, back, _d, _due in [x for x in the if not any("\\uac00" <= c <= "\\ud7af" for c in x[0])][:12]:
    n = col.new_note(m); n["Mặt trước"], n["Mặt sau"] = front, back
    col.add_note(n, did); nids.append(n.id)
cids = [c for nid in nids for c in col.card_ids_of_note(nid)]
col.sched.set_due_date(cids[:6], "0")
col.sched.set_due_date(cids[6:], "5")
kb.save_config(gemini_key="AQ.Ab8RN6thu-khoa-gia-1251-0000000000", bao_source="gemini", gemini_langs=["vi"], gemini_auto=False,
               paper_confirmed={"ja": "gemini", "en": "", "vi": "gemini"}, gemini_wait_start=False, gemini_wait_langs=[])
kb._kb_prompts = []
${FAKE}
d = kb.STATE.load(); d["coins"] = 250; kb.STATE.save(d)
result = len(nids)`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("Lịch sử & Sinh học"); d.refresh(); result = 1');
  await sleep(2500);
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  page.errors.splice(0);

  console.log('== deck kiến thức tiếng Việt, Nguồn báo');
  const lang = await py(KB + 'infos = kb.words.model_infos(mw.col, kb.core.merged_config(kb.config())); result = [i["lang"] for i in infos.values() if i["name"] == "Kiến thức"]');
  ok(lang[0] === 'other', 'loại note "Kiến thức" (tiếng Việt có dấu) → Ngôn ngữ khác (' + lang + ')');
  await js('GardenPaper.open("src"); return 1;');
  await waitFor('document.querySelector(".kb-ai-plan")');
  await sleep(500);
  const want = await js('return [...document.querySelectorAll(".kb-ai-want label")].map((l) => [l.textContent.trim(), l.querySelector("input").checked, l.querySelector("input").disabled]);');
  ok(want.length === 3 && want[2][0] === 'Chỉ tiếng Việt' && want[2][1] && !want[0][2] && !want[1][2],
     'Báo muốn nhận: Tiếng Nhật / Tiếng Anh / Tiếng Việt, tick được cả khi chưa có deck (' + JSON.stringify(want) + ')');
  let txt = await srcText();
  ok(/Gói báo/.test(txt) && /Số báo đầu tiên được tặng 7 ngày/.test(txt) && /Mua 1 tuần · 100 xu/.test(txt) && /Mua 1 tháng · 300 xu/.test(txt),
     'thẻ Gói báo: chưa có gói, tặng 7 ngày, Mua 1 tuần · 100 xu / 1 tháng · 300 xu');
  ok(/Báo tiếng Việt/.test(txt) && /Báo Làng Kotoba/.test(txt) && !/Trình độ/.test(txt) && !/Lấy thẻ|Lấy từ/.test(txt)
     && /truyện dài kỳ \+ tin làng/.test(txt), 'khối Báo tiếng Việt: Báo Làng Kotoba, không Trình độ, không lấy thẻ / deck (1.25.2: chỉ truyện + tin làng)');
  ok(!/Giọng đọc/.test(txt) && !/câu không có audio/.test(txt), 'chỉ có báo tiếng Việt: không hàng Giọng đọc, không thẻ giọng cho câu chép');
  const tones = await js('const r = document.querySelector(".kb-ai-tones"); return r ? [...r.querySelectorAll(".kb-ai-chip")].map((b) => [b.textContent, b.classList.contains("is-on")]) : [];');
  ok(tones.length === 8 && tones.map((t) => t[0]).indexOf('Kinh dị nhẹ') >= 0 && tones.map((t) => t[0]).indexOf('Dễ thương') >= 0 && tones[0][1],
     'Chủ đề truyện: 8 nút (có Kinh dị nhẹ, Dễ thương), mặc định Ấm áp đời thường');
  await shot('01_nguon_bao');

  console.log('== chủ đề truyện chọn nhiều');
  const clickTone = (name) => js(`[...document.querySelectorAll(".kb-ai-tones .kb-ai-chip")].find((b) => b.textContent === ${JSON.stringify(name)}).click(); return 1;`);
  await clickTone('Kinh dị nhẹ'); await sleep(700);
  await clickTone('Hài'); await sleep(700);
  await clickTone('Ấm áp đời thường'); await sleep(700);
  let ts = await py(KB + 'c = kb.config(); result = [c.get("gemini_story_tones"), c.get("gemini_story_tone")]');
  ok(JSON.stringify(ts[0]) === '["hai","kinh_di"]' && ts[1] === 'hai', 'bật Kinh dị nhẹ + Hài, tắt Ấm áp → lưu ["hai","kinh_di"], khoá cũ = chủ đề đầu (' + JSON.stringify(ts) + ')');
  ok(/mỗi đợt 6–8 kỳ một chủ đề/.test(await srcText()), 'chọn hơn một chủ đề: ghi chú "mỗi đợt 6–8 kỳ một chủ đề, lần lượt"');
  await clickTone('Hài'); await sleep(700);
  await clickTone('Kinh dị nhẹ'); await sleep(700);
  ts = await py(KB + 'result = kb.config().get("gemini_story_tones")');
  ok(JSON.stringify(ts) === '["kinh_di"]', 'không tắt được chủ đề cuối cùng (còn Kinh dị nhẹ) ' + JSON.stringify(ts));
  await shot('02_chu_de');

  console.log('== số đầu tiên: tặng 7 ngày');
  await js('[...document.querySelectorAll(".kb-ai-lang")].find((x) => /Báo tiếng Việt/.test(x.textContent)).querySelector(".kb-ai-main").click(); return 1;');
  const wrote = await waitPy('result = kb.ai.has_issue(kb.AI_DIR_VI, kb.ai_today()) and not kb._ai["running"]', 30000);
  let sub = await py(KB + 'd = kb.STATE.load(); result = [d["coins"], d["more"]["paper_sub"]]');
  ok(wrote && sub[0] === 250 && sub[1].trial === await py(KB + 'result = kb.ai_today()'),
     'bấm Viết → Gemini (giả) viết số tiếng Việt; tặng thử 7 ngày, xu giữ 250 (' + JSON.stringify(sub) + ')');
  if (!wrote) {
    console.log('    (chẩn đoán)', JSON.stringify(await py(KB + 'st = kb.ai.load_status(kb.AI_DIR_VI); result = [st.get("error"), kb._ai.get("why"), kb.ai.log_summary(kb.ai.last_log(kb.AI_DIR_VI, kb.ai_today()))[:12], len(kb._kb_prompts), [e.get("where") + ": " + str(e.get("msg"))[:300] for e in kb.ERRORS.entries()]]')));
  }
  const pr = await py(KB + 'result = [p for p in kb._kb_prompts if "TIN LÀNG HÔM NAY" in p][:1]');
  const wx = await py(KB + 'result = kb._village_weather(kb.ai_today())');
  ok(pr.length && /Kinh dị nhẹ/.test(pr[0]) && pr[0].indexOf('THỜI TIẾT HÔM NAY Ở LÀNG (khớp với trời trong vườn): ' + wx) >= 0 && !/DANH SÁCH THẺ/.test(pr[0]),
     'lời nhắc bản gốc: chủ đề Kinh dị nhẹ, thời tiết = trời trong vườn ("' + wx + '"), không thẻ');
  const jsWx = await js('const d = new Date(); return [9, 15].map((h) => GardenSky._weatherAuto(new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, 30).getTime()));');
  const lbl = { sunny: 'nắng', cloudy: 'nhiều mây', rain: 'mưa', storm: 'giông', snow: 'tuyết' };
  ok(wx === (jsWx[0] === jsWx[1] ? 'cả ngày ' + lbl[jsWx[0]] : 'sáng ' + lbl[jsWx[0]] + ', chiều ' + lbl[jsWx[1]]),
     'thời tiết trong báo khớp trời của vườn lúc 9 giờ / 15 giờ (' + JSON.stringify(jsWx) + ')');
  const saved = await py(KB + 'raw = json.load(open(kb.ai.issue_path(kb.AI_DIR_VI, kb.ai_today()), encoding="utf-8")); m = kb.story_core.load_master(kb.AI_DIR_SHARED, kb.ai_today()); result = [raw.get("ngon_ngu"), [b["loai"] for b in raw["bai"]], raw.get("tra_tu", {}), raw["chinh_ta"], [b["doan"] for b in raw["bai"] if b["loai"] == "truyen"][0] == m["truyen"]["doan"], len(m["tin"])]');
  ok(saved[0] === 'vi' && saved[1].join(',') === 'tin_lang,truyen,cot' && Object.keys(saved[2]).length === 0 && saved[3].length === 0 && saved[4] && saved[5] === 2,
     'bao.json: ngon_ngu vi, 3 bài, truyện = nguyên văn bản gốc (bao_chung/ban_goc), 2 tin làng chung, không bảng tra / câu chép');
  await sleep(1200);

  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1500);
  const chip = await js('const b = document.getElementById("kb-paper-btn"); return [b.hidden, b.textContent];');
  const dictOk = await py(KB + 'result = kb.paper_summary(kb._dialog).get("dict_ok")');
  ok(!chip[0] && /Báo mới 1/.test(chip[1]) && (dictOk || !/Chép/.test(chip[1])),
     'thẻ Hôm nay: "' + chip[1] + '"' + (dictOk ? ' (deck có thứ để chép)' : ' — chỉ báo tiếng Việt, không có gì để chép: không ghi "Chép 0/5"'));
  console.log('== đọc số tiếng Việt');
  await js('GardenPaper.close(); GardenPaper.open("issue"); return 1;');
  await waitFor('document.querySelector(".kb-p-mast")', 10000);
  await sleep(600);
  const iv = await js(`const st = document.getElementById("kb-p-stage");
    return [st.querySelector(".kb-p-name").textContent, st.querySelector(".kb-p-meta").textContent, [...st.querySelectorAll(".kb-p-kind")].map((x) => x.textContent),
      document.getElementById("kb-p-furi").hidden, st.querySelectorAll(".kb-p-play").length, st.querySelectorAll(".kb-p-dbtn").length,
      document.getElementById("kb-p-dich").hidden, st.querySelectorAll(".kb-p-dict").length, st.querySelectorAll(".kb-p-w").length,
      st.querySelector(".kb-p-name").lang, st.querySelector(".kb-p-credit").textContent];`);
  const today = await py(KB + 'd = datetime.date.today(); result = [d.day, d.month, d.year]');
  ok(iv[0] === 'Báo Làng Kotoba' && iv[1].indexOf(today[0] + '/' + today[1] + '/' + today[2]) >= 0 && /Số 1/.test(iv[1]) && iv[9] === 'vi',
     'đầu báo "Báo Làng Kotoba", ngày ' + iv[1] + ', lang="vi"');
  ok(iv[2].join('|') === 'Tin làng|Truyện dài kỳ · Kỳ 1|Cột ngắn', 'các mục: Tin làng / Truyện dài kỳ · Kỳ 1 / Cột ngắn');
  ok(iv[3] && iv[4] === 0 && iv[5] === 0 && iv[6] && iv[7] === 0 && iv[8] === 0, 'không nút furigana, không ▶ nghe, không Dịch, không câu chép, không chữ gạch chân');
  ok(!/thẻ của bạn/.test(iv[10]) && /viết tự động\./.test(iv[10]), 'dòng cuối: "Báo do … viết tự động."');
  const fbOk = await js('const b = [...document.querySelectorAll("#kb-p-stage .kb-p-fbs-b")].find((x) => x.textContent === "Kỳ này hay"); if (!b) return false; b.click(); return true;');
  await sleep(800);
  const fbSaved = await py(KB + 'result = kb.story_core.feedback_of(kb.AI_DIR_SHARED, 1)');
  ok(fbOk && fbSaved && fbSaved.y === 'hay', 'bấm "Kỳ này hay" → ghi vào truyện chung (bao_chung), kỳ sau mọi báo đọc');
  await shot('03_bao_tieng_viet');
  const c0 = await py(KB + 'result = kb.STATE.load()["coins"]');
  for (const [qi, right] of [[0, 0], [1, 1], [2, 2]]) {
    await js(`document.querySelectorAll("#kb-p-stage .kb-p-q")[${qi}].querySelectorAll(".kb-p-opt")[${right}].click(); return 1;`); await sleep(700);
  }
  const c1 = await py(KB + 'result = kb.STATE.load()["coins"]');
  ok(c1 - c0 === 3 * 2 + 5, 'trả lời đúng 3 câu: +2 mỗi câu, làm hết +5 (' + c0 + ' → ' + c1 + ')');
  await js('document.querySelector("#kb-p-stage .kb-p-practice").scrollIntoView(); return 1;'); await sleep(300);
  await shot('04_cau_hoi');

  console.log('== hết hạn + Tự gia hạn → gia hạn tuần (−100)');
  const reset = (until, auto, coins) => py(KB + `d = kb.STATE.load(); d["coins"] = ${coins}; s = d["more"]["paper_sub"]; s["until"] = ${until}; s["auto"] = ${auto}; kb.STATE.save(d)
shutil.rmtree(os.path.join(kb.AI_DIR_VI, "bao", kb.ai_today()), ignore_errors=True)
st = kb.ai.load_status(kb.AI_DIR_VI); st["last_try"] = 0; kb.ai.save_status(kb.AI_DIR_VI, st)
result = 1`);
  const yday = '(datetime.date.today() - datetime.timedelta(days=1)).isoformat()';
  await reset(yday, 'True', 400);
  await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(1200);
  await js('[...document.querySelectorAll(".kb-ai-lang")].find((x) => /Báo tiếng Việt/.test(x.textContent)).querySelector(".kb-ai-main").click(); return 1;');
  await waitPy('result = kb.ai.has_issue(kb.AI_DIR_VI, kb.ai_today()) and not kb._ai["running"]', 30000);
  sub = await py(KB + 'd = kb.STATE.load(); result = [d["coins"], d["more"]["paper_sub"]["until"], (datetime.date.today() + datetime.timedelta(days=6)).isoformat()]');
  ok(sub[0] === 300 && sub[1] === sub[2], 'hết hạn hôm qua + Tự gia hạn + đủ xu → −100 xu, gói tới ' + sub[1]);
  await sleep(1500);

  console.log('== tắt Tự gia hạn → không viết, nút Gia hạn');
  await reset(yday, 'True', 400);
  await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(1200);
  await js('document.querySelector(".kb-ai-plan input[type=checkbox]").click(); return 1;'); await sleep(800);
  ok(await py(KB + 'result = kb.STATE.load()["more"]["paper_sub"]["auto"]') === false, 'bỏ tick "Tự gia hạn" → lưu auto = false');
  await js('[...document.querySelectorAll(".kb-ai-lang")].find((x) => /Báo tiếng Việt/.test(x.textContent)).querySelector(".kb-ai-main").click(); return 1;');
  await sleep(1500);
  const fl = await flash();
  const noIssue = await py(KB + 'result = not kb.ai.has_issue(kb.AI_DIR_VI, kb.ai_today()) and kb.STATE.load()["coins"] == 400');
  ok(noIssue && /Gói báo đã hết hạn/.test(fl), 'hết hạn, Tự gia hạn tắt → không gọi Gemini, không trừ xu, báo "' + fl + '"');
  txt = await srcText();
  ok(/Đã hết hạn/.test(txt) && /Gói báo hết hạn — gia hạn ở thẻ Gói báo/.test(txt) && /Gia hạn|Mua 1 tuần/.test(txt), 'thẻ Gói báo "Đã hết hạn"; hàng Hôm nay: "Gói báo hết hạn — gia hạn ở thẻ Gói báo"');
  await shot('05_het_han');
  await js('GardenPaper.close(); GardenPaper.open("issue"); return 1;'); await sleep(1500);
  txt = await srcText();
  ok(/Gói báo đã hết hạn/.test(txt) && /Gia hạn 1 tuần · 100 xu/.test(txt) && /Gia hạn 1 tháng · 300 xu/.test(txt) && !/Chép chính tả/.test(txt),
     'tab Báo: "Gói báo đã hết hạn" + nút Gia hạn 1 tuần / 1 tháng (không có nút Chép chính tả ở báo tiếng Việt)');
  await shot('06_bao_het_han');
  await js('[...document.querySelectorAll("#kb-p-stage .kb-p-go")].find((b) => /Gia hạn 1 tuần/.test(b.textContent)).click(); return 1;');
  await waitPy('result = kb.ai.has_issue(kb.AI_DIR_VI, kb.ai_today()) and not kb._ai["running"]', 30000);
  sub = await py(KB + 'd = kb.STATE.load(); result = [d["coins"], d["more"]["paper_sub"]["until"], (datetime.date.today() + datetime.timedelta(days=6)).isoformat()]');
  ok(sub[0] === 300 && sub[1] === sub[2], 'bấm "Gia hạn 1 tuần · 100 xu" → −100 xu, gói tới ' + sub[1] + ', Gemini viết số mới');
  await sleep(1500);

  console.log('== nút mua khoá khi thiếu xu / quá 60 ngày');
  await py(KB + 'd = kb.STATE.load(); d["coins"] = 120; kb.STATE.save(d); result = 1');
  await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(1200);
  let bt = await js('return [...document.querySelectorAll(".kb-ai-plan button")].map((b) => [b.textContent, b.disabled, b.title]);');
  const planTxt = await js('return document.querySelector(".kb-ai-plan").innerText;');
  ok(bt.length === 2 && !bt[0][1] && bt[1][1] && /Thiếu [0-9.]+ xu/.test(bt[1][2]) && /Còn 7 ngày/.test(planTxt),
     'còn 7 ngày, 120 xu: Gia hạn tuần bấm được, tháng khoá ("Thiếu N xu") ' + JSON.stringify(bt) + ' ' + JSON.stringify(planTxt.replace(/\n/g, ' | ')));
  await py(KB + 'd = kb.STATE.load(); d["coins"] = 5000; d["more"]["paper_sub"]["until"] = (datetime.date.today() + datetime.timedelta(days=40)).isoformat(); kb.STATE.save(d); result = 1');
  await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(1200);
  bt = await js('return [...document.querySelectorAll(".kb-ai-plan button")].map((b) => [b.textContent, b.disabled, b.title]);');
  ok(!bt[0][1] && bt[1][1] && /tối đa 60 ngày/.test(bt[1][2]), 'còn 41 ngày: tuần được, tháng khoá (quá 60 ngày)');
  await js('document.querySelectorAll(".kb-ai-plan button")[1].disabled = false; document.querySelectorAll(".kb-ai-plan button")[1].click(); return 1;'); await sleep(900);
  const capped = await py(KB + 'd = kb.STATE.load(); result = [d["coins"], d["more"]["paper_sub"]["until"]]');
  ok(capped[0] === 5000 && /tối đa 60 ngày/.test(await flash()), 'gửi lệnh mua tháng thẳng (bỏ khoá nút) → Python từ chối, không trừ xu');

  console.log('== Báo muốn nhận: Nhật / Anh hoặc chỉ tiếng Việt (1.25.2)');
  await py(KB + 'kb.save_config(gemini_langs=["ja", "vi"]); result = 1');
  ok(JSON.stringify(await py(KB + 'result = kb.wanted_langs()')) === '["ja"]', 'cấu hình cũ ["ja","vi"] → chỉ đọc báo tiếng Nhật (Việt không đi cùng Nhật / Anh)');
  const tick = (label) => js(`const l = [...document.querySelectorAll(".kb-ai-want label")].find((x) => x.textContent.trim() === ${JSON.stringify(label)}); l.querySelector("input").click(); return 1;`);
  await py(KB + 'kb.save_config(gemini_langs=["vi"]); result = 1');
  await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(1200);
  await tick('Tiếng Nhật'); await sleep(900);
  let wl = await py(KB + 'result = kb.config().get("gemini_langs")');
  ok(JSON.stringify(wl) === '["ja"]', 'đang chỉ tiếng Việt, tick Tiếng Nhật → bỏ tiếng Việt: ' + JSON.stringify(wl));
  await tick('Tiếng Anh'); await sleep(900);
  ok(/hai báo cùng kể một chuyện/.test(await srcText()), 'tick Nhật + Anh: ghi chú "hai báo cùng kể một chuyện"');
  await tick('Chỉ tiếng Việt'); await sleep(900);
  wl = await py(KB + 'result = kb.config().get("gemini_langs")');
  ok(JSON.stringify(wl) === '["vi"]', 'tick "Chỉ tiếng Việt" → bỏ Nhật + Anh: ' + JSON.stringify(wl));
  await shot('07b_chi_tieng_viet');

  console.log('== Kệ báo, Không dùng deck, Luyện viết');
  await py(KB + 'kb.save_config(gemini_langs=["ja", "en"]); result = 1');
  await js('GardenPaper.close(); GardenPaper.open("shelf"); return 1;'); await sleep(1500);
  const bar = await js('return [...document.querySelectorAll(".kb-p-langs .kb-ai-chip")].map((b) => b.textContent);');
  ok(bar.some((b) => /Báo tiếng Anh/.test(b)) && bar.some((b) => /Báo tiếng Nhật/.test(b)), 'Kệ báo: nút chuyển Báo tiếng Nhật / Báo tiếng Anh ' + JSON.stringify(bar));
  await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(1200);
  txt = await srcText();
  ok(/Giọng đọc/.test(txt), 'báo tiếng Nhật / tiếng Anh → hàng Giọng đọc hiện lại');
  await js('const r = [...document.querySelectorAll(".kb-ai-lang")].find((x) => /Báo tiếng Nhật/.test(x.textContent)); [...r.querySelectorAll(".kb-ai-chip")].find((b) => b.textContent === "Không dùng deck").click(); return 1;');
  await sleep(1000);
  const lv = await py(KB + 'src = kb.words.load_src(mw.col); sc = kb._ai_scope(kb.config(), kb._ai_opts(kb.config()), "ja"); result = [src["ja"]["mode"], sc.get("khong_deck"), len(sc.get("kho") or [])]');
  ok(lv[0] === 'level' && lv[1] === true && lv[2] === 0, 'tiếng Nhật → Không dùng deck: lưu mode "level", phạm vi không deck (Gemini viết theo trình độ)');
  const lvOn = await js('const r = [...document.querySelectorAll(".kb-ai-lang")].find((x) => /Báo tiếng Nhật/.test(x.textContent)); return [[...r.querySelectorAll(".kb-ai-chip.is-on")].map((b) => b.textContent), /Trình độ/.test(r.textContent)];');
  ok(lvOn[0].indexOf('Không dùng deck') >= 0 && lvOn[1], 'nút "Không dùng deck" sáng, vẫn chọn Trình độ');
  await js('const r = [...document.querySelectorAll(".kb-ai-lang")].find((x) => /Báo tiếng Nhật/.test(x.textContent)); [...r.querySelectorAll(".kb-ai-chip")].find((b) => b.textContent === "Mọi deck").click(); return 1;');
  await sleep(900);
  ok(await py(KB + 'result = kb.words.load_src(mw.col)["ja"]["mode"]') === 'deck', 'bấm Mọi deck → về "deck"');
  await shot('07_hai_bao');
  await js('GardenPaper.close(); return 1;');
  // Luyện viết: chỉ báo tiếng Việt + không có deck Nhật / Anh → ẩn
  await py(KB + 'kb.save_config(gemini_langs=["vi"]); kb._lang_presence = lambda: {"ja": False, "en": False}; result = 1');
  await js('GardenCal.open(); return 1;'); await sleep(1500);
  const noWrite = await js('return !!document.querySelector("#kb-cal .kb-cw-write, #kb-cal [class*=write]") || /Luyện viết/.test(document.getElementById("kb-cal").innerText);');
  ok(!noWrite, 'chỉ báo tiếng Việt, không có deck Nhật / Anh → Lịch hoa không có Luyện viết');
  await py(KB + 'kb._lang_presence = lambda: {"ja": True, "en": True}; result = 1');
  await js('GardenCal.close && GardenCal.close(); GardenCal.open(); return 1;'); await sleep(1500);
  const hasWrite = await js('return /Luyện viết/.test(document.getElementById("kb-cal").innerText);');
  ok(hasWrite, 'có deck tiếng Nhật / tiếng Anh (chưa tick báo) → Luyện viết hiện lại');
  await js('GardenCal.close && GardenCal.close(); return 1;'); await sleep(500);

  console.log('== Đuổi quạ cho deck tiếng Hàn (Ngôn ngữ khác)');
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("J::Tiếng Hàn"); d.refresh(); result = 1'); await sleep(2500);
  await js('GardenGames.open(); return 1;'); await sleep(1200);
  const crowCard = await js('const c = [...document.querySelectorAll(".kb-g-card, .kb-g-pick, [data-game]")].find((x) => /Đuổi quạ/.test(x.textContent)); return c ? [c.textContent, !!c.querySelector("button:disabled"), c.className] : null;');
  ok(crowCard && !/chưa hỗ trợ/.test(crowCard[0]), 'bảng Trò chơi: Đuổi quạ không còn "chưa hỗ trợ ngôn ngữ này" (' + (crowCard ? crowCard[0].slice(0, 80) : 'không thấy') + ')');
  const modes = await js('const sel = [...document.querySelectorAll("select")].find((s) => [...s.options].some((o) => /gõ nghĩa/.test(o.textContent))); return sel ? [...sel.options].map((o) => o.textContent) : [];');
  ok(modes.indexOf('Nghĩa → gõ từ') >= 0 && modes.indexOf('Từ → gõ nghĩa') >= 0, 'kiểu chơi: Nghĩa → gõ từ / Từ → gõ nghĩa ' + JSON.stringify(modes));
  await shot('08_tro_choi_han');
  await js('const sel = [...document.querySelectorAll("select")].find((s) => [...s.options].some((o) => /gõ nghĩa/.test(o.textContent))); sel.value = [...sel.options].find((o) => /Nghĩa → gõ từ/.test(o.textContent)).value; sel.dispatchEvent(new Event("change", { bubbles: true })); return 1;');
  await sleep(600);
  await js('const c = [...document.querySelectorAll(".kb-g-card, .kb-g-pick, [data-game]")].find((x) => /Đuổi quạ/.test(x.textContent)); (c.querySelector("button:not(:disabled)") || c).click(); return 1;');
  await waitFor('document.querySelector(".kb-gc-input")', 6000);
  await sleep(2500);
  const ph = await js('return document.querySelector(".kb-gc-input").placeholder;');
  ok(/Gõ từ/.test(ph), 'vào game: ô gõ "' + ph + '"');
  // gõ đáp án của con quạ đang bay (từ tiếng Hàn tương ứng nghĩa trên biển)
  const KO = { 'quả táo': '사과', 'trường học': '학교', 'nước': '물', 'sách': '책', 'bạn': '친구' };
  let scared = false;
  for (let k = 0; k < 20 && !scared; k++) {
    const lab = await js('const st = GardenGames._state ? GardenGames._state() : null; return st && st.crows ? st.crows.filter((c) => c.state === "fly").map((c) => c.label) : null;');
    const hudBefore = await js('return document.querySelector(".kb-g-hud") ? document.querySelector(".kb-g-hud").textContent : "";');
    const tryWords = lab && lab.length ? lab.map((l) => KO[l]).filter(Boolean) : Object.values(KO);
    for (const w of tryWords.slice(0, 5)) {
      await js(`const i = document.querySelector(".kb-gc-input"); i.focus(); i.value = ${JSON.stringify(w)}; i.dispatchEvent(new Event("input", { bubbles: true })); i.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); return 1;`);
      await sleep(250);
    }
    const hudAfter = await js('return document.querySelector(".kb-g-hud") ? document.querySelector(".kb-g-hud").textContent : "";');
    const m0 = /Điểm(\d+)/.exec(hudBefore.replace(/\s/g, '')), m1 = /Điểm(\d+)/.exec(hudAfter.replace(/\s/g, ''));
    if (m1 && Number(m1[1]) > (m0 ? Number(m0[1]) : 0)) { scared = true; }
    await sleep(700);
  }
  ok(scared, 'gõ đúng từ tiếng Hàn (사과, 학교…) → đuổi được quạ, điểm tăng');
  await shot('09_duoi_qua_han');
  await js('GardenGames.close && GardenGames.close(); return 1;'); await sleep(800);

  console.log('== cửa sổ 1366 / 720 × 520: Nguồn báo có thẻ Gói báo');
  await py(KB + 'kb.save_config(gemini_langs=["ja", "en"]); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("Lịch sử & Sinh học"); d.refresh(); result = 1'); await sleep(2000);
  for (const [w, h] of [[1366, 768], [720, 520]]) {
    await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(1200);
    await js('GardenPaper.close(); GardenPaper.open("src"); return 1;'); await sleep(1500);
    const m = await js('const p = document.querySelector(".kb-ai-plan"), st = document.getElementById("kb-p-stage"); const r = p.getBoundingClientRect(), s = st.getBoundingClientRect(); return [Math.round(r.left - s.left), Math.round(s.right - r.right), st.scrollWidth - st.clientWidth, document.documentElement.scrollWidth - window.innerWidth, [...p.querySelectorAll("button")].map((b) => Math.round(b.getBoundingClientRect().right - s.right))];');
    ok(m[0] >= 0 && m[1] >= 0 && m[2] <= 1 && m[3] <= 1 && m[4].every((x) => x <= 0), w + ' px: thẻ Gói báo trong khung, không tràn ngang ' + JSON.stringify(m));
    await shot('10_nguon_bao_' + w);
  }
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1');

  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total + (pass === total ? ' đạt' : ' CÓ LỖI'));
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
