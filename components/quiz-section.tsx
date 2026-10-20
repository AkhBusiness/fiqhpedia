"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, RotateCcw, X } from "lucide-react"
import { categories, gradeLabels, type Lang, type SchoolKey, schools, ui } from "@/lib/fiqh-data"
import { entryPath } from "@/lib/site"

/* ------------------------------------------------------------------ */
/* The test. Questions come from two places, both built by            */
/* tools/build_data.py into data/quiz/<lang>.json:                     */
/*  - auto: every entry with a grade in all four schools becomes       */
/*    "what is its ruling in your school?", answered with the grade,   */
/*    explained by the school's ruling text. It grows with the site.   */
/*  - manual: questions the owner writes in data/content/quiz.json.   */
/* The reader is tested in one school — his — as the site is built to  */
/* find one's school, not to weigh the schools against each other.     */
/* ------------------------------------------------------------------ */

interface AutoQ {
  ref: string
  bookId: string
  title: string
  grades: Record<SchoolKey, string>
  ruling: Record<SchoolKey, string>
}
interface ManualQ {
  id: string
  school: SchoolKey | "all"
  bookId?: string | null
  ref?: string | null
  question: string
  options: string[]
  answer: number
  explain: string
}
interface QuizData {
  auto: AutoQ[]
  manual: ManualQ[]
}

/** One question as the screen shows it. */
interface Q {
  key: string
  title: string
  prompt: string
  options: string[]
  answer: number
  explain: string
  ref?: string
}

const LOADERS: Record<Lang, () => Promise<{ default: unknown }>> = {
  ar: () => import("@/data/quiz/ar.json"),
  en: () => import("@/data/quiz/en.json"),
  ru: () => import("@/data/quiz/ru.json"),
  es: () => import("@/data/quiz/es.json"),
  uk: () => import("@/data/quiz/uk.json"),
}

const SCHOOL_AR: Record<SchoolKey, string> = { hanafi: "الحنفية", maliki: "المالكية", shafii: "الشافعية", hanbali: "الحنابلة" }

/** "the Hanbali school" in the grammar each language needs inside the prompt. */
function schoolIn(lang: Lang, key: SchoolKey): string {
  const name = schools.find((s) => s.key === key)!.name[lang]
  switch (lang) {
    case "ar":
      return SCHOOL_AR[key]
    case "ru":
      return name.toLowerCase().replace(/ий$/, "ом")
    case "uk":
      return name.toLowerCase().replace(/ий$/, "ому")
    case "es":
      return name.toLowerCase()
    default:
      return name
  }
}

const GRADES = ["fard", "wajib", "sunnah", "mandub", "makruh", "haram", "mubah"]
/** Near-synonyms outside the Hanafi school: offering both would test vocabulary, not fiqh. */
const SIBLING: Record<string, string> = { fard: "wajib", wajib: "fard", sunnah: "mandub", mandub: "sunnah" }

function shuffle<T>(xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildQuestions(data: QuizData, lang: Lang, school: SchoolKey, book: string, count: number): Q[] {
  const inBook = (b?: string | null) => book === "all" || !b || b === book
  const auto: Q[] = data.auto
    .filter((a) => inBook(a.bookId) && a.grades[school])
    .map((a) => {
      const right = a.grades[school]
      const pool = GRADES.filter((g) => g !== right && (school === "hanafi" || g !== SIBLING[right]))
      const opts = shuffle([right, ...shuffle(pool).slice(0, 3)])
      return {
        key: `a-${a.ref}`,
        title: a.title,
        prompt: ui.quizPrompt[lang].replace("{school}", schoolIn(lang, school)),
        options: opts.map((g) => gradeLabels[g]?.[lang] ?? g),
        answer: opts.indexOf(right),
        explain: a.ruling[school],
        ref: a.ref,
      }
    })
  const manual: Q[] = data.manual
    .filter((m) => (m.school === "all" || m.school === school) && inBook(m.bookId))
    .map((m) => {
      const order = shuffle(m.options.map((_, i) => i))
      return {
        key: `m-${m.id}`,
        title: m.question,
        prompt: "",
        options: order.map((i) => m.options[i]),
        answer: order.indexOf(m.answer),
        explain: m.explain,
        ref: m.ref ?? undefined,
      }
    })
  return shuffle([...auto, ...manual]).slice(0, count)
}

const BEST_KEY = "fiqh:quiz"
function readBest(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(BEST_KEY) ?? "{}") as Record<string, number>
  } catch {
    return {}
  }
}

