export type InviteEmailInput = {
  /** "Dr." / "Dra." — vazio para clínicas ou nomes sem título. */
  title: string | null
  /** Primeiro nome (ou nome da clínica). */
  name: string
  city: string | null
  kind: "médico" | "clínica"
  /** Quem assina: o primeiro nome do remetente. */
  senderName: string
  /** Para onde a resposta vai (mesmo endereço do reply_to). */
  replyTo: string
}

export const INVITE_SITE_URL = "https://falaped.com.br"
/** Teste curto para dar urgência; o preço cheio é a âncora e o de fundador é o desconto por fechar dentro do teste. */
export const INVITE_TRIAL_DAYS = 15
export const INVITE_PLAN_PRICE = 149.99
export const INVITE_EARLY_PRICE = 49.99
/** 149,99 → 49,99 = 66,7% de desconto; arredondado para dizer no e-mail. */
export const INVITE_DISCOUNT_PERCENT = Math.round((1 - INVITE_EARLY_PRICE / INVITE_PLAN_PRICE) * 100)
/** 149.99 → "R$ 149,99". */
const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`
export const INVITE_UTM = "utm_source=email&utm_medium=convite&utm_campaign=prospeccao-mg"

/** Paleta da marca: azul da logo, tinta e papel. Tudo inline porque e-mail não lê <style>. */
const BLUE = "#8ab4eb"
const INK = "#172033"
const PAPER = "#f3f5f9"
const MUTED = "#667085"
const FONT = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"
const HEAVY = "'Arial Black',Impact,'Helvetica Neue',Arial,sans-serif"

const escapeHtml = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)

/**
 * Logo "Empilhado B" refeita em tabela: bloco branco FALA sobre bloco azul PED, borda
 * preta e sombra dura. Sem imagem porque Gmail não carrega SVG e não temos PNG hospedado.
 */
const logoHtml = () => {
  const block = (text: string, bg: string) =>
    `<td style="background:${bg};border:3px solid ${INK};padding:4px 10px;font-family:${HEAVY};font-weight:900;font-size:20px;line-height:1;letter-spacing:-1px;color:${INK}">${text}</td>`
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;border-spacing:0">
      <tr>${block("FALA", "#ffffff")}</tr>
      <tr><td style="height:2px;font-size:0;line-height:0">&nbsp;</td></tr>
      <tr>${block("PED", BLUE)}</tr>
    </table>`
}

/**
 * Convite frio, curto, assinado pelo CEO em primeira pessoa (relato, sem tom de anúncio).
 * Exclusividade: o nome saiu de uma seleção de pediatras de Minas para a versão inicial.
 * Escassez: grupo pequeno, 15 dias de teste e o desconto só vale para quem fechar dentro deles.
 * Âncora: preço cheio dito na cara, depois o de fundador com o percentual.
 * Uma ação só: responder dizendo que tem interesse — o cadastro é feito depois, em contato
 * direto. P.S. de saída e List-Unsubscribe são o que a LGPD pede para contato não
 * solicitado. Sem "grátis" no assunto: é gatilho comum de spam em PT-BR.
 */
