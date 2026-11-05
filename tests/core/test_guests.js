// 1.21: web/guests.js chạy trong node (không trình duyệt) — lịch ghé theo khung 4 phút, lọc giờ / thời tiết,
// tần suất theo rate, chỉ khách Python cho phép, đi vào / ở lại / đi về, báo Python một lần mỗi ngày khi đang hiện,
// mọi khung hình mà frameOf dùng đều có, bấm trúng khách.
// Chạy: node test_guests.js ADDON
const fs = require('fs');
const path = require('path');
const ADDON = process.argv[2];
global.window = global;
eval(fs.readFileSync(path.join(ADDON, 'web', 'guests.js'), 'utf8').replace('var GardenGuests', 'global.GardenGuests'));
const G = global.GardenGuests;
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };

const defs = {
  suzume: { kind: 'hop', tod: ['day', 'dusk'], wx: 'dry', spot: ['flowers'] },
  kaeru: { kind: 'hop', tod: ['day', 'dusk', 'night'], wx: 'wet', spot: ['pond'] },
  fukuro: { kind: 'perch', tod: ['night'], wx: 'dry', spot: ['lantern'] },
  okojo: { kind: 'walk', tod: ['day', 'dusk', 'night'], wx: 'snow', spot: [] },
  neko: { kind: 'walk', tod: ['day', 'dusk'], wx: 'dry', spot: ['bench'] },
  mejiro: { kind: 'perch', tod: ['day'], wx: 'any', spot: ['furin'] },
  hotaru: { kind: 'swarm', tod: ['night'], wx: 'dry', spot: ['lantern'] },
  cho: { kind: 'fly', tod: ['day'], wx: 'dry', spot: ['flowers'] },
};
const data = { guests: { defs: defs, rate: 0.5, today: '2026-11-04',
  cand: { yard: [['suzume', 10], ['kaeru', 9], ['fukuro', 4], ['okojo', 6], ['neko', 18], ['cho', 7], ['hotaru', 8]], room: [['mejiro', 8]] } } };
const sent = [];
G.init({ data: () => data, send: (c) => sent.push(c) });
const DAY = { tod: 'day', rain: 0, snow: 0 }, NIGHT = { tod: 'night', rain: 0, snow: 0 }, RAIN = { tod: 'day', rain: 1, snow: 0 },
  SNOW = { tod: 'day', rain: 0, snow: 1 };
const SLOT = 240000, T0 = Date.UTC(2026, 10, 4, 3, 0, 0);

console.log('== lịch ghé theo khung giờ');
let have = 0, n = 0; const seen = {};
for (let s = 0; s < 2000; s++) {
  const t = T0 + s * SLOT + SLOT * 0.5;            // giữa khung: chắc chắn trong [start, end] nếu khung có khách
  const w = G._want('yard', t, DAY); n++;
  if (w) { have++; seen[w.id] = (seen[w.id] || 0) + 1; }
}
ok(Math.abs(have / n - 0.5) < 0.05, 'rate 0,5 → khoảng một nửa số khung có khách (' + (have / n).toFixed(3) + ')');
ok(Object.keys(seen).sort().join(',') === 'cho,neko,suzume', 'ban ngày khô: chỉ chim sẻ / mèo / bướm (' + Object.keys(seen).join(',') + ')');
ok(seen.neko > seen.suzume && seen.suzume > seen.cho, 'nhiều trọng số thì ghé nhiều hơn (mèo 18 > sẻ 10 > bướm 7)');
const ids = (st) => { const o = {}; for (let s = 0; s < 600; s++) { const w = G._want('yard', T0 + s * SLOT + SLOT * 0.5, st); if (w) { o[w.id] = 1; } } return Object.keys(o).sort().join(','); };
ok(ids(NIGHT) === 'fukuro,hotaru', 'ban đêm: cú, đom đóm (' + ids(NIGHT) + ')');
ok(ids(RAIN) === 'kaeru', 'trời mưa: ếch (' + ids(RAIN) + ')');
ok(ids(SNOW) === 'cho,neko,okojo,suzume', 'có tuyết: chồn tuyết + khách "không mưa" (' + ids(SNOW) + ')');
const w1 = G._want('yard', T0 + SLOT * 7 + 1000, DAY), w2 = G._want('yard', T0 + SLOT * 7 + 60000, DAY);
ok(JSON.stringify(w1 && w1.id) === JSON.stringify(w2 && w2.id) || !w1 || !w2, 'trong một khung: cùng một khách');
ok(G._want('beach', T0, DAY) === null, 'cảnh Python không cho khách nào → không có khách');
data.guests.rate = 0;
ok(ids(DAY) === '', 'rate 0 → không bao giờ có khách');
data.guests.rate = 1;
ok(G._want('room', T0 + SLOT * 3 + SLOT * 0.5, DAY).id === 'mejiro' && G._want('room', T0 + SLOT * 3 + SLOT * 0.5, NIGHT) === null,
  'trong nhà: vành khuyên ban ngày, đêm thì không');

console.log('== đi vào / ở lại / đi về, báo Python');
const spots = (want) => [{ id: 'bench', cx: 88, top: 63, bottom: 76, w: 16, left: 80, right: 96 }, { id: 'lantern', cx: 216, top: 28, bottom: 44, w: 12, left: 210, right: 222 }]
  .filter((s) => want.indexOf(s.id) >= 0);
