"""Logic thuần cho ことば畑: dựng dữ liệu khu vườn từ collection Anki.

File này chỉ import `anki` (không import Qt/aqt) để có thể test độc lập.
Nguyên tắc: trạng thái cây luôn được TÍNH RA từ dữ liệu thẻ (FSRS),
không lưu riêng, nên vườn tự đúng trên mọi máy sau khi đồng bộ AnkiWeb.
"""

from __future__ import annotations

import datetime
import html
import hashlib
import json
import os
import re
from typing import Any

from anki.collection import Collection, SearchNode
from anki.utils import ids2str, strip_html

try:   # chạy trong Anki (gói add-on)
    from . import decor_core as decor
    from . import fields_core as fields
    from . import more_core as more
    from . import ngay_core as ngay
    from . import season_core as season
    from . import share_core as share
    from . import text_core as text
except ImportError:   # nạp riêng file này (test): nạp season_core.py / fields_core.py nằm cạnh
    import importlib.util as _ilu

    def _load_side(mod_name: str, file_name: str) -> Any:
        spec = _ilu.spec_from_file_location(mod_name, os.path.join(os.path.dirname(os.path.abspath(__file__)), file_name))
        mod = _ilu.module_from_spec(spec)
        spec.loader.exec_module(mod)
        return mod

    season = _load_side("kotoba_season_core", "season_core.py")
    fields = _load_side("kotoba_fields_core", "fields_core.py")
    more = _load_side("kotoba_more_core", "more_core.py")
    ngay = _load_side("kotoba_ngay_core", "ngay_core.py")
    text = _load_side("kotoba_text_core", "text_core.py")
    share = _load_side("kotoba_share_core", "share_core.py")
    share.more = more
    decor = _load_side("kotoba_decor_core", "decor_core.py")
    decor.more = more

STAGES = ["Hạt giống", "Mầm", "Cây non", "Ra hoa", "Ra quả"]
STAGE_SEED, STAGE_SPROUT, STAGE_SAPLING, STAGE_FLOWER, STAGE_FRUIT = range(5)

CARD_TYPE_NEW = 0
CARD_TYPE_LRN = 1
CARD_TYPE_REV = 2
CARD_TYPE_RELEARNING = 3
QUEUE_SUSPENDED = -1

DEFAULT_CONFIG: dict[str, Any] = {
    "stage_days": [3, 21, 90],
    "wilt_retrievability": 0.7,
    "max_plants": 400,
    "word_field": "",
    "reading_field": "",
    "meaning_field": "",
    "show_tooltips": True,
    "effects": True,
    "sound": True,
    "audio_field": "",
    "game_daily_coins": 40,
    "music": True,
    "music_volume": 0.5,
    "daily_goal": 30,
    "daily_bonus": 15,
    "example_field": "",
    "example_audio_field": "",
    "open_maximized": True,
    "toolbar_button": True,
    "mobile_coins": True,
    "bao_dir": "",
    "ui": {},   # 1.14: giao diện tự chỉnh (more_core.clean_ui)
    "prefs": {},   # 1.25.3: cài đặt riêng máy này (trời & giờ, nhạc, tắt tiếng…; more_core.clean_prefs) — trước ở localStorage
    # 1.12: nguồn báo + báo do Gemini viết (khoá chỉ lưu trên máy này, không đồng bộ)
    "bao_source": "auto",
    "gemini_key": "",
    "gemini_level": "N5",
    "gemini_audio": "chinh_ta",
    "gemini_voice": "Kore",
    "gemini_level_en": "A2",       # 1.19: báo tiếng Anh (CEFR A1–C1)
    "gemini_auto": True,
    "gemini_scope": "auto",
    "gemini_model": "",
    "gemini_tts_model": "",
    "gemini_story": "hay",         # 1.23: Truyện: hay (quy trình mới) / tiet_kiem (như cũ, ít lượt) / tat
    "gemini_story_tone": "am",     # 1.23: Giọng truyện: am / hai / bi_an / phieu_luu
}

GAMES = ("listen", "market", "crow", "memory", "cloze")

# ---------------------------------------------------------------------------
# Nhà & cửa hàng
# ---------------------------------------------------------------------------

HOUSE_LEVELS = [
    ("Bãi đất trống", 0),
    ("Đổ móng", 80),
    ("Dựng khung gỗ", 150),
    ("Xây tường", 250),
    ("Lợp mái", 400),
    ("Lắp cửa & cửa sổ", 550),
    ("Ống khói & bồn hoa", 800),
    ("Gác mái & đèn lồng", 1200),
]
ROOM_UNLOCK_LEVEL = 5
YARD_COLS, YARD_ROWS, HOUSE_COLS = 16, 3, 4
ROOM_COLS, ROOM_ROWS = 10, 4          # hàng 0 của phòng là tường
ROOM_WINDOW = (4, 5)                  # 2 ô tường có cửa sổ
NHA_UNLOCK_LEVEL = len(HOUSE_LEVELS) - 1   # 1.24: xây xong nhà (bước 7) mới mở rộng được

# place: ground (sân) | floor | rug (trải sàn, đồ khác đặt lên được) | wall
CATALOG: dict[str, dict[str, Any]] = {
    # --- sân vườn
    "fence": {"name": "Hàng rào gỗ", "price": 15, "scene": "yard", "w": 1, "place": "ground"},
    "flowers": {"name": "Bụi hoa", "price": 25, "scene": "yard", "w": 1, "place": "ground"},
    "mailbox": {"name": "Hòm thư", "price": 60, "scene": "yard", "w": 1, "place": "ground"},
    "chochin": {"name": "Đèn lồng giấy", "price": 70, "scene": "yard", "w": 1, "place": "ground"},
    "bench": {"name": "Ghế gỗ", "price": 90, "scene": "yard", "w": 1, "place": "ground"},
    "scarecrow": {"name": "Bù nhìn", "price": 100, "scene": "yard", "w": 1, "place": "ground"},
    "lantern": {"name": "Đèn đá tōrō", "price": 140, "scene": "yard", "w": 1, "place": "ground"},
    "bonsai": {"name": "Chậu bonsai", "price": 160, "scene": "yard", "w": 1, "place": "ground"},
    "maneki": {"name": "Mèo vẫy tay", "price": 220, "scene": "yard", "w": 1, "place": "ground"},
    "pond": {"name": "Ao cá koi", "price": 300, "scene": "yard", "w": 2, "place": "ground"},
    "sakura": {"name": "Cây anh đào", "price": 380, "scene": "yard", "w": 2, "place": "ground"},
    "torii": {"name": "Cổng torii", "price": 600, "scene": "yard", "w": 2, "place": "ground"},
    "statue": {"name": "Tượng StackChan vàng", "price": 1000, "scene": "yard", "w": 1, "place": "ground", "max": 1},
    # --- trong nhà
    "plant": {"name": "Chậu cây", "price": 40, "scene": "room", "w": 1, "place": "floor"},
    "lamp": {"name": "Đèn cây", "price": 60, "scene": "room", "w": 1, "place": "floor"},
    "tea": {"name": "Bộ ấm trà", "price": 70, "scene": "room", "w": 1, "place": "floor"},
    "rug": {"name": "Thảm", "price": 80, "scene": "room", "w": 2, "place": "rug"},
    "clock": {"name": "Đồng hồ", "price": 90, "scene": "room", "w": 1, "place": "wall"},
    "painting": {"name": "Tranh núi Phú Sĩ", "price": 120, "scene": "room", "w": 1, "place": "wall"},
    "desk": {"name": "Bàn học", "price": 130, "scene": "room", "w": 1, "place": "floor"},
    "shelf": {"name": "Kệ sách", "price": 160, "scene": "room", "w": 1, "place": "floor"},
    "futon": {"name": "Nệm futon", "price": 200, "scene": "room", "w": 2, "place": "floor"},
    "tv": {"name": "TV cổ", "price": 220, "scene": "room", "w": 1, "place": "floor"},
    "kotatsu": {"name": "Bàn kotatsu", "price": 260, "scene": "room", "w": 2, "place": "floor"},
    "cat": {"name": "Mèo ngủ", "price": 320, "scene": "room", "w": 1, "place": "floor"},
    # --- đồ hiếm: chỉ nhận được từ rương nhiệm vụ hằng ngày
    "koinobori": {"name": "Cờ cá chép koinobori", "price": 0, "scene": "yard", "w": 1, "place": "ground", "rare": True},
    "momiji": {"name": "Cây phong đỏ momiji", "price": 0, "scene": "yard", "w": 2, "place": "ground", "rare": True},
    "tanuki": {"name": "Tượng tanuki", "price": 0, "scene": "yard", "w": 1, "place": "ground", "rare": True},
    "daruma": {"name": "Búp bê daruma", "price": 0, "scene": "room", "w": 1, "place": "floor", "rare": True},
    "kokeshi": {"name": "Búp bê kokeshi", "price": 0, "scene": "room", "w": 1, "place": "floor", "rare": True},
    "furin": {"name": "Chuông gió fūrin", "price": 0, "scene": "room", "w": 1, "place": "wall", "rare": True},
    # --- đồ riêng của các vùng mới (mở khoá vùng mới mua được; đặt ở mọi cảnh ngoài trời)
    "crab": {"name": "Cua đỏ", "price": 90, "scene": "beach", "w": 1, "place": "ground", "zone": "beach"},
    "swimring": {"name": "Phao bơi", "price": 80, "scene": "beach", "w": 1, "place": "ground", "zone": "beach"},
    "parasol": {"name": "Ô che nắng", "price": 120, "scene": "beach", "w": 1, "place": "ground", "zone": "beach"},
    "sandcastle": {"name": "Lâu đài cát", "price": 150, "scene": "beach", "w": 1, "place": "ground", "zone": "beach"},
    "palm": {"name": "Cây dừa", "price": 300, "scene": "beach", "w": 2, "place": "ground", "zone": "beach"},
    "lighthouse": {"name": "Hải đăng mini", "price": 500, "scene": "beach", "w": 1, "place": "ground", "zone": "beach"},
    "ema": {"name": "Giá treo thẻ ema", "price": 120, "scene": "shrine", "w": 1, "place": "ground", "zone": "shrine"},
    "saisen": {"name": "Hòm công đức", "price": 150, "scene": "shrine", "w": 1, "place": "ground", "zone": "shrine"},
    "kitsune": {"name": "Tượng cáo kitsune", "price": 250, "scene": "shrine", "w": 1, "place": "ground", "zone": "shrine"},
    "temizuya": {"name": "Bể rửa tay temizuya", "price": 280, "scene": "shrine", "w": 2, "place": "ground", "zone": "shrine"},
    "cedar": {"name": "Cây tuyết tùng", "price": 300, "scene": "shrine", "w": 2, "place": "ground", "zone": "shrine"},
    "komainu": {"name": "Sư tử đá komainu", "price": 350, "scene": "shrine", "w": 1, "place": "ground", "zone": "shrine"},
    "nobori": {"name": "Cờ lễ hội nobori", "price": 90, "scene": "festival", "w": 1, "place": "ground", "zone": "festival"},
    "omen": {"name": "Quầy mặt nạ", "price": 120, "scene": "festival", "w": 1, "place": "ground", "zone": "festival"},
    "ringoame": {"name": "Quầy kẹo táo", "price": 200, "scene": "festival", "w": 1, "place": "ground", "zone": "festival"},
    "taiko": {"name": "Trống taiko", "price": 250, "scene": "festival", "w": 1, "place": "ground", "zone": "festival"},
    "kingyo": {"name": "Hồ vớt cá vàng", "price": 300, "scene": "festival", "w": 2, "place": "ground", "zone": "festival"},
    "hanabi": {"name": "Giàn pháo hoa", "price": 600, "scene": "festival", "w": 1, "place": "ground", "zone": "festival"},
    # ===== 1.7: đồ mới (lưu ở khoá riêng EXT_KEY để bản cũ ở máy khác không xoá) =====
    # --- sân vườn
    "sunflower": {"name": "Hoa hướng dương", "price": 45, "scene": "yard", "w": 1, "place": "ground",
                  "desc": "Đung đưa trong gió, có ong bay quanh"},
    "kazaguruma": {"name": "Chong chóng gió", "price": 55, "scene": "yard", "w": 1, "place": "ground",
                   "desc": "Quay theo gió, giông thì quay tít"},
    "birdhouse": {"name": "Nhà chim", "price": 110, "scene": "yard", "w": 1, "place": "ground",
                  "desc": "Chim sẻ ló đầu ra ban ngày"},
    "well": {"name": "Giếng nước", "price": 180, "scene": "yard", "w": 1, "place": "ground",
             "desc": "Gàu kéo lên kéo xuống"},
    "swing": {"name": "Xích đu", "price": 240, "scene": "yard", "w": 2, "place": "ground",
              "desc": "Đu đưa nhè nhẹ"},
    "fountain": {"name": "Đài phun nước", "price": 420, "scene": "yard", "w": 2, "place": "ground",
                 "desc": "Phun nước lấp lánh, trời tuyết thì đóng băng"},
    # --- trong nhà
    "ikebana": {"name": "Bình hoa ikebana", "price": 90, "scene": "room", "w": 1, "place": "floor",
                "desc": "Hoa cắm kiểu Nhật"},
    "andon": {"name": "Đèn giấy andon", "price": 110, "scene": "room", "w": 1, "place": "floor",
              "desc": "Toả ánh sáng ấm ban đêm"},
    "radio": {"name": "Radio cổ", "price": 150, "scene": "room", "w": 1, "place": "floor",
              "desc": "Nốt nhạc bay ra"},
    "aquarium": {"name": "Bể cá", "price": 240, "scene": "room", "w": 1, "place": "floor",
                 "desc": "Cá bơi, bong bóng nổi"},
    "irori": {"name": "Bếp lò irori", "price": 340, "scene": "room", "w": 2, "place": "floor",
              "desc": "Lửa bập bùng, ấm nước bốc hơi"},
    "calendar": {"name": "Lịch treo tường", "price": 70, "scene": "room", "w": 1, "place": "wall",
                 "desc": "Hiện đúng ngày hôm nay"},
    "kakejiku": {"name": "Tranh chữ 学", "price": 130, "scene": "room", "w": 1, "place": "wall",
                 "desc": "Tranh cuộn thư pháp chữ “Học”"},
    "ukiyoe": {"name": "Tranh sóng lừng", "price": 200, "scene": "room", "w": 2, "place": "wall",
               "desc": "Tranh khắc gỗ ukiyo-e, sóng chuyển động"},
    # --- vùng Rừng tre
    "bamboofence": {"name": "Rào tre", "price": 30, "scene": "bamboo", "w": 1, "place": "ground", "zone": "bamboo"},
    "takenoko": {"name": "Măng tre", "price": 60, "scene": "bamboo", "w": 1, "place": "ground", "zone": "bamboo",
                 "desc": "Thỉnh thoảng nhú cao thêm"},
    "hotaru": {"name": "Lọ đom đóm", "price": 140, "scene": "bamboo", "w": 1, "place": "ground", "zone": "bamboo",
               "desc": "Đom đóm bay ra ban đêm"},
    "shishiodoshi": {"name": "Ống tre shishi-odoshi", "price": 160, "scene": "bamboo", "w": 1, "place": "ground",
                     "zone": "bamboo", "desc": "Đầy nước thì gõ “cốc” một cái"},
    "sasa": {"name": "Cây tre Tanabata", "price": 220, "scene": "bamboo", "w": 1, "place": "ground", "zone": "bamboo",
             "desc": "Treo thẻ ước nguyện, đung đưa"},
    "panda": {"name": "Gấu trúc", "price": 380, "scene": "bamboo", "w": 1, "place": "ground", "zone": "bamboo",
              "desc": "Ngồi nhai lá tre"},
    # --- vùng Suối nước nóng
    "oke": {"name": "Chồng chậu gỗ", "price": 70, "scene": "onsen", "w": 1, "place": "ground", "zone": "onsen"},
    "yukidaruma": {"name": "Người tuyết", "price": 120, "scene": "onsen", "w": 1, "place": "ground", "zone": "onsen",
                   "desc": "Đội xô, quàng khăn"},
    "noren": {"name": "Rèm noren ゆ", "price": 150, "scene": "onsen", "w": 1, "place": "ground", "zone": "onsen",
              "desc": "Rèm vải bay trong gió"},
    "milk": {"name": "Máy bán sữa", "price": 200, "scene": "onsen", "w": 1, "place": "ground", "zone": "onsen",
             "desc": "Sáng đèn ban đêm"},
    "monkey": {"name": "Khỉ tuyết", "price": 300, "scene": "onsen", "w": 1, "place": "ground", "zone": "onsen",
               "desc": "Đội khăn, ngâm mình thư giãn"},
    "rotenburo": {"name": "Bồn tắm đá", "price": 450, "scene": "onsen", "w": 2, "place": "ground", "zone": "onsen",
                  "desc": "Hơi nước bốc lên nghi ngút"},
    # --- vùng Ga làng quê
    "busstop": {"name": "Trạm xe buýt", "price": 90, "scene": "station", "w": 1, "place": "ground", "zone": "station"},
    "bicycle": {"name": "Xe đạp", "price": 140, "scene": "station", "w": 1, "place": "ground", "zone": "station",
                "desc": "Bánh xe quay khi có gió"},
    "jizo": {"name": "Tượng Jizō", "price": 160, "scene": "station", "w": 1, "place": "ground", "zone": "station",
             "desc": "Tượng đá đội mũ len đỏ"},
    "vending": {"name": "Máy bán nước", "price": 200, "scene": "station", "w": 1, "place": "ground", "zone": "station",
                "desc": "Đèn nhấp nháy, sáng ban đêm"},
    "rice": {"name": "Ruộng lúa nhỏ", "price": 260, "scene": "station", "w": 2, "place": "ground", "zone": "station",
             "desc": "Lúa xanh, sang thu chín vàng"},
    "fumikiri": {"name": "Đèn chắn tàu", "price": 330, "scene": "station", "w": 1, "place": "ground", "zone": "station",
                 "desc": "Nhấp nháy khi tàu chạy qua"},
}
RARE_ORDER = ["koinobori", "daruma", "momiji", "furin", "tanuki", "kokeshi"]
# Danh mục của bản 1.7.0 (chốt lại): đồ ngoài danh sách này là đồ mới của bản sau
V17_ITEMS = frozenset(CATALOG)
# 1.8: đồ theo Mùa & Lễ hội (season_core) — lưu ở khoá riêng SEASON_KEY để bản 1.6.1 / 1.7.0 ở máy khác không xoá
SEASON_ITEMS = season.SEASON_ITEMS
for _k, _v in SEASON_ITEMS.items():
    assert _k not in CATALOG, _k
    CATALOG[_k] = _v

# 1.16: 12 món hiếm mới của rương nhiệm vụ. Lưu cùng tầng SEASON_KEY: bản 1.8–1.15 ở máy khác giữ hộ món lạ ở tầng
# này (keep_foreign_season) nên không xoá; bản ≤ 1.7 không đọc tầng này.
RARE_116: dict[str, dict[str, Any]] = {
    "shika": {"name": "Hươu Nara", "price": 0, "scene": "yard", "w": 1, "place": "ground", "rare": True,
              "desc": "Thỉnh thoảng cúi đầu chào"},
    "kabuto": {"name": "Mũ giáp kabuto", "price": 0, "scene": "room", "w": 1, "place": "floor", "rare": True,
               "desc": "Sừng vàng loé sáng"},
    "taikobashi": {"name": "Cầu cong đỏ", "price": 0, "scene": "yard", "w": 2, "place": "ground", "rare": True,
                   "desc": "Suối nhỏ lấp lánh chảy dưới cầu"},
    "kitsunemen": {"name": "Mặt nạ cáo", "price": 0, "scene": "room", "w": 1, "place": "wall", "rare": True,
                   "desc": "Treo tường, đêm có lửa cáo"},
    "pagoda": {"name": "Tháp chùa năm tầng", "price": 0, "scene": "yard", "w": 1, "place": "ground", "rare": True,
               "desc": "Chuông góc mái rung, đêm sáng đèn"},
    "koto": {"name": "Đàn koto", "price": 0, "scene": "room", "w": 2, "place": "floor", "rare": True,
             "desc": "Nốt nhạc bay ra"},
    "yatai": {"name": "Quầy mì yatai", "price": 0, "scene": "yard", "w": 2, "place": "ground", "rare": True,
              "desc": "Nồi mì bốc khói, đèn lồng sáng ban đêm"},
    "shamisen": {"name": "Đàn shamisen", "price": 0, "scene": "room", "w": 1, "place": "wall", "rare": True,
                 "desc": "Treo tường, thỉnh thoảng tự ngân"},
    "kappa": {"name": "Kappa", "price": 0, "scene": "yard", "w": 1, "place": "ground", "rare": True,
              "desc": "Yêu quái sông hiền lành, ôm quả dưa leo, hay chớp mắt"},
    "byobu": {"name": "Bình phong hạc", "price": 0, "scene": "room", "w": 2, "place": "floor", "rare": True,
              "desc": "Bình phong dát vàng vẽ hạc bay"},
    "hokora": {"name": "Miếu nhỏ hokora", "price": 0, "scene": "yard", "w": 1, "place": "ground", "rare": True,
               "desc": "Hai ngọn nến sáng ban đêm"},
    "karesansui": {"name": "Vườn đá cát cào", "price": 0, "scene": "yard", "w": 2, "place": "ground", "rare": True,
                   "desc": "Vườn thiền, lá phong khẽ rơi"},
}
for _k, _v in RARE_116.items():
    assert _k not in CATALOG, _k
    CATALOG[_k] = _v
RARE_ORDER = RARE_ORDER + ["shika", "kabuto", "taikobashi", "kitsunemen", "pagoda", "koto", "yatai", "shamisen",
                           "kappa", "byobu", "hokora", "karesansui"]
TIER2_ITEMS = frozenset(SEASON_ITEMS) | frozenset(RARE_116)   # đồ lưu ở SEASON_KEY

# ---- 1.24: nhà 3 gian — Bếp (trái) · phòng chính · Phòng ngủ (phải) ----
# Hai gian bên + đồ mới của hai gian lưu ở khoá collection riêng NHA_KEY (tầng 3). Bản ≤ 1.23 ở máy khác không đọc /
# không ghi khoá này nên không xoá được gì; chỉ không thấy hai gian (đồ cũ đặt ở gian bên với bản cũ trông như còn trong
# kho — xem attach_nha: vượt số đã có thì món ở gian bên về kho trước).
NHA_KEY = "kotoba_batake_nha"
SIDE_ROOMS = [
    {"id": "kitchen", "name": "Bếp", "side": "left"},
    {"id": "bedroom", "name": "Phòng ngủ", "side": "right"},
]
NHA_PRICE = 2000                      # 1.25: mở rộng nhà một lần được cả hai gian (1.24: mỗi gian 2.000 xu)
SIDE_IDS = tuple(r["id"] for r in SIDE_ROOMS)
SIDE_COLS, SIDE_ROWS = 9, 4           # như phòng chính: hàng 0 là tường (gian bên không có cửa sổ)
NHA_ITEMS: dict[str, dict[str, Any]] = {
    # --- Bếp
    "reizouko": {"name": "Tủ lạnh", "price": 220, "scene": "room", "w": 1, "place": "floor", "group": "kitchen",
                 "desc": "Thỉnh thoảng hé cửa, đèn trong sáng lên"},
    "nagashi": {"name": "Bếp + bồn rửa", "price": 320, "scene": "room", "w": 2, "place": "floor", "group": "kitchen",
                "desc": "Nồi canh bốc hơi"},
    "shokutaku": {"name": "Bàn ăn", "price": 240, "scene": "room", "w": 2, "place": "floor", "group": "kitchen",
                  "desc": "Bữa sáng kiểu Nhật: cơm, canh miso, cá nướng"},
    "suihanki": {"name": "Nồi cơm điện", "price": 120, "scene": "room", "w": 1, "place": "floor", "group": "kitchen",
                 "desc": "Hơi nước phụt lên, đèn báo nhấp nháy"},
    "shokkidana": {"name": "Kệ chén", "price": 150, "scene": "room", "w": 1, "place": "wall", "group": "kitchen",
                   "desc": "Chén bát xếp ngay ngắn"},
    "yasaikago": {"name": "Giỏ rau", "price": 100, "scene": "room", "w": 1, "place": "floor", "group": "kitchen",
                  "desc": "Rau củ hái từ vườn"},
    # --- Phòng ngủ
    "beddo": {"name": "Giường + chăn đệm", "price": 380, "scene": "room", "w": 2, "place": "floor", "group": "bedroom",
              "desc": "Chăn bông phồng lên xẹp xuống"},
    "tansu": {"name": "Tủ áo tansu", "price": 260, "scene": "room", "w": 1, "place": "floor", "group": "bedroom",
              "desc": "Tủ gỗ nhiều ngăn kiểu Nhật"},
    "nightlamp": {"name": "Đèn ngủ", "price": 140, "scene": "room", "w": 1, "place": "floor", "group": "bedroom",
                  "desc": "Toả ánh trăng dịu ban đêm"},
    "kyodai": {"name": "Bàn trang điểm", "price": 220, "scene": "room", "w": 1, "place": "floor", "group": "bedroom",
               "desc": "Gương lấp lánh"},
    "dakimakura": {"name": "Gối ôm", "price": 100, "scene": "room", "w": 1, "place": "floor", "group": "bedroom",
                   "desc": "Gối hình mèo"},
    "hoshizora": {"name": "Dây đèn sao", "price": 160, "scene": "room", "w": 2, "place": "wall", "group": "bedroom",
                  "desc": "Nhấp nháy ban đêm"},
}
for _k, _v in NHA_ITEMS.items():
    assert _k not in CATALOG, _k
    CATALOG[_k] = _v

