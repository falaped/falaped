/**
 * Generic PDF builder: add paragraphs, lines, spacers; layout for medical certificates.
 * Used by medical-certificates and any other feature that needs to produce a PDF.
 */
import type { Readable } from "stream"

/** PDFKit document with methods used by PdfBuilder (including image, dash, page, font). */
type PdfKitDoc = Readable & {
  fontSize(size: number): PdfKitDoc
  font(name: string): PdfKitDoc
  text(
    text: string,
    options?: {
      align?: string
      lineBreak?: boolean
      width?: number
      indent?: number
      continued?: boolean
    },
  ): PdfKitDoc
  moveDown(n?: number): PdfKitDoc
  end(): void
  readonly y: number
  readonly x: number
  moveTo(x: number, y: number): PdfKitDoc
  lineTo(x: number, y: number): PdfKitDoc
  stroke(color?: string): PdfKitDoc
  lineWidth(w: number): PdfKitDoc
  dash(length: number, options?: { space?: number }): PdfKitDoc
  undash(): PdfKitDoc
  image(
    src: Buffer | string,
    x?: number,
    y?: number,
    options?: { width?: number; height?: number; align?: string },
  ): PdfKitDoc
  rect(x: number, y: number, w: number, h: number): PdfKitDoc
  page: { width: number; height: number; margins: { left: number; right: number; top: number; bottom: number } }
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfkitModule = require("pdfkit")
const PDFDocument =
  (typeof pdfkitModule?.default === "function" ? pdfkitModule.default : pdfkitModule) as new (options?: {
    size?: string
    margin?: number
    layout?: string
    margins?: { top: number; bottom: number; left: number; right: number }
  }) => PdfKitDoc

const DEFAULT_MARGIN = 36
const DEFAULT_FONT_SIZE = 11

/** Font sizes and layout for medical certificate. */
export const CERT_LAYOUT = {
  titleSize: 25,
  doctorHeaderSize: 10,
  labelSize: 12,
  bodySize: 11,
  footerSize: 9,
  logoHeight: 24,
  /** Logo at top of page (larger). */
  logoHeaderMaxWidth: 150,
  /** Logo in footer (smaller). */
  logoFooterMaxWidth: 70,
  /** Reserved height at bottom of page for footer (pediatra + date + logo). */
  footerReservedHeight: 85,
  separatorWidthPercent: 0.9,
  borderWidth: 0.5,
  signatureSpacerLines: 2,
} as const

function bufferFromStream(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on("data", (chunk: Buffer) => chunks.push(chunk))
    stream.on("end", () => resolve(Buffer.concat(chunks)))
    stream.on("error", reject)
  })
}

export class PdfBuilder {
  private doc: PdfKitDoc
  private bufferPromise: Promise<Buffer>
  private footerReservedHeight: number

  constructor(options?: { margin?: number; size?: string; footerReservedHeight?: number }) {
    const margin = options?.margin ?? DEFAULT_MARGIN
    this.footerReservedHeight = options?.footerReservedHeight ?? 0
    const bottomMargin = margin + this.footerReservedHeight
    this.doc = new PDFDocument({
      size: options?.size ?? "A4",
      margins: {
        top: margin,
        left: margin,
        right: margin,
        bottom: bottomMargin,
      },
      layout: "portrait",
    }) as PdfKitDoc
    this.bufferPromise = bufferFromStream(this.doc as unknown as Readable)
    this.doc.fontSize(DEFAULT_FONT_SIZE)
  }

  /** Content width (page width minus left and right margins). */
  private get contentWidth(): number {
    const page = this.doc.page
    return page.width - page.margins.left - page.margins.right
  }

  /** Content height (page height minus top and bottom margins). */
  private get contentHeight(): number {
    const page = this.doc.page
    return page.height - page.margins.top - page.margins.bottom
  }

  /** Left X for content area. */
  private get contentLeft(): number {
    return this.doc.page.margins.left
  }

  /** Right X for content area. */
  private get contentRight(): number {
    return this.doc.page.width - this.doc.page.margins.right
  }

  /**
   * Adds a paragraph of text. Uses default font size and wraps to page width.
   */
  addParagraph(text: string): this {
    this.doc.text(text, { align: "justify", lineBreak: true })
    this.doc.moveDown(0.5)
    return this
  }

