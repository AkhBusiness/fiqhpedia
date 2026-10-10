"use client"

import { BookOpen, ListChecks, Quote, Sparkles } from "lucide-react"
import { type Lang, type TheologyProof, displayRef, ui } from "@/lib/fiqh-data"

/**
 * A rational proof as a page. The same body the in-section reader shows,
 * without the overlay: this is the document a shared link opens.
 */
export function ProofView({ proof, lang }: { proof: TheologyProof; lang: Lang }) {
  return (
    <article className="mx-auto max-w-2xl pb-16">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md border ${proof.accent.border} bg-white/[0.04] px-1.5 py-0.5 font-mono text-[13px] font-bold ${proof.accent.text}`}
          title={ui.refHint[lang]}
        >
          {displayRef(proof.ref, lang)}
        </span>
      </div>

      <h1 className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">{proof.title[lang]}</h1>
      <p className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground">{proof.tagline[lang]}</p>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <ListChecks className={`size-5 ${proof.accent.text}`} aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground">{ui.premises[lang]}</h2>
        </div>
        <ol className="flex list-none flex-col gap-3 p-0">
          {proof.premises.map((premise, i) => (
            <li key={i} className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-bold ${proof.accent.text}`}
              >
                {i + 1}
              </span>
              <p className="text-pretty text-base leading-relaxed text-foreground/90">{premise[lang]}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Quote className={`size-5 ${proof.accent.text}`} aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground">{ui.quranProof[lang]}</h2>
        </div>
        <blockquote className={`rounded-2xl border ${proof.accent.border} bg-white/[0.03] p-6`}>
          <p dir="rtl" lang="ar" className="text-balance text-xl font-semibold leading-relaxed text-foreground">
            {proof.quran.verse}
          </p>
          <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BookOpen className="size-4" aria-hidden="true" />
              {proof.quran.ref[lang]}
            </span>
            {proof.quran.url ? (
              <a
                href={proof.quran.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                {ui.readVerse[lang]}
              </a>
            ) : null}
          </footer>
        </blockquote>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Sparkles className={`size-5 ${proof.accent.text}`} aria-hidden="true" />
          <h2 className="text-lg font-bold text-foreground">{ui.conclusion[lang]}</h2>
        </div>
        <p className="text-pretty text-base leading-relaxed text-foreground/90">{proof.conclusion[lang]}</p>
      </section>
    </article>
  )
}
