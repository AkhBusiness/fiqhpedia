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
  matches,
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

/** Search every section at once, bodies included. */
export function searchAllFull(query: string): SearchResults {
  const q = query.trim()
  if (!q) return { issues: [], proofs: [], articles: [], terms: [], faqs: [], guides: [] }
  const { issues, articles } = searchIndex(q, { issues: fullIssues, articles: fullArticles as Article[] })
  return {
    issues,
    articles,
    proofs: theologyProofs.filter((p) => matches([p.ref, ...langParts([p.title, p.tagline, p.conclusion])].join(" "), q)),
    terms: glossary.filter((t) =>
      matches(
        langParts([t.term, t.definition, t.linguistic, t.legal, ...Object.values(t.technical ?? {}).map((s) => s?.text)]).join(" "),
        q,
      ),
    ),
    faqs: faqs.filter((f) => matches(langParts([f.question, f.answer]).join(" "), q)),
    guides: guides.filter((g) =>
      matches([...langParts([g.title, g.intro]), ...g.steps.flatMap((st) => langParts([st.title, st.text]))].join(" "), q),
    ),
  }
}
