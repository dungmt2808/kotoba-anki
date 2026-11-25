"""Trang web chung (site/) — phần Python, không cần trình duyệt:
  - site/tools/them_ma.py: thêm / gỡ / trùng / mã hỏng, làm sạch tên người vẽ + ghi chú, đọc biểu mẫu issue (mã xuống dòng,
    trong khối ```), chế độ GitHub Actions (nhãn khác bỏ qua, nhãn `duyet` thêm + lời trả lời, mã hỏng trả lý do, chạy tay),
    tên trong lời trả lời bọc `…` (không gọi nhầm "@ai đó").
  - Dữ liệu của trang khớp add-on: hinh.json / thong_tin.json đúng bản trong manifest (quên chạy xuat_hinh.js sau khi đổi
    hình là báo), email liên hệ = CONTACT_EMAIL, mọi file PNG được dùng đều có và không thừa, mọi mã trong cong_dong.json
    vẫn qua được kiểm tra của add-on và phần "xem" đúng như add-on đọc.
  - Hai workflow: nhãn duyệt khớp them_ma.LABEL, không chèn nội dung người gửi vào lệnh shell.
  - (1.36.2) su_kien.json = le_core (ngày, luật, 24 ngăn, câu chúc, khung, mã thiệp), không ghi món trong hộp quà bí mật; Kho hình
    đánh dấu đúng các món đó; đủ hình sticker để vẽ thiệp; thiệp mẫu đọc được bằng add-on.
Chạy: python3 tests/trang/test_trang.py [ADDON]
"""
from __future__ import annotations

import datetime as dt
import json
import os
import re
import subprocess
import sys
import tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ADDON = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(ROOT, "kotoba_batake")
SITE = os.path.join(ROOT, "site")
sys.path.insert(0, os.path.join(SITE, "tools"))
import them_ma as t  # noqa: E402

core = t.core
results: list[bool] = []


def ok(c: bool, m: str) -> None:
    results.append(bool(c))
    print(("  ✓ " if c else "  ✗ ") + m)


def codes() -> list[dict]:
    out = subprocess.run([sys.executable, os.path.join(ROOT, "tests", "trang", "ma_thu.py"), ADDON, "9"],
                         capture_output=True, text=True, check=True).stdout
    return json.loads(out)


print("== them_ma: thêm / gỡ")
cs = codes()
good = [c for c in cs if c["ok"] and c["nhan"].startswith("đúng")]
bad = [c for c in cs if not c["ok"]]
d = {"v": 1, "ma": []}
e = t.add(d, good[0]["code"], "  Mai   Anh ", "<b>đẹp</b>", "#3", dt.date(2026, 11, 15))
ok(e["id"].startswith(good[0]["ok"]["t"] + "-") and len(e["id"]) == 10, "id = loại + 8 ký tự băm (" + e["id"] + ")")
ok(e["xem"] == good[0]["ok"], "phần xem = đúng kết quả add-on đọc mã")
ok(e["tac_gia"] == "Mai Anh" and e["ghi_chu"] == "bđẹp/b" and e["ngay"] == "2026-11-15" and e["nguon"] == "#3",
   "làm sạch tên / ghi chú như add-on (bỏ < > & ' \" `), ngày, nguồn")
e2 = t.add(d, "\n".join(good[1]["code"][i:i + 40] for i in range(0, len(good[1]["code"]), 40)) + "  ")
ok(e2["tac_gia"] == "Ẩn danh" and e2["ma"] == good[1]["code"], "mã xuống dòng / dấu cách được nối lại; không tên = Ẩn danh")
try:
    t.add(d, good[0]["code"])
    ok(False, "mã trùng bị từ chối")
except t.MaError as err:
    ok("đã có" in str(err), "mã trùng bị từ chối (" + str(err) + ")")
rej = 0
for c in bad:
    try:
        t.add(d, c["code"])
    except t.MaError as err:
        rej += str(err) == c["err"]
ok(rej == len(bad), f"mọi mã hỏng bị từ chối đúng câu của add-on ({rej}/{len(bad)})")
ok(len(d["ma"]) == 2, "mã hỏng không lọt vào danh sách")
gone = t.remove(d, e["id"])
ok(gone["id"] == e["id"] and len(d["ma"]) == 1, "gỡ theo id")
try:
    t.remove(d, "m-00000000")
    ok(False, "gỡ id không có báo lỗi")
except t.MaError:
    ok(True, "gỡ id không có báo lỗi")
