"""1.35.5 — sửa lỗi nhánh audit/release-review-1.35.4-2026-11-19 (người dùng 19/11: "sửa các lỗi nằm trên nhánh … verify lại,
và sửa lỗi. sau đó test lại lần cuối … đây là bản release cuối cùng rồi, nên cần cover hầu hết lỗi, UI").

Mỗi mục tái hiện đúng lỗi của báo cáo audit (docs/kiem_thu/audit-1.35.4-2026-11-19/BAO_CAO.md) rồi kiểm cách sửa. Chạy trên mã
1.35.4 (git archive 875444c) thì các ca "lỗi" đỏ; phần giao diện chạy thật trong Anki ở tests/anki/e2e_1355.js.
  P1 01 khoá ghi lúc đồng bộ giữ tới khi so xong · 02 khôi phục bản sao lưu sạch: GIỮ quyết định 1.33.1 (không mất vườn) ·
     03 streak_start không đè mốc vừa trả lại · 04 after_sync lỗi thoáng qua / settle ghi file lỗi không mất bản chờ ·
     05 zoom webview thay CSS zoom · 06 báo Gemini tiếng khác khi tiếng Nhật dùng Claude Code · 07 Lịch hoa (soát mã)
  P2 08 Esc một lớp mỗi lần · 09 bản gốc mồ côi · 10 kỳ trước cùng bộ truyện · 11 lật thẻ không kẹt · 12 Tưới ngay rồi mở
     bảng khác · 13 Điền vào câu tiếng Đức · 14 Lật cặp katakana · 15 Ä/Ö/Ü + ngoặc tiếng Hàn · 16 từ mới trong từ dài +
     {chữ|đọc katakana|khoá} · 17 bộ chọn deck · 18 sổ Hoàn tác khi đổi deck · 19 mã chia sẻ có dấu, gói báo chờ · 20 Cloze
     của Anki + NFC · 21 Trang trí thử
  P3 22 Esc trong ô nhập · 23 Đuổi quạ · 24 bảng nổi · 25 cửa sổ Sửa thẻ · 26 đồ hoạ · 27 lỗi biên
  Hợp đồng dữ liệu: không thêm khoá collection / mục config.json.

Chạy: ${ANKI_PY} tests/core/test_1355.py [ADDON]   (không có gói anki thì bỏ qua phần cần collection thật)
"""
from __future__ import annotations

import contextlib
import copy
import datetime as dt
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake"))
sys.path.insert(0, HERE)
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
    from anki.collection import Collection
    HAVE_ANKI = True
except ImportError:
    HAVE_ANKI = False
    sys.path.insert(0, os.path.join(ROOT, "tests", "stubs"))

import ai_core as ai  # noqa: E402
import ai_zh  # noqa: E402
import backup_core as backup  # noqa: E402
import diag  # noqa: E402
import eu_core  # noqa: E402
import ko_core  # noqa: E402
import paper_core as paper  # noqa: E402
import share_core  # noqa: E402
import story_core as S  # noqa: E402
import sync_core as sync  # noqa: E402
import text_core  # noqa: E402
import zh_core  # noqa: E402

PASS = FAIL = 0


def ok(c, m):
    global PASS, FAIL
    if c:
        PASS += 1
    else:
        FAIL += 1
    print(("  ✓ " if c else "  ✗ ") + m)


def src(rel):
    return open(os.path.join(ADDON, rel), encoding="utf-8").read()


INIT, GJS, CAL, PAP, HOME, GAMES = (src("__init__.py"), src("web/garden.js"), src("web/calendar.js"), src("web/paper.js"),
                                     src("web/home.js"), src("web/games.js"))
TMP = tempfile.mkdtemp(prefix="kb1355_")


def body(name, text=INIT):
    i = text.find("def " + name + "(")
    if i < 0:
        return ""
    j = re.search(r"\n(?:def |class |    def |@)", text[i + 10:])
    return text[i:i + 10 + (j.start() if j else len(text))]


