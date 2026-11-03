# Bộ test của ことば畑 (từ bản 1.13)

Repo chỉ lưu add-on dạng gói `kotoba_batake.ankiaddon`. Muốn sửa / test thì giải nén ra, sửa, test, đóng gói lại:

```bash
tests/tools/unpack.sh                       # → /tmp/kb_src/kotoba_batake
# … sửa code trong /tmp/kb_src/kotoba_batake …
tests/run_all.sh /tmp/kb_src/kotoba_batake  # test offline
python3 tests/tools/pack.py /tmp/kb_src/kotoba_batake   # → kotoba_batake.ankiaddon ở gốc repo (tăng "mod")
```
Nhớ tăng `human_version` trong `manifest.json` và ghi lịch sử phiên bản ở `README.md` (gốc repo + trong gói).

## 1. Test offline — `run_all.sh [ADDON]` (không mạng, không Qt)

| File | Nội dung |
|---|---|
| `core/test_offline.py ADDON` | phần sửa ở 1.13 / 1.13.1 trong `ai_core` / `paper_core`: giải mã giọng đọc Gemini (WAV có khối C2PA, `audio/l16`, định dạng lạ), sửa file WAV lồng của 1.12 + tạo bù bản chậm (chạy 2 lần không làm gì thêm), bản đọc chậm WSOLA (độ dài, có tiếng, tốc độ), chọn model (model đã chạy đi trước, bỏ model hết hạn mức và tên gọi tắt trỏ sang nó, hết chặn thì dùng lại, Flash-Lite), lỗi 429 theo ngày (`retryDelay`, `quotaDimensions`), giờ đặt lại hạn mức, thông báo MAX_TOKENS, tự nối tra từ trên số N4 thật của 1.12 (5 → 20 chỗ, okurigana), các gợi ý cho bước soát (chữ Hán khó, mẫu trọng tâm, câu chép vắt qua 「」), số thường phải 3 bài, chữ gửi giọng đọc; 1.13.1: máy tự sửa `3[日|にち]` / `2[人|にん]`, furigana chắc chắn, chọn lại câu chép từ bài, `1日` chỉ cảnh báo, bản đầu JSON hỏng → viết lại, lượt sửa JSON hỏng → giữ bản trước (Gemini giả lập trong test). Chạy được bằng python hệ thống (thiếu gói `anki` thì dùng `stubs/`) |
| `core/test_dict.py ADDON` | Chép chính tả cho mọi deck trên **collection Anki thật** (`core/make_col.py`: deck A câu ví dụ + audio / B câu ví dụ không audio / C chỉ từ + audio từ / D chỉ từ / E kanji đơn) × 4 cấu hình giọng (không giọng / giọng máy / Gemini chưa tạo / giọng máy + Gemini): chọn câu, phát được (`audio_for`), bản chậm, câu cần Gemini tạo, chấm kana / chữ Hán, Gemini tạo xong / hết hạn mức trong ngày (bỏ câu không nghe được), id `w:<nid>` qua `clean_state`. Cần `ANKI_PY` = python có `anki==26.9.3` |

## 2. Gemini thật — `gemini/` (cần mạng + khoá)

Khoá lấy từ biến môi trường `GEMINI_API_KEY`, **không bao giờ ghi ra file**. Môi trường có proxy cắt request quá 30 giây (vd. Claude Code trên web) thì thêm `KB_STREAM=1` (chỉ đổi đường truyền sang streaming, logic add-on giữ nguyên).

```bash
GEMINI_API_KEY=... python3 tests/gemini/run_job.py ADDON /tmp/kb_run --audio ca_bai          # theo giáo trình kotoba_daily (N4)
GEMINI_API_KEY=... python3 tests/gemini/run_job.py ADDON /tmp/kb_run5 --deck-n5 --skip-test  # người học N5 chỉ có deck
python3 tests/gemini/show_issue.py ADDON /tmp/kb_run/bao_gemini 2026-11-03                   # nội dung + số chỗ tra từ
GEMINI_API_KEY=... python3 tests/gemini/audio_check.py ADDON /tmp/kb_run/bao_gemini/bao/2026-11-03 asr   # WAV + nghe lại
```
`run_job.py` chạy đúng `test_key` → `Job.run` → `make_audio` của add-on, in từng lượt gọi (giây, token vào / ra / suy nghĩ, lỗi), model hết hạn mức, nhật ký "Gemini đã viết và tự sửa những gì". Mỗi lần chạy tốn khoảng 5–15 lượt gọi chữ + 2–10 lượt giọng đọc của hạn mức miễn phí (~20 / ngày / model chữ, ~10 / ngày `gemini-3.8-flash-tts`).

