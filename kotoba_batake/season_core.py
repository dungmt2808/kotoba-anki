"""Mùa & Lễ hội cho ことば畑: bảng chủ đề, lịch (cả âm lịch Việt Nam) và các món đồ theo mùa.

Thuần Python (không import anki) để test độc lập. Phần lưu trữ / mở khoá nằm trong garden_core.
Giao diện (màu, hạt rơi, dây đèn…) do web/season.js vẽ theo id của chủ đề.
"""

from __future__ import annotations

import datetime as _dt
import math
from typing import Any

# ---------------------------------------------------------------------------
# Âm lịch Việt Nam (thuật toán của Hồ Ngọc Đức, múi giờ +7).
# Dùng để tính ngày Tết Nguyên Đán (1/1 âm) và Trung thu (15/8 âm) cho mọi năm.
# ---------------------------------------------------------------------------

_TZ = 7.0


def _jd_from_date(dd: int, mm: int, yy: int) -> int:
    a = (14 - mm) // 12
    y = yy + 4800 - a
    m = mm + 12 * a - 3
    jd = dd + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045
    if jd < 2299161:
        jd = dd + (153 * m + 2) // 5 + 365 * y + y // 4 - 32083
    return jd


def _jd_to_date(jd: int) -> _dt.date:
    if jd > 2299160:
        a = jd + 32044
        b = (4 * a + 3) // 146097
        c = a - (b * 146097) // 4
    else:
        b = 0
        c = jd + 32082
    d = (4 * c + 3) // 1461
    e = c - (1461 * d) // 4
    m = (5 * e + 2) // 153
    day = e - (153 * m + 2) // 5 + 1
    month = m + 3 - 12 * (m // 10)
    year = b * 100 + d - 4800 + m // 10
    return _dt.date(year, month, day)


def _new_moon(k: int) -> float:
    """Ngày Julius (số thực) của lần sóc thứ k tính từ 1/1/1900."""
    t = k / 1236.85
    t2, t3 = t * t, t * t * t
    dr = math.pi / 180
    jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * t2 - 0.000000155 * t3
    jd1 += 0.00033 * math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr)
    m = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3
    mpr = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3
    f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3
    c1 = (0.1734 - 0.000393 * t) * math.sin(m * dr) + 0.0021 * math.sin(2 * dr * m)
    c1 = c1 - 0.4068 * math.sin(mpr * dr) + 0.0161 * math.sin(dr * 2 * mpr)
    c1 = c1 - 0.0004 * math.sin(dr * 3 * mpr)
    c1 = c1 + 0.0104 * math.sin(dr * 2 * f) - 0.0051 * math.sin(dr * (m + mpr))
    c1 = c1 - 0.0074 * math.sin(dr * (m - mpr)) + 0.0004 * math.sin(dr * (2 * f + m))
    c1 = c1 - 0.0004 * math.sin(dr * (2 * f - m)) - 0.0006 * math.sin(dr * (2 * f + mpr))
    c1 = c1 + 0.0010 * math.sin(dr * (2 * f - mpr)) + 0.0005 * math.sin(dr * (2 * mpr + m))
    if t < -11:
        deltat = 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t * t3
    else:
        deltat = -0.000278 + 0.000265 * t + 0.000262 * t2
    return jd1 + c1 - deltat


def _sun_longitude(jdn: float) -> float:
    """Kinh độ mặt trời (radian, 0..2π) tại ngày Julius jdn."""
    t = (jdn - 2451545.0) / 36525
    t2 = t * t
    dr = math.pi / 180
    m = 357.52910 + 35999.05030 * t - 0.0001559 * t2 - 0.00000048 * t * t2
    l0 = 280.46645 + 36000.76983 * t + 0.0003032 * t2
    dl = (1.914600 - 0.004817 * t - 0.000014 * t2) * math.sin(dr * m)
    dl = dl + (0.019993 - 0.000101 * t) * math.sin(dr * 2 * m) + 0.000290 * math.sin(dr * 3 * m)
    lon = (l0 + dl) * dr
    return lon - math.pi * 2 * math.floor(lon / (math.pi * 2))


def _sun_sector(day_number: int) -> int:
    return int(math.floor(_sun_longitude(day_number - 0.5 - _TZ / 24) / math.pi * 6))


