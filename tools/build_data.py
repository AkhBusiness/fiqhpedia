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
import re
import sys
from collections import OrderedDict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "data" / "content"
OUT = ROOT / "data" / "fiqhData.json"
INDEX = ROOT / "data" / "fiqhIndex.json"


def load(path: Path):
    with path.open(encoding="utf-8") as fh:
        return json.load(fh, object_pairs_hook=OrderedDict)


def stamp_added(records, folder):
    """
    يضع `addedAt` من أوّل كوميت أضاف الملف.

    والمادة المستوردة دفعةً واحدة عند إنشاء المستودع تُستثنى: تاريخها هو
    تاريخ الاستيراد لا تاريخ كتابتها، فلو حُسبت جديدة لظهر الوسم على
    الموسوعة كلّها فأفرغه من معناه. فما وقع في أوّل كوميت لا يحمل تاريخاً،
    و«الجديد» يُقاس على ما أُضيف بعد ذلك.
    """
    import subprocess
    from datetime import date

    def run(args):
        try:
            r = subprocess.run(args, capture_output=True, text=True, timeout=15)
            return r.stdout if r.returncode == 0 else ""
        except Exception:
            return ""

    # أوّل كوميت في المستودع: ما دخل فيه مادةٌ مؤسِّسة لا إضافة يومية.
    roots = run(["git", "rev-list", "--max-parents=0", "HEAD"]).split()
    seed = set()
    if roots:
        seed = set(run(["git", "ls-tree", "-r", "--name-only", roots[-1]]).split())

    # مسار git نسبيّ من جذر المستودع، و`folder` مطلق — فتُوحَّد الصيغة،
    # وإلا لم يطابق شيءٌ شيئاً وعاد كل ملفّ يبدو إضافةً جديدة.
    repo_root = Path(run(["git", "rev-parse", "--show-toplevel"]).strip() or ".")

    for rec in records:
        # تاريخ مكتوب في الملف يُقدَّم على الاستنتاج من git: الملفّات تُبنى
        # في بيئة لا تُودَع فيها، فكان `git log` لا يجدها فيضع تاريخ اليوم
        # على الدفعة كلّها — فيظهر وسم «جديد» على الجميع ثم يختفي عن الجميع
        # دفعةً واحدة بدل أن يخبو تدريجياً.
        if rec.get("addedAt"):
            continue
        path = folder / f"{rec['ref']}.json"
        try:
            rel = str(path.resolve().relative_to(repo_root.resolve()))
        except ValueError:
            rel = str(path)
        if rel in seed:
            rec.pop("addedAt", None)
            continue
        lines = [l for l in run(
            ["git", "log", "--diff-filter=A", "--follow", "--format=%cs", "--", rel]
        ).split() if l]
        # ملفّ لم يُودَع بعد: هو جديد بالضرورة.
        rec["addedAt"] = lines[-1] if lines else date.today().isoformat()


_AR_MARKS = re.compile(r"[\u064B-\u0652\u0670\u0640]")


def _norm(name: str) -> str:
    name = _AR_MARKS.sub("", name).strip()
    for pre in ("باب ", "كتاب "):
        if name.startswith(pre):
            name = name[len(pre):]
    return name.replace("ّ", "").replace("أ", "ا").replace("إ", "ا").replace("ة", "ه").replace("ى", "ي").strip()


