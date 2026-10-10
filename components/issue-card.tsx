"use client"

import { reportHref } from "@/lib/report"
import { useEffect, useRef, useState } from "react"
import { BookMarked, Bookmark, Check, Copy, Lightbulb, MessageSquareWarning, Pause, Share2, Volume2 } from "lucide-react"
import { GradeBadge } from "@/components/grade-badge"
import dynamic from "next/dynamic"
import Link from "next/link"
import { sourceAnchor } from "@/lib/site"
import { GlossaryText } from "@/components/glossary-tooltip"
import {
  categories,
  type FullIssue,
  type Issue,
  type Lang,
  type SchoolKey,
  schools,
  ui, displayRef, isRecentlyAdded, isRecentlyRevised } from "@/lib/fiqh-data"

/* Five issues carry a clock; the other hundred and fifteen should not carry
   the astronomy that drives it. */
const PrayerTimesPanel = dynamic(() => import("@/components/prayer-times-panel").then((m) => m.PrayerTimesPanel))

export type ViewMode = "academic" | "simplified"

interface IssueCardProps {
  issue: FullIssue
  lang: Lang
  /** Which schools to display; defaults to all four */
  visibleSchools?: SchoolKey[]
  /** "grid" = responsive columns (default); "split" = side-by-side dual columns with sticky headers */
  layout?: "grid" | "split"
  /** "academic" = full citations + terminology; "simplified" = plain takeaway */
  viewMode?: ViewMode
  bookmarked: boolean
  onToggleBookmark: (id: string) => void
  onShare?: (issue: FullIssue) => void
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
    "inline-flex min-h-11 items-center justify-center gap-1 rounded-full border border-white/10 bg-white/5 px-1.5 text-[13px] font-semibold text-muted-foreground sm:gap-1.5 sm:px-3.5 transition-all duration-200 hover:border-white/25 hover:text-foreground"

