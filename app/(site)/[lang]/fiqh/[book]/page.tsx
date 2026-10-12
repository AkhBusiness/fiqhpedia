import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { LANGS, type Lang, categories, ui } from "@/lib/fiqh-data"
import { SITE_URL } from "@/lib/site"

/**
 * /ar/fiqh/taharah — one book, one page: its chapters as planned, with
 * what has been written in each. A permanent address for a book, which
 * the fiqh tab (a filter, not a page) never had.
 */
export function generateStaticParams() {
  return LANGS.flatMap((lang) => categories.map((c) => ({ lang, book: c.id })))
}

type Params = Promise<{ lang: string; book: string }>

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, book } = await params
  const cat = categories.find((c) => c.id === book)
  if (!cat || !(LANGS as readonly string[]).includes(lang)) return {}
  const l = lang as Lang
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

export default async function BookPage({ params }: { params: Params }) {
  const { lang, book } = await params
  if (!(LANGS as readonly string[]).includes(lang)) notFound()
  const cat = categories.find((c) => c.id === book)
  if (!cat) notFound()
  return <AppShell lang={lang as Lang} section="fiqh" entry={{ kind: "book", bookId: cat.id }} />
}
