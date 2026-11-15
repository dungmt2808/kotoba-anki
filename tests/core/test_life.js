// 1.30: web/life.js chạy trong node (không trình duyệt) — chọn việc theo giờ / thời tiết / đồ đã đặt, ưu tiên trong nhà,
// đêm có giường thì chỉ ngủ, chỗ đứng theo món đồ, toạ độ cả nhà ↔ từng gian, báo Python một lần mỗi ngày khi người dùng
// đã thấy ≥ 1,5 giây, "Gọi về đây", bấm trúng StackChan, mọi tư thế / đồ cầm tay vẽ được, tắt chung với thú nuôi.
// Chạy: node test_life.js ADDON
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ADDON = process.argv[2];
global.window = global;
const els = {};
global.document = { hidden: false, getElementById: (id) => els[id] || null, addEventListener() {}, createElement: () => ({ getContext: () => ctx, setAttribute() {}, appendChild(c) { return c; }, addEventListener() {}, style: {}, classList: { toggle() {} } }) };
const sky = { hour: 10, rain: 0, snow: 0 };
global.GardenSky = { state: () => sky };
let uiPets = 'on', mainScene = 'house';
global.GardenUI = { get: (k) => (k === 'pets' ? uiPets : 'full') };
global.GardenHome = { mainScene: () => mainScene };
const drawn = [];
const ctx = { fillRect(x, y, w, h) { drawn.push([x, y, w, h, this.fillStyle]); }, save() {}, restore() {}, beginPath() {}, rect() {}, clip() {}, canvas: { width: 4000 }, set globalAlpha(v) {}, get globalAlpha() { return 1; } };
eval(fs.readFileSync(path.join(ADDON, 'web', 'life.js'), 'utf8').replace('var GardenLife', 'global.GardenLife'));
const L = global.GardenLife;
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };

// danh mục thật từ life_core.py (python) để hai bên luôn khớp
const py = `import sys, json
sys.path.insert(0, sys.argv[1])
import life_core as L
print(json.dumps(L.defs_view()))`;
const defs = JSON.parse(execFileSync('python3', ['-c', py, ADDON], { encoding: 'utf8' }));
const all = Object.keys(defs);
const can = {
  room: all.filter((k) => defs[k].where === 'home' && !['neru', 'ryouri', 'taberu', 'gohan', 'arau', 'oyatsu', 'kagami', 'kigaeru', 'hirune', 'kotatsu'].includes(k)),
  kitchen: ['ryouri', 'taberu', 'gohan', 'arau', 'oyatsu', 'souji', 'mado', 'taisou', 'shinbun', 'ame'],
  bedroom: ['neru', 'kagami', 'kigaeru', 'hirune', 'souji', 'mado', 'taisou', 'shinbun', 'ame'],
  yard: all.filter((k) => defs[k].where === 'yard'),
  beach: all.filter((k) => defs[k].where === 'beach'),
  onsen: all.filter((k) => defs[k].where === 'onsen'),
};
const data = { life: { defs: defs, can: can, today: '2026-11-13' }, wallet: { home: { house: 7 }, wear: { on: {} } }, catalog: { room_unlock: 5 } };
const sent = [];
L.init({ data: () => data, send: (c) => sent.push(c) });
// chỗ các món đồ (toạ độ gian / cảnh) như spotsFor của home.js
const ITEMS = {
  bedroom: [{ id: 'beddo', cx: 32, top: 55, bottom: 71, w: 32, left: 16, right: 48 }, { id: 'kyodai', cx: 72, top: 33, bottom: 55, w: 15, left: 64, right: 79 }],
  kitchen: [{ id: 'nagashi', cx: 48, top: 36, bottom: 55, w: 32, left: 32, right: 64 }, { id: 'shokutaku', cx: 64, top: 73, bottom: 87, w: 30, left: 49, right: 79 }],
  room: [{ id: 'desk', cx: 40, top: 41, bottom: 55, w: 16, left: 32, right: 48 }, { id: 'calendar', cx: 120, top: 12, bottom: 28, w: 12, left: 114, right: 126 }, { id: 'tea', cx: 104, top: 44, bottom: 55, w: 12, left: 98, right: 110 }],
  yard: [{ id: 'bench', cx: 104, top: 31, bottom: 44, w: 16, left: 96, right: 112 }],
  onsen: [{ id: 'rotenburo', cx: 128, top: 44, bottom: 60, w: 32, left: 112, right: 144 }],
};
const spots = (ids, sc) => (ITEMS[sc] || []).filter((s) => ids === '*' || ids.indexOf(s.id) >= 0);
const opts = (seen) => ({ spots: spots, seen: !!seen });
const T0 = Date.UTC(2026, 10, 13, 3, 0, 0), SLOT = 180000;

