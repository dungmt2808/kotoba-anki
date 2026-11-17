// 1.32: web/glang.js (Ngôn ngữ trong vườn) + bộ so pinyin của Đuổi quạ (games.js) chạy trong node. Gọi từ test_132.py:
//   node test_132.js ADDON in.json   (in.json = {bundle: lang_core.bundle(), lits: [[file, dòng, chuỗi có chữ Nhật]…]})
const fs = require('fs');
const path = require('path');
const ADDON = process.argv[2];
const IN = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };

// DOM tối thiểu cho fill(): nút chữ, phần tử có con, thuộc tính
class Node0 { constructor(t, v) { this.nodeType = t; this.nodeValue = v; } }
class El {
  constructor(tag) { this.tagName = tag; this.childNodes = []; this.attrs = {}; this.className = ''; this.dataset = {}; }
  appendChild(c) { this.childNodes.push(c); return c; }
  get firstChild() { return this.childNodes[0] || null; }
  get lastChild() { return this.childNodes[this.childNodes.length - 1] || null; }
  set textContent(v) { this.childNodes = v === '' ? [] : [new Node0(3, String(v))]; }
  get textContent() { return this.childNodes.map((c) => (c.nodeType === 3 ? c.nodeValue : c.textContent)).join(''); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  removeAttribute(k) { delete this.attrs[k]; }
  getAttribute(k) { return this.attrs[k] === undefined ? null : this.attrs[k]; }
  querySelectorAll() { return []; }
}
global.document = { createElement: (t) => new El(t), createTextNode: (v) => new Node0(3, v), getElementById: () => null, querySelectorAll: () => [] };
const prefs = {};
global.GardenPrefs = { get: (k) => (k in prefs ? prefs[k] : null), set: (k, v) => { prefs[k] = v; } };
eval(fs.readFileSync(path.join(ADDON, 'web', 'glang.js'), 'utf8').replace('var GardenLang', 'global.GardenLang'));
const G = global.GardenLang;
const JP = /[぀-ヿ㐀-鿿]/, KANA = /[぀-ヿ]/, HANGUL = /[가-힣]/;

console.log('== 5a. tự theo deck');
G.setData({ gl: IN.bundle, plants: [] });
ok(G.pref() === 'auto' && G.cur() === 'ja', 'chưa chọn, vườn trống → tiếng Nhật như các bản trước');
G.setData({ gl: IN.bundle, plants: [{ lang: 'zh' }, { lang: 'zh' }, { lang: 'ja' }, { lang: 'other' }] });
ok(G.cur() === 'zh', 'phần lớn cây là deck tiếng Trung → tiếng Trung');
G.setData({ gl: IN.bundle, plants: [{ lang: 'ko' }, { lang: 'other' }, { lang: 'other' }, { lang: 'other' }] });
ok(G.cur() === 'ko', 'deck "Ngôn ngữ khác" không tính → tiếng Hàn');
G.setData({ gl: IN.bundle, plants: [{ lang: 'other' }, { lang: 'other' }] });
ok(G.cur() === 'ja', 'toàn deck ngôn ngữ khác → tiếng Nhật');
G.setData({ gl: IN.bundle, plants: [{ lang: 'en' }, { lang: 'ja' }] });
ok(G.cur() === 'ja', 'hoà → tiếng Nhật');
G.setPref('vi');
ok(G.cur() === 'vi' && prefs['kb-glang'] === 'vi', 'chọn Chỉ tiếng Việt → lưu ở cài đặt riêng máy (kb-glang)');
ok(G.forDeck('zh') === 'vi' && G.forDeck('en') === 'vi', 'Chỉ tiếng Việt → trò chơi cũng tiếng Việt');
G.setPref('en');
ok(G.forDeck('zh') === 'zh' && G.forDeck('ko') === 'ko' && G.forDeck('ja') === 'ja' && G.forDeck('') === 'en',
  'trò chơi theo ngôn ngữ của deck; deck ngôn ngữ khác → theo vườn');
G.setPref('xx'); ok(G.pref() === 'en', 'giá trị lạ không lưu');
prefs['kb-glang'] = 'abc'; ok(G.pref() === 'auto', 'cài đặt hỏng → Tự theo deck');
G.setPref('auto');

console.log('== 5b. mọi câu tiếng Nhật trong mã trang đổi được');
const bad = { en: [], zh: [], ko: [], vi: [] };
const tr = (s, l) => { const t = G.title(s, l); return t !== s ? G.line(t, l) : G.line(s, l); };
IN.lits.forEach(([f, i, s]) => {
  ['en', 'zh', 'ko', 'vi'].forEach((l) => {
    const out = tr(s, l);
    const same = IN.bundle.say[s] && IN.bundle.say[s][1] === s;          // 天才！ viết giống nhau ở hai tiếng
    const leak = l === 'zh' ? KANA.test(out) || (out === s && !same) : JP.test(out);
    // câu chào ngày lễ (event_core) ở màn chào: Chỉ tiếng Việt dùng câu tiếng Việt đi kèm (greet.js), nên được rỗng
    if (leak || (l === 'vi' && !out.trim() && f !== 'event_core.py' && !/^\s*\S+ · $/.test(s))) { bad[l].push(f + ':' + i + ' ' + JSON.stringify(s) + ' → ' + JSON.stringify(out)); }
  });
});
['en', 'zh', 'ko', 'vi'].forEach((l) => ok(!bad[l].length, IN.lits.length + ' chuỗi → ' + l + ': không còn chữ Nhật' +
  (bad[l].length ? ' — ' + bad[l].slice(0, 4).join(' | ') : '')));
ok(G.line('雨だ！ Mưa rồi, cây được tưới miễn phí ♪', 'en') === "It's raining! Mưa rồi, cây được tưới miễn phí ♪", 'câu kèm tiếng Việt: chỉ đổi phần tiếng Nhật');
ok(G.line('雨だ！ Mưa rồi, cây được tưới miễn phí ♪', 'vi') === 'Mưa rồi, cây được tưới miễn phí ♪', 'Chỉ tiếng Việt: bỏ phần tiếng Nhật, không thừa dấu cách');
ok(G.line('ドンマイ！', 'vi') === 'Không sao đâu!', 'câu chỉ có tiếng Nhật → câu tiếng Việt riêng');
ok(G.line('合格祈願！ Cầu thi JLPT đỗ nè', 'zh') === '祝你考试通过！ Cầu thi HSK đỗ nè' && G.line('合格祈願！ Cầu thi JLPT đỗ nè', 'ko').indexOf('TOPIK') > 0,
  'Đền: tiếng Trung cầu thi HSK, tiếng Hàn TOPIK (không còn JLPT)');
ok(G.line('雨だ！ x', 'ja') === '雨だ！ x', 'tiếng Nhật: giữ nguyên');
ok(G.title('工房 · Xưởng chế tác', 'zh') === '工坊 · Xưởng chế tác' && G.title('工房 · Xưởng chế tác', 'vi') === 'Xưởng chế tác', 'tiêu đề bảng');

console.log('== 5c. bong bóng tiếng Trung có pinyin; mục có mã');
const b = G.fill(new El('div'), '雨だ！ Mưa rồi', 'zh');
const py = b.childNodes.find((c) => c.className === 'kb-py');
ok(b.textContent === '下雨了！ xià yǔ le Mưa rồi' && py && py.attrs.lang === 'zh-Latn' && b.attrs.lang === 'zh-CN',
  'StackChan nói tiếng Trung: chữ + pinyin nhỏ (span.kb-py) + phần tiếng Việt: ' + JSON.stringify(b.textContent));
const b2 = G.fill(new El('div'), 'Đạt mục tiêu hôm nay! すごい', 'zh');
ok(b2.textContent === 'Đạt mục tiêu hôm nay! 真厉害 zhēn lìhai', 'tiếng Nhật ở cuối câu: ' + JSON.stringify(b2.textContent));
ok(G.fill(new El('div'), 'いいね！', 'vi').textContent === 'Hay lắm!' && G.fill(new El('div'), 'いいね！', 'ko').attrs.lang === 'ko', 'tiếng Việt / tiếng Hàn');
const it = G.item('acts', 'hon', '本を読む', 'ほんをよむ', 'zh');
ok(it.t === '看书' && it.r === 'kàn shū' && it.lang === 'zh-CN', 'sinh hoạt "đọc sách" tiếng Trung: 看书 kàn shū');
ok(G.item('finds', 'kaigara', '貝殻', 'かいがら', 'ko').t === '조개껍데기', 'đồ nhặt tiếng Hàn');
ok(G.item('guests', 'suzume', 'スズメ', 'スズメ', 'en').t === 'sparrow' && G.item('guests', 'suzume', 'スズメ', 'スズメ', 'en').r === '', 'khách tiếng Anh: không dòng phiên âm');
ok(G.item('acts', 'hon', '本を読む', 'ほんをよむ', 'vi') === null, 'Chỉ tiếng Việt → không có chữ nước ngoài');
ok(G.item('acts', 'moi_them', 'x', 'x', 'en') === null && G.item('acts', 'moi_them', 'x', 'y', 'ja').t === 'x', 'mục chưa có bản dịch: tiếng Nhật giữ, tiếng khác chỉ tiếng Việt');
ok(G.label('seasons', 'hanami', '花見', '', 'zh') === '赏樱 shǎng yīng' && G.label('seasons', 'hanami', '花見', '', 'ja') === '花見', 'tên mùa cạnh tên tiếng Việt');
ok(G.game('crow', 'カラス追い', 'zh') === '赶乌鸦' && G.game('crow', 'カラス追い', 'vi') === '', 'tên trò chơi');
ok(G.ask('ko')[0].indexOf('%s') >= 0 && G.tag('meaning', '意', 'en') === 'M', 'Chợ sáng / Lật cặp');

console.log('== 5d. Đuổi quạ: so pinyin');
const gsrc = fs.readFileSync(path.join(ADDON, 'web', 'games.js'), 'utf8');
const s0 = gsrc.indexOf('  const PY_TONE = '), s1 = gsrc.indexOf('  // Nghĩa ngắn gọn cho biển quạ');
ok(s0 > 0 && s1 > s0, 'tìm thấy pyKey / pyAnswers trong games.js');
const P = new Function(gsrc.slice(s0, s1) + '; return { pyKey, pyTyped, pyAnswers };')();
const hit = (typed, reading) => P.pyAnswers(reading).indexOf(P.pyTyped(typed)) >= 0;
[['xia4yu3', 'xià yǔ'], ['xiayu', 'xià yǔ'], ['xià yǔ', 'xià yǔ'], ['XIA4 YU3', 'xià yǔ'], ['xia4 yu3', 'xia4 yu3'],
  ['lv4', 'lǜ'], ['lu:4', 'lǜ'], ['lü4', 'lǜ'], ['nv3er2', 'nǚ\'ér'], ['xie4xie5', 'xièxie'], ['xie4xie', 'xièxie'], ['xiexie', 'xièxie'],
  ["hai3'ou1", "hǎi'ōu"], ['Zhong1guo2', 'Zhōngguó'], ['ni3hao3', 'nǐ hǎo, nín hǎo']].forEach(([t, r]) => ok(hit(t, r), JSON.stringify(t) + ' đúng với ' + r));
[['xia3yu3', 'xià yǔ'], ['xia4', 'xià yǔ'], ['xiayu4', 'xià yǔ'], ['shia4yu3', 'xià yǔ'], ['lu4', 'lǜ'], ['', 'xià yǔ']].forEach(([t, r]) =>
  ok(!hit(t, r), JSON.stringify(t) + ' sai với ' + r));

const n = results.filter(Boolean).length;
console.log('JS: ' + n + '/' + results.length);
process.exit(n === results.length ? 0 : 1);