if HAVE_ANKI:
    import garden_core as core

    def new_col(name):
        folder = os.path.join(TMP, name)
        os.makedirs(folder)
        return Collection(os.path.join(folder, "collection.anki2")), os.path.join(folder, "user_files")

    @contextlib.contextmanager
    def broken(fn_owner, name, exc=OSError("TEST: lỗi")):
        orig = getattr(fn_owner, name)

        def bad(*_a, **_kw):
            raise exc
        setattr(fn_owner, name, bad)
        try:
            yield
        finally:
            setattr(fn_owner, name, orig)

    def kb_keys(col):
        return {k: copy.deepcopy(v) for k, v in col.all_config().items() if k.startswith("kotoba_batake_") and k != backup.REV_KEY}

# ---------------------------------------------------------------------------
print("== P1-01. Khoá ghi lúc đồng bộ: giữ tới lúc so xong (không theo thanh tiến độ)")
hold = body("_sync_hold")
ok("mw.progress.busy" not in hold and "return bool(_sync_running)" in hold,
   "_sync_hold không còn mở khoá khi thanh tiến độ tắt (Anki tắt nó TRƯỚC hộp thoại cuối + sync_did_finish)")
watch = body("_sync_watch")
ok("_sync_busy_now()" in watch and "activeModalWidget" in body("_sync_busy_now") and "_on_sync_finished()" in watch
   and "SYNC_STUCK_S" in watch, "chốt an toàn: Anki không báo xong → hết thanh tiến độ + không hộp thoại 120 giây thì tự so rồi mở khoá")
ok("single_shot(2000, _sync_watch" in body("_on_sync_start"), "bắt đầu theo dõi ngay khi đồng bộ bắt đầu")
os_ = body("_on_sync_start")
ok(os_.index("if _sync_running:") < os_.index("_sync_guard_after()") < os_.index("before_sync"),
   "đồng bộ lần nữa khi lần trước chưa báo xong → so lần trước trước khi chụp lần mới")

print("== P1-02. Khôi phục bản sao lưu sạch: giữ quyết định đã chốt 1.33.1 (PHAT_TRIEN.md mục 7: không mất vườn)")
ok("bản nhập chưa có vườn (sao lưu từ trước khi cài) thì lần mở hồ sơ sau vẫn trả lại vườn của máy (không mất vườn)"
   in open(os.path.join(ROOT, "PHAT_TRIEN.md"), encoding="utf-8").read(),
   "mục 7 ghi rõ: bản sao lưu từ trước khi cài → vườn của máy được trả lại (đúng như audit thấy — không phải lỗi, không đổi)")
if HAVE_ANKI:
    col, uf = new_col("p102")
    backup.put_config(col, core.START_KEY, {"v": 1, "ms": 1_700_000_000_000})
    backup.put_config(col, core.CONFIG_KEY, {"v": 1, "coins": 500})
    sync.write_record(uf, col, sync.state_of(col))
    for k in list(sync.snapshot(col)):
        col.remove_config(k)
    r1 = sync.on_open(col, uf, restoring_backup=True)
    r2 = sync.on_open(col, uf, restoring_backup=False)
    ok(r1["action"] == sync.KEEP and r2["action"] == sync.RESTORE and (col.get_config(core.CONFIG_KEY) or {}).get("coins") == 500,
       "lần mở sau trả lại vườn của máy (500 xu) như quyết định 1.33.1")
    col.close()

print("== P1-03. streak_start: không đặt mốc 'bây giờ' đè mốc vừa trả lại sau đồng bộ")
if HAVE_ANKI:
    col, uf = new_col("p103")
    backup.put_config(col, core.START_KEY, {"v": 1, "ms": 1_700_000_000_000})
    backup.put_config(col, core.MOBILE_KEY, {"v": 1, "start": 0})
    backup.put_config(col, core.CONFIG_KEY, {"v": 1, "coins": 700})
    snap = sync.state_of(col)
    # collection vừa mất HẾT dữ liệu vườn (tải về collection chưa từng có vườn) và lần trả lại trước lỗi → còn bản chờ.
    # (Ca audit ghi — chỉ mất START_KEY — thì lớp giữ dữ liệu vốn giữ bản mang về: "có từ trước khi có mốc".)
    for k in list(sync.snapshot(col)):
        col.remove_config(k)
    sync._hold(uf, col, snap)
    st = core.GardenState(os.path.join(uf, "state.json"), lambda: col)
    got = st.streak_start(col=col)
    ok(got == 1_700_000_000_000 and (col.get_config(core.START_KEY) or {}).get("ms") == 1_700_000_000_000,
       "mốc chuỗi = mốc đã trả lại (1700000000000), collection giữ nguyên — trước: %s" % got)
    backup.PENDING = None
    col.close()

