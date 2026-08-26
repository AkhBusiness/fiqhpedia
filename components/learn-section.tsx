"use client"

import { HelpCircle, Route } from "lucide-react"
import { FaqAccordion } from "@/components/faq-accordion"
import { ProcessSteps } from "@/components/process-steps"
import { faqs, guides, type Lang, ui } from "@/lib/fiqh-data"

interface LearnSectionProps {
  lang: Lang
}

export function LearnSection({ lang }: LearnSectionProps) {
  return (
    <section aria-label={ui.learnSection[lang]} className="flex flex-col gap-10">
      <div>
        <h2 className="text-xl font-bold text-foreground sm:text-2xl">{ui.learnSection[lang]}</h2>
        <p className="mt-0.5 text-pretty text-sm text-muted-foreground">{ui.learnSectionDesc[lang]}</p>
      </div>

      {/* Practical step-by-step guides */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <Route className="size-4 text-emerald-400" aria-hidden="true" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{ui.practicalGuides[lang]}</h3>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {guides.map((guide) => (
            <ProcessSteps key={guide.id} guide={guide} lang={lang} />
          ))}
        </div>
      </div>

      {/* FAQ / misconceptions */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <HelpCircle className="size-4 text-blue-400" aria-hidden="true" />
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">{ui.faqTitle[lang]}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{ui.faqSubtitle[lang]}</p>
          </div>
        </div>
        <FaqAccordion faqs={faqs} lang={lang} />
      </div>
    </section>
  )
}
