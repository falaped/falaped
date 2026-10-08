"use client"

import Link from "next/link"
import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { format } from "date-fns"
import { tz } from "@date-fns/tz"
import {
  ChevronDownIcon,
  DownloadIcon,
  FileCheckIcon,
  FilePlusIcon,
  FlaskConicalIcon,
  PillIcon,
  PlusIcon,
  SearchIcon,
  SendIcon,
  Trash2Icon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  deleteExamRequestAction,
  deleteMedicalCertificateAction,
  deletePrescriptionAction,
  deleteReferralAction,
  generatePrescriptionAction,
} from "@/actions"
import { emitAndDownloadPdf } from "@/components/dashboard/cases/consult-document"
import {
  NewDocumentSheet,
  type DocumentPanelData,
  type NewDocumentRequest,
} from "@/components/dashboard/documents/new-document-sheet"
import { SectionTab } from "@/components/dashboard/section-tab"
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
import { documentDetail, documentGroup, documentWhen, type DocumentGroup } from "@/lib/document-list"
import { formatPediatricAgeShort } from "@/lib/format-pediatric-age"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { matchPatientQuery } from "@/lib/match-patient-query"
import { cn } from "@/lib/utils"
import type { DocumentKind, DocumentRow } from "@/modules/documents/list-documents-by-profile"

type Tab = "all" | DocumentKind

const KIND: Record<DocumentKind, { label: string; tab: string; icon: LucideIcon; api: string }> = {
  prescription: { label: "Receita", tab: "Receitas", icon: PillIcon, api: "prescriptions" },
  certificate: { label: "Atestado", tab: "Atestados", icon: FileCheckIcon, api: "medical-certificates" },
  "exam-request": { label: "Pedido de exame", tab: "Pedidos de exame", icon: FlaskConicalIcon, api: "exam-requests" },
  referral: { label: "Encaminhamento", tab: "Encaminhamentos", icon: SendIcon, api: "referrals" },
}
const KINDS = Object.keys(KIND) as DocumentKind[]

const DELETE: Record<DocumentKind, (id: string, path: string | null) => Promise<{ ok: true } | { ok: false; error: string }>> = {
  prescription: deletePrescriptionAction,
  certificate: deleteMedicalCertificateAction,
  "exam-request": deleteExamRequestAction,
  referral: deleteReferralAction,
}

const GROUPS: DocumentGroup[] = ["Hoje", "Esta semana", "Antes"]
const PAGE_SIZE = 50
/** Quanto tempo o documento recém-emitido fica destacado. */
const FRESH_MS = 8000

const keyOf = (row: Pick<DocumentRow, "kind" | "id">) => `${row.kind}:${row.id}`
const childName = (row: DocumentRow) => row.patient?.name ?? row.payloadPatientName ?? ""

