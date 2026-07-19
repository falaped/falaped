"use client"

import { SearchIcon, XIcon, Plus } from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import type { ExamCatalogItem } from "@/modules/exam-catalog/types"

/** Normalizes a string for accent/case-insensitive comparison (mirrors report-template-search). */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

type ExamCatalogSearchProps = {
  items: ExamCatalogItem[]
  /** Already-added exam strings (to avoid suggesting duplicates). */
  selected: string[]
  /** Adds a resolved exam name string to the request (Pitfall 5). */
  onAdd: (name: string) => void
}

/**
 * Searchable exam catalog (D-01). Client-side filtered list; selecting a catalog
 * item adds its name string. Free-text adds an off-catalog exam.
 */
export function ExamCatalogSearch({
  items,
  selected,
  onAdd,
}: ExamCatalogSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")

  const normalizedSelected = useMemo(
    () => new Set(selected.map((s) => normalize(s))),
    [selected],
  )

  const filtered = useMemo(() => {
    const q = normalize(query)
    return items.filter((item) => {
      if (normalizedSelected.has(normalize(item.name))) return false
      if (!q) return true
      return normalize(item.name).includes(q)
    })
  }, [items, query, normalizedSelected])

  const trimmedQuery = query.trim()
  const canAddFreeText =
    trimmedQuery.length > 0 && !normalizedSelected.has(normalize(trimmedQuery))

  function handleAdd(name: string) {
    onAdd(name)
    setQuery("")
    inputRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Buscar exame no catálogo ou digitar um exame..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 pr-8"
          aria-label="Buscar exame no catálogo"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("")
              inputRef.current?.focus()
            }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Limpar busca"
          >
            <XIcon className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-56 overflow-auto rounded-md border border-border">
        {filtered.length > 0 ? (
          <ul className="divide-y divide-border">
            {filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => handleAdd(item.name)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate">{item.name}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            <p>Nenhum exame encontrado.</p>
            <p className="mt-1 text-xs">
              Digite para adicionar um exame fora do catálogo.
            </p>
          </div>
        )}
      </div>

      {canAddFreeText ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-start"
          onClick={() => handleAdd(trimmedQuery)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar &quot;{trimmedQuery}&quot;
        </Button>
      ) : null}
    </div>
  )
}
