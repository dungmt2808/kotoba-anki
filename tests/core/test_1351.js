// 1.35.1: Đuổi quạ (hàm thật của web/games.js trong node) — động từ phản thân gõ không cần sich / se / s' (như bỏ mạo từ),
// đáp án đã đúng ở 1.35.0 vẫn đúng, gõ sai vẫn sai. Gọi từ test_1351.py: node test_1351.js ADDON
const fs = require('fs');
const path = require('path');
const ADDON = process.argv[2];
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const src = fs.readFileSync(path.join(ADDON, 'web', 'games.js'), 'utf8');
const a = src.indexOf('  function enNorm('), b = src.indexOf('  // Nghĩa ngắn gọn cho biển quạ');
const c0 = src.lastIndexOf('  // 1.34.1 (kiểm tra lần cuối): NFKC', a);
const F = new Function(src.slice(c0 > 0 ? c0 : a, b) + '; return { enNorm, euFold, euStrip, euAnswers, euFace };')();
const hit = (typed, word, lang) => F.euAnswers({ word: word }, lang).indexOf(F.euFold(F.enNorm(typed), lang)) >= 0;
const YES = [['freuen', 'sich freuen', 'de'], ['sich freuen', 'sich freuen', 'de'], ['ausruhen', 'sich ausruhen', 'de'],
  ['asseoir', "s'asseoir", 'fr'], ["s'asseoir", "s'asseoir", 'fr'], ['s’asseoir', "s'asseoir", 'fr'], ['lever', 'se lever', 'fr'],
  ['se lever', 'se lever', 'fr'], ['promener', 'se promener (v)', 'fr'], ['Hund', 'der Hund, -e', 'de'], ['ecole', "l'école", 'fr'],
  ['Mutter', 'die Mutter, ¨', 'de'], ['Hund', 'der Hund, -(e)s, -e', 'de'], ['der Name', 'der Name, -ns, -n', 'de'],
  ['Frau', 'die Frau, -, -en', 'de']];
const NO = [['sich', 'sich freuen', 'de'], ['se', 'se lever', 'fr'], ['freue', 'sich freuen', 'de'], ['leve', 'se lever', 'fr'],
  ['¨', 'die Mutter, ¨', 'de'], ['', 'die Mutter, ¨', 'de']];
const badY = YES.filter(([t, w, l]) => !hit(t, w, l)), badN = NO.filter(([t, w, l]) => hit(t, w, l));
ok(!badY.length, YES.length + ' cách gõ đúng (động từ phản thân không cần sich / se; đáp án cũ vẫn đúng)' +
  (badY.length ? ' — sai: ' + JSON.stringify(badY) : ''));
ok(!badN.length, NO.length + ' cách gõ sai vẫn sai (chỉ "sich" / "se", chia động từ, dấu ¨ trống)' +
  (badN.length ? ' — sai: ' + JSON.stringify(badN) : ''));
// Chợ sáng: khách nói chữ của deck không kèm ghi chú số nhiều / giống
const FACE = [['der Hund, -e', 'der Hund'], ['das Haus, ¨-er', 'das Haus'], ['die Mutter, ¨', 'die Mutter'], ["l'œil (m)", "l'œil"],
  ['gehen / laufen', 'gehen'], ['der Lehrer, -', 'der Lehrer'], ['der Hund, -(e)s, -e', 'der Hund'], ['la maison', 'la maison'],
  ['Haus [haʊs]', 'Haus'], ['un(e) ami(e)', 'un ami'], ['', '']];
const badF = FACE.filter(([w, want]) => F.euFace(w) !== want).map(([w, want]) => w + ' → ' + F.euFace(w) + ' (cần ' + want + ')');
ok(!badF.length, FACE.length + ' chữ khách Chợ sáng nói (bỏ ", -e" / "(m)" / cách viết thứ hai)' + (badF.length ? ' — ' + badF.join('; ') : ''));
process.exit(results.every(Boolean) ? 0 : 1);