export function QuizSection({ lang }: { lang: Lang }) {
  const [data, setData] = useState<QuizData | null>(null)
  const [school, setSchool] = useState<SchoolKey>("hanbali")
  const [book, setBook] = useState("all")
  const [count, setCount] = useState(10)
  const [qs, setQs] = useState<Q[] | null>(null)
  const [at, setAt] = useState(0)
  const [picks, setPicks] = useState<number[]>([])
  const [best, setBest] = useState<Record<string, number>>({})

  useEffect(() => {
    let alive = true
    LOADERS[lang]().then((m) => alive && setData(m.default as QuizData))
    try {
      const pref = JSON.parse(localStorage.getItem("fiqh:preference") ?? "null") as { school?: SchoolKey | null } | null
      if (pref?.school && schools.some((s) => s.key === pref.school)) setSchool(pref.school)
    } catch {
      /* private browsing */
    }
    setBest(readBest())
    return () => {
      alive = false
    }
  }, [lang])

  const available = useMemo(() => (data ? buildQuestions(data, lang, school, book, 1e9).length : 0), [data, lang, school, book])
  const books = useMemo(
    () => categories.filter((c) => data?.auto.some((a) => a.bookId === c.id) || data?.manual.some((m) => m.bookId === c.id)),
    [data],
  )
  const bestKey = `${school}|${book}`

  const start = (same?: Q[]) => {
    if (!data) return
    setQs(
      same
        ? same.map((q) => {
            const order = shuffle(q.options.map((_, i) => i))
            return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
          })
        : buildQuestions(data, lang, school, book, count),
    )
    setAt(0)
    setPicks([])
    window.scrollTo({ top: 0 })
  }

  const finished = qs !== null && picks.length === qs.length && at >= qs.length
  const score = qs ? picks.filter((p, i) => p === qs[i].answer).length : 0
  const pct = qs && qs.length ? Math.round((score / qs.length) * 100) : 0

  useEffect(() => {
    if (!finished) return
    const next = { ...readBest() }
    if ((next[bestKey] ?? -1) < pct) {
      next[bestKey] = pct
      try {
        localStorage.setItem(BEST_KEY, JSON.stringify(next))
      } catch {
        /* private browsing */
      }
    }
    setBest(next)
  }, [finished, pct, bestKey])

  const chip = (on: boolean) =>
    `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
      on ? "border-foreground/40 bg-foreground text-background" : "border-white/15 bg-white/5 text-foreground hover:border-white/30"
    }`

  /* ── Setup ─────────────────────────────────────────────── */
  if (!qs) {
    return (
      <div className="mx-auto max-w-2xl pb-16">
        <h1 className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">{ui.quizSection[lang]}</h1>
        <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{ui.quizIntro[lang]}</p>

        <div className="mt-8 flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">{ui.quizSchool[lang]}</legend>
            <div className="flex flex-wrap gap-2">
              {schools.map((s) => (
                <button key={s.key} type="button" aria-pressed={school === s.key} onClick={() => setSchool(s.key)} className={chip(school === s.key)}>
                  <span className={`size-2.5 rounded-full ${s.color.dot}`} aria-hidden="true" />
                  {s.name[lang]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">{ui.quizBook[lang]}</legend>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-pressed={book === "all"} onClick={() => setBook("all")} className={chip(book === "all")}>
                {ui.quizAllBooks[lang]}
              </button>
              {books.map((c) => (
                <button key={c.id} type="button" aria-pressed={book === c.id} onClick={() => setBook(c.id)} className={chip(book === c.id)}>
                  {c.name[lang]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">{ui.quizCount[lang]}</legend>
            <div className="flex flex-wrap gap-2">
              {[5, 10, 20].map((n) => (
                <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)} className={chip(count === n)}>
                  <span className="tabular-nums">{n}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <p className="text-[13px] text-muted-foreground" aria-live="polite">
            {data ? ui.quizAvailable[lang].replace("{n}", String(available)) : "…"}
            {best[bestKey] !== undefined ? ` · ${ui.quizBest[lang].replace("{p}", String(best[bestKey]))}` : ""}
          </p>

          {data && available === 0 ? (
            <p className="text-sm text-muted-foreground">{ui.quizNone[lang]}</p>
          ) : (
            <button
              type="button"
              disabled={!data}
              onClick={() => start()}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-foreground px-6 text-[15px] font-bold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {ui.quizStart[lang]}
            </button>
          )}
        </div>
      </div>
    )
  }

  /* ── Result ────────────────────────────────────────────── */
  if (finished) {
    const band = pct >= 90 ? ui.quizBand90 : pct >= 70 ? ui.quizBand70 : pct >= 50 ? ui.quizBand50 : ui.quizBand0
    const missed = qs.map((q, i) => ({ q, pick: picks[i] })).filter(({ q, pick }) => pick !== q.answer)
    return (
      <div className="mx-auto max-w-2xl pb-16">
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{ui.quizResult[lang]}</h1>
        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-5xl font-bold tabular-nums text-foreground">{ui.quizPercent[lang].replace("{p}", String(pct))}</p>
          <p className="mt-2 text-lg tabular-nums text-muted-foreground">
            {ui.quizScore[lang].replace("{c}", String(score)).replace("{n}", String(qs.length))}
          </p>
          <div className="mx-auto mt-4 h-2 max-w-xs overflow-hidden rounded-full bg-white/10" aria-hidden="true">
            <div className="h-full rounded-full bg-foreground" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-4 text-pretty text-base text-foreground">{band[lang]}</p>
          {best[bestKey] !== undefined ? (
            <p className="mt-1 text-[13px] text-muted-foreground">{ui.quizBest[lang].replace("{p}", String(best[bestKey]))}</p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" onClick={() => start(qs)} className={chip(false)}>
            <RotateCcw className="size-4" aria-hidden="true" />
            {ui.quizRetry[lang]}
          </button>
          <button type="button" onClick={() => setQs(null)} className={chip(true)}>
            {ui.quizNew[lang]}
          </button>
        </div>

        <h2 className="mt-10 text-lg font-bold text-foreground">{ui.quizReview[lang]}</h2>
        {missed.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">{ui.quizNoMistakes[lang]}</p>
        ) : (
          <ol className="mt-3 flex list-none flex-col gap-3 p-0">
            {missed.map(({ q, pick }) => (
              <li key={q.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[15px] font-semibold text-foreground">{q.title}</p>
                {q.prompt ? <p className="mt-1 text-[13px] text-muted-foreground">{q.prompt}</p> : null}
                <p className="mt-3 flex items-start gap-2 text-sm text-rose-700 dark:text-rose-400">
                  <X className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {ui.quizYourAnswer[lang]}: {q.options[pick]}
                  </span>
                </p>
                <p className="mt-1 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span>
                    {ui.quizRightAnswer[lang]}: {q.options[q.answer]}
                  </span>
                </p>
                <p className="mt-3 text-pretty text-sm leading-relaxed text-muted-foreground">{q.explain}</p>
                {q.ref ? (
                  <Link href={entryPath(lang, q.ref)} className="mt-2 inline-flex min-h-11 items-center text-[13px] font-semibold text-foreground underline decoration-white/30 underline-offset-4">
                    {ui.quizReadEntry[lang]}
                  </Link>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </div>
    )
  }

  /* ── Question ──────────────────────────────────────────── */
  const q = qs[at]
  const pick = picks[at]
  const answered = pick !== undefined
  const last = at === qs.length - 1
  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="flex items-center justify-between gap-4 text-[13px] font-semibold text-muted-foreground">
        <span className="tabular-nums">{ui.quizQuestionOf[lang].replace("{i}", String(at + 1)).replace("{n}", String(qs.length))}</span>
        <button type="button" onClick={() => setQs(null)} className="inline-flex min-h-11 items-center hover:text-foreground">
          {ui.quizNew[lang]}
        </button>
      </div>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
        role="progressbar"
        aria-label={ui.quizQuestionOf[lang].replace("{i}", String(at + 1)).replace("{n}", String(qs.length))}
        aria-valuemin={0}
        aria-valuemax={qs.length}
        aria-valuenow={at + (answered ? 1 : 0)}
      >
        <div className="h-full rounded-full bg-foreground transition-all" style={{ width: `${((at + (answered ? 1 : 0)) / qs.length) * 100}%` }} />
      </div>

      <h1 className="mt-8 text-balance text-xl font-bold leading-snug text-foreground sm:text-2xl">{q.title}</h1>
      {q.prompt ? <p className="mt-2 text-base text-muted-foreground">{q.prompt}</p> : null}

      <div className="mt-6 flex flex-col gap-2" role="group" aria-label={q.prompt || q.title}>
        {q.options.map((o, i) => {
          const isRight = i === q.answer
          const isPick = i === pick
          const state = !answered
            ? "border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/[0.07]"
            : isRight
              ? "border-emerald-600 bg-emerald-600/15 dark:border-emerald-500"
              : isPick
                ? "border-rose-600 bg-rose-600/15 dark:border-rose-500"
                : "border-white/10 opacity-60"
          return (
            <button
              key={i}
              type="button"
              disabled={answered}
              onClick={() => setPicks((p) => [...p.slice(0, at), i])}
              aria-pressed={isPick}
              className={`flex min-h-12 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-start text-[15px] font-semibold text-foreground transition-colors ${state}`}
            >
              <span>{o}</span>
              {answered && isRight ? <Check className="size-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" /> : null}
              {answered && isPick && !isRight ? <X className="size-5 shrink-0 text-rose-700 dark:text-rose-400" aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>

      <div aria-live="polite">
        {answered ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <p className={`text-[15px] font-bold ${pick === q.answer ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"}`}>
              {pick === q.answer ? ui.quizCorrect[lang] : ui.quizWrong[lang].replace("{answer}", q.options[q.answer])}
            </p>
            <p className="mt-3 text-[13px] font-semibold text-muted-foreground">{ui.quizFromEntry[lang]}</p>
            <p className="mt-1 text-pretty text-[15px] leading-relaxed text-foreground">{q.explain}</p>
            {q.ref ? (
              <Link href={entryPath(lang, q.ref)} className="mt-2 inline-flex min-h-11 items-center text-[13px] font-semibold text-foreground underline decoration-white/30 underline-offset-4">
                {ui.quizReadEntry[lang]}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>

      {answered ? (
        <button
          type="button"
          onClick={() => setAt((n) => n + 1)}
          className="mt-6 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-foreground px-6 text-[15px] font-bold text-background transition-opacity hover:opacity-90"
        >
          {last ? ui.quizSeeResult[lang] : ui.quizNext[lang]}
        </button>
      ) : null}
    </div>
  )
}
