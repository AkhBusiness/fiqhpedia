#!/usr/bin/env python3
"""يطبع قائمة الموجود لتُلصق في ذيل البرومبت — بدل صيانتها باليد.

    python3 tools/list_existing.py theology
    python3 tools/list_existing.py issues salah
"""
import json, sys

d = json.load(open("data/fiqhData.json", encoding="utf-8"))
what = sys.argv[1] if len(sys.argv) > 1 else "theology"

if what == "theology":
    names = [p["title"]["ar"].replace("دليل ", "") for p in d["theology"]]
    print("**الأدلة الموجودة (لا تكررها):** " + "، ".join(names))
    print(f"\n({len(names)} دليلاً · المعرّفات المستعملة: {', '.join(p['id'] for p in d['theology'])})")

elif what == "issues":
    book = sys.argv[2] if len(sys.argv) > 2 else None
    rows = [i for i in d["issues"] if not book or i["bookId"] == book]
    if not rows:
        names = {b["id"]: b["name"]["ar"] for b in d["books"]}
        print(f"لا مسائل في «{names.get(book, book)}» — الباب فارغ، فلا تكرار يُتجنّب.")
    else:
        print("**تجنّب التكرار مع:** " + "، ".join(i["title"]["ar"] for i in rows))
        print(f"\n(الباب فيه {len(rows)} مسألة · الترقيم التالي يبدأ من "
              f"{max(i['number'] for i in rows) + 1} ويسنده المستودع لا جمناي)")
else:
    sys.exit("theology أو issues فقط")
