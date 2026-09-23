/**
 * Aplicação de escala pediátrica registrada por um médico (tabela
 * patient_scale_results). Dado CLÍNICO DO DONO: toda leitura é escopada por
 * profile_id, e o patient_id amarra o registro ao histórico da criança.
 *
 * `score` e `interpretation` são congelados no momento da aplicação — a
 * definição em `lib/scales/` pode evoluir, o que o médico registrou não muda.
 */
export type ScaleResult = {
  id: string
  profile_id: string
  patient_id: string
  case_id: string | null
  scale_key: string
  answers: Record<string, number>
  score: number | null
  interpretation: string
  applied_at: string
  created_at: string
}

/** Payload de criação; a action calcula score/interpretation, nunca o cliente. */
export type CreateScaleResultPayload = {
  patient_id: string
  case_id: string | null
  scale_key: string
  answers: Record<string, number>
  score: number | null
  interpretation: string
}
