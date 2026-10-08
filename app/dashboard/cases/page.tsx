import { Suspense } from "react"

import { CasesContent } from "@/components/dashboard/cases/cases-content"
import { CasesLoading } from "@/components/dashboard/cases/cases-loading"

export default function CasesPage() {
  return (
    <Suspense fallback={<CasesLoading />}>
      <CasesContent />
    </Suspense>
  )
}
