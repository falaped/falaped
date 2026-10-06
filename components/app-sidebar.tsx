"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"
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
      if (pathname === section.url) return true
      return section.items.some((item) => {
        const path = item.url.split("?")[0]
        return pathname === path || pathname.startsWith(`${path}/`)
      })
    },
    [pathname],
  )

  return (
    <Sidebar {...props}>
      <SidebarHeader className="flex justify-center items-center border-b border-b-border border-t-8 border-t-primary">
        <SidebarMenu className=" flex justify-center items-center">
          <SidebarMenuItem className="my-4 flex justify-center items-center">
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <Image src="/full-logo.svg" alt="Logo FALAPED" width={150} height={48} loading="eager" className="h-12 w-auto" />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarMenu>
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
                    className="bg-orange-600 text-white peer-data-[active=true]/menu-button:text-white"
                    aria-label={`${newLeads} ${newLeads === 1 ? "lead novo" : "leads novos"}`}
                  >
                    {newLeads}
                  </SidebarMenuBadge>
                ) : null}
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarMenu>
            <ChangelogMenuItem />
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
