"use client"

import { useEffect, useId, useRef, useState, type ReactNode } from "react"
import { ArrowUpRight, BookOpen } from "lucide-react"
import { type GlossaryTerm, glossary, glossaryAnchor, type Lang, normalizeSearch, ui, LANGS } from "@/lib/fiqh-data"

/* ------------------------------------------------------------------ */
/* Text normalization for matching (strip Arabic diacritics + punct)   */
/* ------------------------------------------------------------------ */

/** Shared with the search box: one folding rule for the whole site, so a
 *  term highlighted inline is the same term the search box finds. */
const normalize = normalizeSearch

/** Normalized surface form (any language) → glossary term. */
const NORMALIZED_INDEX: Record<string, GlossaryTerm> = (() => {
  const map: Record<string, GlossaryTerm> = {}
  for (const t of glossary) {
    for (const l of LANGS) {
      map[normalize(t.term[l])] = t
    }
  }
  return map
})()

/**
 * Cyrillic stem → term, for matching a declined form against a nominative
 * entry. Built from each word of a term rather than the whole phrase,
 * because the text is scanned token by token and a two-word term such as
 * `Церковні собори` would otherwise never meet its entry.
 */
/**
 * Endings that Russian and Ukrainian nouns and adjectives take when they are
 * declined. The glossary holds each term in the nominative — `Церковні
 * собори` — while the prose has it in whatever case the sentence needs:
 * `церковних соборах`. An exact match therefore found almost nothing in
 * precisely the two languages the article glossary was built for.
 */
const SLAVIC_ENDINGS = [
  "ами", "ями", "ові", "еві", "ах", "ях", "ам", "ям", "ов", "ев", "ів", "їв",
  "ий", "ій", "ые", "ые", "их", "іх", "ым", "им", "ім", "ой", "ей", "ею", "ою",
  "а", "я", "у", "ю", "е", "є", "и", "і", "ы", "о", "ь",
]

/** The invariant head of a Slavic word: enough to match across cases. */
function slavicStem(w: string): string {
  for (const e of SLAVIC_ENDINGS) {
    if (w.length - e.length >= 4 && w.endsWith(e)) return w.slice(0, -e.length)
  }
  return w
}

const GENERIC_QUALIFIERS = new Set([
  "чисте", "чистое", "чистий", "чистый",
  "збережена", "збережений", "хранимая", "хранимый",
  "старий", "новий", "старый", "новый",
  "святий", "святой", "великий", "велика",
])

const STEM_INDEX: Record<string, GlossaryTerm> = (() => {
  const map: Record<string, GlossaryTerm> = {}
  for (const t of glossary) {
    for (const l of ["ru", "uk"] as const) {
      const words = normalize(t.term[l]).split(/[\s,]+/).filter(Boolean)
      for (const w of words) {
        // Short words are skipped: their stems collide across unrelated terms.
        if (w.length < 5) continue
        // So are ordinary adjectives that merely qualify the head noun —
        // `чисте` in "чисте полум'я" and `збережена` in "Збережена
        // скрижаль" are everyday words, and keying on them lit up every
        // sentence that happened to describe something as pure or preserved.
        if (words.length > 1 && GENERIC_QUALIFIERS.has(w)) continue
        const stem = slavicStem(w)
        if (!(stem in map)) map[stem] = t
      }
    }
  }
  return map
})()

// Leading Arabic clitics: definite article + conjunction/preposition combos.
const AR_PREFIXES = ["وبال", "فبال", "بال", "كال", "فال", "وال", "لل", "ال", "و", "ف", "ب", "ك", "ل"]


/** Resolve a raw token to a glossary term, tolerating inflection. */
function matchToken(raw: string): GlossaryTerm | undefined {
  const key = normalize(raw)
  if (!key) return undefined
  const direct = NORMALIZED_INDEX[key]
  if (direct) return direct
  // Try stripping attached Arabic clitics (ال، وال، بال، …).
  for (const p of AR_PREFIXES) {
    if (key.startsWith(p) && key.length - p.length >= 2) {
      const stripped = NORMALIZED_INDEX[key.slice(p.length)]
      if (stripped) return stripped
    }
  }
  // Cyrillic: match on the stem so a declined form still resolves.
  if (/[\u0400-\u04FF]/.test(key)) {
    const byStem = STEM_INDEX[slavicStem(key)]
    if (byStem) return byStem
  }
  return undefined
}

/* ------------------------------------------------------------------ */
/* Single inline term with a glassmorphic popover                      */
/* ------------------------------------------------------------------ */

interface GlossaryTooltipProps {
  term: GlossaryTerm
  lang: Lang
  children: ReactNode
}

export function GlossaryTooltip({ term, lang, children }: GlossaryTooltipProps) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)
  const popId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  return (
    <span
      ref={wrapRef}
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-describedby={open ? popId : undefined}
        className="cursor-help font-semibold text-primary underline decoration-primary/40 decoration-dotted underline-offset-4 transition-colors hover:decoration-primary"
      >
        {children}
      </button>

      {open ? (
        <span
          id={popId}
          role="tooltip"
          className="animate-modal-panel absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-2xl border border-white/15 bg-popover/95 p-4 text-start shadow-2xl shadow-black/60 backdrop-blur-2xl"
        >
          <span className="mb-1.5 flex items-center gap-2">
            <BookOpen className="size-3.5 text-primary" aria-hidden="true" />
            <span className="text-sm font-bold text-foreground">{term.term[lang]}</span>
          </span>
          <span className="block text-pretty text-xs leading-relaxed text-muted-foreground">
            {term.definition[lang]}
          </span>
          {/* The popover gives the one-line gloss; the full entry (لغةً /
              اصطلاحاً / شرعاً) lives in the glossary tab. */}
          <a
            href={`/${lang}/glossary#${glossaryAnchor(term.id)}`}
            className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            {ui.glossaryOpen[lang]}
            <ArrowUpRight className="size-3" aria-hidden="true" />
          </a>
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-full size-3 -translate-x-1/2 -translate-y-1/2 rotate-45 border-b border-r border-white/15 bg-popover/95"
          />
        </span>
      ) : null}
    </span>
  )
}

/* ------------------------------------------------------------------ */
/* Auto-highlighting renderer for a plain localized string             */
/* ------------------------------------------------------------------ */

interface GlossaryTextProps {
  text: string
  lang: Lang
  /** Set false to render plain text without highlighting (e.g. simplified mode) */
  enabled?: boolean
}

export function GlossaryText({ text, lang, enabled = true }: GlossaryTextProps) {
  if (!enabled) return <>{text}</>

  const seen = new Set<string>()
  const parts = text.split(/(\s+)/)

  return (
    <>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part) || part === "") return part
        const term = matchToken(part)
        // Only highlight the first occurrence of each term to avoid noise.
        if (term && !seen.has(term.id)) {
          seen.add(term.id)
          return (
            <GlossaryTooltip key={i} term={term} lang={lang}>
              {part}
            </GlossaryTooltip>
          )
        }
        return part
      })}
    </>
  )
}

/** Exposed for callers that want the tooltip hint label. */
export function glossaryHint(lang: Lang): string {
  return ui.glossaryHint[lang]
}
