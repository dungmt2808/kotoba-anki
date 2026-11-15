"""In nội dung một số báo (mặt chữ), câu hỏi, câu chép, số chỗ tra từ; đọc lại bằng paper_core như add-on.

Chạy: python show_issue.py ADDON THƯ_MỤC_BAO_GEMINI NGÀY
"""
import sys, os, json
ADDON, BASE, DATE = sys.argv[1:4]
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import _setup; ai = _setup.load(ADDON)
import paper_core as paper
lib = paper.Library(BASE)
st = paper.empty_state()
try:
    v = paper.issue_view(lib, st, DATE)
    print("ISSUE_VIEW OK: keys=", sorted(v.keys()))
    print("  credit:", v.get("credit"), "| may_viet:", v.get("may_viet"))
    au = [(a.get("loai"), [bool(x) for x in (a.get("audio") or [])]) for a in v.get("bai", [])]
    print("  bai audio flags:", au)
    print("  dictation:", [(c.get("id"), c.get("audio"), c.get("slow")) for c in v.get("chinh_ta", [])])
except Exception as e:
    import traceback; traceback.print_exc()
raw = json.load(open(os.path.join(BASE, "bao", DATE, "bao.json")))
print("\n=== NỘI DUNG (mặt chữ) ===")
for b in raw["bai"]:
    print("\n[%s] %s%s" % (b["loai"], paper.surface(b["tieu_de"]), (" (kỳ %s)" % b.get("ky")) if b.get("ky") else ""))
    if b.get("ky_truoc"): print("  kỳ trước:", b["ky_truoc"])
    for p in b["doan"]: print("  " + paper.surface(p))
print("\n--- câu hỏi")
for q in raw["cau_hoi"]:
    print(" Q:", paper.surface(q["hoi"]), "| chọn:", [paper.surface(o) for o in q["chon"]], "| đúng:", q["dung"], "|", q["giai_thich"])
print("--- chép chính tả")
for c in raw["chinh_ta"]: print(" ", paper.surface(c["cau"]), c.get("them_dap_an"))
print("--- mau_cau", raw["mau_cau"], "| tu_moi", raw["tu_moi"])
print("--- tom_tat", raw["tom_tat"])
tot = sum(len(paper.surface(p)) for b in raw["bai"] for p in b["doan"])
print("--- tổng ký tự:", tot)
print("--- chỗ bấm tra từ:", ai._link_count(raw))
