// 1.20 trong Anki thật: 花暦 · Lịch hoa (tháng / năm / cuốn nhật ký), nhật ký + sticker, luyện viết chạy nền
// (Gemini giả lập trong Python để chắc từng nhánh; Gemini thật: tests/gemini/run_fix.py), Xuất PDF,
// ảnh vườn tự chụp, kệ sách trong nhà, hàng chờ thông báo, cửa sổ 1024 px, nội dung dài tối đa.
// Chạy: node e2e_120.js SHOTS
const fs = require('fs');
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenCal !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
async function waitFor(p, expr, ms = 15000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await p.eval(expr); if (v) return v; } catch (e) { } await sleep(300); }
  return false;
}
const KB = 'import sys, time, datetime, json\nkb = sys.modules["kotoba_batake"]\n';
const W = (expr) => '(() => { ' + expr + ' })()';
const A = (expr) => '(async () => { ' + expr + ' })()';
let page;
const today = () => py(KB + 'result = kb.cal_today().isoformat()');
// phím tắt: gửi KeyboardEvent như e2e_tour.js (CDP keyDown không kèm text thì Chromium không đặt key cho chữ thường)
const keyJS = (k) => page.eval(W('const t = document.activeElement && document.activeElement !== document.body ? document.activeElement : document; t.dispatchEvent(new KeyboardEvent("keydown", {key: ' + JSON.stringify(k) + ', code: "Key" + ' + JSON.stringify(k.toUpperCase()) + ', bubbles: true, cancelable: true})); return 1;'));
const entry = (d) => py(KB + `result = kb.JOURNAL.entry(datetime.date.fromisoformat(${JSON.stringify(d)}))`);
const noOverflow = () => page.eval(W(`const st = document.getElementById("kb-c-stage");
  const bad = Array.from(st.querySelectorAll("*")).filter(e => { const r = e.getBoundingClientRect(), s = st.getBoundingClientRect(); return r.width > 0 && (r.right > s.right + 1 || r.left < s.left - 1); }).slice(0, 3).map(e => e.className);
  return { sw: st.scrollWidth, cw: st.clientWidth, page: document.documentElement.scrollWidth <= window.innerWidth, bad: bad };`));
// Gemini giả lập: mode = ok | long | quota | net | slow
const FAKE = (mode) => KB + `
import threading
ai = kb.ai
def fake(client, models, goc, lang, level, hints):
    kb._fake_calls.append({"lang": lang, "goc": goc, "models": list(models)[:3]})
    mode = ${JSON.stringify(mode)}
    if mode == "slow":
        time.sleep(4)
    if mode == "quota":
        raise ai.AIError("Hôm nay Gemini hết lượt miễn phí.", "quota", daily=True)
    if mode == "net":
        raise ai.AIError("Không kết nối được tới Gemini (kiểm tra mạng)", "net")
    if lang == "en":
        sua = goc.replace("rain ", "rained ").replace(" book ", " booked ")
        loi = [{"goc": "rain", "sua": "rained", "loai": "dạng chia", "quy_tac": "thì quá khứ", "giai_thich": "Chuyện hôm qua thì chia quá khứ."}]
    else:
        sua = goc.replace("寒いでした", "寒かったです").replace("おいしいでした", "おいしかったです")
        loi = [{"goc": "寒いでした", "sua": "寒かったです", "loai": "ngữ pháp", "quy_tac": "tính từ đuôi い (〜かった)", "giai_thich": "Tính từ đuôi い: quá khứ là bỏ い + かった(です)."},
               {"goc": "おいしいでした", "sua": "おいしかったです", "loai": "ngữ pháp", "quy_tac": "tính từ đuôi い (〜かった)", "giai_thich": "Cùng quy tắc như lỗi trên."}]
    nx = "Dùng đúng từ gợi ý. Nhớ quá khứ của tính từ い."
    if mode == "long":
        loi = loi * 3 + [{"goc": "x", "sua": "y", "loai": "từ", "quy_tac": "q", "giai_thich": "g"}]
        for e in loi:
            e["giai_thich"] = "Giải thích rất dài dòng về quy tắc này để thử máy cắt đúng chỗ cho gọn. Câu thứ hai thừa."
        nx = "Bạn đã dùng đúng hết các từ gợi ý và câu văn rất rõ ràng mạch lạc dễ hiểu. Nhưng nhớ chia quá khứ nhé. Câu ba thừa."
        sua = sua + sua
    return {"raw": {"sua": sua, "loi": loi, "con_lai": "Còn 1 lỗi cùng loại ở cuối bài, nhớ sửa nhé bạn ơi, câu này dài quá rồi đó." if mode == "long" else "",
                    "tu_nhien": "", "nhan_xet": nx}, "model": "gemini-flash-lite-latest"}
kb._fake_calls = getattr(kb, "_fake_calls", [])
kb.journal.run_fix = fake
result = 1`;
// lịch sử ôn giả 140 ngày (để có hoa, năm, cuốn nhật ký)
const SEED = KB + `
import random
col = mw.col
rng = random.Random(7)
cids = list(col.db.list("select id from cards limit 400"))
day0 = int(col.sched.day_cutoff) - 86400
rows = []
for back in range(1, 140):
    if rng.random() < 0.15:
        continue
    n = rng.choice([3, 8, 12, 18, 25, 31, 40, 55, 70])
    base = (day0 - back * 86400 + 3600 * 9) * 1000
    for i in range(n):
        typ = 0 if i < n // 5 else 1
        ivl, last = (95, 60) if i % 9 == 0 and typ == 1 else (rng.randint(1, 60), rng.randint(1, 40))
        rows.append((base + i * 1000 + back, rng.choice(cids), -1, 3, ivl, last, 2500, 5000, typ))
col.db.executemany("insert or ignore into revlog (id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", rows)
t = kb.cal_today()
moods = ["vui", "met", "ban", "thu_thai", "hao_hung"]
for back in range(2, 50, 3):
    d = t - datetime.timedelta(days=back)
    kb.JOURNAL.update(d, {"m": moods[back % 5], "t": "Nhật ký ngày %d: trời đẹp, ôn ở quán cà phê." % d.day})
result = len(rows)`;

