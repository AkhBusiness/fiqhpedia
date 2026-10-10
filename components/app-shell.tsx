"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import dynamic from "next/dynamic"
import Link from "next/link"
import { ChevronLeft, ChevronRight, Scale, X } from "lucide-react"
import { SiteHeader } from "@/components/site-header"
import type { ViewMode } from "@/components/issue-card"
import type { Section } from "@/components/nav-modal"
import { SectionTabs } from "@/components/section-tabs"
import type { SchoolFilter } from "@/components/school-selector-modal"
import { type FullArticle, type FullIssue, type Lang, type Localized, rtlLangs, schools, type TheologyProof, ui } from "@/lib/fiqh-data"
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
const FiqhSection = dynamic(() => import("@/components/fiqh-section").then((m) => m.FiqhSection))
const HomeSection = dynamic(() => import("@/components/home-section").then((m) => m.HomeSection))
const TheologySection = dynamic(() => import("@/components/theology-section").then((m) => m.TheologySection))
const ArticlesSection = dynamic(() => import("@/components/articles-section").then((m) => m.ArticlesSection))
const GlossarySection = dynamic(() => import("@/components/glossary-section").then((m) => m.GlossarySection))
const AboutSection = dynamic(() => import("@/components/about-section").then((m) => m.AboutSection))
const SourcesSection = dynamic(() => import("@/components/sources-section").then((m) => m.SourcesSection))
const LearnSection = dynamic(() => import("@/components/learn-section").then((m) => m.LearnSection))
const GlobalSearch = dynamic(() => import("@/components/global-search").then((m) => m.GlobalSearch), { ssr: false })
const ShareCardModal = dynamic(() => import("@/components/share-card-modal").then((m) => m.ShareCardModal), { ssr: false })
const SchoolSelectorModal = dynamic(
  () => import("@/components/school-selector-modal").then((m) => m.SchoolSelectorModal),
  { ssr: false },
)

/** One entry rendered on its own page, in place of the section's list. */
/** A neighbour in the chapter: enough for a link, computed at build time. */
export interface Neighbour {
  ref: string
  title: Localized
}

