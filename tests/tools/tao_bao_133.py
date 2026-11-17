"""1.33: dữ liệu mẫu cho core/test_133.py — câu trả lời của "Gemini giả" cho báo tiếng Trung / tiếng Hàn (kể lại truyện,
viết số, soát). Chữ do Claude soạn (HSK 2 / TOPIK 2); pinyin KHÔNG gõ tay: tách từ bằng jieba, pinyin ghi số bằng pypinyin
(thanh nhẹ = 5). Ghi tests/fixtures/bao_133.json — test chạy không cần pypinyin / jieba.

Chạy (venv riêng):  uv venv /tmp/soat && uv pip install --python /tmp/soat/bin/python pypinyin jieba
                     /tmp/soat/bin/python tests/tools/tao_bao_133.py
"""
import json
import os

import jieba
from pypinyin import Style, pinyin

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "fixtures", "bao_133.json")


# jieba / pypinyin đọc sai chữ nhiều cách đọc khi đứng làm trợ từ (地 / 得 kết cấu đọc de) — sửa tay sau khi soát
FIX = {"[地说|di4 shuo1]": "[地|de5][说|shuo1]", "[地|di4]": "[地|de5]", "[写得|xie3 de2]": "[写|xie3][得|de5]"}


def zh(text: str) -> str:
    """Chữ Hán → [từ|pinyin ghi số] theo từ (như Gemini được dặn viết)."""
    s = _zh(text)
    for a, b in FIX.items():
        s = s.replace(a, b)
    return s


def _zh(text: str) -> str:
    out = []
    for w in jieba.cut(text):
        if any("一" <= c <= "鿿" for c in w):
            py = [x[0] for x in pinyin(w, style=Style.TONE3, neutral_tone_with_five=True)]
            out.append("[%s|%s]" % (w, " ".join(py)))
        else:
            out.append(w)
    return "".join(out)


ZH_STORY = {
    "tieu_de": "早上的奇怪故事",
    "doan": [
        "“哈娜姐，昨天晚上，木屐真的自己动了！”林拿着本子，很紧张地说。这时候，村长走进了旅店。他慢慢地坐下，说：“五十年前，"
        "老井旁边有一个穿白衣服的女人，那就是木屐的声音。”",
        "林听了很害怕，手一直发抖。她想把村长的话写在本子上，可是写得很慢。哈娜姐没有说话，给村长倒了一杯热茶，然后一直看着"
        "外面的老井。",
        "这时候，StackChan从门外跑进来，大声说：“我画了一个鬼！它是方的，有红色的眼睛！”大家都笑了。可是林看着那张画，突然"
        "不笑了，因为画上的鬼穿着一双木屐。",
    ],
    "dich": ["\"Chị Hana ơi, tối qua guốc gỗ tự chuyển động thật đấy!\" Lin cầm cuốn sổ, lo lắng nói. Lúc đó trưởng làng bước vào quán. Ông chậm rãi ngồi xuống và nói: \"Năm mươi năm trước, cạnh giếng cổ có một người phụ nữ mặc áo trắng, đó chính là tiếng guốc gỗ.\"",
             "Lin nghe xong rất sợ, tay run mãi. Cô muốn ghi lời trưởng làng vào sổ nhưng viết rất chậm. Chị Hana không nói gì, rót cho trưởng làng một tách trà nóng rồi cứ nhìn ra giếng cổ bên ngoài.",
             "Lúc đó StackChan chạy từ ngoài cửa vào, nói to: \"Tớ vẽ một con ma! Nó hình vuông, có mắt màu đỏ!\" Mọi người đều cười. Nhưng Lin nhìn bức tranh thì bỗng thôi cười, vì con ma trong tranh đang đi một đôi guốc gỗ."],
    "tu_moi": [{"w": "木屐", "r": "mu4 ji1", "m": "guốc gỗ"}],
}

