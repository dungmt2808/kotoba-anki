// Trang web chung (site/): kiểm tra bằng Chromium (Playwright) — không cần Anki, không ra mạng (trừ font Google của trang).
//   1. Bảng màu Xưởng (Python) = bảng màu add-on dùng để vẽ món / vùng tự làm (home.js P).
//   2. Nền vùng tự tạo của trang (site/ve.js KB.zoneBg) giống từng điểm ảnh với hàm của add-on (GardenHome.zoneBgCanvas):
//      8 kiểu nền × 16 cặp màu đất / đồi.
//   3. Giải mã KB1 trên trình duyệt (KB.decode) ra đúng như add-on (share.parse_code): mã ngẫu nhiên đúng / hỏng / cắt cụt /
//      xuống dòng / dữ liệu sai bên trong (tests/trang/ma_thu.py).
//   4. Chạy cả trang (máy chủ tạm): đủ số hình, mở hộp chi tiết của mọi nhóm, Mã cộng đồng (dữ liệu thử từ them_ma.py),
//      Xem mã đúng / hỏng, liên kết Gửi qua GitHub, điện thoại không cuộn ngang, không lỗi JS.
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

  for (const hash of ['kho', 'cong-dong', 'xem-ma', 'gui', 'bao-loi', 'hinh/canh/beach']) {
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
