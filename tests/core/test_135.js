// 1.35: tiếng Đức / tiếng Pháp trong trang — hàm thật của web/games.js (Đuổi quạ gõ đáp án), web/glang.js (Ngôn ngữ
// trong vườn), web/paper.js (ngày / số báo). Gọi từ test_135.py: node test_135.js ADDON in.json (in.json = {bundle})
const fs = require('fs');
const path = require('path');
const ADDON = process.argv[2];
const IN = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const JP = /[぀-ヿ㐀-鿿]/;

console.log('== a. Đuổi quạ: gõ từ tiếng Đức / tiếng Pháp');
const src = fs.readFileSync(path.join(ADDON, 'web', 'games.js'), 'utf8');
const a = src.indexOf('  function enNorm('), b = src.indexOf('  // Nghĩa ngắn gọn cho biển quạ');
const c0 = src.lastIndexOf('  // 1.34.1 (kiểm tra lần cuối): NFKC', a);
ok(a > 0 && b > a && src.slice(a, b).indexOf('function euAnswers') > 0, 'tìm thấy enNorm … euAnswers trong games.js');
const F = new Function(src.slice(c0 > 0 ? c0 : a, b) + '; return { enNorm, euFold, euStrip, euAnswers };')();
// như check() của Đuổi quạ (nhóm de / fr, chế độ gõ chữ): typed → euFold(enNorm(raw), lang)
const hit = (typed, word, lang) => F.euAnswers({ word: word }, lang).indexOf(F.euFold(F.enNorm(typed), lang)) >= 0;
const YES = [['Hund', 'der Hund, -e', 'de'], ['der Hund', 'der Hund, -e', 'de'], ['hund', 'der Hund, -e', 'de'],
  ['Hand', 'die Hand, ¨-e', 'de'], ['Straße', 'die Straße', 'de'], ['Strasse', 'die Straße', 'de'],
  ['Mädchen', 'das Mädchen', 'de'], ['Maedchen', 'das Mädchen', 'de'], ['Madchen', 'das Mädchen', 'de'],
  ['muede', 'müde', 'de'], ['gehen', 'gehen / laufen', 'de'], ['laufen', 'gehen / laufen', 'de'],
  ['Katze', 'die Katze (f)', 'de'], ['sich freuen', 'sich freuen', 'de'], ['Haus', 'das Haus [haʊs]', 'de'],
  ['ecole', "l'école (f)", 'fr'], ["l'école", "l'école", 'fr'], ['L’École', "l'école", 'fr'], ['coeur', 'le cœur', 'fr'],
  ['œil', "l'œil (m)", 'fr'], ['francais', 'français', 'fr'], ['garcon', 'le garçon', 'fr'], ['chat', 'le chat', 'fr'],
  ['pomme de terre', 'la pomme de terre', 'fr'], ['etre', 'être', 'fr'], ['hôpital', "l'hôpital", 'fr'],
  ['Wörterbuch', 'das Wörterbuch, ¨-er', 'de']];
const NO = [['Hunde', 'der Hund, -e', 'de'], ['Hund', 'die Hand', 'de'], ['der', 'der Hund', 'de'], ['', 'der Hund', 'de'],
  ['Strase', 'die Straße', 'de'], ['ecoles', "l'école", 'fr'], ['chien', 'le chat', 'fr'], ['le', 'le chat', 'fr'],
  ['pomme', 'la pomme de terre', 'fr'], ['e', 'être', 'fr']];
const badY = YES.filter(([t, w, l]) => !hit(t, w, l)), badN = NO.filter(([t, w, l]) => hit(t, w, l));
ok(!badY.length, YES.length + ' cách gõ đúng (bỏ mạo từ, ä = ae / a, ß = ss, é = e, œ = oe, dấu nháy cong)' +
  (badY.length ? ' — sai: ' + JSON.stringify(badY.slice(0, 4)) : ''));
ok(!badN.length, NO.length + ' cách gõ sai vẫn sai (số nhiều khác, chỉ gõ mạo từ, thiếu chữ)' +
  (badN.length ? ' — sai: ' + JSON.stringify(badN.slice(0, 4)) : ''));
ok(F.euStrip("de l'eau", 'fr') === 'eau' && F.euStrip('des pommes', 'fr') === 'pommes' && F.euStrip('Dem Kind', 'de') === 'Kind',
  'bỏ mạo từ (de l\', des, dem)');
// 5.000 từ ngẫu nhiên: gõ đúng y như deck (sau khi bỏ mạo từ) luôn được nhận
const ALPHA = 'abcdefghijklmnopqrstuvwxyzäöüßéèêàçœ';
let seed = 135; const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
let miss = [];
for (let i = 0; i < 5000; i++) {
  const lang = rnd() < 0.5 ? 'de' : 'fr';
  let w = ''; const n = 2 + Math.floor(rnd() * 9);
  for (let j = 0; j < n; j++) { w += ALPHA[Math.floor(rnd() * ALPHA.length)]; }
  if (rnd() < 0.5) { w = w[0].toUpperCase() + w.slice(1); }
  const art = lang === 'de' ? ['der ', 'die ', 'das ', ''][Math.floor(rnd() * 4)] : ['le ', 'la ', "l'", ''][Math.floor(rnd() * 4)];
  if (!hit(w, art + w, lang) || !hit(art + w, art + w, lang)) { miss.push(art + w); }
}
ok(!miss.length, '5.000 từ ngẫu nhiên: gõ y như deck (có / không mạo từ) luôn đúng' + (miss.length ? ' — sai: ' + miss.slice(0, 5).join(', ') : ''));
ok(/eu \? \[euFold\(enNorm\(raw\), eu\)\]/.test(src) && /const eu = cm\.type === "spell" && EU\[pool\.group\] \? pool\.group : "";/.test(src),
  'Đuổi quạ dùng euFold khi nhóm de / fr ở chế độ gõ chữ');

