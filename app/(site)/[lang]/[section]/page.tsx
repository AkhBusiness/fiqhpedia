import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import type { Section } from "@/components/nav-modal"
import { LANGS, type Lang } from "@/lib/fiqh-data"

/** Sections that get their own path. "home" is the bare /{lang}. */
const SECTIONS = ["fiqh", "aqidah", "articles", "glossary", "learn"] as const

/**
 * One static page per language × section, so /ar/articles is a real file and
 * search engines see four sections instead of one. Adding a language to LANGS
 * multiplies these automatically — nothing here lists languages by hand.
 */
export function generateStaticParams() {
  return LANGS.flatMap((lang) => SECTIONS.map((section) => ({ lang, section })))
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ lang: string; section: string }>
}) {
  const { lang, section } = await params
  if (!(LANGS as readonly string[]).includes(lang)) notFound()
  if (!(SECTIONS as readonly string[]).includes(section)) notFound()
  return <AppShell lang={lang as Lang} section={section as Section} />
}
