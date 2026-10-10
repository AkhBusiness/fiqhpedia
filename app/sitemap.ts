import type { MetadataRoute } from "next"
import { LANGS, type Lang } from "@/lib/fiqh-data"
import { theologyProofs } from "@/lib/theology-data"
import { fullArticles, fullIssues } from "@/lib/fiqh-full"
import { entryUrl, SITE_URL } from "@/lib/site"

export const dynamic = "force-static"

/** Every page the site has, for search engines. Regenerated at each build. */
export default function sitemap(): MetadataRoute.Sitemap {
  const sections = ["", "/fiqh", "/aqidah", "/articles", "/glossary", "/learn", "/about", "/sources"]
  const alt = (path: (l: Lang) => string) => ({
    languages: Object.fromEntries(LANGS.map((l) => [l, path(l)])),
  })
  const out: MetadataRoute.Sitemap = []
  for (const l of LANGS) {
    for (const s of sections) {
      out.push({ url: `${SITE_URL}/${l}${s}`, changeFrequency: "weekly", priority: s === "" ? 1 : 0.8, alternates: alt((x) => `${SITE_URL}/${x}${s}`) })
    }
    for (const i of fullIssues) {
      out.push({ url: entryUrl(l, i.ref), lastModified: i.revisedAt ?? i.addedAt, changeFrequency: "monthly", priority: 0.7, alternates: alt((x) => entryUrl(x, i.ref)) })
    }
    for (const a of fullArticles) out.push({ url: entryUrl(l, a.ref), changeFrequency: "monthly", priority: 0.6, alternates: alt((x) => entryUrl(x, a.ref)) })
    for (const p of theologyProofs) out.push({ url: entryUrl(l, p.ref), changeFrequency: "yearly", priority: 0.5, alternates: alt((x) => entryUrl(x, p.ref)) })
  }
  return out
}
