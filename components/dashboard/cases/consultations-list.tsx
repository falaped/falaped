"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useMemo, useState, useTransition } from "react"
import { tz } from "@date-fns/tz"
import { differenceInCalendarDays, differenceInMinutes, format } from "date-fns"
import { ptBR } from "date-fns/locale/pt-BR"
import {
  EllipsisIcon,
  FileTextIcon,
  InfoIcon,
  MessageCircleIcon,
  RotateCcwIcon,
  SearchIcon,
  Trash2Icon,
  UserIcon,
  WalletIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { deleteCaseAction } from "@/actions"
import { ReopenCaseDialog } from "@/components/dashboard/cases/reopen-case-dialog"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { SectionTab } from "@/components/dashboard/section-tab"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList } from "@/components/ui/tabs"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { computePediatricAge } from "@/lib/compute-pediatric-age"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { formatCentsToBRL } from "@/lib/formatters"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { isConsultationPending } from "@/lib/is-consultation-pending"
import { matchPatientQuery } from "@/lib/match-patient-query"
import type { ConsultationRow } from "@/modules/cases/get-consultations"

type Tab = "all" | "today" | "week" | "pending"

const CONTEXT = { in: tz(CLINIC_TIME_ZONE) }
const caseHref = (caseId: string) => `/dashboard/cases/${caseId}`

/**
 * Lista de Consultas (protótipo b1): abas Todas, Hoje, Esta semana e Com pendência, busca
 * por paciente, responsável ou motivo, e as consultas agrupadas por dia.
 */
