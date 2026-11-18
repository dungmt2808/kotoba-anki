// Ảnh phác 1.36 (18/11) — Giáng sinh: Lịch chờ Giáng sinh + cây thông của riêng mình + thiệp điều ước + ông già Noel đêm 24.
// Chưa phải mã thật: vẽ đè lên vườn thật của 1.35.2 (giao diện mùa Giáng sinh thật, trời / tuyết / đêm thật của add-on).
// Cây thông, món treo, ông già Noel, thiệp… là tranh pixel vẽ tạm trong file này (MK_ART) — khi làm thật sẽ vẽ lại ở web/.
// Chạy (ANKI_PY = venv aqt):
//   B=/tmp/kb_m136; ./setup_demo.sh $B ../../kotoba_batake
//   (./run_anki.sh $B 9333 $B.log &) ; node mock_136.js OUT [bước…] ; python3 mock_136_ghep.py OUT RA
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_136';
const ONLY = process.argv.slice(3);
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
    const p = await Page.open(info.webSocketDebuggerUrl);
    const yes = await Promise.race([p.eval('typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
    if (yes) { return p; }
    p.close();
  }
  return null;
}
async function shot(name) { await sleep(400); await page.shot(path.join(OUT, name + '.png')); console.log('  ảnh', name); }
const size = (w, h) => py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`).then(() => sleep(900));
const sky = (h, w) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", ${JSON.stringify(w || 'sunny')}); return 1;`);
const hideToast = () => js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');

const ART = fs.readFileSync(path.join(__dirname, 'mock_136_art.js'), 'utf8');
const loadArt = () => page.eval(ART + '; 1');
const clearMk = () => js('document.querySelectorAll(".mk-x").forEach((e) => e.remove()); document.querySelectorAll(".mk-hl").forEach((e) => e.classList.remove("mk-hl")); return 1;');

async function setup() {
  await py(KB + `d = st.load(); d["coins"] = 200000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
try:
    st.unlock_theme("noel", "coins")
except Exception as e:
    pass
st.set_theme("auto")
for _ in range(3):
    try:
        st.open_rooms()
    except Exception:
        pass
for iid, x, y in [("shelf", 0, 1), ("kotatsu", 4, 2), ("rug", 4, 2), ("plant", 9, 1), ("clock", 7, 0), ("lamp", 8, 2)]:
    try:
        st.buy(iid); st.place("room", iid, x, y)
    except Exception:
        pass
d = st.load(); d["coins"] = 3420; st.save(d)
kb.finds.is_market = lambda day: False          # ảnh phác tháng 12: không có gánh hàng / chỗ lấp lánh của hôm nay
kb.finds.open_count = lambda reviews: 0
kb.save_config(show_tooltips=False, sound=False, music=False)
kb.open_garden(); result = 1`);
  await sleep(3000);
}
async function connect() {
  page = await gardenPage();
  if (!page) { await setup(); page = await gardenPage(); }
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await size(1500, 1050);
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); if (typeof GardenGreet !== "undefined" && GardenGreet.close) GardenGreet.close(); return 1;');
  await loadArt();
}
// 1.36 bản 2 (người dùng 18/11: bỏ từ gắn món — chỉ để trang trí, làm kỷ niệm; cây bớt rối; trang trí cả nhà)
// 24 ô cửa: [loại, món, tên] — cây 10 · ngoài nhà 7 · trong nhà 7; Chủ nhật 6 / 13 / 20 tự vẽ
const DOORS = { 1: ['cay', 'ball', 'Quả châu đỏ'], 2: ['cay', 'garland', 'Dây kim tuyến'], 3: ['nha', 'wreath', 'Vòng hoa cửa'], 4: ['cay', 'bell', 'Chuông vàng'],
  5: ['nha', 'roof', 'Đèn mái nhà'], 6: ['cay', 'my_neko', 'Tự vẽ'], 7: ['trong', 'wreath_in', 'Vòng hoa tường'], 8: ['cay', 'flake', 'Bông tuyết'],
  9: ['trong', 'stocking', 'Tất Noel'], 10: ['cay', 'lights', 'Dây đèn'], 11: ['trong', 'minitree', 'Cây thông nhỏ'], 12: ['nha', 'icicles', 'Cột băng'],
  13: ['nha', 'sticker', 'Tự vẽ'], 14: ['nha', 'snowman', 'Người tuyết'], 15: ['cay', 'bow', 'Nơ đỏ'], 16: ['trong', 'cake', 'Bánh khúc cây'],
  17: ['nha', 'canes', 'Kẹo gậy'], 18: ['cay', 'ball_blue', 'Quả châu xanh'], 19: ['nha', 'candles', 'Nến cửa sổ'], 20: ['trong', 'paint', 'Tự vẽ'],
  21: ['trong', 'yuzu', 'Bát yuzu'], 22: ['cay', 'angel', 'Thiên thần'], 23: ['trong', 'gifts', 'Hộp quà'], 24: ['cay', 'star', 'Ngôi sao'] };
const TREE_AT = { 1: 4, 4: 1, 6: 8, 8: 2, 15: 0, 18: 3, 22: 5 };          // ô → chỗ treo (MK.SPOTS2)
const KIND = { cay: 'Cây', nha: 'Nhà', trong: 'Trong nhà' };
function stateAt(upTo, skip) {
  const tree = { tx: 150, ty: 22, spots2: true, items: [] }, house = {}, room = {};
  for (let d = 1; d <= upTo; d++) {
    if ((skip || []).indexOf(d) >= 0) { continue; }
    const [k, id] = DOORS[d];
    if (k === 'cay') { if (TREE_AT[d] !== undefined) { tree.items.push({ id, spot: TREE_AT[d], day: d }); } else { tree[id] = true; } }
    else if (k === 'nha') { house[id] = true; } else { room[id] = true; }
  }
  return { tree, house, room };
}
const collapseToday = () => js('GardenUI.setGlob("today", "mini"); return 1;').then(() => sleep(400));
const openToday = () => js('GardenUI.setGlob("today", "open"); return 1;').then(() => sleep(400));
async function scene(S, opts) {
  opts = opts || {};
  await sky(opts.hour || 10, opts.weather || 'snow'); await sleep(900);
  await clearMk(); await loadArt();
  return js(`MKU.ensureCss(); const v = MK.cover("mk-ov"); const S = ${JSON.stringify(S)}, night = ${!!opts.night};
    S.tree.night = night; S.house.night = night;
    MK.drawHouseDeco(v, S.house); const placed = MK.drawTree(v, S.tree);
    ${opts.extra || ''}
    window.__v = v; window.__placed = placed; window.SX = (x) => v.r.left + (v.ox + x) * v.S; window.SY = (yy) => v.r.top + (v.oy + yy) * v.S; return placed;`);
}
const STEPS = {};
async function toScene(name) {
  for (let k = 0; k < 6; k++) {
    const cur = await js('return document.getElementById("kb-yard-name").textContent;');
    if (cur.indexOf(name) === 0) { return; }
    await js('document.getElementById("kb-yard-next").click(); return 1;'); await sleep(1300);
  }
}
// icon cho ô cửa (mọi món)
const ICON_JS = `const ICON = { garland: MK.pic(["y...y...y", ".i.i.i.i.", "..y...y.."], true), lights: MK.pic(["k.k.k.k.k", "r.y.l.p.f"], true),
  wreath_in: MK.WREATH, roof: MK.pic(["....k....", "..kk.kk..", "kk.....kk", "r.y.l.p.f"], true),
  icicles: MK.pic(["sssssssss", "l.l.l.l.l", "l...l...l"], true), wreath: MK.WREATH, sticker: MK.STICKER, snowman: MK.SNOWMAN_BIG, canes: MK.CANE_BIG,
  candles: MK.CANDLE, stocking: MK.STOCKING, minitree: MK.MINI_TREE, cake: MK.CAKE, paint: MK.PAINT, yuzu: MK.YUZU_BOWL, gifts: MK.GIFTS };
  const iconOf = (id) => { const r = MK.ORN[id] || ICON[id]; const sc = Math.max(2, Math.min(4, Math.floor(30 / Math.max(r[0].length, r.length)))); return MK.icon(r, sc); };`;

