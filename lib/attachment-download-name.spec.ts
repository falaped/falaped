import test from "node:test"
import assert from "node:assert/strict"

import { buildAttachmentDownloadName } from "@/lib/attachment-download-name"

test("sem título, baixa com o nome original", () => {
  assert.equal(buildAttachmentDownloadName("exame.pdf", null), "exame.pdf")
  assert.equal(buildAttachmentDownloadName("exame.pdf", "   "), "exame.pdf")
})

test("com título, mantém a extensão do arquivo original", () => {
  assert.equal(
    buildAttachmentDownloadName("scan001.pdf", "Hemograma de março"),
    "Hemograma de março.pdf",
  )
  assert.equal(
    buildAttachmentDownloadName("IMG_0042.JPG", "Lesão no braço"),
    "Lesão no braço.JPG",
  )
})

test("título que já tem a extensão não a ganha duas vezes", () => {
  assert.equal(
    buildAttachmentDownloadName("scan.pdf", "hemograma.pdf"),
    "hemograma.pdf",
  )
  assert.equal(
    buildAttachmentDownloadName("scan.PDF", "hemograma.pdf"),
    "hemograma.pdf",
  )
})

test("arquivo sem extensão baixa só com o título", () => {
  assert.equal(buildAttachmentDownloadName("exame", "Hemograma"), "Hemograma")
})

test("barra no título não vira caminho no header de download", () => {
  assert.equal(
    buildAttachmentDownloadName("scan.pdf", "exames/2026/março"),
    "exames-2026-março.pdf",
  )
})
