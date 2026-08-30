"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, Clock, Maximize2, X } from "lucide-react"
import {
  type Article,
  articles,
  type Lang,
  rtlLangs,
  theologyProofs,
  ui, displayRef } from "@/lib/fiqh-data"

interface ArticlesSectionProps {
  lang: Lang
}

/** Rough reading time. 200 wpm for Latin scripts, 150 for Arabic — Arabic
 *  words carry more meaning each, so a raw word count overstates speed. */
function readingMinutes(article: Article, lang: Lang): number {
  const words = article.sections.reduce((n, s) => n + s.body[lang].split(/\s+/).length, 0)
  return Math.max(1, Math.round(words / (lang === "ar" ? 150 : 200)))
}

/** Render a body block: blank lines split paragraphs, **text** goes bold. */
function Prose({ text }: { text: string }) {
  return (
    <>
      {text.split("\n\n").map((para, i) => (
        <p key={i} className="mt-4 text-pretty text-base leading-loose text-foreground/85 first:mt-0">
          {para.split(/(\*\*[^*]+\*\*)/g).map((chunk, j) =>
            chunk.startsWith("**") && chunk.endsWith("**") ? (
              <strong key={j} className="font-bold text-foreground">
                {chunk.slice(2, -2)}
              </strong>
            ) : (
              <span key={j}>{chunk}</span>
            ),
          )}
        </p>
      ))}
    </>
  )
}

