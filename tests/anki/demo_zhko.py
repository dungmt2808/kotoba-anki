"""Thêm deck tiếng Trung (HSK 1) + tiếng Hàn (sơ cấp) nhỏ vào collection mẫu của demo_col.py — cho ảnh phác 1.32.

Từ tự chọn (từ cơ bản ai cũng dạy, không chép giáo trình). Pinyin ghi dấu thanh; tiếng Hàn có cột phiên âm (romaja).
Chạy: python demo_zhko.py BASE/Test/collection.anki2   (python của venv có anki, sau demo_col.py)
"""
import random, sys, time
from anki.collection import Collection

ZH = [("你好", "nǐ hǎo", "xin chào", "NHĨ HẢO"), ("谢谢", "xièxie", "cảm ơn", "TẠ TẠ"), ("学生", "xuésheng", "học sinh", "HỌC SINH"),
      ("老师", "lǎoshī", "giáo viên", "LÃO SƯ"), ("朋友", "péngyou", "bạn bè", "BẰNG HỮU"), ("吃饭", "chī fàn", "ăn cơm", "NGẬT PHẠN"),
      ("喝茶", "hē chá", "uống trà", "HÁT TRÀ"), ("看书", "kàn shū", "đọc sách", "KHÁN THƯ"), ("学习", "xuéxí", "học tập", "HỌC TẬP"),
      ("天气", "tiānqì", "thời tiết", "THIÊN KHÍ"), ("下雨", "xià yǔ", "trời mưa", "HẠ VŨ"), ("花", "huā", "hoa", "HOA"),
      ("水", "shuǐ", "nước", "THUỶ"), ("猫", "māo", "con mèo", "MIÊU"), ("狗", "gǒu", "con chó", "CẨU"), ("家", "jiā", "nhà", "GIA"),
      ("医院", "yīyuàn", "bệnh viện", "Y VIỆN"), ("飞机", "fēijī", "máy bay", "PHI CƠ"), ("电脑", "diànnǎo", "máy tính", "ĐIỆN NÃO"),
      ("中国", "Zhōngguó", "Trung Quốc", "TRUNG QUỐC"), ("今天", "jīntiān", "hôm nay", "KIM THIÊN"), ("明天", "míngtiān", "ngày mai", "MINH THIÊN"),
      ("喜欢", "xǐhuan", "thích", "HỈ HOAN"), ("漂亮", "piàoliang", "đẹp", "PHIÊU LƯỢNG")]
KO = [("안녕하세요", "annyeonghaseyo", "xin chào"), ("감사합니다", "gamsahamnida", "cảm ơn"), ("학생", "haksaeng", "học sinh"),
      ("선생님", "seonsaengnim", "thầy cô giáo"), ("친구", "chingu", "bạn bè"), ("밥", "bap", "cơm"), ("물", "mul", "nước"),
      ("책", "chaek", "sách"), ("꽃", "kkot", "hoa"), ("고양이", "goyangi", "con mèo"), ("강아지", "gangaji", "cún con"),
      ("집", "jip", "nhà"), ("학교", "hakgyo", "trường học"), ("병원", "byeongwon", "bệnh viện"), ("날씨", "nalssi", "thời tiết"),
      ("오늘", "oneul", "hôm nay"), ("내일", "naeil", "ngày mai"), ("사랑", "sarang", "tình yêu"), ("바다", "bada", "biển"),
      ("커피", "keopi", "cà phê")]


def model(col, name, fields):
    mm = col.models
    m = mm.new(name)
    for f in fields:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("Thẻ 1")
    t["qfmt"] = '<div style="font-size:48px">{{%s}}</div>' % fields[0]
    t["afmt"] = "{{FrontSide}}<hr id=answer>" + "".join("<div>{{%s}}</div>" % f for f in fields[1:])
    mm.add_template(m, t)
    mm.add(m)
    return mm.by_name(name)


def main(path):
    col = Collection(path)
    zh = model(col, "Chinese HSK", ["Hanzi", "Pinyin", "Nghĩa", "Hán Việt"])
    ko = model(col, "Korean vocabulary", ["Korean", "Romaja", "Nghĩa"])
    d_zh = col.decks.id("Tiếng Trung::HSK 1")
    d_ko = col.decks.id("Tiếng Hàn::Sơ cấp 1")
    for w, p, m, hv in ZH:
        n = col.new_note(zh)
        n["Hanzi"], n["Pinyin"], n["Nghĩa"], n["Hán Việt"] = w, p, m, hv
        col.add_note(n, d_zh)
    for w, r, m in KO:
        n = col.new_note(ko)
        n["Korean"], n["Romaja"], n["Nghĩa"] = w, r, m
        col.add_note(n, d_ko)
    today, now, rnd = col.sched.today, int(time.time()), random.Random(132)
    for deck in ("Tiếng Trung::HSK 1", "Tiếng Hàn::Sơ cấp 1"):
        for k, cid in enumerate(col.find_cards('deck:"%s"' % deck, order="c.id")):
            if k % 6 == 0:
                continue                                   # hạt giống
            ivl = rnd.choice((1, 3, 8, 15, 30, 60, 120))
            col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=?, left=0 where id=?",
                           ivl, today + (0 if k % 5 == 0 else rnd.randint(1, 9)), 3 + ivl // 10, cid)
    col.close()


if __name__ == "__main__":
    main(sys.argv[1])
    print("ok zh/ko", sys.argv[1])
