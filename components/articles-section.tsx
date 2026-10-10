"use client"

import { useState } from "react"
import Link from "next/link"
import { Clock, ChevronLeft, ChevronRight } from "lucide-react"
import { readingMinutes } from "@/components/article-view"
import { type Lang, rtlLangs, ui, displayRef } from "@/lib/fiqh-data"
import { articleChapters, articles } from "@/lib/fiqh-index"
import { entryPath } from "@/lib/site"

interface ArticlesSectionProps {
  lang: Lang
}

export function ArticlesSection({ lang }: ArticlesSectionProps) {
  // Chapter filter. Kept out of the URL: an article is cited by its ref, and
  // a filter in the address would make two links to the same reading.
  const [chapter, setChapter] = useState("")
  const shown = chapter ? articles.filter((a) => a.chapter?.ar === chapter) : articles
  const Arrow = rtlLangs.includes(lang) ? ChevronLeft : ChevronRight

  return (
    <section aria-label={ui.articlesSection[lang]}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{ui.articlesSection[lang]}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {shown.length} {ui.articlesCount[lang]}
        </p>
      </div>

      {/* Chapters, shown only once there are enough articles for the grouping
          to mean anything — with three or four, a filter is noise. */}
      {articleChapters.length > 1 && articles.length >= 5 ? (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setChapter("")}
            className={`min-h-11 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
              chapter === ""
                ? "bg-primary text-primary-foreground"
                : "border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
            }`}
          >
            {ui.allChapters[lang]}
          </button>
          {articleChapters.map((c) => (
            <button
              key={c.ar}
              type="button"
              onClick={() => setChapter(chapter === c.ar ? "" : c.ar)}
              className={`min-h-11 rounded-full px-3.5 text-[13px] font-semibold transition-colors ${
                chapter === c.ar
                  ? "bg-primary text-primary-foreground"
                  : "border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"
              }`}
            >
              {c[lang]}
            </button>
          ))}
        </div>
      ) : null}

      <ul className="grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
        {shown.map((article) => (
          <li key={article.id} id={article.ref} className="scroll-mt-40">
            <Link
              href={entryPath(lang, article.ref)}
              className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm transition-colors duration-300 hover:border-white/20"
            >
              <span className="mb-2 flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[13px] font-bold text-muted-foreground"
                  title={ui.refHint[lang]}
                >
                  {displayRef(article.ref, lang)}
                </span>
                <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden="true" />
                  {readingMinutes(article.words?.[lang] ?? 0, lang)} {ui.minRead[lang]}
                </span>
              </span>
              <span className="block text-balance text-base font-bold leading-snug text-foreground">
                {article.title[lang]}
              </span>
              <span className="mt-2 block flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">
                {article.excerpt[lang]}
              </span>
              <span className="mt-4 flex items-center gap-1.5 self-start text-[13px] font-semibold text-foreground">
                {ui.readArticle[lang]}
                <Arrow className="size-4" aria-hidden="true" />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
