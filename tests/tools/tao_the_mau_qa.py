"""tao_the_mau_qa.py [OUT.apkg] — 1.35.1: bộ thẻ mẫu để người dùng tự QA tiếng Đức / Pháp / Trung / Hàn trên máy thật
(không cần biết các tiếng đó): mỗi deck có đúng các từ "bẫy" đã sửa ở 1.35.1 (der Hund, -(e)s, -e · der Morgen / morgen ·
le lit / lire · 家 / 大家 · 쉬다 / 돕다…) kèm câu ví dụ + bản dịch tiếng Việt, và một deck tiếng Ý phải được nhận là "Ngôn ngữ
khác". Hướng dẫn dùng: docs/kiem_thu/1.35.1/QA_MAY_THAT.md. Cần python có gói anki (ANKI_PY).

Chạy: ~/.venv-anki/bin/python tests/tools/tao_the_mau_qa.py docs/kiem_thu/1.35.1/qa/the_mau_QA_1351.apkg
"""
import os
import sys
import tempfile

from anki.collection import Collection, ExportAnkiPackageOptions, ExportLimit  # noqa: F401

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "docs", "kiem_thu", "1.35.1", "qa",
                                                                         "the_mau_QA_1351.apkg"))
ROOT = "QA 1.35.1"

DECKS = [
    ("Tiếng Đức", "QA Deutsch Wortschatz", ["Wort", "Bedeutung", "Beispiel", "Beispiel Übersetzung"], [
        ("der Hund, -(e)s, -e", "con chó", "Die Hunde spielen im Garten.", "Những con chó chơi trong vườn."),
        ("die Katze, -n", "con mèo", "Die Katze schläft auf dem Sofa.", "Con mèo ngủ trên ghế sofa."),
        ("der Morgen, -", "buổi sáng", "Am Morgen trinke ich Kaffee.", "Buổi sáng tôi uống cà phê."),
        ("morgen", "ngày mai", "Wir sehen uns morgen.", "Mai gặp nhau nhé."),
        ("aufstehen", "thức dậy", "Er ist um sechs Uhr aufgestanden.", "Anh ấy đã dậy lúc sáu giờ."),
        ("sich freuen", "vui mừng", "Wir freuen uns auf das Fest.", "Chúng tôi mong chờ lễ hội."),
        ("das Haus, ¨-er", "ngôi nhà", "Die Häuser im Dorf sind alt.", "Những ngôi nhà trong làng đã cũ."),
        ("die Mutter, ¨", "mẹ", "Die Mütter warten vor der Schule.", "Các bà mẹ đợi trước trường."),
        ("alt", "cũ, già", "Mein Bruder ist älter als ich.", "Anh tôi lớn tuổi hơn tôi."),
        ("gut", "tốt", "Das Essen ist heute besser.", "Hôm nay đồ ăn ngon hơn."),
        ("die Straße, -n", "con đường", "Die Straße ist sehr lang.", "Con đường rất dài."),
        ("das Mädchen, -", "cô bé", "Das Mädchen liest ein Buch.", "Cô bé đọc một quyển sách."),
    ]),
    ("Tiếng Pháp", "QA Vocabulaire français", ["Mot", "Sens", "Exemple", "Traduction de l'exemple"], [
        ("le lit", "cái giường", "Le chat dort sur le lit.", "Con mèo ngủ trên giường."),
        ("lire", "đọc", "Il lit un livre le soir.", "Buổi tối anh ấy đọc sách."),
        ("la porte", "cái cửa", "Elle ouvre la porte.", "Cô ấy mở cửa."),
        ("porter", "mặc, mang", "Elle porte une robe rouge.", "Cô ấy mặc váy đỏ."),
        ("l'été (m)", "mùa hè", "Cet été, il fait très chaud.", "Mùa hè này trời rất nóng."),
        ("le papier", "giấy", "Je n'ai plus de papiers.", "Tôi hết giấy rồi."),
        ("se lever", "thức dậy", "Je me lève à sept heures.", "Tôi dậy lúc bảy giờ."),
        ("s'asseoir", "ngồi", "Il s'est assis près de la fenêtre.", "Anh ấy ngồi gần cửa sổ."),
        ("l'école (f)", "trường học", "Les enfants vont à l'école.", "Bọn trẻ đi học."),
        ("aujourd'hui", "hôm nay", "Aujourd’hui, il pleut.", "Hôm nay trời mưa."),
        ("l'œil (m)", "mắt", "Il a les yeux bleus.", "Anh ấy có mắt xanh."),
        ("le garçon", "cậu bé", "Le garçon joue au ballon.", "Cậu bé chơi bóng."),
    ]),
    ("Tiếng Trung", "QA Chinese HSK", ["Hanzi", "Pinyin", "Nghĩa", "Hán Việt", "例句", "例句翻译"], [
        ("家", "jiā", "nhà", "GIA", "我在家吃饭。", "Tôi ăn cơm ở nhà."),
        ("大家", "dàjiā", "mọi người", "ĐẠI GIA", "大家好！", "Chào mọi người!"),
        ("学生", "xuésheng", "học sinh", "HỌC SINH", "他是学生。", "Anh ấy là học sinh."),
        ("天气", "tiānqì", "thời tiết", "THIÊN KHÍ", "今天天气很好。", "Hôm nay thời tiết đẹp."),
        ("你好", "nǐ hǎo", "xin chào", "NHĨ HẢO", "你好，老师！", "Chào thầy!"),
        ("谢谢", "xièxie", "cảm ơn", "TẠ TẠ", "谢谢你！", "Cảm ơn bạn!"),
        ("喝", "hē", "uống", "HÁT", "我喝茶。", "Tôi uống trà."),
        ("书", "shū", "sách", "THƯ", "我看书。", "Tôi đọc sách."),
    ]),
    ("Tiếng Hàn", "QA Korean vocabulary", ["Korean", "Romaja", "Nghĩa", "예문", "예문 번역"], [
        ("쉬다", "swida", "nghỉ ngơi", "주말에 집에서 쉬어요.", "Cuối tuần tôi nghỉ ở nhà."),
        ("돕다", "dopda", "giúp đỡ", "친구를 도와줘요.", "Tôi giúp bạn."),
        ("가다", "gada", "đi", "학교에 가요.", "Tôi đi học."),
        ("먹다", "meokda", "ăn", "밥을 먹었어요.", "Tôi đã ăn cơm."),
        ("학교", "hakgyo", "trường học", "학교에서 공부해요.", "Tôi học ở trường."),
        ("사과", "sagwa", "quả táo", "사과를 샀어요.", "Tôi đã mua táo."),
        ("사다", "sada", "mua", "시장에서 과일을 사요.", "Tôi mua hoa quả ở chợ."),
        ("친구", "chingu", "bạn", "친구가 와요.", "Bạn đến."),
    ]),
    # tên loại note không có chữ nào gợi ý ngôn ngữ: máy phải tự nhận từ chữ của note
    ("Tiếng Ý (phải là Ngôn ngữ khác)", "QA Vocab 5", ["Front", "Back"], [
        ("la casa", "ngôi nhà"), ("il cane", "con chó"), ("l'acqua", "nước"), ("il libro", "quyển sách"),
        ("la mela", "quả táo"), ("il gatto", "con mèo"), ("la scuola", "trường học"), ("il treno", "tàu hoả"),
        ("la strada", "con đường"), ("un amico", "người bạn"), ("il caffè", "cà phê"), ("la città", "thành phố"),
    ]),
]


