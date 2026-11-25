// 1.36.3 (Chromium, web/*.js + garden.css thật của add-on): vẽ tay cho Giáng sinh — người dùng duyệt ảnh phác 25/11.
//   A. Xưởng thiệp → thẻ "✎ Vẽ": kéo chuột trên thiệp là vẽ (không kéo sticker), bút cỡ 1 / 2 / 3, tẩy, đổi màu, hoàn tác (cả
//      Ctrl+Z), Xoá hình vẽ (hỏi trước); hình vẽ = "d" của thiệp (nén như le_core._px_encode), tự lưu le:card + le:keep mang "d";
//      thứ tự lớp: sticker < hình vẽ < viền khung + chữ; vẽ dày quá giới hạn → nét vừa vẽ bị trả lại + báo; đồng hồ "Mã thiệp: N";
//      thẻ khác (Có sẵn) vẫn kéo sticker như cũ;
//   B. Quả châu tự vẽ: mở từ tủ lịch, vẽ ô 8 × 8 bằng chuột, quả mới vẽ tự treo, treo / gỡ, hoàn tác, đổi quả, tự lưu le:orn + le:keep,
//      Anki đang đồng bộ → gửi lại khi vườn dựng lại; xem trước trên cây; sau mùa chỉ xem;
//   C. Cây thông ngoài sân: quả châu đang treo vẽ đúng 3 chỗ (đúng màu từng điểm), quả chưa treo không vẽ; Album → Kỷ niệm có quả châu;
//   D. Esc đóng bảng quả châu, phím tắt màn chính không chạy khi bảng mở.
// Chạy: node test_1363.js ADDON  (cần Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]);
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const FILES = ['diag', 'prefs', 'fix', 'icons', 'sky', 'season', 'fx', 'music', 'games', 'fields', 'glang', 'season_art', 'rare_art',
  'nha_art', 'pets', 'guests', 'finds_art', 'finds', 'le_art', 'le_card', 'le_orn', 'le_noel', 'le', 'life', 'joy', 'ui', 'home'];
