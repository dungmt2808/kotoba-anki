// Ảnh phác 1.34 (17/11) — góp ý của người dùng về bảng ôn + ô chọn deck + trang trí thử. Chưa phải mã thật: vẽ đè lên
// vườn / bảng ôn / bảng Nhà thật của 1.33.3 (đồ "đặt thử" vẽ mờ bằng chính hàm vẽ đồ của add-on, GardenHome._lib().drawItem;
// thẻ trắc nghiệm tự lật dùng Garden.flip() thật; số thẻ của cây deck lấy từ deck_due_tree() của Anki).
// Chạy (ANKI_PY = venv aqt):
//   B=/tmp/kb_m134; ./setup_demo.sh $B ../../kotoba_batake && $ANKI_PY demo_1334.py $B/Test/collection.anki2
//   (./run_anki.sh $B 9333 $B.log &) ; node mock_134.js OUT [bước…] ; python3 mock_134_ghep.py OUT RA
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_mock_134';
const ONLY = process.argv.slice(3);
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const want = (k) => !ONLY.length || ONLY.indexOf(k) >= 0;
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
async function shot(name) { await sleep(350); await page.shot(path.join(OUT, name + '.png')); console.log('  ảnh', name); }
const size = (w, h) => py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`).then(() => sleep(900));
const deck = (name) => py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`).then(() => sleep(1500));
const sky = (h) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${h}); GardenSky.set("weather", "sunny"); return 1;`);
const hideToast = () => js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
async function startReview() { await js('document.getElementById("kb-review").click(); return 1;'); await sleep(1600); }
async function stopReview() { await js('if (!document.getElementById("kb-panel").hidden) document.getElementById("kb-stop").click(); return 1;'); await sleep(700); }
async function keyEv(key, code, vk) {
  for (const type of ['keyDown', 'keyUp']) { await page.send('Input.dispatchKeyEvent', { type, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, text: type === 'keyDown' ? key : undefined }); }
}

// ---- lớp vẽ đè dùng chung: viền đỏ đứt quãng + nhãn đỏ "mới" -------------------------------------------------------
const CSS = `
.mk-hl { outline: 3px dashed #e0544e !important; outline-offset: 3px; }
.mk-tag { position: fixed; z-index: 9999; background: #e0544e; color: #fff; font: bold 13px "Noto Sans", sans-serif; padding: 3px 8px;
  border: 2px solid #8c2a26; white-space: nowrap; pointer-events: none; box-shadow: 2px 2px 0 rgba(0,0,0,.25); }
.mk-tag.is-blue { background: #2f6fb3; border-color: #1b416b; }
.kb-rate { position: relative; }
.mk-k { position: absolute; left: 7px; top: 5px; font-size: 12px; line-height: 1; padding: 2px 5px; border: 2px solid var(--kb-ink);
  background: var(--kb-paper); color: var(--kb-ink); font-weight: 700; }
.mk-zoom .kb-bar { display: none !important; }
.mk-zoom #kb-app > *:not(#kb-panel) { display: none !important; }
.mk-zoom .kb-panel { padding: 6px 8px 8px; gap: 6px; border-width: 3px; box-shadow: none; }
.mk-zoom .kb-panel-top { height: 32px; }
.mk-zoom .kb-pot { width: 58px; height: 32px; border-width: 2px; }
.mk-zoom .kb-pot-info { font-size: 13px; }
.mk-zoom .kb-card { height: calc(100vh - 134px) !important; }
html.mk-zoom { overflow: hidden; }
.mk-zoom .kb-actions, .mk-zoom .kb-actions-main > .kb-btn-wide, .mk-zoom .kb-ratings .kb-rate, .mk-zoom .kb-rv-edit { min-height: 46px; height: 46px; }
.mk-zoom body, body.mk-zoom { padding-top: 0; }
.mk-tree { position: fixed; z-index: 70; width: 440px; padding: 8px; display: flex; flex-direction: column; gap: 6px; font-size: 14px;
  line-height: 1.35; background: var(--kb-cream); border: 3px solid var(--kb-ink); box-shadow: 4px 4px 0 var(--kb-ink); }
.mk-tree-list { border: 2px solid var(--kb-ink); background: var(--kb-paper); max-height: 470px; overflow: hidden; }
.mk-row { display: flex; align-items: center; gap: 4px; padding: 3px 8px 3px 4px; border-bottom: 1px dashed var(--kb-line-2); white-space: nowrap; }
.mk-row.is-head { font-size: 12px; color: var(--kb-ink-3); background: var(--kb-off-2); border-bottom: 2px solid var(--kb-line); }
.mk-row.is-cur { background: #ffd23f; font-weight: 700; }
.mk-tog { width: 16px; flex: none; text-align: center; color: var(--kb-ink-2); font-size: 11px; }
.mk-name { flex: 1 1 auto; overflow: hidden; text-overflow: ellipsis; }
.mk-path { color: var(--kb-ink-3); font-weight: 400; }
.mk-n { width: 34px; flex: none; text-align: right; font-variant-numeric: tabular-nums; }
.mk-n.c0 { color: #1f5faf; } .mk-n.c1 { color: #c21f3a; } .mk-n.c2 { color: #1f7a3a; } .mk-n.z { color: #c9b8a6; }
.mk-deckbtn { display: inline-flex; align-items: center; gap: 6px; max-width: 330px; padding: 3px 8px; border: 2px solid var(--kb-ink);
  background: var(--kb-butter); color: var(--kb-ink); font: inherit; font-size: 14px; white-space: nowrap; cursor: pointer; }
.mk-deckbtn .mk-path { overflow: hidden; text-overflow: ellipsis; }
.mk-deckbtn b { flex: none; }
.mk-deckbtn .mk-car { flex: none; font-size: 11px; margin-left: 2px; }
.mk-try-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; padding: 6px 10px; background: #fff3c4;
  border: 3px solid var(--kb-ink); box-shadow: 3px 3px 0 var(--kb-ink); font-size: 14px; }
.mk-try-bar b { font-size: 15px; }
.mk-try-bar .mk-sp { flex: 1 1 auto; }
.mk-slot { padding: 2px 9px !important; font-size: 13px !important; }
.mk-slot.is-on { background: #ffd23f !important; }
.mk-trytag { display: inline-block; margin-left: 6px; padding: 0 5px; font-size: 11px; border: 2px dashed #b07a1a; background: #fff3c4; color: #7a4a00; }
.mk-ghostcv { position: absolute; pointer-events: none; image-rendering: pixelated; }
`;
const ensureCss = () => js(`if (!document.getElementById("mk134-css")) { const s = document.createElement("style"); s.id = "mk134-css"; s.textContent = ${JSON.stringify(CSS)}; document.head.appendChild(s); } return 1;`);
// nhãn đỏ cạnh phần tử: side "top" | "bottom" | "left" | "right"
async function tag(sel, text, side, opts) {
  await js(`const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 0;
    ${opts && opts.hl === false ? '' : 'e.classList.add("mk-hl");'}
    const r = e.getBoundingClientRect(), t = document.createElement("div"); t.className = "mk-tag mk-x" + (${JSON.stringify((opts && opts.cls) || '')} ? " " + ${JSON.stringify((opts && opts.cls) || '')} : "");
    t.textContent = ${JSON.stringify(text)}; document.body.appendChild(t);
    const w = t.offsetWidth, h = t.offsetHeight, side = ${JSON.stringify(side || 'top')}, dx = ${(opts && opts.dx) || 0}, dy = ${(opts && opts.dy) || 0};
    let x = r.left, y = r.top - h - 8;
    if (side === "bottom") { y = r.bottom + 8; }
    if (side === "left") { x = r.left - w - 10; y = r.top + (r.height - h) / 2; }
    if (side === "right") { x = r.right + 10; y = r.top + (r.height - h) / 2; }
    if (side === "inside") { x = r.left + 8; y = r.top + 8; }
    x = Math.max(4, Math.min(innerWidth - w - 4, x + dx)); y = Math.max(4, Math.min(innerHeight - h - 4, y + dy));
    t.style.left = x + "px"; t.style.top = y + "px"; return 1;`);
}
const resetMk = () => js('["mk-replay", "mk-zoom"].forEach((i) => { const e = document.getElementById(i); if (e) e.remove(); }); document.querySelectorAll(".mk-k").forEach((e) => e.remove()); return 1;');
const clearMk = () => js('document.querySelectorAll(".mk-x").forEach((e) => e.remove()); document.querySelectorAll(".mk-hl").forEach((e) => e.classList.remove("mk-hl")); return 1;');

async function setup() {
  await py(KB + `d = st.load(); d["coins"] = 200000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
yard = [("sakura", 4, 0), ("lantern", 7, 0), ("bonsai", 12, 0), ("flowers", 4, 1), ("bench", 6, 1), ("well", 13, 1), ("mailbox", 4, 2), ("pond", 6, 2)]
room = [("painting", 1, 0), ("clock", 7, 0), ("shelf", 0, 1), ("plant", 9, 1), ("rug", 4, 2), ("kotatsu", 4, 2)]
for _ in range(3):
    try:
        st.open_rooms()
    except Exception:
        pass
for scene, items in (("yard", yard), ("room", room)):
    for iid, x, y in items:
        try:
            st.buy(iid); st.place(scene, iid, x, y)
        except Exception:
            pass
try:
    st.pet_buy("neko")
except Exception:
    pass
d = st.load(); d["coins"] = 3420; st.save(d)
kb.ASK_TEST_OFF = False
kb.save_config(show_tooltips=False, sound=False, music=False)
kb.open_garden(); result = 1`);
  await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await size(1366, 860);
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); return 1;');
  await sky(10); await sleep(1200);
}

// ---------------------------------------------------------------------------------------------------------------------
async function stepPhim() {
  await size(1366, 860);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await js('GardenUI.setGlob("card", "normal"); return 1;');
  await startReview(); await ensureCss();
  await keyEv(' ', 'Space', 32); await sleep(1200);            // lật: mặt sau có 4 nút chấm
  await js(`document.querySelectorAll(".kb-rate").forEach((b, i) => { if (!b.querySelector(".mk-k")) { const k = document.createElement("span"); k.className = "mk-k"; k.textContent = String(i + 1); b.appendChild(k); } });
    const top = document.querySelector(".kb-panel-top"), g = document.getElementById("kb-rv-garden");
    if (!document.getElementById("mk-replay")) {
      const r = document.createElement("button"); r.type = "button"; r.id = "mk-replay"; r.className = "kb-btn kb-btn-small";
      r.innerHTML = '<i class="kb-pi kb-pi-speaker" aria-hidden="true"></i>Nghe lại <span class="kb-key">R</span>'; top.insertBefore(r, g);
      const z = document.createElement("button"); z.type = "button"; z.id = "mk-zoom"; z.className = "kb-btn kb-btn-small";
      z.innerHTML = 'Phóng to <span class="kb-key">F</span>'; top.insertBefore(z, g.nextSibling);
    }
    return 1;`);
  await sleep(300);
  await tag('.kb-ratings', 'Phím 1 · 2 · 3 · 4 ghi ngay trên nút (phím đã chạy, chỉ là chưa ghi)', 'top', { dy: -2 });
  await tag('#mk-replay', 'mới: phát lại âm thanh của thẻ', 'bottom', { dx: -120 });
  await tag('#mk-zoom', 'mới: chỉ còn thẻ + nút chấm', 'bottom', { dx: -60, dy: 34 });
  await hideToast(); await shot('raw_phim');
  await clearMk(); await stopReview();
}

async function stepTuLat() {
  await size(1366, 860); await resetMk();
  await deck('Tiếng Nhật::Trắc nghiệm');
  await startReview(); await ensureCss();
  await hideToast(); await shot('raw_tl1');
  // bấm chuột thật vào đáp án B: mẫu thẻ gọi pycmd("ans") — bản 1.33.3 không làm gì; 1.34 sẽ lật như Anki (giả lập bằng Garden.flip)
  const box = await js(`const f = document.getElementById("kb-card"), r = f.getBoundingClientRect(), e = f.contentDocument.querySelectorAll(".mc-opt")[1];
    const b = e.getBoundingClientRect(); return [r.x + b.x + b.width / 2, r.y + b.y + b.height / 2];`);
  for (const type of ['mousePressed', 'mouseReleased']) { await page.send('Input.dispatchMouseEvent', { type, x: box[0], y: box[1], button: 'left', clickCount: 1 }); }
  await sleep(900);
  const flipped = await js('return !document.getElementById("kb-ratings").hidden;');
  console.log('  1.33.3 tự lật sau khi bấm đáp án:', flipped);
  await hideToast(); await shot('raw_tl_cu');
  await js('Garden.flip(); return 1;'); await sleep(1300);
  await tag('#kb-card-wrap', 'Mẫu thẻ tự lật (bấm đáp án → lật luôn), không cần bấm "Lật thẻ"', 'inside', { hl: false });
  await hideToast(); await shot('raw_tl2');
  await clearMk(); await stopReview();
}

async function stepPhongTo() {
  await size(1366, 860); await resetMk();
  await deck('Ôn thi::JLPT N4::Đọc hiểu');
  await startReview(); await ensureCss();
  await js(`const top = document.querySelector(".kb-panel-top"), g = document.getElementById("kb-rv-garden");
    if (!document.getElementById("mk-zoom")) { const z = document.createElement("button"); z.type = "button"; z.id = "mk-zoom"; z.className = "kb-btn kb-btn-small";
      z.innerHTML = 'Phóng to <span class="kb-key">F</span>'; top.insertBefore(z, g.nextSibling); } return 1;`);
  await hideToast(); await shot('raw_pt1');
  await js(`document.getElementById("kb-app").classList.add("mk-zoom"); document.body.classList.add("mk-zoom"); document.documentElement.classList.add("mk-zoom"); window.scrollTo(0, 0);
    document.getElementById("mk-zoom").innerHTML = 'Thu nhỏ <span class="kb-key">F</span>'; window.dispatchEvent(new Event("resize")); return 1;`);
  await sleep(500);
  await tag('#mk-zoom', 'F hoặc Esc: về như cũ', 'bottom', { dx: -90 });
  await hideToast(); await shot('raw_pt2');
  // phóng to + F11 (toàn màn hình)
  await clearMk();
  await js(`document.getElementById("kb-app").classList.remove("mk-zoom"); document.body.classList.remove("mk-zoom"); document.documentElement.classList.remove("mk-zoom"); return 1;`);
  await stopReview();
}

async function stepAnHien() {
  await resetMk(); await size(1600, 1000);
  await deck('Tiếng Nhật::N5 · Từ vựng');
  await js('GardenUI.setGlob("card", "normal"); return 1;'); await sleep(400);
  await startReview();
  const st = () => js('const y = document.getElementById("kb-yard-wrap"); return { card: document.getElementById("kb-card").clientHeight, yardTop: Math.round(y.getBoundingClientRect().top), vh: innerHeight, cfg: GardenUI.glob("card") };');
  await hideToast(); console.log('  trước', await st()); await shot('raw_ah1');
  await js('document.getElementById("kb-rv-garden").click(); return 1;'); await sleep(900);
  console.log('  ẩn', await st()); await shot('raw_ah2');
  await js('document.getElementById("kb-rv-garden").click(); return 1;'); await sleep(900);
  console.log('  hiện lại (1.33.3)', await st()); await shot('raw_ah3');
  // 1.34: Hiện vườn trả đúng cỡ khung thẻ lúc trước khi ẩn
  await js('GardenUI.setGlob("card", "normal"); return 1;'); await sleep(700);
  console.log('  hiện lại (1.34)', await st()); await shot('raw_ah4');
  await stopReview();
  await size(1366, 860);
}

// ---- ô chọn deck dạng cây ------------------------------------------------------------------------------------------
async function deckTree() {
  return py(KB + `out = []
def walk(n, depth, path):
    for c in n.children:
        name = c.name
        full = (path + "::" + name) if path else name
        out.append({"id": c.deck_id, "name": name, "full": full, "depth": depth, "kids": len(c.children) > 0,
                    "n": [c.new_count, c.learn_count, c.review_count], "col": bool(c.collapsed)})
        walk(c, depth + 1, full)
walk(mw.col.sched.deck_due_tree(), 0, "")
result = out`);
}
const DECK_JS = `
window.MK_DECK = function (tree, opts) {
  document.querySelectorAll(".mk-tree").forEach((e) => e.remove());
  const lab = document.querySelector(".kb-deck"), sel = document.getElementById("kb-deck"), find = document.getElementById("kb-deck-find");
  sel.style.display = "none"; find.style.display = "none";
  let btn = document.querySelector(".mk-deckbtn");
  const cur = tree.find((d) => d.full === opts.cur) || tree[0];
  if (!btn) { btn = document.createElement("button"); btn.type = "button"; btn.className = "mk-deckbtn"; lab.appendChild(btn); }
  const parts = cur.full.split("::");
  btn.innerHTML = "";
  if (parts.length > 1) { const p = document.createElement("span"); p.className = "mk-path"; p.textContent = parts.slice(0, -1).join(" › ") + " ›"; btn.appendChild(p); }
  const b = document.createElement("b"); b.textContent = parts[parts.length - 1]; btn.appendChild(b);
  const car = document.createElement("span"); car.className = "mk-car"; car.textContent = "▾"; btn.appendChild(car);
  btn.title = cur.full;
  if (!opts.open) { return 1; }
  const pop = document.createElement("div"); pop.className = "mk-tree"; document.body.appendChild(pop);
  const q = document.createElement("input"); q.className = "kb-deck-q"; q.placeholder = "Tìm deck… (vd. n4 bai 17)"; q.value = opts.q || ""; pop.appendChild(q);
  const list = document.createElement("div"); list.className = "mk-tree-list"; pop.appendChild(list);
  const row = (cls) => { const r = document.createElement("div"); r.className = "mk-row " + (cls || ""); list.appendChild(r); return r; };
  const h = row("is-head");
  h.innerHTML = '<span class="mk-tog"></span><span class="mk-name">Deck</span><span class="mk-n">Mới</span><span class="mk-n">Học</span><span class="mk-n">Ôn</span>';
  const nums = (r, n) => n.forEach((v, i) => { const s = document.createElement("span"); s.className = "mk-n c" + i + (v ? "" : " z"); s.textContent = String(v); r.appendChild(s); });
  const norm = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").replace(/đ/g, "d").replace(/::/g, " ");
  if (opts.q) {
    const terms = norm(opts.q).split(/\\s+/).filter(Boolean);
    const ph = norm(opts.q).trim().replace(/\s+/g, " ");
    let hits = tree.filter((d) => terms.every((t) => norm(d.full).indexOf(t) >= 0));
    hits = hits.filter((d) => norm(d.full).replace(/\s+/g, " ").indexOf(ph) >= 0).concat(hits.filter((d) => norm(d.full).replace(/\s+/g, " ").indexOf(ph) < 0));
    hits.forEach((d, i) => {
      const r = row(i === 0 ? "is-cur" : ""), parts = d.full.split("::");
      r.innerHTML = '<span class="mk-tog"></span>';
      const nm = document.createElement("span"); nm.className = "mk-name";
      if (parts.length > 1) { const p = document.createElement("span"); p.className = "mk-path"; p.textContent = parts.slice(0, -1).join(" › ") + " › "; nm.appendChild(p); }
      nm.appendChild(document.createTextNode(parts[parts.length - 1])); r.appendChild(nm); nums(r, d.n);
    });
  } else {
    const open = new Set(opts.open === true ? [] : opts.open);
    let hideBelow = null;
    tree.forEach((d) => {
      if (hideBelow !== null) { if (d.depth > hideBelow) { return; } hideBelow = null; }
      const isOpen = d.kids && open.has(d.full);
      const r = row(d.full === cur.full ? "is-cur" : "");
      r.style.paddingLeft = (4 + d.depth * 18) + "px";
      const tg = document.createElement("span"); tg.className = "mk-tog"; tg.textContent = d.kids ? (isOpen ? "▾" : "▸") : ""; r.appendChild(tg);
      const nm = document.createElement("span"); nm.className = "mk-name"; nm.textContent = d.name + (d.full === cur.full ? "  · đang xem" : ""); r.appendChild(nm);
      nums(r, d.n);
      if (d.kids && !isOpen) { hideBelow = d.depth; }
    });
  }
  const foot = document.createElement("div"); foot.className = "kb-deck-foot";
  foot.textContent = opts.q ? "↑ ↓ chọn · Enter mở · Esc đóng" : "↑ ↓ chọn · ← → đóng / mở nhánh · Enter mở · Esc đóng";
  pop.appendChild(foot);
  const r = btn.getBoundingClientRect(); pop.style.left = Math.max(8, r.left - 4) + "px"; pop.style.top = (r.bottom + 8) + "px";
  return 1;
};`;
async function stepDeck() {
  await size(1366, 860);
  await js('if (GardenHome.isOpen()) GardenHome.close(); const g = document.getElementById("mk-ghost"); if (g) g.remove(); return 1;'); await sleep(600);
  await deck('Tiếng Nhật::N4::Bài 17');
  await ensureCss();
  const tree = await deckTree();
  await page.eval(DECK_JS + '; 1');
  await hideToast();
  await shot('raw_deck_cu');                                   // ô Deck hiện tại (danh sách phẳng của trình duyệt chụp không được → ghép ở bước ghép)
  const flat = await js('return Array.from(document.getElementById("kb-deck").options).map((o) => o.textContent);');
  fs.writeFileSync(path.join(OUT, 'deck_cu.json'), JSON.stringify(flat));
  await js(`MK_DECK(${JSON.stringify(tree)}, { cur: "Tiếng Nhật::N4::Bài 17", open: ["Tiếng Nhật", "Tiếng Nhật::N4"] }); return 1;`);
  await sleep(300);
  await tag('.mk-tree', 'mới: ô Deck gọn, bấm mở cây deck như Anki', 'right', { hl: false, dy: -60 });
  await tag('.mk-tree', 'deck con thu gọn / mở (▸ ▾) · số thẻ Mới / Học / Ôn', 'right', { hl: false, dy: -26 });
  await tag('.mk-tree', 'gõ chữ là tìm (không cần nút kính lúp)', 'right', { hl: false, dy: 8 });
  await js('document.querySelector(".mk-deckbtn").classList.add("mk-hl"); return 1;');
  await shot('raw_deck1');
  await clearMk();
  await js(`MK_DECK(${JSON.stringify(tree)}, { cur: "Tiếng Nhật::N4::Bài 17", open: true, q: "bai 1" }); return 1;`);
  await sleep(300);
  await shot('raw_deck2');
  await js('document.querySelectorAll(".mk-tree").forEach((e) => e.remove()); return 1;');
}

// ---- trang trí thử -------------------------------------------------------------------------------------------------
const GHOST_JS = `
window.MK_GHOST = function (items) {
  const L = GardenHome._lib(), cv = document.getElementById("kb-home-canvas"), area = cv.parentNode;
  let g = document.getElementById("mk-ghost");
  if (!g) { g = document.createElement("canvas"); g.id = "mk-ghost"; g.className = "mk-ghostcv mk-x"; area.appendChild(g); }
  const sc = items.scene, S = Math.round(cv.getBoundingClientRect().width / items.sw);
  const ar = area.getBoundingClientRect(), cr = cv.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  g.width = cr.width * dpr; g.height = cr.height * dpr; g.style.width = cr.width + "px"; g.style.height = cr.height + "px";
  g.style.left = (cr.left - ar.left) + "px"; g.style.top = (cr.top - ar.top) + "px";
  const ctx = g.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  const now = Date.now(), tod = L.timeOfDay();
  const out = [];
  items.list.forEach((e) => {
    ctx.save(); ctx.globalAlpha = 1;
    L.drawItem(ctx, S, 0, 0, { id: e.id, x: e.x, y: e.y }, sc, now, tod, 0.6);
    ctx.restore();
    // khung đứt quãng quanh ô của món thử
    const T = L.T, R = L.ROOM, w = (e.w || 1) * T;
    const top = e.y === 0 ? R.WALL_Y : R.FLOOR + (e.y - 1) * T, hgt = e.h || T;
    const x0 = e.x * T * S, y0 = (top + T - hgt) * S;
    ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = "#b07a1a"; ctx.strokeRect(x0 + 1, y0 + 1, w * S - 2, hgt * S - 2); ctx.setLineDash([]);
    ctx.font = "bold 12px sans-serif"; const tw = ctx.measureText("thử").width + 8;
    ctx.fillStyle = "#fff3c4"; ctx.fillRect(x0 + 2, y0 + 2, tw, 16); ctx.strokeStyle = "#b07a1a"; ctx.lineWidth = 1.5; ctx.strokeRect(x0 + 2, y0 + 2, tw, 16);
    ctx.fillStyle = "#7a4a00"; ctx.fillText("thử", x0 + 6, y0 + 14);
    out.push([x0, y0]);
  });
  return out;
};`;
const TRY = [{ id: "ukiyoe", x: 2, y: 0, name: "Tranh sóng lừng", price: 200 }, { id: "aquarium", x: 8, y: 1, name: "Bể cá", price: 240 },
  { id: "andon", x: 2, y: 2, name: "Đèn giấy andon", price: 110 }];
async function homeRoom() {
  await stopReview(); await ensureCss();
  await js('if (!GardenHome.isOpen()) GardenHome.open("room"); return 1;'); await sleep(1500);
  await js('const t = document.querySelector(\'.kb-h-tab[data-tab="room"]\'); if (t) t.click(); return 1;'); await sleep(900);
}
async function tryMode() {
  await js(`const top = document.querySelector("#kb-home .kb-game-top"), snap = document.getElementById("kb-h-snap");
    if (!document.getElementById("mk-trybtn")) { const b = document.createElement("button"); b.type = "button"; b.id = "mk-trybtn"; b.className = "kb-btn kb-btn-small";
      b.textContent = "Trang trí thử"; b.style.background = "#ffd23f"; top.insertBefore(b, snap); }
    const view = document.querySelector("#kb-home .kb-h-view"), tip = document.getElementById("kb-h-tip");
    tip.style.display = "none";
    if (!document.getElementById("mk-trybar")) {
      const bar = document.createElement("div"); bar.id = "mk-trybar"; bar.className = "mk-try-bar";
      bar.innerHTML = '<b>Đang trang trí thử · Phòng chính</b><span>3 món chưa có · 550 xu</span>' +
        '<span class="mk-sp"></span><span>Bản</span>' +
        '<button type="button" class="kb-btn kb-btn-small mk-slot is-on">1</button><button type="button" class="kb-btn kb-btn-small mk-slot">2</button><button type="button" class="kb-btn kb-btn-small mk-slot">3</button>' +
        '<button type="button" class="kb-btn kb-h-buy" id="mk-apply">Dùng bản này · 550 xu</button><button type="button" class="kb-btn kb-btn-small" id="mk-tryexit">Thoát thử</button>';
      view.appendChild(bar);
    }
    // thẻ món trong danh sách: nút "Đặt thử" cho mọi món; món đang thử có nhãn
    const TRY = ${JSON.stringify(TRY.map((t) => t.name))};
    document.querySelectorAll("#kb-h-list .kb-h-card").forEach((c) => {
      const nm = c.querySelector(".kb-h-name"), row = c.querySelector(".kb-h-btns");
      if (!nm || !row || row.querySelector(".mk-trybtn")) { return; }
      if (c.classList.contains("kb-h-locked")) { Array.from(row.children).forEach((x) => { x.style.display = "none"; }); return; }   // quà / món không bán: không thử
      const name = (nm.firstChild && nm.firstChild.textContent) || nm.textContent;
      const b = document.createElement("button"); b.type = "button"; b.className = "kb-btn kb-btn-small mk-trybtn"; b.textContent = "Đặt thử";
      Array.from(row.children).forEach((x) => { x.style.display = "none"; });
      row.insertBefore(b, row.firstChild);
      if (TRY.indexOf(name.trim()) >= 0) { const t = document.createElement("span"); t.className = "mk-trytag"; t.textContent = "đang thử"; nm.appendChild(t); c.classList.add("mk-tried"); }
    });
    const tc = document.querySelector("#kb-h-list .mk-tried"); if (tc) { tc.scrollIntoView({ block: "center" }); }
    window.scrollTo(0, 0);
    return 1;`);
  await sleep(400);
  // vẽ đồ thử (mờ, khung đứt quãng, nhãn "thử") lên lớp phủ trên canvas của bảng Nhà
  await js(`const L = GardenHome._lib(), cv = document.getElementById("kb-home-canvas"), area = cv.parentNode;
    let g = document.getElementById("mk-ghost");
    if (!g) { g = document.createElement("canvas"); g.id = "mk-ghost"; g.className = "mk-ghostcv"; area.appendChild(g); area.style.position = "relative"; }
    const cr = cv.getBoundingClientRect(), ar = area.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
    const S = Math.round(cr.width / 160);
    g.width = cr.width * dpr; g.height = cr.height * dpr; g.style.width = cr.width + "px"; g.style.height = cr.height + "px";
    g.style.left = (cr.left - ar.left) + "px"; g.style.top = (cr.top - ar.top) + "px";
    const ctx = g.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
    const now = Date.now(), tod = L.timeOfDay();
    ${JSON.stringify(TRY)}.forEach((e) => {
      const t = document.createElement("canvas"); t.width = cr.width; t.height = cr.height;
      const tc = t.getContext("2d"); tc.imageSmoothingEnabled = false;
      L.drawItem(tc, S, 0, 0, { id: e.id, x: e.x, y: e.y }, "room", now, tod, 1);
      const px = tc.getImageData(0, 0, t.width, t.height).data;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let y = 0; y < t.height; y++) { for (let x = 0; x < t.width; x++) { if (px[(y * t.width + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } } }
      ctx.globalAlpha = 0.6; ctx.drawImage(t, 0, 0, cr.width, cr.height); ctx.globalAlpha = 1;
      if (x1 < 0) { return; }
      ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeStyle = "#b07a1a"; ctx.strokeRect(x0 - 4, y0 - 4, x1 - x0 + 9, y1 - y0 + 9); ctx.setLineDash([]);
      ctx.font = "bold 12px sans-serif"; const tw = ctx.measureText("thử").width + 10;
      ctx.fillStyle = "#fff3c4"; ctx.fillRect(x0 - 4, y0 - 22, tw, 17); ctx.strokeStyle = "#b07a1a"; ctx.lineWidth = 1.5; ctx.strokeRect(x0 - 4, y0 - 22, tw, 17);
      ctx.fillStyle = "#7a4a00"; ctx.fillText("thử", x0 + 1, y0 - 9);
    });
    return 1;`);
}
async function stepThu() {
  await size(1366, 860);
  await homeRoom();
  await hideToast(); await shot('raw_thu0');
  await tryMode();
  await tag('#mk-trybtn', 'mới: bật / tắt trang trí thử', 'bottom', { dx: -150 });
  await tag('#mk-trybar', 'Đồ chưa mua hiện mờ · lưu sẵn 3 bản · "Dùng bản này" mới trả xu', 'top', { dx: 380, dy: 2, hl: false });
  await tag('.mk-tried .mk-trybtn', 'Khi đang thử: món nào cũng có nút "Đặt thử", kể cả khi thiếu xu', 'top', { dx: -330 });
  await hideToast(); await shot('raw_thu1');
  await clearMk();
}
async function stepThuMua() {
  await size(1366, 860);
  await homeRoom(); await tryMode();
  await js(`GardenUI.ask({ title: "Dùng bản thử 1 cho Phòng chính?", price: 550, yes: "Mua 3 món & dùng",
    note: "Mua: Tranh sóng lừng 200 · Bể cá 240 · Đèn giấy andon 110. Đồ đang có giữ nguyên chỗ như bản thử; món bản thử không dùng → Kho đồ.",
    then: function () {} }); return 1;`);
  await sleep(800);
  await hideToast(); await shot('raw_thu2');
  await js('const n = document.querySelector(".kb-ask-no"); if (n) n.click(); else document.dispatchEvent(new KeyboardEvent("keydown", {key: "Escape"})); return 1;');
  await sleep(400);
}

(async () => {
  const p0 = await gardenPage();
  if (p0) { page = p0; } else { await setup(); }
  if (p0 && want('setup')) { await setup(); }
  await page.eval(GHOST_JS + '; 1');
  await ensureCss();
  if (want('phim')) { await stepPhim(); }
  if (want('tulat')) { await stepTuLat(); }
  if (want('phongto')) { await stepPhongTo(); }
  if (want('anhien')) { await stepAnHien(); }
  if (want('deck')) { await stepDeck(); }
  if (want('thu')) { await stepThu(); }
  if (want('thumua')) { await stepThuMua(); }
  console.log('lỗi JS:', page.errors);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
