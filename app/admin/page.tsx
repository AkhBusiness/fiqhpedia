"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  X,
} from "lucide-react"
import termsData from "@/data/terms.json"

/* ------------------------------------------------------------------ */
/* Repo + shared types                                                 */
/* ------------------------------------------------------------------ */

const REPO = "AkhBusiness/fiqhpedia"
const BRANCH = "main"
const TOKEN_KEY = "tibyan-admin-token"

type ContentType = "issues" | "articles"
const ISSUES_DIR = "data/content/issues"
const ARTICLES_DIR = "data/content/articles"
const dirFor = (ct: ContentType) => (ct === "issues" ? ISSUES_DIR : ARTICLES_DIR)

const LANGS = ["ar", "en", "ru", "es", "uk"] as const
type Lang = (typeof LANGS)[number]
const LANG_LABEL: Record<Lang, string> = {
  ar: "العربية",
  en: "الإنجليزية",
  ru: "الروسية",
  es: "الإسبانية",
  uk: "الأوكرانية",
}
/** لغتان لم تُطلقا بعد — نقصهما تنبيه لا خطأ يمنع الحفظ، كما في validate_content.py */
const PENDING_LANGS: readonly Lang[] = ["es", "uk"]
const emptyLoc = (): Loc => ({ ar: "", en: "", ru: "", es: "", uk: "" })

const SCHOOLS = [
  { key: "hanafi", label: "الحنفي" },
  { key: "maliki", label: "المالكي" },
  { key: "shafii", label: "الشافعي" },
  { key: "hanbali", label: "الحنبلي" },
] as const
type SchoolKey = (typeof SCHOOLS)[number]["key"]

const BOOKS = [
  { id: "iman", label: "الإيمان" },
  { id: "taharah", label: "الطهارة" },
  { id: "salah", label: "الصلاة" },
  { id: "zakah", label: "الزكاة" },
  { id: "sawm", label: "الصيام" },
  { id: "hajj", label: "الحج" },
  { id: "muamalat", label: "المعاملات" },
  { id: "nikah", label: "النكاح" },
  { id: "jinayat", label: "الجنايات" },
]

type Loc = Partial<Record<Lang, string>>

interface Ruling {
  text: Loc
  sources: Loc[]
}
interface Issue {
  ref: string
  id: string
  bookId: string
  seq: number
  chapter?: Loc
  title: Loc
  summary: Loc
  rulings: Record<SchoolKey, Ruling>
}

interface ArticleSection {
  id: string
  heading: Loc
  body: Loc
}
interface Article {
  ref: string
  id: string
  chapter?: Loc
  title: Loc
  excerpt: Loc
  relatedRefs: string[]
  sections: ArticleSection[]
  sources?: Loc[]
}

/** كتب المذاهب — من القائمة المقفلة في data/terms.json. */
const BOOKS_BY_SCHOOL: Record<string, { ar: string; en: string; ru: string; es: string; uk: string }[]> =
  (() => {
    const out: Record<string, { ar: string; en: string; ru: string; es: string; uk: string }[]> = {}
    const src = (termsData as unknown as {
      books: Record<string, { school: string; en: string; ru: string; es?: string; uk?: string }>
    }).books
    for (const [ar, meta] of Object.entries(src)) {
      const school = meta.school
      ;(out[school] ??= []).push({
        ar,
        en: meta.en,
        ru: meta.ru,
        es: meta.es ?? meta.en,
        uk: meta.uk ?? meta.ru,
      })
    }
    for (const list of Object.values(out)) list.sort((a, b) => a.ar.localeCompare(b.ar, "ar"))
    return out
  })()

/** مصادر المقالات العامة — من data/terms.json، منفصلة عن كتب المذاهب. */
const WORKS_CATALOGUE: { ar: string; en: string; ru: string; es: string; uk: string }[] = (() => {
  const src = (termsData as unknown as {
    works: Record<string, { en: string; ru: string; es?: string; uk?: string }>
  }).works
  return Object.entries(src)
    .map(([ar, meta]) => ({ ar, en: meta.en, ru: meta.ru, es: meta.es ?? meta.en, uk: meta.uk ?? meta.ru }))
    .sort((a, b) => a.ar.localeCompare(b.ar, "ar"))
})()

