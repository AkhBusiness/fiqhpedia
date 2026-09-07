"use client"

import { BookOpen, FileText, GraduationCap, MapPin, Sparkles } from "lucide-react"
import type { Section } from "@/components/nav-modal"
import { isRecentlyAdded, type Lang, recentlyAdded, ui } from "@/lib/fiqh-data"

interface HomeSectionProps {
  lang: Lang
  onGo: (section: Section) => void
  /** Jump to a particular issue in the fiqh tab. */
  onOpenIssue?: (id: string) => void
}

/**
 * Landing view.
 *
 * Organised by what the visitor came for, not by what the site contains: a
 * newcomer cannot tell "الفقه" from "العقيدة" by name, so the section labels
 * alone left people guessing. Each card states an intent in the first person
 * and sends them where it is answered.
 */
export function HomeSection({ lang, onGo, onOpenIssue }: HomeSectionProps) {
  // Proof that the work is ongoing, shown as the work itself rather than as
  // a claim about it. Ten is enough to show movement without becoming a
  // second index of the site.
  const recent = recentlyAdded(10)

  const intents: {
    key: Section
    icon: typeof BookOpen
    label: string
    desc: string
  }[] = [
    {
      key: "learn",
      icon: GraduationCap,
      label: ui.homeIntentLearn[lang],
      desc: ui.homeIntentLearnDesc[lang],
    },
    {
      key: "aqidah",
      icon: Sparkles,
      label: ui.homeIntentAqidah[lang],
      desc: ui.homeIntentAqidahDesc[lang],
    },
    {
      key: "fiqh",
      icon: BookOpen,
      label: ui.homeIntentFiqh[lang],
      desc: ui.homeIntentFiqhDesc[lang],
    },
    {
      key: "articles",
      icon: FileText,
      label: ui.homeIntentArticles[lang],
      desc: ui.homeIntentArticlesDesc[lang],
    },
  ]

  return (
    <div className="flex flex-col gap-10">
      <section className="pt-2">
        <h1 className="text-balance text-2xl font-bold leading-tight text-foreground sm:text-3xl">
          {ui.appTitle[lang]}
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
          {ui.homeLede[lang]}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-bold text-foreground sm:text-xl">{ui.homeWhereTitle[lang]}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{ui.homeWhereDesc[lang]}</p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {intents.map((intent) => {
            const Icon = intent.icon
            return (
              <button
                key={intent.key}
                type="button"
                onClick={() => onGo(intent.key)}
                className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-start backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-white/[0.07]"
              >
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-muted-foreground transition-colors group-hover:text-foreground">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="text-pretty text-sm font-semibold text-foreground">{intent.label}</span>
                  <span className="text-pretty text-xs leading-relaxed text-muted-foreground">{intent.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-sm font-bold text-foreground">{ui.homeWhyCountryTitle[lang]}</h2>
          </div>
          <p className="mt-2 text-pretty text-xs leading-relaxed text-muted-foreground">
            {ui.homeWhyCountryBody[lang]}
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
          <h2 className="text-sm font-bold text-foreground">{ui.homeNotTitle[lang]}</h2>
          <p className="mt-2 text-pretty text-xs leading-relaxed text-muted-foreground">{ui.homeNotBody[lang]}</p>
        </div>
      </section>

      {recent.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-lg font-bold text-foreground sm:text-xl">{ui.recentTitle[lang]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{ui.recentDesc[lang]}</p>
          <ul className="mt-4 flex flex-col gap-1">
            {recent.map((i) => (
              <li key={i.id}>
                <button
                  type="button"
                  onClick={() => (onOpenIssue ? onOpenIssue(i.id) : onGo("fiqh"))}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5 text-start transition-colors hover:bg-white/[0.06]"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {i.title[lang]}
                  </span>
                  {isRecentlyAdded(i.addedAt) ? (
                    <span className="shrink-0 rounded-md bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white dark:text-emerald-950">
                      {ui.newTag[lang]}
                    </span>
                  ) : null}
                  {i.chapter ? (
                    <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                      {i.chapter[lang]}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
