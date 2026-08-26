"use client"

import { useState } from "react"
import { BookOpen, ListChecks, Maximize2, Quote, Sparkles } from "lucide-react"
import { Modal } from "@/components/modal"
import { ArticleReader } from "@/components/article-reader"
import { type Lang, type TheologyProof, theologyProofs, ui } from "@/lib/fiqh-data"

interface TheologySectionProps {
  lang: Lang
}

export function TheologySection({ lang }: TheologySectionProps) {
  const [active, setActive] = useState<TheologyProof | null>(null)
  const [reading, setReading] = useState<TheologyProof | null>(null)

  return (
    <section aria-label={ui.aqidahSection[lang]}>
      <div className="mb-6">
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{ui.aqidahSection[lang]}</h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {theologyProofs.length} {ui.proofsCount[lang]}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {theologyProofs.map((proof) => (
          <div
            key={proof.id}
            className={`group flex flex-col rounded-2xl border ${proof.accent.border} bg-white/[0.02] p-5 backdrop-blur-sm transition-all duration-300 ${proof.accent.ring} ${proof.accent.glow}`}
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 ${proof.accent.text}`}
              >
                <Sparkles className="size-5" aria-hidden="true" />
              </span>
              <span className={`size-2.5 rounded-full ${proof.accent.dot}`} aria-hidden="true" />
            </div>
            <h3 className="text-balance text-base font-bold leading-snug text-foreground">{proof.title[lang]}</h3>
            <p className="mt-1 flex-1 text-pretty text-sm leading-relaxed text-muted-foreground">
              {proof.tagline[lang]}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActive(proof)}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-white/25 hover:bg-white/10"
              >
                {ui.quickView[lang]}
              </button>
              <button
                type="button"
                onClick={() => setReading(proof)}
                className={`flex items-center gap-1.5 rounded-full border ${proof.accent.border} bg-white/[0.03] px-3 py-1.5 text-xs font-semibold ${proof.accent.text} transition-opacity hover:opacity-80`}
              >
                <Maximize2 className="size-3.5" aria-hidden="true" />
                {ui.deepDive[lang]}
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={active !== null}
        onClose={() => setActive(null)}
        title={active ? active.title[lang] : ""}
        description={active ? active.tagline[lang] : undefined}
        closeLabel={ui.close[lang]}
        size="max-w-2xl"
      >
        {active ? (
          <div className="flex flex-col gap-6">
            {/* Premises */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <ListChecks className={`size-4 ${active.accent.text}`} aria-hidden="true" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{ui.premises[lang]}</h3>
              </div>
              <ol className="flex flex-col gap-3">
                {active.premises.map((premise, i) => (
                  <li
                    key={i}
                    className="flex gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
                  >
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-bold ${active.accent.text}`}
                    >
                      {i + 1}
                    </span>
                    <p className="text-pretty text-sm leading-relaxed text-foreground/90">{premise[lang]}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Quran proof */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Quote className={`size-4 ${active.accent.text}`} aria-hidden="true" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{ui.quranProof[lang]}</h3>
              </div>
              <blockquote className={`rounded-xl border ${active.accent.border} bg-white/[0.03] p-4`}>
                <p className="text-balance text-base font-semibold leading-relaxed text-foreground">
                  {active.quran.verse[lang]}
                </p>
                <footer className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <BookOpen className="size-3.5" aria-hidden="true" />
                  {active.quran.ref[lang]}
                </footer>
              </blockquote>
            </div>

            {/* Conclusion */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className={`size-4 ${active.accent.text}`} aria-hidden="true" />
                <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{ui.conclusion[lang]}</h3>
              </div>
              <p className="text-pretty text-sm leading-relaxed text-foreground/90">{active.conclusion[lang]}</p>
            </div>
          </div>
        ) : null}
      </Modal>

      <ArticleReader proof={reading} lang={lang} onClose={() => setReading(null)} />
    </section>
  )
}
