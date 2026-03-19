"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { GripVertical, Sparkles, Loader2, AlertTriangle, Trash2, FileText, Eye, Download } from "lucide-react"

import type { CaseReport as CaseReportType, CaseReportSection } from "@/modules/cases/get-case-report"
import type { ReportTemplateWithSections } from "@/modules/report-templates/get-report-template-by-id"
import { generateCaseReportAction, downloadCaseReportPdfAction, improveReportSectionAction, updateCaseReportAction, deleteCaseReportAction } from "@/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/formatters"
import { toast } from "sonner"

function reportSourceLabel(source: string): string {
  if (source === "web") return "Web"
  if (source === "whatsapp") return "WhatsApp"
  return source.charAt(0).toUpperCase() + source.slice(1)
}

function ReportCardSkeleton({
  label,
  ariaLabel,
}: {
  label: string
  ariaLabel: string
}) {
  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
      aria-busy="true"
      aria-label={ariaLabel}
    >
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5 shrink-0 rounded" />
        <Skeleton className="h-5 w-14 rounded-md" />
      </div>
      <Skeleton className="h-4 w-full max-w-[180px] rounded" />
      <Skeleton className="h-3 w-20 rounded" />
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
        {label}
      </p>
    </div>
  )
}

type CaseReportProps = {
  template: ReportTemplateWithSections
  caseReports: CaseReportType[]
  caseId: string
  hasMessages: boolean
  patientName: string
  caseStatus: "active" | "closed"
}

function sortSections(sections: CaseReportSection[] | null | undefined): CaseReportSection[] {
  if (!Array.isArray(sections)) return []
  return [...sections].sort((a, b) => a.order - b.order)
}

function sectionsEqual(
  a: CaseReportSection[] | null | undefined,
  b: CaseReportSection[] | null | undefined,
): boolean {
  const sa = sortSections(a)
  const sb = sortSections(b)
  if (sa.length !== sb.length) return false
  return sa.every(
    (s, i) =>
      s.name === sb[i].name &&
      s.content === sb[i].content &&
      s.order === sb[i].order,
  )
}

function SectionPreview({ section }: { section: CaseReportSection }) {
  return (
    <div className="border-border border-b pb-4 last:border-0 last:pb-0">
      <h3 className="text-sm font-semibold text-foreground tracking-tight">
        {section.name}
      </h3>
      <div className="mt-1.5 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
        {section.content || "—"}
      </div>
    </div>
  )
}

function SectionBlock({
  section,
  canEdit,
  isImproving,
  onContentChange,
  onImprove,
}: {
  section: CaseReportSection
  canEdit: boolean
  isImproving: boolean
  onContentChange: (name: string, content: string) => void
  onImprove: (name: string) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: section.name,
    disabled: !canEdit,
  })

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined

  const placeholder = section.description || `Sem ${section.name.toLowerCase()} registrada.`

  if (!canEdit) {
    return <SectionPreview section={section} />
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-2 rounded-lg border border-border bg-card p-3",
        isDragging && "opacity-50 shadow-md",
      )}
    >
      <button
        type="button"
        className="mt-8 shrink-0 touch-none cursor-grab rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label="Reordenar seção"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <Label className="text-sm font-medium">{section.name}</Label>
        <Textarea
          value={section.content}
          onChange={(e) => onContentChange(section.name, e.target.value)}
          placeholder={placeholder}
          className="min-h-24 resize-y"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isImproving || !section.content.trim()}
          onClick={() => onImprove(section.name)}
        >
          {isImproving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span className="ml-1.5">Melhorar com IA</span>
        </Button>
      </div>
    </div>
  )
}

