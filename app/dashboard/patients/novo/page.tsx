import { redirect } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"
import { Button } from "@/components/ui/button"
import { PatientForm } from "@/components/dashboard/patients/patient-form"

export default async function NewPatientPage() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile) redirect("/auth/login")
  if (profile.status !== "paid") redirect("/dashboard/link-whatsapp")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Cadastrar paciente
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preencha os dados do paciente. Nome, responsável e telefone de contato são obrigatórios.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard/patients">Voltar</Link>
        </Button>
      </div>

      <PatientForm mode="create" />
    </div>
  )
}
