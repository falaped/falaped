import { Suspense } from "react"

import { CaseDetailContent } from "@/components/dashboard/case-detail-content"
import { CaseDetailLoading } from "@/components/dashboard/case-detail-loading"

export default async function CaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<CaseDetailLoading />}>
      <CaseDetailContent id={id} />
    </Suspense>
  )
}
