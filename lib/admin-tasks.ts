import { activityState, paymentState, EXPIRING_DAYS } from "@/lib/account-health"
import { formatDate } from "@/lib/formatters"

const DAY_MS = 24 * 60 * 60 * 1000

export type Tone = "green" | "blue" | "amber" | "red" | "gray"
export type TaskGroup = "agora" | "semana" | "prospeccao"
/** Tipo da pendência: agrupa a frase-resumo do Painel ("2 clientes pagaram e…"). */
export type TaskKind =
  | "pagou-sem-uso"
  | "teste-acabando"
  | "teste-acabou"
  | "teste-sem-uso"
  | "renovacao"
  | "parada"
  | "lead"
  | "quente"

/** Pedaço da explicação; `b` sai em negrito (o número que importa). */
export type WhyPart = string | { b: string }

export type AdminTask = {
  key: string
  kind: TaskKind
  group: TaskGroup
  name: string
  pill: { label: string; tone: Tone }
  why: WhyPart[]
  href: string
  action: { label: string; href: string; kind: "whatsapp" | "email" } | null
}

type AccountRow = {
  profile_id: string
  first_name: string | null
  surname: string | null
  email: string | null
  phone: string | null
  created_at: string
  status: string | null
  trial_ends_at: string | null
  paid_until: string | null
  last_activity_at: string | null
  last_sign_in_at: string | null
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`
const daysAgo = (iso: string, now: Date) => Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / DAY_MS))
/** "hoje", "há 1 dia", "há 5 dias". */
const ago = (iso: string, now: Date) => {
  const n = daysAgo(iso, now)
  return n === 0 ? "hoje" : `há ${plural(n, "dia", "dias")}`
}

/** Um número em dígitos com DDI 55: aceita "553191234567", "31 91234-5678", "(31) 91234-5678". */
function oneNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 12 || digits.length === 13) return digits.startsWith("55") ? digits : null
  if (digits.length === 10 || digits.length === 11) return `55${digits}`
  return null
}

/**
 * Celular para o WhatsApp. A captação traz vários números no mesmo campo
 * ("(31) 2180-7593, (31) 99528-0803"): fica o primeiro celular (9 depois do DDD), senão o primeiro válido.
 */
export function whatsappDigits(phone: string | null | undefined): string | null {
  const numbers = (phone ?? "").split(/[,;/|]|\s+e\s+/).map(oneNumber).filter((n): n is string => n !== null)
  return numbers.find((n) => n.length === 13 && n[4] === "9") ?? numbers[0] ?? null
}

export function whatsappHref(phone: string | null | undefined, text: string): string | null {
  const digits = whatsappDigits(phone)
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null
}

function contact(
  label: string,
  phone: string | null,
  email: string | null,
  text: string,
): AdminTask["action"] {
  const wa = whatsappHref(phone, text)
  if (wa) return { label, href: wa, kind: "whatsapp" }
  if (email) return { label: "Mandar e-mail", href: `mailto:${email}?body=${encodeURIComponent(text)}`, kind: "email" }
  return null
}

/**
 * A pendência mais urgente de uma conta, com a explicação e a mensagem pronta.
 * Null = conta em dia e usando. Mesmo critério de `attentionReasons`.
 */
export function accountTask(row: AccountRow, sender: string, now: Date = new Date()): AdminTask | null {
  const payment = paymentState(row, now)
  const activity = activityState(row.last_activity_at, now)
  const name = [row.first_name, row.surname].filter(Boolean).join(" ").trim() || "Sem nome"
  const hi = `Oi, ${row.first_name ?? name}! Aqui é o ${sender}, do Falaped.`
  const base = { key: row.profile_id, name, href: `/dashboard/admin/users/${row.profile_id}` }
  const d = payment.daysLeft ?? 0
  const hasAccess = payment.state === "em-dia" || payment.state === "vencendo" || payment.state === "trial"
  const lastLogin = row.last_sign_in_at ? `Último login ${formatDate(row.last_sign_in_at).slice(0, 5)}.` : ""
  const say = (label: string, text: string) => contact(label, row.phone, row.email, `${hi} ${text}`)

  if (payment.state === "vencido")
    return {
      ...base,
      kind: "renovacao",
      group: "agora",
      pill: { label: "Assinatura vencida", tone: "red" },
      why: ["A assinatura venceu ", { b: `há ${plural(-d, "dia", "dias")}` }, "."],
      action: say("Combinar renovação", "Sua assinatura venceu. Quer que eu te mande o Pix para renovar?"),
    }
  if (payment.state === "trial-acabou" && -d <= 30)
    return {
      ...base,
      kind: "teste-acabou",
      group: "agora",
      pill: { label: "Teste acabou", tone: "red" },
      why: ["O teste acabou ", { b: `há ${plural(-d, "dia", "dias")}` }, " sem pagamento."],
      action: say("Conversar sobre o plano", "Seu teste grátis acabou. Quer continuar usando? Consigo manter a condição de fundador para você."),
    }
  if ((payment.state === "em-dia" || payment.state === "vencendo") && activity === "nunca-usou")
    return {
      ...base,
      kind: "pagou-sem-uso",
      group: "agora",
      pill: { label: row.last_sign_in_at ? "Pagou, nunca usou" : "Pagou, nunca entrou", tone: "amber" },
      why: row.last_sign_in_at
        ? ["Conta criada ", { b: ago(row.created_at, now) }, ` e nenhum registro ainda. ${lastLogin}`]
        : ["Conta paga e ", { b: "nunca fez login" }, "."],
      action: say("Oferecer ajuda", "Vi que você ainda não começou a usar. Quer que eu te ajude a configurar em 15 minutos?"),
    }
  if (payment.state === "trial" && d <= EXPIRING_DAYS)
    return {
      ...base,
      kind: "teste-acabando",
      group: d <= 2 ? "agora" : "semana",
      pill: { label: d === 0 ? "Teste acaba hoje" : `Teste · ${plural(d, "dia", "dias")}`, tone: "blue" },
      why: [
        "O teste acaba ",
        { b: d === 0 ? "hoje" : `em ${plural(d, "dia", "dias")}` },
        activity === "nunca-usou" ? " e ainda não registrou nada." : ".",
      ],
      action: say(
        "Lembrar do fim do teste",
        `Seu teste grátis acaba ${d === 0 ? "hoje" : `em ${plural(d, "dia", "dias")}`}. Como está sendo? Se quiser continuar, te passo a condição de fundador.`,
      ),
    }
  if (payment.state === "vencendo")
    return {
      ...base,
      kind: "renovacao",
      group: "semana",
      pill: { label: `Vence em ${plural(d, "dia", "dias")}`, tone: "amber" },
      why: ["A assinatura vence ", { b: d === 0 ? "hoje" : `em ${plural(d, "dia", "dias")}` }, "."],
      action: say("Combinar renovação", "Sua assinatura vence nos próximos dias. Quer que eu te mande o Pix para renovar?"),
    }
  if (payment.state === "trial" && activity === "nunca-usou")
    return {
      ...base,
      kind: "teste-sem-uso",
      group: "semana",
      pill: { label: "Testando sem usar", tone: "amber" },
      why: ["Começou o teste ", { b: ago(row.created_at, now) }, ` e ainda não registrou nada. ${lastLogin}`],
      action: say("Oferecer ajuda", "Vi que você criou a conta mas ainda não testou. Quer que eu te mostre em 15 minutos?"),
    }
  if (hasAccess && (activity === "parado" || activity === "esfriando"))
    return {
      ...base,
      kind: "parada",
      group: "semana",
      pill: { label: activity === "parado" ? "Parada" : "Esfriando", tone: activity === "parado" ? "red" : "amber" },
      why: ["Sem registro no app ", { b: ago(row.last_activity_at!, now) }, "."],
      action: say("Perguntar como está", "Senti sua falta por aqui! Aconteceu alguma coisa? Se algo atrapalhou, me conta que eu resolvo."),
    }
  return null
}

type LeadRow = { id: string; name: string | null; email: string | null; phone: string | null; detail: string | null; created_at: string }

/** Lead da landing com até 14 dias: os 2 primeiros dias são "agora". */
export function leadTask(lead: LeadRow, sender: string, now: Date = new Date()): AdminTask | null {
  const age = daysAgo(lead.created_at, now)
  if (age > 14) return null
  const name = lead.name || lead.email || lead.phone || "Lead sem nome"
  const when = ago(lead.created_at, now)
  return {
    key: `lead-${lead.id}`,
    kind: "lead",
    group: age <= 2 ? "agora" : "semana",
    name,
    pill: { label: "Lead · landing", tone: "gray" },
    why: ["Preencheu o formulário ", { b: when }, lead.detail ? ` pela campanha ${lead.detail}.` : "."],
    href: `/dashboard/admin/funil/${lead.id}`,
    action: contact(
      "Dar boas-vindas",
      lead.phone,
      lead.email,
      `Oi${lead.name ? `, ${lead.name.split(" ")[0]}` : ""}! Aqui é o ${sender}, do Falaped. Vi que você se cadastrou no nosso site. Posso te mostrar como funciona?`,
    ),
  }
}

type ProspectRow = {
  id: string
  title: string | null
  name: string
  city: string | null
  email: string | null
  phone: string | null
  status: string
  email_status: string | null
  profile_id: string | null
}

/** Prospect que abriu ou clicou no convite, não respondeu e não tem conta: é quem chamar primeiro. */
export function prospectTask(p: ProspectRow, sender: string): AdminTask | null {
  // Já virou conta: quem cuida é a fila de clientes.
  if (p.profile_id) return null
  if (p.status !== "contatado" || (p.email_status !== "clicou" && p.email_status !== "aberto")) return null
  const clicked = p.email_status === "clicou"
  const name = [p.title, p.name].filter(Boolean).join(" ")
  return {
    key: `prospect-${p.id}`,
    kind: "quente",
    group: "prospeccao",
    name,
    pill: clicked ? { label: "Quente", tone: "red" } : { label: "Abriu o convite", tone: "amber" },
    why: [clicked ? "Clicou no link do convite" : "Abriu o convite", " e ", { b: "ainda não respondeu" }, p.city ? `. ${p.city}.` : "."],
    href: `/dashboard/admin/funil/${p.id}`,
    action: contact(
      "Chamar no WhatsApp",
      p.phone,
      p.email,
      `Oi, ${name}! Aqui é o ${sender}, do Falaped. Te mandei um convite por e-mail esses dias. Posso te mostrar em 10 minutos como funciona?`,
    ),
  }
}
