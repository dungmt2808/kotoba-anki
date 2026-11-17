// 1.33.3 — chữ có lẫn ngôn ngữ khác không (người dùng 17/11: "kiểm tra lại giúp tớ code mới xem phần ngôn ngữ đang có bị
// lẫn ngôn ngữ khác vào chưa (chợ sáng, sinh hoạt câu nói stack-chan)").
// Trong Anki thật, mỗi cặp (deck Nhật / Anh / Trung / Hàn) × (Ngôn ngữ trong vườn: Tự theo deck / Nhật / Anh / Trung / Hàn /
// Chỉ tiếng Việt): bấm StackChan nhiều lần, chấm thẻ (câu khen / an ủi), xong lượt, gọi StackChan về, bấm thẻ sinh hoạt,
// Sổ sinh hoạt, chơi Chợ sáng (bán đúng / bán sai / để khách chờ), Đuổi quạ, Lật cặp. Một MutationObserver ghi MỌI chữ hiện ra
// ở bong bóng StackChan, bong bóng khách, kết quả trò chơi, thẻ sinh hoạt / Sổ sinh hoạt, tên trò, dải chúc mừng.
// Mỗi chữ so với ngôn ngữ phải có (trò chơi: ngôn ngữ của deck đang chơi; còn lại: Ngôn ngữ trong vườn):
//   - không có chữ của ngôn ngữ khác (kana / chữ Hán / Hangul) — trừ từ của deck (chữ người dùng), tên add-on ことば畑
//   - lời nói (StackChan, khách) ở chế độ Anh / Trung / Hàn có phần tiếng đó — không nói một câu chỉ có tiếng Việt
// Chạy: KB_SCRIPTS=e2e_1333_ngonngu.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
const fs = require('fs');
const { pages, Page, sleep } = require('./cdp');
const SHOTS = process.argv[2] || '/tmp/kb_shots_1333';
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && typeof GardenLang !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
async function waitFor(expr, ms = 10000) {
  const t = Date.now();
  while (Date.now() - t < ms) { try { const v = await js(expr); if (v) return v; } catch (e) { } await sleep(150); }
  return false;
}
const KB = 'import sys, os, time, json, datetime\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
async function deck(name) { await py(KB + `d = kb._dialog; d.deck_id = mw.col.decks.id_for_name(${JSON.stringify(name)}); d.refresh(); result = 1`); await sleep(1800); }
async function openGarden() {
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await sleep(600);
}
const setLang = (v) => js(`const s = document.getElementById("kb-glang"); s.value = ${JSON.stringify(v)}; s.dispatchEvent(new Event("change")); return s.value;`);

const ZH = [['你好', 'nǐ hǎo', 'xin chào', 'NHĨ HẢO'], ['谢谢', 'xièxie', 'cảm ơn', 'TẠ TẠ'], ['学生', 'xuésheng', 'học sinh', 'HỌC SINH'],
  ['老师', 'lǎoshī', 'giáo viên', 'LÃO SƯ'], ['朋友', 'péngyou', 'bạn bè', 'BẰNG HỮU'], ['吃饭', 'chī fàn', 'ăn cơm', 'NGẬT PHẠN'],
  ['喝茶', 'hē chá', 'uống trà', 'HÁT TRÀ'], ['看书', 'kàn shū', 'đọc sách', 'KHÁN THƯ']];
const KO = [['안녕하세요', 'annyeonghaseyo', 'xin chào'], ['감사합니다', 'gamsahamnida', 'cảm ơn'], ['학생', 'haksaeng', 'học sinh'],
  ['친구', 'chingu', 'bạn bè'], ['고양이', 'goyangi', 'con mèo'], ['날씨', 'nalssi', 'thời tiết']];
// 1.35: KB_NN=eu (e2e_135_ngonngu.js) — deck Nhật / Đức / Pháp × Ngôn ngữ trong vườn Tự theo deck / Nhật / Đức / Pháp / Việt
const EU_SET = process.env.KB_NN === 'eu';
const DE = [['der Hund, -e', 'con chó'], ['die Katze', 'con mèo'], ['das Haus, ¨-er', 'ngôi nhà'], ['gehen', 'đi'], ['schön', 'đẹp'],
  ['die Straße', 'con đường'], ['lernen', 'học'], ['das Mädchen', 'cô bé']];
