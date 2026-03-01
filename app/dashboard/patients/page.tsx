import { Suspense } from "react"
import { UsersIcon } from "lucide-react"
import { PatientsContent } from "@/components/dashboard/patients/patients-content"
import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"
import { Separator } from "@/components/ui/separator"

export default function PatientsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <UsersIcon className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-2xl font-semibold tracking-tight">Pacientes</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie os pacientes cadastrados.
        </p>
      </div>

      <Separator />

      <Suspense fallback={<PatientsLoading />}>
        <PatientsContent />
      </Suspense>
    </div>
  )
}
