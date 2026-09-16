"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { Check, Download, FileText, RefreshCw, Sparkles, Trash2, TriangleAlert } from "lucide-react"

import { buildBookPdfAction, deleteBookAction } from "@/actions/books"
import type { GenerateResult } from "@/app/api/books/[id]/generate/route"
import { DeleteBookDialog } from "@/components/books/delete-book-dialog"
import { PageCard, type PageCardState } from "@/components/books/page-card"
import { BkButton, Chip, Sticker, bkButton } from "@/components/books/books-ui"
import { BOOK_PAGE_COUNT, COVER_INDEX, DEDICATION_INDEX, ENDING_INDEX } from "@/modules/books/constants"
import type { BookWithPages } from "@/modules/books/types"
import { cn } from "@/lib/utils"

type Result = { ok: true } | { ok: false; error: string }
type Busy = "cover" | "pages" | "pdf" | "delete" | `page-${number}` | null

const POLL_MS = 5000

type GenerateBody = { kind: "cover" } | { kind: "pages" } | { kind: "page"; index: number }

// Route handler (não Server Action): uma action em andamento segura o router.refresh() na fila,
// e a grade só atualizaria quando a geração terminasse.
async function generate(bookId: string, body: GenerateBody): Promise<GenerateResult> {
  const res = await fetch(`/api/books/${bookId}/generate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
  const json: GenerateResult | null = await res.json().catch(() => null)
  return json ?? { ok: false, error: `Erro ${res.status} ao gerar.` }
}

export function pageLabel(index: number) {
  if (index === COVER_INDEX) return "Capa"
  if (index === DEDICATION_INDEX) return "Dedicatória"
  if (index === ENDING_INDEX) return "Final"
  return `Página ${index}`
}

function pageNote(index: number) {
  if (index === COVER_INDEX) return "referência"
  if (index === DEDICATION_INDEX || index === ENDING_INDEX) return "sem texto"
  return undefined
}

function listPt(nums: number[]) {
  if (nums.length <= 1) return nums.join("")
  return `${nums.slice(0, -1).join(", ")} e ${nums[nums.length - 1]}`
}

function minutesSince(startedAt: number | null) {
  if (!startedAt) return 0
  return Math.floor((Date.now() - startedAt) / 60_000)
}

export function BookActions({ book, title }: { book: BookWithPages; title: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState<Busy>(null)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [, forceTick] = useState(0)
  const autoStarted = useRef(false)

  const pages = Array.from({ length: BOOK_PAGE_COUNT }, (_, i) => book.pages.find((p) => p.index === i) ?? null)
  const cover = pages[COVER_INDEX]
  const coverReady = cover?.status === "ready"
  const readyIdx = pages.flatMap((p, i) => (p?.status === "ready" ? [i] : []))
  const failedIdx = pages.flatMap((p, i) => (p?.status === "failed" ? [i] : []))
  const inProgressIdx = pages.flatMap((p, i) => (p?.status === "pending" ? [i] : []))
  const missingIdx = pages.flatMap((p, i) => (!p ? [i] : []))
  const readyCount = readyIdx.length
  const allReady = readyCount === BOOK_PAGE_COUNT
  const generatingPages = busy === "pages"
  const redoingIndex = busy?.startsWith("page-") ? Number(busy.slice(5)) : null
  const canRedo = coverReady && busy === null
  const stepNumber = !coverReady ? 1 : allReady ? 3 : 2

  // Enquanto algo roda: atualiza a grade a cada 5 s e avisa antes de fechar a aba.
  useEffect(() => {
    if (!busy) return
    const id = setInterval(() => {
      router.refresh()
      forceTick((t) => t + 1)
    }, POLL_MS)
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => {
      clearInterval(id)
      window.removeEventListener("beforeunload", warn)
    }
  }, [busy, router])

  async function run(key: Busy, action: () => Promise<Result>, success: string, description?: string) {
    setBusy(key)
    setStartedAt(Date.now())
    try {
      const result = await action()
      if (result.ok) toast.success(success, { description })
      else toast.error(result.error)
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Erro inesperado.")
    } finally {
      setBusy(null)
      setStartedAt(null)
      router.refresh()
    }
  }

  // Uma chamada gera uma ou duas ondas (limite de 300 s da função); repete até não sobrar pendente.
  async function generateAllPages(): Promise<Result> {
    let result: GenerateResult
    do {
      result = await generate(book.id, { kind: "pages" })
      router.refresh()
    } while (result.ok && result.pending?.length)
    return result
  }

  const startCover = () =>
    run("cover", () => generate(book.id, { kind: "cover" }), "Capa pronta. Aprove ou refaça.", `Veja se ${book.child_name} ficou parecido.`)

  // Vindo do wizard ("Criar livro e gerar a capa"): a capa começa na hora.
  useEffect(() => {
    if (autoStarted.current || searchParams.get("start") !== "cover" || coverReady || busy) return
    autoStarted.current = true
    router.replace(`/books/${book.id}`)
    void startCover()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onDelete() {
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

  // ---- Faixa de passo -------------------------------------------------
  const failedCount = failedIdx.length
  const hasFailures = failedCount > 0 && !generatingPages
  const resumable = coverReady && !allReady && !generatingPages && (hasFailures || readyCount > 1)

  let bannerBg = "bg-secondary"
  let stickerBg = "bg-warning"
  let headline: string
  let hint: React.ReactNode = null
  if (busy === "cover") {
    headline = "A capa está sendo desenhada. Leva cerca de 2 minutos."
    hint = <Warn>Não feche a aba.</Warn>
  } else if (!coverReady) {
    headline = "Gere a capa e veja se a criança ficou parecida."
  } else if (generatingPages) {
    headline = "As 19 páginas estão sendo desenhadas."
    hint = <Warn>Não feche a aba.</Warn>
  } else if (hasFailures) {
    bannerBg = "bg-danger-soft"
    stickerBg = "bg-destructive"
    headline = `${failedCount} ${failedCount === 1 ? "página falhou" : "páginas falharam"}. Clique para retomar de onde parou.`
    hint = <Chip>Falharam as páginas {listPt(failedIdx)} · nada do que já ficou pronto se perde.</Chip>
  } else if (allReady) {
    bannerBg = "bg-success"
    stickerBg = "bg-white"
    headline = "Refaça o que quiser e gere o PDF."
    hint =
      redoingIndex !== null ? (
        <Chip>Refazendo a {pageLabel(redoingIndex)} · os outros botões voltam quando terminar.</Chip>
      ) : busy === "pdf" ? (
        <Chip>Montando o PDF com as 20 páginas.</Chip>
      ) : book.pdf_path ? (
        <Chip>PDF pronto para baixar.</Chip>
      ) : (
        <Chip>Gere o PDF para baixar o livro completo.</Chip>
      )
  } else if (resumable) {
    headline = "A geração parou no meio. Clique para retomar de onde parou."
    hint = <Chip>Faltam {missingIdx.length + inProgressIdx.length} páginas · nada do que já ficou pronto se perde.</Chip>
  } else {
    headline = "Aprove a capa para gerar as outras 19 páginas."
    hint =
      redoingIndex === COVER_INDEX ? (
        <Chip>Refazendo a capa · aprove quando ficar parecido.</Chip>
      ) : (
        <Chip>Não ficou parecido? Refaça a capa no card abaixo antes de aprovar.</Chip>
      )
  }

  // ---- Barra de progresso ---------------------------------------------
  const pct = (n: number) => `${(n / BOOK_PAGE_COUNT) * 100}%`
  const elapsedMin = minutesSince(startedAt)
  const estimateMin = (book.quality === "high" ? 2 : 1) * 4 * 4 // 4 ondas em paralelo

  return (
    <>
      <section className={cn("border-b-2 border-ink", bannerBg)}>
        <div className="mx-auto grid max-w-[1400px] gap-3.5 px-4 py-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-7 sm:px-10 sm:py-5">
        <div className="flex items-center gap-3 sm:contents">
          <Sticker className={cn("rounded-[10px] px-3 py-[9px] font-display text-[17px] normal-case tracking-tight shadow-hard-xs sm:rounded-xl sm:px-4 sm:py-3 sm:text-2xl", stickerBg)}>
            Passo {stepNumber}
            <span className="text-[12px] opacity-75 sm:text-[15px]">/3</span>
          </Sticker>
          <div className="flex min-w-0 flex-col gap-2">
            <p className="font-display text-[19px] font-bold leading-[1.15] tracking-tight text-pretty sm:text-[26px]">{headline}</p>
            {hint && <div className="hidden sm:block">{hint}</div>}
          </div>
        </div>
        {hint && <div className="sm:hidden">{hint}</div>}
        <div className="flex flex-wrap items-center gap-2.5">
          {!coverReady && (
            <BkButton
              variant="primary"
              busy={busy === "cover"}
              busyLabel="Gerando capa (≈ 2 min)..."
              disabled={busy !== null}
              onClick={startCover}
              className="w-full sm:w-auto"
            >
              <Sparkles className="size-4" strokeWidth={2.4} aria-hidden />
              Gerar capa
            </BkButton>
          )}
          {coverReady && !allReady && (
            <BkButton
              variant={hasFailures ? "warning" : "primary"}
              busy={generatingPages}
              busyLabel="Gerando páginas (vários minutos)..."
              disabled={busy !== null}
              onClick={() => run("pages", generateAllPages, "Todas as páginas prontas.", "Agora gere o PDF.")}
              className="w-full sm:w-auto"
            >
              {resumable ? <RefreshCw className="size-4" strokeWidth={2.4} aria-hidden /> : <Check className="size-4" strokeWidth={2.6} aria-hidden />}
              {resumable ? "Retomar páginas pendentes" : "Aprovar capa e gerar as 19 páginas"}
            </BkButton>
          )}
          {coverReady && (
            <BkButton
              variant={allReady && !book.pdf_path ? "primary" : "secondary"}
              busy={busy === "pdf"}
              busyLabel="Montando PDF..."
              disabled={busy !== null || !allReady}
              title={allReady ? undefined : "Disponível quando as 20 páginas estiverem prontas"}
              onClick={() => run("pdf", () => buildBookPdfAction(book.id), "PDF gerado.", "Clique em Baixar PDF.")}
              className="flex-1 sm:flex-none"
            >
              <FileText className="size-4" strokeWidth={2.4} aria-hidden />
              {book.pdf_path ? "Gerar PDF de novo" : "Gerar PDF"}
            </BkButton>
          )}
          {book.pdf_path && allReady && (
            <a
              href={`/api/books/${book.id}/pdf`}
              target="_blank"
              rel="noreferrer"
              className={bkButton("primary", cn("flex-1 sm:flex-none", busy !== null && "pointer-events-none border-dashed bg-transparent opacity-45 shadow-none"))}
            >
              <Download className="size-4" strokeWidth={2.4} aria-hidden />
              Baixar PDF
            </a>
          )}
          <BkButton
            variant="icon-destructive"
            disabled={busy !== null}
            aria-label="Excluir livro"
            title="Excluir livro"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" strokeWidth={2.2} aria-hidden />
          </BkButton>
        </div>
        </div>
      </section>

      <div className="border-b-2 border-ink bg-white">
      <div className="mx-auto grid max-w-[1400px] gap-2.5 px-4 py-3.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-5 sm:px-10 sm:py-4">
        <span className="whitespace-nowrap font-display text-lg font-extrabold leading-none tracking-tight sm:text-xl">
          {readyCount} de {BOOK_PAGE_COUNT} <span className="font-sans text-[12.5px] font-semibold tracking-normal text-[#3f3f46] sm:text-[13px]">páginas prontas</span>
        </span>
        <div className="flex h-4 overflow-hidden rounded-full border-2 border-ink bg-muted sm:h-[18px]" role="progressbar" aria-valuenow={readyCount} aria-valuemin={0} aria-valuemax={BOOK_PAGE_COUNT}>
          {readyCount > 0 && <span className="bg-ink" style={{ width: pct(readyCount) }} />}
          {failedIdx.length > 0 && <span className="border-l-2 border-ink bg-destructive" style={{ width: pct(failedIdx.length) }} />}
          {(inProgressIdx.length > 0 || busy === "cover") && (
            <span
              className="animate-pulse border-l-2 border-ink bg-[repeating-linear-gradient(135deg,#f5c21a_0_6px,#fbe38a_6px_12px)]"
              style={{ width: pct(Math.max(inProgressIdx.length, busy === "cover" ? 1 : 0)) }}
            />
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-[12.5px] font-semibold">
          {busy === "cover" && <Chip className="bg-warning">Capa · {elapsedMin} min decorridos</Chip>}
          {generatingPages && (
            <>
              <Chip>{elapsedMin} min decorridos</Chip>
              <Chip className="bg-warning">
                {inProgressIdx.length} gerando · {missingIdx.length} na fila
              </Chip>
            </>
          )}
          {!busy && !coverReady && <span className="text-[12.5px] font-semibold text-[#3f3f46]">A capa é a referência visual das outras 19 páginas.</span>}
          {!busy && coverReady && !allReady && failedIdx.length === 0 && (
            <span className="text-[12.5px] font-semibold text-[#3f3f46]">As 19 páginas saem em lotes · ≈ {estimateMin} min no total</span>
          )}
          {!busy && failedIdx.length > 0 && <Chip className="bg-danger-soft">{failedIdx.length} {failedIdx.length === 1 ? "falhou" : "falharam"}</Chip>}
          {!busy && allReady && book.pdf_path && <Chip className="bg-success">PDF gerado</Chip>}
          {!busy && allReady && !book.pdf_path && <Chip>PDF ainda não gerado</Chip>}
        </div>
      </div>
      </div>

      <div className="mx-auto grid max-w-[1400px] grid-cols-2 gap-4 px-4 pb-8 pt-5 sm:grid-cols-3 sm:gap-[22px] sm:px-10 sm:pb-14 sm:pt-8 lg:grid-cols-5">
        {pages.map((page, index) => {
          let state: PageCardState = "pending"
          if (redoingIndex === index || (busy === "cover" && index === COVER_INDEX)) state = "redoing"
          else if (page?.status === "ready") state = "ready"
          else if (page?.status === "failed") state = "failed"
          else if (page?.status === "pending") state = "generating"
          else if (generatingPages) state = "queued"
          if (state === "redoing" && !page?.image_path) state = "generating"
          const src = page?.image_path ? `/api/books/${book.id}/pages/${index}?v=${encodeURIComponent(page.updated_at)}` : null
          return (
            <PageCard
              key={index}
              label={pageLabel(index)}
              note={pageNote(index)}
              state={state}
              imageSrc={src}
              error={page?.error}
              canRedo={canRedo || (!coverReady && index === COVER_INDEX && page?.status === "failed" && busy === null)}
              onRedo={() =>
                index === COVER_INDEX && !coverReady
                  ? startCover()
                  : run(`page-${index}`, () => generate(book.id, { kind: "page", index }), `${pageLabel(index)} refeita.`)
              }
            />
          )
        })}
      </div>

      <DeleteBookDialog open={deleteOpen} onOpenChange={setDeleteOpen} title={title} deleting={busy === "delete"} onConfirm={onDelete} />
    </>
  )
}

function Warn({ children }: { children: React.ReactNode }) {
  return (
    <Chip>
      <TriangleAlert className="size-3.5" strokeWidth={2.4} aria-hidden />
      {children}
    </Chip>
  )
}
