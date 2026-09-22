import { requireAdmin } from "@/lib/admin-guard"
import { SectionHub } from "@/components/dashboard/section-hub"

export const metadata = { title: "Admin" }

export default async function AdminHubPage() {
  await requireAdmin()
  return <SectionHub url="/dashboard/admin" />
}
