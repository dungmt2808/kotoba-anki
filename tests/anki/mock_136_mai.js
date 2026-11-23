// Chụp sân Giáng sinh của bản add-on hiện tại (mã web/*.js thật, không sửa file) — ngày 12h / đêm 22h, có / không giao diện mùa
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]), OUT = process.argv[3];
const FILES = ['diag', 'prefs', 'fix', 'icons', 'sky', 'season', 'fx', 'music', 'games', 'fields', 'season_art', 'rare_art',
  'nha_art', 'pets', 'guests', 'finds_art', 'finds', 'life', 'joy', 'home'];
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.setContent('<html><body><canvas id="c"></canvas></body></html>');
  for (const f of FILES) {
    let src = fs.readFileSync(path.join(ADDON, 'web', f + '.js'), 'utf8');
    if (f === 'home') { src = src.replace('_lib: () => ({ SPR,', '_lib: () => ({ drawOutdoor, YARD, setH: (h) => { H = h; }, SPR,'); }
    await pg.addScriptTag({ content: src });
  }
  await pg.evaluate(() => {
    GardenHome._lib().setH({ data: () => ({ wallet: { home: { house: 7, style: 'classic', rooms: ['kitchen', 'bedroom'], yard: [], room: [], kitchen: [], bedroom: [] },
      more: {} }, catalog: { items: [], themes: [], rooms: [] } }) });
  });
  const shots = await pg.evaluate(() => {
    const L = GardenHome._lib(), G = GardenSeason, S = 5, W = 256;
    GardenSky.set('mode', 'fixed'); GardenFX.effectsOn = () => false;
    const res = {};
    [['ngay', 12, 'clear'], ['dem', 21, 'clear'], ['ngay_tuyet', 12, 'snow']].forEach(([nm, h, w]) => {
      GardenSky.set('fixedHour', h); GardenSky.set('weather', w);
      [['noel', 'noel'], ['thuong', null]].forEach(([tn, th]) => {
        const cv = document.getElementById('c'); cv.width = W * S; cv.height = L.YARD.H * S;
        const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
        const draw = () => L.drawOutdoor(ctx, S, 0, 0, 1000, 'yard', { seen: true, noGuests: true, noPets: true, noJoy: true });
        if (th) { G.withTheme(th, draw); } else { draw(); }
        res[nm + '_' + tn] = cv.toDataURL('image/png');
      });
    });
    return res;
  });
  for (const k of Object.keys(shots)) { fs.writeFileSync(path.join(OUT, k + '.png'), Buffer.from(shots[k].split(',')[1], 'base64')); }
  console.log('lỗi JS:', errs.length ? errs : 'không'); await b.close();
})();
