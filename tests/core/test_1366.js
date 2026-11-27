// 1.36.6 (Chromium, khung thẻ thật của bảng ôn — FRAME_JS lấy từ web/garden.js): người dùng 27/11 "lúc t học lâu lâu nó giật giật kiểu
// mất ảnh cái hiện lại". Trước 1.36.6 khung thẻ thay nội dung ngay → thẻ mới hiện chữ trước, ảnh "bật" vào sau (Anki thật:
// tests/anki/e2e_nhayanh.js — 1.36.5: 3 khung ảnh trống + 8 khung có chữ mà ảnh chưa tải / 5 lần sang thẻ; màn ôn Anki: 0). Nay như
// màn ôn Anki: tải sẵn + giải mã ảnh của mặt sắp hiện (tối đa 200 ms) rồi mới thay.
//   A. mặt không có ảnh → thay ngay (cùng lượt gọi);
//   B. ảnh tải 150 ms → nội dung cũ giữ nguyên tới khi ảnh xong; lúc thay, ảnh đã tải xong;
//   C. ảnh quá chậm (1,5 giây) → vẫn thay sau ~200 ms (không chờ mãi);
//   D. hai lần gọi liền nhau → chỉ mặt sau cùng được hiện, mặt trước không lóe lên;
//   E. ảnh đã có trong bộ nhớ đệm (mặt trước khi lật) → thay gần như ngay;
//   F. script của mẫu thẻ chạy đúng một lần, sau khi thay (không chạy trong lúc tải sẵn);
//   G. ảnh lỗi (404) → thay ngay khi biết lỗi;
//   H. sang thẻ mới vẫn dọn hẹn giờ của mẫu thẻ cũ trước lúc chờ (đếm ngược tự lật của thẻ cũ không chạy trong lúc tải ảnh).
// Chạy: node test_1366.js ADDON  (cần Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]);
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFklEQVR42mP8z8DwnwEJMI4KUAlQAQBN6gX/F1xrwQAAAABJRU5ErkJggg==', 'base64');

