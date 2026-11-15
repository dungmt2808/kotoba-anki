""""Máy khác" cho test đồng bộ (1.31.2): một collection Anki riêng (điện thoại / máy tính thứ hai không có add-on) nối với
máy chủ đồng bộ thật của Anki chạy cục bộ (`python -m anki.syncserver`).

    may_khac.py THƯ_MỤC ENDPOINT LỆNH [LỆNH…]      (cần python có gói anki)

Lệnh (chạy lần lượt, in một dòng JSON kết quả):
    sync            đồng bộ thường (cần full sync: tải về nếu collection máy này trống, không thì tải lên)
    sync:down       như trên nhưng full sync thì luôn tải về
    review[:N]      ôn N thẻ (mặc định 1), chấm Được — như ôn trên điện thoại
    get:KHOÁ        đọc một khoá cấu hình collection
    set:KHOÁ=JSON   ghi một khoá cấu hình (máy khác có add-on bản cũ / thứ khác ghi cấu hình)
    keys            các khoá kotoba_batake_* đang có
    schema          đổi cấu trúc (thêm một trường) — lần đồng bộ sau phải đồng bộ toàn bộ
    touch           đổi collection mà không đụng add-on (đổi tuỳ chọn của Anki) — như điện thoại chỉnh cài đặt
"""
import json
import os
import sys

for _k in ("HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy", "ALL_PROXY", "all_proxy"):
    os.environ.pop(_k, None)
os.environ["NO_PROXY"] = "127.0.0.1,localhost"

from anki.collection import Collection  # noqa: E402


def sync(col, auth, down=False):
    out = col.sync_collection(auth, False)
    if out.required in (out.FULL_SYNC, out.FULL_DOWNLOAD, out.FULL_UPLOAD):
        empty = not col.db.scalar("select count() from cards")
        up = out.required == out.FULL_UPLOAD or (out.required == out.FULL_SYNC and not down and not empty)
        if out.required == out.FULL_DOWNLOAD:
            up = False
        col.close_for_full_sync()
        col.full_upload_or_download(auth=auth, server_usn=None, upload=up)
        col.reopen(after_full_sync=True)
        return "full-up" if up else "full-down"
    return "normal"


def main():
    folder, endpoint, cmds = sys.argv[1], sys.argv[2], sys.argv[3:]
    os.makedirs(folder, exist_ok=True)
    col = Collection(os.path.join(folder, "collection.anki2"))
    out = []
    try:
        auth = col.sync_login(username="u", password="p", endpoint=endpoint)
        if not getattr(auth, "endpoint", ""):       # Anki 23.10: auth trả về không kèm địa chỉ máy chủ (mặc định AnkiWeb)
            auth.endpoint = endpoint
        for cmd in cmds:
            if cmd in ("sync", "sync:down"):
                out.append(sync(col, auth, cmd == "sync:down"))
            elif cmd.startswith("review"):
                n = int(cmd.split(":", 1)[1]) if ":" in cmd else 1
                done = 0
                for d in col.decks.all_names_and_ids():      # deck đầu tiên có thẻ (deck hiện tại có thể trống)
                    if col.db.scalar("select count() from cards where did = ? and queue >= 0", d.id):
                        col.decks.select(d.id)
                        break
                for _ in range(n):
                    q = col.sched.get_queued_cards(fetch_limit=1)
                    if not q.cards:
                        break
                    top = q.cards[0]
                    card = col.get_card(top.card.id)
                    card.start_timer()
                    col.sched.answer_card(col.sched.build_answer(card=card, states=top.states, rating=2))
                    done += 1
                out.append(done)
            elif cmd.startswith("get:"):
                out.append(col.get_config(cmd[4:], None))
            elif cmd.startswith("set:"):
                key, raw = cmd[4:].split("=", 1)
                col.set_config(key, json.loads(raw))
                out.append(True)
            elif cmd == "keys":
                out.append(sorted(k for k in col.all_config() if k.startswith("kotoba_batake")))
            elif cmd == "schema":       # đổi cấu trúc (thêm trường vào loại note đầu tiên) → lần đồng bộ sau là đồng bộ toàn bộ
                m = col.models.all()[0]
                col.models.add_field(m, col.models.new_field("Them_%d" % len(m["flds"])))
                col.models.update_dict(m)
                out.append(True)
            elif cmd == "touch":
                col.set_config("kb_test_may_khac", col.get_config("kb_test_may_khac", 0) + 1)
                out.append(True)
            else:
                raise SystemExit("lệnh lạ: " + cmd)
    finally:
        col.close()
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()
