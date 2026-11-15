// 1.22.3 trong Anki thật (người dùng: "test khóa vừa xong thì gemini chạy ngay lập tức, không kịp cấu hình gì cả";
// "lúc chọn 5 deck thì thanh kéo lại nhảy về cái deck đầu tiên"; "tất cả nên có nút tìm kiếm deck"):
// - dán khoá lần đầu → Thử khoá đúng → KHÔNG tự viết (cả khi vườn làm mới / mở lại), có khối "Bước 3 · Bắt đầu viết";
//   bấm "Bắt đầu viết" mới viết; đổi khoá khi đã có khoá thì như cũ; Xoá khoá rồi dán lại thì lại chờ;
// - 1.22.4: đang có báo tiếng Nhật, tick thêm Tiếng Anh → báo tiếng Anh chờ (khối "Vừa bật Báo tiếng Anh"), bấm mới viết;
// - Nguồn báo → Chọn deck (24 deck): cuộn xuống tick một deck → danh sách giữ nguyên vị trí; ô tìm deck (bỏ dấu, "::")
//   lọc đúng, tick khi đang lọc vẫn giữ chữ tìm + bộ lọc, Esc xoá chữ tìm;
// - thanh trên: nút kính lúp / phím / → bảng tìm deck, gõ → lọc, ↑ ↓ Enter → đổi deck, Esc chỉ đóng bảng (vườn vẫn mở);
// - không tràn / đè ở 1366 và 1024 px, không lỗi JS. Gemini được thay bằng hàm giả (không gọi mạng, không tốn lượt).
// Chạy: node e2e_1223.js SHOTS
const { pages, Page, sleep } = require('./cdp');
const { MEASURE } = require('./measure');
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenPaper !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
let page;
const W = (expr) => '(() => { ' + expr + ' })()';
const js = (expr) => page.eval(W(expr));
async function waitFor(expr, ms = 8000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await page.eval(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
const KB = 'import sys, os, time, json\nkb = sys.modules["kotoba_batake"]\n';
const starts = () => py(KB + 'result = list(kb._kb_starts)');
const flash = () => js('const f = document.querySelector(".kb-ai-flash"); return f ? f.textContent : "";');
async function measure(name) {
  const m = await page.eval(MEASURE);
  await page.shot(SHOTS + '/1223_' + name + '.png');
  return m;
}

(async () => {
  // 24 deck tiếng Nhật "N4::Bài 15" … "N4::Bài 38" (mỗi deck một note chép từ deck A) + Gemini giả
  await py(KB + `col = mw.col
src = col.get_note(col.db.list("select nid from cards where did = ?", col.decks.id_for_name("A::Có câu ví dụ + audio"))[0])
for i in range(15, 39):
    did = col.decks.id("N4::Bài %d" % i)
    n = col.new_note(src.note_type())
    for k in src.keys(): n[k] = src[k]
    n[src.keys()[0]] = src[src.keys()[0]] + str(i)
    col.add_note(n, did)
kb.save_config(gemini_key="", gemini_auto=True)
kb._kb_starts = []
kb._kb_done = set()          # báo coi như hôm nay đã có số (ai_start trả False như thật)
def _fake_start(reason, dialog=None, lang="ja"):
    if lang in kb._kb_done:
        return False
    kb._kb_starts.append([reason, lang])
    return True
kb.ai_start = _fake_start
kb.ai.test_key = lambda client, prefer="": {"model": "gemini-thu", "models": ["gemini-thu"], "tts": True}
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 768); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1');
  await sleep(2500);
  await js('if (window.GardenPaper) GardenPaper.close(); const t = document.getElementById("kb-toast"); if (t) t.hidden = true; return 1;');
  page.errors.splice(0);

  console.log('== dán khoá lần đầu → chờ bấm "Bắt đầu viết"');
  await py(KB + 'kb._kb_starts.clear(); result = 1');
  await js('GardenPaper.open("src"); return 1;'); await sleep(1200);
  await js(`const i = document.querySelector(".kb-ai-key"); i.value = "AQ.Ab8RN6Ka" + "x7Yq-Pz_Lm2Nv8Rt4Wb1Kc9Df3Gh6Jk0Sa5Ue";
    Array.from(document.querySelectorAll("button")).find((x) => x.textContent === "Thử khoá").click(); return 1;`);
  const f1 = await waitFor('(() => { const f = document.querySelector(".kb-ai-flash"); return f && /Khoá dùng được/.test(f.textContent) ? f.textContent : ""; })()', 15000);
  ok(f1 && /Bắt đầu viết/.test(f1), 'Thử khoá đúng → "' + f1 + '"');
  await sleep(1500);
  ok((await starts()).length === 0, 'thử khoá xong KHÔNG tự viết (vườn đã làm mới)');
  ok(await py(KB + 'result = kb.config().get("gemini_wait_start") is True and kb.config().get("gemini_key", "").startswith("AQ.")'), 'đã lưu khoá AQ. + cờ chờ bấm Bắt đầu viết');
  const sb = await js('const b = document.querySelector(".kb-ai-start"); if (!b) return null; const go = b.querySelector("button"); return { t: b.textContent, btn: go && go.textContent, dis: go && go.disabled };');
  ok(sb && /Bước 3/.test(sb.t) && sb.btn === 'Bắt đầu viết' && !sb.dis, 'thẻ Gemini có khối "Bước 3 · … Bắt đầu viết"');
  const today = await js('return Array.from(document.querySelectorAll(".kb-ai-lang")).map((b) => { const r = Array.from(b.querySelectorAll(".kb-ai-row")).find((x) => /Hôm nay/.test(x.textContent)); return r ? r.textContent : ""; });');
  ok(today.length && today.every((t) => /chờ bấm/.test(t) && !/Viết$/.test(t)), 'mỗi báo ghi "Hôm nay: chờ bấm Bắt đầu viết" (không có nút Viết riêng)');
  await measure('cho_bat_dau');
  await py(KB + 'kb._dialog.refresh(); kb.ai_start_all("auto"); result = 1'); await sleep(1500);
  ok((await starts()).length === 0, 'vườn làm mới / mở hồ sơ (tự viết) vẫn chờ, không viết');

  console.log('== Chọn deck: 24 deck, cuộn + tick giữ vị trí, ô tìm deck');
  await js('GardenPaper.open("src"); return 1;'); await sleep(900);
  await js('Array.from(document.querySelectorAll(".kb-ai-lang")[0].querySelectorAll(".kb-ai-chip")).find((b) => /Chọn deck/.test(b.textContent)).click(); return 1;');
  ok(await waitFor('document.querySelector(".kb-ai-decks-list")'), 'mở danh sách deck của báo tiếng Nhật');
  const n0 = await js('return document.querySelectorAll(".kb-ai-decks-list .kb-ai-deck").length;');
  ok(n0 >= 24, 'danh sách có ' + n0 + ' deck, có ô "Tìm deck…"' + (await js('return !!document.querySelector(".kb-ai-dq");') ? '' : ' — THIẾU Ô TÌM'));
  await js('const l = document.querySelector(".kb-ai-decks-list"); l.scrollTop = l.scrollHeight; return 1;'); await sleep(200);
  const sc0 = await js('return document.querySelector(".kb-ai-decks-list").scrollTop;');
  await js('const labs = Array.from(document.querySelectorAll(".kb-ai-decks-list .kb-ai-deck")); labs[labs.length - 2].querySelector("input").click(); return 1;');
  await waitFor('document.querySelectorAll(".kb-ai-decks-list input:checked").length === 1');
  await sleep(600);
  const sc1 = await js('return document.querySelector(".kb-ai-decks-list").scrollTop;');
  ok(sc0 > 100 && Math.abs(sc1 - sc0) <= 2, 'tick deck gần cuối: danh sách giữ vị trí cuộn (' + sc0 + ' → ' + sc1 + ', trước đây về 0)');
  const pk1 = await py(KB + 'result = kb.words.load_src(mw.col)["ja"]["decks"]');
  ok(pk1.length === 1, 'đã lưu 1 deck vào collection');
  // gõ tìm (bỏ dấu, "::" như dấu cách)
  await js('const q = document.querySelector(".kb-ai-dq"); q.focus(); return 1;');
  await page.send('Input.insertText', { text: 'bai 2' });
  await sleep(300);
  const vis = await js('return Array.from(document.querySelectorAll(".kb-ai-decks-list .kb-ai-deck")).filter((l) => !l.hidden).map((l) => l.textContent.trim().split(" ").slice(0, 3).join(" "));');
  // mọi từ gõ vào phải có trong tên (không cần đúng thứ tự): "bai 2" → Bài 20–29 và Bài 32
  ok(vis.length === 11 && vis.every((t) => /N4::Bài (2\d|32)/.test(t)), 'gõ "bai 2" (không dấu) → ' + vis.length + ' deck: Bài 20–29, Bài 32');
  const cnt = await js('return document.querySelector(".kb-ai-dfind .kb-ai-hint").textContent;');
  ok(/^11 \/ \d+ deck$/.test(cnt), 'đếm "' + cnt + '"');
  await js('Array.from(document.querySelectorAll(".kb-ai-decks-list .kb-ai-deck")).filter((l) => !l.hidden)[3].querySelector("input").click(); return 1;');
  await waitFor('document.querySelectorAll(".kb-ai-decks-list input:checked").length === 2');
  await sleep(500);
  const after = await js('const q = document.querySelector(".kb-ai-dq"); return { q: q.value, vis: Array.from(document.querySelectorAll(".kb-ai-decks-list .kb-ai-deck")).filter((l) => !l.hidden).length };');
  ok(after.q === 'bai 2' && after.vis === 11, 'tick khi đang lọc: vẽ lại vẫn giữ chữ tìm + bộ lọc (' + JSON.stringify(after) + ')');
  await measure('chon_deck_tim');
  await js('const q = document.querySelector(".kb-ai-dq"); q.focus(); return 1;');
  await page.key('Escape', 'Escape', 27); await sleep(300);
  const esc = await js('return { q: document.querySelector(".kb-ai-dq").value, open: !document.getElementById("kb-paper").hidden, vis: Array.from(document.querySelectorAll(".kb-ai-decks-list .kb-ai-deck")).filter((l) => !l.hidden).length };');
  ok(esc.q === '' && esc.open && esc.vis === n0, 'Esc trong ô tìm: xoá chữ tìm, bảng Báo vẫn mở');
  await js('Array.from(document.querySelectorAll(".kb-ai-decks button")).find((b) => b.textContent === "Xong").click(); return 1;'); await sleep(500);

  console.log('== bấm "Bắt đầu viết"');
  await py(KB + 'kb._kb_starts.clear(); result = 1');
  await js('document.querySelector(".kb-ai-start button").click(); return 1;');
  ok(await waitFor('!document.querySelector(".kb-ai-start")', 5000), 'khối Bắt đầu viết biến mất');
  const st1 = await starts();
  ok(st1.length >= 1 && st1[0][0] === 'manual', 'bấm "Bắt đầu viết" → bắt đầu viết (' + JSON.stringify(st1) + ')');
  ok(await py(KB + 'result = not kb.config().get("gemini_wait_start")'), 'bỏ cờ chờ: từ giờ tự viết như cũ');
  await py(KB + 'kb._kb_starts.clear(); kb.ai_start_all("auto"); result = 1');
  ok((await starts()).length >= 1, 'sau đó vườn mở lại thì tự viết bình thường');

  console.log('== 1.22.4: đang có báo tiếng Nhật, tick thêm Tiếng Anh → chờ bấm "Bắt đầu viết"');
  // người dùng: "lúc đang chọn tiếng Nhật, chuyển qua Tiếng Anh, thì nó cũng tự động viết báo luôn, không chờ cấu hình gì cả"
  const tick = (name) => js(`const l = Array.from(document.querySelectorAll(".kb-ai-want .kb-ai-tick")).find((x) => x.textContent.trim() === ${JSON.stringify(name)});
    l.querySelector("input").click(); return 1;`);
  const langsNow = () => py(KB + 'result = kb.config().get("gemini_langs")');
  await js('GardenPaper.open("src"); return 1;'); await sleep(800);
  await tick('Tiếng Anh');
  const off = await (async () => { for (let k = 0; k < 30; k++) { const l = await langsNow(); if (JSON.stringify(l) === '["ja"]') return true; await sleep(200); } return false; })();
  ok(off, 'bỏ tick Tiếng Anh → chỉ còn báo tiếng Nhật');
  await py(KB + 'kb._kb_done = {"ja"}; kb._kb_starts.clear(); result = 1');      // báo tiếng Nhật hôm nay đã có
  await sleep(600);
  await tick('Tiếng Anh');
  const on = await (async () => { for (let k = 0; k < 30; k++) { const l = await langsNow(); if (JSON.stringify(l) === '["ja","en"]') return true; await sleep(200); } return false; })();
  await sleep(1500);
  ok(on && (await starts()).length === 0, 'tick thêm Tiếng Anh → KHÔNG tự viết báo tiếng Anh (' + JSON.stringify(await starts()) + ')');
  ok(JSON.stringify(await py(KB + 'result = kb.config().get("gemini_wait_langs")')) === '["en"]' && !(await py(KB + 'result = kb.config().get("gemini_wait_start")')),
    'chỉ báo tiếng Anh chờ (gemini_wait_langs = ["en"])');
  const blk = await waitFor('(() => { const b = document.querySelector(".kb-ai-start"); return b ? b.textContent : ""; })()', 5000);
  ok(/Vừa bật Báo tiếng Anh/.test(blk || '') && /Bắt đầu viết/.test(blk || ''), 'khối "Vừa bật Báo tiếng Anh · … Bắt đầu viết"');
  const rows2 = await js('return Array.from(document.querySelectorAll(".kb-ai-lang")).map((b) => { const r = Array.from(b.querySelectorAll(".kb-ai-row")).find((x) => /Hôm nay/.test(x.textContent)); return [b.querySelector(".kb-ai-lang-h b").textContent, r ? r.textContent : ""]; });');
  const en = rows2.find((r) => /Anh/.test(r[0])), ja = rows2.find((r) => /Nhật/.test(r[0]));
  ok(en && /chờ bấm/.test(en[1]) && ja && !/chờ bấm/.test(ja[1]), 'báo tiếng Anh "chờ bấm", báo tiếng Nhật vẫn như cũ');
  await measure('them_tieng_anh');
  await py(KB + 'kb._dialog.refresh(); kb.ai_start_all("auto"); result = 1'); await sleep(1200);
  ok((await starts()).length === 0, 'vườn làm mới / tự viết: vẫn không viết báo tiếng Anh');
  await js('Array.from(document.querySelectorAll(".kb-ai-lang")).find((b) => /Anh/.test(b.querySelector(".kb-ai-lang-h b").textContent)).querySelectorAll(".kb-ai-chip")[0].click(); return 1;');
  await sleep(500);
  ok((await starts()).length === 0, 'đổi trình độ báo tiếng Anh: vẫn chờ');
  await js('document.querySelector(".kb-ai-start button").click(); return 1;');
  ok(await waitFor('!document.querySelector(".kb-ai-start")', 5000), 'bấm "Bắt đầu viết" → khối biến mất');
  ok(JSON.stringify(await starts()) === '[["manual","en"]]', 'bấm "Bắt đầu viết" → viết báo tiếng Anh (' + JSON.stringify(await starts()) + ')');
  ok(JSON.stringify(await py(KB + 'result = kb.config().get("gemini_wait_langs")')) === '[]', 'hết chờ');
  await py(KB + 'kb._kb_done = set(); kb._kb_starts.clear(); result = 1');
  // đổi khoá khi đã có khoá: không chờ
  await js('Array.from(document.querySelectorAll("button")).find((x) => x.textContent === "Đổi khoá").click(); return 1;'); await sleep(400);
  await js(`const i = document.querySelector(".kb-ai-key"); i.value = "AIzaSy" + "D3m0K3yF0rT3st1ngOnly-abcdefghi";
    Array.from(document.querySelectorAll("button")).find((x) => x.textContent === "Thử khoá").click(); return 1;`);
  const f2 = await waitFor('(() => { const f = document.querySelector(".kb-ai-flash"); return f && /Khoá dùng được/.test(f.textContent) ? f.textContent : ""; })()', 15000);
  ok(f2 && !/Bắt đầu viết/.test(f2) && await py(KB + 'result = not kb.config().get("gemini_wait_start")'), 'đổi khoá khi đã có khoá: không phải bấm lại Bắt đầu viết');
  // Xoá khoá rồi dán lại: lại chờ
  for (let i = 0; i < 2; i++) { await js('const b = document.querySelector(".kb-ai-forget"); if (b) b.click(); return 1;'); await sleep(300); }
  await waitFor('document.querySelector(".kb-ai-key")', 5000);
  await js(`const i = document.querySelector(".kb-ai-key"); i.value = "AQ.Ab8RN6Ka" + "x7Yq-Pz_Lm2Nv8Rt4Wb1Kc9Df3Gh6Jk0Sa5Ue";
    Array.from(document.querySelectorAll("button")).find((x) => x.textContent === "Thử khoá").click(); return 1;`);
  await waitFor('document.querySelector(".kb-ai-start")', 15000);
  ok(await py(KB + 'result = kb.config().get("gemini_wait_start") is True'), 'Xoá khoá rồi dán lại → lại chờ bấm Bắt đầu viết');
  await js('GardenPaper.close(); return 1;'); await sleep(400);

  console.log('== tìm deck ở thanh trên (kính lúp, phím /)');
  for (const [w, h] of [[1366, 768], [1024, 700]]) {
    await py(KB + `kb._dialog.resize(${w}, ${h}); result = 1`); await sleep(1500);
    const bar = await js(`const f = document.getElementById("kb-deck-find").getBoundingClientRect(), s = document.getElementById("kb-deck").getBoundingClientRect(), c = document.getElementById("kb-coins").getBoundingClientRect();
      return { f: [Math.round(f.left), Math.round(f.right), Math.round(f.top)], s: Math.round(s.right), c: Math.round(c.left), w: innerWidth, hs: document.documentElement.scrollWidth > innerWidth + 1 };`);
    ok(bar.f[0] >= bar.s && bar.f[1] <= bar.c && bar.f[1] <= bar.w && !bar.hs, w + ' px: nút kính lúp nằm giữa ô Deck và ô xu, không tràn (' + JSON.stringify(bar) + ')');
    await js('document.getElementById("kb-deck-find").click(); return 1;'); await sleep(300);
    const pop = await js(`const p = document.getElementById("kb-deck-pop"), r = p.getBoundingClientRect();
      return { open: !p.hidden, focus: document.activeElement && document.activeElement.id, n: p.querySelectorAll(".kb-deck-item").length, cur: (p.querySelector(".is-cur") || {}).textContent,
        r: [Math.round(r.left), Math.round(r.right), Math.round(r.bottom)], w: innerWidth, h: innerHeight };`);
    ok(pop.open && pop.focus === 'kb-deck-q' && pop.n >= 30 && /A::Có câu ví dụ/.test(pop.cur || '') && pop.r[1] <= pop.w && pop.r[2] <= pop.h,
      w + ' px: bảng tìm deck mở, con trỏ ở ô tìm, ' + pop.n + ' deck, tô đậm deck đang xem, nằm trong cửa sổ');
    const ih = await js('const b = Array.from(document.querySelectorAll("#kb-deck-list .kb-deck-item")); return b.slice(0, 5).map((x) => Math.round(x.getBoundingClientRect().height));');
    ok(ih.every((x) => x >= 22), w + ' px: mỗi deck một dòng đọc được, không bị ép dẹt (cao ' + ih.join('/') + ' px)');
    const m = await measure('tim_deck_' + w);
    ok(!m.hscroll && !m.outside.length, w + ' px: không tràn ngang / không lọt khung');
    await page.send('Input.insertText', { text: 'chi tu' }); await sleep(250);
    const hits = await js('return Array.from(document.querySelectorAll("#kb-deck-list .kb-deck-item")).map((b) => b.textContent);');
    ok(hits.length >= 1 && hits.every((t) => /Chỉ từ/.test(t)), 'gõ "chi tu" (không dấu) → ' + JSON.stringify(hits));
    // xếp: khớp nguyên cụm lên trước ("bai 3" → Bài 30… trước Bài 23)
    await js('const q = document.getElementById("kb-deck-q"); q.value = "bai 3"; q.dispatchEvent(new Event("input")); return 1;'); await sleep(200);
    const rk = await js('return Array.from(document.querySelectorAll("#kb-deck-list .kb-deck-item")).map((b) => b.textContent.replace(/ · đang xem$/, ""));');
    ok(rk.length && /Bài 3\d/.test(rk[0]) && rk.indexOf('N4::Bài 23') > rk.indexOf('N4::Bài 38'), 'gõ "bai 3": Bài 30… lên trước, Bài 23 / 13… sau (' + rk.slice(0, 3).join(', ') + ' … ' + rk.slice(-2).join(', ') + ')');
    await js('const q = document.getElementById("kb-deck-q"); q.value = "chi tu"; q.dispatchEvent(new Event("input")); return 1;'); await sleep(200);
    await page.key('ArrowDown', 'ArrowDown', 40); await page.key('ArrowUp', 'ArrowUp', 38);
    await page.key('Enter', 'Enter', 13);
    const want = hits[0].replace(/ · đang xem$/, '');
    ok(await waitFor('document.getElementById("kb-deck-pop").hidden') &&
       await (async () => { for (let k = 0; k < 30; k++) { if (await py(KB + `result = mw.col.decks.name(kb._dialog.deck_id) == ${JSON.stringify(want)}`)) return true; await sleep(200); } return false; })(),
       'Enter → đổi sang deck "' + want + '", bảng đóng');
    await sleep(1200);
    await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1'); await sleep(1500);
  }
  await js('document.body.focus(); return 1;');
  await page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: '/', code: 'Slash', windowsVirtualKeyCode: 191, text: '/' });
  await page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: '/', code: 'Slash', windowsVirtualKeyCode: 191 });
  await sleep(300);
  ok(await js('return !document.getElementById("kb-deck-pop").hidden && document.activeElement.id === "kb-deck-q";'), 'phím / ở màn chính → mở bảng tìm deck');
  await page.key('Escape', 'Escape', 27); await sleep(400);
  ok(await js('return document.getElementById("kb-deck-pop").hidden;') && await py(KB + 'result = kb._dialog is not None and kb._dialog.isVisible()'), 'Esc chỉ đóng bảng tìm deck, cửa sổ vườn vẫn mở');
  await js('document.getElementById("kb-deck-find").click(); return 1;'); await sleep(200);
  await js('document.querySelector(".kb-title").click(); return 1;'); await sleep(200);
  ok(await js('return document.getElementById("kb-deck-pop").hidden;'), 'bấm ra ngoài → đóng bảng tìm deck');
  ok(page.errors.length === 0, 'không lỗi JS ' + page.errors.slice(0, 2).join(' | '));
  const errs = await py(KB + 'result = kb.ERRORS.entries()');
  ok(!errs.length, 'nhật ký lỗi add-on trống ' + (errs.length ? JSON.stringify(errs).slice(0, 300) : ''));
  const pass = results.filter(Boolean).length;
  console.log('KẾT QUẢ: ' + pass + '/' + results.length);
  page.close(); process.exit(pass === results.length ? 0 : 1);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.stack || e.message); process.exit(2); });