// 01 — Lịch chờ Giáng sinh (giả hôm nay là Thứ Năm 10/12)
STEPS.lich = async () => {
  await openToday();
  const S = stateAt(9, [4]);
  await scene(S);
  await js(`const D = ${JSON.stringify(DOORS)}, K = ${JSON.stringify(KIND)}, today = 10, miss = [4]; ${ICON_JS}
    MKU.todayLine("[i:gift] Lịch chờ Giáng sinh: ô 10/12 chưa mở ▸");
    const p = MKU.pop("mk-cal", 160, 432, 930);
    MKU.head(p, "Lịch chờ Giáng sinh", "アドベントカレンダー · 1–24/12", "Thứ Năm 10/12");
    const body = p.appendChild(MKU.el("div", "mk-body")), grid = body.appendChild(MKU.el("div", "mk-doors"));
    for (let d = 1; d <= 24; d++) {
      const c = grid.appendChild(MKU.el("div", "mk-door")), [k, id, name] = D[d];
      c.appendChild(MKU.el("span", "mk-n", String(d)));
      if (d < today && miss.indexOf(d) < 0) {
        c.classList.add("is-open"); c.appendChild(MKU.el("span", "mk-kind k-" + k, K[k]));
        c.appendChild(iconOf(id)); c.appendChild(MKU.el("span", "mk-name", name));
      } else if (d === today) {
        c.classList.add("is-today"); c.appendChild(MKU.el("span", "", "Hôm nay")); c.appendChild(MKU.el("span", "", "Mở ô ▸"));
      } else if (miss.indexOf(d) >= 0) {
        c.classList.add("is-miss"); c.appendChild(MKU.el("div", "", "Lỡ ngày này"));
        c.appendChild(MKU.el("div", "mk-nw", "ôn thêm 15 lượt")); const b = c.appendChild(MKU.el("div", "mk-bar")); b.innerHTML = '<i style="width:60%"></i>'; c.appendChild(MKU.el("div", "mk-nw", "9 / 15"));
      } else {
        c.classList.add("is-shut"); if (d % 2) { c.classList.add("alt"); } if (d === 24) { c.classList.add("star"); }
        if ([6, 13, 20].indexOf(d) >= 0) { c.appendChild(MKU.el("span", "mk-own", "tự vẽ")); }
        if (d === 24) { c.appendChild(MKU.el("span", "mk-own mk-bot", "ngôi sao")); }
      }
    }
    const side = body.appendChild(MKU.el("div", "mk-side"));
    const cv = side.appendChild(document.createElement("canvas")); cv.width = 180; cv.height = 200;
    MK.miniTree(cv, 3, ${JSON.stringify(S.tree)}, "#eaf3f7");
    side.appendChild(MKU.el("div", "", "<b>Giáng sinh 2026</b><br>Cây 4 · Nhà 2 · Trong nhà 2"));
    side.appendChild(MKU.el("button", "kb-btn", "Mở ô hôm nay ▸"));
    side.appendChild(MKU.el("div", "mk-note", "Thiệp điều ước: chưa viết"));
    side.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Viết thiệp ▸"));
    p.appendChild(MKU.el("div", "mk-foot", "Ngày nào có ôn (ôn trên điện thoại cũng tính) là mở được ô của ngày đó · lỡ ngày thì ôn thêm 15 lượt để mở bù · mở được tới hết 31/12 · đồ chỉ để trang trí và giữ làm kỷ niệm, không cho xu"));
    document.getElementById("mk-today-gift").classList.add("mk-hl"); const tg = document.getElementById("kb-today").getBoundingClientRect(); MKU.tagAt(tg.left, tg.top - 32, "mới: dòng nhắc trong thẻ Hôm nay");
    MKU.tag("#kb-theme-chip", "bấm chip Giáng sinh cũng mở Lịch", "bottom", 0, 0);
    MKU.tagAt(SX(150) - 260, SY(0) + 8, "cây thông riêng ở sân (bấm cây cũng mở Lịch)");
    MKU.tagAt(p.getBoundingClientRect().left + 340, p.getBoundingClientRect().top - 30, "mỗi ô một món cho Cây · Nhà · Trong nhà — chỉ để trang trí, giữ làm kỷ niệm");
    return 1;`);
  await hideToast(); await shot('raw_lich');
};

// 02 — Cây: 1/12 cây trống (10 chỗ đẹp sẵn) + 24/12 cây xong, rê chuột: tên món + ngày mở
STEPS.cay = async () => {
  await collapseToday();
  const S = { tree: { tx: 150, ty: 22, spots2: true, items: [{ id: 'ball', spot: 4 }], ghostSpots: [0, 1, 2, 3, 5, 6, 7, 8, 9] }, house: {}, room: {} };
  await scene(S);
  await js(`const b = window.__placed[0], ptr = MKU.el("div", "mk-ghost-ptr mk-x"); document.body.appendChild(ptr);
    ptr.style.left = (b.x + b.w * 0.6) + "px"; ptr.style.top = (b.y + b.h * 0.55) + "px";
    const p = MKU.pop("mk-hang", 330, 432, 520);
    MKU.head(p, "Ô cửa 1/12 · Quả châu đỏ", "", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.flexDirection = "column"; body.style.gap = "9px";
    const r1 = body.appendChild(MKU.el("div", "mk-row")); r1.appendChild(MK.icon(MK.ORN.ball, 5));
    r1.appendChild(MKU.el("div", "", "Bấm một chấm trắng trên cây để treo.<br><span class='mk-note'>Treo rồi vẫn dời được.</span>"));
    const r2 = body.appendChild(MKU.el("div", "mk-row")); r2.appendChild(MKU.el("span", "", "Màu:"));
    [["#ff4f6d", 1], ["#ffd23f"], ["#8fd3ff"], ["#d4d4e0"], ["#c77dff"], ["#3ccb5e"]].forEach(([c, on]) => { const s = r2.appendChild(MKU.el("span", "mk-sw" + (on ? " is-on" : ""))); s.style.background = c; });
    const r4 = body.appendChild(MKU.el("div", "mk-row")); r4.appendChild(MKU.el("button", "kb-btn", "Treo ở đây"));
    r4.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Để vườn treo hộ"));
    MKU.tagAt(SX(150) - 120, SY(0) + 6, "1/12: cây trống · 10 chỗ treo đặt sẵn cho cây không rối");
    return 1;`);
  await hideToast(); await shot('raw_cay1');
  const F = stateAt(24);
  await scene(F);
  await js(`const pl = window.__placed, b = pl.find((e) => e.id === "ball");
    const t = MKU.el("div", "mk-tip mk-x", "<b style='font-size:15px'>Quả châu đỏ</b><br><span class='mk-note'>ô cửa đầu tiên · mở ngày 1/12</span>"); document.body.appendChild(t);
    t.style.left = (b.x - t.offsetWidth - 40) + "px"; t.style.top = (b.y - 50) + "px";
    const ptr = MKU.el("div", "mk-ghost-ptr mk-x"); document.body.appendChild(ptr); ptr.style.left = (b.x + b.w * 0.5) + "px"; ptr.style.top = (b.y + b.h * 0.5) + "px";
    MKU.tagAt(SX(150) - 40, SY(0) + 6, "24/12: 7 món treo + dây kim tuyến + dây đèn + ngôi sao");
    return 1;`);
  await hideToast(); await shot('raw_cay2');
};

