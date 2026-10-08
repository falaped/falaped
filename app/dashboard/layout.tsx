import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { DesktopOnlyNotice } from "@/components/dashboard/desktop-only-notice"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-background">Carregando...</div>}>
      {/* ponytail: bloqueio por CSS abaixo de lg até existir layout mobile */}
      <div className="lg:hidden">
        <DesktopOnlyNotice />
      </div>
      <SidebarProvider className="max-lg:hidden">
        <AppSidebar />
        <SidebarInset>
          <div className="relative flex flex-1 flex-col gap-4 p-8">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  )
}
