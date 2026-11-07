// 1.16 trong Anki thật: 12 món hiếm mới (hình, cửa hàng, rương nhiệm vụ), giao diện ôn "Đêm vườn",
// vẽ cảnh nền cho vùng tự tạo (lớp 256×76, phóng to, lưu, hiện ngoài sân).
// Chạy: node e2e_116.js SHOTS
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2];
const results = []; const ok = (c, m) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m); };
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenUI !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
const W = (expr) => '(() => { ' + expr + ' })()';
const NEW = ['shika', 'kabuto', 'taikobashi', 'kitsunemen', 'pagoda', 'koto', 'yatai', 'shamisen', 'kappa', 'byobu', 'hokora', 'karesansui'];

(async () => {
  await py(KB + `st = kb.STATE
d = st.load(); d["coins"] = 40000; d["home"]["house"] = 7
d["home"]["owned"].update({"pagoda": 1, "yatai": 1, "kabuto": 1, "byobu": 1}); st.save(d)
st.place("yard", "pagoda", 6, 0); st.place("yard", "yatai", 8, 1); st.place("room", "kabuto", 0, 1); st.place("room", "byobu", 4, 2)
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  const page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(2500);
  await page.eval(W('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; if (typeof GardenPaper !== "undefined") GardenPaper.close(); return 1;'));

  console.log('== 12 món hiếm mới');
  ok(await page.eval(W(`const s = GardenHome._sprites; return ${JSON.stringify(NEW)}.every(k => Array.isArray(s[k]) && s[k].length > 8);`)), 'có hình cho cả 12 món (rare_art.js)');
  ok(await page.eval(W('return (Garden._data().catalog.items || []).filter(i => i.rare).length;')) === 18, 'danh mục: 18 món hiếm');
  await page.eval(W('document.getElementById("kb-house").click(); GardenHome.setTab("yard"); return 1;')); await sleep(900);
  const shop = await page.eval(W('const c = Array.from(document.querySelectorAll(".kb-h-card-rare")); return { n: c.length, locked: c.filter(x => x.classList.contains("kb-h-locked")).length, txt: c.map(x => x.textContent).join("|") };'));
  ok(shop.n === 10 && /Hươu Nara/.test(shop.txt) && /Tháp chùa năm tầng/.test(shop.txt), 'tab Trang trí sân: 10 món hiếm ngoài sân (3 cũ + 7 mới) có Hươu Nara, Tháp chùa');
  ok(shop.locked === 8, 'chưa có thì khoá (8 món), đã có (tháp chùa, quầy mì) thì không (' + shop.locked + ')');
  await page.shot(SHOTS + '/40_hiem_san.png');
  await page.eval(W('GardenHome.open("room"); GardenHome.setTab("room"); return 1;')); await sleep(800);
  await page.shot(SHOTS + '/41_hiem_phong.png');
  await page.eval(W('GardenHome.close(); return 1;'));
  const chest = await py(KB + `core = kb.garden_core
d = kb.STATE.load()
for k in ["koinobori", "daruma", "momiji", "furin", "tanuki", "kokeshi"]: d["home"]["owned"][k] = 1
nxt = core.quest_view(d)["next_rare"]
d["quest"] = {"day": 1, "list": [{"id": "a", "kind": "rev", "target": 1, "reward": 20, "text": "x"}], "progress": {"rev": 1}, "done": [], "chest": False, "chest_item": None}
res = core._settle_quests(d)
result = [nxt and nxt["name"], res["chest"]["id"]]`);
  ok(chest[0] === 'Hươu Nara' && chest[1] === 'shika', 'đủ 6 món cũ → rương kế tiếp tặng “Hươu Nara” (' + chest.join(', ') + ')');

  // 1.23: bỏ giao diện ôn “Đêm vườn” (người dùng thấy không đẹp) — kiểm ở e2e_114.js / e2e_123.js

  // bảng chọn Trò chơi: 1.17 trở lại kiểu 1.15 + drop-down → kiểm ở e2e_117.js

  console.log('== vẽ cảnh nền cho vùng tự tạo');
  const c0 = await py(KB + 'result = kb.STATE.load()["coins"]');
  await page.eval(W('document.getElementById("kb-house").click(); GardenHome.setTab("zone"); return 1;')); await sleep(700);
  await page.eval(W('Array.from(document.querySelectorAll("#kb-h-list button")).find(x => /Mở xưởng vùng/.test(x.textContent)).click(); return 1;')); await sleep(900);
  ok(await page.eval(W('return document.querySelector("#kb-craft .kb-craft-top").offsetHeight < 45;')), 'hàng trên của Xưởng vùng nằm gọn một dòng');
  await page.eval(W('document.querySelector(\'#kb-craft [data-layer="env"]\').click(); return 1;')); await sleep(500);
  const lay = await page.eval(W('const s = GardenCraft._state(); const st = document.getElementById("kb-cf-grid").parentNode; return { layer: s.layer, gw: s.gw, gh: s.gh, zoom: s.zoom, scroll: st.scrollWidth > st.clientWidth };'));
  ok(lay.layer === 'env' && lay.gw === 256 && lay.gh === 76, 'lớp “Cảnh nền”: lưới 256×76');
  ok(lay.zoom === 2 && lay.scroll, 'tự phóng to ×2, khung vẽ cuộn ngang được');
  await page.eval(W(`const cv = document.getElementById("kb-cf-grid"), r = cv.getBoundingClientRect(), cell = GardenCraft._state().cell;
    const ev = (t, x, y, ex) => cv.dispatchEvent(new PointerEvent(t, Object.assign({ clientX: r.left + (x + 0.5) * cell, clientY: r.top + (y + 0.5) * cell, bubbles: true, button: 0, pointerId: 1 }, ex || {})));
    document.querySelector('#kb-cf-pal [data-c="r"]').click(); document.querySelector('#kb-craft [data-tool="rect"]').click();
    ev("pointerdown", 100, 50); ev("pointermove", 140, 60, { shiftKey: true }); ev("pointerup", 140, 60); return 1;`));
  ok(await page.eval(W('return GardenCraft._state().env.length > 0 && GardenCraft._state().gw === 256;')), 'vẽ được trên lớp cảnh nền');
  await page.eval(W('document.querySelector(\'#kb-craft [data-zoom="1"]\').click(); return 1;')); await sleep(300);
  ok(await page.eval(W('return GardenCraft._state().zoom === 3;')), 'nút + phóng to ×3');
  await page.eval(W('document.querySelector(\'#kb-craft [data-layer="lm"]\').click(); return 1;')); await sleep(300);
  ok(await page.eval(W('const s = GardenCraft._state(); return s.layer === "lm" && s.gw === 64 && s.env.length > 0;')), 'về lớp Công trình 64×76, cảnh nền vừa vẽ vẫn còn');
  await page.eval(W('document.querySelector(\'#kb-craft [data-layer="env"]\').click(); return 1;')); await sleep(400);
  await page.shot(SHOTS + '/45_ve_canh_nen.png');
  await page.eval(W('document.getElementById("kb-cf-name").value = "Đồi đỏ"; document.getElementById("kb-cf-name").dispatchEvent(new Event("input")); document.getElementById("kb-cf-save").click(); return 1;'));
  await sleep(1500);
  const saved = await py(KB + `c = mw.col.get_config(kb.garden_core.MORE_KEY)
result = [kb.STATE.load()["coins"], list((c.get("zenv") or {}).keys()), [z["id"] for z in c["zones"]]]`);
  ok(saved[0] === c0 - 5000 && saved[1].length === 1 && saved[1][0] === saved[2][saved[2].length - 1], 'tạo vùng −5.000 xu, cảnh nền lưu ở khoá zenv (' + JSON.stringify(saved) + ')');
  await page.eval(W('GardenHome.close(); return 1;')); await sleep(400);
  const zid = saved[1][0];
  for (let i = 0; i < 6; i++) {
    if (await page.eval(W('return GardenHome.mainScene();')) === zid) break;
    await page.eval(W('document.getElementById("kb-yard-next").click(); return 1;')); await sleep(700);
  }
  await sleep(800);
  const px = await page.eval(W(`const v = GardenHome._mainView(), cv = document.getElementById("kb-yard"), g = cv.getContext("2d");
    const d = g.getImageData(Math.round((v.ox + 120) * v.S), Math.round(55 * v.S), 1, 1).data; return [GardenHome.mainScene(), d[0], d[1], d[2]];`));
  ok(px[0] === zid && px[1] > px[2] + 40 && px[1] > px[3] + 20, 'màn chính: vùng mới hiện đúng mảng đỏ vừa vẽ ở cảnh nền (rgb ' + px.slice(1).join(',') + ')');
  await page.shot(SHOTS + '/46_canh_nen_ngoai_san.png');

  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.join(' | ').slice(0, 300) : ''));
  const errs = await py(KB + 'result = kb.ERRORS.entries()');
  ok(!errs || !errs.length, 'nhật ký lỗi add-on trống' + (errs && errs.length ? ': ' + JSON.stringify(errs).slice(0, 300) : ''));
  console.log('\nKẾT QUẢ: ' + results.filter(Boolean).length + '/' + results.length + ' đạt');
  page.close(); process.exit(results.every(Boolean) ? 0 : 1);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
