#!/usr/bin/env python3
"""يُخرج الحقول الناقصة بلغةٍ ما، جاهزةً للصقها في prompts/translate-single.md.

    python3 tools/export_missing.py uk            # كل الناقص
    python3 tools/export_missing.py uk ui         # قسماً بعينه
    python3 tools/export_missing.py uk issues 20  # عشرين حقلاً فقط

يُخرج لكل حقل سطوره بالعربية والإنجليزية والروسية، لأن البرومبت يشترط
الترجمة من العربية والروسية معاً — الترجمة من الروسية وحدها تُخرج نصّاً
روسيّ التركيب بحروف أخرى.

الحدّ الافتراضي عشرون حقلاً: الالتزام يسوء مع الدفعات الكبيرة، وقد وقع
في هذا المستودع أن طُلبت عشر مسائل فسُلّمت ثلاث.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "fiqhData.json"
SHOW = ("ar", "en", "ru")


def walk(node, path, out):
    """يجمع كل كائن ترجمة تحت مساره الكامل."""
    if isinstance(node, dict):
        if "ar" in node and isinstance(node.get("ar"), str):
            out.append((path, node))
            return
        for key, value in node.items():
            walk(value, f"{path}.{key}" if path else key, out)
    elif isinstance(node, list):
        for n, value in enumerate(node):
            # المسائل والمقالات تُعنون برقمها المرجعي لا بموضعها، فالفهرس
            # يتغيّر مع كل إدراج بينما الرقم دائم.
            label = value.get("ref") if isinstance(value, dict) else None
            walk(value, f"{path}[{label or n}]", out)


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    lang = sys.argv[1]
    section = sys.argv[2] if len(sys.argv) > 2 else None
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 20

    with DATA.open(encoding="utf-8") as fh:
        data = json.load(fh)

    fields = []
    walk(data, "", fields)

    missing = [
        (path, node)
        for path, node in fields
        if not (node.get(lang) or "").strip()
        and (not section or path.startswith(section))
    ]

    total = len(missing)
    for path, node in missing[:limit]:
        print(path)
        for key in SHOW:
            if node.get(key):
                print(f"{key}: {node[key]}")
        print()

    shown = min(limit, total)
    print(f"# {shown} من {total} حقلاً ناقصاً بـ«{lang}»"
          + (f" في {section}" if section else ""), file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
