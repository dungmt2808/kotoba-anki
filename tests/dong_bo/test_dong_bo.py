"""Test đồng bộ 1.31.2 — MÁY CHỦ ĐỒNG BỘ THẬT của Anki (`python -m anki.syncserver`, chạy cục bộ, không ra mạng) + nhiều
"máy" là các collection Anki thật: máy tính có add-on (lõi thật: GardenState, JournalStore, GuestStore, LifeStore, EventStore
+ sync_core như `__init__.py` gọi ở sync_will_start / sync_did_finish / profile_did_open) và điện thoại (không add-on).

Bộ test có sẵn chỉ giả "máy 2" bằng cách chép file collection nên không thấy luật đồng bộ thật của Anki: cấu hình collection
đi **nguyên khối**, bên sửa collection sau cùng đè cả khối. Bài này kiểm:

 0. Luật của Anki (để biết ngay nếu bản Anki sau đổi luật): điện thoại ôn thẻ khi chưa đồng bộ → cấu hình cũ của nó đè máy chủ.
 1. Tắt lớp giữ dữ liệu (`sync_guard: false`, như ≤ 1.31.1): tái hiện mất xu / ghế / nhật ký.
 2. Bật (mặc định): điện thoại đè nhiều ngày liền → máy tính luôn giữ được; điện thoại đồng bộ sạch thì nhận bản mới.
 3. Ngày đầu cài: cấu hình của điện thoại chưa có khoá nào của vườn → mọi khoá bị xoá → trả lại đủ (nhật ký, album, sổ…).
 4. Hai máy tính dùng luân phiên, đồng bộ đúng cách → không lần nào phải trả lại, dữ liệu máy này sang máy kia nguyên vẹn.
 5. Máy tính thứ hai cài add-on khi collection chưa đồng bộ (lập vườn trống rồi đè máy chủ) → vườn thật thắng ở cả hai máy.
 6. Ghi sau lần đồng bộ lúc đóng (bù xu) không thắng phiên chơi sau đó của máy kia; đồng hồ máy chạy chậm vẫn đúng thứ tự.
 7. Đồng bộ toàn bộ (điện thoại đổi cấu trúc → máy tính buộc tải về) → giữ được.
 8. Chơi vườn trước khi đăng nhập AnkiWeb rồi tải collection của điện thoại về → vườn còn; đổi sang tài khoản khác đã có
    vườn → không đụng vườn của tài khoản đó.
 9. Máy còn bản cũ (không đóng dấu) sửa ví → không bị coi là bản cũ (không đè dữ liệu lạ).
10. Mở hồ sơ: đồng bộ chạy lúc add-on tắt (chế độ an toàn) → lần mở sau trả lại; vừa khôi phục bản sao lưu của Anki → giữ
    bản vừa khôi phục và máy kia cũng nhận bản đó.
11. Ngẫu nhiên: một máy tính + điện thoại (đồng bộ bừa) → không lần ghi nào của máy tính bị mất; hai máy tính dùng đúng cách
    + điện thoại đồng bộ sạch → không mất gì, không lần trả lại nào; hai máy tính + điện thoại bừa → không lỗi, hội tụ,
    không trả lại qua lại mãi.

Chạy: ANKI_PY=<python có gói anki> ; $ANKI_PY tests/dong_bo/test_dong_bo.py THƯ_MỤC_ADD_ON
"""
import datetime as dt
import json
import os
import random
import shutil
import socket
import subprocess
import sys
import tempfile
import time

ADDON = os.path.abspath(sys.argv[1])
sys.path.insert(0, ADDON)
for _k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(_k, None)
os.environ["NO_PROXY"] = "127.0.0.1,localhost"

try:
    from anki.collection import Collection
    Collection.sync_collection  # noqa: B018
except (ImportError, AttributeError):
    print("  (bỏ qua: cần gói anki thật — đặt ANKI_PY)")
    print("KẾT QUẢ: TẤT CẢ OK (bỏ qua)")
    sys.exit(0)

import backup_core as B          # noqa: E402
import garden_core as core       # noqa: E402
import journal_core as journal   # noqa: E402
import guest_core as guests      # noqa: E402
import life_core as life         # noqa: E402
import finds_core as finds       # noqa: E402
import sync_core as S            # noqa: E402

FAIL = []
TMP = tempfile.mkdtemp(prefix="kb_dongbo_")
USERS = 40


def ok(cond, msg):
    print(("  ✓ " if cond else "  ✗ ") + msg)
    if not cond:
        FAIL.append(msg)


# -- đồng hồ giả cho dấu phiên bản (hai bản backup_core: của garden_core và bản nạp thẳng) ---------------------------------
_skew = [0.0]


def _clock():
    return time.time() + _skew[0]


for _m in (B, core.backup, S.backup):
    _m.time = type("T", (), {"time": staticmethod(_clock)})      # touch_rev gọi time.time()


