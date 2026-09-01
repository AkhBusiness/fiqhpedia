"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import type { SchoolFilter } from "@/components/school-selector-modal"
import type { ViewMode } from "@/components/issue-card"
import type { ScopeFilter } from "@/components/filter-bar"

interface AppState {
  theme: "dark" | "light"
  setTheme: (v: "dark" | "light") => void

  activeCategory: string
  setActiveCategory: (v: string) => void
  filter: SchoolFilter
  setFilter: (v: SchoolFilter) => void
  query: string
  setQuery: (v: string) => void
  scope: ScopeFilter
  setScope: (v: ScopeFilter) => void
  viewMode: ViewMode
  setViewMode: (v: ViewMode) => void

  /** Onboarding lives here too: picking a language navigates, and anything
   *  held below the router would be destroyed mid-flow and reopen at step 1. */
  onboardingOpen: boolean
  setOnboardingOpen: (v: boolean) => void
  onboardingStep: 1 | 2
  setOnboardingStep: (v: 1 | 2) => void
  /** True once we have decided whether to show onboarding, so that later
   *  navigations never re-trigger the check and ask again. */
  onboardingSettled: boolean
  setOnboardingSettled: (v: boolean) => void
}

const Ctx = createContext<AppState | null>(null)

/**
 * State that must outlive a route change.
 *
 * Sections and languages are URL segments now, so moving between them
 * remounts the page. Anything kept in the page — the search box, the chosen
 * school, the onboarding step — was being reset on every tab click. Mounted
 * in the root layout, which is the one thing the router never unmounts.
 */
export function AppStateProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"dark" | "light">("dark")
  // الطهارة لا الإيمان: أول أبواب الفقه العملي، وأكثرها مسائل،
  // وفصولها تُظهر فلتر الفصول من أول زيارة.
  const [activeCategory, setActiveCategory] = useState("taharah")
  const [filter, setFilter] = useState<SchoolFilter>({ mode: "all" })
  const [query, setQuery] = useState("")
  const [scope, setScope] = useState<ScopeFilter>("all")
  const [viewMode, setViewMode] = useState<ViewMode>("academic")
  const [onboardingOpen, setOnboardingOpen] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1)
  const [onboardingSettled, setOnboardingSettled] = useState(false)

  return (
    <Ctx.Provider
      value={{
        theme, setTheme,
        activeCategory, setActiveCategory,
        filter, setFilter,
        query, setQuery,
        scope, setScope,
        viewMode, setViewMode,
        onboardingOpen, setOnboardingOpen,
        onboardingStep, setOnboardingStep,
        onboardingSettled, setOnboardingSettled,
      }}
    >
      {children}
    </Ctx.Provider>
  )
}

export function useAppState(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error("useAppState must be used inside AppStateProvider")
  return v
}
