"use client"

import { BookOpen, FileText, GraduationCap, Sparkles } from "lucide-react"
import type { Section } from "@/components/nav-modal"
import { type Lang, ui } from "@/lib/fiqh-data"

interface SectionTabsProps {
  lang: Lang
  active: Section
  onSelect: (section: Section) => void
}

/**
 * Persistent, always-visible section switcher.
 *
 * Replaces the hidden nav modal: the three top-level areas of the site were
 * only discoverable after opening a dialog, so most visitors never learned
 * that the creed and new-Muslim sections existed at all.
 *
 * Scrolls horizontally on narrow screens instead of wrapping, so the bar
 * stays one line tall on mobile.
 */
export function SectionTabs({ lang, active, onSelect }: SectionTabsProps) {
  const items: { key: Section; icon: typeof BookOpen; label: string; desc: string }[] = [
    { key: "fiqh", icon: BookOpen, label: ui.fiqhSection[lang], desc: ui.fiqhSectionDesc[lang] },
    { key: "aqidah", icon: Sparkles, label: ui.aqidahSection[lang], desc: ui.aqidahSectionDesc[lang] },
    { key: "articles", icon: FileText, label: ui.articlesSection[lang], desc: ui.articlesSectionDesc[lang] },
    { key: "learn", icon: GraduationCap, label: ui.learnSection[lang], desc: ui.learnSectionDesc[lang] },
  ]

  return (
    <nav
      aria-label={ui.sections[lang]}
      className="sticky top-[69px] z-20 border-b border-white/10 bg-background/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const isActive = item.key === active
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onSelect(item.key)}
              aria-current={isActive ? "page" : undefined}
              title={item.desc}
              className={`relative flex shrink-0 items-center gap-2 px-3 py-3.5 text-sm font-semibold transition-colors sm:px-4 ${
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{item.label}</span>
              {/* active underline */}
              <span
                aria-hidden="true"
                className={`absolute inset-x-2 bottom-0 h-0.5 rounded-full transition-opacity ${
                  isActive ? "bg-foreground opacity-100" : "opacity-0"
                }`}
              />
            </button>
          )
        })}
      </div>
    </nav>
  )
}
