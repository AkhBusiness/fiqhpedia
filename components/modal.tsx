"use client"

import { useEffect, type ReactNode } from "react"
import { X } from "lucide-react"

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  description?: string
  closeLabel?: string
  children: ReactNode
  /** max-width utility, e.g. "max-w-lg" */
  size?: string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  closeLabel = "Close",
  children,
  size = "max-w-lg",
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="animate-modal-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-xl sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`animate-modal-panel relative flex max-h-[90dvh] w-full ${size} flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-zinc-950/80 shadow-2xl shadow-black/60 backdrop-blur-2xl sm:rounded-3xl`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
          <div className="min-w-0">
            <h2 className="text-balance text-lg font-bold leading-tight text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            title={closeLabel}
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-zinc-400 transition-all duration-200 hover:text-white"
          >
            <X className="size-4.5" aria-hidden="true" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  )
}
