"use client"

import { Bookmark, LayoutList, Search, X } from "lucide-react"
import { type Lang, ui } from "@/lib/fiqh-data"

export type ScopeFilter = "all" | "saved"

interface FilterBarProps {
  lang: Lang
  query: string
  onQueryChange: (q: string) => void
  scope: ScopeFilter
  onScopeChange: (s: ScopeFilter) => void
  savedCount: number
  resultCount: number
}

export function FilterBar({
  lang,
  query,
  onQueryChange,
  scope,
  onScopeChange,
  savedCount,
  resultCount,
}: FilterBarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Live search input */}
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={ui.searchPlaceholder[lang]}
          aria-label={ui.searchPlaceholder[lang]}
          className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] ps-10 pe-10 text-base text-foreground placeholder:text-muted-foreground/70 backdrop-blur-md transition-colors focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/10"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label={ui.clearSearch[lang]}
            title={ui.clearSearch[lang]}
            className="absolute inset-y-0 end-2.5 my-auto flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <span className="pointer-events-none absolute inset-y-0 end-4 my-auto text-xs font-medium tabular-nums text-muted-foreground/70">
            {resultCount} {ui.searchResults[lang]}
          </span>
        )}
      </div>

      {/* All / Saved quick-filter tabs */}
      <div
        className="flex shrink-0 items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.04] p-1 backdrop-blur-md"
        role="group"
        aria-label={ui.savedItems[lang]}
      >
        <button
          type="button"
          onClick={() => onScopeChange("all")}
          aria-pressed={scope === "all"}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
            scope === "all" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
          }`}
        >
          <LayoutList className="size-4" aria-hidden="true" />
          {ui.allSchools[lang]}
        </button>
        <button
          type="button"
          onClick={() => onScopeChange("saved")}
          aria-pressed={scope === "saved"}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200 ${
            scope === "saved" ? "bg-white text-black shadow-sm" : "text-zinc-400 hover:text-white"
          }`}
        >
          <Bookmark className={`size-4 ${scope === "saved" ? "fill-current" : ""}`} aria-hidden="true" />
          {ui.savedItems[lang]}
          {savedCount > 0 ? (
            <span
              className={`text-[11px] font-semibold tabular-nums ${
                scope === "saved" ? "text-black/50" : "text-zinc-500"
              }`}
            >
              {savedCount}
            </span>
          ) : null}
        </button>
      </div>
    </div>
  )
}
