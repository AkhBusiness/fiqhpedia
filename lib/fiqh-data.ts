/* ------------------------------------------------------------------ */
/* Comparative Fiqh Encyclopedia — typed data adapter                  */
/*                                                                     */
/* All dynamic CONTENT (books, issues, rulings, theology proofs, and   */
/* every AR/EN/RU translation) lives in `data/fiqhData.json`.          */
/* To add a new issue you ONLY append a JSON entry — no code changes.  */
/*                                                                     */
/* This module imports that JSON and layers on presentation-only       */
/* concerns (Tailwind accent colors) that intentionally do NOT belong  */
/* in the content file, then re-exports a fully typed API for the UI.  */
/* ------------------------------------------------------------------ */

import uiData from "@/data/ui.json"
import indexData from "@/data/fiqhIndex.json"
import synonymsData from "@/data/synonyms.json"
/*
 * Two files, by weight. `core.json` is the shared material every page needs
 * (interface strings, schools, books, glossary, proofs, guides). The index is
 * every issue and article *without* its body — titles, summaries, chapters —
 * so a list can be drawn and a search can begin. The bodies live in
 * `fiqhData.json`, which `lib/fiqh-full.ts` loads on demand and which the
 * per-entry pages read at build time. Before this split the whole
 * encyclopedia (1.8 MB) rode along with every page, and a phone showed the
 * first ruling after eighteen seconds.
 */

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Active languages — the single source of truth for the whole app.
 * Adding a language is one edit here plus its entries in fiqhData.json;
 * nothing else in the codebase hardcodes the list.
 */
export const LANGS = ["ar", "en", "ru", "es", "uk"] as const
export type Lang = (typeof LANGS)[number]

/**
 * Languages whose assets exist (flag, locale entry) but whose content is not
 * translated yet. Kept out of LANGS so the picker never offers a language
 * that would render an empty page. Move the key into LANGS to ship it.
 *
 * Empty since 2026-09-05: all five languages are complete and audited.
 */
export const PENDING_LANGS = [] as const
export type PendingLang = (typeof PENDING_LANGS)[number]

/** Fallback order used when a field is missing a language. */
const FALLBACK: Lang[] = ["en", "ar"]

/**
 * Read a localized field safely. Returns the requested language when present,
 * otherwise the first available fallback, otherwise an empty string.
 * Use this instead of `field[lang]` wherever a field may be partly translated.
 */
export function localized(
  field: Partial<Record<string, string>> | undefined,
  lang: Lang,
): string {
  if (!field) return ""
  const own = field[lang]
  if (typeof own === "string" && own.trim()) return own
  for (const f of FALLBACK) {
    const alt = field[f]
    if (typeof alt === "string" && alt.trim()) return alt
  }
  return ""
}

/**
 * Latin ref prefix → its Arabic initial. Each Latin letter is the initial of
 * the section name, so the Arabic letter is the initial of the same word:
 * F = Fiqh = فقه, A = ʿAqīdah = عقيدة, M = Maqālāt = مقالات.
 */
const REF_PREFIX_AR: Record<string, string> = { F: "ف", A: "ع", M: "م" }

/** Set true to also render the digits as Arabic-Indic (م١ instead of م1). */
const REF_ARABIC_DIGITS = false

/**
 * Ref as shown to the reader: "M1" stays "M1" in en/ru, becomes "م1" in ar.
 *
 * Display only. The stored ref is the permanent identifier — it is the
 * element id and the URL hash, so a shared link like #M1 must keep working
 * whatever language the next reader opens it in. Never feed this output
 * back into an id, a hash, or a lookup.
 */
export function displayRef(ref: string, lang: Lang): string {
  if (lang !== "ar") return ref
  const m = /^([A-Z])(\d+)$/.exec(ref)
  if (!m) return ref
  const letter = REF_PREFIX_AR[m[1]]
  if (!letter) return ref
  const digits = REF_ARABIC_DIGITS
    ? m[2].replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)])
    : m[2]
  return letter + digits
}

export type SchoolKey = "hanafi" | "maliki" | "shafii" | "hanbali"

export type Localized = Record<Lang, string>

export interface School {
  key: SchoolKey
  name: Localized
  /** Tailwind token bundle for the school accent color (presentation-only) */
  color: {
    text: string
    border: string
    badgeBg: string
    badgeText: string
    dot: string
    ring: string
    glow: string
  }
}

/**
 * The nine grades a ruling can carry (الحكم التكليفي والوضعي).
 * Deliberately one shared vocabulary rather than one set per school: the
 * grades are the same names everywhere, and it is their *definition* that
 * shifts. `wajib` is a rank of its own for the Ḥanafīs, and for the Ḥanbalīs
 * it coincides with `fard` in principle yet parts from it in particular
 * cases — the basmalah in wuḍūʾ is wājib and lapses through forgetfulness,
 * where a farḍ would not. So `wajib` is never silently folded into `fard`.
 */
