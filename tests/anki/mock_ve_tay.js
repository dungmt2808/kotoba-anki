// Ảnh phác (25/11, chưa làm): vẽ tay cho Giáng sinh — người dùng: "1 và 2 luôn nhé. duyệt trước rồi làm".
//   1. Xưởng thiệp có thẻ "✎ Vẽ" (bút / tẩy / cỡ bút / 32 màu của Xưởng), hình vẽ nằm trên sticker, dưới chữ;
//   2. Quả châu tự vẽ (3 quả 8 × 8) mở từ tủ lịch, xem trước trên cây;
//   3. Cây thông ngoài sân treo quả châu tự vẽ (ngày + đêm).
// Vẽ đè lên vườn thật trong Anki 26.9.4 (giao diện mẫu chèn vào trang, add-on chưa đổi). Hình vẽ tay mẫu do Claude vẽ.
// Chạy: KB_SCRIPTS=mock_ve_tay.js run_ui.sh ADDON docs/ke_hoach_ve_tay
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_ve_tay';
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLeCard !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
const KB = 'import sys, os, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nle = kb.le_core\n';
const DAYS = (n) => Array.from({ length: n }, (_, i) => '2026-12-' + String(i + 1).padStart(2, '0'));
const TEST = (today, now, days) => `kb.LE_TEST = {"today": "${today}", "now": "${now}", "days": ${JSON.stringify(days)}, "reviews": 30}\n`;
const SETUP = (n) => `mw.col.remove_config("kotoba_batake_le") if mw.col.get_config("kotoba_batake_le", None) is not None else None
d = st.load(); d["coins"] = 4860; d["home"]["house"] = 7; d["home"]["style"] = "classic"
for sc in list(kb.core.ALL_SCENES):
    d["home"][sc] = []
d["home"]["owned"] = {"bench": 1, "lantern": 1, "flowers": 2}
d["home"]["yard"] = [{"id": "bench", "x": 2, "y": 2}, {"id": "lantern", "x": 15, "y": 1}, {"id": "flowers", "x": 12, "y": 2}]
st.save(d)
kb.save_config(season_event=True, show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
ev = kb.LE.load()
give = {}
for dd in range(1, ${n} + 1):
    ev["open"][str(dd)] = {"d": "2026-12-%02d" % dd, "b": 0}
    for k, c in (le.DOORS[dd].get("item") or {}).items():
        if le.DOORS[dd]["kind"] != "qua":
            give[k] = give.get(k, 0) + c
ev["gift"] = {"tulich": "2026-12-01", "tree": "2026-12-01"}
give["le_tulich"] = 1; give["xmastree"] = 1
st.le_apply(give, ["le_tulich", "xmastree"] + le.auto_list(give), le.expected_tiles(ev), extra=[kb.LE.write(ev)])
ev = kb.LE.load()
le.save_card(ev, 0, {"f": "tuyet", "st": [{"s": "xmastree", "x": 6, "y": 22}, {"s": "presents", "x": 30, "y": 50}, {"s": "stackchan", "x": 88, "y": 43}],
             "t1": "Giáng sinh an lành!", "t2": "— Lan gửi Hoa", "c": "ja", "w": "", "wl": "vi"}, datetime.date(2026, 12, 10), datetime.datetime(2026, 12, 10, 9))
kb.LE.save(ev)
`;
async function reopen(before) {
  if (page) { try { page.close(); } catch (e) { } }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(500);
  await py(KB + (before || '') + '\nkb.open_garden(); result = 1');
  page = await gardenPage();
  await sleep(600);
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1');
  await sleep(1200);
}

