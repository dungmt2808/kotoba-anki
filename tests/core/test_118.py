"""Test lõi bản 1.18: số trên nút "Tưới ngay" khớp với hàng đợi ôn của Anki.

Lỗi người dùng gặp (03/11/2026): ôn hết thẻ, bảng ôn báo "Hết thẻ cần tưới" nhưng nút Tưới ngay vẫn còn số 1
và ruộng có một cây héo kèm giọt nước. Trước 1.18 cây héo (R < 0.7) luôn được đếm là khát, kể cả khi Anki
không cho ôn thẻ đó hôm nay. Test dựng từng tình huống trên collection Anki thật (FSRS bật) và so
`build_garden` với `get_queued_cards`:
  - thẻ được hoãn tới mai (chôn thẻ anh em cùng note sau khi ôn một thẻ, hoặc bấm Hoãn)
  - deck chạm giới hạn ôn mỗi ngày
  - thẻ héo nhưng Anki hẹn ôn ở ngày sau (lịch có từ trước khi bật FSRS)
  - thẻ đang học có bước dài hơn thời gian "học trước" (vd. 1 giờ)
  - thẻ đến hạn bình thường, thẻ đang học trong 10 phút (vẫn phải đếm)

Chạy: python test_118.py THƯ_MỤC_ADD_ON   (cần gói anki: ANKI_PY=…)
"""
import os
import sys
import tempfile
import time

ADDON = sys.argv[1]
sys.path.insert(0, ADDON)
import garden_core as core  # noqa: E402
from anki.cards_pb2 import FsrsMemoryState  # noqa: E402
from anki.collection import Collection  # noqa: E402
from anki.scheduler.v3 import CardAnswer  # noqa: E402

FAIL = []


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


RATE = {1: CardAnswer.AGAIN, 3: CardAnswer.GOOD, 4: CardAnswer.EASY}
NOW = int(time.time())
N = [0]
col = DID = CONF = BASIC = REV = TODAY = None


def add(model):
    N[0] += 1
    n = col.new_note(model)
    n["Front"], n["Back"] = "từ %d" % N[0], "nghĩa %d" % N[0]
    col.add_note(n, DID)
    return n


def review_state(card, days_ago, ivl, stab):
    """Thẻ ôn: lần ôn cuối cách đây days_ago ngày, khoảng cách ivl ngày, độ bền stab ngày."""
    card.type, card.queue, card.ivl, card.reps = 2, 2, ivl, 3
    card.due = TODAY - days_ago + ivl
    card.memory_state = FsrsMemoryState(stability=stab, difficulty=5.0)
    card.last_review_time = NOW - days_ago * 86400
    col.update_card(card)


def answer(ease):
    q = col.sched.get_queued_cards(fetch_limit=1)
    top = q.cards[0]
    c = col.get_card(top.card.id)
    c.start_timer()
    col.sched.answer_card(col.sched.build_answer(card=c, states=top.states, rating=RATE[ease]))
    return col.get_card(c.id)


def state():
    col.decks.select(DID)
    q = col.sched.get_queued_cards(fetch_limit=50)
    g = core.build_garden(col, DID, {})
    return g, len(q.cards)


def set_conf(**kw):
    for path, v in kw.items():
        a, b = path.split("__")
        CONF[a][b] = v
    col.decks.update_config(CONF)


def reset():
    """Mỗi tình huống một collection mới (giới hạn mỗi ngày đếm theo bộ đếm "hôm nay" của deck)."""
    global col, DID, CONF, BASIC, REV, TODAY
    if col is not None:
        col.close()
    col = Collection(os.path.join(tempfile.mkdtemp(), "c.anki2"))
    col.set_config("fsrs", True)
    DID = col.decks.id("N5 - Từ vựng")
    CONF = col.decks.config_dict_for_deck_id(DID)
    BASIC = col.models.by_name("Basic")
    REV = col.models.by_name("Basic (and reversed card)")
    TODAY = col.sched.today
    set_conf(rev__bury=False, rev__perDay=200, lapse__delays=[10.0])
    col.decks.select(DID)


print("== thẻ đến hạn bình thường: đếm như cũ")
reset()
for _ in range(3):
    review_state(add(BASIC).cards()[0], 3, 2, 4.0)
