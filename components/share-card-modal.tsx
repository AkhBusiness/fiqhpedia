"use client"

import { useRef, useState } from "react"
import { toPng } from "html-to-image"
import { BookOpen, Download, Loader2 } from "lucide-react"
import { Modal } from "@/components/modal"
import { categories, type Issue, type Lang, type SchoolKey, rtlLangs, schools, ui } from "@/lib/fiqh-data"

/** Concrete hex accents (html-to-image resolves these reliably). */
const HEX: Record<SchoolKey, string> = {
  hanafi: "#f59e0b",
  maliki: "#10b981",
  shafii: "#3b82f6",
  hanbali: "#06b6d4",
}

interface ShareCardModalProps {
  issue: Issue | null
  lang: Lang
  visibleSchools?: SchoolKey[]
  onClose: () => void
}

export function ShareCardModal({ issue, lang, visibleSchools, onClose }: ShareCardModalProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)
  const isRtl = rtlLangs.includes(lang)

  const shownSchools = issue
    ? visibleSchools
      ? schools.filter((s) => visibleSchools.includes(s.key))
      : schools
    : []

  const bookName = issue ? categories.find((c) => c.id === issue.categoryId)?.name[lang] ?? "" : ""

  async function handleDownload() {
    if (!cardRef.current || !issue) return
    setBusy(true)
    try {
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: "#09090b",
      })
      const link = document.createElement("a")
      link.download = `fiqh-${issue.id}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.log("[v0] share image export failed:", (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={issue !== null}
      onClose={onClose}
      title={ui.shareCard[lang]}
      description={ui.shareCardDesc[lang]}
      closeLabel={ui.close[lang]}
      size="max-w-xl"
    >
      {issue ? (
        <div className="flex flex-col gap-5">
          {/* Exportable card */}
          <div
            ref={cardRef}
            dir={isRtl ? "rtl" : "ltr"}
            className="relative overflow-hidden rounded-2xl p-6"
            style={{
              background: "linear-gradient(160deg, #111113 0%, #09090b 60%, #0b0b0d 100%)",
              border: "1px solid rgba(255,255,255,0.10)",
              color: "#fafafa",
              fontFamily: "var(--font-sans, system-ui, sans-serif)",
            }}
          >
            {/* Brand header */}
            <div className="flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "14px" }}>
              <span
                className="flex size-9 items-center justify-center rounded-xl"
                style={{ border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)" }}
              >
                <BookOpen className="size-5" style={{ color: "#fafafa" }} aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-tight" style={{ color: "#fafafa" }}>
                  {ui.appTitle[lang]}
                </div>
                <div className="text-[11px]" style={{ color: "#a1a1aa" }}>
                  {bookName}
                  {issue.chapter ? ` — ${issue.chapter[lang]}` : ""}
                </div>
              </div>
            </div>

            {/* Title */}
            <h3 className="mt-4 text-balance text-lg font-bold leading-snug" style={{ color: "#fafafa" }}>
              {issue.title[lang]}
            </h3>
            <p className="mt-1.5 text-pretty text-sm leading-relaxed" style={{ color: "#a1a1aa" }}>
              {issue.summary[lang]}
            </p>

            {/* Rulings */}
            <div className="mt-4 flex flex-col gap-2.5">
              {shownSchools.map((s) => {
                const r = issue.rulings[s.key]
                const hex = HEX[s.key]
                return (
                  <div
                    key={s.key}
                    className="rounded-xl p-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${hex}55` }}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <span className="size-2 rounded-full" style={{ background: hex }} aria-hidden="true" />
                      <span className="text-xs font-bold" style={{ color: hex }}>
                        {s.name[lang]}
                      </span>
                    </div>
                    <p className="text-pretty text-[13px] leading-relaxed" style={{ color: "#e4e4e7" }}>
                      {r.ruling[lang]}
                    </p>
                    {r.references.length > 0 ? (
                      <p className="mt-1 text-[10px]" style={{ color: "#71717a" }}>
                        {ui.reference[lang]}: {r.references.map((ref) => ref[lang]).join(" — ")}
                      </p>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div
              className="mt-4 flex items-center justify-between"
              style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px" }}
            >
              <span className="text-[11px] font-semibold" style={{ color: "#a1a1aa" }}>
                {ui.appSubtitle[lang]}
              </span>
              <span className="text-[11px] font-bold" style={{ color: "#fafafa" }}>
                {ui.issue[lang]} {issue.number}
              </span>
            </div>
          </div>

          {/* Download action */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                {ui.preparingImage[lang]}
              </>
            ) : (
              <>
                <Download className="size-4" aria-hidden="true" />
                {ui.downloadImage[lang]}
              </>
            )}
          </button>
        </div>
      ) : null}
    </Modal>
  )
}