console.log('== việc làm được theo giờ / thời tiết');
const ids = (h, o) => { sky.hour = h; sky.rain = (o && o.rain) || 0; sky.snow = (o && o.snow) || 0; return L._candidates().map((c) => c.id + '@' + c.scene); };
ok(ids(23).join(',') === 'neru@bedroom' && ids(2).join(',') === 'neru@bedroom', 'đêm có giường: chỉ có Ngủ ở Phòng ngủ');
ok(ids(7).includes('ryouri@kitchen') && ids(7).includes('ocha@room') && !ids(7).includes('neru@bedroom'), '7 giờ: nấu ăn, pha trà, không ngủ');
ok(ids(15, { rain: 1 }).includes('ame@room') && !ids(15).includes('ame@room'), 'nghe mưa chỉ khi trời mưa');
ok(!ids(12, { rain: 1 }).includes('oyogu@beach') && ids(12).includes('oyogu@beach'), 'tắm biển chỉ khi trời tạnh');
ok(ids(10, { snow: 1 }).includes('yukidaruma@yard') && !ids(10).includes('yukidaruma@yard'), 'đắp người tuyết chỉ khi có tuyết');
ok(!ids(9).includes('souji@kitchen') && !ids(9).includes('souji@bedroom') && ids(9).includes('souji@room'), 'việc trong nhà không cần đồ: chỉ tính ở phòng chính (khỏi nhân ba)');
ok(ids(20).includes('onsen@onsen') && !ids(12).includes('onsen@onsen'), 'tắm suối: sáng sớm / chiều tối');

console.log('== chọn theo khung 3 phút, ưu tiên trong nhà');
sky.hour = 10; sky.rain = 0; sky.snow = 0;
const realNow = Date.now;
let home = 0, n = 0; const seenIds = {};
for (let s = 0; s < 1500; s++) {
  Date.now = () => T0 + s * SLOT + 1000;
  const a = L._current(), b = L._current();
  if (a.key !== b.key) { ok(false, 'cùng khung phải ra cùng việc'); break; }
  n++; seenIds[a.id] = 1;
  if (defs[a.id] && defs[a.id].where === 'home') { home++; }
}
ok(home / n > 0.6, 'ưu tiên trong nhà: ' + (home / n * 100).toFixed(0) + '% số khung ở trong nhà');
ok(Object.keys(seenIds).length >= 8, 'nhiều việc khác nhau trong buổi sáng (' + Object.keys(seenIds).length + ')');
Date.now = () => T0 + 5 * SLOT + 10; const k1 = L._current().key; Date.now = () => T0 + 5 * SLOT + SLOT - 10;
ok(L._current().key === k1, 'suốt một khung không đổi việc');
sky.hour = 23;
for (let s = 0; s < 50; s++) { Date.now = () => T0 + s * SLOT; if (L._current().id !== 'neru') { ok(false, 'đêm phải ngủ'); } }
ok(true, 'đêm: 50 khung liền đều Ngủ');
const canSave = data.life.can;
data.life.can = { yard: ['hoshi'] }; sky.hour = 3;
ok(L._current().id === '' && L._current().scene === 'room', 'không có việc nào (3 giờ sáng, không giường): nghỉ ở phòng chính');
data.wallet.home.house = 2;
ok(L._current().scene === 'yard', 'chưa có nhà: nghỉ ngoài sân');
data.wallet.home.house = 7; data.life.can = canSave;

