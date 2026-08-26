"use client"

import { BookOpen, ChevronDown, LayoutGrid, Moon, Sun } from "lucide-react"
import { type Lang, langLabels, ui } from "@/lib/fiqh-data"
import type { Section } from "@/components/nav-modal"

interface SiteHeaderProps {
  lang: Lang
  onLangChange: (lang: Lang) => void
  theme: "dark" | "light"
  onThemeToggle: () => void
  activeSection: Section
  onOpenNav: () => void
  onOpenOnboarding: () => void
}

export function SiteHeader({
  lang,
  onLangChange,
  theme,
  onThemeToggle,
  activeSection,
  onOpenNav,
  onOpenOnboarding,
}: SiteHeaderProps) {
  const sectionLabel =
    activeSection === "fiqh"
      ? ui.fiqhSection[lang]
      : activeSection === "aqidah"
        ? ui.aqidahSection[lang]
        : ui.learnSection[lang]
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold leading-tight text-foreground sm:text-lg">
              {ui.appTitle[lang]}
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{ui.appSubtitle[lang]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenNav}
            aria-haspopup="dialog"
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-semibold text-foreground backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-white/10 md:flex"
          >
            <span className="max-w-[14rem] truncate">{sectionLabel}</span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onOpenNav}
            aria-haspopup="dialog"
            aria-label={ui.sections[lang]}
            title={ui.sections[lang]}
            className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-foreground transition-all duration-200 hover:border-white/25 hover:bg-white/10 md:hidden"
          >
            <ChevronDown className="size-4.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onOpenOnboarding}
            aria-haspopup="dialog"
            aria-label={ui.browseMode[lang]}
            title={ui.browseMode[lang]}
            className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all duration-200 hover:border-white/25 hover:text-white"
          >
            <LayoutGrid className="size-4.5" aria-hidden="true" />
          </button>

          <div
            className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md"
            role="group"
            aria-label={ui.language[lang]}
          >
            {langLabels.map((l) => {
              const active = l.key === lang
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => onLangChange(l.key)}
                  aria-pressed={active}
                  title={l.label}
                  className={`flex min-w-11 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:min-w-0 ${
                    active
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <span aria-hidden="true" className="text-sm leading-none">
                    {l.flag}
                  </span>
                  {l.short}
                </button>
              )
            })}
          </div>

          <button
            type="button"
            onClick={onThemeToggle}
            aria-label={ui.theme[lang]}
            title={ui.theme[lang]}
            className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all duration-200 hover:text-white"
          >
            {theme === "dark" ? (
              <Sun className="size-4.5" aria-hidden="true" />
            ) : (
              <Moon className="size-4.5" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>
    </header>
  )
}
