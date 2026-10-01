"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChartLineIcon, FilterIcon, LayoutDashboardIcon, MailsIcon, UsersIcon } from "lucide-react"

import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/dashboard/admin", label: "Painel", icon: LayoutDashboardIcon, exact: true },
  { href: "/dashboard/admin/funil", label: "Funil", icon: FilterIcon },
  { href: "/dashboard/admin/users", label: "Clientes", icon: UsersIcon },
  { href: "/dashboard/admin/uso", label: "Uso", icon: ChartLineIcon },
  { href: "/dashboard/admin/mensagens", label: "Mensagens", icon: MailsIcon },
]

/**
 * Abas do admin em controle segmentado: a sidebar só leva à seção, daqui se navega entre as telas.
 * `newLeads` vira o aviso no Funil: leads da landing ainda sem contato (só admin vê esta barra).
 */
export function AdminNav({ newLeads = 0 }: { newLeads?: number }) {
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
            {link.label === "Funil" && newLeads > 0 ? (
              <span
                className="rounded-full bg-orange-600 px-1.5 text-[11px] font-semibold leading-[18px] text-white tabular-nums"
                aria-label={`${newLeads} ${newLeads === 1 ? "lead novo" : "leads novos"}`}
              >
                {newLeads}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
