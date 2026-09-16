import path from "node:path"
import PDFDocument from "pdfkit"

import { BOOK_PAGE_COUNT, DEDICATION_INDEX, ENDING_INDEX } from "@/modules/books/constants"

export type BuildBookPdfInput = {
  /** 20 imagens (JPEG ou PNG) na ordem dos índices 0..19. */
  pages: Buffer[]
  childName: string
  /** Texto da dedicatória (página 1), já com nome e gênero renderizados. */
  dedication: string
  pediatricianName?: string | null
  pediatricianLogo?: Buffer | null
}

// A4 retrato em pontos. A imagem 3:4 é cortada ~3% em cima e embaixo (cover).
const W = 595.28
const H = 841.89
const MARGIN = 34
const FONTS = path.join(process.cwd(), "modules/books/pdf/fonts")
const SERIF = path.join(FONTS, "CormorantGaramond.ttf")
const DISPLAY = path.join(FONTS, "PlayfairDisplay.ttf")
const NAVY = "#16233f"
const CREAM = "#f7efd8"
const GOLD = "#ffd35c"

export const BOOK_ENDING_CTA = "Criado com carinho pelo Falaped · falaped.com.br"

function star(doc: PDFKit.PDFDocument, cx: number, cy: number, r: number) {
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r * 0.45 : r
    const x = cx + rr * Math.cos(a)
    const y = cy + rr * Math.sin(a)
    if (i === 0) doc.moveTo(x, y)
    else doc.lineTo(x, y)
  }
  doc.closePath().fill(CREAM)
}

/** Painel navy translúcido com borda creme e estrela, mesmo desenho do painel que o modelo pinta nas páginas de história. */
function panel(doc: PDFKit.PDFDocument, y: number, height: number) {
  const pw = W - 2 * MARGIN
  doc.save().fillOpacity(0.82).roundedRect(MARGIN, y, pw, height, 16).fill(NAVY).restore()
  doc.save().lineWidth(1).strokeColor("#f3e9c9").roundedRect(MARGIN + 5, y + 5, pw - 10, height - 10, 12).stroke().restore()
  star(doc, W / 2, y + 5, 7)
}

function drawDedication(doc: PDFKit.PDFDocument, childName: string, dedication: string) {
  const pw = W - 2 * MARGIN
  const pad = 26
  const textWidth = pw - 2 * pad
  doc.font(DISPLAY).fontSize(30)
  const titleH = doc.heightOfString(`Para ${childName}`, { width: textWidth, align: "center" })
  doc.font(SERIF).fontSize(20)
  const bodyH = doc.heightOfString(dedication, { width: textWidth, align: "center", lineGap: 5 })
  const height = pad + titleH + 14 + bodyH + pad + 8
  const y = MARGIN + 20
  panel(doc, y, height)
  doc.font(DISPLAY).fontSize(30).fillColor(GOLD).text(`Para ${childName}`, MARGIN + pad, y + pad + 8, { width: textWidth, align: "center" })
  doc.font(SERIF).fontSize(20).fillColor(CREAM).text(dedication, MARGIN + pad, y + pad + 8 + titleH + 14, { width: textWidth, align: "center", lineGap: 5 })
}

function drawEnding(doc: PDFKit.PDFDocument, pediatricianName: string | null | undefined, logo: Buffer | null | undefined) {
  const pw = W - 2 * MARGIN
  const pad = 22
  const textWidth = pw - 2 * pad
  const gift = pediatricianName?.trim() ? `Um presente de ${pediatricianName.trim()}` : null
  const logoH = logo ? 54 : 0
  doc.font(DISPLAY).fontSize(34)
  const fimH = doc.heightOfString("Fim", { width: textWidth, align: "center" })
  doc.font(SERIF).fontSize(18)
  const giftH = gift ? doc.heightOfString(gift, { width: textWidth, align: "center" }) + 8 : 0
  doc.fontSize(13)
  const ctaH = doc.heightOfString(BOOK_ENDING_CTA, { width: textWidth, align: "center" })
  const height = pad + fimH + 10 + giftH + (logo ? logoH + 10 : 0) + ctaH + pad + 8
  const y = H - MARGIN - height
  panel(doc, y, height)
  let cursor = y + pad + 8
  doc.font(DISPLAY).fontSize(34).fillColor(GOLD).text("Fim", MARGIN + pad, cursor, { width: textWidth, align: "center" })
  cursor += fimH + 10
  if (gift) {
    doc.font(SERIF).fontSize(18).fillColor(CREAM).text(gift, MARGIN + pad, cursor, { width: textWidth, align: "center" })
    cursor += giftH
  }
  if (logo) {
    doc.image(logo, (W - 160) / 2, cursor, { fit: [160, logoH], align: "center", valign: "center" })
    cursor += logoH + 10
  }
  doc.font(SERIF).fontSize(13).fillColor(CREAM).text(BOOK_ENDING_CTA, MARGIN + pad, cursor, { width: textWidth, align: "center" })
}

/**
 * Monta o PDF do livro: 20 páginas A4 retrato com a ilustração full-bleed.
 * Capa e história já trazem o texto na imagem; a dedicatória (1) e o final (19)
 * recebem painel e texto desenhados aqui, com as fontes OFL embutidas.
 */
export function buildBookPdf(input: BuildBookPdfInput): Promise<Buffer> {
  if (input.pages.length !== BOOK_PAGE_COUNT)
    throw new Error(`[BOOKS] PDF precisa de ${BOOK_PAGE_COUNT} páginas, recebeu ${input.pages.length}`)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: 0,
      autoFirstPage: false,
      info: { Title: `Livro de ${input.childName}`, Author: "Falaped" },
    })
    const chunks: Buffer[] = []
    doc.on("data", (c: Buffer) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)

    input.pages.forEach((image, index) => {
      doc.addPage()
      doc.image(image, 0, 0, { cover: [W, H], align: "center", valign: "center" })
      if (index === DEDICATION_INDEX) drawDedication(doc, input.childName, input.dedication)
      if (index === ENDING_INDEX) drawEnding(doc, input.pediatricianName, input.pediatricianLogo)
    })
    doc.end()
  })
}
