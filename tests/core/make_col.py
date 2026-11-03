"""Collection mẫu nhiều kiểu deck cho test: dùng chung cho test lõi và test giao diện."""
import os, sys, wave, struct, math
from anki.collection import Collection

DECKS = {
    "A::Có câu ví dụ + audio": "ex_audio",
    "B::Có câu ví dụ, không audio": "ex_only",
    "C::Chỉ từ + audio từ": "word_audio",
    "D::Chỉ từ, không gì cả": "bare",
    "E::Kanji đơn": "kanji",
    # 1.17: tiếng Anh, ngôn ngữ khác, các kiểu furigana khác
    "F::Tiếng Anh Basic": "en_basic",
    "G::Tiếng Anh đầy đủ": "en_full",
    "H::Tiếng Anh nhồi chung": "en_crammed",
    "I::Nhật nhồi chung": "ja_crammed",
    "J::Tiếng Hàn": "ko",
    "K::Nhật ruby HTML": "ja_ruby",
    "L::Nhật ngoặc tròn": "ja_paren",
}
EN_WORDS = [("apple", "/ˈæp.əl/", "quả táo", "I eat an apple every morning.", "Tôi ăn một quả táo mỗi sáng."),
            ("go", "/ɡoʊ/", "đi", "She went to school by bus.", "Cô ấy đi học bằng xe buýt."),
            ("study", "/ˈstʌd.i/", "học", "They are studying English now.", "Họ đang học tiếng Anh."),
            ("stop", "/stɑːp/", "dừng lại", "The car stopped at the light.", "Chiếc xe dừng ở đèn đỏ."),
            ("city", "/ˈsɪt.i/", "thành phố", "Big cities are noisy.", "Các thành phố lớn thì ồn."),
            ("look up", "/lʊk ʌp/", "tra cứu", "I looked up the word in a dictionary.", "Tôi tra từ đó trong từ điển."),
            ("child", "/tʃaɪld/", "đứa trẻ", "The children don't like rain.", "Bọn trẻ không thích mưa."),
            ("happy", "/ˈhæp.i/", "vui vẻ", "She is happier than yesterday.", "Hôm nay cô ấy vui hơn hôm qua.")]
KO_WORDS = [("사과", "quả táo"), ("학교", "trường học"), ("물", "nước"), ("책", "sách"), ("친구", "bạn")]
RUBY_WORDS = [("<ruby>学生<rt>がくせい</rt></ruby>", "học sinh", "<ruby>私<rt>わたし</rt></ruby>は<ruby>学生<rt>がくせい</rt></ruby>です。"),
              ("<ruby><rb>先生</rb><rp>(</rp><rt>せんせい</rt><rp>)</rp></ruby>", "giáo viên", "<ruby>田中<rt>たなか</rt></ruby>さんは<ruby>先生<rt>せんせい</rt></ruby>です。"),
              ("<ruby>食<rt>た</rt></ruby>べる", "ăn", "パンを<ruby>食<rt>た</rt></ruby>べます。"),
              ("<ruby>天気<rt>てんき</rt></ruby>", "thời tiết", "<ruby>今日<rt>きょう</rt></ruby>はいい<ruby>天気<rt>てんき</rt></ruby>ですね。"),
              ("<ruby>図書館<rt>としょかん</rt></ruby>", "thư viện", "<ruby>図書館<rt>としょかん</rt></ruby>で<ruby>本<rt>ほん</rt></ruby>を<ruby>読<rt>よ</rt></ruby>みます。")]
PAREN_WORDS = [("学生（がくせい）", "học sinh"), ("先生(せんせい)", "giáo viên"), ("天気【てんき】", "thời tiết"),
               ("賛成(する)", "tán thành"), ("図書館<br>としょかん", "thư viện")]
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
    def model(name, flds):
        x = mm.new(name)
        for f in flds:
            mm.add_field(x, mm.new_field(f))
        tt = mm.new_template("Thẻ 1"); tt["qfmt"] = "{{%s}}" % flds[0]; tt["afmt"] = "{{FrontSide}}<hr id=answer>{{%s}}" % flds[1]
        mm.add_template(x, tt); mm.add(x)
        return mm.by_name(name)
    en_full = model("English KB", ["Word", "IPA", "Meaning", "Example", "Example meaning", "Audio"])
    en_basic = model("Basic EN KB", ["Front", "Back"])
    en_cram = model("EN nhồi chung KB", ["Front", "Back"])
    ja_cram = model("Nhật nhồi chung KB", ["Front", "Back"])
    ko = model("Tiếng Hàn KB", ["Front", "Back"])
    ruby = model("Từ ruby KB", ["Từ", "Nghĩa", "Câu ví dụ"])
    paren = model("Từ ngoặc KB", ["Từ", "Nghĩa"])
    m = mm.by_name("Từ vựng KB"); k = mm.by_name("Kanji KB")
    media = col.media.dir()
    for dname, kind in DECKS.items():
        did = col.decks.id(dname)
        if kind.startswith(("en_", "ja_", "ko")):
            for i in range(8):
                if kind == "en_full":
                    w, ipa, mean, ex, exm = EN_WORDS[i]
                    n = col.new_note(en_full)
                    n["Word"], n["IPA"], n["Meaning"], n["Example"], n["Example meaning"] = w, ipa, mean, ex, exm
                    if i < 5:
                        fn = "kbtest_en_%d.wav" % i; tone(os.path.join(media, fn), 0.4, 600 + 20 * i); n["Audio"] = "[sound:%s]" % fn
                elif kind == "en_basic":
                    n = col.new_note(en_basic); n["Front"], n["Back"] = EN_WORDS[i][0], EN_WORDS[i][2]
                elif kind == "en_crammed":
                    w, ipa, mean, ex, _exm = EN_WORDS[i]
                    n = col.new_note(en_cram); n["Front"] = "%s %s - %s" % (w, ipa, mean); n["Back"] = "%s<br>%s" % (mean, ex)
                elif kind == "ja_crammed":
                    w, r, mean, _x, _ex = WORDS[i]
                    n = col.new_note(ja_cram); n["Front"] = "%s (%s) - %s" % (w, r, mean); n["Back"] = mean
                elif kind == "ko":
                    if i >= len(KO_WORDS):
                        break
                    n = col.new_note(ko); n["Front"], n["Back"] = KO_WORDS[i]
                elif kind == "ja_ruby":
                    if i >= len(RUBY_WORDS):
                        break
                    n = col.new_note(ruby); n["Từ"], n["Nghĩa"], n["Câu ví dụ"] = RUBY_WORDS[i]
                else:
                    if i >= len(PAREN_WORDS):
                        break
                    n = col.new_note(paren); n["Từ"], n["Nghĩa"] = PAREN_WORDS[i]
                col.add_note(n, did)
            continue
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