def main() -> None:
    tmp = tempfile.mkdtemp(prefix="kb_qa_")
    col = Collection(os.path.join(tmp, "collection.anki2"))
    mm = col.models
    for deck, mname, fields, rows in DECKS:
        m = mm.new(mname)
        for f in fields:
            mm.add_field(m, mm.new_field(f))
        t = mm.new_template("Thẻ 1")
        t["qfmt"] = "<div style='font-size:32px'>{{%s}}</div>" % fields[0]
        rest = "".join("<div>{{%s}}</div>" % f for f in fields[1:])
        t["afmt"] = "{{FrontSide}}<hr id=answer>" + rest
        mm.add_template(m, t)
        m["css"] = ".card{font-family:sans-serif;font-size:22px;text-align:center}"
        mm.add(m)
        m = mm.by_name(mname)
        did = col.decks.id("%s::%s" % (ROOT, deck))
        for r in rows:
            n = col.new_note(m)
            for f, v in zip(fields, r):
                n[f] = v
            col.add_note(n, did)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    root = col.decks.id_for_name(ROOT)
    n = col.export_anki_package(out_path=OUT, options=ExportAnkiPackageOptions(with_scheduling=False, with_deck_configs=False,
                                                                                with_media=False, legacy=True),
                                limit=__import__("anki.collection", fromlist=["DeckIdLimit"]).DeckIdLimit(root))
    col.close()
    print("%s: %d note, %d deck" % (OUT, n, len(DECKS)))


if __name__ == "__main__":
    main()