print("== P1-04. after_sync lỗi thoáng qua / settle ghi file lỗi: không mất bản chụp chờ")
if HAVE_ANKI:
    col, uf = new_col("p104a")
    backup.put_config(col, core.START_KEY, {"v": 1, "ms": 1_700_000_000_000})
    backup.put_config(col, core.CONFIG_KEY, {"v": 1, "coins": 999})
    mine = sync.before_sync(col, uf)
    old_rev = mine["rev"]
    col.set_config(core.CONFIG_KEY, {"v": 1, "coins": 1})           # bản cũ vừa mang về (không dấu mới)
    col.set_config(backup.REV_KEY, {"v": 1, "t": old_rev["t"] - 5000, "d": "phone"})
    with broken(sync, "state_of", RuntimeError("TEST: đọc collection lỗi thoáng qua")):
        r = sync.after_sync(col, uf, mine)
    rec = sync.read_record(uf, col)
    ok(r["action"] == sync.FAILED and backup.PENDING is not None and rec and rec.get("pending"),
       "A. after_sync lỗi → giữ bản chụp chờ (file pending + móc) — trước: PENDING = None, không giữ gì")
    d = core.GardenState(os.path.join(uf, "state.json"), lambda: col).load()
    ok(d["coins"] == 999 and backup.PENDING is None, "lần đọc kế tiếp trả lại bản tốt (999 xu), gỡ móc")
    col.close()

    col, uf = new_col("p104b")
    backup.put_config(col, core.START_KEY, {"v": 1, "ms": 1_700_000_000_000})
    backup.put_config(col, core.CONFIG_KEY, {"v": 1, "coins": 999})
    snap = sync.state_of(col)
    col.set_config(core.CONFIG_KEY, {"v": 1, "coins": 1})
    col.set_config(backup.REV_KEY, {"v": 1, "t": snap["rev"]["t"] - 5000, "d": "phone"})
    sync._hold(uf, col, snap)
    real_write = sync.write_record

    def fail_clear(user_dir, c, state):
        return real_write(user_dir, c, state) if state.get("pending") else False   # ghi "xong" lỗi (ổ đầy)
    sync.write_record = fail_clear
    try:
        sync.settle(col, uf)
    finally:
        sync.write_record = real_write
    disk = sync._pending(uf, col)
    ok((col.get_config(core.CONFIG_KEY) or {}).get("coins") == 999 and disk is not None and backup.PENDING is not None,
       "B. settle trả lại xong nhưng ghi file lỗi → còn móc chờ (trước: PENDING = None mà file vẫn 'đang chờ')")
    st = core.GardenState(os.path.join(uf, "state.json"), lambda: col)
    st.add_coins(5)                                                   # thao tác mới sau lần trả lại
    snap2 = sync.before_sync(col, uf)
    ok(snap2 is not None and (snap2["keys"].get(core.CONFIG_KEY) or {}).get("coins") == 1004,
       "lần đồng bộ sau chụp dữ liệu MỚI (1.004 xu), không dùng bản chờ cũ trên file (999) — %s"
       % ((snap2 or {}).get("keys", {}).get(core.CONFIG_KEY) or {}).get("coins"))
    backup.PENDING = None
    col.close()
    ok("sync_core.hold_later(USER_DIR, before)" in body("_sync_guard_after"),
       "_sync_guard_after: collection chưa mở lại / lỗi → giữ bản chụp trong bộ nhớ (hold_later)")

print("== P1-05. Phóng to bằng zoom của webview (không dùng CSS body { zoom })")
ok("body {{ zoom" not in INIT and "self.web.setZoomFactor(zoom)" in INIT and "def _keep_zoom" in INIT,
   "CSS zoom làm 100vw / 100vh không co theo → cắt mép phải; nay setZoomFactor + đặt lại sau mỗi lần nạp trang")

print("== P1-06. Claude Code chỉ cho báo tiếng Nhật")
ok('if (lang === "ja" && v.source === "claude") {' in PAP and 'if (!en && v.source === "claude")' not in PAP,
   "báo Trung / Hàn / Đức / Pháp / Việt (Gemini) vẫn đủ nút khi tiếng Nhật dùng Claude Code")

