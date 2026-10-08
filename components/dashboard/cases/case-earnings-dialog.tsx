"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { CaseEarningsForm, type EarningsOutcome } from "@/components/dashboard/cases/case-earnings-form"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const MESSAGE: Record<EarningsOutcome, string> = {
  charged: "Lançamento registrado.",
  "no-charge": "Registrado sem cobrança.",
  "failed-after-commit": "",
}

/**
 * "Lançar valor" de uma consulta JÁ encerrada sem lançamento. A pergunta fica ancorada no
 * ESTADO e não no evento de encerrar: o assistente e "iniciar outra consulta" encerram no
 * servidor, onde não há tela para perguntar. Encerrar pela tela usa o drawer da consulta.
 */
export function CaseEarningsDialog({
  caseId,
  open,
  onOpenChange,
  todayLabel,
}: {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Hoje no fuso da clínica (dd/MM/yyyy), vindo do RSC. */
  todayLabel: string
}) {
  const router = useRouter()
  const [isDirty, setIsDirty] = useState(false)

  function close() {
    setIsDirty(false)
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      {/* Esc com o form sujo não faz nada: clique fora já não fecha um AlertDialog. */}
      <AlertDialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl" onEscapeKeyDown={(e) => isDirty && e.preventDefault()}>
        <AlertDialogHeader>
          <AlertDialogTitle>Registrar o que foi cobrado</AlertDialogTitle>
          <AlertDialogDescription>Valor da consulta e procedimentos — ou sem cobrança, se foi retorno ou cortesia.</AlertDialogDescription>
        </AlertDialogHeader>
        {open ? (
          <CaseEarningsForm
            caseId={caseId}
            todayLabel={todayLabel}
            onDirtyChange={setIsDirty}
            onLoadFailed={(reason) => {
              close()
              if (reason === "already-billed") toast.info("Esta consulta já tem lançamentos.")
              else toast.error("Não foi possível abrir a cobrança. Tente novamente.")
              router.refresh()
            }}
            onFinished={(outcome) => {
              close()
              if (MESSAGE[outcome]) toast.success(MESSAGE[outcome])
              router.refresh()
            }}
            footer={({ submit, isSaving, canSubmit }) => (
              <AlertDialogFooter>
                <AlertDialogCancel disabled={isSaving}>Cancelar</AlertDialogCancel>
                {/* `Button` puro, nunca `AlertDialogAction`: este fecharia o diálogo no mesmo
                    clique, antes de a action assíncrona terminar. */}
                <Button type="button" disabled={!canSubmit} onClick={submit}>
                  {isSaving ? "Salvando…" : "Salvar"}
                </Button>
              </AlertDialogFooter>
            )}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  )
}
