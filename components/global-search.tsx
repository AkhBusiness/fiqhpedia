"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { categories, glossaryAnchor, type Lang, type SearchResults, ui } from "@/lib/fiqh-data"
import { entryPath } from "@/lib/site"
import type { Section } from "@/components/nav-modal"

interface GlobalSearchProps {
  lang: Lang
  open: boolean
  onClose: () => void
  /** Navigate to a section, optionally scrolling to an anchor within it. */
  onNavigate: (section: Section, anchor?: string) => void
  /** Open an entry's own page. */
  onOpenEntry: (href: string) => void
  /** Text to start with — what the reader typed into the home page box. */
  initialQuery?: string
  /** Open the fiqh tab on one book — offered when a search finds nothing. */
  onOpenBook?: (bookId: string) => void
}

/** One line in the results list. */
interface Hit {
  key: string
  section: Section
  sectionLabel: string
  title: string
  subtitle?: string
  anchor?: string
  /** A page of its own — issues, articles and proofs. The row navigates there. */
  href?: string
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
export function GlobalSearch({ lang, open, onClose, onNavigate, onOpenEntry, initialQuery = "", onOpenBook }: GlobalSearchProps) {
  const [query, setQuery] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus on open; clear on close so the next open starts fresh.
  // The seed may arrive after the dialog is already open — the home page
  // opens it on focus, then hands over what was typed — so it is watched,
  // not read once.
  useEffect(() => {
    if (open && initialQuery) setQuery(initialQuery)
  }, [open, initialQuery])
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

  // The bodies — rulings and article text — are not in the index every page
  // carries. They arrive the first time the search opens, so a phrase the
  // reader remembers from inside a ruling still finds it.
  const [full, setFull] = useState<((q: string, any?: boolean) => SearchResults) | null>(null)
  useEffect(() => {
    if (!open || full) return
    let alive = true
    import("@/lib/fiqh-full").then((m) => {
      if (alive) setFull(() => m.searchAllFull)
    })
    return () => {
      alive = false
    }
  }, [open, full])

  // Exact first: every word (or a synonym of it) on the page. When that
  // finds nothing, the pages holding most of the words, labelled as such —
  // a reader who typed five words and got "no results" rarely tries again.
  const { hits, near } = useMemo<{ hits: Hit[]; near: boolean }>(() => {
    if (query.trim().length < 2 || !full) return { hits: [], near: false }
    let r = full(query)
    let near = false
    if (!r.issues.length && !r.articles.length && !r.proofs.length && !r.terms.length && !r.faqs.length && !r.guides.length) {
      r = full(query, true)
      near = true
    }
    const out: Hit[] = []
    for (const i of r.issues.slice(0, 8)) {
      out.push({
        key: `issue-${i.id}`,
        section: "fiqh",
        sectionLabel: ui.fiqhSection[lang],
        title: i.title[lang],
        subtitle: i.chapter?.[lang],
        anchor: i.id,
        href: entryPath(lang, i.ref),
      })
    }
    for (const p of r.proofs.slice(0, 5)) {
      out.push({
        key: `proof-${p.id}`,
        section: "aqidah",
        sectionLabel: ui.aqidahSection[lang],
        title: p.title[lang],
        subtitle: p.tagline[lang],
        href: entryPath(lang, p.ref),
      })
    }
    for (const a of r.articles.slice(0, 5)) {
      out.push({
        key: `article-${a.id}`,
        section: "articles",
        sectionLabel: ui.articlesSection[lang],
        title: a.title[lang],
        subtitle: a.excerpt[lang],
        href: entryPath(lang, a.ref),
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
    return { hits: out, near }
  }, [query, lang, full])

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
            className="h-14 w-full bg-transparent ps-11 pe-14 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={ui.close[lang]}
            className="absolute inset-y-0 end-1.5 my-auto flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {!typing ? (
            <p className="p-6 text-sm text-muted-foreground">{ui.globalSearchHint[lang]}</p>
          ) : hits.length === 0 ? (
            <div className="p-6">
              <p className="text-[15px] font-semibold text-foreground">{ui.noResults[lang]}</p>
              <p className="mt-1 text-sm text-muted-foreground">{ui.noResultsTips[lang]}</p>
              {onOpenBook ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        onOpenBook(c.id)
                        onClose()
                      }}
                      className="min-h-11 rounded-full border border-white/10 bg-white/5 px-4 text-[13px] font-semibold text-foreground transition-colors hover:border-white/25 hover:bg-white/10"
                    >
                      {c.name[lang]}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : (
            <ul className="divide-y divide-white/5">
              {near ? (
                <li className="px-5 py-2.5 text-[13px] text-muted-foreground" aria-live="polite">
                  {ui.nearResults[lang]}
                </li>
              ) : null}
              {hits.map((h) => (
                <li key={h.key}>
                  <button
                    type="button"
                    data-ref={h.href?.split("/").pop()}
                    onClick={() => {
                      if (h.href) onOpenEntry(h.href)
                      else onNavigate(h.section, h.anchor)
                      onClose()
                    }}
                    className="flex w-full flex-col gap-1 px-5 py-3 text-start transition-colors hover:bg-white/[0.06]"
                  >
                    <span className="text-[13px] font-bold text-primary">
                      {h.sectionLabel}
                    </span>
                    <span className="text-[15px] font-semibold text-foreground">{h.title}</span>
                    {h.subtitle ? (
                      <span className="line-clamp-2 text-[13px] text-muted-foreground">
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
