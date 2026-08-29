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

import fiqhData from "@/data/fiqhData.json"

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/**
 * Active languages — the single source of truth for the whole app.
 * Adding a language is one edit here plus its entries in fiqhData.json;
 * nothing else in the codebase hardcodes the list.
 */
export const LANGS = ["ar", "en", "ru"] as const
export type Lang = (typeof LANGS)[number]

/**
 * Languages whose assets exist (flag, locale entry) but whose content is not
 * translated yet. Kept out of LANGS so the picker never offers a language
 * that would render an empty page. Move the key into LANGS to ship it.
 */
export const PENDING_LANGS = ["es"] as const
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

export interface SchoolRuling {
  ruling: Localized
  /** One or more relied-upon (معتمد) books of the school. Never empty. */
  references: Localized[]
}

export interface Issue {
  id: string
  /** Permanent site-wide citation ref (e.g. "F12"). Never reused or renumbered. */
  ref: string
  categoryId: string
  number: number
  /** Optional traditional chapter/باب label (e.g. Hanbali sequence of Kitāb al-Ṭahārah) */
  chapter?: Localized
  title: Localized
  summary: Localized
  rulings: Record<SchoolKey, SchoolRuling>
}

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
  title: Localized
  excerpt: Localized
  /** Refs of proofs that argue the same ground more formally. */
  relatedRefs: string[]
  sections: ArticleSection[]
}

export interface Category {
  id: string
  name: Localized
}

export interface GlossaryTerm {
  id: string
  term: Localized
  definition: Localized
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
  quran: { verse: Localized; ref: Localized }
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
  text: Localized
  /** Current shape: one or more relied-upon books. */
  sources?: Localized[]
  /** Pre-migration shape. Still accepted so a single stale record
   *  degrades gracefully instead of failing the whole static build. */
  source?: Localized
}

interface RawIssue {
  id: string
  ref: string
  bookId: string
  number: number
  chapter?: Localized
  title: Localized
  summary: Localized
  rulings: Record<SchoolKey, RawSchoolRuling>
}

interface RawTheologyProof {
  id: string
  ref: string
  title: Localized
  tagline: Localized
  premises: Localized[]
  quran: { verse: Localized; ref: Localized }
  conclusion: Localized
}

interface RawData {
  languages: { key: Lang; short: string; label: string; flag: string; flagCode: string }[]
  ui: Record<string, Localized>
  books: Category[]
  countries: RawCountry[]
  articles?: Article[]
  schools: { key: SchoolKey; name: Localized }[]
  issues: RawIssue[]
  theology: RawTheologyProof[]
  glossary: GlossaryTerm[]
  guides: Guide[]
  faqs: Faq[]
}

const data = fiqhData as RawData

/* ------------------------------------------------------------------ */
/* Presentation-only accent maps (kept out of the content JSON)        */
/* ------------------------------------------------------------------ */

const SCHOOL_COLORS: Record<SchoolKey, School["color"]> = {
  hanafi: {
    text: "text-amber-500",
    border: "border-amber-500/40",
    badgeBg: "bg-amber-500/15",
    badgeText: "text-amber-500",
    dot: "bg-amber-500",
    ring: "hover:border-amber-500/70",
    glow: "hover:shadow-[0_0_24px_-6px] hover:shadow-amber-500/40",
  },
  maliki: {
    text: "text-emerald-500",
    border: "border-emerald-500/40",
    badgeBg: "bg-emerald-500/15",
    badgeText: "text-emerald-500",
    dot: "bg-emerald-500",
    ring: "hover:border-emerald-500/70",
    glow: "hover:shadow-[0_0_24px_-6px] hover:shadow-emerald-500/40",
  },
  shafii: {
    text: "text-blue-500",
    border: "border-blue-500/40",
    badgeBg: "bg-blue-500/15",
    badgeText: "text-blue-500",
    dot: "bg-blue-500",
    ring: "hover:border-blue-500/70",
    glow: "hover:shadow-[0_0_24px_-6px] hover:shadow-blue-500/40",
  },
  hanbali: {
    text: "text-cyan-500",
    border: "border-cyan-500/40",
    badgeBg: "bg-cyan-500/15",
    badgeText: "text-cyan-500",
    dot: "bg-cyan-500",
    ring: "hover:border-cyan-500/70",
    glow: "hover:shadow-[0_0_24px_-6px] hover:shadow-cyan-500/40",
  },
}

