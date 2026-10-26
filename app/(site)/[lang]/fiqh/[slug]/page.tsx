import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { LANGS, type Lang, categories, schools, ui } from "@/lib/fiqh-data"
import { findIssue, fullIssues } from "@/lib/fiqh-full"
import { chapterNeighbours } from "@/lib/fiqh-index"
import { entryUrl, SITE_URL } from "@/lib/site"

/**
 * Everything under /ar/fiqh/ — two kinds of page share the one segment,
 * because an issue belongs under the fiqh section the reader came from:
 *
 *   /ar/fiqh/taharah  — a book: its chapters as planned, with what is written
 *   /ar/fiqh/F109     — an issue: one ruling page, one permanent address
 *
 * They cannot collide: issue refs are "F" + digits, book ids are words.
 * The old /ar/f/F109 addresses redirect here (public/_redirects).
 *
 * Built once per book and per issue, per language. The issue's full text is
 * read here at build time and handed to the shell, so the page carries its
 * own ruling and nothing else's; metadata gives the link a title and summary
 * wherever it is pasted, and `hreflang` ties the five languages together.
 */
const isRef = (s: string) => /^F\d+$/i.test(s)

export function generateStaticParams() {
  return LANGS.flatMap((lang) => [
    ...categories.map((c) => ({ lang, slug: c.id })),
    ...fullIssues.map((i) => ({ lang, slug: i.ref })),
  ])
}

type Params = Promise<{ lang: string; slug: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, slug } = await params
  if (!(LANGS as readonly string[]).includes(lang)) return {}
  const l = lang as Lang

  if (isRef(slug)) {
    const issue = findIssue(slug)
    if (!issue) return {}
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

  const cat = categories.find((c) => c.id === slug)
  if (!cat) return {}
  const title = ui.bookPageTitle[l].replace("{book}", cat.name[l])
  const description = ui.bookMapDesc[l]
  const url = (x: Lang) => `${SITE_URL}/${x}/fiqh/${cat.id}`
  return {
    title: `${title} | تبيان`,
    description,
    alternates: { canonical: url(l), languages: Object.fromEntries(LANGS.map((x) => [x, url(x)])) },
    openGraph: { title, description, url: url(l), siteName: "تبيان", locale: l },
  }
}

export default async function FiqhEntryPage({ params }: { params: Params }) {
  const { lang, slug } = await params
  if (!(LANGS as readonly string[]).includes(lang)) notFound()

  if (isRef(slug)) {
    const issue = findIssue(slug)
    if (!issue) notFound()
    // Previous and next in the chapter, resolved here at build time so the
    // page ships two titles rather than the index they came from.
    const { prev, next } = chapterNeighbours(issue)
    const slim = (i: typeof prev) => (i ? { ref: i.ref, title: i.title } : null)
    return <AppShell lang={lang as Lang} section="fiqh" entry={{ kind: "issue", issue, prev: slim(prev), next: slim(next) }} />
  }

  const cat = categories.find((c) => c.id === slug)
  if (!cat) notFound()
  return <AppShell lang={lang as Lang} section="fiqh" entry={{ kind: "book", bookId: cat.id }} />
}
