import { ACTIVITY_LABEL, PAYMENT_LABEL, type ActivityState, type Payment, type PaymentState } from "@/lib/account-health"
import type { Tone } from "@/lib/admin-tasks"
import { Pill } from "@/components/dashboard/admin/admin-ui"

export const PAYMENT_TONE: Record<PaymentState, Tone> = {
  "em-dia": "green",
  vencendo: "amber",
  vencido: "red",
  trial: "blue",
  "trial-acabou": "red",
  bloqueado: "gray",
  "sem-acesso": "gray",
}

export const ACTIVITY_TONE: Record<ActivityState, Tone> = {
  ativo: "green",
  esfriando: "amber",
  parado: "red",
  "nunca-usou": "gray",
}

export function PaymentPill({ payment }: { payment: Payment }) {
  return <Pill tone={PAYMENT_TONE[payment.state]}>{PAYMENT_LABEL[payment.state]}</Pill>
}

export function ActivityPill({ state }: { state: ActivityState }) {
  return <Pill tone={ACTIVITY_TONE[state]}>{ACTIVITY_LABEL[state]}</Pill>
}
