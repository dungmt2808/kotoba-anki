"""Tạo thư mục gốc Anki sẵn profile 'Test' (bỏ qua hộp thoại chọn ngôn ngữ lần đầu)."""
import sys, os
base = sys.argv[1]
os.makedirs(base, exist_ok=True)
from aqt.profiles import ProfileManager
import anki.lang
anki.lang.set_lang("en_US")
# Anki ≥ 2.1.5x mới có get_created_base_folder; bản cũ hơn nhận thẳng thư mục gốc (1.22.6: test tương thích nhiều bản)
pm = ProfileManager(ProfileManager.get_created_base_folder(base)) if hasattr(ProfileManager, "get_created_base_folder") else ProfileManager(base)
pm.setupMeta()
pm.meta["firstRun"] = False
pm.meta["defaultLang"] = "en_US"
pm.create("Test")
pm.load("Test")
pm.profile["syncKey"] = None
pm.save()
print("profiles:", pm.profiles())
