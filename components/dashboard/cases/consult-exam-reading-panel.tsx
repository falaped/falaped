"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  FileImageIcon,
  Loader2Icon,
  PaperclipIcon,
  PencilIcon,
  PlusIcon,
  RefreshCwIcon,
  ScanTextIcon,
  SparklesIcon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

import {
  archiveExamReadingAction,
  createExamReadingAction,
  deleteExamReadingAction,
  generateExamReportAction,
} from "@/actions"
import { DocStep, PanelFooter } from "@/components/dashboard/cases/consult-document"
import type { ExamReadingWithPages } from "@/components/dashboard/exam-readings/exam-reading-card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { EXAM_READING_MAX_PAGES } from "@/lib/constants"
import { filesToExamPages } from "@/lib/exam-reading-pages"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import { cn } from "@/lib/utils"
import type { ExamReadingFlag, ExamReadingItem } from "@/modules/exam-readings/types"

const FLAG_LABEL: Record<ExamReadingFlag, string> = { normal: "Normal", low: "Baixo", high: "Alto", unknown: "Sem faixa" }
const FLAG_CYCLE: ExamReadingFlag[] = ["normal", "high", "low", "unknown"]
/** Linhas visíveis antes do "Ver os N valores" (as fora da faixa sempre aparecem). */
const VISIBLE_ROWS = 8

const isAltered = (item: ExamReadingItem) => item.flag === "low" || item.flag === "high"
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Ler exame dentro da Consulta (protótipos a9/a9r): arquivo → conferir valores → relatório.
 * Com leitura em aberto nesta consulta, retoma a mais recente; sem ela, começa pelo envio.
 */
