import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { LANGS, type Lang } from "@/lib/fiqh-data"

/** /ar, /en, /ru — the landing view in each language. */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!(LANGS as readonly string[]).includes(lang)) notFound()
  return <AppShell lang={lang as Lang} section="home" />
}
