"use client"

import { BookOpen, ChevronLeft, ChevronRight, GraduationCap, Sparkles } from "lucide-react"
import { Modal } from "@/components/modal"
import { type Lang, rtlLangs, ui } from "@/lib/fiqh-data"

export type Section = "home" | "fiqh" | "aqidah" | "articles" | "learn"

interface NavModalProps {
  open: boolean
  onClose: () => void
  lang: Lang
  active: Section
  onSelect: (section: Section) => void
}

export function NavModal({ open, onClose, lang, active, onSelect }: NavModalProps) {
  const isRtl = rtlLangs.includes(lang)
  const Chevron = isRtl ? ChevronLeft : ChevronRight

  const items: { key: Section; icon: typeof BookOpen; title: string; desc: string }[] = [
    { key: "fiqh", icon: BookOpen, title: ui.fiqhSection[lang], desc: ui.fiqhSectionDesc[lang] },
    { key: "aqidah", icon: Sparkles, title: ui.aqidahSection[lang], desc: ui.aqidahSectionDesc[lang] },
    { key: "learn", icon: GraduationCap, title: ui.learnSection[lang], desc: ui.learnSectionDesc[lang] },
  ]

  return (
    <Modal open={open} onClose={onClose} title={ui.sections[lang]} closeLabel={ui.close[lang]} size="max-w-md">
      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const isActive = item.key === active
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onSelect(item.key)
                onClose()
              }}
              aria-current={isActive ? "page" : undefined}
              className={`group flex items-center gap-4 rounded-2xl border p-4 text-start transition-all duration-200 ${
                isActive
                  ? "border-white/25 bg-white/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.06]"
              }`}
            >
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/10 ${
                  isActive ? "bg-white text-black" : "bg-white/5 text-foreground"
                }`}
              >
                <Icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">{item.title}</span>
                <span className="mt-0.5 block text-pretty text-xs leading-relaxed text-muted-foreground">
                  {item.desc}
                </span>
              </span>
              <Chevron
                className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5"
                aria-hidden="true"
              />
            </button>
          )
        })}
      </div>
    </Modal>
  )
}