print("== P1-07. Lịch hoa: lỗi lưu không thành hộp lỗi, Nhờ Gemini sửa có kiểm xung đột, chữ gõ dở không mất")
oc = body("_on_cal")
ok('elif name in ("lang", "hint", "fix", "seen"):' in oc and "except backup_core.StoreFailed" in oc and "_on_cal_write" in oc,
   "đổi tiếng / gợi ý / Nhờ Gemini sửa / đã xem: bắt StoreFailed, báo trong Lịch hoa")
w = body("_on_cal_write")
iw = w.find("JOURNAL.update(today, {\"w\": w2})      # 1.35.5")
ok(iw > 0 and 0 < w.find("save_config(journal_lang=lang)", iw) - iw < 200,
   "đổi tiếng: ghi nhật ký TRƯỚC config.json (ghi lỗi thì tiếng của config không lệch bài)")
ok('p.get("b"))' in w and "self._js(\"calSaved\", err)" in w and 'r.get("conflict")' in body("_fix_text"),
   "Nhờ Gemini sửa gửi kèm b → bài máy khác vừa sửa: không ghi đè, trang đọc lại + báo chữ gõ dở")
ok("b: base0" in CAL and "if (!ta.readOnly && fresh === s.saved" in CAL and "Chép chữ gõ dở" in CAL and 'name == "copy"' in oc,
   "ô vừa về đã khoá (máy khác gửi bài) → chữ gõ dở báo lại + nút Chép chữ gõ dở (trước: mất hẳn)")

print("== P2-08. Esc: một lần chỉ đóng một lớp")
FINDS, LIFE = src("web/finds.js"), src("web/life.js")
ok("e.preventDefault(); e.stopImmediatePropagation(); window.__kbEscUsed = true; closePed();" in FINDS and "}, true);" in FINDS,
   "thẻ lấp lánh / gánh hàng (mở từ cảnh của bảng Nhà): bắt ở capture, chặn hẳn — trước: Esc đóng cả thẻ lẫn bảng Nhà")
guards = [("home.js", "if (e.defaultPrevented) { return; }" in HOME), ("games.js", "if (e.defaultPrevented) { return; }        // 1.35.5" in GAMES),
          ("paper.js", 'if (e.key === "Escape") { if (e.defaultPrevented) { return; }' in PAP),
          ("ui.js", '!e.defaultPrevented) { e.preventDefault(); close(); }' in src("web/ui.js")),
          ("life.js", "e.stopImmediatePropagation(); window.__kbEscUsed = true; closeCard(); }     // 1.35.5" in LIFE)]
ok(all(g for _n, g in guards), "bảng lớn bỏ qua Esc lớp trên đã dùng: " + ", ".join(n for n, g in guards if not g))

print("== P2-09. Bản gốc mồ côi (viết báo lỗi sau Bắt đầu truyện mới)")
base = os.path.join(TMP, "p209")
os.makedirs(base)
S.save_episode(base, "2026-11-10", 1, {"tieu_de": "Kỳ 1 cũ", "doan": ["a"], "nho": {"tom_tat": "cũ 1"}})
S.save_episode(base, "2026-11-11", 2, {"tieu_de": "Kỳ 2 cũ", "doan": ["b"], "nho": {"tom_tat": "cũ 2"}})
S.save_master(base, "2026-11-11", {"ngay": "2026-11-11", "ky": 2, "truyen": {"tieu_de": "Kỳ 2 cũ", "doan": ["b"], "lang": "vi"}, "tin": []})
res = S.restart_story(base, "2026-11-12")
S.save_master(base, "2026-11-12", {"ngay": "2026-11-12", "ky": 1, "truyen": {"tieu_de": "Kỳ 1 MỚI", "doan": ["x"], "lang": "vi"}, "tin": []})
stt = S.story_state(base, "2026-11-12")
ok(stt["undo"] is True, "báo lỗi sau khi bản gốc truyện mới đã ghi → vẫn 'Lấy lại truyện cũ' được (trước: ẩn cả hai nút)")
again = S.restart_story(base, "2026-11-12")
ok(again.get("same") is True and len(S.resets(base)) == 1, "bấm Bắt đầu truyện mới lần nữa cùng ngày → không cất thêm lần (truyện cũ thật vẫn lấy lại được)")
ok(S.undo_restart(base) and S.last_ky(base) == 2 and S.load_master(base, "2026-11-12") is None
   and os.path.isfile(os.path.join(base, S.ARCHIVE_DIR, res["thu_muc"] + "_bo", S.MASTER_DIR, "2026-11-12.json")),
   "Lấy lại truyện cũ: về kỳ 2, bản gốc mồ côi cất sang <thư mục>_bo/ (số viết lại hôm nay kể tiếp truyện cũ)")
