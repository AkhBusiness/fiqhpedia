#!/usr/bin/env python3
"""يعرض prompts/_terms.md من data/terms.json + fiqhData.json. لا يُحرَّر باليد."""
import json

t = json.load(open("data/terms.json", encoding="utf-8"))
d = json.load(open("data/fiqhData.json", encoding="utf-8"))
books, R = t["books"], t["_rules"]

NAMES = {"hanafi": "الحنفي", "maliki": "المالكي",
         "shafii": "الشافعي", "hanbali": "الحنبلي"}

o = ["# جدول المصطلحات المقفل", "",
     "> **مولَّد من `data/terms.json` — لا يُحرَّر باليد.**",
     "> `python3 tools/gen_terms.py`", "",
     "انسخ الرسم كما هو حرفاً بحرف. لا تجتهد في نقل صوتي جديد ولو بدا لك أصوب.",
     "الجدول **مغلق**: كتاب ليس فيه يُرفض آلياً.", "",
     "## قواعد الرسم", "",
     f"- العين `{R['ayn']}` والهمزة `{R['hamza']}`. لا `'` ولا `‘` ولا `` ` ``.",
     f"- الإنجليزية {R['en']}",
     f"- الروسية {R['ru']}", ""]

for sch, ar_name in NAMES.items():
    o += [f"## كتب المذهب {ar_name}", "",
          "| العربية | English | Русский |", "|---|---|---|"]
    o += [f"| {b} | {v['en']} | {v['ru']} |"
          for b, v in sorted(books.items()) if v["school"] == sch]
    o.append("")

for head, rows in (("أسماء المذاهب", [s["name"] for s in d["schools"]]),
                   ("الأبواب", [b["name"] for b in d["books"]]),
                   ("المصطلحات", [g["term"] for g in d["glossary"]])):
    o += [f"## {head}", "", "| العربية | English | Русский |", "|---|---|---|"]
    o += [f"| {r['ar']} | {r['en']} | {r['ru']} |" for r in rows]
    o.append("")

open("prompts/_terms.md", "w", encoding="utf-8").write("\n".join(o))
print(f"prompts/_terms.md — {len(books)} كتاباً · {len(d['schools'])} مذاهب · "
      f"{len(d['books'])} أبواب · {len(d['glossary'])} مصطلحاً")
