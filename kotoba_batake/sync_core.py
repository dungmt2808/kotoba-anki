"""ことば畑 — giữ dữ liệu vườn khi đồng bộ AnkiWeb (1.31.2).

Không import aqt / anki (test được bằng python thường và bằng máy chủ đồng bộ thật của Anki, xem tests/dong_bo/).

**Vì sao cần.** Mọi dữ liệu của vườn (ví, nhà, đồ tự làm, nhật ký, album…) nằm trong cấu hình collection để AnkiWeb
đồng bộ. Nhưng Anki đồng bộ cấu hình **nguyên khối**: lúc đồng bộ, bên nào có collection sửa sau cùng (kể cả chỉ ôn một
thẻ) thì toàn bộ cấu hình của bên đó đè lên bên kia — không theo từng khoá. Hệ quả (đã tái hiện bằng máy chủ đồng bộ thật
của Anki và trong Anki thật):

    máy tính chơi vườn (mua ghế, viết nhật ký) → đồng bộ
    điện thoại ôn vài thẻ khi CHƯA đồng bộ trước → đồng bộ      (cấu hình cũ của điện thoại đè lên máy chủ)
    máy tính đồng bộ lại                                        → ví / nhà / nhật ký quay về bản cũ, mất phần vừa làm

Điện thoại không chạy add-on, chỉ giữ hộ bản cấu hình nó tải về lần trước, nên việc này lặp lại với người quen ôn trên
điện thoại trước rồi mới đồng bộ. Ngày đầu cài còn nặng hơn: cấu hình của điện thoại chưa có khoá nào của vườn → mọi khoá
`kotoba_batake_*` bị xoá khỏi collection (nhật ký tháng đó mất hẳn ở lần ghi kế tiếp).

**Cách giữ.** Mỗi lần ghi dữ liệu vườn, `backup_core` đóng **dấu phiên bản** `kotoba_batake_rev` = `{"v": 1, "t": mili
giây, "d": mã máy}` (t luôn lớn hơn dấu của bản nó sửa, kể cả khi đồng hồ máy chạy chậm). Dấu nằm trong cấu hình nên đi
cùng dữ liệu qua mọi máy; điện thoại không sửa dữ liệu vườn nên bản nó giữ hộ luôn mang dấu cũ.
  - Trước đồng bộ (`before_sync`): chụp toàn bộ khoá `kotoba_batake_*` (giữ trong bộ nhớ + file của máy).
  - Sau đồng bộ (`after_sync`): dữ liệu vườn trong collection khác bản vừa chụp → so dấu. Bản mang về **cũ hơn** (dấu
    nhỏ hơn, không có dấu, không còn khoá nào, hoặc là vườn mới lập của một máy vừa cài) → ghi lại bản vừa chụp (lần đồng
    bộ sau đẩy lên máy chủ). Bản mang về mới hơn / không rõ → giữ bản mang về (không bao giờ đè dữ liệu lạ).
  - Lúc mở hồ sơ (`on_open`): collection đang giữ bản cũ hơn bản chụp gần nhất của máy này (đồng bộ chạy khi add-on bị
    tắt — chế độ an toàn —, Anki tắt giữa lúc đồng bộ) → trả lại bản chụp. Người dùng vừa **khôi phục bản sao lưu của
    Anki** thì đó là ý họ: giữ bản vừa khôi phục và đóng dấu mới cho nó.

Chỉ đụng các khoá `kotoba_batake_*`; thẻ, lịch ôn, revlog do Anki tự gộp như thường. Hai máy tính cùng sửa vườn khi chưa
đồng bộ vẫn là "bản đóng dấu sau thắng" (không gộp từng món) — xem PHAT_TRIEN.md mục 9.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from typing import Any

try:
    from . import backup_core as backup
except ImportError:  # chạy test ngoài Anki
    import backup_core as backup  # type: ignore[no-redef]

PREFIX = "kotoba_batake_"
REV_KEY = backup.REV_KEY            # dấu phiên bản dữ liệu vườn
START_KEY = PREFIX + "start"        # mốc lúc ことば畑 chạy lần đầu trên collection (garden_core.START_KEY) = "dòng" dữ liệu
RECORD = "dong_bo.json"             # bản chụp gần nhất của máy này (trong thư mục hồ sơ)
LOST = "dong_bo_bi_de.json"         # bản vừa bị thay khi trả lại dữ liệu mới (để cứu bằng tay nếu cần)

KEEP, RESTORE, FAILED = "keep", "restore", "failed"

clean_rev = backup.clean_rev


def _is_int(v: Any) -> bool:
    return isinstance(v, int) and not isinstance(v, bool)


def digest(keys: dict[str, Any]) -> str:
    """Mã băm nội dung dữ liệu vườn (mọi khoá trừ dấu phiên bản). Không có khoá nào → ""."""
    rest = {k: v for k, v in keys.items() if k != REV_KEY}
    if not rest:
        return ""
    raw = json.dumps(rest, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha1(raw.encode("utf-8", "replace")).hexdigest()[:20]


def snapshot(col: Any) -> dict[str, Any]:
    """Mọi khoá `kotoba_batake_*` trong cấu hình collection {khoá: giá trị}. Không đọc được → ném lỗi."""
    conf: Any = None
    try:
        conf = col.all_config()
    except AttributeError:
        conf = None
    if not isinstance(conf, dict):         # bản Anki không có all_config: đọc thẳng bảng config
        conf = {}
        for key, val in col.db.all("select key, val from config where key like ?", PREFIX + "%"):
            try:
                conf[key] = json.loads(val)
            except (TypeError, ValueError):
                continue
    return {k: v for k, v in conf.items() if isinstance(k, str) and k.startswith(PREFIX)}


def col_ids(col: Any) -> tuple[int, int]:
    """(crt, scm) của collection: crt = lúc tạo (giống nhau trên mọi máy của một tài khoản), scm = lần đổi cấu trúc gần
    nhất. Không đọc được → (0, 0)."""
    try:
        row = col.db.first("select crt, scm from col")
        return int(row[0] or 0), int(row[1] or 0)
    except Exception:
        return 0, 0


def state_of(col: Any) -> dict[str, Any]:
    """Trạng thái dữ liệu vườn của collection lúc này: {"crt", "scm", "keys", "h", "rev"}."""
    keys = snapshot(col)
    crt, scm = col_ids(col)
    return {"crt": crt, "scm": scm, "keys": keys, "h": digest(keys), "rev": clean_rev(keys.get(REV_KEY))}


def lineage(keys: dict[str, Any]) -> int | None:
    """"Dòng" dữ liệu = mốc ことば畑 chạy lần đầu trên collection (START_KEY). None = chưa có mốc."""
    raw = keys.get(START_KEY)
    ms = raw.get("ms") if isinstance(raw, dict) else None
    return int(ms) if _is_int(ms) and ms > 0 else None


def _other_collection(a: dict[str, Any], b: dict[str, Any]) -> bool:
    """Hai trạng thái thuộc hai collection khác nhau (đăng nhập tài khoản AnkiWeb khác rồi tải về, nhập collection của
    người khác): lúc tạo (crt) khác VÀ lần đổi cấu trúc (scm) khác. Chỉ crt khác thì chưa đủ: đồng bộ thường cũng mang crt
    của máy khác về (đổi giờ sang ngày ở bản Anki cũ), còn collection bị thay hẳn thì luôn kèm scm khác."""
    return bool(a.get("crt") and b.get("crt") and a["crt"] != b["crt"] and a.get("scm") != b.get("scm"))


def _older(a: dict[str, Any], b: dict[str, Any]) -> bool:
    """Dấu a cũ hơn dấu b."""
    return (a["t"], a["d"]) < (b["t"], b["d"])


def decide(before: dict[str, Any] | None, after: dict[str, Any]) -> tuple[str, str]:
    """So bản chụp của máy này (`before`) với collection lúc này (`after`) → (KEEP | RESTORE, lý do).

    Chỉ RESTORE khi chắc chắn bản trong collection cũ hơn bản chụp; mọi trường hợp không rõ đều KEEP."""
    if not before or not before.get("h"):
        return KEEP, "máy này chưa có dữ liệu vườn"
    if before["h"] == after["h"]:
        return KEEP, "không đổi"
    b_rev, a_rev = before.get("rev"), after.get("rev")
    if b_rev is None:
        return KEEP, "bản của máy này chưa có dấu"
    if not after["h"]:
        # kể cả khi collection vừa được thay bằng collection khác (chơi vườn trước khi đăng nhập AnkiWeb rồi tải collection
        # của điện thoại về): vườn theo hồ sơ này — như ví vẫn được lấy lại từ file sao lưu từ trước 1.31.2
        return RESTORE, "bản mang về không còn dữ liệu vườn"
    if _other_collection(before, after):
        return KEEP, "collection khác (tài khoản khác / collection nhập về)"
    lb, la = lineage(before["keys"]), lineage(after["keys"])
    if lb is not None and la is not None and la != lb:
        # hai vườn lập riêng trên cùng một collection (máy thứ hai cài khi chưa đồng bộ) → vườn lập trước là vườn thật
        return (RESTORE, "bản mang về là vườn mới lập của máy khác") if la > lb else (KEEP, "vườn của máy này lập sau")
    if lb is not None and la is None:
        return KEEP, "bản mang về có từ trước khi có mốc"
    if a_rev is None:
        return RESTORE, "bản mang về chưa có dấu (cũ hơn)"
    if (a_rev["t"], a_rev["d"]) == (b_rev["t"], b_rev["d"]):
        return KEEP, "cùng dấu, nội dung khác (máy không đóng dấu đã sửa)"
    if _older(a_rev, b_rev):
        return RESTORE, "bản mang về cũ hơn"
    return KEEP, "bản mang về mới hơn"


def restore(col: Any, before: dict[str, Any], after: dict[str, Any]) -> list[str]:
    """Ghi lại bản chụp `before` vào collection (chỉ các khoá khác đi), như một lần lưu: lỗi giữa chừng → trả về như cũ
    rồi ném backup.StoreFailed. Đóng dấu mới (lớn hơn cả hai bản) để mọi máy nhận bản này. Khoá chỉ có ở bản trong
    collection (không có trong bản chụp) được giữ nguyên."""
    cur = after.get("keys") or {}
    writes = [(k, v) for k, v in sorted(before["keys"].items()) if k != REV_KEY and cur.get(k) != v]
    floor = max([r["t"] for r in (before.get("rev"), after.get("rev")) if r] or [0])
    with backup.restoring():
        done = backup.commit_config(col, writes, floor=floor)
    if not done:                  # nội dung đã giống (chỉ dấu khác) → vẫn đóng dấu mới
        backup.touch_rev(col, floor)
    return done


# ---------------------------------------------------------------------------
# File của máy: bản chụp gần nhất + bản vừa bị thay
# ---------------------------------------------------------------------------

def record_path(user_dir: str, col: Any, name: str = RECORD) -> str:
    return backup.profile_path(os.path.join(user_dir, name), col)


def read_record(user_dir: str, col: Any) -> dict[str, Any] | None:
    """Bản chụp gần nhất của hồ sơ đang mở (None nếu chưa có / hỏng / không biết hồ sơ)."""
    if not backup.profile_key(col):
        return None
    try:
        with open(record_path(user_dir, col), encoding="utf-8") as f:
            raw = json.load(f)
    except (OSError, ValueError):
        return None
    if not isinstance(raw, dict) or not isinstance(raw.get("keys"), dict):
        return None
    keys = {k: v for k, v in raw["keys"].items() if isinstance(k, str) and k.startswith(PREFIX)}
    return {"crt": raw["crt"] if _is_int(raw.get("crt")) else 0, "scm": raw["scm"] if _is_int(raw.get("scm")) else 0,
            "keys": keys, "h": digest(keys), "rev": clean_rev(keys.get(REV_KEY)), "pending": raw.get("pending") is True}


def _write(path: str, payload: dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    os.replace(tmp, path)


def write_record(user_dir: str, col: Any, state: dict[str, Any]) -> bool:
    """Ghi bản chụp ra file của hồ sơ (qua file tạm rồi đổi tên); nội dung + dấu như file đang có thì thôi. Không biết hồ
    sơ (collection giả trong test) → không ghi. Lỗi ghi file chỉ in ra (không chặn đồng bộ). 1.35.5: trả False khi ghi lỗi."""
    if not backup.profile_key(col) or not state.get("h"):
        return True
    pending = state.get("pending") is True
    try:
        old = read_record(user_dir, col)
        if (old and old["h"] == state["h"] and old["rev"] == state["rev"] and old["crt"] == state.get("crt", 0)
                and old.get("pending") == pending):
            return True
        payload = {"v": 1, "crt": state.get("crt", 0), "scm": state.get("scm", 0), "at": int(time.time()), "keys": state["keys"]}
        if pending:
            payload["pending"] = True
        _write(record_path(user_dir, col), payload)
        return True
    except OSError as err:
        print(f"[kotoba_batake] bản chụp đồng bộ: {err}")
        return False


def _save_lost(user_dir: str, col: Any, after: dict[str, Any], why: str) -> None:
    if not backup.profile_key(col):
        return
    try:
        _write(record_path(user_dir, col, LOST), {"v": 1, "at": int(time.time()), "why": why, "keys": after.get("keys") or {}})
    except OSError as err:
        print(f"[kotoba_batake] bản bị thay: {err}")


# ---------------------------------------------------------------------------
# Ba điểm nối với Anki (__init__.py): trước đồng bộ, sau đồng bộ, lúc mở hồ sơ
# ---------------------------------------------------------------------------

def _pending(user_dir: str, col: Any) -> dict[str, Any] | None:
    """Bản chụp đang chờ trả lại (lần trả lại trước bị lỗi ghi) của hồ sơ đang mở, hoặc None."""
    rec = read_record(user_dir, col)
    return rec if rec is not None and rec.get("pending") else None


def _hold(user_dir: str, col: Any, mine: dict[str, Any]) -> None:
    """1.33.3 (audit 17/11 F06): trả lại lỗi → giữ bản chụp tốt kèm dấu "đang chờ" (file) + móc `backup.PENDING`: lần đọc /
    ghi dữ liệu vườn kế tiếp, lần đồng bộ sau, lần mở hồ sơ sau đều trả lại bản này trước. Trước đây đồng bộ lại chụp đè
    bản cũ vừa mang về lên file, còn cộng xu / viết nhật ký đóng dấu mới lên bản cũ → không còn tự phục hồi được.
    1.35.5: ghi file lỗi (ổ đầy, thư mục bị khoá) → giữ bản chụp trong bộ nhớ (`hold_later`) thay vì mất móc."""
    wrote = write_record(user_dir, col, dict(mine, pending=True))
    if wrote and backup.profile_key(col) and _pending(user_dir, col) is not None:
        backup.PENDING = lambda c, _d=user_dir: settle(c, _d)
    else:
        hold_later(user_dir, mine)


def hold_later(user_dir: str, mine: dict[str, Any] | None) -> None:
    """1.35.5 (audit 19/11 #04): bản chụp `mine` chờ so / trả lại nhưng chưa ghi được ra file (hoặc chưa có collection):
    giữ trong bộ nhớ — lần đọc / ghi dữ liệu vườn kế tiếp (backup.settle) so trước như sau đồng bộ."""
    if not mine or not mine.get("h"):
        return

    def run(col: Any, _d: str = user_dir, _m: dict[str, Any] = mine) -> bool:
        cur = state_of(col)
        if _other_collection(_m, cur):
            if backup.PENDING is run:
                backup.PENDING = None
            return False
        out = _apply(col, _d, _m, cur)
        if out["action"] == FAILED:
            raise backup.StoreFailed(out["why"])
        if backup.PENDING is run:
            backup.PENDING = None
        return out["action"] == RESTORE

    backup.PENDING = run


def settle(col: Any, user_dir: str) -> bool:
    """Trả lại bản chụp đang chờ của hồ sơ đang mở (nếu có). True = vừa trả lại; trả lại lỗi → backup.StoreFailed (vẫn
    chờ); không còn gì chờ (đã xong / hồ sơ khác / collection khác / collection đã mới hơn) → False, gỡ móc."""
    rec = _pending(user_dir, col)
    if rec is None:
        backup.PENDING = None
        return False
    cur = state_of(col)
    if _other_collection(rec, cur):
        backup.PENDING = None
        return False
    out = _apply(col, user_dir, rec, cur)
    if out["action"] == FAILED:
        raise backup.StoreFailed(out["why"])
    # 1.35.5 (audit 19/11 #04B): chỉ gỡ móc khi file thật sự hết "đang chờ" — ghi file lỗi (đã trả lại vào collection) thì
    # còn móc: lần sau so lại (collection đã mới hơn → giữ, thử ghi file lần nữa). Trước đây gỡ luôn → lần đồng bộ sau
    # before_sync đọc lại bản chờ cũ trên file thay vì chụp dữ liệu mới, lúc so có thể trả bản cũ đó đè phần vừa làm.
    if _pending(user_dir, col) is None:
        backup.PENDING = None
    return out["action"] == RESTORE


def before_sync(col: Any, user_dir: str) -> dict[str, Any] | None:
    """Trước đồng bộ: chụp dữ liệu vườn (không ghi gì vào collection), ghi bản chụp ra file, trả về bản chụp để đưa cho
    `after_sync`. Lỗi → None (lần đồng bộ này không được bảo vệ; không bao giờ chặn đồng bộ).
    1.33.3 (F06): còn bản chụp chờ trả lại → dùng bản đó (không chụp bản cũ đang nằm trong collection đè lên)."""
    try:
        rec = _pending(user_dir, col)
        if rec is not None:
            try:
                now = state_of(col)
                other = _other_collection(rec, now)
                # 1.35.5 (audit 19/11 #04B): bản chờ đã trả lại xong mà file chưa ghi được dấu "xong" → collection mang dấu
                # MỚI hơn bản chờ (lần trả lại + các lần ghi sau đó) → chụp collection, không dùng bản chờ cũ
                stale = bool(now.get("h") and now.get("rev") and rec.get("rev") and _older(rec["rev"], now["rev"])
                             and lineage(now["keys"]) == lineage(rec["keys"]))
            except Exception:
                other = stale = False
            if not other and not stale:
                return rec
        state = state_of(col)
        write_record(user_dir, col, state)
        return state
    except Exception as err:
        print(f"[kotoba_batake] trước đồng bộ: {type(err).__name__}: {err}")
        return None


def _apply(col: Any, user_dir: str, mine: dict[str, Any] | None, cur: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {"action": KEEP, "why": "", "keys": []}
    action, why = decide(mine, cur)
    out.update(action=action, why=why)
    if action == RESTORE and mine is not None:
        _save_lost(user_dir, col, cur, why)
        try:
            out["keys"] = restore(col, mine, cur)
        except backup.StoreFailed as err:
            out.update(action=FAILED, why=str(err))
            _hold(user_dir, col, mine)
            return out
        cur = state_of(col)
    write_record(user_dir, col, cur)
    if backup.PENDING is not None and _pending(user_dir, col) is None:
        backup.PENDING = None
    return out


def after_sync(col: Any, user_dir: str, before: dict[str, Any] | None) -> dict[str, Any]:
    """Sau đồng bộ: bản mang về cũ hơn bản chụp → trả lại bản chụp. Trả về {"action": keep | restore | failed, "why",
    "keys": các khoá đã ghi lại}. Lỗi ghi khi trả lại → "failed" (bản chụp vẫn còn trong file, lần mở hồ sơ sau thử lại)."""
    try:
        if before is None:
            # 1.33.3 (F06): không chụp được trước đồng bộ → so với bản chụp gần nhất của máy (file) thay vì "chưa có gì"
            # (trước: ghi bản vừa mang về đè lên bản chụp tốt đó)
            before = read_record(user_dir, col)
        return _apply(col, user_dir, before, state_of(col))
    except Exception as err:
        print(f"[kotoba_batake] sau đồng bộ: {type(err).__name__}: {err}")
        # 1.35.5 (audit 19/11 #04A): lỗi thoáng qua (đọc collection lỗi…) → giữ bản chụp chờ so lại ở lần đọc / ghi kế
        # tiếp (trước đây bỏ luôn: lần ghi sau đóng dấu mới lên bản có thể cũ vừa mang về)
        if before is not None and before.get("h"):
            try:
                _hold(user_dir, col, before)
            except Exception as err2:      # noqa: BLE001
                print(f"[kotoba_batake] giữ bản chụp sau đồng bộ: {type(err2).__name__}: {err2}")
                hold_later(user_dir, before)
        return {"action": FAILED, "why": f"{type(err).__name__}: {err}", "keys": []}


def on_open(col: Any, user_dir: str, restoring_backup: bool = False) -> dict[str, Any]:
    """Lúc mở hồ sơ: collection đang giữ bản cũ hơn bản chụp gần nhất của máy này → trả lại bản chụp (xem đầu file).
    `restoring_backup`: người dùng vừa khôi phục bản sao lưu của Anki → giữ bản vừa khôi phục, đóng dấu mới cho nó."""
    out: dict[str, Any] = {"action": KEEP, "why": "", "keys": []}
    try:
        rec = read_record(user_dir, col)
        if rec is None:
            return out
        cur = state_of(col)
        if _other_collection(rec, cur):
            out["why"] = "collection khác"
            return out
        if restoring_backup:
            if cur["h"] and cur["h"] != rec["h"]:
                floor = max([r["t"] for r in (rec.get("rev"), cur.get("rev")) if r] or [0])
                backup.touch_rev(col, floor)
                write_record(user_dir, col, state_of(col))
                out["why"] = "vừa khôi phục bản sao lưu"
            return out
        return _apply(col, user_dir, rec, cur)
    except Exception as err:
        print(f"[kotoba_batake] mở hồ sơ (đồng bộ): {type(err).__name__}: {err}")
        return {"action": FAILED, "why": f"{type(err).__name__}: {err}", "keys": []}
