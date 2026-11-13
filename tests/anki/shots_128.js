// Ảnh 1.28 cho README / báo cáo (không phải test): bộ thẻ mẫu (setup_demo.sh), nhà xây xong, 6 vùng, đồ mới của 1.28.
//   a: chỗ lấp lánh ở Bãi biển · b: thẻ "Nhặt được!" · c: Album → Hộp sưu tầm · d: gánh hàng rong ở Ga + bảng hàng
//   e: đồ mới ngoài sân ban đêm (đèn cá vàng, đèn ống tre, đèn kéo quân…) · f: trong nhà (tủ kính, chuông vỏ sò, đồng hồ…)
// Chạy: ANKI_PY=… setup_demo.sh BASE ADDON && run_anki.sh BASE 9333 LOG & ; node shots_128.js OUT
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = path.resolve(process.argv[2] || '/tmp/kb_shots_128');
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl);
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenFinds !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function shot(name) {
  await js('const t = document.getElementById("kb-toast"); if (t) { t.hidden = true; } document.querySelectorAll(".kb-bubble, #kb-bubble").forEach((b) => { b.hidden = true; }); return 1;').catch(() => 0);
  await sleep(250); await page.shot(path.join(OUT, name + '.png')); console.log('  ảnh', name);
}
const SETUP = KB + `
d = st.load(); d["coins"] = 100000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
for z in kb.core.ZONE_IDS:
    st.unlock_zone(z)
yard = [("sakura", 4, 0), ("lantern", 7, 0), ("bonsai", 12, 0), ("flowers", 4, 1), ("bench", 6, 1), ("well", 13, 1),
        ("mailbox", 4, 2), ("pond", 10, 2), ("fountain", 13, 2)]
room = [("painting", 1, 0), ("shelf", 0, 1), ("rug", 4, 2), ("kotatsu", 4, 2), ("plant", 9, 1), ("cat", 7, 3)]
for scene, items in (("yard", yard), ("room", room)):
    for iid, x, y in items:
        st.buy(iid); st.place(scene, iid, x, y)
st.pet_buy("neko")
# đồ mới của 1.28: quà đủ bộ + món gánh hàng rong
for iid in kb.core.FIND_ITEMS:
    st.find_reward(0, iid)
for scene, iid, x, y in [("yard", "kingyochochin", 8, 0), ("yard", "takeakari", 10, 0), ("yard", "denkeoquan", 15, 0),
                         ("yard", "mikujikake", 8, 1), ("yard", "posuto", 11, 1), ("yard", "hoagiay", 15, 1), ("yard", "luunuoc", 9, 1),
                         ("yard", "mushikago", 8, 2), ("onsen", "ashiyu", 6, 2),
                         ("room", "tukinh", 1, 1), ("room", "kaifurin", 2, 0), ("room", "dongholac", 8, 0), ("room", "nonla", 6, 0),
                         ("room", "binhgom", 2, 1), ("room", "tetsubin", 3, 3)]:
    try:
        st.place(scene, iid, x, y)
    except Exception as e:
        print("place", iid, e)
# lượt ôn hôm nay (như ôn trên điện thoại) → 3 chỗ lấp lánh; vài món đã nhặt
col = mw.col
cids = col.db.list("select id from cards order by id limit 40")
start = kb.core.ngay.days_of(col).rel_start(0) * 1000
for i in range(32):
    col.db.execute("insert into revlog(id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", start + 5000 + i * 41, cids[i % len(cids)], -7, 3, 10, 5, 2500, 1000, 1)
ev = kb.finds.clean(None)
for fid in ["koishi", "hane", "biidama", "yotsuba", "kaigara", "hitode", "omamori", "suzu", "emafuda", "kippu", "kitte",
            "yoyofusen", "uchiwa", "taketonbo", "tentoumushi", "onsentamago", "gyunyubin"]:
    ev["found"][fid] = {"d": "2026-11-0%d" % (1 + len(ev["found"]) % 9), "n": 1}
ev["sets"] = {"yard": "2026-11-08"}
for fid in kb.finds.BY_SCENE["yard"]:
    ev["found"].setdefault(fid, {"d": "2026-11-08", "n": 1})
kb.EVENTS.save(ev)
kb.cal_today = (lambda: datetime.date(2026, 11, 15))      # Chủ nhật: có phiên gánh hàng
kb.save_config(show_tooltips=False, sound=False, music=False, ui={"greet": "off", "trans": "off"})
result = 1
`;
(async () => {
  await py(SETUP);
  await py(KB + 'kb._dialog.close() if kb._dialog else None\nkb.open_garden()\nresult = 1');
  page = await gardenPage();
  await py(KB + 'kb._dialog.resize(1280, 800)\nresult = 1');
  await sleep(1500);
  const sky = (h) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "sunny"); return 1;`).catch(() => 0);
  await sky(10);
  const sc = await js('return Garden._data().finds.spots.map((s) => s.scene);');
  console.log('chỗ lấp lánh:', sc.join(', '));
  await js('GardenHome.showMain(Garden._data().finds.spots[0].scene); return 1;'); await sleep(1500);
  await shot('128_a_lap_lanh');
  const ok = await js(`const v = GardenHome._mainView(), cv = document.getElementById("kb-yard"), h = GardenFinds._hits(GardenHome.mainScene()).find((x) => x.kind === "spot");
    if (!h) return false; const r = cv.getBoundingClientRect();
    const ev = new MouseEvent("click", {bubbles: true, clientX: r.left + (h.box.x + 7 + v.ox) * v.S, clientY: r.top + (h.box.y + 8 + (v.oy || 0)) * v.S});
    cv.dispatchEvent(ev); return true;`);
  await sleep(1200);
  if (ok) { await shot('128_b_nhat_duoc'); }
  await js('GardenHome.openBox(); return 1;'); await sleep(900);
  await js('const L = document.getElementById("kb-h-list"); L.scrollTop = 0; return 1;'); await sleep(300);
  await shot('128_c_hop_suu_tam');
  await js('GardenHome.close(); return 1;'); await sleep(500);
  await js('GardenHome.showMain("station"); return 1;'); await sleep(1500);
  await shot('128_d0_ganh_hang_ga');
  await js(`const v = GardenHome._mainView(), cv = document.getElementById("kb-yard"), h = GardenFinds._hits("station").find((x) => x.kind === "ped");
    const r = cv.getBoundingClientRect();
    cv.dispatchEvent(new MouseEvent("click", {bubbles: true, clientX: r.left + (h.box.x + 15 + v.ox) * v.S, clientY: r.top + (h.box.y + 13 + (v.oy || 0)) * v.S})); return 1;`); await sleep(600);
  await shot('128_d_bang_ganh_hang');
  await js('GardenFinds.closePed(); return 1;');
  await sky(20);
  await js('GardenHome.showMain("yard"); return 1;'); await sleep(1800);
  await shot('128_e_do_moi_dem');
  await sky(10);
  await js('GardenHome.open("room"); return 1;'); await sleep(1200);
  await shot('128_f_trong_nha');
  page.close();
  process.exit(0);
})().catch((e) => { console.error(e); try { page && page.close(); } catch (x) { } process.exit(1); });
