import { format, isValid, parse, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"

const DISPLAY_PATTERN = "dd/MM/yyyy"
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

const COMPLETE_DD_MM_YYYY = /^\d{2}\/\d{2}\/\d{4}$/

/** True when the string has exactly dd/mm/aaaa (10 chars), before calendar checks. */
export function isCompleteBrazilianDateString(value: string): boolean {
  return COMPLETE_DD_MM_YYYY.test(value.trim())
}

/**
 * True when the value is a finished date: either Brazilian dd/mm/aaaa or ISO yyyy-mm-dd (date only).
 * Used so Server Actions can re-validate payloads already transformed by the client Zod pipeline.
 */
export function isCompleteBirthDateInputString(value: string): boolean {
  const t = value.trim()
  if (t === "") return false
  if (isCompleteBrazilianDateString(t)) return true
  if (ISO_DATE_ONLY.test(t)) return isValid(parseISO(t))
  return false
}

/**
 * Normalizes form display (dd/mm/aaaa) or ISO date-only (yyyy-mm-dd) to yyyy-mm-dd for Supabase.
 */
export function parseBirthDateFormValueToIso(value: string): string | null {
  const t = value.trim()
  if (t === "") return null
  if (isCompleteBrazilianDateString(t)) return parseBrazilianDateStringToIso(t)
  if (ISO_DATE_ONLY.test(t)) {
    const parsed = parseISO(t)
    if (!isValid(parsed)) return null
    return format(parsed, "yyyy-MM-dd")
  }
  return null
}

/**
 * Parses a Brazilian calendar date string (dd/MM/yyyy) to ISO date (yyyy-MM-dd).
 * Returns null if empty, invalid, or not a real calendar date (e.g. 31/02).
 */
export function parseBrazilianDateStringToIso(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null

  const parsed = parse(trimmed, DISPLAY_PATTERN, new Date(), { locale: ptBR })
  if (!isValid(parsed)) return null

  const parts = trimmed.split("/")
  if (parts.length !== 3) return null
  const day = Number(parts[0])
  const month = Number(parts[1])
  const year = Number(parts[2])
  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12
  )
    return null

  if (
    parsed.getDate() !== day ||
    parsed.getMonth() + 1 !== month ||
    parsed.getFullYear() !== year
  )
    return null

  return format(parsed, "yyyy-MM-dd")
}

/**
 * Restricts input to digits and inserts slashes for dd/mm/aaaa (max 8 digits).
 */
export function maskBrazilianDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`
}
