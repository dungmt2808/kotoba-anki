// 1.31.2 trong Anki thật + MÁY CHỦ ĐỒNG BỘ THẬT của Anki (chạy cục bộ) + "điện thoại" (tests/dong_bo/may_khac.py):
// kiểm tra lần cuối trước phát hành — các kịch bản mất dữ liệu ngoài bộ test có sẵn.
//   1. Điện thoại ôn thẻ khi chưa đồng bộ rồi mới đồng bộ → máy tính đồng bộ lại vẫn còn ghế vừa mua, nhật ký vừa viết
//      (Anki đồng bộ cấu hình collection nguyên khối; trước 1.31.2 phần này mất). Lượt ôn của điện thoại vẫn được bù xu.
//   2. Tắt `sync_guard` → lỗi cũ hiện lại (chứng tỏ kịch bản thật sự bắt được lỗi), bật lại thì hết.
//   3. Đồng bộ toàn bộ: điện thoại đổi cấu trúc, máy tính chọn "Download" khi đang có 2 lượt ôn chưa đẩy lên → dữ liệu vườn
//      còn, sổ Undo được bỏ (không trừ xu như thể người dùng vừa Undo), không hộp lỗi nào.
//   4. Bảng ôn của vườn: thẻ đang hiện bị chấm ở chỗ khác / bị xoá → sang thẻ kế tiếp (trước: hộp lỗi lặp mãi); deck hiện
//      tại của Anki đổi giữa chừng → vẫn lấy thẻ của deck đang xem trong vườn.
//   5. Collection đang đóng (Anki đồng bộ toàn bộ) mà trang gửi lệnh → không hộp lỗi, không ghi gì; nhật ký báo "chưa lưu
//      được" và giữ chữ; mở lại thì lưu được.
//   5b. Đang đồng bộ thường: ghi của vườn bị từ chối / xếp hàng tới khi so xong (không đóng dấu mới lên bản cũ vừa về).
//   0 + 6. Mở Anki sang ngày mới / mở lại khi đã có lượt ôn: mở hồ sơ + tự đồng bộ không sửa collection (máy đang giữ bản
//      cũ không thành bên "mới hơn"); việc lúc mở hồ sơ có ghi vào collection thì đợi lần tự đồng bộ xong.
//   7. Máy tính thứ hai (hồ sơ Anki khác, cài add-on, chơi thử rồi mới đăng nhập + tải về) → nhận vườn thật, không đè;
//      chơi tiếp trên máy hai → máy một mở lại thấy đủ.
// Chạy: ANKI_PY=<python có aqt> bash tests/dong_bo/run_e2e.sh [ADDON] OUT
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { pages, Page, sleep } = require('./cdp');
const OUT = process.argv[2] || '/tmp/kb_e2e_1312';
fs.mkdirSync(OUT, { recursive: true });
const CDP = Number(process.env.KB_CDP_PORT || 12931), CTRL = Number(process.env.KB_CTRL_PORT || 12932);
const PYBIN = process.env.ANKI_PY || 'python3', EP = process.env.KB_SYNC_EP, WORK = process.env.KB_WORK;
const BASE = process.env.KB_BASE, BASE_B = process.env.KB_BASE_B;
const MAY_KHAC = path.join(__dirname, '..', 'dong_bo', 'may_khac.py');
const KB = 'import sys,os,json,time,datetime\nkb=sys.modules["kotoba_batake"]\nst=kb.STATE\n';
let pass = 0, total = 0, page = null;
function ok(c, m) { total++; if (c) pass++; console.log((c ? '  ✓ ' : '  ✗ ') + m); }
async function py(code) {
  const r = await fetch('http://127.0.0.1:' + CTRL, { method: 'POST', body: KB + code });
  const j = await r.json(); if (j.err) throw new Error(j.err); return j.r;
}
function phone(...cmds) {
  const out = cp.execFileSync(PYBIN, [MAY_KHAC, path.join(WORK, 'dien_thoai'), EP, ...cmds], { encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
}
async function alive() { try { return await py('result=bool(mw.col)'); } catch (e) { return null; } }
async function waitUp() { for (let i = 0; i < 120; i++) { if (await alive()) return true; await sleep(500); } throw new Error('Anki không mở được'); }
async function stopAnki() {
  if (page) { page.close(); page = null; }
  await py('mw.close()\nresult=1').catch(() => null);
  for (let i = 0; i < 120; i++) { if ((await alive()) === null) return; await sleep(500); }
  throw new Error('Anki không tắt');
}
function startAnki(base, log) {
  const fd = fs.openSync(path.join(OUT, log), 'w');
  cp.spawn(PYBIN, ['-c', 'import aqt; aqt.run()', '-b', base, '-p', 'Test'], { detached: true, stdio: ['ignore', fd, fd] }).unref();
}
// nối hồ sơ với máy chủ đồng bộ cục bộ + tự trả lời hộp hỏi của Anki (ghi lại hộp nào đã hiện)
const SETUP = `
from aqt.qt import QApplication, QTimer, QAbstractButton
kb._seen = getattr(kb, "_seen", [])
kb._prefer = ["Upload", "Yes", "OK"]
def _closer():
    w = QApplication.activeModalWidget()
    if w is None:
        return
    btns = [b for b in w.findChildren(QAbstractButton) if b.isVisible()]
    kb._seen.append([type(w).__name__, (getattr(w, "text", lambda: "")() or "")[:140]])
    for want in kb._prefer:
        for b in btns:
            if want.lower() in b.text().replace("&", "").lower():
                b.click()
                return
    w.close()
if getattr(kb, "_closer", None):
    kb._closer.stop()
kb._closer = QTimer(mw)
kb._closer.timeout.connect(_closer)
kb._closer.start(200)
result = True
`;
const LOGIN = `
auth = mw.col.sync_login(username="u", password="p", endpoint=${JSON.stringify(EP)})
mw.pm.profile["syncKey"] = auth.hkey
mw.pm.profile["syncUser"] = "u"
mw.pm.profile["customSyncUrl"] = ${JSON.stringify(EP)}
mw.pm.profile["autoSync"] = True
mw.pm.profile["syncMedia"] = False
mw.pm.save()
result = True
`;
async function guiSync() {
  await py('kb._sync_done=False\ndef _d():\n    kb._sync_done=True\nmw._sync_collection_and_media(_d)\nresult=1');
  for (let i = 0; i < 160; i++) { if (await py('result=bool(kb._sync_done) and not mw.progress.busy()')) return; await sleep(250); }
  throw new Error('đồng bộ không xong');
}
async function gardenPage() {
  const anki = new Set(['top toolbar', 'bottom toolbar', 'main webview']);
  for (let k = 0; k < 40; k++) {
    for (const info of (await pages(CDP)).filter(i => !anki.has(i.title))) {
      const p = await Page.open(info.webSocketDebuggerUrl).catch(() => null);
      if (!p) continue;
      const yes = await Promise.race([p.eval('typeof Garden !== "undefined" && !!Garden._data()').catch(() => false), sleep(3000).then(() => false)]);
      if (yes) return p;
      p.close();
    }
    await sleep(500);
  }
  throw new Error('không thấy trang vườn');
}
const VIEW = `
day = kb.cal_today()
w = st.load()
result = {"coins": w["coins"], "bench": w["home"]["owned"].get("bench", 0), "diary": kb.JOURNAL.entry(day).get("t", ""),
          "revlog": mw.col.db.scalar("select count() from revlog"), "guard": kb._sync_guard_log["n"], "why": kb._sync_guard_log["last"],
          "ledger": len(kb._ledger), "rev": (mw.col.get_config("kotoba_batake_rev", None) or {}).get("t", 0),
          "errors": len(kb.ERRORS.entries()) if hasattr(kb.ERRORS, "entries") else -1}
`;
const view = () => py(VIEW);
const seen = async () => { const s = await py('result=list(kb._seen)\nkb._seen.clear()'); return s; };

(async () => {
  if (!WORK || !EP) throw new Error('Chạy bằng tests/dong_bo/run_e2e.sh');
  await py(SETUP);
  // như bản phát hành: mốc chuỗi thật (zz_kbtest tắt cho kịch bản cũ), hỏi trước khi trả xu tắt (bấm là mua), không màn chào
  await py('kb.STREAK_TEST_ALL=False\nkb._streak_start()\nkb.save_config(mobile_coins=True, show_tooltips=False, sync_guard=True)\nresult=1');
  await py(LOGIN);
  await py('kb._prefer=["Yes","Upload","OK"]\nresult=1');
  await guiSync();                                     // máy chủ trống → tải collection lên
  ok(phone('sync:down', 'keys').pop().includes('kotoba_batake_state'), 'chuẩn bị: máy tính đẩy collection lên, điện thoại tải về (đã có khoá của vườn)');
  await seen();

  console.log('== 0. Mở Anki sang ngày mới: mở hồ sơ + tự đồng bộ không sửa collection');
  await stopAnki();                                    // đóng Anki (tự đồng bộ lúc đóng)
  const mod0 = cp.execFileSync(PYBIN, ['-c', `
import sqlite3, sys
c = sqlite3.connect(sys.argv[1])
c.execute("update col set crt = crt - 86400")          # collection "tạo hôm qua" → hôm nay là ngày kế tiếp của Anki
c.commit()
print(c.execute("select mod from col").fetchone()[0])`, path.join(BASE, 'Test', 'collection.anki2')], { encoding: 'utf8' }).trim();
  startAnki(BASE, 'anki_ngay_moi.log');
  await waitUp();
  await sleep(15000);                                  // qua cả lần tự đồng bộ lúc mở + các việc hẹn 8 giây / 12 giây
  const z = await py(`result={"mod": str(mw.col.db.scalar("select mod from col")), "pending": kb._open_pending, "busy": mw.progress.busy(),
"guard": kb._sync_guard_log["n"], "today": mw.col.sched.today, "unburied": mw.col.get_config("lastUnburied", None)}`);
  ok(z.today >= 1 && z.pending === false && !z.busy, `Anki mở lại ở ngày ${z.today}: việc lúc mở hồ sơ đã chạy sau lần tự đồng bộ`);
  ok(z.mod === mod0, `collection không bị sửa (mod ${mod0} giữ nguyên) → máy đang giữ bản cũ sẽ nhận bản mới của máy chủ thay vì đè lên`);
  ok(z.guard === 0, 'không có gì phải trả lại');
  await py(SETUP);
  await py('kb.STREAK_TEST_ALL=False\nresult=1');
  await py('kb.open_garden()\nkb._dialog.resize(1100, 820)\nresult=1');
  page = await gardenPage();

  console.log('== 1. Điện thoại ôn khi chưa đồng bộ → máy tính vẫn giữ được ghế + nhật ký');
  await py(`st.add_coins(100); st.add_coins(100)
st.buy("bench")
kb.JOURNAL.update(kb.cal_today(), {"t": "nhật ký viết trên máy tính (lần 1)"})
kb._dialog.refresh()
result=1`);
  const a1 = await view();
  await guiSync();
  await sleep(1100);
  const p1 = phone('review:2', 'sync', 'get:kotoba_batake_state');
  ok(p1[0] === 2 && p1[2].coins < a1.coins, `điện thoại ôn 2 thẻ rồi đồng bộ; bản ví nó giữ hộ là bản cũ (${p1[2].coins} xu < ${a1.coins})`);
  await sleep(1100);
  await guiSync();
  await sleep(600);
  const a2 = await view();
  ok(a2.bench === a1.bench && a2.bench >= 1 && a2.diary === 'nhật ký viết trên máy tính (lần 1)', `máy tính đồng bộ lại: ghế còn (${a2.bench}), nhật ký còn`);
  ok(a2.coins === a1.coins + 2 && a2.revlog === a1.revlog + 2, `xu ${a1.coins} → ${a2.coins}: giữ nguyên + bù 2 lượt ôn của điện thoại`);
  ok(a2.guard === 1 && /cũ hơn|chưa có dấu/.test(a2.why), 'lớp giữ dữ liệu đã trả lại một lần (' + a2.why + ')');
  ok(await page.eval('Garden._data().wallet.coins') === a2.coins, 'trang vườn hiện đúng số xu sau đồng bộ');
  const s1 = await seen();
  ok(s1.length === 0, 'không hộp thoại nào bật lên' + (s1.length ? ' — ' + JSON.stringify(s1) : ''));
  await page.shot(path.join(OUT, '01_sau_khi_dien_thoai_de.png'));
  await guiSync();                                     // đẩy bản đã giữ lên
  await sleep(1100);
  const p2 = phone('sync', 'get:kotoba_batake_state');
  ok(p2[1].coins === a2.coins && p2[1].home.owned.bench === a2.bench, 'điện thoại đồng bộ khi không có gì mới → nhận bản mới của máy tính');
  const recDir = await py('from kotoba_batake import sync_core\nresult=os.path.dirname(sync_core.record_path(kb.USER_DIR, mw.col))');
  ok(fs.existsSync(path.join(recDir, 'dong_bo.json')) && fs.existsSync(path.join(recDir, 'dong_bo_bi_de.json')) && /ho_so/.test(recDir),
    'bản chụp + bản bị thay nằm trong user_files/ho_so/<mã hồ sơ>/');

  console.log('== 2. Tắt sync_guard → lỗi cũ hiện lại; bật lại thì hết');
  await py('kb.save_config(sync_guard=False)\nkb.JOURNAL.update(kb.cal_today(), {"t": "viết lúc tắt lớp giữ"})\nst.add_coins(50)\nresult=1');
  const b1 = await view();
  await guiSync(); await sleep(1100);
  phone('review:1', 'sync'); await sleep(1100);
  await guiSync(); await sleep(400);
  const b2 = await view();
  ok(b2.diary !== 'viết lúc tắt lớp giữ' && b2.coins < b1.coins, `không có lớp giữ: nhật ký quay về "${b2.diary}", xu ${b1.coins} → ${b2.coins} (đúng lỗi cũ)`);
  await py('kb.save_config(sync_guard=True)\nresult=1');
  await guiSync(); await sleep(1100); phone('sync'); await sleep(1100);
  await py('kb.JOURNAL.update(kb.cal_today(), {"t": "viết lúc đã bật lại"})\nresult=1');
  await guiSync(); await sleep(1100);
  phone('review:1', 'sync'); await sleep(1100);
  await guiSync(); await sleep(400);
  ok((await view()).diary === 'viết lúc đã bật lại', 'bật lại: nhật ký còn sau khi điện thoại đè');
  await guiSync(); await sleep(1100); phone('sync');

  console.log('== 3. Đồng bộ toàn bộ: máy tính chọn Download khi có 2 lượt ôn chưa đẩy lên');
  const did = await py('result=[x.id for x in mw.col.decks.all_names_and_ids() if mw.col.db.scalar("select count() from cards where did=? and queue=0", x.id) >= 6][0]');
  await py(`kb._dialog._dispatch("deck:${did}")\nresult=1`);
  for (let i = 0; i < 2; i++) {
    await py('d=kb._dialog\nif d._card is None: d._dispatch("rv:start")\nd._dispatch("rv:show:")\nd._dispatch("rv:ans:3")\nresult=1');
    for (let k = 0; k < 40; k++) { if (await py('result=(not kb._dialog._busy) and kb._dialog._card is not None')) break; await sleep(100); }
  }
  await py('kb._dialog._dispatch("rv:stop")\nkb.JOURNAL.update(kb.cal_today(), {"t": "viết trước lần tải về toàn bộ"})\nresult=1');
  const c1 = await view();
  ok(c1.ledger === 2, 'ôn 2 thẻ trong vườn (sổ Undo có 2 lượt)');
  await sleep(1100);
  ok(phone('schema', 'sync')[1] === 'full-up', 'điện thoại đổi cấu trúc rồi tải cả collection lên');
  await sleep(1100);
  await py('kb._prefer=["Download","Yes","OK"]\nkb._seen.clear()\nresult=1');
  await guiSync(); await sleep(800);
  const c2 = await view();
  const s3 = await seen();
  // Anki 26.x: một hộp "There is a conflict…"; Anki 23.10: hộp hỏi kiểu cũ (chữ khác) → chỉ cần có hộp hỏi và đã chọn Download
  ok(s3.length >= 1 && s3.length <= 2, 'Anki hỏi tải lên / tải về → chọn Download (' + s3.map((x) => x[0] + ': ' + x[1].slice(0, 40)).join(' | ') + ')');
  ok(c2.revlog === c1.revlog - 2, `collection tải về: 2 lượt ôn chưa đẩy lên không còn (${c1.revlog} → ${c2.revlog})`);
  ok(c2.diary === 'viết trước lần tải về toàn bộ' && c2.bench === c1.bench, 'dữ liệu vườn (nhật ký, ghế) còn nguyên');
  ok(c2.ledger === 0 && c2.coins === c1.coins, `sổ Undo đã bỏ, xu giữ nguyên ${c2.coins} (không bị trừ như thể vừa Undo)`);
  ok(c2.errors <= 0 || c2.errors === c1.errors, 'nhật ký lỗi không thêm dòng nào');
  await py('kb._prefer=["Upload","Yes","OK"]\nresult=1');
  await guiSync(); await sleep(1100); phone('sync');

  console.log('== 4. Bảng ôn: thẻ đổi ở chỗ khác / bị xoá / deck hiện tại đổi');
  const r4 = await py(`d=kb._dialog
d._dispatch("rv:start")
c=d._card
q=mw.col.sched.get_queued_cards(fetch_limit=1); top=q.cards[0]
card=mw.col.get_card(top.card.id); card.start_timer()
mw.col.sched.answer_card(mw.col.sched.build_answer(card=card, states=top.states, rating=2))     # chấm ở chỗ khác
r0=mw.col.db.scalar("select count() from revlog")
kb._seen.clear()
d._dispatch("rv:show:")
d._dispatch("rv:ans:3")
result={"same": card.id==c.id, "first": c.id, "now": d._card.id if d._card else None, "added": mw.col.db.scalar("select count() from revlog")-r0, "busy": d._busy}`);
  await sleep(500);
  ok(r4.same && r4.now && r4.now !== r4.first && r4.added === 0 && !r4.busy, 'thẻ đang hiện đã bị chấm ở chỗ khác → sang thẻ kế tiếp, không chấm chồng');
  ok((await seen()).length === 0, '… không hộp lỗi (trước 1.31.2: "không lưu được câu trả lời" lặp mãi)');
  ok(/chỗ khác/.test(await page.eval('(document.querySelector("#kb-toast")||{}).textContent||""')), 'có dòng báo ngắn trong vườn');
  const r5 = await py(`d=kb._dialog
c=d._card
mw.col.remove_notes([c.nid])                     # xoá ở Trình duyệt thẻ
d._dispatch("rv:show:")
d._dispatch("rv:ans:3")
result={"gone": c.id, "now": d._card.id if d._card else None}`);
  await sleep(400);
  ok(r5.now && r5.now !== r5.gone && (await seen()).length === 0, 'thẻ đang hiện bị xoá → sang thẻ kế tiếp, không hộp lỗi');
  const r6 = await py(`d=kb._dialog
other=[x.id for x in mw.col.decks.all_names_and_ids() if x.id != d.deck_id and mw.col.db.scalar("select count() from cards where did=? and queue=0", x.id) >= 3][0]
mw.col.decks.select(other)                       # người dùng bấm deck khác ở cửa sổ chính
r0=mw.col.db.scalar("select count() from revlog")
d._dispatch("rv:show:")
d._dispatch("rv:ans:3")
result={"other": other, "r0": r0}`);
  for (let k = 0; k < 40; k++) { if (await py('result=(not kb._dialog._busy) and kb._dialog._card is not None')) break; await sleep(100); }
  const r7 = await py(`d=kb._dialog
c=d._card
result={"did": c.did, "deck": d.deck_id, "cur": mw.col.decks.get_current_id(), "revlog": mw.col.db.scalar("select count() from revlog")}
d._dispatch("rv:stop")`);
  ok(r7.revlog === r6.r0 + 1 && r7.did === r7.deck && r7.cur === r7.deck, 'deck hiện tại của Anki đổi giữa chừng → chấm xong vẫn lấy thẻ của deck đang xem trong vườn');

  console.log('== 5. Collection đang đóng (đồng bộ toàn bộ) mà trang vẫn gửi lệnh');
  const d5 = await view();
  const r8 = await py(`d=kb._dialog
kb._seen.clear()
day=kb.cal_today().isoformat()
mw.col.close_for_full_sync()
mw.col._backend.close_collection(downgrade_to_schema11=False)      # như lúc Anki đang tải cả collection lên / về
out={}
for cmd in ["refresh", "home:buy:bench", "rv:start", "life:seen:x", "guest:met:mejiro:yard", "find:pick:1", "game:done:{}", "ui:set:{}", "paper:open", "fields:open", "craft:list", "deck:1"]:
    try:
        d._on_bridge(cmd); out[cmd]="ok"
    except Exception as e:
        out[cmd]=type(e).__name__
d._check_day()
note=d._cal_save("note", {"d": day, "t": "viết lúc collection đang đóng"})
mw.col.reopen()
result={"out": out, "note": note, "ready": kb._col_ready()}`);
  ok(Object.values(r8.out).every(v => v === 'ok') && r8.ready, 'mọi lệnh đều được bỏ qua êm, mở lại collection dùng tiếp được');
  ok(r8.note.ok === false && r8.note.store_error === true, 'nhật ký: báo "chưa lưu được" (giữ chữ trong ô), không ném lỗi');
  ok((await seen()).length === 0, 'không hộp thoại nào bật lên');
  const d5b = await view();
  ok(d5b.coins === d5.coins && d5b.bench === d5.bench && d5b.diary === d5.diary, 'ví / ghế / nhật ký không đổi');
  const bk = await py(`p=kb.JOURNAL._backup_path(kb.cal_today().year, kb.cal_today().month)
raw=json.load(open(p, encoding="utf-8"))
result={"n": len(raw), "today": raw.get(kb.cal_today().isoformat(), {}).get("t")}`);
  ok(bk.n >= 1 && bk.today === d5.diary, 'bản sao lưu nhật ký của tháng không bị đè (vẫn là bản trước đó)');
  const r9 = await py('d=kb._dialog\nr=d._cal_save("note", {"d": kb.cal_today().isoformat(), "t": "lưu lại sau khi đồng bộ xong"})\nd.refresh()\nresult=r');
  ok(r9.ok === true && (await view()).diary === 'lưu lại sau khi đồng bộ xong', 'collection mở lại → lưu nhật ký bình thường');

  console.log('== 5b. Đang đồng bộ thường: không lần ghi nào của vườn chen vào trước lúc so');
  const h1 = await py(`d=kb._dialog
real=mw.progress.busy
c0=st.load()["coins"]; rev0=mw.col.get_config("kotoba_batake_rev", None)
ran=[]
job=kb._after_sync(lambda x: ran.append(x))
kb._seen.clear()
kb._sync_running=True
mw.progress.busy=lambda: True                      # như lúc thanh tiến độ đồng bộ đang hiện
out={"hold": kb._sync_hold()}
try:
    st.add_coins(5); out["add"]="ghi được"
except Exception as e:
    out["add"]=str(e)
for cmd in ["refresh", "home:buy:bench", "life:seen:x", "guest:met:mejiro:yard"]:
    try:
        d._on_bridge(cmd)
    except Exception as e:
        out["bridge_err"]=repr(e)
out["note"]=d._cal_save("note", {"d": kb.cal_today().isoformat(), "t": "gõ lúc đang đồng bộ"})
job("kết quả Gemini")
out["queued"]=(len(kb._sync_wait), list(ran))
out["same"]=(st.load()["coins"]==c0 and mw.col.get_config("kotoba_batake_rev", None)==rev0)
mw.progress.busy=real
out["stuck_flag_no_progress"]=kb._sync_hold()      # cờ còn bật nhưng hết thanh tiến độ → không khoá nữa
kb._on_sync_finished()
out["after"]=(kb._sync_running, len(kb._sync_wait), list(ran))
st.add_coins(5)
out["coins"]=st.load()["coins"]-c0
kb._dialog.refresh()
result=out`);
  ok(h1.hold === true && /đang đồng bộ/.test(h1.add) && !h1.bridge_err && h1.same, 'ghi ví bị từ chối ("Anki đang đồng bộ…"), lệnh của trang bị bỏ qua, ví + dấu phiên bản không đổi');
  ok(h1.note.ok === false && h1.note.store_error === true, 'nhật ký: báo "chưa lưu được", chữ vẫn trong ô');
  ok(h1.queued[0] === 1 && h1.queued[1].length === 0 && h1.after[0] === false && h1.after[1] === 0 && h1.after[2][0] === 'kết quả Gemini',
    'việc nền gọi về giữa lúc đồng bộ → xếp hàng, đồng bộ xong mới chạy');
  ok(h1.stuck_flag_no_progress === false && h1.coins === 5, 'hết thanh tiến độ là hết khoá; đồng bộ xong ghi lại bình thường');
  ok((await seen()).length === 0, 'không hộp thoại nào bật lên');

  console.log('== 6. Việc lúc mở hồ sơ đợi lần tự đồng bộ; mở lại Anki không sửa collection');
  const r10 = await py(`real=mw.can_auto_sync
start=mw.col.get_config("kotoba_batake_start", None)
mob=mw.col.get_config("kotoba_batake_mobile", None)
mw.col.remove_config("kotoba_batake_start"); mw.col.remove_config("kotoba_batake_mobile")     # như collection chưa từng có vườn
mod0=mw.col.db.scalar("select mod from col")
mw.can_auto_sync=lambda: True
kb._on_profile_open()
a={"pending": kb._open_pending, "mod_same": mw.col.db.scalar("select mod from col")==mod0, "start": mw.col.get_config("kotoba_batake_start", None)}
mw.can_auto_sync=lambda: False
kb._on_profile_open()
b={"pending": kb._open_pending, "start": bool(mw.col.get_config("kotoba_batake_start", None)), "mobile": bool(mw.col.get_config("kotoba_batake_mobile", None))}
mw.can_auto_sync=real
mw.col.set_config("kotoba_batake_start", start); mw.col.set_config("kotoba_batake_mobile", mob)
result={"a": a, "b": b}`);
  ok(r10.a.pending === true && r10.a.mod_same && r10.a.start === null, 'Anki sắp tự đồng bộ: mở hồ sơ không ghi gì vào collection (mốc / sổ bù xu chờ đồng bộ xong)');
  ok(r10.b.pending === false && r10.b.start && r10.b.mobile, 'không tự đồng bộ: làm ngay như trước');
  await guiSync();
  const e1 = await view();
  await stopAnki();                                    // đóng Anki (tự đồng bộ lúc đóng)
  const modDisk = cp.execFileSync(PYBIN, ['-c', `
import sqlite3, sys
print(sqlite3.connect(sys.argv[1]).execute("select mod from col").fetchone()[0])`, path.join(BASE, 'Test', 'collection.anki2')], { encoding: 'utf8' }).trim();
  startAnki(BASE, 'anki_lan2.log');
  await waitUp();
  await sleep(15000);
  const e2 = await py(`result={"mod": str(mw.col.db.scalar("select mod from col")), "pending": kb._open_pending, "busy": mw.progress.busy(),
"guard": kb._sync_guard_log["n"], "coins": st.load()["coins"]}`);
  ok(e2.pending === false && !e2.busy && e2.mod === modDisk,
    'mở lại Anki khi đã có lượt ôn + sổ bù xu: mở hồ sơ + tự đồng bộ vẫn không sửa collection (không có gì mới để bù)');
  ok(e2.guard === 0 && e2.coins === e1.coins, 'không có gì phải trả lại, xu như lúc đóng');

  console.log('== 7. Máy tính thứ hai: cài add-on, chơi thử, rồi mới đăng nhập và tải về');
  await py(SETUP);
  await py('kb.STREAK_TEST_ALL=False\nresult=1');
  await py('kb.JOURNAL.update(kb.cal_today(), {"t": "máy một, trước khi sang máy hai"})\nresult=1');
  const m1 = await py(VIEW.replace('result = {', 'result = {"start": (mw.col.get_config("kotoba_batake_start", None) or {}).get("ms"), '));
  await stopAnki();                                    // máy một đóng (đồng bộ)
  startAnki(BASE_B, 'anki_may_hai.log');
  await waitUp();
  await py(SETUP);
  const n1 = await py(`kb.STREAK_TEST_ALL=False
kb._streak_start()                                   # như bản phát hành: lần chạy đầu lập mốc cho vườn mới của máy hai
st.add_coins(30)
kb.JOURNAL.update(kb.cal_today(), {"t": "chơi thử trên máy hai trước khi đăng nhập"})
result={"start": (mw.col.get_config("kotoba_batake_start", None) or {}).get("ms"), "coins": st.load()["coins"], "pending": kb._open_pending}`);
  ok(n1.pending === false && n1.start > m1.start, 'máy hai chưa đăng nhập: add-on lập vườn mới (mốc sau mốc của máy một)');
  await py(LOGIN);
  await py('kb._prefer=["Download","Yes","OK"]\nkb._seen.clear()\nresult=1');
  await guiSync(); await sleep(800);
  const n2 = await py(VIEW.replace('result = {', 'result = {"start": (mw.col.get_config("kotoba_batake_start", None) or {}).get("ms"), '));
  ok(n2.start === m1.start && n2.coins === m1.coins && n2.bench === m1.bench && n2.diary === 'máy một, trước khi sang máy hai',
    `máy hai đăng nhập + tải về → nhận vườn thật của máy một (${n2.coins} xu, ${n2.bench} ghế, nhật ký), vườn chơi thử không đè lên`);
  ok(n2.guard === 0, 'lớp giữ dữ liệu không trả lại vườn chơi thử (vườn lập trước là vườn thật)');
  await py('kb._prefer=["Upload","Yes","OK"]\nst.add_coins(40)\nkb.JOURNAL.update(kb.cal_today(), {"t": "viết trên máy hai sau khi đã có vườn thật"})\nresult=1');
  const n3 = await view();
  await stopAnki();                                    // máy hai đóng (đồng bộ)
  startAnki(BASE, 'anki_lan3.log');
  await waitUp();
  await sleep(6000);
  for (let k = 0; k < 40; k++) { if (!(await py('result=bool(mw.progress.busy()) or kb._open_pending'))) break; await sleep(250); }
  const m2 = await view();
  ok(m2.coins === n3.coins && m2.diary === 'viết trên máy hai sau khi đã có vườn thật' && m2.bench === m1.bench,
    `máy một mở lại (tự đồng bộ) → thấy phần chơi trên máy hai (${m2.coins} xu, nhật ký mới), ghế còn`);
  ok(m2.guard === 0, 'hai máy dùng luân phiên: không lần nào phải trả lại');
  const log = fs.readFileSync(path.join(OUT, 'anki.log'), 'utf8') + fs.readFileSync(path.join(OUT, 'anki_ngay_moi.log'), 'utf8') + fs.readFileSync(path.join(OUT, 'anki_lan2.log'), 'utf8') + fs.readFileSync(path.join(OUT, 'anki_may_hai.log'), 'utf8');
  ok(!/Traceback/.test(log), 'không có Traceback trong nhật ký của Anki ở cả bốn lần mở');

  console.log(`\nKẾT QUẢ: ${pass}/${total} đạt`);
  await stopAnki().catch(() => null);
  process.exit(pass === total ? 0 : 1);
})().catch(async (e) => { console.error('LỖI KỊCH BẢN', e); process.exit(2); });
