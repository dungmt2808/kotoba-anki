// 1.35.6 trong Anki thật — người dùng 19/11: "giúp tớ thêm phần báo có mục ẩn vườn, hiện vườn nhé. sau đó test kỹ thêm".
// Nút "Ẩn vườn / Hiện vườn" trên bảng Báo (#kb-p-garden), như nút của bảng Trò chơi (1.35.3) — cùng chế độ "Trò chơi & báo":
//   A. cửa sổ 1850 × 1130: mặc định như cũ (khung báo tối đa 760 px, vườn bên dưới); bấm → sân + ruộng ẩn, khung báo cao kín
//      cửa sổ, trang không phải cuộn, bài đang đọc giữ nguyên (không vẽ lại, giữ chỗ đang cuộn), lưu `ui.panel`, bảng ôn /
//      màn chính không đổi; nút của Trò chơi cùng chữ; mở lại / đóng mở cửa sổ vườn vẫn nhớ; 4 tab đều cao kín;
//   B. chép chính tả: đang gõ mà bấm nút (chuột thật qua CDP) → ô gõ giữ con trỏ + chữ; Esc sau khi bấm chỉ đóng bảng Báo;
//   C. ⚙ Giao diện: bảng "Trò chơi & báo" ghi Ẩn; kiểu "Đầy đủ" → nút về "Ẩn vườn"; bảng ôn vẫn hiện vườn;
//   D. Lịch hoa (cùng chế độ): vườn ẩn theo, không tràn ngang;
//   E. 5 cỡ cửa sổ (1920 × 1080 … 800 × 600) × ẩn / hiện × 4 tab: nút nằm trong hàng trên cùng, hàng không cao hơn 1.35.5, từ
//      1024 px một hàng (cửa sổ hẹp: bỏ tiêu đề, chỉ khi nhờ đó bớt hàng — paper.js fitTop), không tràn ngang; vườn ẩn thì
//      khung báo không thấp hơn khi hiện, trang không phải cuộn;
//   F. dòng chú thích của ruộng ("Đang hiện N/M từ") ẩn theo ruộng ở Báo / Trò chơi / bảng ôn — trước đây nằm dưới bảng, trang
//      dài hơn cửa sổ; màn chính / vườn hiện thì như cũ;
//   G. nhật ký lỗi add-on trống, không lỗi JS.
// Chạy: KB_SCRIPTS=e2e_1356.js run_ui.sh ADDON SHOTS   (ANKI_WEBSCALE=1.25 cũng chạy được)
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
const jsErrors = [];
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
async function waitFor(expr, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await js('return (' + expr + ');')) return true; } catch (e) { /* trang đang nạp */ } await sleep(250); }
  return false;
}
const CLOSE_ALL = 'if (!document.getElementById("kb-panel").hidden) { document.getElementById("kb-stop").click(); } ' +
  'if (window.GardenGames) GardenGames.close(); if (window.GardenHome) GardenHome.close(); if (window.GardenPaper) GardenPaper.close(); ' +
  'if (window.GardenCal) GardenCal.close(); if (window.GardenUI && GardenUI.close) GardenUI.close(); ' +
  'if (window.GardenGreet && GardenGreet.close) GardenGreet.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;';