ok(ai.next_ky(S.load_story(base), "2026-11-12") == 3, "kỳ kế tiếp của truyện cũ = 3")

print("== P2-10. 'Bạn chưa đọc kỳ trước' chỉ trong cùng bộ truyện")
FIX = json.load(open(os.path.join(ROOT, "tests", "fixtures", "bao_112_n4.json"), encoding="utf-8"))
lib_dir = os.path.join(TMP, "p210")
for d, ky in [("2026-11-10", 1), ("2026-11-11", 2), ("2026-11-12", 3), ("2026-11-13", 4),
              ("2026-11-14", 1), ("2026-11-15", 2), ("2026-11-16", 3)]:
    iss = copy.deepcopy(FIX)
    iss["ngay"] = d
    for b in iss["bai"]:
        if b.get("loai") == "truyen":
            b["ky"] = ky
    os.makedirs(os.path.join(lib_dir, "bao", d))
    json.dump(iss, open(os.path.join(lib_dir, "bao", d, "bao.json"), "w", encoding="utf-8"), ensure_ascii=False)
lib = paper.Library(lib_dir)
if not hasattr(lib, "story_prev"):          # mã 1.35.4: chỉ có story_index (tra theo số kỳ cho cả thư viện)
    idx = lib.story_index()
    lib.story_prev = lambda d, k: idx.get(k - 1)
ok(lib.story_prev("2026-11-13", 4) == "2026-11-12" and lib.story_prev("2026-11-16", 3) == "2026-11-15"
   and lib.story_prev("2026-11-14", 2) is None, "kỳ 4 truyện cũ → kỳ 3 truyện cũ (12/11), không phải 16/11 của truyện mới")
ok("lib.story_prev(date, b[\"ky\"])" in src("paper_core.py"), "trang đọc báo dùng story_prev")

print("== P2-11 / 12. Lật thẻ không kẹt; Tưới ngay rồi mở bảng khác")
ok("function flipRetry(p)" in GJS and "flipRetry: flipRetry" in GJS and 'self._js("flipRetry", {"cid": self._card.id})' in INIT
   and 'self._js("flipRetry", {"cid": card.id})' in INIT and "flipTimer = setTimeout" in GJS,
   "lệnh lật bị bỏ lúc đồng bộ / dựng mặt sau lỗi → Python gọi flipRetry; phòng hờ 8 giây ở trang")
ok('BIG_PANELS.indexOf(t.id) >= 0 && reviewAsk && $("kb-panel").hidden' in GJS,
   "mở bảng lớn khác trước khi thẻ đầu tiên tới → huỷ lần mở bảng ôn (không chồng hai bảng)")

print("== P2-13 / 14 / P3-23. Trò chơi (hàm thật của games.js chạy bằng node)")
a = GAMES.index("  // Các cách viết chữ được chấp nhận")
b = GAMES.index("  // 1.17: tiếng Anh — so khớp chữ gõ vào")
c = GAMES.index("  function enNorm(")
d = GAMES.index("  // Nghĩa ngắn gọn cho biển quạ")
js = r"""
const SRC = %s;
const normKana = (s) => String(s).normalize("NFKC");
const F = new Function(SRC.wf + SRC.eu + "; return { wordForms, euAnswers, euFold, enNorm };")();
const out = {};
const tg = { word: "der Hund, -e" };
const forms = (w) => F.wordForms({ word: w });
out.forms = forms("der Hund, -e");
const decks = ["die Frau, -en", "das Kind, -er", "der Baum, ¨-e", "die Katze, -n", "der Tisch, -e"];
const tf = forms(tg.word);
out.related = decks.filter((w) => forms(w).some((f) => f && tf.some((t) => t && (t.indexOf(f) >= 0 || f.indexOf(t) >= 0))));
const hit = (typed, word) => F.euAnswers({ word: word }, "de").indexOf(F.euFold(F.enNorm(typed), "de")) >= 0;
out.sich = [hit("sich freuen", "(sich) freuen"), hit("freuen", "(sich) freuen"), hit("sich", "(sich) freuen")];
console.log(JSON.stringify(out));
""" % json.dumps({"wf": GAMES[a:b], "eu": GAMES[c:d]})
r = subprocess.run(["node", "-e", js], capture_output=True, text=True)
try:
    jo = json.loads(r.stdout.strip().splitlines()[-1])
