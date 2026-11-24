"""1.33.1 — kiểm tra lần cuối "ngoài kịch bản có sẵn": File → Import .colpkg + tab Nguồn báo gọn hơn (offline).

Chạy thật trong Anki ở anki/e2e_1331.js (Import .colpkg khi vườn đang mở + vừa ôn, mở lại hồ sơ, "Mở bản sao lưu", Xuất
.colpkg, Check Database, xoá deck / loại note đang dùng, tab Nguồn báo mới, bấm bừa). Ở đây:

1. Lớp giữ dữ liệu khi đồng bộ (sync_core) với collection giả, đúng chuỗi việc của lỗi B: máy có bản chụp mới hơn → File →
   Import bản sao lưu cũ hơn → (cũ) lần mở hồ sơ sau "trả lại" vườn cũ đè bản vừa khôi phục; (mới) lúc nhập gọi
   on_open(restoring_backup=True) → giữ bản vừa nhập, đóng dấu mới → lần mở hồ sơ sau giữ nguyên; lớp giữ vẫn bảo vệ lần
   điện thoại đè bản cũ hơn sau đó. Collection nhập về chưa có dữ liệu vườn (bản sao lưu trước khi cài) → không đóng dấu
   (lần mở hồ sơ sau trả lại vườn của máy như "Mở bản sao lưu" của Anki từ 1.31.2).
2. Soát mã __init__.py (lỗi A + bảng ôn): móc collection_did_load chỉ khi hồ sơ đang mở; bỏ sổ phần thưởng lượt ôn + bộ nhớ
   tạm của collection cũ; vườn đang mở dựng lại, bảng ôn lấy thẻ của collection mới.
3. Soát mã tab Nguồn báo (web/paper.js): Trình độ / Lấy từ / Giọng đọc / Truyện / giọng cho câu không có audio là ô thả xuống
   (không còn hàng nút); Gói báo là một dòng thu gọn (hết hạn thì mở sẵn); "Tuỳ chọn thêm" thu gọn, nhớ trạng thái khi bảng
   vẽ lại; mọi lệnh cấu hình cũ vẫn gửi được (không bỏ tính năng nào).
4. Hợp đồng dữ liệu: không khoá collection / mục config mới so với 1.33.0 (chỉ là cách hiện + một móc của Anki).

Chạy: python test_1331.py ADDON
"""
from __future__ import annotations

import glob
import json
import os
import re
import sys
import tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection as _real  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import backup_core as B
import sync_core as S

FAIL = []
TMP = tempfile.mkdtemp(prefix="kb1331_")


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


def src(*p):
    with open(os.path.join(ADDON, *p), encoding="utf-8") as f:
        return f.read()


class _Db:
    def __init__(self, col):
        self.col = col

    def first(self, sql, *a):
        return (self.col.crt, self.col.scm)

    def all(self, sql, *a):
        return [(k, v) for k, v in self.col.conf.items() if k.startswith(S.PREFIX)]


class Col:
    """Collection giả (như core/test_1312.py): cấu hình là dict lưu dạng JSON, `path` theo hồ sơ."""

    def __init__(self, name="Test", crt=1_700_000_000):
        self.path = os.path.join(TMP, "profiles", name, "collection.anki2")
        os.makedirs(os.path.dirname(self.path), exist_ok=True)
        self.conf = {}
        self.crt, self.scm = crt, crt * 1000
        self.db = _Db(self)

    def get_config(self, key, default=None):
        return json.loads(self.conf[key]) if key in self.conf else default

    def set_config(self, key, val, **kw):
        self.conf[key] = json.dumps(val, ensure_ascii=False)

    def remove_config(self, key):
        self.conf.pop(key, None)

    def all_config(self):
        return {k: json.loads(v) for k, v in self.conf.items()}


def coins(c):
    return (c.get_config("kotoba_batake_state") or {}).get("coins")


def play(c, n, now):
    """Vườn ghi một lần (như backup_core.commit_config của add-on): ví + dấu phiên bản."""
    st = dict(c.get_config("kotoba_batake_state") or {"coins": 0})
    st["coins"] = n
    B.commit_config(c, [("kotoba_batake_state", st)])      # đóng dấu theo giờ thật, luôn lớn hơn dấu đang có