(async () => {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1');
  const n = await py(SEED);
  await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1500);
  const T = await today();
  console.log('== mở Lịch hoa (lịch sử ôn giả: ' + n + ' lượt)');
  ok(await page.eval(W('const s = document.querySelector("#kb-today-text .kb-today-streak"); return s && /ngày liền/.test(s.textContent) && /Lịch hoa/.test(s.title);')), 'thẻ Hôm nay: "· N ngày liền" bấm được, chú thích "Mở Lịch hoa"');
  await page.click('#kb-today-text .kb-today-streak');
  ok(await waitFor(page, W('return !document.getElementById("kb-cal").hidden && document.querySelectorAll(".kb-cal-day[data-d]").length >= 28;')), 'bấm chuỗi ngày → mở Lịch hoa tháng này');
  ok(await page.eval(W('return document.getElementById("kb-quest-pop").hidden;')), 'bấm chuỗi không mở bảng nhiệm vụ');
  ok(await waitFor(page, W('return !!document.querySelector(".kb-cal-diary");')), 'khung ngày mở ở hôm nay');
  const m = await page.eval(W(`const d = Array.from(document.querySelectorAll(".kb-cal-day[data-d]"));
    const t = d.find(x => x.classList.contains("is-today"));
    return { n: d.length, today: t && t.getAttribute("data-d"), sel: (document.querySelector(".kb-cal-day.is-sel") || {}).getAttribute && document.querySelector(".kb-cal-day.is-sel").getAttribute("data-d"),
      fut: d.filter(x => x.classList.contains("is-future")).length, strips: d.filter(x => x.querySelector(".kb-cal-strip").style.background).length,
      fl: d.filter(x => x.querySelector("canvas.kb-cal-fl")).length, wd: Array.from(document.querySelectorAll(".kb-cal-wd")).map(x => x.textContent).join(" "),
      bands: Array.from(document.querySelectorAll(".kb-cal-band b")).map(x => x.textContent), soon: (document.querySelector(".kb-cal-next") || {}).textContent,
      legend: document.querySelectorAll(".kb-cal-legend canvas").length, hud: document.getElementById("kb-c-hud").textContent, info: document.getElementById("kb-c-info").textContent };`));
  ok(m.today === T && m.sel === T, 'hôm nay = số trong ô đen, đang chọn = nền vàng: ' + m.today);
  ok(m.wd === 'T2 T3 T4 T5 T6 T7 CN', 'lưới 7 cột T2 → CN');
  ok(m.strips === m.n, 'mọi ô có vạch màu giao diện mùa (cả ngày tương lai)');
  ok(m.fl === m.n - m.fut, 'ngày đã qua / hôm nay có cây, ngày tương lai không');
  ok(m.bands.length >= 1 && /Sắp tới:/.test(m.soon || ''), 'dải tên mùa / lễ + dòng "Sắp tới": ' + m.bands.join(', ') + ' | ' + m.soon);
  ok(m.legend === 5 && /Chuỗi/.test(m.hud) && /Tháng này/.test(m.hud) && m.info === 'Bấm một ngày để xem và viết nhật ký.', 'chú giải 5 mức cây, chip Chuỗi / Tháng này, một dòng hướng dẫn');
  await page.shot(SHOTS + '/120_lich_thang.png');
  await page.key('Escape', 'Escape', 27); await sleep(500);
  ok(await page.eval(W('return document.getElementById("kb-cal").hidden;')), 'Esc đóng bảng');
  ok(!(await py(KB + 'result = kb._dialog is None')), 'Esc chỉ đóng bảng, cửa sổ vườn vẫn mở');
  await keyJS('l'); await sleep(600);
  ok(await page.eval(W('return !document.getElementById("kb-cal").hidden;')), 'phím L mở Lịch hoa');
  await keyJS('l'); await sleep(400);
  ok(await page.eval(W('return document.getElementById("kb-cal").hidden;')), 'phím L lần nữa đóng');
  await page.eval(W('document.getElementById("kb-sound").click(); return 1;')); await sleep(300);
  ok(await page.eval(W('const b = document.getElementById("kb-cal-open"); return !!b && b.offsetParent !== null;')), '⚙ có nút "Lịch hoa & nhật ký…"');
  await page.eval(W('document.getElementById("kb-cal-open").click(); return 1;'));
  ok(await waitFor(page, W('return !document.getElementById("kb-cal").hidden;')), 'nút ở ⚙ mở Lịch hoa');

  console.log('== nhật ký + sticker (lưu ngay, đồng bộ)');
  await waitFor(page, W('return !!document.querySelector(".kb-cal-diary");'));
  ok(await page.eval(W('return document.querySelectorAll(".kb-cal-stk-b").length === 8 && document.querySelectorAll(".kb-cal-stk-b img").length === 8;')), '8 sticker hình mặt pixel (không emoji)');
  ok(await page.eval(W('return /không gửi cho Gemini/.test(document.querySelector(".kb-cal-diary").textContent) && /Đồng bộ qua AnkiWeb/.test(document.querySelector(".kb-cal-diary").textContent);')), 'ghi rõ "không gửi cho Gemini" · "Đồng bộ qua AnkiWeb"');
  ok(await page.eval(W('return !document.getElementById("kb-cal-ask").hidden;')), 'thẻ Hôm nay có dòng "Hôm nay thế nào?" khi chưa viết');
  await page.click('.kb-cal-stk-b[data-m="vui"]'); await sleep(700);
  ok((await entry(T)).m === 'vui', 'chọn sticker Vui → lưu vào collection');
  ok(await page.eval(W('return document.querySelector(\'.kb-cal-day.is-sel .kb-cal-stk\') !== null;')), 'sticker hiện ngay ở góc ô ngày');
  ok(await waitFor(page, W('return document.getElementById("kb-cal-ask").hidden;'), 5000), 'đã có sticker → dòng "Hôm nay thế nào?" ẩn');
  await page.click('.kb-cal-stk-b[data-m="vui"]'); await sleep(700);
  ok(!(await entry(T)).m, 'bấm lại → bỏ sticker');
  await page.click('.kb-cal-stk-b[data-m="thu_thai"]'); await sleep(500);
  await page.click('.kb-cal-note');
  await page.type('Trời lạnh, ôn ở quán cà phê. Cuối cùng cũng nhớ được 予約 rồi!');
  ok(await page.eval(W('return /^\\d+ \\/ 200 ký tự$/.test(document.querySelector(".kb-cal-diary .kb-cal-cnt").textContent);')), 'đếm "N / 200 ký tự"');
  await page.key('Enter', 'Enter', 13); await sleep(800);
  const e1 = await entry(T);
  ok(e1.t === 'Trời lạnh, ôn ở quán cà phê. Cuối cùng cũng nhớ được 予約 rồi!' && e1.m === 'thu_thai', 'Enter / rời ô → lưu (không cần bấm Lưu)');
  ok(await py(KB + `result = list(mw.col.get_config(kb.journal.month_key(kb.cal_today().year, kb.cal_today().month)).keys())`).then(k => k.includes(T)), 'khoá collection theo tháng kotoba_batake_journal_<yyyy>_<mm>');
  await page.click('.kb-cal-note');
  await page.type('x'.repeat(260));
  ok(await page.eval(W('return document.querySelector(".kb-cal-note").value.length === 200;')), 'nhật ký tối đa 200 ký tự');
  await page.eval(W('const t = document.querySelector(".kb-cal-note"); t.value = "Trời lạnh, ôn ở quán cà phê. Cuối cùng cũng nhớ được 予約 rồi!"; t.dispatchEvent(new Event("input")); t.blur(); return 1;')); await sleep(600);
  // ngày cũ (trước khi có nhật ký) vẫn viết được
  const old = await page.eval(W('const c = Array.from(document.querySelectorAll(".kb-cal-day[data-d]")).find(x => !x.classList.contains("is-future") && !x.classList.contains("is-today")); return c ? c.getAttribute("data-d") : null;'));
  if (old) {
    await page.click('.kb-cal-day[data-d="' + old + '"]');
    await waitFor(page, W('return GardenCal._state().day && GardenCal._state().day.d === ' + JSON.stringify(old) + ';'));
    ok(await page.eval(W('return !!document.querySelector(".kb-cal-diary") && !document.querySelector(".kb-cal-write .kb-cal-ta:not([readonly])");')), 'ngày cũ: viết được nhật ký, luyện viết chỉ cho hôm nay');
    await page.click('.kb-cal-stk-b[data-m="ban"]'); await sleep(500);
    ok((await entry(old)).m === 'ban', 'sửa được ngày cũ (' + old + ')');
  }
  const fut = await page.eval(W('const c = document.querySelector(".kb-cal-day.is-future"); return c ? c.getAttribute("data-d") : null;'));
  if (fut) {
    await page.click('.kb-cal-day[data-d="' + fut + '"]');
    await waitFor(page, W('return GardenCal._state().day && GardenCal._state().day.d === ' + JSON.stringify(fut) + ';'));
    ok(await page.eval(W('return /Ngày chưa tới/.test(document.getElementById("kb-cal-right").textContent) && !document.querySelector(".kb-cal-diary");')), 'ngày tương lai: chỉ xem giao diện mùa, không viết');
  }
  // ngày có số liệu: Ôn · Lên Ra quả
  const rich = await py(KB + `
c = kb._counts(kb.cal_today() - datetime.timedelta(days=60), kb.cal_today(), kb.config())
result = max((d for d in c if c[d]["fruit"] and c[d]["new"]), key=lambda d: c[d]["n"])`);
  await page.eval(W('GardenCal.close(); return 1;'));
  await page.eval(W('GardenCal.open({ date: ' + JSON.stringify(rich) + ' }); return 1;'));
  await waitFor(page, W('return GardenCal._state().day && GardenCal._state().day.d === ' + JSON.stringify(rich) + ';'));
  const st1 = await page.eval(W('return document.querySelector(".kb-cal-stats").textContent;'));
  ok(/\d+ lượt · \d+ thẻ mới/.test(st1) && /Lên Ra quả\d+ từ/.test(st1), 'khung ngày: Ôn N lượt · N thẻ mới, Lên Ra quả (gần đúng): ' + st1.slice(0, 80));
  ok(await page.eval(W('const k = Array.from(document.querySelectorAll(".kb-cal-k")).find(x => x.textContent === "Lên Ra quả"); return !!k && /Gần đúng/.test(k.title);')), 'ghi rõ "gần đúng" ở chú thích');
  await page.shot(SHOTS + '/121_khung_ngay.png');
  await page.eval(W('GardenCal.close(); GardenCal.open({}); return 1;'));
  await waitFor(page, W('return !!document.querySelector(".kb-cal-write");'));

  console.log('== luyện viết: gợi ý, giới hạn, đổi ngôn ngữ');
  const w0 = await page.eval(W(`const c = document.querySelector(".kb-cal-write"); return { langs: Array.from(c.querySelectorAll(".kb-cal-langs .kb-ai-chip")).map(b => b.textContent + (b.classList.contains("is-on") ? "*" : "")),
    hints: Array.from(c.querySelectorAll(".kb-cal-word")).map(x => x.textContent), small: c.querySelector(".kb-cal-h small").textContent, cnt: c.querySelector(".kb-cal-cnt").textContent };`));
  ok(w0.langs.length === 2, 'tick cả hai báo → nút Tiếng Nhật / Tiếng Anh: ' + w0.langs.join(' '));
  ok(w0.small === 'tối đa 60 ký tự (khoảng 20–30 từ)' && w0.cnt === '0 / 60 ký tự', 'tiếng Nhật: tối đa 60 ký tự, bộ đếm 0 / 60');
  ok(w0.hints.length === 2, '"Thử dùng": 2 từ phải ôn hôm nay: ' + w0.hints.join(', '));
  await page.click('.kb-cal-swap'); await sleep(1200);
  const h2 = await page.eval(W('return Array.from(document.querySelectorAll(".kb-cal-write .kb-cal-word")).map(x => x.textContent);'));
  ok(h2.length === 2 && (await entry(T)).w.gr === 1, 'Đổi gợi ý → bộ khác (gr = 1): ' + h2.join(', '));
  await page.click('.kb-cal-ta');
  await page.type('あ'.repeat(70));
  await sleep(300);
  ok(await page.eval(W('return document.querySelector(".kb-cal-ta").value.length === 60 && /Đã cắt bớt ở 60 ký tự/.test(document.querySelector(".kb-cal-cut").textContent) && document.querySelector(".kb-cal-write .kb-cal-cnt").classList.contains("is-full");')), 'gõ / dán quá 60 ký tự → không nhận thêm, báo "đã cắt bớt"');
  await page.eval(W('const t = document.querySelector(".kb-cal-ta"); t.value = ""; t.dispatchEvent(new Event("input")); return 1;'));
  await page.click('.kb-cal-langs .kb-ai-chip:nth-child(2)');
  ok(await waitFor(page, W('const t = document.querySelector(".kb-cal-ta"); return t && t.getAttribute("lang") === "en";')), 'chọn Tiếng Anh');
  const w1 = await page.eval(W('const c = document.querySelector(".kb-cal-write"); return { small: c.querySelector(".kb-cal-h small").textContent, cnt: c.querySelector(".kb-cal-cnt").textContent, hints: Array.from(c.querySelectorAll(".kb-cal-word")).map(x => x.textContent) };'));
  ok(w1.small === 'tối đa 30 từ' && w1.cnt === '0 / 30 từ' && w1.hints.every(h => /^[A-Za-z]/.test(h)), 'tiếng Anh: tối đa 30 từ, gợi ý là từ tiếng Anh: ' + w1.hints.join(', '));
  ok(await py(KB + 'result = kb.config().get("journal_lang")') === 'en', 'nhớ lựa chọn ngôn ngữ lần trước');
  await page.click('.kb-cal-ta');
  await page.type('Yesterday it rain a lot, so my friend and I book a small restaurant near the station and we eats dinner together. The food was delicious and we was happy today too.');
  await sleep(1300);
  const w2 = await entry(T);
  ok(w2.w.lang === 'en' && w2.w.goc.split(/\s+/).length === 30 && /happy$/.test(w2.w.goc), 'đoạn 32 từ → lưu 30 từ (cắt ở từ thứ 30)');
  await page.click('.kb-cal-langs .kb-ai-chip:nth-child(1)');
  await waitFor(page, W('const t = document.querySelector(".kb-cal-ta"); return t && t.getAttribute("lang") === "ja";'));
  await page.eval(W('const t = document.querySelector(".kb-cal-ta"); t.value = ""; t.dispatchEvent(new Event("input")); return 1;'));
  await page.click('.kb-cal-ta');
  const JA = 'きのうは雨だったので、友だちと駅の近くのレストランを予約しました。寒いでしたが、料理はおいしいでした。';
  await page.type(JA); await sleep(1300);
  ok((await entry(T)).w.goc === JA, 'bản nháp lưu tự động khi gõ (luồng chính, khoá collection)');

  console.log('== Gemini sửa bài: gửi rồi đóng bảng, xong thì báo (Gemini giả lập)');
  await py(FAKE('slow'));
  await page.click('.kb-cal-send');
  ok(await waitFor(page, W('return !!document.querySelector(".kb-cal-wait") && document.querySelector(".kb-cal-ta").readOnly;'), 6000), 'đang sửa: khung "Gemini đang sửa bài…", ô viết tạm khoá');
  ok(await page.eval(W('return /Thường mất 10–60 giây. Có thể đóng bảng hoặc làm việc khác — xong sẽ có thông báo./.test(document.querySelector(".kb-cal-wait").textContent) && Array.from(document.querySelectorAll(".kb-cal-acts .kb-btn")).some(b => b.textContent === "Đóng bảng");')), 'chữ hướng dẫn + nút "Đóng bảng"');
  ok((await entry(T)).w.st === 'wait', 'bài lưu ngay với cờ "đang sửa"');
  await page.shot(SHOTS + '/122_dang_sua.png');
  await page.eval(W('Array.from(document.querySelectorAll(".kb-cal-acts .kb-btn")).find(b => b.textContent === "Đóng bảng").click(); return 1;'));
  ok(await waitFor(page, W('const w = document.getElementById("kb-cal-write"); return !w.hidden && /đang sửa/.test(w.textContent);'), 4000), 'đóng bảng → thẻ Hôm nay: "Luyện viết: Gemini đang sửa…"');
  const tst = await waitFor(page, W('const t = document.getElementById("kb-toast"); return !t.hidden && /Gemini đã sửa bài luyện viết/.test(t.textContent) ? t.textContent + "|" + t.className : "";'), 15000);
  ok(tst && /2 lỗi · bấm để xem/.test(tst) && /kb-toast-link/.test(tst), 'xong → thông báo bấm được: ' + tst);
  ok(await page.eval(W('const w = document.getElementById("kb-cal-write"); return !w.hidden && /Gemini đã sửa \\(2 lỗi\\) · xem/.test(w.textContent) && w.classList.contains("is-new");')), 'thẻ Hôm nay: dòng hồng "Luyện viết: Gemini đã sửa (2 lỗi) · xem ▸"');
  await page.shot(SHOTS + '/123_thong_bao_da_sua.png');
  await page.click('#kb-toast');
  ok(await waitFor(page, W('return !!document.querySelector(".kb-cal-fix");')), 'bấm thông báo → mở Lịch hoa ở hôm nay, có kết quả 3 phần');
  const fx = await page.eval(W(`const f = document.querySelector(".kb-cal-fix"); return { b: Array.from(f.querySelectorAll(":scope > b")).map(x => x.textContent), marks: Array.from(f.querySelectorAll(".kb-cal-fixed mark")).map(x => x.textContent),
    why: f.querySelectorAll(".kb-cal-why").length, done: Array.from(document.querySelectorAll(".kb-cal-acts .kb-btn")).map(b => b.textContent + (b.disabled ? "(khoá)" : "")).join(","), lock: document.querySelector(".kb-cal-acts .kb-cal-lock").textContent };`));
  ok(fx.b.join('|') === '1. Câu đã sửa|2. Lỗi (2)|3. Nhận xét', 'kết quả: Câu đã sửa · Lỗi (2) · Nhận xét');
  ok(fx.marks.length === 2 && fx.marks.every(x => /かったです/.test(x)), 'máy tô xanh chỗ sửa: ' + fx.marks.join(', '));
  ok(fx.done === 'Đã sửa hôm nay(khoá)' && fx.lock === 'Gemini sửa 1 lần mỗi ngày · mai viết bài mới', 'khoá bài: "Đã sửa hôm nay" · "Gemini sửa 1 lần mỗi ngày · mai viết bài mới"');
  ok(await waitFor(page, W('return document.getElementById("kb-cal-write").hidden;'), 4000), 'đã xem → dòng hồng ở thẻ Hôm nay biến mất');
  const e2 = await entry(T);
  ok(e2.w.st === 'done' && e2.w.seen === true && e2.u > 0 && e2.w.goc === JA, 'collection: bài gốc + bản sửa, cờ "đã xem", thời điểm sửa');
  ok((await py(KB + 'result = kb._fake_calls[-1]["models"]')).every(x => typeof x === 'string'), 'gọi Gemini một lần cho bài này');
  await page.shot(SHOTS + '/124_da_sua.png');

  console.log('== lỗi, chờ lượt, cờ "đang sửa" cũ, không có khoá');
  const reset = KB + `kb.JOURNAL.update(kb.cal_today(), {"w": {"lang": "ja", "goc": ${JSON.stringify(JA)}, "st": ""}, "u": None}); result = 1`;
  await py(reset); await py(FAKE('net'));
  await page.eval(W('GardenCal.close(); GardenCal.open({}); return 1;'));
  await waitFor(page, W('return !!document.querySelector(".kb-cal-send") && !document.querySelector(".kb-cal-send").disabled;'));
  await page.click('.kb-cal-send');
  ok(await waitFor(page, W('return /Chưa sửa được: mất mạng · không tính lượt/.test((document.querySelector(".kb-cal-err") || {}).textContent || "") && !document.querySelector(".kb-cal-ta").readOnly;'), 8000), 'gọi lỗi (mạng) → "Chưa sửa được: mất mạng · không tính lượt", mở khoá ô viết');
  ok((await entry(T)).w.st === '', 'không tính lượt (bài trở lại bản nháp)');
  await py(FAKE('quota'));
  await page.click('.kb-cal-send');
  ok(await waitFor(page, W('return /hết lượt miễn phí · sẽ tự sửa sau/.test((document.querySelector(".kb-cal-queue") || {}).textContent || "");'), 8000), 'mọi model hết lượt → "Hôm nay Gemini hết lượt miễn phí · sẽ tự sửa sau …"');
  const q = await entry(T);
  ok(q.w.st === 'queue' && q.w.retry_at > Date.now() / 1000, 'bài "chờ lượt", hẹn giờ đặt lại hạn mức');
  await py(FAKE('ok'));
  await py(KB + `w = kb.JOURNAL.entry(kb.cal_today())["w"]; w["retry_at"] = time.time() - 5; kb.JOURNAL.update(kb.cal_today(), {"w": w}); result = kb.fix_auto()`);
  ok(await waitFor(page, W('return !!document.querySelector(".kb-cal-fix");'), 8000), 'sau giờ đặt lại → tự gửi lại một lần, sửa xong cập nhật tại chỗ (không cần thông báo)');
  ok((await entry(T)).w.rq === 1, 'đánh dấu đã tự gửi lại (không lặp mãi)');
  await py(KB + `kb.JOURNAL.update(kb.cal_today(), {"w": {"lang": "ja", "goc": ${JSON.stringify(JA)}, "st": "wait", "sent": time.time() - 700}}); result = 1`);
  await page.eval(W('GardenCal.close(); GardenCal.open({}); return 1;'));
  ok(await waitFor(page, W('const t = document.querySelector(".kb-cal-ta"); return t && !t.readOnly && !!document.querySelector(".kb-cal-send");')), 'cờ "đang sửa" cũ hơn 10 phút (tắt Anki giữa chừng) → mở khoá, gửi lại được');
  ok((await entry(T)).w.st === '', 'không tính lượt');
  await py(KB + 'kb.save_config(gemini_key=""); result = 1');
  await page.eval(W('GardenCal.close(); GardenCal.open({}); return 1;'));
  ok(await waitFor(page, W('return /Dán khoá Gemini ở tab Nguồn báo để được sửa/.test(document.querySelector(".kb-cal-acts").textContent);')), 'không có khoá: vẫn viết / lưu được, chỗ nút ghi "Dán khoá Gemini ở tab Nguồn báo để được sửa"');
  await page.eval(W('Array.from(document.querySelectorAll(".kb-cal-acts .kb-btn")).find(b => b.textContent === "Nguồn báo").click(); return 1;'));
  ok(await waitFor(page, W('return !document.getElementById("kb-paper").hidden && GardenPaper._state().tab === "src";')), 'nút "Nguồn báo" mở tab Nguồn báo');
  await py(KB + 'kb.save_config(gemini_key="AIzaDUMMY-proxy-injects-the-real-key-00"); result = 1');
  await page.eval(W('GardenPaper.close(); return 1;'));

  console.log('== chạy song song với báo, hàng chờ thông báo, vườn đóng → tooltip');
  await py(reset); await py(FAKE('slow'));
  await py(KB + 'kb._ai["running"] = True; result = 1');      // báo đang viết
  const err0 = await py(KB + 'result = kb.fix_start(kb.cal_today().isoformat())');
  ok(err0 === '' && await py(KB + 'result = kb._fix["running"] and kb._ai["running"]'), 'báo đang viết vẫn gửi được bài sửa (trạng thái riêng, chạy song song)');
  await page.eval(W('GardenCal.close(); Garden.notice({ msg: "Báo mới: số 3 đã về hòm thư.", ms: 8000 }); return 1;'));
  const seq = [];
  for (let k = 0; k < 40 && seq.length < 2; k++) {
    const t = await page.eval(W('const t = document.getElementById("kb-toast"); return t.hidden ? "" : t.textContent;'));
    if (t && seq[seq.length - 1] !== t) { seq.push(t); }
    await sleep(500);
  }
  ok(seq.length === 2 && /Báo mới/.test(seq[0]) && /Gemini đã sửa bài/.test(seq[1]), 'hai việc xong gần nhau → hai thông báo lần lượt (không đè nhau): ' + seq.join(' → '));
  await py(KB + 'kb._ai["running"] = False; result = 1');
  await py(reset); await py(FAKE('slow'));
  await py(KB + 'kb.TIPS = []\nkb.tooltip = lambda m, period=0, **k: kb.TIPS.append(m)\nkb.fix_start(kb.cal_today().isoformat())\nkb._dialog.close()\nresult = 1');
  for (let k = 0; k < 30; k++) { if ((await py(KB + 'result = len(kb.TIPS)')) > 0) break; await sleep(500); }
  ok((await py(KB + 'result = kb.TIPS')).some(t => /Gemini đã sửa bài luyện viết · mở vườn để xem/.test(t)), 'vườn đóng → tooltip "ことば畑: Gemini đã sửa bài luyện viết · mở vườn để xem"');
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(3000);
  page.close(); page = await gardenPage();
  await py(KB + 'kb._dialog.resize(1366, 800); result = 1'); await sleep(1000);
  ok(await waitFor(page, W('const w = document.getElementById("kb-cal-write"); return !w.hidden && /đã sửa/.test(w.textContent);'), 6000), 'mở vườn lần sau: dòng "Luyện viết: Gemini đã sửa … xem ▸" vẫn chờ');

  console.log('== nội dung dài tối đa (máy cắt đầu ra, khung giãn theo nội dung)');
  await py(reset); await py(FAKE('long'));
  await py(KB + `kb.JOURNAL.update(kb.cal_today(), {"t": ("Hôm nay đi làm về muộn, mưa to nên ghé quán cà phê gần nhà ôn bài. Ôn được 47 thẻ, cuối cùng cũng nhớ được 予約 và 天気. Tối gọi cho mẹ, kể chuyện tháng sau thi N4. Hơi lo nhưng thấy mình đang tiến bộ dần dần mỗi ngày.")[:200]}); result = 1`);
  await page.eval(W('GardenCal.open({}); return 1;'));
  await waitFor(page, W('return !!document.querySelector(".kb-cal-send");'));
  await page.click('.kb-cal-send');
  ok(await waitFor(page, W('return !!document.querySelector(".kb-cal-fix");'), 10000), 'Gemini trả về quá mọi giới hạn → máy cắt rồi vẫn hiện');
  const lg = await page.eval(W(`const f = document.querySelector(".kb-cal-fix"); return { loi: f.querySelectorAll(".kb-cal-why .kb-cal-errw").length, b: Array.from(f.querySelectorAll(":scope > b")).map(x => x.textContent).join("|"),
    why: Array.from(f.querySelectorAll(".kb-cal-why")).map(x => x.textContent.length), ta: Array.from(document.querySelectorAll(".kb-cal-in")).map(t => t.scrollHeight <= t.clientHeight + 2) };`));
  ok(lg.loi === 3 && lg.b === '1. Lỗi (3+)|2. Nhận xét', 'câu đã sửa dài quá 2 lần bài gốc → chỉ hiện lỗi + nhận xét; tối đa 3 lỗi + "còn lại": ' + lg.b);
  ok(lg.ta.every(Boolean), 'ô nhật ký / luyện viết tự giãn, không có thanh cuộn trong ô');
  const ov = await noOverflow();
  ok(ov.sw <= ov.cw + 1 && ov.page && ov.bad.length === 0, 'không tràn ngang ở 1366 (' + ov.sw + '/' + ov.cw + ') ' + ov.bad.join(','));
  await page.eval(W('document.getElementById("kb-c-stage").scrollTop = 9999; return 1;')); await sleep(300);
  await page.shot(SHOTS + '/125_noi_dung_dai_1366.png');
  ok((await py(KB + 'result = json.load(open(kb.JOURNAL_DIR + "/sua_bai.json"))[-1]')).cat.length >= 3, 'nhật ký sửa bài ghi những gì máy đã cắt');

  console.log('== năm');
  await page.click('.kb-c-tab[data-ctab="year"]');
  ok(await waitFor(page, W('return document.querySelectorAll(".kb-cal-mini").length === 12;')), 'Năm: 12 tháng nhỏ');
  const yr = await page.eval(W(`return { chips: Array.from(document.querySelectorAll(".kb-cal-sum .kb-g-chip-l")).map(x => x.textContent), now: document.querySelectorAll(".kb-cal-mini.is-now").length,
    strip: document.querySelectorAll(".kb-cal-mini-strip i").length >= 12, green: document.querySelectorAll(".kb-cal-mini-grid b[style*='rgb(23, 113, 58)'], .kb-cal-mini-grid b[style*='#17713a']").length,
    hud: document.getElementById("kb-c-hud").textContent, legend: document.querySelectorAll(".kb-cal-ylegend i").length };`));
  ok(yr.chips.join(',') === 'Ngày ôn,Lượt ôn,Từ ra quả mới,Nhật ký,Hay gặp nhất' && yr.now === 1 && yr.strip, 'chip tổng kết, tháng hiện tại nền vàng, dải màu giao diện mùa: ' + yr.chips.join(','));
  ok(/Dài nhất/.test(yr.hud) && yr.legend >= 10, 'chip Chuỗi / Dài nhất, chú giải mức + màu các lễ');
  await page.shot(SHOTS + '/126_lich_nam.png');
  const prevM = await py(KB + 'y, m = kb.journal.add_months(kb.cal_today().year, kb.cal_today().month, -1)\nresult = [y, m]');
  if (prevM[0] === Number(T.slice(0, 4))) {
    await page.eval(W('document.querySelectorAll(".kb-cal-mini")[' + (prevM[1] - 1) + '].click(); return 1;'));
    ok(await waitFor(page, W('return GardenCal._state().tab === "month" && GardenCal._state().month === "' + prevM[0] + '-' + String(prevM[1]).padStart(2, '0') + '";')), 'bấm một tháng → mở tháng đó');
  }

  console.log('== cuốn nhật ký + Xuất PDF + kệ sách trong nhà');
  await page.click('.kb-c-tab[data-ctab="book"]');
  ok(await waitFor(page, W('return document.querySelectorAll(".kb-spine").length >= 2 && document.querySelectorAll("#kb-book .kb-page").length >= 1;')), 'Kệ sách + sách mở');
  const bk = await page.eval(W(`return { spines: document.querySelectorAll(".kb-spine").length, draft: document.querySelectorAll(".kb-spine.is-draft").length, on: (document.querySelector(".kb-spine.is-on") || {}).textContent,
    pages: GardenCal._state().pages, two: document.querySelectorAll("#kb-book .kb-page").length, title: document.querySelector(".kb-page-t").textContent,
    stats: document.querySelectorAll(".kb-page-stats > div").length, cover: !!document.querySelector(".kb-page-cover"), entries: document.querySelectorAll("#kb-book .kb-entry").length,
    foot: Array.from(document.querySelectorAll("#kb-book .kb-page-foot")).map(f => f.textContent).join("|"), hud: document.getElementById("kb-c-hud").textContent };`));
  ok(bk.draft === 1 && /Th \d+/.test(bk.on || ''), 'gáy sách theo tháng, tháng này là bản nháp, cuốn đang mở viền vàng: ' + bk.on);
  ok(bk.two === 2 && bk.stats === 6 && bk.cover && /Tháng \d+ · \d{4}/.test(bk.title), 'sách mở hai trang: trang đầu có ảnh bìa + 6 ô tổng kết: ' + bk.title);
  ok(bk.entries >= 1 && /Chỉ ghi ngày có ôn hoặc có viết/.test(bk.foot) && /Đã có/.test(bk.hud), 'các trang sau: mỗi ngày một dòng, chân trang + số trang');
  const fit = await page.eval(W('return Array.from(document.querySelectorAll("#kb-book .kb-page-body")).every(b => b.scrollHeight <= b.clientHeight + 1);'));
  ok(fit, 'ngắt trang theo chiều cao thật: không trang nào bị tràn');
  ok(await page.eval(W('const p = document.querySelector("#kb-book .kb-page-first"); return !!p && p.scrollHeight <= p.clientHeight + 1;')), 'trang đầu (ảnh bìa + tổng kết) vừa khung, chân trang không bị che');
  await page.shot(SHOTS + '/127_cuon_nhat_ky.png');
  if (bk.pages > 2) {
    await page.click('#kb-book-next'); await sleep(400);
    ok(await page.eval(W('return GardenCal._state().pageIdx === 1 && !document.getElementById("kb-book-prev").disabled;')), 'Trang sau ▸ / ◂ Trang trước');
  }
  await py(KB + 'import os\nos.environ["KB_TEST_PDF"] = "/tmp/kb_e2e120.pdf"\nos.path.exists("/tmp/kb_e2e120.pdf") and os.remove("/tmp/kb_e2e120.pdf")\nresult = 1');
  await page.click('#kb-book-pdf');
  ok(await waitFor(page, W('const t = document.getElementById("kb-toast"); return !t.hidden && /Đã lưu kb_e2e120.pdf/.test(t.textContent);'), 20000), 'Xuất PDF → "Đã lưu …pdf"');
  const pdf = fs.existsSync('/tmp/kb_e2e120.pdf') ? fs.readFileSync('/tmp/kb_e2e120.pdf') : Buffer.alloc(0);
  const npages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  ok(pdf.slice(0, 4).toString() === '%PDF' && npages >= 2, 'file PDF thật, ' + npages + ' trang (khổ A5)');
  ok(/MediaBox\s*\[\s*0 0 (419|420)(\.\d+)? 59[45]/.test(pdf.toString('latin1')), 'khổ A5 dọc (420 × 595 pt)');
  // kệ sách trong nhà
  await py(KB + `
st = kb.STATE
d = st.load(); d["coins"] = 99999; d["home"]["house"] = 7; st.save(d)
st.buy("shelf")
done = False
for y in range(0, 6):
    for x in range(0, 14):
        try:
            st.place("room", "shelf", x, y); done = True; break
        except Exception:
            pass
    if done:
        break
kb._dialog.refresh()
result = done`);
  await page.eval(W('GardenCal.close(); document.getElementById("kb-house").click(); return 1;')); await sleep(800);
  await page.eval(W('const r = (Garden._data().wallet.home.room || []); GardenHome._popFor("room", r.findIndex(e => e.id === "shelf")); return 1;')); await sleep(300);
  ok(await page.eval(W('return !document.getElementById("kb-h-read").hidden;')), 'bấm Kệ sách trong phòng → nút "Đọc nhật ký"');
  await page.click('#kb-h-read');
  ok(await waitFor(page, W('return !document.getElementById("kb-cal").hidden && GardenCal._state().tab === "book";')), '"Đọc nhật ký" → tab Cuốn nhật ký');

  console.log('== kệ sách nhiều năm (mỗi lần một năm, ◂ năm ▸)');
  await py(KB + `
col = mw.col
cid = col.db.scalar("select id from cards limit 1")
day0 = int(col.sched.day_cutoff) - 86400
rows = [((day0 - back * 86400 + 36000) * 1000 + back, cid, -1, 3, 5, 3, 2500, 3000, 1) for back in range(150, 900, 9)]
col.db.executemany("insert or ignore into revlog (id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", rows)
result = len(rows)`);
  await page.eval(W('GardenCal.close(); GardenCal.open({ tab: "book" }); return 1;'));
  await waitFor(page, W('return document.querySelectorAll("#kb-book .kb-page").length >= 1 && !!document.querySelector(".kb-shelf-nav");'));
  const sh = await page.eval(W(`const s = document.querySelector(".kb-shelf"); return { h: s.getBoundingClientRect().height, y: document.querySelector(".kb-shelf-y").textContent,
    total: GardenCal._state().book, spines: document.querySelectorAll(".kb-spine").length, prevOff: document.querySelector(".kb-shelf-nav .kb-btn").disabled };`));
  ok(sh.h < 420 && sh.y === T.slice(0, 4) && !sh.prevOff && sh.spines <= 12, 'kệ chỉ bày năm của cuốn đang mở, không dài ra theo số năm (cao ' + Math.round(sh.h) + ' px, ' + sh.spines + ' cuốn)');
  await page.eval(W('document.querySelector(".kb-shelf-nav .kb-btn").click(); return 1;')); await sleep(300);
  const sh2 = await page.eval(W(`return { y: document.querySelector(".kb-shelf-y").textContent, flat: (document.querySelector(".kb-spine-flat") || {}).textContent || "",
    rows: Array.from(document.querySelectorAll(".kb-shelf-row")).map(r => r.children.length) };`));
  ok(Number(sh2.y) === Number(T.slice(0, 4)) - 1 && sh2.flat === 'Năm ' + sh2.y && sh2.rows.every(n => n === 6), '◂ → năm trước: cuốn năm nằm ngang trên cùng, 12 tháng đúng chỗ (2 tầng × 6): ' + sh2.y);
  await page.eval(W('document.querySelector(".kb-spine-flat").click(); return 1;'));
  ok(await waitFor(page, W('return GardenCal._state().book === ' + JSON.stringify(String(Number(T.slice(0, 4)) - 1)) + ' && !!document.querySelector("#kb-book .kb-page-mh");'), 10000), 'mở cuốn năm: gộp 12 tháng, có tiêu đề từng tháng');
  ok(await page.eval(W('return document.querySelector(".kb-shelf-y").textContent === ' + JSON.stringify(String(Number(T.slice(0, 4)) - 1)) + ';')), 'mở cuốn năm cũ → kệ vẫn ở năm đó');
  await page.shot(SHOTS + '/127b_ke_sach_nhieu_nam.png');

  console.log('== ảnh vườn tự chụp (bìa cuốn nhật ký)');
  const photo = await py(KB + 'import os\nd = kb._photo_dir() if hasattr(kb, "_photo_dir") else kb.PHOTO_DIR\nresult = sorted(os.listdir(d)) if os.path.isdir(d) else []');   // 1.25.3: ảnh theo hồ sơ
  ok(photo.some(p => p === T + '.png'), 'tuần này đã tự chụp một tấm: ' + photo.join(','));

  console.log('== cửa sổ 1024 px');
  await py(KB + 'kb._dialog.resize(1024, 700); result = 1'); await sleep(900);
  await page.eval(W('GardenCal.close(); GardenCal.open({}); return 1;'));
  await waitFor(page, W('return !!document.querySelector(".kb-cal-write");'));
  await sleep(500);
  const l1024 = await page.eval(W('const L = document.querySelector(".kb-cal-left").getBoundingClientRect(), R = document.querySelector(".kb-cal-right").getBoundingClientRect(); return { below: R.top >= L.bottom - 1, full: Math.abs(R.width - L.width) < 4 };'));
  ok(l1024.below && l1024.full, 'dưới 1100 px: khung ngày xếp xuống dưới lịch, giãn hết chiều ngang');
  let o2 = await noOverflow();
  ok(o2.sw <= o2.cw + 1 && o2.page, 'tháng: không tràn ngang ở 1024 (' + o2.sw + '/' + o2.cw + ') ' + o2.bad.join(','));
  await page.shot(SHOTS + '/128_lich_thang_1024.png');
  await page.eval(W('document.getElementById("kb-c-stage").scrollTop = 9999; return 1;')); await sleep(300);
  await page.shot(SHOTS + '/129_noi_dung_dai_1024.png');
  await page.click('.kb-c-tab[data-ctab="year"]');
  await waitFor(page, W('return document.querySelectorAll(".kb-cal-mini").length === 12;'));
  ok(await page.eval(W('return getComputedStyle(document.querySelector(".kb-cal-year")).gridTemplateColumns.split(" ").length === 4;')), 'năm: 4 cột ở 1024 px');
  o2 = await noOverflow();
  ok(o2.sw <= o2.cw + 1, 'năm: không tràn ngang ở 1024');
  await page.click('.kb-c-tab[data-ctab="book"]');
  await waitFor(page, W('return document.querySelectorAll("#kb-book .kb-page").length >= 1;'));
  ok(await page.eval(W('const p = document.querySelector("#kb-book .kb-page-first"); return !!p && p.scrollHeight <= p.clientHeight + 1;')), 'trang đầu vừa khung ở 1024 × 700');
  o2 = await noOverflow();
  ok(o2.sw <= o2.cw + 1 && await page.eval(W('return Array.from(document.querySelectorAll("#kb-book .kb-page-body")).every(b => b.scrollHeight <= b.clientHeight + 1);')), 'cuốn nhật ký: không tràn ở 1024');
  await page.shot(SHOTS + '/130_cuon_1024.png');
  await page.eval(W('GardenCal.close(); return 1;'));

  const errs = page.errors.filter(e => !/ResizeObserver/.test(e));
  ok(errs.length === 0, 'không lỗi JS' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  const elog = await py(KB + 'result = [e for e in kb.ERRORS.entries()]');
  ok(elog.length === 0, 'nhật ký lỗi add-on trống' + (elog.length ? ': ' + JSON.stringify(elog).slice(0, 300) : ''));
  const pass = results.filter(Boolean).length;
  console.log('KẾT QUẢ: ' + pass + '/' + results.length);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.log('LỖI KỊCH BẢN:', e.stack || e); process.exit(1); });
