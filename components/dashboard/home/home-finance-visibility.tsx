"use client"

import { createContext, useContext, useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { HOME_FINANCE_HIDDEN_COOKIE } from "@/lib/home-finance-cookie"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const HideContext = createContext<(() => void) | null>(null)

/**
 * Financeiro do Início com opção de ocultar. A escolha fica num cookie para o
 * servidor já renderizar a seção oculta, sem os valores piscarem na tela.
 */
export function HomeFinanceVisibility({
  defaultHidden,
  title,
  children,
}: {
  defaultHidden: boolean
  title: string
  children: React.ReactNode
}) {
  const [hidden, setHidden] = useState(defaultHidden)

  const update = (next: boolean) => {
    setHidden(next)
    document.cookie = `${HOME_FINANCE_HIDDEN_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
  }

  if (hidden) {
    return (
      <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-6 py-4">
        <h2 className="font-display text-section font-semibold">{title}</h2>
        <span className="text-caption text-subtle-foreground">oculto</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => update(false)}>
          <EyeIcon data-icon="inline-start" />
          Mostrar
        </Button>
      </section>
    )
  }

  return <HideContext.Provider value={() => update(true)}>{children}</HideContext.Provider>
}

/** Botão "Ocultar" no cabeçalho do financeiro do Início. */
export function HideFinanceButton() {
  const hide = useContext(HideContext)
  if (!hide) return null
  return (
    <Button variant="ghost" size="sm" onClick={hide}>
      <EyeOffIcon data-icon="inline-start" />
      Ocultar
    </Button>
  )
}
