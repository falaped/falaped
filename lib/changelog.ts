/**
 * Novidades do app, como dado. Versão nova = uma entrada nova aqui em cima; a
 * tela não muda.
 *
 * O `id` é o que fica guardado no navegador para saber se o médico já viu esta
 * versão — muda o id, o modal reaparece uma vez. Por isso o id nunca é reusado.
 */
export type ChangelogEntry = {
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
    id: "2026-09-22-menu-reorganizado",
    date: "2026-09-22",
    title: "Menu reorganizado",
    summary:
      "A barra lateral agora tem só quatro menus, sem submenus. O que era submenu virou card dentro da página de cada menu.",
    entries: [
      {
        title: "Quatro menus na barra lateral",
        description:
          "Início, Atendimentos, Serviços e Financeiro. Um clique abre a página do menu — nada mais desdobra na lateral.",
      },
      {
        title: "Os submenus viraram cards",
        description:
          "Ao entrar em Atendimentos, Serviços ou Financeiro, as opções daquele menu aparecem como cards na tela, cada um com uma linha explicando o que faz.",
      },
      {
        title: "Templates no seu perfil",
        description:
          "Templates de relatório e de receita saíram da barra lateral e ficam agora no menu do seu nome, no rodapé, logo abaixo de Perfil. O atalho de vincular telefone, que não era mais usado, foi removido.",
      },
    ],
  },
  {
    id: "2026-09-21-consulta-pediatrica",
    date: "2026-09-21",
    title: "Consulta pediátrica",
    summary:
      "Escalas na consulta, anexos no paciente, lembretes que atravessam para a próxima consulta, pressão arterial com percentis e correções no calendário vacinal.",
    entries: [
      {
        title: "Escalas pediátricas na consulta",
        description:
          "Aplique escalas durante o atendimento e o resultado fica no histórico da criança. Já disponíveis: FLACC, Wong-Baker, McIsaac, STRONGkids, M-CHAT-R, M-CHAT-R/F, marcos da Caderneta, Apgar, Glasgow pediátrica, Silverman-Andersen, NIPS, Westley, Tal, PRAM e PEWS. A lista mostra só as escalas da idade da criança.",
      },
      {
        title: "Pressão arterial com percentis",
        description:
          "A PA entra junto de peso, estatura e PC. A classificação sai na hora pela tabela do AAP 2017 — percentis por idade, sexo e estatura até os 12 anos, cortes fixos a partir dos 13. O histórico mostra a faixa de cada aferição.",
      },
      {
        title: "Anexos no paciente e na consulta",
        description:
          "Anexe qualquer arquivo — exame, laudo, foto — com um nome seu. PDF e imagens abrem em outra aba; o resto baixa. Os arquivos ficam em armazenamento privado, acessíveis só por você.",
      },
      {
        title: "Lembretes e resumo da última consulta",
        description:
          "Registre lembretes e pendências durante o atendimento, um por linha. Ao fechar a consulta, um resumo é gerado a partir da conversa, do relatório e dos lembretes — e aparece quando você abre a próxima consulta daquela criança.",
      },
      {
        title: "Endereço e familiares na ficha",
        description:
          "Campo de endereço da criança e um campo livre para anotar outros familiares — útil quando a criança mora com a mãe, com o pai ou com a avó.",
      },
      {
        title: "Correções no calendário vacinal",
        description:
          "A COVID-19 de 6 meses estava no calendário particular e passou para o SUS. A Pneumo 10 foi acrescentada aos 2 e aos 6 meses. Nenhuma marcação de dose já feita foi perdida.",
      },
    ],
  },
]

/** A versão mais recente, que o modal mostra. */
export const LATEST_RELEASE = CHANGELOG[0]
