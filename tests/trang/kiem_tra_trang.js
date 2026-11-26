// Trang web chung (site/): kiểm tra bằng Chromium (Playwright) — không cần Anki, không ra mạng (trừ font Google của trang).
//   1. Bảng màu Xưởng (Python) = bảng màu add-on dùng để vẽ món / vùng tự làm (home.js P).
//   2. Nền vùng tự tạo của trang (site/ve.js KB.zoneBg) giống từng điểm ảnh với hàm của add-on (GardenHome.zoneBgCanvas):
//      8 kiểu nền × 16 cặp màu đất / đồi.
//   3. Giải mã KB1 trên trình duyệt (KB.decode) ra đúng như add-on (share.parse_code): mã ngẫu nhiên đúng / hỏng / cắt cụt /
//      xuống dòng / dữ liệu sai bên trong (tests/trang/ma_thu.py).
//   4. Chạy cả trang (máy chủ tạm): đủ số hình, mở hộp chi tiết của mọi nhóm, Mã cộng đồng (dữ liệu thử từ them_ma.py),
//      Xem mã đúng / hỏng, liên kết Gửi qua GitHub, điện thoại không cuộn ngang, không lỗi JS.
//   5. (1.36.2) Giáng sinh 2026: thiệp vẽ bằng site/thiep.js giống từng điểm ảnh với web/le_card.js drawCard (120 thiệp ngẫu nhiên
//      × cỡ 1 / 2 / 4 × có / không chữ ことば畑); đọc mã KBC1 trên trình duyệt ra đúng thiệp add-on đọc (le_core.decode_card —
//      tests/trang/thiep_thu.py: mã đúng / sửa tay / hỏng / cắt cụt / xuống dòng / giải nén quá lớn…); mục Giáng sinh theo ngày
//      (ngày giả): mở thẳng trong mùa, dòng "hôm nay", không lộ quà trong hộp bí mật; Kho hình che 3 món trong hộp tới 25/12;
//      Xem thiệp bằng mã / đường dẫn #thiep/…, mã KB1 / hỏng báo lỗi; điện thoại không cuộn ngang.
// Chạy: node tests/trang/kiem_tra_trang.js [ADDON]
const fs = require('fs');
const path = require('path');
const http = require('http');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..', '..');
const ADDON = path.resolve(process.argv[2] || path.join(ROOT, 'kotoba_batake'));
const SITE = path.join(ROOT, 'site');
const { openGame } = require(path.join(SITE, 'tools', 'xuat_hinh.js'));

const results = [];
const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const INFO = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'thong_tin.json'), 'utf8'));
const HINH = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'hinh.json'), 'utf8'));
const EV = JSON.parse(fs.readFileSync(path.join(SITE, 'data', 'su_kien.json'), 'utf8'));

