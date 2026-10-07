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
import { Check, GripVertical, Sparkles, Loader2, Pencil, Trash2, FileText, Download } from "lucide-react"

import type { CaseReport as CaseReportType, CaseReportSection } from "@/modules/cases/get-case-report"
import type { ReportTemplateWithSections } from "@/modules/report-templates/get-report-template-by-id"
import { generateCaseReportAction, downloadCaseReportPdfAction, improveReportSectionAction, updateCaseReportAction, deleteCaseReportAction } from "@/actions"
import { Button } from "@/components/ui/button"
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
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/formatters"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  canGenerateCaseReport,
  caseReportGenerateDisabledReason,
} from "@/lib/case-report-generate-eligibility"

type CaseReportProps = {
  template: ReportTemplateWithSections
  caseReports: CaseReportType[]
  caseId: string
  hasMessages: boolean
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

function previewTextForSection(section: CaseReportSection): string {
  const raw = section.content?.trim() ?? ""
  if (!raw) return "—"
  if (
    section.name === "Pediatra" ||
    section.name === "Dados do pediatra"
  ) {
    const withoutLogoLine = raw
      .split("\n")
      .filter(
        (line) => !line.trim().toLowerCase().startsWith("url do logo:"),
      )
      .join("\n")
      .trim()
    return withoutLogoLine || "—"
  }
  return section.content || "—"
}

function SectionPreview({ section }: { section: CaseReportSection }) {
  return (
    <div>
      <h3 className="text-label font-semibold text-muted-foreground">
        {section.name}
      </h3>
      <div className="mt-1 whitespace-pre-wrap text-read">
        {previewTextForSection(section)}
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
}: CaseReportProps) {
  const router = useRouter()
  // O relatório mais recente já vem aberto: quem abre uma consulta encerrada quer lê-lo.
  const [selectedReportId, setSelectedReportId] = useState<string | null>(
    caseReports[0]?.id ?? null,
  )
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
  const templateSectionCount = template.sections?.length ?? 0
  const generateEligibilityParams = {
    caseReports: caseReports.map((r) => ({ source: r.source })),
    hasMessages,
    templateSectionCount,
    hasTemplate: true,
  }
  const canGenerateReport = canGenerateCaseReport(generateEligibilityParams)
  const generateDisabledReason =
    caseReportGenerateDisabledReason(generateEligibilityParams)
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
      setSelectedReportId(caseReports[0]?.id ?? null)
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
    setSelectedReportId(reportId)
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
        toast.error(getFriendlyToastMessage(result.error))
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
            toast.error(getFriendlyToastMessage(updateResult.error))
          }
        } else {
          toast.error(getFriendlyToastMessage(result.error))
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
          toast.error(getFriendlyToastMessage(result.error))
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
          toast.error(getFriendlyToastMessage(result.error))
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
        toast.error(getFriendlyToastMessage(result.error))
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
        toast.error(getFriendlyToastMessage(result.error))
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

  const generateButton = canGenerateReport ? (
    <Button
      onClick={handleGenerateReport}
      disabled={isGenerating}
      variant={caseReports.length ? "ghost" : "default"}
      size={caseReports.length ? "sm" : "default"}
    >
      {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles />}
      {caseReports.length ? "Gerar de novo" : "Gerar relatório"}
    </Button>
  ) : caseReports.length ? null : (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-block">
          <Button disabled>
            <Sparkles />
            Gerar relatório
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {generateDisabledReason ?? "Informações insuficientes para gerar o relatório."}
      </TooltipContent>
    </Tooltip>
  )

  if (caseReports.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-card p-6">
        <h2 className="font-display text-section font-semibold">Relatório da consulta</h2>
        <div className="mt-4 flex flex-col items-center rounded-lg border border-dashed border-border px-6 py-10 text-center">
          <FileText className="size-6 text-subtle-foreground" aria-hidden />
          <p className="mt-3 font-medium">Nenhum relatório desta consulta</p>
          <p className="mt-1 max-w-sm text-muted-foreground">
            A IA monta o relatório a partir da consulta e do seu modelo.
          </p>
          <div className="mt-5">{generateButton}</div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-display text-section font-semibold">Relatório da consulta</h2>
        {generateButton}
        {selectedReport ? (
          <>
            {canEdit ? (
              <Button
                type="button"
                variant={hasUnsavedEdits ? "default" : "outline"}
                size="sm"
                disabled={isFinalizing}
                onClick={() => handleFinalizeChange(true)}
              >
                {isFinalizing ? <Loader2 className="animate-spin" /> : <Check />}
                {hasUnsavedEdits ? "Salvar e concluir" : "Concluir edição"}
              </Button>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isFinalizing}
                onClick={handleBackToEdit}
              >
                <Pencil />
                Editar
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isDownloading}
              onClick={handleDownloadPdf}
            >
              {isDownloading ? <Loader2 className="animate-spin" /> : <Download />}
              Baixar PDF
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={isDeleting}
                  aria-label="Excluir relatório"
                  className="text-muted-foreground hover:bg-danger-soft hover:text-danger-text"
                >
                  <Trash2 />
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
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <Button variant="destructive" disabled={isDeleting} onClick={handleDeleteReport}>
                    {isDeleting ? "Excluindo…" : "Excluir"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </div>

      {/* Mais de uma versão (gerou de novo, ou veio do WhatsApp): chips por data. */}
      {caseReports.length > 1 || isGenerating ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-subtle-foreground">Versões:</span>
          {caseReports.map((report) =>
            report.id === deletingReportId ? null : (
              <button
                key={report.id}
                type="button"
                onClick={() => handleCardClick(report.id)}
                aria-pressed={selectedReportId === report.id}
                className={cn(
                  "rounded-full border border-border px-2.5 py-0.5 text-caption num transition-colors hover:bg-accent",
                  selectedReportId === report.id &&
                    "border-primary bg-primary-soft text-primary-ink-strong",
                )}
              >
                {formatDateTime(report.created_at)}
                {report.source === "whatsapp" ? " · WhatsApp" : ""}
              </button>
            ),
          )}
          {isGenerating ? <Skeleton className="h-5 w-28 rounded-full" /> : null}
        </div>
      ) : null}

      {selectedReport ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sections.map((s) => s.name)}
            strategy={verticalListSortingStrategy}
          >
            <div className={cn("mt-5", canEdit ? "space-y-3" : "max-w-[68ch] space-y-5")}>
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
      ) : null}
    </section>
  )
}
