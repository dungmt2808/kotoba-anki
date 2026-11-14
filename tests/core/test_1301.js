// 1.30.1 (node, không trình duyệt): người dùng "mấy con thú có chạy ngang hẳn qua nhà luôn, nhìn không hợp lý".
//  - Khách đi bộ / nhảy (mèo hoang, cáo, hươu, chim sẻ…) vào và về bằng mép phải của phần cảnh đang thấy: không lần nào
//    chân khách nằm trong khoảng nhà / công trình (x 0–66) lúc đi, ở cả sân trong bảng Nhà (rộng 256) lẫn dải cảnh màn chính
//    rộng hơn; chim bay vẫn bay vào từ hai phía.
//  - Thú trong nhà (cả nhà 3 gian ở màn chính) đi dạo trong gian đang ở, chỉ thỉnh thoảng sang gian bên; gian chưa mở rộng
//    (tối) thì không bao giờ vào.
// Chạy: node test_1301.js ADDON
const fs = require('fs');
const path = require('path');
const ADDON = process.argv[2];
global.window = global;
eval(fs.readFileSync(path.join(ADDON, 'web', 'guests.js'), 'utf8').replace('var GardenGuests', 'global.GardenGuests'));
eval(fs.readFileSync(path.join(ADDON, 'web', 'pets.js'), 'utf8').replace('var GardenPets', 'global.GardenPets'));
const G = global.GardenGuests, P = global.GardenPets;
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const DAY = { tod: 'day', rain: 0, snow: 0 };
const SLOT = 240000, T0 = Date.UTC(2026, 10, 14, 3, 0, 0);

console.log('== khách đi bộ không đi ngang qua nhà');
const kinds = { neko: 'walk', tanuki: 'walk', kitsune: 'walk', shika: 'walk', okojo: 'walk', tsuru: 'walk', suzume: 'hop', kaeru: 'hop', cho: 'fly' };
const defs = {};
Object.keys(kinds).forEach((id) => { defs[id] = { kind: kinds[id], tod: ['day'], wx: 'any', spot: [] }; });
const data = { guests: { defs: defs, rate: 1, today: '2026-11-14', cand: { yard: Object.keys(kinds).map((id) => [id, 5]) } } };
G.init({ data: () => data, send: () => {} });
const HOUSE_X1 = 66;                // nhà / công trình: cột 0–3 (x 0–64) + viền
let walkers = 0, inHouse = 0, enterLeft = 0, exitLeft = 0, flyLeft = 0, flyRight = 0;
for (const visTo of [256, 470]) {           // bảng Nhà (sân 256) · dải cảnh màn chính 1920 px (mép phải x ≈ 470)
  for (let s = 0; s < 120; s++) {
    G._clear('yard');
    const realNow = Date.now;
    let t = T0 + s * SLOT + 1000;
    Date.now = () => t;
    const w = G._want('yard', T0 + s * SLOT + SLOT * 0.5, DAY);
    if (!w) { Date.now = realNow; continue; }
    G._force('yard', w.id);
    Date.now = realNow;
    const a = G._vis('yard');
    const walker = kinds[a.id] === 'walk' || kinds[a.id] === 'hop';
    if (walker) { walkers++; if (a.x < 128) { enterLeft++; } } else if (kinds[a.id] === 'fly') { if (a.x < 0) { flyLeft++; } else { flyRight++; } }
    // đi vào, ở lại, rồi (khung sau không còn khách này) đi về
    for (let k = 0; k < 900; k++) {
      t += 100;
      const e = G.place('yard', t, DAY, { seen: false, visTo: visTo });
      if (!e.length) { break; }
      const g = e[0].a;
      if (walker && g.x >= 0 && g.x <= HOUSE_X1) { inHouse++; }
      if (k === 400) { g.forced = false; data.guests.rate = 0; }      // hết khung: khách đi về
      if (walker && g.act === 'leave' && g.dir < 0) { exitLeft++; }
    }
    data.guests.rate = 1;
  }
}
ok(walkers >= 40, 'mô phỏng đủ khách đi bộ / nhảy (' + walkers + ' lượt)');
ok(enterLeft === 0, 'khách đi bộ luôn vào từ mép phải (' + enterLeft + ' lần vào từ trái)');
ok(inHouse === 0, 'chân khách đi bộ không lần nào nằm trong khoảng nhà x 0–66 (' + inHouse + ' khung)');
ok(exitLeft === 0, 'lúc về đi ra mép phải, không quay ngang qua nhà (' + exitLeft + ' khung đi về bên trái)');
ok(flyLeft + flyRight > 0, 'chim bay vẫn bay vào (trái ' + flyLeft + ' · phải ' + flyRight + ')');
// dải cảnh rộng: khách hiện ra / biến mất ngoài mép phải đang thấy, không "hiện ra giữa đồng cỏ"
G._clear('yard');
{
  const realNow = Date.now; let t = T0 + 5000; Date.now = () => t;
  G._force('yard', 'neko'); Date.now = realNow;
  const e = G.place('yard', t, DAY, { seen: false, visTo: 470 });
  ok(e.length && e[0].a.x >= 470, 'dải cảnh rộng (mép phải 470): mèo hoang xuất hiện từ ngoài mép phải (x = ' + Math.round(e[0].a.x) + ')');
}

