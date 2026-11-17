"""Thêm deck "Lớn::300 từ" vào collection mẫu (demo_col.py) — vườn nhiều cây như người học lâu, cho ảnh phác "vườn đỡ rối
mắt" (17/11). Cây đủ 5 giai đoạn, phần lớn đã ra hoa / ra quả, ~25 cây cần tưới hôm nay, xếp theo thứ tự tạo xen kẽ như thật.
Chạy: python demo_nhieu_cay.py BASE/Test/collection.anki2   (python của venv có anki, sau demo_col.py)
"""
import random, sys
from anki.collection import Collection

KANJI = list("日月火水木金土山川田人口目耳手足花草竹石雨雪風空海森林村町市国語学校先生年時分前後午上下中外右左大小高安新古長多少早明暗白黒赤青春夏秋冬朝昼夜晩")


def main(path):
    col = Collection(path)
    mm = col.models
    m = mm.new("Từ vựng (300)")
    for f in ("Từ", "Cách đọc", "Nghĩa"):
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("T1"); t["qfmt"] = "{{Từ}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Nghĩa}}"
    mm.add_template(m, t); mm.add(m); m = mm.by_name("Từ vựng (300)")
    did = col.decks.id("Lớn::300 từ")
    rnd = random.Random(300)
    for i in range(300):
        n = col.new_note(m)
        n["Từ"] = KANJI[i % len(KANJI)] + KANJI[(i * 7 + 3) % len(KANJI)]
        n["Cách đọc"] = "よみ%d" % i
        n["Nghĩa"] = "từ số %d" % (i + 1)
        col.add_note(n, did)
    today = col.sched.today
    # giai đoạn: 20 hạt giống, 15 mầm, 50 cây non, 85 ra hoa, 130 ra quả — xáo trộn theo thứ tự tạo
    plan = ["new"] * 20 + ["learn"] * 15 + [("rev", rnd.randint(4, 19)) for _ in range(50)] + \
        [("rev", rnd.randint(22, 85)) for _ in range(85)] + [("rev", rnd.randint(95, 300)) for _ in range(130)]
    rnd.shuffle(plan)
    for k, cid in enumerate(col.find_cards('deck:"Lớn::300 từ"', order="c.id")):
        kind = plan[k]
        if kind == "new":
            continue
        if kind == "learn":
            col.db.execute("update cards set type=1, queue=1, due=?, left=1001, reps=1, ivl=0 where id=?", 2000000000, cid)
            continue
        ivl = kind[1]
        due = today if rnd.random() < 0.09 else today + rnd.randint(1, max(2, ivl // 2))
        col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=?, left=0 where id=?", ivl, due, 3 + ivl // 10, cid)
    col.close()


if __name__ == "__main__":
    main(sys.argv[1])
    print("ok 300 cây", sys.argv[1])
