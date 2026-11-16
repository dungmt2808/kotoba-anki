"""1.32: tạo bảng đối chiếu pinyin cho mọi câu tiếng Trung của kotoba_batake/lang_core.py bằng từ điển pinyin độc lập
(pypinyin) + bảng phồn → giản (OpenCC). core/test_132.py so pinyin trong lang_core với bảng này.

Không cần chạy khi chạy test. Chỉ chạy lại khi thêm / sửa câu tiếng Trung (test báo "chưa có trong bảng đối chiếu"):
  python3 -m venv /tmp/soat && /tmp/soat/bin/pip install pypinyin opencc-python-reimplemented
  /tmp/soat/bin/python tests/tools/soat_chu_132.py          # ghi tests/fixtures/chu_132_ref.json
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "kotoba_batake"))
import lang_core  # noqa: E402
import opencc  # noqa: E402
import pypinyin  # noqa: E402
from pypinyin import Style, pinyin  # noqa: E402


def zh_texts() -> list[str]:
    out = []
    for name in ("ACTS", "FINDS", "GUESTS", "DECOR", "SEASONS", "TITLES", "SAY"):
        for row in getattr(lang_core, name).values():
            if row[1] and row[1] not in out:
                out.append(row[1])
    for g in lang_core.GAMES.values():
        if g.get("zh") and g["zh"] not in out:
            out.append(g["zh"])
    return out


def main() -> None:
    t2s = opencc.OpenCC("t2s")
    items = {}
    for t in zh_texts():
        py = [x[0] for x in pinyin(t, style=Style.TONE3, heteronym=False, errors="ignore")]
        items[t] = {"py": py, "t2s": t2s.convert(t)}
    out = {"cong_cu": "pypinyin %s + OpenCC t2s" % pypinyin.__version__, "items": items}
    path = os.path.join(ROOT, "tests", "fixtures", "chu_132_ref.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0, sort_keys=True)
    print("ghi", path, len(items), "câu")


if __name__ == "__main__":
    main()