// hình học của bảng Báo
const GEO = `const st = document.getElementById("kb-p-stage").getBoundingClientRect(), y = document.getElementById("kb-yard-wrap"),
    f = document.getElementById("kb-field"), b = document.getElementById("kb-p-garden"), bg = document.getElementById("kb-g-garden"),
    br = b.getBoundingClientRect(), x = document.getElementById("kb-p-exit").getBoundingClientRect(),
    top = document.querySelector("#kb-paper .kb-game-top").getBoundingClientRect(), on = document.querySelector(".kb-p-tab.is-on");
  return JSON.stringify({ stage: Math.round(st.height), bottom: Math.round(st.bottom), vh: innerHeight, vw: innerWidth,
    yard: !!y.offsetParent, field: !!(f && f.offsetParent), btn: b.textContent, pressed: b.getAttribute("aria-pressed"),
    gbtn: bg.textContent, visible: !!b.offsetParent, docH: document.documentElement.scrollHeight,
    docW: document.documentElement.scrollWidth, sameRow: Math.abs(br.top - x.top) < 4,
    inside: br.right <= top.right + 1 && br.left >= top.left - 1 && br.bottom <= top.bottom + 1 && br.top >= top.top - 1,
    btnH: Math.round(br.height), topH: Math.round(top.height), tab: on && on.getAttribute("data-ptab"),
    vi: !!document.querySelector("#kb-paper .kb-game-top > .kb-g-title").offsetParent,
    title: document.querySelector("#kb-paper .kb-game-top > .kb-g-title").textContent,
    mode: [...document.getElementById("kb-app").classList].filter((c) => /^kb-ui-(m|yard|field)-/.test(c)).join(" ") });`;
