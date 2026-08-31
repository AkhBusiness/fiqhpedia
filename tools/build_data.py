#!/usr/bin/env python3
"""يجمّع `data/content/**` في `data/fiqhData.json`.

    python3 tools/build_data.py

`data/fiqhData.json` **مولَّد ولا يُحرَّر باليد** — التحرير في
`data/content/`، ملفٌ لكل مسألة ولكل مقالة.

## لماذا التقسيم

1. **لوحة التحكم.** محرّرات Git (Sveltia · Decap) تفترض ملفاً لكل عنصر.
2. **تاريخ نظيف.** تعديل مسألة كان يلمس ملفاً بحجم 240KB، فلا يُقرأ الفرق.
3. **تعارض أقل.** مسألتان لا تتشاركان ملفاً فلا يتعارض تعديلهما.

## الترقيم

`number` **لم يعد يُكتب باليد**. يُحسب هنا من:

- ترتيب الفصل في `data/content/chapters.json`
- ثم `seq` داخل الفصل — وهو موضع المسألة في خطة الباب، ثابت لا يتغيّر

فإدراج المسألة الخامسة لم يعد يزحزح رقم الثامنة. الملفات المصدر تبقى
كما هي، والترقيم يُشتقّ عند البناء.
"""
import json
import sys
from collections import OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "content"
OUT = ROOT / "data" / "fiqhData.json"


def load(path: Path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh, object_pairs_hook=OrderedDict)


def main() -> int:
    data = load(SRC / "core.json")
    chapters = load(SRC / "chapters.json")

    issues = [load(p) for p in sorted((SRC / "issues").glob("*.json"))]
    articles = [load(p) for p in sorted((SRC / "articles").glob("*.json"))]

    refs = [i["ref"] for i in issues]
    dupes = {r for r in refs if refs.count(r) > 1}
    if dupes:
        print(f"ERROR: مراجع مكررة: {', '.join(sorted(dupes))}", file=sys.stderr)
        return 1

    def sort_key(issue):
        book = issue["bookId"]
        chap = (issue.get("chapter") or {}).get("ar", "")
        order = chapters.get(book, [])
        # فصل غير مذكور في chapters.json يُلحق بالآخر لا يُسقط، ويُنبَّه عليه.
        pos = order.index(chap) if chap in order else len(order)
        if not chap:
            pos = -1  # مسألة بلا فصل تتقدّم، لا تُلحق بالآخر
        return (pos, issue.get("seq", 0), issue["ref"])

    unknown = {
        ((i["bookId"]), (i.get("chapter") or {}).get("ar", ""))
        for i in issues
        if (i.get("chapter") or {}).get("ar", "")
        and (i.get("chapter") or {}).get("ar", "") not in chapters.get(i["bookId"], [])
    }
    for book, chap in sorted(unknown):
        print(f"WARN: «{chap}» ليس في ترتيب باب {book} — أُلحق بالآخر", file=sys.stderr)

    ordered = []
    for book in data["books"]:
        group = sorted((i for i in issues if i["bookId"] == book["id"]), key=sort_key)
        for n, issue in enumerate(group, 1):
            out = OrderedDict()
            out["id"] = issue["id"]
            out["ref"] = issue["ref"]
            out["bookId"] = issue["bookId"]
            out["number"] = n  # مشتقّ، لا يُكتب في الملف المصدر
            for k, v in issue.items():
                if k not in ("id", "ref", "bookId", "seq"):
                    out[k] = v
            ordered.append(out)

    orphans = [i["ref"] for i in issues if i["bookId"] not in {b["id"] for b in data["books"]}]
    if orphans:
        print(f"ERROR: مسائل ببابٍ غير معرّف: {', '.join(orphans)}", file=sys.stderr)
        return 1

    data["issues"] = ordered
    data["articles"] = articles

    with OUT.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print(f"{OUT.relative_to(ROOT)} — {len(ordered)} مسألة · {len(articles)} مقالة")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
