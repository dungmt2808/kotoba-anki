"""Các kịch bản bổ sung độc lập. Chỉ dùng dữ liệu giả trong thư mục tạm.
Chạy bằng Python có anki: python audit_core.py [REPO]
FAIL là lỗi sản phẩm theo kỳ vọng đã ghi; ERROR là lỗi kịch bản cần điều tra.
"""
import copy
import json
import sys
import tempfile
from pathlib import Path

REPO = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path(__file__).resolve().parents[4]
OUT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO / "kotoba_batake"))
import garden_core as c
import journal_core as j

TMP = Path(tempfile.mkdtemp(prefix="kb_release_core_"))
rows = []


def case(name, expected, fn, finding=""):
    try:
        passed, actual = fn()
        row = dict(id=f"C{len(rows)+1:03}", name=name, expected=expected,
                   actual=actual, status="PASS" if passed else "FAIL", finding=finding)
    except Exception as e:
        row = dict(id=f"C{len(rows)+1:03}", name=name, expected=expected,
                   actual=f"{type(e).__name__}: {e}", status="ERROR", finding=finding)
    rows.append(row)
    print(json.dumps(row, ensure_ascii=False))


class Col:
    def __init__(self, name):
        self.path = str(TMP / name / "collection.anki2")
        self.conf = {}
        self.sched = type("Sched", (), {"today": 100})()

    def get_config(self, key, default=None):
        return copy.deepcopy(self.conf.get(key, default))

    def set_config(self, key, value):
        self.conf[key] = copy.deepcopy(value)


def fresh(name, col=None):
    p = TMP / name
    p.mkdir(exist_ok=True)
    st = c.GardenState(str(p / "state.json"), (lambda: col) if col else None)
    data = st.load()
    data["coins"] = 50000
    data["home"]["house"] = 7
    data["home"]["rooms"] = ["kitchen", "bedroom"]
    st.save(data)
    return st


def craft_fixture(scene, kind, size, name):
    st = fresh(name)
    data = st.craft_save(dict(name="Mẫu kiểm thử", kind=kind, size=size, fx="none",
                              px=c.px_encode("r" * (size * size))))
    cid = data["craft_id"]
    for y in range(4):
        for x in range(9):
            try:
                c.check_spot(data["home"], scene, cid, x, y, cat=c.full_catalog(data))
            except c.HomeError:
                continue
            st.place(scene, cid, x, y)
            return st, cid, x, y
    raise AssertionError("fixture không tìm được chỗ đặt")


for scene in ["kitchen", "bedroom"]:
    for kind in ["floor", "wall"]:
        for size in [16, 24, 32]:
            tag = f"{scene}-{kind}-{size}"
            st, cid, x, y = craft_fixture(scene, kind, size, tag)
            got = st.load()["home"][scene]
            case("Đặt mẫu " + tag, "1 món đặt, sở hữu 1", lambda g=got: (len(g) == 1, g))
            counts = []
            for _ in range(3):
                st.save(st.load())
                raw = json.loads(Path(st._nha_path()).read_text())
                counts.append(len(raw.get("places", {}).get(scene, [])))
            case("Lưu lặp " + tag, "NHA_KEY luôn 1 placement", lambda n=counts: (n == [1, 1, 1], n), "F01")
            st.take(scene, 0)
            got = st.load()["home"][scene]
            case("Cất rồi đọc lại " + tag, "gian trống, món về kho", lambda g=got: (g == [], g), "F01")

for scene in ["yard", "room"]:
    for kind in (["ground"] if scene == "yard" else ["floor", "wall"]):
        st, cid, x, y = craft_fixture(scene, kind, 16, scene + kind)
        st.take(scene, 0)
        got = st.load()["home"][scene]
        case("Đối chứng cất mẫu ở " + scene + "/" + kind, "món biến khỏi cảnh", lambda g=got: (not g, g))

for lang, text in [("en", "extraordinarilylong " * n) for n in [1, 19, 20, 21, 29, 30]] + [("ja", "あ" * n) for n in [1, 59, 60]]:
    text = text.strip()
    got = j.clean_writing(dict(lang=lang, goc=text, st=""))["goc"]
    case(f"Lưu luyện viết {lang}/{j.count_units(text,lang)} đơn vị/{len(text)} ký tự",
         "giữ nguyên bài trong giới hạn 30 từ / 60 ký tự", lambda g=got, t=text: (g == t, dict(before=len(t), after=len(g), text=g)), "F02")

for lang, n in [("ja", 61), ("ja", 120), ("en", 31), ("en", 60)]:
    text = "あ" * n if lang == "ja" else "word " * n
    got, clipped = j.clip_units(text, lang, j.WRITE_MAX[lang])
    case(f"Cắt đúng đơn vị {lang}/{n}", "không vượt giới hạn, không cắt giữa từ",
         lambda g=got, l=lang, cl=clipped: (cl and j.count_units(g,l) == j.WRITE_MAX[l], g))

