import PDFDocument from "pdfkit"

// A4 em pontos. Cada página do exame vira uma página do PDF, ajustada e centralizada.
const A4: [number, number] = [595.28, 841.89]

/** Junta as páginas JPEG do exame num PDF só, para virar UM anexo. */
export function buildExamPagesPdf(pages: Buffer[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ autoFirstPage: false, margin: 0 })
    const chunks: Buffer[] = []
    doc.on("data", (c: Buffer) => chunks.push(c))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)
    for (const page of pages) {
      doc.addPage({ size: A4, margin: 0 })
      doc.image(page, 0, 0, { fit: A4, align: "center", valign: "center" })
    }
    doc.end()
  })
}