const geo = () => js(GEO).then(JSON.parse);
const uiCfg = () => py(KB + 'c = kb.config()["ui"]; result = [c["panel"]["yard"], c["panel"]["field"], c["review"]["yard"], c["review"]["field"], c["main"]["yard"], c["main"]["field"]]');

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1850, 1130); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(2200);
  await js(CLOSE_ALL); await sleep(300);

  // ---------------- A. bảng Báo ở cửa sổ lớn ----------------
  console.log('== A. Báo: Ẩn vườn / Hiện vườn (1850 × 1130)');
  await js('GardenPaper.open("issue"); return 1;');
  ok(await waitFor('document.querySelectorAll("#kb-p-stage .kb-p-art").length >= 3'), 'mở số báo hôm nay (3 bài)');
  await sleep(600);
  const a0 = await geo();
  await page.shot(SHOTS + '/1356_01_bao_mac_dinh.png');
  ok(a0.visible && a0.btn === 'Ẩn vườn' && a0.pressed === 'false', 'bảng Báo có nút "Ẩn vườn" (như Trò chơi, bảng ôn)');
  ok(a0.sameRow && a0.inside, 'nút nằm trên hàng trên cùng, cùng hàng với Thoát (hàng cao ' + a0.topH + ' px)');
  ok(a0.yard && a0.field && a0.stage <= 762, 'mặc định như cũ: khung báo tối đa ~760 px (' + a0.stage + '), sân + ruộng bên dưới');
  // đánh dấu bài đang đọc + cuộn xuống — bấm nút không được vẽ lại bài / mất chỗ đang đọc
  await js('const s = document.getElementById("kb-p-stage"); s.querySelector(".kb-p-art").__kbMark = 1; s.scrollTop = 420; return 1;');
  await sleep(200);
  const sc0 = await js('return document.getElementById("kb-p-stage").scrollTop;');
  await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(900);
  const a1 = await geo();
  await page.shot(SHOTS + '/1356_02_bao_an_vuon.png');
  ok(a1.btn === 'Hiện vườn' && a1.pressed === 'true', 'bấm → nút thành "Hiện vườn"');
  ok(!a1.yard && !a1.field, 'sân và ruộng ẩn (' + a1.mode + ')');
  ok(a1.stage > a0.stage + 100 && a1.bottom <= a1.vh && a1.vh - a1.bottom <= 64,
    'khung báo cao kín cửa sổ: ' + a0.stage + ' → ' + a1.stage + ' px, đáy ở ' + a1.bottom + ' / ' + a1.vh);
  ok(a1.docH <= a1.vh + 1, 'trang không phải cuộn (cao ' + a1.docH + ' / cửa sổ ' + a1.vh + ')');
  const kept = await js('const s = document.getElementById("kb-p-stage"), a = s.querySelector(".kb-p-art"); return JSON.stringify({ mark: !!(a && a.__kbMark), top: s.scrollTop, tab: document.querySelector(".kb-p-tab.is-on").getAttribute("data-ptab") });').then(JSON.parse);
  ok(kept.mark && kept.tab === 'issue' && Math.abs(kept.top - sc0) <= 2, 'bài đang đọc giữ nguyên: không vẽ lại, vẫn tab Báo, chỗ đang cuộn ' + sc0 + ' → ' + kept.top);
  ok(a1.gbtn === 'Hiện vườn', 'nút của bảng Trò chơi cùng chữ ("' + a1.gbtn + '") — chung chế độ "Trò chơi & báo"');
  const c1 = await uiCfg();
  ok(JSON.stringify(c1) === JSON.stringify(['hide', 'hide', 'full', 'full', 'full', 'full']),
    'lưu vào config: "Trò chơi & báo" Sân / Ruộng = Ẩn; bảng ôn, màn chính giữ nguyên (' + c1.join(', ') + ')');
  // 4 tab đều cao kín cửa sổ, nút giữ chữ
  const tabs = {};
  for (const t of ['dict', 'shelf', 'src', 'issue']) {
    await js('document.querySelector(\'.kb-p-tab[data-ptab="' + t + '"]\').click(); return 1;'); await sleep(1100);
    tabs[t] = await geo();
    if (t === 'src') { await page.shot(SHOTS + '/1356_03_nguon_bao_an_vuon.png'); }
  }
  ok(Object.values(tabs).every((g) => g.btn === 'Hiện vườn' && !g.yard && g.stage === a1.stage && g.bottom <= g.vh && g.docH <= g.vh + 1),
    '4 tab (Báo / Chép chính tả / Kệ báo / Nguồn báo): khung cao ' + Object.values(tabs).map((g) => g.stage).join(' / ') + ' px, trang không cuộn');
  // đóng Báo: màn chính vẫn hiện vườn; Trò chơi: vườn ẩn theo
  await js('document.getElementById("kb-p-exit").click(); return 1;'); await sleep(800);
  ok(await js('return !!document.getElementById("kb-yard-wrap").offsetParent && !!document.getElementById("kb-field").offsetParent;'), 'đóng Báo: màn chính vẫn hiện sân + ruộng');
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(1200);
  const gm = await js('const b = document.getElementById("kb-g-garden"); return JSON.stringify({ btn: b.textContent, yard: !!document.getElementById("kb-yard-wrap").offsetParent });').then(JSON.parse);
  ok(gm.btn === 'Hiện vườn' && !gm.yard, 'mở Trò chơi: vườn cũng ẩn, nút Trò chơi ghi "Hiện vườn"');
  // bấm "Hiện vườn" ở Trò chơi → bảng Báo cũng hiện vườn
  await js('document.getElementById("kb-g-garden").click(); return 1;'); await sleep(700);
  await js('document.getElementById("kb-g-exit").click(); return 1;'); await sleep(600);
  await js('GardenPaper.open("issue"); return 1;'); await sleep(1500);
  const a2 = await geo();
  ok(a2.btn === 'Ẩn vườn' && a2.yard && a2.stage === a0.stage, 'Hiện vườn ở Trò chơi → Báo cũng hiện vườn, khung báo về ' + a2.stage + ' px');
  // ẩn ở Báo, đóng rồi mở lại; đóng hẳn cửa sổ vườn rồi mở lại → vẫn nhớ
  await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(700);
  await js('GardenPaper.close(); return 1;'); await sleep(500);
  await js('GardenPaper.open("shelf"); return 1;'); await sleep(1200);
  ok((await geo()).btn === 'Hiện vườn', 'đóng rồi mở lại Báo: vẫn ẩn vườn');
  await py(KB + 'kb._dialog.close(); result = 1'); await sleep(1500);
  jsErrors.push(...page.errors);
  page.close();
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  await py(KB + 'kb._dialog.resize(1850, 1130); result = 1'); await sleep(1500);
  await js(CLOSE_ALL); await sleep(300);
  await js('GardenPaper.open("issue"); return 1;'); await sleep(1500);
  const a3 = await geo();
  ok(a3.btn === 'Hiện vườn' && !a3.yard && a3.stage === a1.stage, 'đóng hẳn cửa sổ vườn rồi mở lại: Báo vẫn ẩn vườn (khung ' + a3.stage + ' px)');

  // ---------------- B. chép chính tả + Esc ----------------
  console.log('== B. Chép chính tả: bấm nút khi đang gõ; Esc');
  await js('document.querySelector(\'.kb-p-tab[data-ptab="dict"]\').click(); return 1;');
  ok(await waitFor('document.querySelectorAll("#kb-p-stage .kb-p-ct .kb-p-in").length >= 1'), 'lượt chép chính tả có ô gõ');
  await page.click('#kb-p-stage .kb-p-ct .kb-p-in'); await sleep(200);
  await page.type('たべる'); await sleep(200);
  await page.click('#kb-p-garden'); await sleep(900);
  const b1 = await js('const a = document.activeElement; return JSON.stringify({ focus: !!(a && a.classList && a.classList.contains("kb-p-in")), val: a && a.value, btn: document.getElementById("kb-p-garden").textContent, yard: !!document.getElementById("kb-yard-wrap").offsetParent });').then(JSON.parse);
  await page.shot(SHOTS + '/1356_04_chep_hien_vuon.png');
  ok(b1.btn === 'Ẩn vườn' && b1.yard, 'bấm chuột (thật) "Hiện vườn" khi đang gõ: vườn hiện lại');
  ok(b1.focus && b1.val === 'たべる', 'ô gõ vẫn giữ con trỏ và chữ đang gõ ("' + b1.val + '")');
  await page.type('の'); await sleep(150);
  ok(await js('return document.activeElement.value === "たべるの";'), 'gõ tiếp được ngay, không phải bấm lại vào ô');
  await page.click('#kb-p-garden'); await sleep(700);
  ok(await js('return document.getElementById("kb-p-garden").textContent === "Hiện vườn" && document.activeElement.classList.contains("kb-p-in");'), 'bấm lần nữa: ẩn vườn, ô gõ vẫn giữ con trỏ');
  // Esc khi con trỏ ở ngoài ô gõ: chỉ đóng bảng Báo, cửa sổ vườn còn
  await js('document.activeElement.blur(); return 1;');
  await page.click('#kb-p-garden'); await sleep(600);
  await page.key('Escape', 'Escape', 27); await sleep(900);
  const esc = await js('return JSON.stringify({ paper: !document.getElementById("kb-paper").hidden, yard: !!document.getElementById("kb-yard-wrap").offsetParent });').then(JSON.parse);
  const alive = await py(KB + 'result = bool(kb._dialog and kb._dialog.isVisible())');
  ok(!esc.paper && alive && esc.yard, 'bấm nút rồi Esc: chỉ đóng bảng Báo, cửa sổ vườn còn, màn chính hiện vườn');

  // ---------------- C. ⚙ Giao diện, bảng ôn ----------------
  console.log('== C. ⚙ Giao diện, bảng ôn');
  // lúc này vườn đang hiện (bấm ở trên) → ẩn lại cho phần C
  await js('GardenPaper.open("issue"); return 1;'); await sleep(1200);
  if ((await geo()).btn === 'Ẩn vườn') { await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(600); }
  await js('GardenPaper.close(); return 1;'); await sleep(400);
  await js('GardenUI.open(); return 1;'); await sleep(600);
  const uiRow = await js(`const det = document.querySelector("#kb-ui-stage .kb-ui-more"); if (det) det.open = true;
    const v = (m, k) => { const s = document.querySelector('#kb-ui-stage select[data-mode="' + m + '"][data-key="' + k + '"]'); return s && s.value; };
    return JSON.stringify([v("panel", "yard"), v("panel", "field"), v("review", "yard"), v("main", "yard")]);`).then(JSON.parse);
  ok(JSON.stringify(uiRow) === JSON.stringify(['hide', 'hide', 'full', 'full']), '⚙ Giao diện → Tự chỉnh từng chế độ: "Trò chơi & báo" Sân / Ruộng = Ẩn, chế độ khác không đổi (' + uiRow.join(', ') + ')');
  await js('GardenUI.close(); return 1;'); await sleep(300);
  // bảng ôn: vườn vẫn hiện (chế độ "Khi ôn thẻ" riêng)
  await js('document.getElementById("kb-review").click(); return 1;');
  const rvOpen = await waitFor('!document.getElementById("kb-panel").hidden', 6000);
  await sleep(900);
  const rv = await js('return JSON.stringify({ yard: !!document.getElementById("kb-yard-wrap").offsetParent, btn: document.getElementById("kb-rv-garden").textContent });').then(JSON.parse);
  ok(rvOpen && rv.yard && rv.btn === 'Ẩn vườn', 'Tưới ngay: bảng ôn vẫn hiện vườn, nút bảng ôn "Ẩn vườn" (chế độ riêng)');
  await js(CLOSE_ALL); await sleep(700);
  // kiểu có sẵn "Đầy đủ" → nút Báo về "Ẩn vườn"
  await js('GardenUI.open(); return 1;'); await sleep(500);
  await js('const b = [...document.querySelectorAll("#kb-ui-stage .kb-ui-preset")].find((x) => /Đầy đủ/.test(x.textContent)); b.click(); return 1;'); await sleep(1200);
  await js('GardenUI.close(); return 1;'); await sleep(300);
  await js('GardenPaper.open("issue"); return 1;'); await sleep(1200);
  const c2 = await geo();
  ok(c2.btn === 'Ẩn vườn' && c2.yard, '⚙ kiểu "Đầy đủ" → Báo hiện vườn, nút "Ẩn vườn"');
  await js('GardenPaper.close(); return 1;'); await sleep(300);

  // ---------------- D. Lịch hoa (cùng chế độ) ----------------
  console.log('== D. Lịch hoa');
  await js('GardenPaper.open("issue"); return 1;'); await sleep(1000);
  await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(600);
  await js('GardenPaper.close(); GardenCal.open(); return 1;'); await sleep(1500);
  const cal = await js('return JSON.stringify({ open: !document.getElementById("kb-cal").hidden, yard: !!document.getElementById("kb-yard-wrap").offsetParent, docW: document.documentElement.scrollWidth, vw: innerWidth });').then(JSON.parse);
  await page.shot(SHOTS + '/1356_05_lich_hoa_an_vuon.png');
  ok(cal.open && !cal.yard && cal.docW <= cal.vw, 'Lịch hoa (cùng chế độ "Trò chơi & báo"): vườn ẩn theo, không tràn ngang');
  await js('GardenCal.close(); return 1;'); await sleep(500);

  // ---------------- E. cỡ cửa sổ × ẩn / hiện × 4 tab ----------------
  console.log('== E. Cỡ cửa sổ');
  const SIZES = [[1920, 1080], [1366, 768], [1280, 800], [1024, 640], [800, 600]];
  const bad = [], rowsCmp = [];
  let cnt = 0, shortT = 0;
  for (const [w, h] of SIZES) {
    await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(1100);
    const byTab = {};
    for (const hidden of [false, true]) {
      await js('GardenPaper.open("issue"); return 1;'); await sleep(900);
      const g = await geo();
      if ((g.btn === 'Hiện vườn') !== hidden) { await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(600); }
      for (const t of ['issue', 'dict', 'shelf', 'src']) {
        await js('document.querySelector(\'.kb-p-tab[data-ptab="' + t + '"]\').click(); return 1;'); await sleep(900);
        const s = await geo();
        // so với khi bỏ nút đi: hàng trên cùng không cao thêm
        const noBtn = await js('const b = document.getElementById("kb-p-garden"); b.style.display = "none"; const h = Math.round(document.querySelector("#kb-paper .kb-game-top").getBoundingClientRect().height); b.style.display = ""; return h;');
        // bố cục của 1.35.5: không nút, tiêu đề đủ chữ Việt
        const oldH = await js('const b = document.getElementById("kb-p-garden"), p = document.getElementById("kb-paper"), had = p.classList.contains("kb-p-tight"); b.style.setProperty("display", "none", "important"); p.classList.remove("kb-p-tight"); const h = Math.round(document.querySelector("#kb-paper .kb-game-top").getBoundingClientRect().height); b.style.removeProperty("display"); p.classList.toggle("kb-p-tight", had); return h;');
        cnt++;
        const tag = w + '×' + h + ' ' + (hidden ? 'ẩn' : 'hiện') + ' ' + t;
        if (!s.inside) { bad.push(tag + ': nút ra ngoài hàng trên cùng'); }
        // tiêu đề chỉ bỏ phần chữ Việt khi thật sự cần (đủ chữ thì hàng xuống dòng)
        const fullH = await js('const p = document.getElementById("kb-paper"), had = p.classList.contains("kb-p-tight"); p.classList.remove("kb-p-tight"); const h = Math.round(document.querySelector("#kb-paper .kb-game-top").getBoundingClientRect().height); p.classList.toggle("kb-p-tight", had); return h;');
        if (!s.vi && fullH <= s.topH + 1) { bad.push(tag + ': bỏ tiêu đề mà không cần (' + fullH + ' / ' + s.topH + ')'); }
        if (s.vi && s.title !== '新聞 · Báo & chép chính tả') { bad.push(tag + ': tiêu đề khác 1.35.5 ("' + s.title + '")'); }
        if (w >= 1366 && !s.vi) { bad.push(tag + ': cửa sổ rộng mà tiêu đề bị bỏ'); }
        if (w >= 1024 && s.topH > 40) { bad.push(tag + ': hàng trên cùng xuống dòng ở cửa sổ ' + w + ' px (' + s.topH + ')'); }
        shortT += s.vi ? 0 : 1;
        if (w >= 1024 && s.topH > noBtn + 1) { bad.push(tag + ': nút làm hàng trên cùng cao thêm ' + noBtn + ' → ' + s.topH); }
        if (s.topH > oldH + 1) { bad.push(tag + ': hàng trên cùng cao hơn 1.35.5 ' + oldH + ' → ' + s.topH); }
        rowsCmp.push(s.topH - oldH);
        if (s.topH <= 40 && !s.sameRow) { bad.push(tag + ': hàng một dòng mà nút không cùng hàng Thoát'); }
        if (s.docW > s.vw) { bad.push(tag + ': tràn ngang ' + s.docW + ' / ' + s.vw); }
        if (s.btnH < 24) { bad.push(tag + ': nút thấp ' + s.btnH); }
        if (hidden && s.yard) { bad.push(tag + ': vườn chưa ẩn'); }
        if (!hidden && !s.yard) { bad.push(tag + ': vườn chưa hiện'); }
        if (hidden && byTab[t] && s.stage < byTab[t].stage) { bad.push(tag + ': khung báo thấp hơn khi hiện vườn ' + byTab[t].stage + ' → ' + s.stage); }
        // vườn ẩn: trang không phải cuộn, trừ phần hàng trên cùng xuống dòng (cửa sổ hẹp — như 1.35.5 khi hiện vườn)
        if (hidden && s.docH - s.vh > Math.max(0, s.topH - 36) + 2) { bad.push(tag + ': vườn ẩn mà trang phải cuộn (' + s.docH + ' / ' + s.vh + ', hàng trên ' + s.topH + ')'); }
        if (!hidden) { byTab[t] = s; }
        if (t === 'issue' || (t === 'src' && w === 800)) { console.log('      ' + tag + ': hàng trên ' + s.topH + ' px (bỏ nút: ' + noBtn + ', 1.35.5: ' + oldH + '), khung ' + s.stage + ' px, đáy ' + s.bottom + ' / ' + s.vh + ', trang ' + s.docH + (s.vi ? '' : ', bỏ tiêu đề') + (s.sameRow ? '' : ', nút xuống dòng')); }
      }
      if (w === 800 || w === 1024) { await page.shot(SHOTS + '/1356_06_' + w + '_' + (hidden ? 'an' : 'hien') + '.png'); }
    }
    await js('GardenPaper.close(); return 1;'); await sleep(300);
  }
  console.log('      hàng trên cùng so với 1.35.5: thấp hơn ở ' + rowsCmp.filter((d) => d < -1).length + ' tổ hợp, bằng ở ' + rowsCmp.filter((d) => Math.abs(d) <= 1).length + ', cao hơn ở ' + rowsCmp.filter((d) => d > 1).length + '; bỏ tiêu đề ở ' + shortT + ' tổ hợp');
  ok(bad.length === 0, cnt + ' tổ hợp cỡ cửa sổ × ẩn / hiện × tab: nút trong hàng trên, không thêm hàng, không tràn ngang' + (bad.length ? ' — ' + bad.slice(0, 6).join(' | ') : ''));

  // ---------------- F. dòng chú thích của ruộng ("Đang hiện N/M từ") ----------------
  console.log('== F. Dòng chú thích của ruộng');
  await py(KB + 'kb.save_config(ui={}, max_plants=3); kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1'); await sleep(2000);
  await js(CLOSE_ALL); await sleep(300);
  const NOTE = 'const n = document.getElementById("kb-note"); return JSON.stringify({ text: n.textContent, shown: !!n.offsetParent, docH: document.documentElement.scrollHeight, vh: innerHeight });';
  const f0 = await js(NOTE).then(JSON.parse);
  ok(/Đang hiện 3\//.test(f0.text) && f0.shown, 'màn chính: dòng "' + f0.text + '" vẫn hiện dưới ruộng');
  await js('GardenPaper.open("issue"); return 1;'); await sleep(1200);
  const f1 = await js(NOTE).then(JSON.parse);
  ok(f1.shown, 'Báo, vườn hiện: dòng chú thích vẫn ở dưới ruộng (như cũ)');
  await js('document.getElementById("kb-p-garden").click(); return 1;'); await sleep(800);
  const f2 = await js(NOTE).then(JSON.parse);
  await page.shot(SHOTS + '/1356_07_bao_an_vuon_co_chu_thich.png');
  ok(!f2.shown && f2.docH <= f2.vh + 1, 'Báo, Ẩn vườn: dòng chú thích ẩn theo ruộng, trang không phải cuộn (' + f2.docH + ' / ' + f2.vh + '; 1.35.5: dòng còn nằm dưới bảng, trang dài hơn cửa sổ)');
  await js('GardenPaper.close(); document.getElementById("kb-games").click(); return 1;'); await sleep(1200);
  const f3 = await js(NOTE).then(JSON.parse);
  ok(!f3.shown && f3.docH <= f3.vh + 1, 'Trò chơi, Ẩn vườn: cũng vậy (' + f3.docH + ' / ' + f3.vh + ')');
  await js(CLOSE_ALL); await sleep(500);
  await js('document.getElementById("kb-review").click(); return 1;');
  await waitFor('!document.getElementById("kb-panel").hidden', 6000); await sleep(900);
  const f4 = await js(NOTE).then(JSON.parse);
  await js('document.getElementById("kb-rv-garden").click(); return 1;'); await sleep(900);
  const f5 = await js(NOTE).then(JSON.parse);
  ok(f4.shown && !f5.shown && f5.docH <= f5.vh + 1, 'bảng ôn: vườn hiện → dòng chú thích hiện; Ẩn vườn → ẩn, trang không cuộn (' + f5.docH + ' / ' + f5.vh + ')');
  await js('document.getElementById("kb-rv-garden").click(); return 1;'); await sleep(500);
  await js(CLOSE_ALL); await sleep(700);
  const f6 = await js(NOTE).then(JSON.parse);
  ok(f6.shown, 'đóng bảng ôn: màn chính vẫn có dòng chú thích');
  await py(KB + 'kb.save_config(max_plants=400); kb._dialog.refresh(); result = 1'); await sleep(1200);

  // trả về như cũ
  await py(KB + 'kb.save_config(ui={}); result = 1');
  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  jsErrors.push(...page.errors);
  ok(jsErrors.length === 0, 'không có lỗi JS' + (jsErrors.length ? ': ' + jsErrors.slice(0, 3).join(' | ') : ''));
  console.log('\n' + results.filter(Boolean).length + '/' + results.length + ' kiểm tra đạt');
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
