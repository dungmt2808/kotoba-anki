// Soát giao diện: mở lần lượt mọi màn hình ở 2 cỡ cửa sổ, chụp ảnh và đo các lỗi hay gặp
// (lỗi JS, tràn ngang, chữ bị cắt, phần tử lọt ra ngoài khung nhìn, nút quá nhỏ).
// 1.19.1: thêm "kiểu lệch" — các nút cùng hàng khác bóng đổ / viền / font / cỡ chữ / đệm (vd. nút đang chọn mất bóng),
// "nhãn thừa" — nhãn đứng một mình cạnh hàng nút mà rộng hơn chữ > 40px; thêm các màn báo tiếng Anh, Nguồn báo
// chưa có khoá, Cấu hình trường / Trò chơi với deck tiếng Anh.
// Chạy: node audit.js SHOTS   (Anki đã chạy bằng run_anki.sh). In ra một bảng; không có ✓/✗ (dùng để soát bằng mắt).
const { pages, Page, sleep } = require('./cdp');
const fs = require('fs');
const SHOTS = process.argv[2];
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenGames !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
const W = (expr) => '(() => { ' + expr + ' })()';
// đo trên các phần tử đang hiện
const MEASURE = W(`
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')) + ' «' + (e.textContent || '').trim().slice(0, 28) + '»';
  const W = innerWidth, H = innerHeight, out = { hscroll: document.documentElement.scrollWidth > W + 1, cut: [], outside: [], tiny: [], small: [], buttons: 0 };
  document.querySelectorAll('body *').forEach((e) => {
    if (!vis(e) || e.closest('[hidden]')) return;
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if ((e.tagName === 'BUTTON' || e.tagName === 'SELECT') && r.top < H && r.bottom > 0) { out.buttons++; if (r.height < 18 || r.width < 18) out.tiny.push(name(e)); }
    const leaf = e.children.length === 0 && (e.textContent || '').trim();
    if (leaf && (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none')
        && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2) && e.tagName !== 'OPTION') out.cut.push(name(e));
    if (leaf && parseFloat(s.fontSize) < 11 && r.top < H) out.small.push(name(e) + ' ' + s.fontSize);
    if (r.right > W + 2 || r.left < -2) { if (!e.closest('.kb-field, #kb-yard-box, canvas') && s.position !== 'fixed') out.outside.push(name(e) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']'); }
  });
  // hàng nút / tab / chip nằm cùng một dòng: chiều cao, khoảng cách, mép trên có đều nhau không
  out.rows = []; out.style = []; out.label = [];
  // nhãn đứng một mình cạnh hàng nút (không thuộc cột nhãn của một bảng nhiều hàng) mà rộng thừa > 40px
  document.querySelectorAll('body span, body label, body b').forEach((lb) => {
    if (!vis(lb) || lb.closest('[hidden]') || lb.children.length || !(lb.textContent || '').trim()) return;
    const row = lb.parentElement;
    if (!row || !/flex|grid/.test(getComputedStyle(row).display) || !row.querySelector('button')) return;
    if (parseFloat(getComputedStyle(lb).flexGrow) > 0) return;      // ô giãn hết chỗ còn lại (cố ý)
    const cls = (typeof lb.className === 'string' && lb.className.trim().split(/\s+/)[0]) || '';
    let scope = row; for (let i = 0; i < 3 && scope.parentElement; i++) scope = scope.parentElement;
    if (cls && scope.querySelectorAll('.' + cls).length > 1) return;   // cột nhãn của một bảng nhiều hàng (cố ý thẳng cột)
    const rg = document.createRange(); rg.selectNodeContents(lb);
    const tw = rg.getBoundingClientRect().width, bw = lb.getBoundingClientRect().width;
    if (bw - tw > 40) out.label.push(name(lb) + ' rộng ' + Math.round(bw) + 'px, chữ ' + Math.round(tw) + 'px');
  });
  document.querySelectorAll('body *').forEach((box) => {
    if (!vis(box) || box.closest('[hidden]')) return;
    const d = getComputedStyle(box).display;
    if (!/flex|grid/.test(d)) return;
    const CLS = ['kb-chip', 'kb-g-chip', 'kb-h-tab', 'kb-p-tab', 'kb-quest-btn'];
    const kids = Array.from(box.children).filter((k) => vis(k) && (k.tagName === 'BUTTON' || k.tagName === 'SELECT' || CLS.some((c) => k.classList.contains(c)) || k.className === 'kb-h-tabsep'));
    if (kids.length < 2) return;
    const rs = kids.map((k) => k.getBoundingClientRect());
    // gom theo tâm dọc (tab đang chọn có thể nhô cao hơn), rồi tách cụm khi hai nút cách nhau > 40px (cố ý)
    const items = rs.map((r, i) => [r, kids[i]]).sort((a, b) => (a[0].top + a[0].bottom) - (b[0].top + b[0].bottom));
    const lines = [];
    items.forEach((it) => {
      const cy = (it[0].top + it[0].bottom) / 2;
      const ln = lines.find((l) => Math.abs(l.cy - cy) < 10);
      if (ln) { ln.items.push(it); } else { lines.push({ cy: cy, items: [it] }); }
    });
    lines.forEach((l) => {
      l.items.sort((a, b) => a[0].left - b[0].left);
      const clusters = [[l.items[0]]];
      l.items.slice(1).forEach((it, i) => { if (it[0].left - l.items[i][0].right > 40) { clusters.push([it]); } else { clusters[clusters.length - 1].push(it); } });
      clusters.forEach((ln) => {
        // kiểu lệch: so từng thuộc tính với nút đầu hàng (bỏ qua màu nền — nút đang chọn được phép đổi màu)
        const sty = ln.map((x) => { const c = getComputedStyle(x[1]); return { sh: c.boxShadow, bw: c.borderTopWidth + '/' + c.borderBottomWidth,
          ff: c.fontFamily.split(',')[0].replace(/["']/g, '').trim(), fs: c.fontSize, pd: c.paddingTop + '/' + c.paddingBottom }; });
        const diff = [];
        [['sh', 'bóng'], ['bw', 'viền'], ['ff', 'font'], ['fs', 'cỡ chữ'], ['pd', 'đệm']].forEach((k) => {
          const vals = Array.from(new Set(sty.map((x) => x[k[0]])));
          if (vals.length > 1) diff.push(k[1] + ' ' + vals.map((v) => v.length > 24 ? v.slice(0, 24) + '…' : v).join(' ≠ '));
        });
        if (diff.length && ln.every((x) => x[1].tagName === 'BUTTON')) out.style.push(name(box) + ': kiểu lệch ' + diff.join(' · ') + ' [' + ln.map((x) => (x[1].textContent || '').trim().slice(0, 10)).join(' | ') + ']');
        if (ln.length < 3) return;
        const hs = ln.map((x) => Math.round(x[0].height)), tops = ln.map((x) => Math.round(x[0].top)), bots = ln.map((x) => Math.round(x[0].bottom));
        const gaps = ln.slice(1).map((x, i) => Math.round(x[0].left - ln[i][0].right));
        const bad = [];
        if (Math.max(...hs) - Math.min(...hs) > 2) bad.push('cao ' + hs.join('/'));
        if (Math.max(...tops) - Math.min(...tops) > 2 && Math.max(...bots) - Math.min(...bots) > 2) bad.push('lệch dọc ' + tops.join('/'));
        if (gaps.length > 1 && Math.max(...gaps) - Math.min(...gaps) > 3) bad.push('khoảng cách ' + gaps.join('/'));
        if (bad.length) out.rows.push(name(box) + ': ' + bad.join(' · ') + ' [' + ln.map((x) => (x[1].textContent || '').trim().slice(0, 10)).join(' | ') + ']');
      });
    });
  });
  out.rows = out.rows.slice(0, 10); out.style = Array.from(new Set(out.style)).slice(0, 10); out.label = out.label.slice(0, 6);
  out.cut = out.cut.slice(0, 12); out.outside = out.outside.slice(0, 8); out.tiny = out.tiny.slice(0, 8); out.small = Array.from(new Set(out.small)).slice(0, 8);
  return out;`);
