"use client"

import { useCallback } from "react"
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
import { GripVerticalIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export type ReportTemplateSectionInput = {
  name: string
  description: string
}

function SectionRow({
  id,
  index,
  section,
  onChange,
  onRemove,
}: {
  id: string
  index: number
  section: ReportTemplateSectionInput
  onChange: (index: number, section: ReportTemplateSectionInput) => void
  onRemove: (index: number) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: CSS.Transform.toString(transform), transition } : undefined}
      className={cn(
        "flex gap-3 rounded-xl border border-border bg-card p-4 transition-shadow",
        isDragging && "relative z-10 shadow-md ring-2 ring-ring/30",
      )}
    >
      <button
        type="button"
        className="mt-7 flex h-8 shrink-0 cursor-grab touch-none items-center rounded px-0.5 text-subtle-foreground hover:bg-accent active:cursor-grabbing"
        aria-label={`Reordenar ${section.name || "seção"}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon className="size-4" />
      </button>
      <div className="grid min-w-0 flex-1 gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`section-name-${id}`}>Nome da seção</Label>
          <Input
            id={`section-name-${id}`}
            value={section.name}
            maxLength={200}
            onChange={(e) => onChange(index, { ...section, name: e.target.value })}
            placeholder="Ex.: Queixa principal"
            className="font-semibold"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`section-desc-${id}`}>
            O que o assistente escreve aqui <span className="text-caption font-normal text-subtle-foreground">opcional</span>
          </Label>
          <Textarea
            id={`section-desc-${id}`}
            value={section.description}
            onChange={(e) => onChange(index, { ...section, description: e.target.value })}
            placeholder="Ex.: motivo da consulta e há quanto tempo"
            className="min-h-16 resize-y"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="mt-7 shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(index)}
        aria-label={`Remover ${section.name || "seção"}`}
      >
        <Trash2Icon />
      </Button>
    </div>
  )
}

/** Seções que o médico escolhe, depois de Paciente e Dados clínicos; arrastar reordena. */
export function ReportTemplateMiddleSectionsEditor({
  sections,
  onChange,
}: {
  sections: ReportTemplateSectionInput[]
  onChange: (sections: ReportTemplateSectionInput[]) => void
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
    useSensor(KeyboardSensor),
  )

  const handleChange = useCallback(
    (index: number, section: ReportTemplateSectionInput) => onChange(sections.map((s, i) => (i === index ? section : s))),
    [sections, onChange],
  )
  const handleRemove = useCallback((index: number) => onChange(sections.filter((_, i) => i !== index)), [sections, onChange])
  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return
      onChange(arrayMove(sections, Number(active.id), Number(over.id)))
    },
    [sections, onChange],
  )

  const itemIds = sections.map((_, i) => String(i))

  return (
    <>
      {sections.length ? (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {sections.map((section, index) => (
                <SectionRow
                  key={itemIds[index]}
                  id={itemIds[index]}
                  index={index}
                  section={section}
                  onChange={handleChange}
                  onRemove={handleRemove}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="rounded-xl border border-dashed border-border-strong px-4 py-6 text-center text-muted-foreground">
          Nenhuma seção ainda. Comece por &ldquo;Queixa&rdquo;, &ldquo;Exame físico&rdquo; ou &ldquo;Conduta&rdquo;.
        </p>
      )}
      <button
        type="button"
        onClick={() => onChange([...sections, { name: "", description: "" }])}
        className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border-strong text-muted-foreground hover:bg-accent"
      >
        <PlusIcon className="size-4" aria-hidden />
        Adicionar seção
      </button>
    </>
  )
}
