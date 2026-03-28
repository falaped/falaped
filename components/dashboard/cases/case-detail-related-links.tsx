import Link from "next/link"
import { ExternalLinkIcon, FileCheckIcon, FileTextIcon, Pill, UserIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

type CaseDetailRelatedLinksProps = {
  patientId: string | null
  /** Hide card title when used inside the "Documentos" tab. */
  variant?: "default" | "tabPanel"
}

/**
 * Real navigation links to prescriptions, certificates, and patient chart (no placeholder CTAs).
 */
export function CaseDetailRelatedLinks({
  patientId,
  variant = "default",
}: CaseDetailRelatedLinksProps) {
  const isTabPanel = variant === "tabPanel"

  return (
    <Card className="border-border/80">
      {!isTabPanel ? (
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Documentos e cadastros
          </CardTitle>
          <CardDescription>
            Abra listas ou crie documentos; o relatório está na aba correspondente.
          </CardDescription>
        </CardHeader>
      ) : null}
      <CardContent
        className={cn("flex flex-wrap gap-2", isTabPanel && "pt-2 sm:pt-4")}
      >
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href="/dashboard/prescriptions">
            <Pill className="h-4 w-4" aria-hidden />
            Receitas
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href="/dashboard/prescriptions/new">
            <ExternalLinkIcon className="h-4 w-4" aria-hidden />
            Nova receita
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href="/dashboard/medical-certificates">
            <FileCheckIcon className="h-4 w-4" aria-hidden />
            Atestados
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href="/dashboard/medical-certificates/new">
            <FileTextIcon className="h-4 w-4" aria-hidden />
            Novo atestado
          </Link>
        </Button>
        {patientId ? (
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href={`/dashboard/patients/${patientId}`}>
              <UserIcon className="h-4 w-4" aria-hidden />
              Ficha do paciente
            </Link>
          </Button>
        ) : null}
      </CardContent>
    </Card>
  )
}
