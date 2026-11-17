"""1.31.5: Gemini THẬT nhiều ngày liền cho truyện chung + Sổ tay làng (đúng luồng add-on: ensure_master rồi ghi kỳ vào bộ
nhớ như báo làm). Ghi model của từng lượt gọi, điểm biên tập, sự kiện sổ tay; in cả truyện ra OUT/truyen.md để đọc.

Chạy:  KB_STREAM=1 ${ANKI_PY} tests/gemini/run_so_tay.py ADDON OUT [--start 2026-11-01] [--days 9] [--gap 6:4]
                                                           [--tones bi_an,am]
       --gap 6:4 = sau ngày viết thứ 6 nghỉ 4 ngày (thử "đã N ngày trôi qua"). Dùng khoá TEST (không tốn lượt báo của người
       dùng): proxy chèn khoá thì không cần GEMINI_API_KEY. Mỗi ngày ~2–3 lượt (lập mạch ~1 lần / đợt)."""
import argparse, datetime, json, os, re, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import _setup

ap = argparse.ArgumentParser()
ap.add_argument("addon"); ap.add_argument("out")
ap.add_argument("--start", default="2026-11-01"); ap.add_argument("--days", type=int, default=9)
ap.add_argument("--gap", default="6:4"); ap.add_argument("--tones", default="bi_an,am")
a = ap.parse_args()
ai = _setup.load(a.addon)
import story_core as S   # noqa: E402

sh = os.path.join(a.out, "bao_chung")
os.makedirs(sh, exist_ok=True)
client = ai.Gemini(_setup.key())
calls: list[tuple[str, str, str]] = []
_gen = client.generate


def gen(model, system, prompt, schema=None, *k, **kw):
    kind = ("lap_mach" if schema is S.ARC_SCHEMA else "nha_van" if schema is S.MASTER_SCHEMA else
            "bien_tap" if schema is S.EDIT_SCHEMA else "khac")
    try:
        out = _gen(model, system, prompt, schema, *k, **kw)
        calls.append((kind, model, "ok"))
        return out
    except ai.AIError as e:
        calls.append((kind, model, e.kind))
        raise


client.generate = gen
after, rest = (int(x) for x in a.gap.split(":")) if a.gap else (0, 0)
d = datetime.date.fromisoformat(a.start)
days, md = [], ["# Truyện chung — Gemini thật %d ngày (1.31.5, Sổ tay làng)\n" % a.days]
for n in range(a.days):
    if after and n == after:
        d += datetime.timedelta(days=rest)
    date = d.isoformat()
    n0, t0 = len(calls), time.time()
    m, log = ai.ensure_master(client, sh, date, {"story": "hay", "tones": a.tones.split(","), "thoi_tiet": "sáng nắng nhẹ, chiều nhiều mây"})
    row = {"ngay": date, "giay": round(time.time() - t0, 1), "luot": calls[n0:], "buoc": [x.get("buoc") for x in log]}
    if m and m.get("truyen"):
        t = m["truyen"]
        S.save_episode(sh, date, m["ky"], {"doan": t["doan"], "nho": t.get("nho") or {}, "diem": t.get("diem") or {}},
                       t.get("tieu_de") or "")
        row.update(ky=m["ky"], tieu_de=t["tieu_de"], tom_tat=(t.get("nho") or {}).get("tom_tat", ""), diem=t.get("diem"),
                   ngoac_kep=bool(re.search(r'["“”]', "".join(t["doan"]))),
                   so_tay=[x for x in log if str(x.get("buoc", "")).startswith("so_tay")])
        arc = S.load_arc(sh) or {}
        md.append("## Kỳ %d — %s (%s)\n\n*Đợt «%s»*\n\n%s\n\n%s\n" % (
            m["ky"], t["tieu_de"], date, arc.get("ten", ""), "\n\n".join(t["doan"]),
            "Tin làng: " + " · ".join(x.get("tieu_de", "") for x in m.get("tin") or [])))
    days.append(row)
    print(json.dumps({k: v for k, v in row.items() if k not in ("luot", "tom_tat", "diem")}, ensure_ascii=False), "| lượt:",
          [(k, mo.replace("gemini-", ""), r) for k, mo, r in row["luot"]], flush=True)
    d += datetime.timedelta(days=1)
nb = S.load_notebook(sh)
md.append("## Sổ tay làng sau %d ngày\n\n```json\n%s\n```\n" % (a.days, json.dumps(nb, ensure_ascii=False, indent=1)))
open(os.path.join(a.out, "truyen.md"), "w", encoding="utf-8").write("\n".join(md))
json.dump({"ngay": days, "so_tay": nb, "tong_luot": len(calls),
           "theo_model": {mo: sum(1 for _k, x, r in calls if x == mo and r == "ok") for mo in sorted({x for _k, x, _r in calls})}},
          open(os.path.join(a.out, "ket_qua.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("TỔNG:", len(calls), "lượt;", {mo: sum(1 for _k, x, r in calls if x == mo and r == "ok") for mo in sorted({x for _k, x, _r in calls})})
