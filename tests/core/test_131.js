// 1.31: web/life.js + web/fx.js chạy trong node — đồ đang mặc vẽ lên StackChan sinh hoạt và linh vật góc trái.
//   - bản vẽ nhỏ của 13 món có sẵn: 16 cột, màu có trong bảng, viền mực tự thêm (trừ đồ trên mặt)
//   - thu nhỏ món tự vẽ 20 cột → 16 cột (mũ / mặt / cổ), nét 1 ô vẫn còn, hình trống → null
//   - StackChan sinh hoạt vẽ đồ ở mọi tư thế (đứng, ngồi, ngủ gật, nằm giường, ngâm bồn, bơi), bỏ đúng chỗ bị che
//   - vỏ: đồ có sẵn / tự vẽ / đang xem trước đổi màu thân; fx.js: món tự vẽ vẽ đúng điểm ảnh, wearOn gộp hai bảng
// Chạy: node test_131.js ADDON
const fs = require('fs');
const path = require('path');
const ADDON = process.argv[2];
global.window = global;
const els = {};
let drawn = [];
const mkctx = () => ({ fillRect(x, y, w, h) { drawn.push([x, y, w, h, this.fillStyle]); }, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {},
  translate() {}, clearRect() {}, fillText() {}, canvas: { width: 4000 }, set globalAlpha(v) {}, get globalAlpha() { return 1; } });
const ctx = mkctx();
global.document = { hidden: false, getElementById: (id) => els[id] || null, addEventListener() {}, createElement: () => ({ getContext: () => ctx, setAttribute() {}, appendChild(c) { return c; }, addEventListener() {}, style: {}, classList: { toggle() {} } }) };
global.GardenSky = { state: () => ({ hour: 10, rain: 0, snow: 0 }) };
global.GardenUI = { get: () => 'full' };
global.GardenHome = { mainScene: () => 'yard' };
global.matchMedia = () => ({ matches: false });
eval(fs.readFileSync(path.join(ADDON, 'web', 'fx.js'), 'utf8').replace('var GardenFX', 'global.GardenFX'));
eval(fs.readFileSync(path.join(ADDON, 'web', 'life.js'), 'utf8').replace('var GardenLife', 'global.GardenLife'));
const L = global.GardenLife, F = global.GardenFX;
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };

const PAL = { k: '#1b1b2f', r: '#ff4f6d', y: '#ffd23f', g: '#3ccb5e', G: '#2e8b3a', w: '#ffffff', s: '#d4d4e0', p: '#ff7fa0', R: '#c21f3a', d: '#3d8bff' };
const hat = ['....................', '........rrrr........', '.......rrrrrr.......', '......rrrrrrrr......', 'rrrrrrrrrrrrrrrrrrrr', '....................', '....................', '....................'];
const data = { wallet: { wear: { on: {}, owned: [] }, more: { mywear: { items: {}, on: {} } } },
  catalog: { craft: { palette: PAL }, mywears: [{ id: 'w1', slot: 'head', rows: hat, dy: -5, px: 'x1' }, { id: 'w2', slot: 'shell', c: ['g', 'G'], hex: ['#3ccb5e', '#2e8b3a'] }] } };
F.init && (function () { try { F.init({ data: () => data }); } catch (e) { /* start() cần requestAnimationFrame — bỏ qua */ } })();
L.init({ data: () => data, send() {} });

