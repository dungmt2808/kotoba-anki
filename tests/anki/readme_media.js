// Ảnh + video giới thiệu cho README / trang AnkiWeb (1.22.8), chụp trong Anki thật với bộ thẻ mẫu (demo_col.py):
// vườn đủ 5 giai đoạn cây, nhà xây xong + đồ trang trí + thú nuôi, nội thất, báo Gemini mẫu, lịch sử ôn 3 tháng.
// Không phải test (không có ✓ / ✗): chỉ dựng cảnh và chụp. Video ghi bằng Page.startScreencast (JPEG ~30 khung/giây),
// có con trỏ chuột vẽ thêm để người xem thấy bấm vào đâu; tools/make_media.sh ghép thành MP4 + GIF.
// Chạy: ANKI_PY=… setup_demo.sh BASE ADDON && run_anki.sh BASE 9333 LOG & ; node readme_media.js OUT
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = path.resolve(process.argv[2] || '/tmp/kb_media');
const ONLY = process.env.KB_ONLY || '';          // "shots" / "video": chỉ làm một phần
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 9333), CTRL = Number(process.env.KB_CTRL_PORT || 9444);
const W = 1280, H = 800;
const PHOTO = path.join(OUT, 'anh_vuon_1920.png');
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\n';
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
let page;
const js = (expr) => page.eval('(() => { ' + expr + ' })()');
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(120); }
  return false;
}
async function shot(name) { await hideToast(); await sleep(150); await page.shot(path.join(OUT, name + '.png')); console.log('  ảnh', name); }
const hideToast = () => js('const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
const sky = (hour, weather) => js(`GardenSky.set("mode", "fixed"); GardenSky.set("fixedHour", ${hour}); GardenSky.set("weather", "${weather || 'sunny'}"); return 1;`);
const deck = (name) => py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh()\nresult = 1`).then(() => sleep(1500));
const closeAll = () => js('try { GardenPaper.close(); } catch (e) {} try { GardenCal.close(); } catch (e) {} try { GardenGames.close(); } catch (e) {} try { GardenHome.close(); } catch (e) {} const s = document.getElementById("kb-stop"); if (s && !document.getElementById("kb-panel").hidden) s.click(); return 1;').then(() => sleep(500));

// ---- con trỏ chuột vẽ thêm (screencast không có con trỏ thật) ----
const CURSOR = `(() => {
  if (document.getElementById("kb-demo-cursor")) return 1;
  const c = document.createElement("div");
  c.id = "kb-demo-cursor";
  c.innerHTML = '<svg width="22" height="30" viewBox="0 0 11 15" shape-rendering="crispEdges"><path d="M0 0h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h1v1h-3v1h1v1h1v2h-2v-1h-1v-1h-1v-1h-1v1h-1v1h-1z" fill="#1b1b2f"/><path d="M1 2h1v1h1v1h1v1h1v1h1v1h1v1h1v1h-3v1h1v1h1v1h-1v-1h-1v-1h-1v-1h-1v1h-1v1h-1z" fill="#fff"/></svg>';
  c.style.cssText = "position:fixed;left:640px;top:420px;z-index:2147483647;pointer-events:none;transition:left .55s ease-in-out,top .55s ease-in-out;filter:drop-shadow(1px 1px 0 rgba(0,0,0,.35))";
  const r = document.createElement("div");
  r.id = "kb-demo-ripple";
  r.style.cssText = "position:fixed;width:28px;height:28px;margin:-14px 0 0 -14px;border:3px solid #ffd23f;z-index:2147483646;pointer-events:none;opacity:0;transition:transform .35s ease-out,opacity .35s ease-out";
  document.body.appendChild(r); document.body.appendChild(c); return 1; })()`;
async function cursorTo(sel, dx = 0, dy = 0) {
  const box = await page.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
  if (!box) throw new Error('không thấy ' + sel);
  await page.eval(`(() => { const c = document.getElementById("kb-demo-cursor"); c.style.left = "${box[0] + dx - 2}px"; c.style.top = "${box[1] + dy - 2}px"; return 1; })()`);
  await sleep(650);
  return [box[0] + dx, box[1] + dy];
}
async function tap(sel, opts = {}) {
  const p = await cursorTo(sel, opts.dx || 0, opts.dy || 0);
  await page.eval(`(() => { const r = document.getElementById("kb-demo-ripple"); r.style.transition = "none"; r.style.left = "${p[0]}px"; r.style.top = "${p[1]}px"; r.style.opacity = "1"; r.style.transform = "scale(.4)"; r.offsetWidth; r.style.transition = "transform .35s ease-out, opacity .35s ease-out"; r.style.transform = "scale(1.4)"; r.style.opacity = "0"; return 1; })()`);
  for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x: p[0], y: p[1], button: 'left', clickCount: 1 });
  await sleep(opts.wait || 700);
}

// ---- ghi hình ----
const rec = { on: false, n: 0, dir: path.join(OUT, 'frames'), list: [] };
function hookFrames() {
  const orig = page.ws.onmessage;
  page.ws.onmessage = (ev) => {
    const m = JSON.parse(ev.data);
    if (m.method === 'Page.screencastFrame') {
      page.ws.send(JSON.stringify({ id: 800000 + (++rec.n), method: 'Page.screencastFrameAck', params: { sessionId: m.params.sessionId } }));
      if (rec.on) {
        const f = 'f' + String(rec.list.length).padStart(5, '0') + '.jpg';
        fs.writeFileSync(path.join(rec.dir, f), Buffer.from(m.params.data, 'base64'));
        rec.list.push([f, m.params.metadata.timestamp]);
      }
      return;
    }
    orig(ev);
  };
}
async function recStart() {
  fs.rmSync(rec.dir, { recursive: true, force: true }); fs.mkdirSync(rec.dir, { recursive: true });
  rec.list = []; rec.on = true;
  await page.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
}
async function recStop() {
  await page.send('Page.stopScreencast'); rec.on = false;
  // danh sách cho ffmpeg concat: mỗi khung hiện tới khi khung sau tới (screencast chỉ gửi khi trang đổi)
  const lines = [];
  for (let i = 0; i < rec.list.length; i++) {
    const [f, t] = rec.list[i];
    const next = i + 1 < rec.list.length ? rec.list[i + 1][1] : t + 0.5;
    lines.push("file '" + f + "'", 'duration ' + Math.max(0.001, next - t).toFixed(4));
  }
  lines.push("file '" + rec.list[rec.list.length - 1][0] + "'");
  fs.writeFileSync(path.join(rec.dir, 'frames.txt'), lines.join('\n') + '\n');
  console.log('  video:', rec.list.length, 'khung,', (rec.list[rec.list.length - 1][1] - rec.list[0][1]).toFixed(1), 'giây');
}

// ---- cảnh: nhà xây xong, đồ trang trí, nội thất, thú nuôi, cấu hình trường, nhật ký ----
const SETUP = KB + `
d = st.load(); d["coins"] = 100000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
yard = [("sakura", 4, 0), ("lantern", 7, 0), ("torii", 9, 0), ("bonsai", 12, 0), ("birdhouse", 14, 0),
        ("flowers", 4, 1), ("bench", 6, 1), ("sunflower", 8, 1), ("well", 13, 1), ("kazaguruma", 15, 1),
        ("mailbox", 4, 2), ("pond", 6, 2), ("scarecrow", 9, 2), ("maneki", 11, 2), ("fountain", 13, 2)]
room = [("painting", 1, 0), ("clock", 3, 0), ("kakejiku", 7, 0), ("calendar", 8, 0),
        ("shelf", 0, 1), ("desk", 1, 1), ("lamp", 3, 1), ("aquarium", 8, 1), ("plant", 9, 1),
        ("rug", 4, 2), ("kotatsu", 4, 2), ("tea", 1, 3), ("ikebana", 9, 3), ("cat", 7, 3), ("andon", 0, 3), ("radio", 2, 2)]
for scene, items in (("yard", yard), ("room", room)):
    for iid, x, y in items:
        st.buy(iid); st.place(scene, iid, x, y)
for pid in ("neko", "shiba"):
    st.pet_buy(pid)
for tid in ("momiji", "hanami", "noel"):      # giao diện mùa: tháng 11 tự dùng Mùa lá đỏ; hai cái kia để chụp
    st.unlock_theme(tid, "coins")
st.set_theme("auto")
fc = kb.fields_core
for name, kind, f in [("Từ vựng tiếng Nhật", "vocab", {"word": "Từ", "reading": "Cách đọc", "meaning": "Nghĩa", "example": "Câu ví dụ", "ex_meaning": "Dịch câu ví dụ", "ex_audio": "Audio câu ví dụ"}),
                      ("Chữ Hán", "kanji", {"word": "Kanji", "hanviet": "Hán Việt", "meaning": "Nghĩa"}),
                      ("English vocabulary", "vocab", {"word": "Word", "reading": "IPA", "meaning": "Meaning", "example": "Example", "ex_meaning": "Example meaning"})]:
    m = mw.col.models.by_name(name)
    lang = "en" if name.startswith("English") else "ja"
    conf, err = fc.validate_save({"kind": kind, "f": f, "name": name}, [x["name"] for x in m["flds"]], lang)
    kb.FIELDS.set_model(str(m["id"]), conf, lang)
d = st.load(); d["coins"] = 1286; st.save(d)
os.environ["KB_TEST_PHOTO"] = ${JSON.stringify(PHOTO)}
result = 1`;

(async () => {
  await py(SETUP);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  hookFrames();
  await py(KB + `kb._dialog.resize(${W}, ${H}); result = 1`);
  await deck('Tiếng Nhật');
  await sky(10, 'sunny'); await hideToast(); await sleep(1500);

  if (ONLY !== 'video') {
    console.log('== Ảnh');
    await page.eval('(() => { const s = document.createElement("style"); s.id = "kb-demo-nosay"; s.textContent = "#kb-say{display:none!important}"; document.head.appendChild(s); return 1; })()');
    await py(KB + `kb._dialog.resize(${W}, 720); result = 1`); await sleep(1500);
    await shot('01_vuon');
    await py(KB + `kb._dialog.resize(${W}, ${H}); result = 1`); await sleep(1200);

    await deck('Tiếng Nhật::N5 · Từ vựng');
    await js('document.getElementById("kb-review").click(); return 1;');
    await waitFor('return !document.getElementById("kb-panel").hidden && !document.getElementById("kb-show").hidden;');
    await sleep(800);
    await js('document.getElementById("kb-show").click(); return 1;');
    await waitFor('return !document.getElementById("kb-ratings").hidden;'); await sleep(600);
    await shot('02_on_the');
    await closeAll(); await deck('Tiếng Nhật');

    await js('GardenHome.open("yard"); return 1;'); await sleep(1200);
    await js('document.querySelector("#kb-home button[data-tab=yard]").click(); return 1;'); await sleep(800);
    await shot('03_nha_trang_tri');
    await js('GardenHome.setScene("room"); document.querySelector("#kb-home button[data-tab=room]").click(); return 1;'); await sleep(1000);
    await shot('04_trong_nha');
    await js('GardenHome.setScene("yard"); return 1;'); await sleep(300);
    await closeAll();

    await js('GardenGames.open(); return 1;'); await sleep(1200);
    await shot('05_tro_choi');
    await js('document.querySelector(".kb-gcard[data-game=market]").click(); return 1;'); await sleep(2500);
    await shot('05b_cho_sang');
    await closeAll();

    await js('GardenPaper.open("issue"); return 1;'); await sleep(2500);
    await shot('06_bao');
    await js('GardenPaper.open("dict"); return 1;'); await sleep(2500);
    await shot('07_chep_chinh_ta');
    await closeAll();
    // tab Nguồn báo như người mới cài: chưa có khoá Gemini, không có thẻ Claude Code (bao_dir trống)
    await py(KB + 'kb._demo_key = kb.config().get("gemini_key"); kb.save_config(gemini_key="", bao_dir=""); result = 1');
    await js('GardenPaper.open("src"); return 1;'); await sleep(2000);
    await shot('12_nguon_bao');
    await closeAll();
    await py(KB + 'kb.save_config(gemini_key=kb._demo_key); kb._dialog.refresh()\nresult = 1'); await sleep(1500);

    await js('GardenCal.open(); return 1;'); await sleep(1500);
    // nhật ký hôm nay: sticker + một dòng, rồi lùi về tháng trước (đủ hoa cả tháng)
    await js('const s = document.querySelectorAll("#kb-cal .kb-cal-stk, #kb-cal [data-sticker]"); if (s[0]) s[0].click(); return s.length;');
    await sleep(300);
    const ta = await js('const t = document.querySelector("#kb-cal textarea"); if (!t) return 0; t.focus(); return 1;');
    if (ta) { await page.type('今日は新聞を読んで、野菜の言葉を覚えた。'); await js('document.querySelector("#kb-cal textarea").blur(); return 1;'); }
    await sleep(600);
    await shot('08_lich_hoa');
    await js('const b = Array.prototype.find.call(document.querySelectorAll("#kb-cal button"), (x) => x.textContent.trim() === "◂"); if (b) b.click(); return 1;'); await sleep(1200);
    await shot('08b_lich_hoa_thang_truoc');
    await js('const b = Array.prototype.find.call(document.querySelectorAll("#kb-cal button"), (x) => x.textContent.trim() === "Năm"); if (b) b.click(); return 1;'); await sleep(1200);
    await shot('08c_lich_hoa_nam');
    await closeAll();

    await sky(21, 'sunny'); await sleep(1500);
    await shot('09_vuon_dem');
    // giao diện mùa khác: hoa anh đào (ngày), Giáng sinh (tối, tuyết)
    for (const [tid, name, hour, weather] of [['hanami', '10_mua_hoa_anh_dao', 10, 'sunny'], ['noel', '10b_giang_sinh', 18, 'snow']]) {
      await py(KB + `st.set_theme("pick", "${tid}"); kb._dialog.refresh()
result = 1`); await sleep(2000);
      await sky(hour, weather); await sleep(2500);
      await shot(name);
    }
    await py(KB + 'st.set_theme("auto"); kb._dialog.refresh()\nresult = 1'); await sleep(2000);
    await sky(10, 'sunny'); await sleep(800);

    // ảnh vườn tự chụp (hình nền 1920 × 1080)
    try {
      await js('document.getElementById("kb-yard-snap").click(); return 1;'); await sleep(300);
      await js('document.querySelector(\'#kb-snap-pop [data-snap="wall"]\').click(); return 1;');
      for (let i = 0; i < 40 && !fs.existsSync(PHOTO); i++) await sleep(250);
      console.log('  ảnh', path.basename(PHOTO), fs.existsSync(PHOTO));
    } catch (e) { console.log('  không chụp được ảnh vườn:', e.message); }
    await hideToast();
  }

  if (ONLY !== 'shots') {
    console.log('== Video');
    await closeAll(); await deck('Tiếng Nhật::N5 · Từ vựng'); await sky(10, 'sunny'); await hideToast();
    await page.eval(CURSOR);
    await recStart();
    await sleep(3500);                                              // vườn: cây đung đưa, thú nuôi đi lại
    await tap('#kb-review', { wait: 1800 });                        // Tưới ngay
    await tap('#kb-show', { wait: 1500 });
    await tap('#kb-ratings button:nth-child(3)', { wait: 2200 });   // Được → +xu, cây được tưới
    await tap('#kb-show', { wait: 1400 });
    await tap('#kb-ratings button:nth-child(3)', { wait: 2000 });
    await tap('#kb-stop', { wait: 1800 });
    await tap('#kb-house', { wait: 2000 });                         // Nhà & Cửa hàng
    await tap('#kb-home button[data-tab=yard]', { wait: 1800 });
    await page.eval('(() => { const l = document.getElementById("kb-h-list"); if (l) l.scrollBy({ top: 260, behavior: "smooth" }); return 1; })()');
    await sleep(1500);
    await js('GardenHome.setScene("room"); return 1;'); await sleep(2200);  // Trong nhà
    await js('GardenHome.setScene("yard"); return 1;');
    await tap('#kb-h-exit', { wait: 1200 });
    await tap('#kb-games', { wait: 1800 });                         // Trò chơi → Chợ sáng
    await tap('.kb-gcard[data-game=market]', { wait: 2500 });
    // trả lời đúng hai khách: tìm nghĩa của từ khách hỏi trong deck
    for (let k = 0; k < 2; k++) {
      const ask = await js('const b = Array.prototype.find.call(document.querySelectorAll("#kb-game *"), (e) => e.children.length === 0 && /「.+」/.test(e.textContent)); return b ? b.textContent : "";');
      const word = (ask.match(/「(.+?)」/) || [])[1];
      if (!word) break;
      const mean = await py(KB + `nids = mw.col.find_notes(${JSON.stringify('"Từ:' + word + '"')}) or mw.col.find_notes(${JSON.stringify('"Kanji:' + word + '"')})\nresult = mw.col.get_note(nids[0])["Nghĩa"] if nids else ""`);
      const idx = await js(`const bs = Array.prototype.slice.call(document.querySelectorAll("#kb-game button")).filter((b) => b.offsetParent && b.textContent.indexOf(${JSON.stringify(mean)}) >= 0); if (!bs.length) return -1; bs[0].setAttribute("data-demo-pick", "1"); return 1;`);
      if (idx < 0) break;
      await tap('[data-demo-pick="1"]', { wait: 2400 });
      await js('const b = document.querySelector("[data-demo-pick]"); if (b) b.removeAttribute("data-demo-pick"); return 1;');
    }
    await js('GardenGames.close(); return 1;'); await sleep(800);
    await tap('#kb-paper-btn', { wait: 2500 });                      // Báo (dòng "Báo mới" của thẻ Hôm nay)
    const word = await js('const ws = document.querySelectorAll("#kb-p-stage .kb-p-w"); const w = ws[Math.min(3, ws.length - 1)]; if (!w) return 0; w.setAttribute("data-demo-word", "1"); return 1;');
    if (word) { await tap('[data-demo-word="1"]', { wait: 2500 }); }
    await page.eval('(() => { const s = document.getElementById("kb-p-stage"); if (s) s.scrollBy({ top: 280, behavior: "smooth" }); return 1; })()');
    await sleep(1800);
    await js('GardenPaper.close(); return 1;'); await sleep(600);
    await js('GardenCal.open(); return 1;'); await sleep(1600);       // Lịch hoa
    await page.eval('(() => { const b = Array.prototype.find.call(document.querySelectorAll("#kb-cal button"), (x) => /^◂$|^‹$/.test(x.textContent.trim())); if (b) b.setAttribute("data-demo-prev", "1"); return 1; })()');
    if (await js('return !!document.querySelector("[data-demo-prev]");')) { await tap('[data-demo-prev="1"]', { wait: 2400 }); }
    await js('GardenCal.close(); return 1;'); await sleep(600);
    await sky(20, 'sunny'); await sleep(3200);                     // vườn đêm
    await sky(10, 'sunny'); await sleep(1500);
    await recStop();
  }
  console.log('Xong:', OUT);
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
