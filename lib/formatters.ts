/**
 * Formats a date string or Date for display (DD/MM/YYYY).
 */
export function formatDate(value: string | Date | null | undefined): string {
  if (value == null) return ""
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

/**
 * Formats date and time for display (DD/MM/YYYY às HH:mm).
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value == null) return ""
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Formats a date as relative time in PT-BR (e.g. "há 2 horas", "há 3 dias").
 */
export function formatRelativeTime(value: string | Date | null | undefined): string {
  if (value == null) return ""
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""

  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMinutes < 1) return "agora"
  if (diffMinutes < 60) return `há ${diffMinutes} min`
  if (diffHours < 24) return `há ${diffHours}h`
  if (diffDays === 1) return "ontem"
  if (diffDays < 7) return `há ${diffDays} dias`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `há ${weeks} sem`
  }

  return formatDate(d)
}

/**
 * Formats a time string for display (HH:mm).
 */
export function formatTime(value: string | Date | null | undefined): string {
  if (value == null) return ""
  const d = typeof value === "string" ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

/**
 * Formats a string of digits as Brazilian phone number.
 * - 10 digits (landline): (XX) XXXX-XXXX
 * - 11 digits (cell): (XX) XXXXX-XXXX
 */
export function formatBrazilianPhone(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  const isCell = d[2] === "9" && d.length > 6;
  if (isCell) {
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }
  return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

/**
 * Formats a full Brazilian number (with optional country code 55) for display.
 * Example: "553197815503" → "+55 (31) 9781-5503"
 */
export function formatLinkedPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (!d.length) return "";
  const withCountry = d.startsWith("55") && d.length >= 12;
  const local = withCountry ? d.slice(2) : d.slice(0, 11);
  if (local.length <= 2) return d ? `+55 (${local}` : "";
  if (local.length <= 6)
    return withCountry ? `+55 (${local.slice(0, 2)}) ${local.slice(2)}` : `(${local.slice(0, 2)}) ${local.slice(2)}`;
  const isCell = local[2] === "9" && local.length > 6;
  const part =
    isCell
      ? `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`
      : `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return withCountry ? `+55 ${part}` : part;
}
