// Soát giao diện: mở lần lượt mọi màn hình ở 2 cỡ cửa sổ, chụp ảnh và đo các lỗi hay gặp
// (lỗi JS, tràn ngang, chữ bị cắt, phần tử lọt ra ngoài khung nhìn, nút quá nhỏ).
// 1.19.1: thêm "kiểu lệch" — các nút cùng hàng khác bóng đổ / viền / font / cỡ chữ / đệm (vd. nút đang chọn mất bóng),
// "nhãn thừa" — nhãn đứng một mình cạnh hàng nút mà rộng hơn chữ > 40px; thêm các màn báo tiếng Anh, Nguồn báo
// chưa có khoá, Cấu hình trường / Trò chơi với deck tiếng Anh.
// Chạy: node audit.js SHOTS   (Anki đã chạy bằng run_anki.sh). In ra một bảng; không có ✓/✗ (dùng để soát bằng mắt).
const { pages, Page, sleep } = require('./cdp');
const fs = require('fs');
const SHOTS = process.argv[2];
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenGames !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  return null;
}
const KB = 'import sys\nkb = sys.modules["kotoba_batake"]\n';
const W = (expr) => '(() => { ' + expr + ' })()';
const { MEASURE } = require('./measure');
let page;
const report = [];
async function shot(name, note) {
  await sleep(500);
  const m = await page.eval(MEASURE);
  await page.shot(SHOTS + '/' + name + '.png');
  const errs = page.errors.splice(0);
  report.push({ name, note: note || '', ...m, errs });
  const flags = [m.hscroll ? 'TRÀN NGANG' : '', m.cut.length ? 'cắt ' + m.cut.length : '', m.outside.length ? 'ngoài khung ' + m.outside.length : '',
    m.tiny.length ? 'nút nhỏ ' + m.tiny.length : '', m.rows.length ? 'hàng lệch ' + m.rows.length : '', m.style.length ? 'kiểu lệch ' + m.style.length : '',
    m.label.length ? 'nhãn thừa ' + m.label.length : '', errs.length ? 'LỖI JS ' + errs.length : ''].filter(Boolean).join(', ');
  console.log((flags ? '  ! ' : '  · ') + name + ' — ' + m.buttons + ' nút' + (flags ? ' — ' + flags : ''));
  m.style.concat(m.label, m.rows).forEach((x) => console.log('      ' + x));
}
const js = (expr) => page.eval(W(expr + '; return 1;'));
async function closeAll() {
  await js('try { GardenGames.close(); } catch (e) {} try { GardenHome.close(); } catch (e) {} try { GardenPaper.close(); } catch (e) {} try { GardenFields.close(); } catch (e) {} try { GardenUI.close(); } catch (e) {} try { GardenCal.close(); } catch (e) {}' +
    'document.getElementById("kb-sound-pop").hidden = true; const q = document.getElementById("kb-quest-pop"); if (q) q.hidden = true; const t = document.getElementById("kb-toast"); if (t) t.hidden = true;' +
    'const s = document.getElementById("kb-stop"); if (s && !document.getElementById("kb-panel").hidden) s.click();');
  await sleep(400);
}