export type RulingGrade =
  | "fard"
  | "wajib"
  | "sunnah"
  | "mandub"
  | "makruh"
  | "haram"
  | "mubah"

export const RULING_GRADES: RulingGrade[] = [
  "fard", "wajib", "sunnah", "mandub", "makruh", "haram", "mubah",
]

/**
 * Where the act sits in the structure of the worship (الحكم الوضعي).
 * Kept apart from the grade because the two do not compete: washing the face
 * is both farḍ and a rukn, and forcing a choice between them invents
 * disagreement. The Ḥanbalīs call it a rukn and the other three call it a
 * farḍ — put in one field, the badge would show a split where the schools
 * in fact agree.
 */
export type RulingNature = "rukn" | "shart" | "sabab" | "mani"

export const RULING_NATURES: RulingNature[] = ["rukn", "shart", "sabab", "mani"]

export interface SchoolRuling {
  ruling: Localized
  /**
   * Absent by design on questions that carry no such grade — when a prayer
   * time begins, how much water counts as plentiful — so those show no badge
   * rather than a wrong one.
   */
  grade?: RulingGrade
  /** Structural role, independent of the grade above. Also optional. */
  nature?: RulingNature
  /** One or more relied-upon (معتمد) books of the school. Never empty. */
  references: Localized[]
}

export interface Issue {
  id: string
  /**
   * ISO date of the commit that first added this entry, injected by
   * build_data.py from git rather than written by hand — a hand-kept date is
   * forgotten and then marks old material as new. Drives the "new" badge.
   */
  addedAt?: string
  /**
   * ISO date of a **substantive** revision: a ruling corrected, a reference
   * changed, or a wording that was being read to mean something it did not.
   * Written by hand, never derived from git — git would fire on every typo and
   * every translation touch-up, and a badge that appears for a comma teaches
   * the reader to ignore it. Spelling, translation and formatting fixes carry
   * no date at all. Drives the "revised" badge.
   */
  revisedAt?: string
  /**
   * One line saying what the revision was, shown on the badge. A "revised"
   * mark on a fiqh entry reads as *the ruling changed*; without a stated
   * reason the reader cannot tell a corrected ruling from a reworded one.
   * Required whenever `revisedAt` is set.
   */
  revisionNote?: Localized
  /** Permanent site-wide citation ref (e.g. "F12"). Never reused or renumbered. */
  ref: string
  categoryId: string
  number: number
  /** Optional traditional chapter/باب label (e.g. Hanbali sequence of Kitāb al-Ṭahārah) */
  chapter?: Localized
  title: Localized
  summary: Localized
  /**
   * Present on a full entry (the per-entry page, search results loaded on
   * demand). Absent on the index that every page carries — a list of titles
   * does not need 727 KB of rulings behind it.
   */
  rulings?: Record<SchoolKey, SchoolRuling>
  /** Each school's grade, present on both the index and a full entry. */
  grades?: Partial<Record<SchoolKey, RulingGrade>>
}

/** An issue with its rulings — what the entry page and the search work on. */
export type FullIssue = Issue & { rulings: Record<SchoolKey, SchoolRuling> }
/** An article with its sections. */
export type FullArticle = Article & { sections: ArticleSection[] }

/** A country and the school it defaults to. `school: null` means the visitor
 *  is asked to pick one himself (the country follows more than one, or one
 *  outside the four Sunni schools). */
export interface Country {
  code: string
  flag: string
  name: Localized
  school: SchoolKey | null
}

export interface ArticleSection {
  id: string
  /** Empty for the opening section, which runs before any heading. */
  heading: Localized
  /** Prose. Blank lines separate paragraphs; **bold** marks a lead-in. */
  body: Localized
}

export interface Article {
  id: string
  /** Permanent site-wide citation ref (e.g. "M1"). Never reused. */
  ref: string
  /** Optional chapter label, for articles that sit in a traditional باب. */
  chapter?: Localized
  /** Position within the chapter, so an argument precedes what builds on it. */
  seq?: number
  title: Localized
  excerpt: Localized
  /** Refs of proofs that argue the same ground more formally. */
  relatedRefs: string[]
  /** Present on a full entry; absent on the index every page carries. */
  sections?: ArticleSection[]
  /** Word count per language, computed at build time so the index can show a reading time without the body. */
  words?: Record<string, number>
  /**
   * Works the article draws on. Unlike a ruling's `references`, these are not
   * school books: a narrative article may cite tafsīr, sīrah, or history.
   * Spellings live under `works` in data/terms.json.
   */
  sources?: Localized[]
}

export interface Category {
  id: string
  name: Localized
}

/** One school's technical (اصطلاحاً) definition with its references. */
export interface GlossarySchoolSense {
  text: Localized
  sources: Localized[]
}

