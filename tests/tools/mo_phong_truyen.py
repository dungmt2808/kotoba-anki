"""Mô phỏng trí nhớ truyện dài kỳ 365 kỳ bằng mã thật của story_core (16/11, người dùng hỏi: báo viết 1 tháng, 3 tháng,
1 năm thì câu chuyện có liền mạch không). Gemini giả: mỗi đợt một nhân vật phụ NV<đợt>, mỗi đợt kết bằng sợi chỉ SC<đợt>.
In ra: lúc lập đợt mới Gemini thấy những kỳ / nhân vật / sợi chỉ nào (1.31.5: cả Sổ tay làng); sau kỳ 30 / 90 / 365 truyen.json còn giữ gì và nhà
văn viết kỳ kế tiếp thấy gì. Không gọi mạng.
Chạy: ${ANKI_PY} tests/tools/mo_phong_truyen.py [THƯ_MỤC_ADD_ON]   (cần gói anki vì story_core nạp paper_core → garden_core)
"""
import os, sys, json, re, tempfile
sys.path.insert(0, os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "kotoba_batake"))
import story_core as S

base = tempfile.mkdtemp(prefix="truyen_")
arc = None
CHAR = {}          # nhân vật phụ của từng đợt
for ky in range(1, 366):
    if S.arc_step(arc, ky) is None:            # hết đợt → lập đợt mới (như run())
        if arc and hasattr(S, "note_arc_done"):    # 1.31.5: Sổ tay làng (máy ghi khi hết đợt)
            S.note_arc_done(base, arc, ky - 1, S.load_story(base))
            S.note_facts(base, ["sự thật của đợt %d" % arc["dot"]])
        dot = (arc or {}).get("dot", 0) + 1
        CHAR[dot] = "NV%d" % dot
        arc = {"ten": "Đợt %d" % dot, "muc_tieu": "m", "bi_an": "b", "nhan_vat_phu": CHAR[dot],
               "buoc": ["bước %d" % i for i in range(7)], "ket": "kết đợt %d, để lại sợi chỉ SC%d" % (dot, dot),
               "tu_ky": ky, "giong": "am", "dot": dot}
        S._write(os.path.join(base, S.ARC_FILE), arc)
        # lời nhắc lập mạch của đợt này
        if dot in (5, 14, 53):
            story = S.load_story(base)
            p = S.arc_prompt("vi", "am", story, ky, "mùa", ["am"], S.notebook_for_arc(base)) if hasattr(S, "notebook_for_arc") \
                else S.arc_prompt("vi", "am", story, ky, "mùa", ["am"])
            seen = sorted(set(int(x) for x in re.findall(r"Kỳ (\d+):", p)))
            nv = sorted(set(re.findall(r"NV\d+", p)), key=lambda x: int(x[2:]))
            sc = sorted(set(re.findall(r"SC\d+", p)), key=lambda x: int(x[2:]))
            print("LẬP ĐỢT %d (kỳ %d): thấy tóm tắt kỳ %s → %s (%d kỳ); nhân vật phụ nhắc tới: %s; sợi chỉ: %s" % (
                dot, ky, seen[0] if seen else "-", seen[-1] if seen else "-", len(seen), nv, sc))
    step = S.arc_step(arc, ky)
    tom = "Kỳ %d (đợt %d, gặp %s)%s" % (ky, arc["dot"], arc["nhan_vat_phu"], " — kết, để lại SC%d" % arc["dot"] if step == 6 else "")
    st = {"doan": ["đoạn %d" % ky] * 3, "nho": {"tom_tat": tom, "nhan_vat_moi": [arc["nhan_vat_phu"]] if step == 0 else [],
          "bo_ngo": ["chỉ %d" % ky], "da_giai": ["chỉ %d" % (ky - 1)]}}
    S.save_episode(base, "2026-%03d" % ky, ky, st)
    if ky in (30, 90, 365):
        story = S.load_story(base)
        p = S.writer_prompt("vi", {"thoi_tiet": "nắng"}, ky + 1, "am", arc, story, "mùa", tones=["am"])
        seen = sorted(set(int(x) for x in re.findall(r"Kỳ (\d+)", p)))
        print("SAU KỲ %d: truyen.json giữ kỳ %d → %d (%d kỳ, %d KB); nhà văn viết kỳ %d thấy: kỳ %s; nhân vật phụ cũ nhắc tới: %s" % (
            ky, story[0]["ky"], story[-1]["ky"], len(story), os.path.getsize(os.path.join(base, S.STORY_FILE)) // 1024,
            ky + 1, seen, sorted(set(re.findall(r"NV\d+", p)))))
