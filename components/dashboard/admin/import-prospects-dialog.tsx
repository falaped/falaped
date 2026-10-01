"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { UploadIcon } from "lucide-react"
import { toast } from "sonner"

import { importProspectsAction } from "@/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Result = Extract<Awaited<ReturnType<typeof importProspectsAction>>, { ok: true }>["result"]

/** "Importar CSV": sobe o arquivo da ferramenta de captação e mostra o que entrou. */
export function ImportProspectsDialog() {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [result, setResult] = React.useState<Result | null>(null)

  async function submit() {
    if (!file) return
    setBusy(true)
    try {
      const r = await importProspectsAction(await file.text())
      if (!r.ok) {
        toast.error(r.error)
        return
      }
      setResult(r.result)
      toast.success(`${r.result.inserted} novos, ${r.result.updated} atualizados.`)
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) {
          setFile(null)
          setResult(null)
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <UploadIcon aria-hidden />
          Importar CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar captação</DialogTitle>
          <DialogDescription>
            CSV da ferramenta de captação, com as colunas id e name (ou full_name). Quem já está no funil é
            atualizado pelo id; etapa e histórico não mudam. Um id novo com e-mail já cadastrado é pulado.
          </DialogDescription>
        </DialogHeader>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setResult(null)
          }}
          className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium"
        />
        {result ? (
          <div className="rounded-lg bg-muted/50 p-3 text-sm">
            <p>
              <b>{result.inserted}</b> novos, <b>{result.updated}</b> atualizados, <b>{result.skipped.length}</b> pulados.
            </p>
            {result.skipped.length > 0 ? (
              <ul className="mt-2 max-h-32 overflow-auto text-xs text-muted-foreground">
                {result.skipped.map((s) => (
                  <li key={s.id}>
                    {s.id}: {s.reason}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={submit} disabled={!file || busy}>
            {busy ? "Importando…" : "Importar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
