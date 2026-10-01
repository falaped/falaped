/** Paleta da marca: azul da logo, tinta e papel. Tudo inline porque e-mail não lê <style>. */
const BLUE = "#8ab4eb"
const INK = "#172033"
const PAPER = "#f3f5f9"
const MUTED = "#667085"
const FONT = "-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"
const HEAVY = "'Arial Black',Impact,'Helvetica Neue',Arial,sans-serif"
const SITE = "https://falaped.com.br"
const UTM = "utm_source=email&utm_medium=admin&utm_campaign=mensagens"

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

/** Links soltos no texto viram <a>; o do site ganha UTM para medir o clique. */
const linkify = (html: string) =>
  html.replace(/https?:\/\/[^\s<]+/g, (url) => {
    const href = url.startsWith(SITE) ? `${url}${url.includes("?") ? "&" : "?"}${UTM}` : url
    return `<a href="${href}" style="color:${INK};font-weight:700">${url.replace(/^https?:\/\//, "")}</a>`
  })

/**
 * E-mail da marca a partir do texto do modelo já preenchido. Parágrafos por linha em branco;
 * linhas com "• " viram a caixa de destaque; parágrafo que começa com "P.S." sai em cinza.
 * Assinatura do CEO no fim, sempre: o tom é ele escrevendo em primeira pessoa.
 */
export function buildBrandEmail(input: { body: string; senderName: string }): { html: string; text: string } {
  const blocks = input.body.trim().split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
  const signoff = ["Um abraço,", input.senderName, "CEO · Falaped"]
  const ps = blocks.at(-1)?.startsWith("P.S.") ? blocks.pop()! : null

  const blockHtml = (block: string, first: boolean) => {
    const lines = block.split("\n")
    if (lines.every((l) => l.startsWith("• ")))
      return `<div style="background:${BLUE}22;border-left:4px solid ${BLUE};padding:12px 14px;border-radius:6px;margin:0 0 18px">
        <ul style="margin:0;padding-left:20px">
          ${lines.map((l) => `<li style="margin:0 0 8px;font-size:15px;line-height:1.55;font-weight:700;color:${INK}">${linkify(escapeHtml(l.slice(2)))}</li>`).join("\n          ")}
        </ul>
      </div>`
    const extra = first ? "font-size:18px;font-weight:700" : ""
    return `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:${INK};${extra}">${linkify(escapeHtml(block).replace(/\n/g, "<br>"))}</p>`
  }

  const text = [...blocks, signoff.join("\n"), ...(ps ? [ps] : [])].join("\n\n")
  const html = `<div style="margin:0;background:${PAPER};padding:32px 16px;font-family:${FONT};color:${INK}">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width:560px;width:100%;border-collapse:separate">
    <tr><td style="padding:0 0 18px">${logoHtml()}</td></tr>
    <tr><td style="background:#ffffff;border:3px solid ${INK};border-radius:14px;padding:28px;box-shadow:8px 8px 0 ${INK}">
      <div style="height:6px;background:${BLUE};border:2px solid ${INK};border-radius:6px;margin:0 0 22px;font-size:0;line-height:0">&nbsp;</div>
      ${blocks.map((b, i) => blockHtml(b, i === 0)).join("\n      ")}
      <p style="margin:24px 0 0;font-size:15px;line-height:1.6;color:${INK}">Um abraço,<br><strong>${escapeHtml(input.senderName)}</strong><br><span style="color:${MUTED}">CEO · Falaped</span></p>
      ${ps ? `<p style="margin:24px 0 0;font-size:13px;line-height:1.5;color:${MUTED}">${escapeHtml(ps)}</p>` : ""}
    </td></tr>
    <tr><td style="padding:22px 8px 0;font-size:12px;line-height:1.5;color:${MUTED};text-align:center">Falaped · plataforma de inteligência artificial para pediatras · <a href="${SITE}?${UTM}" style="color:${MUTED}">falaped.com.br</a></td></tr>
  </table>
</div>`
  return { html, text }
}