# 1.28: quà đủ bộ Hộp sưu tầm (only = "set") + món chỉ có ở gánh hàng rong (only = "ped", giá của gánh hàng). Không bán
# ở cửa hàng. Lưu cùng tầng NHA_KEY: bản 1.24 – 1.27 ở máy khác giữ hộ món lạ ở tầng này (keep_foreign_nha), bản ≤ 1.23
# không đọc tầng này nên không xoá.
FIND_ITEMS: dict[str, dict[str, Any]] = {
    # --- quà đủ bộ (finds_core.SET_REWARD)
    "tukinh": {"name": "Tủ kính sưu tầm", "price": 0, "scene": "room", "w": 1, "place": "floor", "only": "set", "set": "yard",
               "desc": "Bày đồ đã nhặt, nhặt càng nhiều càng đầy"},
    "kaifurin": {"name": "Chuông gió vỏ sò", "price": 0, "scene": "room", "w": 1, "place": "wall", "only": "set", "set": "beach",
                 "desc": "Vỏ sò đung đưa leng keng"},
    "mikujikake": {"name": "Giá buộc quẻ", "price": 0, "scene": "yard", "w": 1, "place": "ground", "only": "set", "set": "shrine",
                   "desc": "Quẻ giấy trắng buộc kín dây"},
    "kingyochochin": {"name": "Đèn lồng cá vàng", "price": 0, "scene": "yard", "w": 1, "place": "ground", "only": "set",
                      "set": "festival", "desc": "Lắc lư theo gió, sáng đỏ ban đêm"},
    "takeakari": {"name": "Đèn ống tre", "price": 0, "scene": "yard", "w": 1, "place": "ground", "only": "set", "set": "bamboo",
                  "desc": "Ánh nến lọt qua lỗ khắc trên ống tre"},
    "ashiyu": {"name": "Bồn ngâm chân ashiyu", "price": 0, "scene": "yard", "w": 2, "place": "ground", "only": "set",
               "set": "onsen", "desc": "Nước ấm bốc hơi nghi ngút"},
    "posuto": {"name": "Hòm thư bưu điện đỏ", "price": 0, "scene": "yard", "w": 1, "place": "ground", "only": "set",
               "set": "station", "desc": "Hòm thư tròn kiểu Showa"},
    # --- chỉ có ở gánh hàng rong (finds_core.PED_ONLY)
    "denkeoquan": {"name": "Đèn kéo quân", "price": 280, "scene": "yard", "w": 1, "place": "ground", "only": "ped",
                   "desc": "Trời tối thì bóng hình chạy vòng quanh"},
    "luunuoc": {"name": "Lu nước", "price": 160, "scene": "yard", "w": 1, "place": "ground", "only": "ped",
                "desc": "Lu sành mát lạnh, gáo dừa vắt ngang"},
    "hoagiay": {"name": "Chậu hoa giấy", "price": 180, "scene": "yard", "w": 1, "place": "ground", "only": "ped",
                "desc": "Hoa giấy hồng rủ xuống thành chùm"},
    "mushikago": {"name": "Lồng dế", "price": 150, "scene": "yard", "w": 1, "place": "ground", "only": "ped",
                  "desc": "Lồng tre nhỏ, đêm có tiếng dế"},
    "nonla": {"name": "Nón lá", "price": 120, "scene": "room", "w": 1, "place": "wall", "only": "ped",
              "desc": "Treo tường, quai lụa hồng"},
    "binhgom": {"name": "Bình gốm men lam", "price": 220, "scene": "room", "w": 1, "place": "floor", "only": "ped",
                "desc": "Gốm men lam vẽ hoa sen"},
    "dongholac": {"name": "Đồng hồ quả lắc", "price": 320, "scene": "room", "w": 1, "place": "wall", "only": "ped",
                  "desc": "Quả lắc đung đưa theo giây"},
    "tetsubin": {"name": "Ấm sắt tetsubin", "price": 200, "scene": "room", "w": 1, "place": "floor", "only": "ped",
                 "desc": "Hơi nước bốc lên từ vòi ấm"},
}
for _k, _v in FIND_ITEMS.items():
    assert _k not in CATALOG, _k
    CATALOG[_k] = _v
TIER3_ITEMS = frozenset(NHA_ITEMS) | frozenset(FIND_ITEMS)    # đồ lưu ở NHA_KEY (sở hữu + mọi chỗ đặt)

# Các cảnh: sân nhà + các vùng mới là ngoài trời (đồ ngoài trời đặt được ở mọi cảnh ngoài trời).
OUTDOOR_SCENES = ("yard", "beach", "shrine", "festival", "bamboo", "onsen", "station")
ALL_SCENES = OUTDOOR_SCENES + ("room",)
ZONES = [  # mở khoá lần lượt
    {"id": "beach", "name": "Bãi biển", "price": 2000},
    {"id": "shrine", "name": "Đền trên núi", "price": 3000},
    {"id": "festival", "name": "Phố lễ hội", "price": 4000},
    {"id": "bamboo", "name": "Rừng tre", "price": 5000},
    {"id": "onsen", "name": "Suối nước nóng", "price": 6000},
    {"id": "station", "name": "Ga làng quê", "price": 7000},
]
ZONE_IDS = [z["id"] for z in ZONES]

# ---- Tương thích với bản cũ (≤ 1.6.1) trên máy khác ----
# Bản cũ làm sạch ví và XOÁ mọi id lạ khi lưu rồi đồng bộ. Vì vậy phần mới của 1.7 (đồ mới, vùng mới,
# đồ đặt ở vùng mới, hiệu ứng mới của món tự làm) được tách ra lưu ở khoá riêng EXT_KEY; ví chỉ giữ
# những gì bản 1.6.1 hiểu. Khi đọc thì gộp lại.
LEGACY_ITEMS = frozenset([
    "fence", "flowers", "mailbox", "chochin", "bench", "scarecrow", "lantern", "bonsai", "maneki", "pond", "sakura",
    "torii", "statue", "plant", "lamp", "tea", "rug", "clock", "painting", "desk", "shelf", "futon", "tv", "kotatsu",
    "cat", "koinobori", "momiji", "tanuki", "daruma", "kokeshi", "furin", "crab", "swimring", "parasol",
    "sandcastle", "palm", "lighthouse", "ema", "saisen", "kitsune", "temizuya", "cedar", "komainu", "nobori", "omen",
    "ringoame", "taiko", "kingyo", "hanabi",
])
LEGACY_ZONES = ("beach", "shrine", "festival")
LEGACY_SCENES = ("yard", "beach", "shrine", "festival", "room")
EXT_KEY = "kotoba_batake_ext"
SEASON_KEY = "kotoba_batake_season"   # 1.8: chủ đề đã mở, chế độ, đồ theo mùa (sở hữu + chỗ đặt)
NEW_IN = "1.8"   # đồ có trong bản này (đồ theo mùa) được gắn nhãn "Mới" trong cửa hàng

# Mô tả hiệu ứng của đồ cũ (đồ mới ghi thẳng "desc" trong CATALOG)
ITEM_DESC = {
    "flowers": "Hoa rung rinh trong gió", "mailbox": "Cờ dựng khi có báo mới · bấm để đọc báo",
    "chochin": "Sáng đèn ban đêm", "bench": "Chim sẻ thỉnh thoảng ghé đậu", "scarecrow": "Đung đưa",
    "lantern": "Sáng đèn ban đêm", "maneki": "Vẫy tay, lấp lánh", "pond": "Cá koi bơi, gợn nước",
    "sakura": "Cánh hoa rơi", "statue": "Lấp lánh", "tea": "Bốc hơi", "lamp": "Sáng đèn ban đêm",
    "clock": "Chạy đúng giờ thật", "tv": "Đổi kênh liên tục", "cat": "Ngủ khò khò",
    "koinobori": "Bay trong gió", "momiji": "Lá đỏ rơi", "daruma": "Lắc lư", "furin": "Đung đưa trong gió",
    "crab": "Bò ngang", "swimring": "Bập bềnh", "sandcastle": "Cờ phấp phới", "palm": "Lá đung đưa",
    "lighthouse": "Quét đèn ban đêm", "ema": "Đung đưa", "saisen": "Lấp lánh", "kitsune": "Lửa cáo ban đêm",
    "temizuya": "Nước nhỏ giọt", "nobori": "Bay trong gió", "omen": "Đung đưa", "ringoame": "Lấp lánh",
    "taiko": "Rung theo nhịp trống", "kingyo": "Cá vàng bơi, bong bóng", "hanabi": "Bắn pháo hoa ban đêm",
}

# Kiểu nhà khác: mua sau khi xây xong nhà gốc, đổi qua lại miễn phí.
HOUSE_STYLES = {
    "classic": {"name": "Nhà gỗ mái đỏ", "price": 0},
    "minka": {"name": "Nhà mái tranh minka", "price": 1500},
    "teahouse": {"name": "Nhà trà chashitsu", "price": 2000},
    "castle": {"name": "Lâu đài mini", "price": 3000},
}

# Tủ đồ của StackChan
WEAR_SLOTS = ("head", "face", "neck", "shell")
WEAR = {
    "leaf": {"name": "Mầm lá trên đầu", "slot": "head", "price": 80},
    "hachimaki": {"name": "Khăn hachimaki", "slot": "head", "price": 80},
    "catears": {"name": "Tai mèo", "slot": "head", "price": 100},
    "straw": {"name": "Mũ rơm", "slot": "head", "price": 120},
    "santa": {"name": "Mũ Noel", "slot": "head", "price": 120},
    "nonla": {"name": "Nón lá", "slot": "head", "price": 150},
    "grad": {"name": "Mũ tốt nghiệp", "slot": "head", "price": 200},
    "crown": {"name": "Vương miện", "slot": "head", "price": 300},
    "bandaid": {"name": "Băng cá nhân", "slot": "face", "price": 60},
    "glasses": {"name": "Kính tròn", "slot": "face", "price": 100},
    "bow": {"name": "Nơ bướm", "slot": "neck", "price": 90},
    "scarf": {"name": "Khăn quàng đỏ", "slot": "neck", "price": 100},
    "bell": {"name": "Vòng chuông", "slot": "neck", "price": 120},
    "sky": {"name": "Vỏ xanh trời", "slot": "shell", "price": 200},
    "matcha": {"name": "Vỏ xanh matcha", "slot": "shell", "price": 200},
    "sakura": {"name": "Vỏ hồng sakura", "slot": "shell", "price": 200},
    "gold": {"name": "Vỏ vàng kim", "slot": "shell", "price": 300},
}
# Biểu cảm mới: StackChan dùng thay cho biểu cảm thường khi đúng/sai/combo…
FACES = {
    "pout": {"name": "Phụng phịu", "price": 60, "moods": ["sad"]},
    "wink": {"name": "Nháy mắt", "price": 80, "moods": ["happy"]},
    "cry": {"name": "Khóc nhè", "price": 80, "moods": ["sad"]},
    "surprise": {"name": "Ngạc nhiên", "price": 100, "moods": ["think"]},
    "kira": {"name": "Mắt lấp lánh", "price": 100, "moods": ["happy", "star"]},
    "heart": {"name": "Mắt tim", "price": 120, "moods": ["happy", "star"]},
    "cool": {"name": "Kính ngầu", "price": 150, "moods": ["star"]},
}

# Xưởng chế tác: món tự vẽ / chuyển từ ảnh
CRAFT_PRICES = {16: 200, 24: 350, 32: 500}
CRAFT_EDIT_PRICE = 50
CRAFT_MAX = 60
CRAFT_KINDS = {"ground": "yard", "floor": "room", "wall": "room"}   # loại → cảnh gốc
CRAFT_FX = ("none", "sway", "bounce", "float", "sparkle", "glow",     # hiệu ứng của món tự làm
            "hearts", "notes", "bubbles", "pulse", "spin")
LEGACY_FX = ("none", "sway", "bounce", "float", "sparkle", "glow")      # bản ≤ 1.6.1 chỉ hiểu các hiệu ứng này
FX_FALLBACK = {"hearts": "sparkle", "notes": "sparkle", "bubbles": "float", "pulse": "glow", "spin": "sway"}
CRAFT_PALETTE = {
    "k": "#1b1b2f", "n": "#2b2b44", "S": "#8a8fa8", "m": "#9aa0b5", "s": "#d4d4e0", "w": "#ffffff",
    "c": "#fff2b3", "y": "#ffd23f", "i": "#e9b949", "o": "#ff9f1c", "h": "#f5b971", "t": "#e2a46a",
    "b": "#a0603a", "B": "#6b3b1f", "e": "#ffd7b5", "E": "#d99a6c", "P": "#ffc4d6", "p": "#ff7fa0",
    "r": "#ff4f6d", "R": "#c21f3a", "v": "#c77dff", "z": "#7b2cbf", "l": "#8fd3ff", "d": "#3d8bff",
    "u": "#2f5fb0", "U": "#1e3a8a", "a": "#2ec4b6", "A": "#1a7f78", "f": "#b8e05a", "g": "#3ccb5e",
    "G": "#2e8b3a", "j": "#1f5f2a",
}
PX_KEY = "kotoba_batake_px"     # điểm ảnh của món tự làm (khoá riêng, chỉ ghi khi chế tác)


class HomeError(ValueError):
    """Lỗi khi mua / đặt đồ, kèm câu thông báo tiếng Việt cho người dùng."""


# ---- món tự làm: nén điểm ảnh kiểu "5.3kky" (số lần lặp + ký tự màu) ----

def px_decode(code: Any, size: int) -> str | None:
    """Giải nén chuỗi điểm ảnh; trả None nếu sai định dạng / sai màu / sai kích thước."""
    if not isinstance(code, str) or size not in CRAFT_PRICES or len(code) > size * size * 3:
        return None
    out: list[str] = []
    num = ""
    for ch in code:
        if ch.isdigit():
            num += ch
            if len(num) > 4:
                return None
            continue
        if ch != "." and ch not in CRAFT_PALETTE:
            return None
        n = int(num) if num else 1
        num = ""
        if n < 1 or len(out) + n > size * size:
            return None
        out.append(ch * n)
    if num:
        return None
    flat = "".join(out)
    return flat if len(flat) == size * size else None


def px_encode(flat: str) -> str:
    out, i = [], 0
    while i < len(flat):
        j = i
        while j < len(flat) and flat[j] == flat[i]:
            j += 1
        n = j - i
        out.append((str(n) if n > 1 else "") + flat[i])
        i = j
    return "".join(out)


def craft_info(meta: dict[str, Any]) -> dict[str, Any]:
    """Mô tả món tự làm giống một món trong CATALOG."""
    kind = meta["kind"]
    return {"name": meta["name"], "price": 0, "scene": CRAFT_KINDS[kind], "w": 1 if meta["size"] == 16 else 2,
            "place": kind, "custom": True, "size": meta["size"], "fx": meta.get("fx", "none")}


def full_catalog(data: dict[str, Any] | None = None) -> dict[str, dict[str, Any]]:
    """CATALOG + món tự làm của người dùng."""
    cat = dict(CATALOG)
    craft = (data or {}).get("craft") or {}
    for cid, meta in (craft.get("items") or {}).items():
        cat[cid] = craft_info(meta)
    return cat


def is_outdoor(scene: str) -> bool:
    """Cảnh ngoài trời: sân nhà, các vùng có sẵn, vùng tự tạo (1.14: id u1, u2…)."""
    return scene in OUTDOOR_SCENES or more.is_uzone(scene)


def is_room(scene: str) -> bool:
    """1.24: các gian trong nhà (phòng chính + Bếp + Phòng ngủ)."""
    return scene == "room" or scene in SIDE_IDS


def scene_names(home: dict[str, Any]) -> tuple[str, ...]:
    """Mọi cảnh đặt đồ được: các cảnh có sẵn + gian bên đã mở (1.24) + vùng tự tạo của người dùng."""
    return ALL_SCENES + tuple(r for r in SIDE_IDS if r in (home.get("rooms") or ())) + tuple(home.get("uzones") or ())


def house_value(home: dict[str, Any]) -> int:
    return sum(p for _n, p in HOUSE_LEVELS[1:home.get("house", 0) + 1])


def fits_scene(info: dict[str, Any], scene: str) -> bool:
    if info["scene"] == "room":
        return is_room(scene)          # 1.24: đồ trong nhà đặt được ở cả ba gian
    return is_outdoor(scene)


def home_catalog(data: dict[str, Any] | None = None, px: dict[str, str] | None = None,
                 today: datetime.date | None = None) -> dict[str, Any]:
    items = [dict(v, id=k, max=v.get("max", 99), rare=bool(v.get("rare")), desc=v.get("desc") or ITEM_DESC.get(k, ""),
                  new=k not in V17_ITEMS) for k, v in CATALOG.items()]
    craft = (data or {}).get("craft") or {}
    for cid, meta in (craft.get("items") or {}).items():
        items.append(dict(craft_info(meta), id=cid, max=99, rare=False, px=(px or {}).get(cid, "")))
    return {
        "items": items,
        "levels": [{"name": n, "price": p} for n, p in HOUSE_LEVELS],
        "room_unlock": ROOM_UNLOCK_LEVEL,
        "yard": {"cols": YARD_COLS, "rows": YARD_ROWS, "house_cols": HOUSE_COLS},
        "room": {"cols": ROOM_COLS, "rows": ROOM_ROWS, "window": list(ROOM_WINDOW)},
        # 1.24: nhà 3 gian
        "side": {"cols": SIDE_COLS, "rows": SIDE_ROWS},
        "rooms": [dict(r) for r in SIDE_ROOMS],
        "nha_price": NHA_PRICE,
        "nha_unlock": NHA_UNLOCK_LEVEL,
        "zones": [dict(z, new=False) for z in ZONES],
        "styles": [dict(v, id=k) for k, v in HOUSE_STYLES.items()],
        "wear": [dict(v, id=k) for k, v in WEAR.items()],
        "faces": [dict(v, id=k) for k, v in FACES.items()],
        "craft": {"prices": {str(k): v for k, v in CRAFT_PRICES.items()}, "edit": CRAFT_EDIT_PRICE,
                  "max": CRAFT_MAX, "palette": dict(CRAFT_PALETTE), "fx": list(CRAFT_FX)},
        "themes": season.themes_view(today or datetime.date.today()),
        "more": more.catalog_view(),
        "today": (today or datetime.date.today()).isoformat(),
        # 1.22: giống cây tự vẽ (hình 5 giai đoạn) + giá
        "myseeds": share.myseeds_view(((data or {}).get("more") or {}).get(share.MYSEED_KEY) or share.empty_myseeds(),
                                      px, CRAFT_PALETTE),
        "myseed": {"price": share.MYSEED_PRICE, "edit": share.MYSEED_EDIT, "max": share.MYSEED_MAX,
                   "min": share.MIN_DRAWN, "stages": list(share.STAGE_NAMES)},
        # 1.30: giấy dán tường + sàn (mẫu có sẵn, mẫu tự vẽ 16×16)
        "decor": decor.catalog_view(),
        "tiles": decor.tiles_view(((data or {}).get("more") or {}).get(decor.DECOR_KEY) or decor.empty(), px, CRAFT_PALETTE),
    }


def _empty_home() -> dict[str, Any]:
    home: dict[str, Any] = {"house": 0, "owned": {}, "zones": [], "styles": [], "style": "classic", "rooms": []}
    for scene in ALL_SCENES + SIDE_IDS:
        home[scene] = []
    return home


def _clean_home(raw: Any, cat: dict[str, dict[str, Any]] | None = None) -> dict[str, Any]:
    cat = cat or CATALOG
    home = _empty_home()
    if not isinstance(raw, dict):
        return home
    lvl = raw.get("house")
    if isinstance(lvl, int) and 0 <= lvl < len(HOUSE_LEVELS):
        home["house"] = lvl
    owned = raw.get("owned")
    if isinstance(owned, dict):
        home["owned"] = {k: v for k, v in owned.items() if k in cat and isinstance(v, int) and v > 0}
    zones = raw.get("zones")
    if isinstance(zones, list):   # luôn là phần đầu của thứ tự mở khoá
        for z in ZONE_IDS:
            if z in zones:
                home["zones"].append(z)
            else:
                break
    styles = raw.get("styles")
    if isinstance(styles, list):
        home["styles"] = [s for s in HOUSE_STYLES if s != "classic" and s in styles]
    if raw.get("style") in home["styles"]:
        home["style"] = raw["style"]
    for scene in ALL_SCENES:
        if scene in ZONE_IDS and scene not in home["zones"]:
            continue
        lst = raw.get(scene)
        for e in lst if isinstance(lst, list) else []:
            if not (isinstance(e, dict) and isinstance(e.get("id"), str) and e.get("id") in cat and fits_scene(cat[e["id"]], scene)
                    and isinstance(e.get("x"), int) and isinstance(e.get("y"), int)):
                continue
            # dữ liệu gộp từ hai khoá (ví + EXT_KEY) có thể chồng nhau nếu bản cũ ở máy khác vừa đặt đồ vào
            # chỗ của đồ mới: món đến sau bị cất lại vào kho (vẫn còn trong "owned", không mất).
            try:
                check_spot(dict(home, house=len(HOUSE_LEVELS)), scene, e["id"], e["x"], e["y"], cat=cat)
            except HomeError:
                continue
            home[scene].append({"id": e["id"], "x": e["x"], "y": e["y"]})
    return home


def _is_ext_entry(scene: str, item_id: str) -> bool:
    """Món đặt này thuộc phần mới (lưu ở EXT_KEY) chứ không phải ví cũ?"""
    return scene not in LEGACY_SCENES or (item_id in CATALOG and item_id not in LEGACY_ITEMS)