  return (
    <article
      id={issue.ref}
      className="scroll-mt-40 overflow-hidden rounded-2xl border border-white/10 bg-card backdrop-blur-md"
    >
      <div className="border-b border-white/10 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 font-mono text-[13px] font-bold text-muted-foreground"
            title={ui.refHint[lang]}
          >
            {displayRef(issue.ref, lang)}
          </span>
          {issue.chapter ? (
            <span className="rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[13px] font-semibold text-foreground/80">
              {issue.chapter[lang]}
            </span>
          ) : null}
          {isRecentlyAdded(issue.addedAt) ? (
            <span
              title={ui.newTagTitle[lang]}
              /* Solid green, not an outline: the grade badges are all
                 outlined chips, and farḍ is green among them — an outlined
                 green "new" sat beside an outlined green "farḍ" and read
                 as another grade. Filling it makes it a different kind of
                 thing at a glance. */
              className="rounded-md bg-emerald-500 px-2 py-0.5 text-[13px] font-bold text-white shadow-sm dark:bg-emerald-500 dark:text-emerald-950"
            >
              {ui.newTag[lang]}
            </span>
          ) : null}
          {isRecentlyRevised(issue.revisedAt, issue.addedAt) ? (
            <span
              /* The note, not the generic string, is the point: "revised" on
                 a ruling is read as the ruling having changed, and most
                 revisions are wording. Amber and filled — filled to sit in
                 the same family as the green "new" rather than among the
                 outlined grade chips, amber to not be mistaken for it. */
              title={issue.revisionNote?.[lang] ?? ui.revisedTagTitle[lang]}
              className="rounded-md bg-amber-500 px-2 py-0.5 text-[13px] font-bold text-white shadow-sm dark:bg-amber-400 dark:text-amber-950"
            >
              {ui.revisedTag[lang]}
            </span>
          ) : null}
        </div>

        {/* The title takes the whole width. It used to share its row with
            four round buttons, which on a phone left it a third of the
            screen and three lines tall. */}
        <h2 className="mt-2 text-balance text-xl font-bold leading-snug text-foreground sm:text-2xl">
          {issue.title[lang]}
        </h2>
        {!simplified ? (
          <p className="mt-2 text-pretty text-[15px] leading-[1.6] text-muted-foreground">
            <GlossaryText text={issue.summary[lang]} lang={lang} />
          </p>
        ) : null}

        {/* Labelled, not icon-only: a reader should not have to guess what
            a speaker glyph does to a fiqh ruling. */}
        <div className="mt-4 grid grid-cols-2 gap-1.5 min-[480px]:grid-cols-4 sm:flex sm:flex-wrap sm:gap-2">
          <button type="button" onClick={handleCopy} aria-live="polite" className={actionBtn}>
            {copied ? (
              <Check className="size-4 text-emerald-400" aria-hidden="true" />
            ) : (
              <Copy className="size-4" aria-hidden="true" />
            )}
            {copied ? ui.copied[lang] : ui.copyShort[lang]}
          </button>
          <button type="button" onClick={handleListen} className={actionBtn}>
            {speaking ? (
              <Pause className="size-4 text-cyan-400" aria-hidden="true" />
            ) : (
              <Volume2 className="size-4" aria-hidden="true" />
            )}
            {speaking ? ui.stopListen[lang] : ui.listen[lang]}
          </button>
          {onShare ? (
            <button type="button" onClick={() => onShare(issue)} className={actionBtn}>
              <Share2 className="size-4" aria-hidden="true" />
              {ui.share[lang]}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onToggleBookmark(issue.id)}
            aria-pressed={bookmarked}
            className={`inline-flex min-h-11 items-center justify-center gap-1 rounded-full border px-1.5 text-[13px] font-semibold transition-all duration-200 sm:gap-1.5 sm:px-3.5 ${
              bookmarked
                ? "border-amber-500/40 bg-amber-500/15 text-amber-500"
                : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/25 hover:text-foreground"
            }`}
          >
            <Bookmark className={`size-4 ${bookmarked ? "fill-current" : ""}`} aria-hidden="true" />
            {bookmarked ? ui.bookmarked[lang] : ui.bookmark[lang]}
          </button>
        </div>
      </div>

      {/* Essential takeaway banner (simplified mode) */}
      {simplified ? (
        <div className="border-b border-white/10 px-4 py-3 sm:px-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] p-3">
            <Lightbulb className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden="true" />
            <div className="min-w-0">
              <span className="block text-[13px] font-bold text-amber-400/90">
                {ui.essentialTakeaway[lang]}
              </span>
              <p className="mt-0.5 text-pretty text-[15px] leading-[1.6] text-foreground/90">
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
              className={`flex flex-col rounded-xl border ${school.color.border} bg-white/[0.02] p-3.5 transition-all duration-300 ${school.color.ring} ${school.color.glow}`}
            >
              {/* Sticky column header (synchronized across split columns) */}
              <div
                className={`mb-3 flex items-center gap-2 ${
                  isSplit
                    ? "sticky top-[118px] z-10 -mx-3.5 -mt-3.5 rounded-t-xl bg-popover/90 px-3.5 py-2.5 backdrop-blur-md"
                    : ""
                }`}
              >
                <span className={`size-2.5 rounded-full ${school.color.dot}`} aria-hidden="true" />
                <span
                  className={`rounded-md px-2 py-0.5 text-[13px] font-bold ${school.color.badgeBg} ${school.color.badgeText}`}
                >
                  {school.name[lang]}
                </span>
                {/* The grade sits beside the school name, not in the body, so
                    it reads as a property of this school's answer. Absent on
                    questions that carry no grade. */}
                <GradeBadge grade={r.grade} nature={r.nature} school={school.key} issue={issue} lang={lang} />
              </div>

              <p className="flex-1 text-pretty text-base leading-[1.6] text-foreground/90">
                <GlossaryText text={r.ruling[lang]} lang={lang} />
              </p>

              {/* Classical citation — academic mode only */}
              {!simplified && r.references.length > 0 ? (
                <div className="mt-3 flex items-start gap-1.5 border-t border-white/10 pt-2.5">
                  <BookMarked className={`mt-0.5 size-3.5 shrink-0 ${school.color.text}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <span className="text-[13px] leading-normal text-muted-foreground">
                      <span className="font-semibold">{ui.reference[lang]}: </span>
                      {r.references.map((ref, n) => (
                        <span key={n}>
                          {n > 0 ? " — " : null}
                          <Link
                            href={`/${lang}/sources#${sourceAnchor(ref.ar)}`}
                            title={ui.sourceLinkTitle[lang]}
                            className="underline decoration-white/20 decoration-dotted underline-offset-4 hover:text-foreground hover:decoration-current"
                          >
                            {ref[lang]}
                          </Link>
                        </span>
                      ))}
                    </span>
                  </div>
                </div>
              ) : null}
            </div>
          )
        })}
      </div>

      {/* The timing issues carry a live clock: the rulings above say the
          schools reckon ʿaṣr differently, and this shows how far apart that
          falls today, where the reader is. */}
      {TIMED_ISSUES[issue.ref] ? (
        <PrayerTimesPanel lang={lang} prayer={TIMED_ISSUES[issue.ref]} />
      ) : null}

      {/* At the foot of the card, not among the header icons: that row
          already squeezes the title into a sliver on a phone, and reporting
          is something a reader reaches for after reading, not before. */}
      <ReportLink issue={issue} lang={lang} />
    </article>
  )
}

/**
 * Issues about when a prayer's time begins and ends, and which prayer each
 * concerns. Keyed by ref rather than detected from the text: a ref is stable
 * and reviewed, and a keyword match would eventually attach a clock to a
 * ruling that merely mentions the ʿaṣr in passing.
 */
const TIMED_ISSUES: Record<string, "fajr" | "dhuhr" | "asr" | "maghrib" | "isha"> = {
  F40: "fajr",
  F41: "dhuhr",
  F15: "asr",
  F42: "maghrib",
  F43: "isha",
}

/**
 * Rendered only after mount: the link carries the page's own address, which
 * the static HTML does not know, and a link that changes on hydration would
 * flash or mismatch. Absent entirely when no destination is configured.
 */
function ReportLink({ issue, lang }: { issue: FullIssue; lang: Lang }) {
  const [href, setHref] = useState<string | null>(null)
  useEffect(() => setHref(reportHref(issue, lang)), [issue, lang])
  if (!href) return null
  return (
    <div className="mt-4 flex justify-end border-t border-white/5 pt-3">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 min-h-11 rounded-lg px-2.5 text-[13px] text-zinc-500 transition-colors hover:bg-white/5 hover:text-foreground"
      >
        <MessageSquareWarning className="size-3.5" aria-hidden="true" />
        {ui.reportError[lang]}
      </a>
    </div>
  )
}
