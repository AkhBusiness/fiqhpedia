"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, ArrowRight, GraduationCap, Search } from "lucide-react"
import featuredJson from "@/data/featured.json"
import type { Section } from "@/components/nav-modal"
import {
  categories,
  displayRef,
  gradeLabels,
  isRecentlyAdded,
  type Lang,
  type Localized,
  rtlLangs,
  type SchoolKey,
  schools,
  ui,
} from "@/lib/fiqh-data"
import { bookCounts, recentlyAdded } from "@/lib/fiqh-index"
import { entryPath } from "@/lib/site"

interface HomeSectionProps {
  lang: Lang
  onGo: (section: Section) => void
  /** Open the site search with this text already typed. */
  onSearch: (query: string) => void
  /** Open the fiqh tab on one book. */
  onOpenBook: (bookId: string) => void
}

interface Featured {
  ref: string
  id: string
  bookId: string
  chapter?: Localized | null
  title: Localized
  summary: Localized
  rulings: Record<SchoolKey, { grade: string; lead: Localized }>
}

const featured = (featuredJson as { featured: Featured | null }).featured

/**
 * The landing page, in the order a first visit asks its questions:
 * what is this — one line; how do I look something up — a search box;
 * is it any good — a real issue with its four rulings, not a paragraph
 * claiming there are some. Then the books with their counts, the way in for
 * a newcomer, and the latest additions. The explanations that used to sit
 * above all this ("why we ask your country", "this is not a fatwa service")
 * are still here, at the end, where a reader who wants them will look.
 */
