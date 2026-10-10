/* The glossary: 47 terms with definitions in five languages, four schools
   each. 134 KB — loaded only where a term is shown or matched, never with
   the page shell. */
import glossaryJson from "@/data/glossary.json"
import { GRADE_TERM_IDS, type GlossaryTerm, LANGS, type Localized } from "@/lib/fiqh-data"

// Old entries carry `definition`, new ones `briefDefinition`. Fill whichever
// is missing from the other so tooltips, search and the glossary page can
// all read `definition` without guarding — an undefined here crashed the
// glossary search on the first keystroke.
export const glossary: GlossaryTerm[] = (glossaryJson.glossary as GlossaryTerm[]).map((t) => {
  const gloss = t.definition ?? t.briefDefinition
  return { ...t, definition: gloss as Localized, briefDefinition: t.briefDefinition ?? gloss }
})

/** Lookup map keyed by lower-cased surface form (all languages) → term. */
const GLOSSARY_INDEX: Record<string, GlossaryTerm> = (() => {
  const map: Record<string, GlossaryTerm> = {}
  for (const t of glossary) {
    for (const l of LANGS) map[t.term[l].toLowerCase()] = t
  }
  return map
})()

/** Return the glossary term whose surface form equals `word` (any lang). */
export function findGlossaryTerm(word: string): GlossaryTerm | undefined {
  return GLOSSARY_INDEX[word.trim().toLowerCase()]
}

/**
 * The glossary entry a grade badge opens.
 * Matched exactly, never by prefix: `fard-ayn` and `sunnah-muakkadah` are
 * separate entries of their own, and a prefix match would hand the badge
 * for `fard` the definition of the individual obligation instead.
 */
export function gradeTerm(grade: string) {
  const id = GRADE_TERM_IDS[grade] ?? grade
  return glossary.find((t) => t.id === id)
}