function serve() {
  const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png' };
  const srv = http.createServer((req, res) => {
    const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    const f = path.join(SITE, u === '/' ? 'index.html' : u);
    if (!f.startsWith(SITE) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

(async () => {
  const browser = await chromium.launch();
  const game = await openGame(browser, ADDON);
  await game.addScriptTag({ path: path.join(SITE, 've.js') });

  console.log('== bảng màu');
  const palDiff = await game.evaluate((pal) => {
    const P = GardenHome._lib().P;
    return Object.keys(pal).filter((c) => String(P[c]).toLowerCase() !== pal[c].toLowerCase());
  }, INFO.craft.palette);
  ok(palDiff.length === 0, '32 màu Xưởng trùng bảng màu add-on vẽ món / vùng tự làm' + (palDiff.length ? ' (khác: ' + palDiff.join(',') + ')' : ''));

  console.log('== nền vùng tự tạo: trang vẽ giống add-on từng điểm ảnh');
  const zres = await game.evaluate((U) => {
    const out = [];
    U.bg.forEach((b) => {
      let bad = 0, worst = '';
      for (let i = 0; i < 16; i++) {
        const z = { bg: b.id, ground: U.ground[i], hills: U.hills[(i * 5 + 3) % 16] };
        const a = GardenHome.zoneBgCanvas(z).getContext('2d').getImageData(0, 0, 256, 76).data;
        const c = KB.zoneBg(z).getContext('2d').getImageData(0, 0, 256, 76).data;
        let n = 0;
        for (let k = 0; k < a.length; k += 4) { if (a[k] !== c[k] || a[k + 1] !== c[k + 1] || a[k + 2] !== c[k + 2] || a[k + 3] !== c[k + 3]) { n++; } }
        if (n) { bad++; worst = z.ground + '/' + z.hills + ': ' + n + ' điểm'; }
      }
      out.push([b.id, bad, worst]);
    });
    return out;
  }, INFO.uzone);
  zres.forEach(([bg, bad, worst]) => ok(bad === 0, bg + ': 16/16 cặp màu khớp' + (bad ? ' — lệch ' + bad + ' (' + worst + ')' : '')));

  console.log('== giải mã KB1 trên trình duyệt = add-on');
  const cases = JSON.parse(execFileSync('python3', [path.join(__dirname, 'ma_thu.py'), ADDON, '45'], { encoding: 'utf8', maxBuffer: 256 << 20 }));
  const js = await game.evaluate(async ([cs, info]) => {
    const out = [];
    for (const c of cs) {
      try { out.push({ ok: await KB.decode(c.code, info) }); } catch (e) { out.push({ err: e.message }); }
    }
    return out;
  }, [cases, INFO]);
  const NEWER = /mới hơn/;
  const byLabel = {};
  cases.forEach((c, i) => {
    const r = js[i];
    let same;
    if (c.ok) { same = !!r.ok && JSON.stringify(r.ok, Object.keys(c.ok).sort()) === JSON.stringify(c.ok, Object.keys(c.ok).sort()); }
    else { same = !!r.err && (r.err === c.err || (NEWER.test(c.err) && NEWER.test(r.err))); }
    const k = c.nhan;
    byLabel[k] = byLabel[k] || [0, 0, ''];
    byLabel[k][0]++;
    if (same) { byLabel[k][1]++; } else if (!byLabel[k][2]) { byLabel[k][2] = 'add-on: ' + (c.ok ? 'đọc được' : c.err) + ' · trang: ' + (r.ok ? 'đọc được ' + JSON.stringify(r.ok).slice(0, 80) : r.err); }
  });
  Object.keys(byLabel).forEach((k) => { const [n, good, why] = byLabel[k]; ok(n === good, k + ': ' + good + '/' + n + (why ? ' — ' + why : '')); });

  console.log('== thiệp Giáng sinh: trang vẽ giống add-on từng điểm ảnh');
  await game.addScriptTag({ path: path.join(SITE, 'thiep.js') });
  const draw = await game.evaluate((ev) => {
    GardenLeCard.init({ data: () => ({ le: { chuc: ev.chuc, draw_pal: ev.draw_pal } }), send: () => {} });
    let seed = 1225; const R = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
    const ids = Object.keys(ev.stickers).concat(['stackchan', 'stackchan', 'stackchan', 'khong_co_hinh']);
    const bad = []; let n = 0;
    for (let t = 0; t < 120; t++) {
      const card = { f: ['den', 'tuyet', 'thong', 'qua'][t % 4], st: [], t1: t % 3 ? 'Giáng sinh an lành ' + t : '', t2: t % 2 ? '— Lan ' + t : '', c: ['', 'ja', 'vi', 'ko', 'de', 'zh', 'fr', 'en'][t % 8] };
      const k = Math.floor(R() * 13);
      for (let i = 0; i < k; i++) { const s = { s: ids[Math.floor(R() * ids.length)], x: Math.floor(R() * 168) - 48, y: Math.floor(R() * 128) - 48 }; if (R() < 0.4) { s.m = 1; } if (R() < 0.3) { s.z = 2; } card.st.push(s); }
      if (t % 3 !== 1) {                // 1.36.3: hình vẽ tay ngẫu nhiên
        const cells = Array(9600).fill('.'), chars = Object.keys(ev.draw_pal);
        for (let q = 0; q < 1 + Math.floor(R() * 8); q++) { let x = Math.floor(R() * 120), y = Math.floor(R() * 80); const c = chars[Math.floor(R() * chars.length)]; for (let z = 0; z < 30; z++) { x = Math.max(0, Math.min(119, x + Math.floor(R() * 3) - 1)); y = Math.max(0, Math.min(79, y + Math.floor(R() * 3) - 1)); cells[y * 120 + x] = c; } }
        card.d = KBC.pxEncode(cells.join(''));
      }
      for (const S of [1, 2, 4]) {
        for (const mark of [false, true]) {
          const a = document.createElement('canvas'); a.width = 120 * S; a.height = 80 * S;
          GardenLeCard.drawCard(a.getContext('2d'), S, card, { mark: mark });
          const c = KBC.canvas(card, ev, S, { mark: mark });
          const da = a.getContext('2d').getImageData(0, 0, a.width, a.height).data, dc = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
          let d = 0; for (let i = 0; i < da.length; i++) { if (da[i] !== dc[i]) { d++; } }
          n++;
          if (d) { bad.push('thiệp ' + t + ' cỡ ' + S + ': lệch ' + d); }
        }
      }
    }
    const missing = Object.keys(GardenLeArt.ITEMS).concat(['xmastree', 'presents', 'yukidaruma', 'wreath', 'sleigh']).filter((id) => !ev.stickers[id]);
    return { n: n, bad: bad, missing: missing };
  }, EV);
  ok(!draw.bad.length && draw.n === 720, draw.n + ' lần vẽ (4 khung, sticker có sẵn / món tủ lịch / đồ vườn / StackChan đội mũ Noel, lật, ×2, chữ, câu chúc 8 kiểu) giống hệt add-on' +
    (draw.bad.length ? ' — ' + draw.bad.slice(0, 3).join('; ') : ''));
  ok(!draw.missing.length, 'có hình mọi sticker của xưởng thiệp (6 hình có sẵn + 11 món tủ lịch)' + (draw.missing.length ? ' — thiếu ' + draw.missing.join(',') : ''));

  console.log('== thiệp Giáng sinh: đọc mã KBC1 trên trình duyệt = add-on');
  const tcases = JSON.parse(execFileSync('python3', [path.join(__dirname, 'thiep_thu.py'), ADDON, '40'], { encoding: 'utf8', maxBuffer: 256 << 20 }));
  const tjs = await game.evaluate(async ([cs, ev]) => {
    const out = [];
    for (const c of cs) { try { out.push({ ok: await KBC.decode(c.code, ev) }); } catch (e) { out.push({ err: e.message }); } }
    return out;
  }, [tcases, EV]);
  const canon = (o) => JSON.stringify(o, (k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).sort().reduce((a, kk) => { a[kk] = v[kk]; return a; }, {}) : v));
  const tl = {};
  tcases.forEach((c, i) => {
    const r = tjs[i], same = c.ok ? !!r.ok && canon(r.ok) === canon(c.ok) : !!r.err;
    tl[c.nhan] = tl[c.nhan] || [0, 0, ''];
    tl[c.nhan][0]++;
    if (same) { tl[c.nhan][1]++; } else if (!tl[c.nhan][2]) { tl[c.nhan][2] = 'add-on: ' + (c.ok ? canon(c.ok).slice(0, 120) : 'không đọc') + ' · trang: ' + (r.ok ? canon(r.ok).slice(0, 120) : r.err); }
  });
  Object.keys(tl).forEach((k) => { const [n, good, why] = tl[k]; ok(n === good, k + ': ' + good + '/' + n + (why ? ' — ' + why : '')); });
  const kb1 = tjs[tcases.findIndex((c) => c.nhan === 'mã thiết kế KB1')];
  ok(kb1 && /Xem mã/.test(kb1.err || ''), 'dán nhầm mã thiết kế KB1 → chỉ sang mục Xem mã (' + (kb1 && kb1.err) + ')');
  await game.close();

  console.log('== chạy cả trang');
  const srv = await serve();
  const base = 'http://127.0.0.1:' + srv.address().port + '/';
  // dữ liệu Mã cộng đồng thử: 3 mã đúng của ma_thu.py qua them_ma.add (đúng đường duyệt thật)
  const good = cases.filter((c) => c.ok && c.nhan.startsWith('đúng')).slice(0, 6).map((c) => c.code);
  const py = 'import sys, json, datetime; sys.path.insert(0, sys.argv[1]); import them_ma as t\n' +
    'd = {"v": 1, "ma": []}\n' +
    'for i, c in enumerate(json.loads(sys.argv[2])): t.add(d, c, "Người " + str(i), "ghi chú", "#" + str(i), datetime.date(2026, 11, 1 + i))\n' +
    'print(json.dumps(d, ensure_ascii=False))';
  const sample = execFileSync('python3', ['-c', py, path.join(SITE, 'tools'), JSON.stringify(good)], { encoding: 'utf8', maxBuffer: 64 << 20 });
  const errors = [];
  const open = async (hash, opts) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 860 } }, opts || {}));
    await ctx.route('**/data/cong_dong.json', (r) => r.fulfill({ contentType: 'application/json', body: sample }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(hash + ': ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/fonts|ERR_FAILED|net::/.test(m.text())) { errors.push(hash + ' console: ' + m.text()); } });
    await p.goto(base + '#' + hash);
    await p.waitForFunction(() => document.querySelectorAll('#kho-list .item').length > 0 || document.querySelector('.err'));
    return p;
  };
  const total = HINH.groups.reduce((s, g) => s + g.items.length, 0);
  let p = await open('kho');
  ok(await p.locator('#kho-list .item').count() === total, 'Kho hình: đủ ' + total + ' hình của ' + HINH.groups.length + ' nhóm');
  await p.fill('#kho-q', 'shiba');
  ok(await p.locator('#kho-list .item[data-id="thu/shiba"]').count() === 1, 'tìm "shiba" ra Chó Shiba');
  await p.fill('#kho-q', 'den long');
  ok(await p.locator('#kho-list .item').count() >= 2, 'tìm không dấu "den long" ra đèn lồng (' + await p.locator('#kho-list .item').count() + ' hình)');
  await p.fill('#kho-q', '');
  let opened = 0;
  for (const g of HINH.groups) {
    const it = g.items[0];
    await p.evaluate((h) => { location.hash = h; }, 'hinh/' + g.id + '/' + it.id);
    await p.waitForTimeout(60);
    const st = await p.evaluate(() => ({ open: document.getElementById('dlg').open, title: document.getElementById('dlg-title').textContent,
      art: document.querySelectorAll('#dlg-art canvas, #dlg-art img').length }));
    if (st.open && st.title === it.name && st.art === 1) { opened++; } else { console.log('    hộp lỗi: ' + g.id + '/' + it.id + ' ' + JSON.stringify(st)); }
  }
  ok(opened === HINH.groups.length, 'hộp chi tiết mở được hình đầu của cả ' + HINH.groups.length + ' nhóm (' + opened + ')');
  await p.keyboard.press('Escape');
  await p.waitForTimeout(80);
  ok(!(await p.evaluate(() => document.getElementById('dlg').open)) && /#kho/.test(p.url()), 'Esc đóng hộp, về Kho hình');
  await p.context().close();

  p = await open('cong-dong');
  const nCd = JSON.parse(sample).ma.length;
  ok(await p.locator('#cd-list .cd').count() === nCd, 'Mã cộng đồng: hiện đủ ' + nCd + ' mã thử');
  const firstId = JSON.parse(sample).ma[0].id;
  await p.evaluate((h) => { location.hash = h; }, 'ma/' + firstId);
  await p.waitForTimeout(80);
  ok(await p.evaluate(() => document.getElementById('dlg').open && document.querySelector('#dlg-extra .codebox').textContent.startsWith('KB1:')), 'mở một mã: hộp có hình + mã đầy đủ');
  await p.context().close();

  p = await open('xem-ma');
  await p.fill('#xm-in', '  ' + good[1].slice(0, 50) + '\n' + good[1].slice(50) + '  ');
  await p.click('#xm-go');
  await p.waitForSelector('#xm-out .result');
  ok(await p.locator('#xm-out .result h2').textContent() === cases.find((c) => c.code === good[1]).ok.name, 'Xem mã: mã bị xuống dòng vẫn xem được, đúng tên');
  await p.fill('#xm-in', good[1].slice(0, -1));
  await p.click('#xm-go');
  await p.waitForTimeout(100);
  ok(await p.isVisible('#xm-err') && /mã kiểm tra|thiếu/.test(await p.textContent('#xm-err')), 'Xem mã: mã cụt báo lỗi (' + await p.textContent('#xm-err') + ')');
  await p.context().close();

  p = await open('gui');
  await p.fill('#gui-ma', good[0]);
  await p.fill('#gui-ten', 'Mai');
  const href = await p.getAttribute('#gui-gh', 'href');
  const u = new URL(href);
  ok(u.pathname.endsWith('/issues/new') && u.searchParams.get('template') === 'chia_se_thiet_ke.yml' && u.searchParams.get('ma') === good[0] && u.searchParams.get('tac_gia') === 'Mai',
    'Gửi qua GitHub: mở mẫu issue, điền sẵn mã + tên');
  const tpl = fs.readFileSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'chia_se_thiet_ke.yml'), 'utf8');
  ok(['ma', 'tac_gia', 'ghi_chu'].every((id) => new RegExp('^\\s+id: ' + id + '$', 'm').test(tpl)), 'mẫu issue có đủ ô ma / tac_gia / ghi_chu (để điền sẵn)');
  ok((await p.getAttribute('#gui-mail', 'href') || '').startsWith('mailto:' + INFO.contact), 'Gửi qua email: thư tới địa chỉ liên hệ của add-on');
  await p.context().close();

  p = await open('bao-loi');
  const bl = await p.evaluate(() => ({ vis: !document.getElementById('tab-bao-loi').hidden, gh: document.getElementById('bl-gh').href,
    mail: document.getElementById('bl-mail').href, list: document.getElementById('bl-list').href }));
  ok(bl.vis && /\/issues\/new\?template=bao_loi\.yml$/.test(bl.gh) && bl.mail.startsWith('mailto:' + INFO.contact) && /label%3Abao-loi/.test(bl.list),
    'Báo lỗi: nút GitHub (mẫu bao_loi.yml), email, danh sách lỗi đã báo');
  const bug = fs.readFileSync(path.join(ROOT, '.github', 'ISSUE_TEMPLATE', 'bao_loi.yml'), 'utf8');
  ok(['loai', 'mo_ta', 'cac_buoc', 'bao_cao'].every((id) => new RegExp('^\\s+id: ' + id + '$', 'm').test(bug)) && /labels: \["bao-loi"\]/.test(bug),
    'mẫu issue Báo lỗi có ô loại / mô tả / các bước / báo cáo, nhãn bao-loi');
  await p.context().close();

  // ---- Giáng sinh 2026 (ngày giả trên máy người xem) ----
  const openAt = async (hash, day, opts) => {
    const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 860 } }, opts || {}));
    await ctx.addInitScript((t) => {
      const R = Date, off = new R(t).getTime() - R.now();
      window.Date = class extends R { constructor(...a) { if (a.length) { super(...a); } else { super(R.now() + off); } } static now() { return R.now() + off; } };
    }, day);
    await ctx.route('**/data/cong_dong.json', (r) => r.fulfill({ contentType: 'application/json', body: sample }));
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
    const pg = await ctx.newPage();
    pg.on('pageerror', (e) => errors.push(day + ' #' + hash + ': ' + e.message));
    await pg.goto(base + (hash ? '#' + hash : ''));
    await pg.waitForFunction(() => document.querySelectorAll('#kho-list .item').length > 0 || document.querySelector('.err'));
    await pg.waitForTimeout(150);
    return pg;
  };
  const cur = (pg) => pg.evaluate(() => { const a = document.querySelector('.tabs a[aria-current]'); return a ? a.getAttribute('data-tab') : ''; });
  const SECRET = HINH.groups.find((g) => g.id === 'giang_sinh').items.filter((it) => it.secret);
  ok(SECRET.length === EV.boxes && SECRET.every((it) => it.secret === EV.box_day), 'Kho hình: ' + SECRET.length + ' món trong hộp quà bí mật được đánh dấu (mở ' + EV.box_day + ')');
  const plan = [['2026-11-10T10:00', 'kho', /Còn \d+ ngày nữa là tới mùa/], ['2026-11-25T10:00', 'giang-sinh', /Còn 6 ngày nữa là mở ngăn đầu tiên/],
    ['2026-12-10T21:00', 'giang-sinh', /Hôm nay 10\/12: ngăn 10/], ['2026-12-27T08:00', 'giang-sinh', /Hộp quà dưới gốc cây đã mở được/], ['2027-01-03T09:00', 'kho', /đã qua/]];
  for (const [day, want, now] of plan) {
    p = await openAt('', day);
    const tab = await cur(p);
    await p.evaluate(() => { location.hash = 'giang-sinh'; });
    await p.waitForTimeout(80);
    const ev = await p.evaluate(() => ({ now: document.getElementById('ev-now').textContent, txt: document.getElementById('tab-giang-sinh').innerText,
      cur: (document.querySelector('#ev-time li.is-now') || {}).textContent || '', gifts: document.querySelectorAll('#ev-gifts .ev-gift').length,
      art: document.getElementById('ev-art').width }));
    const leak = SECRET.filter((it) => ev.txt.indexOf(it.name) >= 0).map((it) => it.name);
    ok(tab === want && now.test(ev.now) && ev.gifts === 5 && ev.art === 240 && !leak.length,
      day.slice(0, 10) + ': mở trang vào #' + tab + ', "' + ev.now + '", 5 nhóm quà, thiệp mẫu; không lộ quà trong hộp' + (leak.length ? ' — LỘ: ' + leak.join(', ') : ''));
    const khoTxt = await p.evaluate(() => { location.hash = 'kho/giang_sinh'; return new Promise((r) => setTimeout(() => r(document.getElementById('kho-list').innerText), 80)); });
    const shown = SECRET.filter((it) => khoTxt.indexOf(it.name) >= 0).length;
    ok(day < EV.box_day ? shown === 0 && /Quà bí mật/.test(khoTxt) : shown === SECRET.length,
      day.slice(0, 10) + ': Kho hình ' + (day < EV.box_day ? 'che 3 món trong hộp (hình bóng, "Quà bí mật")' : 'hiện đủ 3 món trong hộp') + ' — thấy ' + shown + '/' + SECRET.length);
    if (day < EV.box_day) {
      await p.fill('#kho-q', SECRET[1].name.slice(0, 7));
      const hits = await p.evaluate((ids) => ids.filter((id) => document.querySelector('#kho-list .item[data-id="giang_sinh/' + id + '"]')).length, SECRET.map((it) => it.id));
      await p.fill('#kho-q', SECRET[1].id.replace(/^le_/, ''));
      const hits2 = await p.locator('#kho-list .item').count();
      await p.fill('#kho-q', '');
      const ids = await p.evaluate(() => Array.from(document.querySelectorAll('#kho-list .item.secret')).map((b) => b.getAttribute('data-id')));
      const dlg = await p.evaluate((h) => { location.hash = h; return new Promise((r) => setTimeout(() => r([document.getElementById('dlg').open, document.getElementById('dlg-title').textContent]), 80)); }, 'hinh/giang_sinh/' + SECRET[0].id);
      const dlg2 = await p.evaluate((h) => { location.hash = h; return new Promise((r) => setTimeout(() => r(document.getElementById('dlg-title').textContent), 80)); }, 'hinh/' + ids[0]);
      ok(hits === 0 && hits2 === 0 && ids.length === SECRET.length && ids.every((x) => /^giang_sinh\/bi_mat_\d$/.test(x)) && !dlg[0] && dlg2 === 'Quà bí mật',
        'trước ' + EV.box_day + ': tìm theo tên / mã món không ra, đường dẫn dùng mã ẩn (' + ids.join(', ') + '), mã thật không mở, mã ẩn chỉ thấy "Quà bí mật"');
    }
    await p.context().close();
  }
  p = await openAt('giang-sinh', '2026-12-10T10:00');
  ok((await p.evaluate(() => document.querySelectorAll('#ev-time li').length)) === 7 && (await p.evaluate(() => document.querySelector('#ev-time li.is-now').getAttribute('data-k'))) === 'advent',
    'lịch 7 mốc, đánh dấu mốc đang diễn ra');
  const rules = await p.evaluate(() => document.getElementById('ev-rules').innerText);
  ok(rules.indexOf(EV.makeup_per + ' lượt') >= 0 && rules.indexOf('tối đa ' + EV.makeup_max) >= 0, 'luật mở bù lấy số từ add-on (' + EV.makeup_per + ' lượt, tối đa ' + EV.makeup_max + ' ngăn / ngày)');
  const gsum = await p.evaluate(() => Array.from(document.querySelectorAll('#ev-gifts h4')).map((h) => Number((h.textContent.match(/(\d+) ngăn/) || [])[1] || 0)).reduce((a, b) => a + b, 0));
  ok(gsum === EV.doors_n, 'quà theo nhóm đủ ' + gsum + '/' + EV.doors_n + ' ngăn');
  ok((await p.evaluate(() => document.querySelectorAll('#ev-music li').length)) === EV.music.length && EV.music.length >= 7, 'nhạc Giáng sinh: ' + EV.music.length + ' lựa chọn');
  await p.click('#ev-sample');
  await p.waitForSelector('#ev-out canvas');
  const out1 = await p.evaluate(() => { const c = document.querySelector('#ev-out canvas'); return [c.width, c.height, document.querySelectorAll('#ev-out .btn').length]; });
  ok(out1[0] === 480 && out1[1] === 320 && out1[2] === 3, 'Thử thiệp mẫu: thiệp 480 × 320, nút Tải ảnh PNG / Chép mã / Chép đường dẫn');
  const good1 = tcases.find((c) => c.ok && c.nhan.startsWith('đúng (')).code;
  await p.fill('#ev-code', '  ' + good1.slice(0, 30) + '\n' + good1.slice(30) + ' ');
  await p.click('#ev-go');
  await p.waitForTimeout(150);
  ok(await p.isHidden('#ev-err') && (await p.evaluate(() => document.querySelectorAll('#ev-out canvas').length)) === 1, 'mã bị xuống dòng vẫn xem được');
  await p.fill('#ev-code', good1.slice(0, -2));
  await p.click('#ev-go');
  await p.waitForTimeout(150);
  ok(await p.isVisible('#ev-err') && !(await p.evaluate(() => document.querySelectorAll('#ev-out canvas').length)), 'mã cụt: báo lỗi (' + await p.textContent('#ev-err') + ')');
  await p.context().close();
  p = await openAt('thiep/' + good1, '2026-12-20T10:00');
  ok(await cur(p) === 'giang-sinh' && (await p.evaluate(() => document.querySelectorAll('#ev-out canvas').length)) === 1 && (await p.inputValue('#ev-code')) === good1,
    'đường dẫn #thiep/<mã>: mở mục Giáng sinh, hiện thiệp');
  await p.context().close();

  for (const hash of ['giang-sinh', 'thiep/' + good1, 'kho', 'cong-dong', 'xem-ma', 'gui', 'bao-loi', 'hinh/canh/beach']) {
    p = await open(hash, { viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(over <= 0, 'điện thoại 360 px, #' + hash + ': không cuộn ngang' + (over > 0 ? ' (thừa ' + over + ' px)' : ''));
    await p.context().close();
  }
  ok(errors.length === 0, 'không lỗi JS' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  srv.close();
  await browser.close();
  const pass = results.filter(Boolean).length;
  console.log('KẾT QUẢ: ' + pass + '/' + results.length + (pass === results.length ? ' — TẤT CẢ OK' : ' — CÓ LỖI'));
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
