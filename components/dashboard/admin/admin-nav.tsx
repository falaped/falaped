"use client"

import { usePathname } from "next/navigation"

import { LinkTab } from "@/components/dashboard/admin/admin-ui"

const LINKS = [
  { href: "/dashboard/admin", label: "Painel", exact: true },
  { href: "/dashboard/admin/funil", label: "Funil" },
  { href: "/dashboard/admin/users", label: "Clientes" },
  { href: "/dashboard/admin/uso", label: "Uso" },
  { href: "/dashboard/admin/mensagens", label: "Mensagens" },
  { href: "/dashboard/admin/feedback", label: "Feedback" },
]

/**
 * Abas sublinhadas do admin: o menu só leva à seção, daqui se navega entre as telas.
 * Selos: `newLeads` no Funil (leads da landing sem contato) e `newFeedback` no Feedback (status novo).
 */
export function AdminNav({ newLeads = 0, newFeedback = 0 }: { newLeads?: number; newFeedback?: number }) {
  const pathname = usePathname()
  return (
    <nav className="flex gap-5 border-b border-border" aria-label="Admin">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`)
        const badge = link.label === "Funil" ? newLeads : link.label === "Feedback" ? newFeedback : 0
        return (
          <LinkTab key={link.href} href={link.href} active={active} count={badge > 0 ? badge : undefined} warn>
            {link.label}
          </LinkTab>
        )
      })}
    </nav>
  )
}
