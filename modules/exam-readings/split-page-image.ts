import { createCanvas, loadImage } from "@napi-rs/canvas"

// Sobreposição entre as metades para nenhuma linha da tabela ser cortada ao meio.
const OVERLAP = 0.06
const JPEG_QUALITY = 85

/**
 * Corta a página em metade de cima e metade de baixo. O Groq reduz cada imagem
 * a um orçamento fixo de tokens, então mandar meia página por imagem DOBRA a
 * resolução efetiva que o modelo enxerga; o erro típico sem isso é alinhar a
 * referência de uma linha vizinha (visto num teste do pezinho do NUPAD).
 */
export async function splitPageImage(page: Buffer): Promise<[Buffer, Buffer]> {
  const img = await loadImage(page)
  const half = Math.round(img.height / 2)
  const overlap = Math.round(img.height * OVERLAP)

  const crop = (top: number, bottom: number): Buffer => {
    const h = bottom - top
    const canvas = createCanvas(img.width, h)
    canvas.getContext("2d").drawImage(img, 0, top, img.width, h, 0, 0, img.width, h)
    return canvas.toBuffer("image/jpeg", JPEG_QUALITY)
  }

  return [crop(0, Math.min(img.height, half + overlap)), crop(Math.max(0, half - overlap), img.height)]
}
