"use client"

import { usePathname } from "next/navigation"

import { LinkTab } from "@/components/dashboard/admin/admin-ui"

const LINKS = [
  { href: "/dashboard/admin", label: "Painel", exact: true },
  { href: "/dashboard/admin/funil", label: "Funil" },
  { href: "/dashboard/admin/users", label: "Clientes" },
  { href: "/dashboard/admin/uso", label: "Uso" },
  { href: "/dashboard/admin/mensagens", label: "Mensagens" },
]

/**
 * Abas sublinhadas do admin: o menu só leva à seção, daqui se navega entre as telas.
 * `newLeads` vira o selo no Funil: leads da landing ainda sem contato (só admin vê esta barra).
 */
export function AdminNav({ newLeads = 0 }: { newLeads?: number }) {
  const pathname = usePathname()
  return (
    <nav className="flex gap-5 border-b border-border" aria-label="Admin">
      {LINKS.map((link) => {
        const active = link.exact ? pathname === link.href : pathname === link.href || pathname.startsWith(`${link.href}/`)
        return (
          <LinkTab key={link.href} href={link.href} active={active} count={link.label === "Funil" && newLeads > 0 ? newLeads : undefined} warn>
            {link.label}
          </LinkTab>
        )
      })}
    </nav>
  )
}
