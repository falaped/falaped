"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  HomeIcon,
  MessagesSquareIcon,
  UsersIcon,
  UserIcon,
} from "lucide-react"
import { NavUser } from "@/components/nav-user"
import Image from "next/image"

const navMain = [
  { title: "Início", url: "/dashboard", icon: HomeIcon },
  { title: "Casos", url: "/dashboard/cases", icon: MessagesSquareIcon },
  { title: "Pacientes", url: "/dashboard/patients", icon: UsersIcon },
  { title: "Perfil", url: "/dashboard/profile", icon: UserIcon },
]

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname()

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="default" asChild>
              <Link href="/dashboard" className="w-full h-full flex items-center justify-center">
                <Image src="/full-logo.svg" alt="Logo FALAPED" width={140} height={60} />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarSeparator />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-1">
            {navMain.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.url
              return (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={isActive}>
                    <Link href={item.url} className="font-medium">
                      <Icon className="size-4" />
                      {item.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
