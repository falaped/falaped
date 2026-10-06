"use client"

import { useState } from "react"
import { Check, Send } from "lucide-react"
import { noticeButtonClass } from "@/components/illustrated-notice"

/**
 * Botão que manda o link do app para o próprio médico (WhatsApp, e-mail…) abrir depois no computador.
 */
export function SendLinkToComputer() {
  const [copied, setCopied] = useState(false)

  async function handleClick() {
    const url = `${window.location.origin}/dashboard`
    if (navigator.share) {
      try {
        await navigator.share({ title: "Falaped", text: "Abrir o Falaped no computador", url })
        return
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") return
      }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
  }

  return (
    <button type="button" onClick={handleClick} className={noticeButtonClass}>
      {copied ? <Check className="size-5" /> : <Send className="size-5" />}
      {copied ? "Link copiado" : "Mandar o link para mim"}
    </button>
  )
}