def split_ext(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Tách dữ liệu người chơi thành (ví mà bản 1.6.1 hiểu được, phần mới cho EXT_KEY). Không sửa `data`."""
    wallet = json.loads(json.dumps(data))
    wallet.pop("craft_id", None)
    home = wallet.get("home") or _empty_home()
    ext: dict[str, Any] = {"v": 1, "owned": {}, "zones": [], "places": {}, "craft_fx": {}}
    owned = home.get("owned") or {}
    for k in list(owned):
        if k in CATALOG and k not in LEGACY_ITEMS:
            ext["owned"][k] = owned.pop(k)
    ext["zones"] = [z for z in home.get("zones") or [] if z not in LEGACY_ZONES]
    home["zones"] = [z for z in home.get("zones") or [] if z in LEGACY_ZONES]
    for scene in ALL_SCENES:
        keep, move = [], []
        for e in home.get(scene) or []:
            (move if _is_ext_entry(scene, e.get("id")) else keep).append(e)
        if scene in LEGACY_SCENES:
            home[scene] = keep
        else:
            home.pop(scene, None)
        if move:
            ext["places"][scene] = move
    for cid, meta in ((wallet.get("craft") or {}).get("items") or {}).items():
        if meta.get("fx") not in LEGACY_FX:
            was = FX_FALLBACK.get(meta.get("fx"), "none")
            ext["craft_fx"][cid] = {"fx": meta.get("fx"), "was": was}
            meta["fx"] = was
    return wallet, ext


def merge_ext(stored: dict[str, Any], ext: Any) -> dict[str, Any]:
    """Gộp ví đọc được với phần mới ở EXT_KEY (trước khi làm sạch). Phần mới luôn xếp sau phần cũ."""
    if not isinstance(ext, dict):
        return stored
    out = dict(stored)
    raw = stored.get("home")
    home = dict(raw) if isinstance(raw, dict) else {}
    owned = dict(home.get("owned")) if isinstance(home.get("owned"), dict) else {}
    for k, v in (ext.get("owned") or {}).items() if isinstance(ext.get("owned"), dict) else []:
        if k in CATALOG and k not in LEGACY_ITEMS and isinstance(v, int):
            owned[k] = max(v, owned.get(k, 0) if isinstance(owned.get(k), int) else 0)
    home["owned"] = owned
    zones = [z for z in home.get("zones") or [] if z in LEGACY_ZONES] if isinstance(home.get("zones"), list) else []
    zones += [z for z in ext.get("zones") or [] if isinstance(z, str) and z not in LEGACY_ZONES] \
        if isinstance(ext.get("zones"), list) else []
    home["zones"] = zones
    places = ext.get("places") if isinstance(ext.get("places"), dict) else {}
    for scene in ALL_SCENES:
        base = home.get(scene) if isinstance(home.get(scene), list) else []
        if scene not in LEGACY_SCENES:
            base = []
        else:
            base = [e for e in base if not (isinstance(e, dict) and _is_ext_entry(scene, e.get("id")))]
        more = places.get(scene) if isinstance(places.get(scene), list) else []
        home[scene] = base + [e for e in more if isinstance(e, dict) and _is_ext_entry(scene, e.get("id"))]
    out["home"] = home
    return out


def apply_craft_fx(craft: dict[str, Any], ext: Any) -> None:
    """Khôi phục hiệu ứng mới của món tự làm (ví chỉ giữ hiệu ứng thay thế mà bản cũ hiểu).
    Nếu bản cũ ở máy khác đã đổi hiệu ứng (khác giá trị thay thế đã ghi) thì giữ lựa chọn đó."""
    table = ext.get("craft_fx") if isinstance(ext, dict) and isinstance(ext.get("craft_fx"), dict) else {}
    for cid, meta in craft["items"].items():
        rec = table.get(cid)
        if isinstance(rec, dict) and rec.get("fx") in CRAFT_FX and meta.get("fx") == rec.get("was"):
            meta["fx"] = rec["fx"]


def _tier(scene: str, item_id: str) -> int:
    """0 = ví (bản 1.6.1 hiểu), 1 = EXT_KEY (phần của 1.7), 2 = SEASON_KEY (đồ theo mùa của 1.8), 3 = NHA_KEY (1.24)."""
    if item_id in TIER3_ITEMS:
        return 3
    if item_id in TIER2_ITEMS:
        return 2
    return 1 if _is_ext_entry(scene, item_id) else 0


def _canon_order(home: dict[str, Any]) -> None:
    """Đưa thứ tự món đặt về đúng thứ tự sẽ đọc lại (ví → EXT_KEY → SEASON_KEY) để chỉ số
    mà giao diện dùng cho lệnh di chuyển / cất đồ luôn khớp sau khi lưu."""
    for scene in ALL_SCENES:
        lst = home.get(scene) or []
        home[scene] = sorted(lst, key=lambda e: _tier(scene, e["id"]))   # sắp xếp ổn định


def split_season(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Tách cài đặt Mùa & Lễ hội và đồ theo mùa (sở hữu + chỗ đặt) ra khỏi dữ liệu → (phần còn lại, SEASON_KEY).
    Không sửa `data`."""
    rest = json.loads(json.dumps(data))
    store: dict[str, Any] = dict(season.clean_season(rest.pop("season", None)), v=1, owned={}, places={})
    home = rest.get("home")
    if not isinstance(home, dict):
        return rest, store
    owned = home.get("owned") or {}
    for k in list(owned):
        if k in TIER2_ITEMS:
            store["owned"][k] = owned.pop(k)
    for scene in ALL_SCENES:
        lst = home.get(scene)
        if not isinstance(lst, list):
            continue
        move = [e for e in lst if _eid(e) in TIER2_ITEMS]
        if move:
            home[scene] = [e for e in lst if _eid(e) not in TIER2_ITEMS]
            store["places"][scene] = move
    return rest, store


def keep_foreign_season(store: dict[str, Any], prev: Any) -> dict[str, Any]:
    """Giữ lại phần của SEASON_KEY mà bản này không hiểu (chủ đề / món / cảnh của bản mới hơn ở máy khác),
    để lưu ở bản này không xoá mất dữ liệu của bản sau. Sửa `store` tại chỗ và trả về nó."""
    if not isinstance(prev, dict):
        return store
    got = prev.get("unlocked")
    if isinstance(got, list):
        store["unlocked"] = store["unlocked"] + [t for t in got if isinstance(t, str) and t not in season.THEME_IDS
                                                 and t not in store["unlocked"]]
    owned = prev.get("owned")
    if isinstance(owned, dict):
        for k, v in owned.items():
            if isinstance(k, str) and not known_item(k) and isinstance(v, int):
                store["owned"].setdefault(k, v)
    places = prev.get("places")
    if isinstance(places, dict):
        for scene, lst in places.items():
            if not (isinstance(scene, str) and isinstance(lst, list)):
                continue
            foreign = [e for e in lst if isinstance(e, dict) and (scene not in ALL_SCENES or not known_item(e.get("id")))]
            if foreign:
                store["places"][scene] = list(store["places"].get(scene, [])) + foreign
    for k, v in prev.items():   # khoá mới của bản sau: giữ nguyên
        if k not in store and isinstance(k, str):
            store[k] = v
    return store


def merge_season(stored: dict[str, Any], store: Any) -> dict[str, Any]:
    """Gộp đồ theo mùa ở SEASON_KEY vào dữ liệu đã đọc (trước khi làm sạch); xếp sau mọi phần khác."""
    if not isinstance(store, dict):
        return stored
    out = dict(stored)
    raw = stored.get("home")
    home = dict(raw) if isinstance(raw, dict) else {}
    owned = dict(home.get("owned")) if isinstance(home.get("owned"), dict) else {}
    for k, v in (store.get("owned") or {}).items() if isinstance(store.get("owned"), dict) else []:
        if k in TIER2_ITEMS and isinstance(v, int):
            owned[k] = max(v, owned.get(k, 0) if isinstance(owned.get(k), int) else 0)
    home["owned"] = owned
    places = store.get("places") if isinstance(store.get("places"), dict) else {}
    for scene in ALL_SCENES:
        base = home.get(scene) if isinstance(home.get(scene), list) else []
        base = [e for e in base if _eid(e) not in TIER2_ITEMS]
        more = places.get(scene) if isinstance(places.get(scene), list) else []
        home[scene] = base + [e for e in more if _eid(e) in TIER2_ITEMS]
    out["home"] = home
    return out


def _eid(e: Any) -> str | None:
    """id của một bản ghi đặt đồ, None nếu bản ghi hỏng (không phải dict / id không phải chữ). 1.28 (audit 12/11 F06):
    trước đây `e.get("id") in cat` với id là list / dict báo TypeError → cả hai gian bên bị coi như chưa mở, lần lưu sau
    xoá luôn trạng thái mở rộng nhà + mọi chỗ đặt ở đó. Nay chỉ bỏ đúng bản ghi hỏng."""
    if isinstance(e, dict):
        v = e.get("id")
        if isinstance(v, str):
            return v
    return None


# ---- 1.24: tầng NHA_KEY (hai gian bên + đồ mới của hai gian) ----

def split_nha(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Tách gian bên đã mở, đồ đặt ở gian bên và đồ mới của 1.24 (sở hữu + chỗ đặt ở mọi cảnh) → (phần còn lại, NHA_KEY).
    Không sửa `data`."""
    rest = json.loads(json.dumps(data))
    store: dict[str, Any] = {"v": 1, "rooms": [], "owned": {}, "places": {}}
    home = rest.get("home")
    if not isinstance(home, dict):
        return rest, store
    opened = home.pop("rooms", None) or []
    store["rooms"] = [r for r in SIDE_IDS if r in opened]
    owned = home.get("owned") or {}
    for k in list(owned):
        if k in TIER3_ITEMS:
            store["owned"][k] = owned.pop(k)
    for sid in SIDE_IDS:
        lst = home.pop(sid, None)
        if isinstance(lst, list) and lst:
            store["places"][sid] = lst
    for scene in ALL_SCENES:
        lst = home.get(scene)
        if not isinstance(lst, list):
            continue
        move = [e for e in lst if _eid(e) in TIER3_ITEMS]
        if move:
            home[scene] = [e for e in lst if _eid(e) not in TIER3_ITEMS]
            store["places"][scene] = move
    return rest, store


_CRAFT_ID = re.compile(r"c\d{1,6}")


def known_item(i: Any) -> bool:
    """Món bản này hiểu: món có sẵn hoặc món tự làm của Xưởng (id c1, c2…). 1.25.9: món tự làm từng bị coi là
    món của bản mới hơn → chỗ đặt cũ ở Bếp / Phòng ngủ được ghép lại sau mỗi lần lưu, cất rồi vẫn hiện lại."""
    return i in CATALOG or (isinstance(i, str) and _CRAFT_ID.fullmatch(i) is not None)


def keep_foreign_nha(store: dict[str, Any], prev: Any) -> dict[str, Any]:
    """Giữ phần NHA_KEY của bản mới hơn (máy khác) mà bản này không hiểu: món / gian / cảnh lạ, khoá mới."""
    if not isinstance(prev, dict):
        return store
    got = prev.get("rooms")
    if isinstance(got, list):
        store["rooms"] = store["rooms"] + [r for r in got if isinstance(r, str) and r not in SIDE_IDS and r not in store["rooms"]]
    owned = prev.get("owned")
    if isinstance(owned, dict):
        for k, v in owned.items():
            if isinstance(k, str) and not known_item(k) and isinstance(v, int):
                store["owned"].setdefault(k, v)
    places = prev.get("places")
    if isinstance(places, dict):
        known = set(ALL_SCENES) | set(SIDE_IDS)
        for scene, lst in places.items():
            if not (isinstance(scene, str) and isinstance(lst, list)):
                continue
            foreign = [e for e in lst if isinstance(e, dict) and (scene not in known or not known_item(e.get("id")))]
            if foreign and not more.is_uzone(scene):
                store["places"][scene] = list(store["places"].get(scene, [])) + foreign
    for k, v in prev.items():
        if k not in store and isinstance(k, str):
            store[k] = v
    return store


def merge_nha(stored: dict[str, Any], store: Any) -> dict[str, Any]:
    """Gộp đồ mới của 1.24 (sở hữu + chỗ đặt ở các cảnh có sẵn) vào dữ liệu đã đọc, trước khi làm sạch; xếp sau cùng."""
    if not isinstance(store, dict):
        return stored
    out = dict(stored)
    raw = stored.get("home")
    home = dict(raw) if isinstance(raw, dict) else {}
    owned = dict(home.get("owned")) if isinstance(home.get("owned"), dict) else {}
    for k, v in (store.get("owned") or {}).items() if isinstance(store.get("owned"), dict) else []:
        if k in TIER3_ITEMS and isinstance(v, int):
            owned[k] = max(v, owned.get(k, 0) if isinstance(owned.get(k), int) else 0)
    home["owned"] = owned
    places = store.get("places") if isinstance(store.get("places"), dict) else {}
    for scene in ALL_SCENES:
        base = home.get(scene) if isinstance(home.get(scene), list) else []
        base = [e for e in base if _eid(e) not in TIER3_ITEMS]
        more_ = places.get(scene) if isinstance(places.get(scene), list) else []
        home[scene] = base + [e for e in more_ if _eid(e) in TIER3_ITEMS]
    out["home"] = home
    return out


def attach_nha(data: dict[str, Any], store: Any) -> None:
    """Gắn gian bên đã mở và đồ đặt ở đó vào data["home"] (sau khi đã làm sạch và gắn vùng tự tạo).
    Bản cũ ở máy khác không thấy gian bên nên tưởng món đặt ở đó còn trong kho, có thể đặt ra chỗ khác: vượt số đã có
    thì món ở gian bên về kho trước (không mất món đã mua)."""
    home = data["home"]
    got = store.get("rooms") if isinstance(store, dict) and isinstance(store.get("rooms"), list) else []
    got = [r for r in got if isinstance(r, str)]
    # 1.25: mở rộng nhà là một lần cho cả hai gian — dữ liệu 1.24 mới mở một gian cũng coi như mở cả hai
    home["rooms"] = list(SIDE_IDS) if any(r in got for r in SIDE_IDS) else []
    for sid in SIDE_IDS:
        home[sid] = []
    places = store.get("places") if isinstance(store, dict) and isinstance(store.get("places"), dict) else {}
    cat = full_catalog(data)
    for sid in home["rooms"]:
        lst = places.get(sid) if isinstance(places.get(sid), list) else []
        for e in lst:
            if not (_eid(e) in cat and fits_scene(cat[e["id"]], sid)
                    and isinstance(e.get("x"), int) and isinstance(e.get("y"), int)):
                continue
            if home["owned"].get(e["id"], 0) - placed_count(home, e["id"]) <= 0:
                continue
            try:
                check_spot(dict(home, house=len(HOUSE_LEVELS) - 1), sid, e["id"], e["x"], e["y"], cat=cat)
            except HomeError:
                continue
            home[sid].append({"id": e["id"], "x": e["x"], "y": e["y"]})


# ---- 1.14: tầng thứ tư MORE_KEY (sửa nhà, thú nuôi, giống cây, vùng tự tạo + đồ đặt ở vùng tự tạo) ----
MORE_KEY = more.MORE_KEY


def split_more(data: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    """Tách phần của 1.14 ra khỏi dữ liệu → (phần còn lại cho ví / EXT_KEY / SEASON_KEY, MORE_KEY). Không sửa `data`."""
    rest = json.loads(json.dumps({k: v for k, v in data.items() if k not in ("more", "more_view", "mobile")}))
    store = json.loads(json.dumps(data.get("more") or more.empty_more()))
    store["v"] = 1
    store["places"] = {}
    # 1.16: cảnh nền tự vẽ ra khoá riêng "zenv" (xem more.clean_more)
    store["zenv"] = {}
    for z in store.get("zones") or []:
        env = z.pop("env", "") if isinstance(z, dict) else ""
        if env:
            store["zenv"][z["id"]] = env
    home = rest.get("home")
    if isinstance(home, dict):
        for uid in list(home.get("uzones") or []):
            lst = home.pop(uid, None)
            if isinstance(lst, list) and lst:
                store["places"][uid] = lst
        home.pop("uzones", None)
        for k in [k for k in home if more.is_uzone(k)]:
            home.pop(k, None)
    return rest, store


def keep_foreign_more(store: dict[str, Any], prev: Any) -> dict[str, Any]:
    """Giữ khoá của bản mới hơn (ở máy khác) mà bản này không hiểu."""
    if isinstance(prev, dict):
        for k, v in prev.items():
            if isinstance(k, str) and k not in store:
                store[k] = v
    return store


def attach_uzones(data: dict[str, Any], raw: Any) -> None:
    """Gắn các vùng tự tạo và đồ đặt ở đó vào data["home"] (sau khi đã làm sạch ví / ext / season).
    Bản cũ ở máy khác không thấy đồ đặt ở vùng tự tạo nên có thể đặt món đó chỗ khác: vượt số đã có thì món
    ở vùng tự tạo về kho (không mất)."""
    home = data["home"]
    ids = [z["id"] for z in data["more"]["zones"]]
    home["uzones"] = ids
    for uid in ids:
        home[uid] = []
    places = raw.get("places") if isinstance(raw, dict) and isinstance(raw.get("places"), dict) else {}
    cat = full_catalog(data)
    for uid in ids:
        lst = places.get(uid) if isinstance(places.get(uid), list) else []
        for e in lst:
            if not (_eid(e) in cat and fits_scene(cat[e["id"]], uid)
                    and isinstance(e.get("x"), int) and isinstance(e.get("y"), int)):
                continue
            if home["owned"].get(e["id"], 0) - placed_count(home, e["id"]) <= 0:
                continue
            try:
                check_spot(dict(home, house=len(HOUSE_LEVELS)), uid, e["id"], e["x"], e["y"], cat=cat)
            except HomeError:
                continue
            home[uid].append({"id": e["id"], "x": e["x"], "y": e["y"]})


def _more_errors(fn: Any) -> Any:
    """Đổi MoreError (câu tiếng Việt) thành HomeError để __init__ gửi homeError như các lệnh nhà khác."""
    def wrap(*a: Any, **kw: Any) -> Any:
        try:
            return fn(*a, **kw)
        except (more.MoreError, share.ShareError) as err:
            raise HomeError(str(err)) from None
    wrap.__name__ = fn.__name__
    wrap.__doc__ = fn.__doc__
    return wrap


def _clean_wear(raw: Any) -> dict[str, Any]:
    wear: dict[str, Any] = {"owned": [], "on": {}, "faces": [], "faces_off": []}
    if not isinstance(raw, dict):
        return wear
    lst = lambda v: v if isinstance(v, list) else []      # 1.25.3: sai kiểu (số, chữ…) → trống, không ném lỗi
    wear["owned"] = [w for w in WEAR if w in lst(raw.get("owned"))]
    on = raw.get("on") if isinstance(raw.get("on"), dict) else {}
    for slot in WEAR_SLOTS:
        wid = on.get(slot)
        if isinstance(wid, str) and wid in wear["owned"] and WEAR[wid]["slot"] == slot:
            wear["on"][slot] = wid
    wear["faces"] = [f for f in FACES if f in lst(raw.get("faces"))]
    wear["faces_off"] = [f for f in wear["faces"] if f in lst(raw.get("faces_off"))]
    return wear


def _clean_name(name: Any) -> str:
    text = re.sub(r"[\x00-\x1f<>]", "", str(name or "")).strip()
    return text[:24] or "Món tự làm"


def _clean_craft(raw: Any) -> dict[str, Any]:
    craft: dict[str, Any] = {"items": {}, "next": 1}
    if not isinstance(raw, dict):
        return craft
    items = raw.get("items")
    if isinstance(items, dict):
        for cid, meta in items.items():
            if (isinstance(cid, str) and re.fullmatch(r"c\d{1,6}", cid) and isinstance(meta, dict)      # 1.25.3: sai kiểu → bỏ món
                    and isinstance(meta.get("size"), int) and meta.get("size") in CRAFT_PRICES
                    and isinstance(meta.get("kind"), str) and meta.get("kind") in CRAFT_KINDS):
                craft["items"][cid] = {"name": _clean_name(meta.get("name")), "size": meta["size"], "kind": meta["kind"],
                                       "fx": meta.get("fx") if isinstance(meta.get("fx"), str) and meta.get("fx") in CRAFT_FX else "none"}
    nxt = raw.get("next")
    biggest = max([int(c[1:]) for c in craft["items"]] or [0])
    craft["next"] = max(nxt if isinstance(nxt, int) and nxt > 0 else 1, biggest + 1)
    return craft


def _cells(item_id: str, x: int, y: int, cat: dict[str, dict[str, Any]] | None = None) -> list[tuple[int, int]]:
    return [(x + i, y) for i in range((cat or CATALOG)[item_id]["w"])]


def _layer(item_id: str, cat: dict[str, dict[str, Any]] | None = None) -> str:
    return "under" if (cat or CATALOG)[item_id]["place"] == "rug" else "obj"


def check_spot(home: dict[str, Any], scene: str, item_id: str, x: int, y: int, ignore: int | None = None,
               cat: dict[str, dict[str, Any]] | None = None) -> None:
    """Báo lỗi (HomeError) nếu món đồ không đặt được ở ô (x, y)."""
    cat = cat or CATALOG
    item = cat[item_id]
    w = item["w"]
    if scene not in scene_names(home) or not fits_scene(item, scene):
        raise HomeError("Món này không đặt ở đây được.")
    if is_outdoor(scene):
        if scene in ZONE_IDS and scene not in home["zones"]:
            raise HomeError("Chưa mở khoá vùng này.")
        if not (HOUSE_COLS <= x and x + w <= YARD_COLS and 0 <= y < YARD_ROWS):
            raise HomeError("Chỗ này không đặt được (ngoài khu đất hoặc đè lên công trình).")
    else:
        if home["house"] < ROOM_UNLOCK_LEVEL:
            raise HomeError("Cần xây tới bước “Lắp cửa & cửa sổ” mới vào nhà được.")
        cols, window = (ROOM_COLS, ROOM_WINDOW) if scene == "room" else (SIDE_COLS, ())   # 1.24: gian bên 9 ô, không cửa sổ
        if not (0 <= x and x + w <= cols and 0 <= y < ROOM_ROWS):
            raise HomeError("Chỗ này nằm ngoài căn phòng.")
        if item["place"] == "wall":
            if y != 0:
                raise HomeError("Đồ treo tường chỉ đặt được trên tường.")
            if any(cx in window for cx, _ in _cells(item_id, x, y, cat)):
                raise HomeError("Chỗ đó là cửa sổ.")
        elif y == 0:
            raise HomeError("Đồ này phải đặt dưới sàn.")
    mine = set(_cells(item_id, x, y, cat))
    for idx, e in enumerate(home[scene]):
        if idx == ignore or _layer(e["id"], cat) != _layer(item_id, cat):
            continue
        if mine & set(_cells(e["id"], e["x"], e["y"], cat)):
            raise HomeError("Ô này đã có đồ rồi.")


def placed_count(home: dict[str, Any], item_id: str) -> int:
    return sum(1 for scene in scene_names(home) for e in home.get(scene, []) if e["id"] == item_id)


# 1.22.6: giới hạn của các số trong config (người dùng sửa tay ở Tools → Add-ons → Config)
CONFIG_RANGES: dict[str, tuple[float, float]] = {
    "wilt_retrievability": (0.0, 1.0),
    "max_plants": (1, 5000),
    # 1.23 (kế hoạch mục 5.3): giới hạn hợp lý — trước cho đặt daily_bonus 100.000 (mỗi ngày đạt mục tiêu được 100.000 xu)
    "daily_goal": (10, 100000),
    "daily_bonus": (0, 100),
    "game_daily_coins": (0, 200),
    "music_volume": (0.0, 1.0),
}
_TRUE = {"true", "1", "yes", "on", "có", "bật"}
_FALSE = {"false", "0", "no", "off", "không", "tắt", ""}


def _clean_value(key: str, val: Any, default: Any) -> Any:
    """Một mục config về đúng kiểu của mặc định; sai kiểu / không đọc được thì dùng mặc định."""
    if isinstance(default, bool):
        if isinstance(val, bool):
            return val
        if isinstance(val, (int, float)):
            return bool(val)
        if isinstance(val, str) and val.strip().lower() in _TRUE | _FALSE:
            return val.strip().lower() in _TRUE
        return default
    if isinstance(default, (int, float)):
        if isinstance(val, bool):
            return default
        try:
            num = float(val.strip().replace(",", ".")) if isinstance(val, str) else float(val)
        except (TypeError, ValueError, AttributeError):
            return default
        if num != num or num in (float("inf"), float("-inf")):
            return default
        lo, hi = CONFIG_RANGES.get(key, (float("-inf"), float("inf")))
        if num < lo:
            if key == "daily_goal" and num <= 0:
                return default        # mục tiêu 0 / âm = như mặc định (giống Lịch hoa)
            return type(default)(lo)      # 1.23: mục tiêu 1–9 → 10
        num = min(num, hi)
        return int(num) if isinstance(default, int) else num
    if isinstance(default, str):
        return val if isinstance(val, str) else default
    if isinstance(default, dict):
        return val if isinstance(val, dict) else dict(default)
    if key == "stage_days":
        if isinstance(val, str):
            vals: list[Any] = val.replace(";", ",").split(",")
        elif isinstance(val, (list, tuple)):
            vals = list(val)
        else:
            return list(default)
        out: list[Any] = []
        for v in vals[:3]:
            try:
                f = float("nan") if isinstance(v, bool) else float(v)
            except (TypeError, ValueError):
                return list(default)
            if not 0 < f < float("inf"):
                return list(default)
            out.append(int(f) if f == int(f) else f)
        out = (out + list(default)[len(out):])[:3] if out else list(default)
        # 1.25.9: ba mốc phải tăng dần (vd. [90, 3, 21] → cây nhảy giai đoạn / không bao giờ ra hoa) → về mặc định
        if not out[0] < out[1] < out[2]:
            return list(default)
        return out
    return val


def merged_config(cfg: dict[str, Any] | None) -> dict[str, Any]:
    """Config mặc định + config của người dùng. 1.22.6: mục nào sai kiểu (vd. "daily_goal": "", "effects": "false",
    "stage_days": "3,21,90") thì về đúng kiểu / về mặc định, để vườn vẫn mở được (trước đây báo "không dựng được khu vườn")."""
    out = dict(DEFAULT_CONFIG)
    if cfg:
        for k, v in cfg.items():
            if v is None:
                continue
            out[k] = _clean_value(k, v, DEFAULT_CONFIG[k]) if k in DEFAULT_CONFIG else v
    return out


# ---------------------------------------------------------------------------
# Giai đoạn của cây
# ---------------------------------------------------------------------------


def stability_of(card: Any) -> float | None:
    """Độ bền trí nhớ FSRS (ngày); None nếu thẻ chưa có trạng thái FSRS."""
    ms = getattr(card, "memory_state", None)
    if ms is not None and getattr(ms, "stability", 0):
        return float(ms.stability)
    return None


def stage_of(card: Any, stage_days: list[float]) -> int:
    """Giai đoạn của một thẻ.

    - Thẻ mới            -> Hạt giống
    - Đang học / học lại -> Mầm
    - Thẻ ôn: theo độ bền trí nhớ S (ngày), mặc định
      S < 3 -> Mầm, < 21 -> Cây non, < 90 -> Ra hoa, còn lại -> Ra quả.
      Không có FSRS thì dùng khoảng cách ôn (ivl) thay cho S.
    """
    if card.type == CARD_TYPE_NEW:
        return STAGE_SEED
    if card.type in (CARD_TYPE_LRN, CARD_TYPE_RELEARNING):
        return STAGE_SPROUT
    s = stability_of(card)
    if s is None:
        s = float(card.ivl or 0)
    sapling, flower, fruit = (list(stage_days) + [3, 21, 90])[:3]
    if s < sapling:
        return STAGE_SPROUT
    if s < flower:
        return STAGE_SAPLING
    if s < fruit:
        return STAGE_FLOWER
    return STAGE_FRUIT


def note_stage(
    col: Collection, nid: int, stage_days: list[float], deck_name: str | None = None
) -> int | None:
    """Giai đoạn của cả note = thẻ yếu nhất (mọi chiều phải thuộc thì cây mới lớn).

    Nếu có `deck_name` thì chỉ xét các thẻ của note nằm trong deck đó (kể cả deck
    con) – khớp với cách khu vườn của deck đó vẽ cây. Hữu ích khi mỗi mẫu thẻ
    của note nằm ở một deck khác nhau.
    """
    if deck_name:
        cids = _safe_find(col, f"{deck_search(col, deck_name)} nid:{int(nid)}")
        if not cids:
            cids = set(col.card_ids_of_note(nid))
    else:
        cids = set(col.card_ids_of_note(nid))
    stages = []
    for cid in sorted(cids):
        card = col.get_card(cid)
        if card.queue == QUEUE_SUSPENDED:
            continue
        stages.append(stage_of(card, stage_days))
    return min(stages) if stages else None


# ---------------------------------------------------------------------------
# Chữ hiển thị
# ---------------------------------------------------------------------------


_TAG_RE = re.compile(r"<[^>]*>")


def _strip(text: str) -> str:
    try:
        return strip_html(text)
    except Exception:
        # strip_html cần i18n của Anki; dự phòng khi chạy ngoài app
        return _TAG_RE.sub("", text)


_BREAK_RE = re.compile(r"(?i)<br\s*/?>|</(?:div|p|li)>")


def _clean(text: str, limit: int = 80) -> str:
    # xuống dòng (<br>, </div>) → " / " để "Kun: ちから<br>On: リョク" không bị dính chữ
    # (1.17: dấu "/" người dùng tự gõ, vd. phiên âm /ˈæp.əl/ hay "and/or", giữ nguyên)
    text = _BREAK_RE.sub("\n", text or "")
    text = html.unescape(_strip(text))
    lines = [" ".join(line.split()) for line in text.split("\n")]
    text = " / ".join(x for x in lines if x and x != "/")
    return text if len(text) <= limit else text[: limit - 1] + "…"


# Tên trường thường gặp, so sánh không phân biệt hoa thường.
WORD_NAMES = ["vocab", "vocabulary", "word", "expression", "từ vựng", "từ", "tu vung",
              "単語", "語彙", "言葉", "kanji", "front", "mặt trước"]
READING_NAMES = ["reading", "readings", "読み", "読み方", "よみ", "furigana", "kana",
                 "hiragana", "cách đọc", "phiên âm", "pronunciation",
                 "âm on", "âm kun", "on", "kun", "onyomi", "kunyomi", "on'yomi", "kun'yomi",
                 "音読み", "訓読み", "on reading", "kun reading", "âm đọc"]
ONKUN_NAMES = {"âm on", "âm kun", "on", "kun", "onyomi", "kunyomi", "on'yomi", "kun'yomi",
               "音読み", "訓読み", "on reading", "kun reading", "on yomi", "kun yomi"}
HANVIET_NAMES = ["hán-việt", "hán việt", "han viet", "han-viet", "hanviet", "âm hán việt",
                 "âm hán", "sino-vietnamese", "hv"]
_ALL_KANJI = re.compile(r"^[\u3400-\u9fff\uf900-\ufaff々]{1,2}$")
_ONE_KANJI = re.compile(r"^[\u3400-\u9fff\uf900-\ufaff々]$")
MEANING_NAMES = ["meaning", "meanings", "nghĩa", "ý nghĩa", "nghia", "意味", "definition",
                 "translation", "dịch", "vietnamese", "tiếng việt", "english", "back",
                 "mặt sau"]

_FURI_RE = re.compile(r"\[[^\]]*\]")
_CJK_GAP = re.compile(r"(?<=[\u3040-\u30ff\u3400-\u9fff]) (?=[\u3040-\u30ff\u3400-\u9fff])")


def _find_field(keys: list[str], wanted: str, candidates: list[str], taken: set[str]) -> str | None:
    """Tên trường: ưu tiên cấu hình, rồi khớp đúng tên, rồi khớp một phần."""
    if wanted and wanted in keys:
        return wanted
    lower = {k: k.strip().lower() for k in keys if k not in taken}
    for cand in candidates:
        for k, low in lower.items():
            if low == cand:
                return k
    for cand in candidates:
        if len(cand) < 3:
            continue
        for k, low in lower.items():
            if cand in low:
                return k
    return None


def _first_word_field(keys: list[str], wanted: str) -> str | None:
    """Trường chứa từ: nếu nhiều trường khớp tên thì lấy trường đứng trước
    (vd. deck kanji có cả “Kanji” và “Từ vựng” → chọn “Kanji”)."""
    if wanted and wanted in keys:
        return wanted
    for k in keys:
        low = k.strip().lower()
        if low in WORD_NAMES or any(len(c) >= 3 and c in low for c in WORD_NAMES):
            return k
    return None


def field_roles(keys: list[str], cfg: dict[str, Any]) -> dict[str, str | None]:
    """Đoán trường nào là từ / cách đọc / nghĩa của một loại note."""
    keys = list(keys)
    taken: set[str] = set()
    word = _first_word_field(keys, cfg.get("word_field", "")) or (keys[0] if keys else None)
    if word:
        taken.add(word)
    reading = _find_field(keys, cfg.get("reading_field", ""), READING_NAMES, taken)
    if reading:
        taken.add(reading)
    hanviet = _find_field(keys, cfg.get("hanviet_field", ""), HANVIET_NAMES, taken)
    if hanviet:
        taken.add(hanviet)
    meaning = _find_field(keys, cfg.get("meaning_field", ""), MEANING_NAMES, taken)
    if meaning is None:
        rest = [k for k in keys if k not in taken]
        meaning = rest[0] if rest else None
    # deck kanji hay tách âm On và âm Kun thành 2 trường → lấy cả hai
    extra = [k for k in keys if k != reading and k not in taken and k.strip().lower() in ONKUN_NAMES]
    return {"word": word, "reading": reading, "meaning": meaning, "hanviet": hanviet, "reading_extra": extra}


def plain_word(raw: str) -> tuple[str, str]:
    """Trường Từ tiếng Nhật → (chữ, cách đọc lấy được trong chính trường đó). 1.17: hiểu mọi kiểu furigana
    hay gặp (ngoặc vuông Anki, ruby HTML, Migaku, ngoặc tròn, hai dòng) — xem text_core."""
    return text.split_word(raw)


def _cut(s: str, limit: int) -> str:
    s = " ".join((s or "").split())
    return s if len(s) <= limit else s[: limit - 1] + "…"


AUDIO_NAMES = ["audio", "sound", "âm thanh", "音声", "発音", "word audio", "vocab audio",
               "pronunciation audio", "audio word"]
_NOT_WORD_AUDIO = ("example", "sentence", "ví dụ", "câu", "例", "文")
_SOUND_RE = re.compile(r"\[sound:(.+?)\]")


def audio_field_name(keys: list[str], cfg: dict[str, Any]) -> str | None:
    """Trường chứa âm thanh của TỪ (bỏ qua trường âm thanh câu ví dụ)."""
    wanted = cfg.get("audio_field", "")
    if wanted and wanted in keys:
        return wanted
    usable = [k for k in keys if not any(x in k.lower() for x in _NOT_WORD_AUDIO)]
    return _find_field(usable, "", AUDIO_NAMES, set())


def note_audio(note: Any, cfg: dict[str, Any], roles: dict[str, Any] | None = None) -> str | None:
    """Tên file âm thanh đầu tiên của từ (chỉ tên file, không có thư mục)."""
    keys = list(note.keys())
    roles = roles or note_roles(note, cfg)
    name = roles.get("audio")
    if roles.get("configured"):     # đã cấu hình: chỉ đúng trường đã chọn
        candidates = [name] if name else []
    else:
        candidates = [name] if name else [
            k for k in keys if not any(x in k.lower() for x in _NOT_WORD_AUDIO)
        ]
    for key in candidates:
        m = _SOUND_RE.search(note[key] or "")
        if m:
            fname = os.path.basename(html.unescape(m.group(1)).strip())
            if fname:
                return fname
    return None


# ---------------------------------------------------------------------------
# Câu ví dụ → câu điền từ (game "Điền vào câu")
# ---------------------------------------------------------------------------

EXAMPLE_NAMES = ["example", "examples", "ví dụ", "câu ví dụ", "例文", "例", "sentence", "câu"]
_EX_NOT = ("audio", "sound", "âm", "音", "meaning", "translation", "nghĩa", "dịch", "english", "訳", "furigana", "reading")
_EX_AUDIO_HINT = ("audio", "sound", "âm thanh", "音声")
_EX_MEAN_HINT = ("meaning", "translation", "nghĩa", "dịch", "訳", "english", "vietnamese", "tiếng việt")
_FURI_TOKEN = re.compile(r" ?([^ >\[\]]+?)\[([^\]]+)\]")
_KANA_CHARS = re.compile(r"[\u3041-\u309f\u30a0-\u30ff]")
BLANK = '<span class="kb-blank">\u3000？\u3000</span>'


def _is_exampleish(name: str) -> bool:
    low = name.lower()
    return any(x in low for x in ("example", "ví dụ", "例", "sentence", "câu"))


def example_fields(keys: list[str], cfg: dict[str, Any]) -> dict[str, str | None]:
    """Trường câu ví dụ, audio câu ví dụ và nghĩa câu ví dụ (nếu có)."""
    keys = list(keys)
    ex = cfg.get("example_field", "")
    if not (ex and ex in keys):
        usable = [k for k in keys if not any(x in k.lower() for x in _EX_NOT)]
        ex = _find_field(usable, "", EXAMPLE_NAMES, set())
    au = cfg.get("example_audio_field", "")
    if not (au and au in keys):
        au = next((k for k in keys if _is_exampleish(k) and any(x in k.lower() for x in _EX_AUDIO_HINT)), None)
    mean = next((k for k in keys if k not in (ex, au) and _is_exampleish(k)
                 and any(x in k.lower() for x in _EX_MEAN_HINT)), None)
    return {"example": ex, "audio": au, "meaning": mean}


def _clean_example(raw: str, lang: str = "ja") -> str:
    """Câu ví dụ → một dòng chữ thuần. Tiếng Nhật giữ furigana kiểu Anki 「漢字[かんじ]」 (ruby HTML, Migaku đã đổi về)."""
    return text.ja_example(raw) if lang == "ja" else text.plain_text(raw).replace(" / ", " ")


def furigana_tokens(s: str) -> list[tuple[str, str | None]]:
    """Tách chuỗi furigana kiểu Anki 「漢字[かんじ]」 thành [(chữ, cách đọc | None)]."""
    return text.tokens(s)


def cloze_candidates(word: str, reading: str) -> list[str]:
    """Các chuỗi để tìm từ trong câu, từ dài/chính xác tới ngắn (gốc của từ đã chia)."""
    forms: list[str] = []

    def add(x: str) -> None:
        x = re.sub(r"[～〜~?？!！\s]", "", x)
        if x and x not in forms:
            forms.append(x)

    base = re.sub(r"[（(][^）)]*[）)]", "", word)
    for part in [word, base] + re.split(r"[、,/・]", base):
        add(part)
    add(re.sub(r"[（()）]", "", word))
    stems: list[str] = []
    for f in list(forms):
        cur = f
        # bỏ dần okurigana ở cuối: 決める → 決め → 決 ; 冷たい → 冷た → 冷
        while len(cur) > 1 and _KANA_CHARS.match(cur[-1]) and HAS_KANJI_RE.search(cur[:-1]):
            cur = cur[:-1]
            if cur not in forms and cur not in stems:
                stems.append(cur)
    out = sorted(forms, key=len, reverse=True) + stems
    if reading:
        add_r = re.sub(r"[～〜~?？\s]", "", re.sub(r"[（(][^）)]*[）)]", "", reading))
        if add_r and add_r not in out:
            out.append(add_r)
    return out


HAS_KANJI_RE = re.compile(r"[\u3400-\u9fff\uf900-\ufaff々]")


_GRAMMAR_MARK = re.compile(r"[A-Za-zＡ-Ｚａ-ｚ\-‐－]+|普通形|辞書形|ます形|て形|た形|ない形|意向形|可能形|名詞|動詞|形容詞|な形|い形")
_KANA_KANJI = re.compile(r"[\u3040-\u30ff\u3400-\u9fff々]")


def grammar_candidates(pattern: str) -> list[str]:
    """Các chuỗi để tìm mẫu ngữ pháp trong câu: 「Vて + ください」→ てください, てくださ…"""
    out: list[str] = []

    def add(x: str) -> None:
        x = re.sub(r"[～〜~?？!！\s。、「」]", "", x)
        if len(x) >= 2 and _KANA_KANJI.search(x) and x not in out:
            out.append(x)

    base = _GRAMMAR_MARK.sub(" ", pattern or "")
    for variant in (base, re.sub(r"[（(][^）)]*[）)]", " ", base), re.sub(r"[（()）]", "", base)):
        add(re.sub(r"[+＋/／・|]", "", variant))
        for part in re.split(r"[+＋/／、,・|\s～〜~]+", variant):
            add(part)
    more: list[str] = []
    for x in list(out):      # mẫu đã chia trong câu: たことがある → たことがあ(ります)
        cur = x
        for _ in range(2):
            if len(cur) > 3 and _KANA_CHARS.match(cur[-1]):
                cur = cur[:-1]
                if cur not in out and cur not in more:
                    more.append(cur)
    return sorted(out, key=len, reverse=True) + more


def _cloze_latin(sentence: str, word: str, lang: str) -> dict[str, str] | None:
    """1.17: câu tiếng Anh (nhận cả dạng biến đổi: went, studying, stopped…) / ngôn ngữ khác (đúng chữ)."""
    if not sentence:
        return None
    span = text.find_word(sentence, word, lang)
    if span is None:
        return None
    a0, a1 = span
    esc = html.escape
    pre, mid, post = sentence[:a0], sentence[a0:a1], sentence[a1:]
    return {"q": esc(pre) + BLANK + esc(post), "a": f'{esc(pre)}<b class="kb-hl">{esc(mid)}</b>{esc(post)}',
            "plain": sentence}


def make_cloze(example_raw: str, word: str, reading: str = "", grammar: bool = False,
               lang: str = "ja") -> dict[str, str] | None:
    """Che từ (hoặc mẫu ngữ pháp) trong câu ví dụ. Trả về {q: html có ô trống, a: html tô đậm đáp án, plain}."""
    if lang != "ja":
        return _cloze_latin(_clean_example(example_raw, lang), word, lang)
    text_ = _clean_example(example_raw)
    if not text_:
        return None
    toks = furigana_tokens(text_)
    plain = "".join(t for t, _ in toks)
    span = None
    cands = cloze_candidates(word, reading)
    if grammar:
        cands = grammar_candidates(word) + [c for c in cands if c not in grammar_candidates(word)]
    for cand in cands:
        i = plain.find(cand)
        if i >= 0:
            span = (i, i + len(cand))
            break
    if span is None:
        return None
    a0, a1 = span
    q_parts: list[str] = []
    a_parts: list[str] = []
    blank_done = False
    pos = 0
    esc = html.escape
    for base, ruby in toks:
        s, e = pos, pos + len(base)
        pos = e
        if e <= a0 or s >= a1:
            frag = f"<ruby>{esc(base)}<rt>{esc(ruby)}</rt></ruby>" if ruby else esc(base)
            q_parts.append(frag)
            a_parts.append(frag)
            continue
        pre = base[: max(0, a0 - s)]
        mid = base[max(0, a0 - s): min(len(base), a1 - s)]
        post = base[min(len(base), a1 - s):]
        q_parts.append(esc(pre) + ("" if blank_done else BLANK) + esc(post))
        blank_done = True
        hl = f'{esc(pre)}<b class="kb-hl">{esc(mid)}</b>{esc(post)}'
        a_parts.append(f"<ruby>{hl}<rt>{esc(ruby)}</rt></ruby>" if ruby else hl)
    return {"q": "".join(q_parts), "a": "".join(a_parts), "plain": plain}


def note_example(note: Any, cfg: dict[str, Any], word: str, reading: str,
                 roles: dict[str, Any] | None = None) -> dict[str, Any]:
    """Thông tin câu ví dụ của note cho game Điền vào câu."""
    roles = roles or note_roles(note, cfg)
    out: dict[str, Any] = {"cloze": None, "ex_audio": False, "ex_meaning": "", "ex": False}
    ex, au, mean = roles.get("example"), roles.get("ex_audio"), roles.get("ex_meaning")
    lang = roles.get("lang") or "ja"
    if ex:
        out["ex"] = bool(_clean_example(note[ex] or "", lang))     # 1.13: có câu ví dụ (dù không che được từ)
        grammar = roles.get("kind") == "grammar"
        if lang == "ja":
            raw_word = note[roles["word"]] if roles.get("word") else word
            word_plain = plain_word(raw_word)[0] or word
        else:
            word_plain = word
        out["cloze"] = make_cloze(note[ex], word_plain, reading, grammar=grammar, lang=lang)
        if _SOUND_RE.search(note[ex] or ""):
            out["ex_audio"] = True
    if au and _SOUND_RE.search(note[au] or ""):
        out["ex_audio"] = True
    if mean:
        out["ex_meaning"] = _clean(note[mean], 160)
    return out


def example_audio(note: Any, cfg: dict[str, Any], roles: dict[str, Any] | None = None) -> str | None:
    roles = roles or note_roles(note, cfg)
    for key in (roles.get("ex_audio"), roles.get("example")):
        if key:
            m = _SOUND_RE.search(note[key] or "")
            if m:
                return os.path.basename(html.unescape(m.group(1)).strip()) or None
    return None


def note_texts(note: Any, cfg: dict[str, Any]) -> tuple[str, str]:
    """(từ, nghĩa) của note."""
    word, _reading, meaning = note_info(note, cfg)
    return word, meaning


def note_info(note: Any, cfg: dict[str, Any]) -> tuple[str, str, str]:
    """(từ, cách đọc, nghĩa) của note, tự nhận tên trường phổ biến."""
    d = note_details(note, cfg)
    return d["word"], d["reading"], d["meaning"]


# ---------------------------------------------------------------------------
# Vai trò của các trường: theo cấu hình từng loại note (1.9), chưa cấu hình thì đoán theo tên
# ---------------------------------------------------------------------------


def note_mid(note: Any) -> str | None:
    mid = getattr(note, "mid", None)
    if mid is None:
        try:
            mid = note.note_type()["id"]
        except Exception:
            return None
    return str(mid)


def model_conf(note: Any, cfg: dict[str, Any]) -> dict[str, Any] | None:
    """Cấu hình trường đã lưu của loại note này nếu còn dùng được (None = chưa có / hỏng → đoán)."""
    models = (cfg.get("_fields") or {}).get("models") or {}
    mid = note_mid(note)
    conf = models.get(mid) if mid else None
    if conf and fields.conf_problem(conf, list(note.keys())) is None:
        return conf
    return None


EN_WORD_NAMES = ["word", "vocabulary", "vocab", "english", "term", "expression", "front", "từ vựng", "từ",
                 "tu vung", "mặt trước", "phrase"]
EN_READING_NAMES = ["ipa", "phonetic", "phonetics", "pronunciation", "phiên âm", "phien am", "transcription"]
EN_MEANING_NAMES = ["meaning", "nghĩa", "nghia", "ý nghĩa", "vietnamese", "tiếng việt", "definition", "translation",
                    "dịch", "back", "mặt sau"]


def guess_roles_lang(keys: list[str], cfg: dict[str, Any], lang: str) -> dict[str, Any]:
    """1.17: đoán trường cho loại note tiếng Anh / ngôn ngữ khác (tên trường kiểu English, IPA, Vietnamese…)."""
    keys = list(keys)
    taken: set[str] = set()
    word = _find_field(keys, "", EN_WORD_NAMES, taken) or (keys[0] if keys else None)
    taken.add(word or "")
    ex = example_fields(keys, cfg)
    au = audio_field_name(keys, cfg)
    taken |= {x for x in (ex["example"], ex["audio"], ex["meaning"], au) if x}
    reading = _find_field(keys, "", EN_READING_NAMES, taken)
    taken.add(reading or "")
    meaning = _find_field(keys, "", EN_MEANING_NAMES, taken)
    if meaning is None:
        rest = [k for k in keys if k not in taken]
        meaning = rest[0] if rest else None
    return {"word": word, "reading": reading, "meaning": meaning, "hanviet": None, "kun": None, "reading_extra": [],
            "audio": au, "example": ex["example"], "ex_audio": ex["audio"], "ex_meaning": ex["meaning"],
            "pos": None, "usage": None, "kind": None, "configured": False}


def guess_roles(keys: list[str], cfg: dict[str, Any]) -> dict[str, Any]:
    """Đoán vai trò các trường theo tên (cách của các bản trước 1.9)."""
    keys = list(keys)
    fr = field_roles(keys, cfg)
    ex = example_fields(keys, cfg)
    return {"word": fr["word"], "reading": fr["reading"], "meaning": fr["meaning"], "hanviet": fr["hanviet"],
            "kun": None, "reading_extra": fr["reading_extra"], "audio": audio_field_name(keys, cfg),
            "example": ex["example"], "ex_audio": ex["audio"], "ex_meaning": ex["meaning"],
            "pos": None, "usage": None, "kind": None, "configured": False}


def conf_roles(conf: dict[str, Any], keys: list[str]) -> dict[str, Any]:
    out: dict[str, Any] = {r: None for r in fields.ROLE_IDS}
    for role, name in conf["f"].items():
        if name in keys:
            out[role] = name
    out.update(reading_extra=[], kind=conf["kind"], configured=True)
    return out


# 1.17: ngôn ngữ đoán được của từng loại note (mid → ja / en / other). Xoá mỗi lần dựng vườn / mở Cấu hình trường.
_LANG_GUESS: dict[str, str] = {}


def _sample_words(col: Any, mid: str, idx: int, limit: int = 30) -> list[str]:
    try:
        rows = col.db.list("select flds from notes where mid = ? limit ?", int(mid), limit)
    except Exception:
        return []
    out = []
    for flds in rows:
        parts = str(flds).split("\x1f")
        out.append(text.plain_text(parts[idx] if idx < len(parts) else ""))
    return out


def model_lang(col: Any, mid: str | None, keys: list[str], word_field: str | None, name: str,
               cfg: dict[str, Any], fallback: list[str] | None = None) -> str:
    """Ngôn ngữ của loại note: người dùng đã chọn (khoá lang) → đoán từ ≤ 30 note mẫu (nhớ tạm theo mid)."""
    chosen = ((cfg.get("_fields") or {}).get("lang") or {}).get(mid or "")
    if chosen in fields.LANGS:
        return chosen
    return guess_model_lang(col, mid, keys, word_field, name, fallback)


def guess_model_lang(col: Any, mid: str | None, keys: list[str], word_field: str | None, name: str,
                     fallback: list[str] | None = None) -> str:
    """Ngôn ngữ đoán được (không xét lựa chọn của người dùng) — dùng chung cho vườn và bảng Cấu hình trường."""
    if mid and mid in _LANG_GUESS:
        return _LANG_GUESS[mid]
    idx = keys.index(word_field) if word_field in keys else 0
    words = _sample_words(col, mid, idx) if (col is not None and mid) else []
    if not words:
        words = fallback or []
    lang = fields.guess_lang(name, keys, words)
    if mid and words:
        _LANG_GUESS[mid] = lang
    return lang


def note_roles(note: Any, cfg: dict[str, Any]) -> dict[str, Any]:
    keys = list(note.keys())
    conf = model_conf(note, cfg)
    try:
        name = note.note_type()["name"]
    except Exception:
        name = ""
    roles = conf_roles(conf, keys) if conf else _guess_kind_roles(guess_roles(keys, cfg), keys, name)
    wf = roles.get("word") or (keys[0] if keys else None)
    lang = model_lang(getattr(note, "col", None), note_mid(note), keys, wf, name, cfg,
                      [text.plain_text(note[wf])] if wf else [])
    if lang != "ja" and not conf:
        roles = guess_roles_lang(keys, cfg, lang)
    roles["lang"] = lang
    if lang != "ja" and roles.get("kind") in ("kanji", "grammar"):
        roles["kind"] = "vocab"
    return roles


def note_details(note: Any, cfg: dict[str, Any], roles: dict[str, Any] | None = None) -> dict[str, str]:
    """Từ, cách đọc (tiếng Anh: phiên âm IPA), nghĩa, âm Hán Việt (chỉ chữ Hán) và cách dùng (ngữ pháp) của note."""
    roles = roles or note_roles(note, cfg)
    kind = roles.get("kind") or ""
    lang = roles.get("lang") or "ja"

    def get(role: str) -> str:
        name = roles.get(role)
        return note[name] if name else ""

    raw_word = get("word")
    if not _clean(raw_word) and list(note.keys()):
        raw_word = note[list(note.keys())[0]]          # trường từ để trống → dùng trường đầu
    grammar = kind == "grammar"
    if lang != "ja":
        word, ipa = text.en_split_ipa(text.plain_text(raw_word)) if lang == "en" else (text.plain_text(raw_word), "")
        word = _cut(word, 60) or "?"
        reading = _cut(text.plain_text(get("reading")), 60) or ipa
        if reading == word:
            reading = ""
        return {"word": word, "reading": reading, "meaning": _clean(get("meaning")), "hanviet": "",
                "usage": _clean(get("usage"), 120)}
    word, bracket_reading = plain_word(raw_word)
    word = _cut(word, 60 if grammar else 40) or "?"
    reading = _cut(text.reading_field(get("reading")), 60) or bracket_reading
    extra = roles.get("reading_extra") or []
    if extra:
        parts = [(roles["reading"], reading)] if reading else []
        parts += [(k, _clean(note[k], 40)) for k in extra]
        reading = " / ".join(f"{k}: {v}" for k, v in parts if v)
    kun = _clean(get("kun"), 40)
    if kun:   # kanji: âm On và âm Kun ở 2 trường riêng
        reading = " / ".join(x for x in ((f"On: {reading}" if reading else ""), f"Kun: {kun}") if x)
    if reading == word or grammar:
        reading = ""
    meaning = _clean(get("meaning"))
    # 1.17: Hán Việt chỉ còn cho chữ Hán (loại note Chữ Hán, hoặc chưa cấu hình mà từ là một chữ Hán)
    hv_ok = kind == "kanji" or (not roles.get("configured") and bool(_ONE_KANJI.match(word)))
    hanviet = _clean(get("hanviet"), 30) if hv_ok else ""
    same = hv_ok and bool(roles.get("hanviet")) and roles.get("hanviet") == roles.get("meaning")
    if hv_ok and (same or not hanviet) and _ALL_KANJI.match(word):
        # deck kanji hay ghi âm Hán Việt trong ngoặc cuối nghĩa: "Sức mạnh (Lực)"
        m = re.search(r"\(([^()0-9]{1,15})\)\s*$", meaning)
        if m:
            hanviet = m.group(1).strip()
            meaning = meaning[: m.start()].strip()
        elif same:
            hanviet = ""
    elif same:
        hanviet = ""
    return {"word": word, "reading": reading, "meaning": meaning, "hanviet": hanviet,
            "usage": _clean(get("usage"), 120)}


# ---------------------------------------------------------------------------
# Gõ đáp án ({{type:Trường}}) – làm giống màn ôn của Anki
# ---------------------------------------------------------------------------

TYPE_PAT = re.compile(r"\[\[type:(.+?)\]\]")


def _input_html(font: str, size: int) -> str:
    return (
        "\n<center>\n<input type=text id=typeans onkeypress=\"_typeAnsPress();\"\n"
        f"   style=\"font-family: '{font}'; font-size: {size}px;\">\n</center>\n"
    )


def type_question(col: Collection, card: Any, buf: str) -> tuple[str, dict[str, Any] | None]:
    """Thay ô `[[type:..]]` ở mặt trước bằng ô nhập. Trả về (html, thông tin để chấm)."""
    m = TYPE_PAT.search(buf)
    if not m:
        return buf, None
    fld = m.group(1)
    cloze_idx = None
    combining = True
    if fld.startswith("cloze:"):
        cloze_idx = card.ord + 1
        fld = fld.split(":")[1]
    if fld.startswith("nc:"):
        combining = False
        fld = fld.split(":")[1]
    expected: str | None = None
    font, size = "Arial", 20
    note = card.note()
    for f in card.note_type()["flds"]:
        if f["name"] == fld:
            expected = note[f["name"]]
            if cloze_idx:
                expected = col.extract_cloze_for_typing(expected, cloze_idx) or None
            font, size = f.get("font", font), f.get("size", size)
            break
    if not expected:
        if expected is None:
            warn = f"(ことば畑: không có trường “{html.escape(fld)}” để gõ đáp án)"
            return TYPE_PAT.sub(lambda _m: warn, buf), None
        return TYPE_PAT.sub("", buf), None
    info = {"expected": expected, "font": font, "size": size, "combining": combining}
    return TYPE_PAT.sub(lambda _m: _input_html(font, size), buf), info


def type_answer(col: Collection, buf: str, info: dict[str, Any] | None, typed: str) -> str:
    """Thay ô `[[type:..]]` ở mặt sau bằng phần so sánh đáp án (giống Anki)."""
    if not info:
        return TYPE_PAT.sub("", buf)
    orig = buf
    size_before = len(buf)
    buf = buf.replace("<hr id=answer>", "")
    had_hr = len(buf) != size_before
    output = col.compare_answer(info["expected"], typed or "", info["combining"])

    def repl(_m: re.Match) -> str:
        s = f"\n<div style=\"font-family: '{info['font']}'; font-size: {info['size']}px\">{output}</div>"
        return f"<hr id=answer>{s}" if had_hr else s

    if had_hr and not TYPE_PAT.search(buf):
        return orig
    return TYPE_PAT.sub(repl, buf)


# ---------------------------------------------------------------------------
# Dựng dữ liệu khu vườn
# ---------------------------------------------------------------------------


def card_due_in(col: Collection, card: Any) -> int | None:
    """Số ngày tới lần ôn kế tiếp (âm = quá hạn); None nếu thẻ mới / bị hoãn."""
    if card.queue == QUEUE_SUSPENDED or card.type == CARD_TYPE_NEW:
        return None
    if card.type in (CARD_TYPE_LRN, CARD_TYPE_RELEARNING) and card.queue in (1, 3):
        return 0
    try:
        return int(card.due) - int(col.sched.today)
    except Exception:
        return None


def review_days(col: Collection, back: int = 400) -> tuple[set[int], datetime.date]:
    """Các ngày có ôn trong `back` ngày gần nhất (0 = hôm nay, -1 = hôm qua…) + ngày lịch của ngày Anki hôm nay.

    1.28 (audit 12/11 F02): ngày Anki theo lịch địa phương (ngay_core), không chia 86400 giây — ngày đổi giờ mùa hè
    không còn đẩy lượt ôn sang ngày bên cạnh."""
    D = ngay.days_of(col)
    since = D.rel_start(-int(back))
    rows = col.db.list(
        "select distinct " + D.sql_day() + " from revlog where id >= ? and type < 4",
        D.mod, since * 1000,
    )
    days = {r for r in (D.rel_of_iso(x) for x in rows) if r is not None}
    return days, D.today


def review_day_total(col: Collection, before_today: bool = False) -> int:
    """1.26: số ngày (ngày Anki) có ít nhất một lượt ôn, từ trước tới nay — cho mốc "đủ 100 ngày có ôn".
    before_today: chỉ đếm các ngày trước hôm nay (để nhớ một lần mỗi ngày, hôm nay cộng riêng)."""
    D = ngay.days_of(col)
    sql = "select count(distinct " + D.sql_day() + ") from revlog where type < 4"
    if before_today:
        return int(col.db.scalar(sql + " and id < ?", D.mod, D.rel_start(0) * 1000) or 0)
    return int(col.db.scalar(sql, D.mod) or 0)


def daily_stats(col: Collection, frozen: Any = ()) -> dict[str, int]:
    """Số lượt ôn hôm nay (theo ngày của Anki) và số ngày ôn liên tiếp. 1.25.9: `frozen` = ngày đã dùng vé giữ chuỗi
    ("yyyy-mm-dd") — nối chuỗi, không cộng thêm.

    1.28 (audit 12/11 F03): chuỗi dài hơn cửa sổ 400 ngày không còn bị chặn ở 401 — chuỗi chạm mép cửa sổ thì đọc
    thêm lịch sử cho tới chỗ đứt đầu tiên."""
    D = ngay.days_of(col)
    reviews = col.db.scalar(
        "select count() from revlog where id >= ? and type < 4", D.rel_start(0) * 1000
    ) or 0
    back = 400
    while True:
        days, today = review_days(col, back)
        fz = more.frozen_rel(frozen, today)
        streak = more.streak_with(days, fz)
        edge = -back                     # ngày cũ nhất trong cửa sổ: chuỗi còn chạm tới đó thì có thể dài hơn
        if (edge not in days and edge not in fz) or back >= 100000:
            break
        back *= 4
    return {"reviews": int(reviews), "streak": streak, "day": int(col.sched.today)}


def deck_search(col: Collection, deck_name: str) -> str:
    base = col.build_search_string(SearchNode(deck=deck_name))
    return f"{base} -is:suspended"


def queue_counts(col: Collection, deck_id: int) -> tuple[int, int, int] | None:
    """(mới, đang học, ôn) Anki còn đưa ra hôm nay ở deck này (đã tính giới hạn mỗi ngày); None nếu không đọc được."""
    try:
        node = col.sched.deck_due_tree(deck_id)
        if node is None:
            return None
        return int(node.new_count), int(node.learn_count), int(node.review_count)
    except Exception:
        return None


def _in_other_filtered(col: Collection, cids: list[int], deck_id: int) -> set[int]:
    """Thẻ của deck này đang được mượn sang một deck lọc khác (`deck:` của Anki vẫn tìm ra theo deck gốc)."""
    if not cids:
        return set()
    try:
        own = {int(x) for x in col.decks.deck_and_child_ids(deck_id)}
        rows = col.db.list(f"select id from cards where id in {ids2str(cids)} and odid != 0 and did not in {ids2str(own)}")
        return {int(x) for x in rows}
    except Exception:
        return set()


def _learning_later(col: Collection, cids: list[int], due: set[int]) -> dict[int, int]:
    """Thẻ đang học (trong ngày) chưa tới lượt: {id thẻ: giờ tới lượt (giây)}, chỉ những thẻ còn trong hôm nay."""
    if not cids:
        return {}
    try:
        cutoff = int(col.sched.day_cutoff)
        rows = col.db.all(f"select id, due from cards where id in {ids2str(cids)} and queue = 1")
    except Exception:
        return {}
    return {int(cid): int(d) for cid, d in rows if cid not in due and int(d) < cutoff}


def anki_version() -> tuple[int, ...]:
    """Bản Anki đang chạy dạng số: "2.1.66" → (2, 1, 66), "24.06.3" → (24, 6, 3), "26.09" → (26, 9, 0)."""
    try:
        from anki.buildinfo import version
        m = re.match(r"(\d+)\.(\d+)(?:\.(\d+))?", version)
        return (int(m.group(1)), int(m.group(2)), int(m.group(3) or 0)) if m else (99, 0, 0)
    except Exception:
        return (99, 0, 0)


def wilted_by_hand(col: Collection, cids: list[int], thr: float, ver: tuple[int, ...] | None = None) -> set[int]:
    """1.22.6: Anki 23.10 → 24.06 có FSRS nhưng phép tìm `prop:r<…` không trả thẻ nào (R trong phép tìm luôn là 1,
    dù bảng thông tin thẻ ghi R = 0,4) → cây không bao giờ héo. Tự tính R của thẻ ôn có trạng thái FSRS như bảng thông
    tin thẻ của chính bản đó: 23.10 – 24.04 FSRS-4 R = (1 + t / 9S)^-1, 24.06 FSRS-4.5 R = (1 + 19t / 81S)^-0.5,
    t = số ngày từ lần ôn cuối (hạn ôn − khoảng cách, thẻ đang ở deck lọc thì hạn ôn gốc). Bản khác: không dùng."""
    ver = ver or anki_version()
    if not cids or not ((23, 10) <= tuple(ver[:2]) < (24, 11)):
        return set()
    try:
        if not col.get_config("fsrs", False):
            return set()
        today = int(col.sched.today)
        rows = col.db.all(f"select id, due, odue, odid, ivl, data from cards where id in {ids2str(cids)} and type = 2")
    except Exception:
        return set()
    decay, factor = (-0.5, 19 / 81) if tuple(ver[:2]) >= (24, 6) else (-1.0, 1 / 9)
    out: set[int] = set()
    for cid, due, odue, odid, ivl, data in rows:
        try:
            st = float((json.loads(data or "{}") or {}).get("s") or 0)
        except (ValueError, TypeError, AttributeError):
            continue
        if st <= 0:
            continue
        t = max(0, today - ((odue if odid and odue else due) - int(ivl or 0)))
        if (1 + factor * t / st) ** decay < thr:
            out.add(int(cid))
    return out


def _safe_find(col: Collection, query: str) -> set[int]:
    try:
        return set(col.find_cards(query))
    except Exception:
        # ví dụ prop:r khi FSRS đang tắt
        return set()


def _model(col: Collection, mid: str) -> Any:
    try:
        return col.models.get(int(mid))
    except Exception:
        return None


GRAMMAR_WORD_NAMES = ["cấu trúc", "cau truc", "ngữ pháp", "ngu phap", "grammar", "structure", "文法", "文型",
                      "mẫu câu", "mau cau", "pattern", "grammar point"]
USAGE_NAMES = ["cách dùng", "cach dung", "usage", "ghi chú", "ghi chu", "note", "notes", "giải thích",
               "giai thich", "explanation", "使い方", "説明", "接続", "cách chia", "connection"]


def _guess_kind_roles(roles: dict[str, Any], keys: list[str], model_name: str) -> dict[str, Any]:
    """Loại note chưa cấu hình mà tên / trường rõ là ngữ pháp → đoán trường kiểu ngữ pháp."""
    if fields.guess_kind(model_name, keys, []) != "grammar":
        return roles
    out = dict(roles, kind="grammar")
    word = _find_field(keys, "", GRAMMAR_WORD_NAMES, set())
    if word:
        out["word"] = word
    taken = {v for k, v in out.items() if k in fields.ROLE_IDS and isinstance(v, str)}
    out["usage"] = _find_field(keys, "", USAGE_NAMES, taken)
    if out.get("meaning") == out.get("word"):
        out["meaning"] = _find_field(keys, "", MEANING_NAMES, taken | {out["word"]})
    return out


def _sample_text(raw: str) -> str:
    text = _SOUND_RE.sub(lambda m: " ♪" + os.path.basename(m.group(1)) + " ", raw or "")
    return _clean(text, 70)


_VIET = re.compile(r"[ăâđêôơưĂÂĐÊÔƠƯạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]")
_JP_ANY = re.compile(r"[\u3041-\u30fa\u3400-\u9fff]")


def crammed(words: list[str], lang: str) -> bool:
    """Trường Từ có vẻ nhồi chung cả nghĩa (vd. 「食べる (たべる) - ăn」, 「apple - quả táo」): chỉ để cảnh báo."""
    sample = [w for w in words if w and w != "?"]
    if len(sample) < 2:
        return False
    def bad(w: str) -> bool:
        if lang == "ja":
            return bool(_JP_ANY.search(w) and _VIET.search(w))
        return bool(re.search(r"[A-Za-z]", w) and _VIET.search(w) and re.search(r"\s[-–:=]\s|\s/\s|:\s", w))
    return sum(1 for w in sample if bad(w)) * 2 >= len(sample)


def guess_config(col: Collection, model: Any, sample_notes: list[Any], cfg: dict[str, Any]) -> dict[str, Any]:
    """Cấu hình gợi ý cho một loại note (điền sẵn trong bảng cấu hình), kèm ngôn ngữ đoán được."""
    keys = [f["name"] for f in model["flds"]]
    roles = _guess_kind_roles(guess_roles(keys, cfg), keys, model["name"])
    wf = roles.get("word") or (keys[0] if keys else None)
    raw_words = [text.plain_text(n[wf]) for n in sample_notes] if wf else []
    # cùng cách đoán với vườn (≤ 30 note của loại note), để bảng và vườn không lệch nhau
    lang = guess_model_lang(col, str(model["id"]), keys, wf, model["name"], raw_words)
    if lang != "ja":
        roles = guess_roles_lang(keys, cfg, lang)
        f = {r: roles[r] for r in fields.role_ids("vocab") if roles.get(r)}
        return {"kind": "vocab", "f": f, "lang": lang}
    roles["lang"] = "ja"
    words = [note_details(n, cfg, roles)["word"] for n in sample_notes]
    kind = fields.guess_kind(model["name"], keys, words)
    if kind == "kanji":
        if roles.get("reading_extra"):
            roles["kun"] = roles["reading_extra"][0]
        if not roles.get("hanviet") and roles.get("meaning") and any(
                re.search(r"\([^()0-9]{1,15}\)\s*$", _clean(n[roles["meaning"]])) for n in sample_notes):
            roles["hanviet"] = roles["meaning"]          # "Sức mạnh (Lực)": Hán Việt nằm trong ngoặc của nghĩa
    f = {r: roles[r] for r in fields.role_ids(kind) if roles.get(r)}
    return {"kind": kind, "f": f, "lang": "ja"}


def fields_panel(col: Collection, deck_id: int, cfg: dict[str, Any] | None = None,
                 sample_n: int = 5) -> dict[str, Any]:
    """Dữ liệu cho bảng Cấu hình trường: mọi loại note có note (loại của deck đang xem lên trước)."""
    cfg = merged_config(cfg)
    _LANG_GUESS.clear()
    store = cfg.get("_fields") or {"models": {}, "games": {}}
    deck = col.decks.get(deck_id) or col.decks.current()
    in_deck: dict[str, list[int]] = {}
    nids = sorted(col.find_notes(deck_search(col, deck["name"])))
    if nids:
        for nid, mid in col.db.all(f"select id, mid from notes where id in {ids2str(nids)} order by id"):
            in_deck.setdefault(str(mid), []).append(nid)
    models = []
    for row in col.models.all_names_and_ids():
        mid = str(row.id)
        model = _model(col, mid)
        if not model:
            continue
        total = col.models.use_count(model)
        if not total and mid not in in_deck:
            continue
        keys = [f["name"] for f in model["flds"]]
        ids = (in_deck.get(mid) or [])[:sample_n] or sorted(col.find_notes(f"mid:{mid}"))[:sample_n]
        notes = [col.get_note(n) for n in ids]
        conf = (store.get("models") or {}).get(mid)
        problem = fields.conf_problem(conf, keys)
        guess = guess_config(col, model, notes, cfg)
        lang = (store.get("lang") or {}).get(mid) or guess["lang"]
        wf = (conf or {}).get("f", {}).get("word") if conf else guess["f"].get("word")
        words = [text.plain_text(n[wf]) for n in notes] if wf in keys else []
        models.append({
            "id": mid, "name": model["name"], "fields": keys, "count": total, "deck_count": len(in_deck.get(mid, [])),
            "conf": conf, "configured": problem is None, "problem": problem if (conf and problem) else "",
            "guess": guess, "lang": lang, "lang_set": mid in (store.get("lang") or {}),
            "crammed": crammed(words, lang),
            "samples": [{k: _sample_text(n[k]) for k in keys} for n in notes],
        })
    models.sort(key=lambda m: (0 if m["deck_count"] else 1, -m["deck_count"], m["name"].lower()))
    return {"kinds": fields.kinds_view(), "langs": fields.langs_view(), "models": models, "deck": deck["name"],
            "games": store.get("games") or {}}


def build_garden(col: Collection, deck_id: int, cfg: dict[str, Any] | None = None) -> dict[str, Any]:
    cfg = merged_config(cfg)
    _LANG_GUESS.clear()
    stage_days = cfg["stage_days"]
    max_plants = max(1, int(cfg["max_plants"]))
    tts = cfg.get("_tts") or {}          # 1.17: máy có giọng đọc của ngôn ngữ nào (vd. {"en": True})

    deck = col.decks.get(deck_id) or col.decks.current()
    deck_name = deck["name"]
    base = deck_search(col, deck_name)

    cids = sorted(col.find_cards(base))
    due = _safe_find(col, f"{base} is:due")
    thr = float(cfg["wilt_retrievability"])
    wilted = _safe_find(col, f"{base} prop:r<{thr}") | wilted_by_hand(col, cids, thr)   # 1.22.6: Anki 23.10 – 24.06
    # 1.18: cây trông khát / héo nhưng hôm nay Anki không đưa ra ôn → không đếm lên nút Tưới ngay
    buried = _safe_find(col, f"{base} is:buried")
    later = _learning_later(col, cids, due)
    away = _in_other_filtered(col, cids, int(deck["id"]))   # thẻ đang nằm ở deck lọc khác: ôn ở đó, không ở đây

    # Chọn N note đầu tiên theo thứ tự tạo (id thẻ nhỏ nhất của note)
    nid_order: list[int] = []
    cards_of: dict[int, list[int]] = {}
    if cids:
        for cid, nid in col.db.all(f"select id, nid from cards where id in {ids2str(cids)} order by id"):
            if nid not in cards_of:
                cards_of[nid] = []
                nid_order.append(nid)
            cards_of[nid].append(cid)
    total_notes = len(nid_order)
    if total_notes > max_plants:
        # deck lớn (vd. 812 kanji): ưu tiên hiện các cây đã học
        learned = set(col.db.list(f"select distinct nid from cards where id in {ids2str(cids)} and type != 0"))
        nid_order = [n for n in nid_order if n in learned] + [n for n in nid_order if n not in learned]
    shown = nid_order[:max_plants]

    plants = []
    stage_counts = [0] * len(STAGES)
    thirsty_count = 0
    wilted_count = 0
    held_counts: dict[str, int] = {}
    role_cache: dict[tuple[str, tuple[str, ...]], dict[str, Any]] = {}
    plant_mid: list[str] = []
    lang_of: dict[str, str] = {}
    plant_meta: list[dict[str, Any]] = []       # 1.14: tag + deck của thẻ (gán giống cây), bỏ trước khi gửi sang trang
    chains: dict[int, list[int]] = {}
    for nid in shown:
        note = col.get_note(nid)
        mid = note_mid(note) or ""
        ck = (mid, tuple(note.keys()))
        roles = role_cache.get(ck)
        if roles is None:
            roles = role_cache[ck] = note_roles(note, cfg)
        det = note_details(note, cfg, roles)
        word, reading, meaning = det["word"], det["reading"], det["meaning"]
        lang = roles.get("lang") or "ja"
        has_audio = note_audio(note, cfg, roles) is not None
        try:
            ex = note_example(note, cfg, word, reading, roles)
        except Exception:
            ex = {"cloze": None, "ex_audio": False, "ex_meaning": "", "ex": False}
        voiced = lang != "ja" and bool(tts.get(lang))        # không có audio thì đọc bằng giọng của máy
        lang_of[mid] = lang
        plant_mid.append(mid)
        stage = STAGE_FRUIT
        stab: float | None = None
        due_in: int | None = None
        is_due = False
        is_wilted = False
        is_buried = False
        is_away = False
        later_at: int | None = None
        first_did: int | None = None
        for cid in cards_of[nid]:
            card = col.get_card(cid)
            if first_did is None:
                first_did = int(getattr(card, "odid", 0) or getattr(card, "did", 0) or 0)
            stage = min(stage, stage_of(card, stage_days))
            s = stability_of(card)
            if s is not None:
                stab = s if stab is None else min(stab, s)
            is_due = is_due or (cid in due and cid not in away)
            is_wilted = is_wilted or cid in wilted
            if cid in later:
                later_at = later[cid] if later_at is None else min(later_at, later[cid])
            d_in = card_due_in(col, card)
            if d_in is not None:
                due_in = d_in if due_in is None else min(due_in, d_in)
            # chỉ tính thẻ bị hoãn / ở deck lọc khi thẻ đó lẽ ra phải tưới (đến hạn hoặc héo), không tính thẻ mới
            if cid in buried and ((d_in is not None and d_in <= 0) or cid in wilted):
                is_buried = True
            if cid in away and (cid in due or cid in wilted):
                is_away = True
        if first_did and first_did not in chains:
            try:
                chains[first_did] = [first_did] + [int(d["id"]) for d in reversed(col.decks.parents(first_did))]
            except Exception:
                chains[first_did] = [first_did]
        plant_meta.append({"tags": list(getattr(note, "tags", []) or [])[:40], "decks": chains.get(first_did or 0, [])})
        stage_counts[stage] += 1
        # Khát = có thẻ Anki sẽ đưa ra ôn ngay (is:due đã bỏ thẻ bị hoãn / tạm ngưng / đang học chưa tới lượt).
        # Trước 1.18 cây héo (R thấp) cũng tính là khát, kể cả khi Anki chưa cho ôn → nút Tưới ngay còn số
        # mà bảng ôn báo hết thẻ.
        thirsty_count += 1 if is_due else 0
        wilted_count += 1 if is_wilted else 0
        # Vì sao cây héo / có thẻ chờ mà chưa tưới được (chỉ khi không khát)
        held = None
        if not is_due:
            if is_away:
                held = "filtered"        # thẻ đang ở deck lọc (Filtered deck) khác deck đang xem
            elif is_buried:
                held = "buried"          # Anki hoãn tới mai (thẻ cùng note vừa ôn, hoặc bấm Hoãn)
            elif later_at is not None:
                held = "later"           # thẻ đang học, tới lượt sau (quá thời gian "học trước" của Anki)
            elif is_wilted:
                held = "notdue"          # R đã thấp nhưng Anki hẹn ôn sau (thường do lịch có từ trước khi bật FSRS)
        if held:
            held_counts[held] = held_counts.get(held, 0) + 1
        plants.append(
            {
                "nid": nid,
                "word": word,
                "reading": reading,
                "meaning": meaning,
                "hanviet": det["hanviet"],
                "audio": has_audio or (voiced and word != "?"),
                "lang": lang,
                "usage": det["usage"],
                "cloze": ex["cloze"],
                "ex_audio": ex["ex_audio"] or (voiced and ex["ex"]),
                "ex_meaning": ex["ex_meaning"],
                "has_ex": ex["ex"],
                "stage": stage,
                "thirsty": is_due,
                "wilted": is_wilted,
                "held": held,
                "later_at": later_at if held == "later" else None,
                "cards": len(cards_of[nid]),
                "stability": round(stab, 1) if stab is not None else None,
                "due_in": due_in,
            }
        )

    # 1.9: các loại note của deck — loại (từ vựng / chữ Hán / ngữ pháp) và đã cấu hình trường chưa
    counts: dict[str, int] = {}
    if nid_order:
        for _nid, nmid in col.db.all(f"select id, mid from notes where id in {ids2str(nid_order)}"):
            counts[str(nmid)] = counts.get(str(nmid), 0) + 1
    store = cfg.get("_fields") or {}
    types = []
    for mid, count in sorted(counts.items(), key=lambda kv: (-kv[1], kv[0])):
        model = _model(col, mid)
        keys = [f["name"] for f in model["flds"]] if model else []
        name = model["name"] if model else "?"
        conf = (store.get("models") or {}).get(mid)
        problem = fields.conf_problem(conf, keys)
        lang = lang_of.get(mid) or model_lang(col, mid, keys, (conf or {}).get("f", {}).get("word"), name, cfg)
        if problem is None:
            kind = conf["kind"]
        else:
            words = [p["word"] for p, m in zip(plants, plant_mid) if m == mid][:30]
            kind = fields.guess_kind(name, keys, words) if lang == "ja" else "vocab"
        if lang != "ja" and kind in ("kanji", "grammar"):
            kind = "vocab"
        types.append({"id": mid, "name": name, "count": count, "kind": kind, "configured": problem is None,
                      "problem": problem if (conf and problem) else "", "lang": lang})
    kind_of = {t["id"]: t["kind"] for t in types}
    for p, m in zip(plants, plant_mid):
        p["kind"] = kind_of.get(m, "vocab")

    decks = sorted(
        ({"id": d.id, "name": d.name} for d in col.decks.all_names_and_ids()),
        key=lambda d: d["name"].lower(),
    )
    # Số trên nút Tưới ngay: không vượt quá số thẻ đang học + ôn mà Anki còn cho ôn hôm nay (giới hạn của deck)
    queue = queue_counts(col, int(deck["id"]))
    water_now = thirsty_count if queue is None else min(thirsty_count, queue[1] + queue[2])
    if thirsty_count > water_now:
        held_counts["limit"] = thirsty_count - water_now
    return {
        "deck": {"id": deck["id"], "name": deck_name},
        "decks": decks,
        "stage_names": STAGES,
        "plants": plants,
        "note_types": types,
        "_meta": plant_meta,
        "game_modes": store.get("games") or {},
        "game_modes_lang": store.get("games_lang") or {},
        "tts": {k: bool(v) for k, v in tts.items()},
        "stats": {
            "stages": stage_counts,
            "thirsty": thirsty_count,
            "water_now": water_now,
            "held": held_counts,
            "queue": list(queue) if queue is not None else None,   # [mới, đang học, ôn] Anki còn cho hôm nay
            "wilted": wilted_count,
            "due_cards": len(due),
            "total_notes": total_notes,
            "shown": len(plants),
        },
    }


# ---------------------------------------------------------------------------
# Xu và trạng thái phụ (không đồng bộ qua AnkiWeb)
# ---------------------------------------------------------------------------


def reward_for_answer(ease: int, old_stage: int | None, new_stage: int | None) -> int:
    """+1 xu khi nhớ được (Hard/Good/Easy); thưởng thêm khi cây lên giai đoạn.

    Không thưởng theo số lần bấm Easy để khỏi khuyến khích ăn gian.
    """
    coins = 1 if ease > 1 else 0
    if old_stage is not None and new_stage is not None and new_stage > old_stage:
        coins += 2 * new_stage
    return coins


QUEST_TEXT = {
    "due": "Tưới {n} cây đang khát (ôn {n} thẻ đến hạn)",
    "new": "Gieo {n} hạt mới (học {n} thẻ mới)",
    "stage": "Giúp {n} cây lớn thêm một giai đoạn",
    "streak": "Tưới liền {n} cây không bấm “Lại”",
    "games": "Chơi {n} ván mini-game",
    "win": "Thắng {n} ván mini-game bất kỳ",
    "cloze": "Chơi {n} ván “Điền vào câu”",
    "paper": "Đọc xong {n} số báo (làm hết phần luyện tập)",
    "dict": "Chép đúng {n} câu chính tả",
}


def _make_quests(day: int, due_avail: int, new_avail: int, extra: tuple[str, ...] = ()) -> list[dict[str, Any]]:
    """extra: các loại nhiệm vụ làm được hôm nay ngoài thẻ và game ("paper" khi có báo chưa đọc,
    "dict" khi có câu để chép chính tả). Không có extra thì kết quả y như bản cũ."""
    import random
    rng = random.Random(day * 7919 + 17)
    a_opts = []
    if due_avail >= 3:
        a_opts.append(("due", min(20, max(3, due_avail // 2))))
    if new_avail >= 3:
        a_opts.append(("new", min(10, new_avail)))
    first = rng.choice(a_opts) if a_opts else ("streak", 8)
    b_opts = [x for x in [("stage", 3), ("streak", 10)] if x[0] != first[0]]
    second = rng.choice(b_opts)
    third_opts = [("games", 2), ("win", 1), ("cloze", 1)]
    if "paper" in extra:
        third_opts.append(("paper", 1))
    if "dict" in extra:
        third_opts.append(("dict", 3))
    third = rng.choice(third_opts)
    out = []
    for i, (kind, n) in enumerate([first, second, third]):
        out.append({"id": f"{day}-{i}", "kind": kind, "target": int(n),
                    "text": QUEST_TEXT[kind].format(n=n), "reward": QUEST_REWARD})
    return out


def _qint(v: Any, lo: int) -> bool:
    return isinstance(v, int) and not isinstance(v, bool) and lo <= v <= 100000


def _clean_quest(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict) or not isinstance(raw.get("day"), int):
        return None
    # 1.25.3: list / progress / done sai kiểu thì coi như trống (trước đây ném lỗi → mất cả nhiệm vụ hôm nay)
    lst = [q for q in (raw.get("list") if isinstance(raw.get("list"), list) else [])
           if isinstance(q, dict) and isinstance(q.get("kind"), str) and q.get("kind") in QUEST_TEXT
           and _qint(q.get("target"), 1) and isinstance(q.get("id"), str) and isinstance(q.get("text"), str)
           and _qint(q.get("reward"), 0)]       # 1.25.9: thiếu id / text / reward → bỏ (trước đây KeyError)
    prog = {k: v for k, v in (raw.get("progress") if isinstance(raw.get("progress"), dict) else {}).items()
            if isinstance(k, str) and isinstance(v, int) and not isinstance(v, bool)}
    done = [x for x in (raw.get("done") if isinstance(raw.get("done"), list) else []) if isinstance(x, str)]
    return {"day": raw["day"], "list": lst, "progress": prog, "done": done, "chest": bool(raw.get("chest")),
            "chest_item": raw.get("chest_item") if isinstance(raw.get("chest_item"), str) and raw.get("chest_item") in CATALOG else None}


def _ensure_quests(data: dict[str, Any], day: int, avail: Any) -> bool:
    q = data.get("quest")
    if q and q.get("day") == day and q.get("list"):
        return False
    try:
        got = tuple(avail()) if callable(avail) else (0, 0)
        due_avail, new_avail = int(got[0]), int(got[1])
        extra = tuple(x for x in (got[2] if len(got) > 2 else ()) if isinstance(x, str))
    except Exception:
        due_avail, new_avail, extra = 0, 0, ()
    data["quest"] = {"day": day, "list": _make_quests(day, due_avail, new_avail, extra), "progress": {},
                     "done": [], "chest": False, "chest_item": None}
    return True


def _settle_quests(data: dict[str, Any]) -> dict[str, Any]:
    """Trao thưởng cho nhiệm vụ vừa xong; xong cả 3 thì mở rương đồ hiếm."""
    q = data["quest"]
    done_now, coins = [], 0
    for item in q["list"]:
        if item["id"] in q["done"]:
            continue
        if q["progress"].get(item["kind"], 0) >= item["target"]:
            q["done"].append(item["id"])
            data["coins"] += item["reward"]
            coins += item["reward"]
            done_now.append(item["text"])
    chest = None
    if q["list"] and len(q["done"]) >= len(q["list"]) and not q["chest"]:
        q["chest"] = True
        owned = data["home"]["owned"]
        rid = next((r for r in RARE_ORDER if not owned.get(r)), None)
        data["coins"] += CHEST_COINS
        coins += CHEST_COINS
        if rid:
            owned[rid] = owned.get(rid, 0) + 1
            q["chest_item"] = rid
            chest = {"id": rid, "name": CATALOG[rid]["name"], "coins": CHEST_COINS}
        else:
            data["coins"] += 100
            coins += 100
            chest = {"id": None, "name": "", "coins": CHEST_COINS + 100}
    return {"done": done_now, "coins": coins, "chest": chest}


def quest_view(data: dict[str, Any]) -> dict[str, Any]:
    q = data.get("quest") or {"day": 0, "list": [], "progress": {}, "done": [], "chest": False}
    owned = data["home"]["owned"]
    nxt = next((r for r in RARE_ORDER if not owned.get(r)), None)
    return {
        "day": q["day"],
        "list": [dict(item, progress=min(item["target"], q["progress"].get(item["kind"], 0)),
                      done=item["id"] in q["done"]) for item in q["list"]],
        "chest": q["chest"], "chest_item": q.get("chest_item"),
        "next_rare": {"id": nxt, "name": CATALOG[nxt]["name"]} if nxt else None,
        "reward": QUEST_REWARD, "chest_coins": CHEST_COINS,
    }


CONFIG_KEY = "kotoba_batake_state"

QUEST_REWARD = 20
CHEST_COINS = 30


# ---------------------------------------------------------------------------
# 1.11: bù xu cho lượt ôn ngoài add-on (AnkiDroid / AnkiMobile / máy chưa cài add-on)
# ---------------------------------------------------------------------------
# Cách làm: đếm theo từng ngày Anki. R = số lượt trong revlog (sau mốc `start`), C = số lượt add-on đã
# trả xu (máy tính cộng vào C ngay khi trả, lần bù cũng nâng C lên bằng R). Bù = R − C. Không cần nhớ id
# từng lượt; lượt từ điện thoại đồng bộ về muộn (ngày cũ) vẫn được bù miễn còn trong MOBILE_WINDOW ngày.
# Sổ nằm ở khoá riêng MOBILE_KEY (bản ≤ 1.10 không đọc, không xoá). Lần đầu chạy: mốc = lúc đó, nên không
# trả bù cho lượt ôn trước khi cài bản này.

MOBILE_KEY = "kotoba_batake_mobile"
MOBILE_WINDOW = 14          # chỉ bù trong 14 ngày Anki gần nhất
MOBILE_DAY_CAP = 1000       # mỗi ngày bù tối đa chừng này xu (phòng revlog nhập từ nơi khác)
MOBILE_FIELDS = ("all", "ok", "rev", "new")   # mọi lượt / nhớ được / thẻ ôn (đến hạn) / thẻ mới học lần đầu


def _nonneg(v: Any) -> int:
    return v if isinstance(v, int) and not isinstance(v, bool) and v > 0 else 0


def new_mobile(now_ms: int, goal_day: Any = None) -> dict[str, Any]:
    """Sổ mới: mốc = bây giờ; ngày đã nhận thưởng mục tiêu (nếu có) ghi luôn để không trả lại."""
    goals = [goal_day] if isinstance(goal_day, int) and not isinstance(goal_day, bool) else []
    return {"v": 1, "start": int(now_ms), "days": {}, "goals": goals,
            "total": {"reviews": 0, "coins": 0}, "last": None}


def clean_mobile(raw: Any) -> dict[str, Any] | None:
    """Làm sạch sổ bù xu đọc từ collection. None = chưa có sổ (chưa từng chạy 1.11 / dữ liệu hỏng)."""
    if not isinstance(raw, dict) or not isinstance(raw.get("start"), int) or isinstance(raw.get("start"), bool):
        return None
    days: dict[str, dict[str, int]] = {}
    for k, v in (raw.get("days") or {}).items() if isinstance(raw.get("days"), dict) else []:
        try:
            d = int(k)
        except (TypeError, ValueError):
            continue
        if isinstance(v, dict):
            days[str(d)] = {f: _nonneg(v.get(f)) for f in MOBILE_FIELDS}
            if _nonneg(v.get("paid")):
                days[str(d)]["paid"] = min(_nonneg(v.get("paid")), MOBILE_DAY_CAP)
    goals = sorted({g for g in raw.get("goals") or [] if isinstance(g, int) and not isinstance(g, bool)}) \
        if isinstance(raw.get("goals"), list) else []
    tot = raw.get("total") if isinstance(raw.get("total"), dict) else {}
    last = raw.get("last")
    if isinstance(last, dict):
        last = {"at": _nonneg(last.get("at")), "reviews": _nonneg(last.get("reviews")),
                "coins": _nonneg(last.get("coins"))}
    else:
        last = None
    return {"v": 1, "start": raw["start"], "days": days, "goals": goals,
            "total": {"reviews": _nonneg(tot.get("reviews")), "coins": _nonneg(tot.get("coins"))}, "last": last}


def revlog_by_day(col: Collection, start_ms: int, window: int = MOBILE_WINDOW) -> dict[int, dict[str, int]]:
    """Đếm lượt ôn trong revlog theo ngày Anki, `window` ngày gần nhất (kể cả hôm nay).

    day_all: mọi lượt của ngày (như "Hôm nay X lượt", dùng cho mục tiêu ngày);
    all / ok / rev / new: chỉ lượt sau mốc (id > start_ms) — mọi lượt / nhớ được (Khó, Được, Dễ) /
    thẻ ôn (revlog type 1) / thẻ mới học lần đầu (lượt đầu tiên của thẻ). Bỏ qua lượt "đổi lịch tay" (type ≥ 4).
    1.28: ngày Anki theo lịch địa phương (ngay_core)."""
    D = ngay.days_of(col)
    today = int(col.sched.today)
    lo = D.rel_start(-(window - 1)) * 1000
    rows = col.db.all(
        "select r.id, " + D.sql_day("r.id") + ", r.type, r.ease, "
        "case when r.type = 0 then not exists (select 1 from revlog p where p.cid = r.cid and p.id < r.id "
        "and p.type < 4) else 0 end "
        "from revlog r where r.id >= ? and r.type < 4",
        D.mod, lo,
    )
    out: dict[int, dict[str, int]] = {}
    for rid, ds, typ, ease, first in rows:
        rel = D.rel_of_iso(ds)
        if rel is None or rel > 0:          # đồng hồ máy khác chạy trước: để tới ngày đó mới tính
            continue
        c = out.setdefault(today + int(rel), {"day_all": 0, "all": 0, "ok": 0, "rev": 0, "new": 0})
        c["day_all"] += 1
        if rid <= start_ms or not 1 <= int(ease or 0) <= 4:
            continue
        c["all"] += 1
        if ease >= 2:
            c["ok"] += 1
        if typ == 1:
            c["rev"] += 1
        if first:
            c["new"] += 1
    return out


def mobile_day_of(start_ms: int, day_cutoff: int, today: int) -> int:
    """Ngày Anki chứa mốc start_ms (1.28: theo lịch địa phương)."""
    return today + ngay.Days(day_cutoff).rel_of(start_ms // 1000)


def settle_mobile(data: dict[str, Any], counts: dict[int, dict[str, int]], today: int, start_day: int,
                  goal: int, bonus: int, window: int = MOBILE_WINDOW) -> dict[str, Any]:
    """Trả xu cho lượt chưa được trả (R − C) và thưởng mục tiêu ngày còn thiếu. Sửa `data` tại chỗ.

    Trả về {"reviews", "coins", "goal", "goal_days", "rev_today", "new_today", "days"}."""
    m = data["mobile"]
    res = {"reviews": 0, "coins": 0, "goal": 0, "goal_days": [], "rev_today": 0, "new_today": 0, "days": 0}
    lo = today - window + 1
    for d in sorted(counts):
        if d < lo or d > today:
            continue
        r = counts[d]
        c = m["days"].get(str(d)) or {f: 0 for f in MOBILE_FIELDS}
        delta = {f: max(0, r.get(f, 0) - c.get(f, 0)) for f in MOBILE_FIELDS}
        if delta["all"] or delta["ok"]:
            # 1.25.9: trần tính cho cả ngày (cộng các lần bù trước), không phải cho từng lần đồng bộ
            paid = _nonneg(c.get("paid"))
            gained = min(delta["ok"], max(0, MOBILE_DAY_CAP - paid))
            data["coins"] += gained
            data["waters"] = data.get("waters", 0) + delta["all"]
            res["reviews"] += delta["all"]
            res["coins"] += gained
            res["days"] += 1
            if d == today:
                res["rev_today"], res["new_today"] = delta["rev"], delta["new"]
            m["days"][str(d)] = {f: max(c.get(f, 0), r.get(f, 0)) for f in MOBILE_FIELDS}
            if paid + gained:
                m["days"][str(d)]["paid"] = paid + gained
        if (goal > 0 and d >= start_day and r.get("day_all", 0) >= goal and d not in m["goals"]
                and data.get("goal_day") != d):
            m["goals"].append(d)
            data["coins"] += max(0, int(bonus))
            res["goal"] += max(0, int(bonus))
            res["goal_days"].append(d)
            if d == today or not isinstance(data.get("goal_day"), int) or data["goal_day"] < d:
                data["goal_day"] = d
    m["days"] = {k: v for k, v in m["days"].items() if int(k) >= lo}
    m["goals"] = sorted(g for g in set(m["goals"]) if g >= lo - 1)
    return res


def record_desktop(data: dict[str, Any], day: int | None, ease: int, before: str | None) -> None:
    """Máy tính vừa trả xu cho một lượt ôn: cộng vào C của ngày đó (để lần bù không trả lại)."""
    m = data.get("mobile")
    if not isinstance(m, dict) or day is None:
        return
    c = m["days"].setdefault(str(int(day)), {f: 0 for f in MOBILE_FIELDS})
    c["all"] += 1
    c["ok"] += 1 if ease > 1 else 0
    c["rev"] += 1 if before == "review" else 0
    c["new"] += 1 if before == "new" else 0


def undo_reward(data: dict[str, Any], entry: dict[str, Any]) -> int:
    """1.23 (KB-03): Undo lượt ôn (Edit → Undo của Anki) thì trả lại phần thưởng add-on đã cộng cho lượt đó — trước
    đây ôn rồi Undo lặp lại cùng một thẻ thì mỗi vòng lại được +1 xu, +xu lên giai đoạn, cộng tiến độ nhiệm vụ.

    `entry` do __init__ ghi lúc trả xu (xem `_ledger`). Trừ xu (không xuống dưới 0 nếu đã tiêu), bớt số lần tưới /
    thu hoạch, sổ "máy tính đã trả xu" của ngày đó (để lần bù xu điện thoại sau không lệch), thưởng mục tiêu ngày, tiến
    độ + phần thưởng nhiệm vụ do chính lượt này hoàn thành, rương (món hiếm chưa đặt ra sân thì lấy lại). Trả về số xu
    đã trừ."""
    want = sum(max(0, int(entry.get(k) or 0)) for k in ("gained", "goal", "quest_coins"))
    take = min(max(0, int(data.get("coins") or 0)), want)
    data["coins"] = int(data.get("coins") or 0) - take
    data["waters"] = max(0, int(data.get("waters") or 0) - 1)
    if entry.get("harvest"):
        data["harvests"] = max(0, int(data.get("harvests") or 0) - 1)
    ease, before, day = int(entry.get("ease") or 0), entry.get("before"), entry.get("day")
    m = data.get("mobile")
    if isinstance(m, dict) and isinstance(day, int):
        c = m.get("days", {}).get(str(day))
        if isinstance(c, dict):
            for f, on in (("all", True), ("ok", ease > 1), ("rev", before == "review"), ("new", before == "new")):
                if on:
                    c[f] = max(0, int(c.get(f) or 0) - 1)
    if entry.get("goal") and isinstance(entry.get("goal_day"), int):
        if data.get("goal_day") == entry["goal_day"]:
            data.pop("goal_day", None)
        if isinstance(m, dict) and entry["goal_day"] in m.get("goals", []):
            m["goals"].remove(entry["goal_day"])
    q = data.get("quest")
    if isinstance(q, dict) and q.get("day") == entry.get("qday"):
        pr = q.get("progress") or {}
        for k, on in (("due", before == "review"), ("new", before == "new"), ("stage", bool(entry.get("stage_up")))):
            if on and pr.get(k):
                pr[k] = max(0, int(pr[k]) - 1)
        # 1.25.3: chuỗi "Tưới liền N cây không bấm Lại" về như trước lượt này (trước đây giữ nguyên → ván trò chơi sau đó
        # chạy _settle_quests và trả lại thưởng nhiệm vụ chuỗi đã Undo). Undo của Anki đi ngược thứ tự nên mỗi lượt
        # trả về đúng số của chính nó.
        if isinstance(entry.get("streak0"), int) and isinstance(entry.get("streak_cur0"), int):
            pr["streak_cur"] = max(0, entry["streak_cur0"])
            pr["streak"] = max(0, min(int(pr.get("streak") or 0), entry["streak0"]))
        for qid in entry.get("quest_done") or []:
            if qid in q.get("done", []):
                q["done"].remove(qid)
        if entry.get("chest") and q.get("chest"):
            q["chest"] = False
            rid = q.get("chest_item")
            owned = data.get("home", {}).get("owned", {})
            if rid and owned.get(rid, 0) > placed_count(data.get("home", {}), rid):
                owned[rid] -= 1
                if owned[rid] <= 0:
                    owned.pop(rid, None)
            q["chest_item"] = None
    return take


def redo_reward(data: dict[str, Any], entry: dict[str, Any]) -> int:
    """1.23: Redo (làm lại lượt vừa Undo) → cộng lại xu của lượt ôn và số lần tưới (không cộng lại nhiệm vụ / mục tiêu)."""
    g = max(0, int(entry.get("gained") or 0))
    data["coins"] = int(data.get("coins") or 0) + g
    data["waters"] = int(data.get("waters") or 0) + 1
    if entry.get("harvest"):
        data["harvests"] = int(data.get("harvests") or 0) + 1
    record_desktop(data, entry.get("day") if isinstance(entry.get("day"), int) else None,
                   int(entry.get("ease") or 0), entry.get("before"))
    return g


# 1.23 (KB-02): file sao lưu trong user_files/ dùng chung cho mọi hồ sơ Anki trên máy. Hồ sơ mới (collection chưa có
# ví) trước đây đọc luôn các file đó → nhận xu, nhà, tiến độ báo của hồ sơ khác. Nay mỗi file sao lưu ghi kèm "chủ"
# (OWNER_KEY = mã của thư mục hồ sơ); collection chưa có khoá thì chỉ dùng file sao lưu có đúng chủ là hồ sơ đang mở.
# File của bản ≤ 1.22 (không ghi chủ) coi như của hồ sơ khác — dữ liệu luôn nằm trong collection từ ≤ 1.0 nên không ai
# cần chuyển từ file nữa.
OWNER_KEY = "_ho_so"


def profile_key(col: Any) -> str:
    """Mã ngắn của hồ sơ Anki (theo thư mục chứa collection). "" nếu không biết (collection giả trong test)."""
    path = getattr(col, "path", "") if col is not None else ""
    if not isinstance(path, str) or not path:
        return ""
    folder = os.path.dirname(os.path.abspath(path))
    return hashlib.sha1(folder.encode("utf-8", "replace")).hexdigest()[:16]


def backup_payload(payload: Any, col: Any) -> Any:
    """Bản ghi ra file sao lưu: thêm chủ (hồ sơ đang mở) nếu biết."""
    key = profile_key(col)
    if key and isinstance(payload, dict):
        return dict(payload, **{OWNER_KEY: key})
    return payload


def backup_data(raw: Any, col: Any) -> Any:
    """Dữ liệu đọc từ file sao lưu dùng được cho hồ sơ đang mở không: không có collection (test) → dùng nguyên; có
    collection → chỉ khi file ghi đúng chủ (bỏ khoá chủ trước khi trả về); không thì None."""
    if col is None:
        return raw
    key = profile_key(col)
    if not key or not isinstance(raw, dict) or raw.get(OWNER_KEY) != key:
        return None
    out = dict(raw)
    out.pop(OWNER_KEY, None)
    return out


class GardenState:
    """Xu, thu hoạch, kỷ lục mini-game, nhà, nhiệm vụ.

    Nếu có collection: lưu trong cấu hình collection (khoá CONFIG_KEY) nên được
    đồng bộ qua AnkiWeb giữa các máy. Luôn ghi thêm một bản sao lưu ra file
    user_files/state.json. Lần đầu chạy bản mới sẽ tự chuyển dữ liệu cũ từ file.
    """

    def __init__(self, path: str, col_getter: Any = None) -> None:
        self.path = path
        self.col_getter = col_getter
        # 1.25.3: móc của __init__ (Undo lượt ôn): on_load(data) áp phần "trả lại xu" đang chờ vào ví vừa đọc, on_save(data)
        # báo phần đó đã được ghi. Chờ vì ghi cấu hình collection ngay sau Undo làm Anki xoá mất Redo.
        self.on_load: Any = None
        self.on_save: Any = None

    def _col(self) -> Any:
        try:
            return self.col_getter() if self.col_getter else None
        except Exception:
            return None

    def _read_file(self) -> Any:
        try:
            with open(self.path, encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return None

    def _read(self) -> Any:
        col = self._col()
        if col is not None:
            try:
                stored = col.get_config(CONFIG_KEY, None)
            except Exception:
                stored = None
            if isinstance(stored, dict):
                return stored
        # 1.23 (KB-02): hồ sơ mới không nhận ví của hồ sơ khác trên cùng máy (file phải đúng chủ)
        return backup_data(self._read_file(), col)

    def load(self) -> dict[str, Any]:
        data: dict[str, Any] = {
            "coins": 0, "waters": 0, "harvests": 0,
            "best": {}, "game_day": "", "game_coins": 0,
            "home": _empty_home(), "quest": None,
            "wear": _clean_wear(None), "craft": _clean_craft(None),
            "season": season.clean_season(None),
        }
        stored = self._read()
        if not isinstance(stored, dict):
            stored = {}
        ext = self._read_ext()
        try:
            stored = merge_ext(stored, ext)
        except (ValueError, AttributeError, TypeError):
            pass
        store = self._read_season()
        try:
            stored = merge_season(stored, store)
            data["season"] = season.clean_season(store)
        except (ValueError, AttributeError, TypeError):
            pass
        nha = self._read_nha()      # 1.24: nhà 3 gian
        try:
            stored = merge_nha(stored, nha)
        except (ValueError, AttributeError, TypeError):
            pass
        try:
            for key in ("coins", "waters", "harvests", "game_coins"):
                if isinstance(stored.get(key), int):
                    data[key] = stored[key]
            if isinstance(stored.get("game_day"), str):
                data["game_day"] = stored["game_day"]
            if isinstance(stored.get("goal_day"), int):
                data["goal_day"] = stored["goal_day"]
            best = stored.get("best")
            if isinstance(best, dict):
                data["best"] = {k: v for k, v in best.items() if k in GAMES and isinstance(v, int)}
            data["craft"] = _clean_craft(stored.get("craft"))
            apply_craft_fx(data["craft"], ext)
            data["home"] = _clean_home(stored.get("home"), full_catalog(data))
            data["wear"] = _clean_wear(stored.get("wear"))
            data["quest"] = _clean_quest(stored.get("quest"))
        except (ValueError, AttributeError, TypeError):
            pass
        data["mobile"] = clean_mobile(self._read_mobile())
        more_raw = self._read_more()
        data["more"] = more.clean_more(more_raw, CRAFT_PALETTE)
        # 1.22: giống cây tự vẽ + luật gieo của chúng (khoá "myseeds", xem share_core)
        data["more"][share.MYSEED_KEY] = share.clean_myseeds(more_raw.get(share.MYSEED_KEY) if isinstance(more_raw, dict) else None)
        # 1.30: giấy dán tường + sàn từng gian (khoá "decor", xem decor_core)
        data["more"][decor.DECOR_KEY] = decor.clean(more_raw.get(decor.DECOR_KEY) if isinstance(more_raw, dict) else None)
        try:
            attach_uzones(data, more_raw)
        except (ValueError, AttributeError, TypeError, KeyError):
            data["more"]["zones"] = []
            data["home"]["uzones"] = []
        try:
            attach_nha(data, nha)
        except (ValueError, AttributeError, TypeError, KeyError):
            # 1.28 (F06): lỗi bất ngờ khi đặt đồ → vẫn giữ trạng thái đã mở rộng nhà (đồ ở gian bên tạm về kho, không mất)
            got = nha.get("rooms") if isinstance(nha, dict) and isinstance(nha.get("rooms"), list) else []
            data["home"]["rooms"] = list(SIDE_IDS) if any(isinstance(r, str) and r in SIDE_IDS for r in got) else []
            for sid in SIDE_IDS:
                data["home"][sid] = []
        data["more_view"] = self._more_view(data)
        if self.on_load is not None:
            try:
                self.on_load(data)
            except Exception as err:   # không để móc Undo làm hỏng việc đọc ví
                print(f"[kotoba_batake] on_load: {err}")
        return data

    # -- 1.14 -----------------------------------------------------------------
    today_override: int | None = None    # cho test (không có collection)

    def _day(self) -> int | None:
        if self.today_override is not None:
            return self.today_override
        col = self._col()
        try:
            return int(col.sched.today) if col is not None else None
        except Exception:
            return None

    def _more_view(self, data: dict[str, Any]) -> dict[str, Any]:
        home = data.get("home") or _empty_home()
        return more.view(data.get("more") or more.empty_more(), home.get("house", 0), house_value(home), self._day())

    def _more_path(self) -> str:
        return os.path.join(os.path.dirname(self.path), "more.json")

    def _read_more(self) -> Any:
        """Đọc MORE_KEY; như EXT_KEY: collection có ví mà chưa có khoá này thì không lấy file sao lưu."""
        col = self._col()
        if col is not None:
            try:
                stored = col.get_config(MORE_KEY, None)
            except Exception:
                stored = None
            if isinstance(stored, dict):
                return stored
            try:
                has_wallet = isinstance(col.get_config(CONFIG_KEY, None), dict)
            except Exception:
                has_wallet = False
            if has_wallet:
                return None
        try:
            with open(self._more_path(), encoding="utf-8") as f:
                return backup_data(json.load(f), col)
        except (OSError, ValueError):
            return None

    def _nha_path(self) -> str:
        return os.path.join(os.path.dirname(self.path), "nha.json")

    def _read_nha(self) -> Any:
        """1.24: đọc NHA_KEY; như EXT_KEY: collection có ví mà chưa có khoá này thì không lấy file sao lưu."""
        col = self._col()
        if col is not None:
            try:
                stored = col.get_config(NHA_KEY, None)
            except Exception:
                stored = None
            if isinstance(stored, dict):
                return stored
            try:
                has_wallet = isinstance(col.get_config(CONFIG_KEY, None), dict)
            except Exception:
                has_wallet = False
            if has_wallet:
                return None
        try:
            with open(self._nha_path(), encoding="utf-8") as f:
                return backup_data(json.load(f), col)
        except (OSError, ValueError):
            return None

    def _mobile_path(self) -> str:
        return os.path.join(os.path.dirname(self.path), "mobile.json")

    def _read_mobile(self) -> Any:
        """Sổ bù xu (MOBILE_KEY). Có collection thì chỉ tin collection (file chỉ là bản sao lưu): sổ cũ của
        máy này không khớp revlog đã đồng bộ, dùng lại có thể trả trùng."""
        col = self._col()
        if col is not None:
            try:
                return col.get_config(MOBILE_KEY, None)
            except Exception:
                return None
        try:
            with open(self._mobile_path(), encoding="utf-8") as f:
                return json.load(f)
        except (OSError, ValueError):
            return None

    def _ext_path(self) -> str:
        return os.path.join(os.path.dirname(self.path), "ext.json")

    def _read_ext(self) -> Any:
        col = self._col()
        if col is not None:
            try:
                stored = col.get_config(EXT_KEY, None)
            except Exception:
                stored = None
            if isinstance(stored, dict):
                return stored
            try:
                has_wallet = isinstance(col.get_config(CONFIG_KEY, None), dict)
            except Exception:
                has_wallet = False
            if has_wallet:
                # collection có ví nhưng chưa có phần mới (vd. vừa tải về từ máy chưa cài 1.7):
                # không lấy file sao lưu của máy này, tránh nhân đôi đồ mà không trừ xu
                return None
        try:
            with open(self._ext_path(), encoding="utf-8") as f:
                return backup_data(json.load(f), col)
        except (OSError, ValueError):
            return None

    def _season_path(self) -> str:
        return os.path.join(os.path.dirname(self.path), "season.json")

    def _read_season(self) -> Any:
        """Đọc SEASON_KEY; như EXT_KEY: collection có ví mà chưa có khoá này thì không lấy file sao lưu."""
        col = self._col()
        if col is not None:
            try:
                stored = col.get_config(SEASON_KEY, None)
            except Exception:
                stored = None
            if isinstance(stored, dict):
                return stored
            try:
                has_wallet = isinstance(col.get_config(CONFIG_KEY, None), dict)
            except Exception:
                has_wallet = False
            if has_wallet:
                return None
        try:
            with open(self._season_path(), encoding="utf-8") as f:
                return backup_data(json.load(f), col)
        except (OSError, ValueError):
            return None

    def _write(self, key: str, path: str, payload: Any, col: Any) -> None:
        if col is not None:
            try:
                col.set_config(key, payload)
            except Exception as err:   # vẫn còn bản sao lưu bằng file
                print(f"[kotoba_batake] save {key} to collection: {err}")
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            tmp = path + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(backup_payload(payload, col), f, ensure_ascii=False)
            os.replace(tmp, path)
        except OSError as err:
            if col is None:
                raise
            print(f"[kotoba_batake] backup file: {err}")

    def save(self, data: dict[str, Any]) -> None:
        """Ghi ví (phần bản 1.6.1 hiểu) vào CONFIG_KEY, phần của 1.7 vào EXT_KEY, Mùa & Lễ hội vào SEASON_KEY."""
        if self.on_save is not None:
            try:
                self.on_save(data)
            except Exception as err:
                print(f"[kotoba_batake] on_save: {err}")
        if isinstance(data.get("home"), dict):
            _canon_order(data["home"])
        mobile = data.get("mobile")
        full = data
        data, more_store = split_more(full)
        data, nha_store = split_nha(data)      # 1.24: trước các tầng cũ (đồ mới / gian bên không lọt vào EXT, SEASON)
        try:
            keep_foreign_nha(nha_store, self._read_nha())
        except (ValueError, AttributeError, TypeError):
            pass
        rest, store = split_season(data)
        try:
            keep_foreign_season(store, self._read_season())
        except (ValueError, AttributeError, TypeError):
            pass
        wallet, ext = split_ext(rest)
        col = self._col()
        self._write(CONFIG_KEY, self.path, wallet, col)
        self._write(EXT_KEY, self._ext_path(), ext, col)
        self._write(SEASON_KEY, self._season_path(), store, col)
        try:
            keep_foreign_more(more_store, self._read_more())
        except (ValueError, AttributeError, TypeError):
            pass
        self._write(MORE_KEY, self._more_path(), more_store, col)
        self._write(NHA_KEY, self._nha_path(), nha_store, col)
        if isinstance(mobile, dict):
            self._write(MOBILE_KEY, self._mobile_path(), mobile, col)
        full["more_view"] = self._more_view(full)

    def _px_path(self) -> str:
        return os.path.join(os.path.dirname(self.path), "craft_px.json")

    def load_px(self) -> dict[str, str]:
        """Điểm ảnh (đã nén) của các món tự làm: {id: mã}."""
        stored: Any = None
        col = self._col()
        if col is not None:
            try:
                stored = col.get_config(PX_KEY, None)
            except Exception:
                stored = None
        if not isinstance(stored, dict):
            try:
                with open(self._px_path(), encoding="utf-8") as f:
                    # 1.25.9: file sao lưu dùng chung mọi hồ sơ → chỉ nhận khi ghi đúng chủ (như ví / nhà)
                    stored = backup_data(json.load(f), col)
            except (OSError, ValueError):
                stored = None
        if not isinstance(stored, dict):
            return {}
        return {k: v for k, v in stored.items() if isinstance(k, str) and isinstance(v, str) and k != OWNER_KEY}

    def save_px(self, px: dict[str, str]) -> None:
        col = self._col()
        if col is not None:
            try:
                col.set_config(PX_KEY, px)
            except Exception as err:
                print(f"[kotoba_batake] save px: {err}")
        try:
            os.makedirs(os.path.dirname(self.path), exist_ok=True)
            tmp = self._px_path() + ".tmp"
            with open(tmp, "w", encoding="utf-8") as f:
                json.dump(backup_payload(px, col), f, ensure_ascii=False)
            os.replace(tmp, self._px_path())
        except OSError as err:
            if col is None:
                raise
            print(f"[kotoba_batake] px backup file: {err}")

    def migrate(self) -> bool:
        """Chuyển dữ liệu từ file cũ vào collection (chỉ khi collection chưa có)."""
        col = self._col()
        if col is None:
            return False
        try:
            if isinstance(col.get_config(CONFIG_KEY, None), dict):
                return False
        except Exception:
            return False
        old = backup_data(self._read_file(), col)
        if not isinstance(old, dict):
            return False
        self.save(self.load())
        return True

    # -- nhiệm vụ hằng ngày ------------------------------------------------

    def quests(self, day: int, avail: Any) -> dict[str, Any]:
        """Nhiệm vụ của ngày `day` (tự tạo nếu sang ngày mới). avail() -> (due, new)."""
        data = self.load()
        if _ensure_quests(data, day, avail):
            self.save(data)
        return quest_view(data)

    def quest_event(self, day: int, avail: Any, kind: str, **kw: Any) -> dict[str, Any]:
        data = self.load()
        _ensure_quests(data, day, avail)
        q = data["quest"]
        pr = q["progress"]
        if kind == "answer":
            before = kw.get("before")
            if before == "review":
                pr["due"] = pr.get("due", 0) + 1
            elif before == "new":
                pr["new"] = pr.get("new", 0) + 1
            if kw.get("stage_up"):
                pr["stage"] = pr.get("stage", 0) + 1
            pr["streak_cur"] = pr.get("streak_cur", 0) + 1 if kw.get("ease", 0) > 1 else 0
            pr["streak"] = max(pr.get("streak", 0), pr["streak_cur"])
        elif kind == "game":
            pr["games"] = pr.get("games", 0) + 1
            if kw.get("win"):
                pr["win"] = pr.get("win", 0) + 1
            if kw.get("game") == "cloze":
                pr["cloze"] = pr.get("cloze", 0) + 1
        elif kind == "paper":
            pr["paper"] = pr.get("paper", 0) + 1
        elif kind == "dict":
            pr["dict"] = pr.get("dict", 0) + max(0, int(kw.get("n", 1)))
        result = _settle_quests(data)
        self.save(data)
        result["view"] = quest_view(data)
        result["wallet"] = data
        return result

    def record_answer(self, ease: int, old_stage: int | None, new_stage: int | None,
                      day: int | None = None, before: str | None = None) -> tuple[dict[str, Any], int]:
        data = self.load()
        gained = reward_for_answer(ease, old_stage, new_stage)
        data["coins"] += gained
        data["waters"] += 1
        record_desktop(data, day, ease, before)
        if old_stage is not None and new_stage == STAGE_FRUIT and old_stage < STAGE_FRUIT:
            data["harvests"] += 1
        self.save(data)
        return data, gained

    def undo_answer(self, entry: dict[str, Any]) -> int:
        """1.23 (KB-03): trả lại phần thưởng của lượt ôn vừa bị Undo. Trả về số xu đã trừ."""
        data = self.load()
        take = undo_reward(data, entry)
        self.save(data)
        return take

    def redo_answer(self, entry: dict[str, Any]) -> int:
        data = self.load()
        g = redo_reward(data, entry)
        self.save(data)
        return g

    def record_game(
        self, game: str, score: int, coins: int, today: str, daily_cap: int, win: bool = False
    ) -> dict[str, Any]:
        """Lưu kết quả một ván mini-game. Xu từ game bị giới hạn mỗi ngày để
        việc ôn thẻ thật vẫn là cách chính làm vườn lớn."""
        if game not in GAMES:
            raise ValueError(f"unknown game {game!r}")
        data = self.load()
        if data["game_day"] != today:
            data["game_day"] = today
            data["game_coins"] = 0
        score = max(0, min(int(score), 1_000_000))
        want = max(0, min(int(coins), 50))
        room = max(0, int(daily_cap) - data["game_coins"])
        gained = min(want, room)
        data["coins"] += gained
        data["game_coins"] += gained
        old_best = data["best"].get(game, 0)
        new_best = score > old_best
        if new_best:
            data["best"][game] = score
        self.save(data)
        return {
            "game": game, "score": score, "gained": gained, "capped": gained < want,
            "best": max(old_best, score), "new_best": new_best and score > 0,
            "wallet": data,
        }

    def add_coins(self, n: int) -> dict[str, Any]:
        """Cộng xu từ báo / chép chính tả (đã tính sẵn và giới hạn trong paper_core)."""
        data = self.load()
        data["coins"] += max(0, min(int(n), 100))
        self.save(data)
        return data

    def claim_goal(self, day: int, reviews: int, goal: int, bonus: int) -> int:
        """Thưởng xu một lần mỗi ngày khi số lượt ôn đạt mục tiêu."""
        if goal <= 0 or reviews < goal:
            return 0
        data = self.load()
        m = data.get("mobile")
        if data.get("goal_day") == day or (isinstance(m, dict) and day in m["goals"]):
            return 0
        data["goal_day"] = day
        if isinstance(m, dict):
            m["goals"].append(day)
        data["coins"] += max(0, int(bonus))
        self.save(data)
        return max(0, int(bonus))

    # -- 1.11: bù xu cho lượt ôn trên điện thoại ---------------------------

    def mobile_catch_up(self, col: Any, goal: int, bonus: int, avail: Any = None,
                        now_ms: int | None = None) -> dict[str, Any] | None:
        """Quét revlog, trả xu / thưởng mục tiêu / tiến độ nhiệm vụ hôm nay cho lượt ôn add-on chưa trả.

        Lần đầu (chưa có sổ) chỉ đặt mốc, trả về None. Không có gì để bù cũng trả về None (không ghi)."""
        import time
        data = self.load()
        now_ms = int(time.time() * 1000) if now_ms is None else int(now_ms)
        if data.get("mobile") is None:
            data["mobile"] = new_mobile(now_ms, data.get("goal_day"))
            self.save(data)
            return None
        today = int(col.sched.today)
        m = data["mobile"]
        counts = revlog_by_day(col, m["start"])
        start_day = mobile_day_of(m["start"], int(col.sched.day_cutoff), today)
        res = settle_mobile(data, counts, today, start_day, int(goal), int(bonus))
        if not res["reviews"] and not res["goal"]:
            return None
        res["quests"] = None
        if (res["rev_today"] or res["new_today"]) and avail is not None:
            _ensure_quests(data, today, avail)
            pr = data["quest"]["progress"]
            if res["rev_today"]:
                pr["due"] = pr.get("due", 0) + res["rev_today"]
            if res["new_today"]:
                pr["new"] = pr.get("new", 0) + res["new_today"]
            q = _settle_quests(data)
            q["view"] = quest_view(data)
            res["quests"] = q
        extra = res["quests"]["coins"] if res["quests"] else 0
        res["total_coins"] = res["coins"] + res["goal"] + extra
        m["total"]["reviews"] += res["reviews"]
        m["total"]["coins"] += res["total_coins"]
        m["last"] = {"at": now_ms // 1000, "reviews": res["reviews"], "coins": res["total_coins"]}
        self.save(data)
        res["wallet"] = data
        return res

    # -- nhà & cửa hàng ---------------------------------------------------

    def buy(self, item_id: str) -> dict[str, Any]:
        if item_id not in CATALOG:
            raise HomeError("Không có món này.")
        data = self.load()
        item, home = CATALOG[item_id], data["home"]
        if item.get("rare"):
            raise HomeError("Món này không bán, chỉ có trong rương nhiệm vụ hằng ngày.")
        if item.get("only") == "ped":
            raise HomeError("Món này chỉ có ở gánh hàng rong (thứ Tư, Chủ nhật).")
        if item.get("only"):
            raise HomeError("Món này là quà khi đủ một bộ trong Hộp sưu tầm.")
        self._buy_checks(data, item_id)
        if data["coins"] < item["price"]:
            raise HomeError(f"Chưa đủ xu: cần {item['price']}, đang có {data['coins']}.")
        data["coins"] -= item["price"]
        home["owned"][item_id] = home["owned"].get(item_id, 0) + 1
        self.save(data)
        return data

    def _buy_checks(self, data: dict[str, Any], item_id: str) -> None:
        """Điều kiện mua chung của cửa hàng và gánh hàng rong (1.28): vùng / giao diện mùa đã mở, số tối đa, nhà có cửa."""
        item, home = CATALOG[item_id], data["home"]
        if item.get("zone") and item["zone"] not in home["zones"]:
            zname = next(z["name"] for z in ZONES if z["id"] == item["zone"])
            raise HomeError(f"Mở khoá vùng “{zname}” trước đã.")
        if item.get("season") and item["season"] not in data["season"]["unlocked"]:
            tname = season.THEME_BY_ID[item["season"]]["name"]
            raise HomeError(f"Mở khoá giao diện “{tname}” (tab Giao diện mùa) trước đã.")
        if home["owned"].get(item_id, 0) >= item.get("max", 99):
            raise HomeError("Món này chỉ có một cái thôi.")
        if item["scene"] == "room" and home["house"] < ROOM_UNLOCK_LEVEL:
            raise HomeError("Xây nhà tới bước “Lắp cửa & cửa sổ” rồi mới mua nội thất được.")

    # -- 1.28: Hộp sưu tầm, gánh hàng rong -----------------------------------------------

    def find_reward(self, coins: int = 0, gift: str | None = None) -> dict[str, Any]:
        """Nhặt trùng → cộng xu; đủ một bộ sưu tầm → tặng món trang trí (vào Kho đồ)."""
        data = self.load()
        if coins > 0:
            data["coins"] += int(coins)
        if gift and gift in FIND_ITEMS:
            own = data["home"]["owned"]
            own[gift] = own.get(gift, 0) + 1
        if coins > 0 or gift:
            self.save(data)
        return data

    def buy_at(self, item_id: str, price: int) -> dict[str, Any]:
        """Gánh hàng rong: mua món cửa hàng (đã giảm giá) hoặc món chỉ có ở gánh hàng, theo giá đã tính sẵn."""
        if item_id not in CATALOG:
            raise HomeError("Không có món này.")
        item = CATALOG[item_id]
        if item.get("rare") or item.get("only") == "set" or item.get("season"):
            raise HomeError("Món này không bán ở gánh hàng.")
        data = self.load()
        self._buy_checks(data, item_id)
        self._pay(data, int(price))
        own = data["home"]["owned"]
        own[item_id] = own.get(item_id, 0) + 1
        self.save(data)
        return data

    @_more_errors
    def seed_buy_at(self, sid: str, price: int) -> dict[str, Any]:
        data = self.load()
        more.buy_seed(data["more"], sid)
        self._pay(data, int(price))
        self.save(data)
        return data

    def build(self, expect: int | None = None) -> dict[str, Any]:
        """Xây bước kế tiếp. expect (1.22.5) = bước giao diện vừa bấm: khác bước kế tiếp thì không xây (lệnh lặp / giao diện cũ)."""
        data = self.load()
        home = data["home"]
        nxt = home["house"] + 1
        if nxt >= len(HOUSE_LEVELS):
            raise HomeError("Nhà đã xây xong hết rồi!")
        if expect is not None and expect != nxt:
            raise HomeError(f"Bước “{HOUSE_LEVELS[expect][0]}” đã xây rồi." if 0 < expect < nxt else "Bấm lại nút Xây nhé.")
        price = HOUSE_LEVELS[nxt][1]
        if data["coins"] < price:
            raise HomeError(f"Chưa đủ xu: cần {price}, đang có {data['coins']}.")
        data["coins"] -= price
        home["house"] = nxt
        self.save(data)
        return data

    def place(self, scene: str, item_id: str, x: int, y: int) -> dict[str, Any]:
        data = self.load()
        cat = full_catalog(data)
        if item_id not in cat or scene not in scene_names(data["home"]) or not fits_scene(cat[item_id], scene):
            raise HomeError("Món này không đặt ở đây được.")
        home = data["home"]
        if home["owned"].get(item_id, 0) - placed_count(home, item_id) <= 0:
            raise HomeError("Trong kho không còn món này.")
        check_spot(home, scene, item_id, x, y, cat=cat)
        home[scene].append({"id": item_id, "x": x, "y": y})
        self.save(data)
        return data

    def move(self, scene: str, index: int, x: int, y: int) -> dict[str, Any]:
        data = self.load()
        home = data["home"]
        if scene not in scene_names(home) or not 0 <= index < len(home[scene]):
            raise HomeError("Không tìm thấy món đồ.")
        e = home[scene][index]
        check_spot(home, scene, e["id"], x, y, ignore=index, cat=full_catalog(data))
        e["x"], e["y"] = x, y
        self.save(data)
        return data

    def take(self, scene: str, index: int) -> dict[str, Any]:
        data = self.load()
        home = data["home"]
        if scene not in scene_names(home) or not 0 <= index < len(home[scene]):
            raise HomeError("Không tìm thấy món đồ.")
        home[scene].pop(index)
        self.save(data)
        return data

    # -- vùng mới, kiểu nhà ----------------------------------------------------

    def _pay(self, data: dict[str, Any], price: int) -> None:
        if data["coins"] < price:
            raise HomeError(f"Chưa đủ xu: cần {price}, đang có {data['coins']}.")
        data["coins"] -= price

    def unlock_zone(self, zone_id: str) -> dict[str, Any]:
        if zone_id not in ZONE_IDS:
            raise HomeError("Không có vùng này.")
        data = self.load()
        home = data["home"]
        if zone_id in home["zones"]:
            raise HomeError("Vùng này đã mở rồi.")
        nxt = ZONES[len(home["zones"])]
        if nxt["id"] != zone_id:
            raise HomeError(f"Mở lần lượt nhé: vùng tiếp theo là “{nxt['name']}”.")
        self._pay(data, nxt["price"])
        home["zones"].append(zone_id)
        self.save(data)
        return data

    def open_rooms(self) -> dict[str, Any]:
        """1.25: mở rộng nhà một lần — 2.000 xu được cả Bếp lẫn Phòng ngủ. Gọi lặp (bấm đúp) thì báo đã mở, không trừ lần hai."""
        data = self.load()
        home = data["home"]
        if home["house"] < NHA_UNLOCK_LEVEL:
            raise HomeError(f"Xây xong nhà (bước “{HOUSE_LEVELS[NHA_UNLOCK_LEVEL][0]}”) rồi mới mở rộng được.")
        if all(r in home["rooms"] for r in SIDE_IDS):
            raise HomeError("Nhà đã mở rộng rồi (có cả Bếp và Phòng ngủ).")
        self._pay(data, NHA_PRICE)
        home["rooms"] = list(SIDE_IDS)
        for sid in SIDE_IDS:
            home.setdefault(sid, [])
        self.save(data)
        return data

    def open_room(self, room_id: str) -> dict[str, Any]:
        """Lệnh cũ của 1.24 (kèm id gian): từ 1.25 mở cả hai gian một lần."""
        if room_id not in SIDE_IDS:
            raise HomeError("Không có gian này.")
        return self.open_rooms()

    def buy_style(self, style_id: str) -> dict[str, Any]:
        if style_id not in HOUSE_STYLES or style_id == "classic":
            raise HomeError("Không có kiểu nhà này.")
        data = self.load()
        home = data["home"]
        if home["house"] < len(HOUSE_LEVELS) - 1:
            raise HomeError("Xây xong nhà gốc (đủ 7 bước) rồi mới đổi kiểu nhà được.")
        if style_id in home["styles"]:
            raise HomeError("Kiểu nhà này đã có rồi.")
        self._pay(data, HOUSE_STYLES[style_id]["price"])
        home["styles"].append(style_id)
        home["style"] = style_id
        self.save(data)
        return data

    def use_style(self, style_id: str) -> dict[str, Any]:
        data = self.load()
        home = data["home"]
        if style_id != "classic" and style_id not in home["styles"]:
            raise HomeError("Chưa có kiểu nhà này.")
        home["style"] = style_id
        self.save(data)
        return data

    # -- Mùa & Lễ hội ------------------------------------------------------------

    def unlock_theme(self, theme_id: str, how: str, streak: int = 0, day: int = 0,
                     today: datetime.date | None = None) -> dict[str, Any]:
        """Mở khoá một chủ đề bằng xu (THEME_PRICE) hoặc bằng chuỗi ngày ôn liên tiếp; tặng kèm mỗi món một cái."""
        theme = season.THEME_BY_ID.get(theme_id)
        if theme is None:
            raise HomeError("Không có giao diện này.")
        data = self.load()
        ss = data["season"]
        if theme_id in ss["unlocked"]:
            raise HomeError("Giao diện này đã mở rồi.")
        if how == "coins":
            self._pay(data, season.THEME_PRICE)
        elif how == "streak":
            need = season.STREAK_NEED[theme["kind"]]
            avail = season.streak_available(int(streak), int(day), ss["free_day"])
            if avail < need:
                raise HomeError(f"Cần chuỗi {need} ngày ôn liên tiếp (hiện dùng được {avail} ngày).")
            ss["free_day"] = int(day)
        else:
            raise HomeError("Cách mở khoá không hợp lệ.")
        ss["unlocked"] = [t for t in season.THEME_IDS if t in ss["unlocked"] or t == theme_id]
        owned = data["home"]["owned"]
        for k in season.theme_items(theme_id):
            owned[k] = owned.get(k, 0) + 1
        # đang tự động và chủ đề này đang diễn ra → để tự động; không thì dùng luôn chủ đề vừa mở
        if not (ss["mode"] == "auto" and season.active_theme(ss, today or datetime.date.today()) == theme_id):
            ss["mode"], ss["pick"] = "pick", theme_id
        self.save(data)
        return data

    def set_theme(self, mode: str, theme_id: str | None = None) -> dict[str, Any]:
        """Chọn chế độ giao diện: auto (theo lịch) | off (tắt) | pick (dùng một chủ đề đã mở)."""
        data = self.load()
        ss = data["season"]
        if mode == "pick":
            if theme_id not in ss["unlocked"]:
                raise HomeError("Chưa mở khoá giao diện này.")
            ss["pick"] = theme_id
        elif mode not in ("auto", "off"):
            raise HomeError("Chế độ không hợp lệ.")
        ss["mode"] = mode
        self.save(data)
        return data

    # -- tủ đồ & biểu cảm StackChan ----------------------------------------------

    def buy_wear(self, wear_id: str) -> dict[str, Any]:
        if wear_id not in WEAR:
            raise HomeError("Không có món đồ mặc này.")
        data = self.load()
        wear = data["wear"]
        if wear_id in wear["owned"]:
            raise HomeError("Món này đã có rồi.")
        self._pay(data, WEAR[wear_id]["price"])
        wear["owned"].append(wear_id)
        wear["on"][WEAR[wear_id]["slot"]] = wear_id     # mua xong mặc luôn
        self.save(data)
        return data

    def put_on(self, wear_id: str) -> dict[str, Any]:
        data = self.load()
        wear = data["wear"]
        if wear_id not in wear["owned"]:
            raise HomeError("Chưa có món này.")
        wear["on"][WEAR[wear_id]["slot"]] = wear_id
        self.save(data)
        return data

    def take_off(self, slot: str) -> dict[str, Any]:
        if slot not in WEAR_SLOTS:
            raise HomeError("Không có chỗ mặc này.")
        data = self.load()
        data["wear"]["on"].pop(slot, None)
        self.save(data)
        return data

    def buy_face(self, face_id: str) -> dict[str, Any]:
        if face_id not in FACES:
            raise HomeError("Không có biểu cảm này.")
        data = self.load()
        wear = data["wear"]
        if face_id in wear["faces"]:
            raise HomeError("Biểu cảm này đã có rồi.")
        self._pay(data, FACES[face_id]["price"])
        wear["faces"].append(face_id)
        self.save(data)
        return data

    def toggle_face(self, face_id: str) -> dict[str, Any]:
        data = self.load()
        wear = data["wear"]
        if face_id not in wear["faces"]:
            raise HomeError("Chưa có biểu cảm này.")
        if face_id in wear["faces_off"]:
            wear["faces_off"].remove(face_id)
        else:
            wear["faces_off"].append(face_id)
        self.save(data)
        return data

    # -- xưởng chế tác ---------------------------------------------------------

    def craft_save(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Tạo món mới (giá theo cỡ) hoặc sửa món đã có (vẽ lại: giá sửa; chỉ đổi tên / hiệu ứng: miễn phí).
        payload: id?, name, size, kind, fx, px."""
        if not isinstance(payload, dict):
            raise HomeError("Dữ liệu món đồ không hợp lệ.")
        try:
            size = int(payload.get("size") or 0)
        except (TypeError, ValueError):
            size = 0
        kind = payload.get("kind")
        # 1.30: loại / hiệu ứng / id sai kiểu (mảng, đối tượng) là dữ liệu hỏng, không phải lỗi chương trình (TypeError "unhashable")
        if size not in CRAFT_PRICES or not isinstance(kind, str) or kind not in CRAFT_KINDS:
            raise HomeError("Cỡ hoặc loại món đồ không hợp lệ.")
        if payload.get("id") is not None and not isinstance(payload.get("id"), str):
            raise HomeError("Không tìm thấy món đồ này.")
        flat = px_decode(payload.get("px"), size)
        if flat is None:
            raise HomeError("Hình vẽ bị lỗi, thử vẽ lại nhé.")
        if not flat.strip("."):
            raise HomeError("Hình còn trống, vẽ gì đó đã nhé!")
        name = _clean_name(payload.get("name"))
        fx = payload.get("fx") if isinstance(payload.get("fx"), str) and payload.get("fx") in CRAFT_FX else "none"
        data = self.load()
        craft, home = data["craft"], data["home"]
        px = self.load_px()
        cid = payload.get("id") or None
        if cid is None:
            if len(craft["items"]) >= CRAFT_MAX:
                raise HomeError(f"Xưởng đã có {CRAFT_MAX} mẫu, xoá bớt mẫu cũ đã nhé.")
            self._pay(data, CRAFT_PRICES[size])
            cid = f"c{craft['next']}"
            craft["next"] += 1
            craft["items"][cid] = {"name": name, "size": size, "kind": kind, "fx": fx}
            home["owned"][cid] = 1
        else:
            meta = craft["items"].get(cid)
            if meta is None:
                raise HomeError("Không tìm thấy mẫu này.")
            if meta["size"] != size or meta["kind"] != kind:
                raise HomeError("Không đổi được cỡ / loại của món đã làm.")
            # 1.22.1: chỉ đổi tên / hiệu ứng thì miễn phí (như vùng tự tạo, giống cây tự vẽ); vẽ lại hình mới mất xu sửa
            if px_decode(px.get(cid), size) != flat:
                self._pay(data, CRAFT_EDIT_PRICE)
            meta["name"] = name
            meta["fx"] = fx
        px[cid] = px_encode(flat)
        self.save_px(px)
        self.save(data)
        data["craft_id"] = cid
        return data

    def craft_copy(self, cid: str) -> dict[str, Any]:
        data = self.load()
        meta = data["craft"]["items"].get(cid)
        if meta is None:
            raise HomeError("Không tìm thấy mẫu này.")
        if data["home"]["owned"].get(cid, 0) >= 99:
            raise HomeError("Đã có quá nhiều cái rồi.")
        self._pay(data, CRAFT_PRICES[meta["size"]] // 2)
        data["home"]["owned"][cid] = data["home"]["owned"].get(cid, 0) + 1
        self.save(data)
        return data

    def craft_delete(self, cid: str) -> dict[str, Any]:
        data = self.load()
        if cid not in data["craft"]["items"]:
            raise HomeError("Không tìm thấy mẫu này.")
        if placed_count(data["home"], cid):
            raise HomeError("Cất hết món này vào kho rồi mới xoá mẫu được.")
        del data["craft"]["items"][cid]
        data["home"]["owned"].pop(cid, None)
        self.save(data)
        px = self.load_px()
        if px.pop(cid, None) is not None:
            self.save_px(px)
        return data

    # -- 1.14: sửa nhà, thú nuôi, giống cây, vùng tự tạo ----------------------

    def touch(self) -> dict[str, Any] | None:
        """Mở vườn: tính tuổi nhà / "mừng quay lại", tự cho thú ăn (nếu bật). Trả {"ids", "cost"} khi đã cho ăn."""
        data = self.load()
        today = self._day()
        if today is None:
            return None
        m = data["more"]
        changed = more.touch_repair(m, data["home"]["house"], today)
        fed = None
        if m["pet_auto"] and m["pets"]:
            cost, ids = more.feed_cost(m, None, today)
            if ids and data["coins"] >= cost:
                data["coins"] -= cost
                more.apply_feed(m, ids, today)
                fed = {"ids": ids, "cost": cost, "names": [m["pets"][p]["name"] for p in ids]}
                changed = True
        if changed:
            self.save(data)
        return fed

    def _need_day(self) -> int:
        today = self._day()
        if today is None:
            raise HomeError("Chưa mở collection.")
        return today

    @_more_errors
    def repair(self, steps: int | None = None) -> dict[str, Any]:
        """Sửa nhà: steps=None sửa hết, steps=1 sửa một nấc."""
        today = self._need_day()
        data = self.load()
        home, m = data["home"], data["more"]
        cost, n = more.repair_cost(m, home["house"], house_value(home), today, steps)
        if n <= 0:
            raise HomeError("Nhà đang như mới, chưa cần sửa.")
        self._pay(data, cost)
        more.apply_repair(m, home["house"], today, n)
        self.save(data)
        data["repaired"] = n
        return data

    @_more_errors
    def pet_buy(self, pid: str) -> dict[str, Any]:
        today = self._need_day()
        data = self.load()
        price = more.buy_pet(data["more"], pid, today)
        self._pay(data, price)
        self.save(data)
        return data

    # ---- 1.25.9: vé giữ chuỗi ----
    def frozen_days(self) -> list[str]:
        try:
            return list(self.load()["more"]["freeze"]["days"])
        except Exception:
            return []

    def freeze_buy(self, today: datetime.date) -> dict[str, Any]:
        """Mua 1 vé giữ chuỗi (today: ngày Anki hôm nay — vé dùng được cho ngày từ hôm nay trở đi)."""
        data = self.load()
        fz = data["more"]["freeze"]
        if fz["n"] >= more.FREEZE_MAX:
            raise HomeError(f"Đã có đủ {more.FREEZE_MAX} vé rồi.")
        self._pay(data, more.FREEZE_PRICE)
        more.freeze_buy(fz, today)
        self.save(data)
        return data

    def freeze_settle(self, days: set[int], today: datetime.date) -> list[str]:
        """Ngày chưa ôn ngay trước hôm nay → dùng vé (nếu đủ). Trả về các ngày vừa dùng vé."""
        data = self.load()
        used = more.freeze_settle(data["more"]["freeze"], days, today)
        if used:
            self.save(data)
        return used

    # ---- 1.25.1: gói báo (mua bằng xu; ngày theo ngày thật như số báo) ----
    @_more_errors
    def paper_sub_buy(self, plan: str, today: str) -> dict[str, Any]:
        """Mua / gia hạn gói báo (tuần 100 xu, tháng 300 xu); cộng ngày vào sau ngày cuối còn báo."""
        day = datetime.date.fromisoformat(today)
        data = self.load()
        price = more.sub_buy(data["more"]["paper_sub"], plan, day)
        self._pay(data, price)
        self.save(data)
        return data

    def paper_sub_auto(self, on: bool) -> dict[str, Any]:
        data = self.load()
        data["more"]["paper_sub"]["auto"] = bool(on)
        self.save(data)
        return data

    def paper_sub_ensure(self, today: str, commit: bool = True) -> tuple[str, int]:
        """Gói báo cho số Gemini mới: còn gói → ("ok", 0); chưa có gói và chưa thử → tặng 7 ngày ("trial", 0);
        hết hạn + Tự gia hạn + đủ xu → gia hạn gói cũ ("renewed", giá); không thì ("expired", 0).

        1.26.1: `commit=False` chỉ xem (không ghi, không trừ xu) — add-on xem trước khi Gemini viết rồi mới tặng thử /
        gia hạn **sau khi số báo đã viết xong** (trước đây trừ xu trước: Gemini lỗi / hết hạn mức / khoá bị thu hồi thì mất
        xu mà không có báo, khoá hỏng hẳn thì tuần nào cũng bị trừ; gói thử cũng bắt đầu dù chưa có số nào)."""
        day = datetime.date.fromisoformat(today)
        data = self.load()
        sub = data["more"]["paper_sub"]
        if more.sub_left(sub, day) > 0:
            return "ok", 0
        if not sub.get("trial") and not sub.get("until"):
            if commit:
                more.sub_trial(sub, day)
                self.save(data)
            return "trial", 0
        price = more.PAPER_PLANS[sub["plan"]]["price"]
        if sub.get("auto") and data["coins"] >= price:
            if commit:
                more.sub_buy(sub, sub["plan"], day)
                data["coins"] -= price
                self.save(data)
            return "renewed", price
        return "expired", 0

    @_more_errors
    def pet_feed(self, pid: str | None) -> dict[str, Any]:
        today = self._need_day()
        data = self.load()
        m = data["more"]
        cost, ids = more.feed_cost(m, pid, today)
        if not ids:
            raise HomeError("Hôm nay đã cho ăn rồi, mai nhé!")
        self._pay(data, cost)
        more.apply_feed(m, ids, today)
        self.save(data)
        data["fed"] = ids
        return data

    @_more_errors
    def pet_name(self, pid: str, name: Any) -> dict[str, Any]:
        data = self.load()
        more.rename_pet(data["more"], pid, name)
        self.save(data)
        return data

    def pet_scenes(self, data: dict[str, Any]) -> list[str]:
        home = data["home"]
        out = ["yard"] + list(home["zones"]) + list(home.get("uzones") or [])
        if home["house"] >= ROOM_UNLOCK_LEVEL:
            out.append("room")
        return out

    @_more_errors
    def pet_move(self, pid: str, scene: str) -> dict[str, Any]:
        data = self.load()
        more.move_pet(data["more"], pid, scene, self.pet_scenes(data))
        self.save(data)
        return data

    def pet_auto(self, on: bool) -> dict[str, Any]:
        data = self.load()
        data["more"]["pet_auto"] = bool(on)
        self.save(data)
        return data

    @_more_errors
    def seed_buy(self, sid: str) -> dict[str, Any]:
        data = self.load()
        price = more.buy_seed(data["more"], sid)
        self._pay(data, price)
        self.save(data)
        return data

    @_more_errors
    def seed_rule(self, where: str, key: Any, value: Any) -> dict[str, Any]:
        """1.22: value có thể là giống tự vẽ ("g1"…) — luật đó lưu ở myseeds (share_core.set_rule)."""
        data = self.load()
        share.set_rule(data["more"], where, key, value)
        self.save(data)
        return data

    @_more_errors
    def zone_save(self, payload: Any) -> dict[str, Any]:
        """Tạo (5.000 xu) / sửa vùng tự tạo (đổi hình công trình 50 xu, đổi tên / nền / màu miễn phí)."""
        data = self.load()
        m = data["more"]
        cost, zid = more.save_zone(m, payload, CRAFT_PALETTE)
        self._pay(data, cost)
        home = data["home"]
        if zid not in (home.get("uzones") or []):
            home["uzones"] = list(home.get("uzones") or []) + [zid]
            home[zid] = []
        self.save(data)
        data["zone_id"] = zid
        return data

    @_more_errors
    def zone_delete(self, zid: str) -> dict[str, Any]:
        """Xoá vùng tự tạo: đồ đặt ở đó về kho, thú ở đó về sân nhà. Không hoàn xu."""
        data = self.load()
        more.delete_zone(data["more"], zid)
        home = data["home"]
        home["uzones"] = [z for z in home.get("uzones") or [] if z != zid]
        home.pop(zid, None)
        self.save(data)
        return data

    # -- 1.22: giống cây tự vẽ, mã chia sẻ thiết kế ------------------------------

    @_more_errors
    def myseed_save(self, payload: Any) -> dict[str, Any]:
        """Tạo giống tự vẽ (500 xu) / sửa (50 xu nếu đổi hình, đổi tên miễn phí). payload: {id?, name, st: [5 mã]}."""
        data = self.load()
        px = self.load_px()
        cost, gid, joined = share.save_myseed(data["more"][share.MYSEED_KEY], payload, px, CRAFT_PALETTE)
        self._pay(data, cost)
        px[gid] = joined
        self.save_px(px)
        self.save(data)
        data["myseed_id"] = gid
        return data

    @_more_errors
    def myseed_delete(self, gid: str) -> dict[str, Any]:
        """Xoá giống tự vẽ: cây đang mang giống này về cây gốc, luật trỏ tới nó bị bỏ. Không hoàn xu."""
        data = self.load()
        share.delete_myseed(data["more"][share.MYSEED_KEY], gid)
        self.save(data)
        px = self.load_px()
        if px.pop(gid, None) is not None:
            self.save_px(px)
        return data

    # -- 1.30: giấy dán tường + sàn ---------------------------------------------------

    def _decor(self, fn: Any) -> Any:
        try:
            return fn()
        except decor.DecorError as err:
            raise HomeError(str(err)) from None

    def decor_buy(self, did: str) -> dict[str, Any]:
        """Mua một mẫu giấy dán tường / sàn có sẵn (mua một lần, dùng cho gian nào cũng được)."""
        data = self.load()
        if data["home"]["house"] < ROOM_UNLOCK_LEVEL:
            raise HomeError("Xây nhà tới bước “Lắp cửa & cửa sổ” rồi mới mua được.")
        dec = data["more"][decor.DECOR_KEY]
        price = self._decor(lambda: decor.buy(dec, did))
        self._pay(data, price)
        self.save(data)
        return data

    def decor_use(self, room: str, slot: str, did: Any) -> dict[str, Any]:
        """Dùng mẫu cho một gian (did trống / "none" = Theo kiểu nhà). Miễn phí."""
        data = self.load()
        if data["home"]["house"] < ROOM_UNLOCK_LEVEL:
            raise HomeError("Xây nhà tới bước “Lắp cửa & cửa sổ” đã nhé.")
        dec = data["more"][decor.DECOR_KEY]
        self._decor(lambda: decor.use(dec, room, slot, did, data["home"].get("rooms") or []))
        self.save(data)
        return data

    def tile_save(self, payload: Any) -> dict[str, Any]:
        """Tạo mẫu tường / sàn tự vẽ (250 xu) hoặc sửa (50 xu nếu đổi hình, đổi tên miễn phí). payload: {id?, name, kind, px}."""
        data = self.load()
        if data["home"]["house"] < ROOM_UNLOCK_LEVEL:
            raise HomeError("Xây nhà tới bước “Lắp cửa & cửa sổ” rồi mới vẽ mẫu tường / sàn được.")
        px = self.load_px()
        dec = data["more"][decor.DECOR_KEY]
        cost, tid, code = self._decor(lambda: decor.tile_save(dec, payload, px, CRAFT_PALETTE))
        self._pay(data, cost)
        px[tid] = code
        self.save_px(px)
        self.save(data)
        data["tile_id"] = tid
        return data

    def tile_delete(self, tid: str) -> dict[str, Any]:
        """Xoá mẫu tự vẽ: gian đang dùng về Theo kiểu nhà. Không hoàn xu."""
        data = self.load()
        dec = data["more"][decor.DECOR_KEY]
        self._decor(lambda: decor.tile_delete(dec, tid))
        self.save(data)
        px = self.load_px()
        if px.pop(tid, None) is not None:
            self.save_px(px)
        return data

    @_more_errors
    def share_code(self, oid: str) -> tuple[str, str]:
        """Mã chia sẻ của món tự làm (c…), vùng tự tạo (u…) hoặc giống tự vẽ (g…) → (mã, tên)."""
        data = self.load()
        if oid in data["craft"]["items"]:
            meta = data["craft"]["items"][oid]
            flat = px_decode(self.load_px().get(oid, ""), meta["size"])
            if flat is None or not flat.strip("."):
                raise HomeError("Món này chưa có hình.")
            return share.code_item(meta, px_encode(flat)), meta["name"]
        if more.is_uzone(oid):
            z = next((x for x in data["more"]["zones"] if x["id"] == oid), None)
            if z is None:
                raise HomeError("Không tìm thấy vùng này.")
            if not z.get("lm") and not z.get("env"):
                raise HomeError("Vùng này chưa vẽ công trình hay cảnh nền nào.")
            return share.code_zone(z), z["name"]
        my = data["more"][share.MYSEED_KEY]
        if share.is_myseed(oid) and oid in my["items"]:
            name = my["items"][oid]["name"]
            return share.code_seed(name, share.stages_of(self.load_px(), oid, CRAFT_PALETTE)), name
        raise HomeError("Không tìm thấy thiết kế này.")

    @_more_errors
    def share_peek(self, text: Any) -> dict[str, Any]:
        """Đọc mã dán vào → bản xem trước (không trừ xu, không lưu)."""
        return share.parse_code(text, CRAFT_PALETTE, CRAFT_PRICES, CRAFT_KINDS, CRAFT_FX)

    def share_make(self, text: Any) -> dict[str, Any]:
        """Làm món / vùng / giống từ mã: kiểm tra lại mã rồi trả xu như tự chế tác."""
        p = self.share_peek(text)
        if p["t"] == "m":
            data = self.craft_save({"name": p["name"], "size": p["size"], "kind": p["kind"], "fx": p["fx"], "px": p["px"]})
        elif p["t"] == "z":
            data = self.zone_save({"name": p["name"], "bg": p["bg"], "ground": p["ground"], "hills": p["hills"],
                                   "px": p["lm"], "env": p["env"]})
        else:
            data = self.myseed_save({"name": p["name"], "st": p["st"]})
        data["share_t"] = p["t"]
        return data
