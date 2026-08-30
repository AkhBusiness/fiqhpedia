#!/usr/bin/env python3
"""
fiqhData.json content validator.

Run before every commit. Catches the failure modes that matter when
content is generated in bulk and pasted in: a missing translation, a
missing school, a broken encoding, a duplicate id, a stray placeholder.

    python3 validate_content.py            # validate
    python3 validate_content.py --stats    # validate + coverage table

Exit code 0 = clean, 1 = errors found.
"""
import json
import re
import sys
from collections import Counter, defaultdict

PATH = "data/fiqhData.json"
TERMS_PATH = "data/terms.json"

try:
    with open(TERMS_PATH, encoding="utf-8") as _fh:
        TERMS = json.load(_fh)["books"]
except (OSError, KeyError, json.JSONDecodeError):
    TERMS = {}  # لم يُبنَ بعد: python3 tools/build_terms.py

# اسم مختصر دارج ← الرسم المعتمد. «المنهاج» ← «منهاج الطالبين».
# النموذج المولّد يكتب المختصر بطبعه لأنه الدارج في كتب الفقه، فبدل
# رسالة «ليس في القائمة» الغامضة نقول له أين يذهب بالضبط.
ALIASES = {
    alias: canon
    for canon, meta in TERMS.items()
    for alias in meta.get("aliases", [])
}

# اللغات الفعّالة: كل حقل مترجم يجب أن يحملها كلها.
LANGS = ["ar", "en", "ru"]

# لغات أصولها جاهزة وترجمتها لم تكتمل. تُقبل في الحقول ولا تُشترط،
# فيمكن ترجمة الموقع على دفعات بدل «كل شيء أو لا شيء».
# لإطلاق لغة: انقل مفتاحها إلى LANGS هنا وإلى LANGS في lib/fiqh-data.ts.
PENDING_LANGS = ["es"]
SCHOOLS = ["hanafi", "maliki", "shafii", "hanbali"]

# Text that means "not written yet" and must never ship.
# نصوص واجهة وظيفتها الإعلان عن حالة «لم يكتمل بعد»، فعبارة الانتظار فيها
# هي الرسالة نفسها لا أثر عمل ناقص. تُستثنى بالمفتاح لا بالنص، حتى لا
# يفتح الاستثناء باباً لتسرّب «قريباً» إلى محتوى حقيقي.
PENDING_UI_KEYS = {"comingSoon", "betaNote", "glossaryPending"}

PLACEHOLDERS = re.compile(
    r"\b(lorem ipsum|TODO|TBD|FIXME|XXX|placeholder|coming soon)\b"
    r"|قريبا|قريباً|قيد الإعداد|نص تجريبي",
    re.IGNORECASE,
)

# Scripts we expect per language, to catch a translation pasted into the
# wrong slot (e.g. Arabic text sitting in the "en" field).
SCRIPT_RANGES = {
    "ar": (0x0600, 0x06FF),
    "ru": (0x0400, 0x04FF),
}

errors = []
warnings = []


def err(msg):
    errors.append(msg)


def warn(msg):
    warnings.append(msg)


def check_localized(obj, where, *, required=True, allow_pending_wording=False):
    """Validate a {ar, en, ru} block."""
    if obj is None:
        if required:
            err(f"{where}: missing entirely")
        return
    if not isinstance(obj, dict):
        err(f"{where}: expected an object with ar/en/ru, got {type(obj).__name__}")
        return

    for lang in LANGS:
        val = obj.get(lang)
        if val is None:
            err(f"{where}.{lang}: missing")
            continue
        if not isinstance(val, str):
            err(f"{where}.{lang}: expected string, got {type(val).__name__}")
            continue
        if not val.strip():
            err(f"{where}.{lang}: empty")
            continue
        if "\ufffd" in val:
            err(f"{where}.{lang}: contains corrupted character (U+FFFD) — {val[:50]}")
        if not allow_pending_wording and PLACEHOLDERS.search(val):
            err(f"{where}.{lang}: contains placeholder text — {val[:50]}")
        if val != val.strip():
            warn(f"{where}.{lang}: leading/trailing whitespace")

        # Script sanity check
        rng = SCRIPT_RANGES.get(lang)
        if rng and not any(rng[0] <= ord(c) <= rng[1] for c in val):
            warn(f"{where}.{lang}: no {lang.upper()} script found — wrong language pasted?")

    extra = set(obj) - set(LANGS) - set(PENDING_LANGS)
    if extra:
        warn(f"{where}: unexpected keys {sorted(extra)}")