console.log('== thú trong nhà đi theo gian');
const SEG = { kitchen: [10, 134], room: [158, 298], bedroom: [322, 446] };
const segOf = (x) => (x <= 144 ? 'kitchen' : x <= 310 ? 'room' : 'bedroom');
function sim(rooms, ids, steps, t0, spots) {
  const d = { wallet: { home: { rooms: rooms }, more_view: { pets: ids.map((id) => ({ id: id, scene: 'room', state: 'full', tier: 0 })) } } };
  let t = t0, locked = 0, changes = 0, frames = 0, inPost = 0;
  const last = {};
  const realRandom = Math.random;
  let seed = 7; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  try {
    for (let k = 0; k < steps; k++) {
      t += 100;
      P.place(d, 'house', t, k % 3000 < 1500 ? DAY : { tod: 'night', rain: 0, snow: 0 }, spots || (() => [])).forEach((e) => {
        frames++;
        const sg = segOf(e.a.x);
        if (sg !== 'room' && rooms.indexOf(sg) < 0) { locked++; }
        if (e.a.act !== 'walk' && ((e.a.x > 136 && e.a.x < 156) || (e.a.x > 300 && e.a.x < 320))) { inPost++; }
        if (last[e.p.id] && last[e.p.id] !== sg) { changes++; }
        last[e.p.id] = sg;
      });
    }
  } finally { Math.random = realRandom; }
  return { locked: locked, changes: changes, frames: frames, inPost: inPost };
}
const r1 = sim([], ['shiba', 'neko', 'usagi'], 30000, T0);
ok(r1.frames > 0 && r1.locked === 0, 'nhà chưa mở rộng: không con nào vào Bếp / Phòng ngủ tối (' + r1.locked + ' khung)');
const r2 = sim(['kitchen', 'bedroom'], ['shiba', 'neko', 'usagi'], 30000, T0 + 86400000);      // đồng hồ đi tiếp (thú đã có lịch của lần trước)
ok(r2.locked === 0, 'đã mở rộng: đi được cả ba gian');
// 30.000 khung × 0,1 giây = 50 phút; trước 1.30.1 Shiba (đi 120 điểm ảnh một lượt) băng qua cột ngăn gian liên tục
ok(r2.changes > 0 && r2.changes < 90, 'thỉnh thoảng mới sang gian bên (' + r2.changes + ' lần trong 50 phút, 3 con)');
ok(r2.inPost === 0, 'không đứng / ngồi / ngủ ngay trên cột ngăn gian (' + r2.inPost + ' khung)');
// món ưa thích sát cột ngăn gian (thảm ở mép phải Bếp, gối ôm ở mép trái Phòng ngủ): thú tới cạnh món nhưng vẫn trong gian
const edge = (ids) => [{ id: 'rug', cx: 132, top: 70, bottom: 80, w: 24 }, { id: 'dakimakura', cx: 326, top: 72, bottom: 82, w: 16 }, { id: 'plant', cx: 300, top: 60, bottom: 80, w: 12 }]
  .filter((x) => ids.indexOf(x.id) >= 0);
const r3 = sim(['kitchen', 'bedroom'], ['neko', 'usagi', 'kame'], 30000, T0 + 2 * 86400000, edge);
ok(r3.inPost === 0 && r3.locked === 0, 'món ưa thích sát cột (ngày + đêm): thú nghỉ cạnh món, không trên cột (' + r3.inPost + ' khung)');

const pass = results.filter(Boolean).length;
console.log('KẾT QUẢ: ' + (pass === results.length ? 'TẤT CẢ OK (' + pass + ')' : pass + '/' + results.length));
process.exit(pass === results.length ? 0 : 1);