g, q = state()
ok(q == 3 and g["stats"]["water_now"] == 3 and g["stats"]["thirsty"] == 3, "3 thẻ đến hạn → nút 3, hàng đợi 3 (%s, %d)" % (g["stats"]["water_now"], q))
ok(all(p["thirsty"] and not p["held"] for p in g["plants"]), "3 cây khát, không cây nào bị giữ")
ok(not g["stats"]["held"], "không có lý do 'chưa tưới được'")

print("== thẻ anh em bị hoãn tới mai (tình huống trong ảnh người dùng)")
reset()
set_conf(rev__bury=True)
n = add(REV)
a, b = n.cards()
review_state(a, 40, 5, 3.0)
review_state(b, 40, 5, 3.0)
g, q = state()
ok(q == 1 and g["stats"]["water_now"] == 1, "note 2 thẻ héo cùng đến hạn → nút 1, hàng đợi 1")
answer(3)
g, q = state()
p = g["plants"][0]
ok(q == 0, "ôn 1 thẻ → thẻ kia bị Anki hoãn, hàng đợi rỗng")
ok(g["stats"]["water_now"] == 0, "nút Tưới ngay không còn số (trước 1.18: còn 1) → %s" % g["stats"]["water_now"])
ok(p["wilted"] and not p["thirsty"] and p["held"] == "buried", "cây vẫn héo (nhớ thật) nhưng không khát, lý do 'buried': %s" % p["held"])
ok(g["stats"]["held"].get("buried") == 1, "thống kê: 1 cây hoãn tới mai")

print("== bấm Hoãn (bury) một thẻ héo")
reset()
c = add(BASIC).cards()[0]
review_state(c, 40, 5, 3.0)
col.sched.bury_cards([c.id])
g, q = state()
ok(q == 0 and g["stats"]["water_now"] == 0 and g["plants"][0]["held"] == "buried", "thẻ bị hoãn: nút 0, cây 'buried'")

print("== chôn thẻ mới anh em: cây mầm không bị gắn 'hoãn tới mai'")
reset()
set_conf(new__bury=True)
n = add(REV)
answer(4)                         # học thẻ mới thứ nhất (Dễ → tốt nghiệp) → thẻ mới thứ hai bị hoãn
g, q = state()
buried_new = col.find_cards('deck:"N5 - Từ vựng" is:buried is:new')
ok(len(buried_new) == 1, "Anki hoãn thẻ mới anh em")
p = g["plants"][0]
ok(q == 0 and not p["thirsty"] and p["held"] is None and not g["stats"]["held"], "hàng đợi rỗng, cây không khát, không lý do 'buried' (thẻ mới chưa cần tưới): %s" % p["held"])

print("== thẻ tạm ngưng (suspend): không tính vào vườn như trước")
reset()
c = add(BASIC).cards()[0]
review_state(c, 40, 5, 3.0)
col.sched.suspend_cards([c.id])
g, q = state()
ok(q == 0 and g["stats"]["water_now"] == 0 and not g["plants"], "thẻ tạm ngưng không thành cây, nút 0")

print("== deck chạm giới hạn ôn mỗi ngày")
reset()
set_conf(rev__perDay=2)
for _ in range(4):
    review_state(add(BASIC).cards()[0], 3, 2, 4.0)
g, q = state()
ok(q == 2 and g["stats"]["water_now"] == 2, "4 thẻ đến hạn, giới hạn 2 → nút 2, hàng đợi 2 (%s, %d)" % (g["stats"]["water_now"], q))
ok(g["stats"]["thirsty"] == 4 and g["stats"]["held"].get("limit") == 2, "vẫn 4 cây khát (có giọt nước), 2 cây 'vượt giới hạn'")
answer(3)
answer(3)
g, q = state()
ok(q == 0 and g["stats"]["water_now"] == 0, "ôn đủ 2 thẻ → hàng đợi rỗng, nút không còn số (trước 1.18: 2)")
ok(g["stats"]["held"].get("limit") == 2, "màn hết thẻ biết còn 2 cây chờ mai vì giới hạn")