// ---- mã chạy trong trang: hình vẽ tay mẫu + giao diện mẫu ----
const MOCK = `
window.__mock = (function () {
  const PAL = ${JSON.stringify({ k: '#1b1b2f', n: '#2b2b44', S: '#8a8fa8', m: '#9aa0b5', s: '#d4d4e0', w: '#ffffff', c: '#fff2b3', y: '#ffd23f', i: '#e9b949', o: '#ff9f1c', h: '#f5b971', t: '#e2a46a', b: '#a0603a', B: '#6b3b1f', e: '#ffd7b5', E: '#d99a6c', P: '#ffc4d6', p: '#ff7fa0', r: '#ff4f6d', R: '#c21f3a', v: '#c77dff', z: '#7b2cbf', l: '#8fd3ff', d: '#3d8bff', u: '#2f5fb0', U: '#1e3a8a', a: '#2ec4b6', A: '#1a7f78', f: '#b8e05a', g: '#3ccb5e', G: '#2e8b3a', j: '#1f5f2a' })};
  // lớp vẽ 120 × 80 (mỗi ô một mã màu hoặc ".")
  const W = 120, H = 80, layer = Array.from({ length: H }, () => Array(W).fill("."));
  const dot = (x, y, c, s) => { s = s || 1; for (let j = 0; j < s; j++) { for (let i = 0; i < s; i++) { const X = Math.round(x) + i, Y = Math.round(y) + j; if (X >= 0 && X < W && Y >= 0 && Y < H) { layer[Y][X] = c; } } } };
  function line(x0, y0, x1, y1, c, s) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) { dot(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n, c, s); } }
  function poly(pts, c, s) { for (let k = 1; k < pts.length; k++) { line(pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], c, s); } }
  // bông tuyết bút cỡ 1
  [[10, 36], [24, 31], [52, 34], [70, 30], [107, 36], [112, 50], [44, 44]].forEach(([x, y], k) => {
    const c = k % 3 ? "w" : "l";
    line(x - 2, y, x + 2, y, c); line(x, y - 2, x, y + 2, c); dot(x - 1, y - 1, c); dot(x + 1, y + 1, c); dot(x + 1, y - 1, c); dot(x - 1, y + 1, c);
  });
  // trái tim hồng (tô) cạnh StackChan
  const heart = ["..pp.pp..", ".ppppppp.", "pppPppppp", "ppppppppp", ".ppppppp.", "..ppppp..", "...ppp...", "....p...."];
  heart.forEach((r, j) => { for (let i = 0; i < r.length; i++) { if (r[i] !== ".") { dot(76 + i, 33 + j, r[i] === "P" ? "w" : "p"); } } });
  // ngôi sao vàng vẽ tay
  poly([[60, 52], [62, 46], [64, 52], [58, 48], [66, 48], [60, 52]], "y");
  // dây đèn lượn sóng
  const pts = []; for (let x = 4; x <= 116; x += 2) { pts.push([x, 60 + Math.round(2 * Math.sin(x / 7))]); }
  poly(pts, "G");
  pts.forEach(([x, y], k) => { if (k % 4 === 1) { dot(x, y + 1, ["r", "y", "d", "v"][(k >> 2) % 4], 2); } });
  // con mèo nhỏ vẽ tay ngồi trên tuyết
  poly([[44, 70], [44, 64], [46, 61], [48, 64], [52, 64], [54, 61], [56, 64], [56, 70], [44, 70]], "B");
  dot(47, 66, "k"); dot(53, 66, "k"); dot(50, 68, "p"); line(57, 69, 60, 65, "B");
  // nét chữ ký "Lan" (bút cỡ 1, màu chàm)
  poly([[8, 66], [8, 73], [12, 73]], "U"); poly([[15, 73], [17, 67], [19, 73]], "U"); line(16, 71, 18, 71, "U");
  poly([[22, 73], [22, 68], [26, 73], [26, 68]], "U"); poly([[27, 74], [31, 72], [35, 74]], "R");
  function paintLayer(ctx, S) { for (let y = 0; y < H; y++) { for (let x = 0; x < W; x++) { const c = layer[y][x]; if (c !== ".") { ctx.fillStyle = PAL[c]; ctx.fillRect(x * S, y * S, S, S); } } } }
  // 3 quả châu tự vẽ 8 × 8 (mã màu Xưởng)
  const ORN = [
    ["..RRRR..", ".RrrrrR.", "RrwrrwrR", "RrrwwrrR", "RrrwwrrR", "RrwrrwrR", ".RrrrrR.", "..RRRR.."],
    ["..uuuu..", ".uddddu.", "udwddwdu", "udwddwdu", "udwwwwdu", "udwddwdu", ".udwdwu.", "..uuuu.."],
    [".o....o.", ".oo..oo.", ".oooooo.", "oowoowoo", "ookookoo", "oooppooo", ".oowwoo.", "..oooo.."]
  ];
  const SPOTS = [[4, 22], [19, 22], [12, 12]];
  function paintOrn(ctx, rows, x, y, S) {
    ctx.fillStyle = "#e9b949"; ctx.fillRect((x + 3) * S, (y - 1) * S, 2 * S, S);         // móc vàng
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { if (r[i] !== ".") { ctx.fillStyle = PAL[r[i]]; ctx.fillRect((x + i) * S, (y + j) * S, S, S); } } });
  }
  return { PAL, layer, paintLayer, ORN, SPOTS, paintOrn };
})();
true;`;

