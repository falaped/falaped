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

  const step =
    cover?.status !== "ready"
      ? "Passo 1 de 3: gere a capa e veja se a criança ficou parecida."
      : !allReady
        ? "Passo 2 de 3: aprove a capa para gerar as outras 19 páginas. Não feche a aba."
        : "Passo 3 de 3: refaça o que quiser e gere o PDF."

  return (
    <div className="flex flex-col gap-8">
      <div className="bk-card flex flex-col gap-4 bg-accent p-5 sm:p-6">
        <p className="bk-hand text-2xl">{step}</p>
        <div className="flex flex-wrap items-center gap-3">
          {cover?.status !== "ready" && (
            <button
              className="bk-btn bk-btn-primary"
              disabled={busy !== null}
              onClick={() => run("cover", () => generateCoverAction(book.id), "Capa pronta. Aprove ou refaça.")}
            >
              <Sparkles className="size-4" aria-hidden />
              {busy === "cover" ? "Gerando capa (≈ 2 min)..." : "Gerar capa"}
            </button>
          )}
          {canGeneratePages && (
            <button
              className="bk-btn bk-btn-primary"
              disabled={busy !== null}
              onClick={() => run("pages", generateAllPages, "Todas as páginas prontas.")}
            >
              <Sparkles className="size-4" aria-hidden />
              {busy === "pages"
                ? "Gerando páginas (vários minutos)..."
                : readyCount > 1
                  ? "Retomar páginas pendentes"
                  : "Aprovar capa e gerar as 19 páginas"}
            </button>
          )}
          {allReady && (
            <button
              className={`bk-btn ${book.pdf_path ? "" : "bk-btn-primary"}`}
              disabled={busy !== null}
              onClick={() => run("pdf", () => buildBookPdfAction(book.id), "PDF gerado.")}
            >
              <FileText className="size-4" aria-hidden />
              {busy === "pdf" ? "Montando PDF..." : book.pdf_path ? "Gerar PDF de novo" : "Gerar PDF"}
            </button>
          )}
          {book.pdf_path && (
            <a href={`/api/books/${book.id}/pdf`} target="_blank" rel="noreferrer" className="bk-btn bk-btn-secondary">
              <Download className="size-4" aria-hidden />
              Baixar PDF
            </a>
          )}
          <button className="bk-btn bk-btn-destructive sm:ml-auto" disabled={busy !== null} onClick={onDelete}>
            <Trash2 className="size-4" aria-hidden />
            Excluir livro
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="h-6 flex-1 border-3 border-foreground bg-card">
          <div className="h-full bg-primary transition-all" style={{ width: `${(readyCount / BOOK_PAGE_COUNT) * 100}%` }} />
        </div>
        <span className="text-sm font-black uppercase tracking-wider">
          {readyCount} / {BOOK_PAGE_COUNT} páginas
        </span>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-5">
        {pages.map((page, index) => {
          const canRedo =
            (page?.status === "ready" || page?.status === "failed") && (index === COVER_INDEX || cover?.status === "ready")
          return (
            <div key={index} className="bk-card flex flex-col gap-2 p-2">
              <div className="relative aspect-[3/4] overflow-hidden border-3 border-foreground bg-muted">
                {page?.status === "ready" && page.image_path ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/books/${book.id}/pages/${index}?v=${encodeURIComponent(page.updated_at)}`}
                    alt={pageLabel(index)}
                    className="size-full object-cover"
                  />
                ) : page?.status === "failed" ? (
                  <div className="flex size-full items-center justify-center bg-destructive p-2 text-center text-xs font-bold text-white">
                    Falhou: {page.error ?? "sem detalhes"}
                  </div>
                ) : page?.status === "pending" ? (
                  <div className="flex size-full items-center justify-center bg-[var(--bk-mustard)] p-2 text-center text-xs font-black uppercase tracking-wider">
                    Gerando...
                  </div>
                ) : (
                  <div className="flex size-full items-center justify-center p-2 text-center text-xs font-black uppercase tracking-wider text-foreground/40">
                    Não gerada
                  </div>
                )}
              </div>
              <div className="flex min-h-9 items-center justify-between gap-1 px-1">
                <span className="text-xs font-black uppercase tracking-wider">{pageLabel(index)}</span>
                {canRedo && (
                  <button
                    className="bk-btn bk-btn-icon"
                    disabled={busy !== null}
                    onClick={() =>
                      run(`page-${index}`, () => regeneratePageAction(book.id, index), `${pageLabel(index)} refeita.`)
                    }
                    title="Refazer esta página"
                    aria-label={`Refazer ${pageLabel(index)}`}
                  >
                    <RefreshCw className={`size-3.5 ${busy === `page-${index}` ? "animate-spin" : ""}`} aria-hidden />
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
