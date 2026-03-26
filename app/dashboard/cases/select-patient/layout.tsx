import { SelectPatientPageHeader } from "@/components/dashboard/cases/select-patient-page-header"
import { Separator } from "@/components/ui/separator"

export default function SelectPatientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-6">
      <SelectPatientPageHeader />
      <Separator />
      {children}
    </div>
  )
}
