"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { FlaskConical, Loader2, ScanSearch } from "lucide-react"
import { toast } from "sonner"

import { createExamReadingAction } from "@/actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { EXAM_READING_MAX_PAGES } from "@/lib/constants"
import { filesToExamPages } from "@/lib/exam-reading-pages"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  ExamReadingCard,
  type ExamReadingWithPages,
} from "@/components/dashboard/exam-readings/exam-reading-card"

type ExamReadingsSectionProps = {
  patientId: string
  caseId: string
  patientName: string
  patientBirthDate: string | null
  readings: ExamReadingWithPages[]
}

export function ExamReadingsSection({
  patientId,
  caseId,
  patientName,
  patientBirthDate,
  readings,
}: ExamReadingsSectionProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [title, setTitle] = useState("")
  const [step, setStep] = useState<"idle" | "preparing" | "reading">("idle")

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ""
    if (files.length === 0) return
    setTitle(files.length === 1 ? files[0].name.replace(/\.[A-Za-z0-9]{1,12}$/, "") : "")
    setPendingFiles(files)
  }

  async function handleConfirm() {
    if (pendingFiles.length === 0) return
    setStep("preparing")
    try {
      const pages = await filesToExamPages(pendingFiles)
      if (pages.length > EXAM_READING_MAX_PAGES) {
        toast.error(`Máximo de ${EXAM_READING_MAX_PAGES} páginas por exame.`)
        return
      }
      const formData = new FormData()
      formData.set("patientId", patientId)
      formData.set("caseId", caseId)
      formData.set("title", title)
      pages.forEach((page, i) => formData.append("pages", page, `${i + 1}.jpg`))

      setStep("reading")
      const result = await createExamReadingAction(formData)
      if (result.ok) {
        toast.success(
          result.itemCount > 0
            ? `Exame lido: ${result.itemCount} resultado${result.itemCount === 1 ? "" : "s"}. Confira antes de gerar o relatório.`
            : "Exame enviado, mas nenhum resultado foi reconhecido. Confira as páginas.",
        )
        setPendingFiles([])
        setTitle("")
        router.refresh()
      } else toast.error(getFriendlyToastMessage(result.error))
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Erro ao preparar o exame. Tente novamente."
      toast.error(getFriendlyToastMessage(message))
    } finally {
      setStep("idle")
    }
  }

  const isBusy = step !== "idle"

  return (
    <Card className="border-border/80">
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 pb-3">
        <div className="min-w-0">
          <CardTitle className="text-base font-semibold">Leitura de exames</CardTitle>
          <CardDescription>
            Envie fotos ou o PDF do exame. A IA transcreve os resultados, você
            confere e o relatório sai como rascunho para revisar.
          </CardDescription>
        </div>
        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={handleFilesChange}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isBusy}
          >
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ScanSearch className="h-4 w-4" aria-hidden />
            )}
            Ler exame
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {readings.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <FlaskConical className="h-6 w-6 text-muted-foreground" aria-hidden />
            </div>
            <p className="mt-4 font-medium text-muted-foreground">Nenhum exame lido</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground/80">
              Fotos (JPG, PNG) ou PDF, até {EXAM_READING_MAX_PAGES} páginas por
              exame. As páginas ficam guardadas só para você.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {readings.map((reading) => (
              <ExamReadingCard
                key={reading.id}
                reading={reading}
                patientName={patientName}
                patientBirthDate={patientBirthDate}
              />
            ))}
          </div>
        )}
      </CardContent>

      <Dialog
        open={pendingFiles.length > 0}
        onOpenChange={(open) => {
          if (open || isBusy) return
          setPendingFiles([])
          setTitle("")
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ler exame</DialogTitle>
            <DialogDescription>
              {pendingFiles.length} arquivo{pendingFiles.length === 1 ? "" : "s"}{" "}
              selecionado{pendingFiles.length === 1 ? "" : "s"}. Dê um nome para
              reconhecer o exame depois.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="exam-reading-title">Nome do exame</Label>
            <Input
              id="exam-reading-title"
              value={title}
              maxLength={120}
              autoFocus
              placeholder="Ex.: Hemograma e TSH de setembro"
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleConfirm()
                }
              }}
            />
            <ul className="text-sm text-muted-foreground">
              {pendingFiles.map((f) => (
                <li key={`${f.name}-${f.size}`} className="truncate">
                  {f.name}
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setPendingFiles([])
                setTitle("")
              }}
              disabled={isBusy}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm} disabled={isBusy}>
              {isBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {step === "preparing"
                ? "Preparando páginas…"
                : step === "reading"
                  ? "Lendo o exame…"
                  : "Ler exame"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