console.log('== b. Ngôn ngữ trong vườn (glang.js)');
class Node0 { constructor(t, v) { this.nodeType = t; this.nodeValue = v; this.textContent = v; } }
class El {
  constructor(t) { this.tagName = t; this.childNodes = []; this.attrs = {}; this.className = ''; this.style = {}; this.textContent = ''; }
  appendChild(c) { this.childNodes.push(c); this.textContent += c.textContent || ''; return c; }
  setAttribute(k, v) { this.attrs[k] = v; }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  querySelectorAll() { return []; }
  set lang(v) { this.attrs.lang = v; } get lang() { return this.attrs.lang; }
}
global.document = { createElement: (t) => new El(t), createTextNode: (v) => new Node0(3, v), getElementById: () => null, querySelectorAll: () => [] };
const prefs = {};
global.GardenPrefs = { get: (k) => (k in prefs ? prefs[k] : null), set: (k, v) => { prefs[k] = v; } };
eval(fs.readFileSync(path.join(ADDON, 'web', 'glang.js'), 'utf8').replace('var GardenLang', 'global.GardenLang'));
const G = global.GardenLang;
G.setData({ gl: IN.bundle, plants: [{ lang: 'de' }, { lang: 'de' }, { lang: 'ja' }] });
ok(G.cur() === 'de', 'tự theo deck: phần lớn cây là deck tiếng Đức → tiếng Đức');
G.setData({ gl: IN.bundle, plants: [{ lang: 'fr' }, { lang: 'other' }, { lang: 'other' }] });
ok(G.cur() === 'fr', '… deck tiếng Pháp → tiếng Pháp');
G.setPref('en');
ok(G.forDeck('de') === 'de' && G.forDeck('fr') === 'fr' && G.forDeck('') === 'en', 'trò chơi theo ngôn ngữ của deck (de / fr)');
G.setPref('de');
ok(G.cur() === 'de' && prefs['kb-glang'] === 'de', 'chọn Tiếng Đức → lưu ở cài đặt riêng máy');
G.setPref('auto');
const it = G.item('acts', 'neru', '寝る', 'ねる', 'de');
ok(it && it.t === 'schlafen' && it.r === '' && it.lang === 'de', 'sinh hoạt tiếng Đức: ' + JSON.stringify(it));
const it2 = G.item('guests', 'suzume', 'スズメ', 'スズメ', 'fr');
ok(it2 && it2.t && !JP.test(it2.t) && it2.lang === 'fr', 'khách tiếng Pháp: ' + JSON.stringify(it2));
ok(G.item('acts', 'moi_them', 'x', 'x', 'fr') === null, 'mục chưa có bản dịch → chỉ tiếng Việt');
const t1 = G.title('工房 · Xưởng chế tác', 'de'), t2 = G.title('工房 · Xưởng chế tác', 'fr');
ok(!JP.test(t1) && !JP.test(t2) && /Xưởng chế tác$/.test(t1), 'tiêu đề bảng: ' + t1 + ' / ' + t2);
const l1 = G.line('雨だ！ Mưa rồi, cây được tưới miễn phí ♪', 'de'), l2 = G.line('ドンマイ！', 'fr');
ok(!JP.test(l1) && /Mưa rồi/.test(l1) && !JP.test(l2) && l2.trim(), 'câu nói: ' + l1 + ' · ' + l2);
const bb = G.fill(new El('div'), 'いいね！', 'fr');
ok(!JP.test(bb.textContent) && bb.attrs.lang === 'fr', 'bong bóng tiếng Pháp có lang="fr": ' + JSON.stringify(bb.textContent));
ok(G.game('crow', 'カラス追い', 'de') && !JP.test(G.game('crow', 'カラス追い', 'de')) && G.ask('fr')[0].indexOf('%s') >= 0,
  'tên trò chơi / câu Chợ sáng');
ok(G.attr('de') === 'de' && G.attr('fr') === 'fr', 'thuộc tính lang (phông chữ / giọng đọc của trình duyệt)');

console.log('== c. báo: ngày / số báo (paper.js)');
const psrc = fs.readFileSync(path.join(ADDON, 'web', 'paper.js'), 'utf8');
const m0 = psrc.indexOf('  const DE_MONTHS'), m1 = psrc.indexOf('\n', psrc.indexOf('  const FR_DAYS'));
const d0 = psrc.indexOf('  function deDate('), d1 = psrc.indexOf('  function issueDate(');
ok(m0 > 0 && d0 > 0 && d1 > d0, 'tìm thấy deDate / frDate');
const D = new Function(psrc.slice(m0, m1) + psrc.slice(d0, d1) + '; return { deDate, frDate };')();
ok(D.deDate('2026-11-17') === 'Dienstag, 17. November 2026', D.deDate('2026-11-17'));
ok(D.frDate('2026-11-17') === 'mardi 17 novembre 2026' && D.frDate('2026-03-01') === 'dimanche 1er mars 2026',
  D.frDate('2026-11-17') + ' · ' + D.frDate('2026-03-01'));
ok(D.deDate('xx') === 'xx' && D.frDate('') === '', 'ngày hỏng → giữ nguyên');

const n = results.filter(Boolean).length;
console.log('JS: ' + n + '/' + results.length);
process.exit(n === results.length ? 0 : 1);