except Exception:  # noqa: BLE001
    jo = {"err": r.stderr[-300:]}
ok(jo.get("forms") and not any(f.lstrip().startswith("-") for f in jo["forms"]) and jo.get("related") == [],
   "13: 'der Hund, -e' không có dạng '-e' → 5 danh từ số nhiều khác không bị coi là 'lồng nhau' (còn đáp án nhiễu): %s"
   % json.dumps(jo, ensure_ascii=False)[:160])
ok(jo.get("sich") == [True, True, False], "23b: '(sich) freuen' — gõ 'sich freuen' / 'freuen' đều đúng, chỉ 'sich' thì sai")
ok("function memFace(p, f)" in GAMES and 'if (def.id === "memory") { items = items.filter((p) => mode.alt.some((a) => a.every((f) => memFace(p, f)))); }' in GAMES
   and "if (!pairs) {" in GAMES, "14: Lật cặp chỉ nhận note ghép được (cách đọc chỉ khi có kanji); không cặp nào → báo, không mở bàn trống")
ok('(readingsOf(p)[0] || p.reading ? " → "' in GAMES and "function crowTyped(group, mode)" in GAMES
   and "có đáp án gõ được (tối đa 24 ký tự)" in GAMES, "23a/c: không '→ undefined'; báo thiếu từ tính cả đáp án gõ được")

print("== P2-15. Tiếng Đức Ä / Ö / Ü đầu từ; tiếng Hàn ngoặc sát chữ")
de_ok = {w: eu_core.forms(w, "de") for w in ("der Apfel", "der Arzt", "das Amt", "der Ofen")}
want = {"der Apfel": "Äpfel", "der Arzt": "Ärzte", "das Amt": "Ämter", "der Ofen": "Öfen"}
ok(all(want[k] in v for k, v in de_ok.items()), "Äpfel / Ärzte / Ämter / Öfen nhận ra là dạng của Apfel / Arzt / Amt / Ofen")
txt = "[학교]에서 《친구》를 만나요"
links = ko_core.find_links(txt, ["학교", "친구"])
ok([txt[x:y] for x, y, _w in links] == ["학교", "친구"], "ngoặc vuông / 《》 sát chữ: gạch chân đúng 학교, 친구 — %s" % links)

print("== P2-16. Hậu xử lý báo: từ mới nằm trong từ dài hơn; cách đọc katakana trong {chữ|đọc|khoá}")
scope = {"tu_vung": [["食べる", "たべる", "ăn"]], "ngu_phap": [], "trong_tam": {"tu": []}}
fixed = ai._fix_jp("{食べる|タベ|食べる}。", {"食べる"}, set(), [])
ok("食べるべる" not in paper.surface(fixed) and paper.surface(fixed).startswith("食べる"),
   "{食べる|タベ|食べる} → chữ hiện '食べる' (trước: '食べるべる'): %s" % fixed)
raw = {"tu_moi": [{"w": "家", "m": "nhà"}, {"w": "木屐", "m": "guốc gỗ"}],
       "bai": [{"loai": "tin_lang", "tieu_de": "{大家|dà jiā|大家}", "doan": ["[我|wǒ]{木屐|mù jī|木屐}"]}]}
notes = []
if hasattr(ai, "drop_unlinked_new"):
    ai.drop_unlinked_new(raw, notes)
ok([w["w"] for w in raw["tu_moi"]] == ["木屐"] and notes, "家 chỉ nằm trong 大家 (đã nối) → bỏ khỏi tu_moi (trước: bước kiểm tra chắc chắn báo lỗi, gọi lại Gemini)")
ok(all("ai.drop_unlinked_new(raw, notes)" in src(f) for f in ("ai_zh.py", "ai_ko.py", "ai_eu.py", "ai_en.py")),
   "tiếng Trung / Hàn / Đức / Pháp / Anh đều bỏ từ mới không có chỗ tra riêng")

