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
import { GripVertical, Sparkles, Loader2 } from "lucide-react"

import type { CaseReport as CaseReportType, CaseReportSection } from "@/modules/cases/get-case-report"
import type { ReportTemplateWithSections } from "@/modules/report-templates/get-report-template-by-id"
import { generateCaseReportAction } from "@/actions/cases/generate-case-report"
import { improveReportSectionAction } from "@/actions/cases/improve-report-section"
import { updateCaseReportAction } from "@/actions/cases/update-case-report"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

type CaseReportProps = {
  template: ReportTemplateWithSections
  caseReport: CaseReportType | null
  caseId: string
  hasMessages: boolean
}

function sortSections(sections: CaseReportSection[]): CaseReportSection[] {
  return [...sections].sort((a, b) => a.order - b.order)
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
  caseReport,
  caseId,
  hasMessages,
}: CaseReportProps) {
  const router = useRouter()
  const [sections, setSections] = useState<CaseReportSection[]>(() =>
    caseReport ? sortSections(caseReport.sections) : [],
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [improvingSection, setImprovingSection] = useState<string | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [finalizeChecked, setFinalizeChecked] = useState(caseReport?.is_finalized ?? false)

  const canEdit = !caseReport?.is_finalized

  useEffect(() => {
    if (caseReport) {
      setSections(sortSections(caseReport.sections))
      setFinalizeChecked(caseReport.is_finalized)
    }
  }, [caseReport?.id, caseReport?.updated_at, caseReport?.is_finalized, caseReport?.sections])

  const handleGenerateReport = useCallback(async () => {
    if (!hasMessages) return
    setIsGenerating(true)
    try {
      const result = await generateCaseReportAction(caseId)
      if (result.ok) {
        toast.success("Relatório gerado.")
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
    [caseId, sections, router],
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
      updateCaseReportAction({ caseId, sections: reordered }).then((result) => {
        if (result.ok) {
          toast.success("Ordem atualizada.")
          router.refresh()
        } else {
          toast.error(result.error)
        }
      })
    },
    [caseId, sections, router],
  )

  const handleFinalizeChange = useCallback(
    async (checked: boolean) => {
      setIsFinalizing(true)
      try {
        const result = await updateCaseReportAction({
          caseId,
          sections: checked ? sections : undefined,
          isFinalized: checked,
          finalizedAt: checked ? new Date().toISOString() : null,
        })
        if (result.ok) {
          setFinalizeChecked(checked)
          toast.success(checked ? "Relatório finalizado." : "Edição reabilitada.")
          router.refresh()
        } else {
          toast.error(result.error)
        }
      } finally {
        setIsFinalizing(false)
      }
    },
    [caseId, sections, router],
  )

  const handleBackToEdit = useCallback(() => {
    handleFinalizeChange(false)
  }, [handleFinalizeChange])

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 6 },
    }),
    useSensor(KeyboardSensor),
  )

  if (!caseReport) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <Sparkles className="h-4 w-4 text-primary" />
            Relatório do atendimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasMessages ? (
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
                Necessário ter conversa
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
          <div className="flex items-center gap-4">
            {canEdit ? (
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={finalizeChecked}
                  disabled={isFinalizing}
                  onCheckedChange={(checked) =>
                    handleFinalizeChange(checked === true)
                  }
                />
                <span>Finalizar edição</span>
              </label>
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
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  )
}
