import { Suspense } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

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

          <div className="flex flex-1 flex-col gap-4 p-8 relative">
            <SidebarTrigger className="absolute top-4 right-4" aria-label="Abrir menu" />
            {children}</div>
        </SidebarInset>
      </SidebarProvider>
    </Suspense>
  )
}
