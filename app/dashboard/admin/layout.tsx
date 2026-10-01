import { AdminNav } from "@/components/dashboard/admin/admin-nav"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6">
      <AdminNav />
      {children}
    </div>
  )
}
