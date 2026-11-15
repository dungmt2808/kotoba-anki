"""1.31.3 (python thường): trang web chung mở từ add-on.
  - diag.site_link chỉ nhận các mục có tên (kho, cong-dong, xem-ma, gui, bao-loi); mục lạ / đường dẫn / sai kiểu → None.
  - Mọi lệnh `app:site:<mục>` trong web/*.js đều là mục có tên; __init__.py mở qua diag.site_link (không mở chuỗi tuỳ ý).
  - Đường dẫn trang / repo của add-on khớp trang web (site/app.js REPO) và mẫu issue Báo lỗi có trong .github.
  - Cửa sổ Báo lỗi có nút "Gửi qua GitHub…" mở diag.ISSUE_BUG_URL; open_url có chế độ test (KB_TEST_NO_LINK).
Chạy: python3 tests/core/test_1313.py ADDON
"""
from __future__ import annotations

import glob
import os
import re
import sys

ADDON = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "..", "..", "kotoba_batake")
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
sys.path.insert(0, ADDON)
import diag  # noqa: E402

results: list[bool] = []


def ok(c: bool, m: str) -> None:
    results.append(bool(c))
    print(("  ✓ " if c else "  ✗ ") + m)


print("== diag.site_link")
for part in ("kho", "cong-dong", "xem-ma", "gui", "bao-loi"):
    ok(diag.site_link(part) == diag.SITE_URL + "#" + part, part + " → " + str(diag.site_link(part)))
bad = ["", "https://example.com", "../x", "kho#x", "COng-dong", "gui ", None, 1, ["kho"], {"a": 1}, "javascript:alert(1)"]
ok(all(diag.site_link(b) is None for b in bad), "mục lạ / đường dẫn / sai kiểu → None (" + str(len(bad)) + " ca)")
ok(diag.SITE_URL.startswith("https://") and diag.SITE_URL.endswith("/") and diag.ISSUE_BUG_URL.startswith(diag.REPO_URL + "/issues/new?template="),
   "đường dẫn https, mẫu issue nằm trong repo")

print("== lệnh app:site: trong trang vườn")
parts = set()
for f in glob.glob(os.path.join(ADDON, "web", "*.js")):
    with open(f, encoding="utf-8") as fh:
        parts |= set(re.findall(r"app:site:([^\"'`]*)[\"'`]", fh.read()))
ok(parts and parts <= set(diag.SITE_PARTS), "web/*.js chỉ gửi mục có tên: " + ", ".join(sorted(parts)))
with open(os.path.join(ADDON, "web", "home.js"), encoding="utf-8") as fh:
    home = fh.read()
ok('"Mã cộng đồng ▸"' in home and '"Gửi lên trang ▸"' in home, "Xưởng: nút Mã cộng đồng ▸ (ô Dán mã) + Gửi lên trang ▸ (thẻ Mã chia sẻ)")
with open(os.path.join(ADDON, "__init__.py"), encoding="utf-8") as fh:
    init = fh.read()
m = re.search(r'elif cmd\.startswith\("app:site:"\):.*?\n(?=        elif|        return)', init, re.S)
ok(m and "diag.site_link(" in m.group(0) and "open_url(url)" in m.group(0), "cầu nối app:site: mở qua diag.site_link")
ok('QPushButton("Gửi qua GitHub…")' in init and "open_url(diag.ISSUE_BUG_URL)" in init and "(b_mail, b_gh, b_copy, b_save, b_clear)" in init,
   "cửa sổ Báo lỗi: nút Gửi qua GitHub… (chép báo cáo + mở mẫu issue)")
ok('os.environ.get("KB_TEST_NO_LINK")' in init and "OPENED_LINKS.append(url)" in init, "open_url có chế độ test (không mở trình duyệt)")

print("== khớp trang web + mẫu issue")
app = os.path.join(ROOT, "site", "app.js")
if os.path.isfile(app):
    with open(app, encoding="utf-8") as fh:
        js = fh.read()
    repo = re.search(r'const REPO = "([^"]+)"', js).group(1)
    ok(diag.REPO_URL == "https://github.com/" + repo and diag.SITE_URL == f"https://{repo.split('/')[0].lower()}.github.io/{repo.split('/')[1]}/",
       "REPO_URL / SITE_URL = repo của trang (" + repo + ")")
    tabs = re.search(r"const TABS = \[([^\]]+)\]", js).group(1)
    ok(set(re.findall(r'"([^"]+)"', tabs)) == set(diag.SITE_PARTS), "mục của trang (TABS) = diag.SITE_PARTS")
    tpl = diag.ISSUE_BUG_URL.split("template=")[1]
    ok(os.path.isfile(os.path.join(ROOT, ".github", "ISSUE_TEMPLATE", tpl)) and f'BUG_TEMPLATE = "{tpl}"' in js,
       "mẫu issue " + tpl + " có trong .github và trang dùng cùng mẫu")
else:
    print("  – bỏ qua (không có site/ cạnh thư mục add-on)")

print(f"KẾT QUẢ: {sum(results)}/{len(results)}" + (" — TẤT CẢ OK" if all(results) else " — CÓ LỖI"))
sys.exit(0 if all(results) else 1)
