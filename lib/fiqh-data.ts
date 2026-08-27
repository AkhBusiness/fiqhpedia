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

export type Lang = "ar" | "en" | "ru"

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
  categoryId: string
  number: number
  /** Optional traditional chapter/باب label (e.g. Hanbali sequence of Kitāb al-Ṭahārah) */
  chapter?: Localized
  title: Localized
  summary: Localized
  rulings: Record<SchoolKey, SchoolRuling>
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
  bookId: string
  number: number
  chapter?: Localized
  title: Localized
  summary: Localized
  rulings: Record<SchoolKey, RawSchoolRuling>
}

interface RawTheologyProof {
  id: string
  title: Localized
  tagline: Localized
  premises: Localized[]
  quran: { verse: Localized; ref: Localized }
  conclusion: Localized
}

interface RawData {
  languages: { key: Lang; short: string; label: string; flag: string }[]
  ui: Record<string, Localized>
  books: Category[]
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

export const langLabels: { key: Lang; short: string; label: string; flag: string }[] = data.languages

/** Languages that render right-to-left (behavioral, not content). */
export const rtlLangs: Lang[] = ["ar"]

export const schools: School[] = data.schools.map((s) => ({
  key: s.key,
  name: s.name,
  color: SCHOOL_COLORS[s.key] ?? DEFAULT_SCHOOL_COLOR,
}))

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
    for (const l of ["ar", "en", "ru"] as Lang[]) {
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

const LANGS: Lang[] = ["ar", "en", "ru"]

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
