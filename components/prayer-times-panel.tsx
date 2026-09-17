"use client"

import { useEffect, useState } from "react"
import { MapPin, Sun } from "lucide-react"
import { type Lang, ui } from "@/lib/fiqh-data"
import { minutesBetween, prayerTimes } from "@/lib/prayer-times"

interface PrayerTimesPanelProps {
  lang: Lang
  /** Which prayer this issue is about, so the panel shows that one. */
  prayer: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"
}

/**
 * The prayer's time today, where the reader is.
 *
 * This is not a prayer-time widget; those exist and are better. It sits inside
 * the timing issues to make one thing concrete that the text can only assert:
 * that the schools' rulings land at different moments on a real clock. A
 * reader of `F15` is told the Ḥanafīs reckon ʿaṣr by twice the shadow and the
 * other three by once — and then sees that in his own town, today, that is
 * an hour apart.
 *
 * It renders nothing until the reader asks and grants location. The site is a
 * static export and works fully without this; a panel that demanded a
 * permission on load would be trading the reader's position for a detail.
 */
export function PrayerTimesPanel({ lang, prayer }: PrayerTimesPanelProps) {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [state, setState] = useState<"idle" | "asking" | "denied">("idle")
  const [now, setNow] = useState<Date | null>(null)

  // The date is read after mount, never during render: the server prerenders
  // this page at build time, and a date fixed then would be stale by the time
  // anyone read it.
  useEffect(() => setNow(new Date()), [])

  function locate() {
    if (!("geolocation" in navigator)) return setState("denied")
    setState("asking")
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lon: p.coords.longitude })
        setState("idle")
      },
      () => setState("denied"),
      { timeout: 10_000 },
    )
  }

  if (!now) return null

  if (!coords) {
    return (
      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
        <div className="flex items-start gap-3">
          <Sun className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">{ui.timesTitle[lang]}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {ui.timesIntro[lang]}
            </p>
            <button
              type="button"
              onClick={locate}
              disabled={state === "asking"}
              className="mt-3 flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <MapPin className="size-3.5" aria-hidden="true" />
              {state === "asking" ? ui.timesLocating[lang] : ui.timesLocate[lang]}
            </button>
            {state === "denied" ? (
              <p className="mt-2 text-xs text-muted-foreground">{ui.timesDenied[lang]}</p>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  const t = prayerTimes({ latitude: coords.lat, longitude: coords.lon, date: now })
  const fmt = (d: Date | null) =>
    d
      ? d.toLocaleTimeString(lang === "ar" ? "ar-SA" : lang, {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      : "—"

  // ʿaṣr is the one prayer the schools time differently, so it is the one
  // shown as two rows rather than one.
  const rows: { label: string; time: Date | null; note?: string }[] =
    prayer === "asr"
      ? [
          { label: ui.timesAsrMajority[lang], time: t.asrMajority },
          { label: ui.timesAsrHanafi[lang], time: t.asrHanafi },
        ]
      : prayer === "fajr"
        ? [
            { label: ui.timesFajr[lang], time: t.fajr },
            { label: ui.timesSunrise[lang], time: t.sunrise, note: ui.timesFajrEnds[lang] },
          ]
        : prayer === "dhuhr"
          ? [
              { label: ui.timesDhuhr[lang], time: t.dhuhr },
              { label: ui.timesAsrMajority[lang], time: t.asrMajority, note: ui.timesDhuhrEnds[lang] },
            ]
          : prayer === "maghrib"
            ? [
                { label: ui.timesMaghrib[lang], time: t.maghrib },
                { label: ui.timesIsha[lang], time: t.isha, note: ui.timesMaghribEnds[lang] },
              ]
            : [{ label: ui.timesIsha[lang], time: t.isha }]

  const gap = prayer === "asr" ? minutesBetween(t.asrMajority, t.asrHanafi) : null

  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sun className="size-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-semibold text-foreground">{ui.timesToday[lang]}</span>
      </div>

      <dl className="flex flex-col gap-2">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline justify-between gap-3">
            <dt className="min-w-0 text-sm text-muted-foreground">
              {r.label}
              {r.note ? (
                <span className="ms-1.5 text-[11px] text-muted-foreground/70">{r.note}</span>
              ) : null}
            </dt>
            <dd className="shrink-0 font-mono text-base font-bold tabular-nums text-foreground">
              {fmt(r.time)}
            </dd>
          </div>
        ))}
      </dl>

      {gap !== null ? (
        <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-relaxed text-muted-foreground">
          {ui.timesAsrGap[lang].replace("{n}", String(gap))}
        </p>
      ) : null}

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground/70">
        {ui.timesDisclaimer[lang]}
      </p>
    </div>
  )
}
