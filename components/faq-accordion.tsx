"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { GlossaryText } from "@/components/glossary-tooltip"
import { type Faq, type Lang } from "@/lib/fiqh-data"

interface FaqAccordionProps {
  faqs: Faq[]
  lang: Lang
}

export function FaqAccordion({ faqs, lang }: FaqAccordionProps) {
  const [openId, setOpenId] = useState<string | null>(faqs[0]?.id ?? null)

  return (
    <div className="flex flex-col gap-3">
      {faqs.map((faq) => {
        const open = openId === faq.id
        const panelId = `faq-panel-${faq.id}`
        const btnId = `faq-btn-${faq.id}`
        return (
          <div
            key={faq.id}
            className={`overflow-hidden rounded-2xl border bg-card backdrop-blur-md transition-colors duration-200 ${
              open ? "border-white/25" : "border-white/10"
            }`}
          >
            <h3>
              <button
                id={btnId}
                type="button"
                onClick={() => setOpenId(open ? null : faq.id)}
                aria-expanded={open}
                aria-controls={panelId}
                className="flex w-full items-center gap-3 p-4 text-start sm:p-5"
              >
                <span className="min-w-0 flex-1">
                  <span className="mb-1.5 inline-flex rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {faq.category[lang]}
                  </span>
                  <span className="block text-balance text-sm font-bold leading-snug text-foreground sm:text-base">
                    {faq.question[lang]}
                  </span>
                </span>
                <ChevronDown
                  className={`size-5 shrink-0 text-muted-foreground transition-transform duration-300 ${
                    open ? "rotate-180" : ""
                  }`}
                  aria-hidden="true"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={btnId}
              className={`grid transition-all duration-300 ease-out ${
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-pretty px-4 pb-4 text-sm leading-relaxed text-muted-foreground sm:px-5 sm:pb-5">
                  <GlossaryText text={faq.answer[lang]} lang={lang} />
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
