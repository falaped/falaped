"use client"

import { useState, useEffect } from "react"
import { LockIcon, CopyIcon, CheckIcon, Link2OffIcon, CheckCircle2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
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
import { formatLinkedPhone, formatDateTime } from "@/lib/formatters"
import { createWhatsAppLinkCodeAction, unlinkWhatsAppAction } from "./actions"


function formatCountdown(msLeft: number): string {
  if (msLeft <= 0) return "0:00"
  const totalSeconds = Math.ceil(msLeft / 1000)
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${s.toString().padStart(2, "0")}`
}

type LinkWhatsAppContentProps = {
  linkedPhone: string | null
  whatsappLinkedAt: string | null
}

export function LinkWhatsAppContent({
  linkedPhone,
  whatsappLinkedAt,
}: LinkWhatsAppContentProps) {
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
      <div className="max-w-4xl w-full flex flex-col gap-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Conta vinculada</CardTitle>
            </div>
            <CardDescription>
              Seu WhatsApp está associado à sua conta. Você recebe atendimentos pelo Falaped neste número. Este número está vinculado com segurança à sua conta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Número vinculado
                </p>
                <p className="mt-1 font-mono text-sm font-medium">
                  {formatLinkedPhone(linkedPhoneState!)}
                </p>
              </div>
              {whatsappLinkedAt && (
                <div className="rounded-lg border border-border bg-muted/50 px-4 py-3">
                  <p className="text-xs font-medium text-muted-foreground">
                    Vinculado em
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(whatsappLinkedAt)}
                  </p>
                </div>
              )}
            </div>
            {unlinkError && (
              <p className="text-sm text-destructive" role="alert">
                {unlinkError}
              </p>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
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
                  <AlertDialogCancel disabled={unlinkLoading}>
                    Cancelar
                  </AlertDialogCancel>
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
      </div>
    )
  }

  return (
    <div className="max-w-4xl w-full">
      <Card className="w-full max-w-md">
        <CardHeader className="text-pretty text-sm text-muted-foreground w-full max-w-md">
          <div className="flex items-center gap-2">
            <LockIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Vincular WhatsApp</CardTitle>
          </div>
          <CardDescription>
            O código é único, temporário (5 minutos) e deve ser enviado apenas no WhatsApp oficial do Falaped para vincular seu número com segurança.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 ">
          {!result ? (
            <Button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Gerando código…" : "Gerar código de vinculação"}
            </Button>
          ) : (
            <div className="space-y-6 flex flex-col items-center ">
              <p className="text-sm text-muted-foreground w-full max-w-md">
                Envie este código em uma mensagem no WhatsApp para o Falaped. Código de uso único. Use apenas no WhatsApp oficial do Falaped.
              </p>
              <div className="rounded-xl border border-border bg-muted/30 p-6 space-y-5 w-full max-w-md">
                <div
                  className="flex justify-center gap-3 "
                  aria-label={`Código: ${result.code}`}
                >
                  {Array.from(result.code).map((digit, i) => (
                    <div
                      key={i}
                      className="flex h-12 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background font-mono text-xl font-semibold tabular-nums"
                    >
                      {digit}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCopy}
                  className="w-full gap-2"
                  aria-label="Copiar código"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="h-4 w-4 text-primary" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-4 w-4" />
                      Copiar código
                    </>
                  )}
                </Button>
              </div>
              {countdownMs !== null && (
                <div className="flex flex-wrap items-center gap-2">
                  {countdownMs > 0 ? (
                    <Badge variant="secondary" className="text-muted-foreground font-normal">
                      Válido por 5 min · Expira em {formatCountdown(countdownMs)}
                    </Badge>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Código expirado. Gere um novo código.
                    </p>
                  )}
                </div>
              )}
              <Button
                variant="default"
                onClick={handleGenerate}
                disabled={loading}
                className="w-full max-w-md cursor-pointer"
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
    </div>
  )
}
