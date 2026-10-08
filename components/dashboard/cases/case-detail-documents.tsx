import Link from "next/link"
import {
  DownloadIcon,
  FileCheckIcon,
  FlaskConicalIcon,
  PillIcon,
  PlusIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDate } from "@/lib/formatters"
import type { ExamRequestListItem } from "@/modules/exam-requests/types"
import type {
  MedicalCertificateListItem,
  MedicalCertificateType,
} from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"
import type { ReferralListItem } from "@/modules/referrals/types"

const CERTIFICATE_TYPE_LABELS: Record<MedicalCertificateType, string> = {
  comparecimento: "Atestado de comparecimento",
  aptidao_fisica: "Atestado de aptidão física",
  medico: "Atestado médico",
  acompanhante: "Atestado de acompanhante",
}

export type CaseDocument = {
  key: string
  kind: "prescription" | "certificate" | "exam-request" | "referral"
  label: string
  issuedAt: string
  href: string
}

const KIND_ICON: Record<CaseDocument["kind"], LucideIcon> = {
  prescription: PillIcon,
  certificate: FileCheckIcon,
  "exam-request": FlaskConicalIcon,
  referral: SendIcon,
}

/** Todos os documentos emitidos na consulta, do mais recente ao mais antigo. */
export function toCaseDocuments(docs: {
  prescriptions: PrescriptionListItem[]
  certificates: MedicalCertificateListItem[]
  examRequests: ExamRequestListItem[]
  referrals: ReferralListItem[]
}): CaseDocument[] {
  return [
    ...docs.prescriptions.map((row) => ({
      key: `p-${row.id}`,
      kind: "prescription" as const,
      label: "Receita",
      issuedAt: row.issued_at,
      href: `/api/prescriptions/${row.id}/download`,
    })),
    ...docs.certificates.map((row) => ({
      key: `c-${row.id}`,
      kind: "certificate" as const,
      label: CERTIFICATE_TYPE_LABELS[row.type],
      issuedAt: row.issued_at,
      href: `/api/medical-certificates/${row.id}/download`,
    })),
    ...docs.examRequests.map((row) => {
      const exams = Array.isArray(row.payload.exams) ? row.payload.exams.length : 0
      return {
        key: `e-${row.id}`,
        kind: "exam-request" as const,
        label: exams ? `Pedido de exame · ${exams} ${exams === 1 ? "exame" : "exames"}` : "Pedido de exame",
        issuedAt: row.issued_at,
        href: `/api/exam-requests/${row.id}/download`,
      }
    }),
    ...docs.referrals.map((row) => {
      const specialty = typeof row.payload.specialty === "string" ? row.payload.specialty : ""
      return {
        key: `r-${row.id}`,
        kind: "referral" as const,
        label: specialty ? `Encaminhamento · ${specialty}` : "Encaminhamento",
        issuedAt: row.issued_at,
        href: `/api/referrals/${row.id}/download`,
      }
    }),
  ].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
}

const NEW_DOCUMENTS = [
  { label: "Receita", path: "/dashboard/prescriptions/new", icon: PillIcon },
  { label: "Atestado", path: "/dashboard/medical-certificates/new", icon: FileCheckIcon },
  { label: "Pedido de exame", path: "/dashboard/exam-requests/new", icon: FlaskConicalIcon },
  { label: "Encaminhamento", path: "/dashboard/referrals/new", icon: SendIcon },
]

/** Card Documentos da consulta encerrada (protótipo b2): baixar de novo ou emitir mais um. */
export function CaseDetailDocuments({
  caseId,
  patientId,
  documents,
}: {
  caseId: string
  /** Sem paciente não há como emitir documento: o botão de criar some. */
  patientId: string | null
  documents: CaseDocument[]
}) {
  const query = patientId ? new URLSearchParams({ caseId, patientId }).toString() : ""

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center">
        <h2 className="font-display text-title font-semibold">Documentos</h2>
        {patientId ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="ml-auto">
                <PlusIcon data-icon="inline-start" />
                Novo documento
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {NEW_DOCUMENTS.map(({ label, path, icon: Icon }) => (
                <DropdownMenuItem key={path} asChild>
                  <Link href={`${path}?${query}`}>
                    <Icon aria-hidden />
                    {label}
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
      {documents.length ? (
        <ul className="mt-3 flex flex-col gap-2">
          {documents.map((doc) => {
            const Icon = KIND_ICON[doc.kind]
            return (
              <li key={doc.key} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-ink-strong">
                  <Icon className="size-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{doc.label}</div>
                  <div className="text-caption text-subtle-foreground num">Emitido em {formatDate(doc.issuedAt)}</div>
                </div>
                <Button variant="ghost" size="icon-sm" asChild>
                  <a href={doc.href} download aria-label={`Baixar ${doc.label}`}>
                    <DownloadIcon />
                  </a>
                </Button>
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="mt-2 text-muted-foreground">
          {patientId
            ? "Nenhum documento emitido nesta consulta."
            : "Associe um paciente à consulta para emitir documentos."}
        </p>
      )}
    </section>
  )
}
