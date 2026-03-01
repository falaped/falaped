import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function PatientNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <p className="font-medium text-muted-foreground">
        Paciente não encontrado.
      </p>
      <p className="text-sm text-muted-foreground/80">
        O paciente pode ter sido removido ou você não tem acesso a ele.
      </p>
      <Button asChild>
        <Link href="/dashboard/patients">Voltar para Pacientes</Link>
      </Button>
    </div>
  )
}