/* ------------------------------------------------------------------ */
/* GitHub                                                              */
/* ------------------------------------------------------------------ */

/** btoa cannot take Arabic directly; go through UTF-8 bytes. */
function toBase64(text: string): string {
  const bytes = new TextEncoder().encode(text)
  let bin = ""
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin)
}

function fromBase64(b64: string): string {
  const bin = atob(b64.replace(/\s/g, ""))
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

async function gh(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(
      res.status === 401
        ? "الرمز مرفوض. تأكد أنه لم تنتهِ مدته وأن صلاحية Contents فيه Read and write."
        : res.status === 404
          ? "لم يُعثر على الملف أو المستودع. راجع صلاحية الوصول إلى المستودع."
          : `GitHub ${res.status}: ${body.slice(0, 200)}`,
    )
  }
  return res.json()
}

/* ------------------------------------------------------------------ */
/* Validation — mirrors validate_content.py, but while you type        */
/* ------------------------------------------------------------------ */

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length

interface Problem {
  field: string
  msg: string
  hard: boolean
}

function checkIssue(issue: Issue): Problem[] {
  const p: Problem[] = []
  const push = (field: string, msg: string, hard = true) => p.push({ field, msg, hard })

  if (!/^F\d+$/.test(issue.ref)) push("ref", "الرقم المرجعي بالشكل F ثم رقم")
  if (!issue.id.trim()) push("id", "المعرّف مطلوب")
  if (!issue.seq || issue.seq < 1) push("seq", "الترتيب داخل الفصل رقم موجب")

  for (const l of LANGS) {
    const soft = PENDING_LANGS.includes(l)
    const ch = issue.chapter?.[l]?.trim() ?? ""
    const ti = issue.title[l]?.trim() ?? ""
    const su = issue.summary[l]?.trim() ?? ""

    if (!ch) push(`chapter.${l}`, `الفصل ناقص بـ${LANG_LABEL[l]}`, !soft)
    else if (l === "ar" && !ch.startsWith("باب ")) push("chapter.ar", "الفصل يبدأ بكلمة «باب»")

    if (!ti) push(`title.${l}`, `العنوان ناقص بـ${LANG_LABEL[l]}`, !soft)
    else if (l === "ar") {
      if (/[?؟]/.test(ti)) push("title.ar", "العنوان بلا علامة استفهام")
      const n = words(ti)
      if (n < 5 || n > 9) push("title.ar", `العنوان ${n} كلمة — المطلوب ٥ إلى ٩`, false)
    }

    if (!su) push(`summary.${l}`, `الملخص ناقص بـ${LANG_LABEL[l]}`, !soft)
    else if (l === "ar") {
      if (!su.endsWith("؟")) push("summary.ar", "الملخص ينتهي بعلامة استفهام عربية «؟»")
      const n = words(su)
      if (n < 8 || n > 15) push("summary.ar", `الملخص ${n} كلمة — المطلوب ٨ إلى ١٥`, false)
    }

    if (l === "ar") {
      for (const [bad, good] of [
        [",", "،"],
        [";", "؛"],
        ["?", "؟"],
      ]) {
        if ([ch, ti, su].some((s) => s.includes(bad)))
          push("punct", `علامة «${bad}» في نصّ عربي — الصواب «${good}»`)
      }
    }
    if (l === "es" && [ti, su].some((s) => s.includes("?") && !s.includes("¿")))
      push("summary.es", "السؤال الإسباني يفتح بـ «¿»", false)
  }

  for (const s of SCHOOLS) {
    const r = issue.rulings[s.key]
    for (const l of LANGS) {
      const t = r.text[l]?.trim() ?? ""
      if (!t) push(`${s.key}.text.${l}`, `حكم ${s.label} ناقص بـ${LANG_LABEL[l]}`, !PENDING_LANGS.includes(l))
      else if (l === "ar") {
        const n = words(t)
        if (n < 10 || n > 22) push(`${s.key}.text.ar`, `حكم ${s.label} ${n} كلمة — المطلوب ١٠ إلى ٢٢`, false)
      }
    }
    if (r.sources.length < 2 || r.sources.length > 3)
      push(`${s.key}.sources`, `مراجع ${s.label}: ${r.sources.length} — المطلوب كتابان أو ثلاثة`)
    const names = r.sources.map((x) => x.ar)
    if (new Set(names).size !== names.length) push(`${s.key}.sources`, `مرجع مكرر في ${s.label}`)
  }
  return p
}

