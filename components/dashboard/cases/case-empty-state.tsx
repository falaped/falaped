import { MessagesSquareIcon, SearchXIcon } from "lucide-react"

type CaseEmptyFilter = "active" | "closed" | "all" | "search"

const emptyConfig = {
  active: {
    icon: MessagesSquareIcon,
    title: "Nenhum caso ativo.",
    description:
      "Os atendimentos ativos aparecem aqui quando houver um caso em andamento.",
  },
  closed: {
    icon: MessagesSquareIcon,
    title: "Nenhum caso encerrado.",
    description: "Os casos encerrados aparecerão aqui após o término de um atendimento.",
  },
  all: {
    icon: SearchXIcon,
    title: "Nenhum caso encontrado.",
    description:
      "Os casos aparecem aqui quando iniciados pelo painel (Criar novo caso) ou por outros canais integrados.",
  },
  search: {
    icon: SearchXIcon,
    title: "Nenhum resultado encontrado.",
    description: "Tente outro termo de busca ou limpe os filtros.",
  },
} as const

export function CaseEmptyState() {
  const config = emptyConfig.all
  const Icon = config.icon

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="mt-4 font-medium text-muted-foreground">{config.title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground/80">
        {config.description}
      </p>
    </div>
  )
}
