"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import { FileTextIcon, Loader2, Pill, Sparkles, UserIcon } from "lucide-react"
import { toast } from "sonner"

import { generateCaseReportAction } from "@/actions"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  type CaseReportSourceSummary,
  canGenerateCaseReport,
  caseReportGenerateDisabledReason,
} from "@/lib/case-report-generate-eligibility"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { CasePatientDetail } from "@/modules/cases/get-case-by-id"

type CaseDetailQuickActionsProps = {
  caseId: string
  patient: CasePatientDetail | null
  hasMessages: boolean
  templateSectionCount: number
  hasTemplate: boolean
  caseReports: CaseReportSourceSummary[]
}

function buildNewDocumentSearchParams(
  caseId: string,
  patientId: string | null,
): string {
  const params = new URLSearchParams()
  params.set("caseId", caseId)
  if (patientId) params.set("patientId", patientId)
  return params.toString()
}

export function CaseDetailQuickActions({
  caseId,
  patient,
  hasMessages,
  templateSectionCount,
  hasTemplate,
  caseReports,
}: CaseDetailQuickActionsProps) {
  const router = useRouter()
  const [isGenerating, setIsGenerating] = useState(false)

  const eligibilityParams = {
    caseReports,
    hasMessages,
    templateSectionCount,
    hasTemplate,
  }
  const canGenerate = canGenerateCaseReport(eligibilityParams)
  const generateReason = caseReportGenerateDisabledReason(eligibilityParams)

  const handleGenerateReport = useCallback(async () => {
    if (!canGenerate) return
    setIsGenerating(true)
    try {
      const result = await generateCaseReportAction(caseId)
      if (result.ok) {
        toast.success("Relatório gerado.")
        router.refresh()
      } else {
        toast.error(getFriendlyToastMessage(result.error))
      }
    } finally {
      setIsGenerating(false)
    }
  }, [canGenerate, caseId, router])

  const docQuery = buildNewDocumentSearchParams(caseId, patient?.id ?? null)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap gap-2">
        {patient ? (
          <Button variant="outline" className="gap-2" asChild>
            <Link href={`/dashboard/patients/${patient.id}`}>
              <UserIcon className="h-4 w-4 shrink-0" aria-hidden />
              Ver ficha do paciente
            </Link>
          </Button>
        ) : (
          <p className="self-center text-sm text-muted-foreground">
            Nenhum paciente vinculado a este caso.
          </p>
        )}

        {patient ? (
          <>
            <Button variant="outline" className="gap-2" asChild>
              <Link href={`/dashboard/medical-certificates/new?${docQuery}`}>
                <FileTextIcon className="h-4 w-4 shrink-0" aria-hidden />
                Criar novo atestado
              </Link>
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <Link href={`/dashboard/prescriptions/new?${docQuery}`}>
                <Pill className="h-4 w-4 shrink-0" aria-hidden />
                Criar nova receita
              </Link>
            </Button>
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button variant="outline" className="gap-2" disabled>
                    <FileTextIcon className="h-4 w-4 shrink-0" aria-hidden />
                    Criar novo atestado
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Associe um paciente ao caso para criar atestado ou receita.
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex">
                  <Button variant="outline" className="gap-2" disabled>
                    <Pill className="h-4 w-4 shrink-0" aria-hidden />
                    Criar nova receita
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Associe um paciente ao caso para criar atestado ou receita.
              </TooltipContent>
            </Tooltip>
          </>
        )}

        {canGenerate ? (
          <Button
            type="button"
            className="gap-2"
            disabled={isGenerating}
            onClick={handleGenerateReport}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            )}
            Gerar relatório
          </Button>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button type="button" className="gap-2" disabled>
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                  Gerar relatório
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              {generateReason ?? "Não é possível gerar o relatório agora."}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
