import { BOOKS_WHATSAPP } from "@/modules/books/constants"

export type ProductionEmailInput = {
  /** Primeiro nome de quem comprou (book_leads.first_name). */
  firstName: string
  childName: string
  /** Título do livro já renderizado com o nome da criança. */
  title: string
}

const escapeHtml = (v: string) =>
  v.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string)

/** WhatsApp da venda em formato de leitura: (31) 99781-5503. */
const WHATSAPP_LABEL = `(${BOOKS_WHATSAPP.slice(2, 4)}) ${BOOKS_WHATSAPP.slice(4, 9)}-${BOOKS_WHATSAPP.slice(9)}`

/**
 * Aviso enviado ao comprador quando o gestor confirma o Pix e assume o livro:
 * o livro entrou em produção e o PDF chega pelo WhatsApp.
 */
export function buildProductionEmail({ firstName, childName, title }: ProductionEmailInput): {
  subject: string
  html: string
  text: string
} {
  const subject = `O livro de ${childName} já está sendo produzido`
  const lines = [
    `Olá, ${firstName}!`,
    `Recebemos a confirmação do seu Pix e o livro “${title}” entrou em produção agora.`,
    `As 20 páginas são ilustradas uma a uma com o rosto de ${childName} — leva alguns minutos. Assim que ficar pronto, o PDF chega no seu WhatsApp, no mesmo número do pedido.`,
    `Qualquer dúvida, responda este e-mail ou fale com a gente no WhatsApp ${WHATSAPP_LABEL}.`,
  ]

  const html = `<div style="margin:0;background:#faf7f2;padding:32px 16px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#18181b">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:2px solid #18181b;border-radius:18px;padding:28px">
    <p style="margin:0 0 20px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Falaped Books</p>
    <h1 style="margin:0 0 18px;font-size:24px;line-height:1.2">
      <span style="background:linear-gradient(transparent 58%,#f5c21a 58%)">${escapeHtml(subject)}</span>
    </h1>
    ${lines.map((line) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${escapeHtml(line)}</p>`).join("\n    ")}
    <p style="margin:24px 0 0;font-size:15px;font-weight:700">— Falaped Books</p>
  </div>
</div>`

  return { subject, html, text: lines.join("\n\n") }
}