function checkArticle(a: Article): Problem[] {
  const p: Problem[] = []
  const push = (field: string, msg: string, hard = true) => p.push({ field, msg, hard })

  if (!/^M\d+$/.test(a.ref)) push("ref", "الرقم المرجعي بالشكل M ثم رقم")
  if (!a.id.trim()) push("id", "المعرّف مطلوب")
  if (a.sections.length < 1) push("sections", "لازم قسم واحد على الأقل")

  for (const l of LANGS) {
    const soft = PENDING_LANGS.includes(l)
    const ti = a.title[l]?.trim() ?? ""
    const ex = a.excerpt[l]?.trim() ?? ""
    if (!ti) push(`title.${l}`, `العنوان ناقص بـ${LANG_LABEL[l]}`, !soft)
    if (!ex) push(`excerpt.${l}`, `النبذة ناقصة بـ${LANG_LABEL[l]}`, !soft)
    if (l === "ar") {
      for (const [bad, good] of [
        [",", "،"],
        [";", "؛"],
        ["?", "؟"],
      ]) {
        if ([ti, ex].some((s) => s.includes(bad)))
          push("punct", `علامة «${bad}» في نصّ عربي — الصواب «${good}»`)
      }
    }
  }

  a.sections.forEach((sec, i) => {
    if (!sec.id.trim()) push(`section${i}.id`, `قسم ${i + 1}: يحتاج معرّفاً (بالإنجليزية)`)
    for (const l of LANGS) {
      const soft = PENDING_LANGS.includes(l)
      const he = sec.heading[l]?.trim() ?? ""
      const bo = sec.body[l]?.trim() ?? ""
      if (i > 0 && !he) push(`section${i}.heading.${l}`, `قسم ${i + 1}: العنوان الفرعي ناقص بـ${LANG_LABEL[l]}`, !soft)
      if (!bo) push(`section${i}.body.${l}`, `قسم ${i + 1}: المتن ناقص بـ${LANG_LABEL[l]}`, !soft)
    }
  })

  return p
}

/* ------------------------------------------------------------------ */
/* Small pieces                                                        */
/* ------------------------------------------------------------------ */

const field =
  "w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-foreground placeholder:text-muted-foreground/60 focus:border-white/25 focus:outline-none focus:ring-2 focus:ring-white/10"

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
        {label}
        {hint ? <span className="text-xs font-normal text-muted-foreground">{hint}</span> : null}
      </span>
      {children}
    </label>
  )
}

