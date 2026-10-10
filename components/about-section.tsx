"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import pagesJson from "@/data/pages.json"
import { Prose } from "@/components/article-view"
import { type Lang, type Localized, rtlLangs, ui } from "@/lib/fiqh-data"

interface AboutBlock {
  id: string
  heading: Localized
  body: Localized
}

const blocks = (pagesJson as { about: AboutBlock[] }).about

/**
 * "Our method": what the site is, where its rulings come from, what the
 * badges mean, how entries are reviewed, and what the site is not. The
 * text lives in data/content/pages.json, in the five languages, and is
 * rendered with the article prose so it reads like the rest of the site.
 */
export function AboutSection({ lang }: { lang: Lang }) {
  const Arrow = rtlLangs.includes(lang) ? ArrowLeft : ArrowRight
  return (
    <article className="mx-auto max-w-2xl pb-16">
      <h1 className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">{ui.aboutSection[lang]}</h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{ui.aboutIntro[lang]}</p>

      {blocks.map((b) => (
        <section key={b.id} id={`about-${b.id}`} className="mt-10 scroll-mt-36">
          <h2 className="mb-3 text-lg font-bold text-foreground sm:text-xl">{b.heading[lang]}</h2>
          <Prose text={b.body[lang]} lang={lang} />
        </section>
      ))}

      <Link
        href={`/${lang}/sources`}
        className="mt-12 inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-foreground transition-colors hover:border-white/25 hover:bg-white/10"
      >
        {ui.sourcesSection[lang]}
        <Arrow className="size-4" aria-hidden="true" />
      </Link>
    </article>
  )
}
