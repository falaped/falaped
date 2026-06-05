import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>}>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>

          <div className="flex flex-1 flex-col gap-4 p-8 relative border-t-8 border-t-primary">
            {children}</div>
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  )
}
