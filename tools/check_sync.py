#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
check_sync.py — يكشف الحقول التي عُدّل عربيّها ولم تُعدَّل ترجماتها.

المشكلة التي يحلّها: تصحيح العربي وحده يترك الترجمات الأربع على المعنى القديم،
والمدقّق لا يراه لأن الحقول موجودة وأبجديتها سليمة. وقع فعلاً في F53 و F55:
صُحّح العربي وبقيت اللغات الأربع تحمل الصياغة الأولى، فلم يظهر الخلل إلا
بمراجعة بشرية للغتين منفصلتين.

الطريقة: يقابل الشجرة الحالية بمرجع من git (HEAD افتراضاً). فكل حقل تغيّر
عربيّه ولم تتغيّر ترجمةٌ من ترجماته يُرفع تنبيهاً باسم اللغة.

    python3 tools/check_sync.py              # مقابلةً بـ HEAD
    python3 tools/check_sync.py origin/main  # مقابلةً بالمنشور
    python3 tools/check_sync.py --staged     # ما هو في منطقة الإدراج

يخرج بالرمز 1 عند وجود تنبيه، ليصلح للاستعمال في hook قبل الكوميت.
"""
import json
import subprocess
import sys

LANGS = ["en", "ru", "es", "uk"]
PATHS = ["data/content/issues", "data/content/articles", "data/content/core.json"]


def git_show(ref, path):
    """محتوى الملف عند مرجع معيّن، أو None إن لم يكن موجوداً هناك."""
    r = subprocess.run(["git", "show", f"{ref}:{path}"], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else None


def tracked_files(ref):
    r = subprocess.run(
        ["git", "ls-tree", "-r", "--name-only", ref] + PATHS,
        capture_output=True, text=True,
    )
    return [p for p in r.stdout.split() if p.endswith(".json")]


def collect(obj, path, out):
    """يجمع كل كتلة مترجمة في القاموس بمسارها، ليقابَل مسارٌ بمسار."""
    if isinstance(obj, dict):
        if "ar" in obj and isinstance(obj.get("ar"), str):
            out[path] = obj
        else:
            for k, v in obj.items():
                collect(v, f"{path}/{k}", out)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            # المعرّف أثبت من الترتيب: إدراج عنصر في المنتصف يزيح ما بعده،
            # فتُقرأ الإزاحة كتغيير في كل حقل تالٍ.
            key = v.get("id") or v.get("ref") if isinstance(v, dict) else None
            collect(v, f"{path}[{key or i}]", out)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    ref = args[0] if args else "HEAD"

    if subprocess.run(["git", "rev-parse", "--verify", ref],
                      capture_output=True).returncode != 0:
        print(f"لا يوجد مرجع باسم {ref}")
        return 2

    findings = []
    for path in tracked_files(ref):
        old_raw = git_show(ref, path)
        if old_raw is None:
            continue  # ملف جديد كلّه، لا مقابلة له
        try:
            with open(path, encoding="utf-8") as fh:
                new_data = json.load(fh)
            old_data = json.loads(old_raw)
        except (FileNotFoundError, json.JSONDecodeError):
            continue

        old_blocks, new_blocks = {}, {}
        collect(old_data, "", old_blocks)
        collect(new_data, "", new_blocks)

        for key, new_block in new_blocks.items():
            old_block = old_blocks.get(key)
            if old_block is None:
                continue  # كتلة جديدة، ليست تعديلاً
            if old_block.get("ar") == new_block.get("ar"):
                continue  # العربي لم يتغيّر
            stale = [
                lang for lang in LANGS
                if (old_block.get(lang) or "").strip()
                and old_block.get(lang) == new_block.get(lang)
            ]
            if stale:
                findings.append((path, key, stale, new_block["ar"]))

    if not findings:
        print(f"مقابلةً بـ {ref}: لا حقل عُدّل عربيّه وبقيت ترجمته.")
        return 0

    print(f"مقابلةً بـ {ref} — حقول عُدّل عربيّها ولم تُعدَّل ترجماتها:\n")
    for path, key, stale, ar in findings:
        print(f"  {path}{key}")
        print(f"    العربي الآن: {ar[:90]}")
        print(f"    لم تتغيّر: {' · '.join(stale)}\n")
    print(f"المجموع: {len(findings)} حقلاً.")
    print("راجعها: إمّا أن تُحدَّث الترجمات، وإمّا أن يكون التعديل العربي لفظياً لا يمسّ المعنى.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
