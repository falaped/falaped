/** Modelos de mensagem do admin: momentos, variáveis e preenchimento. */

export const MESSAGE_MOMENTS = [
  "convite",
  "follow-up",
  "boas-vindas",
  "ajuda",
  "teste-acabando",
  "pagamento",
  "reativacao",
] as const
export type MessageMoment = (typeof MESSAGE_MOMENTS)[number]

/** Momentos que fazem sentido para quem ainda não tem conta (lead) e para quem tem (cliente). */
export const LEAD_MOMENTS: readonly MessageMoment[] = ["convite", "follow-up", "boas-vindas"]
export const CLIENT_MOMENTS: readonly MessageMoment[] = ["boas-vindas", "ajuda", "teste-acabando", "pagamento", "reativacao"]

export const MOMENT_LABEL: Record<MessageMoment, string> = {
  convite: "Convite frio",
  "follow-up": "Follow-up",
  "boas-vindas": "Boas-vindas",
  ajuda: "Ajuda para começar",
  "teste-acabando": "Teste acabando",
  pagamento: "Pagamento",
  reativacao: "Reativação",
}

export const MESSAGE_CHANNELS = ["email", "whatsapp"] as const
export type MessageChannel = (typeof MESSAGE_CHANNELS)[number]

/** Oferta dita nas mensagens: teste curto, preço cheio como âncora e o de fundador como desconto. */
export const TRIAL_DAYS = 15
export const PLAN_PRICE = 149.99
export const EARLY_PRICE = 49.99
export const SITE_URL = "https://falaped.com.br"

const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`

export const TEMPLATE_VARS = {
  tratamento: "Dr. Marcos",
  nome: "Marcos",
  cidade: "Belo Horizonte",
  remetente: "Filipe",
  dias_teste: String(TRIAL_DAYS),
  dias_restantes: "3 dias",
  preco_cheio: brl(PLAN_PRICE),
  preco_fundador: brl(EARLY_PRICE),
  link: SITE_URL,
} as const
export type TemplateVar = keyof typeof TEMPLATE_VARS
export type TemplateValues = Record<TemplateVar, string>

/** Troca {variavel} pelo valor; o que não é variável conhecida fica como está. */
export function renderTemplate(text: string, values: TemplateValues): string {
  return text.replace(/\{([a-z_]+)\}/g, (match, key: string) =>
    key in values ? values[key as TemplateVar] : match,
  )
}

/** Valores para uma pessoa: "Dr. Marcos", "Marcos", cidade (Minas se faltar) e dias que faltam do teste. */
export function recipientValues(
  person: { title: string | null; name: string; city: string | null; trialDaysLeft?: number | null },
  sender: string,
): TemplateValues {
  const first = person.name.trim().split(/\s+/)[0] || person.name
  const d = person.trialDaysLeft
  return {
    ...TEMPLATE_VARS,
    tratamento: [person.title, first].filter(Boolean).join(" "),
    nome: first,
    cidade: person.city || "Minas",
    remetente: sender,
    dias_restantes: d == null ? "poucos dias" : d <= 0 ? "hoje" : d === 1 ? "1 dia" : `${d} dias`,
  }
}
