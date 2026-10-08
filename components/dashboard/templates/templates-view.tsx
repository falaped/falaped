"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { tz } from "@date-fns/tz"
import { CheckIcon, CopyIcon, EllipsisIcon, PencilIcon, PlusIcon, SparklesIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import {
  deleteExamPanelAction,
  deletePrescriptionTemplateAction,
  deleteReportTemplateAction,
  renameExamPanelAction,
  renamePrescriptionTemplateAction,
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
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList } from "@/components/ui/tabs"
import { CLINIC_TIME_ZONE } from "@/lib/clinic-timezone"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import type { ExamPanel } from "@/modules/exam-panels/types"
import type { PrescriptionTemplateOption } from "@/modules/prescription-templates/types"
import type { ReportTemplateOption } from "@/modules/report-templates/get-report-templates-by-profile-id"

export type TemplatesTab = "prescriptions" | "exams" | "reports"

const TAB_PARAM: Record<TemplatesTab, string> = { prescriptions: "receitas", exams: "exames", reports: "relatorio" }

type Row = { id: string; name: string; detail: string; createdAt: string }
type Deleting = { kind: TemplatesTab; id: string; name: string }

const savedOn = (iso: string) => format(new Date(iso), "dd/MM/yy", { in: tz(CLINIC_TIME_ZONE) })

/**
 * Modelos (protótipo g1–g3). Receita e painel de exames nascem no painel ("Salvar como modelo");
 * aqui se usa, renomeia e exclui. O relatório tem o modelo em uso, criar, editar e gerar com IA.
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
              {tab === "reports" ? (
                <>
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/dashboard/templates/reports/generate">
                      <SparklesIcon data-icon="inline-start" />
                      Gerar com IA
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/templates/reports/new">
                      <PlusIcon data-icon="inline-start" />
                      Novo modelo
                    </Link>
                  </Button>
                </>
              ) : (
                <span className="text-caption text-subtle-foreground">
                  Para criar, use &ldquo;Salvar como modelo&rdquo; {tab === "exams" ? "no pedido de exame" : "na receita"}
                </span>
              )}
            </div>
          </div>

          <TabsContent value="prescriptions" className="mt-0">
            <ShortcutList
              rows={prescriptionRows}
              useLabel="Usar na receita"
              hrefOf={(id) => `/dashboard/services?novo=prescription&modelo=${id}`}
              empty="Nenhum modelo de receita ainda. Ao emitir uma receita, use “Salvar como modelo” e ele vira atalho na próxima."
              disabled={isPending}
              onRename={(id, name) => run(() => renamePrescriptionTemplateAction(id, name), "Modelo renomeado.")}
              onDelete={(row) => setDeleting({ kind: "prescriptions", id: row.id, name: row.name })}
            />
          </TabsContent>
          <TabsContent value="exams" className="mt-0">
            <ShortcutList
              rows={examRows}
              useLabel="Usar no pedido"
              hrefOf={(id) => `/dashboard/services?novo=exam-request&modelo=${id}`}
              empty="Nenhum painel de exames ainda. No pedido de exame, use “Salvar como modelo” e ele vira atalho no próximo."
              disabled={isPending}
              onRename={(id, name) => run(() => renameExamPanelAction(id, name), "Painel renomeado.")}
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

/** Receitas e painéis de exame: usar, renomear na linha e excluir. */
function ShortcutList({
  rows,
  useLabel,
  hrefOf,
  empty,
  disabled,
  onRename,
  onDelete,
}: {
  rows: Row[]
  useLabel: string
  hrefOf: (id: string) => string
  empty: string
  disabled: boolean
  onRename: (id: string, name: string) => void
  onDelete: (row: Row) => void
}) {
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null)

  if (!rows.length) return <p className="px-5 py-10 text-center text-muted-foreground">{empty}</p>

  function save() {
    if (!renaming) return
    const name = renaming.name.trim()
    if (!name) return void toast.error("Dê um nome ao modelo.")
    if (name !== rows.find((row) => row.id === renaming.id)?.name) onRename(renaming.id, name)
    setRenaming(null)
  }

  return (
    <div className="divide-y divide-border">
      {rows.map((row) => (
        <div key={row.id} className="grid min-h-14 grid-cols-[minmax(0,1fr)_120px_auto] items-center gap-4 px-5 py-3 hover:bg-accent/40">
          <div className="min-w-0">
            {renaming?.id === row.id ? (
              <div className="flex items-center gap-2">
                <Input
                  autoFocus
                  aria-label="Novo nome"
                  value={renaming.name}
                  maxLength={120}
                  onChange={(event) => setRenaming({ id: row.id, name: event.target.value })}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") save()
                    if (event.key === "Escape") setRenaming(null)
                  }}
                  className="h-8 w-72 font-semibold"
                />
                <Button size="xs" onClick={save}>
                  Salvar
                </Button>
                <Button variant="ghost" size="xs" onClick={() => setRenaming(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="font-semibold">{row.name}</div>
            )}
            <div className="truncate text-caption text-muted-foreground">{row.detail}</div>
          </div>
          <span className="num text-caption text-subtle-foreground">salvo em {savedOn(row.createdAt)}</span>
          <div className="flex items-center gap-1">
            <Button asChild variant="outline" size="xs">
              <Link href={hrefOf(row.id)}>{useLabel}</Link>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-xs" aria-label={`Mais ações de ${row.name}`} disabled={disabled}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setRenaming({ id: row.id, name: row.name })}>
                  <PencilIcon />
                  Renomear
                </DropdownMenuItem>
                <DropdownMenuSeparator />
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
