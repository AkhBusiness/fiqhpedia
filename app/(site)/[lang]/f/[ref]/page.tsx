import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { LANGS, type Lang, categories, schools } from "@/lib/fiqh-data"
import { findIssue, fullIssues } from "@/lib/fiqh-full"
import { chapterNeighbours } from "@/lib/fiqh-index"
import { entryUrl, SITE_URL } from "@/lib/site"

/**
 * /ar/f/F109 — one issue, one page, one address.
 *
 * Built once per issue per language. The full text is read here, on the
 * server at build time, and handed to the shell as a prop — so the page
 * carries its own ruling and nothing else's. Metadata gives the link a
 * title and summary wherever it is pasted, and `hreflang` tells a search
 * engine the five versions are one entry.
 */
export function generateStaticParams() {
  return LANGS.flatMap((lang) => fullIssues.map((i) => ({ lang, ref: i.ref })))
}

type Params = Promise<{ lang: string; ref: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, ref } = await params
  const issue = findIssue(ref)
  if (!issue || !(LANGS as readonly string[]).includes(lang)) return {}
  const l = lang as Lang
  const book = categories.find((c) => c.id === issue.categoryId)?.name[l]
  const title = issue.title[l]
  const description = issue.summary[l]
  return {
    title: `${title} | تبيان`,
    description,
    alternates: {
      canonical: entryUrl(l, issue.ref),
      languages: Object.fromEntries(LANGS.map((x) => [x, entryUrl(x, issue.ref)])),
    },
    openGraph: {
      type: "article",
      title,
      description,
      url: entryUrl(l, issue.ref),
      siteName: "تبيان",
      locale: l,
      section: book,
      tags: schools.map((s) => s.name[l]),
    },
    twitter: { card: "summary", title, description },
  }
}

export default async function IssuePage({ params }: { params: Params }) {
  const { lang, ref } = await params
  if (!(LANGS as readonly string[]).includes(lang)) notFound()
  const issue = findIssue(ref)
  if (!issue) notFound()
  // Previous and next in the chapter, resolved here at build time so the
  // page ships two titles rather than the index they came from.
  const { prev, next } = chapterNeighbours(issue)
  const slim = (i: typeof prev) => (i ? { ref: i.ref, title: i.title } : null)
  return <AppShell lang={lang as Lang} section="fiqh" entry={{ kind: "issue", issue, prev: slim(prev), next: slim(next) }} />
}