const PAL = JSON.parse(execFileSync('python3', ['-c', 'import sys, json; sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2]); import garden_core as c; print(json.dumps(c.CRAFT_PALETTE))',
  ADDON, path.join(__dirname, '..', 'stubs')], { encoding: 'utf8' }));

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
  await pg.evaluate((pal) => {
    const CARD = { f: 'den', st: [{ s: 'xmastree', x: 6, y: 22 }], t1: 'Giáng sinh an lành!', t2: '', c: '', w: '', wl: 'vi', at: '2026-12-10T10:00:00' };
    const le = {
      active: true, phase: 'advent', year: 2026, today: '2026-12-10', day: 10, parts: ['wreath', 'red', 'yellow', 'garland', 'blue', 'lights'],
      doors: Array.from({ length: 24 }, (_, i) => ({ d: i + 1, state: i < 9 ? 'open' : 'future', kind: 'cay', name: 'x', item: '', part: 'red', at: '2026-12-01', tiles: [] })),
      opened: 9, boxes: [], chip: true, names: {}, gift: { tulich: '2026-12-01' }, makeup: { left: 0 },
      cards: [CARD, null, null], hang: -1, taken: -1, card_edit: true, hang_edit: true,
      santa: { came: false, due: false, morning: false, seen: '', read: '' }, eaten: false, letter: null, pack: null, recv: [], fix_left: 5,
      frames: [{ id: 'den', name: 'Đèn nháy' }, { id: 'tuyet', name: 'Tuyết trắng' }, { id: 'thong', name: 'Cành thông' }, { id: 'qua', name: 'Giấy quà' }],
      chuc: { vi: 'Giáng sinh an lành', ja: 'メリークリスマス' }, stickers: ['le_tulich'], limits: { t1: 28, t2: 28, wish: 160, stickers: 12, cards: 3 },
      orn: [null, null, null], orn_edit: true, orn_spots: [[4, 24], [20, 27], [12, 12]], code_max: 6000, d_max: 12000, draw_pal: pal
    };
    window.__data = { wallet: { home: { house: 7, style: 'classic', rooms: [], yard: [{ id: 'xmastree', x: 6, y: 2 }], room: [], owned: { xmastree: 1 }, zones: [] }, more: { zones: [] } },
      catalog: { items: [{ id: 'xmastree', w: 2 }], themes: [], rooms: [] }, le: le, fx: { effects: true } };
    window.__sent = [];
    const H = { data: () => window.__data, send: (c) => window.__sent.push(c), toast: () => {}, closeOthers: () => {} };
    GardenHome._lib().setH(H); GardenLe.init(H);
    if (typeof GardenUI !== 'undefined' && GardenUI.init) { try { GardenUI.init(H); } catch (e) { /* bỏ qua */ } }
    // kéo chuột trên một canvas theo toạ độ điểm ảnh của nó (thiệp 120 × 80 / lưới 8 × 8)
    window.__drag = (id, pts, w, h) => {
      const cv = document.getElementById(id), r = cv.getBoundingClientRect();
      const at = (p, b) => ({ clientX: r.left + (p[0] + 0.5) * r.width / w, clientY: r.top + (p[1] + 0.5) * r.height / h, bubbles: true, button: 0, buttons: b });
      cv.dispatchEvent(new MouseEvent('mousedown', at(pts[0], 1)));
      pts.slice(1).forEach((p) => window.dispatchEvent(new MouseEvent('mousemove', at(p, 1))));
      window.dispatchEvent(new MouseEvent('mouseup', at(pts[pts.length - 1], 0)));
    };
    // nhấn trong canvas, kéo ra ngoài cửa sổ rồi thả ở đó (trang không nhận mouseup) → đưa chuột vào lại không giữ nút
    window.__dragOut = (id, pts, back, w, h) => {
      const cv = document.getElementById(id), r = cv.getBoundingClientRect();
      const at = (p, b) => ({ clientX: r.left + (p[0] + 0.5) * r.width / w, clientY: r.top + (p[1] + 0.5) * r.height / h, bubbles: true, button: 0, buttons: b });
      cv.dispatchEvent(new MouseEvent('mousedown', at(pts[0], 1)));
      pts.slice(1).forEach((p) => window.dispatchEvent(new MouseEvent('mousemove', at(p, 1))));
      back.forEach((p) => window.dispatchEvent(new MouseEvent('mousemove', at(p, 0))));
    };
  }, PAL);
  const pyFlat = (code) => execFileSync('python3', ['-c', 'import sys, json; sys.path.insert(0, sys.argv[1]); import le_core as le; print(json.dumps(le._px_decode(sys.argv[2], 9600)))', ADDON, code], { encoding: 'utf8' });

  console.log('== A. thẻ Vẽ của xưởng thiệp');
  const A = await pg.evaluate(async () => {
    const R = {}, sent = window.__sent; sent.length = 0;
    GardenLeCard.open(0);
    const st0 = JSON.stringify(GardenLeCard._draft().st);
    GardenLeCard._tab('draw');
    R.box = !document.getElementById('kb-le-drawbox').hidden && document.getElementById('kb-le-stk').hidden && document.getElementById('kb-le-drawpal').childNodes.length === 32;
    R.cursor = document.getElementById('kb-le-cardcv').classList.contains('is-draw');
    GardenLeCard._tool('pen', 1, 'r');
    window.__drag('kb-le-cardcv', [[10, 40], [20, 40]], 120, 80);          // nét ngang 11 điểm đi ngang cây thông
    const d1 = GardenLeCard._draft().d;
    const flat = GardenLeCard._px.decode(d1, 9600);
    R.line = [10, 15, 20].every((x) => flat[40 * 120 + x] === 'r') && flat[40 * 120 + 21] === '.' && flat[39 * 120 + 15] === '.';
    R.stickerKept = JSON.stringify(GardenLeCard._draft().st) === st0;
    GardenLeCard._tool('pen', 3, 'd');
    window.__drag('kb-le-cardcv', [[60, 60]], 120, 80);
    const f2 = GardenLeCard._px.decode(GardenLeCard._draft().d, 9600);
    R.pen3 = [[59, 59], [60, 60], [61, 61]].every(([x, y]) => f2[y * 120 + x] === 'd') && f2[58 * 120 + 60] === '.';
    GardenLeCard._tool('eraser', 1);
    window.__drag('kb-le-cardcv', [[15, 40]], 120, 80);
    const f3 = GardenLeCard._px.decode(GardenLeCard._draft().d, 9600);
    R.erase = f3[40 * 120 + 15] === '.' && f3[40 * 120 + 14] === 'r';
    R.undoN = GardenLeCard._undoN();
    const cv = document.getElementById('kb-le-cardcv');
    cv.focus(); cv.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true }));
    R.ctrlz = GardenLeCard._px.decode(GardenLeCard._draft().d, 9600)[40 * 120 + 15] === 'r';
    document.getElementById('kb-le-dundo').click(); document.getElementById('kb-le-dundo').click();
    R.undoAll = !GardenLeCard._draft().d && GardenLeCard._undoN() === 0;
    GardenLeCard._tool('pen', 2, 'k');
    window.__drag('kb-le-cardcv', [[30, 70], [90, 70]], 120, 80);
    R.dNow = GardenLeCard._draft().d;
    await new Promise((r) => setTimeout(r, 1000));
    const cards = sent.filter((x) => x.indexOf('le:card:') === 0).map((x) => JSON.parse(x.slice(8)));
    const keeps = sent.filter((x) => x.indexOf('le:keep:') === 0).map((x) => JSON.parse(x.slice(8)));
    R.saved = cards.length >= 1 && cards[cards.length - 1].card.d === R.dNow;
    R.kept = keeps.length >= 1 && keeps[keeps.length - 1].card.d === R.dNow;
    const last = cards[cards.length - 1];
    GardenLeCard.result({ ok: true, act: 'card', i: 0, rid: last.rid, at: '2026-12-10T10:00:05', code_len: 6400 });
    R.meterBad = document.getElementById('kb-le-dmeter').classList.contains('is-bad');
    GardenLeCard._tool('pen', 1, 'k');
    window.__drag('kb-le-cardcv', [[100, 5]], 120, 80);
    GardenLeCard.flush();
    const c2 = JSON.parse(sent.filter((x) => x.indexOf('le:card:') === 0).slice(-1)[0].slice(8));
    GardenLeCard.result({ ok: true, act: 'card', i: 0, rid: c2.rid, at: '2026-12-10T10:00:06', code_len: 812 });
    R.meter = document.getElementById('kb-le-dmeter').textContent;
    R.meterOk = !document.getElementById('kb-le-dmeter').classList.contains('is-bad');
    R.dNow = GardenLeCard._draft().d;
    // quá chi tiết: hạ giới hạn để thử — nét vừa vẽ bị trả lại, có báo
    window.__data.le.d_max = R.dNow.length + 3;
    GardenLeCard._tool('pen', 1, 'y');
    const zig = []; for (let x = 2; x < 118; x += 2) { zig.push([x, 10 + (x % 4)]); }
    window.__drag('kb-le-cardcv', zig, 120, 80);
    R.tooMuch = GardenLeCard._draft().d === R.dNow && /chi tiết quá/.test(document.getElementById('kb-le-cnote').textContent);
    window.__data.le.d_max = 12000;
    // thứ tự lớp: phủ kín hình vẽ đỏ lên thiệp có chữ → chữ + viền vẫn nằm trên
    const card = { f: 'den', st: [{ s: 'xmastree', x: 6, y: 22 }], t1: 'WWWWWW', d: '9600r' };
    const c1 = document.createElement('canvas'); c1.width = 480; c1.height = 320; GardenLeCard.drawCard(c1.getContext('2d'), 4, card, {});
    const g = c1.getContext('2d');
    const px = (x, y) => Array.from(g.getImageData(x * 4 + 1, y * 4 + 1, 1, 1).data.slice(0, 3)).join(',');
    R.layerTree = px(15, 40) === px(60, 45);                  // cây thông bị hình vẽ che (cùng màu đỏ)
    R.layerFrame = px(0, 0) !== px(60, 45);                   // viền khung trên hình vẽ
    let textPx = 0; const td = g.getImageData(40 * 4, 8 * 4, 40 * 4, 10 * 4).data;
    for (let i = 0; i < td.length; i += 4) { if (td[i] > 230 && td[i + 1] > 230 && td[i + 2] > 200) { textPx++; } }
    R.layerText = textPx > 30;                                  // chữ lời chúc (màu kem) trên hình vẽ đỏ
    // thẻ Có sẵn: kéo sticker như cũ
    GardenLeCard._tab('base');
    const x0 = GardenLeCard._draft().st[0].x, y0 = GardenLeCard._draft().st[0].y;
    window.__drag('kb-le-cardcv', [[x0 + 3, y0 + 3], [x0 + 13, y0 + 3]], 120, 80);
    R.dragBase = GardenLeCard._draft().st[0].x === x0 + 10 && GardenLeCard._draft().d === R.dNow;
    GardenLeCard.close();
    return R;
  });
  ok(A.box && A.cursor, 'thẻ "✎ Vẽ": hiện bút / tẩy / cỡ / 32 màu, ẩn danh sách sticker, con trỏ chữ thập');
  ok(A.line && A.stickerKept, 'kéo chuột → nét vẽ đúng điểm ảnh, không kéo cây thông đang nằm dưới');
  ok(A.pen3 && A.erase, 'bút cỡ 3 (ô 3 × 3), tẩy xoá đúng một điểm');
  ok(A.undoN === 3 && A.ctrlz && A.undoAll, 'hoàn tác từng nét (cả Ctrl+Z), về tới thiệp chưa vẽ');
  ok(A.saved && A.kept, 'tự lưu le:card + le:keep mang đúng hình vẽ');
  ok(/812/.test(A.meter) && A.meterBad && A.meterOk, 'đồng hồ "Mã thiệp: N / 6.000" theo lần lưu, quá 6.000 báo đỏ (' + A.meter + ')');
  ok(A.tooMuch, 'vẽ dày quá giới hạn → nét vừa vẽ bị trả lại, có báo');
  ok(A.layerTree && A.layerFrame && A.layerText, 'thứ tự lớp: sticker < hình vẽ < viền khung + chữ');
  ok(A.dragBase, 'thẻ Có sẵn: kéo sticker như cũ, hình vẽ giữ nguyên');
  const pyf = JSON.parse(pyFlat(A.dNow));
  ok(pyf && pyf === (await pg.evaluate((d) => GardenLeCard._px.decode(d, 9600), A.dNow)), 'hình vẽ nén ra giống hệt cách le_core đọc (_px_decode)');

  console.log('== B. quả châu tự vẽ');
  const B = await pg.evaluate(async () => {
    const R = {}, sent = window.__sent; sent.length = 0;
    GardenLe.open();
    R.btn = !!document.getElementById('kb-le-to-orn');
    document.getElementById('kb-le-to-orn').click();
    R.open = GardenLeOrn.isOpen() && !GardenLe.isOpen();
    GardenLeOrn._tool('pen', 'R');
    window.__drag('kb-le-orn-grid', [[1, 1], [6, 1]], 8, 8);
    GardenLeOrn._tool('pen', 'w');
    window.__drag('kb-le-orn-grid', [[3, 4]], 8, 8);
    const c = GardenLeOrn._cur();
    R.p = c.p; R.on = c.on;
    R.cells = c.p.slice(8, 16) === '.RRRRRR.' && c.p[4 * 8 + 3] === 'w';
    await new Promise((r) => setTimeout(r, 900));
    const orn = sent.filter((x) => x.indexOf('le:orn:') === 0).map((x) => JSON.parse(x.slice(7)));
    const keeps = sent.filter((x) => x.indexOf('le:keep:') === 0).map((x) => JSON.parse(x.slice(8)));
    R.saved = orn.length === 1 && orn[0].i === 0 && orn[0].p === c.p && orn[0].on === 1;
    R.kept = keeps.length >= 2 && keeps[keeps.length - 1].o === 0 && keeps[keeps.length - 1].orn.p === c.p;
    // Anki đang đồng bộ: giữ lại, vườn dựng lại thì gửi lại
    GardenLeOrn.result({ ok: false, act: 'orn', sync: true, i: 0, rid: orn[0].rid, msg: 'Anki đang đồng bộ' });
    const n1 = sent.filter((x) => x.indexOf('le:orn:') === 0).length;
    GardenLeOrn.render();
    const again = sent.filter((x) => x.indexOf('le:orn:') === 0).map((x) => JSON.parse(x.slice(7)));
    R.resend = again.length === n1 + 1 && again[again.length - 1].p === c.p;
    GardenLeOrn.result({ ok: true, act: 'orn', i: 0, rid: again[again.length - 1].rid });
    window.__data.le.orn = [{ p: c.p, on: 1 }, null, null];
    R.pendClear = Object.keys(GardenLeOrn._pend()).length === 0;
    // gỡ / treo
    document.getElementById('kb-le-orn-hang').click();
    R.unhung = GardenLeOrn._cur().on === 0 && /Treo quả 1/.test(document.getElementById('kb-le-orn-hang').textContent);
    document.getElementById('kb-le-orn-hang').click();
    R.hung = GardenLeOrn._cur().on === 1;
    // hoàn tác
    document.getElementById('kb-le-orn-undo').click();
    R.undo = GardenLeOrn._cur().p[4 * 8 + 3] === '.';
    document.getElementById('kb-le-orn-undo').click();
    R.undo2 = !/[^.]/.test(GardenLeOrn._cur().p);
    // quả 2
    Array.from(document.querySelectorAll('[data-orn]')).find((x) => x.getAttribute('data-orn') === '1').click();
    R.slot2 = GardenLeOrn._slot() === 1 && !/[^.]/.test(GardenLeOrn._cur().p);
    const tree = document.getElementById('kb-le-orn-tree');
    R.treeW = tree.width;
    GardenLeOrn.close();
    R.closed = !GardenLeOrn.isOpen();
    // sau mùa: chỉ xem
    window.__data.le.orn_edit = false;
    GardenLeOrn.open(0);
    const before = GardenLeOrn._cur().p;
    window.__drag('kb-le-orn-grid', [[7, 7]], 8, 8);
    R.ro = GardenLeOrn._cur().p === before && document.getElementById('kb-le-orn-pal').hidden && document.getElementById('kb-le-orn-hang').hidden;
    GardenLeOrn.close();
    window.__data.le.orn_edit = true;
    window.__data.le.orn = [{ p: c.p, on: 1 }, null, null];
    return R;
  });
  ok(B.btn && B.open, 'tủ lịch có nút "Vẽ quả châu ▸" → mở bảng quả châu (đóng tủ lịch)');
  ok(B.cells && B.on === 1, 'vẽ ô 8 × 8 bằng chuột (kéo ngang 6 ô, chấm trắng), quả mới vẽ tự treo lên cây');
  ok(B.saved && B.kept, 'tự lưu le:orn (một lệnh) + le:keep theo từng nét');
  ok(B.resend && B.pendClear, 'Anki đang đồng bộ → vườn dựng lại thì gửi lại; lưu xong thì hết chờ');
  ok(B.unhung && B.hung, 'Gỡ / Treo lên cây');
  ok(B.undo && B.undo2 && B.slot2, 'hoàn tác từng nét; sang quả 2 (trống)');
  ok(B.closed && B.ro, 'sau mùa: bảng chỉ xem (không vẽ, không treo)');

  console.log('== C. cây ngoài sân, Album');
  const C = await pg.evaluate((pp) => {
    const R = {}, L = GardenHome._lib(), v = window.__data.le;
    // bản chờ lưu của bảng quả châu (phần B) coi như đã lưu — cây vẽ theo sổ
    const pd = GardenLeOrn._pend(); Object.keys(pd).forEach((k) => GardenLeOrn.result({ ok: true, act: 'orn', i: +k, rid: pd[k].rid }));
    GardenSky.set && GardenSky.set('fixedHour', 12);
    const shot = () => { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 304; const ctx = cv.getContext('2d'); L.drawOutdoor(ctx, 4, 0, 0, 1000, 'yard', { seen: true, noGuests: true, noPets: true, noJoy: true }); return ctx.getImageData(0, 0, 1024, 304).data; };
    const diff = (a, b2) => { let n = 0; for (let i = 0; i < a.length; i += 4) { if (a[i] !== b2[i] || a[i + 1] !== b2[i + 1] || a[i + 2] !== b2[i + 2]) { n++; } } return n; };
    v.orn = [null, null, null]; const none = shot();
    v.orn = [{ p: pp, on: 1 }, null, null]; const one = shot();
    v.orn = [{ p: pp, on: 1 }, { p: pp, on: 0 }, null]; const oneOff = shot();
    v.orn = [{ p: pp, on: 1 }, null, { p: pp, on: 1 }]; const two = shot();
    R.one = diff(one, none); R.two = diff(two, none); R.off = diff(oneOff, one);
    v.orn = [{ p: pp, on: 1 }, null, null];
    // Album → Kỷ niệm
    const list = document.createElement('div'); document.body.appendChild(list);
    GardenLeNoel.album(list);
    R.album = list.querySelectorAll('.kb-le-mem-orn').length === 1 && /Quả châu tự vẽ/.test(list.textContent);
    list.remove();
    return R;
  }, B.p);
  ok(C.one >= 7 * 16 * 0.8 && C.two > C.one * 1.6 && C.off === 0, 'cây thông ngoài sân: vẽ quả châu đang treo (1 quả: ' + C.one + ' điểm đổi, 2 quả: ' + C.two + '), quả chưa treo không vẽ (' + C.off + ')');
  ok(C.album, 'Album → Kỷ niệm: mục "Quả châu tự vẽ"');

  console.log('== D. phím');
  const D = await pg.evaluate(() => {
    GardenLeOrn.open(0);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    return { closed: !GardenLeOrn.isOpen() };
  });
  ok(D.closed, 'Esc đóng bảng quả châu');
  const E = await pg.evaluate(() => {
    const R = {};
    GardenLeCard.open(0); GardenLeCard._tab('draw'); GardenLeCard._tool('pen', 1, 'r');
    const flat = () => { const d = GardenLeCard._draft(); return d && d.d ? GardenLeCard._px.decode(d.d, 9600) : '.'.repeat(9600); };
    const u0 = GardenLeCard._undoN();
    window.__dragOut('kb-le-cardcv', [[5, 75], [12, 75]], [[12, 30], [60, 30]], 120, 80);
    const f = flat();
    R.card = f.slice(75 * 120 + 5, 75 * 120 + 13) === 'rrrrrrrr' && !/r/.test(f.slice(30 * 120, 31 * 120)) && GardenLeCard._undoN() === u0 + 1;
    GardenLeCard.close();
    GardenLeOrn.open(1); GardenLeOrn._tool('pen', 'r');
    window.__dragOut('kb-le-orn-grid', [[0, 7], [2, 7]], [[5, 3], [6, 3]], 8, 8);
    const c = GardenLeOrn._cur();
    R.orn = c.p.slice(56, 59) === 'rrr' && c.p[3 * 8 + 5] === '.' && c.p[3 * 8 + 6] === '.' && GardenLeOrn._undoN() === 1;
    GardenLeOrn.close();
    return R;
  });
  // bảng Nhà dựng lại danh sách (khách ghé, tự lưu…) khi đang gõ mã thiệp ở Album → con trỏ + vị trí gõ còn (1.36.1: mất con trỏ).
  // Trang riêng dựng từ web/body.html thật (bảng Nhà cần khung của nó)
  const pg2 = await b.newPage({ viewport: { width: 1366, height: 860 } });
  pg2.on('pageerror', (e) => errs.push('trang 2: ' + e.message));
  await pg2.setContent('<html><head><style>' + css + '</style></head><body>' + fs.readFileSync(path.join(ADDON, 'web', 'body.html'), 'utf8') + '</body></html>');
  for (const f of FILES) {
    let src = fs.readFileSync(path.join(ADDON, 'web', f + '.js'), 'utf8');
    if (f === 'home') { src = src.replace('_lib: () => ({ SPR,', '_lib: () => ({ drawOutdoor, YARD, setH: (h) => { H = h; }, SPR,'); }
    await pg2.addScriptTag({ content: src });
  }
  const CAT = execFileSync('python3', ['-c', 'import sys, json; sys.path.insert(0, sys.argv[1]); sys.path.insert(0, sys.argv[2]); import garden_core as c; print(json.dumps(c.home_catalog(None)))',
    ADDON, path.join(__dirname, '..', 'stubs')], { encoding: 'utf8' });
  const DATA = await pg.evaluate((cat) => JSON.stringify(Object.assign({}, window.__data, { catalog: JSON.parse(cat) })), CAT);
  const F = await pg2.evaluate((dj) => {
    const R = {};
    window.__data = JSON.parse(dj);
    const H = { data: () => window.__data, send: () => {}, toast: () => {}, closeOthers: () => {} };
    GardenHome._lib().setH(H); GardenLe.init(H);
    try { GardenHome.openMemories(); } catch (e) { R.err = String(e && e.stack || e).slice(0, 300); return R; }
    const inp = document.getElementById('kb-le-recv-in');
    R.has = !!inp;
    if (!inp) { R.err = 'không có ô mã thiệp: ' + document.getElementById('kb-h-list').textContent.slice(0, 120); return R; }
    inp.focus(); inp.value = 'KBC1:abcdef'; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.setSelectionRange(7, 7);
    GardenHome.refreshList();
    const b2 = document.activeElement;
    R.focus = !!b2 && b2.id === 'kb-le-recv-in' && b2 !== inp && b2.value === 'KBC1:abcdef' && b2.selectionStart === 7;
    b2.blur();
    GardenHome.refreshList();
    R.noSteal = document.activeElement !== document.getElementById('kb-le-recv-in');
    return R;
  }, DATA);
  await pg2.close();
  ok(F.has && F.focus && F.noSteal, 'Album → Kỷ niệm: đang gõ mã thiệp mà bảng Nhà dựng lại → ô vẫn giữ con trỏ, đúng vị trí gõ; không gõ thì không giành con trỏ' + (F.err ? ' — ' + F.err : ''));
  ok(E.card && E.orn, 'kéo ra ngoài cửa sổ rồi thả ở đó: đưa chuột vào lại (không giữ nút) không vẽ tiếp, nét đã vẽ thành một bước Hoàn tác (thiệp ' + E.card + ', quả châu ' + E.orn + ')');
  ok(!errs.length, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  const n = results.filter(Boolean).length;
  console.log('\nKẾT QUẢ: ' + n + '/' + results.length + (n === results.length ? ' — TẤT CẢ OK' : ''));
  process.exit(n === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
