"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ClipboardListIcon,
  CoinsIcon,
  FolderOpenIcon,
  MicroscopeIcon,
  NotebookPenIcon,
  PaperclipIcon,
  SparklesIcon,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

// Componentes de ícone não atravessam a fronteira RSC → cliente; o RSC manda o nome.
const ICONS = {
  report: SparklesIcon,
  documents: FolderOpenIcon,
  reminders: NotebookPenIcon,
  scales: ClipboardListIcon,
  attachments: PaperclipIcon,
  exams: MicroscopeIcon,
  earnings: CoinsIcon,
} as const

// Largura do drawer por seção: relatório e exames mostram páginas/texto longo,
// os demais são listas curtas. Mesmo prefixo de variante do Sheet para o
// tailwind-merge substituir o `sm:max-w-sm` padrão.
const WIDTHS = {
  report: "data-[side=right]:sm:max-w-5xl",
  exams: "data-[side=right]:sm:max-w-5xl",
  documents: "data-[side=right]:sm:max-w-2xl",
  attachments: "data-[side=right]:sm:max-w-2xl",
  reminders: "data-[side=right]:sm:max-w-2xl",
  scales: "data-[side=right]:sm:max-w-2xl",
  earnings: "data-[side=right]:sm:max-w-2xl",
} satisfies Record<keyof typeof ICONS, string>

export type CaseSection = {
  key: keyof typeof ICONS
  title: string
  description: string
  /** Conteúdo (RSC ou cliente) mostrado abaixo da grade quando o card está aberto. */
  content: ReactNode
}

/**
 * Grade de cards no visual do menu de serviços; clicar num card abre o
 * conteúdo dele num drawer à direita.
 */
export function CaseSectionCards({ sections }: { sections: CaseSection[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // `?open=<key>`: os fluxos de novo atestado/receita voltam com o drawer já aberto.
  const [openKey, setOpenKey] = useState<string | null>(searchParams.get("open"))
  const open = sections.find((section) => section.key === openKey) ?? null

  function close() {
    setOpenKey(null)
    if (searchParams.has("open")) router.replace(pathname, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = ICONS[section.key]
          const isOpen = section.key === openKey
          return (
            <button
              key={section.key}
              type="button"
              className="group h-full text-left"
              aria-haspopup="dialog"
              aria-expanded={isOpen}
              onClick={() => setOpenKey(section.key)}
            >
              <Card
                className={cn(
                  "h-full transition-colors group-hover:border-primary group-hover:bg-primary/5",
                  isOpen && "border-primary bg-primary/5 ring-primary/40",
                )}
              >
                <CardHeader className="flex flex-row items-center gap-2.5 space-y-0">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                  <CardTitle className="text-base font-semibold">{section.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{section.description}</p>
                </CardContent>
              </Card>
            </button>
          )
        })}
      </div>
      <Sheet open={open != null} onOpenChange={(next) => !next && close()}>
        {open ? (
          <SheetContent className={cn("w-full overflow-y-auto", WIDTHS[open.key])}>
            <SheetHeader className="pr-12">
              <SheetTitle>{open.title}</SheetTitle>
              <SheetDescription>{open.description}</SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-4">{open.content}</div>
          </SheetContent>
        ) : null}
      </Sheet>
    </div>
  )
}
