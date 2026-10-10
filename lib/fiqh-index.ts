/* ------------------------------------------------------------------ */
/* The index: every issue and article without its body.                */
/*                                                                      */
/* Separate from fiqh-data so that a page can carry the UI strings and  */
/* the types without carrying 250 KB of titles it never lists. The      */
/* entry pages (/ar/f/F109) do not import this at all: their previous   */
/* and next are computed at build time; the fiqh tab, the home page and */
/* the search load it with the component that needs it.                 */
/* ------------------------------------------------------------------ */

import indexData from "@/data/fiqhIndex.json"
import {
  type Article,
  type Issue,
  type Localized,
  type RawIssue,
  queryTokens,
  rankIssues,
  matchScore,
  langParts,
  toIssue,
} from "@/lib/fiqh-data"

const data = indexData as unknown as { issues: RawIssue[]; articles?: Article[] }

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

/** Entries added most recently first — for a "what's new" list. */
export function recentlyAdded(limit = 10) {
  return issues
    .filter((i) => i.addedAt)
    .sort((a, b) => (b.addedAt ?? "").localeCompare(a.addedAt ?? ""))
    .slice(0, limit)
}


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

/** Published issues per book. */
export function bookCounts(): Record<string, number> {
  const c: Record<string, number> = {}
  for (const issue of issues) c[issue.categoryId] = (c[issue.categoryId] ?? 0) + 1
  return c
}

/** The issue before and after this one in its chapter, for the page foot. */
export function chapterNeighbours(issue: Issue): { prev: Issue | null; next: Issue | null } {
  const siblings = issues
    .filter((i) => i.categoryId === issue.categoryId && (i.chapter?.ar ?? "") === (issue.chapter?.ar ?? ""))
    .sort((a, b) => a.number - b.number)
  const at = siblings.findIndex((i) => i.id === issue.id)
  return {
    prev: at > 0 ? siblings[at - 1] : null,
    next: at >= 0 && at < siblings.length - 1 ? siblings[at + 1] : null,
  }
}
