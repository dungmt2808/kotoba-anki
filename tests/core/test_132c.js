// 1.33.4 (kiểm tra lần cuối, 17/11): Đuổi quạ so đáp án với dữ liệu deck / bộ gõ "bẩn" — chạy đúng hàm của web/games.js
// trong node. Gọi: node test_132c.js ADDON
const fs = require('fs');
const path = require('path');
const ADDON = process.argv[2];
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const src = fs.readFileSync(path.join(ADDON, 'web', 'games.js'), 'utf8');
const a = src.indexOf('  function enNorm('), b = src.indexOf('  // Nghĩa ngắn gọn cho biển quạ');
// lấy luôn phần chú thích + hàm phụ đứng trước enNorm (1.33.4)
const a0 = src.lastIndexOf('\n', src.lastIndexOf('  // 1.33.4 (kiểm tra lần cuối): NFKC', a) >= 0 ? src.lastIndexOf('  // 1.33.4 (kiểm tra lần cuối): NFKC', a) : a);
ok(a > 0 && b > a, 'tìm thấy enNorm … pyAnswers trong games.js');
const F = new Function(src.slice(a0 > 0 ? a0 : a, b) + '; return { enNorm, spellAnswers, pyKey, pyTyped, pyAnswers, ' +
  'noSpace: typeof noSpace === "function" ? noSpace : null };')();
const hitS = (typed, ans) => F.spellAnswers(ans).indexOf(F.enNorm(typed)) >= 0;
const hitCJK = (typed, ans) => {     // như check() của Đuổi quạ: nhóm zh / ko, chế độ gõ chữ
  const rs = F.noSpace ? F.noSpace(F.spellAnswers(ans)) : F.spellAnswers(ans);
  const t = F.enNorm(typed); const ts = F.noSpace ? F.noSpace([t]) : [t];
  return !!t && ts.some((x) => rs.indexOf(x) >= 0);
};
const hitP = (typed, r) => F.pyAnswers(r).indexOf(F.pyTyped(typed)) >= 0;
const NFD = (s) => s.normalize('NFD');

console.log('== 1. gõ nghĩa tiếng Việt (Chữ → gõ nghĩa): bộ gõ dựng sẵn / tổ hợp');
ok(hitS(NFD('quả táo'), 'quả táo'), 'gõ kiểu tổ hợp (Unikey "Unicode tổ hợp", bàn phím Vietnamese của Windows) — deck dựng sẵn');
ok(hitS('quả táo', NFD('quả táo')), 'gõ dựng sẵn — deck lưu kiểu tổ hợp');
ok(hitS(NFD('Người Việt'), 'người việt'), 'tổ hợp + chữ hoa');
ok(F.enNorm(NFD('quả táo')) === 'quả táo', 'enNorm(tổ hợp) = "quả táo" (trước: "qua ta o")');
ok(!hitS('qua tao', 'quả táo'), 'bỏ dấu thì vẫn sai (giữ luật cũ: phải gõ đúng dấu)');
ok(!hitS('quá táo', 'quả táo'), 'sai dấu thanh vẫn sai');
ok(hitS('Cảm ơn!', 'cảm ơn'), 'dấu câu / hoa thường không tính (như cũ)');
ok(hitS('xin chào', 'xin chào; chào'), 'nhiều nghĩa tách bằng ; (như cũ)');

console.log('== 2. gõ chữ Hàn / chữ Trung (Nghĩa → gõ chữ)');
ok(hitCJK('사과', NFD('사과')), 'deck lưu Hangul tách nét (NFD) — gõ bằng bộ gõ (âm tiết dựng sẵn)');
ok(hitCJK(NFD('학교'), '학교'), 'gõ tách nét — deck dựng sẵn');
ok(hitCJK('사과주스', '사과 주스'), 'tiếng Hàn viết liền / cách không tính (사과주스 = 사과 주스)');
ok(hitCJK('사과 주스', '사과주스'), '… và ngược lại');
ok(hitCJK('你 好', '你好'), 'tiếng Trung lỡ có dấu cách');
ok(!hitCJK('사과', '사과 주스'), 'thiếu chữ vẫn sai');
ok(!hitCJK('사가', '사과'), 'sai chữ vẫn sai');
ok(hitCJK('学生', '学生 / 學生') && hitCJK('學生', '学生 / 學生'), 'giản thể / phồn thể ghi cùng trường (/) đều đúng (như cũ)');
ok(hitS('ａｐｐｌｅ', 'apple'), 'chữ Latin toàn khổ (bộ gõ Nhật bật sẵn) = chữ thường');
ok(F.enNorm('हिंदी') === 'हिंदी', 'dấu ghép không gộp được (Hindi…) không bị cắt thành nhiều chữ');
ok(F.enNorm("don't") === "don't" && F.enNorm('look-up') === 'look up', 'tiếng Anh như cũ (don\'t, look-up)');
ok(F.enNorm("` apple '") === 'apple' && F.enNorm("'apple'") === 'apple', 'dấu nháy + dấu cách ở đầu / cuối không để lại dấu cách thừa (" apple" ≠ "apple")');