def _new_moon_day(k: int) -> int:
    return int(math.floor(_new_moon(k) + 0.5 + _TZ / 24))


def _lunar_month11(yy: int) -> int:
    off = _jd_from_date(31, 12, yy) - 2415021
    k = int(math.floor(off / 29.530588853))
    nm = _new_moon_day(k)
    if _sun_sector(nm) >= 9:
        nm = _new_moon_day(k - 1)
    return nm


def _leap_month_offset(a11: int) -> int:
    k = int(math.floor((a11 - 2415021.076998695) / 29.530588853 + 0.5))
    i = 1
    arc = _sun_sector(_new_moon_day(k + i))
    while True:
        last = arc
        i += 1
        arc = _sun_sector(_new_moon_day(k + i))
        if arc == last or i >= 14:
            break
    return i - 1


def lunar_to_solar(day: int, month: int, year: int, leap: bool = False) -> _dt.date:
    """Ngày âm lịch (Việt Nam) → ngày dương lịch."""
    if month < 11:
        a11, b11 = _lunar_month11(year - 1), _lunar_month11(year)
    else:
        a11, b11 = _lunar_month11(year), _lunar_month11(year + 1)
    k = int(math.floor(0.5 + (a11 - 2415021.076998695) / 29.530588853))
    off = month - 11
    if off < 0:
        off += 12
    if b11 - a11 > 365:
        leap_off = _leap_month_offset(a11)
        leap_month = leap_off - 2
        if leap_month < 0:
            leap_month += 12
        if leap and month != leap_month:
            raise ValueError("không có tháng nhuận này")
        if leap or off >= leap_off:
            off += 1
    return _jd_to_date(_new_moon_day(k + off) + day - 1)


def tet_date(year: int) -> _dt.date:
    """Mùng 1 Tết Nguyên Đán của năm (dương lịch) `year`."""
    return lunar_to_solar(1, 1, year)


def mid_autumn_date(year: int) -> _dt.date:
    """Rằm tháng Tám (Trung thu / お月見) của năm `year`."""
    return lunar_to_solar(15, 8, year)


# ---------------------------------------------------------------------------
# Chủ đề: thứ tự trong THEMES = thứ tự ưu tiên khi nhiều chủ đề cùng diễn ra
# (lễ hội trước, bốn mùa sau). "when":
#   ("fixed", (tháng, ngày) bắt đầu, (tháng, ngày) kết thúc)   – có thể vắt qua năm mới
#   ("lunar", ngày âm, tháng âm, số ngày trước, số ngày sau)
# ---------------------------------------------------------------------------

THEME_PRICE = 1000
STREAK_NEED = {"season": 7, "event": 10}   # chuỗi ngày ôn liên tiếp để đổi miễn phí