export function buildInviteEmail(input: InviteEmailInput): { subject: string; html: string; text: string } {
  const firstName = input.name.trim().split(/\s+/)[0] ?? input.name
  const isClinic = input.kind === "clínica"
  const addressee = isClinic ? input.name : [input.title, firstName].filter(Boolean).join(" ")
  const salutation = isClinic ? `Olá, equipe da ${input.name},` : `Olá, ${addressee},`
  const where = input.city ? ` de ${input.city} e região` : " de Minas"
  const subject = isClinic
    ? `Convite para a ${input.name}: versão inicial do Falaped`
    : `${addressee}, um convite para a versão inicial do Falaped`

  const replyHref = `mailto:${input.replyTo}?subject=${encodeURIComponent("Tenho interesse no Falaped")}&body=${encodeURIComponent(`Olá, ${input.senderName}. Tenho interesse em testar o Falaped por ${INVITE_TRIAL_DAYS} dias.`)}`
  const siteHref = `${INVITE_SITE_URL}?${INVITE_UTM}`

  const intro = isClinic
    ? `Sou ${input.senderName}, CEO do Falaped. A clínica saiu numa seleção que fiz de consultórios de pediatria${where}, e quis escrever pessoalmente.`
    : `Sou ${input.senderName}, CEO do Falaped. Seu nome saiu numa seleção que fiz de pediatras${where}, e quis escrever pessoalmente.`
  const pain =
    "Construindo o Falaped, ouvi de muitos pediatras a mesma história: a consulta termina, a criança já saiu, e o médico continua no teclado. Evolução, receita, atestado, relatório para a escola."
  const vision = isClinic
    ? "O Falaped usa inteligência artificial para tirar isso das costas da equipe. Enquanto o médico conversa com a família e examina a criança, a IA transcreve a consulta e a transforma em evolução, receita, atestado e relatório, nos modelos da clínica. Ele revisa, assina e chama o próximo."
    : "O Falaped usa inteligência artificial para tirar isso das suas costas. Enquanto você conversa com a família e examina a criança, a IA transcreve a consulta e a transforma em evolução, receita, atestado e relatório, nos seus modelos. Você revisa, assina e chama o próximo."
  const exclusivity = isClinic
    ? "Estou convidando um grupo pequeno de pediatras de Minas para a versão inicial. Quem entra agora ajuda a decidir o que o Falaped vira, e em troca a clínica tem:"
    : "Estou convidando um grupo pequeno de pediatras de Minas para a versão inicial. Quem entra agora ajuda a decidir o que o Falaped vira, e em troca você tem:"
  const offerLines = [
    `${INVITE_TRIAL_DAYS} dias grátis, sem cartão.`,
    `Fechando dentro desses ${INVITE_TRIAL_DAYS} dias, o plano sai por ${brl(INVITE_EARLY_PRICE)} por mês em vez de ${brl(INVITE_PLAN_PRICE)}: ${INVITE_DISCOUNT_PERCENT}% de desconto, e o valor fica enquanto a assinatura durar.`,
  ]
  const cta = isClinic
    ? "Se fizer sentido para a clínica, responda este e-mail dizendo que tem interesse. Eu mesmo faço o cadastro e mostro a plataforma em 15 minutos."
    : "Se fizer sentido para o seu consultório, responda este e-mail dizendo que tem interesse. Eu mesmo faço o seu cadastro e mostro a plataforma em 15 minutos."
  const button = "Responder que tenho interesse"
  const site = `Conheça mais em ${INVITE_SITE_URL}`
  const signoff = ["Um abraço,", input.senderName, "CEO · Falaped"]
  const ps = `P.S.: Se não for o momento, responda "não" que eu não escrevo de novo.`

  const text = [
    salutation,
    intro,
    pain,
    vision,
    exclusivity,
    ...offerLines.map((l) => `• ${l}`),
    cta,
    site,
    "",
    ...signoff,
    "",
    ps,
  ].join("\n\n")

  const p = (s: string, extra = "") =>
    `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${INK};${extra}">${escapeHtml(s)}</p>`

  const html = `<div style="margin:0;background:${PAPER};padding:32px 16px;font-family:${FONT};color:${INK}">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:560px;width:100%;border-collapse:separate">
    <tr><td style="padding:0 0 18px">${logoHtml()}</td></tr>
    <tr><td style="background:#ffffff;border:3px solid ${INK};border-radius:14px;padding:28px;box-shadow:8px 8px 0 ${INK}">
      <div style="height:6px;background:${BLUE};border:2px solid ${INK};border-radius:6px;margin:0 0 22px;font-size:0;line-height:0">&nbsp;</div>
      ${p(salutation, "font-size:18px;font-weight:700")}
      ${p(intro)}
      ${p(pain)}
      ${p(vision)}
      ${p(exclusivity)}
      <div style="background:${BLUE}22;border-left:4px solid ${BLUE};padding:12px 14px;border-radius:6px;margin:0 0 18px">
        <ul style="margin:0;padding-left:20px">
          ${offerLines.map((l) => `<li style="margin:0 0 8px;font-size:15px;line-height:1.55;font-weight:700;color:${INK}">${escapeHtml(l)}</li>`).join("\n          ")}
        </ul>
      </div>
      ${p(cta)}
      <p style="margin:20px 0"><a href="${replyHref}" style="display:inline-block;background:${BLUE};color:${INK};border:3px solid ${INK};text-decoration:none;font-weight:800;font-size:15px;padding:12px 22px;border-radius:8px;box-shadow:4px 4px 0 ${INK}">${button}</a></p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${INK}">Conheça mais em <a href="${siteHref}" style="color:${INK};font-weight:700">falaped.com.br</a></p>
      <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:${INK}">Um abraço,<br><strong>${escapeHtml(input.senderName)}</strong><br><span style="color:${MUTED}">CEO · Falaped</span></p>
      <p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${MUTED}">${escapeHtml(ps)}</p>
    </td></tr>
    <tr><td style="padding:22px 8px 0;font-size:12px;line-height:1.5;color:${MUTED};text-align:center">Falaped · plataforma de inteligência artificial para pediatras · <a href="${siteHref}" style="color:${MUTED}">falaped.com.br</a></td></tr>
  </table>
</div>`

  return { subject, html, text }
}
