import {
  format,
  formatDistanceToNow,
  isValid,
  parseISO,
} from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

function toDate(value: string | Date | null | undefined): Date | null {
  if (value == null) return null
  let d: Date
  if (typeof value === "string") {
    try {
      d = parseISO(value)
    } catch {
      return null
    }
  } else {
    d = value
  }
  return isValid(d) ? d : null
}

/**
 * Formats a date string or Date for display (DD/MM/YYYY).
 */
export function formatDate(
  value: string | Date | null | undefined
): string {
  const d = toDate(value)
  if (!d) return ""
  return format(d, "dd/MM/yyyy", { locale: ptBR })
}

/**
 * Formats date and time for display (DD/MM/YYYY às HH:mm).
 */
export function formatDateTime(
  value: string | Date | null | undefined
): string {
  const d = toDate(value)
  if (!d) return ""
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

/**
 * Formats a date as relative time in PT-BR (e.g. "há 2 horas", "há 3 dias").
 */
export function formatRelativeTime(
  value: string | Date | null | undefined
): string {
  const d = toDate(value)
  if (!d) return ""
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR })
}

/**
 * Formats a time string for display (HH:mm).
 */
export function formatTime(
  value: string | Date | null | undefined
): string {
  const d = toDate(value)
  if (!d) return ""
  return format(d, "HH:mm", { locale: ptBR })
}

/**
 * Formats a string of digits as Brazilian phone number.
 * - 10 digits (landline): (XX) XXXX-XXXX
 * - 11 digits (cell): (XX) XXXXX-XXXX
 */
export function formatBrazilianPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2) return d ? `(${d}` : ""
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  const isCell = d[2] === "9" && d.length > 6
  if (isCell) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
}

/**
 * Strips HTML tags and decodes common entities to plain text.
 * Use for displaying rich-text content as plain text (e.g. in PDF preview).
 */
export function stripHtml(html: string): string {
  if (!html?.trim()) return ""
  const withoutTags = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim()
  return withoutTags
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
}

/**
 * Converts TipTap/HTML to plain text while preserving line breaks from
 * `<br>`, paragraphs, headings, list items, etc.
 *
 * Prefer this over {@link stripHtml} when exporting rich text to PDF or anywhere
 * newlines matter — `stripHtml` replaces tags with spaces and collapses `\s+` to a single space.
 */
export function htmlToPlainMultiline(html: string): string {
  if (!html?.trim()) return ""
  let s = html
  s = s.replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
  s = s.replace(/<br\s*\/?>/gi, "\n")
  s = s.replace(/<\/p>/gi, "\n\n")
  s = s.replace(/<\/div>/gi, "\n")
  s = s.replace(/<\/tr>/gi, "\n")
  s = s.replace(/<\/li>/gi, "\n")
  s = s.replace(/<\/h[1-6]>/gi, "\n\n")
  s = s.replace(/<[^>]+>/g, "")
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
  s = s.replace(/\n{3,}/g, "\n\n")
  s = s.replace(/[ \t]+\n/g, "\n")
  s = s.replace(/\n[ \t]+/g, "\n")
  return s.trim()
}

/** Heuristic: legacy TipTap/HTML snapshots (templates) vs plain textarea (e.g. "febre < 38°C" is not HTML). */
const looksLikeHtmlFragment = (s: string): boolean => /<[a-zA-Z!/]/.test(s)

/**
 * Normalizes prescription free-text fields for PDF/preview.
 * Plain textarea content is returned trimmed; legacy saved HTML runs {@link htmlToPlainMultiline}.
 */
export function prescriptionFieldToPlainText(value: string | undefined | null): string {
  const s = value?.trim() ?? ""
  if (!s) return ""
  if (looksLikeHtmlFragment(s)) return htmlToPlainMultiline(s)
  return s
}

/**
 * Formats a full Brazilian number (with optional country code 55) for display.
 * Example: "553197815503" → "+55 (31) 9781-5503"
 */
export function formatLinkedPhone(digits: string): string {
  const d = digits.replace(/\D/g, "")
  if (!d.length) return ""
  const withCountry = d.startsWith("55") && d.length >= 12
  const local = withCountry ? d.slice(2) : d.slice(0, 11)
  if (local.length <= 2) return d ? `+55 (${local}` : ""
  if (local.length <= 6)
    return withCountry
      ? `+55 (${local.slice(0, 2)}) ${local.slice(2)}`
      : `(${local.slice(0, 2)}) ${local.slice(2)}`
  const isCell = local[2] === "9" && local.length > 6
  const part = isCell
    ? `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
    : `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
  return withCountry ? `+55 ${part}` : part
}
