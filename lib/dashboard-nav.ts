import {
  FileTextIcon,
  HomeIcon,
  StethoscopeIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

export type DashboardNavItem = {
  title: string
  description: string
  url: string
  icon: LucideIcon
}

export type DashboardNavSection = {
  title: string
  description: string
  url: string
  icon: LucideIcon
  items: DashboardNavItem[]
}

/**
 * Menus da sidebar. Cada seção é um link direto; `items` são as subpáginas que mantêm
 * a seção acesa no menu (hoje só o Admin).
 */
export const dashboardNav: DashboardNavSection[] = [
  {
    title: "Início",
    description: "Visão geral da sua prática.",
    url: "/dashboard",
    icon: HomeIcon,
    items: [],
  },
  {
    title: "Consultas",
    description: "Consultas em andamento e histórico de atendimentos.",
    url: "/dashboard/cases",
    icon: StethoscopeIcon,
    items: [],
  },
  {
    title: "Pacientes",
    description: "Cadastro das crianças e seus responsáveis.",
    url: "/dashboard/patients",
    icon: UsersIcon,
    items: [],
  },
  {
    title: "Documentos",
    description: "Receitas, atestados, pedidos de exame e encaminhamentos que você emitiu.",
    url: "/dashboard/services",
    icon: FileTextIcon,
    items: [],
  },
  {
    title: "Financeiro",
    description: "O dinheiro que entra na sua prática.",
    url: "/dashboard/financial",
    icon: WalletIcon,
    items: [],
  },
]
