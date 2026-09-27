"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useState } from "react"
import type { ComponentType, ReactNode } from "react"
import {
  FileTextIcon,
  Loader2,
  type LucideProps,
  Pill,
  Sparkles,
  UserIcon,
} from "lucide-react"
import { toast } from "sonner"

import { generateCaseReportAction } from "@/actions"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  type CaseReportSourceSummary,
  canGenerateCaseReport,
  caseReportGenerateDisabledReason,
} from "@/lib/case-report-generate-eligibility"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
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

/** Mesmo visual dos cards do menu de serviços (`SectionHub`). */
const actionCardClassName =
  "h-full transition-colors group-hover:border-primary group-hover:bg-primary/5"

function ActionCardBody({
  icon: Icon,
  title,
  description,
  loading = false,
}: {
  icon: ComponentType<LucideProps>
  title: string
  description: string
  loading?: boolean
}) {
  return (
    <>
      <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        ) : (
          <Icon className="h-5 w-5 text-primary" aria-hidden />
        )}
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </>
  )
}

function DisabledCard({ reason, children }: { reason: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="h-full">
          <Card className={cn(actionCardClassName, "cursor-not-allowed opacity-60")}>
            {children}
          </Card>
        </div>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">{reason}</TooltipContent>
    </Tooltip>
  )
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
  const noPatientReason = "Associe um paciente ao caso para usar esta ação."

  const patientCards = [
    {
      key: "patient",
      href: patient ? `/dashboard/patients/${patient.id}` : "",
      icon: UserIcon,
      title: "Ver ficha do paciente",
      description: "Histórico, dados cadastrais e consultas anteriores da criança.",
    },
    {
      key: "certificate",
      href: `/dashboard/medical-certificates/new?${docQuery}`,
      icon: FileTextIcon,
      title: "Criar novo atestado",
      description: "Atestado vinculado a este atendimento, pronto para imprimir.",
    },
    {
      key: "prescription",
      href: `/dashboard/prescriptions/new?${docQuery}`,
      icon: Pill,
      title: "Criar nova receita",
      description: "Receita vinculada a este atendimento, pronta para imprimir.",
    },
  ]

  return (
    <TooltipProvider delayDuration={300}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {patientCards.map((card) =>
          patient ? (
            <Link key={card.key} href={card.href} className="group h-full">
              <Card className={actionCardClassName}>
                <ActionCardBody
                  icon={card.icon}
                  title={card.title}
                  description={card.description}
                />
              </Card>
            </Link>
          ) : (
            <DisabledCard key={card.key} reason={noPatientReason}>
              <ActionCardBody
                icon={card.icon}
                title={card.title}
                description={card.description}
              />
            </DisabledCard>
          ),
        )}

        {canGenerate ? (
          <button
            type="button"
            className="group h-full text-left disabled:cursor-wait"
            disabled={isGenerating}
            onClick={handleGenerateReport}
          >
            <Card className={actionCardClassName}>
              <ActionCardBody
                icon={Sparkles}
                title="Gerar relatório"
                description="Relatório do atendimento a partir do histórico da consulta."
                loading={isGenerating}
              />
            </Card>
          </button>
        ) : (
          <DisabledCard reason={generateReason ?? "Não é possível gerar o relatório agora."}>
            <ActionCardBody
              icon={Sparkles}
              title="Gerar relatório"
              description="Relatório do atendimento a partir do histórico da consulta."
            />
          </DisabledCard>
        )}
      </div>
    </TooltipProvider>
  )
}