(async () => {
  await reopen(SETUP(10) + TEST('2026-12-10', '2026-12-10T10:00', DAYS(10)));
  await page.eval(MOCK);

  // ---------------- 1. Xưởng thiệp: thẻ ✎ Vẽ ----------------
  await js(`GardenLeCard.open(0); return 1;`);
  await sleep(500);
  await js(`
    const M = window.__mock, $ = (id) => document.getElementById(id);
    const tabs = $("kb-le-stk-tabs");
    tabs.querySelectorAll("button").forEach((b) => b.classList.remove("is-on"));
    const vb = document.createElement("button"); vb.className = "kb-btn-small kb-album-chip is-on"; vb.textContent = "✎ Vẽ"; tabs.appendChild(vb);
    $("kb-le-stk-t").textContent = "Vẽ lên thiệp · hình vẽ nằm trên sticker, dưới chữ";
    $("kb-le-stk").hidden = true;
    const box = document.createElement("div"); box.className = "kb-le-drawbox";
    box.style.cssText = "display:flex;flex-direction:column;gap:8px;padding:8px;border:3px solid var(--kb-ink);background:var(--kb-paper,#fffaf0);margin:6px 0";
    const row = (html) => { const d = document.createElement("div"); d.className = "kb-h-btns"; d.style.cssText = "display:flex;flex-wrap:wrap;gap:6px;align-items:center"; d.innerHTML = html; box.appendChild(d); return d; };
    row('<button class="kb-btn kb-btn-small" style="background:var(--kb-butter,#fcefc9)">✎ Bút</button><button class="kb-btn kb-btn-small">◻ Tẩy</button>' +
        '<span class="kb-le-hintt" style="margin-left:6px">Cỡ</span><button class="kb-btn kb-btn-small" style="background:var(--kb-butter,#fcefc9)">1</button><button class="kb-btn kb-btn-small">2</button><button class="kb-btn kb-btn-small">3</button>' +
        '<button class="kb-btn kb-btn-small">↶ Hoàn tác</button>');
    const pal = row("");
    pal.style.cssText = "display:grid;grid-template-columns:repeat(16,22px);gap:3px";
    Object.keys(M.PAL).forEach((k) => { const s = document.createElement("span"); s.style.cssText = "width:22px;height:22px;border:2px solid var(--kb-ink);display:block;background:" + M.PAL[k] + (k === "U" ? ";outline:3px solid #ffd23f;outline-offset:1px" : ""); pal.appendChild(s); });
    row('<button class="kb-btn kb-btn-small">Xoá hình vẽ</button><span class="kb-le-hintt">Mã thiệp: 1.412 / 6.000 ký tự · vẽ dày quá thì gửi ảnh PNG</span>');
    $("kb-le-stk").parentNode.insertBefore(box, $("kb-le-stk"));
    // vẽ lên thiệp đang hiện (sticker → hình vẽ; chữ đặt chỗ không có nét vẽ)
    const cv = $("kb-le-cardcv"), S = cv.width / 120;
    M.paintLayer(cv.getContext("2d"), S);
    document.body.style.cursor = "crosshair";
    return 1;`);
  await sleep(300);
  await page.shot(OUT + '/vt_01_xuong_thiep_ve.png');
  await js(`GardenLeCard.close(); return 1;`);

  // ---------------- 2. Quả châu tự vẽ (từ tủ lịch) ----------------
  await js(`GardenLe.open(); return 1;`);
  await sleep(400);
  await js(`
    const acts = document.getElementById("kb-le-acts");
    const b = document.createElement("button"); b.className = "kb-btn kb-btn-small"; b.textContent = "Vẽ quả châu ▸"; b.style.outline = "3px dashed #c21f3a"; b.style.outlineOffset = "2px";
    acts.appendChild(b); return 1;`);
  await sleep(200);
  await page.shot(OUT + '/vt_02_tu_lich_nut.png');
  await js(`GardenLe.close(); return 1;`);
  await js(`
    const M = window.__mock, A = GardenLeArt, v = Garden._data().le;
    const pop = document.createElement("div"); pop.className = "kb-le-pop kb-le-cardpop"; pop.id = "kb-mock-orn";
    pop.style.cssText = "width:min(860px,calc(100vw - 24px))";
    pop.innerHTML = '<div class="kb-le-head"><b>Quả châu tự vẽ</b><span class="kb-le-hintt" style="margin-left:8px">Tủ lịch › Vẽ quả châu</span><button class="kb-pin-x">✕</button></div>';
    const body = document.createElement("div"); body.style.cssText = "display:flex;gap:16px;padding:10px 12px;flex-wrap:wrap";
    pop.appendChild(body);
    // cột trái: 3 ô + lưới vẽ 8 × 8 + bút / tẩy / màu
    const left = document.createElement("div"); left.style.cssText = "display:flex;flex-direction:column;gap:8px";
    const slots = document.createElement("div"); slots.style.cssText = "display:flex;gap:8px;align-items:center";
    M.ORN.forEach((rows, k) => {
      const c = document.createElement("canvas"); c.width = 10 * 5; c.height = 10 * 5; c.style.cssText = "border:3px solid var(--kb-ink);background:#eaf3ea" + (k === 0 ? ";outline:3px solid #ffd23f" : "");
      M.paintOrn(c.getContext("2d"), rows, 1, 1.4, 5);
      const w = document.createElement("div"); w.style.cssText = "display:flex;flex-direction:column;align-items:center;gap:2px;font-size:12px";
      w.appendChild(c); const t = document.createElement("span"); t.textContent = "Quả " + (k + 1) + " · trên cây"; w.appendChild(t); slots.appendChild(w);
    });
    left.appendChild(slots);
    const G = 30, gc = document.createElement("canvas"); gc.width = 8 * G; gc.height = 8 * G; gc.style.cssText = "border:3px solid var(--kb-ink)";
    const g = gc.getContext("2d");
    for (let y = 0; y < 8; y++) { for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? "#f3ecdf" : "#fffaf0"; g.fillRect(x * G, y * G, G, G); } }
    M.ORN[0].forEach((r, j) => { for (let i = 0; i < 8; i++) { if (r[i] !== ".") { g.fillStyle = M.PAL[r[i]]; g.fillRect(i * G, j * G, G, G); } } });
    g.strokeStyle = "rgba(58,42,34,.18)"; for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(i * G + 0.5, 0); g.lineTo(i * G + 0.5, 8 * G); g.stroke(); g.beginPath(); g.moveTo(0, i * G + 0.5); g.lineTo(8 * G, i * G + 0.5); g.stroke(); }
    left.appendChild(gc);
    const tools = document.createElement("div"); tools.style.cssText = "display:flex;gap:6px;flex-wrap:wrap";
    tools.innerHTML = '<button class="kb-btn kb-btn-small" style="background:var(--kb-butter,#fcefc9)">✎ Bút</button><button class="kb-btn kb-btn-small">◻ Tẩy</button><button class="kb-btn kb-btn-small">↶ Hoàn tác</button><button class="kb-btn kb-btn-small">Xoá</button>';
    left.appendChild(tools);
    const pal = document.createElement("div"); pal.style.cssText = "display:grid;grid-template-columns:repeat(11,20px);gap:3px";
    Object.keys(M.PAL).forEach((k) => { const s = document.createElement("span"); s.style.cssText = "width:20px;height:20px;border:2px solid var(--kb-ink);display:block;background:" + M.PAL[k] + (k === "r" ? ";outline:3px solid #ffd23f;outline-offset:1px" : ""); pal.appendChild(s); });
    left.appendChild(pal);
    body.appendChild(left);
    // cột phải: xem trước trên cây
    const right = document.createElement("div"); right.style.cssText = "display:flex;flex-direction:column;gap:8px;align-items:center;flex:1;min-width:260px";
    const tc = document.createElement("canvas"), TS = 7; tc.width = 32 * TS + 40; tc.height = 44 * TS + 20; tc.style.cssText = "border:3px solid var(--kb-ink);background:#d8ecf7";
    const tg = tc.getContext("2d"); tg.imageSmoothingEnabled = false;
    tg.fillStyle = "#cfe6c4"; tg.fillRect(0, tc.height - 40, tc.width, 40);
    tg.save(); tg.translate(20, 10);
    A.paint(tg, A.tree(v.parts || []), 0, 0, TS);
    M.ORN.forEach((rows, k) => M.paintOrn(tg, rows, M.SPOTS[k][0], M.SPOTS[k][1], TS));
    tg.restore();
    right.appendChild(tc);
    const hint = document.createElement("div"); hint.className = "kb-le-hintt"; hint.style.maxWidth = "300px";
    hint.textContent = "Vẽ 3 quả, treo cả 3 lên cây thông ngoài sân (tới hết mùa). Ngày 1/1 StackChan cất vào hộp cùng đồ Noel — quả châu giữ ở Album → Kỷ niệm. Không tốn xu.";
    right.appendChild(hint);
    const rb = document.createElement("div"); rb.className = "kb-h-btns"; rb.innerHTML = '<button class="kb-btn kb-btn-small">Gỡ quả 1 khỏi cây</button><button class="kb-btn kb-btn-small">Lưu ảnh PNG</button>';
    right.appendChild(rb);
    body.appendChild(right);
    (document.getElementById("kb-app") || document.body).appendChild(pop);
    pop.hidden = false;
    return 1;`);
  await sleep(300);
  await page.shot(OUT + '/vt_03_qua_chau_tu_ve.png');
  await js(`document.getElementById("kb-mock-orn").remove(); return 1;`);

  // ---------------- 3. Cây ngoài sân (ngày + đêm) ----------------
  await js(`
    const M = window.__mock, L = GardenLe, f = L.drawTreeExtra;
    L.drawTreeExtra = function (ctx, S, X, Y, e, now, tod) { f.apply(this, arguments); M.ORN.forEach((rows, k) => M.paintOrn(ctx, rows, X + M.SPOTS[k][0], Y + M.SPOTS[k][1], S)); };
    return 1;`);
  await sleep(1500);
  await page.shot(OUT + '/vt_04_cay_ngoai_san.png');
  await js(`if (typeof GardenSky !== "undefined" && GardenSky.hold) { GardenSky.hold(21, "sunny", 60000); } return 1;`);
  await sleep(1800);
  await page.shot(OUT + '/vt_05_cay_ban_dem.png');
  await py(KB + 'kb.LE_TEST = None\nresult = 1');
  console.log('Ảnh phác: ' + OUT);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
