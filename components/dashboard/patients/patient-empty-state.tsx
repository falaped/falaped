import Link from "next/link"
import { UserPlusIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function PatientEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <UserPlusIcon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 font-medium text-muted-foreground">
        Nenhum paciente cadastrado.
      </p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground/80">
        Cadastre o primeiro paciente para começar.
      </p>
      <div className="mt-4">
        <Button asChild>
          <Link href="/dashboard/patients/new">Cadastrar paciente</Link>
        </Button>
      </div>
    </div>
  )
}
