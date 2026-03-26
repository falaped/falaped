"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft, MessagesSquareIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export function SelectPatientPageHeader() {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="flex items-center gap-2.5">
          <MessagesSquareIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Criar novo caso</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Selecione um paciente para iniciar o workspace de prontuário assistido.
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        className="w-full shrink-0 gap-2 sm:w-auto"
        onClick={() => router.back()}
      >
        <ArrowLeft className="size-4 shrink-0" aria-hidden />
        Voltar
      </Button>
    </div>
  )
}