USER = os.path.join(TMP, "user_files")
os.makedirs(USER, exist_ok=True)

# =========================================================================================================================
print("== 1. sync_core: File → Import .colpkg (bản sao lưu cũ hơn bản chụp của máy)")
c = Col()
c.set_config("kotoba_batake_start", {"ms": 1_700_000_000_000})
play(c, 100, 1_000_000)
backup_conf = dict(c.conf)                       # bản sao lưu .colpkg: 100 xu
play(c, 200, 2_000_000)
S.before_sync(c, USER)                           # một lần đồng bộ: bản chụp của máy = 200 xu
ok((S.read_record(USER, c) or {}).get("keys", {}).get("kotoba_batake_state", {}).get("coins") == 200, "bản chụp của máy: 200 xu")

# (cũ, 1.33.0) Import không qua móc nào → lần mở hồ sơ sau
old = Col()
old.path = c.path
old.conf = dict(backup_conf)
res_old = S.on_open(old, USER, False)
ok(res_old["action"] == S.RESTORE and coins(old) == 200,
   "1.33.0 (tái hiện lỗi B): mở hồ sơ sau khi Import → trả lại 200 xu đè bản vừa khôi phục (%s, %s)" % (res_old["action"], coins(old)))

# (mới, 1.33.1) lúc nhập: _on_collection_load → on_open(restoring_backup=True)
S.before_sync(c, USER)                           # bản chụp lại là 200 xu như trước khi Import
new = Col()
new.path = c.path
new.conf = dict(backup_conf)
r_rec = S.read_record(USER, new)["rev"]
res1 = S.on_open(new, USER, True)
rv = B.clean_rev(new.get_config(B.REV_KEY))
ok(res1["action"] == S.KEEP and coins(new) == 100 and rv and rv["t"] > r_rec["t"],
   "1.33.1: lúc Import → giữ 100 xu, đóng dấu mới (%s > %s)" % (rv and rv["t"], r_rec["t"]))
ok((S.read_record(USER, new) or {}).get("keys", {}).get("kotoba_batake_state", {}).get("coins") == 100, "bản chụp của máy = bản vừa nhập")
res2 = S.on_open(new, USER, False)
ok(res2["action"] == S.KEEP and coins(new) == 100, "mở hồ sơ lần sau: vẫn 100 xu (%s)" % res2["action"])
# lớp giữ vẫn bảo vệ: điện thoại mang về bản cũ hơn (dấu cũ) sau đó → trả lại bản vừa nhập
before = S.before_sync(new, USER)
phone = dict(backup_conf)                        # điện thoại giữ bản cũ hơn nữa (50 xu, dấu của bản sao lưu)
phone["kotoba_batake_state"] = json.dumps(dict(json.loads(backup_conf["kotoba_batake_state"]), coins=50))
new.conf = dict(phone)                           # đồng bộ: cấu hình nguyên khối của điện thoại (dấu cũ) đè lên
res3 = S.after_sync(new, USER, before)
ok(res3["action"] == S.RESTORE and coins(new) == 100 and B.clean_rev(new.get_config(B.REV_KEY))["t"] > rv["t"],
   "sau đó điện thoại đè bản cũ hơn → vẫn trả lại (lớp giữ 1.31.2 không đổi)")

print("== 1b. Import bản sao lưu từ trước khi cài ことば畑 (không có dữ liệu vườn)")
d = Col("Test2")
d.set_config("kotoba_batake_start", {"ms": 1_700_000_000_000})
play(d, 300, 3_000_000)
S.before_sync(d, USER)
empty = Col("Test2")
res4 = S.on_open(empty, USER, True)
ok(res4["action"] == S.KEEP and not S.snapshot(empty), "lúc Import: không đóng dấu lên collection chưa có vườn")
res5 = S.on_open(empty, USER, False)
ok(res5["action"] == S.RESTORE and coins(empty) == 300,
   "mở hồ sơ lần sau: trả lại vườn của máy (như 'Mở bản sao lưu' của Anki từ 1.31.2 — không mất vườn)")

