"""Test offline 1.23 (phần báo): bảng tra nghĩa theo từng số, Kệ báo gộp hai nguồn (sổ tiến độ theo nguồn).

- 5b: số báo Gemini cũ bấm từ gạch chân không ra nghĩa vì mọi số tra chung một pham_vi.json, bị ghi đè khi số sau
  viết theo phạm vi khác. Nay mỗi số mang `tra_tu` / `tra_mau`; không có nghĩa thì vẫn hiện cách đọc.
- 4: tiến độ đọc của nguồn thứ hai (không phải nguồn mặc định) ở khoá riêng `kotoba_batake_paper_nguon`.

Chạy: python test_123.py THƯ_MỤC_ADD_ON   (không có gói `anki` thì dùng tests/stubs)
"""
import json, os, shutil, sys, tempfile

ADDON = os.path.abspath(sys.argv[1])
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, ADDON)
try:
    import anki.collection  # noqa: F401
except ImportError:
    sys.path.insert(0, os.path.join(HERE, "..", "stubs"))
import paper_core as paper
import ai_core as ai

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


TMP = tempfile.mkdtemp(prefix="kb123_")


def scope_of(rows, gram=None):
    return {"tu_vung": rows, "ngu_phap": gram or [], "sach": {"deck": "Dũng Mori N4"}, "trinh_do": "N4"}


def issue(date, words, mau=None):
    doan = "今日は" + "、".join("{%s|%s|%s}" % (w, r, w) for w, r in words) + "の話です。"
    return {"ngay": date, "so": 1, "bai": [{"loai": "tin_lang", "tieu_de": "[村|むら]のニュース", "doan": [doan]}],
            "cau_hoi": [], "chinh_ta": [], "mau_cau": mau or [], "tu_moi": [], "tom_tat": ""}


print("== 5b: số cũ vẫn tra được nghĩa sau khi pham_vi.json bị ghi đè")
base = os.path.join(TMP, "bao_gemini")
ai.ensure_dir(base)
s1 = scope_of([["日本", "にほん", "Nhật Bản", "deck"], ["中国", "ちゅうごく", "Trung Quốc", "deck"],
               ["韓国", "かんこく", "Hàn Quốc", "deck"]],
              [{"id": "deck:1", "mau": "〜てください", "nghia": "hãy làm …", "bai": "deck"}])
raw = issue("2026-11-01", [("日本", "にほん"), ("中国", "ちゅうごく"), ("韓国", "かんこく")], ["deck:1"])
raw.update(paper.build_lookup(paper.issue_texts(raw), raw["mau_cau"], s1))
ai._write_json(ai.issue_path(base, "2026-11-01"), raw)
ai.write_scope(base, s1)
ok(set(raw["tra_tu"]) == {"日本", "中国", "韓国"}, "build_lookup chỉ ghi từ có trong số (3 từ)")
ok(raw["tra_mau"].get("deck:1", [""])[0] == "〜てください", "mẫu câu của số cũng vào tra_mau")
# số sau viết theo deck khác → pham_vi.json bị ghi đè, không còn 3 từ kia
ai.write_scope(base, scope_of([["交番", "こうばん", "đồn cảnh sát", "deck"]]))
lib = paper.Library(base)
v = paper.issue_view(lib, paper.empty_state(), "2026-11-01")
ok(all(v["tu"][k]["m"] for k in ("日本", "中国", "韓国")), "sau khi pham_vi.json đổi: cả 3 từ vẫn có nghĩa (1.22.8: '(không có nghĩa)')")
ok(v["tu"]["日本"]["r"] == "にほん" and v["tu"]["日本"]["bai"] == "Dũng Mori N4", "cách đọc + nguồn 'Dũng Mori N4' theo tra_sach của số")
ok(v["mau"] and v["mau"][0]["nghia"] == "hãy làm …", "mẫu câu tra theo tra_mau của số")

print("== 5b: số cũ (trước 1.23, không có tra_tu)")
old = issue("2026-11-02", [("交番", "こうばん"), ("落とし物", "おとしもの")])
ai._write_json(ai.issue_path(base, "2026-11-02"), old)
lib = paper.Library(base)
v = paper.issue_view(lib, paper.empty_state(), "2026-11-02")
ok(v["tu"]["交番"]["m"] == "đồn cảnh sát", "từ còn trong pham_vi.json chung vẫn tra được như cũ")
ok(v["tu"]["落とし物"]["m"] == "" and v["tu"]["落とし物"]["r"] == "おとしもの" and v["tu"]["落とし物"].get("thieu"),
   "không có ở đâu: vẫn hiện cách đọc trong dấu {…|よみ|…} + cờ 'thiếu' (không để trống)")
ok(paper.missing_words(lib, "2026-11-02") == ["落とし物"], "missing_words: chỉ 落とし物")
ok(paper.missing_words(lib, "2026-11-01") == [], "số có tra_tu: không thiếu từ nào")
v = paper.issue_view(lib, paper.empty_state(), "2026-11-02", extra={"落とし物": ["落とし物", "おとしもの", "đồ đánh rơi", "deck"]})
ok(v["tu"]["落とし物"]["m"] == "đồ đánh rơi", "extra (tìm trong deck) lấp chỗ thiếu khi hiện")
ok(paper.add_lookup(base, "2026-11-02", {"落とし物": ["落とし物", "おとしもの", "đồ đánh rơi", "deck"]}),
   "add_lookup ghi bổ sung vào bao.json của số đó")