export function ArticlesSection({ lang }: ArticlesSectionProps) {
  const [reading, setReading] = useState<Article | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [activeId, setActiveId] = useState<string>("")
  const isRtl = rtlLangs.includes(lang)

  // Deep link: /#M1 opens that article.
  useEffect(() => {
    const sync = () => {
      const key = window.location.hash.replace("#", "").trim().toUpperCase()
      if (!key) {
        setReading(null)
        return
      }
      const match = articles.find((a) => a.ref === key)
      if (match) setReading(match)
    }
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  // Escape closes; body scroll locked while open.
  useEffect(() => {
    if (!reading) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reading])

  function open(article: Article) {
    setReading(article)
    setActiveId(article.sections[0]?.id ?? "")
    window.history.replaceState(null, "", `#${article.ref}`)
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: 0 }))
  }

  function close() {
    setReading(null)
    window.history.replaceState(null, "", window.location.pathname)
  }

  // Measure against the scroll container, never offsetTop: sections are
  // nested inside <article>, so offsetTop reports a different origin.
  function handleScroll() {
    const el = scrollRef.current
    if (!el || !reading) return
    const line = el.clientHeight * 0.3
    const top = el.getBoundingClientRect().top
    let current = reading.sections[0]?.id ?? ""
    for (const s of reading.sections) {
      const node = el.querySelector<HTMLElement>(`#article-${s.id}`)
      if (node && node.getBoundingClientRect().top - top <= line) current = s.id
    }
    setActiveId(current)
  }

  function scrollTo(id: string) {
    const el = scrollRef.current
    const node = el?.querySelector<HTMLElement>(`#article-${id}`)
    if (!el || !node) return
    const delta = node.getBoundingClientRect().top - el.getBoundingClientRect().top
    el.scrollTo({ top: el.scrollTop + delta - 16, behavior: "smooth" })
    setActiveId(id)
  }

  const related = useMemo(() => {
    if (!reading) return []
    return reading.relatedRefs
      .map((r) => theologyProofs.find((p) => p.ref === r))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
  }, [reading])

  return (
    <section aria-label={ui.articlesSection[lang]}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{ui.articlesSection[lang]}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {articles.length} {ui.articlesCount[lang]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {articles.map((article) => (
          <article
            key={article.id}
            id={article.ref}
            className="scroll-mt-40 flex flex-col rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm transition-colors duration-300 hover:border-white/20"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span
                className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground"
                title={ui.refHint[lang]}
              >
                {displayRef(article.ref, lang)}
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3" aria-hidden="true" />
                {readingMinutes(article, lang)} {ui.minRead[lang]}
              </span>
            </div>

            <h3 className="text-balance text-base font-bold leading-snug text-foreground">
              {article.title[lang]}
            </h3>
            <p className="mt-2 flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">
              {article.excerpt[lang]}
            </p>

            <button
              type="button"
              onClick={() => open(article)}
              className="mt-4 flex items-center gap-1.5 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-white/25 hover:bg-white/10"
            >
              <Maximize2 className="size-3.5" aria-hidden="true" />
              {ui.readArticle[lang]}
            </button>
          </article>
        ))}
      </div>

      {/* Full-screen reader */}
      {reading ? (
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className="animate-modal-overlay fixed inset-0 z-40 flex flex-col bg-zinc-950/95 backdrop-blur-2xl"
          role="dialog"
          aria-modal="true"
          aria-label={reading.title[lang]}
        >
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3.5 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground">
                <BookOpen className="size-4.5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {displayRef(reading.ref, lang)} · {readingMinutes(reading, lang)} {ui.minRead[lang]}
                </span>
                <h2 className="truncate text-sm font-bold text-foreground sm:text-base">
                  {reading.title[lang]}
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label={ui.close[lang]}
              title={ui.close[lang]}
              className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all duration-200 hover:text-white"
            >
              <X className="size-4.5" aria-hidden="true" />
            </button>
          </div>

          <div className="mx-auto flex w-full max-w-5xl flex-1 gap-8 overflow-hidden px-4 sm:px-6">
            <aside className="hidden w-56 shrink-0 py-8 lg:block">
              <nav className="sticky top-0" aria-label={ui.contents[lang]}>
                <span className="mb-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {ui.contents[lang]}
                </span>
                <ul className="flex list-none flex-col gap-1 p-0">
                  {reading.sections
                    .filter((s) => s.heading[lang])
                    .map((s) => (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => scrollTo(s.id)}
                          aria-current={activeId === s.id ? "true" : undefined}
                          className={`flex w-full items-center rounded-lg border px-3 py-2 text-start text-sm transition-all duration-200 ${
                            activeId === s.id
                              ? "border-white/20 bg-white/[0.06] font-semibold text-foreground"
                              : "border-transparent font-medium text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                          }`}
                        >
                          <span className="line-clamp-2">{s.heading[lang]}</span>
                        </button>
                      </li>
                    ))}
                </ul>
              </nav>
            </aside>

            <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-8">
              <article className="mx-auto max-w-2xl pb-24">
                <h1 className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                  {reading.title[lang]}
                </h1>

                {reading.sections.map((s) => (
                  <section key={s.id} id={`article-${s.id}`} className="mt-8 scroll-mt-4">
                    {s.heading[lang] ? (
                      <h2 className="mb-3 text-lg font-bold text-foreground sm:text-xl">
                        {s.heading[lang]}
                      </h2>
                    ) : null}
                    <Prose text={s.body[lang]} />
                  </section>
                ))}

                {reading.sources && reading.sources.length > 0 ? (
                  <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <span className="mb-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {ui.references[lang]}
                    </span>
                    <ul className="flex list-none flex-col gap-1.5 p-0">
                      {reading.sources.map((w, i) => (
                        <li key={i} className="text-sm text-foreground/85">
                          {w[lang]}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {related.length > 0 ? (
                  <div className="mt-12 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                    <span className="mb-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {ui.relatedProofs[lang]}
                    </span>
                    <ul className="flex list-none flex-col gap-2 p-0">
                      {related.map((p) => (
                        <li key={p.ref} className="flex items-baseline gap-2">
                          <span
                            className={`shrink-0 rounded-md border ${p.accent.border} bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-bold ${p.accent.text}`}
                          >
                            {displayRef(p.ref, lang)}
                          </span>
                          <span className="text-sm text-foreground/85">{p.title[lang]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
