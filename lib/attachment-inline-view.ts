/**
 * Decide se um anexo pode ser ABERTO numa aba (inline) ou se só pode ser baixado.
 *
 * Aceitamos qualquer tipo de arquivo no upload, e abrir inline entrega o
 * conteúdo ao navegador para renderizar. Num HTML ou SVG isso é execução de
 * script — no domínio do storage, não no do app, mas ainda assim um link do
 * Falaped abrindo script de terceiro. Então inline é ALLOWLIST: PDF e imagem de
 * raster. Todo o resto baixa, que é inerte.
 *
 * SVG fica de fora de propósito, mesmo sendo `image/*` — é o mesmo veto que o
 * upload de foto do paciente já aplica.
 */
const INLINE_VIEWABLE_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
]

/** `true` quando o tipo pode ser aberto numa aba com segurança. */
export function isInlineViewableMimeType(
  mimeType: string | null | undefined,
): boolean {
  if (!mimeType) return false
  const normalized = mimeType.split(";")[0]?.trim().toLowerCase() ?? ""
  return INLINE_VIEWABLE_TYPES.includes(normalized)
}