const FR = [['le chien', 'con chó'], ['le chat', 'con mèo'], ["l'école (f)", 'trường học'], ['aller', 'đi'], ['beau', 'đẹp'],
  ['la rue', 'con đường'], ['apprendre', 'học'], ['le garçon', 'cậu bé']];
const DECKS = EU_SET ? [['ja', 'B::Có câu ví dụ, không audio'], ['de', 'ZZ::Đức'], ['fr', 'ZZ::Pháp']]
  : [['ja', 'B::Có câu ví dụ, không audio'], ['en', 'M::Tiếng Anh A2'], ['zh', 'ZZ::Trung'], ['ko', 'ZZ::Hàn']];
const PREFS = EU_SET ? ['auto', 'ja', 'de', 'fr', 'vi'] : ['auto', 'ja', 'en', 'zh', 'ko', 'vi'];
const SECOND = EU_SET ? 'de' : 'en';          // ngôn ngữ thứ hai để chơi Chợ sáng / Lật cặp với deck tiếng Nhật

// ghi chữ: chỗ hiện (vùng) + chữ + ngôn ngữ phải có lúc đó
const OBSERVE = `
  if (window.__kbScanOn) { return 1; }
  window.__kbScanOn = true; window.__kbScan = []; window.__kbCtx = {};
  const REG = [["say", "#kb-say"], ["cust", ".kb-gm-bubble"], ["gres", ".kb-gres-title, .kb-gres-perfect"],
    ["life", "#kb-life-card .kb-find-ja, #kb-life-card .kb-find-kana"], ["book", ".kb-life-cell .kb-box-ja, .kb-life-cell .kb-box-kana"],
    ["gname", ".kb-gcard-jp"], ["gtitle", "#kb-g-title"], ["banner", "#kb-joy-banner"], ["tag", ".kb-mc-tag"]];
  const seen = new Set();
  function grab(el) {
    for (const [name, sel] of REG) {
      const box = el.closest ? el.closest(sel) : null;
      if (!box || box.hidden) { continue; }
      const t = box.textContent;
      if (!t || !t.trim()) { return; }
      const c = window.__kbCtx, key = name + "|" + c.pref + "|" + c.deck + "|" + t;
      if (seen.has(key)) { return; }
      seen.add(key);
      // trò chơi (kể cả bong bóng StackChan lúc đang chơi): theo ngôn ngữ của deck đang chơi
      const inGame = !!box.closest("#kb-game") || (typeof GardenGames !== "undefined" && !!GardenGames.playing());
      const want = inGame ? GardenLang.forDeck(c.deck) : GardenLang.cur();
      window.__kbScan.push({ r: name, t: t, want: want, pref: c.pref, deck: c.deck, step: c.step || "" });
      return;
    }
  }
  new MutationObserver((muts) => {
    muts.forEach((m) => {
      const n = m.target.nodeType === 3 ? m.target.parentElement : m.target;
      if (n) { grab(n); }
      m.addedNodes && m.addedNodes.forEach((a) => { if (a.nodeType === 1) { grab(a); a.querySelectorAll && a.querySelectorAll("*").forEach(grab); } });
    });
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["hidden"] });
  return 1;`;
const ctx = (pref, deckLang, step) => js(`window.__kbCtx = { pref: ${JSON.stringify(pref)}, deck: ${JSON.stringify(deckLang)}, step: ${JSON.stringify(step)} }; return 1;`);

