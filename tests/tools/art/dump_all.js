// dump_all.js ADDON OUT.json — 1.25.3: lấy MỌI hình pixel có sẵn của add-on (đồ / món hiếm / đồ theo mùa / nội thất 3 gian
// trong SPR của home.js, thú nuôi, giống cây, khách ghé vườn) bằng chính các file web/*.js chạy trong Chromium (Playwright),
// ghi {nhóm: {id: {rows: [...], pal: {...}}}} để check_outline.py dò viền khuyết / lộ màu và vẽ bảng xem.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]), OUT = process.argv[3];
const ORDER = ['diag', 'prefs', 'fix', 'icons', 'sky', 'season', 'fx', 'music', 'games', 'fields', 'season_art', 'rare_art', 'nha_art',
  'pets', 'guests', 'home', 'craft', 'paper', 'seeds', 'joy', 'ui', 'calendar'];
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const body = fs.readFileSync(path.join(ADDON, 'web', 'body.html'), 'utf8');
  const scripts = ORDER.filter((n) => fs.existsSync(path.join(ADDON, 'web', n + '.js')))
    .map((n) => '<script src="file://' + path.join(ADDON, 'web', n + '.js') + '"></script>').join('\n');
  const html = path.join(path.dirname(OUT), '_dump_page.html');
  fs.writeFileSync(html, '<!doctype html><html><head><meta charset="utf-8"></head><body>' + body + scripts + '</body></html>');
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  await page.goto('file://' + html);
  const out = await page.evaluate(() => {
    const res = { home: {}, pets: {}, seeds: {}, guests: {} };
    const L = GardenHome._lib();
    Object.keys(L.SPR).forEach((id) => { const r = L.SPR[id]; if (Array.isArray(r) && typeof r[0] === 'string') { res.home[id] = { rows: r, pal: L.P }; } });
    if (typeof GardenPets !== 'undefined') {
      ['niwatori', 'ahiru', 'usagi', 'kame', 'neko', 'shiba', 'tanuki', 'kitsune', 'hamster', 'fukuro'].forEach((id) => {
        if (!GardenPets.has(id)) { return; }
        ['walk0', 'walk1', 'sit', 'sleep'].forEach((f) => { const r = GardenPets.sprite(id, f); if (r) { res.pets[id + '·' + f] = { rows: r, pal: GardenPets.pal }; } });
      });
    }
    if (typeof GardenSeeds !== 'undefined') {
      GardenSeeds.all.forEach((v) => { for (let s = 0; s < 5; s++) { const r = GardenSeeds.rows(v, s); if (r) { res.seeds[v + '·' + s] = { rows: r, pal: GardenSeeds.pal(false, v) }; } } });
    }
    if (typeof GardenGuests !== 'undefined' && GardenGuests._spr) {
      const S = GardenGuests._spr, pal = GardenGuests.pal || null;
      Object.keys(S).forEach((id) => { Object.keys(S[id]).forEach((f) => { res.guests[id + '·' + f] = { rows: S[id][f], pal: pal }; }); });
    }
    return res;
  });
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(Object.keys(out).map((k) => k + ' ' + Object.keys(out[k]).length).join(' · ') + (errs.length ? ' · lỗi trang: ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
})();
