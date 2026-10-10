"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Library, RotateCcw, Scale, SlidersHorizontal, X } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { CategoryTabs } from "@/components/category-tabs"
import type { ViewMode } from "@/components/issue-card"
import { IssueRow } from "@/components/issue-row"
import type { Section } from "@/components/nav-modal"
import { SectionTabs } from "@/components/section-tabs"
import type { SchoolFilter } from "@/components/school-selector-modal"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import { FilterBar, type ScopeFilter } from "@/components/filter-bar"
import { categories, type FullArticle, type FullIssue, type Issue, issues, issueMatchesQuery, type Lang, rtlLangs, schools, type TheologyProof, ui, findByRef } from "@/lib/fiqh-data"
import { entryPath, sectionPath } from "@/lib/site"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { usePreference } from "@/hooks/use-preference"
import { useAppState } from "@/components/app-state"

/*
 * Each section and each modal is its own chunk, fetched when first shown.
 * The shell used to carry all of them on every page — the glossary, the
 * guides, the share-card canvas, the country picker — so a reader opening
 * one ruling downloaded the machinery of five tabs they had not opened.
 * Sections keep server rendering (their HTML is in the page); modals are
 * closed on arrival and need no HTML at all.
 */
const IssueCard = dynamic(() => import("@/components/issue-card").then((m) => m.IssueCard))
const ArticleView = dynamic(() => import("@/components/article-view").then((m) => m.ArticleView))
const ProofView = dynamic(() => import("@/components/proof-view").then((m) => m.ProofView))
const HomeSection = dynamic(() => import("@/components/home-section").then((m) => m.HomeSection))
const TheologySection = dynamic(() => import("@/components/theology-section").then((m) => m.TheologySection))
const ArticlesSection = dynamic(() => import("@/components/articles-section").then((m) => m.ArticlesSection))
const GlossarySection = dynamic(() => import("@/components/glossary-section").then((m) => m.GlossarySection))
const LearnSection = dynamic(() => import("@/components/learn-section").then((m) => m.LearnSection))
const GlobalSearch = dynamic(() => import("@/components/global-search").then((m) => m.GlobalSearch), { ssr: false })
const ShareCardModal = dynamic(() => import("@/components/share-card-modal").then((m) => m.ShareCardModal), { ssr: false })
const SchoolSelectorModal = dynamic(
  () => import("@/components/school-selector-modal").then((m) => m.SchoolSelectorModal),
  { ssr: false },
)

/** One entry rendered on its own page, in place of the section's list. */
export type Entry =
  | { kind: "issue"; issue: FullIssue }
  | { kind: "article"; article: FullArticle }
  | { kind: "proof"; proof: TheologyProof }

interface AppShellProps {
  /** From the route. The URL is the source of truth for both. */
  lang: Lang
  section: Section
  /**
   * Set by the per-entry routes (/ar/f/F109 and friends). The shell keeps
   * its header, tabs, search and modals; only the middle changes. Read at
   * build time by a server component, so the full text arrives as a prop
   * and never through the client bundle.
   */
  entry?: Entry
}

/**
 * The whole application below the route layer.
 *
 * `lang` and `section` are props, not state: they live in the URL so that a
 * shared link reopens the same section in the same language. Changing either
 * is a navigation, which is what makes the back button work between tabs.
 */
