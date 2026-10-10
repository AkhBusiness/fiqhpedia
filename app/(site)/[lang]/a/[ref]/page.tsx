import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { LANGS, type Lang } from "@/lib/fiqh-data"
import { findProof, theologyProofs } from "@/lib/theology-data"
import { entryUrl } from "@/lib/site"

/** /ar/a/A1 — one rational proof, one page. */
export function generateStaticParams() {
  return LANGS.flatMap((lang) => theologyProofs.map((p) => ({ lang, ref: p.ref })))
}

type Params = Promise<{ lang: string; ref: string }>

const find = findProof

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { lang, ref } = await params
  const proof = find(ref)
  if (!proof || !(LANGS as readonly string[]).includes(lang)) return {}
  const l = lang as Lang
  const title = proof.title[l]
  const description = proof.tagline[l]
  return {
    title: `${title} | تبيان`,
    description,
    alternates: {
      canonical: entryUrl(l, proof.ref),
      languages: Object.fromEntries(LANGS.map((x) => [x, entryUrl(x, proof.ref)])),
    },
    openGraph: { type: "article", title, description, url: entryUrl(l, proof.ref), siteName: "تبيان", locale: l },
    twitter: { card: "summary", title, description },
  }
}

export default async function ProofPage({ params }: { params: Params }) {
  const { lang, ref } = await params
  if (!(LANGS as readonly string[]).includes(lang)) notFound()
  const proof = find(ref)
  if (!proof) notFound()
  return <AppShell lang={lang as Lang} section="aqidah" entry={{ kind: "proof", proof }} />
}
