"""Test bộ kotoba_daily 2.3 (Claude Code viết báo): bản dịch tiếng Việt từng đoạn (`dich`).

- kiemtra.py: số mới thiếu / sai bản dịch → LỖI (đúng luật add-on 1.23 dùng để hiện nút Dịch); `--chi-dich` cho số cũ.
- render.py: bao.html mang bản dịch, có nút "Hiện bản dịch".
- add-on: paper_core.clean_issue giữ nguyên bản dịch của số mẫu (khuôn của bộ khớp luật của add-on).

Chạy: python test_kit.py THƯ_MỤC_ADD_ON   (bộ kotoba_daily lấy ở gốc repo)
"""
import json, os, shutil, subprocess, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
KIT = os.path.abspath(os.path.join(HERE, "..", "..", "kotoba_daily"))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import paper_core as paper

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


TMP = tempfile.mkdtemp(prefix="kbkit_")
K = os.path.join(TMP, "kotoba_daily")
shutil.copytree(KIT, K, ignore=shutil.ignore_patterns("audio", "__pycache__"))


def kiem(rel, *flags):
    r = subprocess.run([sys.executable, os.path.join(K, "tools", "kiemtra.py"), *flags, rel], cwd=K,
                       capture_output=True, text=True)
    return r.returncode, r.stdout


def issue(mut):
    d = json.load(open(os.path.join(K, "vi_du", "bao_mau.json"), encoding="utf-8"))
    mut(d)
    os.makedirs(os.path.join(K, "bao", "2026-11-02"), exist_ok=True)
    json.dump(d, open(os.path.join(K, "bao", "2026-11-02", "bao.json"), "w", encoding="utf-8"), ensure_ascii=False)
    return kiem("bao/2026-11-02/bao.json")


print("== kiemtra.py: bản dịch")
rc, out = kiem("vi_du/bao_mau.json")
ok(rc == 0 and out.strip().startswith("OK"), "số mẫu (có bản dịch mọi bài) → OK")
rc, out = issue(lambda d: d["bai"][1].pop("dich"))
ok(rc == 1 and "bai[1].dich: cần bản dịch" in out, "bài thiếu dich → LỖI")
rc, out = issue(lambda d: d["bai"][0]["dich"].pop())
ok(rc == 1 and "cần đúng 3 bản dịch" in out, "thiếu một đoạn dịch (lệch số đoạn) → LỖI")
rc, out = issue(lambda d: d["bai"][1]["dich"].__setitem__(0, "Lin đến làm ở ことば屋, はなさん chào cô."))
ok(rc == 1 and "có chữ Nhật" in out and "Stack-chan" in out, "tên riêng để chữ Nhật trong bản dịch → LỖI, nhắc viết Latin")
rc, out = issue(lambda d: d["bai"][1]["dich"].__setitem__(0, "Lin lỡ nói \"omachi shite shimaimashita\" (lỡ chờ mất rồi)."))
ok(rc == 0, "câu tiếng Nhật giữ bằng romaji trong ngoặc kép → được")
rc, out = issue(lambda d: d["bai"][3].__setitem__("dich", ["Today I am a bit sleepy."]))
ok(rc == 1 and "tiếng Việt có dấu" in out, "bản dịch không phải tiếng Việt → LỖI")
rc, out = issue(lambda d: d["bai"][1]["dich"].__setitem__(1, "Lin chào [khách|きゃく]."))
ok(rc == 1 and "không dùng [ ] { } |" in out, "dấu đánh dấu furigana trong bản dịch → LỖI")
rc, out = issue(lambda d: d["bai"][1]["dich"].__setitem__(1, "Khách đến."))
ok(rc == 0 and "CẢNH BÁO bai[1].dich[1]" in out and "đừng tóm tắt" in out, "bản dịch ngắn hơn nhiều đoạn gốc → CẢNH BÁO")
rc, out = issue(lambda d: d["bai"][1]["dich"].__setitem__(1, d["bai"][1]["dich"][1] + " (お持ちします dùng khiêm nhường ngữ)"))
ok(rc == 1, "ghi chú ngữ pháp có chữ Nhật trong ngoặc → LỖI")

print("== kiemtra.py --chi-dich (thêm bản dịch cho số cũ)")
old = os.path.join(K, "bao", "2026-11-01", "bao.json")
rc, out = kiem("bao/2026-11-01/bao.json", "--chi-dich")
ok(rc == 1 and out.count("LỖI") == 4 and "không có trong phạm vi" not in out, "số cũ chưa có dich → chỉ báo lỗi bản dịch (4 bài)")
d = json.load(open(old, encoding="utf-8"))
for b in d["bai"]:
    b["dich"] = ["Bản dịch tiếng Việt của đoạn %d, đủ dài để không bị coi là tóm tắt quá ngắn so với đoạn gốc." % (j + 1)
                 for j in range(len(b["doan"]))]
json.dump(d, open(old, "w", encoding="utf-8"), ensure_ascii=False)
rc, out = kiem("bao/2026-11-01/bao.json", "--chi-dich")
ok(rc == 0 and "OK (bản dịch 4 bài)" in out, "đã thêm dich → --chi-dich OK")

print("== render.py: bao.html")
r = subprocess.run([sys.executable, os.path.join(K, "tools", "render.py"), "vi_du/bao_mau.json"], cwd=K, capture_output=True, text=True)
html = open(os.path.join(K, "vi_du", "bao_mau.html"), encoding="utf-8").read() if r.returncode == 0 else ""
ok(r.returncode == 0 and "Hiện bản dịch" in html and "Trưởng làng kể" in html and 'class="vi"' not in html
   and "\"dich\"" in html, "bao.html mang bản dịch (dựng bằng JS khi mở), có nút Hiện bản dịch")

print("== add-on: số của bộ 2.3 hiện được bản dịch")
raw = json.load(open(os.path.join(KIT, "vi_du", "bao_mau.json"), encoding="utf-8"))
iss = paper.clean_issue(raw, raw["ngay"])
ok(all(b["dich"] and len(b["dich"]) == len(b["doan"]) for b in iss["bai"]),
   "paper_core.clean_issue giữ bản dịch mọi bài của số mẫu (đúng luật add-on 1.23)")

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
