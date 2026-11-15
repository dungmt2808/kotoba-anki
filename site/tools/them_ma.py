"""Đăng / gỡ mã thiết kế ở mục "Mã cộng đồng" của trang web (site/data/cong_dong.json).

Mã được kiểm bằng đúng hàm của add-on (share_core.parse_code — như khi người chơi dán mã vào Xưởng): mã hỏng, mã giả,
mã quá dài đều bị từ chối. Trang hiện hình từ phần "xem" (kết quả đã kiểm), không tự giải mã lại.

Dùng tay (máy có repo):
  python3 site/tools/them_ma.py them "KB1:…" --tac-gia "Mai" --ghi-chu "Đèn lồng cá chép"
  python3 site/tools/them_ma.py xoa m-1a2b3c4d
  python3 site/tools/them_ma.py danh-sach
Trong GitHub Actions (.github/workflows/dang_ma.yml):
  python3 site/tools/them_ma.py github      # issue vừa gắn nhãn "duyet", hoặc ô nhập của "Run workflow"
"""
from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import sys
from typing import Any

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADDON = os.path.join(ROOT, "kotoba_batake")
DATA = os.path.join(ROOT, "site", "data", "cong_dong.json")
sys.path.insert(0, ADDON)
sys.path.insert(0, os.path.join(ROOT, "tests", "stubs"))

import garden_core as core  # noqa: E402

# garden_core nạp bản riêng của share_core / more_core (khi chạy ngoài Anki) và nối chúng với nhau — dùng đúng bản đó
share_core = core.share
more_core = core.more

TNAME = {"m": "món đồ", "z": "vùng", "g": "giống cây"}
AUTHOR_MAX, NOTE_MAX = 40, 200
LABEL = "duyet"


class MaError(Exception):
    """Câu tiếng Việt cho người duyệt / người gửi."""


def load(path: str | None = None) -> dict[str, Any]:
    path = path or DATA
    try:
        with open(path, encoding="utf-8") as f:
            data = json.load(f)
    except FileNotFoundError:
        data = {}
    if not isinstance(data, dict) or not isinstance(data.get("ma"), list):
        data = {"v": 1, "ma": []}
    return data


def save(data: dict[str, Any], path: str | None = None) -> None:
    path = path or DATA
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
        f.write("\n")
    os.replace(tmp, path)


def check(code: str) -> dict[str, Any]:
    """Mã → bản xem trước của add-on. Lỗi → MaError (câu của add-on)."""
    try:
        return share_core.parse_code(code, core.CRAFT_PALETTE, core.CRAFT_PRICES, core.CRAFT_KINDS, core.CRAFT_FX)
    except share_core.ShareError as err:
        raise MaError(str(err)) from None


def add(data: dict[str, Any], text: Any, author: Any = "", note: Any = "", source: Any = "",
        today: dt.date | None = None) -> dict[str, Any]:
    if not isinstance(text, str):
        raise MaError("Chưa có mã thiết kế.")
    code = "".join(text.split())
    view = check(code)
    for e in data["ma"]:
        if e.get("ma") == code:
            raise MaError(f"Mã này đã có trên trang ({e.get('id')}).")
    entry = {
        "id": f"{view['t']}-{hashlib.sha1(code.encode('ascii')).hexdigest()[:8]}",
        "ma": code,
        "tac_gia": more_core.clean_text(author, AUTHOR_MAX, "Ẩn danh"),
        "ghi_chu": more_core.clean_text(note, NOTE_MAX, ""),
        "ngay": (today or dt.date.today()).isoformat(),
        "nguon": more_core.clean_text(source, 40, ""),
        "xem": view,
    }
    data["ma"].append(entry)
    return entry


def remove(data: dict[str, Any], mid: str) -> dict[str, Any]:
    for i, e in enumerate(data["ma"]):
        if e.get("id") == mid:
            return data["ma"].pop(i)
    raise MaError(f"Không có mã nào tên {mid}.")


# ---------------------------------------------------------------- issue form (.github/ISSUE_TEMPLATE/chia_se_thiet_ke.yml)

def form_fields(body: Any) -> dict[str, str]:
    """Thân issue tạo từ mẫu: "### Nhãn\\n\\nnội dung" → {nhãn: nội dung} ("_No response_" = rỗng)."""
    out: dict[str, str] = {}
    if not isinstance(body, str):
        return out
    parts = re.split(r"^###[ \t]+(.+?)[ \t]*$", body.replace("\r\n", "\n"), flags=re.M)
    for i in range(1, len(parts) - 1, 2):
        val = parts[i + 1].strip()
        val = re.sub(r"^```[^\n]*\n|\n?```$", "", val).strip()
        out[parts[i].strip()] = "" if val == "_No response_" else val
    return out


