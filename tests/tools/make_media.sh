#!/bin/bash
# make_media.sh OUT DEST — từ kết quả của tests/anki/readme_media.js (OUT) làm ảnh / video cho README vào DEST:
#   DEST/anh/*.png         ảnh chụp (nén lại bằng pngquant nếu có, giữ nguyên cỡ)
#   DEST/video/tour.mp4    video đầy đủ (H.264, 30 khung/giây, phát được trên GitHub / AnkiWeb / điện thoại)
#   DEST/video/tour.gif    GIF ngắn (đoạn đầu: vườn → ôn thẻ → Nhà), hiện thẳng trong README không cần bấm
# Cần ffmpeg (+ pngquant nếu muốn ảnh nhỏ hơn).
set -e
OUT=$(cd "$1" && pwd); mkdir -p "$2"; DEST=$(cd "$2" && pwd)
mkdir -p "$DEST/anh" "$DEST/video"
for f in "$OUT"/*.png; do
  b=$(basename "$f")
  if command -v pngquant >/dev/null; then pngquant --force --quality 80-98 --output "$DEST/anh/$b" "$f"; else cp "$f" "$DEST/anh/$b"; fi
done
(cd "$OUT/frames" && ffmpeg -loglevel error -y -f concat -safe 0 -i frames.txt \
  -vf "fps=30,format=yuv420p" -c:v libx264 -crf 26 -preset slow -movflags +faststart "$DEST/video/tour.mp4")
GIF_LEN=${GIF_LEN:-22}; GIF_W=${GIF_W:-800}; GIF_FPS=${GIF_FPS:-12}
ffmpeg -loglevel error -y -t "$GIF_LEN" -i "$DEST/video/tour.mp4" \
  -vf "fps=$GIF_FPS,scale=$GIF_W:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" \
  "$DEST/video/tour.gif"
ls -la "$DEST/video"
