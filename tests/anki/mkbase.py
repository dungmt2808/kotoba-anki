"""Tạo thư mục gốc Anki sẵn profile 'Test' (bỏ qua hộp thoại chọn ngôn ngữ lần đầu)."""
import sys, os
base = sys.argv[1]
os.makedirs(base, exist_ok=True)
from aqt.profiles import ProfileManager
import anki.lang
anki.lang.set_lang("en_US")
pm = ProfileManager(ProfileManager.get_created_base_folder(base))
pm.setupMeta()
pm.meta["firstRun"] = False
pm.meta["defaultLang"] = "en_US"
pm.create("Test")
pm.load("Test")
pm.profile["syncKey"] = None
pm.save()
print("profiles:", pm.profiles())
