import Link from "next/link"
import { FileCheckIcon, MessageSquareIcon, Pill } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/formatters"
import type { CaseForPatient } from "@/modules/cases/get-cases-by-patient-id"
import type { MedicalCertificateListItem } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"

const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  comparecimento: "Comparecimento",
  aptidao_fisica: "Aptidão Física",
  medico: "Médico (afastamento)",
  acompanhante: "Acompanhante",
}

type PatientDetailTimelineProps = {
  cases: CaseForPatient[]
  certificates: MedicalCertificateListItem[]
  prescriptions: PrescriptionListItem[]
}

function sortCasesByDateDesc(cases: CaseForPatient[]): CaseForPatient[] {
  return [...cases].sort((a, b) => b.started_at.localeCompare(a.started_at))
}

function sortCertificatesByDateDesc(
  items: MedicalCertificateListItem[],
): MedicalCertificateListItem[] {
  return [...items].sort((a, b) => b.issued_at.localeCompare(a.issued_at))
}

function sortPrescriptionsByDateDesc(items: PrescriptionListItem[]): PrescriptionListItem[] {
  return [...items].sort((a, b) => b.issued_at.localeCompare(a.issued_at))
}

export function PatientDetailTimeline({
  cases,
  certificates,
  prescriptions,
}: PatientDetailTimelineProps) {
  const sortedCases = sortCasesByDateDesc(cases)
  const sortedCerts = sortCertificatesByDateDesc(certificates)
  const sortedRx = sortPrescriptionsByDateDesc(prescriptions)

  return (
    <div className="space-y-10">
      <section className="space-y-4" aria-labelledby="patient-atendimentos-heading">
        <div>
          <h2
            id="patient-atendimentos-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Atendimentos
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Casos do painel ou de outros canais vinculados a este paciente, do mais
            recente ao mais antigo.
          </p>
        </div>

        {sortedCases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-muted/5 p-8 text-center">
            <p className="text-sm font-medium text-muted-foreground">Nenhum atendimento vinculado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando um caso for associado a este paciente, ele aparecerá nesta lista.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {sortedCases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/dashboard/cases/${c.id}`}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-xs transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <MessageSquareIcon
                      className="h-4 w-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="text-sm font-medium text-foreground">
                      Atendimento · {formatDate(c.started_at)}
                    </span>
                    {c.status === "active" ? (
                      <Badge variant="default" className="text-xs">
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        Encerrado
                      </Badge>
                    )}
                  </div>
                  <span className="shrink-0 text-sm text-primary sm:text-end">Abrir caso →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-6" aria-labelledby="patient-documentos-heading">
        <div>
          <h2
            id="patient-documentos-heading"
            className="text-lg font-semibold tracking-tight text-foreground"
          >
            Documentos gerados
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Atestados e receitas emitidos para este paciente — cada tipo em sua própria lista.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileCheckIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Atestados
            </CardTitle>
            <CardDescription>Documentos de atestado associados ao paciente</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedCerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum atestado para este paciente.</p>
            ) : (
              <ul className="space-y-2">
                {sortedCerts.map((cert) => (
                  <li key={cert.id}>
                    <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-foreground">
                        {CERTIFICATE_TYPE_LABELS[cert.type] ?? cert.type} ·{" "}
                        {formatDate(cert.issued_at)}
                      </span>
                      {cert.pdf_storage_path ? (
                        <Link
                          href={`/api/medical-certificates/${cert.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 font-medium text-primary hover:underline"
                        >
                          Baixar PDF
                        </Link>
                      ) : (
                        <span className="shrink-0 text-muted-foreground">PDF não disponível</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Pill className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              Receitas
            </CardTitle>
            <CardDescription>Receitas médicas associadas ao paciente</CardDescription>
          </CardHeader>
          <CardContent>
            {sortedRx.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma receita para este paciente.</p>
            ) : (
              <ul className="space-y-2">
                {sortedRx.map((rx) => (
                  <li key={rx.id}>
                    <div className="flex flex-col gap-2 rounded-md border border-border px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-foreground">{formatDate(rx.issued_at)}</span>
                      {rx.pdf_storage_path ? (
                        <Link
                          href={`/api/prescriptions/${rx.id}/download`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 font-medium text-primary hover:underline"
                        >
                          Baixar PDF
                        </Link>
                      ) : (
                        <span className="shrink-0 text-muted-foreground">PDF não disponível</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