console.log('== bản vẽ nhỏ của đồ có sẵn');
const BUILTIN = ['leaf', 'hachimaki', 'catears', 'straw', 'santa', 'nonla', 'grad', 'crown', 'glasses', 'bandaid', 'bow', 'scarf', 'bell'];
const SLOT = { glasses: 'face', bandaid: 'face', bow: 'neck', scarf: 'neck', bell: 'neck' };
const WPAL = 'kswnSapdlyorgGbBtcmPvhiR'.split('');
BUILTIN.forEach((id) => {
  const a = L._miniOf(id, SLOT[id] || 'head');
  const wide = a && a.rows.every((r) => r.length === 16);
  const chars = a && a.rows.join('').replace(/\./g, '').split('').every((c) => WPAL.indexOf(c) >= 0);
  const flat = SLOT[id] === 'face';
  const outlined = a && (flat || a.rows.join('').indexOf('k') >= 0);
  ok(a && wide && chars && outlined && a.rows.length <= 7, id + ': ' + (a ? a.rows.length + ' hàng × 16 cột, dy ' + a.dy + (flat ? ' (không viền)' : ' (có viền mực)') : 'thiếu'));
});
const st = L._miniOf('straw', 'head'), gl = L._miniOf('glasses', 'face'), bw = L._miniOf('bow', 'neck');
ok(st.dy + st.rows.length <= 1 && st.dy < -2, 'mũ nằm trên đầu (Mũ rơm dy ' + st.dy + ')');
ok(gl.dy >= 2 && gl.dy + gl.rows.length <= 8, 'kính nằm trong màn hình (hàng 2–7)');
ok(bw.dy >= 8 && bw.dy <= 10, 'nơ ở cổ (giữa đầu và thân)');

console.log('== thu nhỏ món tự vẽ');
const m1 = L.miniWear(hat, -5, 'head');
ok(m1 && m1.rows.every((r) => r.length === 16) && /r/.test(m1.rows.join('')), 'mũ 20 × 8 → ' + (m1 && m1.rows.length) + ' hàng × 16 cột, còn màu đỏ');
ok(m1 && m1.dy < 0 && m1.dy + m1.rows.length <= 1, 'mũ thu nhỏ vẫn nằm trên đầu (dy ' + (m1 && m1.dy) + ')');
const thin = ['....................', '....................', '....................', '....................', 'kkkkkkkkkkkkkkkkkkkk', '....................', '....................', '....................'];
const m2 = L.miniWear(thin, -5, 'head');
ok(m2 && m2.rows.some((r) => (r.match(/k/g) || []).length >= 12), 'nét ngang 1 ô vẫn còn sau khi thu nhỏ');
ok(L.miniWear(new Array(8).fill('.'.repeat(20)), -5, 'head') === null, 'hình trống → không vẽ gì');
const face = new Array(9).fill('.'.repeat(20)); face[2] = '...yyyyyyyyyyyyyy...';
const m3 = L.miniWear(face, 3, 'face');
ok(m3 && m3.dy >= 2 && m3.dy <= 7 && /y/.test(m3.rows.join('')), 'đồ trên màn hình (14 × 9) → màn hình nhỏ 10 × 6 (dy ' + (m3 && m3.dy) + ')');
const neck = ['rrrrrrrrrrrrrrrrrrrr', 'RRRRRRRRRRRRRRRRRRRR', '....................', '....................', '....................'];
const m4 = L.miniWear(neck, 12, 'neck');
ok(m4 && m4.dy >= 8 && m4.dy <= 10, 'đồ ở cổ → cổ StackChan nhỏ (dy ' + (m4 && m4.dy) + ')');
ok(L.miniWear(hat, -5, 'tail') === null && L.miniWear([], -5, 'head') === null, 'chỗ lạ / hàng rỗng → null');

