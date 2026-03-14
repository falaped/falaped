import { redirect } from "next/navigation"
import Link from "next/link"
import { FileCheck, Plus, Download } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getMedicalCertificatesByProfileId } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import { formatDate } from "@/lib/formatters"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { MedicalCertificateType } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"

const TYPE_LABELS: Record<MedicalCertificateType, string> = {
  comparecimento: "Comparecimento",
  aptidao_fisica: "Aptidão Física",
  medico: "Médico (afastamento)",
  acompanhante: "Acompanhante",
}

export default async function MedicalCertificatesPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const certificates = await getMedicalCertificatesByProfileId(supabase, profile.id)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <FileCheck className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Atestados
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere atestados de comparecimento, aptidão física, médico e acompanhante.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/dashboard/medical-certificates/novo">
            <Plus className="mr-2 h-4 w-4" />
            Criar atestado
          </Link>
        </Button>
      </div>

      <Separator />

      {certificates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <FileCheck className="h-10 w-10 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">Nenhum atestado gerado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um atestado para gerar o PDF e fazer o download.
            </p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/medical-certificates/novo">
                <Plus className="mr-2 h-4 w-4" />
                Criar atestado
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data de emissão</TableHead>
                  <TableHead>Paciente / Local</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificates.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">
                      {TYPE_LABELS[cert.type]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(cert.issued_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {cert.patient_name ?? cert.location_state ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {cert.pdf_storage_path ? (
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/dashboard/medical-certificates/${cert.id}/download`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Download className="mr-1.5 h-4 w-4" />
                            Baixar PDF
                          </Link>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
