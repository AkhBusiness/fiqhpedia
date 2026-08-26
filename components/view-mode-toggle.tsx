"use client"

import { GraduationCap, Sprout } from "lucide-react"
import type { ViewMode } from "@/components/issue-card"
import { type Lang, ui } from "@/lib/fiqh-data"

interface ViewModeToggleProps {
  lang: Lang
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewModeToggle({ lang, value, onChange }: ViewModeToggleProps) {
  const options: { key: ViewMode; label: string; icon: typeof GraduationCap }[] = [
    { key: "academic", label: ui.academicMode[lang], icon: GraduationCap },
    { key: "simplified", label: ui.simplifiedMode[lang], icon: Sprout },
  ]

  return (
    <div
      role="group"
      aria-label={ui.viewMode[lang]}
      className="flex items-center gap-0.5 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur-md"
    >
      {options.map((o) => {
        const active = o.key === value
        const Icon = o.icon
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={active}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-200 ${
              active ? "bg-white text-black shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        )
      })}
    </div>
  )
}
