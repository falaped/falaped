"use client"

import { useState } from "react"
import type { ComponentType, ReactNode } from "react"
import type { LucideProps } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type CaseSection = {
  key: string
  icon: ComponentType<LucideProps>
  title: string
  description: string
  /** Conteúdo (RSC ou cliente) mostrado abaixo da grade quando o card está aberto. */
  content: ReactNode
}

/**
 * Grade de cards no visual do menu de serviços; clicar num card abre o
 * conteúdo dele logo abaixo da grade (um por vez, clicar de novo fecha).
 */
export function CaseSectionCards({ sections }: { sections: CaseSection[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null)
  const open = sections.find((section) => section.key === openKey) ?? null

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          const isOpen = section.key === openKey
          return (
            <button
              key={section.key}
              type="button"
              className="group h-full text-left"
              aria-expanded={isOpen}
              onClick={() => setOpenKey(isOpen ? null : section.key)}
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
      {open ? <div className="animate-fade-in">{open.content}</div> : null}
    </div>
  )
}
