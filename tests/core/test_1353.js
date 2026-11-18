// 1.35.3 (ảnh người dùng 18/11, cỡ cảnh "Lớn", Giáng sinh, ban đêm): có thêm một hàng đèn bắc ngang trời phía trên nhà.
// Lý do: cỡ Lớn vẽ thêm padTop hàng trời phía trên cảnh — dây trang trí vẽ ở oy − padTop (home.js), còn lớp đèn sáng ban đêm
// (GardenSeason.nightTop → pass 1) vẽ ở oy → lệch xuống padTop hàng, thành "dây thứ hai".
// Test: dựng cảnh thật trong Chromium (web/*.js của add-on, không sửa file), ghi lại toạ độ từng lần vẽ của dây (pass 0)
// và lớp sáng (pass 1); mọi điểm sáng phải nằm sát dây — sân + 6 vùng × cỡ thường / Lớn × mọi chủ đề có dây, đêm + ngày.
// Rà thêm cùng loại + loại khác (người dùng: "test kỹ xem còn lỗi gì nữa không, lỗi tương tự và các lỗi khác"):
//   B. móc vào hàm garland nội bộ của season.js: MỌI lần vẽ lớp sáng (sân, 6 vùng, trong nhà, Bếp, Phòng ngủ, cả nhà 3 gian,
//      màn "Trong nhà" có / không cắt xà) trùng ox / oy / y0 / kiểu / khoảng x với một lần vẽ dây;
//   C. quét ném lỗi: 15 nơi (cả 8 kiểu nền vùng tự tạo) × 16 chủ đề × giờ × thời tiết × hiệu ứng bật / tắt × màn hẹp / rộng / Lớn /
//      ảnh chụp — 1.35.2: vùng "Đồi hoa" ở màn rộng và đèn Giáng sinh khi tắt hiệu ứng ném lỗi (% của JS với số âm → màu
//      undefined), khung hình vẽ dở (mất nhà);
//   D. phần đất ở cỡ Lớn giống hệt từng điểm ảnh với cỡ thường (thứ gì vẽ lệch theo padTop là lộ ra);
//   E. cỡ Lớn: cánh hoa / lá / tuyết / dơi bay cả phần trời thêm, đèn trời bay tới mép trên (1.35.2: dừng ở mép cảnh cũ);
//   F. màn rộng: chấm cỏ / cát / hoa nằm dưới đường chân trời ở phần bên trái cảnh (1.35.2: (i * 7) % 40 âm → chấm lên trời).
// Chạy: node test_1353.js ADDON  (cần Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]);
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const FILES = ['diag', 'prefs', 'fix', 'icons', 'sky', 'season', 'fx', 'music', 'games', 'fields', 'season_art', 'rare_art',
  'nha_art', 'pets', 'guests', 'finds_art', 'finds', 'life', 'joy', 'home'];
