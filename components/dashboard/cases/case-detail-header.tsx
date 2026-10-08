"use client"

import Link from "next/link"
import { useState } from "react"
import {
  CalendarIcon,
  ClockIcon,
  DownloadIcon,
  EllipsisIcon,
  LockIcon,
  RotateCcwIcon,
  StethoscopeIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserIcon,
} from "lucide-react"

import { AttentionSymbol } from "@/components/dashboard/attention-symbol"
import { CaseDetailActions } from "@/components/dashboard/cases/case-detail-actions"
import type { CaseDocument } from "@/components/dashboard/cases/case-detail-documents"
import { CloseConsultSheet } from "@/components/dashboard/cases/close-consult-sheet"
import type { CaseReport as CaseReportType } from "@/modules/cases/get-case-report"
import type { CaseReminder } from "@/modules/cases/types"
import type { ReportTemplateWithSections } from "@/modules/report-templates/get-report-template-by-id"
import { ReopenCaseDialog } from "@/components/dashboard/cases/reopen-case-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { formatBrazilianPhone } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import type { CaseDetail } from "@/modules/cases/get-case-by-id"

type CaseDetailHeaderProps = {
  detail: CaseDetail
  /** Signed URL (short-lived) resolvida server-side; null cai para iniciais. */
  photoUrl: string | null
  /** Montados no RSC no fuso da clínica: "06/10", "Seg, 06/10 · 09:10 às 09:32", "22 min". */
  dayLabel: string
  whenLabel: string
  durationLabel: string | null
  /** Motivo curto, tirado do resumo da consulta. */
  reason: string | null
  documents: CaseDocument[]
  /** Para o Encerrar de uma consulta do WhatsApp ainda aberta. */
  template: ReportTemplateWithSections | null
  caseReports: CaseReportType[]
  reminders: CaseReminder[]
  /** Lançamentos não-anulados do caso; `null` = a leitura falhou (S7 bloqueia). */
  earningsCount: number | null
  earningsTotalCents: number | null
  todayLabel: string
}

