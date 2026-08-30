#!/usr/bin/env python3
"""يوحّد أسماء الكتب المختصرة على الرسم المعتمد في data/terms.json.

    python3 tools/normalize_terms.py            # عرض ما سيتغيّر
    python3 tools/normalize_terms.py --write    # التنفيذ

المدقّق يرفض «المنهاج» لأن القائمة مغلقة، والرسم المعتمد «منهاج الطالبين».
هذا يصلحها آلياً بدل تصحيحها يدوياً في كل دفعة، ويصلح معها بقية اللغات
لأنها تُنسخ من الجدول لا من مخرجات النموذج.
"""
import json
import sys
from collections import OrderedDict

PATH = "data/fiqhData.json"
TERMS_PATH = "data/terms.json"

terms = json.load(open(TERMS_PATH, encoding="utf-8"))["books"]
aliases = {a: c for c, m in terms.items() for a in m.get("aliases", [])}

data = json.load(open(PATH, encoding="utf-8"), object_pairs_hook=OrderedDict)
write = "--write" in sys.argv
changes = []

for issue in data.get("issues", []):
    for school, ruling in issue.get("rulings", {}).items():
        for src in ruling.get("sources", []):
            ar = (src.get("ar") or "").strip()
            canon = aliases.get(ar)
            if not canon:
                continue
            changes.append(f"{issue['ref']} · {school}: «{ar}» ← «{canon}»")
            src["ar"] = canon
            # بقية اللغات تُنسخ من الجدول: رسمها مقفل ولا اجتهاد فيه.
            for lang in ("en", "ru", "es"):
                if lang in terms[canon]:
                    src[lang] = terms[canon][lang]

if not changes:
    print("لا شيء يحتاج توحيداً.")
    sys.exit(0)

for c in changes:
    print(c)

if write:
    with open(PATH, "w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"\nكُتب {len(changes)} تعديلاً في {PATH}")
else:
    print(f"\n{len(changes)} تعديلاً — أعد التشغيل بـ --write للتنفيذ")
