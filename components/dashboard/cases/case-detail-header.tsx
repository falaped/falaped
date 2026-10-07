"use client"

import Link from "next/link"
import { useState } from "react"
import {
  DownloadIcon,
  EllipsisIcon,
  LockIcon,
  RotateCcwIcon,
  Trash2Icon,
  TriangleAlertIcon,
  UserIcon,
} from "lucide-react"

import { AttentionSymbol } from "@/components/dashboard/attention-symbol"
import { CaseDetailActions } from "@/components/dashboard/cases/case-detail-actions"
import { CloseCaseWithEarningsDialog } from "@/components/dashboard/cases/close-case-with-earnings-dialog"
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
import { getPatientInitials } from "@/lib/get-patient-initials"
import type { CaseDetail } from "@/modules/cases/get-case-by-id"

type CaseDetailHeaderProps = {
  detail: CaseDetail
  /** Signed URL (short-lived) resolvida server-side; null cai para iniciais. */
  photoUrl: string | null
  /** "06/10 · 09:10 · 22 min", montado no RSC no fuso da clínica. */
  whenLabel: string
  /** Links de download de todos os documentos da consulta. */
  documentHrefs: string[]
  /** Lançamentos não-anulados do caso; `null` = a leitura falhou (S7 bloqueia). */
  earningsCount: number | null
  earningsTotalCents: number | null
  todayLabel: string
}

/** Cabeçalho da consulta (protótipo b2): quem, quando, documentos; reabrir e excluir no ⋯. */
export function CaseDetailHeader({
  detail,
  photoUrl,
  whenLabel,
  documentHrefs,
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
    <header className="flex flex-col gap-3">
      <nav className="text-caption text-subtle-foreground" aria-label="Você está em">
        <Link href="/dashboard/cases" className="hover:text-foreground hover:underline">
          Consultas
        </Link>{" "}
        › {title} · {whenLabel.split(" · ")[0]}
      </nav>
      <div className="flex flex-wrap items-start gap-4">
        <Avatar className="size-12">
          {photoUrl && patient ? <AvatarImage src={photoUrl} alt={`Foto de ${patient.name}`} /> : null}
          <AvatarFallback className="bg-primary-soft text-title font-semibold text-primary-ink-strong">
            {patient ? getPatientInitials(patient.name) : <UserIcon className="size-5" />}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-page font-semibold">{title}</h1>
            {ageLabel ? <Badge variant="secondary">{ageLabel}</Badge> : null}
            <Badge variant={isActive ? "default" : "secondary"}>
              {isActive ? "Em andamento" : "Encerrada"}
            </Badge>
            {patient?.allergies?.trim() ? (
              <AttentionSymbol icon={TriangleAlertIcon} kind="danger" title="Alergia" detail={patient.allergies} />
            ) : null}
          </div>
          <div className="mt-1 text-muted-foreground">
            <span className="num">{whenLabel}</span>
            {patient ? (
              <>
                {" · "}
                <Link href={`/dashboard/patients/${patient.id}`} className="text-primary-ink hover:underline">
                  Ver ficha
                </Link>
              </>
            ) : null}
          </div>
          {detail.awaiting_patient_choice || detail.awaiting_intent ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.awaiting_patient_choice ? (
                <Badge variant="outline">Aguardando associação de paciente</Badge>
              ) : null}
              {detail.awaiting_intent ? (
                <Badge variant="outline">Aguardando resposta do responsável</Badge>
              ) : null}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
            <DropdownMenuContent align="end" className="w-52">
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

      {isActive ? (
        <CloseCaseWithEarningsDialog
          caseId={detail.id}
          open={dialog === "status"}
          onOpenChange={(open) => setDialog(open ? "status" : null)}
          todayLabel={todayLabel}
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