export function ConsultExamReadingPanel({
  patientId,
  caseId,
  readings,
  onDone,
}: {
  patientId: string
  caseId: string
  /** Leituras desta consulta ainda não salvas nos anexos, da mais recente para a mais antiga. */
  readings: ExamReadingWithPages[]
  onDone: () => void
}) {
  const [pickedId, setPickedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const reading = uploading ? null : (readings.find((r) => r.id === pickedId) ?? readings[0] ?? null)

  return (
    <>
      {readings.length > 1 || (uploading && readings.length) ? (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-6 py-2.5">
          <span className="text-caption text-subtle-foreground">Em aberto nesta consulta:</span>
          {readings.map((r) => (
            <Button
              key={r.id}
              variant={reading?.id === r.id ? "secondary" : "ghost"}
              size="xs"
              onClick={() => {
                setUploading(false)
                setPickedId(r.id)
              }}
            >
              {r.title}
            </Button>
          ))}
        </div>
      ) : null}
      {reading ? (
        <ReadingFlow key={reading.id} reading={reading} onNew={() => setUploading(true)} onDone={onDone} />
      ) : (
        <UploadStep
          patientId={patientId}
          caseId={caseId}
          onRead={() => {
            setUploading(false)
            setPickedId(null)
          }}
        />
      )}
    </>
  )
}

function UploadStep({ patientId, caseId, onRead }: { patientId: string; caseId: string; onRead: () => void }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [files, setFiles] = useState<File[]>([])
  const [title, setTitle] = useState("")
  const [step, setStep] = useState<"idle" | "preparing" | "reading">("idle")
  const [pageCount, setPageCount] = useState(0)

  function choose(list: File[]) {
    if (!list.length) return
    setFiles(list)
    setTitle(list.length === 1 ? list[0].name.replace(/\.[A-Za-z0-9]{1,12}$/, "") : "")
  }

  async function handleRead() {
    if (!files.length) return
    setStep("preparing")
    try {
      const pages = await filesToExamPages(files)
      if (pages.length > EXAM_READING_MAX_PAGES) return void toast.error(`Máximo de ${EXAM_READING_MAX_PAGES} páginas por exame.`)
      const formData = new FormData()
      formData.set("patientId", patientId)
      formData.set("caseId", caseId)
      formData.set("title", title)
      pages.forEach((page, i) => formData.append("pages", page, `${i + 1}.jpg`))
      setPageCount(pages.length)
      setStep("reading")
      const result = await createExamReadingAction(formData)
      if (!result.ok) return void toast.error(getFriendlyToastMessage(result.error))
      toast.success(
        result.itemCount > 0
          ? `Exame lido: ${plural(result.itemCount, "valor", "valores")}. Confira antes de gerar o relatório.`
          : "Exame enviado, mas nenhum valor foi reconhecido. Confira as páginas.",
      )
      onRead()
      router.refresh()
    } catch (error: unknown) {
      toast.error(getFriendlyToastMessage(error instanceof Error ? error.message : "Erro ao preparar o exame. Tente novamente."))
    } finally {
      setStep("idle")
    }
  }

  return (
    <>
      <div className="flex flex-1 flex-col gap-7 overflow-auto px-6 py-6">
        <DocStep n={1} title="Arquivo">
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,application/pdf"
            className="hidden"
            onChange={(e) => {
              choose(Array.from(e.target.files ?? []))
              e.target.value = ""
            }}
          />
          {step === "reading" ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4" aria-busy="true" aria-live="polite">
              <p className="flex items-center gap-2 font-medium">
                <Loader2Icon className="size-4 animate-spin text-primary-ink" aria-hidden />
                Lendo {plural(pageCount, "página", "páginas")} do exame…
              </p>
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : files.length ? (
            <div className="flex items-center gap-3 rounded-xl border border-border p-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-ink-strong">
                <FileImageIcon className="size-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <Input
                  autoFocus
                  value={title}
                  maxLength={120}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRead()}
                  placeholder="Nome do exame. Ex.: Hemograma de setembro"
                  className="h-8 font-medium"
                />
                <p className="mt-1 truncate text-caption text-subtle-foreground">{files.map((f) => f.name).join(", ")}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => inputRef.current?.click()} disabled={step !== "idle"}>
                Trocar
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                choose(Array.from(e.dataTransfer.files))
              }}
              className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border-strong bg-muted/50 px-6 py-10 text-center hover:bg-accent"
            >
              <span className="grid size-11 place-items-center rounded-full bg-primary-soft text-primary-ink-strong">
                <UploadIcon className="size-5" aria-hidden />
              </span>
              <span className="font-semibold">
                Solte o exame aqui ou <span className="text-primary-ink underline">escolha no computador</span>
              </span>
              <span className="text-caption text-subtle-foreground">
                Fotos ou PDF, até {EXAM_READING_MAX_PAGES} páginas. As páginas ficam guardadas só para você.
              </span>
            </button>
          )}
        </DocStep>
        <DocStep n={2} title="Confira os valores">
          <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-muted-foreground">
            O assistente lê o exame e os valores aparecem aqui para você conferir.
          </p>
        </DocStep>
      </div>
      <PanelFooter>
        <Button className="ml-auto" onClick={handleRead} disabled={!files.length || step !== "idle"}>
          {step === "idle" ? <ScanTextIcon data-icon="inline-start" /> : <Loader2Icon data-icon="inline-start" className="animate-spin" />}
          {step === "preparing" ? "Preparando páginas…" : step === "reading" ? "Lendo o exame…" : "Ler exame"}
        </Button>
      </PanelFooter>
    </>
  )
}

