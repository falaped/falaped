import { Suspense } from "react"
import Link from "next/link"
import { UsersIcon, Plus } from "lucide-react"
import { PatientsContent } from "@/components/dashboard/patients/patients-content"
import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

export default function PatientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <UsersIcon className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Gerencie os pacientes cadastrados.
          </p>
        </div>
        <Button asChild className="shrink-0">
          <Link href="/dashboard/patients/new">
            <Plus className="mr-2 h-4 w-4" />
            Cadastrar paciente
          </Link>
        </Button>
      </div>

      <Separator />

      <Suspense fallback={<PatientsLoading />}>
        <PatientsContent />
      </Suspense>
    </div>
  )
}
