/* ------------------------------------------------------------------ */
/* A book's edition number, from what is written against what is       */
/* planned (data/books.json, built from خريطة-الأبواب.md).             */
/*                                                                      */
/*   0.N   preliminary, N = entries written. Never goes down: the plan  */
/*         grows (طهارة went 121 → 122) and a percentage would shrink;  */
/*         the count of written entries only rises.                     */
/*   1.0   every planned entry written — the first edition.             */
/* ------------------------------------------------------------------ */

import booksJson from "@/data/books.json"

interface PlanBook {
  id: string
  planned: number | null
  written: number
  chapters: { name: string; status: string; planned: number | null; written: number; refs: string[]; chapter?: unknown }[]
}

export const planBooks = (booksJson as { books: PlanBook[] }).books

export interface Edition {
  version: string
  complete: boolean
  written: number
  planned: number | null
}

export function editionOf(bookId: string): Edition {
  const b = planBooks.find((x) => x.id === bookId)
  const written = b?.written ?? 0
  const planned = b?.planned ?? null
  const complete = planned !== null && written >= planned
  return { version: complete ? "1.0" : `0.${written}`, complete, written, planned }
}
