"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { BookOpen, ListChecks, Quote, Sparkles, X } from "lucide-react"
import { type Lang, type TheologyProof, ui } from "@/lib/fiqh-data"

interface ArticleReaderProps {
  proof: TheologyProof | null
  lang: Lang
  onClose: () => void
}

export function ArticleReader({ proof, lang, onClose }: ArticleReaderProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [activeId, setActiveId] = useState<string>("intro")

  // Table-of-contents sections (labels are localized UI keys).
  const sections = useMemo(
    () => [
      { id: "intro", label: ui.introduction[lang], icon: BookOpen },
      { id: "premises", label: ui.premises[lang], icon: ListChecks },
      { id: "quran", label: ui.quranProof[lang], icon: Quote },
      { id: "conclusion", label: ui.conclusion[lang], icon: Sparkles },
    ],
    [lang],
  )

  // Lock body scroll + Escape to close while the reader is open.
  useEffect(() => {
    if (!proof) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [proof, onClose])

  // Reset progress/spy each time a new proof opens.
  useEffect(() => {
    if (proof) {
      setProgress(0)
      setActiveId("intro")
      scrollRef.current?.scrollTo({ top: 0 })
    }
  }, [proof])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollHeight - el.clientHeight
    setProgress(max > 0 ? Math.min(100, (el.scrollTop / max) * 100) : 0)

    // Scroll-spy: the last section whose top passed the reading line wins.
    // Sections live inside an <article> wrapper, so offsetTop is measured
    // against that wrapper rather than this scroll container. Compare the
    // rendered rectangles instead — correct regardless of nesting.
    const line = el.clientHeight * 0.3
    let current = sections[0].id
    const top = el.getBoundingClientRect().top
    for (const s of sections) {
      const node = el.querySelector<HTMLElement>(`#reader-${s.id}`)
      if (node && node.getBoundingClientRect().top - top <= line) current = s.id
    }
    setActiveId(current)
  }

  function scrollTo(id: string) {
    const el = scrollRef.current
    const node = el?.querySelector<HTMLElement>(`#reader-${id}`)
    if (!el || !node) return
    // Offset of the section relative to the scroll container's current
    // scroll position. offsetTop cannot be used here: the sections are
    // nested in an <article>, so it reports a different origin.
    const delta = node.getBoundingClientRect().top - el.getBoundingClientRect().top
    el.scrollTo({ top: el.scrollTop + delta - 16, behavior: "smooth" })
    setActiveId(id)
  }

  if (!proof) return null

  return (
    <div
      className="animate-modal-overlay fixed inset-0 z-40 flex flex-col bg-zinc-950/95 backdrop-blur-2xl"
      role="dialog"
      aria-modal="true"
      aria-label={proof.title[lang]}
    >
      {/* Reading progress bar */}
      <div className="h-1 w-full shrink-0 bg-white/5">
        <div
          className={`h-full ${proof.accent.dot} transition-[width] duration-150 ease-out`}
          style={{ width: `${progress}%` }}
          aria-hidden="true"
        />
      </div>

      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className={`flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${proof.accent.text}`}
          >
            <Sparkles className="size-4.5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {ui.deepDive[lang]}
            </span>
            <h2 className="truncate text-sm font-bold text-foreground sm:text-base">{proof.title[lang]}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={ui.close[lang]}
          title={ui.close[lang]}
          className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all duration-200 hover:text-white"
        >
          <X className="size-4.5" aria-hidden="true" />
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-5xl flex-1 gap-8 overflow-hidden px-4 sm:px-6">
        {/* Sticky mini table of contents */}
        <aside className="hidden w-56 shrink-0 py-8 lg:block">
          <nav className="sticky top-0" aria-label={ui.contents[lang]}>
            <span className="mb-3 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {ui.contents[lang]}
            </span>
            <ul className="flex flex-col gap-1">
              {sections.map((s) => {
                const Icon = s.icon
                const active = activeId === s.id
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => scrollTo(s.id)}
                      aria-current={active ? "true" : undefined}
                      className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-start text-sm transition-all duration-200 ${
                        active
                          ? `${proof.accent.border} bg-white/[0.06] font-semibold text-foreground`
                          : "border-transparent font-medium text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                      }`}
                    >
                      <Icon className={`size-4 shrink-0 ${active ? proof.accent.text : ""}`} aria-hidden="true" />
                      <span className="truncate">{s.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        </aside>

        {/* Article body */}
        <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto py-8">
          <article className="mx-auto max-w-2xl pb-24">
            <section id="reader-intro" className="scroll-mt-4">
              <h1 className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">
                {proof.title[lang]}
              </h1>
              <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{proof.tagline[lang]}</p>
            </section>

            <section id="reader-premises" className="mt-10 scroll-mt-4">
              <div className="mb-4 flex items-center gap-2">
                <ListChecks className={`size-5 ${proof.accent.text}`} aria-hidden="true" />
                <h2 className="text-lg font-bold text-foreground">{ui.premises[lang]}</h2>
              </div>
              <ol className="flex list-none flex-col gap-3 p-0">
                {proof.premises.map((premise, i) => (
                  <li key={i} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
                    <span
                      className={`flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold ${proof.accent.text}`}
                    >
                      {i + 1}
                    </span>
                    <p className="text-pretty text-base leading-relaxed text-foreground/90">{premise[lang]}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section id="reader-quran" className="mt-10 scroll-mt-4">
              <div className="mb-4 flex items-center gap-2">
                <Quote className={`size-5 ${proof.accent.text}`} aria-hidden="true" />
                <h2 className="text-lg font-bold text-foreground">{ui.quranProof[lang]}</h2>
              </div>
              <blockquote className={`rounded-2xl border ${proof.accent.border} bg-white/[0.03] p-6`}>
                <p
                  dir="rtl"
                  lang="ar"
                  className="text-balance text-xl font-semibold leading-relaxed text-foreground"
                >
                  {proof.quran.verse}
                </p>
                <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="size-4" aria-hidden="true" />
                    {proof.quran.ref[lang]}
                  </span>
                  {proof.quran.url ? (
                    <a
                      href={proof.quran.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-primary underline-offset-4 hover:underline"
                    >
                      {ui.readVerse[lang]}
                    </a>
                  ) : null}
                </footer>
              </blockquote>
            </section>

            <section id="reader-conclusion" className="mt-10 scroll-mt-4">
              <div className="mb-4 flex items-center gap-2">
                <Sparkles className={`size-5 ${proof.accent.text}`} aria-hidden="true" />
                <h2 className="text-lg font-bold text-foreground">{ui.conclusion[lang]}</h2>
              </div>
              <p className="text-pretty text-base leading-relaxed text-foreground/90">{proof.conclusion[lang]}</p>
            </section>
          </article>
        </div>
      </div>
    </div>
  )
}
