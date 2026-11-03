#!/bin/bash
for p in $(ps -eo pid=,comm= | awk '$2 ~ /^python/ {print $1}'); do
  if tr '\0' ' ' < /proc/$p/cmdline 2>/dev/null | grep -q "aqt.run()"; then kill $p 2>/dev/null; fi
done
sleep 2
