"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import Image from "next/image"
import {
  ChevronRightIcon,
  HomeIcon,
  MessagesSquareIcon,
  UsersIcon,
  UserIcon,
  SettingsIcon,
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
      { title: "Pacientes", url: "/dashboard/patients" },
    ],
  },
  {
    title: "Configurações",
    icon: SettingsIcon,
    isActive: false,
    items: [
      { title: "Perfil", url: "/dashboard/profile" },
    ],
  },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

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
              const hasActiveChild = group.items.some((item) =>
                item.url === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname.startsWith(item.url),
              )

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
                          const isActive =
                            item.url === "/dashboard"
                              ? pathname === "/dashboard"
                              : pathname.startsWith(item.url)
                          return (
                            <SidebarMenuSubItem key={item.title}>
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
