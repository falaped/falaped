"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { tz } from "@date-fns/tz"
import { CheckIcon, CopyIcon, EllipsisIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  deleteExamPanelAction,
  deletePrescriptionTemplateAction,
  deleteReportTemplateAction,
  setActiveReportTemplateAction,
} from "@/actions"
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
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import type { ExamPanel } from "@/modules/exam-panels/types"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/types"
import type { ReportTemplateOption } from "@/modules/report-templates/get-report-templates-by-profile-id"

export type TemplatesTab = "prescriptions" | "exams" | "reports"

const TAB_PARAM: Record<TemplatesTab, string> = { prescriptions: "receitas", exams: "exames", reports: "relatorio" }
const BASE: Record<TemplatesTab, string> = {
  prescriptions: "/dashboard/templates/prescriptions",
  exams: "/dashboard/templates/exams",
  reports: "/dashboard/templates/reports",
}

type Row = { id: string; name: string; detail: string; createdAt: string }
type Deleting = { kind: TemplatesTab; id: string; name: string }

const savedOn = (iso: string) => format(new Date(iso), "dd/MM/yy", { in: tz(CLINIC_TIME_ZONE) })

/**
 * Modelos (protótipo g1–g8). Em todas as abas: criar, gerar com IA, editar e excluir. Receita e
 * exames também nascem no painel ("Salvar como modelo"); o relatório tem o modelo em uso.
 */
