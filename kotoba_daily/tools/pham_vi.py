#!/usr/bin/env python3
"""Tính "phạm vi đã học" từ lo_trinh.json và các file trong nguon/, ghi ra pham_vi.json.

Chạy:  python3 tools/pham_vi.py          (đứng trong thư mục kotoba_daily)

In ra:
  THIẾU <giáo trình> chương <n>   chương đã học nhưng chưa có file nguon/<id>/<n>.json
                                  (chương trọng tâm in trước; nên trích theo đúng thứ tự in ra)
  LỖI   <file>: <lý do>           file chương sai định dạng
"""
import datetime
import json
import os
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
LEVELS = {"N1": 1, "N2": 2, "N3": 3, "N4": 4, "N5": 5}


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def check_chapter(d, book_id, ch):
    errs = []
    if d.get("giao_trinh") != book_id:
        errs.append('"giao_trinh" phải là "%s"' % book_id)
    if d.get("chuong") != ch:
        errs.append('"chuong" phải là %d' % ch)
    for key in ("tu_vung", "ngu_phap", "kanji"):
        if not isinstance(d.get(key), list):
            errs.append('thiếu danh sách "%s"' % key)
    if errs:
        return errs
    for i, w in enumerate(d["tu_vung"]):
        if not isinstance(w, dict) or not str(w.get("w", "")).strip() or not str(w.get("m", "")).strip():
            errs.append("tu_vung[%d] cần có w và m" % i)
        elif not isinstance(w.get("r", ""), str):
            errs.append("tu_vung[%d].r phải là chuỗi" % i)
    seen = set()
    for i, g in enumerate(d["ngu_phap"]):
        if not isinstance(g, dict) or not all(str(g.get(k, "")).strip() for k in ("id", "mau", "nghia")):
            errs.append("ngu_phap[%d] cần có id, mau, nghia" % i)
            continue
        if g["id"] in seen:
            errs.append("ngu_phap id bị trùng: %s" % g["id"])
        seen.add(g["id"])
    for i, k in enumerate(d["kanji"]):
        if not isinstance(k, dict) or len(str(k.get("k", ""))) != 1:
            errs.append("kanji[%d].k phải là đúng một chữ" % i)
    return errs


def last_history(n=7):
    p = BASE / "lich_su.md"
    if not p.exists():
        return [], 0
    lines = [l.strip() for l in p.read_text(encoding="utf-8").splitlines() if l.strip().startswith("- ")]
    return lines[-n:], len(lines)


