import Link from "next/link"
import { Download } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/formatters"
import type { MedicalReportListItem } from "@/modules/medical-reports/types"
import { cn } from "@/lib/utils"

type MedicalReportCardProps = {
  medicalReport: MedicalReportListItem
  className?: string
}

export function MedicalReportCard({
  medicalReport,
  className,
}: MedicalReportCardProps) {
  const subtitle =
    medicalReport.patient_name ?? medicalReport.location_state ?? "—"

  return (
    <Card
      className={cn(
        "transition-colors hover:border-primary/30 hover:bg-muted/30",
        className,
      )}
    >
      <CardContent className="p-5">
        <div className="flex flex-col gap-3">
          <p className="font-medium text-foreground">
            {formatDate(medicalReport.issued_at)}
          </p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
          <div className="mt-1">
            {medicalReport.pdf_storage_path ? (
              <Button variant="outline" size="sm" asChild>
                <Link
                  href={`/api/medical-reports/${medicalReport.id}/download`}
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
