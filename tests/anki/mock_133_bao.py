"""Số báo mẫu tiếng Trung / tiếng Hàn cho ẢNH PHÁC báo tiếng Trung / Hàn (bản sau 1.32.2) — chưa phải mã thật.

Chữ do Claude soạn (kể lại kỳ 2 của truyện chung "Lời kể lúc bình minh", tests/fixtures/ngay_1252/ban_goc.json, ở mức
HSK 2 / TOPIK 2); pinyin KHÔNG gõ tay: tách từ bằng jieba, pinyin có dấu bằng pypinyin. Ghi theo khuôn bao.json của báo
tiếng Nhật ({chữ|cách đọc|từ gốc} = chỗ tra từ, [chữ|cách đọc] = chữ có cách đọc) để trình đọc báo thật của add-on hiện được.
Chạy bằng python có pypinyin + jieba (venv riêng): python mock_133_bao.py zh|ko RA.json NGÀY
"""
import json, sys

LANG, OUT, DAY = sys.argv[1], sys.argv[2], sys.argv[3]

# từ tra được: từ gốc → (nghĩa tiếng Việt, Hán Việt / phiên âm)
ZH_TU = {"天气": "thời tiết · THIÊN KHÍ", "漂亮": "đẹp · PHIÊU LƯỢNG", "节日": "ngày lễ · TIẾT NHẬT", "旅馆": "nhà trọ · LỮ QUÁN",
         "准备": "chuẩn bị · CHUẨN BỊ", "本子": "cuốn sổ · BẢN TỬ", "声音": "âm thanh · THANH ÂM", "害怕": "sợ · HẠI PHẠ",
         "眼睛": "mắt · NHÃN TINH", "奇怪": "kỳ lạ · KỲ QUÁI", "衣服": "quần áo · Y PHỤC", "故事": "câu chuyện · CỐ SỰ"}
ZH_MOI = {"木屐": "guốc gỗ · MỘC KỊCH", "发抖": "run · PHÁT ĐẨU"}
ZH = [
    ("tin_lang", "秋天的好天气", [
        "今天天气很好，一天都是晴天。村子里的红叶很漂亮，大家都出来拍照。晚上会变冷，请多穿衣服。",
        "下个星期有秋天的节日。村长今天去了旅馆，准备节日的事情。"]),
    ("truyen", "早上的奇怪故事", [
        "“哈娜姐，昨天晚上，木屐真的自己动了！”林拿着本子说。这时候，村长来了。他说：“五十年前，老井旁边有一个穿白衣服的女人。木屐的声音就是她的。”",
        "林很害怕，手一直发抖。哈娜姐没有说话，给村长倒了一杯热茶，一直看着老井。",
        "StackChan说：“我画了一个鬼！它是方的，有红色的眼睛！”大家都笑了。"]),
]
KO_TU = {"날씨": ("nalssi", "thời tiết"), "마을": ("maeul", "làng"), "사진": ("sajin", "ảnh · TẢ CHÂN"), "축제": ("chukje", "lễ hội · CHÚC TẾ"),
         "준비": ("junbi", "chuẩn bị · CHUẨN BỊ"), "수첩": ("sucheop", "sổ tay · THỦ THIẾP"), "우물": ("umul", "cái giếng"),
         "무섭다": ("museopda", "sợ, đáng sợ"), "소리": ("sori", "âm thanh"), "눈": ("nun", "mắt"), "이야기": ("iyagi", "câu chuyện")}
