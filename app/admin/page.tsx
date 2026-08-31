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
/* Repo + types                                                        */
/* ------------------------------------------------------------------ */

const REPO = "AkhBusiness/fiqhpedia"
const BRANCH = "main"
const DIR = "data/content/issues"
const TOKEN_KEY = "tibyan-admin-token"

const LANGS = ["ar", "en", "ru", "es"] as const
type Lang = (typeof LANGS)[number]
const LANG_LABEL: Record<Lang, string> = {
  ar: "العربية",
  en: "English",
  ru: "Русский",
  es: "Español",
}

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
  chapter: Loc
  title: Loc
  summary: Loc
  rulings: Record<SchoolKey, Ruling>
}

/** Book titles keyed by school, from the locked list in data/terms.json. */
const BOOKS_BY_SCHOOL: Record<string, { ar: string; en: string; ru: string; es: string }[]> =
  (() => {
    const out: Record<string, { ar: string; en: string; ru: string; es: string }[]> = {}
    const src = (termsData as unknown as {
      books: Record<string, { school: string; en: string; ru: string; es?: string }>
    }).books
    for (const [ar, meta] of Object.entries(src)) {
      const school = meta.school
      ;(out[school] ??= []).push({ ar, en: meta.en, ru: meta.ru, es: meta.es ?? meta.en })
    }
    for (const list of Object.values(out)) list.sort((a, b) => a.ar.localeCompare(b.ar, "ar"))
    return out
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

function check(issue: Issue): Problem[] {
  const p: Problem[] = []
  const push = (field: string, msg: string, hard = true) => p.push({ field, msg, hard })

  if (!/^F\d+$/.test(issue.ref)) push("ref", "الرقم المرجعي بالشكل F ثم رقم")
  if (!issue.id.trim()) push("id", "المعرّف مطلوب")
  if (!issue.seq || issue.seq < 1) push("seq", "الترتيب داخل الفصل رقم موجب")

  for (const l of LANGS) {
    const soft = l === "es" // الإسبانية لم تُطلق بعد، فنقصها تنبيه لا خطأ
    const ch = issue.chapter[l]?.trim() ?? ""
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

    // علامات لاتينية داخل العربية
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
      if (!t) push(`${s.key}.text.${l}`, `حكم ${s.label} ناقص بـ${LANG_LABEL[l]}`, l !== "es")
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

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [tokenDraft, setTokenDraft] = useState("")
  const [files, setFiles] = useState<{ name: string; sha: string }[]>([])
  const [current, setCurrent] = useState<{ path: string; sha: string } | null>(null)
  const [issue, setIssue] = useState<Issue | null>(null)
  const [lang, setLang] = useState<Lang>("ar")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    setToken(window.localStorage.getItem(TOKEN_KEY))
  }, [])

  const loadList = useCallback(
    async (t: string) => {
      setBusy(true)
      setError(null)
      try {
        const data = (await gh(t, `/repos/${REPO}/contents/${DIR}?ref=${BRANCH}`)) as {
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
    },
    [],
  )

  useEffect(() => {
    if (token) void loadList(token)
  }, [token, loadList])

  async function open(name: string) {
    if (!token) return
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const path = `${DIR}/${name}`
      const data = (await gh(token, `/repos/${REPO}/contents/${path}?ref=${BRANCH}`)) as {
        content: string
        sha: string
      }
      const parsed = JSON.parse(fromBase64(data.content)) as Issue
      for (const s of SCHOOLS) parsed.rulings[s.key].sources ??= []
      setIssue(parsed)
      setCurrent({ path, sha: data.sha })
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  function blank(): Issue {
    const next =
      Math.max(0, ...files.map((f) => parseInt(f.name.replace(/\D/g, ""), 10) || 0)) + 1
    const empty = () => ({ ar: "", en: "", ru: "", es: "" })
    return {
      ref: `F${next}`,
      id: "",
      bookId: "taharah",
      seq: 1,
      chapter: empty(),
      title: empty(),
      summary: empty(),
      rulings: {
        hanafi: { text: empty(), sources: [] },
        maliki: { text: empty(), sources: [] },
        shafii: { text: empty(), sources: [] },
        hanbali: { text: empty(), sources: [] },
      },
    }
  }

  const problems = useMemo(() => (issue ? check(issue) : []), [issue])
  const blocking = problems.filter((p) => p.hard)

  async function save() {
    if (!token || !issue) return
    setBusy(true)
    setError(null)
    try {
      const path = current?.path ?? `${DIR}/${issue.ref}.json`
      const body: Record<string, unknown> = {
        message: `${current ? "تعديل" : "إضافة"} ${issue.ref} — ${issue.title.ar || ""}`.trim(),
        content: toBase64(JSON.stringify(issue, null, 2) + "\n"),
        branch: BRANCH,
      }
      if (current?.sha) body.sha = current.sha
      const res = (await gh(token, `/repos/${REPO}/contents/${path}`, {
        method: "PUT",
        body: JSON.stringify(body),
      })) as { content: { sha: string } }
      setCurrent({ path, sha: res.content.sha })
      setSaved(`حُفظ ${issue.ref}. سيُنشر الموقع خلال دقيقة.`)
      await loadList(token)
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
            onClick={() => void loadList(token)}
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
        {/* قائمة المسائل */}
        <aside
          className={`border-white/10 lg:w-64 lg:shrink-0 lg:border-e ${issue ? "hidden lg:block" : ""}`}
        >
          <div className="p-3">
            <button
              type="button"
              onClick={() => {
                setIssue(blank())
                setCurrent(null)
                setSaved(null)
              }}
              className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-2 text-sm font-semibold text-foreground hover:bg-white/10"
            >
              <Plus className="size-4" aria-hidden="true" />
              مسألة جديدة
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
        <div className="flex-1 p-4 lg:p-6">
          {!issue ? (
            <p className="mt-20 text-center text-sm text-muted-foreground">
              اختر مسألة من القائمة، أو أنشئ واحدة جديدة.
            </p>
          ) : (
            <form
              className="mx-auto flex max-w-3xl flex-col gap-6"
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

              {/* اللغة تُبدَّل مرة واحدة لكل الحقول، لا صندوقاً لكل لغة تحت كل حقل */}
              <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
                {LANGS.map((l) => {
                  const missing = [
                    issue.chapter[l],
                    issue.title[l],
                    issue.summary[l],
                    ...SCHOOLS.map((s) => issue.rulings[s.key].text[l]),
                  ].filter((v) => !v?.trim()).length
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

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
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
                  value={issue.chapter[lang] ?? ""}
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
                            onClick={() =>
                              set({ ...r, sources: r.sources.filter((_, n) => n !== i) })
                            }
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

              {problems.length > 0 ? (
                <ul className="flex list-none flex-col gap-1.5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-sm">
                  {problems.map((p, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-2 ${p.hard ? "text-red-300" : "text-amber-300"}`}
                    >
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {p.msg}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 text-sm text-emerald-300">
                  <Check className="size-4" aria-hidden="true" />
                  المسألة مستوفية.
                </p>
              )}

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
          )}
        </div>
      </div>
    </main>
  )
}
