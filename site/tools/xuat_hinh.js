/* Trang web chung (GitHub Pages): xuất MỌI hình của vườn từ chính mã của add-on → site/data/hinh.json + site/hinh/*.png.
   - Tên / giá / mô tả: site/tools/xuat_ten.py (đọc garden_core, more_core, guest_core… của add-on).
   - Hình: nạp web/*.js của add-on vào Chromium (đúng thứ tự như __init__.py, không sửa add-on), đọc các bảng hình
     (SPR + khung + bảng màu) qua GardenFix / GardenHome._lib() …; thứ vẽ bằng hàm (nhà, tường & sàn, StackChan, cảnh vùng)
     thì vẽ ra canvas rồi lưu PNG đúng cỡ điểm ảnh gốc (trang web phóng to bằng image-rendering: pixelated).
   - Có bản sửa hình gốc đi kèm gói (kotoba_batake/mau_sua.json) thì áp như trong game.
   Chạy (sau mỗi lần đổi hình / thêm đồ):  node site/tools/xuat_hinh.js [THU_MUC_ADDON]
   Cần: python3, Playwright + Chromium (máy Claude Code trên web có sẵn). */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', '..');
const ADDON = path.resolve(process.argv[2] || path.join(ROOT, 'kotoba_batake'));
const SITE = path.join(ROOT, 'site');
const IMG_DIR = path.join(SITE, 'hinh');
const DATA = path.join(SITE, 'data', 'hinh.json');

// thứ tự nạp như __init__.py (web/*.js)
const FILES = ['diag', 'prefs', 'fix', 'icons', 'sky', 'season', 'fx', 'music', 'games', 'fields', 'season_art', 'rare_art',
  'nha_art', 'pets', 'guests', 'finds_art', 'finds', 'le_art', 'le_card', 'le_orn', 'le_noel', 'le', 'life', 'home', 'craft', 'paper', 'seeds', 'joy',
  'ui', 'calendar', 'greet', 'tour', 'garden'];
// mở thêm vài hàm nội bộ cho công cụ này (chỉ trong trình duyệt của công cụ — file của add-on không đổi)
const PATCH = {
  home: [['_lib: () => ({ SPR,', '_lib: () => ({ NHA, mascotCanvas, drawZoneBg, DAY_SKY, YARD, FRAMES, BASE, SPR,']],
  garden: [['SPRITES: SPRITES', 'SPRITES: SPRITES, _PAL: PAL, _DRY: DRY']],
};

function readFixes(addon) {
  addon = addon || ADDON;
  const f = path.join(addon, 'mau_sua.json');
  if (!fs.existsSync(f)) { return {}; }
  const py = 'import sys, json; sys.path.insert(0, sys.argv[1]); import mau_core; print(json.dumps(mau_core.read(sys.argv[2])["sua"]))';
  return JSON.parse(execFileSync('python3', ['-c', py, addon, f], { encoding: 'utf8' }));
}

