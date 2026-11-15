#!/usr/bin/env python3
"""Dựng trang đọc báo bao.html từ bao.json (trang tự chứa, mở bằng trình duyệt).

Chạy:  python3 tools/render.py bao/2026-11-02/bao.json
Ra:    bao/2026-11-02/bao.html (cùng tên, đuôi .html)

Nếu thư mục số báo có audio/am_thanh.json (do doc_voicevox.py tạo) thì trang có nút nghe.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kb_markup as M  # noqa: E402

BASE = Path(__file__).resolve().parent.parent
TEMPLATE = Path(__file__).resolve().parent / "mau_bao.html"
PLACEHOLDER = "/*__DATA__*/null"


def all_texts(bao):
    for b in bao.get("bai", []):
        yield b.get("tieu_de", "")
        yield from b.get("doan", [])
    for q in bao.get("cau_hoi", []):
        yield q.get("hoi", "")
        yield from q.get("chon", [])
    for c in bao.get("chinh_ta", []):
        yield c.get("cau", "")


def lesson_label(tag, books):
    if ":" not in tag:
        return tag
    bid, ch = tag.split(":", 1)
    return "%s, bài %s" % (books.get(bid, bid), ch)


def main(argv):
    if len(argv) != 2:
        print(__doc__)
        return 2
    path = Path(argv[1])
    if not path.exists():
        path = BASE / argv[1]
    bao = json.loads(path.read_text(encoding="utf-8"))
    pv = json.loads((BASE / "pham_vi.json").read_text(encoding="utf-8"))
    books = pv.get("sach", {})

    vocab = {}
    for w, r, m, tag in pv.get("tu_vung", []):
        vocab.setdefault(M.norm_key(w), {"w": w, "r": r, "m": m, "bai": lesson_label(tag, books)})
    new = {M.norm_key(w["w"]): w for w in bao.get("tu_moi", []) if isinstance(w, dict) and w.get("w")}
    forgetting = {M.norm_key(x) for x in pv.get("tien_do", {}).get("sap_quen", []) if isinstance(x, str)}

    tu = {}
    for text in all_texts(bao):
        for key in M.keys(text or ""):
            nk = M.norm_key(key)
            if nk in new:
                w = new[nk]
                tu[key] = {"w": w["w"], "r": w.get("r", ""), "m": w.get("m", ""), "moi": True}
            elif nk in vocab:
                tu[key] = dict(vocab[nk])
            else:
                tu[key] = {"w": key, "r": "", "m": "(chưa có nghĩa)"}
            if nk in forgetting:
                tu[key]["quen"] = True

    grammar = {g["id"]: g for g in pv.get("ngu_phap", [])}
    mau = []
    for gid in bao.get("mau_cau", []):
        g = grammar.get(gid)
        if g:
            mau.append({"mau": g["mau"], "nghia": g["nghia"], "bai": lesson_label(g.get("bai", ""), books)})

    audio = None
    ap = path.parent / "audio" / "am_thanh.json"
    if ap.exists():
        try:
            audio = json.loads(ap.read_text(encoding="utf-8"))
        except Exception as e:  # noqa: BLE001
            print("CẢNH BÁO không đọc được %s (%s), trang sẽ không có audio" % (ap, e))

    data = {
        "bao": bao,
        "tu": tu,
        "mau": mau,
        "trinh_do": pv.get("trinh_do", ""),
        "vi_tri": pv.get("vi_tri", []),
        "audio": audio,
    }
    payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")
    html = TEMPLATE.read_text(encoding="utf-8")
    if PLACEHOLDER not in html:
        print("LỖI khuôn mau_bao.html thiếu chỗ chèn dữ liệu")
        return 1
    out = path.with_suffix(".html")
    out.write_text(html.replace(PLACEHOLDER, payload, 1), encoding="utf-8")
    print("Đã tạo %s" % out)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
