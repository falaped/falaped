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
