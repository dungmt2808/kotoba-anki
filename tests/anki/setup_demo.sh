#!/bin/bash
# setup_demo.sh BASE ADDON — như setup_base.sh nhưng collection là bộ thẻ mẫu cho ảnh / video giới thiệu (demo_col.py).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PY=${ANKI_PY:-python3}
"$HERE/setup_base.sh" "$1" "$2" >/dev/null
"$PY" "$HERE/demo_col.py" "$1/Test/collection.anki2"
# màn giới thiệu: chỉ báo tiếng Nhật, có nhạc / tiếng tắt (video không có tiếng), cửa sổ thường
"$PY" - "$1" <<'PY'
import json, sys
p = sys.argv[1] + "/addons21/kotoba_batake/meta.json"
m = json.load(open(p))
m["config"].update(gemini_langs=["ja", "en"])
json.dump(m, open(p, "w"), ensure_ascii=False)
PY
echo "demo: $1"