ZH_ISSUE = {
    "bai": [
        {"loai": "tin_lang", "tieu_de": "秋天的好天气",
         "doan": ["今天天气很好，一天都是晴天。村子里的红叶很漂亮，大家都出来拍照。",
                  "下个星期有秋天的节日。村长今天去了旅店，准备节日的事情。"],
         "dich": ["Hôm nay trời đẹp, nắng cả ngày. Lá đỏ trong làng rất đẹp, mọi người đều ra chụp ảnh.",
                  "Tuần sau có lễ hội mùa thu. Hôm nay trưởng làng đã đến quán trọ để chuẩn bị cho lễ hội."]},
        {"loai": "thong_bao", "tieu_de": "村里通知",
         "doan": ["◆ 明天早上，公共汽车会晚一点来。请在商店前面等车。",
                  "◆ 星期六下午，菜园里有一个小音乐会。欢迎大家来听！"],
         "dich": ["◆ Sáng mai xe buýt sẽ đến muộn một chút. Xin đợi xe trước cửa hàng.",
                  "◆ Chiều thứ Bảy, trong vườn có một buổi hòa nhạc nhỏ. Mời mọi người đến nghe!"]},
    ],
    "cau_hoi": [
        {"hoi": "村长今天去了哪里？", "chon": ["旅店", "学校", "医院"], "dung": 0,
         "giai_thich": "Tin làng: hôm nay trưởng làng đã đến quán trọ để chuẩn bị lễ hội."},
        {"hoi": "星期六下午菜园里有什么？", "chon": ["考试", "音乐会", "足球比赛"], "dung": 1,
         "giai_thich": "Thông báo: chiều thứ Bảy trong vườn có buổi hòa nhạc nhỏ."},
    ],
    "chinh_ta": [{"cau": "今天天气很好，一天都是晴天。", "them_dap_an": []}, {"cau": "大家都出来拍照。", "them_dap_an": []}],
    "mau_cau": ["zh1-06", "zh1-11"],
    "tu_moi": [],
    "tom_tat": "Số báo về thời tiết mùa thu, lễ hội của làng và chuyện chiếc guốc gỗ.",
    "tom_tat_truyen": "Lin sợ hãi khi nghe trưởng làng kể chuyện ma ở giếng cổ.",
}

KO_STORY = {
    "tieu_de": "아침의 이상한 이야기",
    "doan": [
        "\"하나 언니, 어젯밤에 나막신이 정말 혼자 움직였어요!\" 린은 수첩을 들고 말했어요. 그때 촌장님이 여관에 들어왔어요. "
        "촌장님은 천천히 앉아서 말했어요. \"오십 년 전에 오래된 우물 옆에 하얀 옷을 입은 여자가 있었어. 나막신 소리는 그 "
        "여자의 소리야.\"",
        "린은 무서워서 손이 계속 떨렸어요. 린은 촌장님의 이야기를 수첩에 쓰고 싶었지만 너무 천천히 썼어요. 하나 씨는 아무 "
        "말도 하지 않았어요. 하나 씨는 촌장님께 따뜻한 차를 드리고 창밖의 우물을 계속 보았어요.",
        "그때 스택짱이 밖에서 뛰어 들어왔어요. \"유령을 그렸어요! 네모 모양이고 빨간 눈이 있어요!\" 모두 웃었어요. 그런데 "
        "린은 그림을 보고 갑자기 웃지 않았어요. 그림 속의 유령이 나막신을 신고 있었어요.",
    ],
    "dich": ["\"Chị Hana ơi, tối qua guốc gỗ tự chuyển động thật đấy!\" Lin cầm cuốn sổ và nói. Lúc đó trưởng làng bước vào quán. Ông chậm rãi ngồi xuống và nói: \"Năm mươi năm trước, cạnh giếng cổ có một người phụ nữ mặc áo trắng. Tiếng guốc gỗ là tiếng của cô ấy.\"",
             "Lin sợ đến mức tay cứ run mãi. Lin muốn ghi câu chuyện của trưởng làng vào sổ nhưng viết quá chậm. Chị Hana không nói gì. Chị rót trà ấm mời trưởng làng rồi cứ nhìn ra giếng cổ ngoài cửa sổ.",
             "Lúc đó StackChan chạy từ ngoài vào. \"Tớ vẽ ma rồi! Nó hình vuông, có mắt đỏ!\" Mọi người đều cười. Nhưng Lin nhìn bức tranh thì bỗng thôi cười. Con ma trong tranh đang đi guốc gỗ."],
    "tu_moi": [{"w": "나막신", "r": "namaksin", "m": "guốc gỗ"}],
}

