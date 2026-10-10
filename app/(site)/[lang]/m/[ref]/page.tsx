import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { LANGS, type Lang } from "@/lib/fiqh-data"
import { findArticle, fullArticles } from "@/lib/fiqh-full"
import { entryUrl } from "@/lib/site"

/** /ar/m/M8 — one article, one page. See f/[ref] for the reasoning. */
export function generateStaticParams() {
  return LANGS.flatMap((lang) => fullArticles.map((a) => ({ lang, ref: a.ref })))
}

type Params = Promise<{ lang: string; ref: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, ref } = await params
  const article = findArticle(ref)
  if (!article || !(LANGS as readonly string[]).includes(lang)) return {}
  const l = lang as Lang
  const title = article.title[l]
  const description = article.excerpt[l]
  return {
    title: `${title} | تبيان`,
    description,
    alternates: {
      canonical: entryUrl(l, article.ref),
      languages: Object.fromEntries(LANGS.map((x) => [x, entryUrl(x, article.ref)])),
    },
    openGraph: { type: "article", title, description, url: entryUrl(l, article.ref), siteName: "تبيان", locale: l },
    twitter: { card: "summary", title, description },
  }
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { lang, ref } = await params
  if (!(LANGS as readonly string[]).includes(lang)) notFound()
  const article = findArticle(ref)
  if (!article) notFound()
  return <AppShell lang={lang as Lang} section="articles" entry={{ kind: "article", article }} />
}
