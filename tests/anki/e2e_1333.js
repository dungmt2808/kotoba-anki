// 1.33.3 — giao diện khi Anki đọc lỗi / còn dữ liệu chờ trả lại sau đồng bộ (audit 17/11 F01, F06), trong Anki thật.
//   1. đọc lỗi kéo dài khoá kotoba_batake_more: vườn vẫn mở, hiện dòng cảnh báo "tạm chỉ xem"; mua đồ → câu báo đúng lý do
//      (không phải "Thiếu … xu"); collection + file sao lưu không đổi một byte; hết lỗi → dòng cảnh báo tắt, thú / đồ còn
//   2. trả lại sau đồng bộ bị lỗi ghi: vườn chặn thao tác với câu "chưa trả lại xong…"; hết lỗi → bấm làm mới là về bản tốt
//   3. đọc lỗi MỘT lần (thoáng qua): không ai thấy gì — mua được bình thường
// Chạy: KB_SCRIPTS=e2e_1333.js run_ui.sh ADDON SHOTS (cần ANKI_PY)
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
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined"').catch(() => false), sleep(3000).then(() => false)]);
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
const KB = 'import sys, os, json, hashlib, copy\nkb = sys.modules["kotoba_batake"]\nst = kb.STATE\nfrom aqt import mw\n';
const shot = (n) => page.shot(SHOTS + '/' + n + '.png');
const SNAP = KB + `res = {}
for k in sorted(mw.col.all_config()):
    if k.startswith("kotoba_batake") and k != "kotoba_batake_rev":
        res["col:" + k] = hashlib.sha1(json.dumps(mw.col.get_config(k), sort_keys=True, ensure_ascii=False).encode()).hexdigest()
uf = os.path.join(kb.ADDON_DIR, "user_files")
for root, _d, files in os.walk(uf):
    for f in files:
        p = os.path.join(root, f)
        if "/logs/" in p or "anh_vuon" in p or f.endswith((".log", ".tmp")) or f in ("errors.json",):     # ảnh vườn tự chụp khi xem (tính năng)
            continue
        res["file:" + os.path.relpath(p, uf)] = hashlib.sha1(open(p, "rb").read()).hexdigest()
result = res`;
const diff = (a, b) => Object.keys(Object.assign({}, a, b)).filter((k) => a[k] !== b[k]);
// lỗi đọc (n lần đầu, 0 = mãi) / lỗi ghi ở một khoá của collection đang mở
const READ_FAULT = (key, n) => KB + `C = type(mw.col)
if not hasattr(kb, "_t_get"):
    kb._t_get = C.get_config
kb._t_hits = []
def _bad(self, name, *a, **kw):
    if self is mw.col and name == ${JSON.stringify(key)} and (${n} == 0 or len(kb._t_hits) < ${n}):
        kb._t_hits.append(name)
        raise OSError("TEST: không đọc được")
    return kb._t_get(self, name, *a, **kw)
C.get_config = _bad
result = 1`;
const WRITE_FAULT = (key) => KB + `C = type(mw.col)
if not hasattr(kb, "_t_set"):
    kb._t_set = C.set_config
kb._t_whits = []
def _badw(self, name, value, *a, **kw):
    if self is mw.col and name == ${JSON.stringify(key)}:
        kb._t_whits.append(name)
        raise OSError("TEST: không ghi được")
    return kb._t_set(self, name, value, *a, **kw)
C.set_config = _badw
result = 1`;
const CLEAR = KB + `C = type(mw.col)
if hasattr(kb, "_t_get"):
    C.get_config = kb._t_get
if hasattr(kb, "_t_set"):
    C.set_config = kb._t_set
result = 1`;
async function refresh() { await py(KB + 'kb._dialog.refresh(); result = 1'); await sleep(1200); }
async function homeMsg(cmd) {
  // gửi lệnh Nhà qua cầu nối thật, đọc câu báo trả về trang (homeError / toast)
  await js('window.__kbLastErr = ""; const o = Garden.homeError; if (!window.__kbHook && o) { window.__kbHook = 1; Garden.homeError = function (m) { window.__kbLastErr = String(m && m.msg || m); return o.apply(this, arguments); }; } return 1;');
  await py(KB + `kb._dialog._on_home(${JSON.stringify(cmd)}); result = 1`).catch((e) => String(e));
  await sleep(700);
  return js('return window.__kbLastErr || (document.querySelector(".kb-toast:not([hidden])") || {}).textContent || "";');
}