(async () => {
  const src = fs.readFileSync(path.join(ADDON, 'web', 'garden.js'), 'utf8');
  const i = src.indexOf('var FRAME_JS = ');
  const j = src.indexOf(';\n', src.indexOf('<\\/script>"', i));
  const FRAME_JS = eval(src.slice(i + 'var FRAME_JS = '.length, j));          // chuỗi thật của add-on
  ok(/__kbPre/.test(FRAME_JS) && /setTimeout\(end,200\)/.test(FRAME_JS), 'khung thẻ có bước tải sẵn ảnh (tối đa 200 ms)');
  const b = await chromium.launch(); const pg = await b.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('http://kb.test/**', async (route) => {
    const u = new URL(route.request().url());
    if (u.pathname === '/') {
      return route.fulfill({ contentType: 'text/html', body: '<!doctype html><html><head><meta charset="utf-8"><base href="http://kb.test/">' +
        '<script>window.Garden={frameReady:function(){window.__ready=1;},key:function(){},flip:function(){},cardCmd:function(){}};window.pycmd=function(){};</script>' +
        FRAME_JS + '</head><body class="card"><div id="qa">CŨ</div></body></html>' });
    }
    if (u.pathname === '/404.png') { return route.fulfill({ status: 404, body: 'x' }); }
    const d = Number(u.searchParams.get('d') || 0);
    await new Promise((r) => setTimeout(r, d));
    return route.fulfill({ contentType: 'image/png', body: PNG, headers: { 'Cache-Control': 'max-age=3600' } });
  });
  await pg.goto('http://kb.test/');
  await pg.waitForFunction(() => window.__ready === 1);
  // ghi lại mọi lần #qa đổi nội dung: [ms từ lúc gọi, chữ, số ảnh, số ảnh chưa tải xong]
  await pg.evaluate(() => {
    window.__log = []; window.__t0 = performance.now();
    new MutationObserver(() => { const qa = document.getElementById('qa'); const im = [...qa.querySelectorAll('img')];
      window.__log.push([Math.round(performance.now() - window.__t0), qa.innerText.trim(), im.length, im.filter((x) => !x.complete || !x.naturalWidth).length]);
    }).observe(document.getElementById('qa'), { childList: true });
    window.show = (h, side) => { window.__log = []; window.__t0 = performance.now(); window.__kbShow(h, '', 'card', side || 'q'); };
  });
  const text = () => pg.evaluate(() => document.getElementById('qa').innerText.trim());
  const log = () => pg.evaluate(() => window.__log);

  console.log('== A. mặt không có ảnh');
  const sync = await pg.evaluate(() => { window.show('<div>A không ảnh</div>'); return document.getElementById('qa').innerText.trim(); });
  ok(sync === 'A không ảnh', 'thay ngay trong cùng lượt gọi: "' + sync + '"');

  console.log('== B. ảnh tải 150 ms');
  await pg.evaluate(() => window.show('<img src="img/b.png?d=150"><div>B có ảnh</div>'));
  await pg.waitForTimeout(70);
  ok(await text() === 'A không ảnh', 'sau 70 ms: vẫn là mặt cũ (chưa hiện chữ của thẻ mới khi ảnh chưa xong)');
  await pg.waitForTimeout(500);
  let L = await log();
  ok(L.length === 1 && L[0][1] === 'B có ảnh' && L[0][3] === 0, 'thay một lần, lúc thay ảnh đã tải xong: ' + JSON.stringify(L));
  ok(L.length && L[0][0] >= 140 && L[0][0] < 400, 'thay sau khi ảnh xong (~150 ms): ' + (L[0] && L[0][0]) + ' ms');

  console.log('== C. ảnh quá chậm (1,5 giây)');
  await pg.evaluate(() => window.show('<img src="img/c.png?d=1500"><div>C ảnh chậm</div>'));
  await pg.waitForTimeout(600);
  L = await log();
  ok(L.length === 1 && L[0][1] === 'C ảnh chậm' && L[0][0] >= 190 && L[0][0] < 450, 'không chờ mãi: thay sau ' + (L[0] && L[0][0]) + ' ms (giới hạn 200 ms)');

  console.log('== D. hai lần gọi liền nhau');
  await pg.evaluate(() => { window.show('<img src="img/d1.png?d=150"><div>D1 cũ</div>'); window.__kbShow('<div>D2 mới</div>', '', 'card', 'q'); });
  await pg.waitForTimeout(500);
  L = await log();
  ok(await text() === 'D2 mới' && !L.some((x) => x[1] === 'D1 cũ'), 'chỉ mặt sau cùng hiện, mặt trước không lóe lên: ' + JSON.stringify(L));

  console.log('== E. ảnh đã có trong bộ nhớ đệm (như mặt trước khi lật)');
  await pg.evaluate(() => window.show('<img src="img/b.png?d=150"><div>B có ảnh</div><hr id="answer"><div>đáp án</div>', 'a'));
  await pg.waitForTimeout(300);
  L = await log();
  ok(L.length === 1 && L[0][3] === 0 && L[0][0] < 60, 'thay gần như ngay (' + (L[0] && L[0][0]) + ' ms), ảnh đã tải xong');

  console.log('== F. script của mẫu thẻ');
  await pg.evaluate(() => { window.__ran = 0; window.show('<img src="img/f.png?d=120"><div>F</div><script>window.__ran = (window.__ran || 0) + 1; window.__ranSeen = document.getElementById("qa").innerText.trim();<\/script>'); });
  await pg.waitForTimeout(60);
  const r0 = await pg.evaluate(() => window.__ran);
  await pg.waitForTimeout(400);
  const r1 = await pg.evaluate(() => [window.__ran, window.__ranSeen]);
  ok(r0 === 0 && r1[0] === 1 && r1[1] === 'F', 'không chạy lúc tải sẵn, chạy đúng 1 lần sau khi thay: ' + JSON.stringify([r0, r1]));

  console.log('== G. ảnh lỗi (404)');
  await pg.evaluate(() => window.show('<img src="404.png"><div>G ảnh lỗi</div>'));
  await pg.waitForTimeout(300);
  L = await log();
  ok(L.length === 1 && L[0][1] === 'G ảnh lỗi' && L[0][0] < 150, 'thay khi biết ảnh lỗi: ' + (L[0] && L[0][0]) + ' ms');

  console.log('== H. hẹn giờ của mẫu thẻ cũ');
  await pg.evaluate(() => { window.__fired = 0; setTimeout(() => { window.__fired = 1; }, 80); window.show('<img src="img/h.png?d=200"><div>H</div>'); });
  await pg.waitForTimeout(500);
  ok(await pg.evaluate(() => window.__fired) === 0 && await text() === 'H', 'sang thẻ mới: hẹn giờ cũ đã dọn ngay, không chạy trong lúc tải ảnh');

  ok(!errs.length, 'không lỗi JS' + (errs.length ? ': ' + errs.join(' | ') : ''));
  await b.close();
  const pass = results.filter(Boolean).length;
  console.log('\nKẾT QUẢ: ' + pass + '/' + results.length + (pass === results.length ? ' — TẤT CẢ OK' : ''));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error('LỖI:', e); process.exit(2); });
