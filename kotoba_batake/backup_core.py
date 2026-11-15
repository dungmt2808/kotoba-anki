"""ことば畑 — lưu dữ liệu an toàn (1.31.1): file sao lưu theo hồ sơ + ghi nhiều khoá cấu hình collection như một lần lưu.

Không import aqt / anki (test được bằng python thường) — dùng chung cho garden_core (ví, nhà, đồ tự làm), paper_core (báo),
journal_core (nhật ký), guest_core (album khách), life_core (sổ sinh hoạt), finds_core (Hộp sưu tầm).

**Sao lưu theo hồ sơ** (audit 14/11 F03): mỗi khoá trong collection có một bản sao lưu ở `user_files/` của máy. Trước
1.31.1 mọi hồ sơ Anki trên máy dùng chung một file (`user_files/state.json`, `journal/2026_11.json`…): đã ghi chủ nên hồ sơ
B không đọc nhầm của A (1.23 KB-02), nhưng B lưu là **ghi đè** bản sao lưu của A — cần bản đó để cứu dữ liệu A thì đã mất.
Nay file nằm trong thư mục của hồ sơ: `user_files/ho_so/<mã hồ sơ>/state.json`, `…/ho_so/<mã>/journal/2026_11.json`
(kèm `ho_so.txt` ghi tên thư mục hồ sơ Anki). File chung cũ giữ nguyên, vẫn được đọc (đúng chủ) khi chưa có file mới.

**Ghi như một lần lưu** (audit 14/11 F06): Anki ghi từng khoá cấu hình riêng, add-on không có giao dịch chung. Trước 1.31.1
lỗi ghi một khoá chỉ được in ra rồi đi tiếp → ví đã trừ xu mà món đồ / điểm ảnh không được lưu, giao diện vẫn báo xong.
`commit_config` ghi lần lượt, bỏ qua khoá không đổi; một khoá lỗi → trả các khoá đã ghi về giá trị cũ rồi ném `StoreFailed`.

**Dấu phiên bản** (1.31.2): mỗi lần ghi dữ liệu vườn vào collection thì đóng dấu `kotoba_batake_rev` = `{"v": 1, "t": mili
giây, "d": mã máy}` (`touch_rev`; `t` luôn lớn hơn dấu đang có, kể cả khi đồng hồ máy chạy chậm). Anki đồng bộ cấu hình
collection nguyên khối — bên sửa collection sau cùng đè cả khối — nên sau đồng bộ dữ liệu vườn có thể quay về bản cũ (điện
thoại ôn thẻ khi chưa đồng bộ…); `sync_core` so dấu để biết bản mang về cũ hơn và trả lại bản mới của máy này.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from typing import Any

OWNER_KEY = "_ho_so"          # 1.23: khoá "chủ" trong file sao lưu (mã thư mục hồ sơ)
PROFILE_DIR = "ho_so"         # 1.31.1: user_files/ho_so/<mã hồ sơ>/

REV_KEY = "kotoba_batake_rev"  # 1.31.2: dấu phiên bản dữ liệu vườn (đồng bộ cùng dữ liệu, xem sync_core)
DEVICE = hashlib.sha1(os.urandom(16)).hexdigest()[:8]      # mã của lần chạy này (chỉ để hai dấu trùng thời điểm vẫn khác nhau)

# 1.31.2: cổng tạm khoá ghi — `__init__` đặt một hàm trả True trong lúc Anki đang đồng bộ (từ sync_will_start tới khi
# sync_core so xong). Lần ghi rơi vào lúc đó sẽ chạy ngay sau khi đồng bộ xong nhưng TRƯỚC khi so, tức là đóng dấu "mới
# nhất" lên chính bản cũ vừa mang về → lớp giữ dữ liệu tưởng đó là bản mới. Nên lúc đó từ chối ghi (như một lỗi ghi thường:
# người gọi báo "chưa lưu được", không đổi gì); giao diện bị thanh tiến độ của Anki chặn nên chỉ còn việc hẹn giờ rơi vào đây.
GATE: Any = None
SYNCING = "Anki đang đồng bộ nên chưa lưu được. Thử lại sau vài giây nhé."


def held() -> bool:
    """Đang tạm khoá ghi (Anki đang đồng bộ)?"""
    try:
        return bool(GATE and GATE())
    except Exception:
        return False


SAVE_FAILED = "Anki báo lỗi khi lưu nên chưa đổi gì. Thử lại sau nhé."
SAVE_PARTIAL = "Anki báo lỗi khi lưu. Đóng vườn rồi mở lại để xem xu và đồ đã đúng chưa nhé."


class StoreFailed(Exception):
    """Ghi vào collection lỗi. `partial` = có khoá đã ghi mà không trả về được giá trị cũ."""

    def __init__(self, msg: str, partial: bool = False) -> None:
        super().__init__(msg)
        self.partial = partial


def profile_key(col: Any) -> str:
    """Mã ngắn của hồ sơ Anki (theo thư mục chứa collection). "" nếu không biết (collection giả trong test)."""
    path = getattr(col, "path", "") if col is not None else ""
    if not isinstance(path, str) or not path:
        return ""
    folder = os.path.dirname(os.path.abspath(path))
    return hashlib.sha1(folder.encode("utf-8", "replace")).hexdigest()[:16]


def backup_payload(payload: Any, col: Any) -> Any:
    """Bản ghi ra file sao lưu: thêm chủ (hồ sơ đang mở) nếu biết."""
    key = profile_key(col)
    if key and isinstance(payload, dict):
        return dict(payload, **{OWNER_KEY: key})
    return payload


def backup_data(raw: Any, col: Any) -> Any:
    """Dữ liệu đọc từ file sao lưu dùng được cho hồ sơ đang mở không: không có collection (test) → dùng nguyên; có
    collection → chỉ khi file ghi đúng chủ (bỏ khoá chủ trước khi trả về); không thì None."""
    if col is None:
        return raw
    key = profile_key(col)
    if not key or not isinstance(raw, dict) or raw.get(OWNER_KEY) != key:
        return None
    out = dict(raw)
    out.pop(OWNER_KEY, None)
    return out


def _split(path: str, keep: int) -> tuple[str, list[str]]:
    head, tail = path, []
    for _ in range(max(1, keep)):
        head, part = os.path.split(head)
        tail.insert(0, part)
    return head, tail


def profile_path(path: str, col: Any, keep: int = 1) -> str:
    """Đường dẫn file sao lưu của hồ sơ đang mở. `keep` = số phần cuối của `path` giữ lại dưới thư mục hồ sơ (file ở
    user_files/ → 1; user_files/journal/2026_11.json → 2). Không biết hồ sơ (không có collection / test) → `path`."""
    key = profile_key(col)
    if not key:
        return path
    head, tail = _split(path, keep)
    return os.path.join(head, PROFILE_DIR, key, *tail)


def write_backup(path: str, payload: Any, col: Any, keep: int = 1) -> str:
    """Ghi file sao lưu (qua file tạm rồi đổi tên) vào thư mục của hồ sơ (không biết hồ sơ → `path`). Lần đầu tạo thư mục
    hồ sơ thì ghi thêm `ho_so.txt` (tên thư mục hồ sơ Anki) để biết thư mục nào của ai khi cần cứu dữ liệu.
    Lỗi ghi file → OSError (người gọi quyết định)."""
    target = profile_path(path, col, keep)
    os.makedirs(os.path.dirname(target), exist_ok=True)
    if target != path:
        root = os.path.join(_split(path, keep)[0], PROFILE_DIR, profile_key(col))
        note = os.path.join(root, "ho_so.txt")
        if not os.path.exists(note):
            try:
                name = os.path.basename(os.path.dirname(os.path.abspath(getattr(col, "path", "") or "")))
                with open(note, "w", encoding="utf-8") as f:
                    f.write("Bản sao lưu ことば畑 của hồ sơ Anki: %s\n" % name)
            except OSError:
                pass
    tmp = target + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False)
    os.replace(tmp, target)
    return target


def read_backup(path: str, col: Any, keep: int = 1, owner: bool = True) -> Any:
    """Đọc file sao lưu của hồ sơ đang mở: file trong thư mục hồ sơ trước, không có thì file chung cũ (≤ 1.31.0).
    `owner`: file có ghi chủ (ví, nhà, báo…) → chỉ nhận khi đúng chủ; không có collection → dùng nguyên file chung."""
    paths = [profile_path(path, col, keep)] if profile_key(col) else []
    paths.append(path)
    for p in paths:
        try:
            with open(p, encoding="utf-8") as f:
                raw = json.load(f)
        except (OSError, ValueError):
            continue
        got = backup_data(raw, col) if owner else raw
        if got is not None:
            return got
    return None


def clean_rev(raw: Any) -> dict[str, Any] | None:
    """Dấu phiên bản hợp lệ `{"v": 1, "t": mili giây, "d": mã máy}` hoặc None."""
    if not isinstance(raw, dict):
        return None
    t = raw.get("t")
    if not isinstance(t, int) or isinstance(t, bool) or t <= 0:
        return None
    d = raw.get("d")
    return {"v": 1, "t": t, "d": d if isinstance(d, str) else ""}


def touch_rev(col: Any, floor: int = 0, now_ms: int | None = None) -> dict[str, Any] | None:
    """Đóng dấu phiên bản mới cho dữ liệu vườn (gọi sau khi vừa ghi một khoá `kotoba_batake_*`). `t` = bây giờ nhưng luôn
    lớn hơn dấu đang có và `floor` — bản ghi sau luôn "mới hơn" bản nó sửa, kể cả khi đồng hồ máy chạy chậm. Lỗi ghi dấu
    không làm hỏng lần lưu (dữ liệu đã ghi; thiếu dấu thì lần đồng bộ đó chỉ không được bảo vệ) → trả None."""
    try:
        prev = clean_rev(col.get_config(REV_KEY, None))
    except Exception:
        prev = None
    now = int(time.time() * 1000) if now_ms is None else int(now_ms)
    rev = {"v": 1, "t": max(now, (prev["t"] + 1) if prev else 0, int(floor) + 1), "d": DEVICE}
    try:
        col.set_config(REV_KEY, rev)
    except Exception as err:
        print(f"[kotoba_batake] dấu phiên bản: {type(err).__name__}: {err}")
        return None
    return rev


def put_config(col: Any, key: str, payload: Any) -> None:
    """Ghi một khoá dữ liệu vườn rồi đóng dấu phiên bản. Lỗi ghi → ném nguyên lỗi của Anki (như `col.set_config`);
    Anki đang đồng bộ → StoreFailed(SYNCING), không ghi."""
    if held():
        raise StoreFailed(SYNCING)
    col.set_config(key, payload)
    touch_rev(col)


_UNREAD = object()       # giá trị cũ của một khoá không đọc được (không trả về được khi lỗi)


def commit_config(col: Any, writes: list[tuple[str, Any]], floor: int = 0) -> list[str]:
    """Ghi nhiều khoá cấu hình collection như một lần lưu: theo thứ tự `writes`, bỏ qua khoá không đổi (đỡ một lần ghi, giữ
    Redo của Anki). Một khoá lỗi → trả các khoá đã ghi về giá trị cũ (khoá chưa có thì xoá) rồi ném StoreFailed. Người gọi
    xếp khoá "trả tiền" (ví) sau cùng: lỗi giữa chừng không bao giờ trừ xu mà chưa có món. Trả về các khoá đã ghi.
    1.31.2: có khoá được ghi thì đóng dấu phiên bản (`touch_rev`, `floor` = dấu phải vượt qua); Anki đang đồng bộ
    (`held()`) → StoreFailed(SYNCING), không ghi gì."""
    if held():
        raise StoreFailed(SYNCING)
    old: dict[str, Any] = {}
    done: list[str] = []
    key = ""
    try:
        for key, payload in writes:
            try:
                prev = col.get_config(key, None)
            except Exception:
                prev = _UNREAD
            if prev is not _UNREAD and prev == payload:
                continue
            old[key] = prev
            col.set_config(key, payload)
            done.append(key)
    except Exception as err:
        print(f"[kotoba_batake] save {key} to collection: {type(err).__name__}: {err}")
        bad = False
        for k in reversed(done):
            prev = old.get(k, _UNREAD)
            try:
                if prev is _UNREAD:
                    bad = True
                elif prev is None:
                    col.remove_config(k)
                else:
                    col.set_config(k, prev)
            except Exception as err2:
                print(f"[kotoba_batake] undo save {k}: {type(err2).__name__}: {err2}")
                bad = True
        raise StoreFailed(SAVE_PARTIAL if bad else SAVE_FAILED, bad) from None
    if done:
        touch_rev(col, floor)
    return done
