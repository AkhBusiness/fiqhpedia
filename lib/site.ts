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
 * One address per entry, per language, under the section it belongs to:
 *
 *   /ar/fiqh/F109      — an issue
 *   /ar/articles/M8    — an article
 *   /ar/aqidah/A1      — a rational proof
 *
 * The ref is permanent, so these links are too. The first addresses were
 * /ar/f/F109, /ar/m/M8 and /ar/a/A1; public/_redirects sends them here with
 * a 301, because they are already shared and printed (the PDF book's codes).
 */
export function entryPath(lang: Lang, ref: string): string {
  const r = ref.trim().toUpperCase()
  const section = r[0] === "F" ? "fiqh" : r[0] === "M" ? "articles" : "aqidah"
  return `/${lang}/${section}/${r}`
}

export function entryUrl(lang: Lang, ref: string): string {
  return SITE_URL + entryPath(lang, ref)
}

/** The section index an entry belongs to. */
export function sectionPath(lang: Lang, ref: string): string {
  const r = ref.trim().toUpperCase()
  return `/${lang}/${r[0] === "F" ? "fiqh" : r[0] === "M" ? "articles" : "aqidah"}`
}

/** Anchor of one reference work on the Sources page, from its Arabic name. */
export function sourceAnchor(ar: string): string {
  return `src-${ar.trim().replace(/\s+/g, "-")}`
}
