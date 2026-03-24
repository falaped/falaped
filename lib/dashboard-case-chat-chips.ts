import {
  CASE_CHAT_CHIP_AI_MIN_USER_TURNS,
  CASE_CHAT_CHIP_MAX_PER_RESPONSE,
  CASE_CHAT_SUBSTANTIVE_USER_MESSAGE_MIN_CHARS,
} from "@/lib/constants"

export const CASE_CHAT_PRIMARY_CHIPS = [
  "Resumir principais pontos do atendimento",
  "Calcular IMC com os dados informados",
  "Sugerir perguntas para o responsável",
  "Gerar relatório deste caso",
]

export const CASE_CHAT_CRITICAL_CHIPS = [
  "Encerrar caso",
  "Gerar atestado",
  "Gerar receita",
]

export type CaseChatChipSuggestion = {
  id: string
  label: string
}

function toChipId(label: string): string {
  return label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

export function getFallbackCaseChatChips(): CaseChatChipSuggestion[] {
  const labels = [...CASE_CHAT_PRIMARY_CHIPS]
  return labels.slice(0, CASE_CHAT_CHIP_MAX_PER_RESPONSE).map((label) => ({
    id: toChipId(label),
    label,
  }))
}

export function computeHasSubstantiveUserContent(content: string): boolean {
  return content.trim().length >= CASE_CHAT_SUBSTANTIVE_USER_MESSAGE_MIN_CHARS
}

export function shouldEnableAiChipSuggestions(totalUserTurns: number): boolean {
  return totalUserTurns >= CASE_CHAT_CHIP_AI_MIN_USER_TURNS
}

