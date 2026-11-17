"""1.33: deck mẫu cho Gemini thật (tests/gemini/run_job.py --lang zh / ko) — từ cơ bản HSK 1–2 / TOPIK 1–2 do Claude chọn
(từ ai cũng dạy, không chép giáo trình). Pinyin không gõ tay: pypinyin, ghi dấu thanh, thanh nhẹ để trống dấu.

Chạy (venv riêng):  uv venv /tmp/soat && uv pip install --python /tmp/soat/bin/python pypinyin
                     /tmp/soat/bin/python tests/tools/tao_deck_133.py
"""
import json
import os

from pypinyin import Style, pinyin

HERE = os.path.dirname(os.path.abspath(__file__))
ZH = [("你好", "xin chào", "NHĨ HẢO"), ("谢谢", "cảm ơn", "TẠ TẠ"), ("学生", "học sinh", "HỌC SINH"), ("老师", "giáo viên", "LÃO SƯ"),
      ("朋友", "bạn bè", "BẰNG HỮU"), ("吃饭", "ăn cơm", "NGẬT PHẠN"), ("喝", "uống", "HÁT"), ("茶", "trà", "TRÀ"),
      ("看书", "đọc sách", "KHÁN THƯ"), ("学习", "học tập", "HỌC TẬP"), ("天气", "thời tiết", "THIÊN KHÍ"), ("下雨", "trời mưa", "HẠ VŨ"),
      ("花", "hoa", "HOA"), ("水", "nước", "THỦY"), ("猫", "con mèo", "MIÊU"), ("狗", "con chó", "CẨU"), ("家", "nhà", "GIA"),
      ("医院", "bệnh viện", "Y VIỆN"), ("飞机", "máy bay", "PHI CƠ"), ("电脑", "máy tính", "ĐIỆN NÃO"), ("今天", "hôm nay", "KIM THIÊN"),
      ("明天", "ngày mai", "MINH THIÊN"), ("昨天", "hôm qua", "TẠC THIÊN"), ("喜欢", "thích", "HỈ HOAN"), ("漂亮", "đẹp", "PHIÊU LƯỢNG"),
      ("商店", "cửa hàng", "THƯƠNG ĐIẾM"), ("买", "mua", "MÃI"), ("东西", "đồ vật", "ĐÔNG TÂY"), ("衣服", "quần áo", "Y PHỤC"),
      ("妈妈", "mẹ", "MA MA"), ("孩子", "đứa trẻ", "HÀI TỬ"), ("时候", "lúc, khi", "THỜI HẬU"), ("早上", "buổi sáng", "TẢO THƯỢNG"),
      ("晚上", "buổi tối", "VÃN THƯỢNG"), ("休息", "nghỉ ngơi", "HƯU TỨC"), ("睡觉", "ngủ", "THỤY GIÁC"), ("起床", "thức dậy", "KHỞI SÀNG"),
      ("工作", "công việc", "CÔNG TÁC"), ("唱歌", "hát", "XƯỚNG CA"), ("跳舞", "nhảy múa", "KHIÊU VŨ"), ("旅游", "du lịch", "LỮ DU"),
      ("准备", "chuẩn bị", "CHUẨN BỊ"), ("高兴", "vui", "CAO HỨNG"), ("快乐", "vui vẻ", "KHOÁI LẠC"), ("颜色", "màu sắc", "NHAN SẮC"),
      ("红色", "màu đỏ", "HỒNG SẮC"), ("白色", "màu trắng", "BẠCH SẮC"), ("眼睛", "mắt", "NHÃN TINH"), ("身体", "cơ thể", "THÂN THỂ"),
      ("鱼", "cá", "NGƯ"), ("鸡蛋", "trứng gà", "KÊ ĐẢN"), ("苹果", "quả táo", "BÌNH QUẢ"), ("西瓜", "dưa hấu", "TÂY QUA"),
      ("咖啡", "cà phê", "CA PHÊ"), ("牛奶", "sữa bò", "NGƯU NÃI"), ("房间", "căn phòng", "PHÒNG GIAN"), ("门", "cửa", "MÔN"),
      ("路", "con đường", "LỘ"), ("远", "xa", "VIỄN"), ("近", "gần", "CẬN"), ("慢", "chậm", "MẠN"), ("快", "nhanh", "KHOÁI"),
      ("新", "mới", "TÂN"), ("旁边", "bên cạnh", "BÀNG BIÊN"), ("外面", "bên ngoài", "NGOẠI DIỆN"), ("问题", "câu hỏi, vấn đề", "VẤN ĐỀ"),
      ("知道", "biết", "TRI ĐẠO"), ("觉得", "cảm thấy", "GIÁC ĐẮC"), ("告诉", "nói cho biết", "CÁO TỐ"), ("帮助", "giúp đỡ", "BANG TRỢ"),
      ("等", "đợi", "ĐẲNG"), ("找", "tìm", "TRẢO"), ("笑", "cười", "TIẾU"), ("送", "tặng, tiễn", "TỐNG"), ("生日", "sinh nhật", "SINH NHẬT"),
      ("希望", "hy vọng", "HI VỌNG"), ("可能", "có thể", "KHẢ NĂNG"), ("运动", "vận động", "VẬN ĐỘNG"), ("雪", "tuyết", "TUYẾT"),
      ("害怕", "sợ", "HẠI PHẠ"), ("村子", "ngôi làng", "THÔN TỬ"), ("井", "cái giếng", "TỈNH"), ("故事", "câu chuyện", "CỐ SỰ")]