## 3. Giao diện trong Anki thật — `anki/run_ui.sh ADDON SHOTS`

Chạy **Anki 26.9.3 thật** không cửa sổ (`QT_QPA_PLATFORM=offscreen`), điều khiển webview của vườn bằng Chrome DevTools Protocol (`anki/cdp.js`; Playwright không nối được QtWebEngine), add-on phụ `anki/zz_kbtest` nhận đoạn Python qua HTTP 127.0.0.1 (chạy ở luồng chính của Anki) và ghi lại mọi lệnh phát âm thanh (máy test không có loa / mpv). Mỗi kịch bản một thư mục Anki mới (`setup_base.sh`: profile Test, collection 5 kiểu deck, thư mục báo Gemini mẫu do `make_fixture.py` tạo — số 1.13 sạch + số 1.12 có file WAV lồng).

| Kịch bản | Nội dung |
|---|---|
| `e2e.js` | 28 kiểm tra: đọc số báo (3 bài, ▶ từng đoạn, ▶ Chậm phát `ct_1_cham.wav`, ≥ 10 chỗ tra từ), số 1.12 được sửa file lồng + tạo bù bản chậm ở luồng nền, Chép chính tả deck A / C / D (giọng máy giả lập: `TTSTag ja_JP`, tốc độ 0.7, gõ kana → đúng +2 xu) / E (hướng dẫn riêng cho deck chữ Hán) / D không giọng (hướng dẫn cài giọng + bật Gemini), deck B với **Gemini TTS thật** (chỉ khi `KB_REAL_GEMINI=1`), thẻ "Giọng đọc cho câu không có audio" ở tab Nguồn báo + lưu `dict_voice`, cửa sổ 1024×640 không tràn ngang, không lỗi JS, nhật ký lỗi add-on trống |
| `e2e_tour.js` | phím N / Q / T / B mở đúng bảng, **Esc chỉ đóng bảng, cửa sổ vườn vẫn mở** (lỗi của Anki 26.x đã sửa ở 1.13), R → ôn 1 thẻ thật (Space → 3, revlog +1), Esc khi đang ôn |

Chuẩn bị một lần (Ubuntu):
```bash
python3 -m venv ~/.venv-anki && ~/.venv-anki/bin/pip install aqt==26.9.3      # kéo theo PyQt6 + QtWebEngine
sudo apt-get install -y libegl1 libgl1 libopengl0 libxkbcommon0 libxkbcommon-x11-0 libfontconfig1 libdbus-1-3 \
  libxcb-cursor0 libxcb-icccm4 libxcb-keysyms1 libxcb-shape0 libxcb-xinerama0 libxcb-randr0 libxcb-render-util0 \
  libxcb-image0 libxshmfence1 libxkbfile1 fonts-noto-cjk
ANKI_PY=~/.venv-anki/bin/python tests/anki/run_ui.sh /tmp/kb_src/kotoba_batake /tmp/kb_shots
```
Cần Node ≥ 22 (có sẵn `fetch` và `WebSocket`). Cổng: `KB_CDP_PORT` (9333), `KB_CTRL_PORT` (9444). `kill_anki.sh` tắt Anki đang chạy từ các script này.

## Kết quả lần chạy gần nhất (bản 1.13.1, 03/11/2026)
- `test_offline.py`: 32/32 · `test_dict.py`: OK (5 deck × 4 cấu hình) · `e2e.js`: 28/28 (có Gemini TTS thật) · `e2e_tour.js`: 12/12.
- Gemini thật (gói miễn phí): số N4 viết bằng `gemini-flash-lite-latest` khi các model Flash đã hết hạn mức (15 lượt gọi, 36 giây, 10 file giọng đọc sạch); số N5 theo deck bằng `gemini-3.6-flash` (14 lượt gọi, 126 giây) — lần này đi qua cả nhánh "bản sửa bị hỏng → giữ bản trước". Hai lần trước đó (bản 1.13.0) hỏng vì JSON bị cắt và vì câu chép không còn nguyên văn sau bước soát → đã sửa ở 1.13.1.
- Chưa kiểm: giọng tiếng Nhật thật của Windows / macOS (máy test Linux, giọng được giả lập).
