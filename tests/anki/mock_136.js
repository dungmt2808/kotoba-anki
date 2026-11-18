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
// từ của bộ thẻ mẫu (Tiếng Nhật::N5 · Từ vựng) — mỗi ngày một từ gắn vào món treo
const WORDS = { 1: ['手紙', 'てがみ', 'lá thư'], 2: ['家族', 'かぞく', 'gia đình'], 3: ['雨', 'あめ', 'mưa'], 4: ['夜', 'よる', 'buổi tối'],
  5: ['静か', 'しずか', 'yên tĩnh'], 6: ['猫', 'ねこ', 'con mèo'], 7: ['友達', 'ともだち', 'bạn bè'], 8: ['山', 'やま', 'núi'],
  9: ['休み', 'やすみ', 'ngày nghỉ'], 10: ['誕生日', 'たんじょうび', 'sinh nhật'], 11: ['旅行', 'りょこう', 'du lịch'], 12: ['鳥', 'とり', 'chim'],
  13: ['料理', 'りょうり', 'món ăn'], 14: ['空', 'そら', 'bầu trời'], 15: ['買い物', 'かいもの', 'mua sắm'], 16: ['楽しい', 'たのしい', 'vui'],
  17: ['新しい', 'あたらしい', 'mới'], 18: ['窓', 'まど', 'cửa sổ'], 19: ['寝る', 'ねる', 'ngủ'], 20: ['元気', 'げんき', 'khoẻ'],
  21: ['朝', 'あさ', 'buổi sáng'], 22: ['勉強', 'べんきょう', 'việc học'], 23: ['写真', 'しゃしん', 'ảnh'], 24: ['毎日', 'まいにち', 'mỗi ngày'] };
// ngày → chỗ treo (chỉ số MK.SPOTS) + món thật treo (Chủ nhật: món tự vẽ)
const HANG = { 1: [21, 'ball'], 3: [14, 'bell'], 4: [7, 'cane'], 5: [4, 'flake'], 6: [11, 'my_neko'], 7: [1, 'bow'], 8: [25, 'cone'], 9: [17, 'sock'],
  11: [26, 'snowman', [6, 47]], 12: [5, 'bird'], 13: [16, 'my_daruma'], 14: [0, 'angel'], 15: [27, 'gift', [36, 48]], 16: [9, 'ginger'],
  17: [22, 'ball_silver'], 18: [19, 'horse'], 20: [12, 'my_onigiri'], 21: [3, 'yuzu'], 22: [23, 'ball_blue'], 23: [15, 'ball_gold'] };
const SPECIAL = { 2: 'garland', 10: 'lights', 19: 'snow', 24: 'star' };
function treeState(upTo, skip) {
  const st = { tx: 150, ty: 22, items: [] };
  for (let d = 1; d <= upTo; d++) {
    if ((skip || []).indexOf(d) >= 0) { continue; }
    if (SPECIAL[d]) { st[SPECIAL[d]] = true; }
    if (HANG[d]) { const h = HANG[d]; st.items.push(h[2] ? { id: h[1], at: h[2], hook: false } : { id: h[1], spot: h[0], day: d }); }
    if (d === 19) { st.items.push({ id: 'ball_violet', spot: 2 }); }
  }
  return st;
}
const collapseToday = () => js('GardenUI.setGlob("today", "mini"); return 1;').then(() => sleep(400));
const openToday = () => js('GardenUI.setGlob("today", "open"); return 1;').then(() => sleep(400));
async function scene(st, opts) {
  opts = opts || {};
  await sky(opts.hour || 10, opts.weather || 'snow'); await sleep(900);
  await clearMk(); await loadArt();
  return js(`MKU.ensureCss(); const v = MK.cover("mk-ov"); const st = ${JSON.stringify(st)}; st.night = ${!!opts.night};
    const placed = MK.drawTree(v, st);
    ${opts.extra || ''}
    window.__v = v; window.__placed = placed; window.SX = (x) => v.r.left + (v.ox + x) * v.S; window.SY = (yy) => v.r.top + (v.oy + yy) * v.S; return placed;`);
}
const STEPS = {};

