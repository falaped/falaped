"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const LINKS = [
  { href: "/dashboard/admin", label: "Painel", exact: true },
  { href: "/dashboard/admin/users", label: "Clientes" },
  { href: "/dashboard/admin/leads", label: "Leads" },
  { href: "/dashboard/admin/prospects", label: "Prospecção" },
]

/** Abas do admin: a sidebar só leva à seção, daqui se navega entre as telas. */
export function AdminNav() {
  const pathname = usePathname()
  return (
    <nav className="flex gap-6 border-b" aria-label="Admin">
      {LINKS.map((link) => {
        const active = link.exact
          ? pathname === link.href
          : pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "-mb-px border-b-2 pb-2.5 text-sm transition-colors",
              active
                ? "border-foreground font-medium text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
