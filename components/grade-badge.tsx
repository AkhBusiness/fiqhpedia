"use client"

import { useMemo, useState } from "react"
import { X } from "lucide-react"
import {
  glossaryAnchor,
  gradeLabels,
  gradeTerm,
  issues,
  type Issue,
  type Lang,
  type RulingGrade,
  type RulingNature,
  type SchoolKey,
  schools,
  ui,
} from "@/lib/fiqh-data"

/** Colour by weight: required green, encouraged indigo, discouraged amber. */
const GRADE_TONE: Record<RulingGrade, string> = {
  fard: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  wajib: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  sunnah: "border-indigo-500/30 bg-indigo-500/10 text-indigo-400",
  mandub: "border-violet-500/30 bg-violet-500/10 text-violet-400",
  mubah: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
  makruh: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  haram: "border-rose-500/30 bg-rose-500/10 text-rose-400",
}

/** The structural role is shown quieter: it qualifies, it does not rank. */
const NATURE_TONE = "border-white/15 bg-white/5 text-zinc-400"

interface GradeBadgeProps {
  /** Absent on questions with no taklīfī grade — timings, measures, definitions. */
  grade?: RulingGrade
  /** Absent unless the act has a structural role worth naming. */
  nature?: RulingNature
  school: SchoolKey
  issue: Issue
  lang: Lang
}

/**
 * The grade of a single ruling, as a badge that opens an explanation.
 *
 * The badge answers a question the encyclopedia otherwise leaves hanging.
 * A reader meets "it is sunnah to say the basmalah" and has no way to learn
 * what sunnah *is* here, nor what else carries that grade, nor that the
 * Ḥanbalīs call the very same act wājib. All three are one tap away.
 */
export function GradeBadge({ grade, nature, school, issue, lang }: GradeBadgeProps) {
  const [open, setOpen] = useState(false)
  if (!grade && !nature) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title={ui.gradeWhatIs[lang]}
        className="flex shrink-0 items-center gap-1 transition-opacity hover:opacity-75"
      >
        {grade ? (
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${GRADE_TONE[grade]}`}
          >
            {gradeLabels[grade]?.[lang] ?? grade}
          </span>
        ) : null}
        {nature ? (
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${NATURE_TONE}`}>
            {gradeLabels[nature]?.[lang] ?? nature}
          </span>
        ) : null}
      </button>
      {open ? (
        <GradePanel
          grade={grade}
          nature={nature}
          school={school}
          issue={issue}
          lang={lang}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  )
}

function GradePanel({
  grade,
  nature,
  school,
  issue,
  lang,
  onClose,
}: GradeBadgeProps & { onClose: () => void }) {
  // The panel explains whichever was tapped; the grade leads when both exist.
  const subject = (grade ?? nature) as string
  const term = gradeTerm(subject)
  // The definition is the one held by the school whose ruling was tapped —
  // the same word carries different weight in each school, and showing the
  // wrong school's definition would be worse than showing none.
  const definition =
    term?.technical?.[school]?.text?.[lang] ??
    (term?.briefDefinition ?? term?.definition)?.[lang] ??
    ""

  const sameGrade = useMemo(
    () =>
      grade
        ? issues.filter(
            (i) =>
              i.id !== issue.id &&
              i.chapter?.ar === issue.chapter?.ar &&
              i.rulings[school]?.grade === grade,
          )
        : [],
    [grade, school, issue],
  )

  const acrossSchools = schools.map((s) => ({
    school: s,
    grade: issue.rulings[s.key]?.grade,
  }))

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-zinc-950/95 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${
                grade ? GRADE_TONE[grade] : NATURE_TONE
              }`}
            >
              {gradeLabels[subject]?.[lang] ?? subject}
            </span>
            {grade && nature ? (
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${NATURE_TONE}`}>
                {gradeLabels[nature]?.[lang] ?? nature}
              </span>
            ) : null}
            <span className="text-sm font-semibold text-muted-foreground">
              {schools.find((s) => s.key === school)?.name[lang]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={ui.close[lang]}
            className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <section className="mb-5">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
              {ui.gradeWhatIs[lang]}
            </h4>
            {definition ? (
              <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                {definition}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/70">{ui.gradeNoDefinition[lang]}</p>
            )}
            {term ? (
              <a
                href={`#${glossaryAnchor(term.id)}`}
                onClick={onClose}
                className="mt-2 inline-block text-xs font-semibold text-primary hover:underline"
              >
                {ui.glossaryOpen[lang]}
              </a>
            ) : null}
          </section>

          <section className="mb-5">
            <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
              {ui.gradeAcrossSchools[lang]}
            </h4>
            <ul className="flex flex-col gap-1.5">
              {acrossSchools.map(({ school: s, grade: g }) => (
                <li key={s.key} className="flex items-center justify-between gap-3 text-sm">
                  <span className={s.key === school ? "font-bold text-foreground" : "text-muted-foreground"}>
                    {s.name[lang]}
                  </span>
                  {g ? (
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${GRADE_TONE[g]}`}
                    >
                      {gradeLabels[g]?.[lang] ?? g}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {sameGrade.length > 0 ? (
            <section>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-primary">
                {ui.gradeSameInChapter[lang]}
              </h4>
              <ul className="flex flex-col gap-1">
                {sameGrade.map((i) => (
                  <li key={i.id}>
                    <a
                      href={`#${i.id}`}
                      onClick={onClose}
                      className="block rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
                    >
                      {i.title[lang]}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
