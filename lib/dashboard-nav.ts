import {
  FileTextIcon,
  HomeIcon,
  ChartLineIcon,
  FilterIcon,
  MailsIcon,
  ShieldIcon,
  StethoscopeIcon,
  TrendingUpIcon,
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
  /** Só aparece na sidebar para as contas de `ADMIN_EMAILS`. O gate real é server-side. */
  adminOnly?: boolean
}

/**
 * Menus da sidebar. Cada seção é um link direto; os antigos submenus viram
 * cards na própria página da seção (`items`), lidos desta mesma lista.
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
    items: [
      {
        title: "Ganhos",
        description: "Recebimentos por período, com gráfico e lançamentos.",
        url: "/dashboard/earnings",
        icon: TrendingUpIcon,
      },
    ],
  },
  {
    title: "Admin",
    description: "Uso da plataforma e captação — só para o time do Falaped.",
    url: "/dashboard/admin",
    icon: ShieldIcon,
    adminOnly: true,
    items: [
      {
        title: "Funil",
        description: "Leads da landing e pediatras captados, do primeiro contato à assinatura.",
        url: "/dashboard/admin/funil",
        icon: FilterIcon,
      },
      {
        title: "Clientes",
        description: "Contas, pagamento, atividade e consumo de cada uma.",
        url: "/dashboard/admin/users",
        icon: UsersIcon,
      },
      {
        title: "Uso do produto",
        description: "Consumo de IA, funcionalidades usadas e onde as contas param.",
        url: "/dashboard/admin/uso",
        icon: ChartLineIcon,
      },
      {
        title: "Mensagens",
        description: "Modelos de e-mail e WhatsApp por momento, com a taxa de cada um.",
        url: "/dashboard/admin/mensagens",
        icon: MailsIcon,
      },
    ],
  },
]