// 03 — Ngoài nhà (giả hôm nay Thứ Hai 14/12): vòng hoa cửa, đèn mái, cột băng, hình dán cửa sổ tự vẽ, người tuyết
STEPS.nha = async () => {
  await collapseToday();
  const S = stateAt(14);
  await scene(S);
  await js(`const p = MKU.pop("mk-hang", 330, 432, 560);
    MKU.head(p, "Ô cửa 14/12 · Người tuyết", "", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.flexDirection = "column"; body.style.gap = "9px";
    const r1 = body.appendChild(MKU.el("div", "mk-row")); r1.appendChild(MK.icon(MK.SNOWMAN_BIG, 4));
    r1.appendChild(MKU.el("div", "", "Đồ cho ngôi nhà có chỗ đặt sẵn.<br><span class='mk-note'>Đổi chỗ được tới hết mùa.</span>"));
    const r2 = body.appendChild(MKU.el("div", "mk-row", "Đặt ở:")); [["Cạnh cửa", 1], ["Góc sân"], ["Cạnh cây thông"]].forEach(([t, on]) => r2.appendChild(MKU.el("span", "mk-chip" + (on ? " is-on" : ""), t)));
    const r4 = body.appendChild(MKU.el("div", "mk-row")); r4.appendChild(MKU.el("button", "kb-btn", "Đặt ở đây")); r4.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Cất vào kho"));
    MKU.tagAt(SX(20), SY(0) + 4, "đèn mái nhà (5/12) · cột băng (12/12)");
    MKU.tagAt(SX(-36), SY(44), "vòng hoa cửa (3/12)");
    MKU.tagAt(SX(48), SY(36) - 2, "hình dán cửa sổ tự vẽ (13/12)", "is-blue");
    MKU.tagAt(SX(70), SY(52), "người tuyết (hôm nay)");
    return 1;`);
  await hideToast(); await shot('raw_nha');
};

// 04 — Trong nhà (giả 23/12): dây hoa, tranh tự vẽ, tất, cây thông nhỏ, hộp quà, bánh khúc cây, bát yuzu
STEPS.trong = async () => {
  await collapseToday(); await toScene('Trong nhà'); await sky(15, 'snow'); await sleep(1200);
  await clearMk(); await loadArt();
  const S = stateAt(23);
  await js(`MKU.ensureCss(); const v = MK.coverHouse("mk-ov"); MK.drawRoomDeco(v, ${JSON.stringify(S.room)});
    const X = (x) => v.r.left + (v.ox + x) * v.S, Y = (y) => v.r.top + (v.oy + y) * v.S;
    MKU.tagAt(X(92), Y(4) - 6, "vòng hoa tường (7/12)");
    MKU.tagAt(X(-62), Y(24), "tranh tự vẽ 16 × 16 (20/12)", "is-blue");
    MKU.tagAt(X(30), Y(4) - 6, "tất Noel (9/12)");
    MKU.tagAt(X(-48), Y(64), "cây thông nhỏ (11/12) · hộp quà (hôm nay)");
    MKU.tagAt(X(58), Y(36) + 4, "bát yuzu (21/12, 冬至)");
    MKU.tagAt(X(66), Y(76) - 4, "bánh khúc cây (16/12)");
    const p = MKU.pop("mk-hang", 330, 432, 600);
    MKU.head(p, "Ô cửa 23/12 · Hộp quà", "", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.flexDirection = "column"; body.style.gap = "9px";
    const r1 = body.appendChild(MKU.el("div", "mk-row")); r1.appendChild(MK.icon(MK.GIFTS, 5));
    r1.appendChild(MKU.el("div", "", "Đồ trong nhà đặt như đồ nội thất: chọn một ô trống.<br><span class='mk-note'>Có ở cả 3 gian (bếp, phòng khách, phòng ngủ).</span>"));
    const r4 = body.appendChild(MKU.el("div", "mk-row")); r4.appendChild(MKU.el("button", "kb-btn", "Đặt ▸")); r4.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Cất vào kho"));
    return 1;`);
  await hideToast(); await shot('raw_trong');
  await toScene('Sân vườn');
};

// 05 — Chủ nhật 6/12: tự vẽ món treo 8 × 8 (13/12 hình dán cửa sổ, 20/12 tranh trong nhà)
STEPS.ve = async () => {
  await collapseToday();
  const S = stateAt(5);
  await scene(S);
  await js(`const p = MKU.pop("mk-draw", 220, 330, 900);
    MKU.head(p, "Tự vẽ món treo", "Chủ nhật 6/12 · ô cửa tự vẽ", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.gap = "22px";
    const left = body.appendChild(MKU.el("div", "")); left.style.cssText = "display:flex;flex-direction:column;gap:9px";
    const kh = left.appendChild(MKU.el("div", "mk-row", "Khuôn:")); ["Tròn", "Chuông", "Sao", "Tự do"].forEach((k, i) => kh.appendChild(MKU.el("span", "mk-chip" + (i === 3 ? " is-on" : ""), k)));
    const g = left.appendChild(MKU.el("div", "mk-px")); g.style.gridTemplateColumns = "repeat(8, 34px)";
    const rows = ["o......o", "oo....oo", "oooooooo", "okoooko.", "oooppooo", "oooooooo", ".oooooo.", "..o..o.."], P = MK.P;
    rows.forEach((r) => { for (const ch of r) { const c = g.appendChild(document.createElement("i")); c.style.height = "34px"; if (ch !== ".") { c.style.background = P[ch]; } } });
    const pal = left.appendChild(MKU.el("div", "mk-row")); "rRoyiegGjldubBswkv".split("").forEach((ch) => { const s = pal.appendChild(MKU.el("span", "mk-sw" + (ch === "o" ? " is-on" : ""))); s.style.background = P[ch]; s.style.width = "16px"; s.style.height = "16px"; });
    const tools = left.appendChild(MKU.el("div", "mk-tools")); ["Bút", "Tẩy", "Đổ màu", "↶ Hoàn tác", "Xoá hết"].forEach((t, i) => tools.appendChild(MKU.el("button", "kb-btn kb-btn-small" + (i === 0 ? " is-on" : ""), t)));
    const right = body.appendChild(MKU.el("div", "")); right.style.cssText = "display:flex;flex-direction:column;gap:10px;align-items:flex-start";
    right.appendChild(MKU.el("div", "", "<b>Xem trên cây</b>"));
    const cv = right.appendChild(document.createElement("canvas")); cv.width = 220; cv.height = 230; cv.style.border = "2px solid var(--kb-ink)";
    const st = ${JSON.stringify(S.tree)}; st.items = st.items.concat([{ id: "my_neko", spot: 8 }]);
    MK.miniTree(cv, 4, st, "#eaf3f7");
    const r4 = right.appendChild(MKU.el("div", "mk-row")); r4.appendChild(MKU.el("button", "kb-btn", "Treo lên cây")); r4.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Lấy món có sẵn"));
    right.appendChild(MKU.el("div", "mk-note", "Không muốn vẽ thì bấm “Lấy món có sẵn”."));
    p.appendChild(MKU.el("div", "mk-foot", "Bút / tẩy / đổ màu như Xưởng · 6/12 món treo cây 8 × 8 · 13/12 hình dán cửa sổ 8 × 8 · 20/12 tranh treo tường trong nhà 16 × 16"));
    MKU.tag(g, "vẽ trên khung 8 × 8 (ví dụ: mèo)", "right", 0, 0);
    MKU.tag(cv, "thấy ngay trên cây của mình", "right", 0, 0);
    return 1;`);
  await hideToast(); await shot('raw_ve');
};