console.log('== đi tới món đồ, toạ độ cả nhà ↔ gian');
Date.now = realNow;
let now = 1e6;
const frame = (scene, seen, dtMs) => { now += dtMs || 100; return L.place(scene, now, sky, opts(seen)); };
const arrive = (scene) => { frame(scene); for (let i = 0; i < 600 && L._actor().phase !== 'do'; i++) { frame(scene); } };
sky.hour = 23;
L._force('neru', 'bedroom');
ok(frame('yard').length === 0, 'đang ở trong nhà: không vẽ ngoài sân');
ok(frame('kitchen').length === 0 && frame('room').length === 0, 'ngủ ở Phòng ngủ: không vẽ ở Bếp / phòng chính');
let e = frame('bedroom');
for (let i = 0; i < 400 && L._actor().phase !== 'do'; i++) { e = frame('bedroom'); }
const A = L._actor();
ok(A.phase === 'do' && A.mode === 'bed' && A.item === 'beddo', 'tới giường rồi ngủ (mode bed)');
ok(e.length === 1 && e[0].life && Math.abs(e[0].lx - 32) < 1 && Math.abs(A.x - (312 + 32)) < 1, 'toạ độ cả nhà 344 = Phòng ngủ 312 + 32');
ok(e[0].base > 71, 'vẽ sau cái giường (nằm trên giường)');
drawn.length = 0; L.draw(ctx, 2, 0, 0, e[0], now);
ok(drawn.length > 20 && drawn.every((d) => d.every((v, i) => i === 4 || Number.isFinite(v))), 'vẽ đầu trên gối, không có toạ độ NaN');
sky.hour = 7; L._force('ryouri', 'kitchen');
for (let i = 0; i < 600 && !(L._actor().phase === 'do' && L._actor().act === 'ryouri'); i++) { frame('kitchen'); frame('room'); frame('bedroom'); }
const B = L._actor();
ok(B.phase === 'do' && B.loc === 'kitchen' && B.item === 'nagashi' && B.x < 32 && B.dir === 1, 'đi bộ từ Phòng ngủ sang Bếp, đứng bên trái bếp (chỗ cái nồi), quay mặt vào');
// 1.30: chuyển bồn rửa sang ô khác (lệnh home:move) → rethink() → StackChan đi tới chỗ mới, không đứng lại cạnh chỗ cũ
const sinkOld = Object.assign({}, ITEMS.kitchen[0]);
Object.assign(ITEMS.kitchen[0], { cx: 96, left: 80, right: 112 });
L.rethink();
ok(L._actor().phase === 'seek', 'rethink(): tìm lại chỗ đứng của việc đang làm');
for (let i = 0; i < 600 && L._actor().phase !== 'do'; i++) { frame('kitchen'); }
const B2 = L._actor();
ok(B2.phase === 'do' && B2.act === 'ryouri' && Math.abs(B2.x - B.x) > 30 && B2.x >= 60, 'bồn rửa đổi ô → StackChan đi theo (x ' + Math.round(B.x) + ' → ' + Math.round(B2.x) + ')');
Object.assign(ITEMS.kitchen[0], sinkOld);
L.rethink(); for (let i = 0; i < 600 && L._actor().phase !== 'do'; i++) { frame('kitchen'); }
ok(Math.abs(L._actor().x - B.x) < 1, 'chuyển về ô cũ → về đúng chỗ cũ');
L._force('karenda', 'room');
for (let i = 0; i < 600 && !(L._actor().phase === 'do' && L._actor().act === 'karenda'); i++) { frame('room'); }
ok(L._actor().y >= 52 && Math.abs(L._actor().x - (148 + 120)) < 20, 'đồ treo tường: đứng dưới sàn, ngay bên dưới');
L._force('onsen', 'onsen'); mainScene = 'onsen'; sky.hour = 20;
arrive('onsen');
ok(L._actor().mode === 'tub' && L._actor().item === 'rotenburo', 'có bồn đá: ngâm trong bồn');
drawn.length = 0; L.draw(ctx, 2, 0, 0, frame('onsen')[0], now);
ok(drawn.length > 20 && drawn.every((d) => d.slice(0, 4).every(Number.isFinite)), 'vẽ được tư thế tắm');
ITEMS.onsen = [];
L._force('yuki', 'onsen'); frame('onsen'); L._force('onsen', 'onsen');
arrive('onsen');
ok(L._actor().mode === 'house', 'không có bồn đá: vào nhà tắm (ló đầu ở cửa sổ)');
L._force('oyogu', 'beach'); sky.hour = 12;
arrive('beach');
const xs = []; for (let i = 0; i < 80; i++) { frame('beach', false, 500); xs.push(L._actor().x); }
ok(L._actor().mode === 'sea' && Math.max(...xs) - Math.min(...xs) > 20 && Math.min(...xs) > 100, 'bơi qua lại ngoài biển');
L._force('benchi', 'yard');
arrive('yard');
drawn.length = 0; L.draw(ctx, 2, 0, 0, frame('yard')[0], now);
ok(L._actor().mode === 'on' && drawn.length > 20 && drawn.every((d) => d.slice(0, 4).every(Number.isFinite)), 'ngồi lên ghế gỗ (toạ độ hợp lệ)');