export interface GlossaryTerm {
  id: string
  term: Localized
  /**
   * One-line gloss shown in the inline tooltip. Always present after
   * loading: old entries carry `definition`, new ones `briefDefinition`,
   * and the loader copies whichever exists into both so every reader
   * can rely on either name.
   */
  definition: Localized
  briefDefinition?: Localized
  /**
   * The scholarly senses shown on the glossary page. Optional: a term
   * carries them once written. `technical` is per school — the same term
   * is defined differently by each madhhab — so it is keyed by school,
   * not by language. Never fill these with placeholder prose.
   */
  linguistic?: Localized
  technical?: Partial<Record<SchoolKey, GlossarySchoolSense>>
  legal?: Localized
}

/** DOM id and URL hash for a glossary entry: #term-najasah */
export function glossaryAnchor(id: string): string {
  return `term-${id}`
}

export interface GuideStep {
  title: Localized
  text: Localized
}

export interface Guide {
  id: string
  bookId: string
  title: Localized
  intro: Localized
  steps: GuideStep[]
}

export interface Faq {
  id: string
  category: Localized
  question: Localized
  answer: Localized
}

export interface TheologyProof {
  id: string
  /** Permanent site-wide citation ref (e.g. "A3"). Never reused or renumbered. */
  ref: string
  /**
   * The chapter of creed this proof belongs to. Eleven proofs listed flat
   * read as an undifferentiated pile: the reader cannot tell what any one of
   * them is for. Grouped, the shape of the argument shows — the Creator
   * first, then prophethood, then the Qurʾān and the link to Him.
   */
  chapterId?: string
  chapter?: Localized
  title: Localized
  tagline: Localized
  /** Tailwind token bundle for the proof accent color (presentation-only) */
  accent: {
    text: string
    border: string
    dot: string
    ring: string
    glow: string
  }
  premises: Localized[]
  /**
   * `verse` is Arabic only, by policy: published translations are under
   * copyright, and a rendering of the meaning needs a specialist per
   * language. `url` sends the reader to a reviewed translation instead.
   */
  quran: { verse: string; ref: Localized; url?: string }
  conclusion: Localized
}

/* ------------------------------------------------------------------ */
/* Shape of the externalized JSON content                              */
/* ------------------------------------------------------------------ */

interface RawCountry {
  code: string
  flag: string
  name: Localized
  school: string | null
}

interface RawSchoolRuling {
  grade?: RulingGrade
  nature?: RulingNature
  text: Localized
  /** Current shape: one or more relied-upon books. */
  sources?: Localized[]
  /** Pre-migration shape. Still accepted so a single stale record
   *  degrades gracefully instead of failing the whole static build. */
  source?: Localized
}

export interface RawIssue {
  id: string
  addedAt?: string
  revisedAt?: string
  revisionNote?: Localized
  ref: string
  bookId: string
  number: number
  chapter?: Localized
  title: Localized
  summary: Localized
  /** On the index only: each school's grade, so cross-references work without the rulings. */
  grades?: Partial<Record<SchoolKey, RulingGrade>>
  rulings?: Record<SchoolKey, RawSchoolRuling>
}

export interface RawTheologyProof {
  id: string
  ref: string
  chapterId?: string
  chapter?: Localized
  title: Localized
  tagline: Localized
  premises: Localized[]
  /**
   * `verse` is Arabic only, by policy: published translations are under
   * copyright, and a rendering of the meaning needs a specialist per
   * language. `url` sends the reader to a reviewed translation instead.
   */
  quran: { verse: string; ref: Localized; url?: string }
  conclusion: Localized
}

interface RawData {
  languages: {
    key: Lang | PendingLang
    short: string
    label: string
    flag: string
    flagCode: string
    /** Listed in the picker but not selectable yet — shows a "soon" badge. */
    pending?: boolean
  }[]
  ui: Record<string, Localized>
  gradeLabels?: Record<string, Localized>
  natureLabels?: Record<string, Localized>
  books: Category[]
  countries: RawCountry[]
  articles?: (Article & { words?: Record<string, number> })[]
  schools: { key: SchoolKey; name: Localized }[]
  issues: RawIssue[]
}

const data = { ...(uiData as unknown as RawData), issues: indexData.issues, articles: indexData.articles } as unknown as RawData

/* ------------------------------------------------------------------ */
/* Presentation-only accent maps (kept out of the content JSON)        */
/* ------------------------------------------------------------------ */

const SCHOOL_COLORS: Record<SchoolKey, School["color"]> = {
  hanafi: {
    text: "text-amber-800 dark:text-amber-500",
    border: "border-amber-500/40",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-800 dark:text-amber-500",
    dot: "bg-amber-500",
    ring: "hover:border-amber-500/70",
    glow: "hover:shadow-[0_0_24px_-6px] hover:shadow-amber-500/40",
  },
  maliki: {
    text: "text-emerald-800 dark:text-emerald-500",
    border: "border-emerald-500/40",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-800 dark:text-emerald-500",
    dot: "bg-emerald-500",
    ring: "hover:border-emerald-500/70",
    glow: "hover:shadow-[0_0_24px_-6px] hover:shadow-emerald-500/40",
  },
  shafii: {
    text: "text-blue-700 dark:text-blue-500",
    border: "border-blue-500/40",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-700 dark:text-blue-500",
    dot: "bg-blue-500",
    ring: "hover:border-blue-500/70",
    glow: "hover:shadow-[0_0_24px_-6px] hover:shadow-blue-500/40",
  },
  hanbali: {
    text: "text-cyan-800 dark:text-cyan-500",
    border: "border-cyan-500/40",
    badgeBg: "bg-cyan-500/15",
    badgeText: "text-cyan-800 dark:text-cyan-500",
    dot: "bg-cyan-500",
    ring: "hover:border-cyan-500/70",
    glow: "hover:shadow-[0_0_24px_-6px] hover:shadow-cyan-500/40",
  },
}