export function HomeSection({ lang, onGo, onSearch, onOpenBook }: HomeSectionProps) {
  const counts = bookCounts()
  const [q, setQ] = useState("")
  const isRtl = rtlLangs.includes(lang)
  const Arrow = isRtl ? ArrowLeft : ArrowRight
  const recent = recentlyAdded(5)
  const books = categories.filter((c) => (counts[c.id] ?? 0) > 0)
  const empty = categories.filter((c) => (counts[c.id] ?? 0) === 0)

  return (
    <div className="flex flex-col gap-12">
      {/* ── What this is, and the way to ask it something ─────────────── */}
      <section className="pt-1">
        <h1 className="text-balance text-3xl font-bold leading-tight text-foreground sm:text-4xl">
          {ui.appTitle[lang]}
        </h1>
        <p className="mt-2 text-pretty text-base text-muted-foreground sm:text-lg">{ui.appSubtitle[lang]}</p>

        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            onSearch(q)
          }}
        >
          <label className="relative block">
            <span className="sr-only">{ui.globalSearch[lang]}</span>
            <Search
              className="pointer-events-none absolute inset-y-0 start-4 my-auto size-5 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => onSearch(q)}
              placeholder={ui.homeSearchPlaceholder[lang]}
              enterKeyHint="search"
              className="h-14 w-full rounded-2xl border border-white/15 bg-white/[0.06] ps-12 pe-4 text-base text-foreground shadow-lg shadow-black/20 placeholder:text-muted-foreground focus:border-white/30 focus:outline-none focus:ring-2 focus:ring-white/15"
            />
          </label>
          <p className="mt-2 text-[13px] text-muted-foreground">{ui.homeSearchHint[lang]}</p>
        </form>
      </section>

      {/* ── One real issue, the four schools side by side ──────────────── */}
      {featured ? (
        <section>
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{ui.homeFeaturedTitle[lang]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{ui.homeFeaturedDesc[lang]}</p>

          <Link
            href={entryPath(lang, featured.ref)}
            className="group mt-4 block rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-white/25"
          >
            <span className="mb-2 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[13px] font-bold text-muted-foreground">
                {displayRef(featured.ref, lang)}
              </span>
              {featured.chapter ? (
                <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[13px] font-semibold text-foreground/80">
                  {featured.chapter[lang]}
                </span>
              ) : null}
            </span>
            <span className="block text-balance text-lg font-bold leading-snug text-foreground">{featured.title[lang]}</span>
            <span className="mt-1.5 block text-pretty text-sm leading-relaxed text-muted-foreground">
              {featured.summary[lang]}
            </span>

            <span className="mt-4 grid grid-cols-2 gap-2">
              {schools.map((s) => {
                const r = featured.rulings[s.key]
                if (!r) return null
                return (
                  <span key={s.key} className={`flex flex-col gap-1 rounded-xl border ${s.color.border} bg-white/[0.02] p-3`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
                        <span className={`size-2.5 rounded-full ${s.color.dot}`} aria-hidden="true" />
                        {s.name[lang]}
                      </span>
                      <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[13px] font-semibold text-foreground/90">
                        {gradeLabels[r.grade]?.[lang] ?? r.grade}
                      </span>
                    </span>
                    <span className="line-clamp-3 text-pretty text-[13px] leading-relaxed text-muted-foreground">{r.lead[lang]}</span>
                  </span>
                )
              })}
            </span>

            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground group-hover:underline">
              {ui.homeReadFull[lang]}
              <Arrow className="size-4" aria-hidden="true" />
            </span>
          </Link>
        </section>
      ) : null}

      {/* ── The books, with what each holds ────────────────────────────── */}
      <section>
        <h2 className="text-lg font-bold text-foreground sm:text-xl">{ui.homeBooksTitle[lang]}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{ui.homeBooksDesc[lang]}</p>
        <ul className="mt-4 grid list-none grid-cols-2 gap-2 p-0 sm:grid-cols-3">
          {books.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onOpenBook(c.id)}
                className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 text-start transition-colors hover:border-white/25 hover:bg-white/[0.06]"
              >
                <span className="text-sm font-semibold text-foreground">{c.name[lang]}</span>
                <span className="tabular-nums text-sm text-muted-foreground">{counts[c.id]}</span>
              </button>
            </li>
          ))}
          {empty.map((c) => (
            <li key={c.id}>
              <span
                title={ui.comingSoon[lang]}
                className="flex min-h-14 w-full items-center justify-between gap-2 rounded-xl border border-dashed border-white/10 px-4 text-start"
              >
                <span className="text-sm font-medium text-muted-foreground/60">{c.name[lang]}</span>
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground/70">
                  {ui.comingSoon[lang]}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* ── The way in for a newcomer ──────────────────────────────────── */}
      <section>
        <button
          type="button"
          onClick={() => onGo("learn")}
          className="group flex w-full items-start gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-5 text-start transition-colors hover:border-emerald-500/50"
        >
          <span className="mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-500">
            <GraduationCap className="size-5" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-base font-bold text-foreground">{ui.homeNewMuslimTitle[lang]}</span>
            <span className="text-pretty text-sm leading-relaxed text-muted-foreground">{ui.homeNewMuslimBody[lang]}</span>
            <span className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-500 group-hover:underline">
              {ui.homeNewMuslimAction[lang]}
              <Arrow className="size-4" aria-hidden="true" />
            </span>
          </span>
        </button>
      </section>

      {/* ── Latest ─────────────────────────────────────────────────────── */}
      {recent.length > 0 ? (
        <section>
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{ui.recentTitle[lang]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{ui.recentDesc[lang]}</p>
          <ul className="mt-4 flex list-none flex-col gap-1.5 p-0">
            {recent.map((i) => (
              <li key={i.id}>
                <Link
                  href={entryPath(lang, i.ref)}
                  className="flex min-h-12 w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2 text-start transition-colors hover:bg-white/[0.06]"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-foreground">{i.title[lang]}</span>
                    {i.chapter ? (
                      <span className="block text-[13px] text-muted-foreground">{i.chapter[lang]}</span>
                    ) : null}
                  </span>
                  {isRecentlyAdded(i.addedAt) ? (
                    <span className="shrink-0 rounded-md bg-emerald-500 px-2 py-0.5 text-[13px] font-bold text-white dark:text-emerald-950">
                      {ui.newTag[lang]}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* ── The rest of the site, and the two notes that used to lead ───── */}
      <section className="border-t border-white/10 pt-8">
        <h2 className="text-[13px] font-semibold text-muted-foreground">{ui.homeAlso[lang]}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {(
            [
              ["aqidah", ui.homeIntentAqidah[lang]],
              ["articles", ui.homeIntentArticles[lang]],
              ["glossary", ui.glossarySection[lang]],
            ] as [Section, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => onGo(key)}
              className="min-h-11 rounded-full border border-white/10 bg-white/5 px-4 text-sm font-semibold text-foreground transition-colors hover:border-white/25 hover:bg-white/10"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-8 grid gap-6 text-[13px] leading-relaxed text-muted-foreground sm:grid-cols-2">
          <p>
            <strong className="font-semibold text-foreground/80">{ui.homeNotTitle[lang]}</strong> — {ui.homeNotBody[lang]}
          </p>
          <p>
            <strong className="font-semibold text-foreground/80">{ui.homeWhyCountryTitle[lang]}</strong> —{" "}
            {ui.homeWhyCountryBody[lang]}
          </p>
        </div>
      </section>
    </div>
  )
}
