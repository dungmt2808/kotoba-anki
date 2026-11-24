// 1.36.1 (Chromium, web/*.js + garden.css thật của add-on): thiệp, cảnh đêm 24, thư, cất đồ, Kỷ niệm.
//   A. vẽ thiệp: 4 khung × mặt trước / sau × ảnh PNG (chữ ことば畑) × đã treo / ông đã nhận; mọi sticker có sẵn + món tủ lịch +
//      40 món của vườn + id lạ (bỏ qua, không lỗi); ảnh PNG 480 × 320, có chữ ở góc;
//   B. xưởng thiệp ở cửa sổ 1366 / 1024 / 800 / 600: không tràn ngang, canvas nằm trong bảng; thêm sticker tới 12 (cái 13 báo),
//      To / nhỏ chỉ hình nhỏ, Lật, Lên trên, Bỏ; tự lưu sau 0,8 giây (một lệnh le:card đúng JSON); thiệp ông đã nhận → chỉ xem;
//      Esc từng lớp (rời ô nhập → bỏ chọn sticker → đóng + lưu nốt);
//   C. cảnh đêm 24: 7 kiểu sân (không cây, cây sát mép trái / phải, hàng sau, hai cây, nhà chưa xây, sân kín) — xe đáp trong sân,
//      không đè nhà; vẽ mọi khung 0 → 13,2 giây không lỗi (cả Dịu mắt); trời đêm giữ trong lúc chiếu, trả lại khi đóng; nhạc
//      Silent Night chỉ trong lúc chiếu; Bỏ qua → "le:seen" một lần;
//   D. thư: lời chào + ký tên theo Ngôn ngữ trong vườn (7 tiếng), trích điều ước; mở thư → "le:read"; cất đồ: danh sách đúng;
//   E. tự mở: cảnh đêm (due) / thư (morning) / cất đồ (giữ tới lúc hiện dù lần vẽ sau không còn báo) — không mở khi bảng khác
//      đang mở; F. cây: thiệp nhỏ trên cây tới lúc ông ghé, thư dưới gốc khi chưa đọc, không vẽ hai thứ đó lúc đang chiếu cảnh;
//   G. Album → Kỷ niệm: có / không dữ liệu, thiệp nhận, xem trước mã, không lỗi.
// Chạy: node test_1361.js ADDON  (cần Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]);
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const FILES = ['diag', 'prefs', 'fix', 'icons', 'sky', 'season', 'fx', 'music', 'games', 'fields', 'glang', 'season_art', 'rare_art',
  'nha_art', 'pets', 'guests', 'finds_art', 'finds', 'le_art', 'le_card', 'le_noel', 'le', 'life', 'joy', 'ui', 'home'];

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1366, height: 860 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  const css = fs.readFileSync(path.join(ADDON, 'web', 'garden.css'), 'utf8');
  await pg.setContent('<html><head><style>' + css + '</style></head><body><div id="kb-app"><div id="kb-scene-bar"></div><div id="kb-today"><div class="kb-today-list"></div></div></div><canvas id="c"></canvas></body></html>');
  for (const f of FILES) {
    let src = fs.readFileSync(path.join(ADDON, 'web', f + '.js'), 'utf8');
    if (f === 'home') { src = src.replace('_lib: () => ({ SPR,', '_lib: () => ({ drawOutdoor, YARD, setH: (h) => { H = h; }, SPR,'); }
    await pg.addScriptTag({ content: src });
  }
  await pg.evaluate(() => {
    const CARD = { f: 'den', st: [{ s: 'xmastree', x: 6, y: 22 }, { s: 'stackchan', x: 86, y: 43 }], t1: 'Giáng sinh an lành!', t2: '— Lan', c: 'ja', w: 'Ước gì học giỏi', wl: 'vi', at: '2026-12-10T10:00:00' };
    const le = {
      active: true, phase: 'advent', year: 2026, today: '2026-12-10', day: 10, parts: ['wreath', 'red', 'yellow', 'garland', 'blue', 'lights'],
      doors: Array.from({ length: 24 }, (_, i) => ({ d: i + 1, state: i < 10 ? 'open' : 'future', kind: 'cay', name: 'x', item: '', part: 'red', at: '2026-12-01', tiles: i === 7 ? ['w_noeltuyet', 'w_noelkeo', 'w_noeldo'] : [] })),
      opened: 10, boxes: [], chip: true, names: { le_tuanloc: 'Tuần lộc đèn', le_banhquy: 'Bàn nhỏ bánh quy + sữa' }, gift: { tulich: '2026-12-01' },
      cards: [JSON.parse(JSON.stringify(CARD)), null, null], hang: -1, taken: -1, card_edit: true, hang_edit: true,
      santa: { came: false, due: false, morning: false, seen: '', read: '' }, eaten: false, letter: null, pack: null, recv: [], fix_left: 5,
      frames: [{ id: 'den', name: 'Đèn nháy' }, { id: 'tuyet', name: 'Tuyết trắng' }, { id: 'thong', name: 'Cành thông' }, { id: 'qua', name: 'Giấy quà' }],
      chuc: { vi: 'Giáng sinh an lành', ja: 'メリークリスマス', en: 'Merry Christmas', zh: '圣诞快乐', ko: '메리 크리스마스', de: 'Frohe Weihnachten', fr: 'Joyeux Noël' },
      stickers: ['le_tulich', 'le_caynho', 'le_tat'], limits: { t1: 28, t2: 28, wish: 160, stickers: 12, cards: 3 }
    };
    const owned = {}; Object.keys(GardenHome._lib().SPR).filter((k) => /^[a-z][a-z0-9_]*$/.test(k) && k.indexOf('le_') !== 0).slice(0, 40).forEach((k) => { owned[k] = 1; });
    window.__data = { wallet: { home: { house: 7, style: 'classic', rooms: [], yard: [{ id: 'xmastree', x: 6, y: 2 }], room: [], owned: owned, zones: [] }, more: { zones: [] } },
      catalog: { items: [{ id: 'xmastree', w: 2 }], themes: [], rooms: [] }, le: le, fx: { effects: true } };
    window.__sent = [];
    window.__CARD = CARD;
    const H = { data: () => window.__data, send: (c) => window.__sent.push(c), toast: () => {} };
    GardenHome._lib().setH(H); GardenLe.init(H);
  });

  console.log('== A. vẽ thiệp');
  const A = await pg.evaluate(() => {
    const R = { err: [] }, L = GardenHome._lib();
    const ids = ['xmastree', 'presents', 'yukidaruma', 'stackchan', 'wreath', 'sleigh', 'khong_co_hinh'].concat(Object.keys(GardenLeArt.ITEMS)).concat(Object.keys(L.SPR).slice(0, 40));
    const st = ids.map((s, i) => ({ s: s, x: (i * 13) % 120 - 10, y: (i * 7) % 80 - 10, m: i % 2, z: i % 5 === 0 ? 2 : undefined }));
    ['den', 'tuyet', 'thong', 'qua'].forEach((f) => [false, true].forEach((back) => [false, true].forEach((mark) => [[false, false], [true, false], [false, true]].forEach(([hung, taken]) => {
      try {
        const cv = document.createElement('canvas'); cv.width = 480; cv.height = 320;
        GardenLeCard.drawCard(cv.getContext('2d'), 4, Object.assign({}, window.__CARD, { f: f, st: st, t1: 'WWWWWWWWWWWWWWWWWWWWWWWWWWWW', w: 'Điều ước rất dài '.repeat(12) }), { back: back, mark: mark, hung: hung, taken: taken, sel: 3 });
      } catch (e) { R.err.push(f + back + mark + ': ' + e.message); }
    }))));
    R.n = st.length;
    R.sizes = ['xmastree', 'presents', 'yukidaruma', 'stackchan', 'wreath', 'sleigh'].map((s) => GardenLeCard._stickerSize({ s: s, x: 0, y: 0 }));
    R.unknown = GardenLeCard._stickerSize({ s: 'khong_co_hinh', x: 0, y: 0 });
    const url = GardenLeCard._png(window.__CARD), img = new Image();
    R.pngHead = url.slice(0, 22);
    // chữ ことば畑 ở góc dưới trái: ảnh PNG khác ảnh không chữ ở vùng đó
    const a = document.createElement('canvas'), b2 = document.createElement('canvas');
    a.width = b2.width = 480; a.height = b2.height = 320;
    GardenLeCard.drawCard(a.getContext('2d'), 4, window.__CARD, { mark: true });
    GardenLeCard.drawCard(b2.getContext('2d'), 4, window.__CARD, {});
    const da = a.getContext('2d').getImageData(10, 280, 120, 30).data, db = b2.getContext('2d').getImageData(10, 280, 120, 30).data;
    let diff = 0; for (let i = 0; i < da.length; i++) { if (da[i] !== db[i]) { diff++; } }
    R.markDiff = diff;
    void img;
    return R;
  });
  ok(!A.err.length, '4 khung × 2 mặt × ảnh / không × treo / đã nhận, ' + A.n + ' sticker (cả id lạ, lật, phóng to): không lỗi' + (A.err.length ? ' — ' + A.err[0] : ''));
  ok(A.sizes.every((s) => s && s[0] > 0 && s[1] > 0) && A.unknown === null, '6 sticker có sẵn có cỡ; id lạ → bỏ qua: ' + JSON.stringify(A.sizes));
  ok(A.pngHead === 'data:image/png;base64,' && A.markDiff > 50, 'ảnh PNG có chữ ことば畑 ở góc (khác ' + A.markDiff + ' điểm)');

  console.log('== B. xưởng thiệp');
  for (const [w, h] of [[1366, 860], [1024, 700], [800, 600], [600, 700]]) {
    await pg.setViewportSize({ width: w, height: h });
    const r = await pg.evaluate(() => {
      GardenLeCard.open(0);
      const pop = document.getElementById('kb-le-cardpop'), cv = document.getElementById('kb-le-cardcv');
      const pr = pop.getBoundingClientRect(), cr = cv.getBoundingClientRect();
      const over = Array.from(pop.querySelectorAll('*')).filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > pr.right + 1; }).map((e) => e.id || e.className).slice(0, 3);
      const res = { inWin: pr.left >= 0 && pr.right <= innerWidth + 1, scrollX: pop.scrollWidth <= pop.clientWidth + 1, canvasIn: cr.left >= pr.left && cr.right <= pr.right, over: over };
      GardenLeCard.close();
      return res;
    });
    ok(r.inWin && r.scrollX && r.canvasIn && !r.over.length, 'cửa sổ ' + w + ' × ' + h + ': bảng trong cửa sổ, không tràn ngang, canvas trong bảng' + (r.over.length ? ' — ' + r.over.join(',') : ''));
  }
  await pg.setViewportSize({ width: 1366, height: 860 });
  const B = await pg.evaluate(async () => {
    const R = {};
    window.__sent.length = 0;
    GardenLeCard.open(0);
    for (let i = 0; i < 12; i++) { GardenLeCard._add('presents'); }
    R.count = GardenLeCard._draft().st.length;
    R.note = document.getElementById('kb-le-cnote').textContent;
    const big = GardenLeCard._draft().st.findIndex((s) => s.s === 'xmastree');
    GardenLeCard._sel(big); GardenLeCard._selAct('size');
    R.bigZ = GardenLeCard._draft().st[big].z || 1;
    const small = GardenLeCard._draft().st.length - 1;
    GardenLeCard._sel(small); GardenLeCard._selAct('size'); GardenLeCard._selAct('flip');
    R.small = JSON.stringify(GardenLeCard._draft().st[small]);
    GardenLeCard._sel(0); GardenLeCard._selAct('up');
    R.upLast = GardenLeCard._draft().st[GardenLeCard._draft().st.length - 1].s;
    GardenLeCard._selAct('del');
    R.afterDel = GardenLeCard._draft().st.length;
    R.dirtyNow = GardenLeCard._dirty();
    await new Promise((r) => setTimeout(r, 1000));
    R.dirty = GardenLeCard._dirty();
    R.sent = window.__sent.filter((c) => c.indexOf('le:card:') === 0);
    try { R.payload = JSON.parse(R.sent[R.sent.length - 1].slice(8)); } catch (e) { R.payload = null; }
    // không có trả lời (lệnh bị bỏ lúc Anki đang đồng bộ) → 6 giây sau gửi lại
    await new Promise((r) => setTimeout(r, 7600));
    R.resent = window.__sent.filter((c) => c.indexOf('le:card:') === 0).length;
    window.__sent.length = 0;
    GardenLeCard.result({ act: 'card', ok: true, i: 0, rid: 999, at: 'x' });
    // Esc từng lớp
    GardenLeCard._sel(0);
    const t1 = document.getElementById('kb-le-t1'); t1.focus();
    const esc = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    esc(); R.esc1 = document.activeElement !== t1 && !document.getElementById('kb-le-cardpop').hidden;
    esc(); R.esc2 = !document.getElementById('kb-le-cardpop').hidden && document.getElementById('kb-le-selbar').hidden;
    t1.value = 'Sửa rồi đóng ngay'; t1.dispatchEvent(new Event('input'));
    window.__sent.length = 0;
    esc(); R.esc3 = document.getElementById('kb-le-cardpop').hidden;
    R.flushOnClose = window.__sent.some((c) => c.indexOf('le:card:') === 0 && c.indexOf('Sửa rồi đóng ngay') > 0);
    // thiệp ông đã nhận: chỉ xem
    Object.assign(window.__data.le, { hang: 0, taken: 0, hang_edit: false, santa: { came: true, due: false, morning: false } });
    GardenLeCard.open(0);
    R.ro = document.getElementById('kb-le-t1').readOnly && document.getElementById('kb-le-stk').hidden && document.getElementById('kb-le-hang').hidden && document.getElementById('kb-le-cdel').hidden
      && !document.getElementById('kb-le-png').hidden && /mang thiệp này đi/.test(document.getElementById('kb-le-cnote').textContent);
    const n0 = GardenLeCard._draft().st.length; GardenLeCard._add('presents'); R.roAdd = GardenLeCard._draft().st.length === n0;
    GardenLeCard.close();
    Object.assign(window.__data.le, { hang: -1, taken: -1, hang_edit: true, santa: { came: false, due: false, morning: false } });
    return R;
  });
  ok(B.count === 12 && /tối đa 12/.test(B.note), 'thêm tới 12 sticker, cái thứ 13 báo: ' + B.note);
  ok(B.bigZ === 1 && /"z":2/.test(B.small) && /"m":1/.test(B.small), 'To / nhỏ chỉ hình nhỏ (cây thông giữ cỡ), Lật');
  ok(B.upLast === 'xmastree' && B.afterDel === 11, 'Lên trên (vẽ sau cùng), Bỏ');
  ok(B.dirtyNow === true && B.dirty === false && B.sent.length === 1 && B.payload && B.payload.i === 0 && B.payload.card.st.length === 11, 'tự lưu sau 0,8 giây: đúng một lệnh le:card (' + B.sent.length + ')');
  ok(B.resent >= 2, 'lần lưu không được trả lời (đang đồng bộ) → tự gửi lại (' + B.resent + ' lệnh)');
  ok(B.esc1 && B.esc2 && B.esc3, 'Esc: rời ô nhập → bỏ chọn sticker → đóng bảng');
  ok(B.flushOnClose, 'sửa rồi Esc đóng ngay → vẫn lưu nốt');
  ok(B.ro && B.roAdd, 'thiệp ông già Noel đã nhận: chỉ xem / lưu ảnh / chép mã, không thêm sticker');

  console.log('== C. cảnh đêm 24');
  const C = await pg.evaluate(async () => {
    const R = { cfg: [], err: [] };
    const yards = {
      'không cây': { house: 7, yard: [] },
      'cây sát trái': { house: 7, yard: [{ id: 'xmastree', x: 4, y: 2 }] },
      'cây sát phải': { house: 7, yard: [{ id: 'xmastree', x: 14, y: 2 }] },
      'cây hàng sau': { house: 7, yard: [{ id: 'xmastree', x: 9, y: 0 }] },
      'hai cây': { house: 7, yard: [{ id: 'xmastree', x: 5, y: 0 }, { id: 'xmastree', x: 10, y: 2 }] },
      'chưa xây nhà': { house: 0, yard: [{ id: 'xmastree', x: 7, y: 1 }] },
      'sân kín': { house: 7, yard: [].concat(...[0, 1, 2].map((y) => Array.from({ length: 12 }, (_, i) => ({ id: i === 5 && y === 2 ? 'xmastree' : 'fence', x: 4 + i, y: y })))) }
    };
    const music = []; const f0 = GardenMusic.force; GardenMusic.force = (id) => { music.push(id); };
    Object.assign(window.__data.le, { santa: { came: true, due: true, morning: false, seen: '', read: '' }, hang: 0, taken: 0 });
    for (const [name, y] of Object.entries(yards)) {
      Object.assign(window.__data.wallet.home, { house: y.house, yard: y.yard });
      const p = GardenLeNoel._plan();
      R.cfg.push({ name: name, land: p.land, target: p.target, tree: !!p.tree, base: p.base });
      for (const still of [false, true]) {
        window.__data.fx.effects = !still;
        GardenLeNoel.play('auto');
        for (let t = 0; t <= GardenLeNoel._T.end; t += 200) {
          GardenLeNoel._seek(t);
          await new Promise((r) => setTimeout(r, 0));
          if ((window.__errs || []).length) { break; }
        }
        R.holding = R.holding === undefined ? GardenSky.holding() : R.holding && GardenSky.holding();
        GardenLeNoel._finish();
        GardenLeNoel.closeShow();
      }
    }
    window.__data.fx.effects = true;
    R.released = !GardenSky.holding();
    R.music = music.slice(0, 4);
    R.seen = window.__sent.filter((c) => c === 'le:seen').length;
    GardenMusic.force = f0;
    Object.assign(window.__data.wallet.home, { house: 7, yard: [{ id: 'xmastree', x: 6, y: 2 }] });
    return R;
  });
  ok(C.cfg.every((c) => c.land >= 60 && c.land + 34 <= 256 && c.target >= 0 && c.target <= 250 && c.base >= 44 && c.base <= 76),
    '7 kiểu sân: xe đáp trong sân, không đè nhà (x ≥ 60): ' + C.cfg.map((c) => c.name + '@' + c.land).join(', '));
  ok(!errs.length, 'vẽ mọi khung 0 → 13,2 giây × 7 kiểu sân × hiệu ứng bật / Dịu mắt: không lỗi' + (errs.length ? ' — ' + errs[0] : ''));
  ok(C.holding && C.released, 'trời đêm giữ trong lúc chiếu, trả lại khi đóng');
  ok(C.music[0] === 'silent' && C.music[1] === null, 'Silent Night trong lúc chiếu, thôi khi đóng: ' + JSON.stringify(C.music));
  ok(C.seen === 1, '"le:seen" gửi một lần (' + C.seen + ')');

  console.log('== D. thư, cất đồ');
  const D = await pg.evaluate(() => {
    const R = { greet: {} };
    const G = { vi: 'Gửi cháu yêu,', ja: 'メリークリスマス！', en: 'Merry Christmas!', zh: '圣诞快乐！', ko: '메리 크리스마스!', de: 'Frohe Weihnachten!', fr: 'Joyeux Noël !' };
    const S = { vi: 'Ông già Noel', ja: 'サンタクロースより', en: 'Love, Santa', zh: '圣诞老人', ko: '산타 할아버지가', de: 'Dein Weihnachtsmann', fr: 'Le Père Noël' };
    Object.assign(window.__data.le, { phase: 'after', santa: { came: true, due: false, morning: true, seen: 'x', read: '' }, hang: 0, taken: 0,
      letter: { greet: G, sign: S, body: ['Đêm qua ông ghé vườn của cháu.'], wish: 'Ước gì học giỏi', wl: 'vi', date: '25/12/2026', card: 0 }, boxes: [{ n: 1, can: true, opened: false, d: 6, shake: ['', ''] }] });
    const cur0 = GardenLang.cur;
    Object.keys(G).forEach((lg) => {
      GardenLang.cur = () => lg;
      GardenLeNoel.openLetter();
      const t = document.getElementById('kb-le-letter').textContent;
      R.greet[lg] = t.indexOf(G[lg]) >= 0 && t.indexOf(S[lg]) >= 0 && t.indexOf('Ước gì học giỏi') >= 0 && !!document.querySelector('#kb-le-letter .kb-le-letter-card');
    });
    GardenLang.cur = cur0;
    R.read = window.__sent.filter((c) => c === 'le:read').length > 0;
    R.boxBtn = /Mở hộp quà/.test(document.getElementById('kb-le-letter').textContent);
    document.getElementById('kb-le-letter').hidden = true;
    GardenLeNoel.openPack({ at: '2027-01-01', items: { le_tuanloc: 2, le_banhquy: 1 }, tiles: [['room', 'wall', 'w_noelkeo', 'w_go'], ['kitchen', 'floor', 'f_noellen', '']] });
    R.pack = Array.from(document.querySelectorAll('#kb-le-packpop li')).map((li) => li.textContent);
    document.getElementById('kb-le-packpop').hidden = true;
    return R;
  });
  ok(Object.values(D.greet).every(Boolean), 'thư: lời chào + ký tên đúng 7 tiếng của vườn, trích điều ước, có hình thiệp: ' + JSON.stringify(D.greet));
  ok(D.read && D.boxBtn, 'mở thư → "le:read"; còn hộp quà → nút "Mở hộp quà ▸"');
  ok(D.pack.length === 5 && /Tuần lộc đèn × 2/.test(D.pack[1]) && /Phòng chính: tường về mẫu dùng trước đó/.test(D.pack[3]) && /Bếp: sàn về theo kiểu nhà/.test(D.pack[4]),
    'cất đồ: ' + D.pack.join(' | '));

  console.log('== E. tự mở');
  const E = await pg.evaluate(async () => {
    const R = {}, wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const shown = (id) => { const e = document.getElementById(id); return !!(e && !e.hidden); };
    // cảnh đêm (due) — đang mở xưởng thiệp thì chờ
    Object.assign(window.__data.le, { phase: 'advent', today: '2026-12-24', santa: { came: true, due: true, morning: false, seen: '', read: '' }, letter: null });
    GardenLeCard.open(0);
    GardenLe.render(window.__data);
    await wait(1600);
    R.waitBusy = !shown('kb-le-show');
    GardenLeCard.close();
    await wait(1200);
    R.showAuto = shown('kb-le-show');
    GardenLeNoel._finish(); GardenLeNoel.closeShow();
    // thư (morning)
    Object.assign(window.__data.le, { phase: 'after', today: '2026-12-25', santa: { came: true, due: false, morning: true, seen: 'x', read: '' },
      letter: { greet: { vi: 'a' }, sign: { vi: 'b' }, body: ['c'], wish: '', date: '25/12/2026', card: -1 } });
    GardenLe.render(window.__data);
    await wait(1600);
    R.letterAuto = shown('kb-le-letter');
    document.getElementById('kb-le-letter').hidden = true;
    // cất đồ: lần vẽ đầu có welcome.pack, lần vẽ sau (Python dựng lại) không còn → vẫn hiện
    Object.assign(window.__data.le, { phase: 'done', today: '2027-01-01', santa: { came: true, due: false, morning: false, seen: 'x', read: 'y' }, letter: null,
      welcome: { pack: { at: '2027-01-01', items: { le_tuanloc: 1 }, tiles: [] } } });
    GardenLe.render(window.__data);
    delete window.__data.le.welcome;
    GardenLe.render(window.__data);
    await wait(1600);
    R.packAuto = shown('kb-le-packpop');
    document.getElementById('kb-le-packpop').hidden = true;
    GardenLe.render(window.__data);
    await wait(1600);
    R.packOnce = !shown('kb-le-packpop');
    return R;
  });
  ok(E.waitBusy && E.showAuto, 'cảnh đêm: chờ xưởng thiệp đóng rồi mới tự chiếu');
  ok(E.letterAuto, 'thư sáng 25 tự mở');
  ok(E.packAuto && E.packOnce, 'cất đồ: hiện dù lần dựng lại sau không còn báo; hiện một lần');

  console.log('== F. cây ở sân: thiệp nhỏ, thư dưới gốc');
  const F = await pg.evaluate(() => {
    const R = {}, A = GardenLeArt, calls = [];
    const p0 = A.paint; A.paint = function (ctx, rows) { calls.push(rows === A.CARD_MINI ? 'card' : rows === A.LETTER ? 'letter' : 'x'); return p0.apply(this, arguments); };
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const run = (o) => { Object.assign(window.__data.le, o); calls.length = 0; GardenLe.drawTreeExtra(ctx, 2, 10, 10, {}, Date.now()); return calls.filter((c) => c !== 'x').join(','); };
    const base = { active: true, phase: 'advent', boxes: [] };
    R.hung = run(Object.assign({}, base, { hang: 0, santa: { came: false }, letter: null }));
    R.notHung = run(Object.assign({}, base, { hang: -1, santa: { came: false }, letter: null }));
    R.came = run(Object.assign({}, base, { phase: 'after', hang: 0, santa: { came: true, read: '' }, letter: { body: [] } }));
    R.read = run(Object.assign({}, base, { phase: 'after', hang: 0, santa: { came: true, read: '2026-12-25' }, letter: { body: [] } }));
    Object.assign(window.__data.le, { santa: { came: true, due: false, morning: false } });
    GardenLeNoel.play('replay');
    R.showing = run(Object.assign({}, base, { phase: 'after', hang: 0, santa: { came: true, read: '' }, letter: { body: [] } }));
    GardenLeNoel._finish(); GardenLeNoel.closeShow();
    A.paint = p0;
    R.eaten = (Object.assign(window.__data.le, { eaten: true, phase: 'after' }), GardenLe.eaten()) && !(Object.assign(window.__data.le, { phase: 'done' }), GardenLe.eaten());
    return R;
  });
  ok(F.hung === 'card' && F.notHung === '', 'thiệp treo → thiệp nhỏ trên cây (chưa treo → không)');
  ok(F.came === 'letter' && F.read === '', 'ông đã ghé: thiệp không còn trên cây; thư dưới gốc tới lúc đọc');
  ok(F.showing === '', 'đang chiếu cảnh → cây không tự vẽ thiệp / thư (cảnh vẽ theo thời gian)');
  ok(F.eaten, 'bánh quy còn vụn từ lúc ông ghé tới lúc cất đồ (1/1 thôi)');

  console.log('== G. Album → Kỷ niệm');
  const G = await pg.evaluate(() => {
    const R = {};
    const list = document.createElement('div'); list.className = 'kb-h-list'; document.body.appendChild(list);
    Object.assign(window.__data.le, { phase: 'after', opened: 10, cards: [window.__CARD, null, null], recv: [{ k: 'KBC1:x', at: '2026-12-20', card: Object.assign({}, window.__CARD, { f: 'thong' }) }],
      letter: { greet: { vi: 'a' }, sign: { vi: 'b' }, body: ['c'], wish: '', date: '', card: -1 }, santa: { came: true, read: 'x', seen: 'x' }, pack: { at: '2027-01-01', items: {}, tiles: [] } });
    R.has = GardenLeNoel.hasAlbum();
    GardenLeNoel.album(list);
    R.thumbs = list.querySelectorAll('.kb-le-cthumb').length;
    R.btns = Array.from(list.querySelectorAll('button')).map((b) => b.textContent);
    list.textContent = '';
    window.__data.le = Object.assign({}, window.__data.le, { opened: 0, cards: [null, null, null], recv: [], gift: {} });
    R.empty = GardenLeNoel.hasAlbum();
    window.__data.le = null;
    R.none = GardenLeNoel.hasAlbum();
    return R;
  });
  ok(G.has && G.thumbs === 2 && ['Mở tủ lịch ▸', 'Thư của ông già Noel ▸', 'Xem lại đêm 24 ▸', 'Đồ Noel đã cất ▸', 'Xem thiệp'].every((t) => G.btns.indexOf(t) >= 0),
    'Kỷ niệm: tủ lịch, thư, xem lại đêm 24, đồ đã cất, 1 thiệp của bạn + 1 thiệp nhận, ô dán mã');
  ok(!G.empty && !G.none, 'chưa dùng sự kiện / tắt → không có chip Kỷ niệm');
  ok(!errs.length, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));

  await b.close();
  const n = results.filter(Boolean).length;
  console.log(`\nKẾT QUẢ: ${n}/${results.length}`);
  process.exit(n === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