export function ConsultationsList({
  rows,
  nowIso,
  todayStartIso,
  weekStartIso,
  monthStartIso,
}: {
  rows: ConsultationRow[]
  nowIso: string
  todayStartIso: string
  weekStartIso: string
  monthStartIso: string
}) {
  const [tab, setTab] = useState<Tab>("all")
  const [query, setQuery] = useState("")
  const [reopenId, setReopenId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<ConsultationRow | null>(null)
  const now = new Date(nowIso)

  const isPending = (row: ConsultationRow) => isConsultationPending(row, monthStartIso)
  const todayCount = rows.filter((row) => row.startedAt >= todayStartIso).length
  const pendingCount = rows.filter(isPending).length

  const groups = useMemo(() => {
    const listed = rows.filter((row) => {
      if (tab === "today" && row.startedAt < todayStartIso) return false
      if (tab === "week" && row.startedAt < weekStartIso) return false
      if (tab === "pending" && !isConsultationPending(row, monthStartIso)) return false
      if (!query.trim()) return true
      // O motivo entra junto do nome: "otite" acha a consulta de otite.
      return matchPatientQuery(
        {
          name: `${row.patient?.name ?? "WhatsApp"} ${row.reason ?? ""}`,
          responsible: row.patient?.responsible ?? null,
          contactPhone: row.patient?.contactPhone ?? null,
        },
        query,
      )
    })
    const byDay = new Map<string, ConsultationRow[]>()
    for (const row of listed) {
      const day = format(new Date(row.startedAt), "yyyy-MM-dd", CONTEXT)
      byDay.set(day, [...(byDay.get(day) ?? []), row])
    }
    return [...byDay.values()]
  }, [rows, tab, query, todayStartIso, weekStartIso, monthStartIso])

  return (
    <section className="rounded-xl border border-border bg-card">
      <Tabs value={tab} onValueChange={(value) => setTab(value as Tab)} className="gap-0">
        <div className="flex items-end gap-6 px-5 pt-4">
          <TabsList className="h-auto w-auto gap-5 rounded-none bg-transparent p-0 lg:w-auto">
            <SectionTab value="all">Todas</SectionTab>
            <SectionTab value="today">
              Hoje
              <span className="num text-caption text-subtle-foreground">{todayCount}</span>
            </SectionTab>
            <SectionTab value="week">Esta semana</SectionTab>
            <SectionTab value="pending">
              Com pendência
              {pendingCount ? (
                <span
                  aria-label={`${pendingCount} ${pendingCount === 1 ? "pendência" : "pendências"}`}
                  className="num inline-flex items-center gap-1 rounded-full bg-warning-soft px-1.5 text-caption font-semibold text-warning-text"
                >
                  <InfoIcon className="size-3" aria-hidden />
                  {pendingCount}
                </span>
              ) : null}
            </SectionTab>
          </TabsList>
          <div className="relative ml-auto mb-2.5 w-80">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Paciente, responsável ou motivo"
              aria-label="Buscar consulta por paciente, responsável ou motivo"
              className="pr-8 pl-8"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-0.5 text-subtle-foreground hover:text-foreground"
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </Tabs>

      <div className="border-t border-border">
        {groups.length === 0 ? (
          <p className="px-5 py-6 text-muted-foreground">
            {query.trim()
              ? `Nenhuma consulta com "${query.trim()}".`
              : tab === "pending"
                ? "Nada pendente: relatórios finalizados e valores lançados."
                : tab === "today"
                  ? "Nenhuma consulta hoje ainda."
                  : tab === "week"
                    ? "Nenhuma consulta nesta semana ainda."
                    : "As consultas encerradas aparecem aqui."}
          </p>
        ) : (
          groups.map((group, index) => (
            <div key={group[0].id}>
              <div className={`border-b border-border bg-muted px-5 py-2 text-label font-medium text-muted-foreground ${index ? "border-t" : ""}`}>
                {dayLabel(group[0].startedAt, now)}
              </div>
              <div className="divide-y divide-border">
                {group.map((row) => (
                  <Row
                    key={row.id}
                    row={row}
                    pending={isPending(row)}
                    onReopen={() => setReopenId(row.id)}
                    onDelete={() => setDeleting(row)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {reopenId ? (
        <ReopenCaseDialog caseId={reopenId} open onOpenChange={(open) => !open && setReopenId(null)} />
      ) : null}
      {deleting ? <DeleteConsultationDialog row={deleting} onClose={() => setDeleting(null)} /> : null}
    </section>
  )
}

function Row({ row, pending, onReopen, onDelete }: { row: ConsultationRow; pending: boolean; onReopen: () => void; onDelete: () => void }) {
  const name = row.patient?.name ?? "Pedido pelo WhatsApp"
  const age = row.patient ? (row.patient.birthDate ? formatPediatricAgeShort(computePediatricAge(row.patient.birthDate)) : null) : "sem paciente"

  return (
    <div className="relative grid min-h-14 grid-cols-[36px_minmax(0,1fr)_auto_128px_104px_32px] items-center gap-4 px-5 py-2.5 hover:bg-accent">
      <span className="grid size-9 place-items-center rounded-full bg-muted text-label font-semibold text-muted-foreground">
        {row.patient ? getPatientInitials(name) : <MessageCircleIcon className="size-4" aria-hidden />}
      </span>
      <Link href={caseHref(row.id)} className="min-w-0 after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset">
        <div className="truncate">
          <span className="font-semibold">{name}</span>
          {age ? <span className="text-subtle-foreground"> · {age}</span> : null}
        </div>
        <div className="truncate text-caption text-muted-foreground">{row.reason ?? "Consulta"}</div>
      </Link>
      <div className="flex gap-1">
        {row.reportDraft ? <Badge variant="warning">Relatório em rascunho</Badge> : null}
        {row.origin === "whatsapp" ? (
          <Badge variant="default">
            <MessageCircleIcon aria-hidden />
            WhatsApp
          </Badge>
        ) : null}
        {row.documents.map((label) => (
          <Badge key={label} variant="secondary">
            {label}
          </Badge>
        ))}
      </div>
      <span className="num text-right text-caption text-subtle-foreground">{timeLabel(row)}</span>
      <span className="text-right">
        {!row.patient ? (
          <Button asChild variant="outline" size="xs" className="relative">
            <Link href={caseHref(row.id)}>Associar</Link>
          </Button>
        ) : row.billedCents !== null ? (
          <span className="num font-medium">{formatCentsToBRL(row.billedCents)}</span>
        ) : row.courtesy ? (
          <span className="text-caption text-subtle-foreground">Cortesia</span>
        ) : pending && row.status === "closed" ? (
          <Badge variant="warning">Sem valor</Badge>
        ) : (
          <span className="text-subtle-foreground">—</span>
        )}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" className="relative" aria-label={`Ações da consulta de ${name}`}>
            <EllipsisIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuItem asChild>
            <Link href={caseHref(row.id)}>
              <FileTextIcon aria-hidden />
              Ver consulta
            </Link>
          </DropdownMenuItem>
          {row.patient ? (
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/patients/${row.patient.id}`}>
                <UserIcon aria-hidden />
                Abrir ficha
              </Link>
            </DropdownMenuItem>
          ) : null}
          {row.status === "closed" ? (
            <DropdownMenuItem onSelect={onReopen}>
              <RotateCcwIcon aria-hidden />
              Reabrir consulta
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={onDelete}>
            <Trash2Icon aria-hidden />
            Excluir consulta
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

/** Exclusão diz o que some antes de apagar (protótipo b1x). */
function DeleteConsultationDialog({ row, onClose }: { row: ConsultationRow; onClose: () => void }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const firstName = row.patient?.name.split(" ")[0]
  const when = format(new Date(row.startedAt), "dd/MM", CONTEXT)

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteCaseAction(row.id)
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      onClose()
      router.refresh()
    })
  }

  return (
    <AlertDialog open onOpenChange={(open) => !open && !isPending && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Excluir a consulta {firstName ? `de ${firstName}` : "do WhatsApp"} ({when})?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div>
              <p>Também serão apagados:</p>
              <ul className="mt-2 space-y-1 text-label text-foreground">
                <li className="flex items-center gap-2">
                  <FileTextIcon className="size-3.5 text-subtle-foreground" aria-hidden />
                  Relatório, conversa e lembretes da consulta
                </li>
                {row.billedCents !== null ? (
                  <li className="flex items-center gap-2">
                    <WalletIcon className="size-3.5 text-subtle-foreground" aria-hidden />
                    Cobrança de {formatCentsToBRL(row.billedCents)}
                  </li>
                ) : null}
              </ul>
              <p className="mt-3 text-caption">
                Não dá para desfazer.
                {row.documents.length ? " Os documentos emitidos continuam salvos" : ""}
                {firstName ? `${row.documents.length ? " e a" : " A"} ficha de ${firstName} continua.` : row.documents.length ? "." : ""}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
          <Button variant="destructive" className="border-danger-border bg-danger-soft" disabled={isPending} onClick={handleDelete}>
            {isPending ? "Excluindo…" : "Excluir consulta"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** "Hoje", "Ontem" ou "Segunda, 05/10". */
function dayLabel(iso: string, now: Date): string {
  const date = new Date(iso)
  const days = differenceInCalendarDays(now, date, CONTEXT)
  if (days === 0) return "Hoje"
  if (days === 1) return "Ontem"
  const label = format(date, "EEEE, dd/MM", { ...CONTEXT, locale: ptBR })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

/** "09:10 · 22 min", sem o tempo pausado; consulta sem fim mostra só a hora. */
function timeLabel(row: ConsultationRow): string {
  const start = format(new Date(row.startedAt), "HH:mm", CONTEXT)
  if (!row.endedAt) return start
  const minutes = differenceInMinutes(new Date(row.endedAt), new Date(row.startedAt)) - Math.round(row.pausedMs / 60_000)
  if (minutes < 1) return start
  return `${start} · ${minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`}`
}