const PROOF_ACCENTS: Record<string, TheologyProof["accent"]> = {
  huduth: {
    text: "text-amber-400",
    border: "border-amber-500/40",
    dot: "bg-amber-500",
    ring: "hover:border-amber-500/70",
    glow: "hover:shadow-[0_0_30px_-8px] hover:shadow-amber-500/40",
  },
  khalq: {
    text: "text-emerald-400",
    border: "border-emerald-500/40",
    dot: "bg-emerald-500",
    ring: "hover:border-emerald-500/70",
    glow: "hover:shadow-[0_0_30px_-8px] hover:shadow-emerald-500/40",
  },
  itqan: {
    text: "text-blue-400",
    border: "border-blue-500/40",
    dot: "bg-blue-500",
    ring: "hover:border-blue-500/70",
    glow: "hover:shadow-[0_0_30px_-8px] hover:shadow-blue-500/40",
  },
  fitrah: {
    text: "text-cyan-400",
    border: "border-cyan-500/40",
    dot: "bg-cyan-500",
    ring: "hover:border-cyan-500/70",
    glow: "hover:shadow-[0_0_30px_-8px] hover:shadow-cyan-500/40",
  },
}

/** Fallback accent so a newly added proof id still renders gracefully. */
const DEFAULT_PROOF_ACCENT: TheologyProof["accent"] = {
  text: "text-zinc-300",
  border: "border-white/20",
  dot: "bg-zinc-400",
  ring: "hover:border-white/40",
  glow: "hover:shadow-[0_0_30px_-8px] hover:shadow-white/20",
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

export const ui = data.ui as Record<string, Localized>

/** Resolve a citation ref like "F12" or "a3" (case-insensitive) to its entry. */
export function findByRef(
  ref: string,
):
  | { kind: "issue"; item: Issue }
  | { kind: "proof"; item: TheologyProof }
  | { kind: "article"; item: Article }
  | null {
  const key = ref.trim().toUpperCase()
  const issue = issues.find((i) => i.ref === key)
  if (issue) return { kind: "issue", item: issue }
  const proof = theologyProofs.find((p) => p.ref === key)
  if (proof) return { kind: "proof", item: proof }
  const article = articles.find((a) => a.ref === key)
  if (article) return { kind: "article", item: article }
  return null
}

export const langLabels: { key: Lang; short: string; label: string; flag: string; flagCode: string }[] =
  data.languages

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

export const articles: Article[] = data.articles ?? []

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

export const issues: Issue[] = data.issues.map((i) => ({
  id: i.id,
  ref: i.ref,
  categoryId: i.bookId,
  number: i.number,
  ...(i.chapter ? { chapter: i.chapter } : {}),
  title: i.title,
  summary: i.summary,
  rulings: Object.fromEntries(
    Object.entries(i.rulings).map(([key, r]) => [key, { ruling: r.text, references: toReferences(r) }]),
  ) as Record<SchoolKey, SchoolRuling>,
}))

export const theologyProofs: TheologyProof[] = data.theology.map((p) => ({
  id: p.id,
  ref: p.ref,
  title: p.title,
  tagline: p.tagline,
  accent: PROOF_ACCENTS[p.id] ?? DEFAULT_PROOF_ACCENT,
  premises: p.premises,
  quran: p.quran,
  conclusion: p.conclusion,
}))

export const glossary: GlossaryTerm[] = data.glossary

export const guides: Guide[] = data.guides

export const faqs: Faq[] = data.faqs

/* ------------------------------------------------------------------ */
/* Glossary matching — find a term by its localized surface form       */
/* ------------------------------------------------------------------ */

/** Lookup map keyed by lower-cased surface form (all languages) → term. */
const GLOSSARY_INDEX: Record<string, GlossaryTerm> = (() => {
  const map: Record<string, GlossaryTerm> = {}
  for (const t of glossary) {
    for (const l of LANGS) {
      map[t.term[l].toLowerCase()] = t
    }
  }
  return map
})()

/** Return the glossary term whose surface form equals `word` (any lang). */
export function findGlossaryTerm(word: string): GlossaryTerm | undefined {
  return GLOSSARY_INDEX[word.trim().toLowerCase()]
}

/* ------------------------------------------------------------------ */
/* Search — builds a cross-language haystack per issue                 */
/* ------------------------------------------------------------------ */

/** Concatenated, lower-cased searchable text (title, summary, book, */
/* chapter, all school names + rulings + references) across AR/EN/RU. */
function buildHaystack(issue: Issue): string {
  const book = categories.find((c) => c.id === issue.categoryId)
  const parts: string[] = []
  for (const l of LANGS) {
    parts.push(issue.title[l], issue.summary[l])
    if (issue.chapter) parts.push(issue.chapter[l])
    if (book) parts.push(book.name[l])
    for (const s of schools) {
      const r = issue.rulings[s.key]
      parts.push(s.name[l], r.ruling[l], ...r.references.map((ref) => ref[l]))
    }
  }
  return parts.join(" \u0000 ").toLowerCase()
}

const HAYSTACKS: Record<string, string> = Object.fromEntries(
  issues.map((i) => [i.id, buildHaystack(i)]),
)

/** True when every whitespace-separated token in `query` is found. */
export function issueMatchesQuery(issue: Issue, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = HAYSTACKS[issue.id] ?? buildHaystack(issue)
  return q.split(/\s+/).every((token) => hay.includes(token))
}