print("== P2-17 / 18. Bộ chọn deck của báo; sổ Hoàn tác khi đổi deck")
ok("picked.length - inside + 1 > max" in PAP, "17: đủ 5 deck con → vẫn tick được deck cha (gom lại thành 1)")
ok('[d for d in src[x]["decks"] if d in {r["id"] for r in decks.get(x, [])}]' in INIT,
   "17: deck đã chọn mà không còn note của tiếng đó → không chiếm chỗ (không có ô để bỏ tick)")
ok(INIT.count("self._undo_stack.clear()") >= 2, "18: đổi deck / nhập collection → bỏ sổ Hoàn tác của bảng ôn")

print("== P2-19. Mã chia sẻ có chữ có dấu / biểu tượng; gói báo chờ")
for t in ("KB1:m:16:ằ:abc:00000000", "KB1:m:16😀:abc:def:00000000", "  KB1:z:64x76:Vùng của tớ:xx:yy "):
    try:
        share_core.parse_code(t, {}, {}, [], [])
        e = "đọc được?"
    except share_core.ShareError as err:
        e = "ShareError: " + str(err)
    except Exception as err:  # noqa: BLE001
        e = type(err).__name__
    ok(e.startswith("ShareError"), "dán %r → %s" % (t[:24], e[:70]))
try:
    share_core.parse_code("xin chào", {}, {}, [], [])
except share_core.ShareError as err:
    ok("không phải mã thiết kế" in str(err), "chữ thường vẫn là 'không phải mã thiết kế' (giống trang web)")
ok("không phải mã" in open(os.path.join(ROOT, "site", "ve.js"), encoding="utf-8").read() and
   getattr(share_core, "NON_ASCII", "\0") in open(os.path.join(ROOT, "site", "ve.js"), encoding="utf-8").read(), "trang web báo đúng câu như add-on")
sp = body("sub_pending_settle")
ok("paper_sub_ensure(d, strict=True)" in sp and sp.index("paper_sub_ensure(d, strict=True)") < sp.index("_sub_pending_save(data)")
   and "left.append(d)" in sp, "gói báo chờ: chỉ bỏ khỏi file ngày đã tính xong (lỗi → còn chờ)")

print("== P2-20. Cloze của Anki; NFC")
ok(text_core.plain_text("I like {{c1::apples::fruit}} and {{c2::pears}}.") == "I like apples and pears.",
   "{{c1::apples::fruit}} → apples (không lọt '{{c1::')")
if HAVE_ANKI:
    cz = core.make_cloze("I like {{c1::apples::fruit}}.", "apples", lang="en")
    ok(cz and "{{" not in cz["q"] and "kb-blank" in cz["q"], "Điền vào câu với câu kiểu Cloze: che đúng 'apples'")
    cz = core.make_cloze(unicodedata.normalize("NFD", "私は学校が好きです"), unicodedata.normalize("NFD", "学校が"))
    ok(cz is not None and "kb-blank" in cz["q"], "tiếng Nhật: câu / từ dạng tách dấu (NFD) vẫn che được")
    cz = core.make_cloze("저는 학교에 가요", unicodedata.normalize("NFD", "학교"), lang="ko")
    ok(cz is not None and "kb-blank" in cz["q"], "tiếng Hàn: trường từ Hangul tách nét (NFD) vẫn che được")

print("== P2-21. Trang trí thử")
ok("if (!placing && !trying && typeof GardenPets" in HOME and "if (!placing && !trying && typeof GardenGuests" in HOME
   and "if (!placing && !trying && typeof GardenFinds" in HOME, "đang thử: thú / khách / chỗ lấp lánh (đã ẩn) không bấm trúng")
ok("if (isNew && t && trying) {" in HOME and "if (pd && !trying &&" in HOME, "mẫu tường / sàn vừa vẽ ở Xưởng → dán vào bản thử, không dán lên nhà thật")

print("== P3-22 / 24 / 25 / 26 / 27")
ok("function escBlur(e)" in HOME and HOME.count("escBlur") >= 5 and "else { q.blur(); }" in PAP and "note.blur(); }     // 1.35.5" in PAP,
   "22: Esc trong ô nhập → rời ô (không còn phím 'chết')")