ok(not paper.add_lookup(base, "2026-11-02", {"落とし物": ["落とし物", "おとしもの", "đồ đánh rơi", "deck"]}),
   "ghi lần hai: không ghi lại (một lần)")
lib = paper.Library(base)
ok(paper.missing_words(lib, "2026-11-02") == [], "sau khi bổ sung: không còn từ thiếu")
v = paper.issue_view(lib, paper.empty_state(), "2026-11-02")
ok(v["tu"]["落とし物"]["m"] == "đồ đánh rơi", "mở lại số: nghĩa đã nằm trong chính số đó")
ok(not paper.add_lookup(base, "../x", {"a": ["a", "", "b", ""]}), "ngày sai định dạng: không ghi")

print("== clean_lookup (dữ liệu không tin cậy)")
c = paper.clean_lookup({"tra_tu": {"a": ["a", "r", "m"], "b": "x", "": ["", "", ""], "c": [1, 2, 3],
                                   "d": ["d" * 99, "r" * 99, "m" * 999, "bai"]},
                        "tra_mau": {"g": ["mẫu", "nghĩa"], "h": 5}, "tra_sach": {"deck": "D", "x": 3}})
ok(set(c["tra_tu"]) == {"a", "d"} and len(c["tra_tu"]["d"][2]) == 160, "tra_tu: bỏ mục sai kiểu, cắt độ dài")
ok(c["tra_mau"] == {"g": ["mẫu", "nghĩa", ""]} and c["tra_sach"] == {"deck": "D"}, "tra_mau / tra_sach sạch")
big = {"tra_tu": {str(i): ["w", "r", "m"] for i in range(2000)}}
ok(len(paper.clean_lookup(big)["tra_tu"]) == paper.TRA_MAX, "tối đa %d mục" % paper.TRA_MAX)
ok(paper.clean_issue(issue("2026-11-03", [("本", "ほん")]), "2026-11-03")["tra_tu"] == {}, "số không có tra_tu: bảng rỗng")

print("== báo tiếng Anh cũng mang bảng tra")
en_raw = {"ngay": "2026-11-01", "ngon_ngu": "en", "so": 1,
          "bai": [{"loai": "tin_lang", "tieu_de": "Village", "doan": ["We {walked||walk} to the {station||station}."]}],
          "cau_hoi": [], "chinh_ta": [], "mau_cau": [], "tu_moi": []}
lk = paper.build_lookup(paper.issue_texts(en_raw), [], {"tu_vung": [["walk", "/wɔːk/", "đi bộ", "deck"],
                                                                     ["station", "/ˈsteɪʃn/", "nhà ga", "deck"],
                                                                     ["apple", "", "táo", "deck"]]})
ok(set(lk["tra_tu"]) == {"walk", "station"}, "từ gốc tiếng Anh: walk, station (không có apple)")

print("== 4: sổ tiến độ theo nguồn (Kệ báo gộp)")
st = paper.clean_state({"read": {"2026-11-04": {"q": {"0": 1}, "ct": {}, "coins": 2, "bonus": False}}})
book = paper.clean_book(None)
ok(book["mac_dinh"] == "" and book["read"] == {"claude": {}, "gemini": {}}, "sổ mới rỗng")
book["mac_dinh"] = "claude"
same = paper.source_view(st, book, "claude")
ok(same is st, "nguồn mặc định (claude) dùng thẳng trạng thái cũ (bản 1.22 đọc được)")
gv = paper.source_view(st, book, "gemini")
ok(gv is not st and gv["read"] == {} and gv["queue"] is st["queue"] and gv["miss"] is st["miss"],
   "nguồn kia: ô đọc riêng, hàng chờ chép sai / từ chép sai dùng chung")
paper.mark_read(gv, "2026-11-04")
gv["read"]["2026-11-04"]["coins"] = 7
ok(book["read"]["gemini"]["2026-11-04"]["coins"] == 7 and st["read"]["2026-11-04"]["coins"] == 2,
   "số Gemini và số Claude Code cùng ngày 04/11: tiến độ / xu tách riêng")
again = paper.clean_book(json.loads(json.dumps(book)))
ok(again["mac_dinh"] == "claude" and again["read"]["gemini"]["2026-11-04"]["coins"] == 7, "lưu → đọc lại giữ nguyên")
ok(paper.clean_book({"mac_dinh": "x", "read": {"gemini": {"bad": {}}, "lạ": {}}})
   == {"mac_dinh": "", "read": {"claude": {}, "gemini": {}}}, "sổ sai kiểu: về rỗng, bỏ khoá lạ")
ok(paper.source_view(st, None, "gemini") is st and paper.source_view(st, paper.clean_book(None), "gemini") is st,
   "chưa có sổ / chưa có nguồn mặc định: như cũ")

# bản 1.22 đọc khoá cũ: chỉ thấy phần của nguồn mặc định, không lỗi với số có tra_tu
print("== tương thích bản cũ")
ok(paper.clean_state(json.loads(json.dumps(st)))["read"].keys() == {"2026-11-04"}, "khoá cũ không có dữ liệu lạ")
full = issue("2026-11-05", [("日本", "にほん")])
full["tra_tu"] = {"日本": ["日本", "にほん", "Nhật Bản", "deck"]}
ok(paper.clean_issue(full, "2026-11-05")["bai"], "bao.json có thêm tra_tu vẫn đọc bình thường")

shutil.rmtree(TMP, ignore_errors=True)
print("\nKẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL)))
sys.exit(1 if FAIL else 0)