/** Documentos (protótipo c1–c4): uma lista só, com abas por tipo, busca pela criança e emissão no painel. */
export function DocumentsList({
  rows,
  nowIso,
  panelData,
}: {
  rows: DocumentRow[]
  nowIso: string
  panelData: DocumentPanelData
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const now = useMemo(() => new Date(nowIso), [nowIso])
  const [tab, setTab] = useState<Tab>("all")
  const [query, setQuery] = useState("")
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [request, setRequest] = useState<NewDocumentRequest | null>(null)
  const [fresh, setFresh] = useState<Set<string>>(new Set())
  const [toDelete, setToDelete] = useState<DocumentRow | null>(null)
  const [isDeleting, startDeleting] = useTransition()
  const [isBlank, setIsBlank] = useState(false)
  /** Documentos que já estavam na lista quando o painel emitiu: o que vier além disso é novo. */
  const before = useRef<Set<string> | null>(null)

  // "Novo documento" vindo de fora (consulta encerrada, Modelos, Início): ?novo=prescription&paciente=…&consulta=…&modelo=…
  useEffect(() => {
    const kind = params.get("novo")
    if (kind === "em-branco") {
      router.replace(pathname, { scroll: false })
      void emitBlank()
      return
    }
    if (!kind || !KINDS.includes(kind as DocumentKind)) return
    setRequest({
      kind: kind as DocumentKind,
      patientId: params.get("paciente") ?? undefined,
      caseId: params.get("consulta") ?? undefined,
      caseLabel: params.get("data") ?? undefined,
      templateId: params.get("modelo") ?? undefined,
    })
    router.replace(pathname, { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roda uma vez por link
  }, [params])

  useEffect(() => {
    if (!before.current) return
    const seen = before.current
    const added = rows.map(keyOf).filter((key) => !seen.has(key))
    if (!added.length) return
    before.current = null
    setFresh(new Set(added))
    setTab("all")
    setQuery("")
    const timer = setTimeout(() => setFresh(new Set()), FRESH_MS)
    return () => clearTimeout(timer)
  }, [rows])

  function emitted() {
    before.current = new Set(rows.map(keyOf))
    setRequest(null)
    router.refresh()
  }

  async function emitBlank() {
    setIsBlank(true)
    const ok = await emitAndDownloadPdf(
      () =>
        generatePrescriptionAction({
          payload: { medications: [] },
          issuedAt: format(new Date(), "yyyy-MM-dd", { in: tz(CLINIC_TIME_ZONE) }),
          patientId: null,
          caseId: null,
        }),
      "Receituário em branco emitido",
    )
    setIsBlank(false)
    if (ok) emitted()
  }

  function confirmDelete() {
    if (!toDelete) return
    const row = toDelete
    startDeleting(async () => {
      const result = await DELETE[row.kind](row.id, row.pdfStoragePath)
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      setToDelete(null)
      toast.success(`${KIND[row.kind].label} excluíd${row.kind === "prescription" ? "a" : "o"}`)
      router.refresh()
    })
  }

  const counts = useMemo(() => {
    const byKind = Object.fromEntries(KINDS.map((kind) => [kind, 0])) as Record<DocumentKind, number>
    for (const row of rows) byKind[row.kind] += 1
    return byKind
  }, [rows])

  const filtered = useMemo(
    () =>
      rows.filter(
        (row) =>
          (tab === "all" || row.kind === tab) &&
          (!query.trim() || matchPatientQuery({ name: childName(row), responsible: null, contactPhone: null }, query)),
      ),
    [rows, tab, query],
  )
  const shown = filtered.slice(0, limit)

  return (
    <>
      <section className="flex items-center gap-6 rounded-xl border border-primary-soft-border bg-highlight px-8 py-7 shadow-sm">
        <div>
          <h1 className="font-display text-display font-semibold">Seus documentos</h1>
          <p className="mt-1 text-read text-muted-foreground">Tudo o que você emitiu, da consulta ou fora dela</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="lg" variant="outline" className="ml-auto" disabled={isBlank}>
              <PlusIcon data-icon="inline-start" />
              Novo documento
              <ChevronDownIcon data-icon="inline-end" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {KINDS.map((kind) => {
              const Icon = KIND[kind].icon
              return (
                <DropdownMenuItem key={kind} onSelect={() => setRequest({ kind })}>
                  <Icon className="text-primary-ink" />
                  {KIND[kind].label}
                </DropdownMenuItem>
              )
            })}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-muted-foreground" onSelect={emitBlank}>
              <FilePlusIcon />
              Receituário em branco
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as Tab)
            setLimit(PAGE_SIZE)
          }}
          className="gap-0"
        >
          <div className="flex items-end gap-6 border-b border-border px-5 pt-4">
            <TabsList className="h-auto w-auto gap-5 rounded-none bg-transparent p-0 lg:w-auto">
              <SectionTab value="all">Todos</SectionTab>
              {KINDS.map((kind) => (
                <SectionTab key={kind} value={kind}>
                  {KIND[kind].tab}
                  {counts[kind] ? <span className="num text-caption text-subtle-foreground">{counts[kind]}</span> : null}
                </SectionTab>
              ))}
            </TabsList>
            <div className="relative mb-2.5 ml-auto w-80">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setLimit(PAGE_SIZE)
                }}
                placeholder="Buscar pelo nome da criança"
                aria-label="Buscar documento pelo nome da criança"
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

        {shown.length === 0 ? (
          <p className="px-5 py-6 text-muted-foreground">
            {query.trim()
              ? `Nenhum documento de "${query.trim()}".`
              : rows.length
                ? "Nenhum documento deste tipo ainda."
                : "Os documentos que você emitir, na consulta ou aqui, aparecem nesta lista."}
          </p>
        ) : (
          GROUPS.map((group) => [group, shown.filter((row) => documentGroup(row.createdAt, now) === group)] as const)
            .filter(([, inGroup]) => inGroup.length)
            .map(([group, inGroup], index) => (
              <div key={group}>
                <div className={cn("border-b border-border bg-muted px-5 py-2 text-label font-medium text-muted-foreground", index && "border-t")}>
                  {group}
                </div>
                <div className="divide-y divide-border">
                  {inGroup.map((row) => (
                    <Row key={keyOf(row)} row={row} now={now} isFresh={fresh.has(keyOf(row))} onDelete={() => setToDelete(row)} />
                  ))}
                </div>
              </div>
            ))
        )}

        {filtered.length > limit ? (
          <div className="border-t border-border px-5 py-3 text-center">
            <Button variant="ghost" size="sm" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
              Carregar mais
            </Button>
          </div>
        ) : null}
      </section>

      <NewDocumentSheet request={request} data={panelData} onClose={() => setRequest(null)} onEmitted={emitted} />

      <AlertDialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {toDelete ? KIND[toDelete.kind].label.toLowerCase() : "documento"}?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete ? `${documentDetail(toDelete)}${childName(toDelete) ? ` · ${childName(toDelete)}` : ""}. ` : ""}
              O PDF também é apagado e não dá para desfazer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={isDeleting} onClick={confirmDelete}>
              {isDeleting ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Row({ row, now, isFresh, onDelete }: { row: DocumentRow; now: Date; isFresh: boolean; onDelete: () => void }) {
  const { label, icon: Icon, api } = KIND[row.kind]
  const age = row.patient?.birthDate ? formatPediatricAgeShort(computePediatricAge(row.patient.birthDate)) : null
  return (
    <div
      className={cn(
        "group grid min-h-14 grid-cols-[36px_minmax(0,1.3fr)_minmax(0,1fr)_150px_96px_auto] items-center gap-4 px-5 py-2.5 transition-colors",
        isFresh ? "bg-highlight" : "hover:bg-accent",
      )}
    >
      <span className="grid size-9 place-items-center rounded-lg bg-primary-soft text-primary-ink">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2 font-semibold">
          {label}
          {isFresh ? <Badge variant="success">Agora</Badge> : null}
        </div>
        <div className="truncate text-caption text-muted-foreground">{documentDetail(row)}</div>
      </div>
      <div className="min-w-0 truncate">
        {row.patient ? (
          <Link href={`/dashboard/patients/${row.patient.id}`} className="hover:underline">
            <span className="font-medium">{row.patient.name}</span>
            {age ? <span className="text-subtle-foreground"> · {age}</span> : null}
          </Link>
        ) : (
          <span className="text-subtle-foreground">{row.payloadPatientName || "Sem paciente"}</span>
        )}
      </div>
      <div>
        {row.case ? (
          <Link href={`/dashboard/cases/${row.case.id}`} className="text-caption text-primary-ink hover:underline">
            Da consulta de <span className="num">{format(new Date(row.case.startedAt), "dd/MM", { in: tz(CLINIC_TIME_ZONE) })}</span>
          </Link>
        ) : (
          <span className="text-caption text-subtle-foreground">Fora da consulta</span>
        )}
      </div>
      <span className="num text-right text-caption text-subtle-foreground">{documentWhen(row.createdAt, now)}</span>
      <div className="flex items-center gap-1">
        <Button asChild variant="ghost" size="sm">
          <a href={`/api/${api}/${row.id}/download`} download>
            <DownloadIcon data-icon="inline-start" />
            Baixar
          </a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label={`Excluir ${label.toLowerCase()}`}
          className="px-2 text-subtle-foreground opacity-0 group-hover:opacity-100 hover:text-danger-text focus-visible:opacity-100"
          onClick={onDelete}
        >
          <Trash2Icon />
        </Button>
      </div>
    </div>
  )
}
