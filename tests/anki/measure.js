// Đo bố cục trên các phần tử đang hiện (dùng chung cho audit.js / audit_full.js): tràn ngang, chữ bị cắt,
// phần tử lọt ra ngoài khung nhìn, nút quá nhỏ, hàng nút lệch / khác kiểu, nhãn thừa.
const W = (expr) => '(() => { ' + expr + ' })()';
// đo trên các phần tử đang hiện
const MEASURE = W(`
  const vis = (e) => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none' && +s.opacity > 0.05; };
  const name = (e) => (e.id ? '#' + e.id : e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).slice(0, 2).join('.') : '')) + ' «' + (e.textContent || '').trim().slice(0, 28) + '»';
  // 1.22.5: phần tử nằm trong một khung cuộn / cắt ngang (vd. hàng nút cảnh cuộn ngang của bảng Nhà ở cửa sổ thấp) mà khung đó
  // nằm trong cửa sổ thì không "ra ngoài khung" — chỉ đang ở phần chưa cuộn tới
  const clipped = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { const cs = getComputedStyle(a);
    if (/auto|scroll|hidden/.test(cs.overflowX)) { const ar = a.getBoundingClientRect(); return ar.right <= innerWidth + 2 && ar.left >= -2; } } return false; };
  const W = innerWidth, H = innerHeight, out = { vscroll: document.documentElement.scrollHeight > H + 1, hscroll: document.documentElement.scrollWidth > W + 1, cut: [], outside: [], tiny: [], small: [], buttons: 0 };
  document.querySelectorAll('body *').forEach((e) => {
    if (!vis(e) || e.closest('[hidden]')) return;
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    if ((e.tagName === 'BUTTON' || e.tagName === 'SELECT') && r.top < H && r.bottom > 0) { out.buttons++; if (r.height < 18 || r.width < 18) out.tiny.push(name(e)); }
    const leaf = (e.children.length === 0 || s.textOverflow === 'ellipsis') && (e.textContent || '').trim();
    if (leaf && (s.overflow === 'hidden' || s.overflowX === 'hidden' || s.textOverflow === 'ellipsis' || s.webkitLineClamp !== 'none')
        && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 2) && e.tagName !== 'OPTION') out.cut.push(name(e));
    if (leaf && parseFloat(s.fontSize) < 11 && r.top < H) out.small.push(name(e) + ' ' + s.fontSize);
    if (r.right > W + 2 || r.left < -2) { if (!e.closest('.kb-field, #kb-yard-box, canvas') && s.position !== 'fixed' && !clipped(e)) out.outside.push(name(e) + ' [' + Math.round(r.left) + '..' + Math.round(r.right) + ']'); }
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
module.exports = { MEASURE };