export function CaseReport({
  template,
  caseReports,
  caseId,
  hasMessages,
  patientName,
  caseStatus,
}: CaseReportProps) {
  const router = useRouter()
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const selectedReport = selectedReportId
    ? caseReports.find((r) => r.id === selectedReportId) ?? null
    : null
  const [sections, setSections] = useState<CaseReportSection[]>(() =>
    selectedReport ? sortSections(selectedReport.sections ?? []) : [],
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [improvingSection, setImprovingSection] = useState<string | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDownloading, setIsDownloading] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deletingReportId, setDeletingReportId] = useState<string | null>(null)

  const canEdit = !selectedReport?.is_finalized
  const hasWebReport = caseReports.some((r) => r.source === "web")
  const canGenerateReport =
    hasMessages &&
    (template.sections?.length ?? 0) > 0 &&
    !hasWebReport
  const generateDisabledReason = hasWebReport
    ? "Já existe um relatório gerado pela web para este caso."
    : !hasMessages
      ? "Necessário ter conversa"
      : (template.sections?.length ?? 0) === 0
        ? "Nenhum template de relatório configurado."
        : null
  const hasUnsavedEdits =
    !!selectedReport && !sectionsEqual(sections, selectedReport.sections)

  useEffect(() => {
    if (selectedReport) {
      setSections(sortSections(selectedReport.sections ?? []))
    }
  }, [selectedReport?.id, selectedReport?.updated_at, selectedReport?.sections])

  useEffect(() => {
    if (
      selectedReportId &&
      !caseReports.some((r) => r.id === selectedReportId)
    ) {
      setSelectedReportId(null)
    }
  }, [caseReports, selectedReportId])

  useEffect(() => {
    if (
      deletingReportId &&
      !caseReports.some((r) => r.id === deletingReportId)
    ) {
      setDeletingReportId(null)
    }
  }, [caseReports, deletingReportId])

  const handleCardClick = useCallback((reportId: string) => {
    setSelectedReportId((prev) => (prev === reportId ? null : reportId))
  }, [])

  const handleGenerateReport = useCallback(async () => {
    if (!hasMessages) return
    setIsGenerating(true)
    try {
      const result = await generateCaseReportAction(caseId)
      if (result.ok) {
        toast.success("Relatório gerado.")
        setSelectedReportId(result.reportId)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsGenerating(false)
    }
  }, [caseId, hasMessages, router])

  const handleContentChange = useCallback((name: string, content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.name === name ? { ...s, content } : s)),
    )
  }, [])

  const handleImproveSection = useCallback(
    async (sectionName: string) => {
      const section = sections.find((s) => s.name === sectionName)
      if (!section) return
      setImprovingSection(sectionName)
      try {
        const result = await improveReportSectionAction(
          caseId,
          sectionName,
          section.description,
          section.content,
        )
        if (result.ok) {
          const nextSections = sections.map((s) =>
            s.name === sectionName
              ? { ...s, content: result.improvedText }
              : s,
          )
          setSections(nextSections)
          const updateResult = await updateCaseReportAction({
            reportId: selectedReport!.id,
            caseId,
            sections: nextSections,
          })
          if (updateResult.ok) {
            toast.success("Seção melhorada.")
            router.refresh()
          } else {
            toast.error(updateResult.error)
          }
        } else {
          toast.error(result.error)
        }
      } finally {
        setImprovingSection(null)
      }
    },
    [caseId, sections, selectedReport, router],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = sections.findIndex((s) => s.name === active.id)
      const newIndex = sections.findIndex((s) => s.name === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
        ...s,
        order: i,
      }))
      setSections(reordered)
      updateCaseReportAction({
        reportId: selectedReport!.id,
        caseId,
        sections: reordered,
      }).then((result) => {
        if (result.ok) {
          toast.success("Ordem atualizada.")
          router.refresh()
        } else {
          toast.error(result.error)
        }
      })
    },
    [caseId, sections, selectedReport, router],
  )

  const handleFinalizeChange = useCallback(
    async (checked: boolean) => {
      setIsFinalizing(true)
      try {
        const result = await updateCaseReportAction({
          reportId: selectedReport!.id,
          caseId,
          sections: checked ? sections : undefined,
          isFinalized: checked,
          finalizedAt: checked ? new Date().toISOString() : null,
        })
        if (result.ok) {
          toast.success(checked ? "Relatório finalizado." : "Edição reabilitada.")
          router.refresh()
        } else {
          toast.error(result.error)
        }
      } finally {
        setIsFinalizing(false)
      }
    },
    [caseId, sections, selectedReport, router],
  )

  const handleBackToEdit = useCallback(() => {
    handleFinalizeChange(false)
  }, [handleFinalizeChange])

  const handleDownloadPdf = useCallback(async () => {
    if (!selectedReport) return
    setIsDownloading(true)
    try {
      const result = await downloadCaseReportPdfAction(selectedReport.id)
      if (result.ok) {
        const blob = new Blob(
          [Uint8Array.from(atob(result.pdfBase64), (c) => c.charCodeAt(0))],
          { type: "application/pdf" },
        )
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = result.filename
        a.click()
        URL.revokeObjectURL(url)
        toast.success("Download do PDF iniciado.")
      } else {
        toast.error(result.error)
      }
    } finally {
      setIsDownloading(false)
    }
  }, [selectedReport])

  const handleDeleteReport = useCallback(async () => {
    if (!selectedReport) return
    setDeletingReportId(selectedReport.id)
    setIsDeleting(true)
    try {
      const result = await deleteCaseReportAction(selectedReport.id, caseId)
      if (result.ok) {
        setDeleteDialogOpen(false)
        toast.success("Relatório excluído.")
        setSelectedReportId((prev) =>
          prev === selectedReport.id ? caseReports.find((r) => r.id !== selectedReport.id)?.id ?? null : prev,
        )
        router.refresh()
      } else {
        setDeletingReportId(null)
        toast.error(result.error)
      }
    } finally {
      setIsDeleting(false)
    }
  }, [caseId, selectedReport, caseReports, router])

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  )

  if (caseReports.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Relatório do atendimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {canGenerateReport ? (
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-1.5">Gerar relatório</span>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button disabled>
                    <Sparkles className="h-4 w-4" />
                    <span className="ml-1.5">Gerar relatório</span>
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {generateDisabledReason ?? "Informações insuficientes para gerar o relatório."}
              </TooltipContent>
            </Tooltip>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Relatório do atendimento
          </CardTitle>
          {canGenerateReport && (
            <Button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              variant="outline"
              size="sm"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="ml-1.5">Gerar relatório</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {caseReports.map((report) => {
            if (report.id === deletingReportId) {
              return (
                <ReportCardSkeleton
                  key={report.id}
                  label="Excluindo…"
                  ariaLabel="Excluindo relatório"
                />
              )
            }
            const isSelected = selectedReportId === report.id
            const isWhatsApp = report.source === "whatsapp"
            return (
              <button
                key={report.id}
                type="button"
                onClick={() => handleCardClick(report.id)}
                aria-pressed={isSelected}
                aria-label={`Relatório de ${patientName}, ${formatDateTime(report.created_at)}, via ${reportSourceLabel(report.source)}. Clique para visualizar.`}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  isSelected && "ring-2 ring-primary bg-primary/5",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <Badge
                      variant={isWhatsApp ? "secondary" : "default"}
                      className={cn(
                        "shrink-0 text-xs",
                        isWhatsApp &&
                          "border-0 bg-[#25D366] text-white hover:bg-[#20BD5A]",
                      )}
                    >
                      {reportSourceLabel(report.source)}
                    </Badge>
                  </div>
                  {isSelected && (
                    <Eye className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                  )}
                </div>
                <h3 className="line-clamp-1 text-sm font-semibold text-foreground">
                  Relatório de {patientName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(report.created_at)}
                </p>
              </button>
            )
          })}
          {isGenerating && (
            <ReportCardSkeleton
              key="generating"
              label="Gerando…"
              ariaLabel="Gerando relatório"
            />
          )}
        </div>

        {selectedReport && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                <p className="text-sm font-medium text-muted-foreground">
                  Visualizando: Relatório de {patientName} — {formatDateTime(selectedReport.created_at)} · Via {reportSourceLabel(selectedReport.source)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                {canEdit ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isFinalizing}
                        onClick={() => handleFinalizeChange(true)}
                        className={cn(
                          hasUnsavedEdits &&
                            "border-amber-500/50 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 dark:text-amber-400 dark:hover:bg-amber-500/10",
                        )}
                      >
                        {hasUnsavedEdits ? (
                          <>
                            <AlertTriangle className="mr-2 h-4 w-4" />
                            Salvar e finalizar edição
                          </>
                        ) : (
                          "Voltar para visualização"
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {hasUnsavedEdits
                        ? "Há alterações não salvas. Clique para salvar e finalizar."
                        : "Finaliza a edição e exibe o relatório em modo somente leitura."}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isFinalizing}
                    onClick={handleBackToEdit}
                  >
                    Voltar a editar
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isDownloading}
                  onClick={handleDownloadPdf}
                >
                  {isDownloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}
                  Baixar PDF
                </Button>
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isDeleting}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Excluir relatório
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Este relatório será removido. Você poderá gerar um novo
                        depois, se quiser.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isDeleting}>
                        Cancelar
                      </AlertDialogCancel>
                      <Button
                        variant="destructive"
                        disabled={isDeleting}
                        onClick={handleDeleteReport}
                      >
                        {isDeleting ? "Excluindo…" : "Excluir"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <SortableContext
                items={sections.map((s) => s.name)}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className={cn(
                    "space-y-3",
                    !canEdit && "space-y-6",
                  )}
                >
                  {sections.map((section) => (
                    <SectionBlock
                      key={section.name}
                      section={section}
                      canEdit={canEdit}
                      isImproving={improvingSection === section.name}
                      onContentChange={handleContentChange}
                      onImprove={handleImproveSection}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
