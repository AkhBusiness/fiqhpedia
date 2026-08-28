"use client"

import { useEffect, useState } from "react"
import { Check, Columns2, Globe, LayoutGrid, User } from "lucide-react"
import { CountryPicker } from "@/components/country-picker"
import { Flag } from "@/components/flag"
import { Modal } from "@/components/modal"
import { type Country, type Lang, langLabels, type SchoolKey, schools, ui } from "@/lib/fiqh-data"

export type SchoolFilter =
  | { mode: "all" }
  | { mode: "single"; school: SchoolKey }
  | { mode: "dual"; schools: [SchoolKey, SchoolKey] }

interface SchoolSelectorModalProps {
  open: boolean
  onClose: () => void
  lang: Lang
  onApply: (filter: SchoolFilter) => void
  /** When true, shows a welcoming onboarding title/description */
  onboarding?: boolean
  /** When true, prepends a language-selection step (Step 1) before the browse-mode step (Step 2) */
  withLanguageStep?: boolean
  /** Called when the user picks a language in Step 1 */
  onLangChange?: (lang: Lang) => void
  /** Currently saved country code, so the picker can mark it. */
  selectedCountry?: string
  /** Called once a country and its school are settled. */
  onCountryPick?: (country: Country, school: SchoolKey) => void
}

export function SchoolSelectorModal({
  open,
  onClose,
  lang,
  onApply,
  onboarding,
  withLanguageStep,
  onLangChange,
  selectedCountry,
  onCountryPick,
}: SchoolSelectorModalProps) {
  const [dualOpen, setDualOpen] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)
  // step 1 = language, step 2 = browse mode. Only relevant when withLanguageStep.
  const [step, setStep] = useState<1 | 2>(withLanguageStep ? 1 : 2)

  // Reset to Step 1 each time an onboarding modal (with language step) is reopened.
  useEffect(() => {
    if (open && withLanguageStep) setStep(1)
  }, [open, withLanguageStep])

  // Never reopen onto the country sub-view from a previous visit.
  useEffect(() => {
    if (!open) setCountryOpen(false)
  }, [open])

  const showLanguageStep = withLanguageStep && step === 1
  const showCountry = countryOpen && !showLanguageStep

  return (
    <>
      <Modal
        open={open && !dualOpen}
        onClose={onClose}
        title={
          showCountry
            ? ui.chooseCountry[lang]
            : showLanguageStep
              ? ui.chooseLanguage[lang]
              : onboarding
                ? ui.welcomeTitle[lang]
                : ui.chooseSchool[lang]
        }
        description={
          showCountry
            ? ui.chooseCountryDesc[lang]
            : showLanguageStep
              ? ui.chooseLanguageDesc[lang]
              : onboarding
                ? ui.welcomeDesc[lang]
                : undefined
        }
        closeLabel={ui.close[lang]}
        size="max-w-md"
      >
        {withLanguageStep ? (
          <div className="mb-4 flex items-center gap-2" aria-hidden="true">
            <span
              className={`h-1 flex-1 rounded-full transition-colors ${step === 1 ? "bg-white" : "bg-white/20"}`}
            />
            <span
              className={`h-1 flex-1 rounded-full transition-colors ${step === 2 ? "bg-white" : "bg-white/20"}`}
            />
          </div>
        ) : null}

        {showCountry ? (
          <CountryPicker
            lang={lang}
            selected={selectedCountry}
            onPick={(country, school) => {
              onCountryPick?.(country, school)
              onApply({ mode: "single", school })
              setCountryOpen(false)
              onClose()
            }}
            onSkip={() => {
              onApply({ mode: "all" })
              setCountryOpen(false)
              onClose()
            }}
          />
        ) : showLanguageStep ? (
          <div className="flex flex-col gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {ui.stepLabel[lang]} 1 / 2
            </span>
            {langLabels.map((l) => {
              const active = l.key === lang
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => {
                    onLangChange?.(l.key)
                    setStep(2)
                  }}
                  aria-pressed={active}
                  className={`group flex items-center gap-4 rounded-2xl border p-4 text-start transition-all duration-200 ${
                    active
                      ? "border-white/30 bg-white/[0.08]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]"
                  }`}
                >
                  <Flag code={l.flagCode} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-base font-bold text-foreground">{l.label}</span>
                    <span className="mt-0.5 block text-xs font-medium text-muted-foreground">{l.short}</span>
                  </span>
                  {active ? (
                    <span className="flex size-5 items-center justify-center rounded-full bg-white text-black">
                      <Check className="size-3.5" aria-hidden="true" />
                    </span>
                  ) : null}
                </button>
              )
            })}
          </div>
        ) : (
        <div className="flex flex-col gap-3">
          {withLanguageStep ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {ui.stepLabel[lang]} 2 / 2
              </span>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-zinc-400 transition-colors hover:text-white"
              >
                {ui.back[lang]}
              </button>
            </div>
          ) : null}
          {/* Option 0: by country — resolves to a single school */}
          {onCountryPick ? (
            <button
              type="button"
              onClick={() => setCountryOpen(true)}
              className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-start transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground">
                <Globe className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">{ui.chooseCountry[lang]}</span>
                <span className="mt-0.5 block text-pretty text-xs leading-relaxed text-muted-foreground">
                  {ui.chooseCountryDesc[lang]}
                </span>
              </span>
            </button>
          ) : null}

          {/* Option 1: all schools */}
          <button
            type="button"
            onClick={() => {
              onApply({ mode: "all" })
              onClose()
            }}
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-start transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground">
              <LayoutGrid className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">{ui.showAllSchools[lang]}</span>
              <span className="mt-0.5 block text-pretty text-xs leading-relaxed text-muted-foreground">
                {ui.showAllSchoolsDesc[lang]}
              </span>
            </span>
          </button>

          {/* Option 2: single school */}
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2">
              <User className="size-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-bold text-foreground">{ui.singleSchool[lang]}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {schools.map((school) => (
                <button
                  key={school.key}
                  type="button"
                  onClick={() => {
                    onApply({ mode: "single", school: school.key })
                    onClose()
                  }}
                  className={`flex items-center gap-2 rounded-xl border ${school.color.border} bg-white/[0.02] px-3 py-2.5 text-start text-sm font-semibold transition-all duration-200 ${school.color.ring} ${school.color.glow}`}
                >
                  <span className={`size-2.5 shrink-0 rounded-full ${school.color.dot}`} aria-hidden="true" />
                  <span className="truncate text-foreground">{school.name[lang]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Option 3: dual comparison */}
          <button
            type="button"
            onClick={() => setDualOpen(true)}
            className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-start transition-all duration-200 hover:border-white/20 hover:bg-white/[0.06]"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-foreground">
              <Columns2 className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-foreground">{ui.dualComparison[lang]}</span>
              <span className="mt-0.5 block text-pretty text-xs leading-relaxed text-muted-foreground">
                {ui.dualComparisonDesc[lang]}
              </span>
            </span>
          </button>
        </div>
        )}
      </Modal>

      <DualComparisonModal
        open={open && dualOpen}
        onBack={() => setDualOpen(false)}
        lang={lang}
        onApply={(pair) => {
          onApply({ mode: "dual", schools: pair })
          setDualOpen(false)
          onClose()
        }}
      />
    </>
  )
}

