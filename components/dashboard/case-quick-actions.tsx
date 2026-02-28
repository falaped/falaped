"use client"

import {
  FileTextIcon,
  ClipboardIcon,
  FileDownIcon,
  ShareIcon,
  BellIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"

const actions = [
  {
    label: "Gerar Relatório",
    icon: FileDownIcon,
    disabled: false,
  },
  {
    label: "Gerar Receita",
    icon: FileTextIcon,
    disabled: true,
  },
  {
    label: "Gerar Atestado",
    icon: ClipboardIcon,
    disabled: true,
  },
  {
    label: "Compartilhar",
    icon: ShareIcon,
    disabled: true,
  },
  {
    label: "Enviar Alerta",
    icon: BellIcon,
    disabled: true,
  },
] as const

export function CaseQuickActions() {
  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Button
          key={action.label}
          variant="outline"
          size="sm"
          disabled={action.disabled}
          className="gap-2"
        >
          <action.icon className="h-4 w-4" />
          {action.label}
          {action.disabled && (
            <span className="text-xs text-muted-foreground">(em breve)</span>
          )}
        </Button>
      ))}
    </div>
  )
}