console.log('== báo Python khi người dùng đã thấy');
sent.length = 0; Object.keys(L._told).forEach((k) => delete L._told[k]);
sky.hour = 8; L._force('ocha', 'room');
for (let i = 0; i < 40; i++) { const en = frame('room', true); if (en.length) { L.draw(ctx, 2, 0, 0, Object.assign(en[0], { seen: true }), now); } if (L._actor().phase === 'do') { break; } }
ok(sent.length === 0 || L._actor().phase === 'do', 'đang đi tới: chưa báo');
sent.length = 0; L._force('ocha', 'room'); L._force('mado', 'room'); L._force('ocha', 'room');
arrive('room');
for (let i = 0; i < 10; i++) { const en = frame('room', false, 200); L.draw(ctx, 2, 0, 0, en[0], now); }
ok(sent.length === 0, 'cảnh không hiện cho người dùng (seen = false): không báo');
for (let i = 0; i < 6; i++) { const en = frame('room', true, 200); L.draw(ctx, 2, 0, 0, en[0], now); }
ok(sent.length === 0, 'thấy 1,2 giây: chưa báo');
for (let i = 0; i < 4; i++) { const en = frame('room', true, 200); L.draw(ctx, 2, 0, 0, en[0], now); }
ok(sent.join() === 'life:seen:ocha:room', 'thấy ≥ 1,5 giây: báo life:seen:ocha:room');
for (let i = 0; i < 30; i++) { const en = frame('room', true, 200); L.draw(ctx, 2, 0, 0, en[0], now); }
ok(sent.length === 1, 'cùng ngày không báo lại');
data.life.today = '2026-11-14';
for (let i = 0; i < 12; i++) { const en = frame('room', true, 200); L.draw(ctx, 2, 0, 0, en[0], now); }
ok(sent.length === 2, 'sang ngày mới: báo lại một lần');
global.document.hidden = true; data.life.today = '2026-11-15';
for (let i = 0; i < 12; i++) { const en = frame('room', true, 200); L.draw(ctx, 2, 0, 0, en[0], now); }
ok(sent.length === 2, 'cửa sổ đang ẩn: không báo');
global.document.hidden = false;
L._force('', 'room');
arrive('room');
for (let i = 0; i < 20; i++) { const en = frame('room', true, 200); L.draw(ctx, 2, 0, 0, en[0], now); }
ok(sent.length === 2, 'đang nghỉ (không có việc): không báo gì');

