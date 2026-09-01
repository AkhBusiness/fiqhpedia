"use client"

import { type Category, categories, chaptersOf, type Lang } from "@/lib/fiqh-data"

/** «كل الأبواب» — نصّ واجهة قصير، أبقيه هنا لا في fiqhData حتى لا يتضخّم. */
const ALL_CHAPTERS: Record<string, string> = {
  ar: "كل الأبواب",
  en: "All chapters",
  ru: "Все разделы",
  es: "Todos los capítulos",
}

interface CategoryTabsProps {
  lang: Lang
  activeId: string
  counts: Record<string, number>
  onSelect: (id: string) => void
  /** Chapter currently filtered to, or "" for the whole book. */
  activeChapter: string
  onSelectChapter: (key: string) => void
}

export function CategoryTabs({
  lang,
  activeId,
  counts,
  onSelect,
  activeChapter,
  onSelectChapter,
}: CategoryTabsProps) {
  // Chapters belong to the open book, so they are only worth showing once a
  // book is chosen — during a search or in Saved there is no single book.
  const chapters = activeId ? chaptersOf(activeId) : []
  return (
    <nav
      aria-label={lang === "ar" ? "أبواب الفقه" : lang === "ru" ? "Разделы фикха" : "Fiqh sections"}
      // الجوال: شريط أفقي لاصق تحت الترويسة.
      // الشاشة الكبيرة: عمود جانبي يملأ الفراغ الذي كان يضيع على الأطراف.
      className="sticky top-[134px] z-10 px-3 py-3 sm:px-4 lg:static lg:w-56 lg:shrink-0 lg:px-0 lg:py-0"
    >
      <div className="mx-auto max-w-6xl lg:max-w-none">
        <div className="inline-flex max-w-full rounded-full border border-white/10 bg-white/[0.04] p-1 shadow-lg shadow-black/30 backdrop-blur-md lg:sticky lg:top-[150px] lg:block lg:w-full lg:rounded-2xl lg:p-2 lg:shadow-none">
          <ul className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {categories.map((cat: Category) => {
              const active = cat.id === activeId
              const count = counts[cat.id] ?? 0
              return (
                <li key={cat.id} className="shrink-0 lg:w-full">
                  <button
                    type="button"
                    onClick={() => onSelect(cat.id)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm whitespace-nowrap transition-all duration-300 lg:w-full lg:justify-between lg:rounded-xl lg:px-3 lg:py-2 ${
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

        {activeId && chapters.length > 0 ? (
          <div className="mt-2 lg:mt-3">
            <ul className="flex gap-0.5 overflow-x-auto [scrollbar-width:none] lg:flex-col [&::-webkit-scrollbar]:hidden">
              <li className="shrink-0 lg:w-full">
                <button
                  type="button"
                  onClick={() => onSelectChapter("")}
                  aria-current={activeChapter === "" ? "true" : undefined}
                  className={`rounded-full px-3 py-1 text-xs whitespace-nowrap transition-colors lg:w-full lg:rounded-lg lg:px-3 lg:py-1.5 lg:text-start ${
                    activeChapter === ""
                      ? "font-semibold text-white"
                      : "font-medium text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {ALL_CHAPTERS[lang]}
                  <span className="ms-1.5 text-[10px] tabular-nums text-zinc-600">
                    {chapters.reduce((n, c) => n + c.count, 0)}
                  </span>
                </button>
              </li>
              {chapters.map((ch) => {
                const on = ch.key === activeChapter
                return (
                  <li key={ch.key} className="shrink-0 lg:w-full">
                    <button
                      type="button"
                      onClick={() => onSelectChapter(on ? "" : ch.key)}
                      aria-current={on ? "true" : undefined}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs whitespace-nowrap transition-colors lg:w-full lg:justify-between lg:rounded-lg lg:px-3 lg:py-1.5 ${
                        on
                          ? "bg-white/15 font-semibold text-white"
                          : "font-medium text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <span className="lg:truncate">{ch.name[lang]}</span>
                      <span className="text-[10px] tabular-nums text-zinc-600">{ch.count}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        ) : null}
      </div>
    </nav>
  )
}
