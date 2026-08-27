"use client"

import { useMemo, useState } from "react"
import { Check, Search } from "lucide-react"
import { type Country, type Lang, type SchoolKey, countries, schools, ui } from "@/lib/fiqh-data"

interface CountryPickerProps {
  lang: Lang
  /** Currently selected country code, if any. */
  selected?: string
  /** Fires once a country AND a school are settled. */
  onPick: (country: Country, school: SchoolKey) => void
  /** "Show all schools instead" escape hatch. */
  onSkip?: () => void
}

/**
 * Country -> school picker.
 *
 * Countries whose `school` is null (Oman, Russia) do not resolve to a school
 * on their own, so picking one opens an inline school step rather than
 * committing a default the visitor never chose.
 */
export function CountryPicker({ lang, selected, onPick, onSkip }: CountryPickerProps) {
  const [query, setQuery] = useState("")
  const [pendingManual, setPendingManual] = useState<Country | null>(null)

  const sorted = useMemo(
    () => [...countries].sort((a, b) => a.name[lang].localeCompare(b.name[lang], lang)),
    [lang],
  )

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    // Match on any language so a visitor typing "Egypt" finds مصر.
    return sorted.filter((c) =>
      [c.name.ar, c.name.en, c.name.ru, c.code].some((n) => n.toLowerCase().includes(q)),
    )
  }, [sorted, query])

  // --- manual school step -------------------------------------------------
  if (pendingManual) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          <span className="me-1.5 text-lg leading-none" aria-hidden="true">
            {pendingManual.flag}
          </span>
          {ui.pickSchoolForCountry[lang]}
        </p>

        {schools.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(pendingManual, s.key)}
            className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-start transition-all duration-200 hover:border-white/25 hover:bg-white/[0.06]"
          >
            <span className="text-base font-bold text-foreground">{s.name[lang]}</span>
          </button>
        ))}

        <button
          type="button"
          onClick={() => setPendingManual(null)}
          className="mt-1 self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
        >
          {ui.back[lang]}
        </button>
      </div>
    )
  }

  // --- country list -------------------------------------------------------
  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ui.searchCountry[lang]}
          aria-label={ui.searchCountry[lang]}
          className="w-full rounded-xl border border-white/10 bg-white/[0.04] py-2.5 pe-3 ps-9 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-white/25"
        />
      </div>

      <div className="-mx-1 max-h-[46vh] overflow-y-auto px-1">
        {visible.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{ui.noCountryMatch[lang]}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {visible.map((c) => {
              const isActive = c.code === selected
              const schoolName = c.school
                ? schools.find((s) => s.key === c.school)?.name[lang]
                : null
              return (
                <li key={c.code}>
                  <button
                    type="button"
                    onClick={() => {
                      if (c.school) onPick(c, c.school)
                      else setPendingManual(c)
                    }}
                    aria-pressed={isActive}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-start transition-all duration-200 ${
                      isActive
                        ? "border-white/30 bg-white/[0.08]"
                        : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]"
                    }`}
                  >
                    <span className="text-2xl leading-none" aria-hidden="true">
                      {c.flag}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold text-foreground">
                        {c.name[lang]}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {schoolName ?? ui.pickSchoolForCountry[lang]}
                      </span>
                    </span>
                    {isActive ? (
                      <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white text-black">
                        <Check className="size-3.5" aria-hidden="true" />
                      </span>
                    ) : null}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">{ui.countryNote[lang]}</p>

      {onSkip ? (
        <button
          type="button"
          onClick={onSkip}
          className="self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
        >
          {ui.skipCountry[lang]}
        </button>
      ) : null}
    </div>
  )
}
