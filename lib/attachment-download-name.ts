/**
 * Nome com que o anexo chega no disco de quem baixa.
 *
 * Quando o médico deu um nome, é ele que vale — mas a EXTENSÃO vem sempre do
 * arquivo original. Sem isso, "Hemograma de março" baixaria sem extensão e o
 * sistema operacional não saberia abrir. Título que já termina na mesma
 * extensão não a ganha duas vezes.
 */
export function buildAttachmentDownloadName(
  fileName: string,
  title: string | null,
): string {
  const clean = title?.trim()
  if (!clean) return fileName

  const ext = fileName.match(/\.[A-Za-z0-9]{1,12}$/)?.[0] ?? ""
  // Barra e contrabarra viram traço: o nome vai para um header de download.
  const safe = clean.replace(/[/\\]/g, "-")
  if (!ext) return safe
  return safe.toLowerCase().endsWith(ext.toLowerCase()) ? safe : `${safe}${ext}`
}
