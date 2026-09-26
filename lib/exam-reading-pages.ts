/**
 * Prepara os arquivos escolhidos pelo médico (fotos e/ou PDFs) como páginas
 * JPEG, NO BROWSER. Só roda no cliente.
 *
 * Por que aqui e não no servidor: rasterizar PDF em Node exige dependência
 * nativa (canvas) e a função no Vercel tem teto de corpo de requisição; no
 * browser o pdf.js já rasteriza sozinho e a foto de celular de 6 MB vira um
 * JPEG de ~400 KB antes de subir. O Groq reduz cada imagem a 2.048 tokens de
 * qualquer jeito, então lado maior de 2000 px não perde nada que ele fosse ver.
 */

const MAX_SIDE_PX = 2000
const JPEG_QUALITY = 0.85

function isPdf(file: File): boolean {
  return file.type === "application/pdf" || /\.pdf$/i.test(file.name)
}

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao converter a página."))),
      "image/jpeg",
      JPEG_QUALITY,
    )
  })
}

async function imageToPage(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(`Não foi possível abrir "${file.name}". Envie JPG, PNG ou PDF.`)
  }
  const scale = Math.min(1, MAX_SIDE_PX / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement("canvas")
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvasToJpeg(canvas)
}

async function pdfToPages(file: File): Promise<Blob[]> {
  const pdfjs = await import("pdfjs-dist")
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  ).toString()

  const task = pdfjs.getDocument({ data: await file.arrayBuffer() })
  const doc = await task.promise
  const pages: Blob[] = []
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const base = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({
      scale: MAX_SIDE_PX / Math.max(base.width, base.height),
    })
    const canvas = document.createElement("canvas")
    canvas.width = Math.round(viewport.width)
    canvas.height = Math.round(viewport.height)
    await page.render({ canvas, viewport }).promise
    pages.push(await canvasToJpeg(canvas))
  }
  await task.destroy()
  return pages
}

/** Converte os arquivos escolhidos em páginas JPEG, na ordem em que vieram. */
export async function filesToExamPages(files: File[]): Promise<Blob[]> {
  const pages: Blob[] = []
  for (const file of files)
    pages.push(...(isPdf(file) ? await pdfToPages(file) : [await imageToPage(file)]))
  return pages
}