def main():
    show_stats = "--stats" in sys.argv

    try:
        with open(PATH, encoding="utf-8") as fh:
            data = json.load(fh)
    except json.JSONDecodeError as e:
        print(f"FATAL: {PATH} is not valid JSON — line {e.lineno}, col {e.colno}: {e.msg}")
        return 1

    book_ids = {b["id"] for b in data.get("books", [])}

    # ---- books -------------------------------------------------------
    for n, b in enumerate(data.get("books", [])):
        if "id" not in b:
            err(f"books[{n}]: missing id")
        check_localized(b.get("name"), f"books[{b.get('id', n)}].name")

    # ---- issues ------------------------------------------------------
    seen_ids = Counter()
    numbers = defaultdict(list)

    for n, i in enumerate(data.get("issues", [])):
        iid = i.get("id", f"<index {n}>")
        where = f"issues[{iid}]"

        seen_ids[iid] += 1

        book = i.get("bookId")
        if not book:
            err(f"{where}: missing bookId")
        elif book not in book_ids:
            err(f"{where}: bookId '{book}' not found in books")

        num = i.get("number")
        if not isinstance(num, int):
            err(f"{where}: number must be an integer, got {num!r}")
        else:
            numbers[book].append(num)

        check_localized(i.get("title"), f"{where}.title")
        check_localized(i.get("summary"), f"{where}.summary")
        # chapter is optional by design (intro books have no chapter divisions)
        if i.get("chapter") is not None:
            check_localized(i["chapter"], f"{where}.chapter")

        rulings = i.get("rulings")
        if not isinstance(rulings, dict):
            err(f"{where}.rulings: missing or not an object")
            continue

        for school in SCHOOLS:
            r = rulings.get(school)
            if r is None:
                err(f"{where}.rulings.{school}: MISSING — all four schools are required")
                continue
            check_localized(r.get("text"), f"{where}.rulings.{school}.text")

            srcs = r.get("sources")
            if srcs is None:
                err(f"{where}.rulings.{school}.sources: missing "
                    f"(did this record skip the source->sources migration?)")
            elif not isinstance(srcs, list):
                err(f"{where}.rulings.{school}.sources: must be a list, "
                    f"got {type(srcs).__name__}")
            elif not srcs:
                err(f"{where}.rulings.{school}.sources: empty — at least one book required")
            else:
                if len(srcs) > 4:
                    warn(f"{where}.rulings.{school}.sources: {len(srcs)} books "
                         f"— more than 4 crowds the card")
                seen = []
                for n_s, one in enumerate(srcs):
                    check_localized(one, f"{where}.rulings.{school}.sources[{n_s}]")
                    if isinstance(one, dict) and isinstance(one.get("ar"), str):
                        ar = one["ar"].strip()

                        # A book must belong to the school it is cited under,
                        # and must be spelled exactly as data/terms.json says.
                        # Without this, «كشاف القناع» under hanafi validates fine.
                        if TERMS:
                            canon = TERMS.get(ar)
                            if canon is None:
                                if ar in ALIASES:
                                    err(f"{where}.rulings.{school}.sources[{n_s}]: "
                                        f"«{ar}» is a short name for «{ALIASES[ar]}» "
                                        f"— use the canonical spelling "
                                        f"(python3 tools/normalize_terms.py)")
                                else:
                                    err(f"{where}.rulings.{school}.sources[{n_s}]: "
                                        f"«{ar}» is not in {TERMS_PATH} — the book list "
                                        f"is closed; add it there first if it is genuine")
                            else:
                                if canon["school"] != school:
                                    err(f"{where}.rulings.{school}.sources[{n_s}]: "
                                        f"«{ar}» is a {canon['school']} book, cited "
                                        f"under {school}")
                                for _l in ("en", "ru", "es"):
                                    if _l not in one:
                                        continue  # لغة قيد الإضافة: تُفحص متى وُجدت
                                    if one.get(_l) != canon[_l]:
                                        err(f"{where}.rulings.{school}.sources[{n_s}].{_l}: "
                                            f"'{one.get(_l)}' does not match the locked "
                                            f"spelling '{canon[_l]}'")
                        if ar in seen:
                            err(f"{where}.rulings.{school}.sources: «{ar}» listed twice")
                        seen.append(ar)
                        for ch in ("/", "،", " و "):
                            if ch in ar:
                                err(f"{where}.rulings.{school}.sources[{n_s}]: "
                                    f"«{ar}» looks like two books in one entry "
                                    f"— split into separate list items")
                                break
                        # Titles that legitimately contain a particle.
                        KNOWN_TITLES = {"الخرشي على خليل", "شرح منتهى الإرادات"}
                        for particle in ([] if ar in KNOWN_TITLES
                                         else (" لابن ", " للـ", " لل", " على ")):
                            if particle in ar:
                                warn(f"{where}.rulings.{school}.sources[{n_s}]: "
                                     f"«{ar}» may include an author name — house style is "
                                     f"the bare title")
                                break

            if "source" in r:
                err(f"{where}.rulings.{school}: legacy 'source' field still present "
                    f"— should be 'sources' (a list)")

        unknown = set(rulings) - set(SCHOOLS)
        if unknown:
            err(f"{where}.rulings: unknown school key(s) {sorted(unknown)}")

    for iid, count in seen_ids.items():
        if count > 1:
            err(f"duplicate issue id '{iid}' appears {count} times")

    for book, nums in numbers.items():
        dupes = [n for n, c in Counter(nums).items() if c > 1]
        if dupes:
            err(f"book '{book}': duplicate issue numbers {sorted(dupes)}")
        expected = list(range(1, len(nums) + 1))
        if sorted(nums) != expected:
            warn(f"book '{book}': numbers not a clean 1..{len(nums)} sequence "
                 f"— got {sorted(nums)}")

    # ---- theology ----------------------------------------------------
    for n, p in enumerate(data.get("theology", [])):
        where = f"theology[{p.get('id', n)}]"
        check_localized(p.get("title"), f"{where}.title")
        check_localized(p.get("tagline"), f"{where}.tagline")
        check_localized(p.get("conclusion"), f"{where}.conclusion")
        for m, prem in enumerate(p.get("premises", [])):
            check_localized(prem, f"{where}.premises[{m}]")
        q = p.get("quran", {})
        check_localized(q.get("verse"), f"{where}.quran.verse")
        check_localized(q.get("ref"), f"{where}.quran.ref")

        # Qur'anic quotations: brackets must be present and balanced, and a
        # partial quotation must show an ellipsis so no reader mistakes a
        # fragment for the whole verse.
        verse = (q.get("verse") or {}).get("ar")
        if isinstance(verse, str) and verse.strip():
            v = verse.strip()
            if not (v.startswith("\u0FD3E") or v.startswith("﴿")):
                err(f"{where}.quran.verse.ar: must open with ﴿")
            if not v.endswith("﴾"):
                err(f"{where}.quran.verse.ar: must close with ﴾")
            if v.count("﴿") != v.count("﴾"):
                err(f"{where}.quran.verse.ar: unbalanced ornate brackets")
            # ellipsis presence must agree across the three languages
            marks = {
                lang: ("..." in (q["verse"].get(lang) or "")
                       or "…" in (q["verse"].get(lang) or ""))
                for lang in LANGS
            }
            if len(set(marks.values())) > 1:
                shown = ", ".join(f"{k}={'yes' if x else 'no'}" for k, x in marks.items())
                err(f"{where}.quran.verse: ellipsis is inconsistent across languages "
                    f"({shown}) — a verse is either partial in all three or none")

    # ---- glossary / faqs / guides ------------------------------------
    for n, g in enumerate(data.get("glossary", [])):
        where = f"glossary[{g.get('id', n)}]"
        check_localized(g.get("term"), f"{where}.term")
        check_localized(g.get("definition"), f"{where}.definition")

    for n, f in enumerate(data.get("faqs", [])):
        where = f"faqs[{f.get('id', n)}]"
        check_localized(f.get("question"), f"{where}.question")
        check_localized(f.get("answer"), f"{where}.answer")

    for n, g in enumerate(data.get("guides", [])):
        where = f"guides[{g.get('id', n)}]"
        check_localized(g.get("title"), f"{where}.title")
        check_localized(g.get("intro"), f"{where}.intro")
        for m, s in enumerate(g.get("steps", [])):
            check_localized(s.get("title"), f"{where}.steps[{m}].title")
            check_localized(s.get("text"), f"{where}.steps[{m}].text")

    # ---- citation refs -------------------------------------------------
    # Refs are permanent public identifiers: once shared, a ref must always
    # resolve to the same entry. Duplicates or gaps mean a link somewhere
    # now points at the wrong text.
    import re as _re

    all_refs = []
    for issue in data.get("issues", []):
        r = issue.get("ref")
        where = f"issues[{issue.get('id', '?')}]"
        if not r:
            err(f"{where}.ref: missing — every issue needs a permanent citation ref")
        elif not _re.fullmatch(r"F\d+", str(r)):
            err(f"{where}.ref: '{r}' must look like F12")
        else:
            all_refs.append(("issue", r, issue.get("id")))

    for proof in data.get("theology", []):
        r = proof.get("ref")
        where = f"theology[{proof.get('id', '?')}]"
        if not r:
            err(f"{where}.ref: missing — every proof needs a permanent citation ref")
        elif not _re.fullmatch(r"A\d+", str(r)):
            err(f"{where}.ref: '{r}' must look like A3")
        else:
            all_refs.append(("proof", r, proof.get("id")))

    seen_refs = {}
    for kind, r, owner in all_refs:
        if r in seen_refs:
            err(f"ref '{r}' used by both '{seen_refs[r]}' and '{owner}' "
                f"— refs are permanent and must be unique")
        seen_refs[r] = owner

    for prefix, kind in (("F", "issue"), ("A", "proof")):
        nums = sorted(int(r[1:]) for k, r, _ in all_refs if k == kind and r.startswith(prefix))
        if not nums:
            continue
        expected = set(range(1, max(nums) + 1))
        gaps = sorted(expected - set(nums))
        if gaps:
            warn(f"{kind} refs have gaps: {[prefix + str(g) for g in gaps]} "
                 f"— fine if those entries were retired, but never reassign them")

    # ---- articles ------------------------------------------------------
    proof_refs = {p.get("ref") for p in data.get("theology", [])}
    for n, art in enumerate(data.get("articles", [])):
        where = f"articles[{art.get('id', n)}]"
        r = art.get("ref")
        if not r or not _re.fullmatch(r"M\d+", str(r)):
            err(f"{where}.ref: '{r}' must look like M1")
        check_localized(art.get("title"), f"{where}.title")
        check_localized(art.get("excerpt"), f"{where}.excerpt")

        secs = art.get("sections")
        if not isinstance(secs, list) or not secs:
            err(f"{where}.sections: missing or empty")
        else:
            ids = []
            for m, sec in enumerate(secs):
                sid = sec.get("id", f"<{m}>")
                ids.append(sid)
                check_localized(sec.get("body"), f"{where}.sections[{sid}].body")
                # heading may be blank for the opening section, but if any
                # language has one they all must, or the TOC differs by language
                h = sec.get("heading") or {}
                filled = [l for l in LANGS if (h.get(l) or "").strip()]
                if filled and len(filled) != len(LANGS):
                    err(f"{where}.sections[{sid}].heading: present in {filled} only "
                        f"— the contents list would differ between languages")
            dupes = [i for i, c in Counter(ids).items() if c > 1]
            if dupes:
                err(f"{where}.sections: duplicate ids {dupes}")

        for rel in art.get("relatedRefs", []):
            if rel not in proof_refs:
                err(f"{where}.relatedRefs: '{rel}' does not match any proof ref")

    # ---- countries ---------------------------------------------------
    seen_codes = Counter()
    for n, c in enumerate(data.get("countries", [])):
        code = c.get("code", f"<index {n}>")
        where = f"countries[{code}]"
        seen_codes[code] += 1

        if not isinstance(c.get("code"), str) or len(c.get("code", "")) != 2:
            err(f"{where}: code must be a 2-letter string")
        if not c.get("flag"):
            err(f"{where}: missing flag")
        check_localized(c.get("name"), f"{where}.name")

        school = c.get("school", "<absent>")
        if school is None:
            pass  # deliberate: visitor picks manually
        elif school not in SCHOOLS:
            err(f"{where}.school: '{school}' is not one of {SCHOOLS} (use null for manual)")

    for code, n in seen_codes.items():
        if n > 1:
            err(f"duplicate country code '{code}' appears {n} times")

    # ---- ui keys -----------------------------------------------------
    for key, val in data.get("ui", {}).items():
        check_localized(val, f"ui.{key}",
                         allow_pending_wording=key in PENDING_UI_KEYS)

    # ---- report ------------------------------------------------------
    if show_stats:
        print("Coverage by book")
        print("-" * 46)
        counts = Counter(i.get("bookId") for i in data.get("issues", []))
        for b in data.get("books", []):
            c = counts.get(b["id"], 0)
            bar = "█" * min(c, 30)
            state = "" if c else "  (empty)"
            print(f"  {b['name']['ar']:<20} {c:>4}  {bar}{state}")
        print("-" * 46)
        print(f"  {'TOTAL':<20} {sum(counts.values()):>4}")
        print()

    for w in warnings:
        print(f"WARN   {w}")
    for e in errors:
        print(f"ERROR  {e}")

    print()
    if errors:
        print(f"FAILED — {len(errors)} error(s), {len(warnings)} warning(s)")
        return 1
    print(f"PASSED — 0 errors, {len(warnings)} warning(s)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
