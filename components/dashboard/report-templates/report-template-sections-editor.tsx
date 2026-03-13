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
import { GripVertical, Trash2 } from "lucide-react"
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
  onNameChange,
  onDescriptionChange,
  onRemove,
}: {
  id: string
  index: number
  section: ReportTemplateSectionInput
  onNameChange: (index: number, name: string) => void
  onDescriptionChange: (index: number, description: string) => void
  onRemove: (index: number) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = transform
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
      }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex gap-2 rounded-lg border border-border bg-card p-3 transition-shadow",
        isDragging && "opacity-50 shadow-md",
      )}
    >
      <button
        type="button"
        className="flex shrink-0 cursor-grab touch-none items-center rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label="Reordenar seção"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="space-y-1.5">
          <Label htmlFor={`section-name-${id}`} className="text-sm">
            Nome da seção
          </Label>
          <Input
            id={`section-name-${id}`}
            value={section.name}
            onChange={(e) => onNameChange(index, e.target.value)}
            placeholder="Ex.: Anamnese"
            className="w-full"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`section-desc-${id}`} className="text-sm">
            Descrição
          </Label>
          <Textarea
            id={`section-desc-${id}`}
            value={section.description}
            onChange={(e) => onDescriptionChange(index, e.target.value)}
            placeholder="Ex.: Relatório do caso da paciente **Nome do Paciente**"
            className="min-h-20 resize-y"
          />
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(index)}
        aria-label="Remover seção"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}

export function ReportTemplateSectionsEditor({
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

  const handleNameChange = useCallback(
    (index: number, name: string) => {
      const next = [...sections]
      next[index] = { ...next[index], name }
      onChange(next)
    },
    [sections, onChange],
  )

  const handleDescriptionChange = useCallback(
    (index: number, description: string) => {
      const next = [...sections]
      next[index] = { ...next[index], description }
      onChange(next)
    },
    [sections, onChange],
  )

  const handleRemove = useCallback(
    (index: number) => {
      onChange(sections.filter((_, i) => i !== index))
    },
    [sections, onChange],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIndex = sections.findIndex((_, i) => String(i) === active.id)
      const newIndex = sections.findIndex((_, i) => String(i) === over.id)
      if (oldIndex === -1 || newIndex === -1) return
      const reordered = arrayMove(sections, oldIndex, newIndex)
      onChange(reordered)
    },
    [sections, onChange],
  )

  const handleAddSection = useCallback(() => {
    onChange([...sections, { name: "", description: "" }])
  }, [sections, onChange])

  const itemIds = sections.map((_, i) => String(i))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">
          Seções do template (ordem definirá a ordem no relatório)
        </p>
        <Button type="button" variant="outline" size="sm" onClick={handleAddSection}>
          Adicionar seção
        </Button>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <SortableContext
          items={itemIds}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {sections.map((section, index) => (
              <SectionRow
                key={itemIds[index]}
                id={itemIds[index]}
                index={index}
                section={section}
                onNameChange={handleNameChange}
                onDescriptionChange={handleDescriptionChange}
                onRemove={handleRemove}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  )
}
