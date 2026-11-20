// 1.35.6 (người dùng 19/11: "thêm phần báo có mục ẩn vườn, hiện vườn") — nút #kb-p-garden trên bảng Báo, trong Chromium
// (body.html + garden.css + prefs.js / ui.js / paper.js thật của add-on, Python giả):
//   A. bấm nút → gửi ui:set với "Trò chơi & báo" Sân / Ruộng = Ẩn, lớp kb-ui-*-hide lên #kb-app, nút Báo + nút Trò chơi cùng
//      chữ "Hiện vườn"; bấm lại → về như cũ; mousedown bị chặn (không lấy con trỏ khỏi ô gõ); bảng ôn / màn chính không đổi;
//   B. khung báo: vườn ẩn → max(320, 100vh − 250) ở 12 chiều cao cửa sổ; vườn hiện → như 1.35.5 clamp(320, 100vh − 250, 760);
//      dòng chú thích của ruộng (#kb-note) ẩn khi ruộng ẩn, hiện khi ruộng hiện;
//   C. hàng trên cùng (fitTop): quét bề ngang 700 → 2000 px × 6 kiểu font (giả lập font máy Windows / macOS: serif, sans,
//      mono, giãn chữ) × 6 trạng thái nút (furigana / bản dịch / "Hiện vườn") — tiêu đề chỉ bỏ khi có tiêu đề thì xuống dòng
//      mà bỏ thì bớt được một hàng; không bớt được thì giữ tiêu đề (như 1.35.5); nút luôn trong hàng, không tràn;
//   D. Ngôn ngữ trong vườn (glang.js thật, bảng chữ của lang_core): tiêu đề dịch nguyên cụm như 1.35.5, đổi tiếng → đo lại.
//      so với bố cục 1.35.5 (không nút, tiêu đề đủ) hàng trên không bao giờ cao hơn.
// Chạy: node test_1356.js ADDON  (cần Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]);
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const WEB = (f) => fs.readFileSync(path.join(ADDON, 'web', f), 'utf8');

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1366, height: 768 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  const body = WEB('body.html');
  await pg.setContent('<!doctype html><html><head><meta charset="utf-8"><style>' + WEB('garden.css') + '</style></head><body>' + body + '</body></html>');
  for (const f of ['prefs.js', 'glang.js', 'ui.js', 'paper.js']) { await pg.addScriptTag({ content: WEB(f) }); }
  await pg.evaluate(() => {
    window.__sent = [];
    const data = { ui: null, paper: { enabled: true } };
    window.__data = data;
    const H = { send: (m) => { window.__sent.push(m); }, data: () => data, closeOthers: () => {}, toast: () => {} };
    GardenUI.init(H);
    GardenPaper.init(H);
    document.getElementById('kb-note').textContent = 'Đang hiện 3/8 từ (ưu tiên từ đã học).';
    GardenPaper.open('shelf');
  });
  await pg.waitForTimeout(300);

  // ---------------- A. bấm nút ----------------
  console.log('== A. Nút Ẩn vườn / Hiện vườn');
  const st = () => pg.evaluate(() => {
    const app = document.getElementById('kb-app'), pb = document.getElementById('kb-p-garden'), gb = document.getElementById('kb-g-garden');
    return { cls: [...app.classList].filter((c) => /^kb-ui-(m|yard|field)-/.test(c)).sort().join(' '), p: pb.textContent, pp: pb.getAttribute('aria-pressed'),
      g: gb.textContent, last: window.__sent.filter((m) => m.indexOf('ui:set:') === 0).slice(-1)[0] || null };
  });
  const s0 = await st();
  ok(s0.p === 'Ẩn vườn' && s0.pp === 'false' && /kb-ui-m-panel/.test(s0.cls) && /kb-ui-yard-full/.test(s0.cls), 'mở Báo: chế độ "Trò chơi & báo", nút "Ẩn vườn" (' + s0.cls + ')');
  const md = await pg.evaluate(() => { const e = new MouseEvent('mousedown', { bubbles: true, cancelable: true }); document.getElementById('kb-p-garden').dispatchEvent(e); return e.defaultPrevented; });
  ok(md, 'mousedown trên nút bị chặn (không lấy con trỏ khỏi ô gõ chép chính tả)');
  await pg.evaluate(() => document.getElementById('kb-p-garden').click());
  await pg.waitForTimeout(50);
  const s1 = await st();
  const sent1 = s1.last ? JSON.parse(s1.last.slice(7)) : null;
  ok(sent1 && sent1.panel.yard === 'hide' && sent1.panel.field === 'hide' && sent1.review.yard === 'full' && sent1.main.yard === 'full',
    'bấm → gửi ui:set: "Trò chơi & báo" Sân / Ruộng = Ẩn, bảng ôn / màn chính = Chuyển động');
  ok(/kb-ui-yard-hide/.test(s1.cls) && /kb-ui-field-hide/.test(s1.cls), 'lớp ẩn lên #kb-app ngay (' + s1.cls + ')');
  ok(s1.p === 'Hiện vườn' && s1.pp === 'true' && s1.g === 'Hiện vườn', 'nút Báo + nút Trò chơi cùng "Hiện vườn"');
  // Python trả ui đã làm sạch (uiSaved) → nút vẫn đúng
  await pg.evaluate((u) => { window.__data.ui = u; }, sent1);
  await pg.evaluate(() => document.getElementById('kb-p-garden').click());
  await pg.waitForTimeout(50);
  const s2 = await st();
  const sent2 = JSON.parse(s2.last.slice(7));
  ok(s2.p === 'Ẩn vườn' && s2.g === 'Ẩn vườn' && /kb-ui-yard-full/.test(s2.cls) && sent2.panel.yard === 'full' && sent2.panel.field === 'full', 'bấm lại → về như cũ');
  // đóng Báo: màn chính
  await pg.evaluate(() => document.getElementById('kb-p-garden').click());
  await pg.evaluate(() => GardenPaper.close());
  await pg.waitForTimeout(50);
  const s3 = await st();
  ok(/kb-ui-m-main/.test(s3.cls) && /kb-ui-yard-full/.test(s3.cls), 'đóng Báo (vườn đang ẩn ở Báo): màn chính vẫn hiện vườn (' + s3.cls + ')');
  await pg.evaluate(() => GardenPaper.open('shelf'));
  await pg.waitForTimeout(50);
  ok((await st()).p === 'Hiện vườn', 'mở lại Báo: vẫn ẩn vườn');

  // ---------------- B. chiều cao khung báo, dòng chú thích ----------------
  console.log('== B. Khung báo cao kín cửa sổ');
  const badH = [];
  for (const h of [480, 520, 570, 600, 640, 700, 768, 800, 900, 1010, 1080, 1440]) {
    await pg.setViewportSize({ width: 1366, height: h });
    for (const hidden of [true, false]) {
      const cur = (await st()).p === 'Hiện vườn';
      if (cur !== hidden) { await pg.evaluate(() => document.getElementById('kb-p-garden').click()); await pg.waitForTimeout(30); }
      const r = await pg.evaluate(() => ({ h: Math.round(document.getElementById('kb-p-stage').getBoundingClientRect().height),
        note: !!document.getElementById('kb-note').offsetParent, field: !!document.getElementById('kb-field').offsetParent }));
      const want = hidden ? Math.max(320, h - 250) : Math.min(760, Math.max(320, h - 250));
      if (Math.abs(r.h - want) > 1) { badH.push(h + (hidden ? ' ẩn' : ' hiện') + ': ' + r.h + ' ≠ ' + want); }
      if (hidden && (r.note || r.field)) { badH.push(h + ' ẩn: dòng chú thích / ruộng còn hiện'); }
      if (!hidden && !r.note) { badH.push(h + ' hiện: dòng chú thích mất'); }
    }
  }
  ok(badH.length === 0, '12 chiều cao × ẩn / hiện: khung báo = max(320, 100vh − 250) khi ẩn, như 1.35.5 khi hiện; dòng chú thích của ruộng ẩn theo ruộng' + (badH.length ? ' — ' + badH.slice(0, 5).join(' | ') : ''));
  await pg.setViewportSize({ width: 1366, height: 768 });

  // ---------------- C. hàng trên cùng ----------------
  console.log('== C. Hàng trên cùng: bề ngang × font × trạng thái nút');
  const FONTS = [['font của add-on', null, 0], ['serif (kiểu Times)', 'serif', 0], ['sans (kiểu Arial / Segoe)', 'sans-serif', 0],
    ['mono (kiểu Courier / MS Gothic)', 'monospace', 0], ['font add-on giãn 0,5 px', null, 0.5], ['font add-on giãn 1 px', null, 1]];
  const STATES = [['Báo: furigana + bản dịch', true, true, false], ['Báo: furigana + bản dịch, "Hiện vườn"', true, true, true],
    ['Báo / Chép: chỉ furigana', true, false, false], ['Kệ / Nguồn báo', false, false, false], ['Kệ / Nguồn báo, "Hiện vườn"', false, false, true],
    ['Báo tiếng Anh: chỉ bản dịch', false, true, false]];
  const out = await pg.evaluate(({ FONTS, STATES }) => {
    const app = document.getElementById('kb-app'), p = document.getElementById('kb-paper'), top = p.querySelector('.kb-game-top');
    const tabs = top.querySelector('.kb-p-tabs'), ex = document.getElementById('kb-p-exit'), gb = document.getElementById('kb-p-garden');
    const fu = document.getElementById('kb-p-furi'), di = document.getElementById('kb-p-dich');
    const H = () => top.getBoundingClientRect().height;
    const oneRow = () => Math.abs(ex.getBoundingClientRect().top - top.getBoundingClientRect().top) < 12 && Math.abs(tabs.getBoundingClientRect().top - top.getBoundingClientRect().top) < 12;
    const force = (el, v) => { if (v === null) { el.style.removeProperty('display'); } else { el.style.setProperty('display', v, 'important'); } };
    const st = document.createElement('style'); document.head.appendChild(st);
    const bad = []; let n = 0, tight = 0, twoRows = 0, lower = 0, taller = 0;
    for (const [fname, fam, ls] of FONTS) {
      st.textContent = (fam ? '#kb-paper .kb-game-top, #kb-paper .kb-game-top * { font-family: ' + fam + ' !important; }' : '') +
        (ls ? '#kb-paper .kb-game-top, #kb-paper .kb-game-top * { letter-spacing: ' + ls + 'px !important; }' : '');
      for (const [sname, furi, dich, shown] of STATES) {
        fu.hidden = !furi; fu.textContent = 'Ẩn furigana';
        di.hidden = !dich; di.textContent = 'Hiện bản dịch';
        gb.textContent = shown ? 'Hiện vườn' : 'Ẩn vườn';
        window.dispatchEvent(new Event('kb-ui-change'));       // như ui.js sau khi đổi chữ nút
        for (let w = 700; w <= 2000; w += 10) {
          app.style.setProperty('width', w + 'px', 'important');
          window.dispatchEvent(new Event('resize'));
          n++;
          const tag = fname + ' · ' + sname + ' · ' + w + ' px';
          const isTight = p.classList.contains('kb-p-tight'), hNow = H(), rowNow = oneRow();
          const gr = gb.getBoundingClientRect(), tr = top.getBoundingClientRect();
          if (gr.right > tr.right + 1 || gr.left < tr.left - 1 || gr.top < tr.top - 1 || gr.bottom > tr.bottom + 1) { bad.push(tag + ': nút ra ngoài hàng'); }
          if (top.scrollWidth > top.clientWidth + 1) { bad.push(tag + ': hàng tràn ngang'); }
          // đo hai cách bày khác (không để lại dấu)
          p.classList.remove('kb-p-tight'); const fullOne = oneRow(), fullH = H();
          p.classList.add('kb-p-tight'); const shortOne = oneRow(), shortH = H();
          p.classList.toggle('kb-p-tight', isTight);
          force(gb, 'none'); p.classList.remove('kb-p-tight'); const oldH = H(); force(gb, null); p.classList.toggle('kb-p-tight', isTight);
          if (isTight) { tight++; }
          if (!rowNow) { twoRows++; }
          if (fullOne && isTight) { bad.push(tag + ': tiêu đề đủ vừa một hàng mà vẫn rút gọn'); }
          if (!fullOne && shortOne && !isTight) { bad.push(tag + ': rút gọn thì vừa một hàng mà không rút gọn'); }
          if (!fullOne && shortH < fullH - 4 && !isTight) { bad.push(tag + ': rút gọn bớt được một hàng mà không rút gọn'); }
          if (!fullOne && shortH > fullH - 4 && isTight) { bad.push(tag + ': rút gọn không bớt được hàng nào mà vẫn rút gọn'); }
          // không thêm hàng (một hàng ~ 36 px; hai hàng có thể chênh 3 px tuỳ hàng nào chứa các tab)
          if (hNow > oldH + 8) { bad.push(tag + ': hàng trên cao hơn bố cục 1.35.5 (' + Math.round(oldH) + ' → ' + Math.round(hNow) + ')'); }
          if (hNow > oldH + 1) { taller++; }
          if (hNow < oldH - 1) { lower++; }
          if (Math.abs(hNow - (isTight ? H() : fullH)) > 1) { bad.push(tag + ': đo lại khác'); }
        }
      }
    }
    app.style.removeProperty('width'); st.remove(); window.dispatchEvent(new Event('resize'));
    return { bad, n, tight, twoRows, lower, taller };
  }, { FONTS, STATES });
  ok(out.bad.length === 0, out.n + ' bố cục (131 bề ngang × 6 font × 6 trạng thái): tiêu đề chỉ rút gọn khi nhờ đó bớt được hàng; nút luôn trong hàng, không tràn; hàng không nhiều hơn 1.35.5' +
    (out.bad.length ? ' — ' + out.bad.length + ' lỗi: ' + out.bad.slice(0, 5).join(' | ') : ''));
  console.log('      rút gọn ở ' + out.tight + ' bố cục, hai hàng ở ' + out.twoRows + ' (cửa sổ hẹp — như 1.35.5), thấp hơn 1.35.5 ở ' + out.lower + ', cùng số hàng nhưng cao hơn vài px ở ' + out.taller);
  ok(out.tight > 0 && out.tight < out.n / 2, 'có cả bố cục rút gọn lẫn đủ tiêu đề (quét đủ hai phía của ngưỡng)');
  // mở bảng ở cửa sổ hẹp → rút gọn ngay (không đợi resize)
  await pg.evaluate(() => GardenPaper.close());
  await pg.setViewportSize({ width: 1040, height: 700 });
  await pg.evaluate(() => { GardenPaper.open('shelf'); document.getElementById('kb-p-furi').hidden = false; document.getElementById('kb-p-dich').hidden = false; window.dispatchEvent(new Event('resize')); });
  const narrow = await pg.evaluate(() => document.getElementById('kb-paper').classList.contains('kb-p-tight'));
  await pg.evaluate(() => GardenPaper.close());
  await pg.setViewportSize({ width: 1600, height: 700 });
  await pg.evaluate(() => GardenPaper.open('src'));
  const wide = await pg.evaluate(() => document.getElementById('kb-paper').classList.contains('kb-p-tight'));
  ok(narrow && !wide, 'mở lại ở cửa sổ rộng: tiêu đề đủ ngay (không giữ trạng thái rút gọn của lần trước)');

  // ---------------- D. Ngôn ngữ trong vườn ----------------
  console.log('== D. Ngôn ngữ trong vườn (glang.js)');
  const bundle = JSON.parse(require('child_process').execFileSync('python3', ['-c',
    'import sys, json; sys.path.insert(0, sys.argv[1]); import lang_core; print(json.dumps(lang_core.bundle(), ensure_ascii=False))', ADDON]).toString());
  await pg.setViewportSize({ width: 1366, height: 768 });
  await pg.evaluate(() => GardenPaper.open('issue'));
  const gl = await pg.evaluate((bundle) => {
    const out = [];
    GardenLang.setData({ gl: bundle, plants: [] });
    const p = document.getElementById('kb-paper'), top = p.querySelector('.kb-game-top'), ti = top.querySelector('.kb-g-title');
    document.getElementById('kb-p-furi').hidden = false; document.getElementById('kb-p-dich').hidden = false;
    for (const lang of ['en', 'zh', 'ko', 'vi', 'de', 'fr', 'ja']) {
      GardenLang.setPref(lang);
      for (const w of [1366, 1110, 1024]) {
        document.getElementById('kb-app').style.setProperty('width', w + 'px', 'important');
        window.dispatchEvent(new Event('resize'));
        const tight = p.classList.contains('kb-p-tight'), h = top.getBoundingClientRect().height;
        p.classList.remove('kb-p-tight'); const hFull = top.getBoundingClientRect().height; p.classList.add('kb-p-tight'); const hShort = top.getBoundingClientRect().height;
        p.classList.toggle('kb-p-tight', tight);
        out.push({ lang, w, text: ti.textContent, want: GardenLang.title('新聞 · Báo & chép chính tả', lang), tight, h, hFull, hShort });
      }
    }
    document.getElementById('kb-app').style.removeProperty('width');
    return out;
  }, bundle);
  const glBad = gl.filter((r) => r.text !== r.want || (r.lang !== 'ja' && /[\u3040-\u30ff]|新聞/.test(r.text)) || (r.tight !== (r.hShort < r.hFull - 4)));
  ok(glBad.length === 0, '7 tiếng × 3 bề ngang: tiêu đề dịch nguyên cụm như 1.35.5 ("' + gl.filter((r) => r.w === 1366).map((r) => r.text.split(' · ')[0]).join('", "') + '"), đổi tiếng → đo lại hàng trên cùng' +
    (glBad.length ? ' — ' + JSON.stringify(glBad.slice(0, 3)) : ''));
  ok(gl.some((r) => r.tight) && gl.some((r) => !r.tight), 'có tiếng / bề ngang bỏ tiêu đề lẫn giữ tiêu đề');
  await pg.evaluate(() => GardenPaper.close());

  ok(errs.length === 0, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  const pass = results.filter(Boolean).length;
  console.log('KẾT QUẢ: ' + pass + '/' + results.length + (pass === results.length ? ' ĐẠT' : ' CÓ LỖI'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
