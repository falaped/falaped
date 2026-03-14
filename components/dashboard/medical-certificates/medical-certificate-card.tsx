import Link from "next/link"
import { Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/formatters"
import type {
  MedicalCertificateListItem,
  MedicalCertificateType,
} from "@/modules/medical-certificates/get-medical-certificates-by-profile-id"
import { cn } from "@/lib/utils"

const TYPE_LABELS: Record<MedicalCertificateType, string> = {
  comparecimento: "Comparecimento",
  aptidao_fisica: "Aptidão Física",
  medico: "Médico (afastamento)",
  acompanhante: "Acompanhante",
}

type MedicalCertificateCardProps = {
  certificate: MedicalCertificateListItem
  className?: string
}

export function MedicalCertificateCard({
  certificate,
  className,
}: MedicalCertificateCardProps) {
  const subtitle = certificate.patient_name ?? certificate.location_state ?? "—"

  return (
    <Card
      className={cn(
        "transition-colors hover:border-primary/30 hover:bg-muted/30",
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          <Badge variant="secondary" className="w-fit text-xs">
            {TYPE_LABELS[certificate.type]}
          </Badge>
          <p className="font-medium text-foreground">
            {formatDate(certificate.issued_at)}
          </p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-1">
            {certificate.pdf_storage_path ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/api/medical-certificates/${certificate.id}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="mr-1.5 h-4 w-4" />
                  Baixar PDF
                </Link>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">
                PDF não disponível
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
