"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Clock } from "lucide-react"
import { GlossaryText } from "@/components/glossary-tooltip"
import { type FullArticle, type Lang, displayRef, ui } from "@/lib/fiqh-data"
import { theologyProofs } from "@/lib/theology-data"
import { entryPath } from "@/lib/site"

/** Rough reading time. 200 wpm for Latin scripts, 150 for Arabic — Arabic
 *  words carry more meaning each, so a raw word count overstates speed. */
export function readingMinutes(words: number, lang: Lang): number {
  return Math.max(1, Math.round(words / (lang === "ar" ? 150 : 200)))
}

/** Render a body block: blank lines split paragraphs, **text** goes bold. */
export function Prose({ text, lang }: { text: string; lang: Lang }) {
  return (
    <>
      {text.split("\n\n").map((para, i) => (
        <p key={i} className="mt-4 text-pretty text-base leading-loose text-foreground/85 first:mt-0">
          {para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
            chunk.startsWith("**") && chunk.endsWith("**") ? (
              <strong key={j} className="font-bold text-foreground">
                <GlossaryText text={chunk.slice(2, -2)} lang={lang} />
              </strong>
            ) : (
              <GlossaryText key={j} text={chunk} lang={lang} />
            ),
          )}
        </p>
      ))}
    </>
  )
}

/**
 * An article as a page: title, contents rail on wide screens, the sections,
 * sources, and the proofs that argue the same ground. This is what the
 * reader lands on from a shared link, so it is the document itself — not a
 * modal over a list, which is what it used to be.
 */
export function ArticleView({ article, lang }: { article: FullArticle; lang: Lang }) {
  const [activeId, setActiveId] = useState<string>(article.sections[0]?.id ?? "")
  const words = article.words?.[lang] ?? article.sections.reduce((n, s) => n + s.body[lang].split(/\s+/).length, 0)

  const related = useMemo(
    () =>
      article.relatedRefs
        .map((r) => theologyProofs.find((p) => p.ref === r))
        .filter((p): p is NonNullable<typeof p> => Boolean(p)),
    [article],
  )

  // Track the section in view for the contents rail. Against the window:
  // the page scrolls, not a container.
  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.3
      let current = article.sections[0]?.id ?? ""
      for (const s of article.sections) {
        const node = document.getElementById(`article-${s.id}`)
        if (node && node.getBoundingClientRect().top <= line) current = s.id
      }
      setActiveId(current)
    }
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [article])

  const headed = article.sections.filter((s) => s.heading[lang])

  return (
    <div className="mx-auto flex w-full max-w-5xl gap-8">
      {headed.length > 1 ? (
        <aside className="hidden w-56 shrink-0 lg:block">
          <nav className="sticky top-32" aria-label={ui.contents[lang]}>
            <span className="mb-3 block text-[13px] font-semibold text-muted-foreground">{ui.contents[lang]}</span>
            <ul className="flex list-none flex-col gap-1 p-0">
              {headed.map((s) => (
                <li key={s.id}>
                  <a
                    href={`#article-${s.id}`}
                    aria-current={activeId === s.id ? "true" : undefined}
                    className={`flex w-full items-center rounded-lg border px-3 py-2 text-start text-sm transition-all duration-200 ${
                      activeId === s.id
                        ? "border-white/20 bg-white/[0.06] font-semibold text-foreground"
                        : "border-transparent font-medium text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                    }`}
                  >
                    <span className="line-clamp-2">{s.heading[lang]}</span>
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      ) : null}

      <article className="min-w-0 max-w-2xl flex-1 pb-16">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span
            className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[13px] font-bold text-muted-foreground"
            title={ui.refHint[lang]}
          >
            {displayRef(article.ref, lang)}
          </span>
          {article.chapter ? (
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[13px] font-semibold text-foreground/80">
              {article.chapter[lang]}
            </span>
          ) : null}
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            {readingMinutes(words, lang)} {ui.minRead[lang]}
          </span>
        </div>

        <h1 className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          {article.title[lang]}
        </h1>
        <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{article.excerpt[lang]}</p>

        {article.sections.map((s) => (
          <section key={s.id} id={`article-${s.id}`} className="mt-8 scroll-mt-36">
            {s.heading[lang] ? (
              <h2 className="mb-3 text-lg font-bold text-foreground sm:text-xl">{s.heading[lang]}</h2>
            ) : null}
            <Prose text={s.body[lang]} lang={lang} />
          </section>
        ))}

        {article.sources && article.sources.length > 0 ? (
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <span className="mb-3 block text-[13px] font-semibold text-muted-foreground">{ui.references[lang]}</span>
            <ul className="flex list-none flex-col gap-1.5 p-0">
              {article.sources.map((w, i) => (
                <li key={i} className="text-sm text-foreground/85">
                  {w[lang]}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {related.length > 0 ? (
          <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <span className="mb-3 block text-[13px] font-semibold text-muted-foreground">{ui.relatedProofs[lang]}</span>
            <ul className="flex list-none flex-col gap-2 p-0">
              {related.map((p) => (
                <li key={p.ref}>
                  <Link
                    href={entryPath(lang, p.ref)}
                    className="flex items-baseline gap-2 rounded-lg py-1 transition-colors hover:text-foreground"
                  >
                    <span
                      className={`shrink-0 rounded-md border ${p.accent.border} bg-white/[0.04] px-1.5 py-0.5 font-mono text-[13px] font-bold ${p.accent.text}`}
                    >
                      {displayRef(p.ref, lang)}
                    </span>
                    <span className="text-sm text-foreground/85">{p.title[lang]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </article>
    </div>
  )
}