console.log('== 3. pinyin của deck có nhiều cách ghi');
const CASES = [
  ['hǎo（hào）', ['hao', 'hao3', 'hao4']], ['hǎo (hào)', ['hao', 'hao3', 'hao4']], ['hǎo，hào', ['hao', 'hao3', 'hao4']],
  ['hǎo、hào', ['hao3', 'hao4']], ['hǎo；hào', ['hao3', 'hao4']], ['nǐ hǎo (lịch sự: nín hǎo)', ['nihao', 'ni3hao3', 'nin2hao3']],
  ['de, dí, dì', ['de', 'di2', 'di4']], ['dōu/dū', ['dou1', 'du1']], ['xíng（háng）', ['xing2', 'hang2']],
];
CASES.forEach(([r, ts]) => ok(ts.every((t) => hitP(t, r)), JSON.stringify(r) + ' → gõ ' + ts.join(' / ') + ' đều đúng'));
ok(!hitP('haohao', 'hǎo，hào') && !hitP('hao3hao4', 'hǎo（hào）'), 'không còn đáp án dính liền "haohao"');
ok(!hitP('hao2', 'hǎo（hào）'), 'sai thanh vẫn sai');
// các ca của bản 1.32 (core/test_132.js) vẫn giữ
[['xia4yu3', 'xià yǔ'], ['xiayu', 'xià yǔ'], ['xià yǔ', 'xià yǔ'], ['XIA4 YU3', 'xià yǔ'], ['lv4', 'lǜ'], ['lu:4', 'lǜ'], ['lü4', 'lǜ'],
  ['nv3er2', "nǚ'ér"], ['xie4xie5', 'xièxie'], ["hai3'ou1", "hǎi'ōu"], ['Zhong1guo2', 'Zhōngguó'], ['ni3hao3', 'nǐ hǎo, nín hǎo'],
  ['lü4', NFD('lǜ')], ['yi4dian3r', 'yìdiǎnr']].forEach(([t, r]) => ok(hitP(t, r), 'như cũ: ' + JSON.stringify(t) + ' đúng với ' + JSON.stringify(r)));
[['xia3yu3', 'xià yǔ'], ['xia4', 'xià yǔ'], ['lu4', 'lǜ'], ['', 'xià yǔ']].forEach(([t, r]) => ok(!hitP(t, r), 'như cũ: ' + JSON.stringify(t) + ' sai với ' + r));
ok(F.pyAnswers('').length === 0 && F.pyAnswers('()').length === 0 && F.pyAnswers('（）、，').length === 0, 'pinyin trống / chỉ có dấu → không có đáp án (không đuổi bừa)');

console.log('== 4. ngẫu nhiên: so đáp án không bao giờ ném lỗi, đáp án của chính nó luôn đúng');
let seed = 132; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const POOL = 'aáàảãạăắâấđeéêếiíoóôốơớuúưứyý xin chào 你好學生사과주스한국어 ()（），、；;/|:：̣́̀̃̉가 ｱａ1234-\'`’'.split('');
let thrown = 0, selfBad = 0, pySelf = 0;
for (let i = 0; i < 20000; i++) {
  let s = ''; const n = 1 + Math.floor(rnd() * 16);
  for (let k = 0; k < n; k++) { s += POOL[Math.floor(rnd() * POOL.length)]; }
  try {
    const ans = F.spellAnswers(s);
    if (ans.length && !ans.some((x) => x === F.enNorm(F.enNorm(x)))) { selfBad++; }
    if (F.enNorm(s) && F.spellAnswers(s).length && !hitS(s, s) && !/[,;/|；、()（）]/.test(s)) { selfBad++; }
    const first = s.split(/[,;/|，；、]/).find((x) => F.pyKey(x).l);
    if (first !== undefined && !/[()（）]/.test(s) && F.pyAnswers(s).indexOf(F.pyTyped(first)) < 0) { pySelf++; }
  } catch (e) { thrown++; }
}
ok(thrown === 0, '20.000 chuỗi ngẫu nhiên: không lỗi (' + thrown + ')');
ok(selfBad === 0, 'gõ lại đúng chữ của thẻ thì luôn đúng, kể cả dạng dựng sẵn / tổ hợp (' + selfBad + ' ca sai)');
ok(pySelf === 0, 'pinyin: gõ lại vế đầu luôn đúng (' + pySelf + ' ca sai)');

console.log('== 5. ô gõ Đuổi quạ: đang ghép chữ (bộ gõ) thì chưa chấm');
const inp = src.indexOf('input.addEventListener("input"');
const line = src.slice(inp, src.indexOf('\n', inp));
ok(/isComposing/.test(line), 'sự kiện input bỏ qua lúc isComposing: ' + line.trim());
ok(/addEventListener\("compositionend", \(\) => check\(false\)\)/.test(src), 'chấm khi chữ đã vào ô (compositionend)');
ok(/e\.key === "Enter" && !e\.isComposing/.test(src), 'Enter lúc đang ghép chữ không chấm (như cũ)');

const n = results.filter(Boolean).length;
console.log('JS: ' + n + '/' + results.length);
process.exit(n === results.length ? 0 : 1);
