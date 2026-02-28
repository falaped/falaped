"use client"

import { useState, useEffect } from "react"
import { SmartphoneIcon, CopyIcon, CheckIcon, Link2OffIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { formatLinkedPhone } from "@/lib/formatters"
import { createWhatsAppLinkCodeAction, unlinkWhatsAppAction } from "./actions"

const CODE_VALIDITY_MS = 5 * 60 * 1000

function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "0:00"
  const totalSeconds = Math.ceil(msLeft / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

type VincularWhatsAppContentProps = {
  linkedPhone: string | null
}

export function VincularWhatsAppContent({ linkedPhone }: VincularWhatsAppContentProps) {
  const [result, setResult] = useState<{ code: string; expiresAt: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [countdownMs, setCountdownMs] = useState<number | null>(null)
  const [unlinkLoading, setUnlinkLoading] = useState(false)
  const [unlinkError, setUnlinkError] = useState<string | null>(null)
  const [linkedPhoneState, setLinkedPhoneState] = useState<string | null>(linkedPhone)

  const isLinked = !!linkedPhoneState?.trim()

  useEffect(() => {
    setLinkedPhoneState(linkedPhone)
  }, [linkedPhone])

  useEffect(() => {
    if (!result?.expiresAt) {
      setCountdownMs(null)
      return
    }
    const expiresAt = new Date(result.expiresAt).getTime()
    const update = () => {
      const left = expiresAt - Date.now()
      setCountdownMs(left <= 0 ? 0 : left)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [result?.expiresAt])

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

  async function handleCopy() {
    if (!result?.code) return
    try {
      await navigator.clipboard.writeText(result.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError("Não foi possível copiar o código.")
    }
  }

  async function handleUnlink() {
    setUnlinkError(null)
    setUnlinkLoading(true)
    const res = await unlinkWhatsAppAction()
    setUnlinkLoading(false)
    if (res.ok) {
      setLinkedPhoneState(null)
      setResult(null)
    } else {
      setUnlinkError(res.error)
    }
  }

  if (isLinked) {
    return (
      <Card className="max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <SmartphoneIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Conta vinculada</CardTitle>
          </div>
          <CardDescription>
            Seu WhatsApp está associado à sua conta. Você recebe atendimentos pelo Falaped neste número.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
            <p className="text-xs font-medium text-muted-foreground">Número vinculado</p>
            <p className="mt-1 font-mono text-sm font-medium">
              {formatLinkedPhone(linkedPhoneState!)}
            </p>
          </div>
          {unlinkError && (
            <p className="text-sm text-destructive" role="alert">
              {unlinkError}
            </p>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Link2OffIcon className="mr-2 h-4 w-4" />
                Desvincular WhatsApp
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Desvincular WhatsApp?</AlertDialogTitle>
                <AlertDialogDescription>
                  O número deixará de estar associado à sua conta. Para receber atendimentos pelo Falaped novamente, será necessário vincular um número outra vez.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {unlinkError && (
                <p className="text-sm text-destructive" role="alert">
                  {unlinkError}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={unlinkLoading}>Cancelar</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={unlinkLoading}
                  onClick={handleUnlink}
                >
                  {unlinkLoading ? "Desvinculando…" : "Sim, desvincular"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    )
  }

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
            {loading ? "Gerando código…" : "Gerar código de vinculação"}
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie este código em uma mensagem no WhatsApp para o Falaped. O código é válido por 5 minutos.
            </p>
            <div className="flex items-center gap-2">
              <div
                className="flex-1 rounded-lg border border-border bg-muted/50 px-4 py-6 text-center font-mono text-2xl font-semibold tracking-[0.3em]"
                aria-label={`Código: ${result.code}`}
              >
                {result.code}
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
                aria-label="Copiar código"
              >
                {copied ? (
                  <CheckIcon className="h-4 w-4 text-green-600" />
                ) : (
                  <CopyIcon className="h-4 w-4" />
                )}
              </Button>
            </div>
            {countdownMs !== null && (
              <p className="text-xs text-muted-foreground">
                {countdownMs > 0
                  ? `Expira em ${formatCountdown(countdownMs)}`
                  : "Código expirado. Gere um novo código."}
              </p>
            )}
            <Button
              variant="outline"
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Gerando…" : "Gerar novo código"}
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