// 06 — Thiệp điều ước (mặt trước trang trí, mặt sau viết), treo lên cây; ông già Noel lấy đêm 24
STEPS.thiep = async () => {
  await collapseToday();
  const S = stateAt(20); S.tree.items.push({ id: 'card', spot: 7 });
  await scene(S);
  await js(`const p = MKU.pop("mk-card", 160, 300, 1100);
    MKU.head(p, "Thiệp điều ước", "gửi ông già Noel · đêm 24/12 ông ghé lấy", "Chủ nhật 20/12");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.gap = "26px"; body.style.alignItems = "flex-start";
    const f = body.appendChild(MKU.el("div", "")); f.style.cssText = "display:flex;flex-direction:column;gap:8px";
    f.appendChild(MKU.el("div", "", "<b>Mặt trước</b> · trang trí"));
    const card = f.appendChild(MKU.el("div", "mk-card"));
    const bg = card.appendChild(document.createElement("canvas")); bg.width = 210; bg.height = 290; bg.style.left = "0"; bg.style.top = "0";
    const c = bg.getContext("2d"); c.fillStyle = "#b8333a"; c.fillRect(0, 0, 210, 290);
    for (let k = 0; k < 70; k++) { const x = (k * 53) % 210, y = (k * 97) % 290; c.fillStyle = k % 4 ? "rgba(255,255,255,.55)" : "#fff"; c.fillRect(x, y, k % 5 ? 3 : 6, k % 5 ? 3 : 6); }
    c.fillStyle = "#fff"; c.fillRect(0, 262, 210, 28); c.fillStyle = "#f2d36b"; c.fillRect(0, 258, 210, 4);
    const draw = ["..........ww....", "........rrww....", "......rrrrr.....", "....rrrrrrrr....", "...wwwwwwwwww...", "...o..oooo..o...",
      "..oo.oooooo.oo..", "..oooooooooooo..", "..ookoooooookoo..", "..oooooppoooooo.", "..ooowoooowooo..", "...oooooooooo...", "...oooooooooo.o.",
      "..oooooooooooooo", "..oooooooooooo..", "...oo..oo..oo..."].map((s) => s.slice(0, 16));
    const pix = card.appendChild(MK.icon(MK.pic(draw), 8)); pix.style.left = "33px"; pix.style.top = "36px";
    [["star", 12, 12, 3], ["flake", 168, 22, 4], ["bell", 160, 200, 4], ["cane", 18, 196, 4]].forEach(([k, x, y, s]) => { const i = card.appendChild(MK.icon(MK.ORN[k], s)); i.style.left = x + "px"; i.style.top = y + "px"; });
    card.appendChild(MKU.el("div", "mk-mx", "Merry Christmas"));
    const r1 = f.appendChild(MKU.el("div", "mk-row", "Giấy:")); ["#b8333a", "#2f6b45", "#22325e", "#f4e7c8"].forEach((col, i) => { const s = r1.appendChild(MKU.el("span", "mk-sw" + (i ? "" : " is-on"))); s.style.background = col; });
    const r2 = f.appendChild(MKU.el("div", "mk-row", "Sticker:")); ["star", "flake", "bell", "cane", "heart", "gift"].forEach((k) => r2.appendChild(MK.icon(MK.ORN[k], 2)));
    f.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Vẽ hình 16 × 16 ▸"));
    const b = body.appendChild(MKU.el("div", "")); b.style.cssText = "display:flex;flex-direction:column;gap:8px";
    b.appendChild(MKU.el("div", "", "<b>Mặt sau</b> · điều ước"));
    b.appendChild(MKU.el("div", "mk-letter", "Gửi ông già Noel,<br>Năm sau cháu muốn đọc được báo tiếng Nhật mà không cần tra từ, và mong mèo Mochi luôn khoẻ, mập thêm một chút.<br>Cháu cảm ơn ông!<div class='mk-sig'>— Mít</div>"));
    const r3 = b.appendChild(MKU.el("div", "mk-row", "Viết bằng:")); r3.appendChild(MKU.el("span", "mk-chip is-on", "Tiếng Việt")); r3.appendChild(MKU.el("span", "mk-chip", "Tiếng Nhật"));
    b.appendChild(MKU.el("div", "mk-note", "Viết tiếng Nhật thì có nút “Nhờ Gemini sửa” như Luyện viết."));
    const s = body.appendChild(MKU.el("div", "")); s.style.cssText = "display:flex;flex-direction:column;gap:10px;width:250px";
    s.appendChild(MKU.el("div", "", "<b>Treo lên cây</b>"));
    const cv = s.appendChild(document.createElement("canvas")); cv.width = 200; cv.height = 210; cv.style.border = "2px solid var(--kb-ink)";
    MK.miniTree(cv, 4, ${JSON.stringify(S.tree)}, "#eaf3f7");
    s.appendChild(MKU.el("button", "kb-btn", "Treo thiệp lên cây"));
    s.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Lưu nháp"));
    s.appendChild(MKU.el("div", "mk-note", "Viết lúc nào cũng được từ 1/12, sửa được tới 18:00 ngày 24/12. Thiệp chỉ ở trong vườn của bạn, không gửi đi đâu."));
    MKU.tag(cv, "thiệp treo trên cây chờ ông già Noel", "top", -40, 0);
    return 1;`);
  await hideToast(); await shot('raw_thiep');
};

// 07 — Đêm 24/12: cả nhà + cây sáng đèn, ông già Noel đáp xe tuần lộc xuống sân lấy thiệp
STEPS.dem = async () => {
  await collapseToday();
  const S = stateAt(24);
  await scene(S, { hour: 22, weather: 'snow', night: true, extra: `
    MK.spr(v, MK.L.SPR.sleigh, 214, 52); MK.spr(v, MK.SANTA, 197, 57);
    MK.spr(v, MK.STACK, 124, 64); MK.spr(v, MK.SANTA_HAT, 121, 59); MK.spr(v, MK.CAT, 137, 67);
    MK.tint(v, 0.3); MK.glow(v, S.tree); MK.drawHouseDeco(v, { roof: true, candles: true, night: true });` });
  await js(`const b = MKU.el("div", "mk-bubble mk-x", "<b>ホッホッホー！メリークリスマス！</b><br>Ông nhận thiệp của cháu rồi nhé!"); document.body.appendChild(b);
    b.style.left = (SX(197) - 12) + "px"; b.style.top = (SY(57) - b.offsetHeight - 14) + "px";
    MKU.tagAt(SX(60), SY(76) + 10, "Đêm 24/12 · thành phẩm: cây có ngôi sao + ngôi nhà sáng đèn");
    MKU.tagAt(SX(60), SY(76) + 42, "Mở vườn lúc nào từ 18:00 ngày 24 tới hết 31/12 cũng gặp — không cần thức khuya");
    MKU.tagAt(SX(104), SY(52) - 30, "StackChan + thú nuôi ra xem", "is-blue");
    return 1;`);
  await hideToast(); await shot('raw_dem');
};

