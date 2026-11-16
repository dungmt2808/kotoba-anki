"""ことば畑 1.32.2 — cửa sổ "Sửa thẻ" mở từ bảng ôn của vườn (nút ✎ Sửa / phím E).

Là cửa sổ sửa note của chính Anki (như Edit khi ôn ở cửa sổ chính, `aqt.editcurrent`) nhưng dựng cho note của thẻ đang ôn
trong vườn: `aqt.editcurrent` lấy `mw.reviewer.card`, chỉ dùng được khi Anki đang ở màn ôn của nó.

- Đăng ký với bộ quản lý cửa sổ của Anki (`aqt.dialogs.register_dialog`): chỉ một cửa sổ; đóng hồ sơ / đồng bộ toàn bộ thì
  Anki tự gọi `closeWithCallback` (lưu xong mới đóng) như cửa sổ Edit của nó.
- Lưu như Anki: trình sửa ghi từng thay đổi bằng thao tác "Update Note" (hoàn tác được ở Edit → Undo của cửa sổ chính).
- Note bị sửa ở chỗ khác (Trình duyệt thẻ, Undo) khi cửa sổ đang mở → nạp lại; note bị xoá → đóng cửa sổ.
- Không mở được (bản Anki khác) → mở Trình duyệt thẻ ở đúng note.
"""
from __future__ import annotations

from typing import Any, Callable

import aqt
import aqt.editor
from aqt import gui_hooks, mw
from aqt.qt import QDialogButtonBox, QKeySequence, QMainWindow, QShortcut, Qt, qconnect
from aqt.utils import restoreGeom, saveGeom

try:
    from anki.errors import NotFoundError
except ImportError:      # bản Anki rất cũ
    NotFoundError = Exception  # type: ignore[misc,assignment]

try:
    from aqt.utils import is_mac
except ImportError:
    from anki.utils import is_mac  # type: ignore[no-redef]

NAME = "KotobaBatakeEditCard"
GEOM = "kotoba_batake_edit"
TITLE = "Sửa thẻ · ことば畑"

# gọi sau khi cửa sổ đóng (đã lưu xong): on_closed(nid)
_on_closed: Callable[[int], None] | None = None


def _make_editor(win: QMainWindow, widget: Any) -> Any:
    """Trình sửa note kiểu cũ của Anki (Editor). 23.10 → 26.x nhận editor_mode; bản nào không có thì dùng tham số cũ."""
    mode = getattr(getattr(aqt.editor, "EditorMode", None), "EDIT_CURRENT", None)
    if mode is not None:
        try:
            return aqt.editor.Editor(mw, widget, win, editor_mode=mode)
        except TypeError:
            pass
    return aqt.editor.Editor(mw, widget, win)


