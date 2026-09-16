"use client"

import { useState } from "react"
import { Loader2, RefreshCw, X } from "lucide-react"

import { BrandBlur, Sticker } from "@/components/books/books-ui"
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export type PageCardState = "pending" | "queued" | "generating" | "redoing" | "ready" | "failed"

type Props = {
  label: string
  note?: string
  state: PageCardState
  imageSrc?: string | null
  error?: string | null
  /** Refazer liberado (capa pronta e nada rodando). */
  canRedo: boolean
  onRedo?: () => void
}

function RedoIcon() {
  return <RefreshCw className="size-3.5" strokeWidth={2.4} aria-hidden />
}

export function PageCard({ label, note, state, imageSrc, error, canRedo, onRedo }: Props) {
  const [zoom, setZoom] = useState(false)
  const redoButton = (
    <button
      type="button"
      disabled={!canRedo}
      onClick={onRedo}
      aria-label={`Refazer ${label}`}
      title={canRedo ? "Refazer esta página" : "Indisponível agora"}
      className={cn(
        "absolute right-2 top-2 grid size-[30px] place-items-center rounded-full border-2 border-ink bg-white text-ink transition-[transform,box-shadow,background-color] duration-100",
        canRedo
          ? "hover:-translate-x-px hover:-translate-y-px hover:bg-warning hover:shadow-hard-xs focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-warning"
          : "cursor-not-allowed opacity-40",
      )}
    >
      <RedoIcon />
    </button>
  )

  return (
    <figure className="m-0 flex flex-col gap-2">
      <div className="relative aspect-[3/4] overflow-hidden rounded-[14px] border-2 border-ink bg-white shadow-hard">
        {state === "ready" && imageSrc && (
          <>
            <button
              type="button"
              onClick={() => setZoom(true)}
              title="Ampliar"
              className="block size-full cursor-zoom-in focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-warning"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageSrc} alt={label} className="size-full object-cover" />
            </button>
            {redoButton}
            <Dialog open={zoom} onOpenChange={setZoom}>
              <DialogContent
                className="books-theme w-auto max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-[20px] border-2 border-ink bg-white p-0 shadow-hard-xl"
                style={{ background: "#fff" }}
              >
                <DialogTitle className="sr-only">{label}</DialogTitle>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageSrc} alt={label} className="block max-h-[calc(100vh-2rem)] w-auto max-w-full object-contain" />
                <DialogClose
                  aria-label="Fechar"
                  className="absolute right-3 top-3 grid size-9 place-items-center rounded-full border-2 border-ink bg-white text-ink shadow-hard-xs hover:bg-warning"
                >
                  <X className="size-4" strokeWidth={2.6} aria-hidden />
                </DialogClose>
              </DialogContent>
            </Dialog>
          </>
        )}
        {state === "generating" && (
          <>
            <BrandBlur pulse />
            <div className="absolute inset-0 grid place-items-center">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-warning px-[11px] py-[7px] text-xs font-bold shadow-hard-sm">
                <Loader2 className="size-3 animate-spin" strokeWidth={2.6} aria-hidden />
                Gerando
              </span>
            </div>
          </>
        )}
        {state === "redoing" && (
          <>
            {imageSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={imageSrc} alt="" className="size-full object-cover" />
            ) : (
              <BrandBlur pulse />
            )}
            <div className="absolute inset-0 bg-[rgba(250,250,249,.45)] backdrop-blur-[7px]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-white px-[11px] py-[7px] text-xs font-bold shadow-hard-sm">
                <Loader2 className="size-3 animate-spin" strokeWidth={2.6} aria-hidden />
                Refazendo
              </span>
              {imageSrc && <span className="text-[10.5px] font-semibold text-[#3f3f46]">versão anterior ao fundo</span>}
            </div>
          </>
        )}
        {state === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-danger-soft p-3 text-center">
            <Sticker className="-rotate-4 bg-destructive px-2 py-1.5 text-[11px] shadow-none">Falhou</Sticker>
            <span className="text-[11.5px] font-semibold leading-[1.35] text-pretty">{error || "Sem detalhes"}</span>
            <button
              type="button"
              disabled={!canRedo}
              onClick={onRedo}
              className={cn(
                "inline-flex h-[30px] items-center gap-1.5 rounded-full border-2 border-ink bg-white px-[11px] text-xs font-bold text-ink transition-[transform,box-shadow,background-color] duration-100",
                canRedo ? "hover:-translate-x-px hover:-translate-y-px hover:bg-warning hover:shadow-hard-xs" : "cursor-not-allowed opacity-40",
              )}
            >
              <RedoIcon />
              Refazer
            </button>
          </div>
        )}
        {state === "queued" && (
          <div className="absolute inset-0 grid place-items-center rounded-[14px] bg-accent outline-2 outline-dashed outline-ink -outline-offset-8">
            <span className="rounded-full border-2 border-ink bg-white px-2.5 py-1.5 text-xs font-bold">Na fila</span>
          </div>
        )}
        {state === "pending" && (
          <div className="absolute inset-0 grid place-items-center bg-muted">
            <span className="text-xs font-semibold text-muted-foreground">Aguardando</span>
          </div>
        )}
      </div>
      <figcaption className="flex items-baseline justify-between gap-1.5 px-0.5 font-display text-sm font-bold">
        <span>{label}</span>
        {note && <span className="font-sans text-[11px] font-medium text-muted-foreground">{note}</span>}
      </figcaption>
    </figure>
  )
}