// 01 — Lịch chờ Giáng sinh (giả hôm nay là Thứ Năm 10/12)
STEPS.lich = async () => {
  await openToday();
  const st = treeState(9, [4]);
  await scene(st);
  await js(`const W = ${JSON.stringify(WORDS)}, D = MK.DOORS, today = 10, miss = [4];
    MKU.todayLine("[i:gift] Lịch chờ Giáng sinh: ô 10/12 chưa mở ▸");
    const p = MKU.pop("mk-cal", 160, 432, 930);
    MKU.head(p, "Lịch chờ Giáng sinh", "アドベントカレンダー · 1–24/12", "Thứ Năm 10/12");
    const body = p.appendChild(MKU.el("div", "mk-body")), grid = body.appendChild(MKU.el("div", "mk-doors"));
    const ICON = { garland: MK.pic(["y...y...y", ".i.i.i.i.", "..y...y.."], true), lights: MK.pic(["k.k.k.k.k", "r.y.l.p.f"], true),
      snow: MK.pic(["wwwwwww", ".w.w.w."], true) };
    for (let d = 1; d <= 24; d++) {
      const c = grid.appendChild(MKU.el("div", "mk-door"));
      c.appendChild(MKU.el("span", "mk-n", String(d)));
      if (d < today && miss.indexOf(d) < 0) {
        c.classList.add("is-open");
        const id = D[d] === "custom" ? "my_neko" : D[d];
        c.appendChild(MK.icon(MK.ORN[id] || ICON[id], 4));
        c.appendChild(MKU.el("span", "mk-w", W[d][0])); c.appendChild(MKU.el("span", "mk-r", W[d][1]));
        if (D[d] === "custom") { c.appendChild(MKU.el("span", "mk-own", "tự vẽ")); }
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
    MK.miniTree(cv, 3, ${JSON.stringify(st)}, "#eaf3f7");
    side.appendChild(MKU.el("div", "", "<b>Cây thông 2026</b><br>8 / 24 món"));
    side.appendChild(MKU.el("button", "kb-btn", "Mở ô hôm nay ▸"));
    side.appendChild(MKU.el("div", "mk-note", "Thiệp điều ước: chưa viết"));
    side.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Viết thiệp ▸"));
    p.appendChild(MKU.el("div", "mk-foot", "Ngày nào có ôn (ôn trên điện thoại cũng tính) là mở được ô của ngày đó · lỡ ngày thì ôn thêm 15 lượt để mở bù · mở được tới hết 31/12 · quà là đồ trang trí, không cho xu"));
    return 1;`);
  await js(`document.getElementById("mk-today-gift").classList.add("mk-hl"); const tg = document.getElementById("kb-today").getBoundingClientRect(); MKU.tagAt(tg.left, tg.top - 32, "mới: dòng nhắc trong thẻ Hôm nay");
    MKU.tag("#kb-theme-chip", "bấm chip Giáng sinh cũng mở Lịch", "bottom", 0, 0);
    MKU.tagAt(SX(150) - 260, SY(0) + 8, "cây thông riêng ở sân (bấm cây cũng mở Lịch)");
    return 1;`);
  await hideToast(); await shot('raw_lich');
};

