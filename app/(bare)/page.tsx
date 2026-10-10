"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LANGS, type Lang } from "@/lib/fiqh-data"

const DEFAULT_LANG: Lang = "ar"
const STORAGE_KEY = "fiqhpedia:lang"

/**
 * The bare "/" has no language, so it cannot be a static page in a site whose
 * every route is language-prefixed. It redirects instead: to the language the
 * visitor last used, else the one their browser asks for, else Arabic.
 *
 * replace(), not push(), so the back button leaves the site rather than
 * bouncing through this redirect.
 */
export default function RootRedirect() {
  const router = useRouter()

  useEffect(() => {
    const known = (v: string | null): v is Lang =>
      !!v && (LANGS as readonly string[]).includes(v)

    let target: Lang = DEFAULT_LANG
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      if (known(stored)) target = stored
      else {
        const browser = navigator.languages?.map((l) => l.slice(0, 2)) ?? []
        const match = browser.find(known)
        if (match) target = match
      }
    } catch {
      // Private browsing can throw on localStorage; the default still works.
    }
    // Carry the hash: published links look like fiqhpedia.pages.dev/#M1 and
    // the ref is permanent, so dropping it here would break every one of them.
    router.replace(`/${target}${window.location.hash}`)
  }, [router])

  return null
}