console.log('== StackChan sinh hoạt vẽ đồ đang mặc');
const count = (hex) => drawn.filter((d) => String(d[4]).toLowerCase() === hex).length;
drawn = []; L.preview(ctx, 1, 0, 10, {});
const plain = drawn.length;
drawn = []; const up = L.preview(ctx, 1, 0, 10, { head: 'w1' });
ok(count('#ff4f6d') >= 10 && up >= 3, 'mặc mũ tự vẽ: có điểm ảnh đỏ, mũ nhô ' + up + ' hàng (để vùng bấm cao thêm)');
drawn = []; L.preview(ctx, 1, 0, 10, { head: 'straw', face: 'glasses', neck: 'scarf' });
ok(count('#f5b971') >= 10 && count('#e9b949') >= 6 && count('#ff4f6d') >= 6, 'Mũ rơm + Kính tròn + Khăn quàng: đủ ba món');
drawn = []; L.preview(ctx, 1, 0, 10, { shell: 'w2' });
ok(count('#3ccb5e') >= 10 && drawn.length >= plain, 'vỏ tự vẽ: thân xanh lá');
drawn = []; L.preview(ctx, 1, 0, 10, { shell: 'gold' });
ok(count('#ffe58a') >= 10, 'vỏ có sẵn (Vỏ vàng kim)');
drawn = []; L.preview(ctx, 1, 0, 10, { shell: { hex: ['#c77dff', '#7b2cbf'] }, head: { rows: hat, dy: -5 } });
ok(count('#c77dff') >= 10 && count('#ff4f6d') >= 10, 'Xưởng đang xem trước (vỏ tím + mũ chưa lưu)');
drawn = []; L.preview(ctx, 1, 0, 10, { head: 'w404' });
ok(drawn.length === plain, 'món tự vẽ chưa đồng bộ tới máy này: vẽ như không mặc');
['sit', 'read', 'eat', 'stretch', 'pray', 'wave', 'cook', 'walk'].forEach((pose) => {
  drawn = []; L.preview(ctx, 1, 0, 10, { head: 'crown' }, pose);
  ok(count('#ffd23f') >= 6, 'tư thế ' + pose + ': đội Vương miện');
});

console.log('== linh vật góc trái (fx.js)');
data.wallet.wear.on = { neck: 'bow' };
data.wallet.more.mywear.on = { head: 'w1', shell: 'w2' };
const on = F.lib.wearOn();
ok(on.head === 'w1' && on.neck === 'bow' && on.shell === 'w2', 'wearOn gộp đồ có sẵn + tự vẽ: ' + JSON.stringify(on));
ok(JSON.stringify(F.lib.shellOf('w2')) === JSON.stringify(['#3ccb5e', '#2e8b3a']) && F.lib.shellOf('nope') === null && F.lib.shellOf({ hex: ['#1', '#2'] })[0] === '#1', 'shellOf: tự vẽ / lạ / đang xem trước');
drawn = []; F.lib.paintFace(ctx, 1, 'idle', 1000, 0, on);
ok(count('#ff4f6d') >= 38 && count('#3ccb5e') >= 1, 'linh vật: mũ đỏ tự vẽ (' + count('#ff4f6d') + ' điểm ảnh) + vỏ xanh lá (thân tô một khối)');
drawn = []; F.lib.paintFace(ctx, 1, 'idle', 1000, 0, { head: 'w1' });
const redRows = drawn.filter((d) => d[4] === '#ff4f6d').map((d) => d[1]);
ok(Math.min.apply(null, redRows) === 1 + -5 + 1 && Math.max.apply(null, redRows) === 1 + -5 + 4, 'mũ vẽ đúng hàng (đỉnh hộp ở hàng 1, mũ từ hàng −5)');
drawn = []; F.lib.paintFace(ctx, 1, 'cool', 1000, 0, { face: { rows: face, dy: 3 } });
ok(count('#ffd23f') === 0, 'biểu cảm Kính ngầu thay đồ trên mặt (như đồ có sẵn)');
data.catalog.mywears = [{ id: 'w1', slot: 'head', rows: hat.map((r) => r.replace(/r/g, 'd')), dy: -5, px: 'x2' }, data.catalog.mywears[1]];
drawn = []; F.lib.paintFace(ctx, 1, 'idle', 1000, 0, { head: 'w1' });
ok(count('#3d8bff') >= 30 && count('#ff4f6d') === 0, 'món vừa vẽ lại (danh mục mới): vẽ hình mới, không dùng hình cũ trong bộ nhớ đệm (' + count('#3d8bff') + ' / ' + count('#ff4f6d') + ')');

const bad = results.filter((x) => !x).length;
console.log(bad ? 'KẾT QUẢ: ' + bad + ' mục trượt' : 'KẾT QUẢ: TẤT CẢ OK (' + results.length + ')');
process.exit(bad ? 1 : 0);