// 02 — 1/12: mở ô đầu tiên, chọn chỗ treo + màu + từ gắn
STEPS.treo = async () => {
  await collapseToday();
  const st = { tx: 150, ty: 22, items: [{ id: 'ball', spot: 13 }], ghostSpots: Array.from({ length: 29 }, (_, i) => i).filter((i) => i !== 13) };
  const placed = await scene(st);
  await js(`const b = window.__placed[0], ptr = MKU.el("div", "mk-ghost-ptr mk-x"); document.body.appendChild(ptr);
    ptr.style.left = (b.x + b.w * 0.6) + "px"; ptr.style.top = (b.y + b.h * 0.55) + "px";
    const p = MKU.pop("mk-hang", 330, 432, 520);
    MKU.head(p, "Ô cửa 1/12 · Quả châu", "", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.flexDirection = "column"; body.style.gap = "9px";
    const r1 = body.appendChild(MKU.el("div", "mk-row")); r1.appendChild(MK.icon(MK.ORN.ball, 5));
    r1.appendChild(MKU.el("div", "", "Bấm một chấm trên cây để treo.<br><span class='mk-note'>Treo rồi vẫn dời được trong ngày.</span>"));
    const r2 = body.appendChild(MKU.el("div", "mk-row")); r2.appendChild(MKU.el("span", "", "Màu:"));
    [["#ff4f6d", 1], ["#ffd23f"], ["#8fd3ff"], ["#d4d4e0"], ["#c77dff"], ["#3ccb5e"]].forEach(([c, on]) => { const s = r2.appendChild(MKU.el("span", "mk-sw" + (on ? " is-on" : ""))); s.style.background = c; });
    const r3 = body.appendChild(MKU.el("div", "mk-row")); r3.appendChild(MKU.el("span", "", "Gắn từ:"));
    r3.appendChild(MKU.el("span", "mk-sel", "<b>手紙</b> てがみ · lá thư ▾"));
    body.appendChild(MKU.el("div", "mk-note", "Mặc định là từ bạn bấm Lại nhiều nhất hôm nay; bấm ▾ chọn từ khác đã ôn hôm nay."));
    const r4 = body.appendChild(MKU.el("div", "mk-row")); r4.appendChild(MKU.el("button", "kb-btn", "Treo ở đây"));
    r4.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Để vườn treo hộ"));
    const y = document.getElementById("kb-yard").getBoundingClientRect();
    MKU.tagAt(SX(150) - 40, SY(0) + 6, "1/12: cây trống · chấm trắng = chỗ còn trống");
    MKU.tag("#mk-hang .mk-sel", "món nào cũng gắn một từ của hôm đó", "right", 0, 0);
    return 1;`);
  await hideToast(); await shot('raw_treo');
};

// 03 — 13/12: cây giữa tháng, rê chuột lên món → từ + ngày
STEPS.ru = async () => {
  await collapseToday();
  const st = treeState(12);
  await scene(st);
  await js(`const pl = window.__placed, b = pl.find((e) => e.id === "bell");
    const t = MKU.el("div", "mk-tip mk-x", "<span class='mk-note'>3/12 · Chuông vàng</span><br><b>雨</b> あめ · mưa"); document.body.appendChild(t);
    t.style.left = (b.x - t.offsetWidth - 40) + "px"; t.style.top = (b.y - 64) + "px";
    const ptr = MKU.el("div", "mk-ghost-ptr mk-x"); document.body.appendChild(ptr); ptr.style.left = (b.x + b.w * 0.5) + "px"; ptr.style.top = (b.y + b.h * 0.5) + "px";
    const n = pl.find((e) => e.id === "my_neko");
    const t2 = MKU.el("div", "mk-tip mk-x", "<span class='mk-note'>6/12 · tự vẽ</span><br><b>猫</b> ねこ · con mèo"); document.body.appendChild(t2);
    t2.style.left = (n.x + n.w + 70) + "px"; t2.style.top = (n.y - 30) + "px"; t2.style.opacity = ".92";
    const y = document.getElementById("kb-yard").getBoundingClientRect();
    MKU.tagAt(SX(150) - 60, SY(0) + 6, "13/12: 12 món · dây kim tuyến (2/12) · dây đèn (10/12)");
    MKU.tagAt(t.getBoundingClientRect().left - 10, t.getBoundingClientRect().top - 32, "rê chuột lên món: ngày + từ");
    return 1;`);
  await hideToast(); await shot('raw_ru');
};

