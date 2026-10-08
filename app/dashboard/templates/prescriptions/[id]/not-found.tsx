import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function ReportTemplateNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <div>
        <h2 className="font-display text-section font-semibold">Modelo não encontrado</h2>
        <p className="mt-1 text-muted-foreground">Ele não existe mais ou não é seu.</p>
      </div>
      <Button asChild>
        <Link href="/dashboard/templates">Voltar aos modelos</Link>
      </Button>
    </div>
  )
}
