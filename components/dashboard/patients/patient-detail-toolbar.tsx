"use client"

import { useState } from "react"
import Link from "next/link"
import {
  MoreVerticalIcon,
  PencilIcon,
  StethoscopeIcon,
  Trash2Icon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

type PatientDetailToolbarProps = {
  patientId: string
  isEditing: boolean
  deleteLoading: boolean
  onEdit: () => void
  onCancelEdit?: () => void
  /** Return true when delete succeeded (dialog may close). */
  onConfirmDelete: () => boolean | Promise<boolean>
  className?: string
}

export function PatientDetailToolbar({
  patientId,
  isEditing,
  deleteLoading,
  onEdit,
  onCancelEdit,
  onConfirmDelete,
  className,
}: PatientDetailToolbarProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  return (
    <div className={cn("flex shrink-0 items-center justify-end gap-2", className)}>
      {!isEditing ? (
        <Button variant="outline" asChild>
          <Link href="/dashboard/patients">Voltar</Link>
        </Button>
      ) : null}
      {isEditing && onCancelEdit ? (
        <Button type="button" variant="ghost" onClick={onCancelEdit}>
          Cancelar edição
        </Button>
      ) : null}
      {!isEditing ? (
        <>
          <Popover open={menuOpen} onOpenChange={setMenuOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Mais ações da ficha">
                <MoreVerticalIcon className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2" sideOffset={8}>
              <div className="flex flex-col gap-0.5">
                <Button variant="ghost" className="h-10 w-full justify-start px-2 font-normal" asChild>
                  <Link
                    href={`/dashboard/cases/select-patient?patientId=${encodeURIComponent(patientId)}`}
                    onClick={() => setMenuOpen(false)}
                    className="inline-flex h-10 w-full items-center gap-2"
                  >
                    <StethoscopeIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                    Novo atendimento
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  className="inline-flex h-10 w-full items-center justify-start gap-2 px-2 font-normal"
                  onClick={() => {
                    setMenuOpen(false)
                    onEdit()
                  }}
                >
                  <PencilIcon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  Editar
                </Button>
                <Button
                  variant="ghost"
                  className="inline-flex h-10 w-full items-center justify-start gap-2 px-2 font-normal text-destructive hover:text-destructive"
                  onClick={() => {
                    setMenuOpen(false)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2Icon className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                  Excluir paciente
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir paciente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. O paciente será removido e os casos vinculados a
                  ele ficarão sem paciente associado.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    const ok = await onConfirmDelete()
                    if (ok) setDeleteDialogOpen(false)
                  }}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? "Excluindo..." : "Excluir"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  )
}