console.log('== gọi về đây, bấm trúng, tắt');
L._force(null); sky.hour = 12; mainScene = 'beach';
L.call('beach');
ok(defs[L._current().id].where === 'beach', 'gọi ra Bãi biển: làm một việc ở Bãi biển (' + L._current().id + ')');
sky.hour = 2; ok(L._current().id === '' && L._current().scene === 'beach', 'giờ không có việc gì ở đó: tới rồi nghỉ');
L.call('house'); sky.hour = 23;
ok(L._current().id === 'neru', 'gọi về nhà lúc khuya: đi ngủ');
ok(L._invite().until - Date.now() <= 240000, 'lời gọi hết hạn sau vài phút');
L._force('ocha', 'room'); sky.hour = 8; mainScene = 'house';
arrive('room');
L.draw(ctx, 2, 0, 0, frame('room')[0], now);
const bx = L._box();
ok(L.at('room', bx.x + 8, bx.y + 8) && L.at('house', bx.x + 148 + 8, bx.y + 8) && !L.at('house', bx.x + 8, bx.y + 8) && !L.at('yard', bx.x + 8, bx.y + 8),
  'bấm trúng: toạ độ gian và toạ độ cả nhà (lệch 148)');
ok(L.where().name === 'Pha trà' && L.where().scene === 'room', 'where(): Pha trà ở phòng chính');
uiPets = 'off';
ok(frame('room').length === 0, 'tắt thú nuôi & khách ở ⚙: StackChan cũng không hiện');
uiPets = 'on';

console.log('== mọi tư thế / đồ cầm tay');
const PAL = 'ksSnwpadlyorgGbBtcmPv.';
let bad = [];
all.forEach((k) => {
  const d = defs[k];
  [0, 1].forEach((f) => {
    const rows = L._build(d.pose === 'sleep' ? 'sit' : d.pose, f, d.prop);
    if (!rows.length || rows.some((r) => r.length !== 24) || rows.some((r) => [...r].some((c) => PAL.indexOf(c) < 0))) { bad.push(k + '/' + f); }
  });
});
ok(!bad.length, 'mọi việc × 2 khung: lưới 24 cột, chỉ dùng màu có trong bảng' + (bad.length ? ' — lỗi: ' + bad.join(',') : ''));
const propIds = [...new Set(all.map((k) => defs[k].prop).filter(Boolean))].filter((p) => p !== 'towel' && p !== 'ring');
const noProp = propIds.filter((p) => L._build('hold', 0, p).join('') === L._build('hold', 0, '').join(''));
ok(!noProp.length, 'đồ cầm tay nào cũng có hình (' + propIds.length + ' món)' + (noProp.length ? ' — thiếu: ' + noProp.join(',') : ''));
ok(L._build('stand', 0, '').length === 16 && L._build('sit', 0, '').length === 14 && L._build('bath', 0, '').length === 13, 'đứng 16 hàng, ngồi 14 hàng, tắm / bơi chỉ có đầu');

// add-on test tắt StackChan cho kịch bản cũ (data.life.off): không chọn việc, không vẽ, sổ vẫn đọc được
L._force(null);
data.life.off = true;
ok(L._current() === null && frame('room').length === 0 && frame('yard').length === 0 && L.where() === null, 'data.life.off: không có StackChan ở cảnh nào, chip không có gì để hiện');
delete data.life.off;
ok(L._current() !== null, 'bỏ off: StackChan trở lại');

const pass = results.filter(Boolean).length;
console.log('\nKẾT QUẢ: ' + (pass === results.length ? 'TẤT CẢ OK (' + pass + ')' : (results.length - pass) + ' LỖI / ' + results.length));
process.exit(pass === results.length ? 0 : 1);
