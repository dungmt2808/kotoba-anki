// 1.36.2 (Chromium, web/*.js + garden.css thật của add-on): sửa lỗi nhánh audit/release-review-1.36.1-2026-11-24 phía trang.
//   A. #02 Esc Esc nhanh trên xưởng thiệp (bỏ chọn → đóng), tủ lịch có thẻ kết quả, cảnh đêm 24 (Bỏ qua → Đóng), hộp hỏi
//      "Xoá thiệp?", bảng cất đồ: bộ nghe Esc kiểu Anki (document, pha bubble — aqt/webview.py) không lần nào chạy; Esc sau đó ở
//      màn chính tới Python một lần và câu hỏi thật của GardenDialog._on_esc trả "đóng" (hàng đợi không có mục thừa);
//   B. #03 điều ước có xuống dòng / khoảng trắng thừa / chữ tách dấu: bản Gemini sửa hiện đủ (câu sửa + nút "Dùng bản sửa");
//   C. #04 Anki đang đồng bộ: lưu thiệp bị bỏ → sang thiệp 2 → 4 giây sau gửi lại đúng thiệp 1; quay lại thiệp 1 vẫn thấy chữ
//      vừa sửa; "Nhờ Gemini sửa" bị bỏ → nút không kẹt "Gemini đang sửa…"; mở ngăn bị bỏ → ngăn không vẽ như đã mở, bấm lại được;
//   D. #05 mỗi lần sửa gửi le:keep (số thứ tự tăng); #13 trả lời xoá của thiệp 1 khi đang ở thiệp 2 → thiệp 2 không bị xoá trắng;
//      lỗi lưu của ô khác không đánh dấu ô đang mở;
//   E. #10b cảnh đêm 24 không tự bật khi ⚙ / cây deck / Tin làng đang mở (bật sau khi đóng); #17a cất đồ không có gì → không bật
//      bảng trống; #08 thông báo nổi nằm trên xưởng thiệp; #09 tủ lịch tự treo ở Bếp → báo "tường Bếp";
//   F. bật / tắt Xem thử → bản chưa lưu xong của chế độ cũ bị bỏ (sửa lúc xem thử không sang sổ thật).
// Chạy: node test_1362.js ADDON  (cần Playwright + Chromium)
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const ADDON = path.resolve(process.argv[2]);
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
const FILES = ['diag', 'prefs', 'fix', 'icons', 'sky', 'season', 'fx', 'music', 'games', 'fields', 'glang', 'season_art', 'rare_art',
  'nha_art', 'pets', 'guests', 'finds_art', 'finds', 'le_art', 'le_card', 'le_noel', 'le', 'life', 'joy', 'ui', 'home'];
