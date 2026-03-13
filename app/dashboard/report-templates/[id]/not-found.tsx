import Link from "next/link"
import { FileText } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function ReportTemplateNotFound() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
      <FileText className="h-12 w-12 text-muted-foreground" />
      <div>
        <h2 className="text-lg font-semibold">Template não encontrado</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Este template não existe ou você não tem permissão para editá-lo.
        </p>
      </div>
      <Button asChild>
        <Link href="/dashboard/report-templates">Voltar aos templates</Link>
      </Button>
    </div>
  )
}
