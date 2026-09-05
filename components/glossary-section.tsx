"use client"

import { useEffect, useMemo, useState } from "react"
import { BookMarked, Search, X } from "lucide-react"
import {
  type GlossaryTerm,
  glossary,
  glossaryAnchor,
  type Lang,
  normalizeSearch,
  schools,
  ui,
  LANGS,
} from "@/lib/fiqh-data"

interface GlossarySectionProps {
  lang: Lang
}

/** Text of the one-line gloss, only when it adds to the scholarly senses. */
function gloss(term: GlossaryTerm, lang: Lang) {
  return (term.briefDefinition ?? term.definition)?.[lang]?.trim() ?? ""
}

/** لغةً and شرعاً: one text each. اصطلاحاً is per school and rendered apart. */
function plainSenses(term: GlossaryTerm, lang: Lang) {
  return [
    { key: "linguistic", label: ui.glossaryLinguistic[lang], text: term.linguistic?.[lang] },
    { key: "legal", label: ui.glossaryLegal[lang], text: term.legal?.[lang] },
  ].filter((s) => s.text && s.text.trim())
}

/** اصطلاحاً: the four schools in their fixed order, each with its sources. */
function schoolSenses(term: GlossaryTerm, lang: Lang) {
  return schools
    .map((s) => ({ school: s, sense: term.technical?.[s.key] }))
    .filter((x) => x.sense?.text?.[lang]?.trim())
}

function TermCard({ term, lang, flash }: { term: GlossaryTerm; lang: Lang; flash: boolean }) {
  const brief = gloss(term, lang)
  const plain = plainSenses(term, lang)
  const bySchool = schoolSenses(term, lang)
  const hasScholarly = plain.length > 0 || bySchool.length > 0
  const linguistic = plain.filter((s) => s.key === "linguistic")
  const legal = plain.filter((s) => s.key === "legal")

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

      {hasScholarly ? (
        <dl className="flex flex-col gap-3">
          {brief ? (
            <div className="flex flex-col gap-1">
              <dt className="text-xs font-bold uppercase tracking-wide text-primary">
                {ui.glossaryGeneral[lang]}
              </dt>
              <dd className="text-pretty text-sm leading-relaxed text-muted-foreground">{brief}</dd>
            </div>
          ) : null}

          {linguistic.map((s) => (
            <div key={s.key} className="flex flex-col gap-1">
              <dt className="text-xs font-bold uppercase tracking-wide text-primary">{s.label}</dt>
              <dd className="text-pretty text-sm leading-relaxed text-muted-foreground">{s.text}</dd>
            </div>
          ))}

          {legal.map((s) => (
            <div key={s.key} className="flex flex-col gap-1">
              <dt className="text-xs font-bold uppercase tracking-wide text-primary">{s.label}</dt>
              <dd className="text-pretty text-sm leading-relaxed text-muted-foreground">{s.text}</dd>
            </div>
          ))}

          {bySchool.length > 0 ? (
            <div className="flex flex-col gap-2">
              <dt className="text-xs font-bold uppercase tracking-wide text-primary">
                {ui.glossaryTechnical[lang]}
              </dt>
              <dd className="flex flex-col gap-2">
                {bySchool.map(({ school, sense }) => (
                  <div
                    key={school.key}
                    className={`rounded-xl border bg-white/[0.02] p-3 ${school.color.border}`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${school.color.badgeBg} ${school.color.badgeText}`}
                      >
                        {school.name[lang]}
                      </span>
                    </div>
                    <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
                      {sense!.text[lang]}
                    </p>
                    {sense!.sources?.length ? (
                      <p className="mt-1.5 text-xs text-muted-foreground/70">
                        {ui.reference[lang]}: {sense!.sources.map((r) => r[lang]).join(" · ")}
                      </p>
                    ) : null}
                  </div>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{brief}</p>
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
          t.term[l] ?? "",
          t.definition?.[l] ?? "",
          t.briefDefinition?.[l] ?? "",
          t.linguistic?.[l] ?? "",
          t.legal?.[l] ?? "",
          ...Object.values(t.technical ?? {}).map((s) => s?.text?.[l] ?? ""),
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
