// Ảnh phác báo tiếng Trung / tiếng Hàn (bản riêng sau 1.32.2; quyết định người dùng chốt 17/11 — PHAT_TRIEN.md mục 7, 10.0c).
// Chưa phải mã thật: số báo mẫu (mock_133_bao.py) đặt vào thư mục báo của Anki mẫu, mở bằng trình đọc báo thật của add-on
// 1.32.1, rồi đổi đầu báo / ngày / nút / tab Nguồn báo bằng cách sửa DOM.
// Chạy sau mock_1322.js (cùng Anki mẫu, đã có khoá Gemini giả, gemini_auto = False):
//   $VENV_ZH/bin/python mock_133_bao.py zh $S/bao_zh.json NGÀY ; … ko $S/bao_ko.json NGÀY
//   node mock_133.js OUT BAO_DIR $S/bao_zh.json $S/bao_ko.json NGÀY ; python3 mock_133_ghep.py OUT RA
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const [OUT, BAO_DIR, ZH, KO, DAY] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const W = 1366, H = 860;
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, json, shutil\nkb = sys.modules["kotoba_batake"]\nfrom aqt import mw\n';
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
    const p = await Page.open(info.webSocketDebuggerUrl);
    const yes = await Promise.race([p.eval('typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
    if (yes) { return p; }
    p.close();
  }
  return null;
}
async function shot(name, clip) {
  await sleep(300);
  const r = await page.send('Page.captureScreenshot', Object.assign({ format: 'png' }, clip ? { clip: Object.assign({ scale: 1 }, clip) } : {}));
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.data, 'base64'));
  console.log('  ảnh', name);
}
const deck = (name) => py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`).then(() => sleep(2000));
const CSS = `
.mk-hl { outline: 3px dashed #e0544e !important; outline-offset: 3px; }
.mk-tip { margin: 8px 0 0; padding: 8px 12px; border: 2px dashed var(--kb-ink, #4a3426); background: #fff6d6; font-size: 14px;
  display: flex; align-items: center; gap: 12px; }
.mk-tag { display: inline-block; background: #e0544e; color: #fff; font: bold 12px sans-serif; padding: 2px 7px; border-radius: 4px; margin-left: 8px; vertical-align: middle; }
#kb-paper .kb-p-art[lang="zh-CN"] ruby rt { font-size: 0.5em; letter-spacing: 0; }
`;
const css = () => js(`if (!document.getElementById("mk133-css")) { const s = document.createElement("style"); s.id = "mk133-css"; s.textContent = ${JSON.stringify(CSS)}; document.head.appendChild(s); } return 1;`);

async function openIssue(file) {
  await py(KB + `p = ${JSON.stringify(path.join(BAO_DIR, DAY))}
os.makedirs(p, exist_ok=True)
shutil.copy(${JSON.stringify(file)}, os.path.join(p, "bao.json"))
result = 1`);
  await js(`GardenPaper.close(); return 1;`); await sleep(500);
  await js(`document.getElementById("kb-paper-btn").click(); return 1;`); await sleep(2500);
  await css();
}
// đầu báo / ngày / số / chữ trong bài theo ngôn ngữ báo
async function mast(o) {
  await js(`const o = ${JSON.stringify(o)};
    const n = document.querySelector("#kb-p-stage .kb-p-name"); n.textContent = o.name; n.lang = o.lang; n.classList.add("mk-hl");
    const m = document.querySelectorAll("#kb-p-stage .kb-p-meta > div"); m[0].textContent = o.date; m[1].textContent = o.so;
    document.querySelector("#kb-p-stage .kb-p-meta").lang = o.lang;
    document.querySelectorAll("#kb-p-stage .kb-p-art").forEach((a) => { a.lang = o.lang; });
    document.querySelectorAll("#kb-p-stage .kb-p-note").forEach((e) => e.remove());
    const f = document.getElementById("kb-p-furi"); if (o.furi) { f.textContent = o.furi; f.hidden = false; f.classList.add("mk-hl"); } else { f.hidden = true; }
    return 1;`);
}
async function lookup(word, extra) {
  await js(`const w = [...document.querySelectorAll("#kb-p-stage .kb-p-w")].find((x) => x.textContent.replace(/\\s/g, "").indexOf(${JSON.stringify(word)}) >= 0);
    if (w) { w.click(); }
    const info = document.getElementById("kb-p-info"); info.classList.add("mk-hl");
    const ex = ${JSON.stringify(extra || '')};
    if (ex) { const n = info.querySelector(".kb-p-inote") || info.appendChild(document.createElement("span")); n.className = "kb-p-inote"; n.textContent = ex; }
    return !!w;`);
}

async function chep(o) {
  await deck(o.deck);
  await openIssue(o.file);
  await js(`[...document.querySelectorAll(".kb-p-tab")].find((x) => /Chép/.test(x.textContent)).click(); return 1;`);
  await sleep(2000); await css();
  await js(`const o = ${JSON.stringify(o)};
    const st = document.getElementById("kb-p-stage");
    const n = st.querySelector(".kb-p-name"); n.textContent = o.title; n.lang = o.lang; n.classList.add("mk-hl");
    document.getElementById("kb-p-info").textContent = o.info;
    const f = document.getElementById("kb-p-furi"); if (f) { f.hidden = o.lang !== "zh-CN"; f.textContent = "Ẩn pinyin"; f.classList.remove("mk-hl"); }
    st.querySelector(".kb-p-dcount").textContent = "Hôm nay 1/1 câu";
    st.querySelectorAll(".kb-p-ct").forEach((ct, i) => { if (i > 0) ct.remove(); });
    const ct = st.querySelector(".kb-p-ct");
    ct.querySelectorAll(".kb-p-fb, .kb-p-ans").forEach((e) => e.remove());
    const inp = ct.querySelector("input"); inp.value = o.typed; inp.lang = o.lang;
    ct.querySelector(".kb-p-ct-len").textContent = o.lang === "ko" ? "4 cụm" : "4 chữ";
    const fb = document.createElement("div"); fb.className = "kb-p-fb is-bad"; fb.textContent = o.fb; ct.appendChild(fb);
    const ans = document.createElement("div"); ans.className = "kb-p-ans mk-hl"; ans.lang = o.lang; ans.style.marginTop = "14px";
    o.marks.forEach((m) => {
      const sp = document.createElement(m[1] ? "ruby" : "span"); sp.appendChild(document.createTextNode(m[0]));
      if (m[1]) { const rt = document.createElement("rt"); rt.textContent = m[1]; sp.appendChild(rt); }
      if (m[0].trim() && !/^[。.]$/.test(m[0])) { sp.style.background = m[2] ? "#d8f2dc" : "#ffd6d3"; sp.style.padding = "0 2px"; sp.style.margin = "0 1px"; }
      ans.appendChild(sp);
    });
    const note = document.createElement("div"); note.className = "kb-p-ans-m"; note.lang = "vi"; note.textContent = "Xanh: đúng · hồng: chưa đúng. Câu này sẽ quay lại để ôn sau 1 ngày.";
    ans.appendChild(note); ct.appendChild(ans);
    return 1;`);
  await sleep(300);
  await shot(o.out, { x: 0, y: 0, width: W, height: H });
  await js(`GardenPaper.close(); return 1;`);
}

(async () => {
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + `kb._dialog.resize(${W}, ${H}); result = 1`);

  // 1. báo tiếng Trung: pinyin trên chữ, bấm từ → pinyin + nghĩa + Hán Việt
  await deck('Tiếng Trung::HSK 1');
  await openIssue(ZH);
  await mast({ name: '菜园日报', lang: 'zh-CN', date: '2026年11月16日 星期一', so: '第1期', furi: 'Ẩn pinyin' });
  console.log('  tra từ:', await lookup('害怕', 'Đã học ở deck Tiếng Trung::HSK 1 · Cây trong vườn: Cây non'));
  await shot('133_02_bao_trung', { x: 0, y: 0, width: W, height: H });
  // ẩn pinyin (như Ẩn furigana)
  await js(`document.getElementById("kb-paper").classList.add("kb-p-nofuri"); document.getElementById("kb-p-furi").textContent = "Hiện pinyin"; return 1;`);
  await shot('raw_bao_trung_an_pinyin', { x: 0, y: 0, width: W, height: H });
  await js(`document.getElementById("kb-paper").classList.remove("kb-p-nofuri"); return 1;`);

  // 2. báo tiếng Hàn: bấm từ có tiểu từ / đuôi dính → từ gốc
  await deck('Tiếng Hàn::Sơ cấp 1');
  await openIssue(KO);
  await mast({ name: '텃밭 신문', lang: 'ko', date: '2026년 11월 16일 월요일', so: '제1호', furi: '' });
  console.log('  tra từ:', await lookup('무서워서', '무서워서 → dạng gốc 무섭다 · Đã học ở deck Tiếng Hàn::Sơ cấp 1'));
  await shot('133_03_bao_han', { x: 0, y: 0, width: W, height: H });

  // 3. tab Nguồn báo: Báo muốn nhận có Trung / Hàn, tối đa 2; mặc định theo deck đang chọn; gợi ý thêm báo thứ hai
  await deck('Tiếng Trung::HSK 1');
  await openIssue(ZH);
  await js(`[...document.querySelectorAll(".kb-p-tab")].find((x) => /Nguồn/.test(x.textContent)).click(); return 1;`);
  await sleep(2000); await css();
  await js(`const want = document.querySelector(".kb-ai-want .kb-ai-v"); want.textContent = "";
    [["Tiếng Nhật", 0], ["Tiếng Anh", 0], ["Tiếng Trung", 1], ["Tiếng Hàn", 0], ["Chỉ tiếng Việt", 0]].forEach((x) => {
      const l = document.createElement("label"); l.className = "kb-ai-tick" + (x[0] === "Chỉ tiếng Việt" ? " kb-ai-tick-vi" : "");
      const c = document.createElement("input"); c.type = "checkbox"; c.checked = !!x[1]; l.appendChild(c); l.appendChild(document.createTextNode(" " + x[0]));
      if (x[1]) { l.classList.add("mk-hl"); }
      want.appendChild(l);
    });
    const h = document.createElement("span"); h.className = "kb-ai-hint"; h.textContent = "tối đa 2 báo"; want.appendChild(h);
    const row = document.querySelector(".kb-ai-want");
    const tip = document.createElement("div"); tip.className = "mk-tip";
    tip.appendChild(document.createTextNode("Bạn cũng học tiếng Hàn — thêm báo tiếng Hàn?"));
    const b = document.createElement("button"); b.className = "kb-btn kb-btn-small"; b.textContent = "Thêm báo tiếng Hàn"; tip.appendChild(b);
    const x = document.createElement("button"); x.className = "kb-btn kb-btn-small"; x.textContent = "Không"; tip.appendChild(x);
    row.appendChild(tip);
    // khối báo trong thẻ Gemini: Báo tiếng Nhật → Báo tiếng Trung (HSK 1–6); bỏ khối Báo tiếng Anh
    const blocks = [...document.querySelectorAll(".kb-ai-lang")];
    blocks.forEach((bl) => {
      const t = bl.querySelector(".kb-ai-lang-h b"), hint = bl.querySelector(".kb-ai-lang-h .kb-ai-hint");
      if (/Anh/.test(t.textContent)) { bl.remove(); return; }
      t.textContent = "Báo tiếng Trung"; hint.textContent = "菜园日报"; hint.lang = "zh-CN";
      const chips = [...bl.querySelectorAll(".kb-ai-chip")].filter((c) => /^N\\d$/.test(c.textContent));
      const parent = chips[0].parentElement;
      chips.forEach((c) => c.remove());
      for (let i = 1; i <= 6; i++) {
        const c = document.createElement("button"); c.className = "kb-btn kb-btn-small kb-ai-chip" + (i === 2 ? " is-on" : ""); c.textContent = "HSK " + i;
        parent.appendChild(c);
      }
      parent.parentElement.classList.add("mk-hl");
      const v = [...bl.querySelectorAll(".kb-ai-v")].find((e) => /Số 1/.test(e.textContent));
      if (v) { const s = v.querySelector("span span") || v.querySelector("span"); if (s) { s.lang = "zh-CN"; } }
    });
    return blocks.length;`);
  await sleep(300);
  await shot('133_01_nguon_bao', { x: 0, y: 0, width: W, height: H });
  // phần dưới: khối Gemini (cuộn xuống)
  await js(`const t = document.querySelector(".kb-ai-lang"); t.scrollIntoView({ block: "center" }); return 1;`);
  await shot('raw_nguon_bao_duoi', { x: 0, y: 0, width: W, height: H });
  await js(`GardenPaper.close(); return 1;`);

  // 4. chép chính tả: tiếng Trung chấm theo từng chữ (gõ bằng bộ gõ), tiếng Hàn chấm theo cụm (dấu cách)
  await chep({ deck: 'Tiếng Trung::HSK 1', file: ZH, out: '133_04_chep_trung', lang: 'zh-CN', title: '听写',
    info: 'Nghe rồi gõ lại câu bằng chữ Hán (bộ gõ pinyin của máy). Enter để kiểm tra.',
    typed: '林很害帕。', fb: 'Gần đúng — 3/4 chữ. 怕 (pà · sợ) gõ thành 帕 (pà · khăn): cùng âm, khác chữ.',
    marks: [['林', 'lín', 1], ['很', 'hěn', 1], ['害', 'hài', 1], ['怕', 'pà', 0], ['。', '', 1]] });
  await chep({ deck: 'Tiếng Hàn::Sơ cấp 1', file: KO, out: '133_05_chep_han', lang: 'ko', title: '받아쓰기',
    info: 'Nghe rồi gõ lại câu bằng chữ Hàn (bộ gõ tiếng Hàn của máy). Enter để kiểm tra.',
    typed: '린은 무서워서 손이 떨렷어요.', fb: 'Gần đúng — 3/4 cụm. 떨렸어요 gõ thành 떨렷어요 (ㅆ → ㅅ).',
    marks: [['린은', '', 1], [' ', '', 1], ['무서워서', '', 1], [' ', '', 1], ['손이', '', 1], [' ', '', 1], ['떨렸어요', '', 0], ['.', '', 1]] });
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
