/* The rational proofs. Loaded by the creed tab, the proof pages, and an
   article's "related proofs" — not by the page shell. */
import theologyJson from "@/data/theology.json"
import { CHAPTER_ACCENTS, DEFAULT_PROOF_ACCENT, type RawTheologyProof, type TheologyProof } from "@/lib/fiqh-data"

export const theologyProofs: TheologyProof[] = (theologyJson.theology as RawTheologyProof[]).map((p) => ({
  id: p.id,
  ref: p.ref,
  chapterId: p.chapterId,
  chapter: p.chapter,
  title: p.title,
  tagline: p.tagline,
  accent: CHAPTER_ACCENTS[p.chapterId ?? ""] ?? DEFAULT_PROOF_ACCENT,
  premises: p.premises,
  quran: p.quran,
  conclusion: p.conclusion,
}))

export function findProof(ref: string): TheologyProof | undefined {
  const key = ref.trim().toUpperCase()
  return theologyProofs.find((p) => p.ref === key)
}
