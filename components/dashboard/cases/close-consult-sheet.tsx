"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  CircleCheckIcon,
  FileCheckIcon,
  FlaskConicalIcon,
  PillIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { updateCaseStatusAction } from "@/actions"
import type { CaseDocument } from "@/components/dashboard/cases/case-detail-documents"
import { JUST_CLOSED_PARAM } from "@/components/dashboard/cases/case-closed-dialog"
import { CaseEarningsForm } from "@/components/dashboard/cases/case-earnings-form"
import { CaseRemindersForm } from "@/components/dashboard/cases/case-reminders-form"
import { CaseReport } from "@/components/dashboard/cases/case-report"
import type { SheetKind } from "@/components/dashboard/cases/consult-tools"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import type { CaseReport as CaseReportType } from "@/modules/cases/get-case-report"
import type { CaseReminder } from "@/modules/cases/types"
import type { ReportTemplateWithSections } from "@/modules/report-templates/get-report-template-by-id"

const DOC_ICON: Record<CaseDocument["kind"], LucideIcon> = {
  prescription: PillIcon,
  certificate: FileCheckIcon,
  "exam-request": FlaskConicalIcon,
  referral: SendIcon,
}

const MORE_DOCS: Array<[SheetKind, string]> = [
  ["prescription", "Receita"],
  ["certificate", "Atestado"],
  ["exam-request", "Pedido de exame"],
  ["referral", "Encaminhamento"],
]

function Steps({ step }: { step: 0 | 1 }) {
  return (
    <ol className="flex items-center gap-3 text-label">
      {["Revisar consulta", "Cobrança e encerrar"].map((label, index) => (
        <li key={label} className="flex items-center gap-3">
          {index ? <span className="h-px w-12 bg-border" aria-hidden /> : null}
          <span
            className={cn(
              "grid size-6 place-items-center rounded-full text-caption font-semibold",
              index < step
                ? "bg-success-soft text-success-text"
                : index === step
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground",
            )}
          >
            {index < step ? <CheckIcon className="size-3.5" aria-hidden /> : index + 1}
          </span>
          <span className={index === step ? "font-semibold" : "text-muted-foreground"}>{label}</span>
        </li>
      ))}
    </ol>
  )
}

/**
 * Encerrar consulta (protótipos a10 e a10b): um drawer em duas etapas. Primeiro o conteúdo
 * clínico — relatório (gerado aqui se ainda não existe), documentos e lembretes —, depois a
 * cobrança, com o botão que encerra e salva tudo. A consulta só é encerrada nesse botão:
 * fechar o drawer em qualquer ponto não muda nada.
 */
