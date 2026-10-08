"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { markCaseEarningsPromptedAction } from "@/actions"
import { Button } from "@/components/ui/button"

/** "Foi cortesia": a consulta sem valor deixa de ser pendência (Início, Financeiro, consulta encerrada). */
export function CourtesyButton({ caseId, size = "sm" }: { caseId: string; size?: "sm" | "xs" }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function markCourtesy() {
    startTransition(async () => {
      const result = await markCaseEarningsPromptedAction(caseId)
      if (!result.ok) {
        toast.error("Não foi possível registrar. Tente novamente.")
        return
      }
      toast.success("Registrado como cortesia.")
      router.refresh()
    })
  }

  return (
    <Button variant="ghost" size={size} disabled={isPending} onClick={markCourtesy}>
      Foi cortesia
    </Button>
  )
}