// 08 — Sáng 25/12: hộp quà dưới gốc; quả cầu tuyết có cây của bạn + thư trả lời; Kỷ niệm Giáng sinh 2026
STEPS.sang = async () => {
  await collapseToday();
  const S = stateAt(24); S.tree.items.push({ id: 'gift_big', at: [26, 41], hook: false });
  await scene(S, { hour: 9, weather: 'sunny', extra: `
    for (let k = 0; k < 12; k++) { MK.L.box(v.ctx, v.ox + 196 + k * 4, 72 - (k % 2), 1, 1, "#9aa6bf", v.S); MK.L.box(v.ctx, v.ox + 198 + k * 4, 73 - (k % 2), 1, 1, "#9aa6bf", v.S); }
    for (let x = 206; x < 258; x++) { MK.L.box(v.ctx, v.ox + x, 70, 1, 1, "#b5c0d6", v.S); MK.L.box(v.ctx, v.ox + x, 74, 1, 1, "#b5c0d6", v.S); }` });
  await js(`const p = MKU.pop("mk-gift", 200, 432, 1060);
    MKU.head(p, "Quà của ông già Noel", "sáng 25/12 · hộp quà dưới gốc cây", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.gap = "26px"; body.style.alignItems = "flex-start";
    const g = body.appendChild(MKU.el("div", "")); g.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:8px";
    const cv = g.appendChild(document.createElement("canvas")); cv.width = 250; cv.height = 280; cv.className = "mk-globe";
    const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
    c.fillStyle = "#6b3b1f"; c.fillRect(30, 228, 190, 46); c.fillStyle = "#a0603a"; c.fillRect(38, 228, 174, 10); c.strokeStyle = "#3a2a22"; c.lineWidth = 4; c.strokeRect(30, 228, 190, 46);
    c.fillStyle = "#e9b949"; c.fillRect(92, 246, 66, 18); c.fillStyle = "#3a2a22"; c.font = "bold 14px sans-serif"; c.fillText("2026", 108, 260);
    c.save(); c.beginPath(); c.arc(125, 122, 108, 0, Math.PI * 2); c.clip(); c.fillStyle = "#d9eef8"; c.fillRect(0, 0, 250, 240);
    c.fillStyle = "#f5f9ff"; c.fillRect(0, 196, 250, 50);
    const tmp = document.createElement("canvas"); tmp.width = 170; tmp.height = 190; MK.miniTree(tmp, 3, ${JSON.stringify(stateAt(24).tree)}, null); c.drawImage(tmp, 40, 30);
    for (let k = 0; k < 60; k++) { c.fillStyle = "#fff"; const x = (k * 71) % 230 + 10, yy = (k * 43) % 200 + 12; c.fillRect(x, yy, k % 3 ? 3 : 5, k % 3 ? 3 : 5); }
    c.restore(); c.lineWidth = 5; c.strokeStyle = "#3a2a22"; c.beginPath(); c.arc(125, 122, 108, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(64, 52, 10, 34); c.fillRect(58, 92, 8, 14);
    g.appendChild(MKU.el("div", "", "<b>Quả cầu tuyết 2026</b>"));
    g.appendChild(MKU.el("div", "mk-note", "bên trong là cây thông bạn trang trí"));
    const m = body.appendChild(MKU.el("div", "mk-mail"));
    m.innerHTML = "Gửi cháu ở vườn ことば畑,<br>Ông đã đọc thiệp của cháu: «Năm sau cháu muốn đọc được báo tiếng Nhật mà không cần tra từ…»<br>" +
      "Đêm qua ông ghé, thấy cây thông có ngôi sao sáng, cửa có vòng hoa, bên cửa có bạn người tuyết — nhà cháu đẹp lắm!<br>" +
      "Chúc cháu năm mới vui, mỗi ngày học một chút nhé. Giáng sinh năm sau ông lại ghé!<div style='text-align:right'>— サンタより · Ông già Noel</div>";
    const s = body.appendChild(MKU.el("div", "")); s.style.cssText = "display:flex;flex-direction:column;gap:10px;width:250px";
    s.appendChild(MKU.el("button", "kb-btn", "Đặt quả cầu tuyết vào nhà"));
    s.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Xem Kỷ niệm Giáng sinh 2026 ▸"));
    s.appendChild(MKU.el("div", "mk-note", "<b>Kỷ niệm Giáng sinh 2026</b> (tab Album): ảnh sân + ảnh trong nhà vườn tự chụp đêm 24, thiệp, thư của ông, lịch 24 ô.<br>Từ 1/1 hỏi một lần: cất bộ đồ Noel vào Kho đồ (giữ mãi, mùa sau bày lại được) hay để thêm."));
    MKU.tag(m, "thư viết sẵn, nhắc điều ước + đồ bạn đã bày — không gọi Gemini", "bottom", 0, 0);
    MKU.tagAt(SX(176), SY(0) + 6, "hộp quà dưới gốc · dấu chân + vết xe trên tuyết");
    return 1;`);
  await hideToast(); await shot('raw_sang');
};

// ======================================================================= bản 3 (19/11): tủ lịch, nhà khoác áo Noel 4 nấc, tường / sàn Noel,
// cây thông được tặng trơn → đầy, hộp quà bí mật, hộp nhạc, bánh + sữa
// 24 ô bản 3: nhà 4 nấc + 1 tự vẽ · cây 9 · trong nhà 7 · hộp quà bí mật 3 (Chủ nhật)
const D3 = { 1: ['nha', 'Vòng hoa cửa · nấc 1'], 2: ['cay', 'Quả châu đỏ'], 3: ['trong', 'Hộp nhạc'], 4: ['cay', 'Chuông vàng'], 5: ['trong', 'Tất Noel'],
  6: ['qua', 'Hộp quà bí mật'], 7: ['nha', 'Mái tuyết · nấc 2'], 8: ['trong', 'Tường bông tuyết'], 9: ['cay', 'Nơ đỏ'], 10: ['cay', 'Dây đèn'],
  11: ['trong', 'Bánh kem dâu'], 12: ['cay', 'Quả châu xanh'], 13: ['qua', 'Hộp quà bí mật'], 14: ['nha', 'Đèn mái · nấc 3'], 15: ['trong', 'Sàn caro đỏ'],
  16: ['cay', 'Dây kim tuyến'], 17: ['nha', 'Tự vẽ hình dán cửa sổ'], 18: ['trong', 'Đèn ngủ ngôi sao'], 19: ['cay', 'Quả châu tím'], 20: ['qua', 'Hộp quà bí mật'],
  21: ['nha', 'Sao mái + người tuyết · nấc 4'], 22: ['cay', 'Quả châu vàng'], 23: ['trong', 'Bánh quy + sữa'], 24: ['cay', 'Ngôi sao'] };
const CABINET_JS = `const ICON3 = { 1: MK.WREATH, 2: MK.ORN.ball, 3: MK.MUSIC_BOX, 4: MK.ORN.bell, 5: MK.STOCKING, 6: MK.ORN.gift, 7: MK.pic(["..www..", ".wwwww.", "wwwwwww", "RRRRRRR"]),
    8: MK.STICKER, 9: MK.ORN.bow, 10: MK.pic(["k.k.k.k.k", "r.y.l.p.f"], true), 11: MK.CAKE };`;
// trạng thái cây được tặng theo ngày (ô cây: quả châu theo thứ tự XT_BALLS; 10 dây đèn, 16 dây kim tuyến, 24 ngôi sao)
function xtAt(day) {
  const order = { 2: [0, 4], 4: [1], 9: [2, 7], 12: [3, 5], 19: [6, 8], 22: [9] }, st = { balls: [] };
  for (let d = 1; d <= day; d++) { (order[d] || []).forEach((k) => st.balls.push(k)); if (d === 10) { st.lights = true; } if (d === 16) { st.garland = true; } if (d === 24) { st.star = true; } }
  return st;
}
const houseAt = (day) => day >= 21 ? 4 : day >= 14 ? 3 : day >= 7 ? 2 : day >= 1 ? 1 : 0;
const giftsAt = (day) => [6, 13, 20].filter((d) => d <= day).length;
const GIFT_JS = `const giftSpr = [MK.pic(["..w.w..", "...w...", "rrrwrrr", "rrrwrrr", "wwwwwww", "rrrwrrr", "rrrwrrr"]), MK.pic([".y...y.", "..yyy..", "ddddydd", "ddddydd", "yyyyyyy", "ddddydd"]), MK.pic(["...r...", "..rrr..", "iiiriii", "iiiriii", "rrrrrrr", "iiiriii", "iiiriii"])];
  const drawGifts = (v, n, tx) => { [[-6, 67], [27, 68], [33, 66]].slice(0, n).forEach(([x, y], k) => MK.spr(v, giftSpr[k], tx + x, y)); };`;
