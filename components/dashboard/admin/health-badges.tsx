import {
  ACTIVITY_LABEL,
  PAYMENT_LABEL,
  paymentDetail,
  type ActivityState,
  type Payment,
  type PaymentState,
} from "@/lib/account-health"
import { cn } from "@/lib/utils"

const PAYMENT_TONE: Record<PaymentState, string> = {
  "em-dia": "bg-emerald-500",
  vencendo: "bg-amber-500",
  vencido: "bg-destructive",
  trial: "bg-primary",
  "trial-acabou": "bg-destructive",
  bloqueado: "bg-muted-foreground",
  "sem-acesso": "bg-muted-foreground/40",
}

const ACTIVITY_TONE: Record<ActivityState, string> = {
  ativo: "bg-emerald-500",
  esfriando: "bg-amber-500",
  parado: "bg-destructive",
  "nunca-usou": "bg-muted-foreground/40",
}

/** Ponto colorido + rótulo: cor só reforça, o texto sempre diz o estado. */
function Dot({ tone, label, detail }: { tone: string; label: string; detail?: string | null }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm whitespace-nowrap">
      <span className={cn("size-1.5 shrink-0 rounded-full", tone)} aria-hidden />
      <span className="font-medium">{label}</span>
      {detail ? <span className="text-muted-foreground">· {detail}</span> : null}
    </span>
  )
}

export function PaymentStatus({ payment }: { payment: Payment }) {
  return <Dot tone={PAYMENT_TONE[payment.state]} label={PAYMENT_LABEL[payment.state]} detail={paymentDetail(payment)} />
}

export function ActivityStatus({ state, detail }: { state: ActivityState; detail?: string | null }) {
  return <Dot tone={ACTIVITY_TONE[state]} label={ACTIVITY_LABEL[state]} detail={detail} />
}
