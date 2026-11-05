// Ảnh + video giới thiệu cho README / trang AnkiWeb (1.22.8), chụp trong Anki thật với bộ thẻ mẫu (demo_col.py):
// vườn đủ 5 giai đoạn cây, nhà xây xong + đồ trang trí + thú nuôi, nội thất, báo Gemini mẫu, lịch sử ôn 3 tháng.
// Không phải test (không có ✓ / ✗): chỉ dựng cảnh và chụp. Video ghi bằng Page.startScreencast (JPEG ~30 khung/giây),
// có con trỏ chuột vẽ thêm để người xem thấy bấm vào đâu; tools/make_media.sh ghép thành MP4 + GIF.
// Chạy: ANKI_PY=… setup_demo.sh BASE ADDON && run_anki.sh BASE 9333 LOG & ; node readme_media.js OUT
const fs = require('fs');
const path = require('path');
const { pages, Page, sleep } = require('./cdp');
const OUT = path.resolve(process.argv[2] || '/tmp/kb_media');
const ONLY = process.env.KB_ONLY || '';          // "shots" / "video": chỉ làm một phần; "setup": chỉ dựng cảnh rồi thoát
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

// ---- Xưởng: hộp "Chọn ảnh…" trả lời bằng hình daruma vẽ sẵn (canvas), mở xưởng cỡ 32 rồi chuyển ảnh ----
async function useDaruma() {
  const dataUrl = await js(`const c = document.createElement("canvas"); c.width = 240; c.height = 240; const x = c.getContext("2d");
    x.fillStyle = "#f4f2ee"; x.fillRect(0, 0, 240, 240);
    x.fillStyle = "#c8282e"; x.beginPath(); x.ellipse(120, 132, 92, 100, 0, 0, 7); x.fill();
    x.fillStyle = "#e8484c"; x.beginPath(); x.ellipse(96, 100, 30, 26, 0, 0, 7); x.fill();
    x.fillStyle = "#fbefd9"; x.beginPath(); x.ellipse(120, 112, 52, 46, 0, 0, 7); x.fill();
    x.fillStyle = "#1b1b2f"; x.beginPath(); x.arc(100, 106, 11, 0, 7); x.fill(); x.beginPath(); x.arc(140, 106, 11, 0, 7); x.fill();
    x.lineWidth = 7; x.strokeStyle = "#1b1b2f"; x.beginPath(); x.arc(100, 90, 16, 3.6, 5.8); x.stroke(); x.beginPath(); x.arc(140, 90, 16, 3.6, 5.8); x.stroke();
    x.beginPath(); x.arc(120, 140, 14, 0.3, 2.8); x.stroke();
    x.fillStyle = "#ffd23f"; x.fillRect(80, 186, 80, 16); x.fillRect(112, 176, 16, 36);
    return c.toDataURL("image/png");`);
  await py(KB + `import base64
open("/tmp/kb_media_daruma.png", "wb").write(base64.b64decode(${JSON.stringify(dataUrl.split(',')[1])}))
kb.getFile = lambda parent, title, cb, filter=None, key=None, **kw: cb("/tmp/kb_media_daruma.png")
result = 1`);
}
async function openCraft(tapIt) {
  const go = tapIt || ((sel) => page.eval(`(() => { document.querySelector(${JSON.stringify(sel)}).click(); return 1; })()`).then(() => sleep(700)));
  await js('if (!GardenHome.isOpen()) GardenHome.open("yard"); return 1;'); await sleep(600);
  await go('#kb-home button[data-tab=craft]');
  await js('const b = Array.prototype.find.call(document.querySelectorAll("#kb-h-list .kb-h-craft-new button"), (x) => x.textContent === "Mở xưởng"); if (b) b.setAttribute("data-demo-craft", "1"); return 1;');
  await go('[data-demo-craft="1"]');
  await waitFor('return GardenCraft.isOpen();');
  await js('const n = document.getElementById("kb-cf-name"); n.value = "Daruma"; n.dispatchEvent(new Event("input")); const s = document.getElementById("kb-cf-size"); s.value = "32"; s.dispatchEvent(new Event("change")); return 1;');
  await sleep(500);
  await go('#kb-cf-pick');
  await waitFor('return GardenCraft._state().px.replace(/\\./g, "").length > 200;', 10000);
  await sleep(900);
}

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
  const box = await page.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; e.scrollIntoView({ block: "nearest" }); const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; })()`);
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
const rec = { on: false, n: 0, dir: path.join(OUT, 'frames'), list: [], marks: [] };
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
  rec.list = []; rec.marks = []; rec.on = true;
  await page.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
}
function mark(track) { rec.marks.push([Date.now() / 1000, track]); }
async function recStop() {
  await page.send('Page.stopScreencast'); rec.on = false;
  await makeMusic();
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

// ---- nhạc cho video: dựng đúng các bản nhạc 8-bit của add-on (GardenMusic._offline trên OfflineAudioContext),
// mỗi đoạn video (theo mốc mark()) phát bản nhạc của cảnh đó từ đầu, nối nhau bằng fade ngắn → frames/music.wav ----
const SR = 32000;
async function renderTrack(name) {
  const r = await page.eval(`(async () => {
    const t = GardenMusic._tracks[${JSON.stringify(name)}]; if (!t) return null;
    const loop = t.len * 60 / t.bpm / 4;
    const ctx = new OfflineAudioContext(1, Math.ceil((loop + 3) * ${SR}), ${SR});
    GardenMusic._offline(ctx, ${JSON.stringify(name)});
    const d = (await ctx.startRendering()).getChannelData(0);
    const a = new Int16Array(d.length);
    for (let i = 0; i < d.length; i++) a[i] = Math.max(-32767, Math.min(32767, Math.round(d[i] * 32767)));
    const u = new Uint8Array(a.buffer); let s = "";
    for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return { loop: loop, b64: btoa(s) }; })()`);
  if (!r) return null;
  const b = Buffer.from(r.b64, 'base64'), ab = new ArrayBuffer(b.length);
  new Uint8Array(ab).set(b);
  const pcm = new Int16Array(ab), off = Math.round(0.05 * SR), L = Math.round(r.loop * SR);
  // phát lặp: đoạn một vòng + đuôi tiếng vọng của vòng trước cộng vào đầu vòng sau
  return (i) => { const k = i % L; let v = pcm[off + k] || 0; if (i >= L && off + L + k < pcm.length) v += pcm[off + L + k]; return v; };
}
async function makeMusic() {
  if (!rec.list.length || !rec.marks.length) return;
  const t0 = rec.list[0][1], t1 = rec.list[rec.list.length - 1][1] + 0.5;
  console.log('  khung đầu', t0.toFixed(2), '· mốc đầu', rec.marks[0][0].toFixed(2));
  const n = Math.ceil((t1 - t0) * SR), mix = new Float32Array(n);
  const tracks = {};
  for (const [, name] of rec.marks) { if (!(name in tracks)) tracks[name] = await renderTrack(name); }
  const fadeIn = Math.round(0.12 * SR), fadeOut = Math.round(0.35 * SR);
  rec.marks.forEach(([t, name], k) => {
    const play = tracks[name]; if (!play) return;
    const a = Math.max(0, Math.round((t - t0) * SR));
    const b = k + 1 < rec.marks.length ? Math.round((rec.marks[k + 1][0] - t0) * SR) : n;
    for (let i = a; i < Math.min(n, b + fadeOut); i++) {
      const j = i - a;
      const g = Math.min(1, j / fadeIn) * (i < b ? 1 : 1 - (i - b) / fadeOut) * (i > n - SR ? (n - i) / SR : 1);
      mix[i] += play(j) * g;
    }
  });
  let peak = 1; for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(mix[i]));
  const gain = 0.7 * 32767 / peak, out = Buffer.alloc(44 + n * 2);
  out.write('RIFF', 0); out.writeUInt32LE(36 + n * 2, 4); out.write('WAVEfmt ', 8); out.writeUInt32LE(16, 16);
  out.writeUInt16LE(1, 20); out.writeUInt16LE(1, 22); out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 2, 28);
  out.writeUInt16LE(2, 32); out.writeUInt16LE(16, 34); out.write('data', 36); out.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) out.writeInt16LE(Math.round(mix[i] * gain), 44 + i * 2);
  fs.writeFileSync(path.join(rec.dir, 'music.wav'), out);
  fs.writeFileSync(path.join(rec.dir, 'marks.json'), JSON.stringify(rec.marks.map(([t, m]) => [+(t - t0).toFixed(2), m])));
  console.log('  nhạc:', rec.marks.map(([t, m]) => (t - t0).toFixed(1) + 's ' + m).join(' · '));
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
# 6 vùng + đồ của từng vùng, vùng tự tạo "Tiệm bánh nhỏ" (demo_zone.py) có vài món đồ
SPOTS = [(5, 1), (8, 0), (11, 1), (14, 0), (6, 2), (12, 2), (9, 2), (4, 0), (13, 1), (7, 1), (10, 0), (15, 2)]
def _put(scene, iid):
    st.buy(iid)
    for x, y in SPOTS + [(x, y) for y in (1, 0, 2) for x in range(4, 16)]:
        try:
            st.place(scene, iid, x, y)
            return True
        except Exception:
            pass
    return False
cat = kb.core.CATALOG
for z in kb.core.ZONE_IDS:
    st.unlock_zone(z)
    for iid in [k for k, v in cat.items() if v.get("zone") == z and not v.get("season") and not v.get("rare")]:
        _put(z, iid)
sys.path.insert(0, ${JSON.stringify(__dirname)})
import demo_zone
zid = st.zone_save(demo_zone.payload(sys.modules["kotoba_batake.more_core"].px_encode))["zone_id"]
for iid in ("bench", "chochin", "flowers", "sunflower", "bonsai"):
    try:
        _put(zid, iid)
    except Exception:
        pass
kb._demo_zone = zid
for tid in ("momiji", "hanami", "noel", "tet", "tsuyu", "natsumatsuri", "tsukimi", "halloween"):   # tháng 11 tự dùng Mùa lá đỏ; còn lại để chụp
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

  if (ONLY === 'setup') { console.log('Đã dựng cảnh (KB_ONLY=setup), Anki vẫn mở.'); process.exit(0); }
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

  if (ONLY !== 'video') {
    console.log('== Giao diện mùa, nhật ký, tủ đồ');
    // 8 giao diện mùa: ảnh sân cỡ lớn (1024 px, có khung + tên giao diện) → ghép 2 × 4 bằng make_media.sh
    const themes = [['tet', 9, 'sunny'], ['hanami', 10, 'sunny'], ['tsuyu', 15, 'rain'], ['natsumatsuri', 20, 'sunny'],
      ['tsukimi', 21, 'sunny'], ['momiji', 16, 'sunny'], ['halloween', 19, 'sunny'], ['noel', 18, 'snow']];
    fs.mkdirSync(path.join(OUT, 'mua'), { recursive: true });
    for (let i = 0; i < themes.length; i++) {
      const [tid, hour, weather] = themes[i];
      await py(KB + `st.set_theme("pick", "${tid}"); kb._dialog.refresh()\nresult = 1`); await sleep(1800);
      await sky(hour, weather); await sleep(1800); await hideToast();
      if (fs.existsSync(PHOTO)) fs.rmSync(PHOTO);
      await js('document.getElementById("kb-yard-snap").click(); return 1;'); await sleep(300);
      await js('document.querySelector(\'#kb-snap-pop [data-snap="l"]\').click(); return 1;');
      for (let k = 0; k < 40 && !fs.existsSync(PHOTO); k++) await sleep(250);
      await sleep(300);
      if (fs.existsSync(PHOTO)) { fs.copyFileSync(PHOTO, path.join(OUT, 'mua', `${i + 1}_${tid}.png`)); console.log('  mùa', tid); }
    }
    await py(KB + 'st.set_theme("auto"); kb._dialog.refresh()\nresult = 1'); await sleep(1800);
    await sky(10, 'sunny'); await hideToast();

    // nhật ký: sticker + một dòng cho nhiều ngày tháng 10 / 11 (tự viết, không gửi Gemini), mở ngày có nhật ký
    await py(KB + `import datetime as _d
