"use client"

import { useMemo, useState } from "react"
import { Check, ListChecks, RotateCcw } from "lucide-react"
import { GlossaryText } from "@/components/glossary-tooltip"
import { type Guide, type Lang, rtlLangs, ui } from "@/lib/fiqh-data"

interface ProcessStepsProps {
  guide: Guide
  lang: Lang
}

export function ProcessSteps({ guide, lang }: ProcessStepsProps) {
  const isRtl = rtlLangs.includes(lang)
  const [done, setDone] = useState<Set<number>>(new Set())

  const total = guide.steps.length
  const completed = done.size
  const progress = Math.round((completed / total) * 100)

  /** First step that is not yet completed = the "current" step. */
  const currentIndex = useMemo(() => {
    for (let i = 0; i < total; i++) if (!done.has(i)) return i
    return -1
  }, [done, total])

  function toggle(i: number) {
    setDone((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-card backdrop-blur-md">
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ListChecks className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
              <h3 className="text-balance text-base font-bold leading-snug text-foreground sm:text-lg">
                {guide.title[lang]}
              </h3>
            </div>
            <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">{guide.intro[lang]}</p>
          </div>
          {completed > 0 ? (
            <button
              type="button"
              onClick={() => setDone(new Set())}
              className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3.5" aria-hidden="true" />
              {ui.resetView[lang]}
            </button>
          ) : null}
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
            <span>
              {completed} / {total} {ui.stepsLabel[lang]}
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <ol className="flex flex-col p-4 sm:p-5">
        {guide.steps.map((step, i) => {
          const isDone = done.has(i)
          const isCurrent = i === currentIndex
          const isLast = i === total - 1
          return (
            <li key={i} className="relative flex gap-4 pb-5 last:pb-0">
              {/* Connector line */}
              {!isLast ? (
                <span
                  aria-hidden="true"
                  className={`absolute top-9 h-[calc(100%-1.5rem)] w-px ${isDone ? "bg-emerald-500/50" : "bg-white/10"} ${
                    isRtl ? "right-[17px]" : "left-[17px]"
                  }`}
                />
              ) : null}

              <button
                type="button"
                onClick={() => toggle(i)}
                aria-pressed={isDone}
                aria-label={`${ui.stepOf[lang]} ${i + 1}: ${step.title[lang]}`}
                className={`z-10 flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-all duration-200 ${
                  isDone
                    ? "border-emerald-500/50 bg-emerald-500 text-white"
                    : isCurrent
                      ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/20"
                      : "border-white/15 bg-white/5 text-muted-foreground hover:border-white/30"
                }`}
              >
                {isDone ? <Check className="size-4.5" aria-hidden="true" /> : i + 1}
              </button>

              <div className={`min-w-0 flex-1 pt-1 transition-opacity ${isDone ? "opacity-60" : ""}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-sm font-bold text-foreground">{step.title[lang]}</h4>
                  {isCurrent ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400">
                      {ui.stepOf[lang]} {i + 1}
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-pretty text-sm leading-relaxed text-muted-foreground">
                  <GlossaryText text={step.text[lang]} lang={lang} />
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
