"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type PatientContactPhoneCopyProps = {
  rawPhone: string
  className?: string
}

export function PatientContactPhoneCopy({ rawPhone, className }: PatientContactPhoneCopyProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const digits = rawPhone.replace(/\D/g, "")
    const text = digits.length > 0 ? digits : rawPhone.trim()
    try {
      await navigator.clipboard.writeText(text)
      toast.success("Telefone copiado.")
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Não foi possível copiar o telefone.")
    }
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground", className)}
      onClick={handleCopy}
      aria-label="Copiar telefone"
    >
      {copied ? (
        <CheckIcon className="h-4 w-4 text-primary" aria-hidden />
      ) : (
        <CopyIcon className="h-4 w-4" aria-hidden />
      )}
    </Button>
  )
}
