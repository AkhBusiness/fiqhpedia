"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, Check, Globe, LayoutGrid, Moon, Search, Sun } from "lucide-react"
import { Flag } from "@/components/flag"
import { type Lang, langLabels, ui } from "@/lib/fiqh-data"

interface SiteHeaderProps {
  lang: Lang
  onLangChange: (lang: Lang) => void
  theme: "dark" | "light"
  onThemeToggle: () => void
  onOpenOnboarding: () => void
  /** Opens the site-wide search. Distinct from the fiqh tab's own filter. */
  onOpenSearch: () => void
}

export function SiteHeader({
  lang,
  onLangChange,
  theme,
  onThemeToggle,
  onOpenOnboarding,
  onOpenSearch,
}: SiteHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-y border-white/10 bg-background/70 backdrop-blur-xl">
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
                className="shrink-0 rounded-full border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500 max-[359px]:hidden"
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
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all duration-200 hover:border-white/25 hover:text-white"
          >
            <LayoutGrid className="size-4.5" aria-hidden="true" />
          </button>

          <LanguageMenu lang={lang} onLangChange={onLangChange} />

          <button
            type="button"
            onClick={onOpenSearch}
            aria-label={ui.globalSearch[lang]}
            title={ui.globalSearch[lang]}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all duration-200 hover:text-white"
          >
            <Search className="size-4.5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onThemeToggle}
            aria-label={ui.theme[lang]}
            title={ui.theme[lang]}
            className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all duration-200 hover:text-white"
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

/**
 * One control for the language, not five.
 *
 * Five flag-and-code pills took about 260px that could not shrink. On a phone
 * that left the title and the beta tag fighting the school button for what
 * remained, and they drew over each other. A globe is the sign readers
 * already know for "language", whatever language they read, so the row
 * collapses to one button the size of its neighbours: icon alone on a phone,
 * icon and the word "Language" in the reader's own language from sm upward.
 *
 * The label names the control, not the current choice — a reader who has
 * landed in a script they cannot read still finds the globe.
 */
function LanguageMenu({
  lang,
  onLangChange,
}: {
  lang: Lang
  onLangChange: (lang: Lang) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false)
        buttonRef.current?.focus()
      }
    }
    document.addEventListener("pointerdown", onPointer)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("pointerdown", onPointer)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={ui.language[lang]}
        title={ui.language[lang]}
        className={`flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full border bg-white/5 text-zinc-400 transition-all duration-200 hover:border-white/25 hover:text-white sm:px-3 ${
          open ? "border-white/25 text-foreground" : "border-white/10"
        }`}
      >
        <Globe className="size-4.5" aria-hidden="true" />
        <span className="hidden text-xs font-semibold sm:inline">{ui.language[lang]}</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label={ui.language[lang]}
          /* end-0, not right-0: in Arabic the button sits on the left of the
             header and the menu must open inward from it, not off-screen. */
          className="absolute end-0 top-full z-40 mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-popover p-1.5 text-popover-foreground shadow-xl"
        >
          {langLabels.map((l) => {
            const active = l.key === lang
            if (l.pending) {
              return (
                <div
                  key={l.key}
                  role="menuitemradio"
                  aria-checked={false}
                  aria-disabled="true"
                  className="flex cursor-default items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-zinc-600"
                >
                  <span className="opacity-40">
                    <Flag code={l.flagCode} size={18} />
                  </span>
                  <span className="flex-1 opacity-60">{l.label}</span>
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400">
                    {ui.comingSoon[lang]}
                  </span>
                </div>
              )
            }
            return (
              <button
                key={l.key}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                /* Each name in its own language, so a reader looks for the
                   word they can read rather than decoding a two-letter code. */
                lang={l.key}
                onClick={() => {
                  onLangChange(l.key as Lang)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-start text-sm transition-colors ${
                  active
                    ? "bg-white/15 font-semibold text-foreground"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Flag code={l.flagCode} size={18} />
                <span className="flex-1">{l.label}</span>
                {active ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
