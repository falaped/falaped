import { HouseIcon, LayoutTemplateIcon, SearchIcon, StethoscopeIcon, SyringeIcon, WalletIcon, type LucideIcon } from "lucide-react"

/**
 * Novidades do app, como dado. Versão nova = uma entrada nova aqui em cima; a
 * tela não muda.
 *
 * O `id` é o que fica guardado no navegador para saber se o médico já viu esta
 * versão — muda o id, o modal reaparece uma vez. Por isso o id nunca é reusado.
 *
 * As versões de antes da 2.0 saíram: falavam de telas que não existem mais.
 */
export type ChangelogEntry = {
  icon: LucideIcon
  title: string
  description: string
}

export type ChangelogRelease = {
  id: string
  /** Data de publicação em ISO (yyyy-mm-dd). */
  date: string
  title: string
  summary: string
  entries: ChangelogEntry[]
}

/** Da mais nova para a mais antiga — a primeira é a que abre o modal. */
export const CHANGELOG: readonly ChangelogRelease[] = [
  {
    id: "2026-10-08-falaped-2-0",
    date: "2026-10-08",
    title: "O Falaped de cara nova",
    summary: "Menos cliques do início ao fim da consulta, e tudo no mesmo lugar de sempre.",
    entries: [
      {
        icon: SearchIcon,
        title: "Comece a consulta pela busca",
        description:
          "No menu, \"Iniciar consulta\" ou ⌘K: digite o nome da criança, do responsável ou o telefone e aperte Enter. Sem cadastro? Cadastre ali mesmo, só com o essencial.",
      },
      {
        icon: StethoscopeIcon,
        title: "Consulta organizada",
        description:
          "Receita, atestado, pedido de exame e encaminhamento abrem ao lado, sem sair da consulta. Encerrar mostra o que foi feito e a cobrança, em duas etapas.",
      },
      {
        icon: HouseIcon,
        title: "Seu dia no Início",
        description: "A consulta em andamento, quem atender, o que não esquecer e como está o mês, numa tela só.",
      },
      {
        icon: LayoutTemplateIcon,
        title: "Modelos com o assistente",
        description: "Receitas, exames e relatório num lugar só. Diga o quadro e o assistente sugere um modelo para você revisar.",
      },
      {
        icon: WalletIcon,
        title: "Financeiro por mês e por ano",
        description: "Veja o mês, o ano ou desde o início, e quais consultas ainda estão sem valor.",
      },
      {
        icon: SyringeIcon,
        title: "Calendário vacinal",
        description: "SUS e particular lado a lado, com a faixa de idade da criança em destaque.",
      },
    ],
  },
]

/** A versão mais recente, que o modal mostra. */
export const LATEST_RELEASE = CHANGELOG[0]
