"use client"

import { PlusIcon } from "lucide-react"

import { openStartConsult } from "@/components/dashboard/patient-search"
import { Button } from "@/components/ui/button"

/** "Iniciar consulta" no topo de uma página: abre a mesma janela do menu. */
export function StartConsultButton() {
  return (
    <Button size="lg" variant="outline" className="ml-auto" onClick={() => openStartConsult()}>
      <PlusIcon data-icon="inline-start" />
      Iniciar consulta
    </Button>
  )
}