THEMES: list[dict[str, Any]] = [
    {"id": "tet", "name": "Tết Nguyên Đán", "jp": "旧正月", "kind": "event", "icon": "hoamai",
     "when": ("lunar", 1, 1, -21, 15),
     "desc": "Mai vàng, đào hồng, câu đối đỏ, dây đèn lồng đỏ và pháo hoa đêm giao thừa."},
    {"id": "noel", "name": "Giáng sinh", "jp": "クリスマス", "kind": "event", "icon": "xmastree",
     "when": ("fixed", (11, 15), (12, 31)),
     "desc": "Tuyết phủ trắng, dây đèn nhấp nháy, cây thông, tuần lộc và hộp quà."},
    {"id": "shogatsu", "name": "Năm mới Nhật Bản", "jp": "お正月", "kind": "event", "icon": "kadomatsu",
     "when": ("fixed", (1, 1), (1, 15)),
     "desc": "Kadomatsu trước cửa, dây shimekazari, diều bay và bình minh đầu năm."},
    {"id": "tsukimi", "name": "Trung thu · Ngắm trăng", "jp": "お月見", "kind": "event", "icon": "usagi",
     "when": ("lunar", 15, 8, -14, 3),
     "desc": "Trăng rằm vằng vặc, cỏ lau, thỏ ngọc giã bánh và đèn ông sao."},
    {"id": "halloween", "name": "Halloween", "jp": "ハロウィン", "kind": "event", "icon": "jacko",
     "when": ("fixed", (10, 1), (10, 31)),
     "desc": "Trời tím, dơi bay, bí ngô cười toe toét và hồn ma lượn lờ."},
    {"id": "momiji", "name": "Mùa lá đỏ", "jp": "紅葉", "kind": "event", "icon": "ichou",
     "when": ("fixed", (11, 1), (12, 10)),
     "desc": "Đồi núi đỏ rực, lá phong và lá bạch quả vàng rơi khắp vườn."},
    {"id": "tanabata", "name": "Lễ Thất Tịch", "jp": "七夕", "kind": "event", "icon": "starlamp",
     "when": ("fixed", (6, 25), (7, 7)),
     "desc": "Dải Ngân Hà ban đêm, sao băng, dải cờ ước nguyện và hạc giấy."},
    {"id": "natsumatsuri", "name": "Lễ hội mùa hè", "jp": "夏祭り", "kind": "event", "icon": "kakigori",
     "when": ("fixed", (7, 15), (8, 31)),
     "desc": "Dây đèn lồng đỏ, pháo hoa mỗi tối, tháp trống và quầy đá bào."},
    {"id": "tsuyu", "name": "Mùa mưa cẩm tú cầu", "jp": "梅雨", "kind": "event", "icon": "ajisai",
     "when": ("fixed", (6, 1), (7, 10)),
     "desc": "Hay mưa phùn, cẩm tú cầu xanh tím, ếch kêu và búp bê cầu nắng."},
    {"id": "hanami", "name": "Mùa hoa anh đào", "jp": "花見", "kind": "event", "icon": "bonbori",
     "when": ("fixed", (3, 20), (4, 15)),
     "desc": "Đồi hồng hoa anh đào, cánh hoa bay khắp sân và ruộng, đèn bonbori."},
    {"id": "spring", "name": "Mùa xuân", "jp": "春", "kind": "season", "icon": "tulip",
     "when": ("fixed", (3, 1), (5, 31)),
     "desc": "Hoa nở khắp nơi, bướm bay, cánh hoa rơi nhẹ."},
    {"id": "summer", "name": "Mùa hè", "jp": "夏", "kind": "season", "icon": "suika",
     "when": ("fixed", (6, 1), (8, 31)),
     "desc": "Nắng chói chang, mây trắng như bông, chuồn chuồn và đom đóm."},
    {"id": "autumn", "name": "Mùa thu", "jp": "秋", "kind": "season", "icon": "kaki",
     "when": ("fixed", (9, 1), (11, 30)),
     "desc": "Cỏ ngả vàng, đồi nhuộm cam, lá rơi và chuồn chuồn đỏ."},
    {"id": "winter", "name": "Mùa đông", "jp": "冬", "kind": "season", "icon": "yukiusagi",
     "when": ("fixed", (12, 1), (2, 29)),
     "desc": "Tuyết phủ mặt đất và mái nhà, bông tuyết lấp lánh bay."},
]
THEME_IDS = [t["id"] for t in THEMES]
THEME_BY_ID = {t["id"]: t for t in THEMES}
SEASON_MODES = ("auto", "pick", "off")

