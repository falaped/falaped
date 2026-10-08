import { Suspense } from "react"

import { requireAdmin } from "@/lib/admin-guard"
import { countNewLeads } from "@/modules/admin/count-new-leads"
import { AdminNav } from "@/components/dashboard/admin/admin-nav"

async function AdminNavWithLeads() {
  const admin = await requireAdmin()
  return <AdminNav newLeads={await countNewLeads(admin)} />
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-6">
      <Suspense fallback={<AdminNav />}>
        <AdminNavWithLeads />
      </Suspense>
      {children}
    </div>
  )
}
