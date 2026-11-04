#!/bin/bash
# setup_base.sh BASE ADDON — thư mục Anki mới: profile Test, collection 5 kiểu deck, add-on + báo Gemini mẫu.
# Cần ANKI_PY = python của venv có aqt==26.9.3 (mặc định python3).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PY=${ANKI_PY:-python3}
BASE=$1; SRC=$(cd "$2" && pwd)
rm -rf "$BASE"; "$PY" "$HERE/mkbase.py" "$BASE" >/dev/null
mkdir -p "$BASE/Test"
"$PY" -c "import sys; sys.path.insert(0, '$HERE/../core'); import make_col; make_col.build('$BASE/Test/collection.anki2')"
mkdir -p "$BASE/addons21/kotoba_batake"
(cd "$SRC" && tar --exclude=.git --exclude=__pycache__ --exclude=meta.json -cf - .) | (cd "$BASE/addons21/kotoba_batake" && tar -xf -)
cp -r "$HERE/zz_kbtest" "$BASE/addons21/"
"$PY" "$HERE/make_fixture.py" "$BASE/addons21/kotoba_batake" "$BASE/addons21/kotoba_batake/user_files/bao_gemini" \
  "$BASE/addons21/kotoba_batake/user_files/bao_gemini_en" >/dev/null
"$PY" - "$BASE" "${GEMINI_API_KEY:-AIzaDUMMY-proxy-injects-the-real-key-00}" <<'PY'
import json, sys
base, key = sys.argv[1], sys.argv[2]
cfg = json.load(open(base + "/addons21/kotoba_batake/config.json"))
cfg.update(gemini_key=key, bao_source="gemini", gemini_auto=False, open_maximized=False, music=False, sound=False,
           gemini_level="N4")
json.dump({"config": cfg}, open(base + "/addons21/kotoba_batake/meta.json", "w"), ensure_ascii=False)
PY
echo "base: $BASE"