# Món đồ theo mùa: mở khoá chủ đề là được tặng mỗi món một cái; muốn thêm thì mua (chỉ khi đã mở chủ đề).
# Đồ ngoài trời ("scene": "yard") đặt được ở mọi cảnh ngoài trời như đồ sân thường.
SEASON_ITEMS: dict[str, dict[str, Any]] = {
    # --- Mùa xuân
    "tulip": {"name": "Luống tulip", "price": 60, "scene": "yard", "w": 1, "place": "ground", "season": "spring",
              "desc": "Tulip đỏ vàng hồng đung đưa"},
    "nanohana": {"name": "Ruộng hoa cải", "price": 160, "scene": "yard", "w": 2, "place": "ground", "season": "spring",
                 "desc": "Hoa cải vàng, bướm bay lượn ban ngày"},
    # --- Mùa hè
    "suika": {"name": "Dưa hấu ướp mát", "price": 70, "scene": "yard", "w": 1, "place": "ground", "season": "summer",
              "desc": "Dưa hấu bổ đôi trong chậu nước mát"},
    "kayari": {"name": "Heo hương muỗi", "price": 90, "scene": "yard", "w": 1, "place": "ground", "season": "summer",
               "desc": "Khói hương lượn lờ"},
    # --- Mùa thu
    "kaki": {"name": "Cây hồng chín", "price": 260, "scene": "yard", "w": 2, "place": "ground", "season": "autumn",
             "desc": "Quả hồng cam lúc lỉu, lá rơi"},
    "yakiimo": {"name": "Xe khoai nướng", "price": 150, "scene": "yard", "w": 1, "place": "ground", "season": "autumn",
                "desc": "Khoai nướng thơm, khói bốc nghi ngút"},
    # --- Mùa đông
    "kamakura": {"name": "Lều tuyết kamakura", "price": 240, "scene": "yard", "w": 2, "place": "ground", "season": "winter",
                 "desc": "Ban đêm có ánh nến ấm bên trong"},
    "yukiusagi": {"name": "Thỏ tuyết", "price": 60, "scene": "yard", "w": 1, "place": "ground", "season": "winter",
                  "desc": "Mắt đỏ, tai lá xanh"},
    # --- Mùa hoa anh đào
    "shidare": {"name": "Anh đào rủ", "price": 400, "scene": "yard", "w": 2, "place": "ground", "season": "hanami",
                "desc": "Cành rủ đầy hoa, cánh hoa bay"},
    "bonbori": {"name": "Đèn bonbori", "price": 90, "scene": "yard", "w": 1, "place": "ground", "season": "hanami",
                "desc": "Đèn giấy hồng, sáng ban đêm"},
    "hanamimat": {"name": "Thảm picnic hanami", "price": 120, "scene": "yard", "w": 2, "place": "ground", "season": "hanami",
                  "desc": "Hộp bento và xiên dango ba màu"},
    # --- Mùa mưa
    "ajisai": {"name": "Bụi cẩm tú cầu", "price": 80, "scene": "yard", "w": 1, "place": "ground", "season": "tsuyu",
               "desc": "Hoa xanh tím, mưa xuống lấp lánh giọt nước"},
    "teruteru": {"name": "Búp bê cầu nắng", "price": 60, "scene": "yard", "w": 1, "place": "ground", "season": "tsuyu",
                 "desc": "Teru teru bōzu đung đưa cầu trời nắng"},
    "kaeru": {"name": "Ếch xanh", "price": 90, "scene": "yard", "w": 1, "place": "ground", "season": "tsuyu",
              "desc": "Ngồi trên lá sen, trời mưa thì nhảy"},
    # --- Thất Tịch
    "fukinagashi": {"name": "Dải cờ Tanabata", "price": 120, "scene": "yard", "w": 1, "place": "ground", "season": "tanabata",
                    "desc": "Dải giấy nhiều màu bay trong gió"},
    "starlamp": {"name": "Chùm sao giấy", "price": 100, "scene": "yard", "w": 1, "place": "ground", "season": "tanabata",
                 "desc": "Ba ngôi sao giấy lấp lánh, sáng ban đêm"},
    "orizuru": {"name": "Dây hạc giấy", "price": 80, "scene": "yard", "w": 1, "place": "ground", "season": "tanabata",
                "desc": "Chuỗi hạc giấy đung đưa"},
    # --- Lễ hội mùa hè
    "yagura": {"name": "Tháp trống yagura", "price": 450, "scene": "yard", "w": 2, "place": "ground", "season": "natsumatsuri",
               "desc": "Tháp gỗ treo đèn lồng, trống rung ban đêm"},
    "kakigori": {"name": "Quầy đá bào", "price": 140, "scene": "yard", "w": 1, "place": "ground", "season": "natsumatsuri",
                 "desc": "Đá bào siro dâu, cờ 氷 phấp phới"},
    "yoyo": {"name": "Chậu bóng yo-yo", "price": 90, "scene": "yard", "w": 1, "place": "ground", "season": "natsumatsuri",
             "desc": "Bóng nước nhiều màu bập bềnh"},
    # --- Trung thu
    "tsukimidango": {"name": "Mâm bánh cúng trăng", "price": 100, "scene": "yard", "w": 1, "place": "ground",
                     "season": "tsukimi", "desc": "Tháp bánh dango trắng và cỏ lau"},
    "usagi": {"name": "Thỏ giã bánh", "price": 180, "scene": "yard", "w": 1, "place": "ground", "season": "tsukimi",
              "desc": "Thỏ ngọc giã bánh mochi cộp cộp"},
    "ongsao": {"name": "Đèn ông sao", "price": 80, "scene": "yard", "w": 1, "place": "ground", "season": "tsukimi",
               "desc": "Đèn ông sao năm cánh, sáng lung linh ban đêm"},
    # --- Halloween
    "jacko": {"name": "Bí ngô Jack", "price": 70, "scene": "yard", "w": 1, "place": "ground", "season": "halloween",
              "desc": "Mặt cười nhăn nhở, sáng rực ban đêm"},
    "obake": {"name": "Ma nhỏ vui vẻ", "price": 120, "scene": "yard", "w": 1, "place": "ground", "season": "halloween",
              "desc": "Lơ lửng lượn qua lượn lại"},
    "cauldron": {"name": "Vạc phù thuỷ", "price": 160, "scene": "yard", "w": 1, "place": "ground", "season": "halloween",
                 "desc": "Nước phép xanh sủi bọt"},
    # --- Mùa lá đỏ
    "ichou": {"name": "Cây bạch quả vàng", "price": 320, "scene": "yard", "w": 2, "place": "ground", "season": "momiji",
              "desc": "Lá quạt vàng rực rơi lả tả"},
    "nodate": {"name": "Ô đỏ và ghế trà", "price": 200, "scene": "yard", "w": 2, "place": "ground", "season": "momiji",
               "desc": "Ghế đỏ dưới ô giấy, chén trà bốc hơi"},
    "ochiba": {"name": "Đống lá khô", "price": 40, "scene": "yard", "w": 1, "place": "ground", "season": "momiji",
               "desc": "Gió thổi là lá bay tung"},
    # --- Giáng sinh
    "xmastree": {"name": "Cây thông Noel", "price": 350, "scene": "yard", "w": 2, "place": "ground", "season": "noel",
                 "desc": "Đèn nhấp nháy, ngôi sao lấp lánh trên đỉnh"},
    "presents": {"name": "Chồng hộp quà", "price": 90, "scene": "yard", "w": 1, "place": "ground", "season": "noel",
                 "desc": "Hộp quà buộc nơ, thỉnh thoảng nảy lên"},
    "sleigh": {"name": "Xe tuần lộc", "price": 420, "scene": "yard", "w": 2, "place": "ground", "season": "noel",
               "desc": "Tuần lộc mũi đỏ kéo xe trượt tuyết"},
    "wreath": {"name": "Vòng hoa Noel", "price": 80, "scene": "room", "w": 1, "place": "wall", "season": "noel",
               "desc": "Lá thông, chuông vàng và nơ đỏ"},
    # --- Năm mới Nhật Bản
    "kadomatsu": {"name": "Kadomatsu", "price": 120, "scene": "yard", "w": 1, "place": "ground", "season": "shogatsu",
                  "desc": "Tre và thông đón năm mới"},
    "tako": {"name": "Diều năm mới", "price": 110, "scene": "yard", "w": 1, "place": "ground", "season": "shogatsu",
             "desc": "Diều giấy bay phần phật trên cao"},
    "kagamimochi": {"name": "Bánh kagami mochi", "price": 90, "scene": "room", "w": 1, "place": "floor",
                    "season": "shogatsu", "desc": "Hai tầng bánh dày, trên có quả quýt"},
    # --- Tết Nguyên Đán
    "hoamai": {"name": "Chậu mai vàng", "price": 300, "scene": "yard", "w": 2, "place": "ground", "season": "tet",
               "desc": "Hoa mai vàng rực, cánh hoa bay"},
    "banhchung": {"name": "Nồi bánh chưng", "price": 180, "scene": "yard", "w": 1, "place": "ground", "season": "tet",
                  "desc": "Lửa củi bập bùng, nồi bánh sôi bốc hơi"},
    "hoadao": {"name": "Bình đào hồng", "price": 160, "scene": "room", "w": 1, "place": "floor", "season": "tet",
               "desc": "Cành đào hồng thắm trong bình"},
    "caudoi": {"name": "Câu đối Tết", "price": 120, "scene": "room", "w": 2, "place": "wall", "season": "tet",
               "desc": "Câu đối đỏ chữ vàng 福 · 春"},
}