async function tour(size) {
  const [w, h] = size;
  const S = w + 'x' + h;
  await py(KB + `kb._dialog.resize(${w}, ${h}); d = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1`);
  await sleep(2500); await closeAll();
  console.log('== ' + S);
  await shot(S + '_01_vuon');
  await js('document.getElementById("kb-sound").click()'); await shot(S + '_02_caidat');
  await closeAll();
  await js('const b = document.getElementById("kb-quest"); if (b && !b.hidden) b.click()'); await shot(S + '_03_nhiemvu');
  await closeAll();
  await js('Garden._pinFirst ? Garden._pinFirst() : 0');
  await js('document.getElementById("kb-review").click()'); await sleep(1500); await shot(S + '_04_on_the');
  await js('const b = document.getElementById("kb-show"); if (b) b.click()'); await sleep(800); await shot(S + '_05_on_dapan');
  await closeAll();
  await js('document.getElementById("kb-games").click()'); await shot(S + '_06_trochoi');
  for (const g of ['market', 'crow', 'memory', 'cloze']) {
    await js('GardenGames.close(); document.getElementById("kb-games").click()'); await sleep(300);
    await js('document.querySelector(\'.kb-gcard[data-game="' + g + '"]\').click()'); await sleep(1800); await shot(S + '_07_' + g);
  }
  await closeAll();
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("C::Chỉ từ + audio từ"); d.refresh(); result = 1'); await sleep(2000); await closeAll();
  await js('document.getElementById("kb-games").click()'); await sleep(300);
  await js('document.querySelector(\'.kb-gcard[data-game="listen"]\').click()'); await sleep(1500); await shot(S + '_07_listen');
  await closeAll();
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("A::Có câu ví dụ + audio"); d.refresh(); result = 1'); await sleep(2000); await closeAll();
  for (const t of ['build', 'yard', 'room', 'zone', 'pet', 'guest', 'seed', 'season', 'wear', 'craft', 'inv']) {
    await js('document.getElementById("kb-house").click()'); await sleep(300);
    await js('const b = document.querySelector(\'.kb-h-tab[data-tab="' + t + '"]\'); if (b) b.click()'); await sleep(500);
    await shot(S + '_08_nha_' + t);
    await closeAll();
  }
  for (const t of ['issue', 'dict', 'shelf', 'src']) {
    await js('GardenPaper.open("' + t + '")'); await sleep(1500); await shot(S + '_09_bao_' + t);
    await closeAll();
  }
  await js('GardenFields.open()'); await sleep(1500); await shot(S + '_10_cauhinh');
  await closeAll();
  // 1.19.1: báo tiếng Anh (Kệ báo có hàng chuyển báo), Nguồn báo chưa có khoá, deck tiếng Anh
  await py(KB + 'd = kb._dialog; d.deck_id = mw.col.decks.id_for_name("M::Tiếng Anh A2"); d.refresh(); result = 1'); await sleep(2000); await closeAll();
  await js('GardenPaper.open("shelf")'); await sleep(1200); await shot(S + '_12_ke_bao_hai_bao');
  await js('const b = document.querySelectorAll(".kb-p-langs .kb-ai-chip")[1]; if (b) b.click()'); await sleep(1200);
  await js('const r = document.querySelector(".kb-p-row"); if (r) r.click()'); await sleep(1500); await shot(S + '_12_bao_tieng_anh');
  await js('document.querySelector(".kb-p-tab[data-ptab=src]").click()'); await sleep(1200); await shot(S + '_12_nguon_bao');
  await js('const b = Array.from(document.querySelectorAll(".kb-ai-lang")).pop(); const c = b && Array.from(b.querySelectorAll(".kb-ai-chip")).find((x) => x.textContent === "Chọn deck"); if (c) c.click()');
  await sleep(800); await shot(S + '_12_nguon_bao_chon_deck');
  await closeAll();
  await py(KB + 'kb._key_saved = kb.config().get("gemini_key"); kb.save_config(gemini_key=""); result = 1');
  await js('GardenPaper.open("src")'); await sleep(1200); await shot(S + '_12_nguon_bao_chua_khoa');
  await py(KB + 'kb.save_config(gemini_key=kb._key_saved); result = 1');
  await closeAll();
  await js('GardenFields.open()'); await sleep(1500); await shot(S + '_12_cauhinh_tieng_anh');
  await closeAll();
  await js('document.getElementById("kb-games").click()'); await sleep(800); await shot(S + '_12_trochoi_tieng_anh');
  await closeAll();
  await js('document.getElementById("kb-ui-open").click()'); await sleep(800); await shot(S + '_11_giaodien');
  await closeAll();
  // 1.20: Lịch hoa (tháng + khung ngày có nhật ký / luyện viết đã sửa, năm, cuốn nhật ký)
  await js('GardenCal.open({ tab: "month" })'); await sleep(2200); await shot(S + '_13_lich_thang');
  await js('document.getElementById("kb-c-stage").scrollTop = 9999'); await sleep(300); await shot(S + '_13_lich_thang_cuoi', 'khung ngày (nhật ký, luyện viết đã sửa)');
  await js('document.querySelector(".kb-c-tab[data-ctab=year]").click()'); await sleep(1800); await shot(S + '_13_lich_nam');
  await js('document.querySelector(".kb-c-tab[data-ctab=book]").click()'); await sleep(2200); await shot(S + '_13_cuon_nhat_ky');
  await closeAll();
  // 1.21: khách trên sân (mèo nằm trên ghế), Album khách cuộn tới thẻ của khách
  await js('GardenGuests._force("yard", "neko")'); await sleep(9000); await shot(S + '_14_khach_tren_san', 'mèo hoang nằm trên ghế gỗ');
  await js('GardenHome.openGuests("neko")'); await sleep(900); await shot(S + '_14_album_khach');
  await closeAll();
  await js('GardenGuests._clear()');
  // 1.22: Xưởng giống cây (đang vẽ giai đoạn Cây non, Mầm hiện mờ), mã chia sẻ + dán mã xem trước, bảng chụp ảnh vườn
  await js('GardenHome.open("yard"); GardenCraft.openSeed((Garden._data().catalog.myseeds || [])[0] || null); GardenCraft._setLayer("s2")'); await sleep(600);
  await shot(S + '_15_xuong_giong_cay');
  await closeAll();
  await js('GardenHome.open("yard"); document.querySelector(\'.kb-h-tab[data-tab="craft"]\').click()'); await sleep(400);
  await js('const b = Array.from(document.querySelectorAll("#kb-h-list .kb-h-card button")).find((x) => x.textContent === "Mã chia sẻ"); if (b) b.click()'); await sleep(1200);
  await shot(S + '_15_ma_chia_se', 'mã vừa xuất ở đầu tab Xưởng');
  await js(`const code = document.querySelector("#kb-h-list .kb-h-share textarea[readonly]").value; const t = document.querySelector("#kb-h-list .kb-h-paste textarea");
    t.value = code; t.dispatchEvent(new Event("input")); Array.from(document.querySelectorAll("#kb-h-list .kb-h-paste button")).find((x) => x.textContent === "Xem trước").click()`);
  await sleep(1200); await js('document.querySelector("#kb-h-list .kb-h-peek").scrollIntoView({ block: "center" })');
  await shot(S + '_15_dan_ma', 'xem trước món từ mã');
  await closeAll();
  await js('document.getElementById("kb-yard-snap").click()'); await sleep(400);
  await shot(S + '_15_chup_anh', 'bảng chọn cỡ ảnh');
  await js('document.getElementById("kb-snap-pop").hidden = true');
  await closeAll();
}

