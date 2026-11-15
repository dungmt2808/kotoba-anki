"""Collection mẫu cho ảnh / video giới thiệu (README): deck tiếng Nhật N5 (90 từ) + chữ Hán + tiếng Anh A2, lịch sử ôn 3 tháng.

Cây đủ 5 giai đoạn (hạt giống → ra quả), một phần thẻ đến hạn hôm nay (để có cây "khát" và nút Tưới ngay còn số),
revlog 90 ngày (Lịch hoa có hoa, chuỗi ngày ôn đang chạy). Câu ví dụ là câu tự viết (không lấy của giáo trình nào),
audio câu ví dụ là tiếng bíp (đủ để Chép chính tả chạy; ảnh / video không có tiếng).

Chạy: python demo_col.py BASE/Test/collection.anki2   (python của venv có aqt / anki)
"""
import json, math, os, random, struct, sys, time, wave
from anki.collection import Collection

HERE = os.path.dirname(os.path.abspath(__file__))
DAYS_BACK = 120      # collection "tạo" 120 ngày trước → hôm nay = ngày 120, thẻ ôn có hạn ở quá khứ / tương lai

# (từ, cách đọc, nghĩa, câu ví dụ có furigana kiểu Anki "漢字[かんじ]", dịch)
N5 = [
    ("学生", "がくせい", "học sinh", "私[わたし]は 学生[がくせい]です。", "Tôi là học sinh."),
    ("先生", "せんせい", "giáo viên", "山田[やまだ]先生[せんせい]は やさしいです。", "Thầy Yamada hiền."),
    ("食べる", "たべる", "ăn", "朝[あさ]ごはんを 食[た]べました。", "Tôi đã ăn sáng."),
    ("飲む", "のむ", "uống", "毎朝[まいあさ] お茶[ちゃ]を 飲[の]みます。", "Sáng nào tôi cũng uống trà."),
    ("見る", "みる", "xem, nhìn", "週末[しゅうまつ]に 映画[えいが]を 見[み]ます。", "Cuối tuần tôi xem phim."),
    ("行く", "いく", "đi", "あした 公園[こうえん]へ 行[い]きます。", "Ngày mai tôi đi công viên."),
    ("来る", "くる", "đến", "友達[ともだち]が 家[いえ]に 来[き]ました。", "Bạn đã đến nhà tôi."),
    ("帰る", "かえる", "về", "六時[ろくじ]に 家[いえ]へ 帰[かえ]ります。", "Tôi về nhà lúc 6 giờ."),
    ("読む", "よむ", "đọc", "電車[でんしゃ]で 本[ほん]を 読[よ]みます。", "Tôi đọc sách trên tàu."),
    ("書く", "かく", "viết", "母[はは]に 手紙[てがみ]を 書[か]きました。", "Tôi đã viết thư cho mẹ."),
    ("聞く", "きく", "nghe", "夜[よる] 音楽[おんがく]を 聞[き]きます。", "Buổi tối tôi nghe nhạc."),
    ("話す", "はなす", "nói chuyện", "日本語[にほんご]で 話[はな]しましょう。", "Hãy nói bằng tiếng Nhật nào."),
    ("買う", "かう", "mua", "駅[えき]で 花[はな]を 買[か]いました。", "Tôi đã mua hoa ở ga."),
    ("待つ", "まつ", "chờ", "ここで 少[すこ]し 待[ま]って ください。", "Xin chờ ở đây một chút."),
    ("起きる", "おきる", "thức dậy", "毎日[まいにち] 七時[しちじ]に 起[お]きます。", "Hằng ngày tôi dậy lúc 7 giờ."),
    ("寝る", "ねる", "ngủ", "きのうは 早[はや]く 寝[ね]ました。", "Hôm qua tôi ngủ sớm."),
    ("勉強", "べんきょう", "việc học", "図書館[としょかん]で 勉強[べんきょう]します。", "Tôi học ở thư viện."),
    ("天気", "てんき", "thời tiết", "今日[きょう]は いい 天気[てんき]ですね。", "Hôm nay trời đẹp nhỉ."),
    ("雨", "あめ", "mưa", "雨[あめ]が 降[ふ]って います。", "Trời đang mưa."),
    ("花", "はな", "hoa", "庭[にわ]に 花[はな]が 咲[さ]きました。", "Hoa đã nở trong vườn."),
    ("山", "やま", "núi", "夏[なつ]に 山[やま]へ 登[のぼ]りました。", "Mùa hè tôi đã leo núi."),
    ("川", "かわ", "sông", "川[かわ]で 魚[さかな]を 見[み]ました。", "Tôi thấy cá ở sông."),
    ("海", "うみ", "biển", "海[うみ]は とても 青[あお]いです。", "Biển rất xanh."),
    ("空", "そら", "bầu trời", "空[そら]に 雲[くも]が あります。", "Trên trời có mây."),
    ("友達", "ともだち", "bạn bè", "友達[ともだち]と 昼[ひる]ごはんを 食[た]べます。", "Tôi ăn trưa với bạn."),
    ("家族", "かぞく", "gia đình", "家族[かぞく]は 四人[よにん]です。", "Gia đình tôi có 4 người."),
    ("仕事", "しごと", "công việc", "仕事[しごと]は 五時[ごじ]までです。", "Công việc đến 5 giờ."),
    ("会社", "かいしゃ", "công ty", "会社[かいしゃ]は 駅[えき]の 近[ちか]くです。", "Công ty ở gần ga."),
    ("電車", "でんしゃ", "tàu điện", "電車[でんしゃ]は 少[すこ]し 遅[おく]れました。", "Tàu đến trễ một chút."),
    ("駅", "えき", "nhà ga", "駅[えき]まで 歩[ある]いて 十分[じゅっぷん]です。", "Đi bộ đến ga mất 10 phút."),
    ("図書館", "としょかん", "thư viện", "図書館[としょかん]は 静[しず]かです。", "Thư viện yên tĩnh."),
    ("病院", "びょういん", "bệnh viện", "病院[びょういん]は 九時[くじ]からです。", "Bệnh viện mở từ 9 giờ."),
    ("時計", "とけい", "đồng hồ", "新[あたら]しい 時計[とけい]を 買[か]いました。", "Tôi đã mua đồng hồ mới."),
    ("新聞", "しんぶん", "báo", "父[ちち]は 毎朝[まいあさ] 新聞[しんぶん]を 読[よ]みます。", "Sáng nào bố cũng đọc báo."),
    ("料理", "りょうり", "món ăn, nấu ăn", "母[はは]の 料理[りょうり]は おいしいです。", "Món mẹ nấu rất ngon."),
    ("野菜", "やさい", "rau", "野菜[やさい]を たくさん 食[た]べます。", "Tôi ăn nhiều rau."),
    ("果物", "くだもの", "trái cây", "どんな 果物[くだもの]が 好[す]きですか。", "Bạn thích trái cây gì?"),
    ("魚", "さかな", "cá", "この 魚[さかな]は 新[あたら]しいです。", "Con cá này tươi."),
    ("肉", "にく", "thịt", "肉[にく]より 魚[さかな]が 好[す]きです。", "Tôi thích cá hơn thịt."),
    ("お茶", "おちゃ", "trà", "お茶[ちゃ]を どうぞ。", "Mời anh dùng trà."),
    ("水", "みず", "nước", "水[みず]を 一杯[いっぱい] ください。", "Cho tôi một cốc nước."),
    ("部屋", "へや", "phòng", "部屋[へや]を そうじしました。", "Tôi đã dọn phòng."),
    ("窓", "まど", "cửa sổ", "窓[まど]を 開[あ]けても いいですか。", "Tôi mở cửa sổ được không?"),
    ("机", "つくえ", "bàn", "机[つくえ]の 上[うえ]に 本[ほん]が あります。", "Trên bàn có quyển sách."),
    ("鳥", "とり", "chim", "木[き]の 上[うえ]に 鳥[とり]が います。", "Trên cây có con chim."),
    ("猫", "ねこ", "con mèo", "猫[ねこ]が 庭[にわ]で 寝[ね]て います。", "Con mèo đang ngủ trong vườn."),
    ("犬", "いぬ", "con chó", "犬[いぬ]と 散歩[さんぽ]します。", "Tôi đi dạo với chó."),
    ("朝", "あさ", "buổi sáng", "朝[あさ]は いつも 忙[いそが]しいです。", "Buổi sáng lúc nào cũng bận."),
    ("夜", "よる", "buổi tối", "夜[よる]は 星[ほし]が きれいです。", "Buổi tối sao rất đẹp."),
    ("春", "はる", "mùa xuân", "春[はる]に なると 桜[さくら]が 咲[さ]きます。", "Mùa xuân hoa anh đào nở."),
    ("夏", "なつ", "mùa hè", "夏[なつ]は 暑[あつ]いです。", "Mùa hè nóng."),
    ("秋", "あき", "mùa thu", "秋[あき]は 紅葉[こうよう]が きれいです。", "Mùa thu lá đỏ rất đẹp."),
    ("冬", "ふゆ", "mùa đông", "冬[ふゆ]は 雪[ゆき]が 降[ふ]ります。", "Mùa đông có tuyết rơi."),
    ("大きい", "おおきい", "to, lớn", "大[おお]きい 木[き]が あります。", "Có một cái cây to."),
    ("小さい", "ちいさい", "nhỏ", "小[ちい]さい 花[はな]が かわいいです。", "Bông hoa nhỏ thật dễ thương."),
    ("新しい", "あたらしい", "mới", "新[あたら]しい かばんを 買[か]いました。", "Tôi đã mua cặp mới."),
    ("おいしい", "おいしい", "ngon", "この ケーキは おいしいです。", "Bánh này ngon."),
    ("楽しい", "たのしい", "vui", "旅行[りょこう]は 楽[たの]しかったです。", "Chuyến đi đã rất vui."),
    ("静か", "しずか", "yên tĩnh", "この 町[まち]は 静[しず]かです。", "Thị trấn này yên tĩnh."),
    ("元気", "げんき", "khoẻ", "お元気[げんき]ですか。", "Bạn có khoẻ không?"),
    ("赤い", "あかい", "đỏ", "赤[あか]い りんごを 買[か]いました。", "Tôi đã mua táo đỏ."),
    ("青い", "あおい", "xanh", "青[あお]い 空[そら]が 好[す]きです。", "Tôi thích bầu trời xanh."),
    ("白い", "しろい", "trắng", "白[しろ]い 猫[ねこ]が います。", "Có một con mèo trắng."),
    ("高い", "たかい", "cao, đắt", "この 時計[とけい]は 高[たか]いです。", "Cái đồng hồ này đắt."),
    ("安い", "やすい", "rẻ", "この 店[みせ]は 安[やす]いです。", "Cửa hàng này rẻ."),
    ("近い", "ちかい", "gần", "学校[がっこう]は 家[いえ]から 近[ちか]いです。", "Trường gần nhà."),
    ("遠い", "とおい", "xa", "海[うみ]は 少[すこ]し 遠[とお]いです。", "Biển hơi xa."),
    ("暑い", "あつい", "nóng", "今日[きょう]は とても 暑[あつ]いです。", "Hôm nay rất nóng."),
    ("寒い", "さむい", "lạnh", "朝[あさ]は 寒[さむ]かったです。", "Buổi sáng đã lạnh."),
    ("忙しい", "いそがしい", "bận", "今週[こんしゅう]は 忙[いそが]しいです。", "Tuần này tôi bận."),
    ("好き", "すき", "thích", "私[わたし]は 歌[うた]が 好[す]きです。", "Tôi thích hát."),
    ("上手", "じょうず", "giỏi", "姉[あね]は 料理[りょうり]が 上手[じょうず]です。", "Chị tôi nấu ăn giỏi."),
    ("写真", "しゃしん", "ảnh", "公園[こうえん]で 写真[しゃしん]を 撮[と]りました。", "Tôi chụp ảnh ở công viên."),
    ("手紙", "てがみ", "lá thư", "祖母[そぼ]から 手紙[てがみ]が 来[き]ました。", "Bà gửi thư cho tôi."),
    ("映画", "えいが", "phim", "この 映画[えいが]は おもしろいです。", "Phim này hay."),
    ("音楽", "おんがく", "âm nhạc", "静[しず]かな 音楽[おんがく]を 聞[き]きます。", "Tôi nghe nhạc nhẹ."),
    ("旅行", "りょこう", "du lịch", "来月[らいげつ] 京都[きょうと]へ 旅行[りょこう]します。", "Tháng sau tôi đi Kyoto."),
    ("買い物", "かいもの", "mua sắm", "週末[しゅうまつ]に 買[か]い物[もの]に 行[い]きます。", "Cuối tuần tôi đi mua sắm."),
    ("散歩", "さんぽ", "đi dạo", "夕方[ゆうがた] 川[かわ]の そばを 散歩[さんぽ]します。", "Chiều tôi đi dạo ven sông."),
    ("宿題", "しゅくだい", "bài tập", "宿題[しゅくだい]は もう 終[お]わりました。", "Bài tập đã xong rồi."),
    ("教室", "きょうしつ", "lớp học", "教室[きょうしつ]に 学生[がくせい]が 十人[じゅうにん] います。", "Trong lớp có 10 học sinh."),
    ("自転車", "じてんしゃ", "xe đạp", "自転車[じてんしゃ]で 駅[えき]まで 行[い]きます。", "Tôi đi xe đạp ra ga."),
    ("切符", "きっぷ", "vé", "切符[きっぷ]を 二枚[にまい] 買[か]いました。", "Tôi đã mua hai vé."),
    ("お金", "おかね", "tiền", "お金[かね]が 少[すこ]し あります。", "Tôi có một ít tiền."),
    ("誕生日", "たんじょうび", "sinh nhật", "誕生日[たんじょうび]は 五月[ごがつ]です。", "Sinh nhật tôi vào tháng 5."),
    ("休み", "やすみ", "ngày nghỉ", "あしたは 休[やす]みです。", "Ngày mai là ngày nghỉ."),
    ("毎日", "まいにち", "mỗi ngày", "毎日[まいにち] 日本語[にほんご]を 勉強[べんきょう]します。", "Ngày nào tôi cũng học tiếng Nhật."),
    ("今日", "きょう", "hôm nay", "今日[きょう]は 何[なん]曜日[ようび]ですか。", "Hôm nay là thứ mấy?"),
    ("明日", "あした", "ngày mai", "明日[あした] 友達[ともだち]に 会[あ]います。", "Ngày mai tôi gặp bạn."),
    ("昨日", "きのう", "hôm qua", "昨日[きのう]は 雨[あめ]でした。", "Hôm qua trời mưa."),
]
KANJI = [("日", "NHẬT", "mặt trời, ngày"), ("月", "NGUYỆT", "mặt trăng, tháng"), ("火", "HOẢ", "lửa"), ("水", "THUỶ", "nước"),
         ("木", "MỘC", "cây"), ("金", "KIM", "vàng, tiền"), ("土", "THỔ", "đất"), ("山", "SƠN", "núi"),
         ("川", "XUYÊN", "sông"), ("田", "ĐIỀN", "ruộng"), ("人", "NHÂN", "người"), ("口", "KHẨU", "miệng"),
         ("目", "MỤC", "mắt"), ("耳", "NHĨ", "tai"), ("手", "THỦ", "tay"), ("花", "HOA", "hoa")]