export function TemplatesView({
  initialTab,
  prescriptions,
  exams,
  reports,
  activeReportId,
}: {
  initialTab: TemplatesTab
  prescriptions: PrescriptionTemplateOption[]
  exams: ExamPanel[]
  reports: ReportTemplateOption[]
  activeReportId: string | null
}) {
  const router = useRouter()
  const [tab, setTab] = useState<TemplatesTab>(initialTab)
  const [deleting, setDeleting] = useState<Deleting | null>(null)
  const [isPending, startTransition] = useTransition()

  function pickTab(next: TemplatesTab) {
    setTab(next)
    // Voltar do formulário do relatório cai na aba certa, sem refazer a busca.
    window.history.replaceState(null, "", next === "prescriptions" ? "/dashboard/templates" : `/dashboard/templates?aba=${TAB_PARAM[next]}`)
  }

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string, done?: () => void) {
    startTransition(async () => {
      const result = await action()
      if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
      toast.success(success)
      done?.()
      router.refresh()
    })
  }

  function confirmDelete() {
    if (!deleting) return
    const { kind, id } = deleting
    const action =
      kind === "prescriptions"
        ? () => deletePrescriptionTemplateAction(id)
        : kind === "exams"
          ? () => deleteExamPanelAction(id)
          : () => deleteReportTemplateAction(id)
    run(action, "Modelo excluído.", () => setDeleting(null))
  }

  const prescriptionRows: Row[] = prescriptions.map((t) => ({
    id: t.id,
    name: t.name,
    detail: t.snapshot.medications.map((m) => [m.name, m.dosage].filter(Boolean).join(" ")).join(" · ") || "Sem medicamentos",
    createdAt: t.created_at,
  }))
  const examRows: Row[] = exams.map((p) => ({ id: p.id, name: p.name, detail: p.panel_items.join(" · "), createdAt: p.created_at }))

  return (
    <>
      <section className="flex items-center gap-6 rounded-xl border border-primary-soft-border bg-highlight px-8 py-7 shadow-sm">
        <div>
          <h1 className="font-display text-display font-semibold">Seus modelos</h1>
          <p className="mt-1 text-read text-muted-foreground">Atalhos para a consulta e o jeito do seu relatório</p>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card">
        <Tabs value={tab} onValueChange={(value) => pickTab(value as TemplatesTab)} className="gap-0">
          <div className="flex min-h-14 items-end gap-6 border-b border-border px-5 pt-4">
            <TabsList className="h-auto w-auto gap-5 rounded-none bg-transparent p-0 lg:w-auto">
              <SectionTab value="prescriptions">
                Receitas <span className="num text-caption text-subtle-foreground">{prescriptions.length}</span>
              </SectionTab>
              <SectionTab value="exams">
                Exames <span className="num text-caption text-subtle-foreground">{exams.length}</span>
              </SectionTab>
              <SectionTab value="reports">
                Relatório <span className="num text-caption text-subtle-foreground">{reports.length}</span>
              </SectionTab>
            </TabsList>
            <div className="ml-auto flex items-center gap-2 pb-2">
              <Button asChild variant="ghost" size="sm">
                <Link href={`${BASE[tab]}/generate`}>
                  <SparklesIcon data-icon="inline-start" />
                  Gerar com IA
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`${BASE[tab]}/new`}>
                  <PlusIcon data-icon="inline-start" />
                  Novo modelo
                </Link>
              </Button>
            </div>
          </div>

          <TabsContent value="prescriptions" className="mt-0">
            <ShortcutList
              rows={prescriptionRows}
              useLabel="Usar na receita"
              hrefOf={(id) => `/dashboard/services?novo=prescription&modelo=${id}`}
              editHref={(id) => `${BASE.prescriptions}/${id}`}
              empty="Nenhum modelo de receita ainda. Crie um aqui ou, ao emitir uma receita, use “Salvar como modelo”."
              disabled={isPending}
              onDelete={(row) => setDeleting({ kind: "prescriptions", id: row.id, name: row.name })}
            />
          </TabsContent>
          <TabsContent value="exams" className="mt-0">
            <ShortcutList
              rows={examRows}
              useLabel="Usar no pedido"
              hrefOf={(id) => `/dashboard/services?novo=exam-request&modelo=${id}`}
              editHref={(id) => `${BASE.exams}/${id}`}
              empty="Nenhum modelo de exames ainda. Crie um aqui ou, no pedido de exame, use “Salvar como modelo”."
              disabled={isPending}
              onDelete={(row) => setDeleting({ kind: "exams", id: row.id, name: row.name })}
            />
          </TabsContent>
          <TabsContent value="reports" className="mt-0">
            <div className="divide-y divide-border">
              {reports.map((template) => {
                const isActive = template.id === activeReportId
                return (
                  <div
                    key={template.id}
                    className={cn(
                      "grid min-h-14 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-3",
                      isActive ? "bg-primary-soft/40" : "hover:bg-accent/40",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 font-semibold">
                        {template.name}
                        {isActive ? (
                          <Badge>
                            <CheckIcon aria-hidden />
                            Em uso
                          </Badge>
                        ) : null}
                        {template.is_default ? <Badge variant="secondary">Do Falaped</Badge> : null}
                      </div>
                      <div className="truncate text-caption text-muted-foreground">
                        {template.sections.map((section) => section.name).join(" · ")}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {isActive ? null : (
                        <Button
                          variant="ghost"
                          size="xs"
                          disabled={isPending}
                          onClick={() => run(() => setActiveReportTemplateAction(template.id), `Agora o relatório usa "${template.name}".`)}
                        >
                          Usar este
                        </Button>
                      )}
                      {template.is_default ? (
                        <Button asChild variant="outline" size="xs">
                          <Link href={`/dashboard/templates/reports/new?duplicar=${template.id}`}>Duplicar</Link>
                        </Button>
                      ) : (
                        <>
                          <Button asChild variant="outline" size="xs">
                            <Link href={`/dashboard/templates/reports/${template.id}`}>Editar</Link>
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-xs" aria-label={`Mais ações de ${template.name}`}>
                                <EllipsisIcon />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/templates/reports/new?duplicar=${template.id}`}>
                                  <CopyIcon />
                                  Duplicar
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setDeleting({ kind: "reports", id: template.id, name: template.name })}
                              >
                                <Trash2Icon />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="border-t border-border px-5 py-3 text-caption text-subtle-foreground">
              O modelo em uso organiza o relatório ao encerrar a consulta. Paciente e Dados clínicos entram sempre, no começo.
            </p>
          </TabsContent>
        </Tabs>
      </section>

      <AlertDialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir &ldquo;{deleting?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.kind === "reports"
                ? "Se ele estiver em uso, o relatório volta para o modelo do Falaped. Não dá para desfazer."
                : "Ele deixa de aparecer como atalho no painel. Os documentos já emitidos continuam iguais."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" disabled={isPending} onClick={confirmDelete}>
              {isPending ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

/** Receitas e painéis de exame: usar, editar e excluir. */
function ShortcutList({
  rows,
  useLabel,
  hrefOf,
  editHref,
  empty,
  disabled,
  onDelete,
}: {
  rows: Row[]
  useLabel: string
  hrefOf: (id: string) => string
  editHref: (id: string) => string
  empty: string
  disabled: boolean
  onDelete: (row: Row) => void
}) {
  if (!rows.length) return <p className="px-5 py-10 text-center text-muted-foreground">{empty}</p>

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.id} className="grid min-h-14 grid-cols-[minmax(0,1fr)_120px_auto] items-center gap-4 px-5 py-3 hover:bg-accent/40">
          <div className="min-w-0">
            <div className="font-semibold">{row.name}</div>
            <div className="truncate text-caption text-muted-foreground">{row.detail}</div>
          </div>
          <span className="num text-caption text-subtle-foreground">salvo em {savedOn(row.createdAt)}</span>
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="xs">
              <Link href={hrefOf(row.id)}>{useLabel}</Link>
            </Button>
            <Button asChild variant="ghost" size="xs">
              <Link href={editHref(row.id)}>Editar</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={`Mais ações de ${row.name}`} disabled={disabled}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem variant="destructive" onSelect={() => onDelete(row)}>
                  <Trash2Icon />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      ))}
    </div>
  )
}
