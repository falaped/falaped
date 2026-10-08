const fold = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()

/**
 * A criança bate com a busca se cada palavra digitada aparece no nome, no responsável
 * ou no telefone (só dígitos). Sem acento e sem diferença de maiúsculas.
 */
export function matchPatientQuery(
  patient: { name: string; responsible: string | null; contactPhone: string | null },
  query: string,
): boolean {
  const text = fold(`${patient.name} ${patient.responsible ?? ""}`)
  const phone = patient.contactPhone?.replace(/\D/g, "") ?? ""
  return fold(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word) || (/^\d+$/.test(word) && phone.includes(word)))
}