(async () => {
  await py(KB + `d = st.load(); d["coins"] = 20000; st.save(d)
for _ in range(7):
    try:
        st.build()
    except Exception:
        break
st.pet_buy("neko")
kb.save_config(show_tooltips=False, sound=False, music=False)
result = 1`);
  await py(KB + 'kb.open_garden(); result = 1'); await sleep(2500);
  page = await gardenPage();
  if (!page) { console.log('không thấy trang vườn'); process.exit(2); }
  await js('if (typeof GardenTour !== "undefined" && GardenTour.close) GardenTour.close(); const g = document.getElementById("kb-greet"); if (g) g.click(); return 1;');
  await py(KB + 'kb._dialog.resize(1280, 860); result = 1'); await sleep(900);
  page.errors.length = 0;

  console.log('== 1. đọc lỗi kéo dài (kotoba_batake_more)');
  ok(await js('const b = document.getElementById("kb-damaged"); return !b || b.hidden;'), 'bình thường: không có dòng cảnh báo');
  const s0 = await py(SNAP);
  await py(READ_FAULT('kotoba_batake_more', 0));
  await refresh();
  const ban = await js('const b = document.getElementById("kb-damaged"); return b && !b.hidden ? b.textContent : "";');
  ok(/Anki đang báo lỗi khi đọc dữ liệu vườn/.test(ban) && /dữ liệu thật vẫn còn nguyên/.test(ban), 'vườn vẫn mở, dòng cảnh báo: ' + ban.slice(0, 90) + '…');
  await shot('1333_01_doc_loi');
  const msg = await homeMsg('buy:bench');
  ok(/Anki báo lỗi khi đọc/.test(msg) && !/Thiếu/.test(msg), 'mua ghế lúc đọc lỗi → câu báo đúng lý do: ' + msg.slice(0, 80));
  const msg2 = await homeMsg('pet:buy:ahiru');
  ok(!/Thiếu|chưa có/.test(msg2), 'mua thú lúc đọc lỗi → không báo "thiếu xu / chưa có": ' + msg2.slice(0, 80));
  await py(CLEAR);
  const s1 = await py(SNAP);
  const ch = diff(s0, s1);
  ok(Object.keys(s0).length > 5 && !ch.length, 'collection + file sao lưu không đổi một byte (' + Object.keys(s0).length + ' mục)' + (ch.length ? ' — đổi: ' + ch.join(', ') : ''));
  await refresh();
  ok(await js('const b = document.getElementById("kb-damaged"); return !!b && b.hidden;'), 'hết lỗi, làm mới: dòng cảnh báo tắt');
  ok((await py(KB + 'result = sorted(st.load()["more"]["pets"])')).indexOf('neko') >= 0, 'mèo vẫn còn');

  console.log('== 2. đọc lỗi một lần (thoáng qua)');
  const c0 = await py(KB + 'result = st.load()["coins"]');
  await py(READ_FAULT('kotoba_batake_state', 1));
  const m3 = await homeMsg('buy:bench');
  await py(CLEAR);
  const c1 = await py(KB + 'result = st.load()["coins"]');
  ok(!/lỗi/.test(m3) && c1 < c0 && (await py(KB + 'result = st.load()["home"]["owned"].get("bench", 0)')) >= 1, 'đọc lại được → mua ghế bình thường (' + c0 + ' → ' + c1 + ' xu)');

  console.log('== 3. trả lại sau đồng bộ bị lỗi ghi');
  await py(KB + `sc = kb.sync_core
d = st.load(); d["coins"] = 1000; st.save(d)
kb._t_old = copy.deepcopy(sc.state_of(mw.col))
st.pet_buy("usagi")
d = st.load(); d["coins"] = 2000; st.save(d)
kb._t_mine = sc.before_sync(mw.col, kb.USER_DIR)
for k, v in kb._t_old["keys"].items():
    mw.col.set_config(k, v)                     # như bản cũ vừa mang về
result = 1`);
  await py(WRITE_FAULT('kotoba_batake_state'));
  const r1 = await py(KB + 'result = kb.sync_core.after_sync(mw.col, kb.USER_DIR, kb._t_mine)["action"]');
  ok(r1 === 'failed', 'trả lại lỗi (Anki không ghi được): ' + r1);
  await refresh();
  const ban2 = await js('const b = document.getElementById("kb-damaged"); return b && !b.hidden ? b.textContent : "";');
  ok(/chưa trả lại xong/.test(ban2), 'vườn: dòng cảnh báo "dữ liệu mới hơn chưa trả lại xong…": ' + ban2.slice(0, 80) + '…');
  await shot('1333_02_cho_tra_lai');
  const m4 = await homeMsg('buy:fence');
  ok(/chưa trả lại xong/.test(m4), 'mua đồ khi còn chờ → bị chặn với câu giải thích: ' + m4.slice(0, 70));
  const pend = await py(KB + 'result = kb.sync_core.read_record(kb.USER_DIR, mw.col)["pending"]');
  ok(pend === true, 'bản chụp tốt vẫn giữ, có dấu chờ');
  await py(CLEAR);
  await refresh();
  const got = await py(KB + 'd = st.load()\nresult = [d["coins"], sorted(d["more"]["pets"]), kb.sync_core.read_record(kb.USER_DIR, mw.col)["pending"]]');
  ok(got[0] === 2000 && got[1].indexOf('usagi') >= 0 && got[2] === false, 'hết lỗi, làm mới vườn: về bản tốt (2.000 xu, có thỏ), bỏ dấu chờ: ' + JSON.stringify(got));
  ok(await js('const b = document.getElementById("kb-damaged"); return !!b && b.hidden;'), 'dòng cảnh báo tắt');
  const coinsShown = await js('return (document.querySelector("#kb-coins, .kb-coins") || {}).textContent || "";');
  ok(/2\.000/.test(coinsShown), 'ví trên trang: ' + coinsShown);
  await shot('1333_03_da_tra_lai');
  console.log('== 4. F05: thẻ được chấm ở chỗ khác, cards.mod trùng giây (đặt lại mod cho chắc, không phụ thuộc tốc độ máy)');
  const race = await py(KB + `import time
col = mw.col
did = col.decks.id("E1333::Cùng giây")
m = col.models.by_name("Basic") or col.models.all()[0]
for t in ("Cùng giây A", "Cùng giây B"):
    n = col.new_note(m); n.fields[0] = t; n.fields[1] = "x"; col.add_note(n, did)
kb._t_warn = []
kb._t_sw = kb.showWarning
kb.showWarning = lambda text, **kw: kb._t_warn.append(str(text))
d = kb._dialog; d.deck_id = did; d.refresh(); d._dispatch("rv:start")
cached = d._card
top = col.sched.get_queued_cards(fetch_limit=1).cards[0]
card = col.get_card(top.card.id); card.start_timer()
col.sched.answer_card(col.sched.build_answer(card=card, states=top.states, rating=3))     # chấm ở chỗ khác
col.db.execute("update cards set mod = ? where id = ?", int(cached.mod), card.id)        # cùng giây với lúc hiện ra
kb._t_cid = card.id
cur = col.get_card(card.id)
result = {"same_mod": cur.mod == cached.mod, "reps": [cached.reps, cur.reps], "changed": kb._card_changed(cached),
          "rev": col.db.scalar("select count() from revlog where cid = ?", card.id)}`);
  await js('document.getElementById("kb-show") && !document.getElementById("kb-show").hidden && document.getElementById("kb-show").click(); return 1;');
  await sleep(400);
  await py(KB + 'kb._dialog._dispatch("rv:show:")\nkb._dialog._dispatch("rv:ans:3")\nresult = 1');
  for (let i = 0; i < 60 && await py(KB + 'result = kb._dialog._busy'); i++) { await sleep(100); }
  const after = await py(KB + `d = kb._dialog
result = {"warn": kb._t_warn, "same": bool(d._card and d._card.id == kb._t_cid), "rev": mw.col.db.scalar("select count() from revlog where cid = ?", kb._t_cid)}
kb.showWarning = kb._t_sw`);
  ok(race.same_mod && race.reps[0] !== race.reps[1] && race.changed, 'cùng cards.mod nhưng lịch ôn đã khác → vườn nhận ra thẻ đã đổi ' + JSON.stringify(race));
  ok(!after.warn.length && !after.same && after.rev === race.rev, 'chấm trong vườn: không hộp lỗi, không chấm lần hai, sang thẻ kế tiếp ' + JSON.stringify(after));
  ok(!page.errors.length, 'không lỗi JS' + (page.errors.length ? ' — ' + page.errors.slice(0, 3).join(' | ') : ''));
  console.log(`\nKẾT QUẢ: ${pass}/${total}`);
  process.exit(pass === total ? 0 : 1);
})().catch((e) => { console.log('LỖI', e); process.exit(2); });