function LangPills({
  lang,
  setLang,
  missingCounts,
}: {
  lang: Lang
  setLang: (l: Lang) => void
  missingCounts: Record<Lang, number>
}) {
  return (
    <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
      {LANGS.map((l) => {
        const missing = missingCounts[l]
        return (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${
              lang === l ? "bg-white text-black" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {LANG_LABEL[l]}
            {missing > 0 ? (
              <span
                title={`${missing} حقلاً ناقصاً`}
                className={`rounded-full px-1.5 text-[10px] tabular-nums ${
                  lang === l ? "bg-black/10 text-black" : "bg-amber-500/20 text-amber-400"
                }`}
              >
                {missing}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

function ProblemsList({ problems }: { problems: Problem[] }) {
  if (problems.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-300">
        <Check className="size-4" aria-hidden="true" />
        المادة مستوفية.
      </p>
    )
  }
  return (
    <ul className="flex list-none flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm">
      {problems.map((p, i) => (
        <li key={i} className={`flex items-start gap-2 ${p.hard ? "text-red-300" : "text-amber-300"}`}>
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {p.msg}
        </li>
      ))}
    </ul>
  )
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [tokenDraft, setTokenDraft] = useState("")
  const [contentType, setContentType] = useState<ContentType>("issues")
  const [files, setFiles] = useState<{ name: string; sha: string }[]>([])
  const [current, setCurrent] = useState<{ path: string; sha: string } | null>(null)
  const [issue, setIssue] = useState<Issue | null>(null)
  const [article, setArticle] = useState<Article | null>(null)
  const [lang, setLang] = useState<Lang>("ar")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_KEY))
  }, [])

  const loadList = useCallback(async (t: string, ct: ContentType) => {
    setBusy(true)
    setError(null)
    try {
      const data = (await gh(t, `/repos/${REPO}/contents/${dirFor(ct)}?ref=${BRANCH}`)) as {
        name: string
        sha: string
      }[]
      const num = (n: string) => parseInt(n.replace(/\D/g, ""), 10) || 0
      setFiles(data.filter((f) => f.name.endsWith(".json")).sort((a, b) => num(a.name) - num(b.name)))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }, [])

  useEffect(() => {
    if (token) void loadList(token, contentType)
  }, [token, contentType, loadList])

  function switchType(ct: ContentType) {
    if (ct === contentType) return
    setContentType(ct)
    setIssue(null)
    setArticle(null)
    setCurrent(null)
    setSaved(null)
    setError(null)
  }

  async function open(name: string) {
    if (!token) return
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const path = `${dirFor(contentType)}/${name}`
      const data = (await gh(token, `/repos/${REPO}/contents/${path}?ref=${BRANCH}`)) as {
        content: string
        sha: string
      }
      const parsed = JSON.parse(fromBase64(data.content))
      if (contentType === "issues") {
        const iss = parsed as Issue
        iss.chapter ??= {}
        for (const s of SCHOOLS) iss.rulings[s.key].sources ??= []
        setIssue(iss)
        setArticle(null)
      } else {
        const art = parsed as Article
        art.chapter ??= {}
        art.relatedRefs ??= []
        art.sources ??= []
        art.sections ??= []
        setArticle(art)
        setIssue(null)
      }
      setCurrent({ path, sha: data.sha })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function blankIssue(): Issue {
    const next = Math.max(0, ...files.map((f) => parseInt(f.name.replace(/\D/g, ""), 10) || 0)) + 1
    return {
      ref: `F${next}`,
      id: "",
      bookId: "taharah",
      seq: 1,
      chapter: emptyLoc(),
      title: emptyLoc(),
      summary: emptyLoc(),
      rulings: {
        hanafi: { text: emptyLoc(), sources: [] },
        maliki: { text: emptyLoc(), sources: [] },
        shafii: { text: emptyLoc(), sources: [] },
        hanbali: { text: emptyLoc(), sources: [] },
      },
    }
  }

  function blankArticle(): Article {
    const next = Math.max(0, ...files.map((f) => parseInt(f.name.replace(/\D/g, ""), 10) || 0)) + 1
    return {
      ref: `M${next}`,
      id: "",
      chapter: emptyLoc(),
      title: emptyLoc(),
      excerpt: emptyLoc(),
      relatedRefs: [],
      sections: [{ id: "intro", heading: emptyLoc(), body: emptyLoc() }],
      sources: [],
    }
  }

  const problems = useMemo(() => {
    if (issue) return checkIssue(issue)
    if (article) return checkArticle(article)
    return []
  }, [issue, article])
  const blocking = problems.filter((p) => p.hard)

  async function save() {
    if (!token) return
    const data = issue ?? article
    if (!data) return
    setBusy(true)
    setError(null)
    try {
      const path = current?.path ?? `${dirFor(contentType)}/${data.ref}.json`
      const kind = contentType === "issues" ? "مسألة" : "مقالة"
      const body: Record<string, unknown> = {
        message: `${current ? "تعديل" : "إضافة"} ${data.ref} (${kind}) — ${data.title.ar || ""}`.trim(),
        content: toBase64(JSON.stringify(data, null, 2) + "\n"),
        branch: BRANCH,
      }
      if (current?.sha) body.sha = current.sha
      const res = (await gh(token, `/repos/${REPO}/contents/${path}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })) as { content: { sha: string } }
      setCurrent({ path, sha: res.content.sha })
      setSaved(`حُفظ ${data.ref}. سيُنشر الموقع خلال دقيقة.`)
      await loadList(token, contentType)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  /* --- token gate --- */
  if (!token) {
    return (
      <main dir="rtl" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-5 p-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">لوحة تبيان</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            الصق رمز GitHub الشخصي. يُحفظ في هذا المتصفح وحده ولا يُرسل إلى أي جهة غير GitHub.
          </p>
        </div>
        <input
          type="password"
          dir="ltr"
          value={tokenDraft}
          onChange={(e) => setTokenDraft(e.target.value)}
          placeholder="github_pat_…"
          className={field}
        />
        <button
          type="button"
          disabled={!tokenDraft.trim()}
          onClick={() => {
            const t = tokenDraft.trim()
            window.localStorage.setItem(TOKEN_KEY, t)
            setToken(t)
          }}
          className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 font-bold text-black disabled:opacity-40"
        >
          <KeyRound className="size-4" aria-hidden="true" />
          ادخل
        </button>
        <p className="text-xs leading-relaxed text-muted-foreground">
          الرمز يحتاج صلاحية <span className="font-mono">Contents: Read and write</span> على
          مستودع <span className="font-mono" dir="ltr">{REPO}</span> وحده.
        </p>
      </main>
    )
  }

  const current_item = issue ?? article
  const missingCounts: Record<Lang, number> = (() => {
    const out = {} as Record<Lang, number>
    for (const l of LANGS) {
      if (issue) {
        out[l] = [
          issue.chapter?.[l],
          issue.title[l],
          issue.summary[l],
          ...SCHOOLS.map((s) => issue.rulings[s.key].text[l]),
        ].filter((v) => !v?.trim()).length
      } else if (article) {
        out[l] = [
          article.title[l],
          article.excerpt[l],
          ...article.sections.map((s) => s.body[l]),
        ].filter((v) => !v?.trim()).length
      } else {
        out[l] = 0
      }
    }
    return out
  })()

  /* --- workbench --- */
  return (
    <main dir="rtl" className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-black/60 px-4 py-3 backdrop-blur-xl">
        <h1 className="text-base font-bold text-foreground">لوحة تبيان</h1>
        <span className="text-xs text-muted-foreground" dir="ltr">
          {REPO}
        </span>
        <div className="ms-auto flex items-center gap-2">
          {busy ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden="true" /> : null}
          <button
            type="button"
            onClick={() => void loadList(token, contentType)}
            title="تحديث القائمة"
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              window.localStorage.removeItem(TOKEN_KEY)
              setToken(null)
              setIssue(null)
              setArticle(null)
            }}
            title="خروج ومسح الرمز"
            className="rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {error ? (
        <div className="flex items-start gap-2 border-b border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="إغلاق">
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}
      {saved ? (
        <div className="flex items-center gap-2 border-b border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
          <Check className="size-4 shrink-0" aria-hidden="true" />
          {saved}
        </div>
      ) : null}

      <div className="flex flex-1 flex-col lg:flex-row">
        {/* القائمة */}
        <aside
          className={`border-white/10 lg:w-72 lg:shrink-0 lg:border-e ${current_item ? "hidden lg:block" : ""}`}
        >
          <div className="p-3">
            <div className="mb-3 flex gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              <button
                type="button"
                onClick={() => switchType("issues")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold ${
                  contentType === "issues" ? "bg-white text-black" : "text-muted-foreground hover:bg-white/10"
                }`}
              >
                المسائل
              </button>
              <button
                type="button"
                onClick={() => switchType("articles")}
                className={`flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold ${
                  contentType === "articles" ? "bg-white text-black" : "text-muted-foreground hover:bg-white/10"
                }`}
              >
                المقالات
              </button>
              <button
                type="button"
                disabled
                title="بنية المفردات لم تُحسم بعد — انظر المعلّقات في CLAUDE.md"
                className="flex-1 cursor-not-allowed rounded-lg px-2 py-1.5 text-sm font-semibold text-muted-foreground/40"
              >
                المفردات
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                if (contentType === "issues") {
                  setIssue(blankIssue())
                  setArticle(null)
                } else {
                  setArticle(blankArticle())
                  setIssue(null)
                }
                setCurrent(null)
                setSaved(null)
              }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-sm font-semibold text-foreground hover:bg-white/10"
            >
              <Plus className="size-4" aria-hidden="true" />
              {contentType === "issues" ? "مسألة جديدة" : "مقالة جديدة"}
            </button>
            <ul className="flex list-none flex-col gap-0.5 p-0">
              {files.map((f) => {
                const ref = f.name.replace(".json", "")
                const active = current?.path.endsWith(f.name)
                return (
                  <li key={f.name}>
                    <button
                      type="button"
                      onClick={() => void open(f.name)}
                      className={`w-full rounded-lg px-3 py-2 text-start font-mono text-sm ${
                        active ? "bg-white text-black" : "text-muted-foreground hover:bg-white/10"
                      }`}
                    >
                      {ref}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        </aside>

        {/* المحرّر */}
        <div className="flex-1 p-4 lg:p-10">
          {!current_item ? (
            <p className="mt-20 text-center text-sm text-muted-foreground">
              اختر {contentType === "issues" ? "مسألة" : "مقالة"} من القائمة، أو أنشئ واحدة جديدة.
            </p>
          ) : issue ? (
            <form
              className="mx-auto flex max-w-6xl flex-col gap-6"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <div className="flex items-center gap-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setIssue(null)}
                  className="flex items-center gap-1 text-sm text-muted-foreground"
                >
                  <ChevronLeft className="size-4 rotate-180" aria-hidden="true" />
                  القائمة
                </button>
              </div>

              <LangPills lang={lang} setLang={setLang} missingCounts={missingCounts} />

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Row label="الرقم">
                  <input
                    dir="ltr"
                    value={issue.ref}
                    onChange={(e) => setIssue({ ...issue, ref: e.target.value })}
                    className={`${field} font-mono`}
                  />
                </Row>
                <Row label="المعرّف">
                  <input
                    dir="ltr"
                    value={issue.id}
                    onChange={(e) => setIssue({ ...issue, id: e.target.value })}
                    className={`${field} font-mono`}
                  />
                </Row>
                <Row label="الباب">
                  <select
                    value={issue.bookId}
                    onChange={(e) => setIssue({ ...issue, bookId: e.target.value })}
                    className={field}
                  >
                    {BOOKS.map((b) => (
                      <option key={b.id} value={b.id} className="bg-zinc-900">
                        {b.label}
                      </option>
                    ))}
                  </select>
                </Row>
                <Row label="الترتيب" hint="داخل الفصل">
                  <input
                    type="number"
                    min={1}
                    value={issue.seq}
                    onChange={(e) => setIssue({ ...issue, seq: Number(e.target.value) })}
                    className={field}
                  />
                </Row>
              </div>

              <Row label="الفصل" hint={lang === "ar" ? "يبدأ بكلمة «باب»" : undefined}>
                <input
                  value={issue.chapter?.[lang] ?? ""}
                  onChange={(e) =>
                    setIssue({ ...issue, chapter: { ...issue.chapter, [lang]: e.target.value } })
                  }
                  className={field}
                />
              </Row>

              <Row label="العنوان" hint={lang === "ar" ? `${words(issue.title.ar ?? "")} من ٥–٩` : undefined}>
                <input
                  value={issue.title[lang] ?? ""}
                  onChange={(e) => setIssue({ ...issue, title: { ...issue.title, [lang]: e.target.value } })}
                  className={field}
                />
              </Row>

              <Row
                label="الملخص"
                hint={lang === "ar" ? `${words(issue.summary.ar ?? "")} من ٨–١٥ · ينتهي بـ ؟` : undefined}
              >
                <textarea
                  rows={2}
                  value={issue.summary[lang] ?? ""}
                  onChange={(e) =>
                    setIssue({ ...issue, summary: { ...issue.summary, [lang]: e.target.value } })
                  }
                  className={field}
                />
              </Row>

              <div className="grid gap-4 xl:grid-cols-2">
                {SCHOOLS.map((s) => {
                  const r = issue.rulings[s.key]
                  const catalogue = BOOKS_BY_SCHOOL[s.key] ?? []
                  const chosen = new Set(r.sources.map((x) => x.ar))
                  const set = (next: Ruling) =>
                    setIssue({ ...issue, rulings: { ...issue.rulings, [s.key]: next } })
                  return (
                    <section key={s.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                      <h2 className="mb-3 font-bold text-foreground">{s.label}</h2>
                      <textarea
                        rows={3}
                        value={r.text[lang] ?? ""}
                        onChange={(e) => set({ ...r, text: { ...r.text, [lang]: e.target.value } })}
                        className={field}
                        placeholder={`الحكم بـ${LANG_LABEL[lang]}`}
                      />
                      {lang === "ar" ? (
                        <p className="mt-1 text-xs text-muted-foreground">
                          {words(r.text.ar ?? "")} كلمة من ١٠–٢٢
                        </p>
                      ) : null}

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {r.sources.map((src, i) => (
                          <span
                            key={i}
                            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] py-1 pe-1 ps-3 text-sm text-foreground"
                          >
                            {src.ar}
                            <button
                              type="button"
                              aria-label={`حذف ${src.ar}`}
                              onClick={() => set({ ...r, sources: r.sources.filter((_, n) => n !== i) })}
                              className="rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                            >
                              <X className="size-3" aria-hidden="true" />
                            </button>
                          </span>
                        ))}
                        {r.sources.length < 3 ? (
                          <select
                            value=""
                            onChange={(e) => {
                              const book = catalogue.find((b) => b.ar === e.target.value)
                              if (book) set({ ...r, sources: [...r.sources, book] })
                            }}
                            className="rounded-full border border-dashed border-white/20 bg-transparent px-3 py-1.5 text-sm text-muted-foreground"
                          >
                            <option value="">إضافة مرجع…</option>
                            {catalogue
                              .filter((b) => !chosen.has(b.ar))
                              .map((b) => (
                                <option key={b.ar} value={b.ar} className="bg-zinc-900">
                                  {b.ar}
                                </option>
                              ))}
                          </select>
                        ) : null}
                      </div>
                    </section>
                  )
                })}
              </div>

              <ProblemsList problems={problems} />

              <div className="sticky bottom-4 flex gap-2">
                <button
                  type="submit"
                  disabled={busy || blocking.length > 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-black disabled:opacity-40"
                >
                  <Save className="size-4" aria-hidden="true" />
                  {blocking.length > 0 ? `${blocking.length} خطأ يمنع الحفظ` : "حفظ في GitHub"}
                </button>
              </div>
            </form>
          ) : article ? (
            <form
              className="mx-auto flex max-w-6xl flex-col gap-6"
              onSubmit={(e) => {
                e.preventDefault()
                void save()
              }}
            >
              <div className="flex items-center gap-3 lg:hidden">
                <button
                  type="button"
                  onClick={() => setArticle(null)}
                  className="flex items-center gap-1 text-sm text-muted-foreground"
                >
                  <ChevronLeft className="size-4 rotate-180" aria-hidden="true" />
                  القائمة
                </button>
              </div>

              <LangPills lang={lang} setLang={setLang} missingCounts={missingCounts} />

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <Row label="الرقم">
                  <input
                    dir="ltr"
                    value={article.ref}
                    onChange={(e) => setArticle({ ...article, ref: e.target.value })}
                    className={`${field} font-mono`}
                  />
                </Row>
                <Row label="المعرّف" hint="بالإنجليزية">
                  <input
                    dir="ltr"
                    value={article.id}
                    onChange={(e) => setArticle({ ...article, id: e.target.value })}
                    className={`${field} font-mono`}
                  />
                </Row>
                <Row label="المسائل المرتبطة" hint="أرقام مفصولة بفاصلة، مثال F1, F2">
                  <input
                    dir="ltr"
                    value={article.relatedRefs.join(", ")}
                    onChange={(e) =>
                      setArticle({
                        ...article,
                        relatedRefs: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className={`${field} font-mono`}
                  />
                </Row>
              </div>

              <Row label="الباب" hint={lang === "ar" ? "اختياري" : undefined}>
                <input
                  value={article.chapter?.[lang] ?? ""}
                  onChange={(e) =>
                    setArticle({ ...article, chapter: { ...article.chapter, [lang]: e.target.value } })
                  }
                  className={field}
                />
              </Row>

              <Row label="العنوان">
                <input
                  value={article.title[lang] ?? ""}
                  onChange={(e) =>
                    setArticle({ ...article, title: { ...article.title, [lang]: e.target.value } })
                  }
                  className={field}
                />
              </Row>

              <Row label="النبذة">
                <textarea
                  rows={2}
                  value={article.excerpt[lang] ?? ""}
                  onChange={(e) =>
                    setArticle({ ...article, excerpt: { ...article.excerpt, [lang]: e.target.value } })
                  }
                  className={field}
                />
              </Row>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-foreground">الأقسام</h2>
                  <button
                    type="button"
                    onClick={() =>
                      setArticle({
                        ...article,
                        sections: [
                          ...article.sections,
                          { id: `section-${article.sections.length + 1}`, heading: emptyLoc(), body: emptyLoc() },
                        ],
                      })
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-white/10"
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    قسم جديد
                  </button>
                </div>

                <div className="grid gap-4 xl:grid-cols-2">
                  {article.sections.map((sec, i) => {
                    const setSection = (next: ArticleSection) =>
                      setArticle({
                        ...article,
                        sections: article.sections.map((s, n) => (n === i ? next : s)),
                      })
                    return (
                      <section key={i} className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <input
                            dir="ltr"
                            value={sec.id}
                            onChange={(e) => setSection({ ...sec, id: e.target.value })}
                            placeholder="معرّف القسم، مثال intro"
                            className={`${field} font-mono text-xs`}
                          />
                          {article.sections.length > 1 ? (
                            <button
                              type="button"
                              aria-label={`حذف قسم ${i + 1}`}
                              onClick={() =>
                                setArticle({
                                  ...article,
                                  sections: article.sections.filter((_, n) => n !== i),
                                })
                              }
                              className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-white/10 hover:text-red-300"
                            >
                              <X className="size-4" aria-hidden="true" />
                            </button>
                          ) : null}
                        </div>
                        <input
                          value={sec.heading[lang] ?? ""}
                          onChange={(e) =>
                            setSection({ ...sec, heading: { ...sec.heading, [lang]: e.target.value } })
                          }
                          placeholder={i === 0 ? `عنوان فرعي — فارغ في القسم الافتتاحي` : `عنوان القسم بـ${LANG_LABEL[lang]}`}
                          className={`${field} mb-2 font-semibold`}
                        />
                        <textarea
                          rows={6}
                          value={sec.body[lang] ?? ""}
                          onChange={(e) => setSection({ ...sec, body: { ...sec.body, [lang]: e.target.value } })}
                          placeholder={`متن القسم بـ${LANG_LABEL[lang]} — سطر فارغ يفصل الفقرات`}
                          className={field}
                        />
                      </section>
                    )
                  })}
                </div>
              </div>

              <section className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                <h2 className="mb-3 font-bold text-foreground">المصادر</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {(article.sources ?? []).map((src, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] py-1 pe-1 ps-3 text-sm text-foreground"
                    >
                      {src.ar}
                      <button
                        type="button"
                        aria-label={`حذف ${src.ar}`}
                        onClick={() =>
                          setArticle({
                            ...article,
                            sources: (article.sources ?? []).filter((_, n) => n !== i),
                          })
                        }
                        className="rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                      >
                        <X className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                  <select
                    value=""
                    onChange={(e) => {
                      const w = WORKS_CATALOGUE.find((b) => b.ar === e.target.value)
                      if (w) setArticle({ ...article, sources: [...(article.sources ?? []), w] })
                    }}
                    className="rounded-full border border-dashed border-white/20 bg-transparent px-3 py-1.5 text-sm text-muted-foreground"
                  >
                    <option value="">إضافة مصدر…</option>
                    {WORKS_CATALOGUE.filter(
                      (b) => !(article.sources ?? []).some((s) => s.ar === b.ar),
                    ).map((b) => (
                      <option key={b.ar} value={b.ar} className="bg-zinc-900">
                        {b.ar}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              <ProblemsList problems={problems} />

              <div className="sticky bottom-4 flex gap-2">
                <button
                  type="submit"
                  disabled={busy || blocking.length > 0}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-black disabled:opacity-40"
                >
                  <Save className="size-4" aria-hidden="true" />
                  {blocking.length > 0 ? `${blocking.length} خطأ يمنع الحفظ` : "حفظ في GitHub"}
                </button>
              </div>
            </form>
          ) : null}
        </div>
      </div>
    </main>
  )
}
