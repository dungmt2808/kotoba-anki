"""ことば畑 1.30 — sinh hoạt của StackChan trong nhà, ngoài sân và ở các vùng (thuần Python, không import anki / aqt).

Người dùng (13/11): "muốn có thêm phần sinh hoạt trong nhà và ngoài nhà (ưu tiên trong nhà) … đồ trang trí có hành vi hoặc
sinh hoạt theo đồ nội thất (tối mấy giờ thì ngủ, đọc sách nấu ăn), sáng thì pha trà, tưới cây … mỗi vùng có hoạt động gì
đặc trưng không, như tắm suối nước nóng, tắm biển, chứ mua vùng về chỉ để ngắm thì hơi phí".

- StackChan (linh vật) sống trong vườn: theo giờ của vườn + đồ đã đặt + vùng đã mở, cậu ấy tự làm một việc — ngủ trên
  giường lúc khuya, nấu ăn giờ cơm, pha trà buổi sáng, đọc sách buổi tối, tắm suối nước nóng, bơi ở Bãi biển…
- Python giữ danh mục (việc nào cần món nào, ở đâu, giờ nào, tháng nào) và sổ "Sinh hoạt" (ngày thấy lần đầu). JS
  (web/life.js) chọn việc theo giờ / thời tiết của trời đang hiện, vẽ, và khi người dùng đã thấy ≥ 1,5 giây trên cảnh đang
  xem thì gửi `life:seen:<việc>:<cảnh>`; Python xét lại việc có làm được ở cảnh đó không (đồ / vùng / tháng) rồi mới ghi.
- Mỗi việc có một câu tiếng Nhật (thể từ điển) + cách đọc + nghĩa: bấm vào StackChan để xem.
- Luật "FOMO lành mạnh": không xu, không chuỗi, không đếm ngược, lỡ không mất gì (hôm sau cùng giờ lại có), tắt được
  (chung nút với thú nuôi / khách).

Sổ ở khoá collection `kotoba_batake_life` (đồng bộ AnkiWeb; bản ≤ 1.28 không đọc khoá này nên không xoá):
  {"v": 1, "seen": {id việc: {"d": ngày thấy lần đầu, "s": cảnh, "n": số ngày đã thấy, "l": ngày gần nhất}}}
Khoá / việc lạ của bản sau giữ nguyên khi ghi. Sao lưu `user_files/life.json` (chỉ đọc khi không có collection)."""
from __future__ import annotations

import datetime as _dt
import json
import os
import re
from typing import Any, Callable

