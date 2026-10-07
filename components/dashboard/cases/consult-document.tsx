"use client"

import { toast } from "sonner"

import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"

type PdfResult = { ok: true; pdfBase64: string; filename: string } | { ok: false; error: string }

/** Corpo rolável dos painéis da Consulta. */
export function PanelBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("flex flex-1 flex-col gap-5 overflow-auto px-6 py-5", className)}>{children}</div>
}

/** Rodapé fixo dos painéis: ações secundárias à esquerda, a principal com `ml-auto`. */
export function PanelFooter({ children }: { children: React.ReactNode }) {
  return <div className="flex shrink-0 items-center gap-2 border-t border-border px-6 py-3">{children}</div>
}

/**
 * "Emitir e imprimir": a aba abre já no clique (depois do await o navegador bloquearia o
 * pop-up) e recebe o PDF quando ele fica pronto; sem aba, cai no download. O aviso de
 * sucesso oferece "Baixar de novo". Devolve true quando emitiu.
 * ponytail: a URL do PDF não é revogada (a aba e o "Baixar de novo" dependem dela).
 */
export async function emitAndOpenPdf(generate: () => Promise<PdfResult>, successMessage: string): Promise<boolean> {
  const tab = window.open("", "_blank")
  tab?.document.write("<p style='font-family:sans-serif;padding:24px'>Gerando o PDF…</p>")
  const result = await generate().catch(() => ({ ok: false, error: "Não foi possível gerar o PDF." }) as const)
  if (!result.ok) {
    tab?.close()
    toast.error(getFriendlyToastMessage(result.error))
    return false
  }
  const url = URL.createObjectURL(
    new Blob([Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0))], { type: "application/pdf" }),
  )
  const download = () => {
    const link = document.createElement("a")
    link.href = url
    link.download = result.filename
    link.click()
  }
  if (tab) tab.location.href = url
  else download()
  toast.success(successMessage, { action: { label: "Baixar de novo", onClick: download } })
  return true
}