const INIT = fs.readFileSync(path.join(ADDON, '__init__.py'), 'utf8');
const mEval = INIT.match(/self\.web\.evalWithCallback\(\s*((?:"[^"\n]*"\s*)+), done\)/);
const ASK = mEval ? mEval[1].match(/"[^"\n]*"/g).map((x) => JSON.parse(x)).join('') : 'false';

async function boot(pg, files) {
  const css = fs.readFileSync(path.join(ADDON, 'web', 'garden.css'), 'utf8');
  await pg.setContent('<html><head><style>' + css + '</style></head><body><div id="kb-app"><div id="kb-scene-bar"></div><div id="kb-today"><div class="kb-today-list"></div></div>' +
    '<div id="kb-sound-pop" class="kb-sound-pop" hidden>⚙</div><div id="kb-toast" class="kb-toast" hidden></div></div><canvas id="c"></canvas></body></html>');
  for (const f of files) {
    let src = fs.readFileSync(path.join(ADDON, 'web', f + '.js'), 'utf8');
    if (f === 'home') { src = src.replace('_lib: () => ({ SPR,', '_lib: () => ({ drawOutdoor, YARD, setH: (h) => { H = h; }, SPR,'); }
    await pg.addScriptTag({ content: src });
  }
  await pg.evaluate(() => {
    const CARD = { f: 'den', st: [{ s: 'xmastree', x: 6, y: 22 }, { s: 'stackchan', x: 86, y: 43 }], t1: 'Giáng sinh an lành!', t2: '— Lan', c: 'ja', w: '日本語が上手になりたいです。', wl: 'ja', at: '2026-12-10T10:00:00' };
    const le = {
      active: true, phase: 'advent', year: 2026, today: '2026-12-10', day: 10, parts: ['wreath', 'red', 'yellow', 'garland', 'blue', 'lights'],
      doors: Array.from({ length: 24 }, (_, i) => ({ d: i + 1, state: i < 9 ? 'open' : (i === 9 ? 'ready' : 'future'), kind: 'cay', name: 'x', item: '', part: 'red', at: i < 9 ? '2026-12-01' : '', tiles: [] })),
      opened: 9, boxes: [], chip: true, names: { le_tuanloc: 'Tuần lộc đèn', le_banhquy: 'Bàn nhỏ bánh quy + sữa', le_tulich: 'Tủ lịch Giáng sinh 2026' }, gift: { tulich: '2026-12-01' },
      makeup: { left: 0 },
      cards: [JSON.parse(JSON.stringify(CARD)), Object.assign(JSON.parse(JSON.stringify(CARD)), { t1: 'Card 2' }), null], hang: -1, taken: -1, card_edit: true, hang_edit: true,
      santa: { came: false, due: false, morning: false, seen: '', read: '' }, eaten: false, letter: null, pack: null, recv: [], fix_left: 5,
      frames: [{ id: 'den', name: 'Đèn nháy' }, { id: 'tuyet', name: 'Tuyết trắng' }, { id: 'thong', name: 'Cành thông' }, { id: 'qua', name: 'Giấy quà' }],
      chuc: { vi: 'Giáng sinh an lành', ja: 'メリークリスマス', en: 'Merry Christmas', zh: '圣诞快乐', ko: '메리 크리스마스', de: 'Frohe Weihnachten', fr: 'Joyeux Noël' },
      stickers: ['le_tulich'], limits: { t1: 28, t2: 28, wish: 160, stickers: 12, cards: 3 }
    };
    window.__data = { wallet: { home: { house: 7, style: 'classic', rooms: [], yard: [{ id: 'xmastree', x: 6, y: 2 }], room: [], owned: { xmastree: 1 }, zones: [] }, more: { zones: [] } },
      catalog: { items: [{ id: 'xmastree', w: 2 }], themes: [], rooms: [] }, le: le, fx: { effects: true } };
    window.__sent = []; window.__toasts = [];
    const H = { data: () => window.__data, send: (c) => window.__sent.push(c), toast: (m) => window.__toasts.push(m), closeOthers: () => {} };
    window.__H = H;
    GardenHome._lib().setH(H); GardenLe.init(H);
    if (typeof GardenUI !== 'undefined' && GardenUI.init) { try { GardenUI.init(H); } catch (e) { /* bỏ qua */ } }
  });
}

(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1366, height: 860 } }); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await boot(pg, FILES);
  const ask = () => pg.evaluate(ASK);
  const esc = async () => { await pg.keyboard.press('Escape'); };

  console.log('== A. Esc trên bảng Giáng sinh (audit #02 — trong Anki thật Esc chỉ tới Python qua bộ nghe ở document, pha bubble)');
  ok(!!mEval && ASK.indexOf('__kbEscQ') > 0, 'lấy được câu hỏi Esc thật của GardenDialog._on_esc');
  // như Anki (aqt/webview.py _on_load_finished): bộ nghe Esc → pycmd("close") gắn ở document SAU mọi file của trang
  await pg.evaluate(() => { window.__close = 0; document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { window.__close++; } }); });
  const cases = [
    ['xưởng thiệp: bỏ chọn sticker → đóng xưởng', async () => { await pg.evaluate(() => { GardenLeCard.open(0); GardenLeCard._sel(0); document.getElementById('kb-le-cardcv').focus(); }); },
      () => pg.evaluate(() => !GardenLeCard.isOpen())],
    ['tủ lịch có thẻ kết quả: đóng thẻ → đóng tủ', async () => { await pg.evaluate(() => { GardenLe.open(); GardenLe.result({ ok: true, act: 'open', door: { d: 10, makeup: false, item: {}, tiles: [], part: 'red', box: 0, kind: 'cay', name: 'Quả châu', desc: 'x' }, placed: [] }); }); },
      () => pg.evaluate(() => !GardenLe.isOpen())],
    ['cảnh đêm 24: Bỏ qua → Đóng', async () => { await pg.evaluate(() => { window.__data.le.santa.came = true; GardenLeNoel.play('replay'); window.__showOn = GardenLeNoel.isShowing(); }); await pg.waitForTimeout(200); },
      () => pg.evaluate(() => { const r = window.__showOn && !GardenLeNoel.isShowing(); window.__data.le.santa.came = false; return r; })],
    ['hộp hỏi "Xoá thiệp?" trên xưởng: Huỷ → đóng xưởng', async () => { await pg.evaluate(() => { GardenLeCard.open(0); }); await pg.evaluate(() => { const b = Array.from(document.querySelectorAll('#kb-le-cardpop button')).find((x) => /Xoá thiệp/.test(x.textContent)); if (b) { b.click(); } }); await pg.waitForTimeout(100); },
      () => pg.evaluate(() => !GardenLeCard.isOpen() && !(GardenUI.asking && GardenUI.asking()))],
    ['bảng cất đồ (một lớp — một Esc)', async () => { await pg.evaluate(() => { GardenLeNoel.openPack({ at: '2027-01-01', items: { le_tuanloc: 2 }, tiles: [] }); }); },
      () => pg.evaluate(() => { const p = document.getElementById('kb-le-packpop'); return !p || p.hidden; }), 1]
  ];
  for (const [name, setup, closed, nEsc] of cases) {
    await setup();
    await pg.evaluate(() => { window.__close = 0; });
    for (let k = 0; k < (nEsc || 2); k++) { await esc(); }
    await pg.waitForTimeout(80);
    const asked = await pg.evaluate(() => window.__close);
    const shut = await closed();
    ok(asked === 0 && shut, name + ': ' + (nEsc === 1 ? 'Esc' : 'Esc Esc nhanh') + ' — không lần nào tới Python (' + asked + '), các lớp đã đóng: ' + shut);
  }
  await pg.evaluate(() => { window.__close = 0; window.__kbEscQ = []; window.__kbEscUsed = false; });
  await esc(); await pg.waitForTimeout(30);
  ok((await pg.evaluate(() => window.__close)) === 1 && (await ask()) === false, 'rồi Esc ở màn chính: tới Python một lần → đóng cửa sổ như thiết kế (không có mục thừa trong hàng đợi)');

  console.log('== B. bản Gemini sửa với điều ước có xuống dòng (audit #03)');
  for (const raw of ['日本語が上手になりたいです。\n', '  日本語が上手に  なりたいです。 ', 'Tiếng Viẹt vui\n\n']) {
    const r = await pg.evaluate(async (raw) => {
      window.__sent.length = 0;
      GardenLeCard.open(0); GardenLeCard._side('back');
      const wi = document.getElementById('kb-le-wish');
      wi.value = raw; wi.dispatchEvent(new Event('input'));
      const norm = GardenLeCard._norm(raw);
      document.getElementById('kb-le-fix').disabled = false;
      window.__data.le.cards[0] = Object.assign({}, window.__data.le.cards[0], { w: norm, fx: { for: norm, sua: norm + '（直し）', loi: [{ goc: 'a', sua: 'b', gt: 'c' }] } });
      GardenLeCard.result({ ok: true, act: 'fixed', i: 0, le: window.__data.le });
      const res = document.getElementById('kb-le-fixres');
      const out = { html: res.textContent, btn: Array.from(res.querySelectorAll('button')).map((x) => x.textContent), note: document.getElementById('kb-le-cnote').textContent };
      GardenLeCard.close();
      window.__data.le.cards[0].fx = undefined; delete window.__data.le.cards[0].fx;
      return out;
    }, raw);
    ok(r.html.indexOf('（直し）') >= 0 && r.btn.indexOf('Dùng bản sửa') >= 0, JSON.stringify(raw) + ': bản sửa hiện ngay dưới ô (nút "Dùng bản sửa") — ' + r.note);
  }

  console.log('== C. Anki đang đồng bộ (audit #04)');
  const C = await pg.evaluate(async () => {
    const R = {}, sent = window.__sent; sent.length = 0;
    const lastCard = () => { const c = sent.filter((x) => x.indexOf('le:card:') === 0).slice(-1)[0]; return c ? JSON.parse(c.slice(8)) : null; };
    GardenLeCard.open(0); GardenLeCard._side('front');
    const t1 = document.getElementById('kb-le-t1') || document.querySelector('#kb-le-cardpop input');
    t1.value = 'Sửa lúc đồng bộ'; t1.dispatchEvent(new Event('input'));
    GardenLeCard.flush();
    const c1 = lastCard();
    R.sent1 = c1 && c1.i === 0 && c1.card.t1 === 'Sửa lúc đồng bộ';
    GardenLeCard.result({ ok: false, act: 'card', sync: true, i: 0, rid: c1.rid, msg: 'Anki đang đồng bộ — xong rồi bấm lại nhé.' });
    // sang thiệp 2 ngay
    const tabs = Array.from(document.querySelectorAll('#kb-le-cardpop button')).filter((x) => /^Thiệp 2/.test(x.textContent.trim()));
    if (tabs[0]) { tabs[0].click(); } else { GardenLeCard.open(1); }
    R.slotNow = GardenLeCard._slot();
    R.pend = Object.keys(GardenLeCard._pend());
    const n0 = sent.filter((x) => x.indexOf('le:card:') === 0).length;
    GardenLeCard.render();                    // đồng bộ xong: Python dựng lại vườn → gửi lại ngay
    const c2 = lastCard();
    R.resent = sent.filter((x) => x.indexOf('le:card:') === 0).length === n0 + 1 && c2.i === 0 && c2.card.t1 === 'Sửa lúc đồng bộ';
    // vẫn đang đồng bộ (bị bỏ lần nữa) mà vườn không dựng lại → chậm nhất 8 giây sau gửi lại
    GardenLeCard.result({ ok: false, act: 'card', sync: true, i: 0, rid: c2.rid, msg: 'x' });
    const n1 = sent.filter((x) => x.indexOf('le:card:') === 0).length;
    await new Promise((r) => setTimeout(r, 8400));
    const c3 = lastCard();
    R.fallback = sent.filter((x) => x.indexOf('le:card:') === 0).length > n1 && c3.i === 0 && c3.card.t1 === 'Sửa lúc đồng bộ';
    // quay lại thiệp 1 trước khi lưu xong: vẫn thấy chữ vừa sửa
    GardenLeCard.open(0);
    R.back = GardenLeCard._draft().t1;
    GardenLeCard.result({ ok: true, act: 'card', i: 0, rid: c3.rid, at: '2026-12-10T10:00:09' });
    R.pendAfter = Object.keys(GardenLeCard._pend()).length;
    // Gemini: lệnh bị bỏ → nút không kẹt
    GardenLeCard._side('back');
    const fb = document.getElementById('kb-le-fix');
    window.__data.le.cards[0].w = 'まだなおしていない'; GardenLeCard.render();
    fb.disabled = false; fb.click();
    R.fixSent = sent.slice(-1)[0];
    R.waitTxt = fb.textContent;
    GardenLeCard.result({ ok: false, act: 'fix', sync: true, i: 0, msg: 'Anki đang đồng bộ — xong rồi bấm lại nhé.' });
    R.afterTxt = fb.textContent; R.afterDis = fb.disabled;
    GardenLeCard.open(1);
    R.slot2Txt = document.getElementById('kb-le-fix').textContent;
    GardenLeCard.close();
    GardenLe.open();
    return R;
  });
  ok(C.sent1 && C.slotNow === 1 && C.pend.indexOf('0') >= 0, 'lưu thiệp 1 bị bỏ (sync) → sang thiệp 2: bản thiệp 1 vẫn chờ gửi lại (' + C.pend + ')');
  ok(C.resent && C.fallback, 'đồng bộ xong (vườn dựng lại) → gửi lại đúng thiệp 1 với chữ vừa sửa; không dựng lại thì 8 giây sau (1.36.1: đã sang ô khác thì bỏ — mất lần sửa)');
  ok(C.back === 'Sửa lúc đồng bộ' && C.pendAfter === 0, 'quay lại thiệp 1 trước khi lưu xong vẫn thấy chữ vừa sửa; lưu xong thì hết chờ');
  ok(C.fixSent === 'le:fix:0' && C.waitTxt === 'Gemini đang sửa…' && C.afterTxt === 'Nhờ Gemini sửa' && C.slot2Txt === 'Nhờ Gemini sửa',
    '"Nhờ Gemini sửa" bị bỏ lúc đồng bộ → nút về "Nhờ Gemini sửa" (cả ở thiệp khác), không kẹt "Gemini đang sửa…"');
  // ngăn tủ lịch: tìm chỗ bấm của ngăn 10 bằng lưới điểm (bấm thật vào canvas)
  const D = await pg.evaluate(async () => {
    const sent = window.__sent; sent.length = 0;
    const cv = document.getElementById('kb-le-cab'), r = cv.getBoundingClientRect();
    let hit = null;
    for (let y = r.top + 4; y < r.bottom && !hit; y += 4) {
      for (let x = r.left + 4; x < r.right && !hit; x += 4) {
        cv.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
        if (sent.some((s) => s === 'le:open:10')) { hit = [x, y]; }
        else if (sent.some((s) => s.indexOf('le:open:') === 0)) { sent.length = 0; }
      }
    }
    if (!hit) { return { hit: false }; }
    GardenLe.result({ ok: false, act: 'open', sync: true, msg: 'Anki đang đồng bộ — xong rồi bấm lại nhé.' });
    await new Promise((res) => setTimeout(res, 600));
    const note = document.getElementById('kb-le-note').textContent;
    sent.length = 0;
    cv.dispatchEvent(new MouseEvent('click', { clientX: hit[0], clientY: hit[1], bubbles: true }));
    const again = sent.indexOf('le:open:10') >= 0;
    GardenLe.result({ ok: false, act: 'open', sync: true, msg: 'x' });
    GardenLe.close();
    return { hit: true, note: note, again: again };
  });
  ok(D.hit && /đồng bộ/.test(D.note) && D.again, 'mở ngăn bị bỏ lúc đồng bộ → báo một câu, bấm lại ngay được (1.36.1: ngăn vẽ như đã mở, khoá 8 giây)');

  console.log('== D. bản giữ để lưu nốt, trả lời đúng ô (audit #05, #13)');
  const E = await pg.evaluate(async () => {
    const R = {}, sent = window.__sent; sent.length = 0;
    GardenLeCard.open(0); GardenLeCard._side('front');
    const t1 = document.querySelector('#kb-le-cardpop input');
    for (const s of ['A', 'AB', 'ABC']) { t1.value = s; t1.dispatchEvent(new Event('input')); }
    const keeps = sent.filter((x) => x.indexOf('le:keep:') === 0).map((x) => JSON.parse(x.slice(8)));
    R.keeps = keeps.map((k) => k.q);
    R.keepLast = keeps.length ? keeps[keeps.length - 1].card.t1 : null;
    R.keepI = keeps.every((k) => k.i === 0);
    GardenLeCard.flush();
    const c = JSON.parse(sent.filter((x) => x.indexOf('le:card:') === 0).slice(-1)[0].slice(8));
    R.cardQ = c.q === keeps[keeps.length - 1].q;
    GardenLeCard.result({ ok: true, act: 'card', i: 0, rid: c.rid, at: '2026-12-10T11:00:00' });
    // xoá thiệp 1 rồi sang thiệp 2 trước khi trả lời về
    GardenLeCard.open(1);
    const before = GardenLeCard._draft() && GardenLeCard._draft().t1;
    GardenLeCard.result({ ok: true, act: 'cdel', i: 0 });
    R.afterSlot1 = GardenLeCard._draft() && GardenLeCard._draft().t1;
    R.before = before;
    // lỗi lưu của thiệp 1 (đã sang thiệp 2) không đánh dấu thiệp 2
    const dirty0 = GardenLeCard._dirty();
    GardenLeCard.result({ ok: false, act: 'card', i: 0, rid: 99999, msg: 'x' });
    R.dirtyKept = GardenLeCard._dirty() === dirty0;
    GardenLeCard.close();
    return R;
  });
  ok(E.keeps.length === 3 && E.keeps[0] < E.keeps[1] && E.keeps[1] < E.keeps[2] && E.keepLast === 'ABC' && E.keepI && E.cardQ,
    'mỗi lần sửa gửi le:keep (số thứ tự tăng ' + E.keeps.join(' < ') + ', bản cuối "ABC"); lần lưu mang cùng số thứ tự');
  ok(E.before === 'Card 2' && E.afterSlot1 === 'Card 2', 'xoá thiệp 1 rồi sang thiệp 2 trước khi trả lời về → thiệp 2 còn nguyên (1.36.1: xoá trắng)');
  ok(E.dirtyKept, 'trả lời lỗi của thiệp khác không đánh dấu thiệp đang mở');

  console.log('== E. tự mở, cất đồ, thông báo, tên gian (audit #10b, #17a, #08, #09)');
  const F = await pg.evaluate(async () => {
    const R = {}, v = window.__data.le;
    v.santa = { came: true, due: true, morning: false, seen: '', read: '' };
    document.getElementById('kb-sound-pop').hidden = false;
    GardenLeNoel.render();
    await new Promise((r) => setTimeout(r, 2600));
    R.whileSettings = GardenLeNoel.isShowing();
    document.getElementById('kb-sound-pop').hidden = true;
    await new Promise((r) => setTimeout(r, 1500));
    R.afterSettings = GardenLeNoel.isShowing();
    GardenLeNoel.closeShow();
    v.santa = { came: true, due: false, morning: false, seen: 'x', read: 'y' };
    // 1/1: không có gì để cất
    v.welcome = { pack: { at: '2027-01-01', items: {}, tiles: [] }, placed: [], give: {}, welcome: false };
    v.today = '2027-01-01'; v.parts = [];
    GardenLeNoel.render();
    await new Promise((r) => setTimeout(r, 2000));
    const pp = document.getElementById('kb-le-packpop');
    R.emptyPack = !!(pp && !pp.hidden);
    v.welcome = { pack: { at: '2027-01-01', items: { le_tuanloc: 2 }, tiles: [] }, placed: [], give: {}, welcome: false };
    v.today = '2027-01-02';
    GardenLeNoel.render();
    await new Promise((r) => setTimeout(r, 2000));
    const pp2 = document.getElementById('kb-le-packpop');
    R.fullPack = !!(pp2 && !pp2.hidden) && /Tuần lộc đèn/.test(pp2.textContent);
    if (pp2) { pp2.hidden = true; }
    v.welcome = null; v.today = '2026-12-10'; v.parts = ['wreath'];
    // thông báo nổi trên xưởng thiệp
    GardenLeCard.open(0);
    const t = document.getElementById('kb-toast'); t.hidden = false; t.textContent = 'Đã lưu ảnh thiệp: thiep.png';
    t.style.bottom = '24px';
    const pr = document.getElementById('kb-le-cardpop').getBoundingClientRect(), tr = t.getBoundingClientRect();
    const at = document.elementFromPoint(tr.left + tr.width / 2, tr.top + tr.height / 2);
    R.toastTop = at === t || t.contains(at);
    R.overlap = tr.top < pr.bottom && tr.bottom > pr.top;
    t.hidden = true;
    GardenLeCard.close();
    // tủ lịch tự treo ở Bếp
    GardenLe.open();
    GardenLe.result({ ok: true, act: 'auto', placed: [{ id: 'le_tulich', scene: 'kitchen', x: 1, y: 1 }] });
    R.kitchen = document.getElementById('kb-le-note').textContent;
    GardenLe.result({ ok: true, act: 'auto', placed: [{ id: 'le_tulich', scene: 'bedroom', x: 1, y: 1 }] });
    R.bedroom = document.getElementById('kb-le-note').textContent;
    GardenLe.close();
    return R;
  });
  ok(!F.whileSettings && F.afterSettings, 'cảnh đêm 24 không tự bật khi ⚙ đang mở; đóng ⚙ thì bật');
  ok(!F.emptyPack && F.fullPack, '1/1 không có gì để cất → không bật bảng danh sách trống; có món → bảng có đúng món');
  ok(F.toastTop, 'thông báo nổi nằm trên xưởng thiệp (chỗ chồng nhau: ' + F.overlap + ')');
  ok(/tường Bếp/.test(F.kitchen) && /tường Phòng ngủ/.test(F.bedroom), 'tủ lịch tự treo: "' + F.kitchen + '" / "' + F.bedroom + '"');

  console.log('== F. Xem thử: bản chưa lưu của chế độ cũ bị bỏ');
  const G = await pg.evaluate(() => {
    const sent = window.__sent; sent.length = 0;
    const v = window.__data.le;
    GardenLeCard.render();
    GardenLeCard.open(0);
    const t1 = document.querySelector('#kb-le-cardpop input'); t1.value = 'Thật'; t1.dispatchEvent(new Event('input'));
    GardenLeCard.flush();
    const c = JSON.parse(sent.filter((x) => x.indexOf('le:card:') === 0).slice(-1)[0].slice(8));
    GardenLeCard.result({ ok: false, act: 'card', sync: true, i: 0, rid: c.rid, msg: 'x' });
    const had = Object.keys(GardenLeCard._pend()).length;
    GardenLeCard.close();
    v.preview = true; v.preview_key = '2026-12-24T19:00';
    GardenLeCard.render();
    const after = Object.keys(GardenLeCard._pend()).length;
    v.preview = false; delete v.preview_key;
    GardenLeCard.render();
    return { had, after };
  });
  ok(G.had === 1 && G.after === 0, 'bật Xem thử → bản chờ gửi lại của chế độ thật bị bỏ (' + G.had + ' → ' + G.after + ')');

  ok(!errs.length, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await b.close();
  const n = results.filter(Boolean).length;
  console.log('\nKẾT QUẢ: ' + n + '/' + results.length + (n === results.length ? ' — TẤT CẢ OK' : ''));
  process.exit(n === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(1); });