def tone(path, secs=1.2, freq=440):
    with wave.open(path, "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(16000)
        w.writeframes(b"".join(struct.pack("<h", int(6000 * math.sin(2 * math.pi * freq * i / 16000))) for i in range(int(16000 * secs))))


def model(col, name, fields, front, back):
    mm = col.models
    m = mm.new(name)
    for f in fields:
        mm.add_field(m, mm.new_field(f))
    t = mm.new_template("Thẻ 1")
    t["qfmt"] = front
    t["afmt"] = "{{FrontSide}}<hr id=answer>" + back
    mm.add_template(m, t)
    mm.add(m)
    return mm.by_name(name)


def build(path):
    if os.path.exists(path):
        os.remove(path)
    col = Collection(path)
    col.crt = col.crt - DAYS_BACK * 86400
    voc = model(col, "Từ vựng tiếng Nhật", ["Từ", "Cách đọc", "Nghĩa", "Câu ví dụ", "Dịch câu ví dụ", "Audio câu ví dụ"],
                '<div style="font-size:42px">{{Từ}}</div>',
                '<div style="font-size:24px">{{furigana:Cách đọc}}</div><div>{{Nghĩa}}</div><div>{{furigana:Câu ví dụ}}</div>'
                '<div style="color:#888">{{Dịch câu ví dụ}}</div>{{Audio câu ví dụ}}')
    kan = model(col, "Chữ Hán", ["Kanji", "Hán Việt", "Nghĩa"], '<div style="font-size:64px">{{Kanji}}</div>',
                "<div>{{Hán Việt}}</div><div>{{Nghĩa}}</div>")
    eng = model(col, "English vocabulary", ["Word", "IPA", "Meaning", "Example", "Example meaning"],
                '<div style="font-size:36px">{{Word}}</div>', "<div>{{IPA}}</div><div>{{Meaning}}</div><div>{{Example}}</div>")
    media = col.media.dir()
    d_n5 = col.decks.id("Tiếng Nhật::N5 · Từ vựng")
    d_kan = col.decks.id("Tiếng Nhật::N5 · Chữ Hán")
    d_en = col.decks.id("Tiếng Anh::A2")
    for i, (w, r, mean, ex, tr) in enumerate(N5):
        n = col.new_note(voc)
        n["Từ"], n["Cách đọc"], n["Nghĩa"], n["Câu ví dụ"], n["Dịch câu ví dụ"] = w, r, mean, ex, tr
        fn = "kbdemo_ex_%02d.wav" % i
        tone(os.path.join(media, fn), 1.2, 420 + 7 * i)
        n["Audio câu ví dụ"] = "[sound:%s]" % fn
        col.add_note(n, d_n5)
    for ch, hv, mean in KANJI:
        n = col.new_note(kan)
        n["Kanji"], n["Hán Việt"], n["Nghĩa"] = ch, hv, mean
        col.add_note(n, d_kan)
    raw = json.load(open(os.path.join(HERE, "..", "fixtures", "en_deck_a2.json"), encoding="utf-8"))
    for w, ipa, mean in raw["tu_vung"][:40]:
        n = col.new_note(eng)
        n["Word"], n["IPA"], n["Meaning"] = w, ipa, mean
        col.add_note(n, d_en)

    today = col.sched.today
    rnd = random.Random(1228)
    now = int(time.time())

    def setcard(cid, kind, ivl=0, due_in=0):
        if kind == "new":
            return
        if kind == "learn":
            col.db.execute("update cards set type=1, queue=1, due=?, left=1001, reps=1, ivl=0 where id=?", now + 600, cid)
            return
        col.db.execute("update cards set type=2, queue=2, ivl=?, due=?, factor=2500, reps=?, lapses=0, left=0 where id=?",
                       ivl, today + due_in, 3 + ivl // 10, cid)

    # N5: 90 thẻ → 10 hạt giống, 5 mầm (đang học), 14 mầm (ivl 1–2), 25 cây non, 24 ra hoa, 12 ra quả; 16 thẻ đến hạn hôm nay
    cids = col.find_cards('deck:"Tiếng Nhật::N5 · Từ vựng"', order="c.id")
    plan = (["new"] * 10 + ["learn"] * 5 + [("rev", rnd.randint(1, 2))] * 14 + [("rev", rnd.randint(4, 19)) for _ in range(25)]
            + [("rev", rnd.randint(22, 80)) for _ in range(24)] + [("rev", rnd.randint(95, 200)) for _ in range(12)])
    assert len(plan) == len(cids), (len(plan), len(cids))
    order = list(range(len(cids)))
    rnd.shuffle(order)
    due_today = set(rnd.sample([k for k in range(len(plan)) if not isinstance(plan[k], str)], 16))
    for k, idx in enumerate(order):
        p = plan[k]
        if isinstance(p, str):
            setcard(cids[idx], p)
        else:
            ivl = p[1]
            setcard(cids[idx], "rev", ivl, 0 if k in due_today else rnd.randint(1, max(1, ivl)))
    # chữ Hán: đa số đã thuộc
    for k, cid in enumerate(col.find_cards('deck:"Tiếng Nhật::N5 · Chữ Hán"', order="c.id")):
        setcard(cid, "rev", [3, 8, 15, 30, 45, 60, 100, 130][k % 8], 0 if k % 5 == 0 else 1 + k)
    # tiếng Anh: nửa đã học
    for k, cid in enumerate(col.find_cards('deck:"Tiếng Anh::A2"', order="c.id")):
        if k % 2:
            setcard(cid, "rev", 2 + (k * 7) % 60, 0 if k % 7 == 0 else 1 + k % 9)

    # revlog 90 ngày: chuỗi 23 ngày gần nhất không nghỉ, trước đó có vài ngày nghỉ (Lịch hoa có ô trống)
    all_cids = col.db.list("select id from cards where type = 2")
    rows = []
    for back in range(0, 91):
        if back > 23 and rnd.random() < 0.2:
            continue
        n = 18 if back == 0 else rnd.randint(12, 48)      # hôm nay đã ôn 18 lượt (thẻ Hôm nay 18/30)
        day0 = now - 3600 - n * 40 if back == 0 else (now // 86400 - back) * 86400 + 12 * 3600
        for j in range(n):
            ts = (day0 + j * 40) * 1000 + rnd.randint(0, 999)
            cid = rnd.choice(all_cids)
            ease = 3 if rnd.random() > 0.12 else 1
            rows.append((ts, cid, -1, ease, rnd.randint(1, 60), rnd.randint(1, 30), 2500, rnd.randint(3000, 15000), 1))
    col.db.executemany("insert or ignore into revlog (id, cid, usn, ease, ivl, lastIvl, factor, time, type) values (?,?,?,?,?,?,?,?,?)", rows)
    col.set_config("curDeck", d_n5)
    col.close()


if __name__ == "__main__":
    build(sys.argv[1])
    print("ok", sys.argv[1])