export function AppShell({ lang, section, entry }: AppShellProps) {
  const router = useRouter()

  /** Navigate to a section, keeping the current language. */
  const go = (next: Section) =>
    router.push(next === "home" ? `/${lang}` : `/${lang}/${next}`)

  /** Switch language, staying on the same section. */
  const setLang = (next: Lang) =>
    router.push(
      entry
        ? entryPath(next, entryRef(entry))
        : section === "home"
          ? `/${next}`
          : `/${next}/${section}`,
    )

  const [schoolModalOpen, setSchoolModalOpen] = useState(false)
  const [globalSearchOpen, setGlobalSearchOpen] = useState(false)
  const {
    theme, setTheme,
    activeCategory, setActiveCategory,
    filter, setFilter,
    query, setQuery,
    scope, setScope,
    viewMode, setViewMode,
    onboardingOpen, setOnboardingOpen,
    onboardingStep, setOnboardingStep,
    onboardingSettled, setOnboardingSettled,
  } = useAppState()
  // فلتر الفصل داخل الباب المفتوح. لا يُحفظ في التفضيلات: هو اختيار
  // لحظي أثناء التصفّح، لا إعداد يعود إليه الزائر في الزيارة التالية.
  const [activeChapter, setActiveChapter] = useState("")
  const [shareIssue, setShareIssue] = useState<FullIssue | null>(null)
  const { count: savedCount, toggle, isBookmarked } = useBookmarks()
  const { pref, hydrated: prefHydrated, save: savePref } = usePreference()
  const [hintDismissed, setHintDismissed] = useState(true)
  useEffect(() => {
    try {
      setHintDismissed(window.localStorage.getItem(HINT_KEY) === "1")
    } catch {
      setHintDismissed(false)
    }
  }, [])
  const dismissHint = () => {
    setHintDismissed(true)
    try {
      window.localStorage.setItem(HINT_KEY, "1")
    } catch {
      // Private browsing: it simply returns next visit.
    }
  }
  const showSchoolHint =
    prefHydrated &&
    !hintDismissed &&
    !pref.school &&
    !pref.country &&
    (section === "home" || section === "fiqh")

  const dir = rtlLangs.includes(lang) ? "rtl" : "ltr"

  // Remember the language the visitor is actually reading in, so that a later
  // visit to the bare "/" lands on it. Written here rather than in the picker
  // because arriving on /ru from a shared link is a choice too.
  useEffect(() => {
    try {
      window.localStorage.setItem("fiqhpedia:lang", lang)
    } catch {
      // Private browsing may refuse; the redirect falls back to the browser.
    }
  }, [lang])

  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = dir
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")
  }, [lang, dir, theme])

  // Apply the stored preference once, after hydration.
  // Runs once per session, not once per mount: every section click is a
  // navigation now, and re-checking on each one asked again and again.
  useEffect(() => {
    if (!prefHydrated || onboardingSettled) return
    setOnboardingSettled(true)
    if (pref.school) setFilter({ mode: "single", school: pref.school })
    // No modal on arrival. It stood between every first-time reader and the
    // page — including one who came from a shared link to a single ruling —
    // and asked first for a language the URL had already settled. The
    // invitation to pick a school is the banner below: visible, skippable,
    // and never in the way of the content.
  }, [prefHydrated, onboardingSettled, pref.school, pref.country, setFilter, setOnboardingOpen, setOnboardingSettled])

  // Deep link: /#F12 was the only address an entry had. Each now has a page
  // of its own, so the old form is carried there — a link someone shared or
  // bookmarked last month keeps working, it just arrives somewhere better.
  useEffect(() => {
    const applyHash = () => {
      const key = window.location.hash.replace("#", "").trim().toUpperCase()
      if (!key) return
      const found = findByRef(key)
      if (!found) return
      router.replace(entryPath(lang, found.kind === "proof" ? found.ref : found.item.ref))
    }
    applyHash()
    window.addEventListener("hashchange", applyHash)
    return () => window.removeEventListener("hashchange", applyHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const issue of issues) c[issue.categoryId] = (c[issue.categoryId] ?? 0) + 1
    return c
  }, [])

  const searching = query.trim().length > 0

  /**
   * How wide a query reaches. A search used to always escape the open book,
   * so a reader sitting on Prayer could not ask "only within Prayer" — the
   * book tabs went inert the moment a letter was typed. The scope is now the
   * reader's to set: it starts at "all" so nothing is hidden by default, and
   * narrows on request.
   */
  const [searchScope, setSearchScope] = useState<"all" | "book" | "chapter">("all")

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

  const visibleSchools = useMemo(() => {
    if (filter.mode === "single") return [filter.school]
    if (filter.mode === "dual") return filter.schools
    return undefined
  }, [filter])

  const filterLabel = useMemo(() => {
    if (filter.mode === "all") return ui.allSchools[lang]
    if (filter.mode === "single") {
      return schools.find((s) => s.key === filter.school)?.name[lang] ?? ""
    }
    return filter.schools.map((k) => schools.find((s) => s.key === k)?.name[lang]).join(" · ")
  }, [filter, lang])

  return (
    <div dir={dir} className="relative min-h-dvh bg-background font-sans text-foreground">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)]"
      />
      <GlobalSearch
        lang={lang}
        open={globalSearchOpen}
        onClose={() => setGlobalSearchOpen(false)}
        onOpenEntry={(href) => router.push(href)}
        onNavigate={(target, anchor) => {
          go(target)
          if (target === "fiqh") {
            // Clear any narrowing, or the card the reader picked may sit
            // outside the open book and never appear.
            setQuery("")
            setScope("all")
            setActiveChapter("")
          }
          if (anchor) {
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                document
                  .getElementById(anchor)
                  ?.scrollIntoView({ behavior: "smooth", block: "start" })
              })
            })
          }
        }}
      />

      <SiteHeader
        lang={lang}
        onLangChange={setLang}
        onOpenSearch={() => setGlobalSearchOpen(true)}
        theme={theme}
        onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />

      <SectionTabs lang={lang} active={section} onSelect={go} />

      {showSchoolHint ? (
        <SchoolHint
          lang={lang}
          onPick={() => {
            // Straight to the school step: the language is already chosen,
            // by the address the reader is on.
            setOnboardingStep(2)
            setOnboardingOpen(true)
            dismissHint()
          }}
          onDismiss={dismissHint}
        />
      ) : null}

      {entry ? (
        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          <EntryNav lang={lang} entry={entry} />
          {entry.kind === "issue" ? (
            <IssueCard
              issue={entry.issue}
              lang={lang}
              visibleSchools={visibleSchools}
              layout={filter.mode === "dual" ? "split" : "grid"}
              viewMode={viewMode}
              bookmarked={isBookmarked(entry.issue.id)}
              onToggleBookmark={toggle}
              onShare={setShareIssue}
            />
          ) : entry.kind === "article" ? (
            <ArticleView article={entry.article} lang={lang} />
          ) : (
            <ProofView proof={entry.proof} lang={lang} />
          )}
        </main>
      ) : section === "fiqh" ? (
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
                  onClick={() => setSchoolModalOpen(true)}
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
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {section === "home" ? (
            <HomeSection
              lang={lang}
              onGo={go}
              onOpenIssue={(id) => {
                const target = issues.find((i) => i.id === id)
                if (target) router.push(entryPath(lang, target.ref))
              }}
            />
          ) : section === "aqidah" ? (
            <TheologySection lang={lang} />
          ) : section === "articles" ? (
            <ArticlesSection lang={lang} />
          ) : section === "glossary" ? (
            <GlossarySection lang={lang} visibleSchools={visibleSchools} />
          ) : (
            <LearnSection lang={lang} />
          )}
        </main>
      )}

      <footer className="mt-4 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <p className="text-pretty text-center text-xs leading-relaxed text-muted-foreground">{ui.footer[lang]}</p>
        </div>
      </footer>

      <SchoolSelectorModal
        open={schoolModalOpen}
        onClose={() => setSchoolModalOpen(false)}
        lang={lang}
        onApply={setFilter}
        selectedCountry={pref.country ?? undefined}
        onCountryPick={(country, school) => savePref({ country: country.code, school })}
      />
      <ShareCardModal
        issue={shareIssue}
        lang={lang}
        visibleSchools={visibleSchools}
        onClose={() => setShareIssue(null)}
      />
      <SchoolSelectorModal
        open={onboardingOpen}
        onClose={() => setOnboardingOpen(false)}
        lang={lang}
        onboarding
        withLanguageStep
        step={onboardingStep}
        onStepChange={setOnboardingStep}
        onLangChange={setLang}
        selectedCountry={pref.country ?? undefined}
        onCountryPick={(country, school) => savePref({ country: country.code, school })}
        onApply={(f) => {
          setFilter(f)
          setOnboardingOpen(false)
          // Stay where they are. Forcing them into the fiqh tab dropped
          // newcomers straight onto Iman rulings before they saw the home page.
        }}
      />
    </div>
  )
}

