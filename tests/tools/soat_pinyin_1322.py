"""1.32.2: bảng đối chiếu cho pinyin trên từng chữ (zh_core) bằng từ điển pinyin độc lập (pypinyin) — đóng băng vào
tests/fixtures/pinyin_1322_ref.json để core/test_1322.py chạy không cần mạng / pypinyin.

Chạy lại khi đổi zh_core / zh_data (venv riêng, không cài vào python hệ thống):
  uv venv /tmp/soat && uv pip install --python /tmp/soat/bin/python pypinyin
  /tmp/soat/bin/python tests/tools/soat_pinyin_1322.py
Mỗi mục: từ (2–4 chữ Hán, lấy đều trong từ điển cụm từ của pypinyin), pinyin ghi số (thanh nhẹ = 5), pinyin có dấu từng
âm tiết, và cách viết liền đúng chính tả (dấu nháy trước âm tiết bắt đầu bằng a / e / o)."""
import json
import os
import sys

from pypinyin import Style, pinyin
from pypinyin.phrases_dict import phrases_dict
import pypinyin

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(ROOT, "kotoba_batake"))
import zh_data  # noqa: E402

N = 2000


def han(w: str) -> bool:
    return all(0x4E00 <= ord(c) <= 0x9FFF for c in w)


def main() -> None:
    words = sorted(w for w in phrases_dict if 2 <= len(w) <= 4 and han(w))
    step = max(1, len(words) // N)
    items = []
    for w in words[::step][:N]:
        num = [x[0] for x in pinyin(w, style=Style.TONE3, neutral_tone_with_five=True)]
        mark = [x[0] for x in pinyin(w, style=Style.TONE)]
        if len(num) != len(w) or len(mark) != len(w) or any(not x.isascii() for x in num):
            continue
        joined = mark[0] + "".join(("'" if m[:1] in "aeoāáǎàēéěèōóǒò" else "") + m for m in mark[1:])
        items.append({"w": w, "num": " ".join(num), "mark": mark, "joined": joined})
    out = {"cong_cu": "pypinyin %s" % pypinyin.__version__, "syllables": sorted(zh_data.SYLLABLES), "items": items}
    path = os.path.join(ROOT, "tests", "fixtures", "pinyin_1322_ref.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=0)
    print(len(items), "từ →", path)


if __name__ == "__main__":
    main()