function ReadingFlow({ reading, onNew, onDone }: { reading: ExamReadingWithPages; onNew: () => void; onDone: () => void }) {
  const [items, setItems] = useState<ExamReadingItem[]>(reading.items)
  const [reportText, setReportText] = useState(reading.report_text ?? "")
  const [editingValues, setEditingValues] = useState(!reading.report_text)
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState<"report" | "archive" | "delete" | null>(null)
  const altered = items.filter(isAltered)
  const hasReport = reportText.trim() !== "" && !editingValues

  // Fora da faixa primeiro; o índice original segue junto para editar a linha certa.
  const rows = items.map((item, index) => ({ item, index })).sort((a, b) => Number(isAltered(b.item)) - Number(isAltered(a.item)))
  const visible = showAll ? rows : rows.slice(0, Math.max(VISIBLE_ROWS, altered.length))

  const update = (index: number, patch: Partial<ExamReadingItem>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)))

  async function handleGenerate() {
    setBusy("report")
    const result = await generateExamReportAction({ readingId: reading.id, items }).catch(() => null)
    setBusy(null)
    if (!result?.ok) return void toast.error(getFriendlyToastMessage(result?.error ?? "Erro ao gerar o relatório."))
    setReportText(result.reportText)
    setEditingValues(false)
  }

  async function handleArchive() {
    if (!reportText.trim()) return void toast.error("Gere ou escreva o relatório antes de salvar.")
    setBusy("archive")
    const result = await archiveExamReadingAction({ readingId: reading.id, reportText }).catch(() => null)
    setBusy(null)
    if (!result?.ok) return void toast.error(getFriendlyToastMessage(result?.error ?? "Erro ao salvar nos anexos."))
    toast.success("Relatório e páginas do exame salvos nos anexos.")
    onDone()
  }

  async function handleDelete() {
    setBusy("delete")
    const result = await deleteExamReadingAction(reading.id).catch(() => null)
    setBusy(null)
    if (!result?.ok) return void toast.error(getFriendlyToastMessage(result?.error ?? "Erro ao descartar a leitura."))
    toast.success("Leitura descartada.")
    onDone()
  }

  const summary = (
    <span className="num">
      {plural(items.length, "valor", "valores")}
      {altered.length ? <span className="text-warning-text"> · {altered.length} fora da faixa</span> : null}
    </span>
  )

  return (
    <>
      <div className="flex flex-1 flex-col gap-7 overflow-auto px-6 py-6">
        <DocStep n={1} title="Arquivo" aside={<Button variant="link" size="xs" className="h-auto p-0" onClick={onNew}><PlusIcon data-icon="inline-start" />Ler outro exame</Button>}>
          <div className="flex items-center gap-3 rounded-xl border border-border p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-ink-strong">
              <FileImageIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{reading.title}</p>
              <p className="flex items-center gap-1 text-caption text-success-text">
                <CheckIcon className="size-3" aria-hidden />
                Lido · {plural(reading.page_paths.length, "página", "páginas")}
              </p>
            </div>
            {reading.pageUrls.length ? (
              <Button variant="ghost" size="sm" asChild>
                <a href={reading.pageUrls[0]} target="_blank" rel="noreferrer">
                  Ver páginas
                </a>
              </Button>
            ) : null}
          </div>
        </DocStep>

        {editingValues ? (
          <DocStep n={2} title="Confira os valores" aside={altered.length ? <span className="text-warning-text">{altered.length} fora da faixa</span> : null}>
            {items.length ? (
              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full">
                  <thead className="bg-muted text-label text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 text-left font-medium">Exame</th>
                      <th className="px-2 text-right font-medium">Valor</th>
                      <th className="px-2 text-left font-medium">Unidade</th>
                      <th className="px-2 text-left font-medium">Referência</th>
                      <th className="px-2 text-left font-medium">Status</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody className="num divide-y divide-border">
                    {visible.map(({ item, index }) => (
                      <tr key={index} className={cn(isAltered(item) && "bg-warning-soft")}>
                        <td className="py-1 pr-1 pl-2">
                          <CellInput value={item.name} onChange={(v) => update(index, { name: v })} label="Exame" className={isAltered(item) ? "font-semibold" : undefined} />
                        </td>
                        <td className="w-28 px-1">
                          <CellInput value={item.value} onChange={(v) => update(index, { value: v })} label={`Valor de ${item.name}`} className={cn("text-right", isAltered(item) && "font-semibold")} />
                        </td>
                        <td className="w-24 px-1">
                          <CellInput value={item.unit ?? ""} onChange={(v) => update(index, { unit: v || null })} label={`Unidade de ${item.name}`} className="text-muted-foreground" />
                        </td>
                        <td className="px-1">
                          <CellInput value={item.reference ?? ""} onChange={(v) => update(index, { reference: v || null })} label={`Referência de ${item.name}`} className="text-muted-foreground" />
                        </td>
                        <td className="w-24 px-1">
                          <button
                            type="button"
                            title="Clique para mudar"
                            onClick={() => update(index, { flag: FLAG_CYCLE[(FLAG_CYCLE.indexOf(item.flag) + 1) % FLAG_CYCLE.length] })}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-caption",
                              isAltered(item) ? "border-warning-border bg-card font-medium text-warning-text" : "border-transparent text-subtle-foreground hover:border-border",
                            )}
                          >
                            {item.flag === "high" ? <ArrowUpIcon className="size-3" aria-hidden /> : item.flag === "low" ? <ArrowDownIcon className="size-3" aria-hidden /> : null}
                            {FLAG_LABEL[item.flag]}
                          </button>
                        </td>
                        <td className="pr-2">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-danger-text"
                            aria-label={`Remover ${item.name}`}
                            onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                          >
                            <Trash2Icon />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex border-t border-border">
                  {rows.length > visible.length ? (
                    <button type="button" onClick={() => setShowAll(true)} className="flex flex-1 items-center justify-center gap-1 py-2.5 text-label font-medium text-primary-ink hover:bg-accent">
                      Ver os {rows.length} valores
                      <ChevronDownIcon className="size-4" aria-hidden />
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => {
                      setShowAll(true)
                      setItems((prev) => [...prev, { name: "", value: "", unit: null, reference: null, flag: "unknown", page: 1, lab_interpretation: null }])
                    }}
                    className="flex flex-1 items-center justify-center gap-1 py-2.5 text-label font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    <PlusIcon className="size-4" aria-hidden />
                    Adicionar linha
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-muted-foreground">
                Nenhum valor reconhecido. Confira as páginas e adicione as linhas à mão.
              </p>
            )}
            <p className="text-caption text-subtle-foreground">Clique num valor para corrigir. Confira com o laudo antes de usar.</p>
          </DocStep>
        ) : (
          <DocStep n={2} title="Valores conferidos">
            <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-success-soft text-success-text">
                <CheckIcon className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{summary}</p>
                {altered.length ? (
                  <p className="num truncate text-caption text-muted-foreground">
                    {altered.map((it) => `${it.name} ${it.value}${it.unit ? ` ${it.unit}` : ""} (${FLAG_LABEL[it.flag].toLowerCase()})`).join(" · ")}
                  </p>
                ) : null}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditingValues(true)}>
                <PencilIcon data-icon="inline-start" />
                Corrigir valores
              </Button>
            </div>
          </DocStep>
        )}

        <DocStep n={3} title="Relatório" aside={hasReport ? <span className="text-success-text">pronto para revisar</span> : null}>
          {busy === "report" ? (
            <div className="flex flex-col gap-3 rounded-xl border border-border p-4" aria-busy="true" aria-live="polite">
              <p className="flex items-center gap-2 font-medium">
                <Loader2Icon className="size-4 animate-spin text-primary-ink" aria-hidden />
                Escrevendo o rascunho do relatório…
              </p>
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ) : hasReport ? (
            <>
              <div className="overflow-hidden rounded-xl border border-input focus-within:border-ring">
                <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-caption text-subtle-foreground">
                  <SparklesIcon className="size-3.5 text-primary-ink" aria-hidden />
                  Rascunho do assistente · edite à vontade
                  <Button variant="ghost" size="xs" className="ml-auto" onClick={handleGenerate} disabled={busy !== null}>
                    <RefreshCwIcon data-icon="inline-start" />
                    Gerar de novo
                  </Button>
                </div>
                <Textarea
                  value={reportText}
                  onChange={(e) => setReportText(e.target.value)}
                  rows={12}
                  aria-label="Texto do relatório de exames"
                  className="rounded-none border-0 text-read shadow-none focus-visible:ring-0"
                />
              </div>
              <p className="flex items-center gap-2 text-caption text-subtle-foreground">
                <PaperclipIcon className="size-3.5" aria-hidden />
                Ao salvar, o PDF do relatório e as páginas do exame vão para os anexos da criança.
              </p>
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-border-strong px-4 py-5 text-center text-muted-foreground">
              Depois de conferir, o assistente escreve o rascunho aqui para você revisar.
            </p>
          )}
        </DocStep>
      </div>
      <PanelFooter>
        <Button variant="ghost" className="text-danger-text" onClick={handleDelete} disabled={busy !== null}>
          <Trash2Icon data-icon="inline-start" />
          {busy === "delete" ? "Descartando…" : "Descartar leitura"}
        </Button>
        {hasReport ? (
          <Button className="ml-auto" onClick={handleArchive} disabled={busy !== null}>
            <PaperclipIcon data-icon="inline-start" />
            {busy === "archive" ? "Salvando…" : "Salvar relatório nos anexos"}
          </Button>
        ) : (
          <Button className="ml-auto" onClick={handleGenerate} disabled={busy !== null || !items.length}>
            <SparklesIcon data-icon="inline-start" />
            {busy === "report" ? "Gerando…" : "Confirmar valores e gerar relatório"}
          </Button>
        )}
      </PanelFooter>
    </>
  )
}

/** Célula editável que parece texto até receber o foco. */
function CellInput({ value, onChange, label, className }: { value: string; onChange: (v: string) => void; label: string; className?: string }) {
  return (
    <input
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 w-full rounded-md border border-transparent bg-transparent px-2 outline-none hover:border-border focus:border-ring focus:bg-card",
        className,
      )}
    />
  )
}
