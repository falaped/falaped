"use client"

import { createContext, useContext, useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { HOME_FINANCE_HIDDEN_COOKIE } from "@/lib/home-finance-cookie"

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

type FinanceVisibility = { hidden: boolean; setHidden: (hidden: boolean) => void }

const FinanceContext = createContext<FinanceVisibility | null>(null)

/**
 * Escolha de ocultar os valores do Início: o financeiro do mês e o recebido de
 * hoje. Fica num cookie para o servidor já renderizar oculto, sem os valores
 * piscarem na tela.
 */
export function HomeFinanceProvider({ defaultHidden, children }: { defaultHidden: boolean; children: React.ReactNode }) {
  const [hidden, setHiddenState] = useState(defaultHidden)

  const setHidden = (next: boolean) => {
    setHiddenState(next)
    document.cookie = `${HOME_FINANCE_HIDDEN_COOKIE}=${next ? "1" : "0"}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`
  }

  return <FinanceContext.Provider value={{ hidden, setHidden }}>{children}</FinanceContext.Provider>
}

function useFinanceVisibility() {
  const context = useContext(FinanceContext)
  if (!context) throw new Error("[HOME] useFinanceVisibility fora do HomeFinanceProvider")
  return context
}

/** Financeiro do mês; oculto, vira uma barra com o título e o botão Mostrar. */
export function HomeFinanceSection({ title, children }: { title: string; children: React.ReactNode }) {
  const { hidden, setHidden } = useFinanceVisibility()
  if (!hidden) return children
  return (
    <section className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-6 py-4">
      <h2 className="font-display text-section font-semibold">{title}</h2>
      <span className="text-caption text-subtle-foreground">oculto</span>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setHidden(false)}>
        <EyeIcon data-icon="inline-start" />
        Mostrar
      </Button>
    </section>
  )
}

/** Mostra o conteúdo só com o financeiro visível (ex.: o recebido de hoje). */
export function WhenFinanceVisible({ children }: { children: React.ReactNode }) {
  return useFinanceVisibility().hidden ? null : children
}

/** Botão "Ocultar" no cabeçalho do financeiro do Início. */
export function HideFinanceButton() {
  const { setHidden } = useFinanceVisibility()
  return (
    <Button variant="ghost" size="sm" onClick={() => setHidden(true)}>
      <EyeOffIcon data-icon="inline-start" />
      Ocultar
    </Button>
  )
}
