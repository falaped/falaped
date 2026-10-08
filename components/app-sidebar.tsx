"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutTemplateIcon, PlusIcon } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { NavUser } from "@/components/nav-user"
import { PatientSearch } from "@/components/dashboard/patient-search"
import { ChangelogMenuItem } from "@/components/dashboard/changelog/changelog-dialog"
import { dashboardNav } from "@/lib/dashboard-nav"
import { isAdminEmail } from "@/lib/admin"
import { createClient } from "@/lib/supabase/client"
import { countNewLeadsAction } from "@/actions"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  // Só esconde o menu — cada página de /dashboard/admin tem seu próprio gate no servidor.
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setIsAdmin(isAdminEmail(data.user?.email)))
  }, [])

  // Aviso de lead novo: só roda para admin, e o action também barra quem não é.
  const [newLeads, setNewLeads] = React.useState(0)
  React.useEffect(() => {
    if (!isAdmin) return
    countNewLeadsAction().then((r) => setNewLeads(r.ok ? r.count : 0))
  }, [isAdmin, pathname])

  // A seção fica ativa tanto na própria página quanto em qualquer destino dos seus cards.
  const isSectionActive = React.useCallback(
    (section: (typeof dashboardNav)[number]): boolean => {
      if (section.url === "/dashboard") return pathname === "/dashboard"
      if (pathname === section.url || pathname.startsWith(`${section.url}/`)) return true
      return section.items.some((item) => {
        const path = item.url.split("?")[0]
        return pathname === path || pathname.startsWith(`${path}/`)
      })
    },
    [pathname],
  )

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="items-center gap-0 px-3 pt-6 pb-0 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:pt-4">
        <Link href="/dashboard" aria-label="Falaped, ir para o Início" className="mb-6 group-data-[collapsible=icon]:mb-4">
          {/* eslint-disable @next/next/no-img-element -- SVG estático, sem ganho com next/image */}
          <span className="group-data-[collapsible=icon]:hidden">
            <img src="/falaped-logo.svg" alt="" className="h-16 dark:hidden" />
            <img src="/falaped-logo-dark.svg" alt="" className="hidden h-16 dark:block" />
          </span>
          <span className="hidden group-data-[collapsible=icon]:block">
            <img src="/falaped-icon.svg" alt="" className="h-10 dark:hidden" />
            <img src="/falaped-icon-dark.svg" alt="" className="hidden h-10 dark:block" />
          </span>
          {/* eslint-enable @next/next/no-img-element */}
        </Link>
        <Button
          asChild
          size="lg"
          className="w-full group-data-[collapsible=icon]:size-10 group-data-[collapsible=icon]:p-0"
        >
          <Link href="/dashboard/cases/select-patient" title="Iniciar consulta">
            <PlusIcon />
            <span className="group-data-[collapsible=icon]:sr-only">Iniciar consulta</span>
          </Link>
        </Button>
        <div className="mt-3 w-full group-data-[collapsible=icon]:mt-1 group-data-[collapsible=icon]:w-auto">
          <PatientSearch />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-1 pt-2 group-data-[collapsible=icon]:items-center">
        <SidebarGroup>
          <SidebarMenu className="gap-0.5">
            {dashboardNav
              .filter((section) => !section.adminOnly || isAdmin)
              .map((section) => (
              <SidebarMenuItem key={section.url}>
                <SidebarMenuButton
                  asChild
                  tooltip={section.title}
                  isActive={isSectionActive(section)}
                >
                  <Link href={section.url}>
                    <section.icon />
                    <span>{section.title}</span>
                  </Link>
                </SidebarMenuButton>
                {section.adminOnly && newLeads > 0 ? (
                  <SidebarMenuBadge
                    className="bg-primary text-primary-foreground peer-data-[active=true]/menu-button:text-primary-foreground"
                    aria-label={`${newLeads} ${newLeads === 1 ? "lead novo" : "leads novos"}`}
                  >
                    {newLeads}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border group-data-[collapsible=icon]:items-center">
        <SidebarMenu className="gap-0.5">
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Modelos" isActive={pathname.startsWith("/dashboard/prescription-templates")}>
              <Link href="/dashboard/prescription-templates">
                <LayoutTemplateIcon />
                <span>Modelos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <ChangelogMenuItem />
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
