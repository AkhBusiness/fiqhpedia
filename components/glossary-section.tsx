"use client"

import { useEffect, useMemo, useState } from "react"
import { BookMarked, Search, X } from "lucide-react"
import {
  type GlossaryTerm,
  glossary,
  glossaryAnchor,
  type Lang,
  normalizeSearch,
  ui,
  LANGS,
} from "@/lib/fiqh-data"

interface GlossarySectionProps {
  lang: Lang
}

/** The three scholarly senses, in the order they are traditionally given. */
function senses(term: GlossaryTerm, lang: Lang) {
  return [
    { key: "linguistic", label: ui.glossaryLinguistic[lang], text: term.linguistic?.[lang] },
    { key: "technical", label: ui.glossaryTechnical[lang], text: term.technical?.[lang] },
    { key: "legal", label: ui.glossaryLegal[lang], text: term.legal?.[lang] },
  ].filter((s) => s.text && s.text.trim())
}

function TermCard({ term, lang, flash }: { term: GlossaryTerm; lang: Lang; flash: boolean }) {
  const parts = senses(term, lang)

  return (
    <article
      id={glossaryAnchor(term.id)}
      className={`scroll-mt-36 rounded-2xl border bg-white/[0.03] p-5 backdrop-blur-md transition-colors sm:p-6 ${
        flash ? "border-primary/60 bg-primary/[0.06]" : "border-white/10"
      }`}
    >
      <header className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-lg font-bold text-foreground">{term.term[lang]}</h3>
        {/* The other languages: a reader meeting «نجاسة» in Russian should be
            able to recognise it in an English source, and vice versa. */}
        <span className="text-xs text-muted-foreground">
          {LANGS.filter((l) => l !== lang)
            .map((l) => term.term[l])
            .join(" · ")}
        </span>
      </header>

      {parts.length > 0 ? (
        <dl className="flex flex-col gap-3">
          {parts.map((s) => (
            <div key={s.key} className="flex flex-col gap-1">
              <dt className="text-xs font-bold uppercase tracking-wide text-primary">{s.label}</dt>
              <dd className="text-pretty text-sm leading-relaxed text-muted-foreground">{s.text}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {term.definition[lang]}
          </p>
          <p className="text-xs text-muted-foreground/70">{ui.glossaryPending[lang]}</p>
        </div>
      )}
    </article>
  )
}

export function GlossarySection({ lang }: GlossarySectionProps) {
  const [query, setQuery] = useState("")
  const [target, setTarget] = useState<string | null>(null)

  // Deep link: /ar/glossary#term-najasah opens straight on the term and
  // highlights it, which is what the marker inside a ruling links to.
  useEffect(() => {
    const apply = () => {
      const hash = window.location.hash.replace("#", "").trim()
      if (!hash.startsWith("term-")) return
      const id = hash.slice(5)
      if (!glossary.some((t) => t.id === id)) return
      // Clear the filter first, or the target may be hidden by an old query.
      setQuery("")
      setTarget(id)
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }),
        ),
      )
    }
    apply()
    window.addEventListener("hashchange", apply)
    return () => window.removeEventListener("hashchange", apply)
  }, [])

  const visible = useMemo(() => {
    const q = normalizeSearch(query)
    if (!q) return glossary
    return glossary.filter((t) => {
      const hay = normalizeSearch(
        LANGS.flatMap((l) => [
          t.term[l],
          t.definition[l],
          t.linguistic?.[l] ?? "",
          t.technical?.[l] ?? "",
          t.legal?.[l] ?? "",
        ]).join(" "),
      )
      return q.split(" ").every((tok) => hay.includes(tok))
    })
  }, [query])

  return (
    <section aria-label={ui.glossarySection[lang]} className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{ui.glossarySection[lang]}</h2>
        <p className="mt-0.5 text-pretty text-sm text-muted-foreground">
          {ui.glossarySectionDesc[lang]}
        </p>
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute inset-y-0 start-3.5 my-auto size-4 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setTarget(null)
          }}
          placeholder={ui.glossarySearch[lang]}
          aria-label={ui.glossarySearch[lang]}
          className="h-11 w-full rounded-full border border-white/10 bg-white/[0.04] ps-10 pe-10 text-base text-foreground placeholder:text-muted-foreground/70 backdrop-blur-md transition-colors focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/10"
        />
        {query ? (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label={ui.clearSearch[lang]}
            className="absolute inset-y-0 end-2.5 my-auto flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        ) : (
          <span className="pointer-events-none absolute inset-y-0 end-4 my-auto text-xs font-medium tabular-nums text-muted-foreground/70">
            {visible.length} {ui.glossaryCount[lang]}
          </span>
        )}
      </div>

      {visible.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {visible.map((t) => (
            <TermCard key={t.id} term={t} lang={lang} flash={t.id === target} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-20 text-center backdrop-blur-md">
          <span className="mb-4 flex size-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-muted-foreground">
            <BookMarked className="size-7" aria-hidden="true" />
          </span>
          <p className="text-sm text-muted-foreground">{ui.glossaryEmpty[lang]}</p>
        </div>
      )}
    </section>
  )
}
