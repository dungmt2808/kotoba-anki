"""1.35.6 (người dùng 19/11: "thêm phần báo có mục ẩn vườn, hiện vườn") — nút "Ẩn vườn / Hiện vườn" trên bảng Báo.

Offline, python thường (không cần gói anki):
  A. hợp đồng dữ liệu với 1.35.5 (commit ff7d45f — repo có lịch sử): cùng danh sách file, mọi file .py / config.json /
     LICENSE giống hệt từng byte, chỉ đổi web/body.html, web/garden.css, web/paper.js, web/ui.js, manifest.json (số bản),
     README.md, config.md; khoá `kotoba_batake_*` trong mã như cũ; body.html chỉ thêm nút;
  B. giá trị nút ghi (`ui.panel.yard / field = "hide"`) qua `more_core.clean_ui` của 1.35.6 và của **1.31.3 đã phát hành**
     (`fixtures/ban_cu/e64eb22.tar.gz`) giữ nguyên — máy còn bản cũ đọc được; kiểu "Đầy đủ" trả về "full";
  C. soát mã: nút nằm trong hàng trên cùng của #kb-paper ngay trước Thoát, id duy nhất, không lấy focus khi bấm, cùng chế độ
     với nút Trò chơi (`QUICK`), CSS khung báo khi vườn ẩn, khung báo khi vườn hiện như 1.35.5, dòng chú thích của ruộng ẩn
     theo ruộng, `fitTop` được gọi ở mọi chỗ đổi hàng trên cùng.
Chạy: python3 test_1356.py ADDON
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
import tarfile
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ma_cu  # noqa: E402

ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "kotoba_batake"))
REPO = os.path.abspath(os.path.join(HERE, "..", ".."))
RES: list[bool] = []


def ok(c, m):
    RES.append(bool(c))
    print(("  ✓ " if c else "  ✗ ") + m)


def read(rel, root=ADDON, mode="r"):
    with open(os.path.join(root, rel), mode, **({} if "b" in mode else {"encoding": "utf-8"})) as f:
        return f.read()


def unpack(commit):
    """Thư mục kotoba_batake của một commit (None nếu không có lịch sử / fixture)."""
    try:
        data = ma_cu.archive(REPO, commit)
    except Exception:
        return None
    if not data:
        return None
    dst = tempfile.mkdtemp(prefix="kb1356_" + commit + "_")
    with tarfile.open(fileobj=io.BytesIO(data)) as t:
        t.extractall(dst)
    return os.path.join(dst, "kotoba_batake")


def files_of(root):
    out = set()
    for d, dirs, fs in os.walk(root):
        dirs[:] = [x for x in dirs if x not in ("__pycache__", "user_files")]
        for f in fs:
            if f in ("meta.json",) or f.endswith(".pyc"):
                continue
            out.add(os.path.relpath(os.path.join(d, f), root))
    return out


def keys_of(root):
    out = set()
    for n in os.listdir(root):
        if n.endswith(".py"):
            out |= set(re.findall(r"\"(kotoba_batake_[a-z0-9_]+)\"", read(n, root)))
    return out


# ---------------- A. hợp đồng dữ liệu với 1.35.5 ----------------
print("== A. So với 1.35.5")
OLD = unpack("ff7d45f")
CHANGED_OK = {"web/body.html", "web/garden.css", "web/paper.js", "web/ui.js", "manifest.json", "README.md", "config.md"}
if OLD and os.path.isdir(OLD):
    fa, fb = files_of(OLD), files_of(ADDON)
    ok(fa == fb, "cùng danh sách file với 1.35.5 (" + str(len(fb)) + " file)" + ("" if fa == fb else ": thêm " + str(sorted(fb - fa)) + ", bớt " + str(sorted(fa - fb))))
    changed = sorted(f for f in fa & fb if read(f, OLD, "rb") != read(f, ADDON, "rb"))
    ok(set(changed) <= CHANGED_OK, "chỉ đổi " + ", ".join(changed))
    py_same = [f for f in fa & fb if f.endswith(".py") and read(f, OLD, "rb") != read(f, ADDON, "rb")]
    ok(not py_same, "mọi file Python giống hệt 1.35.5 (không đổi cách lưu / lệnh)" + (": " + str(py_same) if py_same else ""))
    ok(read("config.json", OLD, "rb") == read("config.json", ADDON, "rb"), "config.json giống hệt (không thêm mục config)")
    ok(keys_of(OLD) == keys_of(ADDON), "khoá collection như 1.35.5 (" + str(len(keys_of(ADDON))) + " khoá)")
    mo, mn = json.loads(read("manifest.json", OLD)), json.loads(read("manifest.json", ADDON))
    ok({k: v for k, v in mo.items() if k not in ("human_version", "mod")} == {k: v for k, v in mn.items() if k not in ("human_version", "mod")}
       and mn["human_version"] == "1.35.6", "manifest: chỉ đổi số bản → " + mn["human_version"] + " (min / max_point_version như cũ)")
    # body.html: bỏ phần thêm của 1.35.6 thì giống hệt 1.35.5
    nb = read("web/body.html")
    nb2 = re.sub(r"\n *<!-- 1\.35\.6[^\n]*-->", "", nb)
    nb2 = re.sub(r"\n *<button type=\"button\" id=\"kb-p-garden\"[^\n]*</button>", "", nb2)
    ok(nb2 == read("web/body.html", OLD), "body.html = 1.35.5 + nút #kb-p-garden (không đổi gì khác — tiêu đề giữ một cụm cho glang.js)")
    # garden.css: 1.35.5 vẫn còn nguyên từng dòng (chỉ thêm)
    oc, nc = read("web/garden.css", OLD).splitlines(), read("web/garden.css", ADDON).splitlines()
    it = iter(nc)
    ok(all(any(l == x for x in it) for l in oc), "garden.css chỉ thêm dòng (mọi dòng của 1.35.5 còn nguyên, đúng thứ tự)")
else:
    print("  (bỏ qua: không có mã 1.35.5 — cần lịch sử git có commit ff7d45f)")

# ---------------- B. giá trị nút ghi, bản cũ đọc được ----------------
print("== B. Giá trị nút ghi qua clean_ui (1.35.6 + 1.31.3 đã phát hành)")
written = {"panel": {"yard": "hide", "field": "hide"}}


def clean_with(root):
    sys.path.insert(0, root)
    try:
        for m in [m for m in list(sys.modules) if m in ("more_core", "garden_core")]:
            del sys.modules[m]
        import more_core  # noqa: E402
        return more_core
    finally:
        sys.path.remove(root)


mc = clean_with(ADDON)
c = mc.clean_ui(written)
ok(c["panel"]["yard"] == "hide" and c["panel"]["field"] == "hide" and c["review"]["yard"] == "full" and c["main"]["yard"] == "full",
   "1.35.6: ui.panel Ẩn giữ nguyên, bảng ôn / màn chính mặc định")
ok(mc.ui_preset("full", c)["panel"]["yard"] == "full", 'kiểu "Đầy đủ" → "Trò chơi & báo" về Chuyển động')
OLD131 = unpack("e64eb22")
if OLD131:
    mo = clean_with(OLD131)
    c0 = mo.clean_ui(json.loads(json.dumps(c)))
    ok(c0["panel"]["yard"] == "hide" and c0["panel"]["field"] == "hide", "1.31.3 đã phát hành đọc config 1.35.6: vẫn Ẩn (không xoá / đổi)")
    for m in [m for m in list(sys.modules) if m in ("more_core", "garden_core")]:
        del sys.modules[m]
else:
    print("  (bỏ qua: không có mã 1.31.3)")

# ---------------- C. soát mã ----------------
print("== C. Soát mã")
body = read("web/body.html")
ok(body.count('id="kb-p-garden"') == 1, "id kb-p-garden duy nhất")
sec = re.search(r'<section id="kb-paper".*?</section>', body, re.S).group(0)
topm = re.search(r'<div class="kb-game-top">(.*?)\n    </div>\n    <div id="kb-p-info"', sec, re.S)
ok(topm and re.search(r'<button type="button" id="kb-p-garden" class="kb-btn kb-btn-small kb-rv-garden" aria-pressed="false"[^>]*>Ẩn vườn</button>\s*<button type="button" id="kb-p-exit"', topm.group(1)),
   "nút nằm trong hàng trên cùng của bảng Báo, ngay trước Thoát, cùng kiểu với nút Trò chơi / bảng ôn")
ok('<div class="kb-g-title">新聞 · Báo &amp; chép chính tả</div>' in sec, "tiêu đề giữ nguyên một cụm như 1.35.5 (glang.js dịch nguyên cụm)")
ui = read("web/ui.js")
ok('["kb-p-garden", "panel"]' in ui and '["kb-g-garden", "panel"]' in ui, "ui.js QUICK: nút Báo cùng chế độ panel với nút Trò chơi")
ok(re.search(r'\["kb-g-garden", "kb-p-garden"\]\.forEach\(\(id\) => \{\s*const qg = \$\(id\);[^\n]*\n\s*if \(qg\) \{ qg\.addEventListener\("mousedown", \(e\) => e\.preventDefault\(\)\); qg\.addEventListener\("click", togglePanel\); \}', ui),
   "ui.js: hai nút cùng togglePanel, mousedown preventDefault")
css = read("web/garden.css")
ok(".kb-ui-m-panel.kb-ui-yard-hide.kb-ui-field-hide #kb-paper .kb-p-stage { height: max(320px, calc(100vh - 250px)); }" in css,
   "CSS: vườn ẩn → khung báo max(320px, 100vh − 250px)")
ok(re.search(r"\.kb-p-stage \{\n  height: clamp\(320px, calc\(100vh - 250px\), 760px\);", css), "CSS: vườn hiện → khung báo như 1.35.5 (tối đa 760 px)")
ok(".kb-ui-field-hide #kb-note { display: none !important; }" in css, "CSS: dòng chú thích của ruộng ẩn theo ruộng")
ok(".kb-paper.kb-p-tight > .kb-game-top > .kb-g-title { display: none; }" in css and "@media (max-width: 1109px)" not in css,
   "CSS: bỏ tiêu đề theo đo thật (lớp kb-p-tight), không theo ngưỡng cố định")
pj = read("web/paper.js")
ok("try { furiSet(fb); } finally { fitTop(); }" in pj and "try { dichSet(b); } finally { fitTop(); }" in pj,
   "paper.js: đổi nút furigana / bản dịch → fitTop (cả nhánh return sớm)")
ok('window.addEventListener("resize", fitTop);' in pj and 'window.addEventListener("kb-ui-change", fitTop);' in pj
   and "GardenLang.onChange(fitTop)" in pj, "paper.js: fitTop khi đổi cỡ cửa sổ / nút Ẩn ↔ Hiện vườn đổi chữ / đổi Ngôn ngữ trong vườn")
ok(re.search(r'e\.currentTarget\.textContent = \(p\.classList\.contains\("kb-p-nofuri"\) \? "Hiện " : "Ẩn "\) \+ word;\s*fitTop\(\);', pj),
   "paper.js: bấm Ẩn / Hiện furigana → fitTop")

print("KẾT QUẢ: %d/%d %s" % (sum(RES), len(RES), "ĐẠT" if all(RES) else "CÓ LỖI"))
sys.exit(0 if all(RES) else 1)
