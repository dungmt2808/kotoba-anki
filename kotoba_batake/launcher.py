"""Mở ことば畑 nhanh từ bên ngoài Anki (1.10): biểu tượng trên màn hình nền.

Cách hoạt động — dùng đúng đường Anki mở một file .apkg khi bấm đúp:
- Add-on giữ một file "vé" `user_files/kotoba_batake_open.apkg` (không phải deck thật).
- Biểu tượng trên màn hình nền mở file vé đó bằng Anki. Anki chưa chạy thì tự mở lên;
  đang chạy thì Anki nhảy lên trước và chuyển đường dẫn cho `mw.handleImport`.
- `__init__.py` bọc `mw.handleImport`: gặp đúng file vé thì mở vườn thay vì nhập deck.
  File khác vẫn nhập như bình thường.

File này không import aqt / Qt để test được ở mọi máy; `create()` nhận sẵn hệ điều hành,
thư mục nhà, hàm chạy lệnh… (mặc định lấy của máy đang chạy).
"""

from __future__ import annotations

import base64
import os
import plistlib
import re
import shutil
import stat
import subprocess
import sys
from typing import Any, Callable

TICKET_NAME = "kotoba_batake_open.apkg"
SHORTCUT_NAME = "ことば畑"
LINUX_ID = "kotoba-batake"
MAC_BUNDLE = "net.ankiweb.dtop"      # bundle id của Anki trên macOS
TICKET_TEXT = (
    "ことば畑 · Vườn từ vựng\n"
    "File này không phải deck. Biểu tượng ことば畑 trên màn hình nền mở file này bằng Anki\n"
    "để vào thẳng khu vườn. Đừng xoá hay đổi tên.\n"
)


def ticket_path(user_dir: str) -> str:
    return os.path.join(user_dir, TICKET_NAME)


def ensure_ticket(user_dir: str) -> str:
    """Tạo file vé nếu chưa có (giữ nguyên khi cập nhật add-on vì nằm trong user_files)."""
    os.makedirs(user_dir, exist_ok=True)
    path = ticket_path(user_dir)
    if not os.path.isfile(path):
        with open(path, "w", encoding="utf-8") as f:
            f.write(TICKET_TEXT)
    return path


def is_ticket(path: Any) -> bool:
    """Đường dẫn Anki nhận được có phải file vé không (so tên file, không phân biệt hoa thường)."""
    if not path:
        return False
    try:
        name = re.split(r"[\\/]", str(path).strip().strip('"').rstrip("/\\"))[-1]   # cả đường dẫn Windows lẫn POSIX
    except Exception:
        return False
    return name.lower() == TICKET_NAME


def platform_kind(system: str | None = None) -> str:
    s = (system or sys.platform).lower()
    if s.startswith("win"):
        return "windows"
    if s.startswith("darwin") or s == "mac":
        return "mac"
    return "linux"


def platform_label(kind: str) -> str:
    return {"windows": "Windows", "mac": "macOS", "linux": "Linux"}.get(kind, kind)


# ---------------------------------------------------------------------------
# Windows: lối tắt .lnk (PowerShell + WScript.Shell), dự phòng .url
# ---------------------------------------------------------------------------


def _ps_quote(s: str) -> str:
    return "'" + s.replace("'", "''") + "'"


def _win_dir(path: str) -> str:
    cut = max(path.rfind("\\"), path.rfind("/"))
    return path[:cut] if cut > 0 else path


def windows_script(ticket: str, ico: str) -> str:
    """Lệnh PowerShell tạo lối tắt ことば畑.lnk ở màn hình nền (cả khi Desktop nằm trong OneDrive) và
    trong menu Start. Lối tắt chạy explorer.exe "file vé" (= mở file vé bằng Anki) nên ghim được vào
    thanh tác vụ. Mỗi chỗ tạo riêng (lỗi chỗ này không bỏ chỗ kia); in ra các lối tắt đã tạo, không tạo
    được cái nào thì thoát mã 1."""
    lines = [
        "$ErrorActionPreference = 'Stop'",
        "try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}",
        "$sh = New-Object -ComObject WScript.Shell",
        "$exp = Join-Path ([Environment]::GetFolderPath('Windows')) 'explorer.exe'",
        "$out = @()",
        "foreach ($d in @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))) {",
        "  if (-not $d) { continue }",
        "  try {",
        f"    $p = Join-Path $d {_ps_quote(SHORTCUT_NAME + '.lnk')}",
        "    $s = $sh.CreateShortcut($p)",
        "    $s.TargetPath = $exp",
        f"    $s.Arguments = {_ps_quote(chr(34) + ticket + chr(34))}",
        f"    $s.WorkingDirectory = {_ps_quote(_win_dir(ticket))}",
        f"    $s.IconLocation = {_ps_quote(ico + ',0')}",
        f"    $s.Description = {_ps_quote('Mở ' + SHORTCUT_NAME + ' · Vườn từ vựng trong Anki')}",
        "    $s.Save()",
        "    $out += $p",
        "  } catch { [Console]::Error.WriteLine($_.Exception.Message) }",
        "}",
        "if ($out.Count -eq 0) { exit 1 }",
        "$out | ForEach-Object { Write-Output $_ }",
    ]
    return "\n".join(lines)


