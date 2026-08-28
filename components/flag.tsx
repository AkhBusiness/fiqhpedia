"use client"

import { useState } from "react"

interface FlagProps {
  /** Two-letter country code, any case (e.g. "SA", "ru"). */
  code: string
  /** Rendered width in px. Height follows a 4:3 ratio. */
  size?: number
  className?: string
}

/**
 * Country flag as an SVG image rather than an emoji.
 *
 * Windows ships no font covering regional-indicator flag emoji, so 🇸🇦
 * renders as the bare letters "SA" there. These SVGs are served from
 * /public/flags and look identical on every platform.
 *
 * Falls back to the uppercase code in a neutral chip if the file is missing,
 * so an unmapped country degrades to something readable rather than a broken
 * image icon.
 */
export function Flag({ code, size = 24, className = "" }: FlagProps) {
  const [failed, setFailed] = useState(false)
  const lower = code.toLowerCase()
  const height = Math.round((size * 3) / 4)

  if (failed) {
    return (
      <span
        aria-hidden="true"
        style={{ width: size, height }}
        className={`inline-flex shrink-0 items-center justify-center rounded-[3px] border border-white/15 bg-white/10 text-[9px] font-bold tracking-tight text-muted-foreground ${className}`}
      >
        {code.toUpperCase()}
      </span>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/flags/${lower}.svg`}
      alt=""
      aria-hidden="true"
      width={size}
      height={height}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`inline-block shrink-0 rounded-[3px] border border-white/10 object-cover ${className}`}
      style={{ width: size, height }}
    />
  )
}