let page;
const report = [];
async function shot(name, note) {
  await sleep(500);
  const m = await page.eval(MEASURE);
  await page.shot(SHOTS + '/' + name + '.png');
  const errs = page.errors.splice(0);
  report.push({ name, note: note || '', ...m, errs });
  const flags = [m.hscroll ? 'TRÀN NGANG' : '', m.cut.length ? 'cắt ' + m.cut.length : '', m.outside.length ? 'ngoài khung ' + m.outside.length : '',
    m.tiny.length ? 'nút nhỏ ' + m.tiny.length : '', m.rows.length ? 'hàng lệch ' + m.rows.length : '', m.style.length ? 'kiểu lệch ' + m.style.length : '',
    m.label.length ? 'nhãn thừa ' + m.label.length : '', errs.length ? 'LỖI JS ' + errs.length : ''].filter(Boolean).join(', ');
  console.log((flags ? '  ! ' : '  · ') + name + ' — ' + m.buttons + ' nút' + (flags ? ' — ' + flags : ''));
  m.style.concat(m.label, m.rows).forEach((x) => console.log('      ' + x));
}
const js = (expr) => page.eval(W(expr + '; return 1;'));
async function closeAll() {
  await js('try { GardenGames.close(); } catch (e) {} try { GardenHome.close(); } catch (e) {} try { GardenPaper.close(); } catch (e) {} try { GardenFields.close(); } catch (e) {} try { GardenUI.close(); } catch (e) {}' +
    'document.getElementById("kb-sound-pop").hidden = true; const q = document.getElementById("kb-quest-pop"); if (q) q.hidden = true; const t = document.getElementById("kb-toast"); if (t) t.hidden = true;' +
    'const s = document.getElementById("kb-stop"); if (s && !document.getElementById("kb-panel").hidden) s.click();');
  await sleep(400);
}

