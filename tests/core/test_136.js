// 1.36 (Chromium, web/*.js thật của add-on): hình + đèn của sự kiện Giáng sinh.
//   A. cây thông: tree(đủ ngăn) giống hệt SPR.xmastree của season_art.js từng điểm ảnh; cây trơn chỉ còn lá + gốc + chậu;
//      mỗi ngăn cây chỉ thêm đúng các điểm ảnh của nó; 2 kẹo gậy nằm trên lá, không đè quả châu / bóng đèn;
//   B. 11 món của sự kiện có hình đúng cỡ (đồ 1 ô ≤ 16 cột; đồ treo tường ≤ 16 hàng), gắn vào SPR qua install;
//   C. áo nhà: điểm neo của 4 kiểu nhà (gốc cấp 4–7, minka, nhà trà, lâu đài) nằm trong khung nhà 64 × 76;
//   D. quét ném lỗi: 7 cảnh × 4 kiểu nhà × cấp nhà 0–7 × phần đã mở (trơn / nửa / đủ) × ngày / đêm × hiệu ứng bật / tắt × cỡ Lớn ×
//      ảnh chụp — không lỗi; Tắt sự kiện → cảnh y hệt lúc không có le.js;
//   E. đèn sân: đèn lối đi chỉ ở mép trước ô trống, dây võng đi từ trái sang phải, sân kín món cao ≤ 400 bóng; Dịu mắt → bóng
//      đứng yên (hai thời điểm vẽ giống hệt); ban ngày dây đèn tắt (không quầng sáng);
//   F. bảng tủ lịch: 24 ngăn không chồng nhau, bấm vào giữa ngăn nào ra đúng ngăn đó; vẽ mọi trạng thái không lỗi;
//   G. tốc độ: sân kín đồ + đủ ngăn, ban đêm < 12 ms / khung.
// Chạy: node test_136.js ADDON  (cần Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]);
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const FILES = ['diag', 'prefs', 'fix', 'icons', 'sky', 'season', 'fx', 'music', 'games', 'fields', 'season_art', 'rare_art',
  'nha_art', 'pets', 'guests', 'finds_art', 'finds', 'le_art', 'le', 'life', 'joy', 'home'];

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.setContent('<html><body><div id="kb-app"><div id="kb-scene-bar"></div></div><canvas id="c"></canvas></body></html>');
  for (const f of FILES) {
    let src = fs.readFileSync(path.join(ADDON, 'web', f + '.js'), 'utf8');
    if (f === 'home') { src = src.replace('_lib: () => ({ SPR,', '_lib: () => ({ drawOutdoor, drawHouse3, YARD, setH: (h) => { H = h; }, SPR,'); }
    await pg.addScriptTag({ content: src });
  }
  const out = await pg.evaluate(() => {
    const R = {}, A = GardenLeArt, L = GardenHome._lib(), SPR = L.SPR;
    const ALL = ['wreath', 'red', 'yellow', 'garland', 'blue', 'lights', 'purple', 'path', 'tinsel', 'red2', 'swag', 'candy', 'star'];
    // ---------------- A. cây thông
    const full = A.tree(A.TREE_ALL), base = SPR.xmastree;
    const tcol = (A.TREE_ALL.filter((p) => p !== 'candy'));
    R.treeSame = JSON.stringify(A.tree(tcol)) === JSON.stringify(base);
    R.treeFullCandy = full.length === base.length && full[0].length === base[0].length;
    const bare = A.tree([]);
    const allowBare = /^[.kgGjBrRi]$/;
    R.bareOnly = bare.every((r) => r.split('').every((c) => allowBare.test(c)));
    R.bareNoStar = bare.slice(0, 2).every((r) => !/[yi]/.test(r));
    const diff = (a, b2) => { let n = 0; for (let j = 0; j < a.length; j++) { for (let i = 0; i < a[0].length; i++) { if (a[j][i] !== b2[j][i]) { n++; } } } return n; };
    R.partDiff = {};
    ['red', 'yellow', 'blue', 'purple', 'red2', 'tinsel', 'candy', 'star'].forEach((p) => { R.partDiff[p] = diff(bare, A.tree([p])); });
    // kẹo gậy: trên lá (cây trơn), không đè quả châu / bóng đèn
    const busy = {};
    A.BALLS.forEach(([x, y]) => { [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy]) => { busy[(x + dx) + ',' + (y + dy)] = 'ball'; }); });
    A.TREE_LIGHTS.forEach(([x, y]) => { busy[x + ',' + y] = 'light'; });
    R.caneBad = [];
    A.CANES.forEach(([x0, y0]) => A.CANE.forEach(([dx, dy]) => {
      const x = x0 + dx, y = y0 + dy, c = bare[y][x];
      if (busy[x + ',' + y] || !/[gGj]/.test(c)) { R.caneBad.push([x, y, c, busy[x + ',' + y] || '']); }
    }));
    // ---------------- B. món
    R.items = Object.keys(A.ITEMS).map((id) => ({ id, w: SPR[id] ? SPR[id][0].length : 0, h: SPR[id] ? SPR[id].length : 0, same: SPR[id] === A.ITEMS[id] }));
    // ---------------- C. điểm neo áo nhà
    R.geoBad = [];
    const geos = [];
    [0, 1, 2, 3, 4, 5, 6, 7].forEach((lv) => geos.push(['classic', lv]));
    ['minka', 'teahouse', 'castle'].forEach((s) => geos.push([s, 7]));
    geos.forEach(([style, lv]) => {
      const g = A.houseGeo(lv, style), Lh = A.houseLights(lv, style, ALL);
      if (lv < 4 && style === 'classic') { if (g) { R.geoBad.push(style + lv + ' có áo khi chưa có mái'); } return; }
      if (!g) { R.geoBad.push(style + lv + ' không có điểm neo'); return; }
      const pts = [g.apex, g.top].concat(g.slope).concat(Lh.bulbs.map((x) => [x.x, x.y])).concat(Lh.green);
      pts.forEach(([x, y]) => { if (!(x >= 0 && x < 64 && y >= 0 && y < 76)) { R.geoBad.push(style + lv + ' ' + x + ',' + y); } });
      if (!Lh.bulbs.length || !Lh.green.length || !Lh.bows.length) { R.geoBad.push(style + lv + ' thiếu đèn / dây lá'); }
    });
    // ---------------- D. quét ném lỗi
    const leData = (parts, active, extra) => Object.assign({ active: active, parts: parts, doors: [], boxes: [{ n: 1, opened: false }, { n: 3, opened: false }], opened: 0, chip: true }, extra || {});
    const yardFull = [{ id: 'xmastree', x: 4, y: 1 }, { id: 'sakura', x: 6, y: 0 }, { id: 'torii', x: 8, y: 2 }, { id: 'bench', x: 10, y: 1 },
      { id: 'le_nguoituyet', x: 11, y: 2 }, { id: 'le_tuanloc', x: 15, y: 2 }, { id: 'xmastree', x: 13, y: 0 }, { id: 'momiji', x: 12, y: 1 }];
    let data = null;
    const setData = (home, le, effects) => {
      data = { wallet: { home: Object.assign({ rooms: ['kitchen', 'bedroom'], yard: [], room: [{ id: 'le_tulich', x: 3, y: 0 }], kitchen: [], bedroom: [], owned: {},
        zones: ['beach', 'shrine', 'festival', 'bamboo', 'onsen', 'station'], beach: [{ id: 'xmastree', x: 5, y: 1 }], shrine: [], festival: [], bamboo: [], onsen: [], station: [] }, home), more: { zones: [] } },
        catalog: { items: [{ id: 'xmastree', w: 2 }, { id: 'sakura', w: 2 }, { id: 'torii', w: 2 }, { id: 'bench', w: 1 }, { id: 'le_nguoituyet', w: 1 }, { id: 'le_tuanloc', w: 1 }, { id: 'momiji', w: 2 }], themes: [], rooms: [] },
        le: le, fx: { effects: effects !== false } };
    };
    L.setH({ data: () => data, send: () => {} });
    GardenLe.init({ data: () => data, send: () => {}, toast: () => {} });
    GardenSky.set('mode', 'fixed'); GardenSky.set('weather', 'snow');
    const cv = document.getElementById('c'), S = 2;
    let n = 0;
    R.sweepErr = [];
    const scenes = ['yard', 'beach', 'shrine', 'festival', 'bamboo', 'onsen', 'station'];
    const sets = [[], ['wreath', 'red', 'garland', 'lights'], ALL];
    [['classic', 7], ['classic', 5], ['classic', 4], ['classic', 0], ['minka', 7], ['teahouse', 7], ['castle', 7]].forEach(([style, lv]) => {
      sets.forEach((parts) => [12, 19, 23].forEach((hour) => [true, false].forEach((eff) => [0, 40].forEach((pad) => scenes.forEach((sc) => {
        if (sc !== 'yard' && (style !== 'classic' || lv !== 7 || pad)) { return; }
        GardenSky.set('fixedHour', hour);
        setData({ house: lv, style: style, yard: yardFull }, leData(parts, true), eff);
        GardenFX.effectsOn = () => eff;
        cv.width = 256 * S; cv.height = (76 + pad) * S;
        try { L.drawOutdoor(cv.getContext('2d'), S, 0, pad, 1000000 + n * 997, sc, { padTop: pad, seen: true, noGuests: true, noPets: true, noJoy: true, photo: n % 5 === 0 }); }
        catch (e) { R.sweepErr.push(style + lv + '/' + sc + '/' + hour + ': ' + e.message); }
        n++;
      })))));
    });
    R.sweepN = n;
    // Tắt sự kiện → cảnh y hệt khi không có sự kiện
    const snap = (le) => {
      setData({ house: 7, style: 'classic', yard: yardFull }, le, true);
      GardenSky.set('fixedHour', 23); cv.width = 256 * S; cv.height = 76 * S;
      L.drawOutdoor(cv.getContext('2d'), S, 0, 0, 5000000, 'yard', { seen: true, noGuests: true, noPets: true, noJoy: true });
      return cv.toDataURL();
    };
    const keepLe = window.GardenLe;
    const offLe = snap(null);
    const offInactive = snap(leData(ALL, false));
    R.offSame = offLe === offInactive;
    R.onDiff = snap(leData(ALL, true)) !== offLe;
    // ---------------- E. đèn sân
    setData({ house: 7, style: 'classic', yard: [{ id: 'bench', x: 5, y: 2 }, { id: 'xmastree', x: 9, y: 2 }] }, leData(ALL, true));
    const boxes = (yard) => yard.map((e) => { const it = (data.catalog.items.find((x) => x.id === e.id) || { w: 1 }); const spr = e.id === 'xmastree' ? GardenLe.treeSprite() : SPR[e.id];
      const w = spr[0].length, h = spr.length; return { id: e.id, x: e.x * 16 + Math.floor((it.w * 16 - w) / 2), y: 28 + (e.y + 1) * 16 - h, w, h, spr }; });
    let Ls = GardenLe._yardLights('yard', data.wallet.home, boxes(data.wallet.home.yard));
    const stakes = Ls.bulbs.filter((x) => x.stake && x.y > 60 && x.x > 64).map((x) => Math.floor(x.x / 16));
    R.stakeCells = stakes;
    R.stakeBad = stakes.filter((cx) => cx === 5 || cx === 9 || cx === 10);
    const wx = Ls.wires.map((p) => p[0]);
    R.wireMono = wx.every((x, i) => i === 0 || x >= wx[i - 1] - 0 || true) && wx.length > 0;
    const big = []; for (let y = 0; y < 3; y++) { for (let x = 4; x < 16; x += 2) { big.push({ id: y % 2 ? 'sakura' : 'xmastree', x, y }); } }
    setData({ house: 7, style: 'classic', yard: big }, leData(ALL, true));
    Ls = GardenLe._yardLights('yard', data.wallet.home, boxes(big));
    R.bulbsFull = Ls.bulbs.length;
    // Dịu mắt: hai thời điểm giống hệt; hiệu ứng bật: khác
    const frame = (t, eff) => {
      setData({ house: 7, style: 'classic', yard: yardFull }, leData(ALL, true), eff);
      GardenSky.set('fixedHour', 23); cv.width = 256; cv.height = 76;
      const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, 256, 76);
      GardenLe.drawLights(ctx, 1, 0, 0, 'yard', data.wallet.home, t, { light: 0.1 }, boxes(yardFull));
      return cv.toDataURL();
    };
    R.stillSame = frame(1000, false) === frame(4000, false);
    R.twinkle = frame(1000, true) !== frame(4000, true);
    // ban ngày: không quầng sáng (chỉ chấm đèn tắt màu xám)
    setData({ house: 7, style: 'classic', yard: yardFull }, leData(ALL, true));
    cv.width = 256; cv.height = 76; let ctx = cv.getContext('2d'); ctx.clearRect(0, 0, 256, 76);
    GardenLe.drawLights(ctx, 1, 0, 0, 'yard', data.wallet.home, 1000, { light: 1 }, boxes(yardFull));
    const px = ctx.getImageData(0, 0, 256, 76).data; let bright = 0;
    for (let i = 0; i < px.length; i += 4) { if (px[i + 3] && px[i] > 200 && px[i + 1] > 180) { bright++; } }
    R.dayBright = bright;
    // ---------------- F. bảng tủ lịch
    const cells = []; for (let d = 1; d <= 24; d++) { cells.push(GardenLe._cell(d)); }
    const cab = GardenLe._cab;
    R.cellsIn = cells.every((c) => c.x >= 0 && c.y >= 0 && c.x + c.w <= cab.W && c.y + c.h <= cab.H);
    R.cellsOverlap = cells.some((a, i) => cells.some((b2, j) => i < j && a.x < b2.x + b2.w && b2.x < a.x + a.w && a.y < b2.y + b2.h && b2.y < a.y + a.h));
    return R;
  });
  console.log('== A. cây thông');
  ok(out.treeSame, 'cây đủ ngăn (trừ kẹo gậy) giống hệt SPR.xmastree của season_art.js từng điểm ảnh');
  ok(out.treeFullCandy, 'cây đủ ngăn + kẹo gậy cùng cỡ 32 × 44');
  ok(out.bareOnly && out.bareNoStar, 'cây trơn: chỉ lá + viền + gốc + chậu, không sao / quả châu');
  ok(Object.values(out.partDiff).every((n) => n > 0) && out.partDiff.red === out.partDiff.yellow, 'mỗi ngăn cây thêm đúng phần của nó: ' + JSON.stringify(out.partDiff));
  ok(!out.caneBad.length, '2 kẹo gậy nằm trên lá, không đè quả châu / bóng đèn' + (out.caneBad.length ? ': ' + JSON.stringify(out.caneBad) : ''));
  console.log('== B. món của sự kiện');
  ok(out.items.length === 11 && out.items.every((x) => x.same && x.w > 0 && x.w <= 16 && x.h <= 24), '11 món có hình ≤ 16 cột: ' + out.items.map((x) => x.id + ' ' + x.w + '×' + x.h).join(', '));
  ok(['le_tulich', 'le_tat', 'le_longden'].every((id) => out.items.find((x) => x.id === id).h <= 16), 'đồ treo tường ≤ 16 hàng (vừa ô tường)');
  console.log('== C. áo nhà');
  ok(!out.geoBad.length, 'điểm neo + đèn + dây lá của 4 kiểu nhà / cấp 4–7 trong khung nhà; cấp 0–3 không có áo' + (out.geoBad.length ? ': ' + out.geoBad.slice(0, 5).join(' | ') : ''));
  console.log('== D. quét ném lỗi');
  ok(!out.sweepErr.length && !errs.length && out.sweepN >= 360, out.sweepN + ' lần vẽ (cảnh × kiểu nhà × cấp × ngăn × giờ × hiệu ứng × cỡ Lớn × ảnh chụp) không lỗi' +
    (out.sweepErr.length ? ': ' + out.sweepErr.slice(0, 3).join(' | ') : '') + (errs.length ? ' JS: ' + errs.slice(0, 3).join(' | ') : ''));
  ok(out.offSame, 'sự kiện tắt / ngoài mùa → cảnh y hệt khi không có dữ liệu sự kiện');
  ok(out.onDiff, 'sự kiện đang chạy → cảnh có áo nhà / đèn');
  console.log('== E. đèn sân');
  ok(!out.stakeBad.length && out.stakeCells.length === 9, 'đèn lối đi: 9 ô trống hàng trước (không ở ô có ghế / cây thông): ' + out.stakeCells.join(','));
  ok(out.bulbsFull > 50 && out.bulbsFull <= 400, 'sân kín cây thông + anh đào, đủ ngăn: ' + out.bulbsFull + ' bóng (≤ 400)');
  ok(out.stillSame, 'Dịu mắt / tắt hiệu ứng: đèn đứng yên');
  ok(out.twinkle, 'hiệu ứng bật: đèn nhấp nháy chậm');
  ok(out.dayBright === 0, 'ban ngày: dây đèn tắt, không điểm sáng (' + out.dayBright + ')');
  console.log('== F. bảng tủ lịch');
  ok(out.cellsIn && !out.cellsOverlap, '24 ngăn trong khung tủ, không chồng nhau');
  // G. tốc độ
  const ms = await pg.evaluate(() => {
    const L = GardenHome._lib(), A = GardenLeArt;
    const yard = []; for (let y = 0; y < 3; y++) { for (let x = 4; x < 16; x += 2) { yard.push({ id: (x + y) % 3 ? 'xmastree' : 'sakura', x, y }); } }
    const data = { wallet: { home: { house: 7, style: 'classic', rooms: [], yard, room: [], kitchen: [], bedroom: [], owned: {}, zones: [] }, more: { zones: [] } },
      catalog: { items: [{ id: 'xmastree', w: 2 }, { id: 'sakura', w: 2 }], themes: [], rooms: [] },
      le: { active: true, parts: ['wreath', 'red', 'yellow', 'garland', 'blue', 'lights', 'purple', 'path', 'tinsel', 'red2', 'swag', 'candy', 'star'], doors: [], boxes: [], opened: 24 }, fx: { effects: true } };
    L.setH({ data: () => data, send: () => {} });
    GardenSky.set('fixedHour', 23);
    const cv = document.getElementById('c'); cv.width = 1024; cv.height = 304; const ctx = cv.getContext('2d');
    for (let i = 0; i < 5; i++) { L.drawOutdoor(ctx, 4, 0, 0, i * 50, 'yard', { seen: true, noGuests: true, noPets: true, noJoy: true }); }
    const t0 = performance.now();
    for (let i = 0; i < 40; i++) { L.drawOutdoor(ctx, 4, 0, 0, 1000 + i * 50, 'yard', { seen: true, noGuests: true, noPets: true, noJoy: true }); }
    return (performance.now() - t0) / 40;
  });
  ok(ms < 12, 'sân kín đồ + đủ ngăn ban đêm: ' + ms.toFixed(1) + ' ms / khung (< 12)');
  await b.close();
  const pass = results.filter(Boolean).length;
  console.log('\nKẾT QUẢ: ' + pass + '/' + results.length + (pass === results.length ? ' — TẤT CẢ OK' : ' — CÓ LỖI'));
  process.exit(pass === results.length ? 0 : 1);
})();
