import { isInTrial } from "@/lib/account-status"

const DAY_MS = 24 * 60 * 60 * 1000

export type PaymentState = "em-dia" | "vencendo" | "vencido" | "trial" | "trial-acabou" | "bloqueado" | "sem-acesso"
export type ActivityState = "ativo" | "esfriando" | "parado" | "nunca-usou"

/** Dias até vencer o trial ou a assinatura; negativo = já venceu. */
export type Payment = { state: PaymentState; daysLeft: number | null }

/** Faixa de "vence logo": entra na fila do Painel. */
export const EXPIRING_DAYS = 7

/** `valid_until` é data (sem hora): vale até o fim do dia em Brasília. */
function endOfDayBrasilia(date: string): Date {
  return new Date(`${date}T23:59:59-03:00`)
}

function daysUntil(end: Date, now: Date): number {
  return Math.ceil((end.getTime() - now.getTime()) / DAY_MS)
}

/**
 * Eixo de pagamento da conta. `paid` sem `paid_until` é pago sem vencimento lançado
 * (as contas de antes do histórico de pagamentos).
 */
export function paymentState(
  row: { status: string | null; trial_ends_at: string | null; paid_until: string | null },
  now: Date = new Date(),
): Payment {
  if (row.status === "blocked") return { state: "bloqueado", daysLeft: null }
  if (row.status === "paid") {
    if (!row.paid_until) return { state: "em-dia", daysLeft: null }
    const days = daysUntil(endOfDayBrasilia(row.paid_until), now)
    if (days < 0) return { state: "vencido", daysLeft: days }
    return { state: days <= EXPIRING_DAYS ? "vencendo" : "em-dia", daysLeft: days }
  }
  if (!row.trial_ends_at) return { state: "sem-acesso", daysLeft: null }
  const days = daysUntil(new Date(row.trial_ends_at), now)
  return isInTrial(row.trial_ends_at, now)
    ? { state: "trial", daysLeft: days }
    : { state: "trial-acabou", daysLeft: days }
}

/** Eixo de atividade: o último registro de qualquer tipo (caso, receita, paciente…). */
export function activityState(lastActivityAt: string | null, now: Date = new Date()): ActivityState {
  if (!lastActivityAt) return "nunca-usou"
  const days = (now.getTime() - new Date(lastActivityAt).getTime()) / DAY_MS
  if (days <= 7) return "ativo"
  if (days <= 21) return "esfriando"
  return "parado"
}

export const PAYMENT_LABEL: Record<PaymentState, string> = {
  "em-dia": "Em dia",
  vencendo: "Vence logo",
  vencido: "Vencido",
  trial: "Em teste",
  "trial-acabou": "Teste acabou",
  bloqueado: "Bloqueado",
  "sem-acesso": "Sem acesso",
}

export const ACTIVITY_LABEL: Record<ActivityState, string> = {
  ativo: "Ativo",
  esfriando: "Esfriando",
  parado: "Parado",
  "nunca-usou": "Nunca usou",
}

/** "faltam 3 dias", "vence hoje", "venceu há 2 dias" — o complemento do rótulo de pagamento. */
export function paymentDetail(payment: Payment): string | null {
  const d = payment.daysLeft
  if (d === null) return null
  if (d === 0) return "acaba hoje"
  if (d < 0) return `há ${-d} ${-d === 1 ? "dia" : "dias"}`
  return `faltam ${d} ${d === 1 ? "dia" : "dias"}`
}

/** Teste que acabou há mais que isso sai da fila: a conversa já esfriou. */
const TRIAL_ENDED_WINDOW_DAYS = 30

/**
 * Por que a conta pede uma ação sua agora — a fila do Painel e o filtro "Atenção".
 * Lista vazia = nada a fazer.
 */
export function attentionReasons(
  row: { status: string | null; trial_ends_at: string | null; paid_until: string | null; last_activity_at: string | null },
  now: Date = new Date(),
): string[] {
  const payment = paymentState(row, now)
  const activity = activityState(row.last_activity_at, now)
  const reasons: string[] = []
  const d = payment.daysLeft ?? 0

  const inDays = d === 0 ? "hoje" : `em ${d} ${d === 1 ? "dia" : "dias"}`
  if (payment.state === "trial" && d <= EXPIRING_DAYS) reasons.push(`Teste acaba ${inDays}`)
  if (payment.state === "trial-acabou" && -d <= TRIAL_ENDED_WINDOW_DAYS)
    reasons.push(`Teste acabou ${paymentDetail(payment)} sem pagamento`)
  if (payment.state === "vencendo") reasons.push(`Assinatura vence ${inDays}`)
  if (payment.state === "vencido") reasons.push(`Assinatura venceu ${paymentDetail(payment)}`)

  const hasAccess = payment.state === "em-dia" || payment.state === "vencendo" || payment.state === "trial"
  if (hasAccess && activity === "nunca-usou")
    reasons.push(payment.state === "trial" ? "Em teste e ainda não registrou nada" : "Pagou e nunca registrou nada")
  if (hasAccess && activity === "parado") reasons.push("Parado há mais de 3 semanas")
  if (hasAccess && activity === "esfriando") reasons.push("Esfriando: sem registro há mais de 1 semana")

  return reasons
}

export function accountDisplayName(row: { first_name: string | null; surname: string | null }): string {
  return [row.first_name, row.surname].filter(Boolean).join(" ").trim() || "Sem nome"
}
