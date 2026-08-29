#!/usr/bin/env python3
"""يبني data/terms.json (مرجع الرسم المعتمد) ويوحّد fiqhData.json عليه.

تشغيل واحد. بعده يصير terms.json هو المرجع، والمدقّق يقابل به.
"""
import json, collections

AYN, HAMZA = "\u02bf", "\u02be"
FIX = {"\u2018": AYN, "\u2019": HAMZA, "'": AYN, "`": AYN}

# ترجيح مسجَّل حيث تعادلت الصور أو وُجد خطأ حقيقي
CANON = {
    ("الخرشي على خليل", "en"): "Al-Kharashī ʿalā Khalīl",
    ("الخرشي على خليل", "ru"): "«Аль-Хараши аля Халиль»",
    ("مطالب أولي النهى", "en"): "Maṭālib Ūlī al-Nuhā",   # كانت Ulī بلا مدّ
    ("مطالب أولي النهى", "ru"): "«Маталиб ули ан-Нуха»",
    ("العناية", "ru"): "«Аль-Инайя»",
}

def norm(s):
    for k, v in FIX.items():
        s = s.replace(k, v)
    return s

d = json.load(open("data/fiqhData.json", encoding="utf-8"))

votes = collections.defaultdict(lambda: collections.defaultdict(collections.Counter))
school = {}
for i in d["issues"]:
    for sch, r in i["rulings"].items():
        for s in r["sources"]:
            school[s["ar"]] = sch
            for l in ("en", "ru"):
                votes[s["ar"]][l][s[l]] += 1

books = {}
for ar in sorted(votes):
    books[ar] = {"school": school[ar]}
    for l in ("en", "ru"):
        books[ar][l] = CANON.get((ar, l)) or norm(votes[ar][l].most_common(1)[0][0])

terms = {
    "_note": "مرجع الرسم المعتمد. يقابل به المدقّق. لا يُحرَّر إلا بقصد.",
    "_rules": {
        "ayn": "ʿ U+02BF", "hamza": "ʾ U+02BE",
        "en": "بلا إدغام شمسي: al-Durr، al-Ṭālibīn",
        "ru": "بالإدغام الشمسي: ад-Дурр، ат-Талибин",
    },
    "books": books,
}
json.dump(terms, open("data/terms.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)

changed = 0
for i in d["issues"]:
    for sch, r in i["rulings"].items():
        for s in r["sources"]:
            for l in ("en", "ru"):
                if s[l] != books[s["ar"]][l]:
                    print(f"  {i['id']:11} {sch:8} {l}: {s[l]}  →  {books[s['ar']][l]}")
                    s[l] = books[s["ar"]][l]
                    changed += 1

json.dump(d, open("data/fiqhData.json", "w", encoding="utf-8"),
          ensure_ascii=False, indent=2)
print(f"\n{len(books)} كتاباً في terms.json · {changed} حقلاً وُحّد")
