/** Campos do cadastro rápido levados para a ficha completa (valores do formulário). */
export type PatientDraft = {
  name: string
  birth_date: string
  responsible: string
  contact_phone: string
  sex: string
}

// sessionStorage e não a URL: nome e telefone de criança não devem ir para histórico nem logs.
const KEY = "falaped:patient-draft"

export function savePatientDraft(draft: PatientDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft))
  } catch {}
}

/** Lê e apaga o rascunho; null se não houver. */
export function takePatientDraft(): PatientDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return raw ? (JSON.parse(raw) as PatientDraft) : null
  } catch {
    return null
  }
}
