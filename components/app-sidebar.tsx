"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  ChevronRightIcon,
  FileCheckIcon,
  HomeIcon,
  LayoutTemplateIcon,
  MessagesSquareIcon,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import { NavUser } from "@/components/nav-user"

const navMain = [
  {
    title: "Principal",
    icon: HomeIcon,
    isActive: true,
    items: [
      { title: "Início", url: "/dashboard" },
    ],
  },
  {
    title: "Atendimentos",
    icon: MessagesSquareIcon,
    isActive: false,
    items: [
      { title: "Casos", url: "/dashboard/cases" },
      { title: "Discussões", url: "/dashboard/discussions" },
      { title: "Pacientes", url: "/dashboard/patients" },
    ],
  },
  {
    title: "Templates",
    icon: LayoutTemplateIcon,
    isActive: false,
    items: [
      { title: "Templates de relatório", url: "/dashboard/report-templates" },
      { title: "Templates de receita", url: "/dashboard/prescription-templates" },
    ],
  },
  {
    title: "Serviços",
    icon: FileCheckIcon,
    isActive: false,
    items: [
      { title: "Atestados", url: "/dashboard/medical-certificates" },
      { title: "Receitas", url: "/dashboard/prescriptions" },
    ],
  },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  const isNavItemActive = React.useCallback(
    (url: string): boolean => {
      if (url === "/dashboard") return pathname === "/dashboard"

      if (url === "/dashboard/cases") {
        return (
          pathname === "/dashboard/cases" ||
          pathname.startsWith("/dashboard/cases/")
        )
      }

      return pathname.startsWith(url)
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
                <Image src="/full-logo.svg" alt="Logo FALAPED" width={150} height={48} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Plataforma</SidebarGroupLabel>
          <SidebarMenu>
            {navMain.map((group) => {
              const hasActiveChild = group.items.some((item) => isNavItemActive(item.url))

              return (
                <Collapsible
                  key={group.title}
                  asChild
                  defaultOpen={group.isActive || hasActiveChild}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={group.title}>
                        <group.icon />
                        <span>{group.title}</span>
                        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {group.items.map((item) => {
                          const isActive = isNavItemActive(item.url)
                          return (
                            <SidebarMenuSubItem key={item.url}>
                              <SidebarMenuSubButton asChild isActive={isActive}>
                                <Link href={item.url}>
                                  <span>{item.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              )
            })}
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