notes = {"2026-10-03": ("vui", "初めて新聞を全部読めた！"), "2026-10-07": ("met", "残業。でも十分だけ復習した。"),
         "2026-10-12": ("hao_hung", "Lên Ra quả 5 cây một lúc."), "2026-10-18": ("thu_thai", "公園で散歩。秋の花がきれい。"),
         "2026-10-21": ("buon", "Quên mất 三つ từ hôm qua…"), "2026-10-25": ("binh_thuong", "Ôn 30 thẻ, chép chính tả 5 câu."),
         "2026-10-31": ("vui", "Halloween! カボチャの花が咲いた。"), "2026-11-02": ("ban", "Bận cả ngày, ôn trên tàu."),
         "2026-11-04": ("thu_thai", "雨の日。家でお茶を飲みながら勉強。")}
for ds, (m, t) in notes.items():
    kb.JOURNAL.update(_d.date.fromisoformat(ds), {"m": m, "t": t})
result = len(notes)`);
    await js('GardenCal.open({ date: "2026-10-18", tab: "month" }); return 1;'); await sleep(2000);
    await shot('14_nhat_ky');
    await js('GardenCal.open({ tab: "book" }); return 1;'); await sleep(2500);
    await shot('14b_cuon_nhat_ky');
    await closeAll();

    // trong nhà: ảnh cỡ lớn bằng nút Chụp ảnh của bảng Nhà
    await js('GardenHome.open("room"); return 1;'); await sleep(1200);
    if (fs.existsSync(PHOTO)) fs.rmSync(PHOTO);
    await js('document.getElementById("kb-h-snap").click(); return 1;'); await sleep(300);
    await js('document.querySelector(\'#kb-snap-pop [data-snap="l"]\').click(); return 1;');
    for (let k = 0; k < 40 && !fs.existsSync(PHOTO); k++) await sleep(250);
    await sleep(300);
    if (fs.existsSync(PHOTO)) { fs.copyFileSync(PHOTO, path.join(OUT, '16_trong_nha.png')); console.log('  ảnh 16_trong_nha'); }
    await closeAll();
    // sân + 6 vùng + vùng tự tạo: ảnh cỡ lớn của cảnh chính → ghép 2 × 4 bằng make_media.sh
    const zid = await py(KB + 'result = kb._demo_zone');
    fs.mkdirSync(path.join(OUT, 'vung'), { recursive: true });
    const scenes = ['yard', 'beach', 'shrine', 'festival', 'bamboo', 'onsen', 'station', zid];
    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];
      await js(`try { localStorage.setItem("kb-main-scene", ${JSON.stringify(sc)}); } catch (e) {} GardenHome.open(${JSON.stringify(sc)}); GardenHome.close(); return 1;`);
      await sleep(1200); await sky(10, 'sunny'); await sleep(600); await hideToast();
      if (fs.existsSync(PHOTO)) fs.rmSync(PHOTO);
      await js('document.getElementById("kb-yard-snap").click(); return 1;'); await sleep(300);
      await js('document.querySelector(\'#kb-snap-pop [data-snap="l"]\').click(); return 1;');
      for (let k = 0; k < 40 && !fs.existsSync(PHOTO); k++) await sleep(250);
      await sleep(300);
      if (fs.existsSync(PHOTO)) { fs.copyFileSync(PHOTO, path.join(OUT, 'vung', `${i + 1}_${sc}.png`)); console.log('  vùng', sc); }
    }
    await js('try { localStorage.setItem("kb-main-scene", "yard"); } catch (e) {} GardenHome.open("yard"); GardenHome.close(); return 1;'); await sleep(800);
    // Xưởng: "Chọn ảnh…" → hình daruma vẽ sẵn chuyển thành pixel 32 × 32
    await useDaruma();
    await openCraft();
    await shot('17_xuong');
    await js('GardenCraft.close(); return 1;'); await sleep(400);
    // xưởng vùng: sửa vùng "Tiệm bánh nhỏ"
    await js('GardenHome.open("yard"); document.querySelector("#kb-home button[data-tab=zone]").click(); return 1;'); await sleep(900);
    await js(`const c = Array.prototype.find.call(document.querySelectorAll("#kb-h-list .kb-h-card"), (k) => /Tiệm bánh nhỏ/.test(k.textContent));
      if (c) { c.scrollIntoView({ block: "center" }); const b = Array.prototype.find.call(c.querySelectorAll("button"), (x) => /^Sửa vùng$/.test(x.textContent.trim())); if (b) b.click(); } return 1;`);
    await waitFor('return GardenCraft.isOpen();'); await sleep(1200);
    await shot('17b_xuong_vung');
    await js('GardenCraft.close(); return 1;'); await sleep(300);
    await closeAll();

    // tủ đồ: StackChan (linh vật ở góc trái) đội mũ rơm, đeo kính, khăn quàng, vỏ sakura
    await py(KB + `d = st.load(); c0 = d["coins"]; d["coins"] = 100000; st.save(d)