// 04 — Chủ nhật 13/12: tự vẽ món treo 8 × 8
STEPS.ve = async () => {
  await collapseToday();
  const st = treeState(12);
  await scene(st);
  await js(`const p = MKU.pop("mk-draw", 220, 330, 900);
    MKU.head(p, "Tự vẽ món treo", "Chủ nhật 13/12 · ô cửa tự vẽ", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.gap = "22px";
    const left = body.appendChild(MKU.el("div", "")); left.style.cssText = "display:flex;flex-direction:column;gap:9px";
    const kh = left.appendChild(MKU.el("div", "mk-row", "Khuôn:")); ["Tròn", "Chuông", "Sao", "Tự do"].forEach((k, i) => kh.appendChild(MKU.el("span", "mk-chip" + (i === 3 ? " is-on" : ""), k)));
    const g = left.appendChild(MKU.el("div", "mk-px")); g.style.gridTemplateColumns = "repeat(8, 34px)";
    const rows = ["..rrrr..", ".rrrrrr.", "rreeeerr", "rekeekre", "rreeeerr", "rrriirrr", ".rrrrrr.", "..RRRR.."], P = MK.P;
    rows.forEach((r) => { for (const ch of r) { const c = g.appendChild(document.createElement("i")); c.style.height = "34px"; if (ch !== ".") { c.style.background = P[ch]; } } });
    const pal = left.appendChild(MKU.el("div", "mk-row")); "rRoyiegGjldubBswkv".split("").forEach((ch, i) => { const s = pal.appendChild(MKU.el("span", "mk-sw" + (ch === "r" ? " is-on" : ""))); s.style.background = P[ch]; s.style.width = "16px"; s.style.height = "16px"; });
    const tools = left.appendChild(MKU.el("div", "mk-tools")); ["Bút", "Tẩy", "Đổ màu", "↶ Hoàn tác", "Xoá hết"].forEach((t, i) => tools.appendChild(MKU.el("button", "kb-btn kb-btn-small" + (i === 0 ? " is-on" : ""), t)));
    const right = body.appendChild(MKU.el("div", "")); right.style.cssText = "display:flex;flex-direction:column;gap:10px;align-items:flex-start";
    right.appendChild(MKU.el("div", "", "<b>Xem trên cây</b>"));
    const cv = right.appendChild(document.createElement("canvas")); cv.width = 220; cv.height = 230; cv.style.border = "2px solid var(--kb-ink)";
    const st = ${JSON.stringify(st)}; st.items = st.items.concat([{ id: "my_daruma", spot: 16 }]);
    MK.miniTree(cv, 4, st, "#eaf3f7");
    const r3 = right.appendChild(MKU.el("div", "mk-row")); r3.appendChild(MKU.el("span", "", "Gắn từ:")); r3.appendChild(MKU.el("span", "mk-sel", "<b>料理</b> りょうり · món ăn ▾"));
    const r4 = right.appendChild(MKU.el("div", "mk-row")); r4.appendChild(MKU.el("button", "kb-btn", "Treo lên cây")); r4.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Lấy món có sẵn"));
    right.appendChild(MKU.el("div", "mk-note", "Không muốn vẽ thì bấm “Lấy món có sẵn”."));
    p.appendChild(MKU.el("div", "mk-foot", "Khung 8 × 8, bút / tẩy / đổ màu như Xưởng · Chủ nhật 6, 13, 20/12 · món tự vẽ cũng gắn một từ · mỗi người một cây khác nhau"));
    MKU.tag(g, "vẽ trên khung 8 × 8 (ví dụ: daruma)", "right", 0, 0);
    MKU.tag(cv, "thấy ngay trên cây của mình", "right", 0, 0);
    return 1;`);
  await hideToast(); await shot('raw_ve');
};