def windows_command(script: str) -> list[str]:
    enc = base64.b64encode(script.encode("utf-16-le")).decode("ascii")
    return ["powershell.exe", "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", enc]


def _file_url(path: str) -> str:
    from urllib.parse import quote
    p = path.replace("\\", "/")
    if not p.startswith("/"):
        p = "/" + p
    return "file://" + quote(p, safe="/:")


def windows_url_file(ticket: str, ico: str) -> str:
    """Dự phòng khi không chạy được PowerShell: lối tắt .url (chỉ ký tự ASCII)."""
    lines = ["[InternetShortcut]", "URL=" + _file_url(ticket)]
    if ico.isascii():
        lines += ["IconFile=" + ico, "IconIndex=0"]
    return "\r\n".join(lines) + "\r\n"


# ---------------------------------------------------------------------------
# macOS: ứng dụng nhỏ ことば畑.app (osacompile) trên màn hình nền
# ---------------------------------------------------------------------------


def _as_quote(s: str) -> str:
    return '"' + s.replace("\\", "\\\\").replace('"', '\\"') + '"'


def _sh_quote(s: str) -> str:
    return "'" + s.replace("'", "'\\''") + "'"


def mac_applescript(ticket: str) -> str:
    # Mở file vé bằng Anki (theo bundle id); máy lạ không có bundle id đó thì mở theo loại file .apkg.
    sh = f"open -b {MAC_BUNDLE} {_sh_quote(ticket)} || open {_sh_quote(ticket)}"
    return f"do shell script {_as_quote(sh)}"


def mac_fix_icon(app: str, icns: str) -> None:
    """Thay biểu tượng mặc định của applet bằng biểu tượng ことば畑."""
    res = os.path.join(app, "Contents", "Resources")
    shutil.copyfile(icns, os.path.join(res, "applet.icns"))
    car = os.path.join(res, "Assets.car")       # macOS mới: biểu tượng trong Assets.car được ưu tiên
    if os.path.exists(car):
        os.remove(car)
    plist = os.path.join(app, "Contents", "Info.plist")
    if os.path.isfile(plist):
        with open(plist, "rb") as f:
            info = plistlib.load(f)
        info.pop("CFBundleIconName", None)
        info["CFBundleIconFile"] = "applet"
        info["CFBundleName"] = SHORTCUT_NAME
        with open(plist, "wb") as f:
            plistlib.dump(info, f)
    os.utime(app, None)


# ---------------------------------------------------------------------------
# Linux: file .desktop (menu ứng dụng + màn hình nền)
# ---------------------------------------------------------------------------


def _desktop_arg(s: str) -> str:
    """Một đối số của Exec= theo đặc tả Desktop Entry: trong ngoặc kép, thoát " ` $ \\ ; % viết thành %%.
    Luật thoát chung của giá trị chuỗi (\\ → \\\\) áp dụng trước luật trích dẫn nên nhân đôi \\ thêm một lần."""
    out = s.replace("\\", "\\\\").replace('"', '\\"').replace("`", "\\`").replace("$", "\\$")
    return ('"' + out.replace("%", "%%") + '"').replace("\\", "\\\\")


def linux_desktop_entry(ticket: str, png: str, anki_cmd: str | None) -> str:
    exe = _desktop_arg(anki_cmd) if anki_cmd else "xdg-open"
    return "\n".join([
        "[Desktop Entry]",
        "Type=Application",
        f"Name={SHORTCUT_NAME}",
        "Comment=Mở ことば畑 · Vườn từ vựng trong Anki",
        f"Exec={exe} {_desktop_arg(ticket)}",
        f"Icon={png}",
        "Terminal=false",
        "Categories=Education;",
        "StartupNotify=true",
        "",
    ])


def _linux_desktop_dir(home: str, run: Callable[..., Any]) -> str | None:
    try:
        r = run(["xdg-user-dir", "DESKTOP"], capture_output=True, text=True, timeout=5)
        d = (r.stdout or "").strip()
        if r.returncode == 0 and d and d != home and os.path.isdir(d):
            return d
    except Exception:
        pass
    for name in ("Desktop", "Màn hình nền", "Bureau", "Schreibtisch", "デスクトップ"):
        d = os.path.join(home, name)
        if os.path.isdir(d):
            return d
    return None


# ---------------------------------------------------------------------------
# Tạo biểu tượng
# ---------------------------------------------------------------------------


