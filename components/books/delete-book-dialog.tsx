"use client"

import { useState } from "react"
import { Loader2, Trash2 } from "lucide-react"

import { BkButton, Sticker } from "@/components/books/books-ui"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  deleting: boolean
  onConfirm: () => void
}

export function DeleteBookDialog({ open, onOpenChange, title, deleting, onConfirm }: Props) {
  const [typed, setTyped] = useState("")
  const matches = typed.trim().toLowerCase() === title.trim().toLowerCase()

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (deleting) return
        if (!o) setTyped("")
        onOpenChange(o)
      }}
    >
      <DialogContent
        className="books-theme flex w-[calc(100%-2rem)] max-w-[520px] flex-col gap-[18px] rounded-[20px] border-2 border-ink bg-white p-5 shadow-hard-xl sm:p-7"
        style={{ background: "#fff" }}
      >
        <Sticker className="self-start bg-destructive">Irreversível</Sticker>
        <DialogTitle className="font-display text-[23px] font-extrabold leading-[1.1] tracking-tight sm:text-[28px]">
          Excluir este livro?
        </DialogTitle>
        <DialogDescription className="text-[13.5px] font-medium leading-relaxed text-[#3f3f46] text-pretty sm:text-[14.5px]">
          Apaga as 20 ilustrações, o PDF e as fotos enviadas. Não há como recuperar depois.
        </DialogDescription>
        <label className="flex flex-col gap-2">
          <span className="text-[13px] font-semibold">
            Para confirmar, digite <strong className="font-display font-extrabold">{title}</strong>
          </span>
          <input
            type="text"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="Título do livro"
            disabled={deleting}
            autoFocus
            className="h-12 rounded-xl border-2 border-ink bg-white px-3.5 text-[15px] font-medium text-ink outline-none focus:shadow-[0_0_0_4px_#fde0dc]"
          />
        </label>
        <div className="flex flex-col-reverse gap-2.5 pt-1.5 sm:flex-row sm:justify-end">
          <BkButton variant="secondary" disabled={deleting} onClick={() => onOpenChange(false)} className="h-[46px]">
            Cancelar
          </BkButton>
          {deleting ? (
            <button type="button" disabled className="inline-flex h-[46px] cursor-progress items-center justify-center gap-2 rounded-full border-2 border-ink bg-white px-[18px] text-sm font-bold">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Excluindo...
            </button>
          ) : (
            <button
              type="button"
              disabled={!matches}
              onClick={onConfirm}
              className={
                matches
                  ? "inline-flex h-[46px] items-center justify-center gap-2 rounded-full border-2 border-ink bg-destructive px-[18px] text-sm font-bold text-ink shadow-hard transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard-lg active:translate-x-0.5 active:translate-y-0.5 active:shadow-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-warning"
                  : "inline-flex h-[46px] cursor-not-allowed items-center justify-center gap-2 rounded-full border-2 border-dashed border-destructive bg-transparent px-[18px] text-sm font-bold text-danger-text opacity-50"
              }
            >
              <Trash2 className="size-3.5" aria-hidden />
              Excluir para sempre
            </button>
          )}
        </div>
        {!matches && !deleting && <p className="text-xs font-medium text-muted-foreground">O botão libera quando o título estiver igual.</p>}
      </DialogContent>
    </Dialog>
  )
}