def code_in(text: str) -> str:
    m = re.search(r"KB\d+:[A-Za-z0-9_:\-\s]+", text or "")
    return m.group(0) if m else ""


def from_issue(event: dict[str, Any]) -> tuple[str, str, str, str]:
    issue = event.get("issue") or {}
    f = form_fields(issue.get("body"))
    code = code_in(f.get("Mã thiết kế", "")) or code_in(issue.get("body") or "")
    return code, f.get("Tên hiển thị", ""), f.get("Ghi chú", ""), f"#{issue.get('number', '')}"


def page_url(mid: str) -> str:
    repo = os.environ.get("GITHUB_REPOSITORY", "dungmt2808/kotoba-anki")
    owner, _, name = repo.partition("/")
    return f"https://{owner.lower()}.github.io/{name}/#ma/{mid}"


def set_output(**kw: str) -> None:
    path = os.environ.get("GITHUB_OUTPUT")
    lines = []
    for k, v in kw.items():
        lines.append(f"{k}<<__KB_EOF__\n{v}\n__KB_EOF__\n")
    if path:
        with open(path, "a", encoding="utf-8") as f:
            f.write("".join(lines))
    else:
        sys.stdout.write("".join(lines))


def run_github() -> int:
    name = os.environ.get("GITHUB_EVENT_NAME", "")
    event: dict[str, Any] = {}
    if os.environ.get("GITHUB_EVENT_PATH"):
        with open(os.environ["GITHUB_EVENT_PATH"], encoding="utf-8") as f:
            event = json.load(f)
    if name == "issues":
        if ((event.get("label") or {}).get("name")) != LABEL:
            set_output(ok="0", msg="")
            return 0
        code, author, note, source = from_issue(event)
    else:
        code, author, note, source = os.environ.get("MA", ""), os.environ.get("TAC_GIA", ""), os.environ.get("GHI_CHU", ""), "tay"
    data = load()
    try:
        if not code.strip():
            raise MaError("Không thấy mã thiết kế (mã đúng bắt đầu bằng “KB1:”).")
        e = add(data, code, author, note, source)
    except MaError as err:
        set_output(ok="0", msg=f"Chưa đăng được: {err}\n\nSửa lại mã trong issue (Edit) rồi gắn lại nhãn `{LABEL}` nhé.")
        print(f"Từ chối: {err}")
        return 0
    save(data)
    v = e["xem"]
    # tên do người gửi đặt: bọc trong `…` (clean_text đã bỏ dấu `) để "@ai đó" / link không thành gọi tên / đường dẫn
    msg = (f"Đã đăng lên trang **Mã cộng đồng**: `{v['name']}` ({TNAME[v['t']]}, vẽ bởi `{e['tac_gia']}`).\n\n"
           f"Trang cập nhật sau vài phút: {page_url(e['id'])}\n\nCảm ơn bạn đã chia sẻ!")
    set_output(ok="1", id=e["id"], name=v["name"], msg=msg)
    print(f"Đã thêm {e['id']} — {v['name']}")
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    a = sub.add_parser("them", help="thêm một mã")
    a.add_argument("ma")
    a.add_argument("--tac-gia", default="")
    a.add_argument("--ghi-chu", default="")
    a.add_argument("--nguon", default="tay")
    x = sub.add_parser("xoa", help="gỡ một mã theo id")
    x.add_argument("id")
    sub.add_parser("danh-sach", help="liệt kê mã đã đăng")
    sub.add_parser("github", help="chạy trong GitHub Actions")
    args = ap.parse_args(argv)
    if args.cmd == "github":
        return run_github()
    data = load()
    try:
        if args.cmd == "them":
            e = add(data, args.ma, args.tac_gia, args.ghi_chu, args.nguon)
            save(data)
            print(f"Đã thêm {e['id']} — {e['xem']['name']} ({TNAME[e['xem']['t']]}, vẽ bởi {e['tac_gia']})")
        elif args.cmd == "xoa":
            e = remove(data, args.id)
            save(data)
            print(f"Đã gỡ {e['id']} — {e['xem']['name']}")
        else:
            for e in data["ma"]:
                print(f"{e['id']}\t{e['ngay']}\t{e['xem']['name']}\t{e['tac_gia']}")
            print(f"({len(data['ma'])} mã)")
    except MaError as err:
        print(f"Lỗi: {err}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
