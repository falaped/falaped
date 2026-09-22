import {
  ArrowRightLeftIcon,
  BookOpenTextIcon,
  FileCheckIcon,
  FilePlusIcon,
  FileTextIcon,
  FlaskConicalIcon,
  HomeIcon,
  MagnetIcon,
  MessagesSquareIcon,
  PillIcon,
  ShieldIcon,
  StethoscopeIcon,
  SyringeIcon,
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
    title: "Atendimentos",
    description: "Conduza consultas, acompanhe discussões e gerencie os pacientes.",
    url: "/dashboard/appointments",
    icon: MessagesSquareIcon,
    items: [
      {
        title: "Casos",
        description: "Consultas em andamento e histórico de atendimentos.",
        url: "/dashboard/cases",
        icon: StethoscopeIcon,
      },
      {
        title: "Discussões",
        description: "Converse com o assistente sobre condutas clínicas.",
        url: "/dashboard/discussions",
        icon: MessagesSquareIcon,
      },
      {
        title: "Pacientes",
        description: "Cadastro das crianças e seus responsáveis.",
        url: "/dashboard/patients",
        icon: UsersIcon,
      },
    ],
  },
  {
    title: "Serviços",
    description: "Todos os documentos que você emite para o paciente.",
    url: "/dashboard/services",
    icon: FileCheckIcon,
    items: [
      {
        title: "Atestados",
        description: "Atestados de comparecimento e afastamento.",
        url: "/dashboard/medical-certificates",
        icon: FileCheckIcon,
      },
      {
        title: "Receitas",
        description: "Prescrições com posologia calculada por peso.",
        url: "/dashboard/prescriptions",
        icon: PillIcon,
      },
      {
        title: "Encaminhamentos",
        description: "Envio do paciente para outra especialidade.",
        url: "/dashboard/referrals",
        icon: ArrowRightLeftIcon,
      },
      {
        title: "Vacinas",
        description: "Registro e comprovantes de vacinação.",
        url: "/dashboard/vaccines",
        icon: SyringeIcon,
      },
      {
        title: "Relatórios médicos",
        description: "Laudos e relatórios de caso.",
        url: "/dashboard/medical-reports",
        icon: FileTextIcon,
      },
      {
        title: "Pedidos de exames",
        description: "Solicitação de exames laboratoriais e de imagem.",
        url: "/dashboard/exam-requests",
        icon: FlaskConicalIcon,
      },
      {
        title: "Orientações",
        description: "Orientações por escrito para os responsáveis.",
        url: "/dashboard/guidance",
        icon: BookOpenTextIcon,
      },
      {
        title: "Receituário em branco",
        description: "Papel timbrado em branco para escrever à mão.",
        url: "/dashboard/prescriptions/new?mode=blank",
        icon: FilePlusIcon,
      },
    ],
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
        title: "Usuários",
        description: "Todas as contas e o consumo de cada uma.",
        url: "/dashboard/admin/users",
        icon: UsersIcon,
      },
      {
        title: "Leads",
        description: "Cadastros das landings e contatos pelo WhatsApp.",
        url: "/dashboard/admin/leads",
        icon: MagnetIcon,
      },
    ],
  },
]