const HINT_KEY = "fiqh:school-hint-dismissed"

/**
 * The quiet replacement for the arrival modal. It says what choosing a school
 * does — the encyclopedia shows all four by default, and a reader may not
 * know that one can be singled out — and gets out of the way once answered
 * or closed. It does not come back after being closed.
 */
function SchoolHint({
  lang,
  onPick,
  onDismiss,
}: {
  lang: Lang
  onPick: () => void
  onDismiss: () => void
}) {
  return (
    <section aria-label={ui.schoolHintAction[lang]} className="mx-auto max-w-6xl px-4 pt-4 sm:px-6">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] py-2.5 ps-4 pe-2">
        <Scale className="size-4 shrink-0 text-zinc-400" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm leading-snug text-zinc-300">{ui.schoolHintText[lang]}</p>
        <button
          type="button"
          onClick={onPick}
          className="min-h-11 shrink-0 rounded-full bg-primary px-4 text-[13px] font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {ui.schoolHintAction[lang]}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          aria-label={ui.close[lang]}
          title={ui.close[lang]}
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-white/5 hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  )
}

function entryRef(entry: Entry): string {
  return entry.kind === "issue" ? entry.issue.ref : entry.kind === "article" ? entry.article.ref : entry.proof.ref
}

/** The way back to the list the entry belongs to, and the view controls an issue needs. */
function EntryNav({ lang, entry }: { lang: Lang; entry: Entry }) {
  const isRtl = rtlLangs.includes(lang)
  const Back = isRtl ? ChevronRight : ChevronLeft
  const ref = entryRef(entry)
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <Link
        href={sectionPath(lang, ref)}
        className="inline-flex min-h-11 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-foreground transition-colors hover:border-white/25 hover:bg-white/10"
      >
        <Back className="size-4" aria-hidden="true" />
        {ui.backToIndex[lang]}
      </Link>
      <span className="text-[13px] text-muted-foreground">{ui.entryShareHint[lang]}</span>
    </div>
  )
}