  /**
   * Adds a body paragraph, centered (certificate body).
   */
  addBodyParagraph(text: string): this {
    this.doc.fontSize(CERT_LAYOUT.bodySize)
    this.doc.text(text, {
      align: "center",
      lineBreak: true,
      width: this.contentWidth,
    })
    this.doc.moveDown(0.5)
    return this
  }

  /**
   * Adds a body paragraph from segments (inline text + bold parts). Uses left alignment so segments flow without overlap.
   */
  addBodyParagraphSegments(segments: Array<{ text: string; bold?: boolean }>): this {
    this.doc.fontSize(CERT_LAYOUT.bodySize)
    const w = this.contentWidth
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]!
      const isLast = i === segments.length - 1
      if (seg.bold) this.doc.font("Helvetica-Bold")
      this.doc.text(seg.text, {
        width: w,
        align: "left",
        continued: !isLast,
        lineBreak: isLast,
      })
      if (seg.bold) this.doc.font("Helvetica")
    }
    this.doc.moveDown(0.5)
    return this
  }

  /**
   * Adds centered title (e.g. "Atestado Médico").
   */
  addTitle(text: string): this {
    this.doc.fontSize(CERT_LAYOUT.titleSize)
    this.doc.text(text, { align: "center", lineBreak: true })
    this.doc.moveDown(0.5)
    this.doc.fontSize(DEFAULT_FONT_SIZE)
    return this
  }

  /**
   * Adds one line of centered text (e.g. doctor name | CRM | RQE).
   */
  addCenteredText(text: string, fontSize?: number): this {
    if (fontSize !== undefined) this.doc.fontSize(fontSize)
    this.doc.text(text, { align: "center", lineBreak: true })
    if (fontSize !== undefined) this.doc.fontSize(DEFAULT_FONT_SIZE)
    return this
  }

  /**
   * Adds an image (e.g. logo) centered. Use logoHeaderMaxWidth for top, logoFooterMaxWidth for footer.
   */
  addImage(buffer: Buffer, options?: { maxWidth?: number; place?: "header" | "footer" }): this {
    const maxWidth =
      options?.maxWidth ??
      (options?.place === "footer" ? CERT_LAYOUT.logoFooterMaxWidth : CERT_LAYOUT.logoHeaderMaxWidth)
    const x = this.contentLeft + (this.contentWidth - maxWidth) / 2
    const y = this.doc.y
    this.doc.image(buffer, x, y, { width: maxWidth })
    this.doc.moveDown(options?.place === "footer" ? 2 : 4)
    return this
  }

  /**
   * Adds vertical space when logo is absent (header).
   */
  addLogoPlaceholder(place?: "header" | "footer"): this {
    this.doc.moveDown(place === "footer" ? 4 : 3)
    return this
  }

  /**
   * Moves to the bottom of the page (reserved footer area) and draws the given lines plus logo.
   * Use when footerReservedHeight was set in the constructor so content does not overlap the footer.
   */
  addPageFooterAtBottom(
    lines: string[],
    logoBuffer?: Buffer | null,
    options?: { footerFontSize?: number },
  ): this {
    const page = this.doc.page
    const footerStartY = page.height - page.margins.bottom - this.footerReservedHeight
    const docWithPos = this.doc as PdfKitDoc & { x: number; y: number }
    docWithPos.y = footerStartY
    docWithPos.x = this.contentLeft
    const fontSize = options?.footerFontSize ?? CERT_LAYOUT.footerSize;
    const firstLine = lines[0];
    this.addCenteredText(firstLine, fontSize)
    this.addHorizontalSeparator();
    const secondLine = lines[1];
    this.addCenteredText(secondLine, fontSize)

    this.addSpacer(1)
    if (logoBuffer && logoBuffer.length > 0) {
      this.addImage(logoBuffer, { place: "footer", maxWidth: 100 })
    } else {
      this.addLogoPlaceholder("footer")
    }
    return this
  }

  /**
   * Adds a horizontal separator line (e.g. below patient block, above footer). Width as fraction of content width, centered.
   */
  addHorizontalSeparator(options?: { widthPercent?: number; lineWidth?: number }): this {
    this.doc.moveDown(0.5)
    const pct = options?.widthPercent ?? CERT_LAYOUT.separatorWidthPercent
    const lineW = options?.lineWidth ?? 0.5
    const w = this.contentWidth * pct
    const x1 = this.contentLeft + (this.contentWidth - w) / 2
    const x2 = x1 + w
    const y = this.doc.y
    this.doc.lineWidth(lineW)
    this.doc.moveTo(x1, y).lineTo(x2, y).stroke()
    this.doc.moveDown(0.5)
    return this
  }

  /**
   * Adds a dashed horizontal line for signature area.
   */
  addSignatureLineDashed(options?: { widthPercent?: number }): this {
    this.doc.moveDown(CERT_LAYOUT.signatureSpacerLines)
    const pct = options?.widthPercent ?? CERT_LAYOUT.separatorWidthPercent
    const w = this.contentWidth * pct
    const x1 = this.contentLeft + (this.contentWidth - w) / 2
    const x2 = x1 + w
    const y = this.doc.y
    this.doc.lineWidth(0.5)
    this.doc.dash(3, { space: 3 })
    this.doc.moveTo(x1, y).lineTo(x2, y).stroke()
    this.doc.undash()
    this.doc.moveDown(0.5)
    return this
  }

  /**
   * Adds a horizontal line (for signature/stamp area). Kept for backward compatibility; prefer addSignatureLineDashed for cert layout.
   */
  addSignatureLine(): this {
    this.doc.moveDown(1)
    const y = this.doc.y
    this.doc.moveTo(this.contentLeft, y).lineTo(this.contentRight, y).stroke()
    this.doc.moveDown(0.5)
    return this
  }

  /**
   * Adds the page border (thin rectangle around content area).
   */
  addPageBorder(): void {
    const m = this.doc.page.margins
    const x = m.left - 1
    const y = m.top - 1
    const w = this.doc.page.width - m.left - m.right + 2
    const h = this.doc.page.height - m.top - m.bottom + 2
    this.doc.lineWidth(CERT_LAYOUT.borderWidth)
    this.doc.rect(x, y, w, h).stroke()
  }

  /**
   * Adds the "Dados do paciente" block: labels in bold, format "Nome:", "Data de Nascimento:", "Responsável:". No separator line.
   */
  addPatientBlock(patient: {
    patientName: string
    birthDate: string
    responsible?: string | null
  }): this {
    const w = this.contentWidth
    this.doc.fontSize(CERT_LAYOUT.bodySize)
    this.doc.font("Helvetica-Bold")
    this.doc.text("Nome: ", { align: "left", lineBreak: false, width: w })
    this.doc.font("Helvetica")
    this.doc.text(patient.patientName, { align: "left", lineBreak: true, width: w })
    this.doc.moveDown(0.25)

    if (patient.birthDate?.trim()) {
      this.doc.font("Helvetica-Bold")
      this.doc.text("Data de Nascimento: ", { align: "left", lineBreak: false, width: w })
      this.doc.font("Helvetica")
      this.doc.text(patient.birthDate.trim(), { align: "left", lineBreak: true, width: w })
      this.doc.moveDown(0.25)

    }
    if (patient.responsible?.trim()) {
      this.doc.font("Helvetica-Bold")
      this.doc.text("Responsável: ", { align: "left", lineBreak: false, width: w })
      this.doc.font("Helvetica")
      this.doc.text(patient.responsible.trim(), { align: "left", lineBreak: true, width: w })
    }
    this.doc.moveDown(0.25)
    this.doc.fontSize(DEFAULT_FONT_SIZE)
    return this
  }

  /**
   * Adds small vertical line spacing.
   */
  addLine(): this {
    this.doc.moveDown(0.5)
    return this
  }

  /**
   * Adds vertical space (number of lines).
   */
  addSpacer(lines = 1): this {
    this.doc.moveDown(lines)
    return this
  }

  /**
   * Finalizes the document and returns the PDF as a Buffer.
   */
  async build(): Promise<Buffer> {
    this.doc.end()
    return this.bufferPromise
  }
}
