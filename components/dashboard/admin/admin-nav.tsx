"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboardIcon, MagnetIcon, SendIcon, UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/dashboard/admin", label: "Painel", icon: LayoutDashboardIcon, exact: true },
  { href: "/dashboard/admin/users", label: "Clientes", icon: UsersIcon },
  { href: "/dashboard/admin/leads", label: "Leads", icon: MagnetIcon },
  { href: "/dashboard/admin/prospects", label: "Prospecção", icon: SendIcon },
]

/** Abas do admin em controle segmentado: a sidebar só leva à seção, daqui se navega entre as telas. */
export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex w-fit gap-1 rounded-xl bg-muted p-1" aria-label="Admin">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`)
        const Icon = link.icon
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2 rounded-[9px] px-3.5 py-1.5 text-sm transition-colors",
              active
                ? "bg-card font-medium text-foreground shadow-xs ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
