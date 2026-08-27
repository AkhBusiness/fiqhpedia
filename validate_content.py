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

LANGS = ["ar", "en", "ru"]
SCHOOLS = ["hanafi", "maliki", "shafii", "hanbali"]

# Text that means "not written yet" and must never ship.
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


def check_localized(obj, where, *, required=True):
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
        if PLACEHOLDERS.search(val):
            err(f"{where}.{lang}: contains placeholder text — {val[:50]}")
        if val != val.strip():
            warn(f"{where}.{lang}: leading/trailing whitespace")

        # Script sanity check
        rng = SCRIPT_RANGES.get(lang)
        if rng and not any(rng[0] <= ord(c) <= rng[1] for c in val):
            warn(f"{where}.{lang}: no {lang.upper()} script found — wrong language pasted?")

    extra = set(obj) - set(LANGS)
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
        check_localized(val, f"ui.{key}")

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