/**
 * Colour by chapter, not by proof.
 *
 * Four of the eleven proofs used to carry a colour each and the remaining
 * seven fell through to a grey default, so the section looked half-finished
 * — and the four colours meant nothing anyway: amber and blue said no more
 * about contingency and design than any other pair would have. Now the three
 * chapters of the creed each hold one colour, so the colour carries the
 * grouping instead of decorating it.
 */
export const CHAPTER_ACCENTS: Record<string, TheologyProof["accent"]> = {
  // الإلهيات — إثبات الخالق ووحدانيته
  ilahiyyat: {
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/40",
    dot: "bg-amber-500",
    ring: "hover:border-amber-500/70",
    glow: "hover:shadow-[0_0_30px_-8px] hover:shadow-amber-500/40",
  },
  // النبوّات — الحاجة إليها ووحدة مصدرها
  nubuwwat: {
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/40",
    dot: "bg-emerald-500",
    ring: "hover:border-emerald-500/70",
    glow: "hover:shadow-[0_0_30px_-8px] hover:shadow-emerald-500/40",
  },
  // القرآن وصلة العبد بربّه
  quran_sila: {
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-500/40",
    dot: "bg-blue-500",
    ring: "hover:border-blue-500/70",
    glow: "hover:shadow-[0_0_30px_-8px] hover:shadow-blue-500/40",
  },
}

export const DEFAULT_PROOF_ACCENT: TheologyProof["accent"] = {
  text: "text-foreground",
  border: "border-border",
  dot: "bg-muted-foreground",
  ring: "hover:border-primary/50",
  glow: "hover:shadow-[0_0_30px_-8px] hover:shadow-primary/30",
}

const DEFAULT_SCHOOL_COLOR: School["color"] = {
  text: "text-zinc-300",
  border: "border-white/20",
  badgeBg: "bg-white/10",
  badgeText: "text-zinc-200",
  dot: "bg-zinc-400",
  ring: "hover:border-white/40",
  glow: "hover:shadow-[0_0_24px_-6px] hover:shadow-white/20",
}

/* ------------------------------------------------------------------ */
/* Exported, fully-typed data — mapped dynamically from the JSON       */
/* ------------------------------------------------------------------ */

/**
 * Interface strings, read from their source and never from the built file.
 *
 * They used to come from data/fiqhData.json, which build_data.py copies them
 * into. That file is committed, and the host serves the committed copy — it
 * does not rebuild it. So a component that shipped together with a new string
 * read a copy made before the string existed, got `undefined`, and the whole
 * page fell over ("This page couldn't load", 2026-10-07). Code and its strings
 * now travel in the same commit by construction.
 *
 * And a key that is still missing renders as nothing rather than throwing:
 * one absent label must never take the page down with it. The miss is logged
 * so it is found, not swallowed.
 */
const MISSING: Localized = { ar: "", en: "", ru: "", es: "", uk: "" }
export const ui: Record<string, Localized> = new Proxy(
  (uiData as { ui: Record<string, Localized> }).ui,
  {
    get(target, key, receiver) {
      if (typeof key !== "string" || key in Object.prototype || key === "toJSON" || key === "then") {
        return Reflect.get(target, key, receiver)
      }
      const value = target[key]
      if (value) return value
      if (typeof console !== "undefined") console.error(`ui: missing string "${key}"`)
      return MISSING
    },
  },
)

/** Display name of each grade, per language. */
export const gradeLabels = (data.gradeLabels ?? {}) as Record<string, Localized>

/**
 * Display name of each structural role. Kept in its own map rather than
 * alongside the grades: sharing one map is how the two would quietly merge
 * again at the display layer, after being separated in the data.
 */
export const natureLabels = (data.natureLabels ?? {}) as Record<string, Localized>

/** How long an entry keeps its "new" badge. */
export const NEW_FOR_DAYS = 7

/**
 * Whether an entry still counts as newly added.
 *
 * Seven days rather than two: the site is static and a reader may not return
 * for several days, and a badge that has already expired by their next visit
 * proves nothing about the work being done.
 */