LIFE_KEY = "kotoba_batake_life"
ROOMS = ("room", "kitchen", "bedroom")
ZONES = ("beach", "shrine", "festival", "bamboo", "onsen", "station")
OUTDOOR = ("yard",) + ZONES
SCENE_RE = re.compile(r"^(yard|room|kitchen|bedroom|beach|shrine|festival|bamboo|onsen|station|u[1-9]\d?)$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
MAX_DAYS = 100000
ALL_DAY = ((0.0, 24.0),)
WX = ("any", "dry", "rain", "snow", "nosnow")
COLD = (10, 11, 12, 1, 2, 3)

# Nhóm trong sổ Sinh hoạt (thứ tự hiện)
GROUPS = (("home", "Trong nhà"), ("yard", "Sân vườn"), ("beach", "Bãi biển"), ("shrine", "Đền trên núi"),
          ("festival", "Phố lễ hội"), ("bamboo", "Rừng tre"), ("onsen", "Suối nước nóng"), ("station", "Ga làng quê"))
GROUP_NAMES = dict(GROUPS)

# Việc (thứ tự = thứ tự trong sổ). Các trường:
#   name: tên tiếng Việt · ja / kana / vi: câu tiếng Nhật, cách đọc, nghĩa
#   where: "home" (ba gian trong nhà) / "yard" / id vùng / "out" (mọi cảnh ngoài trời, cả vùng tự tạo)
#   need: cần một trong các món này đặt ở cảnh đó (StackChan đứng cạnh món đó); không có = không cần đồ
#   pet: cần có thú nuôi đang ở trong nhà · hours: các khoảng giờ [từ, đến) · months: tháng (None = quanh năm)
#   wx: any / dry (không mưa, không tuyết) / rain / snow / nosnow · w: trọng số khi chọn
#   pose / prop / at: tư thế, đồ cầm tay, chỗ đứng so với món đồ (JS dùng: front / on / side / window / spot / roam…)
ACTS: dict[str, dict[str, Any]] = {
    # ---------------------------------------------------------------- trong nhà
    "neru": {"name": "Ngủ", "ja": "寝る", "kana": "ねる", "vi": "ngủ", "where": "home", "need": ("beddo", "futon"),
             "hours": ((22.5, 24.0), (0.0, 5.5)), "w": 200, "pose": "sleep", "at": "on"},
    "taisou": {"name": "Tập thể dục sáng", "ja": "体操をする", "kana": "たいそうをする", "vi": "tập thể dục", "where": "home",
               "hours": ((5.5, 7.0),), "w": 14, "pose": "stretch", "at": "spot"},
    "kagami": {"name": "Soi gương", "ja": "鏡を見る", "kana": "かがみをみる", "vi": "soi gương", "where": "home",
               "need": ("kyodai",), "hours": ((6.0, 8.0), (21.0, 22.5)), "w": 12, "pose": "stand", "at": "front"},
    "kigaeru": {"name": "Thay đồ", "ja": "着替える", "kana": "きがえる", "vi": "thay quần áo", "where": "home",
                "need": ("tansu",), "hours": ((6.0, 8.0), (21.0, 22.5)), "w": 10, "pose": "reach", "at": "front"},
    "ocha": {"name": "Pha trà", "ja": "お茶を入れる", "kana": "おちゃをいれる", "vi": "pha trà", "where": "home",
             "need": ("tea", "tetsubin"), "hours": ((6.0, 9.5), (14.5, 16.5)), "w": 18, "pose": "hold", "prop": "cup", "at": "side"},
    "gohan": {"name": "Nấu cơm", "ja": "ご飯を炊く", "kana": "ごはんをたく", "vi": "nấu cơm", "where": "home",
              "need": ("suihanki",), "hours": ((6.0, 7.5), (11.0, 12.0), (17.0, 18.5)), "w": 16, "pose": "reach", "at": "side"},
    "ryouri": {"name": "Nấu ăn", "ja": "料理を作る", "kana": "りょうりをつくる", "vi": "nấu ăn", "where": "home",
               "need": ("nagashi", "irori"), "hours": ((6.5, 8.0), (11.0, 12.5), (17.5, 19.5)), "w": 30, "pose": "cook",
               "prop": "ladle", "at": "side"},
    "taberu": {"name": "Ăn cơm", "ja": "ご飯を食べる", "kana": "ごはんをたべる", "vi": "ăn cơm", "where": "home",
               "need": ("shokutaku", "kotatsu"), "hours": ((7.0, 8.5), (12.0, 13.0), (18.5, 20.0)), "w": 30, "pose": "eat",
               "prop": "bowl", "at": "side"},
    "arau": {"name": "Rửa bát", "ja": "皿を洗う", "kana": "さらをあらう", "vi": "rửa bát", "where": "home",
             "need": ("nagashi",), "hours": ((8.0, 9.0), (13.0, 14.0), (20.0, 21.0)), "w": 14, "pose": "cook", "at": "side"},
    "oyatsu": {"name": "Ăn quà vặt", "ja": "おやつを食べる", "kana": "おやつをたべる", "vi": "ăn quà vặt", "where": "home",
               "need": ("reizouko",), "hours": ((10.0, 11.0), (15.0, 16.0), (20.5, 21.5)), "w": 12, "pose": "hold",
               "prop": "snack", "at": "side"},
    "mizuyari": {"name": "Tưới cây", "ja": "花に水をやる", "kana": "はなにみずをやる", "vi": "tưới hoa", "where": "home",
                 "need": ("plant", "ikebana"), "hours": ((6.5, 10.0),), "w": 18, "pose": "hold", "prop": "can", "at": "side"},
    "souji": {"name": "Quét nhà", "ja": "掃除をする", "kana": "そうじをする", "vi": "dọn dẹp", "where": "home",
              "hours": ((8.5, 11.0),), "w": 9, "pose": "sweep", "prop": "broom", "at": "roam"},
    "benkyou": {"name": "Học bài", "ja": "勉強する", "kana": "べんきょうする", "vi": "học bài", "where": "home",
                "need": ("desk",), "hours": ((9.0, 11.5), (14.0, 17.0), (19.5, 21.0)), "w": 16, "pose": "read",
                "prop": "pencil", "at": "side"},
    "hon": {"name": "Đọc sách", "ja": "本を読む", "kana": "ほんをよむ", "vi": "đọc sách", "where": "home",
            "need": ("shelf",), "hours": ((9.0, 11.0), (13.0, 17.0), (19.5, 22.5)), "w": 16, "pose": "read", "prop": "book",
            "at": "side"},
    "shinbun": {"name": "Đọc báo", "ja": "新聞を読む", "kana": "しんぶんをよむ", "vi": "đọc báo", "where": "home",
                "hours": ((6.5, 9.0),), "w": 8, "pose": "read", "prop": "paper", "at": "spot"},
    "terebi": {"name": "Xem TV", "ja": "テレビを見る", "kana": "テレビをみる", "vi": "xem ti vi", "where": "home",
               "need": ("tv",), "hours": ((12.0, 13.5), (19.0, 22.5)), "w": 16, "pose": "sit", "at": "side"},
    "rajio": {"name": "Nghe radio", "ja": "ラジオを聞く", "kana": "ラジオをきく", "vi": "nghe radio", "where": "home",
              "need": ("radio",), "hours": ((6.5, 9.0), (15.0, 18.0)), "w": 12, "pose": "sit", "at": "side"},
    "gakki": {"name": "Chơi đàn", "ja": "楽器を弾く", "kana": "がっきをひく", "vi": "chơi nhạc cụ", "where": "home",
              "need": ("koto", "shamisen"), "hours": ((10.0, 11.5), (15.0, 17.5), (19.5, 21.0)), "w": 14, "pose": "cook",
              "at": "front"},
    "esa": {"name": "Cho cá ăn", "ja": "魚にえさをやる", "kana": "さかなにえさをやる", "vi": "cho cá ăn", "where": "home",
            "need": ("aquarium",), "hours": ((7.5, 9.0), (16.0, 18.0)), "w": 12, "pose": "reach", "at": "side"},
    "hi": {"name": "Sưởi lửa", "ja": "火にあたる", "kana": "ひにあたる", "vi": "sưởi lửa", "where": "home",
           "need": ("irori",), "hours": ((19.5, 22.5), (5.5, 6.5)), "w": 14, "pose": "sit", "at": "side"},
    "kotatsu": {"name": "Ngồi bàn sưởi", "ja": "こたつに入る", "kana": "こたつにはいる", "vi": "ngồi vào bàn sưởi kotatsu",
                "where": "home", "need": ("kotatsu",), "hours": ((15.0, 17.0), (20.0, 22.5)), "months": COLD, "w": 16,
                "pose": "eat", "prop": "mikan", "at": "side"},
    "hirune": {"name": "Ngủ trưa", "ja": "昼寝をする", "kana": "ひるねをする", "vi": "ngủ trưa", "where": "home",
               "need": ("futon", "beddo", "dakimakura", "rug", "kotatsu"), "hours": ((13.0, 14.5),), "w": 18, "pose": "sleep",
               "at": "on"},
    "denki": {"name": "Bật đèn", "ja": "電気をつける", "kana": "でんきをつける", "vi": "bật đèn", "where": "home",
              "need": ("lamp", "andon", "nightlamp"), "hours": ((17.5, 19.0),), "w": 12, "pose": "reach", "at": "side"},
    "karenda": {"name": "Xem lịch", "ja": "カレンダーを見る", "kana": "カレンダーをみる", "vi": "xem lịch", "where": "home",
                "need": ("calendar",), "hours": ((6.0, 8.5),), "w": 8, "pose": "stand", "at": "front"},
    "e": {"name": "Ngắm tranh", "ja": "絵を見る", "kana": "えをみる", "vi": "ngắm tranh", "where": "home",
          "need": ("painting", "ukiyoe", "kakejiku", "byobu"), "hours": ((10.0, 17.0),), "w": 6, "pose": "stand", "at": "front"},
    "nikki": {"name": "Viết nhật ký", "ja": "日記を書く", "kana": "にっきをかく", "vi": "viết nhật ký", "where": "home",
              "need": ("desk",), "hours": ((21.0, 22.5),), "w": 22, "pose": "read", "prop": "pencil", "at": "side"},
    "asobu": {"name": "Chơi với thú cưng", "ja": "ペットと遊ぶ", "kana": "ペットとあそぶ", "vi": "chơi với thú cưng",
              "where": "home", "pet": True, "hours": ((9.0, 12.0), (14.0, 19.0)), "w": 12, "pose": "wave", "at": "pet"},
    "ame": {"name": "Nghe mưa", "ja": "雨の音を聞く", "kana": "あめのおとをきく", "vi": "nghe tiếng mưa", "where": "home",
            "hours": ((6.0, 22.5),), "wx": "rain", "w": 20, "pose": "sit", "at": "window"},
    "mado": {"name": "Ngắm ngoài cửa sổ", "ja": "外を見る", "kana": "そとをみる", "vi": "nhìn ra ngoài", "where": "home",
             "hours": ((7.0, 20.0),), "w": 4, "pose": "stand", "at": "window"},
    # ---------------------------------------------------------------- sân vườn
    "niwa": {"name": "Tưới vườn", "ja": "庭に水をまく", "kana": "にわにみずをまく", "vi": "tưới nước cho vườn", "where": "yard",
             "need": ("flowers", "sunflower", "bonsai", "hoagiay", "sakura", "momiji"), "hours": ((6.0, 9.0), (16.5, 18.0)),
             "wx": "dry", "w": 14, "pose": "hold", "prop": "can", "at": "side"},
    "tegami": {"name": "Lấy thư", "ja": "手紙を取る", "kana": "てがみをとる", "vi": "lấy thư", "where": "yard",
               "need": ("mailbox", "posuto"), "hours": ((6.5, 8.5),), "w": 10, "pose": "reach", "at": "side"},
    "benchi": {"name": "Ngồi ghế nghỉ", "ja": "ベンチで休む", "kana": "ベンチでやすむ", "vi": "nghỉ trên ghế dài", "where": "yard",
               "need": ("bench",), "hours": ((10.0, 17.5),), "wx": "dry", "w": 8, "pose": "sit", "at": "on"},
    "buranko": {"name": "Chơi xích đu", "ja": "ブランコに乗る", "kana": "ブランコにのる", "vi": "chơi xích đu", "where": "yard",
                "need": ("swing",), "hours": ((15.0, 18.0),), "wx": "dry", "w": 8, "pose": "sit", "at": "front"},
    "koi": {"name": "Cho cá koi ăn", "ja": "鯉にえさをやる", "kana": "こいにえさをやる", "vi": "cho cá chép ăn", "where": "yard",
            "need": ("pond",), "hours": ((7.0, 9.5), (15.5, 17.5)), "w": 8, "pose": "reach", "at": "side"},
    "mizukumi": {"name": "Múc nước", "ja": "水をくむ", "kana": "みずをくむ", "vi": "múc nước", "where": "yard",
                 "need": ("well", "luunuoc"), "hours": ((6.0, 8.0),), "w": 8, "pose": "reach", "prop": "bucket", "at": "side"},
    "ochiba": {"name": "Quét lá rụng", "ja": "落ち葉を掃く", "kana": "おちばをはく", "vi": "quét lá rụng", "where": "yard",
               "hours": ((8.0, 11.0), (15.0, 17.0)), "months": (10, 11, 12), "wx": "dry", "w": 8, "pose": "sweep",
               "prop": "broom", "at": "roam"},
    "akari": {"name": "Thắp đèn", "ja": "明かりをつける", "kana": "あかりをつける", "vi": "thắp đèn", "where": "yard",
              "need": ("lantern", "chochin", "takeakari", "kingyochochin", "denkeoquan"), "hours": ((17.5, 19.0),), "w": 10,
              "pose": "reach", "at": "side"},
    "hanami": {"name": "Ngắm hoa anh đào", "ja": "花見をする", "kana": "はなみをする", "vi": "ngắm hoa anh đào", "where": "yard",
               "need": ("sakura",), "hours": ((10.0, 17.0),), "months": (3, 4), "wx": "dry", "w": 16, "pose": "eat",
               "prop": "dango", "at": "front"},
    "yukidaruma": {"name": "Đắp người tuyết", "ja": "雪だるまを作る", "kana": "ゆきだるまをつくる", "vi": "đắp người tuyết",
                   "where": "yard", "hours": ((8.0, 17.0),), "wx": "snow", "w": 30, "pose": "cook", "prop": "snowman",
                   "at": "spot"},
    "hoshi": {"name": "Ngắm sao", "ja": "星を見る", "kana": "ほしをみる", "vi": "ngắm sao", "where": "yard",
              "hours": ((20.0, 22.5),), "wx": "dry", "w": 6, "pose": "sit", "at": "spot"},
    "ashiyu": {"name": "Ngâm chân", "ja": "足湯に入る", "kana": "あしゆにはいる", "vi": "ngâm chân nước nóng", "where": "out",
               "need": ("ashiyu",), "hours": ((8.0, 21.5),), "w": 10, "pose": "sit", "at": "on"},
    # ---------------------------------------------------------------- Bãi biển
    "oyogu": {"name": "Tắm biển", "ja": "海で泳ぐ", "kana": "うみでおよぐ", "vi": "bơi ở biển", "where": "beach",
              "hours": ((9.0, 17.0),), "wx": "dry", "w": 16, "pose": "swim", "prop": "ring", "at": "sea"},
    "suna": {"name": "Xây lâu đài cát", "ja": "砂の城を作る", "kana": "すなのしろをつくる", "vi": "xây lâu đài cát",
             "where": "beach", "hours": ((9.0, 17.0),), "wx": "dry", "w": 8, "pose": "cook", "prop": "sand", "at": "spot"},
    "tsuri": {"name": "Câu cá", "ja": "魚を釣る", "kana": "さかなをつる", "vi": "câu cá", "where": "beach",
              "hours": ((5.5, 9.0), (16.0, 19.0)), "wx": "nosnow", "w": 10, "pose": "hold", "prop": "rod", "at": "shore"},
    "yuuhi": {"name": "Ngắm hoàng hôn", "ja": "夕日を見る", "kana": "ゆうひをみる", "vi": "ngắm mặt trời lặn", "where": "beach",
              "hours": ((17.0, 19.2),), "wx": "dry", "w": 18, "pose": "sit", "at": "shore"},
    "parasoru": {"name": "Nghỉ dưới ô", "ja": "パラソルの下で休む", "kana": "パラソルのしたでやすむ", "vi": "nghỉ dưới ô che nắng",
                 "where": "beach", "need": ("parasol",), "hours": ((11.0, 15.0),), "wx": "dry", "w": 10, "pose": "sleep",
                 "at": "front"},
    # ---------------------------------------------------------------- Đền trên núi
    "omairi": {"name": "Viếng đền", "ja": "お参りする", "kana": "おまいりする", "vi": "viếng đền, cầu nguyện", "where": "shrine",
               "hours": ((6.0, 18.5),), "w": 14, "pose": "pray", "at": "spot"},
    "te": {"name": "Rửa tay", "ja": "手を洗う", "kana": "てをあらう", "vi": "rửa tay", "where": "shrine",
           "need": ("temizuya",), "hours": ((6.0, 18.5),), "w": 8, "pose": "reach", "at": "side"},
    "suzu": {"name": "Rung chuông đền", "ja": "鈴を鳴らす", "kana": "すずをならす", "vi": "rung chuông", "where": "shrine",
             "hours": ((6.0, 18.5),), "w": 8, "pose": "reach", "at": "spot"},
    "ema": {"name": "Viết thẻ ước", "ja": "絵馬を書く", "kana": "えまをかく", "vi": "viết thẻ gỗ cầu nguyện", "where": "shrine",
            "need": ("ema",), "hours": ((8.0, 18.0),), "w": 8, "pose": "read", "prop": "pencil", "at": "side"},
    # ---------------------------------------------------------------- Phố lễ hội
    "matsuri": {"name": "Dạo lễ hội", "ja": "お祭りに行く", "kana": "おまつりにいく", "vi": "đi lễ hội", "where": "festival",
                "hours": ((16.0, 22.5),), "w": 10, "pose": "hold", "prop": "fan", "at": "roam"},
    "yatai": {"name": "Ăn ở quầy hàng", "ja": "屋台で食べる", "kana": "やたいでたべる", "vi": "ăn ở quầy hàng rong",
              "where": "festival", "hours": ((16.0, 22.5),), "w": 10, "pose": "hold", "prop": "dango", "at": "spot"},
    "ringoame": {"name": "Ăn kẹo táo", "ja": "りんご飴を食べる", "kana": "りんごあめをたべる", "vi": "ăn kẹo táo",
                 "where": "festival", "need": ("ringoame",), "hours": ((16.0, 22.5),), "w": 10, "pose": "hold",
                 "prop": "apple", "at": "side"},
    "kingyo": {"name": "Vớt cá vàng", "ja": "金魚すくいをする", "kana": "きんぎょすくいをする", "vi": "chơi vớt cá vàng",
               "where": "festival", "need": ("kingyo",), "hours": ((16.0, 22.5),), "w": 10, "pose": "reach", "prop": "poi",
               "at": "side"},
    "taiko": {"name": "Đánh trống", "ja": "太鼓をたたく", "kana": "たいこをたたく", "vi": "đánh trống taiko", "where": "festival",
              "need": ("taiko",), "hours": ((17.0, 21.5),), "w": 10, "pose": "cook", "prop": "bachi", "at": "side"},
    "hanabi": {"name": "Xem pháo hoa", "ja": "花火を見る", "kana": "はなびをみる", "vi": "xem pháo hoa", "where": "festival",
               "need": ("hanabi",), "hours": ((19.5, 22.5),), "wx": "dry", "w": 16, "pose": "sit", "at": "spot"},
    # ---------------------------------------------------------------- Rừng tre
    "sanpo": {"name": "Đi dạo", "ja": "散歩する", "kana": "さんぽする", "vi": "đi dạo", "where": "bamboo",
              "hours": ((6.0, 10.0), (15.0, 18.0)), "wx": "nosnow", "w": 10, "pose": "walk", "at": "roam"},
    "takenoko": {"name": "Đào măng", "ja": "竹の子を掘る", "kana": "たけのこをほる", "vi": "đào măng tre", "where": "bamboo",
                 "hours": ((6.0, 11.0),), "months": (3, 4, 5), "w": 16, "pose": "cook", "prop": "shoot", "at": "spot"},
    "zazen": {"name": "Ngồi thiền", "ja": "座禅を組む", "kana": "ざぜんをくむ", "vi": "ngồi thiền", "where": "bamboo",
              "hours": ((5.5, 8.0), (17.0, 19.0)), "w": 10, "pose": "sit", "at": "spot"},
    "hotaru": {"name": "Ngắm đom đóm", "ja": "蛍を見る", "kana": "ほたるをみる", "vi": "ngắm đom đóm", "where": "bamboo",
               "hours": ((19.5, 22.5),), "months": (5, 6, 7, 8), "wx": "dry", "w": 16, "pose": "sit", "at": "spot"},
    # ---------------------------------------------------------------- Suối nước nóng
    "onsen": {"name": "Tắm suối nước nóng", "ja": "温泉に入る", "kana": "おんせんにはいる", "vi": "tắm suối nước nóng",
              "where": "onsen", "hours": ((6.0, 9.0), (16.0, 22.5)), "w": 20, "pose": "bath", "prop": "towel", "at": "bath"},
    "gyunyu": {"name": "Uống sữa sau khi tắm", "ja": "牛乳を飲む", "kana": "ぎゅうにゅうをのむ", "vi": "uống sữa",
               "where": "onsen", "need": ("milk",), "hours": ((6.0, 9.5), (16.0, 22.5)), "w": 10, "pose": "hold",
               "prop": "milk", "at": "side"},
    "yuki": {"name": "Ngắm tuyết", "ja": "雪を見る", "kana": "ゆきをみる", "vi": "ngắm tuyết rơi", "where": "onsen",
             "hours": ((9.0, 16.0),), "w": 8, "pose": "stand", "at": "spot"},
    # ---------------------------------------------------------------- Ga làng quê
    "densha": {"name": "Đợi tàu", "ja": "電車を待つ", "kana": "でんしゃをまつ", "vi": "đợi tàu điện", "where": "station",
               "hours": ((6.0, 21.5),), "w": 10, "pose": "stand", "at": "spot"},
    "te_furu": {"name": "Vẫy tay chào tàu", "ja": "手を振る", "kana": "てをふる", "vi": "vẫy tay", "where": "station",
                "hours": ((6.0, 21.5),), "w": 8, "pose": "wave", "at": "spot"},
    "jusu": {"name": "Mua nước ở máy", "ja": "ジュースを買う", "kana": "ジュースをかう", "vi": "mua nước ngọt", "where": "station",
             "need": ("vending",), "hours": ((8.0, 21.5),), "w": 8, "pose": "hold", "prop": "can2", "at": "side"},
    "jitensha": {"name": "Lau xe đạp", "ja": "自転車を洗う", "kana": "じてんしゃをあらう", "vi": "rửa xe đạp", "where": "station",
                 "need": ("bicycle",), "hours": ((8.0, 17.0),), "wx": "dry", "w": 8, "pose": "reach", "at": "side"},
}
ORDER = list(ACTS)
POSES = ("stand", "walk", "sit", "sleep", "stretch", "reach", "hold", "cook", "eat", "read", "sweep", "pray", "wave",
         "bath", "swim")
ATS = ("front", "on", "side", "window", "spot", "roam", "pet", "sea", "shore", "bath")
for _k, _a in ACTS.items():
    assert _a["pose"] in POSES and _a["at"] in ATS and _a.get("wx", "any") in WX, _k
    assert _a["where"] in ("home", "yard", "out") or _a["where"] in ZONES, _k


def group_of(aid: str) -> str:
    """Nhóm trong sổ: "out" (đặt đâu cũng được) xếp vào Sân vườn."""
    w = ACTS[aid]["where"]
    return "yard" if w == "out" else w


def is_uzone(scene: Any) -> bool:
    return isinstance(scene, str) and re.fullmatch(r"u[1-9]\d?", scene) is not None


def scene_ok(aid: str, scene: str) -> bool:
    """Việc này làm được ở loại cảnh này không (chưa xét đồ / tháng / đã mở chưa)."""
    a = ACTS.get(aid)
    if not a or not isinstance(scene, str) or not SCENE_RE.match(scene):
        return False
    w = a["where"]
    if w == "home":
        return scene in ROOMS
    if w == "out":
        return scene in OUTDOOR or is_uzone(scene)
    return scene == w


def items_in(home: dict[str, Any], scene: str) -> set[str]:
    out: set[str] = set()
    lst = home.get(scene) if isinstance(home, dict) else None
    for e in lst if isinstance(lst, list) else []:
        if isinstance(e, dict) and isinstance(e.get("id"), str):
            out.add(e["id"])
    return out


def month_ok(aid: str, today: _dt.date) -> bool:
    months = ACTS[aid].get("months")
    return not months or today.month in months


def open_scenes(home: dict[str, Any], room_level: int) -> list[str]:
    """Các cảnh StackChan tới được: sân, các gian đã có, vùng đã mở, vùng tự tạo."""
    home = home if isinstance(home, dict) else {}
    out = ["yard"]
    try:
        house = int(home.get("house") or 0)
    except (TypeError, ValueError):
        house = 0
    if house >= room_level:
        out.append("room")
        rooms = home.get("rooms") if isinstance(home.get("rooms"), list) else []
        out += [r for r in ROOMS[1:] if r in rooms]
    zones = home.get("zones") if isinstance(home.get("zones"), list) else []
    out += [z for z in ZONES if z in zones]
    uz = home.get("uzones") if isinstance(home.get("uzones"), list) else []
    out += [u for u in uz if is_uzone(u)]
    return out


def can_do(aid: str, scene: str, home: dict[str, Any], scenes: list[str], today: _dt.date, pets_home: bool = False) -> bool:
    """Việc này làm được ở cảnh này hôm nay (giờ / thời tiết do JS xét theo trời đang hiện)."""
    if aid not in ACTS or scene not in scenes or not scene_ok(aid, scene) or not month_ok(aid, today):
        return False
    a = ACTS[aid]
    if a.get("pet") and not pets_home:
        return False
    need = a.get("need")
    return not need or bool(items_in(home, scene) & set(need))


def doable(home: dict[str, Any], scenes: list[str], today: _dt.date, pets_home: bool = False) -> dict[str, list[str]]:
    """{cảnh: [việc làm được ở cảnh đó hôm nay]} — gửi JS để chọn theo giờ."""
    out: dict[str, list[str]] = {}
    for sc in scenes:
        lst = [aid for aid in ORDER if can_do(aid, sc, home, scenes, today, pets_home)]
        if lst:
            out[sc] = lst
    return out


# ---- sổ Sinh hoạt ---------------------------------------------------------------------------------------------------

def clean_entry(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    d = raw.get("d")
    if not isinstance(d, str) or not DATE_RE.match(d):
        return None
    try:
        _dt.date.fromisoformat(d)
    except ValueError:
        return None
    out: dict[str, Any] = {"d": d}
    s = raw.get("s")
    out["s"] = s if isinstance(s, str) and SCENE_RE.match(s) else "room"
    last = raw.get("l")
    out["l"] = last if isinstance(last, str) and DATE_RE.match(last) and last >= d else d
    n = raw.get("n", 1)
    out["n"] = max(1, min(MAX_DAYS, n)) if isinstance(n, int) and not isinstance(n, bool) else 1
    return out


def clean_seen(raw: Any) -> dict[str, dict[str, Any]]:
    seen = raw.get("seen") if isinstance(raw, dict) else None
    out: dict[str, dict[str, Any]] = {}
    if isinstance(seen, dict):
        for aid in ORDER:
            e = clean_entry(seen.get(aid))
            if e:
                out[aid] = e
    return out


class LifeStore:
    """Sổ Sinh hoạt ở khoá collection `kotoba_batake_life` (+ khoá lạ của bản sau giữ nguyên)."""

    def __init__(self, path: str, col_getter: Callable[[], Any] | None = None) -> None:
        self.path = path
        self.col_getter = col_getter

    def _col(self) -> Any:
        try:
            return self.col_getter() if self.col_getter else None
        except Exception:
            return None

    def _raw(self) -> dict[str, Any]:
        col = self._col()
        if col is not None:
            try:
                raw = col.get_config(LIFE_KEY, None)
            except Exception:
                raw = None
            return dict(raw) if isinstance(raw, dict) else {}
        try:
            with open(self.path, encoding="utf-8") as f:
                raw = json.load(f)
        except (OSError, ValueError):
            raw = None
        return dict(raw) if isinstance(raw, dict) else {}

    def seen(self) -> dict[str, dict[str, Any]]:
        return clean_seen(self._raw())

    def mark(self, aid: str, scene: str, today: _dt.date) -> tuple[dict[str, dict[str, Any]], bool, bool]:
        """Ghi một lần thấy. Trả (sổ, lần đầu?, có ghi?). Mỗi việc chỉ ghi một lần mỗi ngày (đếm số ngày đã thấy)."""
        raw = self._raw()
        seen = dict(raw.get("seen")) if isinstance(raw.get("seen"), dict) else {}
        ds = today.isoformat()
        cur = clean_entry(seen.get(aid))
        new = cur is None
        if new:
            rec = {"d": ds, "s": scene, "n": 1, "l": ds}
        elif cur["l"] >= ds:
            return clean_seen(raw), False, False
        else:
            rec = dict(cur, n=min(MAX_DAYS, cur["n"] + 1), l=ds)
        old = seen.get(aid) if isinstance(seen.get(aid), dict) else {}
        seen[aid] = dict(old, **rec)           # giữ khoá lạ của bản sau ở mức từng việc
        raw["seen"] = seen
        raw.setdefault("v", 1)
        col = self._col()
        if col is not None:
            col.set_config(LIFE_KEY, raw)
        self._backup(raw)
        return clean_seen(raw), new, True

    def _backup(self, raw: dict[str, Any]) -> None:
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            tmp = self.path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(raw, f, ensure_ascii=False)
            os.replace(tmp, self.path)
        except OSError:
            pass


# ---- dữ liệu gửi JS -------------------------------------------------------------------------------------------------

def _hours_text(hours: Any) -> str:
    def hm(v: float) -> str:
        h, m = int(v), int(round((v - int(v)) * 60))
        return f"{h}:{m:02d}"
    spans = sorted(hours)
    # ghép khoảng qua nửa đêm (22:30–24 + 0–5:30 → 22:30–5:30)
    if len(spans) >= 2 and spans[0][0] == 0.0 and spans[-1][1] == 24.0:
        spans = spans[1:-1] + [(spans[-1][0], spans[0][1])]
    return ", ".join(f"{hm(a)}–{hm(b)}" for a, b in spans)


def hint(aid: str, item_names: dict[str, str] | None = None) -> str:
    """Gợi ý cách gặp một việc (cho sổ): giờ · tháng · thời tiết · món cần."""
    a = ACTS[aid]
    parts = []
    if tuple(a["hours"]) != ALL_DAY:
        parts.append(_hours_text(a["hours"]))
    months = a.get("months")
    if months:
        parts.append("tháng " + ", ".join(str(m) for m in months))
    wx = a.get("wx", "any")
    if wx in ("dry", "rain", "snow"):
        parts.append({"dry": "trời tạnh", "rain": "khi trời mưa", "snow": "khi có tuyết"}[wx])
    need = a.get("need")
    if need:
        names = [(item_names or {}).get(i, i) for i in need]
        parts.append("cần " + " / ".join(names[:3]) + ("…" if len(names) > 3 else ""))
    if a.get("pet"):
        parts.append("cần thú nuôi ở trong nhà")
    return " · ".join(parts)


def defs_view() -> dict[str, dict[str, Any]]:
    out = {}
    for aid in ORDER:
        a = ACTS[aid]
        out[aid] = {"name": a["name"], "ja": a["ja"], "kana": a["kana"], "vi": a["vi"], "where": a["where"],
                    "need": list(a.get("need", ())), "hours": [list(h) for h in a["hours"]], "wx": a.get("wx", "any"),
                    "w": int(a["w"]), "pose": a["pose"], "prop": a.get("prop", ""), "at": a["at"], "pet": bool(a.get("pet"))}
    return out


def view(seen: dict[str, dict[str, Any]], home: dict[str, Any], scenes: list[str], today: _dt.date,
         pets_home: bool = False, item_names: dict[str, str] | None = None) -> dict[str, Any]:
    can = doable(home, scenes, today, pets_home)
    now_ids = {aid for lst in can.values() for aid in lst}
    groups = []
    for gid, gname in GROUPS:
        ids = [aid for aid in ORDER if group_of(aid) == gid]
        opened = gid in ("yard",) or (gid == "home" and "room" in scenes) or gid in scenes
        rows = []
        for aid in ids:
            a, e = ACTS[aid], seen.get(aid)
            rows.append({"id": aid, "name": a["name"], "ja": a["ja"], "kana": a["kana"], "vi": a["vi"],
                         "pose": a["pose"], "prop": a.get("prop", ""), "hint": hint(aid, item_names),
                         "seen": bool(e), "d": e["d"] if e else "", "n": e["n"] if e else 0, "now": aid in now_ids})
        groups.append({"id": gid, "name": gname, "open": bool(opened), "list": rows,
                       "seen": sum(1 for r in rows if r["seen"]), "total": len(rows)})
    return {"defs": defs_view(), "can": can, "groups": groups, "seen": sum(g["seen"] for g in groups),
            "total": len(ORDER), "today": today.isoformat()}


def new_between(seen: dict[str, dict[str, Any]], start: _dt.date, end: _dt.date) -> list[dict[str, str]]:
    """Việc thấy lần đầu trong [start, end] (cho Lịch hoa), theo ngày rồi theo thứ tự sổ."""
    a, b = start.isoformat(), end.isoformat()
    out = [{"id": aid, "name": ACTS[aid]["name"], "ja": ACTS[aid]["ja"], "d": seen[aid]["d"]} for aid in ORDER
           if aid in seen and a <= seen[aid]["d"] <= b]
    return sorted(out, key=lambda x: (x["d"], ORDER.index(x["id"])))