export type Entry =
  | { kind: "issue"; issue: FullIssue; prev: Neighbour | null; next: Neighbour | null }
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
  const [searchSeed, setSearchSeed] = useState("")
  const {
    theme, setTheme,
    activeCategory, setActiveCategory,
    activeChapter, setActiveChapter,
    searchScope, setSearchScope,
    filter, setFilter,
    query, setQuery,
    scope, setScope,
    viewMode, setViewMode,
    onboardingOpen, setOnboardingOpen,
    onboardingStep, setOnboardingStep,
    onboardingSettled, setOnboardingSettled,
  } = useAppState()
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
    section === "fiqh"

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
      // The index is not on this page; fetch it for the one lookup.
      import("@/lib/fiqh-index").then((m) => {
        const found = m.findByRef(key)
        if (!found) return
        router.replace(entryPath(lang, found.kind === "proof" ? found.ref : found.item.ref))
      })
    }
    applyHash()
    window.addEventListener("hashchange", applyHash)
    return () => window.removeEventListener("hashchange", applyHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    <div dir={dir} className={`relative min-h-dvh bg-background font-sans text-foreground ${showSchoolHint ? "pb-24" : ""}`}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(60%_100%_at_50%_0%,rgba(255,255,255,0.06),transparent_70%)]"
      />
      <GlobalSearch
        lang={lang}
        open={globalSearchOpen}
        onClose={() => {
          setGlobalSearchOpen(false)
          setSearchSeed("")
        }}
        initialQuery={searchSeed}
        onOpenBook={(id) => {
          setActiveCategory(id)
          setActiveChapter("")
          setScope("all")
          setQuery("")
          go("fiqh")
        }}
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
          {entry.kind === "issue" ? <ChapterNav lang={lang} prev={entry.prev} next={entry.next} /> : null}
        </main>
      ) : section === "fiqh" ? (
        <FiqhSection lang={lang} go={go} filterLabel={filterLabel} onOpenSchoolModal={() => setSchoolModalOpen(true)} />
      ) : (
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
          {section === "home" ? (
            <HomeSection
              lang={lang}
              onGo={go}
              onSearch={(q) => {
                setSearchSeed(q)
                setGlobalSearchOpen(true)
              }}
              onOpenBook={(id) => {
                setActiveCategory(id)
                setActiveChapter("")
                setScope("all")
                setQuery("")
                go("fiqh")
              }}
            />
          ) : section === "aqidah" ? (
            <TheologySection lang={lang} />
          ) : section === "articles" ? (
            <ArticlesSection lang={lang} />
          ) : section === "glossary" ? (
            <GlossarySection lang={lang} visibleSchools={visibleSchools} />
          ) : section === "about" ? (
            <AboutSection lang={lang} />
          ) : section === "sources" ? (
            <SourcesSection lang={lang} />
          ) : (
            <LearnSection lang={lang} />
          )}
        </main>
      )}

      <footer className="mt-4 border-t border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
          <nav className="mb-3 flex flex-wrap justify-center gap-x-5 gap-y-1" aria-label={ui.aboutSection[lang]}>
            <Link href={`/${lang}/about`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-muted-foreground hover:text-foreground">
              {ui.aboutSection[lang]}
            </Link>
            <Link href={`/${lang}/sources`} className="inline-flex min-h-11 items-center text-[13px] font-semibold text-muted-foreground hover:text-foreground">
              {ui.sourcesSection[lang]}
            </Link>
          </nav>
          <p className="text-pretty text-center text-[13px] leading-relaxed text-muted-foreground">{ui.footer[lang]}</p>
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
    /* Anchored to the bottom, not inserted above the page: it only appears
       after hydration, and pushing the content down by a hundred pixels
       just as the reader starts reading was the whole of our layout shift. */
    <section
      aria-label={ui.schoolHintAction[lang]}
      className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6"
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-white/15 bg-popover/95 py-2.5 ps-4 pe-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
        <Scale className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm leading-snug text-foreground/85">{ui.schoolHintText[lang]}</p>
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

/**
 * Previous and next issue within the same chapter, at the foot of the page.
 * A reader who arrived from a search or a shared link has no list to go
 * back to; the chapter is the natural thing to read on through. The pair is
 * computed by the page at build time (`chapterNeighbours`), so this page
 * does not carry the index to find two titles.
 */
function ChapterNav({ lang, prev, next }: { lang: Lang; prev: Neighbour | null; next: Neighbour | null }) {
  const isRtl = rtlLangs.includes(lang)
  const Prev = isRtl ? ChevronRight : ChevronLeft
  const Next = isRtl ? ChevronLeft : ChevronRight
  if (!prev && !next) return null
  const cls =
    "flex min-h-14 min-w-0 flex-1 flex-col gap-0.5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 transition-colors hover:border-white/25 hover:bg-white/[0.06]"
  return (
    <nav aria-label={ui.inChapterNav[lang]} className="mt-6 flex gap-2">
      {prev ? (
        <Link href={entryPath(lang, prev.ref)} className={cls}>
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            <Prev className="size-3.5" aria-hidden="true" />
            {ui.prevIssue[lang]}
          </span>
          <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{prev.title[lang]}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
      {next ? (
        <Link href={entryPath(lang, next.ref)} className={`${cls} items-end text-end`}>
          <span className="flex items-center gap-1 text-[13px] text-muted-foreground">
            {ui.nextIssue[lang]}
            <Next className="size-3.5" aria-hidden="true" />
          </span>
          <span className="line-clamp-2 text-[15px] font-semibold leading-snug text-foreground">{next.title[lang]}</span>
        </Link>
      ) : (
        <span className="flex-1" />
      )}
    </nav>
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
