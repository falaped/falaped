import { redirect } from "next/navigation"
import Link from "next/link"
import { FileCheck, Plus } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { getMedicalCertificatesByProfileId } from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import { MedicalCertificateTable } from "@/components/dashboard/medical-certificates/medical-certificate-table"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default async function MedicalCertificatesPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const certificates = await getMedicalCertificatesByProfileId(
    supabase,
    profile.id,
  )

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
            Gere atestados de comparecimento, aptidão física, médico e
            acompanhante.
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
          <CardContent className="flex flex-col items-center justify-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted/50">
              <FileCheck className="h-7 w-7 text-muted-foreground" />
            </div>
            <p className="mt-4 text-sm font-medium">Nenhum atestado gerado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie um atestado para gerar o PDF e fazer o download.
            </p>
            <Button asChild className="mt-5">
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
            <MedicalCertificateTable certificates={certificates} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
