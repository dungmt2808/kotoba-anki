// Test nhạc nền 1.18 (node, không cần trình duyệt): đủ 14 chủ đề có bản riêng, bản nào cũng 8 ô nhịp khớp hợp âm,
// tầm nốt hợp lý, và chọn bản theo màn + chủ đề đang dùng + chủ đề đang "Xem thử" trong Nhà.
// Chạy: node test_music.js THƯ_MỤC_ADD_ON
const fs = require('fs'), vm = require('vm'), path = require('path');
const ADDON = process.argv[2];
const FAIL = [];
const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) FAIL.push(m); };

// chủ đề lấy từ season.js (bảng VIS) để test tự theo kịp khi thêm chủ đề
const seasonSrc = fs.readFileSync(path.join(ADDON, 'web/season.js'), 'utf8');
const visBlock = seasonSrc.slice(seasonSrc.indexOf('const VIS = {'), seasonSrc.indexOf('};', seasonSrc.indexOf('const VIS = {')));
const THEMES = Array.from(visBlock.matchAll(/^\s{4}(\w+): \{/gm)).map(m => m[1]);

const sea = { cur: null, pv: null };
const ctx = {
  document: { addEventListener() {} }, window: { addEventListener() {} },
  localStorage: { getItem: () => null, setItem() {} }, console, setTimeout, setInterval, clearInterval,
  GardenSeason: { current: () => sea.cur, previewing: () => sea.pv }
};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ADDON, 'web/music.js'), 'utf8') + '\nthis.GardenMusic = GardenMusic;', ctx);
const M = ctx.GardenMusic, T = M._tracks;

console.log('== mỗi chủ đề một bản');
ok(THEMES.length === 14, '14 chủ đề trong season.js: ' + THEMES.join(', '));
const missing = THEMES.filter(id => !M.themeTrack(id) || !T[M.themeTrack(id)]);
ok(!missing.length, 'chủ đề nào cũng có bản nhạc riêng' + (missing.length ? ' (thiếu: ' + missing.join(', ') + ')' : ''));
const used = new Set(THEMES.map(id => M.themeTrack(id)));
ok(used.size === THEMES.length && !used.has('garden') && !used.has('home') && !used.has('game'), 'không chủ đề nào dùng chung bản / dùng bản vườn thường');

console.log('== bản nào cũng đúng nhịp');
for (const [name, t] of Object.entries(T)) {
  if (t.noel) {         // 1.36: nhạc Giáng sinh để chọn — số ô nhịp theo bài, nhịp 4/4 hoặc 3/4
    const lead = t.voices.lead.map(n => n.m), lo = Math.min(...lead), hi = Math.max(...lead);
    const vols = Object.entries(t.voices).filter(([v, ns]) => ns.length && !t.vol[v] && v !== 'arp');
    ok(t.len % t.bar === 0 && (t.bar === 16 || t.bar === 12) && t.bars === t.chords && lo >= 55 && hi <= 96 && t.bpm >= 60 && t.bpm <= 160 && !vols.length,
      name.padEnd(13) + ' (Giáng sinh) ' + t.bars + ' ô nhịp ' + (t.bar === 12 ? '3/4' : '4/4') + ', nốt ' + lo + '–' + hi + ', ' + t.bpm + ' bpm');
    continue;
  }
  const lead = t.voices.lead.map(n => n.m);
  const lo = Math.min(...lead), hi = Math.max(...lead);
  const good = t.len % 16 === 0 && t.bars === 8 && t.chords === t.bars && lo >= 55 && hi <= 96 && t.bpm >= 60 && t.bpm <= 160;
  const vols = Object.entries(t.voices).filter(([v, ns]) => ns.length && !t.vol[v] && v !== 'arp');
  ok(good && !vols.length, name.padEnd(13) + ' ' + t.bars + ' ô nhịp, ' + t.chords + ' hợp âm, nốt ' + lo + '–' + hi + ', ' + t.bpm + ' bpm' +
    (vols.length ? ' · thiếu âm lượng cho ' + vols.map(v => v[0]).join(',') : ''));
}

console.log('== chọn bản theo màn / chủ đề / Xem thử');
sea.cur = null; sea.pv = null;
ok(M.trackFor('garden') === 'garden', 'không dùng giao diện mùa → bản vườn thường');
sea.cur = 'autumn';
ok(M.trackFor('garden') === 'autumn', 'đang dùng Mùa thu → bản Mùa thu (trước 1.18: bản vườn thường)');
ok(M.trackFor('home') === 'home' && M.trackFor('game') === 'game', 'Nhà / trò chơi giữ bản riêng');
ok(M.trackFor('review') === null && M.trackFor('listen') === null, 'ôn thẻ / nghe → im');
sea.pv = 'natsumatsuri';
ok(M.trackFor('home') === 'natsumatsuri', 'bấm Xem thử “Lễ hội mùa hè” trong Nhà → phát nhạc lễ hội');
ok(M.trackFor('game') === 'game' && M.trackFor('review') === null, 'Xem thử không đổi nhạc trò chơi / không phát khi ôn');
sea.pv = null;
ok(M.trackFor('home') === 'home', 'Dừng xem thử → lại hộp nhạc của Nhà');
sea.cur = 'halloween'; sea.pv = 'tet';
ok(M.trackFor('home') === 'tet' && M.trackFor('garden') === 'tet', 'xem thử Tết khi đang dùng Halloween → nhạc Tết');

console.log('== 1.36: nhạc Giáng sinh');
sea.cur = 'noel'; sea.pv = null;
ok(M.trackFor('garden') === 'noel', 'mặc định: Nhạc vườn Noel như cũ');
const ch = M.noelChoices();
ok(ch.length === 8 && ch[ch.length - 1].id === 'daily' && ch.slice(0, -1).every((c) => T[c.id]), '7 bài + "Đổi bài mỗi ngày": ' + ch.map((c) => c.id).join(', '));
M.setNoel('silent');
ok(M.trackFor('garden') === 'silent' && M.trackFor('home') === 'home', 'chọn Silent Night → vườn phát Silent Night, Nhà giữ hộp nhạc');
sea.cur = 'autumn';
ok(M.trackFor('garden') === 'autumn', 'giao diện khác → không phát nhạc Giáng sinh');
sea.cur = 'noel'; M.setNoel('daily');
ok(T[M.trackFor('garden')] && T[M.trackFor('garden')].noel !== undefined && M.trackFor('garden') !== 'daily', 'Đổi bài mỗi ngày → một bài có thật: ' + M.trackFor('garden'));
M.setNoel('khong_co');
ok(M.noelPick() === 'daily', 'id lạ → bỏ qua');
sea.cur = null;

console.log('KẾT QUẢ:', FAIL.length ? FAIL.length + ' LỖI' : 'TẤT CẢ OK');
process.exit(FAIL.length ? 1 : 0);