KO_ISSUE = {
    "bai": [
        {"loai": "tin_lang", "tieu_de": "맑은 가을 날씨",
         "doan": ["오늘은 하루 종일 날씨가 맑았어요. 마을의 단풍이 아주 예뻐서 사람들이 사진을 많이 찍었어요.",
                  "다음 주에 가을 축제가 있어요. 촌장님은 오늘 여관에 가서 축제를 준비했어요."],
         "dich": ["Hôm nay trời quang cả ngày. Lá đỏ trong làng rất đẹp nên mọi người chụp nhiều ảnh.",
                  "Tuần sau có lễ hội mùa thu. Hôm nay trưởng làng đã đến quán trọ để chuẩn bị lễ hội."]},
        {"loai": "cot", "tieu_de": "스택짱의 코너",
         "doan": ["저는 오늘 고양이 그림을 그렸어요. 고양이가 아주 귀여워요. 내일은 꽃 그림을 그릴 거예요."],
         "dich": ["Hôm nay tớ vẽ một bức tranh con mèo. Con mèo rất dễ thương. Ngày mai tớ sẽ vẽ tranh hoa."]},
    ],
    "cau_hoi": [
        {"hoi": "촌장님은 오늘 어디에 갔어요?", "chon": ["여관", "학교", "병원"], "dung": 0,
         "giai_thich": "Tin làng: hôm nay trưởng làng đã đến quán trọ."},
        {"hoi": "스택짱은 내일 무엇을 그릴 거예요?", "chon": ["고양이", "꽃", "우물"], "dung": 1,
         "giai_thich": "Góc StackChan: ngày mai sẽ vẽ tranh hoa."},
    ],
    "chinh_ta": [{"cau": "다음 주에 가을 축제가 있어요.", "them_dap_an": []}, {"cau": "고양이가 아주 귀여워요.", "them_dap_an": []}],
    "mau_cau": ["ko1-04", "ko2-01"],
    "tu_moi": [],
    "tom_tat": "Số báo về trời thu, lễ hội của làng và bức tranh của StackChan.",
    "tom_tat_truyen": "Lin sợ hãi khi nghe trưởng làng kể chuyện ma ở giếng cổ.",
}


def zh_issue(raw: dict) -> dict:
    out = json.loads(json.dumps(raw, ensure_ascii=False))
    for b in out["bai"]:
        b["tieu_de"] = zh(b["tieu_de"])
        b["doan"] = [zh(p) for p in b["doan"]]
    for q in out["cau_hoi"]:
        q["hoi"] = zh(q["hoi"])
        q["chon"] = [zh(x) for x in q["chon"]]
    for c in out["chinh_ta"]:
        c["cau"] = zh(c["cau"])
    return out


def main() -> None:
    st = dict(ZH_STORY)
    st["tieu_de"] = zh(st["tieu_de"])
    st["doan"] = [zh(p) for p in st["doan"]]
    data = {"cong_cu": "jieba + pypinyin", "zh": {"story": st, "issue": zh_issue(ZH_ISSUE)},
            "ko": {"story": KO_STORY, "issue": KO_ISSUE}}
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=1)
    print("→", OUT)


if __name__ == "__main__":
    main()
