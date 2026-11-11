// 1.25.5 — admin sửa hình gốc rồi ra bản mới (người dùng chọn 11/11), trong Anki thật:
//   chưa bật admin: không có nút "Sửa hình", lệnh lưu bị bỏ · bật admin: nút ở thẻ đồ / thú / giống / khách → Xưởng "Hình gốc"
//   (đúng cỡ, bảng màu của nhóm, nhiều khung) → Lưu → user_files/mau_sua.json, hình đổi ngay; mở lại vườn vẫn đổi; Esc khi đã vẽ
//   chỉ nhắc; bản sửa sai cỡ / màu lạ bị bỏ; Xuất file / Nhập file; Về gốc; file mau_sua.json đi kèm gói (người dùng thường nhận).
// Chạy: KB_SCRIPTS=e2e_1255.js run_ui.sh ADDON SHOTS
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1255';
fs.mkdirSync(SHOTS, { recursive: true });
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenHome !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page, pass = 0, total = 0;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
const KB = 'import sys, os, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
const OUT = '/tmp/kb_mau_xuat_' + CTRL + '.json', IN = '/tmp/kb_mau_nhap_' + CTRL + '.json';
async function reopen() {
  try { page.close(); } catch (e) { }
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nresult = 1'); await sleep(800);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
}
const local = () => py(KB + 'result = kb.mau.read(kb.MAU_LOCAL)["sua"]');
const cardFix = (tab, re) => js(`GardenHome.setTab("${tab}"); const c = [...document.querySelectorAll("#kb-h-list .kb-h-card")].find(x => ${re}.test(x.textContent) && x.querySelector(".kb-h-fix"));
  const b = c && c.querySelector(".kb-h-fix"); if (b) { b.click(); } return !!b;`);
// vẽ một ô (x, y) bằng màu ch trên lưới Xưởng
const paint = (x, y, ch) => js(`const cv = document.getElementById("kb-cf-grid"), r = cv.getBoundingClientRect(), cell = GardenCraft._state().cell;
  const sw = document.querySelector('#kb-cf-pal [data-c="${ch}"]'); if (!sw) { return false; } sw.click(); document.querySelector('#kb-craft [data-tool="pen"]').click();
  const ev = (t) => cv.dispatchEvent(new PointerEvent(t, { clientX: r.left + (${x} + 0.5) * cell, clientY: r.top + (${y} + 0.5) * cell, bubbles: true, button: 0, pointerId: 1 }));
  ev("pointerdown"); ev("pointerup"); return true;`);
const esc = () => js('document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); return 1;');

