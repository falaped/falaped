import type { ZodError } from "zod"

/**
 * Zod v4 sets `error.message` to a JSON string of issues — never show that to users.
 * This builds short PT-BR copy from individual issues instead.
 */
const ZOD_GENERIC_EN = /^Invalid input:/i

const FIELD_LABELS_PT: Record<string, string> = {
  type: "Tipo do atestado",
  payload: "Dados do formulário",
  locationState: "Estado (local)",
  issuedAt: "Data de emissão",
  patientName: "Nome do paciente",
  birthDate: "Data de nascimento",
  attendanceDate: "Data do atendimento",
  timeStart: "Horário inicial",
  timeEnd: "Horário final",
  periodo: "Período",
  observations: "Observações",
  activities: "Atividades",
  validity: "Validade",
  daysAway: "Dias de afastamento",
  startDate: "Data de início do afastamento",
  cid10: "CID-10",
  canLeaveHome: "Pode sair de casa",
  companionName: "Nome do acompanhante",
  consultationDate: "Data da consulta",
  medications: "Medicamentos",
  name: "Nome do medicamento",
  dosage: "Dosagem",
  posology: "Posologia",
  duration: "Duração",
  orientations: "Orientações",
  warningSigns: "Sinais de alerta",
  additionalNotes: "Anotações adicionais",
}

function lastStringPathSegment(path: (string | number | symbol)[]): string {
  for (let i = path.length - 1; i >= 0; i--) {
    const p = path[i]
    if (typeof p === "string") return p
  }
  return ""
}

/** Full sentences for fields where "X é obrigatório" reads poorly (e.g. booleans). */
const REQUIRED_SENTENCE_PT: Record<string, string> = {
  canLeaveHome: "Informe se o paciente pode sair de casa.",
}

function labelForPath(path: (string | number | symbol)[]): string {
  const seg = lastStringPathSegment(path)
  if (!seg) return "Campo"
  return FIELD_LABELS_PT[seg] ?? seg.replace(/_/g, " ")
}

export function zodErrorToUserMessage(
  error: ZodError,
  fallback = "Verifique os dados e tente novamente.",
): string {
  const issues = error.issues
  if (issues.length === 0) return fallback

  const lines: string[] = []
  const seen = new Set<string>()

  for (const issue of issues) {
    const path = issue.path
    const raw = issue.message.trim()
    let line: string

    if (!ZOD_GENERIC_EN.test(raw)) {
      line = raw
    } else if (
      raw.includes("received undefined") ||
      issue.code === "invalid_type"
    ) {
      const seg = lastStringPathSegment(path)
      line =
        seg && REQUIRED_SENTENCE_PT[seg]
          ? REQUIRED_SENTENCE_PT[seg]
          : `${labelForPath(path)} é obrigatório.`
    } else {
      line = `${labelForPath(path)}: preenchimento inválido.`
    }

    if (!seen.has(line)) {
      seen.add(line)
      lines.push(line)
    }
  }

  const maxShown = 3
  if (lines.length <= maxShown) {
    return lines.join(" ")
  }
  return `${lines.slice(0, maxShown).join(" ")} (+${lines.length - maxShown} pendência(s))`
}