async function yard3(day, opts) {
  opts = opts || {};
  await sky(opts.hour || 10, opts.weather || 'snow'); await sleep(900); await clearMk(); await loadArt();
  return js(`MKU.ensureCss(); const v = MK.cover("mk-ov"); ${GIFT_JS}
    const night = ${!!opts.night}, st = ${JSON.stringify(xtAt(day))}; st.night = night;
    MK.drawHouseNoel(v, ${houseAt(day)}, night); MK.drawXTree(v, 150, 30, st); drawGifts(v, ${giftsAt(day)}, 150);
    ${opts.extra || ''}
    window.__v = v; window.SX = (x) => v.r.left + (v.ox + x) * v.S; window.SY = (yy) => v.r.top + (v.oy + yy) * v.S; return 1;`);
}

// 01 — Tủ lịch gỗ 24 ngăn treo tường phòng khách (giả hôm nay 10/12); ngăn mai hé bóng mờ; mở ngăn có hiệu ứng
STEPS.v3lich = async () => {
  await collapseToday(); await toScene('Trong nhà'); await sky(15, 'snow'); await sleep(1200); await clearMk(); await loadArt();
  await js(`MKU.ensureCss(); ${CABINET_JS}
    const v = MK.coverHouse("mk-ov"); const open = {}; [1, 2, 3, 5, 6, 7, 8, 9].forEach((d) => { open[d] = ICON3[d]; });
    MK.drawCabinetMini(v, 24, 12, { open, today: 10 }); MK.spr(v, MK.MUSIC_BOX, 1, 27);
    const X = (x) => v.r.left + (v.ox + x) * v.S, Y = (y) => v.r.top + (v.oy + y) * v.S;
    MKU.tagAt(X(-34), Y(2) - 4, "tủ lịch treo tường phòng khách — bấm để mở");
    const p = MKU.pop("mk-cab", 110, 420, 0);
    MKU.head(p, "Lịch chờ Giáng sinh", "tủ lịch 24 ngăn · アドベントカレンダー", "Thứ Năm 10/12");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.gap = "18px"; body.style.alignItems = "flex-start";
    const c = body.appendChild(document.createElement("canvas")); c.width = 560; c.height = 380;
    MK.drawCabinet(c, 5, { open, today: 10, tomorrow: MK.ORN.cane.length ? MK.pic(["..www..", ".wwwww.", "wwwwwww", "wwwwwww"]) : null, miss: [4] });
    const side = body.appendChild(MKU.el("div", "")); side.style.cssText = "display:flex;flex-direction:column;gap:8px;width:330px";
    side.appendChild(MKU.el("div", "", "<b>Mở ngăn hôm nay</b>"));
    const strip = side.appendChild(MKU.el("div", "mk-row")); strip.style.gap = "6px"; strip.style.flexWrap = "nowrap";
    const S = 5, DW = 16, DH = 13;
    [0, 1, 2].forEach((f) => {
      const cv = strip.appendChild(document.createElement("canvas")); cv.width = 104; cv.height = 130; cv.style.border = "2px solid var(--kb-ink)"; cv.style.background = "#8a4a26";
      const ctx = cv.getContext("2d"), b = (x, y, w, h, col) => { ctx.fillStyle = col; ctx.fillRect(x * S, y * S, w * S, h * S); };
      const x0 = 2, y0 = 10;
      if (f === 0) { ctx.globalAlpha = .55; b(x0 - 1.5, y0 - 1.5, DW + 3, DH + 3, "#fff3a0"); ctx.globalAlpha = 1; b(x0, y0, DW, DH, "#3a2a22"); b(x0 + 1, y0 + 1, DW - 2, DH - 2, "#e9b949"); b(x0 + 4, y0 + 2, 8, 4, "#f4e7c8"); b(x0 + 7, y0 + DH - 3, 2, 2, "#f2d36b"); [[1, 9], [18, 12], [4, 24], [15, 7]].forEach(([sx, sy]) => b(sx, sy, 1, 1, "#ffffff")); }
      if (f === 1) { b(x0, y0, DW, DH, "#1a100a"); b(x0 - 1, y0 + 6, DW + 2, DH - 4, "#3a2a22"); b(x0, y0 + 7, DW, DH - 6, "#e9b949"); [[2, 6], [16, 5], [9, 3], [5, 2], [13, 1]].forEach(([sx, sy], k) => b(sx, sy, 1, 1, k % 2 ? "#ffd23f" : "#ffffff")); }
      if (f === 2) { b(x0, y0 + 4, DW, DH - 4, "#3a2a22"); b(x0 + 1, y0 + 5, DW - 2, DH - 6, "#2a1a12"); const sp = ICON3[10]; MK.L.sprite(ctx, sp, 4, 3, S); ctx.fillStyle = "#fff"; ctx.font = "bold 13px sans-serif"; ctx.fillText("Dây đèn!", 18, 122); [[1, 1], [18, 2], [3, 8], [17, 9]].forEach(([sx, sy]) => b(sx, sy, 1, 1, "#ffd23f")); }
    });
    side.appendChild(MKU.el("div", "mk-note", "Ngăn sáng → bấm: ngăn trượt ra, lấp lánh, món bay ra kèm tiếng chuông; món tự bày vào chỗ của nó (cây, nhà hoặc trong nhà)."));
    side.appendChild(MKU.el("div", "", "<b>Ngăn ngày mai</b> hé ra một chút: thấy <b>bóng</b> món bên trong — “trắng trắng, tròn tròn… là gì nhỉ?”"));
    side.appendChild(MKU.el("div", "", "<b>Ngăn lỡ ngày</b> (4): ôn thêm 15 lượt là mở bù được."));
    side.appendChild(MKU.el("div", "mk-note", "Mỗi ngăn một món cho nhà, cây thông, trong nhà, hoặc một hộp quà bí mật (Chủ nhật). Đồ chỉ để trang trí và giữ làm kỷ niệm."));
    const r = c.getBoundingClientRect();
    return 1;`);
  await hideToast(); await shot('raw_v3_lich');
  await toScene('Sân vườn');
};

// 02 — Nhà khoác áo Noel: 1/12 → 7/12 → 14/12 → 21/12 (đêm)
STEPS.v3nha = async () => {
  await collapseToday();
  for (const [k, day] of [[1, 1], [2, 7], [3, 14]]) {
    await sky(10, 'snow'); await sleep(700); await clearMk(); await loadArt();
    await js(`const v = MK.cover("mk-ov"); MK.drawHouseNoel(v, ${houseAt(day)}, false); return 1;`);
    await hideToast(); await shot('raw_v3_nha' + k);
  }
  await sky(21, 'clear'); await sleep(900); await clearMk(); await loadArt();
  await js(`const v = MK.cover("mk-ov"); MK.drawHouseNoel(v, 4, true); MK.tint(v, 0.3); MK.drawHouseNoel(v, 4, true, true); return 1;`);
  await hideToast(); await shot('raw_v3_nha4');
};

