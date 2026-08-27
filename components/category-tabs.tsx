"use client"

import { type Category, categories, type Lang } from "@/lib/fiqh-data"

interface CategoryTabsProps {
  lang: Lang
  activeId: string
  counts: Record<string, number>
  onSelect: (id: string) => void
}

export function CategoryTabs({ lang, activeId, counts, onSelect }: CategoryTabsProps) {
  return (
    <nav
      aria-label={lang === "ar" ? "أبواب الفقه" : lang === "ru" ? "Разделы фикха" : "Fiqh sections"}
      className="sticky top-[122px] z-10 px-3 py-3 sm:px-4"
    >
      <div className="mx-auto max-w-6xl">
        <div className="inline-flex max-w-full rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-lg shadow-black/30 backdrop-blur-md">
          <ul className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((cat: Category) => {
              const active = cat.id === activeId
              const count = counts[cat.id] ?? 0
              return (
                <li key={cat.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelect(cat.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition-all duration-300 ${
                      active
                        ? "bg-white font-semibold text-black shadow-[0_1px_3px_rgba(0,0,0,0.3)]"
                        : "font-medium text-zinc-400 hover:text-white"
                    }`}
                  >
                    <span>{cat.name[lang]}</span>
                    {count > 0 && (
                      <span
                        className={`text-[11px] font-semibold tabular-nums ${
                          active ? "text-black/50" : "text-zinc-500"
                        }`}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </nav>
  )
}
