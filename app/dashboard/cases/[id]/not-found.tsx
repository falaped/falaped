import Link from "next/link"
import { FileQuestionIcon } from "lucide-react"

import { Button } from "@/components/ui/button"

export default function CaseNotFound() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <FileQuestionIcon className="h-7 w-7 text-muted-foreground" />
      </div>
      <h1 className="mt-6 text-xl font-semibold">Caso não encontrado</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Este caso não existe ou você não tem permissão para visualizá-lo.
      </p>
      <Button variant="outline" className="mt-6" asChild>
        <Link href="/dashboard/cases">Voltar para casos</Link>
      </Button>
    </div>
  )
}
