"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { glossaryAnchor, type Lang, searchAll, ui } from "@/lib/fiqh-data"
import type { Section } from "@/components/nav-modal"

interface GlobalSearchProps {
  lang: Lang
  open: boolean
  onClose: () => void
  /** Navigate to a section, optionally scrolling to an anchor within it. */
  onNavigate: (section: Section, anchor?: string) => void
}

/** One line in the results list. */
interface Hit {
  key: string
  section: Section
  sectionLabel: string
  title: string
  subtitle?: string
  anchor?: string
}

/**
 * Search across every section of the site.
 *
 * The fiqh tab has its own search, deliberately narrow: it filters issue
 * cards and can be scoped to a book or a chapter. That search answers "which
 * ruling covers this". This one answers "does the site say anything about
 * this at all", and so reaches creed, articles, glossary, guides and
 * questions as well.
 */
export function GlobalSearch({ lang, open, onClose, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus on open; clear on close so the next open starts fresh.
  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(id)
    }
    setQuery("")
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onClose])

  const hits = useMemo<Hit[]>(() => {
    if (query.trim().length < 2) return []
    const r = searchAll(query)
    const out: Hit[] = []
    for (const i of r.issues.slice(0, 8)) {
      out.push({
        key: `issue-${i.id}`,
        section: "fiqh",
        sectionLabel: ui.fiqhSection[lang],
        title: i.title[lang],
        subtitle: i.chapter?.[lang],
        anchor: i.id,
      })
    }
    for (const p of r.proofs.slice(0, 5)) {
      out.push({
        key: `proof-${p.id}`,
        section: "aqidah",
        sectionLabel: ui.aqidahSection[lang],
        title: p.title[lang],
        subtitle: p.tagline[lang],
      })
    }
    for (const a of r.articles.slice(0, 5)) {
      out.push({
        key: `article-${a.id}`,
        section: "articles",
        sectionLabel: ui.articlesSection[lang],
        title: a.title[lang],
        subtitle: a.excerpt[lang],
      })
    }
    for (const t of r.terms.slice(0, 6)) {
      out.push({
        key: `term-${t.id}`,
        section: "glossary",
        sectionLabel: ui.glossarySection[lang],
        title: t.term[lang],
        subtitle: (t.briefDefinition ?? t.definition)?.[lang],
        anchor: glossaryAnchor(t.id),
      })
    }
    for (const g of r.guides.slice(0, 4)) {
      out.push({
        key: `guide-${g.id}`,
        section: "learn",
        sectionLabel: ui.practicalGuides[lang],
        title: g.title[lang],
        subtitle: g.intro[lang],
      })
    }
    for (const f of r.faqs.slice(0, 5)) {
      out.push({
        key: `faq-${f.id}`,
        section: "learn",
        sectionLabel: ui.learnSection[lang],
        title: f.question[lang],
        subtitle: f.category[lang],
      })
    }
    return out
  }, [query, lang])

  if (!open) return null

  const typing = query.trim().length >= 2

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-[10vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={ui.globalSearch[lang]}
      onClick={onClose}
    >
      <div
        className="flex max-h-[75vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-popover/95 shadow-2xl backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative shrink-0 border-b border-white/10">
          <Search
            className="pointer-events-none absolute inset-y-0 start-4 my-auto size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={ui.globalSearchPlaceholder[lang]}
            aria-label={ui.globalSearchPlaceholder[lang]}
            className="h-14 w-full bg-transparent ps-11 pe-12 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={ui.close[lang]}
            className="absolute inset-y-0 end-3 my-auto flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!typing ? (
            <p className="p-6 text-sm text-muted-foreground">{ui.globalSearchHint[lang]}</p>
          ) : hits.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{ui.noResults[lang]}</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {hits.map((h) => (
                <li key={h.key}>
                  <button
                    type="button"
                    onClick={() => {
                      onNavigate(h.section, h.anchor)
                      onClose()
                    }}
                    className="flex w-full flex-col gap-1 px-5 py-3 text-start transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="text-[11px] font-bold uppercase tracking-wide text-primary">
                      {h.sectionLabel}
                    </span>
                    <span className="text-sm font-semibold text-foreground">{h.title}</span>
                    {h.subtitle ? (
                      <span className="line-clamp-2 text-xs text-muted-foreground">
                        {h.subtitle}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
