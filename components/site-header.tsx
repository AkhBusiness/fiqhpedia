"use client"

import { BookOpen, LayoutGrid, Moon, Sun } from "lucide-react"
import { Flag } from "@/components/flag"
import { type Lang, langLabels, ui } from "@/lib/fiqh-data"

interface SiteHeaderProps {
  lang: Lang
  onLangChange: (lang: Lang) => void
  theme: "dark" | "light"
  onThemeToggle: () => void
  onOpenOnboarding: () => void
}

export function SiteHeader({
  lang,
  onLangChange,
  theme,
  onThemeToggle,
  onOpenOnboarding,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3.5 sm:px-6 lg:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground">
            <BookOpen className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-base font-bold leading-tight text-foreground sm:text-lg">
                {ui.appTitle[lang]}
              </h1>
              <span
                title={ui.betaNote[lang]}
                className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500"
              >
                {ui.betaTag[lang]}
              </span>
            </div>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">{ui.appSubtitle[lang]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
              // A pending language is shown so visitors know it is coming,
              // but it cannot be chosen: its pages would be half-English.
              if (l.pending) {
                return (
                  <span
                    key={l.key}
                    title={`${l.label} — ${ui.comingSoon[lang]}`}
                    aria-disabled="true"
                    className="flex min-w-11 cursor-default items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-zinc-600 sm:min-w-0"
                  >
                    <span className="opacity-40">
                      <Flag code={l.flagCode} size={16} />
                    </span>
                    <span className="opacity-60">{l.short}</span>
                    <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-bold text-zinc-400">
                      {ui.comingSoon[lang]}
                    </span>
                  </span>
                )
              }
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => onLangChange(l.key as Lang)}
                  aria-pressed={active}
                  title={l.label}
                  className={`flex min-w-11 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 sm:min-w-0 ${
                    active
                      ? "bg-white text-black shadow-sm"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  <Flag code={l.flagCode} size={16} />
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
