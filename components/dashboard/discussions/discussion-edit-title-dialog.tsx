"use client"

import { useState, useTransition, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateDiscussionTitleAction } from "@/actions"

type DiscussionEditTitleDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  discussionId: string
  initialTitle: string | null
}

export function DiscussionEditTitleDialog({
  open,
  onOpenChange,
  discussionId,
  initialTitle,
}: DiscussionEditTitleDialogProps) {
  const [value, setValue] = useState(initialTitle ?? "")
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open) setValue(initialTitle ?? "")
  }, [open, initialTitle])

  function handleOpenChange(next: boolean) {
    if (!next) setValue(initialTitle ?? "")
    onOpenChange(next)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await updateDiscussionTitleAction(
        discussionId,
        value.trim() || null,
      )
      if (result.ok) {
        handleOpenChange(false)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar título</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="discussion-title">Título da discussão (opcional)</Label>
              <Input
                id="discussion-title"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Título da discussão (opcional)"
                maxLength={200}
                className="mt-2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
