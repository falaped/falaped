import Link from "next/link"
import { Download, FileCheck, FolderOpen, Pill } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { formatDate } from "@/lib/formatters"
import type {
  MedicalCertificateListItem,
  MedicalCertificateType,
} from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import type { PrescriptionListItem } from "@/modules/prescriptions/types"

const CERTIFICATE_TYPE_LABELS: Record<MedicalCertificateType, string> = {
  comparecimento: "Comparecimento",
  aptidao_fisica: "Aptidão física",
  medico: "Médico (afastamento)",
  acompanhante: "Acompanhante",
}

type CaseDetailDocumentsProps = {
  certificates: MedicalCertificateListItem[]
  prescriptions: PrescriptionListItem[]
}

export function CaseDetailDocuments({
  certificates,
  prescriptions,
}: CaseDetailDocumentsProps) {
  const hasAny = certificates.length > 0 || prescriptions.length > 0

  if (!hasAny) {
    return (
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Documentos do caso
          </CardTitle>
          <CardDescription>
            Receitas e atestados gerados a partir deste atendimento aparecem aqui.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FolderOpen
                className="h-6 w-6 text-muted-foreground"
                aria-hidden
              />
            </div>
            <p className="mt-4 font-medium text-muted-foreground">
              Nenhum documento vinculado a este caso
            </p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground/80">
              Use os botões acima para criar uma nova receita ou atestado; eles serão
              associados a este atendimento.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Documentos do caso
        </CardTitle>
        <CardDescription>
          Receitas e atestados vinculados a este atendimento.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {prescriptions.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Receitas
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {prescriptions.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <Pill
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {row.patient_name?.trim() || "Receita"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Emitida em {formatDate(row.issued_at)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
                    <Link href={`/api/prescriptions/${row.id}/download`}>
                      <Download className="size-4" aria-hidden />
                      Baixar PDF
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {certificates.length > 0 ? (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Atestados
            </p>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {certificates.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <FileCheck
                      className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-tight">
                        {CERTIFICATE_TYPE_LABELS[row.type]}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Emitido em {formatDate(row.issued_at)}
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5" asChild>
                    <Link href={`/api/medical-certificates/${row.id}/download`}>
                      <Download className="size-4" aria-hidden />
                      Baixar PDF
                    </Link>
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