def create(addon_dir: str, user_dir: str, system: str | None = None, home: str | None = None,
           run: Callable[..., Any] = subprocess.run, which: Callable[[str], str | None] = shutil.which,
           env: dict[str, str] | None = None) -> dict[str, Any]:
    """Tạo biểu tượng ことば畑 ngoài Anki. Trả về {ok, kind, paths, msg}. Không bao giờ ném lỗi."""
    kind = platform_kind(system)
    home = home or os.path.expanduser("~")
    env = dict(os.environ if env is None else env)
    icons = os.path.join(addon_dir, "icons")
    try:
        ticket = ensure_ticket(user_dir)
    except OSError as err:
        return {"ok": False, "kind": kind, "paths": [], "msg": f"Không tạo được file vé: {err}"}
    try:
        if kind == "windows":
            return _create_windows(ticket, os.path.join(icons, "kotoba.ico"), home, run, env)
        if kind == "mac":
            return _create_mac(ticket, os.path.join(icons, "kotoba.icns"), home, run)
        return _create_linux(ticket, os.path.join(icons, "kotoba.png"), home, run, which, env)
    except Exception as err:   # không để lỗi lọt ra giao diện
        return {"ok": False, "kind": kind, "paths": [], "msg": f"Không tạo được biểu tượng: {err}"}


def _create_windows(ticket: str, ico: str, home: str, run: Callable[..., Any], env: dict[str, str]) -> dict[str, Any]:
    flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    err = ""
    try:
        r = run(windows_command(windows_script(ticket, ico)), capture_output=True, text=True,
                encoding="utf-8", errors="replace", timeout=30, creationflags=flags)
        out = [x.strip() for x in (r.stdout or "").splitlines() if x.strip()]
        if r.returncode == 0:
            where = "trên màn hình nền và trong menu Start" if len(out) != 1 else "trên màn hình nền"
            return {"ok": True, "kind": "windows", "paths": out,
                    "msg": f"Đã tạo biểu tượng ことば畑 {where} (chuột phải → Ghim vào thanh tác vụ được)."}
        err = (r.stderr or "").strip().splitlines()[-1:] or [f"mã lỗi {r.returncode}"]
        err = err[0]
    except Exception as e:
        err = str(e)
    # Dự phòng: lối tắt .url trên màn hình nền
    base = env.get("USERPROFILE") or home
    for d in (os.path.join(base, "OneDrive", "Desktop"), os.path.join(base, "Desktop")):
        if os.path.isdir(d):
            path = os.path.join(d, SHORTCUT_NAME + ".url")
            with open(path, "w", encoding="ascii", errors="replace", newline="") as f:
                f.write(windows_url_file(ticket, ico))
            return {"ok": True, "kind": "windows", "paths": [path],
                    "msg": "Đã tạo lối tắt ことば畑 trên màn hình nền (dạng .url vì không chạy được PowerShell)."}
    return {"ok": False, "kind": "windows", "paths": [], "msg": f"Không tạo được lối tắt: {err}"}


def _create_mac(ticket: str, icns: str, home: str, run: Callable[..., Any]) -> dict[str, Any]:
    desk = os.path.join(home, "Desktop")
    os.makedirs(desk, exist_ok=True)
    app = os.path.join(desk, SHORTCUT_NAME + ".app")
    if os.path.isdir(app):
        shutil.rmtree(app)
    r = run(["osacompile", "-o", app, "-e", mac_applescript(ticket)], capture_output=True, text=True, timeout=60)
    if r.returncode != 0 or not os.path.isdir(app):
        tail = (r.stderr or "").strip().splitlines()[-1:] or [f"mã lỗi {r.returncode}"]
        return {"ok": False, "kind": "mac", "paths": [], "msg": f"Không tạo được ứng dụng ことば畑: {tail[0]}"}
    try:
        mac_fix_icon(app, icns)
    except Exception as err:
        print(f"[kotoba_batake] icon mac: {err}")
    return {"ok": True, "kind": "mac", "paths": [app],
            "msg": "Đã tạo ことば畑 trên màn hình nền. Có thể kéo nó vào Dock."}


def _create_linux(ticket: str, png: str, home: str, run: Callable[..., Any], which: Callable[[str], str | None],
                  env: dict[str, str]) -> dict[str, Any]:
    anki_cmd = which("anki")
    text = linux_desktop_entry(ticket, png, anki_cmd)
    data_home = env.get("XDG_DATA_HOME") or os.path.join(home, ".local", "share")
    apps = os.path.join(data_home, "applications")
    os.makedirs(apps, exist_ok=True)
    paths = [os.path.join(apps, LINUX_ID + ".desktop")]
    desk = _linux_desktop_dir(home, run)
    if desk:
        paths.append(os.path.join(desk, LINUX_ID + ".desktop"))
    for p in paths:
        with open(p, "w", encoding="utf-8") as f:
            f.write(text)
        os.chmod(p, os.stat(p).st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        try:      # GNOME: cho phép chạy biểu tượng trên màn hình nền
            run(["gio", "set", p, "metadata::trusted", "true"], capture_output=True, timeout=5)
        except Exception:
            pass
    where = "trên màn hình nền và trong menu ứng dụng" if desk else "trong menu ứng dụng"
    return {"ok": True, "kind": "linux", "paths": paths, "msg": f"Đã tạo biểu tượng ことば畑 {where}."}
