"""pack.py [THƯ_MỤC_ADD_ON] [GÓI_RA] — đóng gói .ankiaddon (tăng "mod" trong manifest.json).

Từ 1.23 mã nguồn nằm ở kotoba_batake/ (gốc repo): không đưa THƯ_MỤC thì đóng gói thư mục đó.

Bỏ .git, __pycache__, *.pyc và mọi thứ trong user_files/ trừ README.txt (để Anki giữ dữ liệu người dùng khi cập nhật)."""
import json, os, sys, time, zipfile

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
src = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake"))
out = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(ROOT, "kotoba_batake.ankiaddon"))
mpath = os.path.join(src, "manifest.json")
m = json.load(open(mpath, encoding="utf-8"))
m["mod"] = int(time.time())
open(mpath, "w", encoding="utf-8").write(json.dumps(m, ensure_ascii=False, indent=2))
skip = {".git", "__pycache__"}
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(src):
        dirs[:] = sorted(d for d in dirs if d not in skip)
        rel = os.path.relpath(root, src)
        if rel != ".":
            z.write(root, rel + "/")
        for f in sorted(files):
            r = os.path.normpath(os.path.join(rel, f))
            if f.endswith(".pyc") or f == "meta.json" or (r.startswith("user_files" + os.sep) and f != "README.txt"):
                continue
            z.write(os.path.join(root, f), r)
print("%s: bản %s, %d mục, %d byte" % (out, m.get("human_version"), len(zipfile.ZipFile(out).namelist()), os.path.getsize(out)))
