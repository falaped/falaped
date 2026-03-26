import { Suspense } from "react"

import { DashboardHomeContent } from "@/components/dashboard/home/dashboard-home-content"
import { DashboardHomeLoading } from "@/components/dashboard/home/dashboard-home-loading"

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardHomeLoading />}>
      <DashboardHomeContent />
    </Suspense>
  )
}
