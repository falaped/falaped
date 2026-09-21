import { BOOKS_WHATSAPP } from "@/modules/books/constants"

export type DeliveryEmailInput = {
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

/** Nome do arquivo que o comprador vê no anexo. */
export function bookPdfFilename(childName: string): string {
  const slug = childName
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
  return `livro-${slug || "falaped"}.pdf`
}

/**
 * Entrega final: o livro pronto em anexo. Vai por e-mail porque o link
 * assinado expira em 7 dias e o comprador quer guardar o arquivo — o WhatsApp
 * continua existindo como caminho paralelo.
 */
export function buildDeliveryEmail({ firstName, childName, title }: DeliveryEmailInput): {
  subject: string
  html: string
  text: string
} {
  const subject = `O livro de ${childName} ficou pronto`
  const lines = [
    `Olá, ${firstName}!`,
    `O livro “${title}” está pronto e vai anexado a este e-mail, em PDF.`,
    `São 20 páginas em A4. Dá para ler na tela ou imprimir em casa — se mandar para uma gráfica, peça papel fosco, fica mais bonito.`,
    `Guarde este e-mail: o anexo é seu para sempre e não expira.`,
    `Se quiser outro tema, é só chamar no WhatsApp ${WHATSAPP_LABEL}.`,
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
