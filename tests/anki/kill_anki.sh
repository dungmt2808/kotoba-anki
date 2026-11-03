#!/bin/bash
# Tắt Anki chạy từ các script test (tìm theo dòng lệnh, không dùng pkill -f để khỏi tự giết shell gọi nó).
# Chờ tới khi tiến trình thoát hẳn: Anki còn sống thì lần mở sau chỉ "reusing existing instance".
pids() {
  for p in $(ps -eo pid=,comm= | awk '$2 ~ /^python/ {print $1}'); do
    if tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null | grep -q "aqt.run()"; then echo $p; fi
  done
}
for p in $(pids); do kill $p 2>/dev/null; done
for i in $(seq 1 30); do [ -z "$(pids)" ] && break; sleep 0.5; done
for p in $(pids); do kill -9 $p 2>/dev/null; done
sleep 1
