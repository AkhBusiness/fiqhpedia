"use client"

import { useEffect, useMemo, useState } from "react"
import { Library, RotateCcw, SlidersHorizontal } from "lucide-react"
import { CategoryTabs } from "@/components/category-tabs"
import { FilterBar } from "@/components/filter-bar"
import { IssueRow } from "@/components/issue-row"
import type { Section } from "@/components/nav-modal"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import { useAppState } from "@/components/app-state"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { categories, issueMatchesQuery, type Lang, ui } from "@/lib/fiqh-data"
import { bookCounts, issues } from "@/lib/fiqh-index"

interface FiqhSectionProps {
  lang: Lang
  go: (section: Section) => void
  filterLabel: string
  onOpenSchoolModal: () => void
}

/**
 * The fiqh tab: book tabs, chapter filter, search within, the list of rows.
 * Split out of the shell and loaded with `dynamic()` because it is the one
 * part that needs the whole index — and the entry pages, which are what a
 * shared link or a search engine lands on, should not pay for it.
 */
export function FiqhSection({ lang, go, filterLabel, onOpenSchoolModal }: FiqhSectionProps) {
  const {
    activeCategory, setActiveCategory,
    activeChapter, setActiveChapter,
    searchScope, setSearchScope,
    filter, setFilter,
    query, setQuery,
    scope, setScope,
    viewMode, setViewMode,
  } = useAppState()
  const { count: savedCount, toggle, isBookmarked } = useBookmarks()
  const counts = useMemo(() => bookCounts(), [])

  const searching = query.trim().length > 0

  /**
   * How wide a query reaches. A search used to always escape the open book,
   * so a reader sitting on Prayer could not ask "only within Prayer" — the
   * book tabs went inert the moment a letter was typed. The scope is now the
   * reader's to set: it starts at "all" so nothing is hidden by default, and
   * narrows on request.
   */

  // Narrowing to a chapter is meaningless once the reader leaves it.
  useEffect(() => {
    if (searchScope === "chapter" && !activeChapter) setSearchScope("book")
  }, [activeChapter, searchScope])

  const visibleIssues = useMemo(() => {
    const bookOrder = new Map(categories.map((c, n) => [c.id, n]))
    const inScope = (i: (typeof issues)[number]) => {
      if (searchScope === "all") return true
      if (i.categoryId !== activeCategory) return false
      return searchScope !== "chapter" || i.chapter?.ar === activeChapter
    }
    const base =
      scope === "saved"
        ? issues.filter((i) => isBookmarked(i.id))
        : searching
          ? issues.filter(inScope)
          : issues.filter(
              (i) =>
                i.categoryId === activeCategory &&
                (!activeChapter || i.chapter?.ar === activeChapter),
            )
    return base
      .filter((i) => issueMatchesQuery(i, query))
      .sort(
        (a, b) =>
          (bookOrder.get(a.categoryId) ?? 0) - (bookOrder.get(b.categoryId) ?? 0) ||
          a.number - b.number,
      )
  }, [activeCategory, activeChapter, scope, query, searching, searchScope, isBookmarked])

  /**
   * Matches outside the fiqh tab, so a search is never silently partial.
   * The other sections' text is not in the shell; it is fetched the first
   * time the reader types, and the counts fill in when it lands.
   */
  const [fullSearch, setFullSearch] = useState<((q: string) => import("@/lib/fiqh-data").SearchResults) | null>(null)
  useEffect(() => {
    if (!searching || fullSearch) return
    let alive = true
    import("@/lib/fiqh-full").then((m) => {
      if (alive) setFullSearch(() => m.searchAllFull)
    })
    return () => {
      alive = false
    }
  }, [searching, fullSearch])
  const otherHits = useMemo(() => {
    if (!searching || !fullSearch) return null
    const r = fullSearch(query)
    const items = ([
      { key: "aqidah", label: ui.aqidahSection[lang], count: r.proofs.length, go: "aqidah" },
      { key: "articles", label: ui.articlesSection[lang], count: r.articles.length, go: "articles" },
      { key: "glossary", label: ui.glossarySection[lang], count: r.terms.length, go: "glossary" },
      { key: "learn", label: ui.learnSection[lang], count: r.faqs.length, go: "learn" },
    ] satisfies { key: string; label: string; count: number; go: Section }[]).filter(
      (i) => i.count > 0,
    )
    return items.length > 0 ? items : null
  }, [searching, query, lang, fullSearch])

  const activeCategoryName =
    scope === "saved"
      ? ui.savedItems[lang]
      : searching && searchScope === "all"
        ? ui.searchAllBooks[lang]
        : categories.find((c) => c.id === activeCategory)?.name[lang] ?? ""


  return (
        <div className="mx-auto flex max-w-6xl flex-col lg:flex-row lg:items-start lg:gap-8 lg:px-6 lg:pt-8">
          <CategoryTabs
            lang={lang}
            activeId={scope === "saved" || (searching && searchScope === "all") ? "" : activeCategory}
            counts={counts}
            activeChapter={activeChapter}
            onSelectChapter={setActiveChapter}
            onSelect={(id) => {
              setActiveCategory(id)
              setActiveChapter("")
              setScope("all")
            }}
          />

          <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:min-w-0 lg:flex-1 lg:px-0 lg:pt-0">
            <FilterBar
              lang={lang}
              query={query}
              onQueryChange={setQuery}
              scope={scope}
              onScopeChange={setScope}
              savedCount={savedCount}
              resultCount={visibleIssues.length}
              searchScope={searchScope}
              onSearchScopeChange={setSearchScope}
              bookName={categories.find((c) => c.id === activeCategory)?.name[lang] ?? ""}
              chapterName={activeChapter}
            />

            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground sm:text-2xl">{activeCategoryName}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {visibleIssues.length} {ui.issuesCount[lang]}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ViewModeToggle lang={lang} value={viewMode} onChange={setViewMode} />
                {filter.mode !== "all" ? (
                  <button
                    type="button"
                    onClick={() => setFilter({ mode: "all" })}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
                  >
                    <RotateCcw className="size-3.5" aria-hidden="true" />
                    {ui.resetView[lang]}
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onOpenSchoolModal}
                  aria-haspopup="dialog"
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 min-h-11 px-4 text-sm font-semibold text-foreground backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-white/10"
                >
                  <SlidersHorizontal className="size-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-muted-foreground">{ui.filtering[lang]}:</span>
                  <span className="max-w-[10rem] truncate">{filterLabel}</span>
                </button>
              </div>
            </div>

            {otherHits ? (
              <div className="mb-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 backdrop-blur-md">
                <span className="text-xs font-semibold text-muted-foreground">
                  {ui.searchOther[lang]}
                </span>
                {otherHits.map((h) => (
                  <button
                    key={h.key}
                    type="button"
                    onClick={() => go(h.go)}
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 min-h-11 px-3.5 text-[13px] font-semibold text-foreground transition-colors hover:border-white/25 hover:bg-white/10"
                  >
                    {h.label}
                    <span className="tabular-nums text-muted-foreground">{h.count}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {visibleIssues.length > 0 ? (
              <ul className="flex list-none flex-col gap-3 p-0">
                {visibleIssues.map((issue) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    lang={lang}
                    bookmarked={isBookmarked(issue.id)}
                    onToggleBookmark={toggle}
                  />
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center backdrop-blur-md">
                <span className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground">
                  <Library className="size-7" aria-hidden="true" />
                </span>
                <p className="text-pretty text-sm text-muted-foreground">
                  {scope === "saved" ? ui.noSaved[lang] : query ? ui.noResults[lang] : ui.noIssues[lang]}
                </p>
              </div>
            )}
          </main>
        </div>
  )
}