# =========================================================================================================================
print("== 2. __init__.py: móc collection_did_load (Import .colpkg)")
init = src("__init__.py")
m = re.search(r"def _on_collection_load\(\*_args: Any\) -> None:\n(.*?)\n\n\ndef ", init, re.S)
body = m.group(1) if m else ""
ok(bool(m), "có _on_collection_load")
ok('gui_hooks.collection_did_load.append(_on_collection_load)' in init and 'hasattr(gui_hooks, "collection_did_load")' in init,
   "nối vào gui_hooks.collection_did_load (có kiểm hasattr cho bản Anki cũ)")
ok(re.search(r"if not _profile_open:\n\s+return", body) is not None,
   "chỉ chạy khi hồ sơ đang mở (lúc mở hồ sơ, móc chạy trước profile_did_open → bỏ qua)")
po = re.search(r"def _on_profile_open\(\) -> None:\n(.*?)\n\n\ndef ", init, re.S).group(1)
pc = re.search(r"def _on_profile_close\(\) -> None:\n(.*?)\n\n\ndef ", init, re.S).group(1)
ok("_profile_open = True" in po and "global _open_pending, _sync_before, _sync_running, _profile_open" in po,
   "_on_profile_open đặt _profile_open = True")
ok("_profile_open = False" in pc and "global _report_dialog, _profile_open" in pc, "_on_profile_close đặt _profile_open = False")
for name in ("_ledger.clear()", "_answering.clear()", "_day_total.update(", "_words_cache.clear()", "_presence.update(",
             "_auto_cache.update(", "_started_cache.update("):
    ok(name in body, "bỏ bộ nhớ tạm của collection cũ: " + name)
ok("sync_core.on_open(mw.col, USER_DIR, True)" in body, "giữ bản vừa nhập như 'Mở bản sao lưu' (restoring_backup=True)")
ok("_flush_undo" not in body, "không ghi lượt Undo còn chờ (của collection cũ) sang collection mới")
ok("_dialog.collection_replaced()" in body, "vườn đang mở → dựng lại")
cr = re.search(r"    def collection_replaced\(self\) -> None:\n(.*?)\n\n    def ", init, re.S)
crb = cr.group(1) if cr else ""
ok(bool(cr) and "reviewing = self._card is not None" in crb and "self._next_card()" in crb and "self.refresh()" in crb,
   "collection_replaced: dựng lại vườn; đang ôn → lấy thẻ của collection mới (thẻ cũ thuộc collection đã đóng)")
ok("mw.col.decks.get(self.deck_id, default=False)" in crb and "get_current_id()" in crb,
   "deck đang xem không còn trong collection mới → deck hiện tại của Anki")

# =========================================================================================================================
print("== 3. web/paper.js: tab Nguồn báo gọn hơn")
pj = src("web/paper.js")
ok("function pick(options, current, onPick, label)" in pj and 'el("select", "kb-ai-sel")' in pj, "có ô thả xuống pick()")
lb = re.search(r"  function langBlock\(v, lang\) \{\n(.*?)\n  \}\n", pj, re.S).group(1)
ok(('aiRow(rows, "Trình độ", pick(' in lb or 'aiRow(rows, "Trình độ", lock(pick(' in lb) and "chips(" not in lb,   # 1.33.2: lock() khi đang viết
   "khối mỗi báo: Trình độ là ô thả xuống, không còn hàng nút")
sp = re.search(r"  function sourcePicker\(v, lang\) \{\n(.*?)\n  \}\n", pj, re.S).group(1)
ok("return pick(opts, cur," in sp and "chips(" not in sp and '"Chọn deck…"' in sp, "Lấy từ: ô thả xuống (Mọi deck / Chọn deck… / Không dùng deck)")
ok("none]);" in sp, "chưa có deck của tiếng này → hai mục đầu mờ (không chọn được)")
ok("function subCard" not in pj and "function voiceCard" not in pj, "bỏ thẻ Gói báo riêng + thẻ giọng riêng (gom lại)")
pb = re.search(r"  function planBlock\(v\) \{\n(.*?)\n  \}\n", pj, re.S).group(1)
ok('el("details", "kb-ai-plan' in pb and "planOpen === null ? warn : planOpen" in pb and 'addEventListener("toggle"' in pb,
   "Gói báo: một dòng thu gọn, hết hạn thì mở sẵn, nhớ mở / đóng")