// 03 — Tường / sàn Noel (mẫu thật của add-on: tạo mẫu tự vẽ 16 × 16 rồi dùng cho Phòng khách)
const TILES = (() => {
  const g = (f) => { const out = []; for (let y = 0; y < 16; y++) { let r = ''; for (let x = 0; x < 16; x++) { r += f(x, y); } out.push(r); } return out; };
  const flake = (x, y, cx, cy) => (x === cx && Math.abs(y - cy) <= 2) || (y === cy && Math.abs(x - cx) <= 2) || (Math.abs(x - cx) === 1 && Math.abs(y - cy) === 1);
  return {
    w_tuyet: ['Bông tuyết trên nền thông', 'wall', g((x, y) => flake(x, y, 4, 4) || flake(x, y, 12, 12) ? 'w' : ((x === 12 && y === 3) || (x === 3 && y === 11) ? 'i' : ((x + y) % 7 === 0 && x % 3 === 0 ? 'j' : 'G')))],
    w_keo: ['Sọc kẹo gậy', 'wall', g((x, y) => { const v = (x + y) % 8; return v < 2 ? 'r' : v === 2 ? 'P' : 'w'; })],
    w_do: ['Đỏ mận cây thông nhỏ', 'wall', g((x, y) => { const t = (cx, cy) => (y >= cy && y <= cy + 3 && Math.abs(x - cx) <= (y - cy) * 0.6 + 0.2); return t(4, 2) || t(12, 10) ? 'i' : ((x === 4 && y === 6) || (x === 12 && y === 14) ? 'i' : 'R'); })],
    f_caro: ['Thảm caro đỏ', 'floor', g((x, y) => { const a = x === 3 || x === 4, b = y === 3 || y === 4; if (a && b) { return 'j'; } if (a || b) { return 'G'; } if (x === 11 || y === 11) { return 'B'; } return 'R'; })],
    f_len: ['Thảm len tuyết', 'floor', g((x, y) => { if (y === 1 || y === 14) { return (x % 4 < 2) ? 'r' : 'w'; } if (y === 2 || y === 13) { return 'R'; } const d = Math.abs(x - 7.5) + Math.abs(y - 7.5); return d < 2 ? 'r' : d < 3 ? 'w' : d < 4 ? 'r' : 's'; })]
  };
})();
STEPS.v3tuong = async () => {
  await collapseToday();
  const enc = (rows) => { const flat = rows.join(''); let out = '', i = 0; while (i < flat.length) { let j = i; while (j < flat.length && flat[j] === flat[i]) { j++; } out += (j - i > 1 ? String(j - i) : '') + flat[i]; i = j; } return out; };
  const ids = JSON.parse(await py(KB + `import json
d = st.load(); d["coins"] = 200000; st.save(d)
out = {}
for key, (name, kind, code) in json.loads(${JSON.stringify(JSON.stringify(Object.fromEntries(Object.entries(TILES).map(([k, [n, kd, rows]]) => [k, [n, kd, enc(rows)]]))))}).items():
    r = st.tile_save({"name": name, "kind": kind, "px": code})
    out[key] = r["tile_id"]
st.decor_use("room", "wall", out["w_tuyet"]); st.decor_use("room", "floor", out["f_caro"])
d = st.load(); d["coins"] = 3420; st.save(d)
kb._dialog.refresh()
result = json.dumps(out)`));
  await sleep(1500);
  await toScene('Trong nhà'); await sky(15, 'snow'); await sleep(1500); await clearMk(); await loadArt();
  await js(`MKU.ensureCss(); const v = MK.coverHouse("mk-ov"); MK.spr(v, MK.MUSIC_BOX, 1, 27); MK.drawRoomDeco(v, { stocking: true });
    const T = ${JSON.stringify(TILES)}, P = MK.P;
    const p = MKU.pop("mk-tile", 260, 430, 0);
    MKU.head(p, "Tường & sàn Noel", "quà của 3 ngăn “Trong nhà”", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.gap = "16px";
    Object.keys(T).forEach((k, i) => {
      const [name, kind, rows] = T[k], box = body.appendChild(MKU.el("div", "")); box.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:4px;width:130px;text-align:center";
      const cv = box.appendChild(document.createElement("canvas")); cv.width = 96; cv.height = 96; cv.style.border = "2px solid var(--kb-ink)"; cv.style.imageRendering = "pixelated";
      const ctx = cv.getContext("2d"); for (let ty = 0; ty < 2; ty++) { for (let tx = 0; tx < 2; tx++) { rows.forEach((r, y) => { for (let x = 0; x < 16; x++) { ctx.fillStyle = P[r[x]]; ctx.fillRect((tx * 16 + x) * 3, (ty * 16 + y) * 3, 3, 3); } }); } }
      box.appendChild(MKU.el("div", "", "<b style='font-size:13px'>" + name + "</b>"));
      box.appendChild(MKU.el("div", "mk-note", kind === "wall" ? "tường" : "sàn"));
      if (i === 0 || i === 3) { cv.style.boxShadow = "0 0 0 3px #ffd23f"; }
    });
    p.appendChild(MKU.el("div", "mk-foot", "Dùng như mẫu ở Nhà → Tường & sàn: chọn cho từng gian (bếp, phòng khách, phòng ngủ), giữ mãi, mùa nào cũng đổi lại được."));
    const X = (x) => v.r.left + (v.ox + x) * v.S, Y = (y) => v.r.top + (v.oy + y) * v.S;
    MKU.tagAt(X(100), Y(14) - 4, "tường “Bông tuyết trên nền thông”");
    MKU.tagAt(X(100), Y(70), "sàn “Thảm caro đỏ”");
    return 1;`);
  await hideToast(); await shot('raw_v3_tuong');
  await py(KB + `st.decor_use("room", "wall", "none"); st.decor_use("room", "floor", "none")
for tid in ${JSON.stringify(Object.values(ids))}:
    try:
        st.tile_delete(tid)
    except Exception:
        pass
kb._dialog.refresh(); result = 1`);
  await sleep(800); await toScene('Sân vườn');
};

// 04 — Cây thông được tặng: trơn (1/12) → đầy dần, hộp quà bí mật mỗi Chủ nhật; lắc nghe đoán
STEPS.v3cay = async () => {
  await collapseToday();
  for (const day of [1, 10, 17]) {
    await yard3(day); await hideToast(); await shot('raw_v3_cay' + day);
  }
  await yard3(24, { hour: 22, weather: 'clear', night: true, extra: `MK.tint(v, 0.3); MK.drawXTree(v, 150, 30, Object.assign({}, st, { night: true }));` });
  await hideToast(); await shot('raw_v3_cay24');
  await yard3(17);
  await js(`const b = MKU.el("div", "mk-bubble mk-x", "<b>Lắc lắc… lục cục!</b><br>Nghe như có gì tròn tròn bên trong."); document.body.appendChild(b);
    b.style.left = (SX(84)) + "px"; b.style.top = (SY(18)) + "px";
    const t = MKU.el("div", "mk-tip mk-x", "<b style='font-size:15px'>Hộp quà bí mật · 6/12</b><br><span class='mk-note'>Mở sáng 25/12</span><br><button class='kb-btn kb-btn-small' style='margin-top:4px'>Lắc thử</button>"); document.body.appendChild(t);
    t.style.left = (SX(84)) + "px"; t.style.top = (SY(18) + b.offsetHeight + 10) + "px";
    const ptr = MKU.el("div", "mk-ghost-ptr mk-x"); document.body.appendChild(ptr); ptr.style.left = (SX(146)) + "px"; ptr.style.top = (SY(70)) + "px";
    return 1;`);
  await hideToast(); await shot('raw_v3_lac');
};

