"use client"

import Link from "next/link"
import changelogJson from "@/data/changelog.json"
import { displayRef, type Lang, type Localized, ui } from "@/lib/fiqh-data"
import { entryPath } from "@/lib/site"

interface Row {
  kind: "issue" | "article"
  ref: string
  title: Localized
  note?: Localized | null
}
interface Day {
  date: string
  added: Row[]
  revised: Row[]
}

const { days, totals } = changelogJson as { days: Day[]; totals: { issues: number; articles: number } }

const LOCALE: Record<Lang, string> = { ar: "ar-SA-u-ca-gregory-nu-latn", en: "en-GB", ru: "ru-RU", es: "es-ES", uk: "uk-UA" }

function formatDay(date: string, lang: Lang): string {
  const d = new Date(`${date}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return date
  return new Intl.DateTimeFormat(LOCALE[lang], { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(d)
}

/**
 * What changed, day by day — built from the same dates that drive the
 * "new" and "revised" badges, so the log and the badges can never
 * disagree. Corrections carry their note: a reader who learned a ruling
 * last month deserves to know whether it was the ruling that moved or
 * only its wording.
 */
export function ChangelogSection({ lang }: { lang: Lang }) {
  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">{ui.changelogSection[lang]}</h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{ui.changelogIntro[lang]}</p>
      <p className="mt-2 text-[13px] tabular-nums text-muted-foreground">
        {ui.changelogTotals[lang].replace("{issues}", String(totals.issues)).replace("{articles}", String(totals.articles))}
      </p>

      {days.length === 0 ? (
        <p className="mt-10 text-sm text-muted-foreground">{ui.changelogEmpty[lang]}</p>
      ) : (
        <ol className="mt-10 flex list-none flex-col gap-10 p-0">
          {days.map((day) => (
            <li key={day.date}>
              <h2 className="text-lg font-bold text-foreground sm:text-xl">
                <time dateTime={day.date}>{formatDay(day.date, lang)}</time>
              </h2>

              {day.revised.length > 0 ? (
                <ul className="mt-3 flex list-none flex-col gap-2 p-0">
                  {day.revised.map((r) => (
                    <li key={`r-${r.ref}`} className="rounded-xl border border-amber-500/30 bg-amber-500/[0.05] px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-amber-700 px-2 py-0.5 text-[13px] font-bold text-white dark:bg-amber-400 dark:text-amber-950">
                          {ui.changelogRevised[lang]}
                        </span>
                        <span className="font-mono text-[13px] font-bold text-muted-foreground">{displayRef(r.ref, lang)}</span>
                        <Link href={entryPath(lang, r.ref)} className="text-[15px] font-semibold text-foreground hover:underline">
                          {r.title[lang]}
                        </Link>
                      </div>
                      {r.note ? <p className="mt-1.5 text-pretty text-sm leading-relaxed text-muted-foreground">{r.note[lang]}</p> : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              {day.added.length > 0 ? (
                <div className="mt-3">
                  <span className="rounded-md bg-emerald-700 px-2 py-0.5 text-[13px] font-bold text-white dark:bg-emerald-500 dark:text-emerald-950">
                    {ui.changelogAdded[lang]}
                  </span>
                  <AddedList rows={day.added} lang={lang} />
                </div>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

const FOLD_AFTER = 6

/** A day's additions; a long batch shows its first few and folds the rest. */
function AddedList({ rows, lang }: { rows: Row[]; lang: Lang }) {
  const head = rows.slice(0, FOLD_AFTER)
  const tail = rows.slice(FOLD_AFTER)
  const item = (r: Row) => (
    <li key={`a-${r.ref}`}>
      <Link
        href={entryPath(lang, r.ref)}
        className="flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.05]"
      >
        <span className="shrink-0 font-mono text-[13px] font-bold text-muted-foreground">{displayRef(r.ref, lang)}</span>
        <span className="text-[15px] text-foreground">{r.title[lang]}</span>
      </Link>
    </li>
  )
  return (
    <>
      <ul className="mt-2 flex list-none flex-col gap-1 p-0">{head.map(item)}</ul>
      {tail.length > 0 ? (
        <details className="mt-1">
          <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg px-2 text-[13px] font-semibold text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
            {ui.showAllCount[lang].replace("{n}", String(rows.length))}
          </summary>
          <ul className="flex list-none flex-col gap-1 p-0">{tail.map(item)}</ul>
        </details>
      ) : null}
    </>
  )
}

