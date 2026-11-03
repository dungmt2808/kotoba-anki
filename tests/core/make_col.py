"""Collection mẫu nhiều kiểu deck cho test: dùng chung cho test lõi và test giao diện."""
import os, sys, wave, struct, math
from anki.collection import Collection

DECKS = {
    "A::Có câu ví dụ + audio": "ex_audio",
    "B::Có câu ví dụ, không audio": "ex_only",
    "C::Chỉ từ + audio từ": "word_audio",
    "D::Chỉ từ, không gì cả": "bare",
    "E::Kanji đơn": "kanji",
}
WORDS = [("学生", "がくせい", "học sinh", "[学生|がくせい]です。", "私[わたし]は 学生[がくせい]です。"),
         ("先生", "せんせい", "giáo viên", "", "田中[たなか]さんは 先生[せんせい]です。"),
         ("食べる", "たべる", "ăn", "", "毎朝[まいあさ] パンを 食[た]べます。"),
         ("りんご", "りんご", "táo", "", "りんごを 三[みっ]つ 買[か]いました。"),
         ("天気", "てんき", "thời tiết", "", "今日[きょう]は いい 天気[てんき]ですね。"),
         ("図書館", "としょかん", "thư viện", "", "図書館[としょかん]で 本[ほん]を 読[よ]みます。"),
         ("コーヒー", "コーヒー", "cà phê", "", "コーヒーを 飲[の]みませんか。"),
         ("勉強する", "べんきょうする", "học", "", "毎日[まいにち] 日本語[にほんご]を 勉強[べんきょう]します。")]


def tone(path, secs=0.6, freq=440):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
        w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * freq * i / 16000))) for i in range(int(16000 * secs))))


def build(path):
    if os.path.exists(path):
        os.remove(path)
    col = Collection(path)
    mm = col.models
    m = mm.new("Từ vựng KB")
    for f in ("Từ", "Cách đọc", "Nghĩa", "Audio", "Câu ví dụ", "Audio câu ví dụ", "Dịch câu ví dụ"):
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("Thẻ 1"); t["qfmt"] = "{{Từ}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Nghĩa}} {{Audio}}"
    mm.add_template(m, t); mm.add(m)
    k = mm.new("Kanji KB")
    for f in ("Kanji", "Hán Việt", "Nghĩa"):
        mm.add_field(k, mm.new_field(f))
    t = mm.new_template("Thẻ 1"); t["qfmt"] = "{{Kanji}}"; t["afmt"] = "{{FrontSide}}<hr id=answer>{{Hán Việt}}"
    mm.add_template(k, t); mm.add(k)
    m = mm.by_name("Từ vựng KB"); k = mm.by_name("Kanji KB")
    media = col.media.dir()
    for dname, kind in DECKS.items():
        did = col.decks.id(dname)
        if kind == "kanji":
            for ch, hv, mean in [("学", "HỌC", "học"), ("生", "SINH", "sinh"), ("食", "THỰC", "ăn"), ("天", "THIÊN", "trời")]:
                n = col.new_note(k); n["Kanji"], n["Hán Việt"], n["Nghĩa"] = ch, hv, mean; col.add_note(n, did)
            continue
        for i, (w, r, mean, _x, ex) in enumerate(WORDS):
            n = col.new_note(m)
            n["Từ"], n["Cách đọc"], n["Nghĩa"] = w, r, mean
            if kind in ("ex_audio", "ex_only"):
                n["Câu ví dụ"] = ex
                n["Dịch câu ví dụ"] = "(dịch) " + mean
            if kind == "ex_audio":
                fn = "kbtest_ex_%d.wav" % i; tone(os.path.join(media, fn), 0.8, 330 + 20 * i); n["Audio câu ví dụ"] = "[sound:%s]" % fn
            if kind == "word_audio":
                fn = "kbtest_w_%d.wav" % i; tone(os.path.join(media, fn), 0.5, 520 + 20 * i); n["Audio"] = "[sound:%s]" % fn
            col.add_note(n, did)
    col.close()


if __name__ == "__main__":
    build(sys.argv[1]); print("built", sys.argv[1])
