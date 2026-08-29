"use client"

import { useEffect, useRef, useState } from "react"
import { Bookmark, BookMarked, Check, Copy, Lightbulb, Pause, Share2, Volume2 } from "lucide-react"
import { GlossaryText } from "@/components/glossary-tooltip"
import {
  categories,
  type Issue,
  type Lang,
  type SchoolKey,
  schools,
  ui, displayRef } from "@/lib/fiqh-data"

export type ViewMode = "academic" | "simplified"

interface IssueCardProps {
  issue: Issue
  lang: Lang
  /** Which schools to display; defaults to all four */
  visibleSchools?: SchoolKey[]
  /** "grid" = responsive columns (default); "split" = side-by-side dual columns with sticky headers */
  layout?: "grid" | "split"
  /** "academic" = full citations + terminology; "simplified" = plain takeaway */
  viewMode?: ViewMode
  bookmarked: boolean
  onToggleBookmark: (id: string) => void
  onShare?: (issue: Issue) => void
}

export function IssueCard({
  issue,
  lang,
  visibleSchools,
  layout = "grid",
  viewMode = "academic",
  bookmarked,
  onToggleBookmark,
  onShare,
}: IssueCardProps) {
  const shownSchools = visibleSchools ? schools.filter((s) => visibleSchools.includes(s.key)) : schools
  const simplified = viewMode === "simplified"

  const [copied, setCopied] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current)
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel()
    }
  }, [])

  const bookName = categories.find((c) => c.id === issue.categoryId)?.name[lang] ?? ""

  /** Build a formatted, exportable citation for all shown schools. */
  function buildCitation(): string {
    const header = `${issue.title[lang]}\n${bookName}${issue.chapter ? " — " + issue.chapter[lang] : ""}\n`
    const body = shownSchools
      .map((s) => {
        const r = issue.rulings[s.key]
        return simplified
          ? `• ${s.name[lang]}: ${r.ruling[lang]}`
          : `• ${s.name[lang]}: ${r.ruling[lang]}\n  (${ui.reference[lang]}: ${r.references.map((ref) => ref[lang]).join(" — ")})`
      })
      .join("\n")
    return `${header}\n${body}`
  }

  async function handleCopy() {
    const text = buildCitation()
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement("textarea")
      ta.value = text
      ta.style.position = "fixed"
      ta.style.opacity = "0"
      document.body.appendChild(ta)
      ta.select()
      try {
        document.execCommand("copy")
      } catch {
        /* noop */
      }
      document.body.removeChild(ta)
    }
    setCopied(true)
    if (copyTimer.current) clearTimeout(copyTimer.current)
    copyTimer.current = setTimeout(() => setCopied(false), 1800)
  }

  function handleListen() {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return
    const synth = window.speechSynthesis
    if (speaking) {
      synth.cancel()
      setSpeaking(false)
      return
    }
    synth.cancel()
    const text = shownSchools.map((s) => `${s.name[lang]}. ${issue.rulings[s.key].ruling[lang]}`).join(". ")
    const utter = new SpeechSynthesisUtterance(`${issue.title[lang]}. ${text}`)
    utter.lang = lang === "ar" ? "ar-SA" : lang === "ru" ? "ru-RU" : "en-US"
    utter.onend = () => setSpeaking(false)
    utter.onerror = () => setSpeaking(false)
    setSpeaking(true)
    synth.speak(utter)
  }

  const isSplit = layout === "split" && shownSchools.length === 2
  const gridCols = isSplit
    ? "grid-cols-2"
    : shownSchools.length === 1
      ? "grid-cols-1"
      : shownSchools.length === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"

  const actionBtn =
    "flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground transition-all duration-200 hover:border-white/25 hover:text-foreground"

  return (
    <article
      id={issue.ref}
      className="scroll-mt-40 overflow-hidden rounded-2xl border border-white/10 bg-card backdrop-blur-md"
    >
      <div className="flex items-start gap-3 border-b border-white/10 p-4 sm:p-5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-sm font-bold text-foreground">
          {issue.number}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {ui.issue[lang]} {issue.number}
            </span>
            <span
              className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground"
              title={ui.refHint[lang]}
            >
              {displayRef(issue.ref, lang)}
            </span>
            {issue.chapter ? (
              <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-foreground/80">
                {issue.chapter[lang]}
              </span>
            ) : null}
          </div>
          <h3 className="mt-1 text-balance text-base font-bold leading-snug text-foreground sm:text-lg">
            {issue.title[lang]}
          </h3>
          {!simplified ? (
            <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">
              <GlossaryText text={issue.summary[lang]} lang={lang} />
            </p>
          ) : null}
        </div>

        {/* Utility actions */}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            aria-label={copied ? ui.copied[lang] : ui.copyCitation[lang]}
            title={copied ? ui.copied[lang] : ui.copyCitation[lang]}
            className={actionBtn}
          >
            {copied ? (
              <Check className="size-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
          </button>
          {onShare ? (
            <button
              type="button"
              onClick={() => onShare(issue)}
              aria-label={ui.share[lang]}
              title={ui.share[lang]}
              className={actionBtn}
            >
              <Share2 className="size-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={handleListen}
            aria-label={speaking ? ui.stopListen[lang] : ui.listen[lang]}
            title={speaking ? ui.stopListen[lang] : ui.listen[lang]}
            className={actionBtn}
          >
            {speaking ? (
              <Pause className="size-4 text-cyan-400" aria-hidden="true" />
            ) : (
              <Volume2 className="size-4" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onToggleBookmark(issue.id)}
            aria-pressed={bookmarked}
            aria-label={bookmarked ? ui.bookmarked[lang] : ui.bookmark[lang]}
            title={bookmarked ? ui.bookmarked[lang] : ui.bookmark[lang]}
            className={`flex size-9 items-center justify-center rounded-full border transition-all duration-200 ${
              bookmarked
                ? "border-amber-500/40 bg-amber-500/15 text-amber-400"
                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-foreground"
            }`}
          >
            <Bookmark className={`size-4 ${bookmarked ? "fill-current" : ""}`} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Essential takeaway banner (simplified mode) */}
      {simplified ? (
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="min-w-0">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-amber-400/90">
                {ui.essentialTakeaway[lang]}
              </span>
              <p className="mt-0.5 text-pretty text-sm leading-relaxed text-foreground/90">
                <GlossaryText text={issue.summary[lang]} lang={lang} />
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className={`grid gap-3 p-4 sm:p-5 ${gridCols}`}>
        {shownSchools.map((school) => {
          const r = issue.rulings[school.key]
          return (
            <div
              key={school.key}
              className={`flex flex-col rounded-xl border ${school.color.border} bg-white/[0.02] p-4 backdrop-blur-sm transition-all duration-300 ${school.color.ring} ${school.color.glow}`}
            >
              {/* Sticky column header (synchronized across split columns) */}
              <div
                className={`mb-3 flex items-center gap-2 ${
                  isSplit
                    ? "sticky top-[118px] z-10 -mx-4 -mt-4 rounded-t-xl bg-zinc-950/80 px-4 py-2.5 backdrop-blur-md"
                    : ""
                }`}
              >
                <span className={`size-2.5 rounded-full ${school.color.dot}`} aria-hidden="true" />
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-bold ${school.color.badgeBg} ${school.color.badgeText}`}
                >
                  {school.name[lang]}
                </span>
              </div>

              <p className="flex-1 text-pretty text-sm leading-relaxed text-foreground/90">
                <GlossaryText text={r.ruling[lang]} lang={lang} />
              </p>

              {/* Classical citation — academic mode only */}
              {!simplified && r.references.length > 0 ? (
                <div className="mt-3 flex items-start gap-1.5 border-t border-white/10 pt-3">
                  <BookMarked className={`mt-0.5 size-3.5 shrink-0 ${school.color.text}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {ui.reference[lang]}
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {r.references.map((ref) => ref[lang]).join(" — ")}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </article>
  )
}