G._clear();
let t = T0 + SLOT * 11 + SLOT * 0.4, got = null;
for (let s = 0; s < 400 && !got; s++) { const w = G._want('yard', T0 + s * SLOT + SLOT * 0.5, DAY); if (w && w.id === 'neko') { got = T0 + s * SLOT + SLOT * 0.5; } }
ok(!!got, 'có khung mèo hoang ghé');
t = got;
let ent = G.place('yard', t, DAY, { spots: spots, seen: false });
ok(ent.length === 1 && ent[0].guest && ent[0].a.id === 'neko' && ent[0].a.act === 'enter', 'khách mới đi vào từ mép cảnh');
const a = G._vis('yard');
ok(a.home.pose === 'lie' && a.home.x === 88 && a.home.y === 70, 'mèo hoang nằm trên ghế gỗ (giữa ghế, cao hơn chân ghế)');
for (let k = 0; k < 200; k++) { t += 100; G.place('yard', t, DAY, { spots: spots, seen: false }); }
ok(G._vis('yard').act === 'stay' && Math.abs(G._vis('yard').x - 88) < 1, 'tới chỗ rồi ở lại (≤ 20 giây)');
ok(sent.length === 0, 'cảnh không hiện cho người dùng (seen = false) → không báo Python');
for (let k = 0; k < 10; k++) { t += 100; G.place('yard', t, DAY, { spots: spots, seen: true }); }
ok(sent.length === 0, 'hiện chưa đủ 1,5 giây → chưa báo');
for (let k = 0; k < 10; k++) { t += 100; G.place('yard', t, DAY, { spots: spots, seen: true }); }
ok(sent.length === 1 && sent[0] === 'guest:met:neko:yard', 'hiện ≥ 1,5 giây → báo một lần: ' + sent[0]);
for (let k = 0; k < 50; k++) { t += 100; G.place('yard', t, DAY, { spots: spots, seen: true }); }
ok(sent.length === 1, 'cùng ngày không báo lại');
const fakeCtx = { fillRect() {}, beginPath() {}, arc() {}, fill() {}, set fillStyle(x) {}, set globalAlpha(x) {} };
G.draw(fakeCtx, 2, 0, 0, G.place('yard', t, DAY, { spots: spots, seen: true })[0], t);      // ô bấm lấy từ lần vẽ gần nhất
ok(G.at('yard', 88, 66) === 'neko' && G.at('yard', 20, 10) === null, 'bấm trúng khách / chỗ trống');
let left = false;
for (let k = 0; k < 400 && !left; k++) { t += 100; left = G.place('yard', t, NIGHT, { spots: spots, seen: true }).every((e) => e.a.id !== 'neko'); }
ok(left, 'trời tối (mèo không ghé đêm) → mèo đi về rồi biến mất');

console.log('== không đứng chồng lên đồ');
const items = [];
for (let cx = 72; cx <= 168; cx += 16) { for (let r = 0; r < 3; r++) { items.push({ id: 'fence', cx: cx + 8, top: 28 + r * 16, bottom: 44 + r * 16, w: 16, left: cx, right: cx + 16, cell: (cx / 16) + ',' + r }); } }
data.guests.defs.tanuki = { kind: 'walk', tod: ['day'], wx: 'any', spot: [] };
let clash = 0;
const realNow = Date.now;
for (let k = 0; k < 30; k++) {
  G._clear('u2');
  G.place('u2', T0 + k * SLOT, DAY, { spots: (ids) => (ids === '*' ? items : []), seen: false });
  // _force lấy khung giờ theo đồng hồ thật → giả đồng hồ cho mỗi lần một khung khác (trước 1.22.5: cả 30 lần cùng một chỗ,
  // test đúng / sai tuỳ khung 4 phút lúc chạy)
  Date.now = () => T0 + k * SLOT + 1000;
  G._force('u2', 'tanuki');
  Date.now = realNow;
  const h = G._vis('u2').home;
  if (items.some((b) => h.x > b.left - 7 && h.x < b.right + 7 && h.y > b.top - 2 && h.y < b.bottom + 3)) { clash++; }
}
ok(clash === 0, 'nửa trái sân kín đồ → khách đứng ngẫu nhiên vẫn tránh ô có đồ (' + clash + '/30 lần chạm)');

console.log('== khung hình');
const v = G._vis;
let missing = [];
const kinds = { suzume: 'hop', neko: 'walk', cho: 'fly', kaeru: 'hop', sagi: 'perch', tanuki: 'walk', kitsune: 'walk', shika: 'walk',
  kamome: 'hop', tsubame: 'fly', fukuro: 'perch', mejiro: 'perch', komori: 'fly', tsuru: 'walk', okojo: 'walk' };
Object.keys(kinds).forEach((id) => {
  data.guests.defs[id] = { kind: kinds[id], tod: ['day', 'dusk', 'night'], wx: 'any', spot: [] };
  G._clear('u1');
  G._force('u1', id);
  let tt = T0;
  const fake = { fillRect() {}, beginPath() {}, arc() {}, fill() {}, set fillStyle(x) {}, set globalAlpha(x) {} };
  for (let k = 0; k < 120; k++) {
    tt += 130;
    const e = G.place('u1', tt, DAY, { seen: false });
    if (!e.length) { missing.push(id + ':gone'); break; }
    if (k % 3 === 0) { G._vis('u1').alt = !G._vis('u1').alt; }
    try { G.draw(fake, 2, 0, 0, e[0], tt); } catch (err) { missing.push(id + ':' + err.message); break; }
    if (!e[0].box && kinds[id] !== 'swarm') { missing.push(id + ':nobox'); break; }
  }
});
ok(missing.length === 0, 'mọi khách vẽ được ở mọi dáng (đi, đứng, nghỉ, bay) ' + missing.join(' '));
ok(G.has('hotaru') && G.sprite('sagi') && G.sprite('sagi').length > 10, 'đom đóm không cần hình; cò có hình cho Album');

const pass = results.filter(Boolean).length;
console.log('KẾT QUẢ: ' + pass + '/' + results.length);
process.exit(pass === results.length ? 0 : 1);
