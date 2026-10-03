import { type Issue, type Lang, displayRef, ui } from "@/lib/fiqh-data"

/**
 * Where a reader's "report a mistake" goes.
 *
 * The site is a static export with no server, so a report leaves through the
 * reader's own app: WhatsApp if a number is set, otherwise e-mail. WhatsApp
 * comes first because a phone with no mail account configured does nothing at
 * all on a mailto: link, and most readers arrive on a phone.
 *
 * Both empty → the link is not rendered. A button that opens nothing teaches
 * readers that reporting does not work, which is worse than no button.
 */
export const REPORT_WHATSAPP = "" // international digits only, e.g. "9665XXXXXXXX"
export const REPORT_EMAIL = ""

export function canReport() {
  return Boolean(REPORT_WHATSAPP || REPORT_EMAIL)
}

/**
 * The prefilled message names the entry by its permanent ref and links to it,
 * so a report is never "the one about prayer" — it is F109, in this language,
 * at this address. The reader only has to write what is wrong.
 */
export function reportHref(issue: Issue, lang: Lang): string | null {
  if (!canReport()) return null
  const ref = displayRef(issue.ref, lang)
  const url =
    typeof window === "undefined"
      ? ""
      : `${window.location.origin}${window.location.pathname}#${issue.ref}`
  const subject = `${ui.reportSubject[lang]} ${ref} — ${issue.title[lang]}`
  const body = `${subject}\n${url}\n\n${ui.reportPrompt[lang]}\n`
  if (REPORT_WHATSAPP) {
    return `https://wa.me/${REPORT_WHATSAPP}?text=${encodeURIComponent(body)}`
  }
  return `mailto:${REPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