interface DualComparisonModalProps {
  open: boolean
  onBack: () => void
  lang: Lang
  onApply: (pair: [SchoolKey, SchoolKey]) => void
}

function DualComparisonModal({ open, onBack, lang, onApply }: DualComparisonModalProps) {
  const [selected, setSelected] = useState<SchoolKey[]>([])

  const toggle = (key: SchoolKey) => {
    setSelected((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key)
      if (prev.length >= 2) return [prev[1], key]
      return [...prev, key]
    })
  }

  const canApply = selected.length === 2

  return (
    <Modal
      open={open}
      onClose={onBack}
      title={ui.dualComparison[lang]}
      description={ui.selectTwoSchools[lang]}
      closeLabel={ui.close[lang]}
      size="max-w-md"
    >
      <div className="flex flex-col gap-2">
        {schools.map((school) => {
          const isSelected = selected.includes(school.key)
          return (
            <button
              key={school.key}
              type="button"
              onClick={() => toggle(school.key)}
              aria-pressed={isSelected}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition-all duration-200 ${
                isSelected ? `${school.color.border} bg-white/[0.06]` : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              <span className={`size-3 shrink-0 rounded-full ${school.color.dot}`} aria-hidden="true" />
              <span className="flex-1 text-sm font-semibold text-foreground">{school.name[lang]}</span>
              <span
                className={`flex size-5 items-center justify-center rounded-full border transition-colors ${
                  isSelected ? "border-white bg-white text-black" : "border-white/20 text-transparent"
                }`}
              >
                <Check className="size-3.5" aria-hidden="true" />
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white"
        >
          {ui.cancel[lang]}
        </button>
        <button
          type="button"
          disabled={!canApply}
          onClick={() => canApply && onApply([selected[0], selected[1]])}
          className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-black shadow-md transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {ui.apply[lang]}
        </button>
      </div>
    </Modal>
  )
}
