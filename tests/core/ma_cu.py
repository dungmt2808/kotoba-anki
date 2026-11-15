"""Mã add-on bản cũ cho các test "máy khác còn bản cũ" (test_124, test_125, test_1251, test_128, test_130, test_131, test_ban_cu).

archive(repo, commit) → nội dung tar của thư mục kotoba_batake/ ở commit đó:
  - repo có lịch sử git (repo cũ, máy phát triển): `git archive <commit> kotoba_batake`;
  - không có (repo công khai làm lại từ 15/11, không mang lịch sử): tests/fixtures/ban_cu/<commit>.tar.gz
    (đóng từ đúng commit đó bằng `git archive <commit> kotoba_batake | gzip -9 -n`).
"""
from __future__ import annotations

import gzip
import os
import subprocess

FIXTURES = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "fixtures", "ban_cu")


def archive(repo: str, commit: str) -> bytes:
    try:
        return subprocess.run(["git", "-C", repo, "archive", commit, "kotoba_batake"], capture_output=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError):
        with gzip.open(os.path.join(FIXTURES, commit + ".tar.gz"), "rb") as f:
            return f.read()
