#!/usr/bin/env python3
"""Kiểm tra một số báo trước khi dùng.

Chạy:  python3 tools/kiemtra.py bao/2026-11-02/bao.json

In "OK" và thoát mã 0 nếu không có lỗi. Có lỗi thì in từng dòng "LỖI ..." và thoát mã 1.
Dòng "CẢNH BÁO ..." không chặn, nhưng nên xem.
"""
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kb_markup as M  # noqa: E402

BASE = Path(__file__).resolve().parent.parent
LOAI = {"tin_lang", "truyen", "thong_bao", "cot", "tin_that"}
LENGTH = {"N5": (150, 400), "N4": (280, 700), "N3": (450, 1000), "N2": (650, 1400), "N1": (650, 1600)}


class Report:
    def __init__(self):
        self.errors, self.warnings = [], []

    def err(self, where, msg):
        self.errors.append("%s: %s" % (where, msg))

    def warn(self, where, msg):
        self.warnings.append("%s: %s" % (where, msg))


def is_str(x):
    return isinstance(x, str) and x.strip() != ""


def check_text(rep, where, text, scope, new_words, used):
    if not is_str(text):
        rep.err(where, "phải là chuỗi không rỗng")
        return
    errs, warns = M.problems(text)
    for e in errs:
        rep.err(where, e)
    for w in warns:
        rep.warn(where, w)
    for k in M.keys(text):
        nk = M.norm_key(k)
        used.add(nk)
        if nk not in scope and nk not in new_words:
            rep.err(where, '"%s" không có trong phạm vi đã học; thêm vào tu_moi hoặc đổi thành [..|..]' % k)


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    path = Path(argv[1])
    if not path.is_absolute() and not path.exists():
        path = BASE / argv[1]
    rep = Report()
    try:
        bao = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print("LỖI không đọc được %s: %s" % (path, e))
        return 1
    try:
        pv = json.loads((BASE / "pham_vi.json").read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        print("LỖI chưa có pham_vi.json, chạy tools/pham_vi.py trước (%s)" % e)
        return 1

    scope = {M.norm_key(v[0]) for v in pv.get("tu_vung", [])}
    grammar_ids = {g["id"] for g in pv.get("ngu_phap", [])}
    max_new = int(pv.get("cai_dat", {}).get("tu_moi_toi_da", 3))
    used = set()

    if not isinstance(bao, dict):
        print("LỖI bao.json phải là một object")
        return 1

    ngay = bao.get("ngay", "")
    if not (isinstance(ngay, str) and re.match(r"^\d{4}-\d{2}-\d{2}$", ngay)):
        rep.err("ngay", "phải có dạng YYYY-MM-DD")
    elif path.parent.name not in (ngay, "vi_du"):
        rep.warn("ngay", "khác tên thư mục %s" % path.parent.name)
    if not isinstance(bao.get("so"), int) or bao["so"] < 1:
        rep.err("so", "phải là số nguyên ≥ 1")

    new_words = {}
    tm = bao.get("tu_moi", [])
    if not isinstance(tm, list):
        rep.err("tu_moi", "phải là danh sách")
        tm = []
    if len(tm) > max_new:
        rep.err("tu_moi", "có %d từ mới, tối đa %d" % (len(tm), max_new))
    for i, w in enumerate(tm):
        where = "tu_moi[%d]" % i
        if not isinstance(w, dict) or not is_str(w.get("w")) or not is_str(w.get("m")):
            rep.err(where, "cần có w và m")
            continue
        r = w.get("r", "")
        if M.KANJI_RE.search(w["w"]) and not is_str(r):
            rep.err(where, "cần cách đọc r")
        if r and not M.KANA_ONLY_RE.match(r):
            rep.err(where, "r phải là kana")
        nk = M.norm_key(w["w"])
        if nk in scope:
            rep.warn(where, '"%s" đã có trong phạm vi, không phải từ mới' % w["w"])
        new_words[nk] = w

    short = bao.get("rut_gon") is True
    if "rut_gon" in bao and not isinstance(bao.get("rut_gon"), bool):
        rep.err("rut_gon", "phải là true hoặc false")
    cach_viet = pv.get("bao_ton", {}).get("cach_viet", "day_du")
    if cach_viet == "rut_gon" and not short:
        rep.warn("rut_gon", "đang tồn nhiều báo chưa đọc, số hôm nay nên là số rút gọn")
    bai = bao.get("bai")
    total_len = 0
    lo_n, hi_n = (1, 2) if short else (2, 5)
    if not isinstance(bai, list) or not lo_n <= len(bai) <= hi_n:
        rep.err("bai", "cần %d–%d bài" % (lo_n, hi_n))
        bai = bai if isinstance(bai, list) else []
    for i, b in enumerate(bai):
        where = "bai[%d]" % i
        if not isinstance(b, dict):
            rep.err(where, "phải là object")
            continue
        if b.get("loai") not in LOAI:
            rep.err(where + ".loai", "phải là một trong %s" % ", ".join(sorted(LOAI)))
        if b.get("loai") == "tin_that" and not str(b.get("nguon", "")).startswith("http"):
            rep.err(where + ".nguon", "tin thật cần link nguồn")
        if b.get("loai") == "truyen":
            if short:
                rep.err(where, "số rút gọn không viết tiếp truyện")
            ky = b.get("ky")
            if not isinstance(ky, int) or isinstance(ky, bool) or ky < 1:
                rep.err(where + ".ky", "truyện cần số kỳ (số nguyên ≥ 1)")
            else:
                want = pv.get("truyen", {}).get("ky_tiep_theo")
                if isinstance(want, int) and ky != want and path.parent.name != "vi_du":
                    rep.warn(where + ".ky", "kỳ tiếp theo nên là %d" % want)
                if ky > 1 and not is_str(b.get("ky_truoc")):
                    rep.err(where + ".ky_truoc", "cần một câu tiếng Việt tóm tắt kỳ trước")
        check_text(rep, where + ".tieu_de", b.get("tieu_de"), scope, new_words, used)
        doan = b.get("doan")
        if not isinstance(doan, list) or not doan:
            rep.err(where + ".doan", "cần ít nhất một đoạn")
            continue
        for j, p in enumerate(doan):
            check_text(rep, "%s.doan[%d]" % (where, j), p, scope, new_words, used)
            if is_str(p):
                total_len += len(M.surface(p))

    lo, hi = LENGTH.get(pv.get("trinh_do", "N4"), (280, 700))
    if short:
        lo, hi = lo // 3, hi // 2
    if total_len and not lo <= total_len <= hi:
        rep.warn("bai", "tổng %d ký tự, nên trong khoảng %d–%d cho %s" % (total_len, lo, hi, pv.get("trinh_do")))

    qs = bao.get("cau_hoi")
    if not isinstance(qs, list) or not (0 if short else 1) <= len(qs) <= 4:
        rep.err("cau_hoi", "cần %d–4 câu hỏi" % (0 if short else 1))
        qs = qs if isinstance(qs, list) else []
    for i, q in enumerate(qs):
        where = "cau_hoi[%d]" % i
        if not isinstance(q, dict):
            rep.err(where, "phải là object")
            continue
        check_text(rep, where + ".hoi", q.get("hoi"), scope, new_words, used)
        chon = q.get("chon")
        if not isinstance(chon, list) or not 2 <= len(chon) <= 4:
            rep.err(where + ".chon", "cần 2–4 lựa chọn")
            continue
        for j, o in enumerate(chon):
            check_text(rep, "%s.chon[%d]" % (where, j), o, scope, new_words, used)
        if not isinstance(q.get("dung"), int) or not 0 <= q["dung"] < len(chon):
            rep.err(where + ".dung", "phải là vị trí (từ 0) của đáp án đúng")
        if not is_str(q.get("giai_thich")):
            rep.err(where + ".giai_thich", "cần giải thích ngắn bằng tiếng Việt")

    ct = bao.get("chinh_ta")
    if not isinstance(ct, list) or not 1 <= len(ct) <= 4:
        rep.err("chinh_ta", "cần 1–4 câu")
        ct = ct if isinstance(ct, list) else []
    all_text = "".join(M.surface(p) for b in bai if isinstance(b, dict) for p in b.get("doan", []) if is_str(p))
    for i, c in enumerate(ct):
        where = "chinh_ta[%d]" % i
        if not isinstance(c, dict):
            rep.err(where, "phải là object")
            continue
        check_text(rep, where + ".cau", c.get("cau"), scope, new_words, used)
        if is_str(c.get("cau")):
            s = M.surface(c["cau"])
            if not 6 <= len(M.norm_answer(s)) <= 40:
                rep.warn(where, "câu chép chính tả nên dài 6–40 ký tự")
            if M.norm_answer(s) not in M.norm_answer(all_text):
                rep.warn(where, "câu này không có nguyên văn trong bài")
        extra = c.get("them_dap_an", [])
        if not isinstance(extra, list) or not all(is_str(x) for x in extra):
            rep.err(where + ".them_dap_an", "phải là danh sách chuỗi")

    mc = bao.get("mau_cau")
    if not isinstance(mc, list) or not mc:
        rep.err("mau_cau", "cần danh sách id mẫu câu trọng tâm (lấy từ pham_vi.json)")
    else:
        for g in mc:
            if g not in grammar_ids:
                rep.err("mau_cau", 'id "%s" không có trong pham_vi.json' % g)

    for nk, w in new_words.items():
        if nk not in used:
            rep.err("tu_moi", '"%s" khai báo là từ mới nhưng không được đánh dấu {..|..|%s} trong bài' % (w["w"], w["w"]))

    if not is_str(bao.get("tom_tat")):
        rep.err("tom_tat", "cần 1–2 câu tóm tắt tiếng Việt")

    for w in rep.warnings:
        print("CẢNH BÁO %s" % w)
    for e in rep.errors:
        print("LỖI %s" % e)
    if rep.errors:
        print("Có %d lỗi." % len(rep.errors))
        return 1
    print("OK (%d ký tự, %d từ đánh dấu)" % (total_len, len(used)))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