KO = [("안녕하세요", "annyeonghaseyo", "xin chào"), ("감사합니다", "gamsahamnida", "cảm ơn"), ("학생", "haksaeng", "học sinh"),
      ("선생님", "seonsaengnim", "thầy cô giáo"), ("친구", "chingu", "bạn bè"), ("밥", "bap", "cơm"), ("물", "mul", "nước"),
      ("책", "chaek", "sách"), ("꽃", "kkot", "hoa"), ("고양이", "goyangi", "con mèo"), ("강아지", "gangaji", "cún con"),
      ("집", "jip", "nhà"), ("학교", "hakgyo", "trường học"), ("병원", "byeongwon", "bệnh viện"), ("날씨", "nalssi", "thời tiết"),
      ("오늘", "oneul", "hôm nay"), ("내일", "naeil", "ngày mai"), ("어제", "eoje", "hôm qua"), ("바다", "bada", "biển"),
      ("커피", "keopi", "cà phê"), ("우유", "uyu", "sữa"), ("사과", "sagwa", "quả táo"), ("시장", "sijang", "chợ"), ("가게", "gage", "cửa hàng"),
      ("사다", "sada", "mua"), ("먹다", "meokda", "ăn"), ("마시다", "masida", "uống"), ("가다", "gada", "đi"), ("오다", "oda", "đến"),
      ("보다", "boda", "xem, nhìn"), ("읽다", "ikda", "đọc"), ("쓰다", "sseuda", "viết"), ("듣다", "deutda", "nghe"), ("걷다", "geotda", "đi bộ"),
      ("만들다", "mandeulda", "làm, chế tạo"), ("살다", "salda", "sống"), ("좋다", "jota", "tốt"), ("예쁘다", "yeppeuda", "đẹp"),
      ("춥다", "chupda", "lạnh"), ("덥다", "deopda", "nóng"), ("크다", "keuda", "to"), ("작다", "jakda", "nhỏ"), ("많다", "manta", "nhiều"),
      ("바쁘다", "bappeuda", "bận"), ("아프다", "apeuda", "đau, ốm"), ("무섭다", "museopda", "sợ"), ("재미있다", "jaemiitda", "thú vị"),
      ("맛있다", "masitda", "ngon"), ("아침", "achim", "buổi sáng"), ("저녁", "jeonyeok", "buổi tối"), ("시간", "sigan", "thời gian"),
      ("사진", "sajin", "ảnh"), ("노래", "norae", "bài hát"), ("그림", "geurim", "bức tranh"), ("여행", "yeohaeng", "du lịch"),
      ("축제", "chukje", "lễ hội"), ("마을", "maeul", "làng"), ("우물", "umul", "cái giếng"), ("비", "bi", "mưa"), ("바람", "baram", "gió"),
      ("하늘", "haneul", "bầu trời"), ("길", "gil", "con đường"), ("문", "mun", "cửa"), ("방", "bang", "căn phòng"), ("옷", "ot", "quần áo"),
      ("모자", "moja", "mũ"), ("신발", "sinbal", "giày dép"), ("가방", "gabang", "cái cặp"), ("의자", "uija", "cái ghế"),
      ("창문", "changmun", "cửa sổ"), ("기차", "gicha", "tàu hỏa"), ("친절하다", "chinjeolhada", "tử tế"), ("조용하다", "joyonghada", "yên tĩnh"),
      ("기다리다", "gidarida", "chờ đợi"), ("찾다", "chatda", "tìm"), ("웃다", "utda", "cười"), ("울다", "ulda", "khóc"),
      ("준비하다", "junbihada", "chuẩn bị"), ("이야기", "iyagi", "câu chuyện"), ("소리", "sori", "âm thanh")]


def marks(w: str) -> str:
    return " ".join(x[0] for x in pinyin(w, style=Style.TONE))


def _dump(name: str, tool: str, rows: list) -> None:
    body = ",\n".join("  " + json.dumps(r, ensure_ascii=False) for r in rows)
    with open(os.path.join(HERE, "..", "fixtures", name), "w", encoding="utf-8") as f:
        f.write('{"cong_cu": %s, "tu_vung": [\n%s\n]}\n' % (json.dumps(tool, ensure_ascii=False), body))


def main() -> None:
    zh = [[w, marks(w), m, hv] for w, m, hv in ZH]
    _dump("zh_deck_hsk2.json", "pypinyin (dấu thanh)", zh)
    _dump("ko_deck_topik2.json", "Claude chọn", [list(x) for x in KO])
    print(len(zh), "từ tiếng Trung,", len(KO), "từ tiếng Hàn")


if __name__ == "__main__":
    main()