class skew:
    """with skew(-200): … — đồng hồ của máy đang thao tác lệch chừng đó giây."""

    def __init__(self, sec):
        self.sec = sec

    def __enter__(self):
        _skew[0] = self.sec

    def __exit__(self, *a):
        _skew[0] = 0.0


# -- máy chủ đồng bộ thật -------------------------------------------------------------------------------------------------
def free_port():
    s = socket.socket()
    s.bind(("127.0.0.1", 0))
    p = s.getsockname()[1]
    s.close()
    return p


PORT = free_port()
EP = f"http://127.0.0.1:{PORT}/"
_env = dict(os.environ, SYNC_BASE=os.path.join(TMP, "srv"), SYNC_PORT=str(PORT), SYNC_HOST="127.0.0.1", RUST_LOG="anki=error")
for _i in range(1, USERS + 1):
    _env[f"SYNC_USER{_i}"] = f"u{_i}:p"
SERVER = subprocess.Popen([sys.executable, "-m", "anki.syncserver"], env=_env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for _ in range(60):
    try:
        socket.create_connection(("127.0.0.1", PORT), timeout=0.5).close()
        break
    except OSError:
        time.sleep(0.2)
_user = [0]


def new_user():
    _user[0] += 1
    assert _user[0] <= USERS, "hết tài khoản test"
    return f"u{_user[0]}"


# -- các "máy" ------------------------------------------------------------------------------------------------------------
def login(col, user):
    """Đăng nhập máy chủ đồng bộ cục bộ. Anki 23.10 trả về auth không kèm địa chỉ máy chủ (mặc định AnkiWeb) → gắn lại."""
    auth = col.sync_login(username=user, password="p", endpoint=EP)
    if not getattr(auth, "endpoint", ""):
        auth.endpoint = EP
    return auth


class Device:
    """Một máy: collection Anki thật + (máy tính) lõi add-on thật với thư mục user_files riêng."""

    def __init__(self, name, user, addon=True, guard=True):
        self.name, self.user, self.addon, self.guard = name, user, addon, guard
        self.dir = os.path.join(TMP, user, name)
        os.makedirs(self.dir, exist_ok=True)
        self.uf = os.path.join(self.dir, "user_files")
        self.col = Collection(os.path.join(self.dir, "collection.anki2"))
        self.auth = login(self.col, user)
        self.restores = []
        get = lambda: self.col      # noqa: E731
        self.state = core.GardenState(os.path.join(self.uf, "state.json"), col_getter=get)
        self.journal = journal.JournalStore(os.path.join(self.uf, "journal"), col_getter=get)
        self.guests = guests.GuestStore(os.path.join(self.uf, "guests.json"), col_getter=get)
        self.life = life.LifeStore(os.path.join(self.uf, "life.json"), col_getter=get)
        self.events = finds.EventStore(os.path.join(self.uf, "events.json"), col_getter=get)

    # ---- Anki ----
    def add_notes(self, n=6):
        m = self.col.models.by_name("Basic")
        for i in range(n):
            note = self.col.new_note(m)
            note["Front"], note["Back"] = f"{self.name}-q{i}-{random.random()}", "a"
            self.col.add_note(note, 1)

    def review(self, n=1):
        done = 0
        for _ in range(n):
            q = self.col.sched.get_queued_cards(fetch_limit=1)
            if not q.cards:
                break
            top = q.cards[0]
            card = self.col.get_card(top.card.id)
            card.start_timer()
            self.col.sched.answer_card(self.col.sched.build_answer(card=card, states=top.states, rating=2))
            done += 1
        return done

    def raw_sync(self, prefer=None):
        out = self.col.sync_collection(self.auth, False)
        if out.required in (out.FULL_SYNC, out.FULL_DOWNLOAD, out.FULL_UPLOAD):
            up = out.required == out.FULL_UPLOAD or (out.required == out.FULL_SYNC and prefer == "up")
            self.col.close_for_full_sync()
            self.col.full_upload_or_download(auth=self.auth, server_usn=None, upload=up)
            self.col.reopen(after_full_sync=True)
            return "full-up" if up else "full-down"
        return "normal"

    def sync(self, prefer=None, hooks=True):
        """Như Anki: sync_will_start → đồng bộ → sync_did_finish. `hooks=False`: add-on đang tắt (chế độ an toàn)."""
        on = self.addon and self.guard and hooks
        before = S.before_sync(self.col, self.uf) if on else None
        kind = self.raw_sync(prefer)
        if on:
            res = S.after_sync(self.col, self.uf, before)
            if res["action"] != S.KEEP:
                self.restores.append(res)
            return kind, res
        return kind, None

    def open_profile(self, restoring_backup=False):
        """profile_did_open của add-on (phần sync_core)."""
        res = S.on_open(self.col, self.uf, restoring_backup)
        if res["action"] != S.KEEP:
            self.restores.append(res)
        return res

    def reopen(self):
        self.col.close()
        self.col = Collection(os.path.join(self.dir, "collection.anki2"))

    # ---- vườn ----
    def first_run(self):
        """Lần đầu add-on chạy trên collection: mốc + sổ bù xu (ví trống) — như `_open_tasks` của __init__."""
        self.state.streak_start(self.col)
        self.state.mobile_catch_up(self.col, 30, 15)

    def play(self, token, day=None):
        """Một việc trong vườn: +10 xu, một dòng nhật ký riêng (token), một lần gặp khách, một việc sinh hoạt."""
        day = day or dt.date(2026, 1, 1) + dt.timedelta(days=len(self.tokens()) % 300)
        self.state.add_coins(10)
        self.journal.update(day, {"t": token})
        self.guests.met(random.choice(list(guests.GUESTS)), "yard", day)
        return day

    def tokens(self):
        out = set()
        for key, val in S.snapshot(self.col).items():
            if key.startswith(journal.JOURNAL_PREFIX) and isinstance(val, dict):
                out.update(e.get("t") for e in val.values() if isinstance(e, dict) and e.get("t"))
        return out

    def coins(self):
        return self.state.load()["coins"]

    def keys(self):
        return sorted(S.snapshot(self.col))

    def blob(self):
        return S.digest(S.snapshot(self.col))

    def close(self):
        try:
            self.col.close()
        except Exception:
            pass


def trio(guard=True, notes=8):
    """Tài khoản mới: máy tính A (có add-on, đã lập vườn, đã đẩy lên), điện thoại P (đã tải về)."""
    user = new_user()
    a = Device("A", user, guard=guard)
    a.add_notes(notes)
    a.first_run()
    a.sync("up")
    p = Device("P", user, addon=False)
    p.sync("down")
    return user, a, p


def settle(*devs, rounds=3):
    for _ in range(rounds):
        for d in devs:
            d.sync()


try:
    # =====================================================================================================================
    print("== 0. Luật đồng bộ của Anki: cấu hình collection đi nguyên khối, bên sửa collection sau cùng thắng")
    user = new_user()
    d = Device("D", user, addon=False)
    d.add_notes(4)
    d.col.set_config("kb_luat", {"v": "W0"})
    d.sync("up")
    p = Device("P", user, addon=False)
    p.sync("down")
    time.sleep(1.1)
    d.col.set_config("kb_luat", {"v": "W1"})
    d.raw_sync()
    time.sleep(1.1)
    p.review(1)
    ok(p.col.get_config("kb_luat")["v"] == "W0", "điện thoại chưa đồng bộ nên còn bản W0")
    p.raw_sync()
    time.sleep(1.1)
    d.raw_sync()
    ok(d.col.get_config("kb_luat")["v"] == "W0",
       "máy tính đồng bộ lại → W1 bị W0 của điện thoại đè (luật của Anki; nếu ca này trượt là Anki đã đổi luật — xem lại sync_core)")
    ok(d.col.db.scalar("select count() from revlog") == 1, "còn lượt ôn của điện thoại thì vẫn về máy tính (thẻ / revlog được gộp)")
    d.close(), p.close()

    # =====================================================================================================================
    print("== 1. Tắt lớp giữ dữ liệu (như ≤ 1.31.1): mất xu, ghế, nhật ký")
    user, a, p = trio(guard=False)
    time.sleep(1.1)
    a.state.add_coins(100)
    a.state.buy("bench")
    day = dt.date(2026, 11, 10)
    a.journal.update(day, {"t": "nhật ký viết trên máy tính"})
    c1 = a.coins()
    a.sync()
    time.sleep(1.1)
    p.review(2)
    p.sync()
    time.sleep(1.1)
    a.sync()
    w = a.state.load()
    ok(w["coins"] < c1 and not w["home"]["owned"].get("bench") and not a.journal.entry(day).get("t"),
       f"không có lớp giữ: xu {c1} → {w['coins']}, ghế mất, nhật ký mất (đúng lỗi đã tái hiện trong Anki thật)")
    a.close(), p.close()

    # =====================================================================================================================
    print("== 2. Bật (mặc định): điện thoại đè nhiều ngày liền, máy tính luôn giữ được")
    user, a, p = trio()
    total, toks = a.coins(), set()
    for dayno in range(4):
        time.sleep(1.1)
        a.state.add_coins(100)
        total += 100
        tok = f"ngày {dayno}: nhật ký máy tính"
        a.journal.update(dt.date(2026, 11, 1 + dayno), {"t": tok})
        toks.add(tok)
        if dayno == 0:
            a.state.buy("bench")
            total -= core.CATALOG["bench"]["price"]
        a.sync()
        time.sleep(1.1)
        p.review(1)                       # điện thoại: ôn trước, đồng bộ sau (bản nó giữ hộ là bản cũ)
        p.sync()
        time.sleep(1.1)
        kind, res = a.sync()
        ok(res["action"] == S.RESTORE and a.coins() == total and a.tokens() == toks
           and a.state.load()["home"]["owned"].get("bench") == 1,
           f"ngày {dayno}: máy tính đồng bộ sau điện thoại → giữ đủ {total} xu, ghế, {len(toks)} dòng nhật ký ({res['why']})")
    ok(a.col.db.scalar("select count() from revlog") == 4, "4 lượt ôn của điện thoại đều về máy tính")
    a.sync()                              # đẩy bản đã giữ lên
    time.sleep(1.1)
    p.sync()                              # điện thoại đồng bộ khi không có gì mới của nó → nhận bản mới
    ok(S.digest(S.snapshot(p.col)) == a.blob(), "điện thoại đồng bộ sạch → nhận đúng bản mới của máy tính")
    time.sleep(1.1)
    p.review(1)
    p.sync()
    time.sleep(1.1)
    kind, res = a.sync()
    ok(res["action"] == S.KEEP and a.coins() == total, "điện thoại đã có bản mới: ôn rồi đồng bộ không còn đè gì → không cần trả lại")
    lost = os.path.join(B.profile_path(os.path.join(a.uf, S.LOST), a.col))
    ok(os.path.exists(lost) and "keys" in json.load(open(lost, encoding="utf-8")), "bản bị thay được chép ra dong_bo_bi_de.json")
    ok(os.path.exists(S.record_path(a.uf, a.col)), "bản chụp gần nhất ở user_files/ho_so/<mã>/dong_bo.json")
    a.close(), p.close()

    # =====================================================================================================================
    print("== 3. Ngày đầu cài: cấu hình của điện thoại chưa có khoá nào của vườn")
    user = new_user()
    a = Device("A", user)
    a.add_notes(6)
    a.sync("up")                          # collection lên máy chủ TRƯỚC khi cài add-on
    p = Device("P", user, addon=False)
    p.sync("down")
    ok(not [k for k in p.col.all_config() if k.startswith("kotoba_batake")], "điện thoại: chưa có khoá kotoba_batake_* nào")
    time.sleep(1.1)
    a.first_run()                         # cài add-on trên máy tính, chơi ngày đầu
    a.state.add_coins(80)
    day = dt.date(2026, 11, 15)
    a.journal.update(day, {"t": "ngày đầu tiên có vườn", "m": journal.STICKERS[0]})
    a.guests.met(list(guests.GUESTS)[0], "yard", day)
    a.life.mark(list(life.ACTS)[0], "room", day)
    keys1, blob1, c1 = a.keys(), a.blob(), a.coins()
    a.sync()
    time.sleep(1.1)
    p.review(2)
    p.sync()
    time.sleep(1.1)
    kind, res = a.sync(hooks=False)       # trước hết xem không có lớp giữ thì ra sao
    ok(not [k for k in a.keys()], "không có lớp giữ: mọi khoá kotoba_batake_* bị xoá khỏi collection của máy tính")
    ok(a.journal.entry(day) == {}, "… nhật ký ngày đầu đọc ra trống (ví thì còn lấy lại từ file sao lưu, nhật ký thì không)")
    res = a.open_profile()                # lần mở hồ sơ sau (add-on bật lại) → trả lại từ bản chụp
    ok(res["action"] == S.RESTORE and a.blob() == blob1 and a.coins() == c1 and a.journal.entry(day).get("t") == "ngày đầu tiên có vườn",
       "mở hồ sơ → trả lại đủ mọi khoá từ bản chụp: xu, nhật ký, album (" + res["why"] + ")")
    ok(set(keys1) <= set(a.keys()), "đủ các khoá như trước: " + ", ".join(k.replace("kotoba_batake_", "") for k in keys1))
    # cùng việc đó nhưng add-on bật lúc đồng bộ
    a.sync()
    time.sleep(1.1)
    a.state.add_coins(5)
    a.sync()
    time.sleep(1.1)
    p.review(1)
    p.sync()                              # điện thoại vẫn giữ bản chưa có vườn
    time.sleep(1.1)
    kind, res = a.sync()
    ok(res["action"] == S.RESTORE and "không còn dữ liệu vườn" in res["why"] and a.coins() == c1 + 5,
       "add-on bật: đồng bộ xong trả lại ngay (" + res["why"] + ")")
    a.close(), p.close()

    # =====================================================================================================================
    print("== 4. Hai máy tính dùng luân phiên, đồng bộ lúc mở và lúc đóng")
    user = new_user()
    a = Device("A", user)
    a.add_notes(6)
    a.first_run()
    a.sync("up")
    b = Device("B", user)
    b.sync("down")
    toks, total = set(), a.coins()
    for i in range(6):
        dev = (a, b)[i % 2]
        time.sleep(1.1)
        dev.sync()                        # mở Anki: tự đồng bộ
        ok(dev.tokens() == toks and dev.coins() == total, f"phiên {i} ({dev.name}): mở ra thấy đủ {len(toks)} dòng nhật ký, {total} xu của máy kia")
        tok = f"phiên {i} trên máy {dev.name}"
        dev.play(tok, dt.date(2026, 3, 1 + i))
        toks.add(tok)
        total += 10
        dev.sync()                        # đóng Anki: tự đồng bộ
    ok(not a.restores and not b.restores, "dùng đúng cách: không lần nào phải trả lại dữ liệu")
    settle(a, b)
    ok(a.blob() == b.blob() and a.tokens() == toks, "hai máy cùng một dữ liệu, đủ 6 phiên")
    a.close(), b.close()

    # =====================================================================================================================
    print("== 5. Máy tính thứ hai cài add-on khi collection của nó chưa đồng bộ (lập vườn trống rồi đè máy chủ)")
    user = new_user()
    a = Device("A", user)
    a.add_notes(6)
    a.sync("up")
    b = Device("B", user)
    b.sync("down")                        # B có collection từ trước khi A cài add-on
    time.sleep(1.1)
    a.first_run()
    a.state.add_coins(300)
    a.state.buy("bench")
    a.journal.update(dt.date(2026, 5, 5), {"t": "vườn thật của A"})
    blob_a, coins_a = a.blob(), a.coins()
    a.sync()
    time.sleep(1.1)
    with skew(5):
        b.first_run()                     # B: add-on chạy lần đầu trên collection cũ → vườn trống, mốc mới
    ok(S.lineage(S.snapshot(b.col)) > S.lineage(S.snapshot(a.col)), "B lập mốc sau A (hai vườn riêng trên cùng một collection)")
    b.sync()                              # B "mới hơn" → vườn trống đè máy chủ
    time.sleep(1.1)
    kind, res = a.sync()
    ok(res["action"] == S.RESTORE and "vườn mới lập" in res["why"] and a.coins() == coins_a,
       "A nhận vườn trống của B → trả lại vườn thật (" + res["why"] + ")")
    a.sync()
    time.sleep(1.1)
    kind, res = b.sync()
    ok(res["action"] == S.KEEP and b.coins() == coins_a and "vườn thật của A" in b.tokens(),
       "B đồng bộ lại → nhận vườn thật của A (" + res["why"] + ")")
    settle(a, b)
    ok(a.blob() == b.blob() and len(a.restores) == 1 and not b.restores, "hội tụ về vườn của A, không trả lại qua lại")
    a.close(), b.close()

    # =====================================================================================================================
    print("== 6. Ghi sau lần đồng bộ lúc đóng + đồng hồ máy lệch")
    user = new_user()
    a = Device("A", user)
    a.add_notes(6)
    a.first_run()
    a.sync("up")
    b = Device("B", user)
    b.sync("down")
    time.sleep(1.1)
    b.sync()
    b.state.add_coins(1)                  # B: ghi sau lần đồng bộ lúc đóng (bù xu…) — chưa đẩy lên
    time.sleep(1.1)
    a.sync()
    a.play("phiên của A sau khi B đóng", dt.date(2026, 6, 1))
    coins_a = a.coins()
    a.sync()
    time.sleep(1.1)
    kind, res = b.sync()                  # B mở lại: collection của B cũ hơn máy chủ → nhận bản của A
    ok(res["action"] == S.KEEP and b.coins() == coins_a and "phiên của A sau khi B đóng" in b.tokens(),
       "lần ghi lẻ của B không thắng phiên chơi sau đó của A (" + res["why"] + ")")
    # đồng hồ của B chậm 4 phút (Anki cho lệch tối đa 5 phút): B sửa SAU A nhưng đồng hồ B nói là trước
    time.sleep(1.1)
    with skew(-240):
        b.play("B sửa sau, đồng hồ chậm 4 phút", dt.date(2026, 6, 2))
    ra, rb = S.clean_rev(a.col.get_config(S.REV_KEY)), S.clean_rev(b.col.get_config(S.REV_KEY))
    ok(rb["t"] > ra["t"], "dấu của B vẫn lớn hơn dấu của bản nó sửa (không theo đồng hồ chậm)")
    b.sync()
    time.sleep(1.1)
    kind, res = a.sync()
    ok(res["action"] == S.KEEP and "B sửa sau, đồng hồ chậm 4 phút" in a.tokens(), "A nhận bản của B, không coi là cũ (" + res["why"] + ")")
    ok(not a.restores and not b.restores, "không lần trả lại nào")
    a.close(), b.close()

    # =====================================================================================================================
    print("== 7. Đồng bộ toàn bộ: điện thoại đổi cấu trúc (thêm trường) khi chưa đồng bộ → máy tính buộc tải về")
    user, a, p = trio()
    time.sleep(1.1)
    a.play("trước lần đồng bộ toàn bộ", dt.date(2026, 7, 1))
    a.state.buy("bench") if a.coins() >= core.CATALOG["bench"]["price"] else a.state.add_coins(100)
    blob_a, coins_a = a.blob(), a.coins()
    a.sync()
    time.sleep(1.1)
    m = p.col.models.by_name("Basic")
    p.col.models.add_field(m, p.col.models.new_field("Extra"))
    p.col.models.update_dict(m)
    kind, _ = p.sync("up")                # điện thoại: đổi cấu trúc → tải cả collection lên (cấu hình cũ)
    ok(kind == "full-up", "điện thoại tải cả collection lên (" + kind + ")")
    time.sleep(1.1)
    kind, res = a.sync("down")
    ok(kind == "full-down" and res["action"] == S.RESTORE and a.coins() == coins_a and "trước lần đồng bộ toàn bộ" in a.tokens(),
       "máy tính tải cả collection về → dữ liệu vườn được trả lại (" + res["why"] + ")")
    ok(a.col.models.by_name("Basic")["flds"][-1]["name"] == "Extra", "còn thẻ / loại note thì theo bản tải về (không đụng)")
    a.close(), p.close()

    # =====================================================================================================================
    print("== 8. Chơi vườn trước khi đăng nhập AnkiWeb; đổi sang tài khoản khác")
    user = new_user()
    p = Device("P", user, addon=False)    # người dùng điện thoại lâu năm
    p.add_notes(10)
    p.sync("up")
    a = Device("A", user)                 # máy tính mới: cài Anki + add-on, chơi vườn, rồi mới đăng nhập
    a.first_run()
    a.state.add_coins(40)
    a.journal.update(dt.date(2026, 8, 8), {"t": "chơi trước khi đăng nhập"})
    c1 = a.coins()
    kind, res = a.sync("down")            # collection máy tính trống thẻ → tải về collection của điện thoại
    ok(kind == "full-down" and a.col.note_count() == 10, "tải collection của điện thoại về (10 note)")
    ok(res["action"] == S.RESTORE and a.coins() == c1 and "chơi trước khi đăng nhập" in a.tokens(),
       "vườn chơi trước khi đăng nhập vẫn còn (" + res["why"] + ")")
    a.close(), p.close()
    # đổi tài khoản: collection khác đã có vườn riêng (lập SAU vườn của hồ sơ này — theo luật "vườn lập trước là vườn thật"
    # thì sẽ bị đè, nhưng đây là collection khác hẳn) → không đụng
    u1, u2 = new_user(), new_user()
    a = Device("A", u1)
    a.add_notes(3)
    a.first_run()
    a.state.add_coins(5)
    a.sync("up")
    time.sleep(1.1)
    x = Device("X", u2)
    x.add_notes(3)
    x.col.db.execute("update col set crt = crt - 86400 * 30")       # collection của tài khoản kia tạo từ tháng trước
    x.reopen()
    x.first_run()
    x.state.add_coins(77)
    x.sync("up")
    blob_x = x.blob()
    ok(S.lineage(S.snapshot(x.col)) > S.lineage(S.snapshot(a.col)) and S.col_ids(x.col)[0] != S.col_ids(a.col)[0],
       "tài khoản kia: collection khác (crt khác), vườn lập sau")
    a.auth = login(a.col, u2)                                             # đăng nhập tài khoản khác trên cùng hồ sơ
    before = S.before_sync(a.col, a.uf)
    a.col.close_for_full_sync()
    a.col.full_upload_or_download(auth=a.auth, server_usn=None, upload=False)
    a.col.reopen(after_full_sync=True)
    res = S.after_sync(a.col, a.uf, before)
    ok(res["action"] == S.KEEP and "collection khác" in res["why"] and a.blob() == blob_x and a.coins() == 77,
       "tài khoản khác đã có vườn → giữ vườn của tài khoản đó (" + res["why"] + ")")
    ok(a.open_profile()["action"] == S.KEEP and a.blob() == blob_x, "lần mở hồ sơ sau cũng không đụng")
    a.close(), x.close()

    # =====================================================================================================================
    print("== 9. Máy còn bản cũ (không đóng dấu) sửa ví trên bản đã có dấu")
    user = new_user()
    a = Device("A", user)
    a.add_notes(4)
    a.first_run()
    a.state.add_coins(10)
    a.sync("up")
    o = Device("O", user, guard=False)    # máy còn ≤ 1.31.1
    o.sync("down")
    time.sleep(1.1)
    w = o.col.get_config(core.CONFIG_KEY)
    w["coins"] = 777
    o.col.set_config(core.CONFIG_KEY, w)  # bản cũ ghi thẳng, không đóng dấu
    o.sync()
    time.sleep(1.1)
    kind, res = a.sync()
    ok(res["action"] == S.KEEP and a.coins() == 777, "cùng dấu, nội dung khác → nhận bản của máy cũ, không đè (" + res["why"] + ")")
    a.close(), o.close()

    # =====================================================================================================================
    print("== 10. Mở hồ sơ: đồng bộ lúc add-on tắt; khôi phục bản sao lưu của Anki")
    user, a, p = trio()
    time.sleep(1.1)
    a.play("trước chế độ an toàn", dt.date(2026, 9, 1))
    c1, blob1 = a.coins(), a.blob()
    a.sync()
    time.sleep(1.1)
    p.review(1)
    p.sync()
    time.sleep(1.1)
    a.sync(hooks=False)                   # Anki mở ở chế độ an toàn (add-on tắt) rồi đồng bộ → bản cũ về, không ai chặn
    ok(a.blob() != blob1, "add-on tắt: bản cũ của điện thoại đã vào collection")
    a.reopen()
    res = a.open_profile()
    ok(res["action"] == S.RESTORE and a.blob() == blob1 and a.coins() == c1, "lần mở hồ sơ sau (add-on bật) → trả lại (" + res["why"] + ")")
    res = a.open_profile()
    ok(res["action"] == S.KEEP, "mở lần nữa: không còn gì để trả lại")
    # chơi tiếp rồi tắt Anki không đồng bộ: lần mở sau không được coi bản mới hơn (chưa đồng bộ) là cũ
    a.play("chơi rồi tắt, chưa đồng bộ", dt.date(2026, 9, 2))
    blob2 = a.blob()
    a.reopen()
    res = a.open_profile()
    ok(res["action"] == S.KEEP and a.blob() == blob2, "bản chưa đồng bộ (mới hơn bản chụp) giữ nguyên (" + res["why"] + ")")
    # khôi phục bản sao lưu của Anki (ý người dùng): giữ bản vừa khôi phục, đóng dấu mới, máy kia cũng nhận
    a.sync()
    bak = os.path.join(a.dir, "ban_sao_luu.anki2")
    a.col.close()
    shutil.copy(os.path.join(a.dir, "collection.anki2"), bak)             # "bản sao lưu" lúc này
    a.col = Collection(os.path.join(a.dir, "collection.anki2"))
    blob_bak, coins_bak = a.blob(), a.coins()
    time.sleep(1.1)
    a.play("việc làm sau bản sao lưu (sẽ bỏ)", dt.date(2026, 9, 3))
    a.sync()
    b = Device("B", user)
    b.sync("down")
    ok("việc làm sau bản sao lưu (sẽ bỏ)" in b.tokens(), "máy B đang có bản mới nhất")
    a.col.close()
    shutil.copy(bak, os.path.join(a.dir, "collection.anki2"))             # File → Switch Profile → Open Backup
    a.col = Collection(os.path.join(a.dir, "collection.anki2"))
    res = a.open_profile(restoring_backup=True)
    ok(res["action"] == S.KEEP and a.blob() == blob_bak and a.coins() == coins_bak,
       "vừa khôi phục bản sao lưu → giữ bản vừa khôi phục, không tự kéo bản mới về (" + res["why"] + ")")
    rb = S.clean_rev(b.col.get_config(S.REV_KEY))
    ok(S.clean_rev(a.col.get_config(S.REV_KEY))["t"] > rb["t"], "bản vừa khôi phục được đóng dấu mới hơn mọi bản đã có")
    a.reopen()
    ok(a.open_profile()["action"] == S.KEEP and a.blob() == blob_bak, "lần mở kế tiếp cũng giữ bản đã khôi phục")
    time.sleep(1.1)
    a.sync()
    time.sleep(1.1)
    kind, res = b.sync()
    ok(res["action"] == S.KEEP and b.blob() == blob_bak, "máy B đồng bộ → cũng về bản đã khôi phục")
    a.close(), b.close(), p.close()

    # =====================================================================================================================
    print("== 11a. Ngẫu nhiên: một máy tính + điện thoại đồng bộ bừa → không lần ghi nào của máy tính bị mất")
    for seed in (11, 23, 37):
        rnd = random.Random(seed)
        user, a, p = trio(notes=40)
        toks, total, n = set(), a.coins(), 0
        for step in range(28):
            time.sleep(1.05)
            act = rnd.choice(["session", "session", "phone_dirty", "phone_dirty", "phone_clean", "a_sync"])
            if act == "session":
                if rnd.random() < 0.8:
                    a.sync()
                for _ in range(rnd.randint(1, 3)):
                    n += 1
                    tok = f"s{seed}-{n}"
                    a.play(tok, dt.date(2026, 1, 1) + dt.timedelta(days=n))
                    toks.add(tok)
                    total += 10
                if rnd.random() < 0.8:
                    a.sync()
            elif act == "phone_dirty":
                p.review(rnd.randint(1, 2))
                p.sync()
            elif act == "phone_clean":
                p.sync()
                p.review(1)
                p.sync()
            else:
                a.sync()
            if a.tokens() != toks or a.coins() != total:
                break
        ok(a.tokens() == toks and a.coins() == total,
           f"hạt {seed}: sau {step + 1} bước máy tính còn đủ {len(toks)} dòng nhật ký, {total} xu ({len(a.restores)} lần trả lại)")
        settle(a)
        time.sleep(1.05)
        p.sync()
        ok(S.digest(S.snapshot(p.col)) == a.blob(), f"hạt {seed}: điện thoại đồng bộ sạch → cùng bản với máy tính")
        ok(a.col.db.scalar("select count() from revlog") == p.col.db.scalar("select count() from revlog"), f"hạt {seed}: lượt ôn hai bên bằng nhau")
        a.close(), p.close()

    print("== 11b. Ngẫu nhiên: hai máy tính dùng đúng cách + điện thoại đồng bộ sạch → không mất gì, không lần trả lại nào")
    for seed in (5, 17):
        rnd = random.Random(seed)
        user, a, p = trio(notes=40)
        b = Device("B", user)
        b.sync("down")
        toks, total, n = set(), a.coins(), 0
        for step in range(20):
            time.sleep(1.05)
            act = rnd.choice(["A", "B", "phone"])
            if act == "phone":
                p.sync()
                p.review(1)
                p.sync()
                continue
            dev = a if act == "A" else b
            dev.sync()
            if dev.tokens() != toks or dev.coins() != total:
                break
            for _ in range(rnd.randint(1, 2)):
                n += 1
                tok = f"t{seed}-{n}"
                dev.play(tok, dt.date(2026, 1, 1) + dt.timedelta(days=n))
                toks.add(tok)
                total += 10
            dev.sync()
        settle(a, b)
        ok(a.tokens() == toks and b.tokens() == toks and a.coins() == total and b.coins() == total and a.blob() == b.blob(),
           f"hạt {seed}: hai máy đủ {len(toks)} dòng nhật ký, {total} xu")
        ok(not a.restores and not b.restores, f"hạt {seed}: không lần trả lại nào")
        a.close(), b.close(), p.close()

    print("== 11c. Ngẫu nhiên: hai máy tính + điện thoại đồng bộ bừa → không lỗi, hội tụ, không trả lại qua lại mãi")
    for seed in (3, 29):
        rnd = random.Random(seed)
        user, a, p = trio(notes=40)
        b = Device("B", user)
        b.sync("down")
        n, err = 0, None
        try:
            for step in range(30):
                time.sleep(1.05)
                act = rnd.choice(["A", "B", "A_nosync", "B_nosync", "phone_dirty", "phone_dirty", "phone_clean"])
                if act.startswith("phone"):
                    if act == "phone_clean":
                        p.sync()
                    p.review(1)
                    p.sync()
                    continue
                dev = a if act[0] == "A" else b
                if not act.endswith("nosync"):
                    dev.sync()
                n += 1
                dev.play(f"c{seed}-{n}", dt.date(2026, 1, 1) + dt.timedelta(days=n))
                if not act.endswith("nosync") or rnd.random() < 0.5:
                    dev.sync()
        except Exception as e:      # noqa: BLE001
            err = repr(e)
        ok(err is None, f"hạt {seed}: 30 bước không lỗi" + (f" — {err}" if err else ""))
        for _ in range(4):
            time.sleep(1.05)
            a.sync()
            time.sleep(1.05)
            b.sync()
        r0 = (len(a.restores), len(b.restores))
        for _ in range(3):
            time.sleep(1.05)
            a.sync()
            time.sleep(1.05)
            b.sync()
        ok(a.blob() == b.blob(), f"hạt {seed}: hai máy hội tụ về cùng một bản ({len(a.tokens())}/{n} dòng nhật ký còn — hai máy cùng sửa khi chưa đồng bộ thì bản sau thắng)")
        ok((len(a.restores), len(b.restores)) == r0, f"hạt {seed}: đã yên thì đồng bộ thêm không còn lần trả lại nào (A {r0[0]}, B {r0[1]})")
        ok(a.state.load()["coins"] >= 0 and isinstance(a.state.load()["home"], dict), f"hạt {seed}: ví đọc được bình thường")
        a.close(), b.close(), p.close()

finally:
    SERVER.terminate()
    try:
        SERVER.wait(5)
    except Exception:
        SERVER.kill()
    shutil.rmtree(TMP, ignore_errors=True)

print("KẾT QUẢ: " + ("TẤT CẢ OK" if not FAIL else f"{len(FAIL)} LỖI"))
for f in FAIL:
    print("   ✗ " + f)
sys.exit(1 if FAIL else 0)