def theme_items(theme_id: str) -> list[str]:
    return [k for k, v in SEASON_ITEMS.items() if v["season"] == theme_id]


# ---------------------------------------------------------------------------
# Lịch của từng chủ đề
# ---------------------------------------------------------------------------

def _safe_date(y: int, m: int, d: int) -> _dt.date:
    while True:
        try:
            return _dt.date(y, m, d)
        except ValueError:
            d -= 1


def occurrence(theme: dict[str, Any], year: int) -> tuple[_dt.date, _dt.date]:
    """Khoảng ngày (bắt đầu, kết thúc – tính cả hai đầu) của chủ đề, lần bắt đầu trong năm `year`."""
    w = theme["when"]
    if w[0] == "fixed":
        (m1, d1), (m2, d2) = w[1], w[2]
        start = _safe_date(year, m1, d1)
        end = _safe_date(year if (m2, d2) >= (m1, d1) else year + 1, m2, d2)
        return start, end
    base = lunar_to_solar(w[1], w[2], year)
    return base + _dt.timedelta(days=w[3]), base + _dt.timedelta(days=w[4])


def window(theme: dict[str, Any], today: _dt.date) -> tuple[_dt.date, _dt.date]:
    """Lần diễn ra hiện tại (nếu đang diễn ra) hoặc lần sắp tới gần nhất."""
    best: tuple[_dt.date, _dt.date] | None = None
    for y in (today.year - 1, today.year, today.year + 1):
        try:
            s, e = occurrence(theme, y)
        except (ValueError, OverflowError):
            continue
        if e >= today and (best is None or s < best[0]):
            best = (s, e)
    if best is None:   # không thể xảy ra với các chủ đề hiện có
        best = occurrence(theme, today.year + 1)
    return best


