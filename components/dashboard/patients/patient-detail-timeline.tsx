import Link from "next/link"
import { FileCheckIcon, Pill } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/formatters"
import type { MedicalCertificateListItem } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"

const CERTIFICATE_TYPE_LABELS: Record<string, string> = {
  comparecimento: "Comparecimento",
  aptidao_fisica: "Aptidão Física",
  medico: "Médico (afastamento)",
  acompanhante: "Acompanhante",
}

type PatientDetailTimelineProps = {
  certificates: MedicalCertificateListItem[]
  prescriptions: PrescriptionListItem[]
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
  certificates,
  prescriptions,
}: PatientDetailTimelineProps) {
  const sortedCerts = sortCertificatesByDateDesc(certificates)
  const sortedRx = sortPrescriptionsByDateDesc(prescriptions)

  return (
    <div className="space-y-10">
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