class EditCardWindow(QMainWindow):
    def __init__(self, card: Any) -> None:
        super().__init__(None, Qt.WindowType.Window)
        self.form = aqt.forms.editcurrent.Ui_Dialog()
        self.form.setupUi(self)
        self.setWindowTitle(TITLE)
        self.setMinimumHeight(400)
        self.setMinimumWidth(250)
        if not is_mac:
            self.setMenuBar(None)
        self.nid = int(card.nid)
        self._closed = False
        self.editor = _make_editor(self, self.form.fieldsArea)
        self.editor.card = card
        self.editor.set_note(card.note(), focusTo=0)
        restoreGeom(self, GEOM)
        self.buttonbox = QDialogButtonBox(Qt.Orientation.Horizontal)
        self.form.verticalLayout.insertWidget(1, self.buttonbox)
        self.buttonbox.addButton(QDialogButtonBox.StandardButton.Close)
        qconnect(self.buttonbox.rejected, self.close)
        close_button = self.buttonbox.button(QDialogButtonBox.StandardButton.Close)
        if close_button is not None:
            close_button.setShortcut(QKeySequence("Ctrl+Return"))
            self._numpad = QShortcut(QKeySequence("Ctrl+Enter"), self)   # Enter ở bàn phím số (Windows)
            qconnect(self._numpad.activated, close_button.click)
        if hasattr(gui_hooks, "operation_did_execute"):
            gui_hooks.operation_did_execute.append(self._on_op)
        self.show()
        self.raise_()
        self.activateWindow()

    # Anki gọi khi mở lần nữa (bấm ✎ Sửa ở thẻ khác trong lúc cửa sổ còn mở): lưu note cũ rồi nạp note mới
    def reopen(self, card: Any) -> None:
        def go() -> None:
            if self._closed:
                return
            old = self.nid
            self.nid = int(card.nid)
            self.editor.card = card
            self.editor.set_note(card.note(), focusTo=0)
            if old != self.nid and _on_closed is not None:
                _on_closed(old)          # note trước đã lưu xong → vườn cập nhật
        if int(card.nid) == self.nid:
            return
        self.editor.call_after_note_saved(go)

    def _on_op(self, changes: Any, handler: Any) -> None:
        if self._closed or not getattr(changes, "note_text", False) or handler is self.editor:
            return
        note = self.editor.note
        if note is None:
            return
        try:
            note.load()
        except NotFoundError:      # note đã bị xoá ở chỗ khác
            self._closed = True
            self.cleanup()
            self.close()
            return
        except Exception:
            return
        self.editor.set_note(note)

    def cleanup(self) -> None:
        if hasattr(gui_hooks, "operation_did_execute"):
            try:
                gui_hooks.operation_did_execute.remove(self._on_op)
            except ValueError:
                pass
        try:
            self.editor.cleanup()
        finally:
            try:
                saveGeom(self, GEOM)
            except Exception:
                pass
            aqt.dialogs.markClosed(NAME)
            if _on_closed is not None:
                try:
                    _on_closed(self.nid)
                except Exception:
                    pass

    def closeEvent(self, evt: Any) -> None:
        if self._closed:
            return
        self._closed = True
        self.editor.call_after_note_saved(self.cleanup)

    def _saveAndClose(self) -> None:
        self._closed = True
        self.cleanup()
        try:
            mw.deferred_delete_and_garbage_collect(self)
        except Exception:
            pass
        self.close()

    def closeWithCallback(self, onsuccess: Callable[[], None]) -> None:
        """Anki đóng mọi cửa sổ (đóng hồ sơ, đồng bộ toàn bộ…): lưu xong mới đóng."""
        def callback() -> None:
            self._saveAndClose()
            onsuccess()
        if self._closed:
            onsuccess()
            return
        self.editor.call_after_note_saved(callback)


def _register() -> None:
    if NAME in aqt.dialogs._dialogs:
        return
    if hasattr(aqt.dialogs, "register_dialog"):
        aqt.dialogs.register_dialog(NAME, EditCardWindow)
    else:      # bản Anki không có register_dialog
        aqt.dialogs._dialogs[NAME] = [EditCardWindow, None]


def open_card(card: Any, on_closed: Callable[[int], None]) -> str:
    """Mở cửa sổ Sửa thẻ cho note của `card` (đang mở thì đưa lên trước, nạp note này). Trả "editor" hoặc "browser"
    (không dựng được trình sửa → mở Trình duyệt thẻ ở đúng note)."""
    global _on_closed
    _on_closed = on_closed
    try:
        _register()
        aqt.dialogs.open(NAME, card)
        return "editor"
    except Exception:
        try:
            aqt.dialogs.markClosed(NAME)
        except Exception:
            pass
        aqt.dialogs.open("Browser", mw, search=(f"nid:{int(card.nid)}",))
        return "browser"


def window() -> Any:
    try:
        return (aqt.dialogs._dialogs.get(NAME) or [None, None])[1]
    except Exception:
        return None


def is_open(nid: int | None = None) -> bool:
    w = window()
    return w is not None and not getattr(w, "_closed", False) and (nid is None or getattr(w, "nid", None) == nid)