KO_MOI = {"나막신": ("namaksin", "guốc gỗ")}
# (chữ, từ gốc) — phần còn lại (tiểu từ, đuôi) đứng ngoài chỗ tra
KO = [
    ("tin_lang", "맑은 가을 날씨", [
        [("오늘은 하루 종일 ", None), ("날씨", "날씨"), ("가 맑았어요. ", None), ("마을", "마을"), ("의 단풍이 아주 예뻐서 사람들이 ", None),
         ("사진", "사진"), ("을 많이 찍었어요. 밤에는 추워지니까 따뜻하게 입으세요.", None)],
        [("다음 주에 가을 ", None), ("축제", "축제"), ("가 있어요. 촌장님은 오늘 여관에 가서 ", None), ("축제", "축제"), ("를 ", None),
         ("준비", "준비"), ("했어요.", None)]]),
    ("truyen", "아침의 이상한 이야기", [
        [("“하나 언니, 어젯밤에 ", None), ("나막신", "나막신"), ("이 정말 혼자 움직였어요!” 린은 ", None), ("수첩", "수첩"),
         ("을 들고 말했어요. 그때 촌장님이 왔어요. “50년 전에 오래된 ", None), ("우물", "우물"),
         (" 옆에 하얀 옷을 입은 여자가 있었어. ", None), ("나막신", "나막신"), (" ", None), ("소리", "소리"), ("는 그 여자의 소리야.”", None)],
        [("린은 ", None), ("무서워서", "무섭다"), (" 손이 떨렸어요. 하나 언니는 아무 말도 하지 않고 따뜻한 차를 드렸어요.", None)],
        [("스택짱이 말했어요. “유령을 그렸어요! 네모 모양이고 빨간 ", None), ("눈", "눈"), ("이 있어요!” 모두 웃었어요.", None)]]),
]


def zh_markup(text):
    import jieba
    from pypinyin import Style, pinyin
    out = []
    for w in jieba.cut(text):
        if not any("一" <= ch <= "鿿" for ch in w):
            out.append(w)
            continue
        sy = [x[0] for x in pinyin(w, style=Style.TONE, heteronym=False)]
        if w in ZH_TU or w in ZH_MOI:
            out.append("{%s|%s|%s}" % (w, " ".join(sy), w))
        else:            # mỗi chữ một âm tiết (pinyin nằm ngay trên chữ của nó)
            out.append("".join("[%s|%s]" % (ch, y) for ch, y in zip(w, sy)) if len(sy) == len(w) else "[%s|%s]" % (w, " ".join(sy)))
    return "".join(out)


def zh_issue():
    from pypinyin import Style, pinyin
    tra = {}
    for w, m in list(ZH_TU.items()) + list(ZH_MOI.items()):
        tra[w] = [w, " ".join(x[0] for x in pinyin(w, style=Style.TONE)), m, "deck"]
    bai = [{"loai": l, "tieu_de": zh_markup(t), "doan": [zh_markup(p) for p in ps]} | ({"ky": 2} if l == "truyen" else {})
           for l, t, ps in ZH]
    return bai, tra, [{"w": w, "r": tra[w][1], "m": m} for w, m in ZH_MOI.items()], [zh_markup(ZH[1][2][1].split("，")[0] + "。")]


def ko_issue():
    tra = {w: [w, r, m, "deck"] for w, (r, m) in list(KO_TU.items()) + list(KO_MOI.items())}
    def mk(parts):
        return "".join(t if g is None else "{%s||%s}" % (t, g) for t, g in parts)
    bai = [{"loai": l, "tieu_de": t, "doan": [mk(p) for p in ps]} | ({"ky": 2} if l == "truyen" else {}) for l, t, ps in KO]
    return bai, tra, [{"w": w, "r": r, "m": m} for w, (r, m) in KO_MOI.items()], ["린은 {무서워서||무섭다} 손이 떨렸어요."]


bai, tra, moi, ct = zh_issue() if LANG == "zh" else ko_issue()
issue = {"ngay": DAY, "so": 1, "rut_gon": False, "may_viet": "Gemini (ảnh phác)", "bai": bai,
         "cau_hoi": [], "chinh_ta": [{"cau": c, "them_dap_an": []} for c in ct], "mau_cau": [], "tu_moi": moi,
         "tom_tat": "", "tra_tu": tra, "tra_mau": {}, "tra_sach": []}
json.dump(issue, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("ok", LANG, OUT)