def parse_plan(path: Path, issues: list) -> list:
    """Read the per-book chapter tables out of the plan file."""
    if not path.exists():
        return []
    lines = path.read_text(encoding="utf-8").splitlines()
    head = re.compile(r"^## .*`([a-z]+)`\s*·\s*(\d+)\s*مس\S*(?:\s+مكتوبة من\s+(\d+))?")
    books = []
    i = 0
    while i < len(lines):
        m = head.match(lines[i])
        if not m:
            i += 1
            continue
        book = {"id": m.group(1), "planned": int(m.group(3)) if m.group(3) else None, "chapters": []}
        # first table after the heading, before the next heading
        j = i + 1
        cols = None
        while j < len(lines) and not lines[j].startswith("## "):
            row = lines[j]
            if row.startswith("|"):
                cells = [c.strip() for c in row.strip().strip("|").split("|")]
                if cols is None:
                    if any(c in ("الفصل", "الباب") for c in cells):
                        cols = cells
                elif not set(row) <= set("|-: "):
                    name_i = next(k for k, c in enumerate(cols) if c in ("الفصل", "الباب"))
                    name = re.sub(r"\*\([^)]*\)\*", "", cells[name_i]).strip()
                    status = "⬜"
                    if "الحالة" in cols:
                        st = cells[cols.index("الحالة")]
                        status = "✅" if "✅" in st else "⚠️" if "⚠️" in st else "⬜"
                    elif "مكتوب" in cols:
                        status = "✅" if re.search(r"F\d", cells[cols.index("مكتوب")]) else "⬜"
                    planned = None
                    if "مسائل" in cols and cells[cols.index("مسائل")].isdigit():
                        planned = int(cells[cols.index("مسائل")])
                    book["chapters"].append({"name": name, "status": status, "planned": planned})
                else:
                    pass
            elif cols is not None and row.strip() == "":
                break
            j += 1
        books.append(book)
        i = j
    # what is actually written, per chapter: each data chapter goes to the
    # plan row whose words it shares most ("إزالة النجاسة" → "النجاسات",
    # "نواقض الوضوء" → its own row, not "صفة الوضوء"). A data chapter no row
    # claims gets a row of its own, so no issue ever disappears from its book.
    def stems(name: str) -> set:
        out = set()
        for w in _norm(name).split():
            w = w.lstrip("و")
            if w.startswith("ال"):
                w = w[2:]
            for sfx in ("ات", "ان", "ين", "ون", "ها", "ه", "ي"):
                if w.endswith(sfx) and len(w) - len(sfx) >= 3:
                    w = w[: -len(sfx)]
                    break
            if len(w) >= 3 and w not in ("علي", "في", "من", "عن", "ما"):
                out.add(w)
        return out

    for b in books:
        mine = [x for x in issues if x["bookId"] == b["id"]]
        by_chapter = {}
        for x in mine:
            by_chapter.setdefault(x["chapter"]["ar"] if x.get("chapter") else "", []).append(x)
        for ch in b["chapters"]:
            ch["written"], ch["refs"] = 0, []
        for cname, xs in by_chapter.items():
            best, score = None, 0.0
            if cname:
                cs = stems(cname)
                for ch in b["chapters"]:
                    ps = stems(ch["name"])
                    j = len(cs & ps) / len(cs | ps) if cs | ps else 0
                    if j > score:
                        best, score = ch, j
            if best is None or score < 0.34:
                best = {"name": re.sub(r"^باب\s+", "", cname) or "—", "status": "✅", "planned": None, "written": 0, "refs": []}
                b["chapters"].append(best)
            best["chapter"] = xs[0].get("chapter")
            best["refs"].extend(x["ref"] for x in xs)
            best["written"] = len(best["refs"])
            if best["status"] == "⬜":
                best["status"] = "✅"
        for ch in b["chapters"]:
            if ch["written"] == 0 and ch["status"] == "✅":
                ch["status"] = "⚠️"
        b["written"] = len(mine)
    return books