export function isRecentlyAdded(addedAt?: string, now: Date = new Date()) {
  if (!addedAt) return false
  const then = new Date(`${addedAt}T00:00:00Z`)
  if (Number.isNaN(then.getTime())) return false
  const days = (now.getTime() - then.getTime()) / 86_400_000
  if (days < 0 || days >= NEW_FOR_DAYS) return false
  // A badge on everything is a badge on nothing. The repository itself is
  // only days old, so a plain date test marks the whole encyclopedia new
  // and tells the reader nothing. The badge is therefore suppressed unless
  // the recent entries are a genuine minority of what is published.
  return recentShare() <= NEW_MAX_SHARE
}

/** Ceiling on how much of the site may wear the badge at once. */
const NEW_MAX_SHARE = 0.5
let recentShareCache: number | null = null

function recentShare() {
  if (recentShareCache !== null) return recentShareCache
  const now = Date.now()
  const fresh = issues.filter((i) => {
    if (!i.addedAt) return false
    const t = new Date(`${i.addedAt}T00:00:00Z`).getTime()
    if (Number.isNaN(t)) return false
    const days = (now - t) / 86_400_000
    return days >= 0 && days < NEW_FOR_DAYS
  }).length
  recentShareCache = issues.length ? fresh / issues.length : 0
  return recentShareCache
}

/**
 * How long an entry keeps its "revised" badge — shorter than the seven days of
 * "new". "New" addresses a reader discovering the entry for the first time;
 * "revised" addresses one who has already read it and needs telling that it
 * moved. That second reader either returns soon or the mark is pointless.
 */
export const REVISED_FOR_DAYS = 3

/**
 * Whether an entry carries a recent substantive revision.
 *
 * An entry that is still new shows no revision badge: a reader meeting it for
 * the first time has no earlier version to be corrected about, and the two
 * badges side by side say nothing coherent. "New" wins.
 */
export function isRecentlyRevised(
  revisedAt?: string,
  addedAt?: string,
  now: Date = new Date(),
) {
  if (!revisedAt) return false
  if (isRecentlyAdded(addedAt, now)) return false
  const then = new Date(`${revisedAt}T00:00:00Z`)
  if (Number.isNaN(then.getTime())) return false
  const days = (now.getTime() - then.getTime()) / 86_400_000
  return days >= 0 && days < REVISED_FOR_DAYS
}

/** Entries added most recently first — for a "what's new" list. */
export function recentlyAdded(limit = 10) {
  return issues
    .filter((i) => i.addedAt)
    .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""))
    .slice(0, limit)
}


/** Grades whose glossary entry is filed under a different id. */
export const GRADE_TERM_IDS: Record<string, string> = { sunnah: "sunnah-grade" }

/** Resolve a citation ref like "F12" or "a3" (case-insensitive) to its entry. */
export function findByRef(
  ref: string,
):
  | { kind: "issue"; item: Issue }
  | { kind: "proof"; ref: string }
  | { kind: "article"; item: Article }
  | null {
  const key = ref.trim().toUpperCase()
  const issue = issues.find((i) => i.ref === key)
  if (issue) return { kind: "issue", item: issue }
  // Proofs are not in the index every page carries; their page answers
  // for them (and 404s for a ref that was never issued).
  if (/^A\d+$/.test(key)) return { kind: "proof", ref: key }
  const article = articles.find((a) => a.ref === key)
  if (article) return { kind: "article", item: article }
  return null
}

export const langLabels: {
  key: Lang | PendingLang
  short: string
  label: string
  flag: string
  flagCode: string
  pending?: boolean
}[] = data.languages

/** Languages that render right-to-left (behavioral, not content). */
export const rtlLangs: Lang[] = ["ar"]

export const schools: School[] = data.schools.map((s) => ({
  key: s.key,
  name: s.name,
  color: SCHOOL_COLORS[s.key] ?? DEFAULT_SCHOOL_COLOR,
}))

const SCHOOL_KEYS: SchoolKey[] = ["hanafi", "maliki", "shafii", "hanbali"]

/** Countries sorted by their name in the active language is done at render
 *  time; the raw order here follows the source data. An unrecognised school
 *  string degrades to null (manual pick) rather than producing a broken key. */
export const countries: Country[] = data.countries.map((c) => ({
  code: c.code,
  flag: c.flag,
  name: c.name,
  school: SCHOOL_KEYS.includes(c.school as SchoolKey) ? (c.school as SchoolKey) : null,
}))

/**
 * Articles in reading order: by chapter as the chapters are listed, then by
 * `seq` within each. An argument should come before what builds on it —
 * the proof of a Creator before the account of what He created.
 */
export const articles: Article[] = (() => {
  const list = (data.articles ?? []) as Article[]
  // Chapters run from what assumes least of the reader to what assumes most:
  // a rational argument first, then the history open to anyone's inspection,
  // then what is reported on the authority of revelation, then the wisdoms
  // behind its rulings. Deriving the order from whichever article happens to
  // be filed first would put the reported before the argued.
  const PREFERRED = [
    "مسائل الوجود الكبرى",
    "معرفة الله وصفاته",
    "تاريخ الأديان ونصوصها",
    "الخلق والكون",
    "حِكَم التشريع",
  ]
  const chapterOrder = new Map<string, number>(PREFERRED.map((c, i) => [c, i]))
  for (const a of list) {
    const key = a.chapter?.ar ?? ""
    if (!chapterOrder.has(key)) chapterOrder.set(key, chapterOrder.size)
  }
  return [...list].sort(
    (a, b) =>
      (chapterOrder.get(a.chapter?.ar ?? "") ?? 0) -
        (chapterOrder.get(b.chapter?.ar ?? "") ?? 0) ||
      (a.seq ?? 99) - (b.seq ?? 99) ||
      a.ref.localeCompare(b.ref, undefined, { numeric: true }),
  )
})()

