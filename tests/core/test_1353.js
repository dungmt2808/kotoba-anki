// 1.35.3 (ảnh người dùng 18/11, cỡ cảnh "Lớn", Giáng sinh, ban đêm): có thêm một hàng đèn bắc ngang trời phía trên nhà.
// Lý do: cỡ Lớn vẽ thêm padTop hàng trời phía trên cảnh — dây trang trí vẽ ở oy − padTop (home.js), còn lớp đèn sáng ban đêm
// (GardenSeason.nightTop → pass 1) vẽ ở oy → lệch xuống padTop hàng, thành "dây thứ hai".
// Test: dựng cảnh thật trong Chromium (web/*.js của add-on, không sửa file), ghi lại toạ độ từng lần vẽ của dây (pass 0)
// và lớp sáng (pass 1); mọi điểm sáng phải nằm sát dây — sân + 6 vùng × cỡ thường / Lớn × mọi chủ đề có dây, đêm + ngày.
// Chạy: node test_1353.js ADDON  (cần Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]);
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const FILES = ['diag', 'prefs', 'fix', 'icons', 'sky', 'season', 'fx', 'music', 'games', 'fields', 'season_art', 'rare_art',
  'nha_art', 'pets', 'guests', 'finds_art', 'finds', 'life', 'home'];

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.setContent('<html><body><canvas id="c"></canvas></body></html>');
  for (const f of FILES) {
    let src = fs.readFileSync(path.join(ADDON, 'web', f + '.js'), 'utf8');
    // chỉ trong trình duyệt của test: mở drawOutdoor / YARD (file add-on không đổi)
    if (f === 'home') { src = src.replace('_lib: () => ({ SPR,', '_lib: () => ({ drawOutdoor, YARD, SPR,'); }
    await pg.addScriptTag({ content: src });
  }
  const out = await pg.evaluate(() => {
    const L = GardenHome._lib(), G = GardenSeason, S = 2, W = 256;
    const themes = Object.keys(G.VIS).filter((id) => G.VIS[id].garland);
    const scenes = ['yard', 'beach', 'shrine', 'festival', 'bamboo', 'onsen', 'station'];
    GardenSky.set('weather', 'clear'); GardenSky.set('mode', 'fixed');
    // tắt hiệu ứng động (pháo hoa của nightTop cố ý vẽ trên trời, không phải dây); lớp sáng của dây vẫn vẽ (đèn đứng yên)
    GardenFX.effectsOn = () => false;
    const cases = [];
    [22, 12].forEach((hour) => {
      GardenSky.set('fixedHour', hour);
      themes.forEach((th) => scenes.forEach((sc) => [0, 40].forEach((pad) => {
        const cv = document.getElementById('c'); cv.width = W * S; cv.height = (L.YARD.H + pad) * S;
        const ctx = cv.getContext('2d'); const hits = { 0: [], 1: [] }; let pass = -1;
        const fr = ctx.fillRect.bind(ctx);
        ctx.fillRect = function (x, y, w, h) { if (pass >= 0) { hits[pass].push(y / S); } return fr(x, y, w, h); };
        const g0 = G.garland, g1 = G.nightTop;
        G.garland = function () { pass = 0; try { return g0.apply(this, arguments); } finally { pass = -1; } };
        G.nightTop = function () { pass = 1; try { return g1.apply(this, arguments); } finally { pass = -1; } };
        try {
          G.withTheme(th, () => L.drawOutdoor(ctx, S, 0, pad, Date.now(), sc,
            { padTop: pad, seen: true, noGuests: true, noPets: true, noJoy: true }));
        } finally { G.garland = g0; G.nightTop = g1; }
        const top = Math.min.apply(null, hits[0]), bot = Math.max.apply(null, hits[0]);
        // đồ treo dài nhất (đèn lồng Tết, chuông gió…) ~ 9 hàng dưới dây; lớp sáng không được xuống quá đó
        const far = hits[1].filter((y) => y < top - 3 || y > bot + 3).length;
        cases.push({ hour, th, sc, pad, n0: hits[0].length, n1: hits[1].length, top, bot, far });
      })));
    });
    return { themes, cases };
  });
  const night = out.cases.filter((c) => c.hour === 22), day = out.cases.filter((c) => c.hour === 12);
  ok(out.themes.length >= 8 && out.themes.indexOf('noel') >= 0, out.themes.length + ' chủ đề có dây trang trí ngoài cảnh (có Giáng sinh)');
  ok(out.cases.every((c) => c.n0 > 0), 'mọi cảnh đều vẽ dây (' + out.cases.length + ' cảnh: 7 nơi × 2 cỡ × ' + out.themes.length + ' chủ đề × đêm / ngày)');
  const big = night.filter((c) => c.pad);
  ok(big.every((c) => c.top >= 0 && c.top <= 2), 'cỡ Lớn: dây ở mép trên cùng của khung (không xuống cùng cảnh)');
  const glow = night.filter((c) => c.n1 > 0);
  ok(glow.length >= 7 * 2 * 3, 'ban đêm có lớp đèn sáng ở ' + glow.length + ' cảnh (đèn Giáng sinh, lồng đèn, đèn ông sao…)');
  const bad = night.filter((c) => c.far).map((c) => c.th + '/' + c.sc + (c.pad ? '/Lớn' : '') + ': ' + c.far + ' điểm');
  ok(!bad.length, 'ban đêm: mọi điểm đèn sáng nằm sát dây — cỡ thường + Lớn' + (bad.length ? ' — lệch: ' + bad.slice(0, 8).join('; ') : ''));
  const noel = night.find((c) => c.th === 'noel' && c.sc === 'yard' && c.pad);
  ok(noel && noel.n1 > 0 && !noel.far, 'đúng ca người dùng gặp: Giáng sinh, Sân vườn, cỡ Lớn, 22 giờ — đèn sáng trên dây, không thành dây thứ hai');
  ok(day.every((c) => c.n1 === 0), 'ban ngày không có lớp sáng');
  ok(!errs.length, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(results.every(Boolean) ? 'KẾT QUẢ: OK (' + results.length + ')' : 'KẾT QUẢ: CÓ LỖI');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