ok('H.send("ai:sub:" + JSON.stringify({ buy: pn.id }))' in pb and "subAsk(pn," in pb and 'JSON.stringify({ auto: cb.checked })' in pb,
   "Gói báo vẫn mua (hỏi trước khi trả xu) + Tự gia hạn")
mb = re.search(r"  function moreBlock\(v\) \{\n(.*?)\n  \}\n", pj, re.S).group(1)
ok('el("details", "kb-ai-card kb-ai-opts-box kb-ai-more")' in mb and "det.open = moreOpen" in mb and 'addEventListener("toggle"' in mb,
   '"Tuỳ chọn thêm": khối thu gọn, nhớ mở / đóng khi bảng vẽ lại')
for what, needle in (("Đổi khoá", '"Đổi khoá"'), ("Giọng đọc", "aiSet({ audio: x })"), ("giọng (Kore…)", "aiSet({ voice: voice.value })"),
                     ("Truyện", "aiSet({ story: x })"), ("Chủ đề truyện", "aiSet({ tones: next })"), ("Tự viết", "aiSet({ auto: cb.checked })"),
                     ("Xoá khoá", 'H.send("ai:forget")'), ("giọng cho câu không có audio", "voiceBox(v)")):
    ok(needle in mb, '"Tuỳ chọn thêm" có ' + what)
ok("aiSet({ dict_voice: x })" in pj and ('aiSet({ level: x })' in pj or 'aiSet({ level: x, lang: lang })' in pj)   # 1.35: kèm lang (de / fr cùng A1–C1 với en)
   and 'H.send("ai:decks:"' in pj, "Trình độ / Lấy từ / giọng câu chép vẫn lưu như cũ")
ok(len(re.findall(r'aiRow\([^;]*chips\(\[\["', pj)) == 0, "không còn hàng nút chọn-một nào trong tab Nguồn báo (chỉ Chủ đề truyện chọn nhiều)")
css = src("web/garden.css")
ok(".kb-ai-sel {" in css and ".kb-ai-opts-box > summary::before" in css and ".kb-ai-plan-b {" in css, "CSS cho ô thả xuống / khối thu gọn")

# =========================================================================================================================
print("== 4. Hợp đồng dữ liệu: không khoá collection / mục config mới so với 1.33.0")
KEYS_1330 = ["kotoba_batake_edit", "kotoba_batake_events", "kotoba_batake_ext", "kotoba_batake_fields", "kotoba_batake_guests",
             "kotoba_batake_image", "kotoba_batake_journal_", "kotoba_batake_life", "kotoba_batake_mau", "kotoba_batake_mobile",
             "kotoba_batake_more", "kotoba_batake_nha", "kotoba_batake_paper", "kotoba_batake_paper_en", "kotoba_batake_paper_ko",
             "kotoba_batake_paper_nguon", "kotoba_batake_paper_src", "kotoba_batake_paper_vi", "kotoba_batake_paper_zh",
             "kotoba_batake_pdf", "kotoba_batake_photo", "kotoba_batake_px", "kotoba_batake_report", "kotoba_batake_rev",
             "kotoba_batake_season", "kotoba_batake_start", "kotoba_batake_state"]
keys = set()
for f in glob.glob(os.path.join(ADDON, "*.py")):
    keys |= set(re.findall(r'"(kotoba_batake_[a-z0-9_]+)"', open(f, encoding="utf-8").read()))
keys -= {"kotoba_batake_paper_de", "kotoba_batake_paper_fr"}     # 1.35: báo tiếng Đức / tiếng Pháp — khoá mới, test_135.py soát
keys -= {"kotoba_batake_le"}     # 1.36: sự kiện Giáng sinh — khoá mới, test_136.py soát
ok(sorted(keys) == KEYS_1330, "khoá collection trong mã = 1.33.0" + ("" if sorted(keys) == KEYS_1330 else ": " + str(sorted(set(keys) ^ set(KEYS_1330)))))
cfg = json.load(open(os.path.join(ADDON, "config.json"), encoding="utf-8"))
CFG_KEYS_1330 = 39
cfg.pop("season_event", None)      # 1.36: ⚙ Sự kiện mùa — test_136.py soát
ok(len(cfg) == CFG_KEYS_1330 and "gemini_level_zh" in cfg and "gemini_level_ko" in cfg,
   "config.json: %d mục như 1.33.0 (không thêm mục)" % len(cfg))

print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