(async () => {
  await py(KB + `st = kb.STATE
d = st.load(); d["coins"] = 20000; d["home"]["owned"]["bench"] = 1; st.save(d)
st.place("yard", "bench", 6, 2)
# 1.22: một món tự làm + một giống cây tự vẽ (Mầm / Cây non / Ra quả) cho các màn Xưởng / Giống cây / mã chia sẻ
spr = kb.core.px_encode("." * 200 + "g" * 8 + "." * 8 + "k" * 40)
st.craft_save({"name": "Táo đỏ", "size": 16, "kind": "ground", "fx": "sway", "px": spr})
st.myseed_save({"name": "Cà chua bi", "st": ["", spr, kb.core.px_encode("." * 150 + "G" * 50 + "." * 16 + "k" * 40), "", kb.core.px_encode("." * 150 + "r" * 50 + "." * 16 + "k" * 40)]})
d = st.load(); d["coins"] = 20000; st.save(d)
result = 1`);
  // 1.20: lịch sử ôn + nhật ký + bài luyện viết đã sửa cho các màn Lịch hoa
  await py(KB + `import random, datetime, time
col = mw.col
rng = random.Random(3)
cids = list(col.db.list("select id from cards limit 300"))
day0 = int(col.sched.day_cutoff) - 86400
rows = []
for back in range(1, 120):
    n = rng.choice([0, 6, 12, 25, 40])
    for i in range(n):
        rows.append(((day0 - back * 86400 + 36000) * 1000 + i * 1000 + back, rng.choice(cids), -1, 3, 95 if i % 9 == 0 else 10, 60 if i % 9 == 0 else 5, 2500, 4000, 0 if i < 3 else 1))
col.db.executemany("insert or ignore into revlog (id,cid,usn,ease,ivl,lastIvl,factor,time,type) values (?,?,?,?,?,?,?,?,?)", rows)
t = kb.cal_today()
for back in range(0, 40, 2):
    kb.JOURNAL.update(t - datetime.timedelta(days=back), {"m": kb.journal.STICKERS[back % 8], "t": "Hôm nay đi làm về muộn, mưa to nên ghé quán cà phê gần nhà ôn bài. Ôn được 47 thẻ, cuối cùng cũng nhớ được 予約 và 天気. Tối gọi cho mẹ, kể chuyện tháng sau thi N4. Hơi lo nhưng thấy mình đang tiến bộ."[:200]})
goc = "きのうは雨だったので、友だちと駅の近くのレストランを予約しました。寒いでしたが、料理はおいしいでした。また行きたいです。"[:60]
kb.JOURNAL.update(t, {"w": {"lang": "ja", "goc": goc, "st": "done", "seen": True, "goi_y": ["予約する", "寒い"],
    "sua": goc.replace("寒いでした", "寒かったです").replace("おいしいでした", "おいしかったです"),
    "loi": [{"goc": "寒いでした", "sua": "寒かったです", "loai": "ngữ pháp", "quy_tac": "tính từ đuôi い", "giai_thich": "Tính từ đuôi い: quá khứ là bỏ い + かった(です)."},
            {"goc": "おいしいでした", "sua": "おいしかったです", "loai": "ngữ pháp", "quy_tac": "tính từ đuôi い", "giai_thich": "Cùng quy tắc như lỗi trên."},
            {"goc": "行きたいです", "sua": "行きたいと思います", "loai": "tự nhiên hơn", "quy_tac": "と思います", "giai_thich": "Nói ý định với người khác nên thêm と思います."}],
    "con_lai": "", "tu_nhien": "", "nhan_xet": "Dùng đúng 予約する và 寒い, nối câu bằng ので tự nhiên. Hai lỗi đầu cùng một quy tắc."}, "u": time.time()})
result = len(rows)`);
  // 1.30: add-on test tắt StackChan sinh hoạt cho kịch bản cũ; bộ đo bố cục cần thấy chip + StackChan nên bật lại
  await py(KB + 'kb.LIFE_TEST_OFF = False\nkb.open_garden(); result = 1'); await sleep(3000);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  for (const size of [[1366, 768], [1024, 700]]) { await tour(size); }
  const errs = await py(KB + 'result = kb.ERRORS.entries()');
  report.push({ name: 'errors.json', addon_errors: errs });
  fs.writeFileSync(SHOTS + '/audit.json', JSON.stringify(report, null, 1));
  console.log('\nnhật ký lỗi add-on: ' + (errs && errs.length ? JSON.stringify(errs).slice(0, 600) : 'trống'));
  page.close(); process.exit(0);
})().catch(e => { console.error('LỖI KỊCH BẢN:', e.message); process.exit(2); });
