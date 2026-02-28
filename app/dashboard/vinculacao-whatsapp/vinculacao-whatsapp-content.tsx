"use client"

import { useState } from "react"
import { SmartphoneIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createWhatsAppLinkCodeAction } from "./actions"

export function VincularWhatsAppContent() {
  const [result, setResult] = useState<{ code: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setError(null)
    setResult(null)
    setLoading(true)
    const res = await createWhatsAppLinkCodeAction()
    setLoading(false)
    if (res.ok) {
      setResult({ code: res.code, expiresAt: res.expiresAt })
    } else {
      setError(res.error)
    }
  }

  const expiresAtDate = result?.expiresAt ? new Date(result.expiresAt) : null
  const expiresInMinutes = expiresAtDate
    ? Math.max(0, Math.ceil((expiresAtDate.getTime() - Date.now()) / 60_000))
    : null

  return (
    <Card className="max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <SmartphoneIcon className="h-5 w-5 text-muted-foreground" />
          <CardTitle>Vincular WhatsApp</CardTitle>
        </div>
        <CardDescription>
          Associe seu número do WhatsApp à sua conta para receber atendimentos pelo Falaped.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!result ? (
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Gerando código..." : "Gerar código de vinculação"}
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie este código em uma mensagem no WhatsApp para o Falaped. O código é válido por 5 minutos.
            </p>
            <div
              className="rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-mono text-2xl font-semibold tracking-[0.3em]"
              aria-label={`Código: ${result.code}`}
            >
              {result.code}
            </div>
            {expiresInMinutes !== null && expiresInMinutes > 0 && (
              <p className="text-xs text-muted-foreground">
                Expira em aproximadamente {expiresInMinutes} minuto{expiresInMinutes !== 1 ? "s" : ""}.
              </p>
            )}
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Gerando..." : "Gerar novo código"}
            </Button>
          </div>
        )}
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