/** The article chapters, in the order articles are listed. */
export const articleChapters: Localized[] = (() => {
  const seen = new Set<string>()
  const out: Localized[] = []
  for (const a of articles) {
    const key = a.chapter?.ar
    if (key && !seen.has(key)) {
      seen.add(key)
      out.push(a.chapter as Localized)
    }
  }
  return out
})()

export const categories: Category[] = data.books

/* Accepts either the current `sources` array or the legacy single `source`.
 * Returns an array in every case, so downstream `.map` is always safe.
 * Bad data is caught by validate_content.py before commit; this guard only
 * ensures one malformed record cannot take down the entire deployment. */
function toReferences(r: RawSchoolRuling): Localized[] {
  if (Array.isArray(r.sources)) return r.sources
  if (r.source) return [r.source]
  return []
}

export function toIssue(i: RawIssue): Issue {
  return {
    id: i.id,
    ref: i.ref,
    categoryId: i.bookId,
    number: i.number,
    addedAt: i.addedAt,
    ...(i.revisedAt ? { revisedAt: i.revisedAt } : {}),
    ...(i.revisionNote ? { revisionNote: i.revisionNote } : {}),
    ...(i.chapter ? { chapter: i.chapter } : {}),
    title: i.title,
    summary: i.summary,
    grades:
      i.grades ??
      (i.rulings
        ? (Object.fromEntries(
            Object.entries(i.rulings)
              .filter(([, r]) => r.grade)
              .map(([k, r]) => [k, r.grade as RulingGrade]),
          ) as Partial<Record<SchoolKey, RulingGrade>>)
        : undefined),
    ...(i.rulings
      ? {
          rulings: Object.fromEntries(
            Object.entries(i.rulings).map(([key, r]) => [
              key,
              { ruling: r.text, grade: r.grade, nature: r.nature, references: toReferences(r) },
            ]),
          ) as Record<SchoolKey, SchoolRuling>,
        }
      : {}),
  }
}

export const issues: Issue[] = data.issues.map(toIssue)

/**
 * Chapters of one book, in reading order, each with its issue count.
 *
 * Derived from the issues themselves rather than a separate list: a chapter
 * exists on the site exactly when an issue sits in it, so the filter can
 * never offer a heading that leads to an empty page. Order follows `number`,
 * which the build step derives from data/content/chapters.json.
 */
export function chaptersOf(categoryId: string): { key: string; name: Localized; count: number }[] {
  const seen = new Map<string, { key: string; name: Localized; count: number }>()
  for (const issue of issues) {
    if (issue.categoryId !== categoryId || !issue.chapter) continue
    const key = issue.chapter.ar
    const found = seen.get(key)
    if (found) found.count += 1
    else seen.set(key, { key, name: issue.chapter, count: 1 })
  }
  return [...seen.values()]
}

/* ------------------------------------------------------------------ */
/* Search — normalized, cross-language, cross-section                  */
/* ------------------------------------------------------------------ */

/**
 * Fold a string to a comparable form.
 *
 * Arabic is the reason this exists. Content is written with harakat
 * (تَيَمُّم) while readers type without them (تيمم), and the same word appears
 * as أحكام / احكام and صلاة / صلاه. A raw `includes` misses all of those, so
 * the search box looked broken on its own content. Latin and Cyrillic get
 * NFD-folding for the same reason (é → e).
 */