// 05 — Thiệp điều ước (mặt trước trang trí, mặt sau viết), treo lên cây; ông già Noel lấy đêm 24
STEPS.thiep = async () => {
  await collapseToday();
  const st = treeState(14); st.items.push({ id: 'card', at: [24, 27] });
  await scene(st);
  await js(`const p = MKU.pop("mk-card", 160, 300, 1100);
    MKU.head(p, "Thiệp điều ước", "gửi ông già Noel · đêm 24/12 ông ghé lấy", "Chủ nhật 20/12");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.gap = "26px"; body.style.alignItems = "flex-start";
    // mặt trước
    const f = body.appendChild(MKU.el("div", "")); f.style.cssText = "display:flex;flex-direction:column;gap:8px";
    f.appendChild(MKU.el("div", "", "<b>Mặt trước</b> · trang trí"));
    const card = f.appendChild(MKU.el("div", "mk-card"));
    const bg = card.appendChild(document.createElement("canvas")); bg.width = 210; bg.height = 290; bg.style.left = "0"; bg.style.top = "0";
    const c = bg.getContext("2d"); c.fillStyle = "#b8333a"; c.fillRect(0, 0, 210, 290);
    for (let k = 0; k < 70; k++) { const x = (k * 53) % 210, y = (k * 97) % 290; c.fillStyle = k % 4 ? "rgba(255,255,255,.55)" : "#fff"; c.fillRect(x, y, k % 5 ? 3 : 6, k % 5 ? 3 : 6); }
    c.fillStyle = "#fff"; c.fillRect(0, 262, 210, 28); c.fillStyle = "#f2d36b"; c.fillRect(0, 258, 210, 4);
    // hình tự vẽ 16 × 16: mèo đội mũ Noel
    const draw = ["..........ww....", "........rrww....", "......rrrrr.....", "....rrrrrrrr....", "...wwwwwwwwww...", "...o..oooo..o...",
      "..oo.oooooo.oo..", "..oooooooooooo..", "..ookoooooookoo..", "..oooooppoooooo.", "..ooowoooowooo..", "...oooooooooo...", "...oooooooooo.o.",
      "..oooooooooooooo", "..oooooooooooo..", "...oo..oo..oo..."].map((s) => s.slice(0, 16));
    const pix = card.appendChild(MK.icon(MK.pic(draw), 8)); pix.style.left = "33px"; pix.style.top = "36px";
    [["star", 12, 12, 3], ["flake", 168, 22, 4], ["bell", 160, 200, 4], ["cane", 18, 196, 4]].forEach(([k, x, y, s]) => { const i = card.appendChild(MK.icon(MK.ORN[k], s)); i.style.left = x + "px"; i.style.top = y + "px"; });
    card.appendChild(MKU.el("div", "mk-mx", "Merry Christmas"));
    const r1 = f.appendChild(MKU.el("div", "mk-row", "Giấy:")); ["#b8333a", "#2f6b45", "#22325e", "#f4e7c8"].forEach((col, i) => { const s = r1.appendChild(MKU.el("span", "mk-sw" + (i ? "" : " is-on"))); s.style.background = col; });
    const r2 = f.appendChild(MKU.el("div", "mk-row", "Sticker:")); ["star", "flake", "bell", "cane", "heart", "gift"].forEach((k) => r2.appendChild(MK.icon(MK.ORN[k], 2)));
    f.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Vẽ hình 16 × 16 ▸"));
    // mặt sau
    const b = body.appendChild(MKU.el("div", "")); b.style.cssText = "display:flex;flex-direction:column;gap:8px";
    b.appendChild(MKU.el("div", "", "<b>Mặt sau</b> · điều ước"));
    b.appendChild(MKU.el("div", "mk-letter", "Gửi ông già Noel,<br>Năm sau cháu muốn đọc được báo tiếng Nhật mà không cần tra từ, và mong mèo Mochi luôn khoẻ, mập thêm một chút.<br>Cháu cảm ơn ông!<div class='mk-sig'>— Mít</div>"));
    const r3 = b.appendChild(MKU.el("div", "mk-row", "Viết bằng:")); r3.appendChild(MKU.el("span", "mk-chip is-on", "Tiếng Việt")); r3.appendChild(MKU.el("span", "mk-chip", "Tiếng Nhật"));
    b.appendChild(MKU.el("div", "mk-note", "Viết tiếng Nhật thì có nút “Nhờ Gemini sửa” như Luyện viết."));
    // bên phải
    const s = body.appendChild(MKU.el("div", "")); s.style.cssText = "display:flex;flex-direction:column;gap:10px;width:250px";
    s.appendChild(MKU.el("div", "", "<b>Treo lên cây</b>"));
    const cv = s.appendChild(document.createElement("canvas")); cv.width = 200; cv.height = 210; cv.style.border = "2px solid var(--kb-ink)";
    MK.miniTree(cv, 4, ${JSON.stringify(st)}, "#eaf3f7");
    s.appendChild(MKU.el("button", "kb-btn", "Treo thiệp lên cây"));
    s.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Lưu nháp"));
    s.appendChild(MKU.el("div", "mk-note", "Viết lúc nào cũng được từ 1/12, sửa được tới 18:00 ngày 24/12. Thiệp chỉ ở trong vườn của bạn, không gửi đi đâu."));
    MKU.tag(cv, "thiệp treo trên cây chờ ông già Noel", "top", -40, 0);
    return 1;`);
  await hideToast(); await shot('raw_thiep');
};

