"use client"

import Link from "next/link"
import { Bookmark, BookMarked, ChevronLeft, ChevronRight } from "lucide-react"
import { type Issue, type Lang, displayRef, isRecentlyAdded, isRecentlyRevised, rtlLangs, ui } from "@/lib/fiqh-data"
import { entryPath } from "@/lib/site"

interface IssueRowProps {
  issue: Issue
  lang: Lang
  bookmarked: boolean
  onToggleBookmark: (id: string) => void
}

/**
 * One line of the index: title, summary, chapter, and the way to the entry.
 *
 * The list used to draw the full card for every issue — four rulings each,
 * sixty-one cards on one page — so the page the site exists for was its
 * slowest. The index now says what each issue asks; the page for it says
 * what each school answers. One tap between them, and both load fast.
 */
export function IssueRow({ issue, lang, bookmarked, onToggleBookmark }: IssueRowProps) {
  const isRtl = rtlLangs.includes(lang)
  const Arrow = isRtl ? ChevronLeft : ChevronRight
  const fresh = isRecentlyAdded(issue.addedAt)
  const revised = isRecentlyRevised(issue.revisedAt, issue.addedAt)

  return (
    <li
      id={issue.ref}
      className="scroll-mt-40 flex items-stretch gap-2 rounded-2xl border border-white/10 bg-white/[0.02] transition-colors hover:border-white/20"
    >
      <Link
        href={entryPath(lang, issue.ref)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-white/20"
      >
        <span className="min-w-0 flex-1">
          <span className="mb-1.5 flex flex-wrap items-center gap-1.5">
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
            {fresh ? (
              <span className="rounded-md bg-emerald-500 px-2 py-0.5 text-[13px] font-bold text-white dark:text-emerald-950">
                {ui.newTag[lang]}
              </span>
            ) : revised ? (
              <span
                title={issue.revisionNote?.[lang] ?? ui.revisedTagTitle[lang]}
                className="rounded-md bg-amber-500 px-2 py-0.5 text-[13px] font-bold text-white dark:bg-amber-400 dark:text-amber-950"
              >
                {ui.revisedTag[lang]}
              </span>
            ) : null}
          </span>
          <span className="block text-balance text-base font-bold leading-snug text-foreground">
            {issue.title[lang]}
          </span>
          <span className="mt-1 line-clamp-2 block text-pretty text-sm leading-relaxed text-muted-foreground">
            {issue.summary[lang]}
          </span>
        </span>
        <Arrow className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
      <button
        type="button"
        onClick={() => onToggleBookmark(issue.id)}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? ui.bookmarked[lang] : ui.bookmark[lang]}
        title={bookmarked ? ui.bookmarked[lang] : ui.bookmark[lang]}
        className={`me-2 my-2 flex size-11 shrink-0 items-center justify-center self-center rounded-full border transition-colors ${
          bookmarked
            ? "border-primary/40 bg-primary/15 text-primary"
            : "border-white/10 bg-white/5 text-zinc-400 hover:text-foreground"
        }`}
      >
        {bookmarked ? (
          <BookMarked className="size-4.5" aria-hidden="true" />
        ) : (
          <Bookmark className="size-4.5" aria-hidden="true" />
        )}
      </button>
    </li>
  )
}