export function normalizeSearch(s: string): string {
  return s
    .normalize("NFD")
    // Latin/Cyrillic combining marks. The Arabic block is handled below,
    // so this range is safe to strip wholesale.
    .replace(/[\u0300-\u036F]/g, "")
    .toLowerCase()
    // Arabic combining marks: harakat, plus the hamza signs that NFD splits
    // off (أ → ا + U+0654). Stopping at U+0652 left the detached hamza
    // behind, so أحكام and احكام still failed to match.
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u0622\u0623\u0625\u0671]/g, "\u0627") // آ أ إ ٱ → ا
    .replace(/\u0629/g, "\u0647") // ة → ه
    .replace(/\u0649/g, "\u064A") // ى → ي
    .replace(/\u0624/g, "\u0648") // ؤ → و
    .replace(/\u0626/g, "\u064A") // ئ → ي
    .replace(/[.,;:!؟?()"'«»\[\]{}—–\-_/\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/* ------------------------------------------------------------------ */
/* Search: tokens, stems, synonyms, scoring                            */
/* ------------------------------------------------------------------ */

/**
 * Words a query carries that no page is about. Dropped before matching,
 * unless the whole query is made of them. "حكم" is here on purpose: it
 * opens nearly every title, so it never narrows anything.
 */
const STOPWORDS = new Set(
  (
    "في على من عن الى و او هل ما ماذا اني انا انه انها هو هي ثم لو اذا مع بعد قبل كل عند حكم يجوز جائز " +
    "ممكن اقدر يصح يصير لازم لي لك له لها بس كذا هذا هذه ذلك التي الذي ان قد لا ليس مو ايش وش ليش شو " +
    "the a an is are of in on for to with what how when can i my does do it be at by or and if not " +
    "и в на с что ли у к о по за из не это " +
    "y el la de en es que un una los las al del se no " +
    "і в на з що як у до не це"
  ).split(" "),
)

const AR_PREFIXES = ["وبال", "فبال", "وال", "بال", "كال", "فال", "ولل", "لل", "ال", "و", "ف", "ب", "ل", "ك"]
const AR_SUFFIXES = ["هما", "كما", "ات", "ان", "ين", "ون", "ها", "هم", "هن", "كم", "كن", "نا", "ية", "يه", "تي", "تك", "ته", "ه", "ك", "ي", "ا", "ت"]
const CYR_SUFFIXES = ["ами", "ями", "ого", "его", "ому", "ему", "ыми", "ими", "ой", "ей", "ом", "ем", "ах", "ях", "ов", "ев", "ие", "ия", "ию", "ии", "ые", "ые", "а", "я", "ы", "и", "у", "ю", "е", "о"]
const LAT_SUFFIXES = ["ing", "ed", "es", "s"]

/**
 * A light stem for matching, not for linguistics: strip one clitic prefix
 * and one or two suffixes so "خطيبتي" and "صليت" and "الجوارب" meet
 * their dictionary forms. Collisions are harmless — the stem is only
 * compared with stems built the same way from the page text, and the
 * plain substring match still runs first.
 */
export function stem(token: string): string {
  let t = token
  if (/^[\u0621-\u064A]+$/.test(t)) {
    for (const p of AR_PREFIXES) {
      if (t.startsWith(p) && t.length - p.length >= 3) {
        t = t.slice(p.length)
        break
      }
    }
    for (let pass = 0; pass < 2; pass++) {
      for (const sfx of AR_SUFFIXES) {
        if (t.endsWith(sfx) && t.length - sfx.length >= 3) {
          t = t.slice(0, -sfx.length)
          break
        }
      }
    }
    // Imperfect-verb letters: ينقض / تنقض / نفطر → نقض / فطر.
    if (/^[يتن]/.test(t) && t.length >= 4) t = t.slice(1)
    return t
  }
  if (/[\u0400-\u04FF]/.test(t)) {
    for (const sfx of CYR_SUFFIXES) {
      if (t.endsWith(sfx) && t.length - sfx.length >= 4) return t.slice(0, -sfx.length)
    }
    return t
  }
  for (const sfx of LAT_SUFFIXES) {
    if (t.endsWith(sfx) && t.length - sfx.length >= 4) return t.slice(0, -sfx.length)
  }
  return t
}

const SYNONYMS: Record<string, string[]> = (() => {
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(synonymsData as Record<string, string[]>)) {
    const key = stem(normalizeSearch(k))
    out[key] = [...(out[key] ?? []), ...v.map(normalizeSearch)]
  }
  return out
})()

/** One query word and every form it may take on a page. */
export interface TokenGroup {
  forms: string[]
  stems: string[]
}

/**
 * Split a query into groups: each word plus its synonyms. A group matches
 * when any of its forms occurs, and a page matches when every group does.
 */
export function queryTokens(query: string): TokenGroup[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean)
  const kept = words.filter((w) => !STOPWORDS.has(w))
  return (kept.length ? kept : words).map((w) => {
    const st = stem(w)
    const forms = [w, ...(SYNONYMS[st] ?? [])]
    return { forms, stems: forms.map(stem) }
  })
}

interface Field {
  text: string
  stems: Set<string>
}
function toField(parts: string[]): Field {
  const text = normalizeSearch(parts.join(" \u0000 "))
  return { text, stems: new Set(text.split(" ").map(stem)) }
}
function fieldHas(f: Field, g: TokenGroup): boolean {
  for (const form of g.forms) if (f.text.includes(form)) return true
  for (const st of g.stems) if (f.stems.has(st)) return true
  return false
}

/** Title · chapter and book · summary · the rulings, weighted in that order. */
interface IssueFields {
  title: Field
  meta: Field
  summary: Field
  body: Field
}
function buildFields(issue: Issue): IssueFields {
  const book = categories.find((c) => c.id === issue.categoryId)
  const title: string[] = [issue.ref]
  const meta: string[] = []
  const summary: string[] = []
  const body: string[] = []
  for (const l of LANGS) {
    title.push(issue.title[l])
    summary.push(issue.summary[l])
    if (issue.chapter) meta.push(issue.chapter[l])
    if (book) meta.push(book.name[l])
    if (issue.rulings) {
      for (const s of schools) {
        const r = issue.rulings[s.key]
        if (r) body.push(s.name[l], r.ruling[l], ...r.references.map((ref) => ref[l]))
      }
    }
  }
  return { title: toField(title), meta: toField(meta), summary: toField(summary), body: toField(body) }
}