print("== thẻ héo nhưng Anki hẹn ôn ở ngày sau")
reset()
c = add(BASIC).cards()[0]
review_state(c, 20, 40, 3.0)          # khoảng cách 40 ngày (lịch cũ) nhưng độ bền 3 ngày → R rất thấp
g, q = state()
p = g["plants"][0]
ok(q == 0 and g["stats"]["water_now"] == 0, "hàng đợi rỗng, nút không có số (trước 1.18: 1)")
ok(p["wilted"] and not p["thirsty"] and p["held"] == "notdue", "cây héo, không khát, lý do 'notdue'")
ok(p["due_in"] == 20, "chú thích cây vẫn ghi ôn sau 20 ngày (%s)" % p["due_in"])

print("== thẻ đang học, bước 1 giờ (dài hơn 20 phút học trước)")
reset()
set_conf(lapse__delays=[60.0])
c = add(BASIC).cards()[0]
review_state(c, 40, 5, 3.0)
c = answer(1)
g, q = state()
p = g["plants"][0]
ok(q == 0 and g["stats"]["water_now"] == 0, "vừa bấm Lại, chờ 1 giờ → hàng đợi rỗng, nút 0")
ok(p["held"] == "later" and abs(p["later_at"] - c.due) < 2, "cây 'later', có giờ tới lượt (%s)" % p.get("later_at"))
ok(g["stats"]["held"].get("later") == 1, "thống kê: 1 cây chờ tới lượt")

print("== thẻ đang học, bước 10 phút (trong 20 phút học trước): vẫn tưới được")
reset()
c = add(BASIC).cards()[0]
review_state(c, 40, 5, 3.0)
answer(1)
g, q = state()
ok(q == 1 and g["stats"]["water_now"] == 1 and g["plants"][0]["thirsty"] and not g["plants"][0]["held"],
   "bấm Lại → học lại sau 10 phút: nút 1, hàng đợi 1")

print("== thẻ đang nằm trong deck lọc (Filtered deck)")
reset()
for i in range(2):
    review_state(add(BASIC).cards()[0], 3, 2, 4.0)
fd = col.sched.get_or_create_filtered_deck(0)
fd.name = "Lọc ôn"
fd.config.search_terms[0].search = 'deck:"N5 - Từ vựng" "Front:từ %d"' % N[0]
fd.config.search_terms[0].limit = 10
FID = col.sched.add_or_update_filtered_deck(fd).id
g, q = state()
ok(q == 1 and g["stats"]["water_now"] == 1, "deck gốc: 2 thẻ đến hạn, 1 thẻ mượn sang deck lọc → nút 1, hàng đợi 1 (%s, %d)" % (g["stats"]["water_now"], q))
ok(g["stats"]["held"] == {"filtered": 1}, "lý do 'filtered', không báo nhầm 'chạm giới hạn': %s" % g["stats"]["held"])
col.decks.select(FID)
q2 = len(col.sched.get_queued_cards(fetch_limit=50).cards)
g2 = core.build_garden(col, FID, {})
ok(q2 == 1 and g2["stats"]["water_now"] == 1 and g2["plants"][0]["thirsty"] and not g2["plants"][0]["held"],
   "xem chính deck lọc: cây khát, nút 1, hàng đợi 1")
ok(g["stats"]["queue"] == [0, 0, 1], "stats.queue = [mới, đang học, ôn] Anki còn cho: %s" % g["stats"]["queue"])

print("== FSRS tắt: prop:r lỗi thì bỏ qua như cũ")
reset()
col.set_config("fsrs", False)
review_state(add(BASIC).cards()[0], 3, 2, 4.0)
g, q = state()
ok(q == 1 and g["stats"]["water_now"] == 1, "FSRS tắt: nút 1, hàng đợi 1")
col.set_config("fsrs", True)

print("== hàm phụ chịu lỗi")


class Broken:
    class sched:
        @staticmethod
        def deck_due_tree(_did):
            raise RuntimeError("x")


ok(core.queue_counts(Broken, 1) is None, "queue_counts lỗi → None (nút dùng số cây khát)")

col.close()
print("KẾT QUẢ:", "TẤT CẢ OK" if not FAIL else "%d LỖI" % len(FAIL))
sys.exit(1 if FAIL else 0)
