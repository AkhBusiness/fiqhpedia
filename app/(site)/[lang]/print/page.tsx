import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { PrintView } from "@/components/print-view"
import { LANGS, type Lang } from "@/lib/fiqh-data"

/**
 * /ar/print?books=taharah,salah&schools=hanbali — a typeset book of the
 * chosen books and schools, paginated in the browser by Paged.js and saved
 * as PDF from the print dialog. One static page per language; the choice
 * lives in the query string, so any combination works without a file per
 * combination on the server.
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function PrintPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!(LANGS as readonly string[]).includes(lang)) notFound()
  return <PrintView lang={lang as Lang} />
}
