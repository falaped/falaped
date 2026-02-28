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