// 05 — Hộp nhạc học dần + bánh quy & sữa cho ông già Noel (tối 24 → sáng 25)
STEPS.v3nhac = async () => {
  await collapseToday(); await toScene('Trong nhà'); await sky(15, 'snow'); await sleep(1200); await clearMk(); await loadArt();
  await js(`MKU.ensureCss(); const v = MK.coverHouse("mk-ov"); MK.spr(v, MK.MUSIC_BOX, 1, 27); MK.drawRoomDeco(v, { stocking: true });
    const X = (x) => v.r.left + (v.ox + x) * v.S, Y = (y) => v.r.top + (v.oy + y) * v.S;
    for (let k = 0; k < 3; k++) { const n = MKU.el("div", "mk-x"); n.textContent = "♪"; n.style.cssText = "position:fixed;z-index:6;font:bold 20px sans-serif;color:#7a4a00;left:" + (X(8 + k * 5)) + "px;top:" + (Y(22 - k * 4)) + "px"; document.body.appendChild(n); }
    const p = MKU.pop("mk-music", 260, 430, 620);
    MKU.head(p, "Hộp nhạc", "ô cửa 3/12 · mỗi ngày học thêm một câu", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.flexDirection = "column"; body.style.gap = "10px";
    const r1 = body.appendChild(MKU.el("div", "mk-row")); r1.appendChild(MK.icon(MK.MUSIC_BOX, 6));
    r1.appendChild(MKU.el("div", "", "<b>きよしこの夜 · Silent Night</b><br>Đã học <b>10 / 24</b> câu — hôm nay thêm một câu mới."));
    const roll = body.appendChild(MKU.el("div", "mk-row")); roll.style.gap = "3px";
    for (let i = 1; i <= 24; i++) { const c = roll.appendChild(MKU.el("span", "")); c.style.cssText = "display:inline-block;width:16px;height:26px;border:2px solid var(--kb-ink);background:" + (i <= 9 ? "#e9b949" : i === 10 ? "#ffd23f" : "#f5efe4"); if (i === 10) { c.style.boxShadow = "0 0 0 2px #fff3a0"; } }
    const r3 = body.appendChild(MKU.el("div", "mk-row")); r3.appendChild(MKU.el("button", "kb-btn", "♪ Nghe đoạn đã học")); r3.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Nghe câu mới"));
    body.appendChild(MKU.el("div", "mk-note", "Nhạc 8-bit soạn bằng bộ phát nhạc của vườn (bài hát đã hết bản quyền). Đêm 24 hộp nhạc phát trọn bài khi ông già Noel ghé; sau đó bày trong nhà, bấm là phát."));
    MKU.tagAt(X(-30), Y(14) - 6, "hộp nhạc trên kệ — bấm để nghe", "is-blue");
    return 1;`);
  await hideToast(); await shot('raw_v3_nhac');
  for (const [k, hour] of [['toi', 21], ['sang', 8]]) {
    await sky(hour, 'clear'); await sleep(1200); await clearMk(); await loadArt();
    await js(`MKU.ensureCss(); const v = MK.coverHouse("mk-ov"); MK.spr(v, MK.MUSIC_BOX, 1, 27); MK.drawRoomDeco(v, { stocking: true });
      ${k === 'toi' ? 'MK.spr(v, MK.COOKIES, 62, 50); MK.spr(v, MK.MILK, 92, 50); MK.spr(v, MK.NOTE, 80, 50);' : 'MK.spr(v, MK.CRUMBS, 62, 50); MK.spr(v, MK.GLASS, 92, 50); MK.spr(v, MK.NOTE, 80, 50);'}
      const X = (x) => v.r.left + (v.ox + x) * v.S, Y = (y) => v.r.top + (v.oy + y) * v.S;
      const b = MKU.el("div", "mk-bubble mk-x", ${k === 'toi' ? '"<b>Tối 24/12</b><br>Để bánh quy + sữa cho ông già Noel"' : '"<b>Sáng 25/12</b><br>Chỉ còn vụn bánh! Tờ giấy: «Bánh ngon quá, cảm ơn cháu! ホッホッホー»"'}); document.body.appendChild(b);
      b.style.maxWidth = "250px"; b.style.left = (X(60)) + "px"; b.style.top = (Y(48) - b.offsetHeight - 14) + "px"; return 1;`);
    await hideToast(); await shot('raw_v3_banh_' + k);
  }
  await toScene('Sân vườn');
};

// 06 — Đêm 24 toàn cảnh: nhà nấc 4 + cây đủ món + 3 hộp quà + ông già Noel
STEPS.v3dem = async () => {
  await collapseToday();
  await yard3(24, { hour: 22, weather: 'snow', night: true, extra: `
    MK.spr(v, MK.L.SPR.sleigh, 214, 52); MK.spr(v, MK.SANTA, 196, 57);
    MK.spr(v, MK.STACK, 118, 64); MK.spr(v, MK.SANTA_HAT, 115, 59); MK.spr(v, MK.CAT, 131, 67);
    MK.tint(v, 0.3); MK.drawHouseNoel(v, 4, true, true); MK.drawXTree(v, 150, 30, Object.assign({}, st, { night: true }));` });
  await js(`const b = MKU.el("div", "mk-bubble mk-x", "<b>ホッホッホー！メリークリスマス！</b><br>Ông nhận thiệp của cháu rồi nhé!"); document.body.appendChild(b);
    b.style.left = (SX(196) - 12) + "px"; b.style.top = (SY(57) - b.offsetHeight - 14) + "px"; return 1;`);
  await hideToast(); await shot('raw_v3_dem');
};

// ======================================================================= bản 4 (19/11): sân sáng đèn (イルミネーション) lên dần + ảnh động
async function illum(lv, t, first) {
  if (first) { await sky(21, 'snow'); await sleep(900); }
  await clearMk(); await loadArt();
  return js(`MKU.ensureCss(); const v = MK.cover("mk-ov"); const st = ${JSON.stringify(xtAt(24))}; st.night = false; st.lights = false; st.star = ${lv >= 2};
    MK.drawHouseNoel(v, 2, true); MK.spr(v, MK.SNOWMAN_BIG, 64, 57); MK.drawXTree(v, 150, 30, st);
    MK.spr(v, MK.STACK, 112, 64); MK.spr(v, MK.SANTA_HAT, 109, 59); MK.spr(v, MK.CAT, 125, 67);
    MK.tint(v, 0.38);
    MK.drawHouseNoel(v, 4, true, true);
    MK.drawIllum(v, ${t}, ${lv}, MK.xtree(st));
    if (${lv} >= 2) { const S = v.S, cx = (v.ox + 166) * S, cy = (v.oy + 33) * S, g = v.ctx.createRadialGradient(cx, cy, S, cx, cy, 13 * S); g.addColorStop(0, "rgba(255,240,160,.55)"); g.addColorStop(1, "rgba(255,240,160,0)"); v.ctx.fillStyle = g; v.ctx.fillRect(cx - 13 * S, cy - 13 * S, 26 * S, 26 * S); MK.xstar(v, 150, 30); }
    return 1;`);
}
STEPS.v4den = async () => {
  await collapseToday();
  for (const lv of [1, 2, 3, 4]) { await illum(lv, 0, lv === 1); await hideToast(); await shot('raw_v4_lv' + lv); }
  fs.mkdirSync(path.join(OUT, 'gif'), { recursive: true });
  for (let f = 0; f < 14; f++) {
    await illum(4, f, false); await sleep(60);
    await page.shot(path.join(OUT, 'gif', 'f' + String(f).padStart(2, '0') + '.png'));
  }
  console.log('  gif 14 khung');
};

(async () => {
  await connect();
  await py(KB + `kb.finds.is_market = lambda day: False
kb.finds.open_count = lambda reviews: 0
kb._dialog.refresh(); result = 1`);
  await sleep(1500);
  const UI = fs.readFileSync(path.join(__dirname, 'mock_136_ui.js'), 'utf8');
  await page.eval(UI + '; 1');
  for (const k of ONLY.length ? ONLY : Object.keys(STEPS)) { console.log('bước', k); await STEPS[k](); await clearMk(); }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