(async () => {
  await py(KB + `col = mw.col
def model(name, fields):
    mm = col.models
    m = mm.new(name)
    for f in fields:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = "{{%s}}" % fields[0]; t["afmt"] = "{{FrontSide}}<hr id=answer>{{%s}}" % fields[2]
    mm.add_template(m, t); mm.add(m); return mm.by_name(name)
zh = model("Chinese HSK", ["Hanzi", "Pinyin", "Nghĩa", "Hán Việt"])
ko = model("Korean vocabulary", ["Korean", "Romaja", "Nghĩa"])
dz, dk = col.decks.id("ZZ::Trung"), col.decks.id("ZZ::Hàn")
for w, p, m, hv in ${JSON.stringify(ZH)}:
    n = col.new_note(zh); n["Hanzi"], n["Pinyin"], n["Nghĩa"], n["Hán Việt"] = w, p, m, hv; col.add_note(n, dz)
for w, r, m in ${JSON.stringify(KO)}:
    n = col.new_note(ko); n["Korean"], n["Romaja"], n["Nghĩa"] = w, r, m; col.add_note(n, dk)
de = model("Deutsch Wortschatz", ["Wort", "Bedeutung", "Beispiel"])
fr = model("Vocabulaire français", ["Mot", "Sens", "Exemple"])
dd, df = col.decks.id("ZZ::Đức"), col.decks.id("ZZ::Pháp")
for w, m in ${JSON.stringify(DE)}:
    n = col.new_note(de); n["Wort"], n["Bedeutung"] = w, m; col.add_note(n, dd)
for w, m in ${JSON.stringify(FR)}:
    n = col.new_note(fr); n["Mot"], n["Sens"] = w, m; col.add_note(n, df)
today = col.sched.today
for i, cid in enumerate(col.find_cards('deck:"ZZ::*"')):
    col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=3 where id=?", 5 + i, today + 3, cid)
d = st.load(); d["coins"] = 200000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
try:
    st.open_rooms()
except Exception:
    pass
for z in kb.core.ZONE_IDS:
    try:
        st.unlock_zone(z)
    except Exception:
        pass
lc = kb.life_core
t0 = kb.cal_today() if hasattr(kb, "cal_today") else datetime.date.today()
for i, aid in enumerate(lc.ACTS):
    w = lc.ACTS[aid]["where"]
    kb.LIFE.mark(aid, "room" if w == "home" else ("yard" if w in ("yard", "out") else w), t0 - datetime.timedelta(days=1 + i % 20))
kb.save_config(show_tooltips=False, sound=False, music=False)
result = 1`);
  await openGarden();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await py(KB + 'kb._dialog.resize(1366, 860); result = 1'); await sleep(800);
  await js(OBSERVE);
  page.errors.length = 0;

  const words = new Set();
  for (const [dl, dn] of DECKS) {
    await deck(dn);
    (await js('return Garden._data().plants.map((p) => [p.word, p.reading, p.meaning, p.hanviet]);')).forEach((r) => r.forEach((w) => { if (w) words.add(String(w)); }));
    for (const pref of PREFS) {
      console.log('  · deck ' + dl + ' · vườn ' + pref);
      await setLang(pref); await sleep(250);
      await ctx(pref, dl, 'StackChan');
      for (let i = 0; i < 14; i++) { await js('document.getElementById("kb-mascot").click(); return 1;'); await sleep(60); }
      for (const ease of [1, 2, 3, 4, 1, 3, 4, 2, 3, 4]) { await js(`GardenFX.rate(${ease}); return 1;`); await sleep(50); }
      await js('GardenFX.done(); return 1;'); await sleep(60);
      await js('GardenLife.call && GardenLife.call("yard"); return 1;'); await sleep(60);
      if (dl === 'ja') {          // sinh hoạt không theo deck: một lần mỗi ngôn ngữ
        await ctx(pref, dl, 'sinh hoạt');
        await js('GardenHome.openLife(); return 1;'); await sleep(700); await js('GardenHome.close(); return 1;'); await sleep(200);
        for (const [aid, sc] of [['hon', 'room'], ['mizu', 'yard'], ['', 'yard']]) {
          await js(`GardenLife._force(${JSON.stringify(aid)}, ${JSON.stringify(sc)}); return 1;`); await sleep(1200);
          await js('GardenLife._snap(); const c = document.getElementById("kb-life-card"); if (c) c.hidden = true; document.getElementById("kb-life-chip").click(); return 1;'); await sleep(300);
          await js('GardenLife.closeCard(); return 1;');
        }
        await js('GardenLife._force(null); return 1;');
      }
      // trò chơi
      await ctx(pref, dl, 'trò chơi');
      await js('document.getElementById("kb-games").click(); return 1;'); await sleep(700);
      await ctx(pref, dl, 'Chợ sáng');
      // chữ của trò chơi theo deck (không theo Ngôn ngữ trong vườn, trừ Chỉ tiếng Việt): chơi Chợ sáng ở 2 chế độ mỗi deck
      const playMarket = pref === 'vi' || pref === (dl === 'ja' ? SECOND : 'ja');
      const can = playMarket && await js('const b = document.querySelector(\'.kb-gcard[data-game="market"]\'); if (!b || b.disabled) return false; b.click(); return true;');
      if (can) {
        for (let c = 0; c < 7; c++) {
          const b = await waitFor('const b = document.querySelector(".kb-gm-bubble"); return b && !b.hidden && !document.querySelector(".kb-gm-crate:disabled") ? 1 : 0;', 9000);
          if (!b) { break; }
          // bán đúng / bán sai xen nhau; khách thứ 5 để chờ hết kiên nhẫn
          if (c === 4) { await sleep(10600); } else {
            await js(`const want = GardenGames._debug(); const btns = Array.from(document.querySelectorAll(".kb-gm-crate"));
              const i = ${c % 2 === 0 ? 'want && want.answer !== undefined ? want.answer : 0' : '(want && want.answer !== undefined ? want.answer + 1 : 1) % btns.length'};
              if (btns[i]) btns[i].click(); return 1;`);
          }
          await sleep(900);
          await js('const n = document.querySelector(".kb-gm-strip button"); if (n) n.click(); return 1;'); await sleep(300);
        }
      }
      await js('GardenGames.close(); return 1;'); await sleep(250);
      if (pref === SECOND || pref === 'vi' || pref === 'auto') {
        await js('document.getElementById("kb-games").click(); return 1;'); await sleep(600);
        await ctx(pref, dl, 'Lật cặp');
        await js('const b = document.querySelector(\'.kb-gcard[data-game="memory"]\'); if (b && !b.disabled) b.click(); return 1;'); await sleep(1200);
        await js('Array.from(document.querySelectorAll(".kb-mc")).slice(0, 4).forEach((b) => b.click()); return 1;'); await sleep(600);
        await js('GardenGames.close(); return 1;'); await sleep(250);
      }
    }
    await shot_('1333_ngonngu_' + dl);
  }
  async function shot_(n) { await page.shot(SHOTS + '/' + n + '.png'); }

  const rec = await js('return window.__kbScan;');
  fs.writeFileSync(SHOTS + '/1333_ngonngu.json', JSON.stringify(rec, null, 1));
  // bỏ chữ của người dùng: từ của deck (dài trước), phần trong dấu cô lập, tên add-on
  const wl = Array.from(words).filter((w) => w.length > 0).sort((a, b) => b.length - a.length);
  const strip = (t) => { let s = t.replace(/⁨[^⁩]*⁩/g, ' ').replace(/ことば畑/g, ' '); wl.forEach((w) => { s = s.split(w).join(' '); }); return s; };
  const KANA = /[぀-ヿ]/, HAN = /[㐀-鿿]/, HANGUL = /[가-힣ᄀ-ᇿ㄰-㆏]/;
  const VIW = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;
  const bad = {};
  const add = (k, x) => { (bad[k] = bad[k] || []).push('[' + x.want + ' · vườn ' + x.pref + ' · deck ' + x.deck + ' · ' + x.step + '] ' + x.r + ': ' + JSON.stringify(x.t.slice(0, 70))); };
  rec.forEach((x) => {
    const s = strip(x.t);
    const leak = (x.want === 'en' || x.want === 'de' || x.want === 'fr') ? KANA.test(s) || HAN.test(s) || HANGUL.test(s)
      : x.want === 'zh' ? KANA.test(s) || HANGUL.test(s)
        : x.want === 'ko' ? KANA.test(s) || HAN.test(s)
          : x.want === 'vi' ? KANA.test(s) || HAN.test(s) || HANGUL.test(s)
            : HANGUL.test(s);
    if (leak) { add('leak', x); }
    // lời nói ở chế độ tiếng nước ngoài: phải có phần tiếng đó (không chỉ câu tiếng Việt)
    // khách hỏi theo nghĩa / Hán Việt (chữ tiếng Việt của deck) thì hỏi bằng tiếng Việt — đúng cách chơi
    const viAsk = x.r === 'cust' && /^(Cho tôi “|Ở đây có “|Bán cho tôi “)/.test(x.t);
    if ((x.r === 'say' || x.r === 'cust') && x.want !== 'vi' && !viAsk) {
      const tokens = s.split(/[\s!?.,…“”"'「」！？。、]+/).filter((w) => w);
      const foreign = x.want === 'zh' ? /[㐀-鿿]/.test(x.t) : x.want === 'ko' ? /[가-힣]/.test(x.t)
        : x.want === 'ja' ? /[぀-ヿ㐀-鿿]/.test(x.t)
        // tiếng Đức / Pháp: từ có ä ö ü ß œ ç, hoặc từ Latin không có dấu tiếng Việt (é è à… dùng chung nên không tính)
        : tokens.some((w) => (/[A-Za-z]{2,}/.test(w) && !VIW.test(w) && !/^(Combo|xu|nha|nhé|ok)$/i.test(w)) || /[äöüßœçÄÖÜ]/.test(w));
      const hasViet = tokens.some((w) => VIW.test(w));
      if (!foreign && hasViet) { add('viOnly', x); }
    }
  });
  const per = {};
  rec.forEach((x) => { const k = x.r; per[k] = (per[k] || 0) + 1; });
  console.log('đã ghi ' + rec.length + ' chữ khác nhau: ' + JSON.stringify(per));
  ok(rec.length > 400 && per.say > 100 && per.cust > 40 && per.life > 10 && per.book > 50, 'quét đủ chỗ: ' + JSON.stringify(per));
  for (const [k, msg] of [['leak', 'không lẫn chữ của ngôn ngữ khác (kana / chữ Hán / Hangul) ở mọi cặp deck × Ngôn ngữ trong vườn'],
    ['viOnly', 'chế độ Nhật / Anh / Trung / Hàn: StackChan và khách ở Chợ sáng không nói câu chỉ có tiếng Việt (trừ khách hỏi theo nghĩa)']]) {
    const l = bad[k] || [];
    ok(!l.length, msg + (l.length ? ' — ' + l.length + ' chỗ:\n      ' + Array.from(new Set(l)).slice(0, 30).join('\n      ') : ''));
  }
  // tiêu đề bảng trò chơi = ngôn ngữ của deck (không theo vườn), cả sau khi đổi Ngôn ngữ trong vườn lúc bảng đang mở
  await deck(EU_SET ? 'ZZ::Đức' : 'ZZ::Hàn'); await setLang(EU_SET ? 'fr' : 'zh'); await sleep(300);
  await js('document.getElementById("kb-games").click(); return 1;'); await sleep(700);
  const t1 = await js('return document.getElementById("kb-g-title").textContent;');
  await setLang(EU_SET ? 'ja' : 'en'); await sleep(500);
  const t2 = await js('return document.getElementById("kb-g-title").textContent;');
  await setLang('vi'); await sleep(500);
  const t3 = await js('return document.getElementById("kb-g-title").textContent;');
  await js('GardenGames.close(); return 1;');
  if (EU_SET) {
    ok(/^Minispiele · /.test(t1) && /^Minispiele · /.test(t2) && t3 === 'Trò chơi ôn từ',
      'bảng trò chơi deck tiếng Đức: tiêu đề tiếng Đức dù vườn tiếng Pháp / Nhật; Chỉ tiếng Việt → tiếng Việt: ' + [t1, t2, t3].join(' | '));
  } else {
    ok(/^미니게임 · /.test(t1) && /^미니게임 · /.test(t2) && t3 === 'Trò chơi ôn từ', 'bảng trò chơi deck tiếng Hàn: tiêu đề tiếng Hàn dù vườn tiếng Trung / Anh; Chỉ tiếng Việt → tiếng Việt: ' + [t1, t2, t3].join(' | '));
  }
  ok(!page.errors.length, 'không lỗi JS' + (page.errors.length ? ' — ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(2); });
