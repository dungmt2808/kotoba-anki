#!/bin/bash
# unpack.sh [GÓI] [THƯ_MỤC] — giải nén kotoba_batake.ankiaddon để sửa / chạy test (mặc định: gói ở gốc repo → /tmp/kb_src/kotoba_batake)
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PKG=${1:-$HERE/../../kotoba_batake.ankiaddon}
OUT=${2:-/tmp/kb_src/kotoba_batake}
rm -rf "$OUT"; mkdir -p "$OUT"
python3 -c "import zipfile,sys; zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])" "$PKG" "$OUT"
echo "$OUT"
