"use client"

import { useCallback, useEffect, useState } from "react"
import { type SchoolKey, countries } from "@/lib/fiqh-data"

const STORAGE_KEY = "fiqh:preference"

export interface Preference {
  /** ISO-ish country code from the countries list, or null if skipped. */
  country: string | null
  /** The school to display. Null means "show all schools". */
  school: SchoolKey | null
}

const EMPTY: Preference = { country: null, school: null }
const VALID_SCHOOLS: SchoolKey[] = ["hanafi", "maliki", "shafii", "hanbali"]

/** Reject anything that is not a shape we wrote ourselves — storage is
 *  user-editable, and a bad value here would otherwise reach the filter. */
function parse(raw: string | null): Preference {
  if (!raw) return EMPTY
  try {
    const v = JSON.parse(raw)
    const country =
      typeof v?.country === "string" && countries.some((c) => c.code === v.country)
        ? v.country
        : null
    const school = VALID_SCHOOLS.includes(v?.school) ? (v.school as SchoolKey) : null
    return { country, school }
  } catch {
    return EMPTY
  }
}

/**
 * Persisted country + school preference.
 *
 * Mirrors useBookmarks: reads once on mount (client-only, to avoid a
 * hydration mismatch), and stays in sync across components in this tab via a
 * custom event and across tabs via the native `storage` event.
 */
export function usePreference() {
  const [pref, setPref] = useState<Preference>(EMPTY)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setPref(parse(localStorage.getItem(STORAGE_KEY)))
    setHydrated(true)
  }, [])

  useEffect(() => {
    const read = () => setPref(parse(localStorage.getItem(STORAGE_KEY)))
    window.addEventListener("fiqh:preference-changed", read)
    window.addEventListener("storage", read)
    return () => {
      window.removeEventListener("fiqh:preference-changed", read)
      window.removeEventListener("storage", read)
    }
  }, [])

  const save = useCallback((next: Preference) => {
    setPref(next)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      window.dispatchEvent(new Event("fiqh:preference-changed"))
    } catch {
      // Storage can be unavailable (private mode, quota). The choice still
      // applies for this session; it simply will not survive a reload.
    }
  }, [])

  const clear = useCallback(() => {
    setPref(EMPTY)
    try {
      localStorage.removeItem(STORAGE_KEY)
      window.dispatchEvent(new Event("fiqh:preference-changed"))
    } catch {
      // ignore
    }
  }, [])

  return { pref, hydrated, save, clear }
}