with tempfile.TemporaryDirectory() as tmp:
    p = os.path.join(tmp, "cd.json")
    t.save(d, p)
    ok(t.load(p) == d, "lưu rồi đọc lại y nguyên (UTF-8, tiếng Việt giữ nguyên)")
    with open(p, "w", encoding="utf-8") as f:
        f.write("{hỏng")
    try:
        t.load(p)
        ok(False, "file hỏng → báo lỗi, không ghi đè mất mã đã đăng")
    except json.JSONDecodeError:
        ok(True, "file hỏng → báo lỗi, không ghi đè mất mã đã đăng")
    ok(t.load(os.path.join(tmp, "chua_co.json")) == {"v": 1, "ma": []}, "chưa có file → danh sách rỗng")

print("== biểu mẫu issue")
code = good[2]["code"]
wrapped = "\n".join(code[i:i + 50] for i in range(0, len(code), 50))
body = (f"### Mã thiết kế\n\n{wrapped}\n\n### Tên hiển thị\n\nHana\n\n### Ghi chú\n\n_No response_\n\n"
        "### Đồng ý\n\n- [X] Tớ tự vẽ thiết kế này")
f = t.form_fields(body)
ok(f["Tên hiển thị"] == "Hana" and f["Ghi chú"] == "" and t.code_in(f["Mã thiết kế"]).split() != [], "đọc các ô; _No response_ = rỗng")
c2, a2, n2, s2 = t.from_issue({"issue": {"number": 12, "body": body}})
ok("".join(c2.split()) == code and a2 == "Hana" and s2 == "#12", "mã bị xuống dòng trong issue vẫn ra đủ")
c3 = t.from_issue({"issue": {"number": 1, "body": "### Mã thiết kế\n\n```text\n" + code + "\n```\n\n### Tên hiển thị\n\nA"}})[0]
ok("".join(c3.split()) == code, "mã trong khối ``` vẫn đọc được")
c4 = t.from_issue({"issue": {"number": 1, "body": "mã đây: " + code + " cảm ơn"}})[0]
ok("".join(c4.split()).startswith(code), "issue không theo mẫu: vẫn tìm thấy đoạn KB1:")


def run_gh(name: str, event: dict | None, env: dict | None = None) -> tuple[dict, dict]:
    with tempfile.TemporaryDirectory() as tmp:
        data = os.path.join(tmp, "cd.json")
        t.save({"v": 1, "ma": []}, data)
        outp = os.path.join(tmp, "out")
        e = dict(os.environ, GITHUB_EVENT_NAME=name, GITHUB_OUTPUT=outp, GITHUB_REPOSITORY="dungmt2808/kotoba-anki", **(env or {}))
        if event is not None:
            ev = os.path.join(tmp, "ev.json")
            with open(ev, "w", encoding="utf-8") as fh:
                json.dump(event, fh)
            e["GITHUB_EVENT_PATH"] = ev
        old = os.environ.copy()
        os.environ.clear()
        os.environ.update(e)
        t.DATA = data
        try:
            t.run_github()
        finally:
            os.environ.clear()
            os.environ.update(old)
        with open(outp, encoding="utf-8") as fh:
            raw = fh.read()
        outs = dict(re.findall(r"(\w+)<<__KB_EOF__\n(.*?)\n__KB_EOF__\n", raw, re.S))
        return outs, t.load(data)


print("== GitHub Actions")
o, dd = run_gh("issues", {"label": {"name": "chia-se"}, "issue": {"number": 5, "body": body}})
ok(o.get("ok") == "0" and not dd["ma"], "nhãn khác `duyet`: không làm gì")
o, dd = run_gh("issues", {"label": {"name": "duyet"}, "issue": {"number": 5, "body": body.replace("Hana", "@octocat")}})
ok(o.get("ok") == "1" and len(dd["ma"]) == 1 and dd["ma"][0]["nguon"] == "#5", "nhãn `duyet`: thêm mã, ghi nguồn #5")
ok("`@octocat`" in o.get("msg", "") and "github.io/kotoba-anki/#ma/" + dd["ma"][0]["id"] in o.get("msg", ""),
   "lời trả lời: tên bọc `…` (không gọi nhầm người) + đường dẫn tới mã trên trang")
o, dd = run_gh("issues", {"label": {"name": "duyet"}, "issue": {"number": 6, "body": body.replace(wrapped[:20], wrapped[:19] + "!")}})
ok(o.get("ok") == "0" and "Chưa đăng được" in o.get("msg", "") and "`duyet`" in o.get("msg", "") and not dd["ma"],
   "mã hỏng: không thêm, trả lời lý do + cách gắn lại nhãn")
