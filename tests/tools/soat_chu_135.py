"""soat_chu_135.py [ADDON] — soát chính tả chữ tiếng Đức / tiếng Pháp của "Ngôn ngữ trong vườn" (lang_core.EU, GAMES, ASK)
bằng từ điển hunspell de_DE / fr (apt-get install hunspell hunspell-de-de hunspell-fr), ghi bảng đối chiếu đóng băng
tests/fixtures/chu_135_ref.json để core/test_135.py chạy không cần hunspell. Thêm / sửa chữ ở lang_core thì chạy lại."""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ADDON = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "kotoba_batake"))
sys.path.insert(0, ADDON)
import lang_core as L  # noqa: E402

WORD = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿŒœß]+(?:[-'][A-Za-zÀ-ÖØ-öø-ÿŒœß]+)*")


def words(lang: str) -> list[str]:
    out = set()
    for tb in L.EU[lang].values():
        for v in tb.values():
            out.update(WORD.findall(v))
    for g in L.GAMES.values():
        out.update(WORD.findall(g[lang]))
    for a in L.ASK[lang]:
        out.update(WORD.findall(a))
    return sorted(out)


ref = {}
for lang, dic in (("de", "de_DE"), ("fr", "fr")):
    ws = words(lang)
    r = subprocess.run(["hunspell", "-i", "utf-8", "-d", dic, "-l"], input="\n".join(ws), capture_output=True, text=True,
                       check=True)
    bad = set(r.stdout.split())
    ref[lang] = {"dic": dic, "ok": [w for w in ws if w not in bad], "unknown": sorted(bad)}
    print(lang, len(ws), "từ, từ điển không có:", sorted(bad))
out = os.path.join(HERE, "..", "fixtures", "chu_135_ref.json")
with open(out, "w", encoding="utf-8") as f:
    json.dump(ref, f, ensure_ascii=False, indent=1)
print("→", os.path.relpath(out))
