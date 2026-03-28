import Link from "next/link"
import { FileCheckIcon, Pill } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/**
 * Navigation to prescription and certificate lists (create flows use the row above when a patient is linked).
 */
export function CaseDetailRelatedLinks() {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">
          Documentos e cadastros
        </CardTitle>
        <CardDescription>
          Acesse as listas de receitas e atestados do seu perfil.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href="/dashboard/prescriptions">
            <Pill className="h-4 w-4" aria-hidden />
            Receitas
          </Link>
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" asChild>
          <Link href="/dashboard/medical-certificates">
            <FileCheckIcon className="h-4 w-4" aria-hidden />
            Atestados
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
