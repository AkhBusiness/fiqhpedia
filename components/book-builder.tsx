"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { FileDown, X } from "lucide-react"
import { categories, type Lang, type SchoolKey, schools, ui } from "@/lib/fiqh-data"
import { editionOf, planBooks } from "@/lib/edition"

/**
 * "PDF book": a button and the dialog behind it. The reader ticks books and
 * schools; the link goes to /[lang]/print, which typesets the book. Only
 * books with written entries are offered. The default school is the one the
 * reader chose for the site, if any — a Ḥanbalī reader wants a Ḥanbalī book.
 */
export function BookBuilderButton({ lang, initialBook, className }: { lang: Lang; initialBook?: string; className?: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const available = categories.filter((c) => (planBooks.find((b) => b.id === c.id)?.written ?? 0) > 0)
  const [books, setBooks] = useState<string[]>(initialBook ? [initialBook] : available.slice(0, 1).map((c) => c.id))
  const [picked, setPicked] = useState<SchoolKey[]>(schools.map((s) => s.key))

  useEffect(() => {
    try {
      const pref = JSON.parse(localStorage.getItem("fiqh:preference") ?? "null") as { school?: SchoolKey | null } | null
      if (pref?.school && schools.some((s) => s.key === pref.school)) setPicked([pref.school])
    } catch {
      /* private browsing */
    }
  }, [])

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
  const all = picked.length === schools.length
  const ok = books.length > 0 && picked.length > 0
  const order = categories.map((c) => c.id)
  const href = `/${lang}/print?books=${order.filter((b) => books.includes(b)).join(",")}${
    all ? "" : `&schools=${schools.filter((s) => picked.includes(s.key)).map((s) => s.key).join(",")}`
  }`

  const chip = (on: boolean) =>
    `inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-semibold transition-colors ${
      on ? "border-foreground/40 bg-foreground text-background" : "border-white/15 bg-white/5 text-foreground hover:border-white/30"
    }`

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={
          className ??
          "inline-flex min-h-11 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-sm font-semibold text-foreground transition-colors hover:border-white/30 hover:bg-white/10"
        }
      >
        <FileDown className="size-4" aria-hidden="true" />
        {ui.printMakeBook[lang]}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="book-builder-title"
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="m-auto w-[min(34rem,calc(100vw-2rem))] rounded-2xl border border-white/15 bg-popover p-0 text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm"
      >
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="book-builder-title" className="text-lg font-bold">
                {ui.builderTitle[lang]}
              </h2>
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">{ui.builderDesc[lang]}</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label={ui.close[lang]}
              className="-me-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">{ui.builderBooks[lang]}</legend>
            <div className="flex flex-wrap gap-2">
              {available.map((c) => {
                const on = books.includes(c.id)
                const ed = editionOf(c.id)
                return (
                  <button key={c.id} type="button" aria-pressed={on} onClick={() => setBooks(toggle(books, c.id))} className={chip(on)}>
                    {c.name[lang]}
                    <span className={on ? "opacity-70" : "text-muted-foreground"}>{ed.version}</span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 text-[13px] font-semibold text-muted-foreground">{ui.builderSchools[lang]}</legend>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                aria-pressed={all}
                onClick={() => setPicked(all ? [] : schools.map((s) => s.key))}
                className={chip(all)}
              >
                {ui.builderAllSchools[lang]}
              </button>
              {schools.map((s) => {
                const on = !all && picked.includes(s.key)
                return (
                  <button
                    key={s.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setPicked(all ? [s.key] : toggle(picked, s.key))}
                    className={chip(on)}
                  >
                    <span className={`size-2.5 rounded-full ${s.color.dot}`} aria-hidden="true" />
                    {s.name[lang]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          {ok ? (
            <Link
              href={href}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-foreground px-5 text-[15px] font-bold text-background transition-opacity hover:opacity-90"
            >
              <FileDown className="size-4" aria-hidden="true" />
              {ui.builderGo[lang]}
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground" role="status">
              {ui.builderNeedOne[lang]}
            </p>
          )}
        </div>
      </dialog>
    </>
  )
}