export function CloseConsultSheet({
  caseId,
  open,
  onOpenChange,
  subtitle,
  todayLabel,
  template,
  caseReports,
  hasMessages,
  documents,
  reminders,
  onOpenTool,
}: {
  caseId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** "Helena Duarte · 2a 3m · 12,4 kg · 27 min". */
  subtitle: string
  /** Hoje no fuso da clínica (dd/MM/yyyy), vindo do RSC. */
  todayLabel: string
  template: ReportTemplateWithSections | null
  caseReports: CaseReportType[]
  hasMessages: boolean
  documents: CaseDocument[]
  reminders: CaseReminder[]
  /** Abre um painel de documento da consulta; sem ele, a revisão não oferece emitir mais. */
  onOpenTool?: (kind: SheetKind) => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<0 | 1>(0)
  const [reminderCount, setReminderCount] = useState(reminders.length)

  function close() {
    onOpenChange(false)
    setStep(0)
  }

  async function closeCase(): Promise<boolean> {
    // Sem revalidar no servidor: na Consulta isso redirecionaria com o drawer aberto.
    const closed = await updateCaseStatusAction(caseId, "closed", { deferRevalidate: true })
    if (!closed.ok) toast.error(getFriendlyToastMessage(closed.error))
    return closed.ok
  }

  const reviewed = [
    caseReports.length ? "Relatório" : null,
    documents.length ? `${documents.length} ${documents.length === 1 ? "documento" : "documentos"}` : null,
    reminderCount ? `${reminderCount} ${reminderCount === 1 ? "lembrete" : "lembretes"}` : null,
  ].filter(Boolean)

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent className="gap-0 rounded-l-2xl bg-card data-[side=right]:w-[min(720px,92vw)] data-[side=right]:sm:max-w-none">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="font-display text-section font-semibold">Encerrar consulta</SheetTitle>
          <SheetDescription className="text-caption text-subtle-foreground num">{subtitle}</SheetDescription>
        </SheetHeader>

        {step === 0 ? (
          <>
            <div className="flex flex-1 flex-col gap-7 overflow-auto px-6 py-5">
              <Steps step={0} />
              <section>
                {template ? (
                  <CaseReport
                    template={template}
                    caseReports={caseReports}
                    caseId={caseId}
                    hasMessages={hasMessages}
                    embedded
                    autoGenerate
                  />
                ) : (
                  <p className="text-muted-foreground">Nenhum modelo de relatório disponível para este perfil.</p>
                )}
              </section>

              <section>
                <h3 className="mb-2 font-display text-title font-semibold">Documentos</h3>
                {documents.length ? (
                  <ul className="flex flex-col gap-2">
                    {documents.map((doc) => {
                      const Icon = DOC_ICON[doc.kind]
                      return (
                        <li key={doc.key} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                          <Icon className="size-4 shrink-0 text-primary-ink" aria-hidden />
                          <span className="min-w-0 flex-1 truncate">{doc.label}</span>
                          <span className="rounded-full bg-success-soft px-2 text-caption font-medium text-success-text">
                            Emitido
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Nenhum documento emitido nesta consulta.</p>
                )}
                {onOpenTool ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-muted-foreground">
                    Falta algum?
                    {MORE_DOCS.map(([kind, label]) => (
                      <Button
                        key={kind}
                        variant="outline"
                        size="xs"
                        onClick={() => {
                          close()
                          onOpenTool(kind)
                        }}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                ) : null}
              </section>

              <section>
                <h3 className="font-display text-title font-semibold">Lembretes para a próxima consulta</h3>
                <p className="mb-3 text-caption text-subtle-foreground">Aparecem no início da próxima consulta desta criança.</p>
                <CaseRemindersForm
                  caseId={caseId}
                  initialReminders={reminders}
                  onChange={(list) => setReminderCount(list.length)}
                />
              </section>
            </div>
            <div className="flex shrink-0 items-center gap-2 border-t border-border px-6 py-3">
              <Button variant="ghost" onClick={close}>
                <ArrowLeftIcon data-icon="inline-start" />
                Voltar à consulta
              </Button>
              <Button className="ml-auto" onClick={() => setStep(1)}>
                Continuar para cobrança
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
            </div>
          </>
        ) : (
          <CaseEarningsForm
            caseId={caseId}
            todayLabel={todayLabel}
            always
            commit={closeCase}
            bodyClassName="flex-1 overflow-auto px-6 py-5"
            onLoadFailed={() => {
              toast.error("Não foi possível abrir a cobrança. Tente novamente.")
              setStep(0)
            }}
            onFinished={(outcome) => {
              close()
              if (outcome === "failed-after-commit") {
                toast.error("Consulta encerrada, mas a cobrança não foi salva. Lance pela consulta.")
              }
              // O detalhe abre o "Consulta encerrada" (a11) com o que ficou.
              router.push(`/dashboard/cases/${caseId}?${JUST_CLOSED_PARAM}=1`)
            }}
            footer={({ submit, isSaving, canSubmit }) => (
              <div className="flex shrink-0 items-center gap-2 border-t border-border px-6 py-3">
                <Button variant="ghost" disabled={isSaving} onClick={() => setStep(0)}>
                  <ArrowLeftIcon data-icon="inline-start" />
                  Voltar à revisão
                </Button>
                <Button className="ml-auto" disabled={!canSubmit} onClick={submit}>
                  <CheckIcon data-icon="inline-start" />
                  {isSaving ? "Encerrando…" : "Encerrar e salvar"}
                </Button>
              </div>
            )}
            header={
              <>
                <Steps step={1} />
                <div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3 text-label">
                  <CircleCheckIcon className="size-4 text-success-text" aria-hidden />
                  <span className="flex-1">
                    {reviewed.length ? `${reviewed.join(", ")} revisados` : "Consulta revisada"}
                  </span>
                  <Button variant="ghost" size="xs" onClick={() => setStep(0)}>
                    Revisar de novo
                  </Button>
                </div>
                <h3 className="font-display text-title font-semibold">Cobrança</h3>
              </>
            }
          />
        )}
      </SheetContent>
    </Sheet>
  )
}
