"""Sinh kotoba_batake/zh_data.py (danh sách âm tiết pinyin hợp lệ, không thanh + 1.33: cách đọc của từng chữ Hán thường
dùng) từ từ điển của pypinyin — KHÔNG gõ tay.

1.32.2 (pinyin trên từng chữ): zh_core tách pinyin viết liền ("xuesheng") theo danh sách này.
1.33 (báo tiếng Trung): READINGS = cách đọc (âm tiết không thanh + số thanh) của mọi chữ Hán trong bộ mã GB2312 hoặc Big5
(chữ giản thể / phồn thể thường dùng) — máy soát pinyin Gemini ghi cho từng chữ của báo. Chạy bằng python có
pypinyin (venv riêng, như soát chữ 1.32):  python tests/tools/sinh_zh_data.py kotoba_batake/zh_data.py
Test `core/test_1322.py` so file sinh ra với bảng đóng băng nên không cần pypinyin để chạy test."""
import sys
import unicodedata

from pypinyin.pinyin_dict import pinyin_dict


def toneless(s: str) -> str:
    d = unicodedata.normalize("NFD", s.lower())
    d = d.replace("ü", "v")
    return "".join(ch for ch in d if "a" <= ch <= "z")


def _enc(ch: str, enc: str) -> bool:
    try:
        ch.encode(enc)
        return True
    except UnicodeEncodeError:
        return False


def tone_of(p: str) -> int:
    marks = {"\u0304": 1, "\u0301": 2, "\u030c": 3, "\u0300": 4}
    for ch in unicodedata.normalize("NFD", p):
        if ch in marks:
            return marks[ch]
    return 5


def main(out: str) -> None:
    syl = set()
    for v in pinyin_dict.values():
        for p in v.split(","):
            t = toneless(p)
            # bỏ thán từ không có nguyên âm (m, n, ng, hm, hng…) — chữ thường gặp không dùng
            if t and any(c in "aeiouv" for c in t):
                syl.add(t)
    rows = sorted(syl)
    groups: dict[str, list[str]] = {}
    for cp, v in pinyin_dict.items():
        ch = chr(cp)
        if not (0x4E00 <= cp <= 0x9FFF):
            continue
        if not any(_enc(ch, e) for e in ("gb2312", "big5")):
            continue
        rd = []
        for p in v.split(","):
            t = toneless(p)
            if t and t in syl:
                rd.append(t + str(tone_of(p)))
        if rd:
            groups.setdefault(" ".join(sorted(set(rd))), []).append(ch)
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
        f.write("\n# 1.33: cách đọc → các chữ Hán (GB2312 / Big5), mỗi dòng \"âm1 âm2…\\tchữ…\"; thanh 5 = thanh nhẹ\n")
        f.write("READINGS_RAW = \"\"\"\n")
        for k in sorted(groups):
            f.write(k + "\t" + "".join(sorted(groups[k])) + "\n")
        f.write("\"\"\"\n")
    print(len(rows), "âm tiết,", sum(len(v) for v in groups.values()), "chữ →", out)


if __name__ == "__main__":
    main(sys.argv[1])
