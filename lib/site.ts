import type { Lang } from "@/lib/fiqh-data"

/**
 * The public origin, for absolute links in share previews, sitemaps and
 * hreflang. A relative URL is useless to WhatsApp or a search engine — they
 * read the page from outside, not from the browser that is on it.
 *
 * Set `NEXT_PUBLIC_SITE_URL` at build time when the domain changes; the
 * fallback is the current Pages host.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://fiqhpedia.pages.dev").replace(/\/$/, "")

/**
 * One address per entry, per language.
 *
 *   /ar/f/F109  — an issue (fiqh)
 *   /ar/m/M8    — an article (maqāla)
 *   /ar/a/A1    — a rational proof (aqīda)
 *
 * The letter is the ref's own first letter, lowercased, so a reader who
 * knows the ref can type the address. Refs are permanent, so these links
 * are too.
 */
export function entryPath(lang: Lang, ref: string): string {
  const r = ref.trim().toUpperCase()
  const kind = r[0] === "F" ? "f" : r[0] === "M" ? "m" : "a"
  return `/${lang}/${kind}/${r}`
}

export function entryUrl(lang: Lang, ref: string): string {
  return SITE_URL + entryPath(lang, ref)
}

/** The section index an entry belongs to. */
export function sectionPath(lang: Lang, ref: string): string {
  const r = ref.trim().toUpperCase()
  return `/${lang}/${r[0] === "F" ? "fiqh" : r[0] === "M" ? "articles" : "aqidah"}`
}
