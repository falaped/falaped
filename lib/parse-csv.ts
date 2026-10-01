/**
 * CSV com cabeçalho → objetos (RFC 4180: aspas, aspas duplicadas, quebra de linha dentro de
 * aspas). Separador detectado na primeira linha: vírgula ou ponto e vírgula (Excel pt-BR).
 */
export function parseCsv(text: string): Record<string, string>[] {
  const src = text.replace(/^﻿/, "")
  const firstLine = src.slice(0, src.indexOf("\n") >>> 0)
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ","

  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let quoted = false
  const endField = () => {
    row.push(field)
    field = ""
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"'
        i++
      } else if (c === '"') quoted = false
      else field += c
    } else if (c === '"') quoted = true
    else if (c === sep) endField()
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++
      endRow()
    } else field += c
  }
  if (field || row.length) endRow()

  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim()))
  if (!header) return []
  const keys = header.map((h) => h.trim().toLowerCase())
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? "").trim()])))
}
