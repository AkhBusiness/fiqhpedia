"use client"

import { useEffect, useMemo, useState } from "react"
import { Library, RotateCcw, SlidersHorizontal } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import { CategoryTabs } from "@/components/category-tabs"
import { IssueCard, type ViewMode } from "@/components/issue-card"
import type { Section } from "@/components/nav-modal"
import { SectionTabs } from "@/components/section-tabs"
import { SchoolSelectorModal, type SchoolFilter } from "@/components/school-selector-modal"
import { TheologySection } from "@/components/theology-section"
import { LearnSection } from "@/components/learn-section"
import { ViewModeToggle } from "@/components/view-mode-toggle"
import { ShareCardModal } from "@/components/share-card-modal"
import { FilterBar, type ScopeFilter } from "@/components/filter-bar"
import { categories, type Issue, issues, issueMatchesQuery, type Lang, rtlLangs, schools, ui } from "@/lib/fiqh-data"
import { useBookmarks } from "@/hooks/use-bookmarks"
import { usePreference } from "@/hooks/use-preference"

export default function Page() {
  const [lang, setLang] = useState<Lang>("ar")
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  const [activeCategory, setActiveCategory] = useState<string>("iman")
  const [section, setSection] = useState<Section>("fiqh")
  const [schoolModalOpen, setSchoolModalOpen] = useState(false)
  // Starts closed: opened below only once we know no preference is stored,
  // so returning visitors are never shown onboarding again.
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [filter, setFilter] = useState<SchoolFilter>({ mode: "all" })
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("academic")
  const [shareIssue, setShareIssue] = useState<Issue | null>(null)
  const { count: savedCount, toggle, isBookmarked } = useBookmarks()
  const { pref, hydrated: prefHydrated, save: savePref } = usePreference()

  const dir = rtlLangs.includes(lang) ? "rtl" : "ltr"

  useEffect(() => {
    const root = document.documentElement
    root.lang = lang
    root.dir = dir
    root.classList.toggle("dark", theme === "dark")
    root.classList.toggle("light", theme === "light")
  }, [lang, dir, theme])

  // Apply the stored preference once, after hydration.
  useEffect(() => {
    if (!prefHydrated) return
    if (pref.school) setFilter({ mode: "single", school: pref.school })
    else if (!pref.country) setOnboardingOpen(true)
  }, [prefHydrated, pref.school, pref.country])

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    for (const issue of issues) c[issue.categoryId] = (c[issue.categoryId] ?? 0) + 1
    return c
  }, [])

  const visibleIssues = useMemo(() => {
    const base =
      scope === "saved"
        ? issues.filter((i) => isBookmarked(i.id))
        : issues.filter((i) => i.categoryId === activeCategory)
    return base
      .filter((i) => issueMatchesQuery(i, query))
      .sort((a, b) => a.number - b.number)
  }, [activeCategory, scope, query, isBookmarked])

  const activeCategoryName =
    scope === "saved" ? ui.savedItems[lang] : categories.find((c) => c.id === activeCategory)?.name[lang] ?? ""

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
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        onOpenOnboarding={() => setOnboardingOpen(true)}
      />

      <SectionTabs lang={lang} active={section} onSelect={setSection} />

      {section === "fiqh" ? (
        <>
          <CategoryTabs
            lang={lang}
            activeId={scope === "saved" ? "" : activeCategory}
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
          {section === "aqidah" ? <TheologySection lang={lang} /> : <LearnSection lang={lang} />}
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
        onLangChange={setLang}
        selectedCountry={pref.country ?? undefined}
        onCountryPick={(country, school) => savePref({ country: country.code, school })}
        onApply={(f) => {
          setFilter(f)
          setSection("fiqh")
        }}
      />
    </div>
  )
}