(async () => {
  await py(KB + `d = st.load(); d["coins"] = 100000; d["home"]["house"] = 7; st.save(d)
for p in (kb.MAU_LOCAL, kb.MAU_BUNDLED):
    if os.path.exists(p): os.remove(p)
kb.save_config(show_tooltips=False)
if os.path.exists(kb.ADMIN_FILE): os.remove(kb.ADMIN_FILE)
kb.open_garden(); result = 1`);
  await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 900); result = 1'); await sleep(800);
  const goc = await js('return GardenHome._lib().SPR.chochin.slice();');

  console.log('== chưa bật admin');
  await js('document.getElementById("kb-house").click(); return 1;'); await sleep(900);
  await js('GardenHome.setTab("yard"); return 1;'); await sleep(400);
  ok(await js('return document.querySelectorAll(".kb-h-fix").length === 0;'), 'không có nút "Sửa hình" ở bảng Nhà');
  await py(KB + 'kb._dialog._on_base("save:" + json.dumps({"key": "do:chochin", "frames": {"spr": ["k" * 10] * 18}}))\nresult = 1');
  ok(!(await py(KB + 'result = os.path.exists(kb.MAU_LOCAL)')), 'lệnh lưu gửi thẳng khi chưa bật admin bị bỏ (không ghi file)');

  console.log('== bật admin: sửa đèn lồng giấy');
  // 1.25.7: admin bật bằng file user_files/admin (không còn config "admin")
  await py(KB + 'open(kb.ADMIN_FILE, "w").close(); kb._dialog.refresh(); result = 1'); await sleep(900);
  await js('GardenHome.setTab("yard"); return 1;'); await sleep(400);
  const nfix = await js('return document.querySelectorAll(".kb-h-fix").length;');
  ok(nfix >= 10, 'thẻ đồ có nút "Sửa hình" (' + nfix + ' nút ở Trang trí sân)');
  ok(await cardFix('yard', '/Đèn lồng giấy/'), 'bấm "Sửa hình" ở thẻ Đèn lồng giấy'); await sleep(600);
  const st0 = await js(`const s = GardenCraft._state(); return { open: GardenCraft.isOpen(), base: s.base, frames: s.frames, gw: s.gw, gh: s.gh,
    tip: document.getElementById("kb-cf-tip").textContent, save: document.getElementById("kb-cf-save").textContent,
    pal: document.querySelectorAll("#kb-cf-pal [data-c]").length, P: Object.keys(GardenHome._lib().P).length, framesBar: !document.getElementById("kb-cf-frames").parentNode.hidden };`);
  ok(st0.open && st0.base === 'do:chochin' && st0.gw === 10 && st0.gh === 18, 'Xưởng mở đúng hình gốc 10 × 18: ' + JSON.stringify([st0.base, st0.gw, st0.gh]));
  ok(st0.pal === st0.P, 'bảng màu = bảng màu của đồ (' + st0.pal + ' màu)');
  ok(st0.tip === 'Hình gốc · Đèn lồng giấy' && st0.save === 'Lưu' && !st0.framesBar, 'chữ ngắn: "' + st0.tip + '" · nút "' + st0.save + '" · một khung thì không có hàng Khung');
  await page.shot(SHOTS + '/1255_01_xuong_hinh_goc.png');
  ok(await paint(0, 0, 'k'), 'vẽ một điểm viền ở góc');
  await esc(); await sleep(200);
  ok(await js('return GardenCraft.isOpen() && /Esc lần nữa/.test(document.getElementById("kb-cf-tip").textContent);'), 'đã vẽ: Esc lần đầu chỉ nhắc');
  await js('document.getElementById("kb-cf-save").click(); return 1;'); await sleep(1200);
  const s1 = await js('return { open: GardenCraft.isOpen(), row: GardenHome._lib().SPR.chochin[0], fixed: !!document.querySelector(".kb-h-fix.is-fixed") };');
  const f1 = await local();
  ok(!s1.open && s1.row === 'k' + goc[0].slice(1), 'Lưu → Xưởng đóng, hình đổi ngay: ' + s1.row);
  ok(f1['do:chochin'] && f1['do:chochin'].spr && f1['do:chochin'].spr[0] === s1.row && Object.keys(f1['do:chochin']).length === 1, 'ghi vào user_files/mau_sua.json (chỉ khung đã sửa)');
  ok(s1.fixed, 'thẻ đánh dấu đã sửa (nút tím đậm)');

  console.log('== mở lại vườn');
  await reopen();
  ok(await js('return GardenHome._lib().SPR.chochin[0] === ' + JSON.stringify(s1.row) + ' && !!window.__kbFix["do:chochin"];'), 'mở lại: bản sửa vẫn áp (nạp trong <head>)');

  console.log('== nhiều khung: chong chóng, thú, giống cây, khách');
  await js('GardenCraft.openBase({ group: "do", id: "kazaguruma", name: "Chong chóng" }); return 1;'); await sleep(500);
  const kz = await js('const s = GardenCraft._state(); return { frames: s.frames, bar: document.querySelectorAll("#kb-cf-frames button").length, lab: [...document.querySelectorAll("#kb-cf-frames button")].map(b => b.textContent).slice(0, 3) };');
  ok(kz.frames.length >= 2 && kz.bar === kz.frames.length, 'chong chóng: ' + kz.frames.length + ' khung, hàng Khung ' + kz.lab.join(' / '));
  await js('document.dispatchEvent(new KeyboardEvent("keydown", { key: "3", bubbles: true })); return 1;'); await sleep(200);
  const k3 = await js('return GardenCraft._state().layer;');
  ok(k3 === kz.frames[2], 'phím 3 → khung thứ ba (' + k3 + ')');
  await paint(0, 0, 'y');
  ok(await js('const b = [...document.querySelectorAll("#kb-cf-frames button")].find(x => x.getAttribute("data-layer") === ' + JSON.stringify(k3) + '); return b.classList.contains("is-drawn");'), 'khung vừa vẽ có chấm đánh dấu');
  await js('document.getElementById("kb-cf-save").click(); return 1;'); await sleep(1200);
  const f2 = await local();
  ok(f2['do:kazaguruma'] && Object.keys(f2['do:kazaguruma']).join() === k3 && await js('return GardenFix.frames("do", "kazaguruma")[' + JSON.stringify(k3) + '][0][0] === "y";'), 'chỉ lưu khung đã sửa, khung đó đổi trong cảnh');
  await js('GardenHome.setTab("pet"); return 1;'); await sleep(400);
  ok(await cardFix('pet', '/Shiba/'), 'thẻ thú nuôi (Shiba) có nút "Sửa hình"'); await sleep(500);
  const pt = await js('const s = GardenCraft._state(); return { base: s.base, frames: s.frames, pal: document.querySelectorAll("#kb-cf-pal [data-c]").length, P: Object.keys(GardenPets.pal).length, lab: [...document.querySelectorAll("#kb-cf-frames button")].map(b => b.textContent) };');
  ok(pt.base === 'thu:shiba' && pt.frames.join() === 'walk0,walk1,sit,sleep' && pt.pal === pt.P && pt.lab.join() === 'Đi 1,Đi 2,Ngồi,Ngủ', 'thú: 4 khung "' + pt.lab.join(' / ') + '", bảng màu của thú');
  await js('document.dispatchEvent(new KeyboardEvent("keydown", { key: "3", bubbles: true })); return 1;'); await paint(0, 0, 'k');
  await js('document.getElementById("kb-cf-save").click(); return 1;'); await sleep(1200);
  ok(await js('return GardenPets.sprite("shiba", "sit")[0][0] === "k";'), 'lưu → hình Shiba ngồi đổi');
  ok(await cardFix('seed', '/Lúa/'), 'thẻ giống cây (Lúa) có nút "Sửa hình"'); await sleep(500);
  const sd = await js('const s = GardenCraft._state(); return { base: s.base, frames: s.frames, gw: s.gw, lab: [...document.querySelectorAll("#kb-cf-frames button")].map(b => b.textContent) };');
  ok(sd.base === 'giong:ine' && sd.frames.length === 5 && sd.lab[4] === 'Ra quả', 'giống cây: 5 giai đoạn (' + sd.lab.join(' / ') + ')');
  await js('document.dispatchEvent(new KeyboardEvent("keydown", { key: "5", bubbles: true })); return 1;'); await paint(0, 0, 'k');
  await js('document.getElementById("kb-cf-save").click(); return 1;'); await sleep(1200);
  ok(await js('return GardenSeeds.rows("ine", 4)[0][0] === "k";'), 'lưu → Lúa Ra quả đổi (ruộng, lịch hoa dùng hình này)');
  ok(await cardFix('guest', '/./'), 'thẻ khách (Album khách) có nút "Sửa hình"'); await sleep(500);
  const gs = await js('const s = GardenCraft._state(); return { base: s.base, n: s.frames.length };');
  ok(/^khach:/.test(gs.base) && gs.n >= 2, 'khách: ' + gs.base + ', ' + gs.n + ' khung');
  await esc(); await sleep(200);
  ok(await js('return !GardenCraft.isOpen();'), 'chưa vẽ gì: Esc một lần là đóng');

  console.log('== các loại đồ khác: nội thất, treo tường, theo mùa, món hiếm, gian bếp');
  for (const [id, nm] of [["kotatsu", "Kotatsu"], ["kakejiku", "Tranh cuộn"], ["kaki", "Cây hồng"], ["shika", "Hươu Nara"], ["reizouko", "Tủ lạnh"]]) {
    const o = await js(`const L = GardenHome._lib(); if (!Array.isArray(L.SPR["${id}"])) { return null; }
      GardenCraft.openBase({ group: "do", id: "${id}", name: "${nm}" }); const s = GardenCraft._state();
      return { open: GardenCraft.isOpen(), base: s.base, gw: s.gw, gh: s.gh, w: L.SPR["${id}"][0].length, h: L.SPR["${id}"].length, n: s.frames.length };`);
    if (!o) { ok(false, id + ': không có hình'); continue; }
    await paint(0, 0, 'w');
    await js('document.getElementById("kb-cf-save").click(); return 1;'); await sleep(900);
    const after = await js('return [GardenHome._lib().SPR["' + id + '"][0][0], GardenCraft.isOpen()];');
    ok(o.open && o.base === 'do:' + id && o.gw === o.w && o.gh === o.h && after[0] === 'w' && !after[1],
      nm + ' (' + id + '): Xưởng ' + o.gw + ' × ' + o.gh + ', ' + o.n + ' khung → Lưu → hình đổi');
  }

  // khung trống hết (Xoá hết) → không cho lưu
  await js('GardenCraft.openBase({ group: "do", id: "flowers", name: "Bụi hoa" }); document.getElementById("kb-cf-clear").click(); document.getElementById("kb-cf-save").click(); return 1;'); await sleep(600);
  ok(await js('return GardenCraft.isOpen() && document.getElementById("kb-cf-tip").textContent === "Khung này đang trống." && GardenHome._lib().SPR.flowers.some(r => /[^.]/.test(r));'),
    'Xoá hết rồi Lưu → không lưu, nhắc "Khung này đang trống." (món không biến mất)');
  await js('document.getElementById("kb-cf-cancel").click(); return 1;'); await sleep(200);

  console.log('== bản sửa hỏng bị bỏ');
  await py(KB + `s = kb.mau.read(kb.MAU_LOCAL)
s["sua"]["do:lantern"] = {"spr": ["k" * 5] * 5}
s["sua"]["do:mailbox"] = {"spr": ["X" * 12] * 12}
kb.mau.write(kb.MAU_LOCAL, s); result = 1`);
  const lan0 = await js('return [GardenHome._lib().SPR.lantern.join("|"), GardenHome._lib().SPR.mailbox.join("|")];');
  await reopen();
  const lan1 = await js('return [GardenHome._lib().SPR.lantern.join("|"), GardenHome._lib().SPR.mailbox.join("|")];');
  ok(lan1[0] === lan0[0] && lan1[1] === lan0[1], 'sai cỡ (đèn đá 5 × 5) / màu lạ (hòm thư "X") → giữ hình gốc, vườn vẫn chạy');

  console.log('== Xuất file / Nhập file / Về gốc');
  await py(KB + `os.environ["KB_TEST_FIX_OUT"] = "${OUT}"
if os.path.exists("${OUT}"): os.remove("${OUT}")
result = 1`);
  await js('GardenCraft.openBase({ group: "do", id: "chochin", name: "Đèn lồng giấy" }); return 1;'); await sleep(400);
  await js('document.getElementById("kb-cf-export").click(); return 1;'); await sleep(900);
  const ex = await py(KB + 'result = sorted(json.load(open("' + OUT + '"))["sua"]) if os.path.exists("' + OUT + '") else None');
  ok(ex && ['do:chochin', 'do:kazaguruma', 'thu:shiba', 'giong:ine'].every(k => ex.includes(k)), 'Xuất file mau_sua.json: ' + JSON.stringify(ex));
  await js('document.getElementById("kb-cf-revert").click(); return 1;'); await sleep(200);
  ok(await js('return GardenCraft._state().px === ' + JSON.stringify(goc.join('')) + ';'), 'Về gốc: lưới về đúng hình trong bản add-on (chưa lưu)');
  await js('document.getElementById("kb-cf-save").click(); return 1;'); await sleep(1200);
  const f3 = await local();
  ok(!f3['do:chochin'] && await js('return GardenHome._lib().SPR.chochin.join("|") === ' + JSON.stringify(goc.join('|')) + ';'), 'Lưu sau Về gốc → bỏ bản sửa, đèn lồng như gốc');
  const bench = await js('return GardenHome._lib().SPR.bench.slice();');
  const benchNew = ['k'.repeat(bench[0].length)].concat(bench.slice(1));
  await py(KB + `json.dump({"v": 1, "sua": {"do:bench": {"spr": ${JSON.stringify(benchNew)}}}}, open("${IN}", "w"))
os.environ["KB_TEST_FIX_IN"] = "${IN}"
result = 1`);
  await js('GardenCraft.openBase({ group: "do", id: "bench", name: "Ghế gỗ" }); return 1;'); await sleep(300);
  await js('document.getElementById("kb-cf-import").click(); return 1;'); await sleep(1000);
  ok(await js('return GardenHome._lib().SPR.bench[0] === ' + JSON.stringify(benchNew[0]) + ';') && !!(await local())['do:bench'], 'Nhập file người khác gửi → hình đổi, gộp vào bản sửa của máy');
  await js('if (GardenCraft.isOpen()) { document.getElementById("kb-cf-cancel").click(); } return 1;'); await sleep(200);

  console.log('== người dùng thường: Góp ý hình (vườn không đổi)');
  const local0 = await local();
  await py(KB + `if os.path.exists(kb.ADMIN_FILE): os.remove(kb.ADMIN_FILE)
kb.save_config(admin=True)
st.buy("chochin")
os.environ["KB_TEST_FIX_OUT"] = "${OUT}"
if os.path.exists("${OUT}"): os.remove("${OUT}")
result = 1`);
  await reopen();
  ok(await js('return GardenHome._lib().SPR.chochin.join("|") === ' + JSON.stringify(goc.join('|')) + ' && GardenHome._lib().SPR.bench.join("|") === ' + JSON.stringify(bench.join('|')) + ';') && !!local0['do:bench'],
    'bỏ file admin: vườn về hình gốc, bản sửa của máy (ghế gỗ) còn trong file nhưng không áp');
  await js('document.getElementById("kb-house").click(); return 1;'); await sleep(700);
  await js('GardenHome.setTab("yard"); return 1;'); await sleep(400);
  const gy = await js(`const cards = [...document.querySelectorAll("#kb-h-list .kb-h-card")], btn = (re) => { const c = cards.find(x => re.test(x.textContent)); const b = c && c.querySelector(".kb-h-fix"); return b ? b.textContent : ""; };
    return { lamp: btn(/Đèn lồng giấy/), stone: btn(/Đèn đá/), sua: [...document.querySelectorAll(".kb-h-fix")].filter(b => b.textContent === "Sửa hình").length };`);
  ok(gy.lamp === 'Góp ý hình' && gy.stone === '' && gy.sua === 0,
    'config "admin": true không còn tác dụng; món đang có (đèn lồng) có "Góp ý hình", món chưa có (đèn đá) không có nút: ' + JSON.stringify(gy));
  ok(await cardFix('yard', '/Đèn lồng giấy/'), 'bấm "Góp ý hình"'); await sleep(500);
  const gs2 = await js(`const s = GardenCraft._state(); return { suggest: s.suggest, title: document.querySelector("#kb-craft .kb-g-title").textContent,
    save: document.getElementById("kb-cf-save").textContent, tip: document.getElementById("kb-cf-tip").textContent,
    hidden: ["kb-cf-export", "kb-cf-import"].map(id => document.getElementById(id).hidden), revert: !document.getElementById("kb-cf-revert").hidden };`);
  ok(gs2.suggest && gs2.title === '工房 · Góp ý hình' && gs2.save === 'Lưu file góp ý' && gs2.tip === 'Góp ý hình · Đèn lồng giấy' && gs2.hidden.every(Boolean) && gs2.revert,
    'Xưởng "Góp ý hình": nút "Lưu file góp ý", không có Xuất / Nhập file: ' + JSON.stringify(gs2));
  await page.shot(SHOTS + '/1255_02_gop_y_hinh.png');
  await js('document.getElementById("kb-cf-save").click(); return 1;'); await sleep(300);
  ok(await js('return GardenCraft.isOpen() && document.getElementById("kb-cf-tip").textContent === "Chưa sửa gì.";'), 'chưa vẽ gì mà bấm lưu → "Chưa sửa gì."');
  await paint(0, 0, 'k');
  await js('document.getElementById("kb-cf-save").click(); return 1;'); await sleep(1200);
  const gf = await py(KB + 'result = [json.load(open("' + OUT + '")) if os.path.exists("' + OUT + '") else None, kb.mau.read(kb.MAU_LOCAL)["sua"]]');
  ok(gf[0] && Object.keys(gf[0].sua).join() === 'do:chochin' && gf[0].sua['do:chochin'].spr[0][0] === 'k' && JSON.stringify(gf[1]) === JSON.stringify(local0),
    'lưu file góp ý chỉ có hình vừa sửa; không ghi bản sửa của máy');
  ok(await js('return !GardenCraft.isOpen() && GardenHome._lib().SPR.chochin.join("|") === ' + JSON.stringify(goc.join('|')) + ';'), 'Xưởng đóng, đèn lồng trong vườn vẫn như gốc');
  await py(KB + `open(kb.ADMIN_FILE, "w").close()
os.environ["KB_TEST_FIX_IN"] = "${OUT}"
result = 1`);
  await reopen();
  await js('GardenCraft.openBase({ group: "do", id: "chochin", name: "Đèn lồng giấy" }); return 1;'); await sleep(300);
  await js('document.getElementById("kb-cf-import").click(); return 1;'); await sleep(1000);
  ok(await js('return GardenHome._lib().SPR.chochin[0][0] === "k";') && !!(await local())['do:chochin'],
    'máy admin Nhập file góp ý → đèn lồng đổi, vào bản sửa của máy (để Xuất file ra bản mới)');
  await js('if (GardenCraft.isOpen()) { document.getElementById("kb-cf-cancel").click(); } return 1;'); await sleep(200);
  await py(KB + 'kb.save_config(admin=False); result = 1');
  await js('GardenHome.close && GardenHome.close(); return 1;').catch(() => 0);

  console.log('== file đi kèm gói: người dùng thường nhận');
  const fence = await js('return GardenHome._lib().SPR.fence.slice();');
  const fenceNew = fence.map((r, i) => i === 0 ? 'k' + r.slice(1) : r);
  await py(KB + `kb.mau.write(kb.MAU_BUNDLED, {"v": 1, "sua": {"do:fence": {"spr": ${JSON.stringify(fenceNew)}}}})
if os.path.exists(kb.MAU_LOCAL): os.remove(kb.MAU_LOCAL)
if os.path.exists(kb.ADMIN_FILE): os.remove(kb.ADMIN_FILE)
result = 1`);
  await reopen();
  ok(await js('return GardenHome._lib().SPR.fence[0] === ' + JSON.stringify(fenceNew[0]) + ' && GardenHome._lib().SPR.chochin.join("|") === ' + JSON.stringify(goc.join('|')) + ';'), 'kotoba_batake/mau_sua.json đi kèm gói → hàng rào đổi cho cả người không bật admin');
  await js('document.getElementById("kb-house").click(); return 1;'); await sleep(700);
  await js('GardenHome.setTab("yard"); return 1;'); await sleep(400);
  ok(await js('return ![...document.querySelectorAll(".kb-h-fix")].some(b => b.textContent === "Sửa hình");'), 'không có file admin: không có nút "Sửa hình"');
  await py(KB + 'os.remove(kb.MAU_BUNDLED)\nresult = 1');

  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  const bad = errs.filter(e => !/Tunnel|403|giọng|TTS|models/i.test(e));
  ok(!bad.length, 'nhật ký lỗi không có lỗi mới' + (bad.length ? ': ' + bad.join(' | ') : ''));
  console.log('KẾT QUẢ: ' + pass + '/' + total + ' đạt');
  try { page.close(); } catch (e) { }
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI KỊCH BẢN', e && e.stack || e); process.exit(3); });