for w in ("straw", "glasses", "scarf", "sakura"):
    st.buy_wear(w)
d = st.load(); d["coins"] = c0; st.save(d)
kb._dialog.refresh()
result = 1`); await sleep(1800);
    await js('GardenHome.open("yard"); return 1;'); await sleep(1200);
    await js('document.querySelector("#kb-home button[data-tab=wear]").click(); return 1;'); await sleep(1200);
    await shot('15_tu_do');
    await js('document.querySelector("#kb-home button[data-tab=inv]").click(); return 1;'); await sleep(1200);
    await shot('15b_kho_do');
    await closeAll();
  }

  if (ONLY !== 'shots') {
    console.log('== Video');
    await closeAll(); await deck('Tiếng Nhật::N5 · Từ vựng'); await sky(10, 'sunny'); await hideToast();
    await page.eval(CURSOR);
    await useDaruma();
    await recStart();
    mark('momiji');                                                 // nhạc vườn = nhạc giao diện mùa đang dùng (tháng 11: lá đỏ)
    await sleep(3500);                                              // vườn: cây đung đưa, thú nuôi đi lại
    await tap('#kb-review', { wait: 1800 });                        // Tưới ngay
    await tap('#kb-show', { wait: 1400 });
    await tap('#kb-ratings button:nth-child(3)', { wait: 2000 });   // Được → +xu, cây được tưới
    await tap('#kb-show', { wait: 1300 });
    await tap('#kb-ratings button:nth-child(3)', { wait: 1800 });
    await tap('#kb-stop', { wait: 1500 });
    mark('home');                                                   // Nhà: hộp nhạc
    await tap('#kb-house', { wait: 1800 });
    await tap('#kb-home button[data-tab=yard]', { wait: 1400 });
    await page.eval('(() => { const l = document.getElementById("kb-h-list"); if (l) l.scrollBy({ top: 260, behavior: "smooth" }); return 1; })()');
    await sleep(1200);
    // các cảnh: Trong nhà, 6 vùng, vùng tự tạo (nút ở đầu bảng Nhà)
    const sceneBtns = await js(`const bs = Array.prototype.filter.call(document.querySelectorAll(".kb-h-scenes button[data-scene]"), (b) => b.offsetParent);
      return bs.map((b) => b.getAttribute("data-scene"));`);
    console.log('  cảnh:', JSON.stringify(sceneBtns));
    for (let k = 1; k < sceneBtns.length; k++) {          // nút được vẽ lại sau mỗi lần bấm → tìm theo data-scene
      await tap(`.kb-h-scenes button[data-scene="${sceneBtns[k]}"]`, { wait: k === 1 ? 2000 : 1200 });
    }
    await tap(`.kb-h-scenes button[data-scene="${sceneBtns[0]}"]`, { wait: 900 });
    await openCraft((sel) => tap(sel, { wait: 900 }));              // Xưởng: Chọn ảnh… → daruma thành pixel
    await sleep(1600);
    await js('GardenCraft.close(); return 1;'); await sleep(500);
    await tap('#kb-h-exit', { wait: 1000 });
    mark('game');                                                   // Trò chơi
    await tap('#kb-games', { wait: 1600 });
    await tap('.kb-gcard[data-game=market]', { wait: 2400 });
    // trả lời đúng hai khách: tìm nghĩa của từ khách hỏi trong deck
    for (let k = 0; k < 2; k++) {
      const ask = await js('const b = Array.prototype.find.call(document.querySelectorAll("#kb-game *"), (e) => e.children.length === 0 && /「.+」/.test(e.textContent)); return b ? b.textContent : "";');
      const word = (ask.match(/「(.+?)」/) || [])[1];
      if (!word) break;
      const mean = await py(KB + `nids = mw.col.find_notes(${JSON.stringify('"Từ:' + word + '"')}) or mw.col.find_notes(${JSON.stringify('"Kanji:' + word + '"')})\nresult = mw.col.get_note(nids[0])["Nghĩa"] if nids else ""`);
      const idx = await js(`const bs = Array.prototype.slice.call(document.querySelectorAll("#kb-game button")).filter((b) => b.offsetParent && b.textContent.indexOf(${JSON.stringify(mean)}) >= 0); if (!bs.length) return -1; bs[0].setAttribute("data-demo-pick", "1"); return 1;`);
      if (idx < 0) break;
      await tap('[data-demo-pick="1"]', { wait: 2200 });
      await js('const b = document.querySelector("[data-demo-pick]"); if (b) b.removeAttribute("data-demo-pick"); return 1;');
    }
    await js('GardenGames.close(); return 1;'); await sleep(500);
    mark('momiji');
    await sleep(300);
    await tap('#kb-paper-btn', { wait: 2300 });                      // Báo (dòng "Báo mới" của thẻ Hôm nay)
    const word = await js('const ws = document.querySelectorAll("#kb-p-stage .kb-p-w"); const w = ws[Math.min(3, ws.length - 1)]; if (!w) return 0; w.setAttribute("data-demo-word", "1"); return 1;');
    if (word) { await tap('[data-demo-word="1"]', { wait: 2200 }); }
    await page.eval('(() => { const s = document.getElementById("kb-p-stage"); if (s) s.scrollBy({ top: 280, behavior: "smooth" }); return 1; })()');
    await sleep(1500);
    await js('GardenPaper.close(); return 1;'); await sleep(400);
    await js('GardenCal.open({ date: "2026-10-18", tab: "month" }); return 1;'); await sleep(2600);   // Lịch hoa + nhật ký
    await js('GardenCal.open({ tab: "book" }); return 1;'); await sleep(2600);                         // Cuốn nhật ký
    await js('GardenCal.close(); return 1;'); await sleep(400);
    // giao diện mùa, mỗi giao diện một bản nhạc
    for (const [tid, hour, weather] of [['tet', 9, 'sunny'], ['hanami', 10, 'sunny'], ['natsumatsuri', 20, 'sunny'], ['noel', 18, 'snow']]) {
      await py(KB + `st.set_theme("pick", "${tid}"); kb._dialog.refresh()\nresult = 1`);
      mark(tid);
      await sleep(700); await sky(hour, weather); await hideToast(); await sleep(2600);
    }
    await py(KB + 'st.set_theme("auto"); kb._dialog.refresh()\nresult = 1');
    mark('momiji');
    await sleep(700); await sky(20, 'sunny'); await hideToast(); await sleep(3000);   // vườn đêm
    await sky(10, 'sunny'); await sleep(1500);
    await recStop();
  }
  console.log('Xong:', OUT);
  process.exit(0);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
