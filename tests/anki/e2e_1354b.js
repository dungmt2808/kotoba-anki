// 1.35.4 — kịch bản NGOÀI bộ test có sẵn (người dùng 19/11: "kiểm tra lại thật kỹ, test thêm các kịch bản mà ngoài bộ test,
// testcase. vì tớ nghĩ thứ 7 tớ sẽ release bản tiếp theo"). Mỗi mục là một cách dùng "lệch" so với kịch bản chính e2e_1354:
//   1. bấm vội: R / Esc xen kẽ 40 lần không chờ (có lúc Esc khi bảng ôn đang bật nhẹ dở) → trạng thái cuối khớp nhau, không
//      kẹt lớp hiệu ứng / transform, vườn đủ, không lỗi;
//   2. đổi cỡ cửa sổ lúc đang ôn rồi Esc → bề ngang vườn = bề ngang lúc mở thẳng ở cỡ mới;
//   3. đổi deck (ô deck ở thanh trên) lúc đang ôn → bảng ôn đóng, vườn về, không lỗi;
//   4. cỡ cảnh Lớn + giao diện mùa (Giáng sinh) + cửa sổ 1600 × 900: mở / đóng bảng ôn, cảnh giữ bề ngang;
//   5. cửa sổ hẹp 800 × 600: không tràn ngang, bảng ôn / nút nằm trọn trong phần nhìn thấy (thanh cuộn không đè lên nút);
//   6. Anki chế độ tối: mở / đóng bảng ôn không lỗi, chế độ đổi cùng khung hình;
//   7. Báo đang viết (khoá lựa chọn): danh sách deck ẩn, ô "Lấy từ" khoá; viết xong → danh sách hiện lại đúng chỗ;
//   8. xoá deck / đổi tên deck lúc danh sách deck đang mở → vẽ lại đúng (deck xoá biến mất khỏi lựa chọn), không lỗi;
//   9. tên deck lạ: dấu ngoặc kép, <b>, &, khoảng trắng đôi, 60 ký tự → hiện đúng chữ (không thành HTML), tick đúng deck;
//  10. 150 deck lồng 3 cấp: mở danh sách < 1,5 s, gõ tìm < 150 ms / phím, mở hết nhánh / thu hết không lỗi;
//  11. đổi "Lấy từ" liên tục không chờ (12 lần) → ô, danh sách, collection khớp nhau ở cuối;
//  12. Esc khi bảng nổi ⚙ đang mở chỉ đóng bảng ⚙, cửa sổ vườn còn.
// Chạy: KB_SCRIPTS=e2e_1354b.js run_ui.sh ADDON SHOTS
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots';
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
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { if (await js('return !!(' + expr + ');')) return true; } catch (e) { /* bỏ qua */ } await sleep(120); }
  return false;
}
async function setDeck(name) { await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name(' + JSON.stringify(name) + '); d.refresh(); result = 1'); await sleep(1500); }
const STATE = `const $ = (i) => document.getElementById(i), app = $("kb-app");
  const big = ["kb-panel", "kb-game", "kb-home", "kb-paper", "kb-cal", "kb-ui", "kb-fields"].filter((i) => !$(i).hidden);
  const stuck = ["kb-panel", "kb-yard-wrap", "kb-field"].filter((i) => /kb-panel-in|kb-panel-fade|kb-garden-in|kb-garden-fade/.test($(i).className));
  const tf = ["kb-yard-wrap", "kb-field", "kb-panel"].map((i) => getComputedStyle($(i)).transform).filter((t) => t !== "none");
  return JSON.stringify({ big: big.join(","), mode: (app.className.match(/kb-ui-m-(\\w+)/) || [])[1], bar: !!document.querySelector(".kb-bar").offsetParent,
    yard: !!$("kb-yard-wrap").offsetParent, field: !!$("kb-field").offsetParent, stuck: stuck, tf: tf, yw: Math.round($("kb-yard").getBoundingClientRect().width),
    fw: $("kb-canvas").width, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, iw: innerWidth });`;
const st = async () => JSON.parse(await js(STATE));

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await js('if (window.GardenGreet && GardenGreet.close) GardenGreet.close(); if (window.GardenTour && GardenTour.close) GardenTour.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1');
  await setDeck('B::Có câu ví dụ, không audio');

  console.log('== 1. bấm vội R / Esc 40 lần');
  for (let i = 0; i < 40; i++) {
    if (i % 2 === 0) { await page.key('r', 'KeyR', 82); } else { await page.key('Escape', 'Escape', 27); }
    await sleep(i % 5 === 0 ? 0 : 30 + (i * 37) % 90);
  }
  await sleep(1200);
  let s = await st();
  ok(!s.stuck.length && !s.tf.length, 'không kẹt lớp hiệu ứng / transform (' + JSON.stringify([s.stuck, s.tf]) + ')');
  ok((s.big === 'kb-panel' && s.mode === 'review') || (s.big === '' && s.mode === 'main' && s.bar && s.yard && s.field), 'trạng thái cuối khớp nhau: bảng "' + s.big + '", chế độ ' + s.mode);
  if (s.big) { await page.key('Escape', 'Escape', 27); await sleep(700); s = await st(); }
  ok(s.big === '' && s.mode === 'main' && s.bar && s.yard && s.field, 'Esc → về vườn đủ thanh trên, sân, ruộng');
  // Esc ngay khi bảng vừa hiện (đang bật nhẹ dở)
  await page.key('r', 'KeyR', 82); await waitFor('!document.getElementById("kb-panel").hidden'); await page.key('Escape', 'Escape', 27); await sleep(700);
  s = await st();
  ok(s.big === '' && !s.stuck.length && !s.tf.length, 'Esc khi bảng ôn đang bật nhẹ dở: đóng gọn, không kẹt transform');

  console.log('== 2. đổi cỡ cửa sổ lúc đang ôn rồi Esc');
  await page.key('r', 'KeyR', 82); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(500);
  await py(KB + 'kb._dialog.resize(1600, 900); result = 1'); await sleep(1200);
  await page.key('Escape', 'Escape', 27); await sleep(1000);
  const a2 = await st();
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1000);
  await py(KB + 'kb._dialog.resize(1600, 900); result = 1'); await sleep(1200);
  const b2 = await st();
  ok(a2.yw === b2.yw && a2.fw === b2.fw, 'sau Esc: sân ' + a2.yw + ' / ruộng ' + a2.fw + ' px = mở thẳng ở 1600 × 900 (' + b2.yw + ' / ' + b2.fw + ')');

  console.log('== 3. đổi deck lúc đang ôn');
  await page.key('r', 'KeyR', 82); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(500);
  const did = await py(KB + 'result = mw.col.decks.id_for_name("C::Chỉ từ + audio từ")');
  await js('const s = document.getElementById("kb-deck"); if (![...s.options].some((o) => o.value === "' + did + '")) { const o = document.createElement("option"); o.value = "' + did + '"; s.appendChild(o); } s.value = "' + did + '"; s.dispatchEvent(new Event("change")); return 1;');
  await sleep(1500);
  s = await st();
  ok(s.big === '' && s.mode === 'main' && s.yard && s.field && !s.stuck.length, 'đổi deck → bảng ôn đóng, về vườn của deck mới');

  console.log('== 4. cỡ cảnh Lớn + Giáng sinh');
  await js('GardenUI.setGlob("scene", "large"); GardenSeason.preview("noel"); return 1;'); await sleep(1500);
  const a4 = await st();
  await page.key('r', 'KeyR', 82); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(700);
  const m4 = await st();
  await page.key('Escape', 'Escape', 27); await sleep(800);
  const b4 = await st();
  await page.shot(SHOTS + '/1354b_04_lon_giang_sinh.png');
  ok(a4.yw === b4.yw && a4.fw === b4.fw && (m4.yw === a4.yw || !m4.yard), 'cảnh Lớn: sân ' + a4.yw + ' → ' + m4.yw + ' → ' + b4.yw + ' px, ruộng ' + a4.fw + ' → ' + b4.fw);
  await js('GardenUI.setGlob("scene", "normal"); GardenSeason.preview(null); return 1;'); await sleep(800);

  console.log('== 5. cửa sổ hẹp 800 × 600');
  await py(KB + 'kb._dialog.resize(800, 600); result = 1'); await sleep(1200);
  await page.key('r', 'KeyR', 82); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(700);
  const n5 = JSON.parse(await js(`const p = document.getElementById("kb-panel").getBoundingClientRect(), cw = document.documentElement.clientWidth;
    const btns = [...document.querySelectorAll("#kb-panel button")].filter((b) => b.offsetParent).map((b) => b.getBoundingClientRect());
    return JSON.stringify({ right: Math.round(p.right), cw: cw, sw: document.documentElement.scrollWidth, iw: innerWidth, out: btns.filter((r) => r.right > cw + 0.5).length });`));
  await page.shot(SHOTS + '/1354b_05_hep_800.png');
  ok(n5.right <= n5.cw && n5.out === 0, '800 × 600: bảng ôn (mép phải ' + n5.right + ') + mọi nút nằm trọn trong phần nhìn thấy (' + n5.cw + ' px, thanh cuộn không đè)');
  ok(n5.sw <= n5.iw, 'không tràn ngang (' + n5.sw + ' ≤ ' + n5.iw + ')');
  await page.key('Escape', 'Escape', 27); await sleep(700);
  await py(KB + 'kb._dialog.resize(1366, 768); result = 1'); await sleep(1000);

  console.log('== 6. Anki chế độ tối');
  const nm = await py('from aqt.theme import theme_manager\nresult = bool(theme_manager.night_mode)');
  await py('from aqt.theme import theme_manager, Theme\nfrom aqt import mw\nmw.pm.set_theme(Theme.DARK)\ntheme_manager.apply_style()\nresult = 1').catch(() => {});
  await sleep(1500);
  const e6 = page.errors.length;
  await js('window.__f6 = []; const tick = () => { if (!window.__r6) return; const m = (document.getElementById("kb-app").className.match(/kb-ui-m-(\\w+)/) || [])[1]; window.__f6.push(!document.getElementById("kb-panel").hidden === (m === "review")); requestAnimationFrame(tick); }; window.__r6 = true; requestAnimationFrame(tick); return 1;');
  await page.key('r', 'KeyR', 82); await waitFor('!document.getElementById("kb-panel").hidden'); await sleep(600);
  await page.key('Escape', 'Escape', 27); await sleep(600);
  const f6 = JSON.parse(await js('window.__r6 = false; return JSON.stringify(window.__f6);'));
  ok(f6.length > 5 && f6.every(Boolean) && page.errors.length === e6, 'chế độ tối (' + (nm ? 'đã bật sẵn' : 'bật') + '): mở / đóng bảng ôn — ' + f6.length + ' khung, chế độ khớp bảng, không lỗi');
  await py('from aqt.theme import theme_manager, Theme\nfrom aqt import mw\nmw.pm.set_theme(Theme.LIGHT)\ntheme_manager.apply_style()\nresult = 1').catch(() => {});
  await sleep(800);

  // =====================================================================================================================
  console.log('== 7. Báo đang viết → khoá; viết xong → danh sách deck hiện lại');
  await py(KB + 'kb._dialog.resize(1280, 900); result = 1'); await sleep(600);
  await js('GardenPaper.open("src"); return 1;');
  const SEL = '.kb-ai-lang select[aria-label="Lấy từ cho Báo tiếng Nhật"]';
  ok(await waitFor(`document.querySelector('${SEL}')`), 'tab Nguồn báo');
  const choose = async (v, wait = 350) => { await js(`const s = document.querySelector('${SEL}'); s.value = "${v}"; s.dispatchEvent(new Event("change")); return 1;`); await sleep(wait); };
  const pst = () => js(`const s = document.querySelector('${SEL}'), b = s.closest(".kb-ai-lang"); return JSON.stringify({ sel: s.value, dis: s.disabled, list: !!b.querySelector(".kb-ai-decks"), n: b.querySelectorAll(".kb-ai-deck").length });`).then(JSON.parse);
  await choose('pick');
  ok((await pst()).list, 'Chọn deck… → danh sách mở');
  await py(KB + 'kb._ai["running"] = True\nkb._ai_push()\nresult = 1'); await sleep(400);
  let p7 = await pst();
  ok(!p7.list && p7.dis && p7.sel === 'pick', 'đang viết báo: danh sách deck ẩn, ô "Lấy từ" khoá, vẫn ghi "Chọn deck…"');
  await py(KB + 'kb._ai["running"] = False\nkb._ai_push()\nresult = 1'); await sleep(400);
  p7 = await pst();
  ok(p7.list && !p7.dis && p7.sel === 'pick', 'viết xong: danh sách deck hiện lại, ô mở khoá');

  console.log('== 8. xoá / đổi tên deck lúc danh sách đang mở');
  await py(`
col = mw.col
m = col.models.by_name("Từ vựng KB")
for nm in ("ZZ::Xoá thử", "ZZ::Đổi tên thử"):
    n = col.new_note(m); n.fields[0] = "削除" + nm[-2:]; n.fields[1] = "xoá"
    col.add_note(n, col.decks.id(nm))
result = 1`).catch((e) => console.log('   (tạo deck: ' + e.message.split('\n').slice(-2).join(' ') + ')'));
  await py(KB + 'kb._ai_push()\nresult = 1'); await sleep(500);
  const ZX = await py(KB + 'result = mw.col.decks.id_for_name("ZZ::Xoá thử")');
  const has = (id) => js(`return !!document.querySelector('.kb-ai-deck[data-id="${id}"]');`);
  ok(ZX && await has(ZX), 'deck mới "ZZ::Xoá thử" có trong danh sách sau khi vẽ lại');
  await js(`const t = document.querySelector('.kb-ai-lang [data-tog="' + ${JSON.stringify(String(await py(KB + 'result = mw.col.decks.id_for_name("ZZ")')))} + '"]'); if (t && t.textContent === "▸") t.click(); return 1;`); await sleep(200);
  await js(`document.querySelector('.kb-ai-deck[data-id="${ZX}"] input').click(); return 1;`); await sleep(500);
  ok(JSON.stringify((await py(KB + 'result = kb.words.load_src(mw.col)["ja"]["decks"]'))) === JSON.stringify([ZX]), 'tick deck sắp xoá');
  await py(KB + 'mw.col.decks.remove([mw.col.decks.id_for_name("ZZ::Xoá thử")])\nkb._ai_push()\nresult = 1'); await sleep(600);
  p7 = await pst();
  ok(!(await has(ZX)) && p7.list, 'xoá deck lúc danh sách mở: deck biến mất, danh sách vẫn mở');
  ok((await py(KB + 'result = kb.words.load_src(mw.col)["ja"]["decks"]')).length === 0, 'collection: deck đã xoá không còn trong lựa chọn của báo');
  const ZR = await py(KB + 'result = mw.col.decks.id_for_name("ZZ::Đổi tên thử")');
  await py(KB + 'd = mw.col.decks.get(' + ZR + ')\nmw.col.decks.rename(d, "ZZ::Tên mới")\nkb._ai_push()\nresult = 1'); await sleep(600);
  const zr = await js(`const l = document.querySelector('.kb-ai-deck[data-id="${ZR}"]'); return l ? l.title + "|" + l.querySelector(".kb-ai-dleaf").textContent : "";`);
  ok(zr === 'ZZ::Tên mới|Tên mới', 'đổi tên deck: dòng ghi tên mới (' + zr + ')');

  console.log('== 9. tên deck lạ');
  const ODD = 'ZZ::"Ngoặc" <b>đậm</b> & và  hai  cách — ' + 'x'.repeat(30);
  await py(`
col = mw.col
m = col.models.by_name("Từ vựng KB")
n = col.new_note(m); n.fields[0] = "奇妙"; n.fields[1] = "lạ"
col.add_note(n, col.decks.id(${JSON.stringify(ODD)}))
import sys
sys.modules["kotoba_batake"]._ai_push()
result = 1`); await sleep(600);
  const OD = await py(KB + 'result = mw.col.decks.id_for_name(' + JSON.stringify(ODD) + ')');
  const od = JSON.parse(await js(`const l = document.querySelector('.kb-ai-deck[data-id="${OD}"]'); return JSON.stringify(l ? { leaf: l.querySelector(".kb-ai-dleaf").textContent, b: !!l.querySelector("b"), title: l.title, w: Math.round(l.getBoundingClientRect().width), lw: Math.round(l.closest(".kb-ai-decks-list").getBoundingClientRect().width) } : null);`));
  const oddName = await py(KB + 'result = mw.col.decks.name(' + OD + ')');
  ok(od && od.leaf === oddName.split('::').slice(1).join('::') && !od.b && od.title === oddName, 'tên có "…" <b> & khoảng trắng đôi: hiện đúng chữ, không thành HTML (' + (od && od.leaf.slice(0, 40)) + '…)');
  ok(od && od.w <= od.lw + 1, 'tên dài không tràn khỏi khung danh sách (' + (od && od.w) + ' ≤ ' + (od && od.lw) + ')');
  await js(`document.querySelector('.kb-ai-deck[data-id="${OD}"] input').click(); return 1;`); await sleep(500);
  ok(JSON.stringify(await py(KB + 'result = kb.words.load_src(mw.col)["ja"]["decks"]')) === JSON.stringify([OD]), 'tick đúng deck tên lạ');
  await js(`document.querySelector('.kb-ai-deck[data-id="${OD}"] input').click(); return 1;`); await sleep(400);

  console.log('== 10. 150 deck lồng 3 cấp');
  await py(`
col = mw.col
m = col.models.by_name("Từ vựng KB")
for a in range(5):
    for b in range(6):
        for c in range(5):
            n = col.new_note(m); n.fields[0] = "語%d%d%d" % (a, b, c); n.fields[1] = "từ"
            col.add_note(n, col.decks.id("Lớp %d::Chương %d::Bài %d" % (a, b, c)))
result = 1`);
  await choose('all', 200);
  const t10 = await js(`const t0 = performance.now(); const s = document.querySelector('${SEL}'); s.value = "pick"; s.dispatchEvent(new Event("change")); return Math.round(performance.now() - t0);`);
  await sleep(400);
  const n10 = (await pst()).n;
  ok(n10 >= 180 && t10 < 1500, 'mở danh sách ' + n10 + ' deck: ' + t10 + ' ms');
  await js('const q = document.querySelector(".kb-ai-lang .kb-ai-dq"); q.focus(); return 1;');
  const tk = [];
  for (const ch of 'lop 3 bai 4') { const t0 = Date.now(); await page.send('Input.insertText', { text: ch }); tk.push(Date.now() - t0); }
  await sleep(200);
  const hits = await js('return [...document.querySelectorAll(".kb-ai-lang .kb-ai-deck")].filter((l) => !l.hidden).map((l) => l.title);');
  // như ô deck ở thanh trên: mọi từ gõ vào phải có trong tên (không cần liền nhau) → có cả "Lớp 4::Chương 3::…"
  const n3 = (t) => /^Lớp \d::Chương \d::Bài \d$/.test(t) && /3/.test(t) && /4/.test(t);
  ok(hits.length >= 6 && hits.every(n3) && [0, 1, 2, 3, 4, 5].every((c) => hits.includes('Lớp 3::Chương ' + c + '::Bài 4')),
    'gõ "lop 3 bai 4" → ' + hits.length + ' deck, có đủ 6 deck Lớp 3 › Chương * › Bài 4, deck nào cũng có đủ các từ');
  ok(Math.max(...tk) < 150, 'mỗi phím gõ ≤ 150 ms (lâu nhất ' + Math.max(...tk) + ' ms, gồm cả đi về qua CDP)');
  await page.key('Escape', 'Escape', 27); await sleep(200);
  const e10 = page.errors.length;
  for (let k = 0; k < 3; k++) {     // mở hết rồi thu hết các nhánh đang hiện
    await js('[...document.querySelectorAll(".kb-ai-lang .kb-ai-dtog.has-kids")].filter((t) => t.offsetParent && t.textContent === "▸").forEach((t) => t.click()); return 1;'); await sleep(150);
  }
  const all10 = await js('return [...document.querySelectorAll(".kb-ai-lang .kb-ai-deck")].filter((l) => !l.hidden).length;');
  ok(all10 === n10, 'mở hết nhánh: hiện đủ ' + all10 + ' / ' + n10 + ' deck');
  await page.shot(SHOTS + '/1354b_10_150_deck.png');
  await js('[...document.querySelectorAll(".kb-ai-lang .kb-ai-dtog.has-kids")].filter((t) => t.offsetParent && t.textContent === "▾").reverse().forEach((t) => t.click()); return 1;'); await sleep(200);
  const top10 = await js('return [...document.querySelectorAll(".kb-ai-lang .kb-ai-deck")].filter((l) => !l.hidden).every((l) => (l.style.getPropertyValue("--kb-dd") || "0") === "0");');
  ok(top10 && page.errors.length === e10, 'thu hết: chỉ còn deck cấp đầu, không lỗi');

  console.log('== 11. đổi "Lấy từ" liên tục không chờ');
  const seq = ['level', 'pick', 'all', 'pick', 'level', 'level', 'pick', 'all', 'level', 'pick', 'all', 'level'];
  for (const v of seq) { await choose(v, 0); }
  await sleep(800);
  const p11 = await pst(), sv11 = await py(KB + 'result = kb.words.load_src(mw.col)["ja"]');
  ok(p11.sel === 'level' && !p11.list && sv11.mode === 'level' && sv11.decks.length === 0, 'cuối cùng "Không dùng deck": ô, danh sách, collection khớp (' + JSON.stringify([p11.sel, p11.list, sv11.mode]) + ')');
  await choose('all');
  await js('GardenPaper.close(); return 1;'); await sleep(300);

  console.log('== 12. Esc khi bảng ⚙ đang mở');
  await page.click('#kb-sound'); await sleep(300);
  await page.key('Escape', 'Escape', 27); await sleep(500);
  const alive = await py(KB + 'result = bool(kb._dialog) and kb._dialog.isVisible()');
  ok(alive && await js('return document.getElementById("kb-sound-pop").hidden;'), 'Esc: chỉ đóng bảng ⚙, cửa sổ vườn còn');

  const errs = await py(KB + 'result = [e.get("where") + ": " + str(e.get("msg"))[:100] for e in kb.ERRORS.entries()]');
  ok(errs.length === 0, 'nhật ký lỗi add-on trống' + (errs.length ? ': ' + errs.join(' | ') : ''));
  ok(page.errors.length === 0, 'không có lỗi JS' + (page.errors.length ? ': ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log('\n' + results.filter(Boolean).length + '/' + results.length + ' kiểm tra đạt');
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(1); });