async function tour(size) {
  const [w, h] = size;
  const S = w + 'x' + h;
  await py(KB + `kb._dialog.resize(${w}, ${h}); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1`);
  await sleep(2500); await closeAll();
  console.log('== ' + S);
  await shot(S + '_01_vuon');
  await js('document.getElementById("kb-sound").click()'); await shot(S + '_02_caidat');
  await closeAll();
  await js('const b = document.getElementById("kb-quest"); if (b && !b.hidden) b.click()'); await shot(S + '_03_nhiemvu');
  await closeAll();
  await js('Garden._pinFirst ? Garden._pinFirst() : 0');
  await js('document.getElementById("kb-review").click()'); await sleep(1500); await shot(S + '_04_on_the');
  await js('const b = document.getElementById("kb-show"); if (b) b.click()'); await sleep(800); await shot(S + '_05_on_dapan');
  await closeAll();
  await js('document.getElementById("kb-games").click()'); await shot(S + '_06_trochoi');
  for (const g of ['market', 'crow', 'memory', 'cloze']) {
    await js('GardenGames.close(); document.getElementById("kb-games").click()'); await sleep(300);
    await js('document.querySelector(\'.kb-gcard[data-game="' + g + '"]\').click()'); await sleep(1800); await shot(S + '_07_' + g);
  }
  await closeAll();
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("C::Chỉ từ + audio từ"); d.refresh(); result = 1'); await sleep(2000); await closeAll();
  await js('document.getElementById("kb-games").click()'); await sleep(300);
  await js('document.querySelector(\'.kb-gcard[data-game="listen"]\').click()'); await sleep(1500); await shot(S + '_07_listen');
  await closeAll();
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1'); await sleep(2000); await closeAll();
  for (const t of ['build', 'yard', 'room', 'zone', 'pet', 'seed', 'season', 'wear', 'craft', 'inv']) {
    await js('document.getElementById("kb-house").click()'); await sleep(300);
    await js('const b = document.querySelector(\'.kb-h-tab[data-tab="' + t + '"]\'); if (b) b.click()'); await sleep(500);
    await shot(S + '_08_nha_' + t);
    await closeAll();
  }
  for (const t of ['issue', 'dict', 'shelf', 'src']) {
    await js('GardenPaper.open("' + t + '")'); await sleep(1500); await shot(S + '_09_bao_' + t);
    await closeAll();
  }
  await js('GardenFields.open()'); await sleep(1500); await shot(S + '_10_cauhinh');
  await closeAll();
  // 1.19.1: báo tiếng Anh (Kệ báo có hàng chuyển báo), Nguồn báo chưa có khoá, deck tiếng Anh
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("M::Tiếng Anh A2"); d.refresh(); result = 1'); await sleep(2000); await closeAll();
  await js('GardenPaper.open("shelf")'); await sleep(1200); await shot(S + '_12_ke_bao_hai_bao');
  await js('const b = document.querySelectorAll(".kb-p-langs .kb-ai-chip")[1]; if (b) b.click()'); await sleep(1200);
  await js('const r = document.querySelector(".kb-p-row"); if (r) r.click()'); await sleep(1500); await shot(S + '_12_bao_tieng_anh');
  await js('document.querySelector(".kb-p-tab[data-ptab=src]").click()'); await sleep(1200); await shot(S + '_12_nguon_bao');
  await js('const b = Array.from(document.querySelectorAll(".kb-ai-lang")).pop(); const c = b && Array.from(b.querySelectorAll(".kb-ai-chip")).find((x) => x.textContent === "Chọn deck"); if (c) c.click()');
  await sleep(800); await shot(S + '_12_nguon_bao_chon_deck');
  await closeAll();
  await py(KB + 'kb._key_saved = kb.config().get("gemini_key"); kb.save_config(gemini_key=""); result = 1');
  await js('GardenPaper.open("src")'); await sleep(1200); await shot(S + '_12_nguon_bao_chua_khoa');
  await py(KB + 'kb.save_config(gemini_key=kb._key_saved); result = 1');
  await closeAll();
  await js('GardenFields.open()'); await sleep(1500); await shot(S + '_12_cauhinh_tieng_anh');
  await closeAll();
  await js('document.getElementById("kb-games").click()'); await sleep(800); await shot(S + '_12_trochoi_tieng_anh');
  await closeAll();
  await js('document.getElementById("kb-ui-open").click()'); await sleep(800); await shot(S + '_11_giaodien');
  await closeAll();
}

(async () => {
  await py(KB + `st = kb.STATE
d = st.load(); d["coins"] = 20000; st.save(d)
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  for (const size of [[1366, 768], [1024, 700]]) { await tour(size); }
  const errs = await py(KB + 'result = kb.ERRORS.load() if hasattr(kb.ERRORS, "load") else []');
  report.push({ name: 'errors.json', addon_errors: errs });
  fs.writeFileSync(SHOTS + '/audit.json', JSON.stringify(report, null, 1));
  console.log('\nnhật ký lỗi add-on: ' + (errs && errs.length ? JSON.stringify(errs).slice(0, 600) : 'trống'));
  page.close(); process.exit(0);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
