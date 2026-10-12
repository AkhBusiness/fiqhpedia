"use client"

import Link from "next/link"
import { ArrowLeft, ArrowRight } from "lucide-react"
import booksJson from "@/data/books.json"
import { categories, displayRef, type Lang, type Localized, rtlLangs, ui } from "@/lib/fiqh-data"
import { issues } from "@/lib/fiqh-index"
import { entryPath } from "@/lib/site"

interface PlanChapter {
  name: string
  status: "✅" | "⚠️" | "⬜"
  planned: number | null
  chapter?: Localized | null
  written: number
  refs: string[]
}
interface PlanBook {
  id: string
  planned: number | null
  written: number
  chapters: PlanChapter[]
}

const plan = (booksJson as { books: PlanBook[] }).books

const STATUS: Record<PlanChapter["status"], { key: string; cls: string }> = {
  "✅": { key: "statusCovered", cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-400" },
  "⚠️": { key: "statusPartial", cls: "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400" },
  "⬜": { key: "statusEmpty", cls: "border-white/15 bg-white/5 text-muted-foreground" },
}

/**
 * One book as a page: a progress line, then every chapter in the planned
 * order with its status and the entries written so far. The plan comes
 * from خريطة-الأبواب.md through build_data.py; the entries from the index.
 * A chapter that exists only in the plan has an Arabic name alone — it has
 * no entries yet to carry its translations.
 */
export function BookView({ bookId, lang }: { bookId: string; lang: Lang }) {
  const cat = categories.find((c) => c.id === bookId)
  const book = plan.find((b) => b.id === bookId)
  if (!cat) return null
  const Arrow = rtlLangs.includes(lang) ? ArrowLeft : ArrowRight
  const byRef = new Map(issues.map((i) => [i.ref, i]))
  const written = book?.written ?? 0
  const planned = book?.planned ?? null
  const pct = planned ? Math.min(100, Math.round((written / planned) * 100)) : null

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <Link
        href={`/${lang}/fiqh`}
        className="inline-flex min-h-11 items-center text-[13px] font-semibold text-muted-foreground hover:text-foreground"
      >
        {ui.allBooks[lang]}
      </Link>
      <h1 className="mt-1 text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">
        {ui.bookPageTitle[lang].replace("{book}", cat.name[lang])}
      </h1>
      <p className="mt-2 text-[15px] text-muted-foreground">
        {planned
          ? ui.bookProgress[lang].replace("{written}", String(written)).replace("{planned}", String(planned))
          : ui.bookWrittenOnly[lang].replace("{written}", String(written))}
      </p>
      {pct !== null ? (
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-label={ui.bookMapTitle[lang]}
          className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-emerald-600 dark:bg-emerald-500" style={{ width: `${pct}%` }} />
        </div>
      ) : null}
      {written === 0 ? <p className="mt-4 text-sm text-muted-foreground">{ui.bookEmptyBody[lang]}</p> : null}

      <h2 className="mt-10 text-lg font-bold text-foreground sm:text-xl">{ui.bookMapTitle[lang]}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{ui.bookMapDesc[lang]}</p>

      <ol className="mt-5 flex list-none flex-col gap-3 p-0">
        {(book?.chapters ?? []).map((ch, n) => {
          const st = STATUS[ch.status]
          const name = ch.chapter?.[lang] ?? ch.name
          const foreign = !ch.chapter && lang !== "ar"
          return (
            <li key={`${ch.name}-${n}`} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="w-6 shrink-0 text-[13px] font-bold tabular-nums text-muted-foreground">{n + 1}</span>
                <h3 className="min-w-0 flex-1 text-[15px] font-bold text-foreground" lang={foreign ? "ar" : undefined} dir={foreign ? "rtl" : undefined}>
                  {name}
                </h3>
                <span className={`rounded-full border px-2 py-0.5 text-[13px] font-semibold ${st.cls}`}>{ui[st.key][lang]}</span>
                {ch.planned ? (
                  <span className="text-[13px] tabular-nums text-muted-foreground">
                    {ch.written}/{ch.planned}
                  </span>
                ) : ch.written ? (
                  <span className="text-[13px] tabular-nums text-muted-foreground">{ch.written}</span>
                ) : null}
              </div>
              {ch.refs.length > 0 ? (
                <ul className="mt-2 flex list-none flex-col gap-0.5 p-0">
                  {ch.refs
                    .map((r) => byRef.get(r))
                    .filter((i): i is NonNullable<typeof i> => Boolean(i))
                    .sort((a, b) => a.number - b.number)
                    .map((i) => (
                      <li key={i.id}>
                        <Link
                          href={entryPath(lang, i.ref)}
                          className="group flex min-h-11 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/[0.05]"
                        >
                          <span className="shrink-0 font-mono text-[13px] font-bold text-muted-foreground">{displayRef(i.ref, lang)}</span>
                          <span className="min-w-0 flex-1 text-[15px] text-foreground">{i.title[lang]}</span>
                          <Arrow className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                </ul>
              ) : null}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