def main():
    lt = load(BASE / "lo_trinh.json")
    cfg = lt.get("cai_dat", {})
    n_focus = max(1, int(cfg.get("so_chuong_trong_tam", 3)))

    vocab, grammar, kanji = {}, [], {}
    missing, errors, focus, levels, books, position = [], [], [], [], {}, []
    loaded = []  # (bid, ch, data) theo thứ tự lộ trình
    active = []  # giáo trình đang học dở: (bid, start, upto)
    finished = []

    for b in lt.get("giao_trinh", []):
        bid = b["id"]
        books[bid] = b.get("ten", bid)
        start = int(b.get("chuong_dau", 1))
        end = int(b.get("chuong_cuoi", start))
        upto = min(int(b.get("da_hoc_den", 0)), end)
        if upto < start:
            continue
        levels.append(b.get("trinh_do", ""))
        position.append({"id": bid, "ten": b.get("ten", bid), "den": upto})
        (active if upto < end else finished).append((bid, start, upto))
        for ch in range(start, upto + 1):
            p = BASE / "nguon" / bid / ("%d.json" % ch)
            if not p.exists():
                missing.append({"giao_trinh": bid, "chuong": ch, "thu_muc": b.get("thu_muc", "")})
                continue
            try:
                d = load(p)
            except Exception as e:  # noqa: BLE001
                errors.append("%s: không đọc được JSON (%s)" % (p.relative_to(BASE), e))
                continue
            errs = check_chapter(d, bid, ch)
            if errs:
                errors += ["%s: %s" % (p.relative_to(BASE), e) for e in errs]
                continue
            loaded.append((bid, ch, d))

    # Chương trọng tâm: các chương gần nhất của giáo trình đang học dở
    # (học xong hết thì lấy giáo trình cuối cùng). Chương nào thiếu file thì lấy chương có file gần nhất.
    focus_books = active or finished[-1:]
    focus_keys, focus_wanted = set(), set()
    for bid, start, upto in focus_books:
        focus_wanted.update((bid, c) for c in range(max(start, upto - n_focus + 1), upto + 1))
        have = sorted((c for b2, c, _ in loaded if b2 == bid), reverse=True)[:n_focus]
        focus_keys.update((bid, c) for c in have)
    if not focus_keys and loaded:
        focus_keys.update((b2, c) for b2, c, _ in loaded[-n_focus:])
    missing.sort(key=lambda m: (0 if (m["giao_trinh"], m["chuong"]) in focus_wanted else 1))

    for bid, ch, d in loaded:
        tag = "%s:%d" % (bid, ch)
        in_focus = (bid, ch) in focus_keys
        for w in d["tu_vung"]:
            vocab.setdefault(w["w"], [w["w"], w.get("r", ""), w["m"], tag])
        for g in d["ngu_phap"]:
            item = {"id": "%s:%s" % (bid, g["id"]), "mau": g["mau"], "nghia": g["nghia"], "bai": tag}
            if in_focus and g.get("vi_du"):
                item["vi_du"] = g["vi_du"]
            grammar.append(item)
        for k in d["kanji"]:
            kanji.setdefault(k["k"], tag)
        if in_focus:
            focus.append({
                "bai": tag,
                "chu_de": d.get("chu_de", ""),
                "tu_vung": [w["w"] for w in d["tu_vung"]],
                "ngu_phap": ["%s:%s" % (bid, g["id"]) for g in d["ngu_phap"]],
            })

    level = min(levels, key=lambda x: LEVELS.get(x, 9)) if levels else lt.get("nen_tang", "N5")
    history, n_issues = last_history()

    tien_do = {}
    tp = BASE / "tien_do.json"
    if tp.exists():
        try:
            raw = load(tp)
            tien_do = {k: raw[k] for k in ("sap_quen", "loi_sai", "chua_doc", "cap_nhat")
                       if k in raw and isinstance(raw[k], (list, str))}
        except Exception as e:  # noqa: BLE001
            errors.append("tien_do.json: không đọc được (%s)" % e)

    # Báo tồn chưa đọc → cách viết số hôm nay (cai_dat.khi_ton: rut_gon | dung | van_viet)
    mode = cfg.get("khi_ton", "rut_gon")
    mode = mode if mode in ("rut_gon", "dung", "van_viet") else "rut_gon"
    backlog = len(tien_do.get("chua_doc", []) or [])
    if backlog >= 3 and mode == "dung":
        cach_viet = "dung"
    elif backlog >= 3 and mode == "rut_gon":
        cach_viet = "rut_gon"
    else:
        cach_viet = "day_du"

    # Truyện dài kỳ: kỳ tiếp theo = kỳ lớn nhất đã viết + 1
    last_ky, last_ky_day = 0, ""
    bao_dir = BASE / "bao"
    if bao_dir.is_dir():
        for issue in sorted(bao_dir.glob("*/bao.json")):
            try:
                for art in load(issue).get("bai", []):
                    ky = art.get("ky") if isinstance(art, dict) and art.get("loai") == "truyen" else None
                    if isinstance(ky, int) and ky > last_ky:
                        last_ky, last_ky_day = ky, issue.parent.name
            except Exception:  # noqa: BLE001
                continue
    # Truyện chung với add-on (ことば畑 1.25.8): add-on ghi truyen_chung.json = các kỳ Gemini viết những ngày không có
    # báo của bạn (hoặc báo tiếng Anh / tiếng Việt viết trước trong ngày). Kỳ mới hơn kỳ cuối của bạn → nối tiếp.
    today = os.environ.get("KB_TODAY") or datetime.date.today().isoformat()
    ky_them, ban_goc = [], None
    chung = BASE / "truyen_chung.json"
    if chung.is_file():
        try:
            rows = load(chung).get("ky") or []
        except Exception as e:  # noqa: BLE001
            rows = []
            errors.append("truyen_chung.json: không đọc được (%s)" % e)
        for r in rows:
            if not (isinstance(r, dict) and isinstance(r.get("ky"), int) and isinstance(r.get("ngay"), str)
                    and isinstance(r.get("doan"), list)):
                continue
            if r["ngay"] <= last_ky_day:
                continue
            item = {k: r.get(k) for k in ("ky", "ngay", "tieu_de", "tom_tat", "bo_ngo", "doan", "tin")}
            if r["ngay"] == today:
                ban_goc = item
            elif r["ngay"] < today:
                ky_them.append(item)
        ky_them.sort(key=lambda r: r["ngay"])
    ky_next = max([last_ky] + [r["ky"] for r in ky_them]) + 1
    if ban_goc:
        ky_next = ban_goc["ky"]

    out = {
        "_ghi_chu": "File này do tools/pham_vi.py tạo ra, đừng sửa tay.",
        "trinh_do": level,
        "nen_tang": lt.get("nen_tang", "N5"),
        "sach": books,
        "vi_tri": position,
        "cai_dat": {
            "tu_moi_toi_da": int(cfg.get("tu_moi_toi_da", 3)),
            "tin_that": bool(cfg.get("tin_that", False)),
        },
        "so_bao_tiep_theo": n_issues + 1,
        "trong_tam": focus,
        "ngu_phap": grammar,
        "tu_vung_dang": "[từ, cách đọc, nghĩa, bài]",
        "tu_vung": list(vocab.values()),
        "kanji": "".join(kanji.keys()),
        "tien_do": tien_do,
        "bao_ton": {"so_chua_doc": backlog, "khi_ton": mode, "cach_viet": cach_viet},
        "truyen": {"ky_tiep_theo": ky_next, "ky_cuoi_ngay": last_ky_day,
                   "ky_them": ky_them, "ban_goc_hom_nay": ban_goc},
        "lich_su_gan_day": history,
        "thieu": missing,
    }
    (BASE / "pham_vi.json").write_text(
        json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )

    print("Trình độ: %s | %d từ | %d mẫu câu | %d kanji | số báo tiếp theo: %d" % (
        level, len(vocab), len(grammar), len(kanji), n_issues + 1))
    print("Trọng tâm: %s" % ", ".join(f["bai"] for f in focus) if focus else "Trọng tâm: (chưa có)")
    print("Báo chưa đọc: %d → cách viết hôm nay: %s | truyện kỳ tiếp theo: %d" % (backlog, cach_viet, ky_next))
    for r in ky_them:
        print("TRUYỆN CHUNG: kỳ %d (%s) đã đăng trong add-on — nối tiếp, ghi vào truyen.md" % (r["ky"], r["ngay"]))
    if ban_goc:
        print("TRUYỆN CHUNG: kỳ %d hôm nay đã có trong add-on — kể lại kỳ này bằng tiếng Nhật" % ban_goc["ky"])
    for m in missing:
        print("THIẾU %s chương %d (thư mục: %s)" % (m["giao_trinh"], m["chuong"], m["thu_muc"] or "?"))
    for e in errors:
        print("LỖI   %s" % e)
    if not missing and not errors:
        print("OK")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except BrokenPipeError:
        sys.exit(0)
