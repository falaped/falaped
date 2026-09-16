// Inspeção visual do PDF do livro a partir de imagens locais (00..19.png|jpg).
// uso: yarn tsx scripts/repro-book-pdf.ts <pastaComImagens> <saida.pdf> [nome] [pediatra]
import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { join } from "node:path"

import { buildBookPdf } from "@/modules/books/pdf/build-book-pdf"
import { BOOK_PAGE_COUNT } from "@/modules/books/constants"

async function main() {
  const [dir, out, childName = "Samuel", pediatricianName] = process.argv.slice(2)
  if (!dir || !out) throw new Error("uso: repro-book-pdf <pasta> <saida.pdf> [nome] [pediatra]")
  const pages = Array.from({ length: BOOK_PAGE_COUNT }, (_, i) => {
    const id = String(i).padStart(2, "0")
    const file = ["png", "jpg"].map((ext) => join(dir, `${id}.${ext}`)).find(existsSync)
    if (!file) throw new Error(`faltou a página ${id} em ${dir}`)
    return readFileSync(file)
  })
  const pdf = await buildBookPdf({
    pages,
    childName,
    dedication: `Para ${childName}, que descobriu que coragem não é não ter medo. É dar o primeiro passo mesmo com ele.`,
    pediatricianName: pediatricianName ?? null,
  })
  writeFileSync(out, pdf)
  console.log(`ok ${out} (${(pdf.length / 1024 / 1024).toFixed(1)} MB)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