// 06 — Đêm 24/12: ngôi sao lên đỉnh, cây sáng, ông già Noel đáp xe tuần lộc xuống sân lấy thiệp
STEPS.dem = async () => {
  await collapseToday();
  const st = treeState(24);
  await scene(st, { hour: 22, weather: 'snow', night: true, extra: `
    MK.spr(v, MK.L.SPR.sleigh, 214, 52); MK.spr(v, MK.SANTA, 197, 57);
    MK.spr(v, MK.STACK, 124, 64); MK.spr(v, MK.SANTA_HAT, 121, 59); MK.spr(v, MK.CAT, 137, 67);
    MK.tint(v, 0.3); MK.glow(v, st);` });
  await js(`const y = document.getElementById("kb-yard").getBoundingClientRect(), X = SX, Y = SY;
    const b = MKU.el("div", "mk-bubble mk-x", "<b>ホッホッホー！メリークリスマス！</b><br>Ông nhận thiệp của cháu rồi nhé!"); document.body.appendChild(b);
    b.style.left = (X(197) - 12) + "px"; b.style.top = (Y(57) - b.offsetHeight - 14) + "px";
    MKU.tagAt(X(150) - 40, y.bottom + 10, "Đêm 24/12 · thành phẩm: cây đủ 24 món, ngôi sao trên đỉnh, đèn sáng");
    MKU.tagAt(X(150) - 40, y.bottom + 42, "Mở vườn lúc nào từ 18:00 ngày 24 tới hết 31/12 cũng gặp — không cần thức khuya");
    MKU.tagAt(X(110), Y(52) - 30, "StackChan + thú nuôi ra xem", "is-blue");
    return 1;`);
  await hideToast(); await shot('raw_dem');
};

