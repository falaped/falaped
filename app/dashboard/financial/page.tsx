import { Suspense } from "react"

import { FinancialContent } from "@/components/dashboard/financial/financial-content"
import { PatientsLoading } from "@/components/dashboard/patients/patients-loading"

export const metadata = { title: "Financeiro" }

export default function FinancialPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  return (
    <Suspense fallback={<PatientsLoading label="Carregando financeiro" />}>
      <FinancialContent searchParams={searchParams} />
    </Suspense>
  )
}