const ZONES = ['meadow', 'flower', 'sand', 'snow', 'rock', 'lake', 'town', 'forest'];

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.setContent('<html><body><canvas id="c"></canvas></body></html>');
  for (const f of FILES) {
    let src = fs.readFileSync(path.join(ADDON, 'web', f + '.js'), 'utf8');
    // chỉ trong trình duyệt của test (file add-on không đổi): mở hàm vẽ nội bộ, móc vào hàm garland của season.js
    if (f === 'home') { src = src.replace('_lib: () => ({ SPR,', '_lib: () => ({ drawOutdoor, drawHouseScene, drawHouse3, drawRoom, YARD, setH: (h) => { H = h; }, SPR,'); }
    if (f === 'season') {
      const sig = 'function garland(ctx, S, ox, oy, x0, x1, y0, now, style, pass, opt) {';
      if (src.indexOf(sig) < 0) { throw new Error('season.js: không thấy hàm garland'); }
      src = src.replace(sig, sig + ' if (window.__gh) { window.__gh({ S, ox, oy, x0, x1, y0, style, pass, L: opt && opt.L, sag: opt && opt.sag }); }');
    }
    await pg.addScriptTag({ content: src });
  }
  await pg.evaluate((ZONES) => {
    GardenHome._lib().setH({ data: () => ({ wallet: { home: { house: 7, style: 'classic', rooms: ['kitchen', 'bedroom'], yard: [], room: [], kitchen: [], bedroom: [] },
      more: { zones: ZONES.map((bg, i) => ({ id: 'u' + (i + 1), name: bg, bg, ground: '#5ed35e', hills: '#7ed98a' })) } }, catalog: { items: [], themes: [], rooms: [] } }) });
  }, ZONES);
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

  // ---- B. mọi đường vẽ dây: lớp sáng trùng một lần vẽ dây ----
  const hook = await pg.evaluate(() => {
    const L = GardenHome._lib(), G = GardenSeason;
    GardenSky.set('fixedHour', 22);
    const cv = document.createElement('canvas'); cv.width = 1200; cv.height = 600; const ctx = cv.getContext('2d');
    const draws = {
      yard: (p) => L.drawOutdoor(ctx, 2, 10, p, 1e12, 'yard', { padTop: p, bgFrom: -11, bgTo: 300 }),
      beach: (p) => L.drawOutdoor(ctx, 2, 10, p, 1e12, 'beach', { padTop: p, bgFrom: -11, bgTo: 300 }),
      u2: (p) => L.drawOutdoor(ctx, 2, 10, p, 1e12, 'u2', { padTop: p, bgFrom: -11, bgTo: 300 }),
      room: () => L.drawRoom(ctx, 2, 5, 7, 1e12, { kind: 'room' }),
      kitchen: () => L.drawRoom(ctx, 2, 5, 7, 1e12, { kind: 'kitchen' }),
      bedroom: () => L.drawRoom(ctx, 2, 5, 7, 1e12, { kind: 'bedroom' }),
      house3: () => L.drawHouse3(ctx, 2, 3, 4, 1e12, {}),
      houseScene: () => L.drawHouseScene(ctx, 2, 600, 150, 20, 30, 1e12, {}),
      houseSceneCrop: () => L.drawHouseScene(ctx, 2, 600, 80, 20, -12, 1e12, {}),
    };
    const out = { runs: 0, glow: 0, bad: [] };
    Object.keys(G.VIS).filter((id) => G.VIS[id].garland || G.VIS[id].room).forEach((th) => Object.keys(draws).forEach((k) => [0, 40].forEach((p) => {
      if (p && !/^(yard|beach|u2)$/.test(k)) { return; }
      const calls = []; window.__gh = (c) => calls.push(c);
      try { G.withTheme(th, () => draws[k](p)); } catch (e) { out.bad.push(th + '/' + k + ': ' + e.message); } finally { window.__gh = null; }
      const p0 = calls.filter((c) => !c.pass), p1 = calls.filter((c) => c.pass);
      out.runs++; out.glow += p1.length;
      p1.forEach((g) => {
        if (!p0.some((d) => d.S === g.S && d.ox === g.ox && d.oy === g.oy && d.y0 === g.y0 && d.style === g.style && d.L === g.L && d.sag === g.sag && d.x0 <= g.x0 && d.x1 >= g.x1)) {
          out.bad.push(th + '/' + k + (p ? '/Lớn' : '') + ': lớp sáng ở oy ' + g.oy + ', dây ở ' + p0.map((d) => d.oy).join(','));
        }
      });
    })));
    return out;
  });
  ok(hook.glow > 50 && !hook.bad.length, 'mọi đường vẽ (sân, vùng, vùng tự tạo, 3 gian, cả nhà, màn Trong nhà có / không cắt xà): ' + hook.glow +
    ' lần vẽ lớp sáng đều trùng một lần vẽ dây (' + hook.runs + ' cảnh)' + (hook.bad.length ? ' — ' + hook.bad.slice(0, 4).join('; ') : ''));

  // ---- C. quét ném lỗi ----
  const sweep = await pg.evaluate(() => {
    const L = GardenHome._lib();
    try { GardenJoy.render({ quests: true, streak_mark: true, done: true }); } catch (e) { /* không có DOM bảng huy hiệu */ }
    const themes = [null].concat(Object.keys(GardenSeason.VIS));
    const scenes = ['yard', 'beach', 'shrine', 'festival', 'bamboo', 'onsen', 'station', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'];
    const cv = document.createElement('canvas'); cv.width = 900; cv.height = 300; const ctx = cv.getContext('2d');
    let eff = true, n = 0; GardenFX.effectsOn = () => eff;
    const bad = {};
    [true, false].forEach((E) => { eff = E;
      Object.keys(GardenSky.WEATHER).forEach((wx) => { GardenSky.set('weather', wx);
        [0, 6.5, 12, 18, 22].forEach((hour) => { GardenSky.set('fixedHour', hour);
          themes.forEach((th) => {
            const run = (k, f) => { n++; try { if (th) { GardenSeason.withTheme(th, f); } else { f(); } } catch (e) { const m = String(e.message); (bad[m] = bad[m] || []).push([E ? 'hiệu ứng bật' : 'hiệu ứng tắt', wx, hour + 'h', th || '-', k].join('/')); } };
            scenes.forEach((sc) => [[0, 0, 0], [150, 0, 0], [150, 40, 0], [0, 0, 1]].forEach(([ox, pad, ph]) => run(sc + (ox ? '/rộng' : '') + (pad ? '/Lớn' : '') + (ph ? '/ảnh' : ''),
              () => L.drawOutdoor(ctx, 2, ox, pad, 1e12 + hour * 1000, sc, ph ? { photo: true } : { bgFrom: -ox - 1, bgTo: 450 - ox + 1, padTop: pad }))));
            ['room', 'kitchen', 'bedroom'].forEach((k) => run(k, () => L.drawRoom(ctx, 2, 0, 0, 1e12, { kind: k })));
            run('houseScene', () => L.drawHouseScene(ctx, 2, 450, 150, 10, 40, 1e12, { life: true, seen: true }));
          });
        });
      });
    });
    GardenFX.effectsOn = () => false;
    return { n, bad };
  });
  const sb = Object.keys(sweep.bad);
  ok(sweep.n > 40000 && !sb.length, 'quét ' + sweep.n + ' lần vẽ (15 nơi × 16 chủ đề × 5 giờ × ' + 'mọi thời tiết × hiệu ứng bật / tắt × hẹp / rộng / Lớn / ảnh chụp): không ném lỗi' +
    (sb.length ? ' — ' + sb.map((m) => m + ' (' + sweep.bad[m].length + ' lần, vd. ' + sweep.bad[m].slice(0, 2).join(', ') + ')').join('; ') : ''));
  const flower = sb.some((m) => sweep.bad[m].some((k) => /\/u2\/rộng/.test(k))), noelOff = sb.some((m) => sweep.bad[m].some((k) => /hiệu ứng tắt\/.*\/noel\/.*rộng/.test(k)));
  ok(!flower && !noelOff, 'đúng hai ca 1.35.2 ném lỗi: vùng tự tạo "Đồi hoa" ở màn rộng, Giáng sinh khi tắt hiệu ứng');

  // ---- D. đất ở cỡ Lớn = cỡ thường từng điểm ảnh ----
  const dif = await pg.evaluate(() => {
    const L = GardenHome._lib(), Y = L.YARD;
    GardenFX.effectsOn = () => false;
    const themes = [null].concat(Object.keys(GardenSeason.VIS));
    const scenes = ['yard', 'beach', 'shrine', 'festival', 'bamboo', 'onsen', 'station', 'u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'];
    const P = 37, ox = 120, W = 496, mk = (h) => { const c = document.createElement('canvas'); c.width = W; c.height = h; return c; };
    let n = 0; const bad = [];
    ['sunny', 'cloudy'].forEach((wx) => { GardenSky.set('weather', wx); [3, 12, 18, 22].forEach((hour) => { GardenSky.set('fixedHour', hour);
      themes.forEach((th) => scenes.forEach((sc) => {
        const a = mk(Y.H), c = mk(Y.H + P);
        const go = (cv, pad) => L.drawOutdoor(cv.getContext('2d'), 1, ox, pad, 1e12, sc, { bgFrom: -ox - 1, bgTo: W - ox + 1, padTop: pad, noGuests: true, noPets: true, noJoy: true });
        try { if (th) { GardenSeason.withTheme(th, () => { go(a, 0); go(c, P); }); } else { go(a, 0); go(c, P); } } catch (e) { n++; bad.push([wx, hour, th, sc, 'lỗi ' + e.message].join('/')); return; }
        const y0 = Y.SKY + 1, hh = Y.H - y0;
        const da = a.getContext('2d').getImageData(0, y0, W, hh).data, dc = c.getContext('2d').getImageData(0, y0 + P, W, hh).data;
        let d = 0; for (let i = 0; i < da.length; i += 4) { if (da[i] !== dc[i] || da[i + 1] !== dc[i + 1] || da[i + 2] !== dc[i + 2]) { d++; } }
        n++; if (d) { bad.push([wx, hour, th, sc, d].join('/')); }
      }));
    }); });
    return { n, bad };
  });
  ok(dif.n >= 1500 && !dif.bad.length, 'phần đất ở cỡ Lớn giống hệt cỡ thường từng điểm ảnh (' + dif.n + ' tổ hợp nơi × chủ đề × giờ × thời tiết)' + (dif.bad.length ? ' — khác: ' + dif.bad.slice(0, 5).join('; ') : ''));

  // ---- E. cỡ Lớn: hạt bay / đèn trời đi hết phần trời thêm; cỡ thường không đổi ----
  const yr = await pg.evaluate(() => {
    const L = GardenHome._lib();
    GardenFX.effectsOn = () => true; GardenSky.set('weather', 'sunny');
    let cur = null; const ys = {};
    const wrap = (obj, name, tag) => { const f = obj[name]; obj[name] = function () { cur = tag; try { return f.apply(this, arguments); } finally { cur = null; } }; return () => { obj[name] = f; }; };
    const un = [wrap(GardenSeason, 'ambient', 'hạt'), wrap(GardenJoy, 'drawYard', 'đèn trời')];
    [['hanami', 12], ['momiji', 12], ['noel', 22], ['halloween', 22]].forEach(([th, hour]) => [0, 40].forEach((pad) => {
      GardenSky.set('fixedHour', hour);
      const cv = document.createElement('canvas'); cv.width = 300; cv.height = 200; const ctx = cv.getContext('2d'), fr = ctx.fillRect.bind(ctx);
      ctx.fillRect = function (x, y, w, h) { if (cur) { const k = th + '/' + pad + '/' + cur, a = ys[k] = ys[k] || [1e9, 0, 0]; a[0] = Math.min(a[0], y); a[1] += y; a[2]++; } return fr(x, y, w, h); };
      for (let t = 0; t < 200; t++) { GardenSeason.withTheme(th, () => L.drawOutdoor(ctx, 1, 0, pad, 1e12 + t * 517, 'yard', { padTop: pad, noGuests: true, noPets: true })); }
    }));
    un.forEach((f) => f());
    return ys;
  });
  const e1 = Object.keys(yr).filter((k) => /\/40\//.test(k) && yr[k][0] > 6).map((k) => k + ' từ y = ' + Math.round(yr[k][0]));
  ok(Object.keys(yr).length >= 12 && !e1.length, 'cỡ Lớn (40 hàng trời thêm): cánh hoa / lá / tuyết / dơi và đèn trời đi tới mép trên' + (e1.length ? ' — chỉ ' + e1.join('; ') : ''));
  const e0 = Object.keys(yr).filter((k) => /\/0\//.test(k) && yr[k][0] < -12).map((k) => k + ' y = ' + Math.round(yr[k][0]));
  ok(!e0.length, 'cỡ thường: hạt bay / đèn trời vẫn trong khung như trước' + (e0.length ? ' — ' + e0.join('; ') : ''));

  // ---- F. màn rộng: chấm đất bên trái cảnh nằm dưới đường chân trời ----
  const dots = await pg.evaluate(() => {
    const L = GardenHome._lib(), Y = L.YARD;
    GardenFX.effectsOn = () => false; GardenSky.set('weather', 'sunny'); GardenSky.set('fixedHour', 12);
    const out = [];
    ['yard', 'beach', 'u1', 'u2', 'u3', 'u4'].forEach((sc) => {
      // nền trời + đồi (vẽ cảnh 1 lần chỉ phần trời, so với lần vẽ đầy đủ): điểm khác ở hàng trời = có gì đó vẽ lên trời
      const cv = document.createElement('canvas'); cv.width = 700; cv.height = Y.H; const ctx = cv.getContext('2d');
      const marks = []; const fr = ctx.fillRect.bind(ctx); let on = false;
      const bx = (x, y, w, h) => { if (on && w <= 4 && h <= 1 && y < (Y.SKY - 12)) { marks.push([Math.round(x - 300), Math.round(y)]); } };
      ctx.fillRect = function (x, y, w, h) { bx(x, y, w, h); return fr(x, y, w, h); };
      const now = 1e12 - (1e12 % 27000) + 20000;      // lúc không có đàn chim bay ngang trời (drawSky: 11 giây đầu mỗi 27 giây)
      on = true; try { L.drawOutdoor(ctx, 1, 300, 0, now, sc, { bgFrom: -301, bgTo: 401, noGuests: true, noPets: true, noJoy: true }); } catch (e) { /* đã đếm ở phần C */ } on = false;
      // chấm nhỏ ở trời phía trái (x < 0) mà không có ở phía phải (x ≥ 256): chấm đất bị đưa lên trời
      const left = marks.filter(([x]) => x < -8).length, right = marks.filter(([x]) => x >= 264).length;
      out.push({ sc, left, right });
    });
    return out;
  });
  const dbad = dots.filter((d) => d.left > d.right * 1.5 + 6).map((d) => d.sc + ': trái ' + d.left + ' / phải ' + d.right);
  ok(!dbad.length, 'màn rộng: phần bên trái cảnh không có chấm cỏ / cát / hoa trên trời (so với bên phải, ' + dots.length + ' nơi)' + (dbad.length ? ' — ' + dbad.join('; ') : ''));

  ok(!errs.length, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(results.every(Boolean) ? 'KẾT QUẢ: OK (' + results.length + ')' : 'KẾT QUẢ: CÓ LỖI');
  process.exit(results.every(Boolean) ? 0 : 1);
})();
