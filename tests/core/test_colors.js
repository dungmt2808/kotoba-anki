// 1.22: so màu khi chuyển ảnh thành pixel (web/craft.js: oklab / cdist / nearestIdx) — chạy trong node, không trình duyệt.
// 54 màu hay gặp trong ảnh chụp (hồng có bóng, hồng phai, đỏ sẫm, nâu gỗ, da, lá, trời, xám, hồng phấn gần trắng…) phải ra
// đúng nhóm màu của bảng Xưởng; hồng / đỏ không bao giờ ra nâu / be. In thêm số màu cách so RGB cũ (≤ 1.21) làm sai để so.
// Chạy: node test_colors.js ADDON
const fs = require('fs');
const path = require('path');
const ADDON = process.argv[2];
const src = fs.readFileSync(path.join(ADDON, 'web', 'craft.js'), 'utf8');
const body = src.slice(src.indexOf('  const LIN = new Float64Array(256);'), src.indexOf('  function fewColors'));
const P = { k: '#1b1b2f', n: '#2b2b44', S: '#8a8fa8', m: '#9aa0b5', s: '#d4d4e0', w: '#ffffff', c: '#fff2b3', y: '#ffd23f', i: '#e9b949', o: '#ff9f1c',
  h: '#f5b971', t: '#e2a46a', b: '#a0603a', B: '#6b3b1f', e: '#ffd7b5', E: '#d99a6c', P: '#ffc4d6', p: '#ff7fa0', r: '#ff4f6d', R: '#c21f3a',
  v: '#c77dff', z: '#7b2cbf', l: '#8fd3ff', d: '#3d8bff', u: '#2f5fb0', U: '#1e3a8a', a: '#2ec4b6', A: '#1a7f78', f: '#b8e05a', g: '#3ccb5e',
  G: '#2e8b3a', j: '#1f5f2a' };
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const N = new Function('palette', 'rgb', body + '; return { oklab, cdist, palLab, nearestIdx, matchColor, BOOST };')(() => P, rgb);
const pal = N.palLab();
const near = (h) => { const c = rgb(h); return pal[N.matchColor(c[0], c[1], c[2], pal)][0]; };
function distOld(a, b) { const rm = (a[0] + b[0]) / 2, dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db; }
const nearOld = (h) => { let best = null, bd = Infinity; for (const k in P) { const v = distOld(rgb(h), rgb(P[k])); if (v < bd) { bd = v; best = k; } } return best; };

const PINK = {
  'hồng có bóng tối': ['#c0607a', 'pr'], 'hồng phai': ['#d89aa8', 'pP'], 'hồng đất': ['#c08080', 'prR'], 'đỏ tối ảnh chụp': ['#8a2a2a', 'R'],
  'đỏ hồng': ['#d05060', 'rR'], 'hoa anh đào': ['#f4c2c2', 'P'], 'hồng tím': ['#d070a0', 'pv'], 'đỏ cam': ['#e05040', 'rR'], 'hồng nhạt': ['#e8a0b0', 'pP'],
  'đỏ rượu': ['#701828', 'RB'], 'hồng đậm': ['#e75480', 'rp'], 'đỏ sẫm': ['#b03a48', 'R'], 'hồng phấn gần trắng': ['#f5e3ea', 'Pw'], 'trắng hồng': ['#fbe3ea', 'Pw'],
};
const OTHER = {
  'nâu gỗ': ['#8b5a2b', 'b'], 'nâu sáng': ['#c09060', 'Eti'], 'nâu đất': ['#6b4423', 'B'], 'da': ['#f0c8a8', 'e'], 'da tối': ['#c89070', 'E'],
  'cam': ['#f08030', 'o'], 'vàng đất': ['#c8a040', 'i'], 'xám': ['#808080', 'Sm'], 'xanh lá ảnh': ['#5a8a40', 'G'], 'xanh tối': ['#2a4a20', 'j'],
  'be': ['#e8d8c0', 'es'], 'gạch': ['#b05a40', 'bR'], 'chocolate': ['#5a3020', 'B'], 'trời ảnh': ['#87a8c8', 'lm'], 'trời xanh': ['#6aa8e8', 'ld'],
  'tím ảnh': ['#8a6aa8', 'vz'], 'lục lam': ['#40a0a0', 'aA'], 'rêu': ['#7a8a40', 'Gf'], 'vàng chanh': ['#d8d860', 'fyc'], 'xanh navy': ['#203050', 'Un'],
  'kem': ['#f0e8c8', 'ce'], 'cam nhạt': ['#f0b080', 'ht'], 'xám xanh': ['#607080', 'S'], 'đen': ['#101010', 'k'], 'xám tối': ['#404048', 'nk'],
  'trắng ngà': ['#f8f8f0', 'w'], 'xám sáng': ['#c8c8c8', 's'], 'xanh lá sáng': ['#90d070', 'fg'], 'xanh lá đậm': ['#208030', 'G'], 'lá tối': ['#1a3a14', 'j'],
  'vàng': ['#f8d020', 'y'], 'cam đỏ': ['#e86020', 'orRb'], 'tím đậm': ['#502080', 'z'], 'xanh dương': ['#2050c0', 'u'], 'xanh navy sáng': ['#3050a0', 'uU'],
  'nâu đỏ': ['#803020', 'BRb'], 'da nâu': ['#a87050', 'bE'], 'gỗ sáng': ['#d0a070', 'tE'], 'xám ấm': ['#e8e6e4', 'sw'], 'xám lạnh': ['#d0d4dc', 's'],
};
const check = (set) => Object.entries(set).filter(([, [h, want]]) => want.indexOf(near(h)) < 0).map(([n, [h]]) => n + ' ' + h + '→' + near(h));
const badPink = check(PINK), badOther = check(OTHER);
ok(badPink.length === 0, Object.keys(PINK).length + ' màu hồng / đỏ ra đúng hồng / đỏ ' + badPink.join(', '));
ok(Object.values(PINK).every(([h]) => 'bBtEheio'.indexOf(near(h)) < 0), 'không màu hồng / đỏ nào ra nâu / be / da');
ok(badOther.length === 0, Object.keys(OTHER).length + ' màu khác (nâu, da, lá, trời, xám…) vẫn đúng nhóm ' + badOther.join(', '));
const oldBad = Object.entries(Object.assign({}, PINK, OTHER)).filter(([, [h, want]]) => want.indexOf(nearOld(h)) < 0);
console.log('  (cách so RGB cũ làm sai ' + oldBad.length + ' màu: ' + oldBad.map(([n, [h]]) => n + '→' + nearOld(h)).join(', ') + ')');
ok(oldBad.length >= 8, 'cách cũ sai ≥ 8 màu (để chắc bộ màu thử bắt được lỗi cũ)');
// màu của chính bảng Xưởng phải ra lại đúng nó (ảnh pixel art có sẵn chuyển không đổi màu)
const self = Object.keys(P).filter((k) => near(P[k]) !== k);
ok(self.length === 0, '32 màu của bảng Xưởng ra lại đúng chính nó ' + self.join(','));
const pass = results.filter(Boolean).length;
console.log('KẾT QUẢ: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