// ---- chạy trong trang: gom hình ----
function collect(meta) {
  const out = { groups: [], png: {}, missing: [] };
  const L = GardenHome._lib();
  const P = L.P;
  const isRows = (r) => Array.isArray(r) && r.length > 0 && typeof r[0] === 'string';
  // bảng màu chỉ giữ màu hình dùng tới (mỗi hình tự đủ để vẽ / tải về)
  function palOf(frames, pal) {
    const used = {};
    Object.values(frames).forEach((rows) => rows.forEach((r) => { for (const c of r) { if (c !== '.') { used[c] = 1; } } }));
    const p = {};
    Object.keys(used).sort().forEach((c) => {
      const v = pal[c];
      if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) { p[c] = v.toLowerCase(); } else { p[c] = '#ff00ff'; out.missing.push(c); }
    });
    return p;
  }
  function spr(frames, pal, labels) {
    if (!Object.keys(frames || {}).some((k) => isRows(frames[k]))) { return { frames: {}, labels: {}, pal: {}, w: 0, h: 0 }; }
    const f = {};
    Object.keys(frames).forEach((k) => { if (isRows(frames[k])) { f[k] = frames[k].slice(); } });
    const first = f[Object.keys(f)[0]];
    return { frames: f, labels: labels || {}, pal: palOf(f, pal), w: first ? first[0].length : 0, h: first ? first.length : 0 };
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; }
  // cắt phần trong suốt quanh hình
  function crop(cv, pad) {
    const x = cv.getContext('2d'), d = x.getImageData(0, 0, cv.width, cv.height).data;
    let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
    for (let y = 0; y < cv.height; y++) {
      for (let i = 0; i < cv.width; i++) { if (d[(y * cv.width + i) * 4 + 3] > 0) { x0 = Math.min(x0, i); x1 = Math.max(x1, i); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
    }
    if (x1 < 0) { return null; }
    pad = pad || 0;
    x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(cv.width - 1, x1 + pad); y1 = Math.min(cv.height - 1, y1 + pad);
    const [c2, g2] = canvas(x1 - x0 + 1, y1 - y0 + 1);
    g2.drawImage(cv, -x0, -y0);
    return c2;
  }
  function png(name, cv) {
    if (!cv) { out.missing.push('png:' + name); return null; }
    const file = 'hinh/' + name + '.png';
    out.png[file] = cv.toDataURL('image/png');
    return { src: file, w: cv.width, h: cv.height };
  }
  const items = meta.items;
  const doFrames = (id) => {
    const fr = GardenFix.frames('do', id);
    const labels = {};
    Object.keys(fr).forEach((n, i) => { labels[n] = GardenFix.label('do', n, i); });
    return spr(fr, GardenFix.pal('do', id) || P, labels);
  };
  function itemEntry(it, extra) {
    const s = doFrames(it.id);
    if (!s.w) { out.missing.push('do:' + it.id); }
    return Object.assign({ id: it.id, name: it.name, price: it.price, desc: it.desc, place: it.place, cells: it.w }, s, extra || {});
  }
  const SCENE = {}; meta.zones.forEach((z) => { SCENE[z.id] = z.name; });
  const PLACE = { ground: 'Đặt trên đất', floor: 'Đặt trên sàn', wall: 'Treo tường' };
  const add = (g) => { if (g.items.length) { out.groups.push(g); } };
  const used = {};
  const take = (pred) => items.filter((it) => !used[it.id] && pred(it)).map((it) => { used[it.id] = 1; return it; });

  // ---- đồ trang trí ----
  const season = take((it) => it.season), rare = take((it) => it.rare), set = take((it) => it.only === 'set'),
    ped = take((it) => it.only === 'ped'), le = take((it) => it.only === 'le');      // 1.36: quà tủ lịch Giáng sinh
  const yard = take((it) => it.scene === 'yard'), room = take((it) => it.scene === 'room'), zone = take(() => true);
  add({ id: 'san', name: 'Sân vườn', ja: '庭', desc: 'Đồ trang trí mua ở tab Trang trí sân (đặt được ở sân và mọi vùng ngoài trời).',
    items: yard.map((it) => itemEntry(it, { tag: PLACE[it.place] })) });
  add({ id: 'trong_nha', name: 'Trong nhà', ja: '家の中', desc: 'Nội thất của phòng chính, Bếp và Phòng ngủ.',
    items: room.map((it) => itemEntry(it, { tag: (it.group ? meta.rooms[it.group] + ' · ' : '') + PLACE[it.place] })) });
  add({ id: 'vung', name: 'Đồ của các vùng', ja: '旅先', desc: 'Mỗi vùng mới có 6 món riêng.',
    items: zone.map((it) => itemEntry(it, { tag: SCENE[it.scene] || it.scene })) });
  add({ id: 'mua', name: 'Mùa & lễ hội', ja: '季節', desc: 'Đồ theo giao diện mùa — mở chủ đề là được tặng các món.',
    items: season.map((it) => itemEntry(it, { tag: (meta.themes[it.season] || {}).name || it.season })) });
  add({ id: 'hiem', name: 'Đồ hiếm', ja: 'レア', desc: 'Không bán — mở rương nhiệm vụ mới có.', items: rare.map((it) => itemEntry(it, { tag: 'Rương nhiệm vụ' })) });
  // 1.36.2: món trong hộp quà bí mật — trang che (hình bóng, không tên) tới sáng mở hộp (`secret` = ngày)
  const boxItems = (meta.le && meta.le.box_items) || [];
  add({ id: 'giang_sinh', name: 'Giáng sinh 2026', ja: 'クリスマス', desc: 'Không bán — quà của Lịch chờ Giáng sinh (1–24/12): mỗi ngày ôn mở một ngăn.',
    items: le.map((it) => itemEntry(it, Object.assign({ tag: 'Tủ lịch · ' + PLACE[it.place] }, boxItems.indexOf(it.id) >= 0 ? { secret: meta.le.box_day } : {}))) });

  // ---- Hộp sưu tầm + quà đủ bộ + gánh hàng rong ----
  const FA = GardenFindArt;
  const finds = meta.finds.map((f) => {
    const rows = FA.find(f.id);
    const s = isRows(rows) ? spr({ spr: rows }, FA.pal) : spr({}, {});
    if (!s.w) { out.missing.push('find:' + f.id); }
    return Object.assign({ id: f.id, name: f.vi, ja: f.ja, kana: f.kana, tag: meta.find_scenes[f.scene] }, s);
  });
  add({ id: 'suu_tam', name: 'Hộp sưu tầm', ja: '拾い物', desc: '42 món nhặt ở chỗ lấp lánh — mỗi vùng một bộ 6 món, có tên tiếng Nhật.', items: finds });
  const setOrder = Object.keys(meta.set_reward);
  set.sort((a, b) => setOrder.indexOf(a.set) - setOrder.indexOf(b.set));
  add({ id: 'qua_bo', name: 'Quà đủ bộ', ja: 'ごほうび', desc: 'Nhặt đủ một bộ sưu tầm là được tặng.',
    items: set.map((it) => itemEntry(it, { tag: 'Đủ bộ ' + (meta.find_scenes[it.set] || it.set) })) });
  const vend = ['a', 'b'].map((k) => FA.peddler(k));
  const pedItems = ped.map((it) => itemEntry(it, { tag: 'Gánh hàng rong · ' + PLACE[it.place] }));
  if (isRows(vend[0])) {
    pedItems.unshift(Object.assign({ id: 'peddler', name: 'Người gánh hàng rong', desc: 'Ghé vườn thứ Tư và Chủ nhật.' },
      spr({ a: vend[0], b: vend[1] }, FA.pal, { a: 'Đứng', b: 'Nhún' })));
  }
  add({ id: 'ganh_hang', name: 'Gánh hàng rong', ja: '行商', desc: 'Thứ Tư và Chủ nhật — mỗi phiên một món chỉ có ở gánh hàng.', items: pedItems });

  // ---- thú nuôi, khách ----
  const lab = (g, fr) => { const o = {}; Object.keys(fr).forEach((n, i) => { o[n] = GardenFix.label(g, n, i); }); return o; };
  add({ id: 'thu', name: 'Thú nuôi', ja: 'ペット', desc: 'Mua ở tab Thú nuôi, chơi quanh sân và trong nhà.',
    items: meta.pets.map((p) => { const fr = GardenFix.frames('thu', p.id); return Object.assign({ id: p.id, name: p.name, price: p.price, desc: p.desc, tag: p.room ? 'Vào được trong nhà' : 'Ở ngoài sân' }, spr(fr, GardenFix.pal('thu', p.id), lab('thu', fr))); }) });
  // đom đóm (kind "swarm") không có hình khung: guests.js vẽ chấm sáng lúc đêm (drawTop) — vẽ lại vài chấm đúng màu trên nền đêm
  function swarm() {
    const [c, x] = canvas(32, 22);
    x.fillStyle = '#1e2a4a'; x.fillRect(0, 0, 32, 22);
    [[5, 6, 1], [12, 12, 0.7], [19, 5, 1], [25, 14, 0.85], [9, 17, 0.6], [28, 8, 0.75], [16, 18, 0.9]].forEach(([px, py, on]) => {
      x.globalAlpha = 0.3 * on; x.fillStyle = '#e9ff7a'; x.beginPath(); x.arc(px + 0.5, py + 0.5, 2, 0, Math.PI * 2); x.fill();
      x.globalAlpha = on; x.fillStyle = '#f6ff9e'; x.fillRect(px, py, 1, 1);
    });
    x.globalAlpha = 1;
    return c;
  }
  add({ id: 'khach', name: 'Khách ghé vườn', ja: 'お客さん', desc: 'Tự ghé theo giờ, thời tiết và đồ đã đặt — gặp là ghi vào Album khách.',
    items: meta.guests.map((g) => {
      const fr = GardenFix.frames('khach', g.id);
      const base = { id: g.id, name: g.name, ja: g.ja, desc: g.hint, tag: g.where === 'in' ? 'Trong nhà' : 'Ngoài trời' };
      if (!Object.keys(fr).length) {
        if (g.id === 'hotaru') { return Object.assign(base, { img: png('khach/hotaru', swarm()) }); }
        out.missing.push('khach:' + g.id);
      }
      return Object.assign(base, spr(fr, GardenFix.pal('khach', g.id), lab('khach', fr)));
    }) });

  // ---- cây ----
  const ST = meta.share.stages;
  const stLab = {}; ST.forEach((n, i) => { stLab[String(i)] = n; });
  const plants = [];
  if (Garden.SPRITES && Garden._PAL) {
    const fr = {}; Garden.SPRITES.forEach((r, i) => { fr[String(i)] = r; });
    plants.push(Object.assign({ id: 'goc', name: 'Cây gốc', desc: 'Cây mặc định của mọi thẻ — lớn dần theo độ nhớ.', tag: 'Có sẵn' }, spr(fr, Garden._PAL, stLab),
      { dry: palOf(fr, Garden._DRY) }));
  }
  meta.seeds.forEach((sd) => {
    const fr = GardenFix.frames('giong', sd.id);
    plants.push(Object.assign({ id: sd.id, name: sd.name, price: sd.price, desc: sd.desc, tag: 'Giống cây' }, spr(fr, GardenSeeds.pal(false, sd.id), stLab),
      { dry: palOf(fr, GardenSeeds.pal(true, sd.id)) }));
  });
  Object.keys(meta.cal_flowers).forEach((id) => {
    const fr = GardenFix.frames('giong', id);
    if (!Object.keys(fr).length) { out.missing.push('giong:' + id); return; }
    plants.push(Object.assign({ id: id, name: meta.cal_flowers[id], desc: 'Hoa trong ô Lịch hoa theo giao diện mùa.', tag: 'Lịch hoa' }, spr(fr, GardenSeeds.pal(false, id), stLab)));
  });
  add({ id: 'cay', name: 'Cây & giống cây', ja: '畑', desc: 'Mỗi thẻ Anki là một cây: Hạt → Mầm → Cây non → Ra hoa → Ra quả.', items: plants });

  // ---- StackChan: linh vật, đồ mặc, nét mặt (vẽ bằng hàm của game) ----
  const sc = [];
  const mascot = (name, on, mood) => png('stackchan/' + name, crop(L.mascotCanvas(on, mood, 1)));
  sc.push({ id: 'stackchan', name: 'StackChan', desc: 'Linh vật của vườn — đứng góc trái, đổi nét mặt theo việc bạn làm.', tag: 'Linh vật', img: mascot('stackchan', {}, 'happy') });
  const SLOT = { head: 'Mũ', face: 'Mặt', neck: 'Cổ', shell: 'Vỏ' };
  meta.wear.forEach((w) => { sc.push({ id: w.id, name: w.name, price: w.price, tag: 'Tủ đồ · ' + SLOT[w.slot], img: mascot('mac_' + w.id, { [w.slot]: w.id }, 'happy') }); });
  meta.faces.forEach((f) => { sc.push({ id: 'mat_' + f.id, name: f.name, price: f.price, tag: 'Nét mặt', img: mascot('mat_' + f.id, {}, f.id) }); });
  add({ id: 'stackchan', name: 'StackChan', ja: 'スタックチャン', desc: 'Đồ mặc và nét mặt mua ở tab Tủ đồ.', items: sc });

  // ---- tường & sàn: một gian phòng chính dán đúng mẫu (kiểu nhà gỗ mái đỏ) ----
  const R = L.ROOM, decor = [];
  const room1 = (deco) => { const [c, x] = canvas(R.W, R.H); L.NHA.bg(x, 1, 0, 0, 'room', R.W, R.H, R.FLOOR, 'classic', deco); return c; };
  meta.decor.walls.forEach((w) => decor.push({ id: w.id, name: w.name, ja: w.ja, price: w.price, desc: w.desc, tag: 'Giấy dán tường', img: png('tuong_san/' + w.id, room1({ wall: w.id, floor: null, tiles: {} })) }));
  meta.decor.floors.forEach((f) => decor.push({ id: f.id, name: f.name, ja: f.ja, price: f.price, desc: f.desc, tag: 'Sàn nhà', img: png('tuong_san/' + f.id, room1({ wall: null, floor: f.id, tiles: {} })) }));
  // 1.36: mẫu Noel — quà tủ lịch Giáng sinh (không bán)
  (meta.decor.noel || []).forEach((t) => decor.push({ id: t.id, name: t.name, ja: t.ja, price: 0, desc: t.desc, tag: (t.slot === 'wall' ? 'Giấy dán tường' : 'Sàn nhà') + ' · quà Giáng sinh',
    img: png('tuong_san/' + t.id, room1(t.slot === 'wall' ? { wall: t.id, floor: null, tiles: {} } : { wall: null, floor: t.id, tiles: {} })) }));
  add({ id: 'tuong_san', name: 'Tường & sàn', ja: '壁紙・床', desc: 'Mua một lần, dán cho gian nào cũng được.', items: decor });

  // ---- nhà: các bậc xây + kiểu nhà ----
  const house = (level, style) => { const [c, x] = canvas(64, 76); L.drawHouse ? L.drawHouse(x, 1, 0, 0, level, 0, 'day', style) : GardenHome._drawHouse(x, 1, 0, 0, level, 0, 'day', style); return crop(c); };
  const nha = [];
  meta.levels.forEach((lv, i) => { if (i > 0) { nha.push({ id: 'bac' + i, name: lv.name, price: lv.price, tag: 'Bậc ' + i, img: png('nha/bac' + i, house(i, 'classic')) }); } });
  meta.styles.forEach((s) => { if (s.id !== 'classic') { nha.push({ id: s.id, name: s.name, price: s.price, tag: 'Kiểu nhà', img: png('nha/' + s.id, house(7, s.id)) }); } });
  add({ id: 'nha', name: 'Nhà', ja: '家', desc: 'Xây từng bậc bằng xu, xây xong thì đổi được kiểu nhà.', items: nha });

  // ---- cảnh các vùng (trời ban ngày, chưa đặt đồ) + nền vùng tự tạo ----
  const Y = L.YARD, scenes = [];
  meta.zones.forEach((z) => {
    if (z.id === 'yard') { return; }
    const [c, x] = canvas(Y.W, Y.H);
    try { L.drawZoneBg(x, 1, 0, 0, 0, z.id, 0, Y.W, L.DAY_SKY); } catch (e) { out.missing.push('vung:' + z.id + ' ' + e.message); return; }
    scenes.push({ id: z.id, name: z.name, price: z.price, tag: 'Vùng mới', img: png('vung/' + z.id, c) });
  });
  const uz = meta.uzone;
  uz.bg.forEach((b, i) => {
    const c = GardenHome.zoneBgCanvas({ bg: b.id, ground: uz.ground[i * 2 % uz.ground.length], hills: uz.hills[i * 2 % uz.hills.length] });
    scenes.push({ id: 'nen_' + b.id, name: b.name, tag: 'Nền vùng tự tạo', desc: 'Màu đất và đồi chọn được trong Xưởng.', img: png('vung/nen_' + b.id, c) });
  });
  add({ id: 'canh', name: 'Cảnh các vùng', ja: '風景', desc: 'Nền của từng vùng lúc trời trong, chưa đặt đồ.', items: scenes });

  // ---- biểu tượng giao diện ----
  const IC = GardenIcons, icons = [];
  Object.keys(IC._icons).forEach((id) => { icons.push(Object.assign({ id: id, name: id }, spr({ spr: IC._icons[id] }, IC._pal))); });
  add({ id: 'bieu_tuong', name: 'Biểu tượng', ja: 'アイコン', desc: 'Icon 8×8 thay cho emoji trong giao diện.', items: icons });
  return out;
}

// ---- chạy trong trang: dữ liệu vẽ thiệp Giáng sinh cho mục "Giáng sinh 2026" (site/thiep.js vẽ y như web/le_card.js drawCard) ----
function collectLe() {
  const L = GardenHome._lib(), SPR = L.SPR, P = L.P;
  const ok = (k) => /^[a-z][a-z0-9_]{0,39}$/.test(k) && Array.isArray(SPR[k]) && SPR[k].length && typeof SPR[k][0] === 'string';
  const stickers = {}, used = {};
  Object.keys(SPR).filter(ok).sort().forEach((k) => { stickers[k] = SPR[k].slice(); SPR[k].forEach((r) => { for (const c of r) { if (c !== '.') { used[c] = 1; } } }); });
  const pal = {}, missing = [];
  Object.keys(used).sort().forEach((c) => { if (typeof P[c] === 'string') { pal[c] = P[c].toLowerCase(); } else { missing.push(c); } });
  // StackChan đội mũ Noel: hàm vẽ (GardenFX.lib.paintFace) → hàng điểm ảnh ở cỡ 1 (đo cả phần vượt khung 20 × 21)
  const PAD = 24, cv = document.createElement('canvas'); cv.width = 20 + PAD * 2; cv.height = 21 + PAD * 2;
  const g = cv.getContext('2d'); g.imageSmoothingEnabled = false; g.translate(PAD, PAD);
  GardenFX.lib.paintFace(g, 1, 'happy', 0, 0, { head: 'santa' });
  const d = g.getImageData(0, 0, cv.width, cv.height).data;
  let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1;
  for (let y = 0; y < cv.height; y++) { for (let x = 0; x < cv.width; x++) { if (d[(y * cv.width + x) * 4 + 3]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } } }
  const keys = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const spal = {}, back = {}, rows = [];
  for (let y = y0; y <= y1; y++) {
    let r = '';
    for (let x = x0; x <= x1; x++) {
      const i = (y * cv.width + x) * 4;
      if (!d[i + 3]) { r += '.'; continue; }
      if (d[i + 3] !== 255) { missing.push('stackchan alpha'); }
      const hx = '#' + [d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('');
      if (!back[hx]) { const k = keys[Object.keys(back).length]; back[hx] = k; spal[k] = hx; }
      r += back[hx];
    }
    rows.push(r);
  }
  const music = typeof GardenMusic !== 'undefined' && GardenMusic.noelChoices ? GardenMusic.noelChoices() : [];
  return { pal: pal, stickers: stickers, stackchan: { rows: rows, pal: spal, dx: x0 - PAD, dy: y0 - PAD, w: 20, h: 21 }, music: music,
    base: ['xmastree', 'presents', 'yukidaruma', 'stackchan', 'wreath', 'sleigh'], missing: missing };
}

// mở một trang Chromium đã nạp toàn bộ web/*.js của add-on (dùng chung với tests/trang/kiem_tra_trang.js)
async function openGame(browser, addon) {
  addon = addon || ADDON;
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  const body = fs.readFileSync(path.join(addon, 'web', 'body.html'), 'utf8');
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>' + body + '</body></html>');
  // giờ cố định → hình động (chớp mắt, nhún) ra giống nhau mỗi lần xuất
  await page.addScriptTag({ content: 'window.__kbFix = ' + JSON.stringify(readFixes(addon)) + '; window.pycmd = function () {}; Date.now = function () { return 1000; };' });
  for (const f of FILES) {
    let src = fs.readFileSync(path.join(addon, 'web', f + '.js'), 'utf8');
    (PATCH[f] || []).forEach(([a, b]) => {
      if (src.split(a).length !== 2) { throw new Error('Không vá được ' + f + '.js (mã add-on đã đổi?): ' + a); }
      src = src.replace(a, b);
    });
    await page.addScriptTag({ content: src + '\n//# sourceURL=' + f + '.js' });
  }
  if (errors.length) { throw new Error('Lỗi khi nạp mã add-on: ' + errors.join('; ')); }
  return page;
}

async function main() {
  const meta = JSON.parse(execFileSync('python3', [path.join(__dirname, 'xuat_ten.py'), ADDON], { encoding: 'utf8', maxBuffer: 64 << 20 }));
  const browser = await chromium.launch();
  const page = await openGame(browser);
  const res = await page.evaluate(collect, meta);
  const leArt = await page.evaluate(collectLe);
  res.groups.forEach((g) => g.items.forEach((it) => { if (!it.img && !it.w) { res.missing.push('không hình: ' + g.id + '/' + it.id); } }));
  await browser.close();

  fs.rmSync(IMG_DIR, { recursive: true, force: true });
  let n = 0;
  for (const [file, url] of Object.entries(res.png)) {
    const dest = path.join(SITE, file);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, Buffer.from(url.split(',')[1], 'base64'));
    n++;
  }
  const data = { version: meta.version, groups: res.groups };
  fs.mkdirSync(path.dirname(DATA), { recursive: true });
  fs.writeFileSync(DATA, JSON.stringify(data));
  // thông tin chung cho trang (bản add-on, email liên hệ, giá khi dán mã, bảng màu Xưởng)
  const info = { version: meta.version, contact: meta.contact, share: meta.share, craft: meta.craft, uzone: meta.uzone };
  fs.writeFileSync(path.join(SITE, 'data', 'thong_tin.json'), JSON.stringify(info, null, 1));
  // 1.36.2: mục "Giáng sinh 2026" — lịch / luật / ngăn theo nhóm (không có món trong hộp quà bí mật) + hình để vẽ thiệp
  const ev = Object.assign({}, meta.le);
  delete ev.box_items;
  Object.assign(ev, { version: meta.version, pal: leArt.pal, stickers: leArt.stickers, stackchan: leArt.stackchan, music: leArt.music, base: leArt.base });
  fs.writeFileSync(path.join(SITE, 'data', 'su_kien.json'), JSON.stringify(ev));
  if (leArt.missing.length) { res.missing.push('thiệp: ' + leArt.missing.join(',')); }
  const total = res.groups.reduce((s, g) => s + g.items.length, 0);
  console.log('Bản ' + meta.version + ': ' + res.groups.length + ' nhóm, ' + total + ' hình, ' + n + ' file PNG → site/');
  res.groups.forEach((g) => console.log('  ' + g.name + ': ' + g.items.length));
  if (res.missing.length) { console.log('THIẾU / LẠ: ' + Array.from(new Set(res.missing)).join(', ')); process.exitCode = 1; }
}

module.exports = { openGame, ADDON, SITE };
if (require.main === module) { main().catch((e) => { console.error(e); process.exit(1); }); }