def main() -> int:
    data = load(SRC / "core.json")
    chapters = load(SRC / "chapters.json")

    issues = [load(p) for p in sorted((SRC / "issues").glob("*.json"))]
    articles = [load(p) for p in sorted((SRC / "articles").glob("*.json"))]

    # المسودّات: تبقى كاملة على القرص ولا تدخل الموقع. تُستعمل لمادة تنتظر
    # مراجعاً مختصّاً — كمسائل التكفير والردّة — فتُحجب عن القارئ دون أن
    # يُحذف عملها. وكان هذا موصوفاً في CLAUDE.md وغير منفَّذ هنا، فالحقل
    # يُكتب ولا يفعل شيئاً والمادة تُنشر وصاحبها يحسبها محجوبة.
    # تاريخ أول ظهور الملف في git، يُحقن آلياً ليُبنى عليه وسم «جديد».
    # لا يُكتب باليد: تاريخٌ يدويّ يُنسى تحديثه فيبقى الوسم على مادة قديمة،
    # وسجلّ git لا يكذب.
    stamp_added(issues, SRC / "issues")
    stamp_added(articles, SRC / "articles")

    drafts = [i["ref"] for i in issues if i.get("draft")]
    issues = [i for i in issues if not i.get("draft")]
    articles = [a for a in articles if not a.get("draft")]
    if drafts:
        print(f"مسودّات محجوبة عن الموقع: {', '.join(drafts)}")

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

    # الفهرس الخفيف: كل شيء إلا متون الأحكام ونصوص المقالات. هو ما يُحمَّل
    # في كل صفحة؛ أمّا المتون فتُقرأ وقت البناء لصفحة المادّة وحدها، أو تُحمَّل
    # عند الطلب للبحث. كانت الموسوعة كلّها (727 ك.ب أحكاماً) تُرسَل لكل زائر
    # ولو لم يفتح مسألة واحدة، فظهر المحتوى بعد ١٨ ثانية على الجوال.
    # المفاتيح المشتركة (الواجهة والمسرد والأدلة…) تُقرأ من core.json مباشرةً،
    # فلا تُكرَّر هنا — كانت تُحمَّل مرّتين.
    index = {}
    def slim_issue(i):
        out = {k: v for k, v in i.items() if k != "rulings"}
        # الدرجات وحدها تبقى في الفهرس: شارة الحكم تحيل إلى «مسائل أخرى بنفس
        # الدرجة في هذا الباب»، وهذا يحتاج درجة كل مسألة لا نصّ حكمها.
        grades = {k: r["grade"] for k, r in i.get("rulings", {}).items() if r.get("grade")}
        if grades:
            out["grades"] = grades
        return out

    index["issues"] = [slim_issue(i) for i in ordered]
    slim_articles = []
    for a in articles:
        b = {k: v for k, v in a.items() if k != "sections"}
        langs = set()
        for sec in a.get("sections", []):
            langs.update(sec.get("body", {}).keys())
        b["words"] = {
            l: sum(len(sec["body"].get(l, "").split()) for sec in a.get("sections", []))
            for l in sorted(langs)
        }
        slim_articles.append(b)
    index["articles"] = slim_articles
    # تقسيم المادّة المشتركة بحسب من يحتاجها: نصوص الواجهة وأسماء المذاهب
    # والكتب في كل صفحة؛ أمّا المسرد (١٣٤ ك.ب) والأدلة والدليل العملي فلا
    # تُحمَّل إلا حين تُفتح، فلا تُثقل صفحةَ مسألةٍ لا تعرضها.
    core_src = load(SRC / "core.json")
    ui_part = {k: v for k, v in core_src.items() if k not in ("glossary", "theology", "guides", "faqs")}
    # نصيب «الجديد» من المسائل يُحسب هنا لا في المتصفّح: الوسم يُكتم إذا شمل
    # أكثر من نصف الموسوعة، وحسابه في المتصفّح كان يستلزم الفهرس كلّه في كل
    # صفحة. يُقاس عند البناء، والبناء يجري عند كل دفع.
    import datetime as _dt
    today = _dt.date.today()
    fresh = 0
    for i in ordered:
        try:
            d = _dt.date.fromisoformat(str(i.get("addedAt", ""))[:10])
        except ValueError:
            continue
        if 0 <= (today - d).days < 7:
            fresh += 1
    ui_part["newShare"] = round(fresh / len(ordered), 3) if ordered else 0
    for name, part in (
        ("ui.json", ui_part),
        ("glossary.json", {"glossary": core_src.get("glossary", [])}),
        ("theology.json", {"theology": core_src.get("theology", [])}),
        ("learn.json", {"guides": core_src.get("guides", []), "faqs": core_src.get("faqs", [])}),
    ):
        with (ROOT / "data" / name).open("w", encoding="utf-8") as fh:
            json.dump(part, fh, ensure_ascii=False, indent=2)
            fh.write("\n")

    # مسألة مختارة للرئيسية: واحدة فيها درجة عند المذاهب الأربعة، تُعرض بأحكامها
    # مختصرةً — فيفهم الزائر الموقع كلّه من مثال واحد بدل فقرة شرح. تُبدَّل مع
    # كل بناء (حسب يوم السنة)، وتُكتب في ملف صغير لا يحمل غيرها.
    from datetime import date as _date
    def first_sentence(t):
        for sep in ("، ", ". ", "؛ ", "; ", ", "):
            i = t.find(sep)
            if 0 < i < 140:
                return t[: i + 1].rstrip("،;,. ")
        return t if len(t) <= 140 else t[:137].rstrip() + "…"
    candidates = [
        i for i in ordered
        if all(i.get("rulings", {}).get(s, {}).get("grade") for s in ("hanafi", "maliki", "shafii", "hanbali"))
        and not i.get("draft")
    ]
    featured = None
    if candidates:
        pick = candidates[_date.today().timetuple().tm_yday % len(candidates)]
        featured = {
            "ref": pick["ref"], "id": pick["id"], "bookId": pick["bookId"],
            "chapter": pick.get("chapter"), "title": pick["title"], "summary": pick["summary"],
            "rulings": {
                s: {"grade": r["grade"], "lead": {l: first_sentence(r["text"][l]) for l in r["text"]}}
                for s, r in pick["rulings"].items()
            },
        }
    with (ROOT / "data" / "featured.json").open("w", encoding="utf-8") as fh:
        json.dump({"featured": featured}, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    with INDEX.open("w", encoding="utf-8") as fh:
        json.dump(index, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    # الاختبار: أسئلة تتولّد من المسائل التي لها درجة عند المذاهب الأربعة —
    # «ما حكم كذا عند مذهبك؟» والجواب درجتُه، والشرحُ حكمُه بنصّه. ومعها
    # أسئلة يكتبها المالك في data/content/quiz.json. ملف مستقلّ لا يُحمَّل
    # إلا في صفحة الاختبار.
    LANGS5 = ("ar", "en", "ru", "es", "uk")
    SCHOOLS4 = ("hanafi", "maliki", "shafii", "hanbali")
    quiz_auto = []
    for i in ordered:
        rs = i.get("rulings", {})
        if not all(rs.get(s, {}).get("grade") for s in SCHOOLS4):
            continue
        quiz_auto.append({
            "ref": i["ref"], "bookId": i["bookId"], "title": i["title"],
            "grades": {s: rs[s]["grade"] for s in SCHOOLS4},
            "ruling": {s: rs[s]["text"] for s in SCHOOLS4},
        })
    manual_path = SRC / "quiz.json"
    quiz_manual = load(manual_path).get("questions", []) if manual_path.exists() else []
    bad = []
    for q in quiz_manual:
        opts = q.get("options", [])
        if not q.get("id") or len(opts) < 2 or not isinstance(q.get("answer"), int) or not 0 <= q["answer"] < len(opts):
            bad.append(q.get("id", "?"))
            continue
        for f in [q.get("question", {}), q.get("explain", {}), *opts]:
            if any(not str(f.get(l, "")).strip() for l in LANGS5):
                bad.append(q["id"])
                break
    if bad:
        print(f"quiz.json: أسئلة ناقصة أو غير صالحة تُسقط: {sorted(set(bad))}")
    quiz_manual = [q for q in quiz_manual if q.get("id") not in set(bad)]
    # ملف لكل لغة: القارئ لا يحتاج إلا لغته، والنصوص الخمس معاً أربعمئة ك.ب.
    qdir = ROOT / "data" / "quiz"
    qdir.mkdir(exist_ok=True)
    for l in LANGS5:
        part = {
            "auto": [
                {"ref": q["ref"], "bookId": q["bookId"], "title": q["title"][l], "grades": q["grades"],
                 "ruling": {s: q["ruling"][s][l] for s in SCHOOLS4}}
                for q in quiz_auto
            ],
            "manual": [
                {"id": q["id"], "school": q.get("school", "all"), "bookId": q.get("bookId"), "ref": q.get("ref"),
                 "question": q["question"][l], "options": [o[l] for o in q["options"]],
                 "answer": q["answer"], "explain": q["explain"][l]}
                for q in quiz_manual
            ],
        }
        with (qdir / f"{l}.json").open("w", encoding="utf-8") as fh:
            json.dump(part, fh, ensure_ascii=False, separators=(",", ":"))
            fh.write("\n")

    # صفحة «منهجنا» من data/content/pages.json، وصفحة «المراجع» من terms.json
    # مع عدد المسائل التي يُستشهد فيها بكل كتاب — يُحسب هنا لا في المتصفّح.
    pages_src = SRC / "pages.json"
    pages = {k: v for k, v in load(pages_src).items() if not k.startswith("_")} if pages_src.exists() else {"about": []}
    with (ROOT / "data" / "pages.json").open("w", encoding="utf-8") as fh:
        json.dump(pages, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    terms = load(ROOT / "data" / "terms.json")
    cited = {}
    for i in ordered:
        for r in i.get("rulings", {}).values():
            for src in r.get("sources", []):
                cited[src["ar"]] = cited.get(src["ar"], 0) + 1
    books = [
        {"ar": name, "school": meta["school"], "cited": cited.get(name, 0),
         **{l: meta.get(l, name) for l in ("en", "ru", "es", "uk")}}
        for name, meta in terms.get("books", {}).items()
    ]
    books.sort(key=lambda b: (-b["cited"], b["ar"]))
    works = [{"ar": name, **{l: meta.get(l, name) for l in ("en", "ru", "es", "uk")}} for name, meta in terms.get("works", {}).items()]
    with (ROOT / "data" / "sources.json").open("w", encoding="utf-8") as fh:
        json.dump({"books": books, "works": works}, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    # خريطة الأبواب: من خريطة-الأبواب.md — لكل كتاب عددُ المخطّط وفصولُه
    # بحالتها (✅ ⚠️ ⬜)، ثم يُضاف المكتوب فعلاً من المسائل. المصدر الوحيد
    # للخطة هو الملف نفسه، فلا تُكتب الفصول المخطّطة في مكان ثانٍ.
    books_plan = parse_plan(ROOT / "خريطة-الأبواب.md", ordered)
    with (ROOT / "data" / "books.json").open("w", encoding="utf-8") as fh:
        json.dump({"books": books_plan}, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    # سجلّ التحديثات: من addedAt وrevisedAt/revisionNote، مجمَّعاً بالتاريخ
    # تنازلياً. المسائل والمقالات معاً؛ الأدلة بلا تواريخ فلا تدخل.
    days = {}
    for kind, items in (("issue", ordered), ("article", articles)):
        for it in items:
            row = {"kind": kind, "ref": it["ref"], "title": it["title"]}
            if it.get("addedAt"):
                days.setdefault(it["addedAt"], {"added": [], "revised": []})["added"].append(row)
            if it.get("revisedAt"):
                days.setdefault(it["revisedAt"], {"added": [], "revised": []})["revised"].append(
                    {**row, "note": it.get("revisionNote")}
                )
    changelog = [{"date": dt, **days[dt]} for dt in sorted(days, reverse=True)]
    with (ROOT / "data" / "changelog.json").open("w", encoding="utf-8") as fh:
        json.dump({"days": changelog, "totals": {"issues": len(ordered), "articles": len(articles)}}, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    # مرادفات البحث: تُنسخ كما هي بلا تعليق، فالموقع يحمّلها في كل صفحة.
    syn_src = SRC / "synonyms.json"
    synonyms = {k: v for k, v in load(syn_src).items() if not k.startswith("_")} if syn_src.exists() else {}
    with (ROOT / "data" / "synonyms.json").open("w", encoding="utf-8") as fh:
        json.dump(synonyms, fh, ensure_ascii=False, indent=2)
        fh.write("\n")

    print(f"{OUT.relative_to(ROOT)} — {len(ordered)} مسألة · {len(articles)} مقالة · فهرس {INDEX.stat().st_size // 1024} ك.ب من {OUT.stat().st_size // 1024}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
