"use client"

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import qrcode from "qrcode-generator"
import {
  categories,
  displayRef,
  type FullIssue,
  type GlossaryTerm,
  gradeLabels,
  type Lang,
  natureLabels,
  rtlLangs,
  type SchoolKey,
  schools,
  ui,
} from "@/lib/fiqh-data"
import { editionOf, planBooks } from "@/lib/edition"
import { entryUrl, SITE_URL } from "@/lib/site"

/* ------------------------------------------------------------------ */
/* A book typeset in the browser.                                       */
/*                                                                      */
/* The book is rendered as plain HTML into a hidden source node, then   */
/* handed to Paged.js, which flows it into A4 pages with running heads, */
/* page numbers and a contents list whose page numbers it resolves      */
/* itself (target-counter). The reader saves it from the print dialog.  */
/* Nothing here is cached on the server: every combination of books,    */
/* schools and language is built on demand from the same data the site  */
/* shows, so a printed book is never older than the site.               */
/* ------------------------------------------------------------------ */

interface SourceBook {
  ar: string
  en: string
  ru: string
  es: string
  uk: string
  school: SchoolKey
}

interface AboutBlock {
  id: string
  heading: Record<Lang, string>
  body: Record<Lang, string>
}

interface Loaded {
  issues: FullIssue[]
  glossary: GlossaryTerm[]
  sources: SourceBook[]
  about: AboutBlock[]
}

const SCHOOL_HEX: Record<SchoolKey, string> = {
  hanafi: "#a16207",
  maliki: "#047857",
  shafii: "#1d4ed8",
  hanbali: "#0e7490",
}

const LOCALE: Record<Lang, string> = {
  ar: "ar-SA-u-ca-gregory-nu-latn",
  en: "en-GB",
  ru: "ru-RU",
  es: "es-ES",
  uk: "uk-UA",
}

