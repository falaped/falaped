"use client"

import { SearchIcon, XIcon } from "lucide-react"
import { useRef } from "react"

import { Input } from "@/components/ui/input"

const DEFAULT_PLACEHOLDER = "Buscar por paciente ou responsável..."
const DEFAULT_ARIA_LABEL = "Buscar por paciente ou responsável"

export function CaseSearchInput({
  value,
  onChange,
  placeholder = DEFAULT_PLACEHOLDER,
  "aria-label": ariaLabel = DEFAULT_ARIA_LABEL,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  "aria-label"?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="relative min-w-xs">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        type="text"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-9 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={() => {
            onChange("")
            inputRef.current?.focus()
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Limpar busca"
        >
          <XIcon className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