// 07 — Sáng 25/12: hộp quà dưới gốc, dấu chân trên tuyết; quả cầu tuyết có cây của bạn + thư trả lời
STEPS.sang = async () => {
  await collapseToday();
  const st = treeState(24); st.items.push({ id: 'gift_big', at: [26, 41], hook: false });
  const W = Object.keys(WORDS).map((d) => WORDS[d][0]);
  await scene(st, { hour: 9, weather: 'sunny', extra: `
    for (let k = 0; k < 12; k++) { MK.L.box(v.ctx, v.ox + 196 + k * 4, 72 - (k % 2), 1, 1, "#9aa6bf", v.S); MK.L.box(v.ctx, v.ox + 198 + k * 4, 73 - (k % 2), 1, 1, "#9aa6bf", v.S); }
    for (let x = 206; x < 258; x++) { MK.L.box(v.ctx, v.ox + x, 70, 1, 1, "#b5c0d6", v.S); MK.L.box(v.ctx, v.ox + x, 74, 1, 1, "#b5c0d6", v.S); }` });
  await js(`const p = MKU.pop("mk-gift", 200, 432, 1060);
    MKU.head(p, "Quà của ông già Noel", "sáng 25/12 · hộp quà dưới gốc cây", "");
    const body = p.appendChild(MKU.el("div", "mk-body")); body.style.gap = "26px"; body.style.alignItems = "flex-start";
    const g = body.appendChild(MKU.el("div", "")); g.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:8px";
    const cv = g.appendChild(document.createElement("canvas")); cv.width = 250; cv.height = 280; cv.className = "mk-globe";
    const c = cv.getContext("2d"); c.imageSmoothingEnabled = false;
    c.fillStyle = "#6b3b1f"; c.fillRect(30, 228, 190, 46); c.fillStyle = "#a0603a"; c.fillRect(38, 228, 174, 10); c.fillStyle = "#3a2a22"; c.strokeStyle = "#3a2a22"; c.lineWidth = 4; c.strokeRect(30, 228, 190, 46);
    c.fillStyle = "#e9b949"; c.fillRect(92, 246, 66, 18); c.fillStyle = "#3a2a22"; c.font = "bold 14px sans-serif"; c.fillText("2026", 108, 260);
    c.save(); c.beginPath(); c.arc(125, 122, 108, 0, Math.PI * 2); c.clip(); c.fillStyle = "#d9eef8"; c.fillRect(0, 0, 250, 240);
    c.fillStyle = "#f5f9ff"; c.fillRect(0, 196, 250, 50);
    const st = ${JSON.stringify(treeState(24))};
    const tmp = document.createElement("canvas"); tmp.width = 170; tmp.height = 190; MK.miniTree(tmp, 3, st, null); c.drawImage(tmp, 40, 30);
    for (let k = 0; k < 60; k++) { c.fillStyle = "#fff"; const x = (k * 71) % 230 + 10, yy = (k * 43) % 200 + 12; c.fillRect(x, yy, k % 3 ? 3 : 5, k % 3 ? 3 : 5); }
    c.restore(); c.lineWidth = 5; c.strokeStyle = "#3a2a22"; c.beginPath(); c.arc(125, 122, 108, 0, Math.PI * 2); c.stroke();
    c.fillStyle = "rgba(255,255,255,.55)"; c.fillRect(64, 52, 10, 34); c.fillRect(58, 92, 8, 14);
    g.appendChild(MKU.el("div", "", "<b>Quả cầu tuyết 2026</b>"));
    g.appendChild(MKU.el("div", "mk-note", "bên trong là cây thông bạn trang trí"));
    const m = body.appendChild(MKU.el("div", "mk-mail"));
    m.innerHTML = "Gửi cháu ở vườn ことば畑,<br>Ông đã đọc thiệp của cháu: «Năm sau cháu muốn đọc được báo tiếng Nhật mà không cần tra từ…»<br>Tháng này cháu treo đủ 24 món — 24 từ:" +
      "<div class='mk-words'>" + ${JSON.stringify(W)}.map((w) => "<span>" + w + "</span>").join("") + "</div>" +
      "Mỗi ngày một chút như thế là sẽ đọc được thôi. Giáng sinh năm sau ông lại ghé!<div class='mk-sig' style='text-align:right'>— サンタより · Ông già Noel</div>";
    const s = body.appendChild(MKU.el("div", "")); s.style.cssText = "display:flex;flex-direction:column;gap:10px;width:250px";
    s.appendChild(MKU.el("button", "kb-btn", "Đặt quả cầu tuyết vào nhà"));
    s.appendChild(MKU.el("button", "kb-btn kb-btn-small", "Lưu vào nhật ký"));
    s.appendChild(MKU.el("div", "mk-note", "<b>Từ 26/12:</b> “Cây thông 2026” vào Kho đồ — đặt ở sân hoặc trong nhà, giữ mãi.<br>Trang “Giáng sinh 2026” trong Cuốn nhật ký: ảnh cây + thiệp + thư.<br>Năm sau trang trí một cây mới."));
    MKU.tag(m, "thư viết sẵn: ghép điều ước + 24 từ của bạn — không gọi Gemini", "bottom", 0, 0);
    const y = document.getElementById("kb-yard").getBoundingClientRect();
    MKU.tagAt(SX(176), SY(0) + 6, "hộp quà dưới gốc · dấu chân + vết xe trên tuyết");
    return 1;`);
  await hideToast(); await shot('raw_sang');
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
