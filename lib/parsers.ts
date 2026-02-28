/**
 * Removes non-digit characters from a phone string and returns the digits.
 * Validates that the result has 10 or 11 digits (Brazilian phone format).
 * @throws Error if digits count is invalid
 */
export function parsePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 11) {
    throw new Error("Telefone deve ter 10 ou 11 dígitos");
  }
  return digits;
}

/**
 * Returns phone in DB format: 55 + DDD + 8 digits (12 digits total, without mobile 9).
 * Accepts: 10 or 11 digits (adds 55, strips leading 9 from mobile when 11), or 12/13 with 55 (normalizes to 12).
 */
export function toDbPhoneFormat(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("55")) {
    return digits;
  }
  if (digits.length === 13 && digits.startsWith("55")) {
    return "55" + digits.slice(2, 4) + digits.slice(5);
  }
  if (digits.length === 10) {
    return "55" + digits;
  }
  if (digits.length === 11) {
    return "55" + digits.slice(0, 2) + digits.slice(3);
  }
  throw new Error("Telefone deve ter 10 ou 11 dígitos");
}