o, dd = run_gh("workflow_dispatch", None, {"MA": good[3]["code"], "TAC_GIA": "Tớ", "GHI_CHU": ""})
ok(o.get("ok") == "1" and dd["ma"][0]["tac_gia"] == "Tớ" and dd["ma"][0]["nguon"] == "tay", "chạy tay (Run workflow): thêm mã")
o, dd = run_gh("workflow_dispatch", None, {"MA": "", "TAC_GIA": "", "GHI_CHU": ""})
ok(o.get("ok") == "0" and "KB1" in o.get("msg", ""), "chạy tay không có mã: báo thiếu mã")

print("== dữ liệu của trang khớp add-on")
with open(os.path.join(ADDON, "manifest.json"), encoding="utf-8") as fh:
    ver = json.load(fh)["human_version"]
with open(os.path.join(SITE, "data", "hinh.json"), encoding="utf-8") as fh:
    hinh = json.load(fh)
with open(os.path.join(SITE, "data", "thong_tin.json"), encoding="utf-8") as fh:
    info = json.load(fh)
ok(hinh["version"] == ver and info["version"] == ver,
   f"hình xuất từ bản {hinh['version']}, add-on {ver}" + ("" if hinh["version"] == ver else " — chạy lại: node site/tools/xuat_hinh.js"))
with open(os.path.join(ADDON, "__init__.py"), encoding="utf-8") as fh:
    mail = re.search(r'^CONTACT_EMAIL\s*=\s*"([^"]+)"', fh.read(), re.M)
ok(mail and info["contact"] == mail.group(1), "email liên hệ của trang = CONTACT_EMAIL của add-on")
ok(info["craft"]["palette"] == core.CRAFT_PALETTE and {int(k): v for k, v in info["craft"]["prices"].items()} == core.CRAFT_PRICES,
   "bảng màu + giá Xưởng của trang = add-on")
used = set()
n_items = 0
for g in hinh["groups"]:
    for it in g["items"]:
        n_items += 1
        if "img" in it:
            used.add(it["img"]["src"])
        else:
            rows = list(it["frames"].values())
            good_rows = all(len(r) == it["h"] and all(len(x) == it["w"] for x in r) for r in rows[:1]) and rows
            chars = {ch for r in rows for x in r for ch in x if ch != "."}
            if not good_rows or not chars <= set(it["pal"]):
                ok(False, "hình hỏng: " + g["id"] + "/" + it["id"])
files = set()
for base, _, names in os.walk(os.path.join(SITE, "hinh")):
    for n in names:
        files.add(os.path.relpath(os.path.join(base, n), SITE).replace(os.sep, "/"))
ok(used <= files, f"mọi ảnh PNG được dùng đều có ({len(used)})")
ok(files <= used, "không có ảnh PNG thừa" + ("" if files <= used else ": " + ", ".join(sorted(files - used)[:5])))
ok(n_items > 300 and len(hinh["groups"]) >= 16, f"{n_items} hình, {len(hinh['groups'])} nhóm")
cd = t.load(os.path.join(SITE, "data", "cong_dong.json"))
okc = 0
for e in cd["ma"]:
    try:
        okc += t.check(e["ma"]) == e["xem"]
    except t.MaError:
        pass
ok(okc == len(cd["ma"]), f"mọi mã đã đăng vẫn hợp lệ và phần xem đúng ({okc}/{len(cd['ma'])})")
ok(len({e["id"] for e in cd["ma"]}) == len(cd["ma"]), "id không trùng")

print("== Giáng sinh 2026 (su_kien.json) khớp add-on")
sys.path.insert(0, ADDON)
import le_core  # noqa: E402
with open(os.path.join(SITE, "data", "su_kien.json"), encoding="utf-8") as fh:
    ev = json.load(fh)
ok(ev["version"] == ver and ev["first"] == le_core.FIRST.isoformat() and ev["end"] == le_core.END.isoformat()
   and ev["box_day"] == le_core.BOX_DAY.isoformat() and ev["eve"] == le_core.EVE.isoformat(timespec="minutes")
   and ev["pre_from"] == le_core.PRE_FROM.isoformat(), "ngày của sự kiện = le_core (" + ev["first"] + " → " + ev["end"] + ", hộp quà " + ev["box_day"] + ")")
ok(ev["makeup_per"] == le_core.MAKEUP_PER and ev["makeup_max"] == le_core.MAKEUP_MAX and ev["fix_per_day"] == le_core.FIX_PER_DAY
   and ev["cards"] == le_core.CARDS_MAX and ev["code"]["prefix"] == le_core.CODE_PREFIX and ev["code"]["max"] == le_core.CODE_MAX,
   "luật mở bù / nhờ sửa / số thiệp / mã thiệp = le_core")
