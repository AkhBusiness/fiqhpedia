import type { Metadata, Viewport } from "next"
import "@/app/globals.css"
import { AppStateProvider } from "@/components/app-state"
import { LANGS, type Lang, rtlLangs } from "@/lib/fiqh-data"
import { SITE_URL } from "@/lib/site"

/**
 * The root layout for every language-prefixed page.
 *
 * It sits inside [lang] so that `<html lang dir>` can be the page's own
 * language. The old single root said `lang="ar" dir="rtl"` on the English,
 * Russian, Spanish and Ukrainian pages too — a screen reader pronounced them
 * as Arabic and a search engine filed them under it. The bare "/" and
 * /admin live under the (bare) group with their own root.
 */
export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }))
}

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "تبيان | Tibyān",
  description:
    "الإسلام من منابعه — فقهاً وعقيدةً وسيرة، بخمس لغات. Islam from its own sources, in five languages.",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
}

export default async function LangLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Promise<{ lang: string }> }>) {
  const { lang } = await params
  const l = ((LANGS as readonly string[]).includes(lang) ? lang : "ar") as Lang
  const dir = rtlLangs.includes(l) ? "rtl" : "ltr"
  return (
    <html lang={l} dir={dir} className="dark bg-background">
      <body className="antialiased">
        <AppStateProvider>{children}</AppStateProvider>
      </body>
    </html>
  )
}
