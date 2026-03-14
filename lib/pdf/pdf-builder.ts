/**
 * Generic PDF builder: add paragraphs, lines, spacers; build to Buffer.
 * Used by medical-certificates and any other feature that needs to produce a PDF.
 */
import type { Readable } from "stream"

/** PDFKit document instance: stream + chaining methods. */
type PdfKitDoc = Readable & {
  fontSize(size: number): PdfKitDoc
  text(text: string, options?: { align?: string; lineBreak?: boolean }): PdfKitDoc
  moveDown(n?: number): PdfKitDoc
  end(): void
  readonly y: number
  moveTo(x: number, y: number): PdfKitDoc
  lineTo(x: number, y: number): PdfKitDoc
  stroke(): PdfKitDoc
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

const DEFAULT_MARGIN = 50
const DEFAULT_FONT_SIZE = 11

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

  constructor(options?: { margin?: number; size?: string }) {
    const margin = options?.margin ?? DEFAULT_MARGIN
    this.doc = new PDFDocument({
      size: options?.size ?? "A4",
      margin,
      layout: "portrait",
    })
    this.bufferPromise = bufferFromStream(this.doc as unknown as Readable)
    this.doc.fontSize(DEFAULT_FONT_SIZE)
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
   * Adds a small vertical line spacing.
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
   * Adds a horizontal line (for signature/stamp area).
   */
  addSignatureLine(): this {
    this.doc.moveDown(1)
    const y = this.doc.y
    this.doc.moveTo(50, y).lineTo(550, y).stroke()
    this.doc.moveDown(0.5)
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
