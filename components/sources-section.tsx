"use client"

import { useEffect } from "react"
import sourcesJson from "@/data/sources.json"
import { type Lang, type SchoolKey, schools, ui } from "@/lib/fiqh-data"
import { sourceAnchor } from "@/lib/site"

interface Book {
  ar: string
  en: string
  ru: string
  es: string
  uk: string
  school: SchoolKey
  cited: number
}
interface Work {
  ar: string
  en: string
  ru: string
  es: string
  uk: string
}

const { books, works } = sourcesJson as { books: Book[]; works: Work[] }

/** "cited in N entries", with Arabic's own forms for one and two. */
function citedLabel(lang: Lang, n: number): string {
  if (lang === "ar") {
    if (n === 0) return "لم يُستشهد به بعد"
    if (n === 1) return "يُستشهد به في مسألة واحدة"
    if (n === 2) return "يُستشهد به في مسألتين"
    if (n <= 10) return `يُستشهد به في ${n} مسائل`
  }
  return ui.citedIn[lang].replace("{n}", String(n))
}

/**
 * The closed list of reference works, each school with its books and how
 * many entries cite each. The counts come from build_data.py, so a book
 * that is on the list but never cited shows "0" rather than disappearing:
 * the list is what may be cited, not what has been.
 */
export function SourcesSection({ lang }: { lang: Lang }) {
  // The list arrives with this component, after the navigation that
  // carried the hash — so the browser found nothing to scroll to. Do it
  // here, once the books are in the document.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1))
    if (!id) return
    const node = document.getElementById(id)
    if (node) node.scrollIntoView({ block: "start" })
  }, [])
  return (
    <div className="mx-auto max-w-3xl pb-16">
      <h1 className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">{ui.sourcesSection[lang]}</h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{ui.sourcesIntro[lang]}</p>

      {schools.map((s) => {
        const mine = books.filter((b) => b.school === s.key)
        return (
          <section key={s.key} className="mt-10">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-foreground sm:text-xl">
              <span className={`size-2.5 rounded-full ${s.color.dot}`} aria-hidden="true" />
              {s.name[lang]}
              <span className="text-[13px] font-semibold text-muted-foreground">{mine.length}</span>
            </h2>
            <ul className="flex list-none flex-col gap-1.5 p-0">
              {mine.map((b) => (
                <li
                  key={b.ar}
                  id={sourceAnchor(b.ar)}
                  className={`flex scroll-mt-36 flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-xl border ${s.color.border} bg-white/[0.02] px-4 py-3 target:bg-white/[0.08]`}
                >
                  <span className="flex flex-col">
                    <span className="text-[15px] font-semibold text-foreground">{lang === "ar" ? b.ar : b[lang]}</span>
                    {lang !== "ar" ? <span className="text-[13px] text-muted-foreground" lang="ar" dir="rtl">{b.ar}</span> : null}
                  </span>
                  <span className="text-[13px] tabular-nums text-muted-foreground">{citedLabel(lang, b.cited)}</span>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      <section className="mt-12 border-t border-white/10 pt-8">
        <h2 className="text-lg font-bold text-foreground sm:text-xl">{ui.worksTitle[lang]}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{ui.worksDesc[lang]}</p>
        <ul className="mt-4 flex list-none flex-col gap-1.5 p-0">
          {works.map((w) => (
            <li key={w.ar} className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <span className="text-[15px] font-semibold text-foreground">{lang === "ar" ? w.ar : w[lang]}</span>
              {lang !== "ar" ? <span className="text-[13px] text-muted-foreground" lang="ar" dir="rtl">{w.ar}</span> : null}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
