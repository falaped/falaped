"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutTemplateIcon, ShieldIcon, SyringeIcon } from "lucide-react"

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
import { NavUser } from "@/components/nav-user"
import { PatientSearch } from "@/components/dashboard/patient-search"
import { ChangelogMenuItem } from "@/components/dashboard/changelog/changelog-dialog"
import { dashboardNav } from "@/lib/dashboard-nav"
import { isAdminEmail } from "@/lib/admin"
import { createClient } from "@/lib/supabase/client"
import { countNewLeadsAction } from "@/actions"

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()
  // Só esconde o item Admin — cada página de /dashboard/admin tem seu próprio gate no servidor.
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
        <PatientSearch />
      </SidebarHeader>

      <SidebarContent className="px-1 pt-2 group-data-[collapsible=icon]:items-center">
        <SidebarGroup>
          <SidebarMenu className="gap-0.5">
            {dashboardNav.map((section) => (
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
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border group-data-[collapsible=icon]:items-center">
        <SidebarMenu className="gap-0.5">
          {isAdmin ? (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Admin" isActive={pathname.startsWith("/dashboard/admin")}>
                <Link href="/dashboard/admin">
                  <ShieldIcon />
                  <span>Admin</span>
                </Link>
              </SidebarMenuButton>
              {newLeads > 0 ? (
                <SidebarMenuBadge
                  className="border border-warning-border bg-warning-soft text-warning-text peer-data-[active=true]/menu-button:text-warning-text"
                  aria-label={`${newLeads} ${newLeads === 1 ? "lead novo" : "leads novos"}`}
                >
                  {newLeads}
                </SidebarMenuBadge>
              ) : null}
            </SidebarMenuItem>
          ) : null}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Modelos" isActive={pathname.startsWith("/dashboard/templates")}>
              <Link href="/dashboard/templates">
                <LayoutTemplateIcon />
                <span>Modelos</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* Referência, não documento: o calendário do SUS e da rede particular. */}
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Vacinas" isActive={pathname.startsWith("/dashboard/vaccines")}>
              <Link href="/dashboard/vaccines">
                <SyringeIcon />
                <span>Vacinas</span>
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