// Keyed by id *and* by whether rulings were present, so a full entry loaded
// later is not answered from the fields of its slim twin.
const FIELDS = new Map<string, IssueFields>()
function fieldsOf(issue: Issue): IssueFields {
  const key = issue.id + (issue.rulings ? ":full" : ":index")
  let f = FIELDS.get(key)
  if (!f) {
    f = buildFields(issue)
    FIELDS.set(key, f)
  }
  return f
}

const WEIGHTS: [keyof IssueFields, number][] = [
  ["title", 4],
  ["meta", 2],
  ["summary", 1.5],
  ["body", 1],
]

/**
 * How well an issue answers the query. 0 when a group is missing (every
 * word must be found, somewhere); with `any`, pages that hold only some of
 * the words score too, ranked by how many — the "near results" shown when
 * nothing holds them all.
 */
export function scoreIssue(issue: Issue, groups: TokenGroup[], any = false): number {
  if (!groups.length) return 0
  const f = fieldsOf(issue)
  let score = 0
  let found = 0
  for (const g of groups) {
    let best = 0
    for (const [k, w] of WEIGHTS) if (fieldHas(f[k], g)) best = Math.max(best, w)
    if (best === 0) {
      if (!any) return 0
      continue
    }
    found++
    score += best
  }
  if (found === 0) return 0
  // Among equals, the shorter title is the more specific page: "when ʿaṣr
  // begins" over "making up ẓuhr with ʿaṣr for a woman purified late".
  return found * 10 + score + 1 / (f.title.text.length + 1)
}

/** True when every word of `query` (or a synonym of it) is found. */
export function issueMatchesQuery(issue: Issue, query: string): boolean {
  if (!normalizeSearch(query)) return true
  return scoreIssue(issue, queryTokens(query)) > 0
}

/** Rank a pool of issues; the index order breaks ties. */
export function rankIssues<T extends Issue>(pool: T[], groups: TokenGroup[], any = false): T[] {
  const scored: [T, number][] = []
  for (const i of pool) {
    const s = scoreIssue(i, groups, any)
    if (s > 0) scored.push([i, s])
  }
  return scored.sort((a, b) => b[1] - a[1]).map(([i]) => i)
}

export interface SearchResults {
  issues: Issue[]
  proofs: TheologyProof[]
  articles: Article[]
  terms: GlossaryTerm[]
  faqs: Faq[]
  guides: Guide[]
}

const HAY_FIELDS = new Map<string, Field>()
function hayField(hay: string): Field {
  let f = HAY_FIELDS.get(hay)
  if (!f) {
    f = toField([hay])
    if (HAY_FIELDS.size > 2000) HAY_FIELDS.clear()
    HAY_FIELDS.set(hay, f)
  }
  return f
}

/** How many of the query's groups occur in `hay`; 0 unless all do (or `any`). */
export function matchScore(hay: string, groups: TokenGroup[], any = false): number {
  if (!groups.length) return 0
  const f = hayField(hay)
  let found = 0
  for (const g of groups) {
    if (fieldHas(f, g)) found++
    else if (!any) return 0
  }
  return found
}

/** True when every word of `query` (or a synonym) occurs in `hay`. */
export function matches(hay: string, query: string): boolean {
  return matchScore(hay, queryTokens(query)) > 0
}

export function langParts(fields: (Localized | undefined)[]): string[] {
  return fields.flatMap((f) => (f ? LANGS.map((l) => f[l] ?? "") : []))
}

/**
 * Search issues and articles by what the index knows: titles, summaries,
 * chapters. The full search — rulings, bodies, the glossary, proofs,
 * guides — is `searchAllFull` in lib/fiqh-full.ts, loaded when the search
 * dialog opens. The fiqh tab used to search only the open book, so a reader
 * sitting on Prayer who typed "tayammum" was told there were no results
 * while the issue existed one tab away; results are per section instead.
 */
export function searchIndex(
  query: string,
  pool: { issues: Issue[]; articles: Article[] } = { issues, articles },
  any = false,
) {
  const groups = queryTokens(query)
  if (!groups.length) return { issues: [] as Issue[], articles: [] as Article[] }
  const articleHay = (a: Article) =>
    [a.ref, ...langParts([a.title, a.excerpt]), ...(a.sections ?? []).flatMap((sec) => langParts([sec.heading, sec.body]))].join(" ")
  return {
    issues: rankIssues(pool.issues, groups, any),
    articles: pool.articles
      .map((a) => [a, matchScore(articleHay(a), groups, any)] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([a]) => a),
  }
}