ok(len(ev["doors"]) == le_core.DOORS_N and all(ev["doors"][d - 1]["kind"] == le_core.DOORS[d]["kind"] for d in le_core.DOORS)
   and all(ev["doors"][d - 1].get("name") == le_core.DOORS[d]["name"] for d in le_core.DOORS if le_core.DOORS[d]["kind"] != "qua"),
   "24 ngăn đúng nhóm, đúng tên (trừ hộp quà bí mật)")
secret = [i for d in le_core.DOORS.values() if d["kind"] == "qua" for i in (d.get("item") or {})]
names = {it["id"]: it["name"] for g in hinh["groups"] for it in g["items"]}
blob = json.dumps({k: v for k, v in ev.items() if k not in ("stickers",)}, ensure_ascii=False)
ok(secret and not any(i in blob or names.get(i, "@") in blob for i in secret) and all(set(x) == {"kind"} for x in ev["doors"] if x["kind"] == "qua"),
   "su_kien.json không ghi món trong hộp quà bí mật (chỉ có hình trong bộ sticker để vẽ thiệp)")
gs = next(g for g in hinh["groups"] if g["id"] == "giang_sinh")
ok(sorted(it["id"] for it in gs["items"] if it.get("secret") == le_core.BOX_DAY.isoformat()) == sorted(secret),
   "Kho hình đánh dấu đúng " + str(len(secret)) + " món trong hộp quà (che tới " + le_core.BOX_DAY.isoformat() + ")")
ok(ev["chuc"] == le_core.CHUC and [f["id"] for f in ev["frames"]] == list(le_core.FRAMES), "câu chúc 7 tiếng + 4 khung = le_core")
need = {"xmastree", "presents", "yukidaruma", "wreath", "sleigh", le_core.TULICH} | {i for d in le_core.DOORS.values() for i in (d.get("item") or {})}
chars = {ch for rows in ev["stickers"].values() for r in rows for ch in r if ch != "."}
ok(need <= set(ev["stickers"]) and chars <= set(ev["pal"]) and ev["stackchan"]["rows"], f"hình sticker: {len(ev['stickers'])} hình, đủ màu, có StackChan đội mũ Noel")
ok(le_core.decode_card(ev["sample"]) is not None, "thiệp mẫu đọc được bằng add-on")
with open(os.path.join(SITE, "index.html"), encoding="utf-8") as fh:
    html = fh.read()
with open(os.path.join(SITE, "app.js"), encoding="utf-8") as fh:
    app_src = fh.read()
ok('<script src="thiep.js"></script>' in html and 'data-tab="giang-sinh"' in html and "data/su_kien.json" in app_src,
   "trang nạp thiep.js, có mục Giáng sinh 2026")

print("== workflow")
wf = os.path.join(ROOT, ".github", "workflows")
with open(os.path.join(wf, "dang_ma.yml"), encoding="utf-8") as fh:
    dang = fh.read()
with open(os.path.join(wf, "trang_web.yml"), encoding="utf-8") as fh:
    web = fh.read()
ok(f"github.event.label.name == '{t.LABEL}'" in dang and f"--remove-label {t.LABEL}" in dang, "nhãn duyệt trong workflow = them_ma.LABEL")
unsafe = []
for name, text in (("dang_ma.yml", dang), ("trang_web.yml", web)):
    for line in text.splitlines():
        if "${{" in line and not re.match(r"^\s*(-\s+)?[A-Za-z_][\w-]*:\s", line):
            unsafe.append(name + ": " + line.strip())
ok(not unsafe, "không chèn ${{ … }} vào lệnh shell (nội dung người gửi chỉ qua biến môi trường)" + ("" if not unsafe else ": " + unsafe[0]))
ok("uses: ./.github/workflows/trang_web.yml" in dang and "workflow_call:" in web, "đăng mã xong gọi thẳng workflow đưa trang lên")
ok("rm -rf _site/tools" in web, "trang đưa lên không kèm thư mục công cụ")
with open(os.path.join(SITE, "app.js"), encoding="utf-8") as fh:
    app = fh.read()
ok(os.path.isfile(os.path.join(ROOT, ".github", "ISSUE_TEMPLATE", re.search(r'ISSUE_TEMPLATE = "([^"]+)"', app).group(1))),
   "nút Gửi qua GitHub trỏ đúng file mẫu issue")

print(f"KẾT QUẢ: {sum(results)}/{len(results)}" + (" — TẤT CẢ OK" if all(results) else " — CÓ LỖI"))
sys.exit(0 if all(results) else 1)
