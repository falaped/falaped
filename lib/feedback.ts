import { z } from "zod"

export const FEEDBACK_KINDS = ["sugestao", "problema", "elogio"] as const
export type FeedbackKind = (typeof FEEDBACK_KINDS)[number]

export const FEEDBACK_STATUSES = ["novo", "em-analise", "feito"] as const
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number]

export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  sugestao: "Sugestão de melhoria",
  problema: "Algo não funcionou",
  elogio: "Elogio",
}

export const FEEDBACK_STATUS_LABEL: Record<FeedbackStatus, string> = {
  novo: "Novo",
  "em-analise": "Em análise",
  feito: "Feito",
}

export const FEEDBACK_MAX = 4000

export const sendFeedbackSchema = z.object({
  kind: z.enum(FEEDBACK_KINDS),
  message: z.string().trim().min(1, "Escreva o que você quer contar.").max(FEEDBACK_MAX, "Texto muito longo."),
  page: z.string().max(300).optional(),
})
export type SendFeedbackInput = z.infer<typeof sendFeedbackSchema>

/** Ordem importa: o primeiro prefixo que casa vence (Consulta antes de Consultas). */
const PAGES: [RegExp, string][] = [
  [/^\/dashboard\/cases\/[^/]+/, "Consulta"],
  [/^\/dashboard\/cases/, "Consultas"],
  [/^\/dashboard\/patients\/new/, "Cadastro de criança"],
  [/^\/dashboard\/patients\/[^/]+/, "Ficha da criança"],
  [/^\/dashboard\/patients/, "Pacientes"],
  [/^\/dashboard\/services/, "Documentos"],
  [/^\/dashboard\/financial/, "Financeiro"],
  [/^\/dashboard\/templates/, "Modelos"],
  [/^\/dashboard\/vaccines/, "Vacinas"],
  [/^\/dashboard\/profile/, "Perfil"],
  [/^\/dashboard\/admin/, "Admin"],
  [/^\/dashboard\/?$/, "Início"],
]

/** Rótulo da tela de onde o feedback veio; o banco guarda só o caminho. */
export function feedbackPageLabel(path: string | null): string {
  if (!path) return "Tela não informada"
  return PAGES.find(([re]) => re.test(path))?.[1] ?? path
}