/** Cabeçalho da consulta (protótipo b2): quem, quando, documentos; reabrir e excluir no ⋯. */
export function CaseDetailHeader({
  detail,
  photoUrl,
  dayLabel,
  whenLabel,
  durationLabel,
  reason,
  documents,
  template,
  caseReports,
  reminders,
  earningsCount,
  earningsTotalCents,
  todayLabel,
}: CaseDetailHeaderProps) {
  const [dialog, setDialog] = useState<"status" | "delete" | null>(null)
  const patient = detail.patient
  const title = patient?.name ?? patient?.responsible ?? "Consulta sem paciente"
  const age = patient
    ? computePediatricAge(patient.birth_date, new Date(), patient.gestational_age_weeks)
    : null
  const ageLabel = age?.status === "ok" ? formatPediatricAgeShort(age) : ""
  const isActive = detail.status === "active"
  const documentHrefs = documents.map((doc) => doc.href)

  // ponytail: um download por documento; o navegador pede permissão uma vez para
  // vários. Um .zip no servidor resolve se virar incômodo.
  function downloadAll() {
    documentHrefs.forEach((href, index) => {
      setTimeout(() => {
        const a = document.createElement("a")
        a.href = href
        a.download = ""
        a.click()
      }, index * 400)
    })
  }

  return (
    // Mesma faixa do cabeçalho da ficha (b5): a criança é a mesma, a tela é a consulta.
    <header className="-mx-8 -mt-8 border-b border-border bg-card">
      <div className="max-w-[1440px] px-8 pt-6 pb-5">
        <nav className="mb-3 text-caption text-subtle-foreground" aria-label="Você está em">
          <Link href="/dashboard/cases" className="hover:text-foreground hover:underline">
            Consultas
          </Link>{" "}
          › {title} · <span className="num">{dayLabel}</span>
        </nav>
        <div className="flex flex-wrap items-start gap-4">
          <Avatar className="size-14">
            {photoUrl && patient ? <AvatarImage src={photoUrl} alt={`Foto de ${patient.name}`} /> : null}
            <AvatarFallback className="bg-primary-soft text-section font-semibold text-primary-ink-strong">
              {patient ? getPatientInitials(patient.name) : <UserIcon className="size-5" />}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-page font-semibold">{title}</h1>
              {patient?.allergies?.trim() ? (
                <AttentionSymbol icon={TriangleAlertIcon} kind="danger" title="Alergia" detail={patient.allergies} />
              ) : null}
            </div>
            {patient ? (
              <div className="mt-1 text-muted-foreground">
                {[
                  ageLabel ? <span key="age" className="font-medium text-foreground">{ageLabel}</span> : null,
                  patient.responsible?.trim() || null,
                  patient.contact_phone ? <span key="phone" className="num">{formatBrazilianPhone(patient.contact_phone)}</span> : null,
                ]
                  .filter(Boolean)
                  .map((part, index) => (
                    <span key={index}>
                      {index ? " · " : ""}
                      {part}
                    </span>
                  ))}
              </div>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {patient ? (
              <Button variant="outline" asChild>
                <Link href={`/dashboard/patients/${patient.id}`}>
                  <UserIcon data-icon="inline-start" />
                  Ver ficha
                </Link>
              </Button>
            ) : null}
            {documentHrefs.length ? (
              <Button variant="outline" onClick={downloadAll}>
                <DownloadIcon data-icon="inline-start" />
                {documentHrefs.length === 1 ? "Baixar documento" : "Baixar documentos"}
              </Button>
            ) : null}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Mais ações">
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onSelect={() => setDialog("status")}>
                  {isActive ? <LockIcon aria-hidden /> : <RotateCcwIcon aria-hidden />}
                  {isActive ? "Encerrar consulta" : "Reabrir consulta"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
                  <Trash2Icon aria-hidden />
                  Excluir consulta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg bg-muted px-4 py-2.5 text-label">
          <Badge variant={isActive ? "default" : "outline"} className="bg-card">
            {isActive ? null : <LockIcon aria-hidden />}
            {isActive ? "Em andamento" : "Encerrada"}
          </Badge>
          <span className="flex items-center gap-1.5">
            <CalendarIcon className="size-4 text-subtle-foreground" aria-hidden />
            <span className="num">{whenLabel}</span>
          </span>
          {durationLabel ? (
            <span className="flex items-center gap-1.5">
              <ClockIcon className="size-4 text-subtle-foreground" aria-hidden />
              <span className="num">{durationLabel}</span>
            </span>
          ) : null}
          {reason ? (
            <span className="flex items-center gap-1.5">
              <StethoscopeIcon className="size-4 text-subtle-foreground" aria-hidden />
              {reason}
            </span>
          ) : null}
          {detail.awaiting_patient_choice ? <Badge variant="outline">Aguardando associação de paciente</Badge> : null}
          {detail.awaiting_intent ? <Badge variant="outline">Aguardando resposta do responsável</Badge> : null}
        </div>
      </div>

      {isActive ? (
        <CloseConsultSheet
          caseId={detail.id}
          open={dialog === "status"}
          onOpenChange={(open) => setDialog(open ? "status" : null)}
          subtitle={[title, ageLabel].filter(Boolean).join(" · ")}
          todayLabel={todayLabel}
          template={template}
          caseReports={caseReports}
          hasMessages={detail.messages.length > 0}
          documents={documents}
          reminders={reminders}
        />
      ) : (
        <ReopenCaseDialog
          caseId={detail.id}
          open={dialog === "status"}
          onOpenChange={(open) => setDialog(open ? "status" : null)}
        />
      )}
      <CaseDetailActions
        caseId={detail.id}
        open={dialog === "delete"}
        onOpenChange={(open) => setDialog(open ? "delete" : null)}
        earningsCount={earningsCount}
        earningsTotalCents={earningsTotalCents}
      />
    </header>
  )
}