for batches in [[999], [1000], [1001], [1500], [600, 600], [800, 800], [1000, 1], [400, 400, 400]]:
    data = fresh("mobile-" + "-".join(map(str,batches))).load()
    data["coins"] = 0
    data["mobile"] = c.new_mobile(1)
    cumulative = 0
    paid = []
    for n in batches:
        cumulative += n
        res = c.settle_mobile(data, {100:dict(day_all=cumulative, all=cumulative, ok=cumulative, rev=cumulative, new=0)}, 100, 100, 99999, 0)
        paid.append(res["coins"])
    expected = min(1000, cumulative)
    case(f"Bù xu cùng ngày theo đợt {batches}", f"tổng trả {expected} (trần 1000/ngày)",
         lambda g=data["coins"], p=paid, e=expected: (g == e, dict(total=g, batches=p)), "F10")
    res = c.settle_mobile(data, {100:dict(day_all=cumulative, all=cumulative, ok=cumulative, rev=cumulative, new=0)}, 100, 100, 99999, 0)
    case(f"Bù lặp {batches}", "không trả thêm xu", lambda r=res: (r["coins"] == 0, r))

for stages in [[90, 3, 21], [3, 3, 90], [3, 90, 21], [21, 3, 90], [0, 21, 90], [3, 21, 90]]:
    got = c.merged_config(dict(stage_days=stages))["stage_days"]
    case("Mốc cây " + str(stages), "ba mốc dương, tăng nghiêm ngặt sau làm sạch",
         lambda g=got: (len(g) == 3 and 0 < g[0] < g[1] < g[2], g), "F13")

template = dict(id="100-0", kind="due", target=1, reward=20, text="Ôn 1 thẻ")
for removed in ["id", "reward", "text"]:
    q = copy.deepcopy(template)
    q.pop(removed)
    raw = dict(day=100, list=[q], progress={"due":1}, done=[])
    data = fresh("quest-" + removed).load()
    data["quest"] = c._clean_quest(raw)
    try:
        v = c.quest_view(data)
        v = c._settle_quests(data)
        actual = v
        valid = not data["quest"]["list"] or all(k in data["quest"]["list"][0] for k in template)
    except Exception as e:
        valid, actual = False, f"{type(e).__name__}: {e}"
    case("Nhiệm vụ thiếu " + removed, "loại bỏ / tái tạo nhiệm vụ hỏng, không ném lỗi",
         lambda g=valid, a=actual: (g, a), "F12")

for name in ["A", "B"]:
    col = Col("profile-"+name)
    st = fresh("shared-px", col)
    if name == "A":
        st.save_px({"c1":"fixture-pixels-A"})
        a_px = st.load_px()
        case("Điểm ảnh hồ sơ A", "đọc đúng PX_KEY của A", lambda g=a_px: (g == {"c1":"fixture-pixels-A"}, g))
    else:
        got, meta = st.load_px(), st.load()["craft"]["items"]
        case("Hồ sơ B mới đọc kho điểm ảnh", "không nhận điểm ảnh A (metadata B vẫn trống)",
             lambda g=got,m=meta: (g == {}, dict(pixels=g, metadata=m)), "F09")

# Mỗi cấu hình là một biên có tác động riêng tới người dùng; kiểm tra giá trị chuẩn sau đọc.
for key, values in {
    "daily_goal":[(9,10),(10,10),(10000,10000)],
    "daily_bonus":[(-1,0),(0,0),(100,100),(101,100)],
    "game_daily_coins":[(-1,0),(0,0),(200,200),(201,200)],
    "max_plants":[(0,1),(1,1),(5000,5000),(5001,5000)],
    "music_volume":[(-0.1,0),(0,0),(1,1),(1.1,1)],
}.items():
    for inp, expected in values:
        got = c.merged_config({key:inp})[key]
        case(f"Config {key}={inp}", repr(expected), lambda g=got,e=expected: (g == e,g))

for count in [0,1,119,120,121,1000]:
    raw = {f"kb-test-{n}":str(n) for n in range(count)}
    got = c.more.clean_prefs(raw)
    case(f"Prefs {count} khóa", "tối đa 120, giữ khóa mới nhất và làm sạch lặp ổn định",
         lambda g=got, n=count: (len(g) == min(n,120) and c.more.clean_prefs(g) == g and (not n or f"kb-test-{n-1}" in g), dict(count=len(g))))

for text in ["<script>alert(1)</script>", "Cà phê 日本語", "a\x00b\n c", "x"*200, "", "a\r\nb", "a\t b"]:
    got = j.clean_line(text,200)
    case("Nhật ký làm sạch " + repr(text[:24]), "giới hạn 200, không ký tự điều khiển, idempotent",
         lambda g=got: (len(g)<=200 and "\x00" not in g and "\n" not in g and j.clean_line(g,200) == g,g))

OUT.joinpath("logs/core-extra.json").write_text(json.dumps(rows,ensure_ascii=False,indent=2))
print(json.dumps({s:sum(r["status"]==s for r in rows) for s in ["PASS","FAIL","ERROR"]}))
