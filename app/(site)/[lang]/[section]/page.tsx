import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import type { Section } from "@/components/nav-modal"
import type { Metadata } from "next"
import { LANGS, type Lang, ui } from "@/lib/fiqh-data"
import { SITE_URL } from "@/lib/site"

/** Sections that get their own path. "home" is the bare /{lang}. */
const SECTIONS = ["fiqh", "aqidah", "articles", "glossary", "learn", "about", "sources", "changelog"] as const

/**
 * One static page per language × section, so /ar/articles is a real file and
 * search engines see four sections instead of one. Adding a language to LANGS
 * multiplies these automatically — nothing here lists languages by hand.
 */
export function generateStaticParams() {
  return LANGS.flatMap((lang) => SECTIONS.map((section) => ({ lang, section })))
}

const TITLE_KEY: Record<(typeof SECTIONS)[number], string> = {
  fiqh: "fiqhSection",
  aqidah: "aqidahSection",
  articles: "articlesSection",
  glossary: "glossarySection",
  learn: "learnSection",
  about: "aboutSection",
  sources: "sourcesSection",
  changelog: "changelogSection",
}
const DESC_KEY: Record<(typeof SECTIONS)[number], string> = {
  fiqh: "fiqhSectionDesc",
  aqidah: "aqidahSectionDesc",
  articles: "articlesSectionDesc",
  glossary: "glossarySectionDesc",
  learn: "learnSectionDesc",
  about: "aboutIntro",
  sources: "sourcesIntro",
  changelog: "changelogIntro",
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string; section: string }> }): Promise<Metadata> {
  const { lang, section } = await params
  if (!(LANGS as readonly string[]).includes(lang) || !(SECTIONS as readonly string[]).includes(section)) return {}
  const l = lang as Lang
  const s = section as (typeof SECTIONS)[number]
  const title = ui[TITLE_KEY[s]][l]
  const description = ui[DESC_KEY[s]][l]
  return {
    title: `${title} | تبيان`,
    description,
    alternates: {
      canonical: `${SITE_URL}/${l}/${s}`,
      languages: Object.fromEntries(LANGS.map((x) => [x, `${SITE_URL}/${x}/${s}`])),
    },
    openGraph: { title, description, url: `${SITE_URL}/${l}/${s}`, siteName: "تبيان", locale: l },
  }
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
