"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Library, RotateCcw, SlidersHorizontal } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { CategoryTabs } from "@/components/category-tabs"
import { IssueCard, type ViewMode } from "@/components/issue-card"
import type { Section } from "@/components/nav-modal"
import { ArticlesSection } from "@/components/articles-section"
import { SectionTabs } from "@/components/section-tabs"
import { SchoolSelectorModal, type SchoolFilter } from "@/components/school-selector-modal"
import { TheologySection } from "@/components/theology-section"
import { LearnSection } from "@/components/learn-section"
import { HomeSection } from "@/components/home-section"
import { GlossarySection } from "@/components/glossary-section"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import { ShareCardModal } from "@/components/share-card-modal"
import { FilterBar, type ScopeFilter } from "@/components/filter-bar"
import { categories, type Issue, issues, issueMatchesQuery, type Lang, rtlLangs, schools, searchAll, ui , findByRef } from "@/lib/fiqh-data"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { usePreference } from "@/hooks/use-preference"
import { useAppState } from "@/components/app-state"

interface AppShellProps {
  /** From the route. The URL is the source of truth for both. */
  lang: Lang
  section: Section
}

/**
 * The whole application below the route layer.
 *
 * `lang` and `section` are props, not state: they live in the URL so that a
 * shared link reopens the same section in the same language. Changing either
 * is a navigation, which is what makes the back button work between tabs.
 */
export function AppShell({ lang, section }: AppShellProps) {
  const router = useRouter()

  /** Navigate to a section, keeping the current language. */
  const go = (next: Section) =>
    router.push(next === "home" ? `/${lang}` : `/${lang}/${next}`)

  /** Switch language, staying on the same section. */
  const setLang = (next: Lang) =>
    router.push(section === "home" ? `/${next}` : `/${next}/${section}`)

  const [schoolModalOpen, setSchoolModalOpen] = useState(false)
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
  const [shareIssue, setShareIssue] = useState<Issue | null>(null)
  const { count: savedCount, toggle, isBookmarked } = useBookmarks()
  const { pref, hydrated: prefHydrated, save: savePref } = usePreference()

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
    else if (!pref.country) setOnboardingOpen(true)
  }, [prefHydrated, onboardingSettled, pref.school, pref.country, setFilter, setOnboardingOpen, setOnboardingSettled])

  // Deep link: /#F12 switches to the right section and book, clears any
  // filter that would hide the target, then scrolls the card into view.
  // A ref pointing at a proof is handled by TheologySection instead.
  useEffect(() => {
    const applyHash = () => {
      const key = window.location.hash.replace("#", "").trim().toUpperCase()
      if (!key) return
      const found = findByRef(key)
      if (!found) return

      // Proofs and articles live in their own tabs; switch there and let
      // that section's own hash listener open the reader.
      if (found.kind === "proof") {
        go("aqidah")
        return
      }
      if (found.kind === "article") {
        go("articles")
        return
      }

      go("fiqh")
      setActiveCategory(found.item.categoryId)
      setScope("all")
      setQuery("")

      // Wait for the category switch to render before scrolling.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.getElementById(key)?.scrollIntoView({ behavior: "smooth", block: "start" })
        })
      })
    }
    applyHash()
    window.addEventListener("hashchange", applyHash)
    return () => window.removeEventListener("hashchange", applyHash)
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const issue of issues) c[issue.categoryId] = (c[issue.categoryId] ?? 0) + 1
    return c
  }, [])

  const searching = query.trim().length > 0

  // A query escapes the open book. Sitting on Prayer and typing "tayammum"
  // used to return nothing, because the filter ran inside the active book
  // first — the reader was told the site had no such issue while it sat one
  // tab away. Book order is kept so grouped results read in site order.
  const visibleIssues = useMemo(() => {
    const bookOrder = new Map(categories.map((c, n) => [c.id, n]))
    const base =
      scope === "saved"
        ? issues.filter((i) => isBookmarked(i.id))
        : searching
          ? issues
          : issues.filter((i) => i.categoryId === activeCategory)
    return base
      .filter((i) => issueMatchesQuery(i, query))
      .sort(
        (a, b) =>
          (bookOrder.get(a.categoryId) ?? 0) - (bookOrder.get(b.categoryId) ?? 0) ||
          a.number - b.number,
      )
  }, [activeCategory, scope, query, searching, isBookmarked])

  /** Matches outside the fiqh tab, so a search is never silently partial. */
  const otherHits = useMemo(() => {
    if (!searching) return null
    const r = searchAll(query)
    const items = ([
      { key: "aqidah", label: ui.aqidahSection[lang], count: r.proofs.length, go: "aqidah" },
      { key: "articles", label: ui.articlesSection[lang], count: r.articles.length, go: "articles" },
      { key: "glossary", label: ui.glossarySection[lang], count: r.terms.length, go: "glossary" },
      { key: "learn", label: ui.learnSection[lang], count: r.faqs.length, go: "learn" },
    ] satisfies { key: string; label: string; count: number; go: Section }[]).filter(
      (i) => i.count > 0,
    )
    return items.length > 0 ? items : null
  }, [searching, query, lang])

  const activeCategoryName =
    scope === "saved"
      ? ui.savedItems[lang]
      : searching
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
      <SiteHeader
        lang={lang}
        onLangChange={setLang}
        theme={theme}
        onThemeToggle={() => setTheme(theme === "dark" ? "light" : "dark")}
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />

      <SectionTabs lang={lang} active={section} onSelect={go} />

      {section === "fiqh" ? (
        <>
          <CategoryTabs
            lang={lang}
            activeId={scope === "saved" || searching ? "" : activeCategory}
            counts={counts}
            onSelect={(id) => {
              setActiveCategory(id)
              setScope("all")
            }}
          />

          <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <FilterBar
              lang={lang}
              query={query}
              onQueryChange={setQuery}
              scope={scope}
              onScopeChange={setScope}
              savedCount={savedCount}
              resultCount={visibleIssues.length}
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
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-foreground backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-white/10"
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
                    className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-white/25 hover:bg-white/10"
                  >
                    {h.label}
                    <span className="tabular-nums text-muted-foreground">{h.count}</span>
                  </button>
                ))}
              </div>
            ) : null}

            {visibleIssues.length > 0 ? (
              <div className="flex flex-col gap-6">
                {visibleIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    lang={lang}
                    visibleSchools={visibleSchools}
                    layout={filter.mode === "dual" ? "split" : "grid"}
                    viewMode={viewMode}
                    bookmarked={isBookmarked(issue.id)}
                    onToggleBookmark={toggle}
                    onShare={setShareIssue}
                  />
                ))}
              </div>
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
        </>
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {section === "home" ? (
            <HomeSection lang={lang} onGo={go} />
          ) : section === "aqidah" ? (
            <TheologySection lang={lang} />
          ) : section === "articles" ? (
            <ArticlesSection lang={lang} />
          ) : section === "glossary" ? (
            <GlossarySection lang={lang} />
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
