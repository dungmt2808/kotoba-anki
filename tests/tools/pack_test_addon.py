"""pack_test_addon.py — đóng gói add-on phụ "ことば畑 · Công cụ test" (1.23) thành kotoba_batake_test.ankiaddon ở gốc repo.

Kèm hai số báo mẫu (tests/fixtures) cho chế độ Gemini giả. KHÔNG nằm trong gói ことば畑 phát hành (tests/tools/pack.py)."""
import json, os, shutil, sys, tempfile, time, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
src = os.path.join(HERE, "kotoba_batake_test")
out = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake_test.ankiaddon"))
tmp = tempfile.mkdtemp()
dst = os.path.join(tmp, "kotoba_batake_test")
shutil.copytree(src, dst, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "user_files", "meta.json"))
shutil.copy(os.path.join(HERE, "..", "fixtures", "bao_113_n4_lite.json"), os.path.join(dst, "bao_mau.json"))
en = json.load(open(os.path.join(HERE, "..", "fixtures", "bao_119_en_a2.json"), encoding="utf-8"))
en["ngon_ngu"] = "en"
json.dump(en, open(os.path.join(dst, "bao_mau_en.json"), "w", encoding="utf-8"), ensure_ascii=False)
m = json.load(open(os.path.join(dst, "manifest.json"), encoding="utf-8"))
m["mod"] = int(time.time())
json.dump(m, open(os.path.join(dst, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, dirs, files in os.walk(dst):
        for f in sorted(files):
            full = os.path.join(root, f)
            z.write(full, os.path.relpath(full, dst))
shutil.rmtree(tmp, ignore_errors=True)
print("%s: %d mục" % (out, len(zipfile.ZipFile(out).namelist())))
