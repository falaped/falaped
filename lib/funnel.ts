import type { ProspectRow } from "@/modules/admin/list-prospects"

const DAY_MS = 24 * 60 * 60 * 1000
export const HOT_DAYS = 14
export const WARM_DAYS = 30

export const FUNNEL_STAGES = ["novo", "contatado", "respondeu", "em-teste", "cliente", "perdido"] as const
export type FunnelStage = (typeof FUNNEL_STAGES)[number]

export const STAGE_LABEL: Record<FunnelStage, string> = {
  novo: "Novo",
  contatado: "Contatado",
  respondeu: "Respondeu",
  "em-teste": "Em teste",
  cliente: "Cliente",
  perdido: "Perdido",
}

export type Temperature = "quente" | "morno" | "frio"
export const TEMPERATURE_LABEL: Record<Temperature, string> = { quente: "Quente", morno: "Morna", frio: "Fria" }

type FunnelRow = Pick<
  ProspectRow,
  "status" | "profile" | "referred_by" | "clicked_at" | "opened_at" | "replied_at" | "lead_at" | "last_channel" | "last_contact_at" | "next_contact_at"
>

/** Etapa do funil: com conta, a etapa vem do perfil (pago = cliente); sem conta, do que o admin marcou. */
export function funnelStage(row: Pick<FunnelRow, "status" | "profile">): FunnelStage {
  if (row.profile) return row.profile.status === "paid" ? "cliente" : "em-teste"
  return row.status
}

const daysSince = (iso: string | null, now: Date) =>
  iso ? Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS) : Infinity
const ago = (days: number) => (days <= 0 ? "hoje" : days === 1 ? "ontem" : `há ${days} dias`)

/**
 * Temperatura automática. Quente: indicação direta (sempre), ou clicou, respondeu, veio da landing ou criou conta em até 14 dias.
 * Morna: abriu o e-mail ou recebeu WhatsApp em até 30 dias. O resto é fria.
 * Cliente e perdido não têm temperatura (null).
 */
export function temperature(row: FunnelRow, now: Date = new Date()): { temp: Temperature; reason: string | null } | null {
  const stage = funnelStage(row)
  if (stage === "cliente" || stage === "perdido") return null
  if (row.referred_by) return { temp: "quente", reason: `indicação da ${row.referred_by}` }

  const hot: [string | null, string][] = [
    [row.replied_at, "respondeu"],
    [row.clicked_at, "clicou"],
    [row.lead_at, "veio pela landing"],
    [row.profile?.created_at ?? null, "criou conta"],
  ]
  const recentHot = hot
    .map(([at, what]) => ({ days: daysSince(at, now), what }))
    .filter((s) => s.days <= HOT_DAYS)
    .sort((a, b) => a.days - b.days)[0]
  if (recentHot) return { temp: "quente", reason: `${recentHot.what} ${ago(recentHot.days)}` }

  const opened = daysSince(row.opened_at, now)
  const whatsapp = row.last_channel === "whatsapp" ? daysSince(row.last_contact_at, now) : Infinity
  if (opened <= WARM_DAYS || whatsapp <= WARM_DAYS)
    return opened <= whatsapp
      ? { temp: "morno", reason: `abriu ${ago(opened)}` }
      : { temp: "morno", reason: `WhatsApp ${ago(whatsapp)}` }
  return { temp: "frio", reason: null }
}

/** Próximo contato venceu e a pessoa ainda está nas etapas manuais. */
export function isFollowUpDue(row: FunnelRow, now: Date = new Date()): boolean {
  const stage = funnelStage(row)
  return (
    !!row.next_contact_at &&
    new Date(row.next_contact_at) <= now &&
    (stage === "novo" || stage === "contatado" || stage === "respondeu")
  )
}

const TEMP_RANK: Record<Temperature, number> = { quente: 0, morno: 2, frio: 3 }

/** Ordem da lista: quentes, follow-up vencido, mornas, depois o resto por nome. */
export function funnelRank(row: FunnelRow, now: Date = new Date()): number {
  const t = temperature(row, now)
  if (t?.temp === "quente") return 0
  if (isFollowUpDue(row, now)) return 1
  return t ? TEMP_RANK[t.temp] : 4
}

const GENERIC_EMAIL = /^(contato|info|sac|atendimento|recepcao|agendamento|secretaria|adm|financeiro|comercial|faleconosco|marcacao|clinica|consultorio|ouvidoria)/

/** E-mail de clínica: caixa genérica (contato@, sac@…) ou o mesmo e-mail em mais de uma pessoa. */
export function isClinicEmail(email: string | null, shared: ReadonlySet<string>): boolean {
  if (!email) return false
  const e = email.trim().toLowerCase()
  return shared.has(e) || GENERIC_EMAIL.test(e)
}
