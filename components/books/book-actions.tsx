"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Download, FileText, RefreshCw, Sparkles, Trash2 } from "lucide-react"

import type { GeneratePagesActionResult } from "@/actions/books/generate-pages"
import {
  buildBookPdfAction,
  deleteBookAction,
  generateCoverAction,
  generatePagesAction,
  regeneratePageAction,
} from "@/actions/books"
import { Button } from "@/components/ui/button"
import { BOOK_PAGE_COUNT, COVER_INDEX, DEDICATION_INDEX, ENDING_INDEX } from "@/modules/books/constants"
import type { BookWithPages } from "@/modules/books/types"

type Result = { ok: true } | { ok: false; error: string }

function pageLabel(index: number) {
  if (index === COVER_INDEX) return "Capa"
  if (index === DEDICATION_INDEX) return "Dedicatória"
  if (index === ENDING_INDEX) return "Final"
  return `Página ${index}`
}

export function BookActions({ book }: { book: BookWithPages }) {
  const router = useRouter()
  const [busy, setBusy] = useState<string | null>(null)

  const pages = Array.from({ length: BOOK_PAGE_COUNT }, (_, i) => book.pages.find((p) => p.index === i) ?? null)
  const cover = pages[COVER_INDEX]
  const readyCount = pages.filter((p) => p?.status === "ready").length
  const allReady = readyCount === BOOK_PAGE_COUNT
  const canGeneratePages = cover?.status === "ready" && !allReady

  async function run(key: string, action: () => Promise<Result>, success: string) {
    setBusy(key)
    try {
      const result = await action()
      if (result.ok) toast.success(success)
      else toast.error(result.error)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado.")
    } finally {
      setBusy(null)
      router.refresh()
    }
  }

  // Uma chamada gera uma ou duas ondas (limite de 300 s da função); repete até não sobrar pendente.
  async function generateAllPages(): Promise<Result> {
    let result: GeneratePagesActionResult
    do {
      result = await generatePagesAction(book.id)
      router.refresh()
    } while (result.ok && result.pending?.length)
    return result
  }

  async function onDelete() {
    if (!confirm("Excluir este livro e todos os arquivos? Não dá para desfazer.")) return
    setBusy("delete")
    const result = await deleteBookAction(book.id)
    if (!result.ok) {
      toast.error(result.error)
      setBusy(null)
      return
    }
    toast.success("Livro excluído.")
    router.push("/books")
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {cover?.status !== "ready" && (
          <Button
            disabled={busy !== null}
            onClick={() => run("cover", () => generateCoverAction(book.id), "Capa pronta. Aprove ou refaça.")}
          >
            <Sparkles className="mr-2 size-4" aria-hidden />
            {busy === "cover" ? "Gerando capa (≈ 2 min)..." : "Gerar capa"}
          </Button>
        )}
        {canGeneratePages && (
          <Button
            disabled={busy !== null}
            onClick={() =>
              run("pages", generateAllPages, "Todas as páginas prontas.")
            }
          >
            <Sparkles className="mr-2 size-4" aria-hidden />
            {busy === "pages"
              ? "Gerando páginas (vários minutos, não feche a aba)..."
              : readyCount > 1
                ? "Retomar páginas pendentes"
                : "Aprovar capa e gerar as 19 páginas"}
          </Button>
        )}
        {allReady && (
          <Button
            variant={book.pdf_path ? "outline" : "default"}
            disabled={busy !== null}
            onClick={() => run("pdf", () => buildBookPdfAction(book.id), "PDF gerado.")}
          >
            <FileText className="mr-2 size-4" aria-hidden />
            {busy === "pdf" ? "Montando PDF..." : book.pdf_path ? "Gerar PDF de novo" : "Gerar PDF"}
          </Button>
        )}
        {book.pdf_path && (
          <Button asChild variant="default">
            <a href={`/api/books/${book.id}/pdf`} target="_blank" rel="noreferrer">
              <Download className="mr-2 size-4" aria-hidden />
              Baixar PDF
            </a>
          </Button>
        )}
        <Button variant="destructive" disabled={busy !== null} onClick={onDelete} className="ml-auto">
          <Trash2 className="mr-2 size-4" aria-hidden />
          Excluir livro
        </Button>
      </div>

      <p className="text-sm text-muted-foreground">
        {readyCount} de {BOOK_PAGE_COUNT} páginas prontas.
      </p>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {pages.map((page, index) => (
          <div key={index} className="flex flex-col gap-2">
            <div className="relative aspect-[3/4] overflow-hidden rounded-md border bg-muted">
              {page?.status === "ready" && page.image_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`/api/books/${book.id}/pages/${index}?v=${encodeURIComponent(page.updated_at)}`}
                  alt={pageLabel(index)}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center p-2 text-center text-xs text-muted-foreground">
                  {page?.status === "failed"
                    ? `Falhou: ${page.error ?? "sem detalhes"}`
                    : page?.status === "pending"
                      ? "Gerando..."
                      : "Não gerada"}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="text-xs font-medium">{pageLabel(index)}</span>
              {(page?.status === "ready" || page?.status === "failed") && (index === COVER_INDEX || cover?.status === "ready") && (
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={busy !== null}
                  onClick={() =>
                    run(`page-${index}`, () => regeneratePageAction(book.id, index), `${pageLabel(index)} refeita.`)
                  }
                  title="Refazer esta página"
                >
                  <RefreshCw className={`size-3.5 ${busy === `page-${index}` ? "animate-spin" : ""}`} aria-hidden />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
