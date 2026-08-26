"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "fiqh:bookmarks"

/**
 * LocalStorage-backed bookmark set for saving Fiqh issues.
 * Syncs across components in the same tab via a custom event,
 * and across tabs via the native `storage` event.
 */
export function useBookmarks() {
  const [ids, setIds] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Load once on mount (client-only to avoid hydration mismatch).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setIds(JSON.parse(raw))
    } catch {
      // ignore malformed storage
    }
    setHydrated(true)
  }, [])

  // Keep in sync when other components / tabs mutate the same key.
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        setIds(raw ? JSON.parse(raw) : [])
      } catch {
        setIds([])
      }
    }
    window.addEventListener("fiqh:bookmarks-changed", read)
    window.addEventListener("storage", read)
    return () => {
      window.removeEventListener("fiqh:bookmarks-changed", read)
      window.removeEventListener("storage", read)
    }
  }, [])

  const persist = useCallback((next: string[]) => {
    setIds(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      // storage may be unavailable (private mode); state still updates
    }
    window.dispatchEvent(new Event("fiqh:bookmarks-changed"))
  }, [])

  const toggle = useCallback(
    (id: string) => {
      persist(ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])
    },
    [ids, persist],
  )

  const isBookmarked = useCallback((id: string) => ids.includes(id), [ids])

  return { ids, count: ids.length, toggle, isBookmarked, hydrated }
}
