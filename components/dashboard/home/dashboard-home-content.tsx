import Link from "next/link"
import { redirect } from "next/navigation"
import { HomeIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { createClient } from "@/lib/supabase/server"
import { formatBrazilianPhone, formatDate, formatRelativeTime } from "@/lib/formatters"
import { formatDashboardChatContextSummaryForDisplay } from "@/modules/dashboard/format-dashboard-chat-context-summary-for-display"
import { cn } from "@/lib/utils"
import { getDashboardHomeData } from "@/modules/dashboard/get-dashboard-home-data"
import { formatAgeFromBirthDate } from "@/modules/falaped-assistant/lib/formatters"
import { getAuthenticatedUser } from "@/modules/supabase/get-authenticated-user"

import type { CaseOrigin } from "@/modules/cases/types"

function originLabel(origin: CaseOrigin): string {
  return origin === "whatsapp" ? "WhatsApp" : "Painel"
}

function truncateText(text: string, maxChars: number): string {
  const t = text.trim()
  if (t.length <= maxChars) return t
  return `${t.slice(0, maxChars - 1)}…`
}

export async function DashboardHomeContent() {
  const supabase = await createClient()
  const { profile } = await getAuthenticatedUser(supabase)
  if (!profile?.id) redirect("/auth/login")

  const home = await getDashboardHomeData(supabase, profile)
  const activeContextSummaryDisplay =
    formatDashboardChatContextSummaryForDisplay(
      home.activeCase?.contextSummary ?? null,
    )

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2.5">
          <HomeIcon className="h-5 w-5 text-muted-foreground" aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Início</h1>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Visão geral da sua prática: caso em andamento, números de cadastros e
          documentos emitidos.
        </p>
      </div>

      {home.activeCase ? (
        <Card className="border-primary/35 bg-primary/5">
          <CardHeader className="flex flex-col gap-2 border-b border-border/80 pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-lg font-semibold">
                  Caso em andamento
                </CardTitle>
                <Badge variant="secondary" className="font-normal">
                  {originLabel(home.activeCase.origin)}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Há no máximo um caso ativo por vez; retome o atendimento ou
                encerre na ficha do caso.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href={`/dashboard/cases/${home.activeCase.id}`}>
                Abrir caso
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Paciente
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {home.activeCase.patient?.name ?? (
                    <span className="font-normal text-muted-foreground">
                      Sem paciente associado
                    </span>
                  )}
                </p>
                {home.activeCase.patient?.birthDate ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {formatAgeFromBirthDate(home.activeCase.patient.birthDate)}
                    {" · "}
                    Nasc. {formatDate(home.activeCase.patient.birthDate)}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Responsável
                </p>
                <p className="mt-1 text-sm text-foreground">
                  {home.activeCase.patient?.responsible ?? "Não informado"}
                </p>
                {home.activeCase.patient?.contactPhone ? (
                  <a
                    href={`tel:${home.activeCase.patient.contactPhone.replace(/\D/g, "")}`}
                    className="mt-1 inline-block text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {formatBrazilianPhone(
                      home.activeCase.patient.contactPhone.replace(/\D/g, ""),
                    )}
                  </a>
                ) : (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Telefone não informado
                  </p>
                )}
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Linha do tempo
                </p>
                <p className="mt-1 text-sm text-foreground">
                  Início {formatDate(home.activeCase.startedAt)}
                  <span className="block text-xs text-muted-foreground">
                    {formatRelativeTime(home.activeCase.startedAt)}
                  </span>
                </p>
                {home.activeCase.lastMessageAt ? (
                  <p className="mt-2 text-sm text-foreground">
                    Última mensagem{" "}
                    {formatRelativeTime(home.activeCase.lastMessageAt)}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Nenhuma mensagem registrada ainda.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
              <Badge variant="outline" className="font-normal">
                {home.activeCase.messageCount}{" "}
                {home.activeCase.messageCount === 1
                  ? "mensagem"
                  : "mensagens"}
              </Badge>
              {home.activeCase.report == null ? (
                <Badge variant="outline" className="font-normal">
                  Sem relatório do atendimento
                </Badge>
              ) : home.activeCase.report.isFinalized ? (
                <Badge variant="secondary" className="font-normal">
                  Relatório finalizado · atualizado{" "}
                  {formatRelativeTime(home.activeCase.report.updatedAt)}
                </Badge>
              ) : (
                <Badge variant="outline" className="font-normal">
                  Relatório em edição · atualizado{" "}
                  {formatRelativeTime(home.activeCase.report.updatedAt)}
                </Badge>
              )}
            </div>

            {home.activeCase.pendingAction ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pendência do assistente
                </p>
                <pre className="mt-1 max-h-24 overflow-auto rounded-md border border-border bg-muted/40 p-2 font-mono text-xs text-muted-foreground">
                  {truncateText(home.activeCase.pendingAction, 400)}
                </pre>
              </div>
            ) : null}

            {activeContextSummaryDisplay ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Resumo do contexto (painel)
                </p>
                <p
                  className={cn(
                    "mt-1 text-sm leading-relaxed text-muted-foreground",
                    "line-clamp-6 whitespace-pre-wrap wrap-break-word",
                  )}
                >
                  {activeContextSummaryDisplay}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="font-medium text-muted-foreground">
            Nenhum caso ativo no momento.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Inicie um atendimento pelo painel ou pelo WhatsApp (quando
            vinculado).
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link href="/dashboard/cases/select-patient">
                Criar novo caso
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/cases">Ver histórico de casos</Link>
            </Button>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-muted-foreground">
          Números da conta
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Pacientes cadastrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {home.patientsCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Casos no histórico
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {home.totalCasesCount}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {home.closedCasesCount} encerrados
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Receitas emitidas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {home.prescriptionsCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Atestados emitidos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums tracking-tight">
                {home.medicalCertificatesCount}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden border-border/70 p-0">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-4">
          <div>
            <CardTitle className="text-base font-semibold">
              Últimos casos encerrados
            </CardTitle>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Até cinco encerramentos mais recentes.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            asChild
          >
            <Link href="/dashboard/cases">Ver todos os casos</Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {home.recentClosedCases.length === 0 ? (
            <div className="border-t border-dashed border-border p-8 text-center">
              <p className="font-medium text-muted-foreground">
                Ainda não há casos encerrados.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Quando você encerrar atendimentos, eles aparecem aqui para
                consulta rápida.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="min-w-[140px]">Paciente</TableHead>
                    <TableHead className="min-w-[140px]">Responsável</TableHead>
                    <TableHead className="min-w-[120px] whitespace-nowrap">
                      Encerrado
                    </TableHead>
                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {home.recentClosedCases.map((row) => (
                    <TableRow key={row.id} className="border-border/60">
                      <TableCell className="font-medium">
                        {row.patientName ?? (
                          <span className="text-muted-foreground">
                            Sem paciente
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.responsible ?? "Não informado"}
                      </TableCell>
                      <TableCell>
                        {row.endedAt ? (
                          <>
                            <span className="text-sm text-foreground">
                              {formatDate(row.endedAt)}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">
                              {formatRelativeTime(row.endedAt)}
                            </span>
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/dashboard/cases/${row.id}`}>
                            Abrir
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