function fmtDate(iso: string, lang: Lang): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat(LOCALE[lang], { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(d)
}

/** Blank lines split paragraphs; **text** goes bold. */
function paras(text: string): ReactNode {
  return text.split("\n\n").map((p, i) => (
    <p key={i}>
      {p.split(/(\*\*[^*]+\*\*)/g).map((c, j) =>
        c.startsWith("**") && c.endsWith("**") ? <strong key={j}>{c.slice(2, -2)}</strong> : c,
      )}
    </p>
  ))
}

function qrSvg(url: string): string {
  const q = qrcode(0, "M")
  q.addData(url)
  q.make()
  return q.createSvgTag({ cellSize: 2, margin: 0, scalable: true })
}

/** Folding for matching a glossary term inside the rulings. */
function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[آأإٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .toLowerCase()
}

function readSelection(): { books: string[]; schools: SchoolKey[] } {
  const q = new URLSearchParams(window.location.search)
  const validBooks = new Set(categories.map((c) => c.id))
  const validSchools = new Set(schools.map((s) => s.key))
  const books = (q.get("books") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((b) => validBooks.has(b))
  const picked = (q.get("schools") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is SchoolKey => validSchools.has(s as SchoolKey))
  // Keep the canonical school order whatever order the link gave.
  const order = schools.map((s) => s.key)
  return {
    books: categories.map((c) => c.id).filter((id) => books.includes(id)),
    schools: picked.length ? order.filter((k) => picked.includes(k)) : order,
  }
}

export function PrintView({ lang }: { lang: Lang }) {
  const [sel, setSel] = useState<{ books: string[]; schools: SchoolKey[] } | null>(null)
  const [data, setData] = useState<Loaded | null>(null)
  const [pages, setPages] = useState<number | null>(null)
  const [failed, setFailed] = useState(false)
  // The source is dropped from the DOM once copied: its ids would otherwise
  // sit beside the paginated copies, and a contents link could resolve to
  // the hidden original instead of the page it lands on.
  const [copied, setCopied] = useState(false)
  const sourceRef = useRef<HTMLDivElement>(null)
  const targetRef = useRef<HTMLDivElement>(null)
  const started = useRef(false)
  const isRtl = rtlLangs.includes(lang)

  useEffect(() => setSel(readSelection()), [])

  // Paper is white. The site's dark theme would otherwise follow the
  // reader into the print preview.
  useEffect(() => {
    const root = document.documentElement
    const wasDark = root.classList.contains("dark")
    root.classList.remove("dark")
    root.classList.add("light")
    return () => {
      root.classList.remove("light")
      if (wasDark) root.classList.add("dark")
    }
  }, [])

  useEffect(() => {
    if (!sel) return
    let alive = true
    Promise.all([
      import("@/lib/fiqh-full"),
      import("@/lib/glossary-data"),
      import("@/data/sources.json"),
      import("@/data/pages.json"),
    ])
      .then(([full, gl, src, pg]) => {
        if (!alive) return
        setData({
          issues: full.fullIssues,
          glossary: gl.glossary,
          sources: (src.default as { books: SourceBook[] }).books,
          about: (pg.default as { about: AboutBlock[] }).about,
        })
      })
      .catch((e) => {
        console.error("print: data", e)
        if (alive) setFailed(true)
      })
    return () => {
      alive = false
    }
  }, [sel])

  const book = useMemo(() => (sel && data ? assemble(sel, data, lang) : null), [sel, data, lang])

  // Once the source is in the DOM, paginate it.
  useEffect(() => {
    if (!book || !book.hasContent || started.current) return
    started.current = true
    ;(async () => {
      try {
        // Measure with the real face, or every line break moves after
        // the font arrives and the page numbers in the contents lie.
        if (isRtl) {
          const faces = [
            new FontFace("Amiri", "url(/fonts/Amiri-Regular.woff2)", { weight: "400" }),
            new FontFace("Amiri", "url(/fonts/Amiri-Bold.woff2)", { weight: "700" }),
          ]
          await Promise.all(faces.map((f) => f.load().then(() => document.fonts.add(f))))
        }
        await document.fonts.ready
        const { Previewer } = await loadPaged()
        const tpl = document.createElement("template")
        tpl.innerHTML = sourceRef.current?.innerHTML ?? ""
        flushSync(() => setCopied(true))
        const flow = await new Previewer().preview(
          tpl.content,
          [{ [window.location.href]: bookCss(lang, book.footer) }],
          targetRef.current ?? undefined,
        )
        setPages(flow.total)
        fitToScreen()
        window.addEventListener("resize", fitToScreen)
      } catch (e) {
        console.error("print: paginate", e)
        setFailed(true)
      }
    })()
  }, [book, isRtl, lang])

  // A4 is 794 CSS pixels wide; on a phone, scale the preview to the screen.
  // Print ignores this (globals.css resets zoom under @media print).
  function fitToScreen() {
    const el = targetRef.current
    if (!el) return
    const z = Math.min(1, (window.innerWidth - 16) / 820)
    el.style.zoom = String(z)
  }
  useEffect(() => () => window.removeEventListener("resize", fitToScreen), [])

  const ready = pages !== null

  return (
    <div className="print-root min-h-dvh bg-neutral-200 text-neutral-900">
      {/* Toolbar: screen only. */}
      <div className="print-toolbar sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b border-neutral-300 bg-white/95 px-4 py-3 backdrop-blur">
        <Link
          href={sel?.books[0] ? `/${lang}/fiqh/${sel.books[0]}` : `/${lang}/fiqh`}
          className="inline-flex min-h-11 items-center rounded-full border border-neutral-300 px-4 text-sm font-semibold text-neutral-800 hover:bg-neutral-100"
        >
          {ui.printBack[lang]}
        </Link>
        <span className="text-sm text-neutral-700" aria-live="polite">
          {failed
            ? ui.printNoContent[lang]
            : book && !book.hasContent
              ? ui.printNoContent[lang]
              : ready
                ? ui.printPagesReady[lang].replace("{n}", String(pages))
                : ui.printPreparing[lang]}
        </span>
        <button
          type="button"
          disabled={!ready}
          onClick={() => window.print()}
          className="ms-auto inline-flex min-h-11 items-center rounded-full bg-neutral-900 px-5 text-sm font-bold text-white disabled:opacity-40"
        >
          {ui.printSave[lang]}
        </button>
        <p className="w-full text-[13px] text-neutral-600">{ui.printSaveHint[lang]}</p>
      </div>

      {/* The source Paged.js reads. Never shown. */}
      <div ref={sourceRef} hidden>
        {copied ? null : book?.content}
      </div>

      {/* Paged.js renders the pages here. */}
      {/* ltr on purpose, for Arabic too: Paged.js finds where a page
          overflows by measuring the column its content spills into, and
          that column lies to the right only in ltr. Under rtl it spilled
          left, went unnoticed, and every section was clipped to one page.
          The text inside carries its own dir (see bookCss). */}
      <div ref={targetRef} className="print-target" dir="ltr" />
    </div>
  )
}

/**
 * Paged.js, from its own prebuilt bundle in public/vendor. The npm entry
 * points at the library's source, whose CommonJS dependencies break under
 * Turbopack ("s.call is not a function"); the bundle is self-contained.
 * Loaded only here, so no other page pays for its 500 KB.
 */
interface PagedGlobal {
  Previewer: new () => {
    preview(content: DocumentFragment, css: Record<string, string>[], to?: Element): Promise<{ total: number }>
  }
}
function loadPaged(): Promise<PagedGlobal> {
  // The minified bundle names its global PagedModule; the unminified one, Paged.
  const w = window as Window & { PagedModule?: PagedGlobal; Paged?: PagedGlobal }
  const found = () => w.PagedModule ?? w.Paged
  if (found()) return Promise.resolve(found()!)
  return new Promise((resolve, reject) => {
    const s = document.createElement("script")
    s.src = "/vendor/paged-0.4.3.min.js"
    s.onload = () => {
      const g = found()
      if (g) resolve(g)
      else reject(new Error("Paged.js did not load"))
    }
    s.onerror = reject
    document.head.appendChild(s)
  })
}

/* ------------------------------------------------------------------ */
/* Assembly                                                             */
/* ------------------------------------------------------------------ */

function assemble(
  sel: { books: string[]; schools: SchoolKey[] },
  data: Loaded,
  lang: Lang,
): { content: ReactNode; footer: string; hasContent: boolean } {
  const allSchools = sel.schools.length === schools.length
  const chosen = schools.filter((s) => sel.schools.includes(s.key))
  const books = sel.books
    .map((id) => {
      const cat = categories.find((c) => c.id === id)!
      const issues = data.issues.filter((i) => i.categoryId === id).sort((a, b) => a.number - b.number)
      // Chapters in reading order, as the issues' own numbering gives them.
      const chapters: { key: string; name: string; issues: FullIssue[] }[] = []
      for (const i of issues) {
        const key = i.chapter?.ar ?? ""
        let ch = chapters.find((c) => c.key === key)
        if (!ch) {
          ch = { key, name: i.chapter?.[lang] ?? "", issues: [] }
          chapters.push(ch)
        }
        ch.issues.push(i)
      }
      return { id, name: cat.name[lang], issues, chapters, edition: editionOf(id), plan: planBooks.find((b) => b.id === id) }
    })
    .filter((b) => b.issues.length > 0)

  const hasContent = books.length > 0
  const single = books.length === 1
  const title = single ? ui.printBookTitle[lang].replace("{book}", books[0].name) : ui.printCollection[lang]
  const schoolsLine = allSchools
    ? ui.printAllSchools[lang]
    : ui.printSomeSchools[lang].replace("{list}", chosen.map((s) => s.name[lang]).join(" · "))
  const included = books.flatMap((b) => b.issues)
  const contentDate = included
    .map((i) => [i.addedAt, i.revisedAt].filter(Boolean) as string[])
    .flat()
    .sort()
    .pop()
  const today = new Date().toISOString().slice(0, 10)
  const versionLine = single
    ? ui.printVersion[lang].replace("{v}", books[0].edition.version)
    : books.map((b) => `${b.name} ${b.edition.version}`).join(" · ")
  const footer = single ? `${title} · ${ui.printVersion[lang].replace("{v}", books[0].edition.version)}` : title

  // Glossary: the terms that actually occur in what is printed.
  const corpus = fold(
    included
      .flatMap((i) => [i.title[lang], i.summary[lang], ...chosen.map((s) => i.rulings[s.key]?.ruling[lang] ?? "")])
      .join(" "),
  )
  const terms = data.glossary
    .filter((t) => {
      const head = fold(t.term[lang]).split(/[\s,،(]/)[0]
      return head.length >= 3 && corpus.includes(head)
    })
    .sort((a, b) => a.term[lang].localeCompare(b.term[lang], lang))

  // References: what the chosen schools cite here, with how often.
  const cited = new Map<string, number>()
  for (const i of included) {
    for (const s of chosen) {
      for (const r of i.rulings[s.key]?.references ?? []) cited.set(r.ar, (cited.get(r.ar) ?? 0) + 1)
    }
  }
  const refsBySchool = chosen.map((s) => ({
    school: s,
    books: data.sources
      .filter((b) => b.school === s.key && cited.has(b.ar))
      .map((b) => ({ name: lang === "ar" ? b.ar : b[lang], ar: b.ar, n: cited.get(b.ar) ?? 0 }))
      .sort((a, b) => b.n - a.n),
  }))

  const about = data.about.filter((b) => ["what", "sources", "grades"].includes(b.id))
  const notFatwa = data.about.find((b) => b.id === "notfatwa")

  const content = (
    <>
      {/* ── Cover ───────────────────────────────────────────── */}
      <section className="cover">
        <div className="cover-frame">
          <p className="cover-mark">تبيان · Tibyān</p>
          <h1 className="cover-title">{title}</h1>
          {!single ? <p className="cover-books">{books.map((b) => b.name).join(" · ")}</p> : null}
          <p className="cover-schools">{schoolsLine}</p>
          <div className="cover-schools-dots">
            {chosen.map((s) => (
              <span key={s.key} style={{ background: SCHOOL_HEX[s.key] }} />
            ))}
          </div>
          <p className="cover-version">{versionLine}</p>
          {single && books[0].edition.planned ? (
            <p className="cover-progress">
              {books[0].edition.complete
                ? ui.printCompleteNote[lang]
                : ui.printDraftNote[lang]
                    .replace("{w}", String(books[0].edition.written))
                    .replace("{p}", String(books[0].edition.planned))}
            </p>
          ) : null}
          <p className="cover-foot">{SITE_URL.replace(/^https?:\/\//, "")}</p>
        </div>
      </section>

      {/* ── Colophon ────────────────────────────────────────── */}
      <section className="front colophon">
        <h2 className="front-title">{title}</h2>
        <p>{schoolsLine}</p>
        <ul className="colophon-list">
          {books.map((b) => (
            <li key={b.id}>
              <strong>{b.name}</strong> — {ui.printVersion[lang].replace("{v}", b.edition.version)}
              {b.edition.planned && !b.edition.complete
                ? ` · ${ui.printDraftNote[lang].replace("{w}", String(b.edition.written)).replace("{p}", String(b.edition.planned))}`
                : b.edition.complete
                  ? ` · ${ui.printCompleteNote[lang]}`
                  : ""}
            </li>
          ))}
        </ul>
        {contentDate ? <p>{ui.printContentDate[lang].replace("{date}", fmtDate(contentDate, lang))}</p> : null}
        <p>{ui.printPrintedOn[lang].replace("{date}", fmtDate(today, lang))}</p>
        <p>{SITE_URL}</p>
        <p className="muted">{ui.printQrHint[lang]}</p>
        {notFatwa ? (
          <div className="colophon-note">
            <h3>{notFatwa.heading[lang]}</h3>
            {paras(notFatwa.body[lang])}
          </div>
        ) : null}
      </section>

      {/* ── Contents ────────────────────────────────────────── */}
      <section className="front toc">
        <h2 className="front-title">{ui.printContents[lang]}</h2>
        <ol className="toc-list">
          <li className="toc-front">
            <a href="#intro">{ui.printIntro[lang]}</a>
          </li>
          {books.map((b) => (
            <li key={b.id} className="toc-book">
              <a href={`#book-${b.id}`}>{ui.printBookTitle[lang].replace("{book}", b.name)}</a>
              <ol>
                {b.chapters.map((ch, n) => (
                  <li key={ch.key} className="toc-chapter">
                    <a href={`#ch-${b.id}-${n}`}>{ch.name}</a>
                    <ol>
                      {ch.issues.map((i) => (
                        <li key={i.id} className="toc-issue">
                          <a href={`#is-${i.ref}`}>
                            <span className="toc-ref">{displayRef(i.ref, lang)}</span> {i.title[lang]}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </li>
                ))}
              </ol>
            </li>
          ))}
          {terms.length ? (
            <li className="toc-front">
              <a href="#glossary">{ui.printGlossary[lang]}</a>
            </li>
          ) : null}
          <li className="toc-front">
            <a href="#references">{ui.printReferences[lang]}</a>
          </li>
        </ol>
      </section>

      {/* ── Introduction ────────────────────────────────────── */}
      <section className="intro" id="intro">
        <h2 className="part-title">{ui.printIntro[lang]}</h2>
        {about.map((b) => (
          <div key={b.id} className="intro-block">
            <h3>{b.heading[lang]}</h3>
            {paras(b.body[lang])}
          </div>
        ))}
      </section>

      {/* ── The books ───────────────────────────────────────── */}
      {books.map((b) => (
        <section key={b.id} className="book">
          <div className="book-opener" id={`book-${b.id}`}>
            <h2 className="book-title">{ui.printBookTitle[lang].replace("{book}", b.name)}</h2>
            <p className="book-edition">
              {ui.printVersion[lang].replace("{v}", b.edition.version)}
              {b.edition.planned
                ? ` · ${b.edition.complete ? ui.printCompleteNote[lang] : ui.printDraftNote[lang].replace("{w}", String(b.edition.written)).replace("{p}", String(b.edition.planned))}`
                : ""}
            </p>
            {b.plan && b.plan.chapters.length ? (
              <>
                <h3 className="plan-title">{ui.printPlan[lang]}</h3>
                <ol className="plan-list">
                  {b.plan.chapters.map((c, n) => (
                    <li key={`${c.name}-${n}`} className={c.written ? "" : "plan-empty"}>
                      <span dir="auto">{(c.chapter as Record<Lang, string> | undefined)?.[lang] ?? c.name}</span>
                      <span className="plan-count">
                        {c.written ? (c.planned ? `${c.written}/${c.planned}` : String(c.written)) : ui.printUpcoming[lang]}
                      </span>
                    </li>
                  ))}
                </ol>
              </>
            ) : null}
          </div>

          {b.chapters.map((ch, n) => (
            <div key={ch.key} className="chapter">
              <h2 className="chapter-title" id={`ch-${b.id}-${n}`} data-book={b.name}>
                {ch.name}
              </h2>
              {ch.issues.map((i) => (
                <article key={i.id} className="issue" id={`is-${i.ref}`}>
                  {/* The heading travels with its first ruling: a title alone
                      at the foot of a page, its answer overleaf, reads as a
                      misprint. */}
                  <div className="issue-lead">
                    <header className="issue-head">
                      <div className="issue-qr" dangerouslySetInnerHTML={{ __html: qrSvg(entryUrl(lang, i.ref)) }} />
                      <div className="issue-head-text">
                        <span className="issue-ref">{displayRef(i.ref, lang)}</span>
                        <h3 className="issue-title">{i.title[lang]}</h3>
                        <p className="issue-summary">{i.summary[lang]}</p>
                      </div>
                    </header>
                    {chosen.slice(0, 1).map((s) => rulingBlock(i, s, lang))}
                  </div>
                  {chosen.slice(1).map((s) => rulingBlock(i, s, lang))}
                </article>
              ))}
            </div>
          ))}
        </section>
      ))}

      {/* ── Glossary ────────────────────────────────────────── */}
      {terms.length ? (
        <section className="appendix" id="glossary">
          <h2 className="part-title">{ui.printGlossary[lang]}</h2>
          <dl className="glossary">
            {terms.map((t) => {
              const senses = chosen
                .map((s) => ({ s, text: t.technical?.[s.key]?.text?.[lang] }))
                .filter((x) => x.text)
              return (
                <div key={t.id} className="term">
                  <dt>{t.term[lang]}</dt>
                  <dd>
                    {(t.briefDefinition ?? t.definition)?.[lang]}
                    {senses.length ? (
                      <ul>
                        {senses.map(({ s, text }) => (
                          <li key={s.key}>
                            <strong style={{ color: SCHOOL_HEX[s.key] }}>{s.name[lang]}:</strong> {text}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      ) : null}

      {/* ── References ──────────────────────────────────────── */}
      <section className="appendix" id="references">
        <h2 className="part-title">{ui.printReferences[lang]}</h2>
        <p className="muted">{ui.printReferencesDesc[lang]}</p>
        {refsBySchool.map(({ school, books: rb }) =>
          rb.length ? (
            <div key={school.key} className="refs-school">
              <h3 style={{ color: SCHOOL_HEX[school.key] }}>{school.name[lang]}</h3>
              <ul>
                {rb.map((r) => (
                  <li key={r.ar}>
                    <span>{r.name}</span>
                    <span className="refs-n">{r.n}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null,
        )}
      </section>
    </>
  )

  return { content, footer, hasContent }
}

function rulingBlock(i: FullIssue, s: (typeof schools)[number], lang: Lang) {
  const r = i.rulings[s.key]
  if (!r) return null
  const grade = r.grade ? gradeLabels[r.grade]?.[lang] : null
  const nature = r.nature ? natureLabels[r.nature]?.[lang] : null
  return (
    <div key={s.key} className="ruling" style={{ borderInlineStartColor: SCHOOL_HEX[s.key] }}>
      <p className="ruling-school" style={{ color: SCHOOL_HEX[s.key] }}>
        {s.name[lang]}
        {grade || nature ? <span className="ruling-grade"> · {[grade, nature].filter(Boolean).join(" · ")}</span> : null}
      </p>
      <p className="ruling-text">{r.ruling[lang]}</p>
      {r.references.length ? (
        <p className="ruling-refs">
          {ui.reference[lang]}: {r.references.map((x) => x[lang]).join(" — ")}
        </p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* The page style Paged.js applies.                                     */
/* ------------------------------------------------------------------ */

function bookCss(lang: Lang, footer: string): string {
  const rtl = rtlLangs.includes(lang)
  const body = rtl ? `"Amiri", "Traditional Arabic", serif` : `Georgia, "Times New Roman", "Noto Serif", serif`
  const esc = footer.replace(/\\/g, "\\\\").replace(/"/g, '\\"')
  return `
.pagedjs_pages, .pagedjs_page, .pagedjs_sheet, .pagedjs_pagebox, .pagedjs_area, .pagedjs_page_content { direction: ltr; }
.pagedjs_page_content > div, .pagedjs_margin-content { direction: ${rtl ? "rtl" : "ltr"}; }

@page {
  size: A4;
  margin: 22mm 20mm 24mm 20mm;
  @top-center {
    content: string(chapter);
    font-family: ${body};
    font-size: 9.5pt;
    color: #6b6b6b;
  }
  @bottom-center {
    content: counter(page);
    font-family: ${body};
    font-size: 10pt;
    color: #333;
  }
  @bottom-right {
    content: "${rtl ? "" : esc}";
    font-family: ${body};
    font-size: 8pt;
    color: #8a8a8a;
  }
  @bottom-left {
    content: "${rtl ? esc : ""}";
    font-family: ${body};
    font-size: 8pt;
    color: #8a8a8a;
  }
}
@page cover {
  margin: 0;
  @top-center { content: none; }
  @bottom-center { content: none; }
  @bottom-left { content: none; }
  @bottom-right { content: none; }
}
@page front {
  @top-center { content: none; }
}
@page opener {
  @top-center { content: none; }
}

.cover, .colophon, .toc, .intro, .book-opener, .appendix { break-before: page; }
.cover { page: cover; break-before: avoid; }
.colophon, .toc, .intro { break-after: page; }
.colophon, .toc { page: front; }
.book-opener { page: opener; }

* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cover, .front, .intro, .book, .appendix {
  font-family: ${body};
  color: #1a1a1a;
  font-size: ${rtl ? "12.5pt" : "11pt"};
  line-height: ${rtl ? "1.75" : "1.55"};
  text-align: start;
  hyphens: auto;
}
p { margin: 0 0 0.55em; orphans: 2; widows: 2; }
h1, h2, h3, dt { font-weight: 700; }
strong { font-weight: 700; }
.muted { color: #666; font-size: 0.9em; }

/* Cover */
.cover-frame {
  margin: 10mm;
  height: 277mm;
  padding: 24mm 18mm 12mm;
  border: 1.8mm double #1a1a1a;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}
.cover-mark { font-size: 12pt; letter-spacing: 0.08em; color: #555; margin-top: 8mm; }
.cover-title { font-size: ${rtl ? "40pt" : "34pt"}; line-height: 1.25; margin: 34mm 0 6mm; font-weight: 700; }
.cover-books { font-size: 15pt; color: #333; margin-bottom: 4mm; }
.cover-schools { font-size: 15pt; color: #333; margin: 2mm 0 5mm; }
.cover-schools-dots { display: flex; gap: 3mm; justify-content: center; margin-bottom: 26mm; }
.cover-schools-dots span { width: 4mm; height: 4mm; border-radius: 50%; display: inline-block; }
.cover-version { font-size: 13pt; border: 0.4mm solid #1a1a1a; padding: 2mm 6mm; border-radius: 1.5mm; }
.cover-progress { font-size: 10.5pt; color: #555; max-width: 120mm; margin-top: 4mm; }
.cover-foot { margin-top: auto; font-size: 10pt; color: #555; direction: ltr; }

/* Front matter */
.part-title { string-set: chapter content(text); }
.front-title, .part-title {
  font-size: 20pt; font-weight: 700; margin: 0 0 8mm;
  padding-bottom: 3mm; border-bottom: 0.5mm solid #1a1a1a;
}
.colophon { font-size: 11pt; }
.colophon-list { list-style: none; padding: 0; margin: 4mm 0 5mm; }
.colophon-list li { margin-bottom: 2mm; }
.colophon-note { margin-top: 12mm; padding: 5mm 6mm; border: 0.3mm solid #bbb; border-radius: 2mm; background: #faf8f3; }
.colophon-note h3 { font-size: 12pt; margin: 0 0 2mm; }

/* Contents */
.toc-list, .toc-list ol { list-style: none; padding: 0; margin: 0; }
.toc-list a { color: inherit; text-decoration: none; display: flex; gap: 2mm; }
.toc-list a::after {
  content: target-counter(attr(href), page);
  margin-inline-start: auto;
  padding-inline-start: 3mm;
  font-variant-numeric: tabular-nums;
}
.toc-front > a { font-weight: 700; margin: 3mm 0; }
.toc-book > a { font-weight: 700; font-size: 1.12em; margin: 5mm 0 2mm; border-bottom: 0.3mm solid #ccc; padding-bottom: 1mm; }
.toc-chapter > a { font-weight: 700; margin: 2.5mm 0 1mm; padding-inline-start: 2mm; }
.toc-issue > a { font-size: 0.9em; padding-inline-start: 7mm; color: #333; margin: 0.6mm 0; }
.toc-ref { color: #777; font-variant-numeric: tabular-nums; min-width: 13mm; display: inline-block; }

/* Intro */
.intro-block { margin-bottom: 6mm; }
.intro-block h3 { font-size: 13pt; margin: 0 0 2mm; }

/* Book opener */
.book-title { font-size: 28pt; font-weight: 700; margin: 30mm 0 4mm; string-set: chapter content(text); }
.book-edition { color: #555; font-size: 11pt; margin-bottom: 14mm; }
.plan-title { font-size: 13pt; margin: 0 0 3mm; }
.plan-list { padding: 0; margin: 0; list-style: none; counter-reset: plan; }
.plan-list li { display: flex; gap: 3mm; padding: 1.4mm 0; border-bottom: 0.2mm dotted #bbb; counter-increment: plan; }
.plan-list li::before { content: counter(plan); color: #888; min-width: 6mm; font-variant-numeric: tabular-nums; }
.plan-count { margin-inline-start: auto; color: #555; font-variant-numeric: tabular-nums; }
.plan-empty { color: #8a8a8a; }

/* Chapters and entries */
.chapter-title {
  string-set: chapter content(text);
  font-size: 17pt; font-weight: 700; margin: 10mm 0 5mm;
  padding: 2.5mm 0; border-top: 0.6mm solid #1a1a1a; border-bottom: 0.2mm solid #1a1a1a;
  break-after: avoid;
}
.chapter:first-of-type .chapter-title { margin-top: 0; }
.issue { margin: 0 0 8mm; }
.issue-lead { break-inside: avoid; }
.issue-head { display: flex; gap: 4mm; align-items: flex-start; margin-bottom: 2.5mm; }
.issue-qr { width: 15mm; height: 15mm; flex: none; }
.issue-qr svg { width: 15mm; height: 15mm; display: block; }
.issue-head-text { flex: 1; min-width: 0; }
.issue-ref { font-size: 9.5pt; color: #666; font-variant-numeric: tabular-nums; }
.issue-title { font-size: ${rtl ? "14.5pt" : "13pt"}; font-weight: 700; margin: 0.5mm 0 1mm; line-height: 1.4; }
.issue-summary { color: #444; font-size: 0.95em; margin: 0; }
.ruling { border-inline-start: 1.2mm solid #999; padding: 1.5mm 0; padding-inline-start: 4mm; margin: 0 0 3mm; break-inside: avoid; }
.ruling-school { font-weight: 700; font-size: 0.92em; margin: 0 0 0.6mm; }
.ruling-grade { color: #444; font-weight: 400; }
.ruling-text { margin: 0 0 1mm; }
.ruling-refs { font-size: 0.82em; color: #666; margin: 0; }

/* Appendices */
.glossary { margin: 0; }
.term { break-inside: avoid; margin-bottom: 4mm; }
.term dt { font-weight: 700; font-size: 1.05em; }
.term dd { margin: 0.5mm 0 0; }
.term ul { margin: 1mm 0 0; padding-inline-start: 5mm; font-size: 0.92em; }
.refs-school { margin-bottom: 6mm; break-inside: avoid; }
.refs-school h3 { font-size: 13pt; margin: 0 0 2mm; }
.refs-school ul { list-style: none; padding: 0; margin: 0; }
.refs-school li { display: flex; padding: 1.2mm 0; border-bottom: 0.2mm dotted #bbb; }
.refs-n { margin-inline-start: auto; color: #555; font-variant-numeric: tabular-nums; }
`
}
