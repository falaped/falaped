"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { SearchIcon } from "lucide-react"

/** Busca (Enter), cidade e canal (ao trocar) viram ?q=, ?cidade= e ?canal=, mantendo etapa e filtro. */
export function FunnelToolbar({ cities }: { cities: string[] }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const go = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete("todos")
    router.push(`${pathname}?${next}`)
  }

  return (
    <>
      <form
        className="flex h-9 w-72 items-center gap-2 rounded-lg px-3 ring-1 ring-border focus-within:ring-2 focus-within:ring-primary"
        onSubmit={(e) => {
          e.preventDefault()
          go("q", String(new FormData(e.currentTarget).get("q") ?? "").trim())
        }}
      >
        <SearchIcon className="size-4 text-muted-foreground" aria-hidden />
        <input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Buscar por nome, clínica ou e-mail"
          aria-label="Buscar por nome, clínica ou e-mail"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
      <select
        aria-label="Cidade"
        value={params.get("cidade") ?? ""}
        onChange={(e) => go("cidade", e.target.value)}
        className="h-9 rounded-lg bg-card px-3 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Todas as cidades</option>
        {cities.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <select
        aria-label="Canal"
        value={params.get("canal") ?? ""}
        onChange={(e) => go("canal", e.target.value)}
        className="h-9 rounded-lg bg-card px-3 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-primary"
      >
        <option value="">Todos os canais</option>
        <option value="whatsapp">Com WhatsApp</option>
        <option value="email">Com e-mail</option>
      </select>
    </>
  )
}
