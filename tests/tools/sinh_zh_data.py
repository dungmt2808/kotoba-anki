"""Sinh kotoba_batake/zh_data.py (danh sách âm tiết pinyin hợp lệ, không thanh) từ từ điển của pypinyin — KHÔNG gõ tay.

1.32.2 (pinyin trên từng chữ): zh_core tách pinyin viết liền ("xuesheng") theo danh sách này. Chạy bằng python có
pypinyin (venv riêng, như soát chữ 1.32):  python tests/tools/sinh_zh_data.py kotoba_batake/zh_data.py
Test `core/test_1322.py` so file sinh ra với bảng đóng băng nên không cần pypinyin để chạy test."""
import sys
import unicodedata

from pypinyin.pinyin_dict import pinyin_dict


def toneless(s: str) -> str:
    d = unicodedata.normalize("NFD", s.lower())
    d = d.replace("ü", "v")
    return "".join(ch for ch in d if "a" <= ch <= "z")


def main(out: str) -> None:
    syl = set()
    for v in pinyin_dict.values():
        for p in v.split(","):
            t = toneless(p)
            # bỏ thán từ không có nguyên âm (m, n, ng, hm, hng…) — chữ thường gặp không dùng
            if t and any(c in "aeiouv" for c in t):
                syl.add(t)
    rows = sorted(syl)
    with open(out, "w", encoding="utf-8") as f:
        f.write('"""Âm tiết pinyin hợp lệ (không thanh, ü viết v) — sinh bằng tests/tools/sinh_zh_data.py từ pypinyin, đừng sửa tay."""\n')
        f.write("SYLLABLES = frozenset(\"\"\"\n")
        line = ""
        for s in rows:
            if len(line) + len(s) + 1 > 110:
                f.write(line.rstrip() + "\n")
                line = ""
            line += s + " "
        f.write(line.rstrip() + "\n\"\"\".split())\n")
    print(len(rows), "âm tiết →", out)


if __name__ == "__main__":
    main(sys.argv[1])