def in_window(theme: dict[str, Any], today: _dt.date) -> bool:
    s, e = window(theme, today)
    return s <= today <= e


def _ddmm(d: _dt.date) -> str:
    return f"{d.day}/{d.month}"


def themes_view(today: _dt.date) -> list[dict[str, Any]]:
    """Danh sách chủ đề (theo thứ tự ưu tiên) kèm lịch tính cho ngày hôm nay — gửi sang giao diện."""
    out = []
    for t in THEMES:
        s, e = window(t, today)
        now = s <= today <= e
        out.append({
            "id": t["id"], "name": t["name"], "jp": t["jp"], "kind": t["kind"], "desc": t["desc"], "icon": t["icon"],
            "price": THEME_PRICE, "streak": STREAK_NEED[t["kind"]], "items": theme_items(t["id"]),
            "now": now, "start": _ddmm(s), "end": _ddmm(e), "year": s.year,
            "starts_in": max(0, (s - today).days), "days_left": (e - today).days if now else None,
            "lunar": t["when"][0] == "lunar",
        })
    return out


def clean_season(raw: Any) -> dict[str, Any]:
    """Phần cài đặt của Mùa & Lễ hội (không gồm đồ đạc)."""
    out: dict[str, Any] = {"unlocked": [], "mode": "auto", "pick": None, "free_day": None}
    if not isinstance(raw, dict):
        return out
    got = raw.get("unlocked")
    if isinstance(got, list):
        out["unlocked"] = [t for t in THEME_IDS if t in got]
    if raw.get("mode") in SEASON_MODES:
        out["mode"] = raw["mode"]
    if raw.get("pick") in out["unlocked"]:
        out["pick"] = raw["pick"]
    if out["mode"] == "pick" and not out["pick"]:
        out["mode"] = "auto"
    if isinstance(raw.get("free_day"), int):
        out["free_day"] = raw["free_day"]
    return out


def active_theme(season: dict[str, Any], today: _dt.date) -> str | None:
    """Chủ đề đang dùng: tự động = chủ đề đã mở có ưu tiên cao nhất đang diễn ra."""
    unlocked = season.get("unlocked") or []
    mode = season.get("mode", "auto")
    if mode == "off":
        return None
    if mode == "pick":
        return season.get("pick") if season.get("pick") in unlocked else None
    for t in THEMES:
        if t["id"] in unlocked and in_window(t, today):
            return t["id"]
    return None


def streak_available(streak: int, day: int, free_day: int | None) -> int:
    """Số ngày của chuỗi còn dùng được để đổi miễn phí: mỗi lần đổi dùng hết chuỗi tính tới hôm đó."""
    if free_day is None:
        return max(0, streak)
    return max(0, min(streak, day - free_day))