ok('"kb-scene-card": function' in GJS and '"kb-ped-pop": function' in GJS and '($("kb-cal") && !$("kb-cal").hidden)' in GJS
   and 'if (typeof GardenFields !== "undefined") { GardenFields.close(); }      // 1.35.5' in GJS,
   "24: thẻ nổi tạo muộn vào 'mỗi lúc một bảng nổi'; Lịch hoa tính là bảng đang mở; openSeason đóng Cấu hình trường / ⚙ Giao diện")
sa = body("_show_answer")
ok("mod != self._note_mod" in sa and "card.load()" in sa, "25: cửa sổ Sửa thẻ còn mở mà note đã đổi → lật thẻ nạp lại (mặt sau mới)")
ok("const T = oy - skyPad" in HOME and "effects() ? now : 0, v.band, 1" in src("web/season.js")
   and "draw(); drawPreview(); });" in src("web/craft.js"), "26: tre cỡ Lớn phủ hết trời thêm; đèn đêm đứng yên khi tắt hiệu ứng; Xưởng vẽ lại lưới khi đổi màu nền")
p = os.path.join(TMP, "errors.json")
json.dump([{"msg": "x", "count": "abc", "first": "?", "last": None}, {"msg": "y", "count": 1e999}], open(p, "w"))
try:
    ents = diag.ErrorLog(p).entries()
    ok(len(ents) == 2 and ents[0]["count"] == 1, "27: errors.json hỏng trường count / first → đọc được (trước: ValueError)")
except Exception as err:  # noqa: BLE001
    ok(False, "27: errors.json hỏng → %s" % type(err).__name__)
ok('ta.addEventListener("compositionend", () => { setTimeout(() => { clearTimeout(timers.note)' in CAL, "27: nhật ký gõ bằng bộ gõ → tự lưu sau compositionend")
ok("_story_export()" in body("story_restart") and "_story_export()" in body("story_restart_undo"), "27: truyen_chung.json theo truyện sau khi bắt đầu lại / lấy lại")
ok('if not iss and lang == "ja":' in body("_paper_day"), "27: Lịch hoa ghi đúng số báo tiếng Nhật đã đọc của nguồn không dùng nữa")
ok("nLeaf = Math.max(1, String(r.name).split(\"::\").length)" in PAP, "27: tìm deck — thiếu deck cha giữa chừng không lặp tên đường dẫn")
br = [zh_core.bracket_pairs(text_core.tokens(w)) for w in ("做[sth]", "给[sb.]打电话", "中[zhōng]文[wén]")]
ok(br[0] is None and br[1] is None and br[2] and br[2][1] == "zhōng wén", "27: [sth] / [sb.] không thành pinyin; 中[zhōng]文[wén] vẫn đúng")
ok("kind not in fields.LANG_KINDS.get(lang, ())" in src("garden_core.py").split("def build_garden")[1][:20000] if "def build_garden" in src("garden_core.py") else False,
   "27: vườn giữ loại 汉字 (kanji) của deck tiếng Trung đã cấu hình")

ok('(en || vi || lg === "de" || lg === "fr" ? " kb-p-name-en" : "")' in PAP, "kiểm tra thêm: tên báo Đức / Pháp (chữ Latin) cùng kiểu chữ với báo Anh / Việt")

print("== Hợp đồng dữ liệu: không thêm khoá collection / mục config.json")
old_root = os.environ.get("KB_OLD_1354") or ""
if old_root and os.path.isdir(old_root):
    def keys_of(folder):
        out = set()
        for n in os.listdir(folder):
            if n.endswith(".py"):
                out |= set(re.findall(r"\"(kotoba_batake_[a-z0-9_]+)\"", open(os.path.join(folder, n), encoding="utf-8").read()))
        return out
    ok(keys_of(ADDON) == keys_of(old_root), "khoá collection như 1.35.4")
    ok(set(json.load(open(os.path.join(ADDON, "config.json")))) == set(json.load(open(os.path.join(old_root, "config.json")))),
       "mục config.json như 1.35.4")
else:
    print("  (bỏ qua so với 1.35.4: đặt KB_OLD_1354=<thư mục kotoba_batake của 1.35.4>)")

shutil.rmtree(TMP, ignore_errors=True)
print("KẾT QUẢ: %s (%d/%d)" % ("TẤT CẢ OK" if not FAIL else "%d LỖI" % FAIL, PASS, PASS + FAIL))
sys.exit(1 if FAIL else 0)
