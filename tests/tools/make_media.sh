#!/bin/bash
# make_media.sh OUT DEST — từ kết quả của tests/anki/readme_media.js (OUT) làm ảnh / video cho README vào DEST:
#   DEST/anh/*.png         ảnh chụp (nén lại bằng pngquant nếu có, giữ nguyên cỡ)
#   DEST/video/tour.mp4    video đầy đủ (H.264, 30 khung/giây, phát được trên GitHub / AnkiWeb / điện thoại)
#   DEST/video/tour.gif    GIF ngắn (đoạn đầu: vườn → ôn thẻ → Nhà), hiện thẳng trong README không cần bấm
#   DEST/anh/13_giao_dien_mua.png  ảnh ghép 8 giao diện mùa (nếu có OUT/mua/), 16b_cac_vung.png sân + các vùng (OUT/vung/)
#   tour.mp4 có nhạc nếu có OUT/frames/music.wav
# Cần ffmpeg, ImageMagick (montage) (+ pngquant nếu muốn ảnh nhỏ hơn).
set -e
OUT=$(cd "$1" && pwd); mkdir -p "$2"; DEST=$(cd "$2" && pwd)
mkdir -p "$DEST/anh" "$DEST/video"
for f in "$OUT"/*.png; do
  b=$(basename "$f")
  if command -v pngquant >/dev/null; then pngquant --force --quality 80-98 --output "$DEST/anh/$b" "$f"; else cp "$f" "$DEST/anh/$b"; fi
done
# 1.22.8: 8 ảnh sân theo giao diện mùa (OUT/mua/) → một ảnh ghép 2 × 4
if [ -d "$OUT/mua" ]; then
  montage $(ls "$OUT"/mua/*.png | sort -V) -tile 2x -geometry 640x+6+6 -background '#f4efe6' -depth 8 "$DEST/anh/13_giao_dien_mua.png"
  command -v pngquant >/dev/null && pngquant --force --quality 80-98 --ext .png "$DEST/anh/13_giao_dien_mua.png"
fi
# sân + 6 vùng + vùng tự tạo (OUT/vung/) → một ảnh ghép 2 × 4
if [ -d "$OUT/vung" ]; then
  montage $(ls "$OUT"/vung/*.png | sort -V) -tile 2x -geometry 640x+6+6 -background '#f4efe6' -depth 8 "$DEST/anh/16b_cac_vung.png"
  command -v pngquant >/dev/null && pngquant --force --quality 80-98 --ext .png "$DEST/anh/16b_cac_vung.png"
fi
[ -f "$OUT/frames/frames.txt" ] || { echo "không có video (KB_ONLY=shots): giữ video cũ"; exit 0; }
# nhạc (frames/music.wav, dựng từ chính các bản nhạc 8-bit của add-on) → ghép vào MP4; GIF thì không có tiếng
AUDIO=(); [ -f "$OUT/frames/music.wav" ] && AUDIO=(-i music.wav -c:a aac -b:a 128k -shortest)
(cd "$OUT/frames" && ffmpeg -loglevel error -y -f concat -safe 0 -i frames.txt "${AUDIO[@]:0:2}" \
  -vf "fps=30,format=yuv420p" -c:v libx264 -crf 26 -preset slow "${AUDIO[@]:2}" -movflags +faststart "$DEST/video/tour.mp4")
GIF_LEN=${GIF_LEN:-22}; GIF_W=${GIF_W:-800}; GIF_FPS=${GIF_FPS:-12}
ffmpeg -loglevel error -y -t "$GIF_LEN" -i "$DEST/video/tour.mp4" \
  -vf "fps=$GIF_FPS,scale=$GIF_W:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128:stats_mode=diff[p];[b][p]paletteuse=dither=none:diff_mode=rectangle" \
  "$DEST/video/tour.gif"
ls -la "$DEST/video"
