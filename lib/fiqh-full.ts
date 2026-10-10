/* ------------------------------------------------------------------ */
/* The full content — rulings, article bodies, and everything search    */
/* needs. Nothing imports this statically from a client component: the  */
/* entry pages read it at build time (server side, never shipped), and  */
/* the search dialog pulls it in with a dynamic import the first time   */
/* it opens. That is what keeps the index that every page carries small.*/
/* ------------------------------------------------------------------ */

import fiqhData from "@/data/fiqhData.json"
import {
  type Article,
  type FullArticle,
  type FullIssue,
  langParts,
  matchScore,
  queryTokens,
  type RawIssue,
  type SearchResults,
  searchIndex,
  toIssue,
} from "@/lib/fiqh-data"
import { glossary } from "@/lib/glossary-data"
import { faqs, guides } from "@/lib/learn-data"
import { theologyProofs } from "@/lib/theology-data"

const raw = fiqhData as unknown as { issues: RawIssue[]; articles: FullArticle[] }

export const fullIssues: FullIssue[] = raw.issues.map((i) => toIssue(i) as FullIssue)
export const fullArticles: FullArticle[] = raw.articles as FullArticle[]

export function findIssue(ref: string): FullIssue | undefined {
  const key = ref.trim().toUpperCase()
  return fullIssues.find((i) => i.ref === key)
}

export function findArticle(ref: string): FullArticle | undefined {
  const key = ref.trim().toUpperCase()
  return fullArticles.find((a) => a.ref === key)
}

/**
 * Search every section at once, bodies included. With `any`, pages that
 * hold only some of the words are returned too, best first — the near
 * results offered when nothing holds them all.
 */
export function searchAllFull(query: string, any = false): SearchResults {
  const q = query.trim()
  const empty = { issues: [], proofs: [], articles: [], terms: [], faqs: [], guides: [] }
  if (!q) return empty
  const groups = queryTokens(q)
  if (!groups.length) return empty
  const { issues, articles } = searchIndex(q, { issues: fullIssues, articles: fullArticles as Article[] }, any)
  const rank = <T,>(pool: T[], hay: (x: T) => string): T[] =>
    pool
      .map((x) => [x, matchScore(hay(x), groups, any)] as const)
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([x]) => x)
  return {
    issues,
    articles,
    proofs: rank(theologyProofs, (p) => [p.ref, ...langParts([p.title, p.tagline, p.conclusion])].join(" ")),
    terms: rank(glossary, (t) =>
      langParts([t.term, t.definition, t.linguistic, t.legal, ...Object.values(t.technical ?? {}).map((s) => s?.text)]).join(" "),
    ),
    faqs: rank(faqs, (f) => langParts([f.question, f.answer]).join(" ")),
    guides: rank(guides, (g) =>
      [...langParts([g.title, g.intro]), ...g.steps.flatMap((st) => langParts([st.title, st.text]))].join(" "),
    ),
  }
}
